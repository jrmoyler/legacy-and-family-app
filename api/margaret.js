'use strict';

/**
 * Margaret's server side.
 *
 * The browser never talks to a model provider — it posts here, and this
 * function forwards to whichever provider the deployment configures. That
 * keeps the provider key out of the client bundle and lets the app keep its
 * strict `connect-src 'self'` Content-Security-Policy.
 *
 * Configure with two environment variables:
 *
 *   MARGARET_API_URL   an OpenAI-compatible chat-completions endpoint
 *   MARGARET_API_KEY   the bearer token for it
 *
 * Optional:
 *   MARGARET_MODEL         model id (default: the provider's own default)
 *   MARGARET_SYSTEM_PROMPT overrides the persona below
 *
 * Until MARGARET_API_URL and MARGARET_API_KEY are set this answers 503, and
 * the widget falls back to the offline guide in src/margaret.js. That is the
 * expected state, not a fault: the app ships useful either way.
 */

const REQUEST_TIMEOUT = 20000;
const MAX_QUESTION = 500;
const MAX_TURNS = 12;
const MAX_REPLY = 4000;

/**
 * Throttling.
 *
 * Every request that gets past this point spends money on the configured
 * provider, and the endpoint is public by design — the app has no accounts to
 * authenticate against. So the browser's own `pending` guard is not a control:
 * anything can POST here directly.
 *
 * This is a fixed window held in the warm instance's memory. Being per
 * instance it is a floor rather than a guarantee — a burst spread across cold
 * starts gets more through, and a rotating source address gets its own budget,
 * which is why there is a whole-instance ceiling as well as a per-caller one.
 * It costs nothing and no datastore, and it turns "drain the account with a
 * loop" into something that has to be deliberate and distributed. A hard quota
 * belongs at the provider (a spend cap) or in front of the function (Vercel
 * Firewall, or the Supabase counter the message wall already uses).
 */
const RATE_WINDOW_MS = 60000;
const RATE_PER_CALLER = 12;
const RATE_PER_INSTANCE = 240;
const INSTANCE_KEY = '@instance';

const windows = new Map();

/** Trusted only as a bucket label — a spoofed value just shares a bucket. */
function callerKey(req) {
  const forwarded = String(req.headers?.['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || String(req.headers?.['x-real-ip'] || '').trim() || 'unknown';
}

function takeSlot(key, limit, now) {
  const open = windows.get(key);
  if (!open || now >= open.resetAt) {
    windows.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return 0;
  }
  if (open.count >= limit) return Math.max(1, Math.ceil((open.resetAt - now) / 1000));
  open.count += 1;
  return 0;
}

/** Returns 0 when the request may proceed, else the Retry-After in seconds. */
function throttle(req, now = Date.now()) {
  /* Expired buckets are only swept when the map has actually grown, so the
     common case stays a couple of map lookups. */
  if (windows.size > 5000) {
    for (const [key, open] of windows) if (now >= open.resetAt) windows.delete(key);
  }
  const caller = takeSlot(callerKey(req), RATE_PER_CALLER, now);
  if (caller) return caller;
  return takeSlot(INSTANCE_KEY, RATE_PER_INSTANCE, now);
}

/**
 * The persona. It is deliberately narrow: Margaret explains this app, and the
 * unauthorized-practice-of-law boundary the rest of the product enforces
 * applies to her too.
 */
const SYSTEM_PROMPT = [
  'You are Margaret, the friendly in-app guide for The Compassion Hub — the companion app to Pamella Grear\'s "A Cup of Compassion" book series, published by Pam Grear Publishing LLC.',
  '',
  'Your job is to help visitors navigate the app and understand what it offers. The app has: Home; The Series (the six books in publication order); Read (six complete lessons, free, no account needed); The Legacy Inventory (a printable worksheet that deliberately has nothing to type into, because the app never stores anyone\'s account, policy, or property details); Shop (books, collections, and companions, paid through Stripe); Messages of Compassion (a moderated public message wall); About Pamella; and Disclaimers. There is also The Compassion Player, a music widget carrying original songs from the series.',
  '',
  'Rules you must not break:',
  '- Never offer to prepare, draft, review, or fill in legal documents. The product\'s fixed position is: "We do not prepare legal documents. We help families arrive prepared."',
  '- Never give legal, financial, tax, or medical advice. Point people to a licensed professional in their state, and to the Disclaimers page.',
  '- Never ask for or accept account numbers, policy numbers, passwords, card details, or other sensitive personal information. If someone offers them, tell them not to.',
  '- Never invent books, prices, features, or pages. If you do not know, say so and suggest where in the app to look.',
  '',
  'Answer in plain, warm, unhurried language. Two or three short sentences is usually right. Name the page someone should open.',
].join('\n');

function reply(res, status, payload) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).json(payload);
}

/** Accept only what we will send on: role-tagged strings, newest turns last. */
function conversation(body) {
  const raw = Array.isArray(body?.messages) ? body.messages : [];
  const turns = raw
    .filter((turn) => turn
      && (turn.role === 'user' || turn.role === 'assistant')
      && typeof turn.content === 'string'
      && turn.content.trim())
    .slice(-MAX_TURNS)
    .map((turn) => ({ role: turn.role, content: turn.content.trim().slice(0, MAX_QUESTION) }));

  /* A question outside the transcript is still a question — append it. */
  const question = typeof body?.question === 'string' ? body.question.trim() : '';
  const last = turns[turns.length - 1];
  if (question && (!last || last.role !== 'user' || last.content !== question.slice(0, MAX_QUESTION))) {
    turns.push({ role: 'user', content: question.slice(0, MAX_QUESTION) });
  }
  return turns.filter((turn) => turn.content).slice(-MAX_TURNS);
}

/** Pull the assistant text out of an OpenAI-compatible response shape. */
function replyText(payload) {
  const choice = payload?.choices?.[0]?.message?.content;
  if (typeof choice === 'string' && choice.trim()) return choice.trim().slice(0, MAX_REPLY);
  /* Anthropic-style `content` blocks, for a provider that answers that way. */
  const blocks = Array.isArray(payload?.content) ? payload.content : null;
  if (blocks) {
    const text = blocks.filter((b) => b?.type === 'text').map((b) => b.text).join('\n').trim();
    if (text) return text.slice(0, MAX_REPLY);
  }
  return '';
}

module.exports = async function askMargaret(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return reply(res, 405, { error: 'Method not allowed.' });
  }

  const messages = conversation(req.body);
  if (!messages.length) return reply(res, 400, { error: 'Ask Margaret a question.' });

  const endpoint = process.env.MARGARET_API_URL?.trim();
  const key = process.env.MARGARET_API_KEY?.trim();
  if (!endpoint || !key) {
    /* The widget reads this as "answer locally", so it must not read as a bug. */
    return reply(res, 503, { configured: false, error: 'Margaret is not connected to her helper yet.' });
  }

  /* Only now is there anything worth protecting: an unconfigured deployment
     has already answered 503 without spending anything. A throttled caller
     falls back to the offline guide, the same as any other refusal. */
  const retryAfter = throttle(req);
  if (retryAfter) {
    res.setHeader('Retry-After', String(retryAfter));
    return reply(res, 429, { error: 'Margaret is answering a lot of questions right now.' });
  }

  try {
    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${key}`,
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
      body: JSON.stringify({
        model: process.env.MARGARET_MODEL || undefined,
        max_tokens: 400,
        temperature: 0.4,
        messages: [
          { role: 'system', content: process.env.MARGARET_SYSTEM_PROMPT || SYSTEM_PROMPT },
          ...messages,
        ],
      }),
    });

    if (!upstream.ok) {
      console.error('Margaret upstream returned', upstream.status);
      return reply(res, 502, { error: 'Margaret could not answer just now.' });
    }

    const text = replyText(await upstream.json().catch(() => null));
    if (!text) return reply(res, 502, { error: 'Margaret could not answer just now.' });
    return reply(res, 200, { reply: text });
  } catch (error) {
    console.error('Margaret request failed', error?.name || 'unknown');
    return reply(res, 502, { error: 'Margaret could not answer just now.' });
  }
};

module.exports.SYSTEM_PROMPT = SYSTEM_PROMPT;
module.exports.throttle = throttle;
module.exports.RATE_PER_CALLER = RATE_PER_CALLER;
module.exports.RATE_PER_INSTANCE = RATE_PER_INSTANCE;
module.exports.conversation = conversation;
module.exports.replyText = replyText;
