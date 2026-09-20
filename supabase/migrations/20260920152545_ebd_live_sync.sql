-- Keep access restricted to the existing PIN-backed EBD sessions.
create table public.ebd_call_status (
  class_id uuid not null references public.ebd_classes(id) on delete cascade,
  date date not null,
  status text not null check (status in ('aberta', 'finalizada')),
  changed_by text not null,
  primary key (class_id, date)
);
alter table public.ebd_call_status enable row level security;
revoke all on public.ebd_call_status from anon;
grant select, insert, update, delete on public.ebd_call_status to authenticated;
create policy ebd_call_admin on public.ebd_call_status for all to authenticated
  using (public.ebd_is_admin()) with check (public.ebd_is_admin());
create policy ebd_call_read on public.ebd_call_status for select to authenticated
  using (ipnc_private.ebd_class_allowed(class_id));
create policy ebd_call_insert on public.ebd_call_status for insert to authenticated
  with check (ipnc_private.ebd_class_allowed(class_id) and date = (now() at time zone 'America/Sao_Paulo')::date);
create policy ebd_call_update on public.ebd_call_status for update to authenticated
  using (ipnc_private.ebd_class_allowed(class_id) and date = (now() at time zone 'America/Sao_Paulo')::date)
  with check (ipnc_private.ebd_class_allowed(class_id) and date = (now() at time zone 'America/Sao_Paulo')::date);
create trigger ipnc_guard_day before insert or update or delete on public.ebd_call_status
  for each row execute function ipnc_private.guard_ebd_day();

-- Realtime still evaluates SELECT RLS for each subscribed session.
do $$ declare t text; begin
  foreach t in array array['ebd_students','ebd_classes','ebd_attendance','ebd_class_visitor_entries','ebd_day_closures','ebd_call_status'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
