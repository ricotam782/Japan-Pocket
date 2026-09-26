/*
 * Share 同步 — send data to a travel partner's phone and merge theirs.
 * Opened from Settings and the Wallet (hidden from the home screen).
 * Route: #/sync. The merge logic lives in js/core/sync.js.
 */
(function () {
  var ui = JP.ui, el = ui.el, bi = ui.bi, store = JP.store;
  var justMerged = null; // 'file' | 'text' — shows the "merged" notice once after a merge

  function deleteFileTip() {
    return el('p', { class: 'hint' }, [bi('The share file is no longer needed — you can delete it in the Files app › Downloads.',
      '分享檔案已經不再需要，可到「檔案」App ›「下載項目」刪除。')]);
  }

  function fmtTime(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2) +
      ' ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  }

  function fileName() {
    return 'japan-pocket-share-' + fmtTime(new Date().toISOString()).replace(/[: ]/g, '-') + '.json';
  }

  function render(view) {
    var s = store.settings();
    var prefs = JP.sync.prefs();
    var last = store.get('sync.last', {});

    view.appendChild(el('div', { class: 'card sync-how' }, [
      el('div', { class: 'sync-how-title' }, [bi('How it works', '使用方法')]),
      el('ol', {}, [
        el('li', {}, [bi('Tick what to share, tap Share, and AirDrop it to your partner.', '剔選要分享的資料，按「分享」，用 AirDrop 傳給旅伴。')]),
        el('li', {}, [bi('On their phone: "Save to Files", then open Japan Pocket › Settings › Share with partner › Choose file.', '對方選「儲存到檔案」，再開啟 Japan Pocket › 設定 › 與旅伴同步 › 選擇檔案。')]),
        el('li', {}, [bi('Then they share back to you the same way. Data is merged, nothing is overwritten.', '然後對方用同樣方法傳回給你。資料會合併，不會被覆蓋。')])
      ])
    ]));

    // ---------- Send ----------
    var me = el('select', { 'aria-label': 'I am 我是' }, s.travellers.map(function (t) { return el('option', { value: t.name, text: t.name }); }));
    me.value = store.get('sync.me', s.travellers[0] && s.travellers[0].name);
    me.addEventListener('change', function () { store.set('sync.me', me.value); });

    var checks = el('div', { class: 'check-list' });
    JP.sync.CATEGORIES.forEach(function (c) {
      var cb = el('input', {
        type: 'checkbox', checked: prefs[c.id],
        on: { change: function () { prefs[c.id] = cb.checked; JP.sync.savePrefs(prefs); } }
      });
      checks.appendChild(el('label', { class: 'check' }, [cb, el('span', { class: 'check-text' }, [bi(c.en, c.zh)])]));
    });

    function selected() { return JP.sync.CATEGORIES.filter(function (c) { return prefs[c.id]; }).map(function (c) { return c.id; }); }
    function pkgText() {
      var ids = selected();
      if (!ids.length) { ui.toast('Tick at least one item 請至少剔選一項'); return null; }
      return JSON.stringify(JP.sync.buildPackage(ids, me.value));
    }

    function shareFile() {
      var text = pkgText(); if (!text) return;
      var file = null;
      try { file = new File([text], fileName(), { type: 'application/json' }); } catch (e) {}
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: 'Japan Pocket' })
          .then(function () { JP.sync.noteExported(); ui.toast('Shared 已分享'); JP.router.render({ keepScroll: true }); })
          .catch(function (e) { if (e && e.name !== 'AbortError') download(text); });
      } else {
        download(text);
      }
    }
    function download(text) {
      var a = el('a', { href: URL.createObjectURL(new Blob([text], { type: 'application/json' })), download: fileName() });
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
      JP.sync.noteExported();
      ui.toast('File saved 已儲存檔案');
    }
    function shareText() {
      var text = pkgText(); if (!text) return;
      if (navigator.share) {
        navigator.share({ text: text }).then(JP.sync.noteExported).catch(function () {});
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(function () { JP.sync.noteExported(); ui.toast('Copied 已複製'); });
      }
    }

    view.appendChild(ui.section('1. Send to partner', '1. 傳送給旅伴', [
      el('div', { class: 'card form' }, [
        ui.field('I am', '我是', me),
        el('div', { class: 'mini-label' }, [bi('What to share', '要分享的資料')]),
        checks,
        ui.button('📤 Share', '分享（AirDrop／WhatsApp）', shareFile, 'btn-primary btn-block btn-big'),
        ui.button('Share as text', '以文字分享（貼到訊息）', shareText, 'btn-ghost btn-block'),
        el('p', { class: 'hint', text: 'Last sent 上次傳送：' + fmtTime(last.exported) })
      ])
    ]));

    // ---------- Receive ----------
    var previewBox = el('div', { class: 'sync-preview' });
    var fileIn = el('input', { type: 'file', hidden: true });
    fileIn.addEventListener('change', function () {
      var f = fileIn.files && fileIn.files[0];
      if (!f) return;
      var r = new FileReader();
      r.onload = function () { load(String(r.result), 'file'); fileIn.value = ''; };
      r.readAsText(f);
    });
    var paste = el('textarea', { rows: '3', placeholder: 'Paste the shared text here 在此貼上分享的文字', 'aria-label': 'Shared text 分享的文字' });

    function load(text, source) {
      var pkg = JP.sync.parse(text);
      previewBox.textContent = '';
      if (!pkg) {
        previewBox.appendChild(el('p', { class: 'tr-msg warn' }, [bi('This is not a Japan Pocket share file.', '這不是 Japan Pocket 的分享檔案。')]));
        return;
      }
      var rows = JP.sync.preview(pkg);
      var chosen = {};
      var list = el('div', { class: 'check-list' });
      var anyChange = false;
      rows.forEach(function (r) {
        var n = r.added + r.updated + r.removed;
        if (n) anyChange = true;
        chosen[r.id] = n > 0;
        var parts = [];
        if (r.added) parts.push('+' + r.added + ' new 新增');
        if (r.updated) parts.push(r.updated + ' updated 更新');
        if (r.removed) parts.push(r.removed + ' removed 刪除');
        var cb = el('input', { type: 'checkbox', checked: n > 0, disabled: !n, on: { change: function () { chosen[r.id] = cb.checked; } } });
        list.appendChild(el('label', { class: 'check' }, [cb, el('span', { class: 'check-text' }, [
          bi(r.en, r.zh),
          el('span', { class: 'check-ja', text: n ? parts.join(' · ') : 'No changes 沒有變更' })
        ])]));
      });
      previewBox.appendChild(el('div', { class: 'card' }, [
        el('div', { class: 'sync-from' }, [bi('From ' + (pkg.from || '?') + ' · ' + fmtTime(pkg.exportedAt), '來自 ' + (pkg.from || '?'))]),
        list,
        anyChange ? ui.button('✓ Merge into my phone', '合併到我的手機', function () {
          var ids = Object.keys(chosen).filter(function (k) { return chosen[k]; });
          if (!ids.length) { ui.toast('Nothing selected 未選擇任何項目'); return; }
          JP.sync.apply(pkg, ids);
          justMerged = source;
          JP.router.render();
        }, 'btn-primary btn-block btn-big') : el('div', {}, [
          el('p', { class: 'tr-msg' }, [bi('Already up to date.', '資料已經是最新。')]),
          source === 'file' ? deleteFileTip() : null
        ])
      ]));
      previewBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    var notice = null;
    if (justMerged) {
      notice = el('div', { class: 'card sync-done', role: 'status' }, [
        el('div', { class: 'sync-done-title' }, [bi('✓ Merged into this phone', '✓ 已合併到這部手機')]),
        justMerged === 'file' ? deleteFileTip() : null
      ]);
      justMerged = null;
    }

    view.appendChild(ui.section('2. Receive from partner', '2. 接收旅伴的資料', [
      notice,
      el('div', { class: 'card form' }, [
        ui.button('📥 Choose file', '選擇檔案', function () { fileIn.click(); }, 'btn-primary btn-block btn-big'),
        fileIn,
        el('details', { class: 'details' }, [
          el('summary', {}, [bi('Paste text instead', '改為貼上文字')]),
          paste,
          ui.button('Check', '檢查', function () { load(paste.value, 'text'); }, 'btn-ghost btn-block')
        ]),
        el('p', { class: 'hint', text: 'Last received 上次接收：' + fmtTime(last.imported) + (last.from ? ' (' + last.from + ')' : '') })
      ]),
      previewBox
    ]));
    if (notice) setTimeout(function () { notice.scrollIntoView({ block: 'center' }); }, 0);
  }

  JP.registerTool({
    id: 'sync', en: 'Share with partner', zh: '與旅伴同步', icon: '🔄', hidden: true, parent: 'settings', order: 95,
    render: function (view) { render(view); }
  });
})();
