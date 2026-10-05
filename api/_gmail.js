'use strict';

/**
 * Gmail REST helpers for the admin dashboard. Plain `fetch`, no SDK: the
 * dashboard needs a dozen calls, not the whole Google client library.
 */

const API = 'https://gmail.googleapis.com/gmail/v1/users/me';
const TIMEOUT = 10000;
const MAX_BODY = 200000;
const MAX_RECIPIENTS = 20;

const MESSAGE_ID = /^[A-Za-z0-9_-]{6,64}$/;
const isMessageId = (id) => typeof id === 'string' && MESSAGE_ID.test(id);

async function gmail(token, path, init = {}) {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', ...(init.headers || {}) },
    signal: AbortSignal.timeout(TIMEOUT),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(payload?.error?.message || `Gmail returned ${response.status}.`);
    error.status = response.status === 401 ? 401 : 502;
    throw error;
  }
  return payload;
}

const header = (message, name) => {
  const wanted = name.toLowerCase();
  const found = (message?.payload?.headers || []).find((h) => String(h.name).toLowerCase() === wanted);
  return found ? String(found.value) : '';
};

function summary(message) {
  const labels = Array.isArray(message?.labelIds) ? message.labelIds : [];
  return {
    id: message.id,
    threadId: message.threadId,
    from: header(message, 'From'),
    to: header(message, 'To'),
    subject: header(message, 'Subject'),
    date: header(message, 'Date'),
    snippet: decodeEntities(message.snippet || ''),
    unread: labels.includes('UNREAD'),
    starred: labels.includes('STARRED'),
    inInbox: labels.includes('INBOX'),
    trashed: labels.includes('TRASH'),
    labels,
  };
}

function decodeEntities(text) {
  return String(text)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/gi, '&');
}

/** Good-enough HTML → text for reading mail. The browser only ever gets text. */
function htmlToText(html) {
  return decodeEntities(String(html)
    .replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|h[1-6]|blockquote)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, ''))
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const decodePart = (data) => Buffer.from(String(data || ''), 'base64url').toString('utf8');

/** The readable body of a `format=full` message: text/plain first, then HTML. */
function bodyText(payload) {
  const plain = [];
  const html = [];
  const walk = (part) => {
    if (!part) return;
    const type = String(part.mimeType || '').toLowerCase();
    if (part.body?.data && !part.filename) {
      if (type === 'text/plain') plain.push(decodePart(part.body.data));
      else if (type === 'text/html') html.push(decodePart(part.body.data));
    }
    (part.parts || []).forEach(walk);
  };
  walk(payload);
  const text = plain.length ? plain.join('\n\n').trim() : htmlToText(html.join('\n'));
  return text.slice(0, MAX_BODY);
}

function attachments(payload) {
  const found = [];
  const walk = (part) => {
    if (!part) return;
    if (part.filename) found.push({ name: part.filename, type: part.mimeType, size: part.body?.size || 0 });
    (part.parts || []).forEach(walk);
  };
  walk(payload);
  return found;
}

/* --------------------------------------------------------------------------
   Composing
   -------------------------------------------------------------------------- */

/** A header value can never carry a line break — that is header injection. */
const headerSafe = (value, max = 998) => String(value || '').replace(/[\r\n\u0000]+/g, ' ').trim().slice(0, max);

const encodeWord = (value) =>
  /^[\x20-\x7e]*$/.test(value) ? value : `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`;

function recipients(value) {
  const list = headerSafe(value, 4000).split(/[,;]/).map((s) => s.trim()).filter(Boolean);
  if (list.length > MAX_RECIPIENTS) throw Object.assign(new Error(`Up to ${MAX_RECIPIENTS} recipients at a time.`), { status: 400 });
  for (const address of list) {
    const bare = (address.match(/<([^>]+)>\s*$/) || [null, address])[1].trim();
    if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(bare)) {
      throw Object.assign(new Error(`"${address}" is not an email address.`), { status: 400 });
    }
  }
  return list.join(', ');
}

/** RFC 5322 message, base64url-encoded the way Gmail's send endpoint wants it. */
function buildRaw({ to, cc, subject, body, inReplyTo, references }) {
  const toList = recipients(to);
  if (!toList) throw Object.assign(new Error('Add at least one recipient.'), { status: 400 });
  const ccList = cc ? recipients(cc) : '';
  const text = String(body || '').replace(/\r?\n/g, '\r\n');
  if (!text.trim()) throw Object.assign(new Error('Write a message before sending.'), { status: 400 });

  const lines = [
    `To: ${toList}`,
    ccList ? `Cc: ${ccList}` : '',
    `Subject: ${encodeWord(headerSafe(subject, 300))}`,
    inReplyTo ? `In-Reply-To: ${headerSafe(inReplyTo)}` : '',
    references ? `References: ${headerSafe(references)}` : '',
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
  ].filter(Boolean);
  const encoded = Buffer.from(text, 'utf8').toString('base64').replace(/.{76}/g, '$&\r\n');
  return Buffer.from(`${lines.join('\r\n')}\r\n\r\n${encoded}`, 'utf8').toString('base64url');
}

module.exports = {
  attachments,
  bodyText,
  buildRaw,
  gmail,
  header,
  htmlToText,
  isMessageId,
  summary,
};
