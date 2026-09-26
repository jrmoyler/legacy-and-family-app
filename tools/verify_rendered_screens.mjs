import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

import { PRODUCTS, BOOKS, LESSONS, FAMILY_PROMPTS, LEGAL_POSITIONING } from '../src/data.js';
import { screens, compassionMessageList } from '../src/screens.js';
import {
  state, addToCart, unlockPurchasedProducts, setLessonPosition, toggleLesson, continueLessonId,
} from '../src/state.js';

const require = createRequire(import.meta.url);
const { PRODUCT_ITEMS, ITEM_FILES } = require('../api/_library.js');

// A restore code the browser would hold (payload only; the server verifies the signature).
const fixtureToken = (ids) => `ch1.${Buffer.from(JSON.stringify({ p: ids, e: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.${'A'.repeat(24)}`;

const LOGO = '/assets/library/brand/a-cup-of-compassion-logo.jpg?v=official-brand-20260818';
const PORTRAIT = '/assets/library/brand/pamella-grear.jpg';

for (const [name, render] of Object.entries(screens)) {
  const html = render();
  assert.equal(typeof html, 'string', `${name} did not return HTML`);
  assert.ok(html.length > 40, `${name} returned an empty screen`);
  assert.ok(!html.includes('undefined'), `${name} rendered an undefined value`);
}

const welcome = screens.welcome();
assert.ok(welcome.includes(LOGO), 'Welcome screen does not use the official logo');

const home = screens.home();
assert.ok(home.includes(LOGO), 'Home screen does not use the official logo');

const about = screens.about();
assert.equal((about.match(new RegExp(PORTRAIT, 'g')) || []).length, 1, 'About must render one canonical portrait');
assert.ok(about.includes(LOGO), 'About footer does not use the official logo');

state.cart = ['benefit'];
const checkout = screens.checkout();
assert.ok(checkout.includes('data-stripe-checkout'), 'Checkout button is not wired to Stripe');
assert.ok(checkout.includes('Pay securely · $7.99'), 'Checkout total is incorrect');
assert.ok(!checkout.includes('mailto:'), 'Legacy email-based checkout remains');

state.checkoutStatus = 'loading';
assert.ok(screens['checkout-success']().includes('Confirming your order'), 'Loading confirmation state is missing');
state.checkoutStatus = 'error';
state.checkoutError = 'Test confirmation error';
assert.ok(screens['checkout-success']().includes('Test confirmation error'), 'Confirmation error state is missing');
state.checkoutStatus = 'ready';
state.checkoutProducts = ['benefit'];
state.checkoutEmail = 'buyer@example.com';
const confirmed = screens['checkout-success']();
assert.ok(confirmed.includes('Payment confirmed'), 'Paid confirmation state is missing');
assert.ok(confirmed.includes('The Benefit of Having Compassion'), 'Purchased product is missing from confirmation');
assert.ok(confirmed.includes('#/product/benefit'), 'Purchased download link is missing');

// No product may offer a Buy button unless it resolves to files a buyer can
// download. The $149 group licence used to charge and deliver nothing.
for (const product of PRODUCTS.filter((p) => p.buyable && !p.free)) {
  const deliverable = product.editions || product.book
    || product.includes?.length || product.includesProducts?.length;
  assert.ok(deliverable, `${product.id} is buyable but has no downloadable editions`);
  // The browser catalogue and the server's file map must agree.
  const items = [product.book, product.editions && product.id, ...(product.includes || []), ...(product.includesProducts || [])]
    .filter(Boolean);
  assert.deepEqual([...PRODUCT_ITEMS[product.id]].sort(), [...new Set(items)].sort(), `${product.id} delivers different files on the server`);
  assert.ok(!product.assets, `${product.id} is paid but carries public asset paths`);
}
for (const book of BOOKS.filter((b) => b.editions)) {
  assert.ok(ITEM_FILES[book.id]?.pdf.endsWith(`${book.editions.slug}.pdf`), `${book.id} storage key does not match its edition`);
}

state.activeProduct = 'church-license';
const licence = screens.product();
assert.ok(!licence.includes('data-buy='), 'The unfulfillable group licence still offers a Buy button');
assert.ok(licence.includes('In production'), 'The group licence does not read as unreleased');
assert.equal(addToCart('church-license'), false, 'The group licence can still be added to the cart');

/* --- #/library: locked, then owned, then owned-without-code ------------ */
state.library = [];
state.restoreTokens = [];
let library = screens.library();
assert.ok(library.includes('Books you buy will live here, on this device. Use a restore code after checkout to bring them to another browser.'),
  'Library empty paid slot copy is missing');
assert.ok(library.includes('data-restore-form'), 'Library restore form is missing');
assert.ok(library.includes('Restore code or Stripe session id'), 'Library restore label is missing');
assert.ok(library.includes('/assets/library/pdf/A-Cup-of-Compassion-Legacy-Inventory-Workbook.pdf'), 'Free workbook is not downloadable from the library');
assert.ok(!library.includes('/api/download?'), 'A locked library must not offer paid downloads');
assert.ok(library.includes('stroke-dasharray'), 'Library is missing the inventory progress ring');
for (const lesson of LESSONS) assert.ok(library.includes(`#/lesson/${lesson.id}`), `Library is missing free lesson ${lesson.id}`);

unlockPurchasedProducts(['first-three']);
state.restoreTokens = [fixtureToken(['first-three'])];
library = screens.library();
assert.ok(library.includes('The First Three Books'), 'Owned product is missing from the library');
assert.equal((library.match(/\/api\/download\?product=first-three/g) || []).length, 6, 'Owned set should offer 3 books × 2 formats');
assert.ok(!library.includes('Books you buy will live here'), 'Owned library still shows the empty slot');
assert.ok(!/href="\/assets\/library\/(pdf|epub)\/A-Cup-of-Compassion-0/.test(library), 'A paid edition links to a static file');

state.restoreTokens = [];
library = screens.library();
assert.ok(!library.includes('/api/download?'), 'Without a restore code, paid links must not render');
assert.ok(library.includes('Restore <small>to download</small>'), 'Owned-without-code rows must point to restore');

state.restoreTokens = [fixtureToken(['first-three'])];
state.activeBook = 'nurtured';
assert.ok(screens.book().includes('/api/download?product=first-three&amp;item=nurtured&amp;format=epub'),
  'A book owned through a collection does not offer its download');
state.activeProduct = 'first-three';
assert.ok(screens.product().includes('/api/download?product=first-three'), 'Owned product page does not use the download API');
state.activeProduct = 'six-set';
const lockedProduct = screens.product();
assert.ok(lockedProduct.includes('Downloads unlock after purchase') && !lockedProduct.includes('/api/download?'),
  'Unowned product exposes downloads');

/* --- free products deliver on the page, never by a toast ------------------ */
for (const id of ['inventory-worksheet', 'compassion-card']) {
  state.activeProduct = id;
  const html = screens.product();
  assert.ok(!html.includes('data-toast') && !/check your email/i.test(html), `${id} still promises an email`);
  assert.ok(!html.includes('data-buy='), `${id} is free but offers a Buy button`);
}
state.activeProduct = 'inventory-worksheet';
assert.ok(/class="btn btn-gold" href="\/assets\/library\/pdf\/A-Cup-of-Compassion-Legacy-Inventory-Workbook\.pdf" download/.test(screens.product()),
  'The free workbook does not download from its primary button');
state.activeProduct = 'compassion-card';
const card = screens.product();
assert.ok(card.includes('data-print') && card.includes('compassion-card-title'), 'The free card is not printable on the page');
assert.ok(card.includes('Put the phone face down'), 'The card does not carry the forty-seconds practice');

/* --- the Legacy Inventory: nothing to type into, plus the family kit ------ */
const legacy = screens.legacy();
assert.ok(!/<input|<textarea|<select|contenteditable/i.test(legacy), 'The Legacy Inventory has a field to type into');
assert.ok(legacy.includes('Sit with your people'), 'Family sitting section is missing');
assert.ok(legacy.includes('Write names, accounts, and wishes on paper. This app will not store them.'), 'Paper rule is missing');
assert.equal((legacy.match(/class="write-lines"/g) || []).length, FAMILY_PROMPTS.length, 'Every family prompt needs ruled lines');
assert.equal(FAMILY_PROMPTS.length, 5, 'Expected five family prompts');
for (const lesson of LESSONS) assert.ok(legacy.includes(`#/lesson/${lesson.id}`), `Family kit is missing lesson ${lesson.id}`);
assert.ok(legacy.includes(LEGAL_POSITIONING), 'Legal positioning is missing from the worksheet');

/* --- continue reading ------------------------------------------------------ */
state.lessonProgress = {};
assert.ok(screens.home().includes('Start here'), 'Home should start with the featured lesson');
setLessonPosition('confusion', 0.42);
assert.equal(continueLessonId(), 'confusion');
const continuing = screens.home();
assert.ok(continuing.includes('Continue reading') && continuing.includes('#/lesson/confusion') && continuing.includes('42% read'),
  'Home does not offer to continue a part-read lesson');
assert.ok(continuing.includes('#/library') && continuing.includes('Open library'), 'Home has no way into the library');
toggleLesson('confusion');
assert.equal(continueLessonId(), null, 'A finished lesson is still offered as Continue');
assert.ok(Object.values(state.lessonProgress).every((entry) => Object.keys(entry).sort().join() === 'pos,read'),
  'Lesson progress may hold only read and pos');

/* --- the message wall -------------------------------------------------------- */
state.compassionMessagesStatus = 'ready';
state.compassionMessages = [
  { id: 1, display_name: 'The Compassion Hub', community: 'A note from us', message: 'Seeded note', created_at: '2026-08-10T00:00:00Z' },
  { id: 2, display_name: 'Ada', community: '', message: 'Older community note', created_at: '2026-08-20T00:00:00Z' },
  { id: 3, display_name: 'Ben', community: 'Columbus', message: 'Newer community note', created_at: '2026-09-01T00:00:00Z' },
];
const wall = compassionMessageList();
assert.ok(wall.indexOf('Seeded note') < wall.indexOf('Newer community note'), 'Seeded notes are not pinned to the top');
assert.ok(wall.indexOf('Newer community note') < wall.indexOf('Older community note'), 'Community notes are not newest first');
state.compassionMessagesStatus = 'error';
assert.ok(compassionMessageList().includes('data-load-messages'), 'The wall error state has no retry');
state.compassionMessagesStatus = 'ready';
state.compassionMessages = [];
assert.ok(compassionMessageList().includes('data-load-messages'), 'The empty wall has no way to check again');

/* --- checkout success shows the restore code ------------------------------- */
state.checkoutStatus = 'ready';
state.checkoutProducts = ['benefit'];
state.checkoutRestoreToken = fixtureToken(['benefit']);
const success = screens['checkout-success']();
assert.ok(success.includes('Save this restore code. It reopens these books on another browser. It cannot open your Legacy Inventory because that never leaves the paper.'),
  'Checkout success does not explain the restore code');
assert.ok(success.includes(state.checkoutRestoreToken) && success.includes('#/library'), 'Restore code or library link missing');

console.log(`Rendered screen verification passed: ${Object.keys(screens).length} routes`);
