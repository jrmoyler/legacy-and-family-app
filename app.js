/**
 * Compassion Hub by Cup of Compassion — application entry point.
 *
 * Responsibilities: hash routing, rendering, and event delegation.
 * Screen markup lives in src/screens.js; state lives in src/state.js.
 */

import { $, $$ } from './src/dom.js';
import { screens } from './src/screens.js';
import { sidebar, appbar, tabbar, overlays, hrefFor } from './src/components.js';
import {
  BRAND, CATEGORIES, FORMAT_SHORT, bookById, lessonById, productById, networkById,
} from './src/data.js';
import {
  state, loadState, saveState, toggleSection, toggleLesson,
  toggleCart, removeFromCart, addToLibrary, toggleSaved, setFormat, formatFor,
} from './src/state.js';

const view = $('#view');
const sidebarEl = $('#sidebar');
const appbarEl = $('#appbar');
const tabbarEl = $('#tabbar');
const overlayRoot = $('#overlays');

/* ==========================================================================
   Routing
   ========================================================================== */

/** Screens reachable directly by URL. */
const isScreen = (name) => Object.prototype.hasOwnProperty.call(screens, name);

/** Routes of the form `#/<head>/<id>`, each with its own lookup and fallback. */
const DETAIL_ROUTES = {
  book: { key: 'book', lookup: bookById, fallback: 'series' },
  lesson: { key: 'lesson', lookup: lessonById, fallback: 'read' },
  product: { key: 'product', lookup: productById, fallback: 'shop' },
};

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, '');
  if (!raw) return { screen: 'welcome' };

  const [head, ...rest] = raw.split('/');
  const detail = DETAIL_ROUTES[head];
  if (detail) {
    const id = decodeURIComponent(rest.join('/') || '');
    return detail.lookup(id) ? { screen: head, [detail.key]: id } : { screen: detail.fallback };
  }
  return isScreen(head) ? { screen: head } : { screen: 'welcome' };
}

/** Navigate by screen id. The hashchange listener does the rendering. */
function go(screen) {
  const next = hrefFor(screen);
  if (location.hash === next) renderRoute();
  else location.hash = next;
}

/* ==========================================================================
   Rendering
   ========================================================================== */

function paint() {
  view.innerHTML = `<div class="screen active" id="screen-${state.screen}">${screens[state.screen]()}</div>`;
  sidebarEl.innerHTML = sidebar();
  appbarEl.innerHTML = appbar();
  tabbarEl.innerHTML = tabbar();
}

/** Full navigation: render, reset scroll, move focus to the new page. */
function renderRoute() {
  const route = parseHash();
  state.screen = route.screen;
  if (route.book) state.activeBook = route.book;
  if (route.lesson) state.activeLesson = route.lesson;
  if (route.product) state.activeProduct = route.product;

  paint();
  window.scrollTo(0, 0);
  view.focus({ preventScroll: true });
  document.title = titleFor(state.screen);
}

/** In-place update after a state change: keep scroll position and focus. */
function refresh() {
  const scrollY = window.scrollY;
  const focusKey = document.activeElement?.getAttribute?.('data-focus-key');

  paint();

  window.scrollTo(0, scrollY);
  if (focusKey) {
    // Searched document-wide, not just the view: the sidebar re-renders too,
    // and its Tools disclosure is one of the controls that survives a refresh.
    const restored = document.querySelector(`[data-focus-key="${CSS.escape(focusKey)}"]`);
    if (restored) restored.focus({ preventScroll: true });
  }
}

const TITLES = {
  welcome: `${BRAND.appFull} — ${BRAND.tagline}`,
  home: 'Your reading',
  series: 'The Series',
  read: 'Read',
  legacy: 'The Legacy Inventory',
  shop: 'Shop',
  cart: 'Your cart',
  checkout: 'Checkout',
  'checkout-done': 'Thank you',
  tools: 'Tools',
  library: 'My Library',
  network: 'Network',
  about: BRAND.author,
  disclaimer: 'Disclaimers',
  status: 'Production status',
};

function titleFor(screen) {
  if (screen === 'welcome') return TITLES.welcome;

  const detail = {
    book: () => bookById(state.activeBook)?.title,
    lesson: () => lessonById(state.activeLesson)?.title,
    product: () => productById(state.activeProduct)?.title,
  }[screen];

  const name = detail ? detail() : TITLES[screen];
  return `${name || BRAND.app} — ${BRAND.app}`;
}

/* ==========================================================================
   Toast
   ========================================================================== */
let toastTimer;

function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

/* ==========================================================================
   Contact card export
   ========================================================================== */

/**
 * Export one Network entry as a .vcf file, so a phone or a mail client can
 * file the person away rather than the reader retyping an address. Built and
 * revoked in the page — nothing is uploaded, and no request leaves the app.
 */
function exportContactCard(id) {
  const person = networkById(id);
  if (!person) return;

  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${person.name}`,
    `TITLE:${person.title}`,
    person.org && `ORG:${person.org}`,
    person.email && `EMAIL;TYPE=INTERNET:${person.email}`,
    person.website && `URL:${person.website}`,
    ...(person.socials || []).map((link) => `URL:${link.url}`),
    `NOTE:${person.note} (via ${BRAND.appFull})`,
    'END:VCARD',
  ].filter(Boolean);

  // vCard is a CRLF format, and Outlook in particular rejects bare newlines.
  const blob = new Blob([`${lines.join('\r\n')}\r\n`], { type: 'text/vcard' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${person.id}.vcf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  toast(`${person.name}’s contact card downloaded`);
}

/* ==========================================================================
   Sheets (bottom sheet on phones, modal dialog on desktop)
   ========================================================================== */
let openSheetEl = null;
let sheetOpener = null;

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

function openSheet(name) {
  const sheet = document.getElementById(`sheet-${name}`);
  if (!sheet) return;

  sheetOpener = document.activeElement;
  openSheetEl = sheet;

  const backdrop = $('#backdrop');
  backdrop.hidden = false;
  sheet.hidden = false;

  // Force a reflow so the transition runs from the hidden position.
  void sheet.offsetHeight;
  backdrop.classList.add('open');
  sheet.classList.add('open');
  document.body.classList.add('no-scroll');

  // focus() is a no-op while the element is still visibility:hidden, so wait
  // for the browser to commit the class change before moving focus in.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => sheet.querySelector(FOCUSABLE)?.focus());
  });
}

function closeSheet() {
  if (!openSheetEl) return;

  const sheet = openSheetEl;
  const backdrop = $('#backdrop');
  openSheetEl = null;

  sheet.classList.remove('open');
  backdrop.classList.remove('open');
  document.body.classList.remove('no-scroll');

  setTimeout(() => {
    if (!sheet.classList.contains('open')) sheet.hidden = true;
    if (!$('.sheet.open')) backdrop.hidden = true;
  }, 320);

  sheetOpener?.focus?.();
  sheetOpener = null;
}

/** Keep Tab inside an open sheet, and let Escape dismiss it. */
document.addEventListener('keydown', (event) => {
  if (!openSheetEl) return;

  if (event.key === 'Escape') {
    event.preventDefault();
    closeSheet();
    return;
  }
  if (event.key !== 'Tab') return;

  const focusable = $$(FOCUSABLE, openSheetEl);
  if (!focusable.length) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});

/* ==========================================================================
   Event delegation
   ========================================================================== */
document.addEventListener('click', (event) => {
  const hit = (selector) => event.target.closest(selector);
  let el;

  /* --- overlays --- */
  if ((el = hit('[data-close-sheet]'))) {
    const then = el.dataset.then;
    closeSheet();
    if (then) setTimeout(() => go(then), 200);
    return;
  }
  if (event.target.closest('#backdrop')) {
    closeSheet();
    return;
  }
  /* --- fire-and-forget feedback --- */
  if ((el = hit('[data-toast]'))) {
    toast(el.dataset.toast);
    return;
  }

  /* --- the Legacy Inventory --- */
  if ((el = hit('[data-section]'))) {
    toast(toggleSection(el.dataset.section) ? 'Marked as gathered' : 'Unmarked');
    refresh();
    return;
  }
  if (hit('[data-print]')) {
    window.print();
    return;
  }

  /* --- reading --- */
  if ((el = hit('[data-lesson]'))) {
    toast(toggleLesson(el.dataset.lesson) ? 'Marked as read' : 'Marked as unread');
    refresh();
    return;
  }

  /* --- checkout --- */
  if ((el = hit('[data-pay]'))) {
    state.payMethod = el.dataset.pay;
    saveState();
    refresh();
    return;
  }
  if (hit('[data-checkout]')) {
    if (!state.cart.length) return;
    go('checkout');
    return;
  }

  /* --- tools --- */
  if (hit('[data-tools-toggle]')) {
    state.toolsOpen = !state.toolsOpen;
    refresh();
    return;
  }
  if ((el = hit('[data-vcard]'))) {
    exportContactCard(el.dataset.vcard);
    return;
  }

  /* --- shop --- */
  if ((el = hit('[data-format]'))) {
    const product = productById(el.dataset.formatProduct);
    if (!product) return;
    toast(`${FORMAT_SHORT[setFormat(product.id, el.dataset.format)]} selected`);
    refresh();
    return;
  }
  if ((el = hit('[data-save]'))) {
    const product = productById(el.dataset.save);
    if (!product) return;
    toast(toggleSaved(product.id) ? 'Saved to My Library' : 'Removed from saved');
    refresh();
    return;
  }
  if ((el = hit('[data-cat]'))) {
    if (!CATEGORIES.includes(el.dataset.cat)) return;
    state.category = el.dataset.cat;
    saveState();
    refresh();
    return;
  }
  if ((el = hit('[data-cart-toggle]'))) {
    toast(toggleCart(el.dataset.cartToggle) ? 'Added to cart' : 'Removed from cart');
    refresh();
    return;
  }
  if ((el = hit('[data-remove]'))) {
    removeFromCart(el.dataset.remove);
    refresh();
    return;
  }
  if ((el = hit('[data-buy]'))) {
    const product = productById(el.dataset.buy);
    if (!product) return;
    addToLibrary([product.id]);
    $('#lib-copy').textContent =
      `${product.title} is now in My Library, in ${FORMAT_SHORT[formatFor(product.id)]}.`;
    refresh();
    openSheet('library');
    return;
  }
  if (hit('[data-purchase]')) {
    const bought = state.cart.map(productById).filter(Boolean);
    if (!bought.length) return;
    addToLibrary(bought.map((p) => p.id));
    go('checkout-done');
    return;
  }

  /* --- plain navigation from a button --- */
  if ((el = hit('[data-go]'))) {
    event.preventDefault();
    go(el.dataset.go);
  }
});

/* ==========================================================================
   Boot
   ========================================================================== */
loadState();
overlayRoot.innerHTML = overlays();
window.addEventListener('hashchange', renderRoute);
renderRoute();
