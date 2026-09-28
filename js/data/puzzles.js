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

// Logic Grid themes. Numeric categories are ordered (index = rank) and allow comparison clues.
FP.LOGIC_THEMES = [
  {
    id: 'fishing', title: 'Fishing on Galilee', icon: '🎣',
    intro: 'After a long night, some disciples came back with different catches in different boats.',
    who: { label: 'Disciple', items: ['Peter', 'Andrew', 'James', 'John', 'Thomas', 'Philip', 'Nathanael', 'Matthew'] },
    cats: [
      { label: 'Fish', numeric: true, items: ['3 fish', '5 fish', '7 fish', '9 fish', '11 fish'], ref: 'the disciple who caught {x}', has: 'caught {x}', not: 'did not catch {x}', more: 'caught more fish than', less: 'caught fewer fish than', next: 'caught exactly two more fish than' },
      { label: 'Boat', items: ['red', 'blue', 'green', 'white', 'yellow'], ref: 'the disciple in the {x} boat', has: 'sailed the {x} boat', not: 'did not sail the {x} boat' },
      { label: 'Bait', items: ['bread', 'worms', 'nets only', 'figs', 'crickets'], ref: 'the disciple who used {x}', has: 'used {x}', not: 'did not use {x}' },
    ],
  },
  {
    id: 'potluck', title: 'Church Potluck', icon: '🍲',
    intro: 'After Sunday service, each guest brought a dish and a drink and arrived at a different time.',
    who: { label: 'Guest', items: ['Ada', 'Kofi', 'Wanjiru', 'Thabo', 'Grace', 'Samuel', 'Chioma', 'Musa', 'Esther', 'Tendai'] },
    cats: [
      { label: 'Arrival', numeric: true, items: ['12:00', '12:15', '12:30', '12:45', '1:00'], ref: 'the guest who arrived at {x}', has: 'arrived at {x}', not: 'did not arrive at {x}', more: 'arrived later than', less: 'arrived earlier than', next: 'arrived exactly 15 minutes after' },
      { label: 'Dish', items: ['jollof rice', 'waakye', 'ugali', 'bobotie', 'chapati', 'suya'], ref: 'the guest who brought {x}', has: 'brought {x}', not: 'did not bring {x}' },
      { label: 'Drink', items: ['zobo', 'chai', 'sobolo', 'rooibos tea', 'ginger beer', 'lemonade'], ref: 'the guest with {x}', has: 'brought {x}', not: 'did not bring {x}' },
    ],
  },
  {
    id: 'choir', title: 'Choir Rehearsal', icon: '🎶',
    intro: 'The choir director assigned each singer a seat row, a voice part and a solo hymn.',
    who: { label: 'Singer', items: ['Abena', 'Daniel', 'Ruth', 'Tunde', 'Naledi', 'Joy', 'Kwame', 'Faith', 'Emeka'] },
    cats: [
      { label: 'Row', numeric: true, items: ['row 1', 'row 2', 'row 3', 'row 4', 'row 5'], ref: 'the singer in {x}', has: 'sits in {x}', not: 'does not sit in {x}', more: 'sits further back than', less: 'sits nearer the front than', next: 'sits exactly one row behind' },
      { label: 'Part', items: ['soprano', 'alto', 'tenor', 'bass', 'descant'], ref: 'the {x}', has: 'sings {x}', not: 'does not sing {x}' },
      { label: 'Solo', items: ['Amazing Grace', 'It Is Well', 'Rock of Ages', 'Blessed Assurance', 'Abide with Me'], ref: 'the singer with the "{x}" solo', has: 'sings the "{x}" solo', not: 'does not sing the "{x}" solo' },
    ],
  },
  {
    id: 'mission', title: 'Mission Trips', icon: '🌍',
    intro: 'Five missionaries each served in a different country, in a different year, on a different project.',
    who: { label: 'Missionary', items: ['Mary', 'John', 'Amara', 'Luis', 'Priya', 'Josiah', 'Zawadi', 'Elena', 'Kojo'] },
    cats: [
      { label: 'Year', numeric: true, items: ['2019', '2020', '2021', '2022', '2023'], ref: 'the missionary who went in {x}', has: 'went in {x}', not: 'did not go in {x}', more: 'went later than', less: 'went earlier than', next: 'went exactly one year after' },
      { label: 'Country', items: ['Ghana', 'Kenya', 'Brazil', 'India', 'Uganda', 'Peru'], ref: 'the missionary who served in {x}', has: 'served in {x}', not: 'did not serve in {x}' },
      { label: 'Project', items: ['a water well', 'a school', 'a clinic', 'a church roof', 'Bible translation'], ref: 'the missionary who worked on {x}', has: 'worked on {x}', not: 'did not work on {x}' },
    ],
  },
  {
    id: 'study', title: 'Bible Study Week', icon: '📖',
    intro: 'Members of a small group each led one evening, studying a different book and bringing a different snack.',
    who: { label: 'Leader', items: ['Lydia', 'Silas', 'Priscilla', 'Aquila', 'Phoebe', 'Titus', 'Dorcas', 'Apollos'] },
    cats: [
      { label: 'Day', numeric: true, items: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], ref: 'the one who led on {x}', has: 'led on {x}', not: 'did not lead on {x}', more: 'led later in the week than', less: 'led earlier in the week than', next: 'led the day after' },
      { label: 'Book', items: ['Genesis', 'Psalms', 'John', 'Romans', 'Acts', 'Ruth'], ref: 'the one who studied {x}', has: 'studied {x}', not: 'did not study {x}' },
      { label: 'Snack', items: ['puff-puff', 'mandazi', 'plantain chips', 'biscuits', 'samosas', 'kelewele'], ref: 'the one who brought {x}', has: 'brought {x}', not: 'did not bring {x}' },
    ],
  },
];
