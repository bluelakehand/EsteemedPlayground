// ============================================================
//  ROGUE LIGHT DECK BUILDER
//  A rogue (the D&D class) sneaks into houses to steal
//  materials for building lightweight decks.
//  It is NOT a roguelite deckbuilder. That's the joke.
// ============================================================

// ==================== SEEDING ====================
function hashSeed(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function makePRNG(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function getDailySeed() {
  const d = new Date();
  return `rogue-${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function rngInt(rng, min, max) { return min + Math.floor(rng() * (max - min + 1)); }
function rngPick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
function rngShuffle(rng, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ==================== CONSTANTS ====================
const CW = 1100, CH = 620;
const ROOM_COLS = 4, ROOM_ROWS = 3;
const SLOT_W = 275, SLOT_H = 206;
const WALL_T = 20;
const CORR_W = 38;
const PLAYER_R = 9;
const PHASE1_SECS = 180;
const PHASE2_SECS = 120;
const SUSP_MAX = 100;
const SUSP_DRAIN = 18;
const SUSP_WALK  = 8;
const SUSP_RUN   = 38;

const MATERIALS = {
  post:   { label: 'Post',   icon: '🪵', colors: ['#8B4513','#778899'], variants: ['Pine Post','Steel Post'],   weights: [4,11], strengths: [3,9]  },
  plank:  { label: 'Plank',  icon: '🪚', colors: ['#DEB887','#8B6914'], variants: ['Pine Plank','Oak Plank'],   weights: [3,6],  strengths: [2,5]  },
  railing:{ label: 'Rail',   icon: '⛓', colors: ['#A9A9A9','#556B2F'], variants: ['Cable Rail','Steel Rail'], weights: [2,5],  strengths: [1,4]  },
  step:   { label: 'Step',   icon: '🪜', colors: ['#8B7355','#696969'], variants: ['Wood Step','Concrete Step'],weights: [4,10], strengths: [3,7]  },
  canopy: { label: 'Canopy', icon: '⛺', colors: ['#4682B4','#2F4F4F'], variants: ['Tarp','Canvas'],          weights: [2,4],  strengths: [1,3]  },
};

const NPC_DEFS = {
  owner:    { label: 'Owner',  color: '#FF4444', r: 13, speed: 72,  viewAngle: Math.PI/3,  viewDist: 160, hearWalk: 80,  hearRun: 170, turnRate: 2.8 },
  spouse:   { label: 'Spouse', color: '#FF7744', r: 13, speed: 56,  viewAngle: Math.PI/4,  viewDist: 130, hearWalk: 65,  hearRun: 130, turnRate: 2.2 },
  dog:      { label: 'Dog',    color: '#FFA500', r: 10, speed: 120, viewAngle: Math.PI/2,  viewDist: 80,  hearWalk: 100, hearRun: 200, turnRate: 5.0 },
  blinddog: { label: 'Blind Dog', color: '#FFA500', r: 10, speed: 60, viewAngle: 0,        viewDist: 0,   hearWalk: 200, hearRun: 370, turnRate: 5.0 },
  mil:      { label: 'MIL',   color: '#CC44CC', r: 22, speed: 28,  viewAngle: Math.PI/16, viewDist: 240, hearWalk: 50,  hearRun: 100, turnRate: 0.9 },
};

// Build phase — side-view node/beam grid
const GRID_X0 = 185, GRID_Y0 = 80;
const GRID_CELL = 58, GRID_COLS = 14, GRID_ROWS = 8;
const GROUND_Y = GRID_Y0 + GRID_ROWS * GRID_CELL;  // 544
const HOUSE_W = GRID_X0 - 5;

function gridPt(col, row) { return { x: GRID_X0 + col * GRID_CELL, y: GRID_Y0 + row * GRID_CELL }; }
function mkNodeKey(col, row) { return `${col},${row}`; }
function snapToGrid(px, py) {
  const col = Math.round((px - GRID_X0) / GRID_CELL);
  const row = Math.round((py - GRID_Y0) / GRID_CELL);
  if (col < 0 || col > GRID_COLS || row < 0 || row > GRID_ROWS) return null;
  const pt = gridPt(col, row);
  if (Math.hypot(px - pt.x, py - pt.y) > GRID_CELL * 0.44) return null;
  return { col, row, ...pt, key: mkNodeKey(col, row) };
}
function beamColor(type) {
  return { post: '#8B5A2B', plank: '#C8A96E', railing: '#9AABB5', step: '#A08060', canopy: '#3A7FA0' }[type] || '#888';
}
function stressColor(s) {
  if (s < 0.5) return '#44dd88';
  if (s < 0.75) return '#ffcc44';
  if (s < 0.9) return '#ff8844';
  return '#ff3333';
}

// ==================== STATE ====================
let canvas, ctx, rng, seedStr;
let phase = 'title';
let timer = 0;
let suspicion = 0;
let lastTs = null;
let rooms = [], corridors = [];
let entranceRoomIdx = 0;
let player = {};
let npcs = [];
let inventory = [];        // collected materials during stealth
let buildHand = [];        // stacked material groups for build phase
let buildSelected = null;  // index into buildHand (selected material)
let nodes = {};            // nodeKey -> {col,row,x,y,key,fixed}
let beams = [];            // [{id,aKey,bKey,type,variant,stress,broken}]
let pendingKey = null;     // first node of in-progress beam
let hoverSnap = null;      // grid snap under cursor during build
let deckConfig = null;     // {elevated,anchorRow,anchorKey,houseTop}
let testState = null;      // null | {phase:'running'|'done', timer}
let testRunsLeft = 2;
let nextBeamId = 0;
let keys = {};
let lp = null;             // lockpick state
let mousePos = { x: 0, y: 0 };
let finalScore = null;
let hoveredCorr = null;    // corridor player is near for lockpick prompt

// ==================== SEEDING / GENERATION ====================

function init(seedInput) {
  seedStr = seedInput || getDailySeed();
  rng = makePRNG(hashSeed(seedStr));

  rooms = [];
  corridors = [];
  inventory = [];
  buildHand = [];
  buildSelected = null;
  nodes = {}; beams = []; pendingKey = null; hoverSnap = null;
  deckConfig = null; testState = null; testRunsLeft = 2; nextBeamId = 0;
  suspicion = 0;
  timer = PHASE1_SECS;
  lastTs = null;
  lp = null;
  finalScore = null;
  hoveredCorr = null;

  generateHouse();
  generateNPCs();
  generateMaterials();
  spawnPlayer();

  document.getElementById('inventory-items').innerHTML = '';
  document.getElementById('build-panel').style.display = 'none';
  document.getElementById('inventory-panel').style.display = 'flex';
  document.getElementById('phase-label').textContent = 'INFILTRATION';
  document.getElementById('suspicion-fill').style.width = '0%';

  hideOverlay();
  phase = 'stealth';
  requestAnimationFrame(loop);
}

function generateHouse() {
  // Activate 10 out of 12 slots using random walk for connectivity
  const active = Array(12).fill(false);
  const startIdx = rngInt(rng, 0, 11);
  active[startIdx] = true;
  const frontier = [startIdx];
  let count = 1;

  while (count < 10) {
    if (frontier.length === 0) break;
    const src = frontier[Math.floor(rng() * frontier.length)];
    const { col, row } = slotAt(src);
    const nbrs = neighbors(col, row).filter(i => !active[i]);
    if (nbrs.length === 0) { frontier.splice(frontier.indexOf(src), 1); continue; }
    const chosen = rngPick(rng, nbrs);
    active[chosen] = true;
    frontier.push(chosen);
    count++;
  }

  // Build room objects
  for (let i = 0; i < 12; i++) {
    if (!active[i]) continue;
    const { col, row } = slotAt(i);
    rooms.push({
      idx: rooms.length,
      col, row,
      x: col * SLOT_W + WALL_T,
      y: row * SLOT_H + WALL_T,
      w: SLOT_W - 2 * WALL_T,
      h: SLOT_H - 2 * WALL_T,
      materials: [],
      connections: [],
      isEntrance: false,
    });
  }

  // Corridors between adjacent active rooms
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const a = rooms[i], b = rooms[j];
      const dc = Math.abs(a.col - b.col), dr = Math.abs(a.row - b.row);
      if (dc + dr !== 1) continue;
      const isH = dc === 1;
      let corr;
      if (isH) {
        const left = a.col < b.col ? a : b;
        const wallX = (left.col + 1) * SLOT_W;
        const cy = left.y + left.h / 2;
        corr = { x: wallX - WALL_T, y: cy - CORR_W / 2, w: WALL_T * 2, h: CORR_W };
      } else {
        const top = a.row < b.row ? a : b;
        const wallY = (top.row + 1) * SLOT_H;
        const cx = top.x + top.w / 2;
        corr = { x: cx - CORR_W / 2, y: wallY - WALL_T, w: CORR_W, h: WALL_T * 2 };
      }
      const locked = rng() < 0.28;
      const c = { ...corr, locked, open: !locked, roomA: i, roomB: j };
      corridors.push(c);
      rooms[i].connections.push({ toIdx: j, corr: c });
      rooms[j].connections.push({ toIdx: i, corr: c });
    }
  }

  // Pick entrance room (bottom row preferred)
  const bottomRooms = rooms.filter(r => r.row === ROOM_ROWS - 1);
  const entRoom = rngPick(rng, bottomRooms.length ? bottomRooms : rooms);
  entRoom.isEntrance = true;
  entranceRoomIdx = entRoom.idx;
}

function slotAt(i) { return { col: i % ROOM_COLS, row: Math.floor(i / ROOM_COLS) }; }
function neighbors(col, row) {
  const res = [];
  if (col > 0)           res.push(row * ROOM_COLS + col - 1);
  if (col < ROOM_COLS-1) res.push(row * ROOM_COLS + col + 1);
  if (row > 0)           res.push((row-1) * ROOM_COLS + col);
  if (row < ROOM_ROWS-1) res.push((row+1) * ROOM_COLS + col);
  return res;
}

function generateMaterials() {
  const types = Object.keys(MATERIALS);
  // Guarantee minimum: posts and planks in entrance room
  const entRoom = rooms[entranceRoomIdx];
  const minTypes = ['post', 'post', 'plank', 'plank', 'plank'];
  for (const t of minTypes) {
    placeMat(entRoom, t, 0);
  }
  // Scatter additional materials across all rooms
  for (const room of rooms) {
    const count = rngInt(rng, 1, 4);
    for (let i = 0; i < count; i++) {
      const type = rngPick(rng, types);
      const variant = rng() < 0.4 ? 1 : 0;
      placeMat(room, type, variant);
    }
  }
}

function placeMat(room, type, variant) {
  const margin = 14;
  const mx = room.x + margin + rng() * (room.w - 2 * margin);
  const my = room.y + margin + rng() * (room.h - 2 * margin);
  room.materials.push({ type, variant, x: mx, y: my, collected: false });
}

function generateNPCs() {
  npcs = [];
  spawnNPC('owner');
  if (rng() < 0.55) spawnNPC('spouse');
  if (rng() < 0.45) spawnNPC(rng() < 0.5 ? 'dog' : 'blinddog');
  if (rng() < 0.35) spawnNPC('mil');
}

// BFS shortest path between two room indices through the connection graph
function roomBFS(fromIdx, toIdx) {
  const prev = new Map([[fromIdx, null]]);
  const queue = [fromIdx];
  while (queue.length) {
    const cur = queue.shift();
    if (cur === toIdx) break;
    for (const conn of rooms[cur].connections) {
      if (!prev.has(conn.toIdx)) {
        prev.set(conn.toIdx, { fromIdx: cur, corr: conn.corr });
        queue.push(conn.toIdx);
      }
    }
  }
  if (!prev.has(toIdx)) return null;
  const path = [];
  let cur = toIdx;
  while (cur !== null) {
    const p = prev.get(cur);
    path.unshift({ roomIdx: cur, corrFrom: p ? p.corr : null });
    cur = p ? p.fromIdx : null;
  }
  return path;
}

// Convert an ordered list of room indices into {x,y} waypoints via corridors
function buildPatrolWaypoints(roomIdxOrder) {
  const wps = [];
  for (let i = 0; i < roomIdxOrder.length; i++) {
    const from = roomIdxOrder[i];
    const to   = roomIdxOrder[(i + 1) % roomIdxOrder.length];
    const path = roomBFS(from, to);
    if (!path) continue;
    for (let j = 0; j < path.length; j++) {
      const room = rooms[path[j].roomIdx];
      // Skip the first point of each segment (it's the last point of the previous)
      if (j === 0 && wps.length > 0) continue;
      if (path[j].corrFrom) {
        // Pass through corridor midpoint first
        const c = path[j].corrFrom;
        wps.push({ x: c.x + c.w / 2, y: c.y + c.h / 2 });
      }
      // Then room centre with slight random offset so NPCs don't all stack
      wps.push({
        x: room.x + room.w / 2 + (rng() - 0.5) * room.w * 0.35,
        y: room.y + room.h / 2 + (rng() - 0.5) * room.h * 0.35,
      });
    }
  }
  return wps;
}

function bfsDistances(fromIdx) {
  const dist = new Map([[fromIdx, 0]]);
  const queue = [fromIdx];
  while (queue.length) {
    const cur = queue.shift();
    for (const conn of rooms[cur].connections) {
      if (!dist.has(conn.toIdx)) {
        dist.set(conn.toIdx, dist.get(cur) + 1);
        queue.push(conn.toIdx);
      }
    }
  }
  return dist;
}

function spawnNPC(type) {
  const roomOrder = rngShuffle(rng, rooms.map((_, i) => i));
  const wps = buildPatrolWaypoints(roomOrder);
  if (wps.length === 0) return;

  // Pick a starting room at least 2 hops from the entrance
  const dists = bfsDistances(entranceRoomIdx);
  const farRooms = rooms.filter((_, i) => (dists.get(i) ?? 0) >= 2);
  const startRoom = rngPick(rng, farRooms.length ? farRooms : rooms.filter((_, i) => i !== entranceRoomIdx));

  // Find the waypoint nearest to that room's centre
  const rx = startRoom.x + startRoom.w / 2;
  const ry = startRoom.y + startRoom.h / 2;
  let bestIdx = 0, bestDist = Infinity;
  for (let i = 0; i < wps.length; i++) {
    const d = Math.hypot(wps[i].x - rx, wps[i].y - ry);
    if (d < bestDist) { bestDist = d; bestIdx = i; }
  }

  npcs.push({
    type,
    x: wps[bestIdx].x,
    y: wps[bestIdx].y,
    angle: rng() * Math.PI * 2,
    patrol: wps,
    patrolIdx: (bestIdx + 1) % wps.length,
    state: 'patrol',
    navPath: [],
    navPathIdx: 0,
    investigateTimer: 0,
    boxBlindTimer: 0,
  });
}

function spawnPlayer() {
  const room = rooms[entranceRoomIdx];
  player = {
    x: room.x + room.w / 2,
    y: room.y + room.h - 20,
    vx: 0, vy: 0,
    isRunning: false,
    inBox: false,
  };
}

// ==================== WALKABILITY ====================

function isWalkable(x, y) {
  for (const r of rooms) {
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return true;
  }
  for (const c of corridors) {
    if (!c.open) continue;
    if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) return true;
  }
  return false;
}

function canMoveTo(x, y) {
  const r = PLAYER_R;
  return isWalkable(x - r, y) && isWalkable(x + r, y) &&
         isWalkable(x, y - r) && isWalkable(x, y + r) &&
         isWalkable(x, y);
}

// ==================== PLAYER UPDATE ====================

function updatePlayer(dt) {
  const walk = 80, run = 160, boxSpd = 32;
  player.isRunning = !!(keys['ShiftLeft'] || keys['ShiftRight']) && !player.inBox;
  const spd = player.inBox ? boxSpd : (player.isRunning ? run : walk);

  let dx = 0, dy = 0;
  if (keys['KeyW'] || keys['ArrowUp'])    dy -= 1;
  if (keys['KeyS'] || keys['ArrowDown'])  dy += 1;
  if (keys['KeyA'] || keys['ArrowLeft'])  dx -= 1;
  if (keys['KeyD'] || keys['ArrowRight']) dx += 1;
  if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }
  player.isMoving = (dx !== 0 || dy !== 0);

  const nx = player.x + dx * spd * dt;
  const ny = player.y + dy * spd * dt;

  if (canMoveTo(nx, ny)) {
    player.x = nx; player.y = ny;
  } else if (canMoveTo(nx, player.y)) {
    player.x = nx;
  } else if (canMoveTo(player.x, ny)) {
    player.y = ny;
  }

  // Collect nearby materials
  for (const room of rooms) {
    for (const mat of room.materials) {
      if (mat.collected) continue;
      const ddx = player.x - mat.x, ddy = player.y - mat.y;
      if (ddx * ddx + ddy * ddy < 18 * 18) {
        mat.collected = true;
        inventory.push({ type: mat.type, variant: mat.variant });
        renderInventory();
      }
    }
  }

  // Check near locked corridors for lockpick prompt
  hoveredCorr = null;
  for (const c of corridors) {
    if (!c.locked) continue;
    // Clamp player to nearest point on corridor rect, then check distance
    const nearX = Math.max(c.x, Math.min(player.x, c.x + c.w));
    const nearY = Math.max(c.y, Math.min(player.y, c.y + c.h));
    const ddx = player.x - nearX, ddy = player.y - nearY;
    if (ddx * ddx + ddy * ddy < 55 * 55) { hoveredCorr = c; break; }
  }
}

function nearExit() {
  const entRoom = rooms[entranceRoomIdx];
  const cx = entRoom.x + entRoom.w / 2;
  const cy = entRoom.y + entRoom.h - 12;
  const dx = player.x - cx, dy = player.y - cy;
  return dx * dx + dy * dy < 36 * 36;
}

// ==================== NPC UPDATE ====================

function lerpAngle(current, target, maxDelta) {
  let diff = target - current;
  while (diff > Math.PI)  diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  diff = Math.max(-maxDelta, Math.min(maxDelta, diff));
  return current + diff;
}

// Returns the index of the room containing (x, y), or the nearest room if in a wall/corridor
function findRoomIdx(x, y) {
  for (let i = 0; i < rooms.length; i++) {
    const r = rooms[i];
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return i;
  }
  let best = 0, bestD = Infinity;
  for (let i = 0; i < rooms.length; i++) {
    const r = rooms[i];
    const d = Math.hypot(x - (r.x + r.w / 2), y - (r.y + r.h / 2));
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}

// Build a list of {x,y} waypoints through corridors from fromRoom to finalPos in toRoom
function buildNavPath(fromRoomIdx, toRoomIdx, finalX, finalY) {
  if (fromRoomIdx === toRoomIdx) return [{ x: finalX, y: finalY }];
  const path = roomBFS(fromRoomIdx, toRoomIdx);
  if (!path) return [{ x: finalX, y: finalY }];
  const wps = [];
  for (let i = 1; i < path.length; i++) {
    const { roomIdx, corrFrom } = path[i];
    if (corrFrom) wps.push({ x: corrFrom.x + corrFrom.w / 2, y: corrFrom.y + corrFrom.h / 2 });
    if (i < path.length - 1) {
      const r = rooms[roomIdx];
      wps.push({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
    }
  }
  wps.push({ x: finalX, y: finalY });
  return wps;
}

function followNavPath(npc, def, dt, speed, onDone, arrivalDist = 8) {
  if (npc.navPathIdx >= npc.navPath.length) { onDone(); return; }
  const wp = npc.navPath[npc.navPathIdx];
  const dx = wp.x - npc.x, dy = wp.y - npc.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < arrivalDist) {
    npc.navPathIdx++;
    if (npc.navPathIdx >= npc.navPath.length) onDone();
  } else {
    npc.x += (dx / dist) * speed * dt;
    npc.y += (dy / dist) * speed * dt;
    npc.angle = lerpAngle(npc.angle, Math.atan2(dy, dx), def.turnRate * dt);
  }
}

function npcReturnToPatrol(npc) {
  const npcRoomIdx = findRoomIdx(npc.x, npc.y);
  let nearIdx = 0, nearDist = Infinity;
  for (let i = 0; i < npc.patrol.length; i++) {
    const d = Math.hypot(npc.patrol[i].x - npc.x, npc.patrol[i].y - npc.y);
    if (d < nearDist) { nearDist = d; nearIdx = i; }
  }
  const target = npc.patrol[nearIdx];
  npc.navPath = buildNavPath(npcRoomIdx, findRoomIdx(target.x, target.y), target.x, target.y);
  npc.navPathIdx = 0;
  npc.patrolIdx = (nearIdx + 1) % npc.patrol.length;
  npc.state = 'to_patrol';
}

function updateNPCs(dt) {
  for (const npc of npcs) {
    const def = NPC_DEFS[npc.type];
    if (npc.boxBlindTimer > 0) npc.boxBlindTimer -= dt;

    if (npc.state === 'to_door') {
      followNavPath(npc, def, dt, def.speed * 1.6, () => { npc.state = 'at_door'; });

    } else if (npc.state === 'at_door') {
      npc.angle += 2.2 * dt;
      npc.investigateTimer -= dt;
      if (npc.investigateTimer <= 0) npcReturnToPatrol(npc);

    } else if (npc.state === 'inspect_box') {
      if (Math.hypot(player.x - npc.x, player.y - npc.y) < 32) {
        npc.state = 'staring_box';
      } else {
        followNavPath(npc, def, dt, def.speed * 1.3, () => { npc.state = 'staring_box'; }, 32);
      }

    } else if (npc.state === 'staring_box') {
      const dpx = player.x - npc.x, dpy = player.y - npc.y;
      npc.angle = lerpAngle(npc.angle, Math.atan2(dpy, dpx), def.turnRate * dt);
      npc.investigateTimer -= dt;
      if (npc.investigateTimer <= 0) { npc.boxBlindTimer = 3.0; npcReturnToPatrol(npc); }

    } else if (npc.state === 'to_patrol') {
      followNavPath(npc, def, dt, def.speed, () => { npc.state = 'patrol'; });

    } else {
      // Normal patrol
      const wp = npc.patrol[npc.patrolIdx];
      const dx = wp.x - npc.x, dy = wp.y - npc.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 6) {
        npc.patrolIdx = (npc.patrolIdx + 1) % npc.patrol.length;
      } else {
        npc.x += (dx / dist) * def.speed * dt;
        npc.y += (dy / dist) * def.speed * dt;
        npc.angle = lerpAngle(npc.angle, Math.atan2(dy, dx), def.turnRate * dt);
      }
    }
  }
}

function kickDoor(corr) {
  corr.locked = false;
  corr.open = true;
  corr.kicked = true;
  suspicion = SUSP_MAX * 0.9;
  const tx = corr.x + corr.w / 2, ty = corr.y + corr.h / 2;
  // Pick whichever adjacent room is closer to navigate through
  for (const npc of npcs) {
    const npcRoomIdx = findRoomIdx(npc.x, npc.y);
    const pathA = roomBFS(npcRoomIdx, corr.roomA);
    const pathB = roomBFS(npcRoomIdx, corr.roomB);
    const lenA = pathA ? pathA.length : Infinity;
    const lenB = pathB ? pathB.length : Infinity;
    const doorRoomIdx = lenA <= lenB ? corr.roomA : corr.roomB;
    npc.navPath = buildNavPath(npcRoomIdx, doorRoomIdx, tx, ty);
    npc.navPathIdx = 0;
    npc.state = 'to_door';
    npc.investigateTimer = 3.0;
  }
}

function checkDetection(dt) {
  let inHearing = false;
  for (const npc of npcs) {
    const def = NPC_DEFS[npc.type];
    const dx = player.x - npc.x, dy = player.y - npc.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // View cone -- box hides player; bare player = instant catch
    if (def.viewDist > 0 && dist < def.viewDist) {
      const toPlayer = Math.atan2(dy, dx);
      const diff = Math.abs(wrapAngle(toPlayer - npc.angle));
      if (diff < def.viewAngle && hasLOS(npc.x, npc.y, player.x, player.y)) {
        if (player.inBox) {
          if ((npc.state === 'patrol' || npc.state === 'to_patrol') && npc.boxBlindTimer <= 0) {
            const npcRoomIdx = findRoomIdx(npc.x, npc.y);
            const plrRoomIdx = findRoomIdx(player.x, player.y);
            npc.navPath = buildNavPath(npcRoomIdx, plrRoomIdx, player.x, player.y);
            npc.navPathIdx = 0;
            npc.state = 'inspect_box';
            npc.investigateTimer = 3.5;
          }
        } else {
          return 'spotted';
        }
      }
    }

    // Hearing
    const hearD = player.isRunning ? def.hearRun : def.hearWalk;
    if (dist < hearD) {
      inHearing = true;
      const rate = player.isRunning ? SUSP_RUN : SUSP_WALK;
      suspicion += rate * (1 - dist / hearD) * dt;
    }
  }
  if (!inHearing) suspicion = Math.max(0, suspicion - SUSP_DRAIN * dt);

  // Moving while in the box with an NPC closing in spikes suspicion fast
  if (player.inBox && player.isMoving) {
    const beingInspected = npcs.some(n => n.state === 'inspect_box' || n.state === 'staring_box');
    if (beingInspected) suspicion = Math.min(SUSP_MAX, suspicion + 90 * dt);
  }

  if (suspicion >= SUSP_MAX) return 'alerted';
  return null;
}

function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function hasLOS(x1, y1, x2, y2) {
  const steps = Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 5);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (!isWalkable(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t)) return false;
  }
  return true;
}

function castRay(ox, oy, angle, maxDist) {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const step = 6;
  let prev = { x: ox, y: oy };
  for (let d = step; d <= maxDist; d += step) {
    const x = ox + cos * d, y = oy + sin * d;
    if (!isWalkable(x, y)) return prev;
    prev = { x, y };
  }
  return { x: ox + cos * maxDist, y: oy + sin * maxDist };
}

// ==================== LOCKPICK MINIGAME ====================

function startLockpick(corr) {
  lp = {
    corr,
    bar: 0, dir: 1,
    speed: 1.1 + rng() * 0.7,
    zoneStart: 0.35 + rng() * 0.2,
    zoneEnd: 0,
    attempts: 3,
    flashTimer: 0,
    flashColor: null,
  };
  lp.zoneEnd = lp.zoneStart + 0.06 + rng() * 0.05;
  // no phase change â€” NPCs keep moving
}

function updateLockpick(dt) {
  lp.bar += lp.dir * lp.speed * dt;
  if (lp.bar >= 1) { lp.bar = 1; lp.dir = -1; }
  if (lp.bar <= 0) { lp.bar = 0; lp.dir = 1; }
  if (lp.flashTimer > 0) lp.flashTimer -= dt;
}

function attemptPick() {
  if (lp.bar >= lp.zoneStart && lp.bar <= lp.zoneEnd) {
    lp.corr.locked = false;
    lp.corr.open = true;
    lp.flashColor = '#4f4';
    lp.flashTimer = 0.35;
    setTimeout(() => { lp = null; }, 360);
  } else {
    lp.attempts--;
    lp.flashColor = '#f44';
    lp.flashTimer = 0.3;
    if (lp.attempts <= 0) {
      suspicion = Math.min(SUSP_MAX, suspicion + 50);
      setTimeout(() => { lp = null; }, 320);
    }
  }
}

// ==================== PHASE 2: BUILD ====================

function generateDeckConfig() {
  const elevated = rng() < 0.5;
  const anchorRow = elevated ? rngInt(rng, 1, 2) : rngInt(rng, 4, 6);
  const anchorKey = mkNodeKey(0, anchorRow);
  const anchorY = GRID_Y0 + anchorRow * GRID_CELL;
  const houseTop = Math.max(20, anchorY - rngInt(rng, 20, 60));
  deckConfig = { elevated, anchorRow, anchorKey, houseTop };
}

function startBuildPhase() {
  phase = 'build';
  const groups = {};
  for (const item of inventory) {
    const key = `${item.type}:${item.variant}`;
    if (!groups[key]) groups[key] = { type: item.type, variant: item.variant, total: 0, remaining: 0 };
    groups[key].total++;
    groups[key].remaining++;
  }
  buildHand = Object.values(groups);
  buildSelected = null;
  generateDeckConfig();
  nodes = {}; beams = []; pendingKey = null; testState = null;
  testRunsLeft = 2; nextBeamId = 0;
  const { anchorKey, anchorRow } = deckConfig;
  const ap = gridPt(0, anchorRow);
  nodes[anchorKey] = { ...ap, col: 0, row: anchorRow, key: anchorKey, fixed: true };
  document.getElementById('phase-label').textContent = 'CONSTRUCTION';
  document.getElementById('timer-display').textContent = '—';
  document.getElementById('timer-display').style.color = '#555';
  document.getElementById('inventory-panel').style.display = 'none';
  document.getElementById('build-panel').style.display = 'flex';
  document.getElementById('suspicion-fill').style.width = '0%';
  syncTestButton();
  renderBuildHand();
}

function syncTestButton() {
  const btn = document.getElementById('btn-submit');
  if (testRunsLeft > 0) {
    btn.textContent = testState && testState.phase === 'done' ? `RETEST (${testRunsLeft} left)` : `RUN TEST (${testRunsLeft})`;
  } else {
    btn.textContent = 'SUBMIT DECK';
  }
}

function renderBuildHand() {
  const el = document.getElementById('build-hand');
  el.innerHTML = '';
  buildHand.forEach((stack, i) => {
    const mat = MATERIALS[stack.type];
    const empty = stack.remaining === 0;
    const div = document.createElement('div');
    div.className = 'hand-item' + (empty ? ' placed' : '') + (buildSelected === i ? ' selected' : '');
    const shortName = mat.variants[stack.variant].split(' ')[0];
    div.innerHTML = `<span class=”item-icon”>${mat.icon}</span><span class=”item-name”>${shortName}</span><span class=”item-count”>×${stack.remaining}</span>`;
    div.addEventListener('click', () => {
      if (empty) return;
      buildSelected = buildSelected === i ? null : i;
      pendingKey = null;
      renderBuildHand();
    });
    el.appendChild(div);
  });
}

// ---- Node / beam management ----

function getOrCreateNode(snap) {
  if (!nodes[snap.key]) {
    nodes[snap.key] = { col: snap.col, row: snap.row, x: snap.x, y: snap.y, key: snap.key, fixed: false };
  }
  return nodes[snap.key];
}

function tryPlaceBeam(snap) {
  if (buildSelected === null || !pendingKey) return;
  if (snap.key === pendingKey) { pendingKey = null; return; }
  const stack = buildHand[buildSelected];
  if (!stack || stack.remaining === 0) return;
  if (beams.some(b => !b.broken &&
    ((b.aKey === pendingKey && b.bKey === snap.key) || (b.aKey === snap.key && b.bKey === pendingKey)))) {
    pendingKey = null; return;
  }
  getOrCreateNode(snap);
  beams.push({ id: nextBeamId++, aKey: pendingKey, bKey: snap.key,
    type: stack.type, variant: stack.variant, stress: null, broken: false });
  stack.remaining--;
  if (stack.remaining === 0) buildSelected = null;
  pendingKey = null;
  testState = null;
  renderBuildHand();
  syncTestButton();
}

function getBeamNear(px, py, thresh = 14) {
  let best = null, bestD = thresh;
  for (let i = 0; i < beams.length; i++) {
    const b = beams[i];
    if (b.broken) continue;
    const a = nodes[b.aKey], nb = nodes[b.bKey];
    if (!a || !nb) continue;
    const dx = nb.x - a.x, dy = nb.y - a.y;
    const len2 = dx*dx + dy*dy;
    if (len2 === 0) continue;
    const t = Math.max(0, Math.min(1, ((px-a.x)*dx + (py-a.y)*dy) / len2));
    const d = Math.hypot(px - (a.x + t*dx), py - (a.y + t*dy));
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}

function removeBeamAt(idx) {
  const b = beams[idx];
  if (!b) return;
  const stack = buildHand.find(s => s.type === b.type && s.variant === b.variant);
  if (stack) stack.remaining++;
  beams.splice(idx, 1);
  const used = new Set(beams.flatMap(bm => [bm.aKey, bm.bKey]));
  for (const k of Object.keys(nodes)) {
    if (!nodes[k].fixed && !used.has(k)) delete nodes[k];
  }
  testState = null;
  renderBuildHand();
  syncTestButton();
}

// ---- Stress calculation ----

function calcSupportedNodes() {
  const sup = new Set([deckConfig.anchorKey]);
  for (const k of Object.keys(nodes)) {
    if (nodes[k].row === GRID_ROWS) sup.add(k);
  }
  let changed = true;
  const active = beams.filter(b => !b.broken);
  while (changed) {
    changed = false;
    for (const b of active) {
      if (sup.has(b.aKey) && !sup.has(b.bKey)) { sup.add(b.bKey); changed = true; }
      if (sup.has(b.bKey) && !sup.has(b.aKey)) { sup.add(b.aKey); changed = true; }
    }
  }
  return sup;
}

function calcStress() {
  const sup = calcSupportedNodes();
  for (const b of beams) {
    const a = nodes[b.aKey], nb = nodes[b.bKey];
    if (!a || !nb) { b.stress = 1; b.supported = false; continue; }
    const mat = MATERIALS[b.type];
    const str = mat.strengths[b.variant];
    const dx = nb.x - a.x, dy = nb.y - a.y;
    const len = Math.sqrt(dx*dx + dy*dy);
    const ang = Math.atan2(Math.abs(dy), Math.abs(dx)); // 0=horiz, PI/2=vert
    let ori = 0;
    if (b.type === 'post')    ori = ang > 1.1 ? 0.4 : 0;
    if (b.type === 'plank')   ori = ang < 0.3 ? 0.4 : 0;
    if (b.type === 'railing') ori = (ang > 0.3 && ang < 1.1) ? 0.3 : 0;
    if (b.type === 'step')    ori = (ang > 0.2 && ang < 0.8) ? 0.25 : 0;
    if (b.type === 'canopy')  ori = ang < 0.3 ? 0.5 : 0;
    const effStr = str * (1 + ori);
    const unsupPen = (!sup.has(b.aKey) || !sup.has(b.bKey)) ? 0.45 : 0;
    b.stress = Math.min(1, (len / GRID_CELL) / effStr * 0.35 + unsupPen);
    b.supported = sup.has(b.aKey) && sup.has(b.bKey);
  }
}

function calcScore() {
  const sup = calcSupportedNodes();
  const active = beams.filter(b => !b.broken);
  let totalWeight = 0, grounded = 0;
  for (const b of active) {
    totalWeight += MATERIALS[b.type].weights[b.variant];
    if (sup.has(b.aKey) && sup.has(b.bKey)) grounded++;
  }
  const hasTouch = Object.keys(nodes).some(k => nodes[k].row === GRID_ROWS && sup.has(k));
  const frac = active.length > 0 ? grounded / active.length : 0;
  const baseFunc = Math.round(frac * 40 + (hasTouch ? 10 : 0));
  const canopyBonus = active.some(b => b.type === 'canopy' && sup.has(b.aKey) && sup.has(b.bKey)) ? 5 : 0;
  const func = Math.min(50, baseFunc + canopyBonus);
  const lightness = Math.max(0, Math.round(50 * (1 - totalWeight / 55)));
  return { func, lightness, total: Math.min(100, func + lightness), totalWeight, grounded, total_beams: active.length };
}

// ---- Test run ----

function startTest() {
  calcStress();
  testRunsLeft--;
  testState = { phase: 'running', timer: 0 };
  syncTestButton();
}

function updateTest(dt) {
  if (!testState || testState.phase !== 'running') return;
  testState.timer += dt;
  if (testState.timer > 1.5) {
    for (const b of beams) {
      if (!b.broken && b.stress > 0.85 && Math.random() < dt * (b.stress - 0.84) * 9) {
        b.broken = true;
        calcStress(); // cascade
      }
    }
  }
  if (testState.timer > 4.5) {
    testState.phase = 'done';
    syncTestButton();
  }
}

function submitDeck() {
  if (testRunsLeft > 0 && (!testState || testState.phase !== 'running')) {
    startTest();
  } else if (testRunsLeft === 0 || (testState && testState.phase === 'done')) {
    finalScore = calcScore();
    phase = 'results';
    showResults();
  }
}

// ==================== RENDERING ====================

function render(dt) {
  ctx.clearRect(0, 0, CW, CH);
  if (phase === 'stealth' || phase === 'lockpick') renderStealth(dt);
  else if (phase === 'build') renderBuild(dt);
}

function renderStealth(dt) {
  // Background (walls)
  ctx.fillStyle = '#1a1020';
  ctx.fillRect(0, 0, CW, CH);

  // Room floors
  for (const room of rooms) {
    ctx.fillStyle = room.isEntrance ? '#1e2a1e' : '#1e1e2a';
    ctx.fillRect(room.x, room.y, room.w, room.h);
    // Room border
    ctx.strokeStyle = '#334';
    ctx.lineWidth = 1;
    ctx.strokeRect(room.x, room.y, room.w, room.h);
    // Entrance marker
    if (room.isEntrance) {
      const atExit = nearExit();
      ctx.fillStyle = atExit ? '#3a6a3a' : '#2a4a2a';
      ctx.fillRect(room.x + room.w / 2 - 20, room.y + room.h - 8, 40, 8);
      ctx.fillStyle = atExit ? '#8f8' : '#4a8';
      ctx.font = 'bold 9px Courier New';
      ctx.textAlign = 'center';
      ctx.fillText(atExit ? '[E] ESCAPE' : 'EXIT', room.x + room.w / 2, room.y + room.h - 11);
    }
  }

  // Open corridors
  for (const c of corridors) {
    if (c.open) {
      ctx.fillStyle = '#1e1e2a';
      ctx.fillRect(c.x, c.y, c.w, c.h);
    }
  }

  // Locked doors
  for (const c of corridors) {
    if (!c.locked) continue;
    ctx.fillStyle = hoveredCorr === c ? '#5a3a10' : '#3a2a10';
    ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.strokeStyle = '#886633';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(c.x, c.y, c.w, c.h);
    ctx.font = '15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🔒', c.x + c.w / 2, c.y + c.h / 2 + 6);
    if (hoveredCorr === c) {
      ctx.fillStyle = '#ff9';
      ctx.font = '8px Courier New';
      ctx.fillText('[E] pick  [Q] kick', c.x + c.w / 2, c.y - 4);
    }
  }

  // Materials
  for (const room of rooms) {
    for (const mat of room.materials) {
      if (mat.collected) continue;
      const mdef = MATERIALS[mat.type];
      ctx.fillStyle = mdef.colors[mat.variant];
      ctx.beginPath();
      ctx.arc(mat.x, mat.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff4';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  // NPCs
  for (const npc of npcs) {
    const def = NPC_DEFS[npc.type];
    const isInvestigating = npc.state !== 'patrol';

    // Wall-clipped view cone via ray casting
    if (def.viewDist > 0) {
      const RAY_COUNT = 28;
      ctx.beginPath();
      ctx.moveTo(npc.x, npc.y);
      for (let i = 0; i <= RAY_COUNT; i++) {
        const a = (npc.angle - def.viewAngle) + (i / RAY_COUNT) * def.viewAngle * 2;
        const hit = castRay(npc.x, npc.y, a, def.viewDist);
        ctx.lineTo(hit.x, hit.y);
      }
      ctx.closePath();
      ctx.fillStyle = isInvestigating ? 'rgba(255,180,0,0.18)' : 'rgba(255,80,80,0.13)';
      ctx.fill();
      ctx.strokeStyle = isInvestigating ? 'rgba(255,180,0,0.5)' : 'rgba(255,80,80,0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    // Hearing ring (dog / blind dog)
    if (npc.type === 'dog' || npc.type === 'blinddog') {
      const hr = player.isRunning ? def.hearRun : def.hearWalk;
      ctx.beginPath();
      ctx.arc(npc.x, npc.y, hr, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,165,0,0.12)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    // NPC body
    ctx.beginPath();
    ctx.arc(npc.x, npc.y, def.r, 0, Math.PI * 2);
    ctx.fillStyle = isInvestigating ? '#ffcc00' : def.color;
    ctx.fill();
    ctx.strokeStyle = '#fff4';
    ctx.lineWidth = 1;
    ctx.stroke();
    // Direction indicator
    ctx.beginPath();
    ctx.moveTo(npc.x, npc.y);
    ctx.lineTo(npc.x + Math.cos(npc.angle) * def.r * 1.5, npc.y + Math.sin(npc.angle) * def.r * 1.5);
    ctx.strokeStyle = '#fff8';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Label
    ctx.fillStyle = '#fffb';
    ctx.font = '8px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText(def.label, npc.x, npc.y - def.r - 2);
  }

  // Player
  if (player.inBox) {
    const bw = 26, bh = 22;
    ctx.fillStyle = '#c8943a';
    ctx.fillRect(player.x - bw/2, player.y - bh/2, bw, bh);
    ctx.strokeStyle = '#7a5520';
    ctx.lineWidth = 2;
    ctx.strokeRect(player.x - bw/2, player.y - bh/2, bw, bh);
    // flap lines
    ctx.strokeStyle = '#a07030';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(player.x - bw/2, player.y - 3);
    ctx.lineTo(player.x + bw/2, player.y - 3);
    ctx.moveTo(player.x, player.y - bh/2);
    ctx.lineTo(player.x, player.y - 3);
    ctx.stroke();
    ctx.fillStyle = '#ff9';
    ctx.font = 'bold 8px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('📦', player.x, player.y + 5);
  } else {
    ctx.beginPath();
    ctx.arc(player.x, player.y, PLAYER_R, 0, Math.PI * 2);
    ctx.fillStyle = player.isRunning ? '#44ff88' : '#22cc66';
    ctx.fill();
    ctx.strokeStyle = '#fff6';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    if (player.isRunning) {
      ctx.beginPath();
      ctx.arc(player.x, player.y, PLAYER_R + 6, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,80,80,0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  // Lockpick overlay
  if (lp) {
    renderLockpick();
  }

  // Controls hint
  ctx.fillStyle = '#446';
  ctx.font = '9px Courier New';
  ctx.textAlign = 'left';
  ctx.fillText('WASD move  SHIFT run  CTRL box  E lockpick  Q kick (noisy!)  walk over items', 8, CH - 6);
}

function renderLockpick() {
  // Dim
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, CW, CH);

  const bx = CW / 2 - 140, by = CH / 2 - 60, bw = 280, bh = 120;
  ctx.fillStyle = '#111122';
  ctx.strokeStyle = '#557';
  ctx.lineWidth = 1;
  ctx.fillRect(bx, by, bw, bh);
  ctx.strokeRect(bx, by, bw, bh);

  ctx.fillStyle = '#9af';
  ctx.font = 'bold 13px Courier New';
  ctx.textAlign = 'center';
  ctx.fillText('LOCKPICKING', CW / 2, by + 22);

  // Attempts
  ctx.fillStyle = '#aaa';
  ctx.font = '10px Courier New';
  ctx.fillText(`Attempts: ${'●'.repeat(lp.attempts)}${'○'.repeat(3 - lp.attempts)}`, CW / 2, by + 40);

  // Bar background
  const barX = bx + 30, barY = by + 55, barW = bw - 60, barH = 18;
  ctx.fillStyle = '#222';
  ctx.fillRect(barX, barY, barW, barH);

  // Zone (green)
  ctx.fillStyle = '#1a4a1a';
  ctx.fillRect(barX + lp.zoneStart * barW, barY, (lp.zoneEnd - lp.zoneStart) * barW, barH);

  // Flash
  if (lp.flashTimer > 0) {
    ctx.fillStyle = lp.flashColor + '66';
    ctx.fillRect(barX, barY, barW, barH);
  }

  // Moving bar
  ctx.fillStyle = lp.flashTimer > 0 ? lp.flashColor : '#ddd';
  ctx.fillRect(barX + lp.bar * barW - 3, barY - 2, 6, barH + 4);

  // Border
  ctx.strokeStyle = '#445';
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, barW, barH);

  ctx.fillStyle = '#aaa';
  ctx.font = '10px Courier New';
  ctx.fillText('[SPACE] or [E] to pick', CW / 2, by + 96);
}

function renderBuild(dt) {
  ctx.clearRect(0, 0, CW, CH);

  // Sky
  ctx.fillStyle = '#090e18';
  ctx.fillRect(0, 0, CW, CH);

  // Ground fill + line
  ctx.fillStyle = '#15100a';
  ctx.fillRect(0, GROUND_Y, CW, CH - GROUND_Y);
  ctx.strokeStyle = '#4a3010';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, GROUND_Y); ctx.lineTo(CW, GROUND_Y); ctx.stroke();

  renderBuildHouse();
  renderGridDots();
  renderBuildBeams(dt);
  renderBuildNodes();

  // Preview beam while drawing
  if (pendingKey && hoverSnap && (!testState || testState.phase !== 'running')) {
    const a = nodes[pendingKey];
    if (a) {
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(hoverSnap.x, hoverSnap.y);
      ctx.strokeStyle = (buildSelected !== null ? beamColor(buildHand[buildSelected].type) : '#fff') + '99';
      ctx.lineWidth = 3; ctx.setLineDash([6, 4]); ctx.stroke(); ctx.setLineDash([]);
    }
  }

  renderBuildHints();
}

function renderBuildHouse() {
  const { anchorRow, houseTop } = deckConfig;
  const hb = GROUND_Y, ht = houseTop, hw = HOUSE_W;
  const doorY = GRID_Y0 + anchorRow * GRID_CELL;
  const doorH = 36, doorW = 18;

  // Body
  ctx.fillStyle = '#131320';
  ctx.fillRect(0, ht, hw, hb - ht);
  ctx.strokeStyle = '#2a2a3a'; ctx.lineWidth = 2;
  ctx.strokeRect(0, ht, hw, hb - ht);

  // Roof
  ctx.fillStyle = '#0d0d18';
  ctx.beginPath(); ctx.moveTo(-8, ht); ctx.lineTo(hw / 2, ht - 52); ctx.lineTo(hw + 8, ht);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#1e1e2e'; ctx.lineWidth = 1.5; ctx.stroke();

  // Window
  const wy = ht + (hb - ht) * 0.28;
  ctx.fillStyle = '#152535';
  ctx.fillRect(hw * 0.18, wy, 32, 26);
  ctx.strokeStyle = '#1e3a50'; ctx.lineWidth = 1; ctx.strokeRect(hw * 0.18, wy, 32, 26);
  ctx.beginPath();
  ctx.moveTo(hw * 0.18 + 16, wy); ctx.lineTo(hw * 0.18 + 16, wy + 26);
  ctx.moveTo(hw * 0.18, wy + 13); ctx.lineTo(hw * 0.18 + 32, wy + 13);
  ctx.strokeStyle = '#1e3a50'; ctx.stroke();

  // Door
  ctx.fillStyle = '#2e1a0a';
  ctx.fillRect(hw - doorW, doorY - doorH / 2, doorW, doorH);
  ctx.strokeStyle = '#5a3510'; ctx.lineWidth = 1;
  ctx.strokeRect(hw - doorW, doorY - doorH / 2, doorW, doorH);
  ctx.beginPath(); ctx.arc(hw - 5, doorY + 2, 2, 0, Math.PI * 2);
  ctx.fillStyle = '#ffcc44'; ctx.fill();

  // Anchor glow
  const ax = GRID_X0, ay = doorY;
  ctx.beginPath(); ctx.arc(ax, ay, 7, 0, Math.PI * 2);
  ctx.fillStyle = '#ffcc44'; ctx.fill();
  ctx.beginPath(); ctx.arc(ax, ay, 11, 0, Math.PI * 2);
  ctx.strokeStyle = '#ffcc4455'; ctx.lineWidth = 2; ctx.stroke();
}

function renderGridDots() {
  if (testState && testState.phase === 'running') return;
  for (let col = 0; col <= GRID_COLS; col++) {
    for (let row = 0; row <= GRID_ROWS; row++) {
      const { x, y } = gridPt(col, row);
      const key = mkNodeKey(col, row);
      const isPending = pendingKey === key;
      const hasNode = !!nodes[key];
      const isHover = hoverSnap && hoverSnap.key === key && buildSelected !== null;
      if (isPending) {
        ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.fillStyle = '#ffdd55'; ctx.fill();
      } else if (hasNode) {
        ctx.beginPath(); ctx.arc(x, y, nodes[key].fixed ? 7 : 4, 0, Math.PI * 2);
        ctx.fillStyle = nodes[key].fixed ? '#ffcc44' : (row === GRID_ROWS ? '#55aa55' : '#5577aa');
        ctx.fill();
      } else if (isHover) {
        ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#7aafff88'; ctx.fill();
      } else {
        ctx.beginPath(); ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = '#252535'; ctx.fill();
      }
    }
  }
}

function renderBuildBeams(dt) {
  const inTest = testState && testState.phase === 'running';
  const showStress = testState != null;
  for (const b of beams) {
    if (b.broken) {
      const a = nodes[b.aKey], nb = nodes[b.bKey];
      if (!a || !nb) continue;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(nb.x, nb.y);
      ctx.strokeStyle = '#ff333322'; ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);
      continue;
    }
    const a = nodes[b.aKey], nb = nodes[b.bKey];
    if (!a || !nb) continue;
    let ax = a.x, ay = a.y, bx = nb.x, by = nb.y;
    if (inTest && b.stress > 0.6) {
      const amp = (b.stress - 0.6) * 10;
      const shake = Math.sin(testState.timer * (17 + b.id * 3.3)) * amp;
      const nx = -(by - ay), ny = bx - ax, len = Math.sqrt(nx*nx + ny*ny) || 1;
      ax += nx/len*shake; ay += ny/len*shake; bx += nx/len*shake; by += ny/len*shake;
    }
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
    ctx.lineWidth = b.variant === 1 ? 5 : 4;
    ctx.strokeStyle = showStress && b.stress !== null ? stressColor(b.stress) : beamColor(b.type);
    ctx.stroke();
  }
}

function renderBuildNodes() {
  for (const k of Object.keys(nodes)) {
    const n = nodes[k];
    if (n.fixed) continue;
    ctx.beginPath(); ctx.arc(n.x, n.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = n.row === GRID_ROWS ? '#55aa55' : '#5577aa';
    ctx.fill();
  }
}

function renderBuildHints() {
  if (testState && testState.phase === 'running') {
    ctx.fillStyle = '#ffcc44'; ctx.font = 'bold 13px Courier New'; ctx.textAlign = 'center';
    ctx.fillText('STRUCTURAL TEST IN PROGRESS...', CW / 2, 32);
    return;
  }
  const s = calcScore();
  const scoreStr = `⚙ Func: ${s.func}/50  ⚖ Light: ${s.lightness}/50  Total: ${s.total}/100  Weight: ${s.totalWeight}lb`;
  if (testState && testState.phase === 'done') {
    const broken = beams.filter(b => b.broken).length;
    ctx.fillStyle = broken > 0 ? '#ff8844' : '#44dd88';
    ctx.font = 'bold 11px Courier New'; ctx.textAlign = 'center';
    ctx.fillText(broken > 0 ? `${broken} beam(s) failed` : 'Structure held!', CW / 2, 32);
    ctx.fillStyle = '#667'; ctx.font = '10px Courier New'; ctx.textAlign = 'left';
    ctx.fillText(scoreStr, GRID_X0, GROUND_Y + 26);
    return;
  }
  if (buildSelected !== null) {
    const stack = buildHand[buildSelected];
    const mat = MATERIALS[stack.type];
    ctx.fillStyle = '#7af'; ctx.font = '9px Courier New'; ctx.textAlign = 'left';
    ctx.fillText(
      pendingKey
        ? `${mat.variants[stack.variant]}: click a second dot to connect · right-click to cancel`
        : `${mat.variants[stack.variant]}: click a grid dot to start a beam`,
      GRID_X0, GROUND_Y + 22
    );
  } else {
    ctx.fillStyle = '#446'; ctx.font = '9px Courier New'; ctx.textAlign = 'left';
    ctx.fillText('Pick a material from HAND below · click two dots to draw a beam · right-click beam to remove', GRID_X0, GROUND_Y + 22);
  }
  if (beams.length > 0) {
    ctx.fillStyle = '#556'; ctx.font = '9px Courier New'; ctx.textAlign = 'left';
    ctx.fillText(scoreStr, GRID_X0, GROUND_Y + 36);
  }
}

// ==================== GAME LOOP ====================

function loop(ts) {
  if (phase !== 'stealth' && phase !== 'build') return;
  const dt = lastTs ? Math.min((ts - lastTs) / 1000, 0.05) : 0.016;
  lastTs = ts;

  if (phase === 'stealth') {
    timer -= dt;
    updateTimerDisplay();
    if (timer <= 0) { gameOver('time'); return; }
  }

  if (phase === 'stealth') {
    updatePlayer(dt);
    updateNPCs(dt);
    if (lp) updateLockpick(dt);
    const det = checkDetection(dt);
    if (det) { gameOver(det); return; }
    updateSuspicionUI();
  } else if (phase === 'build') {
    updateTest(dt);
  }

  render(dt);
  requestAnimationFrame(loop);
}

function updateTimerDisplay() {
  const m = Math.floor(Math.max(0, timer) / 60);
  const s = Math.floor(Math.max(0, timer) % 60);
  document.getElementById('timer-display').textContent = `${m}:${s.toString().padStart(2, '0')}`;
  document.getElementById('timer-display').style.color = timer < 30 ? '#f44' : '#fff';
}

function updateSuspicionUI() {
  document.getElementById('suspicion-fill').style.width = `${suspicion}%`;
}

// ==================== OVERLAYS ====================

function gameOver(reason) {
  phase = 'gameover';
  const msg = reason === 'spotted'
    ? 'You stepped into their line of sight.\nThey called the cops. Probably.'
    : reason === 'alerted'
    ? 'They heard something. They found you.\nThe deck will have to wait.'
    : 'Time\'s up. The owner is home.\nYou escaped empty-handed.';
  showOverlay('CAUGHT', msg, [
    { label: 'Try Again', fn: () => init(seedStr) },
    { label: 'New Seed', fn: () => init(getDailySeed()) },
  ]);
}

function showResults() {
  const s = finalScore;
  const isDaily = seedStr === getDailySeed();
  const grade = s.total >= 90 ? 'S' : s.total >= 75 ? 'A' : s.total >= 55 ? 'B' : s.total >= 35 ? 'C' : 'D';
  const gradeColor = { S: '#ff0', A: '#4f4', B: '#7af', C: '#fa0', D: '#f66' }[grade];

  const notes = [];
  if (s.total_beams === 0) notes.push('⚠ No deck was built');
  else if (s.grounded < s.total_beams * 0.5) notes.push('⚠ More than half the structure is unsupported');
  const body = `Functionality:  ${s.func}/50\nLightness:      ${s.lightness}/50\nTotal:          ${s.total}/100\n\nGrade: ${grade}  Weight: ${s.totalWeight}lb\n\n${notes.join('\n')}`;

  showOverlay('DECK COMPLETE', body, [
    {
      label: '📋 Share', fn: () => {
        const url = `${location.origin}${location.pathname}?seed=${encodeURIComponent(seedStr)}`;
        const text = `🪵 Rogue Light Deck Builder\n${isDaily ? '📅' : '🌱'} ${seedStr}\n\nFunc: ${s.func}/50  Light: ${s.lightness}/50\nTotal: ${s.total}/100  Grade: ${grade}\n\n${url}`;
        navigator.clipboard.writeText(text).catch(() => prompt('Copy score:', text));
      }
    },
    { label: 'Play Again', fn: () => init(seedStr) },
    { label: 'New Seed', fn: () => init(getDailySeed()) },
  ]);

  // Color grade
  const titleEl = document.getElementById('overlay-title');
  titleEl.style.color = gradeColor;
}

function showOverlay(title, body, actions) {
  document.getElementById('overlay-title').textContent = title;
  document.getElementById('overlay-title').style.color = '#7af';
  document.getElementById('overlay-body').textContent = body;
  const actEl = document.getElementById('overlay-actions');
  actEl.innerHTML = '';
  for (const a of actions) {
    const btn = document.createElement('button');
    btn.textContent = a.label;
    btn.addEventListener('click', a.fn);
    actEl.appendChild(btn);
  }
  document.getElementById('overlay').classList.remove('hidden');
}

function hideOverlay() {
  document.getElementById('overlay').classList.add('hidden');
}

function showTitle() {
  showOverlay(
    'ROGUE LIGHT DECK BUILDER',
    'You are a rogue.\nNot the video game kind. The D&D kind.\nYou build lightweight decks.\nFor houses.\n\nSneak in. Steal materials. Escape.\nThen build the lightest functional deck you can.\n\n(It\'s not a roguelite deckbuilder.)',
    [
      { label: '▶ Daily Challenge', fn: () => init(getDailySeed()) },
      { label: 'Custom Seed', fn: () => { hideOverlay(); document.getElementById('seed-input').focus(); } },
    ]
  );
}

// ==================== INPUT ====================

function renderInventory() {
  const el = document.getElementById('inventory-items');
  el.innerHTML = '';
  const counts = {};
  for (const item of inventory) {
    const key = `${item.type}:${item.variant}`;
    counts[key] = (counts[key] || { type: item.type, variant: item.variant, n: 0 });
    counts[key].n++;
  }
  for (const key of Object.keys(counts)) {
    const { type, variant, n } = counts[key];
    const mat = MATERIALS[type];
    const div = document.createElement('div');
    div.className = 'inv-item';
    div.innerHTML = `<span class="item-icon">${mat.icon}</span><span class="item-name">${mat.variants[variant].split(' ')[0]}<br>×${n}</span>`;
    el.appendChild(div);
  }
}

window.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (lp && (e.code === 'Space' || e.code === 'KeyE')) {
    e.preventDefault();
    attemptPick();
    return;
  }
  if (phase === 'stealth' && e.code === 'KeyE') {
    if (hoveredCorr) startLockpick(hoveredCorr);
    else if (nearExit()) startBuildPhase();
  }
  if (phase === 'stealth' && e.code === 'KeyQ' && hoveredCorr) {
    kickDoor(hoveredCorr);
  }
  if (phase === 'stealth' && (e.code === 'ControlLeft' || e.code === 'ControlRight')) {
    e.preventDefault();
    player.inBox = !player.inBox;
  }
  if (e.code === 'Space') e.preventDefault();
  if (phase === 'build' && e.code === 'Escape') {
    pendingKey = null; buildSelected = null; renderBuildHand();
  }
});

window.addEventListener('keyup', e => { keys[e.code] = false; });

document.getElementById('btn-play').addEventListener('click', () => {
  const val = document.getElementById('seed-input').value.trim();
  init(val || getDailySeed());
});

document.getElementById('seed-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('btn-play').click();
});

document.getElementById('btn-submit').addEventListener('click', submitDeck);

// ==================== INIT ====================
(function () {
  const params = new URLSearchParams(location.search);
  const urlSeed = params.get('seed');
  if (urlSeed) document.getElementById('seed-input').value = urlSeed;
  canvas = document.getElementById('canvas');
  ctx = canvas.getContext('2d');

  canvas.addEventListener('click', e => {
    if (phase !== 'build') return;
    if (testState && testState.phase === 'running') return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (CW / rect.width);
    const my = (e.clientY - rect.top) * (CH / rect.height);
    const snap = snapToGrid(mx, my);
    if (!snap || buildSelected === null) return;
    if (!pendingKey) {
      getOrCreateNode(snap);
      pendingKey = snap.key;
    } else {
      tryPlaceBeam(snap);
    }
  });

  canvas.addEventListener('contextmenu', e => {
    e.preventDefault();
    if (phase !== 'build') return;
    if (pendingKey) { pendingKey = null; return; }
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (CW / rect.width);
    const my = (e.clientY - rect.top) * (CH / rect.height);
    const idx = getBeamNear(mx, my);
    if (idx !== null) removeBeamAt(idx);
  });

  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    mousePos.x = (e.clientX - rect.left) * (CW / rect.width);
    mousePos.y = (e.clientY - rect.top) * (CH / rect.height);
    if (phase === 'build') hoverSnap = snapToGrid(mousePos.x, mousePos.y);
  });

  showTitle();
})();
