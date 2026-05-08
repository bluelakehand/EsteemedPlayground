# Deck Measuring Contest — Game Structure

## Overview

A daily wood-sizing guessing game. Players study a 10 m² reference deck, then estimate the area of 5 seeded decks in square metres using a slider. Golf scoring — lower total percentage error wins.

The name is a double entendre. Subtle wood/size jokes are intentional throughout the copy.

---

## Files

| File | Purpose |
|------|---------|
| `index.html` | All screens, canvas elements, slider, stat pills, scorecard |
| `styles.css` | Home Depot orange/black theme, CSS variables, slider styling |
| `game.js` | All game logic — RNG, deck generation, canvas drawing, scoring, state |

---

## Game Flow

```
Reference screen → [button] → Guess screen (×5) → Result screen (×5) → Final screen
```

1. **Reference screen** (`screen-reference`): draws a labeled 10 m² deck on `canvas-reference`. Player studies it, then clicks to start.
2. **Guess screen** (`screen-guess`): draws a puzzle deck on `canvas-deck`. Player adjusts slider (5–300 m²) and submits.
3. **Result screen** (`screen-result`): redraws the same deck on `canvas-result` with an "Actual: X m²" pill overlay. Shows 4 stat pills.
4. **Final screen** (`screen-final`): scorecard table, total score, verdict line, share button.

Screen switching is handled by `showScreen(id)` which toggles the `.active` class.

---

## Seeding & Daily Puzzles

```js
dailySeed()          // "deck-YYYY-M-D"
hashSeed(str)        // FNV-1a → 32-bit int
mulberry32(seed)     // seeded PRNG → fn() returning [0,1)
```

Each deck gets its own sub-seed: `` `${dailySeed()}-deck-${i}` `` so decks are independent but reproducible. The reference deck always uses the static seed `'reference-deck-static'`.

---

## Deck Generation

### `generateDayDecks()` → `Deck[]`

Produces 5 decks, one per area bracket:

| Deck | Area range |
|------|-----------|
| 0 | 8–22 m² |
| 1 | 22–45 m² |
| 2 | 45–75 m² |
| 3 | 75–110 m² |
| 4 | 110–150 m² |

Each deck object:
```js
{
  pts,        // polygon vertices in metres [[x,y], ...]
  area,       // actual area in m² (1 decimal place)
  bbox,       // { minX, minY, maxX, maxY, w, h }
  scale,      // px per metre (computed to fit canvas)
  ox, oy,     // canvas origin offset in px (centres the deck)
  hasFence, fenceSides, hasHouse, houseSide,  // context flags
  items,      // [{ type, mx, my }] — items placed on deck
  grainSeed,  // hash for deterministic wood grain
}
```

### Shape types (polygon coords in metres)

| Function | Shape | Probability |
|----------|-------|-------------|
| `makeRect(area, rng)` | Simple rectangle | 40% |
| `makeL(area, rng)` | Rectangle with one corner cut | 32% |
| `makeU(area, rng)` | Rectangle with a notch from one side | 28% |

All shapes are scaled post-generation via the shoelace formula so the polygon exactly matches the target area.

**To add a new shape:** write `makeFn(area, rng) → pts[][]`, compute actual area with `polyArea()`, scale by `sqrt(target/actual)`, then add a branch in `generateDayDecks()`.

### Scale computation

```js
scale = min(
  (CANVAS_W - 80) / (bbox.w + CONTEXT_MARGIN * 2),
  (CANVAS_H - 60) / (bbox.h + CONTEXT_MARGIN * 2)
)
```

`CONTEXT_MARGIN = 3.5` metres. Smaller decks appear at higher zoom — the player can't pixel-count, they must use the reference memory and the on-deck items as scale cues.

---

## Drawing Pipeline

`drawPuzzleDeck(canvas, deck)` calls in order:
1. `drawYard` — grass background with stripes and scatter dots
2. `drawHouseWall` — optional siding wall (top/left/right)
3. `drawFence` — optional wooden fence on 1–3 sides
4. `drawPolyFrame` — drop shadow + border for the polygon
5. `drawPolyWood` — wood grain clipped to the polygon shape
6. `drawItems` — places chairs, tables, BBQ, planters on the deck

### Wood grain (`drawPolyWood`)

Clips to the polygon path, then draws: base fill → horizontal plank bands → bezier grain lines → occasional knot hole → edge shading gradient. Uses `grainSeed` for determinism.

### Items (real-world scale cues)

Items are drawn at a fixed real-world size in metres, scaled by `deck.scale`. This means a patio chair looks proportionally correct relative to the deck — the player can use familiar object sizes to estimate area.

| Item | Real size |
|------|----------|
| Chair | ~0.6 × 0.6 m |
| Table | ~0.9 m diameter |
| BBQ | ~0.9 × 0.5 m |
| Planter | ~0.45 m diameter |

Placement uses point-in-polygon raycasting (`ptInPoly`) with 40 random attempts per item before falling back to the polygon centroid.

---

## Scoring

```js
roundScore = min(200, round(|guess - actual| / actual × 100))  // % off, capped
totalScore = sum of all 5 round scores
```

Golf rules — lower is better. Color thresholds:
- **Green** (good): ≤ 15% off
- **Amber** (ok): 16–35% off
- **Red** (bad): > 35% off

Verdict lines in `FINAL_LINES` array — edit there to change end-screen copy.

Best score persisted to `localStorage` under key `'dmc-best'`.

---

## Share format

```
Deck Measuring Contest YYYY-MM-DD
Score: {total}
🎯📏📐🪵🎯
Play at: {url}
```

Emoji per round: 🎯 ≤10%, 📏 ≤20%, 📐 ≤40%, 🪵 >40%.

---

## Constants to tune

| Constant | Default | Effect |
|----------|---------|--------|
| `REFERENCE_SCALE` | 90 px/m | Size of reference deck on screen |
| `REFERENCE_W / H` | 4 × 2.5 m | Reference deck dimensions (area = 10 m²) |
| `DECKS_PER_DAY` | 5 | Number of decks per session |
| `CONTEXT_MARGIN` | 3.5 m | Yard shown around each deck |
| `AREA_BRACKETS` | 8–150 m² | Per-deck area ranges |

---

## Adding a new context element

1. Write a `drawMyThing(ctx, W, H, deck, rng)` function
2. Add a flag to the deck object in `generateDayDecks()`
3. Call it in `drawPuzzleDeck()` between yard and frame
