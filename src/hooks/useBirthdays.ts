import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Birthday {
  id: string;
  nome: string;
  dia: number;
  mes: number;
  departamento: string | null;
  observacao: string | null;
  ativo: boolean;
  pendente_revisao: boolean;
  created_at: string;
  updated_at: string;
}

export interface BirthdayInsert {
  nome: string;
  dia: number;
  mes: number;
  departamento?: string;
  observacao?: string;
  ativo?: boolean;
  pendente_revisao?: boolean;
}

function getTodayBRT() {
  const now = new Date();
  const brt = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  return { day: brt.getDate(), month: brt.getMonth() + 1, fullDate: brt };
}

export function getDaysUntilBirthday(dia: number, mes: number): number {
  const { fullDate } = getTodayBRT();
  const todayYear = fullDate.getFullYear();
  
  let nextBirthday = new Date(todayYear, mes - 1, dia);
  if (nextBirthday < new Date(fullDate.getFullYear(), fullDate.getMonth(), fullDate.getDate())) {
    nextBirthday = new Date(todayYear + 1, mes - 1, dia);
  }
  
  const today = new Date(fullDate.getFullYear(), fullDate.getMonth(), fullDate.getDate());
  const diffTime = nextBirthday.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function useBirthdays() {
  const queryClient = useQueryClient();

  const { data: birthdays = [], isLoading } = useQuery({
    queryKey: ['aniversariantes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('aniversariantes')
        .select('*')
        .order('mes', { ascending: true })
        .order('dia', { ascending: true });
      if (error) throw error;
      return data as Birthday[];
    },
  });

  const activeBirthdays = birthdays.filter(b => b.ativo);

  const { day: todayDay, month: todayMonth } = getTodayBRT();

  const todayBirthdays = activeBirthdays.filter(b => b.dia === todayDay && b.mes === todayMonth);

  const weekBirthdays = activeBirthdays
    .map(b => ({ ...b, daysUntil: getDaysUntilBirthday(b.dia, b.mes) }))
    .filter(b => b.daysUntil > 0 && b.daysUntil <= 7)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  const monthBirthdays = activeBirthdays.filter(b => b.mes === todayMonth);

  const nextBirthday = activeBirthdays
    .map(b => ({ ...b, daysUntil: getDaysUntilBirthday(b.dia, b.mes) }))
    .filter(b => b.daysUntil > 0)
    .sort((a, b) => a.daysUntil - b.daysUntil)[0] || null;

  const departments = [...new Set(birthdays.map(b => b.departamento).filter(Boolean))] as string[];

  const createBirthday = useMutation({
    mutationFn: async (data: BirthdayInsert) => {
      const { error } = await supabase.from('aniversariantes').insert(data);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['aniversariantes'] }),
  });

  const updateBirthday = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Birthday> & { id: string }) => {
      const { error } = await supabase.from('aniversariantes').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['aniversariantes'] }),
  });

  const deleteBirthday = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('aniversariantes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['aniversariantes'] }),
  });

  return {
    birthdays,
    activeBirthdays,
    todayBirthdays,
    weekBirthdays,
    monthBirthdays,
    nextBirthday,
    departments,
    isLoading,
    createBirthday,
    updateBirthday,
    deleteBirthday,
  };
}
