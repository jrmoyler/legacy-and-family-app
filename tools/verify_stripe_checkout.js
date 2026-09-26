'use strict';

const assert = require('node:assert/strict');
const createCheckoutSession = require('../api/create-checkout-session');
const retrieveCheckoutSession = require('../api/checkout-session');
const restorePurchases = require('../api/restore');
const download = require('../api/download');
const { STRIPE_CATALOG } = require('../api/stripe-catalog');
const { PRODUCT_ITEMS, ITEM_FILES, storageKeyFor } = require('../api/_library');
const { issueRestoreToken, verifyRestoreToken, TTL_SECONDS } = require('../api/_restore-token');

function response() {
  return {
    headers: {},
    statusCode: 0,
    payload: null,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; },
    end() { return this; },
  };
}

function withEnv(values, fn) {
  const previous = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  Object.entries(values).forEach(([key, value]) => {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  });
  const restore = () => Object.entries(previous).forEach(([key, value]) => {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  });
  return Promise.resolve().then(fn).finally(restore);
}

const SECRET = 'verification-only-secret-0123456789abcdef';

async function verifyRestoreCodes() {
  // Without a secret, no code is issued and every code is refused.
  await withEnv({ RESTORE_TOKEN_SECRET: undefined }, () => {
    assert.equal(issueRestoreToken(['benefit']), null);
    assert.equal(verifyRestoreToken('ch1.x.y').error, 'unconfigured');
  });

  await withEnv({ RESTORE_TOKEN_SECRET: SECRET }, async () => {
    const now = Date.UTC(2026, 8, 1);
    const issued = issueRestoreToken(['six-set', 'workbook'], now);
    assert.match(issued.token, /^ch1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{24}$/);
    assert.equal(issued.expiresAt, now / 1000 + TTL_SECONDS);
    assert.equal(TTL_SECONDS, 90 * 24 * 60 * 60, 'Restore codes last 90 days');

    // The payload holds product ids and an expiry — nothing else.
    const payload = JSON.parse(Buffer.from(issued.token.split('.')[1], 'base64url').toString('utf8'));
    assert.deepEqual(Object.keys(payload).sort(), ['e', 'p']);
    assert.deepEqual(payload.p, ['six-set', 'workbook']);

    // A signed fixture is accepted.
    assert.deepEqual(verifyRestoreToken(issued.token, now).productIds, ['six-set', 'workbook']);

    // Expired codes are refused.
    assert.equal(verifyRestoreToken(issued.token, now + (TTL_SECONDS + 1) * 1000).error, 'expired');

    // Forged: a payload granting more, re-used with the old signature.
    const [prefix, , signature] = issued.token.split('.');
    const widened = Buffer.from(JSON.stringify({ p: Object.keys(STRIPE_CATALOG), e: payload.e })).toString('base64url');
    assert.equal(verifyRestoreToken(`${prefix}.${widened}.${signature}`, now).error, 'forged');

    // Forged: signed with a different secret.
    const foreign = await withEnv({ RESTORE_TOKEN_SECRET: 'another-secret-that-is-long-enough-000' },
      () => issueRestoreToken(['six-plus-workbook'], now));
    assert.equal(verifyRestoreToken(foreign.token, now).error, 'forged');

    // Malformed and unsellable products.
    assert.equal(verifyRestoreToken('not-a-code').error, 'malformed');
    assert.equal(issueRestoreToken(['church-license'], now), null, 'Unsellable products never get a code');

    // POST /api/restore
    const wrongMethod = response();
    await restorePurchases({ method: 'GET', body: {} }, wrongMethod);
    assert.equal(wrongMethod.statusCode, 405);

    const forgedRestore = response();
    await restorePurchases({ method: 'POST', body: { code: `${prefix}.${widened}.${signature}` } }, forgedRestore);
    assert.equal(forgedRestore.statusCode, 401, 'A forged restore code must not unlock anything');
    assert.equal(forgedRestore.payload.productIds, undefined);

    const current = issueRestoreToken(['first-three']);
    const goodRestore = response();
    await restorePurchases({ method: 'POST', body: { code: ` ${current.token} ` } }, goodRestore);
    assert.equal(goodRestore.statusCode, 200);
    assert.deepEqual(goodRestore.payload.productIds, ['first-three']);

    const lapsed = issueRestoreToken(['benefit'], Date.now() - (TTL_SECONDS + 60) * 1000);
    const expiredRestore = response();
    await restorePurchases({ method: 'POST', body: { code: lapsed.token } }, expiredRestore);
    assert.equal(expiredRestore.statusCode, 401, 'An expired restore code must not unlock anything');
  });
}

async function verifyDownloads() {
  // Every product Stripe can sell resolves to files, and every file maps back.
  assert.deepEqual(Object.keys(PRODUCT_ITEMS).sort(), Object.keys(STRIPE_CATALOG).sort());
  for (const [productId, items] of Object.entries(PRODUCT_ITEMS)) {
    for (const item of items) assert.ok(storageKeyFor(productId, item, 'pdf'), `${productId}/${item} has no PDF`);
  }
  assert.equal(Object.values(ITEM_FILES).flatMap(Object.values).length, 15, 'Expected 15 paid editions');
  assert.equal(storageKeyFor('benefit', 'nurtured', 'pdf'), null, 'A product must not unlock another book');
  assert.equal(storageKeyFor('compassion-legacy-journal', 'compassion-legacy-journal', 'epub'), null);

  await withEnv({ RESTORE_TOKEN_SECRET: SECRET, SUPABASE_SERVICE_ROLE_KEY: undefined }, async () => {
    const call = async (query) => {
      const res = response();
      await download({ method: 'GET', query }, res);
      return res;
    };
    const token = issueRestoreToken(['first-three']).token;

    assert.equal((await call({ product: 'first-three', item: 'benefit', format: 'pdf' })).statusCode, 401,
      'A download without proof of purchase must be refused');
    const forged = token.replace(/.$/, (ch) => (ch === 'A' ? 'B' : 'A'));
    assert.equal((await call({ product: 'first-three', item: 'benefit', format: 'pdf', token: forged })).statusCode, 403,
      'A forged restore code must not download');
    assert.equal((await call({ product: 'six-set', item: 'confusion', format: 'pdf', token })).statusCode, 403,
      'A code must not download a product it does not cover');
    assert.equal((await call({ product: 'first-three', item: 'confusion', format: 'pdf', token })).statusCode, 404,
      'A product must not download an edition it does not include');
    assert.equal((await call({ product: 'first-three', item: 'benefit', format: 'pdf', token })).statusCode, 503,
      'Without private storage configured, downloads must fail closed');

    await withEnv({ SUPABASE_SERVICE_ROLE_KEY: 'service-role-verification-only' }, async () => {
      const realFetch = global.fetch;
      let signed;
      global.fetch = async (url, init) => {
        signed = { url, init };
        return { ok: true, json: async () => ({ signedURL: '/object/sign/library-private/pdf/x.pdf?token=abc' }) };
      };
      try {
        const res = await call({ product: 'first-three', item: 'benefit', format: 'pdf', token });
        assert.equal(res.statusCode, 302);
        assert.equal(res.headers['Cache-Control'], 'no-store');
        assert.match(res.headers.Location, /^https:\/\/zfpjgedcjdhxvdbthikt\.supabase\.co\/storage\/v1\/object\/sign\//);
        assert.match(res.headers.Location, /download=A-Cup-of-Compassion-01-The-Benefit-of-Having-Compassion\.pdf/);
        assert.match(signed.url, /\/object\/sign\/library-private\/pdf\/A-Cup-of-Compassion-01-/);
        const body = JSON.parse(signed.init.body);
        assert.ok(body.expiresIn >= 60 && body.expiresIn <= 120, 'Signed URLs must expire within 60–120 seconds');
      } finally {
        global.fetch = realFetch;
      }
    });
  });
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

  await verifyRestoreCodes();
  await verifyDownloads();

  console.log('Stripe checkout verification passed: catalogue, unfulfillable-product guard, validation, method guards, restore codes, and signed downloads');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
