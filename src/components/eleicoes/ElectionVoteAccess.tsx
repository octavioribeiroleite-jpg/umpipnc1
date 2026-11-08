import { electionRoomRpc } from '@/lib/election-room-client';
import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Maximize2, Monitor, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface Props {
  electionId: string;
  electionName?: string;
  mode: string;
  devices: { id: string; label: string; token: string }[];
  started: boolean;
}

export function ElectionVoteAccess({ electionId, electionName, mode, devices, started }: Props) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('celular');
  const [expanded, setExpanded] = useState<{ label: string; url: string } | null>(null);
  const [room, setRoom] = useState<{ electionId: string; token?: string; error?: string } | null>(null);
  const [retryVersion, setRetryVersion] = useState(0);
  useEffect(() => {
    if (mode === 'shared') return;
    let active = true;
    void (async () => {
      try {
        const { data, error } = await electionRoomRpc('election_room_ensure', { p_election_id: electionId });
        if (error || !data || typeof data !== 'object' || !('room_token' in data) || typeof data.room_token !== 'string') throw error || new Error('Sala indisponível');
        if (active) setRoom({ electionId, token: data.room_token });
      } catch {
        if (active) setRoom({ electionId, error: 'Não foi possível preparar o link permanente da sala.' });
      }
    })();
    return () => { active = false; };
  }, [electionId, mode, retryVersion]);
  const roomToken = room?.electionId === electionId ? room.token : undefined;
  const individualUrl = roomToken ? `${window.location.origin}/vote/sala/${roomToken}` : null;
  const electionUrl = `${window.location.origin}/vote/${electionId}`;
  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: 'Link de votação copiado' });
    } catch {
      toast({ title: 'Não foi possível copiar o link', description: 'Selecione o endereço exibido para copiar manualmente.', variant: 'destructive' });
    }
  };
  const accessCard = (label: string, url: string, shared: boolean) => <div className="space-y-3 rounded-xl border border-border bg-card p-3" key={url}>
    <div className="space-y-1">
      <p className="break-words text-sm font-semibold">{label}</p>
      <p className="text-xs leading-relaxed text-muted-foreground">{shared ? 'Urna compartilhada: votos sucessivos neste aparelho.' : 'Voto individual: uma cédula por navegador neste escrutínio.'}</p>
    </div>
    <button type="button" onClick={() => setExpanded({ label, url })} aria-label={`Ampliar QR Code: ${label}`} className="mx-auto block rounded-xl border border-border bg-white p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <QRCodeSVG value={url} size={160} className="h-auto max-w-full" />
    </button>
    <div className="grid grid-cols-2 gap-2">
      <Button variant="outline" className="gap-1 px-2 text-xs" onClick={() => setExpanded({ label, url })}><Maximize2 className="h-4 w-4" />Ampliar</Button>
      <Button variant="outline" className="gap-1 px-2 text-xs" onClick={() => void copy(url)}><Copy className="h-4 w-4" />Copiar link</Button>
    </div>
    <code className="block select-all break-all rounded-lg bg-muted/50 p-2 text-xs leading-relaxed text-muted-foreground">{url}</code>
  </div>;
  const individual = individualUrl ? <div className="space-y-2">{accessCard('Voto individual · sala permanente', individualUrl, false)}<p className="text-xs leading-relaxed text-muted-foreground">Escaneie uma vez e aguarde os próximos escrutínios e cargos nesta sala.</p></div> : <div role="status" className="space-y-3 rounded-xl border border-border bg-card p-4 text-sm"><p>{room?.electionId === electionId && room.error ? room.error : 'Preparando o QR Code permanente…'}</p>{room?.error && <Button variant="outline" onClick={() => setRetryVersion(version => version + 1)}>Tentar novamente</Button>}</div>;
  const urns = devices.length > 0 ? <div className="space-y-3">{devices.map(device => accessCard(device.label, `${electionUrl}?mode=urna&token=${device.token}`, true))}</div>
    : <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">Cadastre uma urna para gerar seu QR Code exclusivo.</p>;

  return <section aria-label="QR Code e acesso à votação" className="space-y-3 rounded-2xl border border-primary/20 bg-primary/5 p-3 sm:p-4">
    <div className="space-y-1"><h3 className="text-base font-semibold">Entrar na votação</h3><p className="text-xs leading-relaxed text-muted-foreground">{started ? 'Escaneie o QR Code ou compartilhe o link correto.' : 'Links prontos para compartilhar. O voto fica disponível após iniciar a votação.'}</p></div>
    {mode === 'both' ? <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="grid h-auto w-full grid-cols-2"><TabsTrigger value="celular" className="min-h-12 gap-1 px-2 text-xs"><Smartphone className="h-4 w-4" />Individual</TabsTrigger><TabsTrigger value="urna" className="min-h-12 gap-1 px-2 text-xs"><Monitor className="h-4 w-4" />Urnas</TabsTrigger></TabsList>
      <TabsContent value="celular" className="mt-3">{individual}</TabsContent><TabsContent value="urna" className="mt-3">{urns}</TabsContent>
    </Tabs> : mode === 'shared' ? urns : individual}
    <Dialog open={!!expanded} onOpenChange={open => { if (!open) setExpanded(null); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>{expanded?.label}</DialogTitle><DialogDescription>{electionName || 'Acesso à votação'}</DialogDescription></DialogHeader>
        {expanded && <div className="flex min-w-0 flex-col items-center gap-4"><div className="w-full max-w-[320px] rounded-xl border border-border bg-white p-3"><QRCodeSVG value={expanded.url} size={296} className="h-auto w-full" /></div><code className="w-full select-all break-all rounded-lg bg-muted p-3 text-center text-xs">{expanded.url}</code><Button className="w-full" onClick={() => void copy(expanded.url)}><Copy className="h-4 w-4" />Copiar link</Button></div>}
      </DialogContent>
    </Dialog>
  </section>;
}
