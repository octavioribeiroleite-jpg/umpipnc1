-- Database integration assertions, to be run AFTER schema.sql in an isolated
-- Supabase development/test database, as postgres. No pgTAP dependency.
-- With psql: psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f docs/treasury/verify.sql
-- All fixture users, profiles, roles, funds and entries roll back. An assertion
-- failure aborts the transaction; never replace ROLLBACK with COMMIT.
begin;

create function pg_temp.treasury_assert(ok boolean, message text) returns void
language plpgsql as $$ begin
  if ok is distinct from true then raise exception 'TREASURY TEST: %', message; end if;
end $$;
create function pg_temp.treasury_expect_error(statement text, wanted text) returns void
language plpgsql as $$
declare actual text;
begin
  begin
    execute statement;
  exception when others then
    get stacked diagnostics actual = returned_sqlstate;
    if actual = wanted then return; end if;
    raise exception 'Expected SQLSTATE %, received % for %', wanted, actual, statement;
  end;
  raise exception 'Expected SQLSTATE %, statement succeeded: %', wanted, statement;
end $$;

create temp table treasury_test_ids (name text primary key, id uuid not null);
insert into treasury_test_ids(name,id) select name, gen_random_uuid() from unnest(array[
  'admin','member','inactive','fund','bulk','empty','income','expense','backdated','later-expense','later-income'
]) name;
grant select on treasury_test_ids to anon, authenticated;
insert into auth.users(id, aud, role, email, raw_user_meta_data)
select id, 'authenticated', 'authenticated', 'treasury-test-' || id || '@example.invalid',
  jsonb_build_object('full_name', 'Treasury test ' || name, 'username', 'treasury-test-' || id)
from treasury_test_ids where name in ('admin','member','inactive');
insert into public.profiles(user_id,full_name,email,username,active)
select id, 'Treasury test ' || name, 'treasury-test-' || id || '@example.invalid', 'treasury-test-' || id, name <> 'inactive'
from treasury_test_ids where name in ('admin','member','inactive')
on conflict (user_id) do update set active = excluded.active;
insert into public.user_roles(user_id,role)
select id, case when name = 'member' then 'visualizador'::public.app_role else 'admin'::public.app_role end
from treasury_test_ids where name in ('admin','member','inactive')
on conflict (user_id,role) do nothing;

select pg_temp.treasury_assert(
  (select bool_and(relrowsecurity) from pg_class where oid in ('public.treasury_funds'::regclass,'public.treasury_entries'::regclass)),
  'RLS enabled on both public tables');
select pg_temp.treasury_assert(
  not exists (select 1 from pg_proc where oid in ('public.treasury_dashboard()'::regprocedure,
    'public.treasury_statement(uuid,text,text,date,date,integer,integer)'::regprocedure) and prosecdef),
  'Read RPCs must use invoker permissions');
select pg_temp.treasury_assert(not has_table_privilege('anon','public.transactions','SELECT'),
  'Legacy private financial table remains inaccessible anonymously');
select pg_temp.treasury_assert(not has_table_privilege('authenticated','public.treasury_entries','DELETE'),
  'Even authenticated clients have no DELETE grant');

-- The same normal authenticated role used by the browser, with an active admin.
set local role authenticated;
select set_config('request.jwt.claim.sub', (select id::text from treasury_test_ids where name='admin'), true);
select set_config('request.jwt.claims', jsonb_build_object('sub',(select id from treasury_test_ids where name='admin'),'role','authenticated')::text, true);
insert into public.treasury_funds(id,name,abbreviation,color)
select id, 'Test ' || name, 'T' || substr(id::text,1,8), '#167765' from treasury_test_ids where name in ('fund','bulk','empty');
update public.treasury_funds set name='Sociedade teste editada',color='#5373B8'
where id=(select id from treasury_test_ids where name='fund');
select pg_temp.treasury_assert((select name='Sociedade teste editada' and color='#5373B8' from public.treasury_funds
  where id=(select id from treasury_test_ids where name='fund')), 'Active admin may update society details');
insert into public.treasury_entries(id,fund_id,kind,amount_cents,occurred_on,person_name,description)
select e.id,f.id,'income',10010,'2020-01-10','Pessoa teste','Entrada inicial'
from treasury_test_ids e cross join treasury_test_ids f where e.name='income' and f.name='fund';
insert into public.treasury_entries(id,fund_id,kind,amount_cents,occurred_on,person_name,description)
select e.id,f.id,'expense',9,'2020-01-10','Pessoa teste','Saída no mesmo dia'
from treasury_test_ids e cross join treasury_test_ids f where e.name='expense' and f.name='fund';
-- Recorded later, but dated before the first two rows.
insert into public.treasury_entries(id,fund_id,kind,amount_cents,occurred_on,person_name,description)
select e.id,f.id,'income',1,'2020-01-09','Pessoa teste','Centavo retroativo 100%'
from treasury_test_ids e cross join treasury_test_ids f where e.name='backdated' and f.name='fund';
insert into public.treasury_entries(id,fund_id,kind,amount_cents,occurred_on,person_name,description)
select e.id,f.id,'expense',10000,'2020-01-12','Pessoa teste','Saída maior'
from treasury_test_ids e cross join treasury_test_ids f where e.name='later-expense' and f.name='fund';
insert into public.treasury_entries(id,fund_id,kind,amount_cents,occurred_on,person_name,description)
select e.id,f.id,'income',27,'2020-01-12','Pessoa teste','Última entrada'
from treasury_test_ids e cross join treasury_test_ids f where e.name='later-income' and f.name='fund';
insert into public.treasury_entries(fund_id,kind,amount_cents,occurred_on,person_name,description)
select f.id,'income',1,(current_timestamp at time zone 'America/Sao_Paulo')::date,'Pessoa teste','Centavo ' || n
from treasury_test_ids f cross join generate_series(1,1005) n where f.name='bulk';

-- Exact integer-cent totals, >1,000 records, true empty fund and six chart bins.
select pg_temp.treasury_assert((
  select (f->>'income_cents')::bigint=10038 and (f->>'expense_cents')::bigint=10009
    and (f->>'balance_cents')::bigint=29 and (f->>'entry_count')::int=5
  from jsonb_array_elements(public.treasury_dashboard()->'funds') f
  where f->>'id'=(select id::text from treasury_test_ids where name='fund')
), 'Cent totals cover every historical entry, including backdated rows');
select pg_temp.treasury_assert((
  select (f->>'balance_cents')::bigint=1005 and (f->>'entry_count')::int=1005
  from jsonb_array_elements(public.treasury_dashboard()->'funds') f
  where f->>'id'=(select id::text from treasury_test_ids where name='bulk')
), 'Dashboard is not truncated by PostgREST row limits');
select pg_temp.treasury_assert((
  select (f->>'balance_cents')::bigint=0 and (f->>'entry_count')::int=0
  from jsonb_array_elements(public.treasury_dashboard()->'funds') f
  where f->>'id'=(select id::text from treasury_test_ids where name='empty')
), 'Empty society has a real zero derived from no entries');
select pg_temp.treasury_assert(jsonb_array_length(public.treasury_dashboard()->'months')=6,'Six chronological chart months');

select pg_temp.treasury_assert((
  select (s->>'total_count')::int=1005 and (s->>'income_cents')::int=1005 and jsonb_array_length(s->'entries')=5
  from (select public.treasury_statement(p_fund_id=>(select id from treasury_test_ids where name='bulk'), p_offset=>1000) s) q
), 'Statement pagination retains total count and totals beyond 1,000');
select pg_temp.treasury_assert((
  select (s->'entries'->0->>'balance_after_cents')::bigint=10002
    and (s->>'total_count')::int=1 and (s->>'expense_cents')::int=9
  from (select public.treasury_statement(p_fund_id=>(select id from treasury_test_ids where name='fund'),
    p_kind=>'expense',p_start=>'2020-01-10',p_end=>'2020-01-10') s) q
), 'Filtered expense includes earlier income in its running balance');
select pg_temp.treasury_assert((
  select s->'entries'->0->>'id'=(select id::text from treasury_test_ids where name='later-income')
    and s->'entries'->1->>'id'=(select id::text from treasury_test_ids where name='later-expense')
    and (s->'entries'->0->>'balance_after_cents')::bigint=29
    and (s->'entries'->1->>'balance_after_cents')::bigint=2
  from (select public.treasury_statement(p_fund_id=>(select id from treasury_test_ids where name='fund')) s) q
), 'Stable descending display and ascending running balance for same-day entries');
select pg_temp.treasury_assert((public.treasury_statement(
  p_fund_id=>(select id from treasury_test_ids where name='fund'),p_search=>'%')->>'total_count')::int=1,
  'Search treats percent as literal text rather than an unrestricted wildcard');
select pg_temp.treasury_expect_error('select public.treasury_statement(p_kind => ''wrong'')','22023');
select pg_temp.treasury_expect_error('select public.treasury_statement(p_limit => 1000)','22023');
select pg_temp.treasury_expect_error('select public.treasury_statement(p_offset => -1)','22023');
select pg_temp.treasury_expect_error('select public.treasury_statement(p_start => ''2020-01-02'',p_end => ''2020-01-01'')','22023');

-- Idempotency: same UUID cannot create another movement or change the first.
select pg_temp.treasury_expect_error($q$
  insert into public.treasury_entries(id,fund_id,kind,amount_cents,occurred_on,person_name,description)
  select id,fund_id,kind,amount_cents,occurred_on,person_name,description from public.treasury_entries
  where id=(select id from treasury_test_ids where name='income')
$q$,'23505');
select pg_temp.treasury_expect_error($q$
  update public.treasury_entries set amount_cents=2,revision=99 where id=(select id from treasury_test_ids where name='income')
$q$,'40001');
select pg_temp.treasury_expect_error($q$
  update public.treasury_entries set amount_cents=2 where id=(select id from treasury_test_ids where name='income')
$q$,'40001');
select pg_temp.treasury_expect_error($q$
  update public.treasury_entries set created_at=now() where id=(select id from treasury_test_ids where name='income')
$q$,'42501');
select pg_temp.treasury_expect_error($q$
  update public.treasury_entries set id=gen_random_uuid() where id=(select id from treasury_test_ids where name='income')
$q$,'42501');
update public.treasury_entries set amount_cents=10020,revision=2
where id=(select id from treasury_test_ids where name='income') and revision=1;
-- A second editor still holding revision=1 cannot overwrite the correction.
update public.treasury_entries set amount_cents=999,revision=2
where id=(select id from treasury_test_ids where name='income') and revision=1;
select pg_temp.treasury_assert((select amount_cents=10020 and revision=2 from public.treasury_entries
  where id=(select id from treasury_test_ids where name='income')), 'A stale edit cannot overwrite a newer revision');

select pg_temp.treasury_expect_error($q$
  insert into public.treasury_entries(fund_id,kind,amount_cents,occurred_on,person_name,description)
  select id,'income',0,'2020-01-01','Teste','Inválido' from treasury_test_ids where name='fund'
$q$,'23514');
select pg_temp.treasury_expect_error($q$
  insert into public.treasury_entries(fund_id,kind,amount_cents,occurred_on,person_name,description)
  select id,'expense',-1,'2020-01-01','Teste','Inválido' from treasury_test_ids where name='fund'
$q$,'23514');
select pg_temp.treasury_expect_error($q$
  insert into public.treasury_entries(fund_id,kind,amount_cents,occurred_on,person_name,description)
  select id,'income',1000000000000,'2020-01-01','Teste','Inválido' from treasury_test_ids where name='fund'
$q$,'23514');
select pg_temp.treasury_expect_error($q$
  insert into public.treasury_entries(fund_id,kind,amount_cents,occurred_on,person_name,description)
  select id,'income',1,((current_timestamp at time zone 'America/Sao_Paulo')::date+1),'Teste','Inválido' from treasury_test_ids where name='fund'
$q$,'23514');
select pg_temp.treasury_expect_error($q$
  insert into public.treasury_entries(fund_id,kind,amount_cents,occurred_on,person_name,description)
  select id,'income',1,'2020-01-01','   ','Inválido' from treasury_test_ids where name='fund'
$q$,'23514');
select pg_temp.treasury_expect_error($q$
  insert into public.treasury_entries(fund_id,kind,amount_cents,occurred_on,person_name,description)
  select id,'income',1,'2020-01-01','Teste',repeat('x',501) from treasury_test_ids where name='fund'
$q$,'23514');
select pg_temp.treasury_expect_error('delete from public.treasury_entries','42501');
select pg_temp.treasury_expect_error('delete from public.treasury_funds','42501');

-- Ordinary authenticated visitor: can view every society, cannot write.
select set_config('request.jwt.claim.sub',(select id::text from treasury_test_ids where name='member'),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',(select id from treasury_test_ids where name='member'),'role','authenticated')::text,true);
select pg_temp.treasury_assert((select count(*) from public.treasury_entries
  where fund_id=(select id from treasury_test_ids where name='fund'))=5,'Non-admin can read another society');
select pg_temp.treasury_expect_error($q$
  insert into public.treasury_entries(fund_id,kind,amount_cents,occurred_on,person_name,description)
  select id,'income',1,'2020-01-01','Teste','Ataque' from treasury_test_ids where name='fund'
$q$,'42501');
select pg_temp.treasury_expect_error('insert into public.treasury_funds(name,abbreviation) values (''Ataque'',''ATK'')','42501');
update public.treasury_funds set name='Ataque' where id=(select id from treasury_test_ids where name='fund');
select pg_temp.treasury_assert((select name='Sociedade teste editada' from public.treasury_funds
  where id=(select id from treasury_test_ids where name='fund')), 'Non-admin cannot update society details');
update public.treasury_entries set amount_cents=999,revision=3 where id=(select id from treasury_test_ids where name='income');
select pg_temp.treasury_assert((select amount_cents=10020 and revision=2 from public.treasury_entries
  where id=(select id from treasury_test_ids where name='income')), 'Non-admin UPDATE changes zero rows');

-- An admin role on an inactive profile is insufficient authorization.
select set_config('request.jwt.claim.sub',(select id::text from treasury_test_ids where name='inactive'),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',(select id from treasury_test_ids where name='inactive'),'role','authenticated')::text,true);
select pg_temp.treasury_expect_error($q$
  insert into public.treasury_entries(fund_id,kind,amount_cents,occurred_on,person_name,description)
  select id,'income',1,'2020-01-01','Teste','Ataque inativo' from treasury_test_ids where name='fund'
$q$,'42501');
select pg_temp.treasury_expect_error('insert into public.treasury_funds(name,abbreviation) values (''Ataque inativo'',''ATK'')','42501');
update public.treasury_funds set name='Ataque inativo' where id=(select id from treasury_test_ids where name='fund');
select pg_temp.treasury_assert((select name='Sociedade teste editada' from public.treasury_funds
  where id=(select id from treasury_test_ids where name='fund')), 'Inactive admin cannot update society details');
update public.treasury_entries set amount_cents=999,revision=3 where id=(select id from treasury_test_ids where name='income');
select pg_temp.treasury_assert((select amount_cents=10020 and revision=2 from public.treasury_entries
  where id=(select id from treasury_test_ids where name='income')), 'Inactive admin UPDATE changes zero rows');

reset role;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claims','{"role":"anon"}',true);
select pg_temp.treasury_assert(jsonb_array_length(public.treasury_dashboard()->'funds')>=7,'Visitor dashboard requires no login');
select pg_temp.treasury_assert((public.treasury_statement(p_fund_id=>(select id from treasury_test_ids where name='fund'))->>'total_count')::int=5,
  'Anonymous visitor reads the society statement');
select pg_temp.treasury_expect_error($q$
  insert into public.treasury_entries(fund_id,kind,amount_cents,occurred_on,person_name,description)
  select id,'income',1,'2020-01-01','Teste','Ataque anônimo' from treasury_test_ids where name='fund'
$q$,'42501');
select pg_temp.treasury_expect_error('update public.treasury_entries set description=''Ataque''','42501');
select pg_temp.treasury_expect_error('delete from public.treasury_entries','42501');
select pg_temp.treasury_expect_error('insert into public.treasury_funds(name,abbreviation) values (''Ataque'',''ATK'')','42501');
select pg_temp.treasury_expect_error('update public.treasury_funds set name=''Ataque''','42501');
select pg_temp.treasury_expect_error('delete from public.treasury_funds','42501');
reset role;
rollback;
-- A successful run ends with ROLLBACK and no exception.
