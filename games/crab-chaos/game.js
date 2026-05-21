'use strict';

// ── RNG ───────────────────────────────────────────────────────────────────────
function hashSeed(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function dailySeed() {
  const d = new Date();
  return `crabs-${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const NUM_CRABS         = 6;
const STARTING_BANKROLL = 100;
const BAIT_COUNT        = 6;

const CRAB_NAMES = [
  'Clawdius', 'Pinchy', 'Sir Scuttles', 'Barbara', 'The Sidewinder',
  'Chelsey', 'Nippers', 'Scuttlebutt', 'Sandy Claws', 'Crabigail',
  'Mr. Snips', 'Hermione', 'Rusty', 'The Colonel', 'Duchess',
  'Knuckles', 'Sideways Steve', 'Madam Clack', 'The Crabfather', 'Pincer Pete',
];

const BAIT_TYPES = [
  { id: 'fish',    emoji: '🐟', name: 'Fish Flakes' },
  { id: 'shrimp',  emoji: '🦐', name: 'Shrimp Bits' },
  { id: 'seaweed', emoji: '🌿', name: 'Seaweed'     },
  { id: 'pastry',  emoji: '🥐', name: 'Pastry'      },
];

// Nice racing odds — displayed as N/D, profit = stake × N/D
const NICE_ODDS = [
  { n: 1, d: 2 }, { n: 1, d: 1 }, { n: 3, d: 2 }, { n: 2, d: 1 },
  { n: 3, d: 1 }, { n: 4, d: 1 }, { n: 5, d: 1 }, { n: 6, d: 1 },
  { n: 8, d: 1 }, { n: 10, d: 1 }, { n: 12, d: 1 }, { n: 16, d: 1 },
  { n: 20, d: 1 }, { n: 25, d: 1 },
];

// ── Flavor text ───────────────────────────────────────────────────────────────
const FLAVOR = {
  fast:    [
    'Quick off the mark and knows it.',
    'Built different. Horizontally speaking.',
    'Fastest sideways shuffle in the field.',
    'Not here to take it slow.',
  ],
  steady:  [
    'A capable mover when motivated.',
    'Gets there with conviction, eventually.',
    'Won\'t embarrass itself. Probably.',
    'Consistent. Unnervingly so.',
  ],
  slow:    [
    'Has never been accused of urgency.',
    'Moves at a pace best described as reflective.',
    'Does not rush. Has never rushed. Will not rush.',
    'Arrives when it arrives.',
  ],
  focused: [
    'Moves with unsettling directness.',
    'Eerily focused for a crab.',
    'Has a plan. The plan is forward.',
    'Doesn\'t get distracted. Doesn\'t forgive distractions.',
  ],
  erratic: [
    'Known to take the scenic route.',
    'Once stopped to challenge a rock mid-race.',
    'Goes where the feeling takes it. Rarely forward.',
    'A free spirit in the worst possible context.',
    'Has strong opinions about which direction is best. Changes them frequently.',
  ],
  foodie:  [
    'Will abandon any lead for a decent snack.',
    'Deeply food-motivated. Perhaps dangerously so.',
    'Known to stop mid-race if something smells good.',
    'The stomach leads; the legs follow.',
  ],
  stoic:   [
    'Not here for the food. Here for glory.',
    'Refuses all treats. On principle.',
    'Bait-agnostic. A true professional.',
    'Cannot be bought. Cannot be fed. Focused.',
  ],
};

function pickFrom(arr, rng) {
  return arr[Math.floor(rng() * arr.length)];
}

function crabFlavor(crab, rng) {
  const lines = [];

  // Speed line
  if      (crab.speed >= 0.65) lines.push(pickFrom(FLAVOR.fast,    rng));
  else if (crab.speed <= 0.35) lines.push(pickFrom(FLAVOR.slow,    rng));
  else                          lines.push(pickFrom(FLAVOR.steady,  rng));

  // Secondary: most extreme of chaos vs bait
  const chaosExtreme = Math.abs(crab.erratic  - 0.5);
  const baitExtreme  = Math.abs(crab.baitLust - 0.5);

  if (chaosExtreme >= baitExtreme) {
    if      (crab.erratic >= 0.62) lines.push(pickFrom(FLAVOR.erratic,  rng));
    else if (crab.erratic <= 0.38) lines.push(pickFrom(FLAVOR.focused,  rng));
  } else {
    if      (crab.baitLust >= 0.62) lines.push(pickFrom(FLAVOR.foodie, rng));
    else if (crab.baitLust <= 0.38) lines.push(pickFrom(FLAVOR.stoic,  rng));
  }

  return lines.join(' ');
}

function crabTags(crab) {
  const tags = [];

  if      (crab.isFavourite)   tags.push({ label: 'Favourite',  cls: 'tag-fav' });
  else if (crab.odds.n >= 10)  tags.push({ label: 'Long Shot',  cls: 'tag-longshot' });
  else if (crab.odds.n >= 5)   tags.push({ label: 'Dark Horse', cls: 'tag-dark' });

  if      (crab.speed >= 0.65) tags.push({ label: 'Sprinter',   cls: 'tag-stat' });
  else if (crab.speed <= 0.35) tags.push({ label: 'Plodder',    cls: 'tag-stat' });

  if      (crab.erratic >= 0.65) tags.push({ label: 'Wild Card',   cls: 'tag-chaos' });
  else if (crab.erratic <= 0.3)  tags.push({ label: 'Methodical',  cls: 'tag-focus' });

  if (crab.baitLust >= 0.65)     tags.push({ label: 'Foodie',     cls: 'tag-food' });

  return tags.slice(0, 4);
}

function oddsDisplay(odds) {
  if (odds.n === 1 && odds.d === 1) return 'Evens';
  if (odds.d === 1) return `${odds.n}/1`;
  return `${odds.n}/${odds.d}`;
}

function calcPayout(stake, odds) {
  return Math.round(stake + stake * (odds.n / odds.d));
}

// ── State ─────────────────────────────────────────────────────────────────────
const state = {
  seed:     dailySeed(),
  rng:      null,
  crabs:    [],
  bait:     [],
  bankroll: STARTING_BANKROLL,
  bet:      { crabId: null, amount: 0 },
};

// ── DOM refs ──────────────────────────────────────────────────────────────────
const els = {
  bestReturn:    document.getElementById('best-return'),
  streakDisplay: document.getElementById('streak-display'),
  btnViewField:  document.getElementById('btn-view-field'),
  seedForm:      document.getElementById('seed-form'),
  seedInput:     document.getElementById('seed-input'),
  btnDaily:      document.getElementById('btn-daily'),
  raceBadge:     document.getElementById('race-badge'),
  runnerGrid:    document.getElementById('runner-grid'),
  baitIcons:     document.getElementById('bait-icons'),
  bankrollDisplay: document.getElementById('bankroll-display'),
  betEmpty:      document.getElementById('bet-empty'),
  betActive:     document.getElementById('bet-active'),
  betCrabLabel:  document.getElementById('bet-crab-label'),
  betInput:      document.getElementById('bet-input'),
  betPayout:     document.getElementById('bet-payout'),
  btnRelease:    document.getElementById('btn-release'),
};

// ── Screen switching ──────────────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ── Seed handling ─────────────────────────────────────────────────────────────
function flashSeedLoaded() {
  const card = document.querySelector('.stat-card');
  card.style.transition = 'border-color 0.1s';
  card.style.borderColor = 'var(--amber)';
  setTimeout(() => { card.style.borderColor = ''; card.style.transition = ''; }, 600);
}

function flashButton(btn, msg, ms = 1500) {
  const orig = btn.textContent;
  btn.textContent = msg;
  btn.disabled = true;
  setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, ms);
}

function loadSeed(seed) {
  state.seed = seed;
  state.rng  = mulberry32(hashSeed(seed));
  flashSeedLoaded();
}

els.btnDaily.addEventListener('click', () => {
  loadSeed(dailySeed());
  els.seedInput.value = '';
  flashButton(els.btnDaily, '✓ Loaded');
});

els.seedForm.addEventListener('submit', e => {
  e.preventDefault();
  const val = els.seedInput.value.trim();
  if (!val) return;
  loadSeed(val);
  flashButton(els.seedForm.querySelector('[type="submit"]'), '✓ Loaded');
});

// ── Crab generation ───────────────────────────────────────────────────────────
function generateCrabs() {
  const rng = mulberry32(hashSeed(state.seed + '-crabs'));

  // Shuffle names, take NUM_CRABS
  const names = [...CRAB_NAMES];
  for (let i = names.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [names[i], names[j]] = [names[j], names[i]];
  }

  state.crabs = names.slice(0, NUM_CRABS).map((name, i) => {
    const speed    = 0.15 + rng() * 0.85;
    const erratic  = rng();
    const focus    = 0.15 + rng() * 0.85;
    const baitLust = rng();
    const baitPrefs = Object.fromEntries(BAIT_TYPES.map(b => [b.id, rng()]));

    // Race score: higher = stronger favourite
    const raceScore = speed * 0.55 + focus * 0.25 + (1 - erratic) * 0.2;

    const crab = { id: i, name, speed, erratic, focus, baitLust, baitPrefs, raceScore, isFavourite: false };
    crab.flavor = crabFlavor(crab, rng);
    return crab;
  });

  // Assign odds
  const total = state.crabs.reduce((s, c) => s + c.raceScore, 0);
  state.crabs.forEach(crab => {
    const prob      = crab.raceScore / total;
    const profitRaw = (1 / prob) - 1;
    crab.odds = NICE_ODDS.reduce((best, o) =>
      Math.abs(o.n / o.d - profitRaw) < Math.abs(best.n / best.d - profitRaw) ? o : best
    );
  });

  // Mark favourite (lowest odds = most likely)
  const fav = state.crabs.reduce((a, b) =>
    (a.odds.n / a.odds.d) < (b.odds.n / b.odds.d) ? a : b
  );
  fav.isFavourite = true;

  // Generate tags after favourite is known
  state.crabs.forEach(c => { c.tags = crabTags(c); });
}

function generateBait() {
  const rng = mulberry32(hashSeed(state.seed + '-bait'));
  state.bait = Array.from({ length: BAIT_COUNT }, () => {
    return { ...BAIT_TYPES[Math.floor(rng() * BAIT_TYPES.length)] };
  });
}

// ── Render field ──────────────────────────────────────────────────────────────
function renderRunnerGrid() {
  els.runnerGrid.innerHTML = state.crabs.map(crab => {
    const tagsHtml = crab.tags.map(t =>
      `<span class="tag ${t.cls}">${t.label}</span>`
    ).join('');

    return `
      <div class="runner-card${crab.isFavourite ? ' is-favourite' : ''}" data-id="${crab.id}" id="runner-${crab.id}">
        <div class="runner-number">#${crab.id + 1}</div>
        <div class="runner-info">
          <div class="runner-name">${crab.name}</div>
          <div class="runner-flavor">${crab.flavor}</div>
          <div class="runner-tags">${tagsHtml}</div>
        </div>
        <div class="runner-right">
          <div class="runner-odds">${oddsDisplay(crab.odds)}</div>
          <button class="btn-pick" data-id="${crab.id}">${state.bet.crabId === crab.id ? '✓ Picked' : 'Pick'}</button>
        </div>
      </div>`;
  }).join('');

  // Wire pick buttons
  els.runnerGrid.querySelectorAll('.btn-pick').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      selectCrab(parseInt(btn.dataset.id));
    });
  });

  els.runnerGrid.querySelectorAll('.runner-card').forEach(card => {
    card.addEventListener('click', () => selectCrab(parseInt(card.dataset.id)));
  });
}

function renderBaitBar() {
  els.baitIcons.innerHTML = state.bait.map(b =>
    `<span title="${b.name}">${b.emoji}</span>`
  ).join('');
}

// ── Bet UI ────────────────────────────────────────────────────────────────────
function selectCrab(id) {
  state.bet.crabId = id;
  state.bet.amount = 0;

  // Update card highlight + button text
  document.querySelectorAll('.runner-card').forEach(card => {
    const isSelected = parseInt(card.dataset.id) === id;
    card.classList.toggle('selected', isSelected);
    card.querySelector('.btn-pick').textContent = isSelected ? '✓ Picked' : 'Pick';
  });

  // Show bet controls
  const crab = state.crabs[id];
  els.betEmpty.style.display   = 'none';
  els.betActive.classList.remove('hidden');
  els.betCrabLabel.textContent = `${crab.name}  ·  ${oddsDisplay(crab.odds)}`;

  // Reset quick buttons
  document.querySelectorAll('.btn-quick').forEach(b => b.classList.remove('active'));
  els.betInput.value = '';
  updateBetPayout();
}

function setAmount(amount) {
  const capped = Math.min(amount, state.bankroll);
  state.bet.amount = capped;
  els.betInput.value = capped;

  document.querySelectorAll('.btn-quick').forEach(btn => {
    const val = btn.dataset.amount === 'all' ? state.bankroll : parseInt(btn.dataset.amount);
    btn.classList.toggle('active', val === capped);
  });

  updateBetPayout();
}

function updateBetPayout() {
  const { crabId, amount } = state.bet;
  if (!amount || amount <= 0 || crabId === null) {
    els.betPayout.textContent = 'Choose an amount above';
    els.betPayout.classList.remove('has-value');
    els.btnRelease.disabled = true;
    return;
  }
  const crab   = state.crabs[crabId];
  const payout = calcPayout(amount, crab.odds);
  els.betPayout.textContent = `Win: $${payout}  (profit: +$${payout - amount})`;
  els.betPayout.classList.add('has-value');
  els.btnRelease.disabled = false;
}

// Quick bet buttons
document.querySelectorAll('.btn-quick').forEach(btn => {
  btn.addEventListener('click', () => {
    const amount = btn.dataset.amount === 'all' ? state.bankroll : parseInt(btn.dataset.amount);
    setAmount(amount);
  });
});

// Manual input
els.betInput.addEventListener('input', () => {
  const val = parseInt(els.betInput.value) || 0;
  state.bet.amount = Math.min(val, state.bankroll);
  document.querySelectorAll('.btn-quick').forEach(b => b.classList.remove('active'));
  updateBetPayout();
});

// ── localStorage ──────────────────────────────────────────────────────────────
const STORAGE_KEY = 'crab-chaos-stats';

function loadStats() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
}

function refreshStatCard() {
  const stats = loadStats();
  els.bestReturn.textContent = stats.bestWin != null ? `+$${stats.bestWin}` : '—';
  els.streakDisplay.textContent = `Streak: ${stats.streak || 0}`;
}

// ── Start ─────────────────────────────────────────────────────────────────────
els.btnViewField.addEventListener('click', () => {
  generateCrabs();
  generateBait();
  state.bankroll     = STARTING_BANKROLL;
  state.bet.crabId   = null;
  state.bet.amount   = 0;
  els.bankrollDisplay.textContent = `$${state.bankroll}`;
  els.raceBadge.textContent = `Today's Field · ${state.seed}`;
  renderRunnerGrid();
  renderBaitBar();
  showScreen('screen-paddock');
});

els.btnRelease.addEventListener('click', () => {
  showScreen('screen-race');
  initRaceScreen();
});

// ── Race constants ────────────────────────────────────────────────────────────
const CANVAS_W  = 880;
const CANVAS_H  = 480;
const START_X   = 85;
const FINISH_X  = 800;
const TRACK_TOP = 38;
const TRACK_BOT = 442;
const CRAB_R    = 18;
const CRAB_FONT = '26px "Apple Color Emoji","Segoe UI Emoji",serif';
const BAIT_FONT = '20px "Apple Color Emoji","Segoe UI Emoji",serif';
const PLACE_LABELS = ['1st','2nd','3rd','4th','5th','6th'];

// ── Race state ────────────────────────────────────────────────────────────────
let raceObstacles  = [];
let sandGrains     = [];
let raceRunners    = [];
let raceActiveBait = [];
let baitInventory  = [];
let finishOrder    = [];
let racePhase      = 'idle';
let raceFrameId    = null;
let raceStartMs    = 0;
let countdownVal   = 3;
let lastTs         = 0;

// ── Arena generation ──────────────────────────────────────────────────────────
function generateArena() {
  const rng = mulberry32(hashSeed(state.seed + '-arena'));
  raceObstacles = [];
  sandGrains    = [];

  // Rocks
  const nRocks = 5 + Math.floor(rng() * 4);
  for (let i = 0; i < nRocks; i++) {
    raceObstacles.push({
      type: 'rock',
      x: START_X + 70 + rng() * (FINISH_X - START_X - 140),
      y: TRACK_TOP + 10 + rng() * (TRACK_BOT - TRACK_TOP - 20),
      r: 14 + rng() * 20,
    });
  }

  // Tide pools
  const nPools = 2 + Math.floor(rng() * 3);
  for (let i = 0; i < nPools; i++) {
    raceObstacles.push({
      type: 'pool',
      x: START_X + 60 + rng() * (FINISH_X - START_X - 120),
      y: TRACK_TOP + 10 + rng() * (TRACK_BOT - TRACK_TOP - 20),
      r: 28 + rng() * 40,
    });
  }

  // Sand grain texture (pre-seeded, fixed each frame)
  for (let i = 0; i < 180; i++) {
    sandGrains.push({ x: rng() * CANVAS_W, y: rng() * CANVAS_H, r: 0.8 + rng() * 1.4 });
  }
}

// ── Init runners ──────────────────────────────────────────────────────────────
function initRunners() {
  const laneH = (TRACK_BOT - TRACK_TOP) / NUM_CRABS;
  raceRunners = state.crabs.map((crab, i) => {
    const laneY = TRACK_TOP + laneH * i + laneH / 2;
    return {
      ...crab,
      x: START_X - 5,
      y: laneY,
      laneY,
      vx: 0,
      vy: 0,
      angle: 0,
      slowMult: 1,
      finished: false,
      finishTime: null,
      place: null,
    };
  });
}

// ── Tick ─────────────────────────────────────────────────────────────────────
function tickRunners(dt) {
  raceRunners.forEach(r => { if (!r.finished) r.slowMult = 1; });

  raceRunners.forEach(runner => {
    if (runner.finished) return;

    const baseSpeed = 50 + runner.speed * 95; // 50–145 px/s

    // Steer: forward drive + soft lane-keep
    const toFinish = FINISH_X - runner.x;
    const toLane   = runner.laneY - runner.y;
    const mag      = Math.sqrt(toFinish * toFinish + toLane * toLane) || 1;
    let fx = (toFinish / mag) * 1.5;
    let fy = (toLane   / mag) * 0.35;

    // Chaos jitter
    fx += (Math.random() - 0.5) * runner.erratic * 2.4;
    fy += (Math.random() - 0.5) * runner.erratic * 2.4;

    // Bait attraction
    const detectR = 55 + runner.baitLust * 110;
    raceActiveBait.forEach(bait => {
      if (!bait.placed || bait.eaten) return;
      const bdx = bait.x - runner.x;
      const bdy = bait.y - runner.y;
      const bd  = Math.sqrt(bdx * bdx + bdy * bdy);
      if (bd < detectR) {
        const pref = (runner.baitPrefs[bait.id] || 0.3) * runner.baitLust;
        const pull = pref * (1 - bd / detectR) * 3.8;
        fx += (bdx / bd) * pull;
        fy += (bdy / bd) * pull;
        if (bd < CRAB_R + 12) { bait.eaten = true; bait.eatMs = performance.now(); }
      }
    });

    // Rock repulsion
    raceObstacles.forEach(obs => {
      const dx = runner.x - obs.x;
      const dy = runner.y - obs.y;
      const d  = Math.sqrt(dx * dx + dy * dy);
      if (obs.type === 'rock' && d < obs.r + CRAB_R + 8 && d > 0) {
        const push = (obs.r + CRAB_R + 8 - d) / (obs.r + CRAB_R + 8);
        fx += (dx / d) * push * 5;
        fy += (dy / d) * push * 5;
      } else if (obs.type === 'pool' && d < obs.r) {
        runner.slowMult = 0.42;
      }
    });

    // Crab separation
    raceRunners.forEach(other => {
      if (other.id === runner.id) return;
      const dx = runner.x - other.x;
      const dy = runner.y - other.y;
      const d  = Math.sqrt(dx * dx + dy * dy);
      if (d < CRAB_R * 2.5 && d > 0) {
        const push = (CRAB_R * 2.5 - d) / (CRAB_R * 2.5);
        fx += (dx / d) * push * 2.5;
        fy += (dy / d) * push * 2.5;
      }
    });

    // Blend velocity (inertia)
    const speed = baseSpeed * runner.slowMult;
    const fmag  = Math.sqrt(fx * fx + fy * fy) || 1;
    runner.vx = runner.vx * 0.68 + (fx / fmag) * speed * 0.32;
    runner.vy = runner.vy * 0.68 + (fy / fmag) * speed * 0.32;

    runner.x += runner.vx * dt;
    runner.y += runner.vy * dt;

    runner.x = Math.max(START_X - 12, Math.min(FINISH_X + 35, runner.x));
    runner.y = Math.max(TRACK_TOP + CRAB_R, Math.min(TRACK_BOT - CRAB_R, runner.y));

    if (Math.abs(runner.vx) > 1.5 || Math.abs(runner.vy) > 1.5) {
      runner.angle = Math.atan2(runner.vy, runner.vx);
    }

    if (runner.x >= FINISH_X && !runner.finished) {
      runner.finished  = true;
      runner.finishTime = performance.now() - raceStartMs;
      runner.place = finishOrder.length + 1;
      finishOrder.push(runner.id);
      updatePositionBar();
    }
  });

  return finishOrder.length >= NUM_CRABS;
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawFrame(ctx, now) {
  // Sandy background
  ctx.fillStyle = '#c99845';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Sand texture
  ctx.fillStyle = 'rgba(0,0,0,0.1)';
  sandGrains.forEach(g => {
    ctx.beginPath();
    ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2);
    ctx.fill();
  });

  // Tide pools
  raceObstacles.filter(o => o.type === 'pool').forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(30,110,190,0.32)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(30,110,190,0.55)';
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  // Rocks
  raceObstacles.filter(o => o.type === 'rock').forEach(r => {
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
    ctx.fillStyle = '#5a3c18';
    ctx.fill();
    ctx.strokeStyle = '#3a2008';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(r.x - r.r * 0.28, r.y - r.r * 0.28, r.r * 0.32, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fill();
  });

  // Start line
  ctx.strokeStyle = 'rgba(232,120,30,0.9)';
  ctx.lineWidth = 4;
  ctx.setLineDash([7, 4]);
  ctx.beginPath();
  ctx.moveTo(START_X, TRACK_TOP - 8);
  ctx.lineTo(START_X, TRACK_BOT + 8);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#e87820';
  ctx.font = 'bold 11px "Arial Narrow",Arial,sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('START', START_X, TRACK_TOP - 10);

  // Finish line (checkered)
  const sqH = 20;
  for (let i = 0; i * sqH < CANVAS_H + sqH; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#fff' : '#111';
    ctx.fillRect(FINISH_X - 7, i * sqH, 14, sqH);
  }
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px "Arial Narrow",Arial,sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('FINISH', FINISH_X, TRACK_TOP - 10);

  // Bait items
  raceActiveBait.forEach(bait => {
    if (!bait.placed) return;
    let alpha = 1;
    if (bait.eaten) {
      const age = now - (bait.eatMs || now);
      if (age > 500) return;
      alpha = 1 - age / 500;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `${20 + age / 25}px "Apple Color Emoji","Segoe UI Emoji",serif`;
    } else {
      ctx.font = BAIT_FONT;
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(bait.emoji, bait.x, bait.y);
    if (bait.eaten) ctx.restore();

    // Throw splash ring
    if (!bait.eaten && bait.throwMs) {
      const age = now - bait.throwMs;
      if (age < 400) {
        const prog = age / 400;
        ctx.beginPath();
        ctx.arc(bait.x, bait.y, 10 + prog * 25, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(232,120,30,${0.6 * (1 - prog)})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  });

  // Crabs
  raceRunners.forEach(runner => {
    const isBet = runner.id === state.bet.crabId;

    ctx.save();
    ctx.translate(runner.x, runner.y);
    ctx.rotate(runner.angle);

    // Tide pool slow indicator
    if (runner.slowMult < 0.9) {
      ctx.beginPath();
      ctx.arc(0, 0, CRAB_R + 5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(30,110,190,0.35)';
      ctx.fill();
    }

    // Bet crab highlight ring
    if (isBet) {
      ctx.beginPath();
      ctx.arc(0, 0, CRAB_R + 6, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(232,120,30,0.7)';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    ctx.font = CRAB_FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🦀', 0, 0);
    ctx.restore();

    // Name label (above crab, unrotated)
    ctx.font = `${isBet ? 'bold ' : ''}10px "Arial Narrow",Arial,sans-serif`;
    ctx.fillStyle = isBet ? '#e87820' : 'rgba(0,0,0,0.65)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(runner.name.toUpperCase(), runner.x, runner.y - CRAB_R - 3);

    // Place label below when finished
    if (runner.finished) {
      ctx.font = 'bold 10px "Arial Narrow",Arial,sans-serif';
      ctx.fillStyle = runner.place === 1 ? '#e87820' : 'rgba(0,0,0,0.5)';
      ctx.textBaseline = 'top';
      ctx.fillText(PLACE_LABELS[runner.place - 1], runner.x, runner.y + CRAB_R + 3);
    }
  });

  // Countdown overlay
  if (racePhase === 'countdown') {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.font = 'bold 110px "Arial Narrow",Arial,sans-serif';
    ctx.fillStyle = countdownVal === 0 ? '#4ade80' : '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(countdownVal === 0 ? 'GO!' : String(countdownVal), CANVAS_W / 2, CANVAS_H / 2);
  }

  // Winner overlay
  if (racePhase === 'done' && finishOrder.length > 0) {
    const winner = raceRunners.find(r => r.id === finishOrder[0]);
    const isWin  = finishOrder[0] === state.bet.crabId;
    ctx.fillStyle = isWin ? 'rgba(0,40,15,0.78)' : 'rgba(40,0,0,0.78)';
    ctx.fillRect(0, CANVAS_H / 2 - 64, CANVAS_W, 128);
    ctx.font = 'bold 42px "Arial Narrow",Arial,sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`🦀  ${winner.name.toUpperCase()}  WINS!`, CANVAS_W / 2, CANVAS_H / 2 - 16);
    ctx.font = '20px Georgia,serif';
    ctx.fillStyle = isWin ? '#4ade80' : '#f87171';
    const betCrab = state.crabs[state.bet.crabId];
    ctx.fillText(
      isWin ? 'Your pick! Heading to the cashier…' : `You had ${betCrab.name}. Better luck tomorrow.`,
      CANVAS_W / 2, CANVAS_H / 2 + 26
    );
  }
}

// ── Race loop ─────────────────────────────────────────────────────────────────
function raceLoop(ts) {
  const dt = Math.min((ts - lastTs) / 1000, 0.05);
  lastTs = ts;

  const ctx = document.getElementById('canvas-race').getContext('2d');
  drawFrame(ctx, ts);

  if (racePhase === 'racing') {
    const done = tickRunners(dt);
    updateLeaderBadge();
    if (done) {
      racePhase = 'done';
      drawFrame(ctx, ts);
      setTimeout(buildResultScreen, 2800);
    } else {
      raceFrameId = requestAnimationFrame(raceLoop);
    }
  } else if (racePhase !== 'done') {
    raceFrameId = requestAnimationFrame(raceLoop);
  }
}

// ── Countdown ─────────────────────────────────────────────────────────────────
function startCountdown() {
  racePhase    = 'countdown';
  countdownVal = 3;
  lastTs       = performance.now();
  raceFrameId  = requestAnimationFrame(raceLoop);

  const tick = () => {
    countdownVal--;
    if (countdownVal < 0) {
      racePhase   = 'racing';
      raceStartMs = performance.now();
      document.getElementById('race-status-badge').textContent = 'Racing';
      document.getElementById('race-hint').textContent =
        `Click track to throw bait (${baitInventory.length} left)`;
    } else {
      setTimeout(tick, 1000);
    }
  };
  setTimeout(tick, 1000);
}

// ── Bait throwing ─────────────────────────────────────────────────────────────
function throwBait(clientX, clientY) {
  if (racePhase !== 'racing') return;
  if (baitInventory.length === 0) return;

  const canvas = document.getElementById('canvas-race');
  const rect   = canvas.getBoundingClientRect();
  const x = (clientX - rect.left)  * (CANVAS_W / rect.width);
  const y = (clientY - rect.top)   * (CANVAS_H / rect.height);

  const bait = baitInventory.shift();
  raceActiveBait.push({ ...bait, placed: true, x, y, eaten: false, throwMs: performance.now() });
  updateBaitHUD();
}

document.getElementById('canvas-race').addEventListener('click', e => {
  throwBait(e.clientX, e.clientY);
});
document.getElementById('canvas-race').addEventListener('touchstart', e => {
  e.preventDefault();
  throwBait(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: false });

// ── HUD updates ───────────────────────────────────────────────────────────────
function updateBaitHUD() {
  const hud = document.getElementById('bait-hud');
  if (baitInventory.length === 0) {
    hud.innerHTML = '<span class="bait-empty-msg">No bait left</span>';
  } else {
    hud.innerHTML = baitInventory.map(b =>
      `<span class="bait-piece" title="${b.name}">${b.emoji}</span>`
    ).join('');
  }
  const hint = document.getElementById('race-hint');
  if (racePhase === 'racing') {
    hint.textContent = baitInventory.length > 0
      ? `Click track to throw bait (${baitInventory.length} left)`
      : 'No bait remaining — good luck';
  }
}

function updatePositionBar() {
  const bar = document.getElementById('race-positions');
  bar.innerHTML = finishOrder.map((id, i) => {
    const r = raceRunners.find(r => r.id === id);
    const isBet = id === state.bet.crabId;
    return `<span class="position-chip${isBet ? ' bet-crab' : ''}">${PLACE_LABELS[i]} ${r.name}</span>`;
  }).join('');
}

function updateLeaderBadge() {
  const leading = raceRunners
    .filter(r => !r.finished)
    .sort((a, b) => b.x - a.x)[0];
  const badge = document.getElementById('race-status-badge');
  if (leading) badge.textContent = `Leading: ${leading.name}`;
}

// ── Init race screen ──────────────────────────────────────────────────────────
function initRaceScreen() {
  if (raceFrameId) { cancelAnimationFrame(raceFrameId); raceFrameId = null; }
  finishOrder    = [];
  raceActiveBait = [];
  racePhase      = 'idle';

  generateArena();
  initRunners();
  baitInventory  = [...state.bait];

  // Initial bait HUD
  const hud = document.getElementById('bait-hud');
  hud.innerHTML = baitInventory.map(b =>
    `<span class="bait-piece" title="${b.name}">${b.emoji}</span>`
  ).join('');

  document.getElementById('race-positions').innerHTML = '';
  document.getElementById('race-status-badge').textContent = 'Get Ready';
  document.getElementById('race-hint').textContent = 'Race starting…';

  // Draw initial frame then kick off countdown
  const ctx = document.getElementById('canvas-race').getContext('2d');
  lastTs = performance.now();
  drawFrame(ctx, lastTs);
  setTimeout(startCountdown, 300);
}

// ── Result screen ────────────────────────────────────────────────────────────
const ROAST = {
  winLong: [
    'You had the vision. The madman\'s vision.',
    'Long shot comes in. The bookie weeps. You win.',
    'That was either genius or luck. We choose not to find out which.',
    'Science cannot explain this. Neither can you. You win anyway.',
  ],
  winDark: [
    'A contrarian pick that paid off. Enjoy it.',
    'Good read of the field. Sharp work.',
    'They said you were wrong. They were wrong about that.',
    'The odds disagreed with you. The crabs did not.',
  ],
  winFav: [
    'Safe pick, full pockets. Respectable.',
    'Betting the favourite is not a personality. But it worked.',
    'Conservative. Calculated. Correct.',
    'No drama, full profit. A clean day\'s work.',
  ],
  lossSecond: [
    'Second place. You are owed nothing by this world.',
    'The bait was so close. The crab was so close. The money was not.',
    'If only the finish line were a metre to the left.',
    'Second is the first loser. Today, that\'s you.',
  ],
  lossFav: [
    'The favourite collapsed. Classic.',
    'You picked the favourite. The favourite did not pick you back.',
    'Safe bet, unsafe crab. A tale as old as time.',
    'Sometimes the favourite is just a more popular way to lose.',
  ],
  lossMid: [
    'Mid-table mediocrity. The most painful kind of loss.',
    'Not last. Just not close. Just not good enough.',
    'They had every opportunity. They took none of them.',
    'A committed performance in the wrong direction.',
  ],
  lossLast: [
    'Dead last. A historic achievement in the wrong direction.',
    'Your crab finished the race. Eventually. Technically.',
    'There\'s bravery in finishing last. Your crab has that in abundance.',
    'Last place. They gave it everything. Everything was not enough.',
  ],
};

function resultRoast(isWin, betCrab, place) {
  if (isWin) {
    const ratio = betCrab.odds.n / betCrab.odds.d;
    if (ratio >= 8)  return pickFrom(ROAST.winLong, Math.random);
    if (ratio >= 4)  return pickFrom(ROAST.winDark, Math.random);
    return pickFrom(ROAST.winFav, Math.random);
  }
  if (place === 2)             return pickFrom(ROAST.lossSecond, Math.random);
  if (place >= 5)              return pickFrom(ROAST.lossLast,   Math.random);
  if (betCrab.isFavourite)     return pickFrom(ROAST.lossFav,    Math.random);
  return pickFrom(ROAST.lossMid, Math.random);
}

function buildResultScreen() {
  const winnerId  = finishOrder[0];
  const isWin     = winnerId === state.bet.crabId;
  const betCrab   = state.crabs[state.bet.crabId];
  const winner    = state.crabs[winnerId];
  const betAmt    = state.bet.amount;
  const betPlace  = finishOrder.indexOf(state.bet.crabId) + 1;

  const payout = isWin ? calcPayout(betAmt, betCrab.odds) : 0;
  const profit = payout - betAmt;

  // Roast
  document.getElementById('result-badge').textContent = isWin ? '🏆 Winner!' : '💸 Tough Luck';
  document.getElementById('result-roast').textContent = resultRoast(isWin, betCrab, betPlace);

  // Hero block
  const heroEl = document.getElementById('result-hero');
  heroEl.innerHTML = `
    <p class="result-winner-name ${isWin ? 'win' : 'loss'}">
      🦀 ${winner.name.toUpperCase()} WINS
    </p>
    <p class="result-payout ${isWin ? 'win' : 'loss'}">
      ${isWin ? `+$${profit}` : `-$${betAmt}`}
    </p>
    <p class="result-payout-sub">
      ${isWin
        ? `$${betAmt} on ${betCrab.name} (${oddsDisplay(betCrab.odds)}) returned $${payout}`
        : `$${betAmt} on ${betCrab.name} (${oddsDisplay(betCrab.odds)}) — finished ${PLACE_LABELS[betPlace - 1]}`
      }
    </p>`;

  // Finish order chips
  document.getElementById('result-order').innerHTML = finishOrder.map((id, i) => {
    const crab   = state.crabs[id];
    const isFirst = i === 0;
    const isBet  = id === state.bet.crabId;
    return `
      <div class="result-chip${isFirst ? ' first-place' : ''}${isBet ? ' bet-crab' : ''}">
        <span class="chip-place">${PLACE_LABELS[i]}</span>
        <span class="chip-name">${crab.name}</span>
        <span class="chip-odds">${oddsDisplay(crab.odds)}</span>
      </div>`;
  }).join('');

  // Persist stats
  persistStats(isWin, profit);

  showScreen('screen-result');
}

function persistStats(isWin, profit) {
  const stats    = loadStats();
  const today    = state.seed;
  const lastSeed = stats.lastSeed || '';
  const streak   = stats.streak  || 0;

  if (isWin) {
    stats.bestWin  = Math.max(stats.bestWin || 0, profit);
    // Streak: win on a new daily seed increments; replaying same seed doesn't
    const yesterday = (() => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return `crabs-${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    })();
    if (lastSeed === yesterday) stats.streak = streak + 1;
    else if (lastSeed !== today) stats.streak = 1;
    // else same day, keep streak
  } else {
    if (lastSeed !== today) stats.streak = 0;
  }

  stats.lastSeed = today;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(stats)); } catch {}
  refreshStatCard();
}

// ── Share ─────────────────────────────────────────────────────────────────────
document.getElementById('btn-share-result').addEventListener('click', () => {
  const winnerId = finishOrder[0];
  const isWin    = winnerId === state.bet.crabId;
  const betCrab  = state.crabs[state.bet.crabId];
  const winner   = state.crabs[winnerId];
  const betAmt   = state.bet.amount;
  const payout   = isWin ? calcPayout(betAmt, betCrab.odds) : 0;
  const profit   = payout - betAmt;
  const url      = window.location.href.split('?')[0] + '?seed=' + encodeURIComponent(state.seed);

  const orderLine = finishOrder.map((id, i) =>
    `${PLACE_LABELS[i]}: ${state.crabs[id].name}`
  ).join('  ·  ');

  const text = [
    `🦀 Crab Chaos Racing`,
    `${state.seed}`,
    ``,
    `Winner: ${winner.name} (${oddsDisplay(winner.odds)})`,
    `Bet: $${betAmt} on ${betCrab.name} → ${isWin ? `+$${profit}` : `-$${betAmt}`}`,
    ``,
    orderLine,
    ``,
    url,
  ].join('\n');

  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() =>
      flashButton(document.getElementById('btn-share-result'), '✓ Copied!'));
  } else {
    prompt('Copy your result:', text);
  }
});

// ── Play Again ────────────────────────────────────────────────────────────────
document.getElementById('btn-play-again').addEventListener('click', () => {
  showScreen('screen-landing');
});

// ── Boot ──────────────────────────────────────────────────────────────────────
const urlSeed = new URLSearchParams(window.location.search).get('seed');
if (urlSeed) {
  els.seedInput.value = urlSeed;
  loadSeed(urlSeed);
} else {
  loadSeed(dailySeed());
}
refreshStatCard();
