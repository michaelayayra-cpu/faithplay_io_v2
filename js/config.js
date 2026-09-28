/* Site configuration.
   PeerJS signalling server: only used to introduce players to each other; game data
   then flows directly between browsers over encrypted WebRTC data channels.
   The free public PeerJS cloud works out of the box. To self-host instead, run
   `npx peerjs --port 9000` (or deploy the `peer` package), change the values below,
   and add the host to `connect-src` in the Content-Security-Policy in index.html. */
'use strict';
FP.CONFIG = {
  peer: { host: '0.peerjs.com', port: 443, secure: true, path: '/' },
};
