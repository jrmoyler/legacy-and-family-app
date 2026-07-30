/**
 * Shared chrome: sidebar, app bar, tab bar, overlays.
 */

import { esc, join } from './dom.js';
import { TABS, TAB_OF } from './data.js';
import { state } from './state.js';
import {
  treeMark, arrowLeft, cartIcon, starOutline, bigCheck,
} from './icons.js';

/** Hash route for a screen id. */
export const hrefFor = (screen) => (screen === 'welcome' ? '#/' : `#/${screen}`);
export const hrefForProduct = (id) => `#/product/${encodeURIComponent(id)}`;

const currentTab = () => TAB_OF[state.screen] || null;

export function sidebar() {
  const active = currentTab();
  return `
  <a class="side-brand" href="${hrefFor('home')}">
    <span class="mark">${treeMark(26)}</span>
    <span>
      <span class="name">Family Legacy</span>
      <span class="tag">Plant. Protect. Pass on.</span>
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
    <p class="scr">Wills, trusts &amp; legacy planning in plain language.</p>
    <p class="org">Built by Collective AI Inc.</p>
  </div>`;
}

export function appbar() {
  return `
  <a class="brand" href="${hrefFor('home')}">
    <span class="mark">${treeMark(20)}</span>
    <span class="name">Family Legacy</span>
  </a>
  <span class="spacer"></span>
  <a class="cart-btn" href="${hrefFor('cart')}" aria-label="Cart, ${state.cart.length} item${state.cart.length === 1 ? '' : 's'}">
    ${state.cart.length ? `<span class="dot" aria-hidden="true">${state.cart.length}</span>` : ''}
    ${cartIcon(20, '#C99B47', 2)}
  </a>`;
}

export function tabbar() {
  const active = currentTab();
  if (!active) return '';
  return `
  <nav class="tabbar" aria-label="Primary">
    ${TABS.map((tab) => `
    <a class="tab" href="${hrefFor(tab.id)}"${tab.id === active ? ' aria-current="page"' : ''}>
      ${tab.id === 'shop' && state.cart.length ? `<span class="cart-dot" aria-hidden="true">${state.cart.length}</span>` : ''}
      ${tab.icon(23, tab.id === active ? '#1F3D2E' : '#A89F8B', 1.9)}
      <span>${esc(tab.label)}</span>
    </a>`).join('')}
  </nav>`;
}

export const backButton = (screen, label = 'Back') =>
  `<a class="back-btn" href="${hrefFor(screen)}">${arrowLeft}${esc(label)}</a>`;

/** Rendered once at boot and never re-rendered, so focus and timers survive. */
export const overlays = () => join([
  '<div class="sheet-backdrop" id="backdrop" hidden></div>',
  `
  <div class="sheet" id="sheet-giveaway" role="dialog" aria-modal="true" aria-labelledby="gw-title" hidden>
    <span class="badge gold-ring">${starOutline(30, '#C99B47')}</span>
    <h2 id="gw-title">You’re entered!</h2>
    <p>You’re in the draw for a 7-bedroom villa in Puerto Plata — 5 nights for the family. We’ll email you if you win. Good luck!</p>
    <button class="btn btn-gold" data-toast="Opening the villa &amp; resort…">See the villa &amp; resort&nbsp;↗</button>
    <button class="btn btn-dark" data-close-sheet>Done</button>
  </div>`,
  `
  <div class="sheet" id="sheet-library" role="dialog" aria-modal="true" aria-labelledby="lib-title" hidden>
    <span class="badge solid">${bigCheck(32)}</span>
    <h2 id="lib-title">Added to your library</h2>
    <p id="lib-copy">Saved to your library.</p>
    <button class="btn btn-gold" data-close-sheet data-then="shop">Keep shopping</button>
    <button class="btn btn-dark" data-close-sheet data-then="home">Back to home</button>
  </div>`,
  '<div class="toast" id="toast" role="status" aria-live="polite"></div>',
]);
