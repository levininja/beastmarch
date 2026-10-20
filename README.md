# Beastmarch

Pokemon meets WoW with Monster Rancher-styled tournaments.

You wake in a
stranger's cottage with no memory, bind wild beasts as companions, craft rings and potions,
fill in a bestiary of 100 species, and fight your way up the six tournament ranks. No server,
no dependencies, no install.

* [Playing the game](#playing-the-game) (end users)
* [Developer guide](#developer-guide)

---

# Playing the game

## Running it

* Open `dist/beastmarch.html` in any modern browser (it is one self-contained file), **or**
* serve the project folder (for example `python3 -m http.server`) and open `index.html`.

The game saves to your browser's local storage (use the **Save** button). Clearing site data
deletes the save. It works on phones as well as desktops (on-screen buttons mirror every key).

## Goal

There is no single "ending". You choose what to chase:

* win the **Beastmarch Finals** (rank S) by clearing every cup from E upward,
* record every species in the **Bestiary** (`B`),
* wake the six **legendary beasts** hidden at remote shrines,
* explore all 21 wild lands, from level 1 meadows to the level 50 Worldscar.

## Controls

| Key | Action |
| --- | --- |
| `W` `A` `S` `D` / arrows | Move (every step is one turn) |
| `E` | Use / talk to whatever you are facing (the dashed box) |
| `.` | Wait one turn |
| `C` | Camp (heal a little in the wild; a gamble) |
| `I` | Pack (items, healing) |
| `P` | Companions (party, leader, order) |
| `M` | World map |
| `B` | Bestiary |
| `Q` | Quest log |
| `G` | Gear: rings and potions, forge recipes |
| `?` | Help |
| `Esc` | Menu / close a panel |

In battle: `1`–`4` command your companion, `S` strike, `G` guard, `B` bind, `H` heal, `W` swap,
`R` run. Arrow keys are disabled during a fight, and the first half second of a fight ignores
input so a stray key press cannot trigger anything.

## How it works

**Exploring.** The world has 21 wild lands plus five safe towns. Each land has a level range
(Greenmoor 1–3 up to The Worldscar 48–50). On the world map, colour compares a land's level with
yours: grey trivial, green easy, yellow even, orange hard, red dangerous, purple deadly. Towns and
buildings are safe. Aggressive beasts chase you but never enter towns or leave their land.
Creatures you have already seen and that are far below your level will not ambush you.

**Water.** Buy a Folding Skiff from a provisioner. Walk into open water to board; step onto land
to leave. Water beasts live only in water, and you can be ambushed while afloat.

**Battle and binding.** You fight alongside one companion. Strike, guard, command a move, heal,
swap or try to bind the foe with a cord. Moves with power 70+ need a couple of turns to recover.
Bound companions hit 15% harder; companions below your level earn bonus XP (+25% per level,
up to double). Alpha beasts have extra health and power, and keep it when bound. Many species
evolve at set levels; an evolution screen shows what changed.

**Day and night.** A day is 120 turns of light followed by 120 of night. Gloom-type beasts and
their lairs appear only at night.

**Quests, materials and crafting.** Folk marked `!` offer work; `?` means ready to hand in.
Quests chain across towns and give XP, gold, cords, salves, and crafting materials (metals,
gems, ingredients). At a town work table you can forge rings (metal plus gems; wear two) and
brew potions. Formulas are not shown: when your pack holds everything a recipe needs, it unlocks.

**Tournaments (Proving Halls).** Six cups, E to S, each on its own calendar (the notice post by
each work table shows it). Be at a Proving Hall on the day of the cup for your rank. Bouts are
3-versus-3 with no items. Before each bout you see the rival's team and pick your lead in secret
while they pick theirs; both are revealed together. Winning your rank's cup promotes you. Ranks
A and S are best-of-three.

**Legendary beasts.** Six legendaries sleep at hidden shrines. Each wakes only if you hold its
three relics (one per quest in a chain). Finish the chain, stand at the altar and press `E`
twice. If you beat it without binding, it withdraws and you can try again.

## Tips

* Heal before tournaments, and bring a squad that covers several types.
* Look at the type chip on foes: very effective moves matter more than levels.
* Recipes unlock by possession, so pick up every metal, gem and herb you meet.

---

# Developer guide

## Project layout

```
index.html          Page shell: markup, stylesheet links, ordered <script> tags
css/                Stylesheets (loaded in the order listed in index.html)
  tokens.css          colour themes (light / auto-dark / forced) and fonts
  base.css            reset, layout grid, typography, buttons, chips, meters
  stage.css           map stage, message log, control dock, portraits
  panels.css          NPC dialogue, quests, lists, cards, battle, title, world-map tabs
  arena.css           tournament screens
  evolution.css       evolution screen and animations
js/                 Game code (classic scripts, shared global scope, load order matters)
  data.js             constants, type chart, moves, species lines, zones, towns, lairs
  quests.js           materials, recipes, drops, NPCs, shrines, quests
  world.js            deterministic world generation
  game.js             state, stats, movement, encounters, battle, crafting, save/load, quest engine
  arena.js            day/night, ranks, rivals, duel engine and AI, tournament flow
  art.js              procedural SVG creature portraits
  arenaui.js          tournament screen HTML and key handling
  evo.js              evolution screen
  ui.js               canvas drawing, panels, dock, input, start-up
tools/build.js      Bundles everything into one self-contained HTML file
tests/              Node test harnesses (+ a browser smoke test)
dist/               Build output (generated)
```

## Running and building

No dependencies; Node 18+ for the tools, Python + Playwright only for the optional smoke test.

```
node tools/build.js             # dist/beastmarch.html   (single file, ready to publish)
node tools/build.js --fragment  # dist/beastmarch.fragment.html (no <html>/<head>/<body>)
node tests/run.js               # run all test harnesses
python3 tests/smoke.py          # load index.html in headless Chromium, start a game, check for errors
```

(`npm run build`, `npm test` and `npm run smoke` do the same.) During development just open
`index.html` over a local server and refresh; there is no compile step.

## Architecture

**One global scope.** The JS files are *not* ES modules. They are classic scripts that share a
single global lexical scope, so a top-level `const` in `data.js` is visible in `game.js`.
The order in `index.html` is therefore the dependency order:
`data → quests → world → game → arena → art → arenaui → evo → ui`. A file may use things
defined in earlier files at load time, and anything at all at call time. `ui.js` is last because
it contains the start-up code that runs the game. Every file starts with `'use strict'` and a
header comment describing its role.

**State.** All mutable game state lives in one object, `S` (created by `newGame`, persisted by
`saveGame`). `UI` (in `ui.js`) holds transient interface state that is not saved (selection,
input locks). Game logic mutates `S` and logs messages with `log()`; `render()` redraws the
interface from `S`. Logic never touches the DOM.

**Modes.** `S.mode` selects the screen (`title`, `world`, `battle`, `dead`, ...) and `S.panel`
selects an overlay panel (pack, party, map, dex, quests, gear, forge, hall, ...). `onKey`
dispatches keys by mode; panels have their own handlers (`panelKey`, `battleKey`, `arenaKey`).
The control dock (`renderDock`) shows buttons that send the same keys, so mouse and touch use
the same code path as the keyboard (`data-k` attributes).

**The world.** `world.js` generates the 224×176 map deterministically from seeded value noise
(`hash2`, `vnoise`), so a save never stores terrain. The pipeline in `build()`:

1. `layoutRegions()` assigns each tile a zone from the seeds in `ZSEEDS` (inner 160×128 land)
   and `OUTER` (the surrounding ring), pins lairs/shrines/NPC anchors into their zones, merges
   tiny stray fragments and stamps town rectangles.
2. `waterField()` makes water per zone using `WATERCFG`, so some lands are wetter than others.
3. Land features (`GEN`), towns, interiors and signs are added.
4. `connectAll()` carves bridges and paths so every town gate, lair and shrine is reachable
   (a few islands are intentionally left for boats).
5. `placeNPCs()` places quest givers; `blocksWay()` refuses any spot that would cut a route.

The original 160×128 map sits inside the larger map at offset `(OX,OY)=(32,24)`. Data authored in
original coordinates (shrines, quest visit targets) is shifted by those offsets in the data files.

**Creatures.** `LINES` (in `data.js`) defines 43 evolution lines, 100 species in all; `XZ` lists
extra zones for outer-ring species. At load, `SP` (by id), `SPL` (list) and `WILDBY` (species by
zone and land/water) are built. `wildFor(zone, water, bonus)` picks what spawns, including
evolved forms by level, "elder" variants and night-only Gloom beasts. Portraits are drawn by
`art.js` from each species' definition; there are no image files.

**Tournaments.** `arena.js` has a self-contained duel engine (`newDuel`, `duelTurn`), AI
(`aiAct`, `aiLead`) and rival generation seeded by `mulberry`, so a rival is the same on every
playthrough. Rounds that do not involve the player are simulated with `simRound`/`simSeries`.

**Saves.** `SAVE_KEY` in `localStorage`, versioned by `VER` (data.js). `loadGame` migrates older
versions step by step (`o.ver < 2` doubles coordinates, `< 4` adds the OX/OY offset...) and drops
exploration data on a mismatch rather than risk corrupt maps. **If you change world generation,
coordinates, or the save shape, bump `VER` and add a migration.**

## Common tasks

**Add a species.** Add an entry to a line in `LINES` (data.js) following its neighbours (id,
name, type, base stats, evolution level, colours/art hints), and add its zone(s): the first form's
zone comes from the line, extra zones from `XZ`. Run `tests/species-coverage.test.js`: it lists
species that can never appear in the wild (legendaries are expected).

**Add a zone.** Add it to `ZK`/`ZN` (name, level range) in data.js; give it a seed in `ZSEEDS` or
`OUTER` and optionally `WATERCFG` (world.js); give it a colour in both palettes of `PAL` (ui.js)
and drop tables in `DROPS` (quests.js). Check the world map (`M` in game, or `tests/` diagnostics)
for shape, then run the reachability tests. Bump `VER`.

**Add a quest.** Append to `QUESTS` in quests.js. Objective types: `kill`, `item`, `visit`, `bind`,
`sail`, `seen`, `caught`. `after` chains it to another quest; `min` sets a level gate. Visit
coordinates are in original-map coordinates (shifted automatically). Run
`tests/quest-integrity.test.js`.

**Add a material or recipe.** `MD` and `RECIPES` in quests.js. Recipes unlock automatically when all
ingredients are held (`checkRecipes`). Ring effects are read through `fx(key)` in game.js.

**Change styling.** Colours are CSS custom properties in `css/tokens.css`; the dark theme is defined
twice (media query and `data-theme="dark"`) so both must be edited together.

## Tests

`tests/*.test.js` are plain Node scripts, no framework. Each builds a minimal DOM mock, loads the
game code through `tests/_load.js` (which concatenates `js/*.js` in `index.html` order), exposes
internals via `globalThis.__t` and prints `PASS`/`FAIL` lines. `tests/run.js` runs them all.

| File | Covers |
| --- | --- |
| `regression.test.js` | broad regression: world size, reachability, save/load, battles, items |
| `tournaments-towns.test.js` | tournaments, brackets, towns, calendar |
| `gloam-night.test.js` | night-only Gloom beasts and lairs |
| `town-connectivity.test.js` | every town gate and building is reachable |
| `evolution-flow.test.js` | evolution screen and records |
| `squad.test.js`, `lead-selection.test.js` | squad rules; blind lead picking |
| `cinder-reachability.test.js`, `lairs-npcs-reach.test.js` | report-style: print reachability of lairs/shrines/NPCs; read the output |
| `species-coverage.test.js`, `quest-integrity.test.js`, `ambush-gate.test.js` | report-style diagnostics for species, quests and the ambush rule |
| `smoke.py` | real browser: loads `index.html`, starts a game, checks for page errors |

The report-style files exit 0 unless they crash; they are meant to be read after a data change.

## Conventions

* Keep top-level helpers small and give each a one-line `/** */` comment.
* New JS or CSS files: add a `<script>`/`<link>` tag to `index.html` in the right position; the build
  script and test loader both read the order from there.
* Never read the DOM from game logic; add a `render`-side function in `ui.js` instead.
* All randomness that must be stable (world, rivals) uses seeded generators; gameplay randomness
  uses `Math.random`.
* Check contrast and the 44px touch target when adding buttons (`.b`).

## Publishing

`node tools/build.js` produces a single file that can be hosted anywhere (GitHub Pages, any static
host) or opened from disk.
