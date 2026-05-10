'use strict';

// ── RNG ──────────────────────────────────────────────────────────────────────
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
  return `deck-${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

// ── Constants ─────────────────────────────────────────────────────────────────
// GAME_SCALE is the canonical px/m used for BOTH the reference and all puzzle
// decks, so the reference is a reliable mental yardstick. Large decks may zoom
// out slightly below this value to fit the canvas, but never zoom in above it.
const GAME_SCALE      = 55;   // px per metre
const REFERENCE_W     = 4;
const REFERENCE_H     = 2.5;
const DECKS_PER_DAY   = 5;
const CANVAS_W        = 880;
const CANVAS_H        = 480;
const CONTEXT_MARGIN  = 2.5; // metres of yard shown around each deck

// ── DOM refs ──────────────────────────────────────────────────────────────────
const els = {
  screenReference: document.getElementById('screen-reference'),
  screenGuess:     document.getElementById('screen-guess'),
  screenResult:    document.getElementById('screen-result'),
  screenFinal:     document.getElementById('screen-final'),
  btnStart:        document.getElementById('btn-start'),
  btnSubmit:       document.getElementById('btn-submit'),
  btnNext:         document.getElementById('btn-next'),
  btnShare:        document.getElementById('btn-share'),
  zoomSlider:      document.getElementById('zoom-slider'),
  zoomDisplay:     document.getElementById('zoom-display'),
  btnRestart:      document.getElementById('btn-restart'),
  seedForm:        document.getElementById('seed-form'),
  seedInput:       document.getElementById('seed-input'),
  btnDaily:        document.getElementById('btn-daily'),
  seedIndicator:   document.getElementById('seed-indicator'),
  refSeedChip:     document.getElementById('ref-seed-chip'),
  guessSlider:     document.getElementById('guess-slider'),
  guessInput:      document.getElementById('guess-input'),
  runningScore:    document.getElementById('running-score'),
  roundBadge:      document.getElementById('round-badge'),
  resultBadge:     document.getElementById('result-badge'),
  resultStats:     document.getElementById('result-stats'),
  scorecard:       document.getElementById('scorecard'),
  finalScore:      document.getElementById('final-score'),
  finalTagline:    document.getElementById('final-tagline'),
  bestScore:       document.getElementById('best-score'),
  streak:          document.getElementById('streak'),
  canvasRef:       document.getElementById('canvas-reference'),
  canvasDeck:      document.getElementById('canvas-deck'),
  canvasResult:    document.getElementById('canvas-result'),
};

// ── Screen switching ──────────────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ── Wood tint: darker = bigger (subtle visual hint) ───────────────────────────
function woodTint(area) {
  if (area < 25)  return '#c49a50'; // light golden
  if (area < 55)  return '#9c6b42'; // medium brown
  if (area < 90)  return '#7a4e2a'; // darker
  return '#52321a';                  // deep espresso
}

// ── Polygon utilities ─────────────────────────────────────────────────────────
function polyBBox(pts) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of pts) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}

function polyArea(pts) {
  let a = 0;
  for (let i = 0, n = pts.length; i < n; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % n];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2;
}

function ptInPoly(px, py, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi))
      inside = !inside;
  }
  return inside;
}

// ── Deck shape generators (coords in metres, origin 0,0) ─────────────────────
function makeRect(area, rng) {
  const ratio = 1.3 + rng() * 1.4; // width:height 1.3–2.7
  const h = Math.sqrt(area / ratio);
  const w = area / h;
  return [[0,0],[w,0],[w,h],[0,h]];
}

function makeL(area, rng) {
  // Outer rectangle minus one corner
  const ratio = 1.4 + rng() * 1.2;
  const outerH = Math.sqrt(area / ratio) * 1.4;
  const outerW = outerH * ratio;
  // Cut between 25–45% of each outer dimension
  const cx = outerW * (0.25 + rng() * 0.2);
  const cy = outerH * (0.25 + rng() * 0.2);
  // Choose cut corner
  const corner = Math.floor(rng() * 4);
  let pts;
  if (corner === 0) // top-right
    pts = [[0,0],[outerW-cx,0],[outerW-cx,cy],[outerW,cy],[outerW,outerH],[0,outerH]];
  else if (corner === 1) // bottom-right
    pts = [[0,0],[outerW,0],[outerW,outerH-cy],[outerW-cx,outerH-cy],[outerW-cx,outerH],[0,outerH]];
  else if (corner === 2) // bottom-left
    pts = [[0,0],[outerW,0],[outerW,outerH],[cx,outerH],[cx,outerH-cy],[0,outerH-cy]];
  else // top-left
    pts = [[cx,0],[outerW,0],[outerW,outerH],[0,outerH],[0,cy],[cx,cy]];
  // Scale to match target area
  const actual = polyArea(pts);
  const s = Math.sqrt(area / actual);
  return pts.map(([x, y]) => [x * s, y * s]);
}

function makeU(area, rng) {
  // Rectangle with a notch cut from one side
  const ratio = 1.5 + rng() * 1.0;
  const outerH = Math.sqrt(area / ratio) * 1.5;
  const outerW = outerH * ratio;
  const notchW = outerW * (0.25 + rng() * 0.25);
  const notchH = outerH * (0.25 + rng() * 0.2);
  const notchX = (outerW - notchW) / 2;
  // Notch from bottom
  const pts = [
    [0,0],[outerW,0],[outerW,outerH],
    [notchX+notchW,outerH],[notchX+notchW,outerH-notchH],
    [notchX,outerH-notchH],[notchX,outerH],[0,outerH],
  ];
  const actual = polyArea(pts);
  const s = Math.sqrt(area / actual);
  return pts.map(([x, y]) => [x * s, y * s]);
}

function makeRounded(area, rng) {
  const ratio = 1.2 + rng() * 1.6;
  const h = Math.sqrt(area / ratio);
  const w = area / h;
  const r = Math.min(w, h) * (0.1 + rng() * 0.1);
  const steps = 5;
  const pts = [];
  function arcPts(cx, cy, a0, a1) {
    for (let i = 0; i <= steps; i++) {
      const a = a0 + (a1 - a0) * i / steps;
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
  }
  arcPts(r,     r,     Math.PI,       Math.PI * 1.5);
  arcPts(w - r, r,     Math.PI * 1.5, Math.PI * 2);
  arcPts(w - r, h - r, 0,             Math.PI * 0.5);
  arcPts(r,     h - r, Math.PI * 0.5, Math.PI);
  const actual = polyArea(pts);
  const s = Math.sqrt(area / actual);
  return pts.map(([x, y]) => [x * s, y * s]);
}

// ── Deck data generation ──────────────────────────────────────────────────────
const AREA_BRACKETS = [
  [8,  22],
  [22, 45],
  [45, 75],
  [75, 110],
  [110,150],
];

function generateDayDecks(seed = dailySeed()) {
  const rng  = mulberry32(hashSeed(seed));

  return AREA_BRACKETS.map((bracket, i) => {
    const deckRng = mulberry32(hashSeed(`${seed}-d${i}`));
    const [lo, hi] = bracket;
    const area     = lo + deckRng() * (hi - lo);
    const typeRoll = deckRng();
    let pts;
    if (typeRoll < 0.28)      pts = makeRect(area, deckRng);
    else if (typeRoll < 0.53) pts = makeL(area, deckRng);
    else if (typeRoll < 0.75) pts = makeU(area, deckRng);
    else                      pts = makeRounded(area, deckRng);

    // Hot tub: only on larger decks, only on rectangles/rounded shapes
    let hotTub = null;
    if (area >= 40 && typeRoll < 0.53 === false && deckRng() > 0.55) {
      const htSize = 1.5 + deckRng() * 0.7; // 1.5–2.2m
      const bbox2  = polyBBox(pts);
      const pad    = htSize / 2 + 0.5;
      for (let attempt = 0; attempt < 30; attempt++) {
        const mx = bbox2.minX + pad + deckRng() * (bbox2.w - pad * 2);
        const my = bbox2.minY + pad + deckRng() * (bbox2.h - pad * 2);
        const corners = [[mx-htSize/2,my-htSize/2],[mx+htSize/2,my-htSize/2],
                         [mx+htSize/2,my+htSize/2],[mx-htSize/2,my+htSize/2]];
        if (corners.every(([cx,cy]) => ptInPoly(cx, cy, pts))) {
          hotTub = { mx, my, size: htSize };
          break;
        }
      }
    }

    const bbox  = polyBBox(pts);
    const fitScale = Math.min(
      (CANVAS_W - 80) / (bbox.w + CONTEXT_MARGIN * 2),
      (CANVAS_H - 60) / (bbox.h + CONTEXT_MARGIN * 2)
    );
    // Never zoom in past GAME_SCALE — keeps all decks visually comparable to reference
    const scale = Math.min(GAME_SCALE, fitScale);
    // Centre the deck on canvas
    const ox = (CANVAS_W - bbox.w * scale) / 2 - bbox.minX * scale;
    const oy = (CANVAS_H - bbox.h * scale) / 2 - bbox.minY * scale;

    // Context features
    const hasFence   = deckRng() > 0.25;
    const fenceSides = Math.floor(deckRng() * 3) + 1; // 1-3 sides
    const hasHouse   = deckRng() > 0.5;
    const houseSide  = ['top','left','right'][Math.floor(deckRng() * 3)];

    // Items to place on deck
    const itemTypes  = ['chair','chair','table','bbq','planter'];
    const itemCount  = 1 + Math.floor(deckRng() * 3); // 1-3 items
    const items      = [];
    for (let k = 0; k < itemCount; k++) {
      const type = itemTypes[Math.floor(deckRng() * itemTypes.length)];
      // Find a valid position within the polygon
      let placed = false;
      for (let attempt = 0; attempt < 40; attempt++) {
        const px = bbox.minX + deckRng() * bbox.w;
        const py = bbox.minY + deckRng() * bbox.h;
        if (ptInPoly(px, py, pts)) {
          items.push({ type, mx: px, my: py });
          placed = true;
          break;
        }
      }
      if (!placed && pts.length > 0) {
        // Fallback: centroid
        const cx = pts.reduce((s,[x])=>s+x,0)/pts.length;
        const cy = pts.reduce((s,[,y])=>s+y,0)/pts.length;
        items.push({ type, mx: cx, my: cy });
      }
    }

    // Default zoom: show deck at ~80% of canvas so there's visible context
    const deckPxW    = bbox.w * scale;
    const deckPxH    = bbox.h * scale;
    const zoomToFill = Math.min((CANVAS_W * 0.8) / deckPxW, (CANVAS_H * 0.8) / deckPxH);
    const defaultZoom = Math.max(ZOOM_MIN / 100, Math.min(ZOOM_MAX / 100, zoomToFill));

    return { pts, area: Math.round(area), bbox, scale, ox, oy,
             hasFence, fenceSides, hasHouse, houseSide, items, hotTub,
             defaultZoom, grainSeed: hashSeed(`${seed}-g${i}`) };
  });
}

// ── Drawing: yard ─────────────────────────────────────────────────────────────
// scale drives texture density — high scale (close up) = coarse grass,
// low scale (far away) = fine texture, giving an instinctive sense of altitude.
function drawYard(ctx, w, h, rng, scale = GAME_SCALE) {
  // Altitude factor: 1.0 = ground level (GAME_SCALE), <1 = higher up
  const alt   = Math.min(1, scale / GAME_SCALE);

  // Grass colour gets slightly more washed-out and uniform at altitude
  const g1 = `hsl(105,${Math.round(52 + alt * 20)}%,${Math.round(18 + alt * 8)}%)`;
  const g2 = `hsl(110,${Math.round(56 + alt * 22)}%,${Math.round(22 + alt * 10)}%)`;
  const g3 = `hsl(105,${Math.round(50 + alt * 18)}%,${Math.round(17 + alt * 7)}%)`;
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, g1); g.addColorStop(0.5, g2); g.addColorStop(1, g3);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Stripe height proportional to scale — big stripes when close, fine when far
  const stripeH = Math.max(3, scale * 0.33);
  for (let y = 0; y < h; y += stripeH) {
    ctx.fillStyle = Math.floor(y / stripeH) % 2 === 0
      ? 'rgba(255,255,255,0.025)'
      : 'rgba(0,0,0,0.04)';
    ctx.fillRect(0, y, w, stripeH);
  }

  // Scatter dots: more numerous and smaller when high up (fine texture)
  const dotCount = Math.round(60 / alt);
  const dotR     = Math.max(0.5, scale * 0.035);
  for (let i = 0; i < dotCount; i++) {
    const px = rng() * w, py = rng() * h;
    ctx.beginPath();
    ctx.arc(px, py, dotR * (0.5 + rng()), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${rng()>.5?'180,220,120':'60,100,30'},${0.18+rng()*.15})`;
    ctx.fill();
  }
}

// ── Drawing: fence ────────────────────────────────────────────────────────────
function drawFence(ctx, W, H, deck, rng) {
  const { bbox, scale, ox, oy, fenceSides } = deck;
  const pad   = 18;
  const postW = Math.max(4, scale * 0.12);
  const railH = Math.max(2, scale * 0.05);

  ctx.save();
  ctx.fillStyle   = '#c8a06a';
  ctx.strokeStyle = '#8b6340';
  ctx.lineWidth   = 1;

  const sides = [
    { axis:'h', y: oy + bbox.minY * scale - pad,       x0: 0,   x1: W  },
    { axis:'h', y: oy + (bbox.minY+bbox.h)*scale + pad,x0: 0,   x1: W  },
    { axis:'v', x: ox + bbox.minX * scale - pad,       y0: 0,   y1: H  },
    { axis:'v', x: ox + (bbox.minX+bbox.w)*scale + pad,y0: 0,   y1: H  },
  ].slice(0, fenceSides);

  for (const side of sides) {
    if (side.axis === 'h') {
      const y = side.y;
      // Rails
      ctx.fillStyle = '#c8a06a';
      ctx.fillRect(side.x0, y - railH, side.x1 - side.x0, railH);
      ctx.fillRect(side.x0, y + 4,     side.x1 - side.x0, railH);
      // Posts
      for (let x = side.x0; x < side.x1; x += 22) {
        ctx.fillStyle = '#b08050';
        ctx.fillRect(x, y - 14, postW, 28);
        ctx.strokeRect(x, y - 14, postW, 28);
      }
    } else {
      const x = side.x;
      ctx.fillStyle = '#c8a06a';
      ctx.fillRect(x - railH, side.y0, railH, side.y1 - side.y0);
      ctx.fillRect(x + 4,     side.y0, railH, side.y1 - side.y0);
      for (let y = side.y0; y < side.y1; y += 22) {
        ctx.fillStyle = '#b08050';
        ctx.fillRect(x - 14, y, 28, postW);
        ctx.strokeRect(x - 14, y, 28, postW);
      }
    }
  }
  ctx.restore();
}

// ── Drawing: house wall ───────────────────────────────────────────────────────
function drawHouseWall(ctx, W, H, side) {
  const thickness = 28;
  ctx.save();
  ctx.fillStyle = '#d9c9a8';
  if (side === 'top')  ctx.fillRect(0, 0, W, thickness);
  if (side === 'left') ctx.fillRect(0, 0, thickness, H);
  if (side === 'right')ctx.fillRect(W - thickness, 0, thickness, H);

  // Siding lines
  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  ctx.lineWidth   = 1;
  if (side === 'top') {
    for (let x = 0; x < W; x += 30) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,thickness); ctx.stroke(); }
  } else {
    for (let y = 0; y < H; y += 14) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(thickness,y); ctx.stroke(); }
  }
  ctx.restore();
}

// ── Drawing: wood grain (polygon-aware) ───────────────────────────────────────
function buildPolyPath(ctx, pts, ox, oy, scale) {
  ctx.beginPath();
  ctx.moveTo(ox + pts[0][0] * scale, oy + pts[0][1] * scale);
  for (let i = 1; i < pts.length; i++)
    ctx.lineTo(ox + pts[i][0] * scale, oy + pts[i][1] * scale);
  ctx.closePath();
}

function drawPolyWood(ctx, pts, ox, oy, scale, grainSeed, tint) {
  const rng  = mulberry32(grainSeed);
  const bbox = polyBBox(pts);
  const bx   = ox + bbox.minX * scale;
  const by   = oy + bbox.minY * scale;
  const bw   = bbox.w * scale;
  const bh   = bbox.h * scale;

  ctx.save();
  buildPolyPath(ctx, pts, ox, oy, scale);
  ctx.clip();

  // Base — use tint when provided, otherwise pick randomly
  const bases = ['#8b5e3c','#7a5230','#9c6b42','#8a6035'];
  ctx.fillStyle = tint || bases[Math.floor(rng() * bases.length)];
  ctx.fillRect(bx, by, bw, bh);

  // Planks
  const plankH = Math.max(8, scale * 0.35) * (0.85 + rng() * 0.3);
  let py = by;
  let alt = false;
  while (py < by + bh) {
    const ph = plankH * (0.88 + rng() * 0.24);
    ctx.fillStyle = alt ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.045)';
    ctx.fillRect(bx, py, bw, Math.min(ph, by + bh - py));
    py += ph; alt = !alt;
  }

  // Grain
  for (let i = 0; i < 30; i++) {
    const lx = bx + rng() * bw;
    const wav = (rng() - 0.5) * 7;
    ctx.beginPath();
    ctx.moveTo(lx, by);
    ctx.bezierCurveTo(lx+wav, by+bh*.33, lx-wav, by+bh*.66, lx+wav*.5, by+bh);
    ctx.strokeStyle = `rgba(${rng()>.5?'55,25,8':'175,115,55'},${0.07+rng()*0.09})`;
    ctx.lineWidth   = 0.5 + rng();
    ctx.stroke();
  }

  // Knot
  if (rng() > 0.35) {
    const kx = bx + 0.2*bw + rng()*0.6*bw;
    const ky = by + 0.2*bh + rng()*0.6*bh;
    const kr = 3 + rng() * 5;
    const kg = ctx.createRadialGradient(kx,ky,0,kx,ky,kr*2.5);
    kg.addColorStop(0,'rgba(28,12,4,0.7)');
    kg.addColorStop(0.5,'rgba(75,38,12,0.4)');
    kg.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle = kg;
    ctx.beginPath();
    ctx.ellipse(kx,ky,kr*2.5,kr,rng()*Math.PI,0,Math.PI*2);
    ctx.fill();
  }

  // Edge shading
  const inset = ctx.createLinearGradient(bx,by,bx,by+bh);
  inset.addColorStop(0,'rgba(0,0,0,0.18)'); inset.addColorStop(0.06,'rgba(0,0,0,0)');
  inset.addColorStop(0.94,'rgba(0,0,0,0)'); inset.addColorStop(1,'rgba(0,0,0,0.22)');
  ctx.fillStyle = inset; ctx.fillRect(bx,by,bw,bh);

  ctx.restore();
}

function drawPolyFrame(ctx, pts, ox, oy, scale) {
  ctx.save();
  // Drop shadow
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur  = 18; ctx.shadowOffsetX = 4; ctx.shadowOffsetY = 6;
  buildPolyPath(ctx, pts, ox, oy, scale);
  ctx.fillStyle = '#000'; ctx.fill();
  ctx.restore();
  // Border
  buildPolyPath(ctx, pts, ox, oy, scale);
  ctx.strokeStyle = '#5a3518'; ctx.lineWidth = 3; ctx.stroke();
}

// ── Drawing: items ────────────────────────────────────────────────────────────
function drawChair(ctx, px, py, scale) {
  const s = scale * 0.6;
  ctx.save(); ctx.translate(px, py);
  // Seat
  ctx.fillStyle = '#4a3020';
  ctx.fillRect(-s/2, -s/2, s, s);
  // Back
  ctx.fillStyle = '#3a2515';
  ctx.fillRect(-s/2, -s/2 - s*0.35, s, s*0.12);
  // Legs (dots)
  ctx.fillStyle = '#2a1a0d';
  const leg = s * 0.1;
  [[-1,-1],[-1,1],[1,-1],[1,1]].forEach(([dx,dy]) => {
    ctx.beginPath(); ctx.arc(dx*s*.38, dy*s*.38, leg, 0, Math.PI*2); ctx.fill();
  });
  ctx.restore();
}

function drawTable(ctx, px, py, scale) {
  const r = scale * 0.45;
  ctx.save(); ctx.translate(px, py);
  // Shadow
  ctx.beginPath(); ctx.ellipse(4, 4, r, r*.6, 0, 0, Math.PI*2);
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fill();
  // Top
  ctx.beginPath(); ctx.ellipse(0, 0, r, r*.65, 0, 0, Math.PI*2);
  ctx.fillStyle = '#c8a06a'; ctx.fill();
  ctx.strokeStyle = '#8b6030'; ctx.lineWidth = 2; ctx.stroke();
  // Centre post
  ctx.beginPath(); ctx.arc(0, 0, r*.15, 0, Math.PI*2);
  ctx.fillStyle = '#8b6030'; ctx.fill();
  ctx.restore();
}

function drawBBQ(ctx, px, py, scale) {
  const w = scale * 0.9, h = scale * 0.5;
  ctx.save(); ctx.translate(px - w/2, py - h/2);
  // Body
  ctx.fillStyle = '#2a2a2a';
  ctx.beginPath();
  ctx.rect(0, h*.35, w, h*.65);
  ctx.fill();
  // Dome lid
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.ellipse(w/2, h*.35, w/2, h*.38, 0, Math.PI, 0);
  ctx.fill();
  // Legs
  ctx.strokeStyle = '#111'; ctx.lineWidth = Math.max(1.5, scale*.04);
  [[w*.2,h],[w*.2+scale*.1,h+scale*.3],[w*.8,h],[w*.8-scale*.1,h+scale*.3]].forEach(([x,y],i,a)=>{
    if(i%2===0){ctx.beginPath();ctx.moveTo(x,y);}
    else{ctx.lineTo(x,y);ctx.stroke();}
  });
  // Grate lines
  ctx.strokeStyle = 'rgba(255,200,80,0.4)'; ctx.lineWidth = 1;
  for(let gx=w*.12;gx<w*.88;gx+=w*.15){
    ctx.beginPath(); ctx.moveTo(gx,h*.05); ctx.lineTo(gx,h*.35); ctx.stroke();
  }
  ctx.restore();
}

function drawPlanter(ctx, px, py, scale) {
  const r = scale * 0.22;
  ctx.save(); ctx.translate(px, py);
  ctx.beginPath(); ctx.ellipse(0, 0, r, r*.7, 0, 0, Math.PI*2);
  ctx.fillStyle = '#6b4226'; ctx.fill();
  ctx.strokeStyle = '#4a2c18'; ctx.lineWidth = 1.5; ctx.stroke();
  // Plant top
  ctx.beginPath(); ctx.ellipse(0, -r*.2, r*.7, r*.45, 0, 0, Math.PI*2);
  ctx.fillStyle = '#2d6b1a'; ctx.fill();
  ctx.restore();
}

function drawItems(ctx, items, ox, oy, scale) {
  for (const item of items) {
    const px = ox + item.mx * scale;
    const py = oy + item.my * scale;
    if      (item.type === 'chair')   drawChair(ctx, px, py, scale);
    else if (item.type === 'table')   drawTable(ctx, px, py, scale);
    else if (item.type === 'bbq')     drawBBQ(ctx, px, py, scale);
    else if (item.type === 'planter') drawPlanter(ctx, px, py, scale);
  }
}

// ── Drawing: hot tub ──────────────────────────────────────────────────────────
function drawHotTub(ctx, deck) {
  const { hotTub: ht, ox, oy, scale } = deck;
  const px = ox + ht.mx * scale;
  const py = oy + ht.my * scale;
  const r  = (ht.size / 2) * scale;

  ctx.save();
  // Outer rim
  ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2);
  ctx.fillStyle = '#5a3518'; ctx.fill();
  // Water
  ctx.beginPath(); ctx.arc(px, py, r * 0.88, 0, Math.PI * 2);
  const wg = ctx.createRadialGradient(px, py, 0, px, py, r);
  wg.addColorStop(0, '#4ab0d0'); wg.addColorStop(1, '#1a6080');
  ctx.fillStyle = wg; ctx.fill();
  // Shimmer
  ctx.beginPath();
  ctx.ellipse(px - r * 0.25, py - r * 0.25, r * 0.38, r * 0.2, -0.4, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(180,240,255,0.3)'; ctx.fill();
  // Jets (small circles around edge)
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ctx.beginPath(); ctx.arc(px + Math.cos(a) * r * 0.72, py + Math.sin(a) * r * 0.72, r * 0.07, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fill();
  }
  ctx.restore();
}

// ── Draw a puzzle deck onto a canvas ─────────────────────────────────────────
function drawPuzzleDeck(canvas, deck, zoom = 1) {
  const ctx = canvas.getContext('2d');
  const W   = canvas.width, H = canvas.height;
  const rng = mulberry32(hashSeed(`yard-${deck.grainSeed}`));

  ctx.clearRect(0, 0, W, H);

  // Everything zooms together — grass stripes are the scale cue.
  // Yard is drawn oversized so no black edges appear at minimum zoom.
  const minZoom = ZOOM_MIN / 100;
  const yardW   = W / minZoom;
  const yardH   = H / minZoom;
  const yardOX  = -(yardW - W) / 2;
  const yardOY  = -(yardH - H) / 2;

  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(zoom, zoom);
  ctx.translate(-W / 2, -H / 2);

  // Oversized yard — always covers canvas even at minimum zoom
  ctx.save();
  ctx.translate(yardOX, yardOY);
  drawYard(ctx, yardW, yardH, rng, deck.scale);
  ctx.restore();

  if (deck.hasHouse) drawHouseWall(ctx, W, H, deck.houseSide);
  if (deck.hasFence) drawFence(ctx, W, H, deck, rng);
  drawPolyFrame(ctx, deck.pts, deck.ox, deck.oy, deck.scale);
  drawPolyWood(ctx, deck.pts, deck.ox, deck.oy, deck.scale, deck.grainSeed, woodTint(deck.area));
  if (deck.hotTub) drawHotTub(ctx, deck);
  drawItems(ctx, deck.items, deck.ox, deck.oy, deck.scale);

  ctx.restore();
}

// ── Reference screen ──────────────────────────────────────────────────────────
function drawReference() {
  const canvas = els.canvasRef;
  const ctx    = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const rng = mulberry32(hashSeed('reference-deck-static'));

  drawYard(ctx, W, H, rng);

  const dw = REFERENCE_W * GAME_SCALE;
  const dh = REFERENCE_H * GAME_SCALE;
  const dx = (W - dw) / 2;
  const dy = (H - dh) / 2 - 20;

  // Shadow + border
  ctx.save();
  ctx.shadowColor='rgba(0,0,0,0.55)'; ctx.shadowBlur=18; ctx.shadowOffsetX=4; ctx.shadowOffsetY=6;
  ctx.fillStyle='#000'; ctx.fillRect(dx,dy,dw,dh);
  ctx.restore();
  ctx.strokeStyle='#5a3518'; ctx.lineWidth=3; ctx.strokeRect(dx+1.5,dy+1.5,dw-3,dh-3);

  drawPolyWood(ctx,[[0,0],[REFERENCE_W,0],[REFERENCE_W,REFERENCE_H],[0,REFERENCE_H]],dx,dy,GAME_SCALE,hashSeed('ref-grain'));

  // Dimension arrows
  function dimArrow(x1,y1,x2,y2,label,above) {
    const mx=(x1+x2)/2, my=(y1+y2)/2, off=above?-14:14;
    ctx.save(); ctx.strokeStyle='rgba(255,220,100,0.9)'; ctx.fillStyle='rgba(255,220,100,0.9)'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    [[x1,y1,x2,y2],[x2,y2,x1,y1]].forEach(([ax,ay,bx,by])=>{
      const a=Math.atan2(ay-by,ax-bx);
      ctx.beginPath(); ctx.moveTo(ax,ay);
      ctx.lineTo(ax-8*Math.cos(a-.4),ay-8*Math.sin(a-.4));
      ctx.lineTo(ax-8*Math.cos(a+.4),ay-8*Math.sin(a+.4));
      ctx.closePath(); ctx.fill();
    });
    ctx.font='bold 13px "Arial Narrow",Arial,sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillStyle='#fff3c0';
    if(Math.abs(y2-y1)<2) { ctx.fillText(label,mx,my+off); }
    else { ctx.save(); ctx.translate(mx+off,my); ctx.rotate(-Math.PI/2); ctx.fillText(label,0,0); ctx.restore(); }
    ctx.restore();
  }
  const pad=22;
  dimArrow(dx,dy-pad,dx+dw,dy-pad,`${REFERENCE_W} m`,true);
  dimArrow(dx+dw+pad,dy,dx+dw+pad,dy+dh,`${REFERENCE_H} m`,false);

  // Area label
  ctx.save();
  ctx.font='bold 28px "Arial Narrow",Arial,sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillStyle='rgba(0,0,0,0.45)'; ctx.fillText('10 m²',dx+dw/2+1,dy+dh/2+1);
  ctx.fillStyle='rgba(255,240,180,0.92)'; ctx.fillText('10 m²',dx+dw/2,dy+dh/2);
  ctx.restore();

  // 1m grid
  ctx.save(); ctx.strokeStyle='rgba(255,220,100,0.35)'; ctx.lineWidth=1; ctx.setLineDash([3,4]);
  for(let m=0;m<=REFERENCE_W;m++){const lx=dx+m*GAME_SCALE;ctx.beginPath();ctx.moveTo(lx,dy);ctx.lineTo(lx,dy+dh);ctx.stroke();}
  for(let m=0;m<=REFERENCE_H;m++){const ly=dy+m*GAME_SCALE;ctx.beginPath();ctx.moveTo(dx,ly);ctx.lineTo(dx+dw,ly);ctx.stroke();}
  ctx.restore();
}

// ── Slider / number input sync ────────────────────────────────────────────────
const GUESS_MIN = 5;
const GUESS_MAX = 200;
const ZOOM_MIN  = 70;   // 0.7×
const ZOOM_MAX  = 200;  // 2.0×

function clampGuess(v) { return Math.max(GUESS_MIN, Math.min(GUESS_MAX, Math.round(v))); }

function syncFromValue(val) {
  val = clampGuess(val);
  els.guessSlider.value = val;
  els.guessInput.value  = val;
  const pct = ((val - GUESS_MIN) / (GUESS_MAX - GUESS_MIN)) * 100;
  els.guessSlider.style.setProperty('--pct', `${pct.toFixed(1)}%`);
}

// alias used elsewhere in the file
function updateSlider() { syncFromValue(Number(els.guessSlider.value)); }

els.guessSlider.addEventListener('input', () => syncFromValue(Number(els.guessSlider.value)));

els.guessInput.addEventListener('input', () => {
  const val = Number(els.guessInput.value);
  if (!isNaN(val)) syncFromValue(val);
});

// Clamp on blur in case user types out-of-range value
els.guessInput.addEventListener('blur', () => {
  syncFromValue(Number(els.guessInput.value) || 50);
});

// ── Scoring ───────────────────────────────────────────────────────────────────
function calcRoundScore(guess, actual) {
  return Math.min(200, Math.round(Math.abs(guess - actual) / actual * 100));
}

function scoreClass(pct) {
  if (pct <= 15) return 'good';
  if (pct <= 35) return 'ok';
  return 'bad';
}

function scoreEmoji(pct) {
  if (pct <= 10) return '🎯';
  if (pct <= 20) return '📏';
  if (pct <= 40) return '📐';
  return '🪵';
}

// ── Quip system ───────────────────────────────────────────────────────────────
function pickQuip(guess, actual) {
  const pct  = (guess - actual) / actual; // positive = over, negative = under
  const absPct = Math.abs(pct);

  if (guess === actual)
    return "Perfect score. I don't know whether to be impressed or suspicious.";
  if (absPct <= 0.05)
    return "I've been measuring decks for 30 years and that's damn impressive.";
  if (absPct <= 0.12)
    return "Sharp eye. You've handled some wood in your time.";

  if (pct > 1.0)
    return `${guess}m²? That's not a deck, that's an airport terminal.`;
  if (pct > 0.6)
    return `Whoa. You're measuring in feet, not metres, aren't you.`;
  if (pct > 0.35)
    return `${guess}m²? Bold. I like the confidence, but come on.`;
  if (pct > 0.18)
    return `A touch generous there. Maybe invest in a tape measure.`;

  if (pct < -0.6)
    return `You thought ${guess}m²? That deck has more square footage than my apartment.`;
  if (pct < -0.35)
    return `Come on now. Open your eyes a little wider.`;
  if (pct < -0.18)
    return `A touch conservative. Have more faith in the deck.`;

  if (actual >= 100)
    return `Fun fact: the average backyard deck is around 20m². This one went... differently.`;
  if (actual <= 15)
    return `Tiny but mighty. A deck is a deck.`;

  const randoms = [
    `My neighbour Gerald put in a ${actual + 18}m² deck last spring. His marriage did not survive it.`,
    `They say size doesn't matter. They've never had to stain one.`,
    `A man once asked me how big his deck was. I told him: big enough. He cried.`,
    `The world record for largest residential deck is ${actual + 312}m². This ain't it.`,
    `I once estimated a deck wrong by ${Math.abs(Math.round(pct * 100))}%. We don't talk about that.`,
    `My brother-in-law built a ${actual + 22}m² deck. Never finished it. Still married though, somehow.`,
    `${actual}m². That's divisible by... actually never mind.`,
  ];
  return randoms[Math.floor(Math.abs(hashSeed(String(guess * actual))) % randoms.length)];
}

// ── Funny man drawing ─────────────────────────────────────────────────────────
function drawFunnyMan(ctx, canvasW, canvasH, quip) {
  const mx = canvasW - 54; // man centre-x (bottom-right)
  const my = canvasH - 18; // man feet-y
  const sc = 1;            // scale factor

  ctx.save();

  // ── Speech bubble ──────────────────────────────────────────────────────────
  ctx.font = 'bold 12px "Arial Narrow",Arial,sans-serif';
  const maxW   = Math.min(320, canvasW - 100);
  // Word-wrap quip into lines
  const words  = quip.split(' ');
  const lines  = [];
  let line     = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW - 16) { lines.push(line); line = word; }
    else line = test;
  }
  if (line) lines.push(line);

  const lh  = 16, pad = 10;
  const bw  = maxW;
  const bh  = lines.length * lh + pad * 2;
  const bx  = mx - bw - 20;
  const by  = my - 130 - bh;
  const br  = 10;
  const tailX = mx - 16;
  const tailY = by + bh;

  // Bubble fill
  ctx.fillStyle = 'rgba(255,252,235,0.96)';
  ctx.strokeStyle = '#5a3518';
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, br);
  else ctx.rect(bx, by, bw, bh);
  ctx.fill(); ctx.stroke();

  // Tail pointing to man
  ctx.beginPath();
  ctx.moveTo(tailX - 8, tailY - 1);
  ctx.lineTo(tailX,     tailY + 14);
  ctx.lineTo(tailX + 8, tailY - 1);
  ctx.fillStyle = 'rgba(255,252,235,0.96)'; ctx.fill();
  ctx.strokeStyle = '#5a3518'; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(tailX - 8, tailY);
  ctx.lineTo(tailX,     tailY + 14);
  ctx.lineTo(tailX + 8, tailY);
  ctx.stroke();

  // Text
  ctx.fillStyle = '#2a1500';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  lines.forEach((l, i) => ctx.fillText(l, bx + pad, by + pad + i * lh));

  // ── Man ────────────────────────────────────────────────────────────────────
  ctx.translate(mx, my);

  // Legs
  ctx.strokeStyle = '#3a2010'; ctx.lineWidth = 3 * sc;
  ctx.beginPath(); ctx.moveTo(-7*sc, -28*sc); ctx.lineTo(-9*sc, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo( 7*sc, -28*sc); ctx.lineTo( 9*sc, 0); ctx.stroke();

  // Body
  ctx.fillStyle = '#e87820'; // orange hi-vis vest
  ctx.beginPath();
  ctx.moveTo(-10*sc, -60*sc);
  ctx.lineTo( 10*sc, -60*sc);
  ctx.lineTo(  8*sc, -28*sc);
  ctx.lineTo( -8*sc, -28*sc);
  ctx.closePath(); ctx.fill();

  // Vest stripe
  ctx.strokeStyle = 'rgba(255,220,0,0.7)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-10*sc,-48*sc); ctx.lineTo(10*sc,-48*sc); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-10*sc,-40*sc); ctx.lineTo(10*sc,-40*sc); ctx.stroke();

  // Arms (waving slightly)
  ctx.strokeStyle = '#3a2010'; ctx.lineWidth = 3 * sc;
  ctx.beginPath(); ctx.moveTo(-10*sc,-55*sc); ctx.lineTo(-22*sc,-42*sc); ctx.stroke();
  ctx.beginPath(); ctx.moveTo( 10*sc,-55*sc); ctx.lineTo( 22*sc,-44*sc); ctx.stroke();

  // Head
  ctx.fillStyle = '#f5c89a';
  ctx.beginPath(); ctx.arc(0, -72*sc, 12*sc, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = '#c8885a'; ctx.lineWidth = 1;
  ctx.stroke();

  // Eyes
  ctx.fillStyle = '#2a1500';
  ctx.beginPath(); ctx.arc(-4*sc, -73*sc, 1.5*sc, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc( 4*sc, -73*sc, 1.5*sc, 0, Math.PI*2); ctx.fill();

  // Smile
  ctx.strokeStyle = '#2a1500'; ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, -69*sc, 5*sc, 0.2, Math.PI - 0.2);
  ctx.stroke();

  // Hard hat (orange)
  ctx.fillStyle = '#f57c00';
  ctx.beginPath();
  ctx.ellipse(0, -80*sc, 14*sc, 5*sc, 0, Math.PI, 0);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, -80*sc, 10*sc, Math.PI, 0);
  ctx.fill();
  ctx.strokeStyle = '#bf5400'; ctx.lineWidth = 1;
  ctx.stroke();

  ctx.restore();
}

// ── Result canvas ─────────────────────────────────────────────────────────────
function drawResultDeck(deck, guess) {
  const canvas = els.canvasResult;
  drawPuzzleDeck(canvas, deck);

  const ctx  = canvas.getContext('2d');
  const bbox = polyBBox(deck.pts);
  const cx   = deck.ox + (bbox.minX + bbox.w / 2) * deck.scale;
  const cy   = deck.oy + (bbox.minY + bbox.h / 2) * deck.scale;

  // Pill background
  const label = `Actual: ${deck.area} m²`;
  ctx.save();
  ctx.font = 'bold 20px "Arial Narrow",Arial,sans-serif';
  const tw = ctx.measureText(label).width;
  const ph = 32, pw = tw + 24, pr = 10;
  const px = cx - pw / 2, py = cy - ph / 2;
  ctx.fillStyle = 'rgba(0,0,0,0.72)';
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(px, py, pw, ph, pr);
  } else {
    ctx.rect(px, py, pw, ph);
  }
  ctx.fill();
  ctx.fillStyle = '#fff3c0';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, cx, cy);
  ctx.restore();

  const quip = pickQuip(guess, deck.area);
  drawFunnyMan(ctx, canvas.width, canvas.height, quip);
}

// ── Round result UI ───────────────────────────────────────────────────────────
function showRoundResult(deckIndex, guess) {
  const deck  = state.decks[deckIndex];
  const score = calcRoundScore(guess, deck.area);
  const cls   = scoreClass(score);
  const diff  = (guess - deck.area).toFixed(1);
  const sign  = diff > 0 ? '+' : '';

  state.guesses.push({ guess, actual: deck.area, score });
  state.runningScore += score;

  drawResultDeck(deck, guess);

  els.resultBadge.textContent = `Deck ${deckIndex + 1} of ${DECKS_PER_DAY} — Result`;
  els.resultStats.innerHTML = `
    <div class="stat-pill">
      <span class="label">Your guess</span>
      <span class="value">${guess} m²</span>
    </div>
    <div class="stat-pill">
      <span class="label">Actual size</span>
      <span class="value">${deck.area} m²</span>
    </div>
    <div class="stat-pill ${cls}">
      <span class="label">Difference</span>
      <span class="value">${sign}${diff} m²</span>
    </div>
    <div class="stat-pill ${cls}">
      <span class="label">Points (% off)</span>
      <span class="value">${score}</span>
    </div>
  `;

  const isLast = deckIndex === DECKS_PER_DAY - 1;
  els.btnNext.textContent = isLast ? 'See Final Score' : 'Next Deck';

  showScreen('screen-result');
}

// ── Final score screen ────────────────────────────────────────────────────────
const FINAL_LINES = [
  [0,  20,  "Flawless. You have an unusually firm grasp on wood."],
  [21, 50,  "Solid work. You clearly know your lumber."],
  [51, 90,  "Respectable — a few inches off in places, but who's counting."],
  [91, 140, "Some of these decks really got away from you."],
  [141,300, "Your tape measure may be broken. Or your eyes. Or both."],
];

function buildFinalScreen() {
  const total = state.runningScore;
  const line  = FINAL_LINES.find(([lo,hi]) => total >= lo && total <= hi) || FINAL_LINES.at(-1);
  els.finalTagline.textContent = line[2];
  els.finalScore.textContent   = total;

  const rows = state.guesses.map((g, i) => {
    const cls = scoreClass(g.score);
    const diff = (g.guess - g.actual).toFixed(1);
    const sign = diff > 0 ? '+' : '';
    return `<tr>
      <td>Deck ${i+1}</td>
      <td>${g.guess} m²</td>
      <td>${g.actual} m²</td>
      <td class="${cls}">${sign}${diff} m²</td>
      <td class="${cls}">${g.score} pts</td>
    </tr>`;
  }).join('');

  els.scorecard.innerHTML = `
    <thead><tr>
      <th>#</th><th>Guess</th><th>Actual</th><th>Diff</th><th>Score</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  `;

  // Persist best score
  const stored = Number(localStorage.getItem('dmc-best') || 9999);
  if (total < stored) localStorage.setItem('dmc-best', total);
  els.bestScore.textContent = Math.min(total, stored);

  showScreen('screen-final');
}

// ── Share ─────────────────────────────────────────────────────────────────────
function buildShareText() {
  const d       = new Date();
  const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const isDaily = state.seed === dailySeed();
  const seedLine = isDaily ? `📅 ${dateStr}` : `🌱 Seed: ${state.seed}`;

  const emojis  = state.guesses.map(g => scoreEmoji(g.score)).join('  ');
  const verdict = FINAL_LINES.find(([lo, hi]) => state.runningScore >= lo && state.runningScore <= hi)?.[2]
    ?? FINAL_LINES.at(-1)[2];

  const shareUrl = `${location.origin}${location.pathname}?seed=${encodeURIComponent(state.seed)}`;

  return [
    `📐 Deck Measuring Contest`,
    seedLine,
    ``,
    emojis,
    ``,
    `Score: ${state.runningScore} pts`,
    `"${verdict}"`,
    ``,
    shareUrl,
  ].join('\n');
}

// ── Game state ────────────────────────────────────────────────────────────────
const state = {
  decks:        [],
  current:      0,
  guesses:      [],
  runningScore: 0,
  seed:         dailySeed(),
  zoom:         1,
};

// ── Seed loading ──────────────────────────────────────────────────────────────
function loadSeed(seed) {
  state.seed         = seed;
  state.decks        = generateDayDecks(seed);
  state.current      = 0;
  state.guesses      = [];
  state.runningScore = 0;
  els.guessSlider.value = 50;
  updateSlider();
  els.runningScore.textContent = 0;

  const isDaily   = seed === dailySeed();
  const chipClass = isDaily ? 'daily' : 'custom';
  const chipText  = isDaily ? 'Daily Game' : `Seed: ${seed}`;

  [els.refSeedChip, els.seedIndicator].forEach(el => {
    el.className  = `seed-chip ${chipClass}`;
    el.textContent = chipText;
  });

  els.seedInput.value = seed;

  drawReference();
  showScreen('screen-reference');
}

// ── Event wiring ──────────────────────────────────────────────────────────────
function setZoom(val) {
  state.zoom = val;
  els.zoomSlider.value = Math.round(val * 100);
  els.zoomDisplay.textContent = `${val.toFixed(1)}×`;
  const pct = ((val * 100 - ZOOM_MIN) / (ZOOM_MAX - ZOOM_MIN)) * 100;
  els.zoomSlider.style.setProperty('--pct', `${pct.toFixed(1)}%`);
}

function resetZoom() {
  const deck = state.decks[state.current];
  setZoom(deck ? deck.defaultZoom : 1);
}

els.zoomSlider.addEventListener('input', () => {
  setZoom(Number(els.zoomSlider.value) / 100);
  drawPuzzleDeck(els.canvasDeck, state.decks[state.current], state.zoom);
});

els.btnStart.addEventListener('click', () => {
  resetZoom();
  drawPuzzleDeck(els.canvasDeck, state.decks[0], state.zoom);
  els.roundBadge.textContent = `Deck 1 of ${DECKS_PER_DAY}`;
  showScreen('screen-guess');
});

els.btnSubmit.addEventListener('click', () => {
  const guess = clampGuess(Number(els.guessInput.value) || 50);
  showRoundResult(state.current, guess);
});

els.btnNext.addEventListener('click', () => {
  state.current++;
  if (state.current >= DECKS_PER_DAY) {
    buildFinalScreen();
    return;
  }
  // Reset slider, zoom, and draw next deck
  els.guessSlider.value = 50;
  updateSlider();
  resetZoom();
  drawPuzzleDeck(els.canvasDeck, state.decks[state.current], state.zoom);
  els.roundBadge.textContent     = `Deck ${state.current + 1} of ${DECKS_PER_DAY}`;
  els.runningScore.textContent   = state.runningScore;
  showScreen('screen-guess');
});

els.btnShare.addEventListener('click', () => {
  const text = buildShareText();
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      els.btnShare.textContent = 'Copied!';
      setTimeout(() => { els.btnShare.textContent = 'Share Result'; }, 2000);
    });
  } else {
    prompt('Copy your result:', text);
  }
});

els.btnRestart.addEventListener('click', () => loadSeed(state.seed));

els.seedForm.addEventListener('submit', e => {
  e.preventDefault();
  const val = els.seedInput.value.trim();
  if (val) loadSeed(val);
});

els.btnDaily.addEventListener('click', () => {
  els.seedInput.value = '';
  loadSeed(dailySeed());
});

// ── Init ──────────────────────────────────────────────────────────────────────
const storedBest = localStorage.getItem('dmc-best');
if (storedBest) els.bestScore.textContent = storedBest;

const urlSeed = new URLSearchParams(location.search).get('seed');
loadSeed(urlSeed || dailySeed());
