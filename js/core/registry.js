/*
 * registry.js — tools register themselves here and appear as home tiles.
 *
 * JP.registerTool({
 *   id: 'money',              // used in the URL: #/money
 *   en: 'Money', zh: '錢',      // tile + header labels
 *   icon: '💴',               // emoji shown on the tile
 *   color: 'gold',            // tile accent: red | indigo | gold | green | teal | plum | slate
 *   order: 20,                // position on the home screen
 *   hidden: false,            // true = no home tile (opened from another tool)
 *   parent: 'settings',       // optional: where the Back button goes
 *   render: function (view, params) { ... }  // draw into the <main> element
 * });
 */
window.JP = window.JP || {};

JP.tools = [];

JP.registerTool = function (tool) {
  if (!tool || !tool.id || typeof tool.render !== 'function') {
    throw new Error('registerTool needs {id, render}');
  }
  JP.tools.push(tool);
  JP.tools.sort(function (a, b) { return (a.order || 99) - (b.order || 99); });
};

JP.getTool = function (id) {
  for (var i = 0; i < JP.tools.length; i++) if (JP.tools[i].id === id) return JP.tools[i];
  return null;
};
