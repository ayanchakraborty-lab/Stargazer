/* ═══════════════════════════════════════════════════════════════
   section-nav.js — one engine for the nav bar + hamburger menu used
   by the Mathematics and Statistics sections.
   Each section's nav.js only registers its own page list:
     SectionNav.register({ brand, search:{text|icon}, burger, pages:[…] });
   and pages call  renderNav('page-id')  exactly as before.
   Pages: {id|page, href, icon, label, divider?}  or the string '---' for a divider.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var cfg = null;

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function idOf(p) { return p.id || p.page; }

  function build(activeId) {
    var label = '', items = '';
    cfg.pages.forEach(function (p) {
      if (p === '---') { items += '<div class="hm-divider"></div>'; return; }
      var on = idOf(p) === activeId;
      if (on) label = p.label;
      items += '<button class="hm-item' + (on ? ' active' : '') + '" data-page="' + idOf(p) + '" ' +
               'onclick="location.href=\'' + p.href + '\'">' + p.icon + ' ' + esc(p.label) + '</button>';
      if (p.divider) items += '<div class="hm-divider"></div>';
    });
    var search = cfg.search.text
      ? '<button class="nav-search-btn" onclick="openSearch()" title="Search (/)">' + cfg.search.text + '</button>'
      : '<button class="nav-search-btn" onclick="openSearch()" title="Search (/)" aria-label="Search">' + cfg.search.icon + '</button>';
    return '<nav id="nav">' +
             '<span class="nav-brand" onclick="location.href=\'home\'" style="cursor:pointer;user-select:none">' + cfg.brand + '</span>' +
             '<span class="nav-cur-section" id="nav-cur-lbl">' + esc(label) + '</span>' +
             search +
             '<button id="hamburger-btn" onclick="toggleHamburger()" title="Sections" aria-label="Menu">' + cfg.burger + '</button>' +
           '</nav>' +
           '<div id="hamburger-menu" onclick="event.stopPropagation()">' + items + '</div>';
  }

  /* writes the markup where the calling <script> sits */
  function renderNav(activeId) {
    if (!cfg) return;
    var html = build(activeId || 'home'), host = document.currentScript;
    if (host && host.insertAdjacentHTML) host.insertAdjacentHTML('beforebegin', html);
    else document.body.insertAdjacentHTML('afterbegin', html);
  }

  function toggleHamburger() {
    var menu = document.getElementById('hamburger-menu'), btn = document.getElementById('hamburger-btn');
    if (!menu) return;
    var open = menu.classList.toggle('open');
    if (btn) btn.classList.toggle('open', open);
  }

  /* close the menu when clicking anywhere outside it */
  document.addEventListener('click', function (e) {
    var menu = document.getElementById('hamburger-menu'), btn = document.getElementById('hamburger-btn');
    if (!menu || !menu.classList.contains('open')) return;
    if (!menu.contains(e.target) && e.target !== btn && !(btn && btn.contains(e.target))) {
      menu.classList.remove('open');
      if (btn) btn.classList.remove('open');
    }
  });

  window.SectionNav = { register: function (c) { cfg = c; } };
  window.renderNav = renderNav;
  if (typeof window.toggleHamburger !== 'function') window.toggleHamburger = toggleHamburger;
})();
