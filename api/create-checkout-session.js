'use strict';

const Stripe = require('stripe');
const { STRIPE_CATALOG } = require('./stripe-catalog');

const API_VERSION = '2026-02-25.clover';

function reply(res, status, payload) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).json(payload);
}

function requestSiteUrl(req) {
  const configured = process.env.PUBLIC_SITE_URL?.trim().replace(/\/+$/, '');
  if (configured) {
    const url = new URL(configured);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('PUBLIC_SITE_URL must use HTTP or HTTPS');
    return url.origin;
  }

  const protocol = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  if (!host || !['http', 'https'].includes(protocol)) throw new Error('Could not determine the site URL');
  return new URL(`${protocol}://${host}`).origin;
}

function requestedProducts(body) {
  const raw = Array.isArray(body?.items) ? body.items : [];
  const ids = [...new Set(raw.filter((id) => typeof id === 'string'))];
  if (!ids.length || ids.length > 12 || ids.length !== raw.length) return null;
  if (ids.some((id) => !Object.hasOwn(STRIPE_CATALOG, id))) return null;
  return ids;
}

module.exports = async function createCheckoutSession(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return reply(res, 405, { error: 'Method not allowed.' });
  }

  const productIds = requestedProducts(req.body);
  if (!productIds) return reply(res, 400, { error: 'Choose at least one valid marketplace item.' });
  if (!process.env.STRIPE_SECRET_KEY) {
    return reply(res, 503, { error: 'Stripe checkout is not configured yet.' });
  }

  try {
    const siteUrl = requestSiteUrl(req);
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: API_VERSION,
      maxNetworkRetries: 2,
    });
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_creation: 'always',
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      line_items: productIds.map((id) => {
        const product = STRIPE_CATALOG[id];
        return {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: product.unitAmount,
            product_data: {
              name: product.name,
              description: `${product.kind} from A Cup of Compassion by Pamella Grear`,
            },
          },
        };
      }),
      metadata: { product_ids: productIds.join(',') },
      payment_intent_data: { metadata: { product_ids: productIds.join(',') } },
      success_url: `${siteUrl}/?checkout=success&session_id={CHECKOUT_SESSION_ID}#/checkout-success`,
      cancel_url: `${siteUrl}/#/checkout`,
    });

    return reply(res, 200, { url: session.url });
  } catch (error) {
    console.error('Stripe Checkout Session creation failed', error?.type || error?.name || 'unknown');
    return reply(res, 502, { error: 'Stripe could not start checkout. Please try again.' });
  }
};

module.exports.requestedProducts = requestedProducts;
