import assert from 'node:assert/strict';

import { screens } from '../src/screens.js';
import { state } from '../src/state.js';

const LOGO = '/assets/library/brand/a-cup-of-compassion-logo.png?v=official-brand-20260819';
const PORTRAIT = '/assets/network/pamella-grear.jpg';

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
assert.equal((about.match(new RegExp(PORTRAIT, 'g')) || []).length, 2, 'About must render the canonical portrait in the header and the framed prose portrait');
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

console.log(`Rendered screen verification passed: ${Object.keys(screens).length} routes`);
