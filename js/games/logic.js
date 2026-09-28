/* Logic Grid — procedurally generated deduction puzzles with a guaranteed unique
   solution. Seeded, so a link reproduces exactly the same puzzle for a friend. */
'use strict';
(() => {
const { h } = FP;
FP.pages = FP.pages || {};

function perms(n) {
  const out = [];
  const rec = (arr, rest) => { if (!rest.length) return out.push(arr); rest.forEach((x, i) => rec(arr.concat(x), rest.slice(0, i).concat(rest.slice(i + 1)))); };
  rec([], [...Array(n).keys()]);
  return out;
}
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

FP.makeLogic = function (seed, diff) {
  const rnd = FP.rng(seed);
  const theme = FP.pick(FP.LOGIC_THEMES, rnd);
  const n = diff === 'hard' ? 5 : 4;
  const nCats = diff === 'medium' ? 3 : 2;
  const people = FP.sample(theme.who.items, n, rnd);
  const numeric = theme.cats.find((c) => c.numeric);
  const others = FP.sample(theme.cats.filter((c) => !c.numeric), nCats - 1, rnd);
  const cats = [numeric, ...others].map((c) => {
    let items;
    if (c.numeric) { const start = Math.floor(rnd() * (c.items.length - n + 1)); items = c.items.slice(start, start + n); }
    else items = FP.sample(c.items, n, rnd);
    return Object.assign({}, c, { items });
  });
  const P = perms(n);
  const solIdx = cats.map(() => Math.floor(rnd() * P.length));
  // Candidate space: every combination of permutations.
  const all = [];
  const rec = (acc) => { if (acc.length === cats.length) return all.push(acc); for (let i = 0; i < P.length; i++) rec(acc.concat(i)); };
  rec([]);

  const attr = (cand, c, person) => P[cand[c]][person];
  const who = (cand, c, v) => P[cand[c]].indexOf(v);
  const resolve = (cand, ref) => (ref.p != null ? ref.p : who(cand, ref.c, ref.v));
  const refText = (ref) => (ref.p != null ? people[ref.p] : cats[ref.c].ref.replace('{x}', cats[ref.c].items[ref.v]));
  const has = (c, v) => cats[c].has.replace('{x}', cats[c].items[v]);
  const not = (c, v) => cats[c].not.replace('{x}', cats[c].items[v]);

  function randomRef(avoidCat) {
    if (rnd() < 0.55) return { p: Math.floor(rnd() * n) };
    const cs = cats.map((_, i) => i).filter((i) => i !== avoidCat);
    const c = FP.pick(cs, rnd);
    return { c, v: Math.floor(rnd() * n) };
  }
  const sameEntity = (a, b, sol) => resolve(sol, a) === resolve(sol, b);

  function makeClue() {
    const sol = solIdx;
    const r = rnd();
    if (r < 0.3) { // negative
      const c = Math.floor(rnd() * cats.length);
      const A = randomRef(c);
      const pa = resolve(sol, A);
      const wrong = FP.pick([...Array(n).keys()].filter((v) => v !== attr(sol, c, pa)), rnd);
      return { text: cap(refText(A)) + ' ' + not(c, wrong) + '.', test: (cand) => attr(cand, c, resolve(cand, A)) !== wrong };
    }
    if (r < 0.42) { // positive
      const c = Math.floor(rnd() * cats.length);
      const A = randomRef(c);
      const v = attr(sol, c, resolve(sol, A));
      return { text: cap(refText(A)) + ' ' + has(c, v) + '.', test: (cand) => attr(cand, c, resolve(cand, A)) === v };
    }
    if (r < 0.64) { // comparison on numeric category 0
      const A = randomRef(0), B = randomRef(0);
      if (sameEntity(A, B, sol)) return null;
      const a = attr(sol, 0, resolve(sol, A)), b = attr(sol, 0, resolve(sol, B));
      const [X, Y] = a > b ? [A, B] : [B, A];
      const word = rnd() < 0.5 ? 'more' : 'less';
      if (word === 'more') return { text: cap(refText(X)) + ' ' + cats[0].more + ' ' + refText(Y) + '.', test: (cand) => attr(cand, 0, resolve(cand, X)) > attr(cand, 0, resolve(cand, Y)) };
      return { text: cap(refText(Y)) + ' ' + cats[0].less + ' ' + refText(X) + '.', test: (cand) => attr(cand, 0, resolve(cand, Y)) < attr(cand, 0, resolve(cand, X)) };
    }
    if (r < 0.74) { // exactly one step
      const p1 = Math.floor(rnd() * n);
      const v1 = attr(sol, 0, p1);
      if (v1 === 0) return null;
      const p2 = who(sol, 0, v1 - 1);
      const refFor = (p) => { if (rnd() < 0.5) return { p }; const c = 1 + Math.floor(rnd() * (cats.length - 1)); return { c, v: attr(sol, c, p) }; };
      const X = refFor(p1), Y = refFor(p2);
      return { text: cap(refText(X)) + ' ' + cats[0].next + ' ' + refText(Y) + '.', test: (cand) => attr(cand, 0, resolve(cand, X)) === attr(cand, 0, resolve(cand, Y)) + 1 };
    }
    if (r < 0.88) { // either/or
      const c = 1 + Math.floor(rnd() * (cats.length - 1));
      const v = Math.floor(rnd() * n);
      const truth = who(sol, c, v);
      const other = FP.pick([...Array(n).keys()].filter((p) => p !== truth), rnd);
      const pair = rnd() < 0.5 ? [truth, other] : [other, truth];
      return { text: cap(cats[c].ref.replace('{x}', cats[c].items[v])) + ' is either ' + people[pair[0]] + ' or ' + people[pair[1]] + '.', test: (cand) => { const p = who(cand, c, v); return p === pair[0] || p === pair[1]; } };
    }
    // "Of X and Y, one ... and the other ..."
    const x = Math.floor(rnd() * n);
    const y = FP.pick([...Array(n).keys()].filter((p) => p !== x), rnd);
    const c1 = Math.floor(rnd() * cats.length), c2 = Math.floor(rnd() * cats.length);
    const v1 = attr(sol, c1, x), v2 = attr(sol, c2, y);
    const [a, b] = rnd() < 0.5 ? [x, y] : [y, x];
    return { text: 'Of ' + people[a] + ' and ' + people[b] + ', one ' + has(c1, v1) + ' and the other ' + has(c2, v2) + '.', test: (cand) => (attr(cand, c1, x) === v1 && attr(cand, c2, y) === v2) || (attr(cand, c1, y) === v1 && attr(cand, c2, x) === v2) };
  }

  let cands = all;
  let clues = [];
  for (let guard = 0; cands.length > 1 && guard < 800; guard++) {
    const cl = makeClue();
    if (!cl || clues.some((c) => c.text === cl.text)) continue;
    const next = cands.filter(cl.test);
    if (next.length < cands.length && next.length >= 1) { clues.push(cl); cands = next; }
  }
  // Remove redundant clues so every clue matters.
  for (const cl of FP.shuffle(clues, rnd)) {
    const rest = clues.filter((c) => c !== cl);
    let count = 0;
    for (const cand of all) { if (rest.every((c) => c.test(cand))) { count++; if (count > 1) break; } }
    if (count === 1) clues = rest;
  }
  return {
    theme, people, cats, clues: FP.shuffle(clues.map((c) => c.text), rnd),
    solution: cats.map((_, c) => people.map((_, p) => attr(solIdx, c, p))),
  };
};

FP.pages.deduce = function (root, arg) {
  let [diff, seedStr] = String(arg || '').split('-');
  if (!['easy', 'medium', 'hard'].includes(diff)) diff = FP.store.get('logic_diff', 'medium');
  let seed = parseInt(seedStr, 10);
  if (!Number.isInteger(seed) || seed < 0 || seed > 2 ** 31) { location.replace('#/p/deduce/' + diff + '-' + FP.newSeed()); return; }
  FP.store.set('logic_diff', diff);

  const t0 = Date.now();
  const pz = FP.makeLogic(seed, diff);
  const n = pz.people.length;
  const marks = pz.cats.map(() => pz.people.map(() => Array(n).fill('')));
  const used = new Set();
  let solved = false;

  function set(c, p, v, val) {
    marks[c][p][v] = val;
    if (val === 'o') {
      for (let i = 0; i < n; i++) { if (i !== v && marks[c][p][i] !== 'o') marks[c][p][i] = 'x'; if (i !== p && marks[c][i][v] !== 'o') marks[c][i][v] = 'x'; }
    }
  }
  function check() {
    let complete = true; let wrong = 0;
    pz.cats.forEach((cat, c) => pz.people.forEach((_, p) => {
      const o = marks[c][p].indexOf('o');
      if (o < 0 || marks[c][p].filter((m) => m === 'o').length > 1) complete = false;
      else if (o !== pz.solution[c][p]) wrong++;
      if (marks[c][p][pz.solution[c][p]] === 'x') wrong++;
    }));
    if (complete && !wrong) {
      solved = true;
      const secs = Math.round((Date.now() - t0) / 1000);
      FP.sound.play('win');
      FP.modal(h('div', { class: 'stack center' }, h('div', { class: 'big-emoji', text: '🧠' }), h('h2', { text: 'Solved!' }), h('p', { class: 'muted', text: 'You cracked it in ' + Math.floor(secs / 60) + 'm ' + (secs % 60) + 's.' }),
        h('div', { class: 'row', style: { justifyContent: 'center' } }, h('button', { class: 'btn', type: 'button', onclick: () => FP.share('Can you solve this Hallelujoy logic puzzle?', location.href) }, '🔗 Challenge a friend'), h('a', { class: 'btn btn-primary', href: '#/p/deduce/' + diff + '-' + FP.newSeed() }, 'Next puzzle ▶'))));
      const best = FP.store.get('logic_solved', 0); FP.store.set('logic_solved', best + 1);
    } else if (wrong) { FP.sound.play('bad'); FP.toast('Something doesn\'t add up — ' + FP.plural(wrong, 'mark') + ' conflict with the solution.', 'bad'); }
    else FP.toast('Not finished yet — each row needs one ✓ in every grid.');
  }

  function render() {
    FP.clear(root);
    const card = h('div', { class: 'card stage' });
    card.append(FP.ui.stageHead('deduce', pz.theme.icon + ' ' + pz.theme.title + ' · puzzle #' + seed, null, null,
      h('div', { class: 'seg' }, ['easy', 'medium', 'hard'].map((d) => h('button', { type: 'button', class: d === diff ? 'on' : '', onclick: () => { location.hash = '#/p/deduce/' + d + '-' + FP.newSeed(); } }, cap(d))))));
    card.append(h('p', { class: 'muted small mb', text: pz.theme.intro + ' Use the clues to match each ' + pz.theme.who.label.toLowerCase() + ' with one of each item. Tap a square once for ✗ (no), twice for ✓ (yes).' }));
    const cl = h('ol', { class: 'clue-list' });
    pz.clues.forEach((t, i) => cl.append(h('li', { class: used.has(i) ? 'used' : '', title: 'Tap to cross off', onclick: () => { if (used.has(i)) used.delete(i); else used.add(i); render(); } }, t)));
    const grids = h('div', { class: 'grids' });
    pz.cats.forEach((cat, c) => {
      const tbl = h('table', { class: 'lgrid' }, h('caption', { text: cat.label }));
      tbl.append(h('tr', null, h('th'), cat.items.map((it) => h('th', { class: 'colh', text: it }))));
      pz.people.forEach((person, p) => {
        tbl.append(h('tr', null, h('th', { class: 'rowh', text: person }), cat.items.map((it, v) => {
          const m = marks[c][p][v];
          return h('td', null, h('button', { type: 'button', class: m, 'aria-label': person + ' / ' + it + ': ' + (m === 'o' ? 'yes' : m === 'x' ? 'no' : 'unknown'), onclick: () => {
            if (solved) return;
            set(c, p, v, m === '' ? 'x' : m === 'x' ? 'o' : '');
            FP.sound.play('tick'); render();
          } }, m === 'o' ? '✓' : m === 'x' ? '✗' : ''));
        })));
      });
      grids.append(tbl);
    });
    card.append(h('div', { class: 'logic-layout' },
      h('div', null, h('label', { class: 'lbl', text: 'Clues (' + pz.clues.length + ')' }), cl),
      h('div', null, h('label', { class: 'lbl', text: 'Grid' }), grids,
        h('div', { class: 'row mt' },
          h('button', { class: 'btn btn-primary', type: 'button', onclick: check }, '✔ Check'),
          h('button', { class: 'btn', type: 'button', onclick: () => { for (const g of marks) for (const r of g) r.fill(''); render(); } }, 'Reset'),
          h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => { if (!confirm('Reveal the solution?')) return; pz.cats.forEach((_, c) => pz.people.forEach((_, p) => { marks[c][p].fill('x'); marks[c][p][pz.solution[c][p]] = 'o'; })); solved = true; render(); } }, 'Reveal'),
          h('span', { class: 'grow' }),
          h('button', { class: 'btn btn-sm', type: 'button', onclick: () => FP.share('Can you solve this Hallelujoy logic puzzle?', location.href) }, '🔗 Share this puzzle')))));
    root.append(card);
  }
  render();
};
})();
