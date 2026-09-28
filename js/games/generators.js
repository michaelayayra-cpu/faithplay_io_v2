/* Game catalogue + question generators. Generators run on the host only;
   answers never leave the host until the round is revealed. */
'use strict';
(() => {

FP.MODES = {
  sketch: { title: 'Sketch & Guess', icon: '🎨', hue: '#f59e0b', kind: 'sketch', group: 'party', desc: 'Take turns drawing Bible stories, people & church life while everyone races to guess.', tags: ['2–12 players'], defaults: { rounds: 3, time: 80 } },
  guesswho: { title: 'Bible Guess Who', icon: '🕵️', hue: '#3b82f6', kind: 'gw', group: 'party', desc: 'Ask yes/no questions and flip down tiles to find the secret Bible character.', tags: ['Solo vs CPU', 'Room race'], defaults: { rounds: 3, time: 180 } },
  whoami: { title: 'Who Am I?', icon: '🎭', hue: '#a855f7', kind: 'quiz', group: 'quiz', desc: 'Clues appear one by one. Type the Bible figure — fewer clues, more points.', tags: ['Typed answers'], defaults: { rounds: 8, time: 45 } },
  song: { title: 'Guess the Song', icon: '🎵', hue: '#ec4899', kind: 'quiz', group: 'quiz', desc: 'Emoji songs, hum-that-hymn, who sings it & where it\'s from — African gospel to worldwide worship.', tags: ['Music', 'Global'], defaults: { rounds: 10, time: 20 } },
  lyrics: { title: 'Finish the Line', icon: '✍️', hue: '#f43f5e', kind: 'quiz', group: 'quiz', desc: 'Complete famous verses, classic hymns, spirituals and African choruses.', tags: ['Scripture', 'Hymns'], defaults: { rounds: 10, time: 20 } },
  trivia: { title: 'Bible Trivia', icon: '📖', hue: '#6c4cf1', kind: 'quiz', group: 'quiz', desc: 'Fast multiple-choice and true/false questions across both Testaments, Africa & church history.', tags: ['200+ questions'], defaults: { rounds: 10, time: 20, cat: 'all' } },
  whosaid: { title: 'Who Said It?', icon: '💬', hue: '#0ea5e9', kind: 'quiz', group: 'quiz', desc: 'Famous words from the King James Bible — can you name the speaker?', tags: ['KJV quotes'], defaults: { rounds: 10, time: 20 } },
  scramble: { title: 'Scripture Scramble', icon: '🔀', hue: '#14b8a6', kind: 'quiz', group: 'quiz', desc: 'Unscramble books, people, places and faith words before the letters give it away.', tags: ['Typed answers'], defaults: { rounds: 10, time: 30 } },
  mix: { title: 'Revival Mix', icon: '🎲', hue: '#22c55e', kind: 'quiz', group: 'quiz', desc: 'A bit of everything — trivia, songs, quotes, clues and scrambles shuffled together.', tags: ['Variety'], defaults: { rounds: 12, time: 20 } },
  logic: { title: 'Logic Grid', icon: '🧩', hue: '#8b5cf6', kind: 'puzzle', group: 'puzzle', desc: 'Sporcle-style deduction: use the clues to work out who did what. Endless puzzles.', tags: ['Solo', 'Shareable'] },
  connections: { title: 'Bible Connections', icon: '🔗', hue: '#eab308', kind: 'puzzle', group: 'puzzle', desc: 'Sort 16 words into 4 hidden groups. Watch out for red herrings!', tags: ['Solo', 'Shareable'] },
  orderit: { title: 'Order It', icon: '📅', hue: '#06b6d4', kind: 'puzzle', group: 'puzzle', desc: 'Drag books, events and lives into the right order.', tags: ['Solo', 'Shareable'] },
  faithle: { title: 'Faithle', icon: '🟩', hue: '#16a34a', kind: 'puzzle', group: 'puzzle', desc: 'Guess the five-letter faith word in six tries. New word every day.', tags: ['Daily', 'Solo'] },
};
FP.ROOM_MODES = Object.keys(FP.MODES).filter((k) => FP.MODES[k].kind !== 'puzzle');
FP.TRIVIA_CATS = ['all', 'Old Testament', 'New Testament', 'Bible Basics', 'Africa & the Bible', 'Church History'];

const mcq = (prompt, correct, wrongs, extra, rnd) => {
  const choices = FP.shuffle([correct, ...wrongs.slice(0, 3)], rnd);
  return Object.assign({ kind: 'mc', prompt, choices, correct: choices.indexOf(correct), answer: correct }, extra);
};
const otherValues = (list, correct, n, rnd) => FP.sample([...new Set(list.filter((v) => v !== correct))], n, rnd);

FP.GEN = {
  trivia(n, rnd, s = {}) {
    const cat = FP.TRIVIA_CATS.includes(s.cat) ? s.cat : 'all';
    const pool = [
      ...FP.TRIVIA.map((t) => ({ id: 'tr' + FP.hashStr(t[0]), cat: t[5], make: () => mcq(t[0], t[1], t.slice(2, 5), { cat: t[5] }, rnd) })),
      ...FP.TRUEFALSE.map((t) => ({ id: 'tf' + FP.hashStr(t[0]), cat: t[3], make: () => ({ kind: 'mc', prompt: t[0], sub: 'True or false?', choices: ['True', 'False'], correct: t[1] ? 0 : 1, answer: t[1] ? 'True' : 'False', explain: t[2], cat: t[3] }) })),
    ].filter((q) => cat === 'all' || q.cat === cat);
    return FP.pickFresh('trivia', pool, n, (q) => q.id, rnd).map((q) => q.make());
  },
  whosaid(n, rnd) {
    const speakers = FP.QUOTES.map((q) => q[1]);
    return FP.pickFresh('whosaid', FP.QUOTES, n, (q) => 'q' + FP.hashStr(q[0]), rnd).map((q) =>
      mcq('“' + q[0] + '”', q[1], rnd() < 0.7 ? q.slice(2, 5) : otherValues(speakers, q[1], 3, rnd), { sub: 'Who said it?', cat: 'Who Said It', explain: q[5] + ' (KJV)' }, rnd));
  },
  lyrics(n, rnd) {
    return FP.pickFresh('lyrics', FP.LYRICS, n, (q) => 'l' + FP.hashStr(q[0]), rnd).map((q) =>
      mcq(q[0], q[1], q.slice(2, 5), { sub: 'Fill in the blank', cat: 'Finish the Line', explain: q[5] }, rnd));
  },
  song(n, rnd) {
    const titles = FP.SONGS.map((s) => s[0]);
    const artists = FP.SONGS.map((s) => s[1]);
    const countries = [...new Set(FP.SONGS.map((s) => s[2]))];
    const hymnTitles = FP.HYMN_EMOJI.map((h) => h[0]);
    const pool = [];
    FP.SONGS.forEach((s) => {
      const [title, artist, country, emoji] = s;
      const by = title + ' — ' + artist + ' (' + country + ')';
      pool.push({ id: 'sa' + FP.hashStr(title), w: 2.5, make: () => mcq('Who sings "' + title + '"?', artist, otherValues(artists.filter((a) => a !== artist), artist, 3, rnd), { cat: 'Who Sings It?', explain: by }, rnd) });
      pool.push({ id: 'sc' + FP.hashStr(title), w: 2, make: () => mcq('"' + title + '" by ' + artist + ' comes from which country?', country, otherValues(countries, country, 3, rnd), { cat: 'Where in the World?', explain: by }, rnd) });
      if (emoji) pool.push({ id: 'se' + FP.hashStr(title), w: 3, make: () => mcq('Which song is this?', title, otherValues(titles, title, 3, rnd), { emoji, cat: 'Emoji Song', explain: by }, rnd) });
    });
    FP.HYMN_EMOJI.forEach(([title, emoji]) => pool.push({ id: 'he' + FP.hashStr(title), w: 1.5, make: () => mcq('Which hymn or spiritual is this?', title, otherValues(hymnTitles, title, 3, rnd), { emoji, cat: 'Emoji Hymn', explain: title + ' — public-domain classic' }, rnd) }));
    FP.MELODIES.forEach(([title, notes, bpm]) => pool.push({ id: 'hm' + FP.hashStr(title), w: 2, make: () => mcq('Name that hymn!', title, otherValues(FP.MELODIES.map((m) => m[0]).concat(hymnTitles), title, 3, rnd), { melody: notes, bpm, sub: 'Listen to the tune 🎹', cat: 'Hum That Hymn', explain: title }, rnd) }));
    FP.TONGUES.forEach((t) => pool.push({ id: 'tg' + FP.hashStr(t[0]), w: 1.5, make: () => mcq('What does "' + t[0] + '" mean?', t[1], t.slice(2, 5), { sub: t[5], cat: 'Praise in Many Tongues', explain: t[0] + ' = ' + t[1] + ' (' + t[5] + ')' }, rnd) }));
    // Weighted picking that favours unseen questions and never asks about the same song twice.
    const seen = FP.seen.get('song');
    const ranked = pool.map((q) => ({ q, r: rnd() * q.w * (seen.has(q.id) ? 0.15 : 1) })).sort((a, b) => b.r - a.r);
    const out = []; const usedKey = new Set(); const ids = [];
    for (const { q } of ranked) {
      const key = q.id.slice(2);
      if (usedKey.has(key)) continue;
      usedKey.add(key); ids.push(q.id); out.push(q.make());
      if (out.length >= n) break;
    }
    FP.seen.add('song', ids);
    return out;
  },
  whoami(n, rnd) {
    return FP.pickFresh('whoami', FP.WHOAMI, n, (q) => 'w' + FP.hashStr(q.a), rnd).map((q) => ({
      kind: 'text', type: 'clues', prompt: 'Who am I?', sub: 'Type your guess — each new clue lowers the points', clues: q.clues.slice(), answer: q.a, acc: q.acc || [], cat: 'Who Am I?', time: 45,
    }));
  },
  scramble(n, rnd) {
    return FP.pickFresh('scramble', FP.SCRAMBLE, n, (q) => 's' + q[0], rnd).map(([w, hint]) => {
      let sc = w.toUpperCase();
      for (let i = 0; i < 8 && sc === w.toUpperCase(); i++) sc = FP.shuffle(w.toUpperCase().split(''), rnd).join('');
      return { kind: 'text', type: 'scramble', prompt: 'Unscramble the word', sub: 'Hint: ' + hint, scramble: sc, answer: w, acc: [], cat: 'Scripture Scramble', time: 30 };
    });
  },
  mix(n, rnd) {
    const kinds = ['trivia', 'trivia', 'song', 'song', 'lyrics', 'whosaid', 'whoami', 'scramble'];
    const counts = {};
    for (let i = 0; i < n; i++) { const k = FP.pick(kinds, rnd); counts[k] = (counts[k] || 0) + 1; }
    const all = [];
    for (const [k, c] of Object.entries(counts)) all.push(...FP.GEN[k](c, rnd, {}));
    return FP.shuffle(all, rnd);
  },
};

// Guess Who board: n characters with all-distinct trait profiles (so every board is solvable by questions).
FP.gwBoard = function (rnd, n = 24) {
  const seen = new Set(); const out = [];
  for (const c of FP.shuffle(FP.CHARACTERS, rnd)) {
    const key = FP.traitKey(c);
    if (seen.has(key)) continue;
    seen.add(key); out.push(c.id);
    if (out.length >= n) break;
  }
  return out;
};
})();
