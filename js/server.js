/* Authoritative game server — runs ONLY in the host's browser (or locally for solo play).
   Clients never receive answers before a reveal, and scores are computed here only. */
'use strict';
(() => {

FP.SK = {
  W: 800, H: 600,
  PALETTE: ['#111111', '#ffffff', '#7f7f7f', '#c1c1c1', '#e11d48', '#f97316', '#facc15', '#22c55e', '#14b8a6', '#3b82f6',
    '#6c4cf1', '#a855f7', '#ec4899', '#8b4513', '#fcd9b6', '#0f766e', '#1e3a8a', '#7f1d1d', '#fde68a', '#bbf7d0'],
  SIZES: [3, 7, 14, 28],
};
// Validate a drawing op (used by server AND clients — the host could be untrusted too).
FP.validDrawOp = function (op) {
  if (!FP.isObj(op)) return null;
  const P = FP.SK.PALETTE.length;
  if (op.k === 'line') {
    if (FP.clampInt(op.g, 0, 1e7) == null || FP.clampInt(op.c, 0, P - 1) == null || FP.clampInt(op.s, 0, FP.SK.SIZES.length - 1) == null) return null;
    if (!Array.isArray(op.p) || op.p.length < 2 || op.p.length > 400 || op.p.length % 2) return null;
    for (let i = 0; i < op.p.length; i++) { if (FP.clampInt(op.p[i], 0, i % 2 ? FP.SK.H : FP.SK.W) == null) return null; }
    return { k: 'line', g: op.g, c: op.c, s: op.s, p: op.p.slice() };
  }
  if (op.k === 'fill') {
    if (FP.clampInt(op.c, 0, P - 1) == null || FP.clampInt(op.x, 0, FP.SK.W) == null || FP.clampInt(op.y, 0, FP.SK.H) == null) return null;
    return { k: 'fill', c: op.c, x: op.x, y: op.y };
  }
  if (op.k === 'clear' || op.k === 'undo') return { k: op.k };
  return null;
};

class Server {
  constructor(tx, { code = null, solo = false } = {}) {
    this.tx = tx;
    this.code = code;
    this.solo = solo;
    this.hostId = tx.selfId;
    this.players = new Map();
    this.mode = 'trivia';
    this.settings = Object.assign({}, FP.MODES.trivia.defaults);
    this.phase = 'lobby';
    this.engine = null;
    this.results = null;
    this.locked = false;
    tx.onClientMessage = (pid, m) => { try { this.onMessage(pid, m); } catch (e) { console.error(e); } };
    tx.onLeave = (pid) => this.onLeave(pid);
    tx.onJoin = () => {};
  }

  /* ---------- helpers ---------- */
  name(pid) { const p = this.players.get(pid); return p ? p.name : 'Someone'; }
  isHost(pid) { return pid === this.hostId; }
  sendTo(pid, m) { this.tx.sendTo(pid, m); }
  broadcast(m, except) { this.tx.broadcast(m, except); }
  sys(text, kind = 'sys') { this.broadcast({ t: 'chat', kind, text }); }
  addScore(pid, pts) { const p = this.players.get(pid); if (p) p.score += pts; }
  playerList() {
    return [...this.players.values()].map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, score: p.score, host: p.id === this.hostId }));
  }
  pushPlayers() { this.broadcast({ t: 'players', list: this.playerList(), host: this.hostId }); }
  stateMsg() {
    return { t: 'state', phase: this.phase, mode: this.mode, settings: this.settings, locked: this.locked, solo: this.solo, results: this.results, game: this.engine ? this.engine.publicState() : null };
  }
  pushState() { this.broadcast(this.stateMsg()); }
  uniqueName(name, pid) {
    let n = name; let i = 2;
    const taken = () => [...this.players.values()].some((p) => p.id !== pid && p.name.toLowerCase() === n.toLowerCase());
    while (taken()) n = name.slice(0, 13) + ' ' + i++;
    return n;
  }

  /* ---------- inbound ---------- */
  onMessage(pid, m) {
    if (m.t === 'hello') return this.hello(pid, m);
    const p = this.players.get(pid);
    if (!p) return;
    const host = this.isHost(pid);
    switch (m.t) {
      case 'profile':
        p.name = this.uniqueName(FP.cleanName(m.name), pid);
        p.avatar = FP.cleanAvatar(m.avatar);
        this.pushPlayers();
        break;
      case 'chat': this.chat(pid, m.text); break;
      case 'settings': if (host && this.phase !== 'playing') this.applySettings(m.s); break;
      case 'start': if (host) this.startGame(); break;
      case 'lobby': if (host) this.toLobby(); break;
      case 'lock': if (host && !this.solo) { this.locked = m.on; this.tx.locked = m.on; this.pushState(); this.sys(m.on ? 'The host locked the room 🔒' : 'The room is open again 🔓'); } break;
      case 'kick': if (host && m.id !== this.hostId && this.players.has(m.id)) this.tx.kick(m.id); break;
      default: if (this.engine && this.phase === 'playing') this.engine.onMessage(pid, m);
    }
  }
  hello(pid, m) {
    if (this.players.has(pid)) return;
    if (this.players.size >= FP.MAX_PLAYERS) return this.tx.kick(pid, 'This room is full.');
    const p = { id: pid, name: this.uniqueName(FP.cleanName(m.name), pid), avatar: FP.cleanAvatar(m.avatar), score: 0 };
    this.players.set(pid, p);
    this.sendTo(pid, { t: 'welcome', you: pid, host: this.hostId, code: this.code });
    this.pushPlayers();
    this.sendTo(pid, this.stateMsg());
    if (!this.solo) this.sys(p.name + ' joined the room 👋');
    if (this.engine) this.engine.onJoin(pid);
  }
  onLeave(pid) {
    const p = this.players.get(pid);
    if (!p) return;
    this.players.delete(pid);
    this.sys(p.name + ' left the room');
    if (this.engine) {
      this.engine.onLeave(pid);
      if (this.phase === 'playing' && this.players.size < this.engine.minPlayers) {
        this.sys('Not enough players to continue — back to the lobby.');
        this.toLobby();
      }
    }
    this.pushPlayers();
  }
  chat(pid, raw) {
    const text = FP.cleanText(raw, 120);
    if (!text) return;
    if (this.engine && this.phase === 'playing' && this.engine.onChat(pid, text)) return;
    this.broadcast({ t: 'chat', id: pid, name: this.name(pid), text });
  }

  /* ---------- game flow ---------- */
  applySettings(s) {
    if (typeof s.mode === 'string' && FP.ROOM_MODES.includes(s.mode) && s.mode !== this.mode) {
      this.mode = s.mode;
      this.settings = Object.assign({}, FP.MODES[s.mode].defaults);
    }
    const kind = FP.MODES[this.mode].kind;
    const R = kind === 'quiz' ? [3, 30] : [1, 6];
    const T = kind === 'sketch' ? [30, 180] : kind === 'gw' ? [60, 300] : [10, 60];
    if (Number.isInteger(s.rounds)) this.settings.rounds = Math.min(R[1], Math.max(R[0], s.rounds));
    if (Number.isInteger(s.time)) this.settings.time = Math.min(T[1], Math.max(T[0], s.time));
    if (this.mode === 'trivia' && FP.TRIVIA_CATS.includes(s.cat)) this.settings.cat = s.cat;
    if (this.phase === 'end') { this.phase = 'lobby'; this.results = null; }
    this.pushState();
  }
  startGame() {
    const def = FP.MODES[this.mode];
    const Engine = def.kind === 'sketch' ? SketchEngine : def.kind === 'gw' ? GuessWhoEngine : QuizEngine;
    const eng = new Engine(this);
    if (this.players.size < eng.minPlayers) {
      this.sendTo(this.hostId, { t: 'chat', kind: 'sys', text: def.title + ' needs at least ' + eng.minPlayers + ' players. Share the invite link!' });
      return;
    }
    if (this.engine) this.engine.stop();
    for (const p of this.players.values()) p.score = 0;
    this.engine = eng;
    this.phase = 'playing';
    this.results = null;
    this.pushPlayers();
    this.engine.start();
    if (!this.solo) this.sys('▶ ' + def.title + ' started!');
  }
  endGame() {
    if (this.engine) this.engine.stop();
    this.engine = null;
    this.phase = 'end';
    this.results = this.playerList().sort((a, b) => b.score - a.score);
    this.pushPlayers();
    this.pushState();
  }
  toLobby() {
    if (this.engine) this.engine.stop();
    this.engine = null;
    this.phase = 'lobby';
    this.results = null;
    this.pushState();
  }
  stop() { if (this.engine) this.engine.stop(); this.engine = null; }
}

/* ======================================================================= */
/* Quiz engine — trivia, songs, lyrics, quotes, who-am-i, scramble, mix     */
/* ======================================================================= */
class QuizEngine {
  constructor(srv) { this.srv = srv; this.minPlayers = 1; this.timers = []; }
  later(fn, ms) { this.timers.push(setTimeout(fn, ms)); }
  clearTimers() { this.timers.forEach(clearTimeout); this.timers = []; }
  start() {
    const s = this.srv.settings;
    this.qs = FP.GEN[this.srv.mode](s.rounds, FP.mathRng(), s);
    this.i = -1;
    this.next();
  }
  next() {
    this.clearTimers();
    this.i++;
    if (this.i >= this.qs.length) return this.srv.endGame();
    const q = (this.q = this.qs[this.i]);
    this.phase = 'q';
    this.picks = new Map();
    this.correct = new Set();
    this.gained = new Map();
    const secs = q.kind === 'text' && this.srv.mode === 'mix' ? q.time : this.srv.settings.time;
    this.dur = secs * 1000;
    this.t0 = Date.now();
    this.deadline = this.t0 + this.dur;
    if (q.kind === 'text') {
      if (q.type === 'clues') {
        this.shown = 1;
        const step = this.dur / q.clues.length;
        for (let k = 1; k < q.clues.length; k++) this.later(() => { this.shown = k + 1; this.srv.pushState(); }, step * k);
      } else {
        const letters = q.answer.toUpperCase().split('');
        this.mask = letters.map((ch) => (/[A-Z]/.test(ch) ? '_' : ch));
        this.hints = 0;
        const reveal = () => {
          const hidden = this.mask.map((c, idx) => (c === '_' ? idx : -1)).filter((x) => x >= 0);
          if (hidden.length <= 2) return;
          const idx = hidden[Math.floor(Math.random() * hidden.length)];
          this.mask[idx] = letters[idx];
          this.hints++;
          this.srv.pushState();
        };
        [0.35, 0.55, 0.75].forEach((f) => this.later(reveal, this.dur * f));
      }
    }
    this.later(() => this.reveal(), this.dur);
    this.srv.pushState();
  }
  frac() { return Math.max(0, Math.min(1, (this.deadline - Date.now()) / this.dur)); }
  publicState() {
    const q = this.q;
    const pub = { kind: q.kind, type: q.type, prompt: q.prompt, sub: q.sub, cat: q.cat, emoji: q.emoji, melody: q.melody, bpm: q.bpm };
    if (q.kind === 'mc') pub.choices = q.choices;
    if (q.type === 'clues') { pub.clues = q.clues.slice(0, this.shown); pub.totalClues = q.clues.length; }
    if (q.type === 'scramble') { pub.scramble = q.scramble; pub.mask = this.mask.join(' '); }
    const st = {
      kind: 'quiz', phase: this.phase, i: this.i, n: this.qs.length, dur: this.dur, remaining: Math.max(0, this.deadline - Date.now()),
      answered: q.kind === 'mc' ? [...this.picks.keys()] : [...this.correct], q: pub,
    };
    if (this.phase === 'reveal') {
      st.reveal = { answer: q.answer, correct: q.kind === 'mc' ? q.correct : null, explain: q.explain || null, picks: Object.fromEntries(this.picks), gained: Object.fromEntries(this.gained) };
    }
    return st;
  }
  onMessage(pid, m) {
    if (m.t === 'next' && this.srv.isHost(pid) && this.phase === 'reveal') return this.next();
    if (m.t !== 'answer' || this.phase !== 'q') return;
    const q = this.q;
    if (q.kind === 'mc') {
      if (this.picks.has(pid)) return;
      const c = FP.clampInt(m.c, 0, q.choices.length - 1);
      if (c == null) return;
      this.picks.set(pid, c);
      if (c === q.correct) {
        const pts = 500 + Math.round(500 * this.frac());
        this.srv.addScore(pid, pts);
        this.gained.set(pid, pts);
      }
      this.srv.pushState();
      if (this.picks.size >= this.srv.players.size) this.reveal();
    } else {
      if (this.correct.has(pid) || typeof m.text !== 'string') return;
      const text = FP.cleanText(m.text, 60);
      if (!text) return;
      const res = FP.checkAnswer(text, [q.answer, ...(q.acc || [])]);
      if (res === 'yes') {
        this.correct.add(pid);
        let pts;
        if (q.type === 'clues') pts = Math.round((1000 - 180 * (this.shown - 1)) * (0.55 + 0.45 * this.frac()));
        else pts = Math.max(100, Math.round(300 + 700 * this.frac()) - 120 * this.hints);
        this.srv.addScore(pid, pts);
        this.gained.set(pid, pts);
        this.srv.sendTo(pid, { t: 'you', ok: true, answer: q.answer, pts });
        if (!this.srv.solo) this.srv.sys(this.srv.name(pid) + ' got it! +' + pts, 'good');
        this.srv.pushPlayers();
        this.srv.pushState();
        if (this.correct.size >= this.srv.players.size) this.reveal();
      } else if (res === 'close') {
        this.srv.sendTo(pid, { t: 'chat', kind: 'close', text: '"' + text + '" is close!' });
      } else {
        this.srv.sendTo(pid, { t: 'you', ok: false });
        if (!this.srv.solo) this.srv.broadcast({ t: 'chat', id: pid, name: this.srv.name(pid), text });
      }
    }
  }
  onChat(pid, text) {
    if (this.phase !== 'q' || this.q.kind !== 'text') return false;
    if (this.correct.has(pid)) {
      // Players who already know the answer can only talk to each other (no spoilers).
      for (const id of this.correct) this.srv.sendTo(id, { t: 'chat', kind: 'secret', id: pid, name: this.srv.name(pid), text });
      return true;
    }
    this.onMessage(pid, { t: 'answer', text });
    return true;
  }
  reveal() {
    if (this.phase === 'reveal') return;
    this.clearTimers();
    this.phase = 'reveal';
    this.srv.pushPlayers();
    this.srv.pushState();
    this.later(() => this.next(), this.srv.solo ? 6000 : 5500);
  }
  onJoin() {}
  onLeave() {
    if (this.phase !== 'q') return;
    const done = this.q.kind === 'mc' ? this.picks.size : this.correct.size;
    if (this.srv.players.size > 0 && done >= this.srv.players.size) this.reveal();
  }
  stop() { this.clearTimers(); }
}

/* ======================================================================= */
/* Sketch & Guess engine                                                   */
/* ======================================================================= */
class SketchEngine {
  constructor(srv) { this.srv = srv; this.minPlayers = 2; this.timers = []; this.ops = []; this.used = new Set(); }
  later(fn, ms) { this.timers.push(setTimeout(fn, ms)); }
  clearTimers() { this.timers.forEach(clearTimeout); this.timers = []; }
  start() {
    this.rounds = this.srv.settings.rounds;
    this.round = 1;
    this.order = [...this.srv.players.keys()];
    this.turn = -1;
    this.nextTurn();
  }
  nextTurn() {
    this.clearTimers();
    this.turn++;
    if (this.turn >= this.order.length) {
      this.round++;
      this.turn = 0;
      this.order = [...this.srv.players.keys()];
      if (this.round > this.rounds) return this.srv.endGame();
    }
    this.drawer = this.order[this.turn];
    if (!this.srv.players.has(this.drawer)) return this.nextTurn();
    this.phase = 'choose';
    this.word = null;
    this.ops = [];
    this.guessed = new Map();
    this.drawerPts = 0;
    this.choices = this.pickWords(3);
    this.dur = 15000;
    this.deadline = Date.now() + this.dur;
    this.srv.sendTo(this.drawer, { t: 'sk_choices', words: this.choices.map((c) => c.w), cats: this.choices.map((c) => c.cat) });
    this.later(() => this.begin(this.choices[Math.floor(Math.random() * 3)]), this.dur);
    this.srv.pushState();
  }
  pickWords(n) {
    let fresh = FP.SKETCH_LIST.filter((x) => !this.used.has(x.w));
    if (fresh.length < n) { this.used.clear(); fresh = FP.SKETCH_LIST; }
    const out = FP.pickFresh('sketch', fresh, n, (x) => x.w, Math.random);
    out.forEach((x) => this.used.add(x.w));
    return out;
  }
  begin(choice) {
    if (this.phase !== 'choose') return;
    this.clearTimers();
    this.phase = 'draw';
    this.word = choice.w;
    this.cat = choice.cat;
    this.mask = this.word.split('').map((ch) => (/[a-z0-9]/i.test(ch) ? '_' : ch));
    this.dur = this.srv.settings.time * 1000;
    this.deadline = Date.now() + this.dur;
    this.srv.sendTo(this.drawer, { t: 'sk_word', word: this.word });
    const letters = this.mask.filter((c) => c === '_').length;
    const hintAt = letters >= 7 ? [0.45, 0.65, 0.82] : letters >= 4 ? [0.55, 0.8] : [0.7];
    hintAt.forEach((f) => this.later(() => this.hint(), this.dur * f));
    this.later(() => this.endTurn(), this.dur);
    this.srv.sys(this.srv.name(this.drawer) + ' is drawing now ✏️');
    this.srv.pushState();
  }
  hint() {
    const hidden = this.mask.map((c, i) => (c === '_' ? i : -1)).filter((i) => i >= 0);
    if (hidden.length <= 1) return;
    const i = hidden[Math.floor(Math.random() * hidden.length)];
    this.mask[i] = this.word[i];
    this.srv.pushState();
  }
  frac() { return Math.max(0, Math.min(1, (this.deadline - Date.now()) / this.dur)); }
  onMessage(pid, m) {
    if (pid !== this.drawer) return;
    if (m.t === 'pick' && this.phase === 'choose') {
      const i = FP.clampInt(m.i, 0, this.choices.length - 1);
      if (i != null) this.begin(this.choices[i]);
    } else if (m.t === 'draw' && this.phase === 'draw') {
      const op = FP.validDrawOp(m.op);
      if (!op) return;
      if (op.k === 'undo') {
        const last = this.ops[this.ops.length - 1];
        if (!last) return;
        if (last.k === 'line') { const g = last.g; while (this.ops.length && this.ops[this.ops.length - 1].k === 'line' && this.ops[this.ops.length - 1].g === g) this.ops.pop(); }
        else this.ops.pop();
      } else if (op.k === 'clear') this.ops = [];
      else { if (this.ops.length >= 6000) return; this.ops.push(op); }
      this.srv.broadcast({ t: 'draw', op }, pid);
    }
  }
  onChat(pid, text) {
    if (this.phase !== 'draw') return false;
    if (pid === this.drawer || this.guessed.has(pid)) {
      const to = new Set([this.drawer, ...this.guessed.keys()]);
      for (const id of to) this.srv.sendTo(id, { t: 'chat', kind: 'secret', id: pid, name: this.srv.name(pid), text });
      return true;
    }
    const res = FP.checkAnswer(text, [this.word]);
    if (res === 'yes') {
      const order = this.guessed.size;
      const pts = Math.max(60, Math.round(120 + 380 * this.frac()) - order * 20);
      this.guessed.set(pid, pts);
      this.srv.addScore(pid, pts);
      this.drawerPts += 70;
      this.srv.addScore(this.drawer, 70);
      this.srv.sendTo(pid, { t: 'sk_word', word: this.word });
      this.srv.sys(this.srv.name(pid) + ' guessed the word! +' + pts, 'good');
      this.srv.pushPlayers();
      this.srv.pushState();
      if (this.guessed.size >= this.srv.players.size - 1) this.endTurn();
      return true;
    }
    if (res === 'close') {
      this.srv.sendTo(pid, { t: 'chat', kind: 'close', text: '"' + text + '" is close!' });
      return true;
    }
    return false;
  }
  endTurn() {
    if (this.phase === 'reveal') return;
    this.clearTimers();
    if (this.phase === 'choose') this.word = this.choices[0].w;
    this.phase = 'reveal';
    this.srv.pushPlayers();
    this.srv.pushState();
    this.later(() => this.nextTurn(), 5000);
  }
  publicState() {
    const st = { kind: 'sketch', phase: this.phase, round: this.round, rounds: this.rounds, drawer: this.drawer, dur: this.dur, remaining: Math.max(0, this.deadline - Date.now()), guessed: [...this.guessed.keys()] };
    if (this.phase === 'draw') { st.mask = this.mask.join(''); st.cat = this.cat; }
    if (this.phase === 'reveal') { st.word = this.word; st.gained = Object.fromEntries(this.guessed); st.drawerPts = this.drawerPts; }
    return st;
  }
  onJoin(pid) {
    // Late joiners receive the current drawing in chunks.
    for (let i = 0; i < this.ops.length || i === 0; i += 150) {
      this.srv.sendTo(pid, { t: 'draw_sync', reset: i === 0, ops: this.ops.slice(i, i + 150) });
    }
  }
  onLeave(pid) {
    this.guessed.delete(pid);
    if (pid === this.drawer && this.phase !== 'reveal') { this.srv.sys('The artist left — skipping turn.'); this.endTurn(); return; }
    if (this.phase === 'draw' && this.guessed.size >= this.srv.players.size - 1) this.endTurn();
  }
  stop() { this.clearTimers(); }
}

/* ======================================================================= */
/* Guess Who race — everyone hunts the same secret character                */
/* ======================================================================= */
class GuessWhoEngine {
  constructor(srv) { this.srv = srv; this.minPlayers = 1; this.timers = []; this.round = 0; }
  later(fn, ms) { this.timers.push(setTimeout(fn, ms)); }
  clearTimers() { this.timers.forEach(clearTimeout); this.timers = []; }
  start() { this.rounds = this.srv.settings.rounds; this.nextRound(); }
  nextRound() {
    this.clearTimers();
    this.round++;
    if (this.round > this.rounds) return this.srv.endGame();
    const rnd = FP.mathRng();
    this.board = FP.gwBoard(rnd, 24);
    this.secret = FP.charById(FP.pick(this.board, rnd));
    this.asked = new Map();
    this.done = new Map();
    this.phase = 'play';
    this.dur = this.srv.settings.time * 1000;
    this.deadline = Date.now() + this.dur;
    this.later(() => this.reveal(), this.dur);
    this.srv.pushState();
  }
  frac() { return Math.max(0, Math.min(1, (this.deadline - Date.now()) / this.dur)); }
  onMessage(pid, m) {
    if (m.t === 'next' && this.srv.isHost(pid) && this.phase === 'reveal') return this.nextRound();
    if (this.phase !== 'play' || this.done.has(pid)) return;
    if (m.t === 'gw_ask') {
      if (!FP.GW_QUESTIONS.some((q) => q.k === m.k)) return;
      const n = (this.asked.get(pid) || 0) + 1;
      if (n > 60) return;
      this.asked.set(pid, n);
      this.srv.sendTo(pid, { t: 'gw_ans', k: m.k, a: this.secret.traits.has(m.k) });
      this.srv.pushState();
    } else if (m.t === 'gw_guess') {
      if (!this.board.includes(m.id)) return;
      const ok = m.id === this.secret.id;
      const q = this.asked.get(pid) || 0;
      const pts = ok ? Math.max(150, 900 - 45 * q) + Math.round(250 * this.frac()) : 0;
      this.done.set(pid, { ok, pts });
      if (pts) this.srv.addScore(pid, pts);
      this.srv.sendTo(pid, { t: 'gw_res', ok, pts, id: ok ? this.secret.id : null });
      if (!this.srv.solo) this.srv.sys(ok ? this.srv.name(pid) + ' found the secret character with ' + FP.plural(q, 'question') + '! +' + pts : this.srv.name(pid) + ' guessed wrong and is out this round.', ok ? 'good' : 'sys');
      this.srv.pushPlayers();
      this.srv.pushState();
      if (this.done.size >= this.srv.players.size) this.reveal();
    }
  }
  onChat() { return false; }
  reveal() {
    if (this.phase === 'reveal') return;
    this.clearTimers();
    this.phase = 'reveal';
    this.srv.pushPlayers();
    this.srv.pushState();
    this.later(() => this.nextRound(), 7000);
  }
  publicState() {
    const st = { kind: 'gw', phase: this.phase, round: this.round, rounds: this.rounds, board: this.board, dur: this.dur, remaining: Math.max(0, this.deadline - Date.now()), asked: Object.fromEntries(this.asked), done: Object.fromEntries([...this.done].map(([k, v]) => [k, v.ok])) };
    if (this.phase === 'reveal') st.secret = this.secret.id;
    return st;
  }
  onJoin() {}
  onLeave() { if (this.phase === 'play' && this.srv.players.size && this.done.size >= this.srv.players.size) this.reveal(); }
  stop() { this.clearTimers(); }
}

FP.Server = Server;
})();
