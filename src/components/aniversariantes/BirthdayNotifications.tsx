import { Bell, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useBirthdayNotifications } from '@/hooks/useBirthdayNotifications';

export function BirthdayNotifications() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useBirthdayNotifications();

  if (notifications.length === 0) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-sm">Notificações</h2>
        </div>
        <p className="text-sm text-muted-foreground pl-7">Nenhuma notificação ainda.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-sm">Notificações</h2>
          {unreadCount > 0 && <Badge className="text-[10px] px-1.5">{unreadCount}</Badge>}
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => markAllAsRead.mutate()}>
            <CheckCheck className="h-3.5 w-3.5 mr-1" />
            Marcar todas como lidas
          </Button>
        )}
      </div>
      <div className="space-y-1.5 max-h-64 overflow-y-auto">
        {notifications.map(n => (
          <div
            key={n.id}
            className={`p-3 rounded-lg border text-sm cursor-pointer transition-colors ${
              n.lida ? 'bg-card border-border opacity-70' : 'bg-primary/5 border-primary/20'
            }`}
            onClick={() => !n.lida && markAsRead.mutate(n.id)}
          >
            <p className="font-medium text-xs">{n.titulo}</p>
            <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-line">{n.mensagem}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
