import { Download } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { cn } from '@/lib/utils';

export function InstallButton({ variant = 'icon' }: { variant?: 'icon' | 'entry' }) {
  const { isInstalled, open } = usePWAInstall();
  if (isInstalled) return null;
  return (
    <button type="button" onClick={event => open(event.currentTarget)}
      aria-label="Instalar aplicativo" aria-haspopup="dialog" title="Instalar aplicativo"
      className={cn('inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
        variant === 'entry'
          ? 'border border-emerald-200/30 bg-emerald-950/80 px-5 py-3 text-base font-medium text-white shadow-lg backdrop-blur-md hover:bg-emerald-900 focus-visible:outline-white'
          : 'p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-primary')}
    >
      <Download className="h-5 w-5 shrink-0" />
      {variant === 'entry' && <span>Instalar aplicativo</span>}
    </button>
  );
}
