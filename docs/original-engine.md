# Original engine integration

## Provenance

The supplied archive contains `micro1s.com`, a PE Setup Factory 4.02 installer rather than a DOS COM program. `scripts/extract-original.py` reads it as data, decompresses its PKWARE members, verifies each original CRC, and recovers all 17 game files. The installer is never executed.

The v2.0 original `micro1.exe` SHA-256 is:

```
3aaa31d4cf814cddbf2a19d83905751ce8faf46f7d60194d35d31c8127cc684e
```

`site/native/manifest.json` records all original file hashes and both emulator binary hashes. Automated tests enforce them. Native game files are never rewritten by the co-op layer. No original source code was available; addresses below were identified by inspecting this executable and observing its runtime memory.

## Emulator and patches

Wine-Assembly / berrry-wine is pinned to commit `754c97d3ff22ce0a0cd06d08ac06dc0446fbcbb2`. It interprets the original x86 instructions and implements the Windows APIs the program calls. No Windows operating-system image is included.

Two small upstream changes are supplied as patches:

- `patches/truecolor-palette.patch`: `RealizePalette` returns zero physical palette changes on a truecolor display. Returning the logical palette size made the original game recursively rebroadcast `WM_PALETTECHANGED` until its guest stack overflowed.
- `patches/browser-canvas-fallback.patch`: browsers without `OffscreenCanvas` use a detached HTML canvas. The upstream fallback attempted a Node `require()` and returned null in WebKit.

Both normal and compatibility WebAssembly artifacts are included. The upstream loader selects the compatibility artifact when tail calls are unavailable. Hosting currently allocates 512 MB of WebAssembly memory. The canvas fallback was exercised by the WebKit browser test.

## Native two-player hook

`site/native/coop.js` hooks the original object-update call at guest address `0x4140b5`. It checks the instruction bytes before installing the breakpoint. The emulator resumes the original callback after each inspection; JavaScript does not implement a replacement world simulation.

Relevant addresses for this exact executable:

| Address / offset | Meaning |
| --- | --- |
| `0x42fb2c` | Original engine pointer |
| `0x42fb40` | Current player pointer |
| `0x4140b5` | Object callback call site |
| `0x40feb0` | Original player update callback |
| Engine `+0x51d2` | Current room, one-based |
| Engine `+0x9004` | Object-array base |
| Engine `+0x9008`, `+0x900c` | Adjacent first and player pools |
| Engine `+0x8fe4`, `+0x8fe6` | Corresponding pool capacities |
| Object `+4`, `+6` | Native center x/y |
| Object `+0x50`, `+0x70` | Health and movement state |
| Object `+0xa2` | Native update callback |
| `0x42e0f0` through `0x42e104` | Six native movement/jump/fire inputs |

Objects occupy 250 bytes. When a guest joins, the hook reserves an unused slot immediately before the original one-player pool, adjusts both pool capacities, clones the native player object, and updates native active counts. If the adjacent slot is occupied, it waits rather than overwriting a live object. The engine itself updates and draws both players.

Before the guest's callback, the hook swaps the original player pointer, input globals, edge-trigger flags, and player-specific upgrade globals. It restores the host globals at the next callback boundary. Each player's movement and weapon behavior still executes the original code.

The new head-platform rule detects a descending player crossing the other player's head, then sets native position and grounded/fall state. The next jump uses the original jump routine. When either player's native update changes rooms, the other is moved into that same original room. This preserves one shared original camera. It does not offer independent room views.

`boot.js` loads the original game, acknowledges its welcome dialog using its native dialog procedure, and invokes its New Game command. Its canvas crops the native game area for the phone layout and adds small P1/P2 labels. The full Windows window and menus remain available. The host captures this output plus the emulator audio for the guest. Guest input is validated and expires when stale; guests cannot send arbitrary game-memory edits.

## Rebuild

Normal development uses the committed artifacts. To rebuild them, install Python 3, Node, Git, and Binary Refinery 0.11.2 (prefer an isolated Python environment), then:

```sh
python -m pip install binary-refinery==0.11.2
python scripts/extract-original.py
git clone https://github.com/vgrichina/berrry-wine.git .research/berrry-wine
git -C .research/berrry-wine checkout 754c97d3ff22ce0a0cd06d08ac06dc0446fbcbb2
npm --prefix .research/berrry-wine install --ignore-scripts --omit=dev --omit=optional --no-audit --no-fund
node scripts/build-native.mjs
npm test
```

The build script checks the upstream revision, applies the two patches (or recognizes them already applied), normalizes WAT source line endings required by the upstream compiler's exact anchors, builds both artifacts, and packages the runtime, fonts, licenses, and original files. It does not reset an existing checkout or discard local changes. Upstream tools beyond this compiler and the MicroMan-specific browser tests have not been exhaustively tested here.

## Verification boundaries

Tests verify original file integrity, native startup, touch movement, capture tracks, both players' independent input, partner head jumps, original room transitions, capacity rejection, and reconnect. The room-transition test positions a character at an actual native room exit rather than replacing the room logic. Screenshots contain original engine output, not reconstructed artwork.

The original single-player program contains global assumptions that a second native actor may expose in later rooms. The entire adventure, all death/power-up combinations, and save/restore with two players have not been exhaustively played through. Native saves are currently temporary in-memory VFS files. Automated mobile viewport and WebKit checks do not establish performance or networking on every physical phone.
