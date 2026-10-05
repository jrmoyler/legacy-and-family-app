'use strict';

const {
  DEFAULT_SUPABASE_URL, SESSION_COOKIE, accessToken, clearCookie, configuration, env,
  missingConfiguration, readSession, reply,
} = require('./_admin');
const { attachments, bodyText, buildRaw, gmail, header, isMessageId, summary } = require('./_gmail');
const { readSecretKey } = require('./_stripe');

/**
 * The admin dashboard's API: one function, routed by `?action=`, so the
 * dashboard costs one Vercel function rather than a dozen.
 *
 * Every action except `me` needs the signed-in admin session. Every POST also
 * needs the `X-Admin-Request: 1` header — a page on another site cannot set a
 * custom header without a CORS preflight this function never grants, so that
 * header plus the SameSite cookie closes off cross-site request forgery.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIMEOUT = 10000;

const fail = (status, message) => Object.assign(new Error(message), { status });

/* --------------------------------------------------------------------------
   Supabase (service role; server side only)
   -------------------------------------------------------------------------- */

const supabaseUrl = () => (env('SUPABASE_URL') || DEFAULT_SUPABASE_URL).replace(/\/+$/, '');

async function supabase(path, init = {}) {
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  if (!key) throw fail(503, 'SUPABASE_SERVICE_ROLE_KEY is not set in this deployment.');
  const response = await fetch(`${supabaseUrl()}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
    signal: AbortSignal.timeout(TIMEOUT),
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw fail(502, `Supabase returned ${response.status}${detail?.message ? `: ${detail.message}` : ''}.`);
  }
  return response;
}

async function pendingMessageCount() {
  const response = await supabase('compassion_messages?select=id&approved=eq.false', {
    headers: { Prefer: 'count=exact', Range: '0-0' },
  });
  const total = Number(String(response.headers.get('content-range') || '').split('/')[1]);
  return Number.isFinite(total) ? total : 0;
}

async function listMessages(status) {
  const filter = status === 'approved' ? '&approved=eq.true' : status === 'all' ? '' : '&approved=eq.false';
  const response = await supabase(
    `compassion_messages?select=id,display_name,community,message,approved,created_at,reviewed_at${filter}&order=created_at.desc&limit=100`,
  );
  return response.json();
}

async function setApproved(id, approved) {
  const response = await supabase(`compassion_messages?id=eq.${id}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ approved, reviewed_at: new Date().toISOString() }),
  });
  const rows = await response.json();
  if (!rows.length) throw fail(404, 'That message no longer exists.');
  return rows[0];
}

async function deleteMessage(id) {
  const response = await supabase(`compassion_messages?id=eq.${id}`, {
    method: 'DELETE',
    headers: { Prefer: 'return=representation' },
  });
  const rows = await response.json();
  if (!rows.length) throw fail(404, 'That message no longer exists.');
}

/* --------------------------------------------------------------------------
   Gmail
   -------------------------------------------------------------------------- */

async function listMail(token, query) {
  const params = new URLSearchParams({ maxResults: '25' });
  const q = String(query.q ?? 'in:inbox').slice(0, 500);
  if (q) params.set('q', q);
  if (typeof query.pageToken === 'string' && /^[\w-]{1,200}$/.test(query.pageToken)) {
    params.set('pageToken', query.pageToken);
  }
  const page = await gmail(token, `/messages?${params}`);
  const ids = (page.messages || []).map((m) => m.id);
  const metadata = '?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date';
  const messages = await Promise.all(ids.map((id) => gmail(token, `/messages/${id}${metadata}`)));
  return {
    messages: messages.map(summary),
    nextPageToken: page.nextPageToken || null,
    estimate: page.resultSizeEstimate || 0,
  };
}

async function readMail(token, id) {
  const message = await gmail(token, `/messages/${id}?format=full`);
  return { ...summary(message), cc: header(message, 'Cc'), body: bodyText(message.payload), attachments: attachments(message.payload) };
}

const LABEL_CHANGES = {
  read: { removeLabelIds: ['UNREAD'] },
  unread: { addLabelIds: ['UNREAD'] },
  archive: { removeLabelIds: ['INBOX'] },
  inbox: { addLabelIds: ['INBOX'] },
  star: { addLabelIds: ['STARRED'] },
  unstar: { removeLabelIds: ['STARRED'] },
  important: { addLabelIds: ['IMPORTANT'] },
  unimportant: { removeLabelIds: ['IMPORTANT'] },
};

async function modifyMail(token, id, op) {
  const change = LABEL_CHANGES[op];
  if (!change) throw fail(400, 'Unknown change.');
  const message = await gmail(token, `/messages/${id}/modify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(change),
  });
  return summary(message);
}

async function sendMail(token, body) {
  const raw = buildRaw({ to: body.to, cc: body.cc, subject: body.subject, body: body.body });
  const sent = await gmail(token, '/messages/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw }),
  });
  return { id: sent.id, threadId: sent.threadId };
}

async function replyMail(token, body) {
  if (!isMessageId(body.id)) throw fail(400, 'Choose an email to reply to.');
  const original = await gmail(
    token,
    `/messages/${body.id}?format=metadata&metadataHeaders=From&metadataHeaders=Reply-To&metadataHeaders=Subject&metadataHeaders=Message-ID&metadataHeaders=References`,
  );
  const messageId = header(original, 'Message-ID');
  const subject = header(original, 'Subject');
  const raw = buildRaw({
    to: body.to || header(original, 'Reply-To') || header(original, 'From'),
    cc: body.cc,
    subject: /^re:/i.test(subject) ? subject : `Re: ${subject}`,
    body: body.body,
    inReplyTo: messageId,
    references: [header(original, 'References'), messageId].filter(Boolean).join(' '),
  });
  const sent = await gmail(token, '/messages/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw, threadId: original.threadId }),
  });
  return { id: sent.id, threadId: sent.threadId };
}

/* --------------------------------------------------------------------------
   Overview + alerts
   -------------------------------------------------------------------------- */

const settled = async (work) => {
  try { return { ok: true, value: await work() }; } catch (error) { return { ok: false, error: error.message }; }
};

async function overview(session) {
  const [pending, inbox, profile] = await Promise.all([
    settled(pendingMessageCount),
    settled(async () => gmail(await accessToken(session), '/labels/INBOX')),
    settled(async () => gmail(await accessToken(session), '/profile')),
  ]);

  const stripe = readSecretKey();
  const margaret = Boolean(env('MARGARET_API_URL') && env('MARGARET_API_KEY'));
  const alerts = [];
  const alert = (level, title, detail, link) => alerts.push({ level, title, detail, link });

  if (!configuration().supabase) {
    alert('error', 'Supabase is not connected', 'Set SUPABASE_SERVICE_ROLE_KEY in Vercel to moderate the message wall from here.');
  } else if (!pending.ok) {
    alert('error', 'Supabase could not be reached', pending.error);
  } else if (pending.value > 0) {
    alert('warning', `${pending.value} message${pending.value === 1 ? '' : 's'} waiting for review`, 'Visitors are waiting to see their notes on the wall.', 'messages');
  }

  if (!inbox.ok) {
    alert('error', 'Gmail could not be reached', inbox.error);
  } else if (inbox.value.messagesUnread > 0) {
    alert('info', `${inbox.value.messagesUnread} unread email${inbox.value.messagesUnread === 1 ? '' : 's'} in your inbox`, '', 'mail');
  }

  if (!stripe.ok) {
    alert('error', 'Stripe checkout is not configured', stripe.reason === 'publishable'
      ? 'STRIPE_SECRET_KEY holds a publishable key; it needs the secret key.'
      : 'Set STRIPE_SECRET_KEY in Vercel. Until then nobody can buy from the Shop.');
  } else if (stripe.mode === 'test') {
    alert('warning', 'Stripe is in test mode', 'Purchases will not take real payments.');
  }

  if (!margaret) {
    alert('info', 'Margaret is using her offline answers', 'Set MARGARET_API_URL and MARGARET_API_KEY to connect her to a language model.');
  }

  return {
    alerts,
    services: {
      supabase: { connected: configuration().supabase && pending.ok, url: supabaseUrl(), pendingMessages: pending.ok ? pending.value : null },
      gmail: {
        connected: inbox.ok,
        email: profile.ok ? profile.value.emailAddress : session.email,
        unread: inbox.ok ? inbox.value.messagesUnread : null,
        total: profile.ok ? profile.value.messagesTotal : null,
      },
      stripe: { configured: stripe.ok, mode: stripe.ok ? stripe.mode : null },
      margaret: { connected: margaret },
    },
  };
}

/* --------------------------------------------------------------------------
   Router
   -------------------------------------------------------------------------- */

const READS = new Set(['me', 'overview', 'gmail.list', 'gmail.get', 'messages.list']);
const WRITES = new Set(['logout', 'gmail.modify', 'gmail.trash', 'gmail.untrash', 'gmail.send', 'gmail.reply', 'messages.approve', 'messages.delete']);

module.exports = async function admin(req, res) {
  const query = req.query || {};
  const action = String(query.action || '');
  const isRead = READS.has(action);
  const isWrite = WRITES.has(action);

  if (!isRead && !isWrite) return reply(res, 404, { error: 'Unknown action.' });
  if ((isRead && req.method !== 'GET') || (isWrite && req.method !== 'POST')) {
    res.setHeader('Allow', isRead ? 'GET' : 'POST');
    return reply(res, 405, { error: 'Method not allowed.' });
  }
  if (isWrite && req.headers?.['x-admin-request'] !== '1') {
    return reply(res, 403, { error: 'Missing admin request header.' });
  }

  const session = readSession(req);

  if (action === 'me') {
    return reply(res, 200, {
      signedIn: Boolean(session),
      email: session?.email || null,
      name: session?.name || null,
      missing: missingConfiguration(),
    });
  }
  if (action === 'logout') {
    res.setHeader('Set-Cookie', clearCookie(SESSION_COOKIE));
    return reply(res, 200, { ok: true });
  }
  if (!session) return reply(res, 401, { error: 'Please sign in.' });

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const token = () => accessToken(session);

  try {
    switch (action) {
      case 'overview':
        return reply(res, 200, await overview(session));
      case 'gmail.list':
        return reply(res, 200, await listMail(await token(), query));
      case 'gmail.get':
        if (!isMessageId(query.id)) throw fail(400, 'Choose an email.');
        return reply(res, 200, { message: await readMail(await token(), query.id) });
      case 'gmail.modify':
        if (!isMessageId(body.id)) throw fail(400, 'Choose an email.');
        return reply(res, 200, { message: await modifyMail(await token(), body.id, body.op) });
      case 'gmail.trash':
      case 'gmail.untrash':
        if (!isMessageId(body.id)) throw fail(400, 'Choose an email.');
        return reply(res, 200, {
          message: summary(await gmail(await token(), `/messages/${body.id}/${action === 'gmail.trash' ? 'trash' : 'untrash'}`, { method: 'POST' })),
        });
      case 'gmail.send':
        return reply(res, 200, { sent: await sendMail(await token(), body) });
      case 'gmail.reply':
        return reply(res, 200, { sent: await replyMail(await token(), body) });
      case 'messages.list':
        return reply(res, 200, { messages: await listMessages(String(query.status || 'pending')) });
      case 'messages.approve':
        if (!UUID.test(String(body.id))) throw fail(400, 'Choose a message.');
        return reply(res, 200, { message: await setApproved(body.id, body.approved !== false) });
      case 'messages.delete':
        if (!UUID.test(String(body.id))) throw fail(400, 'Choose a message.');
        await deleteMessage(body.id);
        return reply(res, 200, { ok: true });
      default:
        return reply(res, 404, { error: 'Unknown action.' });
    }
  } catch (error) {
    const status = error.status || 502;
    if (status >= 500) console.error(`Admin ${action} failed:`, error.message);
    return reply(res, status, { error: error.message || 'Something went wrong.' });
  }
};
