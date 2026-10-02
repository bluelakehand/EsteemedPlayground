/* Team-neutral GOTHI computer agents. No DOM or rendering dependencies. */
(function exposeGothiAI(root, factory) {
  const Engine = typeof module === "object" && module.exports
    ? require("./engine.js")
    : root.GothiEngine;
  const ai = factory(Engine);
  if (typeof module === "object" && module.exports) module.exports = ai;
  else root.GothiAI = ai;
}(typeof globalThis !== "undefined" ? globalThis : this, (Engine) => {
  "use strict";

  if (!Engine) throw new Error("GOTHI AI requires the rules engine.");
  const WIN_SCORE = 100000;

  function opponentOf(team) {
    return team === "yellow" ? "purple" : "yellow";
  }

  function homeFarthing(team) {
    return team === "yellow" ? "South Farthing" : "North Farthing";
  }

  function opposingHomestead(team) {
    return team === "yellow" ? "North Farthing" : "South Farthing";
  }

  function developmentValue(piece) {
    if (piece.coveredBy || piece.moveCount === 0) return 0;
    const cell = Engine.getCell(piece.q, piece.row);
    let value = piece.type === "gothi" ? 24 : 10;
    if (piece.type === "gothi" && cell?.farthing !== homeFarthing(piece.team)) value += 14;
    value -= Math.max(0, piece.moveCount - 1) * 5;
    return value;
  }

  function homesteadPivotWeight(state) {
    const activePieces = state.pieces.filter((piece) => !piece.coveredBy).length;
    return Math.max(0, Math.min(1, (18 - activePieces) / 8));
  }

  function homesteadApproachValue(state, team) {
    const targetCells = Engine.BOARD.filter((cell) => cell.farthing === opposingHomestead(team));
    if (!targetCells.length) return 0;
    return state.pieces
      .filter((piece) => piece.team === team && !piece.coveredBy)
      .reduce((total, piece) => {
        const cell = Engine.getCell(piece.q, piece.row);
        const distance = Math.min(...targetCells.map((target) =>
          Math.hypot(cell.logicalX - target.logicalX, cell.logicalY - target.logicalY) / 2
        ));
        return total + (Engine.CONTROL_VALUES[piece.type] || 1) * Math.max(0, 10 - distance);
      }, 0);
  }

  function evaluateState(state, perspectiveTeam) {
    const opponent = opponentOf(perspectiveTeam);
    const control = Engine.calculateFarthingControl(state);
    const counts = Engine.countControlledFarthings(state, control);
    const heart = control.get("Heart Farthing");
    let score = (counts[perspectiveTeam] - counts[opponent]) * 160;

    if (Engine.getVictoryReason(state, perspectiveTeam, counts, control)) score += WIN_SCORE;
    if (Engine.getVictoryReason(state, opponent, counts, control)) score -= WIN_SCORE;
    if (heart?.controller === perspectiveTeam) score += 90;
    if (heart?.controller === opponent) score -= 90;
    if (heart) score += (heart[perspectiveTeam] - heart[opponent]) * 14;

    control.forEach((territory, name) => {
      if (!name.endsWith("Edge Territory")) {
        score += (territory[perspectiveTeam] - territory[opponent]) * 4;
      }
    });

    const edgeMultiplier = heart?.controller === opponent ? 1.5 : 1;
    ["West Edge Territory", "East Edge Territory"].forEach((name) => {
      const controller = control.get(name)?.controller;
      if (controller === perspectiveTeam) score += 28 * edgeMultiplier;
      if (controller === opponent) score -= 28 * edgeMultiplier;
    });

    const openingWeight = Math.max(0, 1 - (state.turnNumber || 0) / 10);
    if (openingWeight > 0) {
      state.pieces.filter((piece) => !piece.coveredBy).forEach((piece) => {
        const signedValue = developmentValue(piece) * openingWeight;
        score += piece.team === perspectiveTeam ? signedValue : -signedValue;
        if (piece.moveCount === 0 && piece.type === "gothi") {
          score += piece.team === perspectiveTeam ? -14 * openingWeight : 14 * openingWeight;
        }
      });
    }

    const homesteadWeight = homesteadPivotWeight(state);
    if (homesteadWeight > 0) {
      const approachBalance =
        homesteadApproachValue(state, perspectiveTeam) - homesteadApproachValue(state, opponent);
      const target = control.get(opposingHomestead(perspectiveTeam));
      const ownHome = control.get(homeFarthing(perspectiveTeam));
      const pressure =
        ((target?.[perspectiveTeam] || 0) - (target?.[opponent] || 0)) -
        ((ownHome?.[opponent] || 0) - (ownHome?.[perspectiveTeam] || 0));
      score += approachBalance * 24 * homesteadWeight;
      score += pressure * 28 * homesteadWeight;
    }
    return score;
  }

  function forwardProgress(cell, team) {
    const normalized = Math.max(0, Math.min(1, (cell.logicalY + 8) / 16));
    return team === "purple" ? normalized : 1 - normalized;
  }

  function scoreMove(state, move, team) {
    const capturedPiece = move.capturedPieceId ? Engine.getPiece(state, move.capturedPieceId) : null;
    const nextState = Engine.applyMove(state, move);
    const destination = Engine.getCellById(move.destinationId);
    const destinationControl = destination.farthing
      ? Engine.calculateFarthingControl(nextState).get(destination.farthing)
      : null;
    let score = evaluateState(nextState, team);
    if (capturedPiece) score += (Engine.CONTROL_VALUES[capturedPiece.type] || 1) * 30;
    if (destinationControl?.controller === team) score += 20;
    if (!destination.farthing) score -= 12;
    score += forwardProgress(destination, team) * 8;
    if (nextState.winner === team) score += WIN_SCORE * 10;
    return { ...move, score, nextState };
  }

  function getMoveCandidates(state, team = state.currentTurn) {
    if (team !== state.currentTurn) {
      throw new Error(`Cannot choose for ${team} during ${state.currentTurn}'s turn.`);
    }
    return Engine.getAllLegalMoves(state, team)
      .map((move) => scoreMove(state, move, team))
      .sort((a, b) =>
        b.score - a.score ||
        a.pieceId.localeCompare(b.pieceId) ||
        a.destinationId.localeCompare(b.destinationId)
      );
  }

  function findImmediateWin(candidates, team) {
    return candidates.find((candidate) => candidate.nextState.winner === team) || null;
  }

  function chooseEasyMove(candidates, team, random = Math.random) {
    if (!candidates.length) return null;
    const immediateWin = findImmediateWin(candidates, team);
    if (immediateWin) return immediateWin;
    const favoredCount = Math.max(3, Math.ceil(candidates.length * 0.4));
    const pool = random() < 0.65 ? candidates.slice(0, favoredCount) : candidates;
    const index = Math.min(pool.length - 1, Math.floor(random() * pool.length));
    return pool[index];
  }

  function chooseVeryEasyMove(candidates, team, random = Math.random) {
    if (!candidates.length) return null;
    const nonWinningMoves = candidates.filter((candidate) => candidate.nextState.winner !== team);
    const choices = nonWinningMoves.length ? nonWinningMoves : candidates;
    const weakestCount = Math.max(3, Math.ceil(choices.length * 0.45));
    const weakestMoves = choices.slice(-weakestCount);
    const index = Math.min(weakestMoves.length - 1, Math.floor(random() * weakestMoves.length));
    return weakestMoves[index];
  }

  function hardScore(candidate, team) {
    if (candidate.nextState.winner === team) return WIN_SCORE * 20 + candidate.score;
    const opponent = opponentOf(team);
    const replies = Engine.getAllLegalMoves(candidate.nextState, opponent);
    const immediateScore = evaluateState(candidate.nextState, team);
    let worstReplyScore = immediateScore;
    if (replies.length) {
      worstReplyScore = Math.min(...replies.map((reply) =>
        evaluateState(Engine.applyMove(candidate.nextState, reply), team)
      ));
    }
    return immediateScore * 0.3 + worstReplyScore * 0.7 + candidate.score * 0.15;
  }

  function chooseWeightedTopThree(rankedChoices, random = Math.random) {
    if (!rankedChoices.length) return null;
    const roll = random();
    const requestedIndex = roll < 0.7 ? 0 : roll < 0.9 ? 1 : 2;
    return rankedChoices[Math.min(requestedIndex, rankedChoices.length - 1)];
  }

  function chooseHardMove(candidates, team, random = Math.random) {
    if (!candidates.length) return null;
    const immediateWin = findImmediateWin(candidates, team);
    if (immediateWin) return immediateWin;
    const ranked = candidates
      .map((candidate) => ({ ...candidate, hardScore: hardScore(candidate, team) }))
      .sort((a, b) =>
        b.hardScore - a.hardScore ||
        b.score - a.score ||
        a.pieceId.localeCompare(b.pieceId) ||
        a.destinationId.localeCompare(b.destinationId)
      );
    return chooseWeightedTopThree(ranked.slice(0, 3), random);
  }

  function publicMove(candidate) {
    if (!candidate) return null;
    const { nextState, score, hardScore, ...move } = candidate;
    return {
      ...move,
      analysis: {
        score,
        ...(Number.isFinite(hardScore) ? { hardScore } : {}),
      },
    };
  }

  function chooseMove(state, options = {}) {
    const team = options.team || state.currentTurn;
    const difficulty = ["very-easy", "easy", "hard"].includes(options.difficulty)
      ? options.difficulty
      : "easy";
    const candidates = getMoveCandidates(state, team);
    const random = options.random || Math.random;
    const candidate = difficulty === "hard"
      ? chooseHardMove(candidates, team, random)
      : difficulty === "very-easy"
        ? chooseVeryEasyMove(candidates, team, random)
        : chooseEasyMove(candidates, team, random);
    return publicMove(candidate);
  }

  return Object.freeze({
    opponentOf,
    evaluateState,
    getMoveCandidates,
    chooseWeightedTopThree,
    chooseMove,
  });
}));