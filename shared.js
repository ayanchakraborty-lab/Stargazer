/* ═══════════════════════════════════════════════════════════════════
   shared.js — Stargazer Supabase Bridge
   ───────────────────────────────────────────────────────────────────
   Covers: auth init · renderAuthUI · doSignOut · progress sync ·
           comments (load / submit / delete / rate-limit / abuse)

   Each page sets these BEFORE this file loads (inline script above):
     window._pageKey              — 'movies' | 'books' | 'anime' | 'tantra'
     window._getProgressData()    — returns serialisable progress object
     window._applyProgressData(d) — applies loaded data to page state

   Optional hooks:
     window._afterProgressLoad()  — called after sbLoadProgress succeeds
     window._afterRenderAuthUI(u) — called at end of every renderAuthUI
═══════════════════════════════════════════════════════════════════ */

/* ── CONFIG ─────────────────────────────────────────────────────── */
// folder that holds shared.js (the site root), so login redirects work from /stats/, /books/, ...
const _SB_ROOT      = (function(){ try { var u = document.currentScript && document.currentScript.src; return u ? u.replace(/[^\/]*$/, '') : ''; } catch(e) { return ''; } })();
const _SB_URL       = 'https://daqxabswnrhqpjyfdbwx.supabase.co';
const _SB_ANON      = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhcXhhYnN3bnJocXBqeWZkYnd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1ODczMDMsImV4cCI6MjA5NTE2MzMwM30.NqHPJZkDsawSJRSjDMNS4-c5KZDxTNxWBoMF_a6bSuc';
const _ADMIN_EMAIL  = 'ayanchakrabortyall@gmail.com';
const _ADMIN_EMAILS = ['ayanchakrabortyall@gmail.com','officialayanimp@gmail.com','duolingo.learn1024@gmail.com'];

/* ── STATE ──────────────────────────────────────────────────────── */
let sb              = null;
let currentUser     = null;
let _sbSaveTimer    = null;
let _sbSaving       = false;
let _sbPendingSave  = false;

/* ── SUPABASE INIT ──────────────────────────────────────────────── */
(async function initShared() {
  try {
    sb = supabase.createClient(_SB_URL, _SB_ANON);
    window.sb = sb;
  } catch(e) {
    console.error('Supabase init failed:', e);
    renderAuthUI();
    return;
  }

  /* Check for an existing session */
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (session?.user) {
      currentUser = window.currentUser = session.user;
      await sbLoadProgress();
      await sbLoadDarkMode();
    }
  } catch(e) { console.warn('Session check failed:', e); }

  renderAuthUI();
  loadComments();

  /* PKCE / mobile fallback — session can arrive ~1 s late */
  setTimeout(async () => {
    if (!currentUser && sb) {
      try {
        const { data: { session } } = await sb.auth.getSession();
        if (session?.user) {
          currentUser = window.currentUser = session.user;
          renderAuthUI();
          await sbLoadProgress();
          await sbLoadDarkMode();
          loadComments();
        }
      } catch(e) {}
    }
  }, 1200);

  /* React to sign-in / sign-out events */
  sb.auth.onAuthStateChange(async (event, session) => {
    currentUser = window.currentUser = session?.user || null;
    renderAuthUI();
    /* Backward-compat hook used by TANTRA's old progress system */
    if (typeof window._onSyncUserChange === 'function') window._onSyncUserChange(currentUser);
    if (event === 'SIGNED_IN') {
      await sbLoadProgress();
      await sbLoadDarkMode();
    }
    loadComments();
  });
})();

/* ── DISPLAY NAME ───────────────────────────────────────────────── */
/* display_name (Account settings) → full_name / name (Google) → tidied e-mail name.
   Never the raw e-mail address — it is shown in headers and published with comments. */
function _displayName(u) {
  const m = (u && u.user_metadata) || {};
  const n = String(m.display_name || m.full_name || m.name || '').trim();
  if (n) return n;
  const l = String((u && u.email) || '').split('@')[0].replace(/\d+$/, '').replace(/[._+\-]+/g, ' ').trim();
  return l.replace(/\b\w/g, c => c.toUpperCase()) || 'Explorer';
}
window.sgDisplayName = _displayName;

/* ── AUTH UI ────────────────────────────────────────────────────── */
function renderAuthUI() {
  const lb = document.getElementById('loginBtn');
  const ui = document.getElementById('userInfo');
  const ue = document.getElementById('userEmailDisplay');
  const fw = document.getElementById('commentFormWrap');
  const lm = document.getElementById('commentLoginMsg');
  if (!lb) return;
  if (currentUser) {
    lb.style.display = 'none';
    if (ui) ui.style.display = 'flex';
    if (ue) ue.textContent = _displayName(currentUser);
    if (fw) fw.style.display = 'block';
    if (lm) lm.style.display = 'none';
  } else {
    lb.style.display = 'flex';
    if (ui) ui.style.display = 'none';
    if (fw) fw.style.display = 'none';
    if (lm) lm.style.display = 'flex';
  }
  /* Pages can extend auth UI without overriding this function */
  if (typeof window._afterRenderAuthUI === 'function') window._afterRenderAuthUI(currentUser);
  /* name chip + menu drawer (account-ui.js) */
  if (window.sgAccount) window.sgAccount.paint(currentUser);
}
window.renderAuthUI = renderAuthUI;

/* ── ACCOUNT UI (name chip · menu drawer · settings) ───────────── */
(function loadAccountUI() {
  try {
    if (window.sgAccount) return;
    const s = document.createElement('script');
    s.src = (_SB_ROOT || '/') + 'account-ui.js';
    s.async = true;
    document.head.appendChild(s);
  } catch (e) { console.warn('account-ui load failed:', e); }
})();

/* ── SIGN OUT ───────────────────────────────────────────────────── */
window.doSignOut = async function() {
  // scope:'local' = sign out of THIS device only. (The default ends every session of the account on every device — including
  // a vault sign-in on the same account — which is more than "Sign out" on this page should do.)
  try { if (sb) await sb.auth.signOut({ scope: 'local' }); } catch(e) { console.warn('signOut error:', e); }
  try { localStorage.removeItem('sb-daqxabswnrhqpjyfdbwx-auth-token'); } catch(e) {}
  currentUser = window.currentUser = null;
  renderAuthUI();
  window.location.href = _SB_ROOT + 'login';
};

/* ── PROGRESS SYNC ──────────────────────────────────────────────── */
/*
 * Each page provides:
 *   window._getProgressData()    → plain object to store
 *   window._applyProgressData(d) → restore state from stored object
 *
 * Saving is debounced 800 ms so rapid UI changes don't flood Supabase.
 */
async function sbSaveProgress() {
  if (!currentUser || !sb)                             return;
  if (typeof window._getProgressData !== 'function')   return;
  clearTimeout(_sbSaveTimer);
  _sbSaveTimer = setTimeout(async () => {
    if (_sbSaving) { _sbPendingSave = true; return; }
    _sbSaving = true;
    _sbPendingSave = false;
    try {
      const page = window._pageKey || 'unknown';
      const data = window._getProgressData();
      const { error } = await sb.from('progress').upsert(
        [{ user_id: currentUser.id, page, data, updated_at: new Date().toISOString() }],
        { onConflict: 'user_id,page' }
      );
      if (error) console.warn('Progress save failed:', error);
    } catch(e) { console.warn('Progress save network error:', e); }
    finally {
      _sbSaving = false;
      if (_sbPendingSave) sbSaveProgress();   /* reschedule dropped save */
    }
  }, 800);
}

async function sbLoadProgress() {
  if (!currentUser || !sb)                              return;
  if (typeof window._applyProgressData !== 'function')  return;
  try {
    const page = window._pageKey || 'unknown';
    const { data: rows, error } = await sb
      .from('progress')
      .select('data')
      .eq('user_id', currentUser.id)
      .eq('page', page)
      .maybeSingle();
    if (error || !rows?.data) return;
    window._applyProgressData(rows.data);
    if (typeof window._afterProgressLoad === 'function') window._afterProgressLoad();
  } catch(e) { console.warn('Progress load failed:', e); }
}

window.sbSaveProgress  = sbSaveProgress;
window.sbLoadProgress  = sbLoadProgress;
window._syncProgressUp = sbSaveProgress;   /* backward-compat alias */

/* ── DARK MODE SYNC ─────────────────────────────────────────────── */
/*
 * Reads / writes dark_mode (boolean) from the `profiles` table.
 * Each page exposes:
 *   window._applyDarkMode(isDark)  — applies preference to that page's UI
 * The page also calls window.sbSaveDarkMode(isDark) whenever the user toggles.
 */
async function sbLoadDarkMode() {
  if (!currentUser || !sb) return;
  try {
    const { data, error } = await sb
      .from('profiles')
      .select('dark_mode')
      .eq('id', currentUser.id)
      .maybeSingle();
    if (error || !data) return;
    if (typeof window._applyDarkMode === 'function') {
      window._applyDarkMode(data.dark_mode === true);
    }
  } catch(e) { console.warn('Dark mode load failed:', e); }
}

window.sbSaveDarkMode = async function(isDark) {
  if (!currentUser || !sb) return;
  try {
    await sb.from('profiles').upsert(
      { id: currentUser.id, dark_mode: isDark, updated_at: new Date().toISOString() },
      { onConflict: 'id' }
    );
  } catch(e) { console.warn('Dark mode save failed:', e); }
};

/* ── CONTENT MODERATION ─────────────────────────────────────────── */
const BLOCKED_WORDS = [
  'spam','fuck','shit','cunt','bitch','asshole','bastard','faggot',
  'whore','slut','dick','cock','pussy','motherfucker','scam','buy now',
  'free money','viagra','casino','porn','xxx',
  'madarchod','bhosdike','lodu','harami','saala','randi','chutiya','gaandu','bhenchod'
];
const SPAM_PATTERNS = [
  /https?:\/\//i,          /* raw URL links */
  /(.)(\1){9,}/,           /* 10+ identical chars in a row (raised from 5) */
  /[!?]{4,}/               /* excessive punctuation */
];

function isAbusive(text) {
  const lower  = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const padded = ' ' + lower + ' ';
  /* whole words and multi-word phrases (the database trigger enforces the same list) */
  if (BLOCKED_WORDS.some(b => padded.includes(' ' + b + ' '))) return true;
  for (const p of SPAM_PATTERNS) { if (p.test(text)) return true; }
  return false;
}

function isRateLimited(pk) {
  const now = Date.now();
  const key = 'sg_rate_' + pk;
  // Browser storage can be blocked (private browsing), full, or hold damaged data — none of that may stop a comment
  // from being posted, so every storage access is guarded and the saved list is checked before use.
  let s = [];
  try { const v = JSON.parse(localStorage.getItem(key) || '[]'); if (Array.isArray(v)) s = v; } catch (e) { /* start fresh */ }
  const r   = s.filter(t => typeof t === 'number' && now - t < 5 * 60 * 1000);
  if (r.length >= 3) return true;
  r.push(now);
  try { localStorage.setItem(key, JSON.stringify(r)); } catch (e) { /* can't remember this one — fine */ }
  return false;
}

/* ── COMMENTS ───────────────────────────────────────────────────── */
function showCommentError(msg) {
  let el = document.getElementById('commentError');
  if (!el) {
    el = document.createElement('div');
    el.id = 'commentError';
    el.style.cssText = 'color:#c0504a;font-size:0.8rem;margin-top:0.4rem;';
    document.getElementById('commentFormWrap')?.appendChild(el);
  }
  el.textContent = msg;
  setTimeout(() => { if (el) el.textContent = ''; }, 4000);
}
window.showCommentError = showCommentError;

const COMMENT_PAGE = 20;
let _commentShown = COMMENT_PAGE;

async function loadComments(opts) {
  if (opts && opts.more) _commentShown += COMMENT_PAGE;
  const list    = document.getElementById('commentList');
  const loading = document.getElementById('commentLoading');
  const empty   = document.getElementById('commentEmpty');
  if (!list || !sb) {
    if (loading) loading.style.display = 'none';
    if (empty)   empty.style.display   = 'block';
    return;
  }
  if (loading) loading.style.display = 'block';
  if (empty)   empty.style.display   = 'none';
  try {
    const page = window._pageKey || 'unknown';
    const { data, error } = await sb
      .from('comments')
      .select('id,user_id,user_name,text,created_at')
      .eq('page', page)
      .order('created_at', { ascending: false })
      .range(0, _commentShown);          /* one extra row tells us whether more exist */
    if (loading) loading.style.display = 'none';
    if (error || !data || data.length === 0) {
      if (empty) empty.style.display = 'block';
      list.querySelectorAll('.comment-item, .comment-more').forEach(el => el.remove());
      return;
    }
    list.querySelectorAll('.comment-item, .comment-more').forEach(el => el.remove());
    const hasMore = data.length > _commentShown;
    const rows    = hasMore ? data.slice(0, _commentShown) : data;
    const isAdmin = _ADMIN_EMAILS.includes(currentUser?.email);
    rows.forEach(c => {
      const div      = document.createElement('div');
      div.className  = 'comment-item';

      const meta     = document.createElement('div');
      meta.className = 'comment-meta';

      const nameSpan = document.createElement('span');
      nameSpan.className   = 'comment-name';
      nameSpan.textContent = c.user_name || 'Anonymous';

      const dateSpan = document.createElement('span');
      dateSpan.className   = 'comment-date';
      dateSpan.textContent = new Date(c.created_at).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric'
      });

      meta.appendChild(nameSpan);
      meta.appendChild(dateSpan);

      if (currentUser && (currentUser.id === c.user_id || isAdmin)) {
        const delBtn     = document.createElement('button');
        delBtn.className = 'comment-delete-btn';
        delBtn.title     = 'Delete comment';
        delBtn.textContent = '✕';
        delBtn.onclick = async () => {
          if (!confirm('Delete this comment?')) return;
          await deleteComment(c.id);
        };
        meta.appendChild(delBtn);
      }

      const textDiv     = document.createElement('div');
      textDiv.className = 'comment-text';
      textDiv.textContent = c.text;

      div.appendChild(meta);
      div.appendChild(textDiv);
      list.appendChild(div);
    });
    if (hasMore) {
      const more = document.createElement('button');
      more.type = 'button';
      more.className = 'comment-more';
      more.textContent = 'Load more comments';
      more.style.cssText = 'display:block;margin:1.2rem auto 0;padding:.55rem 1.3rem;font:inherit;font-size:.85rem;color:inherit;'
                         + 'background:none;border:1px solid currentColor;border-radius:999px;opacity:.75;cursor:pointer;';
      more.onmouseenter = () => { more.style.opacity = '1'; };
      more.onmouseleave = () => { more.style.opacity = '.75'; };
      more.onclick = () => loadComments({ more: true });
      list.appendChild(more);
    }
  } catch(e) {
    if (loading) loading.style.display = 'none';
    if (empty)   empty.style.display   = 'block';
  }
}
window.loadComments = loadComments;

async function deleteComment(id) {
  if (!sb || !currentUser) return;
  try {
    const { error } = await sb.from('comments').delete().eq('id', id);
    if (error) { console.warn('Delete failed:', error); return; }
    await loadComments();
  } catch(e) { console.warn('Delete error:', e); }
}

async function submitComment(pageKey) {
  if (!currentUser) { window.location.href = _SB_ROOT + 'login'; return; }
  const textEl = document.getElementById('commentText');
  const text   = (textEl?.value || '').trim();
  if (!text) return;
  if (text.length < 3)        { showCommentError('Too short.'); return; }
  if (text.length > 500)      { showCommentError('Too long.'); return; }
  if (isAbusive(text))        { showCommentError('Please keep it respectful.'); return; }
  if (isRateLimited(pageKey)) { showCommentError('Too many comments. Wait a few minutes.'); return; }
  const name = _displayName(currentUser);   /* never publishes the e-mail address */
  try {
    const { error } = await sb.from('comments').insert([{
      user_id: currentUser.id, user_name: name, page: pageKey, text
    }]);
    if (error) {
      /* P0001 = raised by the server-side rate-limit trigger */
      if (error.code === 'P0001' || /rate limit/i.test(error.message || '')) {
        showCommentError('Too many comments. Wait a few minutes.');
      } else if (error.code === 'SG002') {            /* rejected by the database content check */
        showCommentError('Please keep it respectful.');
      } else if (error.code === 'SG001') {            /* length check */
        showCommentError('Comments must be 3 to 500 characters.');
      } else {
        showCommentError('Failed. Try again.');
      }
      return;
    }
    if (textEl) textEl.value = '';
    const cc = document.getElementById('commentCharCount');
    if (cc) cc.textContent = '0 / 500';
    await loadComments();
  } catch(e) { showCommentError('Failed. Try again.'); }
}
window.submitComment = submitComment;

/* ── COMMENT TEXTAREA CHARACTER COUNTER ─────────────────────────── */
document.getElementById('commentText')?.addEventListener('input', function() {
  const cc = document.getElementById('commentCharCount');
  if (cc) cc.textContent = this.value.length + ' / 500';
});
