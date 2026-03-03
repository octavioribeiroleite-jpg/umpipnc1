import { Download } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { toast } from 'sonner';

export function InstallButton() {
  const { canInstall, isIOS, install } = usePWAInstall();

  if (!canInstall) return null;

  const handleClick = async () => {
    if (isIOS) {
      toast.info('Toque no botão de compartilhar e depois em "Adicionar à Tela de Início"', {
        duration: 5000,
      });
      return;
    }
    await install();
  };

  return (
    <button
      onClick={handleClick}
      className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      aria-label="Instalar app"
    >
      <Download className="h-5 w-5" />
      <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
    </button>
  );
}
