/* Game catalogue + question generators. Generators run on the host only;
   answers never leave the host until the round is revealed. */
'use strict';
(() => {

FP.MODES = {
  sketch: { title: 'Sketch & Guess', icon: '🎨', hue: '#f59e0b', kind: 'sketch', group: 'party', desc: 'Take turns drawing Bible stories, people & church life while everyone races to guess.', tags: ['2–12 players'], defaults: { rounds: 3, time: 80 } },
  guesswho: { title: 'Bible Guess Who', icon: '🕵️', hue: '#3b82f6', kind: 'gw', group: 'party', desc: 'Classic Guess Who with illustrated Bible characters. Take turns asking yes/no questions — your opponent answers — until someone guesses.', tags: ['Solo vs CPU', '1-v-1 duels'], defaults: { rounds: 3, time: 60 } },
  whoami: { title: 'Who Am I?', icon: '🎭', hue: '#a855f7', kind: 'quiz', group: 'quiz', desc: 'Clues appear one by one. Type the Bible figure — fewer clues, more points.', tags: ['Typed answers'], defaults: { diff: 'medium', rounds: 8, time: 45 } },
  song: { title: 'Guess the Song', icon: '🎵', hue: '#ec4899', kind: 'quiz', group: 'quiz', desc: 'Emoji songs, hum-that-hymn, who sings it & where it\'s from — African gospel to worldwide worship.', tags: ['Music', 'Global'], defaults: { diff: 'medium', rounds: 10, time: 20 } },
  lyrics: { title: 'Finish the Line', icon: '✍️', hue: '#f43f5e', kind: 'quiz', group: 'quiz', desc: 'Complete famous verses, classic hymns, spirituals and African choruses.', tags: ['Scripture', 'Hymns'], defaults: { diff: 'medium', rounds: 10, time: 20 } },
  trivia: { title: 'Bible Trivia', icon: '📖', hue: '#6c4cf1', kind: 'quiz', group: 'quiz', desc: 'Fast multiple-choice and true/false questions across both Testaments, Africa & church history.', tags: ['200+ questions'], defaults: { diff: 'medium', rounds: 10, time: 20, cat: 'all' } },
  whosaid: { title: 'Who Said It?', icon: '💬', hue: '#0ea5e9', kind: 'quiz', group: 'quiz', desc: 'Famous words from the King James Bible — can you name the speaker?', tags: ['KJV quotes'], defaults: { diff: 'medium', rounds: 10, time: 20 } },
  scramble: { title: 'Scripture Scramble', icon: '🔀', hue: '#14b8a6', kind: 'quiz', group: 'quiz', desc: 'Unscramble books, people, places and faith words before the letters give it away.', tags: ['Typed answers'], defaults: { diff: 'medium', rounds: 10, time: 30 } },
  mix: { title: 'Revival Mix', icon: '🎲', hue: '#22c55e', kind: 'quiz', group: 'quiz', desc: 'A bit of everything — trivia, songs, quotes, clues and scrambles shuffled together.', tags: ['Variety'], defaults: { diff: 'medium', rounds: 12, time: 20 } },
  logic: { title: 'Clue Chain Grid', icon: '🧩', hue: '#8b5cf6', kind: 'puzzle', group: 'puzzle', desc: 'Sporcle-style click grid: solve one box to reveal a clue to the next — Bible people, places, objects & books.', tags: ['3 levels', 'Shareable'], defaults: { diff: 'medium', rounds: 1, time: 300 } },
  deduce: { title: 'Deduction Grid', icon: '🔎', hue: '#7c3aed', kind: 'puzzle', group: 'puzzle', desc: 'Classic logic-grid: use the clues to work out who did what. Endless puzzles.', tags: ['3 levels', 'Shareable'], defaults: { diff: 'medium', rounds: 1, time: 300 } },
  connections: { title: 'Bible Connections', icon: '🔗', hue: '#eab308', kind: 'puzzle', group: 'puzzle', desc: 'Sort 16 words into 4 hidden groups. Watch out for red herrings!', tags: ['Solo', 'Shareable'], defaults: { diff: 'medium', rounds: 1, time: 300 } },
  orderit: { title: 'Order It', icon: '📅', hue: '#06b6d4', kind: 'puzzle', group: 'puzzle', desc: 'Drag books, events and lives into the right order.', tags: ['Solo', 'Shareable'], defaults: { diff: 'medium', rounds: 1, time: 300 } },
  faithle: { title: 'Faithle', icon: '🟩', hue: '#16a34a', kind: 'puzzle', group: 'puzzle', desc: 'Guess the five-letter faith word in six tries. New word every day.', tags: ['Daily', 'Solo'], defaults: { diff: 'medium', rounds: 1, time: 300 } },
};
FP.ROOM_MODES = Object.keys(FP.MODES); // every game, puzzles included, can be played in a room
FP.TRIVIA_CATS = ['all', 'Old Testament', 'New Testament', 'Bible Basics', 'Africa & the Bible', 'Church History'];

FP.DIFFS = ['easy', 'medium', 'hard'];
FP.DIFF_LABEL = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
// Timer multiplier per difficulty
FP.DIFF_TIME = { easy: 1.5, medium: 1, hard: 0.75 };

// Difficulty tags (1 easy · 2 medium · 3 hard), matched on the start of the question text.
const LEVELS = {
  trivia: {
    1: ['Who built the ark', 'How many days and nights', 'Who was thrown into the lions', 'Who was swallowed by', 'Which giant did David', 'Who was Abraham\'s wife', 'Who was sold into slavery', 'Which city\'s walls', 'Samson\'s strength', 'Who was the first king', 'What did Solomon ask', 'Which three men survived', 'What sign did God give Noah', 'Who interpreted Pharaoh', 'Which sea did Israel', 'Who led Israel into', 'What gift from Jacob', 'What happened to Lot', 'Where did people try', 'Which king built the first', 'Who wrote most of the Psalms', 'What did Aaron make', 'How many days was Jonah', 'Where did God send Jonah', 'Who was the first murderer', 'How many years did Israel', 'Which prophet anointed David', 'What was David\'s job', 'Who was David\'s closest', 'How many plagues', 'Which book comes first', 'How many books are in the Protestant Bible', 'How many books are in the New', 'What are the first four', 'In which town was Jesus born', 'In which town did Jesus grow', 'Who baptised Jesus', 'In which river', 'What was Jesus\' first miracle', 'Who betrayed Jesus', 'For how many pieces', 'Who denied Jesus', 'Which disciple would not', 'Which tax collector climbed', 'Which Roman governor', 'On which day did Jesus rise', 'How many loaves', 'Whom did Jesus raise', 'What gifts did the wise men', 'Which angel announced', 'Which king ordered the killing', 'What does "Emmanuel"', 'Who was the first Christian martyr', 'On the road to which city', 'Which apostle was a tax', 'What was Peter\'s job', 'What is the last book of the Bible', 'Who walked on the water', 'In the Good Samaritan', 'In the parable of the lost sheep', 'What animals did the prodigal', 'What is the shortest verse', 'Who wrote the book of Revelation', 'What did John the Baptist eat', 'In which garden did Jesus', 'What title did Pilate', 'Which Gospel begins', 'Jesus said faith as small', 'How many times did Jesus tell', 'In which African country did Joseph', 'Where did Joseph and Mary flee', 'Which queen travelled', 'Which hymn did former', 'What does the word "gospel"', 'Which queen saved the Jews', 'What food did God send', 'How many sons did Jacob', 'Who was Ruth\'s mother-in-law', 'What was the name of Moses\' brother'],
    3: ['Which is the shortest book of the Old', 'Which judge was left-handed', 'Which prophet was told to marry', 'Which Persian king', 'Which king saw the handwriting', 'Who was Moses\' father-in-law', 'Who "walked with God', 'Jeremiah prophesied', 'Which young man fell asleep', 'Who was the runaway slave', 'Whose ear did Peter', 'Who was Timothy\'s mother', 'Who was chosen to replace', 'Who raised Dorcas', 'In Acts 13:1', 'Apollos, the eloquent', 'Which Ethiopian servant', 'Miriam and Aaron spoke', 'Simon, who carried', 'The Ethiopian official served', 'Which ancient African kingdom', 'Augustine of Hippo', 'Samuel Ajayi Crowther', 'In what year was the King James', 'Which hymn writer penned', 'Which famous preacher', 'Who was the high priest at', 'Where were the disciples first called', 'Who killed the commander Sisera', 'Which priest raised young Samuel', 'Who was Israel\'s first high priest', 'Who tricked Jacob', 'Most of the New Testament was', 'Who was the son of Abraham and Hagar'],
  },
  tf: {
    1: ['Jesus was born in Nazareth', 'Paul was one of', 'Samson killed a lion', 'Peter was a tax', 'Adam named', 'Daniel was thrown', 'Jonah went straight', 'Moses had a brother', 'King David built', 'The Bible was first written', 'At Jesus\' baptism', 'Elijah was taken', 'Lazarus had two sisters', 'Moses entered'],
    3: ['Noah took seven pairs', 'The book of Esther', 'The word "Trinity"', 'Joseph was sold for twenty', 'Rahab hid the spies', 'Solomon had 700', 'Goliath came from Gath', 'The Bible mentions brothers', 'Zacchaeus climbed'],
  },
  quotes: {
    1: ['Let there be light', 'Am I my brother', 'Whither thou goest', 'The LORD is my shepherd', 'Here am I; send me', 'Behold the Lamb', 'I am the way', 'It is finished', 'Suffer little children', 'My Lord and my God', 'What is truth', 'Who is this uncircumcised', 'I know not the man', 'Thou art the Christ'],
    3: ['Almost thou persuadest', 'Sirs, what must I do', 'Can there any good', 'Lord, by this time', 'Rabboni', 'Woe is me', 'Salvation is of the LORD', 'Let me die with', 'Who knoweth whether', 'Understandest thou', 'Lord, lay not', 'Who art thou, Lord', 'Let us also go', 'How long halt ye', 'Am I a dog'],
  },
  lyrics: {
    1: ['For God so loved', 'The LORD is my shepherd', 'In the beginning God', 'I can do all things', 'Amazing grace!', 'I once was lost', 'Jesus loves me!', 'Little ones to Him', 'This little light', 'He\'s got the whole', 'Joy to the world', 'Silent night', 'Give us this day', 'Ye are the ___ of', 'Ye are the light', 'I am the way', 'Rejoice in the Lord', 'Be still', 'Swing low', 'Go, tell it', 'Pray without', 'O come, all ye'],
    3: ['A mighty fortress', 'All hail the power', 'Abide with me', 'When peace, like', 'Leaning, leaning', 'Just as I am', 'Casting all your', 'For where two or three', 'Faith is the substance', 'A soft answer', 'He hath made every', 'The name of the LORD', 'Thuma Mina', '"Kum ba yah"', 'Charity suffereth', 'Blessed assurance', 'Crown Him', 'Pass me not', 'Trust and obey', 'I surrender all', 'Standing on the', 'When the roll is called', 'Delight thyself', 'Be Thou my', 'Were you there', 'Steal away'],
  },
  whoami: {
    1: ['Moses', 'Noah', 'David', 'Jonah', 'Daniel', 'Adam', 'Eve', 'Peter', 'Paul', 'Mary', 'Zacchaeus', 'Goliath', 'Lazarus', 'Samson', 'Esther', 'Joseph', 'Abraham', 'Judas Iscariot', 'John the Baptist', 'Solomon', 'Ruth', 'Thomas', 'Jacob', 'Pontius Pilate', 'Herod'],
    3: ['Apollos', 'Priscilla', 'Anna', 'Caleb', 'Lydia', 'Barnabas', 'Timothy', 'Methuselah', 'Nehemiah', 'Boaz', 'The Ethiopian eunuch', 'Simon of Cyrene', 'Elisha', 'Hannah', 'Andrew', 'Rahab', 'Stephen', 'Jeremiah', 'Deborah'],
  },
};
function levelOf(kind, text) {
  const L = LEVELS[kind];
  if (!L) return 2;
  if (L[1].some((p) => text.startsWith(p))) return 1;
  if (L[3].some((p) => text.startsWith(p))) return 3;
  return 2;
}
// Filter a pool to the chosen difficulty, widening if there aren't enough questions.
function byDiff(pool, diff, n) {
  const want = diff === 'easy' ? [1] : diff === 'hard' ? [3, 2] : [1, 2, 3];
  let out = pool.filter((q) => want.includes(q.lv));
  if (out.length < n && diff === 'easy') out = pool.filter((q) => q.lv <= 2);
  if (out.length < n) out = pool;
  // Hard mode: lean on the genuinely hard ones first
  if (diff === 'hard') { const hard = out.filter((q) => q.lv === 3); if (hard.length >= Math.ceil(n * 0.6)) out = hard.concat(FP.sample(out.filter((q) => q.lv !== 3), Math.max(0, n - Math.ceil(n * 0.6)))); }
  return out;
}
const dOf = (s) => (FP.DIFFS.includes(s && s.diff) ? s.diff : 'medium');

// Multiple choice. Easy mode shows 3 options instead of 4.
const mcq = (prompt, correct, wrongs, extra, rnd, diff) => {
  const w = wrongs.slice(0, diff === 'easy' ? 2 : 3);
  const choices = FP.shuffle([correct, ...w], rnd);
  return Object.assign({ kind: 'mc', prompt, choices, correct: choices.indexOf(correct), answer: correct }, extra);
};
const otherValues = (list, correct, n, rnd) => FP.sample([...new Set(list.filter((v) => v !== correct))], n, rnd);

FP.GEN = {
  trivia(n, rnd, s = {}) {
    const diff = dOf(s);
    const cat = FP.TRIVIA_CATS.includes(s.cat) ? s.cat : 'all';
    const pool = [
      ...FP.TRIVIA.map((t) => ({ id: 'tr' + FP.hashStr(t[0]), cat: t[5], lv: levelOf('trivia', t[0]), make: () => mcq(t[0], t[1], t.slice(2, 5), { cat: t[5] }, rnd, diff) })),
      ...FP.TRUEFALSE.map((t) => ({ id: 'tf' + FP.hashStr(t[0]), cat: t[3], lv: levelOf('tf', t[0]), make: () => ({ kind: 'mc', prompt: t[0], sub: 'True or false?', choices: ['True', 'False'], correct: t[1] ? 0 : 1, answer: t[1] ? 'True' : 'False', explain: t[2], cat: t[3] }) })),
    ].filter((q) => cat === 'all' || q.cat === cat);
    return FP.pickFresh('trivia', byDiff(pool, diff, n), n, (q) => q.id, rnd).map((q) => q.make());
  },
  whosaid(n, rnd, s = {}) {
    const diff = dOf(s);
    const speakers = FP.QUOTES.map((q) => q[1]);
    const pool = FP.QUOTES.map((q) => ({ q, id: 'q' + FP.hashStr(q[0]), lv: levelOf('quotes', q[0]) }));
    return FP.pickFresh('whosaid', byDiff(pool, diff, n), n, (x) => x.id, rnd).map(({ q }) =>
      mcq('“' + q[0] + '”', q[1], rnd() < 0.7 ? q.slice(2, 5) : otherValues(speakers, q[1], 3, rnd), { sub: 'Who said it?', cat: 'Who Said It', explain: q[5] + ' (KJV)' }, rnd, diff));
  },
  lyrics(n, rnd, s = {}) {
    const diff = dOf(s);
    const pool = FP.LYRICS.map((q) => ({ q, id: 'l' + FP.hashStr(q[0]), lv: levelOf('lyrics', q[0]) }));
    return FP.pickFresh('lyrics', byDiff(pool, diff, n), n, (x) => x.id, rnd).map(({ q }) =>
      mcq(q[0], q[1], q.slice(2, 5), { sub: 'Fill in the blank', cat: 'Finish the Line', explain: q[5] }, rnd, diff));
  },
  song(n, rnd, s = {}) {
    const diff = dOf(s);
    const titles = FP.SONGS.map((x) => x[0]);
    const artists = FP.SONGS.map((x) => x[1]);
    const countries = [...new Set(FP.SONGS.map((x) => x[2]))];
    const hymnTitles = FP.HYMN_EMOJI.map((x) => x[0]);
    const easyWords = ['Amen', 'Hallelujah', 'Hosanna', 'Emmanuel', 'Abba', 'Imela', 'Asante', 'Yesu', 'Baba', 'Gloria'];
    const pool = [];
    FP.SONGS.forEach(([title, artist, country, emoji]) => {
      const by = title + ' — ' + artist + ' (' + country + ')';
      pool.push({ id: 'sa' + FP.hashStr(title), w: 2.5, lv: 2, make: () => mcq('Who sings "' + title + '"?', artist, otherValues(artists.filter((a) => a !== artist), artist, 3, rnd), { cat: 'Who Sings It?', explain: by }, rnd, diff) });
      pool.push({ id: 'sc' + FP.hashStr(title), w: 2, lv: 3, make: () => mcq('"' + title + '" by ' + artist + ' comes from which country?', country, otherValues(countries, country, 3, rnd), { cat: 'Where in the World?', explain: by }, rnd, diff) });
      if (emoji) pool.push({ id: 'se' + FP.hashStr(title), w: 3, lv: 2, make: () => mcq('Which song is this?', title, otherValues(titles, title, 3, rnd), { emoji, cat: 'Emoji Song', explain: by }, rnd, diff) });
    });
    FP.HYMN_EMOJI.forEach(([title, emoji]) => pool.push({ id: 'he' + FP.hashStr(title), w: 1.5, lv: 1, make: () => mcq('Which hymn or spiritual is this?', title, otherValues(hymnTitles, title, 3, rnd), { emoji, cat: 'Emoji Hymn', explain: title + ' — public-domain classic' }, rnd, diff) }));
    FP.MELODIES.forEach(([title, notes, bpm]) => pool.push({ id: 'hm' + FP.hashStr(title), w: 2, lv: 1, make: () => mcq('Name that hymn!', title, otherValues(FP.MELODIES.map((m) => m[0]).concat(hymnTitles), title, 3, rnd), { melody: notes, bpm, sub: 'Listen to the tune 🎹', cat: 'Hum That Hymn', explain: title }, rnd, diff) }));
    FP.TONGUES.forEach((t) => pool.push({ id: 'tg' + FP.hashStr(t[0]), w: 1.5, lv: easyWords.includes(t[0]) ? 1 : 3, make: () => mcq('What does "' + t[0] + '" mean?', t[1], t.slice(2, 5), { sub: t[5], cat: 'Praise in Many Tongues', explain: t[0] + ' = ' + t[1] + ' (' + t[5] + ')' }, rnd, diff) }));
    // Easy: emoji hymns, hymn tunes, emoji songs, common words. Hard: artists, countries, rarer words.
    const allowed = diff === 'easy' ? pool.filter((q) => q.lv === 1 || q.id.startsWith('se')) : diff === 'hard' ? pool.filter((q) => q.lv >= 2) : pool;
    // Weighted picking that favours unseen questions and never asks about the same song twice.
    const seen = FP.seen.get('song');
    const ranked = allowed.map((q) => ({ q, r: rnd() * q.w * (seen.has(q.id) ? 0.15 : 1) })).sort((a, b) => b.r - a.r);
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
  whoami(n, rnd, s = {}) {
    const diff = dOf(s);
    const pool = FP.WHOAMI.map((q) => ({ q, id: 'w' + FP.hashStr(q.a), lv: levelOf('whoami', q.a) }));
    return FP.pickFresh('whoami', byDiff(pool, diff, n), n, (x) => x.id, rnd).map(({ q }) => ({
      kind: 'text', type: 'clues', prompt: 'Who am I?', sub: 'Type your guess — each new clue lowers the points', clues: q.clues.slice(), answer: q.a, acc: q.acc || [], cat: 'Who Am I?', time: 45,
      startClues: diff === 'easy' ? 2 : 1, showLen: diff === 'easy',
    }));
  },
  scramble(n, rnd, s = {}) {
    const diff = dOf(s);
    const pool = FP.SCRAMBLE.map((q) => ({ q, id: 's' + q[0], lv: q[0].length <= 5 ? 1 : q[0].length <= 8 ? 2 : 3 }));
    return FP.pickFresh('scramble', byDiff(pool, diff, n), n, (x) => x.id, rnd).map(({ q: [w, hint] }) => {
      let sc = w.toUpperCase();
      for (let i = 0; i < 8 && sc === w.toUpperCase(); i++) sc = FP.shuffle(w.toUpperCase().split(''), rnd).join('');
      return { kind: 'text', type: 'scramble', prompt: 'Unscramble the word', sub: diff === 'hard' ? 'No category hint on hard!' : 'Hint: ' + hint, scramble: sc, answer: w, acc: [], cat: 'Scripture Scramble', time: 30, hintAt: diff === 'easy' ? [0.2, 0.4, 0.6] : diff === 'hard' ? [0.7] : [0.35, 0.55, 0.75], firstLetter: diff === 'easy' };
    });
  },
  mix(n, rnd, s = {}) {
    const kinds = ['trivia', 'trivia', 'song', 'song', 'lyrics', 'whosaid', 'whoami', 'scramble'];
    const counts = {};
    for (let i = 0; i < n; i++) { const k = FP.pick(kinds, rnd); counts[k] = (counts[k] || 0) + 1; }
    const all = [];
    for (const [k, c] of Object.entries(counts)) all.push(...FP.GEN[k](c, rnd, { diff: s.diff }));
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
