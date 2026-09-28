/* Faithle — a daily five-letter faith word, Wordle-style. */
'use strict';
(() => {
const { h } = FP;
FP.pages = FP.pages || {};

function dayNumber() {
  const now = new Date();
  return Math.floor((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(2025, 0, 1)) / 86400000);
}
function score(guess, answer) {
  const res = Array(5).fill('n'); const a = answer.split('');
  guess.split('').forEach((ch, i) => { if (ch === a[i]) { res[i] = 'g'; a[i] = null; } });
  guess.split('').forEach((ch, i) => { if (res[i] === 'g') return; const j = a.indexOf(ch); if (j >= 0) { res[i] = 'y'; a[j] = null; } });
  return res;
}

FP.pages.faithle = function (root, arg) {
  const words = FP.shuffle(FP.FAITHLE_WORDS, FP.rng(20250101));
  const daily = !arg;
  const num = daily ? dayNumber() : parseInt(arg, 10);
  if (!Number.isInteger(num) || num < 0) { location.replace('#/p/faithle'); return; }
  const answer = words[num % words.length];
  const saveKey = 'faithle_' + (daily ? 'd' + num : 'p' + num);
  let guesses = FP.store.get(saveKey, []).filter((g) => typeof g === 'string' && /^[A-Z]{5}$/.test(g)).slice(0, 6);
  let cur = '';
  let over = guesses.includes(answer) || guesses.length >= 6;
  let shakeRow = false;

  function keyState() {
    const st = {};
    guesses.forEach((g) => score(g, answer).forEach((r, i) => { const ch = g[i]; if (st[ch] === 'g') return; if (r === 'g' || (r === 'y' && st[ch] !== 'g')) st[ch] = r; else if (!st[ch]) st[ch] = r; }));
    return st;
  }
  function press(k) {
    if (over) return;
    if (k === 'ENTER') {
      if (cur.length !== 5) { shakeRow = true; FP.toast('Not enough letters'); render(); return; }
      guesses.push(cur); cur = '';
      FP.store.set(saveKey, guesses);
      if (guesses[guesses.length - 1] === answer) { over = true; FP.sound.play('win'); if (daily) FP.store.set('faithle_streak', FP.store.get('faithle_streak', 0) + 1); setTimeout(result, 600); }
      else if (guesses.length >= 6) { over = true; FP.sound.play('bad'); if (daily) FP.store.set('faithle_streak', 0); setTimeout(result, 600); }
      else FP.sound.play('pop');
    } else if (k === 'BACK') cur = cur.slice(0, -1);
    else if (/^[A-Z]$/.test(k) && cur.length < 5) { cur += k; FP.sound.play('tick'); }
    render();
  }
  function result() {
    const won = guesses.includes(answer);
    const grid = guesses.map((g) => score(g, answer).map((r) => ({ g: '🟩', y: '🟨', n: '⬛' }[r])).join('')).join('\n');
    const text = 'Faithle ' + (daily ? '#' + num : 'practice') + ' ' + (won ? guesses.length : 'X') + '/6\n' + grid + '\n' + FP.baseUrl() + '#/p/faithle';
    FP.modal(h('div', { class: 'stack center' }, h('div', { class: 'big-emoji', text: won ? '🙌' : '📖' }), h('h2', { text: won ? 'Well done!' : 'The word was ' + answer }),
      h('pre', { style: { fontSize: '1.2rem', lineHeight: '1.2', margin: '0' }, text: grid }),
      daily ? h('p', { class: 'small muted', text: 'Streak: ' + FP.store.get('faithle_streak', 0) + ' · New word tomorrow!' }) : null,
      h('div', { class: 'row', style: { justifyContent: 'center' } }, h('button', { class: 'btn', type: 'button', onclick: () => FP.copy(text) }, '📋 Copy result'), h('a', { class: 'btn btn-primary', href: '#/p/faithle/' + FP.secureInt(100000) }, 'Practice word ▶'))));
  }

  function render() {
    FP.clear(root);
    const card = h('div', { class: 'card stage' });
    card.append(FP.ui.stageHead('faithle', daily ? 'Daily word #' + num : 'Practice word', null, null, daily ? null : h('a', { class: 'btn btn-sm', href: '#/p/faithle' }, 'Today\'s word')));
    const board = h('div', { class: 'fl-board' });
    for (let r = 0; r < 6; r++) {
      const g = guesses[r];
      const row = h('div', { class: 'fl-row' + (shakeRow && r === guesses.length ? ' shake' : '') });
      const sc = g ? score(g, answer) : null;
      for (let c = 0; c < 5; c++) {
        const ch = g ? g[c] : r === guesses.length ? cur[c] || '' : '';
        row.append(h('div', { class: 'fl-cell' + (sc ? ' ' + sc[c] : ch ? ' filled' : ''), text: ch }));
      }
      board.append(row);
    }
    shakeRow = false;
    card.append(board);
    const ks = keyState();
    const kb = h('div', { class: 'keyboard' });
    ['QWERTYUIOP', 'ASDFGHJKL', '+ZXCVBNM-'].forEach((line) => {
      const kr = h('div', { class: 'kr' });
      line.split('').forEach((ch) => {
        if (ch === '+') kr.append(h('button', { type: 'button', class: 'key wide', onclick: () => press('ENTER') }, 'Enter'));
        else if (ch === '-') kr.append(h('button', { type: 'button', class: 'key wide', 'aria-label': 'Backspace', onclick: () => press('BACK') }, '⌫'));
        else kr.append(h('button', { type: 'button', class: 'key ' + (ks[ch] || ''), onclick: () => press(ch) }, ch));
      });
      kb.append(kr);
    });
    card.append(kb);
    if (over) card.append(h('div', { class: 'row mt', style: { justifyContent: 'center' } }, h('button', { class: 'btn', type: 'button', onclick: result }, 'Show result')));
    card.append(h('p', { class: 'tiny muted center mt', text: 'Guess the 5-letter Bible or faith word. 🟩 right spot · 🟨 in the word · ⬛ not in the word.' }));
    root.append(card);
  }
  const onKey = (e) => {
    if (!document.body.contains(root) || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
    if (e.key === 'Enter') press('ENTER');
    else if (e.key === 'Backspace') press('BACK');
    else if (/^[a-z]$/i.test(e.key)) press(e.key.toUpperCase());
  };
  document.addEventListener('keydown', onKey);
  FP.onLeavePage(() => document.removeEventListener('keydown', onKey));
  render();
};
})();
