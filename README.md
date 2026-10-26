# MicroMan Co-op

[Play on GitHub Pages](https://jpdieffe.github.io/microman/)

Online two-player MicroMan with drop-in joining, independent room views, and solid player platforms: jump onto your teammate, ride while they move or jump, and jump from their head. Includes large simultaneous-touch controls for portrait and landscape phones.

## What this is

This is a browser adaptation of the supplied **The Adventures of MicroMan — Adventure 1: Crazy Computers, version 2.0 shareware**. It uses the original room layouts, collision rectangles, sprite animations, object placements, room connections, and teleporter destinations. There are 379 animation frames and 62 room records, including 54 main rooms, bonus rooms, the demo room, and pit records. The simulation, enemy behaviors, and co-op features are newly implemented in JavaScript; this does not execute the Windows EXE and is not a bit-for-bit port of its engine.

The supplied installer archive is preserved unchanged in `assets/microman-original.zip`. Original MicroMan and its artwork/music are by Brian L. Goble. Attribution and the original README are retained in `assets/original-data.zip`. No ownership of the original game assets is claimed.

## Playing together

1. Select **Host a game** and start exploring.
2. Tap **ROOM** to copy the invitation, or tell your friend the two-character code.
3. Your friend selects **Join friend** and appears beside you in your current room.

You can stand on either player’s head. The lower player can carry the upper player horizontally or jump while carrying them. The rider can jump again or walk off. Side collisions are solid; friendly fire is disabled. Power upgrades are shared. Players can explore different rooms with separate cameras. **Menu → Find partner** brings you back together.

Keyboard: arrows or WASD move; Space jumps; Z, X, or Ctrl fires. Up climbs ladders and activates teleporters; down climbs down or ducks. Touch controls support move, jump, and fire simultaneously. “Show whole room” changes the camera to an overview. The original MIDI score is available through **Original music**, synthesized in Web Audio.

Enemies, moving platforms, fading blocks, springs, energy pickups, shields, power/rapid/guided shots, and super jumps populate the original rooms. Reach the original final teleporter to finish. Death reboots at a safe room checkpoint without losing collected upgrades. Save-disk objects set checkpoints for the current run; progress is not persisted after closing the page.

## Networking

PeerJS provides signaling and WebRTC transports game data. The host runs the authoritative simulation at 60 Hz, sends state at 20 Hz, and receives guest input at 30 Hz. Guests interpolate snapshots. Host input and bounded guest input pass through the same collision rules; guests cannot directly set positions or score.

A host can explore before a guest joins. Once connected, switching away from a game tab or losing the connection pauses the shared simulation. The guest can rejoin the same room without restarting. The host can also continue solo. A third player is rejected.

The default public PeerJS service and STUN servers must be reachable. Direct connections depend on router/firewall settings and browser permissions. On Android, check Nearby devices / Local network permission for the browser. Networks with client isolation or restrictive NAT may require a TURN relay; optional TURN credentials and a custom TLS PeerServer can be entered in Connection help. Credentials remain in page memory. No relay service is bundled, and two-character codes are invitations rather than secure passwords.

## Development and verification

Node 22+:

```sh
npm ci
npm run prepare:vendor
npm start
```

Open http://127.0.0.1:4177/.

```sh
npm run check
npm test
npm run test:browser
npm run test:network
npm run test:webkit
```

Chrome tests require installed Google Chrome. The WebKit test needs `npx playwright install webkit`, or a `WEBKIT_EXECUTABLE` path. Network tests use real peer connections through the public signaling service. `MICROMAN_URL` points the Chrome browser/network tests at a deployed site. `PHONE_HOST=1` tests a phone-emulated host. Screenshots go to ignored `test-results/`.

Tests cover head landing for either player, stable stacking, carrying/jumping with a rider, jumping off, side collision against walls, original narrow ladders, non-repeating held jumps, drop-in spawning, separate room transitions, original teleport destinations, shared upgrades, enemy hits, friendly-fire prevention, respawn, bounded peer messages, multi-touch, room capacity, visibility pauses, and reconnection. Network tests use controlled positions to exercise these cases, including a real input-driven jump onto a partner and a fixture at the final teleporter. They are not a complete human playthrough of every room or a physical Android/iPhone Wi-Fi test.

`?debug` exposes local state for tests. It does not grant a guest additional network authority.

### Original data extraction

`scripts/assets.py` uses Python 3’s standard library to reproducibly build the tracked atlases, world JSON, and MIDI event scores from `assets/original-data.zip`. Run `python scripts/assets.py` to regenerate. The installer was read as data using Binary Refinery’s Setup Factory archive extractor, without launching it. The extracted IMG/RMP/MIDI/WAV/README files needed by the browser are retained in the data ZIP; the complete original installer ZIP is retained separately.

- IMG: 256 BGRA palette entries, 256 records of 46 bytes, absolute frame offsets and Windows RLE8 frames. Alternate player colors are generated only for player sprite groups.
- RMP: original 32×20 pixel tiles, 16×16 tile rooms, 256 tile-property records, 256 room directory slots of 53 bytes, and 102-byte object records. Tile and room links are converted from the original one-based indices.
- MIDI: original note timing and tempo changes are decoded; synthesized playback uses simple browser instruments rather than a General MIDI soundfont.

Pushes to `main` run syntax and simulation/protocol tests, then deploy `site/` with GitHub Pages. PeerJS is pinned and its MIT license is distributed beside the bundle.
