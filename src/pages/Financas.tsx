import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MembrosTab } from '@/components/financas/MembrosTab';
import { MensalidadesTab } from '@/components/financas/MensalidadesTab';
import { GastosTab } from '@/components/financas/GastosTab';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

interface Stats {
  saldo: number;
  mensalidadesMes: number;
  gastosMes: number;
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
  const [activeTab, setActiveTab] = useState('membros');
  const [stats, setStats] = useState<Stats>({ saldo: 0, mensalidadesMes: 0, gastosMes: 0 });

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

      const [paymentsRes, transactionsRes] = await Promise.all([
        supabase
          .from('membership_payments')
          .select('amount')
          .eq('status', 'pago')
          .eq('competence', competence),
        supabase
          .from('transactions')
          .select('amount, type')
          .gte('date', startOfMonth)
          .lte('date', endOfMonth),
      ]);

      const mensalidadesMes = (paymentsRes.data || []).reduce((sum, p) => sum + Number(p.amount), 0);
      
      const allPayments = await supabase.from('membership_payments').select('amount').eq('status', 'pago');
      const allTransactions = await supabase.from('transactions').select('amount, type');

      const totalEntradas = (allPayments.data || []).reduce((sum, p) => sum + Number(p.amount), 0);
      const totalSaidas = (allTransactions.data || [])
        .filter((t) => t.type === 'saida')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      const gastosMes = (transactionsRes.data || [])
        .filter((t) => t.type === 'saida')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      setStats({
        saldo: totalEntradas - totalSaidas,
        mensalidadesMes,
        gastosMes,
      });
    };

    fetchStats();

    // Subscribe to changes
    const channel = supabase
      .channel('financas-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'membership_payments' }, fetchStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, fetchStats)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <AppLayout>
      <PageHeader
        title="Finanças"
        description="Gerencie membros, mensalidades e gastos"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Saldo Atual"
          value={`R$ ${stats.saldo.toFixed(2).replace('.', ',')}`}
          icon={DollarSign}
          variant={stats.saldo >= 0 ? 'success' : 'destructive'}
        />
        <StatCard
          title="Mensalidades (mês)"
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
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="membros">Membros</TabsTrigger>
          <TabsTrigger value="mensalidades">Mensalidades</TabsTrigger>
          <TabsTrigger value="gastos">Gastos</TabsTrigger>
        </TabsList>

        <TabsContent value="membros">
          <MembrosTab />
        </TabsContent>

        <TabsContent value="mensalidades">
          <MensalidadesTab />
        </TabsContent>

        <TabsContent value="gastos">
          <GastosTab />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}