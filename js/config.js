/* Site configuration.
   PeerJS signalling server: only used to introduce players to each other; game data
   then flows directly between browsers over encrypted WebRTC data channels.
   The free public PeerJS cloud works out of the box. To self-host instead, run
   `npx peerjs --port 9000` (or deploy the `peer` package), change the values below,
   and add the host to `connect-src` in the Content-Security-Policy in index.html. */
'use strict';
FP.CONFIG = {
  peer: { host: '0.peerjs.com', port: 443, secure: true, path: '/' },

  // ICE servers used to open the player-to-player connection.
  // Leave empty to use PeerJS's defaults: Google STUN + PeerJS's free TURN relays
  // (turn:eu-0/us-0.turn.peerjs.com on UDP port 3478).
  // Strict school/office/mobile networks often block UDP 3478. For those, add a TURN
  // service that also offers TURN over TLS on port 443 (e.g. Cloudflare Realtime TURN,
  // Metered, Twilio, or your own coturn). Example shape:
  //   iceServers: [
  //     { urls: 'stun:stun.l.google.com:19302' },
  //     { urls: ['turn:turn.example.com:3478', 'turns:turn.example.com:443?transport=tcp'],
  //       username: 'YOUR_USERNAME', credential: 'YOUR_CREDENTIAL' },
  //   ],
  // Anything here is visible to players, so use short-lived or usage-limited credentials.
  iceServers: [],
};
