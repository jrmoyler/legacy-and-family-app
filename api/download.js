'use strict';

/**
 * GET /api/download?product=<id>&item=<id>&format=pdf|epub&token=<restore code>
 *     (or &session_id=<Stripe Checkout Session id> in place of token)
 *
 * The only way to a paid edition. The request must prove the product was
 * bought — a signed restore code or a paid Stripe session that lists it. The
 * reply is a redirect to a signed URL in the private storage bucket that
 * expires in SIGNED_URL_SECONDS and downloads as an attachment. The signed
 * URL is never cached and never logged here.
 */

const { storageKeyFor } = require('./_library');
const { verifyRestoreToken } = require('./_restore-token');
const { isSessionId, paidSession, PaymentNotConfirmed } = require('./_stripe-session');

const SIGNED_URL_SECONDS = 90;
const DEFAULT_SUPABASE_URL = 'https://zfpjgedcjdhxvdbthikt.supabase.co';
const DEFAULT_BUCKET = 'library-private';

function reply(res, status, payload) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).json(payload);
}

const param = (req, name) => (typeof req.query?.[name] === 'string' ? req.query[name] : '');

function storageConfig() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!key) return null;
  return {
    url: (process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/+$/, ''),
    bucket: process.env.LIBRARY_BUCKET || DEFAULT_BUCKET,
    key,
  };
}

/** Ask Supabase Storage for a short-lived signed URL that downloads as an attachment. */
async function signedDownloadUrl(config, objectKey) {
  const path = `${encodeURIComponent(config.bucket)}/${objectKey.split('/').map(encodeURIComponent).join('/')}`;
  const response = await fetch(`${config.url}/storage/v1/object/sign/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.key}`,
      apikey: config.key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ expiresIn: SIGNED_URL_SECONDS }),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`storage signing failed (${response.status})`);
  const payload = await response.json();
  const signed = payload.signedURL || payload.signedUrl;
  if (typeof signed !== 'string' || !signed.startsWith('/')) throw new Error('storage returned no signed URL');
  const filename = objectKey.split('/').pop();
  const url = new URL(`${config.url}/storage/v1${signed}`);
  url.searchParams.set('download', filename);
  return url.toString();
}

/** Resolve the product ids a request can prove it owns, or an error reply. */
async function provenProducts(req) {
  const token = param(req, 'token');
  if (token) {
    const verified = verifyRestoreToken(token);
    if (verified.error === 'unconfigured') return { status: 503, error: 'Downloads are not configured yet.' };
    if (verified.error === 'expired') {
      return { status: 401, error: 'This restore code has expired. Write to us with your Stripe receipt for a new one.' };
    }
    if (verified.error) return { status: 403, error: 'This download link is not valid.' };
    return { productIds: verified.productIds };
  }

  const sessionId = param(req, 'session_id');
  if (sessionId) {
    if (!isSessionId(sessionId)) return { status: 403, error: 'This download link is not valid.' };
    if (!process.env.STRIPE_SECRET_KEY) return { status: 503, error: 'Stripe checkout is not configured yet.' };
    try {
      return { productIds: (await paidSession(sessionId)).productIds };
    } catch (error) {
      if (error instanceof PaymentNotConfirmed) return { status: 403, error: error.message };
      return { status: 502, error: 'We could not confirm the purchase with Stripe. Please try again.' };
    }
  }

  return { status: 401, error: 'Downloads need the restore code from your purchase. Open your library to restore it.' };
}

module.exports = async function download(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return reply(res, 405, { error: 'Method not allowed.' });
  }

  const productId = param(req, 'product');
  const format = param(req, 'format');
  const objectKey = storageKeyFor(productId, param(req, 'item') || productId, format);
  if (!objectKey) return reply(res, 404, { error: 'That edition is not part of this product.' });

  const proof = await provenProducts(req);
  if (proof.error) return reply(res, proof.status, { error: proof.error });
  if (!proof.productIds.includes(productId)) {
    return reply(res, 403, { error: 'This purchase does not include that product.' });
  }

  const config = storageConfig();
  if (!config) return reply(res, 503, { error: 'Downloads are not configured yet.' });

  try {
    const location = await signedDownloadUrl(config, objectKey);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Location', location);
    return res.status(302).end();
  } catch (error) {
    console.error('Signed download failed', error?.message || 'unknown');
    return reply(res, 502, { error: 'The download could not be prepared. Please try again in a moment.' });
  }
};

module.exports.SIGNED_URL_SECONDS = SIGNED_URL_SECONDS;
