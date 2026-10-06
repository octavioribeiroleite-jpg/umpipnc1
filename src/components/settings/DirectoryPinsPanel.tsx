import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Church, Copy, KeyRound, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QueryErrorState } from '@/components/ui/query-error-state';
import { supabase } from '@/integrations/supabase/client';
import {
  copySavedDirectoryPin,
  DirectoryPinAdminError,
  directoryPinStatus,
  isValidDirectoryPin,
  loadDirectoryPins,
  saveDirectoryPins,
  type DirectoryPinSociety,
  type DirectoryPinStore,
  type DirectoryPinValues,
} from '@/lib/diretoria-pin-admin';

const store: DirectoryPinStore = {
  loadSocieties: () => supabase.from('societies').select('id, name, slug, color').eq('active', true).order('name'),
  loadPins: keys => supabase.from('settings').select('key, value').in('key', keys),
  savePins: rows => supabase.from('settings').upsert(rows, { onConflict: 'key' }).select('key, value'),
};

const messageFor = (error: unknown, fallback: string) => error instanceof DirectoryPinAdminError ? error.message : fallback;

export function DirectoryPinsPanel({ isAdmin }: { isAdmin: boolean }) {
  const [societies, setSocieties] = useState<DirectoryPinSociety[]>([]);
  const [savedPins, setSavedPins] = useState<DirectoryPinValues>({});
  const [drafts, setDrafts] = useState<DirectoryPinValues>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const permission = useRef(isAdmin);
  const request = useRef(0);
  const active = useRef(false);
  const savePending = useRef(false);
  const copyPending = useRef(false);
  permission.current = isAdmin;

  const load = useCallback(async () => {
    if (!permission.current || savePending.current) return;
    const version = ++request.current;
    setLoading(true);
    setLoadError(false);
    setActionError('');
    setSaveMessage('');
    setCopied(null);
    try {
      const result = await loadDirectoryPins({ store, isAdmin: () => permission.current && active.current && version === request.current });
      if (!active.current || !permission.current || version !== request.current) return;
      setSocieties(result.societies);
      setSavedPins(result.savedPins);
      setDrafts({ ...result.savedPins });
    } catch {
      if (active.current && permission.current && version === request.current) setLoadError(true);
    } finally {
      if (active.current && permission.current && version === request.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    active.current = true;
    if (isAdmin) void load();
    else {
      setSocieties([]);
      setSavedPins({});
      setDrafts({});
    }
    return () => {
      active.current = false;
      request.current += 1;
    };
  }, [isAdmin, load]);

  if (!isAdmin) return null;

  const entries = [{ id: 'pastor', name: 'Pastor', slug: 'pastor', color: '#1e3a5f' }, ...societies];
  const hasChanges = entries.some(({ slug }) => (drafts[slug] ?? '') !== (savedPins[slug] ?? ''));

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!permission.current || !active.current || loading || loadError || savePending.current || copyPending.current) return;
    const invalid = entries.find(({ slug }) => {
      const value = drafts[slug] ?? '';
      return value !== (savedPins[slug] ?? '') && !isValidDirectoryPin(value);
    });
    setActionError('');
    setSaveMessage('');
    if (invalid) {
      const message = `O PIN de ${invalid.name} deve ter exatamente 6 números. Um PIN salvo não pode ficar vazio.`;
      setActionError(message);
      document.getElementById(`dir-pin-${invalid.slug}`)?.focus();
      return;
    }
    savePending.current = true;
    setSaving(true);
    try {
      const result = await saveDirectoryPins({
        store,
        isAdmin: () => permission.current && active.current,
        drafts,
        savedPins,
        slugs: entries.map(entry => entry.slug),
      });
      if (!permission.current || !active.current) return;
      setSavedPins(result.savedPins);
      if (result.changed) {
        setSaveMessage('PINs da Diretoria salvos. Agora você pode copiá-los.');
        toast.success('PINs da Diretoria salvos.');
      }
    } catch (error) {
      if (!permission.current || !active.current) return;
      const message = messageFor(error, 'Não foi possível salvar os PINs. Tente novamente.');
      setActionError(message);
      toast.error(message);
    } finally {
      savePending.current = false;
      if (active.current) setSaving(false);
    }
  };

  const copy = async (slug: string, name: string) => {
    if (!permission.current || !active.current || loading || loadError || savePending.current || copyPending.current) return;
    copyPending.current = true;
    setCopying(slug);
    setActionError('');
    setCopied(null);
    try {
      await copySavedDirectoryPin({
        isAdmin: () => permission.current && active.current,
        draft: drafts[slug] ?? '',
        saved: savedPins[slug] ?? '',
        clipboard: navigator.clipboard,
      });
      if (!permission.current || !active.current) return;
      setCopied(slug);
      toast.success(`PIN de ${name} copiado.`);
    } catch (error) {
      if (!permission.current || !active.current) return;
      const message = messageFor(error, 'Não foi possível copiar o PIN. Tente novamente.');
      setActionError(message);
      toast.error(message);
    } finally {
      copyPending.current = false;
      if (active.current) setCopying(null);
    }
  };

  return (
    <Card id="settings-diretoria" className="scroll-mt-[calc(var(--mobile-header-height)_+_1rem)] min-[700px]:scroll-mt-4">
      <CardHeader>
        <CardTitle className="text-lg flex flex-wrap items-center gap-2">
          <KeyRound aria-hidden="true" className="h-5 w-5" />
          PINs da Diretoria
        </CardTitle>
        <CardDescription>Defina um PIN de 6 números por sociedade e para o Pastor. Os PINs ficam visíveis para administradores.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div role="status" className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
            Consultando PINs…
          </div>
        ) : loadError ? (
          <QueryErrorState message="Não foi possível consultar as sociedades e seus PINs." onRetry={() => void load()} />
        ) : (
          <form onSubmit={save} noValidate className="space-y-5">
            <div className="space-y-4">
              {entries.map(entry => {
                const value = drafts[entry.slug] ?? '';
                const status = directoryPinStatus(value, savedPins[entry.slug] ?? '');
                const saved = status === 'saved';
                const help = saved ? 'PIN salvo e disponível para copiar.'
                  : status === 'unset' ? 'Nenhum PIN definido. Preencha e salve para usar.'
                    : status === 'invalid' ? 'Use exatamente 6 números e salve para copiar.'
                      : 'Alteração não salva. Salve para copiar este PIN.';
                return (
                  <div key={entry.slug} className="grid min-w-0 gap-3 border-b border-border pb-4 last:border-0 last:pb-0 md:grid-cols-[minmax(0,1fr)_280px] md:items-center">
                    <div className="flex min-w-0 items-center gap-3">
                      <div aria-hidden="true" className="flex h-10 w-12 shrink-0 items-center justify-center rounded-lg border-l-4 bg-muted text-xs font-bold text-foreground" style={{ borderLeftColor: entry.color }}>
                        {entry.slug === 'pastor' ? <Church className="h-5 w-5" /> : entry.slug.toUpperCase().slice(0, 3)}
                      </div>
                      <div className="min-w-0 space-y-1">
                        <Label htmlFor={`dir-pin-${entry.slug}`} className="break-words">{entry.name}</Label>
                        <p id={`dir-pin-help-${entry.slug}`} className="text-sm text-muted-foreground break-words">{help}</p>
                      </div>
                    </div>
                    <div className="min-w-0 space-y-2">
                      <div className="flex min-w-0 gap-2">
                        <Input
                          id={`dir-pin-${entry.slug}`}
                          value={value}
                          onChange={event => {
                            const next = event.target.value.replace(/\D/g, '').slice(0, 6);
                            setDrafts(previous => ({ ...previous, [entry.slug]: next }));
                            setActionError('');
                            setSaveMessage('');
                            setCopied(null);
                          }}
                          type="text"
                          autoComplete="off"
                          autoCorrect="off"
                          spellCheck={false}
                          inputMode="numeric"
                          maxLength={6}
                          placeholder="6 números"
                          disabled={saving}
                          aria-describedby={`dir-pin-help-${entry.slug} dir-pin-status-${entry.slug}`}
                          aria-invalid={status === 'invalid'}
                          className="min-w-0 flex-1 text-center font-mono tracking-widest"
                        />
                        <Button type="button" variant="outline" onClick={() => void copy(entry.slug, entry.name)} disabled={!saved || saving || copying !== null} aria-label={`Copiar PIN de ${entry.name}`}>
                          {copying === entry.slug ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : copied === entry.slug ? <Check aria-hidden="true" className="h-4 w-4" /> : <Copy aria-hidden="true" className="h-4 w-4" />}
                          {copied === entry.slug ? 'Copiado' : 'Copiar'}
                        </Button>
                      </div>
                      <Badge id={`dir-pin-status-${entry.slug}`} variant={saved ? 'secondary' : 'outline'}>
                        {saved ? 'Salvo' : status === 'unset' ? 'Não definido' : 'Não salvo'}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
            {actionError && <p role="alert" className="text-sm text-destructive break-words">{actionError}</p>}
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <Button type="submit" disabled={!hasChanges || saving || copying !== null}>
                {saving ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Save aria-hidden="true" className="h-4 w-4" />}
                {saving ? 'Salvando PINs…' : 'Salvar PINs'}
              </Button>
              <p role="status" aria-live="polite" className="text-sm text-muted-foreground break-words">
                {saveMessage || (hasChanges ? 'Há PINs não salvos.' : 'A cópia fica disponível após salvar cada PIN.')}
              </p>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
