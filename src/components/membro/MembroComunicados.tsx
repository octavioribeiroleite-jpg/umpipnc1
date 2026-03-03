import { useState, useEffect } from 'react';
import { useMembroSession } from '@/contexts/MembroSessionContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function MembroComunicados() {
  const { session } = useMembroSession();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;

    const fetchAnnouncements = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('pastor_announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);

      const filtered = (data || []).filter((a: any) => {
        if (a.scope === 'church') return true;
        if (a.target_societies && Array.isArray(a.target_societies) && session.societyId) {
          return a.target_societies.includes(session.societyId);
        }
        return false;
      });

      setAnnouncements(filtered);
      setLoading(false);
    };

    fetchAnnouncements();
  }, [session]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (announcements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Bell className="h-12 w-12 mb-3 opacity-40" />
        <p className="text-sm font-medium">Nenhum comunicado</p>
        <p className="text-xs mt-1">Quando houver novidades, elas aparecerão aqui.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Comunicados</h2>
      {announcements.map((a) => (
        <Card
          key={a.id}
          className={a.priority === 'urgente' ? 'border-destructive/50' : ''}
        >
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold">{a.title}</h3>
              <div className="flex items-center gap-1.5 shrink-0">
                {a.priority === 'urgente' && (
                  <Badge variant="destructive" className="text-[10px]">Urgente</Badge>
                )}
                {a.created_by_role === 'diretoria' && (
                  <Badge variant="outline" className="text-[10px]">Diretoria</Badge>
                )}
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2 whitespace-pre-line">{a.message}</p>
            <p className="text-[10px] text-muted-foreground mt-2">
              {format(new Date(a.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
