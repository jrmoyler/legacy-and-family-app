/**
 * Cover art.
 *
 * The series has no photography and no illustrated covers, so every book and
 * product used to render the same purple tile with the same cup mark — six
 * different books, one indistinguishable thumbnail. These are typographic
 * covers instead: a colour field, one geometric motif, and the title set in
 * the series serif, so a reader can tell two books apart at 64px.
 *
 * Palette is Design Bible §6 throughout — plum, gold, teal, cream. Nothing
 * here invents a colour; the variety comes from which of them leads.
 */

import { esc } from './dom.js';
import { cupMark } from './icons.js';

/**
 * A theme is a field (the two gradient stops), the ink that sits on it, and
 * the accent used for rules and the mark. `light` themes carry dark ink and
 * need the opposite treatment for hairlines, so they are flagged.
 */
const THEMES = {
  plum: { from: '#4A2A63', to: '#2A1739', ink: '#F5EFE3', accent: '#D0AC4C', soft: '#C4B4D2' },
  night: { from: '#2B1840', to: '#150C1E', ink: '#F5EFE3', accent: '#D0AC4C', soft: '#B9A7C9' },
  teal: { from: '#2E7D82', to: '#173F46', ink: '#F3F0E4', accent: '#E8CE84', soft: '#CFE3E2' },
  mauve: { from: '#6B4589', to: '#3A2150', ink: '#F5EFE3', accent: '#E4C46F', soft: '#D2C2DE' },
  /* The two light fields are pitched so the darkest gradient stop still clears
     4.5:1 against the title, the kicker, and the imprint line. Deepening the
     gold field the obvious way — towards #8A6C18 — drops the imprint to
     2.2:1, which is where the first draft of this had it. */
  gold: { from: '#E0C173', to: '#C09A34', ink: '#2A2113', accent: '#3A2150', soft: '#3A2E10', light: true },
  cream: { from: '#F3EAD6', to: '#E2D5B8', ink: '#3A2150', accent: '#6B5410', soft: '#5A4E38', light: true },
};

/** Motifs are drawn in CSS from these class names — see app.css §"Cover art". */
const MOTIFS = ['arc', 'rules', 'split', 'halo', 'ladder'];

/**
 * Fixed assignments, so a title keeps the same cover everywhere it appears
 * and between visits. Anything not listed falls through to a stable hash.
 */
const ASSIGNED = {
  /* the six books */
  benefit: ['plum', 'arc'],
  nurtured: ['teal', 'split'],
  legacy: ['gold', 'rules'],
  confusion: ['night', 'ladder'],
  companionship: ['mauve', 'halo'],
  commitment: ['plum', 'rules'],

  /* catalogue items with no book behind them */
  'inventory-worksheet': ['cream', 'rules'],
  'compassion-card': ['gold', 'halo'],
  'first-three': ['mauve', 'arc'],
  workbook: ['cream', 'ladder'],
  'church-license': ['teal', 'halo'],
  'six-set': ['night', 'arc'],
  'six-plus-workbook': ['plum', 'split'],
  'conversation-kit': ['teal', 'rules'],
  devotional: ['mauve', 'ladder'],
  caregiving: ['cream', 'split'],
  'leaders-kit': ['night', 'halo'],
  youth: ['gold', 'split'],
  'training-deck': ['plum', 'ladder'],
};

const THEME_NAMES = Object.keys(THEMES);

/** Stable per-id fallback: same id, same cover, every render. */
function hash(id) {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) % 9973;
  return h;
}

function look(id) {
  const assigned = ASSIGNED[id];
  if (assigned) return { theme: THEMES[assigned[0]], name: assigned[0], motif: assigned[1] };

  const h = hash(String(id));
  const name = THEME_NAMES[h % THEME_NAMES.length];
  return { theme: THEMES[name], name, motif: MOTIFS[h % MOTIFS.length] };
}

/** The custom properties every cover size and motif reads from. */
const vars = (t) =>
  `--cv-from:${t.from};--cv-to:${t.to};--cv-ink:${t.ink};--cv-accent:${t.accent};--cv-soft:${t.soft}`;

/**
 * A full typographic cover: kicker, title, and the imprint line.
 *
 * @param {object} item        book or product — needs `id` and `title`
 * @param {object} [opts]
 * @param {string} [opts.kicker]  small line above the title
 * @param {string} [opts.foot]    small line at the base
 * @param {string} [opts.size]    'md' (grid) or 'lg' (detail page)
 */
export function cover(item, { kicker = 'A Cup of Compassion', foot = '', size = 'md' } = {}) {
  const { theme, name, motif } = look(item.id);
  const mark = theme.light
    ? cupMark(size === 'lg' ? 30 : 22, { cup: theme.accent, heart: theme.ink, saucer: theme.accent })
    : cupMark(size === 'lg' ? 30 : 22, { cup: theme.ink, heart: theme.accent, saucer: theme.soft });

  return `
  <span class="cover cover-${size} cv-${name} mo-${motif}" style="${vars(theme)}" aria-hidden="true">
    <span class="cv-motif"></span>
    <span class="cv-frame"></span>
    <span class="cv-text">
      <span class="cv-kicker">${esc(kicker)}</span>
      <span class="cv-title">${esc(item.title)}</span>
      <span class="cv-rule"></span>
      <span class="cv-foot">${esc(foot || 'Pamella Foster-Grear')}</span>
    </span>
    <span class="cv-mark">${mark}</span>
  </span>`;
}

/**
 * The same cover at thumbnail scale, where type would be unreadable: the
 * colour field, the motif, and the mark do the identifying instead.
 */
export function coverMini(item, size = 'sm') {
  const { theme, name, motif } = look(item.id);
  const mark = theme.light
    ? cupMark(size === 'xs' ? 20 : 24, { cup: theme.accent, heart: theme.ink, saucer: theme.accent })
    : cupMark(size === 'xs' ? 20 : 24, { cup: theme.ink, heart: theme.accent, saucer: theme.soft });

  return `
  <span class="cover cover-${size} cv-${name} mo-${motif}" style="${vars(theme)}" aria-hidden="true">
    <span class="cv-motif"></span>
    <span class="cv-frame"></span>
    <span class="cv-mark">${mark}</span>
  </span>`;
}
