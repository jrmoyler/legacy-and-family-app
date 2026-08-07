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
 * 1. No series numbering is asserted as settled. Two numbering schemes are in
 *    conflict and at least three covers claim a "3" (Bible §0.1, §2). Books
 *    carry `seriesLabel` only where the cover and the current scheme agree;
 *    everywhere else it is null and the book is shown by title. The conflicts
 *    are surfaced on the production status screen rather than papered over.
 *
 * 2. Nothing offers to prepare legal documents. Defect L1 (Bible §5) is
 *    unauthorized practice of law. The positioning is fixed: we do not prepare
 *    legal documents, we help families arrive prepared.
 */

import { homeIcon, booksIcon, bookIcon, cartIcon, clipboardIcon } from './icons.js';

/* ==========================================================================
   Brand (Bible §1, §6, §7)
   ========================================================================== */

export const BRAND = {
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
};

/* ==========================================================================
   The books (Bible §2 content status, §8 content spines)
   ========================================================================== */

/**
 * Publication status, which decides whether a book can be bought.
 *   ready       — edited and rebuilt 24 Jul; sellable on its own
 *   bundle-only — complete but short (Bible §5 "Length"); sells inside the set
 *   layout      — manuscript exists, interior not laid out yet
 *   drafting    — content incomplete; must not ship (Bible §4)
 */
export const BOOK_STATUS = {
  ready: { label: 'Available now', tone: 'gold' },
  'bundle-only': { label: 'In the collection', tone: 'teal' },
  layout: { label: 'In production', tone: 'neutral' },
  drafting: { label: 'Being written', tone: 'neutral' },
};

export const BOOKS = [
  {
    id: 'benefit',
    /* Series 1 is the one number nothing disputes. */
    seriesLabel: 'Series 1',
    title: 'The Benefit of Having Compassion',
    designId: 'DAHPs1e2Od0',
    pages: 16,
    words: '≈4,200 words',
    status: 'ready',
    price: 4.99,
    blurb: 'The long one, and the doorway into the series. Compassion as a practice you can learn, modeled on the woman who taught it first.',
    anchor: {
      text: 'If ye have faith as a grain of mustard seed, ye shall say unto this mountain, Remove hence to yonder place; and it shall remove; and nothing shall be impossible unto you.',
      ref: 'Matthew 17:20 · KJV',
    },
    spine: [
      'Compassion learned at home — Pastor Foster as the model',
      'What compassion actually is, and what it costs',
      'Everyday care: kitchen herbs and oils, in the traditional-use framing',
      'The compassion crisis, and why self-compassion comes first',
      'The forty seconds that measurably change a patient’s outcome',
      'Family Keepers, and compassion organised into service',
    ],
    scriptures: ['Matthew 20:34', 'Matthew 15:32', 'Matthew 9:36', 'Matthew 14:14', 'Luke 7:13', 'Mark 1:41'],
    /* Bible §5 defect L2: wellness content needs the traditional-use frame. */
    wellnessNote: true,
  },
  {
    id: 'nurtured',
    /* Bible §2: the cover still prints "BOOK 4"; Pamella is correcting it. */
    seriesLabel: 'Series 2',
    title: 'Are You Born in Compassion or Nurtured in It?',
    designId: 'DAHPtMCqeWs',
    pages: 8,
    words: '≈1,600 words',
    status: 'bundle-only',
    price: null,
    blurb: 'The question the whole series turns on, put to real people and answered in their own words. Short, and meant to be argued with.',
    anchor: {
      text: 'But the fruit of the Spirit is love, joy, peace, longsuffering, gentleness, goodness, faith, Meekness, temperance: against such there is no law.',
      ref: 'Galatians 5:22-23 · KJV',
    },
    spine: [
      'Made in the image — where the argument starts',
      'And where it complicates: all have sinned',
      'Voices for "born in it"',
      'Voices for "nurtured into it"',
      'Compassion as a choice you keep making',
      'Reflection questions, and Pouring the Cup',
    ],
    scriptures: ['Genesis 1:27', 'Romans 3:23', 'Galatians 5:22-23'],
  },
  {
    id: 'legacy',
    /* Bible §2: current covers put this at Series 5, not 3. Not asserted. */
    seriesLabel: null,
    title: 'Compassion and Legacy',
    designId: 'DAHPxYb83RQ',
    pages: 7,
    words: '≈1,800 words',
    status: 'bundle-only',
    price: null,
    flagship: true,
    blurb: 'The flagship idea of the series, and currently its thinnest file. Compassion that outlives you has to be written down.',
    anchor: {
      text: 'A good man leaveth an inheritance to his children’s children: and the wealth of the sinner is laid up for the just.',
      ref: 'Proverbs 13:22 · KJV',
    },
    spine: [
      'What happens to a family with no plan',
      'Compassion is intentional, or it is only a feeling',
      'Generational wealth, defined honestly',
      'Getting started — with a licensed attorney, not with us',
      'The Legacy Inventory, page by page',
    ],
    scriptures: ['Proverbs 13:22'],
    /* Bible §5 defect L1 — the reason this book gets the legal frame. */
    legalNote: true,
  },
  {
    id: 'confusion',
    seriesLabel: null,
    title: 'Compassion or Confusion?',
    designId: 'DAHPpCDXy-s',
    pages: 6,
    words: null,
    status: 'drafting',
    price: null,
    blurb: 'When the impulse to help gets misread, misdirected, or mistaken for something else. The book the series needs and does not yet have.',
    anchor: null,
    spine: [
      'Compassion and enabling are not the same thing',
      'Boundaries as an act of care, not a withdrawal of it',
      'Being taken advantage of, and what that does to a giver',
      'Telling the difference in real time',
    ],
    scriptures: [],
    /* Bible §4: cover is Confusion, body is duplicated Legacy text. */
    contentGap: 'The existing design pairs a Confusion cover with the Compassion and Legacy body text. No standalone manuscript exists yet, so this book is not for sale in any form.',
  },
  {
    id: 'companionship',
    /* Bible §2: cover prints "Book 6". Not asserted as final. */
    seriesLabel: null,
    title: 'Compassion and Companionship',
    designId: 'DAHQDC0Itq0',
    pages: 17,
    words: null,
    status: 'layout',
    price: null,
    blurb: 'Coins a word the series needed: compassionship. Friendship that has carried weight across decades and continents.',
    anchor: {
      text: 'It is of the LORD’s mercies that we are not consumed, because his compassions fail not. They are new every morning: great is thy faithfulness.',
      ref: 'Lamentations 3:22-23 · KJV',
    },
    spine: [
      'Compassionship — naming a thing that had no name',
      'Friendships that survived distance and decades',
      'Milestone birthdays, and showing up for them',
      'Becoming neighbours again',
      'Pamela’s own acts of compassionship',
    ],
    scriptures: ['Ephesians 4:32', 'Psalm 103:13', 'Lamentations 3:22-23'],
    /* Bible §5: names living people; releases required before it ships. */
    rightsNote: true,
  },
  {
    id: 'commitment',
    seriesLabel: null,
    title: 'Compassion, Commitment, and Confinement',
    designId: 'DAHPpbNcwyE',
    pages: 9,
    words: '≈1,200 words',
    status: 'layout',
    price: null,
    blurb: 'For couples. The line between a commitment that holds you and one that confines you — and the daily practices that decide which it becomes.',
    anchor: {
      text: 'Two are better than one; because they have a good reward for their labour… and a threefold cord is not quickly broken.',
      ref: 'Ecclesiastes 4:9-12 · KJV',
    },
    spine: [
      'What compassion is, inside a marriage',
      'What commitment is, when the feeling has gone quiet',
      'When a relationship becomes a confinement — emotional loneliness',
      'Seven daily practices, for each of you',
      'The compassion–commitment cycle',
      'Questions for the two of you, an action plan, and a prayer',
    ],
    scriptures: ['1 Corinthians 13:4-8', 'Ecclesiastes 4:9-12', 'Colossians 3:12-14', 'Ephesians 4:32', 'Mark 10:9'],
  },
];

export const bookById = (id) => BOOKS.find((b) => b.id === id);

/* ==========================================================================
   Shop catalogue (Handoff §5 pricing, §7 build order; Bible §9)
   ========================================================================== */

export const CATEGORIES = ['Free', 'Books', 'Collections', 'Companions'];

/**
 * `buyable: false` means the thing is real but not finished — it shows with
 * its status and no purchase control. Nothing half-built takes money.
 */
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
    note: 'Print it · fill it in at home',
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
    note: 'ePub & PDF · yours forever',
    about: 'The longest book in the series and the natural place to begin — compassion as something taught, practised, and measurable, anchored in Matthew 17:20.',
  },
  {
    id: 'first-three',
    kind: 'Collection',
    title: 'The First Three Books',
    price: 19,
    badge: 'BEST VALUE',
    cats: ['Collections'],
    buyable: true,
    note: '54 pages · ePub & PDF',
    includes: ['benefit', 'nurtured', 'legacy'],
    about: 'The three finished books in one 54-page interior: The Benefit of Having Compassion, Are You Born in Compassion or Nurtured in It?, and Compassion and Legacy. Fully edited, scripture standardised to KJV, and laid out at 6×9 with the series design.',
  },
  {
    id: 'workbook',
    kind: 'Workbook',
    title: 'The Companion Workbook',
    price: 19,
    badge: '',
    cats: ['Companions'],
    buyable: true,
    note: '28 pages · printable',
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
    buyable: false,
    status: 'Waiting on the full series',
    note: 'All six books',
    about: 'Every book in the series in one set. It ships when all six exist, and not before — Compassion or Confusion? is still being written, and the series numbering has to be settled across every cover first.',
  },
  {
    id: 'six-plus-workbook',
    kind: 'Collection',
    title: 'Six-Book Set + Companion Workbook',
    price: 67,
    badge: '',
    cats: ['Collections'],
    buyable: false,
    status: 'Waiting on the full series',
    note: 'The whole library',
    about: 'The complete six-book set together with the 28-page Companion Workbook — the full library at the best price per page.',
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
   Production status (Bible §0, §2, §4, §5, §11)
   ========================================================================== */

/**
 * Surfaced, not silently resolved. The Bible is explicit that the numbering
 * conflicts and the Confusion gap are human decisions for Pamella, and that an
 * agent must flag disagreements rather than pick one. This screen is where the
 * app does that flagging instead of inventing a clean 1-6 list.
 */
export const STATUS_GROUPS = [
  {
    id: 'numbering',
    title: 'Series numbering — unresolved',
    severity: 'blocker',
    intro: 'Two numbering schemes are in conflict and at least three designs claim a "3". Nothing in this app asserts a series number except where the current covers and the scheme agree. The set cannot ship until one scheme is locked and every cover, title page, and series page is reconciled to it.',
    items: [
      'The original stated six-book order (Legacy = 3, Confusion = 4) was superseded by the renumbered Canva covers. The current-cover reading puts Confusion at Series 3 and Legacy at Series 5.',
      'DAHPtMCqeWs — Are You Born in Compassion or Nurtured in It? — cover still prints "BOOK 4"; it is Series 2. Being corrected.',
      'DAHPpbNcwyE — Compassion, Commitment, and Confinement — cover prints "Series Book 3", colliding with DAHPpCDXy-s which also claims Book 3.',
      'DAHQDC0Itq0 — Compassion and Companionship — cover prints "Book 6".',
      'The finished 54-page collection is filed as "Books 1-3" but contains The Benefit of Having Compassion, Are You Born in Compassion or Nurtured in It?, and Compassion and Legacy. This app lists it by its three titles rather than by a number range.',
    ],
  },
  {
    id: 'confusion',
    title: 'The Compassion or Confusion? gap',
    severity: 'blocker',
    intro: 'Design DAHPpCDXy-s pairs a Confusion cover with the Compassion and Legacy body text — a duplicate, not a book. No standalone Confusion manuscript exists in the files pulled.',
    items: [
      'Do not export DAHPpCDXy-s as either a Confusion book or a Legacy book without human direction.',
      'Either the real Confusion content gets written, or the design is retired and the slot resolved.',
      'Its footer format is correct and is the only thing worth harvesting from it.',
      'Until it is resolved, the six-book set and the set-plus-workbook bundle cannot be sold. Both are marked unavailable in the shop.',
    ],
  },
  {
    id: 'legal',
    title: 'Legal and claims',
    severity: 'fixed-in-text',
    intro: 'All three defects were fixed in the 24 July rebuilt text and are reflected throughout this app. They are still present in the Canva originals.',
    items: [
      'L1 — the "$50 will / $250 trust / call this number" offer read as an offer to prepare legal documents, which is unauthorized practice of law in Ohio. Replaced everywhere with education, attorney-prepared framing, and the disclaimer. This app sells no legal service of any kind.',
      'L2 — disease claims about cilantro, basil, and dill in Series 1. Reframed as culinary and traditional-use, with a wellness disclaimer and no store links in the body.',
      'L3 — a passage implying a surgeon operated unnecessarily for money, with identifying detail. The experience stays; the motive and the identifying detail are gone.',
      'The vanity phone line is marketing-only and appears nowhere in this app or in any book interior.',
    ],
  },
  {
    id: 'verify',
    title: 'Needs a human to confirm',
    severity: 'open',
    intro: 'Four items no agent should close on its own.',
    items: [
      'F4 — the Compassionomics attribution. Corrected to Cooper University Health Care with Dr. Anthony Mazzarelli, but the institutional affiliation is unverified, so this app credits the book and its authors only and names no institution.',
      'Written releases from everyone quoted in Are You Born in Compassion or Nurtured in It? — these are commercial products now.',
      'Written releases from the living people named in Compassion and Companionship. Until those exist, this app describes that book without naming them.',
      'Whether @acupofcompassion is actually claimed on Instagram and Facebook. It appears in the canonical footer text but is deliberately not linked anywhere in this app.',
    ],
  },
  {
    id: 'production',
    title: 'Production queue',
    severity: 'open',
    intro: 'What is finished, what is drafted, and what is next.',
    items: [
      'Finished and sellable: The Benefit of Having Compassion, the three-book collection, the Companion Workbook, the church licence.',
      'Complete but short — sold inside the collection rather than as paid singles: Are You Born in Compassion or Nurtured in It? (≈1,600 words) and Compassion and Legacy (≈1,800 words).',
      'Compassion and Legacy is the flagship idea and the thinnest file. Expand it first.',
      'Manuscripts drafted, interiors not laid out: Compassion and Companionship, Compassion, Commitment, and Confinement.',
      'Next build in the queue: the Family Legacy Conversation Kit at $27.',
      'Scripture is standardised to KJV throughout, and the app footer carries the canonical contact line.',
    ],
  },
];
