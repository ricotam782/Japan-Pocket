/*
 * router.js — hash routes: #/            → home
 *                          #/money       → tool "money"
 *                          #/money/wallet → tool "money", params ['wallet']
 */
window.JP = window.JP || {};

JP.router = (function () {
  function parse() {
    var h = (location.hash || '').replace(/^#\/?/, '');
    var parts = h.split('/').filter(Boolean).map(decodeURIComponent);
    return { id: parts[0] || '', params: parts.slice(1) };
  }

  function go(path) {
    var target = '#/' + (path || '');
    if (location.hash === target) render();
    else location.hash = target;
  }

  /** Replace current route without adding a Back step (used for tabs). */
  function replace(path) {
    history.replaceState(history.state, '', '#/' + (path || ''));
    render();
  }

  function setHeader(tool) {
    var title = document.getElementById('topTitle');
    var back = document.getElementById('backBtn');
    title.textContent = '';
    if (tool) {
      JP.ui.append(title, [
        JP.ui.el('span', { class: 'en', text: tool.en }),
        JP.ui.el('span', { class: 'zh', lang: 'zh-Hant', text: tool.zh })
      ]);
      back.hidden = false;
      document.title = tool.en + ' · Japan Pocket';
    } else {
      JP.ui.append(title, [
        JP.ui.el('span', { class: 'en', text: 'Japan Pocket' }),
        JP.ui.el('span', { class: 'zh', lang: 'zh-Hant', text: '日本隨身寶' })
      ]);
      back.hidden = true;
      document.title = 'Japan Pocket';
    }
  }

  /** Redraw the current route. render({keepScroll: true}) keeps the scroll position. */
  function render(opts) {
    var keep = opts && opts.keepScroll === true;
    var y = window.scrollY;
    JP.ui.closeShow(true);
    var route = parse();
    var view = document.getElementById('view');
    var tool = route.id ? JP.getTool(route.id) : null;
    view.textContent = '';
    view.className = 'view';
    if (!tool) {
      setHeader(null);
      JP.renderHome(view);
    } else {
      setHeader(tool);
      view.classList.add('tool-' + tool.id);
      tool.render(view, route.params);
    }
    window.scrollTo(0, keep ? y : 0);
  }

  function start() {
    window.addEventListener('hashchange', function () { render(); });
    window.addEventListener('popstate', function () {
      // Back button while a fullscreen card is open just closes the card.
      JP.ui.closeShow(true);
    });
    document.getElementById('backBtn').addEventListener('click', function () {
      var r = parse();
      if (r.params.length) go(r.id);
      else go('');
    });
    render();
  }

  return { start: start, go: go, replace: replace, render: render, parse: parse };
})();
