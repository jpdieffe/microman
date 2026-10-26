# Original MicroMan Co-op

[Play on GitHub Pages](https://jpdieffe.github.io/microman/)

This version executes the original **The Adventures of MicroMan — Adventure 1: Crazy Computers v2.0 shareware** Windows program from the supplied installer. It replaces the previous JavaScript recreation. The original executable, DLL, artwork, levels, sounds, and music are retained unchanged. No original source code was supplied; the original x86 machine code runs in a browser emulator.

Online co-op adds a second native player and lets either player stand on and jump from the other's head. Both players share the original room view; moving to another room brings the partner along. Enemies, movement, shooting, ladders, level logic, and rendering run through the original engine.

## Play together

1. Choose **Host a game**. You can start playing before your friend joins.
2. Tap **ROOM** to copy an invitation, or share the two-character code.
3. Your friend chooses **Join friend**. Their character appears in your current room.

Arrows or WASD move, Space jumps, and Z, X, or Ctrl fires. Up climbs or activates teleporters; down climbs down or ducks. Large touch buttons support simultaneous movement, jumping, and firing. Landscape gives phones more room.

**Menu → Show original window** exposes the original Windows interface and clickable menus. **Bring partner here** regroups the players; **Restart adventure** starts over. Original save files live in the emulator's memory and are not retained after closing or reloading the page.

The host runs the original game and sends its picture and sound over WebRTC. The guest sends controls back. The guest can enable sound with **Enable sound**. Keep both tabs visible; disconnection pauses the host until the guest rejoins or the host chooses **Continue solo**. A third player is rejected.

## Connections and browsers

The default public PeerJS signaling service and STUN servers must be reachable. Android may require the browser's Nearby devices / Local network permission. Router isolation or restrictive NAT can require a TURN relay; optional TURN credentials and a custom TLS PeerServer are available under Connection help. Credentials stay in page memory. Two-character codes are invitations, not secure passwords.

Hosting uses a 512 MB WebAssembly memory allocation and is more demanding than joining. The browser must support WebAssembly shared memory and service workers over HTTPS (localhost also works). A small service worker supplies the isolation headers needed on GitHub Pages. Modern Chrome and Safari are the intended browsers; close other heavy tabs on a phone.

Chrome and iPhone-sized WebKit automated tests cover original-game startup and controls. Real WebRTC tests cover desktop and phone-sized Chrome hosting, native guest movement, jumping from a partner, room travel, room capacity, and reconnecting. These are not physical-device tests or a complete playthrough of every original room. Late-game co-op interactions and original save/restore with two players have not been fully verified.

## Development

Node 22+:

```sh
npm ci
npm run prepare:vendor
npm start
```

Open http://127.0.0.1:4177/. The packaged emulator and original game files are committed, so rebuilding the emulator is unnecessary for normal development.

```sh
npm run check
npm test
npm run test:browser
npm run test:network
npm run test:webkit
```

Chrome tests require installed Google Chrome. WebKit needs `npx playwright install webkit` or a `WEBKIT_EXECUTABLE` path. `MICROMAN_URL` directs the network test at a deployed site; `PHONE_HOST=1` uses a phone-sized host. Screenshots go to ignored `test-results/`. Tests use controlled positions for specific room and head-landing cases. `?debug` exposes local diagnostics without granting guests authority to change game memory.

Pushes to `main` verify syntax and original-file hashes/protocol validation, then deploy `site/` to GitHub Pages. See [original engine notes](docs/original-engine.md) for the native co-op hook, pinned emulator, patches, and rebuild instructions.

## Attribution

MicroMan is by Brian L. Goble. The original installer remains in `assets/microman-original.zip`, and its 17 extracted game files are in `site/native/game/`, including the original README and registration information. The original game is not relicensed by this project.

[Wine-Assembly / berrry-wine](https://github.com/vgrichina/berrry-wine) by Vladimir Grichina provides the x86/Windows browser emulator under its included MIT license. Its font licenses and Wine font sources are retained under `site/native/fonts/`. PeerJS is pinned and distributed with its MIT license.
