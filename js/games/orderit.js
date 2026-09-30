/* Order It — put books, events and lives in order. 5 rounds; tries depend on difficulty. Seeded. */
'use strict';
(() => {
const { h } = FP;
FP.pages = FP.pages || {};

const LEVELS = {
  easy: { label: 'Easy', allow: [1, 2], items: 4, tries: 4, note: '4 items, 4 tries, famous books only.' },
  medium: { label: 'Medium', allow: [1, 2, 3], items: 5, tries: 3, note: '5–6 items, 3 tries.' },
  hard: { label: 'Hard', allow: [2, 3], items: 7, tries: 2, note: '7 items, only 2 tries.' },
};

FP.makeOrderRounds = function (seed, count = 5, diff = 'medium') {
  const L = LEVELS[diff] || LEVELS.medium;
  const rnd = FP.rng(seed);
  const lv = (s) => FP.ORDER_LEVEL[s.title] || 2;
  const sets = FP.ORDER_SETS.filter((s) => L.allow.includes(lv(s)) && (diff !== 'easy' || lv(s) === 1 || s.title === 'Books of the Bible'));
  const bag = sets.flatMap((s) => Array(s.weight + (diff === 'hard' && lv(s) === 3 ? 2 : 0)).fill(s));
  const rounds = [];
  const usedTitles = new Map();
  while (rounds.length < count) {
    const set = FP.pick(bag, rnd);
    if ((usedTitles.get(set.title) || 0) >= (set.weight > 1 ? 2 : 1) && rounds.length < sets.length) continue;
    usedTitles.set(set.title, (usedTitles.get(set.title) || 0) + 1);
    const source = diff === 'easy' && set.title === 'Books of the Bible' ? FP.EASY_BOOKS : set.items;
    const k = Math.min(source.length, diff === 'medium' ? (rnd() < 0.5 ? 5 : 6) : L.items);
    const idx = FP.sample([...source.keys()], k, rnd).sort((a, b) => a - b);
    const answer = idx.map((i) => source[i]);
    let shown = FP.shuffle(answer, rnd);
    for (let g = 0; g < 5 && shown.every((x, i) => x === answer[i]); g++) shown = FP.shuffle(answer, rnd);
    rounds.push({ title: set.title, hint: set.hint, answer, shown });
  }
  return rounds;
};

FP.ORDER_TRIES = { easy: LEVELS.easy.tries, medium: LEVELS.medium.tries, hard: LEVELS.hard.tries };

// opts.room (optional): { report(data, done) } — used when the puzzle is played in a room.
FP.pages.orderit = function (root, arg, opts = {}) {
  const R = opts.room;
  let [diff, seedStr] = String(arg || '').includes('-') ? String(arg).split('-') : [null, arg];
  if (!LEVELS[diff]) diff = FP.store.get('order_diff', 'medium');
  const seed = parseInt(seedStr, 10);
  if (!Number.isInteger(seed) || seed < 0 || seed > 2 ** 31) { location.replace('#/p/orderit/' + diff + '-' + FP.newSeed()); return; }
  if (!R) FP.store.set('order_diff', diff);
  const L = LEVELS[diff];
  const MAXT = L.tries;
  const next = () => '#/p/orderit/' + diff + '-' + FP.newSeed();
  const rounds = FP.makeOrderRounds(seed, 5, diff);
  let r = 0, tries = 0, score = 0, list = rounds[0].shown.slice(), marks = null, done = false;
  const results = [];
  let dragIdx = null;
  const attempts = rounds.map(() => []); // every order submitted, per round (the host replays these to score)
  const report = (fin) => { if (R) R.report({ attempts }, fin); };

  function move(i, d) { const j = i + d; if (j < 0 || j >= list.length) return; [list[i], list[j]] = [list[j], list[i]]; marks = null; FP.sound.play('tick'); render(); }
  function submit() {
    const ans = rounds[r].answer;
    marks = list.map((x, i) => x === ans[i]);
    tries++;
    attempts[r].push(list.slice());
    if (marks.every(Boolean)) {
      const pts = MAXT + 1 - tries; score += pts; results.push(pts); done = true; FP.sound.play('good');
    } else if (tries >= MAXT) { results.push(0); done = true; list = ans.slice(); marks = list.map(() => true); FP.sound.play('bad'); FP.toast('Out of tries — here\'s the right order.'); }
    else { FP.sound.play('bad'); FP.toast(marks.filter(Boolean).length + ' of ' + list.length + ' in the right place. ' + FP.plural(MAXT - tries, 'try') .replace('trys', 'tries') + ' left.'); }
    render();
    report(false);
  }
  function nextRound() {
    r++;
    if (r >= rounds.length) return finish();
    tries = 0; done = false; marks = null; list = rounds[r].shown.slice();
    render();
  }
  function finish() {
    FP.sound.play('win');
    const emo = results.map((p) => (p === MAXT ? '🟩' : p >= MAXT / 2 ? '🟨' : p > 0 ? '🟧' : '🟥')).join('');
    const max = MAXT * rounds.length;
    const text = 'Hallelujoy Order It #' + seed + ' (' + L.label + '): ' + score + '/' + max + ' ' + emo + '\n' + location.href;
    FP.clear(root);
    if (R) {
      report(true);
      root.append(h('div', { class: 'card stage center' }, h('div', { class: 'big-emoji', text: '📅' }), h('h2', { text: score + ' / ' + max + ' points' }), h('p', { class: 'muted', text: emo }), h('p', { class: 'small muted', text: 'Finished! Waiting for the others…' })));
      return;
    }
    root.append(h('div', { class: 'card stage center' }, h('div', { class: 'big-emoji', text: '📅' }), h('h2', { text: score + ' / ' + max + ' points' }), h('p', { class: 'muted', text: emo }),
      h('div', { class: 'row mt', style: { justifyContent: 'center' } }, h('button', { class: 'btn', type: 'button', onclick: () => FP.copy(text) }, '📋 Copy result'), h('button', { class: 'btn', type: 'button', onclick: () => FP.share('Beat my score on Hallelujoy Order It!', location.href) }, '🔗 Challenge a friend'), h('a', { class: 'btn btn-primary', href: next() }, 'Play again ▶'))));
  }

  function render() {
    FP.clear(root);
    const rd = rounds[r];
    const card = h('div', { class: 'card stage' });
    card.append(FP.ui.stageHead('orderit', 'Round ' + (r + 1) + ' of ' + rounds.length + ' · ' + L.label + ' · Score ' + score, null, null,
      h('div', { class: 'row', style: { gap: '6px' } },
        R ? null : h('div', { class: 'seg' }, Object.keys(LEVELS).map((d) => h('a', { class: d === diff ? 'on' : '', href: '#/p/orderit/' + d + '-' + FP.newSeed() }, LEVELS[d].label))),
        R ? null : h('button', { class: 'btn btn-sm', type: 'button', onclick: () => FP.share('Try this Hallelujoy Order It puzzle!', location.href) }, '🔗 Share'),
        R ? null : h('a', { class: 'btn btn-sm', href: '#/host/orderit/' + diff, title: 'Create a room where everyone solves the same puzzle' }, '👥 Race friends'),
        h('span', { class: 'chip', text: 'Try ' + Math.min(MAXT, tries + (done ? 0 : 1)) + '/' + MAXT }))));
    card.append(h('div', { class: 'q-card mb' }, h('div', { class: 'q-cat', text: rd.title }), h('div', { class: 'q-prompt', text: rd.hint })));
    const ol = h('div', { class: 'order-list' });
    list.forEach((item, i) => {
      const row = h('div', { class: 'order-item' + (marks ? (marks[i] ? ' right' : ' wrong') : ''), draggable: done ? 'false' : 'true' },
        h('span', { class: 'grip', text: '⋮⋮' }), h('span', { class: 'num', text: String(i + 1) }), h('span', { text: item }),
        done ? null : h('span', { class: 'mv' }, h('button', { class: 'btn btn-sm', type: 'button', 'aria-label': 'Move up', disabled: i === 0, onclick: () => move(i, -1) }, '▲'), h('button', { class: 'btn btn-sm', type: 'button', 'aria-label': 'Move down', disabled: i === list.length - 1, onclick: () => move(i, 1) }, '▼')));
      row.addEventListener('dragstart', (e) => { dragIdx = i; row.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', String(i)); } catch (x) {} });
      row.addEventListener('dragend', () => row.classList.remove('dragging'));
      row.addEventListener('dragover', (e) => e.preventDefault());
      row.addEventListener('drop', (e) => { e.preventDefault(); if (dragIdx == null || dragIdx === i) return; const [x] = list.splice(dragIdx, 1); list.splice(i, 0, x); dragIdx = null; marks = null; render(); });
      ol.append(row);
    });
    card.append(ol);
    card.append(h('div', { class: 'row mt', style: { justifyContent: 'flex-end' } },
      done ? h('button', { class: 'btn btn-primary', type: 'button', onclick: nextRound }, r + 1 >= rounds.length ? 'See score 🏆' : 'Next round ▶')
        : h('button', { class: 'btn btn-primary', type: 'button', onclick: submit }, '✔ Check order')));
    root.append(card);
  }
  render();
};
})();
