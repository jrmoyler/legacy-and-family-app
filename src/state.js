/**
 * Application state, persisted to localStorage.
 *
 * Reading progress, inventory progress, cart, and library survive a reload.
 * Anything ephemeral (which screen is open) is deliberately not saved.
 *
 * Note what is NOT here: no inventory *answers*. The Legacy Inventory records
 * only which sections you have worked through, never what you own, hold, or
 * are insured for (Bible §9, Handoff §6). Adding value fields to this file
 * would turn the app into a data-privacy obligation.
 */

import { PRODUCTS, CATEGORIES, INVENTORY } from './data.js';

const STORAGE_KEY = 'cup-of-compassion:v1';

const defaults = () => ({
  inventoryDone: [],
  lessonsRead: [],
  cart: [],
  library: [],
  category: 'Books',
});

export const state = {
  ...defaults(),
  /* ephemeral — never persisted */
  screen: 'welcome',
  activeBook: 'benefit',
  activeLesson: 'forty-seconds',
  activeProduct: 'first-three',
  compassionMessages: [],
  compassionMessagesStatus: 'idle',
  checkoutStatus: 'idle',
  checkoutSessionId: '',
  checkoutProducts: [],
  checkoutEmail: '',
  checkoutError: '',
};

const isValidProduct = (id) => PRODUCTS.some((p) => p.id === id && p.buyable && !p.free);
const isValidSection = (id) => INVENTORY.some((s) => s.id === id);
const strings = (value, keep) =>
  (Array.isArray(value) ? value.filter((v) => typeof v === 'string' && keep(v)) : []);

/** Read persisted state, ignoring anything malformed or stale. */
export function loadState() {
  let saved;
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  } catch {
    saved = null;
  }
  if (!saved || typeof saved !== 'object') return;

  state.inventoryDone = strings(saved.inventoryDone, isValidSection);
  state.lessonsRead = strings(saved.lessonsRead, () => true);
  state.cart = strings(saved.cart, isValidProduct);
  state.library = strings(saved.library, isValidProduct);
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
        inventoryDone: state.inventoryDone,
        lessonsRead: state.lessonsRead,
        cart: state.cart,
        library: state.library,
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

export function addToCart(id) {
  if (!isValidProduct(id) || state.cart.includes(id)) return false;
  state.cart.push(id);
  saveState();
  return true;
}

export function removeFromCart(id) {
  state.cart = state.cart.filter((v) => v !== id);
  saveState();
}

/** Unlock only product IDs returned by the server after Stripe confirms payment. */
export function unlockPurchasedProducts(ids) {
  const purchased = strings(ids, isValidProduct);
  state.library = [...new Set([...state.library, ...purchased])];
  state.cart = state.cart.filter((id) => !purchased.includes(id));
  saveState();
  return purchased;
}

export const sectionDone = (id) => state.inventoryDone.includes(id);

export function toggleSection(id) {
  const wasDone = sectionDone(id);
  state.inventoryDone = wasDone
    ? state.inventoryDone.filter((v) => v !== id)
    : [...state.inventoryDone, id];
  saveState();
  return !wasDone;
}

/** Inventory sections gathered — drives the home progress ring. */
export const inventoryProgress = () => state.inventoryDone.length;
