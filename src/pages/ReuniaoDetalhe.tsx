import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
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
  { value: 'ata', label: 'Ata' },
  { value: 'registro', label: 'Registro' },
  { value: 'pauta', label: 'Pauta' },
] as const;
const extraSections = [
  { value: 'resumo', label: 'Resumo IA' },
  { value: 'whatsapp', label: 'WhatsApp' },
] as const;
const meetingsBack = { path: '/reunioes', label: 'Reuniões' };
const meetingHeader = <DashboardHeader hasNotifications={false} textOnly backTo={meetingsBack} />;
const meetingDate = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
const meetingTime = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });

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
      <AppLayout header={meetingHeader}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!meeting) {
    return (
      <AppLayout header={meetingHeader}>
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
  const activeExtraSection = extraSections.find(section => section.value === openSheet);
  const date = new Date(meeting.date);

  const agendaHeading = <>
    <span className="min-w-0">
      <span className="font-semibold">Pauta de apoio</span>
      <span className="ml-2 text-xs font-medium text-muted-foreground">{agendaItems.length} {agendaItems.length === 1 ? 'tópico' : 'tópicos'}</span>
    </span>
  </>;
  const emptyGenerated = <div className="rounded-xl border border-dashed bg-muted/30 p-6 space-y-3">
    <p>Este conteúdo fica disponível depois de usar “Preparar resumo” no registro.</p>
    <Button variant="outline" onClick={() => selectSection('registro')}>Ir ao registro</Button>
  </div>;

  return <AppLayout header={meetingHeader}>
    <div className="meetings-workspace mx-auto w-full max-w-[56rem] space-y-2">
      <header className="meeting-cover rounded-xl px-3 py-2.5 sm:px-5 sm:py-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
          <h1 className="meeting-cover__title min-w-0">{meeting.title}</h1>
          <span data-closed={isClosed} className="meeting-cover__status rounded-full px-2 py-0.5 text-xs font-semibold">
            {isClosed ? 'Finalizada' : 'Aberta'}
          </span>
        </div>
        <div className="meeting-cover__meta mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <time dateTime={meeting.date}>{meetingDate.format(date)} · {meetingTime.format(date)}</time>
          {participantsCount !== null && <span>{participantsCount} {participantsCount === 1 ? 'participante' : 'participantes'}</span>}
        </div>
      </header>
      <Tabs value={openSheet} onValueChange={selectSection}>
        <div className="meeting-section-bar">
          <TabsList aria-label="Seções da reunião" className="grid min-w-0 grid-cols-3 gap-0 rounded-none border-0 bg-transparent p-0">
            {sections.map(({ value, label }) => (
              <TabsTrigger key={value} value={value} className="meeting-section-tab">{label}</TabsTrigger>
            ))}
          </TabsList>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="meeting-section-tab" data-active={!!activeExtraSection}
                aria-label={activeExtraSection ? `Seções. Atual: ${activeExtraSection.label}` : 'Seções'}>
                {activeExtraSection?.label ?? 'Seções'}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {extraSections.map(({ value, label }) => (
                <DropdownMenuItem key={value} onSelect={() => selectSection(value)} aria-current={openSheet === value ? 'true' : undefined}>
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <TabsContent forceMount value="registro" className="mt-2 data-[state=inactive]:hidden">
          <div className="meeting-record-grid grid items-start gap-3 sm:gap-4">
            <aside aria-label="Pauta de apoio" className="meeting-agenda min-w-0 rounded-xl border bg-card">
              <h2 className="meeting-agenda__heading min-h-12 items-center px-3 text-sm">{agendaHeading}</h2>
              <button type="button" aria-expanded={agendaOpen} aria-controls="meeting-agenda-preview"
                className="meeting-agenda__toggle flex min-h-12 w-full items-center justify-between gap-2 rounded-xl px-3 text-left text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                onClick={() => setAgendaOpen(previous => !previous)}>
                {agendaHeading}<span className="text-xs font-semibold text-primary">{agendaOpen ? 'Fechar' : 'Ver'}</span>
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
                  Ver pauta completa
                </Button>
              </div>
            </aside>
            <Card className="meeting-editor min-w-0 rounded-xl shadow-none">
              <RegistroReuniaoEditor meetingId={meeting.id} meetingNotes={meeting.meeting_notes}
                isProcessed={isProcessed} canManage={canManage} readOnly={isClosed} isProcessing={processing}
                processingStep={processingStep} onProcess={() => setProcessDialogOpen(true)} onFinalize={handleFinalizeMeeting}
                onNotesChange={handleNotesChange} />
            </Card>
          </div>
        </TabsContent>
        {/* Visited editors stay mounted when navigation or viewport changes. */}
        {visited.has('pauta') && <TabsContent forceMount value="pauta" className="mt-2 max-w-[760px] data-[state=inactive]:hidden">
          <PautaEditor meetingId={meeting.id} agendaItems={agendaItems} onUpdate={fetchMeeting} disabled={isClosed} canManage={canManage} />
        </TabsContent>}
        {visited.has('resumo') && <section hidden={openSheet !== 'resumo'} aria-label="Resumo IA" className="mt-2 max-w-[760px]"><ResumoIATab meetingId={meeting.id} isProcessed={isProcessed} revision={processedRevision} /></section>}
        {visited.has('ata') && <TabsContent forceMount value="ata" className="mt-2 max-w-[760px] data-[state=inactive]:hidden">
          {hasContent ? <AtaViewer meeting={meeting} agendaItems={agendaItems} canManage={canManage} onUpdateMinutes={handleUpdateMinutes} /> : emptyGenerated}
        </TabsContent>}
        {visited.has('whatsapp') && <section hidden={openSheet !== 'whatsapp'} aria-label="WhatsApp" className="mt-2 max-w-[760px]">
          {hasContent ? <ComunicacaoTab meetingId={meeting.id} canManage={canManage} whatsappMessage={meeting.whatsapp_message} hasFinalMinutes={hasContent} onMessageUpdated={message => setMeeting(previous => previous ? { ...previous, whatsapp_message: message } : previous)} /> : emptyGenerated}
        </section>}
      </Tabs>
      {canManage && <details className="group rounded-xl">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl px-2 text-sm font-semibold text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
          Gerenciar reunião
        </summary>
        <Card><CardContent className="space-y-3 p-4">
          {!isClosed && <Button variant="outline" className="w-full justify-start" onClick={() => setEditDialogOpen(true)}>Editar título e data</Button>}
          {isClosed && <Button variant="outline" className="w-full justify-start" onClick={handleReopenMeeting}>Reabrir reunião</Button>}
          {hasContent && <Button variant="outline" className="w-full justify-start text-destructive" onClick={handleDeleteMinutes}>Excluir ata e reprocessar</Button>}
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
