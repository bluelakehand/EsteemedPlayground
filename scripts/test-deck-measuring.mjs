import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const port   = Number(process.env.PORT || 8080);
const root   = `http://127.0.0.1:${port}/`;
const url    = `${root}games/deck-measuring/`;
const shots  = 'scripts/screenshots';
mkdirSync(shots, { recursive: true });

async function waitForServer(target, ms = 8000) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    try { const r = await fetch(target); if (r.ok) return; } catch {}
    await delay(150);
  }
  throw new Error(`Server not up at ${target}`);
}

async function startServer() {
  try { await waitForServer(root, 500); console.log('Reusing server'); return null; } catch {}
  const srv = spawn(process.execPath, ['server.js'], {
    cwd: process.cwd(), env: { ...process.env, PORT: String(port) },
    stdio: ['ignore','pipe','pipe'],
  });
  srv.stdout.on('data', c => process.stdout.write(`[srv] ${c}`));
  srv.stderr.on('data', c => process.stderr.write(`[srv] ${c}`));
  await Promise.race([waitForServer(root), once(srv,'exit').then(([c])=>{ throw new Error(`Server exited ${c}`); })]);
  return srv;
}

async function main() {
  const server  = await startServer();
  const browser = await chromium.launch({ headless: true });
  const errors  = [];

  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

    // Capture console errors
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('pageerror', err => errors.push(err.message));

    // ── Load ──────────────────────────────────────────────────────────────────
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForSelector('#canvas-reference');
    console.log('✓ Page loaded');
    await page.screenshot({ path: `${shots}/01-reference.png` });

    // ── Reference screen visible ──────────────────────────────────────────────
    const refVisible = await page.locator('#screen-reference').isVisible();
    console.log(`${refVisible ? '✓' : '✗'} Reference screen visible`);

    const btnStart = page.getByRole('button', { name: /let's get measuring/i });
    const startVisible = await btnStart.isVisible();
    console.log(`${startVisible ? '✓' : '✗'} Start button visible`);

    // ── Start game ────────────────────────────────────────────────────────────
    await btnStart.click();
    await page.waitForSelector('#screen-guess.active');
    console.log('✓ Clicked start — guess screen shown');
    await page.screenshot({ path: `${shots}/02-guess-deck1.png` });

    // ── Play all 5 rounds ─────────────────────────────────────────────────────
    for (let round = 1; round <= 5; round++) {
      const badge = await page.locator('#round-badge').textContent();
      console.log(`  Round badge: "${badge}"`);

      // Set slider to a value
      const sliderVal = 30 + round * 15;
      await page.locator('#guess-slider').fill(String(sliderVal));
      await page.waitForTimeout(100);

      const display = await page.locator('#guess-display').textContent();
      console.log(`  Slider display: "${display}"`);

      // Submit
      await page.getByRole('button', { name: /final measurement/i }).click();
      await page.waitForSelector('#screen-result.active');
      console.log(`✓ Round ${round}: result screen shown`);
      await page.screenshot({ path: `${shots}/0${round + 2}-result-deck${round}.png` });

      // Check stat pills rendered
      const statCount = await page.locator('.stat-pill').count();
      console.log(`  Stat pills: ${statCount} (expected 4)`);

      // Check result badge
      const resBadge = await page.locator('#result-badge').textContent();
      console.log(`  Result badge: "${resBadge}"`);

      const nextBtn = page.locator('#btn-next');
      const nextLabel = await nextBtn.textContent();
      console.log(`  Next button: "${nextLabel.trim()}"`);
      await nextBtn.click();

      if (round < 5) {
        await page.waitForSelector('#screen-guess.active');
      } else {
        await page.waitForSelector('#screen-final.active');
      }
    }

    // ── Final screen ──────────────────────────────────────────────────────────
    const finalVisible = await page.locator('#screen-final').isVisible();
    console.log(`${finalVisible ? '✓' : '✗'} Final screen visible`);
    await page.screenshot({ path: `${shots}/08-final.png` });

    const totalScore = await page.locator('#final-score').textContent();
    console.log(`✓ Total score: ${totalScore}`);

    const tagline = await page.locator('#final-tagline').textContent();
    console.log(`✓ Tagline: "${tagline}"`);

    const rows = await page.locator('.scorecard tbody tr').count();
    console.log(`${rows === 5 ? '✓' : '✗'} Scorecard rows: ${rows} (expected 5)`);

    // ── Share button ──────────────────────────────────────────────────────────
    await page.evaluate(() => {
      navigator.clipboard = { writeText: () => Promise.resolve() };
    });
    await page.getByRole('button', { name: /share/i }).click();
    await page.waitForTimeout(300);
    const shareLabel = await page.locator('#btn-share').textContent();
    console.log(`✓ Share button after click: "${shareLabel.trim()}"`);

    // ── Summary ───────────────────────────────────────────────────────────────
    console.log('\n── Console errors ───────────────────────────────────────────');
    if (errors.length === 0) {
      console.log('✓ No JS errors');
    } else {
      errors.forEach(e => console.error('✗', e));
    }
    console.log(`\nScreenshots saved to ./${shots}/`);
  } finally {
    await browser.close();
    server?.kill();
  }
}

main().catch(err => { console.error(err); process.exitCode = 1; });
