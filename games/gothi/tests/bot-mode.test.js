"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const game = fs.readFileSync(path.join(root, "game.js"), "utf8");

[
  'id="bot-mode-button"',
  'id="bot-mode-controls"',
  'id="bot-autoplay-button"',
  'id="bot-next-turn-button"',
  'value="very-easy"',
].forEach((fragment) => assert.ok(html.includes(fragment), `missing Bot Mode markup: ${fragment}`));

[
  ".bot-mode-launch",
  ".bot-mode-controls",
  ".bot-mode-controls button:disabled",
].forEach((fragment) => assert.ok(css.includes(fragment), `missing Bot Mode styling: ${fragment}`));

[
  "const BOT_TURN_DELAY = 4000;",
  'gameMode = "bot";',
  'configureComputerTeams("yellow", "purple");',
  "botAutoplay = true;",
  'gameMode === "bot" ? BOT_TURN_DELAY : 650',
  "queueComputerTurn(0);",
  "shouldAutoQueueComputerTurn()",
  'gameMode === "bot" || setupPhase',
  'botModeButton.addEventListener("click", startBotGame);',
  'botAutoplayButton.addEventListener("click"',
  'botNextTurnButton.addEventListener("click", advanceBotTurn);',
].forEach((fragment) => assert.ok(game.includes(fragment), `missing Bot Mode behavior: ${fragment}`));

console.log("GOTHI Bot Mode wiring tests passed.");
