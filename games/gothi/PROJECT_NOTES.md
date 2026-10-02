# GOTHI Project Notes

## Purpose

GOTHI is an Icelandic-themed, two-player strategy board game being implemented as part of the Esteemed Arcade. This file is the handoff reference for future development sessions.

## Current Status

- `engine.js` is a standalone, DOM-free rules engine. The live board delegates board data, formations, control values, legal movement, immutable move application, capture-stack release and pinning, weighted Farthing control, paired-edge scoring, Homestead checks, turn transitions, and victory detection to it while keeping animation in the UI. The engine also exposes state creation and cloning, legal moves for either team, forced passes, serialization, and deterministic position keys for future headless simulations and repetition detection.
- `ai.js` is a standalone, DOM-free, team-neutral agent module. Very Easy, Easy, and Hard can evaluate and choose legal moves for either Yellow or Purple from an engine state. Very Easy filters out immediate wins whenever a non-winning move exists, then randomly chooses from the weakest 45% of evaluated options. Its perspective-based evaluator mirrors forward movement, development, Heart control, edge pressure, captures, and Homestead pressure correctly for both sides. Hard always takes an immediate win, otherwise chooses its best, second-best, or third-best evaluated move with 70%, 20%, and 10% probability respectively. The live Purple opponent and both Bot Mode teams use this shared module; `tests/ai.test.js` verifies both colors, all three difficulties, Very Easy win avoidance, immediate wins for Easy and Hard, evaluator symmetry, and alternating headless self-play.
- `simulate.js` runs reproducible, headless AI-vs-AI tournament batches from Node. It supports independent Yellow/Purple difficulty, game count, maximum turns, repetition threshold, seed, progress, console summaries, and complete JSON reports. Tournament-only draws are classified as repetition or turn-limit results without changing the live game's victory rules.
- `run-simulations.cmd` is the zero-configuration Windows launcher for `simulate.js`; it works from PowerShell even when PowerShell script execution is disabled. `run-simulations.ps1` provides equivalent named parameters when execution policy permits it. Both use a normal `node` command when available and otherwise locate Codex's bundled Node runtime automatically.
- Bot Mode is available from the main menu. It uses the canonical Basic setup and assigns the selected Very Easy, Easy, or Hard agent to both Yellow and Purple. Autoplay starts enabled and waits four seconds after each completed move before scheduling the next; turning it off cancels a pending countdown, freezes between turns, and enables Next Turn to execute exactly one move. Human piece selection is disabled, both sides are labeled as computers in the score panel and Game Record, and saved logs identify Bot Mode and the shared bot difficulty. `tests/bot-mode.test.js` protects the menu, controls, delay, pause gate, and one-turn wiring.
- The arcade dashboard links to `games/gothi/` as a Board Prototype.
- The original `gothi_map_v1.png` remains as a visual reference, but the live prototype currently renders a standalone colored hex board without the background image.
- The canvas renders the full colored board and provides selectable pieces, hover/tap feedback, keyboard navigation, provisional terrain types, and provisional Farthing regions. Hovering a visible piece shows a team-colored tooltip with its name and control value.
- Yellow and purple starting armies are placed on canonical grid coordinates at the north and south ends.
- Thingman movement is implemented: selectable one- or two-step movement on non-water hexes. Outlaw movement is implemented: unlimited straight-line movement until the board edge, water, or another piece. Raven movement is implemented: one adjacent step or an exact two-space straight jump over any middle piece; Ravens may enter water. Gothi movement is implemented: one adjacent step or an unobstructed two-space straight move; Gothi cannot enter or pass through water. Storgothi movement matches the Outlaw. White dots mark normal destinations and red dots mark captures.
- Stacking captures are implemented. Every piece can capture every enemy piece by moving onto its hex, except that a Gothi cannot capture with its two-space move. Captured pieces remain underneath the capturer, cannot move, and exert no Farthing control. A captured stack shifts its active piece slightly left; the directly covered piece appears centered to its right, with deeper pieces cascading downward in overlapping layer order. The directly covered piece is released when its capturer moves away. Each visible miniature and exposed lower layer has its own hover target, allowing the tooltip and side readout to identify every covered piece and its inactive control value.
- Victory occurs when a player controls five Farthings or controls the opponent's Homestead Farthing. Either condition opens a modal announcement with the winner and victory reason, plus Save Game Log, View Board, Play Again, and Main Menu actions. View Board dismisses the modal into a frozen final-position review where stack tooltips remain available and a dedicated Main Menu button is shown. Save Game Log downloads a timestamped `.txt` report containing the mode, difficulty, result, final Farthing totals, starting setup, and every structured game-record entry.
- Piece movement uses a 220ms eased canvas slide. Captures, control scoring, Game Record entries, turn changes, victory checks, and computer turns finalize only after the piece reaches its destination; input is locked during the transition.
- A structured in-session Game Record logs every Yellow and Purple move with piece identity, origin, destination, captures, released covered pieces, resulting Farthing totals, passes, and victories. The chronological record appears in the side panel, resets with each new game, and can be downloaded as text when the game ends.
- Live weighted Farthing control scoring and territory highlighting are implemented. Alternating turns are implemented with Yellow moving first; only the active player's pieces can be selected. A main menu starts or resets a single-player game with the human as Yellow and the computer as Purple. The menu offers Very Easy, Easy, and Hard computer difficulty. Very Easy avoids immediate wins whenever possible and chooses from its weakest evaluated moves. Easy usually chooses from the stronger 40% of scored legal moves, still sometimes chooses from the full move list, and always takes an immediate win; Hard evaluates every legal move and every immediate opponent reply, then uses a 70/20/10 weighted choice among its top three results unless an immediate win is available. Its phase-aware evaluation prioritizes early Gothi development, controlling or neutralizing the Heart, control margins, partial edge-territory pressure, valuable captures, and immediate wins or losses from the active AI team's perspective. As covered stacks reduce the active piece count below 18, all difficulties increasingly value advancing weighted control toward the opposing Homestead; the pivot reaches full strength at 10 active pieces. Easy and Hard explicitly scan every candidate for an immediate five-Farthing or Homestead victory before using their normal selection logic; Very Easy deliberately does not. The side panel shows each player's live Farthing count. Controlling five Farthings or the opposing Homestead ends play immediately.

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
- Stack state uses each piece's `coveredBy` field, with covered pieces excluded from selection and control scoring. A piece may end any otherwise valid move on a friendly top piece; this ends its movement and covers that ally without counting as a capture. Once a stack contains four pieces, its top piece cannot be captured; it remains free to move, and moving it exposes the remaining stack. The piece readout identifies an invincible stack of four or more.


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
- The active board is rendered without the old background artwork; starting slots are defined by the canonical north and south formation coordinates.

## Tutorial

- The main menu has a full-width Learn to Play button above the normal game controls.
- Tutorial slide 1 explains both victory routes, weighted Farthing control, ties, paired edge scoring, and covered-piece inactivity alongside `map_pattern.png`.
- Tutorial slide 2 introduces the Gothi with `gothi_example.png`: control 3, one-space movement, unobstructed two-space straight movement, water restriction, and the rule that its two-space move cannot capture.
- Starting the lesson launches a solo positioning exercise with only Yellow's five canonical Gothi pieces. There is no Purple army or computer turn; after every non-winning move, Yellow immediately moves again until it controls five Farthings or the empty Purple Homestead.
- Completing the Gothi exercise exposes slide 3 for the Raven (`raven_example.png`), emphasizing control 2 versus the Gothi's 3, one-space movement, two-space straight jumps over pieces and water, water occupancy, and capture with either move.
- Slide 4 teaches the Thingman (`thingman_example.png`): control 1, one or two flexible steps, no water entry, and capture on its final destination. Slide 5 teaches the Outlaw (`outlaw_example.png`): control 1, unlimited straight-line movement, blocking by water and pieces, and capture of the first enemy in its path.
- The second demo gives Yellow two Ravens, two Thingmen, and two Outlaws in their canonical starting cells. Five random Purple piece types are scattered outside Yellow's Homestead; non-Ravens are kept off water. Purple pieces exert control and can be captured but never move, so Yellow retains every turn until achieving a normal victory condition.
- Completing the mixed-piece exercise opens slide 6 for the Storgothi (`storgothi_example.png`): control 3 with the same unlimited straight-line, blocked-by-water-and-pieces movement and capture rules as the Outlaw.
- The final demo gives Yellow its full canonical twelve-piece lineup. Purple uses its normal Basic formation and starting coordinates with the two outer Gothi removed, leaving ten pieces total. Purple takes normal alternating turns using Easy computer logic.
- Tutorial victories use a streamlined Tutorial Complete popup with Replay Lesson, Continue Tutorial after the Gothi and mixed-piece exercises or Finish Tutorial after the final full-lineup exercise, and Main Menu. Save Game Log and View Board remain available for normal victories but are intentionally hidden from tutorial completion popups.
## Game Modes

- Basic uses the fixed Yellow and Purple formations and begins immediately with Yellow's turn.
- Bot Mode also uses the fixed Basic formation, but both teams use the selected computer difficulty. Autoplay uses a four-second observation delay; paused games advance only through Next Turn.
- Advanced keeps the same twelve starting cells per side. Yellow, the first player, can repeatedly select two Yellow pieces to swap their starting cells, then confirms the formation.
- After Yellow confirms, Purple responds according to difficulty. Easy begins from the mirrored response and makes two to four cross-type swaps. Hard generates 120 candidate formations, scores mobility, inward development, center access, weighted lane matchups, and wing placement, then uses the same 70/20/10 weighting across the three strongest non-mirrored responses. Normal play then begins with Yellow.
- The saved text game log records the selected game mode and the finalized starting cell for every piece.
## Recommended Next Steps

1. Use the headless tournament runner to establish matchup baselines and archive representative JSON reports.
2. Decide whether the tournament's repeated-position and turn-limit draw rules should also become live-game rules.
3. Add optional Bot Mode speed choices only if playtesting shows the fixed four-second pace is insufficient.
4. Decide whether setup choices and AI reasoning need additional in-game explanation beyond the Game Record.
5. Confirm final Farthing names, boundaries, and Homestead terminology.
6. Playtest the tutorial exercises for pacing and adjust their starting positions or opposition if needed.
