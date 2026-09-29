/* Bible Guess Who — illustrated portraits, 1-v-1 room duels, and classic solo vs CPU.
   In both modes a human answers questions about their own secret character. */
'use strict';
(() => {
const { h } = FP;
FP.pages = FP.pages || {};

/* ------------------------------------------------------------------ */
/* Illustrated portraits (SVG built with DOM APIs — no innerHTML)      */
/* ------------------------------------------------------------------ */
const NS = 'http://www.w3.org/2000/svg';
const SKIN = ['#6b4226', '#8d5524', '#a0673c', '#b87a4b', '#c68642', '#d19a66', '#e0ac69'];
const HAIR = ['#1f140d', '#2b1d14', '#3b2518', '#4a2f1d'];
let gradId = 0;
function el(tag, attrs, parent) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (parent) parent.appendChild(n);
  return n;
}
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (x) => Math.max(0, Math.min(255, Math.round(x + amt)));
  return '#' + [f(n >> 16), f((n >> 8) & 255), f(n & 255)].map((x) => x.toString(16).padStart(2, '0')).join('');
}
FP.portrait = function (c) {
  const [age, hat, hair, facial, robe] = (FP.CHAR_LOOK[c.id] || 'a none short none #8d6e63').split(' ');
  const female = c.traits.has('f');
  const hsh = FP.hashStr(c.id);
  const skin = SKIN[hsh % SKIN.length];
  const hairCol = age === 'o' ? (hsh % 2 ? '#bdbdbd' : '#e0e0e0') : HAIR[(hsh >> 3) % HAIR.length];
  const svg = el('svg', { viewBox: '0 0 100 100', role: 'img', 'aria-label': c.name });
  el('rect', { x: 0, y: 0, width: 100, height: 100, fill: 'hsl(' + (hsh % 360) + ' 60% 86%)' }, svg);
  el('circle', { cx: 80, cy: 18, r: 22, fill: '#ffffff', opacity: '0.25' }, svg);
  let robeFill = robe;
  if (robe === 'rainbow') {
    const id = 'gwrb' + (++gradId);
    const g = el('linearGradient', { id, x1: '0', x2: '1', y1: '0', y2: '0' }, el('defs', {}, svg));
    ['#e53935', '#fb8c00', '#fdd835', '#43a047', '#1e88e5', '#8e24aa'].forEach((col, i, arr) => {
      el('stop', { offset: (i / (arr.length - 1)) * 100 + '%', 'stop-color': col }, g);
    });
    robeFill = 'url(#' + id + ')';
  }
  const robeDark = robe === 'rainbow' ? '#6d4c41' : shade(robe, -35);
  const cover = hat === 'veil' ? shade(robe === 'rainbow' ? '#8d6e63' : robe, 25) : hat === 'hood' ? robeDark : null;
  // Veil / hood drape behind the head
  if (cover) el('path', { d: 'M24 52 Q23 15 50 13 Q77 15 76 52 L86 100 L14 100 Z', fill: cover }, svg);
  // Long hair behind the head
  if (!cover && hair === 'long') el('path', { d: 'M28 46 Q27 18 50 18 Q73 18 72 46 L77 84 Q50 94 23 84 Z', fill: hairCol }, svg);
  // Body & robe
  el('path', { d: 'M12 100 Q14 73 50 70 Q86 73 88 100 Z', fill: robeFill }, svg);
  el('path', { d: 'M40 71 L50 86 L60 71', fill: 'none', stroke: robeDark, 'stroke-width': 2.5, 'stroke-linecap': 'round' }, svg);
  if (c.traits.has('priest')) el('path', { d: 'M44 88 L56 88', stroke: '#fbc02d', 'stroke-width': 4, 'stroke-linecap': 'round' }, svg);
  // Neck, ears, head
  el('rect', { x: 43, y: 58, width: 14, height: 16, rx: 5, fill: shade(skin, -18) }, svg);
  if (!cover) { el('ellipse', { cx: 31.5, cy: 48, rx: 3.5, ry: 5, fill: skin }, svg); el('ellipse', { cx: 68.5, cy: 48, rx: 3.5, ry: 5, fill: skin }, svg); }
  el('ellipse', { cx: 50, cy: 46, rx: 18, ry: 21, fill: skin }, svg);
  // Hair on top
  if (!cover && hat !== 'turban' && hat !== 'mitre' && hat !== 'helmet') {
    if (hair === 'bald') {
      el('path', { d: 'M32.5 47 Q31 36 35 32', fill: 'none', stroke: hairCol, 'stroke-width': 4, 'stroke-linecap': 'round' }, svg);
      el('path', { d: 'M67.5 47 Q69 36 65 32', fill: 'none', stroke: hairCol, 'stroke-width': 4, 'stroke-linecap': 'round' }, svg);
    } else if (hair === 'curly') {
      [[36, 30], [43, 25], [50, 23], [57, 25], [64, 30], [33, 37], [67, 37]].forEach(([x, y]) => el('circle', { cx: x, cy: y, r: 6.5, fill: hairCol }, svg));
    } else {
      el('path', { d: 'M31 45 Q30 22 50 22 Q70 22 69 45 Q64 32 50 31 Q36 32 31 45 Z', fill: hairCol }, svg);
    }
  }
  // Face
  const eye = '#24160e';
  el('path', { d: 'M39 40 Q43 38 46 40', fill: 'none', stroke: facial === 'none' && female ? eye : hairCol === '#e0e0e0' ? '#9e9e9e' : hairCol, 'stroke-width': 1.6, 'stroke-linecap': 'round' }, svg);
  el('path', { d: 'M54 40 Q57 38 61 40', fill: 'none', stroke: facial === 'none' && female ? eye : hairCol === '#e0e0e0' ? '#9e9e9e' : hairCol, 'stroke-width': 1.6, 'stroke-linecap': 'round' }, svg);
  el('circle', { cx: 43, cy: 45, r: 2.3, fill: eye }, svg);
  el('circle', { cx: 57, cy: 45, r: 2.3, fill: eye }, svg);
  el('circle', { cx: 43.8, cy: 44.2, r: 0.7, fill: '#fff' }, svg);
  el('circle', { cx: 57.8, cy: 44.2, r: 0.7, fill: '#fff' }, svg);
  if (age === 'o') { el('path', { d: 'M38 48 Q40 50 42 49', fill: 'none', stroke: shade(skin, -40), 'stroke-width': 0.9 }, svg); el('path', { d: 'M58 49 Q60 50 62 48', fill: 'none', stroke: shade(skin, -40), 'stroke-width': 0.9 }, svg); }
  el('path', { d: 'M50 47 Q48.5 52 50.5 53', fill: 'none', stroke: shade(skin, -45), 'stroke-width': 1.3, 'stroke-linecap': 'round' }, svg);
  el('circle', { cx: 39, cy: 52, r: 3.2, fill: '#ff8a80', opacity: '0.28' }, svg);
  el('circle', { cx: 61, cy: 52, r: 3.2, fill: '#ff8a80', opacity: '0.28' }, svg);
  // Beard (drawn before the mouth so the smile stays visible)
  if (facial === 'longbeard') el('path', { d: 'M32 48 Q33 76 50 84 Q67 76 68 48 Q63 61 50 62 Q37 61 32 48 Z', fill: hairCol }, svg);
  else if (facial === 'beard') el('path', { d: 'M32.5 48 Q34 66 50 71 Q66 66 67.5 48 Q63 59 50 60 Q37 59 32.5 48 Z', fill: hairCol }, svg);
  else if (facial === 'stubble') el('path', { d: 'M34 52 Q36 64 50 67 Q64 64 66 52 Q60 60 50 60.5 Q40 60 34 52 Z', fill: hairCol, opacity: '0.35' }, svg);
  el('path', { d: 'M44.5 56 Q50 60.5 55.5 56', fill: 'none', stroke: facial === 'longbeard' || facial === 'beard' ? '#f5d0c5' : '#8a3b2a', 'stroke-width': 1.7, 'stroke-linecap': 'round' }, svg);
  if (female && facial === 'none') el('path', { d: 'M45.5 57 Q50 59.5 54.5 57', fill: 'none', stroke: '#c2185b', 'stroke-width': 1.2, opacity: '0.6' }, svg);
  // Headwear
  const gold = '#fbc02d', goldDark = '#e0a000';
  if (cover) el('path', { d: 'M30 42 Q30 19 50 18 Q70 19 70 42 Q63 30 50 29.5 Q37 30 30 42 Z', fill: cover }, svg);
  if (hat === 'crown') {
    el('path', { d: 'M31 31 L30 16 L38 23 L44 12 L50 22 L56 12 L62 23 L70 16 L69 31 Z', fill: gold, stroke: goldDark, 'stroke-width': 1.2, 'stroke-linejoin': 'round' }, svg);
    el('circle', { cx: 50, cy: 27, r: 2.4, fill: '#e53935' }, svg);
    el('circle', { cx: 40, cy: 27.5, r: 1.8, fill: '#1e88e5' }, svg);
    el('circle', { cx: 60, cy: 27.5, r: 1.8, fill: '#43a047' }, svg);
  } else if (hat === 'tiara') {
    el('path', { d: 'M35 29 L39 22 L44 27 L50 18 L56 27 L61 22 L65 29 Q50 25 35 29 Z', fill: gold, stroke: goldDark, 'stroke-width': 1 }, svg);
    el('circle', { cx: 50, cy: 23, r: 2, fill: '#e91e63' }, svg);
  } else if (hat === 'turban' || hat === 'mitre') {
    const tc = hat === 'mitre' ? '#fafafa' : shade(robe === 'rainbow' ? '#ffffff' : robe, 55);
    el('path', { d: 'M29 38 Q28 16 50 14 Q72 16 71 38 Q50 30 29 38 Z', fill: tc, stroke: shade(tc, -30), 'stroke-width': 1 }, svg);
    el('path', { d: 'M32 30 Q50 22 68 30', fill: 'none', stroke: shade(tc, -40), 'stroke-width': 1.2 }, svg);
    el('path', { d: 'M34 24 Q50 17 66 24', fill: 'none', stroke: shade(tc, -40), 'stroke-width': 1.2 }, svg);
    if (hat === 'mitre') el('path', { d: 'M31 35 Q50 28 69 35', fill: 'none', stroke: gold, 'stroke-width': 3 }, svg);
  } else if (hat === 'headband') {
    el('path', { d: 'M31 34 Q50 27 69 34', fill: 'none', stroke: shade(robe === 'rainbow' ? '#e53935' : robe, 15), 'stroke-width': 4, 'stroke-linecap': 'round' }, svg);
  } else if (hat === 'helmet') {
    el('path', { d: 'M29 38 Q29 14 50 13 Q71 14 71 38 Z', fill: '#b0bec5', stroke: '#78909c', 'stroke-width': 1.3 }, svg);
    el('path', { d: 'M50 13 Q58 4 70 8 Q60 10 52 16 Z', fill: '#c62828' }, svg);
    el('rect', { x: 28, y: 35, width: 44, height: 4, rx: 2, fill: '#90a4ae' }, svg);
  }
  return svg;
};

function tile(c, { down, secret, guessing, onClick }) {
  return h('button', { type: 'button', class: 'gw-tile' + (down ? ' down' : '') + (secret ? ' secret' : '') + (guessing ? ' guessing' : ''), onclick: onClick, 'aria-pressed': down ? 'true' : 'false', title: c.name + ' — ' + c.role },
    h('div', { class: 'face' }, FP.portrait(c), h('span', { class: 'prop', 'aria-hidden': 'true', text: c.emoji })),
    h('div', { class: 'nm', text: c.name }),
    h('div', { class: 'rl', text: c.role }));
}
function boardEl(ids, flipped, opts, onTile) {
  const grid = h('div', { class: 'gw-board' });
  ids.forEach((id) => {
    const c = FP.charById(id); if (!c) return;
    grid.append(tile(c, { down: flipped.has(id), secret: opts.secret === id, guessing: opts.guessing && !flipped.has(id), onClick: () => onTile(id) }));
  });
  return grid;
}
function secretCard(c, label) {
  return h('div', { class: 'secret-card' }, h('div', { class: 'mini-face' }, FP.portrait(c)),
    h('div', null, h('div', { class: 'tiny muted', text: label }), h('b', { text: c.name }), h('div', { class: 'tiny muted', text: c.role })));
}
const qText = (k) => (FP.GW_QUESTIONS.find((q) => q.k === k) || {}).q || k;
const yesNo = (a) => h('span', { class: a === true ? 'yes' : a === false ? 'no' : 'muted', text: a === true ? 'YES' : a === false ? 'NO' : '—' });
function autoFlip(ids, flipped, k, a) {
  ids.forEach((id) => { const c = FP.charById(id); if (c && c.traits.has(k) !== a && !flipped.has(id)) flipped.add(id); });
}
function autoToggle(get, set) {
  const cb = h('input', { type: 'checkbox' });
  cb.checked = get();
  cb.addEventListener('change', () => set(cb.checked));
  return h('label', { class: 'small row', style: { gap: '6px' } }, cb, 'Auto-flip after answers');
}
// Answer buttons with a gentle double-check for list questions (answers stay the player's choice).
function answerButtons(myChar, q, send) {
  const ask = (a) => {
    if (q.k && myChar && myChar.traits.has(q.k) !== a) {
      const truth = myChar.traits.has(q.k) ? 'YES' : 'NO';
      if (!confirm('Double-check: for ' + myChar.name + ', our card notes say the answer is ' + truth + '.\n\nSend "' + (a ? 'Yes' : 'No') + '" anyway?')) return;
    }
    send(a);
  };
  return h('div', { class: 'row', style: { justifyContent: 'center' } },
    h('button', { class: 'btn btn-lg gw-yes', type: 'button', onclick: () => ask(true) }, '👍 Yes'),
    h('button', { class: 'btn btn-lg gw-no', type: 'button', onclick: () => ask(false) }, '👎 No'));
}

/* ------------------------- Room: 1-v-1 duels ------------------------- */
FP.views.gw = function (room) {
  let body; let st; let roundKey = null;
  let flipped, seen, guessMode, auto = FP.store.get('gw_auto', true);
  let draft = '';
  function reset() { flipped = new Set(); seen = 0; guessMode = false; }
  reset();

  function render() {
    const g = st.game;
    const active = document.activeElement;
    const typing = active && active.classList && active.classList.contains('gw-custom');
    FP.clear(body);
    const mt = g.matches.find((m) => m.a === room.me || m.b === room.me);
    if (!mt) {
      body.append(FP.ui.stageHead('guesswho', 'Round ' + g.round + ' of ' + g.rounds));
      const watch = g.matches[0];
      body.append(h('div', { class: 'q-card' }, h('div', { class: 'big-emoji', text: '👀' }),
        h('div', { class: 'q-prompt', text: g.sitOut === room.me ? 'You\'re sitting this round out' : 'You\'ll join the next round' }),
        h('div', { class: 'q-sub', text: 'Duels are 1-v-1. ' + (watch ? 'Watching ' + room.nameOf(watch.a) + ' vs ' + room.nameOf(watch.b) + '.' : '') })));
      if (watch) body.append(logEl(watch, null));
      return;
    }
    const opp = mt.a === room.me ? mt.b : mt.a;
    const oppName = room.nameOf(opp);
    const mySecret = room.gwSecret && room.gwSecret.round === g.round ? FP.charById(room.gwSecret.id) : null;
    const myTurn = mt.turn === room.me;
    const over = !!mt.winner;

    // New answers to my questions: auto-flip my board.
    mt.log.slice(seen).forEach((e) => { if (e.by === room.me && e.k && typeof e.a === 'boolean' && auto) autoFlip(mt.board, flipped, e.k, e.a); });
    if (mt.log.length > seen) { if (seen) FP.sound.play('pop'); seen = mt.log.length; }

    body.append(FP.ui.stageHead('guesswho', 'Round ' + g.round + ' of ' + g.rounds + ' · duel vs ' + oppName, over ? null : mt.remaining, g.dur,
      h('span', { class: 'chip', text: 'You: ' + FP.plural(mt.asked[room.me] || 0, 'question') + ' · ' + oppName + ': ' + (mt.asked[opp] || 0) })));

    // Status / action card
    const top = h('div', { class: 'gw-top mb' });
    if (mySecret) top.append(secretCard(mySecret, 'Your secret character — keep it hidden!'));
    const action = h('div', { class: 'gw-action grow' });
    if (over) {
      const r = mt.result || {};
      const won = mt.winner === room.me;
      const theirs = mt.secret ? FP.charById(mt.secret[opp]) : null;
      let msg;
      if (r.forfeit) msg = oppName + ' left — you win the duel!';
      else if (r.guesser === room.me) msg = r.ok ? '🎯 You guessed it — you win! +' + r.pts : '✘ Wrong guess — ' + oppName + ' wins this duel.';
      else msg = r.ok ? oppName + ' guessed your character — they win.' : oppName + ' guessed wrong — you win! +' + r.pts;
      action.append(h('div', { class: 'reveal-box' + (won ? '' : ' miss') }, h('b', { text: msg }),
        theirs ? h('div', { class: 'small', text: oppName + '\'s character was ' + theirs.name + '.' }) : null));
      if (g.phase === 'reveal') action.append(h('div', { class: 'small muted mt', text: 'Next round starts in a few seconds…' }));
      else action.append(h('div', { class: 'small muted mt', text: 'Waiting for the other duels to finish…' }));
      if (g.phase === 'reveal' && room.isHost) action.append(h('button', { class: 'btn btn-primary mt', type: 'button', onclick: () => room.send({ t: 'next' }) }, g.round >= g.rounds ? 'See results 🏆' : 'Next round ▶'));
    } else if (mt.step === 'answer' && !myTurn) {
      action.append(h('div', { class: 'gw-ask-card' }, h('div', { class: 'tiny muted', text: oppName + ' asks you:' }), h('div', { class: 'q-prompt', text: mt.q.text }),
        h('div', { class: 'tiny muted mb', text: 'Answer about your secret character' + (mySecret ? ' (' + mySecret.name + ')' : '') + '.' }),
        answerButtons(mySecret, mt.q, (a) => room.send({ t: 'gw_reply', a }))));
    } else if (mt.step === 'answer') {
      action.append(h('div', { class: 'gw-ask-card' }, h('div', { class: 'tiny muted', text: 'You asked:' }), h('div', { class: 'q-prompt', text: mt.q.text }), h('div', { class: 'small muted', text: 'Waiting for ' + oppName + ' to answer…' })));
    } else if (myTurn) {
      action.append(h('div', { class: 'gw-ask-card' }, h('b', { text: 'Your turn!' }), h('div', { class: 'small muted', text: 'Ask one question (pick one below or type your own), or make your final guess.' }),
        h('div', { class: 'row mt' },
          h('button', { type: 'button', class: 'btn ' + (guessMode ? 'btn-accent' : 'btn-primary'), onclick: () => { guessMode = !guessMode; render(); } }, guessMode ? 'Cancel guess' : '🎯 Make a guess'),
          autoToggle(() => auto, (v) => { auto = v; FP.store.set('gw_auto', v); })),
        guessMode ? h('div', { class: 'small', style: { color: 'var(--warn)' }, text: 'Tap the character you think ' + oppName + ' has. A wrong guess loses the duel!' }) : null));
    } else {
      action.append(h('div', { class: 'gw-ask-card' }, h('b', { text: oppName + '\'s turn' }), h('div', { class: 'small muted', text: 'They\'re choosing a question… you\'ll answer next.' })));
    }
    top.append(action);
    body.append(top);

    body.append(boardEl(mt.board, flipped, { secret: over && mt.secret ? mt.secret[opp] : null, guessing: guessMode && myTurn && !over }, (id) => {
      if (over) return;
      if (guessMode && myTurn && mt.step === 'ask') {
        const c = FP.charById(id);
        if (confirm('Final answer: is ' + oppName + '\'s character ' + c.name + '?')) { room.send({ t: 'gw_guess', id }); guessMode = false; }
        return;
      }
      if (flipped.has(id)) flipped.delete(id); else flipped.add(id);
      FP.sound.play('pop');
      render();
    }));

    const panel = h('div', { class: 'gw-panel' });
    if (!over && myTurn && mt.step === 'ask') {
      const asked = new Set(mt.log.filter((e) => e.by === room.me && e.k).map((e) => e.k));
      const ql = h('div', { class: 'q-list' });
      FP.GW_QUESTIONS.forEach((q) => ql.append(h('button', { type: 'button', class: 'btn btn-sm', disabled: asked.has(q.k), onclick: () => room.send({ t: 'gw_ask', k: q.k }) }, q.q)));
      const inp = h('input', { class: 'input gw-custom', maxlength: '120', placeholder: 'Or type your own yes/no question…', autocomplete: 'off' });
      inp.value = draft;
      inp.addEventListener('input', () => { draft = inp.value; });
      const form = h('form', { class: 'answer-bar mt', onsubmit: (e) => { e.preventDefault(); const v = inp.value.trim(); if (v.length < 3) return; room.send({ t: 'gw_ask', text: v }); draft = ''; } }, inp, h('button', { class: 'btn btn-primary', type: 'submit' }, 'Ask'));
      panel.append(h('div', null, h('label', { class: 'lbl', text: 'Ask a question' }), ql, form));
      if (typing) setTimeout(() => inp.focus(), 0);
    } else panel.append(h('div', null, h('label', { class: 'lbl', text: 'How to play' }), h('ul', { class: 'how' },
      h('li', { text: 'Take turns: ask one yes/no question, then answer theirs.' }),
      h('li', { text: 'Flip down characters that no longer fit (tap a tile).' }),
      h('li', { text: 'On your turn you can guess instead — a wrong guess loses!' }))));
    panel.append(logEl(mt, opp));
    body.append(panel);
  }

  function logEl(mt, opp) {
    const lg = h('div', { class: 'log' });
    mt.log.slice().reverse().forEach((e) => {
      const who = e.by === room.me ? 'You' : room.nameOf(e.by);
      const replier = e.by === room.me ? room.nameOf(opp) : e.by === mt.a ? room.nameOf(mt.b) : room.nameOf(mt.a);
      if (e.timeout) lg.append(h('div', { class: 'muted', text: who + ' ran out of time — turn passed.' }));
      else lg.append(h('div', null, h('span', { class: 'muted', text: who + ' asked: ' }), (e.text || qText(e.k)) + ' ', yesNo(e.a),
        e.auto ? h('span', { class: 'tiny muted', text: ' (' + replier + ' timed out' + (e.a == null ? ', question skipped' : ', answered from the card') + ')' }) : null));
    });
    if (!mt.log.length) lg.append(h('div', { class: 'muted', text: 'No questions yet.' }));
    return h('div', null, h('label', { class: 'lbl', text: 'Questions & answers' }), lg);
  }

  return {
    mount(el2) { body = el2; },
    update(s) {
      st = s;
      if (s.game.round !== roundKey) { roundKey = s.game.round; reset(); }
      render();
    },
    onMsg(m) { if (m.t === 'gw_secret' && st) render(); },
  };
};

/* ------------------------- Solo vs CPU (classic) ------------------------- */
FP.pages.guesswho = function (root) {
  let diff = FP.store.get('gw_diff', 'normal');
  let auto = FP.store.get('gw_auto', true);
  let g;

  function newGame() {
    const rnd = FP.mathRng();
    const board = FP.gwBoard(rnd, 24);
    const mine = FP.pick(board, rnd);
    let cpuSecret = FP.pick(board, rnd);
    while (cpuSecret === mine) cpuSecret = FP.pick(board, rnd);
    g = { board, mine, cpuSecret, flipped: new Set(), cpuCands: new Set(board), myAsked: new Set(), cpuAsked: new Set(), log: [], turn: 'me', pending: null, guessMode: false, over: null };
    render();
  }
  function win(who) { g.over = who; if (who === 'me') FP.store.set('gw_wins', FP.store.get('gw_wins', 0) + 1); FP.sound.play(who === 'me' ? 'win' : 'bad'); }

  // The CPU picks a question; YOU answer it about your own character.
  function cpuTurn() {
    if (g.over) return;
    g.turn = 'cpu'; render();
    setTimeout(() => {
      if (g.over) return;
      const cands = [...g.cpuCands];
      if (cands.length === 1) {
        const c = FP.charById(cands[0]);
        g.log.push(['cpu-guess', c.name]);
        win(c.id === g.mine ? 'cpu' : 'me');
        return render();
      }
      if (!cands.length) { // answers didn't add up — the CPU gives up
        g.log.push(['note', 'The computer got confused by the answers and gives up!']);
        win('me');
        return render();
      }
      const opts = FP.GW_QUESTIONS.filter((q) => !g.cpuAsked.has(q.k)).map((q) => {
        const yes = cands.filter((id) => FP.charById(id).traits.has(q.k)).length;
        return { k: q.k, score: Math.min(yes, cands.length - yes) };
      }).filter((o) => o.score > 0);
      if (!opts.length) {
        const pickId = FP.pick(cands);
        g.log.push(['cpu-guess', FP.charById(pickId).name]);
        if (pickId === g.mine) { win('cpu'); return render(); }
        g.cpuCands.delete(pickId); g.turn = 'me'; return render();
      }
      opts.sort((a, b) => b.score - a.score);
      const choice = diff === 'hard' || (diff === 'normal' && Math.random() < 0.6) ? opts[0] : FP.pick(opts);
      g.cpuAsked.add(choice.k);
      g.pending = choice.k; // waiting for YOUR yes/no
      g.turn = 'answer';
      FP.sound.play('tick');
      render();
    }, 800);
  }
  function reply(a) {
    const k = g.pending;
    g.pending = null;
    [...g.cpuCands].forEach((id) => { if (FP.charById(id).traits.has(k) !== a) g.cpuCands.delete(id); });
    g.log.push(['cpu', k, a]);
    g.turn = 'me';
    FP.sound.play('pop');
    render();
  }

  function render() {
    FP.clear(root);
    const me = FP.charById(g.mine);
    const card = h('div', { class: 'card stage' });
    card.append(FP.ui.stageHead('guesswho', 'Classic mode vs the computer', null, null,
      h('div', { class: 'seg' }, ['easy', 'normal', 'hard'].map((d) => h('button', { type: 'button', class: d === diff ? 'on' : '', onclick: () => { diff = d; FP.store.set('gw_diff', d); render(); } }, d[0].toUpperCase() + d.slice(1))))));
    const top = h('div', { class: 'gw-top mb' }, secretCard(me, 'Your secret character'));
    const action = h('div', { class: 'gw-action grow' });
    if (g.over) {
      const cs = FP.charById(g.cpuSecret);
      action.append(h('div', { class: 'reveal-box' + (g.over === 'me' ? '' : ' miss') }, h('b', { text: g.over === 'me' ? '🎉 You win!' : '😔 The computer wins this time.' }), h('div', { class: 'small', text: 'The computer\'s character was ' + cs.name + '.' })),
        h('button', { type: 'button', class: 'btn btn-primary mt', onclick: newGame }, '🔄 Play again'));
    } else if (g.turn === 'answer') {
      action.append(h('div', { class: 'gw-ask-card' }, h('div', { class: 'tiny muted', text: '🤖 The computer asks:' }), h('div', { class: 'q-prompt', text: qText(g.pending) }),
        h('div', { class: 'tiny muted mb', text: 'Answer about your character (' + me.name + ').' }), answerButtons(me, { k: g.pending }, reply)));
    } else if (g.turn === 'cpu') {
      action.append(h('div', { class: 'gw-ask-card' }, h('b', { text: '🤖 The computer is thinking…' })));
    } else {
      action.append(h('div', { class: 'gw-ask-card' }, h('b', { text: 'Your turn!' }), h('div', { class: 'small muted', text: 'Ask one question, or make your final guess. The computer has ' + FP.plural(g.cpuCands.size, 'character') + ' left.' }),
        h('div', { class: 'row mt' },
          h('button', { type: 'button', class: 'btn ' + (g.guessMode ? 'btn-accent' : 'btn-primary'), onclick: () => { g.guessMode = !g.guessMode; render(); } }, g.guessMode ? 'Cancel guess' : '🎯 Make a guess'),
          autoToggle(() => auto, (v) => { auto = v; FP.store.set('gw_auto', v); }))));
    }
    top.append(action);
    card.append(top);
    card.append(boardEl(g.board, g.flipped, { secret: g.over ? g.cpuSecret : null, guessing: g.guessMode }, (id) => {
      if (g.over) return;
      if (g.guessMode && g.turn === 'me') {
        const c = FP.charById(id);
        if (!confirm('Final answer: is the computer\'s character ' + c.name + '?')) return;
        g.log.push(['me-guess', c.name]);
        g.guessMode = false;
        win(id === g.cpuSecret ? 'me' : 'cpu');
        return render();
      }
      if (g.flipped.has(id)) g.flipped.delete(id); else g.flipped.add(id);
      FP.sound.play('pop'); render();
    }));
    const ql = h('div', { class: 'q-list' });
    FP.GW_QUESTIONS.forEach((q) => ql.append(h('button', { type: 'button', class: 'btn btn-sm', disabled: g.over || g.turn !== 'me' || g.myAsked.has(q.k), onclick: () => {
      g.myAsked.add(q.k);
      const a = FP.charById(g.cpuSecret).traits.has(q.k);
      g.log.push(['me', q.k, a]);
      if (auto) autoFlip(g.board, g.flipped, q.k, a);
      FP.sound.play('pop');
      cpuTurn();
    } }, q.q)));
    const lg = h('div', { class: 'log' });
    g.log.slice().reverse().forEach((e) => {
      if (e[0] === 'me') lg.append(h('div', null, h('span', { class: 'muted', text: 'You asked: ' }), qText(e[1]) + ' ', yesNo(e[2])));
      else if (e[0] === 'cpu') lg.append(h('div', null, h('span', { class: 'muted', text: 'Computer asked: ' }), qText(e[1]) + ' ', h('span', { class: 'muted', text: 'you said ' }), yesNo(e[2])));
      else if (e[0] === 'note') lg.append(h('div', { text: e[1] }));
      else lg.append(h('div', { text: (e[0] === 'cpu-guess' ? 'Computer guessed ' : 'You guessed ') + e[1] }));
    });
    if (!g.log.length) lg.append(h('div', { class: 'muted', text: 'You go first. Good luck!' }));
    card.append(h('div', { class: 'gw-panel' }, h('div', null, h('label', { class: 'lbl', text: 'Your questions' }), ql), h('div', null, h('label', { class: 'lbl', text: 'Game log' }), lg)));
    card.append(h('p', { class: 'tiny muted mt', text: 'Wins so far: ' + FP.store.get('gw_wins', 0) + ' · Want to duel a friend? Create a room and pick Bible Guess Who.' }));
    root.append(card);
  }
  newGame();
};
})();
