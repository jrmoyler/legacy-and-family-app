import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import test from 'node:test';

import * as data from '../src/data.js';
import { screens } from '../src/screens.js';
import { state } from '../src/state.js';

const canonicalAuthor = 'Pamella Grear';
const coverRevision = '20260818-pamella-grear-2';
const retiredByline = /Pamell?a\s+Foster-Grear/i;
const misspelledGivenName = /\bPamela\b/i;

function stringsIn(value, seen = new Set()) {
  if (typeof value === 'string') return [value];
  if (!value || typeof value !== 'object' || seen.has(value)) return [];
  seen.add(value);
  return Object.values(value).flatMap((entry) => stringsIn(entry, seen));
}

test('public data uses only the Pamella Grear author byline', () => {
  assert.equal(data.BRAND.author, canonicalAuthor);
  const publicCopy = stringsIn(data).join('\n');
  assert.doesNotMatch(publicCopy, retiredByline);
  assert.doesNotMatch(publicCopy, misspelledGivenName);
});

test('Instagram points to the requested A Cup of Compassion profile', () => {
  const instagram = data.SOCIAL_LINKS.find((link) => link.id === 'instagram');
  assert.deepEqual(instagram, {
    id: 'instagram',
    label: 'Instagram',
    handle: '@acupofcompassion',
    url: 'https://www.instagram.com/acupofcompassion',
  });
});

test('Compassion Legacy Journal is a $37 product on sale for $25', async () => {
  const journal = data.PRODUCTS.find((product) => product.id === 'compassion-legacy-journal');
  assert.ok(journal, 'journal product is missing');
  assert.equal(journal.price, 25);
  assert.equal(journal.originalPrice, 37);
  assert.equal(journal.buyable, true);
  assert.equal(journal.assets.pdf, '/assets/library/pdf/The-Compassion-Legacy-Journal.pdf');
  assert.equal(
    journal.assets.cover,
    `/assets/library/covers/The-Compassion-Legacy-Journal.jpg?v=${coverRevision}`,
  );
  await access(new URL(`..${journal.assets.pdf}`, import.meta.url));
  await access(new URL(`../assets/library/covers/The-Compassion-Legacy-Journal.jpg`, import.meta.url));
});

test('every mobile and desktop cover rendition uses the corrected revision', () => {
  assert.equal(data.COVER_ASSET_REVISION, coverRevision);
  const coverUrls = stringsIn(data).filter((value) =>
    /^\/assets\/library\/covers\/.*\.jpg\?v=/.test(value)
  );
  assert.equal(coverUrls.length, 36, `expected 36 cover references, found ${coverUrls.length}`);
  for (const url of coverUrls) assert.ok(url.endsWith(`?v=${coverRevision}`), url);

  state.category = 'Free';
  const html = screens.shop();
  assert.match(
    html,
    new RegExp(`Legacy-Inventory-Workbook-Illustrated\\.jpg\\?v=${coverRevision}`),
  );
  assert.match(
    html,
    new RegExp(`40-Second-Compassion-Card\\.jpg\\?v=${coverRevision}`),
  );
  assert.equal((html.match(new RegExp(`\\?v=${coverRevision}`, 'g')) || []).length, 24);
  assert.doesNotMatch(html, /Foster-Grear|\bPamela\b/i);
});

test('shop renders journal sale pricing without a duplicate cart control', () => {
  state.category = 'Companions';
  state.cart = [];
  const html = screens.shop();
  assert.match(html, /The Compassion Legacy Journal/);
  assert.match(html, /<s>\$37<\/s>/);
  assert.match(html, /<strong>\$25<\/strong>/);
  assert.doesNotMatch(html, /class="cart-btn"/);
});

test('home does not repeat Pamella portrait thumbnails', () => {
  state.library = [];
  state.saved = [];
  state.inventoryDone = [];
  const html = screens.home();
  assert.equal(html.split(data.BRAND.headshot).length - 1, 0);
});

test('paid journal has one purchase action and no exposed PDF before ownership', () => {
  state.activeProduct = 'compassion-legacy-journal';
  state.cart = [];
  state.library = [];
  const html = screens.product();
  assert.equal((html.match(/data-buy=/g) || []).length, 1);
  assert.doesNotMatch(html, /data-cart-toggle=/);
  assert.doesNotMatch(html, /href="[^"]+\.pdf"/i);
  assert.match(html, /Downloads unlock after purchase/);
});

test('owned journal exposes its PDF and no nonexistent EPUB', () => {
  state.activeProduct = 'compassion-legacy-journal';
  state.cart = [];
  state.library = ['compassion-legacy-journal'];
  const html = screens.product();
  assert.match(html, /href="\/assets\/library\/pdf\/The-Compassion-Legacy-Journal\.pdf"/);
  assert.doesNotMatch(html, /The-Compassion-Legacy-Journal\.epub/);
});

test('book detail does not expose paid editions before ownership', () => {
  state.activeBook = 'benefit';
  state.library = [];
  const html = screens.book();
  assert.doesNotMatch(html, /href="[^"]+\.(pdf|epub)"/i);
  assert.match(html, /available after purchase/i);
});

test('checkout hands off to Stripe and never simulates a card charge', () => {
  state.cart = ['compassion-legacy-journal'];
  const html = screens.checkout();
  assert.match(html, /Secure checkout with Stripe/);
  assert.match(html, /data-stripe-checkout/);
  assert.doesNotMatch(html, /autocomplete="cc-number"|data-purchase/i);
  // The pre-Stripe flow mailed a payment link by hand. Nothing should still ask for that.
  assert.doesNotMatch(html, /Request a secure payment link|mailto:/i);
});

test('a set unlocks every title it contains', () => {
  assert.deepEqual(
    data.entitledProductIds('first-three'),
    ['first-three', 'benefit', 'nurtured', 'legacy'],
  );
  assert.deepEqual(data.entitledProductIds('six-plus-workbook').slice(-1), ['workbook']);
  assert.deepEqual(data.entitledProductIds('benefit'), ['benefit']);
  assert.deepEqual(data.entitledProductIds('no-such-product'), []);

  // Someone who bought the six-book set is not asked to buy book one again.
  state.library = ['six-set'];
  state.cart = [];
  state.activeProduct = 'benefit';
  const product = screens.product();
  assert.doesNotMatch(product, /data-buy=/);
  assert.match(product, /href="[^"]+\.(pdf|epub)"/i);

  state.activeBook = 'benefit';
  assert.doesNotMatch(screens.book(), /available after purchase/i);
});

test('an unowned title stays locked', () => {
  state.library = [];
  state.cart = [];
  state.activeProduct = 'benefit';
  const product = screens.product();
  assert.match(product, /data-buy=/);
  assert.doesNotMatch(product, /href="[^"]+\.(pdf|epub)"/i);

  state.activeBook = 'benefit';
  assert.match(screens.book(), /available after purchase/i);
});

test('only a priced, released title can enter the cart', async () => {
  const { addToCart, state: cartState } = await import('../src/state.js');
  cartState.cart = [];
  assert.equal(addToCart('benefit'), true);
  assert.equal(addToCart('benefit'), false, 'no duplicate lines');
  assert.equal(addToCart('compassion-card'), false, 'free downloads are not sold');
  assert.equal(addToCart('devotional'), false, 'unreleased titles are not sold');
  assert.deepEqual(cartState.cart, ['benefit']);
});
