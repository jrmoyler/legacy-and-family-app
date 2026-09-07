/**
 * Margaret — the in-app guide.
 *
 * Margaret answers questions about how to move around The Compassion Hub.
 * Three decisions are load-bearing:
 *
 * 1. SHE TALKS TO THIS ORIGIN ONLY. Every request goes to `MARGARET.apiUrl`
 *    (`/api/margaret`), which forwards to whichever provider is configured in
 *    the deployment's environment. No provider key reaches the browser, and
 *    `connect-src 'self'` in vercel.json stays as it is.
 *
 * 2. SHE WORKS BEFORE THAT ENDPOINT EXISTS. Until it is configured the
 *    endpoint answers 503, and Margaret falls back to keyword matching over
 *    MARGARET_TOPICS — the app's own navigation, written down. She is useful
 *    on day one and gets better when the API is wired, without a code change.
 *
 * 3. NOTHING SHE SAYS IS RENDERED AS MARKUP. Replies arrive from a remote
 *    service, so every message is written with textContent. The only rich
 *    element in a reply is a navigation chip, and those are built from the
 *    app's own screen ids, never from the response text.
 *
 * Like the player, the widget mounts once into `#overlays` so it survives the
 * route re-renders in app.js, and stays collapsed to one button until opened.
 */

import { esc } from './dom.js';
import {
  MARGARET, MARGARET_SUGGESTIONS, MARGARET_TOPICS, MARGARET_LINK_LABELS,
  MARGARET_BIO, MARGARET_BIO_HIGHLIGHT,
} from './data.js';
import { arrowLeft, closeIcon, sendIcon } from './icons.js';

const STORAGE_KEY = 'cup-of-compassion:margaret:v1';

/** Turns kept for context. Enough to follow a thread, small enough to post. */
const HISTORY_LIMIT = 12;
const REQUEST_TIMEOUT = 20000;

/* --------------------------------------------------------------------------
   Offline answering
   -------------------------------------------------------------------------- */

const normalise = (text) => ` ${String(text).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()} `;

/**
 * Score a question against Margaret's topics. Multi-word keywords count for
 * more than single words, so "what is this" beats a stray match on "this".
 */
function bestTopic(question) {
  const haystack = normalise(question);
  let best = null;
  let bestScore = 0;

  for (const topic of MARGARET_TOPICS) {
    let score = 0;
    for (const keyword of topic.keywords) {
      const needle = normalise(keyword).trim();
      if (!needle) continue;
      /* The haystack is padded at both ends, so one space-delimited test
         matches the first and last words too — and never a word fragment. */
      if (haystack.includes(` ${needle} `)) score += needle.includes(' ') ? 3 : 1;
    }
    if (!score) continue;
    score *= topic.weight || 1;
    if (score > bestScore) {
      bestScore = score;
      best = topic;
    }
  }
  return best;
}

/** Margaret's answer when she is on her own. Always returns something usable. */
export function localAnswer(question) {
  const topic = bestTopic(question);
  if (topic) return { text: topic.answer, links: topic.links || [] };
  return {
    text: 'I am not sure about that one. I can help you find the free reading, the books, the Legacy Inventory, the shop, or the message wall — try one of these.',
    links: ['read', 'series', 'legacy', 'shop', 'messages'],
  };
}

/* --------------------------------------------------------------------------
   Transcript persistence
   -------------------------------------------------------------------------- */

function loadHistory() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!Array.isArray(saved)) return [];
    return saved
      .filter((turn) => turn
        && (turn.role === 'user' || turn.role === 'assistant')
        && typeof turn.content === 'string')
      .slice(-HISTORY_LIMIT)
      .map((turn) => ({ role: turn.role, content: turn.content }));
  } catch {
    return [];
  }
}

function saveHistory(history) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-HISTORY_LIMIT)));
  } catch {
    /* storage unavailable — this session only */
  }
}

/* --------------------------------------------------------------------------
   Markup
   -------------------------------------------------------------------------- */

/** Escape a bio paragraph, rendering the one highlighted sentence in bold. */
function bioParagraphHtml(text) {
  const at = text.indexOf(MARGARET_BIO_HIGHLIGHT);
  if (at === -1) return esc(text);
  const before = text.slice(0, at);
  const after = text.slice(at + MARGARET_BIO_HIGHLIGHT.length);
  return `${esc(before)}<strong>${esc(MARGARET_BIO_HIGHLIGHT)}</strong>${esc(after)}`;
}

function margaretMarkup() {
  return `
  <button class="dock-btn margaret-fab" type="button" data-margaret-toggle
          aria-expanded="false" aria-controls="margaret-panel"
          aria-label="Ask ${esc(MARGARET.name)}">
    <img src="${esc(MARGARET.avatar)}" alt="" width="120" height="120" decoding="async">
    <span class="dock-label">Ask ${esc(MARGARET.name)}</span>
  </button>

  <section class="widget-panel margaret-panel" id="margaret-panel"
           aria-label="Ask ${esc(MARGARET.name)}" hidden>
    <header class="widget-head">
      <button class="margaret-avatar-btn" type="button" data-margaret-bio-toggle
              aria-expanded="false" aria-controls="margaret-bio"
              aria-label="About ${esc(MARGARET.name)}">
        <img class="margaret-avatar" src="${esc(MARGARET.avatar)}" alt=""
             width="120" height="120" decoding="async">
      </button>
      <span class="widget-titles">
        <strong>${esc(MARGARET.name)}</strong>
        <span>${esc(MARGARET.role)}</span>
      </span>
      <button class="widget-close" type="button" data-margaret-close
              aria-label="Close ${esc(MARGARET.name)}">
        ${closeIcon('currentColor')}
      </button>
    </header>

    <div class="margaret-bio" id="margaret-bio" data-margaret-bio hidden>
      <div class="margaret-bio-scroll">
        <button class="margaret-bio-back" type="button" data-margaret-bio-close>
          ${arrowLeft}<span>Back to chat</span>
        </button>
        <h3 class="margaret-bio-heading">${esc(MARGARET_BIO.heading)}</h3>
        ${MARGARET_BIO.paragraphs.map((paragraph) => `<p>${bioParagraphHtml(paragraph)}</p>`).join('')}
      </div>
    </div>

    <div class="margaret-log" data-margaret-log role="log" aria-live="polite" aria-atomic="false"></div>

    <div class="margaret-suggestions" data-margaret-suggestions>
      ${MARGARET_SUGGESTIONS.map((question) => `
      <button class="chip" type="button" data-margaret-ask="${esc(question)}">${esc(question)}</button>`).join('')}
    </div>

    <form class="margaret-composer" data-margaret-form>
      <label class="sr-only" for="margaret-input">Ask ${esc(MARGARET.name)} a question</label>
      <textarea id="margaret-input" name="question" rows="1" maxlength="500"
                placeholder="Ask about anything in the app…"
                autocomplete="off" data-margaret-input></textarea>
      <button class="margaret-send" type="submit" aria-label="Send">
        ${sendIcon(18, 'currentColor')}
      </button>
    </form>
  </section>`;
}

/* --------------------------------------------------------------------------
   Behaviour
   -------------------------------------------------------------------------- */

export function mountMargaret(dock, onOpen) {
  const root = document.createElement('div');
  root.className = 'margaret-widget';
  root.innerHTML = margaretMarkup();
  dock.append(root);

  const $ = (selector) => root.querySelector(selector);
  const fab = $('[data-margaret-toggle]');
  const panel = $('#margaret-panel');
  const bio = $('[data-margaret-bio]');
  const bioToggle = $('[data-margaret-bio-toggle]');
  const suggestions = $('[data-margaret-suggestions]');
  const log = $('[data-margaret-log]');
  const form = $('[data-margaret-form]');
  const input = $('[data-margaret-input]');
  const send = $('.margaret-send');

  /** The transcript posted to the API. Rendering is driven from it too. */
  let history = loadHistory();
  let pending = false;
  let greeted = false;

  /* --- rendering --- */

  function scrollToLatest() {
    log.scrollTop = log.scrollHeight;
  }

  /** Build one turn. Reply text is set with textContent, never parsed as HTML. */
  function addBubble(role, text, links = []) {
    const row = document.createElement('div');
    row.className = `margaret-turn ${role}`;

    const bubble = document.createElement('p');
    bubble.className = 'margaret-bubble';
    bubble.textContent = text;
    row.append(bubble);

    const targets = links.filter((screen) => MARGARET_LINK_LABELS[screen]);
    if (targets.length) {
      const nav = document.createElement('div');
      nav.className = 'margaret-links';
      for (const screen of targets) {
        const link = document.createElement('a');
        link.className = 'chip';
        link.href = screen === 'welcome' ? '#/' : `#/${screen}`;
        link.textContent = MARGARET_LINK_LABELS[screen];
        nav.append(link);
      }
      row.append(nav);
    }

    log.append(row);
    scrollToLatest();
    return row;
  }

  function addNote(text) {
    const note = document.createElement('p');
    note.className = 'margaret-note';
    note.textContent = text;
    log.append(note);
    scrollToLatest();
  }

  function setPending(on) {
    pending = on;
    send.disabled = on;
    input.disabled = on;
    root.classList.toggle('is-thinking', on);
  }

  function typingRow() {
    const row = document.createElement('div');
    row.className = 'margaret-turn assistant';
    row.innerHTML = `<p class="margaret-bubble typing" aria-label="${esc(MARGARET.name)} is typing">
      <i></i><i></i><i></i></p>`;
    log.append(row);
    scrollToLatest();
    return row;
  }

  /** Replay a saved conversation, or open a new one with the greeting. */
  function paintLog() {
    log.replaceChildren();
    addBubble('assistant', MARGARET.greeting);
    addNote(MARGARET.disclosure);
    for (const turn of history) addBubble(turn.role, turn.content);
    greeted = true;
  }

  /* --- asking --- */

  function timeoutSignal(milliseconds) {
    const controller = new AbortController();
    window.setTimeout(() => controller.abort(), milliseconds);
    return controller.signal;
  }

  /**
   * Ask the server. Resolves to the reply text, or null when the endpoint is
   * unconfigured, unreachable, or answers with something unusable — every one
   * of which is a fall-back-to-local case rather than an error to show.
   */
  async function askServer(question) {
    const response = await fetch(MARGARET.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      cache: 'no-store',
      signal: timeoutSignal(REQUEST_TIMEOUT),
      body: JSON.stringify({
        question,
        messages: [...history, { role: 'user', content: question }].slice(-HISTORY_LIMIT),
      }),
    });
    if (!response.ok) return null;
    const payload = await response.json().catch(() => null);
    const reply = payload?.reply;
    return typeof reply === 'string' && reply.trim() ? reply.trim() : null;
  }

  async function ask(question) {
    const text = question.trim();
    if (!text || pending) return;

    addBubble('user', text);
    history = [...history, { role: 'user', content: text }].slice(-HISTORY_LIMIT);
    input.value = '';
    resizeInput();
    setPending(true);
    const thinking = typingRow();

    let reply = null;
    try {
      reply = await askServer(text);
    } catch {
      reply = null;
    }

    thinking.remove();
    if (reply) {
      addBubble('assistant', reply);
      history = [...history, { role: 'assistant', content: reply }].slice(-HISTORY_LIMIT);
    } else {
      const fallback = localAnswer(text);
      addBubble('assistant', fallback.text, fallback.links);
      history = [...history, { role: 'assistant', content: fallback.text }].slice(-HISTORY_LIMIT);
    }
    saveHistory(history);
    setPending(false);
    input.focus({ preventScroll: true });
  }

  /* --- composer --- */

  function resizeInput() {
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 108)}px`;
  }

  /** Her picture, tapped inside the open chat, swaps the log for her story. */
  function setBioOpen(open) {
    bio.hidden = !open;
    log.hidden = open;
    suggestions.hidden = open;
    form.hidden = open;
    bioToggle.setAttribute('aria-expanded', String(open));
    if (open) {
      $('.margaret-bio-back').focus({ preventScroll: true });
    } else {
      input.focus({ preventScroll: true });
    }
  }

  function setOpen(open) {
    panel.hidden = !open;
    fab.setAttribute('aria-expanded', String(open));
    root.classList.toggle('is-open', open);
    if (!open) {
      setBioOpen(false);
      return;
    }
    onOpen?.();
    if (!greeted) paintLog();
    scrollToLatest();
    input.focus({ preventScroll: true });
  }

  /* --- events --- */

  fab.addEventListener('click', () => setOpen(panel.hidden));
  $('[data-margaret-close]').addEventListener('click', () => {
    setOpen(false);
    fab.focus({ preventScroll: true });
  });

  bioToggle.addEventListener('click', () => setBioOpen(bio.hidden));
  $('[data-margaret-bio-close]').addEventListener('click', () => setBioOpen(false));

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    ask(input.value);
  });

  input.addEventListener('input', resizeInput);
  input.addEventListener('keydown', (event) => {
    /* Enter sends; Shift+Enter is a new line. */
    if (event.key !== 'Enter' || event.shiftKey) return;
    event.preventDefault();
    ask(input.value);
  });

  panel.addEventListener('click', (event) => {
    const chip = event.target.closest('[data-margaret-ask]');
    if (chip) {
      ask(chip.dataset.margaretAsk);
      return;
    }
    /* A navigation chip has done its job — get out of the way of the screen. */
    if (event.target.closest('.margaret-links a')) setOpen(false);
  });

  panel.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (!bio.hidden) {
      setBioOpen(false);
      return;
    }
    setOpen(false);
    fab.focus({ preventScroll: true });
  });

  return { close: () => setOpen(false) };
}
