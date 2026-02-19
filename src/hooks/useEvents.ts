import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type EventStatus = 'confirmado' | 'pendente' | 'cancelado';
export type EventOrigin = 'reuniao' | 'manual';

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  all_day: boolean | null;
  location: string | null;
  color: string | null;
  status: EventStatus;
  origem: EventOrigin;
  reuniao_id: string | null;
  society_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateEventInput {
  title: string;
  description?: string;
  start_date: string;
  end_date?: string;
  all_day?: boolean;
  location?: string;
  color?: string;
  status?: EventStatus;
  society_id?: string;
}

export interface UpdateEventInput extends Partial<CreateEventInput> {
  id: string;
}

export function useEvents(month?: number, year?: number) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const eventsQuery = useQuery({
    queryKey: ['events', month, year],
    queryFn: async () => {
      let query = supabase
        .from('events')
        .select('*')
        .order('start_date', { ascending: true });

      // Filter by month/year if provided
      if (month !== undefined && year !== undefined) {
        const startOfMonth = new Date(year, month, 1).toISOString();
        const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
        query = query
          .gte('start_date', startOfMonth)
          .lte('start_date', endOfMonth);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as CalendarEvent[];
    },
  });

  const upcomingEventsQuery = useQuery({
    queryKey: ['events', 'upcoming'],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .gte('start_date', now)
        .neq('status', 'cancelado')
        .order('start_date', { ascending: true })
        .limit(10);

      if (error) throw error;
      return data as CalendarEvent[];
    },
  });

  const createEvent = useMutation({
    mutationFn: async (input: CreateEventInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('events')
        .insert({
          ...input,
          origem: 'manual',
          status: input.status || 'confirmado',
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast({
        title: 'Evento criado',
        description: 'O evento foi adicionado ao calendário.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao criar evento',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateEvent = useMutation({
    mutationFn: async ({ id, ...input }: UpdateEventInput) => {
      const { data, error } = await supabase
        .from('events')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast({
        title: 'Evento atualizado',
        description: 'As alterações foram salvas.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar evento',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast({
        title: 'Evento excluído',
        description: 'O evento foi removido do calendário.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao excluir evento',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    events: eventsQuery.data || [],
    upcomingEvents: upcomingEventsQuery.data || [],
    isLoading: eventsQuery.isLoading,
    isUpcomingLoading: upcomingEventsQuery.isLoading,
    createEvent,
    updateEvent,
    deleteEvent,
    refetch: eventsQuery.refetch,
  };
}
