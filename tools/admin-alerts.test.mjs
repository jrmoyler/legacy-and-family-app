/**
 * New-message email alerts: the email carries the note and a link to /admin,
 * is sent from each signed-in admin's own Gmail, and can never break a
 * visitor's submission.
 */

import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
Object.assign(process.env, {
  ADMIN_SESSION_SECRET: 'x'.repeat(40),
  ADMIN_EMAILS: 'pam@example.com',
  GOOGLE_CLIENT_ID: 'client-id',
  GOOGLE_CLIENT_SECRET: 'client-secret',
  SUPABASE_SERVICE_ROLE_KEY: 'service-key',
  PUBLIC_SITE_URL: 'https://example.org',
});
const { alertEmail, notifyNewMessage, storeAlertToken } = require('../api/_notify.js');
const { seal } = require('../api/_admin.js');

const note = { displayName: 'Grace', community: 'Columbus', message: 'Thank you for this wonderful work.' };
const realFetch = globalThis.fetch;
const json = (body, ok = true) => ({ ok, status: ok ? 200 : 500, json: async () => body });
test.afterEach(() => { globalThis.fetch = realFetch; });

test('the alert names the visitor, quotes the note, and links to /admin', () => {
  const { subject, body } = alertEmail(note, 'https://example.org/admin');
  assert.match(subject, /Grace/);
  assert.match(body, /Grace, Columbus/);
  assert.match(body, /Thank you for this wonderful work\./);
  assert.match(body, /https:\/\/example\.org\/admin/);
});

test('storing a token seals it: the refresh token is never written in the clear', async () => {
  let sent;
  globalThis.fetch = async (url, init) => { sent = { url, body: JSON.parse(init.body) }; return json([]); };
  await storeAlertToken('pam@example.com', 'refresh-secret');
  assert.match(sent.url, /admin_alert_tokens/);
  assert.equal(sent.body.email, 'pam@example.com');
  assert.ok(!JSON.stringify(sent.body).includes('refresh-secret'));
});

test('a new note emails each allowed admin from their own account', async () => {
  const rows = [
    { email: 'pam@example.com', sealed_token: seal({ refreshToken: 'r1' }, 3600) },
    { email: 'stranger@example.com', sealed_token: seal({ refreshToken: 'r2' }, 3600) },
  ];
  const mail = [];
  globalThis.fetch = async (url, init = {}) => {
    if (String(url).includes('admin_alert_tokens')) return json(rows);
    if (String(url).includes('oauth2.googleapis.com')) return json({ access_token: 'at', expires_in: 3600 });
    mail.push(JSON.parse(init.body).raw);
    return json({ id: 'sent' });
  };
  const result = await notifyNewMessage(note, { headers: {} });
  assert.equal(result.sent, 1, 'only addresses still in ADMIN_EMAILS are alerted');
  const raw = Buffer.from(mail[0], 'base64url').toString('utf8');
  assert.match(raw, /^To: pam@example\.com/);
});

test('an alert failure is swallowed so the visitor still gets through', async () => {
  globalThis.fetch = async () => { throw new Error('network down'); };
  const originalError = console.error;
  console.error = () => {};
  try {
    assert.deepEqual(await notifyNewMessage(note, { headers: {} }), { sent: 0 });
  } finally {
    console.error = originalError;
  }
});
