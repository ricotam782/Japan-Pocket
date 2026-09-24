# Japan Pocket 日本隨身寶

A mobile-first, offline-capable web app for travelling in Japan — one home screen, big tiles, one tool per tile.
Designed for iPhone (Safari), with large text, big buttons, English labels with Traditional Chinese (繁體) subtitles, and light/dark mode.

一個為日本旅遊而設的手機網頁應用程式：大字、大按鈕、英文配繁體中文，安裝後可離線使用。

| Tool 工具 | What it does 功能 |
|---|---|
| 💬 **Phrases 對話** | Phrase cards by category (restaurant, shopping, hotel, transport, help), speak aloud in Japanese, full-screen "show to staff" mode, favourites, your own cards, "type anything" translated **inside the app** (English or Chinese → Japanese, with a reading, recent translations kept for offline use), taxi card, food/dietary card |
| 💴 **Money 錢** | Yen ⇄ CAD converter (live rate from [Frankfurter](https://frankfurter.dev), last rate cached with its date for offline use, manual override), quick price check, trip wallet for any number of travellers, **end-of-trip settlement: who pays whom** |
| 🆘 **Safety 安全** | One-tap 110 / 119, what to say when they answer, medical info card per traveller (Japanese + English), Canadian Embassy in Tokyo, 24/7 Ottawa emergency line, emergency phrase cards |
| 📋 **Cheat sheets 貼士** | Toilet buttons, garbage sorting, etiquette |
| ✅ **Lists 清單** | Packing checklist and omiyage (souvenir) list |
| ⚙️ **Settings 設定** | Travellers (unlimited), theme, backup / restore / erase |

All data stays in `localStorage` on the phone. There is no backend, no account and no tracking.
所有資料只儲存在手機上，沒有伺服器、沒有帳戶。

---

## Install on iPhone 安裝到 iPhone

1. Open the site in **Safari** 用 Safari 開啟網址
2. Tap **Share** (square with arrow) 按「分享」
3. Tap **Add to Home Screen** 選「加入主畫面」
4. Open it once while online; after that it works offline 先在有網絡時開啟一次，之後可離線使用

"Speak" uses the iPhone's built-in Japanese voice (Kyoko/Otoya). If nothing is heard, check the silent switch and
*Settings › Accessibility › Spoken Content › Voices › Japanese*.

## Run locally 本機執行

No build step. Serve the folder with any static server (service workers need `http://localhost` or HTTPS, not `file://`):

```bash
python3 -m http.server 8000
# or: npx http-server -p 8000
```

Open <http://localhost:8000>. To try it on your phone, use your computer's LAN IP (offline mode needs HTTPS, so test that on GitHub Pages).

## Deploy to GitHub Pages 部署到 GitHub Pages

1. Push this repository to GitHub.
2. On GitHub: **Settings › Pages**.
3. Under **Build and deployment**, choose **Source: Deploy from a branch**.
4. Pick the branch (e.g. `main`) and folder **/ (root)**, then **Save**.
5. After a minute the site is live at `https://<your-username>.github.io/<repo-name>/`.

All paths are relative, so it works from a sub-folder like `/Japan-Pocket/`. `.nojekyll` tells Pages to serve files as-is.

### Releasing an update

Phones keep the cached copy until the service worker changes. **Whenever you change any file, bump `VERSION` in `sw.js`**
(e.g. `jp-v1.0.0` → `jp-v1.0.1`). If you add a new file, also add it to `APP_FILES` in `sw.js`.
Users get the new version the next time they open the app online (sometimes it takes a second launch).

## Project structure

```
index.html              App shell, loads all scripts
manifest.webmanifest    PWA metadata and icons
sw.js                   Service worker (offline cache)
css/app.css             All styles; colour tokens for light/dark
icons/                  App icons (SVG source + PNGs)
js/core/
  store.js              localStorage helpers (keys prefixed "jp.")
  translate.js          In-app translation (English/Chinese → Japanese)
  ui.js                 Element builder, bilingual labels, speech, show mode, phrase cards, tabs, formatting
  registry.js           JP.registerTool() — tools add themselves to the home screen
  router.js             Hash routes (#/money/wallet)
  app.js                Boot: theme, home tiles, service worker
js/data/                Content (phrases, dietary notes, emergency info, cheat sheets) — easy to edit
js/tools/               One file per tool
tests/smoke.js          Automated phone-size + offline test
```

## Adding a new tool 新增工具

1. Create `js/tools/mytool.js`:

   ```js
   (function () {
     var ui = JP.ui, el = ui.el;
     JP.registerTool({
       id: 'weather', en: 'Weather', zh: '天氣', icon: '⛅', color: 'teal', order: 60,
       render: function (view, params) {
         // params = parts of the URL after #/weather/…
         view.appendChild(ui.section('Today', '今天', [el('p', { text: 'Sunny' })]));
       }
     });
   })();
   ```

2. Add `<script src="js/tools/mytool.js"></script>` to `index.html` (before `js/core/app.js`).
3. Add the path to `APP_FILES` in `sw.js` and bump `VERSION`.

Store data with `JP.store.get(key, default)` / `JP.store.set(key, value)`. Tile colours: `indigo red gold green teal slate`.

## Testing

`tests/smoke.js` opens the app in headless Chromium at iPhone SE size (375×667) and checks:
every screen renders with no horizontal scrolling, phrase cards / show mode / favourites / own cards,
food and taxi cards, three travellers + wallet + settlement maths, dark mode, and that after going
**offline** the app reloads, every tool works, and the saved exchange rate (with its date) is used.
The exchange-rate API is mocked, so the test does not need the internet.

```bash
npm install --no-save playwright   # once, if Playwright isn't installed globally
node tests/smoke.js                # add a folder name to also save screenshots
```

## Notes

- Emergency and embassy details are in `js/data/emergency.js`. Please confirm them on
  [travel.gc.ca](https://travel.gc.ca/assistance/embassies-consulates/japan) before travelling.
- "Type anything" and "Update rate" need the internet; everything else works offline.
- In-app translation (`js/core/translate.js`) uses Google's free public web endpoint (no key) and falls back to
  [MyMemory](https://mymemory.translated.net). The Google endpoint is unofficial and could change; if both fail,
  the app offers a link to open Google Translate instead.
- The wallet splits each expense evenly among the people ticked under "Shared by"; any leftover
  yen from rounding goes to the first people in the list. Settlement needs at most (number of people − 1) transfers.
