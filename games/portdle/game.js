const canvas = document.querySelector("#arena");
const ctx = canvas.getContext("2d");

const els = {
  puzzleId: document.querySelector("#puzzle-id"),
  seedInput: document.querySelector("#seed-input"),
  setSeed: document.querySelector("#set-seed-btn"),
  aimBlue: document.querySelector("#aim-blue-btn"),
  aimYellow: document.querySelector("#aim-yellow-btn"),
  moveCount: document.querySelector("#move-count"),
  portalCount: document.querySelector("#portal-count"),
  scoreCount: document.querySelector("#score-count"),
  status: document.querySelector("#status"),
  reset: document.querySelector("#reset-btn"),
};

const GRID_COLS = 16;
const GRID_ROWS = 10;
const TILE = 40;

canvas.width = GRID_COLS * TILE;
canvas.height = GRID_ROWS * TILE;

const W = canvas.width;
const H = canvas.height;

const state = {
  wizard: { col: 1, row: GRID_ROWS - 2 },
  start: { col: 1, row: GRID_ROWS - 2 },
  goal: { col: GRID_COLS - 2, row: 1 },
  seed: null,
  portals: {
    blue: null,
    yellow: null,
  },
  placement: {
    active: false,
    color: "blue",
    cursorX: null,
    cursorY: null,
    hitCol: null,
    hitRow: null,
    hitDir: null,
    lineEndX: null,
    lineEndY: null,
  },
  nextPortalColor: "blue",
  teleportFx: {
    active: false,
    phase: "out",
    from: null,
    to: null,
    slideFrom: null,
    slideTo: null,
    startTime: 0,
    durationOut: 170,
    durationIn: 190,
    durationSlide: 180,
  },
  portalPlacements: 0,
  portalUses: 0,
  moves: 0,
  won: false,
};

const wallTiles = new Set();

function seedFromString(text) {
  // FNV-1a 32-bit hash to convert any seed text into deterministic state.
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createSeededRng(seedText) {
  let s = seedFromString(seedText);
  return function rand() {
    // Mulberry32 PRNG
    s += 0x6D2B79F5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randInt(rand, maxExclusive) {
  return Math.floor(rand() * maxExclusive);
}

function tileKey(col, row) {
  return `${col},${row}`;
}

function addWall(col, row) {
  wallTiles.add(tileKey(col, row));
}

function addWallRect(col, row, width, height) {
  for (let c = col; c < col + width; c += 1) {
    for (let r = row; r < row + height; r += 1) {
      addWall(c, r);
    }
  }
}

const EXTRA_WALL_SHAPES = [
  [[0, 0], [1, 0]],
  [[0, 0], [0, 1]],
  [[0, 0], [1, 0], [2, 0]],
  [[0, 0], [0, 1], [0, 2]],
  [[0, 0], [1, 0], [0, 1]],
];

function buildMap() {
  const rand = createSeededRng(state.seed);
  const MAX_ATTEMPTS = 200;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    wallTiles.clear();
    generateMazeLayout(rand);
    placePartialEdgeWalls(rand);
    placeExtraWalls(rand);
    openStartAndGoal();
    if (hasWalkablePath(state.start, state.goal)) return;
  }

  // fallback: sparse map if random attempts fail
  wallTiles.clear();
}

function generateMazeLayout(rand) {
  for (let col = 0; col < GRID_COLS; col += 1) {
    for (let row = 0; row < GRID_ROWS; row += 1) {
      addWall(col, row);
    }
  }

  const mazeCols = Math.floor((GRID_COLS - 1) / 2);
  const mazeRows = Math.floor((GRID_ROWS - 1) / 2);
  const visited = new Set();
  const stack = [{ c: 0, r: mazeRows - 1 }];
  visited.add("0," + (mazeRows - 1));

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const currentTileCol = 1 + current.c * 2;
    const currentTileRow = 1 + current.r * 2;
    wallTiles.delete(tileKey(currentTileCol, currentTileRow));

    const neighbors = [];
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = current.c + dc;
      const nr = current.r + dr;
      const nKey = `${nc},${nr}`;
      if (nc >= 0 && nc < mazeCols && nr >= 0 && nr < mazeRows && !visited.has(nKey)) {
        neighbors.push({ c: nc, r: nr, dc, dr });
      }
    }

    if (neighbors.length === 0) {
      stack.pop();
      continue;
    }

    const next = neighbors[randInt(rand, neighbors.length)];
    const passageCol = currentTileCol + next.dc;
    const passageRow = currentTileRow + next.dr;
    wallTiles.delete(tileKey(passageCol, passageRow));

    const nextTileCol = 1 + next.c * 2;
    const nextTileRow = 1 + next.r * 2;
    wallTiles.delete(tileKey(nextTileCol, nextTileRow));

    visited.add(`${next.c},${next.r}`);
    stack.push({ c: next.c, r: next.r });
  }
}

function placePartialEdgeWalls(rand) {
  for (let col = 0; col < GRID_COLS; col += 1) {
    wallTiles.delete(tileKey(col, 0));
    wallTiles.delete(tileKey(col, GRID_ROWS - 1));
  }
  for (let row = 0; row < GRID_ROWS; row += 1) {
    wallTiles.delete(tileKey(0, row));
    wallTiles.delete(tileKey(GRID_COLS - 1, row));
  }

  addEdgeSegments("top", rand);
  addEdgeSegments("bottom", rand);
  addEdgeSegments("left", rand);
  addEdgeSegments("right", rand);
}

function addEdgeSegments(side, rand) {
  const segmentCount = 1 + randInt(rand, 2);
  for (let i = 0; i < segmentCount; i += 1) {
    const len = 2 + randInt(rand, 3);
    if (side === "top" || side === "bottom") {
      const row = side === "top" ? 0 : GRID_ROWS - 1;
      const startCol = randInt(rand, GRID_COLS - len);
      for (let col = startCol; col < startCol + len; col += 1) {
        addWall(col, row);
      }
    } else {
      const col = side === "left" ? 0 : GRID_COLS - 1;
      const startRow = randInt(rand, GRID_ROWS - len);
      for (let row = startRow; row < startRow + len; row += 1) {
        addWall(col, row);
      }
    }
  }
}

function placeExtraWalls(rand) {
  const extraCount = 4 + randInt(rand, 4);
  const safeZone = new Set();
  for (let dc = -1; dc <= 1; dc += 1) {
    for (let dr = -1; dr <= 1; dr += 1) {
      safeZone.add(tileKey(state.start.col + dc, state.start.row + dr));
      safeZone.add(tileKey(state.goal.col + dc, state.goal.row + dr));
    }
  }

  for (let i = 0; i < extraCount; i += 1) {
    const shape = EXTRA_WALL_SHAPES[randInt(rand, EXTRA_WALL_SHAPES.length)];
    const anchorCol = 1 + randInt(rand, GRID_COLS - 2);
    const anchorRow = 1 + randInt(rand, GRID_ROWS - 2);
    const tiles = shape.map(([dc, dr]) => [anchorCol + dc, anchorRow + dr]);

    const allowed = tiles.every(([col, row]) => {
      if (col <= 0 || col >= GRID_COLS - 1 || row <= 0 || row >= GRID_ROWS - 1) return false;
      return !safeZone.has(tileKey(col, row));
    });

    if (!allowed) continue;
    for (const [col, row] of tiles) addWall(col, row);
  }
}

function openStartAndGoal() {
  wallTiles.delete(tileKey(state.start.col, state.start.row));
  wallTiles.delete(tileKey(state.start.col, state.start.row - 1));
  wallTiles.delete(tileKey(state.goal.col, state.goal.row));
  wallTiles.delete(tileKey(state.goal.col - 1, state.goal.row));
}

function hasWalkablePath(from, to) {
  const visited = new Set();
  const queue = [{ col: from.col, row: from.row }];
  visited.add(tileKey(from.col, from.row));

  while (queue.length > 0) {
    const { col, row } = queue.shift();
    if (col === to.col && row === to.row) return true;

    for (const [dc, dr] of [[0,-1],[0,1],[-1,0],[1,0]]) {
      const nc = col + dc;
      const nr = row + dr;
      const key = tileKey(nc, nr);
      if (!visited.has(key) && isWalkable(nc, nr)) {
        visited.add(key);
        queue.push({ col: nc, row: nr });
      }
    }
  }
  return false;
}

function todayLabel() {
  return new Date().toISOString().slice(0, 10);
}

function init() {
  state.seed = todayLabel();
  buildMap();
  els.puzzleId.textContent = state.seed;
  els.seedInput.value = state.seed;
  bindEvents();
  updateUi();
  els.status.textContent = "Move with arrow keys. Press Blue or Yellow aim, then left-click a wall tile.";
  requestAnimationFrame(draw);
}

function bindEvents() {
  window.addEventListener("keydown", onMoveKey);
  canvas.addEventListener("click", onCanvasLeftClick);
  canvas.addEventListener("mousemove", onCanvasMouseMove);
  canvas.addEventListener("contextmenu", onCanvasRightClick);
  els.aimBlue.addEventListener("click", () => activatePortalAim("blue"));
  els.aimYellow.addEventListener("click", () => activatePortalAim("yellow"));
  els.reset.addEventListener("click", resetGame);
  els.setSeed.addEventListener("click", applySeedFromInput);
  els.seedInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      applySeedFromInput();
    }
  });
}

function applySeedFromInput() {
  const nextSeed = els.seedInput.value.trim();
  if (!nextSeed) {
    els.status.textContent = "Seed cannot be empty.";
    return;
  }

  state.seed = nextSeed;
  els.puzzleId.textContent = state.seed;
  resetGame();
  els.status.textContent = `Seed set to ${state.seed}. Map regenerated.`;
}

function resetGame() {
  state.wizard.col = state.start.col;
  state.wizard.row = state.start.row;
  state.portals.blue = null;
  state.portals.yellow = null;
  state.placement.active = false;
  state.placement.cursorX = null;
  state.placement.cursorY = null;
  state.placement.hitCol = null;
  state.placement.hitRow = null;
  state.placement.hitDir = null;
  state.placement.lineEndX = null;
  state.placement.lineEndY = null;
  state.nextPortalColor = "blue";
  state.teleportFx.active = false;
  state.teleportFx.phase = "out";
  state.teleportFx.from = null;
  state.teleportFx.to = null;
  state.teleportFx.slideFrom = null;
  state.teleportFx.slideTo = null;
  state.teleportFx.startTime = 0;
  state.portalPlacements = 0;
  state.portalUses = 0;
  state.moves = 0;
  state.won = false;
  buildMap();
  els.status.textContent = "Move with arrow keys. Press Blue or Yellow aim, then left-click a wall tile.";
  updateUi();
}

function onMoveKey(event) {
  if (state.won || state.teleportFx.active) return;

  const key = event.key.toLowerCase();
  let dCol = 0;
  let dRow = 0;

  if (key === "arrowup") dRow = -1;
  if (key === "arrowdown") dRow = 1;
  if (key === "arrowleft") dCol = -1;
  if (key === "arrowright") dCol = 1;

  if (dCol === 0 && dRow === 0) return;

  event.preventDefault();

  const currentPortal = getPortalAt(state.wizard.col, state.wizard.row);
  if (currentPortal && !directionMatches(currentPortal.exitDir, dCol, dRow)) {
    els.status.textContent = `Portal exit is locked ${currentPortal.exitDir}.`;
    return;
  }

  const nextCol = state.wizard.col + dCol;
  const nextRow = state.wizard.row + dRow;

  if (!isWalkable(nextCol, nextRow)) {
    els.status.textContent = "Blocked tile. Use portals on white wall tiles to create shortcuts.";
    return;
  }

  state.wizard.col = nextCol;
  state.wizard.row = nextRow;
  state.moves += 1;
  handlePortalTeleport();
  updateUi();
  checkGoal();
}

function onCanvasLeftClick(event) {
  if (state.teleportFx.active) return;

  if (!state.placement.active) {
    els.status.textContent = "Choose Blue or Yellow aim first.";
    return;
  }

  const pointer = pointerFromEvent(event);
  if (pointer) {
    updatePlacementAim(pointer.x, pointer.y);
  }

  placePortalFromAim();
}

function onCanvasMouseMove(event) {
  if (!state.placement.active) return;

  const pointer = pointerFromEvent(event);
  if (!pointer) return;

  updatePlacementAim(pointer.x, pointer.y);
}

function onCanvasRightClick(event) {
  event.preventDefault();

  if (!state.placement.active) return;

  clearPlacementAim();
  els.status.textContent = "Portal placement canceled.";
  updateUi();
}

function activatePortalAim(color) {
  state.placement.active = true;
  state.placement.color = color;

  els.status.textContent = `Aiming ${color} portal. The dotted line stops at the first wall hit. Left-click to confirm, right-click to cancel.`;
  updateUi();
}

function placePortalFromAim() {
  const color = state.placement.color;
  const col = state.placement.hitCol;
  const row = state.placement.hitRow;
  const exitDir = state.placement.hitDir;

  if (col === null || row === null || !exitDir) {
    els.status.textContent = "No wall in line of sight. Aim at a white wall tile.";
    return;
  }

  if (!canPlacePortalAt(col, row, color)) {
    els.status.textContent = "Invalid placement. Portal must be on a white wall tile and not on the other portal tile.";
    return;
  }

  state.portals[color] = { col, row, exitDir };
  state.portalPlacements += 1;
  clearPlacementAim();
  state.nextPortalColor = color === "blue" ? "yellow" : "blue";
  updateUi();

  if (!state.portals.blue || !state.portals.yellow) {
    const next = !state.portals.blue ? "blue" : "yellow";
    els.status.textContent = `${capitalize(color)} portal placed. Place the ${next} portal next.`;
  } else {
    els.status.textContent = `${capitalize(color)} portal placed. Step onto either portal to teleport.`;
  }
}

function clearPlacementAim() {
  state.placement.active = false;
  state.placement.cursorX = null;
  state.placement.cursorY = null;
  state.placement.hitCol = null;
  state.placement.hitRow = null;
  state.placement.hitDir = null;
  state.placement.lineEndX = null;
  state.placement.lineEndY = null;
}

function canPlacePortalAt(col, row, color) {
  if (!isWallTile(col, row)) return false;

  const otherColor = color === "blue" ? "yellow" : "blue";
  const otherPortal = state.portals[otherColor];
  if (!otherPortal) return true;

  return otherPortal.col !== col || otherPortal.row !== row;
}

function updatePlacementAim(targetX, targetY) {
  const origin = wizardCenter();
  const dx = targetX - origin.x;
  const dy = targetY - origin.y;
  const length = Math.hypot(dx, dy);

  state.placement.cursorX = targetX;
  state.placement.cursorY = targetY;

  if (length < 0.001) {
    state.placement.hitCol = null;
    state.placement.hitRow = null;
    state.placement.hitDir = null;
    state.placement.lineEndX = origin.x;
    state.placement.lineEndY = origin.y;
    return;
  }

  const step = 2;
  const ux = dx / length;
  const uy = dy / length;
  let lastX = origin.x;
  let lastY = origin.y;

  for (let t = 0; t <= length; t += step) {
    const x = origin.x + ux * t;
    const y = origin.y + uy * t;
    const col = Math.floor(x / TILE);
    const row = Math.floor(y / TILE);

    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) {
      break;
    }

    lastX = x;
    lastY = y;

    if (isWallTile(col, row)) {
      state.placement.hitCol = col;
      state.placement.hitRow = row;
      state.placement.hitDir = portalExitDirectionFromRay(ux, uy);
      const center = tileCenter(col, row);
      state.placement.lineEndX = center.x;
      state.placement.lineEndY = center.y;
      return;
    }
  }

  state.placement.hitCol = null;
  state.placement.hitRow = null;
  state.placement.hitDir = null;
  state.placement.lineEndX = lastX;
  state.placement.lineEndY = lastY;
}

function portalExitDirectionFromRay(ux, uy) {
  // Portal marker points to where the shot came from (opposite of aim ray).
  if (Math.abs(ux) >= Math.abs(uy)) {
    return ux > 0 ? "left" : "right";
  }
  return uy > 0 ? "up" : "down";
}

function directionMatches(direction, dCol, dRow) {
  if (direction === "left") return dCol === -1 && dRow === 0;
  if (direction === "right") return dCol === 1 && dRow === 0;
  if (direction === "up") return dCol === 0 && dRow === -1;
  if (direction === "down") return dCol === 0 && dRow === 1;
  return true;
}

function getPortalAt(col, row) {
  if (state.portals.blue && state.portals.blue.col === col && state.portals.blue.row === row) {
    return state.portals.blue;
  }
  if (state.portals.yellow && state.portals.yellow.col === col && state.portals.yellow.row === row) {
    return state.portals.yellow;
  }
  return null;
}

function handlePortalTeleport() {
  const tileColor = portalColorAt(state.wizard.col, state.wizard.row);
  if (!tileColor) return;

  const blue = state.portals.blue;
  const yellow = state.portals.yellow;
  if (!blue || !yellow) return;

  if (tileColor === "blue") {
    beginTeleport(blue, yellow, "Blue");
  } else {
    beginTeleport(yellow, blue, "Yellow");
  }
}

function beginTeleport(fromTile, toTile, fromColorName) {
  state.portalUses += 1;
  state.teleportFx.active = true;
  state.teleportFx.phase = "out";
  state.teleportFx.from = fromTile;
  state.teleportFx.to = toTile;
  state.teleportFx.slideFrom = null;
  state.teleportFx.slideTo = null;
  state.teleportFx.startTime = 0;
  els.status.textContent = `${fromColorName} portal engaged...`;
}

function updateTeleportEffect(time) {
  if (!state.teleportFx.active) return;

  if (state.teleportFx.startTime === 0) {
    state.teleportFx.startTime = time;
  }

  const elapsed = time - state.teleportFx.startTime;

  if (state.teleportFx.phase === "out") {
    if (elapsed >= state.teleportFx.durationOut) {
      state.wizard.col = state.teleportFx.to.col;
      state.wizard.row = state.teleportFx.to.row;
      state.teleportFx.phase = "in";
      state.teleportFx.startTime = time;
      els.status.textContent = "Whoosh... arriving.";
    }
    return;
  }

  if (state.teleportFx.phase === "in") {
    if (elapsed >= state.teleportFx.durationIn) {
      const slideTarget = slideTargetFromPortal(state.teleportFx.to);
      if (slideTarget) {
        state.teleportFx.phase = "slide";
        state.teleportFx.slideFrom = { col: state.wizard.col, row: state.wizard.row };
        state.teleportFx.slideTo = slideTarget;
        state.teleportFx.startTime = time;
        els.status.textContent = "Teleport complete. Sliding out...";
        return;
      }

      finishTeleport();
    }
    return;
  }

  if (state.teleportFx.phase === "slide") {
    if (elapsed >= state.teleportFx.durationSlide) {
      state.wizard.col = state.teleportFx.slideTo.col;
      state.wizard.row = state.teleportFx.slideTo.row;
      finishTeleport();
    }
  }
}

function finishTeleport() {
  state.teleportFx.active = false;
  state.teleportFx.phase = "out";
  state.teleportFx.from = null;
  state.teleportFx.to = null;
  state.teleportFx.slideFrom = null;
  state.teleportFx.slideTo = null;
  state.teleportFx.startTime = 0;
  els.status.textContent = "Teleport complete.";
  checkGoal();
}

function slideTargetFromPortal(portal) {
  if (!portal || !portal.exitDir) return null;
  const [dCol, dRow] = deltaFromDirection(portal.exitDir);
  const col = portal.col + dCol;
  const row = portal.row + dRow;

  if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return null;
  if (isWallTile(col, row)) return null;
  return { col, row };
}

function deltaFromDirection(direction) {
  if (direction === "left") return [-1, 0];
  if (direction === "right") return [1, 0];
  if (direction === "up") return [0, -1];
  if (direction === "down") return [0, 1];
  return [0, 0];
}

function getWizardAlpha(time) {
  if (!state.teleportFx.active) return 1;

  const elapsed = time - state.teleportFx.startTime;
  if (state.teleportFx.phase === "out") {
    const progress = Math.min(1, elapsed / state.teleportFx.durationOut);
    return 1 - progress;
  }

  const progress = Math.min(1, elapsed / state.teleportFx.durationIn);
  return progress;
}

function wizardCenterForRender(time) {
  if (state.teleportFx.active && state.teleportFx.phase === "slide") {
    const from = state.teleportFx.slideFrom;
    const to = state.teleportFx.slideTo;
    if (from && to) {
      const elapsed = time - state.teleportFx.startTime;
      const t = Math.min(1, elapsed / state.teleportFx.durationSlide);
      const eased = 1 - (1 - t) * (1 - t);
      const fromCenter = tileCenter(from.col, from.row);
      const toCenter = tileCenter(to.col, to.row);
      return {
        x: fromCenter.x + (toCenter.x - fromCenter.x) * eased,
        y: fromCenter.y + (toCenter.y - fromCenter.y) * eased,
      };
    }
  }

  return tileCenter(state.wizard.col, state.wizard.row);
}

function isWallTile(col, row) {
  return wallTiles.has(tileKey(col, row));
}

function isWalkable(col, row) {
  if (col < 0 || col >= GRID_COLS) return false;
  if (row < 0 || row >= GRID_ROWS) return false;

  if (!isWallTile(col, row)) return true;
  return portalColorAt(col, row) !== null;
}

function portalColorAt(col, row) {
  if (state.portals.blue && state.portals.blue.col === col && state.portals.blue.row === row) {
    return "blue";
  }
  if (state.portals.yellow && state.portals.yellow.col === col && state.portals.yellow.row === row) {
    return "yellow";
  }
  return null;
}

function checkGoal() {
  if (state.wizard.col === state.goal.col && state.wizard.row === state.goal.row) {
    state.won = true;
    els.status.textContent = `Level Cleared! SCORE: ${scoreValue()} = (${portalCount()} Portal Uses x 5) + (${state.moves} Moves x 10)`;
  }
}

function scoreValue() {
  return portalCount() * 5 + state.moves * 10;
}

function portalCount() {
  return state.portalUses;
}

function updateUi() {
  els.moveCount.textContent = state.moves;
  els.portalCount.textContent = portalCount();
  els.scoreCount.textContent = scoreValue();

  const aimingBlue = state.placement.active && state.placement.color === "blue";
  const aimingYellow = state.placement.active && state.placement.color === "yellow";
  els.aimBlue.classList.toggle("is-active", aimingBlue);
  els.aimYellow.classList.toggle("is-active", aimingYellow);
  els.aimBlue.setAttribute("aria-pressed", aimingBlue ? "true" : "false");
  els.aimYellow.setAttribute("aria-pressed", aimingYellow ? "true" : "false");
}

function tileFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) * canvas.width) / rect.width;
  const y = ((event.clientY - rect.top) * canvas.height) / rect.height;

  const col = Math.floor(x / TILE);
  const row = Math.floor(y / TILE);

  if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return null;
  return { col, row };
}

function pointerFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) * canvas.width) / rect.width;
  const y = ((event.clientY - rect.top) * canvas.height) / rect.height;

  if (x < 0 || x >= W || y < 0 || y >= H) return null;
  return { x, y };
}

function tileToPixel(col, row) {
  return {
    x: col * TILE,
    y: row * TILE,
  };
}

function tileCenter(col, row) {
  return {
    x: col * TILE + TILE * 0.5,
    y: row * TILE + TILE * 0.5,
  };
}

function wizardCenter() {
  return tileCenter(state.wizard.col, state.wizard.row);
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function draw(time) {
  ctx.clearRect(0, 0, W, H);

  updateTeleportEffect(time);

  drawFloor();
  drawGridLines();
  drawWalls();
  drawGoal(time);
  drawPortals();
  drawPortalPreview();
  drawWizard(time);
  drawPortalHints();
  drawLevelClearedBanner();

  requestAnimationFrame(draw);
}

function drawFloor() {
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, W, H);
}

function drawGridLines() {
  ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
  ctx.lineWidth = 1;

  for (let col = 0; col <= GRID_COLS; col += 1) {
    const x = col * TILE + 0.5;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }

  for (let row = 0; row <= GRID_ROWS; row += 1) {
    const y = row * TILE + 0.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
}

function drawWalls() {
  for (const key of wallTiles) {
    const [colText, rowText] = key.split(",");
    const col = Number(colText);
    const row = Number(rowText);
    const pos = tileToPixel(col, row);

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(pos.x, pos.y, TILE, TILE);

    ctx.strokeStyle = "#d9d9d9";
    ctx.lineWidth = 2;
    ctx.strokeRect(pos.x + 1, pos.y + 1, TILE - 2, TILE - 2);
  }
}

function drawGoal(time) {
  const pulse = 0.8 + 0.2 * Math.sin(time * 0.005);
  const pos = tileToPixel(state.goal.col, state.goal.row);
  const doorX = pos.x + 7;
  const doorY = pos.y + 6;
  const doorW = TILE - 14;
  const doorH = TILE - 10;
  const archR = doorW * 0.5;
  const centerX = doorX + archR;
  const archY = doorY + archR;

  ctx.fillStyle = `rgba(131, 84, 45, ${pulse})`;
  ctx.beginPath();
  ctx.moveTo(doorX, doorY + doorH);
  ctx.lineTo(doorX, archY);
  ctx.arc(centerX, archY, archR, Math.PI, 0, false);
  ctx.lineTo(doorX + doorW, doorY + doorH);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#5e3a1f";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.fillStyle = "#d6b894";
  ctx.beginPath();
  ctx.arc(doorX + doorW - 6, doorY + doorH * 0.62, 2.2, 0, Math.PI * 2);
  ctx.fill();
}

function drawLevelClearedBanner() {
  if (!state.won) return;

  const width = 420;
  const height = 96;
  const x = (W - width) * 0.5;
  const y = 18;

  ctx.fillStyle = "rgba(0, 0, 0, 0.78)";
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = "#ffd248";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);

  ctx.fillStyle = "#ffd248";
  ctx.font = "bold 28px Trebuchet MS, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Level Cleared!", x + width * 0.5, y + 38);

  ctx.fillStyle = "#eaf2ff";
  ctx.font = "16px Trebuchet MS, sans-serif";
  ctx.fillText(
    `SCORE: ${scoreValue()} = (${portalCount()} Portal Uses x 5) + (${state.moves} Moves x 10)`,
    x + width * 0.5,
    y + 70
  );
  ctx.textAlign = "start";
}

function drawPortals() {
  drawPortal(state.portals.blue, "#1f73f3");
  drawPortal(state.portals.yellow, "#ffd248");
}

function drawPortal(portal, color) {
  if (!portal) return;

  const pos = tileToPixel(portal.col, portal.row);
  const centerX = pos.x + TILE * 0.5;
  const centerY = pos.y + TILE * 0.5;

  ctx.strokeStyle = color;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(centerX, centerY, TILE * 0.3, 0, Math.PI * 2);
  ctx.stroke();

  const marker = portalMarkerEnd(centerX, centerY, portal.exitDir);
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(marker.x, marker.y);
  ctx.stroke();
}

function portalMarkerEnd(centerX, centerY, direction) {
  const edge = TILE * 0.5 - 3;
  if (direction === "left") return { x: centerX - edge, y: centerY };
  if (direction === "right") return { x: centerX + edge, y: centerY };
  if (direction === "up") return { x: centerX, y: centerY - edge };
  if (direction === "down") return { x: centerX, y: centerY + edge };
  return { x: centerX, y: centerY };
}

function drawPortalPreview() {
  if (!state.placement.active) return;
  if (state.placement.lineEndX === null || state.placement.lineEndY === null) return;

  const portalColor = state.placement.color === "blue" ? "#1f73f3" : "#ffd248";
  const hasHit = state.placement.hitCol !== null && state.placement.hitRow !== null;
  const valid =
    hasHit && canPlacePortalAt(state.placement.hitCol, state.placement.hitRow, state.placement.color);
  const lineColor = hasHit ? (valid ? portalColor : "#e64c4c") : "rgba(255, 255, 255, 0.85)";
  const origin = wizardCenter();

  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(origin.x, origin.y);
  ctx.lineTo(state.placement.lineEndX, state.placement.lineEndY);
  ctx.stroke();
  ctx.setLineDash([]);

  if (!hasHit) return;

  const hitCenter = tileCenter(state.placement.hitCol, state.placement.hitRow);
  ctx.strokeStyle = valid ? portalColor : "#e64c4c";
  ctx.lineWidth = 3;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.arc(hitCenter.x, hitCenter.y, TILE * 0.3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawWizard(time) {
  const alpha = getWizardAlpha(time);
  if (alpha <= 0) return;

  ctx.save();
  ctx.globalAlpha = alpha;

  const center = wizardCenterForRender(time);
  const bob = Math.sin(time * 0.01) * 2;
  const centerX = center.x;
  const centerY = center.y + bob;

  ctx.fillStyle = "#ffd248";
  ctx.beginPath();
  ctx.arc(centerX, centerY + 4, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#1f73f3";
  ctx.beginPath();
  ctx.moveTo(centerX, centerY - 20);
  ctx.lineTo(centerX - 11, centerY - 2);
  ctx.lineTo(centerX + 11, centerY - 2);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#eaf2ff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(centerX + 10, centerY - 2);
  ctx.lineTo(centerX + 16, centerY - 14);
  ctx.stroke();

  ctx.fillStyle = "#eaf2ff";
  ctx.beginPath();
  ctx.arc(centerX + 16, centerY - 14, 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawPortalHints() {
  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  ctx.font = "12px Trebuchet MS, sans-serif";
  ctx.fillText("Use Blue/Yellow buttons to choose portal", 14, 18);
  ctx.fillText("Right click: cancel placement", 14, 34);
}

init();
