import assert from 'node:assert/strict';

import { PRODUCTS } from '../src/data.js';
import { screens } from '../src/screens.js';
import { state, addToCart } from '../src/state.js';

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
  const deliverable = product.assets || product.book
    || product.includes?.length || product.includesProducts?.length;
  assert.ok(deliverable, `${product.id} is buyable but has no downloadable editions`);
}

state.activeProduct = 'church-license';
const licence = screens.product();
assert.ok(!licence.includes('data-buy='), 'The unfulfillable group licence still offers a Buy button');
assert.ok(licence.includes('In production'), 'The group licence does not read as unreleased');
assert.equal(addToCart('church-license'), false, 'The group licence can still be added to the cart');

console.log(`Rendered screen verification passed: ${Object.keys(screens).length} routes`);
