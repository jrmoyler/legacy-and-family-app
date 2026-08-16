/**
 * Static content for the app. Copy lives here so screens stay presentational.
 *
 * Sourced from DESIGN_AND_INFORMATION_BIBLE_Cup_of_Compassion.md and
 * HANDOFF_Cup_of_Compassion_Books_1-3.md. Section references below (§) point
 * back into the Bible so any change can be traced to its source.
 *
 * All strings are plain text (not HTML). Templates run them through esc()
 * from dom.js before injecting, so an ampersand or angle bracket in copy can
 * never break the markup — and the same strings stay safe to use with
 * textContent.
 *
 * TWO RULES THIS FILE ENFORCES, BOTH LOAD-BEARING:
 *
 * 1. The six current publishing editions use the settled Book 1-6 library
 *    sequence shown in their verified download filenames and catalog.
 *
 * 2. Nothing offers to prepare legal documents. The positioning is fixed: we
 *    do not prepare legal documents, we help families arrive prepared.
 */

import {
  homeIcon, booksIcon, bookIcon, cartIcon, clipboardIcon, peopleIcon, shelfIcon,
} from './icons.js';

/* ==========================================================================
   Brand (Bible §1, §6, §7)
   ========================================================================== */

/**
 * Two names live here, and they are not interchangeable.
 *
 * `app` is the product the reader opens: the Compassion Hub. `name` is the
 * publishing imprint and book series the Hub carries — A Cup of Compassion —
 * and it stays on every book footer, disclaimer, and copyright line, because
 * that is what is printed inside the editions themselves.
 */
export const BRAND = {
  app: 'Compassion Hub',
  appBy: 'by Cup of Compassion',
  appFull: 'Compassion Hub by Cup of Compassion',
  name: 'A Cup of Compassion',
  tagline: 'Build it. Document it. Pass it on.',
  author: 'Pamela Foster-Grear',
  authorTagline: 'Author | Legacy Advocate | Community Leader | Compassion Educator',
  publisher: 'Pam Grear Publishing LLC · Columbus, Ohio',
  site: 'www.acupofcompassion.com',
  email: 'pamella@acupofcompassion.com',
  social: '@acupofcompassion',
  closing: 'Keep on giving. Keep on being.',
  blessing: 'Blessings.',
};

/**
 * Pamela's platforms, supplied and confirmed by her directly — which is what
 * the app was waiting on before linking any of them (Bible §11).
 */
export const SOCIAL_LINKS = [
  {
    id: 'instagram',
    label: 'Instagram',
    handle: '@familykeepers',
    url: 'https://www.instagram.com/familykeepers/',
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    handle: '@pamelafostergrear',
    url: 'https://www.tiktok.com/@pamelafostergrear?_r=1&_t=ZT-98gpo4iN0ZB',
  },
  {
    id: 'youtube',
    label: 'YouTube',
    handle: '@acupofcompassion7490',
    url: 'https://youtube.com/@acupofcompassion7490?si=qkfTArSfOUSsmA-u',
  },
];

/** The canonical footer that appears on every book (Bible §1). */
export const FOOTER_LINE = `${BRAND.site} | ${BRAND.email} | ${BRAND.social}`;

/** Verbatim from Bible §7 — do not rewrite. */
export const ABOUT_AUTHOR = [
  'Pamela Foster-Grear is the founder of A Cup of Compassion, a movement dedicated to helping individuals and families live with purpose, lead with compassion, and leave a meaningful legacy for generations to come. For more than three decades, Pamela has served her community through nonprofit leadership, family advocacy, caregiving support, business development, and educational outreach. Her life’s work has been centered on one simple belief: compassion should not end with today — it should become tomorrow’s inheritance.',
  'As an author, speaker, and educator, Pamela teaches that legacy is far more than financial wealth. It is the intentional passing down of love, wisdom, faith, family values, assets, and opportunity. Through her writing, workshops, and educational resources, she encourages families to prepare with purpose — to have the conversations, and create the documents, that preserve both relationships and generational wealth.',
  'Pamela believes every family deserves more than memories. They deserve a roadmap that protects what generations have worked so hard to build.',
];

/** Verbatim from Bible §7. */
export const PERSONAL_INVITATION =
  'If this book has encouraged you, do not let the conversation end here. Take the next step toward protecting your family, preserving your values, and creating a lasting legacy. Your greatest gift may not be what you leave behind. It may be the preparation you make today.';

/** Verbatim from Bible §7 — the fix for defect L1. */
export const LEGAL_POSITIONING = 'We do not prepare legal documents. We help families arrive prepared.';

/* ==========================================================================
   Navigation
   ========================================================================== */

export const TABS = [
  { id: 'home', label: 'Home', icon: homeIcon },
  { id: 'series', label: 'Series', icon: booksIcon },
  { id: 'read', label: 'Read', icon: bookIcon },
  { id: 'legacy', label: 'Legacy', icon: clipboardIcon },
  { id: 'shop', label: 'Shop', icon: cartIcon },
];

/**
 * Tools: the two screens that are about the reader's own material and the
 * people around it, rather than about the series. They hang off one button in
 * the sidebar and one tab on a phone.
 */
export const TOOLS = [
  {
    id: 'library',
    label: 'My Library',
    icon: shelfIcon,
    blurb: 'Everything you have saved or bought, with both file formats ready to download.',
  },
  {
    id: 'network',
    label: 'Network',
    icon: peopleIcon,
    blurb: 'The people Pamela works alongside, and how to reach each of them directly.',
  },
];

/** Which nav tab should read as current for a given screen. */
export const TAB_OF = {
  home: 'home',
  series: 'series',
  book: 'series',
  read: 'read',
  lesson: 'read',
  legacy: 'legacy',
  shop: 'shop',
  product: 'shop',
  cart: 'shop',
  checkout: 'shop',
  'checkout-done': 'shop',
  tools: 'tools',
  library: 'tools',
  network: 'tools',
};

/* ==========================================================================
   File formats
   ========================================================================== */

/**
 * Every paid title ships as both a PDF and an EPUB, and the reader says which
 * one they actually want before they buy. `both` is the default because it
 * costs the same and covers the reader who prints at home and reads on a phone.
 */
export const FORMATS = [
  { id: 'both', label: 'Both formats', sub: 'PDF and EPUB — recommended' },
  { id: 'pdf', label: 'PDF only', sub: 'Fixed layout, best for printing' },
  { id: 'epub', label: 'EPUB only', sub: 'Reflowable, best for e-readers and phones' },
];

export const DEFAULT_FORMAT = 'both';
export const FORMAT_IDS = FORMATS.map((f) => f.id);
export const formatById = (id) => FORMATS.find((f) => f.id === id);
/** Short form for cart lines and library rows. */
export const FORMAT_SHORT = { both: 'PDF + EPUB', pdf: 'PDF', epub: 'EPUB' };

/* ==========================================================================
   The books and their verified download editions
   ========================================================================== */

export const BOOK_STATUS = {
  ready: { label: 'Available now', tone: 'gold' },
  'bundle-only': { label: 'In the collection', tone: 'teal' },
  layout: { label: 'In production', tone: 'neutral' },
  drafting: { label: 'Being written', tone: 'neutral' },
};

/**
 * Every publication is addressed by one slug. The two download editions and
 * the two cover renditions all hang off it, so a title can never end up with
 * a PDF from one book and a cover from another.
 *
 * The covers are the production cover art lifted out of the EPUBs at
 * 1600 x 2560 by tools/extract_library_covers.py, with a 640px thumbnail for
 * grids. Both are listed with checksums in assets/library/catalog.json.
 */
const bookAssets = (slug) => ({
  epub: `/assets/library/epub/${slug}.epub`,
  pdf: `/assets/library/pdf/${slug}.pdf`,
  cover: `/assets/library/covers/${slug}.jpg`,
  coverThumb: `/assets/library/covers/thumbs/${slug}.jpg`,
});

export const BOOKS = [
  {
    id: 'benefit', seriesLabel: 'Book 1', title: 'The Benefit of Having Compassion', designId: 'DAHPs1e2Od0',
    pages: 25, words: '≈4,200 words', status: 'ready', price: 4.99,
    assets: bookAssets('A-Cup-of-Compassion-01-The-Benefit-of-Having-Compassion'),
    blurb: 'The doorway into the series: compassion as a practice you can learn, model, and make visible.',
    anchor: { text: 'If ye have faith as a grain of mustard seed, ye shall say unto this mountain, Remove hence to yonder place; and it shall remove; and nothing shall be impossible unto you.', ref: 'Matthew 17:20 · KJV' },
    spine: ['Compassion learned at home - Pastor Foster as the model', 'What compassion actually is, and what it costs', 'Everyday care: kitchen herbs and oils, in traditional-use framing', 'The compassion crisis, and why self-compassion comes first', 'The forty seconds that measurably change a patient’s outcome', 'Family Keepers, and compassion organised into service'],
    scriptures: ['Matthew 20:34', 'Matthew 15:32', 'Matthew 9:36', 'Matthew 14:14', 'Luke 7:13', 'Mark 1:41'], wellnessNote: true,
  },
  {
    id: 'nurtured', seriesLabel: 'Book 2', title: 'Are You Born in Compassion or Nurtured in It?', designId: 'DAHPtMCqeWs',
    pages: 22, words: '≈1,600 words', status: 'ready', price: 4.99,
    assets: bookAssets('A-Cup-of-Compassion-02-Born-or-Nurtured-in-Compassion'),
    blurb: 'The question the whole series turns on, put to real people and answered in their own words.',
    anchor: { text: 'But the fruit of the Spirit is love, joy, peace, longsuffering, gentleness, goodness, faith, Meekness, temperance: against such there is no law.', ref: 'Galatians 5:22-23 · KJV' },
    spine: ['Made in the image - where the argument starts', 'And where it complicates: all have sinned', 'Voices for “born in it”', 'Voices for “nurtured into it”', 'Compassion as a choice you keep making', 'Reflection questions, and Pouring the Cup'],
    scriptures: ['Genesis 1:27', 'Romans 3:23', 'Galatians 5:22-23'],
  },
  {
    id: 'legacy', seriesLabel: 'Book 3', title: 'Compassion and Legacy', designId: 'DAHPxYb83RQ',
    pages: 26, words: '≈1,800 words', status: 'ready', price: 4.99,
    assets: bookAssets('A-Cup-of-Compassion-03-Compassion-and-Legacy'), flagship: true,
    blurb: 'Compassion that outlives you has to be written down. A practical invitation to prepare with purpose.',
    anchor: { text: 'A good man leaveth an inheritance to his children’s children: and the wealth of the sinner is laid up for the just.', ref: 'Proverbs 13:22 · KJV' },
    spine: ['What happens to a family with no plan', 'Compassion is intentional, or it is only a feeling', 'Generational wealth, defined honestly', 'Getting started with a licensed attorney', 'The Legacy Inventory, page by page'],
    scriptures: ['Proverbs 13:22'], legalNote: true,
  },
  {
    id: 'confusion', seriesLabel: 'Book 4', title: 'Compassion or Confusion?', designId: 'DAHPpCDXy-s',
    pages: 15, words: '≈3,100 words', status: 'ready', price: 4.99,
    assets: bookAssets('A-Cup-of-Compassion-04-Compassion-or-Confusion'),
    blurb: 'A reflective guide to recognizing the difference between compassionate love, self-abandonment, and patterns that diminish your voice.',
    anchor: null,
    spine: ['When love starts to feel unclear', 'Compassion is not self-abandonment', 'The pattern tells the truth', 'Boundaries can be gentle and firm', 'Choose the love that lifts'], scriptures: [],
  },
  {
    id: 'commitment', seriesLabel: 'Book 5', title: 'Compassion and Commitment', designId: 'DAHPpbNcwyE',
    pages: 16, words: '≈3,200 words', status: 'ready', price: 4.99,
    assets: bookAssets('A-Cup-of-Compassion-05-Compassion-and-Commitment'),
    blurb: 'A faith-centered relationship guide to practicing compassion, commitment, honest communication, and daily repair.',
    anchor: { text: 'Two are better than one; because they have a good reward for their labour… and a threefold cord is not quickly broken.', ref: 'Ecclesiastes 4:9-12 · KJV' },
    spine: ['A relationship is a daily practice', 'What compassion brings to love', 'Commitment gives love a foundation', 'When a relationship feels like confinement', 'Seven daily practices and an action plan'],
    scriptures: ['1 Corinthians 13:4-8', 'Ecclesiastes 4:9-12', 'Colossians 3:12-14', 'Ephesians 4:32', 'Mark 10:9'],
  },
  {
    id: 'companionship', seriesLabel: 'Book 6', title: 'Compassion and Companionship', designId: 'DAHQDC0Itq0',
    pages: 16, words: '≈3,000 words', status: 'ready', price: 4.99,
    assets: bookAssets('A-Cup-of-Compassion-06-Compassion-and-Companionship'),
    blurb: 'Companionship is compassion that stays: friendship that has carried weight across decades, distance, and ordinary days.',
    anchor: { text: 'It is of the LORD’s mercies that we are not consumed, because his compassions fail not. They are new every morning: great is thy faithfulness.', ref: 'Lamentations 3:22-23 · KJV' },
    spine: ['Compassionship: naming a kind of friendship that stays', 'Friendships that survive distance and decades', 'Milestones, memory, and showing up', 'Becoming neighbours again', 'Acts of compassionship in ordinary life'],
    scriptures: ['Ephesians 4:32', 'Psalm 103:13', 'Lamentations 3:22-23'],
  },
];

export const bookById = (id) => BOOKS.find((b) => b.id === id);

/* ==========================================================================
   Shop catalogue (Handoff §5 pricing, §7 build order; Bible §9)
   ========================================================================== */

export const CATEGORIES = ['Free', 'Books', 'Collections', 'Companions'];

/** `buyable: false` is reserved for future products that are not yet built. */
export const PRODUCTS = [
  {
    id: 'inventory-worksheet',
    kind: 'Free worksheet',
    title: 'The Legacy Inventory Worksheet',
    price: 0,
    badge: 'FREE',
    cats: ['Free'],
    buyable: true,
    free: true,
    goTo: 'legacy',
    assets: bookAssets('A-Cup-of-Compassion-Legacy-Inventory-Workbook'),
    note: '10 pages · PDF & EPUB',
    about: 'Pulled straight out of Compassion and Legacy: every asset, policy, document, heirloom, and story your family will need you to have written down. Open it, print it, and fill it in on paper or on your own device. Nothing you write is sent anywhere.',
  },
  {
    id: 'compassion-card',
    kind: 'Free download',
    title: 'The 40-Second Compassion Card',
    price: 0,
    badge: 'FREE',
    cats: ['Free'],
    buyable: true,
    free: true,
    note: 'One page · bulletin insert',
    about: 'A single page for a church bulletin or a break room wall: what forty seconds of real attention does for a person, and the four things to do with them.',
  },
  {
    id: 'benefit',
    kind: 'eBook',
    title: 'The Benefit of Having Compassion',
    price: 4.99,
    badge: 'START HERE',
    cats: ['Books'],
    buyable: true,
    book: 'benefit',
    note: 'PDF & EPUB · yours forever',
    about: 'The longest book in the series and the natural place to begin — compassion as something taught, practised, and measurable, anchored in Matthew 17:20.',
  },
  {
    id: 'nurtured', kind: 'eBook', title: 'Are You Born in Compassion or Nurtured in It?', price: 4.99,
    badge: '', cats: ['Books'], buyable: true, book: 'nurtured', note: 'PDF & EPUB · yours forever',
    about: 'A thoughtful exploration of where compassion begins, how it is practiced, and the examples that help it grow.',
  },
  {
    id: 'legacy', kind: 'eBook', title: 'Compassion and Legacy', price: 4.99,
    badge: '', cats: ['Books'], buyable: true, book: 'legacy', note: 'PDF & EPUB · yours forever',
    about: 'A practical invitation to prepare with purpose and make care visible in the plans, stories, and conversations you leave behind.',
  },
  {
    id: 'confusion', kind: 'eBook', title: 'Compassion or Confusion?', price: 4.99,
    badge: '', cats: ['Books'], buyable: true, book: 'confusion', note: 'PDF & EPUB · yours forever',
    about: 'A reflective guide to clear boundaries, self-respect, and the difference between love that lifts and patterns that diminish.',
  },
  {
    id: 'commitment', kind: 'eBook', title: 'Compassion and Commitment', price: 4.99,
    badge: '', cats: ['Books'], buyable: true, book: 'commitment', note: 'PDF & EPUB · yours forever',
    about: 'A faith-centered guide to honest communication, daily repair, and the practices that give relationships a dependable foundation.',
  },
  {
    id: 'companionship', kind: 'eBook', title: 'Compassion and Companionship', price: 4.99,
    badge: '', cats: ['Books'], buyable: true, book: 'companionship', note: 'PDF & EPUB · yours forever',
    about: 'A warm reflection on friendship, belonging, and the ordinary ways people show up for one another across seasons of life.',
  },
  {
    id: 'first-three',
    kind: 'Collection',
    title: 'The First Three Books',
    price: 19,
    badge: 'BEST VALUE',
    cats: ['Collections'],
    buyable: true,
    note: 'Books 1-3 · PDF & EPUB',
    includes: ['benefit', 'nurtured', 'legacy'],
    about: 'The first three books in the series: The Benefit of Having Compassion, Are You Born in Compassion or Nurtured in It?, and Compassion and Legacy. Each edition is included in both PDF and EPUB formats.',
  },
  {
    id: 'workbook',
    kind: 'Workbook',
    title: 'The Companion Workbook',
    price: 19,
    badge: '',
    cats: ['Companions'],
    buyable: true,
    assets: bookAssets('A-Cup-of-Compassion-Companion-Workbook'),
    note: '28 pages · PDF & EPUB',
    about: 'Seven parts for every book in the series: overview, key concepts, reflection, a guided exercise, journaling pages, a discussion guide, and action steps. Built for kitchen tables and small groups alike.',
  },
  {
    id: 'church-license',
    kind: 'Group licence',
    title: 'Church & Small-Group Licence',
    price: 149,
    badge: '',
    cats: ['Collections'],
    buyable: true,
    note: '25 copies · one invoice',
    about: 'Twenty-five copies of the collection for a congregation, a ministry, or a small group, on a single invoice. One study, one language, everybody on the same page.',
  },
  {
    id: 'six-set',
    kind: 'Collection',
    title: 'The Complete Six-Book Set',
    price: 39,
    badge: '',
    cats: ['Collections'],
    buyable: true,
    note: 'All six books · PDF & EPUB',
    includes: ['benefit', 'nurtured', 'legacy', 'confusion', 'commitment', 'companionship'],
    about: 'Every finished book in the A Cup of Compassion series, delivered in both PDF and EPUB formats.',
  },
  {
    id: 'six-plus-workbook',
    kind: 'Collection',
    title: 'Six-Book Set + Companion Workbook',
    price: 67,
    badge: '',
    cats: ['Collections'],
    buyable: true,
    note: 'Six books + workbook · PDF & EPUB',
    includes: ['benefit', 'nurtured', 'legacy', 'confusion', 'commitment', 'companionship'],
    includesProducts: ['workbook'],
    about: 'The complete six-book set together with the 28-page Companion Workbook, all in PDF and EPUB formats.',
  },
  {
    id: 'conversation-kit',
    kind: 'Toolkit',
    title: 'The Family Legacy Conversation Kit',
    price: 27,
    badge: 'NEXT',
    cats: ['Companions'],
    buyable: false,
    status: 'In production',
    note: 'Scripts & checklists',
    about: 'Word-for-word scripts for raising estate planning with a parent who will not discuss it, a sibling who resents it, or an adult child who thinks it is morbid — plus the inventory and a first-72-hours checklist.',
  },
  {
    id: 'devotional',
    kind: 'Devotional',
    title: 'The 30-Day Compassion Devotional',
    price: 17,
    badge: '',
    cats: ['Companions'],
    buyable: false,
    status: 'Planned',
    note: '30 days · KJV',
    about: 'A month of short readings, each anchored in a KJV passage, each ending with one thing to actually do that day.',
  },
  {
    id: 'caregiving',
    kind: 'Guide',
    title: 'Compassion in Caregiving: Burnout & Boundaries',
    price: 17,
    badge: '',
    cats: ['Companions'],
    buyable: false,
    status: 'Planned',
    note: 'For family caregivers',
    about: 'For the daughter who became a nurse overnight and the husband who has not slept properly in two years. What burnout does, what boundaries protect, and why neither is a failure of love.',
  },
  {
    id: 'leaders-kit',
    kind: 'Leader’s kit',
    title: 'Church & Small-Group Leader’s Kit',
    price: 97,
    badge: '',
    cats: ['Companions'],
    buyable: false,
    status: 'Planned',
    note: 'Six sessions · slides',
    about: 'Everything a ministry leader needs to run the series as a six-week study: session plans, discussion prompts, slides, and handouts.',
  },
  {
    id: 'youth',
    kind: 'Edition',
    title: 'Youth & School Edition',
    price: 47,
    badge: '',
    cats: ['Companions'],
    buyable: false,
    status: 'Planned',
    note: 'Classroom-ready',
    about: 'The series rewritten for younger readers, with classroom activities and a family take-home page for each unit.',
  },
  {
    id: 'training-deck',
    kind: 'Training',
    title: 'Caregiver Team Training Deck',
    price: 149,
    badge: '',
    cats: ['Companions'],
    buyable: false,
    status: 'Planned',
    note: 'For agencies & facilities',
    about: 'A staff training deck for home-care agencies and residential facilities — compassion as a measurable clinical practice, not a personality trait.',
  },
];

export const productById = (id) => PRODUCTS.find((p) => p.id === id);

/** Every buyable book, in series order — the six individual editions. */
export const BOOK_PRODUCTS = BOOKS
  .map((book) => PRODUCTS.find((p) => p.book === book.id))
  .filter(Boolean);

/**
 * The publications a product delivers, each with its downloads and cover art.
 * One title for a single book or workbook; every included title for a set.
 * Drives both the download panel and the cover previews.
 */
export function titlesForProduct(product) {
  const titles = [];
  const add = (title, assets) => {
    if (assets && !titles.some((t) => t.assets.pdf === assets.pdf)) titles.push({ title, assets });
  };

  if (product.book) {
    const book = bookById(product.book);
    if (book) add(book.title, book.assets);
  }
  add(product.title, product.assets);
  (product.includes || []).map(bookById).filter(Boolean)
    .forEach((book) => add(book.title, book.assets));
  (product.includesProducts || []).map(productById).filter(Boolean)
    .forEach((included) => add(included.title, included.assets));

  return titles;
}

/* ==========================================================================
   Free reading (drawn from the content spines, Bible §8)
   ========================================================================== */

export const LESSONS = [
  {
    id: 'forty-seconds',
    featured: true,
    glyph: '40',
    title: 'The forty seconds that change everything',
    mins: '4 min read',
    from: 'The Benefit of Having Compassion',
    verse: {
      text: 'So Jesus had compassion on them, and touched their eyes: and immediately their eyes received sight, and they followed him.',
      ref: 'Matthew 20:34 · KJV',
    },
    body: [
      'There is a finding that comes up again and again in the research on clinical compassion, and it is almost annoyingly small: about forty seconds. Forty seconds of undivided, unhurried attention from a caregiver measurably changes how a patient experiences their illness — their anxiety, their pain, their willingness to follow through on what they were told to do.',
      'Forty seconds. Less time than it takes to find a parking space. The research is gathered in Compassionomics, by Stephen Trzeciak and Anthony Mazzarelli, and the part that should stop you is not the size of the effect. It is how cheap the intervention is, and how rarely it happens anyway.',
      'Because compassion is not scarce. Time is not really the problem either. What is scarce is the decision to be fully present with one person for the length of a short song, without reaching for the door handle.',
      'The gospels keep describing this same motion. Jesus sees, he is moved, he stops, he touches. The seeing comes first. Almost everything else in this series follows from that order.',
    ],
    practice: [
      'Put the phone face down and out of reach — not in your hand.',
      'Sit, if the other person is sitting. Standing rushes a conversation whether you mean it to or not.',
      'Ask one question you do not already know the answer to.',
      'Say nothing while they answer it. Nothing at all.',
    ],
  },
  {
    id: 'own-cup',
    glyph: '☕',
    title: 'You cannot pour from a cup you never fill',
    mins: '5 min read',
    from: 'The Benefit of Having Compassion',
    verse: {
      text: 'The LORD is merciful and gracious, slow to anger, and plenteous in mercy.',
      ref: 'Psalm 103:8 · KJV',
    },
    body: [
      'There is a particular kind of tired that belongs to people who are good at caring for others. It does not look like laziness. It looks like competence, right up until it does not.',
      'Kristin Neff’s work names three things that make up self-compassion, and none of them are indulgence. Kindness toward yourself instead of judgement. Recognising that struggle is part of a shared human experience rather than evidence that you specifically are failing. And mindfulness — seeing your own difficulty clearly, without either dramatising it or pretending it is not there.',
      'People who care for others professionally and privately tend to be fluent in all three, on behalf of everybody but themselves. They will sit with a friend’s guilt for an hour and give their own none of the same patience.',
      'The mercy in Psalm 103 is described as plenteous. Not rationed, and not reserved for other people. If you would not say it to someone you love, do not say it to yourself.',
    ],
    practice: [
      'Name the thing you are being hard on yourself about, out loud or on paper.',
      'Say it back the way you would say it to a friend. Notice how much the wording changes.',
      'Ask what you would actually need in order to keep going. Then arrange one piece of it.',
    ],
  },
  {
    id: 'born-or-nurtured',
    glyph: '?',
    title: 'Born in it, or nurtured into it?',
    mins: '5 min read',
    from: 'Are You Born in Compassion or Nurtured in It?',
    verse: {
      text: 'So God created man in his own image, in the image of God created he him; male and female created he them.',
      ref: 'Genesis 1:27 · KJV',
    },
    body: [
      'Ask a room full of people whether compassion is something you are born with, and the room splits. Both halves are certain. Both halves have a story that proves it.',
      'The case for born in it starts in Genesis. Made in the image of a God repeatedly described as merciful — so the capacity is standard issue, installed at the factory, present in everyone whether or not they ever use it.',
      'The case for nurtured into it starts about three verses of human history later. All have sinned. Whatever we were made with, we are demonstrably capable of walking past someone who needs us. Compassion that is never practised atrophies exactly like a muscle.',
      'Paul lists the fruit of the Spirit and every item on it is a behaviour, not a temperament. Longsuffering is not a mood. Gentleness is not a personality type. They are things you do, repeatedly, until they become things you are.',
      'The honest answer is that the question is a false choice, and the useful answer is that it does not matter. You did not choose your starting capacity. You choose today’s.',
    ],
    practice: [
      'Think of the most compassionate person you know. Ask yourself whether they were always that way.',
      'Ask the same question about yourself, ten years ago.',
      'Pick one item from Galatians 5:22-23 and practise only that one, this week.',
    ],
  },
  {
    id: 'confusion',
    glyph: '⚖',
    title: 'When compassion gets confused',
    mins: '4 min read',
    from: 'A series reflection',
    note: 'The book on this theme is still being written. This is a short reflection on the idea, not an extract.',
    verse: {
      text: 'And be ye kind one to another, tenderhearted, forgiving one another, even as God for Christ’s sake hath forgiven you.',
      ref: 'Ephesians 4:32 · KJV',
    },
    body: [
      'Compassion has a shadow, and the shadow looks almost identical from the outside. Both of them say yes. Both of them show up. Both of them cost you something.',
      'The difference is what happens to the other person. Compassion moves someone toward standing up. Enabling holds them exactly where they are, comfortably, indefinitely — and it does it while both of you are calling it love.',
      'Givers get confused about this more than anyone, because the tell is not in the act. It is in the pattern. Once is help. The fortieth time, with no change in either direction, is something else, and refusing to look at it is not tenderheartedness. It is avoidance wearing tenderheartedness as a coat.',
      'A boundary is not the opposite of compassion. It is the shape compassion takes when it intends to still be standing next year.',
    ],
    practice: [
      'Pick one situation where you keep saying yes. Ask what has changed since the first time.',
      'Ask whether your help is moving toward an ending, or has quietly become the arrangement.',
      'Say the smaller yes — the specific, bounded one — instead of the unlimited one.',
    ],
  },
  {
    id: 'legacy-is-more',
    glyph: '✦',
    title: 'Legacy is more than money',
    mins: '6 min read',
    from: 'Compassion and Legacy',
    verse: {
      text: 'A good man leaveth an inheritance to his children’s children: and the wealth of the sinner is laid up for the just.',
      ref: 'Proverbs 13:22 · KJV',
    },
    body: [
      'Read Proverbs 13:22 slowly and notice how far it reaches. Not to his children. To his children’s children. The verse is describing something built to outlast the person who built it, and to outlast the first generation who inherits it.',
      'Most families do not lose what they built through bad luck. They lose it through silence. A house with no will attached goes to probate. Land held by eleven heirs with no agreement between them gets sold at a fraction of its worth because nobody can agree not to sell it. A policy with a former spouse still named as beneficiary pays out exactly as written, regardless of what everybody knew was intended.',
      'None of that is a failure of love. It is a failure of documentation, and it is entirely preventable, and preventing it costs less than most families assume.',
      'But a legacy is also the part no document holds. The recipes. The way your grandmother answered the phone. What your family believes about money, and work, and who you help when you do not have to. That gets passed down too, and it gets passed down whether or not you are deliberate about it.',
      'Compassion that stops when you do was only ever a mood. Written down, arranged, and told to the people who will need it, it becomes an inheritance.',
      'One thing this series will never do is prepare that paperwork for you. We are educators. The documents themselves are drawn up by a licensed attorney in your state, and there is no shortcut around that. What we can do is make sure you walk into that attorney’s office already knowing what you own, what you want, and who you want it to go to.',
    ],
    practice: [
      'Open the Legacy Inventory and fill in one section — just one.',
      'Check the beneficiary named on every policy and retirement account. Beneficiary designations override a will.',
      'Tell one person where your documents are kept. A plan nobody can find is not a plan.',
    ],
  },
  {
    id: 'compassionship',
    glyph: '∞',
    title: 'Compassionship: friendship that carries weight',
    mins: '4 min read',
    from: 'Compassion and Companionship',
    verse: {
      text: 'Like as a father pitieth his children, so the LORD pitieth them that fear him.',
      ref: 'Psalm 103:13 · KJV',
    },
    body: [
      'Some friendships are company. You enjoy each other, you keep up, and if one of you moved away it would be sad and it would also be survivable.',
      'Others are load-bearing. They have been through a diagnosis, a funeral, a divorce, a move across an ocean, and they came out the other side heavier and better. There was no word for that, so this series made one: compassionship.',
      'Compassionship is what happens when friendship and compassion stop being two separate things. It is the friend who books the flight without being asked. Who remembers the anniversary of the hard day. Who tells you the truth in the specific tone that lets you actually hear it.',
      'Lamentations says the LORD’s compassions are new every morning. Not stockpiled. Renewed, daily, by someone who keeps choosing to. Human compassionship works the same way, which is why the long friendships are never the effortless ones. They are the ones somebody kept deciding on.',
    ],
    practice: [
      'Name the person who has carried weight for you. Actually name them.',
      'Tell them. Not a reaction to a photo — a sentence about a specific time they showed up.',
      'Put one hard anniversary in your calendar for someone else, with a reminder.',
    ],
  },
];

export const lessonById = (id) => LESSONS.find((l) => l.id === id);
export const FEATURED_LESSON = LESSONS.find((l) => l.featured);
export const LESSON_TOTAL = LESSONS.length;

/* ==========================================================================
   The Legacy Inventory (Bible §8, §9 — the highest-value reusable asset)
   ========================================================================== */

/**
 * Bible §9 and Handoff §6 are explicit: this ships as something completed on
 * the user's own device, NOT as a web form posting to a server. Storing other
 * families' account and policy details would make this app a target and a
 * data-privacy obligation.
 *
 * So the worksheet asks for nothing. It lists what to gather and the questions
 * to answer, and the only thing the app remembers is which sections you have
 * worked through. No field on this screen accepts an account number.
 */
export const INVENTORY_PRIVACY =
  'This worksheet has no fields to type into, by design. It tells you what to gather and what to ask — you write the answers on paper, or on a document that never leaves your own device. A Cup of Compassion stores none of it, and nothing on this screen is sent anywhere. The only thing saved is a tick against the sections you have finished, kept in this browser.';

export const INVENTORY = [
  {
    id: 'property',
    title: 'What you own',
    sub: 'Home, land, vehicles, business interests',
    prompts: [
      'Every property, with the county it sits in and where the deed is kept.',
      'Whose name is actually on each deed and title — not who everyone assumes.',
      'Vehicles, trailers, equipment, and where the titles live.',
      'Any business interest, and what the operating agreement says happens to it.',
    ],
  },
  {
    id: 'accounts',
    title: 'Accounts',
    sub: 'Banking, retirement, investments',
    prompts: [
      'Each institution and the type of account — not the account number, on this page.',
      'Who is named as beneficiary on each one. Check it, do not assume it.',
      'Anything held jointly, and with whom.',
      'Debts as well as assets: mortgages, loans, cards, anything secured against property.',
    ],
    note: 'Beneficiary designations override a will. An out-of-date one pays exactly as written.',
  },
  {
    id: 'insurance',
    title: 'Insurance',
    sub: 'Life, final expense, long-term care',
    prompts: [
      'Each policy: the carrier, roughly what it covers, and who holds the paperwork.',
      'The named beneficiary on every policy, confirmed this year.',
      'Any employer policy that ends when the job does.',
      'Who to phone to make a claim, and what they will ask for.',
    ],
  },
  {
    id: 'documents',
    title: 'Documents, and where they live',
    sub: 'Will, trust, directives, certificates',
    prompts: [
      'Will, trust, power of attorney, healthcare directive — which exist, and which do not yet.',
      'The attorney who prepared them, and how to reach that office.',
      'Birth, marriage, military, and citizenship records.',
      'Safe deposit box, home safe, or filing cabinet — the location and how to get into it.',
    ],
    note: 'These are prepared by a licensed attorney in your state. This page is how you arrive ready.',
  },
  {
    id: 'heirlooms',
    title: 'Heirlooms and belongings',
    sub: 'The things with meaning and no price',
    prompts: [
      'The ring, the quilt, the tools, the Bible with the handwriting in the front.',
      'For each one: the item, the person, and why — in a single sentence.',
      'Anything two people both expect to receive. Write that down now, not later.',
      'Photographs, and who has the negatives or the files.',
    ],
    note: 'Most family arguments after a death are not about money. They are about a specific object nobody wrote a name beside.',
  },
  {
    id: 'memories',
    title: 'Memories and wishes',
    sub: 'The part no document holds',
    prompts: [
      'The recipes only you make correctly.',
      'The stories your grandchildren will not hear from anyone else.',
      'What your faith has meant, in your own words.',
      'A letter to each person who will need one. Date it and put it with the documents.',
    ],
  },
  {
    id: 'people',
    title: 'The people',
    sub: 'Who carries this out',
    prompts: [
      'Executor, trustee, and guardian — named, asked, and willing.',
      'The attorney, and any accountant or financial adviser.',
      'Who gets called first, and who calls everybody else.',
      'One person who knows this worksheet exists and where to find it.',
    ],
    note: 'A plan nobody can find is not a plan.',
  },
];

/* ==========================================================================
   The network
   ========================================================================== */

/**
 * The people around the series, each with one way to reach them — the email
 * or the website they gave, and nothing they did not.
 *
 * `headshot` is the person's own photo, filed under assets/network/ as
 * `<id>.jpg` at 512 x 512 (see the README there). Where one is still null the
 * card renders a lettered placeholder tile of exactly the same size, so the
 * grid keeps its shape whether a photo has arrived or not.
 */
export const NETWORK = [
  {
    id: 'pamella-grear',
    name: 'Pamella Grear',
    title: 'Compassion Legacy Planner',
    org: BRAND.name,
    email: 'acupofcompassion@gmail.com',
    website: null,
    headshot: null,
    socials: SOCIAL_LINKS,
    note: 'Author of the series and the person behind the Legacy Inventory.',
  },
  {
    id: 'j-douglas-bailey',
    name: 'J. Douglas Bailey',
    title: 'Identity Protection',
    org: null,
    email: 'JLJJ7@yahoo.com',
    website: null,
    headshot: '/assets/network/j-douglas-bailey.jpg',
    socials: [],
    note: 'Identity protection — safeguarding the records a family plan depends on.',
  },
  {
    id: 'james-mann',
    name: 'James Mann',
    title: 'Licensed Insurance Agent',
    org: 'Mann Insurance Group',
    email: null,
    website: 'http://www.manninsurancegroup.com',
    headshot: '/assets/network/james-mann.jpg',
    socials: [],
    note: 'Licensed insurance agent — policies, beneficiaries, and final expense cover.',
  },
  {
    id: 'john-ross-moyler',
    name: 'John-Ross Moyler',
    title: 'AI & Business Consultant',
    org: 'Collective AI',
    email: null,
    website: 'https://collectiveai.info',
    headshot: '/assets/network/john-ross-moyler.jpg',
    socials: [],
    note: 'AI and business consulting — the systems side of building something that lasts.',
  },
];

export const networkById = (id) => NETWORK.find((person) => person.id === id);

/** Nobody on this page prepares legal documents either (Bible §7). */
export const NETWORK_NOTE =
  'These are independent professionals, listed so you can reach them directly. A Cup of Compassion does not employ them, take a commission on their work, or prepare legal documents itself — and listing someone here is an introduction, not an endorsement of any product they sell.';

/* ==========================================================================
   Library status
   ========================================================================== */

export const STATUS_GROUPS = [
  {
    id: 'library',
    title: 'Complete digital library',
    severity: 'fixed-in-text',
    intro: 'Every A Cup of Compassion book is now included in the app in both PDF and EPUB editions, alongside the two companion workbooks.',
    items: [
      'Six individual books, each with a PDF and an EPUB edition, each sold on its own as well as inside the sets.',
      'The Companion Workbook in a 28-page printable PDF and a reflowable EPUB edition.',
      'The Legacy Inventory Workbook in a 10-page printable PDF and a reflowable EPUB edition.',
      'Production cover art for all eight titles at 1600 × 2560, extracted from the EPUB masters and served with a 640px thumbnail.',
      'All download files have a published checksum in the library catalog so damaged or incomplete copies can be detected immediately.',
    ],
  },
  {
    id: 'publication',
    title: 'Publication safeguards',
    severity: 'open',
    intro: 'The library files are complete. These are the ordinary publisher checks to keep current before a public sales launch.',
    items: [
      'Keep the education-only legal framing and disclaimer wherever legacy-planning material is promoted.',
      'Retain the traditional-use wellness framing in Book 1 and avoid presenting it as medical advice.',
      'Pamela’s Instagram, TikTok, and YouTube links are confirmed by her and now linked from the app. Confirm any further platform before adding it.',
      'Everyone on the Network page is listed with the contact detail they supplied. Re-confirm before changing or adding an entry.',
    ],
  },
];
