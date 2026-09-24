/*
 * Safety 安全 — emergency calls, medical card, embassy, emergency phrases.
 *
 * Routes: #/safety          overview
 *         #/safety/medical  edit medical cards
 *
 * Storage: medical  {travellerId: {name, dob, blood, ...}}
 */
(function () {
  var ui = JP.ui, el = ui.el, bi = ui.bi, store = JP.store;

  function renderMain(view) {
    // Call buttons
    view.appendChild(el('div', { class: 'call-grid' }, JP.data.emergencyNumbers.map(function (n) {
      return el('a', { class: 'call-btn call-' + n.cls, href: 'tel:' + n.number }, [
        el('span', { class: 'call-icon', 'aria-hidden': 'true', text: n.icon }),
        el('span', { class: 'call-num', text: n.number }),
        bi(n.en, n.zh),
        el('span', { class: 'call-ja', lang: 'ja', text: n.ja })
      ]);
    })));

    view.appendChild(el('div', { class: 'card say-card' }, [
      el('div', { class: 'mini-label' }, [bi('When they answer, say (or play):', '接通後可以說（或按朗讀）：')])
    ].concat(JP.data.emergencyNumbers.map(function (n) {
      return el('div', { class: 'say-line' }, [
        el('div', { class: 'say-ja', lang: 'ja', text: n.number + '： ' + n.say.ja }),
        el('div', { class: 'hint', text: n.say.en + ' ' + n.say.zh }),
        ui.iconButton('🔊', 'Speak 朗讀', function () { ui.speak(n.say.ja); })
      ]);
    }))));

    // Medical card summary
    var med = store.get('medical', {});
    var people = store.settings().travellers;
    var medSec = ui.section('Medical info card', '醫療資料卡', []);
    people.forEach(function (p) {
      var data = med[p.id] || {};
      var filled = JP.data.medicalFields.some(function (f) { return data[f.key]; });
      medSec.appendChild(el('div', { class: 'card med-person' }, [
        el('div', { class: 'med-name', text: data.name || p.name }),
        el('div', { class: 'btn-row' }, [
          filled ? ui.button('Show card', '顯示卡片', function () { showMedical(data); }, 'btn-primary') : null,
          ui.button(filled ? 'Edit' : 'Fill in', filled ? '編輯' : '填寫', function () { JP.router.go('safety/medical/' + p.id); }, filled ? 'btn-ghost' : 'btn-primary')
        ])
      ]));
    });
    view.appendChild(medSec);

    // Embassy
    var e = JP.data.embassy;
    view.appendChild(ui.section('Canadian Embassy in Tokyo', '加拿大駐日本大使館', [
      el('div', { class: 'card embassy' }, [
        el('div', { class: 'emb-name' }, [bi(e.name.en, e.name.zh)]),
        el('div', { class: 'emb-ja', lang: 'ja', text: e.address.ja }),
        el('div', { class: 'emb-en', text: e.address.en }),
        el('div', { class: 'hint' }, [bi(e.station.en, e.station.zh)]),
        el('a', { class: 'btn btn-primary btn-block', href: 'tel:' + e.phone.tel }, [bi('📞 Call embassy ' + e.phone.display, '致電大使館')]),
        ui.button('Show address to taxi', '給的士司機看地址', function () {
          ui.showMode({ ja: 'この住所までお願いします。\n\n' + e.address.ja, en: e.address.en, zh: '請載我到加拿大大使館。', speakText: 'カナダ大使館までお願いします。' });
        }, 'btn-ghost btn-block'),
        el('hr'),
        el('div', { class: 'emb-name' }, [bi(e.emergency.en, e.emergency.zh)]),
        el('a', { class: 'btn btn-accent btn-block', href: 'tel:' + e.emergency.tel }, [bi('📞 ' + e.emergency.display, '24 小時（可對方付費）')]),
        el('a', { class: 'link', href: 'mailto:' + e.emergency.email, text: '✉ ' + e.emergency.email }),
        el('p', { class: 'hint' }, [bi('Please confirm these details on travel.gc.ca before you go.', '出發前請在 travel.gc.ca 確認以上資料。')])
      ])
    ]));

    // Helplines
    view.appendChild(ui.section('Other helplines', '其他熱線', JP.data.helplines.map(function (h) {
      return el('a', { class: 'card line-link', href: 'tel:' + h.tel }, [
        bi(h.en, h.zh), el('span', { class: 'line-num', text: '📞 ' + h.display })
      ]);
    })));

    // Emergency phrases
    view.appendChild(ui.section('Emergency phrases', '緊急用語', [
      el('div', { class: 'phrase-list' }, JP.data.emergencyPhrases.map(function (p) { return ui.phraseCard(p); }))
    ]));
  }

  function medicalText(d) {
    var lines = ['【医療情報 / Medical information】'];
    JP.data.medicalFields.forEach(function (f) {
      if (d[f.key]) lines.push(f.ja + '（' + f.en + '）： ' + d[f.key]);
    });
    return lines.join('\n');
  }

  function showMedical(d) {
    ui.showMode({ ja: medicalText(d), en: 'Medical information card', zh: '醫療資料卡', noSpeak: true });
  }

  function renderMedical(view, pid) {
    var people = store.settings().travellers;
    var person = people.filter(function (p) { return p.id === pid; })[0] || people[0];
    if (!person) { JP.router.go('safety'); return; }
    var med = store.get('medical', {});
    var data = med[person.id] || { name: person.name };
    var inputs = {};

    var form = el('form', {
      class: 'card form', on: {
        submit: function (e) {
          e.preventDefault();
          var out = {};
          Object.keys(inputs).forEach(function (k) { out[k] = inputs[k].value.trim(); });
          store.update('medical', {}, function (m) { m[person.id] = out; });
          ui.toast('Saved 已儲存');
          JP.router.go('safety');
        }
      }
    });

    form.appendChild(el('p', { class: 'hint' }, [bi('Write in English. Add Japanese where you can (e.g. from your pharmacist or Google Translate).', '請用英文填寫，能加上日文更好（例如請藥劑師協助或用 Google 翻譯）。')]));

    JP.data.medicalFields.forEach(function (f) {
      var input;
      if (f.type === 'select') {
        input = el('select', {}, f.options.map(function (o) { return el('option', { value: o, text: o || '—' }); }));
      } else if (f.multiline) {
        input = el('textarea', { rows: '3' });
      } else {
        input = el('input', { type: f.type || 'text', autocomplete: 'off' });
      }
      input.value = data[f.key] || '';
      inputs[f.key] = input;
      form.appendChild(ui.field(f.en + ' · ' + f.ja, f.zh, input));
    });
    form.appendChild(el('div', { class: 'btn-row' }, [
      el('button', { type: 'submit', class: 'btn btn-primary' }, [bi('Save', '儲存')]),
      ui.button('Cancel', '取消', function () { JP.router.go('safety'); }, 'btn-ghost')
    ]));

    view.appendChild(ui.section('Medical card — ' + person.name, '醫療資料卡 — ' + person.name, [form]));
  }

  JP.registerTool({
    id: 'safety', en: 'Safety', zh: '安全', icon: '🆘', color: 'red', order: 30,
    render: function (view, params) {
      if (params[0] === 'medical') return renderMedical(view, params[1]);
      renderMain(view);
    }
  });
})();
