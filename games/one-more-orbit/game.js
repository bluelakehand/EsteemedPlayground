const canvas = document.querySelector("#space");
const ctx = canvas.getContext("2d");

const els = {
  missionId: document.querySelector("#mission-id"),
  seedInput: document.querySelector("#seed-input"),
  setSeed: document.querySelector("#set-seed-btn"),
  reset: document.querySelector("#reset-btn"),
  practice: document.querySelector("#practice-btn"),
  beaconCount: document.querySelector("#beacon-count"),
  burnCount: document.querySelector("#burn-count"),
  fuelCount: document.querySelector("#fuel-count"),
  timeCount: document.querySelector("#time-count"),
  status: document.querySelector("#status"),
};

const W = canvas.width;
const H = canvas.height;
const PROBE_RADIUS = 8;
const DOCK_SPEED = 110;
const MAX_LAUNCH = 360;
const MAX_BURN = 160;
const MAX_REDIRECTS = 3;
const GRAVITY_SCALE = 6;
const TIME_LIMIT = 90;

const state = {
  seed: "",
  rand: null,
  stars: [],
  planets: [],
  beacons: [],
  station: null,
  probe: null,
  launched: false,
  aiming: false,
  aimStart: null,
  aimNow: null,
  redirects: MAX_REDIRECTS,
  burns: 0,
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
  canvas.addEventListener("pointercancel", cancelAim);
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
  state.redirects = MAX_REDIRECTS;
  state.burns = 0;
  state.elapsed = 0;
  state.lastTime = 0;
  state.won = false;
  state.lost = false;

  els.missionId.textContent = seed;
  els.seedInput.value = seed;
  els.status.textContent = "Drag from the probe to launch. Aim for every beacon before docking.";
  updateUi();
}

function createStars(rand) {
  const stars = [];
  for (let i = 0; i < 150; i += 1) {
    stars.push({
      x: randRange(rand, 0, W),
      y: randRange(rand, 0, H),
      r: randRange(rand, 0.5, 1.8),
      alpha: randRange(rand, 0.25, 0.9),
    });
  }
  return stars;
}

function createPlanets(rand) {
  const planets = [
    planetSpec(randRange(rand, 325, 440), randRange(rand, 210, 350), randRange(rand, 38, 54), randRange(rand, 165000, 230000), "#ffbd4a"),
    planetSpec(randRange(rand, 570, 720), randRange(rand, 145, 285), randRange(rand, 28, 42), randRange(rand, 105000, 155000), "#2fd7c4"),
  ];

  if (rand() > 0.45) {
    planets.push(
      planetSpec(
        randRange(rand, 510, 710),
        randRange(rand, 380, 485),
        randRange(rand, 22, 34),
        randRange(rand, 65000, 105000),
        "#e85d75"
      )
    );
  }

  return planets;
}

function planetSpec(x, y, r, mass, color) {
  return {
    x,
    y,
    r,
    mass,
    color,
    orbitRange: (r + 74) * 2,
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
  const point = pointerFromEvent(event);
  if (!point) return;

  const probePoint = { x: state.probe.x, y: state.probe.y };
  if (distance(point, probePoint) > 42) {
    els.status.textContent = "Start the drag near the probe.";
    return;
  }

  canvas.setPointerCapture(event.pointerId);
  state.aiming = true;
  state.aimStart = probePoint;
  state.aimNow = point;
}

function onPointerMove(event) {
  if (!state.aiming) return;
  const point = pointerFromEvent(event);
  if (!point) return;
  state.aimNow = point;
}

function onPointerUp(event) {
  if (!state.aiming) return;
  const point = pointerFromEvent(event);
  if (point) state.aimNow = point;
  releaseAim();
}

function cancelAim() {
  state.aiming = false;
  state.aimStart = null;
  state.aimNow = null;
}

function releaseAim() {
  if (!state.aimStart || !state.aimNow) {
    cancelAim();
    return;
  }

  const dx = state.aimStart.x - state.aimNow.x;
  const dy = state.aimStart.y - state.aimNow.y;
  const rawPower = Math.hypot(dx, dy);
  if (rawPower < 8) {
    cancelAim();
    return;
  }

  if (!state.launched) {
    const scale = Math.min(MAX_LAUNCH, rawPower * 3.1) / rawPower;
    state.probe.vx = dx * scale;
    state.probe.vy = dy * scale;
    state.launched = true;
    els.status.textContent = "Probe away. Collect the beacons, then dock slowly.";
  } else {
    const burnPower = Math.min(MAX_BURN, rawPower * 1.35);
    if (state.redirects <= 0) {
      els.status.textContent = "No redirects left. Ride the gravity wells to the station.";
      cancelAim();
      return;
    }

    const scale = burnPower / rawPower;
    state.probe.vx += dx * scale;
    state.probe.vy += dy * scale;
    state.redirects -= 1;
    state.burns += 1;
    els.status.textContent = "Redirect committed. Keep the docking speed gentle.";
  }

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
    state.elapsed += dt;
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
  state.probe.x += state.probe.vx * dt;
  state.probe.y += state.probe.vy * dt;
  state.probe.trail.push({ x: state.probe.x, y: state.probe.y });
  if (state.probe.trail.length > 220) state.probe.trail.shift();

  checkCollisions();
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
  const speed = Math.hypot(state.probe.vx, state.probe.vy);
  if (distance(state.probe, state.station) <= state.station.r + PROBE_RADIUS) {
    if (!allCollected) {
      els.status.textContent = "Docking ring found. Collect all beacons first.";
      return;
    }
    if (speed > DOCK_SPEED) {
      state.lost = true;
      els.status.textContent = "Docking approach was too fast. Slow it down next time.";
      return;
    }
    state.won = true;
    els.status.textContent = `Docked. Score ${scoreValue()} from ${state.burns} redirects in ${state.elapsed.toFixed(1)}s.`;
  }
}

function scoreValue() {
  return Math.round(state.burns * 180 + state.elapsed * 2);
}

function updateUi() {
  const collected = state.beacons.filter((beacon) => beacon.collected).length;
  els.beaconCount.textContent = `${collected} / ${state.beacons.length}`;
  els.burnCount.textContent = state.burns;
  els.fuelCount.textContent = state.redirects;
  els.timeCount.textContent = `${state.elapsed.toFixed(1)}s`;
}

function draw(time) {
  ctx.clearRect(0, 0, W, H);
  drawSpace();
  drawOrbits(time);
  drawStation(time);
  drawBeacons(time);
  drawPlanets(time);
  drawTrail();
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

function drawStation(time) {
  const station = state.station;
  const pulse = 0.8 + Math.sin(time * 0.005) * 0.1;
  ctx.strokeStyle = "#ffbd4a";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(station.x, station.y, station.r * pulse, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "rgba(255, 189, 74, 0.42)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(station.x, station.y, station.r + 17, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "#f7fbff";
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
  const dx = state.aimStart.x - state.aimNow.x;
  const dy = state.aimStart.y - state.aimNow.y;
  const power = Math.min(state.launched ? MAX_BURN : MAX_LAUNCH, Math.hypot(dx, dy) * (state.launched ? 1.35 : 3.1));
  const length = state.launched ? power * 0.95 : power * 0.55;
  const angle = Math.atan2(dy, dx);
  const endX = state.aimStart.x + Math.cos(angle) * length;
  const endY = state.aimStart.y + Math.sin(angle) * length;

  ctx.strokeStyle = state.launched ? "#e85d75" : "#ffbd4a";
  ctx.lineWidth = 4;
  ctx.setLineDash([9, 7]);
  ctx.beginPath();
  ctx.moveTo(state.aimStart.x, state.aimStart.y);
  ctx.lineTo(endX, endY);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = state.launched ? "#e85d75" : "#ffbd4a";
  ctx.beginPath();
  ctx.arc(endX, endY, 6, 0, Math.PI * 2);
  ctx.fill();
}

function drawBanner() {
  if (!state.won && !state.lost) return;
  const title = state.won ? "Docking Complete" : "Mission Failed";
  const detail = state.won
    ? `Score ${scoreValue()} | Redirects ${state.redirects} | Time ${state.elapsed.toFixed(1)}s`
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
