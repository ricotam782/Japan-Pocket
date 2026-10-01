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
    const u = new URL(route.request().url());
    const q = u.searchParams.get('q'), tl = u.searchParams.get('tl');
    const ja = tl === 'en' ? 'Zzz Mart (en)' : tl === 'zh-TW' ? '測試商店' : q.includes('toilet') ? 'トイレはどこですか？' : 'テスト';
    route.fulfill({
      status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify([[[ja, q, null, null, 10], [null, null, 'Toire wa doko desu ka?', null]], null, 'en'])
    });
  });
  await context.route(/mymemory/, (route) => route.fulfill({
    status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ responseData: { translatedText: '駅はどこですか？' }, responseStatus: 200 })
  }));
  // Wikidata / Wikipedia (chain store lookup) are mocked as well.
  let wikiLang = '';
  const CORS = { 'Access-Control-Allow-Origin': '*' };
  await context.route(/wikidata\.org/, (route) => {
    const u = new URL(route.request().url());
    const action = u.searchParams.get('action');
    if (action === 'wbsearchentities') {
      const q = u.searchParams.get('search');
      const hit = /一蘭|ichiran/i.test(q);
      return route.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify({ search: hit ? [{ id: 'Q1' }] : [] }) });
    }
    const ENT = {
      Q1: {
        id: 'Q1',
        labels: { ja: { value: '一蘭' }, en: { value: 'Ichiran' }, 'zh-hk': { value: '一蘭拉麵' } },
        descriptions: { 'zh-hk': { value: '日本拉麵連鎖店' }, en: { value: 'Japanese ramen chain' } },
        claims: { P856: [{ mainsnak: { datavalue: { value: 'https://ichiran.com' } } }] },
        sitelinks: { zhwiki: { title: '一蘭' }, enwiki: { title: 'Ichiran' } }
      },
      Q2: {
        id: 'Q2', labels: { ja: { value: 'ねぎしフードサービス' } },
        descriptions: { ja: { value: '牛たん料理店「ねぎし」を運営する企業' } }, claims: {}, sitelinks: { jawiki: { title: 'ねぎしフードサービス' } }
      }
    };
    const ids = (u.searchParams.get('ids') || '').split('|');
    const entities = {};
    ids.forEach((id) => { if (ENT[id]) entities[id] = ENT[id]; });
    route.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify({ entities }) });
  });
  // Wikipedia full-text search: only "ねぎし" finds an article (company page linked to Q2) plus one page with no item.
  await context.route(/wikipedia\.org\/w\/api\.php/, (route) => {
    const q = new URL(route.request().url()).searchParams.get('gsrsearch') || '';
    const body = /ねぎし/.test(q) ? { query: { pages: {
      10: { index: 1, title: 'ねぎしフードサービス', pageprops: { wikibase_item: 'Q2' } },
      11: { index: 2, title: '牛たん', description: '牛の舌を使った料理' }
    } } } : {};
    route.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify(body) });
  });
  await context.route(/wikipedia\.org\/api/, (route) => {
    wikiLang = route.request().headers()['accept-language'] || '';
    route.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify({
      extract: '一蘭是源自福岡的豚骨拉麵連鎖店。', content_urls: { mobile: { page: 'https://zh.m.wikipedia.org/wiki/一蘭' } }
    }) });
  });
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
  async function noOverflowOn(pg, label) {
    const w = await pg.evaluate(() => document.documentElement.scrollWidth);
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
  const tileText = await page.locator('.tiles').innerText();
  check(tileText.includes('Chain stores') && !tileText.includes('Settings'), 'Chain stores tile shown; Settings moved off the grid');
  await page.locator('#settingsBtn').click();
  await page.waitForSelector('.traveller-list');
  check(page.url().endsWith('#/settings'), '⚙️ header button opens Settings');
  check(await page.locator('#settingsBtn').isHidden(), '⚙️ button hidden inside tools');
  await page.goto(base);
  await noOverflow('home');
  await shot('01-home-light');

  console.log('Every tool renders on a narrow screen');
  const routes = ['phrases', 'phrases/taxi', 'phrases/food', 'phrases/edit', 'money', 'money/wallet', 'money/settle',
    'safety', 'safety/medical/t1', 'tips', 'tips/garbage', 'tips/etiquette', 'lists', 'lists/shopping', 'lists/omiyage', 'chains', 'chains/add', 'settings', 'sync'];
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

  console.log('Shopping list');
  await page.goto(base + '#/lists/shopping');
  check((await page.locator('.tab.active').innerText()).includes('Shopping'), 'shopping list tab');
  await page.locator('form input').nth(0).fill('Muji socks');
  await page.locator('form input').nth(1).fill('Don Quijote');
  await page.locator('form button[type=submit]').click();
  await page.waitForTimeout(100);
  check((await page.locator('.checklist').innerText()).includes('📍 Don Quijote'), 'item added with where to buy');
  await page.locator('.check-label input').first().check();
  await page.waitForTimeout(100);
  await page.reload();
  check(await page.locator('.check-item.done').count() === 1, 'tick saved after reload');
  check((await page.locator('.progress-text').innerText()).startsWith('1 / 1'), 'progress 1 / 1');
  await noOverflow('shopping list');
  await shot('12-shopping');

  console.log('Chain stores');
  await page.goto(base + '#/chains/add');
  await page.locator('form input').fill('一蘭');
  await page.locator('form button[type=submit]').click();
  await page.waitForSelector('.chain-pick');
  check((await page.locator('.chain-pick').first().innerText()).includes('Ichiran'), 'search by name finds a match');
  await noOverflow('chain search results');
  await shot('16-chain-search');
  await page.locator('.chain-pick').first().click();
  await page.waitForFunction(() => ((document.querySelector('.chain-summary-status') || {}).textContent || '').includes('✓'));
  const vals = await page.locator('form input[type=text]').evaluateAll((els) => els.map((e) => e.value));
  check(vals.includes('一蘭') && vals.includes('Ichiran') && vals.includes('一蘭拉麵') && vals.includes('日本拉麵連鎖店'), 'names in ja/en/zh + description filled automatically');
  check(wikiLang === 'zh-hk', 'Wikipedia asked for Traditional Chinese');
  await page.locator('form textarea').fill('Booth seats, order sheet in English');
  await page.locator('form button[type=submit]').click();
  await page.waitForSelector('.chain-hero');
  check((await page.locator('.chain-ja-big').innerText()) === '一蘭', 'detail shows Japanese sign name big');
  check((await page.locator('.chain-summary').innerText()).includes('福岡'), 'Wikipedia description saved');
  const maps = await page.locator('a', { hasText: 'Nearby branches' }).getAttribute('href');
  check(maps.startsWith('https://www.google.com/maps/search/') && maps.includes(encodeURIComponent('一蘭')), 'Nearby opens Google Maps search');
  await page.locator('.choice', { hasText: 'Want to go' }).click();
  await page.waitForTimeout(80);
  check(await page.locator('.choice.active', { hasText: 'Want to go' }).count() === 1, '★ want to go toggles');
  await page.locator('.btn', { hasText: 'Is there one nearby' }).click();
  check((await page.locator('.show-ja').innerText()).includes('この近くに「一蘭」はありますか'), 'ask-nearby card shown fullscreen');
  await page.locator('.show-close').click();
  await noOverflow('chain detail');
  await shot('17-chain-detail');
  await page.goto(base + '#/');
  await page.goto(base + '#/chains/add');
  await page.locator('form input').fill('ねぎし 牛たん');
  await page.locator('form button[type=submit]').click();
  await page.waitForSelector('.chain-pick');
  const picks = await page.locator('.chain-pick').allInnerTexts();
  check(picks.some((t) => t.includes('ねぎしフードサービス')), 'full-text Wikipedia search finds a chain that name search misses');
  check(picks.some((t) => t.includes('牛たん')), 'Wikipedia pages without a Wikidata item are offered too');
  const gmWithResults = await page.locator('.chain-fallback a', { hasText: 'Check the name on Google Maps' }).getAttribute('href');
  check(gmWithResults.includes(encodeURIComponent('ねぎし')), 'Google Maps check offered even when there are results');
  check(await page.locator('.chain-fallback .btn', { hasText: 'Enter it myself' }).count() === 1, 'manual entry offered below results');
  await noOverflow('search results with fallback');
  await shot('19-chain-fallback');
  await page.goto(base + '#/');
  await page.goto(base + '#/chains/add');
  await page.locator('form input').fill('Zzz Mart');
  await page.locator('form button[type=submit]').click();
  await page.waitForSelector('.chain-results .tr-msg.warn');
  const gm = await page.locator('a', { hasText: 'Check the name on Google Maps' }).getAttribute('href');
  check(gm.includes('google.com/maps/search') && gm.includes('Zzz'), 'not found → Google Maps check link');
  await page.locator('.btn', { hasText: 'Enter it myself' }).click();
  check((await page.locator('form input[type=text]').nth(1).inputValue()) === 'Zzz Mart', 'not found → manual form keeps the typed English name');
  await page.locator('.btn', { hasText: 'Fill in the other languages' }).click();
  await page.waitForFunction(() => document.querySelectorAll('form input[type=text]')[2].value.length > 0);
  const filled = await page.locator('form input[type=text]').evaluateAll((els) => els.slice(0, 3).map((e) => e.value));
  check(filled[0] === 'テスト' && filled[1] === 'Zzz Mart' && filled[2] === '測試商店', 'empty Japanese + Chinese names filled from the English one');
  await page.locator('.choice', { hasText: 'Shopping' }).click();
  await page.locator('form button[type=submit]').click();
  await page.waitForSelector('.chain-hero');
  await page.goto(base + '#/chains');
  check((await page.locator('.chain-list').innerText()).includes('一蘭') && (await page.locator('.chain-badges').first().innerText()).includes('想去'), 'list shows chain with ★ badge');
  await page.locator('.tab', { hasText: 'Shopping' }).click();
  check((await page.locator('.chain-list').innerText()).includes('Zzz Mart'), 'shopping tab lists the shop');
  await page.locator('.tab', { hasText: 'Restaurants' }).click();
  await shot('18-chains');

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
  for (const r of ['phrases', 'money', 'money/wallet', 'safety', 'tips', 'lists', 'chains', 'settings']) {
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
  await page.goto(base + '#/chains');
  check((await page.locator('.chain-list').innerText()).includes('一蘭'), 'saved chains readable offline');
  check(offRate.includes('2026-09-23') && offRate.toLowerCase().includes('offline'), 'offline uses saved rate with date');
  await page.goto(base + '#/money/wallet');
  check((await page.locator('.stat-yen').nth(1).innerText()) === '¥9,900', 'wallet data still there offline');
  await shot('11-offline-money');

  console.log('Share between two phones');
  async function phone() {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true, locale: 'en-CA', serviceWorkers: 'block' });
    await ctx.route(/frankfurter|googleapis|mymemory/, (r) => r.abort());
    const pg = await ctx.newPage();
    pg.on('pageerror', (e) => errors.push('phone: ' + e.message));
    pg.on('dialog', (d) => d.accept());
    await pg.goto(base);
    return pg;
  }
  async function wallet(pg, amount, payer, note) {
    await pg.goto(base + '#/money/wallet');
    await pg.locator('.form .input-big').fill(String(amount));
    await pg.locator('.form .chips').first().locator('.chip', { hasText: payer }).click();
    await pg.locator('.form input[type=text]').last().fill(note);
    await pg.locator('.form button[type=submit]').click();
    await pg.waitForTimeout(80);
  }
  async function shareText(pg, from) {
    return pg.evaluate((f) => JSON.stringify(JP.sync.buildPackage(
      JP.sync.CATEGORIES.filter((c) => JP.sync.prefs()[c.id]).map((c) => c.id), f)), from);
  }
  async function receive(pg, text) {
    await pg.goto(base + '#/');
    await pg.goto(base + '#/sync');
    await pg.locator('.details summary', { hasText: 'Paste text' }).click();
    await pg.locator('.details textarea').fill(text);
    await pg.locator('.details .btn', { hasText: 'Check' }).click();
    await pg.waitForSelector('.sync-preview > *');
    return pg.locator('.sync-preview').innerText();
  }
  async function receiveFile(pg, text) {
    await pg.goto(base + '#/');
    await pg.goto(base + '#/sync');
    await pg.locator('input[type=file]').setInputFiles({ name: 'japan-pocket-share.json', mimeType: 'application/json', buffer: Buffer.from(text) });
    await pg.waitForSelector('.sync-preview > *');
    return pg.locator('.sync-preview').innerText();
  }
  const A = await phone(), B = await phone();
  await A.goto(base + '#/settings');
  const an = A.locator('.traveller input');
  await an.nth(0).fill('Rico'); await an.nth(0).dispatchEvent('change');
  await an.nth(1).fill('Mei'); await an.nth(1).dispatchEvent('change');
  await wallet(A, 3000, 'Rico', 'Ramen');
  await wallet(A, 1200, 'Rico', 'Coffee');
  await A.goto(base + '#/safety/medical/t1');
  await A.locator('form textarea').first().fill('Penicillin');
  await A.locator('form button[type=submit]').click();
  await A.goto(base + '#/sync');
  await noOverflowOn(A, 'sync screen');
  if (SHOTS) await A.screenshot({ path: path.join(SHOTS, '13-sync.png'), fullPage: true });

  let pv = await receive(B, await shareText(A, 'Rico'));
  check(pv.includes('From Rico') && pv.includes('+2 new'), 'phone B previews 2 new expenses from Rico');
  if (SHOTS) await B.screenshot({ path: path.join(SHOTS, '14-sync-preview.png'), fullPage: true });
  await B.locator('.sync-preview .btn', { hasText: 'Merge' }).click();
  await B.waitForTimeout(100);
  const bNotice = await B.locator('.sync-done').innerText();
  check(bNotice.includes('已合併') && !bNotice.includes('下載項目'), 'merge notice shown; no file tip after pasted text');
  const bState = await B.evaluate(() => ({
    names: JP.store.settings().travellers.map((t) => t.name).join(','),
    wallet: JP.store.get('wallet', []).length,
    allergy: (JP.store.get('medical', {}).t1 || {}).allergies
  }));
  check(bState.names === 'Rico,Mei', 'traveller names synced');
  check(bState.wallet === 2, 'expenses synced');
  check(bState.allergy === 'Penicillin', 'medical card synced');

  // B adds one and deletes "Coffee", then shares back.
  await wallet(B, 5000, 'Mei', 'Tickets');
  await B.goto(base + '#/money/wallet');
  await B.locator('.entry', { hasText: 'Coffee' }).locator('.icon-btn').click();
  await B.waitForTimeout(80);
  const back = await shareText(B, 'Mei');
  pv = await receiveFile(A, back);
  check(pv.includes('+1 new') && pv.includes('1 removed'), 'phone A previews 1 new + 1 removed from Mei (via file)');
  await A.locator('.sync-preview .btn', { hasText: 'Merge' }).click();
  await A.waitForTimeout(100);
  const aNotice = await A.locator('.sync-done').innerText();
  check(aNotice.includes('Downloads') && aNotice.includes('下載項目'), 'after a file merge, notice says the file can be deleted');
  await noOverflowOn(A, 'merge notice');
  if (SHOTS) await A.screenshot({ path: path.join(SHOTS, '15-merged.png') });
  const aNotes = await A.evaluate(() => JP.store.get('wallet', []).map((e) => e.note).sort().join(','));
  check(aNotes === 'Ramen,Tickets', 'A now has Ramen + Tickets (Coffee deletion carried over)');
  pv = await receiveFile(A, back);
  check(pv.includes('Already up to date') && pv.includes('下載項目'), 'same file again: no changes, delete tip shown');
  pv = await receive(B, await shareText(A, 'Rico'));
  check(pv.includes('Already up to date'), 'both phones in sync');
  await A.goto(base + '#/money/settle');
  const tA = (await A.locator('.transfer').allInnerTexts()).join(' ').replace(/\s+/g, ' ');
  check(tA.includes('Rico → Mei') && tA.includes('¥1,000'), 'settlement from synced data: Rico pays Mei ¥1,000');
  const bad = await receive(B, '{"hello":1}');
  check(bad.includes('not a Japan Pocket'), 'rejects a wrong file');
  await A.context().close(); await B.context().close();

  check(errors.length === 0, 'no JavaScript errors' + (errors.length ? ': ' + errors.join(' | ') : ''));

  await browser.close();
  server.close();
  console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll checks passed');
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
