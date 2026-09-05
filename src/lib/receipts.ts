import { supabase } from '@/integrations/supabase/client';
import { receiptPath } from './receipt-path';

export async function signedReceiptUrl(reference: string): Promise<string> {
  const { data, error } = await supabase.storage.from('receipts')
    .createSignedUrl(receiptPath(reference), 300);
  if (error) throw error;
  if (!data?.signedUrl) throw new Error('Não foi possível abrir o comprovante');
  return data.signedUrl;
}

export async function openReceipt(reference: string): Promise<void> {
  // Reserve the window in the user's click event to avoid popup blocking.
  const preview = window.open('about:blank', '_blank');
  if (!preview) throw new Error('Permita abrir uma nova janela para ver o comprovante');
  preview.opener = null;
  try {
    const url = await signedReceiptUrl(reference);
    preview.location.replace(url);
  } catch (error) {
    preview.close();
    throw error;
  }
}
