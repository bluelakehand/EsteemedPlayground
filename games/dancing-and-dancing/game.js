'use strict';

// ─── Word lists (from autotracker3) ──────────────────────────────────────────

const NOUNS = [
  'cat','kitten','dog','puppy','elf','knight','wizard','witch','leprechaun',
  'dwarf','golem','troll','city','castle','town','village','journey','flight',
  'place','bird','ocean','sea','boat','ship','whale','brother','sister',
  'viking','ghost','garden','park','forest','ogre','sweet','candy','hand',
  'foot','arm','leg','body','head','wing','gorilla','ninja','bear','vertex',
  'matrix','simplex','shape','apple','pear','banana','orange','demoscene',
  'sword','shield','gun','cannon','report','sign','year','age','blood','breed',
  'monument','cheese','horse','sheep','fish','dock','tube','road','path',
  'tunnel','retort','toaster','goat','tofu','vine','branch','art','santa',
  'weed','rainbow',
];

const ADJECTIVES = [
  'tense','grand','pleasing','absurd','offensive','crazed','magic','lovely',
  'tired','lively','tasty','jealous','red','orange','yellow','green','blue',
  'purple','pink','brown','white','black','cheap','blazed','biased','sweet',
  'invisible','hidden','secret','long','short','tall','broken','random',
  'fighting','hunting','eating','drinking','drunk','weary','walking','running',
  'flying','strong','weak','woeful','tearful','rich','poor','awoken','sacred',
  'high','floppy','derpy','rigid','constipated','gross','massive','ungrateful',
  'shiny','colorful','scared','rainbow',
];

// ─── Seeded PRNG ──────────────────────────────────────────────────────────────

function strHash(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (Math.imul(h, 0x01000193) >>> 0);
  }
  return h >>> 0;
}

function makePRNG(seed) {
  let st = seed >>> 0;
  return function () {
    st = (st + 0x6D2B79F5) | 0;
    let t = Math.imul(st ^ (st >>> 15), 1 | st);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Difficulty ───────────────────────────────────────────────────────────────

const DIFF = {
  baby: { letterBeats: 2, wordGapBeats: 4, windowMs: 230, fallMs: 2800, maxLen: 6,  label: 'Half tempo · generous window' },
  hard: { letterBeats: 1, wordGapBeats: 2, windowMs: 140, fallMs: 2200, maxLen: 8,  label: 'Beat timing · fair window' },
  chad: { letterBeats: 0.5, wordGapBeats: 1, windowMs: 75,  fallMs: 1800, maxLen: 99, label: 'Double tempo · no mercy' },
};

// ─── DOM refs ─────────────────────────────────────────────────────────────────

const $loading  = document.getElementById('loading-screen');
const $start    = document.getElementById('start-screen');
const $playArea = document.getElementById('play-area');
const $end      = document.getElementById('end-screen');
const $header   = document.getElementById('header');
const $flash    = document.getElementById('flash');
const $seedInput = document.getElementById('seed-input');
const $diffDesc  = document.getElementById('diff-desc');

// ─── State ────────────────────────────────────────────────────────────────────

let gameState = 'loading';
let seed      = '';
let diff      = 'hard';
let manifest  = null;
let chipPlayer = null;
let songBuffer = null;
let gainNode   = null;

let beatMs   = 0;
let totalMs  = 0;

// Each letter that falls is one "note"
// { beatNum, targetMs, char, wordIdx, charIdx, status: pending|hit|wrong|miss }
let notes     = [];
// Word list for display / end screen
// { word, chars: [{c, status}] }
let wordList  = [];

let score     = 0;
let combo     = 0;
let maxCombo  = 0;
let totalHits = 0;   // attempted presses in zone
let goodHits  = 0;   // correct presses

// Canvas
let canvas, ctx;
let W = 0, H = 0, HZ_Y = 0, LANE_X = 0, LANE_W = 0, WORD_Y = 0;

// Letter X-position cache (wordIdx → [cx0, cx1, …]) — invalidated on resize/rebuild
let wordLetterXCache = {};

// Transient visual state
let hitFx    = [];  // { age, color, char, x }
let judgeFx  = null; // { text, color, age }
let lastFrameMs = 0;

// ─── Init ─────────────────────────────────────────────────────────────────────

(async function init() {
  const params = new URLSearchParams(location.search);
  const today  = new Date();
  const defaultSeed = `${today.getMonth() + 1}-${today.getDate()}-${today.getFullYear()}`;
  seed = params.get('seed') || defaultSeed;
  diff = params.get('diff') || 'hard';
  if (!DIFF[diff]) diff = 'hard';
  $seedInput.value = seed;
  applyDiff(diff);
  await loadSong(seed);
})();

// ─── Song load (manifest only, no audio) ──────────────────────────────────────

async function loadSong(s) {
  gameState = 'loading';
  showScreen('loading');
  document.getElementById('loading-msg').textContent = 'Generating track for ' + s;

  if (chipPlayer) { try { chipPlayer.stop(); } catch (_) {} chipPlayer = null; }
  songBuffer = null;

  let mft;
  try {
    const res = await fetch(`/api/song?seed=${encodeURIComponent(s)}`);
    if (!res.ok) throw new Error(res.status);
    mft = await res.json();
  } catch (_) {
    document.getElementById('loading-msg').textContent = 'Error generating track. Try refreshing.';
    return;
  }

  manifest = mft;
  computeTiming();
  buildNotes();
  showScreen('start');
}

// ─── Timing ───────────────────────────────────────────────────────────────────

function computeTiming() {
  const msPerRow = (manifest.speed * 2500) / manifest.tempo;
  beatMs  = manifest.rspeed * msPerRow;
  totalMs = manifest.patsize * manifest.numPatterns * msPerRow;
}

// ─── Note generation ──────────────────────────────────────────────────────────

function buildNotes() {
  const cfg  = DIFF[diff];
  const pool = [...NOUNS, ...ADJECTIVES].filter(w => /^[a-zA-Z]+$/.test(w) && w.length <= cfg.maxLen);
  const rng  = makePRNG(strHash(seed + diff));

  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  wordLetterXCache = {};
  notes    = [];
  wordList = [];
  let beat    = 4; // intro beats
  let poolIdx = 0;
  let wordIdx = 0;

  while (beat * beatMs < totalMs - beatMs * 6) {
    if (poolIdx >= pool.length) poolIdx = 0;
    const word = pool[poolIdx++];

    wordList.push({ word, chars: Array.from(word).map(c => ({ c, status: 'pending' })) });

    for (let i = 0; i < word.length; i++) {
      notes.push({
        beatNum:  beat,
        targetMs: beat * beatMs,
        char:     word[i],
        wordIdx,
        charIdx:  i,
        status:   'pending',
      });
      beat += cfg.letterBeats;
    }

    beat += cfg.wordGapBeats;
    wordIdx++;
  }
}

// ─── Screens ──────────────────────────────────────────────────────────────────

function showScreen(name) {
  $loading.classList.toggle('hidden', name !== 'loading');
  $start.classList.toggle('hidden',   name !== 'start');
  $end.classList.toggle('hidden',     name !== 'end');
  $header.classList.toggle('hidden',  name !== 'play');
  $playArea.style.display = name === 'play' ? 'flex' : 'none';
}

function applyDiff(d) {
  diff = d;
  document.querySelectorAll('.diff-btn').forEach(b => b.classList.toggle('active', b.dataset.diff === d));
  $diffDesc.textContent = DIFF[d]?.label ?? '';
}

// ─── Start ────────────────────────────────────────────────────────────────────

function startGame() {
  if (!songBuffer) {
    const btn = document.getElementById('start-btn');
    btn.textContent = '⏳ Loading audio…';
    btn.disabled = true;

    const player = new ChiptuneJsPlayer(new ChiptuneJsConfig(0, 100, 8, null));
    player.load(manifest.songFile, function (buf) {
      songBuffer = buf;
      chipPlayer = player;
      btn.textContent = '▶ Start';
      btn.disabled = false;
      doStart();
    });
    player.onError(function () {
      btn.textContent = '▶ Start';
      btn.disabled = false;
      document.getElementById('loading-msg').textContent = 'Error loading audio.';
      showScreen('loading');
    });
    return;
  }
  doStart();
}

function doStart() {
  score = 0; combo = 0; maxCombo = 0; totalHits = 0; goodHits = 0;
  hitFx = []; judgeFx = null; lastFrameMs = 0;

  computeTiming();
  buildNotes();

  showScreen('play');

  // Size canvas after it becomes visible
  canvas = document.getElementById('lane-canvas');
  ctx    = canvas.getContext('2d');
  setTimeout(resizeCanvas, 0);

  updateWordContext();
  renderStats();

  chipPlayer.handlers = [];
  chipPlayer.onEnded(function () { if (gameState === 'playing') endGame(); });
  chipPlayer.play(songBuffer);

  gainNode = chipPlayer.context.createGain();
  gainNode.gain.value = parseFloat(document.getElementById('vol-slider').value);
  chipPlayer.currentPlayingNode.disconnect();
  chipPlayer.currentPlayingNode.connect(gainNode);
  gainNode.connect(chipPlayer.context.destination);

  gameState = 'playing';
  requestAnimationFrame(gameLoop);
}

// ─── Canvas ───────────────────────────────────────────────────────────────────

function resizeCanvas() {
  W = canvas.offsetWidth  || 600;
  H = canvas.offsetHeight || 400;
  canvas.width  = W;
  canvas.height = H;
  HZ_Y   = H * 0.82;
  LANE_X = W / 2;
  LANE_W = Math.min(W * 0.55, 280);
  WORD_Y = 56;
  wordLetterXCache = {};
}

// Returns the center-X of each letter in wordIdx, measured in the word display font.
function getLetterXPositions(wordIdx) {
  if (wordLetterXCache[wordIdx]) return wordLetterXCache[wordIdx];
  const word = wordList[wordIdx];
  if (!word || !ctx) return [];
  ctx.font = 'bold 48px Impact, "Arial Narrow Bold", sans-serif';
  const str = word.word.toUpperCase();
  const totalWidth = ctx.measureText(str).width;
  let x = LANE_X - totalWidth / 2;
  const positions = str.split('').map(ch => {
    const cw = ctx.measureText(ch).width;
    const cx = x + cw / 2;
    x += cw;
    return cx;
  });
  wordLetterXCache[wordIdx] = positions;
  return positions;
}

window.addEventListener('resize', () => { if (gameState === 'playing') resizeCanvas(); });

// ─── Game loop ────────────────────────────────────────────────────────────────

function gameLoop(timestamp) {
  if (gameState !== 'playing') return;

  const dt = lastFrameMs ? timestamp - lastFrameMs : 16;
  lastFrameMs = timestamp;

  // Age visual effects
  for (let i = hitFx.length - 1; i >= 0; i--) {
    hitFx[i].age += dt;
    if (hitFx[i].age > 600) hitFx.splice(i, 1);
  }
  if (judgeFx) { judgeFx.age += dt; if (judgeFx.age > 900) judgeFx = null; }

  let elapsedMs;
  try { elapsedMs = chipPlayer.getCurrentTime() * 1000; }
  catch (_) { requestAnimationFrame(gameLoop); return; }

  const cfg = DIFF[diff];
  let needWordUpdate = false;

  // Mark missed notes
  for (const n of notes) {
    if (n.status === 'pending' && elapsedMs > n.targetMs + cfg.windowMs + 60) {
      n.status = 'miss';
      wordList[n.wordIdx].chars[n.charIdx].status = 'miss';
      combo = 0;
      needWordUpdate = true;
    }
  }

  if (needWordUpdate) { updateWordContext(); renderStats(); }
  if (elapsedMs >= totalMs) { endGame(); return; }

  draw(elapsedMs);
  requestAnimationFrame(gameLoop);
}

// ─── Draw ─────────────────────────────────────────────────────────────────────

function draw(elapsedMs) {
  if (!ctx) return;
  ctx.clearRect(0, 0, W, H);

  const cfg      = DIFF[diff];
  const fallDist = HZ_Y - WORD_Y; // vertical fall distance

  // Lane background — runs from word display line to bottom
  ctx.fillStyle = 'rgba(12,4,24,0.45)';
  ctx.fillRect(LANE_X - LANE_W / 2, WORD_Y - 30, LANE_W, H - (WORD_Y - 30));

  // Beat guide lines drifting from word area toward hit zone
  ctx.setLineDash([3, 10]);
  ctx.lineWidth = 1;
  const currentBeat = elapsedMs / beatMs;
  for (let b = Math.ceil(currentBeat - 0.5); b <= currentBeat + cfg.fallMs / beatMs + 1; b++) {
    const bMs  = b * beatMs;
    const prog = (elapsedMs - (bMs - cfg.fallMs)) / cfg.fallMs;
    if (prog < 0 || prog > 1.05) continue;
    const y     = WORD_Y + fallDist * prog;
    const alpha = b % 2 === 0 ? 0.10 : 0.04;
    ctx.strokeStyle = `rgba(255,247,219,${alpha})`;
    ctx.beginPath();
    ctx.moveTo(LANE_X - LANE_W / 2, y);
    ctx.lineTo(LANE_X + LANE_W / 2, y);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Hit zone band
  const hwPx = fallDist * cfg.windowMs / cfg.fallMs;
  ctx.fillStyle = 'rgba(255,211,90,0.04)';
  ctx.fillRect(LANE_X - LANE_W / 2, HZ_Y - hwPx, LANE_W, hwPx * 2);

  // Hit zone line
  ctx.save();
  ctx.shadowColor = 'rgba(255,211,90,0.9)';
  ctx.shadowBlur  = 10;
  ctx.strokeStyle = 'rgba(255,211,90,0.75)';
  ctx.lineWidth   = 2.5;
  ctx.beginPath();
  ctx.moveTo(LANE_X - LANE_W / 2, HZ_Y);
  ctx.lineTo(LANE_X + LANE_W / 2, HZ_Y);
  ctx.stroke();
  ctx.restore();

  // ── Word display at top of canvas ──────────────────────────────────────────
  // Show the word whose fall started most recently (transitions naturally when
  // the next word's first letter begins its descent).
  let displayWordIdx = -1;
  let latestStartMs  = -Infinity;
  for (const n of notes) {
    const startMs = n.targetMs - cfg.fallMs;
    if (elapsedMs >= startMs && startMs > latestStartMs) {
      latestStartMs  = startMs;
      displayWordIdx = n.wordIdx;
    }
  }

  if (displayWordIdx >= 0) {
    const word      = wordList[displayWordIdx];
    const positions = getLetterXPositions(displayWordIdx);
    ctx.font         = 'bold 48px Impact, "Arial Narrow Bold", sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    word.chars.forEach((ch, i) => {
      let color;
      if (ch.status === 'hit')        color = '#35e7ff';
      else if (ch.status === 'wrong') color = '#ff4d7d';
      else if (ch.status === 'miss')  color = 'rgba(255,77,125,0.45)';
      else {
        // pending — dim while waiting, slightly brighter once falling
        const note      = notes.find(n => n.wordIdx === displayWordIdx && n.charIdx === i);
        const isFalling = note && elapsedMs >= note.targetMs - cfg.fallMs;
        color = isFalling ? 'rgba(255,247,219,0.28)' : 'rgba(255,247,219,0.15)';
      }
      ctx.save();
      ctx.fillStyle = color;
      if (ch.status === 'hit') { ctx.shadowColor = '#35e7ff'; ctx.shadowBlur = 14; }
      ctx.fillText(ch.c.toUpperCase(), positions[i] ?? LANE_X, WORD_Y);
      ctx.restore();
    });
  }

  // ── Falling notes ───────────────────────────────────────────────────────────
  // Each letter travels from its position in the word display to the center hit zone.
  for (const n of notes) {
    const startMs = n.targetMs - cfg.fallMs;
    const age     = elapsedMs - startMs;
    if (age < 0) continue;

    const progress = age / cfg.fallMs;
    if (progress > 1.7) continue;

    if (n.status === 'hit') continue; // handled by hitFx

    // X: start at the letter's position inside the word, converge to center
    const positions = getLetterXPositions(n.wordIdx);
    const startX    = positions[n.charIdx] ?? LANE_X;
    const x         = startX + (LANE_X - startX) * Math.min(progress, 1);

    // Y: fall from word display line down to (and slightly past) hit zone
    const y      = WORD_Y + fallDist * Math.min(progress, 1.7);
    const off    = Math.abs(elapsedMs - n.targetMs);
    const inZone = off < cfg.windowMs;

    let color, alpha;
    if (n.status === 'wrong') {
      color = '#ff4d7d';
      alpha = Math.max(0, 1 - (progress - 1) * 4);
    } else if (n.status === 'miss') {
      color = 'rgba(255,77,125,0.3)';
      alpha = Math.max(0, 1 - (progress - 1) * 4);
    } else {
      color = inZone ? '#ffd35a' : '#fff7db';
      alpha = Math.min(1, progress * 8);
    }

    ctx.save();
    ctx.globalAlpha = alpha;
    if (n.status === 'pending' && inZone) {
      ctx.shadowColor = '#ffd35a';
      ctx.shadowBlur  = 18;
    }
    ctx.font         = 'bold 52px Impact, "Arial Narrow Bold", sans-serif';
    ctx.fillStyle    = color;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(n.char.toUpperCase(), x, y);
    ctx.restore();
  }

  // ── Hit effects (expanding ring + rising char) ──────────────────────────────
  for (const fx of hitFx) {
    const t = fx.age / 600;
    ctx.save();
    ctx.globalAlpha = (1 - t) * 0.85;
    ctx.strokeStyle = fx.color;
    ctx.lineWidth   = 3 - t * 2;
    ctx.shadowColor = fx.color;
    ctx.shadowBlur  = 8;
    ctx.beginPath();
    ctx.arc(LANE_X, HZ_Y, 18 + t * 65, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha  = (1 - t) * 0.95;
    ctx.fillStyle    = fx.color;
    ctx.font         = 'bold 52px Impact, "Arial Narrow Bold", sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(fx.char.toUpperCase(), LANE_X, HZ_Y - t * 55);
    ctx.restore();
  }

  // ── Judgement text (PERFECT / GOOD / OK) ────────────────────────────────────
  if (judgeFx) {
    const t = judgeFx.age / 900;
    ctx.save();
    ctx.globalAlpha  = Math.min(1, (1 - t) * 2);
    ctx.fillStyle    = judgeFx.color;
    ctx.font         = 'bold 22px Impact, sans-serif';
    ctx.textAlign    = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(judgeFx.text, LANE_X + LANE_W / 2 - 6, HZ_Y - 30 - t * 20);
    ctx.restore();
  }
}

// ─── Key input ────────────────────────────────────────────────────────────────

document.addEventListener('keydown', function (e) {
  if (gameState !== 'playing') return;
  if (e.key.length !== 1 || e.ctrlKey || e.altKey || e.metaKey) return;

  const key = e.key.toLowerCase();
  let elapsedMs;
  try { elapsedMs = chipPlayer.getCurrentTime() * 1000; }
  catch (_) { return; }

  const cfg = DIFF[diff];

  // Find pending notes in hit window, pick closest
  let best = null, bestOff = Infinity;
  for (const n of notes) {
    if (n.status !== 'pending') continue;
    const off = Math.abs(elapsedMs - n.targetMs);
    if (off <= cfg.windowMs && off < bestOff) { best = n; bestOff = off; }
  }

  if (!best) return; // nothing in zone — ignore stray presses

  totalHits++;

  if (key === best.char.toLowerCase()) {
    best.status = 'hit';
    goodHits++;
    combo++;
    maxCombo = Math.max(maxCombo, combo);

    const pts = bestOff < 50 ? 200 : bestOff < 110 ? 100 : 50;
    score += pts * combo;

    const color = bestOff < 50 ? '#35e7ff' : bestOff < 110 ? '#ffd35a' : '#f3b87a';
    const label = bestOff < 50 ? 'PERFECT' : bestOff < 110 ? 'GOOD' : 'OK';

    hitFx.push({ age: 0, color, char: best.char });
    judgeFx = { text: label, color, age: 0 };
    wordList[best.wordIdx].chars[best.charIdx].status = 'hit';
    flash('hit');
  } else {
    best.status = 'wrong';
    combo = 0;
    wordList[best.wordIdx].chars[best.charIdx].status = 'wrong';
    flash('miss');
  }

  updateWordContext();
  renderStats();
});

// ─── Word context display ─────────────────────────────────────────────────────

function updateWordContext() {
  const $q = document.getElementById('queue-display');
  $q.innerHTML = '';

  // Find active word (first with pending chars)
  let activeIdx = -1;
  for (let i = 0; i < wordList.length; i++) {
    if (wordList[i].chars.some(c => c.status === 'pending')) { activeIdx = i; break; }
  }
  if (activeIdx === -1) return;

  // Show next words after the current one
  for (let i = activeIdx + 1; i < Math.min(activeIdx + 5, wordList.length); i++) {
    const sp = document.createElement('span');
    sp.className = 'wc-next';
    sp.textContent = wordList[i].word.toUpperCase();
    $q.appendChild(sp);
  }
}

// ─── Stats ────────────────────────────────────────────────────────────────────

function renderStats() {
  const acc = totalHits > 0 ? Math.round((goodHits / totalHits) * 100) + '%' : '—';
  const sc  = score.toLocaleString();
  const cb  = 'x' + combo;
  ['h', 'b'].forEach(p => {
    document.getElementById(p + '-score').textContent = sc;
    document.getElementById(p + '-combo').textContent = cb;
    document.getElementById(p + '-acc').textContent   = acc;
  });
}

// ─── Flash ────────────────────────────────────────────────────────────────────

function flash(type) {
  $flash.className = '';
  void $flash.offsetWidth;
  $flash.className = type;
}

// ─── End game ─────────────────────────────────────────────────────────────────

function endGame() {
  if (gameState === 'ended') return;
  gameState = 'ended';
  try { chipPlayer.stop(); } catch (_) {}

  const acc = totalHits > 0 ? Math.round((goodHits / totalHits) * 100) + '%' : '—';
  document.getElementById('e-score').textContent = score.toLocaleString();
  document.getElementById('e-acc').textContent   = acc;
  document.getElementById('e-combo').textContent = 'x' + maxCombo;

  buildEndPara();
  showScreen('end');
}

function buildEndPara() {
  const $p = document.getElementById('end-para');
  $p.innerHTML = '';
  let count = 0;
  wordList.forEach(w => {
    const ws = document.createElement('span');
    ws.className = 'ep-word';
    w.chars.forEach(ch => {
      const s = document.createElement('span');
      s.className = 'ep-c ' + ch.status;
      s.textContent = ch.c.toUpperCase();
      ws.appendChild(s);
    });
    $p.appendChild(ws);
    if (++count % 6 === 0) $p.appendChild(document.createElement('br'));
  });
}

// ─── UI wiring ────────────────────────────────────────────────────────────────

document.getElementById('start-btn').addEventListener('click', function () { startGame(); });

document.querySelectorAll('.diff-btn').forEach(btn => {
  btn.addEventListener('click', () => applyDiff(btn.dataset.diff));
});
document.getElementById('diff-desc').textContent = DIFF[diff]?.label ?? '';

document.getElementById('seed-go-btn').addEventListener('click', () => {
  const s = $seedInput.value.trim().replace(/[^a-zA-Z0-9\-_]/g, '') || seed;
  seed = s;
  $seedInput.value = s;
  if (chipPlayer) { try { chipPlayer.stop(); } catch (_) {} }
  chipPlayer = null; songBuffer = null; manifest = null;
  loadSong(s);
});

$seedInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('seed-go-btn').click();
});

document.getElementById('play-again-btn').addEventListener('click', () => {
  gameState = 'ready';
  showScreen('start');
});

document.getElementById('vol-slider').addEventListener('input', function () {
  if (gainNode) gainNode.gain.value = parseFloat(this.value);
});

document.getElementById('share-btn').addEventListener('click', () => {
  const url = `${location.origin}${location.pathname}?seed=${encodeURIComponent(seed)}&diff=${diff}`;
  navigator.clipboard?.writeText(url).then(() => {
    const btn = document.getElementById('share-btn');
    const orig = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = orig; }, 1500);
  }).catch(() => { prompt('Share this link:', url); });
});
