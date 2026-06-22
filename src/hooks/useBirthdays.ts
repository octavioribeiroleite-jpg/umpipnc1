import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Birthday {
  id: string;
  nome: string;
  dia: number;
  mes: number;
  ano_nascimento: number | null;
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
  ano_nascimento?: number | null;
  departamento?: string;
  observacao?: string;
  ativo?: boolean;
  pendente_revisao?: boolean;
}

const MAX_SESSION_ERROR = 'Sua sessão expirou. Saia do aplicativo, entre novamente e repita a operação.';

async function ensureAuthenticatedSession() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    console.error('[Birthdays] Erro ao verificar sessão:', error);
    throw new Error(MAX_SESSION_ERROR);
  }

  if (!data.session) {
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError || !refreshed.session) {
      console.error('[Birthdays] Não foi possível renovar a sessão:', refreshError);
      throw new Error(MAX_SESSION_ERROR);
    }
  }
}

function birthdayMutationError(
  error: { code?: string; message: string; details?: string | null },
  action: 'cadastrar' | 'atualizar' | 'excluir',
) {
  console.error(`[Birthdays] Erro ao ${action}:`, error);

  if (error.code === '42501' || error.message.toLowerCase().includes('row-level security')) {
    return new Error('Seu usuário está sem permissão para salvar aniversariantes. Entre novamente e tente outra vez.');
  }

  if (error.code === 'PGRST204' || error.message.includes('ano_nascimento')) {
    return new Error('A atualização do banco de dados ainda não foi aplicada. O campo de ano não está disponível.');
  }

  return new Error(`Não foi possível ${action}: ${error.message}`);
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
      await ensureAuthenticatedSession();
      const { error } = await supabase.from('aniversariantes').insert(data);
      if (error) throw birthdayMutationError(error, 'cadastrar');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['aniversariantes'] }),
  });

  const updateBirthday = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Birthday> & { id: string }) => {
      await ensureAuthenticatedSession();
      const { error } = await supabase.from('aniversariantes').update(data).eq('id', id);
      if (error) throw birthdayMutationError(error, 'atualizar');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['aniversariantes'] }),
  });

  const deleteBirthday = useMutation({
    mutationFn: async (id: string) => {
      await ensureAuthenticatedSession();
      const { error } = await supabase.from('aniversariantes').delete().eq('id', id);
      if (error) throw birthdayMutationError(error, 'excluir');
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
