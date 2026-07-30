/**
 * Inline SVG icons.
 *
 * Every icon is decorative — the surrounding control always carries its own
 * accessible name — so each one is marked aria-hidden.
 */

export const treeMark = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 48 48" fill="none" aria-hidden="true">
  <path d="M24 40V28" stroke="#C99B47" stroke-width="2.4" stroke-linecap="round"/>
  <path d="M24 33l-5-4M24 30l5-4" stroke="#C99B47" stroke-width="2.2" stroke-linecap="round"/>
  <circle cx="24" cy="17" r="11" fill="#C99B47"/>
  <circle cx="15" cy="21" r="6.5" fill="#C99B47"/>
  <circle cx="33" cy="21" r="6.5" fill="#C99B47"/>
  <text x="24" y="20.5" text-anchor="middle" font-family="Spectral, serif" font-weight="700" font-size="11" fill="#173024">FL</text>
</svg>`;

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
  <path d="M4.5 12.5l5 5L19.5 7" stroke="#C99B47" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export const bigCheck = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" aria-hidden="true">
  <path d="M4.5 12.5l5 5L19.5 7" stroke="#C99B47" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export const playTriangle = (size, fill) => `
<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" aria-hidden="true">
  <path d="M8.5 5.8v12.4c0 .8.9 1.3 1.6.9l10-6.2c.7-.4.7-1.4 0-1.8l-10-6.2c-.7-.4-1.6.1-1.6.9z"/>
</svg>`;

export const pauseBars = (size, fill) => `
<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" aria-hidden="true">
  <rect x="6.5" y="5" width="4" height="14" rx="1.4"/>
  <rect x="13.5" y="5" width="4" height="14" rx="1.4"/>
</svg>`;

export const starSolid = (size, fill) => `
<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" aria-hidden="true">
  <path d="M12 2.6l2.8 5.9 6.4.8-4.7 4.4 1.2 6.3L12 17l-5.7 3 1.2-6.3L2.8 9.3l6.4-.8z"/>
</svg>`;

export const starOutline = (size, stroke) => `
<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" aria-hidden="true">
  <path d="M12 3.6l2.5 5.2 5.7.7-4.2 3.9 1.1 5.6L12 16.2 6.9 19l1.1-5.6-4.2-3.9 5.7-.7z" stroke="${stroke}" stroke-width="1.9" stroke-linejoin="round"/>
</svg>`;

export const refreshIcon = (stroke) => `
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
  <path d="M20 12a8 8 0 1 1-2.3-5.6M20 3.5V8h-4.5" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
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

export const peopleIcon = (size, stroke, w) => `
<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" aria-hidden="true">
  <circle class="stroke" cx="9" cy="8.2" r="3.2" stroke="${stroke}" stroke-width="${w}"/>
  <path class="stroke" d="M3.4 19.5c.6-3 2.9-4.8 5.6-4.8s5 1.8 5.6 4.8" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round"/>
  <path class="stroke" d="M15.4 5.6a3.2 3.2 0 1 1 1.4 6.1M17.4 14.9c2.1.5 3.5 2.1 4 4.6" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round"/>
</svg>`;

export const cardIcon = (size, stroke, w) => `
<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" aria-hidden="true">
  <rect class="stroke" x="3" y="5.4" width="18" height="13.2" rx="2.4" stroke="${stroke}" stroke-width="${w}"/>
  <path class="stroke" d="M3.4 9.6h17.2" stroke="${stroke}" stroke-width="${w}"/>
  <path class="stroke" d="M6.6 14.8h4" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round"/>
</svg>`;
