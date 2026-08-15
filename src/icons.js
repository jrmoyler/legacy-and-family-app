/**
 * Inline SVG icons.
 *
 * Every icon is decorative — the surrounding control always carries its own
 * accessible name — so each one is marked aria-hidden.
 */

/**
 * The series mark: a cup with a heart rising from it, in purple / gold / teal
 * (Design & Information Bible §6). Colours are parameterised because the mark
 * sits on cream, on gold, and on deep plum, and needs to hold up on all three.
 */
export const cupMark = (size, { cup = '#4A2A63', heart = '#B08D2E', saucer = '#2E7D82' } = {}) => `
<svg width="${size}" height="${size}" viewBox="0 0 48 48" fill="none" aria-hidden="true">
  <path d="M24 18.6c-4.9-3.4-7.4-5.9-7.4-8.8a3.9 3.9 0 0 1 7.4-1.6 3.9 3.9 0 0 1 7.4 1.6c0 2.9-2.5 5.4-7.4 8.8z" fill="${heart}"/>
  <path d="M11.6 23.2h21.6l-1.7 11.2a5.2 5.2 0 0 1-5.1 4.4h-8a5.2 5.2 0 0 1-5.1-4.4z" fill="${cup}"/>
  <path d="M34 26.4h1.8a4.1 4.1 0 0 1 0 8.2h-1.1" stroke="${cup}" stroke-width="2.6" stroke-linecap="round"/>
  <path d="M8.4 42.4h28.2" stroke="${saucer}" stroke-width="2.8" stroke-linecap="round"/>
</svg>`;

/** The mark as it appears on deep plum — lighter cup so it does not vanish. */
export const cupMarkOnDark = (size) =>
  cupMark(size, { cup: '#F3ECDC', heart: '#D0AC4C', saucer: '#7FC3C7' });

export const chevron = (color) => `
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
  <path d="M9 5.5 15.5 12 9 18.5" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export const arrowLeft = `
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
  <path d="M14.5 5.5 8 12l6.5 6.5" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export const goldCheck = `
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
  <path d="M4.5 12.5l5 5L19.5 7" stroke="#B08D2E" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export const bigCheck = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" aria-hidden="true">
  <path d="M4.5 12.5l5 5L19.5 7" stroke="#B08D2E" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export const starSolid = (size, fill) => `
<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" aria-hidden="true">
  <path d="M12 2.6l2.8 5.9 6.4.8-4.7 4.4 1.2 6.3L12 17l-5.7 3 1.2-6.3L2.8 9.3l6.4-.8z"/>
</svg>`;

export const starOutline = (size, stroke) => `
<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" aria-hidden="true">
  <path d="M12 3.6l2.5 5.2 5.7.7-4.2 3.9 1.1 5.6L12 16.2 6.9 19l1.1-5.6-4.2-3.9 5.7-.7z" stroke="${stroke}" stroke-width="1.9" stroke-linejoin="round"/>
</svg>`;

export const printIcon = (stroke) => `
<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
  <path d="M7 9V3.8h10V9" stroke="${stroke}" stroke-width="1.9" stroke-linejoin="round"/>
  <rect x="3.4" y="9" width="17.2" height="7.8" rx="2" stroke="${stroke}" stroke-width="1.9"/>
  <path d="M7 14.4h10v5.8H7z" stroke="${stroke}" stroke-width="1.9" stroke-linejoin="round"/>
</svg>`;

export const shieldIcon = (stroke) => `
<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
  <path d="M12 3.2 4.8 6v6c0 4.3 2.9 7.6 7.2 9 4.3-1.4 7.2-4.7 7.2-9V6z" stroke="${stroke}" stroke-width="1.8" stroke-linejoin="round"/>
  <path d="M9 12.2l2.2 2.2 4-4.4" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export const lockIcon = (stroke) => `
<svg width="12" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
  <rect x="5" y="10" width="14" height="10" rx="2.4" stroke="${stroke}" stroke-width="1.9"/>
  <path d="M8.5 10V7.6a3.5 3.5 0 0 1 7 0V10" stroke="${stroke}" stroke-width="1.9"/>
</svg>`;

/* --- navigation icons: all accept (size, stroke, width) --- */

export const homeIcon = (size, stroke, w) => `
<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" aria-hidden="true">
  <path class="stroke" d="M4 10.4 12 3.8l8 6.6V19a1.4 1.4 0 0 1-1.4 1.4H5.4A1.4 1.4 0 0 1 4 19z" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export const booksIcon = (size, stroke, w) => `
<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" aria-hidden="true">
  <path class="stroke" d="M4.2 5.2h5.2a2.6 2.6 0 0 1 2.6 2.6v11.4a2.2 2.2 0 0 0-2.2-2.2H4.2z" stroke="${stroke}" stroke-width="${w}" stroke-linejoin="round"/>
  <path class="stroke" d="M19.8 5.2h-5.2A2.6 2.6 0 0 0 12 7.8v11.4a2.2 2.2 0 0 1 2.2-2.2h5.6z" stroke="${stroke}" stroke-width="${w}" stroke-linejoin="round"/>
</svg>`;

export const bookIcon = (size, stroke, w) => `
<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" aria-hidden="true">
  <path class="stroke" d="M6 3.5h12a1 1 0 0 1 1 1v15.2a.8.8 0 0 1-1.2.7L12 17l-5.8 3.4a.8.8 0 0 1-1.2-.7V4.5a1 1 0 0 1 1-1z" stroke="${stroke}" stroke-width="${w}" stroke-linejoin="round"/>
</svg>`;

export const cartIcon = (size, stroke, w) => `
<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" aria-hidden="true">
  <path class="stroke" d="M3.5 4h2l2.2 11.2a1.6 1.6 0 0 0 1.6 1.3h8.2a1.6 1.6 0 0 0 1.6-1.2L21 8H6.1" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>
  <circle class="stroke" cx="10" cy="20.4" r="1.3" stroke="${stroke}" stroke-width="${w}"/>
  <circle class="stroke" cx="17.4" cy="20.4" r="1.3" stroke="${stroke}" stroke-width="${w}"/>
</svg>`;

/** Legacy Inventory: a clipboard, for the worksheet tab. */
export const clipboardIcon = (size, stroke, w) => `
<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" aria-hidden="true">
  <path class="stroke" d="M9.2 4.4H6.6A1.6 1.6 0 0 0 5 6v13.4a1.6 1.6 0 0 0 1.6 1.6h10.8a1.6 1.6 0 0 0 1.6-1.6V6a1.6 1.6 0 0 0-1.6-1.6h-2.6" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>
  <rect class="stroke" x="9.2" y="2.6" width="5.6" height="3.6" rx="1.2" stroke="${stroke}" stroke-width="${w}"/>
  <path class="stroke" d="M8.6 11.4h6.8M8.6 15.4h4.4" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round"/>
</svg>`;

/** Tools: the sidebar group and phone tab holding My Library and Network. */
export const toolsIcon = (size, stroke, w) => `
<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" aria-hidden="true">
  <path class="stroke" d="M14.6 3.6a4.4 4.4 0 0 1 5.8 5.8l-9.2 9.2-3.4 1.2 1.2-3.4z" stroke="${stroke}" stroke-width="${w}" stroke-linejoin="round"/>
  <path class="stroke" d="M4 4.4l3.2 3.2M4 10.8h6.2" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round"/>
</svg>`;

/** My Library: books standing on a shelf. */
export const shelfIcon = (size, stroke, w) => `
<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" aria-hidden="true">
  <path class="stroke" d="M5 4.4h3.4v13.2H5zM11.4 4.4h3.4v13.2h-3.4z" stroke="${stroke}" stroke-width="${w}" stroke-linejoin="round"/>
  <path class="stroke" d="M17.6 5.4l2.8.8-3 12.2-2.2-.6" stroke="${stroke}" stroke-width="${w}" stroke-linejoin="round"/>
  <path class="stroke" d="M3.4 20.4h17.2" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round"/>
</svg>`;

/** A link leaving the app, for network profiles and social platforms. */
export const externalIcon = (size, stroke) => `
<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" aria-hidden="true">
  <path d="M13.6 4.4H19.6V10.4" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M19.6 4.4 11 13" stroke="${stroke}" stroke-width="2" stroke-linecap="round"/>
  <path d="M17.4 14.2v4.2a1.8 1.8 0 0 1-1.8 1.8H5.6a1.8 1.8 0 0 1-1.8-1.8V8.4a1.8 1.8 0 0 1 1.8-1.8h4.2" stroke="${stroke}" stroke-width="2" stroke-linecap="round"/>
</svg>`;

/** An envelope, for the network's email links. */
export const mailIcon = (size, stroke) => `
<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" aria-hidden="true">
  <rect x="3.2" y="5.4" width="17.6" height="13.2" rx="2.2" stroke="${stroke}" stroke-width="2"/>
  <path d="m4.4 7.4 7.6 5.4 7.6-5.4" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

/** Download arrow, for the contact-card export and library rows. */
export const downloadIcon = (size, stroke) => `
<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" aria-hidden="true">
  <path d="M12 3.6v11.2m0 0 4-4m-4 4-4-4" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M4.4 17.6v1.4a1.4 1.4 0 0 0 1.4 1.4h12.4a1.4 1.4 0 0 0 1.4-1.4v-1.4" stroke="${stroke}" stroke-width="2" stroke-linecap="round"/>
</svg>`;

/** A bookmark, for saving an item to My Library without buying it. */
export const bookmarkIcon = (size, stroke, fill = 'none') => `
<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" aria-hidden="true">
  <path d="M6.4 4.4h11.2v15.8L12 16.4l-5.6 3.8z" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"/>
</svg>`;

export const peopleIcon = (size, stroke, w) => `
<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" aria-hidden="true">
  <circle class="stroke" cx="9" cy="8.2" r="3.2" stroke="${stroke}" stroke-width="${w}"/>
  <path class="stroke" d="M3.4 19.5c.6-3 2.9-4.8 5.6-4.8s5 1.8 5.6 4.8" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round"/>
  <path class="stroke" d="M15.4 5.6a3.2 3.2 0 1 1 1.4 6.1M17.4 14.9c2.1.5 3.5 2.1 4 4.6" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round"/>
</svg>`;
