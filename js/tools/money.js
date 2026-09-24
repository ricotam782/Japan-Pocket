/*
 * Money 錢 — yen ⇄ CAD converter, quick price check, trip wallet and
 * end-of-trip settlement between any number of travellers.
 *
 * Routes: #/money            converter
 *         #/money/wallet     expense log
 *         #/money/settle     end of trip: who pays whom
 *
 * Storage: rate    {cadPerJpy, date, fetched, source: 'api'|'manual'|'default'}
 *          wallet  [{id, date, amount, cat, payer, shares: [travellerIds], note}]
 * Travellers come from Settings (JP.store.settings().travellers).
 */
(function () {
  var ui = JP.ui, el = ui.el, bi = ui.bi, store = JP.store;

  var DEFAULT_RATE = 0.0093; // rough fallback only, replaced on first successful fetch
  var STALE_MS = 6 * 60 * 60 * 1000;
  var APIS = [
    { url: 'https://api.frankfurter.app/latest?from=JPY&to=CAD' },
    { url: 'https://api.frankfurter.dev/v1/latest?base=JPY&symbols=CAD' }
  ];

  var CATS = [
    { id: 'food', en: 'Food', zh: '餐飲', icon: '🍱' },
    { id: 'transport', en: 'Transport', zh: '交通', icon: '🚆' },
    { id: 'tickets', en: 'Tickets', zh: '門票', icon: '🎟️' },
    { id: 'shopping', en: 'Shopping', zh: '購物', icon: '🛍️' },
    { id: 'hotel', en: 'Hotel', zh: '住宿', icon: '🏨' },
    { id: 'other', en: 'Other', zh: '其他', icon: '📦' }
  ];
  function catOf(id) { return CATS.filter(function (c) { return c.id === id; })[0] || CATS[CATS.length - 1]; }

  // ---------------- Rate ----------------
  function getRate() {
    var r = store.get('rate', null);
    if (!r || !(r.cadPerJpy > 0)) r = { cadPerJpy: DEFAULT_RATE, date: null, fetched: 0, source: 'default' };
    return r;
  }

  function fetchRate(force) {
    var r = getRate();
    if (r.source === 'manual' && !force) return Promise.resolve(r);
    if (!force && r.source === 'api' && Date.now() - r.fetched < STALE_MS) return Promise.resolve(r);
    if (!navigator.onLine) return Promise.resolve(r);

    function tryApi(i) {
      if (i >= APIS.length) return Promise.reject(new Error('all rate APIs failed'));
      return fetch(APIS[i].url, { cache: 'no-store' })
        .then(function (res) { if (!res.ok) throw new Error(res.status); return res.json(); })
        .then(function (j) {
          var v = j && j.rates && j.rates.CAD;
          if (!(v > 0)) throw new Error('bad data');
          return { cadPerJpy: v, date: j.date, fetched: Date.now(), source: 'api' };
        })
        .catch(function () { return tryApi(i + 1); });
    }
    return tryApi(0).then(function (nr) { store.set('rate', nr); return nr; }).catch(function () { return r; });
  }

  function rateLine(r) {
    var perCad = 1 / r.cadPerJpy;
    var main = '1 CAD = ¥' + perCad.toFixed(1) + '  ·  ¥1,000 = ' + ui.cad(1000 * r.cadPerJpy);
    var sub;
    if (r.source === 'api') sub = 'Rate date 匯率日期: ' + r.date + (navigator.onLine ? '' : ' (offline 離線，使用已儲存匯率)');
    else if (r.source === 'manual') sub = 'Manual rate 手動匯率' + (r.date ? ' · ' + r.date : '');
    else sub = 'Estimated rate — go online to update 估計匯率，請上網更新';
    return { main: main, sub: sub, warn: r.source === 'default' };
  }

  // ---------------- Shared: tab bar ----------------
  function header(view, active) {
    view.appendChild(ui.tabs([
      { id: '', en: '💱 Convert', zh: '換算' },
      { id: 'wallet', en: '👛 Wallet', zh: '錢包' },
      { id: 'settle', en: '🏁 Settle', zh: '結算' }
    ], active, function (id) { JP.router.replace('money' + (id ? '/' + id : '')); }));
  }

  // ---------------- Converter ----------------
  function renderConvert(view) {
    header(view, '');
    var rateBox = el('div', { class: 'rate-box' });
    function drawRate() {
      var r = getRate(), l = rateLine(r);
      rateBox.textContent = '';
      ui.append(rateBox, [
        el('div', { class: 'rate-main', text: l.main }),
        el('div', { class: 'rate-sub' + (l.warn ? ' warn' : ''), text: l.sub })
      ]);
    }
    drawRate();

    // Quick price check: yen → CAD, big.
    var yenIn = el('input', { type: 'text', inputmode: 'decimal', class: 'input-big', placeholder: '¥ 0', 'aria-label': 'Price in yen 日圓價錢' });
    var cadOut = el('div', { class: 'big-result', 'aria-live': 'polite', text: 'C$0.00' });
    function calcYen() {
      var n = ui.parseNum(yenIn.value);
      cadOut.textContent = isFinite(n) ? ui.cad(n * getRate().cadPerJpy) : 'C$0.00';
    }
    yenIn.addEventListener('input', calcYen);

    var chips = el('div', { class: 'chips' });
    [100, 500, 1000, 3000, 5000, 10000].forEach(function (v) {
      chips.appendChild(el('button', {
        type: 'button', class: 'chip', text: '¥' + v.toLocaleString('en-CA'),
        on: { click: function () { yenIn.value = v; calcYen(); } }
      }));
    });

    view.appendChild(ui.section('Quick price check', '快速格價', [
      el('div', { class: 'card' }, [
        el('label', { class: 'mini-label' }, [bi('Price in yen', '日圓價錢')]),
        yenIn,
        el('div', { class: 'equals', text: '=' }),
        cadOut,
        chips
      ])
    ]));

    // Reverse: CAD → yen
    var cadIn = el('input', { type: 'text', inputmode: 'decimal', class: 'input-big', placeholder: 'C$ 0', 'aria-label': 'Amount in CAD 加幣金額' });
    var yenOut = el('div', { class: 'big-result', text: '¥0' });
    cadIn.addEventListener('input', function () {
      var n = ui.parseNum(cadIn.value);
      yenOut.textContent = isFinite(n) ? ui.yen(n / getRate().cadPerJpy) : '¥0';
    });
    view.appendChild(ui.section('CAD to yen', '加幣換日圓', [
      el('div', { class: 'card' }, [
        el('label', { class: 'mini-label' }, [bi('Amount in CAD', '加幣金額')]),
        cadIn, el('div', { class: 'equals', text: '=' }), yenOut
      ])
    ]));

    // Rate + manual override
    var manual = el('input', { type: 'text', inputmode: 'decimal', placeholder: 'e.g. 107.5' });
    view.appendChild(ui.section('Exchange rate', '匯率', [
      el('div', { class: 'card' }, [
        rateBox,
        el('div', { class: 'btn-row' }, [
          ui.button('↻ Update now', '立即更新', function () {
            if (!navigator.onLine) { ui.toast('Offline — using saved rate 離線中，使用已儲存匯率'); return; }
            ui.toast('Updating… 更新中…');
            var r = getRate();
            if (r.source === 'manual') { r.source = 'default'; store.set('rate', r); }
            fetchRate(true).then(function (nr) {
              drawRate(); calcYen();
              ui.toast(nr.source === 'api' ? 'Rate updated 匯率已更新' : 'Could not update 無法更新');
            });
          }, 'btn-ghost')
        ]),
        el('details', { class: 'details' }, [
          el('summary', {}, [bi('Set rate manually', '手動設定匯率')]),
          ui.field('1 CAD = how many yen?', '1 加幣 = 多少日圓？', manual),
          ui.button('Save manual rate', '儲存手動匯率', function () {
            var v = ui.parseNum(manual.value);
            if (!(v > 1)) { ui.toast('Enter a number like 107.5 請輸入數字，例如 107.5'); return; }
            store.set('rate', { cadPerJpy: 1 / v, date: ui.todayISO(), fetched: Date.now(), source: 'manual' });
            drawRate(); calcYen(); ui.toast('Saved 已儲存');
          }, 'btn-ghost btn-block')
        ])
      ])
    ]));

    fetchRate(false).then(function () { drawRate(); calcYen(); });
  }

  // ---------------- Wallet ----------------
  function travellers() { return store.settings().travellers; }
  function nameOf(id) {
    var t = travellers().filter(function (x) { return x.id === id; })[0];
    return t ? t.name : '?';
  }

  function renderWallet(view) {
    header(view, 'wallet');
    var list = store.get('wallet', []);
    var people = travellers();
    var rate = getRate().cadPerJpy;

    // Totals
    var total = list.reduce(function (s, e) { return s + e.amount; }, 0);
    var todayTotal = list.filter(function (e) { return e.date === ui.todayISO(); }).reduce(function (s, e) { return s + e.amount; }, 0);
    view.appendChild(el('div', { class: 'stat-row' }, [
      stat('Today', '今日', todayTotal, rate),
      stat('Whole trip', '整個行程', total, rate)
    ]));

    // Form
    var editing = null;
    var amount = el('input', { type: 'text', inputmode: 'numeric', class: 'input-big', placeholder: '¥ 0', 'aria-label': 'Amount in yen 日圓金額' });
    var amountCad = el('div', { class: 'hint amount-cad', text: ' ' });
    amount.addEventListener('input', function () {
      var n = ui.parseNum(amount.value);
      amountCad.textContent = isFinite(n) ? '≈ ' + ui.cad(n * rate) : ' ';
    });

    var cat = 'food';
    var catRow = el('div', { class: 'choice-grid' });
    function drawCats() {
      catRow.textContent = '';
      CATS.forEach(function (c) {
        catRow.appendChild(el('button', {
          type: 'button', class: 'choice' + (cat === c.id ? ' active' : ''), 'aria-pressed': cat === c.id ? 'true' : 'false',
          on: { click: function () { cat = c.id; drawCats(); } }
        }, [el('span', { class: 'choice-icon', 'aria-hidden': 'true', text: c.icon }), bi(c.en, c.zh)]));
      });
    }

    var payer = people[0] && people[0].id;
    var payerRow = el('div', { class: 'chips' });
    function drawPayer() {
      payerRow.textContent = '';
      people.forEach(function (p) {
        payerRow.appendChild(el('button', {
          type: 'button', class: 'chip chip-lg' + (payer === p.id ? ' active' : ''), 'aria-pressed': payer === p.id ? 'true' : 'false', text: p.name,
          on: { click: function () { payer = p.id; drawPayer(); } }
        }));
      });
    }

    var shares = people.map(function (p) { return p.id; });
    var shareRow = el('div', { class: 'chips' });
    function drawShares() {
      shareRow.textContent = '';
      people.forEach(function (p) {
        var on = shares.indexOf(p.id) >= 0;
        shareRow.appendChild(el('button', {
          type: 'button', class: 'chip chip-lg' + (on ? ' active' : ''), 'aria-pressed': on ? 'true' : 'false',
          text: (on ? '✓ ' : '') + p.name,
          on: {
            click: function () {
              if (on) shares = shares.filter(function (x) { return x !== p.id; }); else shares.push(p.id);
              drawShares();
            }
          }
        }));
      });
    }

    var note = el('input', { type: 'text', placeholder: '例：一蘭午餐 Lunch', autocomplete: 'off' });
    var date = el('input', { type: 'date', value: ui.todayISO() });
    var saveBtn = el('button', { type: 'submit', class: 'btn btn-primary btn-block btn-big' }, [bi('Add expense', '新增開支')]);
    var cancelBtn = ui.button('Cancel edit', '取消編輯', function () { resetForm(); }, 'btn-ghost btn-block');
    cancelBtn.hidden = true;

    function resetForm() {
      editing = null; amount.value = ''; amountCad.textContent = ' '; note.value = ''; date.value = ui.todayISO();
      cat = 'food'; payer = people[0] && people[0].id; shares = people.map(function (p) { return p.id; });
      drawCats(); drawPayer(); drawShares();
      saveBtn.textContent = ''; saveBtn.appendChild(bi('Add expense', '新增開支'));
      cancelBtn.hidden = true;
    }

    function editEntry(e) {
      editing = e.id; amount.value = e.amount; amountCad.textContent = '≈ ' + ui.cad(e.amount * rate);
      note.value = e.note || ''; date.value = e.date; cat = e.cat; payer = e.payer; shares = e.shares.slice();
      drawCats(); drawPayer(); drawShares();
      saveBtn.textContent = ''; saveBtn.appendChild(bi('Save changes', '儲存修改'));
      cancelBtn.hidden = false;
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    var form = el('form', {
      class: 'card form', on: {
        submit: function (ev) {
          ev.preventDefault();
          var n = Math.round(ui.parseNum(amount.value));
          if (!(n > 0)) { ui.toast('Enter an amount 請輸入金額'); amount.focus(); return; }
          if (!payer) { ui.toast('Who paid? 誰付款？'); return; }
          if (!shares.length) { ui.toast('Pick who shares it 請選擇分擔的人'); return; }
          var entry = { id: editing || store.uid(), date: date.value || ui.todayISO(), amount: n, cat: cat, payer: payer, shares: shares.slice(), note: note.value.trim() };
          store.update('wallet', [], function (l) {
            var i = l.findIndex(function (x) { return x.id === entry.id; });
            if (i >= 0) l[i] = entry; else l.push(entry);
          });
          ui.toast(editing ? 'Saved 已儲存' : 'Added 已新增');
          JP.router.render();
        }
      }
    }, [
      el('label', { class: 'mini-label' }, [bi('Amount (yen)', '金額（日圓）')]),
      amount, amountCad,
      el('div', { class: 'mini-label' }, [bi('Category', '類別')]), catRow,
      el('div', { class: 'mini-label' }, [bi('Who paid?', '誰付款？')]), payerRow,
      el('div', { class: 'mini-label' }, [bi('Shared by', '由誰分擔')]), shareRow,
      ui.field('Note', '備註', note),
      ui.field('Date', '日期', date),
      saveBtn, cancelBtn
    ]);
    resetForm();

    view.appendChild(ui.section('Add expense', '記錄開支', [
      people.length < 2 ? el('p', { class: 'hint' }, [bi('Tip: add everyone travelling in Settings.', '提示：請在「設定」加入所有同行旅客。')]) : null,
      form
    ]));

    // End trip button
    view.appendChild(el('a', { class: 'btn btn-accent btn-block btn-big', href: '#/money/settle' }, [bi('🏁 End of trip — who owes whom?', '行程完結 — 計算誰要還錢給誰')]));

    // List grouped by date (newest first)
    var byDate = {};
    list.forEach(function (e) { (byDate[e.date] = byDate[e.date] || []).push(e); });
    var dates = Object.keys(byDate).sort().reverse();
    var listSec = ui.section('Expenses', '開支紀錄', []);
    if (!dates.length) listSec.appendChild(el('p', { class: 'empty' }, [bi('No expenses yet.', '尚未有開支紀錄。')]));
    dates.forEach(function (d) {
      var items = byDate[d];
      var dayTotal = items.reduce(function (s, e) { return s + e.amount; }, 0);
      var day = el('div', { class: 'day' }, [
        el('div', { class: 'day-head' }, [
          el('span', { class: 'day-date', text: formatDate(d) }),
          el('span', { class: 'day-total', text: ui.yen(dayTotal) + ' · ' + ui.cad(dayTotal * rate) })
        ])
      ]);
      items.slice().reverse().forEach(function (e) {
        var c = catOf(e.cat);
        var shareNames = e.shares.length === people.length ? 'All 全部' : e.shares.map(nameOf).join(', ');
        day.appendChild(el('div', { class: 'entry', role: 'button', tabindex: '0', on: { click: function () { editEntry(e); } } }, [
          el('span', { class: 'entry-icon', 'aria-hidden': 'true', text: c.icon }),
          el('div', { class: 'entry-main' }, [
            el('div', { class: 'entry-note', text: e.note || (c.en + ' ' + c.zh) }),
            el('div', { class: 'entry-meta', text: nameOf(e.payer) + ' paid 付款 · split 分擔: ' + shareNames })
          ]),
          el('div', { class: 'entry-amt' }, [
            el('div', { text: ui.yen(e.amount) }),
            el('div', { class: 'entry-cad', text: ui.cad(e.amount * rate) })
          ]),
          ui.iconButton('🗑', 'Delete 刪除', function () {
            if (!ui.confirm('Delete this expense? 確定刪除這筆開支？')) return;
            store.update('wallet', [], function (l) { return l.filter(function (x) { return x.id !== e.id; }); });
            JP.router.render({ keepScroll: true });
          })
        ]));
      });
      listSec.appendChild(day);
    });
    view.appendChild(listSec);

    // Totals by category
    if (list.length) {
      var catTotals = CATS.map(function (c) {
        return { c: c, v: list.filter(function (e) { return e.cat === c.id; }).reduce(function (s, e) { return s + e.amount; }, 0) };
      }).filter(function (x) { return x.v > 0; });
      view.appendChild(ui.section('By category', '按類別', [
        el('div', { class: 'card' }, catTotals.map(function (x) {
          return el('div', { class: 'row-line' }, [
            el('span', {}, [x.c.icon + ' ', bi(x.c.en, x.c.zh)]),
            el('span', { class: 'row-amt', text: ui.yen(x.v) + ' · ' + ui.cad(x.v * rate) })
          ]);
        }))
      ]));
    }

    fetchRate(false);
  }

  function stat(en, zh, yenAmt, rate) {
    return el('div', { class: 'stat' }, [
      el('div', { class: 'stat-label' }, [bi(en, zh)]),
      el('div', { class: 'stat-yen', text: ui.yen(yenAmt) }),
      el('div', { class: 'stat-cad', text: ui.cad(yenAmt * rate) })
    ]);
  }

  function formatDate(iso) {
    var p = iso.split('-');
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    var wd = ['Sun 日', 'Mon 一', 'Tue 二', 'Wed 三', 'Thu 四', 'Fri 五', 'Sat 六'][d.getDay()];
    return iso + ' (' + wd + ')';
  }

  // ---------------- Settlement ----------------
  /**
   * Returns {people: [{id, name, paid, share, balance}], transfers: [{from, to, amount}]}
   * balance > 0 → should receive money; < 0 → owes money.
   */
  function settle(list, people) {
    var map = {};
    people.forEach(function (p) { map[p.id] = { id: p.id, name: p.name, paid: 0, share: 0 }; });
    function ensure(id) { if (!map[id]) map[id] = { id: id, name: '?', paid: 0, share: 0 }; return map[id]; }

    list.forEach(function (e) {
      ensure(e.payer).paid += e.amount;
      var ids = e.shares && e.shares.length ? e.shares : [e.payer];
      var base = Math.floor(e.amount / ids.length);
      var rem = e.amount - base * ids.length;
      ids.forEach(function (id, i) { ensure(id).share += base + (i < rem ? 1 : 0); });
    });

    var rows = Object.keys(map).map(function (k) {
      var r = map[k]; r.balance = r.paid - r.share; return r;
    });

    // Greedy: largest debtor pays largest creditor → at most n-1 transfers.
    var cred = rows.filter(function (r) { return r.balance > 0; }).map(function (r) { return { id: r.id, name: r.name, v: r.balance }; });
    var debt = rows.filter(function (r) { return r.balance < 0; }).map(function (r) { return { id: r.id, name: r.name, v: -r.balance }; });
    var transfers = [];
    cred.sort(function (a, b) { return b.v - a.v; });
    debt.sort(function (a, b) { return b.v - a.v; });
    var i = 0, j = 0;
    while (i < debt.length && j < cred.length) {
      var x = Math.min(debt[i].v, cred[j].v);
      if (x > 0) transfers.push({ from: debt[i].name, to: cred[j].name, amount: x });
      debt[i].v -= x; cred[j].v -= x;
      if (debt[i].v === 0) i++;
      if (cred[j].v === 0) j++;
    }
    return { people: rows, transfers: transfers };
  }

  function renderSettle(view) {
    header(view, 'settle');
    var list = store.get('wallet', []);
    var rate = getRate().cadPerJpy;
    var res = settle(list, travellers());
    var total = list.reduce(function (s, e) { return s + e.amount; }, 0);

    view.appendChild(el('div', { class: 'stat-row' }, [stat('Trip total', '行程總開支', total, rate)]));

    if (!list.length) {
      view.appendChild(el('p', { class: 'empty' }, [bi('No expenses recorded yet.', '尚未有開支紀錄。')]));
      return;
    }

    var tsec = ui.section('Who pays whom', '誰要還錢給誰', []);
    if (!res.transfers.length) {
      tsec.appendChild(el('div', { class: 'card settle-even' }, [bi('🎉 All even — nobody owes anything!', '🎉 已經平數，無人欠錢！')]));
    }
    res.transfers.forEach(function (t) {
      tsec.appendChild(el('div', { class: 'card transfer' }, [
        el('div', { class: 'transfer-names' }, [
          el('span', { class: 'who', text: t.from }),
          el('span', { class: 'arrow', 'aria-hidden': 'true', text: '→' }),
          el('span', { class: 'who', text: t.to })
        ]),
        el('div', { class: 'transfer-amt', text: ui.yen(t.amount) }),
        el('div', { class: 'transfer-cad', text: '≈ ' + ui.cad(t.amount * rate) }),
        el('div', { class: 'hint' }, [bi(t.from + ' pays ' + t.to, t.from + ' 付給 ' + t.to)])
      ]));
    });
    view.appendChild(tsec);

    var table = el('table', { class: 'settle-table' }, [
      el('thead', {}, [el('tr', {}, [
        el('th', {}, [bi('Name', '姓名')]),
        el('th', {}, [bi('Paid', '已付')]),
        el('th', {}, [bi('Share', '應付')]),
        el('th', {}, [bi('Balance', '差額')])
      ])]),
      el('tbody', {}, res.people.map(function (p) {
        return el('tr', {}, [
          el('td', { text: p.name }),
          el('td', { text: ui.yen(p.paid) }),
          el('td', { text: ui.yen(p.share) }),
          el('td', { class: p.balance > 0 ? 'pos' : p.balance < 0 ? 'neg' : '', text: (p.balance > 0 ? '+' : '') + ui.yen(p.balance).replace('¥-', '−¥') })
        ]);
      }))
    ]);
    view.appendChild(ui.section('Details', '明細', [
      el('div', { class: 'card table-wrap' }, [table]),
      el('p', { class: 'hint' }, [bi('+ means they get money back; − means they owe.', '＋代表應收回款項；－代表需要付款。')])
    ]));

    view.appendChild(ui.section('New trip', '新行程', [
      ui.button('Clear all expenses & start a new trip', '清除所有開支，開始新行程', function () {
        if (!ui.confirm('Delete ALL expenses? This cannot be undone. 確定刪除所有開支？此操作無法復原。')) return;
        store.set('wallet', []);
        ui.toast('Cleared 已清除');
        JP.router.go('money/wallet');
      }, 'btn-danger btn-block')
    ]));
  }

  // Exposed for tests / other tools.
  JP.money = { settle: settle, getRate: getRate, fetchRate: fetchRate };

  JP.registerTool({
    id: 'money', en: 'Money', zh: '錢', icon: '💴', color: 'gold', order: 20,
    render: function (view, params) {
      if (params[0] === 'wallet') return renderWallet(view);
      if (params[0] === 'settle') return renderSettle(view);
      renderConvert(view);
    }
  });
})();
