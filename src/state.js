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

import {
  PRODUCTS, CATEGORIES, INVENTORY, LESSONS, FORMAT_IDS, DEFAULT_FORMAT, entitledProductIds,
} from './data.js';

const STORAGE_KEY = 'cup-of-compassion:v1';

const defaults = () => ({
  inventoryDone: [],
  lessonsRead: [],
  cart: [],
  library: [],
  saved: [],
  formats: {},
  category: 'Books',
  onboardingSeen: false,
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
  toolsOpen: false,
  checkoutStatus: 'idle',
  checkoutSessionId: '',
  checkoutProducts: [],
  checkoutEmail: '',
  checkoutError: '',
};

const isValidProduct = (id) => PRODUCTS.some((p) => p.id === id && p.buyable && !p.free);
/** Anything buyable can be saved for later, including the free downloads. */
const isSavableProduct = (id) => PRODUCTS.some((p) => p.id === id && p.buyable);
const isValidSection = (id) => INVENTORY.some((s) => s.id === id);
const isValidLesson = (id) => LESSONS.some((l) => l.id === id);
const strings = (value, keep) =>
  (Array.isArray(value) ? value.filter((v) => typeof v === 'string' && keep(v)) : []);

/**
 * Format choices, dropping any entry whose product or format no longer exists.
 *
 * Gated on savable rather than purchasable: the free workbooks carry a PDF and
 * an EPUB and show the same picker, so screening them out here meant a reader
 * who chose EPUB for the Legacy Inventory found it back on PDF + EPUB after a
 * reload.
 */
function formatMap(value) {
  if (!value || typeof value !== 'object') return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      ([id, format]) => isSavableProduct(id) && FORMAT_IDS.includes(format),
    ),
  );
}

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
  /* Lessons are renamed and renumbered as the books are rebuilt, so stale ids
     are dropped here rather than left to inflate the "N of 6 read" count. */
  state.lessonsRead = strings(saved.lessonsRead, isValidLesson);
  state.cart = strings(saved.cart, isValidProduct);
  state.library = strings(saved.library, isValidProduct);
  state.saved = strings(saved.saved, isSavableProduct);
  state.formats = formatMap(saved.formats);
  if (CATEGORIES.includes(saved.category)) state.category = saved.category;
  state.onboardingSeen = saved.onboardingSeen === true;
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
        saved: state.saved,
        formats: state.formats,
        category: state.category,
        onboardingSeen: state.onboardingSeen,
      }),
    );
  } catch {
    /* storage unavailable — run in memory for this session */
  }
}

/** True the first time only — the onboarding sheet shows once, ever. */
export function markOnboardingSeen() {
  if (state.onboardingSeen) return;
  state.onboardingSeen = true;
  saveState();
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
export const isSaved = (id) => state.saved.includes(id);

/**
 * Whether the reader is entitled to a product, by having bought it outright or
 * by having bought a set that contains it.
 *
 * `state.library` is the receipt: it records what was actually paid for, which
 * for a set is the set. Every "can they open this?" question goes through here
 * instead, so My Library keeps listing the one item that was bought while the
 * six books inside it stop asking to be bought again.
 */
export const owns = (id) => state.library.some((bought) => entitledProductIds(bought).includes(id));

/** Which file format a title is bought and downloaded in. */
export const formatFor = (id) => state.formats[id] || DEFAULT_FORMAT;

export function setFormat(id, format) {
  if (!FORMAT_IDS.includes(format)) return DEFAULT_FORMAT;
  state.formats[id] = format;
  saveState();
  return format;
}

export function toggleSaved(id) {
  const wasSaved = isSaved(id);
  state.saved = wasSaved ? state.saved.filter((v) => v !== id) : [...state.saved, id];
  saveState();
  return !wasSaved;
}

/**
 * Only a product the server will price can go in the cart. A free or
 * unreleased ID reaching Checkout does not fail on its own line — the server
 * rejects the whole cart, so one stray ID reads to the customer as a broken
 * checkout for everything they were buying.
 */
export function addToCart(id) {
  if (!isValidProduct(id) || inCart(id)) return false;
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
