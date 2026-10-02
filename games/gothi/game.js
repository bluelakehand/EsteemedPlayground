(() => {
  "use strict";

  const Engine = window.GothiEngine;
  if (!Engine) throw new Error("GOTHI rules engine failed to load.");
  const AI = window.GothiAI;
  if (!AI) throw new Error("GOTHI AI module failed to load.");

  const canvas = document.querySelector("#board-grid");
  const frame = document.querySelector("#board-frame");
  const toggle = document.querySelector("#grid-toggle");
  const nameOutput = document.querySelector("#space-name");
  const detailOutput = document.querySelector("#space-detail");
  const menu = document.querySelector("#main-menu");
  const workspace = document.querySelector("#board-workspace");
  const newGameButton = document.querySelector("#new-game-button");
  const botModeButton = document.querySelector("#bot-mode-button");
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
  const yellowTeamLabel = document.querySelector("#yellow-team-label");
  const purpleTeamLabel = document.querySelector("#purple-team-label");
  const gameMessage = document.querySelector("#game-message");
  const computerDifficultyOutput = document.querySelector("#computer-difficulty");
  const computerDifficultyRow = document.querySelector("#computer-difficulty-row");
  const computerDifficultyLabel = document.querySelector("#computer-difficulty-label");
  const gameModeOutput = document.querySelector("#game-mode-output");
  const confirmSetupButton = document.querySelector("#confirm-setup-button");
  const botModeControls = document.querySelector("#bot-mode-controls");
  const botAutoplayButton = document.querySelector("#bot-autoplay-button");
  const botNextTurnButton = document.querySelector("#bot-next-turn-button");
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
  const BOT_TURN_DELAY = 4000;
  const cells = [];
  const pieceImages = new Map();
  const PATTERN_COLUMNS = Engine.PATTERN_COLUMNS;
  const PATTERN_COLORS = {
    G: "#68752f",
    C: "#2d2c2c",
    Y: "#b7cdd2",
    B: "#18aeb8",
    R: "#b58c70",
    P: "#58344f",
  };
  const CONTROL_VALUES = Engine.CONTROL_VALUES;
  const CONTROL_STYLES = {
    yellow: { stroke: "#ffd84a", tint: "rgba(255,216,74,.19)" },
    purple: { stroke: "#c57aff", tint: "rgba(197,122,255,.2)" },
  };

  const northFormation = Engine.NORTH_FORMATION;
  const southFormation = Engine.SOUTH_FORMATION;
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
  const computerTeams = new Set(["purple"]);
  let botAutoplay = false;
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

  function difficultyName(value = computerDifficulty) {
    if (value === "very-easy") return "Very Easy";
    return value === "hard" ? "Hard" : "Easy";
  }

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

  Engine.BOARD.forEach((engineCell) => {
    const { x, y } = cellCenter(engineCell.q, engineCell.row);
    cells.push({ ...engineCell, x, y });
  });
  function getCellColor(cell) {
    return PATTERN_COLORS[cell.patternType];
  }

  function calculateFarthingControl() {
    return Engine.calculateFarthingControl({ pieces });
  }

  function countControlledFarthings() {
    const control = calculateFarthingControl();
    return Engine.countControlledFarthings({ pieces }, control);
  }

  function controlsOpposingHomestead(team, control = calculateFarthingControl()) {
    return Engine.controlsOpposingHomestead({ pieces }, team, control);
  }

  function getVictoryReason(team, counts, control = calculateFarthingControl()) {
    return Engine.getVictoryReason({ pieces }, team, counts, control);
  }

  function victoryDescription(team, counts) {
    const teamName = team[0].toUpperCase() + team.slice(1);
    return winnerReason === "homestead"
      ? `${teamName} controls the opposing Homestead`
      : `${teamName} controls ${counts[team]} Farthings`;
  }

  function configureComputerTeams(...teams) {
    computerTeams.clear();
    teams.forEach((team) => computerTeams.add(team));
    yellowTeamLabel.textContent = computerTeams.has("yellow") ? "Yellow (Computer)" : "Yellow";
    purpleTeamLabel.textContent = computerTeams.has("purple") ? "Purple (Computer)" : "Purple";
  }

  function shouldAutoQueueComputerTurn() {
    return computerTeams.has(currentTurn) && (gameMode !== "bot" || botAutoplay);
  }

  function updateBotModeControls() {
    const active = gameMode === "bot" && gameStarted && !reviewingFinalBoard;
    botModeControls.hidden = !active;
    if (!active) return;
    botAutoplayButton.textContent = `Autoplay: ${botAutoplay ? "On" : "Off"}`;
    botAutoplayButton.setAttribute("aria-pressed", String(botAutoplay));
    botAutoplayButton.disabled = Boolean(winner);
    botNextTurnButton.disabled = botAutoplay || computerThinking || pieceAnimating || Boolean(winner);
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
      const difficulty = difficultyName();
      gameMessage.textContent = `${turnName()} (${difficulty}) is considering its move…`;
    } else if (gameMode === "bot" && !botAutoplay) {
      gameMessage.textContent = `Bot Mode paused. ${turnName()} is ready; click Next Turn.`;
    } else {
      gameMessage.textContent = `${turnName()} to move.`;
    }
    updateBotModeControls();
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
    updateBotModeControls();
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

  function getLegalMoves(piece) {
    const moves = Engine.getLegalMoves({ pieces }, piece.id);
    captureMoves = new Set(moves.filter((move) => move.capture).map((move) => move.destinationId));
    return new Set(moves.map((move) => move.destinationId));
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
    const chosen = AI.chooseWeightedTopThree(elite) || ranked[0];
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

  function gameRecordTeamName(team) {
    const name = team[0].toUpperCase() + team.slice(1);
    return computerTeams.has(team) ? `${name} (Computer)` : name;
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
      const team = gameRecordTeamName(entry.team);
      title.textContent = entry.kind === "pass" ? `${team} passes` : `${team} ${entry.piece}`;
      const detail = document.createElement("span");
      detail.className = "move-detail";
      if (entry.kind === "pass") {
        detail.textContent = `No legal moves. Farthings: Yellow ${entry.farthings.yellow}, Purple ${entry.farthings.purple}.`;
      } else {
        const events = [`${entry.from.label} → ${entry.to.label}`];
        if (entry.capture) events.push(`Covered ${entry.capture.team} ${entry.capture.piece}`);
        if (entry.stack) events.push(`Stacked on ${entry.stack.team} ${entry.stack.piece}`);
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

  function recordMove(mover, origin, destination, capturedPiece, stackedPiece, releasedPieces, counts) {
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
      stack: stackedPiece ? {
        id: stackedPiece.id,
        team: stackedPiece.team === "purple" ? "Purple" : "Yellow",
        piece: stackedPiece.name,
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
    const team = gameRecordTeamName(entry.team);
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
    if (entry.stack) lines.push(`   Stacked on: ${entry.stack.team} ${entry.stack.piece}`);
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
      : gameMode === "bot"
        ? `${difficultyName()} (both bots)`
        : difficultyName();
    const mode = gameMode === "tutorial"
      ? "Gothi Tutorial"
      : gameMode === "tutorial-pieces"
        ? "Raven / Thingman / Outlaw Tutorial"
        : gameMode === "tutorial-final"
          ? "Full Lineup Tutorial"
          : gameMode === "bot"
            ? "Bot Mode"
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
    botAutoplay = false;
    configureComputerTeams("purple");
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
    computerDifficultyOutput.textContent = difficultyName();
    computerDifficultyLabel.textContent = "Computer";
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

  function startBotGame() {
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
    computerDifficultyOutput.textContent = difficultyName();
    computerDifficultyLabel.textContent = "Bots";
    gameMode = "bot";
    gameModeOutput.textContent = "Bot Mode";
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
    confirmSetupButton.disabled = false;
    initialSetup = [];
    captureInitialSetup();
    clearSelection();
    configureComputerTeams("yellow", "purple");
    botAutoplay = true;
    menu.hidden = true;
    workspace.hidden = false;
    nameOutput.textContent = "Bot Mode";
    detailOutput.textContent = "Autoplay is on. Each bot waits four seconds before moving.";
    updateGameStatus();
    queueComputerTurn();
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
    botAutoplay = false;
    configureComputerTeams();
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
    botAutoplay = false;
    configureComputerTeams();
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
    botAutoplay = false;
    configureComputerTeams("purple");
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
    else if (gameMode === "bot") startBotGame();
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
    botAutoplay = false;
    configureComputerTeams("purple");
    gameMode = "basic";
    computerDifficultyLabel.textContent = "Computer";
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
    updateBotModeControls();
    updateReadout(null);
    newGameButton.focus();
  }

  function setBotAutoplay(enabled) {
    if (gameMode !== "bot" || winner) return;
    botAutoplay = Boolean(enabled);
    if (!botAutoplay && computerTurnTimer) {
      clearTimeout(computerTurnTimer);
      computerTurnTimer = null;
      computerThinking = false;
    }
    updateGameStatus();
    updateReadout(null);
    draw();
    if (botAutoplay && !pieceAnimating && !computerThinking) queueComputerTurn();
  }

  function advanceBotTurn() {
    if (gameMode !== "bot" || botAutoplay || winner || computerThinking || pieceAnimating) return;
    queueComputerTurn(0);
  }

  function performComputerTurn() {
    computerTurnTimer = null;
    const team = currentTurn;
    if (!gameStarted || winner || !computerTeams.has(team)) {
      computerThinking = false;
      return;
    }

    const state = Engine.createState({
      pieces,
      currentTurn: team,
      winner,
      winnerReason,
      turnNumber: moveNumber,
    });
    const move = AI.chooseMove(state, {
      team,
      difficulty: computerDifficulty,
    });
    if (!move) {
      computerThinking = false;
      recordPass(team);
      currentTurn = AI.opponentOf(team);
      const teamName = team[0].toUpperCase() + team.slice(1);
      nameOutput.textContent = `${teamName} passes`;
      detailOutput.textContent = `${turnName()} to move.`;
      updateGameStatus();
      draw();
      if (shouldAutoQueueComputerTurn()) queueComputerTurn();
      return;
    }

    const piece = pieces.find((candidate) => candidate.id === move.pieceId);
    const destination = cells.find((cell) => cell.id === move.destinationId);
    if (!piece || !destination) throw new Error("The AI selected a move that is not on the live board.");
    computerThinking = false;
    selectedPiece = piece;
    legalMoves = getLegalMoves(piece);
    moveSelectedPiece(destination);
    draw();
  }

  function queueComputerTurn(delayOverride = null) {
    if (!gameStarted || winner || setupPhase || !computerTeams.has(currentTurn)) return;
    computerThinking = true;
    clearSelection();
    updateGameStatus();
    updateReadout(null);
    draw();
    if (computerTurnTimer) clearTimeout(computerTurnTimer);
    const delay = Number.isFinite(delayOverride)
      ? delayOverride
      : gameMode === "bot" ? BOT_TURN_DELAY : 650;
    computerTurnTimer = setTimeout(performComputerTurn, delay);
  }

  function selectPiece(piece) {
    if (!gameStarted || winner || gameMode === "bot" || setupPhase || computerThinking || pieceAnimating || currentTurn !== "yellow" || !piece || piece.coveredBy || piece.team !== "yellow") return false;
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
    const engineResult = Engine.applyMove(Engine.createState({
      pieces,
      currentTurn,
      winner,
      winnerReason,
      turnNumber: moveNumber,
    }), {
      pieceId: mover.id,
      destinationId: destination.id,
    });
    const capturedPiece = engineResult.lastMove.capturedPieceId
      ? pieces.find((piece) => piece.id === engineResult.lastMove.capturedPieceId)
      : null;
    const stackedPiece = engineResult.lastMove.stackedPieceId
      ? pieces.find((piece) => piece.id === engineResult.lastMove.stackedPieceId)
      : null;
    const releasedPieces = engineResult.lastMove.releasedPieceIds
      .map((pieceId) => pieces.find((piece) => piece.id === pieceId))
      .filter(Boolean);

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
      engineResult.pieces.forEach((enginePiece) => {
        const livePiece = pieces.find((piece) => piece.id === enginePiece.id);
        if (!livePiece) return;
        livePiece.q = enginePiece.q;
        livePiece.row = enginePiece.row;
        livePiece.moveCount = enginePiece.moveCount;
        livePiece.coveredBy = enginePiece.coveredBy;
        const liveCell = getCell(enginePiece.q, enginePiece.row);
        livePiece.x = liveCell.x;
        livePiece.y = liveCell.y;
      });

      pieceAnimating = false;
      movingPiece = null;
      const counts = engineResult.lastMove.farthings;
      winnerReason = engineResult.winnerReason;
      winner = engineResult.winner;
      recordMove(mover, origin, destination, capturedPiece, stackedPiece, releasedPieces, counts);
      if (winner) {
        const team = winner[0].toUpperCase() + winner.slice(1);
        nameOutput.textContent = `${team} wins!`;
        detailOutput.textContent = `${victoryDescription(winner, counts)}.`;
      } else {
        const keepsYellowTurn = tutorialDemoLesson === "gothi" || tutorialDemoLesson === "movement";
        currentTurn = keepsYellowTurn ? "yellow" : engineResult.currentTurn;
        nameOutput.textContent = capturedPiece
          ? `${mover.name} pinned ${capturedPiece.name}`
          : stackedPiece
            ? `${mover.name} stacked on ${stackedPiece.name}`
            : `${mover.name} moved`;
        detailOutput.textContent = `${turnName()} to move.`;
      }
      updateGameStatus();
      if (winner) showVictoryPopup(counts);
      if (!winner && shouldAutoQueueComputerTurn()) queueComputerTurn();
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
      nameOutput.textContent = `${turnName()} is thinking`;
      detailOutput.textContent = gameMode === "bot"
        ? "The next bot move begins after the four-second observation delay."
        : "The computer is choosing its move.";
      return;
    }
    if (piece) {
      const team = piece.team[0].toUpperCase() + piece.team.slice(1);
      const stackSize = piece.coveredBy ? 0 : Engine.getStackSize({ pieces }, piece.id);
      nameOutput.textContent = `${piece.name} · ${team} player`;
      if (stackSize >= 4) {
        detailOutput.textContent = `${stackSize}-piece stack. The top ${piece.name} cannot be captured until it moves away.`;
      } else if (piece.coveredBy) {
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
      if (gameMode === "bot") {
        nameOutput.textContent = botAutoplay ? "Bot Mode autoplay" : "Bot Mode paused";
        detailOutput.textContent = botAutoplay
          ? `${turnName()} will move after the observation delay.`
          : `Click Next Turn to let ${turnName()} move.`;
      } else {
        nameOutput.textContent = `${turnName()} to move`;
        detailOutput.textContent = `Select a ${turnName()} piece.`;
      }
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
    const currentPiece = gameMode !== "bot" && !setupPhase && !computerThinking && !pieceAnimating && currentTurn === "yellow" && hoverPieceIsActive && hoverPiece.team === "yellow";
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
    if (gameMode === "bot") {
      updateReadout(null);
      draw();
      return;
    }
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
    // an occupied move marker completes a capture or friendly stack.
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
    if (gameMode === "bot") {
      updateReadout(null);
      draw();
      return;
    }
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
  botModeButton.addEventListener("click", startBotGame);
  botAutoplayButton.addEventListener("click", () => setBotAutoplay(!botAutoplay));
  botNextTurnButton.addEventListener("click", advanceBotTurn);
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
