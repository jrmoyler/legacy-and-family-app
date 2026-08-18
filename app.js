/**
 * The Compassion Hub — application entry point.
 *
 * Responsibilities: hash routing, rendering, and event delegation.
 * Screen markup lives in src/screens.js; state lives in src/state.js.
 */

import { $, $$ } from './src/dom.js';
import { screens, compassionMessageList } from './src/screens.js';
import { sidebar, appbar, tabbar, overlays, hrefFor } from './src/components.js';
import {
  BRAND, CATEGORIES, COMPASSION_API_URL, bookById, lessonById, productById,
} from './src/data.js';
import {
  state, loadState, saveState, toggleSection, toggleLesson,
  toggleCart, removeFromCart, addToLibrary,
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

  if (state.screen === 'messages' && state.compassionMessagesStatus === 'idle') {
    loadCompassionMessages();
  }
}

/** In-place update after a state change: keep scroll position and focus. */
function refresh() {
  const scrollY = window.scrollY;
  const focusKey = document.activeElement?.getAttribute?.('data-focus-key');

  paint();

  window.scrollTo(0, scrollY);
  if (focusKey) {
    const restored = view.querySelector(`[data-focus-key="${CSS.escape(focusKey)}"]`);
    if (restored) restored.focus({ preventScroll: true });
  }
}

const TITLES = {
  welcome: `${BRAND.name} — ${BRAND.tagline}`,
  home: 'Your reading',
  series: 'The Series',
  read: 'Read',
  legacy: 'The Legacy Inventory',
  shop: 'Shop',
  cart: 'Your cart',
  checkout: 'Checkout',
  'checkout-done': 'Thank you',
  about: BRAND.author,
  disclaimer: 'Disclaimers',
  status: 'Production status',
  messages: 'Messages of Compassion',
};

async function loadCompassionMessages() {
  state.compassionMessagesStatus = 'loading';
  if (state.screen === 'messages') {
    const list = view.querySelector('[data-compassion-list]');
    if (list) list.innerHTML = compassionMessageList();
  }

  try {
    const response = await fetch(COMPASSION_API_URL, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) throw new Error('message service unavailable');
    const payload = await response.json();
    state.compassionMessages = Array.isArray(payload.messages) ? payload.messages : [];
    state.compassionMessagesStatus = 'ready';
  } catch {
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
  return `${name || BRAND.name} — ${BRAND.name}`;
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

  /* --- shop --- */
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
    $('#lib-copy').textContent = `${product.title} is now saved to your library.`;
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
    setCompassionFormStatus(form, 'error', error.message || 'Please try again in a moment.');
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
