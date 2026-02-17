import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { SugestaoForm } from '@/components/pastor/SugestaoForm';
import {
  DollarSign,
  Users,
  CheckSquare,
  Calendar,
  ClipboardCheck,
  TrendingUp,
  Sparkles,
  Loader2,
  LogOut,
  Church,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SummaryData {
  summaries: Record<string, string>;
  stats: {
    saldo: number;
    totalEntradas: number;
    totalSaidas: number;
    totalMensalidades: number;
    membersActive: number;
    tasksDone: number;
    tasksPending: number;
  };
  meetings: any[];
  events: any[];
  plenaries: any[];
}

export default function PainelPastor() {
  const { user, profile, roles, loading: authLoading, signOut, isAdmin, isPastor } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<SummaryData | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user || (!isPastor && !isAdmin)) return;
    const fetchData = async () => {
      setLoadingData(true);
      try {
        const { data: result, error: fnError } = await supabase.functions.invoke('summarize-for-pastor');
        if (fnError) throw fnError;
        if (result?.error) throw new Error(result.error);
        setData(result);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Erro ao carregar dados');
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, [user, isPastor, isAdmin]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  if (!isPastor && !isAdmin) {
    navigate('/');
    return null;
  }

  const stats = data?.stats;
  const summaries = data?.summaries || {};

  const sections = [
    {
      key: 'reunioes',
      label: 'Reuniões',
      icon: Users,
      color: 'bg-blue-500/10 text-blue-600',
      summary: summaries.reunioes,
    },
    {
      key: 'financas',
      label: 'Finanças',
      icon: DollarSign,
      color: 'bg-emerald-500/10 text-emerald-600',
      summary: summaries.financas,
    },
    {
      key: 'tarefas',
      label: 'Tarefas',
      icon: CheckSquare,
      color: 'bg-amber-500/10 text-amber-600',
      summary: summaries.tarefas,
    },
    {
      key: 'calendario',
      label: 'Eventos',
      icon: Calendar,
      color: 'bg-purple-500/10 text-purple-600',
      summary: summaries.eventos,
    },
    {
      key: 'plenarias',
      label: 'Plenárias',
      icon: ClipboardCheck,
      color: 'bg-rose-500/10 text-rose-600',
      summary: summaries.plenarias,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Church className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-display font-bold text-lg">Painel do Pastor</h1>
              <p className="text-xs text-muted-foreground">
                {profile?.full_name || 'Pastor'} • IPNC Diretoria de Jovens
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={async () => { await signOut(); navigate('/auth'); }}>
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* AI General Summary */}
        {loadingData ? (
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Gerando resumo com IA... isso pode levar alguns segundos.</p>
            </div>
            <Skeleton className="h-24" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
            </div>
          </div>
        ) : error ? (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-4">
              <p className="text-destructive text-sm">{error}</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => window.location.reload()}>
                Tentar novamente
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* General AI Summary */}
            {summaries.geral && (
              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Visão Geral da UMP
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-muted-foreground">{summaries.geral}</p>
                </CardContent>
              </Card>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="h-4 w-4 text-emerald-600" />
                    <span className="text-xs text-muted-foreground">Saldo</span>
                  </div>
                  <p className={`text-lg font-bold ${(stats?.saldo || 0) >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                    R$ {(stats?.saldo || 0).toFixed(2).replace('.', ',')}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="h-4 w-4 text-blue-600" />
                    <span className="text-xs text-muted-foreground">Membros</span>
                  </div>
                  <p className="text-lg font-bold">{stats?.membersActive || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckSquare className="h-4 w-4 text-amber-600" />
                    <span className="text-xs text-muted-foreground">Tarefas Feitas</span>
                  </div>
                  <p className="text-lg font-bold">{stats?.tasksDone || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-4 w-4 text-rose-600" />
                    <span className="text-xs text-muted-foreground">Pendentes</span>
                  </div>
                  <p className="text-lg font-bold">{stats?.tasksPending || 0}</p>
                </CardContent>
              </Card>
            </div>

            {/* Section Cards with AI Summaries + Suggestion Forms */}
            {sections.map(section => (
              <Card key={section.key}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${section.color}`}>
                      <section.icon className="h-4 w-4" />
                    </div>
                    {section.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {section.summary ? (
                    <p className="text-sm leading-relaxed text-muted-foreground">{section.summary}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Sem dados disponíveis.</p>
                  )}

                  {/* Detail data */}
                  {section.key === 'reunioes' && data?.meetings && data.meetings.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {data.meetings.map((m: any) => (
                        <div key={m.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                          <span className="font-medium">{m.title}</span>
                          <Badge variant="outline">{format(new Date(m.date), "dd/MM/yy", { locale: ptBR })}</Badge>
                        </div>
                      ))}
                    </div>
                  )}

                  {section.key === 'calendario' && data?.events && data.events.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {data.events.slice(0, 5).map((e: any) => (
                        <div key={e.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                          <span className="font-medium">{e.title}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(e.start_date), "dd/MM/yy", { locale: ptBR })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {section.key === 'plenarias' && data?.plenaries && data.plenaries.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {data.plenaries.map((p: any) => (
                        <div key={p.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                          <span className="font-medium">{p.title}</span>
                          <Badge variant="outline">{format(new Date(p.date), "dd/MM/yy", { locale: ptBR })}</Badge>
                        </div>
                      ))}
                    </div>
                  )}

                  <SugestaoForm section={section.key} sectionLabel={section.label} />
                </CardContent>
              </Card>
            ))}
          </>
        )}
      </main>
    </div>
  );
}
