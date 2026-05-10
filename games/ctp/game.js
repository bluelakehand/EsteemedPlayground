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
    const distance = Math.round(100 + rng() * 150);

    // Type first — island needs a larger green
    const fwRoll = rng();
    let fwType;
    if      (fwRoll < 0.20) fwType = 'straight';
    else if (fwRoll < 0.30) fwType = 'wide';
    else if (fwRoll < 0.40) fwType = 'narrow';
    else if (fwRoll < 0.53) fwType = 'dogleg-l';
    else if (fwRoll < 0.66) fwType = 'dogleg-r';
    else if (fwRoll < 0.76) fwType = 'S-curve';
    else if (fwRoll < 0.84) fwType = 'funnel';
    else if (fwRoll < 0.92) fwType = 'rev-funnel';
    else                    fwType = 'island';

    const greenRadius = fwType === 'island' ? 15 + rng() * 6 : 9 + rng() * 8;

    // Build waypoints + pinOffsetX per type
    // Waypoints: { cx, cy, hw } — game yards, cx/cy relative to tee at (0,0)
    let waypoints, pinOffsetX;
    const d = distance;

    if (fwType === 'straight') {
      pinOffsetX = (rng() - 0.5) * 12;
      waypoints = [
        { cx: 0,          cy: 0,  hw: 19 },
        { cx: pinOffsetX, cy: d,  hw: 19 },
      ];
    } else if (fwType === 'wide') {
      pinOffsetX = (rng() - 0.5) * 22;
      waypoints = [
        { cx: 0,          cy: 0,  hw: 34 },
        { cx: pinOffsetX, cy: d,  hw: 34 },
      ];
    } else if (fwType === 'narrow') {
      pinOffsetX = (rng() - 0.5) * 8;
      waypoints = [
        { cx: 0,          cy: 0,  hw: 11 },
        { cx: pinOffsetX, cy: d,  hw: 11 },
      ];
    } else if (fwType === 'dogleg-l') {
      const bY = d * (0.35 + rng() * 0.30);
      const bX = -(16 + rng() * 20);
      pinOffsetX = bX + (rng() - 0.5) * 10;
      waypoints = [
        { cx: 0,          cy: 0,   hw: 18 },
        { cx: 0,          cy: bY,  hw: 18 },
        { cx: pinOffsetX, cy: d,   hw: 18 },
      ];
    } else if (fwType === 'dogleg-r') {
      const bY = d * (0.35 + rng() * 0.30);
      const bX = 16 + rng() * 20;
      pinOffsetX = bX + (rng() - 0.5) * 10;
      waypoints = [
        { cx: 0,          cy: 0,   hw: 18 },
        { cx: 0,          cy: bY,  hw: 18 },
        { cx: pinOffsetX, cy: d,   hw: 18 },
      ];
    } else if (fwType === 'S-curve') {
      const dir = rng() < 0.5 ? 1 : -1;
      const b1Y = d * (0.28 + rng() * 0.15);
      const b1X = dir  * (13 + rng() * 14);
      const b2Y = d * (0.55 + rng() * 0.15);
      const b2X = -dir * (11 + rng() * 11);
      pinOffsetX = b2X + (rng() - 0.5) * 8;
      waypoints = [
        { cx: 0,          cy: 0,    hw: 16 },
        { cx: b1X,        cy: b1Y,  hw: 16 },
        { cx: b2X,        cy: b2Y,  hw: 16 },
        { cx: pinOffsetX, cy: d,    hw: 16 },
      ];
    } else if (fwType === 'funnel') {
      pinOffsetX = (rng() - 0.5) * 10;
      waypoints = [
        { cx: 0,                cy: 0,       hw: 34 },
        { cx: pinOffsetX * 0.5, cy: d * 0.5, hw: 20 },
        { cx: pinOffsetX,       cy: d,       hw: 10 },
      ];
    } else if (fwType === 'rev-funnel') {
      pinOffsetX = (rng() - 0.5) * 18;
      waypoints = [
        { cx: 0,                cy: 0,       hw: 10 },
        { cx: pinOffsetX * 0.4, cy: d * 0.4, hw: 20 },
        { cx: pinOffsetX,       cy: d,       hw: 30 },
      ];
    } else { // island
      pinOffsetX = (rng() - 0.5) * 8;
      const approachEnd = d - greenRadius * 2.0;
      waypoints = [
        { cx: 0,                  cy: 0,                hw: 9 },
        { cx: pinOffsetX * 0.4,   cy: approachEnd * 0.6, hw: 9 },
        { cx: pinOffsetX,         cy: approachEnd,       hw: 9 },
      ];
    }

    const fairway = { type: fwType, waypoints };

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
    const maxHw = Math.max(...waypoints.map(w => w.hw));
    for (let t = 0; t < numTrees; t++) {
      const side = rng() > 0.5 ? 1 : -1;
      trees.push({
        x: side * (maxHw + 5 + rng() * 14),
        y: 15 + rng() * (distance - 25),
        r: 5 + rng() * 7,
      });
    }

    const wAng = rng() * Math.PI * 2;
    const wSpd = rng() * 22;

    let holeAnim = null;
    const animChance = (fwType === 'island' || fwType === 'narrow') ? 0.2 : 0.5;
    if (rng() < animChance) {
      if (rng() < 0.5) {
        holeAnim = { type: 'pulse', speed: 0.3 + rng() * 0.4, minR: 0.15 + rng() * 0.2, maxR: 1.6 + rng() * 1.4 };
      } else {
        holeAnim = { type: 'move', speed: 0.12 + rng() * 0.14, moveRadius: greenRadius * (0.25 + rng() * 0.2), pattern: rng() < 0.5 ? 'circle' : 'figure8', phase: rng() * Math.PI * 2 };
      }
    }

    holes.push({ distance, greenRadius, pinOffsetX, maxDistance: 300, bunkers, trees, fairway, wind: { dx: Math.cos(wAng) * wSpd, dy: Math.sin(wAng) * wSpd }, holeAnim });
  }
  return holes;
}

// --- Coordinate helpers ---
function holeScale(hole) { return (TEE_Y - PIN_MARGIN) / hole.distance; }

function toPx(yx, yy, hole) {
  const s = holeScale(hole);
  return { x: CW / 2 + yx * s, y: TEE_Y - yy * s };
}

// --- Bunker collision ---
function isInBunker(hole, lx, ly) {
  for (const b of hole.bunkers) {
    const dx = (lx - b.x) / b.rx;
    const dy = (ly - b.y) / b.ry;
    if (dx * dx + dy * dy <= 1) return true;
  }
  return false;
}

// --- Fairway collision (waypoint-based, handles all shapes including funnel) ---
function isOnFairway(hole, lx, ly) {
  const wps = hole.fairway.waypoints;
  if (Math.hypot(lx - hole.pinOffsetX, ly - hole.distance) <= hole.greenRadius) return true;
  for (let i = 0; i < wps.length - 1; i++) {
    const a = wps[i], b = wps[i + 1];
    const sdx = b.cx - a.cx, sdy = b.cy - a.cy;
    const lenSq = sdx * sdx + sdy * sdy;
    if (lenSq < 0.01) continue;
    const t = Math.max(0, Math.min(1, ((lx - a.cx) * sdx + (ly - a.cy) * sdy) / lenSq));
    const perpDist = Math.hypot(lx - (a.cx + t * sdx), ly - (a.cy + t * sdy));
    if (perpDist <= a.hw + t * (b.hw - a.hw)) return true;
  }
  return false;
}

// --- Fairway polygon builder (game coords → left/right edge arrays) ---
function buildFairwayPoly(waypoints) {
  const n = waypoints.length;
  const left = [], right = [];
  for (let i = 0; i < n; i++) {
    const wp = waypoints[i];
    let tx, ty;
    if (i === 0) {
      const dx = waypoints[1].cx - wp.cx, dy = waypoints[1].cy - wp.cy;
      const l = Math.hypot(dx, dy) || 1; tx = dx / l; ty = dy / l;
    } else if (i === n - 1) {
      const dx = wp.cx - waypoints[i-1].cx, dy = wp.cy - waypoints[i-1].cy;
      const l = Math.hypot(dx, dy) || 1; tx = dx / l; ty = dy / l;
    } else {
      const dx1 = wp.cx - waypoints[i-1].cx, dy1 = wp.cy - waypoints[i-1].cy;
      const l1 = Math.hypot(dx1, dy1) || 1;
      const dx2 = waypoints[i+1].cx - wp.cx, dy2 = waypoints[i+1].cy - wp.cy;
      const l2 = Math.hypot(dx2, dy2) || 1;
      const ax = dx1/l1 + dx2/l2, ay = dy1/l1 + dy2/l2;
      const al = Math.hypot(ax, ay) || 1; tx = ax / al; ty = ay / al;
    }
    // Perpendicular left in game space: rotate tangent 90° CCW → (-ty, tx)
    left.push({ cx: wp.cx + (-ty) * wp.hw, cy: wp.cy + tx * wp.hw });
    right.push({ cx: wp.cx - (-ty) * wp.hw, cy: wp.cy - tx * wp.hw });
  }
  return { left, right };
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

  // OOB diagonal stripes over the rough — fairway polygon drawn on top covers these
  ctx.strokeStyle = 'rgba(210, 45, 45, 0.30)';
  ctx.lineWidth = 1.4;
  const obSp = 26;
  for (let off = -CH; off < CW + CH; off += obSp) {
    ctx.beginPath(); ctx.moveTo(off, CH); ctx.lineTo(off + CH, 0); ctx.stroke();
  }

  // Island: water hazard drawn under the fairway so the approach strip crosses it
  if (hole.fairway.type === 'island') {
    const wr = hole.greenRadius * 1.8;
    ctx.fillStyle = '#0d3d5c';
    ctx.beginPath();
    ctx.ellipse(staticPx.x, staticPx.y, wr * s, wr * s * 0.88, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(56, 160, 220, 0.22)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(staticPx.x, staticPx.y, wr * s * 0.72, wr * s * 0.63, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Fairway — drawn as a polygon from waypoints so any shape works
  {
    const wps = hole.fairway.waypoints;
    const { left, right } = buildFairwayPoly(wps);
    // Convert game coords to canvas px
    const toC = (pt) => ({ x: cx + pt.cx * s, y: TEE_Y - pt.cy * s });
    const lc = left.map(toC);
    const rc = right.map(toC);

    const fairwayPath = () => {
      ctx.beginPath();
      ctx.moveTo(lc[0].x, lc[0].y);
      for (let k = 1; k < lc.length; k++) ctx.lineTo(lc[k].x, lc[k].y);
      for (let k = rc.length - 1; k >= 0; k--) ctx.lineTo(rc[k].x, rc[k].y);
      ctx.closePath();
    };

    ctx.fillStyle = '#267014';
    // Rounded caps at every waypoint smooth corners and ends
    for (const wp of wps) {
      ctx.beginPath();
      ctx.arc(cx + wp.cx * s, TEE_Y - wp.cy * s, wp.hw * s, 0, Math.PI * 2);
      ctx.fill();
    }
    fairwayPath(); ctx.fill();

    // Mowed stripes, clipped to the polygon
    ctx.save();
    fairwayPath(); ctx.clip();
    ctx.globalAlpha = 0.07;
    ctx.fillStyle = '#ffffff';
    const stripeH = 18 * s;
    for (let sy = 0; sy < TEE_Y + stripeH; sy += stripeH * 2) {
      ctx.fillRect(0, sy, CW, stripeH);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

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
    // Hazard yellow diagonal stripes clipped to bunker ellipse
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(bp.x, bp.y, b.rx * s, b.ry * s, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.strokeStyle = 'rgba(230, 195, 0, 0.72)';
    ctx.lineWidth = 1.3;
    for (let off = -CH; off < CW + CH; off += 9) {
      ctx.beginPath(); ctx.moveTo(off, CH); ctx.lineTo(off + CH, 0); ctx.stroke();
    }
    ctx.restore();
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
  const wx = CW - 66, wy = 52;
  const R = 34;

  const spd = Math.hypot(wind.dx, wind.dy);
  const color = spd < 5  ? '#7dd3f5'
              : spd < 12 ? '#ffa726'
              : '#ef5350';

  // Background
  ctx.fillStyle = 'rgba(4, 2, 0, 0.88)';
  ctx.beginPath();
  ctx.arc(wx, wy, R, 0, Math.PI * 2);
  ctx.fill();

  // Strength ring
  ctx.strokeStyle = spd < 0.6 ? 'rgba(255,255,255,0.18)' : color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(wx, wy, R, 0, Math.PI * 2);
  ctx.stroke();

  // Subtle compass ticks
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(wx + Math.cos(a) * (R - 7), wy + Math.sin(a) * (R - 7));
    ctx.lineTo(wx + Math.cos(a) * (R - 2), wy + Math.sin(a) * (R - 2));
    ctx.stroke();
  }

  // Labels outside the circle
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = 'bold 9px "Arial Narrow", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('WIND', wx, wy + R + 13);

  if (spd < 0.6) {
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = 'bold 12px "Arial Narrow", Arial, sans-serif';
    ctx.fillText('CALM', wx, wy + 4);
    return;
  }

  // Speed label below circle
  ctx.fillStyle = color;
  ctx.font = `bold 11px "Arial Narrow", Arial, sans-serif`;
  ctx.fillText(`${spd.toFixed(0)} yds`, wx, wy + R + 24);

  // Arrow — tail to tip spanning full radius
  const ang = Math.atan2(wind.dx, -wind.dy);
  const tailX = wx - Math.sin(ang) * (R * 0.28);
  const tailY = wy + Math.cos(ang) * (R * 0.28);
  const tipX  = wx + Math.sin(ang) * (R * 0.72);
  const tipY  = wy - Math.cos(ang) * (R * 0.72);

  ctx.strokeStyle = color;
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(tailX, tailY);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();
  ctx.lineCap = 'butt';

  // Arrowhead
  const hs = 9, ha = 0.42;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(tipX - hs * Math.sin(ang + ha), tipY + hs * Math.cos(ang + ha));
  ctx.lineTo(tipX - hs * Math.sin(ang - ha), tipY + hs * Math.cos(ang - ha));
  ctx.closePath();
  ctx.fill();
}

// --- Game state ---
const G = {
  phase: 'start',
  holeCount: 0,
  holeIdx: 0,
  scores: [],
  inHoleFlags: [],
  oobFlags: [],
  bunkerFlags: [],
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
  spaceLock: false,
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
  const fwLabels = {
    straight: '', wide: ' · Wide fairway', narrow: ' · Narrow fairway',
    'dogleg-l': ' · Dogleg left', 'dogleg-r': ' · Dogleg right',
    'S-curve': ' · S-curve', funnel: ' · Narrows to pin',
    'rev-funnel': ' · Opens to green', island: ' · Island green',
  };
  distLabel.textContent = `${hole.distance} yards to the pin${fwLabels[hole.fairway.type] || ''}`;
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

// --- Per-hole roast ---
function getHoleRoast(hole, holeIdx, landX, landY, d, inHole, isOOB, inBunker) {
  const pick = (arr, seed) => arr[Math.abs(seed) % arr.length];
  const seed = holeIdx * 17 + Math.floor(d * 3);
  const fw = hole.fairway;

  if (inBunker) return { text: pick([
    "That's a bunker. +10. Sand is not your friend.",
    "Hazard. Yellow lines meant something. +10.",
    "Professionally placed in the sand trap. +10 yds.",
    "The bunker was right there and you found it anyway. +10.",
  ], seed), wtf: false };

  if (isOOB) {
    const wtfThresh = fw.type === 'wide' ? 9 : fw.type === 'narrow' ? 6
      : fw.type === 'island' ? 9 : fw.type.startsWith('dogleg') ? 7
      : fw.type === 'S-curve' ? 7 : 8;
    if ((holeIdx * 17 + Math.floor(d)) % 10 < wtfThresh) return { text: 'WTF RICHARD?', wtf: true };
    if (fw.type === 'island') return { text: pick([
      "That's in the water. +20. Your ball is gone.",
      "The island green is not the surrounding water. +20 for reference.",
      "Splash. +20. You knew what this was.",
      "The bridge was right there. Metaphorically. +20.",
    ], seed), wtf: false };
    if (fw.type === 'dogleg-l' || fw.type === 'dogleg-r') return { text: pick([
      "The fairway bends. Your ball did not. +20.",
      "It's a dogleg. The dog legged. You didn't. +20.",
      "There's a turn on this hole. Consider that information. +20.",
      "Outstanding commitment to the straight line. +20 OOB.",
    ], seed), wtf: false };
    if (fw.type === 'S-curve') return { text: pick([
      "It bends both ways. You went neither. +20.",
      "An S-curve requires at least one of the S's. +20.",
      "The fairway goes left, then right. You found option C. +20.",
    ], seed), wtf: false };
    if (fw.type === 'wide') return { text: pick([
      "You missed a fairway that's basically a parking lot. +20.",
      "This fairway is aggressively wide and yet. +20.",
      "Outstanding. The one direction with no grass, and +20.",
    ], seed), wtf: false };
    if (fw.type === 'narrow') return { text: pick([
      "It's a tight line. You found the gap. Wrong gap. +20.",
      "Narrow fairway. Narrower ball flight. +20.",
      "These things happen on a tight hole. +20 anyway.",
    ], seed), wtf: false };
    if (fw.type === 'funnel') return { text: pick([
      "That was the wide part. You missed it. +20.",
      "It funnels to the green. You chose the outside. +20.",
      "The whole thing narrows down there. You missed the wide part up here. +20.",
    ], seed), wtf: false };
    if (fw.type === 'rev-funnel') return { text: pick([
      "It opens up near the green. You missed the opening. +20.",
      "The landing area near the pin is enormous. +20 somehow.",
      "There's a lot of room up there. Not here. +20.",
    ], seed), wtf: false };
    return { text: pick([
      "That's OOB. +20. Just so we're aligned.",
      "The red lines meant something. +20.",
      "Outstanding landing zone. Also OOB. +20.",
      "That went fully elsewhere. +20.",
    ], seed), wtf: false };
  }

  if (inHole) return { text: pick([
    "You went IN. The one thing you weren't supposed to do.",
    "In. The. Hole. Remarkable.",
    "Technically you nailed it. Unfortunately, that's the wrong answer.",
  ], seed), wtf: false };

  if (d < 5) return { text: pick([
    "Fine. We'll allow it.",
    "Barely any room to complain. Barely.",
    "We're not NOT impressed.",
    "That was good. We said it. Move on.",
  ], seed), wtf: false };

  if (d < 10) return { text: pick([
    "Close enough to hear the flag.",
    "That'll do.",
    "On the green. That counts for something.",
    "Not bad at all. Don't let it go to your head.",
  ], seed), wtf: false };

  if (d < 20) return { text: pick([
    "In the vicinity. Loosely.",
    "The pin saw you coming and didn't flinch.",
    "Points for proximity. Some points.",
    "You were on the right course. This course.",
  ], seed), wtf: false };

  if (d < 40) return { text: pick([
    "That went somewhere on this property.",
    "The rough did nothing to deserve this.",
    "Ambitious distance from the pin.",
    "Room to improve. Large room.",
  ], seed), wtf: false };

  return { text: pick([
    "Where were you aiming, exactly?",
    "This is a closest-to-pin contest. Just so we're clear.",
    "The course notes this outcome with concern.",
    "Groundskeeping will need a moment.",
  ], seed), wtf: false };
}

// --- Roast canvas overlay ---
function drawRoastOverlay(canvas, roast) {
  const ctx = canvas.getContext('2d');
  const cx = CW / 2;
  const cy = CH * 0.56;

  ctx.font = roast.wtf
    ? 'bold 50px "Arial Narrow", Arial, sans-serif'
    : 'italic 22px Georgia, serif';

  const tw = ctx.measureText(roast.text).width;
  const fh = roast.wtf ? 50 : 22;
  const padX = roast.wtf ? 36 : 28;
  const padY = roast.wtf ? 22 : 18;
  const bw = tw + padX * 2;
  const bh = fh + padY * 2;

  ctx.fillStyle = 'rgba(6, 3, 0, 0.84)';
  ctx.beginPath();
  ctx.roundRect(cx - bw / 2, cy - bh / 2, bw, bh, 10);
  ctx.fill();
  ctx.strokeStyle = roast.wtf ? 'rgba(239, 83, 80, 0.35)' : 'rgba(245, 124, 0, 0.22)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (roast.wtf) {
    ctx.fillStyle = '#ef5350';
    ctx.shadowColor = 'rgba(239, 83, 80, 0.65)';
    ctx.shadowBlur = 26;
  } else {
    ctx.fillStyle = '#fff3e0';
    ctx.shadowBlur = 0;
  }
  ctx.fillText(roast.text, cx, cy);
  ctx.shadowBlur = 0;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
}

// --- Show per-hole result ---
function showResult() {
  const hole = G.holes[G.holeIdx];
  const ps = G.finalPinState || { x: hole.pinOffsetX, y: hole.distance, gameRadius: HOLE_RADIUS, cupPx: 4 };
  const d = Math.hypot(G.landX - ps.x, G.landY - ps.y);
  const inHole = d < ps.gameRadius;
  const hitBunker = !inHole && isInBunker(hole, G.landX, G.landY);
  const onFairway  = !inHole && isOnFairway(hole, G.landX, G.landY);
  const isOOB      = !inHole && !hitBunker && !onFairway;

  let score;
  if (inHole)      score = hole.distance;
  else if (isOOB)  score = d + 20;
  else if (hitBunker) score = d + 10;
  else             score = d;

  G.scores.push(score);
  G.inHoleFlags.push(inHole);
  G.oobFlags.push(isOOB);
  G.bunkerFlags.push(hitBunker);

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

  const q = inHole || isOOB ? 'bad' : hitBunker ? 'ok' : d < 10 ? 'good' : d < 20 ? 'ok' : 'bad';
  const dispDist = inHole ? 'IN THE HOLE' : `${d.toFixed(1)} yds`;
  let dispScore;
  if (inHole)        dispScore = `${score.toFixed(0)} yds (in-hole penalty)`;
  else if (isOOB)    dispScore = `${d.toFixed(1)} + 20 OOB = ${score.toFixed(1)} yds`;
  else if (hitBunker) dispScore = `${d.toFixed(1)} + 10 hazard = ${score.toFixed(1)} yds`;
  else               dispScore = `${score.toFixed(1)} yds`;

  const penaltyPill = isOOB
    ? `<div class="stat-pill bad"><span class="label">OOB Penalty</span><span class="value">+20 yds</span></div>`
    : hitBunker
    ? `<div class="stat-pill ok"><span class="label">Hazard Penalty</span><span class="value">+10 yds</span></div>`
    : '';

  resultStats.innerHTML = `
    <div class="stat-pill ${q}">
      <span class="label">Distance from Pin</span>
      <span class="value">${dispDist}</span>
    </div>
    ${penaltyPill}
    <div class="stat-pill ${q}">
      <span class="label">Score (this hole)</span>
      <span class="value">${dispScore}</span>
    </div>
    <div class="stat-pill">
      <span class="label">Hole Distance</span>
      <span class="value">${hole.distance} yds</span>
    </div>
  `;

  const roast = getHoleRoast(hole, G.holeIdx, G.landX, G.landY, d, inHole, isOOB, hitBunker);
  drawRoastOverlay(cvResult, roast);

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
    const inHole  = G.inHoleFlags[i];
    const isOOB   = G.oobFlags[i];
    const isBunker = G.bunkerFlags[i];
    const rawDist = inHole ? hole.distance : score - (isOOB ? 20 : isBunker ? 10 : 0);
    const q = inHole || isOOB ? 'bad' : isBunker ? 'ok' : rawDist < 10 ? 'good' : rawDist < 20 ? 'ok' : 'bad';
    const resultText = inHole  ? 'In hole (penalty)'
      : isOOB   ? `${rawDist.toFixed(1)} yds · OOB +20`
      : isBunker ? `${rawDist.toFixed(1)} yds · Hazard +10`
      : `${rawDist.toFixed(1)} yds from pin`;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${hole.distance} yds</td>
      <td class="${isOOB || inHole ? 'bad' : isBunker ? 'ok' : ''}">${resultText}</td>
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
    if (G.inHoleFlags[i])  return '⛳';
    if (G.oobFlags[i])     return '🚫';
    if (G.bunkerFlags[i])  return '⚠️';
    if (score < 5)  return '🎯';
    if (score < 10) return '🟢';
    if (score < 20) return '🟡';
    return '🔴';
  }).join('');
  const text = `CTP — ${date}\n${G.holeCount}-Hole · ${total.toFixed(1)} yds\n${emojiLine}\n${location.href}`;
  const btn = document.getElementById('btn-share');
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text)
      .then(() => {
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = 'Share Result'; }, 1800);
      })
      .catch(() => { prompt('Copy and share:', text); });
  } else {
    prompt('Copy and share:', text);
  }
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
  G.oobFlags = [];
  G.bunkerFlags = [];
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
  if (e.repeat || G.spaceLock) return;
  G.spaceLock = true;
  setTimeout(() => { G.spaceLock = false; }, 450);
  if (G.phase === 'aim') lockAim();
  else if (G.phase === 'power') lockPower();
  else if (G.phase === 'result') document.getElementById('btn-next').click();
});

// --- Init ---
G.seed = dailySeed();
G.isDaily = true;
startChip.textContent = seedChipText();
startChip.className = 'seed-chip daily';
