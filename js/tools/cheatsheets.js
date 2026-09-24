/*
 * Cheat sheets 貼士 — toilet buttons, garbage sorting, etiquette.
 * Content lives in js/data/cheatsheets.js.
 * Routes: #/tips, #/tips/<sheetId>
 */
(function () {
  var ui = JP.ui, el = ui.el, bi = ui.bi;

  function renderSheet(view, sheet) {
    view.appendChild(ui.tabs(JP.data.cheatsheets.map(function (s) {
      return { id: s.id, en: s.icon + ' ' + s.en, zh: s.zh };
    }), sheet.id, function (id) { JP.router.replace('tips/' + id); }));

    view.appendChild(el('p', { class: 'intro' }, [bi(sheet.intro.en, sheet.intro.zh)]));

    var list = el('div', { class: 'sheet' });
    sheet.items.forEach(function (it) {
      list.appendChild(el('div', { class: 'sheet-item' + (it.warn ? ' warn' : '') + (it.ja ? '' : ' no-ja') }, [
        it.ja ? el('div', { class: 'sheet-ja', lang: 'ja', text: it.ja }) : null,
        el('div', { class: 'sheet-text' }, [
          bi(it.en, it.zh),
          it.note ? el('div', { class: 'hint', text: it.note }) : null
        ])
      ]));
    });
    view.appendChild(list);
  }

  JP.registerTool({
    id: 'tips', en: 'Cheat sheets', zh: '貼士', icon: '📋', color: 'teal', order: 40,
    render: function (view, params) {
      var sheets = JP.data.cheatsheets;
      var sheet = sheets.filter(function (s) { return s.id === params[0]; })[0] || sheets[0];
      renderSheet(view, sheet);
    }
  });
})();
