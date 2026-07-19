// Manual headless smoke test. Requires a local preview server and puppeteer:
//   npm run build && npm run preview -- --port 4173 &
//   npm i -D puppeteer && node scripts/smoke.mjs
import puppeteer from 'puppeteer';
import fs from 'fs';

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
await page.waitForSelector('canvas', { timeout: 15000 });
await new Promise((r) => setTimeout(r, 3500));

const canvasBox = await page.$eval('canvas', (c) => {
  const r = c.getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height };
});

function gameToScreen(gx, gy) {
  const scale = Math.min(canvasBox.w / 448, canvasBox.h / 320);
  const offX = canvasBox.x + (canvasBox.w - 448 * scale) / 2;
  const offY = canvasBox.y + (canvasBox.h - 320 * scale) / 2;
  return { x: offX + gx * scale, y: offY + gy * scale };
}

async function clickGame(gx, gy) {
  const p = gameToScreen(gx, gy);
  await page.mouse.click(p.x, p.y);
}

fs.mkdirSync('scripts', { recursive: true });
await page.screenshot({ path: 'scripts/smoke-title.png' });

// New Adventure button center ~ (224, 218)
await clickGame(224, 218);
await new Promise((r) => setTimeout(r, 1000));
await page.screenshot({ path: 'scripts/smoke-starter.png' });

// Pick first starter button center ~ (96, 223)
await clickGame(96, 223);
await new Promise((r) => setTimeout(r, 1800));

let scenes = await page.evaluate(() => {
  const g = window.__cc_game;
  return g ? g.scene.getScenes(true).map((s) => s.scene.key) : null;
});
console.log('Scenes after starter:', JSON.stringify(scenes));
await page.screenshot({ path: 'scripts/smoke-world.png' });

const started = await page.evaluate(() => {
  const dbg = window.__ccDebug;
  if (dbg?.battle) {
    dbg.battle('mosskit', 4);
    return true;
  }
  return false;
});
console.log('Battle triggered:', started);
await new Promise((r) => setTimeout(r, 1400));

await clickGame(224, 120);
await new Promise((r) => setTimeout(r, 500));
await clickGame(120, 264);
await new Promise((r) => setTimeout(r, 400));
await clickGame(120, 264);
await new Promise((r) => setTimeout(r, 700));
for (let i = 0; i < 8; i++) {
  await clickGame(224, 120);
  await new Promise((r) => setTimeout(r, 300));
}

await page.screenshot({ path: 'scripts/smoke-battle.png' });
scenes = await page.evaluate(() => {
  const g = window.__cc_game;
  return g ? g.scene.getScenes(true).map((s) => s.scene.key) : null;
});
console.log('Scenes battle:', JSON.stringify(scenes));

if (errors.length) {
  console.error('RUNTIME ERRORS:\n' + errors.join('\n'));
  await browser.close();
  process.exit(1);
}
console.log('SMOKE TEST PASSED');
await browser.close();
