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
  return `rat-race-${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

// ── City grid ─────────────────────────────────────────────────────────────────
const CW = 880, CH = 520;
const STREET = 40;
const COLS = 4, ROWS = 3;
const BW = (CW - (COLS + 1) * STREET) / COLS;   // 170
const BH = (CH - (ROWS + 1) * STREET) / ROWS;   // 120

const VSTREET_CX = Array.from({ length: COLS + 1 }, (_, i) => i * (BW + STREET) + STREET / 2);
const HSTREET_CY = Array.from({ length: ROWS + 1 }, (_, i) => i * (BH + STREET) + STREET / 2);

function buildingRect(col, row) {
  return { x: STREET + col * (BW + STREET), y: STREET + row * (BH + STREET), w: BW, h: BH };
}

// ── Building interior constants ───────────────────────────────────────────────
const WALL_T    = 8;    // interior wall thickness
const DOOR_HALF = 18;   // half-width of door opening
const TARGET_R  = 16;   // interaction radius for contamination targets

// ── NPC constants ─────────────────────────────────────────────────────────────
const PERSON_COUNT     = 22;
const PERSON_SPEED_MIN = 38;
const PERSON_SPEED_MAX = 62;
const EXT_PATROL_SPEED = 68;
const EXT_CHASE_SPEED  = 172;
const CHASE_R          = 115;
const KILL_R           = 11;
const INFECT_R         = 24;
const CHAIN_R          = 20;
const CHAIN_SPREAD_PTS = 55;

const INDOOR_EXT_PATROL_SPEED = 38;
const BABY_SPEED_MIN   = 85;
const BABY_SPEED_MAX   = 118;
const REPRODUCE_R      = 22;
const LADY_COOLDOWN    = 10;
const BABY_VISIT_TIME  = 1.8;

const DEATH_ZONE_TIERS = [
  { key: 'high', label: 'HIGH',   mult: 2.0,  color: '#ff3322', glow: '#ff5533' },
  { key: 'med',  label: 'MEDIUM', mult: 1.5,  color: '#ddaa00', glow: '#ffcc22' },
  { key: 'low',  label: 'LOW',    mult: 1.25, color: '#66aa44', glow: '#88cc55' },
];
const INDOOR_EXT_CHASE_SPEED  = 78;

function moveToward(entity, tx, ty, speed, dt) {
  const dx = tx - entity.x, dy = ty - entity.y;
  const dist = Math.hypot(dx, dy);
  if (dist < speed * dt) { entity.x = tx; entity.y = ty; }
  else { entity.x += (dx / dist) * speed * dt; entity.y += (dy / dist) * speed * dt; }
}

function nearestIntersection(x, y) {
  let best = Infinity, bCol = 0, bRow = 0;
  for (let col = 0; col <= COLS; col++) for (let row = 0; row <= ROWS; row++) {
    const d = Math.hypot(x - VSTREET_CX[col], y - HSTREET_CY[row]);
    if (d < best) { best = d; bCol = col; bRow = row; }
  }
  return { col: bCol, row: bRow };
}

function randomInteriorPoint(loc) {
  const r = loc.rect, m = WALL_T + 12;
  return {
    x: r.x + m + Math.random() * (BW - 2 * m),
    y: r.y + m + Math.random() * (BH - 2 * m),
  };
}

// Approach position just outside the door, and greedy next-waypoint helper
function doorApproachPos(loc) {
  const D = 14;
  switch (loc.doorWall) {
    case 'S': return { x: loc.doorX, y: loc.doorY + D };
    case 'N': return { x: loc.doorX, y: loc.doorY - D };
    case 'E': return { x: loc.doorX + D, y: loc.doorY };
    case 'W': return { x: loc.doorX - D, y: loc.doorY };
  }
}

function nextWaypointToward(col, row, toCol, toRow) {
  const opts = gridNeighbors(col, row);
  let best = null, bestDist = Infinity;
  for (const opt of opts) {
    const d = Math.abs(opt.col - toCol) + Math.abs(opt.row - toRow);
    if (d < bestDist) { bestDist = d; best = opt; }
  }
  return best;
}

function getTier(spread) {
  if (spread >= 5000) return 'high';
  if (spread >= 1500) return 'med';
  return 'low';
}

// ── Location definitions ──────────────────────────────────────────────────────
const LOCATION_DEFS = [
  { type: 'food',    emoji: '🛒', color: '#f0a030', names: ['Grocery Store', 'Supermarket', 'Corner Shop'],   spreadMin: 1800, spreadMax: 3000  },
  { type: 'water',   emoji: '💧', color: '#30a8f0', names: ['Water Tower',   'Reservoir',   'Water Main'],    spreadMin: 7000, spreadMax: 12000 },
  { type: 'transit', emoji: '🚇', color: '#cc88ff', names: ['Subway Station','Bus Depot',   'Train Platform'], spreadMin: 2500, spreadMax: 4000  },
  { type: 'resto',   emoji: '🍕', color: '#f06850', names: ['Diner',         'Food Market', 'Cafeteria'],     spreadMin: 800,  spreadMax: 1800  },
];

// ── Interior contamination targets ────────────────────────────────────────────
function buildingTargets(type, rect) {
  const cx = rect.x + BW / 2;
  const cy = rect.y + BH / 2;
  const top = rect.y + WALL_T + 22;

  if (type === 'water') {
    return [{ x: cx, y: top, dwell: 1.8, prog: 0, done: false, label: 'Water Intake' }];
  }
  if (type === 'transit') {
    return [{ x: cx, y: cy + 8, dwell: 0.5, prog: 0, done: false, label: 'Turnstile' }];
  }
  if (type === 'food') {
    return [
      { x: cx - 38, y: cy - 12, dwell: 0.4, prog: 0, done: false, label: 'Shelf A' },
      { x: cx,      y: cy + 14, dwell: 0.4, prog: 0, done: false, label: 'Shelf B' },
      { x: cx + 38, y: cy - 12, dwell: 0.4, prog: 0, done: false, label: 'Shelf C' },
    ];
  }
  // resto — 2 kitchen stations
  return [
    { x: cx - 26, y: cy - 8,  dwell: 0.4, prog: 0, done: false, label: 'Prep Station' },
    { x: cx + 26, y: cy + 10, dwell: 0.4, prog: 0, done: false, label: 'Grill' },
  ];
}

// ── NPC helpers ───────────────────────────────────────────────────────────────
function gridNeighbors(col, row) {
  const out = [];
  if (col > 0)    out.push({ col: col - 1, row });
  if (col < COLS) out.push({ col: col + 1, row });
  if (row > 0)    out.push({ col, row: row - 1 });
  if (row < ROWS) out.push({ col, row: row + 1 });
  return out;
}
function pickNextWaypoint(npc) {
  if (npc.patrol) {
    npc.patrolIdx = (npc.patrolIdx + 1) % npc.patrol.length;
    const n = npc.patrol[npc.patrolIdx];
    npc.targetCol = n.col; npc.targetRow = n.row;
  } else {
    const opts = gridNeighbors(npc.col, npc.row);
    const n = opts[Math.floor(Math.random() * opts.length)];
    npc.targetCol = n.col; npc.targetRow = n.row;
  }
}
function createPerson(col, row, rng) {
  return {
    x: VSTREET_CX[col], y: HSTREET_CY[row],
    col, row, targetCol: col, targetRow: row,
    speed: PERSON_SPEED_MIN + rng() * (PERSON_SPEED_MAX - PERSON_SPEED_MIN),
    infected: false, infectPulse: 0,
    visitState: null, visitBldId: null, visitTarget: null, visitTimer: 0,
    visitCooldown: 3 + rng() * 7,
    visitApproachCol: 0, visitApproachRow: 0, visitApproachPos: null,
  };
}
function createExterminator(col, row) {
  return {
    x: VSTREET_CX[col], y: HSTREET_CY[row],
    col, row, targetCol: col, targetRow: row,
    chasing: false, chasePulse: 0, catchCooldown: 0, patrol: null, dedicated: false,
  };
}
const RAT_START_X = VSTREET_CX[2];
const RAT_START_Y = HSTREET_CY[1];
const EXT_MIN_SPAWN_DIST = 160;

function createDedicatedExterminator(bCol, bRow) {
  const patrol = [
    { col: bCol,     row: bRow     },
    { col: bCol + 1, row: bRow     },
    { col: bCol + 1, row: bRow + 1 },
    { col: bCol,     row: bRow + 1 },
  ];
  // Start at patrol corner farthest from rat start position
  let si = 0, bestDist = 0;
  patrol.forEach((p, i) => {
    const d = Math.hypot(VSTREET_CX[p.col] - RAT_START_X, HSTREET_CY[p.row] - RAT_START_Y);
    if (d > bestDist) { bestDist = d; si = i; }
  });
  const s = patrol[si];
  return {
    x: VSTREET_CX[s.col], y: HSTREET_CY[s.row],
    col: s.col, row: s.row, targetCol: s.col, targetRow: s.row,
    chasing: false, chasePulse: 0, catchCooldown: 0,
    patrol, patrolIdx: si, dedicated: true,
  };
}

function createIndoorExterminator(loc, rng) {
  const r = loc.rect, m = WALL_T + 16;
  // Patrol along the wall opposite the door so it starts away from the entrance
  let pts;
  if (loc.doorWall === 'S') {
    pts = [{ x: r.x + m, y: r.y + m + 6 }, { x: r.x + BW / 2, y: r.y + m + 6 }, { x: r.x + BW - m, y: r.y + m + 6 }];
  } else if (loc.doorWall === 'N') {
    pts = [{ x: r.x + m, y: r.y + BH - m - 6 }, { x: r.x + BW / 2, y: r.y + BH - m - 6 }, { x: r.x + BW - m, y: r.y + BH - m - 6 }];
  } else if (loc.doorWall === 'E') {
    pts = [{ x: r.x + m + 6, y: r.y + m }, { x: r.x + m + 6, y: r.y + BH / 2 }, { x: r.x + m + 6, y: r.y + BH - m }];
  } else {
    pts = [{ x: r.x + BW - m - 6, y: r.y + m }, { x: r.x + BW - m - 6, y: r.y + BH / 2 }, { x: r.x + BW - m - 6, y: r.y + BH - m }];
  }
  const si = Math.floor(rng() * pts.length);
  return {
    x: pts[si].x, y: pts[si].y,
    indoor: true, homeId: loc.id,
    chasing: false, chasePulse: 0,
    patrol: null, dedicated: false,
    patrolPts: pts, patrolIdx: si,
  };
}

function createLadyRat(rng) {
  let col, row;
  do {
    col = Math.floor(rng() * (COLS + 1));
    row = Math.floor(rng() * (ROWS + 1));
  } while (Math.hypot(VSTREET_CX[col] - RAT_START_X, HSTREET_CY[row] - RAT_START_Y) < 100);
  return { x: VSTREET_CX[col], y: HSTREET_CY[row], col, row, targetCol: col, targetRow: row, cooldown: 0 };
}

function createBaby(x, y) {
  const ni = nearestIntersection(x, y);
  return {
    x, y, col: ni.col, row: ni.row, targetCol: ni.col, targetRow: ni.row,
    speed: BABY_SPEED_MIN + Math.random() * (BABY_SPEED_MAX - BABY_SPEED_MIN),
    alive: true, infectPulse: 0,
    visitState: null, visitBldId: null, visitTimer: 0,
    visitApproachPos: null, visitApproachCol: 0, visitApproachRow: 0,
    visitCooldown: 1 + Math.random() * 2,
  };
}

// ── Map generation ────────────────────────────────────────────────────────────
function generateMap(rng) {
  const assignments = [];
  for (const def of LOCATION_DEFS) {
    for (let i = 0; i < 3; i++) assignments.push({ def, nameIdx: i });
  }
  for (let i = assignments.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [assignments[i], assignments[j]] = [assignments[j], assignments[i]];
  }

  const locations = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const idx = row * COLS + col;
      const { def, nameIdx } = assignments[idx];
      const rect   = buildingRect(col, row);
      const spread = Math.round(def.spreadMin + rng() * (def.spreadMax - def.spreadMin));
      locations.push({
        id: idx, type: def.type, emoji: def.emoji, color: def.color,
        name: def.names[nameIdx], rect, spread,
        tier: getTier(spread), contaminated: false,
        ...(() => {
          const WALLS = ['S', 'N', 'E', 'W'];
          const doorWall = WALLS[Math.floor(rng() * WALLS.length)];
          const margin = DOOR_HALF + 10;
          let doorX, doorY;
          if (doorWall === 'S' || doorWall === 'N') {
            doorX = rect.x + margin + Math.floor(rng() * (BW - 2 * margin));
            doorY = doorWall === 'S' ? rect.y + BH : rect.y;
          } else {
            doorX = doorWall === 'E' ? rect.x + BW : rect.x;
            doorY = rect.y + margin + Math.floor(rng() * (BH - 2 * margin));
          }
          return { doorWall, doorX, doorY };
        })(),
        targets: buildingTargets(def.type, rect),
      });
    }
  }

  const people = [];
  for (let i = 0; i < PERSON_COUNT; i++) {
    people.push(createPerson(
      Math.floor(rng() * (COLS + 1)),
      Math.floor(rng() * (ROWS + 1)),
      rng,
    ));
  }

  const exterminators = [];
  for (const loc of locations.filter(l => l.tier === 'high')) {
    exterminators.push(createDedicatedExterminator(loc.id % COLS, Math.floor(loc.id / COLS)));
  }
  for (let i = 0; i < 2; i++) {
    let col, row;
    do {
      col = Math.floor(rng() * (COLS + 1));
      row = Math.floor(rng() * (ROWS + 1));
    } while (Math.hypot(VSTREET_CX[col] - RAT_START_X, HSTREET_CY[row] - RAT_START_Y) < EXT_MIN_SPAWN_DIST);
    exterminators.push(createExterminator(col, row));
  }
  // 1–2 indoor exterminators in random non-high buildings
  const indoorCandidates = locations.filter(l => l.tier !== 'high');
  const indoorCount = 1 + (rng() < 0.55 ? 1 : 0);
  const usedIndoor = new Set();
  for (let i = 0; i < indoorCount && i < indoorCandidates.length; i++) {
    let idx;
    do { idx = Math.floor(rng() * indoorCandidates.length); } while (usedIndoor.has(idx));
    usedIndoor.add(idx);
    exterminators.push(createIndoorExterminator(indoorCandidates[idx], rng));
  }

  // Death zones — one per tier (high/med/low), inside a building, upper-right corner of interior
  const bySpread = [...locations].sort((a, b) => b.spread - a.spread);
  const dzSources = [bySpread[0], bySpread[Math.floor(bySpread.length / 2)], bySpread[bySpread.length - 1]];
  const m = WALL_T + 16;
  const deathZones = dzSources.map((loc, i) => ({
    buildingId: loc.id,
    tierDef: DEATH_ZONE_TIERS[i],
    x: loc.rect.x + BW - m - 4,
    y: loc.rect.y + m + 4,
    r: 14,
  }));

  const ladyRats = [createLadyRat(rng), createLadyRat(rng)];
  return { locations, people, exterminators, deathZones, ladyRats, babies: [] };
}

// ── Collision ─────────────────────────────────────────────────────────────────
const RAT_R = 7;

function rectOverlap(cx, cy, r, rect) {
  return cx + r > rect.x && cx - r < rect.x + rect.w &&
         cy + r > rect.y && cy - r < rect.y + rect.h;
}

// Solid building with gap in the door wall (any of 4 walls)
function solidWithDoor(cx, cy, loc) {
  if (!rectOverlap(cx, cy, RAT_R, loc.rect)) return false;
  const { rect: r, doorX, doorY, doorWall } = loc;
  // Slightly wider gap than visual to prevent corner-sticking
  const gap = DOOR_HALF + 2;
  switch (doorWall) {
    case 'S': if (cy + RAT_R >= r.y + r.h - WALL_T && Math.abs(cx - doorX) < gap) return false; break;
    case 'N': if (cy - RAT_R <= r.y + WALL_T        && Math.abs(cx - doorX) < gap) return false; break;
    case 'E': if (cx + RAT_R >= r.x + r.w - WALL_T  && Math.abs(cy - doorY) < gap) return false; break;
    case 'W': if (cx - RAT_R <= r.x + WALL_T        && Math.abs(cy - doorY) < gap) return false; break;
  }
  return true;
}

// Interior hollow walls — gap only in the door wall
function hitsInteriorWalls(cx, cy, loc) {
  const r = loc.rect;
  const { doorWall, doorX, doorY } = loc;
  // Split wall at DOOR_HALF + RAT_R + 2 so the passable zone matches solidWithDoor's gap
  const split = DOOR_HALF + RAT_R + 2;
  function seg(rx, ry, rw, rh) { return rectOverlap(cx, cy, RAT_R, { x: rx, y: ry, w: rw, h: rh }); }

  // N wall
  if (doorWall === 'N') {
    const lw = doorX - split - r.x, rx2 = doorX + split;
    if (lw > 0 && seg(r.x, r.y, lw, WALL_T)) return true;
    if (r.x + BW - rx2 > 0 && seg(rx2, r.y, r.x + BW - rx2, WALL_T)) return true;
  } else if (seg(r.x, r.y, BW, WALL_T)) return true;

  // S wall
  if (doorWall === 'S') {
    const lw = doorX - split - r.x, rx2 = doorX + split;
    if (lw > 0 && seg(r.x, r.y + BH - WALL_T, lw, WALL_T)) return true;
    if (r.x + BW - rx2 > 0 && seg(rx2, r.y + BH - WALL_T, r.x + BW - rx2, WALL_T)) return true;
  } else if (seg(r.x, r.y + BH - WALL_T, BW, WALL_T)) return true;

  // W wall
  if (doorWall === 'W') {
    const th = doorY - split - r.y, by2 = doorY + split;
    if (th > 0 && seg(r.x, r.y, WALL_T, th)) return true;
    if (r.y + BH - by2 > 0 && seg(r.x, by2, WALL_T, r.y + BH - by2)) return true;
  } else if (seg(r.x, r.y, WALL_T, BH)) return true;

  // E wall
  if (doorWall === 'E') {
    const th = doorY - split - r.y, by2 = doorY + split;
    if (th > 0 && seg(r.x + BW - WALL_T, r.y, WALL_T, th)) return true;
    if (r.y + BH - by2 > 0 && seg(r.x + BW - WALL_T, by2, WALL_T, r.y + BH - by2)) return true;
  } else if (seg(r.x + BW - WALL_T, r.y, WALL_T, BH)) return true;

  return false;
}

// Main collision — rat uses door gaps; useDoor=false for exterminators
function hitsBuilding(cx, cy, locations, insideId = null, useDoor = true) {
  for (const loc of locations) {
    if (loc.id === insideId) {
      if (hitsInteriorWalls(cx, cy, loc)) return true;
    } else if (useDoor) {
      if (solidWithDoor(cx, cy, loc)) return true;
    } else {
      if (rectOverlap(cx, cy, RAT_R, loc.rect)) return true;
    }
  }
  return false;
}

// ── NPC movement ──────────────────────────────────────────────────────────────
function stepTowardWaypoint(npc, speed, dt) {
  const tx = VSTREET_CX[npc.targetCol], ty = HSTREET_CY[npc.targetRow];
  const dx = tx - npc.x, dy = ty - npc.y;
  const dist = Math.hypot(dx, dy);
  if (dist < speed * dt * 1.5) {
    npc.x = tx; npc.y = ty;
    npc.col = npc.targetCol; npc.row = npc.targetRow;
    pickNextWaypoint(npc);
  } else {
    npc.x += (dx / dist) * speed * dt;
    npc.y += (dy / dist) * speed * dt;
  }
}

function moveExtToward(ext, tx, ty, speed, dt, locations) {
  const dx = tx - ext.x, dy = ty - ext.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 2) return;
  const vx = (dx / dist) * speed * dt;
  const vy = (dy / dist) * speed * dt;
  if (!hitsBuilding(ext.x + vx, ext.y, locations, null, false)) ext.x += vx;
  if (!hitsBuilding(ext.x, ext.y + vy, locations, null, false)) ext.y += vy;
}

function updatePeople(people, rat, dt, locations) {
  for (const p of people) {
    if (p.visitState === null) {
      stepTowardWaypoint(p, p.speed, dt);
      p.visitCooldown -= dt;
      if (p.visitCooldown <= 0) {
        const bld = locations[Math.floor(Math.random() * locations.length)];
        const ap = doorApproachPos(bld);
        const ni = nearestIntersection(ap.x, ap.y);
        p.visitBldId = bld.id;
        p.visitApproachCol = ni.col; p.visitApproachRow = ni.row; p.visitApproachPos = ap;
        p.visitState = 'going';
        p.visitCooldown = 8 + Math.random() * 12;
        // Aim first waypoint toward the approach intersection
        const nxt = nextWaypointToward(p.col, p.row, ni.col, ni.row);
        if (nxt) { p.targetCol = nxt.col; p.targetRow = nxt.row; }
      }
    } else if (p.visitState === 'going') {
      // Navigate on streets toward approach intersection
      const tx = VSTREET_CX[p.targetCol], ty = HSTREET_CY[p.targetRow];
      const dx = tx - p.x, dy = ty - p.y, dist = Math.hypot(dx, dy);
      if (dist < p.speed * dt * 1.5) {
        p.x = tx; p.y = ty; p.col = p.targetCol; p.row = p.targetRow;
        if (p.col === p.visitApproachCol && p.row === p.visitApproachRow) {
          p.visitState = 'approaching';
        } else {
          const nxt = nextWaypointToward(p.col, p.row, p.visitApproachCol, p.visitApproachRow);
          if (nxt) { p.targetCol = nxt.col; p.targetRow = nxt.row; }
        }
      } else {
        p.x += (dx / dist) * p.speed * dt;
        p.y += (dy / dist) * p.speed * dt;
      }
    } else if (p.visitState === 'approaching') {
      const ap = p.visitApproachPos;
      moveToward(p, ap.x, ap.y, p.speed, dt);
      if (Math.hypot(p.x - ap.x, p.y - ap.y) < 5) {
        p.visitState = 'inside';
        p.visitTarget = randomInteriorPoint(locations[p.visitBldId]);
        p.visitTimer = 2 + Math.random() * 3;
      }
    } else if (p.visitState === 'inside') {
      moveToward(p, p.visitTarget.x, p.visitTarget.y, p.speed * 0.5, dt);
      p.visitTimer -= dt;
      if (p.visitTimer <= 0) {
        p.visitState = 'leaving';
      } else if (Math.hypot(p.x - p.visitTarget.x, p.y - p.visitTarget.y) < 5) {
        p.visitTarget = randomInteriorPoint(locations[p.visitBldId]);
      }
    } else if (p.visitState === 'leaving') {
      const ap = p.visitApproachPos;
      moveToward(p, ap.x, ap.y, p.speed, dt);
      if (Math.hypot(p.x - ap.x, p.y - ap.y) < 5) {
        const ni = nearestIntersection(ap.x, ap.y);
        p.x = VSTREET_CX[ni.col]; p.y = HSTREET_CY[ni.row];
        p.col = ni.col; p.row = ni.row; p.targetCol = ni.col; p.targetRow = ni.row;
        p.visitState = null; p.visitBldId = null; p.visitTarget = null; p.visitApproachPos = null;
      }
    }
    if (p.infectPulse > 0) p.infectPulse -= dt;
    if (!p.infected && Math.hypot(rat.x - p.x, rat.y - p.y) < INFECT_R) {
      p.infected = true; p.infectPulse = 0.4;
    }
  }
  for (const p of people) {
    if (!p.infected) continue;
    for (const q of people) {
      if (!q.infected && Math.hypot(p.x - q.x, p.y - q.y) < CHAIN_R && Math.random() < 1.2 * dt) {
        q.infected = true; q.infectPulse = 0.4;
      }
    }
  }
}

function moveIndoorExtToward(ext, tx, ty, speed, dt, loc) {
  const dx = tx - ext.x, dy = ty - ext.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 2) return;
  const m = WALL_T + RAT_R;
  ext.x = Math.max(loc.rect.x + m, Math.min(loc.rect.x + BW - m, ext.x + (dx / dist) * speed * dt));
  ext.y = Math.max(loc.rect.y + m, Math.min(loc.rect.y + BH - m, ext.y + (dy / dist) * speed * dt));
}

function updateIndoorExt(ext, rat, dt, loc) {
  if (ext.chasePulse > 0) ext.chasePulse -= dt;
  const ratHome = rat.insideBuilding === ext.homeId;
  const d = Math.hypot(rat.x - ext.x, rat.y - ext.y);
  if (ratHome && d < CHASE_R) { ext.chasing = true; ext.chasePulse = 0.15; }
  else if (!ratHome || d > CHASE_R + 40) ext.chasing = false;

  if (ext.chasing) {
    moveIndoorExtToward(ext, rat.x, rat.y, INDOOR_EXT_CHASE_SPEED, dt, loc);
  } else {
    const target = ext.patrolPts[ext.patrolIdx];
    const dist = Math.hypot(ext.x - target.x, ext.y - target.y);
    if (dist < INDOOR_EXT_PATROL_SPEED * dt * 2) {
      ext.x = target.x; ext.y = target.y;
      ext.patrolIdx = (ext.patrolIdx + 1) % ext.patrolPts.length;
    } else {
      ext.x += (target.x - ext.x) / dist * INDOOR_EXT_PATROL_SPEED * dt;
      ext.y += (target.y - ext.y) / dist * INDOOR_EXT_PATROL_SPEED * dt;
    }
  }
}

function updateLadyRat(lady, dt) {
  if (lady.cooldown > 0) lady.cooldown = Math.max(0, lady.cooldown - dt);
  stepTowardWaypoint(lady, 50, dt);
}

function updateBabies(babies, dt, locations) {
  for (const b of babies) {
    if (!b.alive) continue;
    if (b.visitState === null) {
      stepTowardWaypoint(b, b.speed, dt);
      b.visitCooldown -= dt;
      if (b.visitCooldown <= 0) {
        const uncontam = locations.filter(l => !l.contaminated);
        if (uncontam.length > 0) {
          const bld = uncontam[Math.floor(Math.random() * uncontam.length)];
          const ap = doorApproachPos(bld);
          const ni = nearestIntersection(ap.x, ap.y);
          b.visitBldId = bld.id;
          b.visitApproachCol = ni.col; b.visitApproachRow = ni.row; b.visitApproachPos = ap;
          b.visitState = 'going';
          const nxt = nextWaypointToward(b.col, b.row, ni.col, ni.row);
          if (nxt) { b.targetCol = nxt.col; b.targetRow = nxt.row; }
        }
        b.visitCooldown = 3 + Math.random() * 5;
      }
    } else if (b.visitState === 'going') {
      const tx = VSTREET_CX[b.targetCol], ty = HSTREET_CY[b.targetRow];
      const dx = tx - b.x, dy = ty - b.y, dist = Math.hypot(dx, dy);
      if (dist < b.speed * dt * 1.5) {
        b.x = tx; b.y = ty; b.col = b.targetCol; b.row = b.targetRow;
        if (b.col === b.visitApproachCol && b.row === b.visitApproachRow) {
          b.visitState = 'approaching';
        } else {
          const nxt = nextWaypointToward(b.col, b.row, b.visitApproachCol, b.visitApproachRow);
          if (nxt) { b.targetCol = nxt.col; b.targetRow = nxt.row; }
        }
      } else if (dist > 0) {
        b.x += (dx / dist) * b.speed * dt;
        b.y += (dy / dist) * b.speed * dt;
      }
    } else if (b.visitState === 'approaching') {
      const ap = b.visitApproachPos;
      moveToward(b, ap.x, ap.y, b.speed, dt);
      if (Math.hypot(b.x - ap.x, b.y - ap.y) < 5) {
        b.visitState = 'inside'; b.visitTimer = BABY_VISIT_TIME;
      }
    } else if (b.visitState === 'inside') {
      b.visitTimer -= dt;
      if (b.visitTimer <= 0) {
        const loc = locations[b.visitBldId];
        if (loc && !loc.contaminated) {
          loc.contaminated = true;
          for (const t of loc.targets) { t.prog = t.dwell; t.done = true; }
        }
        b.visitState = 'leaving';
      }
    } else if (b.visitState === 'leaving') {
      const ap = b.visitApproachPos;
      moveToward(b, ap.x, ap.y, b.speed, dt);
      if (Math.hypot(b.x - ap.x, b.y - ap.y) < 5) {
        const ni = nearestIntersection(ap.x, ap.y);
        b.x = VSTREET_CX[ni.col]; b.y = HSTREET_CY[ni.row];
        b.col = ni.col; b.row = ni.row; b.targetCol = ni.col; b.targetRow = ni.row;
        b.visitState = null; b.visitBldId = null; b.visitApproachPos = null;
      }
    }
    if (b.infectPulse > 0) b.infectPulse -= dt;
  }
}

function updateExterminators(exterminators, rat, babies, dt, locations) {
  for (const ext of exterminators) {
    if (ext.indoor) {
      updateIndoorExt(ext, rat, dt, locations[ext.homeId]);
      if (rat.insideBuilding === ext.homeId) {
        if (Math.hypot(rat.x - ext.x, rat.y - ext.y) < KILL_R && !rat.dead) { rat.dead = true; return true; }
      }
    } else {
      if (ext.chasePulse > 0) ext.chasePulse -= dt;
      if (ext.catchCooldown > 0) ext.catchCooldown -= dt;
      // Find nearest chase target — babies distract; exterminators always prefer the closest
      let chaseX = null, chaseY = null, chaseIsRat = false, chasedBaby = null, bestDist = Infinity;
      if (ext.catchCooldown <= 0) {
        if (rat.insideBuilding === null) {
          const d = Math.hypot(rat.x - ext.x, rat.y - ext.y);
          if (d < CHASE_R && d < bestDist) { bestDist = d; chaseX = rat.x; chaseY = rat.y; chaseIsRat = true; }
        }
        for (const b of babies) {
          if (!b.alive || b.visitState === 'inside') continue;
          const d = Math.hypot(b.x - ext.x, b.y - ext.y);
          if (d < CHASE_R && d < bestDist) { bestDist = d; chaseX = b.x; chaseY = b.y; chaseIsRat = false; chasedBaby = b; }
        }
      }
      if (chaseX !== null) {
        ext.chasing = true; ext.chasePulse = 0.15;
        moveExtToward(ext, chaseX, chaseY, EXT_CHASE_SPEED, dt, locations);
        if (bestDist < KILL_R) {
          if (chaseIsRat && !rat.dead) { rat.dead = true; return true; }
          else if (chasedBaby) {
            chasedBaby.alive = false;
            ext.catchCooldown = 2.5;
            ext.chasing = false;
          }
        }
      } else {
        if (ext.chasing && Math.hypot(rat.x - ext.x, rat.y - ext.y) > CHASE_R + 55) {
          ext.chasing = false;
          // Re-anchor to nearest intersection after chase so patrol doesn't clip building corners
          const ni = nearestIntersection(ext.x, ext.y);
          ext.x = VSTREET_CX[ni.col]; ext.y = HSTREET_CY[ni.row];
          ext.col = ni.col; ext.row = ni.row; ext.targetCol = ni.col; ext.targetRow = ni.row;
        }
        stepTowardWaypoint(ext, EXT_PATROL_SPEED, dt);
      }
    }
  }
  return false;
}

// ── Interior rendering ────────────────────────────────────────────────────────
const FLOOR_COLORS = { food: '#211f1a', water: '#181c22', transit: '#181818', resto: '#1e1a14' };

function renderInteriorDecor(ctx, loc) {
  const r = loc.rect;
  const cx = r.x + BW / 2, cy = r.y + BH / 2;
  const ix = r.x + WALL_T, iw = BW - 2 * WALL_T;

  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  if (loc.type === 'food') {
    // Three shelving rows
    for (let i = 0; i < 3; i++) {
      const sy = r.y + WALL_T + 15 + i * 28;
      ctx.fillRect(ix + 12, sy, iw - 24, 5);
    }
  } else if (loc.type === 'water') {
    // Water tank circle + pipes
    ctx.strokeStyle = 'rgba(48,168,240,0.18)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, r.y + WALL_T + 22, 20, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, r.y + WALL_T + 42); ctx.lineTo(cx, cy); ctx.stroke();
  } else if (loc.type === 'transit') {
    // Platform stripe
    ctx.fillRect(ix + 8, cy + 18, iw - 16, 6);
    ctx.fillStyle = 'rgba(255,220,0,0.08)';
    ctx.fillRect(ix + 8, cy + 16, iw - 16, 2);
  } else if (loc.type === 'resto') {
    // Counter + grill
    ctx.fillRect(ix + 12, r.y + WALL_T + 10, iw / 2 - 18, 14);
    ctx.fillRect(ix + iw / 2 + 6, r.y + WALL_T + 18, iw / 2 - 18, 14);
  }
}

function renderBuildingInterior(ctx, loc) {
  const r = loc.rect;
  const ix = r.x + WALL_T, iy = r.y + WALL_T;
  const iw = BW - 2 * WALL_T, ih = BH - 2 * WALL_T;

  // Floor
  ctx.fillStyle = FLOOR_COLORS[loc.type] || '#1e1e1e';
  ctx.fillRect(ix, iy, iw, ih);

  // Decor
  renderInteriorDecor(ctx, loc);

  // Contamination targets
  for (const t of loc.targets) {
    const progress = t.prog / t.dwell;
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 300);

    // Glow
    if (!t.done) {
      ctx.shadowColor = '#6dcc4a'; ctx.shadowBlur = 8 + pulse * 6;
      ctx.fillStyle = `rgba(109,204,74,${0.12 + pulse * 0.08})`;
      ctx.beginPath(); ctx.arc(t.x, t.y, TARGET_R, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;

      // Progress arc
      if (progress > 0) {
        ctx.strokeStyle = '#6dcc4a'; ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(t.x, t.y, TARGET_R, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
        ctx.stroke();
      }

      // Outer ring
      ctx.strokeStyle = 'rgba(109,204,74,0.4)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(t.x, t.y, TARGET_R, 0, Math.PI * 2); ctx.stroke();
    } else {
      // Done — solid green fill + checkmark
      ctx.fillStyle = 'rgba(109,204,74,0.35)';
      ctx.beginPath(); ctx.arc(t.x, t.y, TARGET_R, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#6dcc4a'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(t.x - 6, t.y);
      ctx.lineTo(t.x - 1, t.y + 5);
      ctx.lineTo(t.x + 7, t.y - 5);
      ctx.stroke();
    }
  }

  // Interior walls — full wall on 3 sides, gap on door side
  ctx.fillStyle = '#1c1f14';
  if (loc.doorWall !== 'N') ctx.fillRect(r.x, r.y, BW, WALL_T);
  if (loc.doorWall !== 'S') ctx.fillRect(r.x, r.y + BH - WALL_T, BW, WALL_T);
  if (loc.doorWall !== 'W') ctx.fillRect(r.x, r.y, WALL_T, BH);
  if (loc.doorWall !== 'E') ctx.fillRect(r.x + BW - WALL_T, r.y, WALL_T, BH);

  if (loc.doorWall === 'N' || loc.doorWall === 'S') {
    const wy = loc.doorWall === 'N' ? r.y : r.y + BH - WALL_T;
    const lw = loc.doorX - DOOR_HALF - r.x, rx2 = loc.doorX + DOOR_HALF, rw2 = r.x + BW - rx2;
    if (lw  > 0) ctx.fillRect(r.x,  wy, lw,   WALL_T);
    if (rw2 > 0) ctx.fillRect(rx2,  wy, rw2,  WALL_T);
    ctx.fillStyle = 'rgba(109,204,74,0.15)';
    ctx.fillRect(loc.doorX - DOOR_HALF, wy, DOOR_HALF * 2, WALL_T);
  } else {
    const wx = loc.doorWall === 'W' ? r.x : r.x + BW - WALL_T;
    const th = loc.doorY - DOOR_HALF - r.y, by2 = loc.doorY + DOOR_HALF, bh2 = r.y + BH - by2;
    if (th  > 0) ctx.fillRect(wx, r.y,  WALL_T, th);
    if (bh2 > 0) ctx.fillRect(wx, by2,  WALL_T, bh2);
    ctx.fillStyle = 'rgba(109,204,74,0.15)';
    ctx.fillRect(wx, loc.doorY - DOOR_HALF, WALL_T, DOOR_HALF * 2);
  }
}

function renderBuildingExterior(ctx, loc) {
  const r = loc.rect;
  const { contaminated, color, emoji, name } = loc;
  const bx = r.x, by = r.y;

  ctx.fillStyle = contaminated ? '#162010' : '#1c1f14';
  ctx.fillRect(bx, by, BW, BH);

  if (contaminated) { ctx.shadowColor = '#6dcc4a'; ctx.shadowBlur = 10; }
  ctx.strokeStyle = contaminated ? 'rgba(109,204,74,0.55)' : 'rgba(255,255,255,0.07)';
  ctx.lineWidth = contaminated ? 2 : 1;
  ctx.strokeRect(bx, by, BW, BH);
  ctx.shadowBlur = 0;

  // Doorstep — rendered on the correct wall
  ctx.fillStyle   = contaminated ? 'rgba(109,204,74,0.35)' : `${color}22`;
  ctx.strokeStyle = contaminated ? 'rgba(109,204,74,0.7)'  : `${color}88`;
  ctx.lineWidth = 1;
  {
    const dw = loc.doorWall;
    const dsx = dw === 'E' ? bx + BW - 10 : dw === 'W' ? bx : loc.doorX - DOOR_HALF;
    const dsy = dw === 'S' ? by + BH - 10 : dw === 'N' ? by : loc.doorY - DOOR_HALF;
    const dsw = (dw === 'E' || dw === 'W') ? 10 : DOOR_HALF * 2;
    const dsh = (dw === 'N' || dw === 'S') ? 10 : DOOR_HALF * 2;
    ctx.fillRect(dsx, dsy, dsw, dsh);
    ctx.strokeRect(dsx, dsy, dsw, dsh);
  }

  // Tier stripe — drawn after doorstep so it's never covered by it
  if (loc.tier === 'high') {
    ctx.fillStyle = contaminated ? 'rgba(109,204,74,0.6)' : 'rgba(220,55,20,0.7)';
    ctx.fillRect(bx, by, BW, 4);
  } else if (loc.tier === 'med') {
    ctx.fillStyle = contaminated ? 'rgba(109,204,74,0.5)' : 'rgba(190,145,0,0.55)';
    ctx.fillRect(bx, by, BW, 3);
  } else {
    ctx.fillStyle = contaminated ? 'rgba(109,204,74,0.3)' : 'rgba(120,120,100,0.3)';
    ctx.fillRect(bx, by, BW, 2);
  }

  // Tier label
  if (!contaminated) {
    ctx.font = '700 8px "Arial Narrow", Arial, sans-serif';
    ctx.textAlign = 'right'; ctx.textBaseline = 'top';
    if (loc.tier === 'high') {
      ctx.fillStyle = '#ff7755';
      ctx.fillText('HIGH VALUE', bx + BW - 5, by + 7);
    } else if (loc.tier === 'med') {
      ctx.fillStyle = '#c8a030';
      ctx.fillText('MEDIUM', bx + BW - 5, by + 6);
    } else {
      ctx.fillStyle = '#6a7060';
      ctx.fillText('LOW', bx + BW - 5, by + 5);
    }
  }

  // Emoji + name
  ctx.font = '22px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(emoji, bx + BW / 2, by + BH / 2 - 9);
  ctx.fillStyle = contaminated ? '#6dcc4a' : '#8a9a6a';
  ctx.font = '600 9px "Arial Narrow", Arial, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const maxNameW = BW - 16;
  let displayName = name;
  while (ctx.measureText(displayName).width > maxNameW && displayName.length > 1) {
    displayName = displayName.slice(0, -1);
  }
  if (displayName !== name) displayName = displayName.slice(0, -1) + '…';
  ctx.fillText(displayName, bx + BW / 2, by + BH / 2 + 10);

  if (contaminated) {
    ctx.fillStyle = 'rgba(109,204,74,0.05)';
    ctx.fillRect(bx, by, BW, BH);
  }
}

// ── Main render ───────────────────────────────────────────────────────────────
function renderScene(ctx, map, rat) {
  const { locations, people, exterminators, deathZones, ladyRats, babies } = map;
  const inside = rat.insideBuilding;

  // Asphalt
  ctx.fillStyle = '#111410';
  ctx.fillRect(0, 0, CW, CH);

  // Road centre dashes
  ctx.setLineDash([12, 10]);
  ctx.strokeStyle = 'rgba(255,255,200,0.06)'; ctx.lineWidth = 2;
  for (const cx of VSTREET_CX) { ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, CH); ctx.stroke(); }
  for (const cy of HSTREET_CY) { ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(CW, cy); ctx.stroke(); }
  ctx.setLineDash([]);

  // Intersection tints
  ctx.fillStyle = 'rgba(255,255,255,0.015)';
  for (const cx of VSTREET_CX) for (const cy of HSTREET_CY)
    ctx.fillRect(cx - STREET / 2, cy - STREET / 2, STREET, STREET);

  // Buildings (exterior or interior)
  for (const loc of locations) {
    if (loc.id === inside) {
      renderBuildingInterior(ctx, loc);
    } else {
      renderBuildingExterior(ctx, loc);
      // Death zone skull hint on exterior
      const dz = deathZones.find(z => z.buildingId === loc.id);
      if (dz) {
        // Static glow border
        ctx.shadowColor = dz.tierDef.glow; ctx.shadowBlur = 20;
        ctx.strokeStyle = dz.tierDef.glow; ctx.lineWidth = 3;
        ctx.strokeRect(loc.rect.x + 1, loc.rect.y + 1, loc.rect.w - 2, loc.rect.h - 2);
        ctx.shadowBlur = 0;
        // Skull + multiplier in top-left corner
        ctx.font = '16px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText('☠️', loc.rect.x + 5, loc.rect.y + 5);
        ctx.font = '700 11px "Arial Narrow", Arial, sans-serif';
        ctx.fillStyle = dz.tierDef.glow;
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(`×${dz.tierDef.mult}`, loc.rect.x + 24, loc.rect.y + 8);
      }
    }
  }

  // Death zone — only rendered when rat is inside the building
  if (inside !== null) {
    const dz = deathZones.find(z => z.buildingId === inside);
    if (dz) {
      const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 380);
      // Fill
      ctx.shadowColor = dz.tierDef.glow; ctx.shadowBlur = 24 + pulse * 16;
      ctx.fillStyle = dz.tierDef.color + '55';
      ctx.beginPath(); ctx.arc(dz.x, dz.y, dz.r, 0, Math.PI * 2); ctx.fill();
      // Pulsing border
      ctx.strokeStyle = dz.tierDef.glow; ctx.lineWidth = 3 + pulse * 2;
      ctx.beginPath(); ctx.arc(dz.x, dz.y, dz.r, 0, Math.PI * 2); ctx.stroke();
      // Linger charge arc
      const dzProgress = state.deathZoneTimer;
      if (dzProgress > 0) {
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(dz.x, dz.y, dz.r - 3, -Math.PI / 2, -Math.PI / 2 + dzProgress * Math.PI * 2);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
      // Large skull — fully opaque
      ctx.font = '26px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('☠️', dz.x, dz.y);
    }
  }

  // Entry hint arrow when near a door (outside) — rotated per door wall
  if (inside === null) {
    for (const loc of locations) {
      if (!loc.contaminated && Math.abs(rat.x - loc.doorX) < 30 && Math.abs(rat.y - loc.doorY) < 28) {
        ctx.fillStyle = 'rgba(109,204,74,0.7)';
        ctx.save();
        const dw = loc.doorWall;
        let ax = loc.doorX, ay = loc.doorY, angle = 0;
        if      (dw === 'S') { ay -= 16; angle = 0; }
        else if (dw === 'N') { ay += 16; angle = Math.PI; }
        else if (dw === 'E') { ax -= 16; angle = -Math.PI / 2; }
        else                 { ax += 16; angle = Math.PI / 2; }
        ctx.translate(ax, ay);
        ctx.rotate(angle);
        ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(-7, 0); ctx.lineTo(7, 0); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
    }
  }

  // Patrol zone outlines
  ctx.setLineDash([3, 5]); ctx.lineWidth = 1;
  for (const ext of exterminators) {
    if (!ext.dedicated) continue;
    const xs = ext.patrol.map(p => VSTREET_CX[p.col]);
    const ys = ext.patrol.map(p => HSTREET_CY[p.row]);
    const px = Math.min(...xs) - STREET / 2 + 2, py = Math.min(...ys) - STREET / 2 + 2;
    const pw = Math.max(...xs) + STREET / 2 - px - 2, ph = Math.max(...ys) + STREET / 2 - py - 2;
    ctx.strokeStyle = ext.chasing ? 'rgba(255,80,40,0.35)' : 'rgba(200,60,20,0.18)';
    ctx.strokeRect(px, py, pw, ph);
  }
  ctx.setLineDash([]);

  // People — skip those inside a building the rat can't see
  for (const p of people) {
    if (p.visitState === 'inside' && p.visitBldId !== inside) continue;
    const pulse = p.infectPulse > 0 ? p.infectPulse / 0.4 : 0;
    ctx.shadowColor = p.infected ? '#6dcc4a' : 'transparent';
    ctx.shadowBlur  = p.infected ? 4 + pulse * 12 : 0;
    ctx.fillStyle   = p.infected ? `rgba(109,204,74,${0.7 + pulse * 0.3})` : '#556655';
    ctx.beginPath(); ctx.arc(p.x, p.y, 4 + pulse, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Exterminators
  for (const ext of exterminators) {
    if (ext.indoor) {
      // Only visible when rat is inside their building
      if (inside !== ext.homeId) continue;
      const pulse = ext.chasePulse > 0;
      ctx.shadowColor = '#ddaa22';
      ctx.shadowBlur  = pulse ? 20 : 7;
      ctx.fillStyle   = pulse ? '#ffcc00' : '#cc8800';
      ctx.beginPath(); ctx.arc(ext.x, ext.y, 8, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
      const s = 3;
      ctx.beginPath(); ctx.moveTo(ext.x - s, ext.y - s); ctx.lineTo(ext.x + s, ext.y + s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ext.x + s, ext.y - s); ctx.lineTo(ext.x - s, ext.y + s); ctx.stroke();
      continue;
    }
    const pulse = ext.chasePulse > 0;
    ctx.shadowColor = '#dd3322';
    ctx.shadowBlur  = pulse ? 22 : (ext.dedicated ? 10 : 5);
    ctx.fillStyle   = pulse ? '#ff3311' : (ext.dedicated ? '#dd2211' : '#bb3322');
    ctx.beginPath(); ctx.arc(ext.x, ext.y, ext.dedicated ? 9.5 : 7.5, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    if (ext.dedicated) {
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
      const s = 3.5;
      ctx.beginPath(); ctx.moveTo(ext.x - s, ext.y); ctx.lineTo(ext.x + s, ext.y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ext.x, ext.y - s); ctx.lineTo(ext.x, ext.y + s); ctx.stroke();
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath(); ctx.arc(ext.x, ext.y, 2, 0, Math.PI * 2); ctx.fill();
    }
  }

  // Babies
  for (const b of babies) {
    if (!b.alive) continue;
    if (b.visitState === 'inside' && b.visitBldId !== inside) continue;
    ctx.shadowColor = '#ffaacc'; ctx.shadowBlur = 5;
    ctx.save();
    ctx.translate(b.x, b.y - 1);
    ctx.font = '9px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🐀', 0, 0);
    ctx.restore();
    ctx.shadowBlur = 0;
  }

  // Lady rats
  for (const ladyRat of ladyRats) {
    const ready = ladyRat.cooldown <= 0;
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 250);
    ctx.shadowColor = ready ? '#ff88cc' : '#553344';
    ctx.shadowBlur  = ready ? 8 + pulse * 8 : 3;
    ctx.save();
    ctx.translate(ladyRat.x, ladyRat.y - 2);
    ctx.scale(-1, 1);
    ctx.font = '13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🐀', 0, 0);
    ctx.restore();
    ctx.shadowBlur = 0;
    // ♀ label
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.globalAlpha = ready ? 1 : 0.4;
    ctx.fillText('💋', ladyRat.x, ladyRat.y - 10);
    ctx.globalAlpha = 1;
    // Cooldown ring
    if (ladyRat.cooldown > 0) {
      const prog = 1 - ladyRat.cooldown / LADY_COOLDOWN;
      ctx.strokeStyle = '#ff88cc'; ctx.lineWidth = 2; ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(ladyRat.x, ladyRat.y, 11, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2);
      ctx.stroke();
    }
    // Heart prompt when close and ready
    if (ready && Math.hypot(rat.x - ladyRat.x, rat.y - ladyRat.y) < 40) {
      ctx.font = '11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText('❤️', ladyRat.x, ladyRat.y - 18);
    }
  }

  // Chase warning border
  if (exterminators.some(e => e.chasing)) {
    const alpha = 0.12 + 0.08 * Math.sin(Date.now() / 120);
    ctx.strokeStyle = `rgba(220,40,20,${alpha})`; ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, CW - 8, CH - 8);
  }

  // Rat
  if (!rat.dead) {
    ctx.save();
    ctx.translate(rat.x, rat.y - 2);
    if (rat.lastDx > 0) ctx.scale(-1, 1);
    ctx.font = '15px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🐀', 0, 0);
    ctx.restore();
  } else {
    ctx.globalAlpha = 0.4;
    ctx.font = '15px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🐀', rat.x, rat.y - 2);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#cc3322'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    const s = 7;
    ctx.beginPath(); ctx.moveTo(rat.x - s, rat.y - s); ctx.lineTo(rat.x + s, rat.y + s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(rat.x + s, rat.y - s); ctx.lineTo(rat.x - s, rat.y + s); ctx.stroke();
  }
}

// ── Input ─────────────────────────────────────────────────────────────────────
const keys = {};
document.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',
       'KeyW','KeyA','KeyS','KeyD'].includes(e.code)) e.preventDefault();
});
document.addEventListener('keyup', e => { keys[e.code] = false; });

let touchVec = null;
function setupTouch(canvas) {
  function read(e) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect(), t = e.touches[0];
    touchVec = { x: (t.clientX - rect.left) * CW / rect.width, y: (t.clientY - rect.top) * CH / rect.height };
  }
  canvas.addEventListener('touchstart',  read, { passive: false });
  canvas.addEventListener('touchmove',   read, { passive: false });
  canvas.addEventListener('touchend',    () => { touchVec = null; }, { passive: false });
  canvas.addEventListener('touchcancel', () => { touchVec = null; }, { passive: false });
}

// ── Topbar ────────────────────────────────────────────────────────────────────
function updateTopbar() {
  const secs = Math.ceil(state.timeLeft);
  els.timer.textContent = secs;
  els.timer.classList.toggle('danger', secs <= 10);
  const { locations, people } = state.map;
  const cl = locations.filter(l => l.contaminated);
  els.infectedCount.textContent = cl.length;
  const total = cl.reduce((s, l) => s + l.spread, 0) + people.filter(p => p.infected).length * CHAIN_SPREAD_PTS;
  els.spreadCount.textContent = total >= 1000 ? `${(total / 1000).toFixed(1)}k` : total;
}

// ── State ─────────────────────────────────────────────────────────────────────
let gameGeneration = 0;
const RAT_SPEED = 130;

const state = {
  seed: dailySeed(), rng: null, map: null, shareText: '',
  gameActive: false, timeLeft: 60, lastTime: 0, diedInZone: null, deathZoneTimer: 0,
  rat: { x: VSTREET_CX[2], y: HSTREET_CY[1], dead: false, lastDx: 1, insideBuilding: null },
};

// ── DOM ───────────────────────────────────────────────────────────────────────
const els = {
  btnStart:      document.getElementById('btn-start'),
  canvas:        document.getElementById('canvas-map'),
  timer:         document.getElementById('timer'),
  infectedCount: document.getElementById('infected-count'),
  spreadCount:   document.getElementById('spread-count'),
};
const ctx = els.canvas.getContext('2d');

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + id).classList.add('active');
}

// ── Game loop ─────────────────────────────────────────────────────────────────
function gameLoop(timestamp) {
  if (!state.gameActive || state.generation !== gameGeneration) return;

  const dt = Math.max(Math.min((timestamp - state.lastTime) / 1000, 0.05), 0.001);
  state.lastTime = timestamp;

  state.timeLeft -= dt;
  if (state.timeLeft <= 0) {
    state.timeLeft = 0; state.gameActive = false;
    renderScene(ctx, state.map, state.rat); updateTopbar(); endGame(); return;
  }

  // Movement input
  let dx = 0, dy = 0;
  if (keys['ArrowLeft']  || keys['KeyA']) dx -= 1;
  if (keys['ArrowRight'] || keys['KeyD']) dx += 1;
  if (keys['ArrowUp']    || keys['KeyW']) dy -= 1;
  if (keys['ArrowDown']  || keys['KeyS']) dy += 1;
  if (touchVec) {
    const tdx = touchVec.x - state.rat.x, tdy = touchVec.y - state.rat.y;
    const td = Math.hypot(tdx, tdy);
    if (td > 6) { dx = tdx / td; dy = tdy / td; }
  }
  const mag = Math.hypot(dx, dy);
  if (mag > 0) { dx /= mag; dy /= mag; }
  if (dx !== 0) state.rat.lastDx = dx;

  const { locations, people, exterminators } = state.map;
  const insideId = state.rat.insideBuilding;
  const nx = state.rat.x + dx * RAT_SPEED * dt;
  const ny = state.rat.y + dy * RAT_SPEED * dt;
  if (nx > RAT_R && nx < CW - RAT_R && !hitsBuilding(nx, state.rat.y, locations, insideId)) state.rat.x = nx;
  if (ny > RAT_R && ny < CH - RAT_R && !hitsBuilding(state.rat.x, ny, locations, insideId)) state.rat.y = ny;

  // Death zone check — must linger ~1s inside the zone to trigger
  if (insideId !== null) {
    const dz = state.map.deathZones.find(z => z.buildingId === insideId);
    if (dz && Math.hypot(state.rat.x - dz.x, state.rat.y - dz.y) < dz.r) {
      state.deathZoneTimer += dt;
      if (state.deathZoneTimer >= 1.0) {
        state.gameActive = false;
        state.rat.dead = true;
        state.diedInZone = dz;
        renderScene(ctx, state.map, state.rat); updateTopbar();
        setTimeout(endGame, 600, gameGeneration);
        return;
      }
    } else {
      state.deathZoneTimer = 0;
    }
  } else {
    state.deathZoneTimer = 0;
  }

  // Building entry / exit
  if (insideId === null) {
    for (const loc of locations) {
      const r = loc.rect;
      if (state.rat.y < r.y + r.h && state.rat.y > r.y &&
          state.rat.x > r.x && state.rat.x < r.x + r.w) {
        state.rat.insideBuilding = loc.id; break;
      }
    }
  } else {
    const loc = locations[insideId];
    const r = loc.rect;
    const exited = loc.doorWall === 'S' ? state.rat.y > r.y + r.h :
                   loc.doorWall === 'N' ? state.rat.y < r.y :
                   loc.doorWall === 'E' ? state.rat.x > r.x + r.w :
                                          state.rat.x < r.x;
    if (exited) state.rat.insideBuilding = null;
  }

  // Contamination target dwell (only when inside)
  if (state.rat.insideBuilding !== null) {
    const loc = locations[state.rat.insideBuilding];
    let allDone = true;
    for (const t of loc.targets) {
      if (t.done) continue;
      const d = Math.hypot(state.rat.x - t.x, state.rat.y - t.y);
      if (d < TARGET_R) {
        t.prog += dt;
        if (t.prog >= t.dwell) t.done = true;
      } else {
        t.prog = Math.max(0, t.prog - dt * 0.8);
      }
      if (!t.done) allDone = false;
    }
    if (allDone && !loc.contaminated) loc.contaminated = true;
  }

  // Lady rats — reproduce on contact when off cooldown
  for (const lady of state.map.ladyRats) {
    updateLadyRat(lady, dt);
    if (lady.cooldown <= 0 && state.rat.insideBuilding === null &&
        Math.hypot(state.rat.x - lady.x, state.rat.y - lady.y) < REPRODUCE_R) {
      for (let i = 0; i < 3; i++) {
        const angle = (i / 3) * Math.PI * 2;
        state.map.babies.push(createBaby(
          lady.x + Math.cos(angle) * 16,
          lady.y + Math.sin(angle) * 16,
        ));
      }
      lady.cooldown = LADY_COOLDOWN;
    }
  }

  updateBabies(state.map.babies, dt, locations);
  updatePeople(people, state.rat, dt, locations);
  const killed = updateExterminators(exterminators, state.rat, state.map.babies, dt, locations);
  if (killed) { state.gameActive = false; setTimeout(endGame, 700, gameGeneration); renderScene(ctx, state.map, state.rat); return; }

  renderScene(ctx, state.map, state.rat);
  updateTopbar();
  requestAnimationFrame(gameLoop);
}

// ── End game ──────────────────────────────────────────────────────────────────
function endGame(gen) {
  if (gen !== undefined && gen !== gameGeneration) return;
  const { locations, people } = state.map;
  const dz = state.diedInZone;

  const contaminated = locations.filter(l => l.contaminated);
  const locTotal    = contaminated.reduce((s, l) => s + l.spread, 0);
  const personTotal = people.filter(p => p.infected).length * CHAIN_SPREAD_PTS;
  const base        = locTotal + personTotal;
  const mult        = dz ? dz.tierDef.mult : 1;
  const total       = Math.round(base * mult);

  showScreen('result');
  document.getElementById('final-count').textContent =
    total >= 1000 ? `~${(Math.round(total / 100) * 100).toLocaleString()}` : `~${total}`;

  const taglineParts = [];
  if (dz) taglineParts.push(`☠️ ${dz.tierDef.label} zone ×${dz.tierDef.mult}`);
  taglineParts.push(tagline(total));
  document.getElementById('final-tagline').textContent = taglineParts.join(' · ');

  buildInfectionGrid(locations, people);

  const emojiMap = { food: '🛒', water: '💧', transit: '🚇', resto: '🍕' };
  const icons = contaminated.map(l => emojiMap[l.type]).join('') || '(nothing)';
  const dzLine = dz ? `\n☠️ ${dz.tierDef.label} zone ×${dz.tierDef.mult}` : '';
  state.shareText = `🐀 Rat Race — ${state.seed}\n${icons}${dzLine}\nEst. ~${total.toLocaleString()} infected\n${window.location.href}`;
}

function buildInfectionGrid(locations, people) {
  const grid = document.getElementById('infection-grid');
  grid.innerHTML = '';
  for (const loc of locations) {
    const card = document.createElement('div');
    card.className = 'infection-card' + (loc.contaminated ? ' contaminated' : '');
    const countLabel = loc.contaminated ? loc.spread.toLocaleString() : '—';
    card.innerHTML = `<span class="card-emoji">${loc.emoji}</span>
      <span class="card-name">${loc.name}</span>
      <span class="card-count${loc.contaminated ? '' : ' zero'}">${countLabel}</span>`;
    grid.appendChild(card);
  }
  const infected = people.filter(p => p.infected).length;
  if (infected > 0) {
    const card = document.createElement('div');
    card.className = 'infection-card contaminated';
    card.innerHTML = `<span class="card-emoji">🤢</span>
      <span class="card-name">People Infected</span>
      <span class="card-count">${infected} × ${CHAIN_SPREAD_PTS}</span>`;
    grid.appendChild(card);
  }
}

function tagline(total) {
  if (total >= 30000) return 'You are a biological weapon.';
  if (total >= 15000) return 'City health officials are panicking.';
  if (total >= 8000)  return 'The outbreak is making the news.';
  if (total >= 3000)  return 'A few bad tummies. Could be worse.';
  return 'Mostly harmless. Try hitting the water supply.';
}

// ── Start game ────────────────────────────────────────────────────────────────
function startGame() {
  if (state.gameActive) return;
  gameGeneration++;
  state.generation = gameGeneration;

  for (const loc of state.map.locations) {
    loc.contaminated = false;
    for (const t of loc.targets) { t.prog = 0; t.done = false; }
  }
  for (const p of state.map.people) {
    p.infected = false;
    p.x = VSTREET_CX[p.col]; p.y = HSTREET_CY[p.row];
    p.targetCol = p.col; p.targetRow = p.row;
    p.visitState = null; p.visitBldId = null; p.visitTarget = null;
    p.visitApproachPos = null;
    p.visitCooldown = 3 + Math.random() * 7;
  }
  for (const ext of state.map.exterminators) {
    ext.chasing = false; ext.chasePulse = 0; ext.catchCooldown = 0;
  }
  for (const lady of state.map.ladyRats) lady.cooldown = 0;
  state.map.babies = [];

  state.gameActive     = true;
  state.timeLeft       = 60;
  state.diedInZone     = null;
  state.deathZoneTimer = 0;
  state.rat.x       = VSTREET_CX[2];
  state.rat.y          = HSTREET_CY[1];
  state.rat.dead       = false;
  state.rat.lastDx     = 1;
  state.rat.insideBuilding = null;
  state.lastTime = performance.now();
  requestAnimationFrame(gameLoop);
}

// ── Buttons ───────────────────────────────────────────────────────────────────
els.btnStart.addEventListener('click', () => { showScreen('game'); startGame(); });
document.getElementById('btn-restart').addEventListener('click', () => {
  state.rng = mulberry32(hashSeed(state.seed));
  state.map = generateMap(state.rng);
  showScreen('landing');
  renderScene(ctx, state.map, state.rat);
});
document.getElementById('btn-share').addEventListener('click', () => {
  navigator.clipboard.writeText(state.shareText || '🐀 Rat Race').then(() => {
    const btn = document.getElementById('btn-share');
    btn.textContent = '✓ Copied!';
    setTimeout(() => { btn.textContent = '📋 Share Results'; }, 2000);
  });
});

// ── Init ──────────────────────────────────────────────────────────────────────
function init() {
  state.rng = mulberry32(hashSeed(state.seed));
  state.map = generateMap(state.rng);
  setupTouch(els.canvas);
  els.canvas.style.cursor = 'default';
  renderScene(ctx, state.map, state.rat);
}

init();
