/* Client-side views shared by room & solo play: stage header, quiz rounds. */
'use strict';
(() => {

FP.views = FP.views || {};
FP.ui = FP.ui || {};
const { h } = FP;

// Header with game icon, title, a subtitle and a live countdown.
FP.ui.stageHead = function (modeKey, sub, remaining, dur, extra) {
  const m = FP.MODES[modeKey] || { icon: '🎮', title: 'Game', hue: '#6c4cf1' };
  const deadline = remaining != null ? Date.now() + remaining : null;
  return h('div', null,
    h('div', { class: 'stage-head' },
      h('div', { class: 'title' },
        h('div', { class: 'game-icon', style: { '--hue': m.hue } }, m.icon),
        h('div', null, h('h2', { text: m.title }), sub ? h('div', { class: 'small muted', text: sub }) : null)),
      h('div', { class: 'row' }, extra || null, deadline ? h('div', { class: 'timer', dataset: { deadline: String(deadline) }, text: FP.fmtTime(remaining) }) : null)),
    deadline && dur ? h('div', { class: 'progress mb' }, h('i', { dataset: { deadline: String(deadline), dur: String(dur) }, style: { width: Math.round((remaining / dur) * 100) + '%' } })) : null);
};

FP.views.quiz = function (room) {
  let body; let key = null; let myPick = null; let myOk = false; let lastGained = 0; let myPass = null;
  let refs = {};

  function playMelody(q) {
    if (q.melody) FP.sound.melody(q.melody, q.bpm || 100);
  }

  function build(st) {
    const g = st.game; const q = g.q;
    FP.clear(body);
    refs = {};
    const answeredCount = h('span', { class: 'chip', text: g.answered.length + '/' + room.players.length + ' answered' });
    refs.answered = answeredCount;
    const chips = h('span', { class: 'row', style: { gap: '6px' } },
      g.revisit ? h('span', { class: 'chip warn', text: '↩ Skipped question' }) : null,
      g.waiting ? h('span', { class: 'chip', text: g.waiting + ' skipped to revisit' }) : null,
      room.solo ? null : answeredCount);
    const lvl = st.settings && st.settings.diff ? ' · ' + FP.DIFF_LABEL[st.settings.diff] : '';
    body.append(FP.ui.stageHead(st.mode, 'Question ' + Math.min(g.num, g.n) + ' of ' + g.n + lvl, g.phase === 'q' ? g.remaining : null, g.dur, chips));

    if (g.phase === 'skipped') {
      body.append(h('div', { class: 'q-card' }, h('div', { class: 'big-emoji', text: '⏭' }), h('div', { class: 'q-prompt', text: 'Skipped for now' }),
        h('div', { class: 'q-sub', text: 'We\'ll come back to this one after the other questions.' })));
      if (room.isHost) body.append(h('div', { class: 'row mt', style: { justifyContent: 'flex-end' } }, h('button', { class: 'btn btn-primary', type: 'button', onclick: () => room.send({ t: 'next' }) }, 'Continue ▶')));
      return;
    }
    const already = g.prior && g.prior.includes(room.me);

    const card = h('div', { class: 'q-card' },
      h('div', { class: 'q-cat', text: q.cat || '' }),
      h('div', { class: 'q-prompt', text: q.prompt }),
      q.sub ? h('div', { class: 'q-sub', text: q.sub }) : null,
      q.emoji ? h('div', { class: 'q-emoji', text: q.emoji }) : null,
      q.scramble ? h('div', { class: 'q-scramble', text: q.scramble }) : null);
    if (q.melody) card.append(h('button', { class: 'btn btn-sm mt', type: 'button', onclick: () => playMelody(q) }, '🔊 Play tune again'));
    if (q.type === 'scramble') { refs.mask = h('div', { class: 'q-mask', text: q.mask }); card.append(refs.mask); }
    if (q.type === 'clues') { refs.clues = h('div', { class: 'clues' }); card.append(refs.clues); renderClues(q); if (q.len) card.append(h('div', { class: 'q-sub', text: 'Answer has ' + q.len + ' letters' })); }
    const wrap = h('div', { class: 'q-wrap' }, card);
    body.append(wrap);

    if (q.kind === 'mc') {
      const grid = h('div', { class: 'choices' });
      q.choices.forEach((c, i) => {
        const b = h('button', { class: 'choice', type: 'button' }, h('span', { class: 'k', text: 'ABCD'[i] }), h('span', { text: c }));
        if (g.phase === 'q') {
          if (myPick === i) b.classList.add('picked');
          if (myPick != null || myPass || already) b.disabled = true;
          b.addEventListener('click', () => {
            if (myPick != null || myPass) return;
            myPick = i;
            if (refs.pass) refs.pass.remove();
            FP.sound.play('pop');
            room.send({ t: 'answer', c: i });
            grid.querySelectorAll('.choice').forEach((x) => { x.disabled = true; });
            b.classList.add('picked');
          });
        } else {
          b.disabled = true;
          const rv = g.reveal;
          if (i === rv.correct) b.classList.add('right');
          else if (myPick === i) b.classList.add('wrong');
          // Name who picked each option: red on wrong options, green on the right one.
          const pickers = Object.entries(rv.picks).filter(([, c]) => c === i).map(([pid]) => pid);
          if (!room.solo && pickers.length) b.append(h('span', { class: 'who' }, pickers.map((pid) => h('span', { text: pid === room.me ? 'You' : room.nameOf(pid) }))));
        }
        grid.append(b);
      });
      wrap.append(grid);
    } else if (g.phase === 'q' && !already) {
      const input = h('input', { class: 'input', maxlength: '60', placeholder: 'Type your answer…', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Your answer' });
      const form = h('form', { class: 'answer-bar', onsubmit: (e) => {
        e.preventDefault();
        const v = input.value.trim();
        if (!v || myOk) return;
        room.send({ t: 'answer', text: v });
        input.value = '';
      } }, input, h('button', { class: 'btn btn-primary', type: 'submit' }, 'Guess'));
      refs.input = input; refs.form = form;
      refs.feedback = h('div', { class: 'small muted', text: room.solo ? 'Unlimited guesses — be quick!' : 'Guesses also work in the chat. Wrong guesses are shown to everyone.' });
      wrap.append(form, refs.feedback);
      if (myOk) markCorrect();
      if (!myPass) setTimeout(() => input.focus(), 50);
    }

    if (g.phase === 'q') {
      if (already) wrap.append(h('div', { class: 'small muted', text: 'You answered this one the first time round — waiting for the players who skipped it.' }));
      else if (myPass) wrap.append(h('div', { class: 'small muted', text: myPass === 'skip' ? '⏭ Skipped — it comes back after the other questions.' : '🤷 No problem — waiting for the others…' }));
      else if (!myOk) {
        refs.pass = h('div', { class: 'skip-bar' },
          g.revisit ? null : h('button', { class: 'btn btn-sm', type: 'button', title: 'Come back to this question at the end', onclick: () => pass('skip') }, '⏭ Skip for now'),
          h('button', { class: 'btn btn-sm btn-ghost', type: 'button', onclick: () => pass('idk') }, '🤷 I don\'t know'));
        wrap.append(refs.pass);
      }
    }

    if (g.phase === 'reveal') {
      const rv = g.reveal;
      const mine = rv.gained[room.me] || 0;
      const got = mine > 0;
      const box = h('div', { class: 'reveal-box' + (got ? '' : ' miss') },
        h('div', null, h('b', { text: got ? '✔ Correct! +' + mine : (rv.idk || []).includes(room.me) ? '🤷 Now you know!' : (q.kind === 'mc' && myPick == null ? '⏰ Time\'s up!' : '✘ Not this time') }), ' Answer: ', h('strong', { text: rv.answer })),
        rv.explain ? h('div', { class: 'small', style: { marginTop: '4px' }, text: rv.explain }) : null);
      if (got && mine !== lastGained) { FP.sound.play('good'); lastGained = mine; } else if (!got && !(rv.idk || []).includes(room.me)) FP.sound.play('bad');
      wrap.append(box);
      if (!room.solo) {
        const row = h('div', { class: 'results-row' });
        room.players.forEach((p) => {
          const who = p.id === room.me ? 'You' : p.name;
          if (rv.gained[p.id]) row.append(h('span', { class: 'res-chip ok', text: '✔ ' + who + ' +' + rv.gained[p.id] }));
          else if (rv.wrong && p.id in rv.wrong) row.append(h('span', { class: 'res-chip bad', text: '✘ ' + who + (q.kind === 'mc' ? ' — ' + rv.wrong[p.id] : ' — "' + rv.wrong[p.id] + '"') }));
          else row.append(h('span', { class: 'res-chip none', text: (rv.idk || []).includes(p.id) ? '🤷 ' + who : '⏰ ' + who }));
        });
        wrap.append(row);
      }
      if (room.isHost) wrap.append(h('div', { class: 'row', style: { justifyContent: 'flex-end' } }, h('button', { class: 'btn btn-primary', type: 'button', onclick: () => room.send({ t: 'next' }) }, g.num >= g.n ? 'See results 🏆' : 'Next question ▶')));
    }
  }

  function pass(kind) {
    if (myPass || myOk || myPick != null) return;
    myPass = kind;
    FP.sound.play('pop');
    room.send({ t: kind });
    if (room.state) build(room.state);
  }

  function renderClues(q) {
    FP.clear(refs.clues);
    q.clues.forEach((c, i) => refs.clues.append(h('div', { class: 'clue' }, h('b', { text: 'Clue ' + (i + 1) }), c)));
    if (q.clues.length < q.totalClues) refs.clues.append(h('div', { class: 'tiny muted', text: (q.totalClues - q.clues.length) + ' more clue(s) coming…' }));
  }

  function markCorrect() {
    if (!refs.input) return;
    refs.input.disabled = true;
    refs.input.placeholder = 'You got it! 🎉';
    if (refs.feedback) { refs.feedback.textContent = 'Correct! Waiting for the others…'; refs.feedback.className = 'small'; refs.feedback.style.color = 'var(--ok)'; }
  }

  return {
    mount(el) { body = el; },
    update(st) {
      const g = st.game;
      const k = g.key + '|' + g.phase;
      if (k !== key) {
        const newQ = !key || key.split('|')[0] !== String(g.key);
        if (newQ) { myPick = null; myOk = false; lastGained = 0; myPass = null; }
        key = k;
        build(st);
        if (newQ && g.phase === 'q') setTimeout(() => playMelody(g.q), 250);
        return;
      }
      if (refs.answered) refs.answered.textContent = g.answered.length + '/' + room.players.length + ' answered';
      if (refs.clues && g.q.clues) renderClues(g.q);
      if (refs.mask && g.q.mask) refs.mask.textContent = g.q.mask;
    },
    onMsg(m) {
      if (m.t !== 'you') return;
      if (m.ok) { myOk = true; FP.sound.play('good'); markCorrect(); lastGained = m.pts; }
      else if (refs.form) { FP.sound.play('bad'); refs.form.classList.remove('shake'); void refs.form.offsetWidth; refs.form.classList.add('shake'); }
    },
  };
};

// Lobby (room only): host picks game & settings, guests wait.
FP.views.lobby = function (room) {
  let body;
  function setting(label, values, cur, fmt, key) {
    const seg = h('div', { class: 'seg' });
    values.forEach((v) => seg.append(h('button', { type: 'button', class: v === cur ? 'on' : '', disabled: !room.isHost, onclick: () => room.send({ t: 'settings', s: { [key]: v } }) }, fmt(v))));
    return h('div', null, h('label', { class: 'lbl', text: label }), seg);
  }
  return {
    mount(el) { body = el; },
    update(st) {
      FP.clear(body);
      const mode = FP.MODES[st.mode];
      if (room.solo) body.append(FP.ui.stageHead(st.mode, 'Solo game · choose your settings'));
      else body.append(h('div', { class: 'stage-head' }, h('div', null, h('h2', { text: room.isHost ? 'Pick a game' : 'Waiting for the host…' }), h('div', { class: 'small muted', text: room.isHost ? 'Everyone in the room plays together. Invite friends with the link.' : 'The host is choosing a game. Say hi in the chat 👋' }))));
      const grid = h('div', { class: 'mini-games' });
      FP.ROOM_MODES.forEach((k) => {
        const m = FP.MODES[k];
        grid.append(h('button', { type: 'button', class: 'game-card' + (k === st.mode ? ' sel' : ''), style: { '--hue': m.hue }, disabled: !room.isHost && k !== st.mode, onclick: () => room.isHost && room.send({ t: 'settings', s: { mode: k } }) },
          h('div', { class: 'game-icon', text: m.icon }), h('h3', { text: m.title })));
      });
      if (!room.solo) body.append(grid);
      const s = st.settings;
      const sets = h('div', { class: 'settings-grid mt' });
      if (mode.kind === 'quiz') {
        sets.append(setting('Difficulty', FP.DIFFS, s.diff, (v) => FP.DIFF_LABEL[v], 'diff'));
        sets.append(setting('Questions', [5, 10, 15, 20], s.rounds, String, 'rounds'));
        sets.append(setting('Seconds each', st.mode === 'whoami' ? [30, 45, 60] : st.mode === 'scramble' ? [20, 30, 45] : [10, 15, 20, 30], s.time, (v) => v + 's', 'time'));
        if (st.mode === 'trivia') {
          const sel = h('select', { class: 'select', disabled: !room.isHost, onchange: (e) => room.send({ t: 'settings', s: { cat: e.target.value } }) });
          FP.TRIVIA_CATS.forEach((c) => { const o = h('option', { value: c, text: c === 'all' ? 'All categories' : c }); if (c === s.cat) o.selected = true; sel.append(o); });
          sets.append(h('div', null, h('label', { class: 'lbl', text: 'Category' }), sel));
        }
      } else if (mode.kind === 'sketch') {
        sets.append(setting('Rounds', [1, 2, 3, 4, 5], s.rounds, String, 'rounds'));
        sets.append(setting('Draw time', [60, 80, 100, 120], s.time, (v) => v + 's', 'time'));
      } else if (mode.kind === 'gw') {
        sets.append(setting('Rounds', [1, 2, 3, 5], s.rounds, String, 'rounds'));
        sets.append(setting('Time per turn', [30, 60, 90, 120], s.time, (v) => v + 's', 'time'));
      } else if (mode.kind === 'puzzle') {
        if (st.mode !== 'faithle') sets.append(setting('Difficulty', FP.DIFFS, s.diff, (v) => FP.DIFF_LABEL[v], 'diff'));
        sets.append(setting('Puzzles', [1, 2, 3, 5], s.rounds, String, 'rounds'));
        sets.append(setting('Time limit', [120, 300, 480, 600], s.time, (v) => v / 60 + ' min', 'time'));
      }
      body.append(h('div', { class: 'card mt', style: { boxShadow: 'none', background: 'var(--surface-2)' } },
        h('div', { class: 'row' }, h('div', { class: 'game-icon', style: { '--hue': mode.hue }, text: mode.icon }), h('div', { class: 'grow' }, h('h3', { text: mode.title }), h('p', { class: 'small muted', text: mode.desc }))),
        mode.kind === 'gw' ? h('p', { class: 'tiny muted mt', text: 'Classic 1-v-1 duels: each player gets a secret character. Take turns asking yes/no questions (from the list or your own) — your opponent answers — until someone guesses. A wrong guess loses! With more than 2 players, everyone is paired up; with an odd number, one player sits out each round.' }) : null,
        mode.kind === 'sketch' ? h('p', { class: 'tiny muted mt', text: 'Needs at least 2 players. Guess by typing in the chat.' }) : null,
        mode.kind === 'puzzle' ? h('p', { class: 'tiny muted mt', text: 'Puzzle race: everyone gets the SAME puzzle and sees each other\'s progress live. Points for how well you solve it, plus a bonus for finishing first, second and third. When time runs out you still score for what you\'ve done.' }) : null,
        mode.kind === 'quiz' ? h('p', { class: 'tiny muted mt', text: 'Stuck? ⏭ Skip for now sends a question to the end so you can come back to it. 🤷 I don\'t know passes it. Easy = famous questions, 3 choices & extra time; Hard = deep cuts & less time.' + (room.solo ? '' : ' In rooms, a question is saved for later if anyone skips it.') }) : null,
        sets));
      if (room.isHost) {
        body.append(h('div', { class: 'row mt', style: { justifyContent: 'flex-end' } },
          room.solo ? null : h('span', { class: 'small muted', text: FP.plural(room.players.length, 'player') + ' ready' }),
          h('button', { class: 'btn btn-primary btn-lg', type: 'button', onclick: () => room.send({ t: 'start' }) }, '▶ Start game')));
      }
    },
  };
};

// End screen with podium.
FP.views.end = function (room) {
  let body;
  return {
    mount(el) { body = el; },
    update(st) {
      FP.clear(body);
      const res = st.results || [];
      FP.sound.play('win');
      const mode = FP.MODES[st.mode];
      body.append(h('div', { class: 'center' }, h('div', { class: 'big-emoji', text: '🏆' }), h('h2', { text: room.solo ? 'Well played!' : (res[0] ? res[0].name + ' wins!' : 'Game over') }), h('p', { class: 'muted small', text: mode.title + ' · final scores' })));
      if (room.solo) {
        const me = res[0];
        body.append(h('div', { class: 'center mt' }, h('div', { style: { fontSize: '2.6rem', fontWeight: '800', color: 'var(--primary)' }, text: (me ? me.score : 0) + ' pts' })));
        const best = FP.store.get('best_' + st.mode, 0);
        if (me && me.score > best) { FP.store.set('best_' + st.mode, me.score); body.append(h('p', { class: 'center small', text: '🎉 New personal best!' })); }
        else body.append(h('p', { class: 'center small muted', text: 'Personal best: ' + best }));
      } else {
        const pod = h('div', { class: 'podium' });
        [1, 0, 2].forEach((idx) => {
          const p = res[idx]; if (!p) return;
          pod.append(h('div', { class: 'step p' + (idx + 1) }, h('div', { class: 'av', text: p.avatar }), h('div', { class: 'nm', text: p.name }), h('div', { class: 'small muted', text: p.score + ' pts' }), h('div', { class: 'block', text: String(idx + 1) })));
        });
        body.append(pod);
        const rest = res.slice(3);
        if (rest.length) body.append(h('div', { class: 'players' }, rest.map((p, i) => h('div', { class: 'player' }, h('span', { class: 'rank', text: String(i + 4) }), h('span', { class: 'av', text: p.avatar }), h('span', { class: 'nm', text: p.name }), h('span', { class: 'pts', text: String(p.score) })))));
      }
      const btns = h('div', { class: 'row mt', style: { justifyContent: 'center' } });
      if (room.isHost) {
        btns.append(h('button', { class: 'btn btn-primary btn-lg', type: 'button', onclick: () => room.send({ t: 'start' }) }, '🔁 Play again'));
        btns.append(h('button', { class: 'btn btn-lg', type: 'button', onclick: () => room.send({ t: 'lobby' }) }, room.solo ? 'Change settings' : 'Choose another game'));
      } else btns.append(h('p', { class: 'muted small', text: 'Waiting for the host to start the next game…' }));
      if (room.solo) btns.append(h('a', { class: 'btn btn-lg', href: '#/' }, 'More games'));
      body.append(btns);
    },
  };
};
})();
