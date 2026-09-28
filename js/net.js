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
  gw_ask: (m) => str(m.k, 20),
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
  return { debug: 0, host: c.host, port: c.port, secure: c.secure, path: c.path };
}
function peerErrorText(err) {
  const t = err && err.type;
  if (t === 'peer-unavailable') return 'Room not found. Check the code or ask the host for a new link.';
  if (t === 'unavailable-id') return 'That room code is already in use.';
  if (t === 'browser-incompatible') return 'Your browser does not support WebRTC.';
  if (t === 'network' || t === 'server-error' || t === 'socket-error' || t === 'socket-closed') return 'Could not reach the matchmaking server. Check your connection.';
  return 'Connection problem (' + (t || 'unknown') + ').';
}
FP.peerErrorText = peerErrorText;

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
      const peer = new Peer(FP.PEER_PREFIX + code, peerOptions());
      this.peer = peer;
      let opened = false;
      peer.on('open', () => { opened = true; this.onStatus('on'); resolve(); });
      peer.on('connection', (conn) => this._accept(conn));
      peer.on('disconnected', () => { this.onStatus('off'); if (!peer.destroyed) setTimeout(() => { try { peer.reconnect(); } catch (e) {} }, 1500); });
      peer.on('error', (err) => {
        if (!opened) { peer.destroy(); reject(err); }
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
      const peer = new Peer(peerOptions());
      this.peer = peer;
      let settled = false;
      const fail = (e) => { if (settled) return; settled = true; try { peer.destroy(); } catch (x) {} reject(e); };
      const timer = setTimeout(() => fail({ type: 'timeout', message: 'Timed out connecting to the room.' }), 20000);
      peer.on('error', (err) => { if (!settled) { clearTimeout(timer); fail(err); } else this.onStatus('off'); });
      peer.on('open', () => {
        const conn = peer.connect(FP.PEER_PREFIX + code, { reliable: true, serialization: 'json' });
        this.conn = conn;
        conn.on('open', () => { if (settled) return; settled = true; clearTimeout(timer); this.onStatus('on'); resolve(); });
        conn.on('data', (d) => {
          if (!FP.isObj(d) || typeof d.t !== 'string') return;
          this.onServerMessage(d);
        });
        conn.on('close', () => { this.onStatus('off'); if (!this.closedByUs) this.onClose(); });
        conn.on('error', () => {});
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

FP.HostTransport = HostTransport;
FP.ClientTransport = ClientTransport;
FP.LocalTransport = LocalTransport;
})();
