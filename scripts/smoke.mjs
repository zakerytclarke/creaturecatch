// Manual headless smoke test. Requires a local preview server and puppeteer:
//   npm run build && npm run preview -- --port 4173 &
//   npm i -D puppeteer && node scripts/smoke.mjs
import puppeteer from 'puppeteer';

const URL = 'http://localhost:4173/creaturecatch/';
const errors = [];

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=swiftshader', '--enable-webgl'],
});
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 640 });

page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push('CONSOLE: ' + msg.text());
});
page.on('pageerror', (err) => errors.push('PAGEERROR: ' + err.message));

await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });

// Wait for the game canvas and title text to render.
await page.waitForSelector('canvas', { timeout: 15000 });
await new Promise((r) => setTimeout(r, 2500));

// Helper: read the active scene keys from the Phaser game on window.
async function activeScenes() {
  return page.evaluate(() => {
    const g = window.__cc_game;
    if (!g) return null;
    return g.scene.getScenes(true).map((s) => s.scene.key);
  });
}

// Expose the game instance for inspection.
await page.evaluate(() => {
  // Phaser stores games on the canvas parent; grab from the global if present.
});

const canvasBox = await page.$eval('canvas', (c) => {
  const r = c.getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height };
});

function gameToScreen(gx, gy) {
  // Game logical size 448x320, FIT-scaled and centered inside the canvas.
  const scale = Math.min(canvasBox.w / 448, canvasBox.h / 320);
  const offX = canvasBox.x + (canvasBox.w - 448 * scale) / 2;
  const offY = canvasBox.y + (canvasBox.h - 320 * scale) / 2;
  return { x: offX + gx * scale, y: offY + gy * scale };
}

// Click "New Game" (button centered ~ (224, 217))
let p = gameToScreen(224, 217);
await page.mouse.click(p.x, p.y);
await new Promise((r) => setTimeout(r, 800));

// Pick the first starter ("Pick" button ~ (96, 229))
p = gameToScreen(96, 229);
await page.mouse.click(p.x, p.y);
await new Promise((r) => setTimeout(r, 1500));

await page.screenshot({ path: 'scripts/smoke-world.png' });

// Confirm the World scene is active.
const scenes = await page.evaluate(() => {
  const g = window.__cc_game;
  return g ? g.scene.getScenes(true).map((s) => s.scene.key) : null;
});
console.log('Active scenes after starter pick:', JSON.stringify(scenes));

// Trigger a wild battle via the debug hook and exercise the battle scene.
const started = await page.evaluate(() => {
  const dbg = window.__ccDebug;
  if (dbg && dbg.battle) {
    dbg.battle('mosskit', 4);
    return true;
  }
  return false;
});
console.log('Battle triggered:', started);
await new Promise((r) => setTimeout(r, 1200));

// Advance the intro message by clicking a neutral area.
let n = gameToScreen(224, 120);
await page.mouse.click(n.x, n.y);
await new Promise((r) => setTimeout(r, 600));

// Click Fight (grid slot 0, button center ~ (120, 264)).
let f = gameToScreen(120, 264);
await page.mouse.click(f.x, f.y);
await new Promise((r) => setTimeout(r, 500));

// Click first move (same location).
await page.mouse.click(f.x, f.y);
await new Promise((r) => setTimeout(r, 800));

// Advance several battle messages.
for (let i = 0; i < 8; i++) {
  await page.mouse.click(n.x, n.y);
  await new Promise((r) => setTimeout(r, 350));
}

await page.screenshot({ path: 'scripts/smoke-battle.png' });

const battleScenes = await page.evaluate(() => {
  const g = window.__cc_game;
  return g ? g.scene.getScenes(true).map((s) => s.scene.key) : null;
});
console.log('Active scenes during/after battle:', JSON.stringify(battleScenes));

if (errors.length) {
  console.error('RUNTIME ERRORS DETECTED:\n' + errors.join('\n'));
  await browser.close();
  process.exit(1);
}
console.log('SMOKE TEST PASSED: no console/page errors.');
await browser.close();
