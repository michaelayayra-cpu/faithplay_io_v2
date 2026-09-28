/* Sketch & Guess — client view. Drawing is done on a fixed 800×600 canvas so every
   player's copy is pixel-identical; ops are validated before rendering. */
'use strict';
(() => {
const { h } = FP;
const { W, H, PALETTE, SIZES } = FP.SK;

class Board {
  constructor(canvas) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d', { willReadFrequently: true });
    this.ops = [];
    this.bg();
  }
  bg() { this.ctx.fillStyle = '#ffffff'; this.ctx.fillRect(0, 0, W, H); }
  render(op) {
    const c = this.ctx;
    if (op.k === 'line') {
      c.strokeStyle = PALETTE[op.c]; c.fillStyle = PALETTE[op.c];
      c.lineWidth = SIZES[op.s]; c.lineCap = 'round'; c.lineJoin = 'round';
      const p = op.p;
      if (p.length === 2) { c.beginPath(); c.arc(p[0], p[1], SIZES[op.s] / 2, 0, Math.PI * 2); c.fill(); return; }
      c.beginPath(); c.moveTo(p[0], p[1]);
      for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]);
      c.stroke();
    } else if (op.k === 'fill') this.flood(op.x, op.y, PALETTE[op.c]);
  }
  apply(op) {
    if (op.k === 'clear') { this.ops = []; this.bg(); return; }
    if (op.k === 'undo') { this.undo(); return; }
    this.ops.push(op);
    this.render(op);
  }
  record(op) { this.ops.push(op); }
  undo() {
    const last = this.ops[this.ops.length - 1];
    if (!last) return;
    if (last.k === 'line') { const g = last.g; while (this.ops.length && this.ops[this.ops.length - 1].k === 'line' && this.ops[this.ops.length - 1].g === g) this.ops.pop(); }
    else this.ops.pop();
    this.redraw();
  }
  redraw() { this.bg(); for (const op of this.ops) this.render(op); }
  reset() { this.ops = []; this.bg(); }
  flood(x0, y0, hex) {
    x0 = Math.min(W - 1, x0); y0 = Math.min(H - 1, y0);
    const img = this.ctx.getImageData(0, 0, W, H); const d = img.data;
    const fr = parseInt(hex.slice(1, 3), 16), fg = parseInt(hex.slice(3, 5), 16), fb = parseInt(hex.slice(5, 7), 16);
    const i0 = (y0 * W + x0) * 4;
    const tr = d[i0], tg = d[i0 + 1], tb = d[i0 + 2];
    if (Math.abs(tr - fr) + Math.abs(tg - fg) + Math.abs(tb - fb) < 8) return;
    const tol = 90;
    const match = (i) => Math.abs(d[i] - tr) + Math.abs(d[i + 1] - tg) + Math.abs(d[i + 2] - tb) <= tol;
    const seen = new Uint8Array(W * H);
    const stack = [x0, y0];
    while (stack.length) {
      const y = stack.pop(); let x = stack.pop();
      while (x >= 0 && !seen[y * W + x] && match((y * W + x) * 4)) x--;
      x++;
      let up = false, down = false;
      while (x < W && !seen[y * W + x] && match((y * W + x) * 4)) {
        const p = y * W + x; const i = p * 4;
        d[i] = fr; d[i + 1] = fg; d[i + 2] = fb; d[i + 3] = 255; seen[p] = 1;
        if (y > 0) { const q = p - W; if (!seen[q] && match(q * 4)) { if (!up) { stack.push(x, y - 1); up = true; } } else up = false; }
        if (y < H - 1) { const q = p + W; if (!seen[q] && match(q * 4)) { if (!down) { stack.push(x, y + 1); down = true; } } else down = false; }
        x++;
      }
    }
    this.ctx.putImageData(img, 0, 0);
  }
}

FP.views.sketch = function (room) {
  let body, board, canvas, wrap, overlay, topEl, toolsEl, headEl, guessBar;
  let turnKey = null; let lastPhase = null;
  let color = 0, size = 1, tool = 'pen';
  let group = Math.floor(Math.random() * 1e6);
  let drawing = false, pending = [], lastPt = null, flushTimer = null;
  let st = null;

  const isDrawer = () => st && st.game.drawer === room.me && st.game.phase === 'draw';
  const send = (op) => room.send({ t: 'draw', op });

  function toCanvas(e) {
    const r = canvas.getBoundingClientRect();
    return [Math.max(0, Math.min(W, Math.round(((e.clientX - r.left) / r.width) * W))), Math.max(0, Math.min(H, Math.round(((e.clientY - r.top) / r.height) * H)))];
  }
  function flush(final) {
    if (pending.length >= 2) {
      const op = { k: 'line', g: group, c: tool === 'eraser' ? 1 : color, s: size, p: pending.slice(0, 400) };
      board.record(op);
      send(op);
    }
    pending = final ? [] : (lastPt ? lastPt.slice() : []);
  }
  function onDown(e) {
    if (!isDrawer()) return;
    e.preventDefault();
    canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
    const pt = toCanvas(e);
    if (tool === 'fill') { const op = { k: 'fill', c: color, x: pt[0], y: pt[1] }; board.apply(op); send(op); return; }
    drawing = true; group++;
    pending = pt.slice(); lastPt = pt;
    board.render({ k: 'line', c: tool === 'eraser' ? 1 : color, s: size, p: pt });
    clearInterval(flushTimer);
    flushTimer = setInterval(() => flush(false), 50);
  }
  function onMove(e) {
    if (!drawing) return;
    e.preventDefault();
    const pt = toCanvas(e);
    if (lastPt && Math.abs(pt[0] - lastPt[0]) + Math.abs(pt[1] - lastPt[1]) < 2) return;
    board.render({ k: 'line', c: tool === 'eraser' ? 1 : color, s: size, p: [lastPt[0], lastPt[1], pt[0], pt[1]] });
    pending.push(pt[0], pt[1]); lastPt = pt;
    if (pending.length >= 390) flush(false);
  }
  function onUp() {
    if (!drawing) return;
    drawing = false;
    clearInterval(flushTimer);
    if (pending.length === 2 && board.ops.every((o) => o.g !== group)) {
      const op = { k: 'line', g: group, c: tool === 'eraser' ? 1 : color, s: size, p: pending.slice() };
      board.record(op); send(op); pending = [];
    } else flush(true);
    lastPt = null;
  }

  function buildTools() {
    FP.clear(toolsEl);
    const pal = h('div', { class: 'palette' });
    PALETTE.forEach((hex, i) => pal.append(h('button', { type: 'button', class: 'swatch' + (i === color ? ' on' : ''), style: { background: hex }, 'aria-label': 'Colour ' + hex, onclick: () => { color = i; if (tool === 'eraser') tool = 'pen'; buildTools(); } })));
    const sizes = h('div', { class: 'row', style: { gap: '4px' } }, SIZES.map((s, i) => h('button', { type: 'button', class: 'tool' + (i === size ? ' on' : ''), title: 'Brush size', onclick: () => { size = i; buildTools(); } }, h('span', { class: 'size-dot', style: { width: Math.max(4, s * 0.8) + 'px', height: Math.max(4, s * 0.8) + 'px' } }))));
    const tools = h('div', { class: 'row', style: { gap: '4px' } },
      [['pen', '✏️', 'Pen'], ['fill', '🪣', 'Fill'], ['eraser', '🧽', 'Eraser']].map(([k, ic, t]) => h('button', { type: 'button', class: 'tool' + (tool === k ? ' on' : ''), title: t, 'aria-label': t, onclick: () => { tool = k; buildTools(); } }, ic)),
      h('button', { type: 'button', class: 'tool', title: 'Undo', 'aria-label': 'Undo', onclick: () => { board.undo(); send({ k: 'undo' }); } }, '↩️'),
      h('button', { type: 'button', class: 'tool', title: 'Clear', 'aria-label': 'Clear canvas', onclick: () => { board.apply({ k: 'clear' }); send({ k: 'clear' }); } }, '🗑️'));
    toolsEl.append(pal, sizes, tools);
  }

  function renderOverlay() {
    const g = st.game;
    FP.clear(overlay);
    overlay.hidden = g.phase === 'draw';
    const drawerName = room.nameOf(g.drawer);
    if (g.phase === 'choose') {
      if (g.drawer === room.me && room.skChoices) {
        overlay.append(h('div', { class: 'stack' }, h('h2', { text: 'Choose a word to draw' }),
          h('div', { class: 'word-choice' }, room.skChoices.words.map((w, i) => h('button', { type: 'button', class: 'btn btn-lg btn-accent', onclick: () => room.send({ t: 'pick', i }) }, w, h('span', { class: 'tiny', style: { opacity: '.7' }, text: ' · ' + (room.skChoices.cats[i] || '') })))),
          h('div', { class: 'small', style: { opacity: '.8' }, text: 'Tip: no letters or numbers in your drawing!' })));
      } else overlay.append(h('div', { class: 'stack' }, h('div', { class: 'big-emoji', text: '🤔' }), h('h2', { text: drawerName + ' is choosing a word…' })));
    } else if (g.phase === 'reveal') {
      const gained = Object.entries(g.gained || {});
      overlay.append(h('div', { class: 'stack' },
        h('div', { class: 'small', style: { opacity: '.8' }, text: 'The word was' }),
        h('h1', { text: g.word }),
        h('div', { class: 'small', text: gained.length ? gained.map(([id, p]) => room.nameOf(id) + ' +' + p).join(' · ') + ' · ' + drawerName + ' (artist) +' + g.drawerPts : 'Nobody guessed it this time 😅' })));
    }
  }

  function renderTop() {
    const g = st.game;
    FP.clear(topEl);
    const known = room.skWord && (g.drawer === room.me || g.guessed.includes(room.me));
    if (g.phase === 'draw') {
      if (g.drawer === room.me) topEl.append(h('span', { class: 'small muted', text: 'Draw:' }), h('span', { class: 'sk-word', style: { letterSpacing: '.05em' }, text: room.skWord || '' }));
      else if (known) topEl.append(h('span', { class: 'chip ok', text: '✔ You guessed it' }), h('span', { class: 'sk-word', style: { letterSpacing: '.05em' }, text: room.skWord }));
      else topEl.append(h('span', { class: 'sk-word', text: g.mask.replace(/ /g, '  ') }), h('span', { class: 'chip', text: g.mask.replace(/[^_]/g, '').length + ' letters · ' + (g.cat || '') }));
    } else if (g.phase === 'choose') topEl.append(h('span', { class: 'small muted', text: 'Get ready…' }));
  }

  function renderHead() {
    const g = st.game;
    const neu = FP.ui.stageHead('sketch', 'Round ' + g.round + ' of ' + g.rounds, g.phase === 'reveal' ? null : g.remaining, g.dur, h('span', { class: 'chip primary', text: '✏️ ' + room.nameOf(g.drawer) }));
    headEl.replaceWith(neu); headEl = neu;
  }

  return {
    mount(el) {
      body = el;
      headEl = h('div');
      topEl = h('div', { class: 'sk-top mb' });
      canvas = h('canvas', { width: String(W), height: String(H), 'aria-label': 'Drawing canvas' });
      overlay = h('div', { class: 'overlay' });
      wrap = h('div', { class: 'canvas-wrap' }, canvas, overlay);
      toolsEl = h('div', { class: 'tools' });
      const gi = h('input', { class: 'input', maxlength: '100', placeholder: 'Type your guess here…', autocomplete: 'off', 'aria-label': 'Guess' });
      guessBar = h('form', { class: 'answer-bar mt', onsubmit: (e) => { e.preventDefault(); const v = gi.value.trim(); if (v) room.send({ t: 'chat', text: v }); gi.value = ''; } }, gi, h('button', { class: 'btn btn-primary', type: 'submit' }, 'Guess'));
      body.append(headEl, topEl, wrap, toolsEl, guessBar);
      board = new Board(canvas);
      canvas.addEventListener('pointerdown', onDown);
      canvas.addEventListener('pointermove', onMove);
      canvas.addEventListener('pointerup', onUp);
      canvas.addEventListener('pointercancel', onUp);
      canvas.addEventListener('pointerleave', onUp);
    },
    update(s) {
      st = s;
      const g = s.game;
      const tk = g.round + ':' + g.drawer;
      if (tk !== turnKey) {
        turnKey = tk;
        board.reset();
        if (g.phase === 'choose') room.skWord = null;
        if (g.drawer !== room.me) room.skChoices = null;
      }
      if (g.phase !== lastPhase || g.phase === 'draw') {
        if (g.phase === 'draw' && lastPhase !== 'draw') FP.sound.play('pop');
        lastPhase = g.phase;
      }
      renderHead(); renderTop(); renderOverlay();
      const drawer = isDrawer();
      wrap.classList.toggle('can-draw', drawer);
      toolsEl.hidden = !drawer;
      if (drawer && !toolsEl.firstChild) buildTools();
      guessBar.hidden = drawer || g.phase !== 'draw' || g.guessed.includes(room.me);
    },
    onMsg(m) {
      if (m.t === 'draw') { const op = FP.validDrawOp(m.op); if (op) board.apply(op); }
      else if (m.t === 'draw_sync') {
        if (m.reset) board.reset();
        if (Array.isArray(m.ops)) m.ops.slice(0, 200).forEach((o) => { const op = FP.validDrawOp(o); if (op && op.k !== 'undo' && op.k !== 'clear') board.apply(op); });
      } else if (m.t === 'sk_choices') {
        if (st) renderOverlay(); // room controller already stored the (sanitised) choices
      } else if (m.t === 'sk_word') {
        if (st) { renderTop(); guessBar.hidden = true; }
      }
    },
    destroy() { clearInterval(flushTimer); },
  };
};
})();
