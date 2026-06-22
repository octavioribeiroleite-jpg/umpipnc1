import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { AppCard } from '@/components/ui/app-card';
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
import { useAuth } from '@/contexts/AuthContext';
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
  icon: typeof ReceiptText;
}> = [
  { value: 'cobrancas', label: 'Cobranças', icon: ReceiptText },
  { value: 'comprovantes', label: 'Comprovantes', icon: FileCheck2 },
  { value: 'movimentacoes', label: 'Movimentações', icon: ArrowLeftRight },
  { value: 'camisas', label: 'Camisas', icon: Shirt },
  { value: 'relatorios', label: 'Relatórios', icon: BarChart3 },
  { value: 'mais', label: 'Mais', icon: MoreHorizontal },
];

function normalizeMainTab(tab: string | null): MainFinanceTab {
  if (tab === 'receitas' || tab === 'gastos') return 'movimentacoes';
  if (tab === 'configuracoes') return 'mais';
  if (mainTabs.some((item) => item.value === tab)) return tab as MainFinanceTab;
  return 'cobrancas';
}

function StatCard({
  title,
  value,
  icon: Icon,
  variant = 'default',
  onClick,
}: {
  title: string;
  value: string;
  icon: any;
  variant?: 'default' | 'success' | 'destructive';
  onClick?: () => void;
}) {
  const colorClass = {
    default: 'text-foreground',
    success: 'text-success',
    destructive: 'text-destructive',
  }[variant];

  const iconClass = variant === 'destructive'
    ? 'bg-red-50 text-red-600'
    : 'bg-emerald-50 text-emerald-700';

  return (
    <AppCard
      variant="stat"
      className={`rounded-2xl border-white/70 bg-white/95 p-1 shadow-[0_10px_24px_rgba(15,23,42,0.06)] sm:rounded-[24px] ${onClick ? 'cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(15,23,42,0.10)] active:scale-[0.99]' : ''}`}
      onClick={onClick}
    >
      <div className="flex min-h-[76px] items-center justify-between gap-2 p-2.5 md:min-h-[112px] md:gap-3 md:p-4">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-slate-500 md:text-base">{title}</p>
          <p className={`mt-1 break-words text-base font-extrabold leading-tight tracking-tight md:mt-2 md:text-3xl ${colorClass}`}>{value}</p>
        </div>
        <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl md:h-14 md:w-14 md:rounded-[16px] ${iconClass}`}>
          <Icon className="h-4.5 w-4.5 md:h-7 md:w-7" />
        </div>
      </div>
    </AppCard>
  );
}

export default function Financas() {
  const { isAdmin, isPastor, selectedSocietyId, setSelectedSocietyId, effectiveSocietyId: societyId } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialRawTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<MainFinanceTab>(normalizeMainTab(initialRawTab));
  const [movementView, setMovementView] = useState<MovementView>(initialRawTab === 'gastos' ? 'gastos' : 'receitas');
  const [stats, setStats] = useState<Stats>({ saldo: 0, receitasTotal: 0, gastosTotal: 0, adimplencia: 0 });
  const [societies, setSocieties] = useState<Society[]>([]);
  const [extratoType, setExtratoType] = useState<ExtratoType | null>(null);

  useEffect(() => {
    if (isAdmin || isPastor) {
      supabase.from('societies').select('id, name').eq('active', true).order('name')
        .then(({ data }) => {
          if (data) setSocieties(data);
          if (data && data.length > 0 && !selectedSocietyId) {
            setSelectedSocietyId(data[0].id);
          }
        });
    }
  }, [isAdmin, isPastor, selectedSocietyId, setSelectedSocietyId]);

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    const normalized = normalizeMainTab(tabFromUrl);
    setActiveTab(normalized);
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

      let chargesQuery = supabase
        .from('charges')
        .select('status')
        .eq('competence', competence);

      if (societyId) chargesQuery = chargesQuery.eq('society_id', societyId);
      const chargesRes = await chargesQuery;

      let allTxQuery = supabase.from('transactions').select('amount, type');
      if (societyId) allTxQuery = allTxQuery.eq('society_id', societyId);
      const allTransactions = await allTxQuery;

      const totalEntradas = (allTransactions.data || [])
        .filter((transaction) => transaction.type === 'entrada')
        .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
      const totalSaidas = (allTransactions.data || [])
        .filter((transaction) => transaction.type === 'saida')
        .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

      const charges = chargesRes.data || [];
      const totalCharges = charges.length;
      const paidCharges = charges.filter((charge) => charge.status === 'pago').length;
      const adimplencia = totalCharges > 0 ? Math.round((paidCharges / totalCharges) * 100) : 0;

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

  const societySelector = (isAdmin || isPastor) && societies.length > 0 ? (
    <Select value={selectedSocietyId || ''} onValueChange={setSelectedSocietyId}>
      <SelectTrigger className="h-12 w-full rounded-2xl border-white/25 bg-white/15 px-4 text-white shadow-sm backdrop-blur-md sm:w-64 [&>svg]:text-white/80">
        <SelectValue placeholder="Selecione a sociedade" />
      </SelectTrigger>
      <SelectContent>
        {societies.map((society) => (
          <SelectItem key={society.id} value={society.id}>{society.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  ) : undefined;

  return (
    <AppLayout>
      <PageHeader
        title="Finanças"
        description="Gerencie cobranças, membros, camisas e gastos"
        eyebrow="Gestão financeira"
        icon={<WalletCards className="h-8 w-8 md:h-10 md:w-10" />}
        action={societySelector}
      />

      <div className="mb-3 grid grid-cols-2 gap-2 md:mb-6 md:gap-4 lg:grid-cols-4">
        <StatCard
          title="Saldo Atual"
          value={`R$ ${stats.saldo.toFixed(2).replace('.', ',')}`}
          icon={DollarSign}
          variant={stats.saldo >= 0 ? 'success' : 'destructive'}
          onClick={() => setExtratoType('all')}
        />
        <StatCard
          title="Receitas (total)"
          value={`R$ ${stats.receitasTotal.toFixed(2).replace('.', ',')}`}
          icon={TrendingUp}
          variant="success"
          onClick={() => setExtratoType('entrada')}
        />
        <StatCard
          title="Gastos (total)"
          value={`R$ ${stats.gastosTotal.toFixed(2).replace('.', ',')}`}
          icon={TrendingDown}
          variant="destructive"
          onClick={() => setExtratoType('saida')}
        />
        <StatCard
          title="Adimplência"
          value={`${stats.adimplencia}%`}
          icon={Users}
          variant={stats.adimplencia >= 70 ? 'success' : stats.adimplencia >= 50 ? 'default' : 'destructive'}
        />
      </div>

      <ExtratoDialog type={extratoType} onClose={() => setExtratoType(null)} />

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <div className="mb-5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <TabsList className="inline-flex h-auto min-w-full w-max items-stretch gap-1 rounded-[24px] border border-slate-200/70 bg-white/95 p-1.5 shadow-[0_12px_30px_rgba(15,23,42,0.07)] backdrop-blur-xl">
            {mainTabs.map(({ value, label, icon: Icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="min-w-[98px] flex-1 flex-col gap-1.5 rounded-[18px] px-3 py-2.5 text-xs font-semibold text-slate-500 transition-all data-[state=active]:bg-emerald-700 data-[state=active]:text-white data-[state=active]:shadow-[0_8px_20px_rgba(4,120,87,0.24)] sm:min-w-[112px] sm:text-sm"
              >
                <Icon className="h-5 w-5" />
                <span>{label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="cobrancas" className="animate-in fade-in-50">
          <CobrancasTab />
        </TabsContent>

        <TabsContent value="comprovantes" className="animate-in fade-in-50">
          <ComprovantesTab />
        </TabsContent>

        <TabsContent value="movimentacoes" className="animate-in fade-in-50">
          <Card className="mb-4 rounded-[22px] border-slate-200/70 bg-white/95 shadow-sm">
            <CardContent className="flex gap-2 p-2">
              <Button
                type="button"
                variant={movementView === 'receitas' ? 'default' : 'ghost'}
                className={`flex-1 rounded-[16px] ${movementView === 'receitas' ? 'bg-emerald-700 text-white hover:bg-emerald-800' : 'text-slate-600'}`}
                onClick={() => handleMovementChange('receitas')}
              >
                <TrendingUp className="mr-2 h-4 w-4" />
                Receitas
              </Button>
              <Button
                type="button"
                variant={movementView === 'gastos' ? 'default' : 'ghost'}
                className={`flex-1 rounded-[16px] ${movementView === 'gastos' ? 'bg-emerald-700 text-white hover:bg-emerald-800' : 'text-slate-600'}`}
                onClick={() => handleMovementChange('gastos')}
              >
                <TrendingDown className="mr-2 h-4 w-4" />
                Gastos
              </Button>
            </CardContent>
          </Card>

          {movementView === 'receitas' ? <MensalidadesTab /> : <GastosTab />}
        </TabsContent>

        <TabsContent value="camisas" className="animate-in fade-in-50">
          <CamisasTab />
        </TabsContent>

        <TabsContent value="relatorios" className="animate-in fade-in-50">
          <RelatoriosTab />
        </TabsContent>

        <TabsContent value="mais" className="animate-in fade-in-50">
          <ConfiguracoesTab />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
