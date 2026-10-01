/*
 * lookup.js — look up a business (e.g. a chain store) by name, free and keyless.
 *
 *   JP.lookup.search('一蘭')  → Promise<[candidate]>
 *   candidate = {qid, ja, en, zh, desc, website, wiki: {zh, ja, en}}
 *   JP.lookup.summary(candidate) → Promise<{text, lang, url}>  (Wikipedia intro)
 *
 * Two searches run together: Wikidata labels (exact / prefix name match) and
 * Wikipedia full-text search (finds smaller chains mentioned in article text,
 * e.g. 「ねぎし 牛たん」). Names in Japanese / English / Chinese come from
 * Wikidata; the longer description from Wikipedia (Chinese if available,
 * else English, else Japanese).
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

  /** Wikidata label search → item ids. */
  function labelSearch(q, lang) {
    return getJSON(WD + 'action=wbsearchentities&type=item&limit=7&language=' + lang +
      '&uselang=' + lang + '&search=' + encodeURIComponent(q))
      .then(function (j) { return (j.search || []).map(function (s) { return { qid: s.id }; }); })
      .catch(function () { return []; });
  }

  /** Wikipedia full-text search → [{qid} or {page: {lang, title, desc}}]. */
  function textSearch(q, lang) {
    var wiki = lang === 'zh' ? 'zh' : lang;
    var url = 'https://' + wiki + '.wikipedia.org/w/api.php?format=json&origin=*&action=query' +
      '&generator=search&gsrlimit=5&gsrnamespace=0&prop=pageprops|description&ppprop=wikibase_item' +
      (wiki === 'zh' ? '&variant=zh-hk' : '') + '&gsrsearch=' + encodeURIComponent(q);
    return getJSON(url).then(function (j) {
      var pages = (j.query && j.query.pages) || {};
      return Object.keys(pages).map(function (k) { return pages[k]; })
        .sort(function (a, b) { return (a.index || 0) - (b.index || 0); })
        .map(function (p) {
          var qid = p.pageprops && p.pageprops.wikibase_item;
          return qid ? { qid: qid } : { page: { lang: wiki, title: p.title, desc: p.description || '' } };
        });
    }).catch(function () { return []; });
  }

  /** A Wikipedia page with no Wikidata item still makes a usable candidate. */
  function pageCandidate(p) {
    var c = { qid: '', ja: '', en: '', zh: '', desc: p.desc, website: '', wiki: { zh: '', ja: '', en: '' } };
    c[p.lang] = p.title;
    c.wiki[p.lang] = p.title;
    return c;
  }

  function search(q) {
    q = String(q || '').trim();
    if (!q) return Promise.reject(new Error('empty'));
    if (!navigator.onLine) return Promise.reject(new Error('offline'));
    var langs = searchLangs(q);
    // Label matches first (most precise), then full-text matches.
    var jobs = langs.map(function (l) { return labelSearch(q, l); })
      .concat(langs.map(function (l) { return textSearch(q, l); }));
    return Promise.all(jobs).then(function (lists) {
      var ids = [], pages = [];
      lists.forEach(function (l) {
        l.forEach(function (r) {
          if (r.qid) { if (ids.indexOf(r.qid) < 0) ids.push(r.qid); }
          else if (!pages.some(function (p) { return p.title === r.page.title; })) pages.push(r.page);
        });
      });
      ids = ids.slice(0, 10);
      var fromPages = pages.slice(0, 4).map(pageCandidate);
      if (!ids.length) return fromPages;
      return getJSON(WD + 'action=wbgetentities&props=labels|descriptions|claims|sitelinks&languages=ja|en|' +
        ZH.join('|') + '&ids=' + ids.join('|'))
        .then(function (j) {
          return ids.map(function (id) { return j.entities && j.entities[id]; })
            .filter(function (e) { return e && !e.missing; })
            .map(toCandidate)
            .filter(function (c) { return c.ja || c.en || c.zh; })
            .concat(fromPages);
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
