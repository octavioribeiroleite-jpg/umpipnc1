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
  Shield,
  UserCheck,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
  const { user, loading, rolesLoaded, isPastor, profile, isAdmin, isManagement, roles } = useAuth();
  const societyId = (!isAdmin && !isPastor) ? profile?.society_id : null;
  const navigate = useNavigate();
  const { upcomingEvents, isUpcomingLoading } = useEvents();
  const [stats, setStats] = useState<Stats>({
    saldo: 0,
    mensalidadesMes: 0,
    membrosAtivos: 0,
    tarefasPendentes: 0,
  });
  const [pendingSubmissions, setPendingSubmissions] = useState(0);
  const [diretoria, setDiretoria] = useState<{ full_name: string; society_name?: string }[]>([]);
  const [membros, setMembros] = useState<{ name: string; society_name?: string }[]>([]);
  const [showDiretoria, setShowDiretoria] = useState(false);
  const [showMembros, setShowMembros] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    } else if (!loading && user && rolesLoaded) {
      // Pastor (sem admin) -> /pastor
      if (isPastor && !isAdmin) {
        navigate('/pastor');
      }
      // Visualizador puro (sem diretoria/admin/pastor) -> /membro
      else if (
        roles.includes('visualizador') &&
        !isAdmin &&
        !isManagement &&
        !isPastor
      ) {
        navigate('/membro');
      }
    }
  }, [user, loading, rolesLoaded, navigate, isPastor, isAdmin, isManagement, roles]);

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

      // Fetch pending payment submissions
      const fetchPending = async () => {
        let query = supabase
          .from('member_payment_submissions')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pendente');
        if (societyId) query = query.eq('society_id', societyId);
        const { count } = await query;
        setPendingSubmissions(count || 0);
      };
      fetchPending();

      // Fetch diretoria (profiles with role 'diretoria')
      const fetchDiretoria = async () => {
        const { data: roles } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'diretoria');
        if (roles && roles.length > 0) {
          const userIds = roles.map(r => r.user_id);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('full_name, society_id')
            .in('user_id', userIds)
            .eq('active', true);
          if (profiles) {
            // Get society names
            const societyIds = [...new Set(profiles.map(p => p.society_id).filter(Boolean))];
            let societyMap: Record<string, string> = {};
            if (societyIds.length > 0) {
              const { data: societies } = await supabase
                .from('societies')
                .select('id, name')
                .in('id', societyIds as string[]);
              if (societies) {
                societyMap = Object.fromEntries(societies.map(s => [s.id, s.name]));
              }
            }
            setDiretoria(profiles.map(p => ({
              full_name: p.full_name,
              society_name: p.society_id ? societyMap[p.society_id] : undefined,
            })));
          }
        }
      };
      fetchDiretoria();

      // Fetch membros (from members table)
      const fetchMembros = async () => {
        let query = supabase
          .from('members')
          .select('name, society_id')
          .eq('active', true)
          .order('name');
        if (societyId) query = query.eq('society_id', societyId);
        const { data } = await query;
        if (data) {
          const societyIds = [...new Set(data.map(m => m.society_id).filter(Boolean))];
          let societyMap: Record<string, string> = {};
          if (societyIds.length > 0) {
            const { data: societies } = await supabase
              .from('societies')
              .select('id, name')
              .in('id', societyIds as string[]);
            if (societies) {
              societyMap = Object.fromEntries(societies.map(s => [s.id, s.name]));
            }
          }
          setMembros(data.map(m => ({
            name: m.name,
            society_name: m.society_id ? societyMap[m.society_id] : undefined,
          })));
        }
      };
      fetchMembros();
    }
  }, [user]);

  if (loading || !rolesLoaded) {
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




  const colorToSociety: Record<string, string> = {
    '#3b82f6': 'UMP',
    '#ec4899': 'SAF',
    '#10b981': 'UPH',
    '#f97316': 'UPA',
    '#8b5cf6': 'UCP',
    '#6b7280': 'IPNC',
  };

  return (
    <AppLayout>
      <PastorLoginNotification />
      <PageHeader
        title="Dashboard"
        description="Visão geral do painel da Diretoria de Jovens"
      />
      <PastorNotificationBanner />

      {/* Pending submissions notification */}
      {pendingSubmissions > 0 && (
        <div
          className="mb-4 p-3 rounded-lg bg-warning/10 border border-warning/20 text-warning text-sm font-medium cursor-pointer hover:bg-warning/15 transition-colors"
          onClick={() => navigate('/financas?tab=comprovantes')}
        >
          📋 {pendingSubmissions} comprovante{pendingSubmissions > 1 ? 's' : ''} de pagamento pendente{pendingSubmissions > 1 ? 's' : ''} de aprovação
        </div>
      )}

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

      {/* Diretoria & Membros Cards */}
      <div className="grid grid-cols-2 gap-2 md:gap-4 mb-6 md:mb-8">
        <Card
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => setShowDiretoria(true)}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-1 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Diretoria</CardTitle>
            <div className="h-7 w-7 md:h-9 md:w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="h-4 w-4 md:h-5 md:w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-lg md:text-2xl font-bold">{diretoria.length}</div>
            <span className="text-xs text-muted-foreground">Toque para ver</span>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => setShowMembros(true)}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-1 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Membros</CardTitle>
            <div className="h-7 w-7 md:h-9 md:w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <UserCheck className="h-4 w-4 md:h-5 md:w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-lg md:text-2xl font-bold">{membros.length}</div>
            <span className="text-xs text-muted-foreground">Toque para ver</span>
          </CardContent>
        </Card>
      </div>

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
              <div className="space-y-2">
                {displayedEvents.map((event) => {
                  const startDate = new Date(event.start_date);
                  const societyName = colorToSociety[event.color || ''] || '';
                  return (
                    <div
                      key={event.id}
                      className="p-3 rounded-lg border bg-card"
                      style={{ borderLeftWidth: 3, borderLeftColor: event.color || 'hsl(var(--primary))' }}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h4 className="font-medium text-sm leading-snug">{event.title}</h4>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {societyName && (
                            <span
                              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                              style={{ backgroundColor: `${event.color || '#6b7280'}15`, color: event.color || '#6b7280' }}
                            >
                              {societyName}
                            </span>
                          )}
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusStyles[event.status]}`}>
                            {statusLabels[event.status]}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 shrink-0" />
                          {event.all_day
                            ? format(startDate, "dd 'de' MMMM", { locale: ptBR }) + ' • Dia inteiro'
                            : format(startDate, "dd/MM 'às' HH:mm", { locale: ptBR })
                          }
                        </span>
                        {event.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 shrink-0" />
                            {event.location}
                          </span>
                        )}
                        {event.description && (
                          <p className="text-muted-foreground/70 line-clamp-1 mt-0.5">{event.description}</p>
                        )}
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

      {/* Diretoria Dialog */}
      <Dialog open={showDiretoria} onOpenChange={setShowDiretoria}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Diretoria
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {diretoria.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Nenhum membro da diretoria encontrado.</p>
            ) : (
              diretoria.map((d, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                      {d.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{d.full_name}</p>
                    {d.society_name && (
                      <p className="text-xs text-muted-foreground">{d.society_name}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Membros Dialog */}
      <Dialog open={showMembros} onOpenChange={setShowMembros}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              Membros ({membros.length})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {membros.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Nenhum membro encontrado.</p>
            ) : (
              membros.map((m, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                      {m.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{m.name}</p>
                    {m.society_name && (
                      <p className="text-xs text-muted-foreground">{m.society_name}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
