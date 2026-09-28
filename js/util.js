/* FaithPlay.io — shared utilities (DOM, RNG, text matching, storage, sound, security helpers) */
'use strict';

const FP = (window.FP = window.FP || {});

// Frame-busting: refuse to run inside someone else's frame (clickjacking defence).
if (window.top !== window.self) {
  try { window.top.location = window.self.location.href; } catch (e) { document.documentElement.textContent = ''; }
  throw new Error('FaithPlay refuses to run in a frame');
}

/* ------------------------------------------------------------------ */
/* DOM helper — builds elements safely. Text is ALWAYS set via text   */
/* nodes, never innerHTML, so user-supplied strings cannot inject HTML */
/* ------------------------------------------------------------------ */
FP.h = function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'style') Object.assign(el.style, v);
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'href' && typeof v === 'string' && !/^(#|https?:)/.test(v)) continue; // no javascript: urls
      else el.setAttribute(k, v === true ? '' : String(v));
    }
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return el;
};
FP.$ = (sel, root = document) => root.querySelector(sel);
FP.clear = (el) => { while (el.firstChild) el.removeChild(el.firstChild); return el; };

/* ------------------------------------------------------------------ */
/* Randomness                                                         */
/* ------------------------------------------------------------------ */
// Cryptographically secure random integer in [0, n)
FP.secureInt = function (n) {
  const buf = new Uint32Array(1);
  const limit = Math.floor(0xffffffff / n) * n;
  do { crypto.getRandomValues(buf); } while (buf[0] >= limit);
  return buf[0] % n;
};
// Unambiguous alphabet for room codes (no 0/O/1/I/L)
FP.randomCode = function (len = 6) {
  const alpha = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < len; i++) s += alpha[FP.secureInt(alpha.length)];
  return s;
};
// Seeded PRNG (mulberry32) — used for shareable puzzles
FP.rng = function (seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
FP.hashStr = function (str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
};
FP.newSeed = () => FP.secureInt(2 ** 31);
FP.mathRng = () => FP.rng(FP.newSeed());
FP.shuffle = function (arr, rnd = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
FP.pick = (arr, rnd = Math.random) => arr[Math.floor(rnd() * arr.length)];
FP.sample = (arr, n, rnd = Math.random) => FP.shuffle(arr, rnd).slice(0, n);

/* ------------------------------------------------------------------ */
/* Text normalisation & fuzzy matching for typed answers              */
/* ------------------------------------------------------------------ */
FP.norm = function (s) {
  return String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\b(the|a|an)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};
FP.lev = function (a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
};
// Returns 'yes' | 'close' | 'no'
FP.checkAnswer = function (guess, answers) {
  const g = FP.norm(guess);
  if (!g) return 'no';
  let close = false;
  for (const a of answers) {
    const n = FP.norm(a);
    if (!n) continue;
    if (g === n || g.replace(/ /g, '') === n.replace(/ /g, '')) return 'yes';
    const d = FP.lev(g, n);
    // tolerate small typos on longer answers ("Zacheus" -> Zacchaeus)
    if (d <= (n.length >= 8 ? 2 : n.length >= 5 ? 1 : 0)) return 'yes';
    if (d <= Math.max(1, Math.floor(n.length / 4))) close = true;
  }
  return close ? 'close' : 'no';
};

/* ------------------------------------------------------------------ */
/* Input sanitising                                                   */
/* ------------------------------------------------------------------ */
const BAD_WORDS = ['fuck', 'shit', 'bitch', 'cunt', 'nigger', 'nigga', 'faggot', 'whore', 'slut', 'dick', 'pussy', 'bastard', 'asshole', 'retard', 'porn'];
const BAD_RE = new RegExp('(' + BAD_WORDS.join('|') + ')', 'gi');
FP.cleanText = function (s, max = 120) {
  if (typeof s !== 'string') return '';
  return s
    .replace(/[\u0000-\u001f\u007f​-‏‪-‮⁦-⁩]/g, '') // control & bidi-override chars
    .slice(0, max)
    .replace(BAD_RE, (m) => '*'.repeat(m.length))
    .trim();
};
FP.cleanName = function (s) {
  const n = FP.cleanText(String(s || ''), 16).replace(/[<>"'`\\]/g, '').replace(/\s+/g, ' ');
  return n || 'Player';
};
FP.AVATARS = ['😇', '👑', '🕊️', '⭐', '🦁', '📜', '⛵', '🔥', '🌾', '🛡️', '🐑', '🍞', '🎺', '🌈', '🐟', '🪔'];
FP.cleanAvatar = (a) => (FP.AVATARS.includes(a) ? a : FP.AVATARS[0]);
FP.isObj = (o) => o !== null && typeof o === 'object' && !Array.isArray(o);
FP.clampInt = (v, lo, hi) => (Number.isInteger(v) && v >= lo && v <= hi ? v : null);

/* ------------------------------------------------------------------ */
/* Storage (safe: private mode / blocked storage must not break app)  */
/* ------------------------------------------------------------------ */
FP.store = {
  get(key, fallback) {
    try { const v = localStorage.getItem('fp_' + key); return v == null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
  },
  set(key, val) {
    try { localStorage.setItem('fp_' + key, JSON.stringify(val)); } catch (e) { /* ignore */ }
  },
};

// "Recently seen" tracker so repeated sessions surface fresh questions first.
FP.seen = {
  get(mode) { return new Set(FP.store.get('seen_' + mode, [])); },
  add(mode, ids) {
    const list = FP.store.get('seen_' + mode, []).filter((x) => !ids.includes(x)).concat(ids);
    FP.store.set('seen_' + mode, list.slice(-400));
  },
};
// Pick n items preferring ones not recently seen; stable ids come from keyFn.
FP.pickFresh = function (mode, pool, n, keyFn, rnd = Math.random) {
  const seen = FP.seen.get(mode);
  const fresh = FP.shuffle(pool.filter((x) => !seen.has(keyFn(x))), rnd);
  const stale = FP.shuffle(pool.filter((x) => seen.has(keyFn(x))), rnd);
  const out = fresh.concat(stale).slice(0, n);
  FP.seen.add(mode, out.map(keyFn));
  return out;
};

/* ------------------------------------------------------------------ */
/* UI feedback                                                        */
/* ------------------------------------------------------------------ */
FP.toast = function (msg, kind = '') {
  const box = document.getElementById('toasts');
  if (!box) return;
  const t = FP.h('div', { class: 'toast ' + kind, text: msg });
  box.append(t);
  setTimeout(() => t.remove(), 3200);
  while (box.children.length > 4) box.firstChild.remove();
};
FP.modal = function (content, { onClose } = {}) {
  const root = document.getElementById('modalRoot');
  const close = () => { back.remove(); document.removeEventListener('keydown', esc); onClose && onClose(); };
  const esc = (e) => { if (e.key === 'Escape') close(); };
  const back = FP.h('div', { class: 'modal-back', onclick: (e) => { if (e.target === back) close(); } },
    FP.h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true' }, content));
  root.append(back);
  document.addEventListener('keydown', esc);
  return close;
};
FP.copy = async function (text) {
  try { await navigator.clipboard.writeText(text); FP.toast('Copied to clipboard', 'ok'); }
  catch (e) {
    const ta = FP.h('textarea', { style: { position: 'fixed', opacity: '0' } });
    ta.value = text; document.body.append(ta); ta.select();
    try { document.execCommand('copy'); FP.toast('Copied to clipboard', 'ok'); } catch (e2) { FP.toast('Copy failed — select and copy manually', 'bad'); }
    ta.remove();
  }
};
FP.share = async function (title, url) {
  if (navigator.share) {
    try { await navigator.share({ title, url }); return; } catch (e) { /* cancelled */ }
  }
  FP.copy(url);
};
FP.baseUrl = () => location.origin + location.pathname;

/* ------------------------------------------------------------------ */
/* Sound — tiny Web Audio synth (no audio files needed)               */
/* ------------------------------------------------------------------ */
FP.sound = {
  enabled: FP.store.get('sound', true),
  ctx: null,
  _ctx() {
    if (!this.ctx) { const C = window.AudioContext || window.webkitAudioContext; if (C) this.ctx = new C(); }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  },
  tone(freq, start, dur, type = 'sine', vol = 0.12) {
    const ctx = this._ctx(); if (!ctx) return;
    const t0 = ctx.currentTime + start;
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(ctx.destination); o.start(t0); o.stop(t0 + dur + 0.05);
  },
  play(name) {
    if (!this.enabled) return;
    try {
      if (name === 'pop') this.tone(660, 0, 0.09, 'sine', 0.08);
      else if (name === 'good') [523, 659, 784].forEach((f, i) => this.tone(f, i * 0.08, 0.22, 'triangle', 0.14));
      else if (name === 'bad') { this.tone(220, 0, 0.18, 'sawtooth', 0.05); this.tone(180, 0.1, 0.25, 'sawtooth', 0.05); }
      else if (name === 'tick') this.tone(1200, 0, 0.04, 'square', 0.03);
      else if (name === 'join') [440, 660].forEach((f, i) => this.tone(f, i * 0.09, 0.15, 'sine', 0.08));
      else if (name === 'win') [523, 659, 784, 1047].forEach((f, i) => this.tone(f, i * 0.12, 0.35, 'triangle', 0.14));
    } catch (e) { /* audio not available */ }
  },
  // Melody string: "D4:1 G4:2 B4:.5" (note:beats). Always plays (user-initiated), even when effects muted? No — respects mute.
  _melodyTimer: null,
  melody(str, bpm = 100) {
    const ctx = this._ctx(); if (!ctx || typeof str !== 'string') return 0;
    const beat = 60 / bpm; let t = 0.05;
    const tokens = str.trim().split(/\s+/).slice(0, 64);
    for (const tok of tokens) {
      const m = /^([A-G])(#|b)?([2-6]):(\d*\.?\d+)$/.exec(tok);
      if (!m) continue;
      const dur = Math.min(4, parseFloat(m[4])) * beat;
      const f = FP.noteFreq(m[1], m[2], +m[3]);
      if (f) { this.tone(f, t, dur * 0.95, 'triangle', 0.16); this.tone(f * 2, t, dur * 0.6, 'sine', 0.03); }
      t += dur;
    }
    return t;
  },
};
FP.noteFreq = function (letter, acc, octave) {
  const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[letter];
  if (base == null) return 0;
  const semi = base + (acc === '#' ? 1 : acc === 'b' ? -1 : 0) + (octave - 4) * 12 - 9; // relative to A4
  return 440 * Math.pow(2, semi / 12);
};

FP.fmtTime = (ms) => Math.max(0, Math.ceil(ms / 1000)) + 's';
FP.plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
FP.hueFor = (str) => 'hsl(' + (FP.hashStr(str) % 360) + ' 70% 88%)';
