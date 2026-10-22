// Catalyst key page: a Cloudflare Worker.
//
//   GET  /key?session_id=cs_...  Buyer lands here after paying on Stripe. Checks with Stripe that the
//                                session was paid, then shows their Catalyst Pro key (signed, so it can't be faked).
//   POST /activate               Catalyst calls this once per PC. A key works on up to 3 PCs.
//   POST /deactivate             Frees a PC slot (Settings › Pro › Remove key).
//
// Secrets (Cloudflare dashboard › Worker › Settings › Variables and Secrets):
//   STRIPE_SECRET_KEY   your Stripe secret key (sk_live_... or sk_test_...)
//   PRIVATE_KEY         the Catalyst signing key (base64), kept only here
// KV binding:
//   LICENSES            a KV namespace (stores which PCs each key is on)
// Optional plain variables:
//   DOWNLOAD_URL        where the Download button on the key page goes
//   SUPPORT_EMAIL       shown if something goes wrong

const MAX_PCS = 3;
const PUBLIC_KEY_RAW = '7F8hF0kgDpHxnCdbfTee0JCcCh2OsjZwQP991R9O++o=';

const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const b64url = (buf) => b64(buf).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64url = (s) => unb64(String(s).replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
const ALG = { name: 'Ed25519' };

async function signKey(env, email, order) {
  const key = await crypto.subtle.importKey('pkcs8', unb64(env.PRIVATE_KEY), ALG, false, ['sign']);
  const payload = new TextEncoder().encode(['1', email, order, Math.floor(Date.now() / 86400000)].join('|'));
  const sig = await crypto.subtle.sign(ALG, key, payload);
  return 'CAT1-' + b64url(payload) + '.' + b64url(sig);
}

async function verifyKey(raw) {
  const m = String(raw || '').trim().replace(/\s+/g, '').match(/^CAT1-([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/);
  if (!m) return null;
  const pub = await crypto.subtle.importKey('raw', unb64(PUBLIC_KEY_RAW), ALG, false, ['verify']);
  const payload = unb64url(m[1]);
  const ok = await crypto.subtle.verify(ALG, pub, unb64url(m[2]), payload);
  if (!ok) return null;
  const [v, email, order] = new TextDecoder().decode(payload).split('|');
  return v === '1' ? { email, order } : null;
}

const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' } });
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function page(title, body) {
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<style>
:root{--bg:#0d0d0d;--fg:#ededed;--mute:#8a8a8a;--acc:#ff5a1f}
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:var(--bg);color:var(--fg);font:16px/1.5 ui-monospace,Menlo,Consolas,monospace;padding:24px}
.card{width:min(680px,100%);border:2px solid var(--fg);box-shadow:10px 10px 0 var(--acc);padding:32px;background:#111}
h1{font:900 44px/1 system-ui,Arial Black,sans-serif;margin:0 0 6px;letter-spacing:-.02em}h1 b{color:var(--acc)}
.k{display:flex;gap:10px;margin:22px 0}.k code{flex:1;min-width:0;overflow-wrap:anywhere;padding:14px;border:1px solid #333;background:#0a0a0a;font-size:14px}
button,a.btn{border:0;background:var(--acc);color:#0d0d0d;font:700 14px ui-monospace,Consolas,monospace;letter-spacing:.14em;padding:14px 18px;cursor:pointer;text-decoration:none;display:inline-block}
a.btn.ghost{background:none;color:var(--fg);border:1px solid #444}ol{padding-left:20px;color:#cfcfcf}small{color:var(--mute)}
</style></head><body><div class="card">${body}</div></body></html>`, { headers: { 'content-type': 'text/html; charset=utf-8' } });
}

async function keyPage(url, env) {
  const id = url.searchParams.get('session_id') || '';
  if (!/^cs_[A-Za-z0-9_]+$/.test(id)) return page('Catalyst Pro', '<h1>Catalyst<b>.</b></h1><p>This page shows your Catalyst Pro key after you buy. If you just paid, use the link from your purchase.</p>');
  const r = await fetch('https://api.stripe.com/v1/checkout/sessions/' + id, { headers: { Authorization: 'Bearer ' + env.STRIPE_SECRET_KEY } });
  const s = await r.json().catch(() => ({}));
  if (!r.ok || s.payment_status !== 'paid') {
    return page('Catalyst Pro', `<h1>Hold up.</h1><p>We couldn't confirm that payment yet. If you just paid, wait a few seconds and refresh this page.</p>${env.SUPPORT_EMAIL ? `<small>Still stuck? Email ${esc(env.SUPPORT_EMAIL)}</small>` : ''}`);
  }
  const email = ((s.customer_details && s.customer_details.email) || s.customer_email || 'buyer').toLowerCase();
  const order = id.slice(-16);
  // Same purchase always shows the same key (so refreshing or coming back later is fine).
  let key = await env.LICENSES.get('key:' + order);
  if (!key) { key = await signKey(env, email, order); await env.LICENSES.put('key:' + order, key); }
  const dl = env.DOWNLOAD_URL || '';
  return page('Your Catalyst Pro key', `<h1>You're Pro<b>.</b></h1><p>Thanks for buying Catalyst Pro. Here's your key:</p>
    <div class="k"><code id="k">${esc(key)}</code><button onclick="navigator.clipboard.writeText(document.getElementById('k').textContent);this.textContent='COPIED'">COPY</button></div>
    <ol><li>Open Catalyst${dl ? ` (don't have it? <a href="${esc(dl)}" style="color:var(--acc)">download it</a>)` : ''}.</li><li>Go to <b>Settings › Get Pro › Enter key</b>.</li><li>Paste the key and press <b>Unlock</b>.</li></ol>
    <p><small>Works on up to ${MAX_PCS} PCs. Bookmark this page to see your key again. Licensed to ${esc(email)}.</small></p>
    ${dl ? `<a class="btn ghost" href="${esc(dl)}">DOWNLOAD CATALYST</a>` : ''}`);
}

async function activate(req, env, remove) {
  const body = await req.json().catch(() => ({}));
  const lic = await verifyKey(body.key);
  if (!lic) return json({ ok: false, error: 'This key isn’t valid.' }, 400);
  const machine = String(body.machine || '').slice(0, 64);
  if (!/^[a-f0-9]{16,64}$/.test(machine)) return json({ ok: false, error: 'Bad request.' }, 400);
  const k = 'pcs:' + lic.order;
  const pcs = JSON.parse((await env.LICENSES.get(k)) || '[]');
  if (remove) {
    await env.LICENSES.put(k, JSON.stringify(pcs.filter((p) => p.id !== machine)));
    return json({ ok: true });
  }
  if (pcs.some((p) => p.id === machine)) return json({ ok: true, pcs: pcs.length });
  if (pcs.length >= MAX_PCS) return json({ ok: false, error: `This key is already on ${MAX_PCS} PCs. Remove it from one (Settings › Pro › Remove key) and try again.` }, 403);
  pcs.push({ id: machine, name: String(body.name || 'PC').slice(0, 40), at: Date.now() });
  await env.LICENSES.put(k, JSON.stringify(pcs));
  return json({ ok: true, pcs: pcs.length });
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type' } });
    try {
      if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/key')) return await keyPage(url, env);
      if (req.method === 'POST' && url.pathname === '/activate') return await activate(req, env, false);
      if (req.method === 'POST' && url.pathname === '/deactivate') return await activate(req, env, true);
      return json({ ok: false, error: 'Not found' }, 404);
    } catch (e) {
      return json({ ok: false, error: 'Something went wrong on the key server.' }, 500);
    }
  }
};
