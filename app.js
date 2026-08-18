/**
 * The Compassion Hub — application entry point.
 * Compassion Hub by Cup of Compassion — application entry point.
 *
 * Responsibilities: hash routing, rendering, and event delegation.
 * Screen markup lives in src/screens.js; state lives in src/state.js.
 */

import { $, $$ } from './src/dom.js';
import { screens, compassionMessageList } from './src/screens.js';
import { sidebar, appbar, tabbar, overlays, hrefFor } from './src/components.js';
import {
  BRAND, CATEGORIES, COMPASSION_API_URL, bookById, lessonById, productById,
  BRAND, CATEGORIES, PRODUCTS, FORMAT_SHORT,
  bookById, lessonById, productById, networkById,
} from './src/data.js';
import {
  state, loadState, saveState, toggleSection, toggleLesson,
  toggleCart, removeFromCart, addToLibrary, markOnboardingSeen,
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

function paint({ entering = false } = {}) {
  const cls = entering ? 'screen active enter' : 'screen active';
  view.innerHTML = `<div class="${cls}" id="screen-${state.screen}">${screens[state.screen]()}</div>`;
  sidebarEl.innerHTML = sidebar();
  appbarEl.innerHTML = appbar();
  tabbarEl.innerHTML = tabbar();
}

/* --- scroll -------------------------------------------------------------
   The document scrolls smoothly for in-page jumps, which is right for an
   anchor and wrong for a route change: a new page should already be at the
   top when it appears, not glide there. Every programmatic reset is therefore
   explicitly instant. */

const currentKey = () => location.hash || '#/';

/** Where each route was left, so Back returns to the card you clicked. */
const scrollMemory = new Map();
/** The route currently on screen — the one whose scroll position we own. */
let renderedKey = null;
/** Set by popstate, which fires for Back and Forward but not for a fresh
    navigation. Only history moves get their scroll position restored. */
let cameFromHistory = false;

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.addEventListener('popstate', () => { cameFromHistory = true; });

/** Full navigation: render, place the scroll, move focus to the new page. */
function renderRoute() {
  if (renderedKey !== null) scrollMemory.set(renderedKey, window.scrollY);

  const route = parseHash();
  state.screen = route.screen;
  if (route.book) state.activeBook = route.book;
  if (route.lesson) state.activeLesson = route.lesson;
  if (route.product) state.activeProduct = route.product;

  const arriving = renderedKey !== currentKey();
  paint({ entering: arriving });
  renderedKey = currentKey();

  const remembered = cameFromHistory ? scrollMemory.get(renderedKey) : 0;
  cameFromHistory = false;
  window.scrollTo({ top: remembered || 0, left: 0, behavior: 'instant' });

  view.focus({ preventScroll: true });
  document.title = titleFor(state.screen);

  if (state.screen === 'messages' && state.compassionMessagesStatus === 'idle') {
    loadCompassionMessages();
  }
  syncAppbar();
}

/** In-place update after a state change: keep scroll position and focus. */
function refresh() {
  const scrollY = window.scrollY;
  const focusKey = document.activeElement?.getAttribute?.('data-focus-key');
  capturePayFields();

  paint();

  window.scrollTo({ top: scrollY, left: 0, behavior: 'instant' });
  restorePayFields();
  if (focusKey) {
    // Searched document-wide, not just the view: the sidebar re-renders too,
    // and its Tools disclosure is one of the controls that survives a refresh.
    const restored = document.querySelector(`[data-focus-key="${CSS.escape(focusKey)}"]`);
    if (restored) restored.focus({ preventScroll: true });
  }
}

/**
 * Switching payment method re-renders the whole screen, which would otherwise
 * wipe anything already typed into the card fields — including on the way
 * back, since the invoice view has no fields to read the values off. So they
 * are held here rather than scraped from the DOM each time.
 *
 * In memory only: nothing a payment form collects is ever written to storage.
 */
const payFields = new Map();

function capturePayFields() {
  for (const input of $$('#view input.field')) {
    if (input.value) payFields.set(input.name, input.value);
  }
}

function restorePayFields() {
  for (const [name, value] of payFields) {
    const input = view.querySelector(`input.field[name="${CSS.escape(name)}"]`);
    if (input && !input.value) input.value = value;
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
  messages: 'Messages of Compassion',
};

let compassionLoadRequest = 0;

function timeoutSignal(milliseconds) {
  const controller = new AbortController();
  window.setTimeout(() => controller.abort(), milliseconds);
  return controller.signal;
}

async function loadCompassionMessages() {
  const requestId = ++compassionLoadRequest;
  state.compassionMessagesStatus = 'loading';
  if (state.screen === 'messages') {
    const list = view.querySelector('[data-compassion-list]');
    if (list) list.innerHTML = compassionMessageList();
  }

  try {
    const response = await fetch(COMPASSION_API_URL, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: timeoutSignal(10000),
    });
    if (!response.ok) throw new Error('message service unavailable');
    const payload = await response.json();
    if (requestId !== compassionLoadRequest) return;
    state.compassionMessages = Array.isArray(payload.messages) ? payload.messages : [];
    state.compassionMessagesStatus = 'ready';
  } catch {
    if (requestId !== compassionLoadRequest) return;
    state.compassionMessagesStatus = 'error';
  }

  if (state.screen === 'messages') {
    const list = view.querySelector('[data-compassion-list]');
    if (list) list.innerHTML = compassionMessageList();
  }
}

function updateCompassionForm(form) {
  const textarea = form.elements.message;
  const count = form.querySelector('[data-message-count]');
  const submit = form.querySelector('[type="submit"]');
  if (count) count.textContent = String(textarea.value.length);
  if (submit) submit.disabled = !form.checkValidity();
}

function setCompassionFormStatus(form, type, message) {
  const status = form.querySelector('[data-message-status]');
  if (!status) return;
  status.hidden = false;
  status.className = `message-form-status ${type}`;
  const heading = document.createElement('strong');
  heading.textContent = type === 'success'
    ? 'Thank you.'
    : 'We could not share that yet.';
  const detail = document.createElement('span');
  detail.textContent = message;
  status.replaceChildren(heading, detail);
}

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
   App bar
   ========================================================================== */

/** The mobile bar is flat against the top of the page and lifts once content
    runs underneath it. */
function syncAppbar() {
  appbarEl.classList.toggle('scrolled', window.scrollY > 4);
}
window.addEventListener('scroll', syncAppbar, { passive: true });

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

/** Speak something that only happened visually. Nothing is drawn. */
function announce(message) {
  $('#live').textContent = message;
}

/* ==========================================================================
   Contact card export
   ========================================================================== */

/**
 * Escape one vCard text value (RFC 2426 §2.4.2). A backslash, semicolon, or
 * comma left raw does not read as itself: the semicolon splits a structured
 * value into extra fields, and the comma splits a value into a list. An org
 * named "Mann, Bailey & Co." would arrive in the address book as two
 * organisations without this.
 */
const vcardText = (value) =>
  String(value).replace(/([\\;,])/g, '\\$1').replace(/\r?\n/g, '\\n');

/**
 * Split a display name into the family/given halves vCard wants. Everything
 * before the last word is the given name, which keeps "J. Douglas Bailey" and
 * "John-Ross Moyler" filing under Bailey and Moyler.
 */
function structuredName(name) {
  const parts = name.trim().split(/\s+/);
  const family = parts.length > 1 ? parts.pop() : '';
  return `${vcardText(family)};${vcardText(parts.join(' '))};;;`;
}

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
    // N is mandatory in vCard 3.0. Without it iOS Contacts and Outlook both
    // import the card with an empty name and sort it to the top of the list.
    `N:${structuredName(person.name)}`,
    `FN:${vcardText(person.name)}`,
    `TITLE:${vcardText(person.title)}`,
    person.org && `ORG:${vcardText(person.org)}`,
    person.email && `EMAIL;TYPE=INTERNET:${vcardText(person.email)}`,
    // URL is a uri value, not text, so it is carried exactly as written.
    person.website && `URL:${person.website}`,
    ...(person.socials || []).map((link) => `URL:${link.url}`),
    `NOTE:${vcardText(`${person.note} (via ${BRAND.appFull})`)}`,
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
  // Revoked on the next turn of the loop, not this one: Safari reads the blob
  // asynchronously after the click, and pulling the URL out from under it
  // cancels the download.
  setTimeout(() => URL.revokeObjectURL(url), 0);
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

/* ==========================================================================
   Keyboard
   ========================================================================== */

const ARROWS = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

/**
 * A radiogroup and a chip group are single-stop widgets: Tab moves past the
 * whole set, and the arrow keys move within it. Without this the payment
 * options, the format picker, and the shop filters are buttons that merely
 * look like radios and tabs.
 */
function moveWithinGroup(event) {
  const step = ARROWS[event.key];
  if (!step) return false;

  const el = event.target.closest('.pay-opt, .format-opt, .cat-chip');
  if (!el) return false;

  const group = el.closest('.pay-opts, .format-opts, .cat-chips');
  const items = $$('.pay-opt, .format-opt, .cat-chip', group);
  const next = items[(items.indexOf(el) + step + items.length) % items.length];

  event.preventDefault();
  next.focus();
  next.click();
  return true;
}

/** Keep Tab inside an open sheet, and let Escape dismiss it. */
document.addEventListener('keydown', (event) => {
  if (!openSheetEl) {
    moveWithinGroup(event);
    return;
  }

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
  if ((el = hit('[data-open-sheet]'))) {
    openSheet(el.dataset.openSheet);
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

  if (hit('[data-load-messages]')) {
    loadCompassionMessages();
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
    const shown = PRODUCTS.filter((p) => p.cats.includes(state.category)).length;
    announce(`${state.category}: ${shown} item${shown === 1 ? '' : 's'}`);
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
    payFields.clear();
    go('checkout-done');
    return;
  }

  /* --- plain navigation from a button --- */
  if ((el = hit('[data-go]'))) {
    event.preventDefault();
    go(el.dataset.go);
  }
});

document.addEventListener('input', (event) => {
  const form = event.target.closest('[data-compassion-form]');
  if (form) updateCompassionForm(form);
});

document.addEventListener('change', (event) => {
  const form = event.target.closest('[data-compassion-form]');
  if (form) updateCompassionForm(form);
});

document.addEventListener('submit', async (event) => {
  const form = event.target.closest('[data-compassion-form]');
  if (!form) return;
  event.preventDefault();
  updateCompassionForm(form);
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const submit = form.querySelector('[type="submit"]');
  submit.disabled = true;
  submit.textContent = 'Sharing…';

  const values = new FormData(form);
  try {
    const response = await fetch(COMPASSION_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      signal: timeoutSignal(12000),
      body: JSON.stringify({
        displayName: values.get('displayName'),
        community: values.get('community'),
        message: values.get('message'),
        consent: values.get('consent') === 'on',
        website: values.get('website'),
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Please try again in a moment.');

    form.reset();
    setCompassionFormStatus(
      form,
      'success',
      'Your message has been received and is now under review. We appreciate your kindness.',
    );
  } catch (error) {
    const message = error.name === 'AbortError'
      ? 'The message service took too long to respond. Please try again.'
      : error.message || 'Please try again in a moment.';
    setCompassionFormStatus(form, 'error', message);
  } finally {
    submit.textContent = 'Share compassion';
    updateCompassionForm(form);
  }
});

/* ==========================================================================
   Boot
   ========================================================================== */
loadState();
overlayRoot.innerHTML = overlays();
window.addEventListener('hashchange', renderRoute);
renderRoute();

if (!state.onboardingSeen) {
  markOnboardingSeen();
  requestAnimationFrame(() => openSheet('onboarding'));
}
