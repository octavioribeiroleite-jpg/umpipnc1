import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseBrlToCents, centsToInput, formatCents, sumCents, safeCents,
  todayLocal, formatTreasuryDate, isTreasuryDate, validateTreasuryEntry,
  validateTreasuryFund, treasuryStatementParams, treasuryError,
  decodeTreasuryDashboard, decodeTreasuryStatement, sameTreasuryEntry,
  insertTreasuryEntryIdempotently,
  MAX_TREASURY_AMOUNT_CENTS,
  clampTreasuryPage,
} from '../src/lib/treasury.ts';

const fundId = '3b91cc32-7226-4f28-8d3e-3edbe06750b0';
const input = {
  id: 'd6098649-cd63-49bb-813f-5450b562012b', fund_id: fundId,
  kind: 'income', amount_cents: 15030, occurred_on: '2026-09-01',
  person_name: 'Pessoa de teste', description: 'Movimentação exclusiva para teste',
};
const entry = {
  ...input, revision: 1, created_at: '2026-09-01T13:00:00Z',
  updated_at: '2026-09-01T13:00:00Z', balance_after_cents: 15030,
};
const totals = { income_cents: 15030, expense_cents: 5020, balance_cents: 10010, entry_count: 2 };
const fund = { id: fundId, name: 'Sociedade de teste', abbreviation: 'TESTE', color: '#277463', ...totals };

test('editing the last row out of a society or date filter returns to a populated statement page', () => {
  assert.equal(clampTreasuryPage(1, 21), 1);
  // The only item on page 2 moves to another fund, or its date leaves the filter.
  assert.equal(clampTreasuryPage(1, 20), 0);
  assert.equal(clampTreasuryPage(3, 21), 1);
  assert.equal(clampTreasuryPage(1, 0), 0);
  assert.equal(clampTreasuryPage(0, 1005), 0);
});

test('BRL parsing retains exact cents for decimal and grouped amounts', () => {
  for (const [value, expected] of [['0,01', 1], ['0,10', 10], ['150', 15000], ['150,3', 15030], ['1.234,56', 123456], [' R$ 1.234.567,89 ', 123456789]]) {
    assert.equal(parseBrlToCents(value), expected, value);
    assert.equal(parseBrlToCents(centsToInput(expected)), expected);
  }
  assert.equal(parseBrlToCents('9.999.999.999,99'), MAX_TREASURY_AMOUNT_CENTS);
  assert.match(formatCents(-15030), /-R\$\s150,30/);
  assert.equal(formatCents(Number.MAX_SAFE_INTEGER), 'R$\u00a090.071.992.547.409,91');
  assert.equal(formatCents(-Number.MAX_SAFE_INTEGER), '-R$\u00a090.071.992.547.409,91');
  assert.equal(formatCents(-1), '-R$\u00a00,01');
});

test('ambiguous, nonpositive, overflow and exponential values are rejected', () => {
  for (const value of ['', '0', '0,00', '-10,00', '+10', '1e3', '1,001', '1.23', '1,000.00', '1 000', 'R$ -1', '1.23.456', '10.000.000.000,00', 'Infinity']) {
    assert.throws(() => parseBrlToCents(value), undefined, value);
  }
  assert.throws(() => safeCents('9007199254740993'));
  assert.throws(() => safeCents(null));
  assert.throws(() => safeCents(1.5));
});

test('income and expense arithmetic is exact, accepts negative balances and prevents overflow', () => {
  const income = [parseBrlToCents('0,10'), parseBrlToCents('0,20')];
  assert.equal(sumCents(income), 30);
  assert.equal(sumCents([...income, -parseBrlToCents('0,30')]), 0);
  assert.equal(sumCents([...income, -parseBrlToCents('0,40')]), -10);
  assert.throws(() => sumCents([Number.MAX_SAFE_INTEGER, 1]));
  assert.throws(() => sumCents([0.1]));
});

test('calendar dates preserve the date displayed and validate leap years without UTC conversion', () => {
  assert.equal(formatTreasuryDate('2026-09-01'), '01/09/2026');
  assert.equal(todayLocal(new Date(2026, 8, 28, 23, 59)), '2026-09-28');
  assert.ok(isTreasuryDate('2024-02-29'));
  for (const value of ['2026-02-29', '2026-04-31', '2026-13-01', '01/09/2026', '2026-9-1', '1899-12-31']) assert.equal(isTreasuryDate(value), false);
  assert.throws(() => validateTreasuryEntry({ ...input, occurred_on: '2026-09-29' }, '2026-09-28'));
  assert.doesNotThrow(() => validateTreasuryEntry(input, '2026-09-28'));
});

test('entry validation enforces society, direction, integer positive money, public fields and lengths', () => {
  for (const patch of [{ fund_id: '' }, { kind: 'transfer' }, { amount_cents: 0 }, { amount_cents: 1.5 }, { person_name: ' ' }, { person_name: 'a'.repeat(121) }, { description: '' }, { description: 'a'.repeat(501) }]) {
    assert.throws(() => validateTreasuryEntry({ ...input, ...patch }, '2026-09-28'));
  }
  assert.doesNotThrow(() => validateTreasuryFund(fund));
  assert.throws(() => validateTreasuryFund({ ...fund, abbreviation: 'a'.repeat(13) }));
  assert.throws(() => validateTreasuryFund({ ...fund, color: 'url(evil)' }));
});

test('statement parameters keep filters together and paginate without dropping dates', () => {
  assert.deepEqual(treasuryStatementParams({ fundId, kind: 'expense', start: '2026-09-01', end: '2026-09-28', search: '  pessoa  ', page: 2 }), {
    p_fund_id: fundId, p_kind: 'expense', p_start: '2026-09-01', p_end: '2026-09-28', p_search: 'pessoa', p_offset: 40, p_limit: 20,
  });
  assert.equal(treasuryStatementParams({ kind: 'all' }).p_kind, null);
  assert.throws(() => treasuryStatementParams({ start: '2026-09-28', end: '2026-09-01' }));
  assert.throws(() => treasuryStatementParams({ page: -1 }));
  assert.throws(() => treasuryStatementParams({ page: 0.5 }));
});

test('dashboard accepts real empty results but never converts missing/corrupt responses to zero', () => {
  const empty = { funds: [], totals: { balance_cents: 0, income_cents: 0, expense_cents: 0, entry_count: 0 }, months: [] };
  assert.deepEqual(decodeTreasuryDashboard(empty), empty);
  const dashboard = { funds: [fund], totals, months: [{ month: '2026-09', income_cents: 15030, expense_cents: 5020 }] };
  assert.deepEqual(decodeTreasuryDashboard(dashboard), dashboard);
  assert.throws(() => decodeTreasuryDashboard(null));
  assert.throws(() => decodeTreasuryDashboard({ funds: [], months: [] }));
  assert.throws(() => decodeTreasuryDashboard({ ...dashboard, totals: { ...totals, balance_cents: 10011 } }));
  assert.throws(() => decodeTreasuryDashboard({ ...dashboard, funds: [] }));
});

test('statement preserves server historical balance and full filtered totals across pages', () => {
  const result = decodeTreasuryStatement({ entries: [{ ...entry, balance_after_cents: '-500' }], total_count: 27, income_cents: 500000, expense_cents: 300000 });
  assert.equal(result.entries[0].balance_after_cents, -500);
  assert.equal(result.total_count, 27);
  assert.equal(result.income_cents, 500000);
  assert.throws(() => decodeTreasuryStatement({ entries: [entry], total_count: 0, income_cents: 0, expense_cents: 0 }));
  assert.throws(() => decodeTreasuryStatement({ entries: [{ ...entry, balance_after_cents: undefined }], total_count: 1, income_cents: 15030, expense_cents: 0 }));
});

test('idempotent retry comparison checks every financial field', () => {
  assert.equal(sameTreasuryEntry(entry, input), true);
  for (const patch of [{ fund_id: 'other' }, { kind: 'expense' }, { amount_cents: 15031 }, { occurred_on: '2026-09-02' }, { person_name: 'Outra pessoa' }, { description: 'Outra descrição' }]) {
    assert.equal(sameTreasuryEntry(entry, { ...input, ...patch }), false);
  }
});

test('retry after a committed insert with lost response creates one row and changed content fails explicitly', async () => {
  const database = new Map();
  let insertedRows = 0;
  const adapter = {
    async insert(payload) {
      if (database.has(payload.id)) return { data: null, error: { code: '23505' } };
      const persisted = { ...entry, ...payload };
      database.set(payload.id, persisted);
      insertedRows++;
      // The database committed, but the client never received that response.
      return { data: null, error: new TypeError('Failed to fetch') };
    },
    async findById(id) { return { data: database.get(id) ?? null, error: null }; },
  };
  await assert.rejects(insertTreasuryEntryIdempotently(input, adapter), /conexão/);
  assert.equal(database.size, 1);
  const confirmed = await insertTreasuryEntryIdempotently(input, adapter);
  assert.equal(confirmed.id, input.id);
  assert.equal(confirmed.amount_cents, 15030);
  assert.equal(insertedRows, 1);
  await assert.rejects(insertTreasuryEntryIdempotently({ ...input, amount_cents: 15031 }, adapter), /outros dados/);
  assert.equal(database.get(input.id).amount_cents, 15030);
  assert.equal(insertedRows, 1);
});

test('permission rejection cannot be interpreted as an idempotent success', async () => {
  let reads = 0;
  await assert.rejects(insertTreasuryEntryIdempotently(input, {
    async insert() { return { data: null, error: { code: '42501' } }; },
    async findById() { reads++; return { data: entry, error: null }; },
  }), /administrador/);
  assert.equal(reads, 0);
});

test('concurrent double submission with one UUID confirms a single committed entry twice', async () => {
  const database = new Map();
  let insertedRows = 0;
  const adapter = {
    async insert(payload) {
      // Model the database UNIQUE constraint: check-and-insert is atomic.
      if (database.has(payload.id)) return { data: null, error: { code: '23505' } };
      const persisted = { ...entry, ...payload };
      database.set(payload.id, persisted);
      insertedRows++;
      await new Promise(resolve => setImmediate(resolve));
      return { data: persisted, error: null };
    },
    async findById(id) { return { data: database.get(id) ?? null, error: null }; },
  };
  const confirmations = await Promise.all([
    insertTreasuryEntryIdempotently(input, adapter),
    insertTreasuryEntryIdempotently({ ...input }, adapter),
  ]);
  assert.equal(database.size, 1);
  assert.equal(insertedRows, 1);
  assert.equal(confirmations[0].id, input.id);
  assert.deepEqual(confirmations[0], confirmations[1]);
});

test('API failures remain explicit for missing setup, permission, conflicts and network errors', () => {
  assert.match(treasuryError({ code: 'PGRST202' }).message, /configurada/);
  assert.match(treasuryError({ code: '42501' }).message, /administrador/);
  assert.match(treasuryError({ code: '40001' }).message, /alterado/);
  assert.match(treasuryError({ code: '23505' }).message, /Já existe/);
  assert.match(treasuryError(new TypeError('Failed to fetch')).message, /conexão/);
  assert.match(treasuryError({ code: 'UNKNOWN', message: 'internal database credentials' }).message, /conexão/);
  assert.doesNotMatch(treasuryError({ code: 'UNKNOWN', message: 'internal database credentials' }).message, /credentials/);
});

test('Pix allocations and per-capita reserve validate exact total and participate in retry comparison', () => {
  const input = { fund_id: '11111111-1111-4111-8111-111111111111', kind: 'income', amount_cents: 10000, occurred_on: '2025-01-01', person_name: 'Teste', description: 'Teste', status: 'pending', payment_method: 'pix', shirt_cents: 6000, monthly_fee_cents: 3000, per_capita_cents: 1000 };
  assert.doesNotThrow(() => validateTreasuryEntry(input));
  assert.throws(() => validateTreasuryEntry({ ...input, per_capita_cents: 1001 }), /soma/);
  assert.throws(() => validateTreasuryEntry({ ...input, monthly_fee_cents: -1 }), /soma/);
  assert.throws(() => validateTreasuryEntry({ ...input, shirt_cents: 0.1 }), /soma/);
  for (const changed of [{ status: 'confirmed' }, { per_capita_cents: 500 }, { bank_transaction_id: '22222222-2222-4222-8222-222222222222' }, { payment_method: 'cash' }]) assert.equal(sameTreasuryEntry(input, { ...input, ...changed }), false);
});
