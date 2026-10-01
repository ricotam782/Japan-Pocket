/*
 * lookup.js — look up a business (e.g. a chain store) by name, free and keyless.
 *
 *   JP.lookup.search('一蘭')  → Promise<[candidate]>
 *   candidate = {qid, ja, en, zh, desc, website, wiki: {zh, ja, en}}
 *   JP.lookup.summary(candidate) → Promise<{text, lang, url}>  (Wikipedia intro)
 *
 * Names in Japanese / English / Chinese come from Wikidata; the longer
 * description from Wikipedia (Chinese if available, else English, else Japanese).
 * Needs internet. Results are saved by the caller, so they work offline later.
 */
window.JP = window.JP || {};

JP.lookup = (function () {
  var WD = 'https://www.wikidata.org/w/api.php?format=json&origin=*&';
  var ZH = ['zh-hk', 'zh-tw', 'zh-hant', 'zh'];
  var TIMEOUT_MS = 10000;

  function getJSON(url, headers) {
    var ctrl = 'AbortController' in window ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, TIMEOUT_MS) : null;
    var opts = { headers: headers || {} };
    if (ctrl) opts.signal = ctrl.signal;
    return fetch(url, opts).then(function (res) {
      clearTimeout(timer);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    }, function (e) { clearTimeout(timer); throw e; });
  }

  /** Which Wikidata label languages to search, based on the script typed. */
  function searchLangs(q) {
    if (/[぀-ヿ]/.test(q)) return ['ja'];             // kana → Japanese
    if (/[一-鿿]/.test(q)) return ['zh', 'ja'];       // kanji only → Chinese or Japanese
    return ['en', 'ja'];
  }

  function pick(map, langs) {
    for (var i = 0; i < langs.length; i++) if (map && map[langs[i]]) return map[langs[i]].value;
    return '';
  }

  function toCandidate(ent) {
    var claims = ent.claims || {};
    var site = claims.P856 && claims.P856[0] && claims.P856[0].mainsnak.datavalue;
    var links = ent.sitelinks || {};
    return {
      qid: ent.id,
      ja: pick(ent.labels, ['ja']),
      en: pick(ent.labels, ['en']),
      zh: pick(ent.labels, ZH),
      desc: pick(ent.descriptions, ZH) || pick(ent.descriptions, ['en']) || pick(ent.descriptions, ['ja']),
      website: site ? site.value : '',
      wiki: {
        zh: links.zhwiki ? links.zhwiki.title : '',
        ja: links.jawiki ? links.jawiki.title : '',
        en: links.enwiki ? links.enwiki.title : ''
      }
    };
  }

  function search(q) {
    q = String(q || '').trim();
    if (!q) return Promise.reject(new Error('empty'));
    if (!navigator.onLine) return Promise.reject(new Error('offline'));
    return Promise.all(searchLangs(q).map(function (lang) {
      return getJSON(WD + 'action=wbsearchentities&type=item&limit=7&language=' + lang +
        '&uselang=' + lang + '&search=' + encodeURIComponent(q))
        .then(function (j) { return (j.search || []).map(function (s) { return s.id; }); })
        .catch(function () { return []; });
    })).then(function (lists) {
      var ids = [];
      lists.forEach(function (l) { l.forEach(function (id) { if (ids.indexOf(id) < 0) ids.push(id); }); });
      ids = ids.slice(0, 8);
      if (!ids.length) return [];
      return getJSON(WD + 'action=wbgetentities&props=labels|descriptions|claims|sitelinks&languages=ja|en|' +
        ZH.join('|') + '&ids=' + ids.join('|'))
        .then(function (j) {
          return ids.map(function (id) { return j.entities && j.entities[id]; })
            .filter(function (e) { return e && !e.missing; })
            .map(toCandidate)
            .filter(function (c) { return c.ja || c.en || c.zh; });
        });
    });
  }

  function summary(c) {
    var order = [['zh', 'zh-hk'], ['en', ''], ['ja', '']];
    function tryNext(i) {
      if (i >= order.length) return Promise.resolve({ text: '', lang: '', url: '' });
      var lang = order[i][0], title = c.wiki && c.wiki[lang];
      if (!title) return tryNext(i + 1);
      var url = 'https://' + lang + '.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(title.replace(/ /g, '_'));
      // Accept-Language picks Traditional Chinese on zh.wikipedia.
      return getJSON(url, order[i][1] ? { 'Accept-Language': order[i][1] } : null).then(function (j) {
        if (!j || !j.extract) throw new Error('empty');
        return {
          text: j.extract, lang: lang,
          url: (j.content_urls && j.content_urls.mobile && j.content_urls.mobile.page) ||
            ('https://' + lang + '.wikipedia.org/wiki/' + encodeURIComponent(title))
        };
      }).catch(function () { return tryNext(i + 1); });
    }
    return tryNext(0);
  }

  return { search: search, summary: summary };
})();
