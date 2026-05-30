# Arcane Glitch Prototype Notes

## How to Run

This is currently a static browser prototype. Open `index.html` directly in a browser.

No build step, package manager, or dev server is required right now.

## Debugging

- Runtime debug logging is enabled in `main.js` with `DEBUG_GAME`.
- Logs are written to the browser console with the `[ArcaneGlitch #]` prefix.
- Recent structured events are also stored in `window.arcaneDebugEvents` for copying from DevTools.
- Global `error`, `unhandledrejection`, and `pagehide` events are logged to help diagnose crashes or unexpected tab closes.

## Project Maintenance

- Keep this file updated when implementing important gameplay, UI, data, save/load, asset, or generation changes. The goal is to preserve project context for future sessions.
- Minor visual tuning does not need a full writeup, but changes to rules, mechanics, metadata formats, room generation, enemies, programs, progression, or persistence should be reflected here.

## Main Files

- `index.html` is the browser entry point and main menu shell.
- `how-to-play.html` is a standalone guide page linked from the Main Menu. It explains the core loop, turns, movement, Sigil-Casting, crafting, rewards, and links to the Program reference.
- `program-reference.html` is a standalone reference page outside the game flow. It loads `metadata/programs.js` and lists every Program with its icon, requirements, description, and cooldown.
- `main.js` contains the game data, screen rendering, procedural room generation, movement, camera, Sigil-Casting, program allocation/effects, combat, and enemy behavior.
- `styles.css` contains all UI, board, token, program list, Sigil-Casting panel, enemy list, and responsive styling.
- `metadata/programs.js`, `metadata/glitchspawn.js`, and `metadata/artifacts.js` are plain editable metadata files for adding Programs, Glitchspawn, and Artifacts without editing the main game file for simple entries.
- `Arcane Glitch.docx` contains the original high-level game design notes.

## Editable Metadata

The metadata files are JavaScript text files loaded before `main.js` so the game can still run by opening `index.html` directly.

- `metadata/programs.js` supports these current effect types:
  - `damageAdjacent`: deals `amount` damage to an adjacent enemy. Set `damageType` to `arcane` or `physical`; optional `healAmount` restores Integrity after the hit.
  - `damageLine`: targets a hex `distance` spaces away in a straight line. Set `damageType`, `amount`, and optional `revealTarget`.
  - `debuffDefense`: reduces Physical Defense and Arcane Defense on an adjacent enemy by `amount`.
  - `damageAdjacentAll`: costs optional `selfDamage` Integrity, then damages all adjacent enemies. Set `damageType` to `arcane` or `physical`, or use `damageEntries` for multiple damage types.
  - `confuseEnemy`: targets an adjacent enemy; next Glitchspawn turn it attacks another enemy instead of the player.
  - `resetOtherCooldowns`: clears cooldowns on all other equipped programs.
  - `healIntegrity`: restores Integrity by `amount`.
  - `blinkStraight`: teleports exactly `distance` spaces in a straight line.
  - `nextTurnExec`: adds `amount` temporary Executions on the next player turn. Optional `currentAmount` adds temporary Executions immediately.
  - `revealRiftThreads`: temporarily reveals all uncollected Rift Thread hexes and can pull them closer to the player.
  - `pushEnemy`: targets an adjacent enemy, pushes it one hex away, and applies `stunTurns`.
  - `sightRangeBonus`: increases line of sight by `amount` for `playerTurns`.
  - `implodeVisible`: all visible enemies take direct damage equal to their Physical Defense.
  - `temporaryExecBoost`: adds temporary Executions now and for a set number of future turns.
  - `invertIncomingDamage`: converts enemy attacks that would damage the player into healing.
  - `stunAllEnemies`: stuns every living enemy on the map.
  - `damageLineFalloff`: targets a straight-line hex and applies a damage list along the line.
  - `manifestDieFace`: lets the player set another rolled die to one of that die's faces for the current Sigil-Cast.
  - `blinkAnywhere`: teleports to any unoccupied hex on the map.
- Programs do not have a fixed `element` field. Program identity, reference icons, UI accents, reward eligibility, and casting requirements are derived from the sigils listed in `requirement`.
- Programs support a `cooldown` number. When a program is used, any cooldown greater than 0 disables that program immediately and for the next affected player turn while the counter ticks down.
- `metadata/glitchspawn.js` stores enemy stats, XP values, image paths, behavior tags, and accuracy.
- `metadata/artifacts.js` stores permanent and temporary artifact rewards with `rarity`, `type`, and optional `effect` data. Permanent stat artifacts support `cache`, `exec`, `move`, and `maxIntegrity`.
- More complex effects still require `main.js` support, but simple damage/heal/stat entries can be added in metadata.

## Asset Folders

- `transparent/` contains transparent Runecode face symbols for `Mind`, `Surge`, `Void`, and `Life`, numbered `1`, `2`, and `3`.
- `pixel art/` contains pixel-art element symbols, including `_px_large` files now used by the dice, program, and Sigil-Crafting UI.
- `pixel art/` also contains pixel-art Glitchspawn sprites used by current enemy metadata.
- `characters/` contains character portraits, character name images, the Encantra board token, and `glitchspawn_1.png`.
- `characters/*_px.jpg` portrait files are used by the character selection screen.
- `characters/*_character.png` files are used as the selected character's in-room map token.
- `sound/` contains the looping background music used from the menu through the run.
- Root `hex_*.png` files are board tile art.
- `hexes/` contains newer map tile art, including the global Rift tile and quadrant-specific basic tile variants.

## Major Redesign Roadmap

The next major design pass should shift the prototype toward a pixel-art tactical roguelite identity and a stronger dice-crafting core.

### Pixel-Art Style

- Move the visual direction to pixel art for characters, Glitchspawn, map tiles, artifacts, Rift Threads, sigils, and major UI icons.
- Keep the black sci-fi base with white text, but replace soft/glass effects with crisp pixel outlines, limited-palette glows, and chunkier tactical RPG panels.
- Use CSS such as `image-rendering: pixelated` for pixel assets.
- Damage numbers, highlights, buttons, panels, and hover states should be restyled to match the pixel-art direction.

### Sigil Crafting

- Dice should become craftable containers instead of fixed elemental dice.
- Dice start blank, and players attach sigils to individual die faces.
- Sigils should carry their own metadata: element, rarity, name, image, and any future tags.
- Program requirements refer to sigil element and rarity through `requirement` entries; the Program itself is not tied to one element.
- Blank or locked die faces should produce no sigil when rolled unless later design decides otherwise.
- Progression rewards can eventually grant new sigils, unlock die faces, upgrade existing faces, or add more dice.

### New Starting Loadout

- Players should start with all four base programs equipped or available:
  - `BLINK`
  - `SPARK`
  - `REBUILD`
  - `FOCUS`
- Players should start with only one die.
- The starting die should have 3 usable faces that the player customizes with starting sigils.
- This makes the initial build decision about which base programs the first custom die can support.

### World Map Expansion

- Replace the current simple branching prototype with a larger explorable world map.
- Map regions should lean into elemental strategies through reward bias, enemy bias, tile bias, and event/story hooks.
- Example route identities:
  - Surge-focused regions emphasize damage programs, aggressive enemies, Power Hubs, and combat rewards.
  - Life-focused regions emphasize sustain, Havens/safe tiles, healing rewards, and defensive artifacts.
  - Void-focused regions emphasize Rift manipulation, Blink/mobility, hidden paths, and thread/rift objectives.
  - Mind-focused regions emphasize Sigil-Casting control, EXECUTIONS, rerolls, disruption, and planning rewards.
- Level-map nodes should eventually preview route theme, threat level, likely rewards, and special conditions before entry.

### Larger Rooms And Vision

- Baseline player vision is now 2 spaces.
- Room sizes should increase further to support the larger vision radius and more exploration.
- Board tile art, tokens, and tile overlays are currently rendered at roughly 75% of the previous map scale so more of the room remains readable.
- Camera, drag bounds, click targets, token animations, and hover/target indicators will need review after map scale changes.
- Hidden/explored tile rules should remain: unseen spaces stay blank, previously seen spaces show greyed-out real tile art.

## Current Flow

1. Main menu has a sci-fi black/white theme with falling Runecode symbols.
2. Background music starts on menu load when the browser allows autoplay, otherwise it starts on the first player interaction and loops through the game.
3. `Start Run` opens character setup.
4. `Load Game` opens a local file picker for a previously downloaded JSON save file.
5. `How to Play` opens the standalone guide page, which links to the Program reference page.
6. Character setup requires selecting one character and crafting one starting die. The selected character presets one locked common sigil on the starting die: Arax = Void, Encantra = Surge, Dextritus = Life, and Jin-Ra = Mind.
7. The starting die has 6 face slots, starts with the selected character preset, and the player assigns 2 additional common elemental sigils before the run.
8. `Test Mode` starts Encantra directly on a Tier 2 Cindara node with two fully loaded common dice, extra common sigils, and one Cycles Pip plus one Fortune Pip in the crafting inventory.
9. Entering the run opens the Level Map.
10. The current Level Map shows the Q-Dara world map with four unlocked elemental starting nodes.
11. Entering a room generates a connected hex room and starts turn 1.
12. Closing the room Rift shows a completion screen, then returns to the Level Map with that node marked complete and its connected child nodes unlocked.

## Save/Load

- The room screen has a `Save Game` button above the right-side enemy display.
- Saving downloads a JSON file named like `arcane-glitch-save-<timestamp>.json`.
- Loading is available from the main menu through the `Load Game` button and a hidden file input.
- Browser security means the game cannot silently write a file directly into the repo folder when opened as a normal page; save/load uses explicit JSON download and upload.
- Save files store the character, world map progress, stats, XP, artifacts, dice/loadout, sigil and pip inventories, program library/equipped programs, cooldowns, current generated room, player position, explored tiles, pickups, walls, enemies, temporary phase/vision state, and other current-room state needed to resume.
- Save files also store the player's `Cycles` currency total and any uncollected Cycle drops in the current room.

## Current Characters and Programs

- All characters currently start with the four base programs: `BLINK`, `SPARK`, `REBUILD`, and `FOCUS`.

The base program set is previewed during character setup and listed on the left side in the run.

## Dice Rules

The current starting die is a custom object with 6 face slots:

- A new run starts with one custom die.
- The player assigns exactly 3 common sigils to that die during character setup.
- Each element can be used up to 2 times on the starting die.
- Unassigned faces are blank and produce no sigil when rolled.
- The setup screen supports dragging a common sigil onto a face slot, plus click-to-select/click-to-place as a fallback.
- Level-up blank dice roll their side count when the reward is offered: 6 sides 45%, 5 sides 30%, 4 sides 20%, or 3 sides 5%.

Legacy elemental dice still use `dieFaces = [1, 1, 1, 2, 2, 3]` in `main.js`. Custom dice store a per-die `sides` count and only roll or render that many face slots.

Important mapping:
- Die positions 1-3 are always common.
- Die positions 4-5 are always uncommon.
- Die position 6 is always rare.

The numbered image assets represent rarity symbols:
- `_1` is common.
- `_2` is uncommon.
- `_3` is rare.

The Void transparent image mapping is intentionally remapped in `dice.void.files`:
- Common uses `transparent/Void_2.png`.
- Uncommon uses `transparent/Void_3.png`.
- Rare uses `transparent/Void_1.png`.

## Room and Movement

- Room sizes scale with progression (see Room Scaling section below).
- The first room on each starter route uses only basic tiles plus exactly one Rift tile, one Rift Thread, one stationary 1-Integrity Rift enemy, and one floating Sigil pickup. It has no Cache tile or Artifact pickup.
- Cindera rooms randomize basic spaces from `hexes/cindera_hex_basic1.png` through `hexes/cindera_hex_basic4.png`.
- Conclave rooms randomize basic spaces from `hexes/conclave_hex_basic1.png` through `hexes/conclave_hex_basic4.png`.
- Parcel 7 rooms randomize basic spaces from `hexes/parcel7_hex_basic1.png` through `hexes/parcel7_hex_basic4.png`.
- Sestra Jungle rooms randomize basic spaces from `hexes/jungle_hex_basic1.png` through `hexes/jungle_hex_basic4.png`.
- The player starts on the first generated basic tile.
- The Rift tile is selected from farther non-start border tiles and uses `hexes/rift_hex.png` for all rooms.
- Never-seen hidden tiles use `hex_hidden.png`, but their real tile type is pre-generated and static.
- Once a tile has been visible, it remains explored after the player moves away: it shows its real tile art in a greyed-out state instead of returning to blank.
- Tier 2+ rooms attempt to place one Cache tile and one separate floating Artifact pickup. Each Cache placement has a 30% chance to stay a normal hex and become an extra pip-only Artifact pickup instead.
- Cache tile upgrades only offer Program rewards. Program choices appear when at least one of the Program's required sigil elements is present in the character's dice pool. Program rewards are always added to the Program Library, even if CACHE is full.
- Program cache rewards show two program choices and include the program effect text.
- Increasing CACHE capacity does not automatically equip extra Programs. Empty Cache slots remain empty until the player explicitly selects Programs in `Change Programs` and confirms the loadout.
- Floating Artifact pickups use `artifact_1.png` and open a choice between two random Artifacts when collected. Pip-only pickups only roll pip artifacts and add the selected pip to `character.pipInventory`.
- Floating Sigil pickups appear in rooms and use the current pixel-art element sigil asset. Moving onto one collects it and opens a New Sigil Acquired popup where the player can equip it to a blank die face.
- Floating Sigil pickups are placed at least 3 hexes away from the player start when the generated room has a valid candidate tile that far away.
- If there are no blank custom die faces, collected Sigils are held in `character.sigilInventory` for future handling.
- Pip artifacts go into `character.pipInventory` instead of the artifact bar. Pips are crafted onto the upper-right corner of custom die faces from the Crafting Databank.
- Tier 2+ rooms roll roughly one 50% Haven tile chance per 15 hexes. Standing on an active Haven prevents enemy attacks for the next Glitchspawn turn, then the tile becomes inactive for the rest of the level.
- Tier 2+ rooms have a 50% chance to include one Power Hub. The first time the player enters it, it restores 2 Integrity and then changes to the off-state tile for the rest of the level.
- If the character has available CACHE capacity, a selected Program is equipped immediately.
- Artifacts now have rarity (`common`, `uncommon`, `rare`) and can be permanent or temporary. Permanent artifacts apply stat upgrades immediately. Temporary artifacts may apply immediately, last for a limited number of turns, or remain as one-use buttons in the artifact strip.
- Usable artifacts display as artifact-strip buttons above the current character stats. Hover/focus shows the artifact name and mechanical grant.
- Cycles are the run currency. The main Cycles payout happens when the Rift closes; enemy drops are smaller supplemental pickups. Cycle drops use `cycles_currency.png`, appear on the defeated enemy's hex, and are collected by moving onto that hex.
- Each room computes a Cycles Reward from a Max Turns budget: `ceil(hex count / 2) + starting enemy count * 5 + Rift Thread count * 5`. The room HUD shows current Cycles with the pending reward as gold `+reward`, plus a `current turns / next reward threshold` counter that advances to the next threshold as the reward drops. The reward pays out on level completion: 90%+ of Max Turns = 50, 80%-90% = 100, 50%-80% = 200, 40%-50% = 300, and 40% or less = 400.
- World-map Market nodes open a one-time shop instead of a combat room. Entering a Market first shows a confirmation that the shop can only be visited once. Continuing marks the Market visited, unlocks downstream map nodes, and opens a shop with two Artifact offers of different rarities plus one Sigil-Glyph offer. Purchases spend Cycles; common Artifact pricing starts around 600 Cycles and scales upward by rarity.
- Rift Threads are placed on non-Rift tiles. They render as purple floating strings/loops of energy only when their tile is visible, with a dark backing/outline so they remain readable over tile art.
- Moving onto a Rift Thread collects it and updates the top HUD thread tracker.
- Moving onto the Rift closes the level after all room Rift Threads are collected. Enemies do not have to be defeated to close the Rift.
- Hovering the Rift hex shows a tooltip: `Can be closed after collecting all Rift Threads.`
- Movement pathing spends 1 Action per hex moved. The Actions stat starts at 2 and is the shared pool for movement and Sigil-Cast rolls.
- While Move mode is active, hovering a reachable hex previews the movement route with white dots. Clicking a hex up to the remaining Action distance moves there and spends the full path cost.
- Pressing `Move` disables drag panning until the movement click resolves or the mode is cancelled.
- The player tile and tiles within 2 spaces are lit. Other tiles render as shadowed hexes with white outlines.

## Room Scaling

Rooms are exploration + Thread Hunt rooms. The player must collect all Rift Threads before closing the Rift. Tier 1 is a no-enemy onboarding room. Later rooms add Glitchspawn as threats and XP sources, but they do not need to be defeated to close the room. Thread count, enemy count, and room size scale with room progression. Each level places one Sigil pickup, with the node's Sigil Occurrence Percentages controlling which sigil drops.

| Room Tier | Hex Tiles | Rift Threads | Sigils | Enemies |
|-----------|-----------|--------------|--------|---------|
| 1         | 30        | 1            | 1      | 1 stationary |
| 2         | 48        | 2            | 1      | 2       |
| 3         | 60        | 2            | 1      | 3       |
| 4         | 72        | 3            | 1      | 4       |
| 5         | 84        | 4            | 1      | 5       |
| 6         | 96        | 4            | 1      | 6       |
| 7+        | up to 120 | up to 6      | 1      | up to 9 |

- Tier 1 enemies spawn on the Rift for onboarding rooms, except Parcel 7 where the Tier 1 enemy spawns on the player's island so the Rift can remain across the gap. Later enemies are placed on or near the Rift tile when the Rift shares the player's landmass. In disconnected island rooms, enemy spawn placement seeds at least one enemy on each connected island when there are enough enemies, then fills remaining enemies from the normal spawn pool. Parcel 7 enemies are hyper-aggressive from Tier 2 onward and always try to move toward the player each enemy turn.
- Additional threads are distributed across non-Rift, non-start border tiles.
- Room tier is determined by the node's position on the Level Map, not the player's level.
- Cache tiles do not appear in Tier 1. Cache tiles and artifact pickups appear in Tier 2+ rooms.
- Room shapes vary by realm:
  - Cindera favors wide, dense clusters with fewer hallway-like one-off tiles. Tier 3+ Cindera rooms can occasionally remove interior hexes to create empty pockets in the landscape.
  - Parcel 7 favors multi-hex islands separated by one-hex gaps that require BLINK-style traversal. Tier 1 always has two land sections. Tier 2 has one separate island and places the Rift on that island when generation succeeds. Later tiers have at least two and currently cap at four total sections.
  - The Conclave favors ordered 2-hex and 3-hex-wide horizontal or vertical hallways.
  - Sestra Jungle favors meandering paths with unfilled hex gaps acting as blockers. Early Jungle rooms are shorter than default tier rooms, and the meander generator is bounded so layouts stay inside the pannable room area.
- Tier 4+ rooms in all realms use island-style generation with one-hex gaps, matching the Parcel 7 traversal pattern.
- Wall generation checks room connectivity before committing each wall group so walls should not seal the only route through 1-wide corridors.

## Camera

The run board uses click-and-drag panning in the room viewport.

The camera bounds are intended to allow any hex tile to be centered in the viewport. The camera also recenters on the player's tile after room updates and movement.

## Run Actions

- `Move` enables adjacent movement selection.
- `Sigil-Cast` activates the Sigil-Casting panel below the program list.
- `Programs` and `Crafting` sit in the bottom action row with Move, Sigil-Cast, and End Turn. Each costs 1 Action to open. `Programs` opens equipped Program selection; `Crafting` opens the dice workbench over the current room without leaving the level.
- The Equip Programs overlay keeps the Confirm Loadout button pinned below the owned-program list while the list itself scrolls inside the panel.
- The first `Cast Sigils` roll casts all equipped dice automatically.
- Each turn starts with Actions equal to the current Actions stat. Each hex moved spends 1 Action. Opening the Sigil-Casting panel spends 1 Action and starts a full Sigil-Cast.
- Executions control roll attempts inside the active Sigil-Cast. The first roll casts all equipped dice automatically; later Execution rolls can choose unassigned sigils to reroll while keeping the others.
- If no target/assignment is pending, the player can spend another Action to abandon the current rolled symbols and start a fresh Sigil-Cast. They do not have to use a valid program or physical attack from the current rolls.
- When Sigil-Casting is active, the left control rail expands into the open space beside the program cards. Rerollable dice are compact square buttons in a two-column grid, switching to a smaller three-column layout at 5+ dice, and the `Cast Sigils` button sits in a right-side column so it remains visible when several dice are equipped.
- `End Turn` resets Actions, advances the turn counter, runs the current Glitch Spawn step, and resolves adjacent enemy attacks.
- If all Glitchspawn in the room are derezzed, a one-time notice appears. After that, enemy turns are skipped, but movement still spends Actions normally.
- The map viewport shows the current phase as `Player Turn` or `Glitchspawn Turn` in its upper-right corner.
- Player controls are disabled during the Glitchspawn turn.
- Enemy tokens animate from their previous visible tile to their new visible tile during Glitchspawn movement.
- The player token animates through each hex in the selected movement path before the camera recenters.
- The player token does a short shake when the player takes Integrity damage.
- If player Integrity reaches 0, the run ends with a defeat popup and returns to the main menu when acknowledged.
- The defeat popup shows run summary stats: enemies killed, Rifts closed, and total turns taken. Closed-room turn totals are stored on the character, and the active room's current turn is added when the player is de-rezzed.

## Level Map

- `showLevelMap(character)` renders between character setup and the room.
- The current map uses `map/main_world_map.png` as the background image and overlays the playable node graph from `WORLD_MAP_SPEC.md`.
- The world map is split into four elemental route quadrants: Cindera/Surge, The Conclave/Mind, Parcel 7/Void, and Sestra Jungle/Life.
- The starter node at the top of each quadrant is unlocked at the beginning of a run, so the player can choose which elemental route to start.
- Downstream nodes remain darkened and disabled until a connected parent node is completed.
- Unlocked nodes and open route connections glow white. Completed nodes use a green completion treatment.
- Pressing a node only selects it; the player must press `Enter` to launch that room.
- The Level Map has a `Crafting` button above the map. Crafting opens a dice workbench where the player can drag or click sigils between the Databank inventory and custom die faces, then press `Done Crafting` to return to the Level Map.
- The Level Map header shows the current Cycles total next to the Crafting button so players can check their money before entering a market.
- Room tier is derived from the selected world-map node depth. Start nodes are Tier 1 and boss nodes are Tier 6.

### Level Map Current Implementation

- `worldZones` in `main.js` stores each route's nodes, edges, element, and color treatment.
- `buildWorldLevelNodes()` converts local route node ids into unique ids such as `cindera-start` and `sestra-n11`.
- `startingMapState.unlockedNodes` is generated from all route start nodes.
- Completing a node calls `completeLevelNode()`, which unlocks every child listed in that node's edge list.
- Completed combat level nodes stay visible/selectable on the World Map for review, but their Enter button is disabled and reads `Cleared`; they cannot be re-entered.
- Each world-map node has a `sigilProfile`, which is shown in the selected-node footer next to the Enter button and passed into room generation for floating Sigil pickups.
- Sigil generation rolls element and rarity separately.
- Starter nodes currently have an 85% matching route element chance and 5% for each other element. Rarity is 100% common, 0% uncommon, and 0% rare.
- Non-starter nodes currently use placeholder route-biased element odds and rarity odds that scale by node tier.

## Character Progression

- Characters track `level`, `xp`, and `xpToNextLevel` on the run character object so progress persists between rooms and the Level Map.
- Characters currently start at Level 1 with 0 XP and need 50 XP to reach Level 2.
- Characters currently start with CACHE 4. CACHE limits the number of programs the character can have equipped.
- The in-run program list shows one blank slot for each unused CACHE capacity.
- Characters keep a Program Library separate from equipped Programs. Cache rewards add Programs to the library; if the library exceeds CACHE capacity, the player chooses which Programs to equip.
- Enemy definitions include an `xpValue`. XP is awarded when that enemy is defeated.

### XP Threshold Scaling

XP required to level up scales at approximately 1.5x per level:

| Level | XP to Next Level |
|-------|-----------------|
| 1     | 50              |
| 2     | 100             |
| 3     | 150             |
| 4     | 225             |
| 5     | 340             |
| 6+    | continues ×1.5  |

After leveling up, `xpToNextLevel` should update to the next threshold. XP does not reset between rooms — it carries across the full run.

### Level-Up Rewards

When a level-up occurs from defeating an enemy, the reward appears immediately in the current room.

- **Add a die to the pool** — player selects one new die from any element.
- Level rewards currently only grant dice, not stats or programs.
- Current implementation grants a blank custom die with a weighted side count instead of choosing an elemental die.

### Artifacts

Current permanent artifact pool:
- `Power Glyph` (Uncommon): EXECUTIONS +1
- `Cache Core` (Uncommon): CACHE +1
- `Integrity Lattice` (Common): Max Integrity +1 and restores 1 Integrity
- `Biomechanics` (Rare): Actions +1
- `Arcane Knowledge` (Rare): grants a new 8-sided blank die.

Current temporary artifact pool:
- `Adrenaline Spike` (Common): 1 use. Activates from the artifact bar, adds +1 Action immediately on the current player turn, then keeps the +1 Action turn-start boost for the next 2 player turns.
- `Jungle Herbs` (Uncommon): Heal 2 Integrity immediately.
- `Reality Warp` (Rare): 1 use. Deals 1 Arcane Damage to all surrounding enemies.
- `Pixel Bomb` (Common): 1 use. Deals 2 Physical Damage to an adjacent enemy.
- `Sigil-Glyph` (Uncommon): 1 use. Rolls with a specific element/rarity sigil and can satisfy a program requirement during Sigil-Casting from the player artifact bar.
- `Psychic Resonator` (Rare): 1 use. Reveals all enemies, then targets one revealed enemy for 4 Arcane Damage.
- `Mag Shield` (Uncommon): 1 use. Blocks all damage for 3 turns.
- `Sky Walkers` (Common): 1 use. Each Move action covers 1 extra space for 5 turns.

Artifact choice rewards roll rarity first, then choose an artifact from that rarity pool. Choice popups exclude duplicate artifact ids within the same offer. `Sigil-Glyph` instances roll and store a specific sigil when acquired.
Artifact choice cards and the player artifact bar use images from `artifacts/`; `Sigil-Glyph` uses its stored sigil image unless a dedicated artifact image is added later. During Sigil-Casting, assignable Sigil-Glyphs highlight in the artifact bar after a program is selected, then clicking the highlighted artifact spends it.
One-use artifacts are removed from the player artifact bar when their final use is consumed.

Current pip artifact pool:
- `Cycles Pip` (Uncommon): craft onto one die side; when that side rolls, immediately gain +10 Cycles and show a yellow `+10` splash above that die result.
- `Fortune Pip` (Uncommon): craft onto one die side; that side gets +10 percentage points to its roll chance and the other sides share the reduced chance. This scales by die side count.
- `Arcane Pip` (Rare): craft onto one die side; when that side rolls, immediately add +1 Execution to the current Sigil-Cast.

## Sigil-Casting and Programs

- Programs are greyed out when Sigil-Casting starts because no rolled symbols are available yet.
- Completed dice results produce `currentCastSymbols`.
- Programs become available only if their required unspent symbols are showing.
- Selecting a program highlights valid rolled sigils first. The player then clicks the specific sigil to assign, removes that spent die result from the Sigil-Casting area, and shows the allocated die tile outside the program card's right edge.
- Physical Damage also requires choosing a specific rolled sigil. Matching unspent copies of that same symbol are spent together for the 1/3/5 damage scaling.
- If a Sigil-Cast ends with only blank results and no Executions remaining, the blank results stay visible while the active cast ends so the player can choose another action or end the turn.
- Room footer status text should be compact, share the map viewport width, and wrap across multiple lines when messages are long.
- `Physical Damage` appears only while Sigil-Casting. It is greyed out until at least one unspent die result exists.
- Damage indicators should pop over damaged targets or the player tile, use red text, and show the final Integrity damage dealt after defense.
- The Integrity stat HUD uses a red health bar with current/max text.
- Physical Damage uses the best matching group of unspent rolled symbols:
  - all unique symbols: 1 physical damage
  - two matching symbols: 3 physical damage
  - three or more matching symbols: 5 physical damage
- Blank results never count toward Physical Damage matching, even if a blank roll lacks a `blank` flag in state; Physical Damage only counts real rolled dice sigils with an element and face. Sigil-Glyph artifact symbols do not count toward Physical Damage matching.

Implemented program effects:
- `SPARK`: consumes one common Surge symbol, targets a hex exactly 2 spaces away in a straight line, and deals 2 physical damage minus Physical Defense if an enemy is there.
- `REBUILD`: consumes one common Life symbol, restores 1 Integrity immediately, and has a 3-turn cooldown.
- `BLINK`: consumes one common Void symbol, then targets a connected hex exactly 3 spaces away in a straight line and teleports there.
- `QUAKE`: consumes one common Surge and one common Life symbol, then deals 1 Physical Damage and 1 Arcane Damage to all adjacent enemies.
- `SHATTER`: consumes one common Mind and one common Surge symbol, then reduces an adjacent enemy's Physical Defense and Arcane Defense by 1.
- `BLINK II`: consumes one common Surge and one common Void symbol, then teleports exactly 4 spaces in a straight line.
- `DRAIN`: consumes one common Life and one common Mind symbol, deals 1 arcane damage to an adjacent enemy, then heals 1 Integrity.
- `CONFUSE`: consumes one common Mind and one common Void symbol, then makes an adjacent enemy attack another Glitchspawn on its next turn instead of the player.
- `FORTIFY`: consumes one common Void and one common Life symbol, then clears cooldowns on all other equipped programs.
- `RIFT`: consumes two common Void symbols, reveals all uncollected Rift Thread hexes for the current turn, and moves each uncollected Rift Thread 1 hex closer to the player when a valid adjacent tile exists.
- `BOLT`: consumes two common Surge symbols, then deals 3 arcane damage to an adjacent enemy.
- `PUSH`: consumes two common Life symbols, then pushes an adjacent enemy one hex away and stuns it for its next turn.
- `SHADOW`: consumes two common Mind symbols, then lets the player move through enemy-occupied hexes until the end of the next player turn. The player still cannot stop on an enemy.
- `ENTANGLE`: consumes one uncommon Life symbol, then sets all adjacent enemies to 0% accuracy for their next enemy turn.
- `PHASE`: consumes one uncommon Mind symbol, then lets the player move and attack through walls for the next 5 turns. Enemies still respect walls.
- `DEATHTOUCH`: consumes one uncommon Void symbol, targets an enemy exactly 2 spaces away in a straight line, destroys it, and moves the player onto that hex.
- `BOLT II`: consumes one uncommon Surge symbol, then deals 4 arcane damage to an adjacent enemy.
- `IMPLODE`: consumes one common Surge and one uncommon Surge, then all visible enemies take direct physical damage equal to their Physical Defense. Cooldown 5.
- `FORSIGHT`: consumes one common Mind and one uncommon Mind, then adds 1 Execution for the current Sigil-Cast and the next 4 turns. Cooldown 4.
- `SIPHON`: consumes one common Life and one uncommon Life, then the next 2 enemy attacks that would damage the player heal instead. Cooldown 3.
- `GRAVITY`: consumes one common Void and one uncommon Void, then stuns all enemies on the map for the next enemy turn. Cooldown 4.
- `PLASMA`: consumes one rare Surge, then targets a straight-line hex up to 4 spaces away and deals 8/6/4/2 arcane falloff damage along the line. Cooldown 4.
- `MANIFEST`: consumes one rare Mind, then lets the player set another rolled die to any one of that die's faces for the current Sigil-Cast. Cooldown 2.
- `BLINK III`: consumes one rare Void, then teleports to any unoccupied hex on the map. Cooldown 4.
- `REGENERATE`: consumes one rare Life, heals 10 Integrity, and cannot be used again in the current level.
- `Physical Damage`: consumes one or more symbols based on the best matching group, targets an adjacent enemy, and deals physical damage minus Physical Defense.
- `FOCUS`: consumes one common Mind symbol, adds 1 temporary Execution to the current Sigil-Cast, and adds 1 temporary Execution to the next player turn.

## Enemies

### Current Enemy

- `Void Raider`
- Image: `characters/glitchspawn_1.png`
- Integrity: 4
- Physical Defense: 0
- Arcane Defense: 0
- Power: 1
- XP Value: 25

The Void Raider starts on the Rift tile. After the player's turn, it moves one adjacent step toward the player unless already adjacent. If adjacent, it attacks the player for damage equal to its Power.

If the Void Raider is within the player's visible tiles, its tile is highlighted red and a compact enemy row appears on the right side. Hover/focus on that row shows full details.

### Glitchspawn Behavior and Accuracy

- `neutral`: moves randomly to an adjacent open tile each Glitchspawn turn.
- `aggressive`: has a 50% chance each Glitchspawn turn to move one adjacent step toward the player.
- `hyperAggressive`: moves one adjacent step toward the player every Glitchspawn turn.
- Enemy attacks use `stats.accuracy` as a hit chance. Baseline accuracy starts around 40%.
- Proximity attackers such as Plasmoids attack when the player moves next to them. If they already made that proximity attack this player turn, they do not also attack on End Turn unless the player moved away and back next to them first.
- Accuracy currently increases by 5 percentage points per room tier above Tier 1, capped at 85%.

### Additional Enemies

**Surge Crawler**
- Integrity: 3
- Physical Defense: 0
- Arcane Defense: 0
- Power: 3
- XP Value: 30
- Behavior: Aggressive. Has a 50% chance each Glitchspawn turn to move toward the player. High damage, low survivability. Glass cannon.

**Mind Phantom**
- Integrity: 5
- Physical Defense: 0
- Arcane Defense: 1
- Power: 1
- XP Value: 40
- Behavior: Neutral movement. Also forces one of the player's dice to re-roll at the start of the player's Sigil-Casting phase. Threatening because it disrupts symbol matching, not because of raw damage.

### Enemy Scaling

- Tier 1 rooms: 1 Void Raider starts on the Rift with 1 Integrity and uses stationary behavior, so it does not move off the Rift.
- Tier 2 rooms: 2 enemies, mix of Void Raider and Surge Crawler.
- Tier 3 rooms: 3 enemies, introduce Mind Phantom. Begin mixing all three types.
- Tier 4+ rooms: enemy counts keep increasing with tier until the current cap of 9 enemies. Enemy rosters are weighted-random instead of fixed-pattern; Void Raider is removed from the Tier 4+ pool, while stronger enemies such as Shadowclaw and Rift Ghoul are eligible but less common than mid-tier Glitchspawn.
- Current Tier 4+ enemy weights: Surge Crawler 28, Mind Phantom 24, Plasmoid 18, Skin-Eater 14, Shadowclaw 8, Rift Ghoul 8.
- Enemy Integrity, Power, Accuracy, Defense, and XP value scale upward by room tier.

### Multiple Enemy Support

- The right-side enemy list must render all visible enemies, not just one.
- Target selection for programs and Physical Damage must support choosing among multiple adjacent enemies.
- Each visible enemy tile should be highlighted red. Clicking a highlighted tile selects that enemy as the target when a program or attack is pending.

## Likely Next Implementation Steps

Items below track likely next steps now that branching room tiers, XP, program rewards, artifacts, and multiple enemy support have initial implementations.

### UI/UX Polish Queue

- Add clearer damage indicator styling and timing once combat visuals are more stable.
- Improve Sigil-Casting affordance around remaining casts per turn and spent casts.
- Add stronger phase feedback after a program has been allocated.
- Begin pixel-art UI treatment after the dice-crafting model is stable.

1. **Design sigil metadata and crafted dice data** - separate sigils from fixed die faces, then define blank/locked/filled face slots.
2. **Refactor rolling around crafted dice** - rolled results should come from the sigils attached to each die face.
3. **Update starting loadout** - give all four base programs and one 3-face custom starting die.
4. **Expand baseline vision and room scale** - increase vision to 2 spaces, enlarge room layouts, and shrink board assets roughly 50%.
5. **Improve world-map identity** - add elemental route themes, reward previews, and region-specific encounter bias.
6. **Begin pixel-art conversion** - replace map, character, enemy, sigil, artifact, and UI assets in stages.
7. **Add enemy variety** - add more Glitchspawn profiles so high-tier rooms are not just larger copies of early rooms.
8. **Add room objective variety** - keep Thread Hunt as the base, then add alternate map objectives after the combat loop feels stable.
