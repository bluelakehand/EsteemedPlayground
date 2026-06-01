# Chainbound Game Guide

This guide is the handoff document for future work on Chainbound. Keep it updated when gameplay rules, card stats, level JSON, assets, or major code organization changes.

## Current Game

Chainbound is a grid-based disc golf deckbuilder. The player completes a hole by playing one disc card per throw, optionally applying one throw modifier card, and trying to finish in as few strokes as possible.

The game currently has two main modes:

- `Start Round`: opens a level selector for built-in preset courses.
- `Level Editor`: builds and saves hole JSON files for future preset courses.

## Core Rules

- The hole is a square grid.
- The player starts on the tee and throws toward the selected direction.
- A throw uses one selected disc card.
- A throw may also use one selected throw modifier card.
- Used disc and throw modifier cards are discarded after the throw.
- Putts also use and discard a selected disc card.
- The hand limit is `5`.
- The opening hand always starts with `3` disc cards, then fills the rest from the shuffled deck.
- All cards are in one shuffled deck.
- If the player has no disc card in hand, they may take a stroke penalty to draw the next disc card from the deck.
- The player cannot act while the hand is below the hand limit if normal draw cards remain.

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
- Water is available in the editor, but currently behaves as a height `0` hazard unless rules are expanded.
- A disc collides if its flight height is less than or equal to the obstacle height.
- On collision, the lie randomly kicks to the obstacle square or one adjacent square.
- If the next throw starts on an obstacle, effective disc speed is reduced by `2`.

Glide `2` currently uses a fixed height profile by speed in `flightHeight()`.

## Putting

Player putting stats:

- C1: `50%`
- C2: `10%`
- Throw-in: `3%`

Putting rules:

- Landing on the basket square triggers a throw-in roll first.
- If throw-in misses, the player gets a C1 putt.
- Landing one square away, including diagonals, gives a C2 putt.
- Putt chance is base player stat plus the selected disc's `putt` modifier.
- Missing a C2 putt moves the lie to the basket and creates a C1 putt.
- Completing the hole opens the "In the Basket!" modal with score relative to par.

## Current Cards

Disc cards live in the `discs` object in `game.js`.

| Card | Type | Speed | Glide | Turn | Fade | Putt |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| COMB | Putter | 3 | 2 | 0 | 1 | +5 |
| PALM | Midrange | 5 | 2 | -1 | 1 | +3 |
| KRAKEN | Driver | 8 | 2 | 0 | 2 | -5 |
| CACTI | Putter | 2 | 1 | 0 | 1 | +10 |
| TROPICAL | Midrange | 6 | 2 | -2 | 1 | +5 |
| GALACTIC | Driver | 9 | 2 | -1 | 1 | -10 |

Throw modifier cards live in `throwCardEffects`.

| Card | Effect |
| --- | --- |
| Power Down | Speed -1 this throw |
| Hyzer Throw | Fade +1 this throw |

The starting deck lives in `startingDeck` and currently has:

- 2 COMB
- 2 PALM
- 2 KRAKEN
- 2 CACTI
- 2 TROPICAL
- 2 GALACTIC
- 2 Power Down
- 2 Hyzer Throw

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
- Asset palette: Tee, Basket, Grass, Water, OB, Trees, Rocks, Stump, Shrub, Erase.
- Click an asset, then click a grid cell to place it.
- Tee and Basket are unique; placing a new one moves the existing one.
- Grass and Water are background tiles, not obstacles.
- OB marks out-of-bounds cells in the editor. OB is invisible during play.
- Erase removes hazards, backgrounds, OB, tee, or basket from a cell.
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
    { "type": "rock", "variant": 1, "height": 1, "x": 4, "y": 5 },
    { "type": "stump", "variant": 1, "height": 1, "x": 3, "y": 6 },
    { "type": "shrub", "variant": 1, "height": 2, "x": 6, "y": 7 }
  ],
  "backgrounds": [
    { "type": "water", "x": 5, "y": 8 }
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
  course assets/
    grass1_bg.png
    rock1.png
    rock2.png
    shrub1.png
    stump1.png
    teepad.png
    tree1.png
    tree2.png
    tree3.png
    OB.png
    water1_bg.png
```

## Important Code Sections

`game.js` is currently a single-file browser script. Main sections:

- DOM lookups: top of file.
- `courseLibrary`: loaded from embedded `CHAINBOUND_COURSES`, or built from JSON files listed in `courses/course-library.js` when running through a local server.
- `hole`: current active playable hole selected from the course library.
- `discs`: disc card definitions.
- `throwCardEffects`: throw modifier card definitions.
- `editorAssetTypes`: editor palette definitions.
- `startingDeck`: starting card pool.
- Deck/hand helpers: `resetDecksAndHand`, `drawFromDeck`, `drawNextDiscWithPenalty`.
- Flight logic: `getThrowPath`, `rotateStep`, `flightHeight`, `firstCollision`.
- Course renderer: `renderCourse`.
- Editor renderer and JSON: `renderEditorGrid`, `placeEditorAsset`, `saveEditorHole`, `loadEditorHole`.
- Level selector: `renderCourseSelector`, `showCourseSelect`.
- UI state: `showRound`, `showMenu`, `showEditor`, `updateThrowControls`.

## Maintenance Notes

- When adding a disc, update `discs`, `startingDeck` if it should be available, and add the image in `discs/`.
- When adding a throw card, update `throwCardEffects`, `startingDeck`, and hand preview behavior if needed.
- When adding a new course asset, update `editorAssetTypes`, editor markup in `index.html`, render logic in `renderCourse` and `renderEditorGrid`, and saved JSON documentation above.
- When adding preset holes, put exported JSON files in `courses/`, add a file entry to `courses/course-library.js`, and copy the hole data into `CHAINBOUND_COURSES` so direct file-open play works.
- Multiple holes in one course use multiple manifest entries with the same `courseId`; they play in ascending `holeNumber` order.
- When changing level JSON, update `editorHoleJson`, `normalizeLoadedHole`, `courses/README.md`, and the JSON example in this guide.
- When changing core rules, update the relevant rules section here before or with the code change.
