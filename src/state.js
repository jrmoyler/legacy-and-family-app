/**
 * Application state, persisted to localStorage.
 *
 * Reading progress, inventory progress, cart, library, and restore codes
 * survive a reload. Anything ephemeral (which screen is open) is deliberately
 * not saved.
 *
 * Reading progress is a read flag and a scroll fraction per lesson — numbers,
 * never text. A restore code holds only product ids and an expiry, signed by
 * the server; it is what authorizes paid downloads from /api/download.
 *
 * Note what is NOT here: no inventory *answers*. The Legacy Inventory records
 * only which sections you have worked through, never what you own, hold, or
 * are insured for (Bible §9, Handoff §6). Adding value fields to this file
 * would turn the app into a data-privacy obligation.
 */

import { PRODUCTS, CATEGORIES, INVENTORY, LESSONS } from './data.js';

const STORAGE_KEY = 'cup-of-compassion:v1';

const defaults = () => ({
  inventoryDone: [],
  /** { [lessonId]: { read: boolean, pos: 0–1 } }, most recently touched last. */
  lessonProgress: {},
  cart: [],
  library: [],
  restoreTokens: [],
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
  checkoutRestoreToken: '',
  restoreStatus: 'idle',
  restoreMessage: '',
};

const isValidProduct = (id) => PRODUCTS.some((p) => p.id === id && p.buyable && !p.free);
const isValidSection = (id) => INVENTORY.some((s) => s.id === id);
const isValidLesson = (id) => LESSONS.some((l) => l.id === id);
const RESTORE_TOKEN_SHAPE = /^ch1\.[A-Za-z0-9_-]{8,600}\.[A-Za-z0-9_-]{24}$/;
const clampPosition = (value) => (Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0);
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
  state.lessonProgress = readLessonProgress(saved);
  state.cart = strings(saved.cart, isValidProduct);
  state.library = strings(saved.library, isValidProduct);
  state.restoreTokens = strings(saved.restoreTokens, (t) => decodeRestoreToken(t) !== null);
  if (CATEGORIES.includes(saved.category)) state.category = saved.category;
}

/** Sanitize saved reading progress, carrying over the older `lessonsRead` list. */
function readLessonProgress(saved) {
  const progress = {};
  strings(saved.lessonsRead, isValidLesson).forEach((id) => {
    progress[id] = { read: true, pos: 0 };
  });
  const stored = saved.lessonProgress && typeof saved.lessonProgress === 'object' ? saved.lessonProgress : {};
  Object.entries(stored).forEach(([id, entry]) => {
    if (!isValidLesson(id) || !entry || typeof entry !== 'object') return;
    progress[id] = { read: entry.read === true, pos: clampPosition(entry.pos) };
  });
  return progress;
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
        lessonProgress: state.lessonProgress,
        cart: state.cart,
        library: state.library,
        restoreTokens: state.restoreTokens,
        category: state.category,
      }),
    );
  } catch {
    /* storage unavailable — run in memory for this session */
  }
}

export const hasReadLesson = (id) => state.lessonProgress[id]?.read === true;
export const lessonsReadCount = () => LESSONS.filter((l) => hasReadLesson(l.id)).length;
export const lessonPosition = (id) => state.lessonProgress[id]?.pos || 0;

export function toggleLesson(id) {
  if (!isValidLesson(id)) return false;
  const wasRead = hasReadLesson(id);
  state.lessonProgress = {
    ...state.lessonProgress,
    [id]: { read: !wasRead, pos: lessonPosition(id) },
  };
  saveState();
  return !wasRead;
}

/**
 * Remember how far down a lesson the reader got (0–1). The entry moves to the
 * end of the object so the most recent lesson is always last. Small scroll
 * jitter is ignored so this can run on a timer without rewriting storage.
 */
export function setLessonPosition(id, pos) {
  if (!isValidLesson(id)) return false;
  const next = Math.round(clampPosition(pos) * 1000) / 1000;
  if (Math.abs(next - lessonPosition(id)) < 0.01) return false;
  const { [id]: previous, ...rest } = state.lessonProgress;
  state.lessonProgress = { ...rest, [id]: { read: previous?.read === true, pos: next } };
  saveState();
  return true;
}

/** The lesson to offer as "Continue": most recently started, not yet finished. */
export function continueLessonId() {
  const started = Object.entries(state.lessonProgress)
    .filter(([, entry]) => !entry.read && entry.pos > 0.05);
  return started.length ? started.at(-1)[0] : null;
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

/**
 * Read a restore code's payload in the browser. This is a lookup hint only —
 * the signature is checked by the server on every restore and download.
 */
export function decodeRestoreToken(token, now = Date.now()) {
  if (typeof token !== 'string' || !RESTORE_TOKEN_SHAPE.test(token)) return null;
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const body = JSON.parse(atob(base64));
    const ids = Array.isArray(body.p) ? body.p.filter((id) => typeof id === 'string') : [];
    if (!ids.length || !Number.isInteger(body.e) || body.e * 1000 <= now) return null;
    return { productIds: ids, expiresAt: body.e };
  } catch {
    return null;
  }
}

/** Keep a restore code the server issued or accepted. */
export function addRestoreToken(token) {
  if (!decodeRestoreToken(token) || state.restoreTokens.includes(token)) return false;
  state.restoreTokens = [...state.restoreTokens.filter((t) => decodeRestoreToken(t)), token];
  saveState();
  return true;
}

/** A current restore code that covers this product, or ''. */
export function restoreTokenFor(productId) {
  return [...state.restoreTokens].reverse()
    .find((token) => decodeRestoreToken(token)?.productIds.includes(productId)) || '';
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
