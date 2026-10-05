import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSnapshotRead } from '@/hooks/useSnapshotRead';
import { QueryErrorState } from '@/components/ui/query-error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Alert {
  type: 'overdue_task' | 'no_minutes';
  title: string;
  detail: string;
  severity: 'high' | 'medium';
  societyName?: string;
}

export function AlertsSection() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const { user } = useAuth();
  const read = useSnapshotRead(`pastor-alerts:${user?.id ?? ''}`);
  const { run } = read;

  const fetchAlerts = useCallback(async () => {
    await run(async () => {
      const now = new Date();

      const [tasksRes, meetingsRes, societiesRes] = await Promise.all([
        supabase.from('tasks').select('id, title, due_date, status, society_id').neq('status', 'done').not('due_date', 'is', null).lt('due_date', now.toISOString().split('T')[0]),
        supabase.from('meetings').select('id, title, date, final_minutes, status, society_id').eq('status', 'fechada').is('final_minutes', null),
        supabase.from('societies').select('id, name').eq('active', true),
      ]);

      const failed = [tasksRes, meetingsRes, societiesRes].find(result => result.error);
      if (failed?.error) throw failed.error;

      const societyMap = new Map((societiesRes.data || []).map(s => [s.id, s.name]));
      const newAlerts: Alert[] = [];

      (tasksRes.data || []).forEach(t => {
        newAlerts.push({
          type: 'overdue_task',
          title: t.title,
          detail: `Venceu em ${format(new Date(t.due_date!), "dd/MM/yy", { locale: ptBR })}`,
          severity: 'high',
          societyName: t.society_id ? societyMap.get(t.society_id) : undefined,
        });
      });

      (meetingsRes.data || []).forEach(m => {
        newAlerts.push({
          type: 'no_minutes',
          title: m.title,
          detail: `Reunião de ${format(new Date(m.date), "dd/MM/yy", { locale: ptBR })} sem ata`,
          severity: 'medium',
          societyName: m.society_id ? societyMap.get(m.society_id) : undefined,
        });
      });

      return () => setAlerts(newAlerts);
    });
  }, [run]);
  useEffect(() => { if (user) void fetchAlerts(); }, [user, fetchAlerts]);

  if (!read.hasSnapshot && !read.error) return <Skeleton aria-label="Consultando pendências" className="h-24 rounded-card" />;
  if (read.hasSnapshot && alerts.length === 0 && !read.error) return null;

  const iconMap = {
    overdue_task: Clock,
    no_minutes: FileText,
  };

  const highAlerts = alerts.filter(a => a.severity === 'high');
  const mediumAlerts = alerts.filter(a => a.severity === 'medium');

  return (
    <section className="space-y-3">
    {read.error && <QueryErrorState message="Não foi possível consultar os alertas e pendências." onRetry={() => void fetchAlerts()} retrying={read.loading} hasPreviousData={read.hasSnapshot} />}
    {read.hasSnapshot && alerts.length > 0 && <Card className="border-warning/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex flex-wrap items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning" />
          Alertas e Pendências
          {highAlerts.length > 0 && (
            <Badge variant="destructive" className="text-xs">{highAlerts.length} urgente{highAlerts.length > 1 ? 's' : ''}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {[...highAlerts, ...mediumAlerts].slice(0, 8).map((alert, i) => {
          const Icon = iconMap[alert.type];
          return (
            <div key={i} className="flex min-h-[72px] items-start gap-3 text-base py-3 border-b last:border-0">
              <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${alert.severity === 'high' ? 'text-destructive' : 'text-warning'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium min-w-0 whitespace-normal break-words">{alert.title}</p>
                  {alert.societyName && (
                    <Badge variant="outline" className="text-xs px-1.5 py-0 flex-shrink-0">{alert.societyName}</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{alert.detail}</p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>}
    </section>
  );
}
