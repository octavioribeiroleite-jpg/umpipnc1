import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';

export function PastorLoginNotification() {
  const { isManagement, user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isManagement || !user) return;

    const sessionKey = `pastor_notif_shown_${user.id}`;
    if (sessionStorage.getItem(sessionKey)) return;

    const check = async () => {
      const { count: c } = await supabase
        .from('pastor_feedback')
        .select('*', { count: 'exact', head: true })
        .eq('read', false);
      if (c && c > 0) {
        setCount(c);
        setOpen(true);
        sessionStorage.setItem(sessionKey, 'true');
      }
    };
    check();
  }, [isManagement, user]);

  if (!isManagement) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <MessageSquare className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle>Novas Sugestões do Pastor</DialogTitle>
              <DialogDescription>
                O pastor deixou {count} {count === 1 ? 'nova sugestão' : 'novas sugestões'}. Veja agora!
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Ver depois
          </Button>
          <Button onClick={() => { setOpen(false); navigate('/pastor-sugestoes'); }}>
            Ver sugestões
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
