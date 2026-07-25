(() => {
  "use strict";

  const canvas = document.querySelector("#board-grid");
  const frame = document.querySelector("#board-frame");
  const toggle = document.querySelector("#grid-toggle");
  const nameOutput = document.querySelector("#space-name");
  const detailOutput = document.querySelector("#space-detail");
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
  let selectedCell = null;
  let hoverPiece = null;
  let selectedPiece = null;
  let legalMoves = new Set();
  let captureMoves = new Set();
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
    return { id: `${team}-${type}-${index + 1}`, team, type, name: displayName(type), q, row, x, y, coveredBy: null };
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
    if (patternType === "P") return "Outer Farthing";
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

    // Hover and selection feedback remains the uppermost board layer.
    cells.forEach((cell) => {
      if (cell !== selectedCell && cell !== hoverCell) return;
      traceHex(cell);
      context.fillStyle = cell === selectedCell ? "rgba(255,241,168,.34)" : "rgba(255,255,255,.18)";
      context.fill();
      context.lineWidth = cell === selectedCell ? 5 : 4;
      context.strokeStyle = cell === selectedCell ? "#fff1a8" : "#f2d27a";
      context.stroke();
    });
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
      const highlighted = piece === selectedPiece || piece === hoverPiece;
      const height = highlighted ? PIECE_HEIGHT * 1.12 : PIECE_HEIGHT;
      drawPieceImage(piece, piece.x, piece.y, height, highlighted);

      getStackBelow(piece).forEach((capturedPiece, index) => {
        const markerX = piece.x + HEX_HALF_WIDTH * 0.62;
        const markerY = piece.y + HEX_HALF_HEIGHT * 0.48 + index * 19;
        drawPieceImage(capturedPiece, markerX, markerY, 31, false);
      });
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

  function selectPiece(piece) {
    if (!piece || piece.coveredBy) return;
    selectedPiece = piece;
    selectedCell = getCell(piece.q, piece.row);
    legalMoves = getLegalMoves(piece);
    updateReadout(selectedCell, piece);
  }

  function moveSelectedPiece(destination) {
    if (!selectedPiece || !legalMoves.has(destination.id)) return false;
    const mover = selectedPiece;
    const capturedPiece = captureMoves.has(destination.id) ? getPieceAtCell(destination) : null;

    pieces.filter((piece) => piece.coveredBy === mover.id).forEach((piece) => {
      piece.coveredBy = null;
    });

    mover.q = destination.q;
    mover.row = destination.row;
    mover.x = destination.x;
    mover.y = destination.y;
    if (capturedPiece) capturedPiece.coveredBy = mover.id;

    selectedCell = destination;
    selectedPiece = null;
    legalMoves = new Set();
    captureMoves = new Set();
    nameOutput.textContent = capturedPiece ? `${mover.name} pinned ${capturedPiece.name}` : `${mover.name} moved`;
    detailOutput.textContent = `${mover.team[0].toUpperCase() + mover.team.slice(1)} player Â· ${destination.farthing || destination.terrain} Â· ${destination.id}`;
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

  function updateReadout(cell, piece = null) {
    if (piece) {
      nameOutput.textContent = `${piece.name} Â· ${piece.team[0].toUpperCase() + piece.team.slice(1)} player`;
      if (piece.type === "thingman") {
        detailOutput.textContent = `${legalMoves.size} destinations are reachable in one or two steps (${captureMoves.size} captures).`;
      } else if (piece.type === "outlaw" || piece.type === "storgothi") {
        detailOutput.textContent = `${legalMoves.size} destinations are reachable along straight lines (${captureMoves.size} captures).`;
      } else if (piece.type === "raven") {
        detailOutput.textContent = `${legalMoves.size} destinations are reachable by a one-space step or two-space jump, including water (${captureMoves.size} captures).`;
      } else if (piece.type === "gothi") {
        detailOutput.textContent = `${legalMoves.size} destinations are reachable by one step or an unobstructed two-space straight move (${captureMoves.size} one-step captures).`;
      } else {
        detailOutput.textContent = `Occupies ${cell?.farthing || "the board"}. Movement rules are not implemented yet.`;
      }
      return;
    }
    if (!cell) {
      nameOutput.textContent = "Choose a hex";
      detailOutput.textContent = "Hover or tap the board to inspect a space or piece.";
      return;
    }
    if (selectedPiece && legalMoves.has(cell.id)) {
      const isCapture = captureMoves.has(cell.id);
      nameOutput.textContent = isCapture ? `Capture with ${selectedPiece.name}` : `Legal ${selectedPiece.name} move`;
      detailOutput.textContent = `${cell.farthing || cell.terrain} Â· ${cell.id}. ${isCapture ? "Select to cover the enemy piece." : "Select to move here."}`;
      return;
    }
    nameOutput.textContent = `${cell.farthing || cell.terrain} Â· ${cell.id}`;
    detailOutput.textContent = describeFarthingControl(cell);
  }

  canvas.addEventListener("pointermove", (event) => {
    const point = eventPoint(event);
    hoverCell = findCell(point);
    hoverPiece = findPiece(point);
    if (!selectedCell && !selectedPiece) updateReadout(hoverCell, hoverPiece);
    canvas.style.cursor = hoverPiece || (hoverCell && legalMoves.has(hoverCell.id)) ? "pointer" : "crosshair";
    draw();
  });
  canvas.addEventListener("pointerleave", () => {
    hoverCell = null;
    hoverPiece = null;
    if (!selectedCell && !selectedPiece) updateReadout(null);
    draw();
  });
  canvas.addEventListener("click", (event) => {
    const point = eventPoint(event);
    const clickedCell = findCell(point);
    const clickedPiece = findPiece(point);

    if (clickedPiece) {
      selectPiece(clickedPiece);
    } else if (clickedCell && moveSelectedPiece(clickedCell)) {
      // Movement completes the current selection.
    } else {
      selectedPiece = null;
      legalMoves = new Set();
      captureMoves = new Set();
      selectedCell = clickedCell;
      updateReadout(selectedCell);
    }
    draw();
  });
  canvas.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Enter", " "].includes(event.key)) return;
    event.preventDefault();

    if (event.key === "Enter" || event.key === " ") {
      if (!moveSelectedPiece(selectedCell)) {
        const piece = getPieceAtCell(selectedCell);
        if (piece) selectPiece(piece);
      }
    } else {
      if (!selectedCell) selectedCell = cells[0];
      else selectedCell = findDirectionalCell(selectedCell, event.key);
      updateReadout(selectedCell, getPieceAtCell(selectedCell));
    }
    draw();
  });
  toggle.addEventListener("click", () => {
    gridVisible = !gridVisible;
    toggle.setAttribute("aria-pressed", String(gridVisible));
    toggle.textContent = gridVisible ? "Hide grid" : "Show grid";
    draw();
  });

  new ResizeObserver(resizeCanvas).observe(frame);
  resizeCanvas();
})();
