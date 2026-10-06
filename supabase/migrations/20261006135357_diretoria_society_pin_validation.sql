-- Change only the Diretoria credential lookup. Existing EBD checks, function
-- owner/ACL and callers remain intact; no settings or personal accounts change.
create or replace function ipnc_private.portal_valid(wanted text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare c jsonb := auth.jwt()->'app_metadata'->'ipnc_portal'; secret_value text;
begin
  if auth.uid() is null or c is null or c->>'namespace' <> wanted then return false; end if;
  if wanted = 'ebd' then
    if not coalesce((c->>'issued_at')::bigint between extract(epoch from now())::bigint - 900 and extract(epoch from now())::bigint + 30, false) then return false; end if;
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
