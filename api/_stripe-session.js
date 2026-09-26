'use strict';

/**
 * Shared Stripe lookup: retrieve a Checkout Session and return the product ids
 * it paid for. Used by checkout confirmation, restore, and download.
 */

const Stripe = require('stripe');
const { STRIPE_CATALOG } = require('./stripe-catalog');

const API_VERSION = '2026-02-25.clover';
const SESSION_ID = /^cs_(?:test|live)_[A-Za-z0-9]+$/;

const isSessionId = (value) => typeof value === 'string' && SESSION_ID.test(value);

class PaymentNotConfirmed extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

/** Resolve a paid session. Throws PaymentNotConfirmed for unpaid or empty orders. */
async function paidSession(sessionId) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: API_VERSION,
    maxNetworkRetries: 2,
  });
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.status !== 'complete' || session.payment_status !== 'paid') {
    throw new PaymentNotConfirmed('Payment has not been confirmed.', 409);
  }
  const productIds = String(session.metadata?.product_ids || '')
    .split(',')
    .filter((id) => Object.hasOwn(STRIPE_CATALOG, id));
  if (!productIds.length) throw new PaymentNotConfirmed('This order has no recognized products.', 422);
  return { session, productIds };
}

module.exports = { API_VERSION, SESSION_ID, isSessionId, paidSession, PaymentNotConfirmed };
