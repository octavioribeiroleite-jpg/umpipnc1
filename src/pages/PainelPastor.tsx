import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  DollarSign, TrendingUp, TrendingDown, Sparkles, RefreshCw, Calendar,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PastorLayout } from '@/components/pastor/PastorLayout';
import { AlertsSection } from '@/components/pastor/AlertsSection';
import { SocietyOverviewCard } from '@/components/pastor/SocietyOverviewCard';
import logoIpnc from '@/assets/logo-ipnc.png';

interface Society {
  id: string;
  name: string;
  slug: string;
  color: string;
}

interface SocietyStats {
  membersActive: number;
  tasksDone: number;
  tasksPending: number;
  saldo: number;
  totalEntradas: number;
  totalSaidas: number;
  totalMensalidades: number;
  lastMeetingDate?: string;
}

interface AISummary {
  geral?: string;
  financas?: string;
  tarefas?: string;
  destaques?: string | string[];
  [key: string]: any;
}

interface UpcomingEvent {
  id: string;
  title: string;
  start_date: string;
  status: string;
  location?: string;
}

export default function PainelPastor() {
  const { user, isPastor, isAdmin } = useAuth();
  
  // Layer 1: Direct data (fast)
  const [societies, setSocieties] = useState<Society[]>([]);
  const [societyStats, setSocietyStats] = useState<Record<string, SocietyStats>>({});
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  
  // Layer 2: AI summary (on-demand)
  const [aiSummary, setAiSummary] = useState<AISummary | null>(null);
  const [aiGeneratedAt, setAiGeneratedAt] = useState<string | null>(null);
  const [aiFromCache, setAiFromCache] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDataChanged, setAiDataChanged] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Layer 1: Fetch direct stats from DB
  const fetchDirectStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const [societiesRes, membersRes, tasksRes, transRes, paymentsRes, eventsRes, meetingsRes] = await Promise.all([
        supabase.from('societies').select('id, name, slug, color').eq('active', true).order('name'),
        supabase.from('members').select('id, active, society_id'),
        supabase.from('tasks').select('id, status, society_id'),
        supabase.from('transactions').select('amount, type, society_id'),
        supabase.from('membership_payments').select('amount, status, member_id'),
        supabase.from('events').select('id, title, start_date, status, location').gte('start_date', new Date().toISOString()).order('start_date', { ascending: true }).limit(5),
        supabase.from('meetings').select('id, date, society_id').order('date', { ascending: false }),
      ]);

      const socs = societiesRes.data || [];
      setSocieties(socs);
      setUpcomingEvents(eventsRes.data || []);

      const members = membersRes.data || [];
      const tasks = tasksRes.data || [];
      const transactions = transRes.data || [];
      const payments = paymentsRes.data || [];
      const meetings = meetingsRes.data || [];

      const stats: Record<string, SocietyStats> = {};
      for (const soc of socs) {
        const socMembers = members.filter(m => m.society_id === soc.id);
        const socMemberIds = new Set(socMembers.map(m => m.id));
        const socTasks = tasks.filter(t => t.society_id === soc.id);
        const socTrans = transactions.filter(t => t.society_id === soc.id);
        const socPayments = payments.filter(p => p.status === 'pago' && socMemberIds.has(p.member_id));

        const totalEntradas = socTrans.filter(t => t.type === 'entrada').reduce((s, t) => s + Number(t.amount), 0);
        const totalSaidas = socTrans.filter(t => t.type === 'saida').reduce((s, t) => s + Number(t.amount), 0);
        const totalMensalidades = socPayments.reduce((s, p) => s + Number(p.amount), 0);

        const lastMeeting = meetings.find(m => m.society_id === soc.id);

        stats[soc.id] = {
          membersActive: socMembers.filter(m => m.active).length,
          tasksDone: socTasks.filter(t => t.status === 'done').length,
          tasksPending: socTasks.filter(t => t.status !== 'done').length,
          saldo: totalMensalidades + totalEntradas - totalSaidas,
          totalEntradas,
          totalSaidas,
          totalMensalidades,
          lastMeetingDate: lastMeeting?.date,
        };
      }
      setSocietyStats(stats);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao carregar dados');
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Layer 2: Fetch AI summary (from cache or generate)
  const fetchAISummary = useCallback(async (force = false) => {
    if (force) setRefreshing(true);
    else setAiLoading(true);
    try {
      const { data: result, error: fnError } = await supabase.functions.invoke('summarize-for-pastor', {
        body: force ? { force: true } : undefined,
      });
      if (fnError) throw fnError;
      if (result?.error) throw new Error(result.error);
      
      setAiSummary(result.summaries || null);
      setAiGeneratedAt(result.generated_at || null);
      setAiFromCache(result.from_cache || false);
      setAiDataChanged(result.data_changed || false);
    } catch (err: any) {
      console.error('AI Summary error:', err);
      // Don't block the page for AI errors
    } finally {
      setAiLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!user || (!isPastor && !isAdmin)) return;
    fetchDirectStats();
    fetchAISummary();
  }, [user, isPastor, isAdmin, fetchDirectStats, fetchAISummary]);

  // Global stats computed from society stats
  const globalStats = {
    saldo: Object.values(societyStats).reduce((s, v) => s + v.saldo, 0),
    totalEntradas: Object.values(societyStats).reduce((s, v) => s + v.totalEntradas, 0),
    totalSaidas: Object.values(societyStats).reduce((s, v) => s + v.totalSaidas, 0),
  };

  return (
    <PastorLayout>
      {statsLoading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <img src={logoIpnc} alt="Renovo IPNC" className="h-20 w-20 animate-logo-pulse" />
          <p className="text-sm text-muted-foreground animate-fade-up">Carregando dados...</p>
          <Progress value={undefined} className="w-48 h-1" />
        </div>
      ) : error ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4">
            <p className="text-destructive text-sm">{error}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => fetchDirectStats()}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* AI Summary Card */}
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Resumo Pastoral (IA)
                </CardTitle>
                <div className="flex items-center gap-2">
                  {aiGeneratedAt && (
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(aiGeneratedAt), "dd/MM 'às' HH:mm", { locale: ptBR })}
                    </span>
                  )}
                  {aiFromCache && <Badge variant="outline" className="text-[10px] px-1">Cache</Badge>}
                  {aiDataChanged && <Badge variant="secondary" className="text-[10px] px-1">Dados mudaram</Badge>}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {aiLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  Carregando resumo...
                </div>
              ) : aiSummary?.geral ? (
                <div className="space-y-2">
                  <p className="text-sm leading-relaxed text-muted-foreground">{aiSummary.geral}</p>
                  {aiSummary.destaques && (
                    <div className="mt-3 pt-2 border-t">
                      <p className="text-xs font-medium mb-1">Pontos de atenção:</p>
                      {Array.isArray(aiSummary.destaques) ? (
                        <ul className="text-xs text-muted-foreground space-y-1">
                          {aiSummary.destaques.map((d: string, i: number) => (
                            <li key={i}>• {d}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-muted-foreground">{aiSummary.destaques}</p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum resumo disponível ainda.</p>
              )}
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => fetchAISummary(true)}
                disabled={refreshing}
              >
                <RefreshCw className={`h-3 w-3 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Gerando...' : aiSummary ? 'Atualizar Resumo' : 'Gerar Resumo com IA'}
              </Button>
            </CardContent>
          </Card>

          {/* Alerts */}
          <AlertsSection />

          {/* Consolidated Financial Summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-emerald-600" />
                Resumo Financeiro Consolidado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Saldo Total</p>
                  <p className={`text-lg font-bold ${globalStats.saldo >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                    R$ {globalStats.saldo.toFixed(2).replace('.', ',')}
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-1 mb-0.5">
                    <TrendingUp className="h-3 w-3 text-emerald-600" />
                    <p className="text-xs text-muted-foreground">Entradas</p>
                  </div>
                  <p className="text-sm font-semibold text-emerald-600">
                    R$ {globalStats.totalEntradas.toFixed(2).replace('.', ',')}
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-1 mb-0.5">
                    <TrendingDown className="h-3 w-3 text-destructive" />
                    <p className="text-xs text-muted-foreground">Saídas</p>
                  </div>
                  <p className="text-sm font-semibold text-destructive">
                    R$ {globalStats.totalSaidas.toFixed(2).replace('.', ',')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Society Cards */}
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
              Sociedades
            </h3>
            <div className="space-y-3">
              {societies.map(s => (
                <SocietyOverviewCard
                  key={s.id}
                  society={s}
                  stats={societyStats[s.id] || { membersActive: 0, tasksDone: 0, tasksPending: 0, saldo: 0 }}
                />
              ))}
            </div>
          </div>

          {/* Upcoming Events */}
          {upcomingEvents.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Próximos Eventos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {upcomingEvents.map(e => (
                  <div key={e.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                    <div>
                      <p className="font-medium">{e.title}</p>
                      {e.location && <p className="text-xs text-muted-foreground">{e.location}</p>}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(e.start_date), "dd/MM 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </PastorLayout>
  );
}
