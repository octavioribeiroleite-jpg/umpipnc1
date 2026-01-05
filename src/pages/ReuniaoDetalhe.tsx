import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Loader2, Lock, RotateCcw, Trash2 } from 'lucide-react';
import { PautaEditor } from '@/components/reunioes/PautaEditor';
import { RegistroReuniaoEditor } from '@/components/reunioes/RegistroReuniaoEditor';
import { ResumoIATab } from '@/components/reunioes/ResumoIATab';
import { AtaViewer } from '@/components/reunioes/AtaViewer';
import { ComunicacaoTab } from '@/components/reunioes/ComunicacaoTab';

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
  const [activeTab, setActiveTab] = useState('registro');

  const fetchMeeting = async () => {
    if (!id || !user) return;

    try {
      const { data: meetingData, error: meetingError } = await supabase
        .from('meetings')
        .select('*')
        .eq('id', id)
        .single();

      if (meetingError) throw meetingError;
      
      setMeeting({
        ...meetingData,
        status: meetingData.status as 'aberta' | 'fechada'
      });
      setIsModerator(meetingData.moderator_id === user?.id);

      // Fetch agenda items
      const { data: agendaData, error: agendaError } = await supabase
        .from('agenda_items')
        .select('*')
        .eq('meeting_id', id)
        .order('order_index');

      if (!agendaError) {
        setAgendaItems(agendaData || []);
      }
    } catch (err) {
      console.error('Error fetching meeting:', err);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar reunião.',
        variant: 'destructive',
      });
      navigate('/reunioes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchMeeting();
    }
  }, [id, user, authLoading]);

  const handleProcessMeeting = async () => {
    if (!meeting || !id) return;

    const confirmed = window.confirm(
      'A IA irá organizar o registro e gerar a ata e mensagem de WhatsApp automaticamente.\n\nDeseja continuar?'
    );

    if (!confirmed) return;

    setProcessing(true);
    setProcessingStep('saving');

    try {
      // Step 1: Mark as revealed (for backward compatibility)
      setProcessingStep('analyzing');
      
      const { error: meetingError } = await supabase
        .from('meetings')
        .update({ contributions_revealed: true })
        .eq('id', id);

      if (meetingError) throw meetingError;

      // Step 2: Call auto-process function
      setProcessingStep('generating');
      
      const { error: processError } = await supabase.functions.invoke('auto-process-meeting', {
        body: { meetingId: id },
      });

      setProcessingStep('whatsapp');

      if (processError) {
        console.error('Auto-process error:', processError);
        toast({
          title: 'Erro',
          description: 'Houve um erro no processamento automático.',
          variant: 'destructive',
        });
        setProcessing(false);
        setProcessingStep('');
        return;
      }

      setProcessingStep('done');

      // Wait a moment to show "done" step
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast({
        title: 'Sucesso',
        description: 'Reunião processada! Ata e mensagem WhatsApp geradas.',
      });

      // Refresh data and go to resumo tab
      await fetchMeeting();
      setActiveTab('resumo');
    } catch (err) {
      console.error('Error processing meeting:', err);
      toast({
        title: 'Erro',
        description: 'Erro ao processar reunião.',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
      setProcessingStep('');
    }
  };

  const handleReopenMeeting = async () => {
    if (!meeting || !id) return;

    const confirmed = window.confirm(
      'Deseja reabrir esta reunião?\n\nA ata será preservada, mas a reunião voltará ao status aberta.'
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('meetings')
        .update({ 
          status: 'aberta',
          contributions_revealed: false,
          ai_organized: false,
        })
        .eq('id', id);

      if (error) throw error;

      setMeeting({ 
        ...meeting, 
        status: 'aberta',
        contributions_revealed: false,
        ai_organized: false,
      });
      setActiveTab('registro');
      
      toast({
        title: 'Sucesso',
        description: 'Reunião reaberta com sucesso!',
      });
    } catch (err) {
      console.error('Error reopening meeting:', err);
      toast({
        title: 'Erro',
        description: 'Erro ao reabrir reunião.',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateMinutes = async (newMinutes: string) => {
    if (!meeting || !id) return;

    try {
      const { error } = await supabase
        .from('meetings')
        .update({ final_minutes: newMinutes })
        .eq('id', id);

      if (error) throw error;

      setMeeting({ ...meeting, final_minutes: newMinutes });
      
      toast({
        title: 'Sucesso',
        description: 'Ata atualizada com sucesso!',
      });
    } catch (err) {
      console.error('Error updating minutes:', err);
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar ata.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteMinutes = async () => {
    if (!meeting || !id) return;

    const confirmed = window.confirm(
      'ATENÇÃO: Deseja excluir a ata e reprocessar a reunião?\n\nEsta ação não pode ser desfeita.'
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('meetings')
        .update({ 
          final_minutes: null, 
          whatsapp_message: null,
          status: 'aberta',
          contributions_revealed: false,
          ai_organized: false,
        })
        .eq('id', id);

      if (error) throw error;

      setMeeting({ 
        ...meeting, 
        final_minutes: null, 
        whatsapp_message: null,
        status: 'aberta',
        contributions_revealed: false,
        ai_organized: false,
      });
      setActiveTab('registro');
      
      toast({
        title: 'Sucesso',
        description: 'Ata excluída. Reunião reaberta para edição.',
      });
    } catch (err) {
      console.error('Error deleting minutes:', err);
      toast({
        title: 'Erro',
        description: 'Erro ao excluir ata.',
        variant: 'destructive',
      });
    }
  };

  const handleNotesChange = (notes: string) => {
    if (meeting) {
      setMeeting({ ...meeting, meeting_notes: notes });
    }
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
          <Button variant="outline" onClick={() => navigate('/reunioes')} className="mt-4">
            Voltar para Reuniões
          </Button>
        </div>
      </AppLayout>
    );
  }

  const isClosed = meeting.status === 'fechada';
  const isProcessed = meeting.contributions_revealed && meeting.ai_organized;
  const canManage = isModerator || isManagement;

  return (
    <AppLayout>
      <PageHeader
        title={meeting.title}
        description={`${new Date(meeting.date).toLocaleDateString('pt-BR', {
          weekday: 'long',
          day: '2-digit',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}`}
        action={
          <div className="flex items-center gap-2">
            <Badge variant={isClosed ? 'secondary' : 'default'} className={!isClosed ? 'bg-success' : ''}>
              {isClosed ? '⚪ Fechada' : isProcessed ? '🔵 Processada' : '🟢 Aberta'}
            </Badge>
            <Button variant="outline" onClick={() => navigate('/reunioes')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </div>
        }
      />

      {isClosed && (
        <Alert className="mb-6 border-muted">
          <Lock className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Reunião encerrada. Conteúdo somente para consulta.</span>
            {canManage && (
              <div className="flex gap-2 ml-4">
                <Button variant="outline" size="sm" onClick={handleReopenMeeting}>
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Reabrir
                </Button>
                {meeting.final_minutes && (
                  <Button variant="outline" size="sm" className="text-destructive" onClick={handleDeleteMinutes}>
                    <Trash2 className="h-3 w-3 mr-1" />
                    Excluir Ata
                  </Button>
                )}
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="registro">1. Registro</TabsTrigger>
          <TabsTrigger value="resumo">2. Resumo IA</TabsTrigger>
          <TabsTrigger value="ata">3. Ata</TabsTrigger>
          <TabsTrigger value="whatsapp">4. WhatsApp</TabsTrigger>
          <TabsTrigger value="pauta">Pauta</TabsTrigger>
        </TabsList>

        <TabsContent value="registro">
          <RegistroReuniaoEditor
            meetingId={meeting.id}
            meetingNotes={meeting.meeting_notes}
            isProcessed={isProcessed}
            canManage={canManage}
            isProcessing={processing}
            processingStep={processingStep}
            onProcess={handleProcessMeeting}
            onNotesChange={handleNotesChange}
          />
        </TabsContent>

        <TabsContent value="resumo">
          <ResumoIATab
            meetingId={meeting.id}
            isProcessed={isProcessed}
          />
        </TabsContent>

        <TabsContent value="ata">
          {isProcessed && meeting.final_minutes ? (
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
          )}
        </TabsContent>

        <TabsContent value="whatsapp">
          {isProcessed ? (
            <ComunicacaoTab
              meetingId={meeting.id}
              canManage={canManage}
              whatsappMessage={meeting.whatsapp_message}
              hasFinalMinutes={!!meeting.final_minutes}
              onRegenerate={fetchMeeting}
            />
          ) : (
            <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed">
              <p className="text-muted-foreground">
                Ainda não processado. Escreva o registro e clique em "Processar Reunião".
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="pauta">
          <PautaEditor
            meetingId={meeting.id}
            agendaItems={agendaItems}
            onUpdate={fetchMeeting}
            disabled={isClosed}
            canManage={canManage}
          />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
