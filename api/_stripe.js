'use strict';

/**
 * Shared Stripe plumbing for the checkout functions.
 *
 * Everything here exists because a misconfigured deployment used to fail the
 * same opaque way as a broken one: a single 502 that said "try again". The
 * three most common setup mistakes — a key pasted with a trailing newline, a
 * publishable key in the secret slot, and a site URL with no scheme — are now
 * each detected and named, both in the response and in the log line.
 */

const Stripe = require('stripe');

/**
 * Vercel and the Stripe dashboard both make it easy to store a key with
 * surrounding whitespace, and a trailing newline is worse than cosmetic: Node
 * refuses to put a control character in a header, so the request never reaches
 * Stripe and the SDK reports it as a connection failure. Trimming here is the
 * difference between "checkout works" and "checkout is not connected".
 */
function readSecretKey() {
  const raw = typeof process.env.STRIPE_SECRET_KEY === 'string' ? process.env.STRIPE_SECRET_KEY : '';
  const key = raw.trim();

  if (!key) return { ok: false, reason: 'missing' };
  // A publishable key in the secret slot authenticates as nobody. Stripe's own
  // reply is a generic 401, so name the mistake here instead.
  if (key.startsWith('pk_')) return { ok: false, reason: 'publishable' };

  return {
    ok: true,
    key,
    padded: raw !== key,
    mode: key.includes('_live_') ? 'live' : key.includes('_test_') ? 'test' : 'unknown',
    shape: /^(sk|rk)_(test|live)_/.test(key) ? 'standard' : 'unrecognised',
  };
}

const KEY_PROBLEMS = {
  missing: 'Stripe checkout is not configured yet.',
  publishable: 'The server is holding a Stripe publishable key. STRIPE_SECRET_KEY needs the secret key (sk_… or rk_…).',
};

/**
 * The API version is deliberately not hardcoded. Pinning a version string by
 * hand lets it drift from the SDK that has to speak it — the previous pin was
 * a whole generation behind `stripe@22` — and Stripe rejects a version it does
 * not recognise, which surfaces as an unexplained checkout failure. The SDK
 * ships the version it was generated against; use that unless a deployment
 * deliberately overrides it.
 */
const apiVersion = () => process.env.STRIPE_API_VERSION?.trim() || Stripe.API_VERSION;

const client = (key) => new Stripe(key, { apiVersion: apiVersion(), maxNetworkRetries: 2 });

/** Raised for a configuration fault the operator can fix, as opposed to a Stripe outage. */
class ConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

/**
 * Where Stripe should send the customer back to.
 *
 * `PUBLIC_SITE_URL` is optional — without it the current deployment origin is
 * derived from the proxy headers, which is what keeps preview deployments
 * working. A value entered as a bare hostname is the common case and is not an
 * error worth failing a sale over, so it gets the https:// it meant.
 */
function resolveSiteUrl(req) {
  const configured = process.env.PUBLIC_SITE_URL?.trim().replace(/\/+$/, '');
  if (configured) {
    const absolute = /^[a-z][a-z0-9+.-]*:\/\//i.test(configured) ? configured : `https://${configured}`;
    let url;
    try {
      url = new URL(absolute);
    } catch {
      throw new ConfigurationError(`PUBLIC_SITE_URL is not a usable URL: ${configured}`);
    }
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new ConfigurationError('PUBLIC_SITE_URL must use HTTP or HTTPS.');
    }
    return url.origin;
  }

  const protocol = String(req.headers?.['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const host = String(req.headers?.['x-forwarded-host'] || req.headers?.host || '').split(',')[0].trim();
  if (!host || !['http', 'https'].includes(protocol)) {
    throw new ConfigurationError('Could not determine the site URL. Set PUBLIC_SITE_URL.');
  }
  try {
    return new URL(`${protocol}://${host}`).origin;
  } catch {
    throw new ConfigurationError(`Could not determine the site URL from host "${host}".`);
  }
}

function reply(res, status, payload) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).json(payload);
}

/**
 * Log everything needed to tell a bad key from a bad API version from a Stripe
 * outage. None of these fields carry the secret: Stripe's messages quote the
 * offending header name, never its value.
 */
function logFailure(scope, error) {
  console.error(`[stripe] ${scope} failed`, JSON.stringify({
    name: error?.name,
    type: error?.type,
    code: error?.code,
    statusCode: error?.statusCode,
    requestId: error?.requestId,
    message: error?.message,
    detail: error?.detail?.message,
  }));
}

module.exports = {
  ConfigurationError,
  KEY_PROBLEMS,
  apiVersion,
  client,
  logFailure,
  readSecretKey,
  reply,
  resolveSiteUrl,
};
