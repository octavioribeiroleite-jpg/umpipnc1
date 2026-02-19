import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PastorNotificationBanner } from '@/components/pastor/PastorNotificationBanner';
import { PastorLoginNotification } from '@/components/pastor/PastorLoginNotification';
import { useEvents } from '@/hooks/useEvents';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  DollarSign,
  Users,
  Calendar,
  CheckSquare,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  TrendingUp,
  MapPin,
  Clock,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Stats {
  saldo: number;
  mensalidadesMes: number;
  membrosAtivos: number;
  tarefasPendentes: number;
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  trendUp,
  onClick,
}: {
  title: string;
  value: string;
  description?: string;
  icon: any;
  trend?: string;
  trendUp?: boolean;
  onClick?: () => void;
}) {
  return (
    <Card 
      className={`overflow-hidden ${onClick ? 'cursor-pointer hover:bg-accent/50 transition-colors' : ''}`}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-1 p-3 md:p-6 md:pb-2">
        <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="h-7 w-7 md:h-9 md:w-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="h-4 w-4 md:h-5 md:w-5 text-primary" />
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
        <div className="text-lg md:text-2xl font-bold">{value}</div>
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
      className="h-auto py-3 px-4 md:py-4 md:px-6 flex-col gap-1.5 md:gap-2 md:flex-1 md:min-w-[100px]"
      onClick={onClick}
    >
      <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-primary/10 flex items-center justify-center">
        <Icon className="h-4 w-4 md:h-5 md:w-5 text-primary" />
      </div>
      <span className="text-xs md:text-sm font-medium whitespace-nowrap">{label}</span>
    </Button>
  );
}

const statusStyles: Record<string, string> = {
  confirmado: 'bg-success/10 text-success border-success/20',
  pendente: 'bg-warning/10 text-warning border-warning/20',
  cancelado: 'bg-destructive/10 text-destructive border-destructive/20',
};

const statusLabels: Record<string, string> = {
  confirmado: 'Confirmado',
  pendente: 'Pendente',
  cancelado: 'Cancelado',
};

export default function Index() {
  const { user, loading, rolesLoaded, isPastor, profile, isAdmin } = useAuth();
  const societyId = (!isAdmin && !isPastor) ? profile?.society_id : null;
  const navigate = useNavigate();
  const { upcomingEvents, isUpcomingLoading } = useEvents();
  const [stats, setStats] = useState<Stats>({
    saldo: 0,
    mensalidadesMes: 0,
    membrosAtivos: 0,
    tarefasPendentes: 0,
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    } else if (!loading && user && rolesLoaded && isPastor && !isAdmin) {
      navigate('/pastor');
    }
  }, [user, loading, rolesLoaded, navigate, isPastor, isAdmin]);

  useEffect(() => {
    const fetchStats = async () => {
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];
      const competence = `${months[currentMonth]}/${currentYear}`;

      let paymentsQuery = supabase.from('membership_payments').select('amount, competence').eq('status', 'pago');
      let transactionsQuery = supabase.from('transactions').select('amount, type');
      let membersQuery = supabase.from('members').select('id').eq('active', true);
      let tasksQuery = supabase.from('tasks').select('id').neq('status', 'done');

      if (societyId) {
        transactionsQuery = transactionsQuery.eq('society_id', societyId);
        membersQuery = membersQuery.eq('society_id', societyId);
        tasksQuery = tasksQuery.eq('society_id', societyId);
      }

      const [paymentsRes, transactionsRes, membersRes, tasksRes] = await Promise.all([
        paymentsQuery,
        transactionsQuery,
        membersQuery,
        tasksQuery,
      ]);

      // Calcular mensalidades pagas
      const allPayments = paymentsRes.data || [];
      const totalMensalidades = allPayments.reduce((sum, p) => sum + Number(p.amount), 0);
      const mensalidadesMes = allPayments
        .filter((p) => p.competence === competence)
        .reduce((sum, p) => sum + Number(p.amount), 0);

      // Calcular transações (entradas e saídas)
      const transactions = transactionsRes.data || [];
      const totalEntradas = transactions
        .filter((t) => t.type === 'entrada')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const totalSaidas = transactions
        .filter((t) => t.type === 'saida')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      // Saldo = Mensalidades Pagas + Transações Entrada - Transações Saída
      const saldo = totalMensalidades + totalEntradas - totalSaidas;

      setStats({
        saldo,
        mensalidadesMes,
        membrosAtivos: membersRes.data?.length || 0,
        tarefasPendentes: tasksRes.data?.length || 0,
      });
    };

    if (user) {
      fetchStats();
    }
  }, [user]);

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

  const displayedEvents = upcomingEvents.slice(0, 5);

  return (
    <AppLayout>
      <PastorLoginNotification />
      <PageHeader
        title="Dashboard"
        description="Visão geral do painel da Diretoria de Jovens"
      />
      <PastorNotificationBanner />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4 mb-6 md:mb-8">
        <StatCard
          title="Saldo do Caixa"
          value={`R$ ${stats.saldo.toFixed(2).replace('.', ',')}`}
          icon={DollarSign}
        />
        <StatCard
          title="Contribuições (mês)"
          value={`R$ ${stats.mensalidadesMes.toFixed(2).replace('.', ',')}`}
          icon={TrendingUp}
          onClick={() => navigate('/financas?tab=receitas')}
        />
        <StatCard
          title="Membros Ativos"
          value={stats.membrosAtivos.toString()}
          icon={Users}
        />
        <StatCard
          title="Tarefas Pendentes"
          value={stats.tarefasPendentes.toString()}
          icon={CheckSquare}
        />
      </div>

      {/* Quick Actions - Horizontal scroll on mobile */}
      <div className="mb-6 md:mb-8">
        <h2 className="font-display text-base md:text-lg font-semibold mb-3 md:mb-4">Ações Rápidas</h2>
        <div className="grid grid-cols-2 md:flex gap-2 md:gap-3 md:flex-wrap">
          <QuickAction
            label="Nova Reunião"
            icon={Users}
            onClick={() => navigate('/reunioes')}
          />
          <QuickAction
            label="Novo Evento"
            icon={Calendar}
            onClick={() => navigate('/calendario')}
          />
          <QuickAction
            label="Finanças"
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
            {isUpcomingLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : displayedEvents.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Nenhum evento próximo cadastrado.
              </p>
            ) : (
              <div className="space-y-3">
                {displayedEvents.map((event) => {
                  const startDate = new Date(event.start_date);
                  return (
                    <div
                      key={event.id}
                      className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => navigate('/calendario')}
                    >
                      <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium truncate">{event.title}</span>
                          <Badge variant="outline" className={statusStyles[event.status]}>
                            {statusLabels[event.status]}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(startDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </span>
                          {event.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {event.location}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <Button variant="ghost" className="w-full mt-4" onClick={() => navigate('/calendario')}>
              Ver calendário
            </Button>
          </CardContent>
        </Card>

        {/* Financial Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Resumo Financeiro</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">Saldo atual</span>
                <span className={`font-semibold ${stats.saldo >= 0 ? 'text-success' : 'text-destructive'}`}>
                  R$ {stats.saldo.toFixed(2).replace('.', ',')}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">Contribuições do mês</span>
                <span className="font-semibold text-success">
                  R$ {stats.mensalidadesMes.toFixed(2).replace('.', ',')}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground">Membros ativos</span>
                <span className="font-semibold">{stats.membrosAtivos}</span>
              </div>
            </div>
            <Button variant="ghost" className="w-full mt-4" onClick={() => navigate('/financas')}>
              Ver finanças completas
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
