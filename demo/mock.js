// Catalyst web demo: the real Catalyst screens running on made-up data, with Pro switched on.
// Nothing here touches the visitor's PC. Actions that only work in the desktop app show a short note instead.
(() => {
  const q = new URLSearchParams(location.search);
  const now = Date.now();
  const ok = (v) => Promise.resolve(v);
  const say = (t) => (window.__h && window.__h.toast || []).forEach((f) => f({ text: t }));
  const mk = (id, name, section, extra = {}) => ({ id, name, section, kind: 'shortcut', launch: 'x', target: 'C:\\Apps\\' + id + '.exe', exe: id + '.exe', source: 'Start Menu', ...extra });
  const items = [
    mk('fl', 'FL Studio 2025', 'studio', { lastLaunched: now - 3 * 3600e3, pinned: true }), mk('ableton', 'Ableton Live 12', 'studio'), mk('audacity', 'Audacity', 'studio'), mk('ozone', 'iZotope Ozone 11', 'studio'),
    mk('vsc', 'Visual Studio Code', 'dev', { lastLaunched: now - 3600e3 }), mk('blender', 'Blender 4.2', 'dev'), mk('unity', 'Unity Hub', 'dev'), mk('resolve', 'DaVinci Resolve', 'content'), mk('capcut', 'CapCut', 'content'), mk('obs', 'OBS Studio', 'stream', { exe: 'obs64.exe' }),
    mk('discord', 'Discord', 'social', { lastLaunched: now - 600e3 }), mk('ig', 'Instagram', 'social', { kind: 'site', source: 'Default' }), mk('tt', 'TikTok', 'social', { kind: 'site', source: 'Default' }),
    mk('spotify', 'Spotify', 'apps', { lastLaunched: now - 300e3 }), mk('chrome', 'Google Chrome', 'apps'), mk('steam', 'Steam', 'games', { kind: 'shortcut' }), mk('notion', 'Notion', 'school'),
    mk('yt', 'YouTube', 'web', { kind: 'site', source: 'Default' }), mk('sc', 'SoundCloud', 'web', { kind: 'site', source: 'Default' }), mk('gmail', 'Gmail', 'web', { kind: 'site', source: 'Default' }),
    mk('g1', 'Neon Drift', 'games', { store: 'Epic', kind: 'url', art: 'art/neondrift.jpg', lastLaunched: now - 2 * 3600e3, favorite: true }),
    mk('g2', 'Hollow Signal', 'games', { store: 'Steam', kind: 'url', art: 'art/hollow.jpg', favorite: true }), mk('g3', 'Static Bloom', 'games', { store: 'Xbox', kind: 'uwp', art: 'art/bloom.jpg', lastLaunched: now - 86400e3 }),
    mk('g4', 'Salt & Iron', 'games', { store: 'Steam', kind: 'url', art: 'art/salt.jpg', favorite: true }), mk('g5', 'Deep Current', 'games', { store: 'Steam', kind: 'url', art: 'art/deep.jpg' }), mk('g6', 'Gravel Kings', 'games', { store: 'Epic', kind: 'url', art: 'art/gravel.jpg' }),
    mk('beats', 'Beats', 'files', { kind: 'folder', pinned: true }), mk('projects', 'Projects', 'files', { kind: 'folder', pinned: true })
  ];
  const sections = [['home', 'HOME'], ['games', 'GAMES'], ['studio', 'STUDIO'], ['content', 'CONTENT'], ['stream', 'STREAM'], ['school', 'SCHOOL'], ['dev', 'CREATE / DEV'], ['apps', 'APPS'], ['social', 'SOCIAL'], ['web', 'WEB'], ['files', 'FILES'], ['workspaces', 'WORKSPACES'], ['flow', 'FLOW'], ['phone', 'PHONE'], ['mypc', 'MY PC']]
    .map(([id, label]) => ({ id, label, builtin: true, place: ['content', 'dev'].includes(id) ? 'more' : 'pin', show: true }));
  const workspaces = [
    { id: 'w1', name: 'Studio Mode', items: ['fl', 'beats', 'spotify'], closeFirst: ['discord.exe'], hotkey: 'Control+Alt+1', delay: 600, color: '#ff5a1f' },
    { id: 'w2', name: 'Game Night', items: ['steam', 'discord', 'spotify'], closeFirst: [], hotkey: '', delay: 600, color: '#3affc8' },
    { id: 'w3', name: 'Stream Mode', items: ['obs', 'discord', 'yt'], closeFirst: [], hotkey: '', delay: 600, color: '#a66bff' }
  ];
  const L = (k, s, sec) => ({ key: k, secs: s, name: (items.find((i) => i.id === k) || {}).name || k, section: sec });
  const top = [L('fl', 45600, 'studio'), L('vsc', 35700, 'dev'), L('discord', 18600, 'social'), L('g1', 16200, 'games'), L('spotify', 11100, 'apps'), L('g3', 5000, 'games')];
  const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((label, i) => ({ day: 'd' + i, label, secs: [4.2, 5.8, 3.1, 7.4, 6.0, 8.1, 3.7][i] * 3600 }));
  const stats = { today: { total: 20520, list: [L('vsc', 7800, 'dev'), L('fl', 6480, 'studio'), L('discord', 3480, 'social'), L('g1', 2760, 'games')] }, week: { total: 138000, prev: 123000, days, list: top, bySection: { studio: 50700, dev: 38300, games: 30200, social: 18600 } }, month: { total: 500000, list: top }, all: { total: 900000, list: top }, streak: { days: 9, name: 'FL Studio' }, current: null };
  const flows = [
    { id: 'f1', name: 'Game starts → Game Mode on', enabled: true, trigger: { type: 'game-started', value: '', days: [] }, when: { from: '', to: '' }, actions: [{ type: 'gamemode-on', value: '' }], cooldown: 60, lastRun: now - 120e3 },
    { id: 'f2', name: 'New download → sort it', enabled: true, trigger: { type: 'file-added', value: 'C:\\Users\\You\\Downloads', days: [] }, when: { from: '', to: '' }, actions: [{ type: 'sort-downloads', value: '' }], cooldown: 60, lastRun: now - 3600e3 },
    { id: 'f3', name: 'Weekday mornings', enabled: false, trigger: { type: 'schedule', value: '09:00', days: [1, 2, 3, 4, 5] }, when: { from: '', to: '' }, actions: [{ type: 'workspace', value: 'w1' }], cooldown: 60, lastRun: 0 }
  ];
  const settings = {
    vibe: q.get('vibe') || 'studio', vibeAccents: {}, accent: '#ff5a1f', grain: 'medium', animSpeed: 'normal', startupAnimation: false, beatSync: false, uiSounds: false, hotkey: 'Control+Space', hideOnLaunch: false,
    discord: { enabled: false, clientId: '' }, steamApi: { key: '', steamid: '' }, notesVault: '', bouncesDir: 'C:\\Users\\You\\Music\\Bounces',
    dropRules: { audio: 'C:\\Users\\You\\Music\\Beats' }, widgets: { weather: true, city: 'Los Angeles', units: 'f', roblox: '', creator: { spotify: 'x', youtube: '@you' } },
    miniHotkey: 'Control+Alt+Space', syncDir: '', gameMode: { closeList: ['onedrive.exe'], overlay: true }, limits: { games: 180, social: 0 },
    releases: [{ title: 'NEW SINGLE', date: new Date(now + 12 * 86400e3).toISOString().slice(0, 10), link: 'https://example.com', stages: { beat: true, recorded: true, mixed: true } }], links: [{ name: 'Spotify for Artists', url: 'https://artists.spotify.com/' }],
    remote: { enabled: true, port: 4747, pin: '482913', token: 'x', ntfy: false, alerts: { downloads: true, exports: ['C:\\Users\\You\\Music\\Bounces'], apps: [] }, allowPeek: true, allowPower: true, pairedAt: now - 86400e3 },
    deck: { pages: [{ name: 'STREAM', buttons: [
      { id: 'b1', kind: 'workspace', label: 'Stream Mode', color: '#ff5a1f', value: 'w3' }, { id: 'b2', kind: 'obs-scene', label: 'Starting Soon', color: '#8f7bff', value: 'Starting Soon' }, { id: 'b3', kind: 'obs-scene', label: 'Gameplay', color: '#2d8cff', value: 'Gameplay' },
      { id: 'b4', kind: 'mic', label: 'Mute Mic', color: '#ff2e88', value: '' }, { id: 'b5', kind: 'sound', label: 'Airhorn', color: '#e8b923', value: 'airhorn.mp3' }, { id: 'b6', kind: 'obs-stream', label: 'Go Live', color: '#3dbb5c', value: '' },
      { id: 'b7', kind: 'media', label: 'Play / Pause', color: '#1f1f1f', value: 'toggle' }, { id: 'b8', kind: 'flow', label: 'Game Night', color: '#22c7a9', value: 'f1' }] }, { name: 'EVERYDAY', buttons: [] }] },
    obs: { port: 4455, password: '' }, doctor: { boost: true }, wallpaper: { enabled: false, style: 'match', widgets: [] },
    packs: ['gaming', 'music', 'streaming', 'school'], packsSeen: true, firstRun: false, ui: { player: true, navsys: true, gmbtn: true },
    stream: { mic: 'Mic/Aux', checklist: [{ id: 'c1', text: 'Stream title + category set' }, { id: 'c2', text: 'Phone on silent' }, { id: 'c3', text: 'Water nearby' }], shield: { on: true, scene: 'BRB', apps: ['discord.exe', '1password.exe', 'outlook.exe'] }, director: { on: true, rules: [{ exe: 'neondrift.exe', scene: 'Gameplay' }, { exe: 'chrome.exe', scene: 'Just Chatting' }] }, clip: { on: true, hotkey: 'Control+Alt+C', autoBuffer: true }, recap: true },
    school: { ics: 'https://example.com/calendar.ics', classes: [{ id: 'k1', name: 'Biology', color: '#22c7a9', link: 'https://example.com', ws: '', code: 'BIO' }, { id: 'k2', name: 'English', color: '#8f7bff', link: '', ws: '', code: '' }, { id: 'k3', name: 'Algebra II', color: '#ff5a1f', link: 'https://example.com', ws: '', code: 'MATH' }],
      todos: [{ id: 't1', text: 'Email Ms. Rivera about the lab', done: false }, { id: 't2', text: 'Print essay draft', done: true }], done: [], grades: [{ name: 'Biology', grade: 'A-', credits: 1, level: 'honors' }, { name: 'English', grade: '91', credits: 1, level: 'reg' }, { name: 'Algebra II', grade: 'B+', credits: 1, level: 'ap' }],
      studyApps: ['discord.exe', 'steam.exe'], studyMins: 45, meeting: true }
  };
  // Tell the page around the demo when the Vibe changes inside it, so the whole website can follow.
  const tellParent = () => { try { parent.postMessage({ catalyst: 'vibe', vibe: settings.vibe }, '*'); } catch (e) {} };
  const appOnly = (what) => () => { say(what + ' WORKS IN THE DESKTOP APP'); return ok({ error: 'demo' }); };

  window.cat = {
    init: () => ok({ platform: 'win32', version: '0.7.0', settings, sections, items, icons: {}, workspaces, counts: { steam: 24, epic: 9, store: 6, startMenu: 87 }, scannedAt: now - 3600e3,
      folders: ['Desktop', 'Documents', 'Downloads', 'Music', 'Pictures', 'Videos'].map((n) => ({ name: n, path: 'C:\\Users\\You\\' + n })), vibes: [], gameMode: false,
      media: { title: 'Untitled Demo 4', artist: 'Studio Session', status: 'Playing', pos: 72, end: 178, app: 'Spotify.exe', art: 'art/album.jpg', sessions: [{ app: 'Spotify.exe', title: 'Untitled Demo 4' }] } }),
    stats: () => ok(stats), suggested: () => ok(['fl', 'vsc', 'discord', 'spotify', 'g1', 'g3']), workspaceSuggestions: () => ok([]),
    system: () => ok({ cpu: 18 + Math.round(Math.random() * 9), ram: { total: 34359738368, used: 10522669875 }, disk: { free: 442381631488, total: 1e12 }, gpu: { temp: 58 + Math.round(Math.random() * 4), util: 34 } }),
    usage: () => ok({ cpu: 0.2, mem: 168 * 1048576, procs: 4 }),
    clipboard: () => ok([{ text: 'meeting notes: ship it friday', ts: now }, { text: 'https://example.com/docs', ts: now - 60e3 }]),
    friends: () => ok({ error: 'not-configured' }),
    widgets: () => ok({ creator: { list: [{ key: 'spotify', label: 'SPOTIFY', what: 'monthly listeners', url: 'x', n: 18400, short: '18K', delta: 2300, deltaShort: '2.3K' }, { key: 'youtube', label: 'YOUTUBE', what: 'subscribers', url: 'x', n: 4210, short: '4.2K', delta: 180, deltaShort: '180' }] }, weather: { place: 'Los Angeles', temp: 72, unit: '°F', text: 'Clear', hi: 78, lo: 61 } }),
    syncStatus: () => ok({ dir: '', remote: null }), updateStatus: () => ok({ status: 'current', hasToken: false }),
    bounces: () => ok([{ name: 'untitled demo 4 (master).wav', path: 'x', time: now - 7200e3 }, { name: 'late night idea.mp3', path: 'x', time: now - 3 * 86400e3 }]),
    recent: () => ok([{ name: 'Essay draft.docx', path: 'x', time: now - 3600e3 }, { name: 'Beats', path: 'x', time: now - 7200e3, isDir: true }, { name: 'lyrics.txt', path: 'x', time: now - 86400e3 }]),
    screenshots: () => ok([]), running: () => ok(['discord.exe', 'spotify.exe', 'chrome.exe']),
    flowMeta: () => ok({ triggers: { 'app-opened': 'An app opens', 'app-closed': 'An app closes', 'game-started': 'Any game starts', schedule: 'At a time', startup: 'Catalyst starts', workspace: 'A workspace launches', 'file-added': 'A file lands in a folder', hotkey: 'I press a hotkey' }, actions: { launch: 'Open an app, game, folder or site', workspace: 'Launch a workspace', url: 'Open a web address', notify: 'Show a notification', 'gamemode-on': 'Turn Game Mode on', 'gamemode-off': 'Turn Game Mode off', 'sort-downloads': 'Sort Downloads (by your rules, undoable)', 'media-pause': 'Pause music', 'media-play': 'Play / resume music', 'close-app': 'Close an app', wait: 'Wait a few seconds' }, recipes: [{ name: 'Game starts → Game Mode on', trigger: { type: 'game-started' }, actions: [{ type: 'gamemode-on' }] }, { name: 'Zoom opens → pause music', trigger: { type: 'app-opened', value: 'zoom.exe' }, actions: [{ type: 'media-pause' }] }], downloads: 'C:\\Users\\You\\Downloads' }),
    flows: () => ok(flows), flowLog: () => ok([{ ts: now - 120e3, name: 'Game starts → Game Mode on', trigger: 'Any game starts · Neon Drift', results: [{ step: 'Turn Game Mode on', ok: true }] }, { ts: now - 3600e3, name: 'New download → sort it', trigger: 'A file lands in a folder · photo.jpg', results: [{ step: 'Sort Downloads', ok: true }] }]),
    saveFlow: (f) => { f = { ...f, id: f.id || 'f' + Math.random().toString(36).slice(2, 6), lastRun: f.lastRun || 0 }; const i = flows.findIndex((x) => x.id === f.id); if (i >= 0) flows[i] = f; else flows.push(f); return ok(f); },
    removeFlow: (id) => { const i = flows.findIndex((x) => x.id === id); if (i >= 0) flows.splice(i, 1); return ok(true); },
    previewFlow: (f) => ok({ trigger: 'An app opens', activeNow: true, steps: f.actions.map((a) => a.type + ' ' + a.value) }),
    runFlow: () => ok({ results: [{ step: 'x', ok: true }] }),
    phoneInfo: () => ok({ status: { ok: true, publicNets: [], urls: ['http://192.168.1.42:4747'], pin: '482913', port: 4747, qr: window.__QR, lastSeen: now - 20e3, enabled: true },
      inbox: [{ kind: 'file', name: 'IMG_4471.HEIC', path: 'x', size: 3.1e6, ts: now - 90e3 }, { kind: 'text', text: 'https://example.com/recipe', ts: now - 3600e3 }], outbox: [{ id: 'o1', kind: 'file', name: 'beat 140bpm.wav', size: 48e6, ts: now - 300e3 }],
      usage: { used: 3, perDay: 10, maxMb: 50 }, dropDir: 'C:\\Users\\You\\Downloads\\Catalyst Drop', deck: settings.deck, kinds: [], peeking: false,
      alerts: [{ id: 'a1', ts: now - 60e3, title: 'Export finished', body: 'NEW SINGLE master.wav · 52.1 MB', kind: 'export' }, { id: 'a2', ts: now - 1800e3, title: 'Download finished', body: 'setup.exe · 92.4 MB', kind: 'download' }] }),
    doctorScore: () => ok({ score: 72, top: '11 apps start with Windows, 5 of them heavy' }),
    doctorScan: () => new Promise((r) => setTimeout(() => r({ score: 72, issues: ['11 apps start with Windows, 5 of them heavy', 'Over 5 GB of junk you can clean', 'Chrome is using 4.2 GB of memory'], receipt: { bytes: 6.2e9, startups: 4, boosts: 3 }, gpuTemp: 61,
      startup: [['Steam', 1, 1, 1], ['Discord', 1, 1, 1], ['Spotify', 1, 1, 1], ['Epic Games Launcher', 1, 1, 1], ['OneDrive', 1, 1, 1], ['Logitech G HUB', 1, 1, 0], ['Realtek Audio', 1, 0, 0]].map(([n, on, heavy, user]) => ({ name: n, label: n, on: !!on, heavy: !!heavy, user: !!user })),
      hogs: [{ name: 'Google Chrome', exe: 'chrome.exe', mb: 4300, count: 31, window: true }, { name: 'Discord', exe: 'Discord.exe', mb: 880, count: 6, window: true }, { name: 'Spotify', exe: 'Spotify.exe', mb: 410, count: 5, window: true }],
      space: { temp: 2.8e9, installers: 1.9e9, dupes: 0.6e9, bin: 3.4e9, total: 5.3e9 } }), 500)),
    searchFiles: (s) => ok([{ name: 'Essay draft.docx', path: 'C:\\Users\\You\\Documents\\Essay draft.docx', dir: 'C:\\Users\\You\\Documents', isDir: false }, { name: 'beat 140bpm.wav', path: 'C:\\Users\\You\\Music\\beat 140bpm.wav', dir: 'C:\\Users\\You\\Music', isDir: false }].filter((f) => f.name.toLowerCase().includes(String(s).toLowerCase()))),
    license: () => ok({ pro: true, email: 'demo', masked: 'DEMO' }), activateLicense: () => ok({ ok: false, error: 'This is the website demo. Download Catalyst to use your key.' }),
    planSort: () => ok({ plan: [['beat 140bpm.wav', 'Audio', 48e6], ['cover art final.png', 'Images', 4e6], ['setup.exe', 'Installers', 92e6], ['lyrics draft.txt', 'Documents', 4e3]].map(([file, rule, size]) => ({ file, rule, size, action: 'move' })) }),
    launchWorkspace: (id) => {
      const ws = workspaces.find((w) => w.id === id); if (!ws) return ok(false);
      const emit = (r) => (window.__h['ws-progress'] || []).forEach((f) => f(JSON.parse(JSON.stringify(r))));
      const r = { id, name: ws.name, done: false, steps: ws.items.map((x) => ({ itemId: x, name: (items.find((it) => it.id === x) || {}).name || x, status: x === 'spotify' ? 'skipped' : 'waiting', reason: x === 'spotify' ? 'Already open' : '' })) };
      emit(r);
      const tick = () => { const s = r.steps.find((x) => x.status === 'waiting' || x.status === 'launching'); if (!s) { r.done = true; emit(r); return; } s.status = s.status === 'waiting' ? 'launching' : 'done'; emit(r); setTimeout(tick, 380); };
      setTimeout(tick, 300); return ok(true);
    },
    updateItem: (id, patch) => { const it = items.find((i) => i.id === id); if (it) Object.assign(it, patch); setTimeout(() => (window.__h.library || []).forEach((f) => f({ items, sections, workspaces, folders: [] })), 10); return ok(it); },
    saveWorkspace: (w) => { const c = { ...w, id: w.id || 'w' + Date.now() }; const i = workspaces.findIndex((x) => x.id === c.id); if (i >= 0) workspaces[i] = c; else workspaces.push(c); return ok(c); },
    setSettings: (p) => { const before = settings.vibe; for (const [k, v] of Object.entries(p || {})) settings[k] = v && typeof v === 'object' && !Array.isArray(v) && settings[k] && typeof settings[k] === 'object' ? { ...settings[k], ...v } : v; if (settings.vibe !== before) tellParent(); return ok(settings); },
    launch: () => ok(true), launchUrl: () => ok(true), launchPath: () => ok(true), gameMode: (v) => ok(!!v),
    applyPacks: (p) => { settings.packs = p && p.length ? p : null; return ok(settings); },
    // desktop-only things
    captureDesktop: appOnly('CAPTURE'), pickFiles: appOnly('ADDING FILES'), addPaths: appOnly('ADDING FILES'), setIcon: appOnly('CUSTOM ICONS'), reveal: appOnly('SHOW IN FOLDER'),
    exportData: appOnly('EXPORT'), clearData: appOnly('DELETE DATA'), checkUpdate: () => ok({ status: 'current' }), win: () => {},
    on: (ch, fn) => { (window.__h = window.__h || {}); (window.__h[ch] = window.__h[ch] || []).push(fn); return () => {}; }
  };
  const base = window.cat;
  window.cat = new Proxy(base, { get: (t, k) => t[k] || (() => ok(null)) });

  // The page around the demo can switch Vibes and tabs.
  window.addEventListener('message', (e) => {
    const m = e.data || {}; const app = window.__catApp; if (!app) return;
    if (m.catalyst === 'set-vibe' && m.vibe && m.vibe !== settings.vibe) app.saveSettings({ vibe: m.vibe }).then(() => app.render(true));
    if (m.catalyst === 'go' && m.section) app.go(m.section);
  });
  window.addEventListener('load', () => setTimeout(() => {
    // OBS isn't on this computer: make the Stream screen look connected.
    if (typeof V5 !== 'undefined') {
      const fake = { GetStreamStatus: { outputActive: false }, GetRecordStatus: { outputActive: false }, GetCurrentProgramScene: { currentProgramSceneName: 'Gameplay' }, GetSceneList: { scenes: [{ sceneName: 'Starting Soon' }, { sceneName: 'Gameplay' }, { sceneName: 'Just Chatting' }, { sceneName: 'BRB' }] }, GetReplayBufferStatus: { outputActive: true }, GetInputMute: { inputMuted: false } };
      V5.OBS.call = (t) => Promise.resolve(fake[t] || {}); V5.OBS.connect = () => Promise.resolve(); V5.OBS.connected = () => true;
    }
    if (q.get('s') && window.__catApp) window.__catApp.go(q.get('s'));
    try { parent.postMessage({ catalyst: 'ready', vibe: settings.vibe }, '*'); } catch (e) {}
  }, 300));
})();
