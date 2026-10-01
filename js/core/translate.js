/*
 * translate.js — in-app machine translation (mostly English / Chinese → Japanese).
 * No API key needed. Tries Google's public web endpoint first (also returns a
 * romaji reading), then falls back to MyMemory. Needs internet.
 *
 * JP.translate('Where is the toilet?', 'en') → Promise<{ja, romaji, source}>
 * JP.translate('ねぎし', 'ja', 'zh-TW')         → Promise<{text, ...}>  (other target languages)
 * `text` is always the translation; `ja` is kept as an alias for Japanese targets.
 */
window.JP = window.JP || {};

JP.translate = (function () {
  var TIMEOUT_MS = 8000;

  function withTimeout(url) {
    var ctrl = 'AbortController' in window ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, TIMEOUT_MS) : null;
    return fetch(url, ctrl ? { signal: ctrl.signal } : {})
      .then(function (res) {
        clearTimeout(timer);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      }, function (e) { clearTimeout(timer); throw e; });
  }

  function google(text, sl, tl) {
    var url = 'https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&dt=rt&tl=' + encodeURIComponent(tl) +
      '&sl=' + encodeURIComponent(sl) + '&q=' + encodeURIComponent(text);
    return withTimeout(url).then(function (data) {
      // data[0] = [[translated, original, ...], ..., [null, null, romaji, sourceReading]]
      var parts = (data && data[0]) || [];
      var ja = '', romaji = '';
      parts.forEach(function (p) {
        if (!Array.isArray(p)) return;
        if (typeof p[0] === 'string') ja += p[0];
        else if (p[0] === null && typeof p[2] === 'string') romaji = p[2];
      });
      if (!ja.trim()) throw new Error('empty');
      return { text: ja.trim(), ja: ja.trim(), romaji: tl === 'ja' ? romaji.trim() : '', source: 'Google' };
    });
  }

  function myMemory(text, sl, tl) {
    var url = 'https://api.mymemory.translated.net/get?langpair=' + encodeURIComponent(sl + '|' + tl) +
      '&q=' + encodeURIComponent(text);
    return withTimeout(url).then(function (data) {
      var ja = data && data.responseData && data.responseData.translatedText;
      if (!ja || (data.responseStatus && +data.responseStatus !== 200)) throw new Error('empty');
      return { text: String(ja).trim(), ja: String(ja).trim(), romaji: '', source: 'MyMemory' };
    });
  }

  return function translate(text, sl, tl) {
    tl = tl || 'ja';
    text = String(text || '').trim();
    sl = sl || 'en';
    if (!text) return Promise.reject(new Error('empty'));
    if (!navigator.onLine) return Promise.reject(new Error('offline'));
    return google(text, sl, tl).catch(function () { return myMemory(text, sl, tl); });
  };
})();
