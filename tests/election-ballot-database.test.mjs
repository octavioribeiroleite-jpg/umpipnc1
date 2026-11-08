import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

// Existing production RPC, isolated synthetic tables and no network. PGlite is
// single-connection; these test serial outcomes, not PostgreSQL lock contention.
test('existing ballot RPC enforces browser/election/round uniqueness, idempotency and shared token urns', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create schema auth; create function auth.role() returns text language sql as $$ select 'service_role'::text $$;
      create table public.elections(id uuid primary key,status text,current_round integer,voting_mode text);
      create table public.election_devices(id uuid primary key,election_id uuid,token uuid);
      create table public.election_candidates(id uuid primary key,election_id uuid);
      create table public.election_votes(id uuid default gen_random_uuid(),election_id uuid,candidate_id uuid,device_id text,ballot_id uuid,round_number integer,is_blank boolean);`);
    const sql = readFileSync(new URL('../supabase/migrations/20260905113023_guarded_public_flows.sql', import.meta.url), 'utf8');
    await db.exec(sql.slice(sql.indexOf('create or replace function'), sql.indexOf('revoke all on function')));
    const e1 = crypto.randomUUID(), e2 = crypto.randomUUID(), device = crypto.randomUUID(), token = crypto.randomUUID();
    await db.query("insert into elections values ($1,'open',1,'both'),($2,'open',1,'individual')", [e1, e2]);
    await db.query('insert into election_devices values ($1,$2,$3)', [crypto.randomUUID(), e1, token]);
    const cast = (election, round, ballot = crypto.randomUUID(), browser = device, urn = null) => db.query('select cast_ipnc_ballot($1,$2,$3,$4,$5,$6,1,1)', [election, urn, browser, round, ballot, []]);
    const ballot = crypto.randomUUID(); await cast(e1, 1, ballot); await cast(e1, 1, ballot);
    await assert.rejects(cast(e1, 1), /Voto já registrado/);
    await cast(e2, 1); // Separate election is allowed.
    await db.query('update elections set current_round=2 where id=$1', [e1]);
    await assert.rejects(cast(e1, 1), /Votação encerrada/); await cast(e1, 2);
    await assert.rejects(cast(e1, 2), /Voto já registrado/);
    await cast(e1, 2, crypto.randomUUID(), null, token); await cast(e1, 2, crypto.randomUUID(), null, token);
    await assert.rejects(cast(e1, 2, crypto.randomUUID(), null, crypto.randomUUID()), /Urna inválida/);
    assert.equal((await db.query('select count(*)::integer as count from election_votes')).rows[0].count, 5);
    await db.query("update elections set status='finished' where id=$1", [e1]);
    await assert.rejects(cast(e1, 2, crypto.randomUUID(), null, token), /Votação encerrada/);
  } finally { await db.close(); }
});
