const canvas = document.querySelector("#game-canvas");
const ctx = canvas.getContext("2d");
const mainMenu = document.querySelector("#main-menu");
const startGameButton = document.querySelector("#start-game-button");
const testModeButton = document.querySelector("#test-mode-button");
const inventorySlots = document.querySelector("#inventory-slots");
const toolSlots = document.querySelector("#tool-slots");
const mineControlHint = document.querySelector("#mine-control-hint");
const craftingWindow = document.querySelector("#crafting-window");
const craftingExit = document.querySelector("#crafting-exit");
const storedLetterGrid = document.querySelector("#stored-letter-grid");
const craftCategories = document.querySelector("#craft-categories");
const craftCardGrid = document.querySelector("#craft-card-grid");
const craftWorkbench = document.querySelector("#craft-workbench");
const craftSlots = document.querySelector("#craft-slots");
const craftTargetPreview = document.querySelector("#craft-target-preview");
const tryCraftButton = document.querySelector("#try-craft-button");
const craftMessage = document.querySelector("#craft-message");
const craftResult = document.querySelector("#craft-result");
const craftResultImage = document.querySelector("#craft-result-image");
const craftResultName = document.querySelector("#craft-result-name");
const craftResultDescription = document.querySelector("#craft-result-description");
const restorationScoreDisplay = document.querySelector("#restoration-score");
const winBanner = document.querySelector("#win-banner");

const TILE = 48;
const WORLD_COLS = 60;
const WORLD_ROWS = 42;
const PLAYER_START_X = 27 * TILE;
const PLAYER_START_Y = 288;
const GRAVITY = 0.5;
const MOVE_SPEED = 2.85;
const JUMP_SPEED = 14.6;
const MAX_FALL_SPEED = 12;
const DEFAULT_MINE_DURATION = 1870;
const SPADE_MINE_DURATIONS = {
  1: 725,
  2: 1060,
};
const PICK_MINE_DURATIONS = {
  1: 425,
  2: 640,
  3: 1445,
};
const DRILL_MINE_DURATIONS = {
  1: 305,
  2: 440,
  3: 765,
  4: 1530,
};
const AXE_CHOP_DURATION = 810;
const LETTER_POOL = "EEEEAAABBBGGGIIOOONNNRRRTTTLLSSUDCMPFHVWYKJXQZ";
const SHALLOW_LETTER_POOL = "AAABBBCCDDEEGGGIIKKMMOOPPX";
const LAND3_LETTER_POOL = "AAABBBCCDDEEGGGIIKKLLMMOOPPRRX";
const TREE_LETTER_POOL = "EEAAABBBIIIOOONNRRTTLLSSUDGGGCMPFHVWYKJX";
const LOCKED_LETTER_COUNT = 56;
const TREE_LETTER_CHANCE = 0.18;
const GROUND_LEVEL_ROW = 8;
const WATER_WIDTH = 5;
const BRIDGE_HEIGHT = TILE * 2;
const MOUNTAIN_BIOME_CHANCE = 0.32;
const RIVER_BIOME_CHANCE = 0.32;
const MIN_MOUNTAIN_CLIFF_HEIGHT = 5;
const ROPE_CLIMB_SPEED = 1.65;
const TREES_PER_CHUNK = 9;
const STARTER_LETTER_MIN_PLAYER_DISTANCE = 7;
const INVENTORY_CAPACITY = 2;
const SPADE_RECIPE = ["S", "P", "A", "D", "E"];
const PICK_RECIPE = ["P", "I", "C", "K"];
const BEAM_RECIPE = ["B", "E", "A", "M", "+"];
const BAG_RECIPE = ["B", "A", "G"];
const DRILL_RECIPE = ["D", "R", "I", "L", "L"];
const AXE_RECIPE = ["A", "X", "E"];
const UNDERGROUND_SIGHT_RADIUS = TILE * 3;
const TEST_MODE_LETTERS = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ", "+"];
const CRAFT_CATEGORIES = ["Farming", "Gathering", "Exploration", "Structures", "Battle", "Culture"];
const CULTURE_WIN_SCORE = 1000;
const STARTING_RIVER_SIDE = Math.random() < 0.5 ? -1 : 1;
const MUSIC_TRACKS = [
  "sound/Pixel Forge Drift.mp3",
  "sound/Pixel Forge Drift2.mp3",
  "sound/Pixel Meadow.mp3",
  "sound/Pixel Meadow2.mp3",
];
const MUSIC_VOLUME = 0.14;
const MUSIC_FADE_SECONDS = 6;

const keys = {
  a: false,
  d: false,
  w: false,
  s: false,
};

const assets = {
  background1: loadImage("images/background1.png"),
  chestClosed: loadImage("images/chest1.png"),
  chestOpen: loadImage("images/chest2.png"),
  craftingMachine: loadImage("images/crafting_machine.png"),
  bridge: loadImage("images/craft items/bridge.png"),
  mountain1: loadImage("images/mountain1.png"),
  tree1Bottom: loadImage("images/tree1_bottom.png"),
  tree1Middle: loadImage("images/tree1_middle.png"),
  tree1Top: loadImage("images/tree1_top.png"),
  tree2Bottom: loadImage("images/tree2_bottom.png"),
  tree2Middle: loadImage("images/tree2_middle.png"),
  tree2Top: loadImage("images/tree2_top.png"),
  water1: loadImage("images/water1.png"),
  water2: loadImage("images/water2.png"),
  land1: loadImage("images/land1.png"),
  land2: loadImage("images/land2.png"),
  land3: loadImage("images/land3.png"),
  land4: loadImage("images/land4.png"),
  land5: loadImage("images/land5.png"),
  land6: loadImage("images/land6.png"),
  idle: loadImage("images/arlo_main.png"),
  walkLeft: loadImage("images/arlo_walk_left.png"),
  walkRight: loadImage("images/arlo_walk_right.png"),
  jumpLeft: loadImage("images/arlo_jump_left.png"),
  jumpRight: loadImage("images/arlo_jump_right.png"),
  spadeLeft1: loadImage("images/arlo_spade_left.png"),
  spadeLeft2: loadImage("images/arlo_left_spade2.png"),
  spadeRight1: loadImage("images/arlo_spade_right.png"),
  spadeRight2: loadImage("images/arlo_right_spade2.png"),
  mineLeft1: loadImage("images/arlo_left_mine.png"),
  mineLeft2: loadImage("images/arlo_left_mine2.png"),
  mineRight1: loadImage("images/arlo_right_mine.png"),
  mineRight2: loadImage("images/arlo_right_mine2.png"),
  drillLeft1: loadImage("images/arlo_drill_left.png"),
  drillLeft2: loadImage("images/arlo_drill_left2.png"),
  drillRight1: loadImage("images/arlo_drill_right.png"),
  drillRight2: loadImage("images/arlo_drill_right2.png"),
  axeLeft1: loadImage("images/arlo_axe_left.png"),
  axeLeft2: loadImage("images/arlo_axe_left2.png"),
  axeRight1: loadImage("images/arlo_axe_right.png"),
  axeRight2: loadImage("images/arlo_axe_right2.png"),
};

const chunks = new Map();
let currentChunkX = 0;
let activeChunk = getOrCreateChunk(currentChunkX);
let level = activeChunk.level;
let letters = activeChunk.letters;
let trees = activeChunk.trees;
let bridges = activeChunk.bridges;
let biome = activeChunk.biome;
const chest = {
  x: 24 * TILE,
  y: GROUND_LEVEL_ROW * TILE - 50,
  width: 68,
  height: 50,
  open: false,
  storedLetters: [],
  spadeEarned: false,
  pickEarned: false,
  beamEarned: false,
  torchEarned: false,
  bagEarned: false,
  drillEarned: false,
  axeEarned: false,
  ropeEarned: false,
  bridgeCount: 0,
  messageUntil: 0,
};
const craftingMachine = {
  x: 21 * TILE,
  y: GROUND_LEVEL_ROW * TILE - 92,
  width: 66,
  height: 92,
};

const player = {
  x: PLAYER_START_X,
  y: PLAYER_START_Y,
  width: 34,
  height: 48,
  vx: 0,
  vy: 0,
  facing: "right",
  grounded: false,
  climbing: false,
  inventory: [],
};
const startingPlayer = {
  x: player.x,
  y: player.y,
};

let cameraX = 0;
let cameraY = 0;
let lastTime = performance.now();
let gameStarted = false;
let testMode = false;
let backgroundMusic = null;
let lastMusicTrack = -1;
let musicFading = false;
let musicGapTimer = null;
let mining = {
  active: false,
  direction: "right",
  startedAt: 0,
  target: null,
  duration: DEFAULT_MINE_DURATION,
};
let flyingLetters = [];
let craftButtonRect = null;
let unloadButtonRect = null;
const craftedKnowledge = new Set();
let activeCraftCategory = "Gathering";
let restorationScore = 0;
let gameWon = false;
let craftState = {
  recipeKey: "spade",
  availableLetters: [],
  slots: Array(SPADE_RECIPE.length).fill(null),
};

const CRAFT_RECIPES = {
  seed: {
    name: "Seed",
    category: "Farming",
    description: "Lets you plant corn that produces letters. Requires Garden.",
    letters: "SEED".split(""),
  },
  egg: {
    name: "Egg",
    category: "Farming",
    description: "Lets you spawn chickens that drop letters. Requires Farm.",
    letters: "EGG".split(""),
  },
  hose: {
    name: "Hose",
    category: "Farming",
    description: "Lets you water plants so they grow faster.",
    letters: "HOSE".split(""),
  },
  compost: {
    name: "Compost",
    category: "Farming",
    description: "Lets you customize plants to grow certain letters.",
    letters: "COMPOST".split(""),
  },
  spade: {
    name: "Spade",
    category: "Gathering",
    description: "Lets you mine Land 1 and Land 2.",
    letters: SPADE_RECIPE,
    image: "images/craft items/spade.png",
    silhouette: "images/craft items/spade_black.png",
  },
  pick: {
    name: "Pick",
    category: "Gathering",
    description: "Lets you mine Land 1 through Land 3.",
    letters: PICK_RECIPE,
    image: "images/craft items/pick.png",
    silhouette: "images/craft items/pick_black.png",
  },
  bag: {
    name: "Bag",
    category: "Gathering",
    description: "Lets A.R.L.O. carry one additional letter.",
    letters: BAG_RECIPE,
    image: "images/craft items/bag.png",
    silhouette: "images/craft items/bag_black.png",
  },
  drill: {
    name: "Drill",
    category: "Gathering",
    description: "Lets you mine Land 1 through Land 4.",
    letters: DRILL_RECIPE,
    image: "images/craft items/drill.png",
    silhouette: "images/craft items/drill_black.png",
  },
  axe: {
    name: "Axe",
    category: "Gathering",
    description: "Lets you cut down basic trees.",
    letters: AXE_RECIPE,
    image: "images/craft items/axe.png",
    silhouette: "images/craft items/axe_black.png",
  },
  saw: {
    name: "Saw",
    category: "Gathering",
    description: "Lets you cut down harder trees.",
    letters: "SAW".split(""),
  },
  chopper: {
    name: "Chopper",
    category: "Gathering",
    description: "Lets you cut down all tree types.",
    letters: "CHOPPER".split(""),
  },
  bomb: {
    name: "Bomb",
    category: "Gathering",
    description: "Lets you blow up deeper Land types.",
    letters: "BOMB".split(""),
  },
  beam: {
    name: "Beam+",
    category: "Exploration",
    description: "Increases A.R.L.O.'s light radius by one tile. The + component requires electricity.",
    letters: BEAM_RECIPE,
    image: "images/craft items/beam.png",
    silhouette: "images/craft items/beam_black.png",
  },
  torch: {
    name: "Torch",
    category: "Exploration",
    description: "Melts ice and increases light by one tile.",
    letters: "TORCH".split(""),
    image: "images/craft items/torch.png",
    silhouette: "images/craft items/torch_black.png",
  },
  rope: {
    name: "Rope",
    category: "Exploration",
    description: "Lets A.R.L.O. climb mountain cliff faces slowly with W and S.",
    letters: "ROPE".split(""),
    image: "images/craft items/rope.png",
    silhouette: "images/craft items/rope_black.png",
  },
  tank: {
    name: "Tank",
    category: "Exploration",
    description: "Lets you dive into water for a limited time.",
    letters: "TANK".split(""),
  },
  flippers: {
    name: "Flippers",
    category: "Exploration",
    description: "Lets you dive into water for a longer time.",
    letters: "FLIPPERS".split(""),
  },
  bridge: {
    name: "Bridge",
    category: "Structures",
    description: "A single-use bridge that can be placed across one water gap.",
    letters: "BRIDGE".split(""),
    image: "images/craft items/bridge.png",
    silhouette: "images/craft items/bridge_black.png",
  },
  garden: {
    name: "Garden",
    category: "Structures",
    description: "Lets you plant Seed.",
    letters: "GARDEN".split(""),
  },
  farm: {
    name: "Farm",
    category: "Structures",
    description: "Lets you use eggs to raise chickens.",
    letters: "FARM".split(""),
  },
  fence: {
    name: "Fence",
    category: "Structures",
    description: "Provides basic protection from enemies.",
    letters: "FENCE".split(""),
  },
  sword: {
    name: "Sword",
    category: "Battle",
    description: "Battle equipment. Its gameplay effect has not been defined yet.",
    letters: "SWORD".split(""),
  },
  music: {
    name: "Music",
    category: "Culture",
    description: "Restores shared songs and memory. Awards 250 civilization points.",
    letters: "MUSIC".split(""),
    points: 250,
  },
  sculpting: {
    name: "Sculpting",
    category: "Culture",
    description: "Restores public art and handcraft traditions. Awards 250 civilization points.",
    letters: "SCULPTING".split(""),
    points: 250,
  },
  architecture: {
    name: "Architecture",
    category: "Culture",
    description: "Restores design knowledge for durable human settlements. Awards 250 civilization points.",
    letters: "ARCHITECTURE".split(""),
    points: 250,
  },
  chemistry: {
    name: "Chemistry",
    category: "Culture",
    description: "Restores material science and practical experimentation. Awards 250 civilization points.",
    letters: "CHEMISTRY".split(""),
    points: 250,
  },
};

function loadImage(src) {
  const image = new Image();
  image.src = src;
  return image;
}

function getOrCreateChunk(chunkX) {
  if (!chunks.has(chunkX)) {
    const chunkBiome = biomeForChunk(chunkX);
    const chunkLevel = createLevel(chunkX, chunkBiome);
    const chunkTrees = createTrees(chunkLevel, chunkX);
    chunks.set(chunkX, {
      biome: chunkBiome,
      level: chunkLevel,
      trees: chunkTrees,
      bridges: [],
      letters: [
        ...(chunkX === 0 ? createSpadeLetters(chunkLevel) : []),
        ...createLockedLetters(LOCKED_LETTER_COUNT, chunkLevel),
        ...createTreeLetters(chunkTrees),
      ],
    });
  }
  return chunks.get(chunkX);
}

function biomeForChunk(chunkX) {
  if (chunkX === 0) return "plains";
  if (chunkX === STARTING_RIVER_SIDE) return "river";
  if (chunkX === -STARTING_RIVER_SIDE) return "mountain";

  const roll = Math.random();
  if (roll < MOUNTAIN_BIOME_CHANCE) return "mountain";
  if (roll < MOUNTAIN_BIOME_CHANCE + RIVER_BIOME_CHANCE) return "river";
  return "plains";
}

function activateChunk(chunkX) {
  currentChunkX = chunkX;
  activeChunk = getOrCreateChunk(currentChunkX);
  level = activeChunk.level;
  letters = activeChunk.letters;
  trees = activeChunk.trees;
  bridges = activeChunk.bridges;
  biome = activeChunk.biome;
  endMining();
  cameraX = Math.max(0, Math.min(WORLD_COLS * TILE - canvas.width, player.x - canvas.width / 2));
}

function isBaseChunk() {
  return currentChunkX === 0;
}

function createLevel(chunkX = 0, chunkBiome = "plains") {
  const tiles = Array.from({ length: WORLD_ROWS }, () => Array(WORLD_COLS).fill(0));

  for (let col = 0; col < WORLD_COLS; col += 1) {
    const groundTop = col > WORLD_COLS - 12 && chunkX === 0 ? GROUND_LEVEL_ROW + 1 : GROUND_LEVEL_ROW;
    for (let row = groundTop; row < WORLD_ROWS; row += 1) {
      tiles[row][col] = tileForDepth(row - groundTop);
    }
  }

  if (chunkBiome === "mountain") {
    addMountainPlateau();
  } else {
    addPlatform(5, 7, 5);
    addPlatform(17, 6, 5);
    addPlatform(31, 7, 4);
    addPlatform(45, 6, 5);
  }

  if (chunkBiome === "river") {
    addWaterShaft();
  }

  function addPlatform(startCol, row, length) {
    for (let col = startCol; col < startCol + length; col += 1) {
      tiles[row][col] = 1;
      if (row + 1 < WORLD_ROWS) tiles[row + 1][col] = 2;
    }
  }

  function addWaterShaft() {
    const startCol = Math.floor(WORLD_COLS / 2) - Math.floor(WATER_WIDTH / 2);
    for (let col = startCol; col < startCol + WATER_WIDTH; col += 1) {
      for (let row = 0; row < WORLD_ROWS; row += 1) {
        tiles[row][col] = row < GROUND_LEVEL_ROW ? 0 : row === GROUND_LEVEL_ROW ? "water1" : "water2";
      }
    }
  }

  function addMountainPlateau() {
    const cliffHeight = MIN_MOUNTAIN_CLIFF_HEIGHT + Math.floor(Math.random() * 2);
    const plateauTop = GROUND_LEVEL_ROW - cliffHeight;
    const leftCliffCol = 12 + Math.floor(Math.random() * 4);
    const rightCliffCol = WORLD_COLS - leftCliffCol - 1;

    for (let col = leftCliffCol; col <= rightCliffCol; col += 1) {
      for (let row = plateauTop; row < WORLD_ROWS; row += 1) {
        tiles[row][col] = "mountain";
      }
    }
  }

  return tiles;
}

function isLandTile(tile) {
  return Number.isInteger(tile) && tile > 0;
}

function isWaterTile(tile) {
  return tile === "water1" || tile === "water2";
}

function isMountainTile(tile) {
  return tile === "mountain";
}

function isGroundTile(tile) {
  return isLandTile(tile) || isMountainTile(tile);
}

function tileForDepth(depth) {
  if (depth === 0) return 1;
  if (depth <= 3) return 2;
  if (depth <= 9) return Math.random() < 0.28 ? 3 : 2;
  if (depth <= 16) return Math.random() < 0.45 ? 4 : 3;
  if (depth <= 24) return Math.random() < 0.55 ? 5 : 4;
  return Math.random() < 0.68 ? 6 : 5;
}

function createLockedLetters(count, sourceLevel = level) {
  const solidTiles = [];
  const shallowTiles = [];
  for (let row = 0; row < WORLD_ROWS; row += 1) {
    for (let col = 0; col < WORLD_COLS; col += 1) {
      if (isLandTile(sourceLevel[row][col])) {
        const tile = { row, col };
        solidTiles.push(tile);
        if (sourceLevel[row][col] === 1 || sourceLevel[row][col] === 2) {
          shallowTiles.push(tile);
        }
      }
    }
  }

  const lockedLetters = [];
  ["P", "I", "C", "K"].forEach((value) => {
    if (lockedLetters.length >= count || shallowTiles.length === 0) return;
    const tile = takeRandomTile(shallowTiles, solidTiles);
    lockedLetters.push(createLockedLetter(value, tile));
  });

  while (lockedLetters.length < Math.min(count, solidTiles.length + lockedLetters.length) && solidTiles.length > 0) {
    const tile = takeRandomTile(solidTiles);
    const tileType = sourceLevel[tile.row][tile.col];
    const pool = letterPoolForTile(tileType);
    lockedLetters.push(createLockedLetter(pool[Math.floor(Math.random() * pool.length)], tile));
  }

  return lockedLetters;
}

function createTrees(sourceLevel, chunkX) {
  const candidates = [];
  for (let col = 2; col < WORLD_COLS - 2; col += 1) {
    if (chunkX === 0 && col >= 19 && col <= 28) continue;
    const surfaceRow = topSolidRowForColumn(col, sourceLevel);
    if (surfaceRow <= 2 || !isGroundTile(sourceLevel[surfaceRow][col])) continue;
    if (isWaterTile(sourceLevel[surfaceRow][col])) continue;
    if (isWaterTile(sourceLevel[surfaceRow + 1]?.[col])) continue;
    candidates.push({ col, surfaceRow });
  }

  const generatedTrees = [];
  const usedCols = new Set();
  while (generatedTrees.length < TREES_PER_CHUNK && candidates.length > 0) {
    const index = Math.floor(Math.random() * candidates.length);
    const candidate = candidates.splice(index, 1)[0];
    if ([candidate.col - 1, candidate.col, candidate.col + 1].some((col) => usedCols.has(col))) continue;

    const middleCount = Math.floor(Math.random() * 4);
    const treeType = Math.random() < 0.5 ? 1 : 2;
    const height = middleCount + 2;
    if (candidate.surfaceRow - height < 0) continue;

    generatedTrees.push({
      id: `${chunkX}:${candidate.col}:${candidate.surfaceRow}:${generatedTrees.length}`,
      col: candidate.col,
      surfaceRow: candidate.surfaceRow,
      middleCount,
      treeType,
      segments: createTreeSegments(candidate.surfaceRow, middleCount, treeType),
    });
    usedCols.add(candidate.col);
  }

  return generatedTrees;
}

function createTreeLetters(sourceTrees) {
  const treeLetters = [];
  sourceTrees.forEach((tree) => {
    treeSegments(tree).forEach((segment) => {
      if (Math.random() > TREE_LETTER_CHANCE) return;
      const value = TREE_LETTER_POOL[Math.floor(Math.random() * TREE_LETTER_POOL.length)];
      treeLetters.push(createLockedLetter(value, {
        row: segment.row,
        col: tree.col,
        source: "tree",
        treeId: tree.id,
        segmentKey: segment.key,
      }));
    });
  });
  return treeLetters;
}

function treeSegments(tree) {
  return tree.segments;
}

function createTreeSegments(surfaceRow, middleCount, treeType) {
  const bottomImage = assets[`tree${treeType}Bottom`];
  const middleImage = assets[`tree${treeType}Middle`];
  const topImage = assets[`tree${treeType}Top`];
  const segments = [
    { key: "bottom", image: bottomImage, row: surfaceRow - 1 },
  ];
  for (let index = 0; index < middleCount; index += 1) {
    segments.push({ key: `middle-${index}`, image: middleImage, row: surfaceRow - 2 - index });
  }
  segments.push({ key: "top", image: topImage, row: surfaceRow - 2 - middleCount });
  return segments;
}

function letterPoolForTile(tileType) {
  if (tileType === 1 || tileType === 2) return SHALLOW_LETTER_POOL;
  if (tileType === 3) return LAND3_LETTER_POOL;
  return LETTER_POOL;
}

function takeRandomTile(primaryTiles, secondaryTiles = null) {
  const tileIndex = Math.floor(Math.random() * primaryTiles.length);
  const tile = primaryTiles.splice(tileIndex, 1)[0];
  if (secondaryTiles) {
    const secondaryIndex = secondaryTiles.findIndex((candidate) => candidate.row === tile.row && candidate.col === tile.col);
    if (secondaryIndex >= 0) secondaryTiles.splice(secondaryIndex, 1);
  }
  return tile;
}

function createLockedLetter(value, tile) {
  return {
    value,
    row: tile.row,
    col: tile.col,
    source: tile.source ?? "land",
    treeId: tile.treeId ?? null,
    segmentKey: tile.segmentKey ?? null,
    x: tile.col * TILE + TILE / 2,
    y: tile.row * TILE + TILE / 2,
    state: "locked",
  };
}

function createSpadeLetters(sourceLevel = level) {
  const usedCols = new Set();
  const playerSpawnCol = Math.floor(PLAYER_START_X / TILE);
  return SPADE_RECIPE.map((value) => {
    let col = 0;
    do {
      col = 22 + Math.floor(Math.random() * 38);
    } while (usedCols.has(col) || Math.abs(col - playerSpawnCol) < STARTER_LETTER_MIN_PLAYER_DISTANCE);
    usedCols.add(col);

    return {
      value,
      row: null,
      col: null,
      x: col * TILE + TILE / 2,
      y: topSolidRowForColumn(col, sourceLevel) * TILE - TILE * 0.55,
      state: "loose",
      starter: true,
    };
  });
}

function topSolidRowForColumn(col, sourceLevel = level) {
  for (let row = 0; row < WORLD_ROWS; row += 1) {
    if (isGroundTile(sourceLevel[row][col])) return row;
  }
  return GROUND_LEVEL_ROW;
}

function tileAtPixel(x, y) {
  const col = Math.floor(x / TILE);
  const row = Math.floor(y / TILE);
  if (col < 0 || col >= WORLD_COLS || row < 0 || row >= WORLD_ROWS) return 0;
  return level[row][col];
}

function isSolidAt(x, y) {
  const col = Math.floor(x / TILE);
  const row = Math.floor(y / TILE);
  return isGroundTile(tileAtPixel(x, y)) || isBridgeTile(col, row);
}

function movePlayer() {
  player.vx = 0;
  if (keys.a) {
    player.vx = -MOVE_SPEED;
    player.facing = "left";
  }
  if (keys.d) {
    player.vx = MOVE_SPEED;
    player.facing = "right";
  }

  const climbDirection = keys.w ? -1 : keys.s ? 1 : 0;
  player.climbing = chest.ropeEarned && biome === "mountain" && climbDirection !== 0 && isBesideMountainFace();
  if (player.climbing) {
    player.vy = climbDirection * ROPE_CLIMB_SPEED;
    player.grounded = false;
    moveAxis("x", player.vx);
    moveAxis("y", player.vy);
    if (climbDirection < 0) tryClimbOverMountainLip();
    return;
  }

  if (keys.w && player.grounded) {
    player.vy = -JUMP_SPEED;
    player.grounded = false;
  }

  player.vy += GRAVITY;
  player.vy = Math.min(player.vy, MAX_FALL_SPEED);

  moveAxis("x", player.vx);
  moveAxis("y", player.vy);
}

function isBesideMountainFace() {
  const bounds = playerBounds();
  const leftCol = Math.floor((bounds.left - 2) / TILE);
  const rightCol = Math.floor((bounds.right + 2) / TILE);
  const topRow = Math.floor((bounds.top + 6) / TILE);
  const bottomRow = Math.floor((bounds.bottom - 4) / TILE);

  for (let row = topRow; row <= bottomRow; row += 1) {
    if (leftCol >= 0 && isMountainTile(level[row]?.[leftCol])) return true;
    if (rightCol < WORLD_COLS && isMountainTile(level[row]?.[rightCol])) return true;
  }
  return false;
}

function tryClimbOverMountainLip() {
  const bounds = playerBounds();
  const climbSide =
    keys.d && isMountainTile(tileAtPixel(bounds.right + 2, bounds.bottom - 8))
      ? "right"
      : keys.a && isMountainTile(tileAtPixel(bounds.left - 2, bounds.bottom - 8))
        ? "left"
        : null;
  if (!climbSide) return false;

  const targetCol = climbSide === "right"
    ? Math.floor((bounds.right + 2) / TILE)
    : Math.floor((bounds.left - 2) / TILE);
  if (targetCol < 0 || targetCol >= WORLD_COLS) return false;

  const ledgeRow = topSolidRowForColumn(targetCol);
  if (!isMountainTile(level[ledgeRow]?.[targetCol])) return false;
  if (bounds.bottom < ledgeRow * TILE - 8 || bounds.bottom > ledgeRow * TILE + TILE * 0.7) return false;

  const nextX = targetCol * TILE + TILE / 2 - player.width / 2;
  const nextY = ledgeRow * TILE - player.height;
  if (!canPlayerStandAt(nextX, nextY)) return false;

  player.x = nextX;
  player.y = nextY;
  player.vx = 0;
  player.vy = 0;
  player.grounded = true;
  player.climbing = false;
  return true;
}

function canPlayerStandAt(x, y) {
  const previousX = player.x;
  const previousY = player.y;
  player.x = x;
  player.y = y;
  const blocked = touchesSolid();
  player.y += 1;
  const standing = touchesSolid();
  player.x = previousX;
  player.y = previousY;
  return !blocked && standing;
}

function moveAxis(axis, amount) {
  if (amount === 0) return;

  const sign = Math.sign(amount);
  let remaining = Math.abs(amount);

  while (remaining > 0) {
    const step = Math.min(1, remaining) * sign;
    if (axis === "x") {
      player.x += step;
      if (touchesSolid()) {
        player.x -= step;
        player.vx = 0;
        break;
      }
    } else {
      player.y += step;
      if (touchesSolid()) {
        player.y -= step;
        if (step > 0) player.grounded = true;
        player.vy = 0;
        break;
      }
      if (step > 0) player.grounded = false;
    }
    remaining -= 1;
  }
}

function touchesSolid() {
  const bounds = playerBounds();
  const leftCol = Math.floor(bounds.left / TILE);
  const rightCol = Math.floor(bounds.right / TILE);
  const topRow = Math.floor(bounds.top / TILE);
  const bottomRow = Math.floor(bounds.bottom / TILE);

  for (let row = topRow; row <= bottomRow; row += 1) {
    for (let col = leftCol; col <= rightCol; col += 1) {
      if (col < 0 || col >= WORLD_COLS || row < 0 || row >= WORLD_ROWS) continue;
      if (isGroundTile(level[row][col]) || isBridgeTile(col, row)) return true;
    }
  }

  return false;
}

function playerBounds() {
  return {
    left: player.x + 5,
    right: player.x + player.width - 6,
    top: player.y + 4,
    bottom: player.y + player.height - 1,
  };
}

function collectLetters() {
  letters.forEach((letter) => {
    if (letter.state !== "loose") return;
    if (player.inventory.length >= carryCapacity()) return;
    const dx = player.x + player.width / 2 - letter.x;
    const dy = player.y + player.height / 2 - letter.y;
    if (Math.hypot(dx, dy) < 44) {
      letter.state = "collected";
      player.inventory.push(letter.value);
      renderInventory();
    }
  });
}

function renderInventory() {
  inventorySlots.innerHTML = "";
  for (let index = 0; index < carryCapacity(); index += 1) {
    const slot = document.createElement("div");
    slot.className = "inventory-slot";
    slot.textContent = player.inventory[index] ?? "";
    inventorySlots.append(slot);
  }
}

function carryCapacity() {
  return INVENTORY_CAPACITY + (chest.bagEarned ? 1 : 0);
}

function renderTools() {
  toolSlots.innerHTML = "";
  const hasActionTool = hasDigTool() || chest.axeEarned;
  const controlHints = [];
  if (hasActionTool) controlHints.push("Click blocks to work");
  if (chest.bridgeCount > 0) controlHints.push("Click water to place bridge");
  if (chest.ropeEarned) controlHints.push("W/S climb mountain cliffs");
  mineControlHint.classList.toggle("hidden", controlHints.length === 0);
  mineControlHint.textContent = controlHints.join(" / ");
  const tools = [
    chest.spadeEarned ? { name: "Spade", src: "images/craft items/spade.png" } : null,
    chest.pickEarned ? { name: "Pick", src: "images/craft items/pick.png" } : null,
    chest.drillEarned ? { name: "Drill", src: "images/craft items/drill.png" } : null,
    chest.axeEarned ? { name: "Axe", src: "images/craft items/axe.png" } : null,
    chest.beamEarned ? { name: "Beam+", src: "images/craft items/beam.png" } : null,
    chest.torchEarned ? { name: "Torch", src: "images/craft items/torch.png" } : null,
    chest.bagEarned ? { name: "Bag", src: "images/craft items/bag.png" } : null,
    chest.ropeEarned ? { name: "Rope", src: "images/craft items/rope.png" } : null,
    chest.bridgeCount > 0
      ? { name: "Bridge", src: "images/craft items/bridge.png", count: chest.bridgeCount }
      : null,
  ].filter(Boolean);

  if (tools.length === 0) {
    const slot = document.createElement("div");
    slot.className = "tool-slot";
    toolSlots.append(slot);
    return;
  }

  tools.forEach((tool) => {
    const slot = document.createElement("div");
    slot.className = "tool-slot";
    const image = document.createElement("img");
    image.src = tool.src;
    image.alt = tool.name;
    slot.append(image);
    if (tool.count) {
      const count = document.createElement("span");
      count.className = "tool-count";
      count.textContent = String(tool.count);
      slot.append(count);
    }
    toolSlots.append(slot);
  });
}

function renderRestorationScore() {
  restorationScoreDisplay.textContent = String(restorationScore);
  winBanner.classList.toggle("hidden", !gameWon);
}

function updateCamera() {
  const targetX = player.x + player.width / 2 - canvas.width / 2;
  const targetY = player.y + player.height / 2 - canvas.height * 0.48;
  const maxCameraX = WORLD_COLS * TILE - canvas.width;
  const maxCameraY = WORLD_ROWS * TILE - canvas.height;
  cameraX += (targetX - cameraX) * 0.12;
  cameraY += (targetY - cameraY) * 0.12;
  cameraX = Math.max(0, Math.min(maxCameraX, cameraX));
  cameraY = Math.max(0, Math.min(maxCameraY, cameraY));
}

function update() {
  movePlayer();
  handleChunkTransitions();
  if (playerOverlapsWater()) {
    respawnAtStartingChunk();
    return;
  }
  updateMining();
  updateFlyingLetters();
  updateChestProximity();
  collectLetters();
  updateCamera();

  if (player.y > WORLD_ROWS * TILE) {
    respawnAtStartingChunk();
  }
}

function handleChunkTransitions() {
  if (player.x + player.width < 0) {
    player.x = WORLD_COLS * TILE - player.width - TILE * 0.5;
    activateChunk(currentChunkX - 1);
    resolvePlayerAfterChunkTransition();
    cameraX = WORLD_COLS * TILE - canvas.width;
    return;
  }

  if (player.x > WORLD_COLS * TILE) {
    player.x = TILE * 0.5;
    activateChunk(currentChunkX + 1);
    resolvePlayerAfterChunkTransition();
    cameraX = 0;
  }
}

function resolvePlayerAfterChunkTransition() {
  player.climbing = false;
  let lift = 0;
  while (touchesSolid() && lift < TILE * 4) {
    player.y -= 1;
    lift += 1;
  }

  if (touchesSolid()) {
    const entryCol = Math.max(0, Math.min(WORLD_COLS - 1, Math.floor((player.x + player.width / 2) / TILE)));
    player.y = topSolidRowForColumn(entryCol) * TILE - player.height;
    while (touchesSolid() && player.y > 0) {
      player.y -= 1;
    }
  }

  player.vx = 0;
  player.vy = 0;
  player.grounded = isStandingOnSolid();
}

function isStandingOnSolid() {
  player.y += 1;
  const standing = touchesSolid();
  player.y -= 1;
  return standing;
}

function playerOverlapsWater() {
  const bounds = playerBounds();
  const leftCol = Math.floor(bounds.left / TILE);
  const rightCol = Math.floor(bounds.right / TILE);
  const topRow = Math.floor(bounds.top / TILE);
  const bottomRow = Math.floor(bounds.bottom / TILE);

  for (let row = topRow; row <= bottomRow; row += 1) {
    for (let col = leftCol; col <= rightCol; col += 1) {
      if (col < 0 || col >= WORLD_COLS || row < 0 || row >= WORLD_ROWS) continue;
      if (isWaterTile(level[row][col])) return true;
    }
  }

  return false;
}

function isBridgeTile(col, row) {
  if (row !== GROUND_LEVEL_ROW - 1) return false;
  return bridges.some((bridge) => col >= bridge.startCol && col < bridge.startCol + bridge.width);
}

function respawnAtStartingChunk() {
  player.x = startingPlayer.x;
  player.y = startingPlayer.y;
  player.vx = 0;
  player.vy = 0;
  player.grounded = false;
  player.climbing = false;
  activateChunk(0);
  cameraX = Math.max(0, player.x + player.width / 2 - canvas.width / 2);
  cameraY = Math.max(0, player.y + player.height / 2 - canvas.height * 0.48);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawSky();
  drawTiles();
  drawBridges();
  drawTrees();
  drawLockedLetters();
  drawMiningTarget();
  drawLooseLetters();
  if (isBaseChunk()) {
    drawCraftingMachine();
    drawChest();
  }
  drawFlyingLetters();
  drawPlayer();
  if (isBaseChunk()) {
    drawChestPrompt();
    drawCraftPrompt();
  }
}

function drawSky() {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const groundScreenY = GROUND_LEVEL_ROW * TILE - cameraY;
  if (groundScreenY <= 0) return;

  const visibleHeight = Math.min(canvas.height, groundScreenY);
  drawAboveGroundBackground(visibleHeight);
}

function drawAboveGroundBackground(visibleHeight) {
  const image = assets.background1;
  if (!image.complete || !image.naturalWidth) {
    ctx.fillStyle = "#7bbdd2";
    ctx.fillRect(0, 0, canvas.width, visibleHeight);
    return;
  }

  const scale = Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  const parallaxX = (cameraX * 0.18) % Math.max(1, drawWidth);
  const y = 0;

  for (let x = -parallaxX - drawWidth; x < canvas.width + drawWidth; x += drawWidth) {
    ctx.drawImage(image, x, y, drawWidth, drawHeight);
  }

  if (visibleHeight < canvas.height) {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, visibleHeight, canvas.width, canvas.height - visibleHeight);
  }
}

function drawTiles() {
  const firstCol = Math.max(0, Math.floor(cameraX / TILE) - 1);
  const lastCol = Math.min(WORLD_COLS, Math.ceil((cameraX + canvas.width) / TILE) + 1);
  const firstRow = Math.max(0, Math.floor(cameraY / TILE) - 1);
  const lastRow = Math.min(WORLD_ROWS, Math.ceil((cameraY + canvas.height) / TILE) + 1);

  for (let row = firstRow; row < lastRow; row += 1) {
    for (let col = firstCol; col < lastCol; col += 1) {
      const tile = level[row][col];
      if (!tile) continue;
      const image = isWaterTile(tile)
        ? assets[tile]
        : isMountainTile(tile)
          ? assets.mountain1
          : assets[`land${tile}`];
      const x = col * TILE - cameraX;
      const y = row * TILE - cameraY;
      ctx.drawImage(image, x, y, TILE, TILE);
      if (isGroundTile(tile)) {
        drawUndergroundShadow(col, row, x, y);
      }
    }
  }
}

function drawBridges() {
  bridges.forEach((bridge) => {
    ctx.drawImage(
      assets.bridge,
      bridge.startCol * TILE - cameraX,
      GROUND_LEVEL_ROW * TILE - BRIDGE_HEIGHT - cameraY,
      bridge.width * TILE,
      BRIDGE_HEIGHT,
    );
  });
}

function drawUndergroundShadow(col, row, x, y) {
  if (row < GROUND_LEVEL_ROW) return;

  const tileCenterX = col * TILE + TILE / 2;
  const tileCenterY = row * TILE + TILE / 2;
  const playerCenterX = player.x + player.width / 2;
  const playerCenterY = player.y + player.height / 2;
  const distance = Math.hypot(tileCenterX - playerCenterX, tileCenterY - playerCenterY);

  if (distance <= sightRadius()) return;

  const fadeBand = TILE * 2;
  const shadowStrength = Math.min(0.82, 0.45 + ((distance - sightRadius()) / fadeBand) * 0.28);
  ctx.save();
  ctx.globalCompositeOperation = "saturation";
  ctx.fillStyle = "rgba(0, 0, 0, 0.86)";
  ctx.fillRect(x, y, TILE, TILE);
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = `rgba(0, 0, 0, ${shadowStrength})`;
  ctx.fillRect(x, y, TILE, TILE);
  ctx.restore();
}

function drawTrees() {
  trees.forEach((tree) => {
    const x = tree.col * TILE - cameraX;
    treeSegments(tree).forEach((segment) => {
      ctx.drawImage(segment.image, x, segment.row * TILE - cameraY, TILE, TILE);
    });
  });
}

function drawMiningTarget() {
  if (!mining.active || !mining.target) return;

  const progress = Math.min(1, (performance.now() - mining.startedAt) / mining.duration);
  const x = mining.target.col * TILE - cameraX;
  const y = mining.target.row * TILE - cameraY;

  ctx.save();
  ctx.fillStyle = `rgba(240, 201, 94, ${0.18 + progress * 0.22})`;
  ctx.fillRect(x, y, TILE, TILE);
  ctx.strokeStyle = "#f0c95e";
  ctx.lineWidth = 3;
  ctx.strokeRect(x + 2, y + 2, TILE - 4, TILE - 4);
  ctx.fillStyle = "rgba(17, 24, 23, 0.72)";
  ctx.fillRect(x + 7, y + TILE - 12, TILE - 14, 5);
  ctx.fillStyle = "#70d18f";
  ctx.fillRect(x + 7, y + TILE - 12, (TILE - 14) * progress, 5);
  ctx.restore();
}

function drawLockedLetters() {
  letters.forEach((letter) => {
    if (letter.state !== "locked") return;
    const visible = isInSight(letter.x, letter.y);
    drawLetterToken(visible ? letter.value : "", letter.x - cameraX, letter.y - cameraY, false, !visible);
  });
}

function drawLooseLetters() {
  letters.forEach((letter) => {
    if (letter.state !== "loose") return;
    const y = letter.y - cameraY + Math.sin(performance.now() / 220 + letter.x) * 5;
    drawLetterToken(letter.value, letter.x - cameraX, y, true);
  });
}

function drawLetterToken(value, centerX, centerY, floating, hidden = false) {
  const radius = floating ? 12 : 9;
  const boxWidth = 15;
  const boxHeight = 16;
  ctx.fillStyle = hidden
    ? "rgba(0, 0, 0, 0.58)"
    : floating
      ? "rgba(240, 201, 94, 0.26)"
      : "rgba(35, 26, 13, 0.58)";
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = hidden ? "#050706" : floating ? "#231a0d" : "rgba(17, 24, 23, 0.82)";
  ctx.fillRect(centerX - boxWidth / 2, centerY - boxHeight / 2, boxWidth, boxHeight);
  ctx.strokeStyle = hidden ? "rgba(255, 255, 255, 0.18)" : "#f0c95e";
  ctx.lineWidth = 2;
  ctx.strokeRect(centerX - boxWidth / 2, centerY - boxHeight / 2, boxWidth, boxHeight);
  if (hidden) return;
  ctx.fillStyle = "#f0c95e";
  ctx.font = "900 14px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(value, centerX, centerY + 1);
}

function isInSight(x, y) {
  if (y < GROUND_LEVEL_ROW * TILE) return true;
  const playerCenterX = player.x + player.width / 2;
  const playerCenterY = player.y + player.height / 2;
  return Math.hypot(x - playerCenterX, y - playerCenterY) <= sightRadius();
}

function sightRadius() {
  const lightUpgrades = Number(chest.beamEarned) + Number(chest.torchEarned);
  return UNDERGROUND_SIGHT_RADIUS + lightUpgrades * TILE;
}

function drawChest() {
  const image = chest.open ? assets.chestOpen : assets.chestClosed;
  ctx.drawImage(image, chest.x - cameraX, chest.y - cameraY, chest.width, chest.height);
}

function drawCraftingMachine() {
  ctx.drawImage(
    assets.craftingMachine,
    craftingMachine.x - cameraX,
    craftingMachine.y - cameraY,
    craftingMachine.width,
    craftingMachine.height,
  );
}

function drawFlyingLetters() {
  flyingLetters.forEach((letter) => {
    const progress = Math.max(0, Math.min(1, (performance.now() - letter.startedAt) / letter.duration));
    const eased = 1 - (1 - progress) ** 3;
    const x = letter.fromX + (letter.toX - letter.fromX) * eased - cameraX;
    const y = letter.fromY + (letter.toY - letter.fromY) * eased - cameraY - Math.sin(progress * Math.PI) * 24;

    ctx.save();
    ctx.globalAlpha = 1 - progress * 0.25;
    ctx.fillStyle = "#fff";
    ctx.font = "900 16px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(letter.value, x, y);
    ctx.restore();
  });
}

function drawChestPrompt() {
  unloadButtonRect = null;
  if (!isNearChest()) return;

  const centerX = chest.x + chest.width / 2 - cameraX;
  const y = chest.y - cameraY - 16;
  const width = 150;
  const height = 32;
  unloadButtonRect = {
    x: centerX - width / 2,
    y: y - height / 2,
    width,
    height,
  };

  ctx.save();
  ctx.fillStyle = "rgba(6, 9, 8, 0.78)";
  ctx.strokeStyle = "#f0c95e";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(unloadButtonRect.x, unloadButtonRect.y, width, height, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#f0c95e";
  ctx.font = "800 14px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Unload Inventory", centerX, y + 1);
  ctx.restore();
}

function drawCraftPrompt() {
  craftButtonRect = null;
  if (!isNearCraftingMachine()) return;

  const centerX = craftingMachine.x + craftingMachine.width / 2 - cameraX;
  const y = craftingMachine.y - cameraY - 18;
  const width = 96;
  const height = 32;
  craftButtonRect = {
    x: centerX - width / 2,
    y: y - height / 2,
    width,
    height,
  };

  ctx.save();
  ctx.fillStyle = "rgba(6, 9, 8, 0.84)";
  ctx.strokeStyle = "#70d18f";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(craftButtonRect.x, craftButtonRect.y, width, height, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.font = "900 14px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("LIBRARY", centerX, y + 1);
  ctx.restore();
}

function currentSprite() {
  if (mining.active) {
    const firstFrame = Math.floor((performance.now() - mining.startedAt) / 160) % 2 === 0;
    if (mining.target?.kind === "tree" || (!mining.target && chest.axeEarned && !hasDigTool())) {
      if (mining.direction === "left") {
        return firstFrame ? assets.axeLeft1 : assets.axeLeft2;
      }
      return firstFrame ? assets.axeRight1 : assets.axeRight2;
    }
    if (chest.drillEarned) {
      if (mining.direction === "left") {
        return firstFrame ? assets.drillLeft1 : assets.drillLeft2;
      }
      return firstFrame ? assets.drillRight1 : assets.drillRight2;
    }
    if (chest.pickEarned) {
      if (mining.direction === "left") {
        return firstFrame ? assets.mineLeft1 : assets.mineLeft2;
      }
      return firstFrame ? assets.mineRight1 : assets.mineRight2;
    }
    if (mining.direction === "left") {
      return firstFrame ? assets.spadeLeft1 : assets.spadeLeft2;
    }
    return firstFrame ? assets.spadeRight1 : assets.spadeRight2;
  }
  if (player.climbing || !player.grounded) {
    return player.facing === "left" ? assets.jumpLeft : assets.jumpRight;
  }
  if (player.vx < 0) return assets.walkLeft;
  if (player.vx > 0) return assets.walkRight;
  return assets.idle;
}

function drawPlayer() {
  const sprite = currentSprite();
  const drawX = Math.round(player.x - cameraX);
  const drawY = Math.round(player.y - cameraY);
  const drawWidth = mining.active ? 48 : player.width;
  const offsetX = mining.active && mining.direction === "left" ? player.width - drawWidth : 0;
  ctx.drawImage(sprite, drawX + offsetX, drawY, drawWidth, player.height);
}

function updateMining() {
  if (!mining.active || !mining.target) return;
  if (performance.now() - mining.startedAt < mining.duration) return;

  if (mining.target.kind === "tree") {
    releaseLettersFromTreeSegment(mining.target.treeId, mining.target.segmentKey);
    removeTreeSegment(mining.target.treeId, mining.target.segmentKey);
  } else {
    releaseLettersFromBlock(mining.target.row, mining.target.col);
    level[mining.target.row][mining.target.col] = 0;
  }
  mining.target = null;
  mining.startedAt = performance.now();
  mining.duration = DEFAULT_MINE_DURATION;
}

function releaseLettersFromBlock(row, col) {
  letters.forEach((letter) => {
    if (letter.state !== "locked" || letter.source !== "land" || letter.row !== row || letter.col !== col) return;
    releaseLetter(letter);
  });
}

function releaseLettersFromTreeSegment(treeId, segmentKey) {
  letters.forEach((letter) => {
    if (letter.state !== "locked" || letter.source !== "tree") return;
    if (letter.treeId !== treeId || letter.segmentKey !== segmentKey) return;
    releaseLetter(letter);
  });
}

function releaseLetter(letter) {
  letter.state = "loose";
  letter.x = letter.col * TILE + TILE / 2;
  letter.y = letter.row * TILE + TILE / 2;
}

function removeTreeSegment(treeId, segmentKey) {
  const tree = trees.find((candidate) => candidate.id === treeId);
  if (!tree) return;
  const segmentIndex = tree.segments.findIndex((segment) => segment.key === segmentKey);
  if (segmentIndex < 0) return;

  tree.segments.splice(segmentIndex, 1);
  compactTreeSegments(tree);
  updateLockedTreeLetterPositions(tree);
}

function compactTreeSegments(tree) {
  tree.segments.sort((a, b) => b.row - a.row);
  tree.segments.forEach((segment, index) => {
    segment.row = tree.surfaceRow - 1 - index;
  });
}

function updateLockedTreeLetterPositions(tree) {
  tree.segments.forEach((segment) => {
    letters.forEach((letter) => {
      if (letter.state !== "locked" || letter.source !== "tree") return;
      if (letter.treeId !== tree.id || letter.segmentKey !== segment.key) return;
      letter.row = segment.row;
      letter.col = tree.col;
      letter.x = tree.col * TILE + TILE / 2;
      letter.y = segment.row * TILE + TILE / 2;
    });
  });
}

function updateFlyingLetters() {
  const now = performance.now();
  flyingLetters = flyingLetters.filter((letter) => now - letter.startedAt < letter.duration);
}

function isNearChest() {
  if (!isBaseChunk()) return false;
  const playerCenterX = player.x + player.width / 2;
  const playerCenterY = player.y + player.height / 2;
  const chestCenterX = chest.x + chest.width / 2;
  const chestCenterY = chest.y + chest.height / 2;
  return Math.abs(playerCenterX - chestCenterX) < 82 && Math.abs(playerCenterY - chestCenterY) < 92;
}

function updateChestProximity() {
  chest.open = isNearChest();
}

function isNearCraftingMachine() {
  if (!isBaseChunk()) return false;
  const playerCenterX = player.x + player.width / 2;
  const playerCenterY = player.y + player.height / 2;
  const machineCenterX = craftingMachine.x + craftingMachine.width / 2;
  const machineCenterY = craftingMachine.y + craftingMachine.height / 2;
  return Math.abs(playerCenterX - machineCenterX) < 84 && Math.abs(playerCenterY - machineCenterY) < 118;
}

function unloadInventoryToChest() {
  if (!isNearChest() || player.inventory.length === 0) return;

  if (player.inventory.length > 0) {
    queueStoredLetterAnimation(player.inventory);
    chest.storedLetters.push(...player.inventory);
    player.inventory = [];
    renderInventory();
    renderCraftingInventory();
  }
  chest.messageUntil = performance.now() + 1300;
}

function queueStoredLetterAnimation(values) {
  const fromX = chest.x + chest.width / 2;
  const fromY = chest.y + chest.height / 2;
  const toX = craftingMachine.x + craftingMachine.width / 2;
  const toY = craftingMachine.y + craftingMachine.height * 0.42;

  values.forEach((value, index) => {
    flyingLetters.push({
      value,
      fromX,
      fromY,
      toX,
      toY,
      startedAt: performance.now() + index * 120,
      duration: 1500,
    });
  });
}

function beginMining(event) {
  if (!hasDigTool() && !chest.axeEarned) return;

  const point = canvasPointFromEvent(event);
  const worldX = point.x + cameraX;
  const worldY = point.y + cameraY;
  const playerCenterX = player.x + player.width / 2;

  mining.active = true;
  mining.direction = worldX < playerCenterX ? "left" : "right";
  mining.startedAt = performance.now();
  mining.target = findMineTarget(worldX, worldY);
  mining.duration = mining.target ? miningDurationForTile(level[mining.target.row][mining.target.col]) : DEFAULT_MINE_DURATION;
  player.facing = mining.direction;
}

function tryPlaceBridge(event) {
  if (chest.bridgeCount <= 0) return false;

  const point = canvasPointFromEvent(event);
  const col = Math.floor((point.x + cameraX) / TILE);
  const row = Math.floor((point.y + cameraY) / TILE);
  if (col < 0 || col >= WORLD_COLS || row < 0 || row >= WORLD_ROWS) return false;
  if (!isWaterTile(level[row][col])) return false;

  const startCol = findWaterGapStart(col);
  if (startCol < 0 || !isNearWaterGap(startCol)) return false;
  if (bridges.some((bridge) => bridge.startCol === startCol)) return false;

  bridges.push({ startCol, width: WATER_WIDTH });
  chest.bridgeCount -= 1;
  renderTools();
  return true;
}

function findWaterGapStart(col) {
  let startCol = col;
  while (startCol > 0 && isWaterTile(level[GROUND_LEVEL_ROW][startCol - 1])) {
    startCol -= 1;
  }
  return isWaterTile(level[GROUND_LEVEL_ROW][startCol]) ? startCol : -1;
}

function isNearWaterGap(startCol) {
  const playerCol = Math.floor((player.x + player.width / 2) / TILE);
  const endCol = startCol + WATER_WIDTH - 1;
  const nearLeftShore = playerCol >= startCol - 2 && playerCol < startCol;
  const nearRightShore = playerCol > endCol && playerCol <= endCol + 2;
  return nearLeftShore || nearRightShore;
}

function miningDurationForTile(tile) {
  if (mining.target?.kind === "tree") return AXE_CHOP_DURATION;
  const durations = chest.drillEarned
    ? DRILL_MINE_DURATIONS
    : chest.pickEarned
      ? PICK_MINE_DURATIONS
      : SPADE_MINE_DURATIONS;
  return durations[tile] ?? DEFAULT_MINE_DURATION;
}

function hasDigTool() {
  return chest.spadeEarned || chest.pickEarned || chest.drillEarned;
}

function openCraftingWindow() {
  resetCraftState();
  craftWorkbench.classList.add("hidden");
  renderCraftingInventory();
  renderCraftSlots();
  renderCraftCategories();
  renderCraftCards();
  renderCraftResult();
  craftingWindow.classList.remove("hidden");
}

function closeCraftingWindow() {
  craftingWindow.classList.add("hidden");
}

function resetCraftState() {
  const recipe = CRAFT_RECIPES[craftState.recipeKey];
  craftState = {
    recipeKey: craftState.recipeKey,
    availableLetters: alphabetizeLetters(chest.storedLetters),
    slots: Array(recipe.letters.length).fill(null),
  };
  craftMessage.textContent = "";
  craftMessage.className = "craft-message";
}

function renderCraftingInventory() {
  storedLetterGrid.innerHTML = "";
  const sourceLetters = craftingWindow.classList.contains("hidden")
    ? alphabetizeLetters(chest.storedLetters)
    : craftingInventoryLetters();

  if (sourceLetters.length === 0) {
    const empty = document.createElement("div");
    empty.className = "stored-letter";
    empty.textContent = "-";
    storedLetterGrid.append(empty);
    return;
  }

  sourceLetters.forEach((letter, index) => {
    const tile = document.createElement("div");
    tile.className = "stored-letter";
    tile.textContent = letter;
    tile.draggable = true;
    tile.dataset.letterIndex = String(index);
    tile.addEventListener("dragstart", (event) => {
      event.dataTransfer.setData("text/plain", String(index));
      tile.classList.add("dragging");
    });
    tile.addEventListener("dragend", () => {
      tile.classList.remove("dragging");
    });
    storedLetterGrid.append(tile);
  });
}

function craftingInventoryLetters() {
  return testMode ? TEST_MODE_LETTERS : craftState.availableLetters;
}

function alphabetizeLetters(values) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function renderCraftSlots() {
  craftSlots.innerHTML = "";
  const recipe = CRAFT_RECIPES[craftState.recipeKey];
  renderCraftTargetPreview(recipe);
  craftState.slots.forEach((letter, index) => {
    const slot = document.createElement("div");
    slot.className = "craft-slot";
    slot.textContent = letter ?? "";
    slot.dataset.slotIndex = String(index);
    slot.addEventListener("dragover", (event) => {
      event.preventDefault();
      slot.classList.add("over");
    });
    slot.addEventListener("dragleave", () => {
      slot.classList.remove("over");
    });
    slot.addEventListener("drop", (event) => {
      event.preventDefault();
      slot.classList.remove("over");
      dropLetterIntoSlot(Number(event.dataTransfer.getData("text/plain")), index);
    });
    slot.addEventListener("click", () => {
      if (!craftState.slots[index]) return;
      if (!testMode) {
        craftState.availableLetters.push(craftState.slots[index]);
        craftState.availableLetters.sort((left, right) => left.localeCompare(right));
      }
      craftState.slots[index] = null;
      craftMessage.textContent = "";
      craftMessage.className = "craft-message";
      renderCraftingInventory();
      renderCraftSlots();
    });
    craftSlots.append(slot);
  });
}

function renderCraftTargetPreview(recipe) {
  craftTargetPreview.innerHTML = "";
  craftTargetPreview.classList.toggle("no-image", !recipe.silhouette);
  if (recipe.silhouette) {
    const image = document.createElement("img");
    image.src = recipe.silhouette;
    image.alt = isRecipeEarned(craftState.recipeKey) ? recipe.name : "";
    craftTargetPreview.append(image);
    return;
  }

  const placeholder = document.createElement("span");
  placeholder.className = "unknown-craft-shape";
  placeholder.setAttribute("aria-hidden", "true");
  craftTargetPreview.append(placeholder);
}

function dropLetterIntoSlot(letterIndex, slotIndex) {
  const sourceLetters = craftingInventoryLetters();
  if (!Number.isInteger(letterIndex) || !sourceLetters[letterIndex]) return;
  if (craftState.slots[slotIndex] && !testMode) {
    craftState.availableLetters.push(craftState.slots[slotIndex]);
    craftState.availableLetters.sort((left, right) => left.localeCompare(right));
  }
  craftState.slots[slotIndex] = testMode
    ? sourceLetters[letterIndex]
    : craftState.availableLetters.splice(letterIndex, 1)[0];
  craftMessage.textContent = "";
  craftMessage.className = "craft-message";
  renderCraftingInventory();
  renderCraftSlots();
}

function tryCraftRecipe() {
  const recipe = CRAFT_RECIPES[craftState.recipeKey];
  const attempt = craftState.slots.join("");
  if (attempt === recipe.letters.join("")) {
    const wasAlreadyEarned = isRecipeEarned(craftState.recipeKey);
    craftedKnowledge.add(craftState.recipeKey);
    if (craftState.recipeKey === "spade") chest.spadeEarned = true;
    if (craftState.recipeKey === "pick") chest.pickEarned = true;
    if (craftState.recipeKey === "beam") chest.beamEarned = true;
    if (craftState.recipeKey === "torch") chest.torchEarned = true;
    if (craftState.recipeKey === "bag") chest.bagEarned = true;
    if (craftState.recipeKey === "drill") chest.drillEarned = true;
    if (craftState.recipeKey === "axe") chest.axeEarned = true;
    if (craftState.recipeKey === "rope") chest.ropeEarned = true;
    if (craftState.recipeKey === "bridge") chest.bridgeCount += 1;
    if (recipe.category === "Culture" && !wasAlreadyEarned) awardCulturePoints(recipe);
    consumeStoredLetters(craftState.slots);
    resetCraftState();
    renderInventory();
    renderTools();
    renderCraftingInventory();
    renderCraftSlots();
    renderCraftCards();
    renderCraftResult();
    craftMessage.textContent = recipe.category === "Culture" && !wasAlreadyEarned
      ? `Knowledge restored +${recipe.points ?? 0}`
      : "Crafting successful";
    craftMessage.className = "craft-message success";
    return;
  }

  if (!testMode) {
    craftState.availableLetters.push(...craftState.slots.filter(Boolean));
    craftState.availableLetters.sort((left, right) => left.localeCompare(right));
  }
  craftState.slots = Array(CRAFT_RECIPES[craftState.recipeKey].letters.length).fill(null);
  craftMessage.textContent = "crafting failed";
  craftMessage.className = "craft-message error";
  renderCraftingInventory();
  renderCraftSlots();
}

function awardCulturePoints(recipe) {
  restorationScore = Math.min(CULTURE_WIN_SCORE, restorationScore + (recipe.points ?? 0));
  gameWon = restorationScore >= CULTURE_WIN_SCORE;
  renderRestorationScore();
}

function consumeStoredLetters(lettersToConsume) {
  if (testMode) return;
  lettersToConsume.forEach((letter) => {
    const index = chest.storedLetters.indexOf(letter);
    if (index >= 0) chest.storedLetters.splice(index, 1);
  });
}

function renderCraftResult() {
  const recipe = CRAFT_RECIPES[craftState.recipeKey];
  const selectedEarned = isRecipeEarned(craftState.recipeKey);
  craftResult.classList.toggle("hidden", !selectedEarned);
  craftResultImage.classList.toggle("hidden", !recipe.image);
  craftResultImage.src = recipe.image ?? "";
  craftResultImage.alt = recipe.image ? recipe.name : "";
  craftResultName.textContent = recipe.name;
  craftResultDescription.textContent = recipe.description;
}

function renderCraftCategories() {
  craftCategories.innerHTML = "";
  CRAFT_CATEGORIES.forEach((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "craft-category";
    button.classList.toggle("active", category === activeCraftCategory);
    button.textContent = category;
    button.addEventListener("click", () => {
      activeCraftCategory = category;
      renderCraftCategories();
      renderCraftCards();
    });
    craftCategories.append(button);
  });
}

function renderCraftCards() {
  craftCardGrid.innerHTML = "";
  Object.entries(CRAFT_RECIPES)
    .filter(([, recipe]) => recipe.category === activeCraftCategory)
    .forEach(([recipeKey, recipe]) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "craft-card";
      card.classList.toggle("selected", recipeKey === craftState.recipeKey);
      card.classList.toggle("earned", isRecipeEarned(recipeKey));
      card.dataset.recipe = recipeKey;
      card.style.setProperty("--recipe-length", recipe.letters.length);
      card.setAttribute("aria-label", isRecipeEarned(recipeKey) ? recipe.name : "Unknown recipe");

      const visual = document.createElement("div");
      visual.className = "craft-card-visual";
      if (recipe.image || recipe.silhouette) {
        const image = document.createElement("img");
        image.src = isRecipeEarned(recipeKey) && recipe.image ? recipe.image : recipe.silhouette ?? recipe.image;
        image.alt = "";
        visual.append(image);
      } else {
        const placeholder = document.createElement("span");
        placeholder.className = "unknown-craft-shape";
        placeholder.setAttribute("aria-hidden", "true");
        visual.append(placeholder);
      }

      const name = document.createElement("strong");
      name.className = "craft-card-name";
      name.textContent = isRecipeEarned(recipeKey) ? recipe.name : "";
      name.classList.toggle("hidden", !isRecipeEarned(recipeKey));
      const boxes = document.createElement("span");
      boxes.className = "recipe-boxes";
      recipe.letters.forEach(() => boxes.append(document.createElement("span")));

      card.append(visual, name, boxes);
      card.addEventListener("click", () => selectCraftRecipe(recipeKey));
      craftCardGrid.append(card);
    });
}

function isRecipeEarned(recipeKey) {
  if (recipeKey === "spade") return chest.spadeEarned;
  if (recipeKey === "pick") return chest.pickEarned;
  if (recipeKey === "beam") return chest.beamEarned;
  if (recipeKey === "torch") return chest.torchEarned;
  if (recipeKey === "bag") return chest.bagEarned;
  if (recipeKey === "drill") return chest.drillEarned;
  if (recipeKey === "axe") return chest.axeEarned;
  if (recipeKey === "rope") return chest.ropeEarned;
  return craftedKnowledge.has(recipeKey);
}

function isPointInRect(point, rect) {
  return (
    rect &&
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

function endMining() {
  mining.active = false;
  mining.target = null;
}

function findMineTarget(worldX, worldY) {
  const col = Math.floor(worldX / TILE);
  const row = Math.floor(worldY / TILE);
  if (col < 0 || col >= WORLD_COLS || row < 0 || row >= WORLD_ROWS) return null;

  const treeTarget = findTreeTarget(col, row);
  if (treeTarget && chest.axeEarned && isTargetNearPlayer(col, row)) return treeTarget;

  if (!hasDigTool()) return null;
  const tile = level[row][col];
  const maxMineableTile = chest.drillEarned ? 4 : chest.pickEarned ? 3 : 2;
  if (!isLandTile(tile) || tile > maxMineableTile) return null;

  if (!isTargetNearPlayer(col, row)) return null;
  return { kind: "land", col, row };
}

function isTargetNearPlayer(col, row) {
  const bounds = playerBounds();
  const playerLeftCol = Math.floor(bounds.left / TILE);
  const playerRightCol = Math.floor(bounds.right / TILE);
  const playerTopRow = Math.floor(bounds.top / TILE);
  const playerBottomRow = Math.floor(bounds.bottom / TILE);
  const nearHorizontal = col >= playerLeftCol - 1 && col <= playerRightCol + 1;
  const nearVertical = row >= playerTopRow - 1 && row <= playerBottomRow + 1;
  return nearHorizontal && nearVertical;
}

function findTreeTarget(col, row) {
  for (const tree of trees) {
    if (tree.col !== col) continue;
    const segment = treeSegments(tree).find((candidate) => candidate.row === row);
    if (!segment) continue;
    return {
      kind: "tree",
      col,
      row,
      treeId: tree.id,
      segmentKey: segment.key,
    };
  }
  return null;
}

function canvasPointFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

function loop(now) {
  const elapsed = now - lastTime;
  lastTime = now;

  if (gameStarted) {
    if (elapsed < 80) {
      update();
    }
    draw();
  }
  requestAnimationFrame(loop);
}

function startBackgroundMusic() {
  if (backgroundMusic) return;

  backgroundMusic = new Audio();
  backgroundMusic.preload = "metadata";
  backgroundMusic.volume = MUSIC_VOLUME;
  backgroundMusic.addEventListener("timeupdate", () => {
    if (!Number.isFinite(backgroundMusic.duration) || musicFading) return;
    if (backgroundMusic.duration - backgroundMusic.currentTime <= MUSIC_FADE_SECONDS) {
      fadeOutBackgroundMusic();
    }
  });
  backgroundMusic.addEventListener("ended", () => {
    if (!musicFading) scheduleNextMusicTrack();
  });
  playNextMusicTrack();
}

function playNextMusicTrack() {
  clearTimeout(musicGapTimer);
  musicGapTimer = null;
  musicFading = false;

  let nextTrack = Math.floor(Math.random() * MUSIC_TRACKS.length);
  if (MUSIC_TRACKS.length > 1) {
    while (nextTrack === lastMusicTrack) {
      nextTrack = Math.floor(Math.random() * MUSIC_TRACKS.length);
    }
  }

  lastMusicTrack = nextTrack;
  backgroundMusic.src = MUSIC_TRACKS[nextTrack];
  backgroundMusic.volume = MUSIC_VOLUME;
  backgroundMusic.currentTime = 0;
  backgroundMusic.play().catch(() => {
    scheduleNextMusicTrack();
  });
}

function fadeOutBackgroundMusic() {
  if (!backgroundMusic || musicFading) return;
  musicFading = true;
  const startedAt = performance.now();
  const startingVolume = backgroundMusic.volume;
  const fadeDuration = MUSIC_FADE_SECONDS * 1000;

  function fadeStep(now) {
    if (!backgroundMusic || !musicFading) return;
    const progress = Math.min(1, (now - startedAt) / fadeDuration);
    backgroundMusic.volume = startingVolume * (1 - progress);
    if (progress < 1 && !backgroundMusic.paused) {
      requestAnimationFrame(fadeStep);
      return;
    }

    backgroundMusic.pause();
    backgroundMusic.currentTime = 0;
    scheduleNextMusicTrack();
  }

  requestAnimationFrame(fadeStep);
}

function scheduleNextMusicTrack() {
  if (!backgroundMusic || musicGapTimer) return;
  musicFading = false;
  const delay = 2500 + Math.random() * 2500;
  musicGapTimer = setTimeout(playNextMusicTrack, delay);
}

function startGame({ enableTestMode = false } = {}) {
  testMode = enableTestMode;
  gameStarted = true;
  document.body.classList.remove("menu-active");
  mainMenu.classList.add("hidden");
  closeCraftingWindow();
  renderCraftingInventory();
  startBackgroundMusic();
}

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (key in keys) {
    keys[key] = true;
    event.preventDefault();
  }
});

window.addEventListener("keyup", (event) => {
  const key = event.key.toLowerCase();
  if (key in keys) {
    keys[key] = false;
    event.preventDefault();
  }
});

canvas.addEventListener("mousedown", (event) => {
  const point = canvasPointFromEvent(event);
  if (isNearChest() && isPointInRect(point, unloadButtonRect)) {
    unloadInventoryToChest();
    event.preventDefault();
    return;
  }
  if (isNearCraftingMachine() && isPointInRect(point, craftButtonRect)) {
    openCraftingWindow();
    event.preventDefault();
    return;
  }
  if (tryPlaceBridge(event)) {
    event.preventDefault();
    return;
  }
  beginMining(event);
  event.preventDefault();
});

window.addEventListener("mouseup", endMining);

canvas.addEventListener("mouseleave", () => {
  if (mining.active) endMining();
});

function selectCraftRecipe(recipeKey) {
  activeCraftCategory = CRAFT_RECIPES[recipeKey].category;
  craftState.recipeKey = recipeKey;
  craftWorkbench.classList.remove("hidden");
  resetCraftState();
  renderCraftingInventory();
  renderCraftSlots();
  renderCraftCategories();
  renderCraftCards();
  renderCraftResult();
}

craftingExit.addEventListener("click", closeCraftingWindow);

tryCraftButton.addEventListener("click", tryCraftRecipe);
startGameButton.addEventListener("click", () => startGame());
testModeButton.addEventListener("click", () => startGame({ enableTestMode: true }));

craftingWindow.addEventListener("click", (event) => {
  if (event.target === craftingWindow) closeCraftingWindow();
});

renderInventory();
renderTools();
renderCraftingInventory();
renderCraftSlots();
renderCraftCategories();
renderCraftCards();
renderCraftResult();
renderRestorationScore();
requestAnimationFrame(loop);
