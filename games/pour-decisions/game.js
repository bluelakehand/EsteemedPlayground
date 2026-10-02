(function () {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const ui = {
    passed: document.getElementById("passed-value"),
    spill: document.getElementById("spill-value"),
    brew: document.getElementById("brew-value"),
    best: document.getElementById("best-score"),
    progress: document.getElementById("level-progress"),
    retry: document.getElementById("retry-button"),
    result: document.getElementById("result-panel"),
    stars: document.getElementById("result-stars"),
    title: document.getElementById("result-title"),
    copy: document.getElementById("result-copy"),
    kicker: document.getElementById("result-kicker"),
    instructions: document.getElementById("instructions"),
    modes: [...document.querySelectorAll(".mode-button")],
    pitchers: [...document.querySelectorAll(".pitcher-button")]
  };

  const W = canvas.width;
  const H = canvas.height;
  const PITCHER_CAPACITY = 150;
  const GLASS_CAPACITY = 62;
  const CONVEYOR_SPEED = 38;
  const BREWS = {
    red: { name: "Red", color: "#ef476f", glow: "#ff829d", rgb: [239, 71, 111] },
    blue: { name: "Blue", color: "#2878e0", glow: "#79b9ff", rgb: [40, 120, 224] },
    yellow: { name: "Yellow", color: "#ffd447", glow: "#ffe98f", rgb: [255, 212, 71] }
  };
  const ORDERS = [
    { name: "Red", recipe: { red: 1, blue: 0, yellow: 0 }, target: 30, targetColor: "#ef476f", glow: "#ff829d", recipeText: "RED" },
    { name: "Purple", recipe: { red: .5, blue: .5, yellow: 0 }, target: 39, targetColor: "#8c57d9", glow: "#c39aff", recipeText: "PURPLE · 1R : 1B" },
    { name: "Green", recipe: { red: 0, blue: .5, yellow: .5 }, target: 47, targetColor: "#4acb83", glow: "#91efb6", recipeText: "GREEN · 1B : 1Y" }
  ];
  const keys = new Set();
  const pointers = new Map();
  const particles = [];
  let mode = "easy";
  let lastTime = performance.now();
  let state;

  function emptyContents() { return { red: 0, blue: 0, yellow: 0 }; }
  function freshState() {
    return {
      pitcherX: 225,
      targetX: 225,
      tilt: 0,
      targetTilt: 0,
      selected: "red",
      pitchers: { red: PITCHER_CAPACITY, blue: PITCHER_CAPACITY, yellow: PITCHER_CAPACITY },
      glasses: ORDERS.map((order, index) => ({
        order,
        x: 125 - index * 270,
        y: 412,
        w: 78,
        h: 142,
        contents: emptyContents(),
        wave: 0,
        passed: false,
        score: null
      })),
      spilled: 0,
      stream: 0,
      time: 0,
      started: false,
      finished: false,
      passedCount: 0
    };
  }

  function reset() {
    state = freshState();
    particles.length = 0;
    pointers.clear();
    keys.clear();
    ui.result.hidden = true;
    selectBrew("red");
    updateUI();
  }

  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function lerp(a, b, amount) { return a + (b - a) * amount; }
  function glassVolume(glass) { return Object.values(glass.contents).reduce((sum, amount) => sum + amount, 0); }
  function beginLevel() { if (!state.finished) state.started = true; }

  function selectBrew(brew) {
    if (!BREWS[brew] || state.finished) return;
    state.selected = brew;
    state.targetTilt = 0;
    state.tilt = Math.min(state.tilt, 18);
    state.stream = 0;
    ui.pitchers.forEach(button => button.classList.toggle("active", button.dataset.brew === brew));
    ui.brew.textContent = BREWS[brew].name;
    ui.brew.style.color = BREWS[brew].glow;
    updatePitcherButtons();
  }

  function updatePitcherButtons() {
    ui.pitchers.forEach(button => {
      const amount = state.pitchers[button.dataset.brew];
      button.querySelector("small").textContent = `${Math.ceil(amount)} ml`;
      button.setAttribute("aria-label", `Select ${button.dataset.brew} pitcher, ${Math.ceil(amount)} milliliters remaining`);
    });
  }

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * W / rect.width,
      y: (event.clientY - rect.top) * H / rect.height
    };
  }

  function spoutPosition() {
    const angle = state.tilt * Math.PI / 180;
    return {
      x: state.pitcherX + 78 * Math.cos(angle) + 31 * Math.sin(angle),
      y: 158 + 78 * Math.sin(angle) - 31 * Math.cos(angle)
    };
  }

  function threshold() {
    const fill = state.pitchers[state.selected] / PITCHER_CAPACITY;
    return 34 + 42 * Math.pow(1 - fill, 1.65);
  }

  function glassUnderStream(x) {
    return state.glasses.find(glass => !glass.passed && x > glass.x - glass.w / 2 + 5 && x < glass.x + glass.w / 2 - 5);
  }

  function update(dt) {
    if (state.finished) {
      updateParticles(dt);
      return;
    }
    state.time += dt;

    if (state.started) {
      for (const glass of state.glasses) {
        if (glass.passed) continue;
        glass.x += CONVEYOR_SPEED * dt;
        if (glass.x > W + glass.w) passGlass(glass);
      }
    }

    if (keys.has("ArrowLeft") || keys.has("KeyA")) state.targetX -= 300 * dt;
    if (keys.has("ArrowRight") || keys.has("KeyD")) state.targetX += 300 * dt;
    if (keys.has("Space")) state.targetTilt = 84;
    else if (pointers.size === 0) state.targetTilt = 0;

    state.targetX = clamp(state.targetX, 175, W - 105);
    state.targetTilt = clamp(state.targetTilt, 0, 92);
    state.pitcherX = lerp(state.pitcherX, state.targetX, 1 - Math.exp(-dt * 13));
    state.tilt = lerp(state.tilt, state.targetTilt, 1 - Math.exp(-dt * (state.targetTilt > state.tilt ? 5.5 : 7.2)));

    const excess = Math.max(0, state.tilt - threshold());
    const amountLeft = state.pitchers[state.selected];
    const desiredFlow = amountLeft > 0 ? Math.min(46, .085 * Math.pow(excess, 1.72)) : 0;
    state.stream = lerp(state.stream, desiredFlow, 1 - Math.exp(-dt * (desiredFlow > state.stream ? 15 : 7)));
    if (state.stream < .03) state.stream = 0;

    const poured = Math.min(amountLeft, state.stream * dt);
    if (poured > 0) {
      const spout = spoutPosition();
      const landingX = spout.x + Math.sin(state.tilt * Math.PI / 180) * 25;
      const glass = glassUnderStream(landingX);
      if (glass) {
        const captured = Math.min(poured, GLASS_CAPACITY - glassVolume(glass));
        glass.contents[state.selected] += captured;
        glass.wave = Math.min(1, glass.wave + captured * .09);
        state.spilled += poured - captured;
      } else {
        state.spilled += poured;
      }
      state.pitchers[state.selected] -= poured;
      emitDrops(spout, poured, BREWS[state.selected].color);
    }

    state.glasses.forEach(glass => { glass.wave *= Math.exp(-dt * 2.6); });
    updateParticles(dt);
    updateUI();
  }

  function scoreGlass(glass) {
    const total = glassVolume(glass);
    const accuracy = clamp(100 - Math.abs(total - glass.order.target) / glass.order.target * 100, 0, 100);
    let ratioError = 2;
    if (total > 0) {
      ratioError = Object.keys(BREWS).reduce((sum, key) => sum + Math.abs(glass.contents[key] / total - glass.order.recipe[key]), 0);
    }
    const colorScore = clamp(100 * (1 - ratioError / 2), 0, 100);
    return { total, accuracy, colorScore, score: accuracy * .65 + colorScore * .35 };
  }

  function passGlass(glass) {
    glass.passed = true;
    glass.score = scoreGlass(glass);
    state.passedCount += 1;
    updateUI();
    if (state.passedCount === state.glasses.length) finishLevel();
  }

  function finishLevel() {
    state.finished = true;
    state.targetTilt = 0;
    state.stream = 0;
    const average = state.glasses.reduce((sum, glass) => sum + glass.score.score, 0) / state.glasses.length;
    const score = Math.max(0, Math.round(average - Math.min(25, state.spilled * .55)));
    const stars = score >= 93 ? 3 : score >= 78 ? 2 : score >= 58 ? 1 : 0;
    const currentBest = Number(localStorage.getItem("pour-decisions-conveyor-best") || 0);
    if (score > currentBest) localStorage.setItem("pour-decisions-conveyor-best", String(score));
    showBest();

    const summaries = state.glasses.map(glass => `${glass.order.name} ${glass.score.total.toFixed(0)} ml / ${Math.round(glass.score.colorScore)}% mix`).join(" · ");
    ui.kicker.textContent = "Level 1 complete";
    ui.stars.textContent = "★".repeat(stars) + "☆".repeat(3 - stars);
    ui.stars.setAttribute("aria-label", `${stars} stars`);
    ui.title.textContent = stars === 3 ? "Master mixer!" : stars === 2 ? "Colorful service" : stars === 1 ? "Shift survived" : "Back to the bar";
    ui.copy.textContent = `${summaries}. ${state.spilled.toFixed(1)} ml spilled. Score: ${score}.`;
    ui.result.hidden = false;
  }

  function showBest() {
    const best = Number(localStorage.getItem("pour-decisions-conveyor-best") || 0);
    ui.best.textContent = best ? `${best} pts` : "—";
  }

  function updateUI() {
    ui.passed.textContent = state.passedCount;
    ui.spill.textContent = state.spilled.toFixed(1);
    const remaining = state.glasses.length - state.passedCount;
    ui.progress.textContent = state.started ? `${remaining} cup${remaining === 1 ? "" : "s"} left` : "Start pouring";
    updatePitcherButtons();
  }

  function emitDrops(spout, amount, color) {
    const count = Math.min(7, Math.ceil(amount * 2.2));
    for (let i = 0; i < count; i += 1) {
      particles.push({ x: spout.x + (Math.random() - .5) * 7, y: spout.y, vx: 18 + Math.random() * 18, vy: 85 + Math.random() * 45, r: 2.5 + Math.random() * 3, life: 1.5, color });
    }
  }

  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const particle = particles[i];
      particle.vy += 430 * dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.life -= dt;
      if (particle.y > H - 24 || particle.life <= 0) particles.splice(i, 1);
    }
  }

  function roundedRect(x, y, w, h, radius) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
  }

  function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, H);
    gradient.addColorStop(0, "#3b2443");
    gradient.addColorStop(.64, "#21162d");
    gradient.addColorStop(.645, "#6d3b32");
    gradient.addColorStop(1, "#3e2224");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(255, 207, 117, .07)";
    for (let x = 15; x < W; x += 110) ctx.fillRect(x, 0, 3, 395);
    ctx.fillStyle = "rgba(10, 5, 13, .18)";
    ctx.fillRect(0, 395, W, 10);
    for (let y = 455; y < H; y += 58) ctx.fillRect(0, y, W, 3);

    ctx.save();
    ctx.strokeStyle = "rgba(242, 189, 101, .35)";
    ctx.lineWidth = 3;
    ctx.setLineDash([14, 15]);
    ctx.beginPath();
    ctx.moveTo(108, 583);
    ctx.lineTo(860, 583);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(242, 189, 101, .5)";
    for (let x = 180; x < 850; x += 170) {
      ctx.beginPath();
      ctx.moveTo(x, 575);
      ctx.lineTo(x + 14, 583);
      ctx.lineTo(x, 591);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    if (!state.started) {
      ctx.fillStyle = "rgba(255, 244, 214, .65)";
      ctx.font = "900 14px Trebuchet MS";
      ctx.textAlign = "center";
      ctx.fillText("POUR TO START THE CONVEYOR", W / 2 + 60, 365);
    }
  }

  function drawGuide() {
    if (mode !== "precision") return;
    ctx.save();
    ctx.setLineDash([8, 10]);
    ctx.strokeStyle = "rgba(255,255,255,.13)";
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, 385);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,.34)";
    ctx.font = "900 12px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.fillText("MOVE", W * .3, 32);
    ctx.fillText("DRAG UP TO TILT", W * .75, 32);
    ctx.restore();
  }

  function drawPitcher() {
    const brew = BREWS[state.selected];
    const angle = state.tilt * Math.PI / 180;
    ctx.save();
    ctx.translate(state.pitcherX, 158);
    ctx.rotate(angle);
    ctx.lineWidth = 8;
    ctx.strokeStyle = "#d9c9d0";
    ctx.fillStyle = "rgba(224, 237, 242, .17)";
    roundedRect(-70, -72, 130, 150, 24);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(52, -54);
    ctx.lineTo(88, -42);
    ctx.lineTo(58, -22);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.lineWidth = 13;
    ctx.arc(-66, 4, 49, Math.PI * .55, Math.PI * 1.45);
    ctx.stroke();
    ctx.save();
    roundedRect(-61, -63, 112, 132, 17);
    ctx.clip();
    const liquidHeight = 118 * state.pitchers[state.selected] / PITCHER_CAPACITY;
    ctx.fillStyle = brew.color;
    ctx.fillRect(-64, 68 - liquidHeight, 120, liquidHeight + 4);
    ctx.fillStyle = "rgba(255,255,255,.2)";
    ctx.fillRect(-50, 68 - liquidHeight + 9, 11, Math.max(0, liquidHeight - 20));
    ctx.restore();
    ctx.fillStyle = "rgba(255,255,255,.7)";
    ctx.beginPath();
    ctx.ellipse(-38, -44, 7, 16, -.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawStream() {
    if (state.stream <= .04) return;
    const spout = spoutPosition();
    const brew = BREWS[state.selected];
    ctx.save();
    ctx.strokeStyle = brew.color;
    ctx.lineWidth = 3 + Math.sqrt(state.stream) * 1.4;
    ctx.lineCap = "round";
    ctx.shadowColor = brew.glow;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(spout.x, spout.y);
    ctx.bezierCurveTo(spout.x + 8, spout.y + 75, spout.x + 16, 345, spout.x + 22, 421);
    ctx.stroke();
    ctx.restore();
  }

  function drawParticles() {
    ctx.save();
    for (const particle of particles) {
      ctx.globalAlpha = clamp(particle.life, 0, 1);
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function mixedColor(contents) {
    const total = Object.values(contents).reduce((sum, amount) => sum + amount, 0);
    if (!total) return "rgba(255,255,255,.06)";
    const weights = Object.fromEntries(Object.entries(contents).map(([key, amount]) => [key, amount / total]));
    const active = Object.keys(weights).filter(key => weights[key] > .005);
    if (active.length === 1) return BREWS[active[0]].color;

    const pairMix = (first, second, secondary) => {
      const ratio = weights[second] / (weights[first] + weights[second]);
      return ratio <= .5
        ? blendHex(BREWS[first].color, secondary, ratio * 2)
        : blendHex(secondary, BREWS[second].color, (ratio - .5) * 2);
    };
    if (weights.yellow < .005) return pairMix("red", "blue", "#8c57d9");
    if (weights.red < .005) return pairMix("blue", "yellow", "#4acb83");
    if (weights.blue < .005) return pairMix("red", "yellow", "#f49a45");

    const rgb = [0, 1, 2].map(channel => Math.round(Object.keys(BREWS).reduce((sum, key) => sum + BREWS[key].rgb[channel] * weights[key], 0) * .82));
    return `rgb(${rgb.join(",")})`;
  }

  function blendHex(first, second, amount) {
    const toRgb = hex => [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16));
    const a = toRgb(first);
    const b = toRgb(second);
    const rgb = a.map((channel, index) => Math.round(lerp(channel, b[index], amount)));
    return `rgb(${rgb.join(",")})`;
  }

  function drawGlass(glass) {
    if (glass.passed || glass.x < -glass.w) return;
    const left = glass.x - glass.w / 2;
    const innerBottom = glass.y + glass.h - 10;
    const volume = glassVolume(glass);
    const fillHeight = (glass.h - 20) * volume / GLASS_CAPACITY;
    const liquidTop = innerBottom - fillHeight;
    ctx.save();
    ctx.fillStyle = `${glass.order.targetColor}18`;
    ctx.strokeStyle = glass.order.glow;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(left, glass.y);
    ctx.lineTo(left + 8, glass.y + glass.h);
    ctx.quadraticCurveTo(glass.x, glass.y + glass.h + 7, left + glass.w - 8, glass.y + glass.h);
    ctx.lineTo(left + glass.w, glass.y);
    ctx.stroke();
    if (volume > 0) {
      ctx.beginPath();
      ctx.moveTo(left + 7, innerBottom);
      ctx.lineTo(left + glass.w - 7, innerBottom);
      ctx.lineTo(left + glass.w - 4 - fillHeight * .025, liquidTop);
      const wave = Math.sin(state.time * 9 + glass.x) * glass.wave * 4;
      ctx.quadraticCurveTo(glass.x, liquidTop + wave, left + 4 + fillHeight * .025, liquidTop);
      ctx.closePath();
      ctx.fillStyle = mixedColor(glass.contents);
      ctx.fill();
    }
    const targetY = innerBottom - (glass.h - 20) * glass.order.target / GLASS_CAPACITY;
    ctx.fillStyle = `${glass.order.targetColor}25`;
    ctx.fillRect(left - 6, targetY - 5, glass.w + 12, 10);
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = glass.order.glow;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(left - 8, targetY);
    ctx.lineTo(left + glass.w + 8, targetY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = glass.order.glow;
    ctx.font = "900 11px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.fillText(glass.order.recipeText, glass.x, glass.y - 23);
    ctx.fillStyle = "rgba(255,255,255,.62)";
    ctx.font = "800 10px Trebuchet MS";
    ctx.fillText(`${glass.order.target} ML`, glass.x, glass.y - 9);
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawBackground();
    drawGuide();
    drawStream();
    state.glasses.forEach(drawGlass);
    drawParticles();
    drawPitcher();
  }

  function frame(now) {
    const dt = Math.min(.033, (now - lastTime) / 1000);
    lastTime = now;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  canvas.addEventListener("pointerdown", event => {
    if (state.finished) return;
    beginLevel();
    canvas.setPointerCapture(event.pointerId);
    const point = canvasPoint(event);
    const role = mode === "precision" ? (point.x < W / 2 ? "move" : "tilt") : "easy";
    pointers.set(event.pointerId, { role, startX: point.x, startY: point.y, pitcherStart: state.targetX, tiltStart: state.targetTilt });
    if (role === "easy") {
      state.targetX = clamp(point.x - 74, 175, W - 105);
      state.targetTilt = 84;
    }
  });

  canvas.addEventListener("pointermove", event => {
    const pointer = pointers.get(event.pointerId);
    if (!pointer || state.finished) return;
    const point = canvasPoint(event);
    if (pointer.role === "easy") state.targetX = clamp(point.x - 74, 175, W - 105);
    else if (pointer.role === "move") state.targetX = clamp(pointer.pitcherStart + point.x - pointer.startX, 175, W - 105);
    else state.targetTilt = clamp(pointer.tiltStart + (pointer.startY - point.y) * .48, 0, 92);
  });

  function releasePointer(event) {
    const pointer = pointers.get(event.pointerId);
    if (!pointer) return;
    pointers.delete(event.pointerId);
    if (pointer.role === "easy" || pointer.role === "tilt") state.targetTilt = 0;
  }

  canvas.addEventListener("pointerup", releasePointer);
  canvas.addEventListener("pointercancel", releasePointer);
  window.addEventListener("keydown", event => {
    if (["ArrowLeft", "ArrowRight", "Space"].includes(event.code)) event.preventDefault();
    if (["Digit1", "Digit2", "Digit3"].includes(event.code)) selectBrew(["red", "blue", "yellow"][Number(event.code.slice(-1)) - 1]);
    if (["ArrowLeft", "ArrowRight", "KeyA", "KeyD", "Space"].includes(event.code)) beginLevel();
    keys.add(event.code);
  });
  window.addEventListener("keyup", event => keys.delete(event.code));
  ui.retry.addEventListener("click", reset);
  ui.pitchers.forEach(button => button.addEventListener("click", () => selectBrew(button.dataset.brew)));
  ui.modes.forEach(button => button.addEventListener("click", () => {
    mode = button.dataset.mode;
    ui.modes.forEach(item => item.classList.toggle("active", item === button));
    ui.instructions.innerHTML = mode === "easy"
      ? "<b>Pick a color, drag</b> to track the cup, then hold to pour."
      : "<b>Left side:</b> drag to track. <b>Right side:</b> drag up to tilt.";
    reset();
  }));

  showBest();
  reset();
  requestAnimationFrame(frame);
}());
