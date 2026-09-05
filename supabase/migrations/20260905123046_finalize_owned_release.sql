-- Owned deployment: atomic onboarding and scheduled reminders, no external gateway.
create or replace function public.finalize_ipnc_account(p_user_id uuid, p_username text, p_role public.app_role, p_society_id uuid, p_member_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_member_id is not null then
    perform 1 from public.members where id=p_member_id and society_id=p_society_id and user_id is null and active for update;
    if not found then raise exception 'Member already linked or outside scope'; end if;
  end if;
  update public.profiles set username=p_username,society_id=p_society_id where user_id=p_user_id;
  if not found then raise exception 'Profile missing'; end if;
  insert into public.user_roles(user_id,role) values(p_user_id,p_role) on conflict(user_id,role) do nothing;
  if p_member_id is not null then
    update public.members set user_id=p_user_id where id=p_member_id;
  end if;
end $$;
revoke all on function public.finalize_ipnc_account(uuid,text,public.app_role,uuid,uuid) from public,anon,authenticated;
grant execute on function public.finalize_ipnc_account(uuid,text,public.app_role,uuid,uuid) to service_role;

create extension if not exists pg_cron with schema pg_catalog;
create unique index if not exists ipnc_birthday_notification_day_kind on public.notificacoes_aniversarios(tipo,referencia_data);

create or replace function public.generate_ipnc_birthday_reminders()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  today_brt date := (now() at time zone 'America/Sao_Paulo')::date;
  added integer := 0;
  inserted integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('ipnc-birthday-reminders'));
  insert into public.notificacoes_aniversarios(titulo,mensagem,tipo,referencia_data,payload)
  select '🎉 Aniversário de hoje',
    case when count(*)=1 then 'Hoje é aniversário de ' else 'Hoje é aniversário de: ' end || string_agg(nome, ', ' order by nome) || '.',
    'diario',today_brt,jsonb_build_object('ids',jsonb_agg(id order by nome))
  from public.aniversariantes
  where ativo and dia=extract(day from today_brt) and mes=extract(month from today_brt)
  having count(*)>0
  on conflict(tipo,referencia_data) do nothing;
  get diagnostics inserted = row_count;
  added := added + inserted;

  if extract(isodow from today_brt)=1 then
    insert into public.notificacoes_aniversarios(titulo,mensagem,tipo,referencia_data,payload)
    select '🎂 Aniversariantes da semana',
      string_agg(to_char(today_brt+d.n,'DD/MM') || ' — ' || a.nome,E'\n' order by d.n,a.nome),
      'semanal',today_brt,jsonb_build_object('ids',jsonb_agg(a.id order by d.n,a.nome))
    from generate_series(1,7) as d(n)
    join public.aniversariantes a on a.ativo
      and a.dia=extract(day from today_brt+d.n) and a.mes=extract(month from today_brt+d.n)
    having count(*)>0
    on conflict(tipo,referencia_data) do nothing;
    get diagnostics inserted = row_count;
    added := added + inserted;
  end if;
  return added;
end $$;
revoke all on function public.generate_ipnc_birthday_reminders() from public,anon,authenticated;
grant execute on function public.generate_ipnc_birthday_reminders() to service_role;
-- Same daily schedule as the source: 11:00 UTC / 08:00 São Paulo.
select cron.schedule('birthday-reminders-daily','0 11 * * *','select public.generate_ipnc_birthday_reminders();');
