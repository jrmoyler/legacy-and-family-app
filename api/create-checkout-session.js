'use strict';

const { STRIPE_CATALOG } = require('./_catalog');
const {
  ConfigurationError, KEY_PROBLEMS, client, logFailure, readSecretKey, reply, resolveSiteUrl,
} = require('./_stripe');

/**
 * The cart the browser sent, reduced to product IDs this server will price.
 *
 * Duplicates are collapsed rather than rejected. Every line is quantity 1 and
 * priced from the catalogue, so a repeated ID can only ever cost the customer
 * less than they asked for — refusing the whole cart over one turned a stale
 * tab into "checkout is broken".
 */
function requestedProducts(body) {
  // A runtime that did not recognise the content type hands the body over raw.
  const rawBody = Buffer.isBuffer(body) ? body.toString('utf8') : body;
  const source = typeof rawBody === 'string' ? safeParse(rawBody) : rawBody;
  const raw = Array.isArray(source?.items) ? source.items : [];
  const ids = [...new Set(raw.filter((id) => typeof id === 'string'))];
  if (!ids.length || ids.length > 12) return null;
  if (ids.some((id) => !Object.hasOwn(STRIPE_CATALOG, id))) return null;
  return ids;
}

/** A body that arrives unparsed (no JSON content type) is still a cart. */
function safeParse(body) {
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

module.exports = async function createCheckoutSession(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return reply(res, 405, { error: 'Method not allowed.' });
  }

  const productIds = requestedProducts(req.body);
  if (!productIds) return reply(res, 400, { error: 'Choose at least one valid marketplace item.' });

  const secret = readSecretKey();
  if (!secret.ok) return reply(res, 503, { error: KEY_PROBLEMS[secret.reason] });

  let siteUrl;
  try {
    siteUrl = resolveSiteUrl(req);
  } catch (error) {
    logFailure('site URL resolution', error);
    return reply(res, 500, {
      error: error instanceof ConfigurationError
        ? error.message
        : 'The site URL is misconfigured, so Stripe has nowhere to send you back to.',
    });
  }

  try {
    const stripe = client(secret.key);
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
    logFailure('Checkout Session creation', error);
    return reply(res, 502, { error: 'Stripe could not start checkout. Please try again.' });
  }
};

module.exports.requestedProducts = requestedProducts;
