"use strict";

const assert = require("node:assert/strict");
const Simulation = require("../simulate.js");

const parsed = Simulation.parseArgs([
  "--games", "4",
  "--yellow", "very-easy",
  "--purple", "easy",
  "--max-turns", "30",
  "--repetition", "2",
  "--seed", "42",
]);
assert.equal(parsed.games, 4);
assert.equal(parsed.yellow, "very-easy");
assert.equal(parsed.purple, "easy");
assert.equal(parsed.maxTurns, 30);
assert.equal(parsed.repetition, 2);
assert.equal(parsed.seed, 42);
assert.throws(() => Simulation.parseArgs(["--yellow", "legendary"]), /Unknown Yellow difficulty/);

const config = {
  games: 4,
  yellow: "very-easy",
  purple: "easy",
  maxTurns: 30,
  repetition: 2,
  seed: 314159,
};
const first = Simulation.runTournament(config);
const second = Simulation.runTournament(config);
assert.equal(first.results.length, 4);
assert.deepEqual(first.results, second.results, "a fixed seed should reproduce every game result");
assert.equal(
  first.summary.wins.yellow + first.summary.wins.purple + first.summary.draws,
  config.games,
  "every simulated game must have exactly one result"
);
assert.ok(first.results.every((result) => result.turns <= config.maxTurns));
assert.match(Simulation.formatSummary(first), /GOTHI AI Tournament: 4 games/);

console.log("GOTHI batch simulation tests passed.");