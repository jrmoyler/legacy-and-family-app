'use strict';

const assert = require('node:assert/strict');
const createCheckoutSession = require('../api/create-checkout-session');
const retrieveCheckoutSession = require('../api/checkout-session');
const { STRIPE_CATALOG } = require('../api/stripe-catalog');

function response() {
  return {
    headers: {},
    statusCode: 0,
    payload: null,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; },
  };
}

async function run() {
  assert.equal(Object.keys(STRIPE_CATALOG).length, 11, 'Expected eleven paid Stripe products');
  assert.equal(STRIPE_CATALOG.benefit.unitAmount, 799);
  assert.equal(STRIPE_CATALOG['compassion-legacy-journal'].unitAmount, 2500);

  // Nothing may be charged before it can be delivered. The group licence has no
  // downloadable editions and no fulfilment process, so it must stay out of the
  // catalogue — and out of checkout — until it has both.
  assert.equal(
    Object.hasOwn(STRIPE_CATALOG, 'church-license'),
    false,
    'church-license has no fulfilment: it must not be chargeable',
  );
  assert.equal(createCheckoutSession.requestedProducts({ items: ['church-license'] }), null);
  assert.equal(createCheckoutSession.requestedProducts({ items: ['benefit', 'church-license'] }), null);

  assert.deepEqual(
    createCheckoutSession.requestedProducts({ items: ['benefit', 'workbook'] }),
    ['benefit', 'workbook'],
  );
  assert.equal(createCheckoutSession.requestedProducts({ items: ['benefit', 'benefit'] }), null);
  assert.equal(createCheckoutSession.requestedProducts({ items: ['benefit', 'not-a-product'] }), null);
  assert.equal(createCheckoutSession.requestedProducts({ items: [] }), null);

  const wrongCreateMethod = response();
  await createCheckoutSession({ method: 'GET', headers: {} }, wrongCreateMethod);
  assert.equal(wrongCreateMethod.statusCode, 405);
  assert.equal(wrongCreateMethod.headers.Allow, 'POST');

  const invalidCart = response();
  await createCheckoutSession({ method: 'POST', headers: {}, body: { items: ['not-a-product'] } }, invalidCart);
  assert.equal(invalidCart.statusCode, 400);

  const previousKey = process.env.STRIPE_SECRET_KEY;
  process.env.STRIPE_SECRET_KEY = 'sk_test_verification_only';
  const invalidSession = response();
  await retrieveCheckoutSession({ method: 'GET', query: { session_id: 'not-a-session' } }, invalidSession);
  assert.equal(invalidSession.statusCode, 400);
  if (previousKey === undefined) delete process.env.STRIPE_SECRET_KEY;
  else process.env.STRIPE_SECRET_KEY = previousKey;

  console.log('Stripe checkout verification passed: catalogue, unfulfillable-product guard, validation, and method guards');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
