(() => {
  "use strict";

  const canvas = document.querySelector("#board-grid");
  const frame = document.querySelector("#board-frame");
  const toggle = document.querySelector("#grid-toggle");
  const nameOutput = document.querySelector("#space-name");
  const detailOutput = document.querySelector("#space-detail");
  const menu = document.querySelector("#main-menu");
  const workspace = document.querySelector("#board-workspace");
  const newGameButton = document.querySelector("#new-game-button");
  const tutorialButton = document.querySelector("#tutorial-button");
  const tutorialMenu = document.querySelector("#tutorial-menu");
  const tutorialSlides = [...document.querySelectorAll("[data-tutorial-slide]")];
  const tutorialProgressText = document.querySelector("#tutorial-progress-text");
  const tutorialBackButton = document.querySelector("#tutorial-back-button");
  const tutorialNextButton = document.querySelector("#tutorial-next-button");
  const tutorialMenuButton = document.querySelector("#tutorial-menu-button");
  const tutorialContinueButton = document.querySelector("#tutorial-continue-button");
  const restartGameButton = document.querySelector("#restart-game-button");
  const yellowFarthingOutput = document.querySelector("#yellow-farthing-count");
  const purpleFarthingOutput = document.querySelector("#purple-farthing-count");
  const purpleScoreRow = document.querySelector("#purple-score-row");
  const gameMessage = document.querySelector("#game-message");
  const computerDifficultyOutput = document.querySelector("#computer-difficulty");
  const computerDifficultyRow = document.querySelector("#computer-difficulty-row");
  const gameModeOutput = document.querySelector("#game-mode-output");
  const confirmSetupButton = document.querySelector("#confirm-setup-button");
  const pieceTooltip = document.querySelector("#piece-tooltip");
  const pieceTooltipName = document.querySelector("#piece-tooltip-name");
  const pieceTooltipControl = document.querySelector("#piece-tooltip-control");
  const moveLogOutput = document.querySelector("#move-log");
  const victoryOverlay = document.querySelector("#victory-overlay");
  const victoryTitle = document.querySelector("#victory-title");
  const victoryDetail = document.querySelector("#victory-detail");
  const winnerNewGameButton = document.querySelector("#winner-new-game-button");
  const winnerMenuButton = document.querySelector("#winner-menu-button");
  const saveGameLogButton = document.querySelector("#save-game-log-button");
  const viewBoardButton = document.querySelector("#view-board-button");
  const boardReviewActions = document.querySelector("#board-review-actions");
  const reviewMenuButton = document.querySelector("#review-menu-button");
  const context = canvas.getContext("2d");

  const MAP_WIDTH = 1363;
  const MAP_HEIGHT = 1154;
  const HEX_HALF_WIDTH = 65.212875;
  const HEX_HALF_HEIGHT = 55.123819;
  const COLUMN_STEP = HEX_HALF_WIDTH * 1.5;
  const ROW_STEP = HEX_HALF_HEIGHT * 2;
  const GRID_CENTER = { x: MAP_WIDTH / 2 - 20, y: 604.5 };
  const PIECE_HEIGHT = 85.54;
  const cells = [];
  const pieceImages = new Map();
  const PATTERN_COLUMNS = {
    "-6": "PPP",
    "-5": "PPPP",
    "-4": "YYBYY",
    "-3": "YYYYYY",
    "-2": "RYYRYYR",
    "-1": "GGBCCBGG",
    "0": "GGGCCCGGG",
    "1": "GGBCCBGG",
    "2": "RYYRYYR",
    "3": "YYYYYY",
    "4": "YYBYY",
    "5": "PPPP",
    "6": "PPP",
  };
  const PATTERN_COLORS = {
    G: "#68752f",
    C: "#2d2c2c",
    Y: "#b7cdd2",
    B: "#18aeb8",
    R: "#b58c70",
    P: "#58344f",
  };
  const CONTROL_VALUES = {
    thingman: 1,
    outlaw: 1,
    raven: 2,
    gothi: 3,
    storgothi: 3,
  };
  const CONTROL_STYLES = {
    yellow: { stroke: "#ffd84a", tint: "rgba(255,216,74,.19)" },
    purple: { stroke: "#c57aff", tint: "rgba(197,122,255,.2)" },
  };

  const northFormation = [
    ["storgothi", 0, 0],
    ["raven", -1, 0], ["gothi", 0, 1], ["raven", 1, 0],
    ["gothi", -2, 0], ["gothi", -1, 1], ["gothi", 1, 1], ["gothi", 2, 0],
    ["thingman", -4, 0], ["outlaw", -3, 0], ["thingman", 3, 0], ["outlaw", 4, 0],
  ];
  const southFormation = [
    ["outlaw", -4, 4], ["thingman", -3, 5],
    ["gothi", -2, 6], ["gothi", -1, 6], ["raven", -1, 7],
    ["storgothi", 0, 8], ["gothi", 0, 7],
    ["raven", 1, 7], ["gothi", 1, 6], ["gothi", 2, 6],
    ["outlaw", 3, 5], ["thingman", 4, 4],
  ];
  const pieces = [
    ...northFormation.map(([type, q, row], index) => makePiece("purple", type, q, row, index)),
    ...southFormation.map(([type, q, row], index) => makePiece("yellow", type, q, row, index)),
  ];

  let hoverCell = null;
  let hoverPiece = null;
  let selectedPiece = null;
  let legalMoves = new Set();
  let captureMoves = new Set();
  let currentTurn = "yellow";
  let gameStarted = false;
  let winner = null;
  let winnerReason = null;
  let reviewingFinalBoard = false;
  let computerThinking = false;
  let pieceAnimating = false;
  let movingPiece = null;
  let movementAnimationToken = 0;
  let computerTurnTimer = null;
  let computerDifficulty = "easy";
  let gameMode = "basic";
  let setupPhase = null;
  let setupSelectedPiece = null;
  let initialSetup = [];
  let tutorialSlideIndex = 0;
  let tutorialDemoActive = false;
  let tutorialDemoLesson = null;
  const moveHistory = [];
  let moveNumber = 0;
  let gameStartedAt = null;
  let gridVisible = true;

  function displayName(type) {
    return type === "storgothi" ? "Storgothi" : type[0].toUpperCase() + type.slice(1);
  }

  function cellCenter(q, row) {
    return {
      x: GRID_CENTER.x + q * COLUMN_STEP,
      y: GRID_CENTER.y + (row + Math.abs(q) / 2 - 4) * ROW_STEP,
    };
  }

  function makePiece(team, type, q, row, index) {
    const { x, y } = cellCenter(q, row);
    return { id: `${team}-${type}-${index + 1}`, team, type, name: displayName(type), q, row, x, y, startQ: q, startRow: row, moveCount: 0, coveredBy: null };
  }

  ["yellow", "purple"].forEach((team) => {
    ["gothi", "outlaw", "raven", "storgothi", "Thingman"].forEach((assetType) => {
      const type = assetType.toLowerCase();
      const image = new Image();
      image.src = `${assetType}_icon_${team}.png`;
      image.addEventListener("load", draw);
      pieceImages.set(`${team}-${type}`, image);
    });
  });

  for (let q = -6; q <= 6; q += 1) {
    const count = 9 - Math.abs(q);
    for (let row = 0; row < count; row += 1) {
      const { x, y } = cellCenter(q, row);
      const patternType = PATTERN_COLUMNS[q][row];
      cells.push({
        id: `q${q >= 0 ? "+" : ""}${q}-r${String(row).padStart(2, "0")}`,
        q, row, x, y, patternType,
        farthing: getPatternRegion(patternType, q, y),
        terrain: getPatternTerrain(patternType),
      });
    }
  }

  function getPatternRegion(patternType, q, y) {
    if (patternType === "P") return q < 0 ? "West Edge Territory" : "East Edge Territory";
    if (patternType === "C") return "Heart Farthing";
    if (patternType === "G") return y < GRID_CENTER.y ? "North Farthing" : "South Farthing";
    if (patternType === "Y") {
      const vertical = y < GRID_CENTER.y ? "North" : "South";
      const horizontal = q < 0 ? "west" : "east";
      return `${vertical}${horizontal} Farthing`;
    }
    return null;
  }

  function getPatternTerrain(patternType) {
    if (patternType === "B") return "Water space";
    if (patternType === "R") return "Neutral space";
    return "Farthing space";
  }

  function getCellColor(cell) {
    return PATTERN_COLORS[cell.patternType];
  }

  function calculateFarthingControl() {
    const control = new Map();
    cells.forEach((cell) => {
      if (cell.farthing && !control.has(cell.farthing)) {
        control.set(cell.farthing, { yellow: 0, purple: 0, controller: null });
      }
    });

    pieces.forEach((piece) => {
      if (piece.coveredBy) return;
      const cell = getCell(piece.q, piece.row);
      if (!cell?.farthing) return;
      const state = control.get(cell.farthing);
      state[piece.team] += CONTROL_VALUES[piece.type] || 1;
    });

    control.forEach((state) => {
      if (state.yellow > state.purple) state.controller = "yellow";
      else if (state.purple > state.yellow) state.controller = "purple";
    });
    return control;
  }

  function countControlledFarthings() {
    const counts = { yellow: 0, purple: 0 };
    const control = calculateFarthingControl();
    control.forEach((state, farthing) => {
      if (farthing.endsWith("Edge Territory")) return;
      if (state.controller) counts[state.controller] += 1;
    });

    const westController = control.get("West Edge Territory")?.controller;
    const eastController = control.get("East Edge Territory")?.controller;
    if (westController && westController === eastController) {
      counts[westController] += 1;
    }
    return counts;
  }

  function controlsOpposingHomestead(team, control = calculateFarthingControl()) {
    const opposingHome = team === "yellow" ? "North Farthing" : "South Farthing";
    return control.get(opposingHome)?.controller === team;
  }

  function getVictoryReason(team, counts, control = calculateFarthingControl()) {
    if (controlsOpposingHomestead(team, control)) return "homestead";
    if (counts[team] >= 5) return "farthings";
    return null;
  }

  function victoryDescription(team, counts) {
    const teamName = team[0].toUpperCase() + team.slice(1);
    return winnerReason === "homestead"
      ? `${teamName} controls the opposing Homestead`
      : `${teamName} controls ${counts[team]} Farthings`;
  }

  function updateGameStatus() {
    const counts = countControlledFarthings();
    yellowFarthingOutput.textContent = String(counts.yellow);
    purpleFarthingOutput.textContent = String(counts.purple);
    gameMessage.classList.toggle("winner", Boolean(winner));
    if (winner) {
      gameMessage.textContent = `${victoryDescription(winner, counts)} and wins!`;
    } else if (setupPhase === "yellow") {
      gameMessage.textContent = "Yellow setup: select two pieces to swap them.";
    } else if (setupPhase === "purple") {
      gameMessage.textContent = "Purple is responding to Yellow's setup.";
    } else if (pieceAnimating && movingPiece) {
      const team = movingPiece.team[0].toUpperCase() + movingPiece.team.slice(1);
      gameMessage.textContent = `${team} ${movingPiece.name} is moving…`;
    } else if (computerThinking) {
      const difficulty = computerDifficulty === "hard" ? "Hard" : "Easy";
      gameMessage.textContent = `Purple (${difficulty}) is considering its move…`;
    } else {
      gameMessage.textContent = `${turnName()} to move.`;
    }
    return counts;
  }

  function hideVictoryPopup() {
    victoryOverlay.hidden = true;
  }

  function showVictoryPopup(counts) {
    if (!winner) return;
    const team = winner[0].toUpperCase() + winner.slice(1);
    const tutorialWon = tutorialDemoActive && winner === "yellow";
    saveGameLogButton.hidden = tutorialWon;
    viewBoardButton.hidden = tutorialWon;
    tutorialContinueButton.hidden = !tutorialWon;
    if (tutorialWon) {
      victoryTitle.textContent = "Tutorial Complete!";
      victoryDetail.textContent = `You completed this piece lesson. ${victoryDescription(winner, counts)}.`;
      winnerNewGameButton.textContent = "Replay Lesson";
      tutorialContinueButton.textContent = tutorialDemoLesson === "storgothi" ? "Finish Tutorial" : "Continue Tutorial";
    } else {
      victoryTitle.textContent = `${team} Wins!`;
      victoryDetail.textContent = `${victoryDescription(winner, counts)} and claims the victory.`;
      winnerNewGameButton.textContent = tutorialDemoActive ? "Try Again" : "Play Again";
    }
    victoryOverlay.hidden = false;
    winnerNewGameButton.focus();
  }

  function viewFinalBoard() {
    if (!winner) return;
    hideVictoryPopup();
    reviewingFinalBoard = true;
    boardReviewActions.hidden = false;
    restartGameButton.hidden = true;
    clearSelection();
    const counts = countControlledFarthings();
    gameMessage.textContent = `Final position — ${victoryDescription(winner, counts)}.`;
    nameOutput.textContent = "Final position";
    detailOutput.textContent = "Pieces are frozen. Hover over any visible piece or stack layer to inspect it.";
    reviewMenuButton.focus();
    draw();
  }

  function describeFarthingControl(cell) {
    if (!cell?.farthing) return cell?.terrain || "Outside the Farthings";
    const state = calculateFarthingControl().get(cell.farthing);
    const score = `Purple ${state.purple} Â· Yellow ${state.yellow}`;
    if (!state.controller) return `${cell.farthing} is neutral (${score}).`;
    const team = state.controller[0].toUpperCase() + state.controller.slice(1);
    return `${team} controls ${cell.farthing} (${score}).`;
  }

  function resizeCanvas() {
    const rect = frame.getBoundingClientRect();
    const scale = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * scale);
    canvas.height = Math.round(rect.height * scale);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    context.setTransform((rect.width / MAP_WIDTH) * scale, 0, 0, (rect.height / MAP_HEIGHT) * scale, 0, 0);
    draw();
  }

  function traceHex(cell) {
    const { x, y } = cell;
    context.beginPath();
    context.moveTo(x + HEX_HALF_WIDTH, y);
    context.lineTo(x + HEX_HALF_WIDTH / 2, y + HEX_HALF_HEIGHT);
    context.lineTo(x - HEX_HALF_WIDTH / 2, y + HEX_HALF_HEIGHT);
    context.lineTo(x - HEX_HALF_WIDTH, y);
    context.lineTo(x - HEX_HALF_WIDTH / 2, y - HEX_HALF_HEIGHT);
    context.lineTo(x + HEX_HALF_WIDTH / 2, y - HEX_HALF_HEIGHT);
    context.closePath();
  }

  function drawGrid() {
    if (!gridVisible) return;
    const control = calculateFarthingControl();

    // Base fills and neutral grid lines are painted first.
    cells.forEach((cell) => {
      const farthingState = cell.farthing ? control.get(cell.farthing) : null;
      const controlStyle = farthingState?.controller ? CONTROL_STYLES[farthingState.controller] : null;
      traceHex(cell);
      context.fillStyle = getCellColor(cell);
      context.fill();
      if (controlStyle) {
        context.fillStyle = controlStyle.tint;
        context.fill();
      }
      context.lineWidth = 2;
      context.strokeStyle = "rgba(226,236,226,.72)";
      context.stroke();
    });

    // Control outlines get their own top layer so adjacent neutral or water
    // tiles can never overwrite a controlled Farthing's shared edges.
    cells.forEach((cell) => {
      const farthingState = cell.farthing ? control.get(cell.farthing) : null;
      const controlStyle = farthingState?.controller ? CONTROL_STYLES[farthingState.controller] : null;
      if (!controlStyle) return;
      traceHex(cell);
      context.save();
      context.lineWidth = 4;
      context.strokeStyle = controlStyle.stroke;
      context.shadowColor = controlStyle.stroke;
      context.shadowBlur = 9;
      context.stroke();
      context.restore();
    });

    // Hover feedback remains the uppermost board layer. Only pieces can be selected.
    if (hoverCell) {
      traceHex(hoverCell);
      context.fillStyle = "rgba(255,255,255,.18)";
      context.fill();
      context.lineWidth = 4;
      context.strokeStyle = "#f2d27a";
      context.stroke();
    }
  }

  function drawMoveHints() {
    legalMoves.forEach((cellId) => {
      const cell = cells.find((candidate) => candidate.id === cellId);
      if (!cell) return;
      context.save();
      context.beginPath();
      context.arc(cell.x, cell.y, 10, 0, Math.PI * 2);
      const isCapture = captureMoves.has(cellId);
      context.fillStyle = isCapture ? "#e53935" : "#ffffff";
      context.shadowColor = isCapture ? "rgba(229,57,53,.85)" : "rgba(0,0,0,.75)";
      context.shadowBlur = isCapture ? 10 : 7;
      context.fill();
      context.lineWidth = 2;
      context.strokeStyle = isCapture ? "#681511" : "rgba(20,20,20,.65)";
      context.stroke();
      context.restore();
    });
  }

  function getStackBelow(topPiece) {
    const stack = [];
    let current = pieces.find((piece) => piece.coveredBy === topPiece.id) || null;
    while (current) {
      stack.push(current);
      current = pieces.find((piece) => piece.coveredBy === current.id) || null;
    }
    return stack;
  }

  function drawPieceImage(piece, x, y, height, highlighted = false) {
    const image = pieceImages.get(`${piece.team}-${piece.type}`);
    if (!image?.complete || !image.naturalWidth) return;
    const width = height * (image.naturalWidth / image.naturalHeight);
    context.save();
    if (highlighted) {
      context.shadowColor = piece.team === "yellow" ? "#ffe57a" : "#d5a4ff";
      context.shadowBlur = 18;
    } else {
      context.shadowColor = "rgba(0,0,0,.78)";
      context.shadowBlur = 7;
      context.shadowOffsetY = 4;
    }
    context.drawImage(image, x - width / 2, y - height / 2, width, height);
    context.restore();
  }

  function drawPieces() {
    pieces.filter((piece) => !piece.coveredBy).forEach((piece) => {
      const highlighted = piece === selectedPiece || piece === setupSelectedPiece || piece === hoverPiece;
      const height = highlighted ? PIECE_HEIGHT * 1.12 : PIECE_HEIGHT;
      const stack = getStackBelow(piece);
      const topPieceX = piece.x - (stack.length ? 13 : 0);

      // Draw the deepest markers first. Each higher marker overlaps the one
      // below it, making the captured-piece order visible at a glance.
      stack.map((capturedPiece, index) => ({ capturedPiece, index })).reverse().forEach(({ capturedPiece, index }) => {
        const markerX = piece.x + 29;
        const markerY = piece.y + index * 16;
        drawPieceImage(capturedPiece, markerX, markerY, 34, false);
      });

      // The active piece sits slightly left and remains visually above its stack.
      drawPieceImage(piece, topPieceX, piece.y, height, highlighted);
    });
  }

  function draw() {
    context.clearRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
    drawGrid();
    drawPieces();
    drawMoveHints();
  }

  function eventPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: ((event.clientX - rect.left) / rect.width) * MAP_WIDTH, y: ((event.clientY - rect.top) / rect.height) * MAP_HEIGHT };
  }

  function findCell(point) {
    return cells.find((cell) => {
      const dx = Math.abs(point.x - cell.x);
      const dy = Math.abs(point.y - cell.y);
      return dx <= HEX_HALF_WIDTH && dy <= HEX_HALF_HEIGHT &&
        dx + (HEX_HALF_WIDTH * dy) / (2 * HEX_HALF_HEIGHT) <= HEX_HALF_WIDTH;
    }) || null;
  }

  function getCell(q, row) {
    return cells.find((cell) => cell.q === q && cell.row === row) || null;
  }

  function getPieceAtCell(cell) {
    if (!cell) return null;
    return pieces.find((piece) => !piece.coveredBy && piece.q === cell.q && piece.row === cell.row) || null;
  }

  function getNeighbors(cell) {
    const neighborDistance = Math.hypot(COLUMN_STEP, ROW_STEP / 2) * 1.04;
    return cells.filter((candidate) =>
      candidate !== cell && Math.hypot(candidate.x - cell.x, candidate.y - cell.y) <= neighborDistance
    );
  }

  const MOVE_DIRECTIONS = [
    [0, -ROW_STEP],
    [COLUMN_STEP, -ROW_STEP / 2],
    [COLUMN_STEP, ROW_STEP / 2],
    [0, ROW_STEP],
    [-COLUMN_STEP, ROW_STEP / 2],
    [-COLUMN_STEP, -ROW_STEP / 2],
  ];

  function getCellAtPosition(x, y) {
    return cells.find((cell) => Math.abs(cell.x - x) < 0.01 && Math.abs(cell.y - y) < 0.01) || null;
  }

  function canCapture(attacker, defender, moveKind = "step") {
    if (!defender || defender.team === attacker.team || defender.coveredBy) return false;
    return attacker.type !== "gothi" || moveKind === "step";
  }

  function addOpenOrCapture(moves, attacker, destination, moveKind = "step") {
    if (!destination) return "blocked";
    const defender = getPieceAtCell(destination);
    if (!defender) {
      moves.add(destination.id);
      return "open";
    }
    if (canCapture(attacker, defender, moveKind)) {
      moves.add(destination.id);
      captureMoves.add(destination.id);
      return "capture";
    }
    return "blocked";
  }

  function getThingmanMoves(piece) {
    const origin = getCell(piece.q, piece.row);
    const moves = new Set();
    if (!origin) return moves;

    getNeighbors(origin).forEach((firstStep) => {
      if (firstStep.terrain === "Water space") return;
      const firstResult = addOpenOrCapture(moves, piece, firstStep, "step");
      if (firstResult !== "open") return;

      getNeighbors(firstStep).forEach((secondStep) => {
        if (secondStep === origin || secondStep.terrain === "Water space") return;
        addOpenOrCapture(moves, piece, secondStep, "second-step");
      });
    });
    return moves;
  }

  function getOutlawMoves(piece) {
    const origin = getCell(piece.q, piece.row);
    const moves = new Set();
    if (!origin) return moves;

    MOVE_DIRECTIONS.forEach(([dx, dy]) => {
      let x = origin.x + dx;
      let y = origin.y + dy;
      let destination = getCellAtPosition(x, y);

      while (destination) {
        if (destination.terrain === "Water space") break;
        const result = addOpenOrCapture(moves, piece, destination, "line");
        if (result !== "open") break;
        x += dx;
        y += dy;
        destination = getCellAtPosition(x, y);
      }
    });
    return moves;
  }

  function getRavenMoves(piece) {
    const origin = getCell(piece.q, piece.row);
    const moves = new Set();
    if (!origin) return moves;

    MOVE_DIRECTIONS.forEach(([dx, dy]) => {
      const stepDestination = getCellAtPosition(origin.x + dx, origin.y + dy);
      addOpenOrCapture(moves, piece, stepDestination, "step");

      const jumpDestination = getCellAtPosition(origin.x + dx * 2, origin.y + dy * 2);
      addOpenOrCapture(moves, piece, jumpDestination, "jump");
    });
    return moves;
  }

  function getGothiMoves(piece) {
    const origin = getCell(piece.q, piece.row);
    const moves = new Set();
    if (!origin) return moves;

    MOVE_DIRECTIONS.forEach(([dx, dy]) => {
      const firstStep = getCellAtPosition(origin.x + dx, origin.y + dy);
      if (!firstStep || firstStep.terrain === "Water space") return;
      const firstResult = addOpenOrCapture(moves, piece, firstStep, "step");
      if (firstResult !== "open") return;

      const secondStep = getCellAtPosition(origin.x + dx * 2, origin.y + dy * 2);
      if (!secondStep || secondStep.terrain === "Water space" || getPieceAtCell(secondStep)) return;
      moves.add(secondStep.id);
    });
    return moves;
  }

  function getLegalMoves(piece) {
    captureMoves = new Set();
    if (piece.type === "thingman") return getThingmanMoves(piece);
    if (piece.type === "outlaw" || piece.type === "storgothi") return getOutlawMoves(piece);
    if (piece.type === "raven") return getRavenMoves(piece);
    if (piece.type === "gothi") return getGothiMoves(piece);
    return new Set();
  }

  function turnName() {
    return currentTurn[0].toUpperCase() + currentTurn.slice(1);
  }

  function clearSelection() {
    selectedPiece = null;
    legalMoves = new Set();
    captureMoves = new Set();
  }

  function resetPieces() {
    const startingPieces = [
      ...northFormation.map(([type, q, row], index) => makePiece("purple", type, q, row, index)),
      ...southFormation.map(([type, q, row], index) => makePiece("yellow", type, q, row, index)),
    ];
    pieces.splice(0, pieces.length, ...startingPieces);
  }

  function resetGothiTutorialPieces() {
    const tutorialPieces = southFormation.filter(([type]) => type === "gothi")
      .map(([, q, row], index) => makePiece("yellow", "gothi", q, row, index));
    pieces.splice(0, pieces.length, ...tutorialPieces);
  }

  function resetMovementTutorialPieces() {
    const allowedTypes = new Set(["raven", "thingman", "outlaw"]);
    const yellowPieces = southFormation.filter(([type]) => allowedTypes.has(type))
      .map(([type, q, row], index) => makePiece("yellow", type, q, row, index));
    const occupied = new Set(yellowPieces.map((piece) => getCell(piece.q, piece.row).id));
    const availableCells = cells.filter((cell) => cell.farthing !== "South Farthing" && !occupied.has(cell.id));
    for (let index = availableCells.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [availableCells[index], availableCells[swapIndex]] = [availableCells[swapIndex], availableCells[index]];
    }
    const purpleTypes = ["gothi", "raven", "thingman", "outlaw", "storgothi"];
    const purplePieces = purpleTypes.map((type, index) => {
      const cellIndex = availableCells.findIndex((cell) => type === "raven" || cell.terrain !== "Water space");
      const cell = availableCells.splice(Math.max(0, cellIndex), 1)[0];
      return makePiece("purple", type, cell.q, cell.row, index);
    });
    pieces.splice(0, pieces.length, ...purplePieces, ...yellowPieces);
  }

  function resetStorgothiTutorialPieces() {
    const yellowPieces = southFormation
      .map(([type, q, row], index) => makePiece("yellow", type, q, row, index));
    const purplePieces = northFormation
      .filter(([type, q]) => type !== "gothi" || Math.abs(q) < 2)
      .map(([type, q, row], index) => makePiece("purple", type, q, row, index));
    pieces.splice(0, pieces.length, ...purplePieces, ...yellowPieces);
  }

  function showTutorialSlide(index) {
    const nextLabels = ["Next: The Gothi", "Start Gothi Demo", "Next: Thingman", "Next: Outlaw", "Start Piece Demo", "Start Final Demo"];
    tutorialSlideIndex = Math.max(0, Math.min(index, tutorialSlides.length - 1));
    tutorialSlides.forEach((slide, slideIndex) => {
      slide.hidden = slideIndex !== tutorialSlideIndex;
    });
    tutorialProgressText.textContent = `${tutorialSlideIndex + 1} of ${tutorialSlides.length}`;
    tutorialBackButton.disabled = tutorialSlideIndex === 0;
    tutorialNextButton.textContent = nextLabels[tutorialSlideIndex];
  }

  function openTutorial() {
    hideVictoryPopup();
    tutorialDemoActive = false;
    tutorialDemoLesson = null;
    gameStarted = false;
    menu.hidden = true;
    workspace.hidden = true;
    tutorialMenu.hidden = false;
    showTutorialSlide(0);
    tutorialNextButton.focus();
  }

  function continueTutorialAfterDemo() {
    hideVictoryPopup();
    gameStarted = false;
    workspace.hidden = true;
    tutorialDemoActive = false;
    if (tutorialDemoLesson === "gothi") {
      tutorialDemoLesson = null;
      tutorialMenu.hidden = false;
      showTutorialSlide(2);
      tutorialNextButton.focus();
    } else if (tutorialDemoLesson === "movement") {
      tutorialDemoLesson = null;
      tutorialMenu.hidden = false;
      showTutorialSlide(5);
      tutorialNextButton.focus();
    } else {
      tutorialDemoLesson = null;
      showMainMenu();
    }
  }

  function placePieceAtCell(piece, cell) {
    piece.q = cell.q;
    piece.row = cell.row;
    piece.x = cell.x;
    piece.y = cell.y;
  }

  function captureInitialSetup() {
    pieces.forEach((piece) => {
      piece.startQ = piece.q;
      piece.startRow = piece.row;
      piece.moveCount = 0;
    });
    initialSetup = pieces.map((piece) => ({
      team: piece.team,
      piece: piece.name,
      pieceId: piece.id,
      cellId: getCell(piece.q, piece.row).id,
    }));
  }

  function handleAdvancedSetupPiece(piece) {
    if (setupPhase !== "yellow" || !piece || piece.team !== "yellow") return false;
    if (!setupSelectedPiece) {
      setupSelectedPiece = piece;
      nameOutput.textContent = `${piece.name} selected`;
      detailOutput.textContent = "Choose another Yellow piece to swap their starting spaces.";
      return true;
    }
    if (piece === setupSelectedPiece) {
      setupSelectedPiece = null;
      updateReadout(null);
      return true;
    }

    const first = setupSelectedPiece;
    const firstCell = getCell(first.q, first.row);
    const secondCell = getCell(piece.q, piece.row);
    placePieceAtCell(first, secondCell);
    placePieceAtCell(piece, firstCell);
    setupSelectedPiece = null;
    nameOutput.textContent = `${first.name} and ${piece.name} swapped`;
    detailOutput.textContent = "Continue arranging Yellow, then confirm your setup.";
    return true;
  }

  function getPurpleSetupSlots() {
    return northFormation.map(([, q, row]) => getCell(q, row));
  }

  function getMirroredPurpleOrder(slots, purplePieces) {
    const availableByType = new Map();
    purplePieces.forEach((piece) => {
      if (!availableByType.has(piece.type)) availableByType.set(piece.type, []);
      availableByType.get(piece.type).push(piece);
    });

    return slots.map((slot) => {
      const mirroredRow = PATTERN_COLUMNS[slot.q].length - 1 - slot.row;
      const yellowPiece = pieces.find((piece) =>
        piece.team === "yellow" && piece.q === slot.q && piece.row === mirroredRow
      );
      return availableByType.get(yellowPiece?.type)?.shift() || null;
    });
  }

  function applyPurpleSetup(order, slots) {
    order.forEach((piece, index) => {
      if (piece && slots[index]) placePieceAtCell(piece, slots[index]);
    });
  }

  function shuffledPieceOrder(purplePieces) {
    const order = [...purplePieces];
    for (let index = order.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [order[index], order[swapIndex]] = [order[swapIndex], order[index]];
    }
    return order;
  }

  function configureEasyPurpleSetup(slots, purplePieces, mirroredOrder) {
    const order = [...mirroredOrder];
    const swapCount = 2 + Math.floor(Math.random() * 3);
    for (let swap = 0; swap < swapCount; swap += 1) {
      const first = Math.floor(Math.random() * order.length);
      const choices = order.map((piece, index) => ({ piece, index }))
        .filter(({ piece, index }) => index !== first && piece?.type !== order[first]?.type);
      if (!choices.length) continue;
      const second = choices[Math.floor(Math.random() * choices.length)].index;
      [order[first], order[second]] = [order[second], order[first]];
    }
    if (order.every((piece, index) => piece?.type === mirroredOrder[index]?.type)) {
      const second = order.findIndex((piece) => piece?.type !== order[0]?.type);
      if (second > 0) [order[0], order[second]] = [order[second], order[0]];
    }
    applyPurpleSetup(order, slots);
  }

  function scoreHardPurpleSetup(order, slots, mirroredSignature) {
    applyPurpleSetup(order, slots);
    const minY = Math.min(...slots.map((cell) => cell.y));
    const maxY = Math.max(...slots.map((cell) => cell.y));
    let score = order.map((piece, index) => {
      const cell = slots[index];
      const control = CONTROL_VALUES[piece.type] || 1;
      const advance = maxY === minY ? 0 : (cell.y - minY) / (maxY - minY);
      const center = 1 - Math.min(1, Math.abs(cell.q) / 6);
      const mirroredRow = PATTERN_COLUMNS[cell.q].length - 1 - cell.row;
      const yellowPiece = pieces.find((candidate) =>
        candidate.team === "yellow" && candidate.q === cell.q && candidate.row === mirroredRow
      );
      const yellowControl = CONTROL_VALUES[yellowPiece?.type] || 1;
      const legalMoves = getLegalMoves(piece).size;
      let pieceScore = control * advance * 16 + control * yellowControl * 3 + legalMoves * 2;
      if (piece.type === "gothi") pieceScore += advance * 28 + center * 10 + legalMoves * 3;
      if (piece.type === "storgothi" || piece.type === "outlaw") pieceScore += (1 - center) * 6;
      if (control >= yellowControl) pieceScore += 4;
      return pieceScore;
    }).reduce((total, value) => total + value, 0);
    const signature = order.map((piece) => piece.type).join("|");
    if (signature === mirroredSignature) score -= 18;
    clearSelection();
    return score;
  }

  function configureHardPurpleSetup(slots, purplePieces, mirroredOrder) {
    const mirroredSignature = mirroredOrder.map((piece) => piece.type).join("|");
    const candidates = [mirroredOrder, [...purplePieces]];
    for (let attempt = 0; attempt < 120; attempt += 1) {
      candidates.push(shuffledPieceOrder(purplePieces));
    }
    const uniqueCandidates = [...new Map(candidates.map((order) => [
      order.map((piece) => piece.type).join("|"),
      order,
    ])).values()];
    const ranked = uniqueCandidates.map((order) => ({
      order,
      score: scoreHardPurpleSetup(order, slots, mirroredSignature),
    })).sort((a, b) => b.score - a.score);
    const variedRanked = ranked.filter(({ order }) =>
      order.map((piece) => piece.type).join("|") !== mirroredSignature
    );
    const responsePool = variedRanked.length ? variedRanked : ranked;
    const elite = responsePool.slice(0, Math.min(3, responsePool.length));
    const chosen = elite[Math.floor(Math.random() * elite.length)] || ranked[0];
    applyPurpleSetup(chosen.order, slots);
  }

  function configurePurpleAdvancedSetup() {
    const slots = getPurpleSetupSlots();
    const purplePieces = pieces.filter((piece) => piece.team === "purple");
    const mirroredOrder = getMirroredPurpleOrder(slots, purplePieces);
    if (computerDifficulty === "hard") {
      configureHardPurpleSetup(slots, purplePieces, mirroredOrder);
    } else {
      configureEasyPurpleSetup(slots, purplePieces, mirroredOrder);
    }
  }

  function confirmAdvancedSetup() {
    if (setupPhase !== "yellow") return;
    setupSelectedPiece = null;
    setupPhase = "purple";
    confirmSetupButton.disabled = true;
    nameOutput.textContent = "Purple is responding";
    detailOutput.textContent = "The computer is arranging its army after seeing Yellow's formation.";
    configurePurpleAdvancedSetup();
    captureInitialSetup();
    setupPhase = null;
    confirmSetupButton.hidden = true;
    confirmSetupButton.disabled = false;
    nameOutput.textContent = "Purple setup complete";
    detailOutput.textContent = "Yellow moves first. Select a Yellow piece.";
    updateGameStatus();
    draw();
    canvas.focus();
  }

  function cellLogName(cell) {
    return `${cell.farthing || cell.terrain} (${cell.id})`;
  }

  function renderMoveHistory() {
    moveLogOutput.replaceChildren();
    if (!moveHistory.length) {
      const empty = document.createElement("li");
      empty.className = "empty-log";
      empty.textContent = "No moves recorded yet.";
      moveLogOutput.append(empty);
      return;
    }

    moveHistory.forEach((entry) => {
      const item = document.createElement("li");
      item.className = entry.team === "yellow" ? "yellow-move" : "purple-move";
      const title = document.createElement("span");
      title.className = "move-title";
      const team = entry.team === "purple" ? "Purple (Computer)" : "Yellow";
      title.textContent = entry.kind === "pass" ? `${team} passes` : `${team} ${entry.piece}`;
      const detail = document.createElement("span");
      detail.className = "move-detail";
      if (entry.kind === "pass") {
        detail.textContent = `No legal moves. Farthings: Yellow ${entry.farthings.yellow}, Purple ${entry.farthings.purple}.`;
      } else {
        const events = [`${entry.from.label} → ${entry.to.label}`];
        if (entry.capture) events.push(`Covered ${entry.capture.team} ${entry.capture.piece}`);
        if (entry.released.length) events.push(`Released ${entry.released.map((piece) => `${piece.team} ${piece.piece}`).join(", ")}`);
        events.push(`Farthings: Yellow ${entry.farthings.yellow}, Purple ${entry.farthings.purple}`);
        if (entry.winner) events.push(entry.winReason === "homestead" ? `${entry.winner} wins by taking the opposing Homestead` : `${entry.winner} wins`);
        detail.textContent = `${events.join(". ")}.`;
      }
      item.append(title, detail);
      moveLogOutput.append(item);
    });
    moveLogOutput.scrollTop = moveLogOutput.scrollHeight;
  }

  function recordMove(mover, origin, destination, capturedPiece, releasedPieces, counts) {
    moveNumber += 1;
    moveHistory.push({
      number: moveNumber,
      kind: "move",
      team: mover.team,
      pieceId: mover.id,
      piece: mover.name,
      from: { id: origin.id, label: cellLogName(origin) },
      to: { id: destination.id, label: cellLogName(destination) },
      capture: capturedPiece ? {
        id: capturedPiece.id,
        team: capturedPiece.team === "purple" ? "Purple" : "Yellow",
        piece: capturedPiece.name,
      } : null,
      released: releasedPieces.map((piece) => ({
        id: piece.id,
        team: piece.team === "purple" ? "Purple" : "Yellow",
        piece: piece.name,
      })),
      farthings: { ...counts },
      winner: winner ? winner[0].toUpperCase() + winner.slice(1) : null,
      winReason: winnerReason,
    });
    renderMoveHistory();
  }

  function recordPass(team) {
    moveNumber += 1;
    moveHistory.push({
      number: moveNumber,
      kind: "pass",
      team,
      farthings: { ...countControlledFarthings() },
    });
    renderMoveHistory();
  }

  function formatGameLogEntry(entry) {
    const team = entry.team === "purple" ? "Purple (Computer)" : "Yellow";
    if (entry.kind === "pass") {
      return [
        `${entry.number}. ${team} passes`,
        `   No legal moves. Farthings: Yellow ${entry.farthings.yellow}, Purple ${entry.farthings.purple}.`,
      ].join("\r\n");
    }

    const lines = [
      `${entry.number}. ${team} ${entry.piece}`,
      `   From: ${entry.from.label}`,
      `   To: ${entry.to.label}`,
    ];
    if (entry.capture) lines.push(`   Covered: ${entry.capture.team} ${entry.capture.piece}`);
    if (entry.released.length) {
      lines.push(`   Released: ${entry.released.map((piece) => `${piece.team} ${piece.piece}`).join(", ")}`);
    }
    lines.push(`   Farthings: Yellow ${entry.farthings.yellow}, Purple ${entry.farthings.purple}`);
    if (entry.winner) lines.push(`   Result: ${entry.winner} wins${entry.winReason === "homestead" ? " by taking the opposing Homestead" : ""}`);
    return lines.join("\r\n");
  }

  function buildGameLogText() {
    const counts = countControlledFarthings();
    const difficulty = tutorialDemoActive
      ? tutorialDemoLesson === "gothi"
        ? "None (solo tutorial)"
        : tutorialDemoLesson === "movement"
          ? "Stationary pieces"
          : "Easy"
      : computerDifficulty === "hard" ? "Hard" : "Easy";
    const mode = gameMode === "tutorial"
      ? "Gothi Tutorial"
      : gameMode === "tutorial-pieces"
        ? "Raven / Thingman / Outlaw Tutorial"
        : gameMode === "tutorial-final"
          ? "Full Lineup Tutorial"
          : gameMode === "advanced" ? "Advanced" : "Basic";
    const result = winner
      ? `${winner[0].toUpperCase() + winner.slice(1)} wins${winnerReason === "homestead" ? " by taking the opposing Homestead" : ""}`
      : "Game unfinished";
    const setupLines = initialSetup.length
      ? ["Yellow:", ...initialSetup.filter((entry) => entry.team === "yellow").map((entry) => `  ${entry.piece}: ${entry.cellId}`), "", "Purple:", ...initialSetup.filter((entry) => entry.team === "purple").map((entry) => `  ${entry.piece}: ${entry.cellId}`)].join("\r\n")
      : "Setup not finalized.";
    const moves = moveHistory.length
      ? moveHistory.map(formatGameLogEntry).join("\r\n\r\n")
      : "No moves recorded.";
    return [
      "GOTHI GAME LOG",
      "===============",
      `Started: ${gameStartedAt ? gameStartedAt.toLocaleString() : "Unknown"}`,
      `Saved: ${new Date().toLocaleString()}`,
      `Game mode: ${mode}`,
      `Computer difficulty: ${difficulty}`,
      `Result: ${result}`,
      `Final Farthings: Yellow ${counts.yellow}, Purple ${counts.purple}`,
      "",
      "SETUP",
      "-----",
      setupLines,
      "",
      "MOVES",
      "-----",
      moves,
      "",
    ].join("\r\n");
  }

  function saveGameLog() {
    const blob = new Blob([buildGameLogText()], { type: "text/plain;charset=utf-8" });
    const downloadUrl = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    downloadLink.href = downloadUrl;
    downloadLink.download = `gothi-game-${timestamp}.txt`;
    document.body.append(downloadLink);
    downloadLink.click();
    downloadLink.remove();
    URL.revokeObjectURL(downloadUrl);
  }

  function startNewGame() {
    hideVictoryPopup();
    movementAnimationToken += 1;
    pieceAnimating = false;
    movingPiece = null;
    resetPieces();
    tutorialDemoActive = false;
    tutorialDemoLesson = null;
    tutorialMenu.hidden = true;
    purpleScoreRow.hidden = false;
    computerDifficultyRow.hidden = false;
    moveHistory.length = 0;
    moveNumber = 0;
    gameStartedAt = new Date();
    renderMoveHistory();
    computerDifficulty = document.querySelector('input[name="difficulty"]:checked')?.value || "easy";
    computerDifficultyOutput.textContent = computerDifficulty === "hard" ? "Hard" : "Easy";
    gameMode = document.querySelector('input[name="game-mode"]:checked')?.value || "basic";
    gameModeOutput.textContent = gameMode === "advanced" ? "Advanced" : "Basic";
    currentTurn = "yellow";
    winner = null;
    winnerReason = null;
    reviewingFinalBoard = false;
    boardReviewActions.hidden = true;
    restartGameButton.hidden = false;
    computerThinking = false;
    if (computerTurnTimer) clearTimeout(computerTurnTimer);
    computerTurnTimer = null;
    gameStarted = true;
    hoverCell = null;
    hoverPiece = null;
    setupSelectedPiece = null;
    setupPhase = gameMode === "advanced" ? "yellow" : null;
    confirmSetupButton.hidden = gameMode !== "advanced";
    confirmSetupButton.disabled = false;
    initialSetup = [];
    if (gameMode === "basic") captureInitialSetup();
    clearSelection();
    menu.hidden = true;
    workspace.hidden = false;
    updateGameStatus();
    updateReadout(null);
    requestAnimationFrame(() => {
      resizeCanvas();
      canvas.focus();
    });
  }

  function startGothiTutorialGame() {
    hideVictoryPopup();
    movementAnimationToken += 1;
    pieceAnimating = false;
    movingPiece = null;
    resetGothiTutorialPieces();
    tutorialDemoActive = true;
    tutorialDemoLesson = "gothi";
    moveHistory.length = 0;
    moveNumber = 0;
    gameStartedAt = new Date();
    renderMoveHistory();
    computerDifficulty = "easy";
    computerDifficultyOutput.textContent = "None";
    gameMode = "tutorial";
    gameModeOutput.textContent = "Gothi Tutorial";
    currentTurn = "yellow";
    winner = null;
    winnerReason = null;
    reviewingFinalBoard = false;
    boardReviewActions.hidden = true;
    restartGameButton.hidden = false;
    computerThinking = false;
    if (computerTurnTimer) clearTimeout(computerTurnTimer);
    computerTurnTimer = null;
    gameStarted = true;
    hoverCell = null;
    hoverPiece = null;
    setupSelectedPiece = null;
    setupPhase = null;
    confirmSetupButton.hidden = true;
    initialSetup = [];
    captureInitialSetup();
    clearSelection();
    menu.hidden = true;
    tutorialMenu.hidden = true;
    purpleScoreRow.hidden = true;
    computerDifficultyRow.hidden = true;
    workspace.hidden = false;
    updateGameStatus();
    gameMessage.textContent = "Solo Gothi lesson: move into position and claim the empty Purple Homestead.";
    updateReadout(null);
    requestAnimationFrame(() => {
      resizeCanvas();
      canvas.focus();
    });
  }

  function startMovementTutorialGame() {
    hideVictoryPopup();
    movementAnimationToken += 1;
    pieceAnimating = false;
    movingPiece = null;
    resetMovementTutorialPieces();
    tutorialDemoActive = true;
    tutorialDemoLesson = "movement";
    moveHistory.length = 0;
    moveNumber = 0;
    gameStartedAt = new Date();
    renderMoveHistory();
    computerDifficulty = "easy";
    computerDifficultyOutput.textContent = "Stationary";
    gameMode = "tutorial-pieces";
    gameModeOutput.textContent = "Piece Tutorial";
    currentTurn = "yellow";
    winner = null;
    winnerReason = null;
    reviewingFinalBoard = false;
    boardReviewActions.hidden = true;
    restartGameButton.hidden = false;
    computerThinking = false;
    if (computerTurnTimer) clearTimeout(computerTurnTimer);
    computerTurnTimer = null;
    gameStarted = true;
    hoverCell = null;
    hoverPiece = null;
    setupSelectedPiece = null;
    setupPhase = null;
    confirmSetupButton.hidden = true;
    initialSetup = [];
    captureInitialSetup();
    clearSelection();
    menu.hidden = true;
    tutorialMenu.hidden = true;
    purpleScoreRow.hidden = false;
    computerDifficultyRow.hidden = false;
    workspace.hidden = false;
    updateGameStatus();
    gameMessage.textContent = "Practice Raven, Thingman, and Outlaw movement. Purple pieces are stationary.";
    updateReadout(null);
    requestAnimationFrame(() => {
      resizeCanvas();
      canvas.focus();
    });
  }

  function startStorgothiTutorialGame() {
    hideVictoryPopup();
    movementAnimationToken += 1;
    pieceAnimating = false;
    movingPiece = null;
    resetStorgothiTutorialPieces();
    tutorialDemoActive = true;
    tutorialDemoLesson = "storgothi";
    moveHistory.length = 0;
    moveNumber = 0;
    gameStartedAt = new Date();
    renderMoveHistory();
    computerDifficulty = "easy";
    computerDifficultyOutput.textContent = "Easy";
    gameMode = "tutorial-final";
    gameModeOutput.textContent = "Final Tutorial";
    currentTurn = "yellow";
    winner = null;
    winnerReason = null;
    reviewingFinalBoard = false;
    boardReviewActions.hidden = true;
    restartGameButton.hidden = false;
    computerThinking = false;
    if (computerTurnTimer) clearTimeout(computerTurnTimer);
    computerTurnTimer = null;
    gameStarted = true;
    hoverCell = null;
    hoverPiece = null;
    setupSelectedPiece = null;
    setupPhase = null;
    confirmSetupButton.hidden = true;
    initialSetup = [];
    captureInitialSetup();
    clearSelection();
    menu.hidden = true;
    tutorialMenu.hidden = true;
    purpleScoreRow.hidden = false;
    computerDifficultyRow.hidden = false;
    workspace.hidden = false;
    updateGameStatus();
    gameMessage.textContent = "Final lesson: face Purple's Basic setup with two Gothi removed on Easy.";
    updateReadout(null);
    requestAnimationFrame(() => {
      resizeCanvas();
      canvas.focus();
    });
  }

  function replayCurrentGame() {
    if (tutorialDemoLesson === "gothi") startGothiTutorialGame();
    else if (tutorialDemoLesson === "movement") startMovementTutorialGame();
    else if (tutorialDemoLesson === "storgothi") startStorgothiTutorialGame();
    else startNewGame();
  }

  function showMainMenu() {
    hideVictoryPopup();
    movementAnimationToken += 1;
    pieceAnimating = false;
    movingPiece = null;
    if (computerTurnTimer) clearTimeout(computerTurnTimer);
    computerTurnTimer = null;
    computerThinking = false;
    gameStarted = false;
    tutorialDemoActive = false;
    tutorialDemoLesson = null;
    tutorialMenu.hidden = true;
    purpleScoreRow.hidden = false;
    computerDifficultyRow.hidden = false;
    reviewingFinalBoard = false;
    boardReviewActions.hidden = true;
    restartGameButton.hidden = false;
    setupPhase = null;
    setupSelectedPiece = null;
    confirmSetupButton.hidden = true;
    clearSelection();
    workspace.hidden = true;
    menu.hidden = false;
    updateReadout(null);
    newGameButton.focus();
  }

  function snapshotPieceState() {
    return pieces.map((piece) => ({
      piece,
      q: piece.q,
      row: piece.row,
      x: piece.x,
      y: piece.y,
      moveCount: piece.moveCount,
      coveredBy: piece.coveredBy,
    }));
  }

  function restorePieceState(snapshot) {
    snapshot.forEach((state) => {
      state.piece.q = state.q;
      state.piece.row = state.row;
      state.piece.x = state.x;
      state.piece.y = state.y;
      state.piece.moveCount = state.moveCount;
      state.piece.coveredBy = state.coveredBy;
    });
  }

  function applySimulatedMove(piece, destination, isCapture) {
    const defender = isCapture ? getPieceAtCell(destination) : null;
    pieces.filter((candidate) => candidate.coveredBy === piece.id).forEach((candidate) => {
      candidate.coveredBy = null;
    });
    piece.q = destination.q;
    piece.row = destination.row;
    piece.x = destination.x;
    piece.y = destination.y;
    piece.moveCount += 1;
    if (defender) defender.coveredBy = piece.id;
    return defender;
  }

  function developmentValue(piece) {
    if (piece.coveredBy || piece.moveCount === 0) return 0;
    const home = piece.team === "purple" ? "North Farthing" : "South Farthing";
    const cell = getCell(piece.q, piece.row);
    let value = piece.type === "gothi" ? 24 : 10;
    if (piece.type === "gothi" && cell?.farthing !== home) value += 14;
    value -= Math.max(0, piece.moveCount - 1) * 5;
    return value;
  }

  function homesteadPivotWeight() {
    const activePieces = pieces.filter((piece) => !piece.coveredBy).length;
    return Math.max(0, Math.min(1, (18 - activePieces) / 8));
  }

  function homesteadApproachValue(team) {
    const targetFarthing = team === "purple" ? "South Farthing" : "North Farthing";
    const targetCells = cells.filter((cell) => cell.farthing === targetFarthing);
    if (!targetCells.length) return 0;
    return pieces
      .filter((piece) => piece.team === team && !piece.coveredBy)
      .reduce((total, piece) => {
        const distance = Math.min(...targetCells.map((cell) =>
          Math.hypot(piece.x - cell.x, piece.y - cell.y) / ROW_STEP
        ));
        return total + (CONTROL_VALUES[piece.type] || 1) * Math.max(0, 10 - distance);
      }, 0);
  }

  function evaluateStrategicPosition() {
    const counts = countControlledFarthings();
    const control = calculateFarthingControl();
    const heart = control.get("Heart Farthing");
    let score = counts.purple * 160 - counts.yellow * 150;

    if (counts.purple >= 5) score += 100000;
    if (counts.yellow >= 5) score -= 100000;
    if (controlsOpposingHomestead("purple", control)) score += 100000;
    if (controlsOpposingHomestead("yellow", control)) score -= 100000;

    if (heart?.controller === "purple") score += 80;
    if (heart?.controller === "yellow") score -= 100;
    if (heart) score += (heart.purple - heart.yellow) * 14;

    control.forEach((state, territory) => {
      if (!territory.endsWith("Edge Territory")) {
        score += (state.purple - state.yellow) * 4;
      }
    });

    const edgeMultiplier = heart?.controller === "yellow" ? 1.5 : 1;
    ["West Edge Territory", "East Edge Territory"].forEach((territory) => {
      const controller = control.get(territory)?.controller;
      if (controller === "purple") score += 26 * edgeMultiplier;
      if (controller === "yellow") score -= 30 * edgeMultiplier;
    });

    const openingWeight = Math.max(0, 1 - moveHistory.length / 10);
    if (openingWeight > 0) {
      pieces.filter((piece) => !piece.coveredBy).forEach((piece) => {
        const value = developmentValue(piece) * openingWeight;
        score += piece.team === "purple" ? value : -value;
        if (piece.moveCount === 0 && piece.type === "gothi") {
          score += piece.team === "purple" ? -14 * openingWeight : 14 * openingWeight;
        }
      });
    }

    const homesteadWeight = homesteadPivotWeight();
    if (homesteadWeight > 0) {
      const approachBalance = homesteadApproachValue("purple") - homesteadApproachValue("yellow");
      const south = control.get("South Farthing");
      const north = control.get("North Farthing");
      const controlPressure =
        ((south?.purple || 0) - (south?.yellow || 0)) -
        ((north?.yellow || 0) - (north?.purple || 0));
      score += approachBalance * 24 * homesteadWeight;
      score += controlPressure * 28 * homesteadWeight;
    }
    return score;
  }

  function scoreComputerMove(piece, destination, isCapture) {
    const snapshot = snapshotPieceState();
    const defender = applySimulatedMove(piece, destination, isCapture);
    const control = calculateFarthingControl();
    const destinationState = destination.farthing ? control.get(destination.farthing) : null;
    let score = evaluateStrategicPosition();
    if (defender) score += (CONTROL_VALUES[defender.type] || 1) * 30;
    if (destinationState?.controller === "purple") score += 20;
    if (!destination.farthing) score -= 12;
    score += (destination.y / MAP_HEIGHT) * 8;
    restorePieceState(snapshot);
    return score;
  }

  function getMoveCandidates(team, scoreMoves = false) {
    const candidates = [];
    pieces.filter((piece) => piece.team === team && !piece.coveredBy).forEach((piece) => {
      const moves = getLegalMoves(piece);
      const captures = new Set(captureMoves);
      moves.forEach((cellId) => {
        const destination = cells.find((cell) => cell.id === cellId);
        if (!destination) return;
        const isCapture = captures.has(cellId);
        candidates.push({
          piece,
          destination,
          isCapture,
          score: scoreMoves ? scoreComputerMove(piece, destination, isCapture) : 0,
        });
      });
    });
    clearSelection();
    return candidates;
  }

  function getComputerMoveCandidates() {
    return getMoveCandidates("purple", true).sort((a, b) =>
      b.score - a.score || a.piece.id.localeCompare(b.piece.id) || a.destination.id.localeCompare(b.destination.id)
    );
  }

  function scoreHardComputerMove(candidate) {
    const beforePurpleMove = snapshotPieceState();
    applySimulatedMove(candidate.piece, candidate.destination, candidate.isCapture);
    const immediateScore = evaluateStrategicPosition();
    if (getVictoryReason("purple", countControlledFarthings())) {
      restorePieceState(beforePurpleMove);
      return 1000000 + candidate.score;
    }

    const afterPurpleMove = snapshotPieceState();
    const yellowReplies = getMoveCandidates("yellow");
    let worstReplyScore = immediateScore;
    if (yellowReplies.length) {
      worstReplyScore = Infinity;
      yellowReplies.forEach((reply) => {
        restorePieceState(afterPurpleMove);
        applySimulatedMove(reply.piece, reply.destination, reply.isCapture);
        worstReplyScore = Math.min(worstReplyScore, evaluateStrategicPosition());
      });
    }

    restorePieceState(beforePurpleMove);
    return immediateScore * 0.3 + worstReplyScore * 0.7 + candidate.score * 0.15;
  }

  function findImmediateComputerWin(candidates) {
    for (const candidate of candidates) {
      const snapshot = snapshotPieceState();
      applySimulatedMove(candidate.piece, candidate.destination, candidate.isCapture);
      const reason = getVictoryReason("purple", countControlledFarthings());
      restorePieceState(snapshot);
      if (reason) {
        candidate.winningReason = reason;
        return candidate;
      }
    }
    return null;
  }

  function chooseHardComputerMove(candidates) {
    const immediateWin = findImmediateComputerWin(candidates);
    if (immediateWin) return immediateWin;
    const shortlist = [...candidates];
    shortlist.forEach((candidate) => {
      candidate.hardScore = scoreHardComputerMove(candidate);
    });
    clearSelection();
    return shortlist.sort((a, b) =>
      b.hardScore - a.hardScore || b.score - a.score || a.piece.id.localeCompare(b.piece.id) || a.destination.id.localeCompare(b.destination.id)
    )[0];
  }
  function chooseEasyComputerMove(candidates) {
    if (!candidates.length) return null;
    const immediateWin = findImmediateComputerWin(candidates);
    if (immediateWin) return immediateWin;

    // Easy still makes imperfect choices, but now favors the stronger portion
    // of its scored moves instead of choosing uniformly from every legal move.

    const favoredCount = Math.max(3, Math.ceil(candidates.length * 0.4));
    const pool = Math.random() < 0.65 ? candidates.slice(0, favoredCount) : candidates;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function performComputerTurn() {
    computerTurnTimer = null;
    if (!gameStarted || winner || currentTurn !== "purple") {
      computerThinking = false;
      return;
    }

    const candidates = getComputerMoveCandidates();
    const move = computerDifficulty === "hard"
      ? chooseHardComputerMove(candidates)
      : chooseEasyComputerMove(candidates);
    if (!move) {
      computerThinking = false;
      recordPass("purple");
      currentTurn = "yellow";
      nameOutput.textContent = "Purple passes";
      detailOutput.textContent = "Yellow to move.";
      updateGameStatus();
      draw();
      return;
    }

    computerThinking = false;
    selectedPiece = move.piece;
    legalMoves = getLegalMoves(move.piece);
    moveSelectedPiece(move.destination);
    draw();
  }

  function queueComputerTurn() {
    if (!gameStarted || winner || setupPhase || currentTurn !== "purple") return;
    computerThinking = true;
    clearSelection();
    updateGameStatus();
    updateReadout(null);
    draw();
    if (computerTurnTimer) clearTimeout(computerTurnTimer);
    computerTurnTimer = setTimeout(performComputerTurn, 650);
  }

  function selectPiece(piece) {
    if (!gameStarted || winner || setupPhase || computerThinking || pieceAnimating || currentTurn !== "yellow" || !piece || piece.coveredBy || piece.team !== "yellow") return false;
    selectedPiece = piece;
    legalMoves = getLegalMoves(piece);
    updateReadout(getCell(piece.q, piece.row), piece);
    return true;
  }

  function animatePieceTo(piece, destination, onComplete) {
    const token = ++movementAnimationToken;
    const startX = piece.x;
    const startY = piece.y;
    const startedAt = performance.now();
    const duration = 220;

    function animationFrame(timestamp) {
      if (token !== movementAnimationToken) return;
      const elapsed = (Number.isFinite(timestamp) ? timestamp : performance.now()) - startedAt;
      const progress = Math.min(1, Math.max(0, elapsed / duration));
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      piece.x = startX + (destination.x - startX) * easedProgress;
      piece.y = startY + (destination.y - startY) * easedProgress;
      draw();
      if (progress < 1) requestAnimationFrame(animationFrame);
      else onComplete();
    }

    requestAnimationFrame(animationFrame);
  }

  function moveSelectedPiece(destination) {
    if (!gameStarted || winner || setupPhase || pieceAnimating || !selectedPiece || !legalMoves.has(destination.id)) return false;
    const mover = selectedPiece;
    const origin = getCell(mover.q, mover.row);
    const capturedPiece = captureMoves.has(destination.id) ? getPieceAtCell(destination) : null;
    const releasedPieces = pieces.filter((piece) => piece.coveredBy === mover.id);

    releasedPieces.forEach((piece) => {
      piece.coveredBy = null;
    });
    clearSelection();
    hoverPiece = null;
    pieceAnimating = true;
    movingPiece = mover;
    nameOutput.textContent = `${mover.name} moving`;
    detailOutput.textContent = `${cellLogName(origin)} → ${cellLogName(destination)}.`;
    updateGameStatus();

    animatePieceTo(mover, destination, () => {
      if (!gameStarted) return;
      mover.q = destination.q;
      mover.row = destination.row;
      mover.x = destination.x;
      mover.y = destination.y;
      mover.moveCount += 1;
      if (capturedPiece) capturedPiece.coveredBy = mover.id;

      pieceAnimating = false;
      movingPiece = null;
      const counts = countControlledFarthings();
      const control = calculateFarthingControl();
      winnerReason = getVictoryReason(mover.team, counts, control);
      winner = winnerReason ? mover.team : null;
      recordMove(mover, origin, destination, capturedPiece, releasedPieces, counts);
      if (winner) {
        const team = winner[0].toUpperCase() + winner.slice(1);
        nameOutput.textContent = `${team} wins!`;
        detailOutput.textContent = `${victoryDescription(winner, counts)}.`;
      } else {
        const keepsYellowTurn = tutorialDemoLesson === "gothi" || tutorialDemoLesson === "movement";
        currentTurn = keepsYellowTurn ? "yellow" : currentTurn === "yellow" ? "purple" : "yellow";
        nameOutput.textContent = capturedPiece ? `${mover.name} pinned ${capturedPiece.name}` : `${mover.name} moved`;
        detailOutput.textContent = `${turnName()} to move.`;
      }
      updateGameStatus();
      if (winner) showVictoryPopup(counts);
      if (!winner && currentTurn === "purple") queueComputerTurn();
      draw();
    });
    return true;
  }
  function findDirectionalCell(origin, key) {
    const direction = {
      ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1],
    }[key];
    if (!direction) return origin;
    return cells.filter((cell) => {
      const dx = cell.x - origin.x;
      const dy = cell.y - origin.y;
      return dx * direction[0] + dy * direction[1] > 1;
    }).sort((a, b) => {
      const aParallel = Math.abs((a.x - origin.x) * direction[0] + (a.y - origin.y) * direction[1]);
      const bParallel = Math.abs((b.x - origin.x) * direction[0] + (b.y - origin.y) * direction[1]);
      const aPerpendicular = Math.abs((a.x - origin.x) * direction[1] - (a.y - origin.y) * direction[0]);
      const bPerpendicular = Math.abs((b.x - origin.x) * direction[1] - (b.y - origin.y) * direction[0]);
      return aParallel + aPerpendicular * 1.8 - (bParallel + bPerpendicular * 1.8);
    })[0] || origin;
  }

  function findPiece(point) {
    return pieces.find((piece) => !piece.coveredBy && Math.abs(point.x - piece.x) < 42 && Math.abs(point.y - piece.y) < 50) || null;
  }

  function findHoverPiece(point) {
    const topPieces = pieces.filter((piece) => !piece.coveredBy);
    for (const topPiece of topPieces) {
      const stack = getStackBelow(topPiece);
      if (stack.length) {
        const markerX = topPiece.x + 29;
        const markerTop = topPiece.y - 18;
        const markerBottom = topPiece.y + (stack.length - 1) * 16 + 18;
        if (Math.abs(point.x - markerX) <= 18 && point.y >= markerTop && point.y <= markerBottom) {
          const layer = point.y <= topPiece.y + 17
            ? 0
            : Math.min(stack.length - 1, Math.ceil((point.y - topPiece.y - 17) / 16));
          return stack[layer];
        }
      }

      const topPieceX = topPiece.x - (stack.length ? 13 : 0);
      if (Math.abs(point.x - topPieceX) < 42 && Math.abs(point.y - topPiece.y) < 50) {
        return topPiece;
      }
    }
    return null;
  }

  function hidePieceTooltip() {
    pieceTooltip.hidden = true;
    pieceTooltip.setAttribute("aria-hidden", "true");
  }

  function showPieceTooltip(piece, event) {
    if (!piece) {
      hidePieceTooltip();
      return;
    }
    pieceTooltipName.textContent = piece.name;
    pieceTooltipControl.textContent = String(CONTROL_VALUES[piece.type] || 1);
    pieceTooltip.classList.toggle("yellow", piece.team === "yellow");
    pieceTooltip.classList.toggle("purple", piece.team === "purple");
    pieceTooltip.hidden = false;
    pieceTooltip.setAttribute("aria-hidden", "false");

    const frameRect = frame.getBoundingClientRect();
    const pointerX = event.clientX - frameRect.left;
    const pointerY = event.clientY - frameRect.top;
    const gap = 14;
    let left = pointerX + gap;
    let top = pointerY - pieceTooltip.offsetHeight - 10;
    if (left + pieceTooltip.offsetWidth > frameRect.width - 8) {
      left = pointerX - pieceTooltip.offsetWidth - gap;
    }
    top = Math.max(8, Math.min(top, frameRect.height - pieceTooltip.offsetHeight - 8));
    pieceTooltip.style.left = `${left}px`;
    pieceTooltip.style.top = `${top}px`;
  }

  function updateReadout(cell, piece = null) {
    if (!gameStarted) {
      nameOutput.textContent = "Start a new game";
      detailOutput.textContent = "Choose New Game from the main menu.";
      return;
    }
    if (winner) {
      const team = winner[0].toUpperCase() + winner.slice(1);
      const counts = countControlledFarthings();
      nameOutput.textContent = `${team} wins!`;
      detailOutput.textContent = `${victoryDescription(winner, counts)}.`;
      return;
    }
    if (setupPhase === "yellow") {
      nameOutput.textContent = setupSelectedPiece ? `${setupSelectedPiece.name} selected` : "Arrange Yellow's army";
      detailOutput.textContent = setupSelectedPiece ? "Choose another Yellow piece to swap their starting spaces." : "Select two Yellow pieces to swap them, then confirm your setup.";
      return;
    }
    if (setupPhase === "purple") {
      nameOutput.textContent = "Purple is responding";
      detailOutput.textContent = "The computer is arranging its army after seeing Yellow's formation.";
      return;
    }
    if (pieceAnimating && movingPiece) {
      nameOutput.textContent = `${movingPiece.name} moving`;
      detailOutput.textContent = "The move will finish in a moment.";
      return;
    }
    if (computerThinking) {
      nameOutput.textContent = "Purple is thinking";
      detailOutput.textContent = "The computer is choosing its move.";
      return;
    }
    if (piece) {
      const team = piece.team[0].toUpperCase() + piece.team.slice(1);
      nameOutput.textContent = `${piece.name} · ${team} player`;
      if (piece.coveredBy) {
        detailOutput.textContent = `Covered in this stack. Control ${CONTROL_VALUES[piece.type] || 1} is inactive until released.`;
      } else if (piece.team !== currentTurn) {
        detailOutput.textContent = `${turnName()} to move. Only ${turnName()} pieces can be selected.`;
      } else if (piece !== selectedPiece) {
        detailOutput.textContent = `Select this piece to see its legal moves.`;
      } else if (piece.type === "thingman") {
        detailOutput.textContent = `${legalMoves.size} destinations are reachable in one or two steps (${captureMoves.size} captures).`;
      } else if (piece.type === "outlaw" || piece.type === "storgothi") {
        detailOutput.textContent = `${legalMoves.size} destinations are reachable along straight lines (${captureMoves.size} captures).`;
      } else if (piece.type === "raven") {
        detailOutput.textContent = `${legalMoves.size} destinations are reachable by a one-space step or two-space jump, including water (${captureMoves.size} captures).`;
      } else if (piece.type === "gothi") {
        detailOutput.textContent = `${legalMoves.size} destinations are reachable by one step or an unobstructed two-space straight move (${captureMoves.size} one-step captures).`;
      }
      return;
    }
    if (selectedPiece && cell && legalMoves.has(cell.id)) {
      const isCapture = captureMoves.has(cell.id);
      nameOutput.textContent = isCapture ? `Capture with ${selectedPiece.name}` : `Legal ${selectedPiece.name} move`;
      detailOutput.textContent = `${cell.farthing || cell.terrain} · ${cell.id}. ${isCapture ? "Select to cover the enemy piece." : "Select to move here."}`;
      return;
    }
    if (!cell) {
      nameOutput.textContent = `${turnName()} to move`;
      detailOutput.textContent = `Select a ${turnName()} piece.`;
      return;
    }
    nameOutput.textContent = `${cell.farthing || cell.terrain} · ${cell.id}`;
    detailOutput.textContent = describeFarthingControl(cell);
  }

  canvas.addEventListener("pointermove", (event) => {
    const point = eventPoint(event);
    hoverCell = findCell(point);
    hoverPiece = findHoverPiece(point);
    showPieceTooltip(hoverPiece, event);
    if (selectedPiece && hoverCell && legalMoves.has(hoverCell.id)) updateReadout(hoverCell);
    else if (!selectedPiece) updateReadout(hoverCell, hoverPiece);
    const hoverPieceIsActive = hoverPiece && !hoverPiece.coveredBy;
    const setupPiece = setupPhase === "yellow" && hoverPieceIsActive && hoverPiece.team === "yellow";
    const currentPiece = !setupPhase && !computerThinking && !pieceAnimating && currentTurn === "yellow" && hoverPieceIsActive && hoverPiece.team === "yellow";
    canvas.style.cursor = setupPiece || currentPiece || (hoverCell && legalMoves.has(hoverCell.id)) ? "pointer" : "default";
    draw();
  });
  canvas.addEventListener("pointerleave", () => {
    hoverCell = null;
    hoverPiece = null;
    hidePieceTooltip();
    if (selectedPiece) updateReadout(getCell(selectedPiece.q, selectedPiece.row), selectedPiece);
    else updateReadout(null);
    draw();
  });
  canvas.addEventListener("click", (event) => {
    if (winner || computerThinking || pieceAnimating) return;
    const point = eventPoint(event);
    const clickedCell = findCell(point);
    const clickedPiece = findPiece(point);

    if (setupPhase === "yellow") {
      if (clickedPiece) handleAdvancedSetupPiece(clickedPiece);
      else {
        setupSelectedPiece = null;
        updateReadout(null);
      }
      draw();
      return;
    }

    // A legal destination takes priority over the piece occupying it so clicking
    // an enemy on a red dot completes the capture instead of selecting that enemy.
    if (clickedCell && selectedPiece && legalMoves.has(clickedCell.id)) {
      moveSelectedPiece(clickedCell);
    } else if (clickedPiece?.team === currentTurn) {
      if (clickedPiece === selectedPiece) {
        clearSelection();
        updateReadout(null);
      } else {
        selectPiece(clickedPiece);
      }
    } else if (clickedPiece) {
      nameOutput.textContent = `${turnName()} to move`;
      detailOutput.textContent = `Only ${turnName()} pieces can be selected.`;
    } else {
      clearSelection();
      updateReadout(null);
    }
    draw();
  });
  canvas.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Enter", " "].includes(event.key)) return;
    event.preventDefault();
    if (winner || computerThinking || pieceAnimating) return;
    if (setupPhase) return;

    if (event.key === "Enter" || event.key === " ") {
      if (!(hoverCell && selectedPiece && moveSelectedPiece(hoverCell))) {
        const piece = getPieceAtCell(hoverCell);
        if (!selectPiece(piece) && piece) {
          nameOutput.textContent = `${turnName()} to move`;
          detailOutput.textContent = `Only ${turnName()} pieces can be selected.`;
        }
      }
    } else {
      if (!hoverCell) hoverCell = getCell(0, currentTurn === "yellow" ? 8 : 0);
      else hoverCell = findDirectionalCell(hoverCell, event.key);
      hoverPiece = getPieceAtCell(hoverCell);
      if (selectedPiece && legalMoves.has(hoverCell.id)) updateReadout(hoverCell);
      else updateReadout(hoverCell, hoverPiece);
    }
    draw();
  });
  newGameButton.addEventListener("click", startNewGame);
  tutorialButton.addEventListener("click", openTutorial);
  tutorialBackButton.addEventListener("click", () => showTutorialSlide(tutorialSlideIndex - 1));
  tutorialNextButton.addEventListener("click", () => {
    if (tutorialSlideIndex === 1) startGothiTutorialGame();
    else if (tutorialSlideIndex === 4) startMovementTutorialGame();
    else if (tutorialSlideIndex === tutorialSlides.length - 1) startStorgothiTutorialGame();
    else showTutorialSlide(tutorialSlideIndex + 1);
  });
  tutorialMenuButton.addEventListener("click", showMainMenu);
  tutorialContinueButton.addEventListener("click", continueTutorialAfterDemo);
  restartGameButton.addEventListener("click", showMainMenu);
  winnerNewGameButton.addEventListener("click", replayCurrentGame);
  winnerMenuButton.addEventListener("click", showMainMenu);
  viewBoardButton.addEventListener("click", viewFinalBoard);
  reviewMenuButton.addEventListener("click", showMainMenu);
  saveGameLogButton.addEventListener("click", saveGameLog);
  confirmSetupButton.addEventListener("click", confirmAdvancedSetup);

  toggle.addEventListener("click", () => {
    gridVisible = !gridVisible;
    toggle.setAttribute("aria-pressed", String(gridVisible));
    toggle.textContent = gridVisible ? "Hide grid" : "Show grid";
    draw();
  });

  new ResizeObserver(resizeCanvas).observe(frame);
  updateReadout(null);
  resizeCanvas();
})();
