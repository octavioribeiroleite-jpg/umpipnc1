-- EBD's 15-minute PIN confirmation belongs to one Auth session. A warm login
-- refreshes metadata on the shared portal account, never another session's age.
-- Read Auth's existing session registry; do not change its records or grants.
begin;

do $$
declare function_owner oid; session_registry regclass := to_regclass('auth.sessions');
begin
  if session_registry is null then
    raise exception 'EBD expiry requires the compatible Auth session registry';
  end if;
  if (
    select count(*) from pg_attribute
    where attrelid = session_registry and not attisdropped
      and ((attname in ('id', 'user_id') and atttypid = 'uuid'::regtype)
        or (attname = 'created_at' and atttypid = 'timestamptz'::regtype))
  ) <> 3 then
    raise exception 'EBD expiry requires the compatible Auth session registry';
  end if;
  select proowner into function_owner from pg_proc
    where oid = 'ipnc_private.portal_valid(text)'::regprocedure;
  if not coalesce(has_table_privilege(function_owner, session_registry, 'SELECT'), false) then
    raise exception 'EBD expiry requires the existing guard owner to read Auth sessions';
  end if;
end;
$$;

create or replace function ipnc_private.portal_valid(wanted text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare c jsonb := auth.jwt()->'app_metadata'->'ipnc_portal'; secret_value text;
begin
  if auth.uid() is null or c is null or c->>'namespace' <> wanted then return false; end if;
  if wanted = 'ebd' then
    -- session_id survives token refresh; created_at is set by Auth at sign-in.
    -- Bind both keys so a session belonging to another user cannot be reused.
    if not exists (
      select 1 from auth.sessions s
      where s.id = (auth.jwt()->>'session_id')::uuid and s.user_id = auth.uid()
        and s.created_at > now() - interval '15 minutes'
        and s.created_at <= now() + interval '30 seconds'
    ) then return false; end if;
    if c->>'id' = 'admin' then
      select value into secret_value from public.settings where key = 'secretaria_admin_password';
    else
      select p.pin_hash into secret_value from public.ebd_class_passwords p
        join public.ebd_classes t on t.id = p.class_id and t.active
        where p.class_id::text = c->>'id' and p.active;
    end if;
  elsif wanted = 'diretoria' then
    if coalesce(c->>'id', '') !~ '^[a-z0-9-]{1,40}$' or c->>'id' = 'geral' then return false; end if;
    if c->>'id' = 'pastor' then
      if not exists(select 1 from public.profiles where user_id = auth.uid() and active and society_id is null) then return false; end if;
    elsif not exists(
      select 1 from public.societies s
      join public.profiles p on p.society_id = s.id
      where s.slug = c->>'id' and s.active and p.user_id = auth.uid() and p.active
    ) then return false;
    end if;
    select value into secret_value from public.settings where key = 'diretoria_pin_' || (c->>'id');
    if coalesce(secret_value, '') !~ '^[0-9]{6}$' then return false; end if;
  else return false;
  end if;
  return coalesce(secret_value <> '' and c->>'fingerprint' = encode(extensions.digest('IPNC:PIN:v1:' || secret_value, 'sha256'), 'hex'), false)
    and exists(select 1 from public.profiles where user_id = auth.uid() and active);
exception when others then return false;
end;
$$;

commit;
