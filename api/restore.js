'use strict';

/**
 * POST /api/restore  { code }
 *
 * Reopens purchased books in another browser. `code` is either a restore code
 * issued at checkout or the Stripe Checkout Session id from the purchase. The
 * reply lists the product ids to unlock and a restore code that authorizes
 * their downloads. Nothing is stored.
 */

const { isSessionId, paidSession, PaymentNotConfirmed } = require('./_stripe-session');
const { issueRestoreToken, verifyRestoreToken, restoreTokensConfigured } = require('./_restore-token');

const REFUSALS = {
  expired: 'That restore code has expired. Write to us with your Stripe receipt and we will issue a new one.',
  forged: 'That restore code is not one we issued. Check that it was copied in full.',
  malformed: 'That does not look like a restore code or a Stripe session id.',
};

function reply(res, status, payload) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).json(payload);
}

module.exports = async function restorePurchases(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return reply(res, 405, { error: 'Method not allowed.' });
  }
  if (!restoreTokensConfigured()) {
    return reply(res, 503, { error: 'Restoring purchases is not configured yet.' });
  }

  const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
  if (!code || code.length > 800) return reply(res, 400, { error: REFUSALS.malformed });

  if (isSessionId(code)) {
    if (!process.env.STRIPE_SECRET_KEY) {
      return reply(res, 503, { error: 'Stripe checkout is not configured yet.' });
    }
    try {
      const { productIds } = await paidSession(code);
      const restore = issueRestoreToken(productIds);
      return reply(res, 200, { productIds, restoreToken: restore.token, expiresAt: restore.expiresAt });
    } catch (error) {
      if (error instanceof PaymentNotConfirmed) return reply(res, error.status, { error: error.message });
      if (error?.statusCode === 404 || error?.code === 'resource_missing') {
        return reply(res, 404, { error: 'Stripe has no purchase with that session id.' });
      }
      console.error('Restore lookup failed', error?.type || error?.name || 'unknown');
      return reply(res, 502, { error: 'We could not reach Stripe. Please try again in a moment.' });
    }
  }

  const verified = verifyRestoreToken(code);
  if (verified.error) return reply(res, 401, { error: REFUSALS[verified.error] || REFUSALS.malformed });
  return reply(res, 200, {
    productIds: verified.productIds,
    restoreToken: code,
    expiresAt: verified.expiresAt,
  });
};
