import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { test } from 'node:test';

import { BUSINESS_CARD } from '../src/data.js';
import { screens } from '../src/screens.js';
import { sidebar, appbar } from '../src/components.js';

const ROOT = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, ROOT), 'utf8');
const card = read('card.html');
const vercel = JSON.parse(read('vercel.json'));

test('the card page and every file it offers exist', () => {
  for (const path of [BUSINESS_CARD.image, BUSINESS_CARD.vcard, '/assets/card/a-cup-of-compassion-emblem.png', '/card.js']) {
    assert.ok(existsSync(new URL(path.slice(1), ROOT)), `${path} is missing`);
  }
  assert.equal(BUSINESS_CARD.href, '/card', 'cleanUrls serves card.html at /card');
  assert.ok(card.includes(`href="${BUSINESS_CARD.vcard}"`), 'card does not link the static vCard');
  assert.ok(card.includes(`href="${BUSINESS_CARD.image}"`), 'card does not offer the image download');
});

test('the card runs under the deployed CSP (no inline script, no remote assets)', () => {
  const csp = vercel.headers.find((h) => h.source === '/(.*)').headers
    .find((h) => h.key === 'Content-Security-Policy').value;
  assert.match(csp, /script-src 'self'/);
  assert.ok(!/<script(?![^>]*\bsrc=)[^>]*>/.test(card), 'card.html has an inline <script>, which the CSP blocks');
  assert.ok(!/\son[a-z]+=/i.test(card), 'card.html has an inline event handler, which the CSP blocks');
  assert.ok(!/(src|href)="data:/.test(card), 'card.html should reference its artwork, not embed it');
  for (const [, src] of card.matchAll(/<(?:img|script)[^>]*\bsrc="([^"]+)"/g)) {
    assert.ok(src.startsWith('/'), `${src} is not served from the site itself`);
  }
});

test('the vCard is valid and matches the card', () => {
  const vcf = read(BUSINESS_CARD.vcard.slice(1));
  assert.ok(vcf.includes('\r\n'), 'vCard lines must end in CRLF');
  const lines = vcf.trim().split('\r\n');
  assert.equal(lines[0], 'BEGIN:VCARD');
  assert.equal(lines.at(-1), 'END:VCARD');
  for (const field of ['FN:Pamella Grear', 'TEL;TYPE=CELL:+13239432287', 'EMAIL;TYPE=INTERNET:pamella@acupofcompassion.com']) {
    assert.ok(lines.includes(field), `vCard is missing ${field}`);
  }
  assert.ok(card.includes('tel:+13239432287') && card.includes('mailto:pamella@acupofcompassion.com'));
  const rule = vercel.headers.find((h) => h.source === '/assets/card/(.*).vcf');
  assert.ok(rule?.headers.some((h) => h.key === 'Content-Type' && h.value.startsWith('text/vcard')), 'vCard needs a text/vcard Content-Type');
});

test('the card is reachable from Home, About, the sidebar, and the phone app bar', () => {
  for (const [where, html] of [['home', screens.home()], ['about', screens.about()], ['sidebar', sidebar()], ['appbar', appbar()]]) {
    assert.ok(html.includes(`href="${BUSINESS_CARD.href}"`), `${where} does not link the business card`);
  }
  for (const [where, html] of [['home', screens.home()], ['about', screens.about()]]) {
    assert.ok(html.includes(`download="${BUSINESS_CARD.imageName}"`), `${where} does not offer the card download`);
    assert.ok(html.includes(`download="${BUSINESS_CARD.vcardName}"`), `${where} does not offer the contact download`);
  }
});
