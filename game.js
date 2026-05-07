const canvas = document.querySelector("#table");
const ctx = canvas.getContext("2d");

const els = {
  puzzleId: document.querySelector("#puzzle-id"),
  shotCount: document.querySelector("#shot-count"),
  remaining: document.querySelector("#remaining-count"),
  powerup: document.querySelector("#powerup-status"),
  streak: document.querySelector("#streak"),
  best: document.querySelector("#best-score"),
  status: document.querySelector("#status"),
  seedInput: document.querySelector("#seed-input"),
  seedForm: document.querySelector("#seed-form"),
  reset: document.querySelector("#reset-btn"),
  undo: document.querySelector("#undo-btn"),
  random: document.querySelector("#random-btn"),
  daily: document.querySelector("#daily-btn"),
  share: document.querySelector("#share-btn"),
};

const W = canvas.width;
const H = canvas.height;
const rail = 48;
const ballR = 14;
const pocketR = 28;
const friction = 0.988;
const minSpeed = 0.035;
const maxPower = 18.975;
const sinkFrames = 22;
const bonusChance = 0.45;
const powerupR = 15;
const powerupSpawnChance = 0.3;
const maxPull = 150;
const slowPocketBonus = 0.12;
const slowPocketSpeed = 4;
const bumperLength = 92;
const bumperThickness = 12;
const duckR = 12;
const colors = ["#f0c33b", "#2f72d6", "#d74936", "#7f45b8", "#f17128", "#2eaa58"];
const colorNames = {
  "#f0c33b": "yellow",
  "#2f72d6": "blue",
  "#d74936": "red",
  "#7f45b8": "purple",
  "#f17128": "orange",
  "#2eaa58": "green",
};
const pockets = [
  { x: rail, y: rail },
  { x: W / 2, y: rail - 3 },
  { x: W - rail, y: rail },
  { x: rail, y: H - rail },
  { x: W / 2, y: H - rail + 3 },
  { x: W - rail, y: H - rail },
];

let state;
let history = [];
let drag = null;
let bumperDrag = null;
let lastTimestamp = 0;

function todayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dayNumber(key) {
  const start = Date.UTC(2026, 0, 1);
  const current = Date.parse(`${key}T00:00:00.000Z`);
  return Math.floor((current - start) / 86400000) + 1;
}

function hashSeed(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  return function next() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randRange(rand, min, max) {
  return min + rand() * (max - min);
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function cloneBalls(balls) {
  return balls.map((ball) => ({ ...ball }));
}

function clonePowerups(powerups) {
  return powerups.map((powerup) => ({ ...powerup }));
}

function createDailyState() {
  const key = todayKey();
  return createSeededState({
    key,
    seed: key,
    mode: "daily",
    puzzleNumber: dayNumber(key),
  });
}

function createRandomState() {
  const seed = randomSeed();
  return createSeededState({
    key: `seed-${seed}`,
    seed,
    mode: "seed",
    puzzleNumber: seed,
  });
}

function createSeedPracticeState(seed) {
  const normalized = normalizeSeed(seed);
  return createSeededState({
    key: `seed-${normalized}`,
    seed: normalized,
    mode: "seed",
    puzzleNumber: normalized,
  });
}

function normalizeSeed(seed) {
  return String(seed || "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 32);
}

function randomSeed() {
  if (typeof crypto === "undefined" || !crypto.getRandomValues) {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }
  const bytes = new Uint32Array(2);
  crypto.getRandomValues(bytes);
  return [...bytes].map((part) => part.toString(36).padStart(6, "0")).join("-").slice(0, 13);
}

function createSeededState(config) {
  const rand = mulberry32(hashSeed(`perfect-pocket-layout-${config.seed}`));
  const cue = {
    id: "cue",
    x: W * 0.25,
    y: H * 0.5 + randRange(rand, -80, 80),
    vx: 0,
    vy: 0,
    r: ballR,
    color: "#f8f4e7",
    pocketed: false,
    sinking: 0,
    sinkX: 0,
    sinkY: 0,
  };
  const balls = [cue];
  const count = 4 + Math.floor(rand() * 3);
  const centerX = W * 0.63;
  const centerY = H * 0.5;

  for (let i = 0; i < count; i += 1) {
    let candidate;
    let attempts = 0;
    do {
      const angle = randRange(rand, 0, Math.PI * 2);
      const radius = randRange(rand, 36, 172);
      candidate = {
        id: `ball-${i}`,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        r: ballR,
        color: colors[i % colors.length],
        pocketed: false,
        sinking: 0,
        sinkX: 0,
        sinkY: 0,
      };
      attempts += 1;
    } while (
      attempts < 200 &&
      (candidate.x < rail + 70 ||
        candidate.x > W - rail - 70 ||
        candidate.y < rail + 70 ||
        candidate.y > H - rail - 70 ||
        balls.some((ball) => distance(ball, candidate) < ballR * 3.25))
    );
    balls.push(candidate);
  }

  const dailyState = {
    key: config.key,
    seed: config.seed,
    mode: config.mode,
    puzzleNumber: config.puzzleNumber,
    balls,
    powerups: [],
    activePowerups: {
      accuracy: false,
      bumper: false,
      rampage: false,
    },
    bumper: null,
    duck: null,
    shots: 0,
    turn: 0,
    bonus: null,
    bonusMessage: "",
    collectedMessage: "",
    moving: false,
    finished: false,
    scratch: false,
    rampagePending: false,
    duckPending: false,
    duckBirthTurn: -1,
  };
  dailyState.powerups = createPowerups(dailyState, "initial");
  chooseBonus(dailyState);
  return dailyState;
}

function createPowerups(gameState, spawnKey = gameState.turn) {
  const rand = mulberry32(hashSeed(`perfect-pocket-powerups-${gameState.key}-${spawnKey}`));
  const powerups = [];
  const allTypes = ["accuracy", "bumper", "rampage", "duck"];
  let types;
  if (spawnKey === "initial") {
    const first = Math.floor(rand() * allTypes.length);
    const second = (first + 1 + Math.floor(rand() * (allTypes.length - 1))) % allTypes.length;
    types = [allTypes[first], allTypes[second]];
  } else {
    types = [allTypes[Math.floor(rand() * allTypes.length)]];
  }

  for (const type of types) {
    let candidate;
    for (let i = 0; i < 250; i += 1) {
      candidate = {
        id: `${type}-${spawnKey}`,
        type,
        label: type === "accuracy" ? "Accuracy" : type === "bumper" ? "Bumper" : type === "rampage" ? "Rampage" : "Duck",
        x: randRange(rand, W * 0.34, W * 0.77),
        y: randRange(rand, rail + 70, H - rail - 70),
        r: powerupR,
        collected: false,
      };

      const nearBall = gameState.balls.some((ball) => distance(ball, candidate) < ballR + powerupR + 38);
      const nearPocket = pockets.some((pocket) => distance(pocket, candidate) < pocketR + powerupR + 30);
      const nearPowerup = powerups.some((powerup) => distance(powerup, candidate) < powerupR * 4);
      if (!nearBall && !nearPocket && !nearPowerup) break;
    }
    powerups.push(candidate);
  }

  return powerups;
}

function maybeRegeneratePowerup() {
  const hasAvailablePowerup = state.powerups.some((powerup) => !powerup.collected);
  if (hasAvailablePowerup) return "";

  const rand = mulberry32(hashSeed(`perfect-pocket-powerup-spawn-${state.key}-${state.turn}`));
  if (rand() > powerupSpawnChance) return "";

  state.powerups = [...state.powerups.filter((powerup) => !powerup.collected), ...createPowerups(state, state.turn)];
  return "A new powerup orb appeared.";
}

function getStats() {
  try {
    return JSON.parse(localStorage.getItem("perfectPocketStats")) || {};
  } catch {
    return {};
  }
}

function setStats(stats) {
  localStorage.setItem("perfectPocketStats", JSON.stringify(stats));
}

function saveCompletion() {
  if (state.mode !== "daily") return;

  const stats = getStats();
  const previous = stats.lastCompleted;
  if (!stats.results) stats.results = {};
  if (!stats.results[state.key] || state.shots < stats.results[state.key]) {
    stats.results[state.key] = state.shots;
  }

  const yesterday = new Date(`${state.key}T00:00:00`);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = todayKey(yesterday);
  if (previous === state.key) {
    stats.streak = stats.streak || 1;
  } else if (previous === yesterdayKey) {
    stats.streak = (stats.streak || 0) + 1;
  } else {
    stats.streak = 1;
  }
  stats.lastCompleted = state.key;
  setStats(stats);
}

function updateUi() {
  const remaining = state.balls.filter((ball) => ball.id !== "cue" && !ball.pocketed).length;
  const stats = getStats();
  const bestToday = stats.results?.[state.key];
  els.puzzleId.textContent = state.mode === "daily" ? `#${state.puzzleNumber}` : state.seed;
  els.shotCount.textContent = state.shots;
  els.remaining.textContent = remaining;
  els.powerup.textContent = activePowerupNames().join(" + ") || "None";
  els.streak.textContent = stats.streak || 0;
  els.best.textContent = state.mode === "daily" ? `Best: ${bestToday || "-"}` : "Practice";
  els.seedInput.value = state.seed || "";
  els.undo.disabled = history.length === 0 || state.moving || state.finished;
  els.share.disabled = !state.finished;
}

function activePowerupNames() {
  const names = [];
  if (state.activePowerups.accuracy) names.push("Accuracy");
  if (state.activePowerups.bumper) names.push("Bumper");
  if (state.activePowerups.rampage || state.rampagePending) names.push("Rampage");
  return names;
}

function activeBalls() {
  return state.balls.filter((ball) => !ball.pocketed);
}

function isMoving() {
  return activeBalls().some((ball) => Math.hypot(ball.vx, ball.vy) > minSpeed);
}

function objectBalls(gameState = state) {
  return gameState.balls.filter((ball) => ball.id !== "cue" && !ball.pocketed);
}

function chooseBonus(gameState = state) {
  const candidates = objectBalls(gameState);
  const rand = mulberry32(hashSeed(`perfect-pocket-bonus-${gameState.key}-${gameState.turn}`));
  if (candidates.length === 0 || rand() > bonusChance) {
    gameState.bonus = null;
    gameState.bonusMessage = "";
    return;
  }

  const target = candidates[Math.floor(rand() * candidates.length)];
  gameState.bonus = {
    active: true,
    pocketIndex: Math.floor(rand() * pockets.length),
    color: target.color,
    colorName: colorNames[target.color] || "matching",
  };
  gameState.bonusMessage = `Bonus: sink a ${gameState.bonus.colorName} ball in the glowing pocket for -1 shot.`;
}

function turnPrompt() {
  return state.bonus?.active
    ? state.bonusMessage
    : "No bonus pocket this turn. Line up the next shot.";
}

function snapshot() {
  return {
    balls: cloneBalls(state.balls),
    powerups: clonePowerups(state.powerups),
    activePowerups: { ...state.activePowerups },
    bumper: state.bumper ? { ...state.bumper } : null,
    duck: state.duck ? { ...state.duck } : null,
    shots: state.shots,
    turn: state.turn,
    bonus: state.bonus ? { ...state.bonus } : null,
    bonusMessage: state.bonusMessage,
    collectedMessage: state.collectedMessage,
    finished: state.finished,
    scratch: state.scratch,
    rampagePending: state.rampagePending,
    duckPending: state.duckPending,
    duckBirthTurn: state.duckBirthTurn,
  };
}

function restore(snap) {
  state.balls = cloneBalls(snap.balls);
  state.powerups = clonePowerups(snap.powerups);
  state.activePowerups = { ...snap.activePowerups };
  state.bumper = snap.bumper ? { ...snap.bumper } : null;
  state.duck = snap.duck ? { ...snap.duck } : null;
  state.shots = snap.shots;
  state.turn = snap.turn;
  state.bonus = snap.bonus ? { ...snap.bonus } : null;
  state.bonusMessage = snap.bonusMessage;
  state.collectedMessage = snap.collectedMessage;
  state.finished = snap.finished;
  state.scratch = snap.scratch;
  state.rampagePending = snap.rampagePending ?? false;
  state.duckPending = snap.duckPending ?? false;
  state.duckBirthTurn = snap.duckBirthTurn ?? -1;
  state.moving = false;
  drag = null;
  els.status.textContent = `Shot undone. ${turnPrompt()}`;
  updateUi();
}

function resetCueAfterScratch() {
  const cue = state.balls[0];
  cue.x = W * 0.25;
  cue.y = H * 0.5;
  cue.vx = 0;
  cue.vy = 0;
  cue.pocketed = false;
  for (let i = 0; i < 80; i += 1) {
    const overlap = state.balls.some((ball) => ball.id !== "cue" && !ball.pocketed && distance(ball, cue) < ballR * 2.5);
    if (!overlap) return;
    cue.y = rail + 80 + ((i * 37) % Math.floor(H - rail * 2 - 160));
  }
}

function finishIfCleared() {
  const remaining = state.balls.some((ball) => ball.id !== "cue" && !ball.pocketed);
  if (!remaining && !state.finished) {
    state.finished = true;
    saveCompletion();
    els.status.textContent =
      state.mode === "daily"
        ? `Cleared in ${state.shots} shots. Share it, then come back tomorrow.`
        : `Cleared seed ${state.seed} in ${state.shots} shots. Share the seed with friends.`;
  }
}

function applyBonusIfMatched(ball, pocketIndex) {
  if (!state.bonus?.active || ball.id === "cue") return;
  if (state.bonus.pocketIndex !== pocketIndex || state.bonus.color !== ball.color) return;

  state.shots = Math.max(0, state.shots - 1);
  state.bonus.active = false;
  state.bonusMessage = `Perfect pocket. ${state.bonus.colorName} ball matched for -1 shot.`;
}

function collectPowerups() {
  const cue = state.balls[0];
  if (cue.pocketed) return;

  for (const powerup of state.powerups) {
    if (powerup.collected || distance(cue, powerup) > cue.r + powerup.r) continue;
    powerup.collected = true;
    if (powerup.type === "accuracy") {
      state.activePowerups.accuracy = true;
      state.collectedMessage = "Accuracy collected. Aim preview now shows wall reflections.";
      els.status.textContent = state.collectedMessage;
      updateUi();
    } else if (powerup.type === "bumper") {
      state.activePowerups.bumper = true;
      state.collectedMessage = "Bumper collected. Drag it into position, drag the handle to rotate, then shoot.";
      els.status.textContent = state.collectedMessage;
      updateUi();
    } else if (powerup.type === "rampage") {
      state.rampagePending = true;
      state.collectedMessage = "Rampage collected. Next shot has 5x power and the cue ball barrels through everything.";
      els.status.textContent = state.collectedMessage;
      updateUi();
    } else if (powerup.type === "duck") {
      state.duckPending = true;
      state.collectedMessage = "Duck collected. A rubber duck will appear on the table to obstruct your next shot!";
      els.status.textContent = state.collectedMessage;
      updateUi();
    }
  }
}

function createDefaultBumper() {
  const cue = state.balls[0];
  const x = clamp(cue.x + 160, bumperThickness, W - bumperThickness);
  const y = clamp(cue.y, bumperThickness, H - bumperThickness);
  return {
    x,
    y,
    angle: 0,
    active: true,
  };
}

function stepPhysics() {
  const balls = activeBalls();
  for (const ball of balls) {
    ball.x += ball.vx;
    ball.y += ball.vy;
    ball.vx *= friction;
    ball.vy *= friction;
    if (Math.hypot(ball.vx, ball.vy) < minSpeed) {
      ball.vx = 0;
      ball.vy = 0;
    }

    if (ball.x < rail + ball.r) {
      ball.x = rail + ball.r;
      ball.vx = Math.abs(ball.vx) * 0.86;
    }
    if (ball.x > W - rail - ball.r) {
      ball.x = W - rail - ball.r;
      ball.vx = -Math.abs(ball.vx) * 0.86;
    }
    if (ball.y < rail + ball.r) {
      ball.y = rail + ball.r;
      ball.vy = Math.abs(ball.vy) * 0.86;
    }
    if (ball.y > H - rail - ball.r) {
      ball.y = H - rail - ball.r;
      ball.vy = -Math.abs(ball.vy) * 0.86;
    }

    resolveBumperCollision(ball);
    resolveDuckCollision(ball);
  }

  for (let i = 0; i < balls.length; i += 1) {
    for (let j = i + 1; j < balls.length; j += 1) {
      resolveCollision(balls[i], balls[j]);
    }
  }

  collectPowerups();

  for (const ball of balls) {
    const pocketIndex = pockets.findIndex((p) => Math.hypot(ball.x - p.x, ball.y - p.y) < effectivePocketRadius(ball));
    if (pocketIndex !== -1) {
      const pocket = pockets[pocketIndex];
      ball.pocketed = true;
      ball.vx = 0;
      ball.vy = 0;
      ball.sinking = sinkFrames;
      ball.sinkX = pocket.x;
      ball.sinkY = pocket.y;
      applyBonusIfMatched(ball, pocketIndex);
      if (ball.id === "cue") {
        state.scratch = true;
      }
    }
  }

}

function effectivePocketRadius(ball) {
  const speed = Math.hypot(ball.vx, ball.vy);
  const slowRatio = Math.max(0, Math.min(1, 1 - speed / slowPocketSpeed));
  return pocketR * (1 + slowPocketBonus * slowRatio);
}

function updateSinks(steps = 1) {
  for (const ball of state.balls) {
    if (ball.sinking > 0) {
      ball.sinking = Math.max(0, ball.sinking - steps);
    }
  }
}

function resolveCollision(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy);
  const minDist = a.r + b.r;
  if (dist <= 0 || dist >= minDist) return;

  const nx = dx / dist;
  const ny = dy / dist;
  const tx = -ny;
  const ty = nx;
  const dpTanA = a.vx * tx + a.vy * ty;
  const dpTanB = b.vx * tx + b.vy * ty;
  const dpNormA = a.vx * nx + a.vy * ny;
  const dpNormB = b.vx * nx + b.vy * ny;

  // Freight: cue has infinite mass — push only the target, cue velocity unchanged
  if (state.activePowerups.rampage) {
    const fullOverlap = minDist - dist;
    if (a.id === "cue") {
      b.x += nx * fullOverlap;
      b.y += ny * fullOverlap;
      b.vx = tx * dpTanB + nx * (2 * dpNormA - dpNormB);
      b.vy = ty * dpTanB + ny * (2 * dpNormA - dpNormB);
      return;
    }
    if (b.id === "cue") {
      a.x -= nx * fullOverlap;
      a.y -= ny * fullOverlap;
      a.vx = tx * dpTanA + nx * (2 * dpNormB - dpNormA);
      a.vy = ty * dpTanA + ny * (2 * dpNormB - dpNormA);
      return;
    }
  }

  const overlap = (minDist - dist) / 2;
  a.x -= nx * overlap;
  a.y -= ny * overlap;
  b.x += nx * overlap;
  b.y += ny * overlap;
  a.vx = tx * dpTanA + nx * dpNormB;
  a.vy = ty * dpTanA + ny * dpNormB;
  b.vx = tx * dpTanB + nx * dpNormA;
  b.vy = ty * dpTanB + ny * dpNormA;
}

function resolveBumperCollision(ball) {
  if (!state.bumper?.active || ball.pocketed) return;

  const local = toBumperLocal(ball.x, ball.y);
  const halfLength = bumperLength / 2;
  const halfThickness = bumperThickness / 2;
  const closestX = clamp(local.x, -halfLength, halfLength);
  const closestY = clamp(local.y, -halfThickness, halfThickness);
  let dx = local.x - closestX;
  let dy = local.y - closestY;
  let dist = Math.hypot(dx, dy);

  if (dist === 0) {
    const gapX = halfLength - Math.abs(local.x);
    const gapY = halfThickness - Math.abs(local.y);
    if (gapX < gapY) {
      dx = local.x < 0 ? -1 : 1;
      dy = 0;
      dist = 1;
    } else {
      dx = 0;
      dy = local.y < 0 ? -1 : 1;
      dist = 1;
    }
  }

  if (dist >= ball.r) return;

  const localNormalX = dx / dist;
  const localNormalY = dy / dist;
  const normalPoint = fromBumperLocal(localNormalX, localNormalY);
  const originPoint = fromBumperLocal(0, 0);
  const nx = normalPoint.x - originPoint.x;
  const ny = normalPoint.y - originPoint.y;
  const overlap = ball.r - dist;
  ball.x += nx * overlap;
  ball.y += ny * overlap;

  const velocityIntoWall = ball.vx * nx + ball.vy * ny;
  if (velocityIntoWall < 0) {
    ball.vx -= 2 * velocityIntoWall * nx;
    ball.vy -= 2 * velocityIntoWall * ny;
    ball.vx *= 0.92;
    ball.vy *= 0.92;
  }
}

function resolveDuckCollision(ball) {
  if (!state.duck || ball.pocketed) return;

  const dx = ball.x - state.duck.x;
  const dy = ball.y - state.duck.y;
  const dist = Math.hypot(dx, dy);
  const minDist = ball.r + duckR;

  if (dist >= minDist) return;

  const nx = dx / dist;
  const ny = dy / dist;
  const overlap = minDist - dist;
  ball.x += nx * overlap;
  ball.y += ny * overlap;

  const velocityIntoDuck = ball.vx * nx + ball.vy * ny;
  if (velocityIntoDuck < 0) {
    ball.vx -= 2 * velocityIntoDuck * nx;
    ball.vy -= 2 * velocityIntoDuck * ny;
    ball.vx *= 0.88;
    ball.vy *= 0.88;
  }
}

function drawTable() {
  ctx.clearRect(0, 0, W, H);
  const gradient = ctx.createLinearGradient(rail, rail, W - rail, H - rail);
  gradient.addColorStop(0, "#167a5c");
  gradient.addColorStop(1, "#0d513f");
  ctx.fillStyle = "#3d1d10";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = gradient;
  roundRect(rail, rail, W - rail * 2, H - rail * 2, 22);
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,0.09)";
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 14]);
  ctx.beginPath();
  ctx.moveTo(W * 0.28, rail + 22);
  ctx.lineTo(W * 0.28, H - rail - 22);
  ctx.stroke();
  ctx.setLineDash([]);

  for (const pocket of pockets) {
    ctx.fillStyle = "#090704";
    ctx.beginPath();
    ctx.arc(pocket.x, pocket.y, pocketR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(245,184,75,0.22)";
    ctx.lineWidth = 4;
    ctx.stroke();
  }
  drawBonusPocket();

  for (const powerup of state.powerups) {
    if (!powerup.collected) drawPowerup(powerup);
  }

  if (state.bumper?.active) {
    drawBumper();
  }

  if (state.duck) {
    drawDuck();
  }

  for (const ball of state.balls) {
    if (!ball.pocketed || ball.sinking > 0) drawBall(ball);
  }

  if (drag && !state.moving && !state.finished) {
    drawAim();
  }
}

function drawBonusPocket() {
  if (!state.bonus?.active || state.finished) return;

  const pocket = pockets[state.bonus.pocketIndex];
  const pulse = 0.5 + Math.sin(performance.now() / 210) * 0.5;
  ctx.save();
  ctx.strokeStyle = state.bonus.color;
  ctx.shadowColor = state.bonus.color;
  ctx.shadowBlur = 14 + pulse * 10;
  ctx.lineWidth = 5 + pulse * 2;
  ctx.beginPath();
  ctx.arc(pocket.x, pocket.y, pocketR + 8 + pulse * 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawPowerup(powerup) {
  const pulse = 0.5 + Math.sin(performance.now() / 260) * 0.5;
  const midColor = powerup.type === "bumper" ? "#ffd38b" : powerup.type === "rampage" ? "#ff8080" : powerup.type === "duck" ? "#FFD700" : "#8be7ff";
  const outerColor = powerup.type === "bumper" ? "#f17128" : powerup.type === "rampage" ? "#c0141a" : powerup.type === "duck" ? "#FF8C00" : "#246ecf";
  const gradient = ctx.createRadialGradient(powerup.x - 5, powerup.y - 6, 2, powerup.x, powerup.y, powerup.r + 10);
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(0.32, midColor);
  gradient.addColorStop(1, outerColor);

  ctx.save();
  ctx.globalAlpha = 0.86;
  ctx.shadowColor = midColor;
  ctx.shadowBlur = 14 + pulse * 10;
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(powerup.x, powerup.y, powerup.r + pulse * 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.72)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#081b22";
  ctx.font = "700 14px Georgia, 'Times New Roman', serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const label = powerup.type === "bumper" ? "B" : powerup.type === "rampage" ? "R" : powerup.type === "duck" ? "D" : "A";
  ctx.fillText(label, powerup.x, powerup.y + 1);
  ctx.restore();
}

function drawBumper() {
  const bumper = state.bumper;
  const half = bumperLength / 2;
  const handle = bumperHandle();

  ctx.save();
  ctx.translate(bumper.x, bumper.y);
  ctx.rotate(bumper.angle);
  ctx.shadowColor = "#ffd38b";
  ctx.shadowBlur = 12;
  ctx.fillStyle = "#f17128";
  roundRect(-half, -bumperThickness / 2, bumperLength, bumperThickness, bumperThickness / 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.72)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  if (!state.moving && !state.finished && state.activePowerups.bumper) {
    ctx.save();
    ctx.strokeStyle = "rgba(255,211,139,0.7)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bumper.x, bumper.y);
    ctx.lineTo(handle.x, handle.y);
    ctx.stroke();
    ctx.fillStyle = "#ffd38b";
    ctx.shadowColor = "#ffd38b";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(handle.x, handle.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

}

function drawDuck() {
  const duck = state.duck;
  ctx.save();
  
  // Duck body
  ctx.fillStyle = "#FFD700";
  ctx.shadowColor = "#FF8C00";
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(duck.x, duck.y + 1, duckR, 0, Math.PI * 2);
  ctx.fill();
  
  // Duck head (smaller circle on top)
  ctx.fillStyle = "#FFD700";
  ctx.beginPath();
  ctx.arc(duck.x, duck.y - duckR * 0.6, duckR * 0.65, 0, Math.PI * 2);
  ctx.fill();
  
  // Duck eye
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.arc(duck.x + duckR * 0.2, duck.y - duckR * 0.8, duckR * 0.2, 0, Math.PI * 2);
  ctx.fill();
  
  // Duck beak
  ctx.fillStyle = "#FF8C00";
  ctx.beginPath();
  ctx.arc(duck.x + duckR * 0.5, duck.y - duckR * 0.6, duckR * 0.25, 0, Math.PI * 2);
  ctx.fill();
  
  // Outline
  ctx.strokeStyle = "rgba(158, 115, 63, 0.5)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(duck.x, duck.y + 1, duckR, 0, Math.PI * 2);
  ctx.stroke();
  
  ctx.restore();
}

function bumperHandle() {
  if (!state.bumper) return { x: 0, y: 0 };
  return {
    x: state.bumper.x + Math.cos(state.bumper.angle) * (bumperLength / 2 + 26),
    y: state.bumper.y + Math.sin(state.bumper.angle) * (bumperLength / 2 + 26),
  };
}

function drawBall(ball) {
  const sinkProgress = ball.sinking > 0 ? 1 - ball.sinking / sinkFrames : 0;
  const x = ball.pocketed ? ball.x + (ball.sinkX - ball.x) * sinkProgress : ball.x;
  const y = ball.pocketed ? ball.y + (ball.sinkY - ball.y) * sinkProgress : ball.y;
  const radius = ball.pocketed ? ball.r * (1 - sinkProgress * 0.82) : ball.r;
  ctx.save();
  if (ball.pocketed) {
    ctx.globalAlpha = 1 - sinkProgress * 0.7;
  }
  
  // Ready to shoot indicator for cue ball
  if (ball.id === "cue" && !state.moving && !state.finished && !ball.pocketed) {
    const pulse = 0.5 + Math.sin(performance.now() / 180) * 0.5;
    ctx.strokeStyle = `rgba(34, 187, 102, ${0.4 + pulse * 0.4})`;
    ctx.shadowColor = "#22bb66";
    ctx.shadowBlur = 12 + pulse * 8;
    ctx.lineWidth = 3 + pulse * 2;
    ctx.beginPath();
    ctx.arc(x, y, radius + 8 + pulse * 6, 0, Math.PI * 2);
    ctx.stroke();
  }
  
  if (ball.id === "cue" && state.activePowerups.accuracy && !ball.pocketed) {
    ctx.shadowColor = "#8be7ff";
    ctx.shadowBlur = 18;
  }
  const shine = ctx.createRadialGradient(x - 5, y - 7, 2, x, y, radius + 4);
  shine.addColorStop(0, "#ffffff");
  shine.addColorStop(0.18, ball.id === "cue" ? "#fffdf2" : "#ffe9ad");
  shine.addColorStop(1, ball.color);
  ctx.fillStyle = shine;
  ctx.beginPath();
  ctx.arc(x, y, Math.max(radius, 1), 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function drawAim() {
  const cue = state.balls[0];
  const dx = drag.x - cue.x;
  const dy = drag.y - cue.y;
  const rawPull = Math.hypot(dx, dy);
  const pull = Math.min(rawPull, maxPull);
  const angle = Math.atan2(dy, dx);
  const shotAngle = angle + Math.PI;

  ctx.strokeStyle = state.activePowerups.accuracy ? "rgba(139,231,255,0.95)" : "rgba(247,241,223,0.88)";
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 10]);
  if (state.activePowerups.accuracy) {
    drawAccuracyPath(cue.x, cue.y, shotAngle);
  } else {
    const targetX = cue.x + Math.cos(shotAngle) * pull * 1.35;
    const targetY = cue.y + Math.sin(shotAngle) * pull * 1.35;
    ctx.beginPath();
    ctx.moveTo(cue.x, cue.y);
    ctx.lineTo(targetX, targetY);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  drawPowerMeter(cue.x, cue.y, angle, pull / maxPull);
}

function drawPowerMeter(cueX, cueY, angle, ratio) {
  const clampedRatio = Math.max(0, Math.min(1, ratio));
  const meterLength = 138;
  const meterHeight = 9;
  const startOffset = 24;
  const startX = cueX + Math.cos(angle) * startOffset;
  const startY = cueY + Math.sin(angle) * startOffset;
  const endX = startX + Math.cos(angle) * meterLength;
  const endY = startY + Math.sin(angle) * meterLength;
  const fillX = startX + Math.cos(angle) * meterLength * clampedRatio;
  const fillY = startY + Math.sin(angle) * meterLength * clampedRatio;
  const color = clampedRatio < 0.45 ? "#2eaa58" : clampedRatio < 0.78 ? "#f0c33b" : "#d74936";

  ctx.save();
  ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(9,7,4,0.62)";
  ctx.lineWidth = meterHeight + 4;
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.lineWidth = meterHeight;
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(fillX, fillY);
  ctx.stroke();
  ctx.restore();
}

function drawAccuracyPath(startX, startY, angle) {
  let x = startX;
  let y = startY;
  let dx = Math.cos(angle);
  let dy = Math.sin(angle);
  const left = rail + ballR;
  const right = W - rail - ballR;
  const top = rail + ballR;
  const bottom = H - rail - ballR;

  ctx.beginPath();
  ctx.moveTo(x, y);

  for (let bounce = 0; bounce < 2; bounce += 1) {
    const wallHit = nextWallHit(x, y, dx, dy, left, right, top, bottom);
    const ballHit = firstBallHit(x, y, dx, dy, wallHit.distance);
    if (ballHit) {
      ctx.lineTo(ballHit.x, ballHit.y);
      ctx.stroke();
      drawAimImpact(ballHit.x, ballHit.y);
      return;
    }

    const t = wallHit.distance;
    if (!Number.isFinite(t) || t <= 0) break;

    x = wallHit.x;
    y = wallHit.y;
    ctx.lineTo(x, y);

    if (wallHit.axis === "corner") {
      dx *= -1;
      dy *= -1;
    } else if (wallHit.axis === "x") {
      dx *= -1;
    } else {
      dy *= -1;
    }
  }

  ctx.stroke();
}

function nextWallHit(x, y, dx, dy, left, right, top, bottom) {
  const tx = dx > 0 ? (right - x) / dx : dx < 0 ? (left - x) / dx : Infinity;
  const ty = dy > 0 ? (bottom - y) / dy : dy < 0 ? (top - y) / dy : Infinity;
  const distanceToWall = Math.min(tx, ty);
  const hitX = x + dx * distanceToWall;
  const hitY = y + dy * distanceToWall;
  let axis = tx < ty ? "x" : "y";
  if (Math.abs(tx - ty) < 0.0001) {
    axis = "corner";
  }

  return {
    axis,
    distance: distanceToWall,
    x: hitX,
    y: hitY,
  };
}

function firstBallHit(x, y, dx, dy, maxDistance) {
  let closest = null;
  for (const ball of state.balls) {
    if (ball.id === "cue" || ball.pocketed) continue;

    const ox = ball.x - x;
    const oy = ball.y - y;
    const projection = ox * dx + oy * dy;
    if (projection <= 0 || projection >= maxDistance) continue;

    const closestX = x + dx * projection;
    const closestY = y + dy * projection;
    const miss = Math.hypot(ball.x - closestX, ball.y - closestY);
    if (miss > ball.r + ballR) continue;

    const offset = Math.sqrt((ball.r + ballR) ** 2 - miss ** 2);
    const hitDistance = projection - offset;
    if (hitDistance <= 0 || hitDistance >= maxDistance) continue;
    if (!closest || hitDistance < closest.distance) {
      closest = {
        distance: hitDistance,
        x: x + dx * hitDistance,
        y: y + dy * hitDistance,
      };
    }
  }
  return closest;
}

function drawAimImpact(x, y) {
  ctx.save();
  ctx.setLineDash([]);
  ctx.strokeStyle = "rgba(139,231,255,0.85)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, ballR + 4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function roundRect(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function pointerPosition(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * W,
    y: ((event.clientY - rect.top) / rect.height) * H,
  };
}

function startDrag(event) {
  if (state.moving || state.finished || state.balls[0].pocketed) return;
  const pos = pointerPosition(event);
  const bumperMode = bumperPointerMode(pos);
  if (bumperMode) {
    bumperDrag = {
      mode: bumperMode,
      offsetX: pos.x - state.bumper.x,
      offsetY: pos.y - state.bumper.y,
    };
    canvas.setPointerCapture(event.pointerId);
    return;
  }
  if (distance(pos, state.balls[0]) > ballR * 3) return;
  drag = pos;
  canvas.setPointerCapture(event.pointerId);
}

function moveDrag(event) {
  if (bumperDrag) {
    moveBumper(pointerPosition(event));
    return;
  }
  if (!drag) return;
  drag = pointerPosition(event);
}

function endDrag(event) {
  if (bumperDrag) {
    bumperDrag = null;
    canvas.releasePointerCapture(event.pointerId);
    return;
  }
  if (!drag) return;
  const cue = state.balls[0];
  const dx = drag.x - cue.x;
  const dy = drag.y - cue.y;
  const pull = Math.min(Math.hypot(dx, dy), maxPull);
  if (pull > 8) {
    history.push(snapshot());
    if (state.rampagePending) {
      state.activePowerups.rampage = true;
      state.rampagePending = false;
    }
    const shotPower = state.activePowerups.rampage ? maxPower * 5 : maxPower;
    cue.vx = (-dx / Math.max(Math.hypot(dx, dy), 1)) * (pull / maxPull) * shotPower;
    cue.vy = (-dy / Math.max(Math.hypot(dx, dy), 1)) * (pull / maxPull) * shotPower;
    state.shots += 1;
    state.turn += 1;
    state.moving = true;
    state.scratch = false;
    state.collectedMessage = "";
    if (state.activePowerups.bumper && state.bumper?.active) {
      state.bumper.consuming = true;
    }
    state.activePowerups.accuracy = false;
    state.activePowerups.bumper = false;
    els.status.textContent = "Balls are moving...";
  }
  drag = null;
  canvas.releasePointerCapture(event.pointerId);
  updateUi();
}

function bumperPointerMode(pos) {
  if (!state.activePowerups.bumper || !state.bumper?.active) return null;
  const handle = bumperHandle();
  if (distance(pos, handle) < 20) return "rotate";
  if (pointNearBumper(pos, bumperThickness + 14)) return "move";
  return null;
}

function moveBumper(pos) {
  if (!state.bumper) return;
  if (bumperDrag.mode === "rotate") {
    state.bumper.angle = Math.atan2(pos.y - state.bumper.y, pos.x - state.bumper.x);
    return;
  }

  state.bumper.x = clamp(pos.x - bumperDrag.offsetX, bumperThickness, W - bumperThickness);
  state.bumper.y = clamp(pos.y - bumperDrag.offsetY, bumperThickness, H - bumperThickness);
}

function pointNearBumper(pos, padding = 0) {
  if (!state.bumper) return false;
  const local = toBumperLocal(pos.x, pos.y);
  return Math.abs(local.x) <= bumperLength / 2 + padding && Math.abs(local.y) <= bumperThickness / 2 + padding;
}

function toBumperLocal(x, y) {
  const dx = x - state.bumper.x;
  const dy = y - state.bumper.y;
  const cos = Math.cos(-state.bumper.angle);
  const sin = Math.sin(-state.bumper.angle);
  return {
    x: dx * cos - dy * sin,
    y: dx * sin + dy * cos,
  };
}

function fromBumperLocal(x, y) {
  const cos = Math.cos(state.bumper.angle);
  const sin = Math.sin(state.bumper.angle);
  return {
    x: state.bumper.x + x * cos - y * sin,
    y: state.bumper.y + x * sin + y * cos,
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function spawnDuck() {
  const rand = mulberry32(hashSeed(`perfect-pocket-duck-${state.key}-${state.turn}`));
  let candidate;
  for (let i = 0; i < 200; i += 1) {
    candidate = {
      x: randRange(rand, W * 0.35, W * 0.85),
      y: randRange(rand, rail + 70, H - rail - 70),
    };

    const nearBall = state.balls.some((ball) => distance(ball, candidate) < ballR + duckR + 40);
    const nearPocket = pockets.some((pocket) => distance(pocket, candidate) < pocketR + duckR + 30);
    if (!nearBall && !nearPocket) break;
  }
  state.duck = candidate;
  state.duckBirthTurn = state.turn;
}

function animate(timestamp) {
  if (!lastTimestamp) lastTimestamp = timestamp;
  const steps = Math.min(4, Math.max(1, Math.round((timestamp - lastTimestamp) / 16.67)));
  lastTimestamp = timestamp;

  if (state.moving) {
    for (let i = 0; i < steps; i += 1) stepPhysics();
    updateSinks(steps);
    if (!isMoving()) {
      const cue = state.balls[0];
      if (state.scratch && cue.sinking > 0) {
        els.status.textContent = "Scratch. Cue ball is dropping...";
        drawTable();
        requestAnimationFrame(animate);
        return;
      }

      state.moving = false;
      state.activePowerups.rampage = false;
      const earnedBonusMessage = state.bonus && !state.bonus.active ? state.bonusMessage : "";
      const turnMessages = [];
      if (earnedBonusMessage) {
        turnMessages.push(earnedBonusMessage);
      }
      if (state.collectedMessage) {
        turnMessages.push(state.collectedMessage);
      }
      if (state.activePowerups.bumper && !state.bumper) {
        state.bumper = createDefaultBumper();
      }
      if (state.scratch) {
        state.shots += 1;
        resetCueAfterScratch();
        turnMessages.push("Scratch. Cue ball reset, +1 penalty shot.");
      } else {
        turnMessages.push("✓ Ready to shoot!");
      }
      if (state.bumper?.consuming) {
        state.bumper = null;
        turnMessages.push("Bumper disappeared.");
      }
      if (state.duckPending) {
        spawnDuck();
        state.duckPending = false;
        turnMessages.push("A rubber duck has appeared on the table!");
      } else if (state.duck && state.turn > state.duckBirthTurn) {
        state.duck = null;
        turnMessages.push("Duck waddled away.");
      }
      finishIfCleared();
      if (!state.finished) {
        const regeneratedMessage = maybeRegeneratePowerup();
        if (regeneratedMessage) {
          turnMessages.push(regeneratedMessage);
        }
        chooseBonus();
        els.status.textContent = `${turnMessages.join(" ")} ${turnPrompt()}`;
      }
      updateUi();
    }
  } else {
    updateSinks(steps);
  }

  drawTable();
  requestAnimationFrame(animate);
}

function shareText() {
  const rating = state.shots <= 3 ? "🔥" : state.shots <= 5 ? "🎱" : "⬛";
  if (state.mode === "daily") {
    return `Perfect Pocket #${state.puzzleNumber}\nCleared in ${state.shots} shots ${rating}\n${location.href}`;
  }
  return `Perfect Pocket Seed ${state.seed}\nCleared in ${state.shots} shots ${rating}\nSeed: ${state.seed}\n${location.href}`;
}

async function share() {
  const text = shareText();
  if (navigator.share) {
    await navigator.share({ text });
    return;
  }
  await navigator.clipboard.writeText(text);
  els.status.textContent = "Result copied to clipboard.";
}

function boot() {
  state = createDailyState();
  window.perfectPocketBot = {
    getState() {
      const cue = state.balls[0];
      return {
        cue: { x: cue.x, y: cue.y, pocketed: cue.pocketed },
        moving: state.moving,
        finished: state.finished,
        shots: state.shots,
        remaining: state.balls.filter((ball) => ball.id !== "cue" && !ball.pocketed).length,
      };
    },
  };
  updateUi();
  els.status.textContent = turnPrompt();
  canvas.addEventListener("pointerdown", startDrag);
  canvas.addEventListener("pointermove", moveDrag);
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", () => {
    drag = null;
    bumperDrag = null;
  });
  els.reset.addEventListener("click", () => {
    state = state.mode === "daily" ? createDailyState() : createSeedPracticeState(state.seed);
    history = [];
    els.status.textContent = `Table reset. ${turnPrompt()}`;
    updateUi();
  });
  els.random.addEventListener("click", () => {
    state = createRandomState();
    history = [];
    els.status.textContent = `Random practice seed loaded: ${state.seed}. ${turnPrompt()}`;
    updateUi();
  });
  els.daily.addEventListener("click", () => {
    state = createDailyState();
    history = [];
    els.status.textContent = `Daily game loaded. ${turnPrompt()}`;
    updateUi();
  });
  els.seedForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const seed = normalizeSeed(els.seedInput.value);
    if (!seed) {
      els.status.textContent = "Enter a seed to load a practice game.";
      return;
    }
    state = createSeedPracticeState(seed);
    history = [];
    els.status.textContent = `Practice seed loaded: ${state.seed}. ${turnPrompt()}`;
    updateUi();
  });
  els.undo.addEventListener("click", () => {
    const snap = history.pop();
    if (snap) restore(snap);
  });
  els.share.addEventListener("click", () => {
    share().catch(() => {
      els.status.textContent = "Sharing failed. Your browser may block clipboard access.";
    });
  });
  requestAnimationFrame(animate);
}

boot();
