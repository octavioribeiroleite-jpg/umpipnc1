import { fixtureParams, fixtureRole, fixtureState } from '../diretoria/options.ts';

type Row = Record<string, unknown>;
type Result = { data: unknown; error: { message: string } | null };
const success = (data: unknown): Result => ({ data, error: null });
const blocked = (): Result => ({ data: null, error: { message: 'Escrita financeira desabilitada na fixture visual' } });
const session = { access_token: 'synthetic-treasury', refresh_token: 'synthetic-refresh', user: { id: '00000000-0000-0000-0000-000000000077', email: 'tesouraria@example.test' } };
let currentSession: typeof session | null = fixtureParams.get('treasury') === 'locked' || fixtureRole === 'anonymous' ? null : session;
const listeners = new Set<(event: string, value: typeof currentSession) => void>();
const publish = (event: string) => listeners.forEach(listener => listener(event, currentSession));
const funds = [
  { id: '00000000-0000-4000-8000-000000000078', name: 'União de Mocidade Presbiteriana — fictícia', abbreviation: 'UMP', color: '#4267a5', income_cents: 125000, expense_cents: 25000, balance_cents: 100000, entry_count: 2, reserved_cents: 10000, available_cents: 90000 },
  { id: '00000000-0000-4000-8000-000000000079', name: 'Sociedade Auxiliadora Feminina — fictícia', abbreviation: 'SAF', color: '#9b6584', income_cents: 75000, expense_cents: 15000, balance_cents: 60000, entry_count: 2, reserved_cents: 5000, available_cents: 55000 },
];
const entries = funds.flatMap((fund, i) => ['income', 'expense'].map((kind, j) => ({ id: `00000000-0000-4000-8000-00000000008${i * 2 + j}`, fund_id: fund.id, kind, amount_cents: kind === 'income' ? fund.income_cents : fund.expense_cents, occurred_on: '2026-10-04', person_name: `Pessoa Fictícia ${i * 2 + j + 1}`, description: kind === 'income' ? 'Recebimento fictício para conferência visual' : 'Despesa fictícia de materiais', status: 'confirmed', payment_method: 'cash', shirt_cents: 0, monthly_fee_cents: 0, per_capita_cents: 0, bank_transaction_id: null, review_note: '', revision: 1, created_at: '2026-10-04T12:00:00Z', updated_at: '2026-10-04T12:00:00Z', balance_after_cents: kind === 'income' ? fund.income_cents : fund.balance_cents })));
function result(name: string, args: Row): Result {
  if (fixtureState === 'error') return { data: null, error: { message: 'Falha fictícia na consulta da tesouraria' } };
  if (name === 'treasury_directory') return success(funds);
  if (name === 'treasury_access') return success({ admin: fixtureRole === 'admin', fund_ids: currentSession ? funds.map(fund => fund.id) : [] });
  if (!currentSession) return { data: null, error: { message: 'Acesso fictício necessário' } };
  if (name === 'treasury_dashboard') return success({ funds, totals: { income_cents: 200000, expense_cents: 40000, balance_cents: 160000, entry_count: 4, reserved_cents: 15000, available_cents: 145000 }, months: [{ month: '2026-09', income_cents: 75000, expense_cents: 15000 }, { month: '2026-10', income_cents: 125000, expense_cents: 25000 }] });
  if (name === 'treasury_statement') {
    const rows = entries.filter(entry => (!args.p_fund_id || entry.fund_id === args.p_fund_id) && (!args.p_kind || args.p_kind === 'all' || entry.kind === args.p_kind) && (!args.p_search || `${entry.person_name} ${entry.description}`.toLowerCase().includes(String(args.p_search).toLowerCase())));
    return success({ entries: rows, total_count: rows.length, income_cents: rows.filter(row => row.kind === 'income').reduce((sum, row) => sum + row.amount_cents, 0), expense_cents: rows.filter(row => row.kind === 'expense').reduce((sum, row) => sum + row.amount_cents, 0) });
  }
  if (name === 'treasury_review_queue') return success({ entries: [{ ...entries[0], id: '00000000-0000-4000-8000-000000000090', status: 'pending', description: 'Recebimento pendente fictício' }], total_count: 1 });
  if (name === 'treasury_pin_status') return success(funds.map(fund => ({ fund_id: fund.id, configured: true, active: true, updated_at: '2026-10-04T12:00:00Z' })));
  if (name === 'treasury_bank_reconciliation') return success([{ id: '00000000-0000-4000-8000-000000000091', revision: 1, reference: 'PIX FICTÍCIO PARA QA', occurred_on: '2026-10-04', kind: 'income', amount_cents: 125000, allocated_cents: 100000, remaining_cents: 25000 }]);
  if (name === 'treasury_admin_accounts') return success([]);
  return blocked();
}
export const treasuryClient = {
  channel() { const chain = { on() { return chain; }, subscribe() { return chain; }, unsubscribe() {} }; return chain; },
  async removeChannel() { return 'ok'; },
  storage: { from() { return { async upload() { return blocked(); }, async remove() { return blocked(); }, async download() { return blocked(); } }; } },
  rpc(name: string, args: Row = {}) {
    const chain = { abortSignal() { return chain; }, then(resolve: (value: Result) => unknown, reject?: (cause: unknown) => unknown) { return Promise.resolve(result(name, args)).then(resolve, reject); } };
    return chain;
  },
  from() {
    let isWrite = false;
    const chain = { select() { return chain; }, eq() { return chain; }, order() { return chain; }, maybeSingle() { return chain; }, single() { return chain; }, insert() { isWrite = true; return chain; }, update() { isWrite = true; return chain; }, upsert() { isWrite = true; return chain; }, delete() { isWrite = true; return chain; }, then(resolve: (value: Result) => unknown) { return Promise.resolve(isWrite ? blocked() : success([])).then(resolve); } };
    return chain;
  },
  auth: {
    async getSession() { return success({ session: currentSession }); },
    onAuthStateChange(callback: (event: string, value: typeof currentSession) => void) { listeners.add(callback); const timer = window.setTimeout(() => callback('INITIAL_SESSION', currentSession), 0); return { data: { subscription: { unsubscribe() { clearTimeout(timer); listeners.delete(callback); } } } }; },
    async setSession() { currentSession = session; publish('SIGNED_IN'); return success({ session: currentSession }); },
    async signOut() { currentSession = null; publish('SIGNED_OUT'); return { error: null }; },
  },
  functions: { async invoke(name: string, options: { body: Row }) {
    if (name === 'treasury-pin-login' && options.body.pin === '123456') return success({ session });
    if (name === 'account-login' && options.body.username === 'admin-ficticio' && options.body.password === 'senha-ficticia') return success({ session });
    return success({ error: 'Dados fictícios incorretos' });
  } },
};
export const supabase = treasuryClient;
