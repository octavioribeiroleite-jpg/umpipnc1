import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';
import { PastorLayout } from '@/components/pastor/PastorLayout';
import {
  MessageSquare, Check, Loader2, Send, Users, DollarSign, CheckSquare, Calendar, ClipboardCheck,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Feedback {
  id: string;
  section: string;
  message: string;
  response: string | null;
  read: boolean;
  created_by: string;
  created_at: string;
  read_at: string | null;
  read_by: string | null;
}

const sectionConfig: Record<string, { label: string; icon: any; color: string }> = {
  reunioes: { label: 'Reuniões', icon: Users, color: 'bg-blue-500/10 text-blue-600' },
  financas: { label: 'Finanças', icon: DollarSign, color: 'bg-emerald-500/10 text-emerald-600' },
  tarefas: { label: 'Tarefas', icon: CheckSquare, color: 'bg-amber-500/10 text-amber-600' },
  calendario: { label: 'Eventos', icon: Calendar, color: 'bg-purple-500/10 text-purple-600' },
  plenarias: { label: 'Plenárias', icon: ClipboardCheck, color: 'bg-rose-500/10 text-rose-600' },
  geral: { label: 'Geral', icon: MessageSquare, color: 'bg-gray-500/10 text-gray-600' },
};

export default function PastorSugestoes() {
  const { isManagement, isPastor, isAdmin, user, loading: authLoading } = useAuth();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');
  const [saving, setSaving] = useState(false);

  // Determine if this is a pastor viewing (uses PastorLayout) or management viewing (uses AppLayout-like)
  const isPastorView = isPastor || isAdmin;

  useEffect(() => {
    if (isPastorView || isManagement) fetchFeedbacks();
  }, [isPastorView, isManagement]);

  const fetchFeedbacks = async () => {
    try {
      const { data, error } = await supabase
        .from('pastor_feedback')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setFeedbacks((data as Feedback[]) || []);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar sugestões');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('pastor_feedback')
        .update({ read: true, read_at: new Date().toISOString(), read_by: user?.id })
        .eq('id', id);
      if (error) throw error;
      setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, read: true } : f));
      toast.success('Marcado como lido');
    } catch {
      toast.error('Erro ao marcar como lido');
    }
  };

  const handleRespond = async (id: string) => {
    if (!responseText.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('pastor_feedback')
        .update({ response: responseText.trim(), read: true, read_at: new Date().toISOString(), read_by: user?.id })
        .eq('id', id);
      if (error) throw error;
      setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, response: responseText.trim(), read: true } : f));
      setRespondingTo(null);
      setResponseText('');
      toast.success('Resposta enviada!');
    } catch {
      toast.error('Erro ao responder');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <PastorLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PastorLayout>
    );
  }

  if (!isPastorView && !isManagement) return <Navigate to="/" replace />;

  const unread = feedbacks.filter(f => !f.read);
  const read = feedbacks.filter(f => f.read);

  const content = (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Sugestões</h1>
        <p className="text-sm text-muted-foreground">
          {unread.length} {unread.length === 1 ? 'sugestão não lida' : 'sugestões não lidas'}
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : feedbacks.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Nenhuma sugestão ainda.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {unread.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Não lidas ({unread.length})
              </h3>
              {unread.map(f => {
                const config = sectionConfig[f.section] || sectionConfig.geral;
                const Icon = config.icon;
                return (
                  <Card key={f.id} className="border-primary/20 bg-primary/5">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${config.color}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">{config.label}</Badge>
                              <Badge className="bg-primary text-primary-foreground text-xs">Nova</Badge>
                            </div>
                            <p className="text-sm">{f.message}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {formatDistanceToNow(new Date(f.created_at), { addSuffix: true, locale: ptBR })}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Button size="sm" variant="outline" onClick={() => handleMarkRead(f.id)}>
                            <Check className="h-3 w-3 mr-1" /> Lido
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => { setRespondingTo(respondingTo === f.id ? null : f.id); setResponseText(''); }}>
                            <Send className="h-3 w-3 mr-1" /> Responder
                          </Button>
                        </div>
                      </div>
                      {respondingTo === f.id && (
                        <div className="mt-3 space-y-2 border-t pt-3">
                          <Textarea placeholder="Escreva uma resposta..." value={responseText} onChange={e => setResponseText(e.target.value)} rows={2} />
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => setRespondingTo(null)}>Cancelar</Button>
                            <Button size="sm" onClick={() => handleRespond(f.id)} disabled={saving}>
                              {saving && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                              Enviar
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
          {read.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Lidas ({read.length})</h3>
              {read.map(f => {
                const config = sectionConfig[f.section] || sectionConfig.geral;
                const Icon = config.icon;
                return (
                  <Card key={f.id} className="opacity-80">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${config.color}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">{config.label}</Badge>
                          </div>
                          <p className="text-sm">{f.message}</p>
                          {f.response && (
                            <div className="mt-2 p-2 bg-muted rounded-md">
                              <p className="text-xs font-medium text-muted-foreground mb-1">Resposta:</p>
                              <p className="text-sm">{f.response}</p>
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            {formatDistanceToNow(new Date(f.created_at), { addSuffix: true, locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );

  return <PastorLayout>{content}</PastorLayout>;
}
