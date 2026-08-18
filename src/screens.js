/**
 * Screen templates. Each function returns the inner HTML for one screen.
 *
 * Layout rule: full-bleed bands (dark headers, the welcome hero) own the page
 * width; readable content always sits inside a `.shell` so it stays centred and
 * measured on a wide monitor.
 */

import { esc, escBreakable, join } from './dom.js';
import {
  BRAND, BOOKS, BOOK_STATUS, bookById,
  PRODUCTS, CATEGORIES, productById, BOOK_PRODUCTS, titlesForProduct,
  FORMATS, FORMAT_SHORT, DEFAULT_FORMAT,
  LESSONS, FEATURED_LESSON, LESSON_TOTAL, lessonById,
  INVENTORY, INVENTORY_PRIVACY, STATUS_GROUPS,
  ABOUT_AUTHOR, PERSONAL_INVITATION, LEGAL_POSITIONING,
  TOOLS, NETWORK, NETWORK_NOTE, SOCIAL_LINKS, AUTHOR_PORTRAIT, HOME_COVER,
} from './data.js';
import {
  state, inventoryProgress, sectionDone, hasReadLesson,
  inCart, inLibrary, isSaved, formatFor,
} from './state.js';
import {
  backButton, brandFooter, coverArt, hrefFor, hrefForBook, hrefForLesson, hrefForProduct,
} from './components.js';
import { cover, coverMini } from './covers.js';
import {
  cupMark, cupMarkOnDark, chevron, goldCheck, bigCheck,
  starOutline, printIcon, shieldIcon, cartIcon, bookIcon, peopleIcon, messageIcon,
  mailIcon, externalIcon, downloadIcon, bookmarkIcon, shelfIcon,
} from './icons.js';

export const screens = {};

const money = (n) => (Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`);

/* --------------------------------------------------------------------------
   Downloads
   -------------------------------------------------------------------------- */

/**
 * The two download links, shown according to the format the reader chose. The
 * format is a preference, not a lock: `both` is the default, and a reader who
 * picked one format still sees the other listed as available.
 */
const downloadLinks = (assets, format) => join([
  format !== 'epub' && `<a class="download-link" href="${esc(assets.pdf)}" download>PDF <small>print edition</small></a>`,
  format !== 'pdf' && `<a class="download-link" href="${esc(assets.epub)}" download>EPUB <small>e-reader edition</small></a>`,
]);

const editionDownloadPanel = (editions, heading = 'Download editions', format = DEFAULT_FORMAT) => {
  if (!editions.length) return '';
  return `
  <section class="download-panel" aria-label="${esc(heading)}">
    <span class="cap">${format === 'both' ? 'PDF and EPUB included' : `${esc(FORMAT_SHORT[format])} selected`}</span>
    <h2>${esc(heading)}</h2>
    <p class="download-intro">${format === 'both'
      ? 'Choose PDF for print and fixed layout, or EPUB for comfortable reading on an e-reader or phone.'
      : 'Showing the format you chose. Every title is available in both, so you can switch at any time.'}</p>
    <div class="download-list">
      ${editions.map(({ title, assets }) => `
      <div class="download-row">
        <span class="download-title">${esc(title)}</span>
        <span class="download-actions">${downloadLinks(assets, format)}</span>
      </div>`).join('')}
    </div>
  </section>`;
};

/** Publications that carry download files, for a product's download panel. */
const editionsForProduct = (product) =>
  titlesForProduct(product).filter(({ assets }) => assets?.pdf && assets?.epub);

/** Publications that carry cover art, for a product's cover preview. */
const coversForProduct = (product) =>
  titlesForProduct(product).filter(({ assets }) => assets?.cover);

/**
 * A stack of up to three covers — one title shows one, a set shows its spread.
 *
 * Kits and licences have no photographed cover, and rendering the cup mark for
 * every one of them gave nine catalogue cards the same thumbnail. They get a
 * typographic cover instead, in the same 5:8 slot the real art uses, so the
 * grid keeps one shape and no two items look alike.
 */
const coverStack = (product, sizes = '120px', { mini = false } = {}) => {
  const covers = coversForProduct(product).slice(0, 3);
  if (!covers.length) {
    const stand = mini
      ? coverMini(product)
      : cover(product, { kicker: product.kind, foot: product.free ? 'Free · A Cup of Compassion' : '' });
    return `
    <span class="cover-stack cover-stack-1">
      <span class="cover-slot">${stand}</span>
    </span>`;
  }
  return `
  <span class="cover-stack cover-stack-${covers.length}">
    ${covers.map(({ title, assets }) => `<span class="cover-slot">${coverArt(assets, title, sizes)}</span>`).join('')}
  </span>`;
};

/* ==========================================================================
   Welcome
   ========================================================================== */
screens.welcome = () => `
  <div class="shell welcome-body">
    <div>
      <div class="brand-row">
        <span class="brand-mark">${cupMarkOnDark(32)}</span>
        <span>
          <span class="name">${esc(BRAND.app)}</span>
          <span class="tag">${esc(BRAND.tagline)}</span>
        </span>
      </div>
      <p class="welcome-eyebrow">${esc(BRAND.appFull)} · a series by ${esc(BRAND.author)}</p>
      <h1 class="welcome-h1">Compassion should not end with today.</h1>
      <p class="welcome-copy">Six short books on what compassion is, where it comes from, and how to write it down so it outlives you. Plus the Legacy Inventory — free, printable, and yours alone.</p>
      <div class="welcome-actions">
        <a class="btn btn-gold" href="${hrefFor('home')}">Start reading</a>
        <a class="btn btn-ghost-dark" href="${hrefFor('series')}">See the series</a>
      </div>
      <p class="welcome-foot">Free to read · No account or analytics</p>
    </div>
    <blockquote class="scripture">
      <p>“A good man leaveth an inheritance to his children’s children.”</p>
      <cite>Proverbs 13:22 · KJV</cite>
    </blockquote>
  </div>`;

/* ==========================================================================
   Home
   ========================================================================== */
screens.home = () => {
  const done = inventoryProgress();
  const total = INVENTORY.length;
  const pct = Math.round((done / total) * 100);
  const circumference = 2 * Math.PI * 40;
  const read = state.lessonsRead.length;
  const saved = state.library.length + state.saved.length;

  return `
  <div class="shell">
    <header class="page-head">
      <div>
        <p class="bless">${esc(BRAND.blessing)}</p>
        <h1>${esc(BRAND.app)}</h1>
      </div>
      <a class="avatar-tile" href="${hrefFor('about')}" aria-label="About ${esc(BRAND.author)}">
        <img src="${esc(BRAND.headshot)}" alt="" width="46" height="46">
      </a>
    </header>

    <div class="home-grid">
      <section class="home-cover-intro span-all" aria-labelledby="home-cover-title">
        <a class="home-cover-figure" href="${hrefFor('series')}" aria-label="Explore the A Cup of Compassion series">
          ${coverArt(HOME_COVER, 'A Cup of Compassion', '(min-width: 900px) 230px, 38vw', 'eager')}
        </a>
        <div class="home-cover-copy">
          <span class="pill pill-gold-soft">The complete compassion hub</span>
          <p class="home-cover-kicker">A visual home for a living legacy</p>
          <h2 id="home-cover-title">Compassion can be learned, practiced, documented, and passed on.</h2>
          <p>Begin with six illustrated books, keep going with practical workbooks and resources, and leave the people you love something they can carry forward.</p>
          <a class="home-cover-link" href="${hrefFor('series')}">Explore the complete series ${chevron('#D0AC4C')}</a>
        </div>
      </section>

      <a class="progress-card span-all" href="${hrefFor('legacy')}">
        <span class="ring" aria-hidden="true">
          <svg width="96" height="96" viewBox="0 0 96 96">
            <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(255,255,255,.20)" stroke-width="7"/>
            <circle class="ring-arc" cx="48" cy="48" r="40" fill="none" stroke="#D0AC4C" stroke-width="7" stroke-linecap="round"
              stroke-dasharray="${circumference}"
              style="--arc:${circumference * (1 - pct / 100)};--full:${circumference}"/>
          </svg>
          <span class="pct">${pct}<small>%</small></span>
        </span>
        <span class="body">
          <span class="kicker">The Legacy Inventory</span>
          <span class="big">${done} of ${total} sections gathered</span>
          <span class="sub">What you own, what you hold, and what you want said. Work through it one section at a time — nothing you write goes anywhere but your own paper.</span>
          <span class="go">Open the worksheet ${chevron('#D0AC4C')}</span>
        </span>
      </a>

      <h2 class="star-row span-all">${starOutline(18, '#B08D2E')} Where to begin</h2>

      <a class="market-cta span-all" href="${hrefFor('series')}">
        <span class="icon-tile">${bookIcon(24, '#2A2113', 2)}</span>
        <span class="body">
          <span class="t">Read the series</span>
          <span class="s">Six books on compassion, legacy, and what gets passed on</span>
        </span>
        ${chevron('#2A2113')}
      </a>

      <div class="quick-grid span-all">
        <a class="quick-tile" href="${hrefFor('read')}"><span class="icon-tile it-gold">${bookIcon(22, '#96771F', 1.9)}</span>Free reading<small>${read} of ${LESSON_TOTAL} read</small></a>
        <a class="quick-tile" href="${hrefFor('shop')}"><span class="icon-tile it-teal">${cartIcon(22, '#23636A', 1.9)}</span>The shop<small>Books, sets &amp; kits</small></a>
        <a class="quick-tile" href="${hrefFor('about')}"><span class="icon-tile icon-tile-photo"><img src="${esc(BRAND.headshot)}" alt="" width="44" height="44"></span>About Pamella<small>And the movement</small></a>
        <a class="quick-tile" href="${hrefFor('about')}"><span class="icon-tile it-gold">${peopleIcon(22, '#96771F', 1.9)}</span>About Pamella<small>And the movement</small></a>
        ${quickTile(hrefFor('read'), 'it-gold', bookIcon(22, '#96771F', 1.9), 'Free reading', `${read} of ${LESSON_TOTAL} read`)}
        ${quickTile(hrefFor('shop'), 'it-teal', cartIcon(22, '#23636A', 1.9), 'The shop', 'Books, sets & kits')}
        ${quickTile(hrefFor('library'), 'it-gold', shelfIcon(22, '#96771F', 1.9), 'My Library', `${saved} saved & bought`)}
        ${quickTile(hrefFor('network'), 'it-teal', peopleIcon(22, '#23636A', 1.9), 'Network', `${NETWORK.length} people to call`)}
        ${quickTile(hrefFor('about'), 'it-gold', cupMark(22), 'About Pamella', 'And the movement')}
      </div>

      ${featuredLessonCard()}

      <a class="free-card" href="${hrefForProduct('compassion-card')}">
        <span class="pill pill-gold-soft">Free download</span>
        <span class="t">The 40-Second Compassion Card</span>
        <span class="s">One page for a bulletin or a break room: what forty seconds of real attention does for a person, and the four things to do with them.</span>
        <span class="go">Get the card ${chevron('#D0AC4C')}</span>
      </a>
    </div>
    <div class="screen-foot"></div>
  </div>`;
};

const quickTile = (href, tone, icon, label, sub) => `
  <a class="quick-tile" href="${href}">
    <span class="icon-tile ${tone}" aria-hidden="true">${icon}</span>
    <span class="qt-body">${esc(label)}<small>${esc(sub)}</small></span>
  </a>`;

function featuredLessonCard() {
  const lesson = FEATURED_LESSON;
  return `
  <a class="feature-card" href="${hrefForLesson(lesson.id)}">
    <span class="feature-cover">
      <span class="pill pill-gold">Free to read</span>
      <span class="cover-mark" aria-hidden="true">${cupMarkOnDark(56)}</span>
      <span class="kicker">Start here</span>
      <span class="t">${esc(lesson.title)}</span>
    </span>
    <span class="feature-meta">
      <span>${esc(lesson.mins)} · ${esc(lesson.from)}</span>
      <span class="upd">${hasReadLesson(lesson.id) ? 'Read ✓' : 'New'}</span>
    </span>
  </a>`;
}

/* ==========================================================================
   Messages of Compassion
   ========================================================================== */
const messageDate = new Intl.DateTimeFormat('en-US', {
  month: 'short', day: 'numeric', year: 'numeric',
});

const readableMessageDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : messageDate.format(date);
};

export function compassionMessageList() {
  if (state.compassionMessagesStatus === 'loading') {
    return '<p class="message-wall-state">Gathering messages…</p>';
  }
  if (state.compassionMessagesStatus === 'error') {
    return `
    <div class="message-wall-state message-wall-error">
      <p>The public messages could not be loaded.</p>
      <button class="btn btn-ghost btn-auto" data-load-messages>Try again</button>
    </div>`;
  }
  if (!state.compassionMessages.length) {
    return '<p class="message-wall-state">No approved messages yet. Be the first to leave a little kindness.</p>';
  }
  return state.compassionMessages.map((item) => `
    <article class="compassion-note">
      <span class="quote-mark" aria-hidden="true">“</span>
      <blockquote>${esc(item.message)}</blockquote>
      <footer>
        <span><strong>${esc(item.display_name)}</strong>${item.community ? ` <span class="community">${esc(item.community)}</span>` : ''}</span>
        <time datetime="${esc(item.created_at)}">${esc(readableMessageDate(item.created_at))}</time>
      </footer>
    </article>`).join('');
}

screens.messages = () => `
  <div class="shell messages-page">
    <header class="message-page-head">
      <span class="message-head-mark" aria-hidden="true">${messageIcon(30, '#B08D2E', 1.8)}</span>
      <div>
        <h1>Messages of Compassion</h1>
        <p>Leave a little kindness for someone who may need it today.</p>
      </div>
    </header>

    <div class="messages-layout">
      <section class="message-compose" aria-labelledby="message-form-title">
        <h2 id="message-form-title">Share your message</h2>
        <form data-compassion-form novalidate>
          <label class="message-field">
            <span>Your name</span>
            <input class="field" name="displayName" autocomplete="name" minlength="2" maxlength="60" required placeholder="Your name">
          </label>
          <label class="message-field">
            <span>City or community <small>(optional)</small></span>
            <input class="field" name="community" autocomplete="address-level2" maxlength="80" placeholder="City or community">
          </label>
          <label class="message-field">
            <span>Your message</span>
            <textarea class="field message-textarea" name="message" minlength="15" maxlength="500" required placeholder="Write a short message of encouragement or hope…"></textarea>
          </label>
          <div class="message-counter"><span data-message-count>0</span> / 500</div>
          <p class="message-requirements" id="message-requirements-hint">Enter your name, write at least 15 characters, and confirm the review notice to enable sharing.</p>

          <label class="message-consent">
            <input type="checkbox" name="consent" required>
            <span>I understand this message will be reviewed before it appears publicly.</span>
          </label>

          <label class="message-honeypot" aria-hidden="true">
            Website
            <input name="website" tabindex="-1" autocomplete="off">
          </label>

          <button class="btn btn-message" type="submit" disabled aria-describedby="message-requirements-hint">Share compassion</button>
          <p class="message-review-note">${shieldIcon('#96771F')}Messages are reviewed before appearing.</p>
          <div class="message-form-status" data-message-status role="status" aria-live="polite" hidden></div>
        </form>
      </section>

      <section class="message-wall" aria-labelledby="message-wall-title">
        <div class="message-wall-head">
          <div>
            <h2 id="message-wall-title">Public messages</h2>
            <p>A collection of approved notes shared with our community.</p>
          </div>
          <button class="message-refresh" data-load-messages aria-label="Refresh public messages">Refresh</button>
        </div>
        <div class="compassion-notes" data-compassion-list>
          ${compassionMessageList()}
        </div>
      </section>
    </div>
    <div class="screen-foot"></div>
  </div>`;

/* ==========================================================================
   The series
   ========================================================================== */
screens.series = () => `
  <div class="shell">
    <header class="page-head">
      <div>
        <p class="bless">Six books, one idea</p>
        <h1>The Series</h1>
      </div>
      <span class="count">${BOOKS.length} books</span>
    </header>

    <p class="plans-lede">Compassion learned, questioned, confused, committed to, shared, and finally <b>written down</b>. Each book is short on purpose — meant to be finished in a sitting and argued about afterwards.</p>

    <div class="book-grid">
      ${BOOKS.map(bookRow).join('')}
    </div>

    <div class="note-card" role="note">
      <span class="note-icon" aria-hidden="true">${shieldIcon('#96771F')}</span>
      <span>
        <span class="t">A note on the numbering</span>
        <span class="s">The complete six-book library is now available in both PDF and EPUB editions, with companion workbooks for reflection and family planning. <a href="${hrefFor('status')}">See library verification</a></span>
      </span>
    </div>
    <div class="screen-foot"></div>
  </div>`;

function bookRow(book) {
  const status = BOOK_STATUS[book.status];
  const product = PRODUCTS.find((p) => p.book === book.id && p.buyable);
  return `
  <a class="book-row" href="${hrefForBook(book.id)}">
    <span class="book-cover">
      ${book.assets?.cover ? coverArt(book.assets, book.title, '(min-width: 720px) 96px, 74px') : coverMini(book)}
    </span>
    <span class="body">
      <span class="meta">
        ${book.seriesLabel ? `<span class="num">${esc(book.seriesLabel)}</span>` : ''}
        <span class="tag tag-${status.tone}">${esc(status.label)}</span>
        ${book.flagship ? '<span class="tag tag-neutral">Flagship</span>' : ''}
      </span>
      <span class="t">${esc(book.title)}</span>
      <span class="s">${esc(book.blurb)}</span>
      ${product ? `<span class="row-price">${money(product.price)} on its own · PDF or EPUB</span>` : ''}
    </span>
    ${chevron('#7A6114')}
  </a>`;
}

screens.book = () => {
  const book = bookById(state.activeBook);
  const status = BOOK_STATUS[book.status];
  const product = book.status === 'ready' ? PRODUCTS.find((p) => p.book === book.id) : null;

  return `
  <header class="dark-head">
    <span class="glow" aria-hidden="true"></span>
    <div class="shell">
      ${backButton('series', 'The Series')}
      <p class="eyebrow">${book.seriesLabel ? esc(book.seriesLabel) : esc(BRAND.series)}</p>
      <h1>${esc(book.title)}</h1>
      <p class="lede">${esc(book.blurb)}</p>
    </div>
  </header>

  <div class="shell read-layout">
    <div>
      <div class="tag-row">
        <span class="tag tag-${status.tone}">${esc(status.label)}</span>
        ${book.pages ? `<span class="tag tag-neutral">${book.pages} pages</span>` : ''}
        ${book.words ? `<span class="tag tag-neutral">${esc(book.words)}</span>` : ''}
      </div>

      ${book.anchor ? verse(book.anchor) : ''}

      ${book.contentGap ? `
      <div class="gap-note">
        <h2>Not finished, and not for sale</h2>
        <p>${esc(book.contentGap)}</p>
      </div>` : ''}

      <div class="prose">
        <h2 class="label">What is inside</h2>
        <ul>${book.spine.map((line) => `<li>${esc(line)}</li>`).join('')}</ul>
      </div>

      ${book.scriptures.length ? `
      <div class="prose">
        <h2 class="label">Scripture, KJV throughout</h2>
        <p>${book.scriptures.map(esc).join(' · ')}</p>
      </div>` : ''}

      ${book.wellnessNote ? disclaimerNote('wellness') : ''}
      ${book.legalNote ? disclaimerNote('legal') : ''}
      ${book.rightsNote ? `
      <div class="note-card" role="note">
        <span class="note-icon" aria-hidden="true">${shieldIcon('#96771F')}</span>
        <span>
          <span class="t">Written releases pending</span>
          <span class="s">This book tells the stories of living people by name. Until each of them has signed a release, the names stay out of everything published about it — including this page.</span>
        </span>
      </div>` : ''}
      <div class="screen-foot"></div>
    </div>

    <div>
      ${book.assets?.cover ? `
      <figure class="cover-figure">
        <a href="${esc(book.assets.cover)}" target="_blank" rel="noopener noreferrer">
          ${coverArt(book.assets, book.title, '(min-width: 900px) 380px, 90vw')}
        </a>
        <figcaption>Cover art · <a href="${esc(book.assets.cover)}" target="_blank" rel="noopener noreferrer">view full size</a></figcaption>
      </figure>` : ''}
      ${book.assets ? editionDownloadPanel([{ title: book.title, assets: book.assets }], 'Download this book', product ? formatFor(product.id) : DEFAULT_FORMAT) : ''}
      ${product ? `
      <div class="aside-card" style="margin-top:16px">
        <span class="cap">Available on its own</span>
        <h2>${money(product.price)}</h2>
        <p>${esc(product.note)}. Buy this book by itself, or as part of a set — the choice of PDF or EPUB is yours either way.</p>
        <a class="btn btn-gold" href="${hrefForProduct(product.id)}">Buy this book</a>
      </div>` : `
      <div class="aside-card">
        <span class="cap">${esc(status.label)}</span>
        <h2>${book.status === 'bundle-only' ? 'Inside the collection' : 'Not yet available'}</h2>
        <p>${book.status === 'bundle-only'
          ? 'Short enough that it is sold inside the three-book collection rather than on its own.'
          : 'This one is still being written or laid out. It will appear in the shop when it is genuinely finished, and not before.'}</p>
        ${book.status === 'bundle-only'
          ? `<a class="btn btn-gold" href="${hrefForProduct('first-three')}">See the collection</a>`
          : `<a class="btn btn-ghost" href="${hrefFor('status')}">What is holding it up</a>`}
      </div>`}

      <div class="aside-card" style="margin-top:16px">
        <span class="cap">Free companion</span>
        <h2>The Legacy Inventory</h2>
        <p>Everything your family will need you to have written down — printable, and stored nowhere but your own paper.</p>
        <a class="btn btn-dark" href="${hrefFor('legacy')}">Open the worksheet</a>
      </div>
    </div>
  </div>`;
};

/* ==========================================================================
   Read
   ========================================================================== */
const verse = ({ text, ref }) => `
  <blockquote class="verse">
    <p>${esc(text)}</p>
    <cite>${esc(ref)}</cite>
  </blockquote>`;

function disclaimerNote(kind) {
  const copy = kind === 'wellness'
    ? {
      t: 'On the wellness chapter',
      s: 'Herbs and oils are discussed as kitchen and traditional-use practice. Traditional use is not the same as clinical evidence, none of it is medical advice, and nothing here treats or prevents any disease. Talk to your physician.',
    }
    : {
      t: 'On wills and trusts',
      s: `${LEGAL_POSITIONING} Everything here is education. The documents themselves are drawn up by a licensed attorney in your own state.`,
    };
  return `
  <div class="note-card" role="note">
    <span class="note-icon" aria-hidden="true">${shieldIcon('#96771F')}</span>
    <span>
      <span class="t">${esc(copy.t)}</span>
      <span class="s">${esc(copy.s)} <a href="${hrefFor('disclaimer')}">Read the full disclaimers</a></span>
    </span>
  </div>`;
}

screens.read = () => {
  const featured = FEATURED_LESSON;
  const rest = LESSONS.filter((l) => !l.featured);

  return `
  <div class="shell">
    <header class="page-head">
      <div>
        <p class="bless">Free, and free to share</p>
        <h1>Read</h1>
      </div>
      <span class="count">${state.lessonsRead.length} of ${LESSON_TOTAL} read</span>
    </header>

    <a class="featured-card" href="${hrefForLesson(featured.id)}">
      <span class="pill">Start here</span>
      <span class="t">${esc(featured.title)}</span>
      <span class="m">${esc(featured.mins)} ·&nbsp; ${hasReadLesson(featured.id) ? 'Read ✓' : 'New'}</span>
    </a>

    <div class="section-row"><h2>More from the series</h2></div>
    <div class="lesson-list">
      ${rest.map((lesson) => `
      <a class="lesson ${hasReadLesson(lesson.id) ? 'read' : ''}" href="${hrefForLesson(lesson.id)}">
        <span class="glyph" aria-hidden="true">${hasReadLesson(lesson.id) ? bigCheck(16) : esc(lesson.glyph)}</span>
        <span class="body">
          <span class="t">${esc(lesson.title)}</span>
          <span class="m">${esc(lesson.mins)} · ${esc(lesson.from)}${hasReadLesson(lesson.id) ? ' · Read' : ''}</span>
        </span>
        ${chevron('#7A6114')}
      </a>`).join('')}
    </div>
    <div class="screen-foot"></div>
  </div>`;
};

screens.lesson = () => {
  const lesson = lessonById(state.activeLesson);
  const others = LESSONS.filter((l) => l.id !== lesson.id).slice(0, 3);

  return `
  <header class="dark-head">
    <span class="glow" aria-hidden="true"></span>
    <div class="shell">
      ${backButton('read', 'Read')}
      <p class="eyebrow">${esc(lesson.from)}</p>
      <h1>${esc(lesson.title)}</h1>
      <p class="lede">${esc(lesson.mins)}</p>
    </div>
  </header>

  <div class="shell read-layout">
    <div>
      ${lesson.note ? `<p class="src-note">${esc(lesson.note)}</p>` : ''}
      ${verse(lesson.verse)}

      <div class="prose">
        ${lesson.body.map((p) => `<p>${esc(p)}</p>`).join('')}
        <h2 class="label">Try this</h2>
        <ul>${lesson.practice.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
      </div>

      <div class="callout"><p>${esc(PERSONAL_INVITATION)}</p></div>

      <p class="signoff">${esc(BRAND.closing)} — ${esc(BRAND.blessing)}</p>

      <div class="pd-actions">
        <button class="btn ${hasReadLesson(lesson.id) ? 'btn-ghost' : 'btn-gold'}"
                data-lesson="${esc(lesson.id)}"
                data-focus-key="read-toggle"
                aria-pressed="${hasReadLesson(lesson.id)}">
          ${hasReadLesson(lesson.id) ? 'Marked as read ✓' : 'Mark as read'}
        </button>
      </div>
      <div class="screen-foot"></div>
    </div>

    <div>
      <div class="aside-card">
        <span class="cap">Keep going</span>
        <h2>More from the series</h2>
        <div class="mini-list">
          ${others.map((l) => `
          <a class="mini" href="${hrefForLesson(l.id)}">
            <span class="t">${esc(l.title)}</span>
            <span class="m">${esc(l.mins)}</span>
          </a>`).join('')}
        </div>
      </div>

      <div class="aside-card" style="margin-top:16px">
        <span class="cap">Free companion</span>
        <h2>The Legacy Inventory</h2>
        <p>The worksheet from Compassion and Legacy. Printable, and stored nowhere but your own paper.</p>
        <a class="btn btn-dark" href="${hrefFor('legacy')}">Open the worksheet</a>
      </div>
    </div>
  </div>`;
};

/* ==========================================================================
   The Legacy Inventory
   ========================================================================== */
screens.legacy = () => {
  const done = inventoryProgress();

  return `
  <header class="dark-head no-print">
    <span class="glow" aria-hidden="true"></span>
    <div class="shell">
      ${backButton('home')}
      <p class="eyebrow">Free worksheet</p>
      <h1>The Legacy Inventory</h1>
      <p class="lede">Everything your family will need you to have written down — assets, policies, documents, heirlooms, and the things no document holds.</p>
    </div>
  </header>

  <div class="shell">
    <div class="print-only">
      <h1>The Legacy Inventory</h1>
      <p>${esc(BRAND.name)} · ${esc(BRAND.author)}</p>
    </div>

    <section class="privacy-band">
      <span class="icon" aria-hidden="true">${shieldIcon('#23636A')}</span>
      <span>
        <span class="t">Nothing you write here is stored, sent, or seen</span>
        <span class="s">${esc(INVENTORY_PRIVACY)}</span>
      </span>
    </section>

    <div class="section-row">
      <h2>Seven sections</h2>
      <span class="count">${done} of ${INVENTORY.length} gathered</span>
    </div>
    <p class="section-hint no-print">Tap the gold circle beside a section once you’ve gathered it on paper — that tick is the only thing saved.</p>

    <div class="steps-wrap">
      ${INVENTORY.map((section, i) => `
      <div class="inv-card ${sectionDone(section.id) ? 'done' : ''}">
        <div class="inv-head">
          <span class="step-num" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
          <span class="body">
            <span class="t">${esc(section.title)}</span>
            <span class="s">${esc(section.sub)}</span>
          </span>
          <button class="step-check no-print"
                  data-section="${esc(section.id)}"
                  data-focus-key="section-${esc(section.id)}"
                  aria-pressed="${sectionDone(section.id)}"
                  aria-label="Mark “${esc(section.title)}” as gathered"
                  title="${sectionDone(section.id) ? 'Gathered — tap to unmark' : 'Tap once you’ve gathered this section on paper'}">
            ${bigCheck(14)}
          </button>
        </div>
        <ul class="inv-prompts">
          ${section.prompts.map((p) => `<li>${esc(p)}</li>`).join('')}
        </ul>
        ${section.note ? `<p class="inv-note">${esc(section.note)}</p>` : ''}
      </div>`).join('')}
    </div>

    <div class="print-row no-print">
      <button class="btn btn-gold btn-auto" data-print>${printIcon('#2A2113')}Print or save as PDF</button>
      <p class="fine">Printing gives you the full worksheet with room to write. Fill it in on paper, or on a document that stays on your own device.</p>
    </div>

    ${disclaimerNote('legal')}
    ${brandFooter()}
    <div class="screen-foot"></div>
  </div>`;
};

/* ==========================================================================
   Shop
   ========================================================================== */
screens.shop = () => {
  const visible = PRODUCTS.filter((p) => p.cats.includes(state.category));
  const hero = productById('first-three');

  return `
  <div class="shell">
    <header class="page-head">
      <div>
        <p class="bless">Books, sets &amp; kits</p>
        <h1>Shop</h1>
      </div>
      <a class="cart-btn" href="${hrefFor('cart')}" aria-label="Cart, ${state.cart.length} item${state.cart.length === 1 ? '' : 's'}">
        ${state.cart.length ? `<span class="dot" aria-hidden="true">${state.cart.length}</span>` : ''}
        ${cartIcon(22, '#B08D2E', 2)}
      </a>
    </header>

    <a class="bundle-hero" href="${hrefForProduct(hero.id)}">
      <span class="pill pill-gold">Best value</span>
      <span class="t">${esc(hero.title)}</span>
      <span class="s">The first three books in both PDF and EPUB formats — The Benefit of Having Compassion, Are You Born in Compassion or Nurtured in It?, and Compassion and Legacy.</span>
      <span class="row">
        <span class="price">${money(hero.price)}</span>
        <span class="view">See the collection ${chevron('#F3ECDC')}</span>
      </span>
    </a>

    <div class="cat-chips" role="group" aria-label="Filter by category">
      ${CATEGORIES.map((cat) => `
      <button class="cat-chip"
              data-cat="${esc(cat)}"
              data-focus-key="cat-${esc(cat)}"
              aria-pressed="${state.category === cat}">${esc(cat)}</button>`).join('')}
    </div>

    <div class="section-row">
      <h2>${esc(state.category)}</h2>
      <span class="count">${visible.length} item${visible.length === 1 ? '' : 's'}</span>
    </div>

    <div class="prod-grid">
      ${visible.map((p) => `
      <a class="prod-card ${p.buyable ? '' : 'pending'}" href="${hrefForProduct(p.id)}">
        <span class="prod-cover">
          ${p.badge ? `<span class="badge">${esc(p.badge)}</span>` : ''}
          ${coverStack(p, '(min-width: 1100px) 240px, (min-width: 620px) 30vw, 44vw')}
          <span class="kind">${esc(p.kind)}</span>
        </span>
        <span class="prod-info">
          <span class="t">${esc(p.title)}</span>
          <span class="m">${esc(p.note)}</span>
          <span class="p">${p.buyable ? (p.free ? 'Free' : money(p.price)) : esc(p.status)}</span>
        </span>
      </a>`).join('')}
    </div>

    ${state.category === 'Books' ? '' : singleBooksStrip()}
    <div class="screen-foot"></div>
  </div>`;
};

/**
 * The six books, sold one at a time. Sets are the headline offer, so the
 * single editions get their own strip on every other tab of the shop rather
 * than being findable only under "Books".
 */
function singleBooksStrip() {
  return `
  <section class="singles">
    <div class="section-row">
      <h2>Or buy a single book</h2>
      <span class="count">${BOOK_PRODUCTS.length} editions</span>
    </div>
    <p class="singles-lede">Every book in the series is sold on its own in both PDF and EPUB — pick the format when you buy.</p>
    <div class="singles-row">
      ${BOOK_PRODUCTS.map((p) => `
      <a class="single-card" href="${hrefForProduct(p.id)}">
        <span class="single-cover">${coverStack(p, '120px')}</span>
        <span class="t">${esc(p.title)}</span>
        <span class="p">${money(p.price)}</span>
      </a>`).join('')}
    </div>
  </section>`;
}

screens.product = () => {
  const product = productById(state.activeProduct);
  const owned = inLibrary(product.id);
  const carted = inCart(product.id);
  const included = (product.includes || []).map(bookById).filter(Boolean);
  const covers = coversForProduct(product);
  const format = formatFor(product.id);

  return `
  <header class="dark-head">
    <span class="glow" aria-hidden="true"></span>
    <div class="shell">
      ${backButton('shop', 'Shop')}
      <p class="eyebrow">${esc(product.kind)}</p>
      <h1>${esc(product.title)}</h1>
      <p class="pd-rating">${esc(product.note)}</p>
    </div>
  </header>

  <div class="shell product-layout">
    <div class="media">
      ${covers.length ? `
      <figure class="pd-cover-figure">
        <a class="pd-cover-link" href="${esc(covers[0].assets.cover)}" target="_blank" rel="noopener noreferrer">
          ${coverArt(covers[0].assets, covers[0].title, '(min-width: 900px) 420px, 88vw')}
        </a>
        <figcaption>${covers.length > 1 ? `${covers.length} titles in this set · ` : ''}<a href="${esc(covers[0].assets.cover)}" target="_blank" rel="noopener noreferrer">View the cover full size</a></figcaption>
      </figure>
      ${covers.length > 1 ? `
      <div class="cover-strip" aria-label="Covers included in this set">
        ${covers.map(({ title, assets }) => `
        <a class="cover-chip" href="${esc(assets.cover)}" target="_blank" rel="noopener noreferrer" title="${esc(title)}">
          ${coverArt(assets, title, '92px')}
        </a>`).join('')}
      </div>` : ''}` : `
      <div class="pd-cover">
        ${cover(product, { kicker: product.kind, size: 'lg' })}
      </div>`}
    </div>

    <div>
      <div class="pd-price-row">
        <span class="p">${product.buyable ? (product.free ? 'Free' : money(product.price)) : money(product.price)}</span>
        <span class="note">${product.buyable ? esc(product.note) : esc(product.status)}</span>
      </div>

      ${formatPicker(product, format)}

      ${productActions(product, { owned, carted })}

      ${editionDownloadPanel(
        editionsForProduct(product),
        product.includes?.length || product.includesProducts?.length ? 'Files included in this set' : 'Download editions',
        format,
      )}

      <h2 class="about-cap">About this</h2>
      <p class="about-copy">${esc(product.about)}</p>

      ${included.length ? `
      <div class="prose">
        <h2 class="label">What is in it</h2>
        <ul>${included.map((b) => `<li>${esc(b.title)}</li>`).join('')}</ul>
      </div>` : ''}

      ${product.id === 'first-three' || product.id === 'six-set' || product.id === 'six-plus-workbook'
        ? disclaimerNote('legal') : ''}
      <div class="screen-foot"></div>
    </div>
  </div>`;
};

/**
 * Which file format the reader wants. Shown for anything with real download
 * files behind it — the free workbook included, since a printable PDF and a
 * phone-friendly EPUB are genuinely different things to want.
 */
function formatPicker(product, format) {
  if (!editionsForProduct(product).length) return '';
  return `
  <section class="format-picker">
    <h2 class="format-cap">Which format would you like?</h2>
    <div class="format-opts" role="radiogroup" aria-label="File format">
      ${FORMATS.map((option) => `
      <button class="format-opt" role="radio"
              aria-checked="${format === option.id}"
              tabindex="${format === option.id ? 0 : -1}"
              data-format="${esc(option.id)}"
              data-format-product="${esc(product.id)}"
              data-focus-key="format-${esc(option.id)}">
        <span class="radio" aria-hidden="true"><i></i></span>
        <span>
          <span class="t">${esc(option.label)}</span>
          <span class="s">${esc(option.sub)}</span>
        </span>
      </button>`).join('')}
    </div>
  </section>`;
}

/** The save-for-later control, on every product the reader can actually get. */
const saveButton = (product) => {
  const saved = isSaved(product.id);
  return `
  <button class="btn btn-ghost btn-save" data-save="${esc(product.id)}" data-focus-key="save" aria-pressed="${saved}">
    ${bookmarkIcon(15, '#4A2A63', saved ? '#4A2A63' : 'none')}${saved ? 'Saved to My Library' : 'Save for later'}
  </button>`;
};

function productActions(product, { owned, carted }) {
  if (!product.buyable) {
    return `
    <div class="pd-actions">
      <p class="pending-note">${esc(product.status)}. It goes on sale when it is finished, and not before. <a href="${hrefFor('status')}">See what is left to do</a></p>
    </div>`;
  }
  if (product.free) {
    return `
    <div class="pd-actions">
      ${product.goTo
        ? `<a class="btn btn-gold" href="${hrefFor(product.goTo)}">Open the worksheet</a>`
        : '<button class="btn btn-gold" data-toast="Check your email — the download is on its way.">Get it free</button>'}
      <div class="row2">
        ${saveButton(product)}
        <a class="btn btn-ghost" href="${hrefFor('shop')}">Back to the shop</a>
      </div>
    </div>`;
  }
  return `
  <div class="pd-actions">
    <button class="btn btn-gold" data-buy="${esc(product.id)}" data-focus-key="buy">${owned ? 'In your library ✓' : `Buy now · ${FORMAT_SHORT[formatFor(product.id)]}`}</button>
    <div class="row2">
      <button class="btn btn-dark" data-cart-toggle="${esc(product.id)}" data-focus-key="cart-toggle" aria-pressed="${carted}">${carted ? 'In your cart ✓' : 'Add to cart'}</button>
      ${saveButton(product)}
    </div>
  </div>`;
}

/**
 * An empty cart is a dead end unless it offers a way on. Both routes out of
 * here are free, which is the point worth making.
 */
const emptyCart = (line) => `
  <div class="shell">
    <div class="cart-empty">
      <span class="ec-mark" aria-hidden="true">${cartIcon(30, '#B08D2E', 1.8)}</span>
      <p class="ec-t">Your cart is empty</p>
      <p class="ec-s">${esc(line)}</p>
      <div class="ec-actions">
        <a class="btn btn-dark btn-auto" href="${hrefFor('shop')}">Browse the shop</a>
        <a class="btn btn-ghost btn-auto" href="${hrefFor('read')}">Read the series free</a>
      </div>
    </div>
  </div>`;

screens.cart = () => {
  const items = state.cart.map(productById).filter(Boolean);
  const subtotal = items.reduce((sum, p) => sum + p.price, 0);

  return `
  <header class="dark-head">
    <span class="glow" aria-hidden="true"></span>
    <div class="shell">
      ${backButton('shop', 'Shop')}
      <p class="eyebrow">Your cart</p>
      <h1>${items.length} item${items.length === 1 ? '' : 's'}</h1>
    </div>
  </header>

  ${items.length ? `
  <div class="shell cart-layout">
    <div class="cart-items">
      ${items.map((p) => `
      <div class="cart-item">
        <span class="thumb">${coverStack(p, '64px', { mini: true })}</span>
        <span class="who">
          <span class="t">${esc(p.title)}</span>
          <span class="k">${esc(p.kind)}</span>
          <span class="fmt">
            ${esc(FORMAT_SHORT[formatFor(p.id)])}
            <a href="${hrefForProduct(p.id)}">Change format</a>
          </span>
        </span>
        <span class="side">
          <span class="p">${money(p.price)}</span>
          <button class="rm" data-remove="${esc(p.id)}">Remove<span class="sr-only"> ${esc(p.title)} from cart</span></button>
        </span>
      </div>`).join('')}
    </div>

    <div class="summary">
      <div class="cart-summary">
        <div class="subtotal-row">
          <span class="l">Subtotal</span>
          <span class="v">${money(subtotal)}</span>
        </div>
        <button class="btn btn-gold" data-checkout>Checkout · ${money(subtotal)}</button>
        <p class="fine">Instant download · 30-day money-back guarantee</p>
      </div>
    </div>
  </div>` : `
  ${emptyCart('The reading is free either way — and so is the Legacy Inventory.')}`}
  <div class="screen-foot"></div>`;
};

/* ==========================================================================
   Checkout
   ========================================================================== */
const PAY_OPTIONS = [
  { id: 'card', title: 'Debit or credit card', sub: 'Visa, Mastercard, Amex' },
  { id: 'invoice', title: 'Church or organisation invoice', sub: 'For group licences — we send an invoice, nothing is due today' },
];

/**
 * A labelled field. A placeholder alone is not a label: it vanishes the moment
 * someone types, and it leaves anyone using a screen reader or coming back to
 * a half-filled form with nothing to read.
 */
const field = ({ id, label, hint = '', ...attrs }) => {
  const rest = Object.entries(attrs).map(([k, v]) => ` ${k}="${esc(v)}"`).join('');
  return `
  <p class="field-row">
    <label class="field-label" for="${esc(id)}">${esc(label)}</label>
    <input class="field" id="${esc(id)}" name="${esc(id)}"${rest}>
    ${hint ? `<span class="field-hint">${esc(hint)}</span>` : ''}
  </p>`;
};

const payDetails = () => {
  if (state.payMethod === 'card') {
    return `
    <div class="field-wrap">
      ${field({ id: 'cc-number', label: 'Card number', inputmode: 'numeric', autocomplete: 'cc-number', placeholder: '1234 5678 9012 3456' })}
      <div class="split">
        ${field({ id: 'cc-exp', label: 'Expiry', inputmode: 'numeric', autocomplete: 'cc-exp', placeholder: 'MM / YY' })}
        ${field({ id: 'cc-csc', label: 'Security code', inputmode: 'numeric', autocomplete: 'cc-csc', placeholder: 'CVC' })}
      </div>
      ${field({ id: 'cc-name', label: 'Name on card', autocomplete: 'cc-name', placeholder: 'As printed on the card' })}
    </div>`;
  }
  return '<p class="pay-note">Tell us the organisation and the number of copies and we will send an invoice by email. Nothing is charged today.</p>';
};

screens.checkout = () => {
  const items = state.cart.map(productById).filter(Boolean);
  const subtotal = items.reduce((sum, p) => sum + p.price, 0);

  if (!items.length) {
    return `
    <header class="dark-head">
      <span class="glow" aria-hidden="true"></span>
      <div class="shell">
        ${backButton('shop', 'Shop')}
        <p class="eyebrow">Checkout</p>
        <h1>Nothing to check out</h1>
      </div>
    </header>
    ${emptyCart('Nothing to pay for — add something from the shop first.')}`;
  }

  return `
  <header class="dark-head">
    <span class="glow" aria-hidden="true"></span>
    <div class="shell">
      ${backButton('cart', 'Cart')}
      <p class="eyebrow">Checkout</p>
      <h1>${money(subtotal)}</h1>
    </div>
  </header>

  <div class="shell checkout-layout">
    <div class="summary">
      <section class="order-card">
        ${items.map((p) => `
        <div class="row1">
          <span class="t">${esc(p.title)} <small>${esc(FORMAT_SHORT[formatFor(p.id)])}</small></span>
          <span class="p">${money(p.price)}</span>
        </div>`).join('')}
        <p class="s">Downloadable straight after payment and yours to keep, in the format you chose for each title.</p>
        <ul class="check-list">
          <li>${goldCheck}Instant download, no account needed</li>
          <li>${goldCheck}Free updates as the books are expanded</li>
          <li>${goldCheck}30-day money-back guarantee</li>
        </ul>
      </section>
    </div>

    <div>
      <h2 class="pay-cap">How would you like to pay?</h2>
      <div class="pay-opts" role="radiogroup" aria-label="Payment method">
        ${PAY_OPTIONS.map((opt) => `
        <button class="pay-opt" role="radio"
                aria-checked="${state.payMethod === opt.id}"
                tabindex="${state.payMethod === opt.id ? 0 : -1}"
                data-pay="${opt.id}"
                data-focus-key="pay-${opt.id}">
          <span class="radio" aria-hidden="true"><i></i></span>
          <span>
            <span class="t">${esc(opt.title)}</span>
            <span class="s">${esc(opt.sub)}</span>
          </span>
        </button>`).join('')}
      </div>

      ${payDetails()}

      <div class="pay-btn-wrap">
        <button class="btn btn-gold" data-purchase>
          ${state.payMethod === 'invoice' ? 'Request an invoice' : `Pay ${money(subtotal)}`}
        </button>
        <p class="fine">Secure checkout · instant download</p>
      </div>
      <div class="screen-foot"></div>
    </div>
  </div>`;
};

screens['checkout-done'] = () => `
  <header class="dark-head">
    <span class="glow" aria-hidden="true"></span>
    <div class="shell">
      ${backButton('shop', 'Shop')}
      <p class="eyebrow">Checkout</p>
      <h1>Thank you.</h1>
    </div>
  </header>

  <div class="shell done-body">
    <span class="done-badge" aria-hidden="true">${bigCheck(38)}</span>
    <h2>It’s in your library.</h2>
    <p>Every title you bought is waiting in My Library, in the format you chose, ready to download now. A copy of the link is on its way by email too.</p>
    <div class="done-actions">
      <a class="btn btn-gold" href="${hrefFor('library')}">Open My Library</a>
      <a class="btn btn-dark" href="${hrefFor('legacy')}">Open the Legacy Inventory</a>
      <a class="btn btn-ghost" href="${hrefFor('read')}">Keep reading</a>
    </div>
    <p class="signoff">${esc(BRAND.closing)} — ${esc(BRAND.blessing)}</p>
  </div>`;

/* ==========================================================================
   Tools — My Library and the Network
   ========================================================================== */
screens.tools = () => `
  <div class="shell">
    <header class="page-head">
      <div>
        <p class="bless">Yours, and the people around it</p>
        <h1>Tools</h1>
      </div>
      <span class="count">${TOOLS.length} tools</span>
    </header>

    <div class="tools-grid">
      ${TOOLS.map((tool) => `
      <a class="tool-card" href="${hrefFor(tool.id)}">
        <span class="icon-tile it-gold">${tool.icon(24, '#96771F', 1.9)}</span>
        <span class="t">${esc(tool.label)}</span>
        <span class="s">${esc(tool.blurb)}</span>
        <span class="go">Open ${chevron('#7A6114')}</span>
      </a>`).join('')}
    </div>
    <div class="screen-foot"></div>
  </div>`;

/**
 * My Library: everything the reader has bought or saved, with the downloads
 * attached. Purchases come first because they are the things with files behind
 * them; saved items are a shortlist, and are labelled as such.
 */
screens.library = () => {
  const owned = state.library.map(productById).filter(Boolean);
  const saved = state.saved.map(productById).filter(Boolean);
  const freebies = PRODUCTS.filter((p) => p.free && p.buyable && !isSaved(p.id));

  return `
  <header class="dark-head">
    <span class="glow" aria-hidden="true"></span>
    <div class="shell">
      ${backButton('tools', 'Tools')}
      <p class="eyebrow">Tools</p>
      <h1>My Library</h1>
      <p class="lede">Everything you have bought or saved, in one place, with both file formats a click away.</p>
    </div>
  </header>

  <div class="shell">
    <div class="section-row">
      <h2>Purchased</h2>
      <span class="count">${owned.length} item${owned.length === 1 ? '' : 's'}</span>
    </div>
    ${owned.length
      ? `<div class="lib-list">${owned.map((p) => libraryRow(p, 'owned')).join('')}</div>`
      : `<div class="lib-empty">
           Nothing bought yet. The six books are sold on their own or as a set — and everything on the Read tab is free.
           <a class="btn btn-dark" href="${hrefFor('shop')}">Browse the shop</a>
         </div>`}

    <div class="section-row">
      <h2>Saved</h2>
      <span class="count">${saved.length} item${saved.length === 1 ? '' : 's'}</span>
    </div>
    ${saved.length
      ? `<div class="lib-list">${saved.map((p) => libraryRow(p, 'saved')).join('')}</div>`
      : '<p class="lib-hint">Nothing saved yet. Use “Save for later” on any book, set, or free download and it will wait for you here.</p>'}

    ${freebies.length ? `
    <div class="section-row">
      <h2>Free for everyone</h2>
      <span class="count">${freebies.length} item${freebies.length === 1 ? '' : 's'}</span>
    </div>
    <div class="lib-list">${freebies.map((p) => libraryRow(p, 'free')).join('')}</div>` : ''}

    <p class="lib-note">This library lives in this browser, not on a server — the same as everything else the app remembers. Clearing your browser data clears it, and the files themselves stay downloadable either way.</p>
    <div class="screen-foot"></div>
  </div>`;
};

function libraryRow(product, kind) {
  const format = formatFor(product.id);
  const editions = editionsForProduct(product);
  const label = { owned: 'Purchased', saved: 'Saved', free: 'Free' }[kind];

  return `
  <article class="lib-row">
    <a class="lib-cover" href="${hrefForProduct(product.id)}">${coverStack(product, '96px')}</a>
    <div class="lib-body">
      <span class="meta">
        <span class="tag tag-${kind === 'owned' ? 'gold' : 'neutral'}">${esc(label)}</span>
        <span class="k">${esc(product.kind)}</span>
      </span>
      <a class="t" href="${hrefForProduct(product.id)}">${esc(product.title)}</a>
      <span class="s">${esc(product.note)}${editions.length ? ` · ${esc(FORMAT_SHORT[format])} selected` : ''}</span>
      ${editions.length ? `
      <div class="lib-downloads">
        ${editions.map(({ title, assets }) => `
        <span class="lib-download">
          ${editions.length > 1 ? `<span class="lib-download-title">${esc(title)}</span>` : ''}
          <span class="download-actions">${downloadLinks(assets, format)}</span>
        </span>`).join('')}
      </div>` : `<p class="lib-hint">${esc(product.about)}</p>`}
    </div>
    <div class="lib-side">
      ${kind === 'owned'
        // Owning it already keeps it on this page, so there is nothing to save.
        ? `<span class="lib-owned">${downloadIcon(16, '#23636A')} Yours to keep</span>`
        : `<button class="rm" data-save="${esc(product.id)}" aria-pressed="${isSaved(product.id)}">
             ${isSaved(product.id) ? 'Remove from saved' : 'Save'}<span class="sr-only"> ${esc(product.title)}</span>
           </button>`}
    </div>
  </article>`;
}

/**
 * The network: the people around the series, with the one contact detail each
 * of them gave. Every entry carries its own photo — see assets/network/README.md
 * and the `headshot` field in data.js. An entry with none still renders a
 * lettered tile of the same size, so the grid keeps its shape either way.
 */
screens.network = () => `
  <header class="dark-head">
    <span class="glow" aria-hidden="true"></span>
    <div class="shell">
      ${backButton('tools', 'Tools')}
      <p class="eyebrow">Tools</p>
      <h1>Network</h1>
      <p class="lede">Pamella and the independent professionals she works alongside — what each one does, and how to reach them directly.</p>
    </div>
  </header>

  <div class="shell">
    <div class="net-grid">
      ${NETWORK.map(networkCard).join('')}
    </div>

    <aside class="note-card">
      <span class="note-icon" aria-hidden="true">${shieldIcon('#96771F')}</span>
      <span>
        <span class="t">How to read this page</span>
        <span class="s">${esc(NETWORK_NOTE)} <a href="${hrefFor('disclaimer')}">Read the full disclaimers</a></span>
      </span>
    </aside>
    ${brandFooter()}
    <div class="screen-foot"></div>
  </div>`;

/**
 * A website as a reader would say it: no scheme, no `www.`, no trailing slash.
 * The link itself still points at the address exactly as it was supplied.
 */
const displayHost = (url) =>
  url.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '');

function networkCard(person) {
  const initials = person.name.split(/[\s-]+/).filter(Boolean).slice(0, 2)
    .map((part) => part[0].toUpperCase()).join('');

  return `
  <article class="net-card">
    <span class="net-shot">
      ${person.headshot
        // alt="" on purpose: the name is the next line of the card, so a
        // described portrait would only make a screen reader say it twice.
        ? `<img src="${esc(person.headshot)}" width="512" height="512" loading="lazy" decoding="async" alt="">`
        : `<span class="net-initials" aria-hidden="true">${esc(initials)}</span>
           <span class="net-shot-note">Headshot to come</span>`}
    </span>
    <h2 class="net-name">${esc(person.name)}</h2>
    <span class="net-title">${esc(person.title)}</span>
    ${person.org ? `<span class="net-org">${esc(person.org)}</span>` : ''}
    <p class="net-note">${esc(person.note)}</p>

    <div class="net-links">
      ${person.email ? `
      <a class="net-link" href="mailto:${esc(person.email)}">
        ${mailIcon(15, '#4A2A63')}<span>${escBreakable(person.email)}</span>
      </a>` : ''}
      ${person.website ? `
      <a class="net-link" href="${esc(person.website)}" target="_blank" rel="noopener noreferrer">
        ${externalIcon(15, '#4A2A63')}<span>${escBreakable(displayHost(person.website))}</span>
      </a>` : ''}
      ${(person.socials || []).map((link) => `
      <a class="net-link" href="${esc(link.url)}" target="_blank" rel="noopener noreferrer">
        ${externalIcon(15, '#4A2A63')}<span>${esc(link.label)} · ${escBreakable(link.handle)}</span>
      </a>`).join('')}
    </div>

    <button class="btn btn-ghost btn-auto" data-vcard="${esc(person.id)}">
      ${downloadIcon(15, '#4A2A63')}Export contact card
    </button>
  </article>`;
}

/* ==========================================================================
   About
   ========================================================================== */
screens.about = () => `
  <header class="dark-head">
    <span class="glow" aria-hidden="true"></span>
    <div class="shell">
      ${backButton('home')}
      <div class="about-id">
        ${AUTHOR_PORTRAIT
          // alt="" for the same reason as the Network cards: the name is the
          // h1 directly beside it.
          ? `<img class="about-portrait" src="${esc(AUTHOR_PORTRAIT)}" width="512" height="512" decoding="async" alt="">`
          : ''}
        <div class="about-id-text">
          <p class="eyebrow">${esc(BRAND.authorTagline)}</p>
          <h1>${esc(BRAND.author)}</h1>
          <p class="lede">Founder of ${esc(BRAND.app)} · ${esc(BRAND.publisher)}</p>
        </div>
      </div>
    </div>
  </header>

  <div class="shell about-layout">
    <div>
      <img class="author-portrait" src="${esc(BRAND.headshot)}" alt="Portrait of ${esc(BRAND.author)}" width="168" height="168">
      <div class="prose">
        ${ABOUT_AUTHOR.map((p) => `<p>${esc(p)}</p>`).join('')}
      </div>

      <div class="callout"><p>${esc(PERSONAL_INVITATION)}</p></div>

      <section class="consult-card">
        <div>
          <h2>Bring the series to your church or group.</h2>
          <p>Twenty-five copies on a single invoice, and a six-week study built around them. Pamella also speaks to congregations, caregiver teams, and family reunions.</p>
        </div>
        <a class="btn btn-gold btn-auto" href="${hrefForProduct('church-license')}">See the group licence</a>
      </section>

      <p class="signoff">${esc(BRAND.closing)} — ${esc(BRAND.blessing)}</p>
      ${brandFooter()}
      <div class="screen-foot"></div>
    </div>

    <div>
      <div class="aside-card">
        <span class="cap">The positioning, plainly</span>
        <h2>${esc(LEGAL_POSITIONING)}</h2>
        <p>The Compassion Hub is an educational publishing and community resource. We do not draft wills, trusts, or any other legal instrument, and we never will. What we do is make sure you walk into an attorney’s office already knowing what you own, what you want, and who you want it to go to.</p>
        <a class="btn btn-ghost" href="${hrefFor('disclaimer')}">Read the disclaimers</a>
      </div>

      <div class="aside-card" style="margin-top:16px">
        <span class="cap">Get in touch</span>
        <h2>Contact</h2>
        <p><a href="mailto:${esc(BRAND.email)}">${esc(BRAND.email)}</a><br>${esc(BRAND.site)}</p>
        <div class="social-row">
          ${SOCIAL_LINKS.map((link) => `
          <a class="social-link" href="${esc(link.url)}" target="_blank" rel="noopener noreferrer">
            ${externalIcon(15, '#4A2A63')}
            <span>
              <span class="t">${esc(link.label)}</span>
              <span class="s">${esc(link.handle)}</span>
            </span>
          </a>`).join('')}
        </div>
        <p class="hint">Every platform above is Pamella’s own and confirmed by her. She answers her email too.</p>
      </div>

      <div class="aside-card" style="margin-top:16px">
        <span class="cap">Who else can help</span>
        <h2>The network</h2>
        <p>A planner, an identity-protection specialist, a licensed insurance agent, and a business consultant — the people Pamella works alongside, with direct contact details for each.</p>
        <a class="btn btn-ghost" href="${hrefFor('network')}">Open the Network</a>
      </div>
    </div>
  </div>`;

/* ==========================================================================
   Disclaimers (Handoff §6 — a site discussing wills and trusts needs one)
   ========================================================================== */
const DISCLAIMERS = [
  {
    title: 'This is education, not legal advice',
    body: [
      `${LEGAL_POSITIONING} Nothing in these books, on this site, or in the Legacy Inventory is legal advice, and reading it creates no attorney–client relationship with anyone.`,
      'Wills, trusts, powers of attorney, and healthcare directives are legal instruments. They must be drafted, executed, and witnessed according to the law of the state you live in, by a licensed attorney practising there. Requirements differ from state to state and change over time.',
      'We do not prepare, review, file, or store legal documents, and we do not offer to. What we offer is preparation: knowing what you own, what you want, and who you want it to go to, before you walk into that office.',
    ],
  },
  {
    title: 'On herbs, oils, and wellness',
    body: [
      'Where the books discuss herbs, oils, and everyday remedies, they do so as culinary and traditional-use practice. Traditional use is not clinical evidence.',
      'Nothing in this series diagnoses, treats, cures, or prevents any disease, and none of it is medical advice or a substitute for it. Talk to your physician before changing anything about your care, particularly if you are pregnant, nursing, managing a condition, or taking medication.',
    ],
  },
  {
    title: 'Your information stays yours',
    body: [
      'The Legacy Inventory deliberately has nothing to type into. It tells you what to gather and what to ask; you write the answers on paper or on a document that never leaves your own device.',
      'This app has no account and no analytics. It remembers only which sections you have ticked and what is in your cart, kept in this browser’s local storage and readable by nobody but you. Clearing your browser data erases it.',
      'We will never ask you to type an account number, a policy number, or the contents of a safe deposit box into a web form — not on this site, and not anywhere else.',
    ],
  },
  {
    title: 'Public messages of compassion',
    body: [
      'The name, community, and message you submit on the Messages page are sent to our message service for review. Approved messages are public, so do not include phone numbers, email addresses, account details, or anything you want kept private.',
      'To discourage spam, the service keeps a non-reversible fingerprint that changes daily for the submitting network address. It never publishes that fingerprint, and the public message feed includes only approved display names, communities, messages, and dates.',
    ],
  },
  {
    title: 'Scripture and sources',
    body: [
      'All scripture throughout the series is quoted from the King James Version.',
      'Research on clinical compassion referenced in The Benefit of Having Compassion is drawn from Compassionomics by Stephen Trzeciak and Anthony Mazzarelli. Interpretation is the author’s own.',
      'Names and stories appear with permission. Where a written release is still outstanding, the name is withheld until it is signed.',
    ],
  },
];

screens.disclaimer = () => `
  <header class="dark-head">
    <span class="glow" aria-hidden="true"></span>
    <div class="shell">
      ${backButton('home')}
      <p class="eyebrow">The fine print, in plain language</p>
      <h1>Disclaimers</h1>
      <p class="lede">${esc(LEGAL_POSITIONING)}</p>
    </div>
  </header>

  <div class="shell">
    <div class="prose disclaimer-body">
      ${DISCLAIMERS.map((d) => `
        <h2>${esc(d.title)}</h2>
        ${d.body.map((p) => `<p>${esc(p)}</p>`).join('')}`).join('')}
      <h2>Publisher</h2>
      <p>${esc(BRAND.name)} is published by ${esc(BRAND.publisher)}. Questions about any of the above go to <a href="mailto:${esc(BRAND.email)}">${esc(BRAND.email)}</a>.</p>
    </div>
    ${brandFooter()}
    <div class="screen-foot"></div>
  </div>`;

/* ==========================================================================
   Production status
   ========================================================================== */
const SEVERITY = {
  blocker: { label: 'Blocking the full set', tone: 'gold' },
  open: { label: 'Keep current', tone: 'neutral' },
  'fixed-in-text': { label: 'Verified library', tone: 'teal' },
};

screens.status = () => `
  <header class="dark-head">
    <span class="glow" aria-hidden="true"></span>
    <div class="shell">
      ${backButton('home')}
      <p class="eyebrow">Library verification</p>
      <h1>Production status</h1>
      <p class="lede">The complete digital library is in place. This page records the verification status and the few routine safeguards to keep current.</p>
    </div>
  </header>

  <div class="shell">
    <div class="status-list">
      ${STATUS_GROUPS.map((group) => {
        const sev = SEVERITY[group.severity];
        return `
      <section class="status-card sev-${group.severity}">
        <div class="status-head">
          <h2>${esc(group.title)}</h2>
          <span class="tag tag-${sev.tone}">${esc(sev.label)}</span>
        </div>
        <p class="intro">${esc(group.intro)}</p>
        <ul class="status-items">
          ${group.items.map((item) => `<li>${esc(item)}</li>`).join('')}
        </ul>
      </section>`;
      }).join('')}
    </div>
    ${brandFooter()}
    <div class="screen-foot"></div>
  </div>`;
