import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { applyUpdateNow } from '@/lib/registerSW';
import { UpdateAvailableBanner } from '@/components/UpdateAvailableBanner';

interface Props {
  variant?: 'full' | 'icon';
  className?: string;
}

export function UpdateAppButton({ variant = 'full', className }: Props) {
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    if (loading) return;
    setLoading(true);
    toast.loading('Buscando a atualização…', { id: 'app-update' });
    try {
      await applyUpdateNow();
      toast.dismiss('app-update');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível atualizar. Tente novamente.', { id: 'app-update' });
    } finally {
      setLoading(false);
    }
  };

  if (variant === 'icon') return <UpdateAvailableBanner className={className} />;

  return (
    <Button
      onClick={handleUpdate}
      disabled={loading}
      variant="outline"
      className={`w-full border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary font-semibold h-12 gap-2 ${className ?? ''}`}
    >
      <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
      {loading ? 'Atualizando...' : 'Atualizar para última versão'}
    </Button>
  );
}
