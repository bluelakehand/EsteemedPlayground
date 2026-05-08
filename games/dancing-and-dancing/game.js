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

let gameState   = 'loading';
let seed        = '';
let diff        = 'hard';
let seizureSafe = false;
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

// Countdown state
let countdownText    = '';  // '3' | '2' | '1' | 'GO!' | ''
let countdownPhaseSt = 0;   // performance.now() when current text was set

// ─── Menu music ───────────────────────────────────────────────────────────────

const MENU_SEEDS = ['menu-1', 'menu-2', 'menu-3'];
let menuBuffer = null;
let menuPlayer = null;
let menuGain   = null;

// Pre-fetch a random menu song then start playing immediately.
// If the AudioContext is suspended (browser autoplay policy), it will resume
// on the user's first interaction automatically.
(async function prefetchMenuSong() {
  const s = MENU_SEEDS[Math.floor(Math.random() * MENU_SEEDS.length)];
  try {
    const staticRes = await fetch(`/games/dancing-and-dancing/songs/${encodeURIComponent(s)}.json`);
    let songFile;
    if (staticRes.ok) {
      songFile = (await staticRes.json()).songFile;
    } else {
      const apiRes = await fetch(`/api/song?seed=${encodeURIComponent(s)}`);
      if (!apiRes.ok) return;
      songFile = (await apiRes.json()).songFile;
    }
    const itRes = await fetch(songFile);
    if (!itRes.ok) return;
    menuBuffer = new Uint8Array(await itRes.arrayBuffer());
  } catch (_) { return; }
  startMenuMusic();
})();

function startMenuMusic() {
  if (!menuBuffer || menuPlayer) return;
  try {
    menuPlayer = new ChiptuneJsPlayer(new ChiptuneJsConfig(0, 100, 8, null));
    menuPlayer.play(menuBuffer);
    menuPlayer.module_ctl_set('play.loopcount', '-1');
    menuGain = menuPlayer.context.createGain();
    menuGain.gain.value = parseFloat(document.getElementById('vol-slider').value);
    menuPlayer.currentPlayingNode.disconnect();
    menuPlayer.currentPlayingNode.connect(menuGain);
    menuGain.connect(menuPlayer.context.destination);

    // Browser autoplay policy: AudioContext may start suspended if there has
    // been no user gesture yet. Resume it silently on the next interaction.
    if (menuPlayer.context.state === 'suspended') {
      const resume = () => { menuPlayer?.context.resume(); };
      document.addEventListener('click',   resume, { once: true });
      document.addEventListener('keydown', resume, { once: true });
    }
  } catch (_) { menuPlayer = null; menuGain = null; }
}

function stopMenuMusic() {
  if (!menuPlayer) return;
  try { menuPlayer.stop(); } catch (_) {}
  menuPlayer = null;
  menuGain   = null;
}

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

  // Try pre-generated static manifest first (works on S3 / static hosting),
  // then fall back to the local dev API which spawns autotracker3.py on demand.
  let mft;
  try {
    const staticUrl = `/games/dancing-and-dancing/songs/${encodeURIComponent(s)}.json`;
    const staticRes = await fetch(staticUrl);
    if (staticRes.ok) {
      mft = await staticRes.json();
    } else {
      const apiRes = await fetch(`/api/song?seed=${encodeURIComponent(s)}`);
      if (!apiRes.ok) throw new Error(apiRes.status);
      mft = await apiRes.json();
    }
  } catch (_) {
    document.getElementById('loading-msg').textContent = 'Error loading track. Try refreshing.';
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
  stopMenuMusic();
  score = 0; combo = 0; maxCombo = 0; totalHits = 0; goodHits = 0;
  hitFx = []; judgeFx = null; lastFrameMs = 0;
  countdownText = ''; countdownPhaseSt = 0;

  computeTiming();
  buildNotes();

  showScreen('play');

  canvas = document.getElementById('lane-canvas');
  ctx    = canvas.getContext('2d');
  setTimeout(resizeCanvas, 0);

  updateWordContext();
  renderStats();

  gameState = 'countdown';
  requestAnimationFrame(countdownFrame);
  startCountdown(() => {
    if (gameState !== 'countdown') return; // aborted (e.g. user hit Menu)
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
  });
}

function startCountdown(onComplete) {
  const steps = ['3', '2', '1', 'GO!'];
  let i = 0;

  function advance() {
    countdownText    = steps[i];
    countdownPhaseSt = performance.now();
    i++;
    if (i < steps.length) {
      setTimeout(advance, 750);
    } else {
      setTimeout(onComplete, 550); // linger on GO! then start
    }
  }
  advance();
}

function countdownFrame(timestamp) {
  if (gameState !== 'countdown') return;
  draw(-99999); // renders the empty lane + hit zone; no notes at t=-∞

  if (!ctx || !countdownText) { requestAnimationFrame(countdownFrame); return; }

  const age  = timestamp - countdownPhaseSt;
  const dur  = countdownText === 'GO!' ? 550 : 750;
  const t    = Math.min(age / dur, 1);

  const isGo    = countdownText === 'GO!';
  const numSize = Math.min(Math.round(H * 0.24), 150);

  // Number / GO! text
  const scale = isGo ? (1 + (1 - t) * 0.15) : (1.35 - 0.35 * t);
  const alpha = isGo ? Math.min(1, (1 - t) * 1.8) : (t < 0.65 ? 1 : 1 - (t - 0.65) / 0.35);

  ctx.save();
  ctx.globalAlpha  = Math.max(0, alpha);
  ctx.font         = `bold ${numSize}px Impact, "Arial Narrow Bold", sans-serif`;
  ctx.fillStyle    = isGo ? '#3fff8a' : '#ffd35a';
  if (!seizureSafe) { ctx.shadowColor = isGo ? '#3fff8a' : '#ffd35a'; ctx.shadowBlur = 28 * (1 - t); }
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.translate(LANE_X, H * 0.42);
  ctx.scale(scale, scale);
  ctx.fillText(countdownText, 0, 0);
  ctx.restore();

  // Prompt text — only during 3/2/1, fades out with the number
  if (!isGo) {
    ctx.save();
    ctx.globalAlpha  = Math.max(0, alpha * 0.65);
    ctx.font         = '13px "Courier New", monospace';
    ctx.fillStyle    = '#f3b87a';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    try { ctx.letterSpacing = '3px'; } catch (_) {}
    ctx.fillText('GET YOUR HANDS ON THE KEYBOARD', LANE_X, H * 0.42 + numSize * 0.72);
    ctx.restore();
  }

  requestAnimationFrame(countdownFrame);
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

  // Mark missed notes — count each miss against accuracy just like a wrong keypress
  let needFlash = false;
  for (const n of notes) {
    if (n.status === 'pending' && elapsedMs > n.targetMs + cfg.windowMs + 60) {
      n.status = 'miss';
      wordList[n.wordIdx].chars[n.charIdx].status = 'miss';
      combo = 0;
      totalHits++;  // goodHits not incremented → accuracy drops
      needWordUpdate = true;
      needFlash = true;
    }
  }

  if (needFlash) flash('miss');
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
  if (!seizureSafe) { ctx.shadowColor = 'rgba(255,211,90,0.9)'; ctx.shadowBlur = 10; }
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
      if (ch.status === 'hit' && !seizureSafe) { ctx.shadowColor = '#35e7ff'; ctx.shadowBlur = 14; }
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
    if (n.status === 'pending' && inZone && !seizureSafe) {
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
    if (!seizureSafe) { ctx.shadowColor = fx.color; ctx.shadowBlur = 8; }
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
  if (seizureSafe) return;
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

  document.getElementById('end-roast').textContent = generateRoast();

  buildEndPara();
  showScreen('end');
}

function generateRoast() {
  const accPct = totalHits > 0 ? Math.round((goodHits / totalHits) * 100) : 100;
  const tier   = accPct >= 90 ? 'high' : accPct >= 50 ? 'mid' : 'low';
  const pick   = arr => arr[Math.floor(Math.random() * arr.length)];

  // Find the most embarrassing specific failure.
  // Prefer the shortest fully-missed word (nothing more shameful than "cat").
  const fullyMissed = wordList
    .filter(w => w.chars.length > 0 && w.chars.every(c => c.status === 'miss'))
    .sort((a, b) => a.word.length - b.word.length);
  const hadError = wordList.filter(w => w.chars.some(c => c.status === 'miss' || c.status === 'wrong'));
  const shameEntry = fullyMissed[0] ?? hadError[0] ?? null;
  const shameWord  = shameEntry?.word.toUpperCase() ?? null;

  const lines = {
    baby: {
      high: [
        'Congratulations. You can type. On baby mode.',
        '100% accuracy on the difficulty named after infants. Progress.',
        'Great score! The bar was ankle height, but you cleared it.',
        'Nailed it! Have you considered a difficulty where the notes don\'t wait for you?',
        'Your fingers work. Gold star. Baby-mode gold star.',
      ],
      mid: [
        'Wow. Great score — for a baby.',
        'Baby mode and you STILL fumbled some. Incredible.',
        'The training wheels were apparently insufficient.',
        'Not bad! For a first attempt. At the easiest setting. Ever made.',
        'Baby mode called. It says to try harder next time.',
      ],
      low: [
        'You failed baby mode. I\'ll let that sink in.',
        'Baby mode has formally requested you stop playing.',
        'The difficulty is literally called Baby. What happened in there?',
        'Even actual babies mash keys better than this.',
        'Baby mode was too fast? Have you tried… not playing?',
      ],
    },
    hard: {
      high: [
        'Solid score. On a difficulty that isn\'t Chad. But sure.',
        'Hard difficulty cleared. The game is proud of you. Barely.',
        'Not bad. Completely unimpressive in the grand scheme, but not bad.',
        'You did fine. Fine is the most diplomatic word available.',
        'Hard difficulty, decent run. Just one question: scared of Chad?',
      ],
      mid: [
        'Not great, not terrible. Mostly terrible.',
        'The "Hard" in Hard mode was working overtime today.',
        'An accuracy that says "I tried" without saying what at.',
        'Hard difficulty: partial credit, minimal glory.',
        'You gave it your best. Your best needs practice.',
      ],
      low: [
        'Hard difficulty: 1. You: 0.',
        'The only thing hard about that was watching.',
        'Hard mode found that… appropriately named.',
        'Hard mode suggested you revisit baby mode. Some shame. All shame.',
        'You hard-moded yourself right into the floor.',
      ],
    },
    chad: {
      high: [
        '…okay fine. You\'re actually a chad.',
        'We take it back. That was legitimately real.',
        'Perfect on Chad difficulty. You may now speak of this.',
        'Fine. You\'re built different. We reluctantly accept it.',
        'Chad difficulty nods in reluctant respect.',
      ],
      mid: [
        'Chad? More like Trad.',
        'Chad-adjacent. Chad-curious, even.',
        'Somewhere between Chad and Dad.',
        'You picked Chad. Chad picked you apart. It\'s complicated.',
        'Chad difficulty has noted your effort and remained unimpressed.',
      ],
      low: [
        'Chad? More like Bad.',
        'Chad difficulty has filed a restraining order.',
        'The word "Chad" is now suing for defamation.',
        'You picked Chad and delivered something closer to Sad.',
        'Chad mode called. It doesn\'t know who you are.',
        'Buddy. Come on. Chad mode.',
      ],
    },
  };

  // Build all candidate roasts, then pick exactly one.
  const candidates = [...lines[diff][tier]];

  if (shameWord) {
    const len = shameEntry.word.length;
    const wordJabs = [
      `Really? "${shameWord}" was the one that did you in?`,
      `"${shameWord}" said good day to you personally.`,
      `The word "${shameWord}" sends its regards.`,
      `You couldn't handle "${shameWord}"? That one specifically?`,
      `"${shameWord}" is embarrassed on your behalf.`,
      `The whole song and "${shameWord}" was where it fell apart.`,
    ];
    if (len <= 4) {
      wordJabs.push(
        `"${shameWord}." ${len} letters. You couldn't do "${shameWord}."`,
        `It was ${len} letters. "${shameWord}." ${len} letters.`,
        `${len}-letter word. "${shameWord}." Gone.`,
      );
    }
    candidates.push(...wordJabs);
  }

  if (maxCombo === 0) {
    candidates.push(
      'Your best combo was zero. Statistically, you were just pressing keys.',
      'A max combo of zero is a special kind of achievement.',
      'Zero combo. Not a single consecutive pair of correct notes. Remarkable.',
    );
  }

  return pick(candidates);
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

document.getElementById('seizure-safe-btn').addEventListener('click', () => {
  seizureSafe = !seizureSafe;
  const btn = document.getElementById('seizure-safe-btn');
  btn.textContent = `Seizure Safe Mode: ${seizureSafe ? 'ON' : 'OFF'}`;
  btn.classList.toggle('active', seizureSafe);
});

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
  startMenuMusic();
});

document.getElementById('return-btn').addEventListener('click', () => {
  if (gameState !== 'playing' && gameState !== 'countdown') return;
  const wasPlaying = gameState === 'playing';
  gameState = 'ready';
  countdownText = '';
  if (wasPlaying && chipPlayer) { try { chipPlayer.stop(); } catch (_) {} }
  showScreen('start');
  startMenuMusic();
});

document.getElementById('vol-slider').addEventListener('input', function () {
  const v = parseFloat(this.value);
  if (gainNode)   gainNode.gain.value   = v;
  if (menuGain)   menuGain.gain.value   = v;
});

document.getElementById('share-btn').addEventListener('click', () => {
  const btn     = document.getElementById('share-btn');
  const accPct  = totalHits > 0 ? Math.round((goodHits / totalHits) * 100) : 100;
  const isDaily = seed === ((() => { const d = new Date(); return `${d.getMonth()+1}-${d.getDate()}-${d.getFullYear()}`; })());
  const seedLine = isDaily ? `📅 ${seed}` : `🌱 ${seed}`;
  const diffLabel = { baby: 'BABY', hard: 'HARD', chad: 'CHAD' }[diff] ?? diff.toUpperCase();
  const url = `${location.origin}${location.pathname}?seed=${encodeURIComponent(seed)}&diff=${diff}`;
  const roast = document.getElementById('end-roast').textContent;

  const text = [
    `💃 Dancing & Dancing`,
    `${seedLine} · ${diffLabel}`,
    ``,
    `Score: ${score.toLocaleString()}  ·  Accuracy: ${accPct}%  ·  Best combo: x${maxCombo}`,
    roast ? `"${roast}"` : '',
    ``,
    url,
  ].filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n'); // collapse double blanks

  if (navigator.clipboard) {
    navigator.clipboard.writeText(text)
      .then(() => {
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = 'Share Result'; }, 2000);
      })
      .catch(() => { prompt('Copy and share:', text); });
  } else {
    prompt('Copy and share:', text);
  }
});
