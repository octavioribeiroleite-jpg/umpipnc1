import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { PastorLayout } from '@/components/pastor/PastorLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { SugestaoForm } from '@/components/pastor/SugestaoForm';
import {
  DollarSign, Users, CheckSquare, TrendingUp, Sparkles, RefreshCw, Calendar,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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
    saldo: 0, entradas: 0, saidas: 0, mensalidades: 0,
    membersActive: 0, tasksPending: 0, tasksDone: 0,
  });
  const [meetings, setMeetings] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    if (!slug) return;
    supabase.from('societies').select('*').eq('slug', slug).maybeSingle()
      .then(({ data }) => { if (data) setSociety(data as Society); });
  }, [slug]);

  useEffect(() => {
    if (society) fetchData();
  }, [society]);

  const fetchData = async (force = false) => {
    if (!society) return;
    if (force) setRefreshing(true);
    else setLoading(true);

    try {
      const [meetingsRes, tasksRes, membersRes, transRes, paymentsRes, aiRes] = await Promise.all([
        supabase.from('meetings').select('id, title, date, status').eq('society_id', society.id).order('date', { ascending: false }).limit(5),
        supabase.from('tasks').select('id, title, status, priority, due_date').eq('society_id', society.id),
        supabase.from('members').select('id, name, active, phone, email').eq('society_id', society.id).eq('active', true).order('name'),
        supabase.from('transactions').select('amount, type').eq('society_id', society.id),
        supabase.from('membership_payments').select('amount, status, member_id').eq('status', 'pago'),
        supabase.functions.invoke('summarize-for-pastor', {
          body: { society_id: society.id, ...(force ? { force: true } : {}) },
        }),
      ]);

      setMeetings(meetingsRes.data || []);
      const allTasks = tasksRes.data || [];
      setTasks(allTasks.filter(t => t.status !== 'done').slice(0, 5));
      setMembers(membersRes.data || []);

      const trans = transRes.data || [];
      const entradas = trans.filter(t => t.type === 'entrada').reduce((s, t) => s + Number(t.amount), 0);
      const saidas = trans.filter(t => t.type === 'saida').reduce((s, t) => s + Number(t.amount), 0);

      const memberIds = new Set((membersRes.data || []).map(m => m.id));
      const mensalidades = (paymentsRes.data || []).filter(p => memberIds.has(p.member_id)).reduce((s, p) => s + Number(p.amount), 0);

      setStats({
        saldo: mensalidades + entradas - saidas,
        entradas, saidas, mensalidades,
        membersActive: (membersRes.data || []).length,
        tasksPending: allTasks.filter(t => t.status !== 'done').length,
        tasksDone: allTasks.filter(t => t.status === 'done').length,
      });

      if (aiRes.data?.summaries) setSummaryData(aiRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (!society || loading) {
    return (
      <PastorLayout>
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <img src={logoIpnc} alt="IPNC" className="h-16 w-16 animate-logo-pulse" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
          <Progress value={undefined} className="w-48 h-1" />
        </div>
      </PastorLayout>
    );
  }

  return (
    <PastorLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl flex items-center justify-center text-white font-bold" style={{ backgroundColor: society.color }}>
              {society.name.substring(0, 3)}
            </div>
            <div>
              <h1 className="text-xl font-bold">{society.name}</h1>
              <p className="text-sm text-muted-foreground">Dados da sociedade</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchData(true)} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        {/* AI Summary */}
        {summaryData?.summaries?.geral && (
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Resumo da IA
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">{summaryData.summaries.geral}</p>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-emerald-600" />
                <span className="text-xs text-muted-foreground">Saldo</span>
              </div>
              <p className={`text-lg font-bold ${stats.saldo >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                R$ {stats.saldo.toFixed(2).replace('.', ',')}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-blue-600" />
                <span className="text-xs text-muted-foreground">Membros</span>
              </div>
              <p className="text-lg font-bold">{stats.membersActive}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckSquare className="h-4 w-4 text-amber-600" />
                <span className="text-xs text-muted-foreground">Concluídas</span>
              </div>
              <p className="text-lg font-bold">{stats.tasksDone}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-rose-600" />
                <span className="text-xs text-muted-foreground">Pendentes</span>
              </div>
              <p className="text-lg font-bold">{stats.tasksPending}</p>
            </CardContent>
          </Card>
        </div>

        {/* Meetings */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Reuniões Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {meetings.length > 0 ? (
              <div className="space-y-2">
                {meetings.map(m => (
                  <div key={m.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                    <span className="font-medium">{m.title}</span>
                    <Badge variant="outline">{format(new Date(m.date), "dd/MM/yy", { locale: ptBR })}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">Nenhuma reunião registrada.</p>
            )}
          </CardContent>
        </Card>

        {/* Tasks */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Tarefas Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            {tasks.length > 0 ? (
              <div className="space-y-2">
                {tasks.map(t => (
                  <div key={t.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                    <div>
                      <span className="font-medium">{t.title}</span>
                      {t.due_date && (
                        <span className="text-xs text-muted-foreground ml-2">
                          até {format(new Date(t.due_date), "dd/MM", { locale: ptBR })}
                        </span>
                      )}
                    </div>
                    <Badge variant={t.priority === 'high' ? 'destructive' : 'outline'} className="text-xs">
                      {t.priority === 'high' ? 'Alta' : t.priority === 'medium' ? 'Média' : 'Baixa'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">Nenhuma tarefa pendente.</p>
            )}
          </CardContent>
        </Card>

        {/* Members */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Membros Ativos ({members.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {members.map(m => (
                <div key={m.id} className="text-sm py-1">
                  <p className="font-medium">{m.name}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Suggestion Form */}
        <Card>
          <CardContent className="p-4">
            <SugestaoForm section={society.slug} sectionLabel={society.name} />
          </CardContent>
        </Card>
      </div>
    </PastorLayout>
  );
}
