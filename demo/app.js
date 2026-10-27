// Catalyst UI controller: state, navigation, command bar, player, beat sync,
// menus, dialogs, drag and drop, splash, tour, controller support.
(() => {
  const { esc } = U;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  const app = {
    state: {
      section: 'home', sort: 'used', items: [], icons: {}, sections: [], workspaces: [], folders: [],
      settings: null, stats: null, suggested: [], system: null, media: null, clips: [], friends: null,
      wsSuggestions: [], vibes: [], counts: {}, scannedAt: 0, scanning: false, gameMode: false,
      focus: null, remote: null, version: '', platform: 'win32'
    }
  };
  const S = app.state;

  /* ---------------- helpers used by views ---------------- */
  // What the PC is used for decides which creator sections and default sites show.
  const USES = [
    { id: 'gaming', label: 'Gaming', sub: 'Steam, Epic, Xbox, Roblox', sections: ['games'] },
    { id: 'music', label: 'Making music', sub: 'DAWs, plugins, releases', sections: ['studio'] },
    { id: 'content', label: 'Video & streaming', sub: 'OBS, CapCut, Premiere', sections: ['content'] },
    { id: 'dev', label: 'Coding & game dev', sub: 'VS Code, Unity, Roblox Studio', sections: ['dev'] },
    { id: 'design', label: 'Design & 3D', sub: 'Photoshop, Figma, Blender', sections: ['dev'] },
    { id: 'work', label: 'School & work', sub: 'Docs, email, notes', sections: [] }
  ];
  const PROFILE_SECTIONS = ['games', 'studio', 'content', 'dev'];
  app.USES = USES;
  // Packs (0.6) decide which default sites show; older installs fall back to "uses".
  const usesSet = () => V6.packUses(S.settings.packs) || (!S.settings.packs && Array.isArray(S.settings.uses) && S.settings.uses.length ? new Set(S.settings.uses) : null);
  app.visibleItems = () => { const u = usesSet(); return S.items.filter((i) => !i.hidden && (!u || !i.use || u.has(i.use))); };
  // App sections with nothing in them stay out of the way unless you asked for them.
  const hasStuff = (s, items) => s.id === 'home' || s.id === S.section || !PROFILE_SECTIONS.includes(s.id) || s.show || S.settings.showEmpty || S.scanning || items.some((i) => i.section === s.id);
  // Sidebar: pinned tabs. MORE: the rest. Hidden tabs live only in Settings › Customize.
  app.hasStuff = (s) => hasStuff(s, app.visibleItems());
  app.navSections = () => { const items = app.visibleItems(); return S.sections.filter((s) => s.id === 'home' || (!s.hidden && s.place !== 'more' && hasStuff(s, items))); };
  app.moreSections = () => { const items = app.visibleItems(); return S.sections.filter((s) => s.id !== 'home' && !s.hidden && s.place === 'more' && hasStuff(s, items)); };
  app.iconFor = (it) => {
    const v = S.icons[it.id];
    if (!v) return '';
    return v.startsWith('data:') ? v : U.fileUrl(v) + '?v=' + (S.iconsVersion || 0);
  };
  app.timeToday = (id) => { const r = S.stats && S.stats.today.list.find((x) => x.key === id); return r ? r.secs : 0; };
  app.timeTotal = (id) => {
    if (!S.stats) return 0;
    for (const k of ['all', 'month', 'week']) { const r = S.stats[k].list.find((x) => x.key === id); if (r) return r.secs; }
    return 0;
  };

  /* ---------- feel: optional UI sounds (made on the fly, no audio files) + small celebrations ---------- */
  let actx = null; let lastSfx = 0;
  const SFX = {
    tap: [[1800, 0, .025, 'sine', .05]],
    nav: [[1200, 0, .03, 'sine', .035]],
    on: [[660, 0, .06, 'triangle', .07], [990, .05, .08, 'triangle', .06]],
    off: [[660, 0, .06, 'triangle', .06], [440, .05, .08, 'triangle', .05]],
    launch: [[520, 0, .08, 'triangle', .07], [780, .06, .12, 'triangle', .06]],
    success: [[523, 0, .12, 'sine', .08], [659, .08, .12, 'sine', .08], [784, .16, .22, 'sine', .08]],
    error: [[220, 0, .12, 'triangle', .08], [175, .1, .16, 'triangle', .07]]
  };
  app.sfx = (name) => {
    if (!S.settings || !S.settings.uiSounds || !SFX[name]) return;
    const now = performance.now(); if (now - lastSfx < 45) return; lastSfx = now;
    try {
      actx = actx || new AudioContext();
      const t0 = actx.currentTime + 0.01;
      for (const [freq, at, dur, type, vol] of SFX[name]) {
        const o = actx.createOscillator(); const g = actx.createGain();
        o.type = type; o.frequency.setValueAtTime(freq, t0 + at);
        g.gain.setValueAtTime(0, t0 + at); g.gain.linearRampToValueAtTime(vol, t0 + at + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + dur);
        o.connect(g).connect(actx.destination); o.start(t0 + at); o.stop(t0 + at + dur + 0.02);
      }
    } catch (e) {}
  };
  // A short burst of accent-colored confetti for the big moments (Pro unlocked, first Flow, first workspace).
  app.celebrate = () => {
    app.sfx('success');
    if (document.body.classList.contains('anim-off')) return;
    const c = document.createElement('canvas'); c.className = 'confetti'; c.width = innerWidth; c.height = innerHeight; document.body.appendChild(c);
    const ctx = c.getContext('2d'); const css = getComputedStyle(document.documentElement);
    const cols = [css.getPropertyValue('--accent').trim() || '#ff5a1f', css.getPropertyValue('--fg').trim() || '#fff', '#ffd23f', '#3affc8'];
    const P = Array.from({ length: 90 }, () => ({ x: innerWidth / 2, y: innerHeight * 0.42, vx: (Math.random() - 0.5) * 16, vy: -Math.random() * 14 - 4, r: Math.random() * 6 + 3, a: Math.random() * 6, va: (Math.random() - 0.5) * 0.4, c: cols[(Math.random() * cols.length) | 0] }));
    const t0 = performance.now();
    const tick = (t) => {
      const k = (t - t0) / 1400; ctx.clearRect(0, 0, c.width, c.height);
      for (const p of P) { p.vy += 0.45; p.x += p.vx; p.y += p.vy; p.a += p.va; ctx.save(); ctx.globalAlpha = Math.max(0, 1 - k); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c; ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); ctx.restore(); }
      if (k < 1) requestAnimationFrame(tick); else c.remove();
    };
    requestAnimationFrame(tick);
  };

  app.toast = (text) => {
    const d = document.createElement('div');
    d.textContent = text;
    $('#toast').appendChild(d);
    setTimeout(() => d.remove(), 2900);
  };

  app.saveSettings = async (patch) => {
    const s = await window.cat.setSettings(patch);
    if (s && !s.error) { S.settings = s; applyVibe(); }
    return s;
  };

  app.launch = async (id) => {
    const it = S.items.find((i) => i.id === id);
    const ok = await window.cat.launch(id);
    closePalette();
    if (!it) return;
    if (ok) {
      it.lastLaunched = Date.now(); app.sfx('launch');
      $$(`[data-item="${CSS.escape(id)}"]`).forEach((el) => { el.classList.remove('launched'); void el.offsetWidth; el.classList.add('launched'); setTimeout(() => el.classList.remove('launched'), 800); });
      return app.toast('OPENING ' + it.name.toUpperCase());
    }
    const w = (await window.cat.launchWhy(id)) || {};
    const removeFix = ['REMOVE FROM CATALYST', () => app.confirm('Remove ' + it.name + ' from Catalyst? Nothing is deleted from your PC.', () => window.cat.removeItem(id))];
    if (w.reason === 'missing') {
      return app.problem(`${it.name} isn’t where it used to be`, `Catalyst looked for it at <b>${esc(w.path)}</b> and it’s not there anymore. It was probably moved, updated or uninstalled.`, [
        ['FIND IT', async () => {
          const picked = await window.cat.pickFiles(); const p = picked && picked[0]; if (!p) return;
          await window.cat.updateItem(id, { launch: p }); app.toast('FIXED · OPENING ' + it.name.toUpperCase()); app.launch(id);
        }],
        ['SCAN MY PC AGAIN', () => app.rescan()],
        removeFix
      ]);
    }
    app.problem(`${it.name} didn’t open`, w.via ? `Catalyst asked ${esc(w.via)} to start it, but nothing happened. Make sure ${esc(w.via)} is installed${w.via === 'Steam' || /Epic/.test(w.via) ? ' and you’re signed in' : ''}, then try again.` : 'Windows wouldn’t start it. It might need an update, or it might be blocked by your antivirus.', [
      ['TRY AGAIN', () => app.launch(id)],
      ...(w.path ? [['SHOW IN FOLDER', () => window.cat.reveal(w.path)]] : []),
      removeFix
    ]);
  };

  // One plain-English problem box: what happened, then buttons that fix it. fixes: [[label, fn]]
  app.problem = (title, html, fixes = []) => {
    app.sfx('error');
    openModal(`<h2>${esc(title)}</h2><div class="note" style="line-height:1.6;overflow-wrap:anywhere">${html}</div>
      <div class="btns" style="flex-wrap:wrap">${fixes.map(([l], i) => `<button type="button" class="btn ${i ? 'ghost' : 'accent'}" data-fix="${i}">${esc(l)}</button>`).join('')}<button type="button" class="btn ghost" data-x style="margin-left:auto">CLOSE</button></div>`, (m) => {
      $('[data-x]', m).addEventListener('click', closeModal);
      $$('[data-fix]', m).forEach((b) => b.addEventListener('click', () => { closeModal(); fixes[Number(b.dataset.fix)][1](); }));
    });
  };
  app.launchWorkspace = async (id) => { closePalette(); await window.cat.launchWorkspace(id); };
  app.go = (section) => {
    if (section !== S.section) app.sfx('nav');
    closePalette(); closeMenu();
    // STATS and PC DOCTOR live inside MY PC now
    if (section === 'stats') { S.mypcTab = 'time'; section = 'mypc'; }
    if (section === 'doctor') { S.mypcTab = 'health'; section = 'mypc'; }
    S.section = section; app.render();
  };
  app.rescan = async () => { S.scanning = true; app.toast('SCANNING YOUR PC'); await window.cat.scan(); };
  app.toggleGameMode = async () => { if (!S.gameMode && !app.pro('gamemode')) return; S.gameMode = await window.cat.gameMode(!S.gameMode); syncGameModeBtn(); flashEdge(S.gameMode); };
  // Game Mode on/off: the window edge glows once, so you know it happened.
  function flashEdge(on) { app.sfx(on ? 'on' : 'off'); const b = document.body; b.classList.remove('edge-on', 'edge-off'); void b.offsetWidth; b.classList.add(on ? 'edge-on' : 'edge-off'); setTimeout(() => b.classList.remove('edge-on', 'edge-off'), 1000); }
  app.refreshWidgets = async () => {
    const w = await window.cat.widgets();
    if (w && !w.error) S.widgets = w;
    if (S.section === 'home' && !$('#modal').classList.contains('open')) app.render(true);
  };
  app.refreshFriends = async (force) => {
    const f = await window.cat.friends(force);
    S.friends = f && !f.error ? f : f && f.error === 'not-configured' ? null : f;
    if (S.section === 'home') app.render(true);
  };

  /* ---------------- vibe ---------------- */
  const GRAIN = { off: 0, low: 0.04, medium: 0.07, high: 0.12 };
  const SPEED = { off: 1, slow: 0.6, normal: 1, fast: 1.6 };
  const BUILTIN_VIBES = ['studio', 'midnight', 'terminal', 'vaporwave', 'ocean'];
  const FREE_VIBES = ['studio', 'midnight'];
  app.FREE_VIBES = FREE_VIBES;
  app.FREE = { workspaces: 1, hotkeys: 3, sections: 1 };
  app.BUILTIN_VIBES = BUILTIN_VIBES;
  let fxFor = null;

  // Background effect layers per vibe (decor only).
  function buildFx(base) {
    if (fxFor === base) return;
    fxFor = base;
    const fx = $('#fx'); const top = $('#fx-top');
    let back = ''; let front = '';
    if (base === 'midnight') back = '<div class="aura a"></div><div class="aura b"></div>';
    if (base === 'terminal') { back = '<div class="roller"></div>'; front = '<div class="scan"></div>'; }
    if (base === 'vaporwave') back = '<div class="sun"></div><div class="floor"></div>';
    if (base === 'ocean') {
      back = [[14, 120], [38, 70], [68, 160]].map(([l, w], i) => `<div class="ray" style="left:${l}%;width:${w}px;animation-delay:-${i * 3}s"></div>`).join('');
      for (let i = 0; i < 14; i++) { const sz = 6 + (i * 7) % 14; back += `<span class="bub" style="left:${4 + i * 7}%;width:${sz}px;height:${sz}px;animation-duration:${8 + (i % 4) * 2}s;animation-delay:-${i * 0.9}s"></span>`; }
      back += '<div class="kelp" style="left:2%;width:22px;height:30vh"></div><div class="kelp" style="left:4.5%;width:16px;height:20vh;animation-delay:-2s"></div><div class="kelp" style="right:3%;width:20px;height:26vh;animation-delay:-4s"></div>';
    }
    fx.innerHTML = back; top.innerHTML = front;
  }

  function currentVibe() {
    let id = S.settings.vibe || 'studio';
    if (!app.isPro || !app.isPro()) { if (!FREE_VIBES.includes(id) && !(S.license === undefined)) id = 'studio'; }
    const custom = S.vibes.find((v) => v.id === id);
    if (custom) return { id, base: BUILTIN_VIBES.includes(custom.base) ? custom.base : 'studio', vars: custom.vars };
    return { id: BUILTIN_VIBES.includes(id) ? id : 'studio', base: BUILTIN_VIBES.includes(id) ? id : 'studio', vars: {} };
  }
  app.accentFor = (vibeId) => {
    const s = S.settings;
    const map = s.vibeAccents || {};
    if (map[vibeId]) return map[vibeId];
    return vibeId === 'studio' ? s.accent : '';
  };

  function applyVibe() {
    const s = S.settings;
    const root = document.documentElement;
    const v = currentVibe();
    root.removeAttribute('style');
    root.dataset.vibe = v.base;
    for (const [k, val] of Object.entries(v.vars || {})) root.style.setProperty(k, val);
    const accent = app.accentFor(v.id);
    if (accent) root.style.setProperty('--accent', accent);
    const acc = accent || getComputedStyle(root).getPropertyValue('--accent').trim();
    if (accent || v.base === 'studio') root.style.setProperty('--on-accent', luminance(acc) < 0.42 ? '#ffffff' : (v.base === 'terminal' ? '#010402' : '#0d0d0d'));
    // Studio uses the grain setting; other vibes keep their own unless you change it from Medium.
    if (v.base === 'studio' || s.grain !== 'medium') root.style.setProperty('--grain', String(GRAIN[s.grain] ?? 0.07));
    root.style.setProperty('--speed', String(SPEED[s.animSpeed] ?? 1));
    document.body.classList.toggle('anim-off', s.animSpeed === 'off' || (s.animSpeed === 'normal' && matchMedia('(prefers-reduced-motion: reduce)').matches && !s.ignoreReducedMotion));
    document.body.classList.toggle('tiles-compact', s.tileSize === 'compact');
    document.body.classList.toggle('tiles-large', s.tileSize === 'large');
    buildFx(v.base);
    startBeat();
  }
  app.applyVibe = applyVibe;
  function luminance(hex) {
    const m = String(hex || '').match(/^#?([0-9a-f]{6})$/i);
    if (!m) return 0.5;
    const n = parseInt(m[1], 16);
    return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  }
  app.currentVibeFile = () => {
    const v = currentVibe();
    const cs = getComputedStyle(document.documentElement);
    const vars = {};
    ['--bg', '--bg-2', '--bg-3', '--fg', '--fg-2', '--mute', '--line', '--line-2', '--accent', '--on-accent', '--grain', '--radius', '--display', '--mono'].forEach((k) => { vars[k] = cs.getPropertyValue(k).trim(); });
    const custom = S.vibes.find((x) => x.id === v.id);
    return { id: custom ? custom.id : 'my-' + v.base, name: custom ? custom.name : 'My ' + v.base[0].toUpperCase() + v.base.slice(1), base: v.base, author: 'You', vars };
  };

  /* ---------------- render ---------------- */
  let lastSection = null;
  app.render = (keepScroll) => {
    const content = $('#content');
    const scroll = content.scrollTop;
    const sec = S.sections.find((x) => x.id === S.section);
    let view;
    if (S.section === 'home') view = Views.home(app);
    else if (S.section === 'games') view = Views.games(app);
    else if (S.section === 'files') view = Views.files(app);
    else if (S.section === 'workspaces') view = Views.workspaces(app);
    else if (S.section === 'flow') { if (!S.flowsLoaded) { S.flowsLoaded = true; app.loadFlows(); } view = Views.flow(app); }
    else if (S.section === 'stats' || S.section === 'doctor') { S.mypcTab = S.section === 'stats' ? 'time' : 'health'; S.section = 'mypc'; view = V6.mypc(app); }
    else if (S.section === 'mypc') view = V6.mypc(app);
    else if (S.section === 'stream') view = V6.stream(app);
    else if (S.section === 'school') view = V6.school(app);
    else if (S.section === 'settings') view = Views.settings(app);
    else if (S.section === 'phone') view = V5.phone(app);
    else if (sec) view = Views.section(app, sec);
    else { S.section = 'home'; view = Views.home(app); }

    const title = $('#title');
    const changed = lastSection !== S.section;
    if (title.textContent !== view.title || changed) {
      title.textContent = view.title;
      title.style.animation = 'none'; void title.offsetWidth; title.style.animation = '';
    }
    fitTitle();
    content.innerHTML = view.html;
    content.classList.toggle('enter', changed);
    if (changed) { content.scrollTop = 0; } else if (keepScroll !== false) content.scrollTop = scroll;
    lastSection = S.section;
    view.mount && view.mount(content);
    renderNav();
  };

  // Shrink the giant section title until it fits next to the search bar.
  function fitTitle() {
    const t = $('#title');
    t.style.fontSize = '';
    let size = parseFloat(getComputedStyle(t).fontSize);
    let guard = 0;
    while (t.scrollWidth > t.clientWidth + 1 && size > 40 && guard++ < 40) { size -= 4; t.style.fontSize = size + 'px'; }
  }
  window.addEventListener('resize', U.debounce(() => { fitTitle(); navFade(); }, 100));
  document.getElementById('navlist').addEventListener('scroll', () => navFade(), { passive: true });

  function renderNav() {
    const visible = app.navSections();
    const more = app.moreSections();
    const open = S.moreOpen || more.some((s) => s.id === S.section);
    const btn = (s, num, extra = '') => `<button type="button" class="navbtn ${extra} ${S.section === s.id ? 'on' : ''}" data-go="${esc(s.id)}" data-nav="${esc(s.id)}" data-drop-section="${esc(s.id)}"><span class="num">${num}</span><span>${esc(s.label)}${s.id === 'flow' ? app.proTag() : ''}</span></button>`;
    $('#navlist').innerHTML = visible.map((s, i) => btn(s, String(i + 1).padStart(2, '0'))).join('')
      + (more.length ? `<button type="button" class="navbtn navmore ${open ? 'open' : ''}" data-navmore aria-expanded="${open}"><span class="num">+${more.length}</span><span>MORE</span><span class="caret" aria-hidden="true">${open ? '−' : '+'}</span></button>${open ? `<div class="navmore-list">${more.map((s) => btn(s, '·', 'sub')).join('')}</div>` : ''}` : '');
    const mb = $('[data-navmore]'); if (mb) mb.addEventListener('click', () => { S.moreOpen = !open; renderNav(); });
    $('#btn-settings').classList.toggle('on', S.section === 'settings');
    navFade();
  }
  const navFade = () => { const l = $('#navlist'); if (l) l.classList.toggle('more-below', l.scrollHeight - l.scrollTop - l.clientHeight > 4); };
  app.renderNav = () => renderNav();
  // Hide parts of the screen people don't use (Settings › Customize › On screen).
  app.applyUi = () => {
    const ui = (S.settings && S.settings.ui) || {};
    $('#player').hidden = ui.player === false;
    $('#navsys').hidden = ui.navsys === false;
    $('#btn-gamemode').hidden = ui.gmbtn === false;
    document.body.classList.toggle('no-player', ui.player === false);
  };

  function renderNavSys() {
    const s = S.system;
    if (!s) return;
    $('#navsys').innerHTML = `<span>CPU <b>${s.cpu}%</b>${s.gpu && s.gpu.temp != null ? ` · GPU <b>${s.gpu.temp}°C</b>` : ''}</span><span>RAM <b>${(s.ram.used / 1024 ** 3).toFixed(1)}/${Math.round(s.ram.total / 1024 ** 3)}</b> · <b>${U.bytes(s.disk.free)}</b> FREE</span>`;
  }

  function renderUpdate() {
    const u = S.update; const el = $('#update-banner');
    if (!el) return;
    if (!u || !['available', 'downloading', 'ready'].includes(u.status)) { el.innerHTML = ''; return; }
    const label = u.status === 'available' ? 'UPDATE ' + esc(u.latest) + ' READY' : u.status === 'downloading' ? 'DOWNLOADING ' + (u.progress || 0) + '%' : 'RESTART TO UPDATE';
    el.innerHTML = `<button type="button" class="chip on" style="width:100%" data-update-act>${label}</button>`;
    el.querySelector('[data-update-act]').addEventListener('click', () => app.updateAction());
  }
  app.updateAction = async () => {
    const u = S.update || {};
    if (u.status === 'available') S.update = await window.cat.downloadUpdate();
    else if (u.status === 'ready') await window.cat.installUpdate();
    renderUpdate();
  };

  let wsRunTimer = null;
  function renderWsRun() {
    const box = $('#ws-run');
    clearTimeout(wsRunTimer);
    box.innerHTML = S.wsRun ? Views.wsProgressHtml(app) : '';
    const close = box.querySelector('[data-ws-close]');
    if (close) close.addEventListener('click', () => { S.wsRun = null; renderWsRun(); });
    const rt = box.querySelector('[data-ws-retry]');
    if (rt) rt.addEventListener('click', () => {
      const r = S.wsRun; const ids = r.steps.filter((x) => x.status === 'failed').map((x) => x.itemId);
      if (ids.length) window.cat.launchWorkspace(r.id, ids); else app.toast('MISSING ITEMS: REMOVE OR RE-ADD THEM');
    });
    const r = S.wsRun;
    if (r && r.done && !r.arranging && !r.steps.some((x) => x.status === 'failed' || x.status === 'missing') && !(r.placement || []).some((p) => !p.ok)) {
      wsRunTimer = setTimeout(() => { S.wsRun = null; renderWsRun(); }, 5000);
    }
  }

  app.captureDialog = async (draft) => {
    openModal('<h2>Capturing your desktop…</h2><div class="note">Reading your open windows.</div>');
    const r = await window.cat.captureDesktop();
    const wins = (r && r.windows) || [];
    if (!wins.length) { openModal('<h2>No windows found</h2><div class="note">Open the apps you want in this workspace, arrange them, then capture again. (Window capture works on Windows.)</div><div class="btns" style="justify-content:flex-end"><button type="button" class="btn solid" data-x>OK</button></div>', (m) => $('[data-x]', m).addEventListener('click', closeModal)); return; }
    const pick = wins.map((w) => true);
    const draw = (m) => {
      $('.pick', m).innerHTML = wins.map((w, i) => `<button type="button" class="list-row ${pick[i] ? 'sel' : ''}" data-w="${i}"><span class="tg">${pick[i] ? '✓' : ''} ${w.state === 'max' ? 'MAX' : w.w + '×' + w.h}</span><span class="nm">${esc(w.name)} <small style="color:var(--mute)">${esc(w.title.slice(0, 50))}</small></span><span class="tm">${w.inLibrary ? '' : 'ADD TO LIBRARY'}</span></button>`).join('');
      $$('[data-w]', m).forEach((b) => b.addEventListener('click', () => { const i = Number(b.dataset.w); pick[i] = !pick[i]; draw(m); }));
    };
    openModal(`<h2>Capture desktop</h2><div class="note">Pick the windows to save. Catalyst remembers where each one sits, even across monitors. It can't restore what's open <b>inside</b> an app (tabs, projects) unless the app does that itself.</div>
      <div class="pick"></div>
      <div class="btns" style="justify-content:space-between"><label class="note" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="cap-replace" checked> Replace this workspace's apps</label><span class="btns"><button type="button" class="btn ghost" data-x>CANCEL</button><button type="button" class="btn accent" data-ok>SAVE LAYOUT</button></span></div>`, (m) => {
      draw(m);
      $('[data-x]', m).addEventListener('click', closeModal);
      $('[data-ok]', m).addEventListener('click', async () => {
        const chosen = wins.filter((w, i) => pick[i]);
        const toAdd = chosen.filter((w) => !w.inLibrary && w.path && !/\\windowsapps\\/i.test(w.path));
        if (toAdd.length) {
          const added = await window.cat.addPaths([...new Set(toAdd.map((w) => w.path))], 'apps');
          for (const w of toAdd) { const a = (added || []).find((x) => x.launch === w.path); if (a) { w.itemId = a.id; w.inLibrary = true; } }
        }
        const usable = chosen.filter((w) => w.itemId);
        const ids = [...new Set(usable.map((w) => w.itemId))];
        if ($('#cap-replace', m).checked) draft.items = ids; else draft.items = [...new Set([...draft.items, ...ids])];
        draft.layout = usable.map((w) => ({ itemId: w.itemId, name: w.name, exe: w.exe, path: w.path, title: w.title, state: w.state, x: w.x, y: w.y, w: w.w, h: w.h, monitor: w.monitor, mx: w.mx, my: w.my, mw: w.mw, mh: w.mh }));
        closeModal();
        app.toast('CAPTURED ' + draft.layout.length + ' WINDOWS · HIT SAVE');
        app.render(true);
      });
    });
  };

  const fmtSize = (b) => !b ? '' : b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';

  app.sortPreviewDialog = async () => {
    openModal('<h2>Checking Downloads…</h2>');
    const r = await window.cat.planSort();
    const plan = (r && r.plan) || [];
    const doable = plan.filter((p) => !p.skip);
    const on = doable.map(() => true);
    const draw = (m) => {
      $('.pick', m).innerHTML = doable.length ? doable.map((p, i) => `<button type="button" class="list-row ${on[i] ? 'sel' : ''}" data-i="${i}"><span class="tg">${on[i] ? '✓ ' : ''}${esc(p.action === 'copy' ? 'COPY' : 'MOVE')}</span><span class="nm">${esc(p.file)} <small style="color:var(--mute)">→ ${esc(p.rule)}${p.renamed ? ' (renamed, a file with that name exists)' : ''}</small></span><span class="tm">${fmtSize(p.size)}</span></button>`).join('') : '<div class="empty">Nothing to sort right now.</div>';
      $$('[data-i]', m).forEach((b) => b.addEventListener('click', () => { const i = Number(b.dataset.i); on[i] = !on[i]; draw(m); }));
      const n = on.filter(Boolean).length;
      $('[data-ok]', m).textContent = 'SORT ' + n + ' FILE' + (n === 1 ? '' : 'S');
      $('[data-ok]', m).disabled = !n;
    };
    const skipped = plan.filter((p) => p.skip);
    openModal(`<h2>Sort Downloads</h2><div class="note">Nothing has moved yet. Untick anything you want to leave alone. Nothing is ever overwritten or deleted.</div>
      <div class="pick"></div>
      ${skipped.length ? `<div class="note">Leaving ${skipped.length} alone: ${skipped.slice(0, 4).map((p) => '<b>' + esc(p.file) + '</b> (' + esc(p.skip.toLowerCase()) + ')').join(', ')}${skipped.length > 4 ? '…' : ''}</div>` : ''}
      <div class="btns" style="justify-content:flex-end"><button type="button" class="btn ghost" data-x>CANCEL</button><button type="button" class="btn accent" data-ok>SORT</button></div>`, (m) => {
      draw(m);
      $('[data-x]', m).addEventListener('click', closeModal);
      $('[data-ok]', m).addEventListener('click', async () => {
        const res = await window.cat.applySort(doable.filter((p, i) => on[i]));
        closeModal();
        app.toast(res && res.errors && res.errors.length ? 'SORTED ' + res.done + ' · ' + res.errors.length + ' FAILED' : 'SORTED ' + ((res && res.done) || 0) + ' FILES · UNDO IN HISTORY');
      });
    });
  };

  app.fileHistoryDialog = async () => {
    const h = (await window.cat.fileHistory()) || [];
    const label = { downloads: 'Downloads sort', drop: 'Drop zone', sort: 'Sort' };
    openModal(`<h2>File history</h2><div class="note">Undo puts moved files back. Copies made by the drop zone go to the Recycle Bin.</div>
      <div class="pick">${h.length ? h.map((e) => `<div class="list-row" style="cursor:default"><span class="tg">${esc(U.ago(e.ts).toUpperCase())}</span><span class="nm">${esc(label[e.kind] || e.kind)} · ${e.ops.length} file${e.ops.length === 1 ? '' : 's'} <small style="color:var(--mute)">${esc(e.ops.slice(0, 3).map((o) => o.to.split(/[\\/]/).pop()).join(', '))}</small></span>${e.undone ? '<span class="tm">UNDONE</span>' : `<button type="button" class="btn small ghost" data-undo="${esc(e.id)}">UNDO</button>`}</div>`).join('') : '<div class="empty">Nothing yet.</div>'}</div>
      <div class="btns" style="justify-content:flex-end"><button type="button" class="btn ghost" data-x>CLOSE</button></div>`, (m) => {
      $('[data-x]', m).addEventListener('click', closeModal);
      $$('[data-undo]', m).forEach((b) => b.addEventListener('click', async () => {
        const r = await window.cat.undoFiles(b.dataset.undo);
        app.toast(r.errors && r.errors.length ? 'UNDID ' + r.done + ' · ' + r.errors.length + ' COULD NOT' : 'UNDID ' + r.done + ' FILES');
        app.fileHistoryDialog();
      }));
    });
  };

  app.sortRulesDialog = async () => {
    let rules = JSON.parse(JSON.stringify((await window.cat.sortRules()) || []));
    const draw = (m) => {
      $('.pick', m).innerHTML = rules.map((r, i) => `<div class="rule-row">
        <button type="button" class="toggle ${r.enabled !== false ? 'on' : ''}" data-ron="${i}" aria-label="Turn rule ${esc(r.name)} on or off">${r.enabled !== false ? 'ON' : 'OFF'}</button>
        <input class="input" data-rf="${i}:name" value="${esc(r.name)}" aria-label="Rule name" style="width:120px">
        <input class="input" data-rf="${i}:exts" value="${esc(r.exts)}" aria-label="File types" placeholder="wav mp3" style="flex:1">
        <input class="input" data-rf="${i}:dest" value="${esc(r.dest)}" aria-label="Folder" placeholder="Folder name or full path" style="width:150px">
        <button type="button" class="btn small ghost" data-rpick="${i}" aria-label="Choose folder">…</button>
        <button type="button" class="btn small ghost" data-raction="${i}">${r.action === 'copy' ? 'COPY' : 'MOVE'}</button>
        <button type="button" class="btn small ghost" data-rup="${i}" ${i === 0 ? 'disabled' : ''} aria-label="Move rule up">↑</button>
        <button type="button" class="btn small ghost danger" data-rdel="${i}" aria-label="Delete rule">×</button></div>`).join('');
      $$('[data-rup]', m).forEach((b) => b.addEventListener('click', () => { const i = Number(b.dataset.rup); if (i > 0) { [rules[i - 1], rules[i]] = [rules[i], rules[i - 1]]; draw(m); } }));
      $$('[data-ron]', m).forEach((b) => b.addEventListener('click', () => { const r = rules[Number(b.dataset.ron)]; r.enabled = r.enabled === false; draw(m); }));
      $$('[data-raction]', m).forEach((b) => b.addEventListener('click', () => { const r = rules[Number(b.dataset.raction)]; r.action = r.action === 'copy' ? 'move' : 'copy'; draw(m); }));
      $$('[data-rdel]', m).forEach((b) => b.addEventListener('click', () => { rules.splice(Number(b.dataset.rdel), 1); draw(m); }));
      $$('[data-rpick]', m).forEach((b) => b.addEventListener('click', async () => { const p = await window.cat.pickFolder('Where should these files go?'); if (p) { rules[Number(b.dataset.rpick)].dest = p; draw(m); } }));
      $$('[data-rf]', m).forEach((inp) => inp.addEventListener('input', () => { const [i, k] = inp.dataset.rf.split(':'); rules[Number(i)][k] = inp.value; }));
    };
    openModal(`<h2>Sorting rules</h2><div class="note">File types are extensions separated by spaces. A plain folder name goes inside Downloads; a full path goes anywhere. First matching rule wins.</div>
      <div class="pick" style="display:flex;flex-direction:column;gap:8px;padding-top:10px"></div>
      <div class="btns" style="justify-content:space-between"><span class="btns"><button type="button" class="btn small ghost" data-radd>+ RULE</button><button type="button" class="btn small ghost" data-rreset>RESET</button></span><span class="btns"><button type="button" class="btn ghost" data-x>CANCEL</button><button type="button" class="btn solid" data-ok>SAVE</button></span></div>`, (m) => {
      m.querySelector('.dlg').style.width = 'min(900px, 94vw)';
      draw(m);
      $('[data-radd]', m).addEventListener('click', () => { rules.push({ id: 'r' + Date.now(), name: 'New rule', exts: '', dest: 'Other', action: 'move', enabled: true }); draw(m); });
      $('[data-rreset]', m).addEventListener('click', async () => { rules = JSON.parse(JSON.stringify(await window.cat.sortDefaults())); draw(m); });
      $('[data-x]', m).addEventListener('click', closeModal);
      $('[data-ok]', m).addEventListener('click', async () => { await app.saveSettings({ sortRules: rules.filter((r) => (r.exts || r.contains) && r.dest) }); closeModal(); app.toast('RULES SAVED'); });
    });
  };

  // First run, built like an unboxing: what's this PC for → what Catalyst found (fills in live)
  // → pick a look (previews behind the window) → one-click setups → you're set + a 3-step tour.
  app.setupWizard = () => {
    let step = 0;
    const picks = new Set();
    let pollTimer = null;
    let shownFound = false; // the count-up + tiles animate once, not on every redraw
    const packSel = Array.isArray(S.settings.packs) ? S.settings.packs.slice() : [];
    app.saveSettings({ firstRun: false, packsSeen: true }); // closing the wizard early never brings it back
    const pv = () => S.settings.privacy || {};
    const hk = () => esc((S.settings.hotkey || 'Control+Space').replace('Control', 'Ctrl').toUpperCase());
    const N = 5; const k = (n) => `<div class="wz-k">0${n} / 0${N}</div>`;
    const found = () => {
      const vis = S.items.filter((i) => !i.hidden);
      const games = vis.filter((i) => i.section === 'games');
      const apps = vis.filter((i) => i.section !== 'games' && i.kind !== 'site' && i.kind !== 'url');
      const c = S.counts || {};
      const srcs = [['steam', 'STEAM'], ['epic', 'EPIC'], ['roblox', 'ROBLOX'], ['store', 'XBOX + STORE'], ['startMenu', 'START MENU']].filter(([key]) => c[key]);
      const gamer = !packSel.length || packSel.includes('gaming');
      const tiles = (gamer ? [...games, ...apps] : [...apps, ...games]).slice(0, 12);
      const anim = !shownFound && !S.scanning;
      const tile = (it, i) => { const ic = app.iconFor(it); return `<div class="wf-tile" style="${anim ? `animation-delay:${0.35 + i * 0.07}s` : 'animation:none'}">${ic ? `<img src="${esc(ic)}" alt="">` : `<span class="ini">${esc(U.initials(it.name))}</span>`}<span>${esc(it.name)}</span></div>`; };
      return `${k(2)}<h2>${S.scanning ? 'Looking around your PC…' : 'Here’s what Catalyst found.'}</h2>
        <div class="note">${S.scanning ? 'Checking Steam, Epic, Xbox, Roblox and your Start menu. This takes a few seconds.' : 'It’s all sorted into your sidebar already. Nothing on your PC was moved or changed.'}</div>
        <div class="wf ${S.scanning ? 'scanning' : ''}">
          <div class="wf-stats"><div><b data-count="${S.scanning ? '' : games.length}">${S.scanning || anim ? '0' : games.length}</b><span>GAMES</span></div><div><b data-count="${S.scanning ? '' : apps.length}">${S.scanning || anim ? '0' : apps.length}</b><span>APPS</span></div>
            <div class="wf-src">${S.scanning ? '<i class="wf-bar"></i>' : (srcs.length ? '<span>FROM</span>' + srcs.map(([key, l]) => `<span><b>${l}</b></span>`).join('<span>·</span>') : '')}</div></div>
          ${S.scanning ? '' : tiles.length ? `<div class="wf-grid">${tiles.map(tile).join('')}</div>` : '<div class="empty">Nothing found yet. You can drag apps onto Catalyst or add them any time.</div>'}
        </div>`;
    };
    const steps = [
      () => `${k(1)}<h2>Welcome. What’s this PC for?</h2><div class="note">Pick as many as you like. Catalyst builds your sidebar around them and tucks everything else under MORE.</div>
        ${V6.packStep(app, packSel)}`,
      found,
      () => `${k(3)}<h2>Pick a look.</h2><div class="note">Click one and watch Catalyst change behind this window. Switch any time in Settings › Vibe.</div>
        <div class="wz-vibes">${Views.VIBE_CARDS.filter((v) => !v.soon).map((v) => `<button type="button" class="wz-vibe ${S.settings.vibe === v.id ? 'on' : ''}" data-wv="${v.id}" style="background:${v.bg};color:${v.fg};font-family:${v.font}"><span class="s">${esc(v.sample)}</span><span class="n">${esc(v.name)}${FREE_VIBES.includes(v.id) ? '' : app.proTag()}</span></button>`).join('')}</div>`,
      () => {
        const u = S.settings.uses || [];
        const fits = (t) => !u.length || !t.use || t.use.some((x) => u.includes(x));
        const rows = Views.WS_TEMPLATES.map((t, i) => ({ t, i, ids: Views.resolveTemplate(app, t) })).filter((r) => r.ids.length >= 2 && fits(r.t));
        return `${k(4)}<h2>Want a one-click setup?</h2><div class="note">A workspace opens a group of your apps together. These use apps you already have. Pick one, or skip this.</div>
        ${S.scanning && !rows.length ? '<div class="empty">Still finding your apps… one sec.</div>' : rows.length ? `<div class="wz-ws">${rows.map((r) => `<button type="button" class="wz-w ${picks.has(r.i) ? 'on' : ''}" data-ww="${r.i}" style="--c:${r.t.color}"><b>${esc(r.t.name)}</b><small>${esc(r.ids.map((id) => (S.items.find((x) => x.id === id) || {}).name).join(' · '))}</small></button>`).join('')}</div>` : '<div class="empty">No matches yet. You can build workspaces any time from the Workspaces screen.</div>'}`;
      },
      () => `${k(5)}<h2>You’re set.</h2><div class="note">From any app, press</div>
        <div class="wz-hotkey">${hk().split('+').map((x) => `<kbd>${x}</kbd>`).join('<i>+</i>')}</div>
        <div class="note" style="margin-top:0">to search, open anything or run a command like <b>close discord</b> or <b>focus 25</b>.</div>
        <div class="wz-priv"><div class="pk-k">STAYS ON THIS PC · NO ACCOUNT, NO SERVERS</div>
          ${[['tracking', 'Time tracking', 'Hours per app'], ['fileSearch', 'File search', 'Names only'], ['clipboard', 'Clipboard history', 'In memory only']].map(([key, l, sub]) => `<button type="button" class="wz-p ${pv()[key] !== false ? 'on' : ''}" data-wp="${key}"><b>${l}</b><small>${sub} · ${pv()[key] !== false ? 'ON' : 'OFF'}</small></button>`).join('')}</div>`
    ];
    const countUp = (m) => $$('[data-count]', m).forEach((b) => {
      const to = Number(b.dataset.count); if (!b.dataset.count || !to) return;
      const t0 = performance.now(); const dur = 900;
      const tick = (t) => { const x = Math.min(1, (t - t0) / dur); b.textContent = Math.round(to * (1 - Math.pow(1 - x, 3))); if (x < 1) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    });
    const draw = () => {
      clearInterval(pollTimer);
      const last = step === steps.length - 1;
      const nextLabel = last ? 'SHOW ME AROUND' : step === 3 && picks.size ? 'CREATE ' + picks.size + ' + NEXT' : step === 1 && S.scanning ? 'SKIP AHEAD' : 'NEXT';
      openModal(`<div class="wz">${steps[step]()}</div>
        <div class="btns" style="justify-content:space-between"><span>${step ? '<button type="button" class="btn ghost" data-back>BACK</button>' : '<button type="button" class="btn ghost" data-skip>SKIP SETUP</button>'}</span>
        <span class="btns">${last ? '<button type="button" class="btn ghost" data-done>I’LL LOOK AROUND</button>' : ''}<button type="button" class="btn accent" data-next>${nextLabel}</button></span></div>`, (m) => {
        m.querySelector('.dlg').style.width = step === 0 ? 'min(980px, 95vw)' : 'min(880px, 94vw)';
        if (step === 0) V6.bindPackStep(app, m, packSel, () => { renderNav(); draw(); });
        if (step === 1 && !S.scanning && !shownFound) { countUp(m); shownFound = true; }
        $$('[data-wv]', m).forEach((b) => b.addEventListener('click', async () => { if (!FREE_VIBES.includes(b.dataset.wv) && !app.isPro()) { app.toast(b.dataset.wv.toUpperCase() + ' IS A PRO VIBE'); return; } await app.saveSettings({ vibe: b.dataset.wv }); app.render(true); draw(); }));
        $$('[data-wp]', m).forEach((b) => b.addEventListener('click', async () => { const key = b.dataset.wp; await app.saveSettings({ privacy: { ...pv(), [key]: pv()[key] === false } }); draw(); }));
        $$('[data-ww]', m).forEach((b) => b.addEventListener('click', () => { const i = Number(b.dataset.ww); if (picks.has(i)) picks.delete(i); else if (app.isPro() || picks.size + S.workspaces.length < app.FREE.workspaces) picks.add(i); else app.toast('FREE INCLUDES 1 WORKSPACE · PRO HAS NO LIMIT'); draw(); }));
        const back = $('[data-back]', m); if (back) back.addEventListener('click', () => { step--; draw(); });
        const skip = $('[data-skip]', m); if (skip) skip.addEventListener('click', () => { closeModal(); app.render(); });
        const done = $('[data-done]', m); if (done) done.addEventListener('click', () => { closeModal(); app.go('home'); });
        $('[data-next]', m).addEventListener('click', async () => {
          if (step === 3 && picks.size) {
            for (const i of picks) { const t = Views.WS_TEMPLATES[i]; await window.cat.saveWorkspace({ name: t.name, items: Views.resolveTemplate(app, t), color: t.color }); }
            app.toast(picks.size + ' WORKSPACE' + (picks.size > 1 ? 'S' : '') + ' READY');
            picks.clear();
          }
          if (last) { closeModal(); app.startTour(); return; }
          step++; draw();
        });
        if ((step === 1 || step === 3) && S.scanning) pollTimer = setInterval(() => { if (!S.scanning) draw(); }, 600);
      });
    };
    draw();
  };

  app.addGame = async () => {
    const paths = await window.cat.pickFiles();
    if (!paths || !paths.length) return;
    const added = await window.cat.addPaths(paths, 'games');
    app.toast('ADDED ' + (Array.isArray(added) ? added.length : paths.length) + ' TO GAMES');
  };

  // Per-game profile: what happens right before the game opens.
  app.gameProfileDialog = (it) => {
    const p = JSON.parse(JSON.stringify(it.profile || { gameMode: true, pauseMusic: false, closeList: [], before: [] }));
    const pickable = S.items.filter((x) => !x.hidden && x.id !== it.id && x.section !== 'games').sort((a, b) => a.name.localeCompare(b.name));
    const draw = (m) => {
      $('.gp', m).innerHTML = `
        <div class="opt"><span class="lab">Turn on Game Mode<small>Shows the stats overlay and closes your Game Mode apps</small></span><span class="ctl"><button type="button" class="toggle ${p.gameMode ? 'on' : ''}" data-gp="gameMode">${p.gameMode ? 'ON' : 'OFF'}</button></span></div>
        <div class="opt"><span class="lab">Also close<small>${p.closeList.length ? esc(p.closeList.join(', ')) : 'Only for this game, on top of your usual Game Mode list'}</small></span><span class="ctl"><button type="button" class="btn small ghost" data-gp-close>EDIT</button></span></div>
        <div class="opt"><span class="lab">Pause music<small>If something is playing when you launch</small></span><span class="ctl"><button type="button" class="toggle ${p.pauseMusic ? 'on' : ''}" data-gp="pauseMusic">${p.pauseMusic ? 'ON' : 'OFF'}</button></span></div>
        <div class="opt"><span class="lab">Open first<small>${p.before.length ? esc(p.before.map((id) => (S.items.find((x) => x.id === id) || { name: '?' }).name).join(', ')) : 'Like Discord or a stats site. Up to 6'}</small></span>
          <span class="ctl"><select class="input" data-gp-add style="width:220px"><option value="">Add…</option>${pickable.filter((x) => !p.before.includes(x.id)).map((x) => `<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('')}</select>${p.before.length ? '<button type="button" class="btn small ghost" data-gp-clear>CLEAR</button>' : ''}</span></div>`;
      $$('[data-gp]', m).forEach((b) => b.addEventListener('click', () => { p[b.dataset.gp] = !p[b.dataset.gp]; draw(m); }));
      $('[data-gp-close]', m).addEventListener('click', () => app.processListDialog('Close for ' + it.name, p.closeList, (list) => { p.closeList = list; app.gameProfileDialog({ ...it, profile: p }); }));
      $('[data-gp-add]', m).addEventListener('change', (e) => { if (e.target.value && p.before.length < 6) { p.before.push(e.target.value); draw(m); } });
      const c = $('[data-gp-clear]', m); if (c) c.addEventListener('click', () => { p.before = []; draw(m); });
    };
    openModal(`<h2>${esc(it.name)}</h2><div class="note">This runs every time you open the game from Catalyst.</div><div class="gp"></div>
      <div class="btns" style="justify-content:space-between"><span>${it.profile ? '<button type="button" class="btn ghost danger" data-rm>REMOVE PROFILE</button>' : ''}</span><span class="btns"><button type="button" class="btn ghost" data-x>CANCEL</button><button type="button" class="btn accent" data-ok>SAVE</button></span></div>`, (m) => {
      m.querySelector('.dlg').style.width = 'min(760px, 94vw)';
      draw(m);
      $('[data-x]', m).addEventListener('click', closeModal);
      const rm = $('[data-rm]', m); if (rm) rm.addEventListener('click', async () => { await window.cat.updateItem(it.id, { profile: null }); closeModal(); app.toast('PROFILE REMOVED'); });
      $('[data-ok]', m).addEventListener('click', async () => { await window.cat.updateItem(it.id, { profile: p }); closeModal(); app.toast('PROFILE SAVED'); });
    });
  };

  app.confirmWipe = () => {
    openModal(`<h2>Delete everything?</h2>
      <div class="note">This removes every setting, pin, workspace, flow, stat and custom icon Catalyst saved on this PC, then restarts it fresh. Your actual files, apps and games are not touched. This can't be undone, so <b>export a copy first</b> if you might want it back.</div>
      <label class="field"><span>TYPE DELETE TO CONFIRM</span><input class="input" id="wipe-in" autocomplete="off"></label>
      <div class="btns" style="justify-content:flex-end"><button type="button" class="btn ghost" data-x>CANCEL</button><button type="button" class="btn danger" data-ok disabled>DELETE EVERYTHING</button></div>`, (m) => {
      const inp = $('#wipe-in', m); const ok = $('[data-ok]', m);
      inp.focus();
      inp.addEventListener('input', () => { ok.disabled = inp.value.trim().toUpperCase() !== 'DELETE'; });
      $('[data-x]', m).addEventListener('click', closeModal);
      ok.addEventListener('click', async () => { ok.disabled = true; ok.textContent = 'DELETING…'; Commands.forget(); try { localStorage.clear(); } catch (e) {} await window.cat.clearData('everything'); });
    });
  };

  app.loadFlows = async () => {
    const [flows, log, meta] = await Promise.all([window.cat.flows(), window.cat.flowLog(), S.flowMeta ? Promise.resolve(S.flowMeta) : window.cat.flowMeta()]);
    S.flows = Array.isArray(flows) ? flows : []; S.flowLog = Array.isArray(log) ? log : []; S.flowMeta = meta || S.flowMeta;
    if (S.section === 'flow' && !$('#modal').classList.contains('open')) app.render(true);
  };

  app.flowRecipes = async () => {
    if (!S.flowMeta) S.flowMeta = await window.cat.flowMeta();
    const recipes = (S.flowMeta.recipes || []);
    openModal(`<h2>Recipes</h2><div class="note">Pick one to start from. You can change everything before saving.</div>
      <div class="pick">${recipes.map((r, i) => `<button type="button" class="list-row" data-r="${i}"><span class="nm">${esc(r.name)}</span><span class="tm">USE</span></button>`).join('')}</div>
      <div class="btns" style="justify-content:flex-end"><button type="button" class="btn ghost" data-x>CLOSE</button></div>`, (m) => {
      $('[data-x]', m).addEventListener('click', closeModal);
      $$('[data-r]', m).forEach((b) => b.addEventListener('click', () => app.useRecipe(Number(b.dataset.r))));
    });
  };

  // Opens the editor pre-filled from a starter recipe (nothing is saved until the user hits Save).
  app.useRecipe = async (i) => {
    if (!S.flowMeta) S.flowMeta = await window.cat.flowMeta();
    const src = (S.flowMeta.recipes || [])[i]; if (!src) return;
    const r = JSON.parse(JSON.stringify(src));
    if (r.trigger.value === '{downloads}') r.trigger.value = S.flowMeta.downloads;
    app.flowEditor({ ...r, id: undefined, enabled: true, when: { from: '', to: '' }, cooldown: 60 });
  };

  app.flowEditor = async (orig) => {
    if (!S.flowMeta) S.flowMeta = await window.cat.flowMeta();
    const meta = S.flowMeta;
    const f = JSON.parse(JSON.stringify(orig || { name: 'New flow', enabled: true, trigger: { type: 'app-opened', value: '', days: [] }, when: { from: '', to: '' }, actions: [{ type: 'notify', value: '' }], cooldown: 60 }));
    f.trigger.days = f.trigger.days || []; f.when = f.when || { from: '', to: '' };
    const running = ((await window.cat.running()) || []).filter((p) => /\.exe$/i.test(p)).sort();
    const exeOptions = [...new Set([...S.items.filter((i) => i.exe && !i.hidden).map((i) => i.exe), ...running])].sort();
    const opt = (list, cur) => list.map(([v, l]) => `<option value="${esc(v)}" ${v === cur ? 'selected' : ''}>${esc(l)}</option>`).join('');
    const itemOpts = (cur) => opt([['', 'Choose…'], ...S.items.filter((i) => !i.hidden).sort((a, b) => a.name.localeCompare(b.name)).map((i) => [i.id, i.name])], cur);
    const wsOpts = (cur) => opt([['', 'Choose…'], ...S.workspaces.map((w) => [w.id, w.name])], cur);
    const triggerValue = () => {
      const t = f.trigger;
      if (t.type === 'app-opened' || t.type === 'app-closed') return `<input class="input" list="exe-list" data-tv value="${esc(t.value)}" placeholder="app.exe"><datalist id="exe-list">${exeOptions.map((e) => `<option value="${esc(e)}">`).join('')}</datalist>`;
      if (t.type === 'schedule') return `<input class="input" type="time" data-tv value="${esc(t.value || '09:00')}" style="width:140px"><span class="pills">${'SMTWTFS'.split('').map((d, i) => `<button type="button" class="pill ${t.days.includes(i) ? 'on' : ''}" data-day="${i}" aria-label="${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i]}">${d}</button>`).join('')}</span>`;
      if (t.type === 'workspace') return `<select class="input" data-tv>${wsOpts(t.value)}</select>`;
      if (t.type === 'file-added') return `<span class="path" style="max-width:340px">${esc(t.value || 'no folder chosen')}</span><button type="button" class="btn small ghost" data-tfolder>CHOOSE FOLDER</button>`;
      if (t.type === 'hotkey') return `<button type="button" class="hotkey-input" data-thk>${esc(t.value ? t.value.toUpperCase() : 'CLICK TO SET')}</button>`;
      return '<span class="note">No setup needed.</span>';
    };
    const actionValue = (a, i) => {
      if (a.type === 'launch') return `<select class="input" data-av="${i}">${itemOpts(a.value)}</select>`;
      if (a.type === 'workspace') return `<select class="input" data-av="${i}">${wsOpts(a.value)}</select>`;
      if (a.type === 'url') return `<input class="input" data-av="${i}" value="${esc(a.value)}" placeholder="https://">`;
      if (a.type === 'notify' || a.type === 'phone-alert') return `<input class="input" data-av="${i}" value="${esc(a.value)}" placeholder="Message">`;
      if (a.type === 'wait') return `<input class="input" type="number" min="1" max="60" data-av="${i}" value="${esc(a.value || '2')}" style="width:90px"> <span class="note">seconds</span>`;
      if (a.type === 'close-app') return `<input class="input" list="exe-list2" data-av="${i}" value="${esc(a.value)}" placeholder="app.exe"><datalist id="exe-list2">${running.map((e) => `<option value="${esc(e)}">`).join('')}</datalist><span class="note" style="color:#ff8a8a">Closes the app. Unsaved work in it could be lost.</span>`;
      return '';
    };
    const draw = (m) => {
      $('.flow-ed', m).innerHTML = `
        <label class="field"><span>NAME</span><input class="input" data-fname value="${esc(f.name)}" maxlength="60"></label>
        <div class="fe-block"><div class="fe-k">WHEN</div><div class="fe-row"><select class="input" data-ttype style="width:240px">${opt(Object.entries(meta.triggers), f.trigger.type)}</select>${triggerValue()}</div>
          <div class="fe-row"><span class="note">Only between</span><input class="input" type="time" data-from value="${esc(f.when.from)}" style="width:130px"><span class="note">and</span><input class="input" type="time" data-to value="${esc(f.when.to)}" style="width:130px"><span class="note">(optional)</span></div></div>
        <div class="fe-block"><div class="fe-k">THEN</div>${f.actions.map((a, i) => `<div class="fe-row"><span class="n">${i + 1}</span><select class="input" data-atype="${i}" style="width:280px">${opt(Object.entries(meta.actions), a.type)}</select>${actionValue(a, i)}<button type="button" class="btn small ghost" data-adel="${i}" aria-label="Remove step">×</button></div>`).join('')}
          <button type="button" class="add-step" data-aadd style="min-height:40px">+ ADD STEP</button></div>
        <div class="fe-row"><span class="note">After it runs, wait</span><input class="input" type="number" min="5" data-cool value="${f.cooldown}" style="width:100px" aria-label="Seconds to wait"><span class="note">seconds before it can run again. This stops it from firing over and over.</span></div>
        <div class="note" id="fe-preview"></div>`;
      $('[data-fname]', m).addEventListener('input', (e) => { f.name = e.target.value; });
      $('[data-ttype]', m).addEventListener('change', (e) => { f.trigger = { type: e.target.value, value: '', days: [] }; draw(m); });
      const tv = $('[data-tv]', m); if (tv) tv.addEventListener('input', () => { f.trigger.value = tv.value; });
      if (tv && tv.tagName === 'SELECT') tv.addEventListener('change', () => { f.trigger.value = tv.value; });
      $$('[data-day]', m).forEach((b) => b.addEventListener('click', () => { const d = Number(b.dataset.day); f.trigger.days = f.trigger.days.includes(d) ? f.trigger.days.filter((x) => x !== d) : [...f.trigger.days, d]; draw(m); }));
      const tf = $('[data-tfolder]', m); if (tf) tf.addEventListener('click', async () => { const p = await window.cat.pickFolder('Watch which folder?'); if (p) { f.trigger.value = p; draw(m); } });
      const thk = $('[data-thk]', m); if (thk) app.hotkeyRecorder(thk, (c) => { if (c) { f.trigger.value = c; draw(m); } });
      $('[data-from]', m).addEventListener('input', (e) => { f.when.from = e.target.value; });
      $('[data-to]', m).addEventListener('input', (e) => { f.when.to = e.target.value; });
      $('[data-cool]', m).addEventListener('input', (e) => { f.cooldown = Number(e.target.value); });
      $$('[data-atype]', m).forEach((sel) => sel.addEventListener('change', () => { f.actions[Number(sel.dataset.atype)] = { type: sel.value, value: '' }; draw(m); }));
      $$('[data-av]', m).forEach((inp) => { const fn = () => { f.actions[Number(inp.dataset.av)].value = inp.value; }; inp.addEventListener('input', fn); inp.addEventListener('change', fn); });
      $$('[data-adel]', m).forEach((b) => b.addEventListener('click', () => { f.actions.splice(Number(b.dataset.adel), 1); draw(m); }));
      $('[data-aadd]', m).addEventListener('click', () => { f.actions.push({ type: 'notify', value: '' }); draw(m); });
    };
    openModal(`<h2>${orig && orig.id ? 'Edit flow' : 'New flow'}</h2><div class="flow-ed"></div>
      <div class="btns" style="justify-content:space-between"><span class="btns">${orig && orig.id ? '<button type="button" class="btn ghost danger" data-fdel>DELETE</button>' : ''}<button type="button" class="btn ghost" data-fprev>PREVIEW</button></span><span class="btns"><button type="button" class="btn ghost" data-x>CANCEL</button><button type="button" class="btn accent" data-ok>SAVE FLOW</button></span></div>`, (m) => {
      m.querySelector('.dlg').style.width = 'min(860px, 94vw)';
      draw(m);
      $('[data-x]', m).addEventListener('click', closeModal);
      $('[data-fprev]', m).addEventListener('click', async () => { const p = await window.cat.previewFlow(f); $('#fe-preview', m).innerHTML = `<b>${esc(p.trigger)}</b>${p.activeNow ? '' : ' (outside its time window right now)'} → ${p.steps.map(esc).join(' → ') || 'nothing'}`; });
      const del = $('[data-fdel]', m); if (del) del.addEventListener('click', async () => { await window.cat.removeFlow(orig.id); closeModal(); app.loadFlows(); });
      $('[data-ok]', m).addEventListener('click', async () => {
        const needsValue = ['app-opened', 'app-closed', 'schedule', 'workspace', 'file-added', 'hotkey'];
        if (needsValue.includes(f.trigger.type) && !f.trigger.value) { app.toast('FINISH THE "WHEN" PART'); return; }
        if (!f.actions.length) { app.toast('ADD AT LEAST ONE STEP'); return; }
        const firstFlow = !(S.flows || []).length; await window.cat.saveFlow(f); closeModal(); if (firstFlow) app.celebrate(); app.toast(firstFlow ? 'YOUR FIRST FLOW IS ON' : 'FLOW SAVED'); app.loadFlows();
      });
    });
  };

  app.templatesDialog = () => {
    if (!app.isPro() && S.workspaces.length >= app.FREE.workspaces) return app.proDialog('workspaces');
    const rows = Views.WS_TEMPLATES.map((t) => ({ t, ids: Views.resolveTemplate(app, t) }));
    openModal(`<h2>Templates</h2><div class="note">Each template uses the apps you actually have installed. You can edit everything after.</div>
      <div class="pick">${rows.map((r, i) => `<button type="button" class="list-row" data-t="${i}" ${r.ids.length ? '' : 'disabled style="opacity:.4"'}><span class="tg" style="color:${r.t.color}">■</span><span class="nm">${esc(r.t.name)} <small style="color:var(--mute)">${r.ids.length ? r.ids.map((id) => esc((S.items.find((x) => x.id === id) || {}).name || '')).join(' · ') : 'none of its apps found on this PC'}</small></span><span class="tm">${r.ids.length ? 'USE' : ''}</span></button>`).join('')}</div>
      <div class="btns" style="justify-content:flex-end"><button type="button" class="btn ghost" data-x>CLOSE</button></div>`, (m) => {
      $('[data-x]', m).addEventListener('click', closeModal);
      $$('[data-t]', m).forEach((b) => b.addEventListener('click', async () => {
        const r = rows[Number(b.dataset.t)];
        const saved = await window.cat.saveWorkspace({ name: r.t.name, items: r.ids, color: r.t.color });
        closeModal();
        S.editingWs = saved.id; S.wsDraft = null;
        app.go('workspaces');
        app.toast(r.t.name.toUpperCase() + ' CREATED');
      }));
    });
  };

  function syncGameModeBtn() {
    const b = $('#btn-gamemode');
    b.classList.toggle('on', S.gameMode);
    b.textContent = S.gameMode ? 'GAME MODE ON' : 'GAME MODE';
  }

  /* ---------------- now playing + beat sync ---------------- */
  const WAVE_BARS = 64;
  function buildWave() {
    $('#wave').innerHTML = Array.from({ length: WAVE_BARS }, (_, i) => `<span style="animation-delay:${((i * 7) % 11) * 0.08}s"></span>`).join('');
  }
  function renderMedia() {
    const m = S.media;
    const playing = m && m.status === 'Playing';
    document.body.classList.toggle('np-playing', !!playing);
    $('#np-title').textContent = m && m.title ? m.title.toUpperCase() : 'NOTHING PLAYING';
    $('#np-artist').textContent = m && (m.artist || m.app) ? [m.artist, m.pos && m.end ? U.mmss(m.pos) + ' / ' + U.mmss(m.end) : ''].filter(Boolean).join(' · ').toUpperCase() || (m.app || '').toUpperCase() : 'PLAY SOMETHING';
    const artEl = $('#np-art');
    if (m && m.art) { artEl.textContent = ''; artEl.style.backgroundImage = `url('${U.fileUrl(m.art)}')`; artEl.classList.add('has-art'); }
    else { artEl.style.backgroundImage = ''; artEl.classList.remove('has-art'); artEl.textContent = m && m.title ? U.initials(m.artist || m.title).slice(0, 1) : 'C'; }
    const multi = m && m.sessions && m.sessions.length > 1;
    $('#np-switch').hidden = !multi;
    if (multi) $('#np-switch').textContent = m.sessions.length + ' PLAYING';
    $('#np-toggle').textContent = playing ? '||' : '▶';
    $('#np-toggle').setAttribute('aria-label', playing ? 'Pause' : 'Play');
    const wave = $('#wave');
    wave.classList.toggle('stopped', !playing && !beat.active);
    wave.classList.toggle('idle', playing && !beat.active);
    const progress = m && m.end ? m.pos / m.end : 0;
    $$('#wave span').forEach((s, i) => s.classList.toggle('p', i / WAVE_BARS < progress));
  }

  const beat = { active: false, stream: null, ctx: null, analyser: null, data: null, raf: 0, starting: false };
  async function startBeat() {
    const want = S.platform !== 'darwin' && S.settings && S.settings.beatSync && S.settings.animSpeed !== 'off';
    if (!want) return stopBeat();
    if (beat.active || beat.starting) return;
    beat.starting = true;
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: { width: 1, height: 1, frameRate: 1 } });
      stream.getVideoTracks().forEach((t) => t.stop());
      if (!stream.getAudioTracks().length) throw new Error('no audio');
      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.72;
      src.connect(analyser);
      Object.assign(beat, { active: true, stream, ctx, analyser, data: new Uint8Array(analyser.frequencyBinCount) });
      $('#wave').classList.remove('idle', 'stopped');
      loopBeat();
    } catch (e) {
      beat.active = false;
    }
    beat.starting = false;
  }
  function stopBeat() {
    cancelAnimationFrame(beat.raf);
    if (beat.stream) beat.stream.getTracks().forEach((t) => t.stop());
    if (beat.ctx) beat.ctx.close().catch(() => {});
    Object.assign(beat, { active: false, stream: null, ctx: null, analyser: null });
    setBeat(0);
    renderMedia();
  }
  // Only the few things that pulse get the beat value, so the rest of the window never recalculates.
  let beatEls = null, lastKick = -1;
  function setBeat(k) {
    if (!beatEls || !beatEls.every((e) => e.isConnected)) beatEls = ['#grain', '.logo', '#title', '#fx'].map((s) => $(s)).filter(Boolean);
    const v = k.toFixed(2);
    for (const el of beatEls) el.style.setProperty('--beat', v);
  }
  let bassAvg = 0;
  // Beat sync is for music. Videos (YouTube in a browser, VLC, Netflix…) shouldn't make the screen pulse.
  const MUSIC_APP = /spotify|music|itunes|tidal|deezer|soundcloud|foobar|musicbee|aimp|winamp|mediamonkey|groove|zune|audacious|qobuz|napster|pandora/i;
  const VIDEO_APP = /chrome|msedge|edge|firefox|brave|opera|vivaldi|arc|vlc|netflix|youtube|twitch|mpc|potplayer|mpv|movies|video|plex|kodi|disney|hulu|prime/i;
  app.isMusicPlaying = () => {
    const m = S.media;
    if (!m || m.status !== 'Playing') return false;
    const a = String(m.app || '');
    if (VIDEO_APP.test(a) && !/music/i.test(a)) return false;
    return MUSIC_APP.test(a);
  };
  function loopBeat() {
    if (!beat.active) return;
    beat.analyser.getByteFrequencyData(beat.data);
    const d = beat.data;
    if (!app.isMusicPlaying()) {
      // not music: settle everything back to rest and check again next frame
      bassAvg = 0;
      if (lastKick !== 0) { lastKick = 0; setBeat(0); for (const sp of $('#wave').children) sp.style.transform = 'scaleY(0.06)'; }
      if (window.__wallBeat && (beat.n = (beat.n || 0) + 1) % 30 === 0) window.cat.beat(0);
      if (document.body.classList.contains('fx-rest') && !window.__wallBeat) { beat.raf = 0; beat.sleeping = true; return; }
      beat.raf = requestAnimationFrame(loopBeat); return;
    }
    let bass = 0;
    for (let i = 1; i < 8; i++) bass += d[i];
    bass /= 7 * 255;
    bassAvg = bassAvg * 0.92 + bass * 0.08;
    const kick = Math.max(0, Math.min(1, (bass - bassAvg) * 5));
    if (window.__wallBeat && (beat.n = (beat.n || 0) + 1) % 2 === 0) window.cat.beat(Math.round(kick * 1000) / 1000);
    // Not looking at Catalyst: keep feeding the live wallpaper, skip drawing anything here.
    if (document.body.classList.contains('fx-rest')) {
      if (!window.__wallBeat) { beat.raf = 0; beat.sleeping = true; return; }
      beat.raf = requestAnimationFrame(loopBeat); return;
    }
    if (Math.abs(kick - lastKick) > 0.02) { lastKick = kick; setBeat(kick); }
    const spans = $('#wave').children;
    const step = Math.max(1, Math.floor((d.length * 0.7) / WAVE_BARS));
    for (let i = 0; i < spans.length; i++) {
      const v = d[Math.min(d.length - 1, i * step)] / 255;
      spans[i].style.transform = 'scaleY(' + Math.max(0.06, v).toFixed(3) + ')';
    }
    beat.raf = requestAnimationFrame(loopBeat);
  }

  /* ---------------- command bar ---------------- */
  let palResults = [];
  let palIndex = 0;
  function openPalette(prefill = '') {
    closeMenu();
    $('#palette').classList.add('open');
    const inp = $('#pal-input');
    inp.value = prefill;
    inp.focus();
    updatePalette();
  }
  function closePalette() { $('#palette').classList.remove('open'); }
  const updatePalette = U.debounce(async () => {
    const q = $('#pal-input').value;
    const res = await Commands.build(app, q);
    if ($('#pal-input').value !== q) return; // typed more while we were searching
    palResults = res;
    palIndex = 0;
    drawPalette();
    // first file search builds the index; show file results as soon as it's ready
    if (res.pending) res.pending.then(() => { if ($('#palette').classList.contains('open') && $('#pal-input').value === q) updatePalette(); });
  }, 25);
  function drawPalette() {
    let last = '';
    $('#pal-res').innerHTML = palResults.map((r, i) => {
      const head = r.group && r.group !== last && r.group !== 'ANSWER' ? `<div class="pal-group" role="presentation">${esc(r.group)}${r.group === 'RECENT SEARCHES' ? '<button type="button" class="pal-clear" data-pal-forget>CLEAR</button>' : ''}</div>` : '';
      last = r.group;
      return head + `<button type="button" role="option" class="pal-row ${i === palIndex ? 'on' : ''} ${r.answer ? 'answer' : ''}" data-pal="${i}" aria-selected="${i === palIndex}">
      ${r.answer ? '' : r.icon ? `<img class="ico" src="${esc(r.icon)}" alt="">` : `<span class="initials">${esc(r.initials || '')}</span>`}
      <span class="nm">${esc(r.label)}${r.sub ? `<small>${esc(r.sub)}</small>` : ''}</span><span class="tg">${esc(r.tag || '')}</span></button>`;
    }).join('') || '<div class="pal-group">NOTHING FOUND</div>';
    const cur = palResults[palIndex];
    $('#pal-hint').textContent = cur && cur.reveal ? 'SHIFT+ENTER SHOW IN FOLDER' : '';
    const on = $('#pal-res .on');
    if (on) on.scrollIntoView({ block: 'nearest' });
  }
  async function runPalette(i, reveal) {
    const r = palResults[i];
    if (!r) return;
    if (r.fill) { $('#pal-input').value = r.fill; updatePalette(); return; }
    const q = $('#pal-input').value;
    if (!r.answer) Commands.remember(q);
    closePalette();
    try {
      if (reveal && r.reveal) await window.cat.reveal(r.reveal);
      else await r.run();
    } catch (e) { app.toast('SOMETHING WENT WRONG'); }
  }

  // Jump to one setting from search, and flash it so it's easy to spot.
  app.openSetting = (tab, label) => {
    S.settingsTab = tab === 'library' ? 'customize' : tab;
    app.go('settings');
    requestAnimationFrame(() => {
      const want = label.toLowerCase();
      const el = $$('#content .opt, #content .row-label').find((x) => (x.querySelector('.lab, span') || x).textContent.toLowerCase().includes(want))
        || $$('#content .opt, #content .row-label').find((x) => x.textContent.toLowerCase().includes(want.split(' ')[0]));
      if (el) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1800); }
    });
  };

  /* ---------------- context menu ---------------- */
  function openMenu(x, y, html, bind) {
    const m = $('#menu');
    m.innerHTML = html;
    m.classList.add('open');
    const w = m.offsetWidth; const h = m.offsetHeight;
    m.style.left = Math.min(x, innerWidth - w - 8) + 'px';
    m.style.top = Math.min(y, innerHeight - h - 8) + 'px';
    bind(m);
    const first = m.querySelector('button');
    if (first) first.focus();
  }
  function closeMenu() { $('#menu').classList.remove('open'); }

  // Short right-click menu: the everyday actions up top; "Move to" and the rarer ones open as a second page in place.
  function itemMenu(it, x, y, page) {
    const secs = S.sections.filter((s) => !V6.VIEW_SECTIONS.includes(s.id) && s.id !== it.section);
    const canReveal = it.target && !/^[a-z]+:\/\//i.test(it.target) && it.kind !== 'uwp';
    const back = '<button type="button" data-page="" class="m-back">‹ BACK</button><hr>';
    const html = page === 'move' ? `${back}<div class="sub">MOVE ${esc(it.name.toUpperCase().slice(0, 22))} TO</div>${secs.map((s) => `<button type="button" data-move="${esc(s.id)}">${esc(s.label)}</button>`).join('')}`
      : page === 'more' ? `${back}<button type="button" data-m="icon">CHANGE ICON</button>
        ${canReveal ? '<button type="button" data-m="reveal">SHOW FILE LOCATION</button>' : ''}
        ${it.exe ? '<button type="button" data-m="close">CLOSE IF RUNNING</button>' : ''}`
      : `<button type="button" data-m="open">OPEN</button>
      <button type="button" data-m="pin">${it.pinned ? 'UNPIN' : 'PIN TO HOME'}</button>
      ${it.section === 'games' ? `<button type="button" data-m="fav">${it.favorite ? '★ UNFAVORITE' : '☆ FAVORITE'}</button><button type="button" data-m="profile">${it.profile ? 'EDIT GAME PROFILE' : 'GAME PROFILE…'}${app.proTag()}</button>` : ''}
      <button type="button" data-m="rename">RENAME</button>
      <button type="button" data-m="hotkey">${it.hotkey ? 'HOTKEY: ' + esc(it.hotkey.toUpperCase()) : 'SET HOTKEY'}</button>
      <button type="button" data-page="move" class="m-more">MOVE TO <span>›</span></button>
      <button type="button" data-page="more" class="m-more">MORE <span>›</span></button>
      <hr><button type="button" data-m="hide">${it.source === 'Added' || it.source === 'Default' ? 'REMOVE' : 'HIDE'}</button>`;
    openMenu(x, y, html, (m) => {
      m.querySelectorAll('[data-page]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); itemMenu(it, x, y, b.dataset.page); }));
      m.querySelectorAll('[data-move]').forEach((b) => b.addEventListener('click', () => { closeMenu(); window.cat.updateItem(it.id, { section: b.dataset.move }); app.toast('MOVED TO ' + b.textContent); }));
      m.querySelectorAll('[data-m]').forEach((b) => b.addEventListener('click', async () => {
        closeMenu();
        const a = b.dataset.m;
        if (a === 'open') app.launch(it.id);
        if (a === 'pin') window.cat.updateItem(it.id, { pinned: !it.pinned });
        if (a === 'fav') { await window.cat.updateItem(it.id, { favorite: !it.favorite }); app.toast(it.favorite ? 'UNFAVORITED' : '★ ' + it.name.toUpperCase()); }
        if (a === 'profile') app.gameProfileDialog(it);
        if (a === 'rename') app.promptDialog('Rename', 'NAME', it.name, (v) => v && window.cat.updateItem(it.id, { name: v }));
        if (a === 'icon') window.cat.setIcon(it.id);
        if (a === 'hotkey') app.hotkeyDialog(it);
        if (a === 'reveal') window.cat.reveal(it.target);
        if (a === 'close') { const ok = await window.cat.closeProcess(it.exe); app.toast(ok ? 'CLOSED' : 'NOT RUNNING'); }
        if (a === 'hide') window.cat.removeItem(it.id);
      }));
    });
  }

  /* ---------------- dialogs ---------------- */
  function openModal(html, bind) {
    const m = $('#modal');
    m.innerHTML = `<div class="dlg" role="dialog" aria-modal="true">${html}</div>`;
    m.classList.add('open');
    bind && bind(m);
    const f = m.querySelector('input, textarea, button');
    if (f) f.focus();
  }
  function closeModal() { $('#modal').classList.remove('open'); $('#modal').innerHTML = ''; }
  app.closeModal = closeModal;
  app.openModal = openModal;

  app.promptDialog = (title, label, value, done) => {
    openModal(`<h2>${esc(title)}</h2><label class="field"><span>${esc(label)}</span><input class="input" id="pd" value="${esc(value || '')}" maxlength="60"></label>
      <div class="btns" style="justify-content:flex-end"><button type="button" class="btn ghost" data-x>CANCEL</button><button type="button" class="btn solid" data-ok>SAVE</button></div>`, (m) => {
      const ok = async () => { const v = $('#pd', m).value.trim(); closeModal(); await done(v); };
      $('[data-ok]', m).addEventListener('click', ok);
      $('[data-x]', m).addEventListener('click', closeModal);
      $('#pd', m).addEventListener('keydown', (e) => { if (e.key === 'Enter') ok(); });
      $('#pd', m).select();
    });
  };

  app.hotkeyDialog = (it) => {
    if (!it.hotkey && !app.isPro() && S.items.filter((x) => x.hotkey && !x.hidden).length >= app.FREE.hotkeys) return app.proDialog('hotkeys');
    openModal(`<h2>Hotkey for ${esc(it.name)}</h2><div class="note">Press the keys you want (with Ctrl, Alt or Shift). It works from anywhere, even when Catalyst is hidden.</div>
      <button type="button" class="hotkey-input" id="hk" style="width:100%;height:56px">${esc(it.hotkey ? it.hotkey.toUpperCase() : 'CLICK, THEN PRESS KEYS')}</button>
      <div class="btns" style="justify-content:flex-end">${it.hotkey ? '<button type="button" class="btn ghost" data-clear>REMOVE</button>' : ''}<button type="button" class="btn ghost" data-x>CLOSE</button></div>`, (m) => {
      app.hotkeyRecorder($('#hk', m), async (combo) => { if (!combo) return; await window.cat.updateItem(it.id, { hotkey: combo }); closeModal(); app.toast(combo.toUpperCase() + ' OPENS ' + it.name.toUpperCase()); });
      $('[data-x]', m).addEventListener('click', closeModal);
      const c = $('[data-clear]', m);
      if (c) c.addEventListener('click', async () => { await window.cat.updateItem(it.id, { hotkey: '' }); closeModal(); });
    });
  };

  app.confirm = (text, done) => {
    openModal(`<h2>${esc(text)}</h2><div class="btns" style="justify-content:flex-end"><button type="button" class="btn ghost" data-x>CANCEL</button><button type="button" class="btn accent" data-ok>YES</button></div>`, (m) => {
      $('[data-ok]', m).addEventListener('click', async () => { closeModal(); await done(); app.render(); });
      $('[data-x]', m).addEventListener('click', closeModal);
    });
  };

  app.siteDialog = (section) => {
    openModal(`<h2>Add a site</h2>
      <label class="field"><span>NAME</span><input class="input" id="sn" placeholder="DistroKid" maxlength="40"></label>
      <label class="field"><span>ADDRESS</span><input class="input" id="su" placeholder="https://distrokid.com/dashboard"></label>
      <div class="btns" style="justify-content:flex-end"><button type="button" class="btn ghost" data-x>CANCEL</button><button type="button" class="btn solid" data-ok>ADD</button></div>`, (m) => {
      $('[data-x]', m).addEventListener('click', closeModal);
      $('[data-ok]', m).addEventListener('click', async () => {
        let url = $('#su', m).value.trim(); const name = $('#sn', m).value.trim();
        if (!url) return;
        if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
        closeModal();
        await window.cat.addItem({ name: name || url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0], kind: 'site', launch: url, target: url, section });
      });
    });
  };

  app.releaseDialog = () => {
    openModal(`<h2>Add a release</h2>
      <label class="field"><span>TITLE</span><input class="input" id="rt" placeholder="New single" maxlength="60"></label>
      <label class="field"><span>RELEASE DATE</span><input class="input" id="rd" type="date"></label>
      <label class="field"><span>PRE-SAVE / HYPERFOLLOW LINK (OPTIONAL)</span><input class="input" id="rl" placeholder="https://distrokid.com/hyperfollow/…"></label>
      <div class="btns" style="justify-content:flex-end"><button type="button" class="btn ghost" data-x>CANCEL</button><button type="button" class="btn solid" data-ok>ADD</button></div>`, (m) => {
      $('[data-x]', m).addEventListener('click', closeModal);
      $('[data-ok]', m).addEventListener('click', async () => {
        const title = $('#rt', m).value.trim(); const date = $('#rd', m).value;
        let link = $('#rl', m).value.trim();
        if (link && !/^https?:\/\//i.test(link)) link = 'https://' + link;
        if (!title || !date) return;
        closeModal();
        await app.saveSettings({ releases: [...(S.settings.releases || []), { title, date, link, stages: {} }] });
        app.render();
      });
    });
  };

  app.linkDialog = () => {
    openModal(`<h2>Add a dashboard</h2>
      <label class="field"><span>NAME</span><input class="input" id="ln" placeholder="DistroKid" maxlength="40"></label>
      <label class="field"><span>ADDRESS</span><input class="input" id="lu" placeholder="https://"></label>
      <div class="btns" style="justify-content:flex-end"><button type="button" class="btn ghost" data-x>CANCEL</button><button type="button" class="btn solid" data-ok>ADD</button></div>`, (m) => {
      $('[data-x]', m).addEventListener('click', closeModal);
      $('[data-ok]', m).addEventListener('click', async () => {
        let url = $('#lu', m).value.trim(); const name = $('#ln', m).value.trim();
        if (!url || !name) return;
        if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
        closeModal();
        await app.saveSettings({ links: [...(S.settings.links || []), { name, url }] });
        app.render();
      });
    });
  };

  app.pickItemsDialog = (selected, done, title = 'Add to workspace', withFiles = true) => {
    const sel = [...selected];
    const draw = (m, q) => {
      const list = app.visibleItems().filter((i) => !q || U.score(q, i.name) >= 0).sort((a, b) => (q ? U.score(q, b.name) - U.score(q, a.name) : a.name.localeCompare(b.name))).slice(0, 80);
      $('.pick', m).innerHTML = list.map((it) => `<button type="button" class="list-row ${sel.includes(it.id) ? 'sel' : ''}" data-pick="${esc(it.id)}"><span class="tg">${esc(U.kindLabel(it))}</span><span class="nm">${esc(it.name)}</span><span class="tm">${sel.includes(it.id) ? '✓ ' + (sel.indexOf(it.id) + 1) : ''}</span></button>`).join('');
      $$('[data-pick]', m).forEach((b) => b.addEventListener('click', () => { const id = b.dataset.pick; const i = sel.indexOf(id); if (i >= 0) sel.splice(i, 1); else sel.push(id); draw(m, $('#pq', m).value); }));
    };
    openModal(`<h2>${esc(title)}</h2><label class="field"><span>SEARCH</span><input class="input" id="pq" placeholder="type to filter"></label><div class="pick"></div>
      <div class="btns" style="justify-content:space-between">${withFiles ? '<button type="button" class="btn ghost" data-files>+ FILES / FOLDERS</button>' : '<span></span>'}<span class="btns"><button type="button" class="btn ghost" data-x>CANCEL</button><button type="button" class="btn solid" data-ok>DONE</button></span></div>`, (m) => {
      draw(m, '');
      $('#pq', m).addEventListener('input', (e) => draw(m, e.target.value));
      $('[data-x]', m).addEventListener('click', closeModal);
      $('[data-ok]', m).addEventListener('click', () => { closeModal(); done(sel); });
      const fb = $('[data-files]', m); if (fb) fb.addEventListener('click', async () => {
        const paths = await window.cat.pickFiles();
        if (!paths.length) return;
        const added = await window.cat.addPaths(paths, 'files');
        added.forEach((a) => sel.push(a.id));
        S.items.push(...added);
        draw(m, $('#pq', m).value);
      });
    });
  };

  app.processListDialog = (title, list, done) => {
    const cur = [...list];
    const draw = async (m) => {
      const running = ((await window.cat.running()) || []).filter((p) => p.endsWith('.exe') && !/^(svchost|system|csrss|wininit|winlogon|services|lsass|smss|dwm|explorer|catalyst|conhost|runtimebroker|searchhost|fontdrvhost|ctfmon|sihost|taskhostw|dllhost|audiodg|spoolsv|registry|memory compression|securityhealthservice|wmiprvse|textinputhost|startmenuexperiencehost|shellexperiencehost|applicationframehost|backgroundtaskhost|smartscreen|msedgewebview2|powershell|electron)\.exe$/i.test(p)).sort();
      const all = [...new Set([...cur, ...running])];
      $('.pick', m).innerHTML = all.map((p) => `<button type="button" class="list-row ${cur.includes(p) ? 'sel' : ''}" data-p="${esc(p)}"><span class="nm">${esc(p)}</span><span class="tm">${cur.includes(p) ? '✓ CLOSE' : running.includes(p) ? 'RUNNING' : ''}</span></button>`).join('') || '<div class="empty">Nothing running.</div>';
      $$('[data-p]', m).forEach((b) => b.addEventListener('click', () => { const p = b.dataset.p; const i = cur.indexOf(p); if (i >= 0) cur.splice(i, 1); else cur.push(p); draw(m); }));
    };
    openModal(`<h2>${esc(title)}</h2><div class="note">Pick apps to close. Running apps are listed so you can tap them.</div><div class="pick"><div class="empty">Loading…</div></div>
      <div class="btns" style="justify-content:flex-end"><button type="button" class="btn ghost" data-x>CANCEL</button><button type="button" class="btn solid" data-ok>SAVE</button></div>`, (m) => {
      draw(m);
      $('[data-x]', m).addEventListener('click', closeModal);
      $('[data-ok]', m).addEventListener('click', () => { closeModal(); done(cur); });
    });
  };
  app.closeFirstDialog = (draft) => app.processListDialog('Close before launching', draft.closeFirst, (list) => { draft.closeFirst = list; app.render(true); });

  app.hotkeyRecorder = (btn, done) => {
    btn.addEventListener('click', () => {
      btn.classList.add('rec'); btn.textContent = 'PRESS KEYS… (ESC CLEARS)';
      const onKey = (e) => {
        e.preventDefault(); e.stopPropagation();
        if (e.key === 'Escape') { finish(''); return; }
        if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;
        const parts = [];
        if (e.ctrlKey) parts.push('Control');
        if (e.altKey) parts.push('Alt');
        if (e.shiftKey) parts.push('Shift');
        if (e.metaKey) parts.push('Super');
        if (!parts.length) return;
        const key = e.code.startsWith('Key') ? e.code.slice(3) : e.code.startsWith('Digit') ? e.code.slice(5) : e.key === ' ' ? 'Space' : e.key.length === 1 ? e.key.toUpperCase() : e.key;
        finish(parts.join('+') + '+' + key);
      };
      const finish = (combo) => { window.removeEventListener('keydown', onKey, true); btn.classList.remove('rec'); done(combo); };
      window.addEventListener('keydown', onKey, true);
    });
  };

  /* ---------------- audio preview (bounces) ---------------- */
  let preview = null;
  app.previewAudio = (file, btn) => {
    if (preview && preview.src === U.fileUrl(file.path) && !preview.paused) { preview.pause(); btn.textContent = '▶'; return; }
    if (preview) preview.pause();
    $$('[data-play]').forEach((b) => { b.textContent = '▶'; });
    preview = new Audio(U.fileUrl(file.path));
    preview.play().then(() => { btn.textContent = '||'; }).catch(() => app.toast('COULD NOT PLAY'));
    preview.onended = () => { btn.textContent = '▶'; };
  };

  /* ---------------- focus timer ---------------- */
  let focusTimer = null;
  app.startFocus = (mins) => {
    S.focus = { end: Date.now() + mins * 60000, mins };
    clearInterval(focusTimer);
    focusTimer = setInterval(() => {
      const el = $('#focus-clock');
      if (el) el.textContent = app.focusLabel();
      if (S.focus && Date.now() >= S.focus.end) {
        window.cat.notify('Focus done', S.focus.mins + ' minutes. Take a break.');
        app.toast('FOCUS DONE');
        app.stopFocus();
        if (S.section === 'mypc') app.render(true);
      }
    }, 1000);
    app.toast('FOCUS ' + mins + ' MIN');
  };
  app.stopFocus = () => { S.focus = null; clearInterval(focusTimer); };
  app.focusLabel = () => S.focus ? U.mmss((S.focus.end - Date.now()) / 1000) : '25:00';

  /* ---------------- drag and drop ---------------- */
  let dragDepth = 0;
  app.handleDrop = async (e, target) => {
    const files = [...(e.dataTransfer.files || [])].map((f) => window.cat.pathForFile(f)).filter(Boolean);
    if (!files.length) return;
    if (target === 'dropzone') {
      if (!app.pro('dropzone')) return;
      const r = await window.cat.drop(files);
      if (!Array.isArray(r)) return app.toast('DROP FAILED');
      const ok = r.filter((x) => x.ok).length;
      app.toast(ok ? 'FILED ' + ok + ' FILE' + (ok === 1 ? '' : 'S') : (r[0] && r[0].reason ? r[0].reason.toUpperCase() : 'NOTHING FILED'));
      if (S.section === 'studio') app.render(true);
      return;
    }
    const section = target || (V6.VIEW_SECTIONS.includes(S.section) ? undefined : S.section);
    await window.cat.addPaths(files, section);
    app.toast('ADDED ' + files.length + (section ? ' TO ' + (S.sections.find((s) => s.id === section) || { label: section }).label : ''));
  };

  function setupDrop() {
    window.addEventListener('dragenter', (e) => { if ([...e.dataTransfer.types].includes('Files')) { dragDepth++; $('#drop-overlay').classList.add('on'); $('#drop-overlay span').textContent = S.section === 'studio' ? 'DROP ON THE DROP ZONE TO FILE IT · ANYWHERE ELSE TO PIN IT' : 'PIN TO ' + (($('#title').textContent) || 'CATALYST'); } });
    window.addEventListener('dragleave', () => { dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) $('#drop-overlay').classList.remove('on'); });
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('drop', (e) => {
      e.preventDefault(); dragDepth = 0; $('#drop-overlay').classList.remove('on');
      const navTarget = e.target.closest && e.target.closest('[data-drop-section]');
      app.handleDrop(e, navTarget ? navTarget.dataset.dropSection : undefined);
    });
  }

  /* ---------------- splash + tour ---------------- */
  function runSplash(counts) {
    const sp = $('#splash');
    if ((!S.settings.startupAnimation && !S.settings.firstRun) || S.settings.animSpeed === 'off') { sp.remove(); return Promise.resolve(); } // the first launch always gets the intro
    const c = counts || {};
    const games = (c.steam || 0) + (c.epic || 0) + (c.roblox || 0);
    const apps = S.items.length;
    const lines = [
      `> SCANNING GAMES ....... ${games || '…'}`,
      `> APPS + SITES ......... ${apps}`,
      `> WORKSPACES ........... ${S.workspaces.length}`,
      '> TIME TRACKER ......... ON',
      '> VIBE ................. ' + String(S.settings.vibe).toUpperCase()
    ];
    $('#splash-log').innerHTML = lines.map((l, i) => `<span style="animation-delay:${0.9 + i * 0.22}s${i === 4 ? ';color:var(--accent)' : ''}">${esc(l)}</span>`).join('');
    return new Promise((resolve) => {
      const done = () => { sp.classList.add('out'); setTimeout(() => { sp.remove(); resolve(); }, 500); };
      const t = setTimeout(done, 2500);
      sp.addEventListener('click', () => { clearTimeout(t); done(); }, { once: true });
    });
  }

  // Three quick stops that point at the real thing on screen.
  const TOUR = [
    ['#navlist', 'YOUR SIDEBAR', 'Your stuff, sorted.', 'Each tab is one part of your PC. Tabs you don’t use wait under <b>MORE</b>. Reorder or rename them in Settings › Customize.'],
    ['#open-search', 'FROM ANYWHERE', () => `Press ${esc((S.settings.hotkey || 'Control+Space').replace('Control', 'Ctrl'))}.`, 'Even inside a game or another app. Type to open anything, or try <b>close discord</b>, <b>5 km to mi</b> or <b>focus 25</b>.'],
    ['#content .tile, #content .cover, #content .hero-card', 'MAKE IT YOURS', 'Right-click anything.', 'Pin it, rename it, give it a hotkey, move it to another tab or hide it. Drag files onto the window to add them.']
  ];
  let tourStep = 0;
  app.startTour = () => {
    tourStep = 0;
    if (S.section !== 'home') app.go('home');
    $('#tour').classList.add('open');
    requestAnimationFrame(() => requestAnimationFrame(drawTour));
  };
  function drawTour() {
    const [sel, k, h, p] = TOUR[tourStep];
    const target = $$(sel).find((x) => x.offsetParent !== null && x.getBoundingClientRect().width > 0);
    const T = $('#tour');
    T.innerHTML = `${target ? '<div class="tour-hole"></div>' : ''}<div class="tour-card"><div class="k">${String(tourStep + 1).padStart(2, '0')} / ${String(TOUR.length).padStart(2, '0')} · ${k}</div><h2>${typeof h === 'function' ? h() : h}</h2><p>${p}</p>
      <div style="display:flex;justify-content:space-between;align-items:center"><div class="dots">${TOUR.map((_, i) => `<i class="${i === tourStep ? 'on' : ''}"></i>`).join('')}</div>
      <div class="btns"><button type="button" class="btn small ghost" data-skip>SKIP</button><button type="button" class="btn small accent" data-next>${tourStep === TOUR.length - 1 ? 'DONE' : 'NEXT'}</button></div></div></div>`;
    T.classList.toggle('spot', !!target);
    const card = $('.tour-card', T);
    if (target) {
      target.scrollIntoView({ block: 'nearest' });
      const r = target.getBoundingClientRect(); const pad = 8;
      const box = { l: Math.max(4, r.left - pad), t: Math.max(4, r.top - pad), w: Math.min(r.width + pad * 2, innerWidth - 8), h: Math.min(r.height + pad * 2, innerHeight - 8) };
      Object.assign($('.tour-hole', T).style, { left: box.l + 'px', top: box.t + 'px', width: box.w + 'px', height: box.h + 'px' });
      const cw = Math.min(420, innerWidth - 32); const ch = card.offsetHeight || 220;
      let x; let y;
      if (box.l + box.w + 24 + cw < innerWidth) { x = box.l + box.w + 24; y = Math.min(Math.max(16, box.t), innerHeight - ch - 16); } // to the right
      else if (box.t + box.h + 24 + ch < innerHeight) { x = Math.min(Math.max(16, box.l + box.w - cw), innerWidth - cw - 16); y = box.t + box.h + 24; } // below
      else { x = Math.max(16, box.l - cw - 24); y = Math.min(Math.max(16, box.t), innerHeight - ch - 16); } // to the left
      Object.assign(card.style, { position: 'absolute', left: x + 'px', top: y + 'px', width: cw + 'px' });
    }
    $('#tour [data-skip]').addEventListener('click', endTour);
    $('#tour [data-next]').addEventListener('click', () => { if (tourStep < TOUR.length - 1) { tourStep++; drawTour(); } else endTour(); });
    $('#tour [data-next]').focus();
  }
  window.addEventListener('resize', () => { if ($('#tour').classList.contains('open')) drawTour(); });
  function endTour() { $('#tour').classList.remove('open', 'spot'); $('#tour').innerHTML = ''; if (S.settings.firstRun) app.saveSettings({ firstRun: false }); }

  /* ---------------- controller ---------------- */
  const pad = { last: {}, focus: null, held: {}, t: 0 };
  function gpFocusables() { return $$('#content button:not([disabled]), #navlist button, #player button').filter((b) => b.offsetParent !== null); }
  function gpMove(dx, dy) {
    const els = gpFocusables();
    if (!els.length) return;
    let cur = pad.focus && document.body.contains(pad.focus) ? pad.focus : null;
    if (!cur) { cur = els.find((e) => e.closest('#content')) || els[0]; return setPadFocus(cur); }
    const r = cur.getBoundingClientRect();
    const cx = r.left + r.width / 2; const cy = r.top + r.height / 2;
    let best = null; let bestScore = Infinity;
    for (const e of els) {
      if (e === cur) continue;
      const b = e.getBoundingClientRect();
      const x = b.left + b.width / 2 - cx; const y = b.top + b.height / 2 - cy;
      if (dx && Math.sign(x) !== dx) continue;
      if (dy && Math.sign(y) !== dy) continue;
      const main = dx ? Math.abs(x) : Math.abs(y);
      const cross = dx ? Math.abs(y) : Math.abs(x);
      if (main < 4) continue;
      const s = main + cross * 2.2;
      if (s < bestScore) { bestScore = s; best = e; }
    }
    if (best) setPadFocus(best);
  }
  function setPadFocus(el) {
    if (pad.focus) pad.focus.classList.remove('gp-focus');
    pad.focus = el;
    el.classList.add('gp-focus');
    el.focus({ preventScroll: true });
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  function padPress(name, pressed, fn) {
    const was = pad.last[name];
    pad.last[name] = pressed;
    if (pressed && !was) { pad.held[name] = Date.now() + 380; fn(); }
    else if (pressed && pad.held[name] && Date.now() > pad.held[name]) { pad.held[name] = Date.now() + 110; fn(); }
  }
  function pollPad() {
    const gp = [...(navigator.getGamepads ? navigator.getGamepads() : [])].find(Boolean);
    if (gp && document.hasFocus()) {
      const b = (i) => gp.buttons[i] && gp.buttons[i].pressed;
      const ax = gp.axes[0] || 0; const ay = gp.axes[1] || 0;
      const palOpen = $('#palette').classList.contains('open');
      padPress('up', b(12) || ay < -0.6, () => palOpen ? movePal(-1) : gpMove(0, -1));
      padPress('down', b(13) || ay > 0.6, () => palOpen ? movePal(1) : gpMove(0, 1));
      padPress('left', b(14) || ax < -0.6, () => !palOpen && gpMove(-1, 0));
      padPress('right', b(15) || ax > 0.6, () => !palOpen && gpMove(1, 0));
      padPress('a', b(0), () => { if (palOpen) runPalette(palIndex); else if (pad.focus) pad.focus.click(); });
      padPress('b', b(1), () => { if (palOpen) closePalette(); else if ($('#modal').classList.contains('open')) closeModal(); else app.go('home'); });
      padPress('lb', b(4), () => cycleSection(-1));
      padPress('rb', b(5), () => cycleSection(1));
      padPress('start', b(9), () => (palOpen ? closePalette() : openPalette()));
      padPress('y', b(3), () => app.toggleGameMode());
    }
    if (!(navigator.getGamepads ? [...navigator.getGamepads()] : []).some(Boolean)) { pad.polling = false; return; } // controller unplugged: stop checking
    requestAnimationFrame(pollPad);
  }
  function cycleSection(d) {
    const vis = app.navSections();
    const i = vis.findIndex((s) => s.id === S.section);
    app.go(vis[(i + d + vis.length) % vis.length].id);
    pad.focus = null;
  }
  function movePal(d) { if (!palResults.length) return; palIndex = (palIndex + d + palResults.length) % palResults.length; drawPalette(); }

  /* ---------------- events ---------------- */
  function bindGlobal() {
    // Toggles click on or off (sound is off unless UI sounds is on).
    document.addEventListener('click', (e) => { const t = e.target.closest('.toggle'); if (t && !t.disabled) app.sfx(t.classList.contains('on') ? 'off' : 'on'); }, true);
    document.addEventListener('click', (e) => {
      const gs = e.target.closest('[data-go-settings]');
      if (gs) { S.settingsTab = gs.dataset.goSettings; return app.go('settings'); }
      if (e.target.closest('[data-ec-scan]')) return app.rescan();
      const t = e.target.closest('[data-item],[data-ws],[data-go],[data-path],[data-url],[data-win],[data-media]');
      if (!e.target.closest('#menu')) closeMenu();
      if (!t) return;
      if (t.dataset.item) return app.launch(t.dataset.item);
      if (t.dataset.ws) return app.launchWorkspace(t.dataset.ws);
      if (t.dataset.go) return app.go(t.dataset.go);
      if (t.dataset.path) return window.cat.launchPath(t.dataset.path);
      if (t.dataset.url) return window.cat.launchUrl(t.dataset.url);
      if (t.dataset.win) return window.cat.win(t.dataset.win);
      if (t.dataset.media) return window.cat.mediaKey(t.dataset.media);
    });
    document.addEventListener('contextmenu', (e) => {
      const nav = e.target.closest('[data-nav]');
      if (nav) {
        const mm = V6.navMenu(app, nav.dataset.nav); if (!mm) return;
        e.preventDefault();
        return openMenu(e.clientX, e.clientY, mm.html, (menu) => menu.querySelectorAll('[data-nm]').forEach((b) => b.addEventListener('click', () => { closeMenu(); mm.run(b.dataset.nm); })));
      }
      const t = e.target.closest('[data-item]');
      if (!t) return;
      e.preventDefault();
      const it = S.items.find((i) => i.id === t.dataset.item);
      if (it) itemMenu(it, e.clientX, e.clientY);
    });
    $('#open-search').addEventListener('click', () => openPalette());
    $('#np-switch').addEventListener('click', (e) => {
      const m = S.media; if (!m || !m.sessions) return;
      const r = e.currentTarget.getBoundingClientRect();
      const name = (a) => String(a).split('!').pop().replace(/\.exe$/i, '').replace(/^.*[\\.]/, '') || a;
      openMenu(r.left, r.top - 10 - 40 * m.sessions.length, '<div class="sub">CONTROL WHICH PLAYER</div>' + m.sessions.map((x, i) => `<button type="button" data-player="${i}">${x.app === m.app ? '● ' : ''}${esc(name(x.app).toUpperCase())} · ${esc((x.title || 'nothing').slice(0, 26))}</button>`).join(''), (menu) => {
        menu.querySelectorAll('[data-player]').forEach((b) => b.addEventListener('click', () => { closeMenu(); window.cat.setPlayer(m.sessions[Number(b.dataset.player)].app); app.toast('CONTROLLING ' + name(m.sessions[Number(b.dataset.player)].app).toUpperCase()); }));
      });
    });
    $('#btn-settings').addEventListener('click', () => app.go('settings'));
    $('#btn-gamemode').addEventListener('click', () => app.toggleGameMode());
    $('#palette').addEventListener('click', (e) => {
      if (e.target.id === 'palette') return closePalette();
      if (e.target.closest('[data-pal-forget]')) { Commands.forget(); updatePalette(); $('#pal-input').focus(); return; }
      const r = e.target.closest('[data-pal]'); if (r) runPalette(Number(r.dataset.pal), e.shiftKey);
    });
    $('#pal-input').addEventListener('input', updatePalette);
    $('#pal-input').addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); movePal(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); movePal(-1); }
      else if (e.key === 'Enter') { e.preventDefault(); runPalette(palIndex, e.shiftKey); }
      else if (e.key === 'Escape') { e.preventDefault(); closePalette(); }
      else if (e.key === 'Tab' && palResults[palIndex] && !palResults[palIndex].answer && !palResults[palIndex].fill && palResults[palIndex].group !== 'FILES') { e.preventDefault(); $('#pal-input').value = palResults[palIndex].label; updatePalette(); }
    });
    $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });

    window.addEventListener('keydown', (e) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
      if (e.key === 'Escape') {
        if ($('#menu').classList.contains('open')) return closeMenu();
        if ($('#modal').classList.contains('open')) return closeModal();
        if ($('#palette').classList.contains('open')) return closePalette();
        if ($('#tour').classList.contains('open')) return endTour();
        if (!typing) window.cat.win('hide');
        return;
      }
      if (e.key === 'F11') { e.preventDefault(); window.cat.win('fullscreen'); return; }
      if ((e.ctrlKey && e.key.toLowerCase() === 'k') || (e.ctrlKey && e.code === 'Space')) { e.preventDefault(); openPalette(); return; }
      if (typing || e.ctrlKey || e.altKey || e.metaKey) return;
      if ($('#palette').classList.contains('open') || $('#modal').classList.contains('open')) return;
      if (/^[0-9]$/.test(e.key)) {
        const vis = app.navSections();
        const s = vis[(Number(e.key) + 9) % 10];
        if (s) app.go(s.id);
        return;
      }
      if (e.key === '/' || (e.key.length === 1 && /[a-z]/i.test(e.key))) { e.preventDefault(); openPalette(e.key === '/' ? '' : e.key); }
    });
  }

  function bindIpc() {
    window.cat.on('now', (cur) => { S.now = cur; });
    window.cat.on('media', (m) => { S.media = m; renderMedia(); });
    window.cat.on('system', (s) => { S.system = s; renderNavSys(); V6.onSystem(s); });
    window.cat.on('fg', (f) => V6.onFg(f));
    window.cat.on('stream-clip', () => V6.saveClip(app));
    window.cat.on('study', (st) => V6.onStudy(st));
    window.cat.on('meeting', (on) => V6.onMeeting(on));
    window.cat.on('school-cal', () => { if (S.section === 'school') V6.loadSchool(); });
    window.cat.on('library', (d) => { S.items = d.items; if (d.counts) S.counts = d.counts; S.scanning = false; if (!$('#modal').classList.contains('open')) app.render(); });
    window.cat.on('icons', (icons) => { S.icons = icons; S.iconsVersion = Date.now(); if (!$('#modal').classList.contains('open') && !$('#palette').classList.contains('open')) app.render(); });
    window.cat.on('scan', (d) => { S.scanning = d.status === 'scanning'; if (d.status === 'done') { S.scannedAt = Date.now(); app.toast('FOUND ' + Object.values(d.counts || {}).reduce((a, b) => a + b, 0) + ' THINGS'); } });
    window.cat.on('sections', (s) => { S.sections = s; app.render(); });
    window.cat.on('workspaces', (w) => { S.workspaces = w; app.render(); });
    window.cat.on('toast', (t) => app.toast(t.text));
    window.cat.on('gamemode', (on) => { S.gameMode = on; syncGameModeBtn(); });
    window.cat.on('focus-search', (mode) => (mode !== 'open' && $('#palette').classList.contains('open') ? closePalette() : openPalette()));
    window.cat.on('clipboard', (c) => { S.clips = c; if (S.section === 'files') { const el = $('#clips'); if (el) app.render(true); } });
    window.cat.on('remote', (r) => { S.remote = r; if (S.phone) S.phone.status = r; if (S.section === 'phone' || S.section === 'settings') app.render(true); });
    const phoneRefresh = U.debounce(() => { if (S.section === 'phone' && !$('#modal').classList.contains('open')) V5.loadPhone(app).then(() => app.render(true)); }, 300);
    window.cat.on('phone', (p) => { if (p && p.type === 'drop') app.toast('FROM YOUR PHONE · ' + String(p.name || '').toUpperCase()); phoneRefresh(); });
    window.cat.on('alert', () => phoneRefresh());
    window.cat.on('peek', (on) => { document.body.classList.toggle('peeking', !!on); if (S.phone) S.phone.peeking = !!on; phoneRefresh(); });
    window.cat.on('deck-run', async (req) => { const r = await V5.deckRun(req.btn); window.cat.deckDone(req.rid, r); });
    window.cat.on('wall-beat', (on) => { window.__wallBeat = !!on; });
    window.cat.on('wall-status', (st) => { S.wallStatus = st; if (S.section === 'settings') app.render(true); });
    window.cat.on('doctor', (h) => { S.health = h; if (S.section === 'home') app.render(true); });
    window.cat.on('window', (w) => { document.body.classList.toggle('fullscreen', !!w.fullscreen); });
    window.cat.on('license', (l) => { S.license = { ...S.license, ...l }; applyVibe(); renderNav(); if (!$('#modal').classList.contains('open')) app.render(true); });
    window.cat.on('need-pro', (f) => { if (!$('#modal').classList.contains('open')) app.proDialog(f); });
    window.cat.on('ws-progress', (r) => { S.wsRun = r; renderWsRun(); });
    window.cat.on('settings', (st) => { S.settings = st; applyVibe(); app.applyUi(); app.render(true); });
    window.cat.on('update', (u) => { S.update = u; renderUpdate(); if (S.section === 'settings' && S.settingsTab === 'about') app.render(true); });
  }

  async function refreshStats() {
    const [stats, suggested, sugg] = await Promise.all([window.cat.stats(), window.cat.suggested(), window.cat.workspaceSuggestions()]);
    if (stats && !stats.error) S.stats = stats;
    if (Array.isArray(suggested)) S.suggested = suggested;
    if (Array.isArray(sugg)) S.wsSuggestions = sugg;
  }

  /* ---------------- Pro ---------------- */
  const PRO_FEATURES = {
    flow: ['Flow automations', 'Make your PC react on its own: when OBS opens, go live. When a game starts, Game Mode.'],
    workspaces: ['Unlimited workspaces', 'Free includes 1 workspace. Pro has no limit.'],
    vibes: ['All Vibes + Vibe builder', 'Free includes Studio and Midnight. Pro unlocks Terminal, Vaporwave, Ocean and building your own.'],
    hotkeys: ['Unlimited app hotkeys', 'Free includes 3 app hotkeys. Pro has no limit.'],
    sections: ['Unlimited custom sections', 'Free includes 1 custom section. Pro has no limit.'],
    suggest: ['Smart suggestions', 'Catalyst notices what you open together and builds workspaces for you.'],
    layouts: ['Window layouts', 'Capture where every window sits and Catalyst puts them back on launch, across monitors.'],
    profiles: ['Game profiles', 'Per game: pause music, open Discord first, close apps you don\'t need.'],
    gamemode: ['Game Mode', 'Close background apps with one click and get a CPU / GPU overlay while you play.'],
    sorter: ['Downloads sorter', 'Sort Downloads by your own rules, with a preview first and undo for everything.'],
    dropzone: ['Drop zone', 'Drag files onto Catalyst and they land in the right folders.'],
    stats: ['Full stats', 'This week, month and all-time history, daily limits and the focus timer.'],
    sync: ['Sync between PCs', 'Your pins, workspaces and look follow you to every PC.'],
    deck: ['Phone Deck', 'Your phone becomes a Stream Deck: workspaces, OBS scenes, mic mute, soundboard, Flows.'],
    peek: ['Screen Peek', 'See your PC screen live from your phone.'],
    phonepro: ['Full phone powers', 'Unlimited Drop at any size, browse your PC from your phone, restart, shut down and close apps.'],
    alerts: ['Every alert', 'Get pinged when exports and renders finish or an app closes, not just downloads.'],
    doctor: ['PC Doctor', 'Turn off slow startup apps, clean up space, close memory hogs and boost your games.'],
    wallpaper: ['Live wallpapers', 'Every Vibe as a moving wallpaper behind your desktop icons.'],
    widgets: ['Desktop widgets', 'Now playing, PC health, stats and more right on your desktop.'],
    creator: ['Creator stats', 'Your Spotify, YouTube, TikTok and SoundCloud numbers on Home.'],
    discord: ['Discord status', 'Show what you\'re doing on your Discord profile.'],
    mini: ['Mini mode', 'A slim floating search bar, one hotkey away.'],
    shield: ['Privacy shield', 'While you\u2019re live, opening Discord, your email or a password manager flips OBS to a safe scene.'],
    director: ['Auto director', 'OBS switches scenes on its own based on what\u2019s on your screen.'],
    clips: ['Clip catcher', 'One hotkey saves the last 30 seconds of your stream, even from inside a game.'],
    recap: ['Stream recaps', 'After every stream: time live, clips, scene switches and how hard your PC worked.'],
    study: ['Study lock', 'Closes games and Discord and keeps them closed until your study timer ends.'],
    meeting: ['Meeting mode', 'Music pauses and Game Mode turns off when a Zoom, Teams or Meet call is in front.'],
    grades: ['Grades + GPA', 'Track every class and see your GPA, weighted and unweighted.']
  };
  // The 5 big reasons. Every feature above belongs to exactly one, so the screen can light up the one you clicked.
  const PRO_REASONS = [
    ['Your PC runs itself', 'Flows react for you: a game starts, Game Mode turns on. OBS opens, your stream setup loads.', ['flow', 'gamemode', 'profiles', 'sorter', 'dropzone']],
    ['Your whole setup in one click', 'Unlimited workspaces that open every app and put every window back, even across monitors.', ['workspaces', 'layouts', 'suggest', 'hotkeys', 'sections', 'sync', 'mini']],
    ['Your phone becomes a Stream Deck', 'Buttons for OBS, mic, sounds and Flows, see your screen live, send files any size.', ['deck', 'peek', 'phonepro', 'alerts']],
    ['Stream and study without the stress', 'A privacy shield while you\u2019re live, scenes that switch themselves, clips, recaps, study lock and grades.', ['shield', 'director', 'clips', 'recap', 'study', 'meeting', 'grades']],
    ['Every Vibe and every extra', 'All 5 Vibes, build your own, live wallpapers, desktop widgets, PC Doctor fixes, full stats and creator numbers.', ['vibes', 'wallpaper', 'widgets', 'doctor', 'stats', 'creator', 'discord']]
  ];
  app.proPitchHtml = (feature) => {
    const hit = PRO_REASONS.findIndex((r) => r[2].includes(feature));
    return `<div class="pro-reasons">${PRO_REASONS.map(([t, d, keys], i) => `<div class="pro-reason ${i === hit ? 'on' : ''}"><span class="n">0${i + 1}</span><div><b>${esc(t)}</b><p>${esc(d)}</p>${i === hit ? `<small>${keys.map((k) => esc(PRO_FEATURES[k][0])).join(' · ')}</small>` : ''}</div></div>`).join('')}</div>`;
  };
  app.isPro = () => !!(S.license && S.license.pro);
  app.pro = (feature) => { if (app.isPro()) return true; app.proDialog(feature); return false; };
  app.proTag = () => (app.isPro() ? '' : '<span class="pro-tag">PRO</span>');
  app.proDialog = (feature, keyFirst) => {
    const [title, why] = PRO_FEATURES[feature] || ['Catalyst Pro', 'Unlock everything Catalyst can do.'];
    const buy = (S.license && (S.license.buyUrl || S.license.site)) || '';
    openModal(`<div class="pro-dlg"><div class="pro-badge">PRO</div><h2>${esc(title)}</h2><div class="note">${esc(why)}</div>
      ${app.proPitchHtml(feature)}
      <div class="pro-buy"><div><b>$19.99</b><small>ONE TIME · UP TO 3 PCS · FREE UPDATES</small></div>
        <span class="btns"><button type="button" class="btn ghost" data-x>NOT NOW</button><button type="button" class="btn accent" data-buy>GET PRO</button></span></div>
      <div class="pro-key ${keyFirst ? 'open' : ''}"><button type="button" class="linkish" data-havekey>I already have a key</button>
        <div class="pro-keyrow"><input class="input" id="pro-key" placeholder="CAT1-…" autocomplete="off" spellcheck="false"><button type="button" class="btn solid" data-activate>UNLOCK</button></div>
        <div class="note" id="pro-msg"></div></div></div>`, (m) => {
      m.querySelector('.dlg').style.width = 'min(760px, 94vw)';
      $('[data-x]', m).addEventListener('click', closeModal);
      $('[data-buy]', m).addEventListener('click', () => { if (buy) window.cat.launchUrl(buy); else app.toast('PRO SALES OPEN SOON'); });
      $('[data-havekey]', m).addEventListener('click', () => { $('.pro-key', m).classList.add('open'); $('#pro-key', m).focus(); });
      const go = async () => {
        const btn = $('[data-activate]', m); btn.disabled = true; btn.textContent = 'CHECKING…';
        const r = await window.cat.activateLicense($('#pro-key', m).value);
        btn.disabled = false; btn.textContent = 'UNLOCK';
        if (r && r.ok) { S.license = { ...S.license, ...r }; applyVibe(); closeModal(); app.celebrate(); app.toast('PRO UNLOCKED. THANK YOU'); app.render(true); renderNav(); }
        else $('#pro-msg', m).textContent = (r && r.error) || 'That key didn\'t work.';
      };
      $('[data-activate]', m).addEventListener('click', go);
      $('#pro-key', m).addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
      if (keyFirst) $('#pro-key', m).focus();
    });
  };
  // Pro-only dialogs ask for Pro first.
  [['captureDialog', 'layouts'], ['sortPreviewDialog', 'sorter'], ['sortRulesDialog', 'sorter'], ['gameProfileDialog', 'profiles'], ['flowRecipes', 'flow'], ['flowEditor', 'flow']].forEach(([k, f]) => {
    const orig = app[k]; app[k] = (...a) => (app.pro(f) ? orig(...a) : undefined);
  });

  /* ---------------- boot ---------------- */
  async function boot() {
    const d = await window.cat.init();
    Object.assign(S, {
      settings: d.settings, items: d.items, icons: d.icons, sections: d.sections, workspaces: d.workspaces,
      folders: d.folders, vibes: d.vibes || [], counts: d.counts || {}, scannedAt: d.scannedAt, gameMode: d.gameMode,
      media: d.media, version: d.version, platform: d.platform, scanning: !d.scannedAt
    });
    window.__catApp = app;
    try { S.license = (await window.cat.license()) || { pro: false }; } catch (e) {} // know Pro before the first draw
    applyVibe();
    app.applyUi();
    buildWave();
    bindGlobal();
    bindIpc();
    setupDrop();
    syncGameModeBtn();
    renderMedia();
    S.clips = (await window.cat.clipboard()) || [];
    S.system = await window.cat.system();
    S.update = await window.cat.updateStatus(); renderUpdate();
    renderNavSys();
    await refreshStats();
    window.cat.doctorScore().then((h) => { if (h && !h.error) { S.health = h; if (S.section === 'home') app.render(true); } }).catch(() => {});
    app.render();
    app.refreshFriends(false);
    app.refreshWidgets();
    S.syncInfo = await window.cat.syncStatus();
    S.license = (await window.cat.license()) || { pro: false };
    applyVibe(); renderNav();
    if (S.license.pro && !$('#modal').classList.contains('open')) app.render(true); // swap any "Pro feature" placeholders drawn before the key loaded
    app.loadFlows();
    await runSplash(d.counts);
    if (S.settings.firstRun) app.setupWizard();
    else if (!S.settings.packsSeen) setTimeout(() => { if (!$('#modal').classList.contains('open')) V6.packsDialog(app); }, 1200);
    V6.startStream(app);
    setInterval(async () => {
      await refreshStats();
      const busy = $('#modal').classList.contains('open') || $('#palette').classList.contains('open') || /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
      if (!busy && ['home', 'mypc', 'games'].includes(S.section)) app.render(true);
    }, 30000);
    setInterval(() => app.refreshFriends(false), 120000);
    setInterval(() => app.refreshWidgets(), 5 * 60000);
    // Controller support only polls while a controller is plugged in.
    const padOn = () => { if (!pad.polling) { pad.polling = true; requestAnimationFrame(pollPad); } };
    window.addEventListener('gamepadconnected', padOn);
    if ((navigator.getGamepads ? [...navigator.getGamepads()] : []).some(Boolean)) padOn();
    // Rest every ambient animation while you're in another app; wake on return.
    const rest = () => {
      const off = document.hidden || !document.hasFocus();
      document.body.classList.toggle('fx-rest', off);
      if (!off && beat.sleeping) { beat.sleeping = false; if (beat.active) loopBeat(); }
    };
    window.addEventListener('blur', rest); window.addEventListener('focus', rest); document.addEventListener('visibilitychange', rest);
    rest();
  }

  boot().catch((e) => { document.body.insertAdjacentHTML('beforeend', `<div style="position:fixed;inset:auto 20px 20px auto;background:#ff2e4d;color:#fff;padding:14px;font:12px monospace;z-index:999">Catalyst error: ${esc(e.message)}</div>`); });
})();
