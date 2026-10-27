// Every screen. Each view returns { title, html, mount(el) }.
// Shared clicks (data-item, data-ws, data-go, data-path, data-url) are handled in app.js.
const Views = (() => {
  const { esc, hms, ago, bytes, initials, kindLabel, fileUrl, emptyCard } = U;

  /* ---------- shared pieces ---------- */
  function iconHtml(app, it, cls = 'ico') {
    const src = app.iconFor(it);
    return src ? `<img class="${cls}" src="${esc(src)}" alt="">` : `<span class="initials">${esc(initials(it.name))}</span>`;
  }

  function metaFor(app, it) {
    const t = app.timeToday(it.id);
    if (t >= 60) return hms(t) + ' today';
    if (it.lastLaunched) return 'opened ' + ago(it.lastLaunched);
    return it.source ? it.source.toLowerCase() : '';
  }

  function tile(app, it, i = 0, variant = '') {
    const art = it.art && variant !== 'hero' && variant !== 'light' ? `;background-image:linear-gradient(180deg,rgba(13,13,13,.15),rgba(13,13,13,.92)),url('${esc(fileUrl(it.art))}')` : '';
    return `<button type="button" class="tile ${variant} ${art ? 'arty' : ''}" data-item="${esc(it.id)}" style="animation-delay:${Math.min(i, 20) * 0.04}s${art}" title="${esc(it.name)}">
      <span class="top"><span class="kind">${esc(kindLabel(it))}</span>${iconHtml(app, it)}</span>
      <span><span class="name">${esc(it.name)}</span><span class="meta" style="display:block">${esc(metaFor(app, it))}</span></span>
      ${it.pinned ? '<span class="pin" aria-label="Pinned"></span>' : ''}
    </button>`;
  }

  function cover(app, it, i = 0) {
    const art = it.art ? `style="background-image:url('${esc(fileUrl(it.art))}')"` : '';
    const t = app.timeTotal(it.id);
    const icon = app.iconFor(it);
    const inner = it.art ? '' : icon
      ? `<img class="big-ico" src="${esc(icon)}" alt=""><span class="cover-name">${esc(it.name)}</span>`
      : `<span class="cover-name">${esc(it.name)}</span>`;
    const badges = (it.favorite ? '<span class="badge fav" title="Favorite">★</span>' : '') + (it.profile ? '<span class="badge prof" title="Has a game profile">PROFILE</span>' : '');
    return `<button type="button" class="cover" data-item="${esc(it.id)}" style="animation-delay:${Math.min(i, 24) * 0.035}s" title="${esc(it.name)}">
      <span class="art ${it.art ? 'has-art' : icon ? 'icon-art' : ''}" ${art}>${inner}${badges ? `<span class="badges">${badges}</span>` : ''}</span>
      <span class="info"><span class="n">${esc(it.store || kindLabel(it))}</span><span class="s">${t >= 60 ? hms(t) : ''}</span></span>
    </button>`;
  }

  function rowLabel(left, right = '', action = '') {
    return `<div class="row-label"><span>${left}</span><span style="display:flex;gap:16px;align-items:center">${right ? `<span>${right}</span>` : ''}${action}</span></div>`;
  }

  // Widgets are small: a short line for "can't reach it right now", the full sentence otherwise.
  function shortErr(x) { return ['offline', 'slow', 'down'].includes(x.errorKind) ? (x.errorKind === 'offline' ? 'Offline · will retry' : 'Not answering · will retry') : x.error; }
  function empty(text) { return `<div class="empty">${text}</div>`; }

  function sortItems(app, list, mode) {
    const l = [...list];
    if (mode === 'az') return l.sort((a, b) => a.name.localeCompare(b.name));
    if (mode === 'recent') return l.sort((a, b) => (b.lastLaunched || 0) - (a.lastLaunched || 0) || a.name.localeCompare(b.name));
    return l.sort((a, b) => (app.timeTotal(b.id) - app.timeTotal(a.id)) || ((b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)) || a.name.localeCompare(b.name));
  }

  function sortPills(app, cur) {
    return `<span class="pills">${[['used', 'MOST USED'], ['recent', 'RECENT'], ['az', 'A–Z']].map(([k, l]) => `<button type="button" class="pill ${cur === k ? 'on' : ''}" data-sort="${k}">${l}</button>`).join('')}</span>`;
  }

  function bindSort(app, el) {
    el.querySelectorAll('[data-sort]').forEach((b) => b.addEventListener('click', () => { app.state.sort = b.dataset.sort; app.render(); }));
  }

  function timeLog(app) {
    const st = app.state.stats;
    if (!st) return '';
    const list = st.today.list.slice(0, 5);
    const max = Math.max(1, ...list.map((r) => r.secs));
    return `<div>${rowLabel('TIME LOG', 'TODAY')}
      <div class="big-num">${esc(U.clock(st.today.total))}</div>
      ${list.length ? list.map((r, i) => `<div class="bar-row"><div class="l"><span>${esc(r.name)}</span><span>${hms(r.secs)}</span></div><div class="bar"><i class="${i === 0 ? 'acc' : ''}" style="width:${Math.round(r.secs / max * 100)}%;animation-delay:${i * 0.07}s"></i></div></div>`).join('') : empty('Use your PC and Catalyst tracks the time here.')}
    </div>`;
  }

  function systemPanel(app) {
    const s = app.state.system;
    if (!s) return '';
    return `<div>${rowLabel('SYSTEM')}
      <div class="sysgrid">
        <div><div class="k">CPU</div><div class="v">${s.cpu}%</div></div>
        <div><div class="k">GPU</div><div class="v">${s.gpu && s.gpu.temp != null ? s.gpu.temp + '°C' : '—'}</div></div>
        <div><div class="k">RAM</div><div class="v">${(s.ram.used / 1024 ** 3).toFixed(1)}<small style="font-size:var(--fs-sm)"> / ${Math.round(s.ram.total / 1024 ** 3)}G</small></div></div>
        <div><div class="k">FREE</div><div class="v">${bytes(s.disk.free)}</div></div>
      </div></div>`;
  }

  function friendsPanel(app) {
    const f = app.state.friends;
    if (!f || f.error === 'not-configured') return '';
    const list = (f.friends || []).slice(0, 6);
    return `<div>${rowLabel('FRIENDS ONLINE', String((f.friends || []).length))}
      ${list.length ? list.map((p) => `<div class="friend">${p.avatar ? `<img src="${esc(p.avatar)}" alt="">` : ''}<div><div>${esc(p.name)}</div>${p.game ? `<div class="g">${esc(p.game)}</div>` : ''}</div></div>`).join('') : empty(f.error ? 'Steam: ' + esc(f.error) : 'Nobody online right now.')}
    </div>`;
  }

  function wsButtons(app) {
    const ws = app.state.workspaces;
    return `<div class="wsrow">${ws.map((w) => `<button type="button" class="wsbtn" data-ws="${esc(w.id)}">▶ ${esc(w.name.toUpperCase())}</button>`).join('')}
      <button type="button" class="wsbtn" data-go="workspaces" style="border-style:dashed;color:var(--fg-2)">+ NEW</button></div>`;
  }

  function suggestionsHtml(app) {
    const s = app.state.wsSuggestions || [];
    return s.map((g, i) => `<div class="suggest"><span>You often open <b>${g.names.map(esc).join(' + ')}</b> together.</span><span class="btns"><button type="button" class="btn small accent" data-make-ws="${i}">MAKE A WORKSPACE</button></span></div>`).join('');
  }

  function bindSuggestions(app, el) {
    el.querySelectorAll('[data-make-ws]').forEach((b) => b.addEventListener('click', async () => {
      const g = app.state.wsSuggestions[Number(b.dataset.makeWs)];
      const ws = await window.cat.saveWorkspace({ name: g.names.slice(0, 2).join(' + '), items: g.items });
      app.state.editingWs = ws.id;
      app.go('workspaces');
    }));
  }

  /* ---------- HOME ---------- */
  function home(app) {
    const items = app.visibleItems();
    const byId = new Map(items.map((i) => [i.id, i]));
    let picks = (app.state.suggested || []).map((id) => byId.get(id)).filter(Boolean);
    let label = 'SUGGESTED NOW';
    if (picks.length < 6) {
      const recent = items.filter((i) => i.lastLaunched && !picks.includes(i)).sort((a, b) => b.lastLaunched - a.lastLaunched);
      picks = [...picks, ...recent].slice(0, 6);
      if (!app.state.suggested || !app.state.suggested.length) label = 'RECENT';
    }
    if (picks.length < 6) picks = [...picks, ...items.filter((i) => i.pinned && !picks.includes(i))].slice(0, 6);
    if (picks.length < 6) picks = [...picks, ...sortItems(app, items.filter((i) => !picks.includes(i) && i.section !== 'web'), 'used')].slice(0, 6);
    const pinned = items.filter((i) => i.pinned && !picks.includes(i)).slice(0, 12);
    const pinnedFolders = items.filter((i) => i.kind === 'folder' && i.pinned);
    const hour = new Date().getHours();
    const hi = hour < 5 ? 'LATE NIGHT' : hour < 12 ? 'MORNING' : hour < 17 ? 'AFTERNOON' : 'TONIGHT';

    const layout = homeLayout(app);
    const edit = !!app.state.homeEdit;
    const blocks = {
      widgets: { label: 'WIDGETS', html: widgetsRow(app, edit) },
      suggested: { label: label, html: `<div>${rowLabel(label, hi + ' · ' + picks.length + ' ITEMS')}
            ${picks.length ? `<div class="grid big">${picks.map((it, i) => tile(app, it, i, i === 0 ? 'hero' : i === 1 ? 'light' : '')).join('')}</div>` : (app.state.scanning ? empty('Scanning your PC for apps and games…') : emptyCard({ title: 'Your apps show up here', text: 'Catalyst puts the apps you use most at this time of day right here. It didn\'t find any yet.', btns: [['data-ec-scan', 'SCAN MY PC'], ['data-go="apps"', 'SEE ALL APPS']], tip: 'Or drag any app, folder or file onto this window.' }))}
          </div>` },
      workspaces: { label: 'WORKSPACES', html: `<div>${rowLabel('WORKSPACES', 'ONE CLICK')}${wsButtons(app)}${suggestionsHtml(app) ? '<div style="margin-top:12px;display:flex;flex-direction:column;gap:8px">' + suggestionsHtml(app) + '</div>' : ''}</div>` },
      pinned: { label: 'PINNED', html: pinned.length ? `<div>${rowLabel('PINNED', String(pinned.length))}<div class="grid">${pinned.map((it, i) => tile(app, it, i)).join('')}</div></div>` : (edit ? `<div>${rowLabel('PINNED')}${empty('Right-click anything and choose Pin to Home.')}</div>` : '') },
      folders: { label: 'PINNED FOLDERS', html: pinnedFolders.length ? `<div>${rowLabel('PINNED FOLDERS')}<div class="folder-row">${pinnedFolders.map((f) => `<button type="button" class="folder" data-item="${esc(f.id)}">${folderSvg()} ${esc(f.name)}</button>`).join('')}</div></div>` : (edit ? `<div>${rowLabel('PINNED FOLDERS')}${empty('Pin folders from Files.')}</div>` : '') }
    };
    const side = {
      timelog: { label: 'TIME LOG', html: timeLog(app) },
      friends: { label: 'FRIENDS', html: friendsPanel(app) || (edit ? `<div>${rowLabel('FRIENDS ONLINE')}${empty('Add a Steam key in Settings › Connect.')}</div>` : '') },
      system: { label: 'SYSTEM', html: systemPanel(app) }
    };
    const wrap = (id, blk, zone, i, n) => {
      if (!edit) return blk.html;
      return `<div class="edit-block"><div class="edit-bar"><span>${esc(blk.label)}</span><span class="btns">
        <button type="button" class="btn small ghost" data-move="${zone}:${id}:-1" ${i === 0 ? 'disabled' : ''} aria-label="Move ${esc(blk.label)} up">↑</button>
        <button type="button" class="btn small ghost" data-move="${zone}:${id}:1" ${i === n - 1 ? 'disabled' : ''} aria-label="Move ${esc(blk.label)} down">↓</button>
        <button type="button" class="btn small ghost" data-hide="${zone}:${id}">HIDE</button></span></div>${blk.html}</div>`;
    };
    const mainIds = layout.main.filter((id) => blocks[id] && !layout.hidden.includes(id));
    const sideIds = layout.side.filter((id) => side[id] && !layout.hidden.includes(id));
    const hiddenList = [...layout.main, ...layout.side].filter((id) => layout.hidden.includes(id));
    return {
      title: 'HOME',
      html: `<div class="home-edit-toggle">${edit
          ? `<div class="edit-head"><span>EDITING HOME</span><span class="btns"><span class="seg">${['compact', 'normal', 'large'].map((t) => `<button type="button" class="${(app.state.settings.tileSize || 'normal') === t ? 'on' : ''}" data-tilesize="${t}">${t.toUpperCase()}</button>`).join('')}</span><button type="button" class="btn small ghost" data-home-reset>RESET</button><button type="button" class="btn small accent" data-home-done>DONE</button></span></div>
             ${hiddenList.length ? `<div class="pills" style="margin-top:10px"><span class="kbd">HIDDEN:</span>${hiddenList.map((id) => `<button type="button" class="pill" data-show="${id}">+ ${esc((blocks[id] || side[id]).label)}</button>`).join('')}</div>` : ''}`
          : '<button type="button" class="act edit-link" data-home-edit>EDIT HOME</button>'}</div>
        <div class="split">
        <div class="grow">${mainIds.map((id, i) => wrap(id, blocks[id], 'main', i, mainIds.length)).join('')}</div>
        <aside>${sideIds.map((id, i) => wrap(id, side[id], 'side', i, sideIds.length)).join('')}</aside>
      </div>`,
      mount(el) {
        bindSuggestions(app, el);
        const save = (patch) => app.saveSettings({ home: { ...layout, ...patch } }).then(() => app.render(true));
        const e1 = el.querySelector('[data-home-edit]');
        if (e1) e1.addEventListener('click', () => { app.state.homeEdit = true; app.render(true); });
        const done = el.querySelector('[data-home-done]');
        if (done) done.addEventListener('click', () => { app.state.homeEdit = false; app.render(true); });
        const reset = el.querySelector('[data-home-reset]');
        if (reset) reset.addEventListener('click', () => app.saveSettings({ home: null, tileSize: 'normal' }).then(() => app.render(true)));
        el.querySelectorAll('[data-tilesize]').forEach((b) => b.addEventListener('click', () => app.saveSettings({ tileSize: b.dataset.tilesize }).then(() => app.render(true))));
        el.querySelectorAll('[data-move]').forEach((b) => b.addEventListener('click', () => {
          const [zone, id, d] = b.dataset.move.split(':');
          const list = [...layout[zone]];
          const visible = list.filter((x) => !layout.hidden.includes(x));
          const vi = visible.indexOf(id); const target = visible[vi + Number(d)];
          if (!target) return;
          const i = list.indexOf(id); const j = list.indexOf(target);
          [list[i], list[j]] = [list[j], list[i]];
          save({ [zone]: list });
        }));
        el.querySelectorAll('[data-hide]').forEach((b) => b.addEventListener('click', () => { const id = b.dataset.hide.split(':')[1]; save({ hidden: [...layout.hidden, id] }); }));
        el.querySelectorAll('[data-show]').forEach((b) => b.addEventListener('click', () => save({ hidden: layout.hidden.filter((x) => x !== b.dataset.show) })));
        el.querySelectorAll('[data-whide]').forEach((b) => b.addEventListener('click', () => save({ widgetsHidden: [...(layout.widgetsHidden || []), b.dataset.whide] })));
        el.querySelectorAll('[data-wshow]').forEach((b) => b.addEventListener('click', () => save({ widgetsHidden: (layout.widgetsHidden || []).filter((x) => x !== b.dataset.wshow) })));
      }
    };
  }

  const HOME_DEFAULT = { main: ['widgets', 'suggested', 'workspaces', 'pinned', 'folders'], side: ['timelog', 'friends', 'system'], hidden: [], widgetsHidden: [] };
  function homeLayout(app) {
    const h = app.state.settings.home || {};
    const merge = (saved, def) => [...(saved || []).filter((x) => def.includes(x)), ...def.filter((x) => !(saved || []).includes(x))];
    return { main: merge(h.main, HOME_DEFAULT.main), side: merge(h.side, HOME_DEFAULT.side), hidden: Array.isArray(h.hidden) ? h.hidden : [], widgetsHidden: Array.isArray(h.widgetsHidden) ? h.widgetsHidden : [] };
  }

  const STAGES = [['beat', 'BEAT'], ['recorded', 'RECORDED'], ['mixed', 'MIXED'], ['mastered', 'MASTERED'], ['cover', 'COVER'], ['distributed', 'DISTRO'], ['promo', 'PROMO']];
  function releaseProgress(r) { const st = r.stages || {}; return Math.round(STAGES.filter(([k]) => st[k]).length / STAGES.length * 100); }
  function nextRelease(app) {
    const today = new Date(new Date().toDateString());
    return [...(app.state.settings.releases || [])].filter((r) => new Date(r.date + 'T00:00:00') >= today).sort((a, b) => a.date.localeCompare(b.date))[0];
  }
  function daysUntil(date) { return Math.ceil((new Date(date + 'T00:00:00') - new Date(new Date().toDateString())) / 86400000); }

  function widgetsRow(app, edit) {
    const w = app.state.widgets || {};
    const set = app.state.settings.widgets || {};
    const hidden = homeLayout(app).widgetsHidden;
    const now = new Date();
    const cards = [];
    const push = (id, html) => {
      if (hidden.includes(id)) { if (edit) cards.push(`<button type="button" class="widget empty-w" data-wshow="${id}"><div class="wk">HIDDEN</div><div class="ws">+ show ${id}</div></button>`); return; }
      if (!edit) { cards.push(html); return; }
      const flat = html.trim().replace(/^<button type="button"/, '<div').replace(/<\/button>$/, '</div>');
      cards.push(flat.replace(/^<div([^>]*)>/, `<div$1><button type="button" class="w-x" data-whide="${id}" aria-label="Hide ${id} widget">×</button>`));
    };
    push('clock', `<div class="widget"><div class="wk">${esc(now.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase())}</div><div class="wv">${esc(now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }))}</div><div class="ws">${esc(now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }))}</div></div>`);
    push('health', V5.healthWidget(app));
    V5.creatorWidget(app).forEach((h) => push('creator', h));
    if (set.weather) {
      const x = w.weather;
      if (x && !x.error) push('weather', `<div class="widget"><div class="wk">${esc(x.place.toUpperCase())}</div><div class="wv">${x.temp}${esc(x.unit)}</div><div class="ws">${esc(x.text)} · H ${x.hi}° L ${x.lo}°</div></div>`);
      else push('weather', `<button type="button" class="widget empty-w" data-go-settings="connect"><div class="wk">WEATHER</div><div class="ws">${x && x.error && x.error !== 'not-configured' ? esc(shortErr(x)) : 'Set your city in Settings › Connect'}</div></button>`);
    }
    const rb = w.roblox;
    if (rb && rb.games && rb.games.length) {
      rb.games.slice(0, 2).forEach((g) => push('roblox', `<div class="widget"><div class="wk">${esc(g.name.toUpperCase())}</div><div class="wv"><span class="live"></span>${g.playing.toLocaleString()}</div><div class="ws">playing now · ${g.visits >= 1000 ? (g.visits / 1000).toFixed(g.visits >= 100000 ? 0 : 1) + 'K' : g.visits} visits</div></div>`));
    } else if (set.roblox) push('roblox', `<div class="widget"><div class="wk">ROBLOX</div><div class="ws">${rb && rb.error ? esc(shortErr(rb)) : 'Loading…'}</div></div>`);
    const r = nextRelease(app);
    if (r) { const d = daysUntil(r.date); push('release', `<button type="button" class="widget" ${edit ? '' : 'data-go="studio"'}><div class="wk">NEXT DROP · ${esc(r.title.toUpperCase())}</div><div class="wv">${d === 0 ? 'TODAY' : d + 'D'}</div><div class="ws"><span class="wbar"><i style="width:${releaseProgress(r)}%"></i></span> ${releaseProgress(r)}% ready</div></button>`); }
    return `<div class="widgets">${cards.join('')}</div>`;
  }

  function folderSvg() {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>';
  }

  /* ---------- GAMES ---------- */
  function games(app) {
    const all = app.visibleItems().filter((i) => i.section === 'games');
    const stores = {};
    all.forEach((g) => { const s = g.store || 'OTHER'; stores[s] = (stores[s] || 0) + 1; });
    const favs = all.filter((g) => g.favorite);
    const filter = app.state.gameFilter === 'FAV' && !favs.length ? 'ALL' : app.state.gameFilter || 'ALL';
    let list = filter === 'ALL' ? all : filter === 'FAV' ? favs : all.filter((g) => (g.store || 'OTHER') === filter);
    list = sortItems(app, list, app.state.sort);
    const last = [...all].filter((g) => g.lastLaunched).sort((a, b) => b.lastLaunched - a.lastLaunched)[0] || list[0];
    const rest = list.filter((g) => g !== last);
    const heroArt = last && last.art ? `style="background-image:url('${esc(fileUrl(last.art))}')"` : '';
    return {
      title: 'GAMES',
      html: `<div class="stack">
        <div class="pills" style="border-top:1px solid var(--line);padding-top:14px">
          <button type="button" class="pill ${filter === 'ALL' ? 'on' : ''}" data-store="ALL">ALL ${all.length}</button>
          ${favs.length ? `<button type="button" class="pill ${filter === 'FAV' ? 'on' : ''}" data-store="FAV">★ FAVORITES ${favs.length}</button>` : ''}
          ${Object.entries(stores).sort((a, b) => b[1] - a[1]).map(([s, n]) => `<button type="button" class="pill ${filter === s ? 'on' : ''}" data-store="${esc(s)}">${esc(s.toUpperCase())} ${n}</button>`).join('')}
          <span style="flex:1"></span>${sortPills(app, app.state.sort)}
        </div>
        ${filter === 'ALL' && favs.length ? `<div>${rowLabel('★ FAVORITES', String(favs.length))}<div class="fav-row">${favs.map((g) => `<button type="button" class="fav-chip" data-item="${esc(g.id)}" ${g.art ? `style="background-image:url('${esc(fileUrl(g.art))}')"` : ''}>${!g.art && app.iconFor(g) ? `<img src="${esc(app.iconFor(g))}" alt="">` : ''}<span>${esc(g.name)}</span></button>`).join('')}</div></div>` : ''}
        ${rowLabel(filter === 'FAV' ? 'FAVORITES' : filter === 'ALL' ? 'ALL GAMES' : filter, list.length + ' GAMES', '<button type="button" class="act" data-add-game>+ ADD GAME</button>')}
        ${all.length ? `<div class="hero-play">
          ${last ? `<button type="button" class="hero-card ${last.art ? 'has-art' : ''}" data-item="${esc(last.id)}" ${heroArt}>
            <span class="k"><span>${last.lastLaunched ? 'LAST PLAYED' : 'TOP PICK'}</span><span>${esc((last.store || 'GAME').toUpperCase())}</span></span>
            ${!last.art && app.iconFor(last) ? `<img class="hero-ico" src="${esc(app.iconFor(last))}" alt="">` : ''}
            <span style="display:flex;flex-direction:column;gap:12px"><span class="t" style="font-size:${Math.min(54, Math.floor(292 / (Math.max(...last.name.split(/\s+/).map((w) => w.length)) * 0.74)))}px">${esc(last.name.toUpperCase())}</span><span style="font-size:var(--fs-md)">${esc(hms(app.timeToday(last.id)))} today · ${esc(hms(app.timeTotal(last.id)))} total</span></span>
            <span class="play">▶ PLAY${last.profile ? ' <small>WITH PROFILE</small>' : ''}</span>
          </button>` : ''}
          <div class="covers" style="flex:1;min-width:0;align-content:start">${rest.map((g, i) => cover(app, g, i)).join('')}</div>
        </div>` : (app.state.scanning ? empty('Looking for Steam, Epic, Xbox and Roblox games…') : emptyCard({ mark: '▶', title: 'No games found yet', text: 'Catalyst looks in <b>Steam</b>, <b>Epic</b>, <b>Xbox</b> and <b>Roblox</b>. If yours didn\'t show up, add it here or scan again.', btns: [['data-eg-add', '+ ADD A GAME'], ['data-ec-scan', 'SCAN AGAIN']], tip: 'Game in another tab? Right-click it and choose <b>Move to Games</b>.' }))}
      </div>`,
      mount(el) {
        bindSort(app, el);
        el.querySelectorAll('[data-store]').forEach((b) => b.addEventListener('click', () => { app.state.gameFilter = b.dataset.store; app.render(); }));
        el.querySelectorAll('[data-add-game],[data-eg-add]').forEach((b) => b.addEventListener('click', () => app.addGame()));
      }
    };
  }

  /* ---------- generic sections (Studio, Dev, Apps, Social, Web, custom) ---------- */
  function section(app, sec) {
    const list = sortItems(app, app.visibleItems().filter((i) => i.section === sec.id), app.state.sort);
    const isStudio = sec.id === 'studio';
    const isWeb = sec.id === 'web' || sec.id === 'social';
    const grid = list.length
      ? `<div class="grid">${list.map((it, i) => tile(app, it, i, i === 0 && app.state.sort === 'used' && app.timeTotal(it.id) > 0 ? 'hero' : '')).join('')}</div>`
      : emptyCard({
        title: `Nothing in ${esc(sec.label)} yet`,
        text: isWeb ? 'Save the sites you open every day so they\'re one click away.' : `Put the apps, folders and files you use for ${esc(sec.label.toLowerCase())} here so they\'re one click away.`,
        btns: isWeb ? [['data-add="site"', '+ ADD A SITE'], ['data-ec-pick', 'PICK FROM MY APPS']] : [['data-ec-pick', 'PICK FROM MY APPS'], ['data-add="files"', '+ FILES OR FOLDERS']],
        tip: `Or drag anything onto this window, or right-click a tile anywhere and choose <b>Move to ${esc(sec.label)}</b>.`
      });
    const addBtn = `<button type="button" class="act" data-add="${isWeb ? 'site' : 'files'}">+ ADD ${isWeb ? 'SITE' : ''}</button>`;
    const main = `<div>${rowLabel(String(list.length) + ' ITEMS', '', sortPills(app, app.state.sort) + addBtn)}${grid}</div>`;
    if (!isStudio) {
      return { title: sec.label, html: `<div class="stack">${main}</div>`, mount(el) { bindSort(app, el); bindAdd(app, el, sec.id); } };
    }
    return {
      title: 'STUDIO',
      html: `<div class="split"><div class="grow">${main}
          <div>${rowLabel('RECENT BOUNCES', esc(shortPath(app.state.settings.bouncesDir)), '<button type="button" class="act" data-pick-bounces>CHANGE FOLDER</button>')}<div id="bounces" class="list">${empty('Loading…')}</div></div>
        </div>
        <aside>
          <div>${rowLabel('DROP ZONE', '', app.proTag())}<div class="dropzone" id="studio-drop"><b>DROP FILES</b>beats, bounces, projects<br>get copied to their folders</div>
            <div class="note" style="margin-top:8px">Audio goes to <b>${esc(shortPath(app.state.settings.dropRules.audio) || 'not set')}</b>. Change folders in Settings › Tools.</div></div>
          <div>${rowLabel('RELEASES', '', app.proTag() + '<button type="button" class="act" data-add-release>+ ADD</button>')}${releasesHtml(app)}</div>
          <div>${rowLabel('DASHBOARDS', '', '<button type="button" class="act" data-add-link>+ ADD</button>')}<div class="list">${(app.state.settings.links || []).map((l, i) => `<div style="display:flex;align-items:center"><button type="button" class="list-row" data-url="${esc(l.url)}"><span class="nm">${esc(l.name)}</span><span class="tm">↗</span></button><button type="button" class="act" data-del-link="${i}" aria-label="Remove ${esc(l.name)}" style="border:0;background:transparent;color:var(--mute);width:32px;height:44px">×</button></div>`).join('') || empty('Add links to your distributor, streaming stats and more.')}</div></div>
        </aside></div>`,
      mount(el) {
        bindSort(app, el); bindAdd(app, el, 'studio');
        loadBounces(app, el);
        el.querySelector('[data-pick-bounces]').addEventListener('click', async () => { const p = await window.cat.pickFolder('Where are your bounces?'); if (p) { await app.saveSettings({ bouncesDir: p }); app.render(); } });
        const dz = el.querySelector('#studio-drop');
        dz.addEventListener('dragover', (e) => { e.preventDefault(); e.stopPropagation(); dz.classList.add('over'); });
        dz.addEventListener('dragleave', () => dz.classList.remove('over'));
        dz.addEventListener('drop', (e) => { e.preventDefault(); e.stopPropagation(); dz.classList.remove('over'); if (app.pro('dropzone')) app.handleDrop(e, 'dropzone'); });
        el.querySelector('[data-add-release]').addEventListener('click', () => app.pro('dropzone') && app.releaseDialog());
        el.querySelectorAll('[data-del-release]').forEach((b) => b.addEventListener('click', async () => { const r = [...app.state.settings.releases]; r.splice(Number(b.dataset.delRelease), 1); await app.saveSettings({ releases: r }); app.render(); }));
        el.querySelectorAll('[data-stage]').forEach((b) => b.addEventListener('click', async () => {
          if (!app.pro('dropzone')) return;
          const [i, k] = b.dataset.stage.split(':');
          const r = app.state.settings.releases.map((x) => ({ ...x, stages: { ...(x.stages || {}) } }));
          r[Number(i)].stages[k] = !r[Number(i)].stages[k];
          await app.saveSettings({ releases: r }); app.render(true);
        }));
        el.querySelector('[data-add-link]').addEventListener('click', () => app.linkDialog());
        el.querySelectorAll('[data-del-link]').forEach((b) => b.addEventListener('click', async () => { const l = [...app.state.settings.links]; l.splice(Number(b.dataset.delLink), 1); await app.saveSettings({ links: l }); app.render(); }));
      }
    };
  }

  function shortPath(p) { if (!p) return ''; const parts = String(p).split(/[\\/]/).filter(Boolean); return parts.slice(-2).join('\\'); }

  function releasesHtml(app) {
    const all = app.state.settings.releases || [];
    const r = [...all].sort((x, y) => x.date.localeCompare(y.date));
    if (!r.length) return empty('Add your next drop and track it from beat to promo.');
    return r.map((x) => {
      const days = daysUntil(x.date);
      const idx = all.indexOf(x);
      const st = x.stages || {};
      return `<div class="release-card">
        <div class="release"><div><div class="nm">${esc(x.title)}</div><small>${esc(new Date(x.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }))} · ${releaseProgress(x)}% ready</small></div>
          <div style="display:flex;align-items:center;gap:8px"><span class="d">${days > 0 ? days + 'D' : days === 0 ? 'TODAY' : 'OUT'}</span><button type="button" data-del-release="${idx}" aria-label="Remove ${esc(x.title)}">×</button></div></div>
        <div class="stages">${STAGES.map(([k, l]) => `<button type="button" class="stage ${st[k] ? 'on' : ''}" data-stage="${idx}:${k}" aria-pressed="${!!st[k]}">${l}</button>`).join('')}</div>
        ${x.link ? `<button type="button" class="list-row" data-url="${esc(x.link)}" style="min-height:34px;font-size:var(--fs-sm)"><span class="nm">${esc(x.link.replace(/^https?:\/\//, ''))}</span><span class="tm">↗</span></button>` : ''}
      </div>`;
    }).join('');
  }

  async function loadBounces(app, el) {
    const box = el.querySelector('#bounces');
    const list = await window.cat.bounces();
    if (!box.isConnected) return;
    if (!Array.isArray(list) || !list.length) { box.innerHTML = empty('No audio found in your bounces folder yet.'); return; }
    box.innerHTML = list.map((f, i) => `<div class="list-row" style="cursor:default"><button type="button" class="btn small ghost" data-play="${i}" aria-label="Play ${esc(f.name)}">▶</button><span class="nm">${esc(f.name)}</span><span class="tm">${esc(ago(f.time))}</span><button type="button" class="btn small ghost" data-reveal="${i}">SHOW</button></div>`).join('');
    box.querySelectorAll('[data-play]').forEach((b) => b.addEventListener('click', () => app.previewAudio(list[Number(b.dataset.play)], b)));
    box.querySelectorAll('[data-reveal]').forEach((b) => b.addEventListener('click', () => window.cat.reveal(list[Number(b.dataset.reveal)].path)));
  }

  function bindAdd(app, el, sectionId) {
    const pick = el.querySelector('[data-ec-pick]');
    if (pick) pick.addEventListener('click', () => {
      const sec = app.state.sections.find((x) => x.id === sectionId);
      app.pickItemsDialog([], async (ids) => {
        for (const id of ids) await window.cat.updateItem(id, { section: sectionId });
        if (ids.length) app.toast('MOVED ' + ids.length + ' TO ' + (sec ? sec.label : sectionId).toUpperCase());
      }, 'Move to ' + (sec ? sec.label : sectionId), false);
    });
    el.querySelectorAll('[data-add]').forEach((b) => b.addEventListener('click', async () => {
      if (b.dataset.add === 'site') return app.siteDialog(sectionId);
      const paths = await window.cat.pickFiles();
      if (paths && paths.length) { await window.cat.addPaths(paths, sectionId); app.toast('ADDED ' + paths.length); }
    }));
  }

  /* ---------- FILES ---------- */
  function files(app) {
    const pinned = app.visibleItems().filter((i) => (i.kind === 'folder' || i.kind === 'file') && i.section === 'files');
    return {
      title: 'FILES',
      html: `<div class="split"><div class="grow">
          <div>${rowLabel('FOLDERS', '', '<button type="button" class="act" data-add="files">+ PIN FOLDER OR FILE</button>')}
            <div class="folder-row">${[...pinned.map((f) => `<button type="button" class="folder" data-item="${esc(f.id)}">${f.kind === 'folder' ? folderSvg() : ''} ${esc(f.name)}</button>`), ...app.state.folders.map((f) => `<button type="button" class="folder" data-path="${esc(f.path)}">${folderSvg()} ${esc(f.name.toUpperCase())}</button>`)].join('')}</div></div>
          <div>${rowLabel('RECENT FILES')}<div class="list" id="recent">${empty('Loading…')}</div></div>
          <div hidden>${rowLabel('SCREENSHOTS', 'WIN+SHIFT+S')}<div class="shots" id="shots"></div></div>
        </div>
        <aside>
          <div>${rowLabel('QUICK NOTE', 'OBSIDIAN')}
            <label class="sr" for="qn">Quick note</label><textarea class="input" id="qn" placeholder="${app.state.settings.notesVault ? 'type a note…' : 'set your vault in Settings › Tools first'}"></textarea>
            <div class="btns" style="margin-top:10px"><button type="button" class="btn small solid" data-note="0">ADD TO INBOX</button><button type="button" class="btn small ghost" data-note="1">NEW NOTE</button></div></div>
          <div>${rowLabel('DOWNLOADS', '', '<button type="button" class="act" data-file-history>HISTORY</button>')}<div class="note">Sorts loose files in Downloads into folders by your rules. You see a preview first, and anything can be undone.</div><div class="btns" style="margin-top:10px"><button type="button" class="btn small accent" data-sort-dl>PREVIEW SORT${app.proTag()}</button><button type="button" class="btn small ghost" data-sort-rules>RULES</button><button type="button" class="toggle ${app.state.settings.downloadsAuto ? 'on' : ''}" data-auto-dl>AUTO ${app.state.settings.downloadsAuto ? 'ON' : 'OFF'}</button></div></div>
          <div>${rowLabel('CLIPBOARD', '', '<button type="button" class="act" data-clip-clear>CLEAR</button>')}<div id="clips"></div></div>
        </aside></div>`,
      mount(el) {
        bindAdd(app, el, 'files');
        (async () => {
          const recent = await window.cat.recent();
          const box = el.querySelector('#recent');
          if (!box.isConnected) return;
          box.innerHTML = Array.isArray(recent) && recent.length ? recent.slice(0, 12).map((f) => `<button type="button" class="list-row" data-path="${esc(f.path)}"><span class="tg">${f.isDir ? 'FOLDER' : esc((f.name.split('.').pop() || '').toUpperCase().slice(0, 6))}</span><span class="nm">${esc(f.name)}</span><span class="tm">${esc(ago(f.time))}</span></button>`).join('') : empty('No recent files.');
          const shots = await window.cat.screenshots();
          const sbox = el.querySelector('#shots');
          if (!sbox.isConnected) return;
          sbox.innerHTML = Array.isArray(shots) && shots.length ? shots.map((s) => `<button type="button" class="shot" data-path="${esc(s.path)}" ${s.video ? '' : `style="background-image:url('${esc(fileUrl(s.path))}')"`} title="${esc(s.name)}"><span>${s.video ? '▶ ' : ''}${esc(ago(s.time))}</span></button>`).join('') : '';
          sbox.parentElement.hidden = !(Array.isArray(shots) && shots.length); // no empty row: it shows up once you take a screenshot
        })();
        renderClips(app, el);
        el.querySelectorAll('[data-note]').forEach((b) => b.addEventListener('click', async () => {
          const ta = el.querySelector('#qn'); const t = ta.value.trim();
          if (!t) return;
          const r = await window.cat.note(t, b.dataset.note === '1');
          if (r && r.error) app.toast(r.error.toUpperCase()); else { ta.value = ''; app.toast('NOTE SAVED'); }
        }));
        el.querySelector('[data-sort-dl]').addEventListener('click', () => app.sortPreviewDialog());
        el.querySelector('[data-sort-rules]').addEventListener('click', () => app.sortRulesDialog());
        el.querySelector('[data-file-history]').addEventListener('click', () => app.fileHistoryDialog());
        el.querySelector('[data-auto-dl]').addEventListener('click', async () => {
          if (!app.pro('sorter')) return; await app.saveSettings({ downloadsAuto: !app.state.settings.downloadsAuto }); app.render(); });
        el.querySelector('[data-clip-clear]').addEventListener('click', async () => { await window.cat.clearClipboard(); app.state.clips = []; renderClips(app, el); });
      }
    };
  }

  function renderClips(app, el) {
    const box = el.querySelector('#clips');
    if (!box) return;
    const clips = (app.state.clips || []).slice(0, 8);
    box.innerHTML = clips.length ? clips.map((c, i) => `<div class="clip"><p>${esc(c.text.slice(0, 300))}</p><button type="button" class="btn small ghost" data-copy="${i}">COPY</button></div>`).join('') : empty('Things you copy show up here.');
    box.querySelectorAll('[data-copy]').forEach((b) => b.addEventListener('click', async () => { await window.cat.copy(clips[Number(b.dataset.copy)].text); app.toast('COPIED'); }));
  }

  /* ---------- WORKSPACES ---------- */
  // Starter templates: each slot picks the first installed app matching its pattern.
  const WS_TEMPLATES = [
    { name: 'Studio Mode', color: '#ff5a1f', use: ['music'], slots: [/riptide|fl studio|ableton|reaper|pro tools|studio one|bitwig|logic/i, /exodus|waves central|saltwater|izotope|melodyne/i, /spotify|soundcloud/i, /^beats$|bounces/i] },
    { name: 'Game Night', color: '#a66bff', use: ['gaming'], slots: [/^steam$|epic games launcher|^roblox$/i, /discord/i, /spotify/i, /nvidia app|xbox|game bar/i] },
    { name: 'Dev Mode', color: '#6fd3ff', use: ['dev', 'design'], slots: [/visual studio code|^code$|cursor|visual studio$/i, /roblox studio|unity|unreal|godot|blender/i, /terminal|git bash|powershell/i, /claude|chatgpt|github/i] },
    { name: 'Work Mode', color: '#3affc8', use: ['work'], slots: [/outlook|gmail/i, /teams|slack|zoom/i, /word|google docs|notion/i, /excel|sheets/i, /chrome|edge|firefox|brave/i] },
    { name: 'Study Mode', color: '#e8ff3a', use: ['work'], slots: [/obsidian|notion|onenote/i, /chrome|edge|firefox|brave/i, /spotify/i] },
    { name: 'Streaming Mode', color: '#ff2e4d', use: ['content', 'gaming'], slots: [/obs|streamlabs/i, /discord/i, /voicemod|nvidia broadcast/i, /youtube studio|twitch|tiktok/i, /spotify/i] }
  ];
  function resolveTemplate(app, t) {
    const items = app.visibleItems();
    const ids = [];
    for (const re of t.slots) { const hit = items.find((i) => re.test(i.name) && !ids.includes(i.id)); if (hit) ids.push(hit.id); }
    return ids;
  }

  function wsProgressHtml(app) {
    const r = app.state.wsRun;
    if (!r) return '';
    const label = { waiting: 'WAITING', launching: 'OPENING…', done: 'OPENED', skipped: 'ALREADY OPEN', failed: 'FAILED', missing: 'MISSING' };
    const bad = r.steps.filter((s) => s.status === 'failed' || s.status === 'missing');
    return `<div class="ws-progress" role="status" aria-live="polite"><button type="button" class="wp-x" data-ws-close aria-label="Close">×</button>${rowLabel('LAUNCHING ' + esc(r.name.toUpperCase()), r.arranging ? 'ARRANGING WINDOWS…' : r.done ? 'DONE' : '')}
      ${r.steps.map((s) => `<div class="wp-row ${s.status}"><span class="dot"></span><span class="nm">${esc(s.name)}</span><span class="st">${label[s.status] || ''}</span>${s.reason ? `<small>${esc(s.reason)}</small>` : ''}</div>`).join('')}
      ${(r.placement || []).filter((p) => !p.ok).map((p) => `<div class="wp-row failed"><span class="dot"></span><span class="nm">${esc(p.name)}</span><span class="st">NOT ARRANGED</span><small>${esc(p.reason)}</small></div>`).join('')}
      ${r.done && bad.length ? `<div class="btns" style="margin-top:8px"><button type="button" class="btn small accent" data-ws-retry>RETRY ${bad.length}</button></div>` : ''}
    </div>`;
  }

  function workspaces(app) {
    const all = app.state.workspaces;
    if (!all.length && app.state.editingWs !== 'new') {
      const sugg = suggestionsHtml(app);
      return {
        title: 'WORKSPACES',
        html: `<div class="ws-empty">${emptyCard({ title: 'Open your whole setup in one click', text: 'A workspace opens a set of apps, folders and sites together, and can put every window back where you like it. Make one for gaming, school, streaming or making music.',
            btns: [['data-ws-tpl', 'START FROM A TEMPLATE'], ['data-ws-new', 'BUILD MY OWN'], ['data-ws-cap', '⧉ SAVE WHAT\'S OPEN NOW']],
            tip: '<b>Save what\'s open now</b> remembers the apps on your screen and where each window sits, even across monitors.' })}
          ${sugg ? `<div class="sugg-wrap">${rowLabel('SUGGESTED FOR YOU', 'FROM WHAT YOU OPEN TOGETHER')}${sugg}</div>` : ''}
          <div class="btns"><button type="button" class="btn small ghost" data-ws-import>IMPORT A WORKSPACE FILE</button></div></div>`,
        mount(el) {
          bindSuggestions(app, el);
          const fresh = () => { app.state.editingWs = 'new'; app.state.wsDraft = null; };
          el.querySelector('[data-ws-tpl]').addEventListener('click', () => app.templatesDialog());
          el.querySelector('[data-ws-new]').addEventListener('click', () => { fresh(); app.render(); });
          el.querySelector('[data-ws-cap]').addEventListener('click', () => { fresh(); app.render(true); if (app.state.wsDraft) app.captureDialog(app.state.wsDraft); });
          el.querySelector('[data-ws-import]').addEventListener('click', async () => { const r = await window.cat.importWorkspace(); if (r && r.error) app.toast(r.error.toUpperCase()); else if (r && r.workspace) { app.state.editingWs = r.workspace.id; app.state.wsDraft = null; app.toast(r.missing ? 'IMPORTED · ' + r.missing + ' APPS NOT ON THIS PC' : 'IMPORTED'); } });
        }
      };
    }
    const q = (app.state.wsSearch || '').trim();
    const list = q ? all.filter((w) => U.score(q, w.name) >= 0) : all;
    let cur = all.find((w) => w.id === app.state.editingWs) || null;
    if (!cur && all.length && app.state.editingWs !== 'new') cur = all[0];
    const draft = app.state.wsDraft && app.state.wsDraft.id === (cur ? cur.id : 'new') ? app.state.wsDraft : JSON.parse(JSON.stringify(cur || { id: 'new', name: 'NEW WORKSPACE', items: [], closeFirst: [], hotkey: '', delay: 600, skipRunning: true, layout: [], color: '' }));
    if (!draft.layout) draft.layout = [];
    app.state.wsDraft = draft;
    const byId = new Map(app.state.items.map((i) => [i.id, i]));
    const steps = draft.items.map((id) => byId.get(id) || { id, name: 'Missing item', missing: true, kind: 'file' });
    const layoutFor = (id) => draft.layout.find((r) => r.itemId === id);
    const monitorsUsed = [...new Set(draft.layout.map((r) => r.monitor).filter(Boolean))];
    return {
      title: 'WORKSPACES',
      html: `<div class="ws-layout" style="border-top:1px solid var(--line);padding-top:22px">
        <div class="ws-list">
          <label class="sr" for="ws-q">Search workspaces</label>${all.length > 4 ? `<input class="input" id="ws-q" placeholder="search workspaces" value="${esc(q)}" style="height:40px;font-size:var(--fs-md)">` : ''}
          ${list.map((w) => `<button type="button" class="ws-item ${cur && w.id === cur.id ? 'on' : ''}" data-edit="${esc(w.id)}" style="${w.color ? 'border-left:4px solid ' + w.color : ''}"><span>${esc(w.name.toUpperCase())}</span><small>${w.items.length} ITEMS${w.layout && w.layout.length ? ' · LAYOUT' : ''}${w.hotkey ? ' · ' + esc(w.hotkey.toUpperCase()) : ''}</small></button>`).join('')}
          <button type="button" class="ws-item ${!cur ? 'on' : ''}" data-edit="new" style="border-style:dashed">+ NEW WORKSPACE${!app.isPro() && app.state.workspaces.length >= app.FREE.workspaces ? app.proTag() : ''}</button>
          <div class="btns"><button type="button" class="btn small ghost" data-templates>TEMPLATES</button><button type="button" class="btn small ghost" data-ws-import>IMPORT</button></div>
          ${suggestionsHtml(app)}
        </div>
        <div class="ws-edit">
          <label class="field"><span>NAME</span><input class="input big" id="ws-name" value="${esc(draft.name)}" maxlength="40"></label>
          ${rowLabel('LAUNCH ORDER', 'DRAG TO REORDER', '<button type="button" class="act" data-capture>⧉ CAPTURE MY DESKTOP</button>')}
          <div style="display:flex;flex-direction:column;gap:8px" id="ws-steps">
            ${steps.map((it, i) => { const lay = layoutFor(it.id); return `<div class="step ${it.missing ? 'missing' : ''}" draggable="true" data-idx="${i}" style="animation-delay:${i * 0.06}s;border-left-color:${it.missing ? '#ff2e4d' : i === 0 ? 'var(--accent)' : 'var(--fg-2)'}"><span class="n">${String(i + 1).padStart(2, '0')}</span><span class="tag" style="${i === 0 ? 'background:var(--accent)' : ''}">${esc(it.missing ? 'MISSING' : kindLabel(it))}</span><span class="nm">${esc(it.name)}${lay ? `<small class="lay">${lay.state === 'max' ? 'MAXIMIZED' : lay.w + '×' + lay.h}${monitorsUsed.length > 1 ? ' · SCREEN ' + (monitorsUsed.indexOf(lay.monitor) + 1) : ''}</small>` : ''}</span><button type="button" data-up="${i}" aria-label="Move up">↑</button><button type="button" data-rm="${i}" aria-label="Remove ${esc(it.name)}">×</button></div>`; }).join('')}
            <button type="button" class="add-step" data-add-step>+ ADD APP, GAME, FOLDER, FILE OR SITE</button>
          </div>
        </div>
        <div class="ws-side">
          ${rowLabel('WINDOW LAYOUT', draft.layout.length ? draft.layout.length + ' SAVED' : 'NONE')}
          ${layoutPreview(draft, steps)}
          ${draft.layout.length ? `<div class="btns"><button type="button" class="btn small ghost" data-arrange ${cur ? '' : 'disabled'}>ARRANGE NOW</button><button type="button" class="btn small ghost" data-clear-layout>CLEAR LAYOUT</button></div>` : '<div class="note">Open your apps the way you like them, then hit <b>Capture my desktop</b>. Catalyst saves every window\'s spot, even across monitors.</div>'}
          <div>
            <div class="opt"><span class="lab">Hotkey<small>Launch from anywhere</small></span><span class="ctl"><button type="button" class="hotkey-input" id="ws-hotkey">${esc(draft.hotkey ? draft.hotkey.toUpperCase() : 'CLICK TO SET')}</button></span></div>
            <div class="opt"><span class="lab">Skip apps already open<small>No second copies</small></span><span class="ctl"><button type="button" class="toggle ${draft.skipRunning !== false ? 'on' : ''}" data-skip>${draft.skipRunning !== false ? 'ON' : 'OFF'}</button></span></div>
            <div class="opt"><span class="lab">Close first<small>${draft.closeFirst.length ? esc(draft.closeFirst.join(', ')) : 'Nothing'}</small></span><span class="ctl"><button type="button" class="btn small ghost" data-close-first>EDIT</button></span></div>
            <div class="opt"><span class="lab">Gap between launches<small>${draft.delay} ms</small></span><span class="ctl"><input type="range" min="0" max="5000" step="100" value="${draft.delay}" id="ws-delay" aria-label="Gap between launches"></span></div>
            <div class="opt"><span class="lab">Color</span><span class="ctl">${['', '#ff5a1f', '#a66bff', '#6fd3ff', '#3affc8', '#e8ff3a', '#ff2e4d'].map((c) => `<button type="button" class="swatch ${draft.color === c ? 'on' : ''}" data-wscolor="${c}" style="width:26px;height:26px;background:${c || 'transparent'}" aria-label="${c || 'No'} color"></button>`).join('')}</span></div>
          </div>
          <div class="btns">${cur ? '<button type="button" class="btn small ghost danger" data-del-ws>DELETE</button><button type="button" class="btn small ghost" data-dup>DUPLICATE</button><button type="button" class="btn small ghost" data-export>EXPORT</button>' : ''}<button type="button" class="btn small solid" data-save-ws>SAVE</button></div>
          <button type="button" class="go" data-launch-ws ${steps.length ? '' : 'disabled style="opacity:.4"'}>▶ LAUNCH ${esc(draft.name.toUpperCase().slice(0, 18))}</button>
        </div>
      </div>`,
      mount(el) {
        bindSuggestions(app, el);
        const d = app.state.wsDraft;
        const qi = el.querySelector('#ws-q');
        if (qi) qi.addEventListener('input', U.debounce(() => { app.state.wsSearch = qi.value; app.render(true); setTimeout(() => { const n = document.querySelector('#ws-q'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }, 0); }, 150));
        el.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => { if (b.dataset.edit === 'new' && !app.isPro() && app.state.workspaces.length >= app.FREE.workspaces) return app.proDialog('workspaces'); app.state.editingWs = b.dataset.edit; app.state.wsDraft = null; app.render(); }));
        el.querySelector('#ws-name').addEventListener('input', (e) => { d.name = e.target.value; });
        el.querySelector('#ws-delay').addEventListener('input', (e) => { d.delay = Number(e.target.value); e.target.closest('.opt').querySelector('small').textContent = d.delay + ' ms'; });
        el.querySelectorAll('[data-rm]').forEach((b) => b.addEventListener('click', () => { const [gone] = d.items.splice(Number(b.dataset.rm), 1); d.layout = d.layout.filter((r) => r.itemId !== gone); app.render(true); }));
        el.querySelectorAll('[data-up]').forEach((b) => b.addEventListener('click', () => { const i = Number(b.dataset.up); if (i > 0) { [d.items[i - 1], d.items[i]] = [d.items[i], d.items[i - 1]]; app.render(true); } }));
        el.querySelector('[data-add-step]').addEventListener('click', () => app.pickItemsDialog(d.items, (ids) => { d.items = ids; app.render(true); }));
        el.querySelector('[data-close-first]').addEventListener('click', () => app.closeFirstDialog(d));
        el.querySelector('[data-skip]').addEventListener('click', () => { d.skipRunning = d.skipRunning === false; app.render(true); });
        el.querySelectorAll('[data-wscolor]').forEach((b) => b.addEventListener('click', () => { d.color = b.dataset.wscolor; app.render(true); }));
        el.querySelector('[data-capture]').addEventListener('click', () => app.captureDialog(d));
        el.querySelector('[data-templates]').addEventListener('click', () => app.templatesDialog());
        el.querySelector('[data-ws-import]').addEventListener('click', async () => { const r = await window.cat.importWorkspace(); if (r && r.error) app.toast(r.error.toUpperCase()); else if (r && r.workspace) { app.state.editingWs = r.workspace.id; app.state.wsDraft = null; app.toast(r.missing ? 'IMPORTED · ' + r.missing + ' APPS NOT ON THIS PC' : 'IMPORTED'); } });
        const cl = el.querySelector('[data-clear-layout]');
        if (cl) cl.addEventListener('click', () => { d.layout = []; app.render(true); });
        const ar = el.querySelector('[data-arrange]');
        if (ar) ar.addEventListener('click', async () => { await save(); const r = await window.cat.arrangeWorkspace(d.id); const ok = (r || []).filter((x) => x.ok).length; app.toast('ARRANGED ' + ok + ' OF ' + (r || []).length + ' WINDOWS'); });
        app.hotkeyRecorder(el.querySelector('#ws-hotkey'), (combo) => { d.hotkey = combo; app.render(true); });
        let from = null;
        el.querySelectorAll('.step').forEach((s) => {
          s.addEventListener('dragstart', () => { from = Number(s.dataset.idx); s.classList.add('dragging'); });
          s.addEventListener('dragend', () => s.classList.remove('dragging'));
          s.addEventListener('dragover', (e) => e.preventDefault());
          s.addEventListener('drop', (e) => { e.preventDefault(); e.stopPropagation(); const to = Number(s.dataset.idx); if (from === null || from === to) return; const [m] = d.items.splice(from, 1); d.items.splice(to, 0, m); app.render(true); });
        });
        const save = async () => {
          const payload = { ...d, id: d.id === 'new' ? undefined : d.id, name: (d.name || 'WORKSPACE').trim() };
          const first = !app.state.workspaces.length && !payload.id;
          const saved = await window.cat.saveWorkspace(payload);
          if (first && saved && saved.id) app.celebrate();
          app.state.editingWs = saved.id; app.state.wsDraft = null;
          d.id = saved.id;
          return saved;
        };
        el.querySelector('[data-save-ws]').addEventListener('click', async () => { await save(); app.toast('SAVED'); });
        const del = el.querySelector('[data-del-ws]');
        if (del) del.addEventListener('click', () => app.confirm('Delete ' + d.name + '?', async () => { await window.cat.removeWorkspace(d.id); app.state.editingWs = null; app.state.wsDraft = null; }));
        const dup = el.querySelector('[data-dup]');
        if (dup) dup.addEventListener('click', async () => { await save(); const c = await window.cat.duplicateWorkspace(d.id); if (c) { app.state.editingWs = c.id; app.state.wsDraft = null; app.toast('DUPLICATED'); } });
        const ex = el.querySelector('[data-export]');
        if (ex) ex.addEventListener('click', async () => { await save(); if (await window.cat.exportWorkspace(d.id)) app.toast('EXPORTED'); });
        el.querySelector('[data-launch-ws]').addEventListener('click', async () => { const s2 = await save(); app.launchWorkspace(s2.id); });
      }
    };
  }

  // Mini map of the saved window layout, drawn to scale across monitors.
  function layoutPreview(draft, steps) {
    const L = draft.layout;
    if (!L.length) return `<div class="layout-preview" aria-hidden="true">${[0, 1, 2].map((i) => `<div>${steps[i] ? esc(steps[i].name.toUpperCase()) : ''}</div>`).join('')}</div>`;
    const mons = [...new Map(L.filter((r) => r.mw).map((r) => [r.monitor, { x: r.mx, y: r.my, w: r.mw, h: r.mh }])).values()];
    const minX = Math.min(...mons.map((m) => m.x)); const minY = Math.min(...mons.map((m) => m.y));
    const maxX = Math.max(...mons.map((m) => m.x + m.w)); const maxY = Math.max(...mons.map((m) => m.y + m.h));
    const W = maxX - minX || 1; const H = maxY - minY || 1;
    const pct = (v, o, t) => ((v - o) / t * 100).toFixed(2) + '%';
    return `<div class="layout-map" style="aspect-ratio:${W}/${H}" aria-label="Saved window layout" role="img">
      ${mons.map((m) => `<div class="mon" style="left:${pct(m.x, minX, W)};top:${pct(m.y, minY, H)};width:${(m.w / W * 100).toFixed(2)}%;height:${(m.h / H * 100).toFixed(2)}%"></div>`).join('')}
      ${L.map((r, i) => { const box = r.state === 'max' ? { x: r.mx, y: r.my, w: r.mw, h: r.mh } : r; return `<div class="win ${i === 0 ? 'first' : ''}" style="left:${pct(box.x, minX, W)};top:${pct(box.y, minY, H)};width:${Math.max(4, box.w / W * 100).toFixed(2)}%;height:${Math.max(6, box.h / H * 100).toFixed(2)}%"><span>${esc((r.name || '').toUpperCase())}</span></div>`; }).join('')}
    </div>`;
  }

  /* ---------- FLOW ---------- */
  function flowSummary(app, f) {
    const meta = app.state.flowMeta || { triggers: {}, actions: {} };
    const t = f.trigger;
    const name = (exe) => { const it = app.state.items.find((i) => i.exe === String(exe).toLowerCase()); return it ? it.name : exe; };
    const days = t.days && t.days.length && t.days.length < 7 ? ' on ' + t.days.map((d) => 'SMTWTFS'[d]).join('') : '';
    const when = { 'app-opened': 'WHEN ' + name(t.value) + ' OPENS', 'app-closed': 'WHEN ' + name(t.value) + ' CLOSES', 'game-started': 'WHEN ANY GAME STARTS', schedule: 'AT ' + t.value + days, startup: 'WHEN CATALYST STARTS', workspace: 'WHEN ' + ((app.state.workspaces.find((w) => w.id === t.value) || {}).name || 'A WORKSPACE') + ' LAUNCHES', 'file-added': 'WHEN A FILE LANDS IN ' + (t.value.split(/[\\/]/).pop() || 'A FOLDER'), hotkey: 'WHEN I PRESS ' + t.value }[t.type] || meta.triggers[t.type];
    return String(when).toUpperCase();
  }

  function flowView(app) {
    const flows = app.state.flows || [];
    if (!app.isPro()) return {
      title: 'FLOW',
      html: `<div class="pro-lock"><div class="pro-badge">PRO</div><h2>Make your PC run itself.</h2>
        <p>Flow automates your PC: pick a trigger, then pick what happens. It runs quietly in the background.</p>
        <div class="pro-examples">${[['WHEN OBS OPENS', 'Launch Streaming Mode, pause music'], ['WHEN ANY GAME STARTS', 'Turn on Game Mode'], ['WHEN A FILE LANDS IN DOWNLOADS', 'Sort it'], ['WEEKDAYS AT 9:00', 'Open your work setup']].map(([a, b]) => `<div><b>${a}</b><span>→ ${b}</span></div>`).join('')}</div>
        <div class="btns"><button type="button" class="btn accent" data-flow-pro>UNLOCK FLOW</button><button type="button" class="btn ghost" data-flow-key>I HAVE A KEY</button></div></div>`,
      mount(el) {
        el.querySelector('[data-flow-pro]').addEventListener('click', () => app.proDialog('flow'));
        el.querySelector('[data-flow-key]').addEventListener('click', () => app.proDialog('flow', true));
      }
    };
    return {
      title: 'FLOW',
      html: `<div class="split"><div class="grow">
        ${rowLabel(flows.length + ' FLOWS', 'WHEN THIS HAPPENS, DO THAT', '<button type="button" class="act" data-flow-recipes>RECIPES</button><button type="button" class="act" data-flow-new>+ NEW FLOW</button>')}
        ${flows.length ? `<div class="flows">${flows.map((f, i) => `<div class="flow-card ${f.enabled ? '' : 'off'}" style="animation-delay:${i * 0.05}s">
            <div class="fc-main"><div class="fc-name">${esc(f.name)}</div>
              <div class="fc-line"><span class="fc-when">${esc(flowSummary(app, f))}${f.when && f.when.from ? ' · ' + esc(f.when.from) + '–' + esc(f.when.to) : ''}</span><i>→</i><span class="fc-then">${f.actions.map((a) => `<span>${esc(((app.state.flowMeta || {}).actions || {})[a.type] || a.type)}</span>`).join('<i>→</i>')}</span></div></div>
            <div class="fc-side"><span class="fc-last">${f.lastRun ? 'RAN ' + esc(ago(f.lastRun).toUpperCase()) : 'NEVER RAN'}</span><button type="button" class="btn small ghost" data-flow-run="${esc(f.id)}">RUN NOW</button><button type="button" class="btn small ghost" data-flow-edit="${esc(f.id)}">EDIT</button><button type="button" class="toggle ${f.enabled ? 'on' : ''}" data-flow-toggle="${esc(f.id)}" aria-label="Turn ${esc(f.name)} on or off">${f.enabled ? 'ON' : 'OFF'}</button></div>
          </div>`).join('')}</div>`
          : emptyCard({ mark: '→', title: 'Make your PC do things on its own', text: 'A Flow is <b>when this happens, do that</b>. Start from one of these. You can change anything before it\'s saved.',
              extra: `<div class="ec-picks">${(((app.state.flowMeta || {}).recipes) || []).map((r, i) => { const [a, b] = r.name.split(' → '); return `<button type="button" class="ec-pick" data-ec-recipe="${i}"><small>WHEN ${esc((a || '').toUpperCase())}</small><span>→ ${esc(b || r.name)}</span></button>`; }).join('')}</div>`,
              btns: [['data-flow-new', 'BUILD MY OWN', 'ghost']] })}
      </div>
      <aside style="width:360px">${rowLabel('RECENT RUNS', '', '<button type="button" class="act" data-flow-refresh>REFRESH</button>')}
        <div class="list">${(app.state.flowLog || []).slice(0, 14).map((l) => `<div class="flow-log ${l.results && l.results.some((r) => !r.ok) ? 'bad' : ''}"><div><b>${esc(l.name)}</b> <small>${esc(ago(l.ts))}</small></div><small>${esc(l.trigger)}</small>${(l.results || []).filter((r) => !r.ok).map((r) => `<small class="err">✕ ${esc(r.step)}${r.error ? ': ' + esc(r.error) : ''}</small>`).join('')}</div>`).join('') || empty('Runs show up here.')}</div>
        <div class="note" style="margin-top:14px">Safety: each flow waits for its cooldown before running again, flows can't trigger each other endlessly, and nothing deletes files.</div>
      </aside></div>`,
      mount(el) {
        el.querySelectorAll('[data-flow-new]').forEach((b) => b.addEventListener('click', () => app.flowEditor(null)));
        el.querySelectorAll('[data-ec-recipe]').forEach((b) => b.addEventListener('click', () => app.useRecipe(Number(b.dataset.ecRecipe))));
        el.querySelector('[data-flow-recipes]').addEventListener('click', () => app.flowRecipes());
        el.querySelector('[data-flow-refresh]').addEventListener('click', () => app.loadFlows());
        el.querySelectorAll('[data-flow-edit]').forEach((b) => b.addEventListener('click', () => app.flowEditor(flows.find((f) => f.id === b.dataset.flowEdit))));
        el.querySelectorAll('[data-flow-toggle]').forEach((b) => b.addEventListener('click', async () => { const f = flows.find((x) => x.id === b.dataset.flowToggle); await window.cat.saveFlow({ ...f, enabled: !f.enabled }); app.loadFlows(); }));
        el.querySelectorAll('[data-flow-run]').forEach((b) => b.addEventListener('click', async () => { b.disabled = true; const r = await window.cat.runFlow(b.dataset.flowRun); const bad = r && r.results ? r.results.filter((x) => !x.ok).length : 0; app.toast(r && r.skipped ? r.skipped.toUpperCase() : bad ? bad + ' STEP(S) FAILED' : 'FLOW RAN'); app.loadFlows(); }));
      }
    };
  }

  /* ---------- STATS ---------- */
  function stats(app) {
    const st = app.state.stats;
    if (!st) return { title: 'STATS', html: empty('Loading…'), mount() {} };
    const range = app.isPro() ? (app.state.statsRange || 'week') : 'today';
    const data = st[range];
    const list = data.list.slice(0, 7);
    const max = Math.max(1, ...list.map((r) => r.secs));
    const days = st.week.days;
    const maxDay = Math.max(1, ...days.map((d) => d.secs));
    const today = days.length - 1;
    const sec = Object.entries(st.week.bySection).sort((a, b) => b[1] - a[1]);
    const secTotal = sec.reduce((a, b) => a + b[1], 0) || 1;
    const shades = ['var(--accent)', 'var(--fg)', '#5a5a5a', '#2e2e2e', '#222'];
    const inks = ['var(--on-accent)', 'var(--bg)', 'var(--fg)', 'var(--fg)', 'var(--fg)'];
    const change = st.week.prev ? Math.round((st.week.total - st.week.prev) / st.week.prev * 100) : null;
    const secLabel = (id) => (app.state.sections.find((s) => s.id === id) || { label: id.toUpperCase() }).label;
    const topSec = sec[0];
    const avg = st.week.total / 7;
    return {
      title: 'STATS',
      html: `<div class="stack">
        <div style="display:flex;justify-content:flex-end"><div class="seg" role="group" aria-label="Time range">${[['today', 'TODAY'], ['week', 'WEEK'], ['month', 'MONTH'], ['all', 'ALL TIME']].map(([k, l]) => `<button type="button" class="${range === k ? 'on' : ''}" data-range="${k}">${l}${k !== 'today' ? app.proTag() : ''}</button>`).join('')}</div></div>
        <div class="totals">
          <div><div class="k">${range === 'today' ? 'TODAY' : range === 'week' ? 'THIS WEEK' : range === 'month' ? 'LAST 30 DAYS' : 'ALL TIME'}</div><div class="v">${U.clock(data.total)}</div><div class="s">${range === 'week' && change !== null ? (change >= 0 ? '+' : '') + change + '% vs last week' : 'hours tracked'}</div></div>
          <div><div class="k">DAILY AVG</div><div class="v">${U.clock(avg)}</div><div class="s">this week</div></div>
          <div><div class="k">TOP SECTION</div><div class="v">${topSec ? esc(secLabel(topSec[0])) : '—'}</div><div class="s">${topSec ? hms(topSec[1]) + ' this week' : ''}</div></div>
          <div><div class="k">STREAK</div><div class="v">${st.streak.days} DAY${st.streak.days === 1 ? '' : 'S'}</div><div class="s">${st.streak.name ? 'in ' + esc(st.streak.name) : 'use an app 10+ min a day'}</div></div>
        </div>
        <div class="split">
          <div class="grow" style="gap:16px">
            ${rowLabel('HOURS / DAY', 'THIS WEEK')}
            <div class="chart">${days.map((d, i) => `<div class="col"><span>${(d.secs / 3600).toFixed(1)}h</span><i class="${i === today ? 'acc' : ''}" style="height:${Math.round(d.secs / maxDay * 190)}px;animation-delay:${i * 0.06}s"></i></div>`).join('')}</div>
            <div class="chart-x">${days.map((d) => `<span>${esc(d.label)}</span>`).join('')}</div>
            <div style="margin-top:10px">${rowLabel('BY SECTION', 'THIS WEEK')}
              ${sec.length ? `<div class="splitbar">${sec.slice(0, 5).map(([id, s], i) => `<div style="width:${(s / secTotal * 100).toFixed(1)}%;background:${shades[i]};color:${inks[i]};animation-delay:${i * 0.08}s" title="${esc(secLabel(id))} ${hms(s)}">${esc(secLabel(id))} ${Math.round(s / secTotal * 100)}%</div>`).join('')}</div>` : empty('No data yet.')}</div>
            <div style="margin-top:10px">${rowLabel('FOCUS + LIMITS', '', app.proTag())}
              <div style="display:flex;gap:24px;flex-wrap:wrap">
                <div class="focus-timer" style="flex:1;min-width:240px"><div class="k" style="font-size:var(--fs-sm);letter-spacing:.2em;color:var(--mute)">FOCUS TIMER</div><div class="clock" id="focus-clock">${app.focusLabel()}</div>
                  <div class="btns">${app.state.focus ? '<button type="button" class="btn small ghost" data-focus-stop>STOP</button>' : [15, 25, 50].map((m) => `<button type="button" class="btn small ${m === 25 ? 'accent' : 'ghost'}" data-focus="${m}">${m} MIN</button>`).join('')}</div></div>
                <div style="flex:1;min-width:240px">
                  ${['games', 'social'].map((s) => `<div class="opt"><span class="lab">${s === 'games' ? 'Games' : 'Social'} limit<small>Remind me after this much a day</small></span><span class="ctl"><select class="input" style="width:120px" data-limit="${s}" aria-label="${s} daily limit">${[0, 30, 60, 120, 180, 240, 360].map((m) => `<option value="${m}" ${Number(app.state.settings.limits[s] || 0) === m ? 'selected' : ''}>${m ? (m >= 60 ? m / 60 + 'h' : m + 'm') : 'OFF'}</option>`).join('')}</select></span></div>`).join('')}
                </div>
              </div>
            </div>
          </div>
          <aside style="width:380px">
            ${rowLabel('TOP ' + (range === 'today' ? 'TODAY' : range === 'all' ? 'ALL TIME' : range === 'month' ? 'THIS MONTH' : 'THIS WEEK'), 'TIME')}
            <div>${list.length ? list.map((r, i) => `<div class="bar-row"><div class="l"><span><span style="color:var(--mute);margin-right:10px">${String(i + 1).padStart(2, '0')}</span>${esc(r.name)}</span><span style="color:var(--fg);font-weight:700">${hms(r.secs)}</span></div><div class="bar" style="height:8px"><i class="${i === 0 ? 'acc' : ''}" style="width:${Math.round(r.secs / max * 100)}%;animation-delay:${i * 0.08}s"></i></div></div>`).join('') : empty('Nothing tracked yet. Keep Catalyst running in the tray and it logs the time automatically.')}</div>
          </aside>
        </div>
      </div>`,
      mount(el) {
        el.querySelectorAll('[data-range]').forEach((b) => b.addEventListener('click', () => { if (b.dataset.range !== 'today' && !app.pro('stats')) return; app.state.statsRange = b.dataset.range; app.render(true); }));
        el.querySelectorAll('[data-focus]').forEach((b) => b.addEventListener('click', () => { if (!app.pro('stats')) return; app.startFocus(Number(b.dataset.focus)); app.render(true); }));
        const stop = el.querySelector('[data-focus-stop]');
        if (stop) stop.addEventListener('click', () => { app.stopFocus(); app.render(true); });
        el.querySelectorAll('[data-limit]').forEach((s) => s.addEventListener('change', () => !app.pro('stats') ? app.render(true) : app.saveSettings({ limits: { [s.dataset.limit]: Number(s.value) } })));
      }
    };
  }

  /* ---------- SETTINGS ---------- */
  const VIBE_CARDS = [
    { id: 'studio', name: 'STUDIO', sample: 'CATALYST.', bg: '#0d0d0d', fg: '#ededed', font: 'var(--display)', tag: 'DEFAULT' },
    { id: 'midnight', name: 'MIDNIGHT', sample: 'Catalyst', bg: 'radial-gradient(circle at 30% 20%,#5a4bd1,#07080d 70%)', fg: '#fff', font: 'Segoe UI, sans-serif', tag: 'GLASS' },
    { id: 'terminal', name: 'TERMINAL', sample: '> catalyst_', bg: '#020a04', fg: '#3dff6a', font: 'Consolas, monospace', tag: 'CRT' },
    { id: 'vaporwave', name: 'VAPORWAVE', sample: 'C A T', bg: 'linear-gradient(180deg,#2b0f54,#ff71ce 70%,#ffb38a)', fg: '#fff', font: 'var(--display)', tag: 'RETRO' },
    { id: 'ocean', name: 'OCEAN', sample: 'catalyst', bg: 'linear-gradient(180deg,#0d6b9a,#03213a)', fg: '#c8f4ff', font: 'Segoe UI, sans-serif', tag: 'DEEP' },
    { id: 'cyberpunk', name: 'CYBERPUNK', sample: 'CAT//', bg: 'repeating-linear-gradient(135deg,#ffe600 0 14px,#111 14px 28px)', fg: '#fff', font: 'var(--display)', soon: true },
    { id: 'cosmos', name: 'COSMOS', sample: 'CAT*', bg: 'radial-gradient(circle at 70% 30%,#4a2a7a,#05030c 70%)', fg: '#fff', font: 'Segoe UI, sans-serif', soon: true }
  ];
  const BUILDER_FONTS = ['Archivo Black', 'Arial Black', 'Impact', 'Bahnschrift', 'Segoe UI', 'Trebuchet MS', 'Georgia', 'Space Mono', 'Consolas'];
  const SWATCHES = [['Orange', '#ff5a1f'], ['Acid', '#e8ff3a'], ['Bone', '#ededed'], ['Mint', '#3affc8'], ['Blood', '#ff2e4d'], ['Ice', '#6fd3ff'], ['Violet', '#a66bff']];

  function fontStack(f) {
    const mono = /mono|consolas/i.test(f);
    return `'${f}', ${mono ? "Consolas, 'Courier New', monospace" : "'Segoe UI', system-ui, sans-serif"}`;
  }

  function builderVars(b) {
    const mix = (hex, amt) => `color-mix(in srgb, ${hex} ${amt}%, transparent)`;
    return {
      '--bg': b.bg, '--bg-2': mix(b.bg3, 70), '--bg-3': b.bg3, '--fg': b.fg, '--fg-2': mix(b.fg, 75), '--mute': mix(b.fg, 58),
      '--line': mix(b.fg, 14), '--line-2': mix(b.fg, 22), '--accent': b.accent,
      '--display': fontStack(b.display), '--mono': fontStack(b.mono), '--radius': b.radius + 'px'
    };
  }

  function previewBuilder(app) {
    const b = app.state.builder;
    const root = document.documentElement;
    root.dataset.vibe = b.base;
    for (const [k, v] of Object.entries(builderVars(b))) root.style.setProperty(k, v);
  }

  function bindBuilder(app, el) {
    const open = el.querySelector('[data-b-open]');
    if (open) open.addEventListener('click', () => {
      if (!app.pro('vibes')) return;
      const cs = getComputedStyle(document.documentElement);
      const hex = (k, d) => { const v = cs.getPropertyValue(k).trim(); return /^#[0-9a-f]{6}$/i.test(v) ? v : d; };
      app.state.builder = { name: 'My Vibe', base: document.documentElement.dataset.vibe || 'studio', bg: hex('--bg', '#0d0d0d'), bg3: hex('--bg-3', '#1c1c1c'), fg: hex('--fg', '#ededed'), accent: hex('--accent', '#ff5a1f'), display: 'Archivo Black', mono: 'Space Mono', radius: parseInt(cs.getPropertyValue('--radius'), 10) || 0 };
      app.render(true);
    });
    if (!app.state.builder) return;
    el.querySelectorAll('[data-b]').forEach((inp) => inp.addEventListener('input', () => {
      const k = inp.dataset.b;
      app.state.builder[k] = k === 'radius' ? Number(inp.value) : inp.value;
      if (k === 'radius') inp.closest('.opt').querySelector('small').textContent = inp.value + 'px';
      previewBuilder(app);
    }));
    el.querySelector('[data-b-cancel]').addEventListener('click', () => { app.state.builder = null; app.applyVibe(); app.render(true); });
    el.querySelector('[data-b-save]').addEventListener('click', async () => {
      const b = app.state.builder;
      const id = 'custom-' + (b.name || 'vibe').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30);
      const list = await window.cat.saveVibe({ id, name: b.name || 'My Vibe', base: b.base, author: '', vars: builderVars(b) });
      if (Array.isArray(list)) app.state.vibes = list;
      app.state.builder = null;
      await app.saveSettings({ vibe: id });
      app.toast('VIBE SAVED');
      app.render(true);
    });
    previewBuilder(app);
  }

  function bindPrivacy(app, el, s) {
    const pv = s.privacy || {};
    const reload = async () => { app.state.privacyInfo = await window.cat.privacyInfo(); app.render(true); };
    if (!app.state.privacyInfo) reload();
    const on = (sel, fn) => { const b = el.querySelector(sel); if (b) b.addEventListener('click', fn); };
    on('[data-pv-addroot]', async () => { const p = await window.cat.pickFolder('Search file names in which folder?'); if (p) { await app.saveSettings({ privacy: { ...pv, fileRoots: [...new Set([...(pv.fileRoots || []), p])] } }); await window.cat.reindexFiles(); reload(); } });
    el.querySelectorAll('[data-pv-rmroot]').forEach((b) => b.addEventListener('click', async () => { const r = [...(pv.fileRoots || [])]; r.splice(Number(b.dataset.pvRmroot), 1); await app.saveSettings({ privacy: { ...pv, fileRoots: r } }); await window.cat.reindexFiles(); reload(); }));
    on('[data-pv-reindex]', async (e) => { e.target.disabled = true; e.target.textContent = 'INDEXING…'; const r = await window.cat.reindexFiles(); app.toast((r && r.entries ? r.entries.toLocaleString() : 0) + ' NAMES INDEXED'); reload(); });
    on('[data-pv-export]', async () => { const r = await window.cat.exportData(); if (r && r.folder) app.toast('EXPORTED ' + r.files + ' FILES'); else if (r && r.error) app.toast(r.error.toUpperCase()); });
    on('[data-pv-open]', () => window.cat.launchPath(app.state.privacyInfo ? app.state.privacyInfo.dataDir : ''));
    el.querySelectorAll('[data-pv-clear]').forEach((b) => b.addEventListener('click', async () => {
      const k = b.dataset.pvClear;
      if (k === 'searches') Commands.forget();
      else await window.cat.clearData(k);
      if (k === 'clipboard') app.state.clips = [];
      app.toast('CLEARED'); reload();
    }));
    on('[data-pv-wipe]', () => app.confirmWipe());
  }

  function settingsView(app) {
    const s = app.state.settings;
    // Library lives inside Customize now (one place for "what's in my sidebar and what Catalyst found").
    if (app.state.settingsTab === 'library') app.state.settingsTab = 'customize';
    const tab = app.state.settingsTab || 'vibe';
    const tabs = [['vibe', 'VIBE'], ['customize', 'CUSTOMIZE'], ['general', 'GENERAL'], ['tools', 'TOOLS'], ['connect', 'CONNECT'], ['privacy', 'PRIVACY'], ['pro', app.isPro() ? 'PRO ✓' : 'GET PRO'], ['about', 'ABOUT']];
    const tog = (key, on, label, sub) => `<div class="opt"><span class="lab">${label}${sub ? `<small>${sub}</small>` : ''}</span><span class="ctl"><button type="button" class="toggle ${on ? 'on' : ''}" data-toggle="${key}">${on ? 'ON' : 'OFF'}</button></span></div>`;
    const choice = (key, cur, opts, label, sub) => `<div class="opt"><span class="lab">${label}${sub ? `<small>${sub}</small>` : ''}</span><span class="ctl"><span class="seg">${opts.map((o) => `<button type="button" class="${cur === o ? 'on' : ''}" data-choice="${key}" data-val="${o}">${o.toUpperCase()}</button>`).join('')}</span></span></div>`;
    const folder = (key, cur, label, sub) => `<div class="opt"><span class="lab">${label}${sub ? `<small>${sub}</small>` : ''}</span><span class="ctl"><span class="path" title="${esc(cur)}">${esc(cur || 'not set')}</span><button type="button" class="btn small ghost" data-folder="${key}">CHOOSE</button></span></div>`;
    let body = '';
    if (tab === 'vibe') {
      const custom = app.state.vibes;
      const effVibe = app.isPro() || app.FREE_VIBES.includes(s.vibe) ? s.vibe : 'studio';
      const curAccent = app.accentFor(s.vibe) || getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
      const b = app.state.builder;
      body = `<div class="split"><div class="grow">
          ${b ? `<div>${rowLabel('VIBE BUILDER', 'CHANGES PREVIEW LIVE')}
            <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px 32px">
              <label class="field"><span>NAME</span><input class="input" data-b="name" value="${esc(b.name)}" maxlength="30"></label>
              <label class="field"><span>START FROM</span><select class="input" data-b="base">${app.BUILTIN_VIBES.map((x) => `<option value="${x}" ${b.base === x ? 'selected' : ''}>${x.toUpperCase()}</option>`).join('')}</select></label>
              ${[['bg', 'BACKGROUND'], ['bg3', 'TILES'], ['fg', 'TEXT'], ['accent', 'ACCENT']].map(([k, l]) => `<label class="opt"><span class="lab">${l}</span><span class="ctl"><input type="color" data-b="${k}" value="${esc(b[k])}" aria-label="${l} color" style="width:56px;height:36px;border:1px solid var(--line-2);background:transparent;padding:2px"></span></label>`).join('')}
              <label class="field"><span>TITLE FONT</span><select class="input" data-b="display">${BUILDER_FONTS.map((f) => `<option ${b.display === f ? 'selected' : ''}>${f}</option>`).join('')}</select></label>
              <label class="field"><span>TEXT FONT</span><select class="input" data-b="mono">${BUILDER_FONTS.map((f) => `<option ${b.mono === f ? 'selected' : ''}>${f}</option>`).join('')}</select></label>
              <label class="opt"><span class="lab">Corner roundness<small>${b.radius}px</small></span><span class="ctl"><input type="range" min="0" max="28" step="2" value="${b.radius}" data-b="radius" aria-label="Corner roundness"></span></label>
            </div>
            <div class="btns" style="margin-top:14px"><button type="button" class="btn ghost" data-b-cancel>CANCEL</button><button type="button" class="btn accent" data-b-save>SAVE + USE</button></div></div>` : ''}
          ${rowLabel('PICK A VIBE', 'SAME CATALYST, NEW PERSONALITY', '<button type="button" class="act" data-import-vibe>IMPORT .VIBE.JSON</button>')}
          <div class="vibes">${[...VIBE_CARDS.filter((v) => !v.soon), ...custom.map((v) => ({ id: v.id, name: v.name.toUpperCase(), sample: 'CATALYST', bg: v.vars['--bg'] || '#111', fg: v.vars['--fg'] || '#eee', font: v.vars['--display'] || 'var(--display)', tag: 'YOURS', custom: true }))].map((v, i) => `<button type="button" class="vibe ${effVibe === v.id ? 'on' : ''} ${v.soon ? 'soon' : ''}" ${v.soon ? 'aria-disabled="true"' : `data-vibe="${esc(v.id)}"`} style="animation-delay:${i * 0.05}s"><span class="sw" style="background:${v.bg};color:${v.fg};font-family:${esc(v.font)}">${esc(v.sample)}</span><span class="nm"><span>${esc(v.name)}</span><small>${effVibe === v.id ? 'ACTIVE' : v.soon ? 'SOON' : !v.soon && !app.isPro() && !app.FREE_VIBES.includes(v.id) ? '<span class="pro-tag" style="margin:0">PRO</span>' : esc(v.tag || '')}</small></span></button>`).join('')}</div>
          <div style="margin-top:26px">${V5.wallpaperSettings(app)}</div>
        </div><aside style="width:340px">
          <div>${rowLabel('ACCENT', 'FOR THIS VIBE')}<div class="swatches">${SWATCHES.map(([n, c]) => `<button type="button" class="swatch ${curAccent.toLowerCase() === c ? 'on' : ''}" style="background:${c}" data-accent="${c}" aria-label="${n} accent"></button>`).join('')}<label class="custom-color" title="Custom color">+<input type="color" value="${esc(/^#[0-9a-f]{6}$/i.test(curAccent) ? curAccent : '#ff5a1f')}" data-accent-custom aria-label="Custom accent color"></label></div>
            <div class="btns" style="margin-top:10px"><button type="button" class="btn small ghost" data-accent-reset>VIBE DEFAULT</button></div></div>
          <div>${choice('grain', s.grain, ['off', 'low', 'medium', 'high'], 'Film grain')}${choice('animSpeed', s.animSpeed, ['off', 'slow', 'normal', 'fast'], 'Animations')}${tog('beatSync', s.beatSync, 'Beat sync', 'Off by default. Pulses to music from Spotify, Apple Music and other music apps, never videos')}${tog('startupAnimation', s.startupAnimation, 'Startup animation')}${tog('uiSounds', !!s.uiSounds, 'UI sounds', 'Soft clicks and chimes when you open things, flip switches and finish something big. Off by default.')}</div>
          <div class="btns">${b ? '' : `<button type="button" class="btn small accent" data-b-open>BUILD YOUR OWN${app.proTag()}</button>`}<button type="button" class="btn small ghost" data-export-vibe>EXPORT</button>${custom.some((v) => v.id === s.vibe) ? '<button type="button" class="btn small ghost danger" data-del-vibe>DELETE</button>' : ''}</div>
        </aside></div>`;
    } else if (tab === 'customize') {
      const hidden = app.state.items.filter((i) => i.hidden);
      const c = app.state.counts || {};
      body = V6.customizeTab(app) + `<div class="split" style="margin-top:32px"><div class="grow">
          ${rowLabel('APPS CATALYST FOUND', app.state.scannedAt ? 'LAST SCAN ' + esc(ago(app.state.scannedAt).toUpperCase()) : '', '<button type="button" class="act" data-rescan>SCAN AGAIN</button>')}
          <div class="note">${Object.entries(c).map(([k, v]) => `<b>${esc(k.replace(/([A-Z])/g, ' $1').toUpperCase())}</b> ${v}`).join(' &nbsp; ') || 'Not scanned yet.'}</div>
          ${tog('showEmpty', !!s.showEmpty, 'Show empty sections', 'Keep Games, Studio, Content and Dev in the sidebar even when nothing is in them')}
        </div><aside style="width:360px">
          ${rowLabel('HIDDEN ITEMS', String(hidden.length))}
          <div class="list">${hidden.sort((a, b) => a.name.localeCompare(b.name)).map((it) => `<div class="list-row"><span class="nm">${esc(it.name)}</span><button type="button" class="btn small ghost" data-unhide="${esc(it.id)}">SHOW</button></div>`).join('') || empty('Nothing hidden. Right-click a tile and choose Hide to tuck it away.')}</div>
        </aside></div>`;
    } else if (tab === 'general') {
      body = `<div style="max-width:780px">
        <div class="opt"><span class="lab">Open Catalyst hotkey<small>Works from anywhere</small></span><span class="ctl"><button type="button" class="hotkey-input" id="main-hotkey">${esc((s.hotkey || 'Control+Space').toUpperCase())}</button></span></div>
        <div class="opt"><span class="lab">Interface size<small>Bigger text and tiles for large or high-res screens</small></span><span class="ctl"><span class="seg">${[[0.9, '90%'], [1, '100%'], [1.1, '110%'], [1.25, '125%']].map(([v, l]) => `<button type="button" class="${Number(s.uiScale || 1) === v ? 'on' : ''}" data-scale="${v}">${l}</button>`).join('')}</span></span></div>
        <div class="opt"><span class="lab">Mini mode hotkey<small>A slim floating search bar</small></span><span class="ctl"><button type="button" class="hotkey-input" id="mini-hotkey">${esc((s.miniHotkey || 'none').toUpperCase())}</button><button type="button" class="btn small ghost" data-mini>OPEN</button></span></div>
        ${tog('launchAtLogin', s.launchAtLogin, 'Launch with Windows', 'Starts hidden in the tray')}
        ${tog('openFullscreen', s.openFullscreen, 'Open full screen', 'Console-style home screen. Toggle any time with F11')}
        ${tog('closeToTray', s.closeToTray, 'Close to tray', 'Keeps tracking time when the window is closed')}
        ${tog('hideOnLaunch', s.hideOnLaunch, 'Hide after launching something', 'Off keeps Catalyst open. On tucks it into the tray (bottom-right, by the clock)')}
        ${rowLabel('GAME MODE')}
        ${tog('gm-overlay', s.gameMode.overlay, 'Stats overlay', 'Small always-on-top CPU / GPU / RAM box')}
        <div class="opt"><span class="lab">Close these apps<small>${s.gameMode.closeList.length ? esc(s.gameMode.closeList.join(', ')) : 'Nothing yet'}</small></span><span class="ctl"><button type="button" class="btn small ghost" data-gm-list>EDIT</button></span></div>
        ${rowLabel('FIRST RUN')}
        <div class="opt"><span class="lab">Setup<small>Pick what this PC is for, your look and starter workspaces again. Nothing gets deleted.</small></span><span class="ctl"><button type="button" class="btn small ghost" data-rerun-setup>RUN AGAIN</button></span></div>
        <div class="opt"><span class="lab">Welcome tour<small>Three quick tips that point at the real thing</small></span><span class="ctl"><button type="button" class="btn small ghost" data-tour>REPLAY</button></span></div>
      </div>`;
    } else if (tab === 'tools') {
      const r = s.dropRules;
      body = `<div style="max-width:880px">
        ${rowLabel('DROP ZONE', 'WHERE DROPPED FILES GET COPIED')}
        ${folder('drop.audio', r.audio, 'Audio', '.wav .mp3 .flac .aiff …')}
        ${folder('drop.project', r.project, 'Projects', '.flp .als .rpp .mid …')}
        ${folder('drop.image', r.image, 'Images')}
        ${folder('drop.video', r.video, 'Videos')}
        ${folder('drop.document', r.document, 'Documents')}
        ${folder('drop.code', r.code, 'Code + Roblox files', '.lua .luau .rbxl .rbxm …')}
        ${rowLabel('STUDIO')}
        ${folder('bouncesDir', s.bouncesDir, 'Bounces folder', 'Shows your latest exports in Studio')}
        ${rowLabel('NOTES')}
        ${folder('notesVault', s.notesVault, 'Obsidian vault', 'Quick notes go to Catalyst/Inbox.md in this vault')}
      </div>`;
    } else if (tab === 'connect') {
      body = `<div style="max-width:880px">
        ${rowLabel('DISCORD STATUS', '', app.proTag())}
        ${tog('discord-enabled', s.discord.enabled, 'Show what I’m doing on Discord', 'Discord desktop app must be open')}
        <div class="opt"><span class="lab">Application ID<small>Create an app at discord.com/developers, name it "Catalyst", paste its ID</small></span><span class="ctl"><input class="input" data-text="discord.clientId" value="${esc(s.discord.clientId)}" placeholder="123456789012345678" aria-label="Discord application ID"></span></div>
        ${rowLabel('STEAM FRIENDS')}
        <div class="opt"><span class="lab">Steam Web API key<small>steamcommunity.com/dev/apikey</small></span><span class="ctl"><input class="input" type="password" data-text="steamApi.key" value="${esc(s.steamApi.key)}" aria-label="Steam Web API key"></span></div>
        <div class="opt"><span class="lab">Your SteamID64<small>17 digits, from your profile URL or steamid.io</small></span><span class="ctl"><input class="input" data-text="steamApi.steamid" value="${esc(s.steamApi.steamid)}" aria-label="SteamID64"></span></div>
        ${rowLabel('HOME WIDGETS')}
        ${tog('w-weather', (s.widgets || {}).weather, 'Weather', 'From Open-Meteo, only your city name is sent')}
        <div class="opt"><span class="lab">City<small>e.g. Atlanta</small></span><span class="ctl"><input class="input" data-text="widgets.city" value="${esc((s.widgets || {}).city || '')}" aria-label="Weather city"><span class="seg">${['f', 'c'].map((u) => `<button type="button" class="${((s.widgets || {}).units || 'f') === u ? 'on' : ''}" data-units="${u}">°${u.toUpperCase()}</button>`).join('')}</span></span></div>
        <div class="opt"><span class="lab">Roblox games<small>Place IDs (from the game's URL), comma separated. Shows live player counts.</small></span><span class="ctl"><input class="input" data-text="widgets.roblox" value="${esc((s.widgets || {}).roblox || '')}" placeholder="1234567890" aria-label="Roblox place IDs"></span></div>
        ${rowLabel('SYNC BETWEEN PCS', '', app.proTag())}
        ${folder('syncDir', s.syncDir, 'Sync folder', 'Pick a folder in OneDrive, Dropbox or Google Drive. Pins, workspaces, sections and your look follow you. Stats stay on each PC.')}
        <div class="opt"><span class="lab">Last sync<small id="sync-info">${app.state.syncInfo && app.state.syncInfo.remote ? 'From ' + esc(app.state.syncInfo.remote.device) + ' · ' + esc(ago(app.state.syncInfo.remote.at)) : s.syncDir ? 'Waiting for first sync' : 'Off'}</small></span><span class="ctl">${s.syncDir ? '<button type="button" class="btn small ghost" data-sync-now>SYNC NOW</button><button type="button" class="btn small ghost" data-sync-off>TURN OFF</button>' : ''}</span></div>
        ${rowLabel('PHONE')}
        <div class="opt"><span class="lab">Catalyst on your phone<small>Pairing, Drop, Deck, alerts and controls live in the Phone section.</small></span><span class="ctl"><button type="button" class="btn small ghost" data-go="phone">OPEN PHONE</button></span></div>
        ${rowLabel('CREATOR STATS', 'ON YOUR HOME SCREEN', app.proTag())}
        <div class="note">Paste your public profile links. Catalyst checks them a few times a day and shows the numbers on Home (move or hide them in Edit Home).</div>
        ${[['spotify', 'Spotify artist', 'https://open.spotify.com/artist/…'], ['youtube', 'YouTube channel', 'https://youtube.com/@yourname'], ['tiktok', 'TikTok', '@yourname'], ['soundcloud', 'SoundCloud', 'https://soundcloud.com/yourname']].map(([k, l, ph]) => `<div class="opt"><span class="lab">${l}</span><span class="ctl"><input class="input" data-creator="${k}" value="${esc(((s.widgets || {}).creator || {})[k] || '')}" placeholder="${ph}" style="width:320px" aria-label="${l}"></span></div>`).join('')}
      </div>`;
    } else if (tab === 'pro') {
      const l = app.state.license || {};
      body = l.pro ? `<div style="max-width:780px"><div class="pro-lock" style="text-align:left;align-items:flex-start;margin:0"><div class="pro-badge">PRO</div><h2>You have Catalyst Pro.</h2>
          <p>Licensed to <b>${esc(l.email || '')}</b> · key ${esc(l.masked || '')}${l.pending ? ' · will finish activating next time you’re online' : ''}</p>
          <p>Thanks for supporting Catalyst. Updates are free.</p>
          <div class="btns"><button type="button" class="btn ghost" data-lic-remove>REMOVE KEY FROM THIS PC</button></div>
          <div class="note">Removing frees up one of your 3 PCs so you can use the key somewhere else.</div></div></div>`
        : `<div style="max-width:780px"><div class="pro-lock" style="text-align:left;align-items:flex-start;margin:0"><div class="pro-badge">PRO</div><h2>Unlock everything.</h2>
          <p>$19.99 once. Use it on up to 3 PCs. Updates are free.</p>
          ${app.proPitchHtml('')}
          <div class="btns"><button type="button" class="btn accent" data-lic-buy>GET PRO</button><button type="button" class="btn ghost" data-lic-key>ENTER KEY</button></div></div></div>`;
    } else if (tab === 'privacy') {
      const pv = s.privacy || {};
      const info = app.state.privacyInfo;
      const w = s.widgets || {};
      const online = [
        ['Site icons', app.state.items.some((i) => (i.kind === 'site' || i.kind === 'url') && !i.hidden), 'Asks each site you saved for its own icon, nothing else'],
        ['Weather', w.weather && w.city, 'Sends only your city name to Open-Meteo'],
        ['Roblox player counts', !!w.roblox, 'Sends the place IDs you entered to Roblox'],
        ['Steam friends', !!(s.steamApi.key && s.steamApi.steamid), 'Uses your own Steam API key'],
        ['Discord status', s.discord.enabled, 'Talks to the Discord app on this PC only'],
        ['Phone remote', s.remote.enabled, 'Only reachable on your home Wi-Fi, PIN protected'],
        ['Sync between PCs', !!s.syncDir, 'Writes to your own synced folder, no Catalyst servers'],
        ['School calendar', !!(s.school || {}).ics, 'Downloads the calendar link you pasted, nothing is sent'],
        ['Update checks', true, 'Asks GitHub if a new version is out']
      ];
      const kb = (n) => (n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');
      body = `<div class="split"><div class="grow" style="max-width:780px">
        <div class="note">Catalyst has no account and no servers. Everything below stays on this PC unless you turn on a feature that goes online.</div>
        ${rowLabel('WHAT CATALYST KEEPS')}
        ${tog('pv-tracking', pv.tracking !== false, 'Time tracking', 'Powers Stats and suggestions. Off records nothing new')}
        ${tog('pv-clipboard', pv.clipboard !== false, 'Clipboard history', 'Last 50 copies, in memory only')}
        ${tog('pv-fileSearch', pv.fileSearch !== false, 'File search', 'Names only, never what’s inside')}
        ${pv.fileSearch !== false ? `<div class="opt"><span class="lab">Searched folders<small>${info ? esc(info.roots.join('  ·  ')) : 'Loading…'}</small>${info && info.index.builtAt ? `<small>${info.index.entries.toLocaleString()} names indexed ${esc(ago(info.index.builtAt))}</small>` : ''}</span>
          <span class="ctl"><button type="button" class="btn small ghost" data-pv-addroot>ADD FOLDER</button><button type="button" class="btn small ghost" data-pv-reindex>REBUILD</button></span></div>
          ${(pv.fileRoots || []).map((r, i) => `<div class="opt"><span class="lab"><small>${esc(r)}</small></span><span class="ctl"><button type="button" class="btn small ghost" data-pv-rmroot="${i}">REMOVE</button></span></div>`).join('')}` : ''}
        ${rowLabel('GOES ONLINE ONLY FOR')}
        ${online.map(([n, on, why]) => `<div class="opt"><span class="lab">${n}<small>${why}</small></span><span class="ctl"><span class="state ${on ? 'on' : ''}">${on ? 'ON' : 'OFF'}</span></span></div>`).join('')}
      </div><aside style="width:380px">
        ${rowLabel('YOUR DATA', info ? kb(info.files.reduce((a, f) => a + f.bytes, 0)) : '')}
        <div class="list">${info ? info.files.map((f) => `<div class="list-row" style="cursor:default"><span class="nm">${esc(f.label)}</span><span class="tm">${kb(f.bytes)}</span></div>`).join('') : ''}</div>
        <div class="btns" style="margin-top:12px"><button type="button" class="btn small solid" data-pv-export>EXPORT A COPY</button><button type="button" class="btn small ghost" data-pv-open>OPEN FOLDER</button></div>
        ${rowLabel('CLEAR')}
        <div class="pv-clear">${[['stats', 'Stats + launch history'], ['clipboard', 'Clipboard history'], ['files', 'File move history'], ['flowlog', 'Flow run log'], ['searches', 'Recent searches']].map(([k, l]) => `<button type="button" class="btn small ghost" data-pv-clear="${k}">${l}</button>`).join('')}</div>
        <div class="btns" style="margin-top:18px"><button type="button" class="btn small ghost danger" data-pv-wipe>DELETE EVERYTHING</button></div>
      </aside></div>`;
    } else {
      const u = app.state.update || {};
      const st = { idle: 'Up to date', current: 'You have the latest version', checking: 'Checking…', available: 'Version ' + esc(u.latest) + ' is ready to download', downloading: 'Downloading… ' + (u.progress || 0) + '%', ready: 'Downloaded. Restart to finish updating.', error: esc(u.error || 'Something went wrong') }[u.status] || '';
      body = `<div style="max-width:780px">
        <div class="note"><div class="big-num" style="color:var(--fg)">CATALYST<span style="color:var(--accent)">.</span></div>
        <p>Version <b>${esc(app.state.version)}</b> · ${esc(app.state.platform === 'darwin' ? 'macOS' : 'Windows')} · made by <b>Saltwater Sounds</b></p>
        <p>Everything Catalyst tracks stays on this computer. Data folder: <b>%APPDATA%\\Catalyst\\data</b></p></div>
        ${rowLabel('UPDATES', esc(u.repo || ''))}
        <div class="opt"><span class="lab">${st}${u.status === 'available' && u.notes ? `<small style="white-space:pre-line;max-width:520px">${esc(u.notes.slice(0, 400))}</small>` : ''}</span>
          <span class="ctl">${u.status === 'available' || u.status === 'ready' ? `<button type="button" class="btn small accent" data-upd-act>${u.status === 'ready' ? 'RESTART + UPDATE' : 'DOWNLOAD'}</button>` : ''}<button type="button" class="btn small ghost" data-upd-check>CHECK NOW</button></span></div>
        ${u.hasToken ? `<div class="opt"><span class="lab">GitHub token<small>${u.hasToken ? 'Saved, encrypted on this PC.' : 'Not needed anymore: updates come from the public downloads page.'}</small></span>
          <span class="ctl"><input class="input" type="password" id="upd-token" placeholder="${u.hasToken ? '•••••••• (saved)' : 'github_pat_…'}" aria-label="GitHub token"><button type="button" class="btn small solid" data-upd-token>SAVE</button>${u.hasToken ? '<button type="button" class="btn small ghost" data-upd-clear>REMOVE</button>' : ''}</span></div>` : ''}
      </div>`;
    }
    return {
      title: tab === 'vibe' ? 'VIBES' : 'SETTINGS',
      html: `<div class="stack"><div class="set-bar"><div class="tabs" role="tablist">${tabs.map(([k, l]) => `<button type="button" role="tab" class="${tab === k ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('')}</div>
        <div class="set-search"><label class="sr" for="set-q">Search settings</label><input class="input" id="set-q" placeholder="find a setting" autocomplete="off" spellcheck="false"><div class="set-res" hidden></div></div></div>${body}</div>`,
      mount(el) {
        el.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { app.state.settingsTab = b.dataset.tab; app.render(true); }));
        const sq = el.querySelector('#set-q'); const sr = el.querySelector('.set-res');
        const names = { vibe: 'VIBE', customize: 'CUSTOMIZE', general: 'GENERAL', tools: 'TOOLS', connect: 'CONNECT', privacy: 'PRIVACY', about: 'ABOUT' };
        const find = () => {
          const q = sq.value.trim().toLowerCase();
          if (!q) { sr.hidden = true; sr.innerHTML = ''; return; }
          const hits = Commands.SETTINGS.map(([label, t, kw]) => ({ label, t, sc: Math.max(U.score(q, label), (label + ' ' + kw).toLowerCase().includes(q) || q.split(/\s+/).every((w) => (label + ' ' + kw).toLowerCase().includes(w)) ? 100 : -1) }))
            .filter((h) => h.sc >= 0).sort((a, b) => b.sc - a.sc).slice(0, 8);
          sr.innerHTML = hits.length ? hits.map((h, i) => `<button type="button" class="${i ? '' : 'on'}" data-sres="${i}"><span>${esc(h.label)}</span><small>${names[h.t] || esc(h.t.toUpperCase())}</small></button>`).join('') : '<div class="none">No setting called that. Try other words.</div>';
          sr.hidden = false;
          sr.querySelectorAll('[data-sres]').forEach((b) => b.addEventListener('mousedown', (e) => { e.preventDefault(); const h = hits[Number(b.dataset.sres)]; app.openSetting(h.t, h.label); }));
          sq._hits = hits;
        };
        sq.addEventListener('input', find);
        sq.addEventListener('keydown', (e) => { if (e.key === 'Enter' && sq._hits && sq._hits[0]) app.openSetting(sq._hits[0].t, sq._hits[0].label); if (e.key === 'Escape') { sq.value = ''; find(); } });
        sq.addEventListener('blur', () => setTimeout(() => { sr.hidden = true; }, 150));
        el.querySelectorAll('[data-toggle]').forEach((b) => b.addEventListener('click', async () => {
          const k = b.dataset.toggle;
          if (k === 'uiSounds' && !s.uiSounds) setTimeout(() => app.sfx('success'), 120); // a little hello when you turn sounds on
          if (k === 'gm-overlay') await app.saveSettings({ gameMode: { overlay: !s.gameMode.overlay } });
          else if (k === 'discord-enabled' && !s.discord.enabled && !app.pro('discord')) return;
          else if (k === 'remote-enabled' && !s.remote.enabled && !app.pro('remote')) return;
          else if (k === 'discord-enabled') await app.saveSettings({ discord: { enabled: !s.discord.enabled } });
          else if (k === 'remote-enabled') { await app.saveSettings({ remote: { enabled: !s.remote.enabled } }); }
          else if (k.startsWith('pv-')) { const key = k.slice(3); await app.saveSettings({ privacy: { ...(s.privacy || {}), [key]: (s.privacy || {})[key] === false } }); app.state.privacyInfo = null; }
          else if (k === 'w-weather') { await app.saveSettings({ widgets: { ...(s.widgets || {}), weather: !(s.widgets || {}).weather } }); app.refreshWidgets(); }
          else await app.saveSettings({ [k]: !s[k] });
          app.render(true);
        }));
        if (tab === 'privacy') bindPrivacy(app, el, s);
        const lb = el.querySelector('[data-lic-buy]'); if (lb) lb.addEventListener('click', () => app.proDialog());
        const lk = el.querySelector('[data-lic-key]'); if (lk) lk.addEventListener('click', () => app.proDialog(null, true));
        const lr = el.querySelector('[data-lic-remove]'); if (lr) lr.addEventListener('click', async () => { await window.cat.removeLicense(); app.state.license = { ...app.state.license, pro: false }; app.toast('KEY REMOVED FROM THIS PC'); app.render(true); });
        el.querySelectorAll('[data-choice]').forEach((b) => b.addEventListener('click', async () => { await app.saveSettings({ [b.dataset.choice]: b.dataset.val }); app.render(true); }));
        const setAccent = async (c) => {
          const patch = { vibeAccents: { ...(s.vibeAccents || {}), [s.vibe]: c } };
          if (s.vibe === 'studio' && c) patch.accent = c;
          await app.saveSettings(patch); app.render(true);
        };
        el.querySelectorAll('[data-accent]').forEach((b) => b.addEventListener('click', () => setAccent(b.dataset.accent)));
        const cc = el.querySelector('[data-accent-custom]');
        if (cc) cc.addEventListener('change', () => setAccent(cc.value));
        const ar = el.querySelector('[data-accent-reset]');
        if (ar) ar.addEventListener('click', async () => { const m = { ...(s.vibeAccents || {}), [s.vibe]: '' }; await app.saveSettings({ vibeAccents: m, ...(s.vibe === 'studio' ? { accent: '#ff5a1f' } : {}) }); app.render(true); });
        bindBuilder(app, el);
        if (tab === 'vibe') V5.bindWallpaper(app, el);
        if (tab === 'customize') V6.bindCustomize(app, el);
        el.querySelectorAll('[data-vibe]').forEach((b) => b.addEventListener('click', async () => { if (!app.FREE_VIBES.includes(b.dataset.vibe) && !app.pro('vibes')) return; await app.saveSettings({ vibe: b.dataset.vibe }); app.render(true); }));
        const iv = el.querySelector('[data-import-vibe]');
        if (iv) iv.addEventListener('click', async () => { if (!app.pro('vibes')) return; const r = await window.cat.importVibe(); if (Array.isArray(r)) { app.state.vibes = r; app.render(true); } else if (r && r.error) app.toast(r.error.toUpperCase()); });
        const ev = el.querySelector('[data-export-vibe]');
        if (ev) ev.addEventListener('click', () => window.cat.exportVibe(app.currentVibeFile()));
        const dv = el.querySelector('[data-del-vibe]');
        if (dv) dv.addEventListener('click', () => app.confirm('Delete this Vibe?', async () => { app.state.vibes = await window.cat.deleteVibe(s.vibe); await app.saveSettings({ vibe: 'studio' }); }));
        const mh = el.querySelector('#main-hotkey');
        if (mh) app.hotkeyRecorder(mh, async (combo) => { if (combo) { await app.saveSettings({ hotkey: combo }); app.render(true); } });
        const gm = el.querySelector('[data-gm-list]');
        if (gm) gm.addEventListener('click', () => app.processListDialog('Game Mode closes', s.gameMode.closeList, async (list) => { await app.saveSettings({ gameMode: { closeList: list } }); app.render(true); }));
        const tr = el.querySelector('[data-tour]');
        if (tr) tr.addEventListener('click', () => app.startTour());
        const rs2 = el.querySelector('[data-rerun-setup]');
        if (rs2) rs2.addEventListener('click', () => app.setupWizard());
        el.querySelectorAll('[data-folder]').forEach((b) => b.addEventListener('click', async () => {
          if (b.dataset.folder === 'syncDir' && !app.pro('sync')) return;
          const p = await window.cat.pickFolder('Choose a folder');
          if (!p) return;
          const k = b.dataset.folder;
          if (k.startsWith('drop.')) await app.saveSettings({ dropRules: { [k.slice(5)]: p } });
          else await app.saveSettings({ [k]: p });
          app.render(true);
        }));
        el.querySelectorAll('[data-units]').forEach((b) => b.addEventListener('click', async () => { await app.saveSettings({ widgets: { ...(s.widgets || {}), units: b.dataset.units } }); app.refreshWidgets(); app.render(true); }));
        el.querySelectorAll('[data-scale]').forEach((b) => b.addEventListener('click', async () => { await app.saveSettings({ uiScale: Number(b.dataset.scale) }); app.render(true); }));
        const mh2 = el.querySelector('#mini-hotkey');
        if (mh2) app.hotkeyRecorder(mh2, async (combo) => { await app.saveSettings({ miniHotkey: combo }); app.render(true); });
        const mo = el.querySelector('[data-mini]');
        if (mo) mo.addEventListener('click', () => window.cat.toggleMini());
        const sn = el.querySelector('[data-sync-now]');
        if (sn) sn.addEventListener('click', async () => { app.state.syncInfo = await window.cat.syncNow(); app.toast('SYNCED'); app.render(true); });
        const so = el.querySelector('[data-sync-off]');
        if (so) so.addEventListener('click', async () => { await app.saveSettings({ syncDir: '' }); app.render(true); });
        el.querySelectorAll('[data-text]').forEach((inp) => inp.addEventListener('change', async () => {
          const [a, b2] = inp.dataset.text.split('.');
          await app.saveSettings({ [a]: a === 'widgets' ? { ...(app.state.settings.widgets || {}), [b2]: inp.value.trim() } : { [b2]: inp.value.trim() } });
          if (a === 'widgets') app.refreshWidgets();
          if (a === 'steamApi') app.refreshFriends(true);
          app.toast('SAVED');
        }));
        el.querySelectorAll('[data-creator]').forEach((inp) => inp.addEventListener('change', async () => {
          if (inp.value.trim() && !app.pro('creator')) { inp.value = ''; return; }
          const cur = app.state.settings.widgets || {};
          const cr = { ...(cur.creator || {}), [inp.dataset.creator]: inp.value.trim() };
          await app.saveSettings({ widgets: { ...cur, creator: cr } });
          app.refreshWidgets(); app.toast('SAVED');
        }));
        const np = el.querySelector('[data-new-pin]');
        if (np) np.addEventListener('click', async () => { const r = await window.cat.newPin(); const fresh = await window.cat.init(); app.state.settings = fresh.settings; if (r && r.ok) app.state.remote = r; app.render(true); });
        const uc = el.querySelector('[data-upd-check]');
        if (uc) uc.addEventListener('click', async () => { app.state.update = { ...(app.state.update || {}), status: 'checking' }; app.render(true); app.state.update = await window.cat.checkUpdate(); app.render(true); });
        const ua = el.querySelector('[data-upd-act]');
        if (ua) ua.addEventListener('click', () => app.updateAction());
        const ut = el.querySelector('[data-upd-token]');
        if (ut) ut.addEventListener('click', async () => { const v = el.querySelector('#upd-token').value.trim(); if (!v) return; const r = await window.cat.setUpdateToken(v); if (r && r.error) app.toast(r.error.toUpperCase()); else { app.state.update = r; app.toast('TOKEN SAVED'); app.render(true); } });
        const ucl = el.querySelector('[data-upd-clear]');
        if (ucl) ucl.addEventListener('click', async () => { app.state.update = await window.cat.setUpdateToken(''); app.render(true); });
        const rs = el.querySelector('[data-rescan]');
        if (rs) rs.addEventListener('click', () => app.rescan());
        el.querySelectorAll('[data-unhide]').forEach((b) => b.addEventListener('click', () => window.cat.updateItem(b.dataset.unhide, { hidden: false })));
      }
    };
  }

  return { home, games, section, files, workspaces, flow: flowView, stats, settings: settingsView, iconHtml, wsProgressHtml, WS_TEMPLATES, resolveTemplate, VIBE_CARDS };
})();
