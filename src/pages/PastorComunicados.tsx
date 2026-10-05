import { QueryErrorState } from '@/components/ui/query-error-state';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useSnapshotRead } from '@/hooks/useSnapshotRead';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/layout/PageHeader';
import { PastorLayout } from '@/components/pastor/PastorLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { toast } from 'sonner';
import { Megaphone, Loader2, Send, Plus, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Json } from '@/integrations/supabase/types';

interface Society {
  id: string;
  name: string;
  slug: string;
  color: string;
}

interface Announcement {
  id: string;
  title: string;
  message: string;
  priority: string;
  target_societies: string[] | null;
  created_at: string;
  read_by: Json;
  scope: string;
  created_by_role: string;
}

type RecipientType = 'church' | 'all_societies' | 'specific';

export default function PastorComunicados() {
  const { user } = useAuth();
  const [societies, setSocieties] = useState<Society[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const read = useSnapshotRead(`pastor-announcements:${user?.id ?? ''}`);
  const { run } = read;
  const [sending, setSending] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [sendError, setSendError] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const drawerBodyRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (drawerRef.current) drawerRef.current.scrollTop = 0;
    if (drawerBodyRef.current) drawerBodyRef.current.scrollTop = 0;
  }, [preview, drawerOpen]);

  // Form state
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('normal');
  const [recipientType, setRecipientType] = useState<RecipientType>('church');
  const [selectedSociety, setSelectedSociety] = useState('');

  const loadAnnouncements = useCallback(async () => {
    await run(async () => {
      const [socRes, annRes] = await Promise.all([
      supabase.from('societies').select('id, name, slug, color').eq('active', true).order('name'),
      supabase.from('pastor_announcements').select('*').order('created_at', { ascending: false }),
      ]);
      if (socRes.error || annRes.error) throw socRes.error || annRes.error;
      return () => { setSocieties(socRes.data ?? []); setAnnouncements((annRes.data ?? []) as Announcement[]); };
    });
  }, [run]);
  useEffect(() => { if (user) void loadAnnouncements(); }, [user, loadAnnouncements]);

  const resetForm = () => {
    setTitle('');
    setMessage('');
    setPriority('normal');
    setRecipientType('church');
    setSelectedSociety('');
    setPreview(false);
    setSendError(false);
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim() || !user) return;
    if (recipientType === 'specific' && !selectedSociety) {
      toast.error('Selecione uma sociedade');
      return;
    }

    setSending(true);
    setSendError(false);
    try {
      const scope = recipientType === 'church' ? 'church' : 'societies';
      const target_societies =
        recipientType === 'specific' ? [selectedSociety] :
        null;

      const { error } = await supabase.from('pastor_announcements').insert({
        title: title.trim(),
        message: message.trim(),
        priority,
        scope,
        target_societies,
        created_by: user.id,
        created_by_role: 'pastor',
      });
      if (error) throw error;

      toast.success('Comunicado enviado!');
      resetForm();
      setDrawerOpen(false);

      void loadAnnouncements();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao enviar comunicado');
      setSendError(true);
    } finally {
      setSending(false);
    }
  };

  const getScopeLabel = (a: Announcement) => {
    if (a.scope === 'church') return '🏛️ Toda a igreja';
    if (!a.target_societies) return 'Todas as sociedades';
    return a.target_societies.map(id => societies.find(s => s.id === id)?.name || id).join(', ');
  };

  const getReadCount = (readBy: Json): number => {
    if (Array.isArray(readBy)) return readBy.length;
    return 0;
  };

  return (
    <PastorLayout>
      <div className="mx-auto max-w-[880px] space-y-6">
        <PageHeader title="Comunicados" description={read.error ? 'Consulta indisponível' : !read.hasSnapshot ? 'Consultando comunicados…' : `Avisos e orientações · ${announcements.length} comunicados`} action={
          <Button onClick={() => { setPreview(false); setDrawerOpen(true); }}><Plus className="h-4 w-4 mr-2" />Novo comunicado</Button>
        } />

        {/* Drawer */}
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerContent ref={drawerRef} className="max-h-[90dvh] overflow-hidden">
            <DrawerHeader className="mx-auto w-full max-w-[640px]">
              <DrawerTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-primary" />
                {preview ? 'Revisar comunicado' : 'Novo comunicado'}
              </DrawerTitle>
            </DrawerHeader>
            <div ref={drawerBodyRef} className="mx-auto w-full max-w-[640px] min-h-0 flex-1 px-4 space-y-4 overflow-y-auto">
              {sendError && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">Não foi possível confirmar o envio. O texto foi mantido para tentar novamente.</p>}
              {preview ? <div className="space-y-4 rounded-card border p-4">
                <p className="text-sm text-muted-foreground">Destinatários: {recipientType === 'church' ? 'Toda a igreja' : recipientType === 'all_societies' ? 'Todas as sociedades (diretorias)' : societies.find(society => society.id === selectedSociety)?.name || 'Sociedade selecionada'}</p>
                <h2 className="break-words text-xl font-semibold">{title}</h2>
                <p className="whitespace-pre-wrap break-words text-base leading-6">{message}</p>
                <Badge variant={priority === 'urgente' ? 'destructive' : 'outline'}>{priority === 'urgente' ? 'Urgente' : 'Normal'}</Badge>
              </div> : <>
              <div className="space-y-3">
                <p className="text-sm font-medium">Destinatários</p>
                <RadioGroup aria-label="Destinatários" value={recipientType} onValueChange={(v) => setRecipientType(v as RecipientType)} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="church" id="church" />
                    <Label htmlFor="church" className="text-sm">🏛️ Toda a igreja (todos veem)</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="all_societies" id="all_soc" />
                    <Label htmlFor="all_soc" className="text-sm">📋 Todas as sociedades (só diretorias)</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="specific" id="specific" />
                    <Label htmlFor="specific" className="text-sm">🎯 Sociedade específica</Label>
                  </div>
                </RadioGroup>
                {recipientType === 'specific' && (
                  <Select value={selectedSociety} onValueChange={setSelectedSociety} disabled={!read.hasSnapshot || read.error}>
                    <SelectTrigger aria-label="Sociedade destinatária"><SelectValue placeholder="Selecione a sociedade" /></SelectTrigger>
                    <SelectContent>
                      {societies.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          <div className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                            {s.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <Label htmlFor="pastor-announcement-title">Título</Label>
              <Input id="pastor-announcement-title" placeholder="Título do comunicado" value={title} onChange={e => setTitle(e.target.value)} />
              <Label htmlFor="pastor-announcement-message">Mensagem</Label>
              <Textarea id="pastor-announcement-message" placeholder="Mensagem..." value={message} onChange={e => setMessage(e.target.value)} rows={6} className="min-h-[160px] text-base leading-6" />

              <div className="space-y-2">
                <p className="text-sm font-medium">Prioridade</p>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger aria-label="Prioridade" className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              </>}
            </div>
            <DrawerFooter className="mx-auto w-full max-w-[640px]">
              <Button onClick={preview ? handleSend : () => setPreview(true)} disabled={sending || !title.trim() || !message.trim() || (recipientType === 'specific' && (!selectedSociety || !read.hasSnapshot || read.error))}>
                {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                {preview ? 'Confirmar e enviar comunicado' : 'Revisar comunicado'}
              </Button>
              {preview && <Button variant="outline" onClick={() => setPreview(false)} disabled={sending}>Editar comunicado</Button>}
              <DrawerClose asChild>
                <Button variant="outline">Cancelar</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>

        {/* History */}
        {read.error && <QueryErrorState message="Não foi possível carregar os comunicados." onRetry={() => void loadAnnouncements()} retrying={read.loading} hasPreviousData={read.hasSnapshot} />}
        {!read.hasSnapshot && !read.error ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !read.hasSnapshot ? null : announcements.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center space-y-3">
              <Megaphone className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <div>
                <p className="font-medium text-foreground">Nenhum comunicado ainda</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Envie avisos e orientações para as sociedades. Clique em <strong>"Novo"</strong> para começar.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {announcements.map(a => {
              const isExpanded = expandedId === a.id;
              const readCount = getReadCount(a.read_by);
              return (
                <Card key={a.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="break-words font-semibold text-lg">{a.title}</p>
                          {a.priority === 'urgente' && (
                            <Badge variant="destructive" className="text-xs">Urgente</Badge>
                          )}
                        </div>
                        <p className={`whitespace-pre-wrap break-words text-base leading-6 text-muted-foreground ${!isExpanded ? 'line-clamp-2' : ''}`}>
                          {a.message}
                        </p>
                        {a.message.length > 120 && (
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : a.id)}
                            className="min-h-12 text-sm text-primary mt-1 flex items-center gap-1"
                          >
                            {isExpanded ? <>Menos <ChevronUp className="h-3 w-3" /></> : <>Ver mais <ChevronDown className="h-3 w-3" /></>}
                          </button>
                        )}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">{getScopeLabel(a)}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: ptBR })}
                          </span>
                          {readCount > 0 && (
                            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                              <Eye className="h-3 w-3" />{readCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </PastorLayout>
  );
}
