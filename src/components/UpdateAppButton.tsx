import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { applyUpdateNow } from '@/lib/registerSW';

export function UpdateAppButton() {
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    if (loading) return;
    setLoading(true);
    toast.loading('Limpando cache e buscando atualização...', { id: 'app-update' });
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k).catch(() => false)));
      }
    } catch {
      // ignore
    }
    try {
      await applyUpdateNow();
    } catch {
      window.location.reload();
    }
  };

  return (
    <Button
      onClick={handleUpdate}
      disabled={loading}
      variant="outline"
      className="w-full mb-4 border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary font-semibold h-12 gap-2"
    >
      <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
      {loading ? 'Atualizando...' : 'Atualizar para última versão'}
    </Button>
  );
}