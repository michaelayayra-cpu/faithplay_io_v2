/* Bible Connections — find four groups of four. Seeded & shareable. */
'use strict';
(() => {
const { h } = FP;
FP.pages = FP.pages || {};
const COLORS = ['#fde68a', '#bbf7d0', '#bfdbfe', '#ddd6fe'];
const EMO = ['🟨', '🟩', '🟦', '🟪'];

const LEVELS = {
  easy: { label: 'Easy', allow: [1], lives: 6, note: 'The four category names are shown to help you.' },
  medium: { label: 'Medium', allow: [1, 2], lives: 4, note: '' },
  hard: { label: 'Hard', allow: [2, 3], lives: 3, note: 'Deep-cut categories, only 3 mistakes.' },
};

FP.makeConnections = function (seed, diff = 'medium') {
  const rnd = FP.rng(seed);
  const low = (s) => s.toLowerCase();
  const chosen = [];
  const lv = (g) => FP.CONN_LEVEL[g[0]] || 2;
  const allow = (LEVELS[diff] || LEVELS.medium).allow;
  // Preferred groups first (shuffled), then everything else as a fallback.
  const ordered = FP.shuffle(FP.CONN_GROUPS.filter((g) => allow.includes(lv(g))), rnd)
    .concat(FP.shuffle(FP.CONN_GROUPS.filter((g) => !allow.includes(lv(g))), rnd));
  if (diff === 'hard') ordered.sort((a, b) => (lv(b) === 3) - (lv(a) === 3) || 0); // at least try to lead with deep cuts
  for (const [name, members] of ordered) {
    if (chosen.length === 4) break;
    const memSet = new Set(members.map(low));
    // none of the already-picked words may also fit this group
    if (chosen.some((g) => g.items.some((it) => memSet.has(low(it))))) continue;
    const blocked = new Set(chosen.flatMap((g) => g.members.map(low)));
    const avail = members.filter((m) => !blocked.has(low(m)));
    if (avail.length < 4) continue;
    chosen.push({ name, members, items: FP.sample(avail, 4, rnd) });
  }
  return chosen.map((g, i) => ({ name: g.name, items: g.items, color: i }));
};

FP.pages.connections = function (root, arg) {
  let [diff, seedStr] = String(arg || '').includes('-') ? String(arg).split('-') : [null, arg];
  if (!LEVELS[diff]) diff = FP.store.get('conn_diff', 'medium');
  const seed = parseInt(seedStr, 10);
  if (!Number.isInteger(seed) || seed < 0 || seed > 2 ** 31) { location.replace('#/p/connections/' + diff + '-' + FP.newSeed()); return; }
  FP.store.set('conn_diff', diff);
  const L = LEVELS[diff];
  const next = () => '#/p/connections/' + diff + '-' + FP.newSeed();
  const groups = FP.makeConnections(seed, diff);
  let tiles = FP.shuffle(groups.flatMap((g) => g.items.map((w) => ({ w, g: g.color }))), FP.rng(seed + 1));
  const solved = [];
  const history = [];
  let sel = new Set();
  let lives = L.lives;
  let over = false;

  function submit() {
    if (sel.size !== 4) return;
    const picked = tiles.filter((t) => sel.has(t.w));
    const key = [...sel].sort().join('|');
    if (history.some((x) => x.key === key)) { FP.toast('Already guessed!'); return; }
    history.push({ key, row: picked.map((t) => t.g) });
    const counts = {};
    picked.forEach((t) => { counts[t.g] = (counts[t.g] || 0) + 1; });
    const best = Math.max(...Object.values(counts));
    if (best === 4) {
      const g = groups.find((x) => x.color === picked[0].g);
      solved.push(g);
      tiles = tiles.filter((t) => !sel.has(t.w));
      sel = new Set();
      FP.sound.play('good');
      if (solved.length === 4) finish(true);
    } else {
      lives--;
      FP.sound.play('bad');
      FP.toast(best === 3 ? 'One away…' : 'Not quite!', 'bad');
      if (lives <= 0) finish(false);
      else { render(); root.querySelectorAll('.conn-tile.on').forEach((el) => el.classList.add('shake')); return; }
    }
    render();
  }
  function finish(won) {
    over = true;
    groups.forEach((g) => { if (!solved.includes(g)) solved.push(g); });
    tiles = [];
    render();
    const grid = history.map((r) => r.row.map((c) => EMO[c]).join('')).join('\n');
    const text = 'Hallelujoy Bible Connections #' + seed + '\n' + grid + '\n' + location.href;
    setTimeout(() => FP.modal(h('div', { class: 'stack center' },
      h('div', { class: 'big-emoji', text: won ? '🎉' : '🙏' }), h('h2', { text: won ? 'You found them all!' : 'Next time!' }),
      h('pre', { style: { fontSize: '1.3rem', lineHeight: '1.2', margin: '0' }, text: grid }),
      h('div', { class: 'row', style: { justifyContent: 'center' } }, h('button', { class: 'btn', type: 'button', onclick: () => FP.copy(text) }, '📋 Copy result'), h('a', { class: 'btn btn-primary', href: next() }, 'New puzzle ▶')))), 500);
  }

  function render() {
    FP.clear(root);
    const card = h('div', { class: 'card stage' });
    card.append(FP.ui.stageHead('connections', 'Puzzle #' + seed + ' · ' + L.label + ' · create four groups of four', null, null,
      h('div', { class: 'row', style: { gap: '6px' } },
        h('div', { class: 'seg' }, Object.keys(LEVELS).map((d) => h('a', { class: d === diff ? 'on' : '', href: '#/p/connections/' + d + '-' + FP.newSeed() }, LEVELS[d].label))),
        h('button', { class: 'btn btn-sm', type: 'button', onclick: () => FP.share('Try this Hallelujoy Bible Connections puzzle!', location.href) }, '🔗 Share'))));
    if (diff === 'easy' && !over) card.append(h('div', { class: 'row mb', style: { gap: '6px' } }, h('span', { class: 'small muted', text: 'Categories:' }),
      FP.shuffle(groups.filter((g) => !solved.includes(g)).map((g) => g.name), FP.rng(seed + 2)).map((n) => h('span', { class: 'chip', text: n }))));
    const grid = h('div', { class: 'conn-grid' });
    solved.forEach((g) => grid.append(h('div', { class: 'conn-solved', style: { background: COLORS[g.color] } }, h('b', { text: g.name }), h('span', { text: g.items.join(', ') }))));
    tiles.forEach((t) => grid.append(h('button', { type: 'button', class: 'conn-tile' + (sel.has(t.w) ? ' on' : ''), onclick: () => {
      if (over) return;
      if (sel.has(t.w)) sel.delete(t.w); else if (sel.size < 4) sel.add(t.w);
      FP.sound.play('tick'); render();
    } }, t.w)));
    card.append(grid);
    if (!over) {
      card.append(h('div', { class: 'row mt', style: { justifyContent: 'center' } },
        h('span', { class: 'small muted' }, 'Mistakes left:'), h('div', { class: 'lives' }, Array.from({ length: L.lives }, (_, i) => h('i', { class: i < lives ? '' : 'gone' })))));
      card.append(h('div', { class: 'row mt', style: { justifyContent: 'center' } },
        h('button', { class: 'btn', type: 'button', onclick: () => { tiles = FP.shuffle(tiles); render(); } }, '🔀 Shuffle'),
        h('button', { class: 'btn', type: 'button', disabled: !sel.size, onclick: () => { sel = new Set(); render(); } }, 'Deselect'),
        h('button', { class: 'btn btn-primary', type: 'button', disabled: sel.size !== 4, onclick: submit }, 'Submit')));
    } else card.append(h('div', { class: 'row mt', style: { justifyContent: 'center' } }, h('a', { class: 'btn btn-primary', href: next() }, 'New puzzle ▶')));
    card.append(h('p', { class: 'tiny muted center mt', text: 'Tip: some words look like they fit two groups — only one arrangement works.' }));
    root.append(card);
  }
  render();
};
})();
