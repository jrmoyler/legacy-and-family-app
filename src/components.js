/**
 * Shared chrome: sidebar, app bar, tab bar, overlays.
 */

import { esc } from './dom.js';
import { TABS, TAB_OF, BRAND } from './data.js';
import { state } from './state.js';
import {
  arrowLeft, cartIcon,
} from './icons.js';

/** Hash route for a screen id. */
export const hrefFor = (screen) => (screen === 'welcome' ? '#/' : `#/${screen}`);
export const hrefForBook = (id) => `#/book/${encodeURIComponent(id)}`;
export const hrefForLesson = (id) => `#/lesson/${encodeURIComponent(id)}`;
export const hrefForProduct = (id) => `#/product/${encodeURIComponent(id)}`;

const currentTab = () => TAB_OF[state.screen] || null;

export const brandLogo = (className = 'official-logo', alt = '') =>
  `<img class="${className}" src="${esc(BRAND.logo)}" alt="${esc(alt)}" width="1536" height="255" decoding="async">`;

export function sidebar() {
  const active = currentTab();
  return `
  <a class="side-brand" href="${hrefFor('home')}">
    ${brandLogo('side-logo')}
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
      <a href="${esc(BRAND.socialUrl)}" target="_blank" rel="noreferrer">Instagram</a>
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
    ${brandLogo('app-logo', `${BRAND.series} — ${BRAND.name}`)}
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

export const brandFooter = () => `
  <footer class="brand-foot">
    ${brandLogo('footer-logo', BRAND.series)}
    <p class="line">
      <span>${esc(BRAND.site)}</span>
      <span aria-hidden="true"> | </span>
      <a href="mailto:${esc(BRAND.email)}">${esc(BRAND.email)}</a>
      <span aria-hidden="true"> | </span>
      <a href="${esc(BRAND.socialUrl)}" target="_blank" rel="noreferrer">${esc(BRAND.social)}</a>
    </p>
    <p class="tag">${esc(BRAND.tagline)}</p>
    <p class="sign">${esc(BRAND.closing)} — ${esc(BRAND.blessing)}</p>
  </footer>`;

/** Rendered once at boot and never re-rendered, so timers survive. */
export const overlays = () => '<div class="toast" id="toast" role="status" aria-live="polite"></div>';
