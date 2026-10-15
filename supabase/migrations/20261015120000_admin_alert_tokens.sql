-- New-message email alerts for the admin dashboard (/admin).
--
-- A visitor's note is submitted by an anonymous browser, so there is no signed-in
-- admin session to send mail with. When an admin signs in to /admin, the server
-- keeps their Google refresh token here, sealed (AES-256-GCM, keyed by
-- ADMIN_SESSION_SECRET) so the table never holds a usable credential on its own.
-- The submit endpoint then uses it to email the admin from their own Gmail.
--
-- Only the service role (server side) can touch this table; RLS is on and no
-- policy grants anything to anon or authenticated.
create table if not exists public.admin_alert_tokens (
  email text primary key,
  sealed_token text not null,
  updated_at timestamptz not null default now()
);

alter table public.admin_alert_tokens enable row level security;
revoke all on table public.admin_alert_tokens from anon, authenticated;
grant select, insert, update, delete on table public.admin_alert_tokens to service_role;

drop policy if exists "service role manages admin alert tokens" on public.admin_alert_tokens;
create policy "service role manages admin alert tokens"
  on public.admin_alert_tokens for all to service_role using (true) with check (true);

comment on table public.admin_alert_tokens is
  'Sealed Google refresh tokens for admins who signed in to /admin, used only to email them when a new Messages of Compassion note needs approval. Service role only.';
