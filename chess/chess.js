/* ============================================================
   chess.js — shared behaviour for every page in /chess/
   (extracted from the original single-file CHESS.html when the
   chronicle was split into home / history / puzzles / deepdive /
   more / afterword / comments)
   ============================================================ */

/* ======================================================
   SCROLL-DRIVEN FADE-IN OBSERVER
   ====================================================== */
(function() {
  const observer = new IntersectionObserver(
    (entries) => entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); }
    }),
    { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
  );
  document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));
})();

/* ======================================================
   HAMBURGER DROPDOWN NAVIGATION
   (single-panel version — the old History/Puzzles tab
   switcher is gone now that each lives on its own page)
   ====================================================== */
(function() {
  const btn      = document.getElementById('contentsBtn');
  const dropdown = document.getElementById('navDropdown');
  const overlay  = document.getElementById('navOverlay');
  if (!btn || !dropdown) return;

  function openNav() {
    btn.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
    dropdown.classList.add('open');
    overlay.classList.add('open');
  }

  function closeNav() {
    btn.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
    dropdown.classList.remove('open');
    overlay.classList.remove('open');
  }

  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    dropdown.classList.contains('open') ? closeNav() : openNav();
  });

  overlay.addEventListener('click', closeNav);

  // In-page anchors: close the dropdown, then smooth-scroll with a sticky-nav offset
  dropdown.querySelectorAll('#navMain a[href^="#"]').forEach(a => {
    a.addEventListener('click', function(e) {
      e.preventDefault();
      closeNav();
      const target = document.querySelector(this.getAttribute('href'));
      if (!target) return;
      const top = target.getBoundingClientRect().top + window.scrollY - 24;
      setTimeout(() => window.scrollTo({ top, behavior: 'smooth' }), 80);
    });
  });

  // Close the panel automatically when a cross-page link is used
  dropdown.querySelectorAll('#navMain a:not([href^="#"])').forEach(a => {
    a.addEventListener('click', closeNav);
  });

  // Highlight whichever in-page anchor matches current scroll position (if this page has any)
  const dropLinks = Array.from(document.querySelectorAll('#navMain a[href^="#"]'));
  const sections  = dropLinks.map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);

  function updateActive() {
    if (!sections.length) return;
    const scrollY = window.scrollY + 100;
    let activeIdx = -1;
    sections.forEach((s, i) => { if (s && s.offsetTop <= scrollY) activeIdx = i; });
    dropLinks.forEach((a, i) => {
      const isActive = i === activeIdx;
      a.style.color       = isActive ? 'var(--gold)' : '';
      a.style.borderColor = isActive ? 'rgba(212,175,55,0.5)' : '';
      a.style.background  = isActive ? 'rgba(212,175,55,0.07)' : '';
    });
  }
  window.addEventListener('scroll', updateActive, { passive: true });
  updateActive();

  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeNav(); });

  // ── Search / filter the nav list ──
  window.filterNav = function(query) {
    const q = query.toLowerCase().trim();
    const panel = document.getElementById('navMain');
    if (!panel) return;
    panel.querySelectorAll('a').forEach(a => {
      const txt = a.textContent.toLowerCase();
      a.style.display = (!q || txt.includes(q)) ? '' : 'none';
    });
    panel.querySelectorAll('.nav-drop-section').forEach(sec => {
      const visible = [...sec.querySelectorAll('a')].some(a => a.style.display !== 'none');
      sec.style.display = visible ? '' : 'none';
    });
  };
})();

/* ======================================================
   READING PROGRESS BAR + BACK TO TOP + PAGE DOWN
   ====================================================== */
(function() {
  const bar     = document.getElementById('read-progress');
  const btnUp   = document.getElementById('backToTop');
  const btnDown = document.getElementById('pageDown');

  function onScroll() {
    const scrolled = window.scrollY;
    const total    = document.documentElement.scrollHeight - window.innerHeight;
    if (bar)     bar.style.width = (total > 0 ? (scrolled / total) * 100 : 0) + '%';
    if (btnUp)   btnUp.classList.toggle('visible', scrolled > 400);
    if (btnDown) btnDown.classList.toggle('hidden-btn', total > 0 && scrolled >= total - 200);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

/* ======================================================
   PIECE HOVER EASTER EGG — HERO / FOOTER PIECE ROWS
   ====================================================== */
(function() {
  const rows = document.querySelectorAll('.hero-piece-row, .footer-piece-row');
  rows.forEach(row => {
    row.addEventListener('click', function() {
      const pieces = ['♔','♕','♖','♗','♘','♙','♚','♛','♜','♝','♞','♟'];
      const shuffled = [...pieces, ...pieces].sort(() => Math.random() - 0.5);
      this.textContent = shuffled.slice(0,8).join(' ');
    });
    row.style.cursor = 'pointer';
    row.title = 'Click to shuffle pieces!';
  });
})();

/* ======================================================
   COPY NOTATION — CLICK TO COPY (puzzles + deep dive)
   ====================================================== */
document.querySelectorAll('.notation-block').forEach(block => {
  block.style.cursor = 'pointer';
  block.title = 'Click to copy notation';
  block.addEventListener('click', function() {
    navigator.clipboard.writeText(this.innerText.replace('GAME NOTATION','').trim())
      .then(() => {
        const orig = this.style.borderColor;
        this.style.borderColor = 'var(--gold)';
        this.style.transition  = 'border-color 0.3s';
        setTimeout(() => { this.style.borderColor = orig; }, 800);
      }).catch(() => {});
  });
});

/* ======================================================
   SMOOTH SCROLL WITH OFFSET FOR IN-PAGE ANCHORS
   (skips links already handled by the dropdown nav above)
   ====================================================== */
document.querySelectorAll('a[href^="#"]:not(#navDropdown a)').forEach(a => {
  a.addEventListener('click', function(e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    const top = target.getBoundingClientRect().top + window.scrollY - 24;
    window.scrollTo({ top, behavior: 'smooth' });
  });
});

/* ======================================================
   KEYBOARD SHORTCUT: PRESS '?' FOR HELP OVERLAY
   ====================================================== */
document.addEventListener('keydown', function(e) {
  if (e.key === '?' || e.key === '/') {
    const existing = document.getElementById('help-overlay');
    if (existing) { existing.remove(); return; }
    const overlay = document.createElement('div');
    overlay.id = 'help-overlay';
    overlay.style.cssText = [
      'position:fixed','inset:0','z-index:9999',
      'background:rgba(0,0,0,0.88)',
      'display:flex','align-items:center','justify-content:center',
      'backdrop-filter:blur(8px)'
    ].join(';');
    overlay.innerHTML = `
      <div style="background:#111128;border:1px solid rgba(212,175,55,0.4);border-radius:8px;
                  padding:2.5rem 3rem;max-width:400px;text-align:center;font-family:'Cinzel',serif;">
        <div style="font-size:2.5rem;margin-bottom:1rem;">♟</div>
        <h3 style="color:var(--gold);font-size:1rem;letter-spacing:0.2em;margin-bottom:1.5rem;">KEYBOARD SHORTCUTS</h3>
        <div style="font-size:0.8rem;color:#a09880;line-height:2.2;text-align:left;">
          <div><kbd style="background:#0d0d1a;border:1px solid #333;padding:2px 6px;border-radius:3px;color:#d4af37;">?</kbd> &nbsp; Show / hide this help</div>
          <div><kbd style="background:#0d0d1a;border:1px solid #333;padding:2px 6px;border-radius:3px;color:#d4af37;">Home</kbd> &nbsp; Scroll to top</div>
          <div><kbd style="background:#0d0d1a;border:1px solid #333;padding:2px 6px;border-radius:3px;color:#d4af37;">End</kbd> &nbsp; Scroll to bottom</div>
          <div><kbd style="background:#0d0d1a;border:1px solid #333;padding:2px 6px;border-radius:3px;color:#d4af37;">Esc</kbd> &nbsp; Close overlay</div>
        </div>
        <button onclick="this.closest('#help-overlay').remove()"
                style="margin-top:1.5rem;background:rgba(212,175,55,0.15);border:1px solid rgba(212,175,55,0.4);
                       color:var(--gold);font-family:'Cinzel',serif;font-size:0.65rem;letter-spacing:0.2em;
                       padding:0.5rem 1.2rem;border-radius:4px;cursor:pointer;">CLOSE</button>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function(ev) { if (ev.target === overlay) overlay.remove(); });
  }
  if (e.key === 'Escape') { const o = document.getElementById('help-overlay'); if (o) o.remove(); }
});

/* ======================================================
   PROGRESS HOOKS (for shared.js auth) — no-op by default,
   each page sets window._pageKey before this file loads.
   ====================================================== */
window._getProgressData    = window._getProgressData    || function() { return {}; };
window._applyProgressData  = window._applyProgressData  || function(data) {};
window._afterProgressLoad  = window._afterProgressLoad  || function() {};
