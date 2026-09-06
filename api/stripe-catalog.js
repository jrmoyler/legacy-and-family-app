'use strict';

/**
 * Server-authoritative Stripe catalogue. The browser submits product IDs only;
 * names and prices are resolved here so a customer cannot alter the charge.
 *
 * A product belongs here only once it can actually be delivered. The Church &
 * Small-Group Licence ('church-license') is deliberately absent: it has no
 * downloadable editions and no fulfilment process, so a $149 charge would buy
 * nothing. It stays out of this file until fulfilment exists — being unlisted
 * here is what makes it unchargeable, whatever the browser sends.
 */
const STRIPE_CATALOG = Object.freeze({
  benefit: { name: 'The Benefit of Having Compassion', kind: 'eBook', unitAmount: 799 },
  nurtured: { name: 'Are You Born in Compassion or Nurtured in It?', kind: 'eBook', unitAmount: 799 },
  legacy: { name: 'Compassion and Legacy', kind: 'eBook', unitAmount: 799 },
  confusion: { name: 'Compassion or Confusion?', kind: 'eBook', unitAmount: 799 },
  commitment: { name: 'Compassion and Commitment', kind: 'eBook', unitAmount: 799 },
  companionship: { name: 'Compassion and Companionship', kind: 'eBook', unitAmount: 799 },
  'first-three': { name: 'The First Three Books', kind: 'Collection', unitAmount: 1900 },
  workbook: { name: 'The Companion Workbook', kind: 'Workbook', unitAmount: 1900 },
  'compassion-legacy-journal': { name: 'The Compassion Legacy Journal', kind: 'Journal', unitAmount: 2500 },
  'six-set': { name: 'The Complete Six-Book Set', kind: 'Collection', unitAmount: 3900 },
  'six-plus-workbook': { name: 'Six-Book Set + Companion Workbook', kind: 'Collection', unitAmount: 6700 },
});

module.exports = { STRIPE_CATALOG };
