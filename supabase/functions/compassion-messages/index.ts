const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const TABLE_URL = `${SUPABASE_URL}/rest/v1/compassion_messages`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json; charset=utf-8',
};

const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });

const normalized = (value: unknown, max: number) =>
  (typeof value === 'string' ? value : '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);

const digest = async (value: string) => {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};

const serviceHeaders = {
  apikey: SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return response({ error: 'Message service is unavailable.' }, 503);
  }

  if (request.method === 'GET') {
    const query = new URLSearchParams({
      select: 'id,display_name,community,message,created_at',
      approved: 'eq.true',
      order: 'created_at.desc',
      limit: '50',
    });
    const result = await fetch(`${TABLE_URL}?${query}`, { headers: serviceHeaders });
    if (!result.ok) return response({ error: 'Messages could not be loaded.' }, 502);
    return response({ messages: await result.json() });
  }

  if (request.method !== 'POST') return response({ error: 'Method not allowed.' }, 405);

  const declaredLength = Number(request.headers.get('content-length') || 0);
  if (declaredLength > 4096) return response({ error: 'That submission is too large.' }, 413);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return response({ error: 'Please complete the message form.' }, 400);
  }

  // Quietly accept bot-filled honeypots without writing anything.
  if (normalized(body.website, 200)) return response({ ok: true, status: 'pending' }, 202);

  const displayName = normalized(body.displayName, 60);
  const community = normalized(body.community, 80);
  const message = normalized(body.message, 500);
  const consent = body.consent === true;

  if (displayName.length < 2) return response({ error: 'Please enter your name.' }, 400);
  if (community && community.length < 2) {
    return response({ error: 'Please enter a valid city or community.' }, 400);
  }
  if (message.length < 15) return response({ error: 'Please write at least 15 characters.' }, 400);
  if (!consent) {
    return response({ error: 'Please confirm that your message may be reviewed and shared.' }, 400);
  }

  const contactPattern = /(https?:\/\/|www\.|\b[^\s@]+@[^\s@]+\.[^\s@]+\b|\+?\d[\d\s().-]{7,}\d)/i;
  if (contactPattern.test(`${displayName} ${community} ${message}`)) {
    return response({ error: 'Please leave out links, email addresses, and phone numbers.' }, 400);
  }

  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const remote = forwarded || request.headers.get('x-real-ip') || 'unknown';
  const day = new Date().toISOString().slice(0, 10);
  const fingerprint = await digest(`${SERVICE_ROLE_KEY}:${remote}:${day}`);

  const countQuery = new URLSearchParams({
    select: 'id',
    request_fingerprint: `eq.${fingerprint}`,
  });
  const countResult = await fetch(`${TABLE_URL}?${countQuery}`, {
    headers: { ...serviceHeaders, Prefer: 'count=exact', Range: '0-0' },
  });
  const total = Number((countResult.headers.get('content-range') || '').split('/')[1] || 0);
  if (!countResult.ok) {
    return response({ error: 'Your message could not be checked. Please try again.' }, 502);
  }
  if (total >= 3) {
    return response({ error: 'You have shared several messages today. Please return tomorrow.' }, 429);
  }

  const insertResult = await fetch(TABLE_URL, {
    method: 'POST',
    headers: {
      ...serviceHeaders,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      display_name: displayName,
      community: community || null,
      message,
      approved: false,
      request_fingerprint: fingerprint,
    }),
  });

  if (!insertResult.ok) {
    return response({ error: 'Your message could not be saved. Please try again.' }, 502);
  }
  return response({ ok: true, status: 'pending' }, 202);
});
