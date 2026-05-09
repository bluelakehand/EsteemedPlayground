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
  return `carbon-${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

// ── State ─────────────────────────────────────────────────────────────────────
const state = {
  seed:        dailySeed(),
  rng:         null,
  round:       0,          // 0-based current round index
  lines:       [],         // 3 pre-generated target lines for the day
  scores:      [],         // score per round (0–100)
  playerStrokes: [],       // array of strokes; each stroke is array of {x,y}
  currentStroke: null,     // stroke in progress
  isDrawing:   false,
};

// ── DOM refs ──────────────────────────────────────────────────────────────────
const els = {
  bestScore:       document.getElementById('best-score'),
  streak:          document.getElementById('streak'),
  btnStart:        document.getElementById('btn-start'),
  seedForm:        document.getElementById('seed-form'),
  seedInput:       document.getElementById('seed-input'),
  btnDaily:        document.getElementById('btn-daily'),
  previewBadge:    document.getElementById('preview-badge'),
  previewStatus:   document.getElementById('preview-status'),
  canvasPreview:   document.getElementById('canvas-preview'),
  countdownOverlay: document.getElementById('countdown-overlay'),
  countdownNumber: document.getElementById('countdown-number'),
  drawingBadge:    document.getElementById('drawing-badge'),
  canvasDrawing:   document.getElementById('canvas-drawing'),
  btnClear:        document.getElementById('btn-clear'),
  btnDone:         document.getElementById('btn-done'),
  resultBadge:     document.getElementById('result-badge'),
  resultRoast:     document.getElementById('result-roast'),
  canvasResult:    document.getElementById('canvas-result'),
  resultMeta:      document.getElementById('result-meta'),
  btnNext:         document.getElementById('btn-next'),
  finalGrade:      document.getElementById('final-grade'),
  finalTagline:    document.getElementById('final-tagline'),
  scoreGrid:       document.getElementById('score-grid'),
  btnShare:        document.getElementById('btn-share'),
  btnRestart:      document.getElementById('btn-restart'),
};

// ── Screen switching ──────────────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ── Seed handling ─────────────────────────────────────────────────────────────
function flashSeedLoaded() {
  const card = document.querySelector('.stat-card');
  card.classList.remove('seed-loaded');
  void card.offsetWidth;
  card.classList.add('seed-loaded');
  card.addEventListener('animationend', () => card.classList.remove('seed-loaded'), { once: true });
}

function flashButton(btn, msg, durationMs = 1500) {
  const orig = btn.textContent;
  btn.textContent = msg;
  btn.disabled    = true;
  setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, durationMs);
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

// ── Boot — auto-load seed from URL param if present ───────────────────────────
const urlSeed = new URLSearchParams(window.location.search).get('seed');
if (urlSeed) {
  els.seedInput.value = urlSeed;
  loadSeed(urlSeed);
} else {
  loadSeed(dailySeed());
}
refreshStatCard();

// ── Constants ─────────────────────────────────────────────────────────────────
const CANVAS_W           = 880;
const CANVAS_H           = 480;
const MARGIN             = 55;
const LINES_PER_DAY      = 3;
const PREVIEW_DURATION_MS = 3000; // ms to animate the preview draw
const STUDY_SECS         = 3;     // countdown seconds after animation
const TARGET_LINE_WIDTH  = 22;    // thick target line — player must draw within it
const PLAYER_LINE_WIDTH  = 5;     // player stroke — visible but thinner than target

// ── Canvas helpers ────────────────────────────────────────────────────────────
function drawPaper(ctx) {
  ctx.fillStyle = '#f5f3ef';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
}

function drawSmoothLine(ctx, points, count, color, width) {
  const n = Math.min(count, points.length);
  if (n < 2) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth   = width;
  ctx.lineJoin    = 'round';
  ctx.lineCap     = 'round';
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < n - 1; i++) {
    const mx = (points[i].x + points[i + 1].x) / 2;
    const my = (points[i].y + points[i + 1].y) / 2;
    ctx.quadraticCurveTo(points[i].x, points[i].y, mx, my);
  }
  ctx.lineTo(points[n - 1].x, points[n - 1].y);
  ctx.stroke();
  ctx.restore();
}

// ── Line generation ───────────────────────────────────────────────────────────
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function generateLine(rng) {
  const points = [];
  const STEP  = 3;
  const INNER = MARGIN;

  // Start in the left quarter, vertically anywhere
  let x = INNER + rng() * (CANVAS_W * 0.22);
  let y = INNER + rng() * (CANVAS_H - INNER * 2);
  points.push({ x, y });

  // Angle biased rightward so the line crosses the canvas
  let angle = (rng() - 0.5) * (Math.PI * 0.45);

  const numSegs = 2 + Math.floor(rng() * 2); // 2–3 segments only

  for (let s = 0; s < numSegs; s++) {
    // Soft steer toward horizontal center if near top/bottom edges
    const edgeDist = Math.min(y - INNER, CANVAS_H - INNER - y);
    if (edgeDist < 60) {
      const toCenterY = Math.atan2(CANVAS_H / 2 - y, CANVAS_W / 2 - x);
      let diff = toCenterY - angle;
      while (diff >  Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      angle += diff * 0.25;
    }

    // Mostly straight, sometimes a gentle arc — no squiggles
    const type   = rng() < 0.45 ? 'straight' : 'arc';
    const segLen = 200 + rng() * 180; // long segments: 200–380 px
    const steps  = Math.ceil(segLen / STEP);

    if (type === 'straight') {
      const totalDrift = (rng() - 0.5) * 0.25; // very slight drift
      for (let i = 0; i < steps; i++) {
        angle += totalDrift / steps;
        x = clamp(x + Math.cos(angle) * STEP, INNER, CANVAS_W - INNER);
        y = clamp(y + Math.sin(angle) * STEP, INNER, CANVAS_H - INNER);
        points.push({ x, y });
      }
    } else { // gentle arc
      const curvature = (rng() - 0.5) * 0.04; // much gentler than before
      for (let i = 0; i < steps; i++) {
        angle += curvature;
        x = clamp(x + Math.cos(angle) * STEP, INNER, CANVAS_W - INNER);
        y = clamp(y + Math.sin(angle) * STEP, INNER, CANVAS_H - INNER);
        points.push({ x, y });
      }
    }

    // Gentle bend between segments
    angle += (rng() - 0.5) * 0.7;
  }

  return points;
}

function generateDailyLines() {
  const rng = mulberry32(hashSeed(state.seed + '-lines'));
  state.lines = Array.from({ length: LINES_PER_DAY }, () => generateLine(rng));
}

// ── Preview animation ─────────────────────────────────────────────────────────
function animateLine(points, ctx, onComplete) {
  const total   = points.length;
  const startMs = performance.now();

  function frame(now) {
    const pct     = Math.min((now - startMs) / PREVIEW_DURATION_MS, 1);
    const visible = Math.max(2, Math.ceil(pct * total));

    drawPaper(ctx);
    drawSmoothLine(ctx, points, visible, '#1a1a2e', TARGET_LINE_WIDTH);

    if (pct < 1) {
      requestAnimationFrame(frame);
    } else {
      onComplete();
    }
  }

  requestAnimationFrame(frame);
}

// ── Study countdown ───────────────────────────────────────────────────────────
function startCountdown(onComplete) {
  let secs = STUDY_SECS;
  els.countdownOverlay.classList.add('visible');
  els.countdownNumber.textContent = secs;

  const iv = setInterval(() => {
    secs--;
    if (secs > 0) {
      els.countdownNumber.textContent = secs;
    } else {
      clearInterval(iv);
      els.countdownOverlay.classList.remove('visible');
      onComplete();
    }
  }, 1000);
}

// ── Begin a round ─────────────────────────────────────────────────────────────
function beginRound() {
  const line = state.lines[state.round];
  const ctx  = els.canvasPreview.getContext('2d');

  els.previewBadge.textContent  = `Line ${state.round + 1} of ${LINES_PER_DAY}`;
  els.previewStatus.textContent = 'Watch carefully…';

  drawPaper(ctx);

  const halfwayMs = PREVIEW_DURATION_MS * 0.55;
  setTimeout(() => { els.previewStatus.textContent = 'Memorise it…'; }, halfwayMs);

  animateLine(line, ctx, () => {
    els.previewStatus.textContent = 'Study it…';
    startCountdown(() => {
      showScreen('screen-drawing');
      initDrawingScreen();
    });
  });
}

// ── Drawing helpers ───────────────────────────────────────────────────────────
function canvasPoint(canvas, e) {
  const rect  = canvas.getBoundingClientRect();
  const scaleX = CANVAS_W / rect.width;
  const scaleY = CANVAS_H / rect.height;
  const src   = e.touches ? e.touches[0] : e;
  return {
    x: (src.clientX - rect.left)  * scaleX,
    y: (src.clientY - rect.top)   * scaleY,
  };
}

function redrawDrawingCanvas() {
  const ctx = els.canvasDrawing.getContext('2d');
  drawPaper(ctx);
  for (const stroke of state.playerStrokes) {
    drawSmoothLine(ctx, stroke, stroke.length, '#c0392b', PLAYER_LINE_WIDTH);
  }
  if (state.currentStroke && state.currentStroke.length > 1) {
    drawSmoothLine(ctx, state.currentStroke, state.currentStroke.length, '#c0392b', PLAYER_LINE_WIDTH);
  }
}

// ── Init drawing screen ───────────────────────────────────────────────────────
function initDrawingScreen() {
  els.drawingBadge.textContent = `Line ${state.round + 1} of ${LINES_PER_DAY}`;
  document.querySelector('.drawing-hint').textContent =
    DRAWING_HINTS[Math.floor(Math.random() * DRAWING_HINTS.length)];
  const ctx = els.canvasDrawing.getContext('2d');
  drawPaper(ctx);
  state.playerStrokes = [];
  state.currentStroke = null;
  state.isDrawing     = false;
}

// ── Drawing event listeners ───────────────────────────────────────────────────
function onDrawStart(e) {
  e.preventDefault();
  state.isDrawing     = true;
  state.currentStroke = [canvasPoint(els.canvasDrawing, e)];
}

function onDrawMove(e) {
  e.preventDefault();
  if (!state.isDrawing) return;
  state.currentStroke.push(canvasPoint(els.canvasDrawing, e));
  redrawDrawingCanvas();
}

function onDrawEnd(e) {
  e.preventDefault();
  if (!state.isDrawing) return;
  state.isDrawing = false;
  if (state.currentStroke.length > 1) {
    state.playerStrokes.push(state.currentStroke);
  }
  state.currentStroke = null;
  redrawDrawingCanvas();
}

els.canvasDrawing.addEventListener('mousedown',  onDrawStart);
els.canvasDrawing.addEventListener('mousemove',  onDrawMove);
els.canvasDrawing.addEventListener('mouseup',    onDrawEnd);
els.canvasDrawing.addEventListener('mouseleave', onDrawEnd);
els.canvasDrawing.addEventListener('touchstart', onDrawStart, { passive: false });
els.canvasDrawing.addEventListener('touchmove',  onDrawMove,  { passive: false });
els.canvasDrawing.addEventListener('touchend',   onDrawEnd,   { passive: false });

els.btnClear.addEventListener('click', () => {
  state.playerStrokes = [];
  state.currentStroke = null;
  state.isDrawing     = false;
  redrawDrawingCanvas();
});

els.btnDone.addEventListener('click', () => {
  const score = scoreRound();
  state.scores.push(score);
  showResult(score);
});

// ── Scoring ───────────────────────────────────────────────────────────────────
function pathLength(points) {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    len += Math.sqrt(dx * dx + dy * dy);
  }
  return len;
}

function scoreRound() {
  const target       = state.lines[state.round];
  const playerPoints = state.playerStrokes.flat();

  if (playerPoints.length === 0) return 0;

  // 1. Accuracy: % of player points that land visually inside the thick target line.
  //    Hard cutoff at the visible line edge — inside = full credit, outside = none.
  const EDGE_R2 = (TARGET_LINE_WIDTH / 2) * (TARGET_LINE_WIDTH / 2);
  let onTarget = 0;
  for (const pp of playerPoints) {
    for (const tp of target) {
      const dx = pp.x - tp.x;
      const dy = pp.y - tp.y;
      if (dx * dx + dy * dy <= EDGE_R2) { onTarget++; break; }
    }
  }
  const accuracy = onTarget / playerPoints.length;

  // 2. Length: how close is total drawn length to the target length
  const targetLen   = pathLength(target);
  const playerLen   = state.playerStrokes.reduce((s, st) => s + pathLength(st), 0);
  const ratio       = playerLen / targetLen;
  const lengthScore = Math.max(0, 1 - Math.abs(1 - ratio) * 1.2);

  // Multi-stroke penalty (8 pts per extra stroke)
  const strokePenalty = Math.max(0, (state.playerStrokes.length - 1) * 8);

  // Accuracy primary (80%), length secondary (20%)
  const base = (accuracy * 0.80 + lengthScore * 0.20) * 100;
  return Math.round(Math.max(0, Math.min(100, base - strokePenalty)));
}

// ── Result screen ─────────────────────────────────────────────────────────────
const ROASTS = [
  { min: 85, texts: [
    "Uncanny. Are you sure you didn't trace it?",
    "Your hand remembered. Your brain just watched.",
    "Suspiciously accurate. We're keeping an eye on you.",
    "This is either talent or a cry for help. Impressive either way.",
  ]},
  { min: 70, texts: [
    "Pretty close. Your memory is better than your taste.",
    "Not bad. Still room for shame, but not much.",
    "Almost. Almost is fine. Almost won't haunt you.",
    "Your brain and your hand are on speaking terms. Barely.",
  ]},
  { min: 55, texts: [
    "Recognisable, in a generous light.",
    "You got the vibe. The line itself, less so.",
    "It's giving 'inspired by' rather than 'copy of'.",
    "Some of that was the right line. The rest was yours.",
  ]},
  { min: 35, texts: [
    "That's... a line, yes. Among other things.",
    "The original line would like a word.",
    "You remembered a line. Just not this one.",
    "Somewhere in there is a good copy. Buried. Deep.",
    "Confidence: high. Accuracy: concerning.",
  ]},
  { min: 0, texts: [
    "Bold choice to submit that. Brave, even.",
    "We've seen worse. Actually we haven't.",
    "You watched the line for three seconds and drew... that.",
    "The line you copied exists only in your imagination.",
    "Did you close your eyes? You can tell us.",
    "Not your fault. The line was probably moving.",
  ]},
];

const DRAWING_HINTS = [
  'Draw from memory — no pressure. Lots of pressure.',
  'Recreate it. Exactly. No pressure.',
  'Your memory versus the algorithm. Good luck.',
  'It was right there. You saw it.',
  'Three seconds was plenty of time. Probably.',
  'Draw the line. The exact line. The one you definitely remember.',
  'Confidence is key. Accuracy is also key.',
];

function roastForScore(score) {
  const tier  = ROASTS.find(r => score >= r.min);
  const texts = tier.texts;
  return texts[Math.floor(Math.random() * texts.length)];
}

function scorePillClass(score) {
  if (score >= 70) return 'good';
  if (score >= 45) return 'ok';
  return 'bad';
}

function showResult(score) {
  const round  = state.round;
  const target = state.lines[round];
  const isLast = round === LINES_PER_DAY - 1;

  // Badge + roast
  els.resultBadge.textContent = `Line ${round + 1} of ${LINES_PER_DAY}`;
  els.resultRoast.textContent = roastForScore(score);

  // Overlay canvas — thick target first, thin player strokes on top
  const ctx = els.canvasResult.getContext('2d');
  drawPaper(ctx);
  drawSmoothLine(ctx, target, target.length, '#1a1a2e', TARGET_LINE_WIDTH);
  for (const stroke of state.playerStrokes) {
    drawSmoothLine(ctx, stroke, stroke.length, '#c0392b', PLAYER_LINE_WIDTH);
  }

  // Stat pills
  const strokes   = state.playerStrokes.length;
  const targetLen = pathLength(target);
  const playerLen = state.playerStrokes.reduce((s, st) => s + pathLength(st), 0);
  const ratio     = targetLen > 0 ? playerLen / targetLen : 0;
  const lenPct    = Math.round(ratio * 100);
  const cls       = scorePillClass(score);

  els.resultMeta.innerHTML = `
    <div class="stat-pill ${cls}">
      <span class="label">Score</span>
      <span class="value">${score}</span>
    </div>
    <div class="stat-pill ${strokes === 1 ? 'good' : strokes <= 2 ? 'ok' : 'bad'}">
      <span class="label">Strokes</span>
      <span class="value">${strokes === 0 ? '—' : strokes}</span>
    </div>
    <div class="stat-pill ${Math.abs(1 - ratio) < 0.15 ? 'good' : Math.abs(1 - ratio) < 0.35 ? 'ok' : 'bad'}">
      <span class="label">Length</span>
      <span class="value">${targetLen > 0 ? lenPct + '%' : '—'}</span>
    </div>`;

  els.btnNext.textContent = isLast ? 'See Results →' : 'Next Line →';
  showScreen('screen-result');
}

// ── Next line / finish ────────────────────────────────────────────────────────
els.btnNext.addEventListener('click', () => {
  if (state.round < LINES_PER_DAY - 1) {
    state.round++;
    showScreen('screen-preview');
    beginRound();
  } else {
    showSummary();
  }
});

// ── Summary / Final grade ─────────────────────────────────────────────────────
const GRADES = [
  { min: 85, title: 'Carbon Clone',    bad: false, taglines: [
    'Photographic memory or you cheated. Either way, unsettling.',
    'The line called. It said it was flattered.',
    'Suspiciously good. Do you practise this alone?',
  ]},
  { min: 70, title: 'Decent Tracer',   bad: false, taglines: [
    'Your hand follows your eyes. Mostly.',
    'Not perfect, but you can look people in the eye.',
    'A respectable showing. We expected worse.',
  ]},
  { min: 55, title: 'Smudged Copy',    bad: false, taglines: [
    'Close enough that your friends won\'t laugh. To your face.',
    'The spirit was there. The line, less so.',
    'You gave it your best. Your best is... fine.',
  ]},
  { min: 35, title: 'Rough Draft',     bad: true,  taglines: [
    'It\'s giving "abstract interpretation" of the original.',
    'In a parallel universe, this is correct.',
    'You watched the lines. Then did something else entirely.',
  ]},
  { min:  0, title: 'Hot Mess',        bad: true,  taglines: [
    'The line called. It wants nothing to do with you.',
    'Three lines. Zero copies. Impressive in its own way.',
    'You have disproven the concept of muscle memory.',
    'We genuinely don\'t know what happened here.',
  ]},
];

function gradeForAvg(avg) {
  const grade = GRADES.find(g => avg >= g.min);
  return { ...grade, tagline: grade.taglines[Math.floor(Math.random() * grade.taglines.length)] };
}

function avg(arr) {
  return arr.length ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : 0;
}

// ── localStorage helpers ──────────────────────────────────────────────────────
const STORAGE_KEY = 'carbon-copy-stats';

function loadStats() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
}

function saveStats(stats) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(stats)); } catch {}
}

function updateStats(scoreAvg) {
  const stats    = loadStats();
  const today    = state.seed; // date-based seed doubles as key
  const prevBest = stats.best || 0;
  const lastSeed = stats.lastSeed || '';
  const streak   = stats.streak  || 0;

  stats.best     = Math.max(prevBest, scoreAvg);
  stats.lastSeed = today;

  // Streak: consecutive daily seeds played
  const yesterday = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `carbon-${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  })();
  stats.streak = (lastSeed === yesterday || lastSeed === today) ? streak + (lastSeed !== today ? 1 : 0) : 1;
  if (lastSeed === today) stats.streak = streak; // already played today, keep streak

  saveStats(stats);
  return stats;
}

function refreshStatCard() {
  const stats = loadStats();
  els.bestScore.textContent = stats.best != null ? stats.best : '—';
  els.streak.textContent    = `Streak: ${stats.streak || 0}`;
}

// ── Show summary ──────────────────────────────────────────────────────────────
function showSummary() {
  const scoreAvg = avg(state.scores);
  const grade    = gradeForAvg(scoreAvg);
  const stats    = updateStats(scoreAvg);

  els.finalGrade.textContent = grade.title;
  els.finalGrade.className   = 'final-title' + (grade.bad ? ' bad' : '');
  els.finalTagline.textContent = grade.tagline;

  els.scoreGrid.innerHTML = state.scores.map((s, i) => `
    <div class="score-card">
      <span class="round-label">Line ${i + 1}</span>
      <span class="round-score" style="color:${s >= 70 ? 'var(--success)' : s >= 45 ? 'var(--warn)' : 'var(--danger)'}">${s}</span>
    </div>`).join('') + `
    <div class="score-card">
      <span class="round-label">Average</span>
      <span class="round-score" style="color:${scoreAvg >= 70 ? 'var(--success)' : scoreAvg >= 45 ? 'var(--warn)' : 'var(--danger)'}">${scoreAvg}</span>
    </div>`;

  refreshStatCard();
  showScreen('screen-summary');
}

// ── Share ─────────────────────────────────────────────────────────────────────
els.btnShare.addEventListener('click', () => {
  const scoreAvg = avg(state.scores);
  const grade    = gradeForAvg(scoreAvg);
  const bars     = state.scores.map(s => s >= 70 ? '🟦' : s >= 45 ? '🟨' : '🟥').join('');
  const url      = window.location.href.split('?')[0] + '?seed=' + encodeURIComponent(state.seed);

  const lines = state.scores.map((s, i) => `Line ${i + 1}: ${s}`).join('  ·  ');
  const text = [
    `✏️ Carbon Copy`,
    `${bars}`,
    ``,
    `${lines}`,
    `Average: ${scoreAvg}/100 — ${grade.title}`,
    ``,
    url,
  ].join('\n');

  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => flashButton(els.btnShare, '✓ Copied!'));
  } else {
    prompt('Copy your results:', text);
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
els.btnStart.addEventListener('click', () => {
  generateDailyLines();
  state.round  = 0;
  state.scores = [];
  showScreen('screen-preview');
  beginRound();
});

// ── Restart ───────────────────────────────────────────────────────────────────
els.btnRestart.addEventListener('click', () => {
  loadSeed(state.seed);
  showScreen('screen-landing');
});
