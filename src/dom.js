/**
 * Small DOM and templating helpers.
 */

const ESCAPES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * Escape a value for interpolation into an HTML template — including into a
 * quoted attribute. Data strings are authored as plain text, so this is the
 * single place that turns them into markup-safe output.
 */
export const esc = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (ch) => ESCAPES[ch]);

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

/** Join template parts, dropping falsy branches so `cond && html` reads cleanly. */
export const join = (parts) => parts.filter(Boolean).join('');
