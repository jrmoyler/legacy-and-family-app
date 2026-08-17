/**
 * Shared chrome: sidebar, app bar, tab bar, overlays.
 */

import { esc, join } from './dom.js';
import { TABS, TAB_OF, BRAND, FOOTER_LINE } from './data.js';
import { state } from './state.js';
import {
  cupMark, cupMarkOnDark, arrowLeft, cartIcon, bigCheck,
} from './icons.js';

/** Hash route for a screen id. */
export const hrefFor = (screen) => (screen === 'welcome' ? '#/' : `#/${screen}`);
export const hrefForBook = (id) => `#/book/${encodeURIComponent(id)}`;
export const hrefForLesson = (id) => `#/lesson/${encodeURIComponent(id)}`;
export const hrefForProduct = (id) => `#/product/${encodeURIComponent(id)}`;

const currentTab = () => TAB_OF[state.screen] || null;

export function sidebar() {
  const active = currentTab();
  return `
  <a class="side-brand" href="${hrefFor('home')}">
    <span class="mark">${cupMarkOnDark(26)}</span>
    <span>
      <span class="name">${esc(BRAND.name)}</span>
      <span class="tag">${esc(BRAND.tagline)}</span>
    </span>
  </a>
  <nav class="side-nav" aria-label="Primary">
    ${TABS.map((tab) => `
    <a class="side-link" href="${hrefFor(tab.id)}"${tab.id === active ? ' aria-current="page"' : ''}>
      ${tab.icon(21, 'currentColor', 1.9)}
      <span>${esc(tab.label)}</span>
      ${tab.id === 'shop' && state.cart.length ? `<span class="badge">${state.cart.length}</span>` : ''}
    </a>`).join('')}
  </nav>
  <div class="side-foot">
    <nav class="side-minor" aria-label="Secondary">
      <a href="${hrefFor('about')}">About Pamella</a>
      <a href="${hrefFor('disclaimer')}">Disclaimers</a>
      <a href="${hrefFor('status')}">Production status</a>
    </nav>
    <p class="scr">${esc(BRAND.closing)}</p>
    <p class="org">${esc(BRAND.publisher)}</p>
  </div>`;
}

export function appbar() {
  return `
  <a class="brand" href="${hrefFor('home')}">
    <span class="mark">${cupMark(20)}</span>
    <span class="name">${esc(BRAND.name)}</span>
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
  return `
  <nav class="tabbar" aria-label="Primary">
    ${TABS.map((tab) => `
    <a class="tab" href="${hrefFor(tab.id)}"${tab.id === active ? ' aria-current="page"' : ''}>
      ${tab.id === 'shop' && state.cart.length ? `<span class="cart-dot" aria-hidden="true">${state.cart.length}</span>` : ''}
      ${tab.icon(23, tab.id === active ? '#4A2A63' : '#6E6478', 1.9)}
      <span>${esc(tab.label)}</span>
    </a>`).join('')}
  </nav>`;
}

export const backButton = (screen, label = 'Back') =>
  `<a class="back-btn" href="${hrefFor(screen)}">${arrowLeft}${esc(label)}</a>`;

/**
 * The canonical book footer (Bible §1), reused on every long-form screen.
 * The social handle is printed as text but never linked — it is not confirmed
 * claimed on Instagram or Facebook yet (Bible §11).
 */
export const brandFooter = () => `
  <footer class="brand-foot">
    <p class="line">${esc(FOOTER_LINE)}</p>
    <p class="tag">${esc(BRAND.tagline)}</p>
    <p class="sign">${esc(BRAND.closing)} — ${esc(BRAND.blessing)}</p>
  </footer>`;

/** Rendered once at boot and never re-rendered, so focus and timers survive. */
export const overlays = () => join([
  '<div class="sheet-backdrop" id="backdrop" hidden></div>',
  `
  <div class="sheet" id="sheet-library" role="dialog" aria-modal="true" aria-labelledby="lib-title" hidden>
    <span class="badge solid">${bigCheck(32)}</span>
    <h2 id="lib-title">Added to your library</h2>
    <p id="lib-copy">Saved to your library.</p>
    <button class="btn btn-gold" data-close-sheet data-then="shop">Keep browsing</button>
    <button class="btn btn-dark" data-close-sheet data-then="home">Back to home</button>
  </div>`,
  '<div class="toast" id="toast" role="status" aria-live="polite"></div>',
]);
