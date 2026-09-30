/* Networking: star topology over WebRTC (PeerJS). The host's browser is the
   authoritative game server; everyone else only sends intents (answers, chat,
   strokes). All inbound data is size-checked, schema-validated and rate-limited. */
'use strict';
(() => {

FP.PEER_PREFIX = 'hallelujoy-v1-';
FP.MAX_PLAYERS = 12;
FP.MAX_MSG_CHARS = 12000;

class RateLimiter {
  constructor(capacity, perSecond) { this.cap = capacity; this.rate = perSecond; this.tokens = capacity; this.last = Date.now(); }
  take(n = 1) {
    const now = Date.now();
    this.tokens = Math.min(this.cap, this.tokens + ((now - this.last) / 1000) * this.rate);
    this.last = now;
    if (this.tokens >= n) { this.tokens -= n; return true; }
    return false;
  }
}
FP.RateLimiter = RateLimiter;

const str = (v, max) => typeof v === 'string' && v.length <= max;
// Whitelist of messages a client may send to the host, with shape checks.
FP.CLIENT_SCHEMA = {
  hello: (m) => str(m.name, 40) && str(m.avatar, 16),
  profile: (m) => str(m.name, 40) && str(m.avatar, 16),
  chat: (m) => str(m.text, 300),
  answer: (m) => (m.c === undefined || Number.isInteger(m.c)) && (m.text === undefined || str(m.text, 120)),
  settings: (m) => FP.isObj(m.s),
  start: () => true,
  lobby: () => true,
  next: () => true,
  skip: () => true,
  idk: () => true,
  kick: (m) => str(m.id, 80),
  lock: (m) => typeof m.on === 'boolean',
  pick: (m) => Number.isInteger(m.i),
  draw: (m) => FP.isObj(m.op),
  gw_ask: (m) => (m.k === undefined || str(m.k, 20)) && (m.text === undefined || str(m.text, 160)) && (m.k !== undefined || m.text !== undefined),
  gw_reply: (m) => typeof m.a === 'boolean',
  pz_state: (m) => FP.isObj(m.data) && typeof m.done === 'boolean' && Number.isInteger(m.r),
  gw_guess: (m) => str(m.id, 30),
};
function validClientMsg(d) {
  if (!FP.isObj(d) || typeof d.t !== 'string' || !Object.prototype.hasOwnProperty.call(FP.CLIENT_SCHEMA, d.t)) return false;
  let size;
  try { size = JSON.stringify(d).length; } catch (e) { return false; }
  if (size > FP.MAX_MSG_CHARS) return false;
  try { return FP.CLIENT_SCHEMA[d.t](d) === true; } catch (e) { return false; }
}

const clone = (m) => (typeof structuredClone === 'function' ? structuredClone(m) : JSON.parse(JSON.stringify(m)));

function peerOptions() {
  const c = (FP.CONFIG && FP.CONFIG.peer) || {};
  const o = { debug: 0, host: c.host, port: c.port, secure: c.secure, path: c.path };
  // Only override ICE servers if the site owner configured their own; otherwise PeerJS's
  // defaults apply (Google STUN + PeerJS's free TURN relays on UDP 3478).
  if (FP.CONFIG && Array.isArray(FP.CONFIG.iceServers) && FP.CONFIG.iceServers.length) o.config = { iceServers: FP.CONFIG.iceServers };
  return o;
}

// Every failure maps to a stage + a short code players can report ("error E3").
const SIGNAL_ERRORS = ['network', 'server-error', 'socket-error', 'socket-closed', 'ssl-unavailable'];
FP.NET_ERRORS = {
  E1: { title: 'Can\'t reach the connection service', text: 'Your browser couldn\'t contact the free PeerJS service that introduces players to each other. You may be offline, or a network filter, VPN or ad-blocker may be blocking 0.peerjs.com.' },
  E2: { title: 'Room not found', text: 'Nobody is hosting this room right now. The host may have closed or refreshed their tab (rooms only live while the host\'s tab is open), or the code is wrong. Ask the host for a fresh link.' },
  E3: { title: 'Found the room, but couldn\'t connect to it', text: 'The room exists, but your network and the host\'s network couldn\'t open a direct connection. This is common on school, office and some mobile networks that block peer-to-peer traffic. Try switching one of you to mobile data or another Wi-Fi.' },
  E4: { title: 'The host left', text: 'The host closed their tab or lost connection, so the room has closed. The host can create a new room and share the new link.' },
  E5: { title: 'Browser not supported', text: 'This browser can\'t make peer-to-peer connections (WebRTC). Please use an up-to-date Chrome, Safari, Firefox or Edge — in-app browsers (inside Instagram, Facebook, etc.) sometimes block it, so open the link in your normal browser.' },
  E6: { title: 'Connection timed out', text: 'Connecting took too long. Check your internet connection and try again.' },
  E7: { title: 'Room code already in use', text: 'Please try creating the room again.' },
};
function errorCode(err) {
  const t = err && err.type;
  if (err && err.code && FP.NET_ERRORS[err.code]) return err.code;
  if (t === 'peer-unavailable') return 'E2';
  if (t === 'browser-incompatible' || t === 'no-webrtc') return 'E5';
  if (t === 'unavailable-id') return 'E7';
  if (SIGNAL_ERRORS.includes(t)) return 'E1';
  if (t === 'negotiation-failed' || t === 'webrtc' || t === 'ice-failed') return 'E3';
  if (t === 'timeout') return 'E6';
  return null;
}
FP.netError = function (err) {
  const code = errorCode(err);
  const e = code ? FP.NET_ERRORS[code] : { title: 'Connection problem', text: 'Something went wrong while connecting. Please try again.' };
  return { code: code || 'E0', title: e.title, text: e.text, detail: (err && (err.type || err.message)) || 'unknown' };
};
FP.peerErrorText = (err) => { const e = FP.netError(err); return e.title + ' — ' + e.text; };
const webrtcSupported = () => typeof RTCPeerConnection !== 'undefined';

/* ---------------- Host: runs the Server, relays to peers ---------------- */
class HostTransport {
  constructor() {
    this.selfId = 'host';
    this.conns = new Map();
    this.limits = new Map();
    this.strikes = new Map();
    this.locked = false;
    this.onClientMessage = () => {};
    this.onServerMessage = () => {};
    this.onJoin = () => {};
    this.onLeave = () => {};
    this.onStatus = () => {};
    this.peer = null;
  }
  start(code) {
    return new Promise((resolve, reject) => {
      if (typeof Peer === 'undefined') return reject(new Error('Networking library failed to load.'));
      if (!webrtcSupported()) return reject({ type: 'no-webrtc' });
      const peer = new Peer(FP.PEER_PREFIX + code, peerOptions());
      this.peer = peer;
      let opened = false;
      const timer = setTimeout(() => { if (!opened) { try { peer.destroy(); } catch (e) {} reject({ code: 'E1', type: 'signalling-timeout' }); } }, 15000);
      peer.on('open', () => {
        opened = true; clearTimeout(timer); this.onStatus('on');
        // Heartbeat so guests notice quickly if this tab closes or loses its connection.
        this.hb = setInterval(() => { for (const c of this.conns.values()) { if (c.open) { try { c.send({ t: 'hb' }); } catch (e) {} } } }, 4000);
        resolve();
      });
      peer.on('connection', (conn) => this._accept(conn));
      peer.on('disconnected', () => { this.onStatus('off'); if (!peer.destroyed) setTimeout(() => { try { peer.reconnect(); } catch (e) {} }, 1500); });
      peer.on('error', (err) => {
        if (!opened) { clearTimeout(timer); peer.destroy(); reject(err); }
        else if (err.type !== 'peer-unavailable') this.onStatus('off');
      });
    });
  }
  _accept(conn) {
    if (conn.metadata && typeof conn.metadata !== 'object') return conn.close();
    conn.on('open', () => {
      if (this.locked || this.conns.size >= FP.MAX_PLAYERS - 1) {
        try { conn.send({ t: 'denied', reason: this.locked ? 'This room is locked by the host.' : 'This room is full.' }); } catch (e) {}
        setTimeout(() => { try { if (conn.open) conn.close(); } catch (e) {} }, 400);
        return;
      }
      this.conns.set(conn.peer, conn);
      this.limits.set(conn.peer, { all: new RateLimiter(120, 60), chat: new RateLimiter(5, 1.2) });
      this.strikes.set(conn.peer, 0);
      this.onJoin(conn.peer);
    });
    conn.on('data', (d) => this._recv(conn.peer, d));
    conn.on('close', () => this._drop(conn.peer));
    conn.on('error', () => this._drop(conn.peer));
  }
  _drop(pid) {
    if (!this.conns.has(pid)) return;
    this.conns.delete(pid);
    this.limits.delete(pid);
    this.strikes.delete(pid);
    this.onLeave(pid);
  }
  _strike(pid, n = 1) {
    const s = (this.strikes.get(pid) || 0) + n;
    this.strikes.set(pid, s);
    if (s > 40) this.kick(pid, 'Disconnected for sending invalid or too many messages.');
  }
  _recv(pid, d) {
    if (!this.conns.has(pid)) return;
    if (!validClientMsg(d)) return this._strike(pid, 2);
    const lim = this.limits.get(pid);
    if (!lim.all.take()) return this._strike(pid);
    if (d.t === 'chat' && !lim.chat.take()) {
      if (!lim.warned || Date.now() - lim.warned > 5000) { lim.warned = Date.now(); this.sendTo(pid, { t: 'chat', kind: 'sys', text: 'Slow down a little 🙂' }); }
      return this._strike(pid, 0.5);
    }
    this.onClientMessage(pid, d);
  }
  // server -> one client
  sendTo(pid, msg) {
    if (pid === this.selfId) { const m = clone(msg); queueMicrotask(() => this.onServerMessage(m)); return; }
    const c = this.conns.get(pid);
    if (c && c.open) { try { c.send(msg); } catch (e) { /* ignore */ } }
  }
  broadcast(msg, except) {
    for (const [pid, c] of this.conns) {
      if (pid === except || !c.open) continue;
      try { c.send(msg); } catch (e) { /* ignore */ }
    }
    if (except !== this.selfId) this.sendTo(this.selfId, msg);
  }
  // local client (host player) -> server
  sendToServer(msg) { const m = clone(msg); queueMicrotask(() => this.onClientMessage(this.selfId, m)); }
  kick(pid, reason = 'You were removed from the room by the host.') {
    const c = this.conns.get(pid);
    if (!c) return;
    try { c.send({ t: 'kicked', reason }); } catch (e) {}
    setTimeout(() => { try { if (c.open) c.close(); } catch (e) {} }, 250);
    this._drop(pid);
  }
  close() {
    clearInterval(this.hb);
    for (const c of this.conns.values()) { try { c.send({ t: 'closed' }); } catch (e) {} }
    setTimeout(() => { try { this.peer && this.peer.destroy(); } catch (e) {} }, 200);
  }
}

/* ---------------- Guest: talks only to the host ---------------- */
class ClientTransport {
  constructor() {
    this.onServerMessage = () => {};
    this.onClose = () => {};
    this.onStatus = () => {};
    this.peer = null;
    this.conn = null;
    this.limiter = new RateLimiter(100, 50);
    this.closedByUs = false;
  }
  join(code) {
    return new Promise((resolve, reject) => {
      if (typeof Peer === 'undefined') return reject(new Error('Networking library failed to load.'));
      if (!webrtcSupported()) return reject({ type: 'no-webrtc' });
      const peer = new Peer(peerOptions());
      this.peer = peer;
      let settled = false;
      let stage = 'signal'; // signal -> room -> p2p
      this.stage = (s) => { stage = s; this.onStage && this.onStage(s); };
      const fail = (e) => { if (settled) return; settled = true; clearTimeout(timer); try { peer.destroy(); } catch (x) {} reject(e); };
      // Time out per stage so the message says *where* it got stuck.
      // Past the signalling stage, a missing room is reported within a second or two
      // ("peer-unavailable"), so a timeout there means the direct connection is blocked.
      const timer = setTimeout(() => fail(stage === 'signal' ? { code: 'E1', type: 'signalling-timeout' } : { code: 'E3', type: 'ice-timeout-' + stage }), 20000);
      peer.on('error', (err) => { if (!settled) fail(err); else this.onStatus('off'); });
      peer.on('open', () => {
        this.stage('room');
        setTimeout(() => { if (!settled && stage === 'room') this.stage('p2p'); }, 3000);
        const conn = peer.connect(FP.PEER_PREFIX + code, { reliable: true, serialization: 'json' });
        this.conn = conn;
        conn.on('iceStateChanged', (st) => {
          if (st === 'checking') this.stage('p2p');
          if (st === 'failed' && !settled) fail({ code: 'E3', type: 'ice-failed' });
        });
        conn.on('error', (err) => { if (!settled) fail({ code: 'E3', type: (err && err.type) || 'webrtc' }); });
        conn.on('open', () => {
          if (settled) return;
          settled = true; clearTimeout(timer); this.onStatus('on');
          this.lastHeard = Date.now();
          // Host pings every 4s; 12s of silence means the host's tab is gone.
          this.watchdog = setInterval(() => {
            if (Date.now() - this.lastHeard > 12000 && !this.closedByUs) { clearInterval(this.watchdog); this.onStatus('off'); this.onClose(); }
          }, 2000);
          resolve();
        });
        conn.on('data', (d) => {
          this.lastHeard = Date.now();
          if (!FP.isObj(d) || typeof d.t !== 'string' || d.t === 'hb') return;
          this.onServerMessage(d);
        });
        conn.on('close', () => { clearInterval(this.watchdog); this.onStatus('off'); if (settled && !this.closedByUs) this.onClose(); });
      });
    });
  }
  sendToServer(msg) {
    if (!this.conn || !this.conn.open) return;
    if (!this.limiter.take()) return; // don't flood the host
    try { this.conn.send(msg); } catch (e) { /* ignore */ }
  }
  close() {
    this.closedByUs = true;
    clearInterval(this.watchdog);
    try { if (this.conn && this.conn.open) this.conn.close(); } catch (e) {}
    setTimeout(() => { try { this.peer && this.peer.destroy(); } catch (e) {} }, 50);
  }
}

/* ---------------- Solo: server & client in the same tab ---------------- */
class LocalTransport {
  constructor() {
    this.selfId = 'me';
    this.onClientMessage = () => {};
    this.onServerMessage = () => {};
    this.onJoin = () => {};
    this.onLeave = () => {};
    this.locked = true;
  }
  sendTo(pid, msg) { const m = clone(msg); queueMicrotask(() => this.onServerMessage(m)); }
  broadcast(msg) { this.sendTo(this.selfId, msg); }
  sendToServer(msg) { const m = clone(msg); queueMicrotask(() => this.onClientMessage(this.selfId, m)); }
  kick() {}
  close() {}
}

/* ---------------- Connection check (for troubleshooting) ----------------
   Tests: can we reach the signalling service, and which ICE candidate types can this
   network produce? host = local, srflx = via STUN (direct P2P likely OK), relay = via TURN. */
FP.checkConnection = async function () {
  const out = { webrtc: webrtcSupported(), signalling: false, stun: false, turn: false };
  const c = (FP.CONFIG && FP.CONFIG.peer) || {};
  try {
    const url = (c.secure ? 'https://' : 'http://') + c.host + ':' + c.port + (c.path || '/').replace(/\/?$/, '/') + 'peerjs/id?ts=' + Date.now();
    const r = await fetch(url, { cache: 'no-store' });
    out.signalling = r.ok;
  } catch (e) { out.signalling = false; }
  if (!out.webrtc) return out;
  const servers = (FP.CONFIG && Array.isArray(FP.CONFIG.iceServers) && FP.CONFIG.iceServers.length) ? FP.CONFIG.iceServers
    : [{ urls: 'stun:stun.l.google.com:19302' }, { urls: ['turn:eu-0.turn.peerjs.com:3478', 'turn:us-0.turn.peerjs.com:3478'], username: 'peerjs', credential: 'peerjsp' }];
  await new Promise((resolve) => {
    let pc;
    try { pc = new RTCPeerConnection({ iceServers: servers }); } catch (e) { resolve(); return; }
    const done = () => { try { pc.close(); } catch (e) {} resolve(); };
    const t = setTimeout(done, 8000);
    pc.onicecandidate = (e) => {
      if (!e.candidate) { clearTimeout(t); done(); return; }
      const cand = e.candidate.candidate || '';
      if (/ typ srflx/.test(cand)) out.stun = true;
      if (/ typ relay/.test(cand)) out.turn = true;
    };
    pc.createDataChannel('probe');
    pc.createOffer().then((o) => pc.setLocalDescription(o)).catch(done);
  });
  return out;
};

FP.HostTransport = HostTransport;
FP.ClientTransport = ClientTransport;
FP.LocalTransport = LocalTransport;
})();
