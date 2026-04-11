import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { AppCard } from '@/components/ui/app-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { toast } from 'sonner';
import { Megaphone, Loader2, Send, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function DiretoriaComunicados() {
  const { user, profile, society } = useAuth();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('normal');

  useEffect(() => {
    fetchAnnouncements();
  }, [profile]);

  const fetchAnnouncements = async () => {
    if (!profile?.society_id) return;
    const { data } = await supabase
      .from('pastor_announcements')
      .select('*')
      .contains('target_societies', [profile.society_id])
      .order('created_at', { ascending: false });
    setAnnouncements(data || []);
    setLoading(false);
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim() || !user || !profile?.society_id) return;
    setSending(true);
    try {
      const { error } = await supabase.from('pastor_announcements').insert({
        title: title.trim(),
        message: message.trim(),
        priority,
        scope: 'societies',
        target_societies: [profile.society_id],
        created_by: user.id,
        created_by_role: 'diretoria',
      });
      if (error) throw error;

      toast.success('Comunicado enviado para os membros!');
      setTitle('');
      setMessage('');
      setPriority('normal');
      setDrawerOpen(false);
      fetchAnnouncements();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao enviar comunicado');
    } finally {
      setSending(false);
    }
  };

  return (
    <AppLayout>
      <PageHeader title="Comunicados" description={`Envie avisos para os membros da ${society?.name || 'sua sociedade'}`} />

      <div className="space-y-4">
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setDrawerOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Novo Comunicado
          </Button>
        </div>

        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerContent className="max-h-[85vh]">
            <DrawerHeader>
              <DrawerTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-primary" />
                Comunicado para {society?.name || 'sua sociedade'}
              </DrawerTitle>
            </DrawerHeader>
            <div className="px-4 space-y-4 overflow-y-auto">
              <Input placeholder="Título" value={title} onChange={e => setTitle(e.target.value)} />
              <Textarea placeholder="Mensagem..." value={message} onChange={e => setMessage(e.target.value)} rows={4} />
              <div className="space-y-2">
                <p className="text-sm font-medium">Prioridade</p>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DrawerFooter>
              <Button onClick={handleSend} disabled={sending || !title.trim() || !message.trim()}>
                {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                Enviar
              </Button>
              <DrawerClose asChild>
                <Button variant="outline">Cancelar</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : announcements.length === 0 ? (
          <EmptyState
            icon={<Megaphone className="h-12 w-12" />}
            title="Nenhum comunicado"
            description="Clique em "Novo Comunicado" para enviar um aviso."
          />
        ) : (
          <div className="space-y-3">
            {announcements.map(a => {
              const isExpanded = expandedId === a.id;
              return (
                <AppCard key={a.id}>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="font-semibold text-sm">{a.title}</p>
                      {a.priority === 'urgente' && <Badge variant="destructive" className="text-xs">Urgente</Badge>}
                      {a.created_by_role === 'pastor' && <Badge variant="outline" className="text-xs">Pastor</Badge>}
                    </div>
                    <p className={`text-sm text-muted-foreground ${!isExpanded ? 'line-clamp-2' : ''}`}>{a.message}</p>
                    {a.message.length > 120 && (
                      <button onClick={() => setExpandedId(isExpanded ? null : a.id)} className="text-xs text-primary mt-1 flex items-center gap-0.5">
                        {isExpanded ? <>Menos <ChevronUp className="h-3 w-3" /></> : <>Ver mais <ChevronDown className="h-3 w-3" /></>}
                      </button>
                    )}
                    <span className="text-xs text-muted-foreground mt-2 block">
                      {formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: ptBR })}
                    </span>
                </AppCard>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
