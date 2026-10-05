import { useCallback, useEffect, useState } from 'react';
import { useSnapshotRead } from '@/hooks/useSnapshotRead';
import { QueryErrorState } from '@/components/ui/query-error-state';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, ArrowRight, X } from 'lucide-react';

export function PastorNotificationBanner() {
  const { isManagement, user } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const read = useSnapshotRead(`pastor-notification:${user?.id ?? ''}:${isManagement}`);
  const { run } = read;

  const fetchUnread = useCallback(async () => {
    await run(async () => {
      const { count, error } = await supabase.from('pastor_feedback').select('*', { count: 'exact', head: true }).eq('read', false);
      if (error) throw error;
      return () => setUnreadCount(count ?? 0);
    });
  }, [run]);

  useEffect(() => {
    if (!isManagement) return;
    setDismissed(false);
    void fetchUnread();
  }, [isManagement, user, fetchUnread]);

  if (!isManagement || dismissed) return null;
  if (!read.error && (!read.hasSnapshot || unreadCount === 0)) return null;

  return (
    <section className="mb-6 space-y-3">
    {read.error && <QueryErrorState message="Não foi possível consultar as sugestões do pastor." onRetry={() => void fetchUnread()} retrying={read.loading} hasPreviousData={read.hasSnapshot} />}
    {read.hasSnapshot && unreadCount > 0 && <Card className="border-primary/30 bg-primary/5">
      <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-base">
              {unreadCount} {unreadCount === 1 ? 'nova sugestão' : 'novas sugestões'} do Pastor
            </p>
            <p className="text-sm text-muted-foreground">Clique para ver e responder</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => navigate('/sugestoes')}>
            Ver sugestões <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
          <Button size="icon" variant="ghost" className="h-11 w-11" aria-label="Dispensar aviso de sugestões" onClick={() => setDismissed(true)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>}
    </section>
  );
}
