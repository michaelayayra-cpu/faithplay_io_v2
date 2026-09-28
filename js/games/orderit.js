/* Order It — put books, events and lives in order. 5 rounds, 3 tries each. Seeded. */
'use strict';
(() => {
const { h } = FP;
FP.pages = FP.pages || {};

FP.makeOrderRounds = function (seed, count = 5) {
  const rnd = FP.rng(seed);
  const bag = FP.ORDER_SETS.flatMap((s) => Array(s.weight).fill(s));
  const rounds = [];
  const usedTitles = new Map();
  while (rounds.length < count) {
    const set = FP.pick(bag, rnd);
    if ((usedTitles.get(set.title) || 0) >= (set.weight > 1 ? 2 : 1)) continue;
    usedTitles.set(set.title, (usedTitles.get(set.title) || 0) + 1);
    const k = Math.min(set.items.length, rnd() < 0.5 ? 5 : 6);
    const idx = FP.sample([...set.items.keys()], k, rnd).sort((a, b) => a - b);
    const answer = idx.map((i) => set.items[i]);
    let shown = FP.shuffle(answer, rnd);
    for (let g = 0; g < 5 && shown.every((x, i) => x === answer[i]); g++) shown = FP.shuffle(answer, rnd);
    rounds.push({ title: set.title, hint: set.hint, answer, shown });
  }
  return rounds;
};

FP.pages.orderit = function (root, arg) {
  let seed = parseInt(arg, 10);
  if (!Number.isInteger(seed) || seed < 0 || seed > 2 ** 31) { location.replace('#/p/orderit/' + FP.newSeed()); return; }
  const rounds = FP.makeOrderRounds(seed);
  let r = 0, tries = 0, score = 0, list = rounds[0].shown.slice(), marks = null, done = false;
  const results = [];
  let dragIdx = null;

  function move(i, d) { const j = i + d; if (j < 0 || j >= list.length) return; [list[i], list[j]] = [list[j], list[i]]; marks = null; FP.sound.play('tick'); render(); }
  function submit() {
    const ans = rounds[r].answer;
    marks = list.map((x, i) => x === ans[i]);
    tries++;
    if (marks.every(Boolean)) {
      const pts = 4 - tries; score += pts; results.push(pts); done = true; FP.sound.play('good');
    } else if (tries >= 3) { results.push(0); done = true; list = ans.slice(); marks = list.map(() => true); FP.sound.play('bad'); FP.toast('Out of tries — here\'s the right order.'); }
    else { FP.sound.play('bad'); FP.toast(marks.filter(Boolean).length + ' of ' + list.length + ' in the right place. ' + (3 - tries) + ' tries left.'); }
    render();
  }
  function nextRound() {
    r++;
    if (r >= rounds.length) return finish();
    tries = 0; done = false; marks = null; list = rounds[r].shown.slice();
    render();
  }
  function finish() {
    FP.sound.play('win');
    const emo = results.map((p) => ['🟥', '🟧', '🟨', '🟩'][p]).join('');
    const text = 'FaithPlay Order It #' + seed + ': ' + score + '/15 ' + emo + '\n' + location.href;
    FP.clear(root);
    root.append(h('div', { class: 'card stage center' }, h('div', { class: 'big-emoji', text: '📅' }), h('h2', { text: score + ' / 15 points' }), h('p', { class: 'muted', text: emo }),
      h('div', { class: 'row mt', style: { justifyContent: 'center' } }, h('button', { class: 'btn', type: 'button', onclick: () => FP.copy(text) }, '📋 Copy result'), h('button', { class: 'btn', type: 'button', onclick: () => FP.share('Beat my score on FaithPlay Order It!', location.href) }, '🔗 Challenge a friend'), h('a', { class: 'btn btn-primary', href: '#/p/orderit/' + FP.newSeed() }, 'Play again ▶'))));
  }

  function render() {
    FP.clear(root);
    const rd = rounds[r];
    const card = h('div', { class: 'card stage' });
    card.append(FP.ui.stageHead('orderit', 'Round ' + (r + 1) + ' of ' + rounds.length + ' · Score ' + score, null, null, h('span', { class: 'chip', text: 'Try ' + Math.min(3, tries + (done ? 0 : 1)) + '/3' })));
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
