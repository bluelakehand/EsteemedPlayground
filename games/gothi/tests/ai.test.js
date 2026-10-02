"use strict";

const assert = require("node:assert/strict");
const Engine = require("../engine.js");
const AI = require("../ai.js");

function stateFor(team) {
  const initial = Engine.createState();
  return Engine.createState({ ...initial, currentTurn: team });
}

function assertLegalChoice(state, difficulty) {
  const move = AI.chooseMove(state, {
    team: state.currentTurn,
    difficulty,
    random: () => 0,
  });
  assert.ok(move, `${difficulty} AI should choose a move for ${state.currentTurn}`);
  const legal = Engine.getAllLegalMoves(state);
  assert.ok(
    legal.some((candidate) =>
      candidate.pieceId === move.pieceId &&
      candidate.destinationId === move.destinationId
    ),
    `${difficulty} AI must return a legal ${state.currentTurn} move`
  );
  return move;
}

const yellow = stateFor("yellow");
const purple = stateFor("purple");

assert.equal(AI.opponentOf("yellow"), "purple");
assert.equal(AI.opponentOf("purple"), "yellow");

const rankedChoices = ["first", "second", "third"];
assert.equal(AI.chooseWeightedTopThree(rankedChoices, () => 0), "first");
assert.equal(AI.chooseWeightedTopThree(rankedChoices, () => 0.699), "first");
assert.equal(AI.chooseWeightedTopThree(rankedChoices, () => 0.7), "second");
assert.equal(AI.chooseWeightedTopThree(rankedChoices, () => 0.899), "second");
assert.equal(AI.chooseWeightedTopThree(rankedChoices, () => 0.9), "third");
assert.equal(AI.chooseWeightedTopThree(rankedChoices, () => 0.999), "third");
assert.equal(AI.chooseWeightedTopThree(["first", "second"], () => 0.95), "second");
assert.equal(AI.chooseWeightedTopThree(["only"], () => 0.95), "only");
assert.equal(
  AI.evaluateState(yellow, "yellow") + AI.evaluateState(yellow, "purple"),
  0,
  "the evaluator should score opposite perspectives symmetrically"
);

assertLegalChoice(yellow, "easy");
assertLegalChoice(purple, "easy");
assertLegalChoice(yellow, "very-easy");
assertLegalChoice(purple, "very-easy");
assertLegalChoice(yellow, "hard");
assertLegalChoice(purple, "hard");

function winningHomesteadState(team) {
  const targetName = team === "yellow" ? "North Farthing" : "South Farthing";
  for (const origin of Engine.BOARD.filter((cell) => cell.farthing !== targetName)) {
    const state = Engine.createState({
      currentTurn: team,
      pieces: [{
        id: `${team}-gothi-test`,
        team,
        type: "gothi",
        name: "Gothi",
        q: origin.q,
        row: origin.row,
        startQ: origin.q,
        startRow: origin.row,
        moveCount: 0,
        coveredBy: null,
      }],
    });
    const winningMove = Engine.getLegalMoves(state, state.pieces[0].id)
      .find((move) => Engine.getCellById(move.destinationId).farthing === targetName);
    if (winningMove) return { state, winningMove };
  }
  throw new Error(`Could not construct a ${team} Homestead win.`);
}

["yellow", "purple"].forEach((team) => {
  const { state, winningMove } = winningHomesteadState(team);
  ["easy", "hard"].forEach((difficulty) => {
    const selected = AI.chooseMove(state, { team, difficulty, random: () => 0.99 });
    assert.equal(selected.destinationId, winningMove.destinationId, `${difficulty} ${team} AI should take an immediate Homestead win`);
  });
  const nonWinningMoves = AI.getMoveCandidates(state, team)
    .filter((candidate) => candidate.nextState.winner !== team);
  assert.ok(nonWinningMoves.length, `Very Easy ${team} needs a non-winning alternative for this test`);
  const veryEasyMove = AI.chooseMove(state, {
    team,
    difficulty: "very-easy",
    random: () => 0,
  });
  assert.notEqual(
    Engine.applyMove(state, veryEasyMove).winner,
    team,
    `Very Easy ${team} should avoid an immediate win when possible`
  );
});

let selfPlay = Engine.createState();
for (let turn = 0; turn < 80 && !selfPlay.winner; turn += 1) {
  const move = AI.chooseMove(selfPlay, {
    team: selfPlay.currentTurn,
    difficulty: "easy",
    random: () => ((turn * 37 + 11) % 100) / 100,
  });
  selfPlay = move ? Engine.applyMove(selfPlay, move) : Engine.applyPass(selfPlay);
}
assert.ok(selfPlay.turnNumber > 1, "team-neutral agents should complete alternating headless turns");

console.log("GOTHI team-neutral AI tests passed.");
