import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowLeft, Loader2, Lock, RotateCcw, Trash2, Pencil,
  FileText, Bot, ScrollText, MessageCircle, ListChecks, Settings, Check
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

type SheetType = 'registro' | 'resumo' | 'ata' | 'whatsapp' | 'pauta' | 'acoes' | null;

export default function ReuniaoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isManagement, loading: authLoading } = useAuth();

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [isModerator, setIsModerator] = useState(false);
  const [openSheet, setOpenSheet] = useState<SheetType>(null);
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
      setProcessingStep('analyzing');
      const { error: meetingError } = await supabase.from('meetings').update({ contributions_revealed: true }).eq('id', id);
      if (meetingError) throw meetingError;
      setProcessingStep('generating');
      const { data: processData, error: processError } = await supabase.functions.invoke('auto-process-meeting', { body: { meetingId: id } });
      if (processError) {
        toast({ title: 'Erro', description: 'Houve um erro no processamento automático.', variant: 'destructive' });
        setProcessing(false);
        setProcessingStep('');
        return;
      }
      setProcessingStep('whatsapp');
      await new Promise(r => setTimeout(r, 500));
      setProcessingStep('calendar');
      await new Promise(r => setTimeout(r, 500));
      setProcessingStep('done');
      await new Promise(r => setTimeout(r, 1000));
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
      setOpenSheet('resumo');
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
      setMeeting({ ...meeting, status: 'fechada' });
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
      setMeeting({ ...meeting, status: 'aberta' });
      setOpenSheet(null);
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
      setMeeting({ ...meeting, ...updates });
      toast({ title: 'Sucesso', description: 'Reunião atualizada com sucesso!' });
    } catch (err) {
      toast({ title: 'Erro', description: 'Erro ao atualizar reunião.', variant: 'destructive' });
    }
  };

  const handleUpdateMinutes = async (newMinutes: string) => {
    if (!meeting || !id) return;
    try {
      const { error } = await supabase.from('meetings').update({ final_minutes: newMinutes }).eq('id', id);
      if (error) throw error;
      setMeeting({ ...meeting, final_minutes: newMinutes });
      toast({ title: 'Sucesso', description: 'Ata atualizada com sucesso!' });
    } catch (err) {
      toast({ title: 'Erro', description: 'Erro ao atualizar ata.', variant: 'destructive' });
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
      setMeeting({
        ...meeting, final_minutes: null, whatsapp_message: null,
        status: 'aberta', contributions_revealed: false, ai_organized: false,
      });
      setOpenSheet(null);
      toast({ title: 'Sucesso', description: 'Ata excluída. Reunião reaberta para edição.' });
    } catch (err) {
      toast({ title: 'Erro', description: 'Erro ao excluir ata.', variant: 'destructive' });
    }
  };

  const handleNotesChange = (notes: string) => {
    if (meeting) setMeeting({ ...meeting, meeting_notes: notes });
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

  const toolCards: { key: SheetType; icon: React.ReactNode; title: string; desc: string; ready?: boolean; hidden?: boolean }[] = [
    { key: 'registro', icon: <FileText className="h-5 w-5" />, title: 'Registro', desc: 'Anotações da reunião', ready: !!meeting.meeting_notes },
    { key: 'resumo', icon: <Bot className="h-5 w-5" />, title: 'Resumo IA', desc: 'Análise automática', ready: isProcessed },
    { key: 'ata', icon: <ScrollText className="h-5 w-5" />, title: 'Ata', desc: 'Documento final', ready: hasContent },
    { key: 'whatsapp', icon: <MessageCircle className="h-5 w-5" />, title: 'WhatsApp', desc: 'Mensagem de divulgação', ready: !!meeting.whatsapp_message },
    { key: 'pauta', icon: <ListChecks className="h-5 w-5" />, title: 'Pauta', desc: `${agendaItems.length} itens`, ready: agendaItems.length > 0 },
    { key: 'acoes', icon: <Settings className="h-5 w-5" />, title: 'Ações', desc: 'Gerenciar reunião', hidden: !canManage },
  ];

  const sheetTitles: Record<string, string> = {
    registro: 'Registro da Reunião',
    resumo: 'Resumo IA',
    ata: 'Ata da Reunião',
    whatsapp: 'Mensagem WhatsApp',
    pauta: 'Pauta da Reunião',
    acoes: 'Ações da Reunião',
  };

  // When a tool is open, render it inline (full-screen style)
  if (openSheet) {
    return (
      <AppLayout>
        {/* Back header */}
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setOpenSheet(null)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold truncate">{sheetTitles[openSheet]}</h1>
        </div>

        {/* Full-width content */}
        <div className="w-full overflow-hidden">
          {openSheet === 'registro' && (
            <RegistroReuniaoEditor
              meetingId={meeting.id}
              meetingNotes={meeting.meeting_notes}
              isProcessed={isProcessed}
              canManage={canManage}
              isProcessing={processing}
              processingStep={processingStep}
              onProcess={handleProcessMeeting}
              onFinalize={handleFinalizeMeeting}
              onNotesChange={handleNotesChange}
              embedded
            />
          )}

          {openSheet === 'resumo' && (
            <ResumoIATab meetingId={meeting.id} isProcessed={isProcessed} />
          )}

          {openSheet === 'ata' && (
            hasContent ? (
              <AtaViewer
                meeting={meeting}
                agendaItems={agendaItems}
                canManage={canManage}
                onUpdateMinutes={handleUpdateMinutes}
              />
            ) : (
              <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed">
                <p className="text-muted-foreground">
                  Ainda não processado. Escreva o registro e clique em "Processar Reunião".
                </p>
              </div>
            )
          )}

          {openSheet === 'whatsapp' && (
            hasContent ? (
              <ComunicacaoTab
                meetingId={meeting.id}
                canManage={canManage}
                whatsappMessage={meeting.whatsapp_message}
                hasFinalMinutes={!!meeting.final_minutes}
                onMessageUpdated={(msg) => setMeeting(prev => prev ? { ...prev, whatsapp_message: msg } : null)}
              />
            ) : (
              <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed">
                <p className="text-muted-foreground">
                  Ainda não processado. Escreva o registro e clique em "Processar Reunião".
                </p>
              </div>
            )
          )}

          {openSheet === 'pauta' && (
            <PautaEditor
              meetingId={meeting.id}
              agendaItems={agendaItems}
              onUpdate={fetchMeeting}
              disabled={isClosed}
              canManage={canManage}
            />
          )}

          {openSheet === 'acoes' && canManage && (
            <div className="space-y-3">
              {!isClosed && (
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => { setOpenSheet(null); setEditDialogOpen(true); }}
                >
                  <Pencil className="h-4 w-4" />
                  Editar título e data
                </Button>
              )}
              {isClosed && (
                <Button variant="outline" className="w-full justify-start gap-2" onClick={handleReopenMeeting}>
                  <RotateCcw className="h-4 w-4" />
                  Reabrir reunião
                </Button>
              )}
              {meeting.final_minutes && (
                <Button variant="outline" className="w-full justify-start gap-2 text-destructive hover:text-destructive" onClick={handleDeleteMinutes}>
                  <Trash2 className="h-4 w-4" />
                  Excluir ata e reprocessar
                </Button>
              )}
            </div>
          )}
        </div>

        {meeting && (
          <EditMeetingDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            meeting={meeting}
            onUpdate={handleUpdateMeeting}
          />
        )}
      </AppLayout>
    );
  }

  // Default: show grid of tool cards
  return (
    <AppLayout>
      {/* Compact header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => navigate('/reunioes')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-lg font-semibold truncate">{meeting.title}</h1>
          </div>
          <p className="text-sm text-muted-foreground ml-10">
            {new Date(meeting.date).toLocaleDateString('pt-BR', {
              weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </p>
        </div>
        <Badge
          variant={isClosed ? 'secondary' : 'default'}
          className={`shrink-0 mt-1 ${isClosed ? '' : isProcessed ? 'bg-blue-500 hover:bg-blue-600' : 'bg-success'}`}
        >
          {isClosed ? '⚪ Fechada' : isProcessed ? '🔵 Processada' : '🟢 Aberta'}
        </Badge>
      </div>

      {/* Closed alert - compact */}
      {isClosed && (
        <Alert className="mb-4 border-muted py-2">
          <Lock className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Reunião encerrada — somente consulta.
          </AlertDescription>
        </Alert>
      )}

      {/* Tool cards grid */}
      <div className="grid grid-cols-2 gap-3">
        {toolCards.filter(c => !c.hidden).map((card) => (
          <Card
            key={card.key}
            className="cursor-pointer transition-all hover:shadow-md active:scale-[0.98] relative"
            onClick={() => setOpenSheet(card.key)}
          >
            <CardContent className="p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  {card.icon}
                </div>
                {card.ready && (
                  <div className="h-5 w-5 rounded-full bg-green-500/15 flex items-center justify-center">
                    <Check className="h-3 w-3 text-green-600" />
                  </div>
                )}
              </div>
              <div>
                <p className="font-medium text-sm">{card.title}</p>
                <p className="text-xs text-muted-foreground">{card.desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {meeting && (
        <EditMeetingDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          meeting={meeting}
          onUpdate={handleUpdateMeeting}
        />
      )}
    </AppLayout>
  );
}
