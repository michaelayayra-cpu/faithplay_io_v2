# Hallelujoy ✝️

*Hallelujah + joy.* Free Christian party games in the browser, in the spirit of skribbl.io. Create a room, share the link, and play with friends, family or your youth group. There's nothing to install and no sign-up.

## Games (14)

| Game | Type | Notes |
|---|---|---|
| 🎨 **Sketch & Guess** | Room (2–12) | Skribbl-style. The artist picks 1 of 3 words (~240 Bible/church words), everyone else guesses in chat. Includes letter hints, fill bucket, undo, and "close guess" notices. |
| 🕵️ **Bible Guess Who** | Solo vs CPU, or 1-v-1 duels in rooms | Illustrated portraits of 63 Bible characters; each board shows 24. Players take turns: ask a question from the list or type your own, and **your opponent answers Yes/No**. That includes the computer's questions in solo mode. A double-check warns if an answer seems to contradict the character card. Guess on your turn, but a wrong guess loses. With more than two players, everyone is paired into duels. |
| 🎭 **Who Am I?** | Solo / room | 56 figures. Clues are revealed one at a time, and fewer clues earn more points. Answers are typed and small typos are accepted. |
| 🎵 **Guess the Song** | Solo / room | 83 modern songs from Nigeria, Ghana, Kenya, Tanzania, Uganda, South Africa, the USA, UK, Australia, Canada, Mexico and Brazil. Rounds include emoji songs, *who sings it*, *which country*, **Hum That Hymn** (public-domain tunes synthesised in the browser) and *Praise in Many Tongues* (Imela, Medaase, Asante, Ngiyabonga…). |
| ✍️ **Finish the Line** | Solo / room | KJV verses, classic hymns, spirituals and African choruses (Siyahamba, Thuma Mina). |
| 📖 **Bible Trivia** | Solo / room | 210 questions (multiple choice plus true/false) across the Old and New Testaments, Bible basics, *Africa & the Bible* and church history. You can filter by category. |
| 💬 **Who Said It?** | Solo / room | 48 KJV quotes. |
| 🔀 **Scripture Scramble** | Solo / room | 149 words. Letter hints appear as the timer runs down. |
| 🎲 **Revival Mix** | Solo / room | A random mix of all the quiz types. |
| 🧩 **Clue Chain Grid** | Solo, shareable | Sporcle click-grid style. One box starts solved and every solved box gives a clue to another box ("Directly below me is my older sister"). You click that box and name the Bible person, place, object or book. Grids are 3×3 (easy), 4×4 (medium) or 5×5 (hard). Two clue styles: **Chain** (every box gives one clue) or **Branching** (some boxes give 2–3 clues for different boxes, so several are open at once and you solve them in any order). |
| 🔎 **Deduction Grid** | Solo, shareable | Classic logic-grid puzzles in imagined Bible scenes, **guaranteed to have exactly one solution**. Easy, medium and hard. |
| 🔗 **Bible Connections** | Solo, shareable | Group 16 words into 4 hidden categories. Groups are checked so each word fits only one of them. Easy shows the category names and allows 6 mistakes; hard uses deep-cut categories and allows 3. |
| 📅 **Order It** | Solo, shareable | Put books, timelines and lives in order. Easy: 4 items, 4 tries. Medium: 5–6 items, 3 tries. Hard: 7 items, 2 tries. |
| 🟩 **Faithle** | Daily | Wordle with 5-letter faith words. |

**Quiz options:**
- **Difficulty (Easy / Medium / Hard).** Easy uses famous questions, gives 3 choices instead of 4, adds extra time and more hints. Hard uses deep cuts and less time.
- **⏭ Skip for now.** Sends the question to the end, so you come back to it after the others. In a room, a question is saved for later if anyone skips it, and answers already given still count.
- **🤷 I don't know.** Passes on the question.

**Open in a new tab:** every game card is a real link, so right-click → *Open in new tab* works. `#/host/<game>` opens a new room with that game already selected.

**Keeping it fresh:** the game remembers which questions you've seen recently (in your browser) and shows new ones first. Guess Who boards, logic puzzles, Connections and Order It are generated randomly each time, so they can go on indefinitely.

**Copyright:** no copyrighted lyrics are included. Modern songs are quizzed only by title, artist, country and emoji. The "finish the line" rounds use only the public-domain KJV, public-domain hymns and traditional songs.

## Shareable links

- Room invite: `https://your-site/#/r/ABC123`
- New room with a game picked: `#/host/sketch`, `#/host/trivia`, …
- Solo quiz: `#/play/trivia`, `#/play/song`, `#/play/whoami`, `#/play/guesswho`, …
- One specific puzzle, so a friend gets exactly the same one: `#/p/logic/medium-123456-m` (Clue Chain; `-m` branching, `-c` single chain), `#/p/deduce/hard-55`, `#/p/connections/easy-98765`, `#/p/orderit/hard-4242`
- Today's Faithle: `#/p/faithle`

## How multiplayer works

It's a static site with no game server to run. The host's browser acts as the game server. Players connect directly to the host over **WebRTC** data channels, which are encrypted with DTLS. A signalling server is used only to introduce players to each other, and the free public [PeerJS](https://peerjs.com) cloud is used by default.

### Troubleshooting multiplayer

If joining fails, the error screen names the stage that failed, gives a code, and has a **🩺 Test my connection** button:

| Code | Meaning | What to do |
|---|---|---|
| E1 | Can't reach the PeerJS connection service | Check the internet connection. A network filter, VPN or ad-blocker may be blocking `0.peerjs.com`. |
| E2 | Room not found | The host's tab is closed or was refreshed (rooms only exist while it's open), or the code is wrong. |
| E3 | Found the room, but couldn't open a direct connection | One of the networks blocks peer-to-peer (common on school/office Wi-Fi). Try mobile data, or add a TURN server on port 443 (below). |
| E4 | The host left | The host needs to create a new room. Guests find out within about 12 seconds. |
| E5 | Browser can't do WebRTC | Open the link in Chrome, Safari, Firefox or Edge rather than an in-app browser. |

By default PeerJS provides Google STUN plus its own free TURN relays on UDP port 3478. For players on very strict networks, add a TURN service that supports TLS on port 443 in `iceServers` in `js/config.js`. The file has an example.

## Security measures

- **Host is the authority.** Answers, the drawing word and the Guess Who secret stay on the host until the reveal. Only the host calculates scores, and clients send only intents (answers, chat, strokes).
- **Validated input.** Every incoming message is checked against a whitelist and a schema and has a size cap. Clients also re-validate drawing ops from the host.
- **Rate limits.** Each peer has a token-bucket limit, with a separate, stricter one for chat. Peers that keep flooding or sending bad messages are disconnected automatically.
- **Host-only controls.** Only the host can start or end games, change settings, lock the room or remove players. The server enforces this; it isn't just hidden in the UI. The room is capped at 12 players.
- **No HTML injection.** All text is rendered with `textContent` and never with `innerHTML` for data. Names and chat have control and bidi-override characters stripped and are length-limited. A basic profanity filter is applied.
- **Strict Content-Security-Policy.** No inline scripts, no `eval`, and scripts load only from this site. PeerJS is **vendored** (`js/vendor/`) rather than loaded from a CDN.
- **Clickjacking protection.** A frame-buster is included, plus `frame-ancestors`/`X-Frame-Options` via `_headers`.
- **Unguessable room codes.** Codes are 6 characters from a crypto-random, unambiguous alphabet.
- **No personal data.** No accounts or tracking. Name, avatar, settings and stats stay in `localStorage`.
- **Spoiler protection.** Players who already guessed can only chat with each other until the round ends.

The limitation of peer-to-peer play is that the *host* could modify their own copy of the game. That's fine for friends and church groups. For public competitive play you would need a dedicated server.

## Run locally

Any static file server works:

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

## Deploy (free)

- **GitHub Pages:** Settings → Pages → deploy from branch → root. `.nojekyll` is included.
- **Netlify / Cloudflare Pages:** drag and drop the folder. The `_headers` file adds the HTTP security headers.

### Self-hosting the signalling server (optional)

Run `npx peerjs --port 9000`, or deploy the [`peer`](https://www.npmjs.com/package/peer) package. Then update `js/config.js` and add the host to `connect-src` in the CSP in `index.html` and `_headers`.

## Project layout

```
index.html            app shell (CSP, fonts, scripts)
css/style.css         UI (Poppins, light/dark, responsive)
js/util.js            DOM helper, seeded RNG, fuzzy matching, sanitising, sound
js/config.js          signalling server config
js/net.js             WebRTC transports + validation + rate limiting
js/server.js          host-authoritative engines (quiz, sketch, guess who)
js/app.js             routing, home, rooms
js/games/*.js         views & puzzles
js/data/*.js          content: characters, trivia, songs, words, puzzles
legacy/               the original single-file prototype
```

To add content, edit the arrays in `js/data/`. No build step is needed.

## Custom domain

The `CNAME` file sets the custom domain for GitHub Pages. After you register your domain (for example `hallelujoy.com`), put it in `CNAME` and point your DNS at GitHub Pages.
