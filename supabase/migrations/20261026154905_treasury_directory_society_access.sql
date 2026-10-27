begin;

-- Use the authenticated profile and existing revocable Diretoria guard. No URL,
-- operator title, user_metadata, or client-selected society grants access.
create function ipnc_private.treasury_directory_fund() returns uuid
language sql stable security definer set search_path='' as $$
 select f.id from public.profiles p
 join public.societies s on s.id=p.society_id and s.active
 join public.treasury_funds f on lower(btrim(f.abbreviation))=s.slug
 where p.user_id=auth.uid() and p.active
 and ipnc_private.actor_has_role('diretoria')
 limit 1;
$$;
revoke all on function ipnc_private.treasury_directory_fund() from public,anon,authenticated;
grant execute on function ipnc_private.treasury_directory_fund() to authenticated;

create or replace function ipnc_private.treasury_manages(wanted uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and coalesce((wanted=ipnc_private.treasury_session_fund() or
 (ipnc_private.actor_active() and exists(select 1 from public.treasury_managers where user_id=auth.uid() and fund_id=wanted)) or
 wanted=ipnc_private.treasury_directory_fund()),false);
$$;

create or replace function public.treasury_access() returns jsonb
language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('admin',ipnc_private.actor_has_role('admin'),
 'directory_fund_id',ipnc_private.treasury_directory_fund(),'fund_ids',
 coalesce((select jsonb_agg(id) from public.treasury_funds where ipnc_private.treasury_manages(id)),'[]'::jsonb));
$$;

commit;
