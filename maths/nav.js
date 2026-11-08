/* maths/nav.js — Mathematics section: page list for the nav bar and hamburger menu.
   Rendering is shared with the other section: see /section-nav.js (load it first). */
SectionNav.register({
  brand: '∑ Mathematics',
  search: { text: '🔍 Search' },
  burger: '☰',
  pages: [
    { page:'home',         href:'home',         icon:'🏠', label:'Home' },
    { page:'books',        href:'books',        icon:'📚', label:'Books' },
    { page:'puzzles',      href:'puzzles',      icon:'🧩', label:'Puzzles', divider:true },
    { page:'precollege',   href:'precollege',   icon:'📐', label:'Pre-College' },
    { page:'olympiad',     href:'olympiad',     icon:'🏆', label:'Olympiad' },
    { page:'undergrad',    href:'undergrad',    icon:'🎓', label:'Undergrad' },
    { page:'graduate',     href:'graduate',     icon:'🔬', label:'Graduate', divider:true },
    { page:'research',     href:'research',     icon:'⚡', label:'Research' },
    { page:'openproblems', href:'openproblems', icon:'❓', label:'Open Problems' },
    { page:'careers',      href:'careers',      icon:'💼', label:'Careers', divider:true },
    { page:'studyguide',   href:'studyguide',   icon:'📖', label:'Study Guide' },
    { page:'facts',        href:'facts',        icon:'✨', label:'Math Facts' },
    { page:'universities', href:'universities', icon:'🎓', label:'India' },
    { page:'comments',     href:'comments',     icon:'💬', label:'Comments' }
  ]
});
