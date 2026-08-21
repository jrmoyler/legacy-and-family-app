'use strict';

const { STRIPE_CATALOG } = require('./_catalog');
const { KEY_PROBLEMS, client, logFailure, readSecretKey, reply } = require('./_stripe');

const SESSION_ID = /^cs_(?:test|live)_[A-Za-z0-9]+$/;

module.exports = async function retrieveCheckoutSession(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return reply(res, 405, { error: 'Method not allowed.' });
  }

  const secret = readSecretKey();
  if (!secret.ok) return reply(res, 503, { error: KEY_PROBLEMS[secret.reason] });

  const sessionId = typeof req.query?.session_id === 'string' ? req.query.session_id : '';
  if (!SESSION_ID.test(sessionId)) return reply(res, 400, { error: 'Invalid Checkout Session.' });

  try {
    const stripe = client(secret.key);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.status !== 'complete' || session.payment_status !== 'paid') {
      return reply(res, 409, { error: 'Payment has not been confirmed.' });
    }

    const productIds = String(session.metadata?.product_ids || '')
      .split(',')
      .filter((id) => Object.hasOwn(STRIPE_CATALOG, id));
    if (!productIds.length) return reply(res, 422, { error: 'This order has no recognized products.' });

    return reply(res, 200, {
      paid: true,
      productIds,
      customerEmail: session.customer_details?.email || '',
      amountTotal: session.amount_total,
      currency: session.currency,
    });
  } catch (error) {
    logFailure('Checkout Session verification', error);
    return reply(res, 502, { error: 'We could not verify the payment yet. Please refresh in a moment.' });
  }
};
