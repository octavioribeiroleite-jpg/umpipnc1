import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MembrosTab } from '@/components/financas/MembrosTab';
import { MensalidadesTab } from '@/components/financas/MensalidadesTab';
import { GastosTab } from '@/components/financas/GastosTab';
import { CobrancasTab } from '@/components/financas/CobrancasTab';
import { CamisasTab } from '@/components/financas/CamisasTab';
import { ConfiguracoesTab } from '@/components/financas/ConfiguracoesTab';
import { RelatoriosTab } from '@/components/financas/RelatoriosTab';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
} from 'lucide-react';

interface Stats {
  saldo: number;
  mensalidadesMes: number;
  gastosMes: number;
  adimplencia: number;
}

function StatCard({
  title,
  value,
  icon: Icon,
  variant = 'default',
}: {
  title: string;
  value: string;
  icon: any;
  variant?: 'default' | 'success' | 'destructive';
}) {
  const colorClass = {
    default: 'text-foreground',
    success: 'text-success',
    destructive: 'text-destructive',
  }[variant];

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={`text-2xl font-bold mt-1 ${colorClass}`}>{value}</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Financas() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'cobrancas';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [stats, setStats] = useState<Stats>({ saldo: 0, mensalidadesMes: 0, gastosMes: 0, adimplencia: 0 });
  
  // Sync tab with URL
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);
  
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };

  useEffect(() => {
    const fetchStats = async () => {
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const startOfMonth = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];
      const endOfMonth = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0];

      const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];
      const competence = `${months[currentMonth]}/${currentYear}`;

      const [transactionsRes, chargesRes] = await Promise.all([
        supabase
          .from('transactions')
          .select('amount, type')
          .gte('date', startOfMonth)
          .lte('date', endOfMonth),
        supabase
          .from('charges')
          .select('status')
          .eq('competence', competence)
      ]);

      const entradas = (transactionsRes.data || [])
        .filter((t) => t.type === 'entrada')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      const saidas = (transactionsRes.data || [])
        .filter((t) => t.type === 'saida')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      // Calcular saldo total (todas as transações)
      const allTransactions = await supabase.from('transactions').select('amount, type');
      const totalEntradas = (allTransactions.data || [])
        .filter((t) => t.type === 'entrada')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const totalSaidas = (allTransactions.data || [])
        .filter((t) => t.type === 'saida')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      // Calcular adimplência
      const charges = chargesRes.data || [];
      const totalCharges = charges.length;
      const paidCharges = charges.filter(c => c.status === 'pago').length;
      const adimplencia = totalCharges > 0 ? Math.round((paidCharges / totalCharges) * 100) : 0;

      setStats({
        saldo: totalEntradas - totalSaidas,
        mensalidadesMes: entradas,
        gastosMes: saidas,
        adimplencia,
      });
    };

    fetchStats();

    // Subscribe to changes
    const channel = supabase
      .channel('financas-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, fetchStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'charges' }, fetchStats)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <AppLayout>
      <PageHeader
        title="Finanças"
        description="Gerencie cobranças, membros, camisas e gastos"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Saldo Atual"
          value={`R$ ${stats.saldo.toFixed(2).replace('.', ',')}`}
          icon={DollarSign}
          variant={stats.saldo >= 0 ? 'success' : 'destructive'}
        />
        <StatCard
          title="Receitas (mês)"
          value={`R$ ${stats.mensalidadesMes.toFixed(2).replace('.', ',')}`}
          icon={TrendingUp}
          variant="success"
        />
        <StatCard
          title="Gastos (mês)"
          value={`R$ ${stats.gastosMes.toFixed(2).replace('.', ',')}`}
          icon={TrendingDown}
          variant="destructive"
        />
        <StatCard
          title="Adimplência"
          value={`${stats.adimplencia}%`}
          icon={Users}
          variant={stats.adimplencia >= 70 ? 'success' : stats.adimplencia >= 50 ? 'default' : 'destructive'}
        />
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 mb-4">
          <TabsList className="inline-flex w-max md:w-auto gap-1">
            <TabsTrigger value="cobrancas" className="min-w-max">Cobranças</TabsTrigger>
            <TabsTrigger value="membros" className="min-w-max">Membros</TabsTrigger>
            <TabsTrigger value="receitas" className="min-w-max">Receitas</TabsTrigger>
            <TabsTrigger value="gastos" className="min-w-max">Gastos</TabsTrigger>
            <TabsTrigger value="camisas" className="min-w-max">Camisas</TabsTrigger>
            <TabsTrigger value="relatorios" className="min-w-max">Relatórios</TabsTrigger>
            <TabsTrigger value="configuracoes" className="min-w-max">Configurações</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="cobrancas" className="animate-in fade-in-50">
          <CobrancasTab />
        </TabsContent>

        <TabsContent value="membros" className="animate-in fade-in-50">
          <MembrosTab />
        </TabsContent>

        <TabsContent value="receitas" className="animate-in fade-in-50">
          <MensalidadesTab />
        </TabsContent>

        <TabsContent value="gastos" className="animate-in fade-in-50">
          <GastosTab />
        </TabsContent>

        <TabsContent value="camisas" className="animate-in fade-in-50">
          <CamisasTab />
        </TabsContent>

        <TabsContent value="relatorios" className="animate-in fade-in-50">
          <RelatoriosTab />
        </TabsContent>

        <TabsContent value="configuracoes" className="animate-in fade-in-50">
          <ConfiguracoesTab />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
