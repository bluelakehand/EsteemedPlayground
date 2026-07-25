# GOTHI Project Notes

## Purpose

GOTHI is an Icelandic-themed, two-player strategy board game being implemented as part of the Esteemed Arcade. This file is the handoff reference for future development sessions.

## Current Status

- The arcade dashboard links to `games/gothi/` as a Board Prototype.
- The original `gothi_map_v1.png` remains as a visual reference, but the live prototype currently renders a standalone colored hex board without the background image.
- The canvas renders the full colored board and provides selectable hexes, hover/tap feedback, keyboard navigation, provisional terrain types, and provisional Farthing regions.
- Yellow and purple starting armies are placed on canonical grid coordinates at the north and south ends.
- Thingman movement is implemented: selectable one- or two-step movement on non-water hexes. Outlaw movement is implemented: unlimited straight-line movement until the board edge, water, or another piece. Raven movement is implemented: one adjacent step or an exact two-space straight jump over any middle piece; Ravens may enter water. Gothi movement is implemented: one adjacent step or an unobstructed two-space straight move; Gothi cannot enter or pass through water. Storgothi movement matches the Outlaw. White dots mark normal destinations and red dots mark captures.
- Stacking captures are implemented. Every piece can capture every enemy piece by moving onto its hex, except that a Gothi cannot capture with its two-space move. Captured pieces remain underneath the capturer, cannot move, and exert no Farthing control. A captured stack shifts its active piece slightly left; the directly covered piece appears centered to its right, with deeper pieces cascading downward in overlapping layer order. The directly covered piece is released when its capturer moves away.
- Live weighted Farthing control scoring and territory highlighting are implemented. Alternating turns are implemented with Yellow moving first; only the active player's pieces can be selected. A main menu starts or resets a single-player game with the human as Yellow and the computer as Purple. The computer automatically evaluates legal moves, captures, and resulting Farthing control on its turn. The side panel shows each player's live Farthing count, and the first player to control five Farthings wins and ends play.

## Canonical Retheme

The redesign document is `C:\Users\lavah\Downloads\Gothi Redesign.docx`.

| Legacy name | GOTHI name | Role summary |
| --- | --- | --- |
| Elder | Gothi | Local chieftain-priest; strongest normal control piece |
| Chief | Storgothi | Great chieftain; strongest capture piece |
| Hawk | Raven | Mobile scout; legacy version can cross water |
| Spirit | Outlaw | Long-range moving piece |
| Warrior | Thingman | Two-step close-range piece |

The redesign overview says players compete for control of Farthings. The first player to control five Farthings, or seize the opposing Homestead, wins.

## Legacy Rules Still Used as Reference

Source: `C:\Users\lavah\Downloads\Elder - Instructions (1).pdf`.

Board concepts retained for scaffolding:

- Hex-based board.
- Eight control regions, now called Farthings.
- Two home regions, five central regions, and a paired outer region in the legacy layout.
- Both sides of the Outer Farthing must be controlled for it to count.
- Water spaces are impassable except to the Raven under the legacy movement rules.
- Neutral spaces do not count toward a Farthing.

Treat all of these as provisional until the new GOTHI rules explicitly confirm them.

## Piece Inventory Per Player

- 5 Gothi
- 1 Storgothi
- 2 Ravens
- 2 Outlaws
- 2 Thingmen
- Total: 12 pieces per player

## Starting Formation

The new map contains 12 white starting circles at each end. The current placement mirrors the legacy recommended setup.

Facing inward from either Homestead:

- Storgothi occupies the farthest center point.
- A Gothi sits directly inward from the Storgothi, flanked by two Ravens.
- Four additional Gothi form the middle defensive line.
- Two Outlaws and two Thingmen occupy the outer wings.

Purple begins in the north; yellow begins in the south.

## Important Files

- `games/gothi/index.html` - page structure and board UI.
- `games/gothi/styles.css` - GOTHI visual design and responsive layout.
- `games/gothi/game.js` - hex scaffold, Farthing classification, piece setup, and interactions.
- `games/gothi/gothi_map_v1.png` - original illustrated board reference (not currently rendered).
- `games/gothi/map_pattern.png` - canonical 75-hex color-layout reference.
- `games/gothi/*_icon_yellow.png` - yellow pieces.
- `games/gothi/*_icon_purple.png` - purple pieces.

Note: Thingman asset filenames begin with an uppercase `T`; preserve that case in web paths for case-sensitive hosting.

## Technical Model

The source map is 1363 x 1154 pixels. Board and piece coordinates are stored in that source-image coordinate system, and the canvas scales them responsively.

`game.js` currently contains:

- Flat-top hex geometry calibrated to the map artwork, using 13 staggered columns and a tuned board center (20 px left and 4 px up from the prior centered position). The standalone overlay is uniformly scaled to 91% so every outer hex fits inside the play window at the tuned board center.
- `cellCenter(q, row)` as the shared coordinate source for board cells and pieces.
- `northFormation` and `southFormation` arrays for starting piece coordinates.
- `getFarthing()` and `getTerrain()` provisional classifiers.
- Canvas rendering, pointer/keyboard piece selection, alternating Yellow/Purple turn state, geometric six-neighbor lookup, Thingman pathing, six-direction Outlaw ray movement, Raven step/jump movement, non-jumping Gothi movement, and shared Outlaw/Storgothi ray movement.
- Stack-based capture state through each piece's `coveredBy` field, with covered pieces excluded from selection and control scoring.


## Farthing Control

The pattern is divided into eight scoring Farthings:

- North and South home Farthings (green)
- Heart Farthing (charcoal)
- Northwest, Northeast, Southwest, and Southeast Farthings (ice)
- One paired Outer Farthing made from independently controlled west and east edge territories

Water and neutral tan cells belong to no Farthing. Control weight is Thingman 1, Outlaw 1, Raven 2, Gothi 3, and Storgothi 3. The higher total controls the Farthing. A tie, including 0-0, is neutral. Controlled Farthing hexes receive yellow or purple tinting, borders, and glow. The west and east edge territories highlight independently according to the pieces on that side, but award one Outer Farthing point only when the same player controls both. Control outlines render in a dedicated top pass so every controlled edge remains visible beside neutral and water cells.
## Known Provisional Areas

- Hexes currently use provisional `qÂ±N-rNN` IDs based on their calibrated column and row.
- Farthing boundaries and names beyond the generic directional labels are placeholders.
- The canonical color layout is encoded explicitly in `PATTERN_COLUMNS` and is based on `map_pattern.png`. The center is exactly seven charcoal cells: the central hex plus its six neighbors.
- Piece positions use the same `q`/row coordinates as the grid and align with the map's white setup circles.
- The board artwork itself contains the white setup markers.

## Recommended Next Steps

1. Create an explicit board-data array: hex ID, axial coordinates, pixel center, terrain, Farthing, starting-slot owner, and occupant.
2. Confirm final Farthing names and exact boundaries.
3. Bind every starting piece to a canonical hex ID rather than a raw pixel coordinate.
4. Add optional move history to the board UI.
5. Confirm and implement the opposing-Homestead win condition.
6. Decide whether the white setup circles should remain in the final board art after pieces can move.
