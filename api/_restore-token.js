'use strict';

/**
 * Stateless restore codes.
 *
 * A restore code reopens purchased books in another browser without an
 * account. It is `ch1.<payload>.<signature>`, where the payload is JSON holding
 * only product ids and an expiry, and the signature is an HMAC-SHA256 under
 * RESTORE_TOKEN_SECRET. Nothing is stored on the server, and nothing about the
 * buyer — no email, no Stripe id, and never any Legacy Inventory answer — goes
 * into the code.
 */

const crypto = require('node:crypto');
const { STRIPE_CATALOG } = require('./stripe-catalog');

const PREFIX = 'ch1';
const TTL_SECONDS = 90 * 24 * 60 * 60;
const SIGNATURE_BYTES = 18;
const TOKEN_SHAPE = /^ch1\.[A-Za-z0-9_-]{8,600}\.[A-Za-z0-9_-]{24}$/;

function secret() {
  const value = process.env.RESTORE_TOKEN_SECRET || '';
  return value.length >= 32 ? value : null;
}

const restoreTokensConfigured = () => secret() !== null;

function sign(payload, key) {
  return crypto
    .createHmac('sha256', key)
    .update(`${PREFIX}.${payload}`)
    .digest()
    .subarray(0, SIGNATURE_BYTES)
    .toString('base64url');
}

/** Issue a code for verified product ids. Returns null when no secret is set. */
function issueRestoreToken(productIds, now = Date.now()) {
  const key = secret();
  if (!key) return null;
  const ids = [...new Set(productIds)].filter((id) => Object.hasOwn(STRIPE_CATALOG, id));
  if (!ids.length) return null;
  const expiresAt = Math.floor(now / 1000) + TTL_SECONDS;
  const payload = Buffer.from(JSON.stringify({ p: ids, e: expiresAt })).toString('base64url');
  return { token: `${PREFIX}.${payload}.${sign(payload, key)}`, expiresAt };
}

/**
 * Verify a code. Returns { productIds, expiresAt } or { error } — forged,
 * altered, expired, and malformed codes are all refused.
 */
function verifyRestoreToken(token, now = Date.now()) {
  const key = secret();
  if (!key) return { error: 'unconfigured' };
  if (typeof token !== 'string' || !TOKEN_SHAPE.test(token)) return { error: 'malformed' };

  const [, payload, signature] = token.split('.');
  const expected = Buffer.from(sign(payload, key));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) {
    return { error: 'forged' };
  }

  let body;
  try {
    body = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return { error: 'malformed' };
  }
  const ids = Array.isArray(body?.p) ? body.p : [];
  if (!Number.isInteger(body?.e) || !ids.length) return { error: 'malformed' };
  if (body.e <= Math.floor(now / 1000)) return { error: 'expired' };
  if (!ids.every((id) => typeof id === 'string' && Object.hasOwn(STRIPE_CATALOG, id))) {
    return { error: 'malformed' };
  }
  return { productIds: ids, expiresAt: body.e };
}

module.exports = {
  TTL_SECONDS,
  issueRestoreToken,
  verifyRestoreToken,
  restoreTokensConfigured,
};
