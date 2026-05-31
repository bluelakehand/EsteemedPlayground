const menuScreen = document.querySelector("#menu-screen");
const roundScreen = document.querySelector("#round-screen");
const startRoundButton = document.querySelector("#start-round");
const returnMenuButton = document.querySelector("#return-menu");
const courseGrid = document.querySelector("#course-grid");
const handCardList = document.querySelector("#hand-card-list");
const directionButtons = document.querySelectorAll(".direction-button");
const backhandButton = document.querySelector("#backhand-button");
const forehandButton = document.querySelector("#forehand-button");
const throwButton = document.querySelector("#throw-button");
const drawDiscButton = document.querySelector("#draw-disc-button");
const drawThrowButton = document.querySelector("#draw-throw-button");
const strokeCounter = document.querySelector("#stroke-counter");
const c1Stat = document.querySelector("#c1-stat");
const c2Stat = document.querySelector("#c2-stat");
const throwInStat = document.querySelector("#throw-in-stat");
const lieNote = document.querySelector("#lie-note");
const selectedCardPanel = document.querySelector("#selected-card-panel");
const selectedThrowCardPanel = document.querySelector("#selected-throw-card-panel");
const holeCompleteModal = document.querySelector("#hole-complete-modal");
const scoreResult = document.querySelector("#score-result");
const closeHoleModalButton = document.querySelector("#close-hole-modal");

const hole = {
  par: 3,
  columns: 7,
  rows: 12,
  tee: { x: 3, y: 10 },
  basket: { x: 3, y: 1 },
  hazards: [
    { type: "tree", variant: 1, height: 3, x: 1, y: 2 },
    { type: "tree", variant: 2, height: 3, x: 5, y: 3 },
    { type: "tree", variant: 1, height: 3, x: 4, y: 5 },
    { type: "tree", variant: 2, height: 3, x: 1, y: 7 },
    { type: "tree", variant: 1, height: 3, x: 5, y: 9 },
    { type: "rock", height: 1, x: 2, y: 4 },
    { type: "rock", height: 1, x: 4, y: 8 }
  ]
};

const throwPatterns = {
  backhand: {
    turnSign: -1,
    fadeSign: -1
  },
  forehand: {
    turnSign: 1,
    fadeSign: 1
  }
};

const discs = {
  comb: {
    name: "COMB",
    type: "Putter",
    image: "discs/comb_putter.png",
    speed: 3,
    glide: 2,
    turn: 0,
    fade: 1,
    putt: 5
  },
  palm: {
    name: "PALM",
    type: "Midrange",
    image: "discs/palm_mid.png",
    speed: 5,
    glide: 2,
    turn: -1,
    fade: 1,
    putt: 3
  },
  kraken: {
    name: "KRAKEN",
    type: "Driver",
    image: "discs/Kraken_driver.png",
    speed: 8,
    glide: 2,
    turn: 0,
    fade: 2,
    putt: -5
  }
};

const throwCardEffects = {
  "power-down": {
    name: "Power Down",
    text: "-1 Speed this throw.",
    speed: -1
  },
  "hyzer-throw": {
    name: "Hyzer Throw",
    text: "Fade +1 this throw.",
    fade: 1
  }
};

const playerStats = {
  c1: 50,
  c2: 10,
  throwIn: 3
};

const maxHandSize = 4;
const startingDiscDeck = ["comb", "comb", "palm", "palm", "kraken", "kraken"];
const startingThrowDeck = ["power-down", "power-down", "hyzer-throw", "hyzer-throw"];

let selectedThrow = "backhand";
let selectedDiscId = null;
let selectedThrowCardId = null;
let selectedDirection = "up";
let discDeck = [];
let throwDeck = [];
let hand = [];
let currentDiscCell = { ...hole.tee };
let strokeNumber = 1;
let isThrowing = false;
let pendingPutt = null;
let isHoledOut = false;

function selectedDisc() {
  return discs[selectedDiscId];
}

function modifiedDisc() {
  const disc = selectedDisc();
  const effect = selectedThrowCardId ? throwCardEffects[selectedThrowCardId] : {};

  return {
    ...disc,
    speed: Math.max(1, disc.speed + (effect.speed ?? 0)),
    fade: Math.max(0, disc.fade + (effect.fade ?? 0))
  };
}

function resetDecksAndHand() {
  discDeck = [...startingDiscDeck];
  throwDeck = [...startingThrowDeck];
  hand = [];
  selectedDiscId = null;
  selectedThrowCardId = null;

  drawFromDeck("disc");
  drawFromDeck("disc");
  drawFromDeck("disc");
  drawFromDeck("throw");
  selectFirstPlayableCards();
}

function drawFromDeck(deckType) {
  if (hand.length >= maxHandSize) {
    return false;
  }

  const deck = deckType === "disc" ? discDeck : throwDeck;
  if (deck.length === 0) {
    return false;
  }

  const cardId = deck.shift();
  hand.push({
    instanceId: `${deckType}-${cardId}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    cardType: deckType,
    cardId
  });
  selectFirstPlayableCards();
  return true;
}

function selectFirstPlayableCards() {
  if (!hand.some((card) => card.cardType === "disc" && card.cardId === selectedDiscId)) {
    selectedDiscId = hand.find((card) => card.cardType === "disc")?.cardId ?? null;
  }

  if (selectedThrowCardId && !hand.some((card) => card.cardType === "throw" && card.cardId === selectedThrowCardId)) {
    selectedThrowCardId = null;
  }
}

function discardCard(cardType, cardId) {
  const index = hand.findIndex((card) => card.cardType === cardType && card.cardId === cardId);

  if (index >= 0) {
    hand.splice(index, 1);
  }
}

function discardSelectedDisc() {
  discardCard("disc", selectedDiscId);
  selectFirstPlayableCards();
}

function needsDraw() {
  return hand.length < maxHandSize && (discDeck.length > 0 || throwDeck.length > 0);
}

function canAct() {
  return !needsDraw() && Boolean(selectedDiscId);
}

function sameCell(a, b) {
  return a.x === b.x && a.y === b.y;
}

function gridDistance(a, b) {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

function hazardForCell(x, y) {
  return hole.hazards.find((hazard) => hazard.x === x && hazard.y === y);
}

function clampCell(cell) {
  return {
    x: Math.min(Math.max(cell.x, 0), hole.columns - 1),
    y: Math.min(Math.max(cell.y, 0), hole.rows - 1)
  };
}

function getThrowPath(type, origin = currentDiscCell) {
  const pattern = throwPatterns[type];
  const disc = modifiedDisc();
  const speed = effectiveSpeed(disc, origin);
  const path = [];
  let lateralOffset = 0;
  const turnMagnitude = Math.abs(disc.turn);
  const turnDirection = Math.sign(disc.turn) * pattern.turnSign;

  for (let step = 1; step <= speed; step += 1) {
    if (turnMagnitude > 0 && step >= 2 && step < 2 + turnMagnitude) {
      lateralOffset += turnDirection;
    }

    if (disc.fade > 0 && step > speed - disc.fade) {
      lateralOffset += pattern.fadeSign;
    }

    const projectedCell = projectCell(origin, step, lateralOffset);

    path.push({
      x: projectedCell.x,
      y: projectedCell.y,
      height: flightHeight(step, speed, disc.glide)
    });
  }

  return path.map((step) => ({
    ...clampCell(step),
    height: step.height
  }));
}

function effectiveSpeed(disc, origin = currentDiscCell) {
  return Math.max(1, disc.speed - (hazardForCell(origin.x, origin.y) ? 2 : 0));
}

function projectCell(origin, forward, lateral) {
  const vectors = {
    up: { forward: { x: 0, y: -1 }, lateral: { x: 1, y: 0 } },
    right: { forward: { x: 1, y: 0 }, lateral: { x: 0, y: 1 } },
    down: { forward: { x: 0, y: 1 }, lateral: { x: -1, y: 0 } },
    left: { forward: { x: -1, y: 0 }, lateral: { x: 0, y: -1 } }
  };
  const direction = vectors[selectedDirection];

  return {
    x: origin.x + direction.forward.x * forward + direction.lateral.x * lateral,
    y: origin.y + direction.forward.y * forward + direction.lateral.y * lateral
  };
}

function flightHeight(step, speed, glide) {
  const glideTwoProfiles = {
    1: [1],
    2: [2, 1],
    3: [3, 2, 1],
    4: [3, 2, 2, 1],
    5: [3, 3, 2, 1, 1],
    6: [3, 3, 2, 2, 1, 1],
    7: [3, 3, 2, 2, 2, 1, 1],
    8: [3, 3, 3, 2, 2, 2, 1, 1],
    9: [3, 3, 3, 2, 2, 2, 1, 1, 1],
    10: [3, 3, 3, 2, 2, 2, 2, 1, 1, 1],
    11: [3, 3, 3, 2, 2, 2, 2, 1, 1, 1, 1],
    12: [3, 3, 3, 3, 2, 2, 2, 2, 1, 1, 1, 1]
  };

  if (glide === 1) {
    if (step === 1) {
      return 3;
    }

    if (step === 2) {
      return 2;
    }

    return 1;
  }

  if (glide === 3) {
    if (step >= speed) {
      return 1;
    }

    if (step >= speed - 1) {
      return 2;
    }

    return 3;
  }

  return glideTwoProfiles[speed]?.[step - 1] ?? 1;
}

function flightStepForCell(path, x, y) {
  return path.find((step) => sameCell(step, { x, y }));
}

function isCollision(step, hazard) {
  return Boolean(step && hazard && step.height <= hazard.height);
}

function firstCollision(path) {
  return path.find((step) => isCollision(step, hazardForCell(step.x, step.y)));
}

function randomCollisionLie(obstacleCell) {
  const candidates = [
    { x: obstacleCell.x, y: obstacleCell.y },
    { x: obstacleCell.x, y: obstacleCell.y - 1 },
    { x: obstacleCell.x, y: obstacleCell.y + 1 },
    { x: obstacleCell.x - 1, y: obstacleCell.y },
    { x: obstacleCell.x + 1, y: obstacleCell.y }
  ].map(clampCell);
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function makeAsset(src, alt) {
  const asset = document.createElement("img");
  asset.src = src;
  asset.alt = alt;
  asset.className = "cell-asset";
  return asset;
}

function renderCourse(lockedFlightPath = null) {
  courseGrid.style.setProperty("--columns", hole.columns);
  courseGrid.style.setProperty("--rows", hole.rows);
  courseGrid.innerHTML = "";
  const flightPath = pendingPutt || !selectedDiscId ? [] : (lockedFlightPath ?? getThrowPath(selectedThrow));

  for (let y = 0; y < hole.rows; y += 1) {
    for (let x = 0; x < hole.columns; x += 1) {
      const cell = document.createElement("div");
      const hazard = hazardForCell(x, y);
      const isTee = sameCell(hole.tee, { x, y });
      const isBasket = sameCell(hole.basket, { x, y });
      const flightStep = flightStepForCell(flightPath, x, y);
      const isFlight = Boolean(flightStep);
      const collision = isCollision(flightStep, hazard);
      const hasDisc = sameCell(currentDiscCell, { x, y });

      cell.className = "course-cell";
      cell.dataset.x = x;
      cell.dataset.y = y;
      cell.style.backgroundImage = 'url("course assets/grass1.png")';

      if (isFlight) {
        cell.classList.add("flight-cell");
        cell.classList.add(`flight-height-${flightStep.height}`);
        cell.dataset.flightHeight = flightStep.height;
      }

      if (collision) {
        cell.classList.add("collision-cell");
      }

      if (isTee) {
        cell.classList.add("tee-cell");
        cell.append(makeAsset("course assets/teepad.png", "Teepad"));
      }

      if (hazard?.type === "tree") {
        cell.classList.add("hazard-cell");
        cell.dataset.obstacleHeight = hazard.height;
        cell.append(makeAsset(`course assets/tree${hazard.variant}.png`, "Tree"));
      }

      if (hazard?.type === "rock") {
        cell.classList.add("hazard-cell");
        cell.dataset.obstacleHeight = hazard.height;
        cell.append(makeAsset("course assets/rock1.png", "Rock"));
      }

      if (isBasket) {
        cell.classList.add("basket-cell");
        if (pendingPutt) {
          cell.classList.add("putt-target-cell");
        }
        cell.append(makeAsset("basket_icon.png", "Basket"));
      }

      if (hasDisc) {
        const disc = selectedDisc();
        cell.append(makeAsset(disc?.image ?? "basket_icon.png", `${disc?.name ?? "Disc"} disc`));
        cell.lastElementChild.classList.add("disc-token");
      }

      courseGrid.append(cell);
    }
  }
}

function updateThrowControls() {
  const isBackhand = selectedThrow === "backhand";
  const controlsLocked = isThrowing || needsDraw() || isHoledOut;
  backhandButton.classList.toggle("active", isBackhand);
  forehandButton.classList.toggle("active", !isBackhand);
  backhandButton.setAttribute("aria-pressed", String(isBackhand));
  forehandButton.setAttribute("aria-pressed", String(!isBackhand));
  backhandButton.disabled = controlsLocked;
  forehandButton.disabled = controlsLocked;
  updateDirectionControls();
  renderHand();
  renderSelectedCard();
  renderSelectedThrowCard();
  strokeCounter.textContent = `Stroke ${strokeNumber}`;
  updatePlayerStats();
  throwInStat.textContent = `${playerStats.throwIn}%`;
  updateActionButton();
  updateDrawControls();
}

function setLieNote(message) {
  lieNote.hidden = !message;
  lieNote.textContent = message ?? "";
}

function updateThrowCardControls() {
  renderHand();
}

function renderSelectedCard() {
  const disc = selectedDisc();
  if (!disc) {
    selectedCardPanel.innerHTML = "";
    return;
  }
  const puttLabel = disc.putt > 0 ? `+${disc.putt}` : `${disc.putt}`;

  selectedCardPanel.innerHTML = `
    <div class="selected-disc-card">
      <img src="${disc.image}" alt="${disc.name} ${disc.type}">
      <span class="disc-name">${disc.name}</span>
      <span class="disc-type">${disc.type}</span>
      <span class="disc-ratings" aria-label="Speed ${disc.speed}, glide ${disc.glide}, turn ${disc.turn}, fade ${disc.fade}, putt ${puttLabel} percent">
        <strong>${disc.speed}</strong>
        <strong>${disc.glide}</strong>
        <strong>${disc.turn}</strong>
        <strong>${disc.fade}</strong>
        <strong>${puttLabel}</strong>
      </span>
      <span class="rating-labels">
        <span>Speed</span>
        <span>Glide</span>
        <span>Turn</span>
        <span>Fade</span>
        <span>Putt</span>
      </span>
    </div>
  `;
}

function renderSelectedThrowCard() {
  if (!selectedThrowCardId) {
    selectedThrowCardPanel.innerHTML = "";
    selectedThrowCardPanel.hidden = true;
    return;
  }

  const card = throwCardEffects[selectedThrowCardId];
  selectedThrowCardPanel.hidden = false;
  selectedThrowCardPanel.innerHTML = `
    <div class="selected-throw-card">
      <img src="basket_icon.png" alt="">
      <span>${card.name}</span>
      <small>${card.text}</small>
    </div>
  `;
}

function renderHand() {
  handCardList.innerHTML = "";

  hand.forEach((card) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.instanceId = card.instanceId;

    if (card.cardType === "disc") {
      const disc = discs[card.cardId];
      const puttLabel = disc.putt > 0 ? `+${disc.putt}` : `${disc.putt}`;
      button.className = "disc-card";
      button.classList.toggle("selected", card.cardId === selectedDiscId);
      button.dataset.discId = card.cardId;
      button.setAttribute("aria-pressed", String(card.cardId === selectedDiscId));
      button.innerHTML = `
        <span class="disc-preview-name">${disc.name}</span>
        <span class="disc-preview-stats">${disc.speed} / ${disc.glide} / ${disc.turn} / ${disc.fade} / ${puttLabel}</span>
      `;
      button.addEventListener("click", () => selectDisc(card.cardId));
    } else {
      const throwCard = throwCardEffects[card.cardId];
      button.className = "throw-card";
      button.classList.toggle("selected", card.cardId === selectedThrowCardId);
      button.dataset.throwCardId = card.cardId;
      button.setAttribute("aria-pressed", String(card.cardId === selectedThrowCardId));
      button.innerHTML = `
        <span class="disc-preview-name">${throwCard.name}</span>
        <span class="disc-preview-stats">${throwCard.text.replace(" this throw.", "")}</span>
      `;
      button.addEventListener("click", () => selectThrowCard(card.cardId));
    }

    button.disabled = isThrowing || (needsDraw() && !isHoledOut);
    handCardList.append(button);
  });
}

function updateDirectionControls() {
  directionButtons.forEach((button) => {
    const isSelected = button.dataset.direction === selectedDirection;
    button.classList.toggle("active", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
    button.disabled = isThrowing || needsDraw() || Boolean(pendingPutt) || isHoledOut;
  });
}

function updatePlayerStats() {
  const c1Total = puttChance("c1");
  const c2Total = puttChance("c2");

  c1Stat.textContent = pendingPutt?.circle === "c1" ? `${c1Total}%` : `${playerStats.c1}%`;
  c2Stat.textContent = pendingPutt?.circle === "c2" ? `${c2Total}%` : `${playerStats.c2}%`;
  c1Stat.parentElement.classList.toggle("modified-stat", pendingPutt?.circle === "c1");
  c2Stat.parentElement.classList.toggle("modified-stat", pendingPutt?.circle === "c2");
  c1Stat.parentElement.title = pendingPutt?.circle === "c1" && selectedDisc() ? `Includes ${selectedDisc().name} Putt +${selectedDisc().putt}%` : "";
  c2Stat.parentElement.title = pendingPutt?.circle === "c2" && selectedDisc() ? `Includes ${selectedDisc().name} Putt +${selectedDisc().putt}%` : "";
}

function updateDrawControls() {
  const drawRequired = !isHoledOut && needsDraw();
  drawDiscButton.hidden = !drawRequired;
  drawThrowButton.hidden = !drawRequired;
  drawDiscButton.disabled = isThrowing || hand.length >= maxHandSize || discDeck.length === 0;
  drawThrowButton.disabled = isThrowing || hand.length >= maxHandSize || throwDeck.length === 0;
  drawDiscButton.textContent = `Draw Disc (${discDeck.length})`;
  drawThrowButton.textContent = `Draw Throw (${throwDeck.length})`;
}

function selectThrow(type) {
  if (isThrowing || needsDraw() || selectedThrow === type) {
    return;
  }

  selectedThrow = type;
  updateThrowControls();
  renderCourse();
}

function selectDisc(discId) {
  if (isThrowing || needsDraw() || selectedDiscId === discId) {
    return;
  }

  selectedDiscId = discId;
  updateThrowControls();
  renderCourse();
}

function selectThrowCard(cardId) {
  if (isThrowing || needsDraw() || pendingPutt) {
    return;
  }

  selectedThrowCardId = selectedThrowCardId === cardId ? null : cardId;
  updateThrowControls();
  renderCourse();
}

function selectDirection(direction) {
  if (isThrowing || needsDraw() || pendingPutt || selectedDirection === direction) {
    return;
  }

  selectedDirection = direction;
  updateThrowControls();
  renderCourse();
}

function updateActionButton() {
  if (isHoledOut) {
    throwButton.textContent = "Holed Out";
    throwButton.disabled = true;
    return;
  }

  if (needsDraw()) {
    throwButton.textContent = "Draw to 4";
    throwButton.disabled = true;
    return;
  }

  if (!selectedDiscId) {
    throwButton.textContent = "No Disc";
    throwButton.disabled = true;
    return;
  }

  if (pendingPutt?.circle === "c1") {
    throwButton.textContent = "Try C1 Putt";
    throwButton.disabled = false;
    return;
  }

  if (pendingPutt?.circle === "c2") {
    throwButton.textContent = "Try C2 Putt";
    throwButton.disabled = false;
    return;
  }

  throwButton.textContent = "Throw";
  throwButton.disabled = false;
}

function completeHole() {
  isHoledOut = true;
  showHoleCompleteModal();
}

function scoreLabel(scoreToPar) {
  if (scoreToPar === 0) {
    return "Even Par";
  }

  return scoreToPar > 0 ? `+${scoreToPar} Over Par` : `${scoreToPar} Under Par`;
}

function showHoleCompleteModal() {
  const scoreToPar = strokeNumber - hole.par;
  scoreResult.textContent = scoreLabel(scoreToPar);
  scoreResult.classList.remove("score-under", "score-even", "score-over");
  scoreResult.classList.add(scoreToPar < 0 ? "score-under" : scoreToPar === 0 ? "score-even" : "score-over");
  holeCompleteModal.hidden = false;
  closeHoleModalButton.focus();
}

function closeHoleCompleteModal() {
  holeCompleteModal.hidden = true;
  throwButton.focus();
}

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function percentRoll(chance) {
  return Math.random() * 100 < chance;
}

function puttChance(circle) {
  const baseChance = circle === "c1" ? playerStats.c1 : playerStats.c2;
  return Math.min(baseChance + (selectedDisc()?.putt ?? 0), 100);
}

function resolveLanding(cell) {
  const basketDistance = gridDistance(cell, hole.basket);
  pendingPutt = null;

  if (basketDistance === 0) {
    if (percentRoll(playerStats.throwIn)) {
      setLieNote(`Throw-in made. ${playerStats.throwIn}% chance hit, no putt required.`);
      completeHole();
      return;
    }

    pendingPutt = { circle: "c1" };
    setLieNote(`Throw-in missed. Take a C1 putt at ${puttChance("c1")}% with ${selectedDisc().name}.`);
    return;
  }

  if (basketDistance === 1) {
    pendingPutt = { circle: "c2" };
    setLieNote(`Circle 2 look. Take a C2 putt at ${puttChance("c2")}% with ${selectedDisc().name}.`);
    return;
  }

  setLieNote("Outside putting range. Throw again from this lie.");
}

function attemptPutt() {
  if (!pendingPutt || isHoledOut || !canAct()) {
    return;
  }

  const circle = pendingPutt.circle;
  const chance = puttChance(circle);
  const discName = selectedDisc().name;
  strokeNumber += 1;

  if (percentRoll(chance)) {
    pendingPutt = null;
    setLieNote(`${circle.toUpperCase()} putt made at ${chance}% with ${discName}.`);
    discardSelectedDisc();
    completeHole();
  } else {
    if (circle === "c2") {
      currentDiscCell = { ...hole.basket };
      pendingPutt = { circle: "c1" };
      setLieNote(`C2 putt missed at ${chance}% with ${discName}. Comeback C1 putt from the basket.`);
    } else {
      setLieNote(`C1 putt missed at ${chance}% with ${discName}. Try again from the same lie.`);
    }
    discardSelectedDisc();
  }

  updateThrowControls();
  renderCourse();
}

async function animateThrow() {
  if (isThrowing) {
    return;
  }

  if (pendingPutt) {
    if (!canAct()) {
      return;
    }

    attemptPutt();
    return;
  }

  if (isHoledOut) {
    return;
  }

  if (!canAct()) {
    return;
  }

  isThrowing = true;
  throwButton.disabled = true;
  backhandButton.disabled = true;
  forehandButton.disabled = true;
  renderHand();

  const path = getThrowPath(selectedThrow);
  const collision = firstCollision(path);
  const animationPath = collision ? path.slice(0, path.indexOf(collision) + 1) : path;
  renderCourse(path);
  await wait(140);

  for (const step of animationPath) {
    currentDiscCell = { ...step };
    renderCourse(path);
    await wait(260);
  }

  if (collision) {
    currentDiscCell = randomCollisionLie(collision);
  }

  strokeNumber += 1;
  if (collision) {
    const hazard = hazardForCell(currentDiscCell.x, currentDiscCell.y);
    const penaltyText = hazard ? " The next throw is from an obstacle, so disc speed is reduced by 2." : "";
    setLieNote(`Hit an obstacle and kicked to a new lie.${penaltyText}`);
    pendingPutt = null;
  } else {
    resolveLanding(currentDiscCell);
  }
  isThrowing = false;
  throwButton.disabled = false;
  backhandButton.disabled = false;
  forehandButton.disabled = false;
  discardSelectedDisc();
  if (selectedThrowCardId) {
    discardCard("throw", selectedThrowCardId);
  }
  selectedThrowCardId = null;
  updateThrowControls();
  renderCourse();
  throwButton.focus();
}

function showRound() {
  resetDecksAndHand();
  currentDiscCell = { ...hole.tee };
  strokeNumber = 1;
  pendingPutt = null;
  isHoledOut = false;
  holeCompleteModal.hidden = true;
  setLieNote(null);
  updateThrowControls();
  renderCourse();
  menuScreen.hidden = true;
  roundScreen.hidden = false;
  document.querySelector(`[data-disc-id="${selectedDiscId}"]`)?.focus();
}

function showMenu() {
  roundScreen.hidden = true;
  menuScreen.hidden = false;
  currentDiscCell = { ...hole.tee };
  strokeNumber = 1;
  pendingPutt = null;
  isHoledOut = false;
  holeCompleteModal.hidden = true;
  setLieNote(null);
  updateThrowControls();
  renderCourse();
  startRoundButton.focus();
}

function handleDraw(deckType) {
  if (!needsDraw()) {
    return;
  }

  drawFromDeck(deckType);
  updateThrowControls();
  renderCourse();
}

updateThrowControls();
renderCourse();
startRoundButton.addEventListener("click", showRound);
returnMenuButton.addEventListener("click", showMenu);
backhandButton.addEventListener("click", () => selectThrow("backhand"));
forehandButton.addEventListener("click", () => selectThrow("forehand"));
throwButton.addEventListener("click", animateThrow);
closeHoleModalButton.addEventListener("click", closeHoleCompleteModal);
drawDiscButton.addEventListener("click", () => handleDraw("disc"));
drawThrowButton.addEventListener("click", () => handleDraw("throw"));
directionButtons.forEach((button) => {
  button.addEventListener("click", () => selectDirection(button.dataset.direction));
});
