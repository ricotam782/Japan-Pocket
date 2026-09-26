/*
 * app.js — boot: theme, home screen tiles, service worker.
 * Loaded last, after all tools have registered.
 */
(function () {
  var el = JP.ui.el;

  JP.applyTheme = function () {
    var theme = JP.store.settings().theme;
    if (theme === 'light' || theme === 'dark') document.documentElement.setAttribute('data-theme', theme);
    else document.documentElement.removeAttribute('data-theme');
  };

  JP.renderHome = function (view) {
    var grid = el('nav', { class: 'tiles', 'aria-label': 'Tools 工具' });
    JP.tools.filter(function (t) { return !t.hidden; }).forEach(function (t) {
      grid.appendChild(el('a', { class: 'tile tile-' + (t.color || 'slate'), href: '#/' + t.id }, [
        el('span', { class: 'tile-icon', 'aria-hidden': 'true', text: t.icon || '•' }),
        el('span', { class: 'tile-en', text: t.en }),
        el('span', { class: 'tile-zh', lang: 'zh-Hant', text: t.zh })
      ]));
    });
    view.appendChild(el('p', { class: 'home-greeting' }, [
      JP.ui.bi(greeting()[0], greeting()[1])
    ]));
    view.appendChild(grid);
    view.appendChild(el('p', { class: 'home-foot', id: 'offlineState' }));
    updateOnline();
  };

  function greeting() {
    var h = new Date().getHours();
    return h < 11 ? ['Good morning — enjoy Japan!', '早安，旅途愉快！']
      : h < 17 ? ['Good afternoon — enjoy Japan!', '午安，旅途愉快！']
      : ['Good evening — enjoy Japan!', '晚安，旅途愉快！'];
  }

  function updateOnline() {
    var n = document.getElementById('offlineState');
    if (!n) return;
    n.textContent = navigator.onLine
      ? '● Online 已連線 · works offline too 離線亦可使用'
      : '○ Offline 離線中 · all tools still work 所有工具仍可使用';
  }
  window.addEventListener('online', updateOnline);
  window.addEventListener('offline', updateOnline);

  JP.applyTheme();
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', JP.applyTheme);
  }

  JP.router.start();

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function (e) {
        console.warn('Service worker registration failed', e);
      });
    });
  }
})();
