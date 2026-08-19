/**
 * Shared chrome: sidebar, app bar, tab bar, overlays.
 */

import { esc, join } from './dom.js';
import {
  TABS, TOOLS, TAB_OF, BRAND, FOOTER_LINE, SOCIAL_LINKS, ONBOARDING,
} from './data.js';
import { state } from './state.js';
import {
  arrowLeft, cartIcon, bigCheck, closeIcon, chevron, toolsIcon,
} from './icons.js';

/** Hash route for a screen id. */
export const hrefFor = (screen) => (screen === 'welcome' ? '#/' : `#/${screen}`);
export const hrefForBook = (id) => `#/book/${encodeURIComponent(id)}`;
export const hrefForLesson = (id) => `#/lesson/${encodeURIComponent(id)}`;
export const hrefForProduct = (id) => `#/product/${encodeURIComponent(id)}`;

const currentTab = () => TAB_OF[state.screen] || null;

/**
 * The Tools group: one button that opens onto My Library and Network. It is
 * expanded whenever one of those screens is open, so the current page is never
 * hidden behind a collapsed disclosure.
 */
function toolsGroup(active) {
  const open = state.toolsOpen || active === 'tools';
  return `
  <button class="side-link side-tools"
          data-tools-toggle
          data-focus-key="tools-toggle"
          aria-expanded="${open}"
          aria-controls="side-tools-list"${active === 'tools' ? ' aria-current="page"' : ''}>
    ${toolsIcon(21, 'currentColor', 1.9)}
    <span>Tools</span>
    <span class="caret${open ? ' open' : ''}" aria-hidden="true">${chevron('currentColor')}</span>
  </button>
  <div class="side-sub" id="side-tools-list"${open ? '' : ' hidden'}>
    ${TOOLS.map((tool) => `
    <a class="side-sublink" href="${hrefFor(tool.id)}"${tool.id === state.screen ? ' aria-current="page"' : ''}>
      ${tool.icon(17, 'currentColor', 1.9)}
      <span>${esc(tool.label)}</span>
    </a>`).join('')}
  </div>`;
}

/** The official "A Cup of Compassion" wordmark, used across every screen of chrome. */
export const brandLogo = (className = 'official-logo', alt = `${BRAND.series} — ${BRAND.name}`) =>
  `<img class="${className}" src="${esc(BRAND.logo)}" alt="${esc(alt)}" width="972" height="558" decoding="async">`;

export function sidebar() {
  const active = currentTab();
  return `
  <a class="side-brand" href="${hrefFor('home')}">
    ${brandLogo('side-logo')}
    <span>
      <span class="name">${esc(BRAND.app)}</span>
      <span class="tag">${esc(BRAND.appBy)}</span>
    </span>
  </a>
  <nav class="side-nav" aria-label="Primary">
    ${TABS.map((tab) => `
    <a class="side-link" href="${hrefFor(tab.id)}"${tab.id === active ? ' aria-current="page"' : ''}>
      ${tab.icon(21, 'currentColor', 1.9)}
      <span>${esc(tab.label)}</span>
      ${tab.id === 'shop' && state.cart.length ? `<span class="badge">${state.cart.length}</span>` : ''}
    </a>`).join('')}
    ${toolsGroup(active)}
  </nav>
  <div class="side-foot">
    <nav class="side-minor" aria-label="Secondary">
      <a href="${hrefFor('about')}">About Pamella</a>
      <button type="button" class="side-minor-btn" data-open-sheet="onboarding">Read the welcome note</button>
      <a href="${hrefFor('disclaimer')}">Disclaimers</a>
      <a href="${hrefFor('status')}">Production status</a>
    </nav>
    <div class="side-social">
      ${SOCIAL_LINKS.map((link) => `
      <a href="${esc(link.url)}" target="_blank" rel="noopener noreferrer">${esc(link.label)}</a>`).join('')}
    </div>
    <p class="scr">${esc(BRAND.closing)}</p>
    <p class="org">${esc(BRAND.publisher)}</p>
  </div>`;
}

export function appbar() {
  return `
  <a class="brand" href="${hrefFor('home')}">
    ${brandLogo('app-logo')}
  </a>
  <span class="spacer"></span>
  <a class="cart-btn" href="${hrefFor('cart')}" aria-label="Cart, ${state.cart.length} item${state.cart.length === 1 ? '' : 's'}">
    ${state.cart.length ? `<span class="dot" aria-hidden="true">${state.cart.length}</span>` : ''}
    ${cartIcon(20, '#B08D2E', 2)}
  </a>`;
}

export function tabbar() {
  // About, Disclaimers, and Production status sit outside the five tabs. They
  // still get the bar — without it a phone has no way out but the back button.
  if (state.screen === 'welcome') return '';

  const active = currentTab();
  // Tools rides the bar as a sixth tab: on a phone there is no sidebar, so
  // without it My Library and Network would have no way in.
  const tabs = [...TABS, { id: 'tools', label: 'Tools', icon: toolsIcon }];
  return `
  <nav class="tabbar" aria-label="Primary">
    ${tabs.map((tab) => `
    <a class="tab" href="${hrefFor(tab.id)}"${tab.id === active ? ' aria-current="page"' : ''}>
      ${tab.id === 'shop' && state.cart.length ? `<span class="cart-dot" aria-hidden="true">${state.cart.length}</span>` : ''}
      ${tab.icon(23, tab.id === active ? '#4A2A63' : '#6E6478', 1.9)}
      <span>${esc(tab.label)}</span>
    </a>`).join('')}
  </nav>`;
}

/**
 * A cover preview. Grids load the 640px thumbnail; `sizes` lets a browser on a
 * dense display pull the full 1600 x 2560 rendition from the same srcset, which
 * is also what the "view full size" links point at.
 */
export const coverArt = (assets, alt, sizes = '160px', loading = 'lazy') => `
  <img class="cover-art${assets.coverFit === 'contain' ? ' contain' : ''}"
       src="${esc(assets.coverThumb)}"
       srcset="${esc(assets.coverThumb)} 640w, ${esc(assets.cover)} 1600w"
       sizes="${esc(sizes)}"
       width="640" height="1024"
       loading="${esc(loading)}"${loading === 'eager' ? ' fetchpriority="high"' : ''} decoding="async"
       alt="Cover of ${esc(alt)}">`;

export const backButton = (screen, label = 'Back') =>
  `<a class="back-btn" href="${hrefFor(screen)}">${arrowLeft}${esc(label)}</a>`;

/**
 * The canonical book footer (Bible §1), reused on every long-form screen. The
 * printed line stays exactly as it appears inside the books; the platform links
 * sit beneath it, and are the ones Pamella confirmed herself (Bible §11).
 */
export const brandFooter = () => `
  <footer class="brand-foot">
    ${brandLogo('footer-logo', BRAND.series)}
    <p class="line">${esc(FOOTER_LINE)}</p>
    <p class="social">
      ${SOCIAL_LINKS.map((link) => `
      <a href="${esc(link.url)}" target="_blank" rel="noopener noreferrer">${esc(link.label)}</a>`).join('')}
    </p>
    <p class="tag">${esc(BRAND.tagline)}</p>
    <p class="sign">${esc(BRAND.closing)} — ${esc(BRAND.blessing)}</p>
  </footer>`;

/** Rendered once at boot and never re-rendered, so focus and timers survive. */
export const overlays = () => join([
  '<div class="sheet-backdrop" id="backdrop" hidden></div>',
  `
  <div class="sheet" id="sheet-library" role="dialog" aria-modal="true" aria-labelledby="lib-title" hidden>
    <span class="badge solid">${bigCheck(32)}</span>
    <h2 id="lib-title">Added to My Library</h2>
    <p id="lib-copy">Saved to your library.</p>
    <button class="btn btn-gold" data-close-sheet data-then="library">Open My Library</button>
    <button class="btn btn-dark" data-close-sheet data-then="shop">Keep browsing</button>
  </div>`,
  `
  <div class="sheet sheet-onboarding" id="sheet-onboarding" role="dialog" aria-modal="true" aria-labelledby="onboarding-title" hidden>
    <button class="sheet-dismiss" type="button" data-close-sheet aria-label="Close">${closeIcon('#6E6478')}</button>
    <img class="onboarding-portrait" src="${esc(BRAND.headshot)}" alt="Portrait of ${esc(BRAND.author)}" width="88" height="88">
    <p class="onboarding-eyebrow">${esc(ONBOARDING.eyebrow)}</p>
    <h2 id="onboarding-title">${esc(ONBOARDING.title)}</h2>
    <div class="onboarding-body">
      ${ONBOARDING.letter.map((p) => `<p>${esc(p)}</p>`).join('')}
    </div>
    <blockquote class="onboarding-quote"><p>“${esc(ONBOARDING.quote)}”</p></blockquote>
    <div class="onboarding-features">
      <p class="onboarding-features-label">${esc(ONBOARDING.featuresLabel)}</p>
      <ul>
        ${ONBOARDING.features.map((f) => `<li><strong>${esc(f.title)}</strong><span>${esc(f.body)}</span></li>`).join('')}
      </ul>
    </div>
    <p class="onboarding-sign">${esc(ONBOARDING.closing)}<br><strong>${esc(BRAND.author)}</strong></p>
    <button class="btn btn-gold" data-close-sheet data-then="home">Enter the Hub</button>
  </div>`,
  '<div class="toast" id="toast" role="status" aria-live="polite"></div>',
  /* For changes that are obvious on screen and silent otherwise — filtering
     the shop redraws a grid nobody is told about. */
  '<p class="sr-only" id="live" role="status" aria-live="polite"></p>',
]);
