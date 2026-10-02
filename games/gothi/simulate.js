"use strict";

const fs = require("node:fs");
const path = require("node:path");
const Engine = require("./engine.js");
const AI = require("./ai.js");

const DIFFICULTIES = new Set(["very-easy", "easy", "hard"]);
const DEFAULTS = Object.freeze({
  games: 100,
  yellow: "hard",
  purple: "hard",
  maxTurns: 300,
  repetition: 3,
  seed: 20260728,
  json: false,
  output: null,
  quiet: false,
});

function seededRandom(seed) {
  let value = seed >>> 0;
  return function random() {
    value += 0x6D2B79F5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function gameSeed(seed, gameIndex) {
  return (seed + Math.imul(gameIndex + 1, 0x9E3779B9)) >>> 0;
}

function validateConfig(config) {
  if (!Number.isInteger(config.games) || config.games < 1) throw new Error("--games must be a positive integer.");
  if (!DIFFICULTIES.has(config.yellow)) throw new Error(`Unknown Yellow difficulty: ${config.yellow}`);
  if (!DIFFICULTIES.has(config.purple)) throw new Error(`Unknown Purple difficulty: ${config.purple}`);
  if (!Number.isInteger(config.maxTurns) || config.maxTurns < 1) throw new Error("--max-turns must be a positive integer.");
  if (!Number.isInteger(config.repetition) || config.repetition < 2) throw new Error("--repetition must be an integer of at least 2.");
  if (!Number.isInteger(config.seed) || config.seed < 0 || config.seed > 0xFFFFFFFF) throw new Error("--seed must be an integer from 0 through 4294967295.");
}

function runGame(options = {}) {
  const yellow = options.yellow || DEFAULTS.yellow;
  const purple = options.purple || DEFAULTS.purple;
  const maxTurns = options.maxTurns ?? DEFAULTS.maxTurns;
  const repetition = options.repetition ?? DEFAULTS.repetition;
  const seed = options.seed ?? DEFAULTS.seed;
  validateConfig({ games: 1, yellow, purple, maxTurns, repetition, seed });
  const random = seededRandom(seed);
  let state = Engine.createState();
  const positions = new Map([[Engine.getPositionKey(state), 1]]);
  let drawReason = null;

  while (!state.winner && state.turnNumber < maxTurns && !drawReason) {
    const team = state.currentTurn;
    const move = AI.chooseMove(state, {
      team,
      difficulty: team === "yellow" ? yellow : purple,
      random,
    });
    state = move ? Engine.applyMove(state, move) : Engine.applyPass(state);
    if (!state.winner) {
      const key = Engine.getPositionKey(state);
      const visits = (positions.get(key) || 0) + 1;
      positions.set(key, visits);
      if (visits >= repetition) drawReason = "repetition";
    }
  }

  if (!state.winner && !drawReason) drawReason = "turn-limit";
  return {
    seed,
    winner: state.winner,
    winReason: state.winnerReason,
    drawReason,
    turns: state.turnNumber,
    finalFarthings: Engine.countControlledFarthings(state),
  };
}

function runTournament(options = {}) {
  const config = {
    games: options.games ?? DEFAULTS.games,
    yellow: options.yellow || DEFAULTS.yellow,
    purple: options.purple || DEFAULTS.purple,
    maxTurns: options.maxTurns ?? DEFAULTS.maxTurns,
    repetition: options.repetition ?? DEFAULTS.repetition,
    seed: options.seed ?? DEFAULTS.seed,
  };
  validateConfig(config);
  const startedAt = Date.now();
  const results = [];
  const summary = {
    games: config.games,
    wins: { yellow: 0, purple: 0 },
    draws: 0,
    winReasons: { farthings: 0, homestead: 0 },
    drawReasons: { repetition: 0, "turn-limit": 0 },
    turns: { total: 0, average: 0, minimum: null, maximum: 0 },
  };

  for (let index = 0; index < config.games; index += 1) {
    const result = runGame({ ...config, seed: gameSeed(config.seed, index) });
    results.push({ game: index + 1, ...result });
    if (result.winner) {
      summary.wins[result.winner] += 1;
      summary.winReasons[result.winReason] += 1;
    } else {
      summary.draws += 1;
      summary.drawReasons[result.drawReason] += 1;
    }
    summary.turns.total += result.turns;
    summary.turns.minimum = summary.turns.minimum === null
      ? result.turns
      : Math.min(summary.turns.minimum, result.turns);
    summary.turns.maximum = Math.max(summary.turns.maximum, result.turns);
    if (typeof options.onProgress === "function") options.onProgress(index + 1, config.games);
  }

  summary.turns.average = Number((summary.turns.total / config.games).toFixed(2));
  summary.rates = {
    yellowWinPercent: Number((summary.wins.yellow / config.games * 100).toFixed(2)),
    purpleWinPercent: Number((summary.wins.purple / config.games * 100).toFixed(2)),
    drawPercent: Number((summary.draws / config.games * 100).toFixed(2)),
  };
  const durationMs = Date.now() - startedAt;
  return {
    generatedAt: new Date().toISOString(),
    config,
    summary,
    performance: {
      durationMs,
      gamesPerSecond: durationMs
        ? Number((config.games / (durationMs / 1000)).toFixed(2))
        : null,
    },
    results,
  };
}

function parseArgs(argv) {
  const options = { ...DEFAULTS };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const value = argv[index + 1];
    if (argument === "--games") options.games = Number(value), index += 1;
    else if (argument === "--yellow") options.yellow = value, index += 1;
    else if (argument === "--purple") options.purple = value, index += 1;
    else if (argument === "--max-turns") options.maxTurns = Number(value), index += 1;
    else if (argument === "--repetition") options.repetition = Number(value), index += 1;
    else if (argument === "--seed") options.seed = Number(value), index += 1;
    else if (argument === "--output") {
      if (!value || value.startsWith("--")) throw new Error("--output requires a file path.");
      options.output = value;
      index += 1;
    }
    else if (argument === "--json") options.json = true;
    else if (argument === "--quiet") options.quiet = true;
    else if (argument === "--help" || argument === "-h") options.help = true;
    else throw new Error(`Unknown option: ${argument}`);
  }
  if (!options.help) validateConfig(options);
  return options;
}

function formatSummary(report) {
  const { config, summary, performance } = report;
  return [
    `GOTHI AI Tournament: ${config.games} games`,
    `Yellow ${config.yellow} vs Purple ${config.purple} | seed ${config.seed}`,
    `Yellow wins: ${summary.wins.yellow} (${summary.rates.yellowWinPercent}%)`,
    `Purple wins: ${summary.wins.purple} (${summary.rates.purpleWinPercent}%)`,
    `Draws: ${summary.draws} (${summary.rates.drawPercent}%)`,
    `Win methods: ${summary.winReasons.farthings} Farthings, ${summary.winReasons.homestead} Homestead`,
    `Draw causes: ${summary.drawReasons.repetition} repetition, ${summary.drawReasons["turn-limit"]} turn limit`,
    `Turns: ${summary.turns.average} average, ${summary.turns.minimum} minimum, ${summary.turns.maximum} maximum`,
    `Runtime: ${(performance.durationMs / 1000).toFixed(2)}s${performance.gamesPerSecond ? ` (${performance.gamesPerSecond} games/s)` : ""}`,
  ].join("\n");
}

function usage() {
  return [
    "Usage: node games/gothi/simulate.js [options]",
    "",
    "  --games N          Number of games (default 100)",
    "  --yellow LEVEL     very-easy, easy, or hard",
    "  --purple LEVEL     very-easy, easy, or hard",
    "  --max-turns N      Draw after this many turns (default 300)",
    "  --repetition N     Draw after a position occurs N times (default 3)",
    "  --seed N           Reproducible tournament seed",
    "  --output FILE      Save the complete JSON report",
    "  --json             Print JSON instead of the summary",
    "  --quiet            Suppress progress updates",
  ].join("\n");
}

function main(argv) {
  const options = parseArgs(argv);
  if (options.help) {
    console.log(usage());
    return;
  }
  const progressStep = Math.max(1, Math.ceil(options.games / 10));
  const report = runTournament({
    ...options,
    onProgress: options.quiet || options.json
      ? null
      : (completed, total) => {
        if (completed === total || completed % progressStep === 0) {
          process.stderr.write(`Completed ${completed}/${total} games\n`);
        }
      },
  });
  if (options.output) {
    const outputPath = path.resolve(options.output);
    fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
    if (!options.json) process.stderr.write(`Saved report: ${outputPath}\n`);
  }
  console.log(options.json ? JSON.stringify(report, null, 2) : formatSummary(report));
}

if (require.main === module) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(`Simulation failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = Object.freeze({
  DEFAULTS,
  seededRandom,
  gameSeed,
  runGame,
  runTournament,
  parseArgs,
  formatSummary,
});