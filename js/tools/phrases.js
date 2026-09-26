/*
 * Phrases 對話 — phrase cards, show mode, own cards, in-app translation
 * (type anything → Japanese, with recent history), taxi card and food card.
 *
 * Routes: #/phrases            main screen
 *         #/phrases/taxi       taxi destinations
 *         #/phrases/food       dietary card
 *         #/phrases/edit[/id]  add / edit own card
 *
 * Storage: phrases.custom  [{id, cat, en, zh, ja, romaji}]
 *          phrases.favs    [phrase ids]
 *          phrases.tab     last category tab
 *          phrases.history last 10 translations [{id, en, zh, ja, romaji}]
 *          taxi            [{id, label, name, address, phone}]
 *          food            {selected: [ids], extra: ''}
 */
(function () {
  var ui = JP.ui, el = ui.el, bi = ui.bi, store = JP.store;
  var TRANSLATE = 'https://translate.google.com/?sl={sl}&tl=ja&op=translate&text=';

  function allPresets() {
    var out = [];
    JP.data.phraseCategories.forEach(function (c) {
      (JP.data.phrases[c.id] || []).forEach(function (p) { out.push(Object.assign({ cat: c.id }, p)); });
    });
    return out;
  }

  function customCards() { return store.get('phrases.custom', []); }
  function favs() { return store.get('phrases.favs', []); }

  function toggleFav(id) {
    store.update('phrases.favs', [], function (list) {
      var i = list.indexOf(id);
      if (i >= 0) list.splice(i, 1); else list.push(id);
    });
  }

  function translateUrl(text, sl) {
    return TRANSLATE.replace('{sl}', sl || 'en') + encodeURIComponent(text || '');
  }

  // ---------------- Main screen ----------------
  function renderMain(view) {
    var tab = store.get('phrases.tab', 'restaurant');

    // Feature tiles: taxi & food
    view.appendChild(el('div', { class: 'feature-row' }, [
      el('a', { class: 'feature feature-indigo', href: '#/phrases/taxi' }, [
        el('span', { class: 'feature-icon', 'aria-hidden': 'true', text: '🚕' }),
        bi('Taxi card', '的士卡')
      ]),
      el('a', { class: 'feature feature-red', href: '#/phrases/food' }, [
        el('span', { class: 'feature-icon', 'aria-hidden': 'true', text: '🍱' }),
        bi('Food card', '飲食卡')
      ])
    ]));

    // Type anything → Japanese, translated in the app
    var sl = store.get('phrases.sl', 'en');
    var ta = el('textarea', { rows: '2', placeholder: sl === 'en' ? 'Type in English…' : '輸入中文…', 'aria-label': 'Text to translate 要翻譯的文字' });
    var slTabs = el('div', { class: 'seg' });
    function drawSeg() {
      slTabs.textContent = '';
      [['en', 'English'], ['zh-TW', '中文']].forEach(function (o) {
        slTabs.appendChild(el('button', {
          type: 'button', class: 'seg-btn' + (sl === o[0] ? ' active' : ''), text: o[1],
          on: { click: function () { sl = o[0]; store.set('phrases.sl', sl); ta.placeholder = sl === 'en' ? 'Type in English…' : '輸入中文…'; drawSeg(); } }
        }));
      });
    }
    drawSeg();
    var result = el('div', { class: 'tr-result', 'aria-live': 'polite' });
    var recentWrap = el('div', { class: 'recent-list' });
    var goBtn = el('button', {
      type: 'submit', class: 'btn btn-primary btn-block btn-big'
    }, [bi('Translate to Japanese', '翻譯成日文')]);

    function translatedCard(item, onSaved) {
      var saved = customCards().some(function (c) { return c.ja === item.ja && (c.en === item.en || c.zh === item.zh); });
      var card = ui.phraseCard(item);
      card.appendChild(el('div', { class: 'btn-row' }, [
        saved ? el('span', { class: 'hint', text: '✓ Saved in My cards 已儲存到我的句子' })
          : ui.button('☆ Save to My cards', '儲存到我的句子', function (e) {
            e.stopPropagation();
            store.update('phrases.custom', [], function (l) {
              l.push(JP.sync.touch({ id: 'u' + store.uid(), cat: 'mine', en: item.en, zh: item.zh, ja: item.ja, romaji: item.romaji }));
            });
            ui.toast('Saved 已儲存');
            if (onSaved) onSaved();
          }, 'btn-ghost')
      ]));
      return card;
    }

    // skipId: the translation currently shown above, so it is not listed twice.
    function drawRecent(skipId) {
      recentWrap.textContent = '';
      var hist = store.get('phrases.history', []).filter(function (h) { return h.id !== skipId; });
      if (!hist.length) return;
      recentWrap.appendChild(el('div', { class: 'recent-head' }, [
        bi('Recent translations (work offline)', '最近翻譯（離線亦可查看）'),
        el('button', {
          type: 'button', class: 'link-btn', text: 'Clear 清除',
          on: { click: function () { store.set('phrases.history', []); drawRecent(); } }
        })
      ]));
      hist.forEach(function (h) { recentWrap.appendChild(ui.phraseCard(h)); });
    }

    function doTranslate() {
      var text = ta.value.trim();
      if (!text) { ui.toast('Type something first 請先輸入文字'); ta.focus(); return; }
      if (!navigator.onLine) {
        result.textContent = '';
        result.appendChild(el('p', { class: 'tr-msg warn' }, [bi('Translation needs internet. Saved and recent cards still work offline.', '翻譯需要上網。已儲存及最近翻譯的句子離線仍可使用。')]));
        return;
      }
      goBtn.disabled = true;
      result.textContent = '';
      result.appendChild(el('p', { class: 'tr-msg' }, [bi('Translating…', '翻譯中…')]));
      JP.translate(text, sl).then(function (r) {
        var item = { en: sl === 'en' ? text : '', zh: sl === 'en' ? '' : text, ja: r.ja, romaji: r.romaji };
        item.id = 'h' + store.uid();
        store.update('phrases.history', [], function (h) {
          h = h.filter(function (x) { return !(x.ja === item.ja && x.en === item.en && x.zh === item.zh); });
          h.unshift(item);
          return h.slice(0, 10);
        });
        result.textContent = '';
        result.appendChild(translatedCard(item, function () { result.textContent = ''; result.appendChild(translatedCard(item)); }));
        result.appendChild(el('p', { class: 'hint' }, [bi('Machine translation (' + r.source + ') — keep sentences short and simple.', '機器翻譯，僅供參考；句子越短越簡單越準確。')]));
        drawRecent(item.id);
      }).catch(function () {
        result.textContent = '';
        result.appendChild(el('p', { class: 'tr-msg warn' }, [bi('Could not translate right now.', '暫時無法翻譯。')]));
        result.appendChild(el('a', {
          class: 'btn btn-ghost btn-block', href: translateUrl(text, sl), target: '_blank', rel: 'noopener'
        }, [bi('Try Google Translate ↗', '改用 Google 翻譯')]));
      }).then(function () { goBtn.disabled = false; });
    }

    view.appendChild(ui.section('Type anything', '隨意輸入', [
      el('form', { class: 'card', on: { submit: function (e) { e.preventDefault(); ta.blur(); doTranslate(); } } }, [
        slTabs,
        ta,
        goBtn,
        result
      ]),
      recentWrap
    ]));
    drawRecent();

    // Category tabs
    var tabItems = [{ id: 'fav', en: '★ Favourites', zh: '最愛' }]
      .concat(JP.data.phraseCategories.map(function (c) { return { id: c.id, en: c.icon + ' ' + c.en, zh: c.zh }; }))
      .concat([{ id: 'mine', en: '✎ My cards', zh: '我的句子' }]);

    var listWrap = el('div', { class: 'phrase-list' });
    var tabBar;
    function drawTabs() {
      var nb = ui.tabs(tabItems, tab, function (id) {
        tab = id; store.set('phrases.tab', id); drawTabs(); drawList();
      });
      if (tabBar) tabBar.replaceWith(nb);
      tabBar = nb;
    }

    function drawList() {
      listWrap.textContent = '';
      var favList = favs();
      var custom = customCards();
      var cards;
      if (tab === 'fav') {
        cards = allPresets().concat(custom).filter(function (p) { return favList.indexOf(p.id) >= 0; });
      } else if (tab === 'mine') {
        cards = custom;
        listWrap.appendChild(ui.button('+ Add my own card', '新增自己的句子', function () { JP.router.go('phrases/edit'); }, 'btn-primary btn-block'));
      } else {
        cards = allPresets().filter(function (p) { return p.cat === tab; })
          .concat(custom.filter(function (p) { return p.cat === tab; }));
      }
      if (!cards.length) {
        listWrap.appendChild(el('p', { class: 'empty' }, [
          tab === 'fav'
            ? bi('No favourites yet. Tap ☆ on any card.', '尚未有最愛。按任何卡上的 ☆ 加入。')
            : bi('No cards yet.', '尚未有句子。')
        ]));
      }
      cards.forEach(function (p) {
        var isCustom = p.id.indexOf('u') === 0;
        listWrap.appendChild(ui.phraseCard(p, {
          fav: favList.indexOf(p.id) >= 0,
          onFav: function () { toggleFav(p.id); drawList(); },
          onEdit: isCustom ? function () { JP.router.go('phrases/edit/' + p.id); } : null
        }));
      });
    }

    drawTabs();
    view.appendChild(ui.section('Phrase cards', '句子卡', [
      el('p', { class: 'hint' }, [bi('Tap a card to show it big to staff.', '按一下卡片即可放大給店員看。')]),
      tabBar, listWrap
    ]));
    // tabBar is replaced in place on change, so keep a reference inside the section.
    drawList();
  }

  // ---------------- Add / edit own card ----------------
  function renderEdit(view, id) {
    var list = customCards();
    var card = list.filter(function (c) { return c.id === id; })[0] ||
      { id: null, cat: store.get('phrases.tab', 'mine'), en: '', zh: '', ja: '', romaji: '' };
    if (['fav'].indexOf(card.cat) >= 0) card.cat = 'mine';

    var en = el('input', { type: 'text', value: card.en, autocomplete: 'off' });
    var zh = el('input', { type: 'text', value: card.zh, lang: 'zh-Hant', autocomplete: 'off' });
    var ja = el('textarea', { rows: '3', lang: 'ja', class: 'input-ja' });
    ja.value = card.ja;
    var romaji = el('input', { type: 'text', value: card.romaji || '', autocomplete: 'off' });
    var cat = el('select');
    [{ id: 'mine', en: 'My cards', zh: '我的句子' }].concat(JP.data.phraseCategories).forEach(function (c) {
      cat.appendChild(el('option', { value: c.id, text: c.en + ' ' + c.zh }));
    });
    cat.value = card.cat || 'mine';

    var helper = el('button', {
      type: 'button', class: 'btn btn-ghost btn-block',
      on: {
        click: function () {
          var text = en.value.trim() || zh.value.trim();
          if (!text) { ui.toast('Type English or Chinese first 請先輸入英文或中文'); return; }
          helper.disabled = true;
          ui.toast('Translating… 翻譯中…');
          JP.translate(text, en.value.trim() ? 'en' : 'zh-TW').then(function (r) {
            ja.value = r.ja;
            if (r.romaji) romaji.value = r.romaji;
            ui.toast('Japanese filled in — please check 已填入日文，請檢查');
          }).catch(function () {
            ui.toast(navigator.onLine ? 'Could not translate 暫時無法翻譯' : 'Needs internet 需要上網');
          }).then(function () { helper.disabled = false; });
        }
      }
    }, [bi('✨ Fill in Japanese automatically', '自動翻譯成日文（需上網）')]);

    view.appendChild(ui.section(card.id ? 'Edit card' : 'New card', card.id ? '編輯句子' : '新增句子', [
      el('form', {
        class: 'card form', on: {
          submit: function (e) {
            e.preventDefault();
            if (!ja.value.trim()) { ui.toast('Japanese is required 必須填寫日文'); ja.focus(); return; }
            var data = JP.sync.touch({
              id: card.id || ('u' + store.uid()), cat: cat.value,
              en: en.value.trim(), zh: zh.value.trim(), ja: ja.value.trim(), romaji: romaji.value.trim()
            });
            store.update('phrases.custom', [], function (l) {
              var i = l.findIndex(function (c) { return c.id === data.id; });
              if (i >= 0) l[i] = data; else l.push(data);
            });
            ui.toast('Saved 已儲存');
            JP.router.go('phrases');
          }
        }
      }, [
        ui.field('English', '英文', en),
        ui.field('Chinese', '中文', zh),
        helper,
        ui.field('Japanese (shown to staff)', '日文（給店員看）', ja),
        ui.field('Reading (optional)', '讀音（可不填）', romaji),
        ui.field('Category', '分類', cat),
        el('div', { class: 'btn-row' }, [
          el('button', { type: 'submit', class: 'btn btn-primary' }, [bi('Save', '儲存')]),
          ui.button('Cancel', '取消', function () { JP.router.go('phrases'); }, 'btn-ghost')
        ]),
        card.id ? ui.button('Delete this card', '刪除這張卡', function () {
          if (!ui.confirm('Delete this card? 確定刪除？')) return;
          store.update('phrases.custom', [], function (l) { return l.filter(function (c) { return c.id !== card.id; }); });
          JP.sync.markDeleted('phrases.custom', card.id);
          store.update('phrases.favs', [], function (l) { return l.filter(function (x) { return x !== card.id; }); });
          ui.toast('Deleted 已刪除');
          JP.router.go('phrases');
        }, 'btn-danger btn-block') : null
      ])
    ]));
  }

  // ---------------- Taxi card ----------------
  function taxiText(d) {
    return ['この住所までお願いします。', '', d.name, d.address, d.phone ? '☎ ' + d.phone : '']
      .filter(function (x, i) { return i < 2 || x; }).join('\n');
  }

  function renderTaxi(view) {
    var dests = store.get('taxi', []);
    var listSec = ui.section('My destinations', '我的目的地', []);
    if (!dests.length) {
      listSec.appendChild(el('p', { class: 'empty' }, [bi('Add your hotel below. Ask the front desk to write the address in Japanese.', '請在下面加入酒店。可請酒店前台用日文寫下地址。')]));
    }
    dests.forEach(function (d) {
      listSec.appendChild(el('article', { class: 'card dest' }, [
        el('div', { class: 'dest-label', text: d.label || 'Hotel' }),
        el('div', { class: 'dest-name', lang: 'ja', text: d.name }),
        el('div', { class: 'dest-addr', lang: 'ja', text: d.address }),
        d.phone ? el('div', { class: 'dest-addr', text: '☎ ' + d.phone }) : null,
        el('div', { class: 'btn-row' }, [
          ui.button('Show driver', '給司機看', function () {
            ui.showMode({ ja: taxiText(d), en: 'Please take me to this address.', zh: '請載我到這個地址。', speakText: 'この住所までお願いします。' });
          }, 'btn-primary'),
          ui.button('Edit', '編輯', function () { fillForm(d); }, 'btn-ghost')
        ])
      ]));
    });
    view.appendChild(listSec);

    var label = el('input', { type: 'text', placeholder: 'e.g. Hotel, Airbnb', autocomplete: 'off' });
    var name = el('input', { type: 'text', lang: 'ja', placeholder: '例：ホテル〇〇 東京', autocomplete: 'off' });
    var addr = el('textarea', { rows: '3', lang: 'ja', placeholder: '例：東京都新宿区西新宿1-2-3' });
    var phone = el('input', { type: 'tel', placeholder: '03-1234-5678', autocomplete: 'off' });
    var editing = null;
    var delBtn = ui.button('Delete', '刪除', function () {
      if (!editing || !ui.confirm('Delete this destination? 確定刪除？')) return;
      store.update('taxi', [], function (l) { return l.filter(function (x) { return x.id !== editing; }); });
      JP.sync.markDeleted('taxi', editing);
      JP.router.render();
    }, 'btn-danger btn-block');
    delBtn.hidden = true;

    function fillForm(d) {
      editing = d.id; label.value = d.label || ''; name.value = d.name || ''; addr.value = d.address || ''; phone.value = d.phone || '';
      delBtn.hidden = false;
      name.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    view.appendChild(ui.section('Add / edit destination', '新增／編輯目的地', [
      el('form', {
        class: 'card form', on: {
          submit: function (e) {
            e.preventDefault();
            if (!name.value.trim() && !addr.value.trim()) { ui.toast('Enter a name or address 請輸入名稱或地址'); return; }
            var d = JP.sync.touch({ id: editing || store.uid(), label: label.value.trim(), name: name.value.trim(), address: addr.value.trim(), phone: phone.value.trim() });
            store.update('taxi', [], function (l) {
              var i = l.findIndex(function (x) { return x.id === d.id; });
              if (i >= 0) l[i] = d; else l.push(d);
            });
            ui.toast('Saved 已儲存');
            JP.router.render();
          }
        }
      }, [
        ui.field('Label', '標籤', label),
        ui.field('Place name in Japanese', '日文名稱', name),
        ui.field('Address in Japanese', '日文地址', addr, 'Tip: copy it from the booking confirmation or Google Maps (Japanese). 提示：可從訂房確認或 Google 地圖（日文）複製。'),
        ui.field('Phone (optional)', '電話（可不填）', phone),
        el('button', { type: 'submit', class: 'btn btn-primary btn-block' }, [bi('Save', '儲存')]),
        delBtn
      ])
    ]));
  }

  // ---------------- Food card ----------------
  function foodNote(state) {
    var items = JP.data.dietary.filter(function (d) { return state.selected.indexOf(d.id) >= 0; });
    var hasAllergy = items.some(function (d) { return d.allergy; });
    var lines = [JP.data.dietaryIntro.ja, ''];
    items.forEach(function (d) { lines.push('・' + d.ja); });
    if (state.extra && state.extra.trim()) lines.push('・' + state.extra.trim());
    if (hasAllergy) { lines.push(''); lines.push(JP.data.dietaryAllergyWarn.ja); }
    lines.push(''); lines.push(JP.data.dietaryOutro.ja);
    return { ja: lines.join('\n'), items: items, hasAllergy: hasAllergy };
  }

  function renderFood(view) {
    var state = store.get('food', { selected: [], extra: '' });
    var preview = el('div', { class: 'food-preview', lang: 'ja' });

    function save() { store.set('food', state); drawPreview(); }
    function drawPreview() {
      var n = foodNote(state);
      preview.textContent = n.ja;
    }

    var checks = el('div', { class: 'check-list' });
    JP.data.dietary.forEach(function (d) {
      var cb = el('input', {
        type: 'checkbox', checked: state.selected.indexOf(d.id) >= 0,
        on: {
          change: function () {
            state.selected = state.selected.filter(function (x) { return x !== d.id; });
            if (cb.checked) state.selected.push(d.id);
            save();
          }
        }
      });
      checks.appendChild(el('label', { class: 'check' + (d.allergy ? ' check-allergy' : '') }, [
        cb, el('span', { class: 'check-text' }, [bi(d.en, d.zh), el('span', { class: 'check-ja', lang: 'ja', text: d.ja })])
      ]));
    });

    var extra = el('input', {
      type: 'text', lang: 'ja', value: state.extra || '', placeholder: '例：玉ねぎが食べられません。',
      on: { input: function () { state.extra = extra.value; save(); } }
    });

    view.appendChild(ui.section('My dietary needs', '我的飲食需要', [
      el('p', { class: 'hint' }, [bi('Tick everything that applies. It is saved automatically.', '剔選所有適用項目，會自動儲存。')]),
      checks,
      ui.field('Anything else (Japanese)', '其他（日文）', extra)
    ]));

    view.appendChild(ui.section('Note for staff', '給店員的字條', [
      el('div', { class: 'card' }, [preview]),
      ui.button('Show to staff', '全螢幕給店員看', function () {
        var n = foodNote(state);
        if (!n.items.length && !(state.extra || '').trim()) { ui.toast('Tick at least one item 請至少剔選一項'); return; }
        ui.showMode({ ja: n.ja, en: 'I have dietary requirements (see list).', zh: '我有飲食限制（見上文）。' });
      }, 'btn-primary btn-block btn-big')
    ]));
    drawPreview();
  }

  JP.registerTool({
    id: 'phrases', en: 'Phrases', zh: '對話', icon: '💬', color: 'indigo', order: 10,
    render: function (view, params) {
      var sub = params[0];
      if (sub === 'taxi') return renderTaxi(view);
      if (sub === 'food') return renderFood(view);
      if (sub === 'edit') return renderEdit(view, params[1]);
      renderMain(view);
    }
  });
})();
