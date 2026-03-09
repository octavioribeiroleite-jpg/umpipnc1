import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BirthdayNotification {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: string;
  referencia_data: string;
  lida: boolean;
  payload: any;
  created_at: string;
}

export function useBirthdayNotifications() {
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notificacoes_aniversarios'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notificacoes_aniversarios')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as BirthdayNotification[];
    },
  });

  const unreadCount = notifications.filter(n => !n.lida).length;

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notificacoes_aniversarios')
        .update({ lida: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notificacoes_aniversarios'] }),
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notificacoes_aniversarios')
        .update({ lida: true })
        .eq('lida', false);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notificacoes_aniversarios'] }),
  });

  return { notifications, unreadCount, isLoading, markAsRead, markAllAsRead };
}
