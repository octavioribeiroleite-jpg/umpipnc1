import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PastorLayout } from '@/components/pastor/PastorLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
}

export default function PastorComunicados() {
  const { user } = useAuth();
  const [societies, setSocieties] = useState<Society[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('normal');
  const [selectedSocieties, setSelectedSocieties] = useState<string[]>([]);
  const [allSocieties, setAllSocieties] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from('societies').select('id, name, slug, color').eq('active', true).order('name'),
      supabase.from('pastor_announcements').select('*').order('created_at', { ascending: false }),
    ]).then(([socRes, annRes]) => {
      if (socRes.data) setSocieties(socRes.data);
      if (annRes.data) setAnnouncements(annRes.data as Announcement[]);
      setLoading(false);
    });
  }, []);

  const resetForm = () => {
    setTitle('');
    setMessage('');
    setPriority('normal');
    setSelectedSocieties([]);
    setAllSocieties(true);
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim() || !user) return;
    setSending(true);
    try {
      const { error } = await supabase.from('pastor_announcements').insert({
        title: title.trim(),
        message: message.trim(),
        priority,
        target_societies: allSocieties ? null : selectedSocieties,
        created_by: user.id,
      });
      if (error) throw error;

      toast.success('Comunicado enviado!');
      resetForm();
      setDrawerOpen(false);

      const { data } = await supabase.from('pastor_announcements').select('*').order('created_at', { ascending: false });
      if (data) setAnnouncements(data as Announcement[]);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao enviar comunicado');
    } finally {
      setSending(false);
    }
  };

  const getSocietyNames = (ids: string[] | null) => {
    if (!ids) return 'Todas as sociedades';
    return ids.map(id => societies.find(s => s.id === id)?.name || id).join(', ');
  };

  const toggleSociety = (id: string) => {
    setSelectedSocieties(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const getReadCount = (readBy: Json): number => {
    if (Array.isArray(readBy)) return readBy.length;
    return 0;
  };

  return (
    <PastorLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">Comunicados</h1>
            {announcements.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {announcements.length}
              </Badge>
            )}
          </div>
          <Button size="sm" onClick={() => setDrawerOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Novo
          </Button>
        </div>

        {/* Drawer with form */}
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerContent className="max-h-[85vh]">
            <DrawerHeader>
              <DrawerTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-primary" />
                Novo Comunicado
              </DrawerTitle>
            </DrawerHeader>
            <div className="px-4 space-y-4 overflow-y-auto">
              <Input
                placeholder="Título do comunicado"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
              <Textarea
                placeholder="Mensagem..."
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={4}
              />
              <div className="space-y-3">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Prioridade</p>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="urgente">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Destinatários</p>
                  <div className="flex items-center gap-2 mb-2">
                    <Checkbox
                      checked={allSocieties}
                      onCheckedChange={(v) => { setAllSocieties(!!v); if (v) setSelectedSocieties([]); }}
                    />
                    <span className="text-sm">Todas as sociedades</span>
                  </div>
                  {!allSocieties && (
                    <div className="flex flex-wrap gap-2">
                      {societies.map(s => (
                        <label key={s.id} className="flex items-center gap-1.5 text-sm cursor-pointer">
                          <Checkbox
                            checked={selectedSocieties.includes(s.id)}
                            onCheckedChange={() => toggleSociety(s.id)}
                          />
                          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                          {s.name}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <DrawerFooter>
              <Button onClick={handleSend} disabled={sending || !title.trim() || !message.trim()}>
                {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                Enviar Comunicado
              </Button>
              <DrawerClose asChild>
                <Button variant="outline">Cancelar</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>

        {/* History */}
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : announcements.length === 0 ? (
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
                          <p className="font-semibold text-sm">{a.title}</p>
                          {a.priority === 'urgente' && (
                            <Badge variant="destructive" className="text-xs">Urgente</Badge>
                          )}
                        </div>
                        <p className={`text-sm text-muted-foreground ${!isExpanded ? 'line-clamp-2' : ''}`}>
                          {a.message}
                        </p>
                        {a.message.length > 120 && (
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : a.id)}
                            className="text-xs text-primary mt-1 flex items-center gap-0.5"
                          >
                            {isExpanded ? (
                              <>Menos <ChevronUp className="h-3 w-3" /></>
                            ) : (
                              <>Ver mais <ChevronDown className="h-3 w-3" /></>
                            )}
                          </button>
                        )}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">{getSocietyNames(a.target_societies)}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: ptBR })}
                          </span>
                          {readCount > 0 && (
                            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                              <Eye className="h-3 w-3" />
                              {readCount}
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
