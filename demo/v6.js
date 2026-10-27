// v0.6 screens: packs + Customize, MY PC (Time + Health), STREAM, SCHOOL and Smart commands.
const V6 = (() => {
  const { esc, ago } = U;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const rowLabel = (l, r = '', a = '') => `<div class="row-label"><span>${l}</span><span style="display:flex;gap:16px;align-items:center">${r ? `<span>${r}</span>` : ''}${a}</span></div>`;
  const empty = (t) => `<div class="empty">${t}</div>`;
  const tog = (on, attr, label) => `<button type="button" class="toggle ${on ? 'on' : ''}" ${attr} aria-label="${esc(label || '')}">${on ? 'ON' : 'OFF'}</button>`;
  const hm = (mins) => { mins = Math.round(mins); return mins >= 60 ? Math.floor(mins / 60) + 'h ' + String(mins % 60).padStart(2, '0') + 'm' : mins + 'm'; };
  const clockOf = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); const h = Math.floor(s / 3600); return (h ? h + ':' : '') + String(Math.floor(s / 60) % 60).padStart(h ? 2 : 1, '0') + ':' + String(s % 60).padStart(2, '0'); };
  const timeOf = (t) => new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const COLORS = ['#ff5a1f', '#ff2e88', '#8f7bff', '#2d8cff', '#22c7a9', '#3dbb5c', '#e8b923', '#9a9a9a'];

  /* ================= PACKS ================= */
  const PACKS = [
    { id: 'gaming', label: 'Gaming', sub: 'Your games, Game Mode, Boost', tabs: ['games'], uses: ['gaming'] },
    { id: 'music', label: 'Music', sub: 'DAWs, plugins, drop zone, releases', tabs: ['studio'], uses: ['music'] },
    { id: 'streaming', label: 'Streaming', sub: 'OBS, Go Live checklist, clips', tabs: ['stream', 'content'], uses: ['content'] },
    { id: 'school', label: 'School / Work', sub: 'Assignments, classes, study lock', tabs: ['school'], uses: ['work'] },
    { id: 'video', label: 'Video', sub: 'Editors, exports, renders', tabs: ['content'], uses: ['content'] },
    { id: 'code', label: 'Code', sub: 'Editors, game dev, GitHub', tabs: ['dev'], uses: ['dev'] },
    { id: 'design', label: 'Design', sub: 'Photoshop, Figma, Blender', tabs: ['dev'], uses: ['design', 'dev'] }
  ];
  const PACKABLE = ['games', 'studio', 'content', 'stream', 'school', 'dev'];
  const BUILTIN_LABELS = { home: 'HOME', games: 'GAMES', studio: 'STUDIO', content: 'CONTENT', stream: 'STREAM', school: 'SCHOOL', dev: 'CREATE / DEV', apps: 'APPS', social: 'SOCIAL', web: 'WEB', files: 'FILES', workspaces: 'WORKSPACES', flow: 'FLOW', phone: 'PHONE', mypc: 'MY PC' };
  const VIEW_SECTIONS = ['home', 'workspaces', 'flow', 'phone', 'mypc', 'stream', 'school', 'stats', 'doctor', 'settings'];
  function packUses(packs) { return Array.isArray(packs) && packs.length ? new Set(PACKS.filter((p) => packs.includes(p.id)).flatMap((p) => p.uses)) : null; }

  // What the sidebar would look like with these packs (for the live preview).
  function previewNav(app, packs) {
    const want = new Set(Array.isArray(packs) && packs.length ? PACKS.filter((p) => packs.includes(p.id)).flatMap((p) => p.tabs) : PACKABLE);
    const pin = [], more = [];
    for (const s of app.state.sections) {
      if (s.hidden && !PACKABLE.includes(s.id)) continue;
      if (app.hasStuff && !app.hasStuff({ ...s, show: s.show || ['stream', 'school'].includes(s.id) })) continue;
      const inSidebar = PACKABLE.includes(s.id) ? want.has(s.id) : s.place !== 'more';
      (inSidebar ? pin : more).push(s.label);
    }
    return `<div class="pk-prev"><div class="pk-logo">CATALYST<b>.</b></div>${pin.map((l, i) => `<div class="pk-row"><span>${String(i + 1).padStart(2, '0')}</span>${esc(l)}</div>`).join('')}${more.length ? `<div class="pk-row more"><span>+${more.length}</span>MORE</div>` : ''}</div>`;
  }
  function packGrid(sel) {
    return `<div class="pk-grid">${PACKS.map((p) => `<button type="button" class="pk ${sel.includes(p.id) ? 'on' : ''}" data-pack="${p.id}" aria-pressed="${sel.includes(p.id)}"><span class="pk-check">${sel.includes(p.id) ? '✓' : ''}</span><b>${esc(p.label)}</b><small>${esc(p.sub)}</small></button>`).join('')}</div>`;
  }
  // Wizard step + the one-time "pick your packs" screen for people updating.
  function packStep(app, sel) {
    return `<div class="pk-wrap"><div>${packGrid(sel)}</div><div><div class="pk-k">YOUR SIDEBAR</div>${previewNav(app, sel)}</div></div>`;
  }
  function bindPackStep(app, m, sel, redraw) {
    $$('[data-pack]', m).forEach((b) => b.addEventListener('click', async () => {
      const k = b.dataset.pack; const i = sel.indexOf(k);
      if (i >= 0) sel.splice(i, 1); else sel.push(k);
      await window.cat.applyPacks(sel.slice());
      redraw();
    }));
  }
  function packsDialog(app) {
    const S = app.state;
    const sel = Array.isArray(S.settings.packs) ? S.settings.packs.slice() : [];
    const draw = () => app.openModal(`<div class="wz"><div class="wz-k">NEW IN 0.6</div><h2>Make Catalyst yours.</h2>
      <div class="note">Pick what you use this PC for. Those tabs go in your sidebar, and everything else waits under <b>MORE</b> so nothing gets cluttered. Change it any time in Settings › Customize.</div>${packStep(app, sel)}</div>
      <div class="btns" style="justify-content:space-between"><button type="button" class="btn ghost" data-pk-later>LATER</button><button type="button" class="btn accent" data-pk-done>DONE</button></div>`, (m) => {
      m.querySelector('.dlg').style.width = 'min(980px, 95vw)';
      bindPackStep(app, m, sel, draw);
      $('[data-pk-done]', m).addEventListener('click', async () => { await window.cat.applyPacks(sel.slice()); app.closeModal(); app.toast(sel.length ? 'SIDEBAR READY' : 'SHOWING EVERYTHING'); app.render(); });
      $('[data-pk-later]', m).addEventListener('click', async () => { await app.saveSettings({ packsSeen: true }); app.closeModal(); });
    });
    draw();
  }

  /* ================= CUSTOMIZE (Settings tab) ================= */
  function customizeTab(app) {
    const S = app.state, s = S.settings; const ui = s.ui || {};
    const sel = Array.isArray(s.packs) ? s.packs : [];
    const rows = S.sections.map((sec, i) => {
      const place = sec.hidden ? 'off' : sec.place === 'more' ? 'more' : 'pin';
      const builtin = BUILTIN_LABELS[sec.id];
      return `<div class="list-row cz-row" draggable="true" data-sec="${esc(sec.id)}" data-idx="${i}"><span class="tg cz-grip" aria-hidden="true">⋮⋮</span><span class="nm">${esc(sec.label)}${builtin && builtin !== sec.label ? `<small class="cz-orig">${esc(builtin)}</small>` : ''}</span>
        ${sec.id === 'home' ? '<span class="cz-fixed">ALWAYS IN SIDEBAR</span>' : `<span class="seg cz-seg">${[['pin', 'SIDEBAR'], ['more', 'MORE'], ['off', 'OFF']].map(([k, l]) => `<button type="button" class="${place === k ? 'on' : ''}" data-place="${k}" data-psec="${esc(sec.id)}">${l}</button>`).join('')}</span>`}
        <button type="button" class="btn small ghost" data-cz-rename="${esc(sec.id)}">RENAME</button>${sec.builtin ? '' : `<button type="button" class="btn small ghost danger" data-cz-del="${esc(sec.id)}">DELETE</button>`}</div>`;
    }).join('');
    const extra = (k, on, label, sub) => `<div class="opt"><span class="lab">${label}<small>${sub}</small></span><span class="ctl">${tog(on, `data-ui="${k}"`, label)}</span></div>`;
    return `<div class="split"><div class="grow">
        ${rowLabel('YOUR PACKS', 'WHAT THIS PC IS FOR')}
        ${packGrid(sel)}
        <div class="note">Each pack puts its tabs in your sidebar. Tabs you don't need wait under <b>MORE</b>. ${sel.length ? '' : 'Nothing picked, so every tab shows.'}</div>
        ${rowLabel('TABS', 'DRAG TO REORDER', '<button type="button" class="act" data-add-section>+ NEW SECTION</button><button type="button" class="act" data-cz-reset>RESET</button>')}
        <div class="list" id="sec-list">${rows}</div>
        ${rowLabel('ON SCREEN')}
        ${extra('player', ui.player !== false, 'Now playing bar', 'The music bar at the bottom')}
        ${extra('navsys', ui.navsys !== false, 'PC stats in the sidebar', 'CPU, GPU, RAM and free space')}
        ${extra('gmbtn', ui.gmbtn !== false, 'Game Mode button', 'In the sidebar, next to Settings')}
        <div class="opt"><span class="lab">Home screen<small>Move, hide or add widgets and rows</small></span><span class="ctl"><button type="button" class="btn small ghost" data-cz-home>EDIT HOME</button></span></div>
      </div><aside style="width:300px">${rowLabel('PREVIEW')}${previewNav(app, sel.length ? sel : null)}<div class="note">Right-click any tab in the sidebar to move it, hide it or rename it.</div></aside></div>`;
  }
  function bindCustomize(app, el) {
    const S = app.state;
    $$('[data-pack]', el).forEach((b) => b.addEventListener('click', async () => {
      const cur = new Set(S.settings.packs || []); const k = b.dataset.pack;
      if (cur.has(k)) cur.delete(k); else cur.add(k);
      const r = await window.cat.applyPacks([...cur]);
      if (r && !r.error) S.settings = r;
      app.render(true);
    }));
    $$('[data-place]', el).forEach((b) => b.addEventListener('click', () => setPlace(app, b.dataset.psec, b.dataset.place)));
    $$('[data-cz-rename]', el).forEach((b) => b.addEventListener('click', () => renameTab(app, b.dataset.czRename)));
    $$('[data-cz-del]', el).forEach((b) => b.addEventListener('click', () => app.confirm('Delete this section? Its items move to Apps.', () => window.cat.removeSection(b.dataset.czDel))));
    const rs = $('[data-cz-reset]', el); if (rs) rs.addEventListener('click', () => app.confirm('Put every tab back in the default order and names?', () => window.cat.resetSections()));
    const as = $('[data-add-section]', el);
    if (as) as.addEventListener('click', () => (!app.isPro() && S.sections.filter((x) => !x.builtin).length >= app.FREE.sections) ? app.proDialog('sections') : app.promptDialog('New section', 'NAME', '', async (v) => { if (v) await window.cat.addSection(v); }));
    $$('[data-ui]', el).forEach((b) => b.addEventListener('click', async () => { const ui = { ...(S.settings.ui || {}) }; ui[b.dataset.ui] = ui[b.dataset.ui] === false; await app.saveSettings({ ui }); app.applyUi(); app.render(true); }));
    const eh = $('[data-cz-home]', el); if (eh) eh.addEventListener('click', () => { app.go('home'); setTimeout(() => { const b = document.querySelector('[data-edit-home]'); if (b) b.click(); }, 50); });
    let from = null;
    $$('#sec-list [data-sec]', el).forEach((row) => {
      row.addEventListener('dragstart', () => { from = Number(row.dataset.idx); row.classList.add('drag'); });
      row.addEventListener('dragend', () => row.classList.remove('drag'));
      row.addEventListener('dragover', (e) => { e.preventDefault(); row.classList.add('over'); });
      row.addEventListener('dragleave', () => row.classList.remove('over'));
      row.addEventListener('drop', (e) => {
        e.preventDefault(); e.stopPropagation(); row.classList.remove('over');
        const to = Number(row.dataset.idx);
        if (from === null || from === to) return;
        const ids = S.sections.map((x) => x.id);
        const [m] = ids.splice(from, 1); ids.splice(to, 0, m);
        window.cat.reorderSections(ids);
      });
    });
  }
  async function setPlace(app, id, place) {
    if (id === 'home') return;
    if (place === 'off') await window.cat.updateSection(id, { hidden: true });
    else await window.cat.updateSection(id, { hidden: false, place });
    if (app.state.section === id && place === 'off') app.go('home');
  }
  function renameTab(app, id) {
    const sec = app.state.sections.find((x) => x.id === id); if (!sec) return;
    app.promptDialog('Rename tab', 'NAME', sec.label, (v) => { if (v) window.cat.updateSection(sec.id, { label: v }); else if (sec.builtin) window.cat.updateSection(sec.id, { resetLabel: true }); });
  }
  // Right-click a tab in the sidebar.
  function navMenu(app, id) {
    const sec = app.state.sections.find((x) => x.id === id); if (!sec || id === 'home') return null;
    const inMore = sec.place === 'more';
    return {
      html: `<div class="sub">${esc(sec.label)}</div><button type="button" data-nm="place">${inMore ? 'PIN TO SIDEBAR' : 'MOVE TO MORE'}</button><button type="button" data-nm="hide">HIDE TAB</button><button type="button" data-nm="rename">RENAME</button><hr><button type="button" data-nm="custom">CUSTOMIZE TABS…</button>`,
      run: (a) => {
        if (a === 'place') setPlace(app, id, inMore ? 'pin' : 'more');
        if (a === 'hide') { setPlace(app, id, 'off'); app.toast(sec.label + ' HIDDEN · SETTINGS › CUSTOMIZE BRINGS IT BACK'); }
        if (a === 'rename') renameTab(app, id);
        if (a === 'custom') { app.state.settingsTab = 'customize'; app.go('settings'); }
      }
    };
  }

  /* ================= MY PC ================= */
  // Catalyst's own footprint, shown on MY PC so people can see it's light.
  const usageText = (u) => (u ? `CATALYST ITSELF · <b>${u.cpu < 0.1 ? '<0.1' : u.cpu.toFixed(1)}%</b> CPU · <b>${Math.round(u.mem / 1048576)} MB</b> RAM` : 'CATALYST ITSELF · measuring…');
  let usageTimer = null;
  async function pollUsage(app) {
    clearInterval(usageTimer);
    const tick = async () => {
      if (app.state.section !== 'mypc') return clearInterval(usageTimer);
      const u = window.cat.usage ? await window.cat.usage().catch(() => null) : null;
      if (u && !u.error) { app.state.usage = u; const el = document.getElementById('cat-usage'); if (el) el.innerHTML = usageText(u); }
    };
    tick(); usageTimer = setInterval(tick, 3000);
  }
  function mypc(app) {
    const S = app.state; const tab = S.mypcTab || 'health';
    const inner = tab === 'time' ? Views.stats(app) : V5.doctor(app);
    return {
      title: 'MY PC',
      html: `<div class="mypc-top"><div class="tabs" role="tablist">${[['health', 'HEALTH'], ['time', 'TIME']].map(([k, l]) => `<button type="button" role="tab" class="${tab === k ? 'on' : ''}" data-mytab="${k}">${l}</button>`).join('')}</div><span class="cat-usage" id="cat-usage" title="What Catalyst is using right now, the same way Task Manager counts it">${usageText(S.usage)}</span></div><div class="mypc-body">${inner.html}</div>`,
      mount(el) {
        $$('[data-mytab]', el).forEach((b) => b.addEventListener('click', () => { S.mypcTab = b.dataset.mytab; app.render(true); }));
        inner.mount && inner.mount(el);
        pollUsage(app);
      }
    };
  }

  /* ================= STREAM ================= */
  const OBS_EXE = /^obs(64|32)?\.exe$/i;
  const H = { connected: false, obsRunning: false, live: false, liveSince: 0, rec: false, buffer: null, scene: '', scenes: [], micMuted: null, clips: [], checked: new Set(), shieldOn: false, shieldPrev: '', session: null, recaps: null, lastFg: '', meeting: false, timer: null, bound: false, err: '' };
  let appRef = null;
  const st = () => (appRef.state.settings.stream || {});
  const redrawIfOpen = () => { if (appRef && appRef.state.section === 'stream' && !document.querySelector('#modal.open')) appRef.render(true); };

  async function obsSync() {
    const O = V5.OBS;
    try {
      const [ss, rs, cs, sl] = await Promise.all([O.call('GetStreamStatus'), O.call('GetRecordStatus'), O.call('GetCurrentProgramScene'), O.call('GetSceneList')]);
      H.connected = true; H.err = '';
      if (ss.outputActive && !H.session) startSession(Date.now() - (ss.outputDuration || 0));
      if (!ss.outputActive && H.session) { H.live = false; endSession(); } // stream ended while we weren't connected
      H.live = !!ss.outputActive; H.rec = !!rs.outputActive;
      H.scene = cs.currentProgramSceneName || cs.sceneName || ''; H.scenes = (sl.scenes || []).map((x) => x.sceneName).reverse();
      try { H.buffer = !!(await O.call('GetReplayBufferStatus')).outputActive; } catch (e) { H.buffer = null; }
      try { H.micMuted = !!(await O.call('GetInputMute', { inputName: st().mic || 'Mic/Aux' })).inputMuted; } catch (e) { H.micMuted = null; }
    } catch (e) { H.connected = false; H.err = e.message; }
    redrawIfOpen();
  }
  function startSession(start) { H.session = { start, clips: 0, scenes: 0, shield: 0, peakCpu: 0, peakGpu: 0 }; H.liveSince = start; }
  async function endSession() {
    const ses = H.session; H.session = null; H.checked.clear();
    if (H.shieldOn) { H.shieldOn = false; if (H.shieldPrev && V5.OBS.connected()) V5.OBS.call('SetCurrentProgramScene', { sceneName: H.shieldPrev }).catch(() => {}); }
    if (!ses || Date.now() - ses.start < 60000) return;
    const r = { ...ses, end: Date.now() };
    if (st().recap !== false && appRef.isPro()) {
      H.recaps = await window.cat.streamRecap(r);
      showRecap(r);
      window.cat.notify('Stream recap', clockOf(r.end - r.start) + ' live · ' + r.clips + ' clip' + (r.clips === 1 ? '' : 's') + ' saved');
    }
  }
  function bindObsEvents() {
    if (H.bound) return; H.bound = true;
    const O = V5.OBS;
    O.on('_open', () => { H.connected = true; obsSync(); });
    // A blip doesn't end the stream: on reconnect, OBS tells us if it's still live. Closing OBS ends it.
    O.on('_closed', () => { H.connected = false; redrawIfOpen(); });
    O.on('ExitStarted', () => { H.connected = false; redrawIfOpen(); });
    O.on('StreamStateChanged', (d) => {
      if (d.outputState === 'OBS_WEBSOCKET_OUTPUT_STARTED') {
        H.live = true; if (!H.session) startSession(Date.now());
        const c = st().clip || {};
        if (appRef.isPro() && c.on && c.autoBuffer && !H.buffer) O.call('StartReplayBuffer').catch(() => {});
        appRef.toast('YOU’RE LIVE');
      } else if (d.outputState === 'OBS_WEBSOCKET_OUTPUT_STOPPED') { H.live = false; endSession(); }
      redrawIfOpen();
    });
    O.on('RecordStateChanged', (d) => { H.rec = !!d.outputActive; redrawIfOpen(); });
    O.on('ReplayBufferStateChanged', (d) => { H.buffer = !!d.outputActive; redrawIfOpen(); });
    O.on('ReplayBufferSaved', (d) => {
      H.clips.unshift({ path: d.savedReplayPath || '', at: Date.now() }); H.clips = H.clips.slice(0, 30);
      if (H.session) H.session.clips++;
      appRef.toast('CLIP SAVED'); redrawIfOpen();
    });
    O.on('CurrentProgramSceneChanged', (d) => { if (d.sceneName !== H.scene && H.session) H.session.scenes++; H.scene = d.sceneName; redrawIfOpen(); });
    O.on('SceneListChanged', (d) => { H.scenes = (d.scenes || []).map((x) => x.sceneName).reverse(); redrawIfOpen(); });
    O.on('InputMuteStateChanged', (d) => { if (d.inputName === (st().mic || 'Mic/Aux')) { H.micMuted = !!d.inputMuted; redrawIfOpen(); } });
  }
  // Keep an eye on OBS only when STREAM is in use.
  function wantWatch(app) {
    const s = app.state.settings; const sec = app.state.sections.find((x) => x.id === 'stream');
    if (app.state.section === 'stream') return true;
    if (H.session) return true; // keep watching until the stream we saw start has ended
    if (!sec || sec.hidden) return false;
    const t = s.stream || {};
    return !!((t.shield || {}).on || (t.director || {}).on || (t.clip || {}).on || (t.recap !== false && sec.place !== 'more'));
  }
  let tickN = 0;
  async function watchTick() {
    if (!appRef || !wantWatch(appRef)) return;
    const t = appRef.state.settings.stream || {};
    const busy = appRef.state.section === 'stream' || H.session || (t.shield || {}).on || (t.director || {}).on || (t.clip || {}).on;
    if (!busy && (tickN++ % 3)) return; // only the recap wants OBS: a lighter check is enough
    if (V5.OBS.connected()) { if (!H.connected) await obsSync(); return; }
    const procs = (await window.cat.running().catch(() => [])) || [];
    const was = H.obsRunning;
    H.obsRunning = (Array.isArray(procs) ? procs : []).some((p) => OBS_EXE.test(p));
    if (!H.obsRunning && H.session) { H.live = false; endSession(); }
    if (H.obsRunning) { try { await V5.OBS.connect(); } catch (e) { H.err = e.message; } }
    if (was !== H.obsRunning) redrawIfOpen();
  }
  function startStream(app) {
    appRef = app; bindObsEvents();
    clearInterval(H.timer); H.timer = setInterval(watchTick, 10000); setTimeout(watchTick, 1500);
    // live clock on the STREAM screen
    setInterval(() => { const c = document.getElementById('st-clock'); if (c && H.live) c.textContent = clockOf(Date.now() - H.liveSince); }, 1000);
  }
  function onSystem(sys) {
    if (!H.session || !sys) return;
    H.session.peakCpu = Math.max(H.session.peakCpu, Number(sys.cpu) || 0);
    if (sys.gpu && sys.gpu.temp != null) H.session.peakGpu = Math.max(H.session.peakGpu, Number(sys.gpu.temp) || 0);
  }
  // Privacy shield + auto director: react to what's in front while you're live.
  async function onFg(fg) {
    if (!fg || !fg.exe || !appRef) return;
    const exe = fg.exe.toLowerCase();
    if (exe === H.lastFg) return; H.lastFg = exe;
    if (!H.live || !H.connected || !appRef.isPro()) return;
    if (/^(catalyst|electron)\.exe$/.test(exe)) return;
    const t = st(); const sh = t.shield || {}; const dir = t.director || {};
    const rule = dir.on ? (dir.rules || []).find((r) => r.exe === exe) : null;
    try {
      if (sh.on && sh.scene) {
        const hit = (sh.apps || []).includes(exe);
        if (hit && !H.shieldOn) {
          H.shieldOn = true; H.shieldPrev = H.scene; if (H.session) H.session.shield++;
          await V5.OBS.call('SetCurrentProgramScene', { sceneName: sh.scene });
          appRef.toast('PRIVACY SHIELD ON · ' + exe.replace(/\.exe$/, '').toUpperCase() + ' IS HIDDEN');
          return;
        }
        if (hit) return;
        if (H.shieldOn) {
          H.shieldOn = false;
          const back = rule ? rule.scene : H.shieldPrev;
          if (back && back !== sh.scene) await V5.OBS.call('SetCurrentProgramScene', { sceneName: back });
          appRef.toast('PRIVACY SHIELD OFF');
          return;
        }
      }
      if (rule && rule.scene && rule.scene !== H.scene) await V5.OBS.call('SetCurrentProgramScene', { sceneName: rule.scene });
    } catch (e) { /* OBS busy or scene renamed; try again next switch */ }
  }
  async function saveClip(app) {
    if (!app.isPro()) return app.proDialog('clips');
    if (!H.connected) { try { await V5.OBS.connect(); await obsSync(); } catch (e) { return app.toast('OBS ISN’T CONNECTED'); } }
    if (!H.buffer) {
      try { await V5.OBS.call('StartReplayBuffer'); app.toast('REPLAY BUFFER STARTED · CLIPS WORK FROM NOW ON'); } catch (e) { app.toast('TURN ON THE REPLAY BUFFER IN OBS › SETTINGS › OUTPUT'); }
      return;
    }
    try { await V5.OBS.call('SaveReplayBuffer'); } catch (e) { app.toast('OBS: ' + e.message.toUpperCase()); }
  }
  function showRecap(r) {
    appRef.openModal(`<div class="wz-k">STREAM RECAP</div><h2>${clockOf(r.end - r.start)} live.</h2>
      <div class="st-recap">${[['CLIPS', r.clips], ['SCENE SWITCHES', r.scenes], ['SHIELD SAVES', r.shield], ['PEAK CPU', r.peakCpu + '%'], ['PEAK GPU', r.peakGpu ? r.peakGpu + '°C' : '—']].map(([k, v]) => `<div><b>${esc(String(v))}</b><span>${k}</span></div>`).join('')}</div>
      <div class="btns" style="justify-content:flex-end"><button type="button" class="btn accent" data-x>NICE</button></div>`, (m) => { $('[data-x]', m).addEventListener('click', appRef.closeModal); });
  }

  function checks(app) {
    const sys = app.state.system || {};
    const free = sys.disk ? sys.disk.free : null;
    return [
      ['OBS is open', H.obsRunning || H.connected ? 'ok' : 'bad', H.obsRunning || H.connected ? '' : 'Open OBS'],
      ['Catalyst is connected to OBS', H.connected ? 'ok' : H.obsRunning ? 'bad' : 'wait', H.connected ? '' : H.err ? H.err : 'Waiting for OBS'],
      ['A scene is picked', H.scene ? 'ok' : 'wait', H.scene ? H.scene : ''],
      ['Mic is live in OBS', H.micMuted === false ? 'ok' : H.micMuted === true ? 'bad' : 'wait', H.micMuted === true ? 'Your mic is muted in OBS' : H.micMuted === null && H.connected ? 'Can’t find "' + (st().mic || 'Mic/Aux') + '". Set your mic name below.' : ''],
      ['Enough disk space', free == null ? 'wait' : free > 20e9 ? 'ok' : 'bad', free == null ? '' : U.bytes(free) + ' free'],
      ['PC isn’t struggling', !sys.cpu && sys.cpu !== 0 ? 'wait' : sys.cpu < 85 ? 'ok' : 'bad', sys.cpu != null ? 'CPU ' + sys.cpu + '%' : '']
    ];
  }

  function stream(app) {
    const S = app.state; const t = S.settings.stream || {}; const pro = app.isPro();
    if (!appRef) startStream(app);
    if (!H.connected && !H.syncing && Date.now() - (H.lastTick || 0) > 5000) { H.syncing = true; H.lastTick = Date.now(); watchTick().finally(() => { H.syncing = false; }); }
    if (H.recaps === null) { H.recaps = []; window.cat.streamRecaps().then((r) => { H.recaps = Array.isArray(r) ? r : []; redrawIfOpen(); }); }
    const ck = checks(app);
    const manual = (t.checklist || []);
    const ready = ck.every((c) => c[1] === 'ok') && manual.every((m) => H.checked.has(m.id));
    const sh = t.shield || {}; const dir = t.director || {}; const clip = t.clip || {};
    const sceneOpts = (cur) => `<option value="">${H.scenes.length ? 'Pick a scene' : 'Connect OBS to load scenes'}</option>${[...new Set([...H.scenes, cur].filter(Boolean))].map((x) => `<option ${x === cur ? 'selected' : ''}>${esc(x)}</option>`).join('')}`;
    const proCard = (key, title, on, body, sub) => `<div class="st-card ${on && pro ? 'on' : ''}"><div class="st-card-h"><b>${title}${app.proTag()}</b>${tog(on && pro, `data-st-tog="${key}"`, title)}</div><div class="note">${sub}</div>${on && pro ? body : ''}</div>`;
    const status = H.live ? `<span class="st-live">● LIVE <b id="st-clock">${clockOf(Date.now() - H.liveSince)}</b></span>` : `<span class="st-off">${H.connected ? 'OFFLINE · OBS CONNECTED' : H.obsRunning ? 'OBS IS OPEN · CONNECTING' : 'OBS IS CLOSED'}</span>`;
    const html = `<div class="st-head">${status}${H.connected ? `<span>SCENE <b>${esc(H.scene || '—')}</b></span>${H.rec ? '<span class="st-rec">● REC</span>' : ''}${H.buffer ? '<span>REPLAY BUFFER ON</span>' : ''}` : ''}</div>
      <div class="split"><div class="grow">
        ${rowLabel(H.live ? 'YOU’RE LIVE' : 'GO LIVE CHECKLIST', ready && !H.live ? 'ALL GOOD' : '')}
        <div class="st-list">${ck.map(([label, state, sub]) => `<div class="st-check ${state}"><span class="st-dot">${state === 'ok' ? '✓' : state === 'bad' ? '✕' : '…'}</span><span class="lab">${esc(label)}${sub ? `<small>${esc(sub)}</small>` : ''}</span></div>`).join('')}
          ${manual.map((m) => `<button type="button" class="st-check manual ${H.checked.has(m.id) ? 'ok' : ''}" data-st-check="${esc(m.id)}"><span class="st-dot">${H.checked.has(m.id) ? '✓' : ''}</span><span class="lab">${esc(m.text)}</span><span class="st-x" data-st-del="${esc(m.id)}" title="Remove">×</span></button>`).join('')}</div>
        <div class="st-add"><input class="input" id="st-new" placeholder="Add your own step, like “Mic check”" maxlength="60"><button type="button" class="btn small ghost" data-st-add>+ ADD</button></div>
        <div class="btns st-go">${H.live ? '<button type="button" class="btn ghost danger" data-st-stop>END STREAM</button>' : `<button type="button" class="btn accent big" data-st-live ${H.connected ? '' : 'disabled'}>GO LIVE</button>`}
          <button type="button" class="btn ghost" data-st-rec ${H.connected ? '' : 'disabled'}>${H.rec ? 'STOP RECORDING' : 'RECORD'}</button>
          <button type="button" class="btn ghost" data-st-clip>SAVE CLIP${app.proTag()}</button></div>
        ${H.connected ? '' : `${rowLabel('CONNECT OBS')}<div class="note">In OBS open <b>Tools › WebSocket Server Settings</b>, turn it on, and paste the password here. Catalyst connects on its own whenever OBS is open.</div>
          <div class="ph-row"><label class="field"><span>PORT</span><input class="input" id="st-port" value="${esc(S.settings.obs.port)}" inputmode="numeric" style="width:110px"></label><label class="field" style="flex:1"><span>PASSWORD</span><input class="input" id="st-pass" type="password" value="${esc(S.settings.obs.password)}" autocomplete="off"></label><button type="button" class="btn ghost" data-st-connect>SAVE + CONNECT</button></div>`}
        <div class="opt"><span class="lab">Mic name in OBS<small>So the checklist can tell if you're muted</small></span><span class="ctl"><input class="input" id="st-mic" value="${esc(t.mic || 'Mic/Aux')}" style="width:200px" aria-label="Mic name in OBS"></span></div>
        ${rowLabel('LAST STREAMS', '', app.proTag())}
        ${pro ? ((H.recaps || []).length ? `<div class="list">${H.recaps.slice(0, 6).map((r) => `<div class="list-row" style="cursor:default"><span class="nm">${esc(new Date(r.start).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }))}</span><span class="tm">${clockOf(r.end - r.start)} · ${r.clips} CLIP${r.clips === 1 ? '' : 'S'} · ${r.scenes} SWITCHES</span></div>`).join('')}</div>` : empty('After each stream you get a recap: how long, clips saved, scene switches, how hard your PC worked.')) : empty('Pro shows a recap after every stream: time live, clips saved, scene switches and how hard your PC worked.')}
      </div><aside style="width:400px" class="st-side">
        ${proCard('shield', 'PRIVACY SHIELD', sh.on, `<label class="field"><span>SWITCH TO THIS SCENE</span><select class="input" data-st-f="shield.scene">${sceneOpts(sh.scene)}</select></label>
          <div class="st-chips">${(sh.apps || []).map((a) => `<span class="chip on">${esc(a.replace(/\.exe$/, ''))}<button type="button" data-st-rmapp="${esc(a)}" aria-label="Remove ${esc(a)}">×</button></span>`).join('')}</div>
          <div class="st-add"><input class="input" id="st-shapp" placeholder="discord.exe"><button type="button" class="btn small ghost" data-st-shadd>+ APP</button></div>`, 'While you’re live, opening one of these apps flips OBS to a safe scene so chat never sees your messages or passwords. It switches back when you leave.')}
        ${proCard('director', 'AUTO DIRECTOR', dir.on, `<div class="st-rules">${(dir.rules || []).map((r, i) => `<div class="st-rule"><span>${esc(r.exe.replace(/\.exe$/, ''))}</span><span>→</span><b>${esc(r.scene)}</b><button type="button" class="act" data-st-rmrule="${i}" aria-label="Remove rule">×</button></div>`).join('') || '<div class="note">No rules yet.</div>'}</div>
          <div class="st-add"><input class="input" id="st-rexe" placeholder="valorant.exe" style="flex:1"><select class="input" id="st-rscene" style="flex:1">${sceneOpts('')}</select><button type="button" class="btn small ghost" data-st-radd>+</button></div>`, 'Switch scenes on their own: when a game is in front, show Gameplay. When you tab to the browser, show Just Chatting.')}
        ${proCard('clip', 'CLIP CATCHER', clip.on, `<div class="opt"><span class="lab">Hotkey<small>Saves the last moments from OBS's replay buffer</small></span><span class="ctl"><button type="button" class="hotkey-input" id="st-hk">${esc((clip.hotkey || 'Control+Alt+C').toUpperCase())}</button></span></div>
          <div class="opt"><span class="lab">Start the replay buffer when I go live</span><span class="ctl">${tog(clip.autoBuffer !== false, 'data-st-auto', 'Auto replay buffer')}</span></div>
          ${H.clips.length ? `<div class="list">${H.clips.slice(0, 5).map((c) => `<button type="button" class="list-row" data-path="${esc(c.path)}"><span class="nm">${esc((c.path.split(/[\\/]/).pop()) || 'Clip')}</span><span class="tm">${esc(ago(c.at))}</span></button>`).join('')}</div>` : ''}`, 'Something crazy happened? Hit one hotkey and the last 30 seconds get saved as a clip. Works from inside your game.')}
        ${proCard('recap', 'STREAM RECAP', t.recap !== false, '', 'When you end a stream, see how it went: time live, clips, scene switches, peak CPU and GPU.')}
      </aside></div>`;
    return { title: 'STREAM', html, mount: (el) => bindStream(app, el) };
  }
  function bindStream(app, el) {
    const S = app.state; const t = () => S.settings.stream || {};
    const save = async (patch) => { await app.saveSettings({ stream: { ...t(), ...patch } }); app.render(true); };
    $$('[data-st-check]', el).forEach((b) => b.addEventListener('click', (e) => {
      if (e.target.closest('[data-st-del]')) { const id = e.target.closest('[data-st-del]').dataset.stDel; return save({ checklist: (t().checklist || []).filter((x) => x.id !== id) }); }
      const id = b.dataset.stCheck; if (H.checked.has(id)) H.checked.delete(id); else H.checked.add(id); app.render(true);
    }));
    const addStep = () => { const v = $('#st-new', el).value.trim(); if (v) save({ checklist: [...(t().checklist || []), { id: 'c' + Date.now().toString(36), text: v }].slice(0, 12) }); };
    $('[data-st-add]', el).addEventListener('click', addStep);
    $('#st-new', el).addEventListener('keydown', (e) => { if (e.key === 'Enter') addStep(); });
    const live = $('[data-st-live]', el); if (live) live.addEventListener('click', async () => { try { await V5.OBS.call('StartStream'); app.toast('GOING LIVE…'); } catch (e) { app.toast('OBS: ' + e.message.toUpperCase()); } });
    const stop = $('[data-st-stop]', el); if (stop) stop.addEventListener('click', () => app.confirm('End the stream?', async () => { try { await V5.OBS.call('StopStream'); } catch (e) { app.toast('OBS: ' + e.message.toUpperCase()); } }));
    const rec = $('[data-st-rec]', el); if (rec) rec.addEventListener('click', async () => { try { await V5.OBS.call('ToggleRecord'); } catch (e) { app.toast('OBS: ' + e.message.toUpperCase()); } });
    $('[data-st-clip]', el).addEventListener('click', () => saveClip(app));
    const cn = $('[data-st-connect]', el); if (cn) cn.addEventListener('click', async () => {
      await app.saveSettings({ obs: { port: Number($('#st-port', el).value) || 4455, password: $('#st-pass', el).value } });
      V5.OBS.reset(); app.toast('CONNECTING TO OBS…');
      try { await V5.OBS.connect(); await obsSync(); app.toast('OBS CONNECTED'); } catch (e) { H.err = e.message; app.toast(e.message.toUpperCase()); app.render(true); }
    });
    $('#st-mic', el).addEventListener('change', async (e) => { await save({ mic: e.target.value.trim() || 'Mic/Aux' }); if (H.connected) obsSync(); });
    $$('[data-st-tog]', el).forEach((b) => b.addEventListener('click', () => {
      const k = b.dataset.stTog;
      if (!app.pro(k === 'clip' ? 'clips' : k === 'recap' ? 'recap' : k)) return;
      if (k === 'recap') return save({ recap: t().recap === false });
      save({ [k]: { ...(t()[k] || {}), on: !(t()[k] || {}).on } });
    }));
    $$('[data-st-f]', el).forEach((sel) => sel.addEventListener('change', () => { const [a, b] = sel.dataset.stF.split('.'); save({ [a]: { ...(t()[a] || {}), [b]: sel.value } }); }));
    $$('[data-st-rmapp]', el).forEach((b) => b.addEventListener('click', () => { const sh = t().shield || {}; save({ shield: { ...sh, apps: (sh.apps || []).filter((x) => x !== b.dataset.stRmapp) } }); }));
    const exeOf = (v) => { v = String(v || '').trim().toLowerCase(); if (!v) return ''; if (!/\.exe$/.test(v)) v += '.exe'; return /^[\w .()+-]+\.exe$/.test(v) ? v : ''; };
    const sa = $('[data-st-shadd]', el); if (sa) sa.addEventListener('click', () => { const v = exeOf($('#st-shapp', el).value); if (!v) return app.toast('JUST THE PROGRAM NAME, LIKE DISCORD.EXE'); const sh = t().shield || {}; save({ shield: { ...sh, apps: [...new Set([...(sh.apps || []), v])].slice(0, 30) } }); });
    $$('[data-st-rmrule]', el).forEach((b) => b.addEventListener('click', () => { const d = t().director || {}; const rules = (d.rules || []).slice(); rules.splice(Number(b.dataset.stRmrule), 1); save({ director: { ...d, rules } }); }));
    const ra = $('[data-st-radd]', el); if (ra) ra.addEventListener('click', () => { const exe = exeOf($('#st-rexe', el).value); const scene = $('#st-rscene', el).value; if (!exe || !scene) return app.toast('PICK AN APP AND A SCENE'); const d = t().director || {}; save({ director: { ...d, rules: [...(d.rules || []).filter((r) => r.exe !== exe), { exe, scene }].slice(0, 20) } }); });
    const auto = $('[data-st-auto]', el); if (auto) auto.addEventListener('click', () => { const c = t().clip || {}; save({ clip: { ...c, autoBuffer: c.autoBuffer === false } }); });
    const hk = $('#st-hk', el); if (hk) app.hotkeyRecorder(hk, (combo) => { if (combo) { const c = t().clip || {}; save({ clip: { ...c, hotkey: combo } }); } });
  }

  /* ================= SCHOOL ================= */
  const SC = { cal: null, status: null, loading: false, tick: null };
  const sc = () => (appRef.state.settings.school || {});
  async function loadSchool(force) {
    if (SC.loading) return; SC.loading = true;
    try {
      const [cal, status] = await Promise.all([sc().ics ? window.cat.schoolCalendar(!!force) : Promise.resolve({ events: [] }), window.cat.schoolStatus()]);
      SC.cal = cal && !cal.error ? cal : { events: [], error: cal && cal.error };
      if (cal && cal.error && !cal.events) SC.cal = { events: [], error: cal.error };
      SC.status = status;
    } finally { SC.loading = false; }
    if (appRef.state.section === 'school' && !document.querySelector('#modal.open')) appRef.render(true);
  }
  function classFor(title) {
    const t = String(title || '').toLowerCase();
    return (sc().classes || []).find((c) => { const n = c.name.toLowerCase(); return t.includes(n) || (n.split(/\s+/)[0].length >= 4 && t.includes(n.split(/\s+/)[0])) || (c.code && t.includes(c.code.toLowerCase())); });
  }
  const POINTS = { 'A+': 4, A: 4, 'A-': 3.7, 'B+': 3.3, B: 3, 'B-': 2.7, 'C+': 2.3, C: 2, 'C-': 1.7, 'D+': 1.3, D: 1, 'D-': 0.7, F: 0 };
  function gradePoints(g) {
    const v = String(g || '').trim().toUpperCase();
    if (v in POINTS) return POINTS[v];
    const n = parseFloat(v); if (!isFinite(n)) return null;
    if (n <= 4.3 && /\./.test(v)) return Math.min(4, n);
    return n >= 93 ? 4 : n >= 90 ? 3.7 : n >= 87 ? 3.3 : n >= 83 ? 3 : n >= 80 ? 2.7 : n >= 77 ? 2.3 : n >= 73 ? 2 : n >= 70 ? 1.7 : n >= 67 ? 1.3 : n >= 65 ? 1 : 0;
  }
  function gpa(rows) {
    let u = 0, w = 0, c = 0;
    for (const r of rows) {
      const p = gradePoints(r.grade); const cr = Number(r.credits) || 1; if (p === null) continue;
      u += p * cr; w += (p + (p > 0 ? (r.level === 'ap' ? 1 : r.level === 'honors' ? 0.5 : 0) : 0)) * cr; c += cr;
    }
    return c ? { unweighted: u / c, weighted: w / c, credits: c } : null;
  }
  function dayKey(t) { const d = new Date(t); return d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate(); }
  function dayLabel(t) {
    const d = new Date(t); const today = new Date(); const tm = new Date(Date.now() + 86400000);
    if (dayKey(d) === dayKey(today)) return 'TODAY'; if (dayKey(d) === dayKey(tm)) return 'TOMORROW';
    return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' }).toUpperCase();
  }

  function school(app) {
    appRef = appRef || app;
    const S = app.state; const s = sc(); const pro = app.isPro();
    if (!SC.status && !SC.loading) loadSchool();
    const evs = (SC.cal && SC.cal.events) || [];
    const done = new Set(s.done || []);
    const now = Date.now(); const endToday = new Date(); endToday.setHours(23, 59, 59, 999);
    const todayTimed = evs.filter((e) => !e.due && e.start <= endToday.getTime() && (e.end || e.start) >= now - 3600000 && dayKey(e.start) === dayKey(now));
    const due = evs.filter((e) => e.due && e.start >= now - 86400000 && e.start <= now + 8 * 86400000);
    const overdue = evs.filter((e) => e.due && e.start < now - 86400000 && e.start > now - 3 * 86400000 && !done.has(e.id));
    const next = todayTimed.find((e) => e.start > now);
    const nowCls = todayTimed.find((e) => e.start <= now && e.end > now);
    const dueLeft = due.filter((e) => !done.has(e.id)).length;
    const lock = (SC.status && SC.status.lock) || { on: false };
    const hist = (SC.status && SC.status.history) || { today: 0, streak: 0, week: [] };
    const g = gpa(s.grades || []);
    const groups = [];
    for (const e of due) { const k = dayKey(e.start); let gr = groups.find((x) => x.k === k); if (!gr) groups.push(gr = { k, label: dayLabel(e.start), list: [] }); gr.list.push(e); }
    const evRow = (e) => { const c = classFor(e.title); const isDone = done.has(e.id); return `<div class="sc-item ${isDone ? 'done' : ''}"><button type="button" class="sc-box" data-sc-done="${esc(e.id)}" aria-label="Mark done">${isDone ? '✓' : ''}</button><span class="sc-dot" style="background:${c ? esc(c.color) : 'var(--line-2)'}"></span><span class="nm">${esc(e.title)}${c ? `<small>${esc(c.name)}</small>` : ''}</span><span class="tm">${e.allDay ? '' : timeOf(e.start)}</span>${e.url ? `<button type="button" class="act" data-url="${esc(e.url)}" aria-label="Open">↗</button>` : ''}</div>`; };
    const maxWeek = Math.max(30, ...hist.week.map((d) => d.mins));
    const headline = nowCls ? `<b>NOW</b> ${esc(nowCls.title)} <span>until ${timeOf(nowCls.end)}</span>` : next ? `<b>NEXT</b> ${esc(next.title)} <span>${timeOf(next.start)} · in ${hm((next.start - now) / 60000)}</span>` : dueLeft ? `<b>${dueLeft}</b> thing${dueLeft === 1 ? '' : 's'} due this week` : s.ics ? '<b>ALL CLEAR</b> nothing due this week' : '<b>WELCOME</b> add your school calendar to see what’s due';
    const html = `<div class="sc-top"><div class="sc-date">${esc(new Date().toLocaleDateString([], { weekday: 'long' }).toUpperCase())}<small>${esc(new Date().toLocaleDateString([], { month: 'long', day: 'numeric' }))}</small></div><div class="sc-head">${headline}</div>${SC.status && SC.status.meeting ? '<span class="st-live">● IN A MEETING</span>' : ''}</div>
      <div class="split"><div class="grow">
        ${todayTimed.length ? `${rowLabel('TODAY')}<div class="sc-list">${todayTimed.map((e) => { const c = classFor(e.title); const on = e.start <= now && e.end > now; return `<div class="sc-item ${on ? 'now' : ''}"><span class="sc-time">${timeOf(e.start)}</span><span class="sc-dot" style="background:${c ? esc(c.color) : 'var(--line-2)'}"></span><span class="nm">${esc(e.title)}${e.where ? `<small>${esc(e.where)}</small>` : ''}</span>${c && c.link ? `<button type="button" class="btn small ${on ? 'accent' : 'ghost'}" data-url="${esc(c.link)}">JOIN</button>` : ''}</div>`; }).join('')}</div>` : ''}
        ${rowLabel('DUE SOON', s.ics ? (SC.cal && SC.cal.at ? 'UPDATED ' + esc(ago(SC.cal.at).toUpperCase()) : '') : '', s.ics ? '<button type="button" class="act" data-sc-refresh>REFRESH</button>' : '')}
        ${SC.cal && SC.cal.error ? `<div class="ph-warn problem"><span>${esc(SC.cal.error)}</span><span class="btns">${['offline', 'slow', 'down'].includes(SC.cal.errorKind) ? '' : '<button type="button" class="btn small accent" data-sc-icsedit>PASTE A NEW LINK</button>'}<button type="button" class="btn small ghost" data-sc-refresh>TRY AGAIN</button></span></div>` : ''}
        ${overdue.length ? `<div class="sc-group"><div class="sc-day late">LATE</div>${overdue.map(evRow).join('')}</div>` : ''}
        ${groups.length ? groups.map((gr) => `<div class="sc-group"><div class="sc-day">${gr.label}</div>${gr.list.map(evRow).join('')}</div>`).join('') : s.ics ? (SC.loading || !SC.cal ? empty('Loading your calendar…') : empty('Nothing due in the next week.')) : ''}
        ${s.ics ? '' : `<div class="sc-setup"><h3>Add your school calendar</h3><p class="note">Paste a calendar link and your assignments and classes show up here on their own.</p>
          <ul class="note"><li><b>Google Classroom:</b> Google Calendar › Settings › your class calendar › <b>Secret address in iCal format</b></li><li><b>Canvas:</b> Calendar › <b>Calendar Feed</b> (bottom right)</li><li><b>Outlook / Teams:</b> Calendar settings › Shared calendars › <b>Publish a calendar</b> › ICS link</li><li><b>Schoology:</b> Calendar › <b>Export</b></li></ul>
          <div class="st-add"><input class="input" id="sc-ics" placeholder="https://…/calendar.ics" style="flex:1"><button type="button" class="btn accent" data-sc-ics>ADD</button></div></div>`}
        ${rowLabel('MY TO-DO')}
        <div class="sc-list">${(s.todos || []).map((t) => `<div class="sc-item ${t.done ? 'done' : ''}"><button type="button" class="sc-box" data-sc-todo="${esc(t.id)}" aria-label="Done">${t.done ? '✓' : ''}</button><span class="nm">${esc(t.text)}</span><button type="button" class="act" data-sc-tdel="${esc(t.id)}" aria-label="Remove">×</button></div>`).join('')}</div>
        <div class="st-add"><input class="input" id="sc-todo" placeholder="Add something you need to do" maxlength="120" style="flex:1"><button type="button" class="btn small ghost" data-sc-tadd>+ ADD</button></div>
        ${s.ics ? `<div class="opt"><span class="lab">Calendar link<small>Only you can see it. Catalyst checks it every few hours.</small></span><span class="ctl"><button type="button" class="btn small ghost" data-sc-icsedit>CHANGE</button><button type="button" class="btn small ghost" data-sc-icsrm>REMOVE</button></span></div>` : ''}
      </div><aside style="width:400px" class="st-side">
        ${rowLabel('CLASSES', '', '<button type="button" class="act" data-sc-cadd>+ ADD</button>')}
        ${(s.classes || []).length ? `<div class="sc-classes">${s.classes.map((c) => `<div class="sc-class" style="--c:${esc(c.color)}"><button type="button" class="sc-cname" data-sc-cedit="${esc(c.id)}">${esc(c.name)}<small>${c.ws ? 'WORKSPACE · ' : ''}${c.link ? 'CLASS LINK' : 'TAP TO EDIT'}</small></button>${c.ws || c.link ? `<button type="button" class="btn small accent" data-sc-open="${esc(c.id)}">OPEN</button>` : ''}</div>`).join('')}</div>` : empty('Add your classes. Each one can open its own workspace (the apps, docs and sites you need) and your Zoom, Meet or Teams link in one click.')}
        <div class="st-card ${lock.on ? 'on' : ''}"><div class="st-card-h"><b>STUDY LOCK${app.proTag()}</b>${lock.on ? `<span class="st-live">ON</span>` : ''}</div>
          ${lock.on ? `<div class="sc-lock"><b id="sc-lock-clock">${clockOf(lock.until - now)}</b><span>${lock.blocked ? 'Blocked ' + lock.blocked + ' distraction' + (lock.blocked === 1 ? '' : 's') : 'Distractions are blocked'}</span></div><div class="btns"><button type="button" class="btn small ghost danger" data-sc-unlock>END EARLY</button></div>`
          : `<div class="note">Closes your distractions and keeps them closed until the timer ends.</div>
            <div class="seg sc-mins">${[25, 45, 60, 90].map((m) => `<button type="button" class="${(s.studyMins || 45) === m ? 'on' : ''}" data-sc-mins="${m}">${m} MIN</button>`).join('')}</div>
            <div class="st-chips">${(s.studyApps || []).map((a) => `<span class="chip on">${esc(a.replace(/\.exe$/, ''))}<button type="button" data-sc-rmapp="${esc(a)}" aria-label="Remove ${esc(a)}">×</button></span>`).join('')}</div>
            <div class="st-add"><input class="input" id="sc-app" placeholder="steam.exe"><button type="button" class="btn small ghost" data-sc-addapp>+ APP</button></div>
            <div class="btns"><button type="button" class="btn accent" data-sc-lock>START STUDYING</button></div>`}
          <div class="sc-week">${hist.week.map((d) => `<div><i style="height:${Math.round(d.mins / maxWeek * 44)}px" class="${d.mins ? 'on' : ''}"></i><span>${d.label[0]}</span></div>`).join('')}</div>
          <div class="note">${hm(hist.today)} today${hist.streak > 1 ? ' · ' + hist.streak + ' day streak' : ''}</div></div>
        <div class="st-card ${s.meeting && pro ? 'on' : ''}"><div class="st-card-h"><b>MEETING MODE${app.proTag()}</b>${tog(s.meeting && pro, 'data-sc-meet', 'Meeting mode')}</div><div class="note">When a Zoom, Teams, Meet or Webex call is in front, Catalyst pauses your music and turns Game Mode off.</div></div>
        <div class="st-card"><div class="st-card-h"><b>GRADES${app.proTag()}</b>${g && pro ? `<span class="sc-gpa">${g.unweighted.toFixed(2)}<small>GPA</small></span>` : ''}</div>
          ${pro ? `${g ? `<div class="note">Weighted ${g.weighted.toFixed(2)} · ${g.credits} credit${g.credits === 1 ? '' : 's'}</div>` : '<div class="note">Add your classes and grades (letters or percents). Honors adds 0.5, AP adds 1 to the weighted GPA.</div>'}
            <div class="sc-grades">${(s.grades || []).map((r, i) => `<div class="sc-grade"><input class="input" data-gr="${i}:name" value="${esc(r.name)}" placeholder="Class" aria-label="Class"><input class="input" data-gr="${i}:grade" value="${esc(r.grade)}" placeholder="A- / 91" aria-label="Grade" style="width:76px"><select class="input" data-gr="${i}:level" aria-label="Level" style="width:92px">${[['reg', 'REG'], ['honors', 'HON'], ['ap', 'AP']].map(([k, l]) => `<option value="${k}" ${r.level === k ? 'selected' : ''}>${l}</option>`).join('')}</select><button type="button" class="act" data-gr-del="${i}" aria-label="Remove">×</button></div>`).join('')}</div>
            <div class="btns"><button type="button" class="btn small ghost" data-gr-add>+ CLASS</button></div>` : '<div class="note">Track your grades and see your GPA, weighted and unweighted.</div>'}</div>
      </aside></div>`;
    return {
      title: 'SCHOOL', html,
      mount(el) {
        bindSchool(app, el);
        clearInterval(SC.tick);
        if (lock.on) SC.tick = setInterval(() => { const c = document.getElementById('sc-lock-clock'); if (!c || app.state.section !== 'school') return clearInterval(SC.tick); c.textContent = clockOf(lock.until - Date.now()); if (Date.now() >= lock.until) { clearInterval(SC.tick); loadSchool(); } }, 1000);
      }
    };
  }
  function bindSchool(app, el) {
    const s = () => app.state.settings.school || {};
    const save = async (patch, reload) => { await app.saveSettings({ school: { ...s(), ...patch } }); if (reload) await loadSchool(true); app.render(true); };
    const on = (sel, fn) => $$(sel, el).forEach((b) => b.addEventListener('click', (e) => fn(b, e)));
    on('[data-sc-done]', (b) => { const d = new Set(s().done || []); const id = b.dataset.scDone; if (d.has(id)) d.delete(id); else d.add(id); save({ done: [...d].slice(-400) }); });
    on('[data-sc-refresh]', async () => { app.toast('REFRESHING'); await loadSchool(true); });
    const addIcs = async (v) => { v = String(v || '').trim(); if (!v) return; await save({ ics: v }, true); const c = SC.cal || {}; app.toast(c.error ? 'COULDN’T READ THAT LINK' : (c.events || []).length + ' EVENTS ADDED'); };
    on('[data-sc-ics]', () => addIcs($('#sc-ics', el).value));
    on('[data-sc-icsedit]', () => app.promptDialog('Calendar link', 'ICS LINK', s().ics, (v) => v && addIcs(v)));
    on('[data-sc-icsrm]', () => app.confirm('Remove your calendar link?', () => save({ ics: '' }, true)));
    const addTodo = () => { const v = $('#sc-todo', el).value.trim(); if (v) save({ todos: [...(s().todos || []), { id: 't' + Date.now().toString(36), text: v.slice(0, 120), done: false }].slice(-50) }); };
    on('[data-sc-tadd]', addTodo);
    const ti = $('#sc-todo', el); if (ti) ti.addEventListener('keydown', (e) => { if (e.key === 'Enter') addTodo(); });
    on('[data-sc-todo]', (b) => save({ todos: (s().todos || []).map((t) => (t.id === b.dataset.scTodo ? { ...t, done: !t.done } : t)) }));
    on('[data-sc-tdel]', (b) => save({ todos: (s().todos || []).filter((t) => t.id !== b.dataset.scTdel) }));
    on('[data-sc-cadd]', () => classDialog(app, null));
    on('[data-sc-cedit]', (b) => classDialog(app, (s().classes || []).find((c) => c.id === b.dataset.scCedit)));
    on('[data-sc-open]', (b) => { const c = (s().classes || []).find((x) => x.id === b.dataset.scOpen); if (!c) return; if (c.ws) app.launchWorkspace(c.ws); if (c.link) window.cat.launchUrl(c.link); app.toast('OPENING ' + c.name.toUpperCase()); });
    on('[data-sc-mins]', (b) => save({ studyMins: Number(b.dataset.scMins) }));
    on('[data-sc-rmapp]', (b) => save({ studyApps: (s().studyApps || []).filter((x) => x !== b.dataset.scRmapp) }));
    on('[data-sc-addapp]', () => { let v = $('#sc-app', el).value.trim().toLowerCase(); if (!v) return; if (!/\.exe$/.test(v)) v += '.exe'; if (!/^[\w .()+-]+\.exe$/.test(v)) return app.toast('JUST THE PROGRAM NAME, LIKE STEAM.EXE'); save({ studyApps: [...new Set([...(s().studyApps || []), v])].slice(0, 30) }); });
    on('[data-sc-lock]', () => startStudy(app, s().studyMins || 45));
    on('[data-sc-unlock]', () => app.confirm('End study lock early?', async () => { await window.cat.studyUnlock(); await loadSchool(); }));
    on('[data-sc-meet]', () => { if (!app.pro('meeting')) return; save({ meeting: !s().meeting }); });
    on('[data-gr-add]', () => save({ grades: [...(s().grades || []), { name: '', grade: '', credits: 1, level: 'reg' }].slice(0, 20) }));
    on('[data-gr-del]', (b) => { const g = (s().grades || []).slice(); g.splice(Number(b.dataset.grDel), 1); save({ grades: g }); });
    $$('[data-gr]', el).forEach((inp) => inp.addEventListener('change', () => { const [i, k] = inp.dataset.gr.split(':'); const g = (s().grades || []).map((r) => ({ ...r })); if (!g[i]) return; g[i][k] = inp.value.slice(0, 40); save({ grades: g }); }));
  }
  async function startStudy(app, mins) {
    if (!app.pro('study')) return false;
    const r = await window.cat.studyLock(mins, (app.state.settings.school || {}).studyApps || []);
    if (r && r.on) { app.toast('STUDY LOCK · ' + mins + ' MIN'); await loadSchool(); return true; }
    return false;
  }
  function classDialog(app, c) {
    const S = app.state; const isNew = !c;
    c = c ? { ...c } : { id: 'cl' + Date.now().toString(36), name: '', color: COLORS[(S.settings.school.classes || []).length % COLORS.length], link: '', ws: '', code: '' };
    app.openModal(`<h2>${isNew ? 'Add a class' : 'Edit class'}</h2>
      <label class="field"><span>NAME</span><input class="input" id="cn" value="${esc(c.name)}" placeholder="Biology" maxlength="40"></label>
      <label class="field"><span>COURSE CODE (OPTIONAL, HELPS MATCH ASSIGNMENTS)</span><input class="input" id="cc" value="${esc(c.code || '')}" placeholder="BIO 101" maxlength="20"></label>
      <label class="field"><span>CLASS LINK: ZOOM, MEET, TEAMS OR CLASSROOM (OPTIONAL)</span><input class="input" id="cl" value="${esc(c.link)}" placeholder="https://meet.google.com/…"></label>
      <label class="field"><span>OPENS THIS WORKSPACE (OPTIONAL)</span><select class="input" id="cw"><option value="">None</option>${S.workspaces.map((w) => `<option value="${esc(w.id)}" ${c.ws === w.id ? 'selected' : ''}>${esc(w.name)}</option>`).join('')}</select></label>
      <div class="swatches">${COLORS.map((x) => `<button type="button" class="swatch ${c.color === x ? 'on' : ''}" style="background:${x}" data-cc="${x}" aria-label="Color"></button>`).join('')}</div>
      <div class="btns" style="justify-content:space-between"><span>${isNew ? '' : '<button type="button" class="btn ghost danger" data-del>DELETE</button>'}</span><span class="btns"><button type="button" class="btn ghost" data-x>CANCEL</button><button type="button" class="btn solid" data-ok>SAVE</button></span></div>`, (m) => {
      $$('[data-cc]', m).forEach((b) => b.addEventListener('click', () => { c.color = b.dataset.cc; $$('[data-cc]', m).forEach((x) => x.classList.toggle('on', x === b)); }));
      $('[data-x]', m).addEventListener('click', app.closeModal);
      const del = $('[data-del]', m); if (del) del.addEventListener('click', async () => { app.closeModal(); await app.saveSettings({ school: { ...S.settings.school, classes: S.settings.school.classes.filter((x) => x.id !== c.id) } }); app.render(true); });
      $('[data-ok]', m).addEventListener('click', async () => {
        c.name = $('#cn', m).value.trim().slice(0, 40); if (!c.name) return;
        c.code = $('#cc', m).value.trim().slice(0, 20);
        let link = $('#cl', m).value.trim(); if (link && !/^https?:\/\//i.test(link)) link = 'https://' + link; c.link = link.slice(0, 500);
        c.ws = $('#cw', m).value;
        const list = (S.settings.school.classes || []).filter((x) => x.id !== c.id);
        const at = (S.settings.school.classes || []).findIndex((x) => x.id === c.id);
        list.splice(at >= 0 ? at : list.length, 0, c);
        app.closeModal(); await app.saveSettings({ school: { ...S.settings.school, classes: list.slice(0, 16) } }); app.render(true);
      });
    });
  }
  function onStudy(status) { if (SC.status) SC.status.lock = status; if (appRef && appRef.state.section === 'school') appRef.render(true); }
  function onMeeting(on) { if (SC.status) SC.status.meeting = on; if (appRef && appRef.state.section === 'school') appRef.render(true); }

  /* ================= SMART COMMANDS ================= */
  // "stream mode and mute discord", "study 45 minutes", "pause music then open spotify", no AI needed.
  const UNIT = '(m|min|mins|minute|minutes|h|hr|hrs|hour|hours)?';
  function minsOf(n, u) { n = Number(n); return /^h/.test(u || '') ? n * 60 : n; }
  function findItem(app, q) {
    const list = app.visibleItems().map((it) => [it, Math.max(U.score(q, it.name), U.score(q, it.original || '') - 50)]).filter(([, s]) => s >= 300).sort((a, b) => b[1] - a[1]);
    return list.length ? list[0][0] : null;
  }
  function exeFor(app, q) {
    const it = findItem(app, q); if (it && it.exe) return { exe: it.exe, name: it.name };
    const w = q.toLowerCase().replace(/\.exe$/, '').trim();
    return /^[\w .()+-]+$/.test(w) ? { exe: w.replace(/\s+/g, '') + '.exe', name: q.replace(/\b\w/g, (ch) => ch.toUpperCase()) } : null;
  }
  function clause(app, raw) {
    const c = raw.trim().toLowerCase().replace(/^(please|pls|can you|catalyst)\s+/, '').replace(/[.!?]+$/, '');
    let m;
    const step = (label, run, smart = true) => ({ label, run, smart });
    if (/^(stream(ing)?|streamer) mode( on)?$/.test(c)) return step('Stream mode', async () => {
      const obs = app.visibleItems().find((i) => /^obs\b/i.test(i.name) || /^obs(64)?\.exe$/i.test(i.exe || ''));
      if (obs && !H.obsRunning && !H.connected) await app.launch(obs.id);
      app.go('stream');
    });
    if (/^(go live|start( the)? stream(ing)?)$/.test(c)) return step('Go live', async () => { try { await V5.OBS.call('StartStream'); } catch (e) { app.toast('OBS: ' + e.message.toUpperCase()); } });
    if (/^(end|stop)( the)? stream(ing)?$/.test(c)) return step('End stream', async () => { try { await V5.OBS.call('StopStream'); } catch (e) { app.toast('OBS: ' + e.message.toUpperCase()); } });
    if (/^(clip( that| it)?|save( a)? clip)$/.test(c)) return step('Save a clip', () => saveClip(app));
    if ((m = c.match(/^(?:switch to |obs )?scene (.+)$/))) {
      // only when OBS is connected and has a scene by that name (so "scene builder" still finds the app)
      const want = m[1]; const sc = H.scenes.find((x) => x.toLowerCase() === want) || H.scenes.find((x) => x.toLowerCase().includes(want));
      if (!H.connected || !sc) return null;
      return step('OBS scene: ' + sc, async () => { try { await V5.OBS.call('SetCurrentProgramScene', { sceneName: sc }); } catch (e) { app.toast('OBS: ' + e.message.toUpperCase()); } });
    }
    if ((m = c.match(/^game ?mode( on| off)?$/))) return step('Game Mode' + (m[1] || ''), () => { const want = m[1] ? m[1].trim() === 'on' : !app.state.gameMode; if (want !== app.state.gameMode) return app.toggleGameMode(); });
    if ((m = c.match(new RegExp('^(?:study|study mode|study lock|lock in)(?: for)?(?: (\\d+(?:\\.\\d+)?) ?' + UNIT + ')?$')))) {
      const mins = Math.max(5, Math.min(240, Math.round(minsOf(m[1] || (app.state.settings.school || {}).studyMins || 45, m[2]))));
      return step('Study ' + mins + ' min', async () => { if (app.isPro()) await startStudy(app, mins); else app.startFocus(mins); });
    }
    if ((m = c.match(new RegExp('^(?:focus|timer)(?: for)? (\\d+(?:\\.\\d+)?) ?' + UNIT + '$')))) { const mins = Math.max(1, Math.min(240, Math.round(minsOf(m[1], m[2])))); return step('Focus ' + mins + ' min', () => app.startFocus(mins), false); }
    if ((m = c.match(new RegExp('^remind me (?:in|after) (\\d+(?:\\.\\d+)?) ?' + UNIT + '(?: to (.+))?$')))) {
      const mins = Math.max(1, Math.min(720, minsOf(m[1], m[2]))); const what = (raw.match(/ to (.+)$/i) || [])[1] || 'Time’s up';
      return step('Remind me in ' + Math.round(mins) + ' min', () => { setTimeout(() => { window.cat.notify('Reminder', what); app.toast('REMINDER: ' + what.toUpperCase()); }, mins * 60000); app.toast('OK · ' + Math.round(mins) + ' MIN'); });
    }
    if ((m = c.match(/^meeting mode( on| off)?$/))) return step('Meeting mode' + (m[1] || ''), async () => { if (!app.pro('meeting')) return; const cur = !!(app.state.settings.school || {}).meeting; const want = m[1] ? m[1].trim() === 'on' : !cur; await app.saveSettings({ school: { ...app.state.settings.school, meeting: want } }); app.toast('MEETING MODE ' + (want ? 'ON' : 'OFF')); });
    if ((m = c.match(/^(mute|unmute)( my)? (mic|microphone)$/)) || (m = c.match(/^(mic|microphone) (on|off)$/))) {
      const mute = m[1] === 'mute' || m[2] === 'off';
      return step((mute ? 'Mute' : 'Unmute') + ' mic', async () => { const r = await window.cat.mic(mute ? 'on' : 'off'); app.toast(r === null ? 'NO MIC FOUND' : r ? 'MIC MUTED' : 'MIC LIVE'); });
    }
    if (/^(mute|unmute) (the )?(pc|computer|sound|volume|everything|all)$/.test(c)) return step('Mute / unmute sound', () => window.cat.volume('mute'));
    if ((m = c.match(/^(mute|unmute|silence) (.+)$/))) {
      const t = exeFor(app, m[2]); if (!t) return null;
      const mute = m[1] !== 'unmute';
      return step((mute ? 'Mute ' : 'Unmute ') + t.name, async () => { const r = await window.cat.appMute(t.exe, mute ? 'on' : 'off'); app.toast(r === null ? t.name.toUpperCase() + ' ISN’T PLAYING SOUND' : (r ? 'MUTED ' : 'UNMUTED ') + t.name.toUpperCase()); });
    }
    if ((m = c.match(/^(?:turn )?(?:the )?volume (up|down)$|^turn (it )?(up|down)$/))) { const d = m[1] || m[3]; return step('Volume ' + d, async () => { for (let i = 0; i < 5; i++) await window.cat.volume(d); }); }
    if ((m = c.match(/^(pause|play|resume|stop|next|skip|previous|prev|back)(?: (?:the )?(?:music|song|track|spotify))?$/))) {
      const k = { pause: 'toggle', play: 'toggle', resume: 'toggle', stop: 'toggle', next: 'next', skip: 'next', previous: 'prev', prev: 'prev', back: 'prev' }[m[1]];
      if (m[1] === 'stop' && !/music|song|track/.test(c)) return null;
      return step(m[1][0].toUpperCase() + m[1].slice(1) + ' music', async () => {
        const med = app.state.media; const playing = med && med.status === 'Playing';
        if (k === 'toggle' && ((/pause|stop/.test(m[1]) && !playing) || (/play|resume/.test(m[1]) && playing))) return;
        await window.cat.mediaKey(k);
      });
    }
    if (/^lock( my)? (pc|computer|screen)$/.test(c)) return step('Lock PC', () => window.cat.lockPc());
    if (/^(clean( ?up)?( my)?( pc)?|free up space)$/.test(c)) return step('Clean up my PC', () => { app.state.mypcTab = 'health'; app.go('mypc'); });
    if (/^((what'?s |whats )(due|homework)( today| this week| soon)?|(due|homework) (today|this week|soon))$/.test(c)) return step('What’s due', () => app.go('school'));
    if ((m = c.match(/^(?:vibe|theme) (\w+)$/))) { const v = m[1]; if (!app.BUILTIN_VIBES.includes(v)) return null; return step('Vibe: ' + v, async () => { if (!app.FREE_VIBES.includes(v) && !app.pro('vibes')) return; await app.saveSettings({ vibe: v }); }); }
    if ((m = c.match(/^(?:open|launch|start) (.+)$/))) {
      const q = m[1];
      const ws = app.state.workspaces.find((w) => U.score(q, w.name) >= 300);
      if (ws) return step('Open ' + ws.name, () => app.launchWorkspace(ws.id), false);
      const it = findItem(app, q); if (it) return step('Open ' + it.name, () => app.launch(it.id), false);
      const sec = app.state.sections.find((s) => U.score(q, s.label) >= 300); if (sec) return step('Go to ' + sec.label, () => app.go(sec.id), false);
      return null;
    }
    if ((m = c.match(/^(?:close|quit|kill|exit) (.+)$/))) { const t = exeFor(app, m[1]); if (!t) return null; return step('Close ' + t.name, async () => { const ok = await window.cat.closeProcess(t.exe); if (!ok) app.toast(t.name.toUpperCase() + ' WASN’T OPEN'); }, false); }
    if ((m = c.match(/^(?:go to|show( me)?) (.+)$/))) { const q = m[2]; const sec = app.state.sections.find((s) => U.score(q, s.label) >= 300); if (sec) return step('Go to ' + sec.label, () => app.go(sec.id), false); return null; }
    return null;
  }
  function smart(app, q) {
    const raw = String(q || '').trim(); if (raw.length < 3) return null;
    const parts = raw.split(/\s*(?:,|;|\band then\b|\bthen\b|\band\b|&|\+)\s*/i).filter(Boolean);
    if (parts.length > 6) return null;
    const steps = parts.map((p) => clause(app, p));
    if (steps.some((x) => !x)) return null;
    if (steps.length === 1 && !steps[0].smart) return null; // plain "open x" is handled by normal search
    // one word on its own ("play", "back", "study") is more likely a search than a command
    if (steps.length === 1 && !/\s/.test(raw)) return null;
    // never jump ahead of an app whose name you typed
    const exact = app.visibleItems().some((it) => it.name.toLowerCase() === raw.toLowerCase());
    return {
      group: exact ? 'COMMANDS' : 'ANSWER', answer: !exact, smart: true, label: steps.map((x) => x.label).join('  →  '), tag: steps.length > 1 ? steps.length + ' STEPS' : 'SMART', initials: '⚡',
      run: async () => { for (const x of steps) { await x.run(); await new Promise((r) => setTimeout(r, 250)); } if (steps.length > 1) app.toast('DONE · ' + steps.length + ' STEPS'); }
    };
  }

  return { isLive: () => !!(H.live || H.rec), PACKS, PACKABLE, VIEW_SECTIONS, packUses, packStep, bindPackStep, packsDialog, customizeTab, bindCustomize, navMenu, mypc, stream, school, startStream, onFg, onSystem, saveClip, onStudy, onMeeting, loadSchool, smart, gpa, gradePoints, clause };
})();
