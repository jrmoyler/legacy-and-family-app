'use strict';

const {
  accessToken, adminEmails, env, seal, siteOrigin, supabaseUrl, unseal,
} = require('./_admin');
const { buildRaw, gmail } = require('./_gmail');

/**
 * Emails the admin when a visitor submits a note for the Messages of
 * Compassion wall.
 *
 * Visitors are anonymous, so there is no admin session to send with. Instead,
 * each time an admin signs in to /admin the server keeps their Google refresh
 * token in `admin_alert_tokens`, sealed with ADMIN_SESSION_SECRET, and the
 * alert goes out through the Gmail API from the admin's own address to itself.
 * Nothing new needs configuring in Vercel.
 *
 * Alerts are best effort: a failure is logged and never blocks or fails the
 * visitor's submission.
 */

const TIMEOUT = 8000;
const TEN_YEARS = 10 * 365 * 24 * 3600;
const EXCERPT = 500;

async function table(path, init = {}) {
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  const response = await fetch(`${supabaseUrl()}/rest/v1/admin_alert_tokens${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
    signal: AbortSignal.timeout(TIMEOUT),
  });
  if (!response.ok) throw new Error(`Supabase returned ${response.status} for admin_alert_tokens.`);
  return response;
}

/** Remember an admin's Google grant so alerts can be sent on their behalf. */
async function storeAlertToken(email, refreshToken) {
  if (!env('SUPABASE_SERVICE_ROLE_KEY') || !email || !refreshToken) return false;
  await table('?on_conflict=email', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({
      email,
      sealed_token: seal({ refreshToken }, TEN_YEARS),
      updated_at: new Date().toISOString(),
    }),
  });
  return true;
}

async function hasAlertToken(email) {
  if (!env('SUPABASE_SERVICE_ROLE_KEY') || !email) return false;
  const response = await table(`?select=email&email=eq.${encodeURIComponent(email)}`);
  return (await response.json()).length > 0;
}

/** The text of the alert. Pure, so it can be tested without any network. */
function alertEmail(note, adminUrl) {
  const who = note.community ? `${note.displayName}, ${note.community}` : note.displayName;
  return {
    subject: `New Messages of Compassion note awaiting approval — ${note.displayName}`,
    body: [
      'A visitor shared a note for the Messages of Compassion wall. It stays private until you approve it.',
      '',
      `From: ${who}`,
      '',
      String(note.message).slice(0, EXCERPT),
      '',
      `Approve, unpublish, or delete it here: ${adminUrl}`,
    ].join('\n'),
  };
}

/** Email every signed-in admin about a new pending note. Never throws. */
async function notifyNewMessage(note, req) {
  try {
    if (!env('SUPABASE_SERVICE_ROLE_KEY') || !env('GOOGLE_CLIENT_ID')) return { sent: 0 };
    const allowed = new Set(adminEmails());
    const response = await table('?select=email,sealed_token');
    const rows = (await response.json()).filter((row) => allowed.has(String(row.email).toLowerCase()));
    const { subject, body } = alertEmail(note, `${siteOrigin(req)}/admin`);

    const results = await Promise.allSettled(rows.map(async (row) => {
      const refreshToken = unseal(row.sealed_token)?.refreshToken;
      if (!refreshToken) throw new Error('stored token cannot be opened');
      const token = await accessToken({ email: row.email, refreshToken });
      await gmail(token, '/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw: buildRaw({ to: row.email, subject, body }) }),
      });
    }));
    results.forEach((result, i) => {
      if (result.status === 'rejected') {
        console.error(`New-message alert to admin ${i + 1} failed: ${result.reason?.message}`);
      }
    });
    return { sent: results.filter((r) => r.status === 'fulfilled').length };
  } catch (error) {
    console.error('New-message alert failed:', error.message);
    return { sent: 0 };
  }
}

module.exports = { alertEmail, hasAlertToken, notifyNewMessage, storeAlertToken };
