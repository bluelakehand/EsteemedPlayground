'use strict';

const CW = 880, CH = 480;
const TEE_Y = 430;     // canvas px — tee position
const PIN_MARGIN = 55; // canvas px — top margin for pin

// --- Seeding ---
function dailySeed() {
  const d = new Date();
  return `ctp-${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function hashSeed(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- Hole generation ---
function generateHoles(seedStr, count) {
  const rng = mulberry32(hashSeed(seedStr));
  const holes = [];
  for (let i = 0; i < count; i++) {
    const distance = Math.round(100 + rng() * 150);   // 100–250 yards
    const greenRadius = 9 + rng() * 8;                // 9–17 yards
    const pinOffsetX = (rng() - 0.5) * 12;            // ±6 yards lateral
    const maxDistance = 300; // 100% of bar = 300 yards always

    const numBunkers = 1 + Math.floor(rng() * 3);
    const bunkers = [];
    for (let b = 0; b < numBunkers; b++) {
      const bAng = rng() * Math.PI * 2;
      const bd = greenRadius + 3 + rng() * 9;
      bunkers.push({
        x: pinOffsetX + Math.cos(bAng) * bd,
        y: distance + Math.sin(bAng) * bd * 0.65,
        rx: 4 + rng() * 5,
        ry: 3 + rng() * 4,
      });
    }

    const numTrees = 3 + Math.floor(rng() * 5);
    const trees = [];
    for (let t = 0; t < numTrees; t++) {
      const side = rng() > 0.5 ? 1 : -1;
      trees.push({
        x: side * (22 + rng() * 14),
        y: 15 + rng() * (distance - 25),
        r: 5 + rng() * 7,
      });
    }

    const wAng = rng() * Math.PI * 2;
    const wSpd = rng() * 7;

    let holeAnim = null;
    if (rng() < 1 / 2) {
      if (rng() < 0.5) {
        holeAnim = {
          type: 'pulse',
          speed: 0.3 + rng() * 0.4,       // Hz — full cycle every 2.5–3.3s
          minR: 0.15 + rng() * 0.2,        // yards (very small)
          maxR: 1.6 + rng() * 1.4,         // yards (large)
        };
      } else {
        holeAnim = {
          type: 'move',
          speed: 0.12 + rng() * 0.14,      // Hz — full lap every 4–8s
          moveRadius: greenRadius * (0.25 + rng() * 0.2),
          pattern: rng() < 0.5 ? 'circle' : 'figure8',
          phase: rng() * Math.PI * 2,
        };
      }
    }

    holes.push({
      distance,
      greenRadius,
      pinOffsetX,
      maxDistance,
      bunkers,
      trees,
      wind: { dx: Math.cos(wAng) * wSpd, dy: Math.sin(wAng) * wSpd },
      holeAnim,
    });
  }
  return holes;
}

// --- Coordinate helpers ---
function holeScale(hole) { return (TEE_Y - PIN_MARGIN) / hole.distance; }

function toPx(yx, yy, hole) {
  const s = holeScale(hole);
  return { x: CW / 2 + yx * s, y: TEE_Y - yy * s };
}

// --- Animated pin state ---
function getPinState(hole, animT) {
  const base = { x: hole.pinOffsetX, y: hole.distance, gameRadius: HOLE_RADIUS, cupPx: 4 };
  if (!hole.holeAnim) return base;
  const anim = hole.holeAnim;
  const t = animT / 1000;
  if (anim.type === 'pulse') {
    const frac = 0.5 + 0.5 * Math.sin(2 * Math.PI * anim.speed * t);
    const r = anim.minR + (anim.maxR - anim.minR) * frac;
    return { ...base, gameRadius: r, cupPx: Math.max(2, 4 * r / HOLE_RADIUS) };
  }
  // move
  const ang = 2 * Math.PI * anim.speed * t + anim.phase;
  const dx = Math.cos(ang) * anim.moveRadius;
  const dy = anim.pattern === 'figure8'
    ? Math.sin(2 * ang) * anim.moveRadius * 0.5
    : Math.sin(ang) * anim.moveRadius;
  return { ...base, x: hole.pinOffsetX + dx, y: hole.distance + dy };
}

// --- Canvas drawing ---
function drawHole(canvas, hole, opts = {}) {
  const ctx = canvas.getContext('2d');
  const s = holeScale(hole);
  const cx = CW / 2;
  // staticPx = original hole centre (green, fairway always drawn here)
  const staticPx = toPx(hole.pinOffsetX, hole.distance, hole);
  // pinState / pinPx = animated pin position (may differ for moving/pulsing holes)
  const pinState = opts.pinState || { x: hole.pinOffsetX, y: hole.distance, gameRadius: HOLE_RADIUS, cupPx: 4 };
  const pinPx = toPx(pinState.x, pinState.y, hole);

  // Rough background
  ctx.fillStyle = '#1a4a09';
  ctx.fillRect(0, 0, CW, CH);

  // Fairway strip — lightly textured lighter green
  const fw = 40 * s;
  ctx.fillStyle = '#267014';
  ctx.beginPath();
  ctx.rect(cx - fw / 2, staticPx.y - hole.greenRadius * s * 0.9, fw, TEE_Y - staticPx.y + hole.greenRadius * s * 0.9);
  ctx.fill();

  // Subtle fairway stripes
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = '#ffffff';
  const stripeH = 18 * s;
  for (let sy = staticPx.y; sy < TEE_Y; sy += stripeH * 2) {
    ctx.fillRect(cx - fw / 2, sy, fw, stripeH);
  }
  ctx.globalAlpha = 1;

  // Green (always centred on the original static position)
  ctx.fillStyle = '#33a020';
  ctx.beginPath();
  ctx.ellipse(staticPx.x, staticPx.y, hole.greenRadius * s, hole.greenRadius * s * 0.9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Bunkers
  for (const b of hole.bunkers) {
    const bp = toPx(b.x, b.y, hole);
    ctx.fillStyle = '#c4a040';
    ctx.beginPath();
    ctx.ellipse(bp.x, bp.y, b.rx * s, b.ry * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(160, 120, 20, 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
    // Bunker texture dots
    ctx.fillStyle = 'rgba(180,140,30,0.4)';
    for (let d = 0; d < 6; d++) {
      const bx = bp.x + (Math.sin(d * 1.3) * b.rx * s * 0.6);
      const by = bp.y + (Math.cos(d * 1.7) * b.ry * s * 0.5);
      ctx.beginPath();
      ctx.arc(bx, by, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Trees
  for (const t of hole.trees) {
    const tp = toPx(t.x, t.y, hole);
    const r = t.r * s;
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(tp.x + 3, tp.y + 3, r, r * 0.72, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#144d08';
    ctx.beginPath();
    ctx.arc(tp.x, tp.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1f6e10';
    ctx.beginPath();
    ctx.arc(tp.x - r * 0.22, tp.y - r * 0.25, r * 0.62, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(40,120,20,0.4)';
    ctx.beginPath();
    ctx.arc(tp.x + r * 0.15, tp.y + r * 0.1, r * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Pin stick shadow
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(pinPx.x + 2, pinPx.y + 1);
  ctx.lineTo(pinPx.x + 2, pinPx.y - 19);
  ctx.stroke();
  // Pin stick
  ctx.strokeStyle = '#e8e8e8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pinPx.x, pinPx.y);
  ctx.lineTo(pinPx.x, pinPx.y - 20);
  ctx.stroke();
  // Flag
  ctx.fillStyle = '#d32f2f';
  ctx.beginPath();
  ctx.moveTo(pinPx.x, pinPx.y - 20);
  ctx.lineTo(pinPx.x + 14, pinPx.y - 14);
  ctx.lineTo(pinPx.x, pinPx.y - 9);
  ctx.closePath();
  ctx.fill();
  // Hole cup — size reflects animated gameRadius for pulse holes
  ctx.fillStyle = '#0a0a0a';
  ctx.beginPath();
  ctx.arc(pinPx.x, pinPx.y, pinState.cupPx, 0, Math.PI * 2);
  ctx.fill();

  // Tee box
  const tb = 13;
  ctx.fillStyle = '#7a5230';
  ctx.fillRect(cx - tb / 2, TEE_Y - tb / 2, tb, tb);
  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth = 1;
  ctx.strokeRect(cx - tb / 2, TEE_Y - tb / 2, tb, tb);

  // Distance label
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = 'bold 12px "Arial Narrow", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${hole.distance} yds`, cx, TEE_Y + 18);

  drawWindIndicator(ctx, hole.wind);

  // Aim arrow — always points toward static green centre
  if (opts.aimAngle !== undefined) {
    const lineLen = (TEE_Y - staticPx.y) * 0.84;
    const ax = cx + Math.sin(opts.aimAngle) * lineLen;
    const ay = TEE_Y - Math.cos(opts.aimAngle) * lineLen;
    ctx.strokeStyle = 'rgba(255,225,0,0.88)';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([9, 5]);
    ctx.beginPath();
    ctx.moveTo(cx, TEE_Y);
    ctx.lineTo(ax, ay);
    ctx.stroke();
    ctx.setLineDash([]);
    // Arrowhead
    const hl = 12, ha = 0.38;
    ctx.fillStyle = 'rgba(255,225,0,0.88)';
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(ax - hl * Math.sin(opts.aimAngle + ha), ay + hl * Math.cos(opts.aimAngle + ha));
    ctx.lineTo(ax - hl * Math.sin(opts.aimAngle - ha), ay + hl * Math.cos(opts.aimAngle - ha));
    ctx.closePath();
    ctx.fill();
  }

  // Ball in flight
  if (opts.ball) {
    const bp = toPx(opts.ball.x, opts.ball.y, hole);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(bp.x + 2, bp.y + 2, 5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    const grd = ctx.createRadialGradient(bp.x - 1.5, bp.y - 1.5, 0.5, bp.x, bp.y, 5.5);
    grd.addColorStop(0, '#ffffff');
    grd.addColorStop(1, '#c8c8c8');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(bp.x, bp.y, 5.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Landing result marker
  if (opts.landing) {
    const lp = toPx(opts.landing.x, opts.landing.y, hole);
    // Dashed line to pin
    ctx.strokeStyle = 'rgba(255, 80, 80, 0.75)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 3]);
    ctx.beginPath();
    ctx.moveTo(lp.x, lp.y);
    ctx.lineTo(pinPx.x, pinPx.y);
    ctx.stroke();
    ctx.setLineDash([]);
    // Ripple rings
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(lp.x, lp.y, 13, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath(); ctx.arc(lp.x, lp.y, 22, 0, Math.PI * 2); ctx.stroke();
    // Ball at landing
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(lp.x, lp.y, 5.5, 0, Math.PI * 2);
    ctx.fill();
    // Distance label on the line
    if (opts.distFromPin !== undefined) {
      const mx = (lp.x + pinPx.x) / 2;
      const my = (lp.y + pinPx.y) / 2 - 8;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.beginPath();
      ctx.roundRect(mx - 32, my - 11, 64, 20, 4);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px "Arial Narrow", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(opts.inHole ? 'IN THE HOLE' : `${opts.distFromPin.toFixed(1)} yds`, mx, my + 3);
    }
  }
}

function drawWindIndicator(ctx, wind) {
  const wx = CW - 62, wy = 44;
  ctx.fillStyle = 'rgba(0,0,0,0.58)';
  ctx.beginPath();
  ctx.arc(wx, wy, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '9px "Arial Narrow", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('WIND', wx, wy + 36);

  const spd = Math.hypot(wind.dx, wind.dy);
  if (spd < 0.6) {
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = 'bold 10px "Arial Narrow"';
    ctx.fillText('CALM', wx, wy + 4);
    return;
  }

  const ang = Math.atan2(wind.dx, -wind.dy);
  const len = Math.min(18, spd * 2.6);
  const ex = wx + Math.sin(ang) * len;
  const ey = wy - Math.cos(ang) * len;

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(wx, wy);
  ctx.lineTo(ex, ey);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(ex, ey);
  ctx.lineTo(ex - 5 * Math.sin(ang + 0.5), ey + 5 * Math.cos(ang + 0.5));
  ctx.lineTo(ex - 5 * Math.sin(ang - 0.5), ey + 5 * Math.cos(ang - 0.5));
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#7dd3f5';
  ctx.font = 'bold 10px "Arial Narrow"';
  ctx.fillText(`${spd.toFixed(0)}y`, wx, wy + 5);
}

// --- Game state ---
const G = {
  phase: 'start',
  holeCount: 0,
  holeIdx: 0,
  scores: [],
  inHoleFlags: [],
  holes: [],
  seed: '',
  isDaily: true,
  raf: null,
  // aim
  aimStart: 0,
  aimLocked: false,
  lockedAim: 0,
  // power
  powerStart: 0,
  powerLocked: false,
  lockedPower: 0,
  // flight
  flightStart: 0,
  flightDur: 1500,
  landX: 0,
  landY: 0,
  holeAnimStart: 0,
  finalPinState: null,
};

// --- Physics ---
function calcLanding(hole, aimAngle, power) {
  const dist = hole.maxDistance * (power / 100);
  const wf = power / 100; // wind scales with power
  return {
    x: Math.sin(aimAngle) * dist + hole.wind.dx * wf,
    y: Math.cos(aimAngle) * dist + hole.wind.dy * wf,
  };
}

const HOLE_RADIUS = 0.7; // yards — base radius; pulse holes animate this

// --- Animation helpers ---
function aimOscillation(t) {
  const amp = 22 * Math.PI / 180;
  return amp * Math.sin(2 * Math.PI * (t - G.aimStart) / 2800);
}

function powerOscillation(t) {
  const period = 2600;
  const e = (t - G.powerStart) % period;
  return e < period / 2 ? (e / (period / 2)) * 100 : ((period - e) / (period / 2)) * 100;
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

// --- DOM refs ---
const cvHole     = document.getElementById('canvas-hole');
const cvResult   = document.getElementById('canvas-result');
const holeBadge  = document.getElementById('hole-badge');
const runScore   = document.getElementById('running-score');
const distLabel  = document.getElementById('hole-distance-label');
const ctrlsAim   = document.getElementById('controls-aim');
const ctrlsPower = document.getElementById('controls-power');
const powerFill  = document.getElementById('power-fill');
const powerSweet = document.getElementById('power-sweet');
const aimDisplay = document.getElementById('aim-display');
const resultBadge  = document.getElementById('result-badge');
const resultStats  = document.getElementById('result-stats');
const startChip    = document.getElementById('start-seed-chip');
const holeChip     = document.getElementById('hole-seed-chip');

// --- Game loop ---
function gameLoop(ts) {
  const hole = G.holes[G.holeIdx];
  if (!hole) return;

  const pinState = getPinState(hole, ts - G.holeAnimStart);

  if (G.phase === 'aim') {
    const angle = G.aimLocked ? G.lockedAim : aimOscillation(ts);
    drawHole(cvHole, hole, { aimAngle: angle, pinState });
    if (!G.aimLocked) {
      const deg = angle * 180 / Math.PI;
      aimDisplay.textContent = Math.abs(deg) < 1 ? 'On Target'
        : `${Math.abs(deg).toFixed(1)}° ${deg > 0 ? 'R' : 'L'}`;
    }
    G.raf = requestAnimationFrame(gameLoop);

  } else if (G.phase === 'power') {
    const pct = powerOscillation(ts);
    powerFill.style.width = `${pct}%`;
    drawHole(cvHole, hole, { aimAngle: G.lockedAim, pinState });
    G.raf = requestAnimationFrame(gameLoop);

  } else if (G.phase === 'flight') {
    const progress = Math.min(1, (ts - G.flightStart) / G.flightDur);
    const t = easeInOut(progress);
    drawHole(cvHole, hole, {
      aimAngle: G.lockedAim,
      ball: { x: G.landX * t, y: G.landY * t },
      pinState,
    });
    if (progress >= 1) {
      G.finalPinState = pinState; // freeze pin where it was at landing
      showResult();
    } else {
      G.raf = requestAnimationFrame(gameLoop);
    }
  }
}

// --- Screen helpers ---
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function seedChipText() {
  return G.isDaily
    ? `Daily · ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    : `Seed: ${G.seed.slice(0, 14)}`;
}

// --- Start hole ---
function startHole() {
  const hole = G.holes[G.holeIdx];
  holeBadge.textContent = G.holeCount === 1
    ? 'CTP' : `Hole ${G.holeIdx + 1} of ${G.holeCount}`;
  distLabel.textContent = `${hole.distance} yards to the pin`;
  holeChip.textContent = seedChipText();
  holeChip.className = `seed-chip ${G.isDaily ? 'daily' : 'custom'}`;

  ctrlsAim.style.display = '';
  ctrlsPower.style.display = 'none';
  aimDisplay.textContent = '—';
  G.aimLocked = false;
  G.powerLocked = false;
  G.phase = 'aim';

  showScreen('screen-hole');
  if (G.raf) cancelAnimationFrame(G.raf);
  G.aimStart = performance.now();
  G.holeAnimStart = G.aimStart;
  G.finalPinState = null;
  G.raf = requestAnimationFrame(gameLoop);
}

// --- Lock aim ---
function lockAim() {
  if (G.phase !== 'aim' || G.aimLocked) return;
  G.lockedAim = aimOscillation(performance.now());
  G.aimLocked = true;
  const deg = G.lockedAim * 180 / Math.PI;
  aimDisplay.textContent = Math.abs(deg) < 1 ? 'On Target'
    : `${Math.abs(deg).toFixed(1)}° ${deg > 0 ? 'R' : 'L'}`;

  setTimeout(() => {
    ctrlsAim.style.display = 'none';
    ctrlsPower.style.display = '';
    G.phase = 'power';
    G.powerStart = performance.now();
  }, 350);
}

// --- Lock power / swing ---
function lockPower() {
  if (G.phase !== 'power') return;
  G.lockedPower = powerOscillation(performance.now());
  G.phase = 'flight';
  ctrlsPower.style.display = 'none';

  const hole = G.holes[G.holeIdx];
  const landing = calcLanding(hole, G.lockedAim, G.lockedPower);
  G.landX = landing.x;
  G.landY = landing.y;
  G.flightStart = performance.now();
}

// --- Show per-hole result ---
function showResult() {
  const hole = G.holes[G.holeIdx];
  const ps = G.finalPinState || { x: hole.pinOffsetX, y: hole.distance, gameRadius: HOLE_RADIUS, cupPx: 4 };
  const d = Math.hypot(G.landX - ps.x, G.landY - ps.y);
  const inHole = d < ps.gameRadius;
  const score = inHole ? hole.distance : d;

  G.scores.push(score);
  G.inHoleFlags.push(inHole);

  const total = G.scores.reduce((a, b) => a + b, 0);
  runScore.textContent = total.toFixed(1);

  drawHole(cvResult, hole, {
    landing: { x: G.landX, y: G.landY },
    distFromPin: d,
    inHole,
    pinState: ps,
  });

  resultBadge.textContent = G.holeCount === 1
    ? 'Your Result' : `Hole ${G.holeIdx + 1} Result`;

  const q = inHole ? 'bad' : d < 5 ? 'good' : d < 20 ? 'ok' : 'bad';
  const dispDist = inHole ? 'IN THE HOLE' : `${d.toFixed(1)} yds`;
  const dispScore = inHole ? `${score.toFixed(0)} yds (penalty)` : `${score.toFixed(1)} yds`;

  resultStats.innerHTML = `
    <div class="stat-pill ${q}">
      <span class="label">Distance from Pin</span>
      <span class="value">${dispDist}</span>
    </div>
    <div class="stat-pill ${inHole ? 'bad' : q}">
      <span class="label">Score (this hole)</span>
      <span class="value">${dispScore}</span>
    </div>
    <div class="stat-pill">
      <span class="label">Hole Distance</span>
      <span class="value">${hole.distance} yds</span>
    </div>
  `;

  const isLast = G.holeIdx >= G.holeCount - 1;
  document.getElementById('btn-next').textContent = isLast ? 'See Scorecard' : 'Next Hole';

  showScreen('screen-result');
  G.phase = 'result';
}

// --- Scorecard ---
function showScorecard() {
  const total = G.scores.reduce((a, b) => a + b, 0);

  // Persist best
  const key = `ctp-best-${G.holeCount}`;
  const saved = parseFloat(localStorage.getItem(key));
  if (isNaN(saved) || total < saved) localStorage.setItem(key, total.toFixed(1));
  updateStatCard();

  const sc = document.getElementById('scorecard');
  sc.innerHTML = '<thead><tr><th>Hole</th><th>Distance</th><th>Result</th><th>Score</th></tr></thead>';
  const tbody = document.createElement('tbody');
  G.scores.forEach((score, i) => {
    const hole = G.holes[i];
    const inHole = G.inHoleFlags[i];
    const q = inHole ? 'bad' : score < 5 ? 'good' : score < 20 ? 'ok' : 'bad';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${hole.distance} yds</td>
      <td class="${inHole ? 'bad' : ''}">${inHole ? 'In hole' : `${(score).toFixed(1)} yds from pin`}</td>
      <td class="${q}">${score.toFixed(1)}</td>
    `;
    tbody.appendChild(tr);
  });
  sc.appendChild(tbody);

  document.getElementById('final-score').textContent = `${total.toFixed(1)} yds`;

  const avg = total / G.scores.length;

  // Base verdict — thresholds match color tiers (<5 bullseye, <10 green, <20 yellow, >=20 red)
  let verdict;
  if (avg < 5) {
    const lines = [
      "Okay, sandbagging is a form of dishonesty. We're onto you.",
      "We'd accuse you of cheating but we can't figure out how.",
      "Put some respect on the pin. It didn't deserve this.",
    ];
    verdict = lines[Math.floor(avg * 10) % lines.length];
  } else if (avg < 10) {
    const lines = [
      "Quietly competent. That's somehow more annoying than being great.",
      "Solid round. Don't expect a parade.",
      "Fine. It was fine. You were fine. Everyone's fine.",
    ];
    verdict = lines[Math.floor(avg * 3) % lines.length];
  } else if (avg < 20) {
    const lines = [
      "You were in the vicinity. The pin noticed.",
      "The green was right there. Anyway.",
      "Points for trying. Partial points. Small partial points.",
    ];
    verdict = lines[Math.floor(avg) % lines.length];
  } else if (avg < 40) {
    const lines = [
      "These scores have a lot of personality.",
      "Golf is a sport that requires aiming at something. Notes taken.",
      "The pin survived unscathed. Probably felt safe the whole time.",
    ];
    verdict = lines[Math.floor(avg / 5) % lines.length];
  } else {
    const lines = [
      "Outstanding commitment to the wrong part of the course.",
      "Were you aiming at the pin, or just vibing? Asking for science.",
      "The club did nothing wrong. We want to be clear about that.",
    ];
    verdict = lines[Math.floor(avg / 10) % lines.length];
  }

  // Worst-hole roast — only fires if one hole stands out as distinctly bad
  if (G.holeCount > 1) {
    const worstIdx = G.scores.indexOf(Math.max(...G.scores));
    const worstScore = G.scores[worstIdx];
    const worstInHole = G.inHoleFlags[worstIdx];
    const holeNum = worstIdx + 1;

    if (worstInHole) {
      const lines = [
        `Hole ${holeNum}: you went IN. The entire point of CTP is to NOT go in. Remarkable.`,
        `Hole ${holeNum}: the one time you nailed the distance, the hole ate it. Incredible work.`,
        `Hole ${holeNum} went in, which is actually a worse outcome than missing by 40 yards. Take a moment.`,
      ];
      verdict += ' ' + lines[holeNum % lines.length];
    } else if (worstScore >= 20 && worstScore > avg * 1.7) {
      if (worstScore >= 60) {
        const lines = [
          `Hole ${holeNum} goes in the incident report.`,
          `Hole ${holeNum} will be brought up at an appropriate time in the future.`,
          `We don't talk about hole ${holeNum}. We don't talk about hole ${holeNum}.`,
        ];
        verdict += ' ' + lines[holeNum % lines.length];
      } else if (worstScore >= 35) {
        const lines = [
          `Hole ${holeNum} alone dropped this verdict by two tiers.`,
          `Hole ${holeNum} happened. We all saw it.`,
          `Whatever happened on hole ${holeNum}, the flag is still standing.`,
        ];
        verdict += ' ' + lines[holeNum % lines.length];
      } else {
        const lines = [
          `Hole ${holeNum} had a little too much going on.`,
          `Hole ${holeNum} is why averages are misleading.`,
          `Forget the rest — what were you doing on hole ${holeNum}?`,
        ];
        verdict += ' ' + lines[holeNum % lines.length];
      }
    }
  }

  document.getElementById('final-tagline').textContent = verdict;

  showScreen('screen-scorecard');
  G.phase = 'scorecard';
}

// --- Share ---
function shareResult() {
  const total = G.scores.reduce((a, b) => a + b, 0);
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  const emojiLine = G.scores.map((score, i) => {
    if (G.inHoleFlags[i]) return '⛳';
    if (score < 5) return '🎯';
    if (score < 10) return '🟢';
    if (score < 20) return '🟡';
    return '🔴';
  }).join('');
  const text = `CTP — ${date}\n${G.holeCount}-Hole · ${total.toFixed(1)} yds\n${emojiLine}\n${location.href}`;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('btn-share');
    const orig = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = orig; }, 1800);
  });
}

// --- Stat card ---
function updateStatCard() {
  const bestEl = document.getElementById('best-score');
  const ctxEl  = document.getElementById('best-context');
  if (!G.holeCount) {
    bestEl.textContent = '—';
    ctxEl.textContent = 'Select a round length';
    return;
  }
  const key = `ctp-best-${G.holeCount}`;
  const b = localStorage.getItem(key);
  bestEl.textContent = b ? `${b} yds` : '—';
  ctxEl.textContent = `${G.holeCount}-hole best`;
}

// --- Event wiring ---
document.querySelectorAll('.hole-opt-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.hole-opt-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    G.holeCount = parseInt(btn.dataset.holes, 10);
    document.getElementById('btn-play').disabled = false;
    updateStatCard();
  });
});

document.getElementById('btn-play').addEventListener('click', () => {
  if (!G.holeCount) return;
  G.holeIdx = 0;
  G.scores = [];
  G.inHoleFlags = [];
  runScore.textContent = '0.0';
  G.holes = generateHoles(G.seed, G.holeCount);
  startHole();
});

document.getElementById('btn-daily').addEventListener('click', () => {
  document.getElementById('seed-input').value = '';
  G.seed = dailySeed();
  G.isDaily = true;
  startChip.textContent = seedChipText();
  startChip.className = 'seed-chip daily';
});

document.getElementById('seed-form').addEventListener('submit', e => {
  e.preventDefault();
  const val = document.getElementById('seed-input').value.trim();
  if (!val) return;
  G.seed = val;
  G.isDaily = false;
  startChip.textContent = seedChipText();
  startChip.className = 'seed-chip custom';
});

document.getElementById('btn-lock-aim').addEventListener('click', lockAim);
document.getElementById('btn-swing').addEventListener('click', lockPower);

cvHole.addEventListener('click', () => {
  if (G.phase === 'aim') lockAim();
  else if (G.phase === 'power') lockPower();
});

document.getElementById('btn-next').addEventListener('click', () => {
  G.holeIdx++;
  if (G.holeIdx >= G.holeCount) {
    if (G.raf) { cancelAnimationFrame(G.raf); G.raf = null; }
    showScorecard();
  } else {
    startHole();
  }
});

document.getElementById('btn-restart').addEventListener('click', () => {
  if (G.raf) { cancelAnimationFrame(G.raf); G.raf = null; }
  showScreen('screen-start');
  G.phase = 'start';
});

document.getElementById('btn-share').addEventListener('click', shareResult);

document.addEventListener('keydown', e => {
  if (e.code !== 'Space') return;
  e.preventDefault();
  if (G.phase === 'aim') lockAim();
  else if (G.phase === 'power') lockPower();
});

// --- Init ---
G.seed = dailySeed();
G.isDaily = true;
startChip.textContent = seedChipText();
startChip.className = 'seed-chip daily';
