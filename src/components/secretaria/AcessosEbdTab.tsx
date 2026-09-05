import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/ebd-client';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DoorOpen, UserCheck, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface EbdClass {
  id: string;
  name: string;
  order_index: number;
}

interface LoginRow {
  id: string;
  class_id: string;
  teacher_name: string;
  created_at: string;
}

interface AcessosEbdTabProps {
  classes: EbdClass[];
  date: string;
  formattedDate: string;
}

export default function AcessosEbdTab({ classes, date, formattedDate }: AcessosEbdTabProps) {
  const [logins, setLogins] = useState<LoginRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogins = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ebd_class_logins')
      .select('id, class_id, teacher_name, created_at')
      .eq('date', date)
      .order('created_at', { ascending: false });
    if (error) {
      toast.error('Erro ao carregar acessos');
    } else {
      setLogins((data as LoginRow[]) || []);
    }
    setLoading(false);
  }, [date]);

  useEffect(() => { fetchLogins(); }, [fetchLogins]);

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Quem entrou em cada sala · {formattedDate}</p>

      {classes.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">Nenhuma turma cadastrada.</p>
      ) : (
        <div className="space-y-3">
          {classes.map(c => {
            const entries = logins.filter(l => l.class_id === c.id);
            return (
              <Card key={c.id}>
                <CardContent className="pt-4 pb-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <DoorOpen className="h-4 w-4 text-primary" />
                    <p className="font-medium text-sm">{c.name}</p>
                  </div>
                  {entries.length === 0 ? (
                    <p className="text-xs text-muted-foreground pl-6">Nenhum acesso registrado hoje.</p>
                  ) : (
                    <div className="space-y-1.5 pl-6">
                      {entries.map(e => (
                        <div key={e.id} className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1.5 text-sm">
                            <UserCheck className="h-3.5 w-3.5 text-emerald-500" />
                            {e.teacher_name}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {format(new Date(e.created_at), 'HH:mm')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
