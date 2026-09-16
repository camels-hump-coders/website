# BioBuzz: The Pollinator Adventure

Open `secret-games.html`, expand **BioBuzz**, and choose **Basic** for the original Pollinator Patrol or **Complex** for the new adventure. Serve the repository with any static HTTP server (for example `python3 -m http.server 8765`); the complex game uses native JavaScript modules and has no build step or external runtime dependencies.

## Play

- **WASD / arrow keys:** fly; **Space:** equipped ability; **Escape:** pause/resume.
- Approach flowers to collect pollen. Follow the numbered species trail; transfer pollen to a **different flower of the same species** to pollinate it. Every completed trail restores a habitat patch.
- Bring pollen to the hive to score and recover one heart. Complete both the delivery target and all flower trails before time or health runs out.
- Complete landscapes to unlock the next area and abilities. Honey tokens earned by completed flights buy permanent basket upgrades. Replay unlocked landscapes for personal bests.
- The field guide and badges track discoveries. Progress and preferences use the browser's local storage (`chc.biobuzz.adventure.v1`); a blocked or invalid save cannot prevent play. An unfinished flight does not persist across page reloads.

## Structure

| File | Responsibility |
| --- | --- |
| `biobuzz-complex-data.js` | Five maps, flower species, discoveries and source links, abilities, badges |
| `biobuzz-complex-core.js` | Browser-independent movement, collision, hazards, pollination, scoring, particles |
| `biobuzz-complex-renderer.js` | Canvas scenery, camera, bee, flowers, hazards, minimap and navigation |
| `biobuzz-complex-audio.js` | Original synthesized music, nature ambience, bee and interaction effects |
| `biobuzz-complex-save.js` | Validated saves, level unlocking, completion rewards |
| `biobuzz-complex.js` | Menus, input, HUD, discovery messages, badges, persistence, game loop |
| `biobuzz-complex.html` / `.css` | Accessible menu controls, responsive layout, game presentation |

The original `biobuzz.html`, `biobuzz-game.js`, and `biobuzz-game.css` are independent.

## Extend

Add flowers to `FLOWERS`; matching discovery entries are generated automatically. Map flower positions refer to their species IDs. Trails are arrays of same-species pairs (for example `['aster', 'aster', 'clover', 'clover']`); provide at least two distinct, reachable flowers of each required species. Each trail restores the corresponding `patches` entry. Map coordinates use world pixels; times use seconds. Hazard `speed` is radians per second and `range` is the patrol amplitude in pixels.

New hazards need simulation behavior in `updateHazards()` and drawing support in the renderer. New abilities need an `ABILITIES` entry and their simulation effect. To add a sixth landscape, extend `LEVELS` and the saved-level limits in `biobuzz-complex-save.js`. Educational references are linked from the in-game field guide.

Audio starts only after Play, stops its music scheduler when paused/hidden, and supports separate music/effect levels and mute. Reduced motion disables decorative motion and particles; essential player movement remains responsive.

## Checks

Run `node --test tests/biobuzz-complex.test.mjs` (Node 22 or newer). The tests exercise mission completion, collisions, resource limits, failure/pause states, ability timing, and saved progression. Browser verification should also cover keyboard play, the Basic/Complex dropdown, all menus, focus handling, sound preferences, persistence, and narrow screens.
