/*
 * Smoke test: narrow phone screen + offline.
 *
 *   npm install --no-save playwright   (or use a global install)
 *   node tests/smoke.js [screenshotDir]
 *
 * Starts a tiny static server, opens the app at iPhone SE size (375×667),
 * walks through every tool, checks for horizontal overflow and JS errors,
 * exercises the wallet settlement, then goes offline and reloads.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) { ({ chromium } = require(path.join(process.execPath, '../../lib/node_modules/playwright'))); }

const ROOT = path.resolve(__dirname, '..');
const SHOTS = process.argv[2];
const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json'
};

function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p.endsWith('/')) p += 'index.html';
      const file = path.join(ROOT, p);
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404); res.end('not found'); return;
      }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

let failures = 0;
function check(cond, msg) {
  console.log((cond ? '  ✓ ' : '  ✗ ') + msg);
  if (!cond) failures++;
}

(async () => {
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 375, height: 667 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    locale: 'en-CA'
  });
  // The exchange-rate API is mocked so the test does not depend on the network.
  await context.route(/frankfurter/, (route) => route.fulfill({
    status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ amount: 1, base: 'JPY', date: '2026-09-23', rates: { CAD: 0.0092 } })
  }));
  // Translation APIs are mocked too. googleUp=false simulates Google failing → MyMemory fallback.
  let googleUp = true;
  await context.route(/translate\.googleapis\.com/, (route) => {
    if (!googleUp) return route.fulfill({ status: 429, body: 'busy' });
    const q = new URL(route.request().url()).searchParams.get('q');
    const ja = q.includes('toilet') ? 'トイレはどこですか？' : 'テスト';
    route.fulfill({
      status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify([[[ja, q, null, null, 10], [null, null, 'Toire wa doko desu ka?', null]], null, 'en'])
    });
  });
  await context.route(/mymemory/, (route) => route.fulfill({
    status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ responseData: { translatedText: '駅はどこですか？' }, responseStatus: 200 })
  }));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // 429 = the simulated Google failure used to test the MyMemory fallback.
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('429')) errors.push(m.text()); });
  page.on('dialog', (d) => d.accept());

  async function noOverflow(label) {
    const w = await page.evaluate(() => document.documentElement.scrollWidth);
    check(w <= 375, `${label}: no horizontal scroll (width ${w})`);
  }
  async function shot(name) {
    if (!SHOTS) return;
    fs.mkdirSync(SHOTS, { recursive: true });
    await page.screenshot({ path: path.join(SHOTS, name + '.png'), fullPage: true });
  }

  console.log('Home');
  await page.goto(base);
  await page.waitForSelector('.tile');
  check(await page.locator('.tile').count() === 6, '6 tool tiles on home screen');
  await noOverflow('home');
  await shot('01-home-light');

  console.log('Every tool renders on a narrow screen');
  const routes = ['phrases', 'phrases/taxi', 'phrases/food', 'phrases/edit', 'money', 'money/wallet', 'money/settle',
    'safety', 'safety/medical/t1', 'tips', 'tips/garbage', 'tips/etiquette', 'lists', 'lists/omiyage', 'settings'];
  for (const r of routes) {
    await page.goto(base + '#/' + r);
    await page.waitForTimeout(150);
    const txt = await page.locator('#view').innerText();
    check(txt.trim().length > 20, `#/${r} rendered`);
    await noOverflow('#/' + r);
  }

  console.log('Phrases');
  await page.goto(base + '#/phrases');
  await page.locator('.tab', { hasText: 'Restaurant' }).click();
  await page.locator('.phrase-card').first().click();
  check(await page.locator('#showOverlay .show-ja').isVisible(), 'tapping a card opens show mode');
  await page.waitForTimeout(400);
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, '02-show-mode.png') });
  await page.locator('.show-close').click();
  check(await page.locator('#showOverlay').count() === 0, 'show mode closes');
  await page.locator('.phrase-card').first().locator('.icon-btn.fav').click();
  await page.locator('.tab', { hasText: 'Favourites' }).click();
  check(await page.locator('.phrase-card').count() === 1, 'favourite appears in Favourites tab');
  await page.goto(base + '#/phrases/edit');
  await page.locator('input').first().fill('Is this gluten free?');
  await page.locator('textarea.input-ja').fill('これはグルテンフリーですか？');
  await page.locator('button[type=submit]').click();
  await page.waitForTimeout(100);
  await page.reload();
  await page.locator('.tab', { hasText: 'My cards' }).click();
  check((await page.locator('.phrase-list').innerText()).includes('グルテンフリー'), 'own card saved and survives reload');
  await shot('03-phrases');

  console.log('In-app translation');
  await page.goto(base + '#/phrases');
  await page.locator('.seg-btn', { hasText: 'English' }).click();
  await page.locator('form.card textarea').fill('Where is the toilet?');
  await page.locator('form.card button[type=submit]').click();
  await page.waitForSelector('.tr-result .phrase-ja');
  check(page.url().endsWith('#/phrases') && context.pages().length === 1, 'translation stays inside the app');
  check((await page.locator('.tr-result .phrase-ja').innerText()) === 'トイレはどこですか？', 'Japanese shown in the app');
  check((await page.locator('.tr-result .phrase-romaji').innerText()).includes('Toire'), 'romaji reading shown');
  await noOverflow('translation result');
  await shot('03b-translate');
  await page.locator('.tr-result .btn', { hasText: 'Save to My cards' }).click();
  check((await page.locator('.tr-result').innerText()).includes('Saved in My cards'), 'translation saved to My cards');
  check(await page.locator('.recent-head').count() === 0, 'current result is not duplicated in Recent');
  googleUp = false;
  await page.locator('form.card textarea').fill('Where is the station?');
  await page.locator('form.card button[type=submit]').click();
  await page.waitForFunction(() => (document.querySelector('.tr-result .phrase-ja') || {}).textContent === '駅はどこですか？');
  check(true, 'falls back to MyMemory when Google fails');
  check((await page.locator('.recent-list').innerText()).includes('トイレはどこですか？'), 'earlier translation listed under Recent');
  googleUp = true;
  await page.goto(base + '#/phrases/edit');
  await page.locator('input').first().fill('Where is the toilet?');
  await page.locator('.btn', { hasText: 'Fill in Japanese' }).click();
  await page.waitForFunction(() => document.querySelector('textarea.input-ja').value.length > 0);
  check((await page.locator('textarea.input-ja').inputValue()) === 'トイレはどこですか？', 'add-card form fills Japanese automatically');

  console.log('Food + taxi cards');
  await page.goto(base + '#/phrases/food');
  await page.locator('.check', { hasText: 'Shellfish' }).click();
  await page.locator('.check', { hasText: 'No pork' }).click();
  const note = await page.locator('.food-preview').innerText();
  check(note.includes('えび・かに') && note.includes('豚肉'), 'food note lists chosen items in Japanese');
  await page.goto(base + '#/phrases/taxi');
  await page.locator('textarea').fill('東京都新宿区西新宿1-2-3');
  await page.locator('form button[type=submit]').click();
  await page.waitForTimeout(100);
  await page.locator('.dest .btn-primary').click();
  check((await page.locator('.show-ja').innerText()).includes('西新宿'), 'taxi card shows address fullscreen');
  await page.locator('.show-close').click();

  console.log('Settings: add a third traveller');
  await page.goto(base + '#/settings');
  const names = page.locator('.traveller input');
  await names.nth(0).fill('Ann'); await names.nth(0).dispatchEvent('change');
  await names.nth(1).fill('Ben'); await names.nth(1).dispatchEvent('change');
  await page.locator('.add-row input').fill('Cat');
  await page.locator('.add-row button').click();
  await page.waitForTimeout(100);
  check(await page.locator('.traveller').count() === 3, 'three travellers');

  console.log('Money');
  await page.goto(base + '#/money');
  await page.waitForTimeout(300);
  check((await page.locator('.rate-sub').innerText()).includes('2026-09-23'), 'rate fetched and dated');
  await page.locator('.input-big').first().fill('1000');
  check((await page.locator('.big-result').first().innerText()) === 'C$9.20', 'quick price check ¥1000 → C$9.20');
  await shot('04-money');

  async function addExpense(amount, catEn, payer) {
    await page.goto(base + '#/money/wallet');
    await page.locator('.form .input-big').fill(String(amount));
    await page.locator('.choice', { hasText: catEn }).click();
    await page.locator('.form .chips').first().locator('.chip', { hasText: payer }).click();
    await page.locator('.form button[type=submit]').click();
    await page.waitForTimeout(100);
  }
  await addExpense(3000, 'Transport', 'Ann');
  await addExpense(6000, 'Food', 'Ben');
  await addExpense(900, 'Tickets', 'Cat');
  check((await page.locator('.stat-yen').nth(1).innerText()) === '¥9,900', 'trip total ¥9,900');
  await noOverflow('wallet with entries');
  await shot('05-wallet');

  await page.locator('a', { hasText: 'End of trip' }).click();
  await page.waitForTimeout(150);
  const transfers = await page.locator('.transfer').allInnerTexts();
  const flat = transfers.map((t) => t.replace(/\s+/g, ' '));
  check(flat.length === 2, 'two transfers');
  check(flat.some((t) => t.includes('Cat → Ben') && t.includes('¥2,400')), 'Cat pays Ben ¥2,400');
  check(flat.some((t) => t.includes('Ann → Ben') && t.includes('¥300')), 'Ann pays Ben ¥300');
  await noOverflow('settle');
  await shot('06-settle');

  const uneven = await page.evaluate(() => JP.money.settle(
    [{ amount: 1000, payer: 'a', shares: ['a', 'b', 'c'] }],
    [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' }]));
  const owed = uneven.transfers.reduce((s, t) => s + t.amount, 0);
  check(owed === 666, 'uneven split rounds to whole yen (¥1000 / 3 → others owe ¥666)');

  console.log('Safety');
  await page.goto(base + '#/safety');
  check(await page.locator('a[href="tel:110"]').count() === 1 && await page.locator('a[href="tel:119"]').count() === 1, '110 and 119 call links');
  await shot('07-safety');

  console.log('Dark mode');
  await page.goto(base + '#/settings');
  await page.locator('.choice', { hasText: 'Dark' }).click();
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  check(bg === 'rgb(18, 24, 35)', 'dark theme applied');
  await page.goto(base);
  await shot('08-home-dark');
  await page.goto(base + '#/money/settle');
  await shot('09-settle-dark');
  await page.goto(base + '#/phrases');
  await shot('10-phrases-dark');

  console.log('Offline');
  await page.goto(base);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload(); // make sure the page is controlled by the SW
  check(await page.evaluate(() => !!navigator.serviceWorker.controller), 'service worker controls the page');
  await context.setOffline(true);
  await page.reload();
  await page.waitForSelector('.tile');
  check(await page.locator('.tile').count() === 6, 'home loads offline');
  for (const r of ['phrases', 'money', 'money/wallet', 'safety', 'tips', 'lists', 'settings']) {
    await page.goto(base + '#/' + r);
    await page.waitForTimeout(100);
    check((await page.locator('#view').innerText()).trim().length > 20, `#/${r} works offline`);
  }
  await page.goto(base + '#/phrases');
  check(await page.locator('.recent-head').count() === 1, 'recent translations visible offline');
  await page.locator('form.card textarea').fill('hello');
  await page.locator('form.card button[type=submit]').click();
  check((await page.locator('.tr-msg').innerText()).includes('needs internet'), 'offline translation shows a clear message');
  await page.goto(base + '#/money');
  await page.waitForTimeout(200);
  const offRate = await page.locator('.rate-sub').innerText();
  check(offRate.includes('2026-09-23') && offRate.toLowerCase().includes('offline'), 'offline uses saved rate with date');
  await page.goto(base + '#/money/wallet');
  check((await page.locator('.stat-yen').nth(1).innerText()) === '¥9,900', 'wallet data still there offline');
  await shot('11-offline-money');

  check(errors.length === 0, 'no JavaScript errors' + (errors.length ? ': ' + errors.join(' | ') : ''));

  await browser.close();
  server.close();
  console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll checks passed');
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
