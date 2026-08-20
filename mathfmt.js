/* ═══════════════════════════════════════════════════════════════
   MATHFMT.JS — shared LaTeX rendering for the Maths section
   ═══════════════════════════════════════════════════════════════
   Problem this solves: content across books/facts/graduate/olympiad/
   openproblems/research/careers/precollege/undergrad/universities was
   authored inconsistently — some already wrapped in \(...\), some in
   raw unicode (⁴, ∫, →, ^n) that KaTeX's auto-render never touches.

   window.renderMath(root) does two things, once, for every page:
     1. Walks the DOM under `root`, finds text that LOOKS like math but
        isn't wrapped in \( \), \[ \], $, $$ yet, and wraps it.
     2. Calls KaTeX's renderMathInElement with the standard delimiters.

   Include this ONE file instead of repeating the KaTeX onload
   boilerplate + a local latexToHTML() in every page. Call renderMath()
   anywhere you used to call renderMathInElement(...) directly —
   including after admin data reloads re-render a section.
   ═══════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  // ─────────────────────── classification ───────────────────────

  var MATH_UNICODE = (
    "αβγδεζηθικλμνξοπρστυφχψω" +
    "ΓΔΘΛΞΠΣΥΦΨΩ" +
    "√∫∮ΣΠ∏∞≤≥≠±×÷∈∉∀∃⊆⊇⊂⊃⊥∧∨∩∪→⟹⟺≅↦∂∇ℓℝ‖∝⋯≈≫≪∼←" +
    "½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛" +
    "⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁽⁾ⁿⁱʲˡˢˣ" +
    "₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎ₐₑₕᵢⱼₖₗₘₙₒₚᵣₛₜᵤᵥₓᵧ" +
    "ᴴᴶᴸᴺᴼᴿᵀᵈᵍᵏᵐᵖᵗ" +
    "…"
  );
  var MATH_UNICODE_SET = {};
  for (var mi = 0; mi < MATH_UNICODE.length; mi++) MATH_UNICODE_SET[MATH_UNICODE[mi]] = true;

  var FUNC_WHITELIST = ["Var", "Cov", "Corr", "Pr", "log", "ln", "exp", "sin", "cos", "tan",
    "lim", "sup", "inf", "min", "max", "argmax", "argmin", "det", "tr", "li"];
  var FUNC_SET = toSet(FUNC_WHITELIST);

  var ABBREV_WHITELIST = ["AR", "MA", "ARMA", "ARIMA", "PACF", "ACF", "TV", "BC", "Col", "rank",
    "trace", "logit", "Bin", "Pois", "Poisson", "Geom", "Geometric", "Bern",
    "Bernoulli", "Unif", "Uniform", "Exp", "Exponential", "Beta", "Gamma",
    "Multinomial", "Binomial", "Cauchy", "Dir", "Dirichlet", "Normal", "MVN"];
  var ABBREV_SET = toSet(ABBREV_WHITELIST);

  var SINGLE_LETTER_EXCLUDE = toSet(["A", "I"]);
  var ENUM_LETTERS = toSet(["a", "b", "c", "d", "e"]);
  var DIFFERENTIALS = toSet(["dx", "dy", "dz", "dt", "dX", "dY", "dZ", "dT", "dθ", "dφ", "dμ", "du", "dv", "ds"]);
  var ELLIPSIS_TOKENS = toSet(["...", "....", "...,", ",...", "...;", "...:"]);
  var ENUM_MARKER_RE = /^\([a-e]\)[.,:;]?$/;
  var CURRENCY_RE = /^\(?[₹$][\d.,]+[KMBLCr]*\+?(?:[\-–][₹$]?[\d.,]+[KMBLCr]*\+?)?\)?$/;
  var DECORATIVE_RE = /^[✦★☆✧✨•▪▸►]+$/;

  function toSet(arr) {
    var o = {};
    for (var i = 0; i < arr.length; i++) o[arr[i]] = true;
    return o;
  }

  function stripPunct(tok) {
    return tok.replace(/^[.,;:!?"'\u201c\u201d\u2018\u2019]+|[.,;:!?"'\u201c\u201d\u2018\u2019]+$/g, '');
  }

  function isMathBracket(core) {
    var m = core.match(/^([A-Za-z\u0391-\u03C9]{1,12})([\(\[])([^\)\]]{0,14})([\)\]])/);
    if (m) {
      var prefix = m[1], inner = m[3];
      if (prefix.length === 1) {
        if (ENUM_LETTERS[prefix] && inner === '') return false;
        if (prefix === prefix.toUpperCase() && prefix !== prefix.toLowerCase()) return true;
        if (/^[a-z]{4,}$/.test(inner)) return false;
        return true;
      }
      if (FUNC_SET[prefix] || ABBREV_SET[prefix]) return true;
      return false;
    }
    var m2 = core.match(/^\(([^()]{1,12})\)/);
    if (m2) {
      var inner2 = m2[1];
      if (/^[a-z]{4,}$/.test(inner2)) return false;
      if (/^[A-Za-z0-9,\-\+ ]{1,12}$/.test(inner2)) return true;
    }
    return false;
  }

  function isMathToken(tok) {
    if (ENUM_MARKER_RE.test(tok)) return false;
    if (CURRENCY_RE.test(tok)) return false;
    if (DECORATIVE_RE.test(tok)) return false;
    if (ELLIPSIS_TOKENS[tok]) return true;
    var core = stripPunct(tok);
    if (!core) return false;
    if (DIFFERENTIALS[core]) return true;
    if (/\d/.test(core)) {
      if (/^\d+-[a-z]+$/.test(core)) return false;
      return true;
    }
    for (var i = 0; i < core.length; i++) {
      if (MATH_UNICODE_SET[core[i]]) return true;
    }
    if (core.indexOf('\\') !== -1) return true;
    if (core.indexOf('^') !== -1 || core.indexOf('_') !== -1) return true;
    if (core.indexOf('[') !== -1 || core.indexOf(']') !== -1 || core.indexOf('(') !== -1 || core.indexOf(')') !== -1) {
      if (isMathBracket(core)) return true;
    }
    if (FUNC_SET[core]) return true;
    if (/^[A-Z]$/.test(core) && !SINGLE_LETTER_EXCLUDE[core]) return true;
    if (core.indexOf('=') !== -1 && core.length <= 8) return true;
    if (core.indexOf('/') !== -1 && /[A-Za-z0-9]/.test(core)) {
      var pieces = core.split('/');
      var ok = true;
      for (var p = 0; p < pieces.length; p++) {
        if (pieces[p].replace(/[.,;:]/g, '').length > 4) { ok = false; break; }
      }
      if (ok) return true;
    }
    return false;
  }

  // ─────────────────────── char-level LaTeX conversion ───────────────────────

  var GREEK_MAP = {
    'α': '\\alpha', 'β': '\\beta', 'γ': '\\gamma', 'δ': '\\delta', 'ε': '\\varepsilon',
    'ζ': '\\zeta', 'η': '\\eta', 'θ': '\\theta', 'ι': '\\iota', 'κ': '\\kappa',
    'λ': '\\lambda', 'μ': '\\mu', 'ν': '\\nu', 'ξ': '\\xi', 'ο': 'o', 'π': '\\pi',
    'ρ': '\\rho', 'σ': '\\sigma', 'τ': '\\tau', 'υ': '\\upsilon', 'φ': '\\phi',
    'χ': '\\chi', 'ψ': '\\psi', 'ω': '\\omega',
    'Γ': '\\Gamma', 'Δ': '\\Delta', 'Θ': '\\Theta', 'Λ': '\\Lambda', 'Ξ': '\\Xi',
    'Π': '\\Pi', 'Σ': '\\Sigma', 'Υ': '\\Upsilon', 'Φ': '\\Phi', 'Ψ': '\\Psi', 'Ω': '\\Omega'
  };

  var SYMBOL_MAP = {
    '∫': '\\int', '∮': '\\oint', '∞': '\\infty', '∏': '\\prod', '←': '\\leftarrow',
    '–': '-', '≤': '\\le', '≥': '\\ge', '≠': '\\ne', '±': '\\pm', '×': '\\times', '÷': '\\div',
    '∈': '\\in', '∉': '\\notin', '∀': '\\forall', '∃': '\\exists',
    '⊆': '\\subseteq', '⊇': '\\supseteq', '⊂': '\\subset', '⊃': '\\supset', '⊥': '\\perp',
    '∧': '\\wedge', '∨': '\\vee', '∩': '\\cap', '∪': '\\cup',
    '→': '\\to', '⟹': '\\implies', '⟺': '\\iff', '≅': '\\cong', '↦': '\\mapsto',
    '∂': '\\partial', '∇': '\\nabla', 'ℓ': '\\ell', 'ℝ': '\\mathbb{R}',
    '‖': '\\|', '∝': '\\propto', '⋯': '\\cdots', '≈': '\\approx',
    '≫': '\\gg', '≪': '\\ll', '∼': '\\sim', '·': '\\cdot', '−': '-',
    '…': '\\ldots'
  };

  var SUP_CHARS = {
    '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7',
    '⁸': '8', '⁹': '9', '⁺': '+', '⁻': '-', '⁽': '(', '⁾': ')', 'ⁿ': 'n', 'ⁱ': 'i',
    'ʲ': 'j', 'ˡ': 'l', 'ˢ': 's', 'ˣ': 'x',
    'ᴴ': '{\\text{H}}', 'ᴶ': '{\\text{J}}', 'ᴸ': '{\\text{L}}', 'ᴺ': '{\\text{N}}',
    'ᴼ': '{\\text{O}}', 'ᴿ': '{\\text{R}}', 'ᵀ': '{\\text{T}}',
    'ᵈ': 'd', 'ᵍ': 'g', 'ᵏ': 'k', 'ᵐ': 'm', 'ᵖ': 'p', 'ᵗ': 't'
  };

  var SUB_CHARS = {
    '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7',
    '₈': '8', '₉': '9', '₊': '+', '₋': '-', '₌': '=', '₍': '(', '₎': ')',
    'ₐ': 'a', 'ₑ': 'e', 'ₕ': 'h', 'ᵢ': 'i', 'ⱼ': 'j', 'ₖ': 'k', 'ₗ': 'l', 'ₘ': 'm',
    'ₙ': 'n', 'ₒ': 'o', 'ₚ': 'p', 'ᵣ': 'r', 'ₛ': 's', 'ₜ': 't', 'ᵤ': 'u', 'ᵥ': 'v', 'ₓ': 'x',
    'ᵧ': 'y'
  };

  var ACCENT_PRECOMPOSED = {
    'Ĝ': ['hat', 'G'], 'ĝ': ['hat', 'g'], 'Ŝ': ['hat', 'S'], 'ŝ': ['hat', 's'],
    'Ŷ': ['hat', 'Y'], 'ŷ': ['hat', 'y'], 'Ȳ': ['bar', 'Y'], 'ȳ': ['bar', 'y'],
    'Ẽ': ['tilde', 'E'], 'ẽ': ['tilde', 'e'], 'Ñ': ['tilde', 'N'], 'ñ': ['tilde', 'n'],
    'ỹ': ['tilde', 'y'], 'Ṗ': ['dot', 'P'], 'ṗ': ['dot', 'p'], 'Ẋ': ['dot', 'X'], 'ẋ': ['dot', 'x'],
    'Ǧ': ['check', 'G'], 'ǧ': ['check', 'g']
  };
  var COMBINING = { '\u0302': 'hat', '\u0304': 'bar', '\u0303': 'tilde', '\u0307': 'dot' };

  var FRACTION_MAP = {
    '½': '\\tfrac{1}{2}', '⅓': '\\tfrac{1}{3}', '⅔': '\\tfrac{2}{3}', '¼': '\\tfrac{1}{4}',
    '¾': '\\tfrac{3}{4}', '⅕': '\\tfrac{1}{5}', '⅖': '\\tfrac{2}{5}', '⅗': '\\tfrac{3}{5}',
    '⅘': '\\tfrac{4}{5}', '⅙': '\\tfrac{1}{6}', '⅚': '\\tfrac{5}{6}', '⅛': '\\tfrac{1}{8}'
  };

  function applyFractions(text) {
    Object.keys(FRACTION_MAP).forEach(function (k) { text = text.split(k).join(FRACTION_MAP[k] + ' '); });
    return text;
  }

  var STDFUNCS = { log: '\\log', ln: '\\ln', exp: '\\exp', sin: '\\sin', cos: '\\cos', tan: '\\tan',
    lim: '\\lim', sup: '\\sup', inf: '\\inf', min: '\\min', max: '\\max' };
  var OPFUNCS = { argmax: '\\operatorname{argmax}', argmin: '\\operatorname{argmin}',
    Var: '\\operatorname{Var}', Cov: '\\operatorname{Cov}', Corr: '\\operatorname{Corr}',
    Pr: '\\Pr', det: '\\det', tr: '\\operatorname{tr}' };
  var DISTNAMES = { ARIMA: '\\text{ARIMA}', ARMA: '\\text{ARMA}', AR: '\\text{AR}', MA: '\\text{MA}',
    PACF: '\\text{PACF}', ACF: '\\text{ACF}', TV: '\\text{TV}', BC: '\\text{BC}',
    Col: '\\text{Col}', rank: '\\operatorname{rank}', trace: '\\operatorname{tr}',
    logit: '\\operatorname{logit}', Bernoulli: '\\text{Bernoulli}', Bern: '\\text{Bern}',
    Poisson: '\\text{Poisson}', Pois: '\\text{Pois}', Geometric: '\\text{Geometric}',
    Geom: '\\text{Geom}', Uniform: '\\text{Uniform}', Unif: '\\text{Unif}',
    Exponential: '\\text{Exponential}', Exp: '\\text{Exp}', Beta: '\\text{Beta}',
    Gamma: '\\text{Gamma}', Multinomial: '\\text{Multinomial}', Binomial: '\\text{Binomial}',
    Dirichlet: '\\text{Dirichlet}', Dir: '\\text{Dir}', Normal: '\\text{Normal}',
    MVN: '\\text{MVN}', Cauchy: '\\text{Cauchy}' };

  var NAME_MAP = {};
  Object.assign(NAME_MAP, DISTNAMES, OPFUNCS, STDFUNCS);
  var NAME_KEYS = Object.keys(NAME_MAP).sort(function (a, b) { return b.length - a.length; });
  var NAME_RE = new RegExp('\\b(' + NAME_KEYS.map(escapeRe).join('|') + ')\\b');

  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  function applyNames(text) {
    var out = '';
    var rest = text;
    var m;
    while ((m = rest.match(NAME_RE))) {
      out += rest.slice(0, m.index) + NAME_MAP[m[1]] + ' ';
      rest = rest.slice(m.index + m[0].length);
    }
    return out + rest;
  }

  function applyAccents(text) {
    text = text.replace(/([\s\S])([\u0302\u0304\u0303\u0307])/g, function (_, base, mark) {
      return '\\' + COMBINING[mark] + '{' + base + '}';
    });
    var keys = Object.keys(ACCENT_PRECOMPOSED);
    var re = new RegExp(keys.map(escapeRe).join('|'), 'g');
    text = text.replace(re, function (m0) {
      var pair = ACCENT_PRECOMPOSED[m0];
      return '\\' + pair[0] + '{' + pair[1] + '}';
    });
    return text;
  }

  function applySymbols(text) {
    Object.keys(SYMBOL_MAP).forEach(function (k) {
      var v = SYMBOL_MAP[k];
      text = text.split(k).join(v.charAt(0) === '\\' ? v + ' ' : v);
    });
    return text;
  }

  function collapseScripts(text) {
    var supChars = Object.keys(SUP_CHARS).join('');
    var subChars = Object.keys(SUB_CHARS).join('');
    text = text.replace(new RegExp('[' + escapeRe(supChars) + ']+', 'g'), function (run) {
      var mapped = '';
      for (var i = 0; i < run.length; i++) mapped += SUP_CHARS[run[i]];
      return mapped.length > 1 ? '^{' + mapped + '}' : '^' + mapped;
    });
    text = text.replace(new RegExp('[' + escapeRe(subChars) + ']+', 'g'), function (run) {
      var mapped = '';
      for (var i = 0; i < run.length; i++) mapped += SUB_CHARS[run[i]];
      return mapped.length > 1 ? '_{' + mapped + '}' : '_' + mapped;
    });
    return text;
  }

  function mergeConsecutiveScripts(text) {
    ['^', '_'].forEach(function (op) {
      var pat = new RegExp(escapeRe(op) + '(\\{[^{}]*\\}|.)' + escapeRe(op) + '(\\{[^{}]*\\}|.)');
      var m;
      while ((m = text.match(pat))) {
        var a = m[1].charAt(0) === '{' ? m[1].slice(1, -1) : m[1];
        var b = m[2].charAt(0) === '{' ? m[2].slice(1, -1) : m[2];
        text = text.slice(0, m.index) + op + '{' + a + b + '}' + text.slice(m.index + m[0].length);
      }
    });
    return text;
  }

  function escapeBareBraces(text) {
    var out = [], stack = [];
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (c === '{') {
        var isReal = i > 0 && (text[i - 1] === '^' || text[i - 1] === '_');
        stack.push(isReal);
        out.push(isReal ? '{' : '\\{');
      } else if (c === '}') {
        var real = stack.length ? stack.pop() : false;
        out.push(real ? '}' : '\\}');
      } else {
        out.push(c);
      }
    }
    return out.join('');
  }

  function escapeReserved(text) {
    return text.replace(/%/g, '\\%').replace(/#/g, '\\#').replace(/\$/g, '\\$');
  }

  var SQRT_ARG_RE = /^(?:\\[a-zA-Z]+(?:\{[^{}]*\})?|[A-Za-z0-9]+)(?:[\^_](?:\{[^{}]*\}|[A-Za-z0-9]))*/;

  function convertSqrt(text) {
    var out = [], i = 0;
    while (i < text.length) {
      if (text[i] === '√') {
        if (i + 1 < text.length && text[i + 1] === '(') {
          var depth = 0, j = i + 1;
          while (j < text.length) {
            if (text[j] === '(') depth++;
            else if (text[j] === ')') { depth--; if (depth === 0) break; }
            j++;
          }
          var inner = text.slice(i + 2, j);
          if (inner.indexOf('√') !== -1) inner = convertSqrt(inner); // recurse for nested radicals
          out.push('\\sqrt{' + inner + '}');
          i = j + 1;
          continue;
        } else {
          var m = text.slice(i + 1).match(SQRT_ARG_RE);
          if (m && m[0]) {
            out.push('\\sqrt{' + m[0] + '}');
            i = i + 1 + m[0].length;
            continue;
          }
          out.push('\\sqrt');
          i++;
          continue;
        }
      }
      out.push(text[i]);
      i++;
    }
    return out.join('');
  }

  function groupParenScripts(text) {
    var out = [], i = 0;
    while (i < text.length) {
      var c = text[i];
      if ((c === '^' || c === '_') && text[i + 1] === '(') {
        var depth = 0, j = i + 1;
        while (j < text.length) {
          if (text[j] === '(') depth++;
          else if (text[j] === ')') { depth--; if (depth === 0) break; }
          j++;
        }
        out.push(c + '{' + text.slice(i + 2, j) + '}');
        i = j + 1;
        continue;
      }
      out.push(c);
      i++;
    }
    return out.join('');
  }

  function braceMultiCharScripts(text) {
    return text.replace(/([\^_])([A-Za-z0-9]{2,})/g, '$1{$2}');
  }

  function latexifyRun(text) {
    text = escapeBareBraces(text);
    text = escapeReserved(text);
    text = groupParenScripts(text);
    text = braceMultiCharScripts(text);
    text = applyAccents(text);
    text = applyNames(text);
    Object.keys(GREEK_MAP).forEach(function (k) { text = text.split(k).join(GREEK_MAP[k] + ' '); });
    text = applySymbols(text);
    text = applyFractions(text);
    text = collapseScripts(text);
    text = mergeConsecutiveScripts(text);
    text = convertSqrt(text);
    text = text.replace(/ {2,}/g, ' ');
    text = text.replace(/\\(sqrt|le|ge|ne|pm|times|div|in|notin|forall|exists|subseteq|supseteq|subset|supset|perp|wedge|vee|cap|cup|to|implies|iff|cong|mapsto|partial|nabla|ell|propto|cdots|approx|gg|ll|sim|cdot|ldots|int|oint|infty|prod|leftarrow) +\{/g, '\\$1{');
    return text.trim();
  }

  function trimUnbalanced(run) {
    while (true) {
      var changed = false;
      var t = run.replace(/\s+$/, '');
      if (t !== run) { run = t; changed = true; }
      if (run && /[.,;:!?✦★☆✧✨]/.test(run[run.length - 1])) { run = run.slice(0, -1); changed = true; continue; }
      if (run && (run[run.length - 1] === ')' || run[run.length - 1] === ']')) {
        var close = run[run.length - 1], openc = close === ')' ? '(' : '[';
        if (count(run, close) > count(run, openc)) { run = run.slice(0, -1); changed = true; continue; }
      }
      t = run.replace(/^\s+/, '');
      if (t !== run) { run = t; changed = true; }
      if (run && (run[0] === '(' || run[0] === '[')) {
        var openc2 = run[0], closec2 = openc2 === '(' ? ')' : ']';
        if (count(run, openc2) > count(run, closec2)) { run = run.slice(1); changed = true; continue; }
      }
      if (!changed) break;
    }
    return run.trim();
  }

  function count(s, ch) {
    var n = 0;
    for (var i = 0; i < s.length; i++) if (s[i] === ch) n++;
    return n;
  }

  function balance(text) {
    return (count(text, '(') - count(text, ')')) + (count(text, '[') - count(text, ']'));
  }

  // ─────────────────────── run building & wrapping ───────────────────────

  var BRIDGE_TOKENS = toSet(['/', '=', '×', '±', '+', '-', '·', '−', '⋅']);
  var MAX_RUN_TOKENS = 40;

  function wrapSegment(segment) {
    var atoms = segment.match(/\S+|\s+/g) || [];
    var out = [];
    var i = 0, n = atoms.length;
    while (i < n) {
      var atom = atoms[i];
      if (/^\s+$/.test(atom)) { out.push(atom); i++; continue; }
      if (isMathToken(atom)) {
        var runTokens = [atom];
        var j = i + 1;
        while (j + 1 < n && atoms[j] === ' ' && runTokens.length < MAX_RUN_TOKENS) {
          var nxt = atoms[j + 1];
          if (ENUM_MARKER_RE.test(nxt)) break;
          var curText = runTokens.join(' ');
          if (balance(curText) > 0 && (nxt.indexOf(')') !== -1 || nxt.indexOf(']') !== -1) && nxt.length <= 4) {
            runTokens.push(nxt); j += 2; continue;
          }
          if (isMathToken(nxt)) { runTokens.push(nxt); j += 2; continue; }
          if (BRIDGE_TOKENS[nxt] && j + 3 < n && atoms[j + 2] === ' ' && isMathToken(atoms[j + 3])) {
            runTokens.push(nxt); j += 2; continue;
          }
          break;
        }
        var runText = runTokens.join(' ');
        var trimmed = trimUnbalanced(runText);
        if (trimmed) {
          var idx = runText.indexOf(trimmed);
          var lead = runText.slice(0, idx);
          var trail = runText.slice(idx + trimmed.length);
          var latex = latexifyRun(trimmed);
          out.push(lead + '\\(' + latex + '\\)' + trail);
        } else {
          out.push(runText);
        }
        i = j;
      } else {
        out.push(atom);
        i++;
      }
    }
    return out.join('');
  }

  function convertText(text) {
    return wrapSegment(text);
  }

  // ─────────────────────── DOM integration ───────────────────────

  var SKIP_TAGS = toSet(['SCRIPT', 'STYLE', 'SUP', 'SUB', 'CODE', 'PRE', 'TEXTAREA', 'INPUT']);
  var DELIM_RE = /\\\(|\\\)|\\\[|\\\]|\$\$|\$/;

  function alreadyInsideDelimiters(node) {
    // walk up: if any ancestor has a data attribute marking it as raw/no-math, skip
    var p = node.parentElement;
    while (p) {
      if (p.dataset && p.dataset.noMathfmt !== undefined) return true;
      if (SKIP_TAGS[p.tagName]) return true;
      p = p.parentElement;
    }
    return false;
  }

  function textHasDelimiters(s) {
    return s.indexOf('\\(') !== -1 || s.indexOf('\\[') !== -1 || s.indexOf('$') !== -1;
  }

  function fixRawMathInNode(root) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
    var nodes = [];
    var n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach(function (node) {
      var text = node.nodeValue;
      if (!text || !/\S/.test(text)) return;
      if (SKIP_TAGS[node.parentElement && node.parentElement.tagName]) return;
      if (alreadyInsideDelimiters(node)) return;
      // Split around any existing \(...\) \[...\] $...$ so we never re-wrap them
      var parts = text.split(/(\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]|\$\$[\s\S]*?\$\$|\$[^$]*?\$)/);
      var changed = false;
      var rebuilt = parts.map(function (part) {
        if (!part) return part;
        if (/^(\\\(|\\\[|\$)/.test(part)) return part; // leave existing math alone
        var converted = convertText(part);
        if (converted !== part) changed = true;
        return converted;
      }).join('');
      if (changed) node.nodeValue = rebuilt;
    });
  }

  function renderMath(root) {
    root = root || document.body;
    try { fixRawMathInNode(root); } catch (e) { console.warn('mathfmt: normalize failed', e); }
    if (global.renderMathInElement) {
      global.renderMathInElement(root, {
        delimiters: [
          { left: '\\(', right: '\\)', display: false },
          { left: '\\[', right: '\\]', display: true },
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false }
        ],
        throwOnError: false
      });
    }
  }

  // Back-compat shim for the old per-page latexToHTML(), used by admin edit-preview UIs.
  function latexToHTML(text) {
    if (!text) return '';
    text = text.replace(/\$\$([^$]+)\$\$/g, '\\[$1\\]');
    text = text.replace(/\$([^$\n]+)\$/g, '\\($1\\)');
    if (!textHasDelimiters(text)) {
      text = convertText(text);
    }
    if (global.katex && global.renderMathInElement) {
      try {
        var div = document.createElement('div');
        div.innerHTML = text;
        global.renderMathInElement(div, {
          delimiters: [{ left: '\\(', right: '\\)', display: false }, { left: '\\[', right: '\\]', display: true }],
          throwOnError: false
        });
        return div.innerHTML;
      } catch (e) { /* fall through */ }
    }
    return text;
  }

  global.renderMath = renderMath;
  global.latexToHTML = latexToHTML;
  global._mathfmtConvertText = convertText; // exposed for testing
})(typeof window !== 'undefined' ? window : this);
