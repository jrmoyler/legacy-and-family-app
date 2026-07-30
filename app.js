/**
 * Family Legacy — application entry point.
 *
 * Responsibilities: hash routing, rendering, and event delegation.
 * Screen markup lives in src/screens.js; state lives in src/state.js.
 */

import { $, $$ } from './src/dom.js';
import { screens } from './src/screens.js';
import { sidebar, appbar, tabbar, overlays, hrefFor, hrefForProduct } from './src/components.js';
import { PLANS, CATEGORIES, productById } from './src/data.js';
import {
  state, loadState, saveState, toggleStep, toggleLesson,
  toggleCart, removeFromCart, addToLibrary,
} from './src/state.js';
import { playTriangle, pauseBars } from './src/icons.js';

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

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, '');
  if (!raw) return { screen: 'welcome' };

  const [head, ...rest] = raw.split('/');
  if (head === 'product') {
    const id = decodeURIComponent(rest.join('/') || '');
    return productById(id) ? { screen: 'product', product: id } : { screen: 'shop' };
  }
  return isScreen(head) ? { screen: head } : { screen: 'welcome' };
}

/** Navigate by screen id. The hashchange listener does the rendering. */
function go(screen) {
  const next = hrefFor(screen);
  if (location.hash === next) renderRoute();
  else location.hash = next;
}

function goToProduct(id) {
  const next = hrefForProduct(id);
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
  if (route.product) state.activeProduct = route.product;

  // The video only plays while its screen is open.
  if (state.screen !== 'video') {
    state.playing = false;
    state.playingChapter = null;
  }

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
    const restored = view.querySelector(`[data-focus-key="${CSS.escape(focusKey)}"]`);
    if (restored) restored.focus({ preventScroll: true });
  }
}

const TITLES = {
  welcome: 'Family Legacy — Plant. Protect. Pass on.',
  home: 'Your plan',
  'guide-will': 'How to start your Will',
  'guide-trust': 'How to start your Trust',
  video: 'Protecting Our Legacy',
  learn: 'Learn',
  network: 'Our Network',
  plans: 'Choose your plan',
  checkout: 'Checkout',
  'checkout-done': 'You’re protected',
  shop: 'Marketplace',
  cart: 'Your cart',
};

function titleFor(screen) {
  if (screen === 'product') {
    const product = productById(state.activeProduct);
    return `${product ? product.title : 'Product'} — Family Legacy`;
  }
  if (screen === 'welcome') return TITLES.welcome;
  return `${TITLES[screen] || 'Family Legacy'} — Family Legacy`;
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
   Video playback
   ========================================================================== */

/**
 * Toggle playback without re-rendering the screen — a full re-render would
 * restart the progress bar animation every time the user pauses.
 */
function setPlaying(playing, chapterIndex = null) {
  state.playing = playing;
  if (!playing) state.playingChapter = null;
  else if (chapterIndex !== null) state.playingChapter = chapterIndex;

  const player = $('#player');
  const button = $('#playBtn');
  if (!player || !button) return;

  player.classList.toggle('playing', state.playing);
  button.innerHTML = state.playing ? pauseBars(24, '#1F3D2E') : playTriangle(30, '#1F3D2E');
  button.setAttribute('aria-pressed', String(state.playing));
  button.setAttribute('aria-label', `${state.playing ? 'Pause' : 'Play'} the presentation`);

  $$('.chapter', view).forEach((el, i) => {
    el.classList.toggle('playing', state.playing && state.playingChapter === i);
  });
}

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
  if ((el = hit('[data-open-sheet]'))) {
    openSheet(el.dataset.openSheet);
    return;
  }

  /* --- fire-and-forget feedback --- */
  if ((el = hit('[data-toast]'))) {
    toast(el.dataset.toast);
    return;
  }

  /* --- guides --- */
  if ((el = hit('[data-step]'))) {
    const [kind, index] = el.dataset.step.split(':');
    toggleStep(kind, Number(index));
    refresh();
    return;
  }

  /* --- learn --- */
  if ((el = hit('[data-lesson]'))) {
    if (toggleLesson(el.dataset.lesson)) toast('Marked as read');
    refresh();
    return;
  }

  /* --- video --- */
  if ((el = hit('[data-chapter]'))) {
    setPlaying(true, Number(el.dataset.chapter));
    return;
  }
  if (hit('#playBtn')) {
    setPlaying(!state.playing);
    return;
  }

  /* --- checkout --- */
  if ((el = hit('[data-pay]'))) {
    state.payMethod = el.dataset.pay;
    saveState();
    refresh();
    return;
  }
  if ((el = hit('[data-checkout]'))) {
    const plan = el.dataset.checkout;
    if (!PLANS[plan]) return;
    state.checkoutPlan = plan;
    state.payMethod = 'card';
    saveState();
    go('checkout');
    return;
  }

  /* --- marketplace --- */
  if ((el = hit('[data-cat]'))) {
    if (!CATEGORIES.includes(el.dataset.cat)) return;
    state.category = el.dataset.cat;
    saveState();
    refresh();
    return;
  }
  if ((el = hit('[data-cart-toggle]'))) {
    const id = el.dataset.cartToggle;
    toast(toggleCart(id) ? 'Added to cart' : 'Removed from cart');
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
    $('#lib-copy').textContent = bought.length === 1
      ? `${bought[0].title} is now saved to your library.`
      : `${bought.length} items are now saved to your library.`;
    refresh();
    openSheet('library');
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
