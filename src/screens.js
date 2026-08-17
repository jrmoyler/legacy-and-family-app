/**
 * Screen templates. Each function returns the inner HTML for one screen.
 *
 * Layout rule: full-bleed bands (dark headers, the welcome hero) own the page
 * width; readable content always sits inside a `.shell` so it stays centred and
 * measured on a wide monitor.
 */

import { esc } from './dom.js';
import {
  BRAND, BOOKS, BOOK_STATUS, bookById,
  PRODUCTS, CATEGORIES, productById,
  LESSONS, FEATURED_LESSON, LESSON_TOTAL, lessonById,
  INVENTORY, INVENTORY_PRIVACY, STATUS_GROUPS,
  ABOUT_AUTHOR, PERSONAL_INVITATION, LEGAL_POSITIONING,
} from './data.js';
import {
  state, inventoryProgress, sectionDone, hasReadLesson, inCart, inLibrary,
} from './state.js';
import {
  backButton, brandFooter, hrefFor, hrefForBook, hrefForLesson, hrefForProduct,
} from './components.js';
import {
  cupMarkOnDark, chevron, goldCheck, bigCheck,
  starOutline, printIcon, shieldIcon, cartIcon, bookIcon, peopleIcon,
} from './icons.js';

export const screens = {};

const money = (n) => (Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`);

const editionDownloadPanel = (editions, heading = 'Download editions') => {
  if (!editions.length) return '';
  return `
  <section class="download-panel" aria-label="${esc(heading)}">
    <span class="cap">PDF and EPUB included</span>
    <h2>${esc(heading)}</h2>
    <p class="download-intro">Choose PDF for print and fixed layout, or EPUB for comfortable reading on an e-reader or phone.</p>
    <div class="download-list">
      ${editions.map(({ title, assets }) => `
      <div class="download-row">
        <span class="download-title">${esc(title)}</span>
        <span class="download-actions">
          <a class="download-link" href="${esc(assets.pdf)}" download>PDF <small>print edition</small></a>
          <a class="download-link" href="${esc(assets.epub)}" download>EPUB <small>e-reader edition</small></a>
        </span>
      </div>`).join('')}
    </div>
  </section>`;
};

const editionsForProduct = (product) => {
  const editions = [];
  if (product.book) {
    const book = bookById(product.book);
    if (book?.assets) editions.push({ title: book.title, assets: book.assets });
  }
  if (product.assets) editions.push({ title: product.title, assets: product.assets });
  (product.includes || []).map(bookById).filter(Boolean).forEach((book) => {
    if (book.assets) editions.push({ title: book.title, assets: book.assets });
  });
  (product.includesProducts || []).map(productById).filter(Boolean).forEach((includedProduct) => {
    if (includedProduct.assets) editions.push({ title: includedProduct.title, assets: includedProduct.assets });
  });
  return editions;
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
          <span class="name">${esc(BRAND.name)}</span>
          <span class="tag">${esc(BRAND.tagline)}</span>
        </span>
      </div>
      <p class="welcome-eyebrow">A series by ${esc(BRAND.author)}</p>
      <h1 class="welcome-h1">Compassion should not end with today.</h1>
      <p class="welcome-copy">Six short books on what compassion is, where it comes from, and how to write it down so it outlives you. Plus the Legacy Inventory — free, printable, and yours alone.</p>
      <div class="welcome-actions">
        <a class="btn btn-gold" href="${hrefFor('home')}">Start reading</a>
        <a class="btn btn-ghost-dark" href="${hrefFor('series')}">See the series</a>
      </div>
      <p class="welcome-foot">Free to read · Nothing stored about you</p>
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

  return `
  <div class="shell">
    <header class="page-head">
      <div>
        <p class="bless">${esc(BRAND.blessing)}</p>
        <h1>${esc(BRAND.name)}</h1>
      </div>
      <span class="avatar-tile" aria-hidden="true">${cupMarkOnDark(26)}</span>
    </header>

    <div class="home-grid">
      <a class="progress-card span-all" href="${hrefFor('legacy')}">
        <span class="ring" aria-hidden="true">
          <svg width="96" height="96" viewBox="0 0 96 96">
            <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="7"/>
            <circle cx="48" cy="48" r="40" fill="none" stroke="#B08D2E" stroke-width="7" stroke-linecap="round"
              stroke-dasharray="${circumference}" stroke-dashoffset="${circumference * (1 - pct / 100)}"
              style="transition:stroke-dashoffset .5s"/>
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
        <a class="quick-tile" href="${hrefFor('about')}"><span class="icon-tile it-gold">${peopleIcon(22, '#96771F', 1.9)}</span>About Pamella<small>And the movement</small></a>
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

    <aside class="note-card">
      <span class="note-icon" aria-hidden="true">${shieldIcon('#96771F')}</span>
      <span>
        <span class="t">A note on the numbering</span>
        <span class="s">The complete six-book library is now available in both PDF and EPUB editions, with companion workbooks for reflection and family planning. <a href="${hrefFor('status')}">See library verification</a></span>
      </span>
    </aside>
    <div class="screen-foot"></div>
  </div>`;

function bookRow(book) {
  const status = BOOK_STATUS[book.status];
  return `
  <a class="book-row" href="${hrefForBook(book.id)}">
    <span class="book-cover" aria-hidden="true">
      ${cupMarkOnDark(38)}
    </span>
    <span class="body">
      <span class="meta">
        ${book.seriesLabel ? `<span class="num">${esc(book.seriesLabel)}</span>` : ''}
        <span class="tag tag-${status.tone}">${esc(status.label)}</span>
        ${book.flagship ? '<span class="tag tag-neutral">Flagship</span>' : ''}
      </span>
      <span class="t">${esc(book.title)}</span>
      <span class="s">${esc(book.blurb)}</span>
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
      <p class="eyebrow">${book.seriesLabel ? esc(book.seriesLabel) : 'A Cup of Compassion'}</p>
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
        <h3>What is inside</h3>
        <ul>${book.spine.map((line) => `<li>${esc(line)}</li>`).join('')}</ul>
      </div>

      ${book.scriptures.length ? `
      <div class="prose">
        <h3>Scripture, KJV throughout</h3>
        <p>${book.scriptures.map(esc).join(' · ')}</p>
      </div>` : ''}

      ${book.wellnessNote ? disclaimerNote('wellness') : ''}
      ${book.legalNote ? disclaimerNote('legal') : ''}
      ${book.rightsNote ? `
      <aside class="note-card">
        <span class="note-icon" aria-hidden="true">${shieldIcon('#96771F')}</span>
        <span>
          <span class="t">Written releases pending</span>
          <span class="s">This book tells the stories of living people by name. Until each of them has signed a release, the names stay out of everything published about it — including this page.</span>
        </span>
      </aside>` : ''}
      <div class="screen-foot"></div>
    </div>

    <div>
      ${book.assets ? editionDownloadPanel([{ title: book.title, assets: book.assets }], 'Download this book') : ''}
      ${product ? `
      <div class="aside-card"${book.assets ? ' style="margin-top:16px"' : ''}>
        <span class="cap">Available now</span>
        <h2>${money(product.price)}</h2>
        <p>${esc(product.note)}</p>
        <a class="btn btn-gold" href="${hrefForProduct(product.id)}">See it in the shop</a>
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
  <aside class="note-card">
    <span class="note-icon" aria-hidden="true">${shieldIcon('#96771F')}</span>
    <span>
      <span class="t">${esc(copy.t)}</span>
      <span class="s">${esc(copy.s)} <a href="${hrefFor('disclaimer')}">Read the full disclaimers</a></span>
    </span>
  </aside>`;
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
        <h3>Try this</h3>
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
                  aria-label="Mark “${esc(section.title)}” as gathered">
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
          <span class="mark" aria-hidden="true">${cupMarkOnDark(46)}</span>
          <span class="kind">${esc(p.kind)}</span>
        </span>
        <span class="prod-info">
          <span class="t">${esc(p.title)}</span>
          <span class="m">${esc(p.note)}</span>
          <span class="p">${p.buyable ? (p.free ? 'Free' : money(p.price)) : esc(p.status)}</span>
        </span>
      </a>`).join('')}
    </div>
    <div class="screen-foot"></div>
  </div>`;
};

screens.product = () => {
  const product = productById(state.activeProduct);
  const owned = inLibrary(product.id);
  const carted = inCart(product.id);
  const included = (product.includes || []).map(bookById).filter(Boolean);

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
      <div class="pd-cover">
        <span class="mark" aria-hidden="true">${cupMarkOnDark(96)}</span>
        <span class="cap">${esc(product.kind.toLowerCase())}</span>
      </div>
    </div>

    <div>
      <div class="pd-price-row">
        <span class="p">${product.buyable ? (product.free ? 'Free' : money(product.price)) : money(product.price)}</span>
        <span class="note">${product.buyable ? esc(product.note) : esc(product.status)}</span>
      </div>

      ${productActions(product, { owned, carted })}

      ${editionDownloadPanel(editionsForProduct(product), product.includes?.length || product.includesProducts?.length ? 'Files included in this set' : 'Download editions')}

      <h2 class="about-cap">About this</h2>
      <p class="about-copy">${esc(product.about)}</p>

      ${included.length ? `
      <div class="prose">
        <h3>What is in it</h3>
        <ul>${included.map((b) => `<li>${esc(b.title)}</li>`).join('')}</ul>
      </div>` : ''}

      ${product.id === 'first-three' || product.id === 'six-set' || product.id === 'six-plus-workbook'
        ? disclaimerNote('legal') : ''}
      <div class="screen-foot"></div>
    </div>
  </div>`;
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
        <a class="btn btn-ghost" href="${hrefFor('read')}">Read the series free</a>
        <a class="btn btn-ghost" href="${hrefFor('shop')}">Back to the shop</a>
      </div>
    </div>`;
  }
  return `
  <div class="pd-actions">
    <button class="btn btn-gold" data-buy="${esc(product.id)}" data-focus-key="buy">${owned ? 'In your library ✓' : 'Buy now'}</button>
    <div class="row2">
      <button class="btn btn-dark" data-cart-toggle="${esc(product.id)}" data-focus-key="cart-toggle" aria-pressed="${carted}">${carted ? 'In your cart ✓' : 'Add to cart'}</button>
      <a class="btn btn-ghost" href="${hrefFor('read')}">Read free first</a>
    </div>
  </div>`;
}

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
        <span class="thumb" aria-hidden="true">${cupMarkOnDark(24)}</span>
        <span class="who">
          <span class="t">${esc(p.title)}</span>
          <span class="k">${esc(p.kind)}</span>
        </span>
        <span class="side">
          <span class="p">${money(p.price)}</span>
          <button class="rm" data-remove="${esc(p.id)}">Remove<span class="sr-only"> ${esc(p.title)} from cart</span></button>
        </span>
      </div>`).join('')}
    </div>

    <aside class="summary">
      <div class="cart-summary">
        <div class="subtotal-row">
          <span class="l">Subtotal</span>
          <span class="v">${money(subtotal)}</span>
        </div>
        <button class="btn btn-gold" data-checkout>Checkout · ${money(subtotal)}</button>
        <p class="fine">Instant download · 30-day money-back guarantee</p>
      </div>
    </aside>
  </div>` : `
  <div class="shell">
    <div class="cart-empty">
      Your cart is empty.<br>The reading is free either way.
      <a class="btn btn-dark" href="${hrefFor('shop')}">Browse the shop</a>
    </div>
  </div>`}
  <div class="screen-foot"></div>`;
};

/* ==========================================================================
   Checkout
   ========================================================================== */
const PAY_OPTIONS = [
  { id: 'card', title: 'Debit or credit card', sub: 'Visa, Mastercard, Amex' },
  { id: 'invoice', title: 'Church or organisation invoice', sub: 'For group licences — we send an invoice, nothing is due today' },
];

const payDetails = () => {
  if (state.payMethod === 'card') {
    return `
    <div class="field-wrap">
      <input class="field" inputmode="numeric" autocomplete="cc-number" placeholder="Card number" aria-label="Card number">
      <div class="split">
        <input class="field" inputmode="numeric" autocomplete="cc-exp" placeholder="MM / YY" aria-label="Expiry date">
        <input class="field" inputmode="numeric" autocomplete="cc-csc" placeholder="CVC" aria-label="Security code">
      </div>
      <input class="field" autocomplete="cc-name" placeholder="Name on card" aria-label="Name on card">
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
    <div class="shell">
      <div class="cart-empty">
        Your cart is empty.
        <a class="btn btn-dark" href="${hrefFor('shop')}">Browse the shop</a>
      </div>
    </div>`;
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
          <span class="t">${esc(p.title)}</span>
          <span class="p">${money(p.price)}</span>
        </div>`).join('')}
        <p class="s">Delivered as ePub and PDF, downloadable straight after payment and yours to keep.</p>
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
    <p>Your download link is on its way by email. While you wait — the Legacy Inventory is free, and it is the one thing in this whole series your family will thank you for.</p>
    <div class="done-actions">
      <a class="btn btn-dark" href="${hrefFor('legacy')}">Open the Legacy Inventory</a>
      <a class="btn btn-ghost" href="${hrefFor('read')}">Keep reading</a>
    </div>
    <p class="signoff">${esc(BRAND.closing)} — ${esc(BRAND.blessing)}</p>
  </div>`;

/* ==========================================================================
   About
   ========================================================================== */
screens.about = () => `
  <header class="dark-head">
    <span class="glow" aria-hidden="true"></span>
    <div class="shell">
      ${backButton('home')}
      <p class="eyebrow">${esc(BRAND.authorTagline)}</p>
      <h1>${esc(BRAND.author)}</h1>
      <p class="lede">Founder of ${esc(BRAND.name)} · ${esc(BRAND.publisher)}</p>
    </div>
  </header>

  <div class="shell about-layout">
    <div>
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
        <p>A Cup of Compassion is an educational publisher. We do not draft wills, trusts, or any other legal instrument, and we never will. What we do is make sure you walk into an attorney’s office already knowing what you own, what you want, and who you want it to go to.</p>
        <a class="btn btn-ghost" href="${hrefFor('disclaimer')}">Read the disclaimers</a>
      </div>

      <div class="aside-card" style="margin-top:16px">
        <span class="cap">Get in touch</span>
        <h2>Contact</h2>
        <p><a href="mailto:${esc(BRAND.email)}">${esc(BRAND.email)}</a><br>${esc(BRAND.site)}</p>
        <p class="hint">${esc(BRAND.social)} — not yet confirmed claimed, so it is printed here and linked nowhere.</p>
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
      'This app runs entirely in your browser. It has no account, no server, and no analytics. The only thing it remembers is which sections you have ticked and what is in your cart, kept in this browser’s local storage and readable by nobody but you. Clearing your browser data erases it.',
      'We will never ask you to type an account number, a policy number, or the contents of a safe deposit box into a web form — not on this site, and not anywhere else.',
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
