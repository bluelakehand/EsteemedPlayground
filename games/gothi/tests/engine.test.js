"use strict";

const assert = require("node:assert/strict");
const Engine = require("../engine.js");

function piece(id, team, type, q, row, coveredBy = null) {
  return { id, team, type, name: type, q, row, startQ: q, startRow: row, moveCount: 0, coveredBy };
}

function stateWith(pieces, currentTurn = "yellow") {
  return Engine.createState({ pieces, currentTurn });
}

assert.equal(Engine.BOARD.length, 75, "board should contain 75 hexes");
const initial = Engine.createState();
assert.equal(initial.pieces.length, 24, "Basic setup should contain 24 pieces");
assert.equal(initial.currentTurn, "yellow");
assert.ok(Engine.getAllLegalMoves(initial, "yellow").length > 0, "Yellow should have legal opening moves");
assert.ok(Engine.getAllLegalMoves(initial, "purple").length > 0, "Purple should have legal opening moves");

const empty = stateWith([]);
const afterPass = Engine.applyPass(empty);
assert.equal(afterPass.currentTurn, "purple");
assert.equal(afterPass.lastMove.passed, true);
assert.throws(() => Engine.applyPass(initial), /only when it has no legal moves/);

const openingMove = Engine.getAllLegalMoves(initial, "yellow")[0];
const afterOpening = Engine.applyMove(initial, openingMove);
assert.equal(initial.turnNumber, 0, "applyMove must not mutate its input");
assert.equal(afterOpening.turnNumber, 1);
assert.equal(afterOpening.currentTurn, "purple");
assert.notEqual(Engine.getPositionKey(afterOpening), Engine.getPositionKey(initial));
assert.equal(
  Engine.getPositionKey(Engine.deserializeState(Engine.serializeState(afterOpening))),
  Engine.getPositionKey(afterOpening),
  "serialized states should round-trip"
);

const gothiCaptureState = stateWith([
  piece("yellow-gothi", "yellow", "gothi", 0, 4),
  piece("purple-outlaw", "purple", "outlaw", 0, 2),
]);
const gothiMoves = Engine.getLegalMoves(gothiCaptureState, "yellow-gothi");
assert.ok(gothiMoves.some((move) => move.destinationId === Engine.getCell(0, 3).id));
assert.ok(!gothiMoves.some((move) => move.destinationId === Engine.getCell(0, 2).id), "Gothi cannot capture at two spaces");

const ravenCaptureState = stateWith([
  piece("yellow-raven", "yellow", "raven", 0, 4),
  piece("purple-outlaw", "purple", "outlaw", 0, 2),
]);
const ravenJump = Engine.getLegalMoves(ravenCaptureState, "yellow-raven")
  .find((move) => move.destinationId === Engine.getCell(0, 2).id);
assert.equal(ravenJump?.capture, true, "Raven should capture with its two-space jump");

const waterIds = new Set(Engine.BOARD.filter((cell) => cell.terrain === "Water space").map((cell) => cell.id));
let ravenCanReachWater = false;
Engine.BOARD.forEach((cell) => {
  const scan = stateWith([piece("r", "yellow", "raven", cell.q, cell.row)]);
  if (Engine.getLegalMoves(scan, "r").some((move) => waterIds.has(move.destinationId))) ravenCanReachWater = true;
});
assert.equal(ravenCanReachWater, true, "Raven should be able to land on water");
Engine.BOARD.forEach((cell) => {
  const scan = stateWith([piece("t", "yellow", "thingman", cell.q, cell.row)]);
  assert.ok(Engine.getLegalMoves(scan, "t").every((move) => !waterIds.has(move.destinationId)), "Thingman cannot enter water");
});

const captureState = stateWith([
  piece("yellow-outlaw", "yellow", "outlaw", 0, 4),
  piece("purple-gothi", "purple", "gothi", 0, 3),
]);
const captureMove = Engine.getLegalMoves(captureState, "yellow-outlaw")
  .find((move) => move.destinationId === Engine.getCell(0, 3).id);
const afterCapture = Engine.applyMove(captureState, captureMove);
assert.equal(Engine.getPiece(afterCapture, "purple-gothi").coveredBy, "yellow-outlaw");
const releaseReady = Engine.createState({ ...afterCapture, currentTurn: "yellow", winner: null, winnerReason: null });
const releaseMove = Engine.getLegalMoves(releaseReady, "yellow-outlaw")
  .find((move) => move.destinationId === Engine.getCell(0, 2).id);
const afterRelease = Engine.applyMove(releaseReady, releaseMove);
assert.equal(Engine.getPiece(afterRelease, "purple-gothi").coveredBy, null, "moving away should release the directly covered piece");

const friendlyStackState = stateWith([
  piece("yellow-outlaw", "yellow", "outlaw", 0, 4),
  piece("yellow-gothi", "yellow", "gothi", 0, 3),
]);
const friendlyStackMove = Engine.getLegalMoves(friendlyStackState, "yellow-outlaw")
  .find((move) => move.destinationId === Engine.getCell(0, 3).id);
assert.equal(friendlyStackMove?.stack, true, "a friendly occupied cell should be a legal stack destination");
assert.equal(friendlyStackMove?.capture, false, "friendly stacking must not count as capture");
const afterFriendlyStack = Engine.applyMove(friendlyStackState, friendlyStackMove);
assert.equal(Engine.getPiece(afterFriendlyStack, "yellow-gothi").coveredBy, "yellow-outlaw");
assert.equal(afterFriendlyStack.lastMove.stackedPieceId, "yellow-gothi");
assert.equal(afterFriendlyStack.lastMove.capturedPieceId, null);

const thingmanFriendlyBlock = stateWith([
  piece("yellow-thingman", "yellow", "thingman", 0, 4),
  piece("yellow-raven", "yellow", "raven", 0, 3),
]);
const thingmanFriendlyMoves = Engine.getLegalMoves(thingmanFriendlyBlock, "yellow-thingman");
assert.ok(
  thingmanFriendlyMoves.some((move) => move.destinationId === Engine.getCell(0, 3).id && move.stack),
  "Thingman may end its first step by stacking on an ally"
);
assert.ok(
  !thingmanFriendlyMoves.some((move) => move.destinationId === Engine.getCell(0, 2).id),
  "Thingman movement must end instead of continuing through the allied stack"
);

const gothiFriendlyTwoSpace = stateWith([
  piece("yellow-gothi", "yellow", "gothi", 0, 4),
  piece("yellow-outlaw", "yellow", "outlaw", 0, 2),
]);
assert.ok(
  Engine.getLegalMoves(gothiFriendlyTwoSpace, "yellow-gothi")
    .some((move) => move.destinationId === Engine.getCell(0, 2).id && move.stack && move.moveKind === "two-space"),
  "Gothi may stack on an ally with its non-capturing two-space move"
);
const fourStackPieces = [
  piece("yellow-attacker", "yellow", "outlaw", 0, 4),
  piece("purple-top", "purple", "outlaw", 0, 3),
  piece("purple-layer-2", "purple", "gothi", 0, 3, "purple-top"),
  piece("purple-layer-3", "purple", "raven", 0, 3, "purple-layer-2"),
  piece("purple-layer-4", "purple", "thingman", 0, 3, "purple-layer-3"),
];
const fourStackState = stateWith(fourStackPieces);
assert.equal(Engine.getStackSize(fourStackState, "purple-top"), 4);
assert.ok(
  !Engine.getLegalMoves(fourStackState, "yellow-attacker")
    .some((move) => move.destinationId === Engine.getCell(0, 3).id),
  "the top piece of a four-piece stack cannot be captured"
);

const threeStackState = stateWith(fourStackPieces.slice(0, -1));
assert.equal(Engine.getStackSize(threeStackState, "purple-top"), 3);
assert.ok(
  Engine.getLegalMoves(threeStackState, "yellow-attacker")
    .some((move) => move.destinationId === Engine.getCell(0, 3).id && move.capture),
  "the top piece of a three-piece stack remains capturable"
);

const topMovesState = Engine.createState({ ...fourStackState, currentTurn: "purple" });
const topMove = Engine.getLegalMoves(topMovesState, "purple-top")
  .find((move) => move.destinationId === Engine.getCell(0, 2).id);
assert.ok(topMove, "the invincible top piece must still be able to move away");
const afterTopMoves = Engine.applyMove(topMovesState, topMove);
assert.equal(Engine.getStackSize(afterTopMoves, "purple-layer-2"), 3);
assert.equal(Engine.getPiece(afterTopMoves, "purple-layer-2").coveredBy, null);
assert.ok(
  Engine.getLegalMoves(afterTopMoves, "yellow-attacker")
    .some((move) => move.destinationId === Engine.getCell(0, 3).id && move.capture),
  "the revealed three-piece stack becomes capturable after its top moves away"
);
const heartCells = Engine.BOARD.filter((cell) => cell.farthing === "Heart Farthing");
const controlState = stateWith([
  piece("yellow-raven", "yellow", "raven", heartCells[0].q, heartCells[0].row),
  piece("purple-thingman", "purple", "thingman", heartCells[1].q, heartCells[1].row),
]);
assert.equal(Engine.calculateFarthingControl(controlState).get("Heart Farthing").controller, "yellow", "Raven control should outweigh Thingman control");
controlState.pieces[0].coveredBy = "imaginary-captor";
assert.equal(Engine.calculateFarthingControl(controlState).get("Heart Farthing").controller, "purple", "covered pieces should exert no control");

const west = Engine.BOARD.find((cell) => cell.farthing === "West Edge Territory");
const east = Engine.BOARD.find((cell) => cell.farthing === "East Edge Territory");
const edgeState = stateWith([
  piece("yellow-west", "yellow", "thingman", west.q, west.row),
  piece("yellow-east", "yellow", "thingman", east.q, east.row),
]);
assert.equal(Engine.countControlledFarthings(edgeState).yellow, 1, "both edge territories should award one Farthing");

const northHome = Engine.BOARD.find((cell) => cell.farthing === "North Farthing");
const homeState = stateWith([piece("yellow-gothi", "yellow", "gothi", northHome.q, northHome.row)]);
assert.equal(Engine.getVictoryReason(homeState, "yellow"), "homestead");

for (let gameIndex = 0; gameIndex < 12; gameIndex += 1) {
  let simulation = Engine.createState();
  for (let turn = 0; turn < 160 && !simulation.winner; turn += 1) {
    const moves = Engine.getAllLegalMoves(simulation);
    simulation = moves.length
      ? Engine.applyMove(simulation, moves[(turn * 17 + gameIndex * 13) % moves.length])
      : Engine.applyPass(simulation);
  }
  assert.ok(simulation.turnNumber > 0, "headless games should advance without UI state");
}

console.log("GOTHI engine tests passed, including 12 headless smoke games.");