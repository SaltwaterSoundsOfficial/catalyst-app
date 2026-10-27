// v0.5 screens: Catalyst on your phone (pairing, Deck editor, Drop, alerts, controls),
// PC Doctor, live wallpapers + desktop widgets, plus the OBS + soundboard runners the Deck uses.
const V5 = (() => {
  const { esc, ago, fileUrl } = U;
  const bytes = (n) => { n = Number(n) || 0; return n >= 1e12 ? (n / 1e12).toFixed(1) + ' TB' : n >= 1e9 ? (n / 1e9).toFixed(1) + ' GB' : n >= 1e6 ? (n / 1e6).toFixed(n >= 1e8 ? 0 : 1) + ' MB' : n >= 1e3 ? Math.round(n / 1e3) + ' KB' : n + ' B'; };
  const $ = (s, r = document) => r.querySelector(s);
  const KIND_LABEL = {
    workspace: 'Launch a workspace', item: 'Open an app, game or site', flow: 'Run a Flow', media: 'Music: play / pause / skip', volume: 'Volume up / down / mute',
    mic: 'Mute / unmute your mic', gamemode: 'Game Mode on / off', screenshot: 'Take a screenshot', url: 'Open a web address', keys: 'Press a hotkey',
    'obs-scene': 'OBS: switch scene', 'obs-stream': 'OBS: start / stop stream', 'obs-record': 'OBS: start / stop recording', 'obs-mute': 'OBS: mute an audio source', sound: 'Soundboard: play a sound'
  };
  const COLORS = ['#ff5a1f', '#ff2e88', '#8f7bff', '#2d8cff', '#22c7a9', '#3dbb5c', '#e8b923', '#1f1f1f', '#3a3a3a', '#ededed'];
  // Ready-made pages for an empty Deck. Only buttons that work with no setup (OBS ones need OBS connected below).
  const STARTERS = {
    everyday: { name: 'Everyday', note: 'Music, volume, mic, screenshot', buttons: [['media', 'prev', 'Previous', '#3a3a3a'], ['media', 'toggle', 'Play / Pause', '#ff5a1f'], ['media', 'next', 'Next', '#3a3a3a'], ['volume', 'down', 'Vol −', '#1f1f1f'], ['volume', 'up', 'Vol +', '#1f1f1f'], ['volume', 'mute', 'Mute', '#2d8cff'], ['mic', '', 'Mic', '#ff2e88'], ['screenshot', '', 'Screenshot', '#22c7a9']] },
    gaming: { name: 'Gaming', note: 'Game Mode, mic, clips, music', buttons: [['gamemode', '', 'Game Mode', '#3dbb5c'], ['mic', '', 'Mic', '#ff2e88'], ['screenshot', '', 'Screenshot', '#22c7a9'], ['media', 'toggle', 'Music', '#ff5a1f'], ['volume', 'down', 'Vol −', '#1f1f1f'], ['volume', 'up', 'Vol +', '#1f1f1f']] },
    stream: { name: 'Stream', note: 'Go live, record, mute, Game Mode', buttons: [['obs-stream', '', 'Go Live', '#ff2e4d'], ['obs-record', '', 'Record', '#ff5a1f'], ['obs-mute', 'Mic/Aux', 'Mute Mic', '#ff2e88'], ['gamemode', '', 'Game Mode', '#3dbb5c'], ['screenshot', '', 'Screenshot', '#22c7a9'], ['media', 'toggle', 'Music', '#8f7bff']] }
  };
  const textOn = (hex) => { const n = parseInt(hex.slice(1), 16); const l = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; return l > 0.6 ? '#0d0d0d' : '#ffffff'; };

  /* ================= PHONE ================= */
  async function loadPhone(app) { app.state.phone = await window.cat.phoneInfo(); return app.state.phone; }

  function phone(app) {
    const S = app.state, s = S.settings, P = S.phone;
    const tab = S.phoneTab || 'connect';
    if (!P) { loadPhone(app).then(() => app.render(true)); return { title: 'PHONE', html: '<div class="empty">Loading…</div>' }; }
    const st = P.status || {};
    const live = st.lastSeen && Date.now() - st.lastSeen < 60000;
    const tabs = [['connect', 'CONNECT'], ['deck', 'DECK'], ['drop', 'DROP'], ['alerts', 'ALERTS'], ['controls', 'PEEK + CONTROLS']];
    let body = '';
    if (tab === 'connect') body = connectTab(app, P, st);
    if (tab === 'deck') body = deckTab(app, P);
    if (tab === 'drop') body = dropTab(app, P);
    if (tab === 'alerts') body = alertsTab(app, P, st);
    if (tab === 'controls') body = controlsTab(app, P);
    return {
      title: 'PHONE',
      html: `<div class="phone-head"><span class="ph-dot ${st.ok ? (live ? 'live' : 'on') : ''}"></span><span>${st.ok ? (live ? 'PHONE CONNECTED · ' + esc(ago(st.lastSeen)).toUpperCase() : 'READY · WAITING FOR YOUR PHONE') : s.remote.enabled ? 'STARTING…' : 'OFF'}</span>${P.peeking ? '<span class="ph-peek">● YOUR PHONE IS VIEWING THIS SCREEN</span>' : ''}</div>
        <div class="tabs" role="tablist">${tabs.map(([k, l]) => `<button type="button" role="tab" class="${tab === k ? 'on' : ''}" data-ptab="${k}">${l}${k === 'deck' ? app.proTag() : ''}</button>`).join('')}</div>
        <div class="phone-body">${body}</div>`,
      mount(el) {
        el.querySelectorAll('[data-ptab]').forEach((b) => b.addEventListener('click', () => { S.phoneTab = b.dataset.ptab; app.render(true); }));
        if (tab === 'connect') bindConnect(app, el);
        if (tab === 'deck') bindDeck(app, el);
        if (tab === 'drop') bindDrop(app, el);
        if (tab === 'alerts') bindAlerts(app, el);
        if (tab === 'controls') bindControls(app, el);
      }
    };
  }

  function featsHtml(app) {
    return `<div class="ph-feats">${[['DROP', 'Photos, videos, files and links, both ways.', false], ['ALERTS', 'Know when downloads and exports finish.', false], ['AWAY', 'Lock or sleep your PC from anywhere in the house.', false], ['DECK', 'Your own Stream Deck. OBS, mic, sounds, Flows.', true], ['PEEK', 'See your screen live from your phone.', true]].map(([t, d, pro]) => `<div class="ph-feat"><b>${t}${pro ? app.proTag() : ''}</b><span>${d}</span></div>`).join('')}</div>`;
  }
  function connectTab(app, P, st) {
    const s = app.state.settings;
    if (!s.remote.enabled) {
      return `<div class="ph-hero"><div><h3>Your phone, connected to your PC.</h3>
        <p class="note">Send photos and files both ways, get an alert when a download or export finishes, lock or sleep your PC from bed. Pro adds the Deck (your own Stream Deck), Screen Peek and full controls.</p>
        <button type="button" class="btn accent" data-ph-on>TURN ON</button>
        <p class="note">Works on your home Wi-Fi only. Windows may ask to allow Catalyst on private networks the first time. Say yes.</p></div></div>`;
    }
    if (!st.ok) return `<div class="ph-hero"><div><h3>${st.error ? 'Couldn\u2019t start' : 'Starting…'}</h3><p class="note">${esc(st.error || '')}</p>${/port/i.test(st.error || '') ? '<button type="button" class="btn accent" data-ph-port>USE A FREE PORT</button> ' : ''}<button type="button" class="btn ghost" data-ph-retry>TRY AGAIN</button> <button type="button" class="btn ghost" data-ph-off>TURN OFF</button></div></div>`;
    const pub = (st.publicNets || []);
    const warn = pub.length ? `<div class="ph-warn"><b>Your phone can't connect yet.</b> Windows has your Wi-Fi (<b>${esc(pub[0].name)}</b>) set to <b>Public</b>, which blocks phones. Switch it to <b>Private</b> (do this on your home Wi-Fi only):
        <ol><li>Press <b>OPEN WI-FI SETTINGS</b> and click your Wi-Fi name.</li><li>Under <b>Network profile type</b>, pick <b>Private network</b>.</li></ol>
        <div class="btns"><button type="button" class="btn small accent" data-ph-net>OPEN WI-FI SETTINGS</button><button type="button" class="btn small ghost" data-ph-recheck>I DID IT · CHECK AGAIN</button></div></div>` : '';
    // Once a phone is paired, the code that lets a phone in stays hidden (so it can't be scanned off your screen or stream).
    if (st.lastSeen && !s.remote.pairedAt) app.saveSettings({ remote: { pairedAt: Date.now() } });
    const seenNow = st.lastSeen && Date.now() - st.lastSeen < 60000;
    if ((s.remote.pairedAt || st.lastSeen) && !app.state.showPair) {
      return `${warn}<div class="ph-hero ph-paired"><div><h3>Your phone is paired.</h3>
        <p class="note">${seenNow ? 'It’s connected right now.' : st.lastSeen ? 'Last seen ' + esc(ago(st.lastSeen)) + '.' : 'Open Catalyst on your phone to connect.'} The pairing code is hidden so nobody can scan it off your screen or your stream.</p>
        <div class="btns"><button type="button" class="btn accent" data-ph-show>PAIR ANOTHER PHONE</button><button type="button" class="btn ghost" data-ph-newkey>FORGET ALL PHONES</button><button type="button" class="btn ghost" data-ph-off>TURN OFF</button></div>
        <p class="note">Lost a phone, or someone else paired? <b>Forget all phones</b> makes a new code and signs every phone out.</p></div></div>
      ${featsHtml(app)}`;
    }
    return `${warn}<div class="ph-pair">
      <div class="ph-qr ${V6.isLive() && !app.state.qrOk ? 'blurred' : ''}" aria-label="QR code to pair your phone">${st.qr || ''}${V6.isLive() && !app.state.qrOk ? '<button type="button" class="ph-qrcover" data-ph-qrok>You’re live or recording.<br>Click to show the code</button>' : ''}</div>
      <div class="ph-steps">
        <h3>Pair your phone</h3>
        <ol><li>Connect your phone to the <b>same Wi-Fi</b> as this PC.</li><li>Open the camera and <b>scan the code</b>.</li><li>Tap <b>Share › Add to Home Screen</b> so it opens like an app.</li></ol>
        <div class="note">No camera? Open <b>${esc((st.urls || [])[0] || '')}</b> and type the PIN <b class="ph-pin">${V6.isLive() && !app.state.qrOk ? '••••••' : esc(st.pin)}</b></div>
        <div class="ph-help"><b>Page won't load on your phone?</b>
          <ol><li>Make sure the phone is on the <b>same Wi-Fi</b> (not mobile data, not a guest network).</li>
          <li>Press <b>FIX CONNECTION</b> and say Yes. It lets your phone through Windows Firewall.</li>
          ${(st.urls || []).length > 1 ? `<li>Still nothing? Try the other addresses: ${(st.urls || []).slice(1).map((u) => `<b>${esc(u)}</b>`).join(' · ')}</li>` : ''}</ol>
          <button type="button" class="btn small accent" data-ph-fw>FIX CONNECTION</button></div>
        <div class="btns">${s.remote.pairedAt || st.lastSeen ? '<button type="button" class="btn ghost small" data-ph-hide>HIDE CODE</button>' : ''}<button type="button" class="btn ghost small" data-ph-newkey>FORGET ALL PHONES</button><button type="button" class="btn ghost small" data-ph-off>TURN OFF</button></div>
      </div></div>
      ${featsHtml(app)}`;
  }
  function bindConnect(app, el) {
    const on = async (v) => { await app.saveSettings({ remote: { enabled: v } }); setTimeout(() => loadPhone(app).then(() => app.render(true)), 600); };
    const b1 = el.querySelector('[data-ph-on]'); if (b1) b1.addEventListener('click', () => on(true));
    el.querySelectorAll('[data-ph-off]').forEach((b) => b.addEventListener('click', () => on(false)));
    const fp = el.querySelector('[data-ph-port]'); if (fp) fp.addEventListener('click', async () => { const s = app.state.settings; const port = (Number(s.remote.port) || 4747) + 1 + Math.floor(Math.random() * 50); await app.saveSettings({ remote: { ...s.remote, port } }); app.toast('NOW ON PORT ' + port + ' · SCAN THE CODE AGAIN'); loadPhone(app).then(() => app.render(true)); });
    const sp = el.querySelector('[data-ph-show]'); if (sp) sp.addEventListener('click', () => { app.state.showPair = true; app.render(true); clearTimeout(app.state.showPairT); app.state.showPairT = setTimeout(() => { app.state.showPair = false; if (app.state.section === 'phone') app.render(true); }, 3 * 60 * 1000); });
    const qk = el.querySelector('[data-ph-qrok]'); if (qk) qk.addEventListener('click', () => { app.state.qrOk = true; app.render(true); setTimeout(() => { app.state.qrOk = false; }, 60000); });
    const hp = el.querySelector('[data-ph-hide]'); if (hp) hp.addEventListener('click', () => { app.state.showPair = false; app.render(true); });
    const r = el.querySelector('[data-ph-retry]'); if (r) r.addEventListener('click', async () => { await window.cat.startRemote(); loadPhone(app).then(() => app.render(true)); });
    const fw = el.querySelector('[data-ph-fw]'); if (fw) fw.addEventListener('click', async () => { fw.disabled = true; fw.textContent = 'SAY YES ON THE WINDOWS PROMPT…'; const r = await window.cat.fixFirewall(); fw.disabled = false; fw.textContent = r && r.ok ? '✓ FIXED · TRY YOUR PHONE AGAIN' : 'FIX CONNECTION'; if (!(r && r.ok)) app.toast('NOT FIXED · SAY YES ON THE WINDOWS PROMPT'); });
    const ns = el.querySelector('[data-ph-net]'); if (ns) ns.addEventListener('click', () => window.cat.networkSettings());
    const rc = el.querySelector('[data-ph-recheck]'); if (rc) rc.addEventListener('click', async () => { const st = await window.cat.phoneRecheck(); app.state.phone.status = st; app.toast(st.publicNets && st.publicNets.length ? 'STILL PUBLIC' : 'ALL SET · SCAN THE CODE'); app.render(true); });
    const nk = el.querySelector('[data-ph-newkey]'); if (nk) nk.addEventListener('click', () => app.confirm('Forget all phones? Every phone gets signed out and needs to scan the new code.', async () => { await window.cat.newPin(); app.state.showPair = true; const f = await window.cat.init(); app.state.settings = f.settings; await loadPhone(app); }));
  }

  /* ---- Deck ---- */
  function deckTab(app, P) {
    const S = app.state; const d = P.deck; const pi = Math.min(S.deckPage || 0, d.pages.length - 1); const pg = d.pages[pi];
    return `${app.isPro() ? '' : '<div class="ph-locked"><b>Deck is a Pro feature.</b> Build it now, it works on your phone once you unlock Pro. <button type="button" class="btn small accent" data-ph-pro>GET PRO</button></div>'}
      <div class="ph-deckbar"><div class="pills">${d.pages.map((p, i) => `<button type="button" class="pill ${i === pi ? 'on' : ''}" data-dpage="${i}">${esc(p.name)}</button>`).join('')}<button type="button" class="pill" data-dpadd>+ PAGE</button></div>
        <span class="btns"><button type="button" class="btn small ghost" data-dprename>RENAME</button>${d.pages.length > 1 ? '<button type="button" class="btn small ghost danger" data-dpdel>DELETE PAGE</button>' : ''}</span></div>
      ${pg.buttons.length ? '' : `<div class="empty-card" style="max-width:none"><h3>Start with a ready-made page</h3><p>Pick one to fill this page. Tap any button after to change what it does, its label or its color.</p>
        <div class="ec-picks">${Object.entries(STARTERS).map(([k, st]) => `<button type="button" class="ec-pick" data-dstart="${k}"><span>${esc(st.name.toUpperCase())}</span><small>${esc(st.note.toUpperCase())}</small></button>`).join('')}</div></div>`}
      <div class="ph-deck">${pg.buttons.map((b, i) => `<button type="button" class="ph-key" data-dedit="${i}" style="background:${esc(b.color)};color:${textOn(b.color)}"><small>${esc(KIND_LABEL[b.kind] || b.kind)}</small><b>${esc(b.label)}</b></button>`).join('')}
        ${pg.buttons.length < 24 ? '<button type="button" class="ph-key add" data-dadd><b>+ ADD BUTTON</b><small>Workspaces, OBS, mic, sounds, Flows…</small></button>' : ''}</div>
      <h4 class="ph-h">OBS CONNECTION</h4>
      <div class="note">For OBS buttons: in OBS open <b>Tools › WebSocket Server Settings</b>, turn it on, and copy the password here.</div>
      <div class="ph-row"><label class="field"><span>PORT</span><input class="input" id="obs-port" value="${esc(S.settings.obs.port)}" inputmode="numeric" style="width:120px"></label>
        <label class="field" style="flex:1"><span>PASSWORD</span><input class="input" id="obs-pass" type="password" value="${esc(S.settings.obs.password)}" autocomplete="off"></label>
        <button type="button" class="btn ghost" data-obs-test>SAVE + TEST</button></div><div class="note" id="obs-msg"></div>`;
  }
  function saveDeck(app, deck) { return app.saveSettings({ deck }).then(() => loadPhone(app)).then(() => app.render(true)); }
  function bindDeck(app, el) {
    const S = app.state; const d = JSON.parse(JSON.stringify(S.phone.deck)); const pi = Math.min(S.deckPage || 0, d.pages.length - 1);
    const pro = el.querySelector('[data-ph-pro]'); if (pro) pro.addEventListener('click', () => app.proDialog('deck'));
    el.querySelectorAll('[data-dpage]').forEach((b) => b.addEventListener('click', () => { S.deckPage = Number(b.dataset.dpage); app.render(true); }));
    el.querySelector('[data-dpadd]').addEventListener('click', () => app.promptDialog('New page', 'NAME', 'PAGE ' + (d.pages.length + 1), (v) => { if (!v) return; d.pages.push({ name: v, buttons: [] }); S.deckPage = d.pages.length - 1; return saveDeck(app, d); }));
    el.querySelector('[data-dprename]').addEventListener('click', () => app.promptDialog('Rename page', 'NAME', d.pages[pi].name, (v) => { if (!v) return; d.pages[pi].name = v; return saveDeck(app, d); }));
    const del = el.querySelector('[data-dpdel]'); if (del) del.addEventListener('click', () => app.confirm('Delete this page and its buttons?', () => { d.pages.splice(pi, 1); S.deckPage = 0; return saveDeck(app, d); }));
    el.querySelectorAll('[data-dedit]').forEach((b) => b.addEventListener('click', () => buttonDialog(app, d, pi, Number(b.dataset.dedit))));
    const add = el.querySelector('[data-dadd]'); if (add) add.addEventListener('click', () => buttonDialog(app, d, pi, -1));
    el.querySelectorAll('[data-dstart]').forEach((b) => b.addEventListener('click', () => {
      const st = STARTERS[b.dataset.dstart]; if (!st) return;
      d.pages[pi].buttons = st.buttons.map(([kind, value, label, color]) => ({ kind, value, label, color }));
      if (/^(main|page \d+)$/i.test(d.pages[pi].name)) d.pages[pi].name = st.name.toUpperCase();
      saveDeck(app, d).then(() => app.toast(st.name.toUpperCase() + ' PAGE READY'));
    }));
    el.querySelector('[data-obs-test]').addEventListener('click', async () => {
      await app.saveSettings({ obs: { port: Number($('#obs-port', el).value) || 4455, password: $('#obs-pass', el).value } });
      OBS.reset(); const msg = $('#obs-msg', el); msg.textContent = 'Connecting to OBS…';
      try { const sc = await OBS.call('GetSceneList'); msg.textContent = '✓ Connected. Scenes: ' + sc.scenes.map((x) => x.sceneName).join(', '); } catch (e) {
        const obsApp = app.state.items.find((i) => /^obs(64|32)?\.exe$/i.test(i.exe || '') && !i.hidden);
        const notOpen = /reach OBS|didn.t answer|closed the connection/i.test(e.message);
        msg.innerHTML = '✕ ' + esc(e.message) + (notOpen && obsApp ? ' <button type="button" class="btn small accent" data-obs-open>OPEN OBS</button>' : '');
        const ob = msg.querySelector('[data-obs-open]'); if (ob) ob.addEventListener('click', () => { app.launch(obsApp.id); msg.textContent = 'Opening OBS… press SAVE + TEST again once it\u2019s up.'; });
      }
    });
  }
  function buttonDialog(app, deck, pi, idx) {
    const S = app.state;
    const b = idx >= 0 ? { ...deck.pages[pi].buttons[idx] } : { kind: 'workspace', label: '', color: COLORS[deck.pages[pi].buttons.length % COLORS.length], value: '' };
    const valueField = (k) => {
      if (k === 'workspace') return `<select class="input" id="bv">${S.workspaces.map((w) => `<option value="${esc(w.id)}" ${w.id === b.value ? 'selected' : ''}>${esc(w.name)}</option>`).join('') || '<option value="">Make a workspace first</option>'}</select>`;
      if (k === 'item') return `<select class="input" id="bv">${app.visibleItems().slice().sort((a, c) => a.name.localeCompare(c.name)).map((it) => `<option value="${esc(it.id)}" ${it.id === b.value ? 'selected' : ''}>${esc(it.name)}</option>`).join('')}</select>`;
      if (k === 'flow') return `<select class="input" id="bv">${(S.flows || []).map((f) => `<option value="${esc(f.id)}" ${f.id === b.value ? 'selected' : ''}>${esc(f.name)}</option>`).join('') || '<option value="">Make a Flow first</option>'}</select>`;
      if (k === 'media') return `<select class="input" id="bv">${[['toggle', 'Play / pause'], ['next', 'Next track'], ['prev', 'Previous track']].map(([v, l]) => `<option value="${v}" ${v === b.value ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
      if (k === 'volume') return `<select class="input" id="bv">${[['up', 'Volume up'], ['down', 'Volume down'], ['mute', 'Mute / unmute']].map(([v, l]) => `<option value="${v}" ${v === b.value ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
      if (k === 'url') return `<input class="input" id="bv" value="${esc(b.value)}" placeholder="https://twitch.tv/dashboard">`;
      if (k === 'keys') return `<input class="input" id="bv" value="${esc(b.value)}" placeholder="Ctrl+Shift+M">`;
      if (k === 'obs-scene') return `<div class="ph-row"><input class="input" id="bv" value="${esc(b.value)}" placeholder="Scene name" list="obs-scenes" style="flex:1"><datalist id="obs-scenes"></datalist><button type="button" class="btn small ghost" data-load-scenes>LOAD FROM OBS</button></div>`;
      if (k === 'obs-mute') return `<input class="input" id="bv" value="${esc(b.value || 'Mic/Aux')}" placeholder="Mic/Aux">`;
      if (k === 'sound') return `<div class="ph-row"><input class="input" id="bv" value="${esc(b.value)}" placeholder="C:\\Sounds\\airhorn.mp3" style="flex:1"><button type="button" class="btn small ghost" data-pick-sound>PICK</button><button type="button" class="btn small ghost" data-play-sound>▶</button></div>`;
      return '<div class="note">Nothing else to set.</div>';
    };
    const draw = (m) => {
      m.querySelector('.dlg').innerHTML = `<h2>${idx >= 0 ? 'Edit button' : 'New button'}</h2>
        <label class="field"><span>WHAT IT DOES</span><select class="input" id="bk">${Object.entries(KIND_LABEL).map(([k, l]) => `<option value="${k}" ${k === b.kind ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
        <label class="field"><span>SETTING</span>${valueField(b.kind)}</label>
        <label class="field"><span>LABEL ON YOUR PHONE</span><input class="input" id="bl" value="${esc(b.label)}" maxlength="28" placeholder="Stream Mode"></label>
        <div class="field"><span>COLOR</span><div class="ph-colors">${COLORS.map((c) => `<button type="button" class="${c === b.color ? 'on' : ''}" data-col="${c}" style="background:${c}" aria-label="Color ${c}"></button>`).join('')}</div></div>
        <div class="btns" style="justify-content:space-between"><span>${idx >= 0 ? '<button type="button" class="btn ghost danger" data-bdel>DELETE</button>' : ''}${idx > 0 ? '<button type="button" class="btn ghost" data-bleft>← MOVE</button>' : ''}</span>
          <span class="btns"><button type="button" class="btn ghost" data-x>CANCEL</button><button type="button" class="btn accent" data-ok>SAVE</button></span></div>`;
      const read = () => { const v = $('#bv', m); b.value = v ? v.value : ''; b.label = $('#bl', m).value.trim(); };
      $('#bk', m).addEventListener('change', (e) => { read(); b.kind = e.target.value; b.value = ''; draw(m); });
      m.querySelectorAll('[data-col]').forEach((c) => c.addEventListener('click', () => { read(); b.color = c.dataset.col; draw(m); }));
      $('[data-x]', m).addEventListener('click', app.closeModal);
      const ls = $('[data-load-scenes]', m); if (ls) ls.addEventListener('click', async () => { try { const r = await OBS.call('GetSceneList'); $('#obs-scenes', m).innerHTML = r.scenes.map((x) => `<option value="${esc(x.sceneName)}">`).join(''); app.toast(r.scenes.length + ' SCENES LOADED'); } catch (e) { app.toast('OBS: ' + e.message.toUpperCase()); } });
      const pk = $('[data-pick-sound]', m); if (pk) pk.addEventListener('click', async () => { const f = await window.cat.pickFile('sound'); if (f) { read(); b.value = f; if (!b.label) b.label = f.split(/[\\/]/).pop().replace(/\.[^.]+$/, ''); draw(m); } });
      const pl = $('[data-play-sound]', m); if (pl) pl.addEventListener('click', () => { read(); playSound(b.value); });
      const dl = $('[data-bdel]', m); if (dl) dl.addEventListener('click', () => { deck.pages[pi].buttons.splice(idx, 1); app.closeModal(); saveDeck(app, deck); });
      const mv = $('[data-bleft]', m); if (mv) mv.addEventListener('click', () => { read(); const list = deck.pages[pi].buttons; list[idx] = b; [list[idx - 1], list[idx]] = [list[idx], list[idx - 1]]; app.closeModal(); saveDeck(app, deck); });
      $('[data-ok]', m).addEventListener('click', () => {
        read();
        if (!b.label) { const opt = $('#bv', m) && $('#bv', m).selectedOptions ? $('#bv', m).selectedOptions[0] : null; b.label = opt ? opt.textContent : KIND_LABEL[b.kind].split(':').pop().trim(); }
        if (idx >= 0) deck.pages[pi].buttons[idx] = b; else deck.pages[pi].buttons.push(b);
        app.closeModal(); saveDeck(app, deck);
      });
    };
    app.openModal('', draw);
  }

  /* ---- Drop ---- */
  function dropTab(app, P) {
    const pro = app.isPro();
    return `<div class="split"><div class="grow">
      <div class="row-label"><span>FROM YOUR PHONE</span><span class="btns"><button type="button" class="act" data-open-drop>OPEN FOLDER</button>${P.inbox.length ? '<button type="button" class="act" data-inbox-clear>CLEAR LIST</button>' : ''}</span></div>
      <div class="list">${P.inbox.length ? P.inbox.map((x, i) => x.kind === 'text'
        ? `<div class="list-row"><span class="tg">${/^https?:/i.test(x.text) ? 'LINK' : 'TEXT'}</span><span class="nm">${esc(x.text)}</span><span class="tm">${esc(ago(x.ts))}</span><button type="button" class="btn small ghost" data-in-copy="${i}">COPY</button></div>`
        : `<div class="list-row"><span class="tg">${esc((x.name.split('.').pop() || '').toUpperCase().slice(0, 5))}</span><span class="nm">${esc(x.name)}</span><span class="tm">${esc(bytes(x.size))} · ${esc(ago(x.ts))}</span><button type="button" class="btn small ghost" data-in-open="${i}">OPEN</button><button type="button" class="btn small ghost" data-in-show="${i}">SHOW</button></div>`).join('') : '<div class="empty">Nothing yet. On your phone, open Catalyst › Drop and send something.</div>'}</div>
      <div class="note">${pro ? 'Unlimited sends, any size.' : `${Math.max(0, P.usage.perDay - P.usage.used)} of ${P.usage.perDay} free sends left today, up to ${P.usage.maxMb} MB each.`} Files land in <b>${esc(P.dropDir)}</b>. <button type="button" class="btn small ghost" data-drop-dir>CHANGE</button></div>
    </div><aside>
      <div class="row-label"><span>SEND TO YOUR PHONE</span></div>
      <div class="dropzone" id="ph-out"><b>DROP FILES HERE</b>they show up on your phone<br>in Catalyst › Drop</div>
      <div class="btns" style="margin:10px 0"><button type="button" class="btn small ghost" data-out-pick>PICK FILES</button><button type="button" class="btn small ghost" data-out-clip>SEND MY CLIPBOARD</button></div>
      <div class="list">${P.outbox.map((x) => `<div class="list-row"><span class="tg">${x.kind === 'text' ? 'TEXT' : esc((x.name.split('.').pop() || '').toUpperCase().slice(0, 5))}</span><span class="nm">${esc(x.kind === 'text' ? x.text : x.name)}</span><button type="button" class="btn small ghost" data-out-rm="${esc(x.id)}">REMOVE</button></div>`).join('')}</div>
    </aside></div>`;
  }
  function bindDrop(app, el) {
    const P = app.state.phone; const re = () => loadPhone(app).then(() => app.render(true));
    el.querySelector('[data-open-drop]').addEventListener('click', () => window.cat.openDropFolder());
    const ic = el.querySelector('[data-inbox-clear]'); if (ic) ic.addEventListener('click', () => window.cat.phoneInboxClear().then(re));
    el.querySelectorAll('[data-in-copy]').forEach((b) => b.addEventListener('click', () => { window.cat.copy(P.inbox[b.dataset.inCopy].text); app.toast('COPIED'); }));
    el.querySelectorAll('[data-in-open]').forEach((b) => b.addEventListener('click', () => window.cat.launchPath(P.inbox[b.dataset.inOpen].path)));
    el.querySelectorAll('[data-in-show]').forEach((b) => b.addEventListener('click', () => window.cat.reveal(P.inbox[b.dataset.inShow].path)));
    el.querySelector('[data-drop-dir]').addEventListener('click', async () => { const d = await window.cat.pickFolder('Where should files from your phone go?'); if (d) { await app.saveSettings({ remote: { dropDir: d } }); re(); } });
    const send = async (paths) => { if (!paths.length) return; const r = await window.cat.sendToPhone(paths); if (r && r.ok) app.toast(r.added + ' SENT · OPEN DROP ON YOUR PHONE'); else if (r && r.pro) app.proDialog('phonepro'); else app.toast((r && r.error) || 'COULD NOT SEND'); re(); };
    const zone = el.querySelector('#ph-out');
    zone.addEventListener('dragover', (e) => { e.preventDefault(); e.stopPropagation(); zone.classList.add('over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('over'));
    zone.addEventListener('drop', (e) => { e.preventDefault(); e.stopPropagation(); zone.classList.remove('over'); send([...e.dataTransfer.files].map((f) => window.cat.pathForFile(f)).filter(Boolean)); });
    el.querySelector('[data-out-pick]').addEventListener('click', async () => { const r = await window.cat.pickFiles(); send(Array.isArray(r) ? r : []); });
    el.querySelector('[data-out-clip]').addEventListener('click', async () => { const c = await window.cat.clipboard(); const t = Array.isArray(c) ? (c[0] && (c[0].text || c[0])) : ''; if (!t) return app.toast('CLIPBOARD IS EMPTY'); await window.cat.sendTextToPhone(String(t)); app.toast('SENT TO YOUR PHONE'); re(); });
    el.querySelectorAll('[data-out-rm]').forEach((b) => b.addEventListener('click', () => window.cat.phoneOutboxRemove(b.dataset.outRm).then(re)));
  }

  /* ---- Alerts ---- */
  function alertsTab(app, P, st) {
    const s = app.state.settings; const a = s.remote.alerts || {}; const pro = app.isPro();
    const tog = (k, on, label, sub, isPro) => `<div class="opt"><span class="lab">${label}${isPro ? app.proTag() : ''}<small>${sub}</small></span><span class="ctl"><button type="button" class="toggle ${on ? 'on' : ''}" data-atog="${k}">${on ? 'ON' : 'OFF'}</button></span></div>`;
    return `<div class="split"><div class="grow">
      <div class="row-label"><span>TELL MY PHONE WHEN…</span></div>
      <div class="al-card"><div class="al-top"><div><b>A download finishes</b><p>Anything that lands in your Downloads folder.</p></div><button type="button" class="toggle ${a.downloads !== false ? 'on' : ''}" data-atog="downloads">${a.downloads !== false ? 'ON' : 'OFF'}</button></div></div>
      <div class="al-card"><div class="al-top"><div><b>An export or render finishes${app.proTag()}</b><p>Pick the folders your DAW, video editor or OBS save to. When a new file finishes there, you get pinged.</p></div><button type="button" class="btn small ghost" data-aexp-add>+ FOLDER</button></div>
        ${(a.exports || []).length ? `<div class="al-chips">${a.exports.map((d, i) => `<span class="al-chip" title="${esc(d)}">${esc(d.split(/[\\/]/).filter(Boolean).slice(-2).join(' › '))}<button type="button" data-aexp-rm="${i}" aria-label="Stop watching ${esc(d)}">×</button></span>`).join('')}</div>` : ''}</div>
      <div class="al-card"><div class="al-top"><div><b>An app closes${app.proTag()}</b><p>Like a render app or a game update finishing. Type the program name, for example HandBrake.exe.</p></div></div>
        <div class="al-add"><input class="input" id="aapp" placeholder="program.exe" aria-label="Program name"><button type="button" class="btn small ghost" data-aapp-add>ADD</button></div>
        ${(a.apps || []).length ? `<div class="al-chips">${a.apps.map((x, i) => `<span class="al-chip">${esc(x)}<button type="button" data-aapp-rm="${i}" aria-label="Remove ${esc(x)}">×</button></span>`).join('')}</div>` : ''}</div>
      <div class="note">Flows can send alerts too: add the step <b>Send an alert to my phone</b>.</div>
      <div class="row-label" style="margin-top:20px"><span>RECENT</span><button type="button" class="act" data-atest>SEND A TEST</button></div>
      <div class="list">${P.alerts.length ? P.alerts.map((x) => `<div class="list-row"><span class="tg">${esc(x.kind.toUpperCase().slice(0, 5))}</span><span class="nm">${esc(x.title)} · ${esc(x.body)}</span><span class="tm">${esc(ago(x.ts))}</span></div>`).join('') : '<div class="empty">No alerts yet.</div>'}</div>
    </div><aside>
      <div class="row-label"><span>PUSH TO YOUR PHONE</span></div>
      ${tog('ntfy', !!s.remote.ntfy, 'Real push notifications', 'Arrive even when the Catalyst page is closed, through the free ntfy app.')}
      ${s.remote.ntfy ? `<div class="ph-qr small">${st.ntfyQr || ''}</div><ol class="note"><li>Install <b>ntfy</b> (free) on your phone.</li><li>Scan this, or tap + and subscribe to <b>${esc(String(st.ntfyUrl || '').replace('https://ntfy.sh/', ''))}</b></li></ol>
        <div class="note">Your channel name is random and private. Alerts only say a file finished, never what's inside it. <button type="button" class="btn small ghost" data-anew>NEW CHANNEL</button></div>` : ''}
    </aside></div>`;
  }
  function bindAlerts(app, el) {
    const s = app.state.settings; const a = { downloads: true, exports: [], apps: [], ...(s.remote.alerts || {}) };
    const save = (patch) => app.saveSettings({ remote: patch }).then(() => loadPhone(app)).then(() => app.render(true));
    el.querySelectorAll('[data-atog]').forEach((b) => b.addEventListener('click', () => {
      const k = b.dataset.atog;
      if (k === 'ntfy') return save({ ntfy: !s.remote.ntfy });
      save({ alerts: { ...a, downloads: !(a.downloads !== false) } });
    }));
    el.querySelector('[data-aexp-add]').addEventListener('click', async () => { if (!app.pro('alerts')) return; const d = await window.cat.pickFolder('Folder your exports land in'); if (d) save({ alerts: { ...a, exports: [...new Set([...(a.exports || []), d])].slice(0, 8) } }); });
    el.querySelectorAll('[data-aexp-rm]').forEach((b) => b.addEventListener('click', () => save({ alerts: { ...a, exports: a.exports.filter((_, i) => i !== Number(b.dataset.aexpRm)) } })));
    el.querySelector('[data-aapp-add]').addEventListener('click', () => { if (!app.pro('alerts')) return; let v = $('#aapp', el).value.trim(); if (!v) return; if (!/\.exe$/i.test(v)) v += '.exe'; if (!/^[\w .()+-]+\.exe$/i.test(v)) return app.toast('JUST THE PROGRAM NAME, LIKE OBS64.EXE'); save({ alerts: { ...a, apps: [...new Set([...(a.apps || []), v])].slice(0, 12) } }); });
    el.querySelectorAll('[data-aapp-rm]').forEach((b) => b.addEventListener('click', () => save({ alerts: { ...a, apps: a.apps.filter((_, i) => i !== Number(b.dataset.aappRm)) } })));
    el.querySelector('[data-atest]').addEventListener('click', () => window.cat.phoneTestAlert().then(() => { app.toast('TEST ALERT SENT'); setTimeout(() => loadPhone(app).then(() => app.render(true)), 300); }));
    const nw = el.querySelector('[data-anew]'); if (nw) nw.addEventListener('click', () => window.cat.phoneNewTopic().then(() => loadPhone(app)).then(() => app.render(true)));
  }

  /* ---- Peek + controls ---- */
  function controlsTab(app, P) {
    const s = app.state.settings; const pro = app.isPro();
    const power = s.remote.allowPower !== false && pro; const peek = s.remote.allowPeek !== false && pro;
    const tog = (k, on) => `<button type="button" class="toggle ${on ? 'on' : ''}" data-ctog="${k}">${on ? 'ON' : 'OFF'}</button>`;
    const btn = (label, on, cls = '') => `<span class="pc-b ${on ? '' : 'off'} ${cls}">${label}</span>`;
    return `<div class="pc-wrap">
      <div class="pc-phone" aria-hidden="true"><div class="pc-notch"></div><div class="pc-k">CATALYST · CONTROLS</div>
        <div class="pc-peek ${peek ? '' : 'off'}">${peek ? '<span>LIVE</span>' : ''}<i></i><i></i><i></i><b>${peek ? 'YOUR SCREEN' : 'PEEK IS OFF'}</b></div>
        <div class="pc-grid">${btn('LOCK', true)}${btn('SLEEP', true)}${btn('RESTART', power)}${btn('SHUT DOWN', power)}${btn('CLOSE AN APP', power, 'wide')}</div>
        <small>This is what your phone shows under Controls.</small></div>
      <div class="pc-cards">
        <div class="pc-card"><div><b>Lock + sleep</b><p>Left the PC on and you’re already in bed? Lock it or put it to sleep from your phone.</p></div><span class="kbd">ALWAYS ON · FREE</span></div>
        <div class="pc-card"><div><b>Restart, shut down, close apps${app.proTag()}</b><p>Your phone asks you to confirm before anything happens.</p></div>${tog('allowPower', s.remote.allowPower !== false)}</div>
        <div class="pc-card"><div><b>Screen Peek${app.proTag()}</b><p>See this screen live on your phone, view only. While someone is peeking, Catalyst shows a notice on this PC.</p>
          <p class="pc-live ${P.peeking ? 'on' : ''}">${P.peeking ? '● Your phone is watching this screen right now' : 'Nobody is watching right now'}</p></div>${tog('allowPeek', s.remote.allowPeek !== false)}</div>
        <div class="pc-safe"><b>Safe by design.</b> Only phones you paired with the code can get in, everything stays on your home Wi-Fi, and nothing goes through the internet.${pro ? '' : ' <button type="button" class="linkish" data-ph-pro>Restart, shut down and Peek come with Pro.</button>'}</div>
      </div></div>`;
  }
  function bindControls(app, el) {
    const pp = el.querySelector('[data-ph-pro]'); if (pp && !pp.dataset.bound) { pp.dataset.bound = 1; pp.addEventListener('click', () => app.proDialog('phonepro')); }
    el.querySelectorAll('[data-ctog]').forEach((b) => b.addEventListener('click', () => { const k = b.dataset.ctog; if (!app.pro('phonepro')) return; app.saveSettings({ remote: { [k]: !(app.state.settings.remote[k] !== false) } }).then(() => app.render(true)); }));
  }

  /* ================= OBS (WebSocket v5) + soundboard ================= */
  const OBS = (() => {
    let ws = null, ready = null, n = 0; const wait = new Map(); const subs = new Map();
    const emit = (type, data) => { for (const cb of subs.get(type) || []) { try { cb(data || {}); } catch (e) {} } };
    const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
    const sha = async (s) => b64(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
    function connect() {
      if (ready) return ready;
      ready = new Promise((resolve, reject) => {
        const o = (window.__catApp && window.__catApp.state.settings && window.__catApp.state.settings.obs) || {};
        let sock;
        try { sock = new WebSocket('ws://127.0.0.1:' + (Number(o.port) || 4455)); } catch (e) { ready = null; return reject(new Error('Could not reach OBS')); }
        const fail = (msg) => { ready = null; try { sock.close(); } catch (e) {} reject(new Error(msg)); };
        const t = setTimeout(() => fail('OBS didn\u2019t answer. Is OBS open with the WebSocket server on?'), 4000);
        sock.onerror = () => { clearTimeout(t); fail('Could not reach OBS. Open OBS and turn on Tools › WebSocket Server Settings.'); };
        sock.onclose = (ev) => { if (!sock._ok) { clearTimeout(t); fail(ev && ev.code === 4009 ? 'The OBS password is wrong. In OBS open Tools › WebSocket Server Settings › Show Connect Info and copy it again.' : 'OBS closed the connection. Check that OBS is open, then try again.'); } const was = ws === sock; ws = null; ready = null; for (const cb of wait.values()) cb.reject(new Error('OBS closed')); wait.clear(); if (was) emit('_closed'); };
        sock.onmessage = async (ev) => {
          let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
          if (m.op === 0) {
            const d = { rpcVersion: 1 };
            if (m.d.authentication) { if (!o.password) { clearTimeout(t); return fail('OBS needs the WebSocket password. Add it in Phone › Deck.'); } d.authentication = await sha((await sha(o.password + m.d.authentication.salt)) + m.d.authentication.challenge); }
            sock.send(JSON.stringify({ op: 1, d }));
          } else if (m.op === 2) { clearTimeout(t); sock._ok = true; ws = sock; resolve(sock); emit('_open'); }
          else if (m.op === 5) emit(m.d.eventType, m.d.eventData);
          else if (m.op === 7) { const cb = wait.get(m.d.requestId); if (cb) { wait.delete(m.d.requestId); if (m.d.requestStatus.result) cb.resolve(m.d.responseData || {}); else cb.reject(new Error(m.d.requestStatus.comment || 'OBS said no')); } }
        };
        sock.addEventListener('close', (e) => { if (e.code === 4009) { clearTimeout(t); fail('Wrong OBS password.'); } });
      });
      return ready;
    }
    async function call(type, data) {
      const sock = await connect();
      return new Promise((resolve, reject) => { const id = 'c' + (++n); wait.set(id, { resolve, reject }); sock.send(JSON.stringify({ op: 6, d: { requestType: type, requestId: id, requestData: data || {} } })); setTimeout(() => { if (wait.has(id)) { wait.delete(id); reject(new Error('OBS timed out')); } }, 5000); });
    }
    function reset() { const had = !!ws; if (ws) try { ws.close(); } catch (e) {} ws = null; ready = null; if (had) emit('_closed'); }
    function on(type, cb) { if (!subs.has(type)) subs.set(type, []); subs.get(type).push(cb); }
    return { call, reset, on, connect, connected: () => !!ws };
  })();
  function playSound(p) { if (!p) return; try { const a = new Audio(fileUrl(p)); a.volume = 1; a.play().catch(() => {}); } catch (e) {} }
  async function deckRun(btn) {
    try {
      if (btn.kind === 'sound') { playSound(btn.value); return { ok: true }; }
      if (btn.kind === 'obs-scene') { await OBS.call('SetCurrentProgramScene', { sceneName: btn.value }); return { ok: true, say: 'SCENE: ' + btn.value.toUpperCase() }; }
      if (btn.kind === 'obs-stream') { const r = await OBS.call('ToggleStream'); return { ok: true, on: !!r.outputActive, say: r.outputActive ? 'STREAM STARTED' : 'STREAM STOPPED' }; }
      if (btn.kind === 'obs-record') { const r = await OBS.call('ToggleRecord'); return { ok: true, on: !!r.outputActive, say: r.outputActive ? 'RECORDING' : 'RECORDING STOPPED' }; }
      if (btn.kind === 'obs-mute') { const r = await OBS.call('ToggleInputMute', { inputName: btn.value || 'Mic/Aux' }); return { ok: true, on: !!r.inputMuted, say: r.inputMuted ? 'MUTED IN OBS' : 'UNMUTED IN OBS' }; }
    } catch (e) { return { ok: false, error: e.message }; }
    return { ok: false, error: 'Unknown button' };
  }

  /* ================= PC DOCTOR ================= */
  function scoreColor(n) { return n >= 85 ? 'var(--ok, #3dff8a)' : n >= 65 ? '#e8b923' : '#ff4a4a'; }
  function ring(n, size = 150) {
    const r = size / 2 - 10, c = 2 * Math.PI * r, off = c * (1 - Math.max(0, Math.min(100, n)) / 100);
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-label="Health score ${n}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--line-2)" stroke-width="10"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${scoreColor(n)}" stroke-width="10" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${off}" transform="rotate(-90 ${size / 2} ${size / 2})"/><text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-family="var(--display)" font-size="${size * 0.32}" fill="var(--fg)">${n}</text></svg>`;
  }
  function doctor(app) {
    const S = app.state, D = S.doctor;
    if (!D || D.loading) { if (!D) { S.doctor = { loading: true }; window.cat.doctorScan().then((r) => { S.doctor = r; app.render(true); }); } return { title: 'PC DOCTOR', html: '<div class="empty">Checking your PC… this takes a few seconds.</div>' }; }
    const pro = app.isPro();
    const fixBtn = (attr, label) => (pro ? `<button type="button" class="btn small accent" ${attr}>${label}</button>` : '<button type="button" class="btn small accent" data-doc-pro>FIX WITH PRO</button>');
    const issues = D.issues || [];
    return {
      title: 'PC DOCTOR',
      html: `<div class="doc-top"><div class="doc-ring">${ring(D.score)}</div><div><h3>${D.score >= 85 ? 'Your PC is in great shape.' : D.score >= 65 ? 'Your PC could be faster.' : 'Your PC needs some help.'}</h3>
        <div class="note">${issues.length ? issues.map((x) => '· ' + esc(x)).join('<br>') : 'Nothing to fix right now.'}</div>
        <div class="btns"><button type="button" class="btn small ghost" data-doc-rescan>CHECK AGAIN</button></div>${D.receipt ? `<div class="doc-receipt">THIS WEEK: FREED ${esc(bytes(D.receipt.bytes))} · ${D.receipt.startups} STARTUP APP${D.receipt.startups === 1 ? '' : 'S'} OFF · ${D.receipt.boosts} GAME BOOST${D.receipt.boosts === 1 ? '' : 'S'}</div>` : ''}</div></div>
        <div class="split"><div class="grow">
          <div class="row-label"><span>STARTS WITH WINDOWS · ${D.startup.filter((x) => x.on).length} ON</span><span>SLOWS DOWN EVERY BOOT</span></div>
          <div class="list">${D.startup.length ? D.startup.map((x, i) => `<div class="list-row"><span class="tg" style="${x.heavy ? 'color:#ff4a4a' : ''}">${x.heavy ? 'HEAVY' : 'LIGHT'}</span><span class="nm">${esc(x.label)}</span><span class="tm">${x.user ? '' : 'NEEDS ADMIN'}</span>${x.user ? (pro ? `<button type="button" class="toggle ${x.on ? 'on' : ''}" data-doc-start="${i}">${x.on ? 'ON' : 'OFF'}</button>` : `<span class="kbd">${x.on ? 'ON' : 'OFF'}</span>`) : '<button type="button" class="btn small ghost" data-doc-taskmgr>OPEN TASK MANAGER</button>'}</div>`).join('') : '<div class="empty">Nothing starts with Windows. Nice.</div>'}</div>
          <div class="row-label" style="margin-top:22px"><span>FREE UP SPACE · ${esc(bytes(D.space.total))} FOUND</span>${D.space.total > 0 ? fixBtn('data-doc-clean', 'CLEAN UP') : ''}</div>
          <div class="list">
            <div class="list-row"><span class="tg">TEMP</span><span class="nm">Temporary files older than 2 days</span><span class="tm">${esc(bytes(D.space.temp))}</span></div>
            <div class="list-row"><span class="tg">EXE</span><span class="nm">Old installers in Downloads (30+ days) · go to the Recycle Bin</span><span class="tm">${esc(bytes(D.space.installers))}</span></div>
            <div class="list-row"><span class="tg">COPY</span><span class="nm">Duplicate files in Downloads · go to the Recycle Bin</span><span class="tm">${esc(bytes(D.space.dupes))}</span></div>
            <div class="list-row"><span class="tg">BIN</span><span class="nm">Recycle Bin</span><span class="tm">${esc(bytes(D.space.bin))}</span>${D.space.bin > 0 ? (pro ? '<button type="button" class="btn small ghost" data-doc-bin>EMPTY</button>' : '') : ''}</div>
          </div>
        </div><aside>
          <div class="row-label"><span>USING THE MOST MEMORY</span></div>
          <div class="list">${D.hogs.map((h) => `<div class="list-row"><span class="nm">${esc(h.name)}${h.count > 1 ? ` <small>×${h.count}</small>` : ''}</span><span class="tm" style="${h.mb > 1500 ? 'color:#ff4a4a' : ''}">${h.mb >= 1024 ? (h.mb / 1024).toFixed(1) + ' GB' : h.mb + ' MB'}</span>${h.window ? (pro ? `<button type="button" class="btn small ghost" data-doc-close="${esc(h.exe)}">CLOSE</button>` : '') : ''}</div>`).join('')}</div>
          <div class="row-label" style="margin-top:22px"><span>GAME BOOST</span>${app.proTag()}</div>
          <div class="opt"><span class="lab">Boost games automatically<small>When Game Mode turns on: the game gets top priority and memory-heavy background apps get bumped down. Everything goes back after.</small></span><span class="ctl"><button type="button" class="toggle ${S.settings.doctor && S.settings.doctor.boost ? 'on' : ''}" data-doc-boost>${S.settings.doctor && S.settings.doctor.boost ? 'ON' : 'OFF'}</button></span></div>
          <div class="row-label" style="margin-top:22px"><span>HEAT</span></div>
          <div class="note">${D.gpuTemp ? `GPU ${D.gpuTemp}°C. ${D.gpuTemp >= 85 ? 'That\u2019s hot. Check your fans and dust.' : 'Looks fine.'} Catalyst warns you if it gets too hot.` : 'Catalyst warns you if your graphics card runs too hot (NVIDIA cards).'}</div>
        </aside></div>`,
      mount(el) {
        const redo = () => { S.doctor = null; app.render(true); };
        el.querySelector('[data-doc-rescan]').addEventListener('click', redo);
        el.querySelectorAll('[data-doc-pro]').forEach((b) => b.addEventListener('click', () => app.proDialog('doctor')));
        el.querySelectorAll('[data-doc-start]').forEach((b) => b.addEventListener('click', async () => { const x = D.startup[Number(b.dataset.docStart)]; const r = await window.cat.doctorStartup(x, !x.on); if (r && r.ok) { x.on = !x.on; app.toast(x.on ? x.label.toUpperCase() + ' STARTS WITH WINDOWS' : x.label.toUpperCase() + ' WON\u2019T START WITH WINDOWS'); app.render(true); } else app.toast('COULD NOT CHANGE THAT ONE'); }));
        el.querySelectorAll('[data-doc-taskmgr]').forEach((b) => b.addEventListener('click', () => window.cat.doctorTaskManager()));
        const cl = el.querySelector('[data-doc-clean]'); if (cl) cl.addEventListener('click', () => app.confirm('Clean up ' + bytes(D.space.temp + D.space.installers + D.space.dupes) + '? Old installers and duplicates go to the Recycle Bin, so you can get them back.', async () => { const r = await window.cat.doctorClean(); app.toast('FREED ' + bytes((r && r.bytes) || 0).toUpperCase()); redo(); }));
        const bin = el.querySelector('[data-doc-bin]'); if (bin) bin.addEventListener('click', () => app.confirm('Empty the Recycle Bin? This can\u2019t be undone.', async () => { await window.cat.doctorEmptyBin(); redo(); }));
        el.querySelectorAll('[data-doc-close]').forEach((b) => b.addEventListener('click', () => app.confirm('Close ' + b.dataset.docClose + '? Save your work in it first.', async () => { await window.cat.closeProcess(b.dataset.docClose); setTimeout(redo, 800); })));
        el.querySelector('[data-doc-boost]').addEventListener('click', () => { if (!app.pro('doctor')) return; app.saveSettings({ doctor: { boost: !(S.settings.doctor && S.settings.doctor.boost) } }).then(() => app.render(true)); });
      }
    };
  }
  function healthWidget(app) {
    const h = app.state.health;
    if (!h) return `<button type="button" class="widget" data-go="doctor"><div class="wk">PC HEALTH</div><div class="wv">…</div><div class="ws">checking</div></button>`;
    return `<button type="button" class="widget" data-go="doctor"><div class="wk">PC HEALTH</div><div class="wv" style="color:${scoreColor(h.score)}">${h.score}</div><div class="ws">${esc(h.top || 'all good')}</div></button>`;
  }

  /* ================= CREATOR STATS widget ================= */
  function creatorWidget(app) {
    const c = (app.state.widgets || {}).creator;
    const set = (app.state.settings.widgets || {}).creator || {};
    const any = set.spotify || set.youtube || set.tiktok || set.soundcloud;
    if (!any) return [];
    if (!app.isPro()) return [`<button type="button" class="widget" data-go-settings="connect"><div class="wk">CREATOR STATS</div><div class="ws">Pro feature</div></button>`];
    const rows = (c && c.list) || [];
    if (!rows.length) return [`<div class="widget"><div class="wk">CREATOR STATS</div><div class="ws">${c && c.error ? esc(c.error) : 'Loading…'}</div></div>`];
    return rows.map((r) => `<button type="button" class="widget" data-url="${esc(r.url)}"><div class="wk">${esc(r.label)}</div><div class="wv">${esc(r.short)}${r.delta ? `<span class="delta ${r.delta > 0 ? 'up' : 'down'}">${r.delta > 0 ? '▲' : '▼'}${esc(r.deltaShort)}</span>` : ''}</div><div class="ws">${esc(r.what)}</div></button>`);
  }

  /* ================= WALLPAPER + DESKTOP WIDGETS (in Vibes settings) ================= */
  const WALLS = [['studio', 'STUDIO', 'Warm grain, slow light'], ['midnight', 'MIDNIGHT', 'Drifting aurora'], ['terminal', 'TERMINAL', 'Falling code'], ['vaporwave', 'VAPORWAVE', 'Sunset grid'], ['ocean', 'OCEAN', 'Deep waves']];
  const DESK_WIDGETS = [['clock', 'Clock', false], ['nowplaying', 'Now playing', true], ['health', 'PC health', true], ['system', 'CPU / GPU / RAM', true], ['today', 'Time today', true], ['creator', 'Creator stats', true], ['drop', 'Next drop', true]];
  function wallpaperSettings(app) {
    const s = app.state.settings; const w = s.wallpaper || {}; const pro = app.isPro();
    const cur = w.style || 'match';
    return `<div class="row-label"><span>LIVE WALLPAPER</span><span>YOUR WHOLE DESKTOP, IN YOUR VIBE</span></div>
      <div class="opt"><span class="lab">Live wallpaper <span class="pro-tag" style="background:#e8b923">BETA</span><small>Moves behind your desktop icons and pauses itself when a game is open. It never changes your normal Windows wallpaper.${app.state.wallStatus && app.state.wallStatus.error ? '<br><b style="color:#ff6a6a">' + esc(app.state.wallStatus.error) + '</b> <button type="button" class="btn small ghost" data-wall-retry>TRY AGAIN</button>' : ''}</small></span><span class="ctl"><button type="button" class="toggle ${w.enabled ? 'on' : ''}" data-wall="enabled">${w.enabled ? 'ON' : 'OFF'}</button></span></div>
      <div class="wall-pick">${[['match', 'MATCH MY VIBE', 'Changes when you switch Vibes']].concat(WALLS).map(([k, n, d]) => `<button type="button" class="wall-card ${cur === k ? 'on' : ''}" data-wstyle="${k}" style="${k === 'match' ? '' : 'background-image:var(--wall-' + k + ')'}"><b>${n}${k !== 'studio' && k !== 'match' && !pro ? app.proTag() : ''}</b><small>${d}</small></button>`).join('')}</div>
      <div class="opt"><span class="lab">Pulse to the beat${app.proTag()}<small>Uses Beat sync: the wallpaper moves with whatever your PC plays.</small></span><span class="ctl"><button type="button" class="toggle ${w.beat ? 'on' : ''}" data-wall="beat">${w.beat ? 'ON' : 'OFF'}</button></span></div>
      <div class="row-label" style="margin-top:18px"><span>DESKTOP WIDGETS</span><span>ON YOUR WALLPAPER</span></div>
      <div class="pills">${DESK_WIDGETS.map(([k, l, p]) => { const on = (w.widgets || ['clock']).includes(k); return `<button type="button" class="pill ${on ? 'on' : ''}" data-dwid="${k}">${on ? '✓ ' : '+ '}${l}${p && !pro ? app.proTag() : ''}</button>`; }).join('')}</div>
      <div class="opt"><span class="lab">Where they sit<small>Drag them on the preview.</small></span><span class="ctl"><select class="input" data-wall-pos style="width:160px">${[['right', 'Right side'], ['left', 'Left side'], ['center', 'Center'], ['custom', 'Custom (dragged)']].map(([v, l]) => `<option value="${v}" ${(w.pos || 'right') === v ? 'selected' : ''}>${l}</option>`).join('')}</select></span></div>
      <div class="wall-prev" id="wall-prev">${(w.widgets || ['clock']).map((k, i) => `<div class="wp-w" data-wpw="${k}" style="${posStyle(w, k, i)}">${esc((DESK_WIDGETS.find((x) => x[0] === k) || [k, k])[1]).toUpperCase()}</div>`).join('')}</div>`;
  }
  function posStyle(w, k, i) {
    const c = (w.custom || {})[k];
    if ((w.pos || 'right') === 'custom' && c) return `left:${c.x * 100}%;top:${c.y * 100}%`;
    const x = { right: 0.72, left: 0.04, center: 0.38 }[w.pos || 'right'] ?? 0.72;
    return `left:${x * 100}%;top:${(0.06 + i * 0.14) * 100}%`;
  }
  function bindWallpaper(app, el) {
    const s = app.state.settings; const w = { enabled: false, style: 'match', beat: false, widgets: ['clock'], pos: 'right', custom: {}, ...(s.wallpaper || {}) };
    const save = (patch) => app.saveSettings({ wallpaper: { ...w, ...patch } }).then(() => app.render(true));
    el.querySelectorAll('[data-wall]').forEach((b) => b.addEventListener('click', () => { const k = b.dataset.wall; if (k === 'beat' && !app.pro('wallpaper')) return; save({ [k]: !w[k] }); }));
    el.querySelectorAll('[data-wstyle]').forEach((b) => b.addEventListener('click', () => { const k = b.dataset.wstyle; if (k !== 'studio' && k !== 'match' && !app.pro('wallpaper')) return; save({ style: k }); }));
    el.querySelectorAll('[data-dwid]').forEach((b) => b.addEventListener('click', () => { const k = b.dataset.dwid; const p = DESK_WIDGETS.find((x) => x[0] === k)[2]; const list = new Set(w.widgets || ['clock']); if (list.has(k)) list.delete(k); else { if (p && !app.pro('widgets')) return; list.add(k); } save({ widgets: [...list] }); }));
    const rt = el.querySelector('[data-wall-retry]'); if (rt) rt.addEventListener('click', async () => { app.state.wallStatus = await window.cat.wallpaperRetry(); app.render(true); });
    if (!app.state.wallStatusLoaded) { app.state.wallStatusLoaded = true; window.cat.wallpaperStatus().then((st) => { app.state.wallStatus = st; if (st && st.error) app.render(true); }); }
    const pos = el.querySelector('[data-wall-pos]'); if (pos) pos.addEventListener('change', () => save({ pos: pos.value }));
    const prev = el.querySelector('#wall-prev');
    if (prev) prev.querySelectorAll('[data-wpw]').forEach((d) => d.addEventListener('pointerdown', (e) => {
      e.preventDefault(); const r = prev.getBoundingClientRect(); d.setPointerCapture(e.pointerId);
      const move = (ev) => { const x = Math.max(0, Math.min(0.9, (ev.clientX - r.left) / r.width - 0.05)), y = Math.max(0, Math.min(0.92, (ev.clientY - r.top) / r.height - 0.03)); d.style.left = x * 100 + '%'; d.style.top = y * 100 + '%'; d.dataset.x = x; d.dataset.y = y; };
      const up = () => { d.removeEventListener('pointermove', move); d.removeEventListener('pointerup', up); if (d.dataset.x) { const custom = { ...(w.custom || {}) }; prev.querySelectorAll('[data-wpw]').forEach((o) => { const b = o.getBoundingClientRect(); custom[o.dataset.wpw] = { x: (b.left - r.left) / r.width, y: (b.top - r.top) / r.height }; }); save({ pos: 'custom', custom }); } };
      d.addEventListener('pointermove', move); d.addEventListener('pointerup', up);
    }));
  }

  return { phone, loadPhone, doctor, healthWidget, creatorWidget, wallpaperSettings, bindWallpaper, deckRun, OBS, playSound, ring };
})();
