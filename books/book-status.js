/* book-status.js: one shared reading/buying status for every book page on Stargazer.
   Put this file in the same folder as library.html, BOOKS.html etc. (the books folder).

   Each book has two independent marks, matched across pages by its title:
     reading state : "" | "reading" | "finished"
     buying state  : "" | "willbuy"  | "bought"
   Stored in this browser (localStorage) and, when you are signed in, synced across devices through your
   existing Supabase "progress" table under page = "bookstatus". Nothing new to set up in Supabase.
*/
(function () {
  'use strict';
  if (window.SGB) return;

  var LS = 'sg_book_status_v1';
  var SB_URL = 'https://daqxabswnrhqpjyfdbwx.supabase.co';
  var SB_KEY = 'sb_publishable_ClSIuk3B4361beM8n9T7iQ_PIEM-D4j';
  var AUTH_KEY = 'sb-daqxabswnrhqpjyfdbwx-auth-token';
  var PAGE = 'bookstatus';

  /* ---------- title -> key (same book on different pages => same key) ---------- */
  function key(t) {
    var k = String(t == null ? '' : t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      .replace(/&/g, ' and ').replace(/['\u2019`]/g, '').replace(/^\s*(the|an|a)\s+(?=\S)/, '');
    return k.replace(/[^a-z0-9]+/g, '');
  }
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  /* ---------- store ---------- */
  var M = {};
  function load() { try { M = JSON.parse(localStorage.getItem(LS) || '{}') || {}; } catch (e) { M = {}; } }
  function persist() { try { localStorage.setItem(LS, JSON.stringify(M)); } catch (e) { } }
  load();

  var listeners = [];
  function onChange(fn) { if (typeof fn === 'function') listeners.push(fn); }
  function entry(k) { var e = M[k]; return e ? { r: e.r || '', b: e.b || '', tr: e.tr || 0, tb: e.tb || 0 } : { r: '', b: '', tr: 0, tb: 0 }; }
  function get(title) { return entry(key(title)); }
  function has(title) { return !!M[key(title)]; }
  function all() { return JSON.parse(JSON.stringify(M)); }

  function emit(k, origin) {
    var e = entry(k);
    listeners.slice().forEach(function (f) { try { f(k, e, origin); } catch (x) { if (window.console) console.error(x); } });
    paint(k);
  }

  /* change a book. patch = {r:..} and/or {b:..}. origin tells listeners where the change came from. */
  function set(title, patch, origin) {
    var k = key(title); if (!k) return false;
    var e = entry(k), n = { r: e.r, b: e.b, tr: e.tr, tb: e.tb }, now = Date.now(), ch = false;
    if ('r' in patch && (patch.r || '') !== e.r) { n.r = patch.r || ''; n.tr = now; ch = true; }
    if ('b' in patch && (patch.b || '') !== e.b) { n.b = patch.b || ''; n.tb = now; ch = true; }
    if (!ch) return false;
    M[k] = n; persist(); emit(k, origin || 'ui'); queueSync(); return true;
  }
  /* first-time import of a page's old, page-only marks. Only fills a mark that was never set anywhere. */
  function seed(title, patch) {
    var k = key(title); if (!k) return false;
    var e = entry(k), n = { r: e.r, b: e.b, tr: e.tr, tb: e.tb }, ch = false;
    if (patch.r && !e.tr) { n.r = patch.r; n.tr = 1; ch = true; }
    if (patch.b && !e.tb) { n.b = patch.b; n.tb = 1; ch = true; }
    if (!ch) return false;
    M[k] = n; persist(); emit(k, 'seed'); queueSync(); return true;
  }

  /* ---------- the picker ---------- */
  var BTNS = [['r', 'reading', '\uD83D\uDCD6', 'Reading'], ['r', 'finished', '\u2705', 'Finished'], ['b', 'willbuy', '\uD83D\uDD16', 'Will buy'], ['b', 'bought', '\uD83D\uDED2', 'Bought']];
  function picker(title) {
    var e = get(title);
    return '<div class="sgb" data-sgb-t="' + esc(title) + '" role="group" aria-label="Reading and buying status">' +
      BTNS.map(function (x) {
        if (!x) return '<i aria-hidden="true"></i>';
        return '<button type="button" class="sgb-' + x[1] + '" data-k="' + x[1] + '" aria-pressed="' + (e[x[0]] === x[1]) + '">' + x[2] + ' ' + x[3] + '</button>';
      }).join('') + '</div>';
  }
  function paint(k, root) {
    (root || document).querySelectorAll('.sgb').forEach(function (box) {
      var t = box.getAttribute('data-sgb-t'); if (k && key(t) !== k) return;
      var e = get(t);
      box.querySelectorAll('button[data-k]').forEach(function (b) {
        var v = b.getAttribute('data-k'), on = (v === 'reading' || v === 'finished') ? e.r === v : e.b === v;
        b.setAttribute('aria-pressed', on);
      });
    });
  }
  document.addEventListener('click', function (ev) {
    var b = ev.target && ev.target.closest && ev.target.closest('.sgb button[data-k]'); if (!b) return;
    var box = b.parentNode, t = box.getAttribute('data-sgb-t'), k = b.getAttribute('data-k'), e = get(t), p = {};
    ev.preventDefault(); ev.stopPropagation();
    if (k === 'reading' || k === 'finished') p.r = e.r === k ? '' : k; else p.b = e.b === k ? '' : k;
    set(t, p, 'ui');
  }, true);

  var css = document.createElement('style');
  css.textContent =
    '.sgb{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:10px 0;font-size:.82rem;line-height:1.2}' +
    '.sgb i{width:1px;height:20px;background:rgba(128,128,128,.45);margin:0 3px}' +
    '.sgb button{font:inherit;display:inline-flex;align-items:center;gap:5px;min-height:36px;padding:6px 12px;border-radius:999px;border:1px solid rgba(128,128,128,.55);background:transparent;color:inherit;cursor:pointer;opacity:.85;transition:background .15s,border-color .15s,opacity .15s;-webkit-tap-highlight-color:transparent}' +
    '.sgb button:hover{opacity:1;border-color:currentColor}' +
    '.sgb button[aria-pressed=true]{opacity:1;font-weight:700}' +
    '.sgb .sgb-reading[aria-pressed=true]{background:rgba(230,175,45,.26);border-color:#d9a21c}' +
    '.sgb .sgb-finished[aria-pressed=true]{background:rgba(60,175,90,.26);border-color:#37a85a}' +
    '.sgb .sgb-willbuy[aria-pressed=true]{background:rgba(150,100,220,.26);border-color:#9466d8}' +
    '.sgb .sgb-bought[aria-pressed=true]{background:rgba(70,130,225,.26);border-color:#4a82e0}';
  (document.head || document.documentElement).appendChild(css);

  /* ---------- other tabs ---------- */
  window.addEventListener('storage', function (e) {
    if (e.key !== LS) return;
    var before = M; load();
    var ks = {}; Object.keys(before).concat(Object.keys(M)).forEach(function (k) { ks[k] = 1; });
    Object.keys(ks).forEach(function (k) {
      var a = before[k] || {}, b = M[k] || {};
      if ((a.r || '') !== (b.r || '') || (a.b || '') !== (b.b || '') || (a.tr || 0) !== (b.tr || 0) || (a.tb || 0) !== (b.tb || 0)) emit(k, 'remote');
    });
  });

  /* ---------- cloud sync (only when signed in; silently skipped otherwise) ---------- */
  function auth() {
    try {
      var a = JSON.parse(localStorage.getItem(AUTH_KEY) || 'null');
      if (a && a.access_token && a.user && a.user.id && (!a.expires_at || a.expires_at * 1000 > Date.now() + 5000)) return { tok: a.access_token, uid: a.user.id };
    } catch (e) { }
    return null;
  }
  function rest(path, opt) {
    var a = auth(); if (!a) return Promise.reject(new Error('noauth'));
    opt = opt || {};
    opt.headers = Object.assign({ apikey: SB_KEY, Authorization: 'Bearer ' + a.tok, 'Content-Type': 'application/json' }, opt.headers || {});
    return fetch(SB_URL + '/rest/v1/' + path, opt).then(function (r) {
      if (!r.ok) throw new Error('http ' + r.status);
      return r.status === 204 ? null : r.text().then(function (t) { return t ? JSON.parse(t) : null; });
    });
  }
  var busy = false, again = false, timer = null;
  function queueSync() { clearTimeout(timer); timer = setTimeout(sync, 1200); }
  function differs(R) {
    var ks = {}; Object.keys(R).concat(Object.keys(M)).forEach(function (k) { ks[k] = 1; });
    return Object.keys(ks).some(function (k) { var a = R[k] || {}, b = M[k] || {}; return (a.tr || 0) !== (b.tr || 0) || (a.tb || 0) !== (b.tb || 0) || (a.r || '') !== (b.r || '') || (a.b || '') !== (b.b || ''); });
  }
  function sync() {
    var a = auth(); if (!a) return Promise.resolve(false);
    if (busy) { again = true; return Promise.resolve(false); }
    busy = true;
    return rest('progress?user_id=eq.' + a.uid + '&page=eq.' + PAGE + '&select=data').then(function (rows) {
      var exists = !!(rows && rows.length), R = (exists && rows[0].data && rows[0].data.m) || {};
      Object.keys(R).forEach(function (k) {
        var r = R[k] || {}, l = entry(k), n = { r: l.r, b: l.b, tr: l.tr, tb: l.tb }, ch = false;
        if ((r.tr || 0) > l.tr) { n.r = r.r || ''; n.tr = r.tr; ch = true; }
        if ((r.tb || 0) > l.tb) { n.b = r.b || ''; n.tb = r.tb; ch = true; }
        if (ch) { M[k] = n; persist(); emit(k, 'remote'); }
      });
      if (exists && !differs(R)) return true;
      var body = { data: { m: M }, updated_at: new Date().toISOString() };
      if (exists) return rest('progress?user_id=eq.' + a.uid + '&page=eq.' + PAGE, { method: 'PATCH', body: JSON.stringify(body), headers: { Prefer: 'return=minimal' } }).then(function () { return true; });
      body.user_id = a.uid; body.page = PAGE;
      return rest('progress', { method: 'POST', body: JSON.stringify(body), headers: { Prefer: 'return=minimal' } }).then(function () { return true; });
    }).catch(function () { return false; }).then(function (ok) {
      busy = false; if (again) { again = false; queueSync(); } return ok;
    });
  }
  /* try a few times after load (the sign-in token may take a moment), and whenever the tab comes back */
  [1500, 5000, 12000].forEach(function (ms) { setTimeout(sync, ms); });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') sync(); });
  window.addEventListener('online', sync);

  window.SGB = { key: key, get: get, has: has, all: all, set: set, seed: seed, onChange: onChange, picker: picker, refresh: paint, sync: sync };
})();
