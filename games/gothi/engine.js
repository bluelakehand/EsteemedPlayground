/* Standalone GOTHI rules engine. No DOM, canvas, timers, or animations. */
(function exposeGothiEngine(root, factory) {
  const engine = factory();
  if (typeof module === "object" && module.exports) module.exports = engine;
  else root.GothiEngine = engine;
}(typeof globalThis !== "undefined" ? globalThis : this, () => {
  "use strict";

  const SCHEMA_VERSION = 1;
  const PATTERN_COLUMNS = {
    "-6": "PPP", "-5": "PPPP", "-4": "YYBYY", "-3": "YYYYYY",
    "-2": "RYYRYYR", "-1": "GGBCCBGG", "0": "GGGCCCGGG",
    "1": "GGBCCBGG", "2": "RYYRYYR", "3": "YYYYYY",
    "4": "YYBYY", "5": "PPPP", "6": "PPP",
  };
  const CONTROL_VALUES = Object.freeze({ thingman: 1, outlaw: 1, raven: 2, gothi: 3, storgothi: 3 });
  const NORTH_FORMATION = Object.freeze([
    ["storgothi", 0, 0],
    ["raven", -1, 0], ["gothi", 0, 1], ["raven", 1, 0],
    ["gothi", -2, 0], ["gothi", -1, 1], ["gothi", 1, 1], ["gothi", 2, 0],
    ["thingman", -4, 0], ["outlaw", -3, 0], ["thingman", 3, 0], ["outlaw", 4, 0],
  ]);
  const SOUTH_FORMATION = Object.freeze([
    ["outlaw", -4, 4], ["thingman", -3, 5],
    ["gothi", -2, 6], ["gothi", -1, 6], ["raven", -1, 7],
    ["storgothi", 0, 8], ["gothi", 0, 7],
    ["raven", 1, 7], ["gothi", 1, 6], ["gothi", 2, 6],
    ["outlaw", 3, 5], ["thingman", 4, 4],
  ]);
  const DIRECTIONS = Object.freeze([[0, -2], [1.5, -1], [1.5, 1], [0, 2], [-1.5, 1], [-1.5, -1]]);

  function cellId(q, row) {
    return `q${q >= 0 ? "+" : ""}${q}-r${String(row).padStart(2, "0")}`;
  }

  function farthingFor(patternType, q, logicalY) {
    if (patternType === "P") return q < 0 ? "West Edge Territory" : "East Edge Territory";
    if (patternType === "C") return "Heart Farthing";
    if (patternType === "G") return logicalY < 0 ? "North Farthing" : "South Farthing";
    if (patternType === "Y") return `${logicalY < 0 ? "North" : "South"}${q < 0 ? "west" : "east"} Farthing`;
    return null;
  }

  function terrainFor(patternType) {
    if (patternType === "B") return "Water space";
    if (patternType === "R") return "Neutral space";
    return "Farthing space";
  }

  function createBoard() {
    const board = [];
    for (let q = -6; q <= 6; q += 1) {
      const count = 9 - Math.abs(q);
      for (let row = 0; row < count; row += 1) {
        const patternType = PATTERN_COLUMNS[q][row];
        const logicalX = q * 1.5;
        const logicalY = (row + Math.abs(q) / 2 - 4) * 2;
        board.push(Object.freeze({
          id: cellId(q, row), q, row, logicalX, logicalY, patternType,
          farthing: farthingFor(patternType, q, logicalY),
          terrain: terrainFor(patternType),
        }));
      }
    }
    return Object.freeze(board);
  }

  const BOARD = createBoard();
  const CELL_BY_ID = new Map(BOARD.map((cell) => [cell.id, cell]));
  const CELL_BY_COORDINATE = new Map(BOARD.map((cell) => [`${cell.q},${cell.row}`, cell]));
  const CELL_BY_POSITION = new Map(BOARD.map((cell) => [`${cell.logicalX},${cell.logicalY}`, cell]));

  function displayName(type) {
    return type === "storgothi" ? "Storgothi" : type[0].toUpperCase() + type.slice(1);
  }

  function makePiece(team, type, q, row, index) {
    return {
      id: `${team}-${type}-${index + 1}`, team, type, name: displayName(type), q, row,
      startQ: q, startRow: row, moveCount: 0, coveredBy: null,
    };
  }

  function formationPieces(team, formation) {
    return formation.map(([type, q, row], index) => makePiece(team, type, q, row, index));
  }

  function createState(options = {}) {
    const pieces = options.pieces
      ? options.pieces.map((piece) => ({ ...piece }))
      : [...formationPieces("purple", NORTH_FORMATION), ...formationPieces("yellow", SOUTH_FORMATION)];
    return {
      schemaVersion: SCHEMA_VERSION,
      pieces,
      currentTurn: options.currentTurn || "yellow",
      winner: options.winner || null,
      winnerReason: options.winnerReason || null,
      turnNumber: Number.isInteger(options.turnNumber) ? options.turnNumber : 0,
      lastMove: options.lastMove ? JSON.parse(JSON.stringify(options.lastMove)) : null,
    };
  }

  function cloneState(state) {
    return createState(JSON.parse(JSON.stringify(state)));
  }

  function getCell(q, row) {
    return CELL_BY_COORDINATE.get(`${q},${row}`) || null;
  }

  function getCellById(id) {
    return CELL_BY_ID.get(id) || null;
  }

  function getPiece(state, pieceOrId) {
    if (!pieceOrId) return null;
    const id = typeof pieceOrId === "string" ? pieceOrId : pieceOrId.id;
    return state.pieces.find((piece) => piece.id === id) || null;
  }

  function getTopPieceAt(state, cellOrId) {
    const cell = typeof cellOrId === "string" ? getCellById(cellOrId) : cellOrId;
    if (!cell) return null;
    return state.pieces.find((piece) => !piece.coveredBy && piece.q === cell.q && piece.row === cell.row) || null;
  }

  function getStackSize(state, topPieceOrId) {
    let current = getPiece(state, topPieceOrId);
    if (!current) return 0;
    let size = 1;
    const seen = new Set([current.id]);
    while (current) {
      const covered = state.pieces.find((piece) => piece.coveredBy === current.id) || null;
      if (!covered || seen.has(covered.id)) break;
      seen.add(covered.id);
      size += 1;
      current = covered;
    }
    return size;
  }

  function getNeighbors(cell) {
    return DIRECTIONS
      .map(([dx, dy]) => CELL_BY_POSITION.get(`${cell.logicalX + dx},${cell.logicalY + dy}`))
      .filter(Boolean);
  }

  function canCapture(state, attacker, defender, moveKind) {
    if (!defender || defender.team === attacker.team || defender.coveredBy) return false;
    if (getStackSize(state, defender) >= 4) return false;
    return attacker.type !== "gothi" || moveKind === "step";
  }

  function legalMoveMap(state, pieceOrId) {
    const piece = getPiece(state, pieceOrId);
    const moves = new Map();
    if (!piece || piece.coveredBy) return moves;
    const origin = getCell(piece.q, piece.row);
    if (!origin) return moves;

    function add(destination, moveKind) {
      if (!destination) return "blocked";
      const defender = getTopPieceAt(state, destination);
      if (!defender) {
        moves.set(destination.id, { pieceId: piece.id, destinationId: destination.id, capture: false, moveKind });
        return "open";
      }
      if (defender.team === piece.team) {
        moves.set(destination.id, {
          pieceId: piece.id, destinationId: destination.id, capture: false,
          stack: true, stackedPieceId: defender.id, moveKind,
        });
        return "stack";
      }
      if (canCapture(state, piece, defender, moveKind)) {
        moves.set(destination.id, {
          pieceId: piece.id, destinationId: destination.id, capture: true,
          capturedPieceId: defender.id, moveKind,
        });
        return "capture";
      }
      return "blocked";
    }

    if (piece.type === "thingman") {
      getNeighbors(origin).forEach((firstStep) => {
        if (firstStep.terrain === "Water space") return;
        if (add(firstStep, "step") !== "open") return;
        getNeighbors(firstStep).forEach((secondStep) => {
          if (secondStep === origin || secondStep.terrain === "Water space") return;
          add(secondStep, "second-step");
        });
      });
    } else if (piece.type === "outlaw" || piece.type === "storgothi") {
      DIRECTIONS.forEach(([dx, dy]) => {
        let destination = CELL_BY_POSITION.get(`${origin.logicalX + dx},${origin.logicalY + dy}`);
        while (destination) {
          if (destination.terrain === "Water space") break;
          if (add(destination, "line") !== "open") break;
          destination = CELL_BY_POSITION.get(`${destination.logicalX + dx},${destination.logicalY + dy}`);
        }
      });
    } else if (piece.type === "raven") {
      DIRECTIONS.forEach(([dx, dy]) => {
        add(CELL_BY_POSITION.get(`${origin.logicalX + dx},${origin.logicalY + dy}`), "step");
        add(CELL_BY_POSITION.get(`${origin.logicalX + dx * 2},${origin.logicalY + dy * 2}`), "jump");
      });
    } else if (piece.type === "gothi") {
      DIRECTIONS.forEach(([dx, dy]) => {
        const firstStep = CELL_BY_POSITION.get(`${origin.logicalX + dx},${origin.logicalY + dy}`);
        if (!firstStep || firstStep.terrain === "Water space") return;
        if (add(firstStep, "step") !== "open") return;
        const secondStep = CELL_BY_POSITION.get(`${origin.logicalX + dx * 2},${origin.logicalY + dy * 2}`);
        if (!secondStep || secondStep.terrain === "Water space") return;
        add(secondStep, "two-space");
      });
    }
    return moves;
  }

  function getLegalMoves(state, pieceOrId) {
    return [...legalMoveMap(state, pieceOrId).values()];
  }

  function getAllLegalMoves(state, team = state.currentTurn) {
    return state.pieces
      .filter((piece) => piece.team === team && !piece.coveredBy)
      .flatMap((piece) => getLegalMoves(state, piece.id));
  }

  function calculateFarthingControl(state) {
    const control = new Map();
    BOARD.forEach((cell) => {
      if (cell.farthing && !control.has(cell.farthing)) {
        control.set(cell.farthing, { yellow: 0, purple: 0, controller: null });
      }
    });
    state.pieces.forEach((piece) => {
      if (piece.coveredBy) return;
      const cell = getCell(piece.q, piece.row);
      if (!cell?.farthing) return;
      control.get(cell.farthing)[piece.team] += CONTROL_VALUES[piece.type] || 1;
    });
    control.forEach((territory) => {
      if (territory.yellow > territory.purple) territory.controller = "yellow";
      else if (territory.purple > territory.yellow) territory.controller = "purple";
    });
    return control;
  }

  function countControlledFarthings(state, control = calculateFarthingControl(state)) {
    const counts = { yellow: 0, purple: 0 };
    control.forEach((territory, farthing) => {
      if (!farthing.endsWith("Edge Territory") && territory.controller) counts[territory.controller] += 1;
    });
    const west = control.get("West Edge Territory")?.controller;
    const east = control.get("East Edge Territory")?.controller;
    if (west && west === east) counts[west] += 1;
    return counts;
  }

  function controlsOpposingHomestead(state, team, control = calculateFarthingControl(state)) {
    const opposingHome = team === "yellow" ? "North Farthing" : "South Farthing";
    return control.get(opposingHome)?.controller === team;
  }

  function getVictoryReason(state, team, counts, control) {
    const resolvedControl = control || calculateFarthingControl(state);
    const resolvedCounts = counts || countControlledFarthings(state, resolvedControl);
    if (controlsOpposingHomestead(state, team, resolvedControl)) return "homestead";
    if (resolvedCounts[team] >= 5) return "farthings";
    return null;
  }

  function applyMove(state, requestedMove) {
    const next = cloneState(state);
    if (next.winner) throw new Error("Cannot move after the game has ended.");
    const piece = getPiece(next, requestedMove.pieceId);
    if (!piece || piece.coveredBy) throw new Error("The moving piece is unavailable.");
    if (piece.team !== next.currentTurn) throw new Error(`It is ${next.currentTurn}'s turn.`);
    const move = legalMoveMap(next, piece.id).get(requestedMove.destinationId);
    if (!move) throw new Error("Illegal move.");
    const origin = getCell(piece.q, piece.row);
    const destination = getCellById(move.destinationId);
    const defender = move.capture ? getTopPieceAt(next, destination) : null;
    const stackedPiece = move.stack ? getTopPieceAt(next, destination) : null;
    const releasedPieceIds = next.pieces
      .filter((candidate) => candidate.coveredBy === piece.id)
      .map((candidate) => {
        candidate.coveredBy = null;
        return candidate.id;
      });
    piece.q = destination.q;
    piece.row = destination.row;
    piece.moveCount = (piece.moveCount || 0) + 1;
    const coveredPiece = defender || stackedPiece;
    if (coveredPiece) coveredPiece.coveredBy = piece.id;
    const control = calculateFarthingControl(next);
    const counts = countControlledFarthings(next, control);
    next.winnerReason = getVictoryReason(next, piece.team, counts, control);
    next.winner = next.winnerReason ? piece.team : null;
    next.turnNumber += 1;
    next.currentTurn = next.winner ? piece.team : piece.team === "yellow" ? "purple" : "yellow";
    next.lastMove = {
      turnNumber: next.turnNumber, team: piece.team, pieceId: piece.id,
      originId: origin.id, destinationId: destination.id,
      capturedPieceId: defender?.id || null,
      stackedPieceId: stackedPiece?.id || null,
      releasedPieceIds,
      farthings: counts, winner: next.winner, winnerReason: next.winnerReason,
    };
    return next;
  }

  function applyPass(state) {
    const next = cloneState(state);
    if (next.winner) throw new Error("Cannot pass after the game has ended.");
    if (getAllLegalMoves(next, next.currentTurn).length) throw new Error("A team may pass only when it has no legal moves.");
    const passingTeam = next.currentTurn;
    next.turnNumber += 1;
    next.currentTurn = passingTeam === "yellow" ? "purple" : "yellow";
    next.lastMove = {
      turnNumber: next.turnNumber,
      team: passingTeam,
      passed: true,
      farthings: countControlledFarthings(next),
      winner: null,
      winnerReason: null,
    };
    return next;
  }

  function serializeState(state) {
    return JSON.stringify({
      schemaVersion: SCHEMA_VERSION, pieces: state.pieces, currentTurn: state.currentTurn,
      winner: state.winner, winnerReason: state.winnerReason, turnNumber: state.turnNumber,
      lastMove: state.lastMove,
    });
  }

  function deserializeState(serialized) {
    const parsed = typeof serialized === "string" ? JSON.parse(serialized) : serialized;
    if (parsed.schemaVersion !== SCHEMA_VERSION) throw new Error(`Unsupported GOTHI state schema: ${parsed.schemaVersion}`);
    return createState(parsed);
  }

  function getPositionKey(state) {
    const pieces = [...state.pieces]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((piece) => `${piece.id}:${piece.q},${piece.row}:${piece.coveredBy || "-"}`)
      .join("|");
    return `${state.currentTurn}|${pieces}`;
  }

  return Object.freeze({
    SCHEMA_VERSION, BOARD, PATTERN_COLUMNS, CONTROL_VALUES, NORTH_FORMATION, SOUTH_FORMATION,
    createState, cloneState, serializeState, deserializeState, getPositionKey,
    getCell, getCellById, getPiece, getTopPieceAt, getStackSize, getLegalMoves, getAllLegalMoves,
    calculateFarthingControl, countControlledFarthings, controlsOpposingHomestead,
    getVictoryReason, applyMove, applyPass,
  });
}));