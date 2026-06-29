import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeftRight,
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  Bell,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  DollarSign,
  FileBarChart,
  FileCheck2,
  Landmark,
  MoreHorizontal,
  Plus,
  Receipt,
  ReceiptText,
  Shirt,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { HorizontalScroller, MetricGrid } from '@/components/layout/ResponsivePrimitives';
import { MetricCard } from '@/components/ui/metric-card';
import { AppCard } from '@/components/ui/app-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MensalidadesTab } from '@/components/financas/MensalidadesTab';
import { GastosTab } from '@/components/financas/GastosTab';
import { CobrancasTab } from '@/components/financas/CobrancasTab';
import { CamisasTab } from '@/components/financas/CamisasTab';
import { ConfiguracoesTab } from '@/components/financas/ConfiguracoesTab';
import { RelatoriosTab } from '@/components/financas/RelatoriosTab';
import { ComprovantesTab } from '@/components/financas/ComprovantesTab';
import { ExtratoDialog, type ExtratoType } from '@/components/financas/ExtratoDialog';
import { cn } from '@/lib/utils';
import '@/finance-responsive.css';

interface Society {
  id: string;
  name: string;
}

interface Stats {
  saldo: number;
  receitasTotal: number;
  gastosTotal: number;
  entradasMes: number;
  saidasMes: number;
  pendencias: number;
  comprovantesPendentes: number;
  cobrancasPendentes: number;
}

interface SocietySummary {
  id: string;
  name: string;
  saldo: number;
  entradasMes: number;
  saidasMes: number;
  pendencias: number;
  fechamento: 'Aberto' | 'Conferido';
}

interface RecentMovement {
  id: string;
  date: string;
  society: string;
  type: string;
  description: string;
  amount: number;
  status: string;
}

type MainFinanceTab = 'cobrancas' | 'comprovantes' | 'movimentacoes' | 'camisas' | 'relatorios' | 'mais';
type MovementView = 'receitas' | 'gastos';

const mainTabs: Array<{
  value: MainFinanceTab;
  label: string;
  shortLabel: string;
  icon: typeof ReceiptText;
}> = [
  { value: 'cobrancas', label: 'Cobranças', shortLabel: 'Cobranças', icon: ReceiptText },
  { value: 'comprovantes', label: 'Comprovantes', shortLabel: 'Comprov.', icon: FileCheck2 },
  { value: 'movimentacoes', label: 'Movimentações', shortLabel: 'Movim.', icon: ArrowLeftRight },
  { value: 'camisas', label: 'Camisas', shortLabel: 'Camisas', icon: Shirt },
  { value: 'relatorios', label: 'Relatórios', shortLabel: 'Relatórios', icon: BarChart3 },
  { value: 'mais', label: 'Mais', shortLabel: 'Mais', icon: MoreHorizontal },
];

const formatCurrency = (value: number) => `R$ ${Number(value || 0).toFixed(2).replace('.', ',')}`;

const monthNames = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const getMonthWindow = () => {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const startOfMonth = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];
  const endOfMonth = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0];
  const competence = `${monthNames[currentMonth]}/${currentYear}`;
  const label = `${monthNames[currentMonth]} / ${currentYear}`;

  return { startOfMonth, endOfMonth, competence, label };
};

const formatDate = (date: string) => {
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
};

const movementTypeLabel = (type: string) => type === 'entrada' ? 'Entrada' : type === 'saida' ? 'Saída' : 'Movimentação';

const statusBadgeClass = (status: string) => {
  if (status === 'Pago' || status === 'Conferido') return 'bg-success/10 text-success border-success/20';
  if (status === 'Em análise' || status === 'Aberto') return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/20';
  return 'bg-primary/10 text-primary border-primary/20';
};

function normalizeMainTab(tab: string | null): MainFinanceTab {
  if (tab === 'receitas' || tab === 'gastos') return 'movimentacoes';
  if (tab === 'configuracoes') return 'mais';
  if (mainTabs.some((item) => item.value === tab)) return tab as MainFinanceTab;
  return 'cobrancas';
}

export default function Financas() {
  const {
    isAdmin,
    isPastor,
    selectedSocietyId,
    setSelectedSocietyId,
    effectiveSocietyId: societyId,
    profile,
    society,
  } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialRawTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<MainFinanceTab>(normalizeMainTab(initialRawTab));
  const [movementView, setMovementView] = useState<MovementView>(initialRawTab === 'gastos' ? 'gastos' : 'receitas');
  const [stats, setStats] = useState<Stats>({
    saldo: 0,
    receitasTotal: 0,
    gastosTotal: 0,
    entradasMes: 0,
    saidasMes: 0,
    pendencias: 0,
    comprovantesPendentes: 0,
    cobrancasPendentes: 0,
  });
  const [societies, setSocieties] = useState<Society[]>([]);
  const [societySummary, setSocietySummary] = useState<SocietySummary[]>([]);
  const [recentMovements, setRecentMovements] = useState<RecentMovement[]>([]);
  const [extratoType, setExtratoType] = useState<ExtratoType | null>(null);
  const monthWindow = getMonthWindow();
  const isCentralScope = (isAdmin || isPastor) && !selectedSocietyId;
  const selectedScopeLabel = selectedSocietyId
    ? societies.find((item) => item.id === selectedSocietyId)?.name || society?.name || 'Sociedade'
    : isCentralScope
      ? 'Geral'
      : society?.name || 'Sociedade';
  const firstName = profile?.full_name?.split(' ')[0] || 'Tesouraria';
  const roleLabel = isCentralScope ? 'Tesouraria central das sociedades' : `Tesouraria ${selectedScopeLabel}`;

  useEffect(() => {
    if (!isAdmin && !isPastor) return;

    void supabase
      .from('societies')
      .select('id, name')
      .eq('active', true)
      .order('name')
      .then(({ data }) => {
        if (!data) return;
        setSocieties(data);
      });
  }, [isAdmin, isPastor]);

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    setActiveTab(normalizeMainTab(tabFromUrl));
    if (tabFromUrl === 'receitas' || tabFromUrl === 'gastos') {
      setMovementView(tabFromUrl);
    }
  }, [searchParams]);

  const handleTabChange = (value: string) => {
    const tab = value as MainFinanceTab;
    setActiveTab(tab);
    const urlTab = tab === 'movimentacoes'
      ? movementView
      : tab === 'mais'
        ? 'configuracoes'
        : tab;
    setSearchParams({ tab: urlTab });
  };

  const handleMovementChange = (view: MovementView) => {
    setMovementView(view);
    setActiveTab('movimentacoes');
    setSearchParams({ tab: view });
  };

  useEffect(() => {
    const fetchStats = async () => {
      const { startOfMonth, endOfMonth, competence } = getMonthWindow();

      let chargesQuery = supabase
        .from('charges')
        .select('id, status, society_id')
        .eq('competence', competence);

      let transactionsQuery = supabase
        .from('transactions')
        .select('id, amount, type, date, description, society_id, receipt_url, created_at, societies(name)');

      if (societyId) {
        chargesQuery = chargesQuery.eq('society_id', societyId);
        transactionsQuery = transactionsQuery.eq('society_id', societyId);
      }

      let submissionsQuery = supabase
        .from('member_payment_submissions')
        .select('id, status, society_id')
        .eq('status', 'pendente');

      if (societyId) {
        submissionsQuery = submissionsQuery.eq('society_id', societyId);
      }

      const [chargesResult, transactionsResult] = await Promise.all([
        chargesQuery,
        transactionsQuery,
      ]);

      const submissionsResult = await submissionsQuery;
      const transactions = (transactionsResult.data || []) as any[];
      const totalEntradas = transactions
        .filter((transaction) => transaction.type === 'entrada')
        .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
      const totalSaidas = transactions
        .filter((transaction) => transaction.type === 'saida')
        .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
      const monthTransactions = transactions.filter((transaction) => transaction.date >= startOfMonth && transaction.date <= endOfMonth);
      const entradasMes = monthTransactions
        .filter((transaction) => transaction.type === 'entrada')
        .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
      const saidasMes = monthTransactions
        .filter((transaction) => transaction.type === 'saida')
        .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

      const charges = chargesResult.data || [];
      const cobrancasPendentes = charges.filter((charge) => charge.status === 'pendente').length;
      const comprovantesPendentes = submissionsResult.data?.length || 0;
      const recent = [...transactions]
        .sort((a, b) => `${b.date}${b.created_at || ''}`.localeCompare(`${a.date}${a.created_at || ''}`))
        .slice(0, 5)
        .map((transaction) => ({
          id: transaction.id,
          date: transaction.date,
          society: transaction.societies?.name || societies.find((item) => item.id === transaction.society_id)?.name || selectedScopeLabel,
          type: movementTypeLabel(transaction.type),
          description: transaction.description,
          amount: Number(transaction.amount),
          status: transaction.receipt_url ? 'Conferido' : transaction.type === 'saida' ? 'Pago' : 'Em análise',
        }));

      setStats({
        saldo: totalEntradas - totalSaidas,
        receitasTotal: totalEntradas,
        gastosTotal: totalSaidas,
        entradasMes,
        saidasMes,
        pendencias: cobrancasPendentes + comprovantesPendentes,
        comprovantesPendentes,
        cobrancasPendentes,
      });
      setRecentMovements(recent);

      if (!societyId && societies.length > 0) {
        setSocietySummary(societies.map((item) => {
          const societyTransactions = transactions.filter((transaction) => transaction.society_id === item.id);
          const societyMonthTransactions = monthTransactions.filter((transaction) => transaction.society_id === item.id);
          const entradas = societyTransactions.filter((transaction) => transaction.type === 'entrada').reduce((sum, transaction) => sum + Number(transaction.amount), 0);
          const saidas = societyTransactions.filter((transaction) => transaction.type === 'saida').reduce((sum, transaction) => sum + Number(transaction.amount), 0);
          const entradasDoMes = societyMonthTransactions.filter((transaction) => transaction.type === 'entrada').reduce((sum, transaction) => sum + Number(transaction.amount), 0);
          const saidasDoMes = societyMonthTransactions.filter((transaction) => transaction.type === 'saida').reduce((sum, transaction) => sum + Number(transaction.amount), 0);
          const pendingCharges = charges.filter((charge) => charge.society_id === item.id && charge.status === 'pendente').length;

          return {
            id: item.id,
            name: item.name,
            saldo: entradas - saidas,
            entradasMes: entradasDoMes,
            saidasMes: saidasDoMes,
            pendencias: pendingCharges,
            fechamento: pendingCharges === 0 ? 'Conferido' : 'Aberto',
          };
        }));
      } else {
        setSocietySummary([]);
      }
    };

    void fetchStats();

    const channel = supabase
      .channel('financas-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, fetchStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'charges' }, fetchStats)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [societyId, societies.length]);

  const showSocietySelector = (isAdmin || isPastor) && societies.length > 0;
  const societySelector = (className?: string) => showSocietySelector ? (
    <Select value={selectedSocietyId || 'all'} onValueChange={(value) => setSelectedSocietyId(value === 'all' ? null : value)}>
      <SelectTrigger className={cn('h-10 w-full rounded-xl border-white/25 bg-white/15 px-3 text-sm text-white shadow-sm backdrop-blur-md sm:w-60 [&>svg]:text-white/80', className)}>
        <SelectValue placeholder="Escopo: Geral" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Escopo: Geral</SelectItem>
        {societies.map((society) => (
          <SelectItem key={society.id} value={society.id}>{society.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  ) : null;

  const quickActions = [
    { label: 'Registrar entrada', icon: Plus, tab: 'movimentacoes' as MainFinanceTab, movement: 'receitas' as MovementView, tone: 'bg-success/10 text-success' },
    { label: 'Nova solicitação', icon: ClipboardList, tab: 'comprovantes' as MainFinanceTab, tone: 'bg-primary/10 text-primary' },
    { label: 'Executar pagamento', icon: CreditCard, tab: 'movimentacoes' as MainFinanceTab, movement: 'gastos' as MovementView, tone: 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300' },
    { label: 'Ver solicitações', icon: FileCheck2, tab: 'comprovantes' as MainFinanceTab, tone: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' },
    { label: 'Fechamento mensal', icon: CalendarDays, tab: 'relatorios' as MainFinanceTab, tone: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300' },
    { label: 'Gerar relatório', icon: FileBarChart, tab: 'relatorios' as MainFinanceTab, tone: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300' },
  ];

  const pendingItems = [
    { label: 'Cobranças aguardando pagamento', count: stats.cobrancasPendentes, icon: AlertCircle, tone: 'text-destructive bg-destructive/10' },
    { label: 'Comprovantes aguardando análise', count: stats.comprovantesPendentes, icon: Receipt, tone: 'text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-500/15' },
    { label: 'Sociedades com fechamento aberto', count: societyId ? (stats.pendencias > 0 ? 1 : 0) : societySummary.filter((item) => item.fechamento === 'Aberto').length, icon: CalendarDays, tone: 'text-primary bg-primary/10' },
  ];

  const openQuickAction = (action: typeof quickActions[number]) => {
    if (action.movement) {
      handleMovementChange(action.movement);
      return;
    }
    handleTabChange(action.tab);
  };

  return (
    <AppLayout>
      <div className="finance-page min-w-0">
        <section className="mb-4 rounded-[22px] border border-slate-200/70 bg-white/95 p-4 shadow-card md:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
                <Landmark className="h-4 w-4" />
                Escopo financeiro
              </div>
              <h1 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">Olá, {firstName}!</h1>
              <p className="text-sm text-muted-foreground md:text-base">{roleLabel}</p>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(160px,1fr)_minmax(180px,1fr)_auto] lg:min-w-[520px]">
              <Button type="button" variant="outline" className="justify-between rounded-xl bg-white/80">
                <span>{monthWindow.label}</span>
                <CalendarDays className="h-4 w-4" />
              </Button>
              {showSocietySelector ? (
                societySelector('border-border bg-white text-foreground shadow-sm [&>svg]:text-muted-foreground')
              ) : (
                <Button type="button" variant="outline" className="justify-start rounded-xl bg-white/80">{selectedScopeLabel}</Button>
              )}
              <Button type="button" variant="outline" size="icon" className="relative rounded-xl bg-white/80" aria-label="Notificações financeiras">
                <Bell className="h-4 w-4" />
                {stats.pendencias > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
                    {stats.pendencias}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </section>

        <MetricGrid className="mb-section-gap gap-1.5 xs:gap-2 md:gap-3">
          <MetricCard
            density="compact"
            title="Saldo atual"
            value={formatCurrency(stats.saldo)}
            icon={DollarSign}
            tone={stats.saldo >= 0 ? 'success' : 'danger'}
            valueClassName="finance-metric-value"
            onClick={() => setExtratoType('all')}
          />
          <MetricCard
            density="compact"
            title="Entradas no mês"
            value={formatCurrency(stats.entradasMes)}
            icon={ArrowUpRight}
            tone="success"
            valueClassName="finance-metric-value"
            onClick={() => setExtratoType('entrada')}
          />
          <MetricCard
            density="compact"
            title="Saídas no mês"
            value={formatCurrency(stats.saidasMes)}
            icon={ArrowDownLeft}
            tone="danger"
            valueClassName="finance-metric-value"
            onClick={() => setExtratoType('saida')}
          />
          <MetricCard
            density="compact"
            title="Pendências"
            value={`${stats.pendencias}`}
            icon={AlertCircle}
            tone={stats.pendencias > 0 ? 'warning' : 'success'}
          />
        </MetricGrid>

        <ExtratoDialog type={extratoType} onClose={() => setExtratoType(null)} />

        <AppCard className="mb-4 rounded-[22px] p-4 md:mb-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Ações rápidas</h2>
              <p className="text-sm text-muted-foreground">Fluxos principais da tesouraria</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
            {quickActions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() => openQuickAction(action)}
                className="flex min-h-28 flex-col items-center justify-center gap-3 rounded-xl border bg-background/70 p-3 text-center text-sm font-medium transition-colors hover:bg-accent"
              >
                <span className={`flex h-10 w-10 items-center justify-center rounded-full ${action.tone}`}>
                  <action.icon className="h-5 w-5" />
                </span>
                <span className="leading-tight">{action.label}</span>
              </button>
            ))}
          </div>
        </AppCard>

        <div className="mb-4 grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
          <AppCard className="rounded-[22px] p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Pendências do dia</h2>
              <Button type="button" variant="link" className="h-auto p-0" onClick={() => handleTabChange('comprovantes')}>Ver todas</Button>
            </div>
            <div className="space-y-2">
              {pendingItems.map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-xl border bg-background/70 p-3">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-full ${item.tone}`}>
                      <item.icon className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  <span className="text-xl font-bold">{item.count}</span>
                </div>
              ))}
            </div>
          </AppCard>

          <AppCard className="rounded-[22px] p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Resumo por sociedade</h2>
              <Button type="button" variant="link" className="h-auto p-0" onClick={() => handleTabChange('relatorios')}>Ver relatório</Button>
            </div>
            {societySummary.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sociedade</TableHead>
                    <TableHead>Saldo</TableHead>
                    <TableHead className="hidden md:table-cell">Entradas</TableHead>
                    <TableHead className="hidden md:table-cell">Saídas</TableHead>
                    <TableHead>Pend.</TableHead>
                    <TableHead>Fechamento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {societySummary.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-semibold">{item.name}</TableCell>
                      <TableCell className={item.saldo >= 0 ? 'font-medium text-foreground' : 'font-medium text-destructive'}>{formatCurrency(item.saldo)}</TableCell>
                      <TableCell className="hidden md:table-cell text-success">{formatCurrency(item.entradasMes)}</TableCell>
                      <TableCell className="hidden md:table-cell text-destructive">{formatCurrency(item.saidasMes)}</TableCell>
                      <TableCell>{item.pendencias}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusBadgeClass(item.fechamento)}>{item.fechamento}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="rounded-xl border bg-background/70 p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <div>
                    <p className="font-medium">Escopo individual selecionado</p>
                    <p className="text-sm text-muted-foreground">Use o escopo geral para comparar as sociedades lado a lado.</p>
                  </div>
                </div>
              </div>
            )}
          </AppCard>
        </div>

        <AppCard className="mb-4 rounded-[22px] p-4 md:mb-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Movimentações recentes</h2>
            <Button type="button" variant="link" className="h-auto p-0" onClick={() => setExtratoType('all')}>Ver todas</Button>
          </div>
          {recentMovements.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Sociedade</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentMovements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell>{formatDate(movement.date)}</TableCell>
                    <TableCell className="font-medium">{movement.society}</TableCell>
                    <TableCell className={movement.type === 'Entrada' ? 'font-medium text-success' : 'font-medium text-destructive'}>{movement.type}</TableCell>
                    <TableCell className="min-w-[180px]">{movement.description}</TableCell>
                    <TableCell>{formatCurrency(movement.amount)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusBadgeClass(movement.status)}>{movement.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="rounded-xl border bg-background/70 p-5 text-center text-sm text-muted-foreground">
              Nenhuma movimentação encontrada para o escopo atual.
            </div>
          )}
        </AppCard>

        <div className="mb-4 grid gap-4 lg:grid-cols-2">
          <AppCard className="rounded-[22px] p-4">
            <div className="mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-success" />
              <h2 className="text-lg font-semibold">Entradas x Saídas</h2>
            </div>
            <div className="space-y-4">
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Entradas no mês</span>
                  <span className="font-semibold text-success">{formatCurrency(stats.entradasMes)}</span>
                </div>
                <div className="h-3 rounded-full bg-muted">
                  <div className="h-3 rounded-full bg-success" style={{ width: `${Math.min(100, stats.entradasMes ? (stats.entradasMes / Math.max(stats.entradasMes, stats.saidasMes)) * 100 : 0)}%` }} />
                </div>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Saídas no mês</span>
                  <span className="font-semibold text-destructive">{formatCurrency(stats.saidasMes)}</span>
                </div>
                <div className="h-3 rounded-full bg-muted">
                  <div className="h-3 rounded-full bg-destructive" style={{ width: `${Math.min(100, stats.saidasMes ? (stats.saidasMes / Math.max(stats.entradasMes, stats.saidasMes)) * 100 : 0)}%` }} />
                </div>
              </div>
            </div>
          </AppCard>

          <AppCard className="rounded-[22px] p-4">
            <div className="mb-4 flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-amber-600" />
              <h2 className="text-lg font-semibold">Situação dos fechamentos</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border bg-success/5 p-4">
                <p className="text-sm text-muted-foreground">Conferidos</p>
                <p className="mt-2 text-2xl font-bold text-success">{societySummary.filter((item) => item.fechamento === 'Conferido').length}</p>
              </div>
              <div className="rounded-xl border bg-amber-50 p-4 dark:bg-amber-500/10">
                <p className="text-sm text-muted-foreground">Abertos</p>
                <p className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-300">{societySummary.length ? societySummary.filter((item) => item.fechamento === 'Aberto').length : (stats.pendencias > 0 ? 1 : 0)}</p>
              </div>
            </div>
          </AppCard>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="min-w-0">
          <HorizontalScroller className="finance-tabs-scroller sticky top-[calc(var(--mobile-header-height)+0.25rem)] z-20 -mx-1 mb-3 px-1 pb-1 md:static md:mx-0 md:mb-5 md:px-0">
            <TabsList className="inline-grid h-auto w-max min-w-full grid-flow-col auto-cols-[78px] items-stretch gap-1 rounded-[18px] border border-slate-200/70 bg-white/95 p-1 shadow-card backdrop-blur-xl md:grid-flow-row md:auto-cols-auto md:grid-cols-6 md:rounded-[20px] md:p-1.5">
              {mainTabs.map(({ value, label, shortLabel, icon: Icon }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="min-w-0 flex-col gap-1 rounded-[14px] px-1.5 py-1.5 text-[10px] font-semibold leading-none text-slate-500 transition-all data-[state=active]:bg-emerald-700 data-[state=active]:text-white data-[state=active]:shadow-[0_6px_16px_rgba(4,120,87,0.22)] md:flex-row md:gap-2 md:rounded-[15px] md:px-2 md:py-2 md:text-xs lg:text-sm"
                >
                  <Icon className="h-4 w-4 flex-shrink-0 md:h-[18px] md:w-[18px]" />
                  <span className="md:hidden">{shortLabel}</span>
                  <span className="hidden truncate md:inline">{label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </HorizontalScroller>

          <TabsContent value="cobrancas" className="finance-tab-panel finance-cobrancas mt-0 animate-in fade-in-50">
            <CobrancasTab />
          </TabsContent>

          <TabsContent value="comprovantes" className="finance-tab-panel mt-0 animate-in fade-in-50">
            <ComprovantesTab />
          </TabsContent>

          <TabsContent value="movimentacoes" className="finance-tab-panel mt-0 animate-in fade-in-50">
            <div className="mb-3 rounded-[18px] border border-slate-200/70 bg-white/95 p-1 shadow-card">
              <div className="grid grid-cols-2 gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  className={cn(
                    'h-10 rounded-[14px] text-xs font-semibold sm:text-sm',
                    movementView === 'receitas'
                      ? 'bg-emerald-700 text-white shadow-sm hover:bg-emerald-800 hover:text-white'
                      : 'text-slate-600 hover:bg-slate-100',
                  )}
                  onClick={() => handleMovementChange('receitas')}
                >
                  <TrendingUp className="mr-1.5 h-4 w-4" />
                  Receitas
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className={cn(
                    'h-10 rounded-[14px] text-xs font-semibold sm:text-sm',
                    movementView === 'gastos'
                      ? 'bg-emerald-700 text-white shadow-sm hover:bg-emerald-800 hover:text-white'
                      : 'text-slate-600 hover:bg-slate-100',
                  )}
                  onClick={() => handleMovementChange('gastos')}
                >
                  <TrendingDown className="mr-1.5 h-4 w-4" />
                  Gastos
                </Button>
              </div>
            </div>

            {movementView === 'receitas' ? <MensalidadesTab /> : <GastosTab />}
          </TabsContent>

          <TabsContent value="camisas" className="finance-tab-panel mt-0 animate-in fade-in-50">
            <CamisasTab />
          </TabsContent>

          <TabsContent value="relatorios" className="finance-tab-panel mt-0 animate-in fade-in-50">
            <RelatoriosTab />
          </TabsContent>

          <TabsContent value="mais" className="finance-tab-panel mt-0 animate-in fade-in-50">
            <ConfiguracoesTab />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
