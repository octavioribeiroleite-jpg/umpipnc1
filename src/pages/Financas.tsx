import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowLeftRight,
  BarChart3,
  DollarSign,
  FileCheck2,
  MoreHorizontal,
  ReceiptText,
  Shirt,
  TrendingDown,
  TrendingUp,
  Users,
  WalletCards,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { HorizontalScroller, MetricGrid } from '@/components/layout/ResponsivePrimitives';
import { MetricCard } from '@/components/ui/metric-card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  adimplencia: number;
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
  } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialRawTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<MainFinanceTab>(normalizeMainTab(initialRawTab));
  const [movementView, setMovementView] = useState<MovementView>(initialRawTab === 'gastos' ? 'gastos' : 'receitas');
  const [stats, setStats] = useState<Stats>({ saldo: 0, receitasTotal: 0, gastosTotal: 0, adimplencia: 0 });
  const [societies, setSocieties] = useState<Society[]>([]);
  const [extratoType, setExtratoType] = useState<ExtratoType | null>(null);

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
        if (data.length > 0 && !selectedSocietyId) {
          setSelectedSocietyId(data[0].id);
        }
      });
  }, [isAdmin, isPastor, selectedSocietyId]);

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
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
      ];
      const competence = `${months[currentMonth]}/${currentYear}`;

      let chargesQuery = supabase.from('charges').select('status').eq('competence', competence);
      let transactionsQuery = supabase.from('transactions').select('amount, type');

      if (societyId) {
        chargesQuery = chargesQuery.eq('society_id', societyId);
        transactionsQuery = transactionsQuery.eq('society_id', societyId);
      }

      const [chargesResult, transactionsResult] = await Promise.all([
        chargesQuery,
        transactionsQuery,
      ]);

      const transactions = transactionsResult.data || [];
      const totalEntradas = transactions
        .filter((transaction) => transaction.type === 'entrada')
        .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
      const totalSaidas = transactions
        .filter((transaction) => transaction.type === 'saida')
        .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

      const charges = chargesResult.data || [];
      const paidCharges = charges.filter((charge) => charge.status === 'pago').length;
      const adimplencia = charges.length > 0 ? Math.round((paidCharges / charges.length) * 100) : 0;

      setStats({
        saldo: totalEntradas - totalSaidas,
        receitasTotal: totalEntradas,
        gastosTotal: totalSaidas,
        adimplencia,
      });
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
  }, [societyId]);

  const showSocietySelector = (isAdmin || isPastor) && societies.length > 0;
  const societySelector = (className?: string) => showSocietySelector ? (
    <Select value={selectedSocietyId || ''} onValueChange={setSelectedSocietyId}>
      <SelectTrigger className={cn('h-10 w-full rounded-xl border-white/25 bg-white/15 px-3 text-sm text-white shadow-sm backdrop-blur-md sm:w-60 [&>svg]:text-white/80', className)}>
        <SelectValue placeholder="Selecione a sociedade" />
      </SelectTrigger>
      <SelectContent>
        {societies.map((society) => (
          <SelectItem key={society.id} value={society.id}>{society.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  ) : null;

  return (
    <AppLayout>
      <div className="finance-page min-w-0">
        <PageHeader
          title="Finanças"
          description="Gerencie cobranças, membros, camisas e gastos"
          eyebrow="Gestão financeira"
          icon={<WalletCards />}
          action={showSocietySelector ? <div className="hidden md:block">{societySelector()}</div> : undefined}
        />

        {showSocietySelector && (
          <div className="mb-3 md:hidden">
            {societySelector('border-border bg-white text-foreground shadow-card [&>svg]:text-muted-foreground')}
          </div>
        )}

        <MetricGrid className="mb-section-gap">
          <MetricCard
            title="Saldo atual"
            value={formatCurrency(stats.saldo)}
            icon={DollarSign}
            tone={stats.saldo >= 0 ? 'success' : 'danger'}
            valueClassName="finance-metric-value"
            onClick={() => setExtratoType('all')}
          />
          <MetricCard
            title="Receitas"
            value={formatCurrency(stats.receitasTotal)}
            icon={TrendingUp}
            tone="success"
            valueClassName="finance-metric-value"
            onClick={() => setExtratoType('entrada')}
          />
          <MetricCard
            title="Gastos"
            value={formatCurrency(stats.gastosTotal)}
            icon={TrendingDown}
            tone="danger"
            valueClassName="finance-metric-value"
            onClick={() => setExtratoType('saida')}
          />
          <MetricCard
            title="Adimplência"
            value={`${stats.adimplencia}%`}
            icon={Users}
            tone={stats.adimplencia >= 70 ? 'success' : stats.adimplencia >= 50 ? 'warning' : 'danger'}
          />
        </MetricGrid>

        <ExtratoDialog type={extratoType} onClose={() => setExtratoType(null)} />

        <Tabs value={activeTab} onValueChange={handleTabChange} className="min-w-0">
          <HorizontalScroller className="finance-tabs-scroller sticky top-[calc(var(--mobile-header-height)+0.25rem)] z-20 -mx-1 mb-3 px-1 pb-1 md:static md:mx-0 md:mb-5 md:px-0">
            <TabsList className="inline-grid h-auto w-max min-w-full grid-flow-col auto-cols-[78px] items-stretch gap-1 rounded-[18px] border border-slate-200/70 bg-white/95 p-1 shadow-card backdrop-blur-xl md:grid-flow-row md:auto-cols-auto md:grid-cols-6 md:rounded-[20px] md:p-1.5">
              {mainTabs.map(({ value, label, shortLabel, icon: Icon }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="h-13 min-w-0 flex-col gap-1 rounded-[14px] px-1.5 py-1.5 text-[10px] font-semibold leading-none text-slate-500 transition-all data-[state=active]:bg-emerald-700 data-[state=active]:text-white data-[state=active]:shadow-[0_6px_16px_rgba(4,120,87,0.22)] md:h-11 md:flex-row md:gap-2 md:rounded-[15px] md:px-2 md:py-2 md:text-xs lg:text-sm"
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
