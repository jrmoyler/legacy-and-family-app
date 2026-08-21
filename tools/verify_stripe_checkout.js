'use strict';

const assert = require('node:assert/strict');
const Stripe = require('stripe');

const createCheckoutSession = require('../api/create-checkout-session');
const retrieveCheckoutSession = require('../api/checkout-session');
const stripeStatus = require('../api/stripe-status');
const { STRIPE_CATALOG } = require('../api/_catalog');
const { apiVersion, readSecretKey, resolveSiteUrl } = require('../api/_stripe');

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

/** Run `body` with STRIPE_SECRET_KEY set to `value`, then restore it. */
async function withKey(value, body) {
  const previous = process.env.STRIPE_SECRET_KEY;
  if (value === undefined) delete process.env.STRIPE_SECRET_KEY;
  else process.env.STRIPE_SECRET_KEY = value;
  try {
    return await body();
  } finally {
    if (previous === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = previous;
  }
}

async function withSiteUrl(value, body) {
  const previous = process.env.PUBLIC_SITE_URL;
  if (value === undefined) delete process.env.PUBLIC_SITE_URL;
  else process.env.PUBLIC_SITE_URL = value;
  try {
    return await body();
  } finally {
    if (previous === undefined) delete process.env.PUBLIC_SITE_URL;
    else process.env.PUBLIC_SITE_URL = previous;
  }
}

async function run() {
  /* --- catalogue ------------------------------------------------------- */
  assert.equal(Object.keys(STRIPE_CATALOG).length, 12, 'Expected twelve paid Stripe products');
  assert.equal(STRIPE_CATALOG.benefit.unitAmount, 799);
  assert.equal(STRIPE_CATALOG['compassion-legacy-journal'].unitAmount, 2500);
  assert.equal(STRIPE_CATALOG['church-license'].unitAmount, 14900);

  /* --- cart validation -------------------------------------------------- */
  assert.deepEqual(
    createCheckoutSession.requestedProducts({ items: ['benefit', 'workbook'] }),
    ['benefit', 'workbook'],
  );
  // A repeated ID collapses instead of failing the sale: every line is priced
  // from the catalogue at quantity 1, so the duplicate can cost nobody extra.
  assert.deepEqual(createCheckoutSession.requestedProducts({ items: ['benefit', 'benefit'] }), ['benefit']);
  // A body that arrived unparsed is still a cart.
  assert.deepEqual(createCheckoutSession.requestedProducts('{"items":["benefit"]}'), ['benefit']);
  assert.equal(createCheckoutSession.requestedProducts('not json'), null);
  assert.equal(createCheckoutSession.requestedProducts({ items: ['benefit', 'not-a-product'] }), null);
  assert.equal(createCheckoutSession.requestedProducts({ items: [] }), null);
  assert.deepEqual(
    createCheckoutSession.requestedProducts({ items: Array(13).fill('benefit') }),
    ['benefit'],
    'Thirteen copies of one title are one line, not an oversized cart',
  );
  assert.equal(
    createCheckoutSession.requestedProducts({ items: Object.keys(STRIPE_CATALOG) }).length,
    12,
    'The whole catalogue must fit in one cart',
  );

  /* --- the API version travels with the SDK ----------------------------- */
  // Hand-pinning this is what broke checkout before: the pin fell a whole
  // generation behind the SDK that had to speak it.
  assert.equal(apiVersion(), Stripe.API_VERSION, 'API version must match the installed Stripe SDK');

  /* --- secret key hygiene ----------------------------------------------- */
  await withKey(undefined, async () => {
    assert.deepEqual(readSecretKey(), { ok: false, reason: 'missing' });
  });
  await withKey('   ', async () => {
    assert.equal(readSecretKey().reason, 'missing', 'A whitespace-only key is not configured');
  });
  await withKey('pk_live_abc123', async () => {
    assert.equal(readSecretKey().reason, 'publishable', 'A publishable key must be named as the mistake it is');
  });
  // The regression this project actually hit: a key stored with a trailing
  // newline makes Node refuse the Authorization header, so no request ever
  // reaches Stripe and checkout reports itself as "not connected".
  await withKey('sk_test_abc123\n', async () => {
    const secret = readSecretKey();
    assert.equal(secret.ok, true);
    assert.equal(secret.key, 'sk_test_abc123', 'The key must be trimmed');
    assert.equal(secret.padded, true, 'Surrounding whitespace must be reported');
    assert.equal(secret.mode, 'test');
    assert.doesNotMatch(secret.key, /[\r\n]/, 'A control character in the key breaks the Authorization header');
  });
  await withKey('sk_live_abc123', async () => {
    assert.equal(readSecretKey().mode, 'live');
  });

  /* --- site URL resolution ---------------------------------------------- */
  const headerRequest = { headers: { 'x-forwarded-proto': 'https', 'x-forwarded-host': 'preview.example.com' } };
  await withSiteUrl(undefined, async () => {
    assert.equal(resolveSiteUrl(headerRequest), 'https://preview.example.com');
  });
  await withSiteUrl('https://www.acupofcompassion.com/', async () => {
    assert.equal(resolveSiteUrl(headerRequest), 'https://www.acupofcompassion.com');
  });
  // A bare hostname is what people type; it used to throw and take checkout with it.
  await withSiteUrl('www.acupofcompassion.com', async () => {
    assert.equal(resolveSiteUrl(headerRequest), 'https://www.acupofcompassion.com');
  });
  await withSiteUrl('ftp://files.example.com', async () => {
    assert.throws(() => resolveSiteUrl(headerRequest), /HTTP or HTTPS/);
  });
  await withSiteUrl(undefined, async () => {
    assert.throws(() => resolveSiteUrl({ headers: {} }), /Could not determine the site URL/);
  });

  /* --- method guards ----------------------------------------------------- */
  const wrongCreateMethod = response();
  await createCheckoutSession({ method: 'GET', headers: {} }, wrongCreateMethod);
  assert.equal(wrongCreateMethod.statusCode, 405);
  assert.equal(wrongCreateMethod.headers.Allow, 'POST');

  const wrongStatusMethod = response();
  await stripeStatus({ method: 'POST', headers: {}, query: {} }, wrongStatusMethod);
  assert.equal(wrongStatusMethod.statusCode, 405);
  assert.equal(wrongStatusMethod.headers.Allow, 'GET');

  const invalidCart = response();
  await createCheckoutSession({ method: 'POST', headers: {}, body: { items: ['not-a-product'] } }, invalidCart);
  assert.equal(invalidCart.statusCode, 400);

  /* --- unconfigured deployments say so ----------------------------------- */
  await withKey(undefined, async () => {
    const unconfigured = response();
    await createCheckoutSession({ method: 'POST', headers: {}, body: { items: ['benefit'] } }, unconfigured);
    assert.equal(unconfigured.statusCode, 503);
    assert.match(unconfigured.payload.error, /not configured/i);
  });
  await withKey('pk_test_abc', async () => {
    const wrongKey = response();
    await createCheckoutSession({ method: 'POST', headers: {}, body: { items: ['benefit'] } }, wrongKey);
    assert.equal(wrongKey.statusCode, 503);
    assert.match(wrongKey.payload.error, /publishable key/i);
  });

  /* --- session ID guard --------------------------------------------------- */
  await withKey('sk_test_verification_only', async () => {
    const invalidSession = response();
    await retrieveCheckoutSession({ method: 'GET', query: { session_id: 'not-a-session' } }, invalidSession);
    assert.equal(invalidSession.statusCode, 400);
  });

  /* --- status endpoint ---------------------------------------------------- */
  await withKey('sk_test_abc123\n', async () => {
    await withSiteUrl('acupofcompassion.com', async () => {
      const status = response();
      await stripeStatus({ method: 'GET', headers: {}, query: {} }, status);
      assert.equal(status.statusCode, 200);
      assert.equal(status.payload.configured, true);
      assert.equal(status.payload.keyMode, 'test');
      assert.equal(status.payload.keyHadSurroundingWhitespace, true);
      assert.equal(status.payload.siteUrl, 'https://acupofcompassion.com');
      assert.equal(status.payload.apiVersion, Stripe.API_VERSION);
      assert.equal(status.payload.catalogSize, 12);
      // The status endpoint must never hand back key material.
      assert.doesNotMatch(JSON.stringify(status.payload), /sk_test_abc123/);
      // The live probe stays shut without a token, so nobody can make this
      // deployment call Stripe on demand.
      const probe = response();
      await stripeStatus({ method: 'GET', headers: {}, query: { probe: '1' } }, probe);
      assert.equal(probe.payload.probe.run, false);
    });
  });
  await withKey(undefined, async () => {
    const status = response();
    await stripeStatus({ method: 'GET', headers: {}, query: {} }, status);
    assert.equal(status.payload.configured, false);
    assert.equal(status.payload.keyProblem, 'missing');
  });

  console.log('Stripe checkout verification passed: catalogue, key hygiene, site URL, guards, and status');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
