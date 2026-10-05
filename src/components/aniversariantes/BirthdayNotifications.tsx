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
          <h2 className="font-semibold text-base">Notificações</h2>
        </div>
        <p className="text-sm text-muted-foreground pl-7">Nenhuma notificação ainda.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-base">Notificações</h2>
          {unreadCount > 0 && <Badge className="text-xs px-1.5">{unreadCount}</Badge>}
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" className="min-h-11 h-auto whitespace-normal text-sm" onClick={() => markAllAsRead.mutate()}>
            <CheckCheck className="h-3.5 w-3.5 mr-1" />
            Marcar todas como lidas
          </Button>
        )}
      </div>
      <div className="space-y-1.5 max-h-64 overflow-y-auto">
        {notifications.map(n => (
          <div
            key={n.id}
            className={`p-4 min-h-11 rounded-xl border text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              n.lida ? 'bg-card border-border' : 'bg-primary/5 border-primary/20'
            }`}
            role={!n.lida ? 'button' : undefined}
            tabIndex={!n.lida ? 0 : undefined}
            aria-label={!n.lida ? `Marcar como lida: ${n.titulo}` : undefined}
            onKeyDown={event => { if (!n.lida && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); markAsRead.mutate(n.id); } }}
            onClick={() => !n.lida && markAsRead.mutate(n.id)}
          >
            <p className="font-medium text-sm">{n.titulo}</p>
            <p className="text-sm text-muted-foreground mt-1 break-words whitespace-pre-line">{n.mensagem}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
