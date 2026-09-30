/* Data for Connections, Order It and the procedural Logic Grid puzzles. */
'use strict';

// Connections — each group lists MORE than 4 members; 4 are sampled per game for variety.
FP.CONN_GROUPS = [
  ['Fruit of the Spirit', ['Love', 'Joy', 'Peace', 'Patience', 'Kindness', 'Goodness', 'Faithfulness', 'Gentleness', 'Self-control']],
  ['Plagues of Egypt', ['Blood', 'Frogs', 'Gnats', 'Flies', 'Boils', 'Hail', 'Locusts', 'Darkness']],
  ['The Twelve Apostles', ['Peter', 'Andrew', 'James', 'John', 'Philip', 'Bartholomew', 'Thomas', 'Matthew', 'Thaddaeus', 'Simon']],
  ['Sons of Jacob', ['Reuben', 'Simeon', 'Levi', 'Judah', 'Dan', 'Naphtali', 'Gad', 'Asher', 'Issachar', 'Zebulun', 'Joseph', 'Benjamin']],
  ['The Four Gospels', ['Matthew', 'Mark', 'Luke', 'John']],
  ['Minor Prophets', ['Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi']],
  ['Letters of Paul', ['Romans', 'Galatians', 'Ephesians', 'Philippians', 'Colossians', 'Titus', 'Philemon', 'Corinthians']],
  ['Armour of God', ['Belt', 'Breastplate', 'Shoes', 'Shield', 'Helmet', 'Sword']],
  ['Bible Rivers', ['Jordan', 'Nile', 'Euphrates', 'Tigris', 'Pishon', 'Gihon', 'Jabbok']],
  ['Bible Mountains', ['Sinai', 'Carmel', 'Ararat', 'Moriah', 'Zion', 'Hermon', 'Tabor', 'Nebo', 'Horeb']],
  ['Judges of Israel', ['Othniel', 'Ehud', 'Shamgar', 'Deborah', 'Gideon', 'Jephthah', 'Samson', 'Tola']],
  ['Kings of Judah', ['Rehoboam', 'Asa', 'Jehoshaphat', 'Uzziah', 'Hezekiah', 'Josiah', 'Manasseh']],
  ['Instruments of Praise', ['Harp', 'Lyre', 'Timbrel', 'Trumpet', 'Cymbal', 'Psaltery', 'Pipe']],
  ['Famous Bible Animals', ['Lion', 'Donkey', 'Great fish', 'Raven', 'Dove', 'Serpent', 'Ram', 'Bear']],
  ['Churches of Revelation', ['Ephesus', 'Smyrna', 'Pergamum', 'Thyatira', 'Sardis', 'Philadelphia', 'Laodicea']],
  ['Parables of Jesus', ['Sower', 'Mustard seed', 'Lost coin', 'Prodigal son', 'Talents', 'Ten virgins', 'Leaven', 'Hidden treasure']],
  ['On Noah\'s Ark (people)', ['Noah', 'Shem', 'Ham', 'Japheth']],
  ['Books of the Law', ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy']],
  ['Poetry & Wisdom Books', ['Job', 'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Songs']],
  ['"I AM" Sayings of Jesus', ['Bread', 'Light', 'Door', 'Good Shepherd', 'Resurrection', 'Way', 'Vine']],
  ['Names of God (Hebrew)', ['Elohim', 'Adonai', 'El Shaddai', 'El Roi', 'Jehovah Jireh', 'Jehovah Nissi', 'Jehovah Rapha']],
  ['Queens in the Bible', ['Esther', 'Vashti', 'Jezebel', 'Sheba', 'Candace', 'Athaliah']],
  ['"Thank you" in African languages', ['Imela', 'Asante', 'Ngiyabonga', 'Medaase', 'E se']],
  ['"God" in African languages', ['Oluwa', 'Chineke', 'Mungu', 'Nyame', 'Olorun', 'Modimo']],
  ['Blessed are the…', ['Meek', 'Merciful', 'Peacemakers', 'Pure in heart', 'Poor in spirit', 'Persecuted']],
  ['Gifts for baby Jesus… and more', ['Gold', 'Frankincense', 'Myrrh']],
  ['Women who met the risen Jesus', ['Mary Magdalene', 'Joanna', 'Salome']],
  ['Paul\'s Travel Companions', ['Barnabas', 'Silas', 'Timothy', 'Luke', 'Titus', 'Mark']],
  ['Things in the Tabernacle', ['Ark', 'Lampstand', 'Altar', 'Veil', 'Showbread', 'Laver']],
  ['Wives of Jacob', ['Leah', 'Rachel', 'Bilhah', 'Zilpah']],
  ['Bible Trees & Plants', ['Cedar', 'Fig', 'Olive', 'Sycamore', 'Palm', 'Acacia', 'Hyssop']],
  ['Christmas Story', ['Manger', 'Shepherds', 'Star', 'Magi', 'Innkeeper', 'Angels']],
  ['Easter Story', ['Palm branches', 'Upper room', 'Cross', 'Empty tomb', 'Stone rolled', 'Gardener']],
  ['African Gospel Artists', ['Sinach', 'Mercy Chinwo', 'Rose Muhando', 'Joe Mettle', 'Solly Mahlangu', 'Diana Hamilton', 'Moses Bliss']],
  ['Hymn Writers', ['Wesley', 'Watts', 'Crosby', 'Newton', 'Toplady', 'Spafford']],
  ['Words of Praise', ['Hosanna', 'Hallelujah', 'Amen', 'Maranatha', 'Glory']],
].filter((g) => g[1].length >= 4);

// Connections difficulty per group: 1 = well known, 2 = needs some Bible knowledge, 3 = deep cut.
FP.CONN_LEVEL = {
  'Fruit of the Spirit': 1, 'Plagues of Egypt': 1, 'The Twelve Apostles': 1, 'The Four Gospels': 1, 'Famous Bible Animals': 1,
  'Parables of Jesus': 1, 'On Noah\'s Ark (people)': 1, 'Christmas Story': 1, 'Easter Story': 1, 'Words of Praise': 1, 'Books of the Law': 1,
  'Sons of Jacob': 2, 'Minor Prophets': 2, 'Letters of Paul': 2, 'Armour of God': 2, 'Bible Rivers': 2, 'Bible Mountains': 2,
  'Instruments of Praise': 2, 'Poetry & Wisdom Books': 2, '"I AM" Sayings of Jesus': 2, 'Names of God (Hebrew)': 2, 'Queens in the Bible': 2,
  '"Thank you" in African languages': 2, '"God" in African languages': 2, 'Blessed are the…': 2, 'Bible Trees & Plants': 2, 'African Gospel Artists': 2,
  'Judges of Israel': 3, 'Kings of Judah': 3, 'Churches of Revelation': 3, 'Paul\'s Travel Companions': 3, 'Things in the Tabernacle': 3,
  'Wives of Jacob': 3, 'Hymn Writers': 3,
};
// Order It difficulty per set, and a famous-books subset for easy mode.
FP.ORDER_LEVEL = {
  'Books of the Bible': 2, 'Bible Timeline': 1, 'Life of Jesus': 1, 'Days of Creation': 1, 'Biggest Numbers': 1, 'Life of Moses': 2,
  'Life of David': 2, 'Holy Week': 2, 'Patriarchs & Leaders': 2, 'Life of Paul': 3, 'Family Line to David': 3, 'Judges of Israel': 3, 'Early Kings': 3,
};
FP.EASY_BOOKS = ['Genesis', 'Exodus', 'Ruth', 'Esther', 'Job', 'Psalms', 'Proverbs', 'Isaiah', 'Daniel', 'Jonah', 'Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans', 'Revelation'];

// Order It — each set is in the correct order; a random contiguous-or-sampled subset is shown.
FP.ORDER_SETS = [
  { title: 'Books of the Bible', hint: 'Put these books in Bible order', items: ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel', '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra', 'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Songs', 'Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi', 'Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James', '1 Peter', '2 Peter', '1 John', '2 John', '3 John', 'Jude', 'Revelation'], weight: 3 },
  { title: 'Bible Timeline', hint: 'Oldest event first', items: ['Creation', 'The Flood', 'Tower of Babel', 'Call of Abraham', 'Joseph sold into Egypt', 'The Exodus', 'Fall of Jericho', 'David becomes king', 'Solomon builds the temple', 'Kingdom divides', 'Exile to Babylon', 'Return & rebuilding', 'Birth of Jesus', 'Crucifixion & resurrection', 'Pentecost', 'Paul\'s journeys'], weight: 3 },
  { title: 'Life of Jesus', hint: 'In the order they happened', items: ['Born in Bethlehem', 'Flight to Egypt', 'Found in the temple aged 12', 'Baptised by John', 'Tempted in the wilderness', 'Water into wine at Cana', 'Transfiguration', 'Triumphal entry', 'Last Supper', 'Prayer in Gethsemane', 'Crucifixion', 'Resurrection', 'Ascension'], weight: 2 },
  { title: 'Days of Creation', hint: 'Day 1 first', items: ['Light', 'Sky & waters divided', 'Land, seas & plants', 'Sun, moon & stars', 'Birds & sea creatures', 'Land animals & people', 'God rests'], weight: 2 },
  { title: 'Life of Moses', hint: 'In the order they happened', items: ['Placed in a basket on the Nile', 'Raised in Pharaoh\'s palace', 'Flees to Midian', 'The burning bush', 'The ten plagues', 'Crossing the Red Sea', 'Ten Commandments', 'The golden calf', 'Views the Promised Land'], weight: 2 },
  { title: 'Life of David', hint: 'In the order they happened', items: ['Anointed by Samuel', 'Plays harp for Saul', 'Defeats Goliath', 'Flees from Saul', 'Crowned king', 'Brings the ark to Jerusalem', 'Sin with Bathsheba', 'Absalom\'s rebellion'], weight: 1 },
  { title: 'Life of Paul', hint: 'In the order they happened', items: ['Watches Stephen\'s stoning', 'Damascus road conversion', 'Escapes in a basket', 'First missionary journey', 'Jail in Philippi', 'Preaches in Athens', 'Arrested in Jerusalem', 'Shipwrecked on Malta', 'Arrives in Rome'], weight: 1 },
  { title: 'Family Line to David', hint: 'Earliest ancestor first', items: ['Abraham', 'Isaac', 'Jacob', 'Judah', 'Boaz', 'Obed', 'Jesse', 'David', 'Solomon'], weight: 1 },
  { title: 'Judges of Israel', hint: 'Earliest first', items: ['Othniel', 'Ehud', 'Deborah', 'Gideon', 'Jephthah', 'Samson', 'Eli', 'Samuel'], weight: 1 },
  { title: 'Early Kings', hint: 'First to reign first', items: ['Saul', 'David', 'Solomon', 'Rehoboam', 'Hezekiah', 'Josiah', 'Zedekiah'], weight: 1 },
  { title: 'Holy Week', hint: 'In the order they happened', items: ['Triumphal entry', 'Temple cleansed', 'Last Supper', 'Arrest in Gethsemane', 'Peter\'s denial', 'Trial before Pilate', 'Crucifixion', 'Burial', 'Empty tomb'], weight: 1 },
  { title: 'Patriarchs & Leaders', hint: 'Earliest first', items: ['Adam', 'Enoch', 'Noah', 'Abraham', 'Jacob', 'Joseph', 'Moses', 'Joshua', 'Samuel', 'David'], weight: 1 },
  { title: 'Biggest Numbers', hint: 'Smallest first', items: ['Days Jonah was in the fish (3)', 'Loaves that fed 5,000 (5)', 'Tribes of Israel (12)', 'Days of rain in the flood (40)', 'Gideon\'s army (300)', 'Methuselah\'s age (969)'], weight: 1 },
];

// Logic Grid themes — every puzzle stars Bible characters. The scenarios are imaginary
// ("what if…") so any combination can be the answer; the fun is in the deduction.
// Numeric categories are ordered (index = rank) and allow comparison clues.
FP.LOGIC_THEMES = [
  {
    id: 'fishing', title: 'Fishing on Galilee', icon: '🎣',
    intro: 'Imagine the disciples split up for a night of fishing, each in a different boat with different bait.',
    who: { label: 'Disciple', items: ['Peter', 'Andrew', 'James', 'John', 'Thomas', 'Philip', 'Nathanael', 'Matthew'] },
    cats: [
      { label: 'Fish', numeric: true, items: ['3 fish', '5 fish', '7 fish', '9 fish', '11 fish', '13 fish'], ref: 'the disciple who caught {x}', has: 'caught {x}', not: 'did not catch {x}', more: 'caught more fish than', less: 'caught fewer fish than', next: 'caught exactly two more fish than' },
      { label: 'Boat', items: ['red', 'blue', 'green', 'white', 'yellow'], ref: 'the disciple in the {x} boat', has: 'sailed the {x} boat', not: 'did not sail the {x} boat' },
      { label: 'Bait', items: ['bread', 'worms', 'figs', 'crickets', 'barley'], ref: 'the disciple who used {x}', has: 'used {x}', not: 'did not use {x}' },
    ],
  },
  {
    id: 'cana', title: 'The Wedding Feast at Cana', icon: '🍷',
    intro: 'Imagine friends of Jesus arriving at the wedding in Cana, each bringing a dish and a gift for the couple.',
    who: { label: 'Guest', items: ['Mary', 'Martha', 'Lazarus', 'Nicodemus', 'Zacchaeus', 'Joanna', 'Nathanael', 'Bartimaeus', 'Susanna'] },
    cats: [
      { label: 'Arrival', numeric: true, items: ['noon', '1 o\'clock', '2 o\'clock', '3 o\'clock', '4 o\'clock', '5 o\'clock'], ref: 'the guest who arrived at {x}', has: 'arrived at {x}', not: 'did not arrive at {x}', more: 'arrived later than', less: 'arrived earlier than', next: 'arrived exactly one hour after' },
      { label: 'Dish', items: ['barley loaves', 'figs', 'olives', 'lentil stew', 'honeycomb', 'dates'], ref: 'the guest who brought {x}', has: 'brought {x}', not: 'did not bring {x}' },
      { label: 'Gift', items: ['a lamp', 'a water jar', 'a linen cloth', 'a clay bowl', 'a basket', 'a flask of oil'], ref: 'the guest who gave {x}', has: 'gave {x}', not: 'did not give {x}' },
    ],
  },
  {
    id: 'temple', title: 'Temple Musicians', icon: '🎶',
    intro: 'Imagine a grand praise service where famous Bible singers each play an instrument and lead a Psalm.',
    who: { label: 'Musician', items: ['David', 'Asaph', 'Miriam', 'Deborah', 'Heman', 'Jeduthun', 'Hannah', 'Chenaniah'] },
    cats: [
      { label: 'Row', numeric: true, items: ['row 1', 'row 2', 'row 3', 'row 4', 'row 5', 'row 6'], ref: 'the musician in {x}', has: 'stood in {x}', not: 'did not stand in {x}', more: 'stood further back than', less: 'stood nearer the front than', next: 'stood exactly one row behind' },
      { label: 'Instrument', items: ['harp', 'lyre', 'cymbals', 'trumpet', 'timbrel', 'flute'], ref: 'the one playing the {x}', has: 'played the {x}', not: 'did not play the {x}' },
      { label: 'Psalm', items: ['Psalm 23', 'Psalm 46', 'Psalm 91', 'Psalm 100', 'Psalm 121', 'Psalm 150'], ref: 'the one who led {x}', has: 'led {x}', not: 'did not lead {x}' },
    ],
  },
  {
    id: 'mission', title: 'Paul\'s Mission Team', icon: '⛵',
    intro: 'Imagine Paul\'s companions each sent to a different city, travelling a different way and writing home a different number of letters.',
    who: { label: 'Missionary', items: ['Paul', 'Barnabas', 'Silas', 'Timothy', 'Luke', 'Titus', 'Mark', 'Priscilla', 'Apollos'] },
    cats: [
      { label: 'Letters', numeric: true, items: ['1 letter', '2 letters', '3 letters', '4 letters', '5 letters', '6 letters'], ref: 'the one who wrote {x}', has: 'wrote {x}', not: 'did not write {x}', more: 'wrote more letters than', less: 'wrote fewer letters than', next: 'wrote exactly one more letter than' },
      { label: 'City', items: ['Ephesus', 'Corinth', 'Philippi', 'Antioch', 'Athens', 'Thessalonica'], ref: 'the one sent to {x}', has: 'went to {x}', not: 'did not go to {x}' },
      { label: 'Travel', items: ['by ship', 'on foot', 'by donkey', 'by camel', 'by cart'], ref: 'the one who travelled {x}', has: 'travelled {x}', not: 'did not travel {x}' },
    ],
  },
  {
    id: 'shepherds', title: 'Shepherds\' Night Watch', icon: '🐑',
    intro: 'Imagine famous Bible shepherds keeping watch on different hills, each guarding a different-sized flock from a different danger.',
    who: { label: 'Shepherd', items: ['Abel', 'Jacob', 'Rachel', 'Moses', 'David', 'Amos', 'Zipporah'] },
    cats: [
      { label: 'Flock', numeric: true, items: ['10 sheep', '20 sheep', '30 sheep', '40 sheep', '50 sheep', '60 sheep'], ref: 'the shepherd with {x}', has: 'kept {x}', not: 'did not keep {x}', more: 'kept a bigger flock than', less: 'kept a smaller flock than', next: 'kept exactly ten more sheep than' },
      { label: 'Hill', items: ['Mount Tabor', 'Mount Carmel', 'Mount Hermon', 'Mount Gilead', 'Mount Nebo'], ref: 'the shepherd on {x}', has: 'watched on {x}', not: 'did not watch on {x}' },
      { label: 'Danger', items: ['a lion', 'a bear', 'a wolf', 'a jackal', 'a storm'], ref: 'the shepherd who faced {x}', has: 'faced {x}', not: 'did not face {x}' },
    ],
  },
  {
    id: 'well', title: 'At the Village Well', icon: '💧',
    intro: 'Imagine women of the Bible meeting at the well, each drawing a different number of jars and bringing a different animal.',
    who: { label: 'Woman', items: ['Rebekah', 'Rachel', 'Ruth', 'Naomi', 'Hannah', 'Abigail', 'Miriam', 'Esther', 'Lydia'] },
    cats: [
      { label: 'Jars', numeric: true, items: ['1 jar', '2 jars', '3 jars', '4 jars', '5 jars', '6 jars'], ref: 'the woman who drew {x}', has: 'drew {x}', not: 'did not draw {x}', more: 'drew more jars than', less: 'drew fewer jars than', next: 'drew exactly one more jar than' },
      { label: 'Animal', items: ['a camel', 'a donkey', 'a goat', 'a lamb', 'an ox'], ref: 'the woman with {x}', has: 'brought {x}', not: 'did not bring {x}' },
      { label: 'Village', items: ['Bethlehem', 'Nazareth', 'Bethany', 'Hebron', 'Shiloh', 'Jericho'], ref: 'the woman from {x}', has: 'came from {x}', not: 'did not come from {x}' },
    ],
  },
  {
    id: 'wall', title: 'Rebuilding the Wall', icon: '🧱',
    intro: 'Imagine Nehemiah\'s crew each repairing a different gate of Jerusalem with a different tool, working different numbers of days.',
    who: { label: 'Builder', items: ['Nehemiah', 'Ezra', 'Eliashib', 'Baruch', 'Meremoth', 'Shallum', 'Malchijah', 'Hanun'] },
    cats: [
      { label: 'Days', numeric: true, items: ['3 days', '4 days', '5 days', '6 days', '7 days', '8 days'], ref: 'the builder who worked {x}', has: 'worked {x}', not: 'did not work {x}', more: 'worked longer than', less: 'worked fewer days than', next: 'worked exactly one day longer than' },
      { label: 'Gate', items: ['Sheep Gate', 'Fish Gate', 'Valley Gate', 'Fountain Gate', 'Water Gate', 'Horse Gate'], ref: 'the builder at the {x}', has: 'repaired the {x}', not: 'did not repair the {x}' },
      { label: 'Tool', items: ['a hammer', 'a trowel', 'a chisel', 'a rope', 'a basket'], ref: 'the builder with {x}', has: 'used {x}', not: 'did not use {x}' },
    ],
  },
  {
    id: 'kings', title: 'The Kings\' Banquet', icon: '👑',
    intro: 'Imagine kings of Israel and Judah at one great banquet, each seated at a different place and bringing a different treasure.',
    who: { label: 'King', items: ['Saul', 'David', 'Solomon', 'Asa', 'Jehoshaphat', 'Hezekiah', 'Josiah', 'Uzziah'] },
    cats: [
      { label: 'Seat', numeric: true, items: ['seat 1', 'seat 2', 'seat 3', 'seat 4', 'seat 5', 'seat 6'], ref: 'the king in {x}', has: 'sat in {x}', not: 'did not sit in {x}', more: 'sat further down the table than', less: 'sat nearer the head of the table than', next: 'sat directly after' },
      { label: 'Treasure', items: ['gold', 'cedar wood', 'spices', 'ivory', 'silver', 'precious stones'], ref: 'the king who brought {x}', has: 'brought {x}', not: 'did not bring {x}' },
      { label: 'Robe', items: ['purple', 'scarlet', 'blue', 'white', 'gold-trimmed'], ref: 'the king in the {x} robe', has: 'wore the {x} robe', not: 'did not wear the {x} robe' },
    ],
  },
  {
    id: 'study', title: 'Early Church House Meetings', icon: '📖',
    intro: 'Imagine leaders of the early church each hosting one evening, reading a different scroll and serving a different meal.',
    who: { label: 'Host', items: ['Lydia', 'Silas', 'Priscilla', 'Aquila', 'Phoebe', 'Titus', 'Dorcas', 'Apollos', 'Cornelius'] },
    cats: [
      { label: 'Day', numeric: true, items: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], ref: 'the one who hosted on {x}', has: 'hosted on {x}', not: 'did not host on {x}', more: 'hosted later in the week than', less: 'hosted earlier in the week than', next: 'hosted the day after' },
      { label: 'Scroll', items: ['Genesis', 'Psalms', 'Isaiah', 'Ruth', 'Daniel', 'Proverbs'], ref: 'the one who read {x}', has: 'read from {x}', not: 'did not read from {x}' },
      { label: 'Meal', items: ['bread and fish', 'lentil stew', 'figs and cheese', 'roast lamb', 'barley cakes'], ref: 'the one who served {x}', has: 'served {x}', not: 'did not serve {x}' },
    ],
  },
];
