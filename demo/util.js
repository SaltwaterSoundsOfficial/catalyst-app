// Small shared helpers for the UI.
const U = (() => {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const fileUrl = (p) => {
    if (!p) return '';
    const norm = String(p).replace(/\\/g, '/');
    return 'file:///' + norm.replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/').replace(/^([A-Za-z])%3A/, '$1:');
  };

  const hms = (secs) => {
    secs = Math.max(0, Math.round(secs || 0));
    const h = Math.floor(secs / 3600); const m = Math.floor((secs % 3600) / 60);
    if (h) return h + 'h ' + String(m).padStart(2, '0') + 'm';
    if (m) return m + 'm';
    return secs ? '<1m' : '0m';
  };
  const clock = (secs) => {
    secs = Math.max(0, Math.round(secs || 0));
    const h = Math.floor(secs / 3600); const m = Math.floor((secs % 3600) / 60);
    return h + ':' + String(m).padStart(2, '0');
  };
  const mmss = (secs) => { secs = Math.max(0, Math.round(secs || 0)); return Math.floor(secs / 60) + ':' + String(secs % 60).padStart(2, '0'); };

  const ago = (ts) => {
    if (!ts) return '';
    const s = (Date.now() - ts) / 1000;
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    if (s < 86400 * 2) return 'yesterday';
    return Math.floor(s / 86400) + 'd ago';
  };

  const bytes = (b) => {
    if (!b) return '0 GB';
    const gb = b / 1024 ** 3;
    return gb >= 1000 ? (gb / 1024).toFixed(1) + ' TB' : gb >= 100 ? Math.round(gb) + ' GB' : gb.toFixed(1) + ' GB';
  };

  const initials = (name) => {
    const words = String(name || '?').replace(/[^A-Za-z0-9 ]/g, ' ').trim().split(/\s+/).filter(Boolean);
    if (!words.length) return '?';
    return (words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[1][0]).toUpperCase();
  };

  const KIND_LABEL = { uwp: 'STORE', url: 'LINK', site: 'SITE', shortcut: 'APP', file: 'FILE', folder: 'FOLDER' };
  const kindLabel = (it) => (it.store ? it.store.toUpperCase() : it.section === 'games' ? 'GAME' : KIND_LABEL[it.kind] || 'APP');

  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  // Fuzzy-ish score: prefix > word start > substring > subsequence.
  const score = (query, text) => {
    const q = query.toLowerCase(); const t = String(text).toLowerCase();
    if (!q) return 0;
    if (t === q) return 1000;
    if (t.startsWith(q)) return 800 - t.length;
    const wi = t.split(/[\s\-_.]+/).findIndex((w) => w.startsWith(q));
    if (wi >= 0) return 600 - wi * 10 - t.length;
    const i = t.indexOf(q);
    if (i >= 0) return 400 - i - t.length;
    // initials match: "rs" -> "roblox studio"
    const ini = t.split(/[\s\-_.]+/).filter(Boolean).map((w) => w[0]).join('');
    if (q.length > 1 && ini.startsWith(q)) return 300;
    let j = 0;
    for (const ch of t) if (ch === q[j]) j++;
    if (j === q.length) return 100 - t.length;
    return -1;
  };

  /* ---------- calculator (no eval) ---------- */
  const calc = (input) => {
    const s = input.replace(/\s+/g, '').replace(/x/gi, '*').replace(/÷/g, '/');
    if (!/^[\d.+\-*/%^()]+$/.test(s) || !/\d/.test(s) || !/[+\-*/%^]/.test(s.replace(/^-/, ''))) return null;
    let i = 0;
    const peek = () => s[i];
    const num = () => {
      if (peek() === '(') { i++; const v = expr(); if (s[i] !== ')') throw 0; i++; return v; }
      if (peek() === '-') { i++; return -num(); }
      if (peek() === '+') { i++; return num(); }
      const m = s.slice(i).match(/^\d*\.?\d+(e[+-]?\d+)?/i);
      if (!m) throw 0;
      i += m[0].length;
      let v = parseFloat(m[0]);
      if (peek() === '%') { i++; v /= 100; }
      return v;
    };
    const pow = () => { let v = num(); while (peek() === '^') { i++; v = Math.pow(v, num()); } return v; };
    const term = () => { let v = pow(); while (peek() === '*' || peek() === '/') { const op = s[i++]; const r = pow(); v = op === '*' ? v * r : v / r; } return v; };
    const expr = () => { let v = term(); while (peek() === '+' || peek() === '-') { const op = s[i++]; const r = term(); v = op === '+' ? v + r : v - r; } return v; };
    try {
      const v = expr();
      if (i !== s.length || !isFinite(v)) return null;
      return Math.round(v * 1e10) / 1e10;
    } catch (e) { return null; }
  };

  /* ---------- unit conversion ---------- */
  const UNITS = {
    length: { mm: 0.001, cm: 0.01, m: 1, km: 1000, in: 0.0254, inch: 0.0254, inches: 0.0254, ft: 0.3048, feet: 0.3048, foot: 0.3048, yd: 0.9144, mi: 1609.344, mile: 1609.344, miles: 1609.344 },
    mass: { mg: 0.001, g: 1, kg: 1000, oz: 28.3495, lb: 453.592, lbs: 453.592, st: 6350.29 },
    data: { b: 1, kb: 1024, mb: 1024 ** 2, gb: 1024 ** 3, tb: 1024 ** 4 },
    time: { ms: 0.001, s: 1, sec: 1, min: 60, mins: 60, h: 3600, hr: 3600, hrs: 3600, hour: 3600, hours: 3600, day: 86400, days: 86400, week: 604800, weeks: 604800 },
    volume: { ml: 0.001, l: 1, gal: 3.78541, qt: 0.946353, cup: 0.236588, floz: 0.0295735 },
    speed: { 'km/h': 1, kph: 1, mph: 1.609344, 'm/s': 3.6 }
  };
  const convert = (input) => {
    const m = input.trim().toLowerCase().match(/^(-?\d*\.?\d+)\s*([a-z/°]+)\s+(?:to|in|into|as)\s+([a-z/°]+)$/);
    if (!m) return null;
    const v = parseFloat(m[1]); let from = m[2].replace('°', ''); let to = m[3].replace('°', '');
    const temps = { c: 'c', celsius: 'c', f: 'f', fahrenheit: 'f', k: 'k', kelvin: 'k' };
    if (temps[from] && temps[to]) {
      from = temps[from]; to = temps[to];
      const c = from === 'c' ? v : from === 'f' ? (v - 32) * 5 / 9 : v - 273.15;
      const r = to === 'c' ? c : to === 'f' ? c * 9 / 5 + 32 : c + 273.15;
      return { value: Math.round(r * 100) / 100, unit: to.toUpperCase() === 'K' ? 'K' : '°' + to.toUpperCase() };
    }
    for (const table of Object.values(UNITS)) {
      if (table[from] && table[to]) {
        const r = (v * table[from]) / table[to];
        return { value: Math.round(r * 10000) / 10000, unit: m[3] };
      }
    }
    return null;
  };

  // One designed empty screen: a title, one sentence, real buttons ([attr, label, style]) and an optional tip.
  // title/text/tip may hold trusted markup (<b>); anything from the user must be escaped by the caller.
  const emptyCard = ({ mark = '', title, text = '', btns = [], tip = '', extra = '' }) => `<div class="empty-card">${mark ? `<div class="ec-mark" aria-hidden="true">${mark}</div>` : ''}<h3>${title}</h3>${text ? `<p>${text}</p>` : ''}${extra}${btns.length ? `<div class="btns">${btns.map(([attr, label, cls], i) => `<button type="button" class="btn ${cls || (i ? 'ghost' : 'accent')}" ${attr}>${label}</button>`).join('')}</div>` : ''}${tip ? `<small class="ec-tip">${tip}</small>` : ''}</div>`;

  return { esc, fileUrl, hms, clock, mmss, ago, bytes, initials, kindLabel, debounce, score, calc, convert, emptyCard };
})();
