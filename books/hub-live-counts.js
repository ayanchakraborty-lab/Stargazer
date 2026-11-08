/* hub-live-counts.js: keeps the numbers on the Books home page in step with the real book pages.
   Put this file in the same folder as home.html / book-status.js (the books folder).

   How it works
     1. Every number on a card is wrapped like <span data-live="ru.total">121</span>. The 121 you type there is only the
        fallback shown if nothing can be read.
     2. On load (and again when you return to the tab, and every couple of minutes) the home page fetches each book page,
        counts the books in its data, and swaps the new numbers in. Nothing to edit when you add or remove a book.
     3. The Library is counted straight from your Supabase "library_books" table, so it follows the live database.
     4. Last good numbers are remembered in this browser, so the page paints instantly and survives a failed fetch.
*/
(function (root) {
  'use strict';

  var SB_URL = 'https://daqxabswnrhqpjyfdbwx.supabase.co';
  var SB_KEY = 'sb_publishable_ClSIuk3B4361beM8n9T7iQ_PIEM-D4j';
  var AUTH_KEY = 'sb-daqxabswnrhqpjyfdbwx-auth-token';
  var CACHE = 'sg_hub_counts_v1';
  var EVERY = 120000;                    /* background refresh while the tab is visible */

  /* ---------- counting helpers ---------- */
  function between(s, a, b) {
    var i = s.indexOf(a); if (i < 0) return '';
    var j = b ? s.indexOf(b, i + a.length) : -1;
    return s.slice(i, j < 0 ? s.length : j);
  }
  function rows(re, s) { return s.match(re) || []; }
  function unq(t) { try { return JSON.parse('"' + t + '"'); } catch (e) { return t; } }
  function pos(n) { return typeof n === 'number' && isFinite(n) && n > 0; }

  /* ---------- one reader per page: page source text in, numbers out (null = could not read it) ---------- */
  var EXTRACT = {

    /* BOOKS.html: originalBooks (the sequence) + companionBooks */
    'reading-universe': function (s) {
      var seq = rows(/\{\s*id:'o\d+'/g, between(s, 'const originalBooks', 'const companionBooks')).length;
      var comp = rows(/\{\s*id:'c\d+'/g, between(s, 'const companionBooks', 'const booksData')).length;
      if (!pos(seq)) return null;
      return { 'ru.total': seq + comp, 'ru.seq': seq, 'ru.comp': comp };
    },

    /* intellectual_books.html: objects with fmt:FIC / NON / "science", plus the F / N / S rows pushed in later */
    'two-paths': function (s) {
      var fic = rows(/\{id:"[^"]+",fmt:(?:FIC|"fiction")/g, s).length + rows(/^\s*\["F","[^"]+",/gm, s).length;
      var non = rows(/\{id:"[^"]+",fmt:(?:NON|"nonfiction")/g, s).length + rows(/^\s*\["N","[^"]+",/gm, s).length;
      var sci = rows(/\{id:"[^"]+",fmt:"science"/g, s).length + rows(/^\s*\["S","[^"]+",/gm, s).length;
      var total = fic + non + sci;
      if (!pos(total)) return null;
      return { 'up.total': total, 'up.fic': fic, 'up.non': non, 'up.sci': sci };
    },

    /* what-if-lab.html: var B = novels ([title, author, year, "g|y|r", ...]), var C = mysteries */
    'what-if-lab': function (s) {
      var novels = rows(/^\["(?:[^"\\]|\\.)*","(?:[^"\\]|\\.)*",\d+,"[gyr]"/gm, between(s, '\nvar B=[', '\nvar X='));
      var myst = rows(/^\["(?:[^"\\]|\\.)*",\d+,"/gm, between(s, '\nvar C=[', '\nvar '));
      if (!pos(novels.length)) return null;
      var hits = novels.filter(function (r) { return /,"g"$/.test(r); })
        .map(function (r) { var m = /^\["((?:[^"\\]|\\.)*)"/.exec(r); return unq(m[1]); });
      var o = { 'wi.total': novels.length, 'wi.hits': hits.length, 'wi.rest': novels.length - hits.length, 'wi.hitNames': hits };
      if (pos(myst.length)) o['wi.myst'] = myst.length;
      return o;
    },

    /* lotr-escape-books.html: var B = [{id:"...", ...}, ...] */
    'lotr-escape': function (s) {
      var n = rows(/^\{id:"/gm, between(s, '\nvar B=[', '\n];')).length;
      return pos(n) ? { 'lo.total': n } : null;
    },

    /* maths/books: const booksData=[ {t:"title", a:"author", ...}, ... ] */
    'maths-books': function (s) {
      var n = rows(/^\{t:"/gm, between(s, 'const booksData=[', '\n];')).length;
      return pos(n) ? { 'ma.total': n } : null;
    },

    /* stats/books: const BOOKS = [ { slug:'...', title:'...', ... }, ... ] */
    'stats-books': function (s) {
      var n = rows(/^\s*slug:'/gm, between(s, 'const BOOKS = [', '\n];')).length;
      return pos(n) ? { 'st.total': n } : null;
    }
  };

  /* ---------- the Library comes from Supabase, not from the page text ---------- */
  function authToken() {
    try {
      var a = JSON.parse(localStorage.getItem(AUTH_KEY) || 'null');
      if (a && a.access_token && (!a.expires_at || a.expires_at * 1000 > Date.now() + 5000)) return a.access_token;
    } catch (e) { }
    return SB_KEY;
  }
  function libraryCount() {
    return fetch(SB_URL + '/rest/v1/library_books?select=id', {
      method: 'HEAD',
      headers: { apikey: SB_KEY, Authorization: 'Bearer ' + authToken(), Prefer: 'count=exact', Range: '0-0' }
    }).then(function (r) {
      var m = /\/(\d+)$/.exec(r.headers.get('content-range') || '');
      var n = m ? +m[1] : 0;
      return r.ok && pos(n) ? { 'li.total': n } : null;
    });
  }

  /* ---------- exported for testing ---------- */
  root.SGLive = { extract: EXTRACT };
  if (typeof document === 'undefined') return;

  /* ---------- page wiring ---------- */
  var vals = {};            /* fresh numbers, newest wins */
  var busy = false, last = 0;

  function qsa(sel) { return [].slice.call(document.querySelectorAll(sel)); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function loadCache() {
    try { var c = JSON.parse(localStorage.getItem(CACHE) || 'null'); if (c && c.v) vals = c.v; } catch (e) { }
  }
  function saveCache() { try { localStorage.setItem(CACHE, JSON.stringify({ t: Date.now(), v: vals })); } catch (e) { } }

  function joinNames(names) {
    var f = document.createDocumentFragment();
    names.forEach(function (n, i) {
      if (i > 0) f.appendChild(document.createTextNode(i === names.length - 1 ? ' and ' : ', '));
      var em = document.createElement('em'); em.textContent = n; f.appendChild(em);
    });
    return f;
  }

  function render() {
    qsa('[data-live]').forEach(function (el) {
      var v = vals[el.getAttribute('data-live')]; if (!pos(v)) return;
      v = String(v); if (el.textContent !== v) el.textContent = v;
    });
    /* totals copied into hover titles: title="... {ru.total} books ..." */
    qsa('[data-title-tpl]').forEach(function (el) {
      var miss = false;
      var t = el.getAttribute('data-title-tpl').replace(/\{([\w.]+)\}/g, function (m, k) { if (!pos(vals[k])) miss = true; return vals[k]; });
      if (!miss) el.setAttribute('title', t);
    });
    /* name lists, e.g. which novels are direct hits */
    qsa('[data-live-names]').forEach(function (el) {
      var a = vals[el.getAttribute('data-live-names')];
      if (!a || !a.length) return;
      var f = joinNames(a);
      el.textContent = ''; el.appendChild(f);
    });
    /* counts that come from the home page itself */
    var sheets = qsa('.sheet');
    qsa('[data-live-lists]').forEach(function (el) { el.textContent = sheets.length; });
    sheets.forEach(function (sh, i) {
      var e = sh.querySelector('.eyebrow'); if (e) e.textContent = pad(i + 1) + ' / ' + pad(sheets.length);
    });
  }

  function readPage(sh) {
    var a = sh.querySelector('a.go'), fn = EXTRACT[sh.id];
    if (!a || !fn) return Promise.resolve(null);
    return fetch(a.getAttribute('href'), { cache: 'no-cache', credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.text() : null; })
      .then(function (t) { return t ? fn(t) : null; })
      .catch(function () { return null; });
  }

  function refresh(force) {
    if (busy || (!force && Date.now() - last < 30000)) return;
    busy = true; last = Date.now();
    var jobs = qsa('.sheet').map(readPage);
    jobs.push(libraryCount().catch(function () { return null; }));
    Promise.all(jobs).then(function (res) {
      res.forEach(function (o) { if (o) for (var k in o) vals[k] = o[k]; });
      saveCache(); render();
    }).then(function () { busy = false; }, function () { busy = false; });
  }

  loadCache(); render();
  refresh(true);

  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') refresh(); });
  window.addEventListener('focus', function () { refresh(); });
  window.addEventListener('online', function () { refresh(true); });
  setInterval(function () { if (document.visibilityState === 'visible') refresh(true); }, EVERY);

  root.SGLive.refresh = function () { refresh(true); };
  root.SGLive.values = function () { return JSON.parse(JSON.stringify(vals)); };
})(typeof window !== 'undefined' ? window : this);
