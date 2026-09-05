import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { receiptPath, receiptReference } from '@/lib/receipt-path';
import { signedReceiptUrl } from '@/lib/receipts';

export interface FileFilters {
  search?: string;
  type?: 'pdf' | 'image' | 'all';
  category?: string;
  sortBy?: 'newest' | 'oldest' | 'name';
}

export interface FileRecord {
  id: string;
  name: string;
  url: string;
  storageReference?: string;
  type: string | null;
  size: number | null;
  category: string | null;
  created_at: string;
  created_by: string;
  meeting_id: string | null;
  event_id: string | null;
  transaction_id: string | null;
}

export interface UploadFileParams {
  file: File;
  category: string;
  meetingId?: string;
  eventId?: string;
  transactionId?: string;
}

export function useFiles(filters: FileFilters = {}) {
  const { profile, isAdmin, isPastor } = useAuth();
  const societyId = (!isAdmin && !isPastor) ? profile?.society_id : null;

  return useQuery({
    queryKey: ['files', filters, societyId],
    refetchInterval: 240000,
    queryFn: async () => {
      let query = supabase
        .from('files')
        .select('*');

      // Filter by society
      if (societyId) {
        query = query.eq('society_id', societyId);
      }

      // Filter by search term
      if (filters.search) {
        query = query.ilike('name', `%${filters.search}%`);
      }

      // Filter by type
      if (filters.type && filters.type !== 'all') {
        if (filters.type === 'pdf') {
          query = query.ilike('type', '%pdf%');
        } else if (filters.type === 'image') {
          query = query.or('type.ilike.%image%,type.ilike.%png%,type.ilike.%jpg%,type.ilike.%jpeg%,type.ilike.%webp%');
        }
      }

      // Filter by category
      if (filters.category && filters.category !== 'all') {
        query = query.eq('category', filters.category);
      }

      // Sort
      if (filters.sortBy === 'oldest') {
        query = query.order('created_at', { ascending: true });
      } else if (filters.sortBy === 'name') {
        query = query.order('name', { ascending: true });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;

      if (error) throw error;
      return await Promise.all((data as FileRecord[]).map(async file => ({
        ...file, storageReference: file.url, url: await signedReceiptUrl(file.url),
      })));
    },
  });
}

export function useUploadFile() {
  const queryClient = useQueryClient();
  const { user, effectiveSocietyId } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ file, category, meetingId, eventId, transactionId }: UploadFileParams) => {
      if (!user) throw new Error('Usuário não autenticado');
      if (!effectiveSocietyId) throw new Error('Selecione a sociedade antes de enviar.');

      // Generate unique file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${effectiveSocietyId}/${new Date().getFullYear()}/${category}/${crypto.randomUUID()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Insert file record
      const { data, error } = await supabase
        .from('files')
        .insert({
          name: file.name,
          url: receiptReference(fileName),
          type: file.type,
          size: file.size,
          category,
          created_by: user.id,
          meeting_id: meetingId || null,
          event_id: eventId || null,
          transaction_id: transactionId || null,
          society_id: effectiveSocietyId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      toast({
        title: 'Arquivo enviado',
        description: 'O arquivo foi enviado com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao enviar arquivo',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteFile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, url }: { id: string; url: string }) => {
      // Extract path from URL
      const storagePath = receiptPath(url);

      if (storagePath) {
        // Delete from storage
        const { error: storageError } = await supabase.storage
          .from('receipts')
          .remove([storagePath]);

        if (storageError) {
          console.warn('Erro ao deletar do storage:', storageError);
        }
      }

      // Delete from database
      const { error } = await supabase
        .from('files')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      toast({
        title: 'Arquivo excluído',
        description: 'O arquivo foi excluído com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao excluir arquivo',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
