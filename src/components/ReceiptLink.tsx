import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { openReceipt } from '@/lib/receipts';

export function ReceiptLink({ reference, children, className }: {
  reference: string; children: ReactNode; className?: string;
}) {
  const [loading, setLoading] = useState(false);
  return <button type="button" title="Ver comprovante" aria-label="Ver comprovante"
    className={className} disabled={loading} aria-busy={loading}
    onClick={async () => {
      setLoading(true);
      try { await openReceipt(reference); }
      catch { toast.error('Não foi possível abrir o comprovante. Confira seu acesso e tente novamente.'); }
      finally { setLoading(false); }
    }}>{children}</button>;
}
