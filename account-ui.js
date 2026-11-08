/* ═══════════════════════════════════════════════════════════════════
   account-ui.js — Stargazer account chip · menu drawer · settings modal
   Loaded automatically by shared.js on every page, so the signed-in
   name, the site menu and Account settings look and work the same
   everywhere. shared.js calls sgAccount.paint(user) after each auth
   change; pages can listen for the 'sgaccount' event on document.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.sgAccount) return;
  var d = document, root = d.documentElement, built = false, scrim, panel, card, lastFocus = null, user = null;

  function $(id) { return d.getElementById(id); }
  function el(tag, cls, txt) { var e = d.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }

  var SITE = [
    ['Stories & Screens', [['Books', '/books/home', '#d4952a'], ['Anime', '/ANIME', '#e87fd4'], ['Movies', '/MOVIES', '#e05555']]],
    ['Mind & Number',     [['Mathematics', '/maths/home', '#2dd4bf'], ['Chess', '/chess/home', '#60a5fa'], ['Statistics', '/stats/home', '#4ade80']]],
    ['Tongues',           [['German', '/german/home', '#fb923c'], ['Japanese', '/japanese/home', '#fb7185']]],
    ['The Unseen',        [['Tantra', '/TANTRA', '#9b72cf'], ['Private Corner', '/PERSONAL', '#94a3b8']]]
  ];

  var CSS = ".sg-av{display:inline-grid;place-items:center;vertical-align:middle;flex:none;width:1.7em;height:1.7em;margin-right:.55em;border-radius:50%;font:600 .95em/1 'Cormorant Garamond',Georgia,serif;color:#140e02;text-transform:uppercase;background:linear-gradient(135deg,#f0d090,#c9a84c);box-shadow:0 0 12px rgba(201,168,76,.35)}\n.sg-nm{vertical-align:middle}\n.sg-chip{cursor:pointer}\n.sg-chip:focus-visible{outline:2px solid rgba(201,168,76,.9);outline-offset:3px}\nhtml.sg-open{overflow:hidden}\n.sg-scrim{position:fixed;inset:0;z-index:99990;background:rgba(2,2,6,.66);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);opacity:0;visibility:hidden;transition:opacity .3s,visibility 0s .3s}\n.sg-drawer{position:fixed;top:0;right:0;bottom:0;z-index:99995;width:min(88vw,380px);padding:18px 22px 30px;overflow-y:auto;text-align:left;line-height:1.5;color:#f6f3ea;font-family:'DM Sans',system-ui,-apple-system,'Segoe UI',sans-serif;background:linear-gradient(180deg,#0a0a14,#06060b);border-left:1px solid rgba(201,168,76,.22);box-shadow:-30px 0 80px rgba(0,0,0,.6);transform:translateX(104%);visibility:hidden;transition:transform .45s cubic-bezier(.22,.8,.2,1),visibility 0s .45s}\n.sg-drawer *{box-sizing:border-box}\n.sg-open .sg-scrim{opacity:1;visibility:visible;transition:opacity .3s}\n.sg-open .sg-drawer{transform:none;visibility:visible;transition:transform .45s cubic-bezier(.22,.8,.2,1)}\n.sg-drawer ul{list-style:none;margin:0;padding:0}\n.sg-drawer p{margin:0}\n.sg-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}\n.sg-brand{display:inline-flex;align-items:baseline;gap:10px;font:500 1.55rem/1 'Cormorant Garamond',Georgia,serif;letter-spacing:.07em;color:#f6f3ea}\n.sg-brand i{font-style:normal;font-size:.95rem;color:#c9a84c;text-shadow:0 0 14px rgba(201,168,76,.75)}\n.sg-drawer .sg-x{width:40px;height:40px;display:grid;place-items:center;padding:0;cursor:pointer;color:rgba(231,232,246,.76);background:transparent;border:1px solid rgba(255,255,255,.09);border-radius:50%}\n.sg-x svg{width:16px;height:16px}\n.sg-card{margin:10px 0 2px;padding:14px;border-radius:14px;border:1px solid rgba(201,168,76,.22);background:linear-gradient(160deg,rgba(201,168,76,.1),rgba(255,255,255,.02))}\n.sg-top{display:flex;align-items:center;gap:14px;min-width:0}\n.sg-drawer .sg-av.lg{width:48px;height:48px;margin:0;font-size:1.45rem}\n.sg-text{min-width:0;display:grid;gap:3px}\n.sg-label{font:400 .6rem/1 'Space Mono',ui-monospace,Menlo,monospace;letter-spacing:.22em;text-transform:uppercase;color:rgba(201,168,76,.9)}\n.sg-name{font:500 1.4rem/1.15 'Cormorant Garamond',Georgia,serif;color:#f6f3ea;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n.sg-mail{font-size:.8rem;color:rgba(231,232,246,.58);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n.sg-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}\n.sg-drawer .sg-btn{display:block;padding:10px 12px;text-align:center;text-decoration:none;font:500 .84rem/1 'DM Sans',system-ui,sans-serif;letter-spacing:0;text-transform:none;color:rgba(231,232,246,.76);cursor:pointer;border-radius:10px;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.04);transition:color .2s,border-color .2s,background-color .2s}\n.sg-drawer .sg-btn:hover{color:#f0d090;border-color:rgba(201,168,76,.5);background:rgba(201,168,76,.1)}\n.sg-drawer .sg-signin{margin-top:14px}\n.sg-q{margin:22px 0 4px!important;padding:0 8px;font:italic 500 1.12rem 'Cormorant Garamond',Georgia,serif;color:rgba(231,232,246,.58)}\n.sg-home{margin-top:14px!important}\n.sg-drawer li a{display:flex;align-items:center;gap:14px;padding:11px 8px;border-radius:10px;font-size:1.02rem;color:#f6f3ea;text-decoration:none}\n.sg-drawer li a:hover{background:rgba(255,255,255,.05)}\n.sg-drawer li a[aria-current=\"page\"]{background:rgba(201,168,76,.1);color:#f0d090}\n.sg-drawer li i{flex:none;width:8px;height:8px;border-radius:50%;background:var(--c);box-shadow:0 0 10px var(--c)}\n.sg-foot{margin-top:26px;padding-top:16px;border-top:1px solid rgba(255,255,255,.09);display:grid;gap:2px}\n.sg-foot a{padding:10px 8px;font-size:.95rem;color:#f0d090;text-decoration:none}\n.sg-drawer :focus-visible,.sg-chip:focus-visible{outline:2px solid rgba(201,168,76,.9);outline-offset:3px;border-radius:6px}\n@media (prefers-reduced-motion:reduce){.sg-scrim,.sg-drawer{transition-duration:.01ms!important}}";
  var MODAL_CSS = "#accountModal {\n  display: none;\n  position: fixed;\n  inset: 0;\n  z-index: 99999;\n  align-items: center;\n  justify-content: center;\n  padding: 20px;\n}\n#accountModal.open { display: flex; }\n\n.acct-card {\n  position: relative;\n  z-index: 1;\n  background: #07070f;\n  border: 1px solid rgba(201,168,76,0.22);\n  border-radius: 18px;\n  padding: 36px 32px 32px;\n  width: 100%;\n  max-width: 390px;\n  box-shadow:\n    0 0 90px rgba(0,0,0,0.9),\n    0 0 50px rgba(201,168,76,0.04),\n    inset 0 1px 0 rgba(201,168,76,0.07);\n  animation: acct-in 0.3s cubic-bezier(0.34,1.56,0.64,1) both;\n}\n@keyframes acct-in {\n  from { opacity: 0; transform: translateY(18px) scale(0.97); }\n  to   { opacity: 1; transform: translateY(0)     scale(1);   }\n}\n.acct-divider {\n  height: 1px;\n  margin: 22px 0;\n  background: linear-gradient(90deg, transparent, rgba(201,168,76,0.25), transparent);\n}\n.acct-divider.red {\n  background: linear-gradient(90deg, transparent, rgba(255,80,80,0.22), transparent);\n}\n.acct-label {\n  display: block;\n  font-family: 'Space Mono', monospace;\n  font-size: 0.52rem;\n  letter-spacing: 0.22em;\n  text-transform: uppercase;\n  color: rgba(255,255,255,0.35);\n  margin-bottom: 9px;\n}\n.acct-input {\n  width: 100%;\n  background: rgba(255,255,255,0.03);\n  border: 1px solid rgba(201,168,76,0.18);\n  border-radius: 8px;\n  padding: 0.58rem 0.9rem;\n  color: #fff;\n  font-family: 'DM Sans', sans-serif;\n  font-size: 0.88rem;\n  outline: none;\n  transition: border-color 0.2s, box-shadow 0.2s;\n  box-sizing: border-box;\n}\n.acct-input:focus {\n  border-color: rgba(201,168,76,0.48);\n  box-shadow: 0 0 14px rgba(201,168,76,0.07);\n}\n.acct-input.red-input {\n  border-color: rgba(255,80,80,0.18);\n  font-family: 'Space Mono', monospace;\n  font-size: 0.78rem;\n  letter-spacing: 0.1em;\n}\n.acct-input.red-input:focus {\n  border-color: rgba(255,80,80,0.45);\n  box-shadow: 0 0 14px rgba(255,60,60,0.07);\n}\n.acct-btn {\n  font-family: 'Space Mono', monospace;\n  font-size: 0.57rem;\n  letter-spacing: 0.13em;\n  text-transform: uppercase;\n  border-radius: 30px;\n  padding: 0.38rem 1.05rem;\n  cursor: pointer;\n  transition: all 0.2s;\n  border: 1px solid;\n}\n.acct-btn.gold {\n  color: rgba(201,168,76,0.82);\n  background: rgba(201,168,76,0.07);\n  border-color: rgba(201,168,76,0.26);\n}\n.acct-btn.gold:hover {\n  color: #f0d090;\n  background: rgba(201,168,76,0.15);\n  border-color: rgba(201,168,76,0.5);\n}\n.acct-btn.danger {\n  color: rgba(255,90,90,0.65);\n  background: rgba(255,50,50,0.05);\n  border-color: rgba(255,60,60,0.18);\n}\n.acct-btn.danger:hover {\n  color: rgba(255,115,115,0.95);\n  background: rgba(255,50,50,0.12);\n  border-color: rgba(255,60,60,0.35);\n}\n.acct-btn:disabled { opacity: 0.5; cursor: not-allowed; }\n.acct-msg {\n  font-size: 0.68rem;\n  margin-top: 7px;\n  min-height: 1rem;\n  font-family: 'Space Mono', monospace;\n  letter-spacing: 0.04em;\n}";
  var MODAL_HTML = "<div id=\"accountModal\" role=\"dialog\" aria-modal=\"true\" aria-label=\"Account settings\">\n  <div id=\"acctBg\" style=\"position:absolute;inset:0;background:rgba(0,0,0,0.8);backdrop-filter:blur(7px);\"></div>\n  <div class=\"acct-card\">\n\n    <!-- Header -->\n    <div style=\"display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;\">\n      <span style=\"font-family:'Space Mono',monospace;font-size:0.55rem;letter-spacing:0.26em;text-transform:uppercase;color:rgba(201,168,76,0.65);\">\u2726 account settings</span>\n      <button id=\"closeAcctBtn\" aria-label=\"Close\" style=\"background:none;border:none;color:rgba(255,255,255,0.32);font-size:1rem;cursor:pointer;padding:3px 7px;border-radius:4px;transition:color 0.2s;line-height:1;\" onmouseover=\"this.style.color='rgba(255,255,255,0.8)'\" onmouseout=\"this.style.color='rgba(255,255,255,0.32)'\">\u2715</button>\n    </div>\n\n    <div class=\"acct-divider\" style=\"margin-top:0;\"></div>\n\n    <!-- Change display name -->\n    <div>\n      <label class=\"acct-label\" for=\"acctNameInput\">display name</label>\n      <input id=\"acctNameInput\" class=\"acct-input\" type=\"text\" placeholder=\"enter a display name\" autocomplete=\"off\" />\n      <div id=\"acctNameMsg\" class=\"acct-msg\"></div>\n      <button class=\"acct-btn gold\" id=\"acctSaveNameBtn\" style=\"margin-top:8px;\" onclick=\"acctSaveName()\">save name</button>\n    </div>\n\n    <div class=\"acct-divider red\" style=\"margin-top:28px;\"></div>\n\n    <!-- Danger zone -->\n    <div>\n      <div style=\"font-family:'Space Mono',monospace;font-size:0.5rem;letter-spacing:0.2em;text-transform:uppercase;color:rgba(255,88,88,0.52);margin-bottom:9px;\">danger zone</div>\n      <p style=\"font-size:0.78rem;color:rgba(255,255,255,0.28);line-height:1.65;margin-bottom:14px;\">Permanently delete your account and all associated data. This action cannot be undone.</p>\n\n      <!-- Confirm block \u2014 hidden until user clicks Delete Account -->\n      <div id=\"acctDeleteConfirm\" style=\"display:none;margin-bottom:14px;\">\n        <p style=\"font-size:0.7rem;color:rgba(255,108,108,0.72);margin-bottom:8px;font-family:'Space Mono',monospace;letter-spacing:0.04em;\">Type <strong style=\"color:rgba(255,130,130,0.9);\">DELETE</strong> to confirm:</p>\n        <input id=\"acctDeleteInput\" class=\"acct-input red-input\" type=\"text\" placeholder=\"DELETE\" autocomplete=\"off\" />\n        <div id=\"acctDeleteMsg\" class=\"acct-msg\"></div>\n        <button class=\"acct-btn danger\" id=\"acctConfirmDeleteBtn\" style=\"margin-top:8px;\" onclick=\"acctConfirmDelete()\">confirm deletion</button>\n      </div>\n\n      <button class=\"acct-btn danger\" id=\"acctDeleteBtn\" onclick=\"acctShowDeleteConfirm()\">delete account</button>\n    </div>\n\n  </div>\n</div>";

  /* ── name helpers ── */
  function nameOf(u) {
    if (window.sgDisplayName) return window.sgDisplayName(u);
    var m = (u && u.user_metadata) || {};
    return String(m.display_name || m.full_name || m.name || '').trim() || 'Explorer';
  }
  function initial(n) { var c = Array.from(String(n).trim())[0]; return c ? c.toUpperCase() : '✦'; }
  function avatar(name, cls) { var a = el('span', 'sg-av' + (cls ? ' ' + cls : ''), initial(name)); a.setAttribute('aria-hidden', 'true'); return a; }

  /* ── drawer ── */
  function here(href) {
    var p = location.pathname.replace(/\/index\.html$/, '/').replace(/\.html$/, '').toLowerCase();
    var h = href.toLowerCase();
    if (h === '/') return p === '/';
    var dir = h.split('/').slice(0, -1).join('/');
    return p === h || (dir.length > 1 && p.indexOf(dir + '/') === 0);
  }
  function build() {
    if (built) return; built = true;
    scrim = el('div', 'sg-scrim');
    scrim.addEventListener('click', function () { setOpen(false); });

    panel = el('aside', 'sg-drawer'); panel.id = 'menuPanel'; panel.setAttribute('aria-label', 'Site menu');
    var head = el('div', 'sg-head');
    var brand = el('span', 'sg-brand'); brand.appendChild(el('i', '', '✦')); brand.lastChild.setAttribute('aria-hidden', 'true'); brand.appendChild(d.createTextNode('Stargazer'));
    var x = el('button', 'sg-x'); x.type = 'button'; x.setAttribute('aria-label', 'Close menu');
    x.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>';
    x.addEventListener('click', function () { setOpen(false); });
    head.appendChild(brand); head.appendChild(x);

    card = el('div', 'sg-card');
    var nav = el('nav'); nav.setAttribute('aria-label', 'All territories');
    var home = el('ul', 'sg-home'), li0 = el('li'), a0 = el('a', '', 'Home'); a0.href = '/'; a0.insertBefore(el('i', ''), a0.firstChild); a0.firstChild.style.setProperty('--c', '#c9a84c'); li0.appendChild(a0); home.appendChild(li0); nav.appendChild(home);
    SITE.forEach(function (q) {
      nav.appendChild(el('p', 'sg-q', q[0]));
      var ul = el('ul');
      q[1].forEach(function (t) {
        var li = el('li'), a = el('a', '', t[0]); a.href = t[1];
        var dot = el('i', ''); dot.style.setProperty('--c', t[2]); a.insertBefore(dot, a.firstChild);
        li.appendChild(a); ul.appendChild(li);
      });
      nav.appendChild(ul);
    });
    [].forEach.call(nav.querySelectorAll('a'), function (a) { if (here(a.getAttribute('href'))) a.setAttribute('aria-current', 'page'); });

    var foot = el('div', 'sg-foot'), ab = el('a', '', '✦ about stargazer'); ab.href = '/ABOUT';
    var ct = el('a', '', 'Contact the creator'); ct.href = 'mailto:' + ['ayan.chakraborty6174', 'gmail.com'].join('@');
    foot.appendChild(ab); foot.appendChild(ct);

    panel.appendChild(head); panel.appendChild(card); panel.appendChild(nav); panel.appendChild(foot);
    panel.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('a')) setOpen(false, true); });
    panel.addEventListener('keydown', trap);
    d.body.appendChild(scrim); d.body.appendChild(panel);
    paintCard();
  }
  function trap(e) {
    if (e.key !== 'Tab') return;
    var f = [].filter.call(panel.querySelectorAll('a[href],button'), function (n) { return n.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && d.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && d.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  function paintCard() {
    if (!card) return;
    card.textContent = '';
    if (user) {
      var name = nameOf(user), top = el('div', 'sg-top'), txt = el('div', 'sg-text');
      txt.appendChild(el('span', 'sg-label', 'Signed in')); txt.appendChild(el('span', 'sg-name', name));
      if (user.email) txt.appendChild(el('span', 'sg-mail', user.email));
      top.appendChild(avatar(name, 'lg')); top.appendChild(txt);
      var acts = el('div', 'sg-actions'), b1 = el('button', 'sg-btn', 'Account'), b2 = el('button', 'sg-btn', 'Sign out');
      b1.type = b2.type = 'button';
      b1.addEventListener('click', function () { setOpen(false, true); openSettings(); });
      b2.addEventListener('click', function () { setOpen(false, true); if (window.doSignOut) window.doSignOut(); });
      acts.appendChild(b1); acts.appendChild(b2);
      card.appendChild(top); card.appendChild(acts);
    } else {
      var top2 = el('div', 'sg-top'), txt2 = el('div', 'sg-text'), g = el('a', 'sg-btn sg-signin', 'Sign in');
      g.href = '/login';
      txt2.appendChild(el('span', 'sg-label', 'Welcome')); txt2.appendChild(el('span', 'sg-name', 'Stargazer'));
      txt2.appendChild(el('span', 'sg-mail', 'Sign in to save progress and comment'));
      top2.appendChild(txt2); card.appendChild(top2); card.appendChild(g);
    }
  }
  function setOpen(open, keepFocus) {
    build();
    if (open) lastFocus = lastFocus || d.activeElement;
    root.classList.toggle('sg-open', open);
    var mb = $('menuBtn');
    if (mb) { mb.setAttribute('aria-expanded', open ? 'true' : 'false'); mb.setAttribute('aria-label', open ? 'Close menu' : 'Open menu'); }
    if (open) { setTimeout(function () { var x = panel.querySelector('.sg-x'); if (x) x.focus({ preventScroll: true }); }, 30); }
    else { if (!keepFocus && lastFocus && lastFocus.focus) { try { lastFocus.focus({ preventScroll: true }); } catch (e) {} } lastFocus = null; }
  }
  function isOpen() { return root.classList.contains('sg-open'); }

  /* ── chip: the signed-in name shown in every page header ── */
  function paint(u) {
    user = u && !u.is_anonymous ? u : null;
    var name = user ? nameOf(user) : '', ue = $('userEmailDisplay') || $('navUserEmail');
    if (ue && user) {
      ue.textContent = '';
      ue.appendChild(avatar(name)); ue.appendChild(el('span', 'sg-nm', name));
      ue.classList.add('sg-chip'); ue.setAttribute('role', 'button'); ue.tabIndex = 0;
      ue.title = user.email ? name + ' · ' + user.email : name;
      ue.setAttribute('aria-label', 'Open menu — signed in as ' + name);
    }
    paintCard();
    d.dispatchEvent(new CustomEvent('sgaccount', { detail: { user: user, name: name } }));
  }
  d.addEventListener('click', function (e) {
    var c = e.target.closest && e.target.closest('.sg-chip');
    if (c) { lastFocus = c; setOpen(!isOpen()); }
  });
  d.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen()) { setOpen(false); return; }
    if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.matches && e.target.matches('.sg-chip')) { e.preventDefault(); lastFocus = e.target; setOpen(!isOpen()); }
  });

  /* ── settings modal (display name · delete account) ── */
  function openSettings() { if (window.acctOpenModal) window.acctOpenModal(); }
  function initModal() {
(function () {
  const modal = document.getElementById('accountModal');

  /* Get the Supabase client created in shared.js.
     IMPORTANT: shared.js must expose the client on window, e.g.:
       window.supabase = createClient(url, key);
     Using `const supabase = createClient(...)` in shared.js does NOT work —
     `const` in a classic <script> is block-scoped to that script and does NOT
     write to window. Meanwhile the CDN at the top of this page sets
     window.supabase to the library namespace { createClient, … } which has no
     .auth, so _sb() would return null and every action shows "not signed in". */
  function _sb() {
    try {
      /* shared.js stores the Supabase client as window.sb (see initShared, line 33).
         window.supabase is just the CDN library namespace and has no .auth. */
      if (window.sb && window.sb.auth && typeof window.sb.auth.getUser === 'function') return window.sb;
    } catch (e) {}
    return null;
  }

  /* Open & pre-fill ------------------------------------------------- */
  window.acctOpenModal = async function () {
    modal.classList.add('open');
    document.getElementById('acctNameMsg').textContent    = '';
    document.getElementById('acctDeleteMsg').textContent  = '';
    document.getElementById('acctDeleteInput').value      = '';
    document.getElementById('acctDeleteConfirm').style.display = 'none';
    document.getElementById('acctDeleteBtn').style.display     = '';

    const client = _sb();
    if (client) {
      const { data: { user } } = await client.auth.getUser();
      if (user) {
        const saved = user.user_metadata?.display_name
                   || user.user_metadata?.full_name
                   || '';
        document.getElementById('acctNameInput').value = saved;
      }
    }
    document.getElementById('acctNameInput').focus();
  };

  /* Close ------------------------------------------------------------ */
  function closeModal() { modal.classList.remove('open'); }
  document.getElementById('closeAcctBtn').addEventListener('click', closeModal);
  document.getElementById('acctBg').addEventListener('click', closeModal);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
  });

  /* Enter key shortcut on name field --------------------------------- */
  document.getElementById('acctNameInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') acctSaveName();
  });

  /* Save display name ------------------------------------------------ */
  window.acctSaveName = async function () {
    const name = document.getElementById('acctNameInput').value.trim();
    const msg  = document.getElementById('acctNameMsg');
    const btn  = document.getElementById('acctSaveNameBtn');

    if (!name) {
      msg.style.color = 'rgba(255,110,110,0.8)';
      msg.textContent = '✦ name cannot be empty';
      return;
    }
    const client = _sb();
    if (!client) {
      msg.style.color = 'rgba(255,110,110,0.8)';
      msg.textContent = '✦ not signed in';
      return;
    }

    btn.textContent = 'saving…';
    btn.disabled    = true;

    const { error } = await client.auth.updateUser({ data: { display_name: name } });

    btn.textContent = 'save name';
    btn.disabled    = false;

    if (error) {
      msg.style.color = 'rgba(255,110,110,0.8)';
      msg.textContent = '✦ ' + error.message;
    } else {
      msg.style.color = 'rgba(90,215,110,0.88)';
      msg.textContent = '✦ name updated';
      setTimeout(() => { msg.textContent = ''; }, 3000);
    }
  };

  /* Reveal the DELETE confirmation step ------------------------------ */
  window.acctShowDeleteConfirm = function () {
    document.getElementById('acctDeleteConfirm').style.display = 'block';
    document.getElementById('acctDeleteBtn').style.display     = 'none';
    document.getElementById('acctDeleteInput').focus();
  };

  /* Final account deletion ------------------------------------------- */
  window.acctConfirmDelete = async function () {
    const val = document.getElementById('acctDeleteInput').value.trim();
    const msg = document.getElementById('acctDeleteMsg');
    const btn = document.getElementById('acctConfirmDeleteBtn');

    if (val !== 'DELETE') {
      msg.style.color = 'rgba(255,110,110,0.8)';
      msg.textContent = '✦ type DELETE exactly';
      return;
    }
    const client = _sb();
    if (!client) {
      msg.style.color = 'rgba(255,110,110,0.8)';
      msg.textContent = '✦ not connected';
      return;
    }

    btn.textContent = 'deleting…';
    btn.disabled    = true;

    /*  Requires this stored procedure in your Supabase SQL editor:
        ──────────────────────────────────────────────────────────
        CREATE OR REPLACE FUNCTION public.delete_user()
        RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
        BEGIN
          DELETE FROM auth.users WHERE id = auth.uid();
        END;
        $$;
        ──────────────────────────────────────────────────────────  */
    const { error } = await client.rpc('delete_user');

    if (error) {
      btn.textContent = 'confirm deletion';
      btn.disabled    = false;
      msg.style.color = 'rgba(255,110,110,0.8)';
      msg.textContent = '✦ ' + error.message;
    } else {
      msg.style.color = 'rgba(90,215,110,0.88)';
      msg.textContent = '✦ account deleted — signing out…';
      setTimeout(async () => {
        try { await client.auth.signOut(); } catch (e) {}
        localStorage.clear();
        window.location.href = '/';
      }, 1800);
    }
  };
})();

  }

  function init() {
    var s = el('style'); s.id = 'sg-account-css'; s.textContent = CSS + MODAL_CSS; d.head.appendChild(s);
    if (!$('accountModal')) d.body.insertAdjacentHTML('beforeend', MODAL_HTML);
    initModal();
    build();
    paint(window.currentUser || null);
  }

  window.sgAccount = {
    paint: paint, open: function (o) { lastFocus = o || d.activeElement; setOpen(true); }, close: function () { setOpen(false); },
    toggle: function (o) { lastFocus = o || d.activeElement; setOpen(!isOpen()); }, settings: openSettings
  };
  if (d.body) init(); else d.addEventListener('DOMContentLoaded', init);
})();
