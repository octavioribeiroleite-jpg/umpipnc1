import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useTreasuryAccess } from './useTreasuryWorkflow';
import { useAuth } from '@/contexts/AuthContext';
import {
  decodeTreasuryDashboard, decodeTreasuryEntry, decodeTreasuryStatement,
  insertTreasuryEntryIdempotently,
  sameTreasuryEntry, treasuryError, treasuryStatementParams,
  validateTreasuryEntry, validateTreasuryFund,
  type TreasuryEntryInput, type TreasuryEntry, type TreasuryFundInput,
  type TreasuryStatementFilters,
} from '@/lib/treasury';

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
type Fields<T> = { [K in keyof T]: T[K] };
type EntryRow = Omit<TreasuryEntry, 'balance_after_cents'>;
type FundRow = Required<TreasuryFundInput> & { created_at: string };
type TreasuryDatabase = {
  public: {
    Tables: {
      treasury_entries: { Row: EntryRow; Insert: Fields<TreasuryEntryInput>; Update: Partial<EntryRow>; Relationships: [] };
      treasury_funds: { Row: FundRow; Insert: Fields<TreasuryFundInput>; Update: Partial<FundRow>; Relationships: [] };
    };
    Views: Record<never, never>;
    Functions: {
      treasury_dashboard: { Args: Record<never, never>; Returns: Json };
      treasury_statement: { Args: ReturnType<typeof treasuryStatementParams>; Returns: Json };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};

// Keep the new schema contract local until generated project types are refreshed after deployment.
const treasury = supabase as unknown as SupabaseClient<TreasuryDatabase>;

export function useTreasuryDashboard() {
  return useQuery({
    queryKey: ['treasury', 'dashboard'],
    queryFn: async ({ signal }) => {
      const { data, error } = await treasury.rpc('treasury_dashboard').abortSignal(signal);
      if (error) throw treasuryError(error);
      return decodeTreasuryDashboard(data);
    },
    retry: false,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useTreasuryStatement(filters: TreasuryStatementFilters = {}) {
  return useQuery({
    queryKey: ['treasury', 'statement', filters],
    queryFn: async ({ signal }) => {
      const { data, error } = await treasury.rpc('treasury_statement', treasuryStatementParams(filters)).abortSignal(signal);
      if (error) throw treasuryError(error);
      return decodeTreasuryStatement(data);
    },
    retry: false,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useTreasuryMutations() {
  const { user, isAdmin, profile } = useAuth();
  const queryClient = useQueryClient();
  const access = useTreasuryAccess();
  const requireAdmin = () => {
    if (!user || !isAdmin || !profile?.active) throw treasuryError({ code: '42501' });
  };
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['treasury'] });
  };

  const createEntry = useMutation({
    retry: false,
    mutationFn: async (input: TreasuryEntryInput & { id: string }) => {
      if (!user || !profile?.active || (!isAdmin && (!access.data?.fund_ids.includes(input.fund_id) || input.kind !== 'income' || input.status !== 'pending'))) throw treasuryError({ code: '42501' });
      return insertTreasuryEntryIdempotently(input, {
        insert: async row => treasury.from('treasury_entries').insert(row).select().single(),
        findById: async id => treasury.from('treasury_entries').select().eq('id', id).maybeSingle(),
      });
    },
    onSuccess: refresh,
  });

  const updateEntry = useMutation({
    retry: false,
    mutationFn: async (input: TreasuryEntryInput & { id: string; revision: number }) => {
      requireAdmin();
      validateTreasuryEntry(input);
      if (!Number.isSafeInteger(input.revision) || input.revision < 1) throw new Error('A revisão do lançamento é inválida. Atualize o extrato.');
      const { id, revision, ...fields } = input;
      const { data, error } = await treasury.from('treasury_entries')
        .update({ ...fields, revision: revision + 1 }).eq('id', id).eq('revision', revision).select().maybeSingle();
      if (error) throw treasuryError(error);
      if (!data) {
        // The response may have been lost after a successful write. Only that exact revision is a valid retry.
        const existing = await treasury.from('treasury_entries').select().eq('id', id).maybeSingle();
        if (existing.error) throw treasuryError(existing.error);
        if (existing.data) {
          const entry = decodeTreasuryEntry(existing.data, false);
          if (entry.revision === revision + 1 && sameTreasuryEntry(entry, input)) return entry;
        }
        throw treasuryError({ code: '40001' });
      }
      return decodeTreasuryEntry(data, false);
    },
    onSuccess: refresh,
  });

  const createFund = useMutation({
    retry: false,
    mutationFn: async (input: TreasuryFundInput) => {
      requireAdmin();
      const payload = { ...input, name: input.name.trim(), abbreviation: input.abbreviation.trim().toLocaleUpperCase('pt-BR') };
      validateTreasuryFund(payload);
      const { data, error } = await treasury.from('treasury_funds').insert(payload).select().single();
      if (error) throw treasuryError(error);
      if (!data) throw new Error('O cadastro não foi confirmado. Atualize a página antes de tentar novamente.');
      return data;
    },
    onSuccess: refresh,
  });

  return { createEntry, updateEntry, createFund };
}
