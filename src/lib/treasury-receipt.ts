import {
  parseBrlToCents,
  validateTreasuryEntry,
  validateTreasuryReview,
  type TreasuryEntryInput,
  type TreasuryFund,
} from './treasury.ts';

export interface SocietyReceiptForm {
  fund_id: string;
  amount: string;
  occurred_on: string;
  person_name: string;
  description: string;
  payment_method: string;
}

/** A society is supplied by the authenticated access, never by a free-form field. */
export function resolveReceiptFund(funds: readonly Pick<TreasuryFund, 'id'>[], initialFundId?: string): string {
  if (initialFundId && funds.some(fund => fund.id === initialFundId)) return initialFundId;
  return funds.length === 1 ? funds[0].id : '';
}

/** Only the five receipt fields can reach the pending-entry payload. */
export function createSocietyReceipt(form: SocietyReceiptForm, allowedFundIds: readonly string[], today?: string) {
  if (!allowedFundIds.includes(form.fund_id)) throw new Error('Não foi possível identificar sua sociedade. Entre novamente.');
  if (form.payment_method !== 'pix' && form.payment_method !== 'cash') throw new Error('Escolha Pix ou dinheiro.');
  const payload = {
    fund_id: form.fund_id,
    kind: 'income' as const,
    status: 'pending' as const,
    amount_cents: parseBrlToCents(form.amount),
    occurred_on: form.occurred_on,
    person_name: form.person_name.trim(),
    description: form.description.trim(),
    payment_method: form.payment_method,
    shirt_cents: 0,
    monthly_fee_cents: 0,
    per_capita_cents: 0,
    bank_transaction_id: null,
    review_note: '',
  } satisfies TreasuryEntryInput;
  validateTreasuryEntry(payload, today);
  validateTreasuryReview(payload);
  return payload;
}
