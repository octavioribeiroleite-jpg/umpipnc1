begin;
-- Bind the internal directory call when defining the function. Anonymous users
-- may execute this narrow name-only endpoint without USAGE on the private schema.
create or replace function public.treasury_directory() returns jsonb
language sql stable security invoker set search_path=''
return ipnc_private.treasury_directory();
notify pgrst, 'reload schema';
commit;
