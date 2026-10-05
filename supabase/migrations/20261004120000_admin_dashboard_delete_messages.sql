-- The admin dashboard (/admin) rejects spam and unsuitable submissions by
-- deleting them. Until now the service role could read, insert, and update
-- only, so a rejected note stayed in the table forever as "pending".
grant delete on table public.compassion_messages to service_role;

drop policy if exists "service role removes compassion messages" on public.compassion_messages;
create policy "service role removes compassion messages"
  on public.compassion_messages for delete to service_role using (true);

comment on table public.compassion_messages is
  'Moderated visitor messages for The Compassion Hub. Only approved rows are returned by the public Edge Function. The compassion-messages Edge Function only inserts rows and never sets approved; approval and deletion happen through the signed-in admin dashboard (/admin, service role, server side) or the Studio SQL editor.';
