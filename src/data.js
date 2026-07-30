/**
 * Static content for the app. Copy lives here so screens stay presentational.
 *
 * All strings are plain text (not HTML). Templates run them through esc()
 * from dom.js before injecting, so an ampersand or angle bracket in copy can
 * never break the markup — and the same strings stay safe to use with
 * textContent.
 */

import { homeIcon, bookIcon, cartIcon, peopleIcon, cardIcon } from './icons.js';

export const TABS = [
  { id: 'home', label: 'Home', icon: homeIcon },
  { id: 'learn', label: 'Learn', icon: bookIcon },
  { id: 'shop', label: 'Shop', icon: cartIcon },
  { id: 'network', label: 'Network', icon: peopleIcon },
  { id: 'plans', label: 'Plans', icon: cardIcon },
];

/** Which nav tab should read as current for a given screen. */
export const TAB_OF = {
  home: 'home',
  'guide-will': 'home',
  'guide-trust': 'home',
  video: 'home',
  learn: 'learn',
  shop: 'shop',
  product: 'shop',
  cart: 'shop',
  network: 'network',
  plans: 'plans',
  checkout: 'plans',
  'checkout-done': 'plans',
};

export const PLANS = {
  member: {
    title: 'Legacy Membership',
    price: '$39.99',
    per: '/month',
    sub: 'Your legal will included free · cancel anytime.',
    feats: [
      'Your legal will — always free',
      'Free yearly will updates',
      'Member pricing on trusts & legacy plans',
      'Priority access to our advisor network',
    ],
    pay: 'Start membership · $39.99/mo',
  },
  will149: {
    title: 'Will Essentials',
    price: '$149',
    per: 'one-time',
    sub: 'A complete, legal will — done right.',
    feats: [
      'Attorney-reviewed legal will',
      'Plain-language walkthrough',
      'Beneficiaries, executor & guardians',
      'Signed, witnessed & stored safely',
    ],
    pay: 'Pay $149',
  },
  trust249: {
    title: 'Will + Living Trust',
    price: '$249',
    per: 'one-time',
    sub: 'Keep your home and land out of probate court.',
    feats: [
      'Everything in Will Essentials',
      'Living trust setup',
      'Avoid probate, liens & fees',
      'Move deeds & titles in',
    ],
    pay: 'Pay $249',
  },
};

export const PLAN_ORDER = ['member', 'will149', 'trust249'];

export const CATEGORIES = ['Best sellers', 'New', 'eBooks', 'Printables'];

export const PRODUCTS = [
  {
    id: 'bundle',
    mono: 'FL',
    badge: 'BEST VALUE',
    kind: 'Bundle',
    title: 'Family Legacy Complete Bundle',
    price: 129,
    rating: '5.0',
    reviews: '212 reviews',
    cats: ['Best sellers'],
    note: 'Yours forever · instant access',
    about: 'Every guide, course, workbook and toolkit we make — bundled into one complete legacy library at the best price. One purchase, everything your family needs to plant, protect, and pass it on.',
    review: {
      q: 'Bought the bundle for my whole family. We finished our wills in one weekend around the kitchen table.',
      who: 'Denise W. · Verified buyer',
    },
  },
  {
    id: 'wills-guide',
    mono: 'W',
    badge: 'BEST SELLER',
    kind: 'eBook',
    title: 'The Complete Wills & Trusts Guide',
    price: 19,
    rating: '4.9',
    reviews: '168 reviews',
    cats: ['Best sellers', 'eBooks'],
    note: 'Yours forever · instant access',
    about: 'Plain-language answers to every wills and trusts question — what they are, why they matter, and how to put yours in place without the jargon. Written for our families, updated as the law changes.',
    review: {
      q: 'Finally, someone explains this like a neighbor, not a lawyer. I finished my will checklist the same week.',
      who: 'Marcus T. · Verified buyer',
    },
  },
  {
    id: 'gen-wealth',
    mono: 'G',
    badge: '',
    kind: 'Video course',
    title: 'Building Generational Wealth',
    price: 79,
    rating: '4.8',
    reviews: '96 reviews',
    cats: ['Best sellers', 'New'],
    note: 'Lifetime access · 5 modules',
    about: 'A five-module video course on turning what you have into what you leave — budgeting, ownership, life insurance, and passing assets on without losing them to probate or liens.',
    review: {
      q: 'Watched it with my adult kids. First honest money conversation our family has ever had.',
      who: 'Angela R. · Verified buyer',
    },
  },
  {
    id: 'workbook',
    mono: 'L',
    badge: 'NEW',
    kind: 'Printable',
    title: 'Legacy Planning Workbook',
    price: 24,
    rating: '4.9',
    reviews: '74 reviews',
    cats: ['New', 'Printables'],
    note: 'Printable PDF · fill-in pages',
    about: 'A fill-in workbook that walks your family through assets, beneficiaries, and wishes — page by page. Print it, fill it in together, and keep it with your documents.',
    review: {
      q: 'We filled this out at our family reunion. Every household left with a plan started.',
      who: 'Robert & May C. · Verified buyers',
    },
  },
  {
    id: 'checklist',
    mono: 'B',
    badge: '',
    kind: 'Printable',
    title: 'Beneficiary & Asset Checklist',
    price: 9,
    rating: '4.7',
    reviews: '58 reviews',
    cats: ['Printables'],
    note: 'Printable PDF · 6 pages',
    about: 'The one-sitting checklist: every account, deed, policy, and name your executor will need — organized on six printable pages.',
    review: {
      q: 'Simple and thorough. My mother finished hers in an afternoon.',
      who: 'Keisha B. · Verified buyer',
    },
  },
  {
    id: 'talk-family',
    mono: 'T',
    badge: '',
    kind: 'eBook',
    title: 'Talking to Your Family About Money',
    price: 12,
    rating: '4.8',
    reviews: '41 reviews',
    cats: ['New', 'eBooks'],
    note: 'Yours forever · instant access',
    about: 'Scripts and starters for the conversations we put off — inheritance, care plans, and who gets the house — without the argument.',
    review: {
      q: 'Used the opening script at Sunday dinner. It worked.',
      who: 'Pastor J. Alston · Verified buyer',
    },
  },
];

export const productById = (id) => PRODUCTS.find((p) => p.id === id);

export const WILL_STEPS = [
  ['List everything you own', 'Your home, land, accounts, and business.'],
  ['Choose your beneficiaries', 'Decide who receives what — family, charity, or church.'],
  ['Name an executor', 'Someone you trust to carry out your wishes.'],
  ['Sign with witnesses', 'Make it legal — two witnesses and your signature.'],
  ['Store it & tell someone', 'Keep it safe, and make sure your executor knows where.'],
];

export const TRUST_STEPS = [
  ['Decide what goes in', 'Your home, land, and savings can all be protected.'],
  ['Name your trustee', 'The person who will manage the trust for your family.'],
  ['Name your beneficiaries', 'Who the trust is ultimately for.'],
  ['Sign & notarize', 'Make the trust official with a notary.'],
  ['Fund the trust', "Move deeds & titles into the trust's name."],
];

export const WILL_NEEDS = ['A list of assets', 'Beneficiary names', 'An executor', 'Valid ID'];
export const TRUST_NEEDS = ['Property titles', 'A trustee', 'Beneficiary names', '30–60 minutes'];

export const CHAPTERS = [
  ['0:00', 'Opening — protecting our legacy'],
  ['1:20', 'The statistics: 70% have no will, 90% no trust'],
  ['3:05', 'What a will actually does'],
  ['5:12', 'What a living trust actually does'],
  ['7:30', 'Keeping the family home & land'],
  ['9:48', 'Life insurance — leaving more than memories'],
  ['11:32', 'Your next step'],
];

/** Runtime of the presentation, in seconds — drives the progress bar. */
export const VIDEO_SECONDS = 744;

export const LESSONS = [
  { id: 'probate', glyph: 'P', title: 'How probate quietly takes our homes', mins: '5 min read' },
  { id: 'finlit', glyph: '$', title: 'Financial literacy 101: building generational wealth', mins: '6 min read' },
  { id: 'church', glyph: '✝', title: 'Leaving a legacy gift to your church', mins: '4 min read' },
  { id: 'heirs', glyph: 'L', title: "Heirs' property: protecting family land", mins: '5 min read' },
];

/** The featured lesson plus the four in the list. */
export const LESSON_TOTAL = LESSONS.length + 1;

export const ADVISORS = [
  { init: 'JB', name: 'Jonathon Bailey', role: 'Sr. Manager', act: 'Free consult' },
  { init: 'FD', name: 'Fred Decosta', role: 'Sr. Director', act: 'Free consult' },
  { init: 'PG', name: 'Pam Grear', role: 'Sr. Manager · LegalShield Associate', act: 'Visit site' },
  { init: 'JM', name: 'James & Tanisha Mann', role: 'Insurance & Realtor Agents', act: 'Free consult' },
];
