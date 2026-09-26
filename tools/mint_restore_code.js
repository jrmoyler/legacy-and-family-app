#!/usr/bin/env node
'use strict';

/**
 * Issue a restore code by hand, for a buyer who lost theirs or bought before
 * restore codes existed. Check their Stripe receipt first; this trusts you.
 *
 *   RESTORE_TOKEN_SECRET=... node tools/mint_restore_code.js six-set workbook
 */

const { issueRestoreToken } = require('../api/_restore-token');
const { STRIPE_CATALOG } = require('../api/stripe-catalog');

const ids = process.argv.slice(2);
const unknown = ids.filter((id) => !Object.hasOwn(STRIPE_CATALOG, id));
if (!ids.length || unknown.length) {
  console.error(`Usage: node tools/mint_restore_code.js <product-id>...\nKnown: ${Object.keys(STRIPE_CATALOG).join(', ')}`);
  if (unknown.length) console.error(`Unknown: ${unknown.join(', ')}`);
  process.exit(2);
}

const issued = issueRestoreToken(ids);
if (!issued) {
  console.error('RESTORE_TOKEN_SECRET must be set (32+ characters), the same value as production.');
  process.exit(2);
}
console.log(issued.token);
console.error(`Valid until ${new Date(issued.expiresAt * 1000).toISOString().slice(0, 10)}.`);
