/**
 * Screen templates. Each function returns the inner HTML for one screen.
 *
 * Layout rule: full-bleed bands (dark headers, the welcome hero) own the page
 * width; readable content always sits inside a `.shell` so it stays centred and
 * measured on a wide monitor.
 */

import { esc } from './dom.js';
import {
  PLANS, PLAN_ORDER, PRODUCTS, CATEGORIES, productById,
  WILL_STEPS, TRUST_STEPS, WILL_NEEDS, TRUST_NEEDS,
  CHAPTERS, LESSONS, LESSON_TOTAL, ADVISORS,
} from './data.js';
import {
  state, firstStepsDone, hasReadLesson, inCart, inLibrary,
} from './state.js';
import { backButton, hrefFor, hrefForProduct } from './components.js';
import {
  treeMark, chevron, goldCheck, bigCheck, playTriangle, pauseBars,
  starSolid, starOutline, refreshIcon, lockIcon, cartIcon, bookIcon,
  peopleIcon, cardIcon,
} from './icons.js';

export const screens = {};

/* ==========================================================================
   Welcome
   ========================================================================== */
screens.welcome = () => `
  <div class="shell welcome-body">
    <div>
      <div class="brand-row">
        <span class="brand-mark">${treeMark(32)}</span>
        <span>
          <span class="name">Family Legacy</span>
          <span class="tag">Plant. Protect. Pass on.</span>
        </span>
      </div>
      <p class="welcome-eyebrow">Wills, Trusts &amp; Legacy</p>
      <h1 class="welcome-h1">Protect your family today.</h1>
      <p class="welcome-copy">Plain-language guidance and trusted help from our community network — so your home, your land, and your legacy stay in the family.</p>
      <div class="welcome-actions">
        <a class="btn btn-gold" href="${hrefFor('home')}">Get started</a>
        <a class="btn btn-ghost-dark" href="${hrefFor('plans')}">See the plans</a>
      </div>
      <p class="welcome-foot">Free to learn · Trusted help nearby</p>
    </div>
    <blockquote class="scripture">
      <p>“A good person leaves an inheritance for their children’s children.”</p>
      <cite>Proverbs 13:22</cite>
    </blockquote>
  </div>`;

/* ==========================================================================
   Home
   ========================================================================== */
screens.home = () => {
  const done = firstStepsDone();
  const pct = done * 20;
  const circumference = 2 * Math.PI * 40;

  return `
  <div class="shell">
    <header class="page-head">
      <div>
        <p class="bless">Blessings,</p>
        <h1>Family Legacy Plan</h1>
      </div>
      <span class="avatar-tile" aria-hidden="true">${treeMark(26)}</span>
    </header>

    <div class="home-grid">
      <a class="progress-card span-all" href="${hrefFor('guide-will')}">
        <span class="ring" aria-hidden="true">
          <svg width="96" height="96" viewBox="0 0 96 96">
            <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="7"/>
            <circle cx="48" cy="48" r="40" fill="none" stroke="#C99B47" stroke-width="7" stroke-linecap="round"
              stroke-dasharray="${circumference}" stroke-dashoffset="${circumference * (1 - pct / 100)}"
              style="transition:stroke-dashoffset .5s"/>
          </svg>
          <span class="pct">${pct}<small>%</small></span>
        </span>
        <span class="body">
          <span class="kicker">Getting started</span>
          <span class="big">${done} of 5 first steps done</span>
          <span class="sub">Small steps today protect everything you’ve built. Open the will guide and pick up where you left off.</span>
          <span class="go">Continue your will ${chevron('#C99B47')}</span>
        </span>
      </a>

      <h2 class="star-row span-all">${starSolid(18, '#C99B47')} Start building your legacy today</h2>

      <a class="market-cta span-all" href="${hrefFor('shop')}">
        <span class="icon-tile">${cartIcon(24, '#2B2410', 2)}</span>
        <span class="body">
          <span class="t">Shop the Marketplace</span>
          <span class="s">eBooks, courses, workbooks &amp; toolkits</span>
        </span>
        ${chevron('#2B2410')}
      </a>

      <div class="quick-grid span-all">
        <a class="quick-tile" href="${hrefFor('learn')}"><span class="icon-tile it-gold">${bookIcon(22, '#B8893A', 1.9)}</span>Take a course</a>
        <a class="quick-tile" href="${hrefFor('network')}"><span class="icon-tile it-sage">${peopleIcon(22, '#2F5443', 1.9)}</span>Book a consult</a>
        <a class="quick-tile" href="${hrefFor('plans')}"><span class="icon-tile it-gold">${starOutline(22, '#B8893A')}</span>Become a member</a>
      </div>

      <a class="video-card" href="${hrefFor('video')}">
        <span class="video-thumb">
          <span class="pill pill-gold">Free forever</span>
          <span class="play" aria-hidden="true">${playTriangle(26, '#1F3D2E')}</span>
          <span class="kicker">Video presentation</span>
          <span class="t">Protecting Our Legacy</span>
        </span>
        <span class="video-meta">
          <span>12:24 · with Pam Foster</span>
          <span class="upd">${refreshIcon('#1F3D2E')}Updated regularly</span>
        </span>
      </a>

      <button class="giveaway-card" data-open-sheet="giveaway">
        <span class="pill pill-gold-soft">Member giveaway</span>
        <span class="t">Win a 7-bedroom villa stay</span>
        <span class="s">Puerto Plata — 5 nights for the family. Every member is entered in the draw.</span>
        <span class="go">Enter the draw ${chevron('#C99B47')}</span>
      </button>
    </div>
    <div class="screen-foot"></div>
  </div>`;
};

/* ==========================================================================
   Guides (will / trust)
   ========================================================================== */
function guideScreen(kind) {
  const isWill = kind === 'will';
  const steps = isWill ? WILL_STEPS : TRUST_STEPS;
  const checked = isWill ? state.willSteps : state.trustSteps;
  const needs = isWill ? WILL_NEEDS : TRUST_NEEDS;
  const doneCount = checked.filter(Boolean).length;

  return `
  <header class="dark-head">
    <span class="glow" aria-hidden="true"></span>
    <div class="shell">
      ${backButton('home')}
      <p class="eyebrow">${isWill ? 'Wills · Step by step' : 'Trusts · Step by step'}</p>
      <h1>${isWill ? 'How to start your Will' : 'How to start your Trust'}</h1>
      <p class="lede">${isWill
        ? 'A will tells everyone what you want to happen to your home, your money, and your belongings. Here is how to begin — in plain language.'
        : 'A trust protects your assets and keeps them out of probate court, so they pass straight to your family. Here is how to begin.'}</p>
    </div>
  </header>

  <div class="shell">
    <section class="need-wrap">
      <h2 class="cap">What you’ll need</h2>
      <div class="chips">${needs.map((n) => `<span class="chip">${esc(n)}</span>`).join('')}</div>
    </section>

    <div class="section-row">
      <h2>Step by step</h2>
      <span class="count">${doneCount} of ${steps.length} done</span>
    </div>

    <div class="steps-wrap">
      ${steps.map(([title, sub], i) => `
      <button class="step-card ${checked[i] ? 'done' : ''}"
              data-step="${kind}:${i}"
              data-focus-key="step-${kind}-${i}"
              aria-pressed="${checked[i]}">
        <span class="step-num" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
        <span class="body">
          <span class="t">${esc(title)}</span>
          <span class="s">${esc(sub)}</span>
        </span>
        <span class="step-check" aria-hidden="true">${bigCheck(14)}</span>
      </button>`).join('')}
      <a class="btn btn-ghost full" href="${isWill ? hrefFor('guide-trust') : hrefFor('network')}">
        ${isWill ? 'Next: How to start your Trust' : 'Talk to someone in our network'}
      </a>
    </div>
    <div class="screen-foot"></div>
  </div>`;
}

screens['guide-will'] = () => guideScreen('will');
screens['guide-trust'] = () => guideScreen('trust');

/* ==========================================================================
   Video
   ========================================================================== */
screens.video = () => `
  <header class="dark-head">
    <span class="glow" aria-hidden="true"></span>
    <div class="shell">
      ${backButton('home')}
      <p class="eyebrow">Video presentation</p>
      <h1>Protecting Our Legacy</h1>
      <p class="lede">Wills, Trusts &amp; Generational Wealth · with Pam Foster</p>
    </div>
  </header>

  <div class="shell video-layout">
    <div>
      <div class="player ${state.playing ? 'playing' : ''}" id="player">
        <button class="play" id="playBtn" aria-pressed="${state.playing}" aria-label="${state.playing ? 'Pause' : 'Play'} the presentation">
          ${state.playing ? pauseBars(24, '#1F3D2E') : playTriangle(30, '#1F3D2E')}
        </button>
        <span class="bar" aria-hidden="true"><i></i></span>
      </div>
      <div class="tag-row">
        <span class="tag tag-gold">Yours forever</span>
        <span class="tag tag-sage">Free updates</span>
        <span class="tag tag-neutral">12:24</span>
      </div>
      <p class="video-desc">Pam’s heartfelt message on why wills and trusts matter for our families — and how to keep our homes, land, and legacy where they belong. Saved to your library forever, and updated as the law changes.</p>
    </div>

    <div>
      <div class="section-row section-row-flush">
        <h2>Chapters</h2>
        <span class="count">${CHAPTERS.length} parts</span>
      </div>
      <div class="chapters">
        ${CHAPTERS.map(([ts, title], i) => `
        <button class="chapter ${state.playingChapter === i ? 'playing' : ''}"
                data-chapter="${i}"
                data-focus-key="chapter-${i}"
                aria-label="Play chapter ${i + 1}, ${esc(title)}, at ${esc(ts)}">
          <span class="ts" aria-hidden="true">${esc(ts)}</span>
          <span class="t" aria-hidden="true">${esc(title)}</span>
          ${playTriangle(15, '#C9B98F')}
        </button>`).join('')}
      </div>
      <div class="screen-foot"></div>
    </div>
  </div>`;

/* ==========================================================================
   Learn
   ========================================================================== */
screens.learn = () => `
  <div class="shell">
    <header class="page-head">
      <div>
        <p class="bless">Know the basics</p>
        <h1>Learn</h1>
      </div>
      <span class="count">${state.lessonsRead.length} of ${LESSON_TOTAL} read</span>
    </header>

    <button class="featured-card" data-lesson="featured" data-focus-key="lesson-featured" aria-pressed="${hasReadLesson('featured')}">
      <span class="pill">Start here</span>
      <span class="t">Wills vs. Trusts: what’s the difference?</span>
      <span class="m">4 min read ·&nbsp; ${hasReadLesson('featured') ? 'Read ✓' : 'New'}</span>
    </button>

    <div class="section-row"><h2>All lessons</h2></div>
    <div class="lesson-list">
      ${LESSONS.map((lesson) => `
      <button class="lesson ${hasReadLesson(lesson.id) ? 'read' : ''}"
              data-lesson="${esc(lesson.id)}"
              data-focus-key="lesson-${esc(lesson.id)}"
              aria-pressed="${hasReadLesson(lesson.id)}">
        <span class="glyph" aria-hidden="true">${hasReadLesson(lesson.id) ? bigCheck(16) : esc(lesson.glyph)}</span>
        <span class="body">
          <span class="t">${esc(lesson.title)}</span>
          <span class="m">${esc(lesson.mins)}${hasReadLesson(lesson.id) ? ' · Read' : ''}</span>
        </span>
        ${chevron('#C9B98F')}
      </button>`).join('')}
    </div>
    <div class="screen-foot"></div>
  </div>`;

/* ==========================================================================
   Network
   ========================================================================== */
screens.network = () => `
  <div class="shell">
    <header class="page-head">
      <div>
        <p class="bless">Trusted help, close to home</p>
        <h1>Our Network</h1>
      </div>
    </header>

    <section class="consult-card">
      <div>
        <h2>Talk to someone who gets it.</h2>
        <p>Book a free 20-minute consult with a vetted attorney or wealth coach in our community.</p>
      </div>
      <button class="btn btn-gold" data-toast="Request sent — we’ll reach out within one business day.">Request a free consultation</button>
    </section>

    <div class="section-row"><h2>Advisors in the network</h2></div>
    <div class="advisors">
      ${ADVISORS.map((advisor) => {
        const message = advisor.act === 'Visit site'
          ? `Opening ${advisor.name.split(' ')[0]}’s site…`
          : `Consult requested with ${advisor.name}.`;
        return `
      <div class="advisor">
        <span class="avatar" aria-hidden="true">${esc(advisor.init)}</span>
        <span class="who">
          <span class="n">${esc(advisor.name)}</span>
          <span class="r">${esc(advisor.role)}</span>
        </span>
        <button class="act" data-toast="${esc(message)}">
          ${esc(advisor.act)}<span class="sr-only"> — ${esc(advisor.name)}</span>
        </button>
      </div>`;
      }).join('')}
    </div>
    <div class="screen-foot"></div>
  </div>`;

/* ==========================================================================
   Plans
   ========================================================================== */
const planCard = (key, { featured = false } = {}) => {
  const plan = PLANS[key];
  return `
  <section class="plan-card ${featured ? 'featured' : ''}">
    ${featured ? '<span class="pill pill-gold">Will included free</span>' : ''}
    <h2>${esc(plan.title)}</h2>
    <div class="plan-price">
      <span class="amt">${esc(plan.price)}</span>
      <span class="per">${esc(plan.per)}</span>
    </div>
    <p class="desc">${esc(plan.sub)}</p>
    <ul class="check-list">
      ${plan.feats.map((f) => `<li>${goldCheck}${esc(f)}</li>`).join('')}
    </ul>
    <button class="btn ${featured ? 'btn-dark' : 'btn-ghost'}" data-checkout="${key}">Choose ${esc(plan.title)}</button>
  </section>`;
};

screens.plans = () => `
  <div class="shell has-sticky-cta">
    <header class="page-head">
      <div>
        <p class="bless">Affordable, transparent</p>
        <h1>Choose your plan</h1>
      </div>
    </header>
    <p class="plans-lede">Become a member and your legal will is <b>free</b>. Or pay once — all at once, monthly, or through your church group.</p>

    <div class="plans-grid">
      ${planCard(PLAN_ORDER[0], { featured: true })}
      ${planCard(PLAN_ORDER[1])}
      ${planCard(PLAN_ORDER[2])}
    </div>

    <aside class="insure-note">
      <span class="note-icon" aria-hidden="true">${cardIcon(22, '#B8893A', 1.9)}</span>
      <span>
        <span class="t">Insurance policies</span>
        <span class="s">Term life &amp; final expense, through licensed agents in our network. <a href="${hrefFor('network')}">Request a quote</a></span>
      </span>
    </aside>
    <div class="screen-foot"></div>
  </div>

  <div class="sticky-cta">
    <button class="btn btn-gold" data-checkout="member">Become a Legacy Member · $39.99/mo&nbsp;→</button>
    <p class="fine">Your legal will included free · cancel anytime</p>
  </div>`;

/* ==========================================================================
   Checkout
   ========================================================================== */
const PAY_OPTIONS = [
  { id: 'card', title: 'Debit or credit card', sub: 'Visa, Mastercard, Amex' },
  { id: 'monthly', title: 'Pay monthly', sub: '$21/mo for 12 months · 0% interest' },
  { id: 'church', title: 'Church group rate', sub: 'Covered through your ministry' },
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
  if (state.payMethod === 'monthly') {
    return '<p class="pay-note">12 monthly payments of $21, 0% interest. First payment today; card details are collected on the next step.</p>';
  }
  return '<p class="pay-note">We’ll confirm your ministry’s group coverage and email you once it’s applied — nothing due today.</p>';
};

screens.checkout = () => {
  const plan = PLANS[state.checkoutPlan];
  return `
  <header class="dark-head">
    <span class="glow" aria-hidden="true"></span>
    <div class="shell">
      ${backButton('plans')}
      <p class="eyebrow">Checkout</p>
      <h1>${esc(plan.title)}</h1>
    </div>
  </header>

  <div class="shell checkout-layout">
    <div class="summary">
      <section class="order-card">
        <div class="row1">
          <span class="t">${esc(plan.title)}</span>
          <span class="p">${esc(plan.price)}${plan.per === '/month' ? '<small>/mo</small>' : ''}</span>
        </div>
        <p class="s">${esc(plan.sub)}</p>
        <ul class="check-list">
          ${plan.feats.map((f) => `<li>${goldCheck}${esc(f)}</li>`).join('')}
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
        <button class="btn btn-gold" data-go="checkout-done">
          ${state.payMethod === 'church' ? 'Confirm through my church' : esc(plan.pay)}
        </button>
        <p class="fine">${lockIcon('#948B76')}Secure checkout · cancel anytime</p>
      </div>
      <div class="screen-foot"></div>
    </div>
  </div>`;
};

screens['checkout-done'] = () => {
  const plan = PLANS[state.checkoutPlan];
  return `
  <header class="dark-head">
    <span class="glow" aria-hidden="true"></span>
    <div class="shell">
      ${backButton('plans')}
      <p class="eyebrow">Checkout</p>
      <h1>${esc(plan.title)}</h1>
    </div>
  </header>

  <div class="shell done-body">
    <span class="done-badge" aria-hidden="true">${bigCheck(38)}</span>
    <h2>You’re protected.</h2>
    <p>Your ${esc(plan.title)} is active. We’ll email your next steps and connect you with someone in the network to finish your documents.</p>
    <div class="done-actions">
      <a class="btn btn-dark" href="${hrefFor('home')}">Back to home</a>
      <a class="btn btn-ghost" href="${hrefFor('network')}">Meet your advisor</a>
    </div>
  </div>`;
};

/* ==========================================================================
   Marketplace
   ========================================================================== */
screens.shop = () => {
  const visible = PRODUCTS.filter((p) => p.cats.includes(state.category));
  return `
  <div class="shell">
    <header class="page-head">
      <div>
        <p class="bless">Digital products &amp; courses</p>
        <h1>Marketplace</h1>
      </div>
      <a class="cart-btn" href="${hrefFor('cart')}" aria-label="Cart, ${state.cart.length} item${state.cart.length === 1 ? '' : 's'}">
        ${state.cart.length ? `<span class="dot" aria-hidden="true">${state.cart.length}</span>` : ''}
        ${cartIcon(22, '#C99B47', 2)}
      </a>
    </header>

    <a class="bundle-hero" href="${hrefForProduct('bundle')}">
      <span class="pill pill-gold">Best value</span>
      <span class="t">Family Legacy Complete Bundle</span>
      <span class="s">Every guide, course, workbook and toolkit we make — bundled into one complete legacy library at the best price.</span>
      <span class="row">
        <span class="price">$129</span>
        <span class="view">View bundle ${chevron('#F3ECDC')}</span>
      </span>
    </a>

    <div class="cat-chips" role="group" aria-label="Filter products by category">
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
      <a class="prod-card" href="${hrefForProduct(p.id)}">
        <span class="prod-cover">
          ${p.badge ? `<span class="badge">${esc(p.badge)}</span>` : ''}
          <span class="mono" aria-hidden="true">${esc(p.mono)}</span>
          <span class="kind">${esc(p.kind)}</span>
        </span>
        <span class="prod-info">
          <span class="t">${esc(p.title)}</span>
          <span class="m">${starSolid(12, '#C99B47')} ${esc(p.rating)}</span>
          <span class="p">$${p.price}</span>
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

  return `
  <header class="dark-head">
    <span class="glow" aria-hidden="true"></span>
    <div class="shell">
      ${backButton('shop', 'Marketplace')}
      <p class="eyebrow">${esc(product.kind)}</p>
      <h1>${esc(product.title)}</h1>
      <p class="pd-rating">${starSolid(15, '#C99B47')} ${esc(product.rating)} <span class="rv">${esc(product.reviews)}</span></p>
    </div>
  </header>

  <div class="shell product-layout">
    <div class="media">
      <div class="pd-cover">
        <span class="mono" aria-hidden="true">${esc(product.mono)}</span>
        <span class="cap">cover art · ${esc(product.kind.toLowerCase())}</span>
      </div>
    </div>

    <div>
      <div class="pd-price-row">
        <span class="p">$${product.price}</span>
        <span class="note">${esc(product.note)}</span>
      </div>

      <div class="pd-actions">
        <button class="btn btn-gold" data-buy="${esc(product.id)}" data-focus-key="buy">${owned ? 'In your library ✓' : 'Buy now'}</button>
        <div class="row2">
          <button class="btn btn-dark" data-cart-toggle="${esc(product.id)}" data-focus-key="cart-toggle" aria-pressed="${carted}">${carted ? 'In your cart ✓' : 'Add to cart'}</button>
          <button class="btn btn-ghost" data-toast="Preview sent to your email.">Preview</button>
        </div>
      </div>

      <h2 class="about-cap">About this product</h2>
      <p class="about-copy">${esc(product.about)}</p>

      <figure class="review-card">
        <div class="stars" aria-hidden="true">★★★★★</div>
        <blockquote><q>${esc(product.review.q)}</q></blockquote>
        <figcaption class="who">${esc(product.review.who)}</figcaption>
      </figure>
      <div class="screen-foot"></div>
    </div>
  </div>`;
};

screens.cart = () => {
  const items = state.cart.map(productById).filter(Boolean);
  const subtotal = items.reduce((sum, p) => sum + p.price, 0);

  return `
  <header class="dark-head">
    <span class="glow" aria-hidden="true"></span>
    <div class="shell">
      ${backButton('shop', 'Marketplace')}
      <p class="eyebrow">Your cart</p>
      <h1>${items.length} item${items.length === 1 ? '' : 's'}</h1>
    </div>
  </header>

  ${items.length ? `
  <div class="shell cart-layout">
    <div class="cart-items">
      ${items.map((p) => `
      <div class="cart-item">
        <span class="thumb" aria-hidden="true">${p.mono === 'G' ? playTriangle(20, '#C99B47') : esc(p.mono)}</span>
        <span class="who">
          <span class="t">${esc(p.title)}</span>
          <span class="k">${esc(p.kind)}</span>
        </span>
        <span class="side">
          <span class="p">$${p.price}</span>
          <button class="rm" data-remove="${esc(p.id)}">Remove<span class="sr-only"> ${esc(p.title)} from cart</span></button>
        </span>
      </div>`).join('')}
    </div>

    <aside class="summary">
      <div class="cart-summary">
        <div class="subtotal-row">
          <span class="l">Subtotal</span>
          <span class="v">$${subtotal}</span>
        </div>
        <button class="btn btn-gold" data-purchase>Checkout · $${subtotal}</button>
        <p class="fine">Instant access · 30-day money-back guarantee</p>
      </div>
    </aside>
  </div>` : `
  <div class="shell">
    <div class="cart-empty">
      Your cart is empty.<br>Everything in the Marketplace is one tap away.
      <a class="btn btn-dark" href="${hrefFor('shop')}">Browse the Marketplace</a>
    </div>
  </div>`}
  <div class="screen-foot"></div>`;
};
