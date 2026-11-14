import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowLeft, Loader2, Lock, RotateCcw, Trash2, Pencil,
  FileText, ListChecks, CalendarDays, Users, NotebookPen, Sparkles, MessageCircle,
  Settings2, ChevronDown, ArrowRight,
} from 'lucide-react';
import { PautaEditor } from '@/components/reunioes/PautaEditor';
import { RegistroReuniaoEditor } from '@/components/reunioes/RegistroReuniaoEditor';
import { ResumoIATab } from '@/components/reunioes/ResumoIATab';
import { AtaViewer } from '@/components/reunioes/AtaViewer';
import { ComunicacaoTab } from '@/components/reunioes/ComunicacaoTab';
import { EditMeetingDialog } from '@/components/reunioes/EditMeetingDialog';
import '@/components/reunioes/reunioes.css';

interface Meeting {
  id: string;
  title: string;
  date: string;
  status: 'aberta' | 'fechada';
  moderator_id: string;
  contributions_revealed: boolean;
  ai_organized: boolean;
  final_minutes: string | null;
  whatsapp_message: string | null;
  meeting_notes: string | null;
}

interface AgendaItem {
  id: string;
  meeting_id: string;
  title: string;
  description: string | null;
  order_index: number;
}

type SheetType = 'registro' | 'resumo' | 'ata' | 'whatsapp' | 'pauta';

const sections = [
  { value: 'registro', label: 'Registro', Icon: NotebookPen },
  { value: 'pauta', label: 'Pauta', Icon: ListChecks },
  { value: 'resumo', label: 'Resumo IA', Icon: Sparkles },
  { value: 'ata', label: 'Ata', Icon: FileText },
  { value: 'whatsapp', label: 'WhatsApp', Icon: MessageCircle },
] as const;

export default function ReuniaoDetalhe() {
  const { id } = useParams<{ id: string }>();
  return <MeetingWorkspace key={id} id={id} />;
}

function MeetingWorkspace({ id }: { id?: string }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialSection = searchParams.get('secao') === 'ata' ? 'ata' : 'registro';
  const { toast } = useToast();
  const { user, isManagement, loading: authLoading } = useAuth();

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);
  const [participantsCount, setParticipantsCount] = useState<number | null>(null);
  const [agendaOpen, setAgendaOpen] = useState(false);
  const [processDialogOpen, setProcessDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [processedRevision, setProcessedRevision] = useState(0);
  const [processingStep, setProcessingStep] = useState('');
  const [isModerator, setIsModerator] = useState(false);
  const [openSheet, setOpenSheet] = useState<SheetType>(initialSection);
  const [visited, setVisited] = useState<Set<SheetType>>(() => new Set(['registro', initialSection]));
  const selectSection = (value: string) => {
    const section = value as SheetType;
    setVisited(previous => new Set([...previous, section]));
    setOpenSheet(section);
  };
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const userId = user?.id;
  const fetchMeeting = useCallback(async () => {
    if (!id || !userId) return;
    try {
      const { data: meetingData, error: meetingError } = await supabase
        .from('meetings').select('*').eq('id', id).single();
      if (meetingError) throw meetingError;
      setMeeting({ ...meetingData, status: meetingData.status as 'aberta' | 'fechada' });
      setIsModerator(meetingData.moderator_id === userId);
      const [{ data: agendaData, error: agendaError }, { count }] = await Promise.all([
        supabase.from('agenda_items').select('*').eq('meeting_id', id).order('order_index'),
        supabase.from('meeting_participants').select('meeting_id', { count: 'exact', head: true }).eq('meeting_id', id),
      ]);
      if (!agendaError) setAgendaItems(agendaData || []);
      setParticipantsCount(count);
    } catch (err) {
      console.error('Error fetching meeting:', err);
      toast({ title: 'Erro', description: 'Erro ao carregar reunião.', variant: 'destructive' });
      navigate('/reunioes');
    } finally {
      setLoading(false);
    }
  }, [id, userId, navigate, toast]);

  useEffect(() => {
    if (!authLoading) void fetchMeeting();
  }, [authLoading, fetchMeeting]);

  const handleProcessMeeting = async () => {
    if (!meeting || !id) return;
    setProcessing(true);
    setProcessingStep('saving');
    try {
      const { error: meetingError } = await supabase.from('meetings').update({ contributions_revealed: true }).eq('id', id);
      if (meetingError) throw meetingError;
      setProcessingStep('generating');
      const { data: processData, error: processError } = await supabase.functions.invoke('auto-process-meeting', { body: { meetingId: id } });
      if (processError || processData?.error) throw processError || new Error(processData.error);
      setProcessingStep('done');
      const eventsCreated = processData?.eventsCreated || 0;
      const tasksCreated = processData?.tasksCreated || 0;
      let description = 'Ata gerada e mensagem WhatsApp criada';
      if (eventsCreated > 0 || tasksCreated > 0) {
        const parts = [];
        if (eventsCreated > 0) parts.push(`${eventsCreated} evento(s)`);
        if (tasksCreated > 0) parts.push(`${tasksCreated} tarefa(s)`);
        description += `. Criado(s): ${parts.join(' e ')}`;
      }
      toast({ title: 'Reunião Processada!', description: description + '. Revise o conteúdo e finalize quando estiver pronto.' });
      await fetchMeeting();
      setProcessedRevision(value => value + 1);
      selectSection('resumo');
    } catch (err) {
      console.error('Error processing meeting:', err);
      toast({ title: 'Erro', description: 'Erro ao processar reunião.', variant: 'destructive' });
    } finally {
      setProcessing(false);
      setProcessingStep('');
    }
  };

  const handleFinalizeMeeting = async () => {
    if (!meeting || !id) return;
    const confirmed = window.confirm('Deseja finalizar esta reunião?\n\nApós finalizar, a reunião ficará em modo somente leitura.');
    if (!confirmed) return;
    try {
      const { error } = await supabase.from('meetings').update({ status: 'fechada' }).eq('id', id);
      if (error) throw error;
      setMeeting(previous => previous ? { ...previous, status: 'fechada' } : previous);
      toast({ title: 'Reunião Finalizada!', description: 'A reunião foi encerrada com sucesso.' });
    } catch (err) {
      toast({ title: 'Erro', description: 'Erro ao finalizar reunião.', variant: 'destructive' });
    }
  };

  const handleReopenMeeting = async () => {
    if (!meeting || !id) return;
    const confirmed = window.confirm('Deseja reabrir esta reunião?\n\nA ata será preservada, mas a reunião voltará ao status aberta para edição.');
    if (!confirmed) return;
    try {
      const { error } = await supabase.from('meetings').update({ status: 'aberta' }).eq('id', id);
      if (error) throw error;
      setMeeting(previous => previous ? { ...previous, status: 'aberta' } : previous);
      selectSection('registro');
      toast({ title: 'Sucesso', description: 'Reunião reaberta com sucesso!' });
    } catch (err) {
      toast({ title: 'Erro', description: 'Erro ao reabrir reunião.', variant: 'destructive' });
    }
  };

  const handleUpdateMeeting = async (updates: { title: string; date: string }) => {
    if (!meeting || !id) return;
    try {
      const { error } = await supabase.from('meetings').update({ title: updates.title, date: updates.date }).eq('id', id);
      if (error) throw error;
      setMeeting(previous => previous ? { ...previous, ...updates } : previous);
      toast({ title: 'Sucesso', description: 'Reunião atualizada com sucesso!' });
    } catch (err) {
      toast({ title: 'Erro', description: 'Erro ao atualizar reunião.', variant: 'destructive' });
      throw err;
    }
  };

  const handleUpdateMinutes = async (newMinutes: string) => {
    if (!meeting || !id) return;
    try {
      const { error } = await supabase.from('meetings').update({ final_minutes: newMinutes }).eq('id', id);
      if (error) throw error;
      setMeeting(previous => previous ? { ...previous, final_minutes: newMinutes } : previous);
      toast({ title: 'Sucesso', description: 'Ata atualizada com sucesso!' });
    } catch (err) {
      toast({ title: 'Erro', description: 'Erro ao atualizar ata.', variant: 'destructive' });
      throw err;
    }
  };

  const handleDeleteMinutes = async () => {
    if (!meeting || !id) return;
    const confirmed = window.confirm('ATENÇÃO: Deseja excluir a ata e reprocessar a reunião?\n\nEsta ação não pode ser desfeita.');
    if (!confirmed) return;
    try {
      const { error } = await supabase.from('meetings').update({
        final_minutes: null, whatsapp_message: null, status: 'aberta',
        contributions_revealed: false, ai_organized: false,
      }).eq('id', id);
      if (error) throw error;
      setMeeting(previous => previous ? {
        ...previous, final_minutes: null, whatsapp_message: null,
        status: 'aberta', contributions_revealed: false, ai_organized: false,
      } : previous);
      selectSection('registro');
      toast({ title: 'Sucesso', description: 'Ata excluída. Reunião reaberta para edição.' });
    } catch (err) {
      toast({ title: 'Erro', description: 'Erro ao excluir ata.', variant: 'destructive' });
    }
  };

  const handleNotesChange = (notes: string) => {
    setMeeting(previous => previous ? { ...previous, meeting_notes: notes } : previous);
  };

  if (loading || authLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!meeting) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Reunião não encontrada.</p>
          <Button variant="outline" onClick={() => navigate('/reunioes')} className="mt-4">Voltar para Reuniões</Button>
        </div>
      </AppLayout>
    );
  }

  const isClosed = meeting.status === 'fechada';
  const isProcessed = meeting.contributions_revealed && meeting.ai_organized;
  const hasContent = !!meeting.final_minutes;
  const canManage = isModerator || isManagement;

  const agendaHeading = <>
    <span className="meeting-tint inline-grid size-8 shrink-0 place-items-center rounded-lg"><ListChecks aria-hidden="true" className="size-4" /></span>
    <span className="min-w-0">
      <span className="font-semibold">Pauta</span>
      <span className="ml-2 text-xs font-medium text-muted-foreground">{agendaItems.length} {agendaItems.length === 1 ? 'tópico' : 'tópicos'}</span>
    </span>
  </>;
  const emptyGenerated = <div className="rounded-xl border border-dashed bg-muted/30 p-6 space-y-3">
    <p>Este conteúdo fica disponível depois de usar “Preparar resumo” no registro.</p>
    <Button variant="outline" onClick={() => selectSection('registro')}>Ir ao registro</Button>
  </div>;

  return <AppLayout>
    <div className="meetings-workspace mx-auto w-full max-w-[56rem] space-y-4 sm:space-y-5">
      <Button variant="ghost" onClick={() => navigate('/reunioes')} className="-ml-2 min-h-11 gap-2 px-2 text-primary"><ArrowLeft aria-hidden="true" className="size-4" />Reuniões</Button>
      <header className="meeting-cover rounded-[1.25rem] p-5 sm:p-7">
        <span data-closed={isClosed} className="meeting-cover__status inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />{isClosed ? 'Finalizada' : 'Aberta'}
        </span>
        <h1 className="meeting-cover__title my-2.5 max-w-[25ch]">{meeting.title}</h1>
        <div className="meeting-cover__meta flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <span className="inline-flex items-center gap-2"><CalendarDays aria-hidden="true" className="size-4 shrink-0" />
            <time dateTime={meeting.date}>{new Date(meeting.date).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</time>
          </span>
          {participantsCount !== null && <span className="inline-flex items-center gap-2"><Users aria-hidden="true" className="size-4 shrink-0" />
            {participantsCount} {participantsCount === 1 ? 'participante' : 'participantes'}
          </span>}
        </div>
      </header>
      {isClosed && <Alert><Lock className="h-4 w-4" /><AlertDescription>Reunião finalizada. O registro e a pauta estão em modo de leitura.</AlertDescription></Alert>}
      <Tabs value={openSheet} onValueChange={selectSection} className="space-y-3">
        <TabsList aria-label="Seções da reunião" className="meeting-section-tabs grid w-full rounded-[0.9rem] bg-card">
          {sections.map(({ value, label, Icon }) => (
            <TabsTrigger key={value} value={value} className="meeting-section-tab gap-1.5 px-2 leading-tight data-[state=active]:shadow-none">
              <Icon aria-hidden="true" className="size-4 shrink-0" />{label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent forceMount value="registro" className="data-[state=inactive]:hidden">
          <div className="meeting-record-grid grid items-start gap-3 sm:gap-4">
            <aside aria-label="Pauta de apoio" className="meeting-agenda min-w-0 rounded-2xl border bg-card shadow-sm">
              <h2 className="meeting-agenda__heading min-h-14 items-center gap-2.5 px-3.5">{agendaHeading}</h2>
              <button type="button" aria-expanded={agendaOpen} aria-controls="meeting-agenda-preview"
                className="meeting-agenda__toggle flex min-h-14 w-full items-center gap-2.5 rounded-2xl px-3.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                onClick={() => setAgendaOpen(previous => !previous)}>
                {agendaHeading}<ChevronDown aria-hidden="true" className="meeting-agenda__chevron ml-auto size-4 shrink-0 text-muted-foreground" />
              </button>
              <div id="meeting-agenda-preview" className="meeting-agenda__content px-3.5 pb-1.5">
                {agendaItems.length ? (
                  <ol>{agendaItems.map((item, index) => (
                    <li key={item.id} className="flex items-baseline gap-2 border-t py-2.5 text-sm leading-snug">
                      <span aria-hidden="true" className="shrink-0 text-xs font-bold tabular-nums text-primary">{String(index + 1).padStart(2, '0')}</span>
                      <span className="min-w-0 break-words">{item.title}</span>
                    </li>
                  ))}</ol>
                ) : <p className="border-t py-2.5 text-sm text-muted-foreground">Nenhum tópico na pauta.</p>}
                <Button variant="ghost" className="-ml-2 min-h-11 gap-1.5 px-2 text-sm text-primary" onClick={() => selectSection('pauta')}>
                  Ver pauta completa <ArrowRight aria-hidden="true" className="size-4" />
                </Button>
              </div>
            </aside>
            <Card className="meeting-editor min-w-0 rounded-2xl shadow-sm">
              <RegistroReuniaoEditor meetingId={meeting.id} meetingNotes={meeting.meeting_notes}
                isProcessed={isProcessed} canManage={canManage} readOnly={isClosed} isProcessing={processing}
                processingStep={processingStep} onProcess={() => setProcessDialogOpen(true)} onFinalize={handleFinalizeMeeting}
                onNotesChange={handleNotesChange} />
            </Card>
          </div>
        </TabsContent>
        {/* Visited editors stay mounted when navigation or viewport changes. */}
        {visited.has('pauta') && <TabsContent forceMount value="pauta" className="max-w-[760px] data-[state=inactive]:hidden">
          <PautaEditor meetingId={meeting.id} agendaItems={agendaItems} onUpdate={fetchMeeting} disabled={isClosed} canManage={canManage} />
        </TabsContent>}
        {visited.has('resumo') && <TabsContent forceMount value="resumo" className="max-w-[760px] data-[state=inactive]:hidden"><ResumoIATab meetingId={meeting.id} isProcessed={isProcessed} revision={processedRevision} /></TabsContent>}
        {visited.has('ata') && <TabsContent forceMount value="ata" className="max-w-[760px] data-[state=inactive]:hidden">
          {hasContent ? <AtaViewer meeting={meeting} agendaItems={agendaItems} canManage={canManage} onUpdateMinutes={handleUpdateMinutes} /> : emptyGenerated}
        </TabsContent>}
        {visited.has('whatsapp') && <TabsContent forceMount value="whatsapp" className="max-w-[760px] data-[state=inactive]:hidden">
          {hasContent ? <ComunicacaoTab meetingId={meeting.id} canManage={canManage} whatsappMessage={meeting.whatsapp_message} hasFinalMinutes={hasContent} onMessageUpdated={message => setMeeting(previous => previous ? { ...previous, whatsapp_message: message } : previous)} /> : emptyGenerated}
        </TabsContent>}
      </Tabs>
      {canManage && <details className="group rounded-xl">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl px-2 text-sm font-semibold text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
          <Settings2 aria-hidden="true" className="size-4" /> Gerenciar reunião <ChevronDown aria-hidden="true" className="size-4 transition-transform group-open:rotate-180" />
        </summary>
        <Card><CardContent className="space-y-3 p-4">
          {!isClosed && <Button variant="outline" className="w-full justify-start" onClick={() => setEditDialogOpen(true)}><Pencil className="mr-2 h-4 w-4" />Editar título e data</Button>}
          {isClosed && <Button variant="outline" className="w-full justify-start" onClick={handleReopenMeeting}><RotateCcw className="mr-2 h-4 w-4" />Reabrir reunião</Button>}
          {hasContent && <Button variant="outline" className="w-full justify-start text-destructive" onClick={handleDeleteMinutes}><Trash2 className="mr-2 h-4 w-4" />Excluir ata e reprocessar</Button>}
        </CardContent></Card>
      </details>}
      <EditMeetingDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} meeting={meeting} onUpdate={handleUpdateMeeting} />
      <AlertDialog open={processDialogOpen} onOpenChange={setProcessDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Preparar resumo da reunião?</AlertDialogTitle>
            <AlertDialogDescription>
              A IA organizará o registro e preparará a ata e a mensagem para WhatsApp. Tarefas e eventos identificados podem ser criados no aplicativo. Você poderá revisar o resultado antes de finalizar a reunião.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleProcessMeeting()}>Preparar resumo</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  </AppLayout>;
}
