/* Hallelujoy — app shell: routing, home page, rooms (host/guest/solo). */
'use strict';
(() => {
const { h } = FP;
const app = document.getElementById('app');

/* ---------------- profile ---------------- */
const profile = {
  name: FP.cleanName(FP.store.get('name', '')) === 'Player' ? 'Disciple' + (100 + FP.secureInt(900)) : FP.cleanName(FP.store.get('name', '')),
  avatar: FP.cleanAvatar(FP.store.get('avatar', FP.AVATARS[FP.secureInt(FP.AVATARS.length)])),
  save() { FP.store.set('name', this.name); FP.store.set('avatar', this.avatar); },
};
profile.save();
let profileTimer = null;
// Tell the current room about a new name/avatar (the server already accepts 'profile').
function syncProfile() {
  clearTimeout(profileTimer);
  profileTimer = setTimeout(() => {
    if (FP.room && !FP.room.dead && FP.room.role !== 'solo') FP.room.send({ t: 'profile', name: profile.name, avatar: profile.avatar });
  }, 400);
}
// Leave the current room for real. Hosts are warned that it closes the room for everyone.
function leaveRoom() {
  const r = FP.room;
  if (r && !r.dead && r.role === 'host' && r.players.length > 1 &&
      !confirm('You are the host — leaving closes this room for everyone. Leave anyway?')) return false;
  if (r) r.destroy();
  location.hash = '#/';
  return true;
}
FP.leaveRoom = leaveRoom;

/* ---------------- page lifecycle ---------------- */
let leaveHooks = [];
FP.onLeavePage = (fn) => leaveHooks.push(fn);
function leavePage() { leaveHooks.forEach((f) => { try { f(); } catch (e) {} }); leaveHooks = []; }

/* ---------------- net status pill ---------------- */
const pill = document.getElementById('netStatus');
function setStatus(s) {
  if (!s) { pill.hidden = true; return; }
  pill.hidden = false;
  pill.className = 'status-pill ' + (s === 'on' ? 'on' : s === 'off' ? 'off' : '');
  pill.textContent = s === 'on' ? 'Connected' : s === 'off' ? 'Reconnecting…' : s;
}

/* ---------------- sound toggle ---------------- */
const soundBtn = document.getElementById('soundBtn');
const paintSound = () => { soundBtn.textContent = FP.sound.enabled ? '🔊' : '🔇'; };
paintSound();
soundBtn.addEventListener('click', () => { FP.sound.enabled = !FP.sound.enabled; FP.store.set('sound', FP.sound.enabled); paintSound(); if (FP.sound.enabled) FP.sound.play('pop'); });

/* ---------------- countdown ticker ---------------- */
setInterval(() => {
  const now = Date.now();
  document.querySelectorAll('.timer[data-deadline]').forEach((el) => {
    const left = +el.dataset.deadline - now;
    el.textContent = FP.fmtTime(left);
    el.classList.toggle('low', left < 5500 && left > 0);
  });
  document.querySelectorAll('.progress > i[data-deadline]').forEach((el) => {
    const left = +el.dataset.deadline - now;
    el.style.width = Math.max(0, Math.min(100, (left / +el.dataset.dur) * 100)) + '%';
  });
}, 250);

/* ======================================================================= */
/* Room controller — one per session. Works for host, guest and solo.      */
/* ======================================================================= */
class Room {
  constructor({ role, code, tx, server }) {
    this.role = role; this.code = code; this.tx = tx; this.server = server;
    this.solo = role === 'solo';
    this.me = null; this.hostId = null;
    this.players = []; this.state = null;
    this.view = null; this.viewKey = null;
    this.skChoices = null; this.skWord = null;
    this.dead = false;
  }
  get isHost() { return this.me != null && this.me === this.hostId; }
  nameOf(id) { const p = this.players.find((x) => x.id === id); return p ? p.name : 'Someone'; }
  send(m) { if (!this.dead) this.tx.sendToServer(m); }
  inviteUrl() { return FP.baseUrl() + '#/r/' + this.code; }

  onServerMessage(m) {
    if (this.dead) return;
    switch (m.t) {
      case 'welcome': this.me = String(m.you); this.hostId = String(m.host); break;
      case 'players':
        if (!Array.isArray(m.list)) return;
        this.players = m.list.slice(0, FP.MAX_PLAYERS).filter(FP.isObj).map((p) => ({ id: String(p.id), name: FP.cleanName(p.name), avatar: FP.cleanAvatar(p.avatar), score: Number.isFinite(p.score) ? Math.round(p.score) : 0, host: !!p.host }));
        this.hostId = String(m.host);
        this.renderPlayers();
        break;
      case 'state':
        this.state = m;
        if (this.solo && m.settings && FP.DIFFS.includes(m.settings.diff)) FP.store.set('solo_diff', m.settings.diff);
        this.renderStage();
        this.renderPlayers();
        break;
      case 'chat': this.addChat(m); break;
      case 'sk_choices':
        if (Array.isArray(m.words)) this.skChoices = { words: m.words.slice(0, 3).map((w) => FP.cleanText(String(w), 40)), cats: (Array.isArray(m.cats) ? m.cats : []).slice(0, 3).map((c) => FP.cleanText(String(c), 30)) };
        this.view && this.view.onMsg && this.view.onMsg(m);
        break;
      case 'gw_secret':
        if (FP.clampInt(m.round, 1, 99) != null && typeof m.id === 'string' && FP.charById(m.id)) this.gwSecret = { round: m.round, id: m.id };
        this.view && this.view.onMsg && this.view.onMsg(m);
        break;
      case 'sk_word':
        this.skWord = FP.cleanText(String(m.word || ''), 40);
        this.view && this.view.onMsg && this.view.onMsg(m);
        break;
      case 'kicked': case 'denied':
        FP.toast(FP.cleanText(String(m.reason || 'Disconnected'), 120), 'bad');
        this.destroy(); location.hash = '#/';
        break;
      case 'closed':
        this.destroy();
        history.replaceState(null, '', '#/');
        showError('', '', { code: 'E4', type: 'host-closed-room' });
        break;
      default:
        this.view && this.view.onMsg && this.view.onMsg(m);
    }
  }

  /* ---------- layout ---------- */
  mount(root) {
    FP.clear(root);
    if (this.el) { root.append(this.el); return; } // re-entering the room keeps chat & view
    this.stageBody = h('div', { class: 'stage' });
    const stageCard = h('section', { class: 'card stage-card' }, this.stageBody);
    if (this.solo) { this.el = stageCard; root.append(stageCard); if (this.state) this.renderStage(); return; }
    this.playersEl = h('div', { class: 'players' });
    this.playerCount = h('span', { class: 'chip' });
    this.lockBtn = h('button', { class: 'btn btn-sm btn-ghost', type: 'button', hidden: true, onclick: () => this.send({ t: 'lock', on: !(this.state && this.state.locked) }) });
    this.endBtn = h('button', { class: 'btn btn-sm btn-ghost btn-danger', type: 'button', hidden: true, onclick: () => { if (confirm('End this game for everyone and return to the lobby?')) this.send({ t: 'lobby' }); } }, '⏹ End game');
    const playersCard = h('aside', { class: 'card side players-side' },
      h('div', { class: 'row between mb' }, h('h3', null, 'Players ', this.playerCount), h('div', { class: 'row', style: { gap: '4px' } }, this.lockBtn, this.endBtn)), this.playersEl);
    this.feed = h('div', { class: 'chat-feed', role: 'log', 'aria-live': 'polite' });
    const input = h('input', { class: 'input', maxlength: '120', placeholder: 'Chat or guess…', autocomplete: 'off', 'aria-label': 'Chat message' });
    const form = h('form', { class: 'chat-form', onsubmit: (e) => { e.preventDefault(); const v = input.value.trim(); if (v) this.send({ t: 'chat', text: v }); input.value = ''; } }, input, h('button', { class: 'btn btn-primary', type: 'submit' }, 'Send'));
    const url = this.inviteUrl();
    const invite = h('div', { class: 'stack mb' },
      h('div', { class: 'row between' }, h('span', { class: 'lbl', style: { margin: 0 }, text: 'Room code' }), h('span', { class: 'room-code', text: this.code })),
      h('div', { class: 'invite' }, h('code', { text: url }), h('button', { class: 'btn btn-sm btn-primary', type: 'button', onclick: () => FP.share('Join my Hallelujoy room!', url) }, 'Invite')));
    const chatCard = h('aside', { class: 'card side chat' }, invite, h('h3', { class: 'mb', text: 'Chat' }), this.feed, form,
      h('button', { class: 'btn btn-ghost btn-sm mt', type: 'button', onclick: leaveRoom }, '← Leave room'));
    this.el = h('div', { class: 'room' }, playersCard, stageCard, chatCard);
    root.append(this.el);
    // Messages may have arrived before the layout existed (host's own hello/state).
    if (this.state) this.renderStage();
    this.renderPlayers();
    this.addChat({ kind: 'sys', text: this.role === 'host' ? 'Room created! Share the invite link — friends join instantly, no sign-up.' : 'Connected. Be kind and have fun! 🙏' });
  }

  renderPlayers() {
    if (!this.playersEl) return;
    FP.clear(this.playersEl);
    this.playerCount.textContent = String(this.players.length);
    const g = this.state && this.state.phase === 'playing' ? this.state.game : null;
    const sorted = this.players.slice().sort((a, b) => b.score - a.score);
    sorted.forEach((p, i) => {
      let badge = '';
      let done = false;
      if (g) {
        if (g.kind === 'quiz' && g.answered.includes(p.id)) { badge = '✔'; done = true; }
        if (g.kind === 'sketch') { if (g.drawer === p.id) badge = '✏️'; else if (g.guessed.includes(p.id)) { badge = '✔'; done = true; } }
        if (g.kind === 'gw') {
          const mt = (g.matches || []).find((x) => x.a === p.id || x.b === p.id);
          if (!mt) badge = '👀';
          else if (mt.winner) { if (mt.winner === p.id) { badge = '🏆'; done = true; } else badge = '✘'; }
          else if (mt.turn === p.id) badge = mt.step === 'ask' ? '💬' : '⏳';
          else if (mt.step === 'answer') badge = '🤔';
        }
      }
      this.playersEl.append(h('div', { class: 'player' + (p.id === this.me ? ' me' : '') + (done ? ' done' : '') },
        h('span', { class: 'rank', text: String(i + 1) }),
        h('span', { class: 'av', text: p.avatar }),
        h('span', { class: 'nm', text: p.name + (p.id === this.me ? ' (you)' : '') }),
        p.id === this.me ? h('button', { class: 'kick', type: 'button', title: 'Change your name', 'aria-label': 'Change your name', onclick: () => {
          const v = prompt('Your name:', profile.name);
          if (v == null) return;
          profile.name = FP.cleanName(v); profile.save(); syncProfile();
        } }, '✏️') : null,
        p.host ? h('span', { class: 'badge', title: 'Host', text: '👑' }) : null,
        badge ? h('span', { class: 'badge', text: badge }) : null,
        h('span', { class: 'pts', text: String(p.score) }),
        this.isHost && p.id !== this.me ? h('button', { class: 'kick', type: 'button', title: 'Remove player', 'aria-label': 'Remove ' + p.name, onclick: () => { if (confirm('Remove ' + p.name + ' from the room?')) this.send({ t: 'kick', id: p.id }); } }, '✕') : null));
    });
    if (this.endBtn) this.endBtn.hidden = !(this.isHost && this.state && this.state.phase === 'playing');
    if (this.lockBtn) {
      this.lockBtn.hidden = !this.isHost;
      this.lockBtn.textContent = this.state && this.state.locked ? '🔒 Locked' : '🔓 Open';
      this.lockBtn.title = 'Lock the room so nobody new can join';
    }
  }

  addChat(m) {
    if (!this.feed) return;
    const kind = ['sys', 'good', 'close', 'secret'].includes(m.kind) ? m.kind : '';
    const text = FP.cleanText(String(m.text || ''), 160);
    if (!text) return;
    const el = h('div', { class: 'msg ' + kind });
    if (m.name && kind !== 'sys' && kind !== 'good' && kind !== 'close') el.append(h('b', { text: FP.cleanName(m.name) + ':' }));
    el.append(document.createTextNode(text));
    this.feed.append(el);
    while (this.feed.children.length > 200) this.feed.firstChild.remove();
    this.feed.scrollTop = this.feed.scrollHeight;
    if (kind === 'good') FP.sound.play('pop');
  }

  renderStage() {
    const st = this.state;
    if (!st || !FP.MODES[st.mode] || !this.stageBody) return;
    let key = st.phase;
    if (st.phase === 'playing' && st.game) key = st.game.kind;
    const make = { lobby: FP.views.lobby, end: FP.views.end, quiz: FP.views.quiz, sketch: FP.views.sketch, gw: FP.views.gw }[key];
    if (!make) return;
    if (key !== this.viewKey) {
      if (this.view && this.view.destroy) this.view.destroy();
      this.viewKey = key;
      FP.clear(this.stageBody);
      this.view = make(this);
      this.view.mount(this.stageBody);
    }
    this.view.update(st);
  }

  destroy() {
    if (this.dead) return;
    this.dead = true;
    if (this.view && this.view.destroy) this.view.destroy();
    if (this.server) this.server.stop();
    try { this.tx.close(); } catch (e) {}
    setStatus(null);
    if (FP.room === this) FP.room = null;
  }
}

/* ---------------- sessions ---------------- */
async function hostRoom() {
  if (FP.room && FP.room.role === 'host') { location.hash = '#/r/' + FP.room.code; return; }
  if (FP.room) FP.room.destroy();
  showLoading('Creating your room…');
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = FP.randomCode(6);
    const tx = new FP.HostTransport();
    try {
      await tx.start(code);
      const server = new FP.Server(tx, { code });
      const room = new Room({ role: 'host', code, tx, server });
      FP.room = room;
      tx.onServerMessage = (m) => room.onServerMessage(m);
      tx.onStatus = setStatus;
      setStatus('on');
      location.replace('#/r/' + code);
      tx.sendToServer({ t: 'hello', name: profile.name, avatar: profile.avatar });
      return;
    } catch (err) {
      if (err && err.type === 'unavailable-id') continue;
      const mode = pendingMode;
      showError('Creating a room', '', err, () => { pendingMode = mode; hostRoom(); });
      return;
    }
  }
  showError('Could not create a room', 'Please try again in a moment.');
}

async function joinRoom(code) {
  if (FP.room && FP.room.code === code && !FP.room.dead) { FP.room.mount(app); return; }
  if (FP.room) FP.room.destroy();
  const setSub = showLoading('Joining room ' + code + '…', true);
  const tx = new FP.ClientTransport();
  tx.onStage = (st) => setSub(st === 'room' ? 'Connected to the service — looking for the host…' : st === 'p2p' ? 'Found the room — opening a direct connection…' : 'Contacting the connection service…');
  const room = new Room({ role: 'guest', code, tx });
  FP.room = room;
  tx.onServerMessage = (m) => room.onServerMessage(m);
  tx.onStatus = setStatus;
  tx.onClose = () => { if (!room.dead) { room.destroy(); history.replaceState(null, '', '#/'); showError('', '', { code: 'E4', type: 'host-disconnected' }); } };
  try {
    await tx.join(code);
  } catch (err) {
    if (room.dead) return;
    room.destroy();
    if (err && err.message && !err.type && !err.code) showError('Could not join room ' + code, err.message);
    else showError('Room ' + code, '', err, '#/r/' + code);
    return;
  }
  if (room.dead || location.hash !== '#/r/' + code) return;
  room.mount(app);
  tx.sendToServer({ t: 'hello', name: profile.name, avatar: profile.avatar });
}

function playSolo(mode) {
  if (FP.room) FP.room.destroy();
  const tx = new FP.LocalTransport();
  const server = new FP.Server(tx, { solo: true });
  const room = new Room({ role: 'solo', code: null, tx, server });
  FP.room = room;
  tx.onServerMessage = (m) => room.onServerMessage(m);
  room.mount(app);
  tx.sendToServer({ t: 'hello', name: profile.name, avatar: profile.avatar });
  tx.sendToServer({ t: 'settings', s: { mode, diff: FP.store.get('solo_diff', 'medium') } });
}

/* ---------------- simple screens ---------------- */
function showLoading(text, cancel) {
  FP.clear(app);
  const sub = h('p', { class: 'muted small mt', text: 'Connecting securely, peer-to-peer…' });
  app.append(h('div', { class: 'card pad-lg center', style: { maxWidth: '440px', margin: '60px auto' } },
    h('div', { class: 'spinner' }), h('h2', { class: 'mt', text }), sub,
    cancel ? h('a', { class: 'btn btn-ghost mt', href: '#/' }, 'Cancel') : null));
  return (t) => { sub.textContent = t; };
}
// Troubleshooting panel: tells players *what* is blocked on their network.
function connectionCheckPanel() {
  const box = h('div', { class: 'card mt small', style: { textAlign: 'left', boxShadow: 'none', background: 'var(--surface-2)' } });
  const btn = h('button', { class: 'btn btn-sm', type: 'button' }, '🩺 Test my connection');
  btn.addEventListener('click', async () => {
    btn.disabled = true; btn.textContent = 'Testing… (up to 10s)';
    const r = await FP.checkConnection();
    FP.clear(box);
    const line = (ok, label, good, bad) => h('div', null, (ok ? '✅ ' : '❌ ') + label + ' — ' + (ok ? good : bad));
    box.append(h('b', { text: 'Connection check' }),
      line(r.webrtc, 'Peer-to-peer support', 'your browser supports it', 'not available in this browser (try Chrome/Safari/Firefox, not an in-app browser)'),
      line(r.signalling, 'Connection service', 'reachable', 'blocked or offline — rooms can\'t work on this network'),
      line(r.stun, 'Direct connections (STUN)', 'available', 'blocked — you\'ll rely on the relay below'),
      line(r.turn, 'Relay fallback (TURN)', 'available — should work even on strict networks', 'blocked on this network'),
      h('p', { class: 'tiny muted mt', text: r.signalling && (r.stun || r.turn) ? 'This device looks fine. If joining still fails, the problem is likely on the other player\'s network — ask them to run this test too.' : 'This network is blocking what rooms need. Try mobile data or a different Wi-Fi.' }));
  });
  box.append(btn);
  return box;
}
function showError(title, msg, err, retryHref) {
  FP.clear(app);
  const e = err ? FP.netError(err) : null;
  app.append(h('div', { class: 'card pad-lg center', style: { maxWidth: '520px', margin: '60px auto' } },
    h('div', { class: 'big-emoji', text: '😕' }), h('h2', { class: 'mt', text: e ? e.title : title }),
    h('p', { class: 'muted mt', text: e ? e.text : msg }),
    e ? h('p', { class: 'tiny muted mt', text: 'Error ' + e.code + ' · ' + e.detail + (title ? ' · ' + title : '') }) : null,
    h('div', { class: 'row mt', style: { justifyContent: 'center' } },
      retryHref ? h('button', { class: 'btn btn-primary', type: 'button', onclick: () => { if (typeof retryHref === 'function') retryHref(); else if (location.hash === retryHref) route(); else location.hash = retryHref; } }, '🔄 Try again') : null,
      h('a', { class: 'btn' + (retryHref ? '' : ' btn-primary'), href: '#/' }, 'Back to games')),
    e ? connectionCheckPanel() : null));
}

// Each game card is a real link, so right-click → "Open in new tab" (and middle-click,
// Ctrl/Cmd-click) work. A plain left-click opens a quick "solo or with friends?" chooser.
function gameHref(k) {
  const m = FP.MODES[k];
  if (m.kind === 'puzzle') return '#/p/' + k;
  if (k === 'sketch') return '#/host/sketch';
  return '#/play/' + k;
}
function gameCard(k) {
  const m = FP.MODES[k];
  const a = h('a', { class: 'game-card', href: gameHref(k), style: { '--hue': m.hue } },
    h('div', { class: 'row', style: { gap: '12px', flexWrap: 'nowrap' } }, h('div', { class: 'game-icon', text: m.icon }), h('h3', { text: m.title })),
    h('p', { text: m.desc }),
    h('div', { class: 'game-tags' }, m.tags.map((t) => h('span', { class: 'chip', text: t })),
      m.kind === 'quiz' ? h('span', { class: 'chip primary', text: 'Solo & rooms' }) : null));
  a.addEventListener('click', (e) => {
    if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return; // let the browser open a new tab/window
    if (m.kind === 'puzzle') return; // normal navigation
    e.preventDefault();
    openGame(k);
  });
  return a;
}

function openGame(k) {
  const m = FP.MODES[k];
  if (m.kind === 'puzzle') { location.hash = '#/p/' + k; return; }
  let close;
  if (FP.room && !FP.room.dead && FP.room.role === 'host' && FP.room.isHost) {
    const code = FP.room.code;
    close = FP.modal(h('div', { class: 'stack' },
      h('div', { class: 'row' }, h('div', { class: 'game-icon', style: { '--hue': m.hue }, text: m.icon }), h('h2', { text: m.title })),
      h('p', { class: 'muted', text: 'You\'re hosting room ' + code + '. Play this game there, or leave the room first.' }),
      h('button', { class: 'btn btn-primary btn-lg', type: 'button', onclick: () => { close(); FP.room.send({ t: 'settings', s: { mode: k } }); location.hash = '#/r/' + code; } }, '👥 Play it in room ' + code),
      h('button', { class: 'btn btn-lg', type: 'button', onclick: () => { close(); if (leaveRoom()) setTimeout(() => openGame(k), 0); } }, 'Leave room ' + code + ' first')));
    return;
  }
  const link = (href, cls, text) => h('a', { class: 'btn btn-lg ' + cls, href, onclick: () => close && close() }, text);
  if (k === 'sketch') {
    close = FP.modal(h('div', { class: 'stack' }, h('div', { class: 'big-emoji', text: '🎨' }), h('h2', { text: 'Sketch & Guess is multiplayer' }),
      h('p', { class: 'muted', text: 'Create a free room and send the link to friends, family or your youth group. Everyone joins in their browser — no sign-up.' }),
      link('#/host/sketch', 'btn-primary', 'Create a room')));
    return;
  }
  close = FP.modal(h('div', { class: 'stack' },
    h('div', { class: 'row' }, h('div', { class: 'game-icon', style: { '--hue': m.hue }, text: m.icon }), h('h2', { text: m.title })),
    h('p', { class: 'muted', text: m.desc }),
    link('#/play/' + k, 'btn-primary', k === 'guesswho' ? '🤖 Play vs computer' : '▶ Play solo'),
    link('#/host/' + k, '', '👥 Play with friends (create room)'),
    h('p', { class: 'tiny muted center', text: 'Tip: right-click any game to open it in a new tab.' })));
}
let pendingMode = null;

/* ---------------- home ---------------- */
function renderHome() {
  FP.clear(app);
  const nameIn = h('input', { class: 'input', maxlength: '16', value: profile.name, 'aria-label': 'Your name', autocomplete: 'nickname' });
  nameIn.addEventListener('input', () => { profile.name = FP.cleanName(nameIn.value); profile.save(); syncProfile(); });
  const avGrid = h('div', { class: 'avatar-grid' });
  const paintAv = () => {
    FP.clear(avGrid);
    FP.AVATARS.forEach((a) => avGrid.append(h('button', { type: 'button', class: 'avatar-opt' + (a === profile.avatar ? ' on' : ''), 'aria-label': 'Avatar ' + a, onclick: () => { profile.avatar = a; profile.save(); paintAv(); syncProfile(); } }, a)));
  };
  paintAv();
  const codeIn = h('input', { class: 'input code', maxlength: '6', placeholder: 'CODE', 'aria-label': 'Room code', autocomplete: 'off' });
  const join = () => {
    const c = codeIn.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (c.length !== 6) { FP.toast('Room codes have 6 characters', 'bad'); return; }
    location.hash = '#/r/' + c;
  };
  codeIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') join(); });

  const inRoom = FP.room && FP.room.role !== 'solo' && !FP.room.dead;
  const hero = h('div', { class: 'hero' },
    h('div', { class: 'hero-copy' },
      h('span', { class: 'chip', style: { background: 'rgba(255,255,255,.18)', color: '#fff' }, text: '✨ Free · No sign-up · Play in your browser' }),
      h('h1', { class: 'mt', text: 'Bible & gospel games for fellowship night' }),
      h('p', { text: 'Draw & guess Bible stories, find the secret character in Guess Who, name that gospel song from Lagos to Nashville, crack logic puzzles — together or solo.' }),
      h('div', { class: 'hero-stats' },
        h('div', null, h('b', { text: String(Object.keys(FP.MODES).length) }), 'games'),
        h('div', null, h('b', { text: String(FP.TRIVIA.length + FP.TRUEFALSE.length + FP.QUOTES.length + FP.LYRICS.length + FP.WHOAMI.length) + '+' }), 'questions'),
        h('div', null, h('b', { text: String(FP.SONGS.length + FP.HYMN_EMOJI.length + FP.MELODIES.length) }), 'songs & hymns'),
        h('div', null, h('b', { text: '∞' }), 'puzzles')),
      h('div', { class: 'hero-emojis', 'aria-hidden': 'true', text: '🕊️🎵📖' })),
    h('div', { class: 'card stack' },
      h('div', null, h('label', { class: 'lbl', text: 'Your name' }), nameIn),
      h('div', null, h('label', { class: 'lbl', text: 'Avatar' }), avGrid),
      inRoom ? h('div', { class: 'stack', style: { gap: '8px' } },
        h('div', { class: 'small muted center', text: 'You\'re still in room ' + FP.room.code + (FP.room.role === 'host' ? ' (as host)' : '') }),
        h('div', { class: 'row', style: { flexWrap: 'nowrap' } },
          h('a', { class: 'btn btn-primary grow', href: '#/r/' + FP.room.code }, '↩ Back to room'),
          h('button', { class: 'btn btn-danger', type: 'button', onclick: () => { if (leaveRoom()) renderHome(); } }, 'Leave room')))
        : h('button', { class: 'btn btn-primary btn-lg btn-block', type: 'button', onclick: () => { pendingMode = null; hostRoom(); } }, '👥 Create a room'),
      h('div', { class: 'divider', text: 'OR JOIN WITH A CODE' }),
      h('div', { class: 'row', style: { flexWrap: 'nowrap' } }, codeIn, h('button', { class: 'btn', type: 'button', onclick: join }, 'Join'))));
  app.append(hero);

  const sections = [
    ['party', 'Party games', 'Best with a group — create a room and share the link'],
    ['quiz', 'Quiz games', 'Play solo or race your friends in a room'],
    ['puzzle', 'Puzzles', 'Solo brain-teasers — every puzzle has a shareable link'],
  ];
  sections.forEach(([grp, title, sub]) => {
    app.append(h('div', { class: 'section-title' }, h('h2', { text: title }), h('p', { text: sub })));
    app.append(h('div', { class: 'games' }, Object.keys(FP.MODES).filter((k) => FP.MODES[k].group === grp).map((k) => gameCard(k))));
  });
  app.append(h('div', { class: 'card mt small muted' },
    h('h3', { class: 'mb', style: { color: 'var(--text)' }, text: '🔒 Safe by design' }),
    h('ul', { class: 'how' },
      h('li', { text: 'No accounts, no personal data collected. Your name and scores stay in your browser.' }),
      h('li', { text: 'Rooms connect players directly (WebRTC, encrypted in transit). Room codes are random and the host can lock the room or remove anyone.' }),
      h('li', { text: 'The host\'s game checks every answer — nobody can see answers early or edit scores. Chat is filtered and rate-limited.' }))));
}

/* ---------------- router ---------------- */
function route() {
  leavePage();
  const hash = location.hash || '#/';
  const parts = hash.replace(/^#\/?/, '').split('/').map((s) => decodeURIComponent(s));
  const [a, b, c] = parts;
  window.scrollTo(0, 0);

  // Leaving a room: guests disconnect; hosts keep their room alive while browsing
  // home/puzzles (friends keep playing), but starting a solo game or another room closes it.
  if (FP.room && !FP.room.dead) {
    const sameRoom = a === 'r' && b && b.toUpperCase() === FP.room.code;
    if (FP.room.role === 'solo') FP.room.destroy();
    else if (!sameRoom && (FP.room.role === 'guest' || a === 'r' || a === 'play')) {
      if (FP.room.role === 'host') FP.toast('You closed your room — create a new one any time.');
      FP.room.destroy();
    }
  }

  if (a === 'r' && b) {
    const code = b.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    if (code.length !== 6) return showError('Invalid room link', 'Room codes have 6 letters/numbers.');
    if (FP.room && FP.room.role === 'host' && FP.room.code === code) {
      FP.room.mount(app);
      if (pendingMode) { FP.room.send({ t: 'settings', s: { mode: pendingMode } }); pendingMode = null; }
      return;
    }
    return joinRoom(code);
  }
  if (a === 'host' && b && FP.MODES[b] && FP.MODES[b].kind !== 'puzzle') {
    pendingMode = b;
    if (FP.room && FP.room.role === 'host' && !FP.room.dead) { location.replace('#/r/' + FP.room.code); return; }
    return hostRoom();
  }
  if (a === 'play' && b && FP.MODES[b]) {
    if (b === 'guesswho') { FP.clear(app); return FP.pages.guesswho(app); }
    if (FP.MODES[b].kind === 'quiz') return playSolo(b);
  }
  if (a === 'p' && b && FP.pages[b]) { FP.clear(app); return FP.pages[b](app, c); }
  renderHome();
}
window.addEventListener('hashchange', route);
window.addEventListener('beforeunload', () => { if (FP.room) FP.room.destroy(); });
route();
})();
