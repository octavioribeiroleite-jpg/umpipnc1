import { QueryErrorState } from '@/components/ui/query-error-state';
import { useCallback, useEffect, useState } from 'react';
import { useSnapshotRead } from '@/hooks/useSnapshotRead';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
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
import type { LucideIcon } from 'lucide-react';

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

const sectionConfig: Record<string, { label: string; icon: LucideIcon; color: string }> = {
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
  const feedbackRead = useSnapshotRead(`pastor-feedback:${user?.id ?? ''}:${isPastor}:${isAdmin}:${isManagement}`);
  const namesRead = useSnapshotRead(`pastor-feedback-names:${user?.id ?? ''}`);
  const { run: runFeedback } = feedbackRead;
  const { run: runNames } = namesRead;
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [responseDrafts, setResponseDrafts] = useState<Record<string, string>>({});
  const responseText = respondingTo ? responseDrafts[respondingTo] ?? feedbacks.find(feedback => feedback.id === respondingTo)?.response ?? '' : '';
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [profileNames, setProfileNames] = useState<Map<string, string>>(new Map());
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Pastor (with or without admin) uses PastorLayout; management-only uses AppLayout
  const usePastorLayout = isPastor;
  const isPastorView = isPastor || isAdmin;

  const fetchProfiles = useCallback(async () => {
    await runNames(async () => {
      const { data, error } = await supabase.from('profiles').select('user_id, full_name');
      if (error) throw error;
        const map = new Map<string, string>();
        (data ?? []).forEach(p => map.set(p.user_id, p.full_name));
        return () => setProfileNames(map);
    });
  }, [runNames]);

  const fetchFeedbacks = useCallback(async () => {
    await runFeedback(async () => {
      const { data, error } = await supabase
        .from('pastor_feedback')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return () => setFeedbacks((data as Feedback[]) || []);
    });
  }, [runFeedback]);
  useEffect(() => {
    if (user && (isPastorView || isManagement)) { void fetchFeedbacks(); void fetchProfiles(); }
  }, [user, isPastorView, isManagement, fetchFeedbacks, fetchProfiles]);

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
      setRespondingTo(current => current === id ? null : current);
      setResponseDrafts(previous => { const next = { ...previous }; delete next[id]; return next; });
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
  const selectedFeedback = feedbacks.find(feedback => feedback.id === selectedId) ?? [...unread, ...read][0];

  const renderCard = (f: Feedback, isUnread: boolean) => {
    const config = sectionConfig[f.section] || sectionConfig.geral;
    const Icon = config.icon;
    const senderName = profileNames.get(f.created_by);

    return (
      <Card key={f.id} className={isUnread ? 'border-primary/20 bg-primary/5' : ''}>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-start gap-3">
            <div className={`h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 ${config.color}`}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1 basis-[70%] sm:basis-0">
              <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                <Badge variant="outline" className="text-xs px-1.5 py-0">{config.label}</Badge>
                {isUnread && <Badge className="bg-primary text-primary-foreground text-xs px-1.5 py-0">Nova</Badge>}
              </div>
              <div className="flex flex-wrap items-center gap-1 mt-2 text-sm text-muted-foreground">
                <span className="font-medium">{namesRead.hasSnapshot ? senderName || 'Remetente não identificado' : namesRead.error ? 'Remetente indisponível' : 'Consultando remetente…'}</span>
                {senderName && <span>·</span>}
                <span>{formatDistanceToNow(new Date(f.created_at), { addSuffix: true, locale: ptBR })}</span>
              </div>
            </div>
            <TooltipProvider delayDuration={300}>
              <div className="ml-auto flex items-center gap-1 flex-shrink-0">
                {isUnread && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-12 w-12" aria-label="Marcar como lida" onClick={() => handleMarkRead(f.id)}>
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Marcar como lido</TooltipContent>
                  </Tooltip>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-12 w-12" aria-label="Responder sugestão" onClick={() => setRespondingTo(respondingTo === f.id ? null : f.id)}>
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Responder</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-12 w-12 text-destructive hover:text-destructive" aria-label="Excluir sugestão" onClick={() => setDeletingId(f.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Excluir</TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          </div>
          <div className="mt-4 space-y-3">
              <p className="whitespace-pre-wrap break-words text-base leading-6">{f.message}</p>
              {f.response && (
                <div className="mt-3 p-3 bg-muted rounded-lg">
                  <p className="text-xs font-medium text-muted-foreground mb-0.5">Resposta:</p>
                  <p className="whitespace-pre-wrap break-words text-base leading-6">{f.response}</p>
                </div>
              )}
          </div>
          {respondingTo === f.id && (
            <div className="mt-2 space-y-2 border-t pt-2 sm:ml-10">
              <Label htmlFor={`feedback-response-${f.id}`}>Resposta à sugestão</Label>
              <Textarea id={`feedback-response-${f.id}`} placeholder="Escreva uma resposta..." value={responseText} onChange={e => setResponseDrafts(previous => ({ ...previous, [f.id]: e.target.value }))} rows={6} className="min-h-[160px] text-base leading-6" />
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setRespondingTo(null)}>Cancelar</Button>
                <Button onClick={() => handleRespond(f.id)} disabled={saving || !responseText.trim()}>
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
      <PageHeader title="Sugestões" description={feedbackRead.error ? 'Consulta indisponível' : !feedbackRead.hasSnapshot ? 'Consultando sugestões…' : unread.length === 0 ? 'Tudo em dia' : `${unread.length} ${unread.length === 1 ? 'sugestão não lida' : 'sugestões não lidas'}`} />

      {feedbackRead.error && <QueryErrorState message="Não foi possível carregar as sugestões." onRetry={() => void fetchFeedbacks()} retrying={feedbackRead.loading} hasPreviousData={feedbackRead.hasSnapshot} />}
      {namesRead.error && <QueryErrorState message="Não foi possível consultar os nomes dos remetentes." onRetry={() => void fetchProfiles()} retrying={namesRead.loading} hasPreviousData={namesRead.hasSnapshot} />}
      {!feedbackRead.hasSnapshot && !feedbackRead.error ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : !feedbackRead.hasSnapshot ? null : feedbacks.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Nenhuma sugestão ainda.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside aria-label="Lista de sugestões" className="max-h-[45dvh] min-w-0 space-y-4 overflow-y-auto lg:max-h-[75dvh]">
          {unread.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wide">
                Não lidas ({unread.length})
              </h3>
              {unread.map(f => <button key={f.id} type="button" aria-pressed={selectedFeedback?.id === f.id} onClick={() => setSelectedId(f.id)} className={`w-full min-h-[72px] rounded-card border p-4 text-left ${selectedFeedback?.id === f.id ? 'border-primary bg-primary/5' : 'bg-card hover:bg-muted'}`}>
                <div className="flex flex-wrap gap-2"><Badge variant="outline">{sectionConfig[f.section]?.label ?? 'Geral'}</Badge><Badge>Nova</Badge></div>
                <p className="mt-2 break-words text-base font-medium">{namesRead.hasSnapshot ? profileNames.get(f.created_by) || 'Remetente não identificado' : namesRead.error ? 'Remetente indisponível' : 'Consultando remetente…'}</p>
                <p className="mt-1 line-clamp-2 break-words text-sm text-muted-foreground">{f.message}</p>
              </button>)}
            </div>
          )}
          {read.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wide">
                Lidas ({read.length})
              </h3>
              {read.map(f => <button key={f.id} type="button" aria-pressed={selectedFeedback?.id === f.id} onClick={() => setSelectedId(f.id)} className={`w-full min-h-[72px] rounded-card border p-4 text-left ${selectedFeedback?.id === f.id ? 'border-primary bg-primary/5' : 'bg-card hover:bg-muted'}`}>
                <div className="flex flex-wrap gap-2"><Badge variant="outline">{sectionConfig[f.section]?.label ?? 'Geral'}</Badge><Badge variant="secondary">{f.response ? 'Respondida' : 'Lida'}</Badge></div>
                <p className="mt-2 break-words text-base font-medium">{namesRead.hasSnapshot ? profileNames.get(f.created_by) || 'Remetente não identificado' : namesRead.error ? 'Remetente indisponível' : 'Consultando remetente…'}</p>
                <p className="mt-1 line-clamp-2 break-words text-sm text-muted-foreground">{f.message}</p>
              </button>)}
            </div>
          )}
          </aside>
          <section aria-label="Leitura da sugestão" className="min-w-0 lg:sticky lg:top-6">{selectedFeedback && renderCard(selectedFeedback, !selectedFeedback.read)}</section>
        </div>
      )}

      <AlertDialog open={!!deletingId} onOpenChange={open => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir sugestão</AlertDialogTitle>
            <AlertDialogDescription>
              Excluir a sugestão sobre {sectionConfig[feedbacks.find(feedback => feedback.id === deletingId)?.section ?? 'geral']?.label ?? 'Geral'}? Esta ação não pode ser desfeita.
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
