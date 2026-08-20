/* ═══════════════════════════════════════════════════════════════
   MATHEMATICS SECTION — shared nav bar + hamburger menu
   ═══════════════════════════════════════════════════════════════
   Single source of truth for the section list. Add a new page here
   once, and it shows up in the hamburger menu — and can become the
   nav bar's title — on every page automatically.

   Usage — put this exactly where the old <nav>/#hamburger-menu
   markup used to live (right after the auth-topbar / admin-modal
   block, before the search modal):

     <script src="nav.js"></script>
     <script>renderNav('careers');</script>

   The argument is the page's own key (matches the filename without
   .html). renderNav() writes the nav bar + hamburger menu markup
   directly at that point in the document via document.write, so it
   must be called from a plain synchronous <script> (not async/defer)
   placed inline in the body — which is exactly the pattern above.
   ═══════════════════════════════════════════════════════════════ */
(function(){
  var SECTIONS = [
    { page:'home',         href:'home.html',         icon:'🏠', label:'Home' },
    { page:'books',        href:'books.html',        icon:'📚', label:'Books' },
    { page:'puzzles',      href:'puzzles.html',      icon:'🧩', label:'Puzzles', divider:true },
    { page:'precollege',   href:'precollege.html',   icon:'📐', label:'Pre-College' },
    { page:'olympiad',     href:'olympiad.html',     icon:'🏆', label:'Olympiad' },
    { page:'undergrad',    href:'undergrad.html',    icon:'🎓', label:'Undergrad' },
    { page:'graduate',     href:'graduate.html',     icon:'🔬', label:'Graduate', divider:true },
    { page:'research',     href:'research.html',     icon:'⚡', label:'Research' },
    { page:'openproblems', href:'openproblems.html', icon:'❓', label:'Open Problems' },
    { page:'careers',      href:'careers.html',      icon:'💼', label:'Careers', divider:true },
    { page:'studyguide',   href:'studyguide.html',   icon:'📖', label:'Study Guide' },
    { page:'facts',        href:'facts.html',        icon:'✨', label:'Math Facts' },
    { page:'universities', href:'universities.html', icon:'🎓', label:'India' },
    { page:'comments',     href:'comments.html',     icon:'💬', label:'Comments' }
  ];

  function menuHTML(active){
    var html = '';
    SECTIONS.forEach(function(s){
      var cls = 'hm-item' + (s.page === active ? ' active' : '');
      html += '<button class="' + cls + '" data-page="' + s.page + '" '
            + 'onclick="location.href=\'' + s.href + '\'">' + s.icon + ' ' + s.label + '</button>';
      if(s.divider) html += '<div class="hm-divider"></div>';
    });
    return html;
  }

  window.renderNav = function(pageKey){
    var active = pageKey || 'home';
    var cur = null;
    for(var i=0; i<SECTIONS.length; i++){
      if(SECTIONS[i].page === active){ cur = SECTIONS[i]; break; }
    }
    var label = cur ? cur.label : '';

    var html =
      '<!-- ═══════════════════════════════════════ NAV ═══════════════ -->' +
      '<nav id="nav">' +
        '<span class="nav-brand" onclick="location.href=\'home.html\'" style="cursor:pointer;user-select:none">∑ Mathematics</span>' +
        '<span class="nav-cur-section" id="nav-cur-lbl">' + label + '</span>' +
        '<button class="nav-search-btn" onclick="openSearch()" title="Search (/)">🔍 Search</button>' +
        '<button id="hamburger-btn" onclick="toggleHamburger()" title="Sections" aria-label="Menu">☰</button>' +
      '</nav>' +
      '<!-- ═══════════════════════════════════════ HAMBURGER MENU ════ -->' +
      '<div id="hamburger-menu" onclick="event.stopPropagation()">' + menuHTML(active) + '</div>';

    document.write(html);
  };
})();
