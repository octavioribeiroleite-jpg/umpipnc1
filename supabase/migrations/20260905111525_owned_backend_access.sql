-- Target-only restoration of least-privilege application access.
-- Install together with portal sessions and guarded RPCs before cutover.
begin;

do $$
begin
  if (select count(*) from pg_tables where schemaname = 'public') <> 49 then
    raise exception 'Unexpected public schema; review proposal against current target';
  end if;
  if exists (select 1 from pg_policies where schemaname in ('public', 'storage')) then
    raise exception 'Policies already exist; review and merge, do not stack permissive policies';
  end if;
end $$;

-- Managed auth/storage/realtime schema privileges and source are not touched.
revoke all on all tables in schema public from public, anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to service_role;

create schema if not exists ipnc_private;
revoke all on schema ipnc_private from public, anon;
grant usage on schema ipnc_private to authenticated, service_role;

create or replace function ipnc_private.actor_active() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.active);
$$;

create or replace function ipnc_private.actor_has_role(wanted public.app_role) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(
    select 1 from public.user_roles r join public.profiles p on p.user_id = r.user_id
    where r.user_id = (select auth.uid()) and r.role = wanted and p.active
  );
$$;

create or replace function ipnc_private.actor_society() returns uuid
language sql stable security definer set search_path = '' as $$
  select p.society_id from public.profiles p where p.user_id = (select auth.uid()) and p.active limit 1;
$$;

create or replace function ipnc_private.can_read_society(wanted uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(ipnc_private.actor_active() and (
    ipnc_private.actor_has_role('admin') or ipnc_private.actor_has_role('pastor')
    or wanted = ipnc_private.actor_society()
  ), false);
$$;

create or replace function ipnc_private.can_manage_society(wanted uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(ipnc_private.actor_has_role('admin') or (
    ipnc_private.actor_has_role('diretoria') and wanted = ipnc_private.actor_society()
  ), false);
$$;

create or replace function ipnc_private.can_manage_election(wanted uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.elections e where e.id = wanted and (
    ipnc_private.can_manage_society(e.society_id) or ipnc_private.actor_has_role('pastor')
  ));
$$;

revoke all on function ipnc_private.actor_active(),
  ipnc_private.actor_has_role(public.app_role), ipnc_private.actor_society(),
  ipnc_private.can_read_society(uuid), ipnc_private.can_manage_society(uuid),
  ipnc_private.can_manage_election(uuid) from public, anon;
grant execute on function ipnc_private.actor_active(),
  ipnc_private.actor_has_role(public.app_role), ipnc_private.actor_society(),
  ipnc_private.can_read_society(uuid), ipnc_private.can_manage_society(uuid),
  ipnc_private.can_manage_election(uuid) to authenticated, service_role;

-- Fixed literal registry only: no client-provided table, predicate or SQL.
do $$
declare t text; p record; reader text; writer text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;

  foreach t in array array[
    'charges','files','financial_categories','financial_settings','meetings',
    'members','member_payment_submissions','shirt_campaigns','shirt_inventory',
    'shirt_order_payments','shirt_orders','shirt_purchases','shirt_sales',
    'study_notes','tasks','transactions'
  ] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('create policy ipnc_read on public.%I for select to authenticated using (ipnc_private.can_read_society(society_id))', t);
    execute format('create policy ipnc_manage on public.%I for all to authenticated using (ipnc_private.can_manage_society(society_id)) with check (ipnc_private.can_manage_society(society_id))', t);
  end loop;

  for p in select * from (values
    ('agenda_items','meetings','meeting_id'),
    ('ai_suggestions','meetings','meeting_id'),
    ('meeting_participants','meetings','meeting_id'),
    ('membership_payments','members','member_id'),
    ('shirt_purchase_items','shirt_purchases','purchase_id')
  ) as x(child,parent,parent_key) loop
    reader := format('exists(select 1 from public.%I parent where parent.id = %I.%I and ipnc_private.can_read_society(parent.society_id))', p.parent,p.child,p.parent_key);
    writer := format('exists(select 1 from public.%I parent where parent.id = %I.%I and ipnc_private.can_manage_society(parent.society_id))', p.parent,p.child,p.parent_key);
    execute format('grant select, insert, update, delete on public.%I to authenticated', p.child);
    execute format('create policy ipnc_read on public.%I for select to authenticated using (%s)', p.child,reader);
    execute format('create policy ipnc_manage on public.%I for all to authenticated using (%s) with check (%s)', p.child,writer,writer);
  end loop;
end $$;

create policy ipnc_own_submission_read on public.member_payment_submissions
for select to authenticated using (ipnc_private.actor_active() and user_id = (select auth.uid()));

grant select, insert, update, delete on public.contributions, public.shirt_campaign_lots to authenticated;
create policy ipnc_read on public.contributions for select to authenticated using (
  exists(select 1 from public.meetings m where m.id = contributions.meeting_id and ipnc_private.can_read_society(m.society_id))
);
create policy ipnc_own on public.contributions for all to authenticated using (
  user_id = (select auth.uid()) and exists(select 1 from public.meetings m where m.id = contributions.meeting_id and ipnc_private.can_read_society(m.society_id))
) with check (
  user_id = (select auth.uid()) and exists(select 1 from public.meetings m where m.id = contributions.meeting_id and ipnc_private.can_read_society(m.society_id))
  and (agenda_item_id is null or exists(select 1 from public.agenda_items a where a.id = contributions.agenda_item_id and a.meeting_id = contributions.meeting_id))
);
create policy ipnc_read on public.shirt_campaign_lots for select to authenticated using (
  ipnc_private.can_manage_society(society_id) or ipnc_private.actor_has_role('pastor')
);
create policy ipnc_manage on public.shirt_campaign_lots for all to authenticated using (
  ipnc_private.can_manage_society(society_id)
) with check (
  ipnc_private.can_manage_society(society_id)
  and exists(select 1 from public.shirt_campaigns c where c.id = campaign_id and c.society_id = shirt_campaign_lots.society_id)
);

-- EBD (8 tables) intentionally remains RLS-enabled without client grants.
-- All operational access comes from the separately authenticated EBD gateway.
-- Do not restore the 21 permissive PUBLIC/anon EBD policies or PIN-table reads.

do $$
declare t text;
begin
  foreach t in array array['aniversariantes','notificacoes_aniversarios','plenaries','plenary_attendance'] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated',t);
    execute format('create policy ipnc_manage on public.%I for all to authenticated using (ipnc_private.actor_has_role(''admin'') or ipnc_private.actor_has_role(''diretoria'')) with check (ipnc_private.actor_has_role(''admin'') or ipnc_private.actor_has_role(''diretoria''))',t);
  end loop;
  foreach t in array array['plenaries','plenary_attendance'] loop
    execute format('create policy ipnc_read on public.%I for select to authenticated using ((select ipnc_private.actor_active()))',t);
  end loop;
end $$;

grant select on public.elections, public.election_candidates to anon, authenticated;
grant insert, update, delete on public.elections, public.election_candidates to authenticated;
create policy ipnc_display on public.elections for select to anon, authenticated using (true);
create policy ipnc_display on public.election_candidates for select to anon, authenticated using (true);
create policy ipnc_manage on public.elections for all to authenticated using (
  ipnc_private.can_manage_society(society_id) or ipnc_private.actor_has_role('pastor')
) with check (
  ipnc_private.can_manage_society(society_id) or ipnc_private.actor_has_role('pastor')
);
do $$
declare t text;
begin
  foreach t in array array['election_attendance','election_devices','election_votes','election_candidates'] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated',t);
    execute format('create policy ipnc_manage on public.%I for all to authenticated using (ipnc_private.can_manage_election(election_id)) with check (ipnc_private.can_manage_election(election_id))',t);
  end loop;
end $$;
-- No raw anon device/vote grants. No public vote INSERT. Gateway must preserve voting UX.

grant select on public.events to anon, authenticated;
grant insert, update, delete on public.events to authenticated;
create policy ipnc_public_events on public.events for select to anon using (status <> 'cancelado');
create policy ipnc_read on public.events for select to authenticated using ((select ipnc_private.actor_active()));
create policy ipnc_manage on public.events for all to authenticated using (
  ipnc_private.can_manage_society(society_id) or ipnc_private.actor_has_role('pastor')
) with check (
  ipnc_private.can_manage_society(society_id) or ipnc_private.actor_has_role('pastor')
);

grant select on public.pastor_announcements to anon, authenticated;
grant insert, update, delete on public.pastor_announcements to authenticated;
create policy ipnc_public_announcements on public.pastor_announcements for select to anon using (scope = 'church');
create policy ipnc_read on public.pastor_announcements for select to authenticated using (
  ipnc_private.actor_active() and (scope = 'church' or target_societies is null
  or ipnc_private.actor_society() = any(target_societies)
  or ipnc_private.actor_has_role('admin') or ipnc_private.actor_has_role('pastor'))
);
create policy ipnc_manage on public.pastor_announcements for all to authenticated using (
  ipnc_private.actor_has_role('admin') or ipnc_private.actor_has_role('pastor')
) with check (
  ipnc_private.actor_has_role('admin') or ipnc_private.actor_has_role('pastor')
);
create policy ipnc_diretoria_create on public.pastor_announcements for insert to authenticated with check (
  ipnc_private.actor_has_role('diretoria') and created_by = (select auth.uid())
  and created_by_role = 'diretoria' and scope = 'societies'
  and target_societies = array[ipnc_private.actor_society()]
);
-- No broad recipient UPDATE. Add append-current-user read receipt via narrow RPC.

grant select, insert, update, delete on public.pastor_feedback to authenticated;
create policy ipnc_manage on public.pastor_feedback for all to authenticated using (
  ipnc_private.actor_has_role('admin') or ipnc_private.actor_has_role('diretoria')
) with check (
  ipnc_private.actor_has_role('admin') or ipnc_private.actor_has_role('diretoria')
);
create policy ipnc_pastor_own on public.pastor_feedback for select to authenticated using (
  ipnc_private.actor_has_role('pastor') and created_by = (select auth.uid())
);
create policy ipnc_pastor_create on public.pastor_feedback for insert to authenticated with check (
  ipnc_private.actor_has_role('pastor') and created_by = (select auth.uid())
);
create policy ipnc_pastor_delete on public.pastor_feedback for delete to authenticated using (ipnc_private.actor_has_role('pastor'));

grant select on public.pastor_summaries to authenticated;
create policy ipnc_read on public.pastor_summaries for select to authenticated using (
  ipnc_private.actor_has_role('admin') or ipnc_private.actor_has_role('pastor')
  or (ipnc_private.actor_has_role('diretoria') and society_id = ipnc_private.actor_society())
);
grant select on public.portal_visitors to authenticated;
create policy ipnc_read on public.portal_visitors for select to authenticated using (
  ipnc_private.actor_has_role('admin') or ipnc_private.actor_has_role('diretoria') or ipnc_private.actor_has_role('pastor')
);
-- Portal visitor register/touch requires a server endpoint with an allowlisted body.

grant select, insert, update, delete on public.profiles, public.user_roles, public.settings, public.societies to authenticated;
create policy ipnc_profile_read on public.profiles for select to authenticated using (
  user_id = (select auth.uid()) or ipnc_private.can_read_society(society_id)
);
create policy ipnc_profile_admin on public.profiles for all to authenticated using (
  ipnc_private.actor_has_role('admin')
) with check (ipnc_private.actor_has_role('admin'));
-- User profile is created by on_auth_user_created; no self insert/society change.
create policy ipnc_roles_read on public.user_roles for select to authenticated using (
  (ipnc_private.actor_active() and user_id = (select auth.uid())) or ipnc_private.actor_has_role('admin')
);
create policy ipnc_roles_admin on public.user_roles for all to authenticated using (
  ipnc_private.actor_has_role('admin')
) with check (ipnc_private.actor_has_role('admin'));
grant select on public.settings, public.societies to anon;
create policy ipnc_pix on public.settings for select to anon, authenticated using (
  key = any(array['pix_key','pix_key_type','pix_beneficiary','pix_instructions'])
);
create policy ipnc_settings_admin on public.settings for all to authenticated using (
  ipnc_private.actor_has_role('admin')
) with check (ipnc_private.actor_has_role('admin'));
create policy ipnc_societies_public on public.societies for select to anon using (active);
create policy ipnc_societies_read on public.societies for select to authenticated using ((select ipnc_private.actor_active()));
create policy ipnc_societies_admin on public.societies for all to authenticated using (
  ipnc_private.actor_has_role('admin')
) with check (ipnc_private.actor_has_role('admin'));

-- IMPORTANT: unscoped legacy gastos/root/category objects are admin/pastor-only
-- in this conservative proposal. Before restoring their society access, create
-- a trusted private immutable object->society mapping from the migration snapshot.
-- Never infer legacy scope by looking at mutable receipt_url fields at read time:
-- a manager could point their own row at somebody else's known receipt path.
create or replace function ipnc_private.can_manage_receipt(object_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(ipnc_private.actor_has_role('admin') or (
    ipnc_private.actor_has_role('diretoria') and (
      split_part(object_name,'/',1) = ipnc_private.actor_society()::text
      or (split_part(object_name,'/',1) = 'elections' and exists(select 1 from public.elections e where e.id::text = split_part(object_name,'/',2) and ipnc_private.can_manage_election(e.id)))
    )
  ),false);
$$;

create or replace function ipnc_private.own_member_receipt_path(object_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select ipnc_private.actor_active() and split_part(object_name,'/',3) = 'member-submissions'
    and split_part(object_name,'/',2) ~ '^[0-9]{4}$'
    and exists(select 1 from public.members m where m.user_id = (select auth.uid()) and m.active
      and m.id::text = split_part(object_name,'/',4)
      and m.society_id::text = split_part(object_name,'/',1));
$$;

revoke all on function ipnc_private.can_manage_receipt(text), ipnc_private.own_member_receipt_path(text) from public, anon;
grant execute on function ipnc_private.can_manage_receipt(text), ipnc_private.own_member_receipt_path(text) to authenticated, service_role;

create policy ipnc_receipts_read on storage.objects for select to authenticated using (
  bucket_id = 'receipts' and (ipnc_private.can_manage_receipt(name)
    or ipnc_private.actor_has_role('pastor') or ipnc_private.own_member_receipt_path(name))
);
create policy ipnc_receipts_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'receipts' and name !~ '(^|/)\.\.(/|$)' and name !~ '^/'
  and split_part(name,'/',2) ~ '^[0-9]{4}$' and array_length(string_to_array(name,'/'),1) >= 4
  and (
    (exists(select 1 from public.societies s where s.id::text = split_part(name,'/',1) and ipnc_private.can_manage_society(s.id)))
    or ipnc_private.own_member_receipt_path(name)
  )
);
create policy ipnc_receipts_update on storage.objects for update to authenticated using (
  bucket_id = 'receipts' and ipnc_private.can_manage_receipt(name)
) with check (
  bucket_id = 'receipts' and ipnc_private.can_manage_receipt(name)
);
create policy ipnc_receipts_delete on storage.objects for delete to authenticated using (
  bucket_id = 'receipts' and ipnc_private.can_manage_receipt(name)
);

create policy ipnc_election_photos_read on storage.objects for select to anon, authenticated using (bucket_id = 'election-photos');
create policy ipnc_election_photos_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'election-photos' and exists(select 1 from public.elections e where e.id::text = split_part(name,'/',1) and ipnc_private.can_manage_election(e.id))
);
create policy ipnc_election_photos_update on storage.objects for update to authenticated using (
  bucket_id = 'election-photos' and exists(select 1 from public.elections e where e.id::text = split_part(name,'/',1) and ipnc_private.can_manage_election(e.id))
) with check (
  bucket_id = 'election-photos' and exists(select 1 from public.elections e where e.id::text = split_part(name,'/',1) and ipnc_private.can_manage_election(e.id))
);
create policy ipnc_election_photos_delete on storage.objects for delete to authenticated using (
  bucket_id = 'election-photos' and exists(select 1 from public.elections e where e.id::text = split_part(name,'/',1) and ipnc_private.can_manage_election(e.id))
);

-- Application RPCs remain ungranted. Add only reviewed signatures in a separate
-- migration after active actor, NULL and society checks are tested. Keep the
-- service-only consume_ipnc_limits grant installed by the earlier migration.
commit;
