import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DollarSign,
  Users,
  Calendar,
  CheckSquare,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  TrendingUp,
} from 'lucide-react';

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  trendUp,
}: {
  title: string;
  value: string;
  description?: string;
  icon: any;
  trend?: string;
  trendUp?: boolean;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {(description || trend) && (
          <div className="flex items-center gap-2 mt-1">
            {trend && (
              <span
                className={`flex items-center text-xs font-medium ${
                  trendUp ? 'text-success' : 'text-destructive'
                }`}
              >
                {trendUp ? (
                  <ArrowUpRight className="h-3 w-3 mr-0.5" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 mr-0.5" />
                )}
                {trend}
              </span>
            )}
            {description && <span className="text-xs text-muted-foreground">{description}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function QuickAction({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon: any;
  onClick: () => void;
}) {
  return (
    <Button
      variant="outline"
      className="flex-1 h-auto py-4 flex-col gap-2"
      onClick={onClick}
    >
      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <span className="text-sm font-medium">{label}</span>
    </Button>
  );
}

export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <AppLayout>
      <PageHeader
        title="Dashboard"
        description="Visão geral do painel da Diretoria de Jovens"
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Saldo do Caixa"
          value="R$ 2.450,00"
          trend="+12%"
          trendUp={true}
          description="vs mês anterior"
          icon={DollarSign}
        />
        <StatCard
          title="Mensalidades"
          value="R$ 850,00"
          description="de R$ 1.000,00 esperado"
          icon={TrendingUp}
        />
        <StatCard
          title="Próxima Reunião"
          value="15 Jan"
          description="Reunião Ordinária"
          icon={Users}
        />
        <StatCard
          title="Tarefas Pendentes"
          value="5"
          trend="2 vencendo"
          trendUp={false}
          icon={CheckSquare}
        />
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="font-display text-lg font-semibold mb-4">Ações Rápidas</h2>
        <div className="flex flex-wrap gap-3">
          <QuickAction
            label="Nova Reunião"
            icon={Users}
            onClick={() => navigate('/reunioes/nova')}
          />
          <QuickAction
            label="Novo Evento"
            icon={Calendar}
            onClick={() => navigate('/calendario')}
          />
          <QuickAction
            label="Nova Transação"
            icon={DollarSign}
            onClick={() => navigate('/financas')}
          />
          <QuickAction
            label="Nova Tarefa"
            icon={Plus}
            onClick={() => navigate('/tarefas')}
          />
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Events */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Próximos Eventos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { title: 'Reunião da Diretoria', date: '15 Jan, 19:00' },
                { title: 'Culto de Jovens', date: '18 Jan, 19:30' },
                { title: 'Retiro Espiritual', date: '25 Jan, 08:00' },
              ].map((event, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <p className="font-medium">{event.title}</p>
                    <p className="text-sm text-muted-foreground">{event.date}</p>
                  </div>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
            </div>
            <Button variant="ghost" className="w-full mt-4" onClick={() => navigate('/calendario')}>
              Ver todos os eventos
            </Button>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Últimas Transações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { title: 'Ofertas', amount: '+R$ 350,00', type: 'entrada' },
                { title: 'Alimentação - Reunião', amount: '-R$ 120,00', type: 'saida' },
                { title: 'Dízimos', amount: '+R$ 500,00', type: 'entrada' },
              ].map((tx, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <p className="font-medium">{tx.title}</p>
                  <span
                    className={`font-medium ${
                      tx.type === 'entrada' ? 'text-success' : 'text-destructive'
                    }`}
                  >
                    {tx.amount}
                  </span>
                </div>
              ))}
            </div>
            <Button variant="ghost" className="w-full mt-4" onClick={() => navigate('/financas')}>
              Ver todas as transações
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
