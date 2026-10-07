import { useWorkspaceTheme } from '@/hooks/useWorkspaceTheme';
import type { CSSProperties, ReactNode } from 'react';
import { ArrowDownLeft, ArrowLeft, ArrowRight, ArrowUpRight, ChartNoAxesCombined, CircleHelp, Eye, LayoutDashboard, LockKeyhole, LogOut, Plus, RefreshCw, Search, Share2, Wallet, Pencil, ReceiptText } from 'lucide-react';
import { NavigationSidebar, NavigationRail } from '@/components/layout/WorkspaceNavigation';
import { WorkspaceHeader } from '@/components/layout/WorkspaceHeader';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { formatCents, type TreasuryEntry, type TreasuryFund } from '@/lib/treasury';
import './treasury-dashboard.css';

export interface TreasuryMonth { month: string; income_cents: number; expense_cents: number }
export interface TreasurySnapshot {
  funds: TreasuryFund[];
  months: TreasuryMonth[];
  totals: { balance_cents: number; income_cents: number; expense_cents: number; entry_count: number; reserved_cents?: number; available_cents?: number };
}
export interface TreasuryFilters { search: string; kind: string; start: string; end: string }
interface Props {
  data?: TreasurySnapshot;
  loading?: boolean;
  error?: string;
  refreshing?: boolean;
  admin?: boolean;
  treasurer?: boolean;
  workflow?: ReactNode;
  signedIn?: boolean;
  selectedFundId?: string;
  entries: TreasuryEntry[];
  entriesLoading?: boolean;
  entriesError?: string;
  totalCount: number;
  page: number;
  filters: TreasuryFilters;
  filteredIncome: number;
  filteredExpense: number;
  updatedAt?: string;
  onFund: (id?: string) => void;
  onNewEntry: () => void;
  onNewFund: () => void;
  onEdit: (entry: TreasuryEntry) => void;
  onLogin: () => void;
  onLogout: () => void;
  onShare: () => void;
  onRefresh: () => void;
  onFilter: (filters: TreasuryFilters) => void;
  onPage: (page: number) => void;
}

const dateLabel = (value: string) => value.split('-').reverse().join('/');
const monthLabel = (value: string) => new Date(`${value}-15T12:00:00`).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
const defaultFunds = [
  { id: 'ump', abbreviation: 'UMP', name: 'União de Mocidade Presbiteriana', color: '#4267A5' },
  { id: 'saf', abbreviation: 'SAF', name: 'Sociedade Auxiliadora Feminina', color: '#9B6584' },
  { id: 'uph', abbreviation: 'UPH', name: 'União Presbiteriana de Homens', color: '#277463' },
  { id: 'upa', abbreviation: 'UPA', name: 'União Presbiteriana de Adolescentes', color: '#B17D32' },
];

function EmptyChart({ children }: { children: ReactNode }) {
  return <div className="tr-empty-chart"><ChartNoAxesCombined size={32} strokeWidth={1.3} aria-hidden="true" /><strong>A história começa com o primeiro lançamento</strong><p>{children}</p></div>;
}

export function TreasuryDashboard(props: Props) {
  useWorkspaceTheme();
  const { data, admin, selectedFundId, filters, loading, error } = props;
  const selected = data?.funds.find(fund => fund.id === selectedFundId);
  const currentMonth = data?.months[data.months.length - 1];
  const totals = selected ?? data?.totals;
  const funds = data?.funds ?? [];
  const maximumMonth = Math.max(1, ...(data?.months.flatMap(month => [month.income_cents, month.expense_cents]) ?? []));
  const maximumBalance = Math.max(1, ...funds.map(fund => Math.abs(fund.balance_cents)));
  const hasChartData = data?.months.some(month => month.income_cents || month.expense_cents);
  const hasFilters = Boolean(filters.search || filters.kind || filters.start || filters.end);
  const unavailable = Boolean(error) || !data;
  const money = (amount?: number) => unavailable || amount === undefined ? '—' : formatCents(amount);
  const pages = Math.max(1, Math.ceil(props.totalCount / 20));
  const filter = (key: keyof TreasuryFilters, value: string) => props.onFilter({ ...filters, [key]: value });

  const accessLabel = admin ? 'Acesso administrativo' : props.treasurer ? 'Acesso do tesoureiro' : 'Acesso necessário';
  const navigation = {
    items: [{ key: 'overview', label: 'Visão geral', icon: LayoutDashboard, active: !selectedFundId, onClick: () => props.onFund() }],
    groups: [{ key: 'societies', label: 'Sociedades', items: [
      ...(funds.length ? funds : defaultFunds).map(fund => ({ key: fund.id, label: `Caixa da ${fund.abbreviation}`, icon: Wallet, active: fund.id === selectedFundId, disabled: !data, onClick: () => props.onFund(fund.id), iconStyle: { color: fund.color } })),
      ...(admin ? [{ key: 'new', label: 'Nova sociedade', icon: Plus, active: false, disabled: !data, onClick: props.onNewFund }] : []),
    ] }],
    onHome: () => props.onFund(),
    homeLabel: 'Visão geral da tesouraria',
    navigationLabel: 'Navegação da tesouraria',
    onExit: () => window.location.assign('/'),
    exitLabel: 'Voltar ao Aplicativo IPNC',
  };

  return <div className="treasury-workspace ipnc-navigation-layout ipnc-safe-managed">
    <a className="tr-skip" href="#treasury-content">Pular para o conteúdo</a>
    <div className="hidden min-[1100px]:flex"><NavigationSidebar {...navigation} profile={{ name: 'Tesouraria da igreja', description: accessLabel }} /></div>
    <div className="hidden min-[700px]:flex min-[1100px]:hidden"><NavigationRail {...navigation} /></div>
    <div className="tr-main">
      <div className="tr-workspace-header"><WorkspaceHeader mobileTitle="Tesouraria" accountName={admin ? 'Administração' : props.treasurer ? 'Tesoureiro' : 'IPNC'} accountRole={accessLabel} onBack={() => window.location.assign('/')} actions={
        admin || props.treasurer ? <button className="tr-icon-button" onClick={props.onLogout} aria-label={admin ? "Sair do acesso administrativo" : "Sair da tesouraria"}><LogOut size={18} /></button> : <button className="tr-button tr-button-small" onClick={props.onLogin}><LockKeyhole size={15} /><span>Acesso do tesoureiro</span></button>
      } menu={<>
        <DropdownMenuItem onSelect={() => window.location.assign('/')}><ArrowLeft className="mr-2 h-4 w-4" />Voltar ao Aplicativo IPNC</DropdownMenuItem>
        <DropdownMenuItem onSelect={admin || props.treasurer ? props.onLogout : props.onLogin}><LockKeyhole className="mr-2 h-4 w-4" />{admin || props.treasurer ? 'Sair da tesouraria' : 'Acesso do tesoureiro'}</DropdownMenuItem>
      </>} /></div>
      <main id="treasury-content" className="tr-content">
        <div className="tr-title-row"><div>{selected ? <button className="tr-back" onClick={() => props.onFund()}><ArrowLeft size={14} />Visão geral</button> : <p className="tr-eyebrow">TRANSPARÊNCIA & CUIDADO</p>}<h1>{selected ? `Caixa da ${selected.abbreviation}` : 'Dashboard financeiro'}</h1><p>{selected ? selected.name : 'Os recursos de cada sociedade, em um só lugar.'}</p></div><div className="tr-heading-actions"><button className="tr-button" onClick={props.onShare}><Share2 size={16} />Compartilhar</button>{(admin || props.treasurer) && <button className="tr-button tr-primary" onClick={props.onNewEntry} disabled={!data}><Plus size={18} />{admin ? 'Novo lançamento' : 'Registrar recebimento'}</button>}</div></div>
        {admin && <nav className="tr-admin-navigation" aria-label="Ferramentas administrativas da tesouraria">{[
          ['treasury-content', 'Consolidado'], ['treasury-pending', 'Pendências'], ['treasury-bank', 'Conferência'], ['treasury-reports', 'Relatórios'], ['treasury-pins', 'PINs'],
        ].map(([id, label]) => <a key={id} href={`#${id}`} onClick={() => {
          const target = document.getElementById(id);
          if (target instanceof HTMLDetailsElement) target.open = true;
        }}>{label}</a>)}</nav>}

        {loading && <div className="tr-status" role="status"><RefreshCw className="tr-spin" size={18} />Consultando os caixas das sociedades…</div>}
        {error && <div className="tr-error" role="alert"><strong>Os valores estão indisponíveis neste momento.</strong><p>{error}</p><button className="tr-button" disabled={props.refreshing} onClick={props.onRefresh}>Tentar novamente</button></div>}
        {selectedFundId && data && !selected && <div className="tr-error" role="alert"><strong>Sociedade não encontrada.</strong><button className="tr-button" onClick={() => props.onFund()}>Voltar à visão geral</button></div>}

        <section className="tr-stats" aria-label="Resumo financeiro">
          <article className="tr-total"><div className="tr-stat-top"><span>{selected ? 'Saldo da sociedade' : 'Saldo total das sociedades'}</span><Wallet size={20} /></div><strong className="tr-big-value">{money(totals?.balance_cents)}</strong><p>{selected ? 'Entradas e saídas confirmadas de todo o período' : 'Valores registrados sob a guarda da tesouraria'}</p><span className={`tr-total-detail ${unavailable ? '' : 'tr-total-count'}`}><span className="tr-live-dot" />{unavailable ? 'Aguardando consulta' : totals?.entry_count ? `${totals.entry_count} lançamentos registrados` : 'Nenhum lançamento registrado'}</span></article>
          <article className="tr-stat"><span className="tr-stat-icon income"><ArrowDownLeft size={20} /></span><span>{selected ? 'Total de entradas' : 'Entradas neste mês'}</span><strong>{money(selected?.income_cents ?? currentMonth?.income_cents)}</strong><p>{selected ? 'Todo o período' : 'Movimentações do mês atual'}</p></article>
          <article className="tr-stat"><span className="tr-stat-icon expense"><ArrowUpRight size={20} /></span><span>{selected ? 'Total de saídas' : 'Saídas neste mês'}</span><strong>{money(selected?.expense_cents ?? currentMonth?.expense_cents)}</strong><p>{selected ? 'Todo o período' : 'Movimentações do mês atual'}</p></article>
        </section>
        <div className="tr-context-note"><CircleHelp size={14} /><p>Saldo calculado apenas com lançamentos confirmados. Pendências ficam fora do saldo. Não representa uma consulta automática ao banco.</p></div>

        {!unavailable && <div className="tr-reserve"><span>Per capita reservada <strong>{money(totals?.reserved_cents ?? 0)}</strong></span><span>Disponível após reserva <strong>{money(totals?.available_cents ?? totals?.balance_cents)}</strong></span></div>}
        {!selectedFundId && <>
          <section className="tr-societies" aria-labelledby="tr-societies-heading"><div className="tr-section-heading"><div><h2 id="tr-societies-heading">Caixas das sociedades</h2><p>Selecione uma sociedade para consultar o extrato.</p></div>{admin ? <button className="tr-button tr-button-small" disabled={!data} onClick={props.onNewFund}><Plus size={15} />Nova sociedade</button> : <span className="tr-count">{data ? `${funds.length} sociedades` : 'UMP · SAF · UPH · UPA'}</span>}</div><div className="tr-fund-grid">{(data ? funds : defaultFunds).map(fund => {
            const loaded = funds.find(item => item.id === fund.id);
            return <button className="tr-fund-card" key={fund.id} onClick={() => props.onFund(fund.id)} disabled={!data} aria-label={`Consultar extrato da ${fund.abbreviation}`} style={{ '--fund-color': fund.color } as CSSProperties}><div className="tr-fund-title"><span className="tr-fund-badge">{fund.abbreviation}</span><ArrowUpRight size={18} /></div><h3>{fund.name}</h3><span className="tr-fund-label">Saldo em caixa</span><strong className={loaded && loaded.balance_cents < 0 ? 'tr-negative' : ''}>{money(loaded?.balance_cents)}</strong><div className="tr-fund-footer"><span className={loaded ? 'tr-fund-count' : undefined}>{loaded ? loaded.entry_count ? `${loaded.entry_count} lançamentos` : 'Sem lançamentos' : 'Saldo indisponível'}</span><span>Ver extrato <ArrowRight size={13} /></span></div></button>;
          })}</div>{data && !funds.length && <p className="tr-inline-empty">Nenhuma sociedade cadastrada. O administrador pode criar o primeiro caixa.</p>}</section>

          <section className="tr-charts" aria-label="Gráficos financeiros"><article className="tr-panel"><div className="tr-section-heading"><div><h2>Entradas e saídas</h2><p>Movimentação das sociedades nos últimos 6 meses</p></div><ChartNoAxesCombined size={18} /></div>{hasChartData ? <><div className="tr-chart-legend"><span><i className="income" />Entradas</span><span><i className="expense" />Saídas</span></div><div className="tr-month-chart" role="img" aria-label="Gráfico de entradas e saídas mensais. Os valores completos estão na tabela abaixo.">{data?.months.map(month => <div className="tr-month-column" key={month.month}><div className="tr-bar-pair"><div className="tr-month-bar income" style={{ height: `${month.income_cents / maximumMonth * 100}%` }} title={`Entradas: ${formatCents(month.income_cents)}`} /><div className="tr-month-bar expense" style={{ height: `${month.expense_cents / maximumMonth * 100}%` }} title={`Saídas: ${formatCents(month.expense_cents)}`} /></div><span>{monthLabel(month.month)}</span></div>)}</div><details className="tr-chart-data"><summary>Consultar valores do gráfico</summary><table><caption className="sr-only">Valores mensais em reais</caption><thead><tr><th>Mês</th><th>Entradas</th><th>Saídas</th></tr></thead><tbody>{data?.months.map(month => <tr key={month.month}><th>{month.month.split('-').reverse().join('/')}</th><td>{formatCents(month.income_cents)}</td><td>{formatCents(month.expense_cents)}</td></tr>)}</tbody></table></details></> : <EmptyChart>{unavailable ? 'Os gráficos aparecerão quando a consulta estiver disponível.' : 'As entradas e saídas aparecerão aqui conforme forem registradas.'}</EmptyChart>}</article>
            <article className="tr-panel"><div className="tr-section-heading"><div><h2>Saldo por sociedade</h2><p>Comparativo dos caixas · todo o período</p></div><Wallet size={18} /></div>{data?.totals.entry_count ? <div className="tr-balance-chart">{funds.map(fund => <div key={fund.id} className="tr-balance-row"><div><span><i style={{ backgroundColor: fund.color }} />{fund.abbreviation}</span><strong className={fund.balance_cents < 0 ? 'tr-negative' : ''}>{formatCents(fund.balance_cents)}</strong></div><div className="tr-balance-track"><span style={{ width: `${Math.abs(fund.balance_cents) / maximumBalance * 100}%`, backgroundColor: fund.balance_cents < 0 ? 'hsl(var(--destructive))' : fund.color }} /></div></div>)}<p className="tr-chart-footnote">Comprimento proporcional ao valor absoluto. Saldos negativos aparecem com sinal de menos.</p></div> : <EmptyChart>{unavailable ? 'Aguardando os saldos das sociedades.' : 'Nenhum valor registrado. Os caixas começarão a ganhar forma aqui.'}</EmptyChart>}</article></section>
        </>}

        {props.workflow}
        <section className="tr-panel tr-statement" aria-labelledby="tr-statement-heading"><div className="tr-section-heading"><div><h2 id="tr-statement-heading">{selected ? `Extrato da ${selected.abbreviation}` : 'Movimentações recentes'}</h2><p>{selected ? 'Somente entradas e saídas confirmadas, com o saldo após o lançamento.' : 'Histórico confirmado de todas as sociedades, do mais recente ao mais antigo.'}</p></div><ReceiptText size={19} /></div>
          <div className="tr-filters"><label className="tr-search"><span>Buscar pessoa ou descrição</span><span className="tr-search-control"><Search size={16} aria-hidden="true" /><input value={filters.search} onChange={event => filter('search', event.target.value)} placeholder="Nome ou descrição" maxLength={120} /></span></label><label><span>Tipo</span><select value={filters.kind} onChange={event => filter('kind', event.target.value)}><option value="">Todas as movimentações</option><option value="income">Entradas</option><option value="expense">Saídas</option></select></label><label><span>De</span><input type="date" value={filters.start} max={filters.end || undefined} onChange={event => filter('start', event.target.value)} /></label><label><span>Até</span><input type="date" value={filters.end} min={filters.start || undefined} onChange={event => filter('end', event.target.value)} /></label>{hasFilters && <button className="tr-clear" onClick={() => props.onFilter({ search: '', kind: '', start: '', end: '' })}>Limpar</button>}</div>
          {filters.start && filters.end && filters.start > filters.end ? <p role="alert" className="tr-filter-error">A data final deve ser igual ou posterior à inicial.</p> : props.entriesError ? <div className="tr-inline-empty" role="alert"><strong>Não foi possível consultar o extrato.</strong><p>{props.entriesError}</p><button className="tr-button" onClick={props.onRefresh}>Tentar novamente</button></div> : props.entriesLoading ? <div className="tr-inline-empty" role="status">Carregando movimentações…</div> : !props.entries.length ? <div className="tr-statement-empty"><span><ReceiptText size={25} strokeWidth={1.4} /></span><h3>{unavailable ? 'Extrato indisponível' : hasFilters ? 'Nenhum lançamento neste filtro' : 'Tudo começa com o primeiro registro'}</h3><p>{unavailable ? 'Tente atualizar a consulta em alguns instantes.' : hasFilters ? 'Altere o período ou a busca para consultar outras movimentações.' : admin ? 'Cadastre uma entrada ou saída. Se já houver dinheiro em caixa, registre uma entrada com a descrição “Saldo inicial”.' : 'A tesouraria ainda não registrou movimentações neste caixa.'}</p>{admin && data && !hasFilters && <button className="tr-button tr-primary" onClick={props.onNewEntry}><Plus size={16} />Registrar lançamento</button>}</div> : <>
            <div className="tr-statement-totals"><span>{props.totalCount} lançamentos encontrados</span><span>Entradas <strong className="tr-positive">{formatCents(props.filteredIncome)}</strong></span><span>Saídas <strong className="tr-negative">{formatCents(props.filteredExpense)}</strong></span></div>
            <div className="tr-table-wrap"><table className="tr-table"><caption className="sr-only">Movimentações {selected?.abbreviation ?? 'de todas as sociedades'}</caption><thead><tr><th>Data</th><th>Pessoa e descrição</th>{!selected && <th>Sociedade</th>}<th>Valor</th><th>Saldo do caixa</th>{admin && <th><span className="sr-only">Ações</span></th>}</tr></thead><tbody>{props.entries.map(entry => <tr key={entry.id}><td data-label="Data">{dateLabel(entry.occurred_on)}</td><td className="tr-entry-description"><strong>{entry.person_name}</strong><span>{entry.description}</span></td>{!selected && <td data-label="Sociedade"><span className="tr-table-fund">{funds.find(fund => fund.id === entry.fund_id)?.abbreviation ?? 'Sociedade'}</span></td>}<td data-label={entry.kind === 'income' ? 'Entrada' : 'Saída'} className={entry.kind === 'income' ? 'tr-positive' : 'tr-negative'}><span className="tr-amount">{entry.kind === 'income' ? <ArrowDownLeft size={14} aria-hidden="true" /> : <ArrowUpRight size={14} aria-hidden="true" />}{entry.kind === 'income' ? '+' : '−'} {formatCents(entry.amount_cents)}</span></td><td data-label="Saldo do caixa" className="tr-running-balance">{entry.balance_after_cents === undefined ? '—' : formatCents(entry.balance_after_cents)}</td>{admin && <td className="tr-edit-cell"><button className="tr-icon-button" aria-label={`Editar lançamento de ${entry.person_name} em ${dateLabel(entry.occurred_on)}`} onClick={() => props.onEdit(entry)}><Pencil size={15} /><span>Editar</span></button></td>}</tr>)}</tbody></table></div>
            <div className="tr-pagination"><p>Página {props.page + 1} de {pages}</p><div><button className="tr-button tr-button-small" disabled={props.page === 0} onClick={() => props.onPage(props.page - 1)}><ArrowLeft size={15} />Anterior</button><button className="tr-button tr-button-small" disabled={props.page + 1 >= pages} onClick={() => props.onPage(props.page + 1)}>Próxima<ArrowRight size={15} /></button></div></div><p className="tr-statement-note">O saldo de cada linha considera todo o histórico da sociedade até aquele lançamento, inclusive os registros fora do filtro.</p>
          </>}
        </section>
        <footer className="tr-footer"><span><Eye size={14} />{admin ? 'Acesso administrativo · todas as sociedades' : props.treasurer ? 'Acesso protegido · somente sua sociedade' : 'Entre para consultar a tesouraria'}</span><button disabled={props.refreshing} onClick={props.onRefresh}><RefreshCw size={13} className={props.refreshing ? 'tr-spin' : ''} />{props.refreshing ? 'Atualizando…' : props.updatedAt ? `Atualizado às ${props.updatedAt}` : 'Atualizar consulta'}</button><a href="/" title="Igreja Presbiteriana de Nova Carapina">Aplicativo IPNC <ArrowUpRight size={12} /></a></footer>
      </main>
    </div>
  </div>;
}
