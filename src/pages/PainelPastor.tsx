import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  DollarSign, Users, CheckSquare, TrendingUp, Sparkles, RefreshCw,
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
  generated_at?: string;
  from_cache?: boolean;
}

export default function PainelPastor() {
  const { user, isPastor, isAdmin } = useAuth();
  const [data, setData] = useState<SummaryData | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [societies, setSocieties] = useState<Society[]>([]);

  useEffect(() => {
    supabase.from('societies').select('id, name, slug, color').eq('active', true).order('name')
      .then(({ data }) => { if (data) setSocieties(data); });
  }, []);

  const fetchData = async (force = false) => {
    if (force) setRefreshing(true);
    else setLoadingData(true);
    try {
      const { data: result, error: fnError } = await supabase.functions.invoke('summarize-for-pastor', {
        body: force ? { force: true } : undefined,
      });
      if (fnError) throw fnError;
      if (result?.error) throw new Error(result.error);
      setData(result);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao carregar dados');
    } finally {
      setLoadingData(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!user || (!isPastor && !isAdmin)) return;
    fetchData();
  }, [user, isPastor, isAdmin]);

  const stats = data?.stats;
  const summaries = data?.summaries || {};

  return (
    <PastorLayout>
      {loadingData ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <img src={logoIpnc} alt="Renovo IPNC" className="h-20 w-20 animate-logo-pulse" />
          <p className="text-sm text-muted-foreground animate-fade-up">Atualizando dados...</p>
          <Progress value={undefined} className="w-48 h-1" />
        </div>
      ) : error ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4">
            <p className="text-destructive text-sm">{error}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => fetchData()}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Cache info + refresh */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {data?.generated_at && (
                <span>Atualizado em {format(new Date(data.generated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
              )}
              {data?.from_cache && <Badge variant="outline" className="text-xs">Cache</Badge>}
            </div>
            <Button variant="outline" size="sm" onClick={() => fetchData(true)} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Atualizando...' : 'Atualizar'}
            </Button>
          </div>

          {/* General AI Summary */}
          {summaries.geral && (
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Visão Geral
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
                  <span className="text-xs text-muted-foreground">Saldo Total</span>
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

          {/* Alerts */}
          <AlertsSection />

          {/* Society Cards */}
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
              Sociedades
            </h3>
            <div className="space-y-3">
              {societies.map(s => (
                <SocietyOverviewCard key={s.id} society={s} />
              ))}
            </div>
          </div>
        </div>
      )}
    </PastorLayout>
  );
}
