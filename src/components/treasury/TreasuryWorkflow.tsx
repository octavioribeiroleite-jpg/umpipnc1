import { useRef, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { useTreasuryQueue, useTreasuryBank, useTreasuryAdministration, useTreasuryWorkflowMutations, fetchTreasuryReport, downloadTreasuryReceipt } from '@/hooks/useTreasuryWorkflow';
import { centsToInput, formatCents, formatTreasuryDate, parseBrlToCents, todayLocal, type TreasuryEntry, type TreasuryFund } from '@/lib/treasury';
import { savePdfFile } from '@/lib/treasury-download';
import './treasury-workflow.css';

export function TreasuryWorkflow({ admin, managedFunds, funds, fundId, onEdit }: { admin: boolean; managedFunds: string[]; funds: TreasuryFund[]; fundId?: string; onEdit: (entry: TreasuryEntry) => void }) {
  const [page, setPage] = useState(0);
  const queue = useTreasuryQueue(fundId, page, true);
  const writableFunds = admin ? funds : funds.filter(fund => managedFunds.includes(fund.id));
  return <div className="tr-workflow">
    <section className="tr-panel" aria-label="Recebimentos pendentes"><div className="tr-section-heading"><div><h2>Conferência de recebimentos</h2><p>Aguardando confirmação e devolvidos. Estes valores não compõem o saldo.</p></div><span className="tr-count">{queue.data?.total_count ?? '—'}</span></div>
      {queue.isPending ? <p role="status">Carregando pendências…</p> : queue.error ? <p role="alert">{queue.error.message}</p> : !queue.data?.entries.length ? <p className="tr-inline-empty">Nenhuma pendência nesta sociedade.</p> : <div className="tr-review-list">{queue.data.entries.map(entry => <article className="tr-review-item" key={entry.id}><div><span className={`tr-review-status ${entry.status}`}>{entry.status === 'pending' ? 'Aguardando confirmação' : 'Devolvido'}</span><strong>{entry.person_name}</strong><p>{entry.description}</p><small>{formatTreasuryDate(entry.occurred_on)} · {funds.find(f => f.id === entry.fund_id)?.abbreviation}</small>{entry.review_note && <p>Conferência: {entry.review_note}</p>}</div><div><strong>{formatCents(entry.amount_cents)}</strong>{admin && <button className="tr-button" onClick={() => onEdit(entry)}>Conferir / ajustar</button>}</div></article>)}</div>}
      {(page > 0 || (queue.data?.total_count ?? 0) > 20) && <div className="tr-pagination"><button className="tr-button" disabled={!page} onClick={() => setPage(p => p - 1)}>Anterior</button><span>Página {page + 1}</span><button className="tr-button" disabled={(page + 1) * 20 >= (queue.data?.total_count ?? 0)} onClick={() => setPage(p => p + 1)}>Próxima</button></div>}
    </section>
    <TreasuryReports funds={writableFunds} admin={admin} selectedFund={fundId} />
    {admin && <><TreasuryBankPanel /><TreasuryManagers funds={funds} /></>}
  </div>;
}

function TreasuryReports({ funds, admin, selectedFund }: { funds: TreasuryFund[]; admin: boolean; selectedFund?: string }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [choice, setChoice] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const effective = choice || (funds.some(f => f.id === selectedFund) ? selectedFund : undefined) || (!admin ? funds[0]?.id : undefined);
  const download = async (annual: boolean) => { if (busy) return; setBusy(true); setError(''); try {
    const report = await fetchTreasuryReport(year, effective === 'all' ? undefined : effective);
    const { generateTreasuryReport } = await import('@/lib/treasury-report');
    const bytes = await generateTreasuryReport(report, { annual, loadAttachment: downloadTreasuryReceipt });
    savePdfFile(bytes, `${annual ? 'Prestacao_Anual' : 'Relatorio'}_IPNC_${year}_${report.funds.map(f => f.abbreviation).join('-')}.pdf`);
    toast.success('PDF gerado com os valores confirmados.');
  } catch (error) { setError((error as Error).message); } finally { setBusy(false); } };
  return <details className="tr-panel tr-admin-section"><summary>Relatórios e prestação de contas</summary><p className="treasury-field-help">O relatório inclui saldo anterior, valores confirmados e reserva de per capita. A prestação anual também incorpora os comprovantes.</p><div className="tr-report-controls"><label>Ano<input type="number" min={1900} max={new Date().getFullYear()} value={year} disabled={busy} onChange={e => setYear(Number(e.target.value))} /></label><label>Sociedade<select value={effective ?? 'all'} disabled={busy} onChange={e => setChoice(e.target.value)}>{admin && <option value="all">Todas as sociedades</option>}{funds.map(f => <option value={f.id} key={f.id}>{f.abbreviation}</option>)}</select></label><button className="tr-button" disabled={busy || (!admin && !effective)} onClick={() => void download(false)}>Baixar relatório PDF</button><button className="tr-button tr-primary" disabled={busy || (!admin && !effective)} onClick={() => void download(true)}>Prestação anual com anexos</button></div>{busy && <p role="status">Preparando PDF e comprovantes…</p>}{error && <p role="alert" className="treasury-form-error">{error}</p>}</details>;
}

function TreasuryBankPanel() {
  const bank = useTreasuryBank(true);
  const { createBank } = useTreasuryWorkflowMutations();
  const [form, setForm] = useState({ reference: '', occurred_on: todayLocal(), kind: 'income' as 'income' | 'expense', amount: '' });
  const id = useRef(crypto.randomUUID());
  const [editing, setEditing] = useState<{ id: string; revision: number } | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const rows = (bank.data ?? []).filter(row => row.reference.toLowerCase().includes(search.toLowerCase()));
  let enteredAmount = 0; try { enteredAmount = parseBrlToCents(form.amount); } catch { /* Still typing. */ }
  const possibleDuplicates = bank.data?.filter(row => row.id !== editing?.id && row.occurred_on === form.occurred_on && row.kind === form.kind && row.amount_cents === enteredAmount) ?? [];
  const submit = async (event: FormEvent) => { event.preventDefault(); if (createBank.isPending) return; setError(''); try { await createBank.mutateAsync({ id: editing?.id ?? id.current, revision: editing?.revision, reference: form.reference, occurred_on: form.occurred_on, kind: form.kind, amount_cents: parseBrlToCents(form.amount) }); setForm(f => ({ ...f, reference: '', amount: '' })); id.current = crypto.randomUUID(); setEditing(null); toast.success('Movimento disponível para conferência.'); } catch (error) { setError((error as Error).message); } };
  return <details className="tr-panel tr-admin-section"><summary>Conferência bancária</summary><p>Cadastre uma linha por crédito ou débito do banco usando a referência única (E2E do Pix ou identificação da transação). Depois vincule os lançamentos. A divisão entre camisa, mensalidade e per capita fica no mesmo recebimento.</p>
    <form onSubmit={submit}><fieldset disabled={createBank.isPending} className="tr-bank-form"><legend className="sr-only">Novo movimento bancário</legend><label>Referência bancária<input minLength={6} maxLength={150} required value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} placeholder="E2E ou identificação única" /></label><label>Data<input type="date" required max={todayLocal()} value={form.occurred_on} onChange={e => setForm(f => ({ ...f, occurred_on: e.target.value }))} /></label><label>Tipo<select value={form.kind} onChange={e => setForm(f => ({ ...f, kind: e.target.value as 'income' | 'expense' }))}><option value="income">Crédito / entrada</option><option value="expense">Débito / saída</option></select></label><label>Valor no banco (R$)<input inputMode="decimal" required value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0,00" /></label><button type="submit" className="tr-button tr-primary">{createBank.isPending ? 'Salvando…' : editing ? 'Salvar correção bancária' : 'Cadastrar movimento'}</button>{editing && <button type="button" className="tr-button" onClick={() => { setEditing(null); setForm(f => ({ ...f, reference: '', amount: '' })); }}>Cancelar correção</button>}</fieldset></form>
    {possibleDuplicates.length > 0 && <p className="tr-review-status pending" role="status">Já há movimentos de mesmo valor e data: {possibleDuplicates.map(row => row.reference).join(', ')}. Confira a referência antes de criar outro crédito ou débito.</p>}
    {(error || bank.error) && <p role="alert" className="treasury-form-error">{error || bank.error?.message}</p>}
    <label className="tr-bank-search">Buscar referência<input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} /></label>
    <div className="tr-review-list">{rows.slice(page * 10, page * 10 + 10).map(row => <article className="tr-review-item" key={row.id}><div><strong>{row.reference}</strong><small>{formatTreasuryDate(row.occurred_on)} · {row.kind === 'income' ? 'Crédito' : 'Débito'}</small><button className="tr-button" disabled={createBank.isPending} onClick={() => { setEditing({ id: row.id, revision: row.revision }); setForm({ reference: row.reference, occurred_on: row.occurred_on, kind: row.kind, amount: centsToInput(row.amount_cents) }); }}>Corrigir movimento</button></div><div><strong>{formatCents(row.amount_cents)}</strong><span className={row.remaining_cents ? 'tr-review-status pending' : 'tr-review-status confirmed'}>{row.remaining_cents ? `Falta vincular ${formatCents(row.remaining_cents)}` : 'Conferido integralmente'}</span></div></article>)}</div>
    {!rows.length && !bank.isPending && <p>Nenhum movimento bancário neste filtro.</p>}{rows.length > 10 && <div className="tr-pagination"><button className="tr-button" disabled={!page} onClick={() => setPage(p => p - 1)}>Anterior</button><span>Página {page + 1}</span><button className="tr-button" disabled={(page + 1) * 10 >= rows.length} onClick={() => setPage(p => p + 1)}>Próxima</button></div>}
    <p className="treasury-field-help">Referências e comprovantes são privados. O cadastro não importa lançamentos das finanças antigas nem altera cobranças de camisas ou mensalidades.</p>
  </details>;
}
function TreasuryManagers({ funds }: { funds: TreasuryFund[] }) {
  const administration = useTreasuryAdministration(true);
  const { assign } = useTreasuryWorkflowMutations();
  const [user, setUser] = useState(''); const [fund, setFund] = useState(''); const [error, setError] = useState('');
  const save = async (user_id: string, fund_id: string, revoke = false) => { setError(''); try { await assign.mutateAsync({ user_id, fund_id, revoke }); toast.success(revoke ? 'Permissão revogada.' : 'Tesoureiro vinculado à sociedade.'); } catch (error) { setError((error as Error).message); } };
  return <details className="tr-panel tr-admin-section"><summary>Acesso dos tesoureiros</summary><p>Vincule uma conta existente à sua sociedade. A conta poderá enviar recebimentos e baixar relatórios dessa sociedade. Confirmar e editar continuam sendo ações administrativas.</p><form onSubmit={e => { e.preventDefault(); void save(user, fund); }}><fieldset disabled={assign.isPending} className="tr-report-controls"><legend className="sr-only">Vincular tesoureiro</legend><label>Conta<select required value={user} onChange={e => setUser(e.target.value)}><option value="">Selecione a conta</option>{administration.data?.accounts.map(a => <option key={a.user_id} value={a.user_id}>{a.name} ({a.username})</option>)}</select></label><label>Sociedade<select required value={fund} onChange={e => setFund(e.target.value)}><option value="">Selecione a sociedade</option>{funds.map(f => <option key={f.id} value={f.id}>{f.abbreviation}</option>)}</select></label><button className="tr-button" type="submit">Vincular tesoureiro</button></fieldset></form>
    {administration.data?.managers.map(m => <div key={`${m.user_id}:${m.fund_id}`} className="tr-manager-row"><span>{administration.data.accounts.find(a => a.user_id === m.user_id)?.name ?? 'Conta indisponível'} · {funds.find(f => f.id === m.fund_id)?.abbreviation}</span><button className="tr-button" disabled={assign.isPending} onClick={() => void save(m.user_id, m.fund_id, true)}>Revogar acesso</button></div>)}
    {(error || administration.error) && <p role="alert" className="treasury-form-error">{error || administration.error?.message}</p>}
  </details>;
}
