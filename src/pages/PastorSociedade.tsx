import { QueryErrorState } from '@/components/ui/query-error-state';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSnapshotRead } from '@/hooks/useSnapshotRead';
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
import type { Tables } from '@/integrations/supabase/types';
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
  const { user } = useAuth();
  const [society, setSociety] = useState<Society | null>(null);
  const read = useSnapshotRead(`pastor-society:${user?.id ?? ''}:${slug ?? ''}`);
  const summaryRead = useSnapshotRead(`pastor-society-summary:${user?.id ?? ''}:${slug ?? ''}`);
  const { run } = read;
  const { run: runSummary } = summaryRead;
  const [summaryData, setSummaryData] = useState<{ summaries?: { geral?: string } } | null>(null);
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
  const [meetings, setMeetings] = useState<Pick<Tables<'meetings'>, 'id' | 'title' | 'date' | 'status'>[]>([]);
  const [tasks, setTasks] = useState<Pick<Tables<'tasks'>, 'id' | 'title' | 'status' | 'priority' | 'due_date'>[]>([]);
  const [members, setMembers] = useState<Pick<Tables<'members'>, 'id' | 'name' | 'active' | 'phone' | 'email'>[]>([]);

  const fetchSummary = useCallback(async (societyId: string, force = false) => {
    await runSummary(async () => {
      const { data, error } = await supabase.functions.invoke('summarize-for-pastor', { body: { society_id: societyId, ...(force ? { force: true } : {}) } });
      if (error || data?.error) throw error || new Error(data.error);
      return () => setSummaryData(data ?? null);
    });
  }, [runSummary]);

  const fetchData = useCallback(async (force = false) => {
    if (!slug || !user) return;
    await run(async () => {
      const { data: societyData, error: societyError } = await supabase.from('societies').select('*').eq('slug', slug).maybeSingle();
      if (societyError) throw societyError;
      if (!societyData) return () => setSociety(null);
      const currentSociety = societyData as Society;
      void fetchSummary(currentSociety.id, force);
      const [meetingsRes, tasksRes, membersRes, transRes] = await Promise.all([
        supabase
          .from('meetings')
          .select('id, title, date, status')
          .eq('society_id', currentSociety.id)
          .order('date', { ascending: false })
          .limit(5),
        supabase
          .from('tasks')
          .select('id, title, status, priority, due_date')
          .eq('society_id', currentSociety.id),
        supabase
          .from('members')
          .select('id, name, active, phone, email')
          .eq('society_id', currentSociety.id)
          .eq('active', true)
          .order('name'),
        supabase.from('transactions').select('amount, type').eq('society_id', currentSociety.id),
      ]);

      const failed = [meetingsRes, tasksRes, membersRes, transRes].find(result => result.error);
      if (failed?.error) throw failed.error;
      const allMembers = membersRes.data || [];
      const memberIds = allMembers.map((member) => member.id);

      let mensalidades = 0;
      if (memberIds.length > 0) {
        const { data: paymentsData, error: paymentsError } = await supabase
          .from('membership_payments')
          .select('amount')
          .eq('status', 'pago')
          .in('member_id', memberIds);
        if (paymentsError) throw paymentsError;
        mensalidades = (paymentsData || []).reduce((sum, payment) => sum + Number(payment.amount), 0);
      }

      const allMeetings = meetingsRes.data || [];
      const allTasks = tasksRes.data || [];

      const transactions = transRes.data || [];
      const entradas = transactions
        .filter((transaction) => transaction.type === 'entrada')
        .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
      const saidas = transactions
        .filter((transaction) => transaction.type === 'saida')
        .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

      const nextStats = {
        saldo: mensalidades + entradas - saidas,
        entradas,
        saidas,
        mensalidades,
        membersActive: allMembers.length,
        tasksPending: allTasks.filter((task) => task.status !== 'done').length,
        tasksDone: allTasks.filter((task) => task.status === 'done').length,
        meetingsTotal: allMeetings.length,
      };
      return () => {
        setSociety(currentSociety); setMeetings(allMeetings);
        setTasks(allTasks.filter(task => task.status !== 'done').slice(0, 5));
        setMembers(allMembers); setStats(nextStats);
      };
    });
  }, [slug, user, run, fetchSummary]);
  useEffect(() => { void fetchData(); }, [fetchData]);

  if (!read.hasSnapshot && read.error) return <PastorLayout><Button asChild variant="outline" className="mb-4"><Link to="/pastor">Voltar ao painel</Link></Button><QueryErrorState message="Não foi possível consultar os dados da sociedade." onRetry={() => void fetchData()} retrying={read.loading} /></PastorLayout>;

  if (!read.hasSnapshot) {
    return (
      <PastorLayout>
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white p-1">
            <img src={logoIpnc} alt="Marca IPNC" className="h-full w-full object-contain animate-logo-pulse" />
          </div>
          <p className="text-sm text-muted-foreground">Carregando...</p>
          <Progress value={undefined} className="h-1 w-48" />
        </div>
      </PastorLayout>
    );
  }
  if (!society) return <PastorLayout><Card><CardContent className="p-6 space-y-4"><h1 className="text-2xl font-bold">Sociedade não encontrada</h1><p className="text-base text-muted-foreground">Esta sociedade não está disponível para consulta.</p><Button asChild><Link to="/pastor">Voltar ao painel</Link></Button></CardContent></Card></PastorLayout>;

  const formattedBalance = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.saldo);

  return (
    <PastorLayout>
      <div className="space-y-5 md:space-y-6">
        <Button asChild variant="outline"><Link to="/pastor">Voltar ao painel</Link></Button>
        {read.error && <QueryErrorState message="Não foi possível atualizar os dados da sociedade." onRetry={() => void fetchData()} retrying={read.loading} hasPreviousData={read.hasSnapshot} />}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white sm:h-12 sm:w-12 sm:text-sm"
              style={{ backgroundColor: society.color }}
            >
              {society.name.substring(0, 3)}
            </div>
            <div className="min-w-0">
              <h1 className="min-w-0 whitespace-normal break-words text-2xl font-bold">{society.name}</h1>
              <p className="text-sm text-muted-foreground">Visão atual da sociedade · últimas 5 reuniões</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => void fetchData(true)} disabled={read.loading || summaryRead.loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${read.loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Reuniões Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {meetings.length > 0 ? (
              <div className="space-y-2">
                {meetings.map((meeting) => (
                  <div key={meeting.id} className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 text-base last:border-0">
                    <span className="font-medium">{meeting.title}</span>
                    <Badge variant="outline">
                      {format(new Date(meeting.date), 'dd/MM/yy', { locale: ptBR })}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-base text-muted-foreground">Nenhuma reunião registrada.</p>
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
                  <div key={task.id} className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 text-base last:border-0">
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
              <p className="text-base text-muted-foreground">Nenhuma tarefa pendente.</p>
            )}
          </CardContent>
        </Card>

        {summaryRead.error && <QueryErrorState message="Não foi possível consultar o resumo desta sociedade." onRetry={() => void fetchSummary(society.id)} retrying={summaryRead.loading} hasPreviousData={summaryRead.hasSnapshot} />}
        {summaryRead.hasSnapshot && summaryData?.summaries?.geral && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-5 w-5 text-primary" />
                Resumo da IA
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base leading-6 text-muted-foreground">{summaryData.summaries.geral}</p>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <SummaryCard
            label="Saldo"
            value={formattedBalance}
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
            label="Reuniões consultadas"
            value={stats.meetingsTotal}
            meta="últimos 5 registros"
            icon={Calendar}
            tone="neutral"
            density="compact"
            className="sm:col-span-2 xl:col-span-1"
          />
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Membros Ativos ({members.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {members.map((member) => (
                <div key={member.id} className="py-2 text-base">
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
