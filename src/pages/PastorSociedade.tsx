import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Calendar,
  CheckSquare,
  DollarSign,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PastorLayout } from '@/components/pastor/PastorLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { SummaryCard } from '@/components/ui/summary-card';
import { SugestaoForm } from '@/components/pastor/SugestaoForm';
import logoIpnc from '@/assets/logo-ipnc.png';

interface Society {
  id: string;
  name: string;
  slug: string;
  color: string;
}

export default function PastorSociedade() {
  const { slug } = useParams<{ slug: string }>();
  const [society, setSociety] = useState<Society | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [stats, setStats] = useState({
    saldo: 0,
    entradas: 0,
    saidas: 0,
    mensalidades: 0,
    membersActive: 0,
    tasksPending: 0,
    tasksDone: 0,
    meetingsTotal: 0,
  });
  const [meetings, setMeetings] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    if (!slug) return;
    supabase
      .from('societies')
      .select('*')
      .eq('slug', slug)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setSociety(data as Society);
      });
  }, [slug]);

  useEffect(() => {
    if (society) void fetchData();
  }, [society]);

  const fetchData = async (force = false) => {
    if (!society) return;
    if (force) setRefreshing(true);
    else setLoading(true);

    try {
      const [meetingsRes, tasksRes, membersRes, transRes, aiRes] = await Promise.all([
        supabase
          .from('meetings')
          .select('id, title, date, status')
          .eq('society_id', society.id)
          .order('date', { ascending: false })
          .limit(5),
        supabase
          .from('tasks')
          .select('id, title, status, priority, due_date')
          .eq('society_id', society.id),
        supabase
          .from('members')
          .select('id, name, active, phone, email')
          .eq('society_id', society.id)
          .eq('active', true)
          .order('name'),
        supabase.from('transactions').select('amount, type').eq('society_id', society.id),
        supabase.functions.invoke('summarize-for-pastor', {
          body: { society_id: society.id, ...(force ? { force: true } : {}) },
        }),
      ]);

      const allMembers = membersRes.data || [];
      const memberIds = allMembers.map((member) => member.id);

      let mensalidades = 0;
      if (memberIds.length > 0) {
        const { data: paymentsData } = await supabase
          .from('membership_payments')
          .select('amount')
          .eq('status', 'pago')
          .in('member_id', memberIds);
        mensalidades = (paymentsData || []).reduce((sum, payment) => sum + Number(payment.amount), 0);
      }

      const allMeetings = meetingsRes.data || [];
      setMeetings(allMeetings);
      const allTasks = tasksRes.data || [];
      setTasks(allTasks.filter((task) => task.status !== 'done').slice(0, 5));
      setMembers(allMembers);

      const transactions = transRes.data || [];
      const entradas = transactions
        .filter((transaction) => transaction.type === 'entrada')
        .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
      const saidas = transactions
        .filter((transaction) => transaction.type === 'saida')
        .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

      setStats({
        saldo: mensalidades + entradas - saidas,
        entradas,
        saidas,
        mensalidades,
        membersActive: allMembers.length,
        tasksPending: allTasks.filter((task) => task.status !== 'done').length,
        tasksDone: allTasks.filter((task) => task.status === 'done').length,
        meetingsTotal: allMeetings.length,
      });

      if (aiRes.data?.summaries) setSummaryData(aiRes.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (!society || loading) {
    return (
      <PastorLayout>
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <img src={logoIpnc} alt="IPNC" className="h-16 w-16 animate-logo-pulse" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
          <Progress value={undefined} className="h-1 w-48" />
        </div>
      </PastorLayout>
    );
  }

  const formattedBalance = `R$ ${Math.abs(stats.saldo).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;

  return (
    <PastorLayout>
      <div className="space-y-5 md:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white sm:h-12 sm:w-12 sm:text-sm"
              style={{ backgroundColor: society.color }}
            >
              {society.name.substring(0, 3)}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold sm:text-xl">{society.name}</h1>
              <p className="text-xs text-muted-foreground sm:text-sm">Dados da sociedade</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchData(true)} disabled={refreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        {summaryData?.summaries?.geral && (
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-5 w-5 text-primary" />
                Resumo da IA
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">{summaryData.summaries.geral}</p>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-3 xl:grid-cols-5">
          <SummaryCard
            label="Saldo"
            value={stats.saldo < 0 ? `-${formattedBalance}` : formattedBalance}
            meta="caixa disponível"
            icon={DollarSign}
            tone={stats.saldo >= 0 ? 'positive' : 'negative'}
            density="compact"
          />
          <SummaryCard
            label="Membros"
            value={stats.membersActive}
            meta="ativos"
            icon={Users}
            tone="info"
            density="compact"
          />
          <SummaryCard
            label="Concluídas"
            value={stats.tasksDone}
            meta="tarefas finalizadas"
            icon={CheckSquare}
            tone="positive"
            density="compact"
          />
          <SummaryCard
            label="Pendentes"
            value={stats.tasksPending}
            meta="tarefas em aberto"
            icon={TrendingUp}
            tone={stats.tasksPending > 0 ? 'warning' : 'neutral'}
            density="compact"
          />
          <SummaryCard
            label="Reuniões"
            value={stats.meetingsTotal}
            meta="registradas"
            icon={Calendar}
            tone="neutral"
            density="compact"
            className="col-span-2 md:col-span-1"
          />
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Reuniões Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {meetings.length > 0 ? (
              <div className="space-y-2">
                {meetings.map((meeting) => (
                  <div key={meeting.id} className="flex items-center justify-between border-b pb-2 text-sm last:border-0">
                    <span className="font-medium">{meeting.title}</span>
                    <Badge variant="outline">
                      {format(new Date(meeting.date), 'dd/MM/yy', { locale: ptBR })}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm italic text-muted-foreground">Nenhuma reunião registrada.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Tarefas Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            {tasks.length > 0 ? (
              <div className="space-y-2">
                {tasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between border-b pb-2 text-sm last:border-0">
                    <div>
                      <span className="font-medium">{task.title}</span>
                      {task.due_date && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          até {format(new Date(task.due_date), 'dd/MM', { locale: ptBR })}
                        </span>
                      )}
                    </div>
                    <Badge variant={task.priority === 'high' ? 'destructive' : 'outline'} className="text-xs">
                      {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm italic text-muted-foreground">Nenhuma tarefa pendente.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Membros Ativos ({members.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {members.map((member) => (
                <div key={member.id} className="py-1 text-sm">
                  <p className="font-medium">{member.name}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <SugestaoForm section={society.slug} sectionLabel={society.name} />
          </CardContent>
        </Card>
      </div>
    </PastorLayout>
  );
}
