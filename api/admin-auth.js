'use strict';

const crypto = require('node:crypto');
const {
  GOOGLE_SCOPES, SESSION_COOKIE, SESSION_HOURS, STATE_COOKIE, STATE_MINUTES,
  clearCookie, cookie, env, exchangeCode, identityFrom, isAdminEmail, missingConfiguration,
  readCookies, redirectUri, seal, unseal,
} = require('./_admin');

/**
 * Google sign-in for the admin dashboard.
 *
 *   GET /api/admin-auth               starts the Google consent screen
 *   GET /api/admin-auth?code&state    Google's return trip; sets the session
 *
 * Every outcome ends on /admin, with `?error=` naming what went wrong, so the
 * dashboard can say it in plain words instead of showing a raw failure.
 */

function redirect(res, location, cookies = []) {
  res.setHeader('Cache-Control', 'no-store');
  if (cookies.length) res.setHeader('Set-Cookie', cookies);
  res.statusCode = 302;
  res.setHeader('Location', location);
  res.end();
}

const back = (res, error, cookies = []) =>
  redirect(res, error ? `/admin?error=${encodeURIComponent(error)}` : '/admin', cookies);

module.exports = async function adminAuth(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.statusCode = 405;
    return res.end();
  }
  if (missingConfiguration().length) return back(res, 'not-configured');

  const query = req.query || {};
  const clearState = clearCookie(STATE_COOKIE);

  if (query.error) return back(res, 'cancelled', [clearState]);

  if (!query.code) {
    const state = crypto.randomBytes(24).toString('base64url');
    let location;
    try {
      location = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
        client_id: env('GOOGLE_CLIENT_ID'),
        redirect_uri: redirectUri(req),
        response_type: 'code',
        scope: GOOGLE_SCOPES.join(' '),
        access_type: 'offline',
        // Without consent Google only issues a refresh token the first time.
        prompt: 'consent select_account',
        include_granted_scopes: 'true',
        state,
      })}`;
    } catch {
      return back(res, 'not-configured');
    }
    return redirect(res, location, [cookie(STATE_COOKIE, seal({ state }, STATE_MINUTES * 60), STATE_MINUTES * 60)]);
  }

  const expected = unseal(readCookies(req)[STATE_COOKIE]);
  const given = String(query.state || '');
  if (!expected?.state || expected.state.length !== given.length
    || !crypto.timingSafeEqual(Buffer.from(expected.state), Buffer.from(given))) {
    return back(res, 'expired', [clearState]);
  }

  let tokens;
  try {
    tokens = await exchangeCode(String(query.code), req);
  } catch (error) {
    console.error('Admin sign-in failed:', error.message);
    return back(res, 'google', [clearState]);
  }

  const identity = identityFrom(tokens.id_token);
  if (!identity || !isAdminEmail(identity.email)) {
    console.warn('Admin sign-in refused for a non-admin account.');
    return back(res, 'not-allowed', [clearState]);
  }
  if (!tokens.refresh_token) return back(res, 'no-offline', [clearState]);

  const ttl = SESSION_HOURS * 3600;
  const session = seal({ email: identity.email, name: identity.name, refreshToken: tokens.refresh_token }, ttl);
  return back(res, '', [clearState, cookie(SESSION_COOKIE, session, ttl)]);
};
