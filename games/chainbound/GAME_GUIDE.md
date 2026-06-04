# Chainbound Game Guide

This guide is the handoff document for future work on Chainbound. Keep it updated when gameplay rules, card stats, level JSON, assets, or major code organization changes.

## Current Game

Chainbound is a grid-based disc golf deckbuilder. The player completes a hole by playing combined disc/throw cards and trying to finish in as few strokes as possible.

The game currently has three main modes:

- `New Game`: opens the player menu.
- `Player Menu`: shows player stats, Player Points, the current deck, and buttons for `Play a Round` and `Spend Points`.
- The Player Menu deck list shows individual cards because cards may become unique over time.
- `Spend Points`: opens a store/training screen where points buy cards or stat upgrades.
- `Level Editor`: builds and saves hole JSON files for future preset courses.

## Core Rules

- The hole is a square grid.
- The player starts on the tee and throws toward the selected direction.
- Each card has one disc and one throw modifier.
- A card can be used as the disc for a throw or as the throw modifier for another card.
- A single card cannot be used as both the disc and the throw modifier on the same throw.
- Used cards are discarded after the throw.
- `Pitch` is a throw option, not a card. It lets the selected disc move one square to any adjacent target, counts as one stroke, ignores obstacles, and cannot be used while a C1/C2 putt is available.
- Putts also use and discard a selected disc card.
- The stroke counter tracks completed strokes and starts each hole at `0`.
- The hand area shows remaining draw deck count above the hand and discard pile count below it.
- The hand limit is controlled by `Control`, starting at `3`.
- The opening hand fills from the shuffled deck.
- All cards are in one shuffled deck.
- After a throw or missed putt, the hand automatically refills to the current hand size.
- If the draw deck is empty while auto-refilling, the discard pile is shuffled into the deck and adds one stroke.
- If auto-refill somehow leaves the player with no playable disc in a full hand, the game adds one penalty stroke and draws the next disc.

## Throw Model

Disc cards currently have:

- `speed`: number of forward grid squares traveled before fade is applied.
- `glide`: controls the height profile over the flight.
- `turn`: sideways movement early in flight. Negative turn moves right for backhand before fading back.
- `fade`: sideways movement at the end of flight.
- `putt`: percent modifier to C1/C2 putt attempts.

Backhand and forehand mirror lateral movement:

- Backhand fade moves left relative to the throw direction.
- Forehand fade moves right relative to the throw direction.
- The direction pad rotates the whole flight path up, right, down, or left.

Height matters for obstacles:

- Trees are height `3`.
- Shrubs are height `2`.
- Rocks are height `1`.
- Stumps are height `1`.
- Water is a background tile only. It has no penalty behavior unless the same square is also marked OB.
- OB is the invalid lie marker. If a disc finishes OB, or kicks into OB after hitting an obstacle, it takes a penalty stroke and returns to the last valid non-OB square. The player cannot throw or pitch from OB.
- Penalty Hazard is a course overlay saved in `penaltyHazards`. It is visible in the editor and invisible during play. If a disc finishes on Hazard, it takes a `1` stroke penalty and plays from that same lie.
- Black Hole is a 1x1 special asset saved in `blackHoles`. If it is to the right of the throw line, the throw gets Turn +1 and Fade -1. If it is to the left of the throw line, the throw gets Turn +1 and Fade +1.
- A disc collides if its flight height is less than or equal to the obstacle height.
- Obstruction controls whether the disc stops when it collides.
- Hovering an obstacle shows a styled tooltip with obstacle type, height, and fight-through chance.
- Trees and crystals have `70%` obstruction by default, so a disc has a `30%` fight-through chance.
- Rocks, stumps, structures, and craters have `100%` obstruction by default, so they cannot currently be fought through unless overridden in the editor.
- Shrubs currently have `100%` obstruction.
- On collision, the lie randomly kicks to the obstacle square or one adjacent square.
- If the next throw starts on an obstacle, effective disc speed is reduced by `1`.
- Obstacle lies also roll against the player's Scramble stat. Failing the roll kicks the disc one square in a random cardinal direction.

Glide `2` currently uses a fixed height profile by speed in `flightHeight()`.

## Putting

Player putting stats:

- C1: `50%`
- C2: `20%`
- Throw-in: `10%`
- Scramble: `55%`
- Control: `3`, which sets hand size. It costs `20` Player Points to upgrade to `4`.
- The player screen has an active Deck and inactive Collection. The active Deck must stay between `10` and `16` cards. Store purchases go to Collection, then the player can move selected cards between Collection and Deck with the arrow buttons.
- Each hole gives the player one Mulligan. Using it discards the whole current hand and draws a full new hand up to the current hand size.

Putting rules:

- Landing on the basket square triggers a throw-in roll first.
- Flying over the basket square at any flight height triggers a throw-in roll, even when the basket is not the final landing square.
- If throw-in misses, the player gets a C1 putt.
- Landing one square away, including diagonals, gives a C2 putt.
- Putt chance is base player stat plus the selected disc's `putt` modifier.
- Missing a C2 putt moves the lie to the basket and creates a C1 putt.
- The player can never miss more than two C1 putts in a row. After two consecutive C1 misses, the third C1 attempt becomes an automatic `Tap In`.
- Completing the hole opens the "In the Basket!" modal with score relative to par.

## Course Rewards

The player starts with `5` Player Points.

Completing the final hole of a course awards Player Points based on total course score:

| Course Score | Player Points |
| --- | ---: |
| Below par | 30 |
| Even through +3 | 20 |
| +4 through +6 | 15 |
| +7 through +9 | 10 |
| +10 or worse | 5 |

`Pitch and Putt` is an easier 3-hole course and uses scaled rewards:

| Course Score | Player Points |
| --- | ---: |
| Below par | 15 |
| Even through +3 | 10 |
| +4 through +6 | 8 |
| +7 through +9 | 5 |
| +10 or worse | 3 |

The Spend Points screen keeps the same random offers until another course is completed:

- Store: 3 random combined cards, each with a random disc and random throw modifier. Prices are `5`, `10`, and `10` Player Points.
- Train: C1, C2, Throw-In, or Scramble can each be increased by `1%` for `5` Player Points.
- Train: Control costs `20` Player Points and increases hand size from `3` to `4`.
- Store offers require a Buy/Cancel confirmation and can only be purchased once before the offers reroll.

Course unlocks:

- `Pitch and Putt` appears first and is always available.
- Deep Woods and Sunset Park are locked until Pitch and Putt is completed at even par or better.
- Skull Island is locked until Sunset Park or Deep Woods is completed at `+5` or better.
- Best course scores are stored per `courseId` in browser `localStorage` under `chainbound.bestScores.v1`.
- The course selector shows each course's best saved score on the right side of the course row.

Manual save/load:

- Main menu has `Load Game`.
- Main menu has `Test Level`, which lists every individual hole regardless of unlock status.
- Test Level starts the selected hole with a temporary randomized test bag: one card for every disc in `discs`, each paired with a random modifier from `throwCardEffects`.
- Test rounds do not award Player Points, record best scores, save game progress, or continue to the next hole.
- Player menu and the in-round HUD both have `Save Game`.
- Manual saves are stored in browser `localStorage` under `chainbound.manualSave.v1`.
- A manual save includes Player Points, player stats, active deck, collection/library cards, store offers, course unlock state, best course scores, and active round progress.
- Active round progress includes course id, hole index, course score, current lie, stroke count, selected direction/throw, hand, draw deck, discard pile, selected cards, putt state, and current status text.
- Active round saves also include the current C1 miss streak for Tap In logic.
- `New Game` resets the current session but does not erase the manual save or best course scores.

## Current Cards

Cards combine a disc from the `discs` object with a modifier from `throwCardEffects`.

| Card | Type | Speed | Glide | Turn | Fade | Putt |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| COMB | Putter | 3 | 2 | 0 | 1 | +5 |
| PALM | Midrange | 5 | 2 | -1 | 1 | +3 |
| KRAKEN | Driver | 8 | 2 | 0 | 2 | -5 |
| CACTI | Putter | 2 | 1 | 0 | 1 | +10 |
| TROPICAL | Midrange | 6 | 2 | -2 | 1 | +5 |
| GALACTIC | Driver | 9 | 2 | -1 | 1 | -10 |
| EXPANSE | Driver | 7 | 1 | 0 | 3 | -5 |
| TUNDRA | Midrange | 7 | 3 | 0 | 0 | 0 |
| SHELL | Putter | 4 | 2 | 0 | 2 | +5 |
| MIGRATION | Putter | 3 | 2 | 0 | 0 | +10 |

Throw modifiers live in `throwCardEffects`.

| Card | Effect |
| --- | --- |
| Power Down | Speed -1 |
| Hyzer | Fade +1 |
| Anhyzer | Turn -1 |
| Smashed | Speed +1 |
| Layup | Set Speed to 2 with 0 Turn and Fade |
| Overhand | Height 4 for the first 3 squares, Speed -2 |
| Turnover | Turn -2 |
| Roller | Fade -1, Turn -1, Speed +1, Height 0 for the full flight. Stops on all obstacles and OB. |
| Clutch Up | C1 putting +20% |
| Big Basket | C2 putting +20% |
| Absolute Smash | Speed +2, Fade +1, Turn -1 |
| Hunting | Throw-In +20% |
| Fight Through | +20% chance to get through obstacles |

The starting deck is built from `startingDiscIds` and `startingThrowIds`.

- 3 COMB
- 2 CACTI
- 2 PALM
- Throw modifiers are randomly assigned from this pool: 1 Hyzer, 1 Anhyzer, 1 Clutch Up.
- Four starting cards have no throw modifier.

## Level Editor

The level editor is opened from the main menu.

Editor controls:

- `Name`: hole name.
- `Course`: existing course assignment for the exported hole.
- `New Course`: optional name for a new course when `Course` is set to New Course.
- `Hole #`: hole number inside the selected course.
- `Par`: saved par value.
- `Width`: grid columns, currently clamped from `5` to `24`.
- `Height`: grid rows, currently clamped from `5` to `30`.
- Asset palette: Tee, Basket, Grass/Sand/Water/Space/Asteroid background variants, OB, Trees/Crystals, Rocks, Stump, Shrubs, Obstacles/Structures, Decor, Erase.
- The asset palette is grouped by category and scrolls independently from the editor controls.
- Selecting a hazard asset shows Height and Through % settings. Changing them updates that asset template and all matching instances already placed on the current level.
- Hazard JSON can include `obstruction`; fight-through chance is `100 - obstruction`.
- Crystals and structures are hazard assets. They save in `hazards` and block disc flight based on their height and obstruction settings.
- `Crystal Craters` is always available as an editor course option, even before preset holes are added.
- Click an asset, then click a grid cell to place it.
- Tee and Basket are unique; placing a new one moves the existing one.
- Grass, Sand, and Water are background tiles, not obstacles. Grass 1 is the default tile; other variants are saved as background overrides.
- Decor tiles are visual-only foreground assets saved in `decorations`; they do not block disc flight.
- Rock 1x2 is saved as a height 1 rock hazard with `width: 2`, anchored on its left tile and occupying that tile plus the tile to its right.
- OB marks out-of-bounds cells in the editor. OB is invisible during play, and matters if the disc's final lie is OB after the throw or after an obstacle kick. Roller throws also stop when they reach OB because they fly at height 0.
- Erase removes hazards, decorations, backgrounds, OB, tee, or basket from a cell.
- The editor grid starts blank, with no tee and no basket.
- Drag-scroll is enabled from the area outside the grid. Grid cell clicks are reserved for placement.

Save/load:

- `Save JSON` downloads the current hole data as a `.json` file.
- `Load JSON` imports a saved hole JSON file back into the editor.
- Browser security means the app downloads JSON files; it does not write directly into the repo.
- The default repo home for preset course data is `games/chainbound/courses/`.
- Built-in hole JSON files are listed in `games/chainbound/courses/course-library.js`.
- `course-library.js` also embeds `window.CHAINBOUND_COURSES` so the game works when opened directly from disk.

Current saved hole JSON shape:

```json
{
  "name": "New Hole",
  "courseId": "deep-woods",
  "courseName": "Deep Woods",
  "holeNumber": 1,
  "par": 4,
  "columns": 9,
  "rows": 18,
  "tee": { "x": 4, "y": 16 },
  "basket": { "x": 4, "y": 2 },
  "hazards": [
    { "type": "tree", "variant": 1, "height": 3, "x": 2, "y": 3 },
    { "type": "rock", "variant": 1, "height": 1, "obstruction": 100, "x": 4, "y": 5 },
    { "type": "rock", "variant": 4, "height": 1, "width": 2, "x": 1, "y": 6 },
    { "type": "obstacle", "variant": 1, "height": 1, "x": 5, "y": 6 },
    { "type": "stump", "variant": 1, "height": 1, "x": 3, "y": 6 },
    { "type": "shrub", "variant": 1, "height": 2, "x": 6, "y": 7 }
  ],
  "backgrounds": [
    { "type": "water", "x": 5, "y": 8 },
    { "type": "water2", "x": 5, "y": 9 },
    { "type": "grass2", "x": 6, "y": 8 },
    { "type": "sand1", "x": 7, "y": 8 }
  ],
  "decorations": [
    { "type": "decor", "variant": 1, "x": 4, "y": 9 }
  ],
  "penaltyHazards": [
    { "x": 2, "y": 10 }
  ],
  "blackHoles": [
    { "x": 6, "y": 4 }
  ],
  "outOfBounds": [
    { "x": 0, "y": 0 }
  ]
}
```

`tee` and `basket` may be `null` while editing an unfinished hole. A playable preset should include both.

## File Structure

```text
games/chainbound/
  index.html          Main menu, round screen, editor screen, modal markup
  styles.css          Game, cards, viewport, editor, and modal styling
  game.js             Gameplay, rendering, editor, save/load logic
  GAME_GUIDE.md       This guide
  main_menu.png       Menu and screen background
  basket_icon.png     Basket icon and generic throw-card image
  courses/
    README.md
    course-library.js Built-in course manifest and playable bundle
    *.json          Exported hole source files
  discs/
    Cacti_putter.png
    comb_putter.png
    galactic_driver.png
    palm_mid.png
    Kraken_driver.png
    Tropical_mid.png
    Tundra_mid.png
  course assets/
    grass1_bg.png
    grass2_bg.png
    sand1_bg.png
    space1_bg.png
    space2_bg.png
    asteroid1_bg.png
    asteroid2_bg.png
    asteroid3_bg.png
    decor1.png
    crystal1.png
    crystal2.png
    structure1.png
    obstacle1.png
    obstacle2.png
    obstacle3.png
    crater1.png
    crater2.png
    hazard.png
    blackhole.png
    rock1.png
    rock2.png
    rock3.png
    rock4_1x2.png
    shrub1.png
    shrub2.png
    stump1.png
    stump2.png
    teepad.png
    tree1.png
    tree2.png
    tree3.png
    tree4.png
    tree5.png
    tree6.png
    tree7.png
    OB.png
    water1_bg.png
    water2_bg.png
    water3_bg.png
```

## Important Code Sections

`game.js` is currently a single-file browser script. Main sections:

- DOM lookups: top of file.
- `courseLibrary`: loaded from embedded `CHAINBOUND_COURSES`, or built from JSON files listed in `courses/course-library.js` when running through a local server.
- `hole`: current active playable hole selected from the course library.
- `discs`: disc card definitions.
- `throwCardEffects`: throw modifier card definitions.
- `editorAssetTypes`: editor palette definitions.
- `startingDiscIds`, `startingThrowIds`, and `startingDeck`: starting combined-card pool copied into `playerDeck`.
- `playerDeck` and `playerPoints`: current player progression state for the session.
- `bestCourseScores`: course best scores loaded from localStorage.
- Deck/hand helpers: `resetDecksAndHand`, `drawFromDeck`, `autoRefillHand`.
- Flight logic: `getThrowPath`, `rotateStep`, `flightHeight`, `resolveCollision`.
- Course renderer: `renderCourse`.
- Editor renderer and JSON: `renderEditorGrid`, `placeEditorAsset`, `saveEditorHole`, `loadEditorHole`.
- Player and level menus: `renderPlayerMenu`, `showPlayerMenu`, `renderCourseSelector`, `showCourseSelect`.
- Save/load: `saveGame`, `loadGame`, `gameSaveData`, `restoreRoundState`, `recordBestCourseScore`.
- UI state: `showRound`, `showMenu`, `showEditor`, `updateThrowControls`.

## Maintenance Notes

- When adding a disc, update `discs`, `startingDiscIds` if it should be available at the start, and add the image in `discs/`.
- When adding a throw modifier, update `throwCardEffects`, `startingThrowIds` if it should appear at the start, and hand preview behavior if needed.
- When adding a new course asset, update `editorAssetTypes`, editor markup in `index.html`, render logic in `renderCourse` and `renderEditorGrid`, and saved JSON documentation above.
- When adding preset holes, put exported JSON files in `courses/`, add a file entry to `courses/course-library.js`, and copy the hole data into `CHAINBOUND_COURSES` so direct file-open play works.
- Multiple holes in one course use multiple manifest entries with the same `courseId`; they play in ascending `holeNumber` order.
- When changing level JSON, update `editorHoleJson`, `normalizeLoadedHole`, `courses/README.md`, and the JSON example in this guide.
- When changing core rules, update the relevant rules section here before or with the code change.
