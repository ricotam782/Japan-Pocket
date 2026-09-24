/*
 * store.js — tiny wrapper around localStorage.
 * All keys are prefixed with "jp." so the app's data is easy to find/clear.
 * Data never leaves the device.
 */
window.JP = window.JP || {};

JP.store = (function () {
  var PREFIX = 'jp.';

  function get(key, fallback) {
    try {
      var raw = localStorage.getItem(PREFIX + key);
      if (raw === null) return clone(fallback);
      return JSON.parse(raw);
    } catch (e) {
      return clone(fallback);
    }
  }

  function set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
      return true;
    } catch (e) {
      if (JP.ui) JP.ui.toast('Could not save 無法儲存');
      return false;
    }
  }

  function remove(key) {
    try { localStorage.removeItem(PREFIX + key); } catch (e) {}
  }

  /** Read-modify-write helper: update('wallet', [], list => { list.push(x); }) */
  function update(key, fallback, fn) {
    var value = get(key, fallback);
    var result = fn(value);
    set(key, result === undefined ? value : result);
    return result === undefined ? value : result;
  }

  function allKeys() {
    var keys = [];
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf(PREFIX) === 0) keys.push(k.slice(PREFIX.length));
      }
    } catch (e) {}
    return keys;
  }

  function exportAll() {
    var out = {};
    allKeys().forEach(function (k) { out[k] = get(k, null); });
    return out;
  }

  function importAll(obj) {
    Object.keys(obj || {}).forEach(function (k) { set(k, obj[k]); });
  }

  function clearAll() {
    allKeys().forEach(remove);
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function clone(v) {
    return v === undefined ? undefined : JSON.parse(JSON.stringify(v));
  }

  /** Settings live in one object; travellers are shared by several tools. */
  function settings() {
    var s = get('settings', {});
    if (!s.theme) s.theme = 'auto';
    if (!Array.isArray(s.travellers) || !s.travellers.length) {
      s.travellers = [{ id: 't1', name: 'A' }, { id: 't2', name: 'B' }];
    }
    return s;
  }

  function saveSettings(s) { set('settings', s); }

  return {
    get: get, set: set, remove: remove, update: update,
    exportAll: exportAll, importAll: importAll, clearAll: clearAll,
    uid: uid, settings: settings, saveSettings: saveSettings
  };
})();
