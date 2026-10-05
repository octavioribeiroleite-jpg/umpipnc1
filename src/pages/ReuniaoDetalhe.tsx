import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { ResponsiveSectionNavigation } from '@/components/layout/ResponsiveSectionNavigation';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowLeft, Loader2, Lock, RotateCcw, Trash2, Pencil,
  FileText, ListChecks
} from 'lucide-react';
import { PautaEditor } from '@/components/reunioes/PautaEditor';
import { RegistroReuniaoEditor } from '@/components/reunioes/RegistroReuniaoEditor';
import { ResumoIATab } from '@/components/reunioes/ResumoIATab';
import { AtaViewer } from '@/components/reunioes/AtaViewer';
import { ComunicacaoTab } from '@/components/reunioes/ComunicacaoTab';
import { EditMeetingDialog } from '@/components/reunioes/EditMeetingDialog';

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

type SheetType = 'registro' | 'resumo' | 'ata' | 'whatsapp' | 'pauta' | 'acoes';

export default function ReuniaoDetalhe() {
  const { id } = useParams<{ id: string }>();
  return <MeetingWorkspace key={id} id={id} />;
}

function MeetingWorkspace({ id }: { id?: string }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isManagement, loading: authLoading } = useAuth();

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [processedRevision, setProcessedRevision] = useState(0);
  const [processingStep, setProcessingStep] = useState('');
  const [isModerator, setIsModerator] = useState(false);
  const [openSheet, setOpenSheet] = useState<SheetType>('registro');
  const [visited, setVisited] = useState<Set<SheetType>>(() => new Set(['registro']));
  const selectSection = (value: string) => {
    const section = value as SheetType;
    setVisited(previous => new Set([...previous, section]));
    setOpenSheet(section);
  };
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const fetchMeeting = async () => {
    if (!id || !user) return;
    try {
      const { data: meetingData, error: meetingError } = await supabase
        .from('meetings').select('*').eq('id', id).single();
      if (meetingError) throw meetingError;
      setMeeting({ ...meetingData, status: meetingData.status as 'aberta' | 'fechada' });
      setIsModerator(meetingData.moderator_id === user?.id);
      const { data: agendaData, error: agendaError } = await supabase
        .from('agenda_items').select('*').eq('meeting_id', id).order('order_index');
      if (!agendaError) setAgendaItems(agendaData || []);
    } catch (err) {
      console.error('Error fetching meeting:', err);
      toast({ title: 'Erro', description: 'Erro ao carregar reunião.', variant: 'destructive' });
      navigate('/reunioes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) fetchMeeting();
  }, [id, user, authLoading]);

  const handleProcessMeeting = async () => {
    if (!meeting || !id) return;
    const confirmed = window.confirm(
      'A IA irá organizar o registro e gerar a ata e mensagem de WhatsApp automaticamente.\n\nApós revisar, você poderá finalizar a reunião.\n\nDeseja continuar?'
    );
    if (!confirmed) return;
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

  const sections: { value: SheetType; label: string }[] = [
    { value: 'registro', label: 'Registro' }, { value: 'pauta', label: 'Pauta' },
    { value: 'resumo', label: 'Resumo IA' }, { value: 'ata', label: 'Ata' },
    { value: 'whatsapp', label: 'WhatsApp' },
    ...(canManage ? [{ value: 'acoes' as const, label: 'Ações' }] : []),
  ];
  const emptyGenerated = <div className="rounded-xl border border-dashed bg-muted/30 p-6 space-y-3">
    <p>Este conteúdo ainda não foi gerado. Registre a reunião e processe o texto para preparar a revisão.</p>
    <Button variant="outline" onClick={() => selectSection('registro')}>Ir ao registro</Button>
  </div>;

  return <AppLayout>
    <div className="mx-auto w-full max-w-[1120px] space-y-6">
      <header className="space-y-3">
        <Button variant="ghost" onClick={() => navigate('/reunioes')}><ArrowLeft className="mr-2 h-4 w-4" />Reuniões</Button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <h1 className="text-2xl sm:text-3xl font-semibold break-words">{meeting.title}</h1>
            <p className="text-sm text-muted-foreground">{new Date(meeting.date).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' })}</p>
          </div>
          <Badge variant={isClosed ? 'secondary' : 'outline'}>{isClosed ? 'Finalizada' : 'Aberta'}</Badge>
        </div>
      </header>
      {isClosed && <Alert><Lock className="h-4 w-4" /><AlertDescription>Reunião finalizada. O registro e a pauta estão em modo de leitura.</AlertDescription></Alert>}
      <Tabs value={openSheet} onValueChange={selectSection} className="space-y-6">
        <ResponsiveSectionNavigation label="Seção da reunião" value={openSheet} onChange={selectSection} options={sections} />
        <TabsContent forceMount value="registro" className="data-[state=inactive]:hidden">
          <div className="grid items-start gap-6 min-[1100px]:grid-cols-[minmax(0,760px)_280px]">
            <Card className="min-w-0"><CardContent className="p-4 sm:p-6">
              <h2 className="mb-3 flex items-center gap-2 text-xl font-semibold"><FileText className="h-5 w-5" />Registro da reunião</h2>
              <RegistroReuniaoEditor meetingId={meeting.id} meetingNotes={meeting.meeting_notes}
                isProcessed={isProcessed} canManage={canManage} readOnly={isClosed} isProcessing={processing}
                processingStep={processingStep} onProcess={handleProcessMeeting} onFinalize={handleFinalizeMeeting}
                onNotesChange={handleNotesChange} embedded />
            </CardContent></Card>
            <aside className="rounded-2xl border bg-card p-4 space-y-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold"><ListChecks className="h-5 w-5" />Pauta</h2>
              {agendaItems.length ? <ol className="list-decimal space-y-3 pl-5">{agendaItems.map(item => <li key={item.id} className="break-words">{item.title}</li>)}</ol> : <p className="text-muted-foreground">Nenhum item de pauta.</p>}
              <Button variant="outline" className="w-full" onClick={() => selectSection('pauta')}>Ver pauta</Button>
            </aside>
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
        {canManage && visited.has('acoes') && <TabsContent forceMount value="acoes" className="max-w-[760px] data-[state=inactive]:hidden">
          <Card><CardContent className="p-4 sm:p-6 space-y-4">
            <h2 className="text-xl font-semibold">Gerenciar reunião</h2>
            {!isClosed && <Button variant="outline" className="w-full justify-start" onClick={() => setEditDialogOpen(true)}><Pencil className="mr-2 h-4 w-4" />Editar título e data</Button>}
            {isClosed && <Button variant="outline" className="w-full justify-start" onClick={handleReopenMeeting}><RotateCcw className="mr-2 h-4 w-4" />Reabrir reunião</Button>}
            {hasContent && <Button variant="outline" className="w-full justify-start text-destructive" onClick={handleDeleteMinutes}><Trash2 className="mr-2 h-4 w-4" />Excluir ata e reprocessar</Button>}
          </CardContent></Card>
        </TabsContent>}
      </Tabs>
      <EditMeetingDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} meeting={meeting} onUpdate={handleUpdateMeeting} />
    </div>
  </AppLayout>;
}
