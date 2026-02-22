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
import { AppLayout } from '@/components/layout/AppLayout';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  MessageSquare, Check, Loader2, Send, Users, DollarSign, CheckSquare, Calendar, ClipboardCheck, Trash2, CheckCircle,
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
  const [profileNames, setProfileNames] = useState<Map<string, string>>(new Map());
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Pastor (with or without admin) uses PastorLayout; management-only uses AppLayout
  const usePastorLayout = isPastor;
  const isPastorView = isPastor || isAdmin;

  useEffect(() => {
    if (isPastorView || isManagement) {
      fetchFeedbacks();
      fetchProfiles();
    }
  }, [isPastorView, isManagement]);

  const fetchProfiles = async () => {
    try {
      const { data } = await supabase.from('profiles').select('user_id, full_name');
      if (data) {
        const map = new Map<string, string>();
        data.forEach(p => map.set(p.user_id, p.full_name));
        setProfileNames(map);
      }
    } catch (err) {
      console.error(err);
    }
  };

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

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('pastor_feedback').delete().eq('id', id);
      if (error) throw error;
      setFeedbacks(prev => prev.filter(f => f.id !== id));
      toast.success('Sugestão excluída');
    } catch {
      toast.error('Erro ao excluir');
    } finally {
      setDeletingId(null);
    }
  };

  const Layout = usePastorLayout ? PastorLayout : AppLayout;

  if (authLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (!isPastorView && !isManagement) return <Navigate to="/" replace />;

  const unread = feedbacks.filter(f => !f.read);
  const read = feedbacks.filter(f => f.read);

  const renderCard = (f: Feedback, isUnread: boolean) => {
    const config = sectionConfig[f.section] || sectionConfig.geral;
    const Icon = config.icon;
    const senderName = profileNames.get(f.created_by);

    return (
      <Card key={f.id} className={isUnread ? 'border-primary/20 bg-primary/5' : 'opacity-80'}>
        <CardContent className="p-3">
          <div className="flex items-start gap-2.5">
            <div className={`h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 ${config.color}`}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">{config.label}</Badge>
                {isUnread && <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0">Nova</Badge>}
              </div>
              <p className="text-sm leading-snug">{f.message}</p>
              {f.response && (
                <div className="mt-1.5 p-1.5 bg-muted rounded-md">
                  <p className="text-[10px] font-medium text-muted-foreground mb-0.5">Resposta:</p>
                  <p className="text-xs">{f.response}</p>
                </div>
              )}
              <div className="flex items-center gap-1 mt-1.5 text-[11px] text-muted-foreground">
                {senderName && <span className="font-medium">{senderName}</span>}
                {senderName && <span>·</span>}
                <span>{formatDistanceToNow(new Date(f.created_at), { addSuffix: true, locale: ptBR })}</span>
              </div>
            </div>
            <TooltipProvider delayDuration={300}>
              <div className="flex items-center gap-0.5 flex-shrink-0">
                {isUnread && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleMarkRead(f.id)}>
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Marcar como lido</TooltipContent>
                  </Tooltip>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setRespondingTo(respondingTo === f.id ? null : f.id); setResponseText(f.response || ''); }}>
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Responder</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeletingId(f.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Excluir</TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          </div>
          {respondingTo === f.id && (
            <div className="mt-2 space-y-2 border-t pt-2 ml-9">
              <Textarea placeholder="Escreva uma resposta..." value={responseText} onChange={e => setResponseText(e.target.value)} rows={2} className="text-sm" />
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
  };

  const content = (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Sugestões</h1>
        <p className="text-sm text-muted-foreground">
          {unread.length === 0
            ? <span className="flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> Tudo em dia</span>
            : `${unread.length} ${unread.length === 1 ? 'sugestão não lida' : 'sugestões não lidas'}`}
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
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
            <div className="space-y-2">
              <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wide">
                Não lidas ({unread.length})
              </h3>
              {unread.map(f => renderCard(f, true))}
            </div>
          )}
          {read.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wide">
                Lidas ({read.length})
              </h3>
              {read.map(f => renderCard(f, false))}
            </div>
          )}
        </>
      )}

      <AlertDialog open={!!deletingId} onOpenChange={open => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir sugestão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta sugestão? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId && handleDelete(deletingId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  return <Layout>{content}</Layout>;
}
