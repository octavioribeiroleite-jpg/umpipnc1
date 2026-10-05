import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSocietyReceipt, resolveReceiptFund } from '../src/lib/treasury-receipt.ts';
import { validateTreasuryReview } from '../src/lib/treasury.ts';

const own = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const today = '2026-10-05';
const form = { fund_id: own, amount: '1.250,50', occurred_on: today, person_name: '  Pessoa fictícia  ', description: '  Recebimento de teste  ', payment_method: 'pix' };

for (const payment_method of ['pix', 'cash']) {
  test(`simple ${payment_method} receipt stays pending without bank, allocation or review questions`, () => {
    assert.deepEqual(createSocietyReceipt({ ...form, payment_method }, [own], today), {
      fund_id: own, kind: 'income', status: 'pending', amount_cents: 125050, occurred_on: today,
      person_name: 'Pessoa fictícia', description: 'Recebimento de teste', payment_method,
      shirt_cents: 0, monthly_fee_cents: 0, per_capita_cents: 0, bank_transaction_id: null, review_note: '',
    });
  });
}

test('receipt society resolves only from the supplied authorized societies', () => {
  assert.equal(resolveReceiptFund([{ id: own }], other), own);
  assert.equal(resolveReceiptFund([{ id: own }, { id: other }], other), other);
  assert.equal(resolveReceiptFund([{ id: own }, { id: other }]), '');
  assert.equal(resolveReceiptFund([], own), '');
  assert.throws(() => createSocietyReceipt({ ...form, fund_id: other }, [own], today), /sua sociedade/);
  assert.throws(() => createSocietyReceipt(form, [], today), /sua sociedade/);
});

test('simple receipts reject transfer, opening balance and unknown payment methods', () => {
  for (const payment_method of ['transfer', 'opening', '', 'card']) {
    assert.throws(() => createSocietyReceipt({ ...form, payment_method }, [own], today), /Pix ou dinheiro/);
  }
});

test('hidden administrative values cannot change a society receipt', () => {
  const injected = { ...form, id: other, revision: 9, kind: 'expense', status: 'confirmed', shirt_cents: 100, monthly_fee_cents: 200, per_capita_cents: 300, bank_transaction_id: other, review_note: 'Admin override' };
  assert.deepEqual(createSocietyReceipt(injected, [own], today), createSocietyReceipt(form, [own], today));
});

test('simple receipt validates the actual required fields and date before submission', () => {
  for (const amount of ['', '0', '-1', '10,999', '10000000000']) {
    assert.throws(() => createSocietyReceipt({ ...form, amount }, [own], today));
  }
  for (const occurred_on of ['2026-10-06', '2026-02-30', '']) {
    assert.throws(() => createSocietyReceipt({ ...form, occurred_on }, [own], today), /data válida/);
  }
  assert.throws(() => createSocietyReceipt({ ...form, person_name: ' ' }, [own], today), /nome da pessoa/);
  assert.throws(() => createSocietyReceipt({ ...form, description: ' ' }, [own], today), /Descreva/);
});

test('simplifying society input never bypasses administrative confirmation rules', () => {
  for (const payment_method of ['pix', 'cash']) {
    const pending = createSocietyReceipt({ ...form, payment_method }, [own], today);
    assert.doesNotThrow(() => validateTreasuryReview(pending));
    assert.throws(() => validateTreasuryReview({ ...pending, status: 'confirmed' }), payment_method === 'pix' ? /Vincule/ : /Justifique/);
  }
});
