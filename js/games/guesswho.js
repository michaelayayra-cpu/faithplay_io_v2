/* Bible Guess Who — board rendering, room race view, and classic solo vs CPU. */
'use strict';
(() => {
const { h } = FP;
FP.pages = FP.pages || {};

function tile(c, { down, secret, guessing, onClick }) {
  return h('button', { type: 'button', class: 'gw-tile' + (down ? ' down' : '') + (secret ? ' secret' : '') + (guessing ? ' guessing' : ''), onclick: onClick, 'aria-pressed': down ? 'true' : 'false', title: c.name },
    h('div', { class: 'face', style: { background: FP.hueFor(c.id) }, text: c.emoji }),
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
const qText = (k) => (FP.GW_QUESTIONS.find((q) => q.k === k) || {}).q || k;
function logLine(who, k, a) {
  return h('div', null, h('span', { class: 'muted', text: who + ': ' }), qText(k) + ' ', h('span', { class: a ? 'yes' : 'no', text: a ? 'YES' : 'NO' }));
}
function autoFlip(ids, flipped, k, a) {
  let n = 0;
  ids.forEach((id) => { const c = FP.charById(id); if (c && c.traits.has(k) !== a && !flipped.has(id)) { flipped.add(id); n++; } });
  return n;
}

/* ------------------------- Room race view ------------------------- */
FP.views.gw = function (room) {
  let body; let st; let roundKey = null;
  let flipped, log, asked, guessMode, result, auto = FP.store.get('gw_auto', true);

  function reset() { flipped = new Set(); log = []; asked = new Set(); guessMode = false; result = null; }
  reset();

  function render() {
    const g = st.game;
    FP.clear(body);
    const myQ = g.asked[room.me] || 0;
    body.append(FP.ui.stageHead('guesswho', 'Round ' + g.round + ' of ' + g.rounds + ' · everyone hunts the same secret', g.phase === 'play' ? g.remaining : null, g.dur, h('span', { class: 'chip', text: FP.plural(myQ, 'question') })));
    const out = result || g.done[room.me] !== undefined;
    if (g.phase === 'reveal') {
      const c = FP.charById(g.secret);
      body.append(h('div', { class: 'secret-card mb' }, h('span', { class: 'big-emoji', style: { fontSize: '2rem' }, text: c.emoji }), h('div', null, h('div', { class: 'tiny muted', text: 'The secret character was' }), h('h3', { text: c.name + ' — ' + c.role }))));
    } else if (out) {
      const ok = result ? result.ok : g.done[room.me];
      body.append(h('div', { class: 'reveal-box mb' + (ok ? '' : ' miss') }, h('b', { text: ok ? '🎉 You found them! +' + (result ? result.pts : '') : '✘ Wrong guess — you\'re out this round.' }), ' Waiting for others…'));
    } else {
      body.append(h('div', { class: 'row mb' },
        h('button', { type: 'button', class: 'btn ' + (guessMode ? 'btn-accent' : 'btn-primary'), onclick: () => { guessMode = !guessMode; render(); } }, guessMode ? 'Cancel guess' : '🎯 Make a guess'),
        h('label', { class: 'small row', style: { gap: '6px' } }, (() => { const cb = h('input', { type: 'checkbox' }); cb.checked = auto; cb.addEventListener('change', () => { auto = cb.checked; FP.store.set('gw_auto', auto); }); return cb; })(), 'Auto-flip after answers'),
        h('span', { class: 'small muted grow', text: guessMode ? 'Tap the character you think it is. One wrong guess and you\'re out!' : 'Ask questions below, tap tiles to flip them down.' })));
    }
    body.append(boardEl(g.board, flipped, { secret: g.phase === 'reveal' ? g.secret : null, guessing: guessMode }, (id) => {
      if (g.phase !== 'play' || out) return;
      if (guessMode) {
        const c = FP.charById(id);
        if (confirm('Final answer: ' + c.name + '?')) { room.send({ t: 'gw_guess', id }); guessMode = false; }
        return;
      }
      if (flipped.has(id)) flipped.delete(id); else flipped.add(id);
      FP.sound.play('pop');
      render();
    }));
    if (g.phase === 'play' && !out) {
      const ql = h('div', { class: 'q-list' });
      FP.GW_QUESTIONS.forEach((q) => ql.append(h('button', { type: 'button', class: 'btn btn-sm', disabled: asked.has(q.k), onclick: () => { asked.add(q.k); room.send({ t: 'gw_ask', k: q.k }); render(); } }, q.q)));
      body.append(h('div', { class: 'gw-panel' },
        h('div', null, h('label', { class: 'lbl', text: 'Ask a yes/no question' }), ql),
        h('div', null, h('label', { class: 'lbl', text: 'Answers' }), h('div', { class: 'log' }, log.length ? log.slice().reverse().map(([k, a]) => logLine('You', k, a)) : h('div', { class: 'muted', text: 'No questions yet.' })))));
    }
    if (g.phase === 'reveal' && room.isHost) body.append(h('div', { class: 'row mt', style: { justifyContent: 'flex-end' } }, h('button', { class: 'btn btn-primary', type: 'button', onclick: () => room.send({ t: 'next' }) }, g.round >= g.rounds ? 'See results 🏆' : 'Next round ▶')));
  }

  return {
    mount(el) { body = el; },
    update(s) {
      st = s;
      if (s.game.round !== roundKey) { roundKey = s.game.round; reset(); }
      render();
    },
    onMsg(m) {
      if (m.t === 'gw_ans' && typeof m.k === 'string') {
        const a = !!m.a;
        log.push([m.k, a]);
        if (auto) autoFlip(st.game.board, flipped, m.k, a);
        FP.sound.play('pop');
        render();
      } else if (m.t === 'gw_res') {
        result = { ok: !!m.ok, pts: Number(m.pts) || 0 };
        FP.sound.play(m.ok ? 'good' : 'bad');
        render();
      }
    },
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
    g = {
      board, mine: FP.pick(board, rnd), cpuSecret: FP.pick(board, rnd),
      flipped: new Set(), cpuCands: new Set(board), myAsked: new Set(), cpuAsked: new Set(),
      log: [], turn: 'me', guessMode: false, over: null,
    };
    render();
  }

  function cpuTurn() {
    if (g.over) return;
    g.turn = 'cpu'; render();
    setTimeout(() => {
      if (g.over) return;
      const cands = [...g.cpuCands];
      if (cands.length === 1) {
        const c = FP.charById(cands[0]);
        g.log.push(['cpu-guess', c.name]);
        g.over = c.id === g.mine ? 'cpu' : 'me';
        if (g.over === 'me') FP.store.set('gw_wins', FP.store.get('gw_wins', 0) + 1);
        FP.sound.play(g.over === 'me' ? 'win' : 'bad');
        return render();
      }
      const opts = FP.GW_QUESTIONS.filter((q) => !g.cpuAsked.has(q.k)).map((q) => {
        const yes = cands.filter((id) => FP.charById(id).traits.has(q.k)).length;
        return { k: q.k, score: Math.min(yes, cands.length - yes) };
      }).filter((o) => o.score > 0);
      if (!opts.length) { // nothing left to ask: take a guess
        const pickId = FP.pick(cands);
        g.log.push(['cpu-guess', FP.charById(pickId).name]);
        if (pickId === g.mine) { g.over = 'cpu'; FP.sound.play('bad'); return render(); }
        g.cpuCands.delete(pickId); g.turn = 'me'; return render();
      }
      opts.sort((a, b) => b.score - a.score);
      const r = Math.random();
      const choice = diff === 'hard' || (diff === 'normal' && r < 0.6) ? opts[0] : FP.pick(opts);
      g.cpuAsked.add(choice.k);
      const ans = FP.charById(g.mine).traits.has(choice.k);
      cands.forEach((id) => { if (FP.charById(id).traits.has(choice.k) !== ans) g.cpuCands.delete(id); });
      g.log.push(['cpu', choice.k, ans]);
      g.turn = 'me';
      FP.sound.play('pop');
      render();
    }, 900);
  }

  function render() {
    FP.clear(root);
    const me = FP.charById(g.mine);
    const card = h('div', { class: 'card stage' });
    card.append(FP.ui.stageHead('guesswho', 'Classic mode vs the computer', null, null,
      h('div', { class: 'seg' }, ['easy', 'normal', 'hard'].map((d) => h('button', { type: 'button', class: d === diff ? 'on' : '', onclick: () => { diff = d; FP.store.set('gw_diff', d); render(); } }, d[0].toUpperCase() + d.slice(1))))));
    card.append(h('div', { class: 'row mb' },
      h('div', { class: 'secret-card' }, h('span', { style: { fontSize: '1.6rem' }, text: me.emoji }), h('div', null, h('div', { class: 'tiny muted', text: 'Your secret character' }), h('b', { text: me.name }))),
      h('span', { class: 'chip', text: '🤖 CPU has ' + g.cpuCands.size + ' left' }),
      h('span', { class: 'chip primary', text: g.over ? 'Game over' : g.turn === 'me' ? 'Your turn' : 'CPU is thinking…' }),
      h('span', { class: 'grow' }),
      h('button', { type: 'button', class: 'btn btn-sm', onclick: newGame }, '🔄 New game')));

    if (g.over) {
      const cs = FP.charById(g.cpuSecret);
      const won = g.over === 'me';
      card.append(h('div', { class: 'reveal-box mb' + (won ? '' : ' miss') }, h('b', { text: won ? '🎉 You win!' : '😔 The CPU wins this time.' }), ' The CPU\'s character was ', h('strong', { text: cs.name }), '.'));
    } else if (g.turn === 'me') {
      card.append(h('div', { class: 'row mb' },
        h('button', { type: 'button', class: 'btn ' + (g.guessMode ? 'btn-accent' : 'btn-primary'), onclick: () => { g.guessMode = !g.guessMode; render(); } }, g.guessMode ? 'Cancel guess' : '🎯 Make a guess'),
        h('label', { class: 'small row', style: { gap: '6px' } }, (() => { const cb = h('input', { type: 'checkbox' }); cb.checked = auto; cb.addEventListener('change', () => { auto = cb.checked; FP.store.set('gw_auto', auto); }); return cb; })(), 'Auto-flip'),
        h('span', { class: 'small muted grow', text: g.guessMode ? 'Tap the character you think the CPU picked. Wrong = you lose!' : 'Ask one question per turn, or make a guess.' })));
    }
    card.append(boardEl(g.board, g.flipped, { secret: g.over ? g.cpuSecret : null, guessing: g.guessMode }, (id) => {
      if (g.over) return;
      if (g.guessMode && g.turn === 'me') {
        const c = FP.charById(id);
        if (!confirm('Final answer: ' + c.name + '?')) return;
        g.over = id === g.cpuSecret ? 'me' : 'cpu';
        if (g.over === 'me') FP.store.set('gw_wins', FP.store.get('gw_wins', 0) + 1);
        g.log.push(['me-guess', c.name]);
        FP.sound.play(g.over === 'me' ? 'win' : 'bad');
        g.guessMode = false;
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
      if (e[0] === 'me') lg.append(logLine('You asked', e[1], e[2]));
      else if (e[0] === 'cpu') lg.append(logLine('CPU asked', e[1], e[2]));
      else lg.append(h('div', { text: (e[0] === 'cpu-guess' ? 'CPU guessed ' : 'You guessed ') + e[1] }));
    });
    if (!g.log.length) lg.append(h('div', { class: 'muted', text: 'You go first. Good luck!' }));
    card.append(h('div', { class: 'gw-panel' }, h('div', null, h('label', { class: 'lbl', text: 'Your questions' }), ql), h('div', null, h('label', { class: 'lbl', text: 'Game log' }), lg)));
    card.append(h('p', { class: 'tiny muted mt', text: 'Wins so far: ' + FP.store.get('gw_wins', 0) + ' · Want to play friends? Create a room from the home page and pick Bible Guess Who.' }));
    root.append(card);
  }
  newGame();
};
})();
