/**
 * The same-origin message wall, Margaret's providers, the Daily Cup, and the
 * guard that keeps an undeliverable product off sale.
 *
 *   - api/messages.js applies the Edge Function's rules, never publishes, and
 *     says plainly when it is not configured so the browser can fall back;
 *   - Margaret speaks Claude's Messages API when given an Anthropic key, and
 *     an OpenAI-compatible endpoint otherwise;
 *   - the Daily Cup is the same for everyone on a given day and changes daily;
 *   - no buyable paid product resolves to nothing to download.
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const messages = require('../api/messages.js');
const askMargaret = require('../api/margaret.js');
const { STRIPE_CATALOG } = require('../api/_catalog.js');

globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const { PRODUCTS, productById, titlesForProduct } = await import('../src/data.js');
const { dailyCup } = await import('../src/cards.js');
const { screens } = await import('../src/screens.js');
const { state } = await import('../src/state.js');

const response = () => ({
  headers: {},
  statusCode: 0,
  payload: null,
  setHeader(name, value) { this.headers[name] = value; },
  status(code) { this.statusCode = code; return this; },
  json(payload) { this.payload = payload; return this; },
});

async function withEnv(values, body) {
  const previous = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    return await body();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

async function withFetch(fake, body) {
  const real = globalThis.fetch;
  globalThis.fetch = fake;
  try {
    return await body();
  } finally {
    globalThis.fetch = real;
  }
}

const json = (payload, status = 200) => new Response(JSON.stringify(payload), {
  status, headers: { 'Content-Type': 'application/json' },
});

test('the wall says it is unconfigured, so the browser can fall back', async () => {
  await withEnv({ SUPABASE_SERVICE_ROLE_KEY: undefined }, async () => {
    const res = response();
    await messages({ method: 'GET', headers: {} }, res);
    assert.equal(res.statusCode, 503);
    assert.equal(res.payload.configured, false);
  });
  const wrong = response();
  await messages({ method: 'DELETE', headers: {} }, wrong);
  assert.equal(wrong.statusCode, 405);
});

test('the wall reads approved notes only, with the service key server side', async () => {
  const seen = [];
  await withEnv({ SUPABASE_SERVICE_ROLE_KEY: 'service-key', SUPABASE_URL: 'https://project.supabase.co' }, () =>
    withFetch(async (url, init) => {
      seen.push({ url: String(url), init });
      return json([{ id: '1', display_name: 'Grace', community: null, message: 'You are loved today.', created_at: '2026-10-01' }]);
    }, async () => {
      const res = response();
      await messages({ method: 'GET', headers: {} }, res);
      assert.equal(res.statusCode, 200);
      assert.equal(res.payload.messages.length, 1);
    }));
  assert.match(seen[0].url, /^https:\/\/project\.supabase\.co\/rest\/v1\/compassion_messages\?/);
  assert.match(seen[0].url, /approved=eq\.true/);
  assert.equal(seen[0].init.headers.apikey, 'service-key');
});

test('a submission is validated, rate-limited by the RPC, and stored as pending', async () => {
  assert.equal(messages.validate({ displayName: 'G', message: 'x'.repeat(20), consent: true }).error, 'Please enter your name.');
  assert.ok(messages.validate({ displayName: 'Grace', message: 'short', consent: true }).error);
  assert.ok(messages.validate({ displayName: 'Grace', message: 'Long enough message here.', consent: false }).error);
  assert.match(
    messages.validate({ displayName: 'Grace', message: 'Write me at grace@example.com any time', consent: true }).error,
    /links, email addresses, and phone numbers/,
  );

  const sent = [];
  await withEnv({ SUPABASE_SERVICE_ROLE_KEY: 'service-key', SUPABASE_URL: 'https://project.supabase.co' }, () =>
    withFetch(async (url, init) => {
      sent.push({ url: String(url), body: JSON.parse(init.body) });
      return json('pending');
    }, async () => {
      const res = response();
      await messages({
        method: 'POST',
        headers: { 'x-forwarded-for': '203.0.113.5' },
        body: { displayName: '  Grace ', community: 'Columbus', message: 'Keep going, you are not alone.', consent: true },
      }, res);
      assert.equal(res.statusCode, 202);
      assert.equal(res.payload.status, 'pending');
    }));
  assert.equal(sent[0].url, 'https://project.supabase.co/rest/v1/rpc/submit_compassion_message');
  assert.equal(sent[0].body.p_display_name, 'Grace');
  assert.match(sent[0].body.p_request_fingerprint, /^[0-9a-f]{64}$/);
  assert.ok(!('approved' in sent[0].body), 'a submission must never set approval');

  await withEnv({ SUPABASE_SERVICE_ROLE_KEY: 'service-key' }, () =>
    withFetch(async () => json('rate_limited'), async () => {
      const res = response();
      await messages({
        method: 'POST', headers: {},
        body: { displayName: 'Grace', message: 'Keep going, you are not alone.', consent: true },
      }, res);
      assert.equal(res.statusCode, 429);
    }));
});

test('a honeypot submission writes nothing', async () => {
  let calls = 0;
  await withEnv({ SUPABASE_SERVICE_ROLE_KEY: 'service-key' }, () =>
    withFetch(async () => { calls += 1; return json('pending'); }, async () => {
      const res = response();
      await messages({ method: 'POST', headers: {}, body: { website: 'spam.example', displayName: 'Bot' } }, res);
      assert.equal(res.statusCode, 202);
    }));
  assert.equal(calls, 0);
});

test('Margaret speaks Claude’s Messages API when given an Anthropic key', async () => {
  await withEnv({ MARGARET_API_URL: undefined, MARGARET_API_KEY: undefined, OPENAI_API_KEY: undefined, ANTHROPIC_API_KEY: 'sk-ant-test' }, async () => {
    const config = askMargaret.provider();
    assert.equal(config.kind, 'anthropic');
    assert.equal(config.url, 'https://api.anthropic.com/v1/messages');
    const request = askMargaret.upstreamRequest(config, [
      { role: 'assistant', content: 'Hello' },
      { role: 'user', content: 'Where do I read?' },
    ]);
    assert.equal(request.headers['x-api-key'], 'sk-ant-test');
    assert.equal(request.headers['anthropic-version'], '2023-06-01');
    assert.ok(!request.headers.Authorization, 'an Anthropic key is not sent as a bearer token');
    assert.equal(typeof request.body.system, 'string');
    assert.equal(request.body.messages[0].role, 'user', 'the transcript must open on a user turn');

    const res = response();
    await withFetch(async () => json({ content: [{ type: 'text', text: 'Open Read in the menu.' }] }), () =>
      askMargaret({ method: 'POST', headers: { 'x-forwarded-for': '198.51.100.200' }, body: { question: 'Where do I read?' } }, res));
    assert.equal(res.statusCode, 200);
    assert.equal(res.payload.reply, 'Open Read in the menu.');
  });
});

test('an explicit Margaret endpoint still wins, in the OpenAI shape', async () => {
  await withEnv({ MARGARET_API_URL: 'https://provider.invalid/v1/chat/completions', MARGARET_API_KEY: 'k', ANTHROPIC_API_KEY: 'sk-ant-test' }, () => {
    const config = askMargaret.provider();
    assert.equal(config.kind, 'openai');
    const request = askMargaret.upstreamRequest(config, [{ role: 'user', content: 'hi' }]);
    assert.equal(request.headers.Authorization, 'Bearer k');
    assert.equal(request.body.messages[0].role, 'system');
  });
});

test('the Daily Cup is shared by everyone on a day and changes the next', () => {
  const monday = dailyCup(new Date(2026, 9, 12, 7));
  const mondayNight = dailyCup(new Date(2026, 9, 12, 23));
  const tuesday = dailyCup(new Date(2026, 9, 13, 7));
  assert.deepEqual(monday.verse, mondayNight.verse);
  assert.equal(monday.practice, mondayNight.practice);
  assert.ok(monday.verse.ref !== tuesday.verse.ref || monday.practice !== tuesday.practice);
  assert.match(monday.verse.ref, /KJV/);
  assert.ok(monday.practice.length > 10);
  assert.match(screens.home(), /data-pass-it-on="daily"/);
});

test('no buyable paid product resolves to nothing to download', () => {
  /* The same resolution the product page uses for its download panel. */
  const delivers = (product) =>
    titlesForProduct(product).some(({ assets }) => assets?.pdf || assets?.epub);
  for (const product of PRODUCTS) {
    if (!product.buyable || product.free) continue;
    assert.ok(delivers(product), `${product.id} is for sale but delivers no files`);
    assert.ok(STRIPE_CATALOG[product.id], `${product.id} is for sale but not priced on the server`);
  }
  for (const id of Object.keys(STRIPE_CATALOG)) {
    assert.ok(productById(id)?.buyable, `${id} is chargeable but not offered`);
  }

  state.activeProduct = 'church-license';
  const licence = screens.product();
  assert.ok(!licence.includes('data-buy='), 'the group licence still offers a Buy button');
});

test('the free card is a real download, not a promised email', () => {
  state.activeProduct = 'compassion-card';
  const card = screens.product();
  assert.match(card, /data-pass-it-on="forty"/);
  assert.ok(!card.includes('Check your email'), 'the card still promises an email that is never sent');
});

test('an unreachable wall shows the Hub’s own notes, never just an error', () => {
  state.compassionMessagesStatus = 'error';
  const wall = screens.messages();
  assert.match(wall, /The community wall is resting/);
  assert.match(wall, /You are not alone in this season/);
  assert.match(wall, /data-pass-it-on="note" data-note-id="starter-1"/);
  assert.ok(!wall.includes('undefined'));
  state.compassionMessagesStatus = 'idle';
});

test('the admin list and project URL are read under their common names', async () => {
  const admin = require('../api/_admin.js');
  await withEnv({ ADMIN_EMAILS: undefined, ADMIN_EMAIL: 'Pamella@Example.com' }, () => {
    assert.ok(admin.isAdminEmail('pamella@example.com'));
    assert.ok(!admin.missingConfiguration().includes('ADMIN_EMAILS'));
  });
  await withEnv({ SUPABASE_URL: undefined, PROJECT_URL: 'https://other.supabase.co/' }, () => {
    assert.equal(admin.supabaseUrl(), 'https://other.supabase.co');
  });
});
