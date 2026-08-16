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

import { PRODUCTS, CATEGORIES, INVENTORY, LESSONS, FORMAT_IDS, DEFAULT_FORMAT } from './data.js';

const STORAGE_KEY = 'cup-of-compassion:v1';

const defaults = () => ({
  inventoryDone: [],
  lessonsRead: [],
  cart: [],
  library: [],
  saved: [],
  formats: {},
  payMethod: 'card',
  category: 'Books',
});

export const state = {
  ...defaults(),
  /* ephemeral — never persisted */
  screen: 'welcome',
  activeBook: 'benefit',
  activeLesson: 'forty-seconds',
  activeProduct: 'first-three',
  toolsOpen: false,
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
  if (['card', 'invoice'].includes(saved.payMethod)) state.payMethod = saved.payMethod;
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
        saved: state.saved,
        formats: state.formats,
        payMethod: state.payMethod,
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
export const isSaved = (id) => state.saved.includes(id);

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
  // Owning something supersedes having saved it, so it lists once, not twice.
  state.saved = state.saved.filter((id) => !ids.includes(id));
  saveState();
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
