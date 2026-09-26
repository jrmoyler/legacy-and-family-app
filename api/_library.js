'use strict';

/**
 * Where each paid edition lives, and which editions each product delivers.
 *
 * Paid PDFs and EPUBs are not part of the public site. They sit in a private
 * Supabase Storage bucket and are handed out one short-lived signed URL at a
 * time by api/download.js, after the buyer proves ownership. The keys below
 * are object paths inside that bucket, and mirror assets/library/catalog.json.
 *
 * The leading underscore keeps Vercel from turning this module into an
 * endpoint of its own.
 */

const bookFiles = (slug) => ({ pdf: `pdf/${slug}.pdf`, epub: `epub/${slug}.epub` });

const ITEM_FILES = Object.freeze({
  benefit: bookFiles('A-Cup-of-Compassion-01-The-Benefit-of-Having-Compassion'),
  nurtured: bookFiles('A-Cup-of-Compassion-02-Born-or-Nurtured-in-Compassion'),
  legacy: bookFiles('A-Cup-of-Compassion-03-Compassion-and-Legacy'),
  confusion: bookFiles('A-Cup-of-Compassion-04-Compassion-or-Confusion'),
  commitment: bookFiles('A-Cup-of-Compassion-05-Compassion-and-Commitment'),
  companionship: bookFiles('A-Cup-of-Compassion-06-Compassion-and-Companionship'),
  workbook: bookFiles('A-Cup-of-Compassion-Companion-Workbook'),
  'compassion-legacy-journal': { pdf: 'pdf/The-Compassion-Legacy-Journal.pdf' },
});

const SIX_BOOKS = ['benefit', 'nurtured', 'legacy', 'confusion', 'commitment', 'companionship'];

/** Product id (as sold through Stripe) → the edition items it unlocks. */
const PRODUCT_ITEMS = Object.freeze({
  benefit: ['benefit'],
  nurtured: ['nurtured'],
  legacy: ['legacy'],
  confusion: ['confusion'],
  commitment: ['commitment'],
  companionship: ['companionship'],
  'first-three': ['benefit', 'nurtured', 'legacy'],
  workbook: ['workbook'],
  'compassion-legacy-journal': ['compassion-legacy-journal'],
  'six-set': SIX_BOOKS,
  'six-plus-workbook': [...SIX_BOOKS, 'workbook'],
});

/** Storage key for one edition of a product, or null if it does not deliver it. */
function storageKeyFor(productId, itemId, format) {
  if (!Object.hasOwn(PRODUCT_ITEMS, productId)) return null;
  if (!PRODUCT_ITEMS[productId].includes(itemId)) return null;
  const files = ITEM_FILES[itemId];
  return files && Object.hasOwn(files, format) ? files[format] : null;
}

module.exports = { ITEM_FILES, PRODUCT_ITEMS, storageKeyFor };
