import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { AppCard } from '@/components/ui/app-card';
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
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
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

  return (
    <AppCard
      variant="stat"
      className={onClick ? 'cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]' : undefined}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs md:text-sm text-muted-foreground">{title}</p>
          <p className={`text-lg md:text-2xl font-bold mt-1 ${colorClass}`}>{value}</p>
        </div>
        <div className="h-7 w-7 md:h-9 md:w-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="h-4 w-4 md:h-5 md:w-5 text-primary" />
        </div>
      </div>
    </AppCard>
  );
}

export default function Financas() {
  const { isAdmin, isPastor, selectedSocietyId, setSelectedSocietyId, effectiveSocietyId: societyId } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'cobrancas';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [stats, setStats] = useState<Stats>({ saldo: 0, receitasTotal: 0, gastosTotal: 0, adimplencia: 0 });
  const [societies, setSocieties] = useState<Society[]>([]);
  const [extratoType, setExtratoType] = useState<ExtratoType | null>(null);

  // Fetch societies for admin/pastor selector
  useEffect(() => {
    if (isAdmin || isPastor) {
      supabase.from('societies').select('id, name').eq('active', true).order('name')
        .then(({ data }) => {
          if (data) setSocieties(data);
          // Auto-select first if none selected
          if (data && data.length > 0 && !selectedSocietyId) {
            setSelectedSocietyId(data[0].id);
          }
        });
    }
  }, [isAdmin, isPastor]);
  
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

      let chargesQuery = supabase
          .from('charges')
          .select('status')
          .eq('competence', competence);

      if (societyId) {
        chargesQuery = chargesQuery.eq('society_id', societyId);
      }

      const chargesRes = await chargesQuery;

      // Calcular saldo total (todas as transações)
      let allTxQuery = supabase.from('transactions').select('amount, type');
      if (societyId) {
        allTxQuery = allTxQuery.eq('society_id', societyId);
      }
      const allTransactions = await allTxQuery;
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
        receitasTotal: totalEntradas,
        gastosTotal: totalSaidas,
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
  }, [societyId]);

  return (
    <AppLayout>
      <PageHeader
        title="Finanças"
        description="Gerencie cobranças, membros, camisas e gastos"
      />

      {/* Society Selector for admin/pastor */}
      {(isAdmin || isPastor) && societies.length > 0 && (
        <div className="mb-4">
          <Select value={selectedSocietyId || ''} onValueChange={setSelectedSocietyId}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder="Selecione a sociedade" />
            </SelectTrigger>
            <SelectContent>
              {societies.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-6">
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
        {/* Mobile: Select dropdown */}
        <div className="md:hidden mb-4">
          <Select value={activeTab} onValueChange={handleTabChange}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cobrancas">Cobranças</SelectItem>
              <SelectItem value="comprovantes">Comprovantes</SelectItem>
              <SelectItem value="receitas">Receitas</SelectItem>
              <SelectItem value="gastos">Gastos</SelectItem>
              <SelectItem value="camisas">Camisas</SelectItem>
              <SelectItem value="relatorios">Relatórios</SelectItem>
              <SelectItem value="configuracoes">Configurações</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Desktop: TabsList */}
        <div className="hidden md:block mb-4">
          <TabsList className="inline-flex w-auto gap-1">
            <TabsTrigger value="cobrancas">Cobranças</TabsTrigger>
            <TabsTrigger value="comprovantes">Comprovantes</TabsTrigger>
            <TabsTrigger value="receitas">Receitas</TabsTrigger>
            <TabsTrigger value="gastos">Gastos</TabsTrigger>
            <TabsTrigger value="camisas">Camisas</TabsTrigger>
            <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
            <TabsTrigger value="configuracoes">Configurações</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="cobrancas" className="animate-in fade-in-50">
          <CobrancasTab />
        </TabsContent>

        <TabsContent value="comprovantes" className="animate-in fade-in-50">
          <ComprovantesTab />
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
