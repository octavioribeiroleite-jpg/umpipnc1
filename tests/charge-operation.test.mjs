import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
import { createChargeOperation, executeChargeOperation, chargeOperationError } from '../src/lib/charge-operation.ts';

// Execute the handlers from the shipped component, with no network or real
// financial records. A returned PostgREST error does not reject its promise.
const source = readFileSync(new URL('../src/components/financas/CobrancasTab.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('CobrancasTab.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const handlers = {};
function visit(node) {
  if (ts.isVariableDeclaration(node) && ['handlePayment', 'confirmActionHandler'].includes(node.name.getText(ast))) {
    handlers[node.name.getText(ast)] = node.initializer.getText(ast);
  }
  ts.forEachChild(node, visit);
}
visit(ast);
const charge = () => ({ id: crypto.randomUUID(), member_id: crypto.randomUUID(), society_id: crypto.randomUUID(), amount: 100, paid_amount: 0, status: 'pendente', transaction_id: null, updated_at: '2026-10-10T12:00:00Z' });

function harness(operation = 'payment', transport = async () => ({ data: null, error: { code: '42501', message: 'Fixture denied' } })) {
  const original = charge();
  const state = { charges: [original], dialog: true, confirmation: true, busy: false, errors: [], success: [], info: [], requests: [], reads: 0, uploads: 0 };
  const inputs = {
    selectedMember: { id: original.member_id, name: 'Synthetic member' }, selectedCharge: original,
    user: { id: crypto.randomUUID() }, societyId: original.society_id, currentYear: 2026,
    paymentAmount: '20', paymentDate: '2026-10-10T12:00', paymentMethod: 'pix', paymentNotes: '', receiptFile: null,
    contributionAmount: 90, perCapitaAmount: 10, parseMoney: value => Number(value.replace(',', '.')),
    getRemainingAmount: c => c.amount - (c.paid_amount || 0), getPaidAmount: c => c.paid_amount || 0, formatCurrency: String,
    operationBusy: { current: false }, paymentAttempt: { current: null }, confirmationAttempt: { current: null },
    confirmAction: { type: operation, charge: original },
    setSubmitting: v => { state.busy = v; }, setPaymentError: v => { state.paymentError = v; }, setConfirmationError: v => { state.confirmationError = v; },
    setDialogOpen: v => { state.dialog = v; }, setConfirmDialogOpen: v => { state.confirmation = v; }, setConfirmAction: () => {},
    setCharges: fn => { state.charges = fn(state.charges); },
    toast: { success: v => state.success.push(v), error: v => state.errors.push(v), info: v => state.info.push(v) },
    fetchData: async () => { state.reads++; }, receiptReference: path => `receipt://${path}`,
    createChargeOperation, executeChargeOperation, chargeOperationError,
    supabase: {
      rpc: async (name, request) => { assert.equal(name, 'financial_charge_operation'); state.requests.push(structuredClone(request)); return transport(request); },
      storage: { from: () => ({ upload: async () => { state.uploads++; return { error: { message: 'Fixture storage denied' } }; } }) },
      from: () => { throw new Error('Separate business writes must not run'); },
    },
  };
  function handler() {
    const name = operation === 'payment' ? 'handlePayment' : 'confirmActionHandler';
    const js = ts.transpileModule(`return (${handlers[name]});`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
    return Function(...Object.keys(inputs), js)(...Object.values(inputs));
  }
  return { state, inputs, original, run: () => handler()() };
}

test('payment, revert and delete preserve the visible charge and open form on a returned database error', async () => {
  for (const operation of ['payment', 'revert', 'delete']) {
    const h = harness(operation);
    await h.run();
    assert.deepEqual(h.state.charges, [h.original]);
    assert.equal(h.state.dialog, true);
    assert.equal(h.state.confirmation, true);
    assert.equal(h.state.busy, false);
    assert.equal(h.state.requests.length, 1);
    assert.equal(h.state.requests[0].p_operation, operation);
    assert.equal(h.state.success.length, 0);
    assert.equal(h.state.errors.length, 1);
    assert.equal(h.state.reads, 1);
    assert.match(h.state.paymentError || h.state.confirmationError, /denied/);
  }
});

test('all charge operations wait for the database and suppress double taps before confirmation', async () => {
  for (const operation of ['payment', 'revert', 'delete']) {
    let finish;
    const h = harness(operation, request => new Promise(resolve => {
      finish = () => resolve({ error: null, data: { request_id: request.p_request_id, operation, replayed: false, charge: operation === 'delete' ? null : { ...h.original, paid_amount: operation === 'payment' ? 20 : 0 } } });
    }));
    const pending = h.run();
    await h.run();
    assert.equal(h.state.requests.length, 1);
    assert.deepEqual(h.state.charges, [h.original]);
    assert.equal(h.state.success.length, 0);
    assert.equal(h.state.busy, true);
    assert.equal(h.state.dialog, true);
    assert.equal(h.state.confirmation, true);
    finish();
    await pending;
    assert.equal(h.state.success.length, 1);
    assert.equal(h.state.busy, false);
    assert.equal(operation === 'payment' ? h.state.dialog : h.state.confirmation, false);
    assert.equal(h.state.charges.length, operation === 'delete' ? 0 : 1);
    if (operation === 'payment') assert.equal(h.state.charges[0].paid_amount, 20);
  }
});

test('lost replies retry the same request key and replay never reinstates an old paid snapshot', async () => {
  for (const operation of ['payment', 'revert', 'delete']) {
    let calls = 0;
    const h = harness(operation, async request => {
      if (++calls === 1) throw new Error('Fixture lost reply after commit');
      return { error: null, data: { request_id: request.p_request_id, operation, replayed: true, charge: null } };
    });
    await h.run();
    await h.run();
    assert.deepEqual(h.state.requests[0], h.state.requests[1]);
    assert.equal(h.state.success.length, 0);
    assert.equal(h.state.info.length, 1);
    assert.equal(h.state.reads, 2);
    assert.deepEqual(h.state.charges, []); // the database confirms this charge was deleted after the original operation
  }
});

test('changed payment details receive a new key; failed receipt uploads never call the financial RPC', async () => {
  const h = harness();
  await h.run();
  h.inputs.paymentAmount = '15';
  await h.run();
  assert.notEqual(h.state.requests[0].p_request_id, h.state.requests[1].p_request_id);
  h.inputs.receiptFile = { name: 'fixture.pdf' };
  await h.run();
  assert.equal(h.state.requests.length, 2);
  assert.equal(h.state.uploads, 1);
  assert.equal(h.state.dialog, true);
  assert.match(h.state.paymentError, /storage denied/);
});

test('successful receipt upload is reused for an identical retry after a database error', async () => {
  const h = harness();
  h.inputs.receiptFile = { name: 'fixture.pdf' };
  h.inputs.supabase.storage.from = () => ({ upload: async () => { h.state.uploads++; return { error: null }; } });
  await h.run();
  await h.run();
  assert.equal(h.state.uploads, 1);
  assert.deepEqual(h.state.requests[0], h.state.requests[1]);
  assert.match(h.state.requests[0].p_payload.receipt_url, /^receipt:\/\//);
});

test('invalid dates, fractions of cents and non-finite amounts do not start a write or leave the form busy', async () => {
  for (const [paymentAmount, paymentDate] of [['1', ''], ['0.001', '2026-10-10T12:00'], ['Infinity', '2026-10-10T12:00']]) {
    const h = harness();
    Object.assign(h.inputs, { paymentAmount, paymentDate });
    await h.run();
    assert.equal(h.state.requests.length, 0);
    assert.equal(h.state.busy, false);
    assert.equal(h.state.errors.length, 1);
  }
});

test('missing or mismatched database confirmations are rejected and stale revisions have actionable feedback', async () => {
  const request = createChargeOperation(charge(), 'payment', { amount: 20 });
  for (const data of [null, {}, { request_id: request.p_request_id, operation: 'payment', replayed: false, charge: null },
    { request_id: request.p_request_id, operation: 'payment', replayed: false, charge: { id: request.p_charge_id } }]) {
    await assert.rejects(() => executeChargeOperation(async () => ({ data, error: null }), request), /não confirmou/);
  }
  assert.match(chargeOperationError({ code: '40001', message: 'stale' }), /cobrança mudou/);
});

test('the default payment time represents the same instant in the Brazilian datetime-local field', () => {
  const moduleUrl = new URL('../src/lib/charge-operation.ts', import.meta.url).href;
  const code = `import {chargePaymentDateInput} from ${JSON.stringify(moduleUrl)};const input=chargePaymentDateInput(new Date('2026-10-10T01:30:00Z'));process.stdout.write(JSON.stringify({input,instant:new Date(input).toISOString()}));`;
  const result = JSON.parse(execFileSync(process.execPath, ['--experimental-strip-types', '--input-type=module', '-e', code], { env: { ...process.env, TZ: 'America/Sao_Paulo' }, encoding: 'utf8' }));
  assert.deepEqual(result, { input: '2026-10-09T22:30', instant: '2026-10-10T01:30:00.000Z' });
});
