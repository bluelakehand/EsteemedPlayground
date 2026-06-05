const canvas = document.querySelector("#game-canvas");
const ctx = canvas.getContext("2d");
const inventorySlots = document.querySelector("#inventory-slots");
const toolSlots = document.querySelector("#tool-slots");
const craftingWindow = document.querySelector("#crafting-window");
const craftingExit = document.querySelector("#crafting-exit");
const storedLetterGrid = document.querySelector("#stored-letter-grid");
const treeView = document.querySelector(".tree-view");
const spadeNode = document.querySelector("#spade-node");
const spadeNodeImage = document.querySelector("#spade-node-image");
const spadeNodeName = document.querySelector("#spade-node-name");
const pickNode = document.querySelector("#pick-node");
const pickNodeImage = document.querySelector("#pick-node-image");
const pickNodeName = document.querySelector("#pick-node-name");
const beamNode = document.querySelector("#beam-node");
const beamNodeImage = document.querySelector("#beam-node-image");
const beamNodeName = document.querySelector("#beam-node-name");
const bagNode = document.querySelector("#bag-node");
const bagNodeImage = document.querySelector("#bag-node-image");
const bagNodeName = document.querySelector("#bag-node-name");
const craftWorkbench = document.querySelector("#craft-workbench");
const craftSlots = document.querySelector("#craft-slots");
const craftTargetPreview = document.querySelector("#craft-target-preview");
const tryCraftButton = document.querySelector("#try-craft-button");
const craftMessage = document.querySelector("#craft-message");
const craftResult = document.querySelector("#craft-result");
const craftResultImage = document.querySelector("#craft-result-image");
const craftResultName = document.querySelector("#craft-result-name");

const TILE = 48;
const WORLD_COLS = 88;
const WORLD_ROWS = 42;
const GRAVITY = 0.5;
const MOVE_SPEED = 2.85;
const JUMP_SPEED = 15.8;
const MAX_FALL_SPEED = 12;
const DEFAULT_MINE_DURATION = 2200;
const SPADE_MINE_DURATIONS = {
  1: 850,
  2: 1250,
};
const PICK_MINE_DURATIONS = {
  1: 650,
  2: 950,
  3: 1700,
};
const LETTER_POOL = "EEEEEEEEAAAAAAAIIOOONNNRRRTTTLLSSUDGBCMPFHVWYKJXQZ";
const SHALLOW_LETTER_POOL = "AABBCCDDEEEEGGIIKKMMPP";
const LOCKED_LETTER_COUNT = 56;
const GROUND_LEVEL_ROW = 8;
const INVENTORY_CAPACITY = 2;
const SPADE_RECIPE = ["S", "P", "A", "D", "E"];
const PICK_RECIPE = ["P", "I", "C", "K"];
const BEAM_RECIPE = ["B", "E", "A", "M"];
const BAG_RECIPE = ["B", "A", "G"];
const UNDERGROUND_SIGHT_RADIUS = TILE * 3;

const keys = {
  a: false,
  d: false,
  w: false,
};

const assets = {
  background1: loadImage("images/background1.png"),
  chestClosed: loadImage("images/chest1.png"),
  chestOpen: loadImage("images/chest2.png"),
  craftingMachine: loadImage("images/crafting_machine.png"),
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
};

const level = createLevel();
const letters = [...createSpadeLetters(), ...createLockedLetters(LOCKED_LETTER_COUNT)];
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
  bagEarned: false,
  messageUntil: 0,
};
const craftingMachine = {
  x: 21 * TILE,
  y: GROUND_LEVEL_ROW * TILE - 92,
  width: 66,
  height: 92,
};

const player = {
  x: 27 * TILE,
  y: 288,
  width: 34,
  height: 48,
  vx: 0,
  vy: 0,
  facing: "right",
  grounded: false,
  inventory: [],
};

let cameraX = 0;
let cameraY = 0;
let lastTime = performance.now();
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
let craftState = {
  recipeKey: "spade",
  availableLetters: [],
  slots: Array(SPADE_RECIPE.length).fill(null),
};

const CRAFT_RECIPES = {
  spade: {
    name: "Spade",
    letters: SPADE_RECIPE,
    image: "images/craft items/spade.png",
    silhouette: "images/craft items/spade_black.png",
  },
  pick: {
    name: "Pick",
    letters: PICK_RECIPE,
    image: "images/craft items/pick.png",
    silhouette: "images/craft items/pick_black.png",
  },
  beam: {
    name: "Beam",
    letters: BEAM_RECIPE,
    image: "images/craft items/beam.png",
    silhouette: "images/craft items/beam_black.png",
  },
  bag: {
    name: "Bag",
    letters: BAG_RECIPE,
    image: "images/craft items/bag.png",
    silhouette: "images/craft items/bag_black.png",
  },
};

function loadImage(src) {
  const image = new Image();
  image.src = src;
  return image;
}

function createLevel() {
  const tiles = Array.from({ length: WORLD_ROWS }, () => Array(WORLD_COLS).fill(0));

  for (let col = 0; col < WORLD_COLS; col += 1) {
    const groundTop = col > WORLD_COLS - 12 ? GROUND_LEVEL_ROW + 1 : GROUND_LEVEL_ROW;
    for (let row = groundTop; row < WORLD_ROWS; row += 1) {
      tiles[row][col] = tileForDepth(row - groundTop);
    }
  }

  addPlatform(5, 7, 5);
  addPlatform(17, 6, 5);
  addPlatform(31, 7, 4);
  addPlatform(45, 6, 5);
  addPlatform(61, 7, 6);
  addPlatform(74, 6, 5);

  function addPlatform(startCol, row, length) {
    for (let col = startCol; col < startCol + length; col += 1) {
      tiles[row][col] = 1;
      if (row + 1 < WORLD_ROWS) tiles[row + 1][col] = 2;
    }
  }

  return tiles;
}

function tileForDepth(depth) {
  if (depth === 0) return 1;
  if (depth <= 3) return 2;
  if (depth <= 9) return Math.random() < 0.28 ? 3 : 2;
  if (depth <= 16) return Math.random() < 0.45 ? 4 : 3;
  if (depth <= 24) return Math.random() < 0.55 ? 5 : 4;
  return Math.random() < 0.68 ? 6 : 5;
}

function createLockedLetters(count) {
  const solidTiles = [];
  const shallowTiles = [];
  for (let row = 0; row < WORLD_ROWS; row += 1) {
    for (let col = 0; col < WORLD_COLS; col += 1) {
      if (level[row][col]) {
        const tile = { row, col };
        solidTiles.push(tile);
        if (level[row][col] === 1 || level[row][col] === 2) {
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
    const tileType = level[tile.row][tile.col];
    const pool = tileType === 1 || tileType === 2 ? SHALLOW_LETTER_POOL : LETTER_POOL;
    lockedLetters.push(createLockedLetter(pool[Math.floor(Math.random() * pool.length)], tile));
  }

  return lockedLetters;
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
    x: tile.col * TILE + TILE / 2,
    y: tile.row * TILE + TILE / 2,
    state: "locked",
  };
}

function createSpadeLetters() {
  const usedCols = new Set();
  return SPADE_RECIPE.map((value) => {
    let col = 0;
    do {
      col = 22 + Math.floor(Math.random() * 38);
    } while (usedCols.has(col));
    usedCols.add(col);

    return {
      value,
      row: null,
      col: null,
      x: col * TILE + TILE / 2,
      y: topSolidRowForColumn(col) * TILE - TILE * 0.55,
      state: "loose",
      starter: true,
    };
  });
}

function topSolidRowForColumn(col) {
  for (let row = 0; row < WORLD_ROWS; row += 1) {
    if (level[row][col]) return row;
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
  return tileAtPixel(x, y) !== 0;
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
  if (keys.w && player.grounded) {
    player.vy = -JUMP_SPEED;
    player.grounded = false;
  }

  player.vy += GRAVITY;
  player.vy = Math.min(player.vy, MAX_FALL_SPEED);

  moveAxis("x", player.vx);
  moveAxis("y", player.vy);
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
      if (level[row][col]) return true;
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
  const tools = [
    chest.spadeEarned ? { name: "Spade", src: "images/craft items/spade.png" } : null,
    chest.pickEarned ? { name: "Pick", src: "images/craft items/pick.png" } : null,
    chest.beamEarned ? { name: "Beam", src: "images/craft items/beam.png" } : null,
    chest.bagEarned ? { name: "Bag", src: "images/craft items/bag.png" } : null,
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
    toolSlots.append(slot);
  });
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
  updateMining();
  updateFlyingLetters();
  updateChestProximity();
  collectLetters();
  updateCamera();

  if (player.y > WORLD_ROWS * TILE) {
    player.x = 27 * TILE;
    player.y = 288;
    player.vx = 0;
    player.vy = 0;
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawSky();
  drawTiles();
  drawLockedLetters();
  drawMiningTarget();
  drawLooseLetters();
  drawCraftingMachine();
  drawChest();
  drawFlyingLetters();
  drawPlayer();
  drawChestPrompt();
  drawCraftPrompt();
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
      const image = assets[`land${tile}`];
      const x = col * TILE - cameraX;
      const y = row * TILE - cameraY;
      ctx.drawImage(image, x, y, TILE, TILE);
      drawUndergroundShadow(col, row, x, y);
    }
  }
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
  ctx.fillStyle = hidden
    ? "rgba(0, 0, 0, 0.58)"
    : floating
      ? "rgba(240, 201, 94, 0.26)"
      : "rgba(35, 26, 13, 0.58)";
  ctx.beginPath();
  ctx.arc(centerX, centerY, floating ? 23 : 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = hidden ? "#050706" : floating ? "#231a0d" : "rgba(17, 24, 23, 0.82)";
  ctx.fillRect(centerX - 14, centerY - 15, 28, 30);
  ctx.strokeStyle = hidden ? "rgba(255, 255, 255, 0.18)" : "#f0c95e";
  ctx.lineWidth = 2;
  ctx.strokeRect(centerX - 14, centerY - 15, 28, 30);
  if (hidden) return;
  ctx.fillStyle = "#f0c95e";
  ctx.font = "900 24px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(value, centerX, centerY + 1);
}

function isInSight(x, y) {
  const playerCenterX = player.x + player.width / 2;
  const playerCenterY = player.y + player.height / 2;
  return Math.hypot(x - playerCenterX, y - playerCenterY) <= sightRadius();
}

function sightRadius() {
  return UNDERGROUND_SIGHT_RADIUS + (chest.beamEarned ? TILE : 0);
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
  const width = 86;
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
  ctx.fillText("CRAFT", centerX, y + 1);
  ctx.restore();
}

function currentSprite() {
  if (mining.active) {
    const firstFrame = Math.floor((performance.now() - mining.startedAt) / 160) % 2 === 0;
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
  if (!player.grounded) {
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

  releaseLettersFromBlock(mining.target.row, mining.target.col);
  level[mining.target.row][mining.target.col] = 0;
  mining.target = null;
  mining.startedAt = performance.now();
  mining.duration = DEFAULT_MINE_DURATION;
}

function releaseLettersFromBlock(row, col) {
  letters.forEach((letter) => {
    if (letter.state !== "locked" || letter.row !== row || letter.col !== col) return;
    letter.state = "loose";
    letter.x = col * TILE + TILE / 2;
    letter.y = row * TILE + TILE / 2;
  });
}

function updateFlyingLetters() {
  const now = performance.now();
  flyingLetters = flyingLetters.filter((letter) => now - letter.startedAt < letter.duration);
}

function isNearChest() {
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
  if (!chest.spadeEarned && !chest.pickEarned) return;

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

function miningDurationForTile(tile) {
  const durations = chest.pickEarned ? PICK_MINE_DURATIONS : SPADE_MINE_DURATIONS;
  return durations[tile] ?? DEFAULT_MINE_DURATION;
}

function openCraftingWindow() {
  resetCraftState();
  craftWorkbench.classList.add("hidden");
  renderCraftingInventory();
  renderCraftSlots();
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
    availableLetters: [...chest.storedLetters],
    slots: Array(recipe.letters.length).fill(null),
  };
  craftMessage.textContent = "";
  craftMessage.className = "craft-message";
}

function renderCraftingInventory() {
  storedLetterGrid.innerHTML = "";
  const sourceLetters = craftingWindow.classList.contains("hidden")
    ? chest.storedLetters
    : craftState.availableLetters;

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

function renderCraftSlots() {
  craftSlots.innerHTML = "";
  const recipe = CRAFT_RECIPES[craftState.recipeKey];
  craftTargetPreview.src = recipe.silhouette;
  craftTargetPreview.alt = `${recipe.name} silhouette`;
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
      craftState.availableLetters.push(craftState.slots[index]);
      craftState.slots[index] = null;
      craftMessage.textContent = "";
      craftMessage.className = "craft-message";
      renderCraftingInventory();
      renderCraftSlots();
    });
    craftSlots.append(slot);
  });
}

function dropLetterIntoSlot(letterIndex, slotIndex) {
  if (!Number.isInteger(letterIndex) || !craftState.availableLetters[letterIndex]) return;
  if (craftState.slots[slotIndex]) {
    craftState.availableLetters.push(craftState.slots[slotIndex]);
  }
  craftState.slots[slotIndex] = craftState.availableLetters.splice(letterIndex, 1)[0];
  craftMessage.textContent = "";
  craftMessage.className = "craft-message";
  renderCraftingInventory();
  renderCraftSlots();
}

function tryCraftRecipe() {
  const recipe = CRAFT_RECIPES[craftState.recipeKey];
  const attempt = craftState.slots.join("");
  if (attempt === recipe.letters.join("")) {
    if (craftState.recipeKey === "spade") chest.spadeEarned = true;
    if (craftState.recipeKey === "pick") chest.pickEarned = true;
    if (craftState.recipeKey === "beam") chest.beamEarned = true;
    if (craftState.recipeKey === "bag") chest.bagEarned = true;
    consumeStoredLetters(craftState.slots);
    resetCraftState();
    renderInventory();
    renderTools();
    renderCraftingInventory();
    renderCraftSlots();
    renderCraftResult();
    craftMessage.textContent = "Crafting successful";
    craftMessage.className = "craft-message success";
    return;
  }

  craftState.availableLetters.push(...craftState.slots.filter(Boolean));
  craftState.slots = Array(CRAFT_RECIPES[craftState.recipeKey].letters.length).fill(null);
  craftMessage.textContent = "crafting failed";
  craftMessage.className = "craft-message error";
  renderCraftingInventory();
  renderCraftSlots();
}

function consumeStoredLetters(lettersToConsume) {
  lettersToConsume.forEach((letter) => {
    const index = chest.storedLetters.indexOf(letter);
    if (index >= 0) chest.storedLetters.splice(index, 1);
  });
}

function renderCraftResult() {
  const recipe = CRAFT_RECIPES[craftState.recipeKey];
  const selectedEarned = isRecipeEarned(craftState.recipeKey);
  craftResult.classList.toggle("hidden", !selectedEarned);
  craftResultImage.src = recipe.image;
  craftResultImage.alt = recipe.name;
  craftResultName.textContent = recipe.name;
  renderRecipeNode("spade", spadeNode, spadeNodeImage, spadeNodeName);
  renderRecipeNode("pick", pickNode, pickNodeImage, pickNodeName);
  renderRecipeNode("beam", beamNode, beamNodeImage, beamNodeName);
  renderRecipeNode("bag", bagNode, bagNodeImage, bagNodeName);
}

function renderRecipeNode(recipeKey, node, image, name) {
  const recipe = CRAFT_RECIPES[recipeKey];
  const earned = isRecipeEarned(recipeKey);
  image.src = earned ? recipe.image : recipe.silhouette;
  image.alt = earned ? recipe.name : "";
  name.classList.toggle("hidden", !earned);
  node.querySelector(".recipe-boxes").classList.toggle("hidden", earned);
}

function isRecipeEarned(recipeKey) {
  if (recipeKey === "spade") return chest.spadeEarned;
  if (recipeKey === "pick") return chest.pickEarned;
  if (recipeKey === "beam") return chest.beamEarned;
  if (recipeKey === "bag") return chest.bagEarned;
  return false;
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
  const tile = level[row][col];
  const maxMineableTile = chest.pickEarned ? 3 : 2;
  if (!tile || tile > maxMineableTile) return null;

  const bounds = playerBounds();
  const playerLeftCol = Math.floor(bounds.left / TILE);
  const playerRightCol = Math.floor(bounds.right / TILE);
  const playerTopRow = Math.floor(bounds.top / TILE);
  const playerBottomRow = Math.floor(bounds.bottom / TILE);
  const nearHorizontal = col >= playerLeftCol - 1 && col <= playerRightCol + 1;
  const nearVertical = row >= playerTopRow - 1 && row <= playerBottomRow + 1;

  if (!nearHorizontal || !nearVertical) return null;
  return { col, row };
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

  if (elapsed < 80) {
    update();
  }
  draw();
  requestAnimationFrame(loop);
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
  beginMining(event);
  event.preventDefault();
});

window.addEventListener("mouseup", endMining);

canvas.addEventListener("mouseleave", () => {
  if (mining.active) endMining();
});

function selectCraftRecipe(recipeKey) {
  craftState.recipeKey = recipeKey;
  craftWorkbench.classList.remove("hidden");
  resetCraftState();
  renderCraftingInventory();
  renderCraftSlots();
  renderCraftResult();
}

craftingExit.addEventListener("click", closeCraftingWindow);

treeView.addEventListener("click", (event) => {
  const node = event.target.closest(".craft-node");
  if (!node?.dataset.recipe) return;
  selectCraftRecipe(node.dataset.recipe);
});

tryCraftButton.addEventListener("click", tryCraftRecipe);

craftingWindow.addEventListener("click", (event) => {
  if (event.target === craftingWindow) closeCraftingWindow();
});

renderInventory();
renderTools();
renderCraftingInventory();
renderCraftSlots();
renderCraftResult();
requestAnimationFrame(loop);
