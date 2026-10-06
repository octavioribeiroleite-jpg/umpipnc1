import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeTreasuryDashboard, decodeTreasuryStatement, decodeTreasuryEntry } from '../src/lib/treasury.ts';

test('theme visual fixture provides consistent treasury reads and blocks every financial mutation', async () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'location');
  Object.defineProperty(globalThis, 'location', { configurable: true, value: { search: '?role=admin' } });
  try {
    const { treasuryClient } = await import('./fixtures/system-theme/treasury-backend.ts');
    const dashboard = decodeTreasuryDashboard((await treasuryClient.rpc('treasury_dashboard').abortSignal(new AbortController().signal)).data);
    assert.equal(dashboard.funds.length, 2);
    assert.equal(dashboard.totals.balance_cents, 160000);
    const statement = decodeTreasuryStatement((await treasuryClient.rpc('treasury_statement')).data);
    assert.equal(statement.entries.length, 4);
    const selected = decodeTreasuryStatement((await treasuryClient.rpc('treasury_statement', { p_fund_id: dashboard.funds[0].id })).data);
    assert.equal(selected.entries.length, 2);
    const pending = await treasuryClient.rpc('treasury_review_queue');
    assert.equal(decodeTreasuryEntry(pending.data.entries[0], false).status, 'pending');
    for (const method of ['insert', 'update', 'upsert', 'delete']) {
      const result = await treasuryClient.from('treasury_entries')[method]({ amount_cents: 1 }).select().single();
      assert.match(result.error.message, /desabilitada/);
      assert.equal(result.data, null);
    }
    for (const rpc of ['treasury_set_pin', 'treasury_report', 'unknown_rpc']) assert.match((await treasuryClient.rpc(rpc)).error.message, /desabilitada/);
    assert.match((await treasuryClient.storage.from('treasury-receipts').upload('fixture', new Uint8Array())).error.message, /desabilitada/);
    assert.equal((await treasuryClient.functions.invoke('treasury-pin-login', { body: { pin: '000000' } })).data.session, undefined);
    assert.equal((await treasuryClient.functions.invoke('treasury-pin-login', { body: { pin: '123456' } })).data.session.access_token, 'synthetic-treasury');
  } finally {
    if (previous) Object.defineProperty(globalThis, 'location', previous);
    else delete globalThis.location;
  }
});
