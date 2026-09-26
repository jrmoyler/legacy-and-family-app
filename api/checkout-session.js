'use strict';

const { isSessionId, paidSession, PaymentNotConfirmed } = require('./_stripe-session');
const { issueRestoreToken } = require('./_restore-token');

function reply(res, status, payload) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).json(payload);
}

module.exports = async function retrieveCheckoutSession(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return reply(res, 405, { error: 'Method not allowed.' });
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    return reply(res, 503, { error: 'Stripe checkout is not configured yet.' });
  }

  const sessionId = typeof req.query?.session_id === 'string' ? req.query.session_id : '';
  if (!isSessionId(sessionId)) return reply(res, 400, { error: 'Invalid Checkout Session.' });

  try {
    const { session, productIds } = await paidSession(sessionId);
    // The restore code carries product ids and an expiry, nothing else.
    const restore = issueRestoreToken(productIds);

    return reply(res, 200, {
      paid: true,
      productIds,
      restoreToken: restore?.token || '',
      restoreExpiresAt: restore?.expiresAt || 0,
      customerEmail: session.customer_details?.email || '',
      amountTotal: session.amount_total,
      currency: session.currency,
    });
  } catch (error) {
    if (error instanceof PaymentNotConfirmed) {
      return reply(res, error.status, { error: error.message });
    }
    console.error('Stripe Checkout Session verification failed', error?.type || error?.name || 'unknown');
    return reply(res, 502, { error: 'We could not verify the payment yet. Please refresh in a moment.' });
  }
};
