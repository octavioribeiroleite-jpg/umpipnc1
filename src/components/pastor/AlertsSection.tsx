import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, FileText, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Alert {
  type: 'overdue_task' | 'no_minutes' | 'upcoming_event';
  title: string;
  detail: string;
  severity: 'high' | 'medium';
}

export function AlertsSection() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const now = new Date();
      const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const [tasksRes, meetingsRes, eventsRes] = await Promise.all([
        supabase.from('tasks').select('id, title, due_date, status').neq('status', 'done').not('due_date', 'is', null).lt('due_date', now.toISOString().split('T')[0]),
        supabase.from('meetings').select('id, title, date, final_minutes, status').eq('status', 'fechada').is('final_minutes', null),
        supabase.from('events').select('id, title, start_date, status').gte('start_date', now.toISOString()).lte('start_date', sevenDaysLater.toISOString()).eq('status', 'confirmado'),
      ]);

      const newAlerts: Alert[] = [];

      (tasksRes.data || []).forEach(t => {
        newAlerts.push({
          type: 'overdue_task',
          title: t.title,
          detail: `Venceu em ${format(new Date(t.due_date!), "dd/MM/yy", { locale: ptBR })}`,
          severity: 'high',
        });
      });

      (meetingsRes.data || []).forEach(m => {
        newAlerts.push({
          type: 'no_minutes',
          title: m.title,
          detail: `Reunião de ${format(new Date(m.date), "dd/MM/yy", { locale: ptBR })} sem ata`,
          severity: 'medium',
        });
      });

      (eventsRes.data || []).forEach(e => {
        newAlerts.push({
          type: 'upcoming_event',
          title: e.title,
          detail: format(new Date(e.start_date), "dd/MM 'às' HH:mm", { locale: ptBR }),
          severity: 'medium',
        });
      });

      setAlerts(newAlerts);
    } catch (err) {
      console.error('Error fetching alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || alerts.length === 0) return null;

  const iconMap = {
    overdue_task: Clock,
    no_minutes: FileText,
    upcoming_event: Calendar,
  };

  const highAlerts = alerts.filter(a => a.severity === 'high');
  const mediumAlerts = alerts.filter(a => a.severity === 'medium');

  return (
    <Card className="border-warning/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
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
            <div key={i} className="flex items-start gap-3 text-sm py-1.5 border-b last:border-0">
              <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${alert.severity === 'high' ? 'text-destructive' : 'text-warning'}`} />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{alert.title}</p>
                <p className="text-xs text-muted-foreground">{alert.detail}</p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
