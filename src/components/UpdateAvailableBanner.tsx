import { useEffect, useState, useSyncExternalStore } from 'react';
import { Bell, RefreshCw, X } from 'lucide-react';
import { toast } from 'sonner';
import { applyUpdateNow } from '@/lib/registerSW';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

let pendingVersion = '';
let readVersion = '';
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(listener => listener());
const available = (event: Event) => {
  pendingVersion = (event as CustomEvent<{ version?: string }>).detail?.version || 'pending';
  notify();
};
window.addEventListener('sw-update-available', available);
if (import.meta.hot) import.meta.hot.dispose(() => window.removeEventListener('sw-update-available', available));
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const snapshot = () => `${pendingVersion}|${readVersion}`;

export function UpdateAvailableBanner({ className = '' }: { className?: string }) {
  useSyncExternalStore(subscribe, snapshot, snapshot);
  const [open, setOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const hasUpdate = Boolean(pendingVersion);
  const unread = hasUpdate && pendingVersion !== readVersion;
  const changeOpen = (next: boolean) => {
    setOpen(next);
    if (next) { readVersion = pendingVersion; notify(); }
  };
  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener('app-update-start', close);
    return () => window.removeEventListener('app-update-start', close);
  }, []);

  const update = async () => {
    if (updating) return;
    setUpdating(true);
    setOpen(false);
    toast.loading('Buscando a atualização…', { id: 'app-update' });
    try {
      await applyUpdateNow();
      pendingVersion = ''; notify();
      toast.dismiss('app-update');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível atualizar. Tente novamente.', { id: 'app-update', duration: 6000 });
    } finally { setUpdating(false); }
  };

  return (
    <Popover open={open} onOpenChange={changeOpen}>
      <PopoverTrigger asChild>
        <button type="button" aria-label={unread ? 'Notificações: nova atualização' : 'Notificações'} title="Notificações" className={`relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-current transition-colors hover:bg-emerald-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 ${className}`}>
          <Bell aria-hidden="true" className="h-[19px] w-[19px]" strokeWidth={1.7} />
          {unread && <span aria-hidden="true" className="absolute right-2.5 top-2 h-1.5 w-1.5 rounded-full bg-emerald-400" />}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={10} collisionPadding={12} aria-label="Notificações" className="z-[60] w-80 border-slate-200 bg-white p-0 text-slate-900 shadow-xl" style={{ maxWidth: 'calc(100vw - 24px)', maxHeight: 'var(--radix-popover-content-available-height)', overflowY: 'auto', borderRadius: '16px' }}>
        <div className="flex items-center justify-between border-b border-slate-100 py-2 pl-5 pr-2">
          <h2 className="text-sm font-semibold">Notificações</h2>
          <button type="button" aria-label="Fechar notificações" onClick={() => setOpen(false)} className="flex h-11 w-11 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5">
          <p className="text-base font-semibold">{hasUpdate ? 'Nova versão disponível' : 'Nenhuma atualização pendente'}</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">{hasUpdate ? 'Uma atualização do Renovo está pronta para você.' : 'Você pode verificar se há uma versão mais recente.'}</p>
          <button type="button" disabled={updating} onClick={() => void update()} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-800 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-900 disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${updating ? 'animate-spin' : ''}`} />{updating ? 'Atualizando…' : hasUpdate ? 'Atualizar agora' : 'Verificar atualização'}</button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
