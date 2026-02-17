import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, ArrowRight, X } from 'lucide-react';

export function PastorNotificationBanner() {
  const { isManagement } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isManagement) return;
    const fetchUnread = async () => {
      const { count } = await supabase
        .from('pastor_feedback')
        .select('*', { count: 'exact', head: true })
        .eq('read', false);
      setUnreadCount(count || 0);
    };
    fetchUnread();
  }, [isManagement]);

  if (!isManagement || unreadCount === 0 || dismissed) return null;

  return (
    <Card className="border-primary/30 bg-primary/5 mb-6">
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm">
              {unreadCount} {unreadCount === 1 ? 'nova sugestão' : 'novas sugestões'} do Pastor
            </p>
            <p className="text-xs text-muted-foreground">Clique para ver e responder</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => navigate('/pastor-sugestoes')}>
            Ver sugestões <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setDismissed(true)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
