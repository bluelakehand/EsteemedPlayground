const canvas = document.querySelector("#space");
const ctx = canvas.getContext("2d");

const els = {
  missionId: document.querySelector("#mission-id"),
  seedInput: document.querySelector("#seed-input"),
  setSeed: document.querySelector("#set-seed-btn"),
  reset: document.querySelector("#reset-btn"),
  practice: document.querySelector("#practice-btn"),
  beaconCount: document.querySelector("#beacon-count"),
  asteroidCount: document.querySelector("#asteroid-count"),
  timeCount: document.querySelector("#time-count"),
  status: document.querySelector("#status"),
};

const W = canvas.width;
const H = canvas.height;
const PROBE_RADIUS = 8;
const MAX_LAUNCH = 180;
const GRAVITY_SCALE = 7.5;
const TIME_LIMIT = 90;
const PLANET_SIZE_SCALE = 0.5;
const ORBIT_RANGE_SCALE = 0.75;
const TETHER_DECAY_PER_SECOND = 0.99;
const TETHER_TIME_MULTIPLIER = 1.5;
const ASTEROID_RADIUS = 26;
const ASTEROID_TETHER_RANGE_SCALE = 5;
const ASTEROID_SPAWN_MIN = 2.2;
const ASTEROID_SPAWN_MAX = 4.2;

const state = {
  seed: "",
  rand: null,
  stars: [],
  planets: [],
  beacons: [],
  asteroids: [],
  station: null,
  probe: null,
  launched: false,
  aiming: false,
  aimStart: null,
  aimNow: null,
  tether: null,
  asteroidTimer: 0,
  elapsed: 0,
  lastTime: 0,
  won: false,
  lost: false,
  practiceCounter: 0,
};

function seedFromString(text) {
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
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function todayLabel() {
  return new Date().toISOString().slice(0, 10);
}

function randRange(rand, min, max) {
  return min + rand() * (max - min);
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function init() {
  buildMission(todayLabel());
  bindEvents();
  requestAnimationFrame(tick);
}

function bindEvents() {
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerCancel);
  canvas.addEventListener("contextmenu", (event) => event.preventDefault());
  els.reset.addEventListener("click", () => buildMission(state.seed));
  els.practice.addEventListener("click", () => {
    state.practiceCounter += 1;
    buildMission(`practice-${Date.now()}-${state.practiceCounter}`);
  });
  els.setSeed.addEventListener("click", applySeed);
  els.seedInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      applySeed();
    }
  });
}

function applySeed() {
  const nextSeed = els.seedInput.value.trim();
  if (!nextSeed) {
    els.status.textContent = "Seed cannot be empty.";
    return;
  }
  buildMission(nextSeed);
}

function buildMission(seed) {
  state.seed = seed;
  state.rand = createSeededRng(seed);
  state.stars = createStars(state.rand);
  state.planets = createPlanets(state.rand);
  state.beacons = createBeacons(state.rand);
  state.asteroids = [];
  state.station = createStation(state.rand);
  state.probe = {
    x: 94,
    y: H - 95,
    vx: 0,
    vy: 0,
    trail: [],
  };
  state.launched = false;
  state.aiming = false;
  state.aimStart = null;
  state.aimNow = null;
  state.tether = null;
  state.asteroidTimer = randRange(state.rand, ASTEROID_SPAWN_MIN, ASTEROID_SPAWN_MAX);
  state.elapsed = 0;
  state.lastTime = 0;
  state.won = false;
  state.lost = false;

  els.missionId.textContent = seed;
  els.seedInput.value = seed;
  els.status.textContent = "Drag anywhere to launch. Use the tether to ride gravity, collect beacons, and dock fast.";
  updateUi();
}

function createStars(rand) {
  const stars = [];
  for (let i = 0; i < 150; i += 1) {
    stars.push({
      x: randRange(rand, 0, W),
      y: randRange(rand, 0, H),
      r: randRange(rand, 0.25, 0.9),
      alpha: randRange(rand, 0.25, 0.9),
    });
  }
  return stars;
}

function createPlanets(rand) {
  const planets = [
    planetSpec(randRange(rand, 285, 395), randRange(rand, 190, 330), randRange(rand, 38, 54), randRange(rand, 165000, 230000), "#ffbd4a"),
    planetSpec(randRange(rand, 620, 780), randRange(rand, 135, 285), randRange(rand, 28, 42), randRange(rand, 105000, 155000), "#2fd7c4"),
  ];

  if (rand() > 0.45) {
    planets.push(
      planetSpec(
        randRange(rand, 535, 760),
        randRange(rand, 405, 520),
        randRange(rand, 22, 34),
        randRange(rand, 65000, 105000),
        "#e85d75"
      )
    );
  }

  return planets;
}

function planetSpec(x, y, r, mass, color) {
  const physicalRadius = r * PLANET_SIZE_SCALE;
  return {
    x,
    y,
    r: physicalRadius,
    mass,
    color,
    kind: "planet",
    orbitRange: (r + 74) * 2 * ORBIT_RANGE_SCALE,
  };
}

function createBeacons(rand) {
  const beacons = [];
  const candidates = [
    { x: randRange(rand, 210, 320), y: randRange(rand, 95, 210) },
    { x: randRange(rand, 455, 565), y: randRange(rand, 355, 500) },
    { x: randRange(rand, 735, 850), y: randRange(rand, 95, 230) },
  ];

  for (const point of candidates) {
    beacons.push({ ...point, r: 15, collected: false });
  }
  return beacons;
}

function createStation(rand) {
  return {
    x: randRange(rand, 820, 885),
    y: randRange(rand, 420, 510),
    r: 26,
  };
}

function onPointerDown(event) {
  if (state.won || state.lost) return;
  if (event.button === 2) {
    event.preventDefault();
    startTether(event, "planet");
    return;
  }
  if (event.button !== 0) return;
  if (state.launched) {
    startTether(event, "asteroid");
    return;
  }
  const point = pointerFromEvent(event);
  if (!point) return;

  canvas.setPointerCapture(event.pointerId);
  state.aiming = true;
  state.aimStart = point;
  state.aimNow = point;
}

function onPointerMove(event) {
  if (!state.aiming) return;
  const point = pointerFromEvent(event);
  if (!point) return;
  state.aimNow = point;
}

function onPointerUp(event) {
  if (state.tether && state.tether.pointerId === event.pointerId) {
    endTether();
    return;
  }
  if (!state.aiming) return;
  const point = pointerFromEvent(event);
  if (point) state.aimNow = point;
  releaseAim();
}

function onPointerCancel(event) {
  if (state.tether && state.tether.pointerId === event.pointerId) {
    endTether();
    return;
  }
  cancelAim();
}

function cancelAim() {
  state.aiming = false;
  state.aimStart = null;
  state.aimNow = null;
}

function startTether(event, targetKind) {
  if (!state.launched) {
    els.status.textContent = "Launch before using the orbit tether.";
    return;
  }
  if (state.tether) return;

  const target = nearestTetherTarget(targetKind);
  if (!target) {
    els.status.textContent = `No ${targetKind} available to tether.`;
    return;
  }
  const dx = state.probe.x - target.x;
  const dy = state.probe.y - target.y;
  const targetDistance = Math.max(Math.hypot(dx, dy), target.r + PROBE_RADIUS + 6);

  canvas.setPointerCapture(event.pointerId);
  cancelAim();
  state.tether = {
    pointerId: event.pointerId,
    target,
    targetDistance,
  };
  const buttonLabel = target.kind === "asteroid" ? "left click" : "right click";
  els.status.textContent = `Orbit tether engaged on ${target.kind}. Hold ${buttonLabel} to hold a decaying orbit.`;
  updateUi();
}

function endTether() {
  state.tether = null;
  els.status.textContent = "Orbit tether released.";
}

function releaseAim() {
  if (!state.aimStart || !state.aimNow) {
    cancelAim();
    return;
  }

  const aimVector = currentAimVector();
  const dx = aimVector.x;
  const dy = aimVector.y;
  const rawPower = Math.hypot(dx, dy);
  if (rawPower < 8) {
    cancelAim();
    return;
  }

  const scale = Math.min(MAX_LAUNCH, rawPower * 3.1) / rawPower;
  state.probe.vx = dx * scale;
  state.probe.vy = dy * scale;
  state.launched = true;
  els.status.textContent = "Probe away. Collect the beacons, dodge asteroids, then dock.";

  cancelAim();
  updateUi();
}

function pointerFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) * canvas.width) / rect.width;
  const y = ((event.clientY - rect.top) * canvas.height) / rect.height;
  if (x < 0 || x > W || y < 0 || y > H) return null;
  return { x, y };
}

function tick(time) {
  if (!state.lastTime) state.lastTime = time;
  const dt = Math.min(0.032, (time - state.lastTime) / 1000);
  state.lastTime = time;

  if (state.launched && !state.won && !state.lost) {
    stepPhysics(dt);
    state.elapsed += dt * (state.tether ? TETHER_TIME_MULTIPLIER : 1);
    if (state.elapsed >= TIME_LIMIT) {
      state.lost = true;
      els.status.textContent = "Mission timed out. Reset or try a practice seed.";
    }
    updateUi();
  }

  draw(time);
  requestAnimationFrame(tick);
}

function stepPhysics(dt) {
  let ax = 0;
  let ay = 0;

  for (const planet of state.planets) {
    const dx = planet.x - state.probe.x;
    const dy = planet.y - state.probe.y;
    const d2 = Math.max(900, dx * dx + dy * dy);
    const d = Math.sqrt(d2);
    if (d > planet.orbitRange) continue;

    const edgeFade = Math.min(1, (planet.orbitRange - d) / 42);
    const accel = (planet.mass * GRAVITY_SCALE * edgeFade) / d2;
    ax += (dx / d) * accel;
    ay += (dy / d) * accel;
  }

  state.probe.vx += ax * dt;
  state.probe.vy += ay * dt;
  updateAsteroids(dt);
  applyTether(dt);
  state.probe.x += state.probe.vx * dt;
  state.probe.y += state.probe.vy * dt;
  state.probe.trail.push({ x: state.probe.x, y: state.probe.y });
  if (state.probe.trail.length > 220) state.probe.trail.shift();

  checkCollisions();
}

function applyTether(dt) {
  if (!state.tether) return;

  const target = state.tether.target;
  const minDistance = target.r + PROBE_RADIUS + 5;
  state.tether.targetDistance = Math.max(minDistance, state.tether.targetDistance * Math.pow(TETHER_DECAY_PER_SECOND, dt));
  const dx = state.probe.x - target.x;
  const dy = state.probe.y - target.y;
  const d = Math.max(Math.hypot(dx, dy), 1);
  const nx = dx / d;
  const ny = dy / d;
  const relativeVx = state.probe.vx - (target.vx || 0);
  const relativeVy = state.probe.vy - (target.vy || 0);
  const radialVelocity = relativeVx * nx + relativeVy * ny;
  const altitudeError = d - state.tether.targetDistance;
  const targetRadialVelocity = -altitudeError * 2.4;
  const radialDelta = (targetRadialVelocity - radialVelocity) * Math.min(1, dt * 12);

  state.probe.vx += nx * radialDelta;
  state.probe.vy += ny * radialDelta;
}

function updateAsteroids(dt) {
  state.asteroidTimer -= dt;
  if (state.asteroidTimer <= 0) {
    spawnAsteroid();
    state.asteroidTimer = randRange(state.rand, ASTEROID_SPAWN_MIN, ASTEROID_SPAWN_MAX);
  }

  for (const asteroid of state.asteroids) {
    asteroid.x += asteroid.vx * dt;
    asteroid.y += asteroid.vy * dt;
    asteroid.spin += asteroid.spinSpeed * dt;
  }

  state.asteroids = state.asteroids.filter((asteroid) => (
    asteroid.x > -90 &&
    asteroid.x < W + 90 &&
    asteroid.y > -90 &&
    asteroid.y < H + 90
  ));

  if (state.tether && state.tether.target.kind === "asteroid" && !state.asteroids.includes(state.tether.target)) {
    state.tether = null;
    els.status.textContent = "Orbit tether released as the asteroid drifted away.";
  }
}

function spawnAsteroid() {
  const fromLeft = state.rand() < 0.5;
  const y = randRange(state.rand, 65, H - 65);
  const speed = randRange(state.rand, 120, 190);
  const drift = randRange(state.rand, -55, 55);
  state.asteroids.push({
    x: fromLeft ? -ASTEROID_RADIUS * 2 : W + ASTEROID_RADIUS * 2,
    y,
    vx: fromLeft ? speed : -speed,
    vy: drift,
    r: randRange(state.rand, ASTEROID_RADIUS * 0.75, ASTEROID_RADIUS * 1.25),
    kind: "asteroid",
    spin: randRange(state.rand, 0, Math.PI * 2),
    spinSpeed: randRange(state.rand, -2.4, 2.4),
  });
}

function nearestTetherTarget(kind) {
  let nearest = null;
  let nearestDistance = Infinity;

  for (const target of [...state.planets, ...state.asteroids]) {
    if (target.kind !== kind) continue;
    const d = distance(state.probe, target);
    if (kind === "asteroid" && d > target.r * ASTEROID_TETHER_RANGE_SCALE) continue;
    if (d < nearestDistance) {
      nearest = target;
      nearestDistance = d;
    }
  }

  return nearest;
}

function checkCollisions() {
  for (const planet of state.planets) {
    if (distance(state.probe, planet) <= planet.r + PROBE_RADIUS) {
      state.lost = true;
      els.status.textContent = "Probe impacted a planet. Reset for another trajectory.";
      return;
    }
  }

  if (state.probe.x < -60 || state.probe.x > W + 60 || state.probe.y < -60 || state.probe.y > H + 60) {
    state.lost = true;
    els.status.textContent = "Probe drifted out of range. Reset and use the gravity wells.";
    return;
  }

  for (const beacon of state.beacons) {
    if (!beacon.collected && distance(state.probe, beacon) <= beacon.r + PROBE_RADIUS) {
      beacon.collected = true;
      els.status.textContent = "Beacon captured.";
    }
  }

  const allCollected = state.beacons.every((beacon) => beacon.collected);
  if (distance(state.probe, state.station) <= state.station.r + PROBE_RADIUS) {
    if (!allCollected) {
      els.status.textContent = "Docking ring found. Collect all beacons first.";
      return;
    }
    state.won = true;
    els.status.textContent = `Docked in ${state.elapsed.toFixed(1)}s.`;
    return;
  }

  for (const asteroid of state.asteroids) {
    if (distance(state.probe, asteroid) <= asteroid.r + PROBE_RADIUS) {
      state.lost = true;
      state.tether = null;
      els.status.textContent = "Asteroid impact. Reset for another run.";
      return;
    }
  }
}

function updateUi() {
  const collected = state.beacons.filter((beacon) => beacon.collected).length;
  els.beaconCount.textContent = `${collected} / ${state.beacons.length}`;
  els.asteroidCount.textContent = state.asteroids.length;
  els.timeCount.textContent = `${state.elapsed.toFixed(1)}s`;
}

function draw(time) {
  ctx.clearRect(0, 0, W, H);
  drawSpace();
  drawOrbits(time);
  drawStation(time);
  drawBeacons(time);
  drawPlanets(time);
  drawAsteroids(time);
  drawTrail();
  drawTether(time);
  drawProbe(time);
  drawAim();
  drawBanner();
}

function drawSpace() {
  const gradient = ctx.createLinearGradient(0, 0, W, H);
  gradient.addColorStop(0, "#03050b");
  gradient.addColorStop(0.48, "#101019");
  gradient.addColorStop(1, "#061d21");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);

  for (const star of state.stars) {
    ctx.fillStyle = `rgba(247, 251, 255, ${star.alpha})`;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawOrbits(time) {
  ctx.save();
  ctx.lineWidth = 1;
  for (const planet of state.planets) {
    const pulse = 0.35 + Math.sin(time * 0.0015 + planet.x) * 0.08;
    ctx.strokeStyle = `rgba(47, 215, 196, ${pulse})`;
    ctx.beginPath();
    ctx.arc(planet.x, planet.y, planet.orbitRange, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPlanets(time) {
  for (const planet of state.planets) {
    const glow = ctx.createRadialGradient(planet.x, planet.y, planet.r * 0.2, planet.x, planet.y, planet.r * 2.2);
    glow.addColorStop(0, planet.color);
    glow.addColorStop(0.42, planet.color);
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(planet.x, planet.y, planet.r * 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = planet.color;
    ctx.beginPath();
    ctx.arc(planet.x, planet.y, planet.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.58)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(planet.x, planet.y, planet.r - 5 + Math.sin(time * 0.002) * 1.5, 0.2, Math.PI * 1.25);
    ctx.stroke();
  }
}

function drawBeacons(time) {
  for (const beacon of state.beacons) {
    const pulse = 1 + Math.sin(time * 0.006 + beacon.x) * 0.18;
    ctx.strokeStyle = beacon.collected ? "rgba(47, 215, 196, 0.28)" : "#2fd7c4";
    ctx.fillStyle = beacon.collected ? "rgba(47, 215, 196, 0.18)" : "rgba(47, 215, 196, 0.42)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(beacon.x, beacon.y, beacon.r * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = beacon.collected ? "#6b7786" : "#f7fbff";
    ctx.beginPath();
    ctx.arc(beacon.x, beacon.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawAsteroids(time) {
  for (const asteroid of state.asteroids) {
    ctx.save();
    ctx.strokeStyle = "rgba(190, 196, 204, 0.18)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(asteroid.x, asteroid.y, asteroid.r * ASTEROID_TETHER_RANGE_SCALE, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.translate(asteroid.x, asteroid.y);
    ctx.rotate(asteroid.spin + time * 0.0004);

    ctx.fillStyle = "#8f7f70";
    ctx.strokeStyle = "#2f2a27";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 9; i += 1) {
      const angle = (Math.PI * 2 * i) / 9;
      const radius = asteroid.r * (0.78 + ((i * 37) % 19) / 70);
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "rgba(247, 251, 255, 0.18)";
    ctx.beginPath();
    ctx.arc(-asteroid.r * 0.22, -asteroid.r * 0.28, asteroid.r * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawStation(time) {
  const station = state.station;
  const pulse = 0.8 + Math.sin(time * 0.005) * 0.1;
  ctx.strokeStyle = "#49e66b";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(station.x, station.y, station.r * pulse, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "rgba(73, 230, 107, 0.42)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(station.x, station.y, station.r + 17, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "#d9ffe1";
  ctx.fillRect(station.x - 4, station.y - 18, 8, 36);
  ctx.fillRect(station.x - 18, station.y - 4, 36, 8);
}

function drawTrail() {
  if (state.probe.trail.length < 2) return;
  ctx.lineWidth = 2;
  for (let i = 1; i < state.probe.trail.length; i += 1) {
    const a = state.probe.trail[i - 1];
    const b = state.probe.trail[i];
    ctx.strokeStyle = `rgba(232, 93, 117, ${i / state.probe.trail.length})`;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
}

function drawTether(time) {
  if (!state.tether) return;

  const target = state.tether.target;
  const actualDistance = Math.hypot(state.probe.x - target.x, state.probe.y - target.y);
  const pulse = 0.58 + Math.sin(time * 0.012) * 0.18;
  ctx.save();
  ctx.strokeStyle = `rgba(73, 230, 107, ${pulse})`;
  ctx.lineWidth = 2.5;
  ctx.setLineDash([7, 8]);
  ctx.beginPath();
  ctx.moveTo(target.x, target.y);
  ctx.lineTo(state.probe.x, state.probe.y);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle = "rgba(73, 230, 107, 0.32)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(target.x, target.y, actualDistance, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawProbe(time) {
  const probe = state.probe;
  const angle = Math.atan2(probe.vy, probe.vx);
  ctx.save();
  ctx.translate(probe.x, probe.y);
  ctx.rotate(state.launched ? angle : -0.72 + Math.sin(time * 0.002) * 0.08);

  ctx.fillStyle = "#f7fbff";
  ctx.beginPath();
  ctx.moveTo(12, 0);
  ctx.lineTo(-8, -7);
  ctx.lineTo(-4, 0);
  ctx.lineTo(-8, 7);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#252d3b";
  ctx.lineWidth = 2;
  ctx.stroke();

  if (state.launched && !state.won && !state.lost) {
    ctx.fillStyle = "rgba(255, 189, 74, 0.74)";
    ctx.beginPath();
    ctx.moveTo(-7, -4);
    ctx.lineTo(-19 - Math.sin(time * 0.03) * 4, 0);
    ctx.lineTo(-7, 4);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawAim() {
  if (!state.aiming || !state.aimStart || !state.aimNow) return;
  const aimStart = currentAimStart();
  const aimVector = currentAimVector();
  const dx = aimVector.x;
  const dy = aimVector.y;
  const power = Math.min(MAX_LAUNCH, Math.hypot(dx, dy) * 3.1);
  const length = power * 0.55;
  const angle = Math.atan2(dy, dx);
  const endX = aimStart.x + Math.cos(angle) * length;
  const endY = aimStart.y + Math.sin(angle) * length;

  ctx.strokeStyle = "#ffbd4a";
  ctx.lineWidth = 4;
  ctx.setLineDash([9, 7]);
  ctx.beginPath();
  ctx.moveTo(aimStart.x, aimStart.y);
  ctx.lineTo(endX, endY);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = "#ffbd4a";
  ctx.beginPath();
  ctx.arc(endX, endY, 6, 0, Math.PI * 2);
  ctx.fill();
}

function currentAimStart() {
  return { x: state.probe.x, y: state.probe.y };
}

function currentAimVector() {
  return {
    x: state.aimNow.x - state.aimStart.x,
    y: state.aimNow.y - state.aimStart.y,
  };
}

function drawBanner() {
  if (!state.won && !state.lost) return;
  const title = state.won ? "Docking Complete" : "Mission Failed";
  const detail = state.won
    ? `Time ${state.elapsed.toFixed(1)}s`
    : "Reset the mission or roll a practice seed.";

  const width = 430;
  const height = 96;
  const x = (W - width) * 0.5;
  const y = 22;
  ctx.fillStyle = "rgba(5, 7, 11, 0.86)";
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = state.won ? "#2fd7c4" : "#e85d75";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);
  ctx.textAlign = "center";
  ctx.fillStyle = state.won ? "#2fd7c4" : "#ffbd4a";
  ctx.font = "bold 28px Trebuchet MS, sans-serif";
  ctx.fillText(title, x + width * 0.5, y + 38);
  ctx.fillStyle = "#f7fbff";
  ctx.font = "16px Trebuchet MS, sans-serif";
  ctx.fillText(detail, x + width * 0.5, y + 68);
  ctx.textAlign = "start";
}

init();
