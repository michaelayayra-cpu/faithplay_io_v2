/* Puzzle rooms — everyone in a room solves the SAME seeded puzzle at the same time.
   Players' pages report what they've done (answers / attempts / guesses); the host
   re-scores that data itself, so a player can't simply claim a score. */
'use strict';
(() => {
const { h } = FP;

const arr = (v, max) => (Array.isArray(v) ? v.slice(0, max) : []);
const words = (v, max) => arr(v, max).filter((x) => typeof x === 'string').map((x) => x.slice(0, 60));
const speedBonus = [1, 0.8, 0.65];

// game key -> how to build the page argument, and how the host verifies a player's report.
// verify() returns { progress 0..1 (shown live), quality 0..1 (drives points), summary }.
FP.PUZZLE_ROOM = {
  logic: {
    arg: (seed, diff) => diff + '-' + seed + '-m',
    verify(seed, diff, data) {
      const pz = FP.makeChain(seed, diff, 'multi');
      const total = pz.grid.length - 1;
      const answers = FP.isObj(data.answers) ? data.answers : {};
      let ok = 0;
      for (let c = 0; c < pz.grid.length; c++) {
        if (c === pz.root) continue;
        const t = answers[c];
        if (typeof t === 'string' && FP.checkAnswer(t.slice(0, 60), FP.chainAnswers(pz.grid[c])) === 'yes') ok++;
      }
      const hints = FP.clampInt(data.hints, 0, 500) || 0;
      const progress = ok / total;
      return { progress, quality: progress * Math.max(0.5, 1 - 0.04 * hints), summary: ok + '/' + total + ' boxes' + (hints ? ' · ' + FP.plural(hints, 'hint') : '') };
    },
  },
  deduce: {
    arg: (seed, diff) => diff + '-' + seed,
    verify(seed, diff, data) {
      const pz = FP.makeLogic(seed, diff);
      const picks = arr(data.picks, pz.cats.length);
      let filled = 0, right = 0, total = 0;
      pz.cats.forEach((_, c) => pz.people.forEach((_, p) => {
        total++;
        const v = Array.isArray(picks[c]) ? picks[c][p] : -1;
        if (Number.isInteger(v) && v >= 0 && v < pz.people.length) { filled++; if (v === pz.solution[c][p]) right++; }
      }));
      const solved = right === total;
      // Live progress shows how much is FILLED IN (not how much is right), so progress can't be used to probe the answer.
      return { progress: filled / total, quality: solved ? 1 : 0.5 * (right / total), summary: solved ? 'Solved' : Math.round((right / total) * 100) + '% correct' };
    },
  },
  connections: {
    arg: (seed, diff) => diff + '-' + seed,
    verify(seed, diff, data) {
      const groups = FP.makeConnections(seed, diff);
      const lives = FP.CONN_LIVES[diff] || 4;
      const found = new Set(); let mistakes = 0;
      for (const a of arr(data.attempts, 30)) {
        if (found.size === 4 || mistakes >= lives) break;
        const set = new Set(words(a, 4).map((x) => x.toLowerCase()));
        if (set.size !== 4) continue;
        const g = groups.find((gr) => gr.items.every((it) => set.has(it.toLowerCase())));
        if (g && !found.has(g.name)) found.add(g.name); else mistakes++;
      }
      return { progress: found.size / 4, quality: (found.size / 4) * Math.max(0.4, 1 - 0.1 * mistakes), summary: found.size + '/4 groups · ' + FP.plural(mistakes, 'mistake') };
    },
  },
  orderit: {
    arg: (seed, diff) => diff + '-' + seed,
    verify(seed, diff, data) {
      const rounds = FP.makeOrderRounds(seed, 5, diff);
      const maxT = FP.ORDER_TRIES[diff] || 3;
      const att = arr(data.attempts, 5);
      let score = 0, done = 0;
      rounds.forEach((rd, i) => {
        const tries = arr(att[i], maxT).map((x) => words(x, 12));
        const t = tries.findIndex((x) => x.length === rd.answer.length && x.every((w, j) => w === rd.answer[j]));
        if (t >= 0) { score += maxT - t; done++; } else if (tries.length >= maxT) done++;
      });
      const max = maxT * rounds.length;
      return { progress: done / rounds.length, quality: score / max, summary: score + '/' + max + ' pts' };
    },
  },
  faithle: {
    arg: (seed) => String(seed % 100000),
    verify(seed, diff, data) {
      const answer = FP.faithleAnswer(seed % 100000);
      const guesses = words(data.guesses, 6).map((g) => g.toUpperCase()).filter((g) => /^[A-Z]{5}$/.test(g));
      const k = guesses.indexOf(answer);
      if (k >= 0) return { progress: 1, quality: (7 - (k + 1)) / 6, summary: 'Got it in ' + (k + 1) + '/6' };
      return { progress: guesses.length / 6, quality: 0, summary: guesses.length >= 6 ? 'Missed — ' + answer : FP.plural(guesses.length, 'guess').replace('guesss', 'guesses') };
    },
  },
};

/* ---------------- Host-side engine ---------------- */
class PuzzleEngine {
  constructor(srv) { this.srv = srv; this.minPlayers = 1; this.timers = []; this.round = 0; }
  later(fn, ms) { this.timers.push(setTimeout(fn, ms)); }
  clearTimers() { this.timers.forEach(clearTimeout); this.timers = []; }
  get spec() { return FP.PUZZLE_ROOM[this.srv.mode]; }
  start() { this.rounds = this.srv.settings.rounds; this.nextRound(); }
  nextRound() {
    this.clearTimers();
    this.round++;
    if (this.round > this.rounds) return this.srv.endGame();
    this.seed = FP.newSeed();
    this.diff = FP.DIFFS.includes(this.srv.settings.diff) ? this.srv.settings.diff : 'medium';
    this.partial = new Map();
    this.results = new Map();
    this.finishers = 0;
    this.phase = 'play';
    this.dur = this.srv.settings.time * 1000;
    this.t0 = Date.now();
    this.deadline = this.t0 + this.dur;
    this.later(() => this.endRound(), this.dur);
    this.srv.pushState();
  }
  onMessage(pid, m) {
    if (m.t === 'next' && this.srv.isHost(pid) && this.phase === 'reveal') return this.nextRound();
    if (m.t !== 'pz_state' || this.phase !== 'play' || m.r !== this.round || this.results.has(pid)) return;
    let r;
    try { r = this.spec.verify(this.seed, this.diff, m.data); } catch (e) { return; }
    this.partial.set(pid, r);
    if (m.done === true) this.finalize(pid, r, true);
    else this.srv.pushState();
  }
  finalize(pid, r, finished) {
    const rank = finished && r.quality > 0 ? ++this.finishers : 0;
    const speed = rank ? (speedBonus[rank - 1] != null ? speedBonus[rank - 1] : 0.5) : 0;
    const pts = r.quality > 0 ? Math.round(700 * r.quality + 300 * speed) : 0;
    if (pts) this.srv.addScore(pid, pts);
    this.results.set(pid, { summary: r.summary, pts, rank, secs: Math.round((Date.now() - this.t0) / 1000), finished });
    if (finished && !this.srv.solo) this.srv.sys('🏁 ' + this.srv.name(pid) + ' finished' + (rank ? ' #' + rank : '') + ' — ' + r.summary + (pts ? ' (+' + pts + ')' : ''), pts ? 'good' : 'sys');
    this.srv.pushPlayers();
    if (!this.ending && [...this.srv.players.keys()].every((id) => this.results.has(id))) this.endRound();
    else this.srv.pushState();
  }
  endRound() {
    if (this.phase !== 'play') return;
    this.ending = true;
    this.clearTimers();
    // Time's up: everyone still playing is scored on what they had (no speed bonus).
    for (const pid of this.srv.players.keys()) {
      if (!this.results.has(pid)) this.finalize(pid, this.partial.get(pid) || { progress: 0, quality: 0, summary: 'No answers' }, false);
    }
    this.ending = false;
    this.phase = 'reveal';
    this.srv.pushPlayers();
    this.srv.pushState();
    this.later(() => this.nextRound(), 12000);
  }
  onChat() { return false; }
  publicState() {
    const board = [...this.srv.players.keys()].map((id) => {
      const p = this.partial.get(id); const r = this.results.get(id);
      return { id, progress: Math.round(((p && p.progress) || 0) * 100), done: !!r, pts: r ? r.pts : 0, rank: r ? r.rank : 0, secs: r ? r.secs : 0, summary: r ? r.summary : null };
    });
    return { kind: 'puzzle', game: this.srv.mode, diff: this.diff, seed: this.seed, arg: this.spec.arg(this.seed, this.diff), round: this.round, rounds: this.rounds, phase: this.phase, dur: this.dur, remaining: Math.max(0, this.deadline - Date.now()), board };
  }
  onJoin() {}
  onLeave() { if (this.phase === 'play' && this.srv.players.size && [...this.srv.players.keys()].every((id) => this.results.has(id))) this.endRound(); }
  stop() { this.clearTimers(); }
}
FP.PuzzleEngine = PuzzleEngine;

/* ---------------- Room view ---------------- */
FP.views.puzzle = function (room) {
  let body, key = null, strip, holder, results, headEl;
  function renderStrip(g) {
    FP.clear(strip);
    g.board.slice().sort((a, b) => (b.done - a.done) || (a.rank || 99) - (b.rank || 99) || b.progress - a.progress).forEach((b) => {
      const name = b.id === room.me ? 'You' : room.nameOf(b.id);
      strip.append(h('div', { class: 'pz-row' + (b.done ? ' done' : '') + (b.id === room.me ? ' me' : '') },
        h('span', { class: 'pz-name', text: (b.rank ? '#' + b.rank + ' ' : '') + name }),
        h('div', { class: 'progress grow' }, h('i', { style: { width: (b.done ? 100 : b.progress) + '%' } })),
        h('span', { class: 'pz-meta', text: b.done ? (b.summary || 'Done') + (b.pts ? ' · +' + b.pts : '') : b.progress + '%' })));
    });
  }
  function renderResults(g) {
    FP.clear(results);
    results.hidden = g.phase !== 'reveal';
    if (g.phase !== 'reveal') return;
    const rows = g.board.slice().sort((a, b) => b.pts - a.pts);
    results.append(h('div', { class: 'reveal-box' }, h('b', { text: '⏱ Round ' + g.round + ' results' }),
      h('div', { class: 'results-row' }, rows.map((b) => h('span', { class: 'res-chip ' + (b.pts ? 'ok' : 'bad'), text: (b.id === room.me ? 'You' : room.nameOf(b.id)) + ' — ' + (b.summary || 'No answers') + ' · +' + b.pts }))),
      h('div', { class: 'small muted mt', text: g.round >= g.rounds ? 'Final scores coming up…' : 'Next puzzle starts in a few seconds…' })));
    if (room.isHost) results.append(h('div', { class: 'row mt', style: { justifyContent: 'flex-end' } }, h('button', { class: 'btn btn-primary', type: 'button', onclick: () => room.send({ t: 'next' }) }, g.round >= g.rounds ? 'See results 🏆' : 'Next puzzle ▶')));
  }
  return {
    mount(el) { body = el; },
    update(st) {
      const g = st.game;
      const k = g.round + ':' + g.seed;
      if (k !== key) {
        key = k;
        FP.clear(body);
        headEl = h('div');
        strip = h('div', { class: 'pz-strip' });
        results = h('div', { class: 'mb' });
        holder = h('div', { class: 'pz-holder' });
        body.append(headEl, strip, results, holder);
        const page = FP.pages[g.game];
        const round = g.round;
        page(holder, g.arg, { room: { report: (data, done) => room.send({ t: 'pz_state', r: round, data, done: !!done }) } });
      }
      const neu = FP.ui.stageHead(g.game, 'Round ' + g.round + ' of ' + g.rounds + ' · everyone has the same puzzle' + (g.game !== 'faithle' ? ' · ' + FP.DIFF_LABEL[g.diff] : ''), g.phase === 'play' ? g.remaining : null, g.dur);
      headEl.replaceWith(neu); headEl = neu;
      renderStrip(g);
      renderResults(g);
      holder.classList.toggle('locked', g.phase !== 'play');
    },
  };
};
})();
