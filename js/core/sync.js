/*
 * sync.js — share data between phones without a server.
 *
 * One phone builds a "share package" (JSON) of the categories the user ticks
 * and sends it by AirDrop / WhatsApp etc. The other phone imports it and the
 * data is MERGED, never overwritten:
 *   - records are matched by id; the most recently changed copy wins
 *     (each record carries `updated`, a timestamp set by JP.sync.touch)
 *   - deletions are remembered as tombstones (JP.sync.markDeleted) so a
 *     deleted item does not come back from the other phone
 * Importing the same package twice changes nothing.
 */
window.JP = window.JP || {};

JP.sync = (function () {
  var store = JP.store;
  var APP = 'japan-pocket-sync';
  var FORMAT = 1;

  /* Categories that can be shared. kind: 'list' = array of {id,...};
     'map' = object keyed by id whose values carry _updated. */
  var CATEGORIES = [
    { id: 'wallet', key: 'wallet', kind: 'list', en: 'Wallet expenses', zh: '錢包開支', def: true },
    { id: 'travellers', key: 'travellers', kind: 'list', en: 'Travellers', zh: '旅客名單', def: true },
    { id: 'medical', key: 'medical', kind: 'map', en: 'Medical cards', zh: '醫療資料卡', def: true },
    { id: 'shopping', key: 'list.shopping', kind: 'list', en: 'Shopping list', zh: '購物清單', def: true, byText: true },
    { id: 'omiyage', key: 'list.omiyage', kind: 'list', en: 'Omiyage list', zh: '手信清單', def: true, byText: true },
    { id: 'taxi', key: 'taxi', kind: 'list', en: 'Taxi destinations', zh: '的士目的地', def: true },
    { id: 'packing', key: 'list.packing', kind: 'list', en: 'Packing list', zh: '行李清單', def: false, byText: true },
    { id: 'phrases', key: 'phrases.custom', kind: 'list', en: 'My phrase cards', zh: '我的句子', def: false }
  ];

  function cat(id) { return CATEGORIES.filter(function (c) { return c.id === id; })[0]; }

  // ---------- Reading / writing category data ----------
  function read(c) {
    if (c.id === 'travellers') return store.settings().travellers;
    return store.get(c.key, c.kind === 'map' ? {} : []);
  }
  function write(c, value) {
    if (c.id === 'travellers') {
      var s = store.settings(); s.travellers = value; store.saveSettings(s); return;
    }
    store.set(c.key, value);
  }

  // ---------- Change tracking (called by tools) ----------
  function touch(record) { record.updated = Date.now(); return record; }

  function markDeleted(key, id) {
    store.update('sync.deleted', {}, function (d) {
      d[key] = d[key] || {};
      d[key][id] = Date.now();
    });
  }
  function tombstones(key) { return (store.get('sync.deleted', {})[key]) || {}; }

  // ---------- Preferences ----------
  function prefs() {
    var p = store.get('sync.prefs', null) || {};
    CATEGORIES.forEach(function (c) { if (typeof p[c.id] !== 'boolean') p[c.id] = c.def; });
    return p;
  }
  function savePrefs(p) { store.set('sync.prefs', p); }

  // ---------- Build a package ----------
  function buildPackage(ids, fromName) {
    var pkg = { app: APP, format: FORMAT, exportedAt: new Date().toISOString(), from: fromName || '', data: {}, deleted: {} };
    ids.forEach(function (id) {
      var c = cat(id); if (!c) return;
      pkg.data[id] = read(c);
      pkg.deleted[id] = tombstones(c.key);
    });
    return pkg;
  }

  function parse(text) {
    var obj;
    try { obj = typeof text === 'string' ? JSON.parse(text.trim()) : text; } catch (e) { return null; }
    if (!obj || obj.app !== APP || typeof obj.data !== 'object') return null;
    return obj;
  }

  // ---------- Merging ----------
  function norm(s) { return String(s || '').trim().toLowerCase(); }

  function mergeList(c, local, incoming, localDel, incDel) {
    var dels = Object.assign({}, localDel);
    Object.keys(incDel || {}).forEach(function (id) { dels[id] = Math.max(dels[id] || 0, incDel[id]); });

    var out = local.map(function (r) { return Object.assign({}, r); });
    var byId = {};
    out.forEach(function (r, i) { byId[r.id] = i; });
    var added = 0, updated = 0, removed = 0;

    (incoming || []).forEach(function (inc) {
      if (!inc || !inc.id) return;
      var i = byId[inc.id];
      // Lists with generated ids (e.g. default packing items) also match by text.
      if (i === undefined && c.byText) {
        for (var k = 0; k < out.length; k++) {
          if (norm(out[k].text) === norm(inc.text) && norm(out[k].for) === norm(inc.for)) { i = k; break; }
        }
      }
      if (i === undefined) {
        if (dels[inc.id] && dels[inc.id] >= (inc.updated || 0)) return;
        byId[inc.id] = out.length; out.push(Object.assign({}, inc)); added++;
      } else if ((inc.updated || 0) > (out[i].updated || 0)) {
        var keepId = out[i].id;
        out[i] = Object.assign({}, inc, { id: keepId });
        updated++;
      }
    });

    out = out.filter(function (r) {
      var gone = dels[r.id] && dels[r.id] >= (r.updated || 0);
      if (gone) removed++;
      return !gone;
    });
    return { value: out, added: added, updated: updated, removed: removed, deleted: dels };
  }

  function mergeMap(local, incoming) {
    var out = Object.assign({}, local);
    var added = 0, updated = 0;
    Object.keys(incoming || {}).forEach(function (k) {
      var inc = incoming[k];
      if (!inc || typeof inc !== 'object') return;
      if (!out[k]) { out[k] = inc; added++; }
      else if ((inc._updated || 0) > (out[k]._updated || 0)) { out[k] = inc; updated++; }
    });
    return { value: out, added: added, updated: updated, removed: 0, deleted: null };
  }

  function mergeCategory(c, pkg) {
    var local = read(c);
    if (c.kind === 'map') return mergeMap(local, pkg.data[c.id]);
    return mergeList(c, local, pkg.data[c.id], tombstones(c.key), (pkg.deleted || {})[c.id]);
  }

  /** Dry run: what would change for each category in the package. */
  function preview(pkg) {
    return Object.keys(pkg.data).filter(cat).map(function (id) {
      var c = cat(id), r = mergeCategory(c, pkg);
      return { id: id, en: c.en, zh: c.zh, added: r.added, updated: r.updated, removed: r.removed };
    });
  }

  /** Merge the chosen categories into this phone. */
  function apply(pkg, ids) {
    ids.forEach(function (id) {
      var c = cat(id); if (!c || !(id in pkg.data)) return;
      var r = mergeCategory(c, pkg);
      if (c.id === 'travellers' && !r.value.length) return; // always keep at least one traveller
      write(c, r.value);
      if (r.deleted) store.update('sync.deleted', {}, function (d) { d[c.key] = r.deleted; });
    });
    store.update('sync.last', {}, function (l) { l.imported = new Date().toISOString(); l.from = pkg.from || ''; });
  }

  function noteExported() {
    store.update('sync.last', {}, function (l) { l.exported = new Date().toISOString(); });
  }

  return {
    CATEGORIES: CATEGORIES, touch: touch, markDeleted: markDeleted,
    prefs: prefs, savePrefs: savePrefs,
    buildPackage: buildPackage, parse: parse, preview: preview, apply: apply, noteExported: noteExported
  };
})();
