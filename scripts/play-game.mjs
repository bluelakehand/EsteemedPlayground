import { spawn } from "node:child_process";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

const args = new Set(process.argv.slice(2));
const headless = args.has("--headless");
const port = Number(process.env.PORT || 8080);
const rootUrl = `http://127.0.0.1:${port}/`;
const url = `${rootUrl}games/perfect-pocket/`;

async function waitForServer(targetUrl, timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(targetUrl);
      if (response.ok) return;
    } catch {
      // Server is still starting.
    }
    await delay(150);
  }
  throw new Error(`Server did not respond at ${targetUrl}`);
}

async function startServer() {
  try {
    await waitForServer(url, 500);
    console.log(`Reusing existing server at ${rootUrl}`);
    return null;
  } catch {
    // No server is running yet; start one below.
  }

  const server = spawn(process.execPath, ["server.js"], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
  });

  server.stdout.on("data", (chunk) => process.stdout.write(`[server] ${chunk}`));
  server.stderr.on("data", (chunk) => process.stderr.write(`[server] ${chunk}`));

  const exitPromise = once(server, "exit").then(([code]) => {
    throw new Error(`Server exited early with code ${code}`);
  });

  await Promise.race([waitForServer(rootUrl), exitPromise]);
  return server;
}

async function canvasPoint(page, xRatio, yRatio) {
  const box = await page.locator("#table").boundingBox();
  if (!box) throw new Error("Could not find game canvas");
  return {
    x: box.x + box.width * xRatio,
    y: box.y + box.height * yRatio,
  };
}

async function canvasGamePoint(page, point) {
  const box = await page.locator("#table").boundingBox();
  if (!box) throw new Error("Could not find game canvas");
  return {
    x: box.x + (point.x / 960) * box.width,
    y: box.y + (point.y / 560) * box.height,
  };
}

async function botState(page) {
  return page.evaluate(() => window.perfectPocketBot.getState());
}

async function waitForShotToSettle(page) {
  await page.waitForFunction(() => window.perfectPocketBot && !window.perfectPocketBot.getState().moving, null, {
    timeout: 10000,
  });
}

async function dragShot(page, pullVector, pauseMs = 600) {
  const state = await botState(page);
  if (state.cue.pocketed) throw new Error("Cue ball is pocketed; cannot shoot");
  const from = await canvasGamePoint(page, state.cue);
  const to = await canvasGamePoint(page, {
    x: state.cue.x + pullVector.x,
    y: state.cue.y + pullVector.y,
  });
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 20 });
  await page.waitForTimeout(180);
  await page.mouse.up();
  await waitForShotToSettle(page);
  await page.waitForTimeout(pauseMs);
}

async function readGameState(page) {
  return page.evaluate(() => ({
    puzzle: document.querySelector("#puzzle-id")?.textContent?.trim(),
    shots: document.querySelector("#shot-count")?.textContent?.trim(),
    remaining: document.querySelector("#remaining-count")?.textContent?.trim(),
    powerup: document.querySelector("#powerup-status")?.textContent?.trim(),
    status: document.querySelector("#status")?.textContent?.trim(),
  }));
}

async function main() {
  const server = await startServer();
  const browser = await chromium.launch({ headless });

  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForSelector("#table");

    console.log("Loaded:", await readGameState(page));

    // Play a random practice seed so daily stats are not affected.
    await page.getByRole("button", { name: "New Random Game" }).click();
    await page.waitForTimeout(500);
    console.log("Practice seed:", await page.locator("#seed-input").inputValue());

    const pulls = [
      { x: -130, y: 55 },
      { x: -120, y: -45 },
      { x: -145, y: 5 },
      { x: -95, y: 90 },
    ];

    for (let i = 0; i < pulls.length; i += 1) {
      await dragShot(page, pulls[i]);
      console.log(`After shot ${i + 1}:`, await readGameState(page));
    }

    if (!headless) {
      console.log("Browser left open for 10 seconds so you can inspect the result...");
      await page.waitForTimeout(10000);
    }
  } finally {
    await browser.close();
    server?.kill();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
