import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import test from 'node:test';

import * as data from '../src/data.js';
import { screens } from '../src/screens.js';
import { state } from '../src/state.js';

const canonicalAuthor = 'Pamella Grear';
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
  assert.equal(journal.assets.cover, '/assets/library/covers/The-Compassion-Legacy-Journal.jpg');
  await access(new URL(`..${journal.assets.pdf}`, import.meta.url));
  await access(new URL(`..${journal.assets.cover}`, import.meta.url));
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

test('checkout requests secure payment and never simulates a card charge', () => {
  state.cart = ['compassion-legacy-journal'];
  const html = screens.checkout();
  assert.match(html, /Request a secure payment link/);
  assert.doesNotMatch(html, /autocomplete="cc-number"|data-purchase/i);
});
