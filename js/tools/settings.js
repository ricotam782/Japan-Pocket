/*
 * Settings 設定 — travellers (any number), theme, backup / restore / clear.
 */
(function () {
  var ui = JP.ui, el = ui.el, bi = ui.bi, store = JP.store;

  function render(view) {
    var s = store.settings();

    // Travellers
    var wallet = store.get('wallet', []);
    function usedBy(id) { return wallet.some(function (e) { return e.payer === id || (e.shares || []).indexOf(id) >= 0; }); }

    var tList = el('div', { class: 'traveller-list' });
    s.travellers.forEach(function (t, idx) {
      var input = el('input', {
        type: 'text', value: t.name, autocomplete: 'off', 'aria-label': 'Traveller name 旅客名稱',
        on: {
          change: function () {
            var v = input.value.trim();
            if (!v) { input.value = t.name; return; }
            s.travellers[idx].name = v; store.saveSettings(s); ui.toast('Saved 已儲存');
          }
        }
      });
      tList.appendChild(el('div', { class: 'traveller' }, [
        el('span', { class: 'avatar', 'aria-hidden': 'true', text: (t.name || '?').slice(0, 1).toUpperCase() }),
        input,
        ui.iconButton('🗑', 'Remove 移除', function () {
          if (s.travellers.length <= 1) { ui.toast('Keep at least one traveller 至少保留一位旅客'); return; }
          if (usedBy(t.id)) { ui.toast('Used in the wallet — cannot remove 已用於錢包紀錄，無法移除'); return; }
          if (!ui.confirm('Remove ' + t.name + '? 確定移除？')) return;
          s.travellers.splice(idx, 1); store.saveSettings(s); JP.router.render({ keepScroll: true });
        })
      ]));
    });

    var newName = el('input', { type: 'text', placeholder: 'Name 名稱', autocomplete: 'off', 'aria-label': 'New traveller name 新旅客名稱' });
    view.appendChild(ui.section('Travellers', '旅客', [
      el('p', { class: 'hint' }, [bi('Used by the wallet and medical cards. Add as many as you like.', '用於錢包及醫療資料卡，人數不限。')]),
      tList,
      el('form', {
        class: 'add-row', on: {
          submit: function (e) {
            e.preventDefault();
            var v = newName.value.trim();
            if (!v) { newName.focus(); return; }
            s.travellers.push({ id: 't' + store.uid(), name: v }); store.saveSettings(s);
            ui.toast('Added 已新增'); JP.router.render({ keepScroll: true });
          }
        }
      }, [newName, el('button', { type: 'submit', class: 'btn btn-primary' }, [bi('+ Add', '新增')])])
    ]));

    // Theme
    var themes = [{ id: 'auto', en: 'Auto', zh: '自動' }, { id: 'light', en: 'Light', zh: '淺色' }, { id: 'dark', en: 'Dark', zh: '深色' }];
    view.appendChild(ui.section('Appearance', '外觀', [
      el('div', { class: 'choice-grid three' }, themes.map(function (t) {
        return el('button', {
          type: 'button', class: 'choice' + (s.theme === t.id ? ' active' : ''), 'aria-pressed': s.theme === t.id ? 'true' : 'false',
          on: { click: function () { s.theme = t.id; store.saveSettings(s); JP.applyTheme(); JP.router.render({ keepScroll: true }); } }
        }, [bi(t.en, t.zh)]);
      }))
    ]));

    // Backup
    var fileIn = el('input', { type: 'file', accept: 'application/json,.json', hidden: true });
    fileIn.addEventListener('change', function () {
      var f = fileIn.files && fileIn.files[0];
      if (!f) return;
      var r = new FileReader();
      r.onload = function () {
        try {
          var data = JSON.parse(r.result);
          if (!ui.confirm('Replace data on this phone with the backup? 確定用備份取代現有資料？')) return;
          store.clearAll(); store.importAll(data); JP.applyTheme();
          ui.toast('Restored 已還原'); JP.router.go('');
        } catch (e) { ui.toast('Not a valid backup file 備份檔案無效'); }
      };
      r.readAsText(f);
    });

    view.appendChild(ui.section('Your data', '你的資料', [
      el('p', { class: 'hint' }, [bi('Everything is stored only on this phone. Make a backup before changing phones.', '所有資料只儲存在這部手機。換手機前請先備份。')]),
      ui.button('Save a backup file', '儲存備份檔案', function () {
        var blob = new Blob([JSON.stringify(store.exportAll(), null, 2)], { type: 'application/json' });
        var a = el('a', { href: URL.createObjectURL(blob), download: 'japan-pocket-backup-' + ui.todayISO() + '.json' });
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
      }, 'btn-ghost btn-block'),
      ui.button('Restore from backup', '從備份還原', function () { fileIn.click(); }, 'btn-ghost btn-block'),
      fileIn,
      ui.button('Erase all data', '清除所有資料', function () {
        if (!ui.confirm('Erase ALL data on this phone? 確定清除所有資料？此操作無法復原。')) return;
        store.clearAll(); JP.applyTheme(); ui.toast('Erased 已清除'); JP.router.go('');
      }, 'btn-danger btn-block')
    ]));

    view.appendChild(el('div', { class: 'card about' }, [
      bi('How to install on iPhone', '如何安裝到 iPhone'),
      el('ol', {}, [
        el('li', {}, [bi('Open this page in Safari.', '用 Safari 開啟此網頁。')]),
        el('li', {}, [bi('Tap the Share button (square with arrow).', '按「分享」按鈕（方框加箭嘴）。')]),
        el('li', {}, [bi('Choose "Add to Home Screen".', '選擇「加入主畫面」。')]),
        el('li', {}, [bi('Open it once while online — then it works offline.', '上網時先開啟一次，之後離線亦可使用。')])
      ]),
      el('p', { class: 'hint', text: 'Japan Pocket · v1' })
    ]));
  }

  JP.registerTool({
    id: 'settings', en: 'Settings', zh: '設定', icon: '⚙️', color: 'slate', order: 90,
    render: function (view) { render(view); }
  });
})();
