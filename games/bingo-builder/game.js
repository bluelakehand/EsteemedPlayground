const DEFAULT_SQUARES = [
  "Someone says “the book was better”",
  "A character ignores very obvious danger",
  "Wilhelm scream energy",
  "Dramatic thunder, legally distinct",
  "Phone battery is somehow at 1%",
  "One perfect parking spot appears",
  "Villain explains the whole plan",
  "Someone whispers instead of leaving",
  "A dog knows too much",
  "Extremely fake computer hacking",
  "The map is upside down",
  "A toast goes badly",
  "Someone says the title",
  "Mandatory slow-motion walk",
  "Unattended candle causes tension",
  "A tiny lie becomes load-bearing",
  "Knife sound when no knife is visible",
  "Nobody turns on a normal light",
  "Person coughs ominously",
  "The weather has opinions",
  "A door refuses to behave",
  "Someone is “two days from retirement”",
  "A plan works for exactly seven seconds",
  "A suspiciously specific prophecy",
  "The soundtrack commits a felony",
  "A hat does character development",
  "“We can explain”",
  "The group splits up, brilliantly",
  "An animal steals the scene",
  "A computer enhances the impossible"
];

const EXAMPLE_SQUARES = [
  "Someone joins muted",
  "“Can everyone see my screen?”",
  "A pet cameo",
  "Calendar invite archaeology",
  "Someone says “quick sync”",
  "A spreadsheet is threatened",
  "“Let’s circle back”",
  "Bluetooth betrayal",
  "Awkward silence speedrun",
  "Someone is double-booked",
  "Mystery background noise",
  "A heroic snack appears",
  "“Hard stop”",
  "Unplanned acronym",
  "The demo gods demand tribute",
  "Someone asks if this is being recorded",
  "A link is dropped in chat",
  "Time zone confusion",
  "The agenda becomes decorative",
  "One person carries the vibes",
  "“I’ll make a ticket”",
  "Someone compliments a mug",
  "A screen share shows the wrong tab",
  "Meeting ends with five new meetings",
  "A joke lands surprisingly well"
];

const params = new URLSearchParams(window.location.search);
const isSharedBoard = params.has("board");
const els = {
  designerTab: document.getElementById("designerTab"),
  playerTab: document.getElementById("playerTab"),
  designerPanel: document.getElementById("designerPanel"),
  playerPanel: document.getElementById("playerPanel"),
  builderForm: document.getElementById("builderForm"),
  titleInput: document.getElementById("titleInput"),
  sizeInput: document.getElementById("sizeInput"),
  themeInput: document.getElementById("themeInput"),
  freeInput: document.getElementById("freeInput"),
  freeTextInput: document.getElementById("freeTextInput"),
  squaresInput: document.getElementById("squaresInput"),
  designerMessage: document.getElementById("designerMessage"),
  sharePanel: document.getElementById("sharePanel"),
  shareLinkInput: document.getElementById("shareLinkInput"),
  copyButton: document.getElementById("copyButton"),
  linkStats: document.getElementById("linkStats"),
  previewButton: document.getElementById("previewButton"),
  loadExampleButton: document.getElementById("loadExampleButton"),
  jumpToDesignerButton: document.getElementById("jumpToDesignerButton"),
  emptyPlayerState: document.getElementById("emptyPlayerState"),
  gameState: document.getElementById("gameState"),
  playerTitle: document.getElementById("playerTitle"),
  rulesSummary: document.getElementById("rulesSummary"),
  playerNameInput: document.getElementById("playerNameInput"),
  reshuffleButton: document.getElementById("reshuffleButton"),
  resetMarksButton: document.getElementById("resetMarksButton"),
  board: document.getElementById("board"),
  winBanner: document.getElementById("winBanner"),
  winDetails: document.getElementById("winDetails"),
  copyResultButton: document.getElementById("copyResultButton"),
  editBoardButton: document.getElementById("editBoardButton"),
  makeBoardLink: document.getElementById("makeBoardLink")
};

let currentMeta = null;
let currentLayout = [];
let marked = new Set();
let storageKey = "";
let lastShareLink = "";

function encodeBoard(meta) {
  const json = JSON.stringify(meta);
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBoard(encoded) {
  const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(encoded.length / 4) * 4, "=");
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function seededRandom(seedText) {
  let seed = 1779033703 ^ seedText.length;
  for (let i = 0; i < seedText.length; i += 1) {
    seed = Math.imul(seed ^ seedText.charCodeAt(i), 3432918353);
    seed = (seed << 13) | (seed >>> 19);
  }
  return () => {
    seed = Math.imul(seed ^ (seed >>> 16), 2246822507);
    seed = Math.imul(seed ^ (seed >>> 13), 3266489909);
    return ((seed ^= seed >>> 16) >>> 0) / 4294967296;
  };
}

function randomInt(max) {
  if (window.crypto?.getRandomValues) {
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    return array[0] % max;
  }
  return Math.floor(Math.random() * max);
}

function shuffle(items, seedText = "") {
  const result = [...items];
  const rng = seedText ? seededRandom(seedText) : null;
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = rng ? Math.floor(rng() * (i + 1)) : randomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function cleanLines(value) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function getWinPatterns() {
  const selected = [...document.querySelectorAll('input[name="win"]:checked')].map((input) => input.value);
  return selected.length ? selected : ["row", "col", "diag"];
}

function normalizeMeta(raw) {
  const size = Number(raw.size);
  const safeSize = [3, 4, 5].includes(size) ? size : 5;
  const squares = Array.isArray(raw.squares)
    ? raw.squares.map((square) => String(square).trim()).filter(Boolean).slice(0, 200)
    : [];
  const win = Array.isArray(raw.win)
    ? raw.win.filter((item) => ["row", "col", "diag", "corners", "x", "blackout"].includes(item))
    : ["row", "col", "diag"];

  return {
    v: 1,
    title: String(raw.title || "Custom Bingo").trim().slice(0, 80) || "Custom Bingo",
    size: safeSize,
    free: Boolean(raw.free) && safeSize % 2 === 1,
    freeText: String(raw.freeText || "Free Space").trim().slice(0, 40) || "Free Space",
    win: win.length ? win : ["row", "col", "diag"],
    theme: ["neon", "sunset", "forest", "paper"].includes(raw.theme) ? raw.theme : "neon",
    squares
  };
}

function buildMetaFromForm() {
  return normalizeMeta({
    title: els.titleInput.value,
    size: els.sizeInput.value,
    free: els.freeInput.checked,
    freeText: els.freeTextInput.value,
    win: getWinPatterns(),
    theme: els.themeInput.value,
    squares: cleanLines(els.squaresInput.value)
  });
}

function requiredSquareCount(meta) {
  return meta.size * meta.size - (meta.free ? 1 : 0);
}

function validateMeta(meta) {
  const needed = requiredSquareCount(meta);
  if (meta.squares.length < needed) {
    return `Add at least ${needed} square ideas for this board. You currently have ${meta.squares.length}.`;
  }
  return "";
}

function setDesignerMessage(text, type = "") {
  els.designerMessage.textContent = text;
  els.designerMessage.className = `message ${type}`.trim();
}

function makeShareLink(meta) {
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("board", encodeBoard(meta));
  return url.toString();
}

function fillForm(meta) {
  els.titleInput.value = meta.title;
  els.sizeInput.value = String(meta.size);
  els.themeInput.value = meta.theme;
  els.freeInput.checked = meta.free;
  els.freeTextInput.value = meta.freeText;
  els.squaresInput.value = meta.squares.join("\n");
  document.querySelectorAll('input[name="win"]').forEach((input) => {
    input.checked = meta.win.includes(input.value);
  });
}

function showMode(mode) {
  if (isSharedBoard && mode === "designer") {
    mode = "player";
  }
  const isDesigner = mode === "designer";
  els.designerPanel.hidden = !isDesigner;
  els.playerPanel.hidden = isDesigner;
  els.designerTab.classList.toggle("active", isDesigner);
  els.playerTab.classList.toggle("active", !isDesigner);
}

function describeRules(win) {
  const labels = {
    row: "rows",
    col: "columns",
    diag: "diagonals",
    corners: "four corners",
    x: "giant X",
    blackout: "blackout"
  };
  return `Wins: ${win.map((rule) => labels[rule]).join(", ")}. Tap squares to mark them.`;
}

function setTheme(theme) {
  document.body.classList.remove("theme-sunset", "theme-forest", "theme-paper");
  if (theme !== "neon") {
    document.body.classList.add(`theme-${theme}`);
  }
}

function buildLayout(meta, playerName = "") {
  const cells = new Array(meta.size * meta.size);
  const center = Math.floor(cells.length / 2);
  const shuffledSquares = shuffle(meta.squares, playerName ? `${hashString(JSON.stringify(meta))}:${playerName}` : "");
  let cursor = 0;

  for (let i = 0; i < cells.length; i += 1) {
    if (meta.free && i === center) {
      cells[i] = { text: meta.freeText, free: true };
    } else {
      cells[i] = { text: shuffledSquares[cursor], free: false };
      cursor += 1;
    }
  }

  return cells;
}

function loadMarks() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
    marked = new Set(saved);
  } catch {
    marked = new Set();
  }
}

function saveMarks() {
  localStorage.setItem(storageKey, JSON.stringify([...marked]));
}

function getLines(size) {
  const rows = [];
  const cols = [];
  for (let row = 0; row < size; row += 1) {
    rows.push([...Array(size)].map((_, col) => row * size + col));
  }
  for (let col = 0; col < size; col += 1) {
    cols.push([...Array(size)].map((_, row) => row * size + col));
  }
  const diagA = [...Array(size)].map((_, i) => i * size + i);
  const diagB = [...Array(size)].map((_, i) => i * size + (size - 1 - i));
  const corners = [0, size - 1, size * (size - 1), size * size - 1];
  const x = [...new Set([...diagA, ...diagB])];
  const blackout = [...Array(size * size)].map((_, i) => i);

  return { rows, cols, diagA, diagB, corners, x, blackout };
}

function detectWins(meta) {
  const size = meta.size;
  const lines = getLines(size);
  const wins = [];
  const isMarked = (index) => marked.has(index) || currentLayout[index]?.free;
  const check = (name, indexes) => {
    if (indexes.every(isMarked)) {
      wins.push({ name, indexes });
    }
  };

  if (meta.win.includes("row")) {
    lines.rows.forEach((line, index) => check(`Row ${index + 1}`, line));
  }
  if (meta.win.includes("col")) {
    lines.cols.forEach((line, index) => check(`Column ${index + 1}`, line));
  }
  if (meta.win.includes("diag")) {
    check("Diagonal", lines.diagA);
    check("Diagonal", lines.diagB);
  }
  if (meta.win.includes("corners")) {
    check("Four corners", lines.corners);
  }
  if (meta.win.includes("x")) {
    check("Giant X", lines.x);
  }
  if (meta.win.includes("blackout")) {
    check("Blackout", lines.blackout);
  }

  return wins;
}

function renderBoard() {
  els.board.innerHTML = "";
  els.board.style.setProperty("--size", currentMeta.size);
  const wins = detectWins(currentMeta);
  const winningCells = new Set(wins.flatMap((win) => win.indexes));

  currentLayout.forEach((cell, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "square";
    button.textContent = cell.text;
    button.setAttribute("aria-pressed", marked.has(index) || cell.free ? "true" : "false");
    if (cell.free) {
      button.classList.add("free", "marked");
    }
    if (marked.has(index)) {
      button.classList.add("marked");
    }
    if (winningCells.has(index)) {
      button.classList.add("winning");
    }
    button.addEventListener("click", () => {
      if (cell.free) {
        return;
      }
      if (marked.has(index)) {
        marked.delete(index);
      } else {
        marked.add(index);
      }
      saveMarks();
      renderBoard();
    });
    els.board.append(button);
  });

  if (wins.length) {
    els.winBanner.hidden = false;
    els.winDetails.textContent = wins.map((win) => win.name).join(" · ");
  } else {
    els.winBanner.hidden = true;
    els.winDetails.textContent = "";
  }
}

function startGame(meta, options = {}) {
  currentMeta = normalizeMeta(meta);
  const error = validateMeta(currentMeta);
  if (error) {
    setDesignerMessage(error, "error");
    showMode("designer");
    return;
  }

  setTheme(currentMeta.theme);
  els.emptyPlayerState.hidden = true;
  els.gameState.hidden = false;
  els.makeBoardLink.hidden = !isSharedBoard;
  els.playerTitle.textContent = currentMeta.title;
  els.rulesSummary.textContent = describeRules(currentMeta.win);
  if (!options.keepName) {
    els.playerNameInput.value = "";
  }

  currentLayout = buildLayout(currentMeta, els.playerNameInput.value.trim());
  storageKey = `bingo-forge:${hashString(JSON.stringify(currentMeta))}:${hashString(JSON.stringify(currentLayout))}`;
  loadMarks();
  renderBoard();
  showMode("player");
}

function generateShareLink() {
  const meta = buildMetaFromForm();
  const error = validateMeta(meta);
  if (error) {
    setDesignerMessage(error, "error");
    return null;
  }
  lastShareLink = makeShareLink(meta);
  els.shareLinkInput.value = lastShareLink;
  els.sharePanel.hidden = false;
  const needed = requiredSquareCount(meta);
  const extras = Math.max(0, meta.squares.length - needed);
  els.linkStats.textContent = `${meta.squares.length} prompts encoded for ${needed} board slots. ${extras ? `${extras} extra prompts will be used as a random draw pool. ` : ""}Link length: ${lastShareLink.length.toLocaleString()} characters.`;
  setDesignerMessage("Share link generated. The whole board recipe is tucked into the URL.", "success");
  return meta;
}

function copyText(text, successMessage) {
  if (!navigator.clipboard) {
    window.prompt("Copy this:", text);
    return;
  }

  navigator.clipboard.writeText(text)
    .then(() => setDesignerMessage(successMessage, "success"))
    .catch(() => window.prompt("Copy this:", text));
}

function initializeFromUrl() {
  const encoded = params.get("board");
  if (!encoded) {
    els.squaresInput.value = DEFAULT_SQUARES.join("\n");
    showMode("designer");
    return;
  }

  document.body.classList.add("shared-board");

  try {
    const meta = normalizeMeta(decodeBoard(encoded));
    lastShareLink = makeShareLink(meta);
    startGame(meta);
  } catch (error) {
    document.body.classList.remove("shared-board");
    els.squaresInput.value = DEFAULT_SQUARES.join("\n");
    setDesignerMessage("That share link could not be decoded. The goblin ate a bracket somewhere.", "error");
    showMode("designer");
  }
}

els.builderForm.addEventListener("submit", (event) => {
  event.preventDefault();
  generateShareLink();
});

els.previewButton.addEventListener("click", () => {
  const meta = generateShareLink();
  if (meta) {
    startGame(meta);
  }
});

els.copyButton.addEventListener("click", () => {
  const text = els.shareLinkInput.value || lastShareLink;
  if (text) {
    copyText(text, "Copied share link.");
  }
});

els.loadExampleButton.addEventListener("click", () => {
  fillForm(normalizeMeta({
    title: "Meeting Goblin Bingo",
    size: 5,
    free: true,
    freeText: "This could have been an email",
    win: ["row", "col", "diag", "corners"],
    theme: "forest",
    squares: EXAMPLE_SQUARES
  }));
  setDesignerMessage("Example loaded. Use responsibly, or at least plausibly denyably.", "success");
});

els.designerTab.addEventListener("click", () => showMode("designer"));
els.playerTab.addEventListener("click", () => showMode("player"));
els.jumpToDesignerButton.addEventListener("click", () => showMode("designer"));

els.reshuffleButton.addEventListener("click", () => {
  if (currentMeta) {
    els.playerNameInput.value = "";
    startGame(currentMeta);
  }
});

els.playerNameInput.addEventListener("change", () => {
  if (currentMeta) {
    startGame(currentMeta, { keepName: true });
  }
});

els.resetMarksButton.addEventListener("click", () => {
  marked = new Set();
  saveMarks();
  renderBoard();
});

els.copyResultButton.addEventListener("click", () => {
  if (!currentMeta) {
    return;
  }
  const wins = detectWins(currentMeta);
  const count = marked.size + currentLayout.filter((cell) => cell.free).length;
  const result = wins.length
    ? `Bingo on ${currentMeta.title}: ${wins.map((win) => win.name).join(", ")} with ${count}/${currentLayout.length} squares marked.`
    : `Playing ${currentMeta.title}: ${count}/${currentLayout.length} squares marked. No bingo yet.`;
  if (!navigator.clipboard) {
    window.prompt("Copy this:", result);
    return;
  }
  navigator.clipboard.writeText(result).catch(() => window.prompt("Copy this:", result));
});

els.editBoardButton.addEventListener("click", () => {
  if (isSharedBoard) {
    window.location.href = "./";
    return;
  }
  if (currentMeta) {
    fillForm(currentMeta);
  }
  showMode("designer");
});

els.freeInput.addEventListener("change", () => {
  if (Number(els.sizeInput.value) % 2 === 0 && els.freeInput.checked) {
    els.freeInput.checked = false;
    setDesignerMessage("Free center squares are only available on odd-sized boards.", "error");
  }
});

els.sizeInput.addEventListener("change", () => {
  if (Number(els.sizeInput.value) % 2 === 0) {
    els.freeInput.checked = false;
  }
});

initializeFromUrl();
