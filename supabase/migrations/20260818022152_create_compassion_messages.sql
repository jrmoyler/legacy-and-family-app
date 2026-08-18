create table if not exists public.compassion_messages (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  community text,
  message text not null,
  approved boolean not null default false,
  request_fingerprint text not null,
  seed_key text unique,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  constraint compassion_messages_display_name_length
    check (char_length(btrim(display_name)) between 2 and 60),
  constraint compassion_messages_community_length
    check (community is null or char_length(btrim(community)) between 2 and 80),
  constraint compassion_messages_message_length
    check (char_length(btrim(message)) between 15 and 500),
  constraint compassion_messages_plain_text
    check (display_name !~ '[<>]' and coalesce(community, '') !~ '[<>]' and message !~ '[<>]')
);

comment on table public.compassion_messages is
  'Moderated visitor messages for The Compassion Hub. Only approved rows are returned by the public Edge Function.';
comment on column public.compassion_messages.request_fingerprint is
  'One-way daily request fingerprint used only for anonymous submission rate limiting.';

alter table public.compassion_messages enable row level security;
alter table public.compassion_messages force row level security;

revoke all on table public.compassion_messages from anon, authenticated;
grant select, insert on table public.compassion_messages to service_role;

drop policy if exists "service role reads compassion messages" on public.compassion_messages;
drop policy if exists "service role submits compassion messages" on public.compassion_messages;
create policy "service role reads compassion messages"
  on public.compassion_messages for select to service_role using (true);
create policy "service role submits compassion messages"
  on public.compassion_messages for insert to service_role with check (true);

create index if not exists compassion_messages_approved_created_idx
  on public.compassion_messages (approved, created_at desc);
create index if not exists compassion_messages_fingerprint_created_idx
  on public.compassion_messages (request_fingerprint, created_at desc);

insert into public.compassion_messages
  (display_name, community, message, approved, request_fingerprint, seed_key, created_at, reviewed_at)
values
  ('Karen', 'Atlanta, GA', 'You are not alone in this season. Take a breath, release what you cannot carry, and trust that good days are still ahead.', true, 'seed', 'welcome-karen', now() - interval '6 days', now()),
  ('Miguel', 'San Antonio, TX', 'May you remember that small steps still move you forward. Be gentle with yourself today.', true, 'seed', 'welcome-miguel', now() - interval '5 days', now()),
  ('Aisha', 'Raleigh, NC', 'You are deeply loved. Let that truth be the anchor that holds you steady no matter what comes.', true, 'seed', 'welcome-aisha', now() - interval '4 days', now()),
  ('James', 'Columbus, OH', 'Some days are harder than others. Keep choosing hope—one moment, one breath, one step at a time.', true, 'seed', 'welcome-james', now() - interval '3 days', now()),
  ('Tanya', 'Memphis, TN', 'Kindness you show today may be the light someone else needs to keep going. Thank you for being that light.', true, 'seed', 'welcome-tanya', now() - interval '2 days', now()),
  ('Derek', 'Phoenix, AZ', 'There is purpose in your story. What you have been through can become a source of strength for someone else.', true, 'seed', 'welcome-derek', now() - interval '1 day', now())
on conflict (seed_key) do nothing;
