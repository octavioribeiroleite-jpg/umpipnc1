import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';

// Minimal EBD fixture shared by PGlite and native PostgreSQL. Only synthetic
// records; Auth GUCs model a trusted gateway, not JWT verification or HTTP Auth.
export async function initializeEbdFixture(db) {
  await db.exec(`
  create role anon; create role authenticated; create role service_role bypassrls;
  create schema auth; create schema ipnc_private; create schema extensions;
  create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
  create function auth.uid() returns uuid language sql stable as $$ select nullif(auth.jwt()->>'sub','')::uuid $$;
  -- Native SHA-256 supplies the same digest needed by portal_valid. This
  -- does not test bcrypt/PIN verification, token signing or the Auth HTTP service.
  create function extensions.digest(value text,algorithm text) returns bytea language sql as $$ select sha256(convert_to(value,'UTF8')) $$;
  create type public.app_role as enum('admin','diretoria','pastor','visualizador');
  create table profiles(user_id uuid primary key,active boolean default true,society_id uuid);
  create table user_roles(user_id uuid,role public.app_role);
  create table settings(key text primary key,value text);
  create table ebd_classes(id uuid primary key default gen_random_uuid(),name text,order_index integer default 0,active boolean default true);
  create table ebd_students(id uuid primary key default gen_random_uuid(),class_id uuid references ebd_classes,name text,active boolean default true,created_at timestamptz default '2026-01-01');
  create table ebd_class_passwords(class_id uuid primary key references ebd_classes,pin_hash text,active boolean default true);
  create table ebd_attendance(id uuid primary key default gen_random_uuid(),student_id uuid references ebd_students,class_id uuid references ebd_classes,date date,present boolean,marked_by uuid,unique(student_id,date));
  create table ebd_day_closures(id uuid primary key default gen_random_uuid(),date date unique,closed_by text,total_students integer,present_students integer,class_summary jsonb,visitor_count integer);
  create table ebd_class_visitor_entries(id uuid primary key default gen_random_uuid(),date date,class_id uuid references ebd_classes,name text);
  create table ebd_class_visitors(id uuid primary key default gen_random_uuid(),date date,class_id uuid references ebd_classes);
  create table ebd_class_logins(id uuid primary key default gen_random_uuid(),class_id uuid references ebd_classes);
  create table aniversariantes(id uuid primary key); create table charges(id uuid primary key); create table member_payment_submissions(id uuid primary key);
  grant usage on schema public,auth to anon,authenticated;
  revoke all on schema ipnc_private from public,anon;
  grant usage on schema ipnc_private to authenticated,service_role;
  -- The owned-backend baseline enables RLS before creating EBD policies. Recreate
  -- that prerequisite explicitly; never replay legacy public policies.
  do $$ declare t text; begin for t in select tablename from pg_tables where schemaname='public' loop execute format('alter table public.%I enable row level security',t); end loop; end $$;
  create publication supabase_realtime;
  `);
  const migration = name => readFileSync(new URL(`../../supabase/migrations/${name}`, import.meta.url), 'utf8');
  const portalSource = migration('20260905111555_portal_sessions_and_compatibility.sql');
  const boundary = portalSource.indexOf('-- Birthday names/month/day');
  assert.ok(boundary > 0, 'EBD source boundary must be reviewed if the migration changes');
  // Execute the original EBD/session block unchanged, including original grants,
  // policies and guards. Unrelated financial/task/birthday migration sections are
  // intentionally excluded from this EBD-focused fixture.
  await db.exec(portalSource.slice(0, boundary) + '\ncommit;');
  await db.exec(migration('20260920152545_ebd_live_sync.sql'));
  await db.exec(migration('20260927121700_ebd_historical_attendance.sql'));

  const ids = Object.fromEntries(['teacher','admin','inactive','a','b','one','two','other'].map(key => [key, randomUUID()]));
  const secret = 'synthetic-pin-hash-a', adminSecret = 'synthetic-admin-pin-hash';
  const fingerprint = value => createHash('sha256').update(`IPNC:PIN:v1:${value}`).digest('hex');
  await db.query('insert into profiles(user_id,active) values($1,true),($2,true),($3,false)', [ids.teacher, ids.admin, ids.inactive]);
  await db.query("insert into settings values('secretaria_admin_password',$1)", [adminSecret]);
  await db.query("insert into ebd_classes(id,name) values($1,'Turma sintética A'),($2,'Turma sintética B')", [ids.a, ids.b]);
  await db.query('insert into ebd_class_passwords(class_id,pin_hash) values($1,$3),($2,$3)', [ids.a, ids.b, secret]);
  await db.query("insert into ebd_students(id,class_id,name) values($1,$4,'Aluno sintético 1'),($2,$4,'Aluno sintético 2'),($3,$5,'Aluno sintético de outra turma')", [ids.one, ids.two, ids.other, ids.a, ids.b]);
  const today = (await db.query("select (now() at time zone 'America/Sao_Paulo')::date::text as value")).rows[0].value;
  const past = (await db.query("select ((now() at time zone 'America/Sao_Paulo')::date-7)::text as value")).rows[0].value;
  function claims(overrides = {}) {
    return { sub: ids.teacher, role: 'authenticated', app_metadata: { ipnc_portal: {
      namespace: 'ebd', id: ids.a, issued_at: Math.floor(Date.now()/1000), fingerprint: fingerprint(secret),
    } }, ...overrides };
  }
  const adminClaims = () => claims({ sub: ids.admin, app_metadata: { ipnc_portal: {
    namespace: 'ebd', id: 'admin', issued_at: Math.floor(Date.now()/1000), fingerprint: fingerprint(adminSecret),
  } } });
  return { ids, secret, adminSecret, fingerprint, today, past, claims, adminClaims, migration };
}
