export type TreasuryKind = 'income' | 'expense';
export type TreasuryStatus = 'pending' | 'confirmed' | 'rejected';
export type TreasuryPayment = 'pix' | 'transfer' | 'cash' | 'opening';

export interface TreasuryTotals {
  balance_cents: number;
  income_cents: number;
  expense_cents: number;
  entry_count: number;
  reserved_cents?: number;
  available_cents?: number;
}

export interface TreasuryFund extends TreasuryTotals {
  id: string;
  name: string;
  abbreviation: string;
  color: string;
}

export interface TreasuryEntryInput {
  id?: string;
  fund_id: string;
  kind: TreasuryKind;
  amount_cents: number;
  occurred_on: string;
  person_name: string;
  description: string;
  status?: TreasuryStatus;
  payment_method?: TreasuryPayment;
  shirt_cents?: number;
  monthly_fee_cents?: number;
  per_capita_cents?: number;
  bank_transaction_id?: string | null;
  review_note?: string;
}

export interface TreasuryEntry extends TreasuryEntryInput {
  id: string;
  revision: number;
  created_at: string;
  updated_at: string;
  balance_after_cents: number;
}

export interface TreasuryFundInput {
  id?: string;
  name: string;
  abbreviation: string;
  color: string;
}

export interface TreasuryMonth {
  month: string;
  income_cents: number;
  expense_cents: number;
}

export interface TreasuryDashboard {
  funds: TreasuryFund[];
  totals: TreasuryTotals;
  months: TreasuryMonth[];
}

export interface TreasuryStatement {
  entries: TreasuryEntry[];
  total_count: number;
  income_cents: number;
  expense_cents: number;
}

export interface TreasuryStatementFilters {
  fundId?: string;
  kind?: TreasuryKind | 'all';
  search?: string;
  start?: string;
  end?: string;
  /** Zero-based page number. */
  page?: number;
}

export const TREASURY_PAGE_SIZE = 20;
export function clampTreasuryPage(page: number, totalCount: number): number {
  return Math.min(page, Math.max(0, Math.ceil(totalCount / TREASURY_PAGE_SIZE) - 1));
}
export const MAX_TREASURY_AMOUNT_CENTS = 999_999_999_999;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const wholeReais = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

export function safeCents(value: unknown): number {
  const number = typeof value === 'string' && /^-?\d+$/.test(value) ? Number(value) : value;
  if (typeof number !== 'number' || !Number.isSafeInteger(number)) {
    throw new Error('O valor recebido não pode ser calculado com segurança. Atualize a página ou contate o administrador.');
  }
  return number;
}

export function sumCents(values: readonly number[]): number {
  return values.reduce((sum, value) => safeCents(sum + safeCents(value)), 0);
}

/** Parse digits directly into integer cents; never multiply a decimal float. */
export function parseBrlToCents(input: string): number {
  const value = input.trim().replace(/^R\$\s*/, '');
  if (!/^(?:\d+|[1-9]\d{0,2}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(value)) {
    throw new Error('Informe um valor em reais, como 150,00 ou 1.250,50, com até duas casas decimais.');
  }
  const [whole, decimal = ''] = value.replace(/\./g, '').split(',');
  const cents = Number(whole + decimal.padEnd(2, '0'));
  if (!Number.isSafeInteger(cents) || cents <= 0 || cents > MAX_TREASURY_AMOUNT_CENTS) {
    throw new Error('Informe um valor maior que zero e de até R$ 9.999.999.999,99.');
  }
  return cents;
}

export function centsToInput(cents: number): string {
  safeCents(cents);
  if (cents < 0) throw new Error('O valor do lançamento deve ser positivo.');
  return `${Math.floor(cents / 100)},${String(cents % 100).padStart(2, '0')}`;
}

export function formatCents(cents: number): string {
  safeCents(cents);
  const absolute = Math.abs(cents);
  // Format the integer and fractional parts separately, even near MAX_SAFE_INTEGER.
  return `${cents < 0 ? '-' : ''}R$\u00a0${wholeReais.format(Math.floor(absolute / 100))},${String(absolute % 100).padStart(2, '0')}`;
}

export function todayLocal(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function isTreasuryDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '1900-01-01') return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function formatTreasuryDate(value: string): string {
  if (!isTreasuryDate(value)) throw new Error('Data inválida.');
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

export function validateTreasuryEntry(entry: TreasuryEntryInput, today = todayLocal()): void {
  if (!uuidPattern.test(entry.fund_id)) throw new Error('Selecione uma sociedade válida.');
  if (entry.id && !uuidPattern.test(entry.id)) throw new Error('Identificador do lançamento inválido.');
  if (entry.kind !== 'income' && entry.kind !== 'expense') throw new Error('Selecione entrada ou saída.');
  if (!Number.isSafeInteger(entry.amount_cents) || entry.amount_cents <= 0 || entry.amount_cents > MAX_TREASURY_AMOUNT_CENTS) {
    throw new Error('Informe um valor válido maior que zero.');
  }
  if (!isTreasuryDate(entry.occurred_on) || entry.occurred_on > today) throw new Error('Informe uma data válida, até hoje.');
  if (entry.status && !['pending', 'confirmed', 'rejected'].includes(entry.status)) throw new Error('Status inválido.');
  if (entry.payment_method && !['pix', 'transfer', 'cash', 'opening'].includes(entry.payment_method)) throw new Error('Forma de recebimento inválida.');
  const portions = [entry.shirt_cents ?? 0, entry.monthly_fee_cents ?? 0, entry.per_capita_cents ?? 0];
  if (portions.some(value => !Number.isSafeInteger(value) || value < 0) || sumCents(portions) > entry.amount_cents) throw new Error('A soma de camisa, mensalidade e per capita não pode superar o valor recebido.');
  if (entry.bank_transaction_id && !uuidPattern.test(entry.bank_transaction_id)) throw new Error('Movimento bancário inválido.');
  if ((entry.review_note?.length ?? 0) > 500) throw new Error('A conferência deve ter até 500 caracteres.');
  if (!entry.person_name.trim() || entry.person_name.length > 120) throw new Error('Informe o nome da pessoa, com até 120 caracteres.');
  if (!entry.description.trim() || entry.description.length > 500) throw new Error('Descreva a movimentação, com até 500 caracteres.');
}

export function validateTreasuryReview(entry: TreasuryEntryInput): void {
  if (entry.status === 'rejected' && (entry.review_note?.trim().length ?? 0) < 5) throw new Error('Informe o motivo da devolução, com pelo menos 5 caracteres.');
  if (entry.payment_method === 'opening' && entry.kind !== 'income') throw new Error('Saldo inicial deve ser uma entrada.');
  if (entry.status !== 'confirmed') return;
  if (['pix', 'transfer'].includes(entry.payment_method ?? '') && !entry.bank_transaction_id) throw new Error('Vincule o crédito ou débito do banco antes de confirmar.');
  if (['cash', 'opening'].includes(entry.payment_method ?? '') && (entry.review_note?.trim().length ?? 0) < 5) throw new Error('Justifique a conferência de dinheiro ou saldo inicial, com pelo menos 5 caracteres.');
}

export function validateTreasuryFund(fund: TreasuryFundInput): void {
  if (fund.id && !uuidPattern.test(fund.id)) throw new Error('Identificador da sociedade inválido.');
  if (!fund.name.trim() || fund.name.length > 100) throw new Error('Informe o nome da sociedade, com até 100 caracteres.');
  if (!fund.abbreviation.trim() || fund.abbreviation.length > 12) throw new Error('Informe uma sigla de até 12 caracteres.');
  if (!/^#[0-9a-f]{6}$/i.test(fund.color)) throw new Error('Escolha uma cor válida para a sociedade.');
}

export function treasuryStatementParams(filters: TreasuryStatementFilters = {}) {
  if (filters.fundId && !uuidPattern.test(filters.fundId)) throw new Error('Sociedade inválida.');
  if (filters.kind && !['all', 'income', 'expense'].includes(filters.kind)) throw new Error('Tipo de movimentação inválido.');
  if (filters.start && !isTreasuryDate(filters.start)) throw new Error('Data inicial inválida.');
  if (filters.end && !isTreasuryDate(filters.end)) throw new Error('Data final inválida.');
  if (filters.start && filters.end && filters.start > filters.end) throw new Error('A data inicial deve ser anterior ou igual à data final.');
  const page = filters.page ?? 0;
  if (!Number.isSafeInteger(page) || page < 0 || page * TREASURY_PAGE_SIZE > 2_147_483_647) throw new Error('Página inválida.');
  return {
    p_fund_id: filters.fundId || null,
    p_kind: filters.kind === 'all' ? null : filters.kind || null,
    p_search: filters.search?.trim().slice(0, 120) || null,
    p_start: filters.start || null,
    p_end: filters.end || null,
    p_offset: page * TREASURY_PAGE_SIZE,
    p_limit: TREASURY_PAGE_SIZE,
  };
}

export function treasuryError(error: unknown): Error {
  const source = typeof error === 'object' && error !== null ? error as { code?: string; message?: string; status?: number } : {};
  const code = source.code;
  if (['PGRST202', 'PGRST205', '42P01', '42883'].includes(code ?? '')) {
    return new Error('A tesouraria ainda não está configurada no banco de dados. O administrador precisa concluir a configuração.');
  }
  if (['42501', 'PGRST301', 'PGRST302', '28000'].includes(code ?? '') || source.status === 401 || source.status === 403) {
    return new Error('Seu acesso não permite esta operação. Entre com a conta de administrador e tente novamente.');
  }
  if (['40001', 'PGRST116'].includes(code ?? '')) return new Error('Este lançamento foi alterado ou não está mais disponível. Atualize o extrato antes de editar novamente.');
  if (code === '23505') return new Error('Já existe um cadastro com esta identificação ou sigla. Atualize a página antes de tentar novamente.');
  if (code === '23503') return new Error('A sociedade não está mais disponível. Atualize a página e selecione uma sociedade válida.');
  if (['23514', '22003', '22007', '22008', '22023', '22P02'].includes(code ?? '')) return new Error('Os dados não são válidos. Confira valor, data e campos obrigatórios.');
  if (!code && error instanceof Error && !/fetch|network|load failed|timeout|abort/i.test(error.message)) return error;
  return new Error('Não foi possível concluir a operação. Confira sua conexão e tente novamente.');
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('A tesouraria retornou dados incompletos. Tente atualizar a página.');
  return value as Record<string, unknown>;
}

function string(value: unknown): string {
  if (typeof value !== 'string') throw new Error('A tesouraria retornou um campo inválido. Tente atualizar a página.');
  return value;
}

function nonnegative(value: unknown): number {
  const number = safeCents(value);
  if (number < 0) throw new Error('A tesouraria retornou um total inválido. Tente atualizar a página.');
  return number;
}

function readTotals(value: unknown): TreasuryTotals {
  const row = record(value);
  const totals = {
    balance_cents: safeCents(row.balance_cents),
    income_cents: nonnegative(row.income_cents),
    expense_cents: nonnegative(row.expense_cents),
    entry_count: nonnegative(row.entry_count),
    ...(row.reserved_cents === undefined ? {} : { reserved_cents: nonnegative(row.reserved_cents), available_cents: safeCents(row.available_cents) }),
  };
  if (totals.balance_cents !== sumCents([totals.income_cents, -totals.expense_cents])) throw new Error('Os totais recebidos estão inconsistentes. Atualize a página.');
  return totals;
}

export function decodeTreasuryDashboard(value: unknown): TreasuryDashboard {
  const raw = record(value);
  if (!Array.isArray(raw.funds) || !Array.isArray(raw.months)) throw new Error('O painel está incompleto. Atualize a página.');
  const funds = raw.funds.map(value => {
    const row = record(value);
    const fund = { id: string(row.id), name: string(row.name), abbreviation: string(row.abbreviation), color: string(row.color), ...readTotals(row) };
    validateTreasuryFund(fund);
    return fund;
  });
  const totals = readTotals(raw.totals);
  for (const key of ['balance_cents', 'income_cents', 'expense_cents', 'entry_count'] as const) {
    if (sumCents(funds.map(fund => fund[key])) !== totals[key]) throw new Error('Os saldos das sociedades não correspondem ao total recebido. Atualize a página.');
  }
  const months = raw.months.map(value => {
    const row = record(value);
    const month = string(row.month);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('O gráfico recebeu um mês inválido.');
    return { month, income_cents: nonnegative(row.income_cents), expense_cents: nonnegative(row.expense_cents) };
  });
  return { funds, totals, months };
}

export function decodeTreasuryEntry(value: unknown, withBalance = true): TreasuryEntry {
  const row = record(value);
  const entry = {
    id: string(row.id), fund_id: string(row.fund_id), kind: string(row.kind) as TreasuryKind,
    amount_cents: safeCents(row.amount_cents), occurred_on: string(row.occurred_on),
    person_name: string(row.person_name), description: string(row.description),
    status: (row.status ?? 'confirmed') as TreasuryStatus,
    payment_method: (row.payment_method ?? 'cash') as TreasuryPayment,
    shirt_cents: nonnegative(row.shirt_cents ?? 0), monthly_fee_cents: nonnegative(row.monthly_fee_cents ?? 0), per_capita_cents: nonnegative(row.per_capita_cents ?? 0),
    bank_transaction_id: row.bank_transaction_id ? string(row.bank_transaction_id) : null, review_note: string(row.review_note ?? ''),
    revision: nonnegative(row.revision), created_at: string(row.created_at), updated_at: string(row.updated_at),
    balance_after_cents: withBalance ? safeCents(row.balance_after_cents) : 0,
  };
  // A read must not reject a valid recorded date because the viewer uses a different timezone.
  validateTreasuryEntry(entry, '9999-12-31');
  if (entry.revision < 1) throw new Error('A revisão do lançamento é inválida.');
  return entry;
}

export function decodeTreasuryStatement(value: unknown): TreasuryStatement {
  const raw = record(value);
  if (!Array.isArray(raw.entries)) throw new Error('O extrato está incompleto. Atualize a página.');
  const entries = raw.entries.map(entry => decodeTreasuryEntry(entry));
  const total_count = nonnegative(raw.total_count);
  if (total_count < entries.length) throw new Error('A contagem do extrato está inconsistente. Atualize a página.');
  return { entries, total_count, income_cents: nonnegative(raw.income_cents), expense_cents: nonnegative(raw.expense_cents) };
}

/** A retry may only reuse a committed UUID when every financial field still matches. */
export function sameTreasuryEntry(actual: TreasuryEntryInput, expected: TreasuryEntryInput): boolean {
  const normalized = (value: TreasuryEntryInput) => ({ status: 'confirmed', payment_method: 'cash', shirt_cents: 0, monthly_fee_cents: 0, per_capita_cents: 0, bank_transaction_id: null, review_note: '', ...value });
  const a = normalized(actual), b = normalized(expected);
  return ['fund_id', 'kind', 'amount_cents', 'occurred_on', 'person_name', 'description', 'status', 'payment_method', 'shirt_cents', 'monthly_fee_cents', 'per_capita_cents', 'bank_transaction_id', 'review_note']
    .every(key => a[key as keyof TreasuryEntryInput] === b[key as keyof TreasuryEntryInput]);
}

export interface TreasuryInsertAdapter {
  insert: (input: TreasuryEntryInput & { id: string }) => Promise<{ data: unknown; error: unknown }>;
  findById: (id: string) => Promise<{ data: unknown; error: unknown }>;
}

/** Keep the same UUID after an ambiguous failure; never turn changed contents into a false success. */
export async function insertTreasuryEntryIdempotently(input: TreasuryEntryInput & { id: string }, adapter: TreasuryInsertAdapter): Promise<TreasuryEntry> {
  const normalized = { ...input, person_name: input.person_name.trim(), description: input.description.trim() };
  validateTreasuryEntry(normalized);
  if (!uuidPattern.test(normalized.id)) throw new Error('Identificador do lançamento inválido.');
  const result = await adapter.insert(normalized);
  if (result.error && typeof result.error === 'object' && 'code' in result.error && result.error.code === '23505') {
    const existing = await adapter.findById(normalized.id);
    if (existing.error) throw treasuryError(existing.error);
    if (existing.data) {
      const entry = decodeTreasuryEntry(existing.data, false);
      if (sameTreasuryEntry(entry, normalized)) return entry;
      throw new Error('Esta tentativa já foi registrada com outros dados. Confira o extrato e edite o lançamento existente.');
    }
  }
  if (result.error) throw treasuryError(result.error);
  return decodeTreasuryEntry(result.data, false);
}
