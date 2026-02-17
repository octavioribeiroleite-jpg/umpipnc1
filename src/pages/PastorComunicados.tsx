import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PastorLayout } from '@/components/pastor/PastorLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Megaphone, Loader2, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
}

export default function PastorComunicados() {
  const { user } = useAuth();
  const [societies, setSocieties] = useState<Society[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

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
      setTitle('');
      setMessage('');
      setPriority('normal');
      setSelectedSocieties([]);
      setAllSocieties(true);

      // Refresh list
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

  return (
    <PastorLayout>
      <div className="space-y-6">
        <h1 className="text-xl font-bold">Comunicados</h1>

        {/* New announcement form */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              Novo Comunicado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
            <div className="flex flex-wrap gap-4 items-start">
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
              <div className="space-y-2 flex-1">
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
            <div className="flex justify-end">
              <Button onClick={handleSend} disabled={sending || !title.trim() || !message.trim()}>
                {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                Enviar Comunicado
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* History */}
        <div>
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
            Histórico ({announcements.length})
          </h3>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : announcements.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Megaphone className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Nenhum comunicado enviado.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {announcements.map(a => (
                <Card key={a.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-sm">{a.title}</p>
                          {a.priority === 'urgente' && (
                            <Badge variant="destructive" className="text-xs">Urgente</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{a.message}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">{getSocietyNames(a.target_societies)}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: ptBR })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </PastorLayout>
  );
}
