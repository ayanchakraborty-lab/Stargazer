/* ═══════════════════════════════════════════════════════════════
   NAV.JS — shared nav bar + hamburger menu for the Statistics section
   Single source of truth for the page list. Add a page once, here,
   and it shows up in the menu on every page automatically.
   ═══════════════════════════════════════════════════════════════ */
(function(){

  var PAGES = [
    {id:'home',              icon:'🏠', label:'Home',                href:'home.html'},
    {id:'books',              icon:'📚', label:'Books',               href:'books.html'},
    {id:'puzzles',            icon:'🧩', label:'Puzzles',             href:'puzzles.html'},
    {id:'undergrad-problems', icon:'🎓', label:'Undergrad Problems',  href:'undergrad-problems.html'},
    {id:'school',             icon:'🏫', label:'School',              href:'school.html'},
    '---',
    {id:'inference',          icon:'🔬', label:'Inference',           href:'inference.html'},
    {id:'distributions',      icon:'📊', label:'Distributions',       href:'distributions.html'},
    {id:'bayesian',           icon:'∫',  label:'Bayesian',            href:'bayesian.html'},
    {id:'openproblems',       icon:'❓', label:'Open Problems',       href:'openproblems.html'},
    {id:'research',           icon:'🔭', label:'Research',            href:'research.html'},
    '---',
    {id:'careers',            icon:'💼', label:'Careers',             href:'careers.html'},
    {id:'studyguide',         icon:'🗺️', label:'Study Guide',         href:'studyguide.html'},
    {id:'facts',              icon:'✨', label:'Fun Facts',           href:'facts.html'},
    {id:'tools',              icon:'🛠️', label:'Tools',               href:'tools.html'},
    '---',
    {id:'calc',               icon:'🔢', label:'Calculator',          href:'calc.html'},
    {id:'formulas',           icon:'📋', label:'Formulas',            href:'formulas.html'},
    {id:'history',            icon:'⏳', label:'History',             href:'history.html'},
    {id:'comments',           icon:'💬', label:'Discuss',             href:'comments.html'}
  ];

  function esc(s){
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function buildHTML(activeId){
    var active = null;
    for (var i=0;i<PAGES.length;i++){
      if (PAGES[i] !== '---' && PAGES[i].id === activeId){ active = PAGES[i]; break; }
    }
    var label = active ? active.label : '';

    var items = PAGES.map(function(p){
      if (p === '---') return '  <div class="hm-divider"></div>';
      var cls = 'hm-item' + (p.id === activeId ? ' active' : '');
      return '  <button class="'+cls+'" data-page="'+p.id+'" onclick="location.href=\''+p.href+'\'">'+p.icon+' '+esc(p.label)+'</button>';
    }).join('\n');

    return ''
      + '<!-- ═══ NAV ═══ -->\n'
      + '<nav id="nav">\n'
      + '  <span class="nav-brand" onclick="location.href=\'home.html\'" style="cursor:pointer;user-select:none">∑ Statistics</span>\n'
      + '  <span class="nav-cur-section" id="nav-cur-lbl">'+esc(label)+'</span>\n'
      + '  <button class="nav-search-btn" onclick="openSearch()" title="Search (/)" aria-label="Search">🔍</button>\n'
      + '  <button id="hamburger-btn" onclick="toggleHamburger()" title="Sections" aria-label="Menu">☰</button>\n'
      + '</nav>\n\n'
      + '<!-- ═══ HAMBURGER MENU ═══ -->\n'
      + '<div id="hamburger-menu" onclick="event.stopPropagation()">\n'
      + items + '\n'
      + '</div>';
  }

  // Renders the nav+hamburger markup in place of the <script> tag that calls it.
  function renderNav(activeId){
    var host = document.currentScript;
    var html = buildHTML(activeId);
    if (host && host.insertAdjacentHTML){
      host.insertAdjacentHTML('beforebegin', html);
    } else {
      // Fallback: no currentScript support — drop at top of body
      document.body.insertAdjacentHTML('afterbegin', html);
    }
  }

  function toggleHamburger(){
    var menu = document.getElementById('hamburger-menu');
    var btn  = document.getElementById('hamburger-btn');
    if (!menu) return;
    var open = menu.classList.toggle('open');
    btn.classList.toggle('open', open);
  }

  // Close the menu when clicking outside it (registered once, works for every page)
  document.addEventListener('click', function(e){
    var menu = document.getElementById('hamburger-menu');
    var btn  = document.getElementById('hamburger-btn');
    if (!menu || !menu.classList.contains('open')) return;
    if (!menu.contains(e.target) && e.target !== btn && !btn.contains(e.target)){
      menu.classList.remove('open');
      btn.classList.remove('open');
    }
  });

  window.renderNav = renderNav;
  window.toggleHamburger = toggleHamburger;

})();
