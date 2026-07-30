/**
 * Application state, persisted to localStorage.
 *
 * Progress, cart, and library survive a reload. Anything ephemeral (which
 * screen is open, whether the video is playing) is deliberately not saved.
 */

import { PRODUCTS, CATEGORIES, PLANS } from './data.js';

const STORAGE_KEY = 'family-legacy:v1';

const defaults = () => ({
  willSteps: [false, false, false, false, false],
  trustSteps: [false, false, false, false, false],
  lessonsRead: [],
  cart: ['wills-guide', 'gen-wealth'],
  library: [],
  payMethod: 'card',
  checkoutPlan: 'trust249',
  category: 'Best sellers',
});

export const state = {
  ...defaults(),
  /* ephemeral — never persisted */
  screen: 'welcome',
  activeProduct: 'wills-guide',
  playing: false,
  playingChapter: null,
};

const isValidProduct = (id) => PRODUCTS.some((p) => p.id === id);
const asBoolArray = (value, len) =>
  Array.from({ length: len }, (_, i) => Boolean(Array.isArray(value) && value[i]));

/** Read persisted state, ignoring anything malformed or stale. */
export function loadState() {
  let saved;
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  } catch {
    saved = null;
  }
  if (!saved || typeof saved !== 'object') return;

  state.willSteps = asBoolArray(saved.willSteps, 5);
  state.trustSteps = asBoolArray(saved.trustSteps, 5);
  state.lessonsRead = Array.isArray(saved.lessonsRead) ? saved.lessonsRead.filter((v) => typeof v === 'string') : [];
  state.cart = Array.isArray(saved.cart) ? saved.cart.filter(isValidProduct) : state.cart;
  state.library = Array.isArray(saved.library) ? saved.library.filter(isValidProduct) : [];
  if (['card', 'monthly', 'church'].includes(saved.payMethod)) state.payMethod = saved.payMethod;
  if (PLANS[saved.checkoutPlan]) state.checkoutPlan = saved.checkoutPlan;
  if (CATEGORIES.includes(saved.category)) state.category = saved.category;
}

/**
 * Persist the durable slice of state. Storage can throw (private mode, quota,
 * disabled cookies) — a failure here must never break the app.
 */
export function saveState() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        willSteps: state.willSteps,
        trustSteps: state.trustSteps,
        lessonsRead: state.lessonsRead,
        cart: state.cart,
        library: state.library,
        payMethod: state.payMethod,
        checkoutPlan: state.checkoutPlan,
        category: state.category,
      }),
    );
  } catch {
    /* storage unavailable — run in memory for this session */
  }
}

export const hasReadLesson = (id) => state.lessonsRead.includes(id);

export function toggleLesson(id) {
  const wasRead = hasReadLesson(id);
  state.lessonsRead = wasRead
    ? state.lessonsRead.filter((v) => v !== id)
    : [...state.lessonsRead, id];
  saveState();
  return !wasRead;
}

export const inCart = (id) => state.cart.includes(id);
export const inLibrary = (id) => state.library.includes(id);

export function toggleCart(id) {
  const wasInCart = inCart(id);
  state.cart = wasInCart ? state.cart.filter((v) => v !== id) : [...state.cart, id];
  saveState();
  return !wasInCart;
}

export function removeFromCart(id) {
  state.cart = state.cart.filter((v) => v !== id);
  saveState();
}

export function addToLibrary(ids) {
  for (const id of ids) {
    if (!state.library.includes(id)) state.library.push(id);
  }
  state.cart = state.cart.filter((id) => !ids.includes(id));
  saveState();
}

export function toggleStep(guide, index) {
  const steps = guide === 'will' ? state.willSteps : state.trustSteps;
  steps[index] = !steps[index];
  saveState();
}

/** Completed "first steps" — the will guide drives the home progress ring. */
export const firstStepsDone = () => state.willSteps.filter(Boolean).length;
