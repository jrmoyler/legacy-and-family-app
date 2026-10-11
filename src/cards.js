/**
 * Pass-it-on cards.
 *
 * Draws a finished image on a <canvas> in the browser — the Daily Cup, a note
 * from the public wall, or the 40-Second Compassion Card — and hands it to the
 * phone's share sheet, or downloads it where there is none. Nothing is
 * uploaded and no third party is involved: the logo is same-origin, the fonts
 * are the page's own, and the image is built from text already on screen. That
 * keeps the app's strict CSP untouched.
 */

import { BRAND, BOOKS, LESSONS, lessonById } from './data.js';

const PURPLE = '#4A2A63';
const PURPLE_DEEP = '#2A1638';
const GOLD = '#B08D2E';
const GOLD_SOFT = '#D0AC4C';
const CREAM = '#F6F1E7';
const INK = '#22201F';
const TEAL_LIGHT = '#7FC3C7';

const SERIF = "Spectral, Georgia, 'Times New Roman', serif";
const SANS = "'DM Sans', system-ui, -apple-system, 'Segoe UI', sans-serif";
const SITE = 'thecompassionhub.org';

/* ==========================================================================
   The Daily Cup — one verse and one small practice, the same for everybody
   on a given calendar day, so a card shared this morning matches what a
   friend sees when they open the app.
   ========================================================================== */

const VERSES = (() => {
  const seen = new Set();
  return [
    ...BOOKS.map((book) => book.anchor),
    ...LESSONS.map((lesson) => lesson.verse),
  ].filter((verse) => verse?.text && verse?.ref && !seen.has(verse.ref) && seen.add(verse.ref));
})();

const PRACTICES = LESSONS.flatMap((lesson) =>
  (lesson.practice || []).map((text) => ({ text, lesson: lesson.id })));

/** Days since the epoch in the visitor's own time zone. */
const localDay = (date) =>
  Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())) / 86400000);

export function dailyCup(date = new Date()) {
  const day = localDay(date);
  const verse = VERSES[day % VERSES.length];
  /* A different stride, so the same verse is not always paired with the same
     practice as the two lists wrap. */
  const practice = PRACTICES[(day * 7 + 3) % PRACTICES.length];
  return {
    verse,
    practice: practice?.text || '',
    lesson: practice ? lessonById(practice.lesson) : null,
    dateLabel: new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(date),
  };
}

/* ==========================================================================
   Drawing helpers
   ========================================================================== */

let logoPromise = null;
function logo() {
  logoPromise ||= new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = BRAND.logo;
  });
  return logoPromise;
}

async function fontsReady() {
  if (!document.fonts?.load) return;
  await Promise.allSettled([
    document.fonts.load(`500 64px Spectral`),
    document.fonts.load(`italic 500 64px Spectral`),
    document.fonts.load(`600 64px Spectral`),
    document.fonts.load(`600 32px "DM Sans"`),
  ]);
}

function wrap(ctx, text, width) {
  const lines = [];
  for (const paragraph of String(text).split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width > width && line) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    lines.push(line);
  }
  return lines;
}

/**
 * Sets the largest font size (from `max` down to `min`) at which `text` fits
 * the box, and returns the wrapped lines and their line height.
 */
function fit(ctx, text, { font, max, min, width, height, leading = 1.32 }) {
  for (let size = max; size >= min; size -= 2) {
    ctx.font = font(size);
    const lines = wrap(ctx, text, width);
    if (lines.length * size * leading <= height) return { lines, lineHeight: size * leading, size };
  }
  ctx.font = font(min);
  const lineHeight = min * leading;
  return { lines: wrap(ctx, text, width).slice(0, Math.floor(height / lineHeight)), lineHeight, size: min };
}

function lines(ctx, block, x, y) {
  block.lines.forEach((line, i) => ctx.fillText(line, x, y + i * block.lineHeight));
  return y + block.lines.length * block.lineHeight;
}

function spaced(ctx, text, x, y, spacing) {
  /* Canvas letterSpacing is not everywhere yet; draw it by hand. */
  const chars = [...text];
  const total = chars.reduce((sum, c) => sum + ctx.measureText(c).width, 0) + spacing * (chars.length - 1);
  let cursor = ctx.textAlign === 'center' ? x - total / 2 : x;
  const align = ctx.textAlign;
  ctx.textAlign = 'left';
  for (const c of chars) {
    ctx.fillText(c, cursor, y);
    cursor += ctx.measureText(c).width + spacing;
  }
  ctx.textAlign = align;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

async function drawLogo(ctx, cx, y, width) {
  const img = await logo();
  if (!img) return y;
  const height = width * (img.naturalHeight / img.naturalWidth || 0.6);
  const pad = width * 0.06;
  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowBlur = 24;
  roundRect(ctx, cx - width / 2 - pad, y - pad, width + pad * 2, height + pad * 2, 22);
  ctx.fill();
  ctx.restore();
  ctx.drawImage(img, cx - width / 2, y, width, height);
  return y + height + pad;
}

function darkBackground(ctx, w, h) {
  const g = ctx.createLinearGradient(0, 0, w * 0.4, h);
  g.addColorStop(0, '#5A3577');
  g.addColorStop(0.55, PURPLE);
  g.addColorStop(1, PURPLE_DEEP);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  const glow = ctx.createRadialGradient(w * 0.85, h * 0.1, 0, w * 0.85, h * 0.1, w * 0.7);
  glow.addColorStop(0, 'rgba(208,172,76,0.28)');
  glow.addColorStop(1, 'rgba(208,172,76,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(208,172,76,0.55)';
  ctx.lineWidth = 3;
  roundRect(ctx, 40, 40, w - 80, h - 80, 28);
  ctx.stroke();
}

function footer(ctx, w, h, color, accent) {
  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = `600 22px ${SANS}`;
  spaced(ctx, 'BUILD IT. DOCUMENT IT. PASS IT ON.', w / 2, h - 118, 4);
  ctx.fillStyle = color;
  ctx.font = `500 30px ${SERIF}`;
  ctx.fillText(SITE, w / 2, h - 76);
}

/* ==========================================================================
   The three cards
   ========================================================================== */

async function quoteCard({ kicker, quote, attribution, detail, practice }) {
  const w = 1080;
  const h = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  await fontsReady();

  darkBackground(ctx, w, h);
  let y = await drawLogo(ctx, w / 2, 110, 300);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = GOLD_SOFT;
  ctx.font = `600 24px ${SANS}`;
  spaced(ctx, kicker.toUpperCase(), w / 2, y + 70, 5);

  /* The quote, its attribution, and the detail line are centred together in
     whatever room the logo above and the practice box below leave. */
  const boxTop = h - 400;
  const top = y + 110;
  const bottom = practice ? boxTop - 40 : h - 200;
  const tail = detail ? 110 : 70;
  ctx.fillStyle = CREAM;
  const block = fit(ctx, `“${quote}”`, {
    font: (size) => `italic 500 ${size}px ${SERIF}`, max: 64, min: 30, width: w - 220, height: bottom - top - tail,
  });
  const used = block.lines.length * block.lineHeight + tail;
  const start = top + Math.max(0, (bottom - top - used) / 2);
  y = lines(ctx, block, w / 2, start + block.size) - block.lineHeight + block.size;

  ctx.fillStyle = GOLD_SOFT;
  ctx.font = `600 26px ${SANS}`;
  spaced(ctx, attribution.toUpperCase(), w / 2, y + 58, 4);
  if (detail) {
    ctx.fillStyle = TEAL_LIGHT;
    ctx.font = `500 26px ${SANS}`;
    ctx.fillText(detail, w / 2, y + 100);
  }

  if (practice) {
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    roundRect(ctx, 110, boxTop, w - 220, 190, 22);
    ctx.fill();
    ctx.fillStyle = GOLD_SOFT;
    ctx.font = `600 22px ${SANS}`;
    spaced(ctx, 'TODAY, POUR ONE CUP', w / 2, boxTop + 50, 4);
    ctx.fillStyle = CREAM;
    const step = fit(ctx, practice, {
      font: (size) => `500 ${size}px ${SERIF}`, max: 34, min: 24, width: w - 300, height: 110, leading: 1.3,
    });
    lines(ctx, step, w / 2, boxTop + 70 + step.size);
  }

  footer(ctx, w, h, CREAM, GOLD_SOFT);
  return canvas;
}

async function fortySecondCard() {
  const lesson = lessonById('forty-seconds');
  /* US Letter at 150 dpi: prints cleanly as a bulletin insert. */
  const w = 1275;
  const h = 1650;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  await fontsReady();

  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = PURPLE;
  ctx.fillRect(0, 0, w, 360);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 4;
  roundRect(ctx, 36, 36, w - 72, h - 72, 26);
  ctx.stroke();

  await drawLogo(ctx, 230, 92, 260);

  ctx.textAlign = 'left';
  ctx.fillStyle = GOLD_SOFT;
  ctx.font = `600 24px ${SANS}`;
  spaced(ctx, 'A CUP OF COMPASSION · FREE CARD', 440, 140, 4);
  ctx.fillStyle = CREAM;
  ctx.font = `600 70px ${SERIF}`;
  ctx.fillText('The 40-Second', 440, 222);
  ctx.fillText('Compassion Card', 440, 298);

  let y = 450;
  ctx.fillStyle = INK;
  const intro = fit(ctx, 'About forty seconds of undivided, unhurried attention measurably changes how a person experiences what they are carrying. Compassion is not scarce. What is scarce is the decision to be fully present with one person for the length of a short song.', {
    font: (size) => `500 ${size}px ${SERIF}`, max: 33, min: 26, width: w - 220, height: 230, leading: 1.4,
  });
  y = lines(ctx, intro, 110, y) + 24;

  ctx.fillStyle = GOLD;
  ctx.font = `600 26px ${SANS}`;
  spaced(ctx, 'THE FOUR THINGS TO DO WITH THEM', 110, y, 4);
  y += 50;

  lesson.practice.forEach((step, i) => {
    ctx.fillStyle = PURPLE;
    ctx.beginPath();
    ctx.arc(150, y + 34, 38, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = GOLD_SOFT;
    ctx.textAlign = 'center';
    ctx.font = `600 40px ${SERIF}`;
    ctx.fillText(String(i + 1), 150, y + 48);
    ctx.textAlign = 'left';
    ctx.fillStyle = INK;
    const text = fit(ctx, step, {
      font: (size) => `500 ${size}px ${SERIF}`, max: 36, min: 28, width: w - 340, height: 120, leading: 1.32,
    });
    lines(ctx, text, 220, y + 10 + text.size);
    y += Math.max(100, text.lines.length * text.lineHeight + 30);
  });

  y += 20;
  ctx.fillStyle = '#EDE5D4';
  roundRect(ctx, 110, y, w - 220, 200, 18);
  ctx.fill();
  ctx.fillStyle = GOLD;
  ctx.fillRect(110, y, 8, 200);
  ctx.textAlign = 'center';
  ctx.fillStyle = PURPLE;
  const verse = fit(ctx, `“${lesson.verse.text}”`, {
    font: (size) => `italic 500 ${size}px ${SERIF}`, max: 32, min: 24, width: w - 320, height: 120,
  });
  lines(ctx, verse, w / 2, y + 30 + verse.size);
  ctx.fillStyle = '#7A6114';
  ctx.font = `600 22px ${SANS}`;
  spaced(ctx, lesson.verse.ref.toUpperCase(), w / 2, y + 176, 4);

  ctx.fillStyle = '#5B5450';
  ctx.font = `500 21px ${SANS}`;
  ctx.fillText('Research gathered in Compassionomics, by Stephen Trzeciak and Anthony Mazzarelli.', w / 2, h - 196);
  ctx.fillText(`From ${lesson.from}, by ${BRAND.author}.`, w / 2, h - 166);
  footer(ctx, w, h, PURPLE, GOLD);
  return canvas;
}

/* ==========================================================================
   Delivery
   ========================================================================== */

const toBlob = (canvas) => new Promise((resolve, reject) =>
  canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('The card could not be drawn.'))), 'image/png'));

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** A share sheet only where one is natural: touch devices that accept files. */
const canShareFiles = (file) =>
  typeof navigator.canShare === 'function'
  && matchMedia('(pointer: coarse)').matches
  && navigator.canShare({ files: [file] });

/**
 * Builds the card and passes it on. Resolves to 'shared', 'saved', or
 * 'cancelled'; rejects only when the card could not be drawn at all.
 */
export async function passItOn(kind, payload = {}) {
  let canvas;
  let filename;
  let text;
  if (kind === 'forty') {
    canvas = await fortySecondCard();
    filename = '40-Second-Compassion-Card.png';
    text = 'The 40-Second Compassion Card — free from The Compassion Hub.';
  } else if (kind === 'daily') {
    const cup = dailyCup();
    canvas = await quoteCard({
      kicker: `The Daily Cup · ${cup.dateLabel}`,
      quote: cup.verse.text,
      attribution: cup.verse.ref,
      practice: cup.practice,
    });
    filename = `Daily-Cup-${new Date().toISOString().slice(0, 10)}.png`;
    text = `Today’s cup of compassion: ${cup.verse.ref}.`;
  } else {
    canvas = await quoteCard({
      kicker: 'A message of compassion',
      quote: String(payload.message || ''),
      attribution: String(payload.name || 'A friend'),
      detail: payload.community ? String(payload.community) : '',
    });
    filename = 'A-Message-of-Compassion.png';
    text = 'A little kindness for you, from the Messages of Compassion wall.';
  }

  const blob = await toBlob(canvas);
  const file = new File([blob], filename, { type: 'image/png' });
  if (canShareFiles(file)) {
    try {
      await navigator.share({ files: [file], title: 'The Compassion Hub', text: `${text} https://${SITE}` });
      return 'shared';
    } catch (error) {
      if (error?.name === 'AbortError') return 'cancelled';
      /* Lost the user gesture, or the platform refused: fall through. */
    }
  }
  download(blob, filename);
  return 'saved';
}
