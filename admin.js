/**
 * The Compassion Hub — admin dashboard.
 *
 * Talks only to /api/admin (same origin), so the site's strict CSP needs no
 * new hosts. Every secret stays on the server; this file only ever sees
 * results.
 */

const $ = (selector) => document.querySelector(selector);
const view = $('#view');
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

const REFRESH_MS = 120000;
const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'mail', label: 'Gmail' },
  { id: 'compose', label: 'Compose' },
  { id: 'messages', label: 'Message wall' },
];
const MAIL_FILTERS = [
  { label: 'Inbox', q: 'in:inbox' },
  { label: 'Unread', q: 'is:unread in:inbox' },
  { label: 'Starred', q: 'is:starred' },
  { label: 'Important', q: 'is:important in:inbox' },
  { label: 'Sent', q: 'in:sent' },
  { label: 'Trash', q: 'in:trash' },
];
const SIGN_IN_ERRORS = {
  'not-configured': 'Google sign-in is not set up on this deployment yet.',
  cancelled: 'Sign-in was cancelled.',
  expired: 'That sign-in took too long. Please try again.',
  google: 'Google did not accept the sign-in. Please try again.',
  'not-allowed': 'That Google account is not on the admin list.',
  'no-offline': 'Google did not grant ongoing access. Please try again and allow every permission.',
};

const state = {
  me: null,
  overview: null,
  mail: { q: 'in:inbox', list: [], next: null, open: null, loading: false },
  notes: { status: 'pending', list: [], loading: false },
  compose: { to: '', cc: '', subject: '', body: '', replyTo: null },
};

/* --------------------------------------------------------------------------
   API
   -------------------------------------------------------------------------- */

async function api(action, { params = {}, body } = {}) {
  const query = new URLSearchParams({ action, ...params });
  const init = body === undefined
    ? { credentials: 'same-origin' }
    : {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Request': '1' },
      body: JSON.stringify(body),
    };
  const response = await fetch(`/api/admin?${query}`, init);
  const payload = await response.json().catch(() => ({}));
  if (response.status === 401 && action !== 'me') {
    state.me = { signedIn: false, missing: [] };
    render();
  }
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status}).`);
  return payload;
}

let toastTimer;
function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
}

const section = () => {
  const id = location.hash.replace('#', '');
  return SECTIONS.some((s) => s.id === id) ? id : 'overview';
};

const shortDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const today = new Date();
  return date.toDateString() === today.toDateString()
    ? date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};
const senderName = (from) => (String(from).match(/^"?([^"<]+?)"?\s*</) || [null, from])[1];

/* --------------------------------------------------------------------------
   Rendering
   -------------------------------------------------------------------------- */

function renderChrome() {
  const signedIn = state.me?.signedIn;
  $('#who').innerHTML = signedIn
    ? `<span>${esc(state.me.email)}</span><button type="button" data-action="logout">Sign out</button>`
    : '';
  const tabs = $('#tabs');
  tabs.hidden = !signedIn;
  if (!signedIn) return;
  const current = section();
  const pending = state.overview?.services?.supabase?.pendingMessages;
  const unread = state.overview?.services?.gmail?.unread;
  const count = (n) => (n > 0 ? `<span class="adm-count">${n > 99 ? '99+' : n}</span>` : '');
  tabs.innerHTML = SECTIONS.map((s) => `<a href="#${s.id}"${s.id === current ? ' aria-current="page"' : ''}>${esc(s.label)}${
    s.id === 'mail' ? count(unread) : s.id === 'messages' ? count(pending) : ''}</a>`).join('');
  const alerts = state.overview?.alerts?.filter((a) => a.level !== 'info').length || 0;
  document.title = `${alerts ? `(${alerts}) ` : ''}Admin — The Compassion Hub`;
}

function renderSignIn() {
  const error = new URLSearchParams(location.search).get('error');
  const missing = state.me?.missing || [];
  return `<section class="adm-signin">
    <h1>Admin sign-in</h1>
    <p class="adm-muted">Sign in with the Google account on the admin list. The same sign-in connects your Gmail.</p>
    ${error ? `<div class="adm-alert error"><div><strong>${esc(SIGN_IN_ERRORS[error] || 'Sign-in failed.')}</strong></div></div>` : ''}
    ${missing.length ? `<div class="adm-card"><strong>Finish setup first.</strong>
      <p class="adm-small">These settings are missing in Vercel → Project → Settings → Environment Variables:</p>
      <ul class="adm-small">${missing.map((m) => `<li><code>${esc(m)}</code></li>`).join('')}</ul>
      <p class="adm-small">The README section “Admin dashboard” walks through each one.</p></div>`
    : '<p><a class="adm-btn primary" href="/api/admin-auth">Sign in with Google</a></p>'}
  </section>`;
}

function renderOverview() {
  const data = state.overview;
  if (!data) return '<h1>Overview</h1><p class="adm-muted">Checking every service…</p>';
  const { services: s, alerts } = data;
  const dot = (ok, warn) => `<span class="adm-dot${ok ? (warn ? ' warn' : ' ok') : ''}" aria-hidden="true"></span>`;
  return `<h1>Overview</h1>
  <p class="adm-muted adm-small">Refreshes every two minutes. <button class="adm-btn" type="button" data-action="refresh">Refresh now</button></p>
  <h2>Alerts</h2>
  ${alerts.length ? `<div class="adm-alerts">${alerts.map((a) => `<div class="adm-alert ${esc(a.level)}">
      <div><strong>${esc(a.title)}</strong>${a.detail ? `<p>${esc(a.detail)}</p>` : ''}</div>
      ${a.link ? `<a class="adm-btn" href="#${esc(a.link)}">Open</a>` : ''}
    </div>`).join('')}</div>` : '<p class="adm-muted">All clear. Nothing needs you right now.</p>'}
  <h2>Services</h2>
  <div class="adm-grid">
    <div class="adm-card adm-stat">${dot(s.gmail.connected)}Gmail
      <b>${s.gmail.unread ?? '—'}</b><span class="adm-small adm-muted">unread · ${esc(s.gmail.email || '')}</span></div>
    <div class="adm-card adm-stat">${dot(s.supabase.connected)}Supabase
      <b>${s.supabase.pendingMessages ?? '—'}</b><span class="adm-small adm-muted">messages awaiting review</span></div>
    <div class="adm-card adm-stat">${dot(s.stripe.configured, s.stripe.mode === 'test')}Stripe
      <b>${s.stripe.configured ? esc(s.stripe.mode) : 'off'}</b><span class="adm-small adm-muted">checkout mode</span></div>
    <div class="adm-card adm-stat">${dot(s.margaret.connected, true)}Margaret
      <b>${s.margaret.connected ? 'live' : 'offline'}</b><span class="adm-small adm-muted">guide answers</span></div>
  </div>
  <h2>Consoles</h2>
  <div class="adm-row">
    <a class="adm-btn" href="https://mail.google.com/" target="_blank" rel="noopener">Gmail</a>
    <a class="adm-btn" href="https://supabase.com/dashboard/project/qxeadbfvsagupoykirer" target="_blank" rel="noopener">Supabase project</a>
    <a class="adm-btn" href="https://dashboard.stripe.com/" target="_blank" rel="noopener">Stripe</a>
    <a class="adm-btn" href="https://vercel.com/dashboard" target="_blank" rel="noopener">Vercel</a>
    <a class="adm-btn" href="/api/stripe-status" target="_blank" rel="noopener">Stripe status check</a>
  </div>`;
}

function renderMail() {
  const m = state.mail;
  const open = m.open;
  return `<h1>Gmail</h1>
  <form class="adm-search" data-form="search">
    <label class="sr-only" for="mail-q">Search mail</label>
    <input id="mail-q" name="q" value="${esc(m.q)}" placeholder="Search, e.g. from:someone@example.com is:unread">
    <button class="adm-btn primary" type="submit">Search</button>
  </form>
  <div class="adm-chips">${MAIL_FILTERS.map((f) => `<button type="button" data-filter="${esc(f.q)}" aria-pressed="${f.q === m.q}">${esc(f.label)}</button>`).join('')}</div>
  <div class="adm-mail">
    <div>
      ${m.loading && !m.list.length ? '<p class="adm-muted">Loading mail…</p>' : ''}
      ${!m.loading && !m.list.length ? '<p class="adm-muted">No emails match.</p>' : ''}
      ${m.list.length ? `<ul class="adm-list">${m.list.map((mail) => `<li class="${mail.unread ? 'unread' : ''}">
        <button type="button" data-open="${esc(mail.id)}" aria-current="${open?.id === mail.id}">
          <div class="adm-from"><span>${mail.starred ? '★ ' : ''}${esc(senderName(mail.from))}</span><time>${esc(shortDate(mail.date))}</time></div>
          <div class="adm-subj">${esc(mail.subject || '(no subject)')}</div>
          <div class="adm-snip">${esc(mail.snippet)}</div>
        </button></li>`).join('')}</ul>` : ''}
      ${m.next ? '<p><button class="adm-btn" type="button" data-action="more">Load more</button></p>' : ''}
    </div>
    <div>${open ? renderReader(open) : '<div class="adm-card adm-muted">Choose an email to read it here.</div>'}</div>
  </div>`;
}

function renderReader(mail) {
  if (mail.loading) return '<div class="adm-card adm-muted">Opening…</div>';
  const op = (name, label, extra = '') => `<button class="adm-btn ${extra}" type="button" data-op="${name}">${label}</button>`;
  return `<article class="adm-card adm-reader">
    <h3>${esc(mail.subject || '(no subject)')}</h3>
    <div class="adm-meta">From ${esc(mail.from)}<br>To ${esc(mail.to)}${mail.cc ? `<br>Cc ${esc(mail.cc)}` : ''}<br>${esc(mail.date)}</div>
    <div class="adm-row adm-actions">
      <button class="adm-btn primary" type="button" data-action="reply">Reply</button>
      ${mail.unread ? op('read', 'Mark read') : op('unread', 'Mark unread')}
      ${mail.starred ? op('unstar', 'Unstar') : op('star', 'Star')}
      ${mail.inInbox ? op('archive', 'Archive') : op('inbox', 'Move to inbox')}
      ${mail.trashed ? op('untrash', 'Restore') : op('trash', 'Trash', 'danger')}
    </div>
    ${mail.attachments?.length ? `<p class="adm-small adm-muted">Attachments: ${mail.attachments.map((a) => esc(a.name)).join(', ')} — open in Gmail to download.</p>` : ''}
    <div class="adm-body">${esc(mail.body || mail.snippet)}</div>
  </article>`;
}

function renderCompose() {
  const c = state.compose;
  return `<h1>${c.replyTo ? 'Reply' : 'New email'}</h1>
  <p class="adm-muted adm-small">Sends from ${esc(state.overview?.services?.gmail?.email || state.me.email)} through Gmail. It will appear in your Sent folder.</p>
  <form class="adm-card" data-form="compose">
    <div class="adm-field"><label for="c-to">To</label><input id="c-to" name="to" value="${esc(c.to)}" required autocomplete="email"></div>
    <div class="adm-field"><label for="c-cc">Cc</label><input id="c-cc" name="cc" value="${esc(c.cc)}" autocomplete="email"></div>
    <div class="adm-field"><label for="c-subject">Subject</label><input id="c-subject" name="subject" value="${esc(c.subject)}"${c.replyTo ? ' readonly' : ''}></div>
    <div class="adm-field"><label for="c-body">Message</label><textarea id="c-body" name="body" required>${esc(c.body)}</textarea></div>
    <div class="adm-row">
      <button class="adm-btn primary" type="submit">Send</button>
      <button class="adm-btn" type="button" data-action="discard">Discard</button>
    </div>
  </form>`;
}

function renderMessages() {
  const n = state.notes;
  const filters = [['pending', 'Waiting for review'], ['approved', 'Published'], ['all', 'All']];
  return `<h1>Message wall</h1>
  <p class="adm-muted adm-small">Visitor notes from Supabase. Approving one publishes it on the public Messages page; deleting removes it for good.</p>
  <div class="adm-chips">${filters.map(([id, label]) => `<button type="button" data-notes="${id}" aria-pressed="${n.status === id}">${label}</button>`).join('')}</div>
  ${n.loading ? '<p class="adm-muted">Loading…</p>' : ''}
  ${!n.loading && !n.list.length ? '<p class="adm-muted">Nothing here.</p>' : ''}
  <div class="adm-notes">${n.list.map((note) => `<article class="adm-card adm-note">
    <div class="adm-row"><strong>${esc(note.display_name)}</strong>
      ${note.community ? `<span class="adm-muted adm-small">${esc(note.community)}</span>` : ''}
      <span class="adm-tag${note.approved ? ' ok' : ''}">${note.approved ? 'Published' : 'Pending'}</span>
      <span class="adm-muted adm-small">${esc(new Date(note.created_at).toLocaleString())}</span></div>
    <p>${esc(note.message)}</p>
    <div class="adm-row">
      ${note.approved
    ? `<button class="adm-btn" type="button" data-approve="${esc(note.id)}" data-value="false">Unpublish</button>`
    : `<button class="adm-btn primary" type="button" data-approve="${esc(note.id)}" data-value="true">Approve</button>`}
      <button class="adm-btn danger" type="button" data-delete="${esc(note.id)}">Delete</button>
    </div></article>`).join('')}</div>`;
}

function render() {
  renderChrome();
  if (!state.me) return;
  if (!state.me.signedIn) {
    view.innerHTML = renderSignIn();
    return;
  }
  const renderers = { overview: renderOverview, mail: renderMail, compose: renderCompose, messages: renderMessages };
  view.innerHTML = renderers[section()]();
}

/* --------------------------------------------------------------------------
   Loading
   -------------------------------------------------------------------------- */

async function loadOverview() {
  try {
    state.overview = await api('overview');
  } catch (error) {
    if (state.me?.signedIn) toast(error.message);
  }
  render();
}

async function loadMail(append = false) {
  const m = state.mail;
  m.loading = true;
  if (!append) { m.list = []; m.next = null; }
  render();
  try {
    const params = { q: m.q };
    if (append && m.next) params.pageToken = m.next;
    const page = await api('gmail.list', { params });
    m.list = append ? m.list.concat(page.messages) : page.messages;
    m.next = page.nextPageToken;
  } catch (error) {
    toast(error.message);
  }
  m.loading = false;
  render();
}

async function openMail(id) {
  state.mail.open = { id, loading: true };
  render();
  try {
    const { message } = await api('gmail.get', { params: { id } });
    state.mail.open = message;
    if (message.unread) await changeMail('read', true);
  } catch (error) {
    state.mail.open = null;
    toast(error.message);
  }
  render();
  /* On a phone the reader sits under the list. */
  if (state.mail.open && window.matchMedia('(max-width: 899px)').matches) {
    document.querySelector('.adm-reader')?.scrollIntoView({ block: 'start' });
  }
}

function replaceInList(message) {
  state.mail.list = state.mail.list.map((m) => (m.id === message.id ? { ...m, ...message } : m));
  if (state.mail.open?.id === message.id) state.mail.open = { ...state.mail.open, ...message };
}

async function changeMail(op, quiet = false) {
  const id = state.mail.open?.id;
  if (!id) return;
  try {
    const { message } = op === 'trash' || op === 'untrash'
      ? await api(`gmail.${op}`, { body: { id } })
      : await api('gmail.modify', { body: { id, op } });
    if (message) replaceInList(message);
    if (op === 'trash' || op === 'archive') {
      state.mail.list = state.mail.list.filter((m) => m.id !== id);
      state.mail.open = null;
    }
    if (!quiet) toast({ trash: 'Moved to trash.', untrash: 'Restored.', archive: 'Archived.' }[op] || 'Updated.');
    loadOverview();
  } catch (error) {
    toast(error.message);
  }
  render();
}

async function loadNotes() {
  state.notes.loading = true;
  render();
  try {
    state.notes.list = (await api('messages.list', { params: { status: state.notes.status } })).messages;
  } catch (error) {
    state.notes.list = [];
    toast(error.message);
  }
  state.notes.loading = false;
  render();
}

function loadSection() {
  const current = section();
  if (current === 'mail' && !state.mail.list.length && !state.mail.loading) loadMail();
  if (current === 'messages') loadNotes();
}

/* --------------------------------------------------------------------------
   Events
   -------------------------------------------------------------------------- */

document.addEventListener('click', async (event) => {
  const target = event.target.closest('button, a');
  if (!target) return;
  const { dataset } = target;

  if (dataset.action === 'logout') {
    await api('logout', { body: {} }).catch(() => {});
    state.me = { signedIn: false, missing: [] };
    history.replaceState(null, '', '/admin');
    render();
  } else if (dataset.action === 'refresh') {
    state.overview = null;
    render();
    loadOverview();
  } else if (dataset.action === 'more') {
    loadMail(true);
  } else if (dataset.action === 'reply') {
    const mail = state.mail.open;
    const quoted = String(mail.body || '').split('\n').map((line) => `> ${line}`).join('\n');
    state.compose = {
      to: mail.from,
      cc: '',
      subject: /^re:/i.test(mail.subject) ? mail.subject : `Re: ${mail.subject}`,
      body: `\n\nOn ${mail.date}, ${mail.from} wrote:\n${quoted}`,
      replyTo: mail.id,
    };
    location.hash = 'compose';
  } else if (dataset.action === 'discard') {
    state.compose = { to: '', cc: '', subject: '', body: '', replyTo: null };
    render();
  } else if (dataset.filter !== undefined) {
    state.mail.q = dataset.filter;
    state.mail.open = null;
    loadMail();
  } else if (dataset.open) {
    openMail(dataset.open);
  } else if (dataset.op) {
    changeMail(dataset.op);
  } else if (dataset.notes) {
    state.notes.status = dataset.notes;
    loadNotes();
  } else if (dataset.approve) {
    target.disabled = true;
    try {
      await api('messages.approve', { body: { id: dataset.approve, approved: dataset.value === 'true' } });
      toast(dataset.value === 'true' ? 'Published on the wall.' : 'Unpublished.');
      loadNotes();
      loadOverview();
    } catch (error) {
      target.disabled = false;
      toast(error.message);
    }
  } else if (dataset.delete) {
    if (!window.confirm('Delete this message permanently?')) return;
    target.disabled = true;
    try {
      await api('messages.delete', { body: { id: dataset.delete } });
      toast('Deleted.');
      loadNotes();
      loadOverview();
    } catch (error) {
      target.disabled = false;
      toast(error.message);
    }
  }
});

document.addEventListener('submit', async (event) => {
  const form = event.target;
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form));

  if (form.dataset.form === 'search') {
    state.mail.q = String(data.q || '').trim();
    state.mail.open = null;
    loadMail();
    return;
  }

  if (form.dataset.form === 'compose') {
    Object.assign(state.compose, data);
    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    try {
      const replyTo = state.compose.replyTo;
      await api(replyTo ? 'gmail.reply' : 'gmail.send', {
        body: replyTo ? { id: replyTo, to: data.to, cc: data.cc, body: data.body } : data,
      });
      toast('Sent.');
      state.compose = { to: '', cc: '', subject: '', body: '', replyTo: null };
      location.hash = 'mail';
    } catch (error) {
      button.disabled = false;
      toast(error.message);
    }
  }
});

/* Keep a half-written email when switching tabs. */
document.addEventListener('input', (event) => {
  const form = event.target.closest('[data-form="compose"]');
  if (form && event.target.name in state.compose) state.compose[event.target.name] = event.target.value;
});

window.addEventListener('hashchange', () => {
  render();
  loadSection();
  view.focus({ preventScroll: true });
});

async function start() {
  try {
    state.me = await api('me');
  } catch {
    state.me = { signedIn: false, missing: [] };
  }
  render();
  if (!state.me.signedIn) return;
  if (location.search) history.replaceState(null, '', `/admin${location.hash}`);
  loadOverview();
  loadSection();
  setInterval(() => { if (!document.hidden) loadOverview(); }, REFRESH_MS);
}

start();
