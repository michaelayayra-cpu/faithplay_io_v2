/* Clue Chain Grid — Sporcle "click grid" style.
   One box starts solved. Every solved box gives a clue pointing to another box
   ("Directly below me is my older sister"). Click that box, type the answer, and
   its own clue appears — follow the chain until the grid is full. Seeded & shareable. */
'use strict';
(() => {
const { h } = FP;
FP.pages = FP.pages || {};

const DIFF = {
  easy: { size: 3, tiers: [1], near: 6, label: 'Easy', note: 'The box each clue points to is highlighted, and you see the answer type.' },
  medium: { size: 4, tiers: [1, 2], near: 3, label: 'Medium', note: 'Work out which box each clue points to. Answer types are shown.' },
  hard: { size: 5, tiers: [1, 2, 3], near: 1.5, label: 'Hard', note: 'Bigger grid, deeper cuts, no type hints.' },
};
const NUM = ['', '', 'Two', 'Three', 'Four'];
const rowName = (r) => String.fromCharCode(65 + r);

let ENT = null; let REL = null;
function index() {
  if (ENT) return;
  ENT = {}; REL = {};
  FP.CHAIN_ENT.forEach(([id, name, type, tier, desc, acc]) => {
    ENT[id] = { id, name, type, tier, desc: desc.split('|').filter(Boolean), acc: (acc || '').split('|').filter(Boolean) };
  });
  FP.CHAIN_REL.forEach(([a, b, d]) => { if (ENT[a] && ENT[b]) (REL[a] = REL[a] || []).push({ to: b, d }); });
}
const answersOf = (id) => [ENT[id].name, ...ENT[id].acc];

// Where is cell b, seen from cell a?  Returns a sentence opener.
function direction(a, b, n) {
  const [r1, c1] = [Math.floor(a / n), a % n];
  const [r2, c2] = [Math.floor(b / n), b % n];
  const dr = r2 - r1, dc = c2 - c1;
  const steps = (k) => (k === 1 ? '' : NUM[k] + ' boxes ');
  if (dc === 0) return (dr > 0 ? (dr === 1 ? 'Directly below me' : steps(dr) + 'below me') : (dr === -1 ? 'Directly above me' : steps(-dr) + 'above me'));
  if (dr === 0) return (dc > 0 ? (dc === 1 ? 'Directly to my right' : steps(dc) + 'to my right') : (dc === -1 ? 'Directly to my left' : steps(-dc) + 'to my left'));
  if (Math.abs(dr) === Math.abs(dc)) {
    const k = Math.abs(dr);
    return (k === 1 ? 'Diagonally ' : NUM[k] + ' boxes diagonally ') + (dr > 0 ? 'down' : 'up') + ' and to the ' + (dc > 0 ? 'right' : 'left') + ' of me';
  }
  return 'Box ' + rowName(r2) + (c2 + 1);
}

FP.makeChain = function (seed, diff) {
  index();
  const cfg = DIFF[diff] || DIFF.medium;
  const n = cfg.size; const N = n * n;
  const rnd = FP.rng(seed);
  const allowed = Object.values(ENT).filter((e) => cfg.tiers.includes(e.tier));
  if (allowed.length < N) allowed.push(...Object.values(ENT).filter((e) => !cfg.tiers.includes(e.tier)));
  const okIds = new Set(allowed.map((e) => e.id));

  // 1) Entity sequence: follow relationships where possible, so clues read like a story.
  const used = new Set(); const usedAns = new Set();
  const free = (id) => okIds.has(id) && !used.has(id) && answersOf(id).every((a) => !usedAns.has(FP.norm(a)));
  const take = (id) => { used.add(id); answersOf(id).forEach((a) => usedAns.add(FP.norm(a))); };
  const starters = allowed.filter((e) => (REL[e.id] || []).length >= 2);
  let cur = FP.pick(starters.length ? starters : allowed, rnd).id;
  const seq = [cur]; take(cur);
  const links = [];
  while (seq.length < N) {
    const rel = (REL[cur] || []).filter((r) => free(r.to));
    let next, via = null;
    if (rel.length && rnd() < 0.85) { const r = FP.pick(rel, rnd); next = r.to; via = r.d; }
    else {
      const pool = allowed.filter((e) => free(e.id));
      const withRel = pool.filter((e) => (REL[e.id] || []).some((r) => free(r.to) && r.to !== e.id));
      next = FP.pick(withRel.length && rnd() < 0.7 ? withRel : pool, rnd).id;
    }
    links.push(via);
    seq.push(next); take(next); cur = next;
  }

  // 2) Cell walk: prefer boxes in line with the current one so directions stay natural.
  const cells = [Math.floor(rnd() * N)];
  const open = new Set([...Array(N).keys()].filter((c) => c !== cells[0]));
  while (open.size) {
    const a = cells[cells.length - 1];
    const cand = [...open].map((b) => {
      const dr = Math.abs(Math.floor(b / n) - Math.floor(a / n)), dc = Math.abs((b % n) - (a % n));
      const inLine = dr === 0 || dc === 0 || dr === dc;
      const w = inLine ? (Math.max(dr, dc) === 1 ? cfg.near * 1.5 : cfg.near) : 1;
      return { b, w };
    });
    let t = rnd() * cand.reduce((s, x) => s + x.w, 0);
    let pickB = cand[cand.length - 1].b;
    for (const x of cand) { t -= x.w; if (t <= 0) { pickB = x.b; break; } }
    cells.push(pickB); open.delete(pickB);
  }

  // 3) Build the grid and the clue each solved box gives.
  const grid = Array(N);
  cells.forEach((c, i) => { grid[c] = seq[i]; });
  const clueFrom = {};
  for (let i = 0; i < N - 1; i++) {
    const a = cells[i], b = cells[i + 1];
    const target = ENT[seq[i + 1]];
    const what = links[i] || FP.pick(target.desc, rnd);
    clueFrom[a] = { to: b, text: direction(a, b, n) + ' is ' + what + '.' };
  }
  return { n, grid, order: cells, clueFrom };
};

function chainPage(root, arg) {
  index();
  let [diff, seedStr] = String(arg || '').split('-');
  if (!DIFF[diff]) diff = FP.store.get('chain_diff', 'medium');
  const seed = parseInt(seedStr, 10);
  const base = '#/p/logic/';
  if (!Number.isInteger(seed) || seed < 0 || seed > 2 ** 31) { location.replace(base + diff + '-' + FP.newSeed()); return; }
  FP.store.set('chain_diff', diff);
  const cfg = DIFF[diff];
  const pz = FP.makeChain(seed, diff);
  const { n } = pz; const N = n * n;
  const solved = new Set([pz.order[0]]);
  let pending = pz.clueFrom[pz.order[0]].to; // the box the latest clue points to
  let sel = diff === 'easy' ? pending : null;
  let gaveUp = false; let hints = 0; let letters = 0; let showTarget = diff === 'easy';
  const t0 = Date.now();
  let input;
  const label = (c) => rowName(Math.floor(c / n)) + ((c % n) + 1);
  const latestFrom = () => pz.order[solved.size - 1];

  function solve() {
    solved.add(pending);
    FP.sound.play('good');
    if (solved.size === N) { pending = null; sel = null; render(); finish(); return; }
    pending = pz.clueFrom[pending].to;
    letters = 0; showTarget = diff === 'easy';
    sel = diff === 'easy' ? pending : null;
    render();
  }
  function attempt(text, fuzzy) {
    if (gaveUp || pending == null || !FP.norm(text)) return false;
    const ans = answersOf(pz.grid[pending]);
    const exact = ans.some((a) => FP.norm(a) === FP.norm(text));
    const res = exact ? 'yes' : fuzzy ? FP.checkAnswer(text, ans) : 'no';
    if (res === 'yes') {
      if (sel !== pending) {
        if (!fuzzy) return false; // wait for Enter before telling them off
        FP.toast(sel == null ? 'Right answer! Now click the box the clue points to.' : 'Right answer — but wrong box! Re-read the direction.', 'bad');
        FP.sound.play('bad');
        return false;
      }
      solve();
      return true;
    }
    if (fuzzy) { FP.toast(res === 'close' ? 'So close — check the spelling.' : 'Not quite. Try again!', res === 'close' ? '' : 'bad'); if (res !== 'close') FP.sound.play('bad'); }
    return false;
  }
  function finish() {
    const secs = Math.round((Date.now() - t0) / 1000);
    FP.sound.play('win');
    FP.store.set('chain_solved', FP.store.get('chain_solved', 0) + 1);
    const time = Math.floor(secs / 60) + 'm ' + (secs % 60) + 's';
    const text = 'I solved Hallelujoy Clue Chain #' + seed + ' (' + cfg.label + ', ' + N + ' boxes) in ' + time + ' with ' + FP.plural(hints, 'hint') + '!\n' + location.href;
    FP.modal(h('div', { class: 'stack center' }, h('div', { class: 'big-emoji', text: '⛓️' }), h('h2', { text: 'Grid complete!' }),
      h('p', { class: 'muted', text: N + ' boxes in ' + time + ' · ' + FP.plural(hints, 'hint') }),
      h('div', { class: 'row', style: { justifyContent: 'center' } },
        h('button', { class: 'btn', type: 'button', onclick: () => FP.copy(text) }, '📋 Copy result'),
        h('button', { class: 'btn', type: 'button', onclick: () => FP.share('Can you solve this Hallelujoy Clue Chain?', location.href) }, '🔗 Challenge a friend'),
        h('a', { class: 'btn btn-primary', href: base + diff + '-' + FP.newSeed() }, 'Next puzzle ▶'))));
  }
  function hint() {
    if (pending == null) return;
    hints++;
    if (!showTarget) { showTarget = true; FP.toast('The highlighted box is where the clue points.'); }
    else if (letters < ENT[pz.grid[pending]].name.replace(/[^a-z]/gi, '').length - 1) letters++;
    else { FP.toast('No more hints for this box!'); hints--; }
    render();
  }
  function pattern(id) {
    let k = 0;
    return ENT[id].name.split('').map((ch) => (/[a-z]/i.test(ch) ? (++k <= letters ? ch.toUpperCase() : '_') : ch === ' ' ? ' ' : ch)).join(' ');
  }

  function render() {
    const val = input ? input.value : '';
    FP.clear(root);
    const card = h('div', { class: 'card stage' });
    card.append(FP.ui.stageHead('logic', 'Puzzle #' + seed + ' · ' + n + '×' + n, null, null,
      h('div', { class: 'seg' }, Object.keys(DIFF).map((d) => h('a', { class: d === diff ? 'on' : '', href: base + d + '-' + FP.newSeed() }, DIFF[d].label)))));
    card.append(h('p', { class: 'small muted mb', text: 'Start at the gold box. Each solved box tells you where the next one is and who (or what) is in it. Click that box, type the answer, and keep following the chain. ' + cfg.note }));

    // Latest clue, big
    const pend = pending != null ? ENT[pz.grid[pending]] : null;
    const latest = h('div', { class: 'q-card chain-latest mb' });
    if (gaveUp) latest.append(h('div', { class: 'q-prompt', text: 'Answers revealed — try a new puzzle!' }));
    else if (pend) {
      latest.append(h('div', { class: 'q-cat', text: 'Clue from box ' + label(latestFrom()) + ' · ' + ENT[pz.grid[latestFrom()]].name }),
        h('div', { class: 'q-prompt', text: pz.clueFrom[latestFrom()].text }));
      const meta = [];
      if (diff !== 'hard') meta.push(FP.CHAIN_TYPES[pend.type].icon + ' ' + FP.CHAIN_TYPES[pend.type].label);
      if (letters || diff === 'easy') meta.push(pattern(pend.id));
      if (meta.length) latest.append(h('div', { class: 'q-sub', text: meta.join('   ·   ') }));
    } else latest.append(h('div', { class: 'q-prompt', text: '🎉 Every box solved!' }));
    card.append(latest);

    input = h('input', { class: 'input', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Answer', disabled: gaveUp || pending == null,
      placeholder: sel == null ? 'Click the box the clue points to, then type…' : 'Answer for box ' + label(sel) + '…' });
    input.value = val;
    input.addEventListener('input', () => { if (attempt(input.value, false)) input.value = ''; });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); if (attempt(input.value, true)) input.value = ''; } });
    card.append(h('div', { class: 'row mb', style: { flexWrap: 'nowrap' } }, input,
      h('span', { class: 'chip primary', text: solved.size + '/' + N }),
      h('button', { class: 'btn btn-sm', type: 'button', disabled: gaveUp || pending == null, onclick: hint }, '💡 Hint'),
      h('button', { class: 'btn btn-sm btn-ghost', type: 'button', disabled: gaveUp || pending == null, onclick: () => { if (confirm('Give up and reveal every box?')) { gaveUp = true; render(); } } }, 'Give up')));

    const grid = h('div', { class: 'chain-grid', style: { '--n': String(n) } });
    for (let c = 0; c < N; c++) {
      const e = ENT[pz.grid[c]];
      const isSolved = solved.has(c);
      const cls = ['chain-cell'];
      if (isSolved) cls.push('open');
      if (c === pz.order[0]) cls.push('start');
      if (gaveUp && !isSolved) cls.push('missed');
      if (!isSolved && c === sel) cls.push('sel');
      if (!isSolved && showTarget && c === pending) cls.push('target');
      const kids = [h('span', { class: 'ct', text: label(c) })];
      if (isSolved || gaveUp) {
        kids.push(h('b', { text: e.name }));
        if (pz.clueFrom[c] && isSolved) kids.push(h('span', { class: 'cc', text: pz.clueFrom[c].text }));
      } else kids.push(h('span', { class: 'cq', text: '?' }));
      grid.append(h('button', { type: 'button', class: cls.join(' '), 'aria-label': 'Box ' + label(c), onclick: () => {
        if (isSolved || gaveUp || pending == null) return;
        sel = c; FP.sound.play('tick'); render(); input.focus();
      } }, kids));
    }
    card.append(h('div', { class: 'chain-scroll' }, grid));
    card.append(h('div', { class: 'row mt' },
      h('a', { class: 'btn btn-primary', href: base + diff + '-' + FP.newSeed() }, '🔄 New puzzle'),
      h('button', { class: 'btn', type: 'button', onclick: () => FP.share('Can you solve this Hallelujoy Clue Chain?', location.href) }, '🔗 Share this puzzle')));
    root.append(card);
    if (sel != null) setTimeout(() => input.focus(), 0);
  }
  render();
}
FP.pages.logic = chainPage;
FP.pages.chain = chainPage;
})();
