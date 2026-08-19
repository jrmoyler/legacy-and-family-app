'use strict';

/**
 * Server-authoritative Stripe catalogue. The browser submits product IDs only;
 * names and prices are resolved here so a customer cannot alter the charge.
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
  'church-license': { name: 'Church & Small-Group Licence', kind: 'Group licence', unitAmount: 14900 },
  'six-set': { name: 'The Complete Six-Book Set', kind: 'Collection', unitAmount: 3900 },
  'six-plus-workbook': { name: 'Six-Book Set + Companion Workbook', kind: 'Collection', unitAmount: 6700 },
});

module.exports = { STRIPE_CATALOG };
