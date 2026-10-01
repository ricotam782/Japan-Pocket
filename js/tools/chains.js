/*
 * Chain stores 連鎖店 — your own list of restaurant and shop chains.
 * Type a name, pick the right match, and the Japanese / English / Chinese
 * names and a description are filled in from Wikidata / Wikipedia
 * (js/core/lookup.js). Saved entries work offline; "Nearby" opens Google Maps.
 *
 * Routes: #/chains              list (tabs: food / shopping)
 *         #/chains/add          search by name, or enter manually
 *         #/chains/view/<id>    details, notes, ★ want to go, ✓ been there
 *         #/chains/edit/<id>    edit
 *
 * Storage: chains [{id, type: 'food'|'shop', ja, en, zh, desc, summary,
 *                   summaryLang, wikiUrl, website, qid, want, been, note, updated}]
 */
(function () {
  var ui = JP.ui, el = ui.el, bi = ui.bi, store = JP.store;

  var TYPES = [
    { id: 'food', en: '🍜 Restaurants', zh: '食肆' },
    { id: 'shop', en: '🛍️ Shopping', zh: '購物' }
  ];
  var FILTERS = [
    { id: 'all', en: 'All', zh: '全部' },
    { id: 'want', en: '★ Want to go', zh: '想去' },
    { id: 'been', en: '✓ Been', zh: '去過' }
  ];

  var pending = null; // candidate picked on the add screen, handed to the form

  function all() { return store.get('chains', []); }
  function find(id) { return all().filter(function (c) { return c.id === id; })[0]; }

  function save(entry) {
    JP.sync.touch(entry);
    store.update('chains', [], function (l) {
      var i = l.findIndex(function (x) { return x.id === entry.id; });
      if (i >= 0) l[i] = entry; else l.push(entry);
    });
  }

  function remove(id) {
    store.update('chains', [], function (l) { return l.filter(function (x) { return x.id !== id; }); });
    JP.sync.markDeleted('chains', id);
  }

  function mapsUrl(c) {
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(c.ja || c.en || c.zh);
  }

  function titleBlock(c, big) {
    return el('div', { class: 'chain-title' }, [
      c.ja ? el('div', { class: big ? 'chain-ja chain-ja-big' : 'chain-ja', lang: 'ja', text: c.ja }) : null,
      el('div', { class: 'chain-names', text: [c.en, c.zh].filter(Boolean).join(' · ') })
    ]);
  }

  // ---------------- List ----------------
  function renderList(view) {
    var type = store.get('chains.tab', 'food');
    var filter = store.get('chains.filter', 'all');

    view.appendChild(ui.tabs(TYPES, type, function (id) { store.set('chains.tab', id); JP.router.render(); }));
    view.appendChild(el('a', { class: 'btn btn-primary btn-block btn-big', href: '#/chains/add' }, [bi('+ Add a chain', '加連鎖店')]));

    var chips = el('div', { class: 'chips' }, FILTERS.map(function (f) {
      return el('button', {
        type: 'button', class: 'chip' + (filter === f.id ? ' active' : ''), 'aria-pressed': filter === f.id ? 'true' : 'false',
        on: { click: function () { store.set('chains.filter', f.id); JP.router.render({ keepScroll: true }); } }
      }, [bi(f.en, f.zh)]);
    }));
    view.appendChild(chips);

    var items = all().filter(function (c) { return (c.type || 'food') === type; })
      .filter(function (c) { return filter === 'all' || (filter === 'want' ? c.want : c.been); })
      .sort(function (a, b) { return (b.want ? 1 : 0) - (a.want ? 1 : 0) || (a.en || a.ja).localeCompare(b.en || b.ja); });

    var list = el('div', { class: 'chain-list' });
    if (!items.length) {
      list.appendChild(el('p', { class: 'empty' }, [all().length
        ? bi('Nothing here yet.', '這裡尚未有項目。')
        : bi('Add chains you like — just type the name, details are filled in for you.', '加入你喜歡的連鎖店 — 只需輸入名稱，資料會自動填好。')]));
    }
    items.forEach(function (c) {
      list.appendChild(el('a', { class: 'card chain-card', href: '#/chains/view/' + c.id }, [
        titleBlock(c),
        c.desc ? el('div', { class: 'chain-desc', text: c.desc }) : null,
        (c.want || c.been || c.note) ? el('div', { class: 'chain-badges' }, [
          c.want ? el('span', { class: 'badge badge-want', text: '★ 想去' }) : null,
          c.been ? el('span', { class: 'badge badge-been', text: '✓ 去過' }) : null,
          c.note ? el('span', { class: 'badge', text: '📝' }) : null
        ]) : null
      ]));
    });
    view.appendChild(list);
  }

  // ---------------- Add: search by name ----------------
  function renderAdd(view) {
    var q = el('input', { type: 'text', placeholder: 'e.g. 一蘭 / Sukiya / ドン・キホーテ', autocomplete: 'off', 'aria-label': 'Chain name 連鎖店名稱' });
    var results = el('div', { class: 'chain-results', 'aria-live': 'polite' });
    var go = el('button', { type: 'submit', class: 'btn btn-primary btn-block btn-big' }, [bi('🔍 Search', '搜尋')]);

    function msg(en, zh, warn) {
      results.textContent = '';
      results.appendChild(el('p', { class: 'tr-msg' + (warn ? ' warn' : '') }, [bi(en, zh)]));
    }

    function manualButton() {
      return ui.button('✎ Enter it myself', '自行輸入', function () {
        pending = { en: /^[\x00-\x7f]+$/.test(q.value) ? q.value.trim() : '', zh: /[一-鿿]/.test(q.value) && !/[぀-ヿ]/.test(q.value) ? q.value.trim() : '', ja: /[぀-ヿ]/.test(q.value) ? q.value.trim() : '' };
        JP.router.go('chains/edit/new');
      }, 'btn-ghost btn-block');
    }

    /** Always offered below the results: check the name on Google Maps, or type it in. */
    function fallback(text, hasResults) {
      return el('div', { class: 'card chain-fallback' }, [
        el('div', { class: 'mini-label' }, [hasResults
          ? bi('Not the right one?', '沒有正確的一項？')
          : bi('Other ways', '其他方法')]),
        navigator.onLine ? el('a', {
          class: 'btn btn-ghost btn-block', target: '_blank', rel: 'noopener',
          href: 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(text)
        }, [bi('📍 Check the name on Google Maps', '在 Google 地圖確認名稱')]) : null,
        manualButton()
      ]);
    }

    function doSearch() {
      var text = q.value.trim();
      if (!text) { q.focus(); return; }
      if (!navigator.onLine) { msg('Searching needs internet. You can still enter it yourself.', '搜尋需要上網，你仍可自行輸入。', true); results.appendChild(fallback(text, false)); return; }
      go.disabled = true;
      msg('Searching…', '搜尋中…');
      JP.lookup.search(text).then(function (list) {
        results.textContent = '';
        if (!list.length) {
          msg('No match found. Try adding what it sells, or enter it yourself.', '找不到相符的結果。可加上賣甚麼再搜尋，或自行輸入。', true);
        } else {
          results.appendChild(el('p', { class: 'hint' }, [bi('Tap the right one:', '請選擇正確的一項：')]));
          list.forEach(function (c) {
            results.appendChild(el('button', {
              type: 'button', class: 'card chain-card chain-pick',
              on: { click: function () { pending = c; JP.router.go('chains/edit/new'); } }
            }, [titleBlock(c), c.desc ? el('div', { class: 'chain-desc', text: c.desc }) : null]));
          });
        }
        results.appendChild(fallback(text, list.length > 0));
      }).catch(function () {
        msg('Could not search right now.', '暫時無法搜尋。', true);
        results.appendChild(fallback(text, false));
      }).then(function () { go.disabled = false; });
    }

    view.appendChild(ui.section('Add a chain', '加連鎖店', [
      el('form', { class: 'card form', on: { submit: function (e) { e.preventDefault(); q.blur(); doSearch(); } } }, [
        ui.field('Name (any language)', '名稱（中、英、日文都可以）', q,
          'Tip: if nothing is found, add what it sells, e.g. 「ねぎし 牛たん」. 提示：找不到時，可加上賣甚麼，例如「ねぎし 牛たん」。'),
        go
      ]),
      results
    ]));
    setTimeout(function () { q.focus(); }, 50);
  }

  // ---------------- Edit form (new from search / manual, or existing) ----------------
  function renderEdit(view, id) {
    var existing = id && id !== 'new' ? find(id) : null;
    var c = existing ? Object.assign({}, existing) : Object.assign({ type: store.get('chains.tab', 'food') }, pending || {});
    var isNew = !existing;

    var ja = el('input', { type: 'text', lang: 'ja', value: c.ja || '', autocomplete: 'off' });
    var en = el('input', { type: 'text', value: c.en || '', autocomplete: 'off' });
    var zh = el('input', { type: 'text', lang: 'zh-Hant', value: c.zh || '', autocomplete: 'off' });
    var desc = el('input', { type: 'text', value: c.desc || '', autocomplete: 'off' });
    var note = el('textarea', { rows: '3', placeholder: 'e.g. order the mini bowl; ticket machine at the door 例：點細碗；門口有食券機' });
    note.value = c.note || '';
    var type = c.type || 'food';
    var typeRow = el('div', { class: 'choice-grid two' });
    function drawType() {
      typeRow.textContent = '';
      TYPES.forEach(function (t) {
        typeRow.appendChild(el('button', {
          type: 'button', class: 'choice' + (type === t.id ? ' active' : ''), 'aria-pressed': type === t.id ? 'true' : 'false',
          on: { click: function () { type = t.id; drawType(); } }
        }, [bi(t.en, t.zh)]));
      });
    }
    drawType();

    var summaryBox = el('div', { class: 'hint chain-summary-status' });
    var summary = { text: c.summary || '', lang: c.summaryLang || '', url: c.wikiUrl || '' };
    if (isNew && c.qid && c.wiki) {
      summaryBox.textContent = 'Getting description from Wikipedia… 正在從維基百科取得介紹…';
      JP.lookup.summary(c).then(function (s) {
        summary = s;
        summaryBox.textContent = s.text ? '✓ Description added from Wikipedia 已加入維基百科介紹' : '';
      });
    }

    // Fill whichever of ja / en / zh is empty, translating from one that is filled.
    var fields = [{ input: ja, lang: 'ja' }, { input: en, lang: 'en' }, { input: zh, lang: 'zh-TW' }];
    var jaHelper = ui.button('✨ Fill in the other languages', '自動填寫其他語言（需上網）', function () {
      var src = fields.filter(function (f) { return f.input.value.trim(); })[0];
      if (!src) { ui.toast('Type a name first 請先輸入名稱'); return; }
      var empty = fields.filter(function (f) { return !f.input.value.trim(); });
      if (!empty.length) { ui.toast('All names are filled 所有名稱已填好'); return; }
      ui.toast('Translating… 翻譯中…');
      Promise.all(empty.map(function (f) {
        return JP.translate(src.input.value.trim(), src.lang, f.lang).then(function (r) { f.input.value = r.text; });
      })).then(function () { ui.toast('Filled in — please check 已填好，請檢查'); })
        .catch(function () { ui.toast(navigator.onLine ? 'Could not translate 暫時無法翻譯' : 'Needs internet 需要上網'); });
    }, 'btn-ghost btn-block');

    view.appendChild(ui.section(isNew ? 'Add a chain' : 'Edit', isNew ? '加連鎖店' : '編輯', [
      el('form', {
        class: 'card form', on: {
          submit: function (e) {
            e.preventDefault();
            if (!ja.value.trim() && !en.value.trim() && !zh.value.trim()) { ui.toast('Enter a name 請輸入名稱'); return; }
            var entry = Object.assign({}, existing || {}, {
              id: existing ? existing.id : store.uid(), type: type,
              ja: ja.value.trim(), en: en.value.trim(), zh: zh.value.trim(), desc: desc.value.trim(), note: note.value.trim(),
              summary: summary.text, summaryLang: summary.lang, wikiUrl: summary.url,
              website: c.website || '', qid: c.qid || ''
            });
            save(entry);
            pending = null;
            ui.toast('Saved 已儲存');
            JP.router.go('chains/view/' + entry.id);
          }
        }
      }, [
        el('div', { class: 'mini-label' }, [bi('Type', '類別')]), typeRow,
        ui.field('Japanese name (on the sign)', '日文名（招牌上的字）', ja),
        ui.field('English name', '英文名', en),
        ui.field('Chinese name', '中文名', zh),
        jaHelper,
        ui.field('What it is', '簡介', desc),
        ui.field('My notes / tips', '我的備註／貼士', note),
        summaryBox,
        el('div', { class: 'btn-row' }, [
          el('button', { type: 'submit', class: 'btn btn-primary' }, [bi('Save', '儲存')]),
          ui.button('Cancel', '取消', function () { pending = null; JP.router.go(existing ? 'chains/view/' + existing.id : 'chains'); }, 'btn-ghost')
        ]),
        existing ? ui.button('Delete', '刪除', function () {
          if (!ui.confirm('Delete this chain? 確定刪除？')) return;
          remove(existing.id); ui.toast('Deleted 已刪除'); JP.router.go('chains');
        }, 'btn-danger btn-block') : null
      ])
    ]));
  }

  // ---------------- Detail ----------------
  function renderView(view, id) {
    var c = find(id);
    if (!c) { JP.router.go('chains'); return; }

    function toggle(field) {
      c[field] = !c[field]; save(c); JP.router.render({ keepScroll: true });
    }

    view.appendChild(el('div', { class: 'card chain-hero' }, [
      titleBlock(c, true),
      c.desc ? el('div', { class: 'chain-desc', text: c.desc }) : null
    ]));

    view.appendChild(el('div', { class: 'choice-grid two' }, [
      el('button', { type: 'button', class: 'choice' + (c.want ? ' active' : ''), 'aria-pressed': c.want ? 'true' : 'false', on: { click: function () { toggle('want'); } } }, [bi(c.want ? '★ Want to go' : '☆ Want to go', '想去')]),
      el('button', { type: 'button', class: 'choice' + (c.been ? ' active' : ''), 'aria-pressed': c.been ? 'true' : 'false', on: { click: function () { toggle('been'); } } }, [bi(c.been ? '✓ Been there' : 'Been there', '去過')])
    ]));

    view.appendChild(el('a', { class: 'btn btn-accent btn-block btn-big', href: mapsUrl(c), target: '_blank', rel: 'noopener' }, [
      bi('📍 Nearby branches (Google Maps)', '附近分店（Google 地圖，需上網）')
    ]));
    if (c.ja) {
      view.appendChild(ui.button('Ask "Is there one nearby?"', '問路：「附近有這間店嗎？」', function () {
        ui.showMode({ ja: 'この近くに「' + c.ja + '」はありますか？', en: 'Is there a ' + (c.en || c.ja) + ' near here?', zh: '這附近有' + (c.zh || c.ja) + '嗎？' });
      }, 'btn-ghost btn-block'));
    }

    var note = el('textarea', { rows: '4', placeholder: 'e.g. order the mini bowl 例：點細碗', 'aria-label': 'My notes 我的備註' });
    note.value = c.note || '';
    note.addEventListener('change', function () { c.note = note.value.trim(); save(c); ui.toast('Saved 已儲存'); });
    view.appendChild(ui.section('My notes', '我的備註', [note]));

    if (c.summary) {
      view.appendChild(ui.section('About', '介紹', [
        el('div', { class: 'card' }, [
          el('p', { class: 'chain-summary', lang: c.summaryLang === 'zh' ? 'zh-Hant' : c.summaryLang || null, text: c.summary }),
          c.wikiUrl ? el('a', { class: 'link', href: c.wikiUrl, target: '_blank', rel: 'noopener', text: 'Wikipedia ↗' }) : null
        ])
      ]));
    }
    if (c.website) {
      view.appendChild(el('a', { class: 'btn btn-ghost btn-block', href: c.website, target: '_blank', rel: 'noopener' }, [bi('🌐 Official website', '官方網站')]));
    }

    view.appendChild(el('div', { class: 'btn-row' }, [
      ui.button('Edit', '編輯', function () { JP.router.go('chains/edit/' + c.id); }, 'btn-ghost'),
      ui.button('Back to list', '返回清單', function () { JP.router.go('chains'); }, 'btn-ghost')
    ]));
  }

  JP.registerTool({
    id: 'chains', en: 'Chain stores', zh: '連鎖店', icon: '🏪', color: 'plum', order: 55,
    render: function (view, params) {
      if (params[0] === 'add') return renderAdd(view);
      if (params[0] === 'edit') return renderEdit(view, params[1]);
      if (params[0] === 'view') return renderView(view, params[1]);
      renderList(view);
    }
  });
})();
