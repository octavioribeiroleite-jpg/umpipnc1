import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { decodeTreasuryEntry, safeCents, treasuryError } from '@/lib/treasury';
import type { TreasuryReport, TreasuryAttachment } from '@/lib/treasury-report';

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
export interface BankMovement { id: string; revision: number; reference: string; occurred_on: string; kind: 'income' | 'expense'; amount_cents: number; allocated_cents: number; remaining_cents: number }
interface Manager { user_id: string; fund_id: string }
interface Account { user_id: string; name: string; username: string }
type Table<T> = { Row: { [K in keyof T]: T[K] }; Insert: Partial<T>; Update: Partial<T>; Relationships: [] };
type Database = { public: { Tables: { treasury_bank_transactions: Table<BankMovement>; treasury_managers: Table<Manager>; treasury_attachments: Table<TreasuryAttachment> }; Views: Record<never, never>; Functions: {
  treasury_access: { Args: Record<never, never>; Returns: { admin: boolean; fund_ids: string[] } };
  treasury_admin_accounts: { Args: Record<never, never>; Returns: Account[] };
  treasury_bank_reconciliation: { Args: Record<never, never>; Returns: BankMovement[] };
  treasury_review_queue: { Args: { p_fund_id: string | null; p_offset: number; p_limit: number }; Returns: { entries: Json[]; total_count: number } };
  treasury_report: { Args: { p_year: number; p_fund_id: string | null }; Returns: Json };
}; Enums: Record<never, never>; CompositeTypes: Record<never, never> } };
const client = supabase as unknown as SupabaseClient<Database>;
export const RECEIPT_BUCKET = 'treasury-receipts';

export function useTreasuryAccess() {
  const { user, loading } = useAuth();
  return useQuery({ queryKey: ['treasury', 'access', user?.id], enabled: Boolean(user) && !loading, retry: false, staleTime: 0,
    queryFn: async ({ signal }) => { const result = await client.rpc('treasury_access').abortSignal(signal); if (result.error) throw treasuryError(result.error); return result.data; } });
}
export function useTreasuryQueue(fundId?: string, page = 0, enabled = false) {
  const { user } = useAuth();
  return useQuery({ queryKey: ['treasury', 'review', user?.id, fundId, page], enabled: Boolean(user) && enabled, retry: false, staleTime: 0, refetchInterval: 30_000,
    queryFn: async ({ signal }) => { const result = await client.rpc('treasury_review_queue', { p_fund_id: fundId || null, p_offset: page * 20, p_limit: 20 }).abortSignal(signal); if (result.error) throw treasuryError(result.error); return { entries: result.data.entries.map(entry => decodeTreasuryEntry(entry, false)), total_count: safeCents(result.data.total_count) }; } });
}
export function useTreasuryBank(enabled: boolean) {
  const { user } = useAuth();
  return useQuery({ queryKey: ['treasury', 'bank', user?.id], enabled: Boolean(user) && enabled, retry: false, staleTime: 0,
    queryFn: async ({ signal }) => { const result = await client.rpc('treasury_bank_reconciliation').abortSignal(signal); if (result.error) throw treasuryError(result.error); return result.data.map(row => ({ ...row, amount_cents: safeCents(row.amount_cents), allocated_cents: safeCents(row.allocated_cents), remaining_cents: safeCents(row.remaining_cents) })); } });
}
export function useTreasuryAdministration(enabled: boolean) {
  const { user } = useAuth();
  return useQuery({ queryKey: ['treasury', 'administration', user?.id], enabled: Boolean(user) && enabled, retry: false,
    queryFn: async () => { const [accounts, managers] = await Promise.all([client.rpc('treasury_admin_accounts'), client.from('treasury_managers').select('*')]); if (accounts.error || managers.error) throw treasuryError(accounts.error || managers.error); return { accounts: accounts.data, managers: managers.data }; } });
}
export function useTreasuryWorkflowMutations() {
  const cache = useQueryClient();
  const refresh = () => cache.invalidateQueries({ queryKey: ['treasury'] });
  const createBank = useMutation({ retry: false, mutationFn: async (input: Pick<BankMovement, 'id' | 'reference' | 'occurred_on' | 'kind' | 'amount_cents'> & { revision?: number }) => {
    const payload = { ...input, reference: input.reference.trim().toUpperCase().replace(/\s+/g, '') };
    if (input.revision) {
      const result = await client.from('treasury_bank_transactions').update({ reference: payload.reference, occurred_on: payload.occurred_on, kind: payload.kind, amount_cents: payload.amount_cents, revision: input.revision + 1 }).eq('id', input.id).eq('revision', input.revision).select().maybeSingle();
      if (result.error) throw treasuryError(result.error);
      if (!result.data) {
        const old = await client.from('treasury_bank_transactions').select().eq('id', input.id).maybeSingle();
        if (old.error) throw treasuryError(old.error);
        if (old.data?.revision === input.revision + 1 && old.data.reference === payload.reference && old.data.kind === payload.kind && old.data.occurred_on === payload.occurred_on && old.data.amount_cents === payload.amount_cents) return old.data;
        throw treasuryError({ code: '40001' });
      }
      return result.data;
    }
    const result = await client.from('treasury_bank_transactions').insert(payload).select().single();
    if (result.error?.code === '23505') {
      const old = await client.from('treasury_bank_transactions').select().eq('reference', payload.reference).maybeSingle();
      if (old.error) throw treasuryError(old.error);
      if (old.data && old.data.amount_cents === payload.amount_cents && old.data.kind === payload.kind && old.data.occurred_on === payload.occurred_on) return old.data;
      throw new Error('Esta referência bancária já existe com outros dados. Confira o extrato do banco.');
    }
    if (result.error) throw treasuryError(result.error); return result.data;
  }, onSuccess: refresh });
  const assign = useMutation({ mutationFn: async (input: Manager & { revoke?: boolean }) => {
    const result = input.revoke ? await client.from('treasury_managers').delete().eq('user_id', input.user_id).eq('fund_id', input.fund_id) : await client.from('treasury_managers').insert({ user_id: input.user_id, fund_id: input.fund_id });
    if (result.error && result.error.code !== '23505') throw treasuryError(result.error);
  }, onSuccess: refresh });
  return { createBank, assign };
}

export async function attachTreasuryReceipt(entryId: string, file: File, attachmentId: string) {
  const extension = { 'application/pdf': 'pdf', 'image/png': 'png', 'image/jpeg': 'jpg' }[file.type];
  if (!extension || !file.size || file.size > 10 * 1024 * 1024) throw new Error('Selecione PDF, PNG ou JPG de até 10 MB.');
  const path = `${entryId}/${attachmentId}.${extension}`;
  const upload = await supabase.storage.from(RECEIPT_BUCKET).upload(path, file, { upsert: false, contentType: file.type });
  if (upload.error) {
    // A lost upload response can be retried only when the stored bytes are identical.
    const old = await supabase.storage.from(RECEIPT_BUCKET).download(path);
    if (old.error || !old.data) throw new Error('Não foi possível anexar o comprovante. Tente novamente.');
    const [a, b] = await Promise.all([file.arrayBuffer(), old.data.arrayBuffer()]);
    const [ha, hb] = await Promise.all([crypto.subtle.digest('SHA-256', a), crypto.subtle.digest('SHA-256', b)]);
    if (new Uint8Array(ha).toString() !== new Uint8Array(hb).toString()) throw new Error('O arquivo desta tentativa foi alterado. Selecione o comprovante novamente.');
  }
  const row = { id: attachmentId, entry_id: entryId, path, filename: file.name.slice(0, 150), mime_type: file.type };
  const result = await client.from('treasury_attachments').insert(row);
  if (result.error && result.error.code !== '23505') throw treasuryError(result.error);
}
export function useTreasuryAttachments(entryId?: string, enabled = false) {
  const { user } = useAuth();
  return useQuery({ queryKey: ['treasury', 'attachments', user?.id, entryId], enabled: Boolean(user && entryId && enabled), retry: false,
    queryFn: async () => { const result = await client.from('treasury_attachments').select('*').eq('entry_id', entryId); if (result.error) throw treasuryError(result.error); return result.data; } });
}
export async function downloadTreasuryReceipt(attachment: TreasuryAttachment): Promise<Uint8Array> {
  const result = await supabase.storage.from(RECEIPT_BUCKET).download(attachment.path);
  if (result.error || !result.data) throw new Error(`Não foi possível incluir o comprovante “${attachment.filename}”. O relatório não foi finalizado.`);
  return new Uint8Array(await result.data.arrayBuffer());
}
export async function fetchTreasuryReport(year: number, fundId?: string): Promise<TreasuryReport> {
  const { data, error } = await client.rpc('treasury_report', { p_year: year, p_fund_id: fundId || null });
  if (error) throw treasuryError(error);
  const raw = data as unknown as TreasuryReport;
  if (!raw || !Array.isArray(raw.entries) || !Array.isArray(raw.attachments) || !Array.isArray(raw.funds)) throw new Error('Relatório incompleto. Tente novamente.');
  return { ...raw, opening_cents: safeCents(raw.opening_cents), reserved_cents: safeCents(raw.reserved_cents), pending_count: safeCents(raw.pending_count), entries: raw.entries.map(entry => decodeTreasuryEntry(entry)) };
}

export async function setTreasuryAttachmentActive(id: string, active: boolean) {
  const result = await client.from('treasury_attachments').update({ active }).eq('id', id).select('id').maybeSingle();
  if (result.error) throw treasuryError(result.error);
  if (!result.data) throw new Error('O comprovante não foi atualizado. Confira seu acesso.');
}
