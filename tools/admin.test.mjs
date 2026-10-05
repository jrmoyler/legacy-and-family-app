/**
 * The admin dashboard — release contract.
 *
 *   - the session cookie is sealed: tampering, expiry, a rotated secret, or
 *     removal from ADMIN_EMAILS each sign the holder out;
 *   - Google sign-in refuses a forged state and any account not on the list;
 *   - nothing but `me` answers without a session, and no write runs without
 *     the custom header that blocks cross-site requests;
 *   - outgoing mail cannot be used for header injection;
 *   - the page needs no wider Content-Security-Policy than the site has.
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (name) => readFileSync(join(ROOT, name), 'utf8');

const ENV = {
  GOOGLE_CLIENT_ID: 'client-123.apps.googleusercontent.com',
  GOOGLE_CLIENT_SECRET: 'shh',
  ADMIN_EMAILS: 'Owner@Example.com, second@example.com',
  ADMIN_SESSION_SECRET: 'x'.repeat(40),
  SUPABASE_SERVICE_ROLE_KEY: 'service-role',
  SUPABASE_URL: 'https://project.supabase.co',
  PUBLIC_SITE_URL: 'https://hub.example.com',
};
Object.assign(process.env, ENV);

const shared = require('../api/_admin.js');
const gmailHelpers = require('../api/_gmail.js');
const admin = require('../api/admin.js');
const adminAuth = require('../api/admin-auth.js');

function mockRes() {
  const res = {
    statusCode: 200, headers: {}, body: undefined, ended: false,
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; this.ended = true; return this; },
    end() { this.ended = true; },
  };
  return res;
}

const sessionCookie = (email = 'owner@example.com', ttl = 3600) =>
  `${shared.SESSION_COOKIE}=${encodeURIComponent(shared.seal({ email, name: 'Owner', refreshToken: 'refresh-1' }, ttl))}`;

async function call(handler, { method = 'GET', query = {}, headers = {}, body } = {}) {
  const res = mockRes();
  await handler({ method, query, headers, body }, res);
  return res;
}

function withFetch(impl, run) {
  const original = globalThis.fetch;
  globalThis.fetch = impl;
  return Promise.resolve(run()).finally(() => { globalThis.fetch = original; });
}

const json = (payload, status = 200, headers = {}) =>
  new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json', ...headers } });

const idToken = (claims) => `h.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.s`;

/* ==========================================================================
   Sessions
   ========================================================================== */

test('a sealed session round-trips and rejects tampering, expiry, and a rotated secret', () => {
  const token = shared.seal({ email: 'owner@example.com' }, 60);
  assert.equal(shared.unseal(token).email, 'owner@example.com');

  const raw = Buffer.from(token, 'base64url');
  raw[raw.length - 1] ^= 1;
  assert.equal(shared.unseal(raw.toString('base64url')), null);

  assert.equal(shared.unseal(shared.seal({ email: 'a' }, -1)), null);

  process.env.ADMIN_SESSION_SECRET = 'y'.repeat(40);
  assert.equal(shared.unseal(token), null);
  process.env.ADMIN_SESSION_SECRET = ENV.ADMIN_SESSION_SECRET;
});

test('the admin list is checked on every request, case-insensitively', () => {
  const req = (cookie) => ({ headers: { cookie } });
  assert.ok(shared.readSession(req(sessionCookie('owner@example.com'))));
  assert.equal(shared.readSession(req(sessionCookie('stranger@example.com'))), null);

  const cookie = sessionCookie('second@example.com');
  process.env.ADMIN_EMAILS = 'owner@example.com';
  assert.equal(shared.readSession(req(cookie)), null, 'removing an address signs it out');
  process.env.ADMIN_EMAILS = ENV.ADMIN_EMAILS;
});

test('a short session secret counts as not configured', () => {
  process.env.ADMIN_SESSION_SECRET = 'short';
  assert.ok(shared.missingConfiguration().some((m) => m.startsWith('ADMIN_SESSION_SECRET')));
  process.env.ADMIN_SESSION_SECRET = ENV.ADMIN_SESSION_SECRET;
  assert.deepEqual(shared.missingConfiguration(), []);
});

/* ==========================================================================
   Google sign-in
   ========================================================================== */

test('sign-in starts at Google with Gmail access, offline, and a sealed state', async () => {
  const res = await call(adminAuth);
  assert.equal(res.statusCode, 302);
  const url = new URL(res.headers.location);
  assert.equal(url.host, 'accounts.google.com');
  assert.equal(url.searchParams.get('redirect_uri'), 'https://hub.example.com/api/admin-auth');
  assert.match(url.searchParams.get('scope'), /gmail\.modify/);
  assert.equal(url.searchParams.get('access_type'), 'offline');
  const stateCookie = res.headers['set-cookie'][0];
  assert.match(stateCookie, /HttpOnly; Secure; SameSite=Lax/);
  const sealed = decodeURIComponent(stateCookie.split(';')[0].split('=')[1]);
  assert.equal(shared.unseal(sealed).state, url.searchParams.get('state'));
});

test('a forged state never reaches Google', async () => {
  const cookie = `${shared.STATE_COOKIE}=${encodeURIComponent(shared.seal({ state: 'a'.repeat(32) }, 60))}`;
  await withFetch(() => assert.fail('must not exchange a code'), async () => {
    const res = await call(adminAuth, { query: { code: 'c', state: 'b'.repeat(32) }, headers: { cookie } });
    assert.equal(res.headers.location, '/admin?error=expired');
  });
});

async function callback(claims, tokens = {}) {
  const state = 's'.repeat(32);
  const cookie = `${shared.STATE_COOKIE}=${encodeURIComponent(shared.seal({ state }, 60))}`;
  return withFetch(
    async () => json({ id_token: idToken(claims), refresh_token: 'refresh-1', ...tokens }),
    () => call(adminAuth, { query: { code: 'c', state }, headers: { cookie } }),
  );
}

test('only a verified address on the admin list gets a session', async () => {
  const base = { aud: ENV.GOOGLE_CLIENT_ID, email_verified: true };

  let res = await callback({ ...base, email: 'stranger@example.com' });
  assert.equal(res.headers.location, '/admin?error=not-allowed');

  res = await callback({ ...base, email: 'owner@example.com', email_verified: false });
  assert.equal(res.headers.location, '/admin?error=not-allowed');

  res = await callback({ ...base, aud: 'someone-else', email: 'owner@example.com' });
  assert.equal(res.headers.location, '/admin?error=not-allowed');

  res = await callback({ ...base, email: 'OWNER@example.com' });
  assert.equal(res.headers.location, '/admin');
  const session = res.headers['set-cookie'].find((c) => c.startsWith(`${shared.SESSION_COOKIE}=`));
  const opened = shared.readSession({ headers: { cookie: session.split(';')[0] } });
  assert.equal(opened.email, 'owner@example.com');
});

/* ==========================================================================
   The API surface
   ========================================================================== */

test('without a session only `me` answers, and it names what is missing', async () => {
  let res = await call(admin, { query: { action: 'me' } });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.signedIn, false);
  assert.deepEqual(res.body.missing, []);

  for (const action of ['overview', 'gmail.list', 'messages.list']) {
    res = await call(admin, { query: { action } });
    assert.equal(res.statusCode, 401, action);
  }
});

test('writes need POST and the admin request header, even with a session', async () => {
  const cookie = sessionCookie();
  let res = await call(admin, { query: { action: 'gmail.send' }, headers: { cookie } });
  assert.equal(res.statusCode, 405);

  res = await call(admin, { method: 'POST', query: { action: 'gmail.send' }, headers: { cookie }, body: {} });
  assert.equal(res.statusCode, 403);

  res = await call(admin, { query: { action: 'drop.tables' }, headers: { cookie } });
  assert.equal(res.statusCode, 404);
});

test('approving a message patches exactly that row with the service role', async () => {
  const id = '4b0e2f8a-1c2d-4e5f-8a9b-0c1d2e3f4a5b';
  const cookie = sessionCookie();
  const seen = [];
  await withFetch(async (url, init) => {
    seen.push({ url: String(url), init });
    return json([{ id, approved: true }]);
  }, async () => {
    const res = await call(admin, {
      method: 'POST', query: { action: 'messages.approve' },
      headers: { cookie, 'x-admin-request': '1' }, body: { id, approved: true },
    });
    assert.equal(res.statusCode, 200);
  });
  assert.equal(seen.length, 1);
  assert.equal(seen[0].url, `https://project.supabase.co/rest/v1/compassion_messages?id=eq.${id}`);
  assert.equal(seen[0].init.method, 'PATCH');
  assert.equal(seen[0].init.headers.Authorization, 'Bearer service-role');

  const res = await call(admin, {
    method: 'POST', query: { action: 'messages.delete' },
    headers: { cookie, 'x-admin-request': '1' }, body: { id: '1 or 1=1' },
  });
  assert.equal(res.statusCode, 400);
});

test('the overview raises alerts for pending messages and unread mail', async () => {
  await withFetch(async (url) => {
    const href = String(url);
    if (href.includes('oauth2.googleapis.com')) return json({ access_token: 'a', expires_in: 3600 });
    if (href.includes('/labels/INBOX')) return json({ messagesUnread: 4 });
    if (href.includes('/profile')) return json({ emailAddress: 'owner@example.com', messagesTotal: 900 });
    if (href.includes('supabase.co')) return json([{ id: 'x' }], 206, { 'Content-Range': '0-0/3' });
    throw new Error(`unexpected ${href}`);
  }, async () => {
    const res = await call(admin, { query: { action: 'overview' }, headers: { cookie: sessionCookie() } });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.services.supabase.pendingMessages, 3);
    assert.equal(res.body.services.gmail.unread, 4);
    const titles = res.body.alerts.map((a) => a.title).join(' | ');
    assert.match(titles, /3 messages waiting for review/);
    assert.match(titles, /4 unread emails/);
  });
});

/* ==========================================================================
   Mail
   ========================================================================== */

test('outgoing mail cannot smuggle headers', () => {
  const raw = gmailHelpers.buildRaw({
    to: 'friend@example.com',
    subject: 'Hello\r\nBcc: victim@example.com',
    body: 'Hi there',
  });
  const message = Buffer.from(raw, 'base64url').toString('utf8');
  assert.doesNotMatch(message, /^Bcc:/m);
  assert.match(message, /^Subject: Hello Bcc: victim@example.com$/m);

  assert.throws(() => gmailHelpers.buildRaw({ to: 'not-an-address', body: 'x' }), /not an email address/);
  assert.throws(() => gmailHelpers.buildRaw({ to: 'a@example.com', body: '   ' }), /Write a message/);

  const unicode = Buffer.from(gmailHelpers.buildRaw({ to: 'a@example.com', subject: 'Café ☕', body: 'x' }), 'base64url').toString();
  assert.match(unicode, /^Subject: =\?UTF-8\?B\?/m);
});

test('reading mail prefers plain text and strips HTML otherwise', () => {
  const part = (mimeType, text) => ({ mimeType, body: { data: Buffer.from(text).toString('base64url') } });
  assert.equal(gmailHelpers.bodyText({ parts: [part('text/plain', 'plain'), part('text/html', '<b>html</b>')] }), 'plain');
  assert.equal(
    gmailHelpers.bodyText({ parts: [part('text/html', '<p>Hi &amp; welcome</p><script>alert(1)</script><p>Bye</p>')] }),
    'Hi & welcome\nBye',
  );
  assert.equal(gmailHelpers.isMessageId('18c2f0a9b7d6e5f4'), true);
  assert.equal(gmailHelpers.isMessageId('../profile'), false);
});

/* ==========================================================================
   The page
   ========================================================================== */

test('the dashboard page fits the existing CSP and stays out of search', () => {
  const html = read('admin.html');
  const js = read('admin.js');
  assert.match(html, /<meta name="robots" content="noindex, nofollow">/);
  const scripts = [...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(scripts, ['./admin.js']);
  assert.doesNotMatch(html, /<script>(?!<\/script>)/, 'no inline script');
  const fetched = [...js.matchAll(/fetch\(`?([^`,)]+)/g)].map((m) => m[1]);
  assert.ok(fetched.every((target) => target.startsWith('/api/admin')), `only same-origin calls: ${fetched}`);
  assert.doesNotMatch(js, /localStorage|sessionStorage/, 'no browser storage of mail');

  const vercel = JSON.parse(read('vercel.json'));
  const adminHeaders = vercel.headers.find((h) => h.source === '/admin');
  assert.ok(adminHeaders.headers.some((h) => h.key === 'X-Robots-Tag'));
});
