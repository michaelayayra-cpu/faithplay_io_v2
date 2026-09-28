// The 66 books of the Protestant canon, in order.
// [name, testament, section, chapters]
const RAW = [
  ['Genesis', 'OT', 'Law', 50], ['Exodus', 'OT', 'Law', 40], ['Leviticus', 'OT', 'Law', 27],
  ['Numbers', 'OT', 'Law', 36], ['Deuteronomy', 'OT', 'Law', 34],
  ['Joshua', 'OT', 'History', 24], ['Judges', 'OT', 'History', 21], ['Ruth', 'OT', 'History', 4],
  ['1 Samuel', 'OT', 'History', 31], ['2 Samuel', 'OT', 'History', 24], ['1 Kings', 'OT', 'History', 22],
  ['2 Kings', 'OT', 'History', 25], ['1 Chronicles', 'OT', 'History', 29], ['2 Chronicles', 'OT', 'History', 36],
  ['Ezra', 'OT', 'History', 10], ['Nehemiah', 'OT', 'History', 13], ['Esther', 'OT', 'History', 10],
  ['Job', 'OT', 'Poetry & Wisdom', 42], ['Psalms', 'OT', 'Poetry & Wisdom', 150], ['Proverbs', 'OT', 'Poetry & Wisdom', 31],
  ['Ecclesiastes', 'OT', 'Poetry & Wisdom', 12], ['Song of Solomon', 'OT', 'Poetry & Wisdom', 8],
  ['Isaiah', 'OT', 'Major Prophets', 66], ['Jeremiah', 'OT', 'Major Prophets', 52], ['Lamentations', 'OT', 'Major Prophets', 5],
  ['Ezekiel', 'OT', 'Major Prophets', 48], ['Daniel', 'OT', 'Major Prophets', 12],
  ['Hosea', 'OT', 'Minor Prophets', 14], ['Joel', 'OT', 'Minor Prophets', 3], ['Amos', 'OT', 'Minor Prophets', 9],
  ['Obadiah', 'OT', 'Minor Prophets', 1], ['Jonah', 'OT', 'Minor Prophets', 4], ['Micah', 'OT', 'Minor Prophets', 7],
  ['Nahum', 'OT', 'Minor Prophets', 3], ['Habakkuk', 'OT', 'Minor Prophets', 3], ['Zephaniah', 'OT', 'Minor Prophets', 3],
  ['Haggai', 'OT', 'Minor Prophets', 2], ['Zechariah', 'OT', 'Minor Prophets', 14], ['Malachi', 'OT', 'Minor Prophets', 4],
  ['Matthew', 'NT', 'Gospels', 28], ['Mark', 'NT', 'Gospels', 16], ['Luke', 'NT', 'Gospels', 24], ['John', 'NT', 'Gospels', 21],
  ['Acts', 'NT', 'History', 28],
  ['Romans', 'NT', 'Letters of Paul', 16], ['1 Corinthians', 'NT', 'Letters of Paul', 16], ['2 Corinthians', 'NT', 'Letters of Paul', 13],
  ['Galatians', 'NT', 'Letters of Paul', 6], ['Ephesians', 'NT', 'Letters of Paul', 6], ['Philippians', 'NT', 'Letters of Paul', 4],
  ['Colossians', 'NT', 'Letters of Paul', 4], ['1 Thessalonians', 'NT', 'Letters of Paul', 5], ['2 Thessalonians', 'NT', 'Letters of Paul', 3],
  ['1 Timothy', 'NT', 'Letters of Paul', 6], ['2 Timothy', 'NT', 'Letters of Paul', 4], ['Titus', 'NT', 'Letters of Paul', 3],
  ['Philemon', 'NT', 'Letters of Paul', 1],
  ['Hebrews', 'NT', 'General Letters', 13], ['James', 'NT', 'General Letters', 5], ['1 Peter', 'NT', 'General Letters', 5],
  ['2 Peter', 'NT', 'General Letters', 3], ['1 John', 'NT', 'General Letters', 5], ['2 John', 'NT', 'General Letters', 1],
  ['3 John', 'NT', 'General Letters', 1], ['Jude', 'NT', 'General Letters', 1],
  ['Revelation', 'NT', 'Prophecy', 22],
];

export const BOOKS = RAW.map(([name, t, section, chapters], i) => ({ name, t, section, chapters, order: i + 1 }));
