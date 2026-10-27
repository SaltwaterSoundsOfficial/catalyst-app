// Command bar: turns what you type into a ranked list of things to do.
// Each result: { label, tag, icon?, initials?, answer?, run: () => Promise|void }
const Commands = (() => {
  const SEARCHES = {
    g: ['GOOGLE', 'https://www.google.com/search?q='],
    google: ['GOOGLE', 'https://www.google.com/search?q='],
    yt: ['YOUTUBE', 'https://www.youtube.com/results?search_query='],
    youtube: ['YOUTUBE', 'https://www.youtube.com/results?search_query='],
    sc: ['SOUNDCLOUD', 'https://soundcloud.com/search?q='],
    gh: ['GITHUB', 'https://github.com/search?q='],
    roblox: ['ROBLOX', 'https://www.roblox.com/discover/?Keyword='],
    genius: ['GENIUS', 'https://genius.com/search?q=']
  };

  function itemMatches(app, q, limit = 8) {
    return app.visibleItems()
      .map((it) => [it, Math.max(U.score(q, it.name), U.score(q, it.original || '') - 50)])
      .filter(([, s]) => s >= 0)
      .sort((a, b) => b[1] - a[1] || ((b[0].lastLaunched || 0) - (a[0].lastLaunched || 0)))
      .slice(0, limit)
      .map(([it]) => it);
  }

  function itemResult(app, it) {
    return { group: 'APPS + GAMES', label: it.name, tag: U.kindLabel(it), icon: app.iconFor(it), initials: U.initials(it.name), run: () => app.launch(it.id) };
  }

  // Every setting, so you can type "beat sync" or "token" and land on it.
  const SETTINGS = [
    ['Vibes and themes', 'vibe', 'theme look color style'], ['Accent color', 'vibe', 'color orange'], ['Build your own Vibe', 'vibe', 'custom theme builder'],
    ['Film grain', 'vibe', 'noise'], ['Animations', 'vibe', 'speed motion'], ['Beat sync', 'vibe', 'pulse music audio'],
    ['Open Catalyst hotkey', 'general', 'shortcut keybind ctrl space'], ['Interface size', 'general', 'zoom scale text bigger'], ['Mini mode hotkey', 'general', 'shortcut'],
    ['Launch with Windows', 'general', 'startup boot login'], ['Open full screen', 'general', 'fullscreen console'], ['Close to tray', 'general', 'minimize background'],
    ['Hide after launching something', 'general', 'tray close'], ['Game Mode', 'general', 'overlay close apps'], ['Welcome tour', 'general', 'help intro'], ['Setup', 'general', 'first run wizard packs onboarding start over'],
    ['Apps Catalyst found', 'customize', 'auto-detect rescan scan steam epic library'], ['Show empty sections', 'customize', 'sidebar games studio'], ['Startup animation', 'vibe', 'intro boot logo'], ['UI sounds', 'vibe', 'sound click chime audio noise'], ['Stats overlay', 'general', 'fps cpu gpu game mode overlay'], ['Close these apps', 'general', 'game mode close background'], ['Pro license key', 'pro', 'unlock buy upgrade activate key'], ['Remove key from this PC', 'pro', 'license deactivate move pc'], ['Tabs', 'customize', 'sections reorder rename sidebar more hide'], ['Your packs', 'customize', 'gaming music streaming school video code design'], ['Now playing bar', 'customize', 'player music bar hide'], ['Hidden items', 'customize', 'unhide show'],
    ['Drop zone', 'tools', 'drag files folders'], ['Bounces folder', 'tools', 'studio exports'], ['Obsidian vault', 'tools', 'notes'],
    ['Discord status', 'connect', 'rich presence'], ['Steam friends', 'connect', 'api key'], ['Home widgets', 'connect', 'weather roblox city'],
    ['Sync between PCs', 'connect', 'onedrive dropbox google drive'], ['Creator stats', 'connect', 'spotify youtube tiktok soundcloud listeners subscribers followers'], ['Live wallpaper', 'vibe', 'desktop background widgets'],
    ['Time tracking', 'privacy', 'stats privacy pause'], ['Clipboard history', 'privacy', 'copy paste privacy'], ['File search', 'privacy', 'index folders privacy'],
    ['Export my data', 'privacy', 'backup download privacy'], ['Delete my data', 'privacy', 'clear reset wipe privacy'],
    ['Updates', 'about', 'version upgrade'], ['GitHub token', 'about', 'update private repo']
  ];

  const RECENT_KEY = 'cat.recentSearches';
  function recents() { try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]').slice(0, 6); } catch (e) { return []; } }
  function remember(q) {
    q = String(q || '').trim();
    if (q.length < 2) return;
    try { localStorage.setItem(RECENT_KEY, JSON.stringify([q, ...recents().filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 6))); } catch (e) {}
  }
  function forget() { try { localStorage.removeItem(RECENT_KEY); } catch (e) {} }

  const ORDER = ['ANSWER', 'ACTIONS', 'RECENT SEARCHES', 'APPS + GAMES', 'WORKSPACES', 'JUMP BACK IN', 'COMMANDS', 'FLOWS', 'SECTIONS', 'SETTINGS', 'FILES', 'WEB'];
  function grouped(out) {
    // stable sort by group, keeping the ranking inside each group
    return out.map((r, i) => [r, i]).sort((a, b) => (ORDER.indexOf(a[0].group) - ORDER.indexOf(b[0].group)) || a[1] - b[1]).map(([r]) => r);
  }

  function exeFor(it) {
    if (it.exe) return it.exe;
    return '';
  }

  async function build(app, raw) {
    const q = raw.trim();
    const lower = q.toLowerCase();
    const out = [];

    if (!q) {
      recents().forEach((r) => out.push({ group: 'RECENT SEARCHES', label: r, tag: 'SEARCH AGAIN', initials: '↺', fill: r }));
      app.state.workspaces.slice(0, 4).forEach((w) => out.push({ group: 'WORKSPACES', label: w.name, tag: 'WORKSPACE', initials: 'WS', run: () => app.launchWorkspace(w.id) }));
      let recent = app.visibleItems().filter((i) => i.lastLaunched).sort((a, b) => b.lastLaunched - a.lastLaunched).slice(0, 6);
      if (!recent.length) recent = app.visibleItems().slice(0, 8);
      recent.forEach((it) => out.push({ ...itemResult(app, it), group: 'JUMP BACK IN' }));
      return grouped(out);
    }

    // smart commands: "stream mode and mute discord", "study 45 minutes"
    const sm = typeof V6 !== 'undefined' ? V6.smart(app, q) : null;
    if (sm) out.push(sm);

    // math / conversion answers first
    const conv = U.convert(q);
    if (conv) out.push({ group: 'ANSWER', answer: true, label: conv.value + ' ' + conv.unit, tag: 'ENTER TO COPY', run: () => { window.cat.copy(String(conv.value)); app.toast('COPIED'); } });
    const val = U.calc(q.replace(/^=/, ''));
    if (val !== null) out.push({ group: 'ANSWER', answer: true, label: String(val), tag: 'ENTER TO COPY', run: () => { window.cat.copy(String(val)); app.toast('COPIED'); } });

    const m = lower.match(/^(\S+)\s+(.+)$/);
    const verb = m ? m[1] : lower;
    const rest = m ? q.slice(m[1].length).trim() : '';

    // close / quit / kill X
    if (['close', 'quit', 'kill', 'exit'].includes(verb) && rest) {
      const matches = itemMatches(app, rest, 4).filter(exeFor);
      matches.forEach((it) => out.push({ group: 'ACTIONS', label: 'Close ' + it.name, tag: 'ACTION', icon: app.iconFor(it), initials: 'X', run: async () => { const ok = await window.cat.closeProcess(exeFor(it)); app.toast(ok ? 'CLOSED ' + it.name.toUpperCase() : 'COULD NOT CLOSE ' + it.name.toUpperCase()); } }));
      const procs = (await window.cat.running()) || [];
      const r = rest.toLowerCase().replace(/\.exe$/, '');
      procs.filter((p) => p.replace(/\.exe$/, '').includes(r)).slice(0, 4).forEach((p) => {
        if (matches.some((it) => exeFor(it) === p)) return;
        out.push({ group: 'ACTIONS', label: 'Close ' + p, tag: 'PROCESS', initials: 'X', run: async () => { const ok = await window.cat.closeProcess(p); app.toast(ok ? 'CLOSED ' + p.toUpperCase() : 'COULD NOT CLOSE ' + p.toUpperCase()); } });
      });
    }

    // restart X
    if (verb === 'restart' && rest) {
      itemMatches(app, rest, 4).filter(exeFor).forEach((it) => out.push({ group: 'ACTIONS', label: 'Restart ' + it.name, tag: 'ACTION', icon: app.iconFor(it), initials: 'R', run: async () => { app.toast('RESTARTING ' + it.name.toUpperCase()); await window.cat.restartProcess(exeFor(it), it.id); } }));
    }

    // web searches
    if (SEARCHES[verb] && rest) {
      const [name, base] = SEARCHES[verb];
      out.push({ group: 'ACTIONS', label: 'Search ' + name.toLowerCase() + ' for "' + rest + '"', tag: name, initials: verb.slice(0, 2).toUpperCase(), run: () => window.cat.launchUrl(base + encodeURIComponent(rest)) });
    }

    // note
    if (verb === 'note' && rest) {
      out.push({ group: 'ACTIONS', label: 'Save note: ' + rest, tag: 'OBSIDIAN', initials: 'N', run: async () => { const r = await window.cat.note(rest, false); app.toast(r && r.error ? r.error.toUpperCase() : 'NOTE SAVED'); } });
    }

    // focus timer
    const fm = lower.match(/^focus\s*(\d+)?/);
    if (fm) {
      const mins = Math.min(240, Math.max(1, Number(fm[1] || 25)));
      out.push({ group: 'ACTIONS', label: 'Start a ' + mins + ' minute focus timer', tag: 'FOCUS', initials: 'F', run: () => app.startFocus(mins) });
    }

    // app commands
    const builtins = [
      ['game mode', 'Toggle Game Mode', () => app.toggleGameMode()],
      ['sort downloads', 'Sort my Downloads folder', async () => { const r = await window.cat.sortDownloads(); app.toast('SORTED ' + (r.moved || 0) + ' FILES'); }],
      ['rescan', 'Rescan apps and games', () => app.rescan()],
      ['my pc', 'Open My PC', () => app.go('mypc')],
      ['stats', 'See my time stats', () => app.go('stats')],
      ['stream', 'Open Stream', () => app.go('stream')],
      ['go live checklist', 'Go Live checklist', () => app.go('stream')],
      ['school', 'Open School', () => app.go('school')],
      ['homework', 'What\u2019s due', () => app.go('school')],
      ['customize', 'Customize my tabs', () => { app.state.settingsTab = 'customize'; app.go('settings'); }],
      ['packs', 'Pick my packs', () => V6.packsDialog(app)],
      ['tabs', 'Customize my tabs', () => { app.state.settingsTab = 'customize'; app.go('settings'); }],
      ['pc doctor', 'Open PC Doctor', () => app.go('doctor')],
      ['doctor', 'Open PC Doctor', () => app.go('doctor')],
      ['health', 'Check my PC health', () => app.go('doctor')],
      ['clean up', 'Clean up my PC', () => app.go('doctor')],
      ['phone', 'Open Catalyst on your phone', () => app.go('phone')],
      ['send to phone', 'Send files to my phone', () => { app.state.phoneTab = 'drop'; app.go('phone'); }],
      ['deck', 'Edit my phone Deck', () => { app.state.phoneTab = 'deck'; app.go('phone'); }],
      ['wallpaper', 'Live wallpaper + desktop widgets', () => { app.state.settingsTab = 'vibe'; app.go('settings'); }],
      ['scan', 'Rescan apps and games', () => app.rescan()],
      ['settings', 'Open Settings', () => app.go('settings')],
      ['full screen', 'Toggle full screen', () => window.cat.win('fullscreen')],
      ['fullscreen', 'Toggle full screen', () => window.cat.win('fullscreen')],
      ['tour', 'Replay the welcome tour', () => app.startTour()],
      ['mini', 'Open mini mode', () => window.cat.toggleMini()],
      ['sync', 'Sync with my other PCs now', async () => { await window.cat.syncNow(); app.toast('SYNCED'); }],
      ['update', 'Check for updates', async () => { const u = await window.cat.checkUpdate(); app.toast(u && u.status === 'available' ? 'UPDATE ' + u.latest + ' READY' : u && u.error ? u.error.toUpperCase() : 'UP TO DATE'); }]
    ];
    builtins.forEach(([cmd, label, run]) => { if (cmd.startsWith(lower) && lower.length >= 2) out.push({ group: 'COMMANDS', label, tag: 'COMMAND', initials: '>', run }); });

    // url / path
    if (/^(https?:\/\/)?[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(q) && !/\s/.test(q) && !/^\d+(\.\d+)*$/.test(q)) {
      const url = /^https?:/i.test(q) ? q : 'https://' + q;
      out.push({ group: 'ACTIONS', label: 'Open ' + url, tag: 'WEBSITE', initials: 'WW', run: () => window.cat.launchUrl(url) });
    }
    if (/^([a-z]:\\|\\\\|\/|~)/i.test(q)) out.push({ group: 'ACTIONS', label: 'Open ' + q, tag: 'PATH', initials: '/', run: () => window.cat.launchPath(q) });

    // sections
    app.navSections().filter((s) => U.score(lower, s.label) >= 300).slice(0, 2)
      .forEach((s) => out.push({ group: 'SECTIONS', label: 'Go to ' + s.label, tag: 'SECTION', initials: '#', run: () => app.go(s.id) }));
    if (U.score(lower, 'settings') >= 300 && !out.some((o) => o.label === 'Open Settings')) out.push({ group: 'SECTIONS', label: 'Open Settings', tag: 'SECTION', initials: '#', run: () => app.go('settings') });

    // settings
    if (lower.length >= 3) {
      SETTINGS.map(([label, tab, kw]) => [label, tab, Math.max(U.score(lower, label), kw.split(' ').some((k) => k.startsWith(lower) || lower.split(' ').every((w) => (label + ' ' + kw).toLowerCase().includes(w))) ? 150 : -1)])
        .filter(([, , sc]) => sc >= 150).sort((a, b) => b[2] - a[2]).slice(0, 3)
        .forEach(([label, tab]) => out.push({ group: 'SETTINGS', label, tag: tab.toUpperCase(), initials: '⚙', run: () => app.openSetting(tab, label) }));
    }

    // flows
    (app.state.flows || []).filter((f) => U.score(lower.replace(/^(run|flow)\s+/, ''), f.name) >= 0).slice(0, 3)
      .forEach((f) => out.push({ group: 'FLOWS', label: 'Run ' + f.name, tag: 'FLOW', initials: '⚡', run: async () => { const r = await window.cat.runFlow(f.id); app.toast(r && r.skipped ? r.skipped.toUpperCase() : 'FLOW RAN'); } }));

    // workspaces
    app.state.workspaces.filter((w) => U.score(lower.replace(/^(launch|start|ws)\s+/, ''), w.name) >= 0).slice(0, 3)
      .forEach((w) => out.push({ group: 'WORKSPACES', label: w.name, tag: 'WORKSPACE', initials: 'WS', run: () => app.launchWorkspace(w.id) }));

    // items (strip "open")
    const term = verb === 'open' && rest ? rest : q;
    itemMatches(app, term, 9).forEach((it) => out.push(itemResult(app, it)));

    // folders
    app.state.folders.filter((f) => U.score(term, f.name) >= 300).slice(0, 3)
      .forEach((f) => out.push({ group: 'FILES', label: f.name, tag: 'FOLDER', initials: '/', sub: f.path, run: () => window.cat.launchPath(f.path), reveal: f.path }));

    // files by name, inside your folders (wait briefly; the first search builds the index)
    let pending = null;
    if (term.length >= 2 && window.cat.searchFiles) {
      const req = window.cat.searchFiles(term);
      const files = await Promise.race([req, new Promise((r) => setTimeout(() => r(null), 20))]); // don't hold apps back; files fill in when ready
      if (files === null) pending = req;
      (Array.isArray(files) ? files : []).filter((f) => !out.some((o) => o.reveal === f.path)).forEach((f) => out.push({
        group: 'FILES', label: f.name, sub: f.dir, tag: f.isDir ? 'FOLDER' : (f.name.split('.').pop() || 'FILE').toUpperCase().slice(0, 6), initials: f.isDir ? '/' : (f.name.includes('.') ? f.name.split('.').pop().slice(0, 2).toUpperCase() : 'F'),
        run: () => window.cat.launchPath(f.path), reveal: f.path
      }));
    }

    // web search is always there as the last option
    out.push({ group: 'WEB', label: 'Search the web for "' + q + '"', tag: 'GOOGLE', initials: 'G', run: () => window.cat.launchUrl(SEARCHES.g[1] + encodeURIComponent(q)) });

    const res = grouped(out).slice(0, 24);
    res.pending = pending;
    return res;
  }

  return { build, remember, recents, forget, SETTINGS };
})();
