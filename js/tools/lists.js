/*
 * Lists 清單 — packing checklist and omiyage (souvenir) list.
 * Routes: #/lists, #/lists/omiyage
 * Storage: list.packing, list.omiyage  [{id, text, for, done}]
 */
(function () {
  var ui = JP.ui, el = ui.el, bi = ui.bi, store = JP.store;

  var PACKING_DEFAULT = [
    'Passport 護照', 'Flight & hotel bookings 機票及酒店預訂', 'Travel insurance papers 旅遊保險文件',
    'Credit cards & some yen cash 信用卡及日圓現金', 'Medications (in original boxes) 藥物（原裝盒）',
    'Prescription copies 處方副本', 'Phone & charger 手機及充電器', 'Power bank 流動電源',
    'Plug adapter (Japan uses Type A, 100V) 轉插（日本 A 型插頭，100V）', 'Reading glasses 老花眼鏡',
    'Comfortable walking shoes 舒適步行鞋', 'Light jacket / umbrella 薄外套／雨傘',
    'Small towel / handkerchief 小毛巾／手帕', 'Coin purse (lots of coins!) 零錢包',
    'Small rubbish bag 小垃圾袋', 'eSIM / pocket Wi-Fi eSIM／隨身 Wi-Fi', 'Suica / PASMO card 交通卡'
  ];

  var KINDS = [
    { id: 'packing', en: '🧳 Packing', zh: '行李清單', forLabel: null },
    { id: 'omiyage', en: '🎁 Omiyage', zh: '手信清單', forLabel: ['For whom', '送給誰'] }
  ];

  function load(kind) {
    var list = store.get('list.' + kind, null);
    if (list === null) {
      list = kind === 'packing'
        ? PACKING_DEFAULT.map(function (t) { return { id: store.uid(), text: t, done: false }; })
        : [];
      store.set('list.' + kind, list);
    }
    return list;
  }

  function render(view, kindId) {
    var kind = KINDS.filter(function (k) { return k.id === kindId; })[0] || KINDS[0];
    view.appendChild(ui.tabs(KINDS.map(function (k) { return { id: k.id, en: k.en, zh: k.zh }; }), kind.id,
      function (id) { JP.router.replace('lists/' + id); }));

    var list = load(kind.id);
    function save() { store.set('list.' + kind.id, list); }

    var done = list.filter(function (i) { return i.done; }).length;
    view.appendChild(el('div', { class: 'progress', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(list.length), 'aria-valuenow': String(done) }, [
      el('div', { class: 'progress-bar', style: 'width:' + (list.length ? Math.round(done * 100 / list.length) : 0) + '%' }),
      el('span', { class: 'progress-text', text: done + ' / ' + list.length + ' ✓' })
    ]));

    // Add form
    var text = el('input', { type: 'text', placeholder: kind.id === 'omiyage' ? 'e.g. Tokyo Banana 例：東京芭娜娜' : 'Add item 新增項目', autocomplete: 'off', 'aria-label': 'New item 新項目' });
    var forWhom = kind.forLabel ? el('input', { type: 'text', placeholder: 'e.g. Mary 例：瑪麗', autocomplete: 'off' }) : null;
    view.appendChild(el('form', {
      class: 'card form', on: {
        submit: function (e) {
          e.preventDefault();
          if (!text.value.trim()) { text.focus(); return; }
          list.push({ id: store.uid(), text: text.value.trim(), for: forWhom ? forWhom.value.trim() : '', done: false });
          save(); JP.router.render({ keepScroll: true });
        }
      }
    }, [
      ui.field(kind.id === 'omiyage' ? 'Gift' : 'Item', kind.id === 'omiyage' ? '禮物' : '項目', text),
      forWhom ? ui.field(kind.forLabel[0], kind.forLabel[1], forWhom) : null,
      el('button', { type: 'submit', class: 'btn btn-primary btn-block' }, [bi('+ Add', '新增')])
    ]));

    // Items
    var ul = el('ul', { class: 'checklist' });
    if (!list.length) ul.appendChild(el('li', { class: 'empty' }, [bi('Nothing here yet.', '尚未有項目。')]));
    list.forEach(function (item) {
      var cb = el('input', {
        type: 'checkbox', checked: item.done,
        on: { change: function () { item.done = cb.checked; save(); JP.router.render({ keepScroll: true }); } }
      });
      ul.appendChild(el('li', { class: 'check-item' + (item.done ? ' done' : '') }, [
        el('label', { class: 'check-label' }, [
          cb,
          el('span', { class: 'check-text' }, [
            el('span', { text: item.text }),
            item.for ? el('span', { class: 'check-for', text: '→ ' + item.for }) : null
          ])
        ]),
        ui.iconButton('🗑', 'Delete 刪除', function () {
          list = list.filter(function (x) { return x.id !== item.id; }); save(); JP.router.render({ keepScroll: true });
        })
      ]));
    });
    view.appendChild(ul);

    if (list.length) {
      view.appendChild(ui.button('Untick all', '清除所有剔號', function () {
        if (!ui.confirm('Untick every item? 確定清除所有剔號？')) return;
        list.forEach(function (i) { i.done = false; }); save(); JP.router.render({ keepScroll: true });
      }, 'btn-ghost btn-block'));
    }
  }

  JP.registerTool({
    id: 'lists', en: 'Lists', zh: '清單', icon: '✅', color: 'green', order: 50,
    render: function (view, params) { render(view, params[0]); }
  });
})();
