/*
 * ui.js — shared building blocks used by every tool:
 * element builder, bilingual labels, toast, speech, fullscreen "show mode",
 * phrase cards, tabs and number formatting.
 */
window.JP = window.JP || {};

JP.ui = (function () {

  /**
   * el('div', {class: 'x', on: {click: fn}, lang: 'ja'}, [children...])
   * Children may be strings (inserted as text, never HTML) or nodes.
   */
  function el(tag, props, children) {
    var node = document.createElement(tag);
    props = props || {};
    Object.keys(props).forEach(function (k) {
      var v = props[k];
      if (v === undefined || v === null || v === false) return;
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else if (k === 'on') Object.keys(v).forEach(function (ev) { node.addEventListener(ev, v[ev]); });
      else if (k === 'style') node.setAttribute('style', v);
      else if (k === 'value') node.value = v;
      else if (k === 'checked') node.checked = !!v;
      else if (k === 'dataset') Object.keys(v).forEach(function (d) { node.dataset[d] = v[d]; });
      else if (v === true) node.setAttribute(k, '');
      else node.setAttribute(k, v);
    });
    append(node, children);
    return node;
  }

  function append(node, children) {
    if (children === undefined || children === null) return node;
    if (!Array.isArray(children)) children = [children];
    children.forEach(function (c) {
      if (c === undefined || c === null || c === false) return;
      node.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    });
    return node;
  }

  /** Bilingual label: English on top, Traditional Chinese subtitle below. */
  function bi(en, zh, cls) {
    return el('span', { class: 'bi ' + (cls || '') }, [
      el('span', { class: 'en', text: en }),
      zh ? el('span', { class: 'zh', lang: 'zh-Hant', text: zh }) : null
    ]);
  }

  function button(en, zh, onClick, cls) {
    return el('button', { type: 'button', class: 'btn ' + (cls || ''), on: { click: onClick } }, [bi(en, zh)]);
  }

  function iconButton(icon, label, onClick, cls) {
    return el('button', {
      type: 'button', class: 'icon-btn ' + (cls || ''), 'aria-label': label, title: label,
      on: { click: function (e) { e.stopPropagation(); onClick(e); } }
    }, [el('span', { 'aria-hidden': 'true', text: icon })]);
  }

  function section(en, zh, children, cls) {
    return el('section', { class: 'section ' + (cls || '') }, [
      el('h2', { class: 'section-title' }, [bi(en, zh)])
    ].concat(children || []));
  }

  /** Labeled form field. input is an element. */
  function field(en, zh, input, hint) {
    var id = input.id || ('f' + Math.random().toString(36).slice(2, 8));
    input.id = id;
    return el('div', { class: 'field' }, [
      el('label', { for: id }, [bi(en, zh)]),
      input,
      hint ? el('p', { class: 'hint', text: hint }) : null
    ]);
  }

  // ---------- Toast ----------
  var toastTimer;
  function toast(msg) {
    var t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 2600);
  }

  // ---------- Speech (ja-JP) ----------
  var jaVoice = null;
  function pickVoice() {
    if (!('speechSynthesis' in window)) return;
    var voices = speechSynthesis.getVoices() || [];
    // Prefer Kyoko / Otoya (iOS) or any ja-JP voice.
    jaVoice = voices.filter(function (v) { return /^ja[-_]JP/i.test(v.lang); })
      .sort(function (a, b) { return (b.localService ? 1 : 0) - (a.localService ? 1 : 0); })[0] || null;
  }
  if ('speechSynthesis' in window) {
    pickVoice();
    speechSynthesis.addEventListener && speechSynthesis.addEventListener('voiceschanged', pickVoice);
  }

  function speak(text) {
    if (!('speechSynthesis' in window)) {
      toast('Speech not supported 此裝置不支援朗讀');
      return;
    }
    pickVoice();
    speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP';
    u.rate = 0.85;
    if (jaVoice) u.voice = jaVoice;
    else toast('No Japanese voice found — check iPhone Settings › Accessibility › Spoken Content 未找到日語語音');
    speechSynthesis.speak(u);
  }

  // ---------- Fullscreen show mode ----------
  var wakeLock = null;
  function requestWake() {
    try {
      if (navigator.wakeLock) navigator.wakeLock.request('screen').then(function (l) { wakeLock = l; }).catch(function () {});
    } catch (e) {}
  }
  function releaseWake() {
    try { if (wakeLock) wakeLock.release(); } catch (e) {}
    wakeLock = null;
  }

  /**
   * Show large Japanese text across the whole screen for staff to read.
   * opts: { ja, en, zh, speakText, lines: [..] }
   */
  function showMode(opts) {
    closeShow();
    var jaNode = el('div', { class: 'show-ja', lang: 'ja', text: opts.ja });
    var overlay = el('div', {
      class: 'show-overlay', id: 'showOverlay', role: 'dialog', 'aria-modal': 'true',
      'aria-label': 'Show to staff 給店員看'
    }, [
      el('div', { class: 'show-bar' }, [
        opts.noSpeak ? el('span') : el('button', {
          type: 'button', class: 'show-btn', on: { click: function () { speak(opts.speakText || opts.ja); } }
        }, [bi('🔊 Speak', '朗讀')]),
        el('button', { type: 'button', class: 'show-btn show-close', on: { click: closeShow } }, [bi('✕ Close', '關閉')])
      ]),
      el('div', { class: 'show-body' }, [
        jaNode,
        (opts.en || opts.zh) ? el('div', { class: 'show-sub' }, [
          opts.en ? el('div', { text: opts.en }) : null,
          opts.zh ? el('div', { lang: 'zh-Hant', text: opts.zh }) : null
        ]) : null
      ])
    ]);
    document.body.appendChild(overlay);
    document.body.classList.add('no-scroll');
    fitText(jaNode);
    requestWake();
    history.pushState({ show: true }, '');
  }

  /** Shrink font until the Japanese text fits the screen. */
  function fitText(node) {
    var parent = node.parentElement;
    var cs = getComputedStyle(parent);
    var W = parent.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    var H = parent.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) -
      (node.nextSibling ? node.nextSibling.offsetHeight + 18 : 0);
    var text = node.textContent;
    var lines = text.split('\n');
    var longest = Math.max.apply(null, lines.map(function (l) { return l.length; }));
    var chars = Math.max(1, text.replace(/\n/g, '').length);
    // Japanese glyphs are ~1em wide: keep short lines on one line, wrap long text to fill the area.
    var size = Math.min(H * 0.28, Math.sqrt((W * H) / (chars * 1.7 + lines.length * 4)));
    if (longest <= 12) size = Math.min(size, (W / longest) * 0.95);
    size = Math.max(size, 16);
    node.style.fontSize = size + 'px';
    var guard = 0;
    while ((node.scrollHeight > H || node.scrollWidth > W) && size > 16 && guard++ < 60) {
      size *= 0.94;
      node.style.fontSize = size + 'px';
    }
  }

  function closeShow(fromPop) {
    var o = document.getElementById('showOverlay');
    if (!o) return false;
    o.remove();
    document.body.classList.remove('no-scroll');
    releaseWake();
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    if (fromPop !== true && history.state && history.state.show) history.back();
    return true;
  }

  // ---------- Phrase card ----------
  /**
   * p: {en, zh, ja, romaji}; opts: {fav: bool, onFav, onEdit, onDelete}
   */
  function phraseCard(p, opts) {
    opts = opts || {};
    var actions = [
      iconButton('🔊', 'Speak 朗讀', function () { speak(p.ja); }),
      iconButton('⛶', 'Show full screen 全螢幕', function () { showMode({ ja: p.ja, en: p.en, zh: p.zh }); })
    ];
    if (opts.onFav) {
      actions.push(iconButton(opts.fav ? '★' : '☆', opts.fav ? 'Unfavourite 取消最愛' : 'Favourite 加入最愛',
        opts.onFav, opts.fav ? 'fav on' : 'fav'));
    }
    if (opts.onEdit) actions.push(iconButton('✎', 'Edit 編輯', opts.onEdit));
    if (opts.onDelete) actions.push(iconButton('🗑', 'Delete 刪除', opts.onDelete));

    return el('article', {
      class: 'phrase-card', tabindex: '0',
      on: {
        click: function () { showMode({ ja: p.ja, en: p.en, zh: p.zh }); },
        keydown: function (e) { if (e.key === 'Enter') showMode({ ja: p.ja, en: p.en, zh: p.zh }); }
      }
    }, [
      el('div', { class: 'phrase-top' }, [
        el('div', { class: 'phrase-en', text: p.en }),
        p.zh ? el('div', { class: 'phrase-zh', lang: 'zh-Hant', text: p.zh }) : null
      ]),
      el('div', { class: 'phrase-ja', lang: 'ja', text: p.ja }),
      p.romaji ? el('div', { class: 'phrase-romaji', text: p.romaji }) : null,
      el('div', { class: 'phrase-actions' }, actions)
    ]);
  }

  // ---------- Tabs ----------
  /**
   * tabs([{id, en, zh}], activeId, onChange) → element
   */
  function tabs(items, active, onChange) {
    // Up to 3 tabs share the width equally so none is hidden off-screen.
    var bar = el('div', { class: 'tabs' + (items.length <= 3 ? ' tabs-fit' : ''), role: 'tablist' });
    if (items.length <= 3) bar.style.gridTemplateColumns = 'repeat(' + items.length + ', minmax(0, 1fr))';
    items.forEach(function (it) {
      bar.appendChild(el('button', {
        type: 'button', role: 'tab', class: 'tab' + (it.id === active ? ' active' : ''),
        'aria-selected': it.id === active ? 'true' : 'false',
        on: { click: function () { onChange(it.id); } }
      }, [bi(it.en, it.zh)]));
    });
    return bar;
  }

  // ---------- Formatting ----------
  function yen(n) {
    if (!isFinite(n)) return '¥—';
    return '¥' + Math.round(n).toLocaleString('en-CA');
  }
  function cad(n) {
    if (!isFinite(n)) return 'C$—';
    return 'C$' + n.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function todayISO() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function parseNum(s) {
    if (typeof s === 'number') return s;
    var n = parseFloat(String(s || '').replace(/[,¥$\s]/g, ''));
    return isFinite(n) ? n : NaN;
  }

  function confirmBox(msg) { return window.confirm(msg); }

  return {
    el: el, append: append, bi: bi, button: button, iconButton: iconButton, section: section, field: field,
    toast: toast, speak: speak, showMode: showMode, closeShow: closeShow, phraseCard: phraseCard, tabs: tabs,
    yen: yen, cad: cad, todayISO: todayISO, parseNum: parseNum, confirm: confirmBox
  };
})();
