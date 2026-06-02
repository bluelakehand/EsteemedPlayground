const menuScreen = document.querySelector("#menu-screen");
const playerMenuScreen = document.querySelector("#player-menu-screen");
const spendPointsScreen = document.querySelector("#spend-points-screen");
const courseSelectScreen = document.querySelector("#course-select-screen");
const roundScreen = document.querySelector("#round-screen");
const editorScreen = document.querySelector("#editor-screen");
const startRoundButton = document.querySelector("#start-round");
const playRoundButton = document.querySelector("#play-round-button");
const spendPointsButton = document.querySelector("#spend-points-button");
const playerPointsLabel = document.querySelector("#player-points");
const playerC1Label = document.querySelector("#player-c1");
const playerC2Label = document.querySelector("#player-c2");
const playerThrowInLabel = document.querySelector("#player-throw-in");
const playerScrambleLabel = document.querySelector("#player-scramble");
const playerControlLabel = document.querySelector("#player-control");
const playerDeckList = document.querySelector("#player-deck-list");
const spendPlayerPointsLabel = document.querySelector("#spend-player-points");
const discShopList = document.querySelector("#disc-shop-list");
const trainingList = document.querySelector("#training-list");
const spendBackButton = document.querySelector("#spend-back-button");
const courseSelectBackButton = document.querySelector("#course-select-back");
const courseList = document.querySelector("#course-list");
const openEditorButton = document.querySelector("#open-editor");
const returnMenuButton = document.querySelector("#return-menu");
const returnEditorMenuButton = document.querySelector("#return-editor-menu");
const courseGrid = document.querySelector("#course-grid");
const courseViewport = document.querySelector("#course-viewport");
const editorGrid = document.querySelector("#editor-grid");
const editorViewport = document.querySelector("#editor-viewport");
const editorHoleNameInput = document.querySelector("#editor-hole-name");
const editorCourseSelect = document.querySelector("#editor-course-select");
const editorNewCourseInput = document.querySelector("#editor-new-course");
const editorHoleNumberInput = document.querySelector("#editor-hole-number");
const editorHoleParInput = document.querySelector("#editor-hole-par");
const editorHoleColumnsInput = document.querySelector("#editor-hole-columns");
const editorHoleRowsInput = document.querySelector("#editor-hole-rows");
const assetButtons = document.querySelectorAll("[data-editor-asset]");
const saveHoleButton = document.querySelector("#save-hole-button");
const loadHoleButton = document.querySelector("#load-hole-button");
const refreshCoursesButton = document.querySelector("#refresh-courses-button");
const loadHoleInput = document.querySelector("#load-hole-input");
const editorNote = document.querySelector("#editor-note");
const handCardList = document.querySelector("#hand-card-list");
const deckCountLabel = document.querySelector("#deck-count");
const discardCountLabel = document.querySelector("#discard-count");
const directionButtons = document.querySelectorAll(".direction-button");
const backhandButton = document.querySelector("#backhand-button");
const forehandButton = document.querySelector("#forehand-button");
const throwButton = document.querySelector("#throw-button");
const pitchButton = document.querySelector("#pitch-button");
const strokeCounter = document.querySelector("#stroke-counter");
const roundHoleLabel = document.querySelector("#round-hole-label");
const roundTitle = document.querySelector("#round-title");
const courseScoreLabel = document.querySelector("#course-score-label");
const roundParLabel = document.querySelector("#round-par-label");
const c1Stat = document.querySelector("#c1-stat");
const c2Stat = document.querySelector("#c2-stat");
const throwInStat = document.querySelector("#throw-in-stat");
const scrambleStat = document.querySelector("#scramble-stat");
const controlStat = document.querySelector("#control-stat");
const lieNote = document.querySelector("#lie-note");
const selectedCardPanel = document.querySelector("#selected-card-panel");
const selectedThrowCardPanel = document.querySelector("#selected-throw-card-panel");
const holeCompleteModal = document.querySelector("#hole-complete-modal");
const scoreResult = document.querySelector("#score-result");
const coursePointsResult = document.querySelector("#course-points-result");
const closeHoleModalButton = document.querySelector("#close-hole-modal");
const purchaseConfirmModal = document.querySelector("#purchase-confirm-modal");
const purchaseConfirmTitle = document.querySelector("#purchase-confirm-title");
const purchaseConfirmCopy = document.querySelector("#purchase-confirm-copy");
const confirmPurchaseButton = document.querySelector("#confirm-purchase-button");
const cancelPurchaseButton = document.querySelector("#cancel-purchase-button");
const obstacleTooltip = document.querySelector("#obstacle-tooltip");

let courseLibrary = window.CHAINBOUND_COURSES ?? [];
let courseLibraryLoaded = false;
let courseLibraryError = null;

const fallbackHole = {
  id: "fallback-hole",
  courseId: "fallback",
  courseName: "Fallback Course",
  holeNumber: 1,
  name: "Deep Woods",
  par: 4,
  columns: 9,
  rows: 18,
  tee: { x: 4, y: 16 },
  basket: { x: 4, y: 2 },
  hazards: [],
  backgrounds: [],
  outOfBounds: []
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
  },
  cacti: {
    name: "CACTI",
    type: "Putter",
    image: "discs/Cacti_putter.png",
    speed: 2,
    glide: 1,
    turn: 0,
    fade: 1,
    putt: 10
  },
  tropical: {
    name: "TROPICAL",
    type: "Midrange",
    image: "discs/Tropical_mid.png",
    speed: 6,
    glide: 2,
    turn: -2,
    fade: 1,
    putt: 5
  },
  galactic: {
    name: "GALACTIC",
    type: "Driver",
    image: "discs/galactic_driver.png",
    speed: 9,
    glide: 2,
    turn: -1,
    fade: 1,
    putt: -10
  },
  tundra: {
    name: "TUNDRA",
    type: "Midrange",
    image: "discs/Tundra_mid.png",
    speed: 7,
    glide: 3,
    turn: 0,
    fade: 0,
    putt: 0
  },
  shell: {
    name: "SHELL",
    type: "Putter",
    image: "discs/shell_putter.png",
    speed: 4,
    glide: 2,
    turn: 0,
    fade: 2,
    putt: 5
  }
};

const throwCardEffects = {
  "power-down": {
    name: "Power Down",
    text: "-1 Speed.",
    speed: -1
  },
  hyzer: {
    name: "Hyzer",
    text: "+1 Fade.",
    fade: 1
  },
  anhyzer: {
    name: "Anhyzer",
    text: "-1 Turn.",
    turn: -1
  },
  smashed: {
    name: "Smashed",
    text: "+1 Speed.",
    speed: 1
  },
  layup: {
    name: "Layup",
    text: "Set Speed to 2 with 0 Turn and Fade.",
    speedSet: 2,
    turnSet: 0,
    fadeSet: 0
  },
  overhand: {
    name: "Overhand",
    text: "Height 4 for 3 squares. -2 Speed.",
    speed: -2,
    heightOverride: "overhand"
  },
  turnover: {
    name: "Turnover",
    text: "-2 Turn.",
    turn: -2
  },
  roller: {
    name: "Roller",
    text: "-1 Fade, -1 Turn, +1 Speed. Height 1.",
    speed: 1,
    turn: -1,
    fade: -1,
    heightOverride: "roller"
  },
  "clutch-up": {
    name: "Clutch Up",
    text: "+20% C1 putting.",
    putt: 20,
    puttCircle: "c1",
    puttOnly: true
  },
  "big-basket": {
    name: "Big Basket",
    text: "+20% C2 putting.",
    putt: 20,
    puttCircle: "c2",
    puttOnly: true
  },
  "absolute-smash": {
    name: "Absolute Smash",
    text: "+2 Speed, +1 Fade, -1 Turn.",
    speed: 2,
    fade: 1,
    turn: -1
  },
  hunting: {
    name: "Hunting",
    text: "+20% Throw-In.",
    throwIn: 20
  }
};

const playerStats = {
  c1: 50,
  c2: 20,
  throwIn: 10,
  scramble: 55,
  control: 3
};

const editorAssetTypes = {
  tee: { label: "Tee", asset: "course assets/teepad.png" },
  basket: { label: "Basket", asset: "basket_icon.png" },
  grass: { label: "Grass 1", asset: "course assets/grass1_bg.png", background: { type: "grass" } },
  grass2: { label: "Grass 2", asset: "course assets/grass2_bg.png", background: { type: "grass2" } },
  water: { label: "Water", asset: "course assets/water1_bg.png", background: { type: "water" } },
  ob: { label: "OB", asset: "course assets/OB.png", outOfBounds: true },
  tree1: { label: "Tree", asset: "course assets/tree1.png", hazard: { type: "tree", variant: 1, height: 3 } },
  tree2: { label: "Tree", asset: "course assets/tree2.png", hazard: { type: "tree", variant: 2, height: 3 } },
  tree3: { label: "Tree", asset: "course assets/tree3.png", hazard: { type: "tree", variant: 3, height: 3 } },
  tree4: { label: "Tree", asset: "course assets/tree4.png", hazard: { type: "tree", variant: 4, height: 3 } },
  tree5: { label: "Tree", asset: "course assets/tree5.png", hazard: { type: "tree", variant: 5, height: 3 } },
  rock1: { label: "Rock", asset: "course assets/rock1.png", hazard: { type: "rock", variant: 1, height: 1 } },
  rock2: { label: "Rock", asset: "course assets/rock2.png", hazard: { type: "rock", variant: 2, height: 1 } },
  stump1: { label: "Stump", asset: "course assets/stump1.png", hazard: { type: "stump", variant: 1, height: 1 } },
  shrub1: { label: "Shrub", asset: "course assets/shrub1.png", hazard: { type: "shrub", variant: 1, height: 2 } },
  erase: { label: "Erase" }
};

const startingDiscIds = ["cacti", "cacti", "comb", "comb", "comb", "palm", "palm"];
const startingThrowIds = ["hyzer", "anhyzer", "clutch-up"];
const startingDeck = buildStartingDeck();
let playerPoints = 5;
let playerDeck = startingDeck.map(cloneCard);
let spendOffers = null;
let pendingPurchase = null;

let selectedThrow = "backhand";
let selectedDiscId = null;
let selectedDiscInstanceId = null;
let selectedThrowCardId = null;
let selectedThrowCardInstanceId = null;
let selectedDirection = "up";
let drawDeck = [];
let discardPile = [];
let hand = [];
let hole = cloneHole(courseLibrary[0]?.holes?.[0] ?? fallbackHole);
let selectedCourse = courseLibrary[0] ?? { id: "fallback", name: "Fallback Course", holes: [fallbackHole] };
let selectedCourseHoleIndex = 0;
let courseScoreToPar = 0;
let isHoleScoreRecorded = false;
let isCourseRewardRecorded = false;
let pendingCoursePoints = 0;
let advancedCoursesUnlocked = false;
let currentDiscCell = { ...hole.tee };
let currentDiscImage = null;
let currentDiscName = "Disc";
let strokeNumber = 0;
let isThrowing = false;
let pendingPutt = null;
let isHoledOut = false;
let selectedEditorAsset = "tee";
let editorHole = {
  name: "New Hole",
  courseId: "",
  courseName: "",
  holeNumber: 1,
  par: 4,
  columns: 9,
  rows: 18,
  tee: null,
  basket: null,
  hazards: [],
  backgrounds: [],
  outOfBounds: []
};

function cloneHole(holeData) {
  return {
    ...holeData,
    tee: holeData.tee ? { ...holeData.tee } : null,
    basket: holeData.basket ? { ...holeData.basket } : null,
    hazards: (holeData.hazards ?? []).map((hazard) => ({ ...hazard })),
    backgrounds: (holeData.backgrounds ?? []).map((tile) => ({ ...tile })),
    outOfBounds: (holeData.outOfBounds ?? []).map((tile) => ({ ...tile }))
  };
}

function courseIdFromName(name) {
  return safeFileName(name || "new-course");
}

async function loadCourseLibrary() {
  if (courseLibraryLoaded) {
    return courseLibrary;
  }

  if (courseLibrary.length) {
    courseLibraryLoaded = true;
    return courseLibrary;
  }

  const fileEntries = window.CHAINBOUND_COURSE_FILES ?? [];
  if (!fileEntries.length) {
    courseLibraryLoaded = true;
    return courseLibrary;
  }

  try {
    const loadedHoles = await Promise.all(fileEntries.map(async (entry) => {
      const response = await fetch(entry.file);
      if (!response.ok) {
        throw new Error(`Could not load ${entry.file}`);
      }

      const holeData = normalizeLoadedHole(await response.json());
      const courseName = holeData.courseName || entry.courseName || "New Course";
      const courseId = holeData.courseId || entry.courseId || courseIdFromName(courseName);
      return {
        ...holeData,
        id: holeData.id ?? `${courseId}-${holeData.holeNumber}`,
        courseId,
        courseName,
        file: entry.file
      };
    }));

    const coursesById = new Map();
    loadedHoles.forEach((loadedHole) => {
      if (!coursesById.has(loadedHole.courseId)) {
        coursesById.set(loadedHole.courseId, {
          id: loadedHole.courseId,
          name: loadedHole.courseName,
          holes: []
        });
      }

      coursesById.get(loadedHole.courseId).holes.push(loadedHole);
    });

    courseLibrary = Array.from(coursesById.values()).map((course) => ({
      ...course,
      holes: course.holes.sort((a, b) => a.holeNumber - b.holeNumber)
    }));
    selectedCourse = courseLibrary[0] ?? selectedCourse;
    hole = cloneHole(selectedCourse.holes?.[0] ?? fallbackHole);
    courseLibraryError = null;
  } catch (error) {
    courseLibraryError = error.message;
  }

  courseLibraryLoaded = true;
  return courseLibrary;
}

function selectedDisc() {
  return discs[selectedDiscId];
}

function selectedDiscCard() {
  return hand.find((card) => card.instanceId === selectedDiscInstanceId) ?? null;
}

function selectedThrowCard() {
  return hand.find((card) => card.instanceId === selectedThrowCardInstanceId) ?? null;
}

function cloneCard(card) {
  return {
    ...card
  };
}

function buildCard(discId, throwId) {
  return {
    discId,
    throwId: throwId ?? null
  };
}

function buildStartingDeck() {
  const shuffledThrows = shuffledDeck([
    ...startingThrowIds.map((throwId) => ({ throwId })),
    ...Array(Math.max(0, startingDiscIds.length - startingThrowIds.length)).fill(null).map(() => ({ throwId: null }))
  ]).map((card) => card.throwId);
  return startingDiscIds.map((discId, index) => buildCard(discId, shuffledThrows[index] ?? null));
}

function randomCardOffer(index) {
  return {
    discId: randomSample(Object.keys(discs), 1)[0],
    throwId: randomSample(Object.keys(throwCardEffects), 1)[0],
    price: index === 0 ? 5 : 10,
    sold: false
  };
}

function modifiedDisc() {
  const disc = selectedDisc();
  const effect = selectedThrowCardId ? throwCardEffects[selectedThrowCardId] : {};
  const throwEffect = effect.puttOnly ? {} : effect;
  const modifiedSpeed = Math.max(1, throwEffect.speedSet ?? (disc.speed + (throwEffect.speed ?? 0)));

  return {
    ...disc,
    speed: modifiedSpeed,
    turn: throwEffect.turnSet ?? (disc.turn + (throwEffect.turn ?? 0)),
    fade: Math.max(0, throwEffect.fadeSet ?? (disc.fade + (throwEffect.fade ?? 0))),
    heightOverride: throwEffect.heightOverride ?? null
  };
}

function shuffledDeck(cards) {
  const deck = cards.map(cloneCard);

  for (let index = deck.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [deck[index], deck[swapIndex]] = [deck[swapIndex], deck[index]];
  }

  return deck;
}

function randomSample(items, count) {
  return shuffledDeck(items.map((item) => ({ value: item }))).slice(0, count).map((item) => item.value);
}

function generateSpendOffers() {
  spendOffers = {
    cards: [0, 1, 2].map((index) => randomCardOffer(index))
  };
}

function ensureSpendOffers() {
  if (!spendOffers) {
    generateSpendOffers();
  }
}

function resetDecksAndHand() {
  drawDeck = shuffledDeck(playerDeck);
  discardPile = [];
  hand = [];
  selectedDiscId = null;
  selectedDiscInstanceId = null;
  selectedThrowCardId = null;
  selectedThrowCardInstanceId = null;

  while (hand.length < currentHandLimit() && drawDeck.length > 0) {
    drawFromDeck();
  }
  selectFirstPlayableCards();
}

function currentHandLimit() {
  return playerStats.control;
}

function addCardToHand(card) {
  hand.push({
    instanceId: `${card.discId}-${card.throwId}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    discId: card.discId,
    throwId: card.throwId
  });
  selectFirstPlayableCards();
}

function drawFromDeck() {
  if (hand.length >= currentHandLimit()) {
    return false;
  }

  if (drawDeck.length === 0) {
    return false;
  }

  addCardToHand(drawDeck.shift());
  return true;
}

function drawCardOfType(cardType, options = {}) {
  if (!options.ignoreLimit && hand.length >= currentHandLimit()) {
    return false;
  }

  const cardIndex = drawDeck.findIndex((card) => cardType === "disc" ? Boolean(card.discId) : Boolean(card.throwId));
  if (cardIndex < 0) {
    return false;
  }

  const [card] = drawDeck.splice(cardIndex, 1);
  addCardToHand(card);
  return true;
}

function shuffleDiscardIntoDeck() {
  if (discardPile.length === 0) {
    return false;
  }

  drawDeck = [...drawDeck, ...shuffledDeck(discardPile)];
  discardPile = [];
  strokeNumber += 1;
  return true;
}

function appendLieNote(message) {
  setLieNote(lieNote.textContent ? `${lieNote.textContent} ${message}` : message);
}

function autoRefillHand() {
  if (isHoledOut) {
    return;
  }

  let shuffled = false;

  while (hand.length < currentHandLimit()) {
    if (drawDeck.length === 0) {
      if (!discardPile.length) {
        break;
      }

      shuffleDiscardIntoDeck();
      shuffled = true;
    }

    if (!drawFromDeck()) {
      break;
    }
  }

  if (!selectedDiscId && (hasDiscInDeck() || hasDiscInDiscard())) {
    if (!hasDiscInDeck() && hasDiscInDiscard()) {
      shuffleDiscardIntoDeck();
      shuffled = true;
    }

    if (hand.length >= currentHandLimit()) {
      strokeNumber += 1;
      appendLieNote("No disc in hand. Penalty stroke taken to draw the next disc.");
    }

    drawCardOfType("disc", { ignoreLimit: true });
  }

  if (shuffled) {
    appendLieNote("Discard was shuffled into the deck for 1 stroke.");
  }
}

function selectFirstPlayableCards() {
  const selectedDiscCard = hand.find((card) => card.instanceId === selectedDiscInstanceId);
  if (selectedDiscCard) {
    selectedDiscId = selectedDiscCard.discId;
  } else {
    const firstDisc = hand.find((card) => card.discId);
    selectedDiscInstanceId = firstDisc?.instanceId ?? null;
    selectedDiscId = firstDisc?.discId ?? null;
  }

  const selectedThrowCard = hand.find((card) => card.instanceId === selectedThrowCardInstanceId && card.instanceId !== selectedDiscInstanceId);
  if (selectedThrowCard) {
    selectedThrowCardId = selectedThrowCard.throwId;
  } else {
    selectedThrowCardInstanceId = null;
    selectedThrowCardId = null;
  }
}

function discardCard(instanceId) {
  const index = hand.findIndex((card) => card.instanceId === instanceId);

  if (index >= 0) {
    const [card] = hand.splice(index, 1);
    discardPile.push(cloneCard(card));
  }
}

function discardSelectedDisc() {
  discardCard(selectedDiscInstanceId);
  selectFirstPlayableCards();
}

function needsDraw() {
  return false;
}

function needsShuffleDiscard() {
  return false;
}

function canAct() {
  return Boolean(selectedDiscId);
}

function hasDiscInDeck() {
  return drawDeck.some((card) => card.discId);
}

function hasDiscInDiscard() {
  return discardPile.some((card) => card.discId);
}

function discCountInDeck() {
  return drawDeck.filter((card) => card.discId).length;
}

function scrollCourseToCell(cell) {
  window.requestAnimationFrame(() => {
    const cellElement = courseGrid.querySelector(`[data-x="${cell.x}"][data-y="${cell.y}"]`);
    if (!cellElement) {
      return;
    }

    const viewportWidth = courseViewport.clientWidth;
    const viewportHeight = courseViewport.clientHeight;
    courseViewport.scrollLeft = cellElement.offsetLeft - (viewportWidth / 2) + (cellElement.offsetWidth / 2);
    courseViewport.scrollTop = cellElement.offsetTop - (viewportHeight * 0.72) + (cellElement.offsetHeight / 2);
  });
}

function initializeDragPanning(viewport, options = {}) {
  let isPanning = false;
  let startX = 0;
  let startY = 0;
  let startScrollLeft = 0;
  let startScrollTop = 0;

  viewport.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || (options.ignoreSelector && event.target.closest(options.ignoreSelector))) {
      return;
    }

    isPanning = true;
    startX = event.clientX;
    startY = event.clientY;
    startScrollLeft = viewport.scrollLeft;
    startScrollTop = viewport.scrollTop;
    viewport.classList.add("dragging");
    viewport.setPointerCapture(event.pointerId);
  });

  viewport.addEventListener("pointermove", (event) => {
    if (!isPanning) {
      return;
    }

    event.preventDefault();
    if (Math.abs(event.clientX - startX) > 4 || Math.abs(event.clientY - startY) > 4) {
      viewport.dataset.dragged = "true";
    }
    viewport.scrollLeft = startScrollLeft - (event.clientX - startX);
    viewport.scrollTop = startScrollTop - (event.clientY - startY);
  });

  const stopPanning = (event) => {
    if (!isPanning) {
      return;
    }

    isPanning = false;
    viewport.classList.remove("dragging");
    if (viewport.hasPointerCapture(event.pointerId)) {
      viewport.releasePointerCapture(event.pointerId);
    }
    window.setTimeout(() => {
      viewport.dataset.dragged = "false";
    }, 0);
  };

  viewport.addEventListener("pointerup", stopPanning);
  viewport.addEventListener("pointercancel", stopPanning);
  viewport.addEventListener("pointerleave", stopPanning);
}

function sameCell(a, b) {
  return a.x === b.x && a.y === b.y;
}

function gridDistance(a, b) {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

function canPitch() {
  return selectedThrow === "pitch" && Boolean(selectedDiscId) && !pendingPutt && !isThrowing && !isHoledOut;
}

function isPitchTargetCell(x, y) {
  return canPitch() && !sameCell(currentDiscCell, { x, y }) && gridDistance(currentDiscCell, { x, y }) === 1;
}

function hazardForCell(x, y) {
  return hole.hazards.find((hazard) => hazard.x === x && hazard.y === y);
}

function backgroundForCell(x, y, holeData = hole) {
  return holeData.backgrounds?.find((tile) => tile.x === x && tile.y === y);
}

function backgroundImageForCell(x, y, holeData = hole) {
  const tile = backgroundForCell(x, y, holeData);
  if (tile?.type === "water") {
    return 'url("course assets/water1_bg.png")';
  }

  if (tile?.type === "grass2") {
    return 'url("course assets/grass2_bg.png")';
  }

  return 'url("course assets/grass1_bg.png")';
}

function isOutOfBoundsCell(x, y, holeData = hole) {
  if (x < 0 || x >= holeData.columns || y < 0 || y >= holeData.rows) {
    return true;
  }

  return Boolean(holeData.outOfBounds?.some((tile) => tile.x === x && tile.y === y));
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
      height: flightHeight(step, speed, disc.glide, disc.heightOverride)
    });
  }

  return path;
}

function effectiveSpeed(disc, origin = currentDiscCell) {
  return Math.max(1, disc.speed - (hazardForCell(origin.x, origin.y) ? 1 : 0));
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

function flightHeight(step, speed, glide, heightOverride = null) {
  if (heightOverride === "roller") {
    return 1;
  }

  if (heightOverride === "overhand" && step <= 3) {
    return 4;
  }

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

function obstructionForHazard(hazard) {
  if (!hazard) {
    return 0;
  }

  if (hazard.type === "tree") {
    return 70;
  }

  if (hazard.type === "rock" || hazard.type === "stump" || hazard.type === "shrub") {
    return 100;
  }

  if (hazard.type === "shrub") {
    return 50;
  }

  return 100;
}

function fightThroughChance(hazard) {
  return Math.max(0, 100 - obstructionForHazard(hazard));
}

function firstPotentialCollision(path) {
  return path.find((step) => isCollision(step, hazardForCell(step.x, step.y)));
}

function resolveCollision(path) {
  const fights = [];

  for (const step of path) {
    const hazard = hazardForCell(step.x, step.y);
    if (!isCollision(step, hazard)) {
      continue;
    }

    const obstruction = obstructionForHazard(hazard);
    if (percentRoll(obstruction)) {
      return { collision: step, hazard, fights };
    }

    fights.push({ step, hazard });
  }

  return { collision: null, hazard: null, fights };
}

function lastValidInPath(path, fallback = currentDiscCell) {
  for (let index = path.length - 1; index >= 0; index -= 1) {
    const step = path[index];
    if (!isOutOfBoundsCell(step.x, step.y)) {
      return { ...step };
    }
  }

  return { ...fallback };
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

function randomScrambleKick(origin) {
  const candidates = [
    { x: origin.x, y: origin.y - 1 },
    { x: origin.x, y: origin.y + 1 },
    { x: origin.x - 1, y: origin.y },
    { x: origin.x + 1, y: origin.y }
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

function tooltipMarkup(text) {
  const [label = "", height = "", through = ""] = text.split("|").map((part) => part.trim());
  return `
    <strong>${label}</strong>
    <span>${height}</span>
    <span>${through}</span>
  `;
}

function positionObstacleTooltip(event) {
  const offset = 14;
  obstacleTooltip.style.left = `${event.clientX + offset}px`;
  obstacleTooltip.style.top = `${event.clientY + offset}px`;
}

function showObstacleTooltip(cell, event) {
  obstacleTooltip.innerHTML = tooltipMarkup(cell.dataset.tooltip);
  obstacleTooltip.hidden = false;
  positionObstacleTooltip(event);
}

function hideObstacleTooltip() {
  obstacleTooltip.hidden = true;
}

function initializeObstacleTooltips(grid) {
  grid.addEventListener("pointermove", (event) => {
    const cell = event.target.closest("[data-tooltip]");
    if (!cell || !grid.contains(cell)) {
      hideObstacleTooltip();
      return;
    }

    showObstacleTooltip(cell, event);
  });

  grid.addEventListener("pointerleave", hideObstacleTooltip);
}

function hazardAssetPath(hazard) {
  if (hazard?.type === "tree") {
    return `course assets/tree${hazard.variant ?? 1}.png`;
  }

  if (hazard?.type === "rock") {
    return `course assets/rock${hazard.variant ?? 1}.png`;
  }

  if (hazard?.type === "stump") {
    return `course assets/stump${hazard.variant ?? 1}.png`;
  }

  if (hazard?.type === "shrub") {
    return `course assets/shrub${hazard.variant ?? 1}.png`;
  }

  return null;
}

function hazardLabel(hazard) {
  return hazard?.type ? hazard.type.charAt(0).toUpperCase() + hazard.type.slice(1) : "Obstacle";
}

function renderCourse(lockedFlightPath = null) {
  courseGrid.style.setProperty("--columns", hole.columns);
  courseGrid.style.setProperty("--rows", hole.rows);
  courseGrid.innerHTML = "";
  const flightPath = pendingPutt || !selectedDiscId || selectedThrow === "pitch" ? [] : (lockedFlightPath ?? getThrowPath(selectedThrow));

  for (let y = 0; y < hole.rows; y += 1) {
    for (let x = 0; x < hole.columns; x += 1) {
      const cell = document.createElement("div");
      const hazard = hazardForCell(x, y);
      const isTee = Boolean(hole.tee && sameCell(hole.tee, { x, y }));
      const isBasket = Boolean(hole.basket && sameCell(hole.basket, { x, y }));
      const flightStep = flightStepForCell(flightPath, x, y);
      const isFlight = Boolean(flightStep);
      const collision = Boolean(flightStep && firstPotentialCollision([flightStep]));
      const hasDisc = sameCell(currentDiscCell, { x, y });

      cell.className = "course-cell";
      cell.dataset.x = x;
      cell.dataset.y = y;
      cell.style.backgroundImage = backgroundImageForCell(x, y);

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

      if (hazard) {
        const assetPath = hazardAssetPath(hazard);
        cell.classList.add("hazard-cell");
        cell.dataset.obstacleHeight = hazard.height;
        cell.dataset.obstruction = obstructionForHazard(hazard);
        cell.dataset.tooltip = `${hazardLabel(hazard)} | Height ${hazard.height} | ${fightThroughChance(hazard)}% through`;
        if (assetPath) {
          cell.append(makeAsset(assetPath, hazardLabel(hazard)));
        }
      }

      if (isBasket) {
        cell.classList.add("basket-cell");
        if (pendingPutt) {
          cell.classList.add("putt-target-cell");
        }
        cell.append(makeAsset("basket_icon.png", "Basket"));
      }

      if (hasDisc) {
        cell.append(makeAsset(currentDiscImage ?? selectedDisc()?.image ?? "basket_icon.png", `${currentDiscName} disc`));
        cell.lastElementChild.classList.add("disc-token");
      }

      if (isPitchTargetCell(x, y)) {
        cell.classList.add("pitch-target-cell");
        cell.addEventListener("pointerdown", (event) => {
          event.preventDefault();
          event.stopPropagation();
          pitchToCell({ x, y });
        });
        cell.addEventListener("click", () => pitchToCell({ x, y }));
      }

      courseGrid.append(cell);
    }
  }
}

function setEditorNote(message) {
  editorNote.hidden = !message;
  editorNote.textContent = message ?? "";
}

function populateEditorCourseSelect() {
  editorCourseSelect.innerHTML = "";
  const courseOptions = availableCourseOptions();

  courseOptions.forEach((course) => {
    const option = document.createElement("option");
    option.value = course.id;
    option.textContent = course.name;
    editorCourseSelect.append(option);
  });

  const newOption = document.createElement("option");
  newOption.value = "__new__";
  newOption.textContent = "New Course";
  editorCourseSelect.append(newOption);

  if (editorHole.courseId && courseOptions.some((course) => course.id === editorHole.courseId)) {
    editorCourseSelect.value = editorHole.courseId;
  } else {
    editorCourseSelect.value = "__new__";
  }
}

function availableCourseOptions() {
  const coursesById = new Map();

  courseLibrary.forEach((course) => {
    coursesById.set(course.id, { id: course.id, name: course.name });
  });

  (window.CHAINBOUND_COURSE_FILES ?? []).forEach((entry) => {
    if (!coursesById.has(entry.courseId)) {
      coursesById.set(entry.courseId, { id: entry.courseId, name: entry.courseName });
    }
  });

  return Array.from(coursesById.values()).filter((course) => course.id && course.name);
}

async function refreshCourseLibrary() {
  courseLibraryLoaded = false;
  await loadCourseLibrary();
  populateEditorCourseSelect();
  renderCourseSelector();
}

function editorHazardForCell(x, y) {
  return editorHole.hazards.find((hazard) => hazard.x === x && hazard.y === y);
}

function removeEditorHazard(x, y) {
  editorHole.hazards = editorHole.hazards.filter((hazard) => hazard.x !== x || hazard.y !== y);
}

function setEditorBackground(x, y, type) {
  editorHole.backgrounds = editorHole.backgrounds.filter((tile) => tile.x !== x || tile.y !== y);
  if (type !== "grass") {
    editorHole.backgrounds.push({ type, x, y });
  }
}

function removeEditorOutOfBounds(x, y) {
  editorHole.outOfBounds = editorHole.outOfBounds.filter((tile) => tile.x !== x || tile.y !== y);
}

function setEditorOutOfBounds(x, y) {
  removeEditorOutOfBounds(x, y);
  editorHole.outOfBounds.push({ x, y });
}

function clampEditorPoint(point) {
  if (!point) {
    return null;
  }

  return {
    x: Math.min(Math.max(point.x, 0), editorHole.columns - 1),
    y: Math.min(Math.max(point.y, 0), editorHole.rows - 1)
  };
}

function syncEditorInputs() {
  editorHoleNameInput.value = editorHole.name;
  populateEditorCourseSelect();
  editorNewCourseInput.value = editorHole.courseId && !availableCourseOptions().some((course) => course.id === editorHole.courseId) ? editorHole.courseName : "";
  editorHoleNumberInput.value = editorHole.holeNumber;
  editorHoleParInput.value = editorHole.par;
  editorHoleColumnsInput.value = editorHole.columns;
  editorHoleRowsInput.value = editorHole.rows;
}

function renderEditorGrid() {
  editorGrid.style.setProperty("--columns", editorHole.columns);
  editorGrid.style.setProperty("--rows", editorHole.rows);
  editorGrid.innerHTML = "";

  for (let y = 0; y < editorHole.rows; y += 1) {
    for (let x = 0; x < editorHole.columns; x += 1) {
      const cell = document.createElement("button");
      const hazard = editorHazardForCell(x, y);
      const isTee = Boolean(editorHole.tee && sameCell(editorHole.tee, { x, y }));
      const isBasket = Boolean(editorHole.basket && sameCell(editorHole.basket, { x, y }));

      cell.type = "button";
      cell.className = "course-cell editor-cell";
      cell.dataset.x = x;
      cell.dataset.y = y;
      cell.style.backgroundImage = backgroundImageForCell(x, y, editorHole);
      cell.setAttribute("aria-label", `Column ${x + 1}, row ${y + 1}`);

      if (isOutOfBoundsCell(x, y, editorHole)) {
        cell.classList.add("ob-cell");
        cell.append(makeAsset("course assets/OB.png", "Out of bounds"));
      }

      if (hazard) {
        const assetPath = hazardAssetPath(hazard);
        cell.classList.add("hazard-cell");
        cell.dataset.obstacleHeight = hazard.height;
        cell.dataset.obstruction = obstructionForHazard(hazard);
        cell.dataset.tooltip = `${hazardLabel(hazard)} | Height ${hazard.height} | ${fightThroughChance(hazard)}% through`;
        if (assetPath) {
          cell.append(makeAsset(assetPath, hazardLabel(hazard)));
        }
      }

      if (isTee) {
        cell.classList.add("tee-cell");
        cell.append(makeAsset("course assets/teepad.png", "Teepad"));
      }

      if (isBasket) {
        cell.classList.add("basket-cell");
        cell.append(makeAsset("basket_icon.png", "Basket"));
      }

      cell.addEventListener("click", () => placeEditorAsset(x, y));
      editorGrid.append(cell);
    }
  }
}

function placeEditorAsset(x, y) {
  if (editorViewport.dataset.dragged === "true") {
    return;
  }

  if (selectedEditorAsset === "tee") {
    editorHole.tee = { x, y };
    if (editorHole.basket && sameCell(editorHole.basket, { x, y })) {
      editorHole.basket = null;
    }
    removeEditorHazard(x, y);
  } else if (selectedEditorAsset === "basket") {
    editorHole.basket = { x, y };
    if (editorHole.tee && sameCell(editorHole.tee, { x, y })) {
      editorHole.tee = null;
    }
    removeEditorHazard(x, y);
  } else if (selectedEditorAsset === "erase") {
    removeEditorHazard(x, y);
    setEditorBackground(x, y, "grass");
    removeEditorOutOfBounds(x, y);
    if (editorHole.tee && sameCell(editorHole.tee, { x, y })) {
      editorHole.tee = null;
    }
    if (editorHole.basket && sameCell(editorHole.basket, { x, y })) {
      editorHole.basket = null;
    }
  } else {
    const asset = editorAssetTypes[selectedEditorAsset];
    if (asset.background) {
      setEditorBackground(x, y, asset.background.type);
    } else if (asset.outOfBounds) {
      setEditorOutOfBounds(x, y);
    } else {
      removeEditorHazard(x, y);
      const isReservedCell = (editorHole.tee && sameCell(editorHole.tee, { x, y })) || (editorHole.basket && sameCell(editorHole.basket, { x, y }));
      if (!isReservedCell) {
        editorHole.hazards.push({ ...asset.hazard, x, y });
      }
    }
  }

  renderEditorGrid();
}

function selectEditorAsset(assetId) {
  selectedEditorAsset = assetId;
  assetButtons.forEach((button) => {
    const isSelected = button.dataset.editorAsset === assetId;
    button.classList.toggle("active", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  });
}

function updateEditorDimensions() {
  const selectedCourseOption = editorCourseSelect.value;
  const newCourseName = editorNewCourseInput.value.trim();
  const libraryCourse = availableCourseOptions().find((course) => course.id === selectedCourseOption);
  const courseName = selectedCourseOption === "__new__" ? (newCourseName || "New Course") : libraryCourse?.name ?? "New Course";

  editorHole.courseName = courseName;
  editorHole.courseId = selectedCourseOption === "__new__" ? courseIdFromName(courseName) : libraryCourse?.id ?? courseIdFromName(courseName);
  editorHole.holeNumber = Math.min(Math.max(Number(editorHoleNumberInput.value) || 1, 1), 36);
  editorHole.columns = Math.min(Math.max(Number(editorHoleColumnsInput.value) || 9, 5), 24);
  editorHole.rows = Math.min(Math.max(Number(editorHoleRowsInput.value) || 18, 5), 30);
  editorHole.par = Math.min(Math.max(Number(editorHoleParInput.value) || 4, 1), 9);
  editorHole.name = editorHoleNameInput.value.trim() || "New Hole";
  editorHole.tee = clampEditorPoint(editorHole.tee);
  editorHole.basket = clampEditorPoint(editorHole.basket);
  editorHole.hazards = editorHole.hazards
    .map((hazard) => ({ ...hazard, ...clampEditorPoint(hazard) }))
    .filter((hazard, index, hazards) => hazards.findIndex((other) => other.x === hazard.x && other.y === hazard.y) === index);
  editorHole.backgrounds = editorHole.backgrounds
    .map((tile) => ({ ...tile, ...clampEditorPoint(tile) }))
    .filter((tile, index, tiles) => tile.type !== "grass" && tiles.findIndex((other) => other.x === tile.x && other.y === tile.y) === index);
  editorHole.outOfBounds = editorHole.outOfBounds
    .map((tile) => clampEditorPoint(tile))
    .filter((tile, index, tiles) => tiles.findIndex((other) => other.x === tile.x && other.y === tile.y) === index);
  syncEditorInputs();
  renderEditorGrid();
}

function editorHoleJson() {
  updateEditorDimensions();
  return {
    name: editorHole.name,
    courseId: editorHole.courseId,
    courseName: editorHole.courseName,
    holeNumber: editorHole.holeNumber,
    par: editorHole.par,
    columns: editorHole.columns,
    rows: editorHole.rows,
    tee: editorHole.tee,
    basket: editorHole.basket,
    hazards: editorHole.hazards,
    backgrounds: editorHole.backgrounds,
    outOfBounds: editorHole.outOfBounds
  };
}

function safeFileName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "chainbound-hole";
}

function saveEditorHole() {
  const holeData = editorHoleJson();
  const blob = new Blob([JSON.stringify(holeData, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${safeFileName(holeData.courseName)}-hole-${holeData.holeNumber}-${safeFileName(holeData.name)}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
  setEditorNote(`Saved ${holeData.courseName}, hole ${holeData.holeNumber}: ${holeData.name}. Put preset files in games/chainbound/courses/.`);
}

function normalizeLoadedHole(data) {
  return {
    name: typeof data.name === "string" ? data.name : "Loaded Hole",
    courseId: typeof data.courseId === "string" ? data.courseId : "",
    courseName: typeof data.courseName === "string" ? data.courseName : "",
    holeNumber: Math.min(Math.max(Number(data.holeNumber) || 1, 1), 36),
    par: Math.min(Math.max(Number(data.par) || 4, 1), 9),
    columns: Math.min(Math.max(Number(data.columns) || 9, 5), 24),
    rows: Math.min(Math.max(Number(data.rows) || 18, 5), 30),
    tee: data.tee && Number.isInteger(data.tee.x) && Number.isInteger(data.tee.y) ? data.tee : null,
    basket: data.basket && Number.isInteger(data.basket.x) && Number.isInteger(data.basket.y) ? data.basket : null,
    hazards: Array.isArray(data.hazards)
      ? data.hazards
        .filter((hazard) => Number.isInteger(hazard.x) && Number.isInteger(hazard.y) && ["tree", "rock", "stump", "shrub"].includes(hazard.type))
        .map((hazard) => ({
          ...hazard,
          height: hazard.type === "tree" ? 3 : hazard.type === "shrub" ? 2 : 1
        }))
      : [],
    backgrounds: [
      ...(Array.isArray(data.backgrounds)
        ? data.backgrounds.filter((tile) => Number.isInteger(tile.x) && Number.isInteger(tile.y) && ["water", "grass2"].includes(tile.type))
        : []),
      ...(Array.isArray(data.hazards)
        ? data.hazards.filter((hazard) => hazard.type === "water" && Number.isInteger(hazard.x) && Number.isInteger(hazard.y)).map((hazard) => ({ type: "water", x: hazard.x, y: hazard.y }))
        : [])
    ],
    outOfBounds: Array.isArray(data.outOfBounds)
      ? data.outOfBounds.filter((tile) => Number.isInteger(tile.x) && Number.isInteger(tile.y)).map((tile) => ({ x: tile.x, y: tile.y }))
      : []
  };
}

function loadEditorHole(file) {
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      editorHole = normalizeLoadedHole(JSON.parse(reader.result));
      editorHole.tee = clampEditorPoint(editorHole.tee);
      editorHole.basket = clampEditorPoint(editorHole.basket);
      editorHole.hazards = editorHole.hazards.map((hazard) => ({ ...hazard, ...clampEditorPoint(hazard) }));
      editorHole.backgrounds = editorHole.backgrounds.map((tile) => ({ ...tile, ...clampEditorPoint(tile) }));
      editorHole.outOfBounds = editorHole.outOfBounds.map((tile) => clampEditorPoint(tile));
      syncEditorInputs();
      renderEditorGrid();
      setEditorNote(`Loaded ${editorHole.name}.`);
    } catch {
      setEditorNote("Could not load that JSON file.");
    }
  });
  reader.readAsText(file);
}

function updateThrowControls() {
  const isBackhand = selectedThrow === "backhand";
  const isForehand = selectedThrow === "forehand";
  const isPitch = selectedThrow === "pitch";
  const controlsLocked = isThrowing || needsDraw() || isHoledOut;
  const pitchLocked = controlsLocked || Boolean(pendingPutt);
  backhandButton.classList.toggle("active", isBackhand);
  forehandButton.classList.toggle("active", isForehand);
  pitchButton.classList.toggle("active", isPitch);
  backhandButton.setAttribute("aria-pressed", String(isBackhand));
  forehandButton.setAttribute("aria-pressed", String(isForehand));
  pitchButton.setAttribute("aria-pressed", String(isPitch));
  backhandButton.disabled = controlsLocked;
  forehandButton.disabled = controlsLocked;
  pitchButton.disabled = pitchLocked;
  updateDirectionControls();
  renderHand();
  renderSelectedCard();
  renderSelectedThrowCard();
  strokeCounter.textContent = `Strokes ${strokeNumber}`;
  updatePlayerStats();
  throwInStat.textContent = `${playerStats.throwIn}%`;
  scrambleStat.textContent = `${playerStats.scramble}%`;
  controlStat.textContent = playerStats.control;
  updateActionButton();
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
  const card = selectedDiscCard();
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
      <img src="${discs[selectedThrowCard()?.discId]?.image ?? "basket_icon.png"}" alt="">
      <span>${card.name}</span>
      <small>${card.text}</small>
    </div>
  `;
}

function renderHand() {
  handCardList.innerHTML = "";
  deckCountLabel.textContent = drawDeck.length;
  discardCountLabel.textContent = discardPile.length;

  hand.forEach((card) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.instanceId = card.instanceId;
    const disc = discs[card.discId];
    const throwCard = card.throwId ? throwCardEffects[card.throwId] : null;
    const puttLabel = disc.putt > 0 ? `+${disc.putt}` : `${disc.putt}`;
    const isDiscSelected = card.instanceId === selectedDiscInstanceId;
    const isThrowSelected = card.instanceId === selectedThrowCardInstanceId;
    const isPlayablePuttCard = Boolean(pendingPutt && throwCard?.putt && (!throwCard.puttCircle || throwCard.puttCircle === pendingPutt.circle));
    const isDisabledThrowCard = isThrowing || needsDraw() || needsShuffleDiscard() || isHoledOut || !throwCard || card.instanceId === selectedDiscInstanceId || (Boolean(pendingPutt) && !isPlayablePuttCard) || (throwCard.puttOnly && !pendingPutt);
    button.className = "disc-card combo-card";
    button.classList.toggle("selected", isDiscSelected);
    button.classList.toggle("throw-selected", isThrowSelected);
    button.dataset.discId = card.discId;
    button.dataset.throwCardId = card.throwId;
    button.setAttribute("aria-pressed", String(isDiscSelected || isThrowSelected));
    button.innerHTML = `
      <span class="disc-preview-title">
        <img src="${disc.image}" alt="">
        <span class="disc-preview-name">${disc.name}</span>
      </span>
      <span class="disc-preview-stats">${disc.speed} / ${disc.glide} / ${disc.turn} / ${disc.fade} / ${puttLabel}</span>
      <span class="combo-throw-line">${throwCard ? `${throwCard.name}: ${throwCard.text}` : "No Throw Modifier"}</span>
      <span class="combo-card-actions">
        <span class="combo-action ${isDiscSelected ? "active" : ""}">Disc</span>
        <span class="combo-action ${isThrowSelected ? "active" : ""}">Throw</span>
      </span>
    `;
    button.addEventListener("click", () => selectDisc(card.instanceId));
    button.querySelector(".combo-card-actions").addEventListener("click", (event) => {
      event.stopPropagation();
      if (event.target.closest(".combo-action:last-child")) {
        selectThrowCard(card.instanceId);
      } else {
        selectDisc(card.instanceId);
      }
    });
    button.disabled = isThrowing || ((needsDraw() || needsShuffleDiscard()) && !isHoledOut);
    if (isDisabledThrowCard) {
      button.dataset.throwDisabled = "true";
    }
    handCardList.append(button);
  });
}

function updateDirectionControls() {
  directionButtons.forEach((button) => {
    const isSelected = button.dataset.direction === selectedDirection;
    button.classList.toggle("active", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
    button.disabled = isThrowing || needsDraw() || needsShuffleDiscard() || Boolean(pendingPutt) || selectedThrow === "pitch" || isHoledOut;
  });
}

function updatePlayerStats() {
  const c1Total = puttChance("c1");
  const c2Total = puttChance("c2");

  c1Stat.textContent = pendingPutt?.circle === "c1" ? `${c1Total}%` : `${playerStats.c1}%`;
  c2Stat.textContent = pendingPutt?.circle === "c2" ? `${c2Total}%` : `${playerStats.c2}%`;
  c1Stat.parentElement.classList.toggle("modified-stat", pendingPutt?.circle === "c1");
  c2Stat.parentElement.classList.toggle("modified-stat", pendingPutt?.circle === "c2");
  c1Stat.parentElement.title = pendingPutt?.circle === "c1" && selectedDisc() ? puttModifierText() : "";
  c2Stat.parentElement.title = pendingPutt?.circle === "c2" && selectedDisc() ? puttModifierText() : "";
}

function courseScoreText(scoreToPar) {
  if (scoreToPar === 0) {
    return "Course E";
  }

  return `Course ${scoreToPar > 0 ? "+" : ""}${scoreToPar}`;
}

function updateCourseScoreDisplay() {
  courseScoreLabel.textContent = courseScoreText(courseScoreToPar);
  courseScoreLabel.classList.remove("score-under", "score-even", "score-over");
  courseScoreLabel.classList.add(courseScoreToPar < 0 ? "score-under" : courseScoreToPar === 0 ? "score-even" : "score-over");
}

function selectThrow(type) {
  if (isThrowing || needsDraw() || needsShuffleDiscard() || selectedThrow === type) {
    return;
  }
  if (type === "pitch" && pendingPutt) {
    return;
  }

  selectedThrow = type;
  updateThrowControls();
  renderCourse();
}

function selectDisc(instanceId) {
  if (isThrowing || needsDraw() || needsShuffleDiscard() || selectedDiscInstanceId === instanceId) {
    return;
  }

  const card = hand.find((handCard) => handCard.instanceId === instanceId);
  if (!card) {
    return;
  }

  selectedDiscInstanceId = card.instanceId;
  selectedDiscId = card.discId;
  if (selectedThrowCardInstanceId === card.instanceId) {
    selectedThrowCardInstanceId = null;
    selectedThrowCardId = null;
  }
  updateThrowControls();
  renderCourse();
}

function selectThrowCard(instanceId) {
  if (isThrowing || needsDraw() || needsShuffleDiscard()) {
    return;
  }

  if (selectedThrowCardInstanceId === instanceId) {
    selectedThrowCardInstanceId = null;
    selectedThrowCardId = null;
  } else {
    const card = hand.find((handCard) => handCard.instanceId === instanceId);
    if (!card || card.instanceId === selectedDiscInstanceId) {
      return;
    }

    const throwCard = card.throwId ? throwCardEffects[card.throwId] : null;
    if (!throwCard) {
      return;
    }
    if (pendingPutt && (!throwCard.putt || (throwCard.puttCircle && throwCard.puttCircle !== pendingPutt.circle))) {
      return;
    }
    if (!pendingPutt && throwCard.puttOnly) {
      return;
    }

    selectedThrowCardInstanceId = card.instanceId;
    selectedThrowCardId = card.throwId;
  }
  updateThrowControls();
  renderCourse();
}

function selectDirection(direction) {
  if (isThrowing || needsDraw() || needsShuffleDiscard() || pendingPutt || selectedDirection === direction) {
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

  if (selectedThrow === "pitch") {
    throwButton.textContent = "Select Pitch Target";
    throwButton.disabled = true;
    return;
  }

  throwButton.textContent = "Throw";
  throwButton.disabled = false;
}

function finishPlayedThrow() {
  discardSelectedDisc();
  if (selectedThrowCardId) {
    discardCard(selectedThrowCardInstanceId);
  }
  selectedThrowCardInstanceId = null;
  selectedThrowCardId = null;
  autoRefillHand();
  updateThrowControls();
  renderCourse();
  throwButton.focus();
}

function pitchToCell(cell) {
  if (!isPitchTargetCell(cell.x, cell.y)) {
    return;
  }

  const thrownDisc = selectedDisc();
  const originalCell = { ...currentDiscCell };
  currentDiscImage = thrownDisc.image;
  currentDiscName = thrownDisc.name;
  currentDiscCell = { ...cell };
  strokeNumber += 1;

  if (isOutOfBoundsCell(currentDiscCell.x, currentDiscCell.y)) {
    strokeNumber += 1;
    currentDiscCell = { ...lastValidInPath([{ ...cell }], originalCell) };
    setLieNote("Out of bounds. Take a penalty stroke and play from the last valid square.");
    resolveLanding(currentDiscCell);
    if (lieNote.textContent) {
      setLieNote(`Out of bounds. Take a penalty stroke and play from the last valid square. ${lieNote.textContent}`);
    }
  } else {
    resolveLanding(currentDiscCell);
  }

  finishPlayedThrow();
}

function completeHole() {
  isHoledOut = true;
  if (!isHoleScoreRecorded) {
    courseScoreToPar += strokeNumber - hole.par;
    isHoleScoreRecorded = true;
    updateCourseScoreDisplay();
  }

  const hasNextHole = selectedCourseHoleIndex < (selectedCourse.holes?.length ?? 0) - 1;
  if (!hasNextHole && !isCourseRewardRecorded) {
    pendingCoursePoints = courseRewardPoints(courseScoreToPar);
    playerPoints += pendingCoursePoints;
    if (selectedCourse.id === "pitch-and-putt" && courseScoreToPar <= 0) {
      advancedCoursesUnlocked = true;
    }
    generateSpendOffers();
    isCourseRewardRecorded = true;
  }

  showHoleCompleteModal();
}

function courseRewardPoints(scoreToPar, courseId = selectedCourse.id) {
  const rewards = courseId === "pitch-and-putt"
    ? { under: 15, even: 10, mid: 8, high: 5, rough: 3 }
    : { under: 30, even: 20, mid: 15, high: 10, rough: 5 };

  if (scoreToPar < 0) {
    return rewards.under;
  }

  if (scoreToPar <= 3) {
    return rewards.even;
  }

  if (scoreToPar <= 6) {
    return rewards.mid;
  }

  if (scoreToPar <= 9) {
    return rewards.high;
  }

  return rewards.rough;
}

function scoreLabel(scoreToPar) {
  if (scoreToPar === 0) {
    return "Even Par";
  }

  return scoreToPar > 0 ? `+${scoreToPar} Over Par` : `${scoreToPar} Under Par`;
}

function showHoleCompleteModal() {
  const scoreToPar = strokeNumber - hole.par;
  const hasNextHole = selectedCourseHoleIndex < (selectedCourse.holes?.length ?? 0) - 1;
  scoreResult.textContent = scoreLabel(scoreToPar);
  scoreResult.classList.remove("score-under", "score-even", "score-over");
  scoreResult.classList.add(scoreToPar < 0 ? "score-under" : scoreToPar === 0 ? "score-even" : "score-over");
  coursePointsResult.hidden = hasNextHole;
  coursePointsResult.innerHTML = hasNextHole ? "" : `${courseScoreText(courseScoreToPar)}. Earned <span class="point-value"><img src="player_points.png" alt=""> <strong>${pendingCoursePoints}</strong></span> Player Points.`;
  closeHoleModalButton.textContent = hasNextHole ? "Next Hole" : "Finish Course";
  holeCompleteModal.hidden = false;
  closeHoleModalButton.focus();
}

function closeHoleCompleteModal() {
  holeCompleteModal.hidden = true;
  if (selectedCourseHoleIndex < (selectedCourse.holes?.length ?? 0) - 1) {
    const courseIndex = Math.max(0, courseLibrary.findIndex((course) => course.id === selectedCourse.id));
    showRound(courseIndex, selectedCourseHoleIndex + 1);
    return;
  }

  showPlayerMenu();
}

function renderCourseSelector() {
  courseList.innerHTML = "";

  const orderedCourses = [...courseLibrary]
    .map((course, courseIndex) => ({ course, courseIndex }))
    .sort((a, b) => {
      if (a.course.id === "pitch-and-putt") {
        return -1;
      }
      if (b.course.id === "pitch-and-putt") {
        return 1;
      }
      return a.course.name.localeCompare(b.course.name);
    });

  orderedCourses.forEach(({ course, courseIndex }) => {
    const button = document.createElement("button");
    const holeCount = course.holes?.length ?? 0;
    const coursePar = (course.holes ?? []).reduce((total, courseHole) => total + (Number(courseHole.par) || 0), 0);
    const isLocked = course.id !== "pitch-and-putt" && !advancedCoursesUnlocked;
    button.type = "button";
    button.className = "course-option";
    button.classList.toggle("locked", isLocked);
    button.disabled = isLocked;
    button.innerHTML = `
      ${isLocked ? `<img class="course-lock-icon" src="lock.png" alt="">` : ""}
      <span>${course.name}</span>
      <small>${holeCount} ${holeCount === 1 ? "hole" : "holes"} - Par ${coursePar}${isLocked ? " - Locked until Pitch and Putt par" : ""}</small>
    `;
    if (!isLocked) {
      button.addEventListener("click", () => showRound(courseIndex));
    }
    courseList.append(button);
  });

  if (!courseLibrary.length) {
    const empty = document.createElement("p");
    empty.className = "lie-note";
    empty.textContent = courseLibraryError
      ? `Could not load course JSON files. ${courseLibraryError}`
      : "No preset courses found. Add JSON files to games/chainbound/courses/ and list them in course-library.js.";
    courseList.append(empty);
  }
}
function cardNameForDeck(card) {
  return `${discs[card.discId]?.name ?? card.discId} / ${card.throwId ? (throwCardEffects[card.throwId]?.name ?? card.throwId) : "No Modifier"}`;
}

function cardDiscStatsForDeck(card) {
  const disc = discs[card.discId];
  const puttLabel = disc.putt > 0 ? `+${disc.putt}` : `${disc.putt}`;
  return `${disc.type} - ${disc.speed} / ${disc.glide} / ${disc.turn} / ${disc.fade} / ${puttLabel}`;
}

function cardStatsForDeck(card) {
  return `${cardDiscStatsForDeck(card)} - ${card.throwId ? (throwCardEffects[card.throwId]?.text ?? "") : "No throw modifier"}`;
}

function sortedPlayerDeck() {
  return [...playerDeck].sort((a, b) => cardNameForDeck(a).localeCompare(cardNameForDeck(b)));
}
function renderPlayerMenu() {
  playerPointsLabel.textContent = playerPoints;
  playerC1Label.textContent = `${playerStats.c1}%`;
  playerC2Label.textContent = `${playerStats.c2}%`;
  playerThrowInLabel.textContent = `${playerStats.throwIn}%`;
  playerScrambleLabel.textContent = `${playerStats.scramble}%`;
  playerControlLabel.textContent = playerStats.control;
  playerDeckList.innerHTML = "";

  sortedPlayerDeck().forEach((card) => {
    const item = document.createElement("div");
    item.className = "player-deck-card";
    const disc = discs[card.discId];
    const throwCard = card.throwId ? throwCardEffects[card.throwId] : null;
    item.innerHTML = `
      <img src="${disc.image}" alt="">
      <span>
        <span>${disc.name}</span>
        <strong>${throwCard?.name ?? "No Modifier"}</strong>
      </span>
      <em>${throwCard?.text ?? "No throw modifier"}</em>
      <small>${cardDiscStatsForDeck(card)}</small>
    `;
    playerDeckList.append(item);
  });
}

function buyOffer(offer) {
  if (!offer || offer.sold || playerPoints < offer.price) {
    return;
  }

  playerPoints -= offer.price;
  playerDeck.push(buildCard(offer.discId, offer.throwId));
  offer.sold = true;
  closePurchaseConfirm();
  renderSpendPoints();
  renderPlayerMenu();
}
function openPurchaseConfirm(offer) {
  if (offer.sold || playerPoints < offer.price) {
    return;
  }

  pendingPurchase = offer;
  purchaseConfirmTitle.textContent = `Buy ${cardNameForDeck(offer)}?`;
  purchaseConfirmCopy.innerHTML = `Spend <span class="point-value"><img src="player_points.png" alt=""> <strong>${offer.price}</strong></span> on ${cardNameForDeck(offer)}.`;
  purchaseConfirmModal.hidden = false;
  confirmPurchaseButton.focus();
}

function closePurchaseConfirm() {
  pendingPurchase = null;
  purchaseConfirmModal.hidden = true;
}

function statUpgradePrice(stat) {
  return stat === "control" ? 20 : 5;
}

function canTrainStat(stat) {
  return stat !== "control" || playerStats.control < 4;
}

function trainStat(stat, price = statUpgradePrice(stat)) {
  if (playerPoints < price) {
    return;
  }
  if (!canTrainStat(stat)) {
    return;
  }

  playerPoints -= price;
  playerStats[stat] += 1;
  renderSpendPoints();
  renderPlayerMenu();
}

function makeShopButton(offer) {
  const button = document.createElement("button");
  const { price, sold } = offer;
  const disc = discs[offer.discId];
  const throwCard = throwCardEffects[offer.throwId];
  button.type = "button";
  button.className = "shop-card";
  button.classList.toggle("sold", Boolean(sold));
  button.disabled = sold || playerPoints < price;
  button.innerHTML = `
    <img src="${disc.image}" alt="">
    <span>
      <span>${disc.name} / ${throwCard.name}</span>
      <small>${cardStatsForDeck(offer)}</small>
    </span>
    <strong class="point-price">${sold ? "Sold" : `<img src="player_points.png" alt=""> ${price}`}</strong>
  `;
  button.addEventListener("click", () => openPurchaseConfirm(offer));
  return button;
}
function makeTrainingButton(stat, label) {
  const price = statUpgradePrice(stat);
  const button = document.createElement("button");
  button.type = "button";
  button.className = "shop-card training-card";
  button.disabled = playerPoints < price || !canTrainStat(stat);
  button.innerHTML = `
    <span>
      <span>${label}</span>
      <small>${stat === "control" ? "Increase hand size to 4" : "Increase by 1%"}</small>
    </span>
    <strong class="point-price">${canTrainStat(stat) ? `<img src="player_points.png" alt=""> ${price}` : "Max"}</strong>
  `;
  button.addEventListener("click", () => trainStat(stat));
  return button;
}

function renderSpendPoints() {
  ensureSpendOffers();
  spendPlayerPointsLabel.textContent = playerPoints;
  discShopList.innerHTML = "";
  trainingList.innerHTML = "";

  spendOffers.cards.forEach((offer) => {
    discShopList.append(makeShopButton(offer));
  });

  [
    ["c1", `C1 ${playerStats.c1}%`],
    ["c2", `C2 ${playerStats.c2}%`],
    ["throwIn", `Throw-In ${playerStats.throwIn}%`],
    ["scramble", `Scramble ${playerStats.scramble}%`],
    ["control", `Control ${playerStats.control}`]
  ].forEach(([stat, label]) => {
    trainingList.append(makeTrainingButton(stat, label));
  });
}
async function showCourseSelect() {
  await loadCourseLibrary();
  renderCourseSelector();
  menuScreen.hidden = true;
  playerMenuScreen.hidden = true;
  spendPointsScreen.hidden = true;
  roundScreen.hidden = true;
  editorScreen.hidden = true;
  courseSelectScreen.hidden = false;
  courseList.querySelector("button")?.focus();
}

function showPlayerMenu() {
  renderPlayerMenu();
  menuScreen.hidden = true;
  courseSelectScreen.hidden = true;
  roundScreen.hidden = true;
  editorScreen.hidden = true;
  spendPointsScreen.hidden = true;
  playerMenuScreen.hidden = false;
  playRoundButton.focus();
}

function showSpendPoints() {
  renderSpendPoints();
  menuScreen.hidden = true;
  playerMenuScreen.hidden = true;
  spendPointsScreen.hidden = true;
  courseSelectScreen.hidden = true;
  roundScreen.hidden = true;
  editorScreen.hidden = true;
  spendPointsScreen.hidden = false;
  spendBackButton.focus();
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
  const throwPuttBonus = throwCardPuttBonus(circle);
  return Math.min(baseChance + (selectedDisc()?.putt ?? 0) + throwPuttBonus, 100);
}

function throwCardPuttBonus(circle) {
  const throwCard = selectedThrowCardId ? throwCardEffects[selectedThrowCardId] : null;
  if (!throwCard?.putt) {
    return 0;
  }

  if (throwCard.puttCircle && throwCard.puttCircle !== circle) {
    return 0;
  }

  return throwCard.putt;
}

function throwInChance() {
  const throwInBonus = selectedThrowCardId ? (throwCardEffects[selectedThrowCardId]?.throwIn ?? 0) : 0;
  return Math.min(playerStats.throwIn + throwInBonus, 100);
}

function basketFlyoverStep(path) {
  if (!hole.basket) {
    return null;
  }

  return path.find((step) => step.height === 2 && sameCell(step, hole.basket)) ?? null;
}

function puttModifierText() {
  const disc = selectedDisc();
  const throwPuttBonus = pendingPutt ? throwCardPuttBonus(pendingPutt.circle) : 0;
  const modifiers = [`Includes ${disc.name} Putt ${disc.putt > 0 ? "+" : ""}${disc.putt}%`];

  if (throwPuttBonus) {
    modifiers.push(`${throwCardEffects[selectedThrowCardId].name} +${throwPuttBonus}%`);
  }

  return modifiers.join(" and ");
}

function resolveLanding(cell) {
  const basketDistance = gridDistance(cell, hole.basket);
  pendingPutt = null;

  if (basketDistance === 0) {
    const chance = throwInChance();
    if (percentRoll(chance)) {
      setLieNote(`Throw-in made. ${chance}% chance hit, no putt required.`);
      completeHole();
      return;
    }

    pendingPutt = { circle: "c1" };
    setLieNote(`Throw-in missed at ${chance}%. Take a C1 putt at ${puttChance("c1")}% with ${selectedDisc().name}.`);
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
  const puttDisc = selectedDisc();
  const discName = puttDisc.name;
  currentDiscImage = puttDisc.image;
  currentDiscName = puttDisc.name;
  strokeNumber += 1;

  if (percentRoll(chance)) {
    pendingPutt = null;
    setLieNote(`${circle.toUpperCase()} putt made at ${chance}% with ${discName}${selectedThrowCardId ? ` and ${throwCardEffects[selectedThrowCardId].name}` : ""}.`);
    discardSelectedDisc();
    if (selectedThrowCardId) {
      discardCard(selectedThrowCardInstanceId);
      selectedThrowCardInstanceId = null;
      selectedThrowCardId = null;
    }
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
    if (selectedThrowCardId) {
      discardCard(selectedThrowCardInstanceId);
      selectedThrowCardInstanceId = null;
      selectedThrowCardId = null;
    }
    autoRefillHand();
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
  pitchButton.disabled = true;
  renderHand();

  const thrownDisc = selectedDisc();
  currentDiscImage = thrownDisc.image;
  currentDiscName = thrownDisc.name;
  const startingHazard = hazardForCell(currentDiscCell.x, currentDiscCell.y);
  const scrambleMiss = Boolean(startingHazard && !percentRoll(playerStats.scramble));
  const path = getThrowPath(selectedThrow);
  const collisionResult = scrambleMiss ? { collision: null, hazard: null, fights: [] } : resolveCollision(path);
  const collision = scrambleMiss ? null : collisionResult.collision;
  const collisionIndex = collision ? path.indexOf(collision) : Infinity;
  const hitCollision = Boolean(collision);
  const terminalIndex = scrambleMiss ? -1 : Math.min(collisionIndex, path.length - 1);
  const animationPath = path.slice(0, terminalIndex + 1);
  const visibleAnimationPath = animationPath.filter((step) => !isOutOfBoundsCell(step.x, step.y));
  renderCourse(path);
  await wait(140);

  for (const step of visibleAnimationPath) {
    currentDiscCell = { ...step };
    renderCourse(path);
    await wait(260);
  }

  if (scrambleMiss) {
    currentDiscCell = randomScrambleKick(currentDiscCell);
  } else if (hitCollision && collision) {
    currentDiscCell = randomCollisionLie(collision);
  } else if (path.length > 0) {
    currentDiscCell = { ...path[path.length - 1] };
  }

  const wentOutOfBounds = isOutOfBoundsCell(currentDiscCell.x, currentDiscCell.y);
  if (wentOutOfBounds) {
    currentDiscCell = lastValidInPath(animationPath);
  }

  strokeNumber += 1;
  const flyoverStep = basketFlyoverStep(animationPath);
  const flyoverChance = flyoverStep ? throwInChance() : 0;
  if (flyoverStep && percentRoll(flyoverChance)) {
    currentDiscCell = { ...hole.basket };
    setLieNote(`Throw-in made while flying over the basket at height 2. ${flyoverChance}% chance hit, no putt required.`);
    completeHole();
  } else if (wentOutOfBounds) {
    strokeNumber += 1;
    setLieNote("Out of bounds. Take a penalty stroke and play from the last valid square.");
    resolveLanding(currentDiscCell);
    if (lieNote.textContent) {
      setLieNote(`Out of bounds. Take a penalty stroke and play from the last valid square. ${lieNote.textContent}`);
    }
  } else if (scrambleMiss) {
    setLieNote(`Scramble failed from ${hazardLabel(startingHazard).toLowerCase()}. The disc kicked to a random nearby lie.`);
    resolveLanding(currentDiscCell);
    if (lieNote.textContent) {
      setLieNote(`Scramble failed from ${hazardLabel(startingHazard).toLowerCase()}. The disc kicked to a random nearby lie. ${lieNote.textContent}`);
    }
  } else if (hitCollision && collision) {
    const hazard = hazardForCell(currentDiscCell.x, currentDiscCell.y);
    const penaltyText = hazard ? " The next throw is from an obstacle, so disc speed is reduced by 1 and must pass a scramble check." : "";
    const fightText = collisionResult.fights.length ? ` Fought through ${collisionResult.fights.length} obstruction${collisionResult.fights.length === 1 ? "" : "s"} before stopping.` : "";
    const collisionText = `Hit an obstacle and kicked to a new lie.${fightText}${penaltyText}`;
    resolveLanding(currentDiscCell);
    if (lieNote.textContent) {
      setLieNote(`${collisionText} ${lieNote.textContent}`);
    }
  } else {
    resolveLanding(currentDiscCell);
  }
  isThrowing = false;
  throwButton.disabled = false;
  backhandButton.disabled = false;
  forehandButton.disabled = false;
  pitchButton.disabled = false;
  discardSelectedDisc();
  if (selectedThrowCardId) {
    discardCard(selectedThrowCardInstanceId);
  }
  selectedThrowCardInstanceId = null;
  selectedThrowCardId = null;
  autoRefillHand();
  updateThrowControls();
  renderCourse();
  throwButton.focus();
}

function showRound(courseIndex = 0, holeIndex = 0) {
  selectedCourse = courseLibrary[courseIndex] ?? selectedCourse;
  selectedCourseHoleIndex = holeIndex;
  if (selectedCourseHoleIndex === 0) {
    courseScoreToPar = 0;
    isCourseRewardRecorded = false;
    pendingCoursePoints = 0;
  }
  isHoleScoreRecorded = false;
  hole = cloneHole(selectedCourse.holes?.[selectedCourseHoleIndex] ?? fallbackHole);
  roundHoleLabel.textContent = `Hole ${hole.holeNumber ?? selectedCourseHoleIndex + 1}`;
  roundTitle.textContent = hole.name;
  roundParLabel.textContent = `Par ${hole.par}`;
  updateCourseScoreDisplay();
  resetDecksAndHand();
  currentDiscCell = { ...hole.tee };
  currentDiscImage = selectedDisc()?.image ?? null;
  currentDiscName = selectedDisc()?.name ?? "Disc";
  strokeNumber = 0;
  pendingPutt = null;
  isHoledOut = false;
  holeCompleteModal.hidden = true;
  setLieNote(null);
  updateThrowControls();
  renderCourse();
  menuScreen.hidden = true;
  playerMenuScreen.hidden = true;
  courseSelectScreen.hidden = true;
  editorScreen.hidden = true;
  roundScreen.hidden = false;
  scrollCourseToCell(hole.tee);
  handCardList.querySelector(".disc-card.selected")?.focus();
}

function showMenu() {
  roundScreen.hidden = true;
  playerMenuScreen.hidden = true;
  spendPointsScreen.hidden = true;
  courseSelectScreen.hidden = true;
  editorScreen.hidden = true;
  menuScreen.hidden = false;
  currentDiscCell = { ...hole.tee };
  currentDiscImage = selectedDisc()?.image ?? null;
  currentDiscName = selectedDisc()?.name ?? "Disc";
  strokeNumber = 0;
  pendingPutt = null;
  isHoledOut = false;
  holeCompleteModal.hidden = true;
  setLieNote(null);
  updateThrowControls();
  renderCourse();
  startRoundButton.focus();
}

async function showEditor() {
  await loadCourseLibrary();
  menuScreen.hidden = true;
  playerMenuScreen.hidden = true;
  spendPointsScreen.hidden = true;
  courseSelectScreen.hidden = true;
  roundScreen.hidden = true;
  editorScreen.hidden = false;
  syncEditorInputs();
  renderEditorGrid();
  setEditorNote(null);
  window.requestAnimationFrame(() => {
    editorViewport.scrollLeft = 0;
    editorViewport.scrollTop = editorViewport.scrollHeight;
  });
  editorHoleNameInput.focus();
}

initializeDragPanning(courseViewport, { ignoreSelector: ".pitch-target-cell" });
initializeDragPanning(editorViewport, { ignoreSelector: ".editor-cell" });
initializeObstacleTooltips(courseGrid);
initializeObstacleTooltips(editorGrid);
updateThrowControls();
renderCourse();
renderEditorGrid();
loadCourseLibrary().then(() => {
  populateEditorCourseSelect();
  renderCourseSelector();
  ensureSpendOffers();
  renderPlayerMenu();
});
startRoundButton.addEventListener("click", () => {
  showPlayerMenu();
});
playRoundButton.addEventListener("click", showCourseSelect);
spendPointsButton.addEventListener("click", showSpendPoints);
spendBackButton.addEventListener("click", showPlayerMenu);
courseSelectBackButton.addEventListener("click", showMenu);
openEditorButton.addEventListener("click", showEditor);
returnMenuButton.addEventListener("click", showPlayerMenu);
returnEditorMenuButton.addEventListener("click", showMenu);
backhandButton.addEventListener("click", () => selectThrow("backhand"));
forehandButton.addEventListener("click", () => selectThrow("forehand"));
pitchButton.addEventListener("click", () => selectThrow("pitch"));
throwButton.addEventListener("click", animateThrow);
closeHoleModalButton.addEventListener("click", closeHoleCompleteModal);
confirmPurchaseButton.addEventListener("click", () => buyOffer(pendingPurchase));
cancelPurchaseButton.addEventListener("click", closePurchaseConfirm);
saveHoleButton.addEventListener("click", saveEditorHole);
loadHoleButton.addEventListener("click", () => loadHoleInput.click());
refreshCoursesButton.addEventListener("click", async () => {
  await refreshCourseLibrary();
  setEditorNote(courseLibraryError ? `Course refresh failed: ${courseLibraryError}` : "Course list refreshed from course-library.js.");
});
loadHoleInput.addEventListener("change", () => {
  loadEditorHole(loadHoleInput.files[0]);
  loadHoleInput.value = "";
});
assetButtons.forEach((button) => {
  button.addEventListener("click", () => selectEditorAsset(button.dataset.editorAsset));
});
[editorHoleNameInput, editorCourseSelect, editorNewCourseInput, editorHoleNumberInput, editorHoleParInput, editorHoleColumnsInput, editorHoleRowsInput].forEach((input) => {
  input.addEventListener("change", updateEditorDimensions);
});
directionButtons.forEach((button) => {
  button.addEventListener("click", () => selectDirection(button.dataset.direction));
});
