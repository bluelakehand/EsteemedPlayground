'use strict';

const canvas = document.getElementById('road');
const ctx = canvas.getContext('2d');

const els = {
  screenStart: document.getElementById('screen-start'),
  screenPlay: document.getElementById('screen-play'),
  screenOver: document.getElementById('screen-over'),
  btnStart: document.getElementById('btn-start'),
  btnDaily: document.getElementById('btn-daily'),
  btnShare: document.getElementById('btn-share'),
  btnRestart: document.getElementById('btn-restart'),
  seedForm: document.getElementById('seed-form'),
  seedInput: document.getElementById('seed-input'),
  startSeedChip: document.getElementById('start-seed-chip'),
  playSeedChip: document.getElementById('play-seed-chip'),
  bestScore: document.getElementById('best-score'),
  bestContext: document.getElementById('best-context'),
  pickups: document.getElementById('pickup-count'),
  score: document.getElementById('score-count'),
  time: document.getElementById('time-count'),
  fuelValue: document.getElementById('fuel-value'),
  netValue: document.getElementById('net-value'),
  carValue: document.getElementById('car-value'),
  fuelFill: document.getElementById('fuel-fill'),
  netFill: document.getElementById('net-fill'),
  carFill: document.getElementById('car-fill'),
  status: document.getElementById('status-line'),
  endBadge: document.getElementById('end-badge'),
  endTitle: document.getElementById('end-title'),
  endSummary: document.getElementById('end-summary'),
  finalScore: document.getElementById('final-score'),
  finalPickups: document.getElementById('final-pickups'),
  finalTime: document.getElementById('final-time'),
  finalStreak: document.getElementById('final-streak'),
};

const W = canvas.width;
const H = canvas.height;
const SHIFT_SECONDS = 180;
const ROAD_LEFT = 170;
const ROAD_RIGHT = 790;
const ROAD_W = ROAD_RIGHT - ROAD_LEFT;
const LANE_COUNT = 4;
const LANE_W = ROAD_W / LANE_COUNT;
const PLAYER_W = 48;
const PLAYER_H = 76;
const NET_W = 104;
const NET_H = 50;
const BASE_SPEED = 225;
const SERVICE_REQUIRED = 0.55;
const SIDE_OBSTACLE_BUFFER = 360;

const CLEANUP_NAMES = [
  'road apples',
  'mystery lump',
  'flat fur incident',
  'county pancake',
  'shoulder surprise',
  'biological speed bump',
  'unclaimed protein',
  'asphalt lasagna',
  'curb jerky',
  'median mousse',
  'bumper tartare',
  'ditch nuggets',
  'wildlife receipt',
  'municipal meatball',
  'fur tortilla',
  'rural ravioli',
  'highway hash',
  'shoulder sashimi',
  'gravel garnish',
  'tire-kissed brisket',
];

const CLEANUP_MESSAGES = [
  '{item} bagged. The county sleeps easier.',
  'Recovered {item}. Nobody ask follow-up questions.',
  '{item} secured. Public works remains undefeated.',
  '{item} removed from the travel lane. Heroism is a weird job.',
  'Clean scoop: {item}. Put it on the invoice.',
  '{item} collected. Circle of life, but municipal.',
];

const keys = {};
let rafId = 0;
let lastTs = 0;

const state = {
  seed: dailySeed(),
  isDaily: true,
  spawnRng: mulberry32(hashSeed(`rcc-spawns-${dailySeed()}`)),
  fxRng: mulberry32(hashSeed(`rcc-fx-${dailySeed()}`)),
  running: false,
  ended: false,
  elapsed: 0,
  score: 0,
  pickups: 0,
  missed: 0,
  streak: 0,
  bestStreak: 0,
  fuel: 100,
  net: 100,
  car: 100,
  netActive: false,
  speed: BASE_SPEED,
  roadOffset: 0,
  spawnTimer: 0,
  stationBlocks: [],
  routeLog: [],
  serviceTimer: 0,
  message: 'Roll out.',
  messageUntil: 0,
  objects: [],
  particles: [],
  player: { x: W / 2, y: H - 120, vx: 0, vy: 0 },
};

function dailySeed() {
  const d = new Date();
  return `roadkill-${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function hashSeed(text) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

function mulberry32(seed) {
  return function next() {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function chaosPressure() {
  return clamp(state.elapsed / 70, 0, 1);
}

function spawnRange(min, max) {
  return min + state.spawnRng() * (max - min);
}

function spawnInt(min, max) {
  return min + Math.floor(state.spawnRng() * (max - min + 1));
}

function spawnPick(arr) {
  return arr[Math.floor(state.spawnRng() * arr.length)];
}

function fxRange(min, max) {
  return min + state.fxRng() * (max - min);
}

function fxPick(arr) {
  return arr[Math.floor(state.fxRng() * arr.length)];
}

function normalizeSeed(seed) {
  return String(seed || '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 36);
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function seedLabel() {
  if (state.isDaily) {
    return `Daily ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  }
  return `Seed ${state.seed.slice(0, 18)}`;
}

function loadSeed(seed, isDaily = false) {
  const normalized = normalizeSeed(seed) || dailySeed();
  state.seed = normalized;
  state.isDaily = isDaily || normalized === dailySeed();
  state.spawnRng = mulberry32(hashSeed(`rcc-spawns-${state.seed}`));
  state.fxRng = mulberry32(hashSeed(`rcc-fx-${state.seed}`));
  els.startSeedChip.textContent = seedLabel();
  els.playSeedChip.textContent = seedLabel();
  refreshBest();
}

function bestKey() {
  return `roadkill-cleanup-best-${state.seed}`;
}

function refreshBest() {
  const best = Number(localStorage.getItem(bestKey()) || 0);
  els.bestScore.textContent = best > 0 ? String(best) : '---';
  els.bestContext.textContent = state.isDaily ? 'Daily shift' : 'Custom seed';
}

function updateBest(score) {
  const best = Number(localStorage.getItem(bestKey()) || 0);
  if (score > best) {
    localStorage.setItem(bestKey(), String(score));
    return true;
  }
  return false;
}

function startShift() {
  cancelAnimationFrame(rafId);
  state.spawnRng = mulberry32(hashSeed(`rcc-spawns-${state.seed}`));
  state.fxRng = mulberry32(hashSeed(`rcc-fx-${state.seed}`));
  state.running = true;
  state.ended = false;
  state.elapsed = 0;
  state.score = 0;
  state.pickups = 0;
  state.missed = 0;
  state.streak = 0;
  state.bestStreak = 0;
  state.fuel = 100;
  state.net = 100;
  state.car = 100;
  state.netActive = false;
  state.speed = BASE_SPEED;
  state.roadOffset = 0;
  state.spawnTimer = 0.15;
  state.stationBlocks = [];
  state.routeLog = [];
  state.serviceTimer = 0;
  state.message = 'Roll out.';
  state.messageUntil = 1.2;
  state.objects = [];
  state.particles = [];
  state.player = { x: W / 2, y: H - 120, vx: 0, vy: 0 };
  lastTs = 0;
  showScreen('screen-play');
  updateHud();
  rafId = requestAnimationFrame(tick);
}

function tick(ts) {
  if (!state.running) return;
  if (!lastTs) lastTs = ts;
  const dt = Math.min(0.04, (ts - lastTs) / 1000);
  lastTs = ts;

  update(dt);
  draw();
  updateHud();

  if (state.running) {
    rafId = requestAnimationFrame(tick);
  }
}

function isDown(...names) {
  return names.some(name => keys[name]);
}

function update(dt) {
  state.elapsed += dt;
  const brake = isDown('ArrowDown', 's', 'S');
  const boost = isDown('ArrowUp', 'w', 'W');
  const xDir = (isDown('ArrowRight', 'd', 'D') ? 1 : 0) - (isDown('ArrowLeft', 'a', 'A') ? 1 : 0);
  const yDir = (brake ? 1 : 0) - (boost ? 1 : 0);
  const pressure = chaosPressure();

  state.speed = BASE_SPEED + state.elapsed * 4.45 + pressure * 120 + (boost ? 72 : 0) - (brake ? 128 : 0);
  state.speed = clamp(state.speed, 120, 730);
  state.roadOffset = (state.roadOffset + state.speed * dt) % 88;

  const lateralSpeed = 320 + Math.min(150, state.elapsed * 2.4);
  const verticalSpeed = 240;
  state.player.x = clamp(state.player.x + xDir * lateralSpeed * dt, ROAD_LEFT - 72, ROAD_RIGHT + 72);
  state.player.y = clamp(state.player.y + yDir * verticalSpeed * dt, 285, H - 72);

  const fuelDrain = 0.25 + state.speed / 520 + (state.netActive ? 0.16 : 0);
  state.fuel = clamp(state.fuel - fuelDrain * dt, 0, 100);

  if (state.netActive) {
    state.net = clamp(state.net - (1.45 + state.speed / 250) * dt, 0, 100);
    if (state.net <= 0) {
      state.netActive = false;
      endShift('Net Destroyed', 'The scoop achieved enlightenment and left the material plane.');
      return;
    }
  }

  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0) {
    spawnObject();
    state.spawnTimer = clamp(spawnRange(0.28, 0.58) - pressure * spawnRange(0.12, 0.31), 0.16, 0.58);
  }

  updateObjects(dt, brake);
  updateParticles(dt);

  if (state.fuel <= 0) {
    endShift('Out Of Gas', 'The city will be hearing from the procurement office.');
  } else if (state.car <= 0) {
    endShift('Truck Totaled', 'That will buff out, according to nobody.');
  } else if (state.elapsed >= SHIFT_SECONDS) {
    endShift('Shift Complete', 'You survived the contract and several questionable smells.');
  }
}

function spawnObject() {
  const pressure = chaosPressure();
  const lane = spawnInt(0, LANE_COUNT - 1);
  const x = laneCenter(lane) + spawnRange(-LANE_W * 0.23, LANE_W * 0.23);
  const roll = state.spawnRng();

  if (state.elapsed > 10 && roll < 0.09) {
    spawnBay('gas');
    return;
  }
  if (state.elapsed > 24 && roll < 0.14) {
    spawnBay('repair');
    return;
  }
  if (state.elapsed > 8 && state.spawnRng() < 0.18 + pressure * 0.24 && spawnSideObstacle()) {
    return;
  }
  const cleanupLimit = 0.51 - pressure * 0.07;
  const trafficLimit = 0.74 + pressure * 0.16;
  const debrisLimit = 0.91 + pressure * 0.05;

  if (roll < cleanupLimit) {
    state.objects.push({
      type: 'cleanup',
      x,
      y: -35,
      w: spawnRange(24, 34),
      h: spawnRange(14, 24),
      label: spawnPick(CLEANUP_NAMES),
      hit: false,
    });
    logRouteObject(state.objects[state.objects.length - 1]);
    return;
  }
  if (roll < trafficLimit) {
    state.objects.push({
      type: 'traffic',
      x,
      y: -70,
      w: state.spawnRng() < 0.22 + pressure * 0.18 ? 58 : 46,
      h: state.spawnRng() < 0.22 + pressure * 0.18 ? 98 : 72,
      color: spawnPick(['#65a9d8', '#e7c654', '#d95a52', '#d9dde3']),
      rel: spawnRange(-35, 70 + pressure * 70),
      hit: false,
    });
    logRouteObject(state.objects[state.objects.length - 1]);
    return;
  }
  if (roll < debrisLimit) {
    state.objects.push({
      type: 'debris',
      x,
      y: -35,
      w: spawnRange(26, 42),
      h: spawnRange(20, 36),
      flavor: spawnPick(['cone', 'pothole', 'trash']),
      hit: false,
    });
    logRouteObject(state.objects[state.objects.length - 1]);
    return;
  }
  state.objects.push({
    type: 'supply',
    x,
    y: -35,
    w: 30,
    h: 34,
    flavor: state.spawnRng() < 0.65 ? 'fuel' : 'net',
    hit: false,
  });
  logRouteObject(state.objects[state.objects.length - 1]);
}

function spawnBay(kind) {
  const onRight = kind === 'gas';
  const side = onRight ? 'right' : 'left';
  state.stationBlocks.push({ side, until: state.elapsed + 2.35 });
  clearStationApproach(side);
  state.objects.push({
    type: 'bay',
    kind,
    x: onRight ? ROAD_RIGHT + 66 : ROAD_LEFT - 66,
    y: -135,
    w: 116,
    h: 160,
    service: 0,
    hit: false,
  });
  logRouteObject(state.objects[state.objects.length - 1]);
}

function spawnSideObstacle() {
  const firstSide = state.spawnRng() < 0.5 ? 'left' : 'right';
  const sides = [firstSide, firstSide === 'left' ? 'right' : 'left'];
  const side = sides.find(canSpawnSideObstacle);
  if (!side) return false;

  const flavor = spawnPick(['cone', 'barrier', 'cat', 'stroller']);
  const specs = {
    cone: { w: 30, h: 38 },
    barrier: { w: 76, h: 34 },
    cat: { w: 42, h: 28 },
    stroller: { w: 50, h: 44 },
  };
  state.objects.push({
    type: 'sideObstacle',
    side,
    flavor,
    x: sideX(side) + spawnRange(-14, 14),
    y: -50,
    w: specs[flavor].w,
    h: specs[flavor].h,
    hit: false,
  });
  logRouteObject(state.objects[state.objects.length - 1]);
  return true;
}

function canSpawnSideObstacle(side) {
  state.stationBlocks = state.stationBlocks.filter(block => block.until > state.elapsed);
  return !state.stationBlocks.some(block => block.side === side);
}

function clearStationApproach(side) {
  state.objects = state.objects.filter(obj => !(
    obj.type === 'sideObstacle' &&
    obj.side === side &&
    obj.y > -SIDE_OBSTACLE_BUFFER &&
    obj.y < SIDE_OBSTACLE_BUFFER * 0.9
  ));
}

function baySide(kind) {
  return kind === 'gas' ? 'right' : 'left';
}

function sideX(side) {
  return side === 'right' ? ROAD_RIGHT + 70 : ROAD_LEFT - 70;
}

function logRouteObject(obj) {
  state.routeLog.push({
    t: Number(state.elapsed.toFixed(2)),
    type: obj.type,
    kind: obj.kind || obj.flavor || obj.label || '',
    side: obj.side || '',
    x: Number(obj.x.toFixed(1)),
  });
}

function laneCenter(lane) {
  return ROAD_LEFT + LANE_W * lane + LANE_W / 2;
}

function updateObjects(dt, brake) {
  const car = carRect();
  const net = netRect();
  const survivors = [];

  for (const obj of state.objects) {
    obj.y += (state.speed + (obj.rel || 0)) * dt;

    if (obj.type === 'bay') {
      handleBay(obj, car, brake, dt);
    } else if (!obj.hit && state.netActive && net && rectsOverlap(net, objRect(obj))) {
      handleNetHit(obj);
    } else if (!obj.hit && rectsOverlap(car, objRect(obj))) {
      handleCarHit(obj);
    }

    if (!obj.hit && obj.y < H + 130) {
      survivors.push(obj);
    } else if (!obj.hit && obj.type === 'cleanup') {
      state.missed += 1;
      state.streak = 0;
    }
  }

  state.objects = survivors;
}

function handleBay(obj, car, brake, dt) {
  if (!rectsOverlap(car, bayServiceRect(obj))) {
    obj.service = Math.max(0, obj.service - dt * 0.7);
    return;
  }
  if (!brake) {
    obj.service = Math.max(0, obj.service - dt * 0.35);
    flashMessage(`Brake in the ${obj.kind === 'gas' ? 'gas' : 'fix'} bay.`, 0.5);
    return;
  }

  const serviceRate = 1.05 + clamp(state.speed / 420, 0.35, 1.15);
  obj.service += dt * serviceRate;
  if (obj.service >= SERVICE_REQUIRED) {
    if (obj.kind === 'gas') {
      state.fuel = clamp(state.fuel + 44, 0, 100);
      addScore(25, obj.x, obj.y, 'FUEL');
      flashMessage('Gas stop counted. Extremely professional.', 1.15);
    } else {
      state.net = clamp(state.net + 38, 0, 100);
      state.car = clamp(state.car + 22, 0, 100);
      addScore(25, obj.x, obj.y, 'FIX');
      flashMessage('Field repairs complete enough.', 1.15);
    }
    obj.hit = true;
  }
}

function handleNetHit(obj) {
  if (obj.type === 'cleanup') {
    obj.hit = true;
    state.pickups += 1;
    state.streak += 1;
    state.bestStreak = Math.max(state.bestStreak, state.streak);
    state.net = clamp(state.net - 0.9, 0, 100);
    const points = 100 + Math.min(60, state.streak * 6);
    addScore(points, obj.x, obj.y, `+${obj.label}`);
    flashMessage(cleanupMessage(obj.label), 0.9);
    puff(obj.x, obj.y, '#f1c84b', 12);
    return;
  }

  if (obj.type === 'debris') {
    obj.hit = true;
    state.net = clamp(state.net - 17, 0, 100);
    state.streak = 0;
    addScore(-25, obj.x, obj.y, 'NET');
    flashMessage('The net ate road junk. Bad snack.', 0.9);
    puff(obj.x, obj.y, '#e85d4f', 10);
    return;
  }

  if (obj.type === 'supply') {
    obj.hit = true;
    applySupply(obj);
    return;
  }

  if (obj.type === 'traffic') {
    state.net = clamp(state.net - 28, 0, 100);
    state.car = clamp(state.car - 12, 0, 100);
    state.streak = 0;
    state.netActive = false;
    addScore(-40, obj.x, obj.y, 'OUCH');
    flashMessage('That was not cleanup-sized.', 0.9);
    puff(obj.x, obj.y, '#e85d4f', 14);
    return;
  }

  if (obj.type === 'sideObstacle') {
    obj.hit = true;
    state.net = clamp(state.net - sideObstacleDamage(obj).net, 0, 100);
    state.streak = 0;
    addScore(-35, obj.x, obj.y, 'NOPE');
    flashMessage(sideObstacleNetMessage(obj), 0.9);
    puff(obj.x, obj.y, '#e99b38', 12);
  }
}

function handleCarHit(obj) {
  if (obj.type === 'cleanup') {
    obj.hit = true;
    state.car = clamp(state.car - 6, 0, 100);
    state.streak = 0;
    addScore(-15, obj.x, obj.y, 'MESS');
    flashMessage('You needed the net for that.', 0.85);
    puff(obj.x, obj.y, '#8b3f2d', 10);
    return;
  }

  if (obj.type === 'traffic') {
    obj.hit = true;
    state.car = clamp(state.car - 28, 0, 100);
    state.fuel = clamp(state.fuel - 5, 0, 100);
    state.streak = 0;
    nudgePlayer(obj);
    addScore(-60, obj.x, obj.y, 'CRUNCH');
    flashMessage('Insurance has left the chat.', 1);
    puff(obj.x, obj.y, '#e85d4f', 18);
    return;
  }

  if (obj.type === 'debris') {
    obj.hit = true;
    state.car = clamp(state.car - 12, 0, 100);
    state.streak = 0;
    nudgePlayer(obj);
    addScore(-25, obj.x, obj.y, 'THUNK');
    flashMessage('Road debris: still undefeated.', 0.85);
    puff(obj.x, obj.y, '#e99b38', 12);
    return;
  }

  if (obj.type === 'supply') {
    obj.hit = true;
    applySupply(obj);
    return;
  }

  if (obj.type === 'sideObstacle') {
    obj.hit = true;
    const damage = sideObstacleDamage(obj);
    state.car = clamp(state.car - damage.car, 0, 100);
    state.fuel = clamp(state.fuel - damage.fuel, 0, 100);
    state.streak = 0;
    nudgePlayerTowardRoad(obj);
    addScore(-damage.score, obj.x, obj.y, damage.label);
    flashMessage(sideObstacleCarMessage(obj), 1);
    puff(obj.x, obj.y, damage.color, 14);
  }
}

function sideObstacleDamage(obj) {
  const table = {
    cone: { car: 9, fuel: 0, net: 10, score: 20, label: 'CONE', color: '#e99b38' },
    barrier: { car: 22, fuel: 3, net: 22, score: 45, label: 'BARRIER', color: '#e85d4f' },
    cat: { car: 5, fuel: 0, net: 12, score: 35, label: 'CAT', color: '#f1c84b' },
    stroller: { car: 18, fuel: 2, net: 20, score: 50, label: 'STROLLER', color: '#e85d4f' },
  };
  return table[obj.flavor] || table.cone;
}

function sideObstacleCarMessage(obj) {
  return {
    cone: 'Shoulder cone. Still counts as city property.',
    barrier: 'Construction barrier. The shoulder is fighting back.',
    cat: 'Stray cat panic. Nobody enjoyed that.',
    stroller: 'Abandoned stroller. Extremely cursed obstacle.',
  }[obj.flavor] || 'Shoulder obstacle. Camping denied.';
}

function sideObstacleNetMessage(obj) {
  return {
    cone: 'The net is not a cone collector.',
    barrier: 'The barrier tried to become part of the net.',
    cat: 'Do not scoop the cat.',
    stroller: 'Wrong municipal department.',
  }[obj.flavor] || 'That does not go in the cleanup net.';
}

function applySupply(obj) {
  if (obj.flavor === 'fuel') {
    state.fuel = clamp(state.fuel + 18, 0, 100);
    addScore(20, obj.x, obj.y, 'GAS');
    flashMessage(fxPick([
      'Found a gas can. The cap is optional, apparently.',
      'Emergency fuel acquired. Smells legal enough.',
      'A little roadside gasoline, as a treat.',
    ]), 0.9);
  } else {
    state.net = clamp(state.net + 16, 0, 100);
    addScore(20, obj.x, obj.y, 'PATCH');
    flashMessage(fxPick([
      'Net patch acquired. Craft services calls this tape.',
      'Mesh restored. Standards remain theoretical.',
      'Net repair kit found. Somehow not expired.',
    ]), 0.9);
  }
  puff(obj.x, obj.y, '#43c478', 10);
}

function cleanupMessage(label) {
  return fxPick(CLEANUP_MESSAGES).replace('{item}', label);
}

function nudgePlayer(obj) {
  const dir = state.player.x < obj.x ? -1 : 1;
  state.player.x = clamp(state.player.x + dir * 44, ROAD_LEFT - 72, ROAD_RIGHT + 72);
}

function nudgePlayerTowardRoad(obj) {
  const dir = obj.side === 'left' ? 1 : -1;
  state.player.x = clamp(state.player.x + dir * 64, ROAD_LEFT - 72, ROAD_RIGHT + 72);
}

function addScore(points, x, y, text) {
  state.score = Math.max(0, state.score + points);
  state.particles.push({
    x,
    y,
    text,
    color: points >= 0 ? '#f1c84b' : '#e85d4f',
    life: 0.9,
    max: 0.9,
  });
}

function flashMessage(text, duration = 1) {
  state.message = text;
  state.messageUntil = Math.max(state.messageUntil, duration);
}

function puff(x, y, color, count) {
  for (let i = 0; i < count; i += 1) {
    state.particles.push({
      x,
      y,
      vx: fxRange(-60, 60),
      vy: fxRange(-85, 25),
      r: fxRange(2, 5),
      color,
      life: fxRange(0.35, 0.8),
      max: 0.8,
    });
  }
}

function updateParticles(dt) {
  state.messageUntil = Math.max(0, state.messageUntil - dt);
  state.particles = state.particles.filter(p => {
    p.life -= dt;
    p.x += (p.vx || 0) * dt;
    p.y += (p.vy || -35) * dt;
    return p.life > 0;
  });
}

function carRect() {
  return {
    x: state.player.x - PLAYER_W / 2,
    y: state.player.y - PLAYER_H / 2,
    w: PLAYER_W,
    h: PLAYER_H,
  };
}

function netRect() {
  if (!state.netActive || state.net <= 0) return null;
  return {
    x: state.player.x - NET_W / 2,
    y: state.player.y - PLAYER_H / 2 - NET_H + 3,
    w: NET_W,
    h: NET_H,
  };
}

function objRect(obj) {
  return {
    x: obj.x - obj.w / 2,
    y: obj.y - obj.h / 2,
    w: obj.w,
    h: obj.h,
  };
}

function bayServiceRect(obj) {
  const r = objRect(obj);
  return {
    x: r.x - 18,
    y: r.y - 34,
    w: r.w + 36,
    h: r.h + 68,
  };
}

function rectsOverlap(a, b) {
  return a && b && a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function finalScore() {
  const survival = Math.floor(state.elapsed) * 2;
  const streakBonus = state.bestStreak * 12;
  const resourceBonus = Math.round((state.fuel + state.net + state.car) * 0.8);
  const completedBonus = state.elapsed >= SHIFT_SECONDS ? 450 : 0;
  return Math.max(0, state.score + survival + streakBonus + resourceBonus + completedBonus);
}

function endShift(title, summary) {
  if (state.ended) return;
  state.running = false;
  state.ended = true;
  state.netActive = false;
  const score = finalScore();
  const isBest = updateBest(score);
  refreshBest();

  els.endBadge.textContent = isBest ? 'New Best' : 'Shift Over';
  els.endTitle.textContent = title;
  els.endSummary.textContent = `${summary} Final cleanup score: ${score}.`;
  els.finalScore.textContent = String(score);
  els.finalPickups.textContent = String(state.pickups);
  els.finalTime.textContent = `${Math.floor(state.elapsed)}s`;
  els.finalStreak.textContent = String(state.bestStreak);
  showScreen('screen-over');
}

function updateHud() {
  const timeLeft = Math.max(0, Math.ceil(SHIFT_SECONDS - state.elapsed));
  els.pickups.textContent = String(state.pickups);
  els.score.textContent = String(state.score);
  els.time.textContent = String(timeLeft);
  els.fuelValue.textContent = `${Math.round(state.fuel)}%`;
  els.netValue.textContent = `${Math.round(state.net)}%`;
  els.carValue.textContent = `${Math.round(state.car)}%`;
  els.fuelFill.style.width = `${state.fuel}%`;
  els.netFill.style.width = `${state.net}%`;
  els.carFill.style.width = `${state.car}%`;
  els.status.textContent = state.messageUntil > 0 ? state.message : statusHint();
}

function statusHint() {
  if (state.fuel < 24) return 'Fuel is ugly. Find GAS and brake in the bay.';
  if (state.net < 24) return 'Net is barely holding. Find FIX or stop dragging it.';
  if (state.car < 24) return 'Truck integrity is now a rumor.';
  if (state.netActive) return 'Net deployed. Scoop clean, avoid traffic.';
  return 'Net retracted. Line up the next cleanup.';
}

function draw() {
  drawBackground();
  drawRoad();
  drawObjects();
  drawNet();
  drawTruck();
  drawParticles();
  drawVignette();
}

function drawBackground() {
  ctx.fillStyle = '#1c2a22';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#253827';
  for (let y = -40 + (state.roadOffset * 0.35) % 70; y < H + 70; y += 70) {
    ctx.fillRect(24, y, 90, 12);
    ctx.fillRect(W - 128, y + 26, 74, 10);
  }

  ctx.fillStyle = '#40382a';
  ctx.fillRect(ROAD_LEFT - 78, 0, 62, H);
  ctx.fillRect(ROAD_RIGHT + 16, 0, 62, H);
}

function drawRoad() {
  ctx.fillStyle = '#22272d';
  ctx.fillRect(ROAD_LEFT, 0, ROAD_W, H);

  const grd = ctx.createLinearGradient(ROAD_LEFT, 0, ROAD_RIGHT, 0);
  grd.addColorStop(0, 'rgba(255,255,255,0.05)');
  grd.addColorStop(0.5, 'rgba(0,0,0,0)');
  grd.addColorStop(1, 'rgba(0,0,0,0.22)');
  ctx.fillStyle = grd;
  ctx.fillRect(ROAD_LEFT, 0, ROAD_W, H);

  ctx.strokeStyle = '#f1c84b';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(ROAD_LEFT + 10, 0);
  ctx.lineTo(ROAD_LEFT + 10, H);
  ctx.moveTo(ROAD_RIGHT - 10, 0);
  ctx.lineTo(ROAD_RIGHT - 10, H);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(248,244,232,0.55)';
  ctx.lineWidth = 3;
  ctx.setLineDash([34, 28]);
  ctx.lineDashOffset = state.roadOffset;
  for (let i = 1; i < LANE_COUNT; i += 1) {
    const x = ROAD_LEFT + LANE_W * i;
    ctx.beginPath();
    ctx.moveTo(x, -80);
    ctx.lineTo(x, H + 80);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  ctx.fillStyle = 'rgba(0,0,0,0.14)';
  for (let i = 0; i < 16; i += 1) {
    const y = (i * 96 + state.roadOffset * 1.7) % (H + 120) - 90;
    const x = ROAD_LEFT + 36 + ((i * 97) % Math.floor(ROAD_W - 90));
    ctx.fillRect(x, y, 52, 4);
  }
}

function drawObjects() {
  const sorted = state.objects.slice().sort((a, b) => a.y - b.y);
  for (const obj of sorted) {
    if (obj.type === 'cleanup') drawCleanup(obj);
    else if (obj.type === 'traffic') drawTraffic(obj);
    else if (obj.type === 'debris') drawDebris(obj);
    else if (obj.type === 'sideObstacle') drawSideObstacle(obj);
    else if (obj.type === 'supply') drawSupply(obj);
    else if (obj.type === 'bay') drawBay(obj);
  }
}

function drawCleanup(obj) {
  ctx.save();
  ctx.translate(obj.x, obj.y);
  ctx.rotate(Math.sin(obj.x * 0.03) * 0.35);
  ctx.fillStyle = '#783426';
  ctx.beginPath();
  ctx.ellipse(0, 0, obj.w / 2, obj.h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#4b241d';
  ctx.beginPath();
  ctx.ellipse(-obj.w * 0.18, -1, obj.w * 0.2, obj.h * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(241,200,75,0.45)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-obj.w * 0.34, -obj.h * 0.25);
  ctx.lineTo(obj.w * 0.32, obj.h * 0.26);
  ctx.moveTo(obj.w * 0.26, -obj.h * 0.24);
  ctx.lineTo(-obj.w * 0.28, obj.h * 0.22);
  ctx.stroke();
  ctx.restore();
}

function drawTraffic(obj) {
  const r = objRect(obj);
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  roundRect(r.x + 5, r.y + 8, r.w, r.h, 8);
  ctx.fill();
  ctx.fillStyle = obj.color;
  roundRect(r.x, r.y, r.w, r.h, 7);
  ctx.fill();
  ctx.fillStyle = 'rgba(16,20,21,0.55)';
  roundRect(r.x + 8, r.y + 12, r.w - 16, 16, 4);
  ctx.fill();
  roundRect(r.x + 8, r.y + r.h - 25, r.w - 16, 14, 4);
  ctx.fill();
  ctx.fillStyle = '#f8f4e8';
  ctx.fillRect(r.x + 6, r.y + 3, 9, 5);
  ctx.fillRect(r.x + r.w - 15, r.y + 3, 9, 5);
  ctx.restore();
}

function drawDebris(obj) {
  ctx.save();
  ctx.translate(obj.x, obj.y);
  if (obj.flavor === 'cone') {
    ctx.fillStyle = '#e99b38';
    ctx.beginPath();
    ctx.moveTo(0, -obj.h / 2);
    ctx.lineTo(obj.w / 2, obj.h / 2);
    ctx.lineTo(-obj.w / 2, obj.h / 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f8f4e8';
    ctx.fillRect(-obj.w * 0.25, 0, obj.w * 0.5, 5);
  } else if (obj.flavor === 'pothole') {
    ctx.fillStyle = '#101415';
    ctx.beginPath();
    ctx.ellipse(0, 0, obj.w / 2, obj.h / 2, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#3a4048';
    ctx.lineWidth = 3;
    ctx.stroke();
  } else {
    ctx.fillStyle = '#b9c4be';
    ctx.rotate(0.5);
    ctx.fillRect(-obj.w / 2, -obj.h / 2, obj.w, obj.h);
    ctx.fillStyle = '#4fb3d8';
    ctx.fillRect(-obj.w / 3, -obj.h / 3, obj.w * 0.66, obj.h * 0.18);
  }
  ctx.restore();
}

function drawSideObstacle(obj) {
  if (obj.flavor === 'cone') {
    drawShoulderCone(obj);
  } else if (obj.flavor === 'barrier') {
    drawConstructionBarrier(obj);
  } else if (obj.flavor === 'cat') {
    drawStrayCat(obj);
  } else {
    drawStroller(obj);
  }
}

function drawShoulderCone(obj) {
  ctx.save();
  ctx.translate(obj.x, obj.y);
  ctx.fillStyle = '#e99b38';
  ctx.beginPath();
  ctx.moveTo(0, -obj.h / 2);
  ctx.lineTo(obj.w / 2, obj.h / 2);
  ctx.lineTo(-obj.w / 2, obj.h / 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f8f4e8';
  ctx.fillRect(-obj.w * 0.28, -2, obj.w * 0.56, 5);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(-obj.w * 0.6, obj.h / 2 - 5, obj.w * 1.2, 7);
  ctx.restore();
}

function drawConstructionBarrier(obj) {
  const r = objRect(obj);
  ctx.save();
  ctx.fillStyle = '#e99b38';
  roundRect(r.x, r.y, r.w, r.h, 4);
  ctx.fill();
  ctx.strokeStyle = '#f8f4e8';
  ctx.lineWidth = 6;
  for (let x = r.x + 8; x < r.x + r.w; x += 24) {
    ctx.beginPath();
    ctx.moveTo(x, r.y + r.h - 4);
    ctx.lineTo(x + 18, r.y + 4);
    ctx.stroke();
  }
  ctx.fillStyle = '#101415';
  ctx.fillRect(r.x + 6, r.y + r.h - 5, 10, 10);
  ctx.fillRect(r.x + r.w - 16, r.y + r.h - 5, 10, 10);
  ctx.restore();
}

function drawStrayCat(obj) {
  ctx.save();
  ctx.translate(obj.x, obj.y);
  ctx.fillStyle = '#111415';
  ctx.beginPath();
  ctx.ellipse(0, 2, obj.w * 0.35, obj.h * 0.34, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(obj.w * 0.28, -4, obj.h * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(obj.w * 0.18, -11);
  ctx.lineTo(obj.w * 0.25, -21);
  ctx.lineTo(obj.w * 0.32, -10);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(obj.w * 0.31, -10);
  ctx.lineTo(obj.w * 0.41, -20);
  ctx.lineTo(obj.w * 0.42, -7);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#111415';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-obj.w * 0.32, 0);
  ctx.quadraticCurveTo(-obj.w * 0.55, -12, -obj.w * 0.34, -20);
  ctx.stroke();
  ctx.fillStyle = '#f1c84b';
  ctx.fillRect(obj.w * 0.33, -7, 3, 3);
  ctx.restore();
}

function drawStroller(obj) {
  ctx.save();
  ctx.translate(obj.x, obj.y);
  ctx.strokeStyle = '#d9dde3';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-obj.w * 0.36, -obj.h * 0.26);
  ctx.lineTo(obj.w * 0.16, obj.h * 0.16);
  ctx.lineTo(obj.w * 0.35, -obj.h * 0.32);
  ctx.stroke();
  ctx.fillStyle = '#4fb3d8';
  ctx.beginPath();
  ctx.arc(0, -2, obj.w * 0.28, Math.PI, Math.PI * 2);
  ctx.lineTo(obj.w * 0.26, obj.h * 0.2);
  ctx.lineTo(-obj.w * 0.26, obj.h * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#101415';
  ctx.beginPath();
  ctx.arc(-obj.w * 0.24, obj.h * 0.28, 6, 0, Math.PI * 2);
  ctx.arc(obj.w * 0.24, obj.h * 0.28, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSupply(obj) {
  const r = objRect(obj);
  ctx.save();
  ctx.fillStyle = obj.flavor === 'fuel' ? '#43c478' : '#4fb3d8';
  roundRect(r.x, r.y, r.w, r.h, 5);
  ctx.fill();
  ctx.fillStyle = '#101415';
  ctx.fillRect(r.x + 8, r.y - 5, r.w - 16, 8);
  ctx.fillStyle = '#f8f4e8';
  ctx.font = '800 12px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(obj.flavor === 'fuel' ? 'G' : 'N', obj.x, obj.y + 5);
  ctx.restore();
}

function drawBay(obj) {
  const r = objRect(obj);
  const color = obj.kind === 'gas' ? '#43c478' : '#4fb3d8';
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  roundRect(r.x + 5, r.y + 6, r.w, r.h, 8);
  ctx.fill();
  ctx.fillStyle = color;
  roundRect(r.x, r.y, r.w, r.h, 8);
  ctx.fill();
  ctx.fillStyle = 'rgba(16,20,21,0.82)';
  roundRect(r.x + 10, r.y + 12, r.w - 20, r.h - 24, 5);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.font = '900 25px Arial Narrow, Arial';
  ctx.textAlign = 'center';
  ctx.fillText(obj.kind === 'gas' ? 'GAS' : 'FIX', obj.x, obj.y - 12);
  ctx.font = '800 12px Arial Narrow, Arial';
  ctx.fillText('BRAKE', obj.x, obj.y + 13);
  const progress = clamp(obj.service / SERVICE_REQUIRED, 0, 1);
  ctx.fillStyle = 'rgba(248,244,232,0.16)';
  ctx.fillRect(r.x + 18, r.y + r.h - 28, r.w - 36, 10);
  ctx.fillStyle = color;
  ctx.fillRect(r.x + 18, r.y + r.h - 28, (r.w - 36) * progress, 10);
  ctx.strokeStyle = '#f8f4e8';
  ctx.lineWidth = 2;
  ctx.strokeRect(r.x + 18, r.y + r.h - 28, r.w - 36, 10);
  ctx.restore();
}

function drawNet() {
  const net = netRect();
  if (!net) return;
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = '#f1c84b';
  ctx.lineWidth = 5;
  roundRect(net.x, net.y, net.w, net.h, 12);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(248,244,232,0.42)';
  ctx.lineWidth = 2;
  for (let x = net.x + 15; x < net.x + net.w; x += 18) {
    ctx.beginPath();
    ctx.moveTo(x, net.y + 6);
    ctx.lineTo(x - 14, net.y + net.h - 6);
    ctx.stroke();
  }
  for (let y = net.y + 13; y < net.y + net.h; y += 14) {
    ctx.beginPath();
    ctx.moveTo(net.x + 8, y);
    ctx.lineTo(net.x + net.w - 8, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawTruck() {
  const r = carRect();
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  roundRect(r.x + 6, r.y + 9, r.w, r.h, 8);
  ctx.fill();

  ctx.fillStyle = '#e9e3cf';
  roundRect(r.x, r.y, r.w, r.h, 8);
  ctx.fill();
  ctx.fillStyle = '#315c54';
  roundRect(r.x + 7, r.y + 8, r.w - 14, 26, 5);
  ctx.fill();
  ctx.fillStyle = '#f1c84b';
  ctx.fillRect(r.x + 8, r.y + r.h - 24, r.w - 16, 12);
  ctx.fillStyle = '#101415';
  ctx.fillRect(r.x - 5, r.y + 13, 7, 18);
  ctx.fillRect(r.x + r.w - 2, r.y + 13, 7, 18);
  ctx.fillRect(r.x - 5, r.y + r.h - 28, 7, 20);
  ctx.fillRect(r.x + r.w - 2, r.y + r.h - 28, 7, 20);
  ctx.fillStyle = '#43c478';
  ctx.font = '900 14px Arial Narrow, Arial';
  ctx.textAlign = 'center';
  ctx.fillText('RCC', state.player.x, state.player.y + 16);
  ctx.restore();
}

function drawParticles() {
  for (const p of state.particles) {
    const alpha = clamp(p.life / p.max, 0, 1);
    ctx.save();
    ctx.globalAlpha = alpha;
    if (p.text) {
      ctx.fillStyle = p.color;
      ctx.font = '900 18px Arial Narrow, Arial';
      ctx.textAlign = 'center';
      ctx.fillText(p.text, p.x, p.y);
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawVignette() {
  const grd = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, W * 0.66);
  grd.addColorStop(0, 'rgba(0,0,0,0)');
  grd.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, W, H);
}

function roundRect(x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function setNetActive(active) {
  if (!state.running) return;
  const next = active && state.net > 0;
  if (state.netActive === next) return;
  state.netActive = next;
  flashMessage(state.netActive ? 'Net deployed.' : 'Net retracted.', 0.5);
}

function shareResult() {
  const score = els.finalScore.textContent;
  const url = `${location.origin}${location.pathname}?seed=${encodeURIComponent(state.seed)}`;
  const text = [
    'Roadkill Cleanup Crew',
    `${state.isDaily ? 'Daily' : 'Seed'}: ${state.seed}`,
    `Score: ${score}`,
    `Pickups: ${state.pickups}`,
    `Survived: ${Math.floor(state.elapsed)}s`,
    url,
  ].join('\n');

  copyShareText(text).then(copied => {
    if (copied) {
      flashShareButton('Copied');
      return;
    }
    window.prompt('Copy result', text);
  });
}

function flashShareButton(label) {
  const old = els.btnShare.textContent;
  els.btnShare.textContent = label;
  setTimeout(() => { els.btnShare.textContent = old; }, 1500);
}

async function copyShareText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {
      // Fall through to the older selection-based copy path.
    }
  }

  return copyWithTextArea(text);
}

function copyWithTextArea(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  ta.style.top = '0';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  ta.setSelectionRange(0, ta.value.length);

  let copied = false;
  try {
    copied = document.execCommand && document.execCommand('copy');
  } catch (_) {
    copied = false;
  }

  document.body.removeChild(ta);
  return copied;
}

document.addEventListener('keydown', event => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Space', 'Spacebar'].includes(event.key)) {
    event.preventDefault();
  }
  if ((event.key === ' ' || event.key === 'Space' || event.key === 'Spacebar') && !event.repeat) {
    setNetActive(true);
  }
  keys[event.key] = true;
});

document.addEventListener('keyup', event => {
  if (event.key === ' ' || event.key === 'Space' || event.key === 'Spacebar') {
    event.preventDefault();
    setNetActive(false);
  }
  keys[event.key] = false;
});

els.btnStart.addEventListener('click', startShift);
els.btnRestart.addEventListener('click', startShift);
els.btnShare.addEventListener('click', shareResult);
els.btnDaily.addEventListener('click', () => {
  els.seedInput.value = '';
  loadSeed(dailySeed(), true);
});
els.seedForm.addEventListener('submit', event => {
  event.preventDefault();
  const seed = normalizeSeed(els.seedInput.value);
  if (!seed) return;
  loadSeed(seed, false);
});

(function boot() {
  const params = new URLSearchParams(location.search);
  const urlSeed = normalizeSeed(params.get('seed'));
  if (urlSeed) {
    els.seedInput.value = urlSeed;
    loadSeed(urlSeed, false);
  } else {
    loadSeed(dailySeed(), true);
  }
  refreshBest();
})();

window.roadkillCleanupCrew = {
  getState: () => ({
    seed: state.seed,
    running: state.running,
    elapsed: state.elapsed,
    cleanupScore: state.score,
    finalScore: finalScore(),
    pickups: state.pickups,
    fuel: state.fuel,
    net: state.net,
    car: state.car,
    objects: state.objects.length,
    netActive: state.netActive,
    routeLog: state.routeLog.slice(),
  }),
  start: startShift,
};
