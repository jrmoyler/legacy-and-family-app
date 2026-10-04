'use strict';

/**
 * Shared plumbing for the private admin dashboard (`/admin`).
 *
 * There are no accounts anywhere else in the app, so the dashboard brings its
 * own: the owner signs in with Google, and the same Google grant is what lets
 * the dashboard read and act on her Gmail. Nothing is stored in a database.
 * The Google refresh token lives only inside an encrypted, HttpOnly cookie
 * that the browser cannot read and the server alone can open.
 *
 * Configure in Vercel (every value is server-side only):
 *
 *   GOOGLE_CLIENT_ID          OAuth client (type "Web application")
 *   GOOGLE_CLIENT_SECRET      its secret
 *   ADMIN_EMAILS              comma-separated Google addresses allowed in
 *   ADMIN_SESSION_SECRET      32+ random characters; encrypts the session
 *   SUPABASE_SERVICE_ROLE_KEY lets the dashboard moderate the message wall
 *
 * Optional:
 *   SUPABASE_URL              defaults to the project in supabase/config.toml
 *   PUBLIC_SITE_URL           fixes the OAuth redirect origin
 */

const crypto = require('node:crypto');

const SESSION_COOKIE = 'ch_admin';
const STATE_COOKIE = 'ch_admin_state';
const SESSION_HOURS = 12;
const STATE_MINUTES = 10;
const DEFAULT_SUPABASE_URL = 'https://zfpjgedcjdhxvdbthikt.supabase.co';

const GOOGLE_SCOPES = [
  'openid',
  'email',
  'profile',
  // Read, label, archive, trash, and send. Not permanent deletion.
  'https://www.googleapis.com/auth/gmail.modify',
];

const env = (name) => (typeof process.env[name] === 'string' ? process.env[name].trim() : '');

function adminEmails() {
  return env('ADMIN_EMAILS')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

const isAdminEmail = (email) =>
  typeof email === 'string' && adminEmails().includes(email.trim().toLowerCase());

/** What is set and what is missing, by name only. Never values. */
function configuration() {
  const secret = env('ADMIN_SESSION_SECRET');
  return {
    google: Boolean(env('GOOGLE_CLIENT_ID') && env('GOOGLE_CLIENT_SECRET')),
    admins: adminEmails().length > 0,
    sessionSecret: secret.length >= 32,
    supabase: Boolean(env('SUPABASE_SERVICE_ROLE_KEY')),
  };
}

function missingConfiguration() {
  const config = configuration();
  const missing = [];
  if (!config.google) missing.push('GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET');
  if (!config.admins) missing.push('ADMIN_EMAILS');
  if (!config.sessionSecret) missing.push('ADMIN_SESSION_SECRET (32+ characters)');
  return missing;
}

/* --------------------------------------------------------------------------
   Sealed values: AES-256-GCM, base64url, with an expiry inside the seal.
   -------------------------------------------------------------------------- */

const sealKey = () => crypto.createHash('sha256').update(`compassion-admin:${env('ADMIN_SESSION_SECRET')}`).digest();

function seal(payload, ttlSeconds) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', sealKey(), iv);
  const body = JSON.stringify({ ...payload, exp: Date.now() + ttlSeconds * 1000 });
  const encrypted = Buffer.concat([cipher.update(body, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url');
}

function unseal(token) {
  if (typeof token !== 'string' || !token || !configuration().sessionSecret) return null;
  try {
    const raw = Buffer.from(token, 'base64url');
    if (raw.length < 29) return null;
    const decipher = crypto.createDecipheriv('aes-256-gcm', sealKey(), raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    const body = Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8');
    const payload = JSON.parse(body);
    if (!payload || typeof payload.exp !== 'number' || Date.now() >= payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

/* --------------------------------------------------------------------------
   Cookies
   -------------------------------------------------------------------------- */

function readCookies(req) {
  const header = String(req.headers?.cookie || '');
  const cookies = {};
  for (const part of header.split(';')) {
    const at = part.indexOf('=');
    if (at < 0) continue;
    const name = part.slice(0, at).trim();
    if (name) cookies[name] = decodeURIComponent(part.slice(at + 1).trim());
  }
  return cookies;
}

function cookie(name, value, maxAgeSeconds) {
  return [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    `Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`,
  ].join('; ');
}

const clearCookie = (name) => cookie(name, '', 0);

/** The signed-in admin, or null. Re-checks the allowlist on every request. */
function readSession(req) {
  const session = unseal(readCookies(req)[SESSION_COOKIE]);
  if (!session || !isAdminEmail(session.email) || typeof session.refreshToken !== 'string') return null;
  return session;
}

/* --------------------------------------------------------------------------
   Requests and replies
   -------------------------------------------------------------------------- */

function reply(res, status, payload) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.status(status).json(payload);
}

function siteOrigin(req) {
  const configured = env('PUBLIC_SITE_URL');
  if (configured) {
    const url = new URL(/^https?:\/\//i.test(configured) ? configured : `https://${configured}`);
    return url.origin;
  }
  const host = String(req.headers?.['x-forwarded-host'] || req.headers?.host || '').split(',')[0].trim();
  if (!host) throw new Error('Cannot work out this site\'s address. Set PUBLIC_SITE_URL.');
  const local = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
  return `${local ? 'http' : 'https'}://${host}`;
}

const redirectUri = (req) => `${siteOrigin(req)}/api/admin-auth`;

/* --------------------------------------------------------------------------
   Google
   -------------------------------------------------------------------------- */

const UPSTREAM_TIMEOUT = 10000;

async function exchangeCode(code, req) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT),
    body: new URLSearchParams({
      code,
      client_id: env('GOOGLE_CLIENT_ID'),
      client_secret: env('GOOGLE_CLIENT_SECRET'),
      redirect_uri: redirectUri(req),
      grant_type: 'authorization_code',
    }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload) throw new Error(`Google token exchange failed (${response.status}).`);
  return payload;
}

/**
 * The ID token arrives straight from Google's token endpoint over TLS, so its
 * signature does not need re-checking (Google's own guidance); the audience
 * and verified-email claims still do.
 */
function identityFrom(idToken) {
  const part = String(idToken || '').split('.')[1];
  if (!part) return null;
  try {
    const claims = JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
    if (claims.aud !== env('GOOGLE_CLIENT_ID')) return null;
    if (claims.email_verified !== true && claims.email_verified !== 'true') return null;
    return { email: String(claims.email || '').toLowerCase(), name: String(claims.name || '') };
  } catch {
    return null;
  }
}

/* Access tokens last an hour; keep them per warm instance, keyed by email. */
const accessTokens = new Map();

async function accessToken(session) {
  const cached = accessTokens.get(session.email);
  if (cached && cached.refreshToken === session.refreshToken && Date.now() < cached.expiresAt) {
    return cached.token;
  }
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT),
    body: new URLSearchParams({
      client_id: env('GOOGLE_CLIENT_ID'),
      client_secret: env('GOOGLE_CLIENT_SECRET'),
      refresh_token: session.refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.access_token) {
    const error = new Error('Google sign-in has expired. Please sign in again.');
    error.status = 401;
    throw error;
  }
  accessTokens.set(session.email, {
    token: payload.access_token,
    refreshToken: session.refreshToken,
    expiresAt: Date.now() + Math.max(60, (payload.expires_in || 3600) - 120) * 1000,
  });
  return payload.access_token;
}

module.exports = {
  DEFAULT_SUPABASE_URL,
  GOOGLE_SCOPES,
  SESSION_COOKIE,
  SESSION_HOURS,
  STATE_COOKIE,
  STATE_MINUTES,
  accessToken,
  adminEmails,
  clearCookie,
  configuration,
  cookie,
  env,
  exchangeCode,
  identityFrom,
  isAdminEmail,
  missingConfiguration,
  readCookies,
  readSession,
  redirectUri,
  reply,
  seal,
  siteOrigin,
  unseal,
};
