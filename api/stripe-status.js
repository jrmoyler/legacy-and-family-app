'use strict';

const { STRIPE_CATALOG } = require('./_catalog');
const { apiVersion, client, logFailure, readSecretKey, reply, resolveSiteUrl } = require('./_stripe');

/**
 * Answers "is Stripe actually connected?" without anyone having to attempt a
 * purchase and read a generic failure.
 *
 * The default response is drawn entirely from configuration — it never calls
 * Stripe, so it cannot be used to burn the account's rate limit, and it never
 * echoes key material. That is enough to identify every setup fault this
 * project has actually hit: no key, a publishable key in the secret slot, a
 * key stored with a trailing newline, live/test crossed with the environment,
 * and an unusable PUBLIC_SITE_URL.
 *
 * A live round-trip is available at `?probe=1`, gated on STRIPE_STATUS_TOKEN
 * so that an unauthenticated caller cannot make this deployment talk to
 * Stripe on demand.
 */
module.exports = async function stripeStatus(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return reply(res, 405, { error: 'Method not allowed.' });
  }

  const secret = readSecretKey();
  const status = {
    configured: secret.ok,
    apiVersion: apiVersion(),
    catalogSize: Object.keys(STRIPE_CATALOG).length,
  };

  if (secret.ok) {
    status.keyMode = secret.mode;
    status.keyShape = secret.shape;
    // Reported because a stored newline breaks every call before it leaves the
    // process, and is invisible in the dashboard. It is now trimmed, so this is
    // advice to tidy the value rather than a fault.
    status.keyHadSurroundingWhitespace = secret.padded;
  } else {
    status.keyProblem = secret.reason;
  }

  try {
    status.siteUrl = resolveSiteUrl(req);
    status.siteUrlSource = process.env.PUBLIC_SITE_URL?.trim() ? 'PUBLIC_SITE_URL' : 'request headers';
  } catch (error) {
    status.siteUrl = null;
    status.siteUrlProblem = error.message;
  }

  const wantsProbe = req.query?.probe === '1';
  const token = process.env.STRIPE_STATUS_TOKEN?.trim();
  if (!wantsProbe) return reply(res, 200, status);

  if (!token || req.headers?.['x-stripe-status-token'] !== token) {
    status.probe = { run: false, reason: 'Set STRIPE_STATUS_TOKEN and send it as x-stripe-status-token.' };
    return reply(res, 200, status);
  }
  if (!secret.ok) {
    status.probe = { run: false, reason: 'No usable secret key to probe with.' };
    return reply(res, 200, status);
  }

  try {
    // The cheapest authenticated read against the exact resource checkout uses.
    await client(secret.key).checkout.sessions.list({ limit: 1 });
    status.probe = { run: true, reachable: true };
  } catch (error) {
    logFailure('status probe', error);
    status.probe = {
      run: true,
      reachable: false,
      type: error?.type || error?.name,
      code: error?.code,
      statusCode: error?.statusCode,
      message: error?.message,
    };
  }
  return reply(res, 200, status);
};
