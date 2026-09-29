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

// Branch weights: how many clues a solved box gives (1, 2 or 3).
const BRANCH = { chain: [1, 0, 0], multi: [0.45, 0.38, 0.17] };

FP.makeChain = function (seed, diff, style = 'chain') {
  index();
  const cfg = DIFF[diff] || DIFF.medium;
  const n = cfg.size; const N = n * n;
  const rnd = FP.rng(seed);
  const weights = BRANCH[style] || BRANCH.chain;
  const allowed = Object.values(ENT).filter((e) => cfg.tiers.includes(e.tier));
  if (allowed.length < N) allowed.push(...Object.values(ENT).filter((e) => !cfg.tiers.includes(e.tier)));
  const okIds = new Set(allowed.map((e) => e.id));

  const used = new Set(); const usedAns = new Set();
  const free = (id) => okIds.has(id) && !used.has(id) && answersOf(id).every((a) => !usedAns.has(FP.norm(a)));
  const take = (id) => { used.add(id); answersOf(id).forEach((a) => usedAns.add(FP.norm(a))); };
  const openCells = new Set([...Array(N).keys()]);

  // Pick a child entity: follow a relationship where possible so clues read like a story.
  function nextEntity(parentId) {
    const rel = (REL[parentId] || []).filter((r) => free(r.to));
    if (rel.length && rnd() < 0.85) { const r = FP.pick(rel, rnd); return { id: r.to, via: r.d }; }
    const pool = allowed.filter((e) => free(e.id));
    const withRel = pool.filter((e) => (REL[e.id] || []).some((r) => free(r.to)));
    return { id: FP.pick(withRel.length && rnd() < 0.7 ? withRel : pool, rnd).id, via: null };
  }
  // Pick a child cell: prefer boxes in line with the parent so directions stay natural.
  function nextCell(a) {
    const cand = [...openCells].map((b) => {
      const dr = Math.abs(Math.floor(b / n) - Math.floor(a / n)), dc = Math.abs((b % n) - (a % n));
      const inLine = dr === 0 || dc === 0 || dr === dc;
      return { b, w: inLine ? (Math.max(dr, dc) === 1 ? cfg.near * 1.5 : cfg.near) : 1 };
    });
    let t = rnd() * cand.reduce((sum, x) => sum + x.w, 0);
    for (const x of cand) { t -= x.w; if (t <= 0) return x.b; }
    return cand[cand.length - 1].b;
  }
  function branches() {
    const r = rnd(); let acc = 0;
    for (let k = 0; k < 3; k++) { acc += weights[k]; if (r < acc) return k + 1; }
    return 1;
  }

  // Grow a tree: every solved box reveals 1–3 clues, each pointing at a different box.
  const starters = allowed.filter((e) => (REL[e.id] || []).length >= 2);
  const rootId = FP.pick(starters.length ? starters : allowed, rnd).id;
  const rootCell = Math.floor(rnd() * N);
  const grid = Array(N);
  grid[rootCell] = rootId; take(rootId); openCells.delete(rootCell);
  const order = [rootCell];
  const clueFrom = {};
  const parentOf = {};
  const queue = [rootCell];
  let placed = 1;
  while (placed < N) {
    // Depth-first-ish: usually continue from the newest box, sometimes branch off an older one.
    const a = queue.length > 1 && rnd() < 0.3 ? queue.splice(Math.floor(rnd() * queue.length), 1)[0] : queue.pop();
    const k = Math.min(branches(), N - placed);
    clueFrom[a] = [];
    for (let j = 0; j < k; j++) {
      const { id, via } = nextEntity(grid[a]);
      const b = nextCell(a);
      grid[b] = id; take(id); openCells.delete(b);
      parentOf[b] = a; order.push(b); placed++;
      clueFrom[a].push({ to: b, text: direction(a, b, n) + ' is ' + (via || FP.pick(ENT[id].desc, rnd)) + '.' });
      queue.push(b);
    }
    if (!queue.length && placed < N) queue.push(order[order.length - 1]);
  }
  return { n, grid, root: rootCell, order, clueFrom, parentOf, style };
};

function chainPage(root, arg) {
  index();
  const parts = String(arg || '').split('-');
  let diff = parts[0];
  if (!DIFF[diff]) diff = FP.store.get('chain_diff', 'medium');
  let style = parts[2] === 'm' ? 'multi' : parts[2] === 'c' ? 'chain' : FP.store.get('chain_style', 'multi');
  const seed = parseInt(parts[1], 10);
  const base = '#/p/logic/';
  const link = (d, st, sd) => base + d + '-' + sd + '-' + (st === 'multi' ? 'm' : 'c');
  if (!Number.isInteger(seed) || seed < 0 || seed > 2 ** 31 || !parts[2]) { location.replace(link(diff, style, Number.isInteger(seed) ? seed : FP.newSeed())); return; }
  FP.store.set('chain_diff', diff);
  FP.store.set('chain_style', style);
  const cfg = DIFF[diff];
  const pz = FP.makeChain(seed, diff, style);
  const { n } = pz; const N = n * n;
  const solved = new Set([pz.root]);
  const easy = diff === 'easy';
  const shown = new Set();   // boxes whose target is highlighted (easy, or via hint)
  const letters = new Map(); // box -> letters revealed by hints
  let sel = null; let gaveUp = false; let hints = 0; let lastSolved = pz.root;
  const t0 = Date.now();
  let input;
  const label = (c) => rowName(Math.floor(c / n)) + ((c % n) + 1);
  // Open boxes = unsolved boxes whose clue-giver is solved.
  const openBoxes = () => pz.order.filter((c) => !solved.has(c) && solved.has(pz.parentOf[c]));
  const clueFor = (c) => pz.clueFrom[pz.parentOf[c]].find((x) => x.to === c);
  const autoSelect = () => { const o = openBoxes(); if (easy && o.length === 1) sel = o[0]; else if (!o.includes(sel)) sel = null; };
  autoSelect();

  function solve(c) {
    solved.add(c); lastSolved = c;
    FP.sound.play('good');
    sel = null;
    if (solved.size === N) { render(); finish(); return; }
    autoSelect();
    render();
  }
  function attempt(text, fuzzy) {
    if (gaveUp || !FP.norm(text)) return false;
    const open = openBoxes();
    const matches = (c, fz) => {
      const ans = answersOf(pz.grid[c]);
      if (ans.some((a) => FP.norm(a) === FP.norm(text))) return 'yes';
      return fz ? FP.checkAnswer(text, ans) : 'no';
    };
    if (sel != null && open.includes(sel)) {
      const r = matches(sel, fuzzy);
      if (r === 'yes') { solve(sel); return true; }
      if (!fuzzy) return false;
      if (open.some((c) => c !== sel && matches(c, true) === 'yes')) { FP.toast('Right answer — but it belongs in a different box! Re-read the directions.', 'bad'); FP.sound.play('bad'); return false; }
      FP.toast(r === 'close' ? 'So close — check the spelling.' : 'Not quite. Try again!', r === 'close' ? '' : 'bad');
      if (r !== 'close') FP.sound.play('bad');
      return false;
    }
    if (!fuzzy) return false;
    if (open.some((c) => matches(c, true) === 'yes')) FP.toast(sel == null ? 'Right answer! Now click the box its clue points to.' : 'Right answer — but wrong box! Re-read the directions.', 'bad');
    else FP.toast('Not quite. Pick an open clue, click its box, then type.', 'bad');
    FP.sound.play('bad');
    return false;
  }
  function finish() {
    const secs = Math.round((Date.now() - t0) / 1000);
    FP.sound.play('win');
    FP.store.set('chain_solved', FP.store.get('chain_solved', 0) + 1);
    const time = Math.floor(secs / 60) + 'm ' + (secs % 60) + 's';
    const text = 'I solved Hallelujoy Clue Chain #' + seed + ' (' + cfg.label + (style === 'multi' ? ', branching' : '') + ', ' + N + ' boxes) in ' + time + ' with ' + FP.plural(hints, 'hint') + '!\n' + location.href;
    FP.modal(h('div', { class: 'stack center' }, h('div', { class: 'big-emoji', text: '⛓️' }), h('h2', { text: 'Grid complete!' }),
      h('p', { class: 'muted', text: N + ' boxes in ' + time + ' · ' + FP.plural(hints, 'hint') }),
      h('div', { class: 'row', style: { justifyContent: 'center' } },
        h('button', { class: 'btn', type: 'button', onclick: () => FP.copy(text) }, '📋 Copy result'),
        h('button', { class: 'btn', type: 'button', onclick: () => FP.share('Can you solve this Hallelujoy Clue Chain?', location.href) }, '🔗 Challenge a friend'),
        h('a', { class: 'btn btn-primary', href: link(diff, style, FP.newSeed()) }, 'Next puzzle ▶'))));
  }
  function hint() {
    const open = openBoxes();
    if (!open.length) return;
    // Hint the selected open box, else the oldest open clue.
    const c = open.includes(sel) ? sel : open[0];
    const len = ENT[pz.grid[c]].name.replace(/[^a-z]/gi, '').length;
    if (!easy && !shown.has(c)) { shown.add(c); hints++; FP.toast('Box ' + label(c) + ' is highlighted — that\'s where this clue points.'); }
    else if ((letters.get(c) || 0) < len - 1) { letters.set(c, (letters.get(c) || 0) + 1); hints++; }
    else FP.toast('No more hints for that box!');
    render();
  }
  function pattern(c) {
    let k = 0; const lim = letters.get(c) || 0;
    return ENT[pz.grid[c]].name.split('').map((ch) => (/[a-z]/i.test(ch) ? (++k <= lim ? ch.toUpperCase() : '_') : ch === ' ' ? ' ' : ch)).join(' ');
  }

  function render() {
    const val = input ? input.value : '';
    FP.clear(root);
    const card = h('div', { class: 'card stage' });
    card.append(FP.ui.stageHead('logic', 'Puzzle #' + seed + ' · ' + n + '×' + n, null, null,
      h('div', { class: 'row', style: { gap: '6px' } },
        h('div', { class: 'seg', title: 'Clue style' },
          h('a', { class: style === 'chain' ? 'on' : '', href: link(diff, 'chain', FP.newSeed()), title: 'Every box gives one clue' }, 'Chain'),
          h('a', { class: style === 'multi' ? 'on' : '', href: link(diff, 'multi', FP.newSeed()), title: 'Some boxes give 2–3 clues' }, 'Branching')),
        h('div', { class: 'seg', title: 'Difficulty' }, Object.keys(DIFF).map((d) => h('a', { class: d === diff ? 'on' : '', href: link(d, style, FP.newSeed()) }, DIFF[d].label))))));
    card.append(h('p', { class: 'small muted mb', text: 'Start at the gold box. Each solved box tells you where another box is and who (or what) is in it' +
      (style === 'multi' ? ' — some boxes give 2 or 3 clues at once, so you can solve open boxes in any order' : '') +
      '. Click the box a clue points to, type the answer, and keep going. ' + cfg.note }));

    // Open clues
    const open = openBoxes();
    const list = h('div', { class: 'q-card chain-latest mb' });
    if (gaveUp) list.append(h('div', { class: 'q-prompt', text: 'Answers revealed — try a new puzzle!' }));
    else if (!open.length) list.append(h('div', { class: 'q-prompt', text: '🎉 Every box solved!' }));
    else {
      list.append(h('div', { class: 'q-cat', text: open.length === 1 ? 'Open clue' : open.length + ' open clues — solve them in any order' }));
      const ordered = open.slice().sort((x, y) => (pz.parentOf[y] === lastSolved) - (pz.parentOf[x] === lastSolved));
      const wrap = h('div', { class: 'chain-clues' });
      list.append(wrap);
      ordered.forEach((c) => {
        const e = ENT[pz.grid[c]];
        const from = pz.parentOf[c];
        const meta = [];
        if (diff !== 'hard') meta.push(FP.CHAIN_TYPES[e.type].icon + ' ' + FP.CHAIN_TYPES[e.type].label);
        if (easy || letters.get(c)) meta.push(pattern(c));
        const isSel = sel === c;
        wrap.append(h('button', { type: 'button', class: 'chain-clue' + (isSel ? ' on' : '') + (pz.parentOf[c] === lastSolved ? ' new' : '') + (easy || shown.has(c) ? ' can-pick' : ''),
          title: easy || shown.has(c) ? 'Select box ' + label(c) : 'Find the box this clue points to on the grid',
          onclick: () => { if (easy || shown.has(c)) { sel = c; render(); } else FP.toast('Work out which box this clue points to, then click it on the grid.'); } },
          h('span', { class: 'tiny muted', text: 'From ' + label(from) + ' · ' + ENT[pz.grid[from]].name }),
          h('div', { class: 'q-prompt', text: clueFor(c).text }),
          meta.length ? h('div', { class: 'q-sub', text: meta.join('   ·   ') }) : null,
          isSel ? h('span', { class: 'chip primary', text: 'Box ' + label(c) + ' selected' }) : null));
      });
    }
    card.append(list);

    input = h('input', { class: 'input', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Answer', disabled: gaveUp || !open.length,
      placeholder: sel == null ? 'Click the box a clue points to, then type…' : 'Answer for box ' + label(sel) + '…' });
    input.value = val;
    input.addEventListener('input', () => { if (attempt(input.value, false)) input.value = ''; });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); if (attempt(input.value, true)) input.value = ''; } });
    card.append(h('div', { class: 'row mb', style: { flexWrap: 'nowrap' } }, input,
      h('span', { class: 'chip primary', text: solved.size + '/' + N }),
      h('button', { class: 'btn btn-sm', type: 'button', disabled: gaveUp || !open.length, onclick: hint }, '💡 Hint'),
      h('button', { class: 'btn btn-sm btn-ghost', type: 'button', disabled: gaveUp || !open.length, onclick: () => { if (confirm('Give up and reveal every box?')) { gaveUp = true; render(); } } }, 'Give up')));

    const grid = h('div', { class: 'chain-grid', style: { '--n': String(n) } });
    for (let c = 0; c < N; c++) {
      const e = ENT[pz.grid[c]];
      const isSolved = solved.has(c);
      const cls = ['chain-cell'];
      if (isSolved) cls.push('open');
      if (c === pz.root) cls.push('start');
      if (gaveUp && !isSolved) cls.push('missed');
      if (!isSolved && c === sel) cls.push('sel');
      if (!isSolved && open.includes(c) && (easy || shown.has(c))) cls.push('target');
      const kids = [h('span', { class: 'ct', text: label(c) })];
      if (isSolved || gaveUp) {
        kids.push(h('b', { text: e.name }));
        const cl = pz.clueFrom[c] || [];
        if (isSolved && cl.length > 1) kids.push(h('span', { class: 'ct', text: cl.length + ' clues' }));
        if (isSolved) cl.forEach((x) => kids.push(h('span', { class: 'cc' + (solved.has(x.to) ? ' done' : ''), text: x.text })));
      } else kids.push(h('span', { class: 'cq', text: '?' }));
      grid.append(h('button', { type: 'button', class: cls.join(' '), 'aria-label': 'Box ' + label(c), onclick: () => {
        if (isSolved || gaveUp || !open.length) return;
        sel = c; FP.sound.play('tick'); render(); input.focus();
      } }, kids));
    }
    card.append(h('div', { class: 'chain-scroll' }, grid));
    card.append(h('div', { class: 'row mt' },
      h('a', { class: 'btn btn-primary', href: link(diff, style, FP.newSeed()) }, '🔄 New puzzle'),
      h('button', { class: 'btn', type: 'button', onclick: () => FP.share('Can you solve this Hallelujoy Clue Chain?', location.href) }, '🔗 Share this puzzle')));
    root.append(card);
    if (sel != null) setTimeout(() => input.focus(), 0);
  }
  render();
}
FP.pages.logic = chainPage;
FP.pages.chain = chainPage;
})();
