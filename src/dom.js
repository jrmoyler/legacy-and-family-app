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

/**
 * Escape a value, then mark where a long unbroken string may wrap — after an
 * `@`, a dot, a slash, a hyphen, or an underscore.
 *
 * An address like `www.manninsurancegroup.com` is one word to a line-breaker,
 * so in a narrow column it either overflows or splits mid-syllable
 * ("manninsurancegro / up.com"). A `<wbr>` at each natural seam gives the
 * browser a place to break that a reader recognises. Escaping runs first, and
 * none of the entities it produces contain a seam character, so the inserted
 * markup can never land inside one.
 */
export const escBreakable = (value) =>
  esc(value)
    .replace(/[._/-]/g, '$&<wbr>')
    // An "@" is only a seam with something in front of it. Breaking after the
    // leading @ of a handle strands the symbol alone at the end of the line.
    .replace(/(\w)@/g, '$1@<wbr>');

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

/** Join template parts, dropping falsy branches so `cond && html` reads cleanly. */
export const join = (parts) => parts.filter(Boolean).join('');
