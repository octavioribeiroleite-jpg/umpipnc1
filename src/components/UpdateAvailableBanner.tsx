import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, RefreshCw, X } from 'lucide-react';
import { toast } from 'sonner';
import { applyUpdateNow } from '@/lib/registerSW';

const DISMISSED_KEY = 'renovo-update-dismissed';

export function UpdateAvailableBanner() {
  const [show, setShow] = useState(false);
  const dismissed = useRef(false);
  const version = useRef('');

  const dismiss = () => {
    dismissed.current = true;
    setShow(false);
    try { sessionStorage.setItem(DISMISSED_KEY, version.current); } catch { /* Storage may be unavailable. */ }
  };

  useEffect(() => {
    const handler = (event: Event) => {
      const next = (event as CustomEvent<{ version?: string }>).detail?.version || 'pending';
      if (version.current !== next) dismissed.current = false;
      version.current = next;
      try { if (sessionStorage.getItem(DISMISSED_KEY) === next) return; } catch { /* Use in-memory dismissal. */ }
      if (!dismissed.current) setShow(true);
    };
    const updating = () => { dismissed.current = true; setShow(false); };
    window.addEventListener('sw-update-available', handler);
    window.addEventListener('app-update-start', updating);
    return () => {
      window.removeEventListener('sw-update-available', handler);
      window.removeEventListener('app-update-start', updating);
    };
  }, []);

  const update = async () => {
    dismiss();
    toast.loading('Buscando a atualização…', { id: 'app-update' });
    try {
      await applyUpdateNow();
      toast.dismiss('app-update');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível atualizar. Tente novamente.', {
        id: 'app-update', duration: 8000,
        action: { label: 'Tentar novamente', onClick: () => void update() },
      });
    }
  };

  if (!show) return null;

  return (
    <aside aria-label="Atualização do aplicativo" className="relative z-40 border-b border-emerald-200 bg-emerald-50 text-emerald-950">
      <div className="mx-auto flex max-w-5xl items-start gap-3 px-4 py-3 sm:items-center sm:px-6">
        <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 sm:mt-0" aria-hidden="true"><RefreshCw className="h-4 w-4 text-emerald-800" /></span>
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div role="status">
            <p className="text-sm font-semibold leading-6">Uma nova versão do Renovo está pronta</p>
            <p className="text-sm leading-5 text-emerald-900/80">Atualize quando for um bom momento.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => void update()} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800">Atualizar agora<ArrowUpRight aria-hidden="true" className="h-4 w-4" /></button>
            <button type="button" onClick={dismiss} className="min-h-11 rounded-xl px-3 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-800">Depois</button>
          </div>
        </div>
        <button type="button" onClick={dismiss} aria-label="Fechar aviso de atualização" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-emerald-800 hover:bg-emerald-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-800"><X className="h-5 w-5" /></button>
      </div>
    </aside>
  );
}
