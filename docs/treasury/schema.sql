-- Applied to Renovo IPNC xhhfgnkpgtnzlvpvqjpl on 2026-09-28.
-- Remote-generated migration version: 20260928151725_public_treasury.
-- Review copy. Do not reapply to a database containing these tables.
-- No existing financial tables, privileges or data are changed.
begin;

do $$ begin
  if to_regprocedure('ipnc_private.actor_has_role(public.app_role)') is null then
    raise exception 'Missing active administrator authorization helper';
  end if;
end $$;

create table public.treasury_funds (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 100),
  abbreviation text not null check (char_length(btrim(abbreviation)) between 1 and 12),
  color text not null default '#167765' check (color ~ '^#[0-9a-fA-F]{6}$'),
  created_at timestamptz not null default now()
);
create unique index treasury_funds_abbreviation_unique on public.treasury_funds (lower(btrim(abbreviation)));

create table public.treasury_entries (
  -- The client retains this UUID while retrying a request: never blind upsert.
  id uuid primary key default gen_random_uuid(),
  fund_id uuid not null references public.treasury_funds(id) on delete restrict,
  kind text not null check (kind in ('income', 'expense')),
  amount_cents bigint not null check (amount_cents between 1 and 999999999999),
  occurred_on date not null check (occurred_on >= date '1900-01-01'),
  person_name text not null check (char_length(btrim(person_name)) between 1 and 120),
  description text not null check (char_length(btrim(description)) between 1 and 500),
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp()
);
create index treasury_entries_fund_date on public.treasury_entries (fund_id, occurred_on, created_at, id);
create index treasury_entries_date on public.treasury_entries (occurred_on, created_at, id);

-- Prevent clients from forging ordering or revision metadata. A correction must
-- send revision+1 and use an id AND revision predicate; otherwise it conflicts.
create function ipnc_private.treasury_entry_guard() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.occurred_on > (current_timestamp at time zone 'America/Sao_Paulo')::date then
    raise exception using errcode = '23514', message = 'A data do lançamento não pode estar no futuro.';
  end if;
  if tg_op = 'INSERT' then
    if new.revision <> 1 then
      raise exception using errcode = '23514', message = 'Revisão inicial inválida.';
    end if;
    new.created_at := clock_timestamp();
  else
    if new.id is distinct from old.id or new.created_at is distinct from old.created_at then
      raise exception using errcode = '23514', message = 'Identificação e criação do lançamento são imutáveis.';
    end if;
    if new.revision is distinct from old.revision + 1 then
      raise exception using errcode = '40001', message = 'Lançamento alterado. Atualize o extrato antes de salvar.';
    end if;
  end if;
  new.person_name := btrim(new.person_name);
  new.description := btrim(new.description);
  new.updated_at := clock_timestamp();
  return new;
end;
$$;
revoke all on function ipnc_private.treasury_entry_guard() from public, anon, authenticated;
create trigger treasury_entry_guard before insert or update on public.treasury_entries
for each row execute function ipnc_private.treasury_entry_guard();

alter table public.treasury_funds enable row level security;
alter table public.treasury_entries enable row level security;
revoke all on public.treasury_funds, public.treasury_entries from public, anon, authenticated;
grant select on public.treasury_funds, public.treasury_entries to anon, authenticated;
grant insert (id, name, abbreviation, color), update (name, abbreviation, color)
  on public.treasury_funds to authenticated;
grant insert (id, fund_id, kind, amount_cents, occurred_on, person_name, description),
  update (fund_id, kind, amount_cents, occurred_on, person_name, description, revision)
  on public.treasury_entries to authenticated;
-- No DELETE/TRUNCATE grant or DELETE policy, even for an administrator.
create policy treasury_funds_public_read on public.treasury_funds for select to anon, authenticated using (true);
create policy treasury_funds_admin_insert on public.treasury_funds for insert to authenticated
  with check ((select ipnc_private.actor_has_role('admin')));
create policy treasury_funds_admin_update on public.treasury_funds for update to authenticated
  using ((select ipnc_private.actor_has_role('admin')))
  with check ((select ipnc_private.actor_has_role('admin')));
create policy treasury_entries_public_read on public.treasury_entries for select to anon, authenticated using (true);
create policy treasury_entries_admin_insert on public.treasury_entries for insert to authenticated
  with check ((select ipnc_private.actor_has_role('admin')));
create policy treasury_entries_admin_update on public.treasury_entries for update to authenticated
  using ((select ipnc_private.actor_has_role('admin')))
  with check ((select ipnc_private.actor_has_role('admin')));

-- Only society labels are seeded. There are no opening balances or examples.
insert into public.treasury_funds (name, abbreviation, color) values
  ('União de Mocidade Presbiteriana', 'UMP', '#5373B8'),
  ('Sociedade Auxiliadora Feminina', 'SAF', '#B87851'),
  ('União Presbiteriana de Homens', 'UPH', '#167765'),
  ('União Presbiteriana de Adolescentes', 'UPA', '#8F70B8');

create function public.treasury_dashboard() returns jsonb
language sql stable security invoker set search_path = '' as $$
  with fund_totals as (
    select f.id, f.name, f.abbreviation, f.color,
      coalesce(sum(e.amount_cents) filter (where e.kind = 'income'), 0) as income_cents,
      coalesce(sum(e.amount_cents) filter (where e.kind = 'expense'), 0) as expense_cents,
      count(e.id) as entry_count
    from public.treasury_funds f left join public.treasury_entries e on e.fund_id = f.id
    group by f.id
  ), funds as (
    select *, income_cents - expense_cents as balance_cents from fund_totals
  ), months as (
    select generate_series(
      date_trunc('month', current_timestamp at time zone 'America/Sao_Paulo') - interval '5 months',
      date_trunc('month', current_timestamp at time zone 'America/Sao_Paulo'), interval '1 month'
    )::date as month
  ), monthly as (
    select to_char(m.month, 'YYYY-MM') as month,
      coalesce(sum(e.amount_cents) filter (where e.kind = 'income'), 0) as income_cents,
      coalesce(sum(e.amount_cents) filter (where e.kind = 'expense'), 0) as expense_cents
    from months m left join public.treasury_entries e
      on e.occurred_on >= m.month and e.occurred_on < m.month + interval '1 month'
    group by m.month
  )
  select jsonb_build_object(
    'funds', coalesce((select jsonb_agg(to_jsonb(f) order by f.abbreviation) from funds f), '[]'::jsonb),
    'totals', (select jsonb_build_object(
      'income_cents', coalesce(sum(income_cents), 0),
      'expense_cents', coalesce(sum(expense_cents), 0),
      'balance_cents', coalesce(sum(balance_cents), 0),
      'entry_count', coalesce(sum(entry_count), 0)) from funds),
    'months', (select jsonb_agg(to_jsonb(m) order by m.month) from monthly m)
  );
$$;

create function public.treasury_statement(
  p_fund_id uuid default null,
  p_kind text default null,
  p_search text default null,
  p_start date default null,
  p_end date default null,
  p_offset integer default 0,
  p_limit integer default 20
) returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
begin
  if p_kind is not null and p_kind not in ('income', 'expense') then
    raise exception using errcode = '22023', message = 'Tipo de lançamento inválido.';
  end if;
  if p_offset is null or p_offset < 0 or p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception using errcode = '22023', message = 'Paginação inválida.';
  end if;
  if char_length(p_search) > 120 or p_start > p_end then
    raise exception using errcode = '22023', message = 'Filtros inválidos.';
  end if;
  return (
    -- Running balances must be calculated BEFORE filters or pagination. The
    -- same deterministic ordering is used in both directions for date ties.
    with ledger as materialized (
      select e.*, sum(case when e.kind = 'income' then e.amount_cents else -e.amount_cents end)
        over (partition by e.fund_id order by e.occurred_on, e.created_at, e.id
          rows between unbounded preceding and current row) as balance_after_cents
      from public.treasury_entries e
      where p_fund_id is null or e.fund_id = p_fund_id
    ), filtered as materialized (
      select * from ledger l where
        (p_kind is null or l.kind = p_kind)
        and (p_start is null or l.occurred_on >= p_start)
        and (p_end is null or l.occurred_on <= p_end)
        and (coalesce(btrim(p_search), '') = '' or
          strpos(lower(l.person_name || ' ' || l.description), lower(btrim(p_search))) > 0)
    ), page as (
      select * from filtered order by occurred_on desc, created_at desc, id desc
      offset p_offset limit p_limit
    )
    select jsonb_build_object(
      'entries', coalesce((select jsonb_agg(to_jsonb(p) order by p.occurred_on desc, p.created_at desc, p.id desc) from page p), '[]'::jsonb),
      'total_count', (select count(*) from filtered),
      'income_cents', (select coalesce(sum(amount_cents) filter (where kind = 'income'), 0) from filtered),
      'expense_cents', (select coalesce(sum(amount_cents) filter (where kind = 'expense'), 0) from filtered)
    )
  );
end;
$$;
revoke all on function public.treasury_dashboard(),
  public.treasury_statement(uuid, text, text, date, date, integer, integer) from public, anon, authenticated;
grant execute on function public.treasury_dashboard(),
  public.treasury_statement(uuid, text, text, date, date, integer, integer) to anon, authenticated;

comment on table public.treasury_funds is 'Sociedades do painel público de tesouraria; separado das finanças privadas do aplicativo.';
comment on table public.treasury_entries is 'Livro público em centavos; saldo derivado integralmente dos lançamentos. Não contém dados bancários.';
notify pgrst, 'reload schema';
commit;
