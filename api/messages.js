'use strict';

const crypto = require('node:crypto');
const { env, supabaseUrl } = require('./_admin');
const { notifyNewMessage } = require('./_notify');

/**
 * The public Messages of Compassion wall, served from this origin.
 *
 * This is the Node twin of supabase/functions/compassion-messages. It exists
 * so the wall does not depend on an Edge Function being deployed to whichever
 * Supabase project the app points at: the deployment already holds
 * SUPABASE_SERVICE_ROLE_KEY for the admin dashboard, and that is all this
 * needs. The rules are the Edge Function's, unchanged:
 *
 *   GET   approved notes only, newest first, at most 50
 *   POST  validated, stripped of contact details, rate-limited by the
 *         `submit_compassion_message` RPC, and stored as pending — nothing a
 *         visitor sends is public until an editor approves it in /admin
 *
 * Until SUPABASE_SERVICE_ROLE_KEY is set this answers 503 with
 * `configured: false`, and the browser falls back to the Edge Function.
 */

const TIMEOUT = 8000;
const MAX_BODY = 4096;
const CONTACT = /(https?:\/\/|www\.|\b[^\s@]+@[^\s@]+\.[^\s@]+\b|\+?\d[\d\s().-]{7,}\d)/i;


function reply(res, status, payload) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).json(payload);
}

const normalized = (value, max) =>
  (typeof value === 'string' ? value : '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);

function callerAddress(req) {
  const forwarded = String(req.headers?.['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || String(req.headers?.['x-real-ip'] || '').trim() || 'unknown';
}

/** The same daily one-way fingerprint the Edge Function stores. */
function fingerprint(req, key, now = new Date()) {
  const salt = env('COMPASSION_FINGERPRINT_SALT') || key;
  const day = now.toISOString().slice(0, 10);
  return crypto.createHash('sha256').update(`${salt}:${callerAddress(req)}:${day}`).digest('hex');
}

/** Returns the cleaned submission, or `{ error }` with the visitor-facing reason. */
function validate(body) {
  const displayName = normalized(body?.displayName, 60);
  const community = normalized(body?.community, 80);
  const message = normalized(body?.message, 500);

  if (displayName.length < 2) return { error: 'Please enter your name.' };
  if (community && community.length < 2) return { error: 'Please enter a valid city or community.' };
  if (message.length < 15) return { error: 'Please write at least 15 characters.' };
  if (body?.consent !== true) return { error: 'Please confirm that your message may be reviewed and shared.' };
  if (CONTACT.test(`${displayName} ${community} ${message}`)) {
    return { error: 'Please leave out links, email addresses, and phone numbers.' };
  }
  return { displayName, community, message };
}

const service = (key, path, init = {}) => fetch(`${supabaseUrl()}/rest/v1/${path}`, {
  ...init,
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
    Accept: 'application/json',
    ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    ...(init.headers || {}),
  },
  signal: AbortSignal.timeout(TIMEOUT),
});

const isTimeout = (error) => error?.name === 'TimeoutError' || error?.name === 'AbortError';

function parsedBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return null; }
  }
  return null;
}

module.exports = async function compassionMessages(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return reply(res, 405, { error: 'Method not allowed.' });
  }

  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  if (!key) return reply(res, 503, { configured: false, error: 'Message service is unavailable.' });

  if (req.method === 'GET') {
    const query = new URLSearchParams({
      select: 'id,display_name,community,message,created_at',
      approved: 'eq.true',
      order: 'created_at.desc',
      limit: '50',
    });
    try {
      const result = await service(key, `compassion_messages?${query}`);
      if (!result.ok) {
        console.error('Message wall read returned', result.status);
        return reply(res, 502, { error: 'Messages could not be loaded.' });
      }
      /* Approved notes are public by design; a short shared cache keeps a
         popular moment from turning every visit into a database read. */
      const messages = await result.json();
      res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=30, stale-while-revalidate=120');
      return res.status(200).json({ messages: Array.isArray(messages) ? messages : [] });
    } catch (error) {
      return isTimeout(error)
        ? reply(res, 504, { error: 'Messages took too long to load.' })
        : reply(res, 502, { error: 'Messages could not be loaded.' });
    }
  }

  if (Number(req.headers?.['content-length'] || 0) > MAX_BODY) {
    return reply(res, 413, { error: 'That submission is too large.' });
  }
  const body = parsedBody(req);
  if (!body) return reply(res, 400, { error: 'Please complete the message form.' });

  /* Quietly accept bot-filled honeypots without writing anything. */
  if (normalized(body.website, 200)) return reply(res, 202, { ok: true, status: 'pending' });

  const clean = validate(body);
  if (clean.error) return reply(res, 400, { error: clean.error });

  let result;
  try {
    result = await service(key, 'rpc/submit_compassion_message', {
      method: 'POST',
      body: JSON.stringify({
        p_display_name: clean.displayName,
        p_community: clean.community || null,
        p_message: clean.message,
        p_request_fingerprint: fingerprint(req, key),
      }),
    });
  } catch (error) {
    return isTimeout(error)
      ? reply(res, 504, { error: 'Your message took too long to save. Please try again.' })
      : reply(res, 502, { error: 'Your message could not be saved. Please try again.' });
  }

  if (!result.ok) {
    console.error('Message wall submit returned', result.status);
    return reply(res, 502, { error: 'Your message could not be saved. Please try again.' });
  }
  const status = await result.json().catch(() => null);
  if (status === 'rate_limited') {
    return reply(res, 429, { error: 'You have shared several messages today. Please return tomorrow.' });
  }
  if (status !== 'pending') return reply(res, 502, { error: 'Your message could not be saved. Please try again.' });
  /* Awaited so the function is not frozen mid-send; it never throws. */
  await notifyNewMessage(clean, req);
  return reply(res, 202, { ok: true, status: 'pending' });
};

module.exports.validate = validate;
module.exports.fingerprint = fingerprint;
