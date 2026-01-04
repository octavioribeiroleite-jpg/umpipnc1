import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Loader2, AlertTriangle, Lock, RotateCcw, Edit, Trash2 } from 'lucide-react';
import { PautaEditor } from '@/components/reunioes/PautaEditor';
import { ContribuicoesSection } from '@/components/reunioes/ContribuicoesSection';
import { IASection } from '@/components/reunioes/IASection';
import { AtaViewer } from '@/components/reunioes/AtaViewer';

interface Meeting {
  id: string;
  title: string;
  date: string;
  status: 'aberta' | 'fechada';
  moderator_id: string;
  contributions_revealed: boolean;
  ai_organized: boolean;
  final_minutes: string | null;
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
  const { user, isManagement } = useAuth();
  
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModerator, setIsModerator] = useState(false);
  const [activeTab, setActiveTab] = useState('pauta');

  const fetchMeeting = async () => {
    if (!id) return;

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
    fetchMeeting();
  }, [id, user]);

  const handleRevealContributions = async () => {
    if (!meeting || !id) return;

    const confirmed = window.confirm(
      'ATENÇÃO: Esta ação é IRREVERSÍVEL!\n\nApós revelar, todas as contribuições ficarão visíveis para todos os participantes.\n\nDeseja continuar?'
    );

    if (!confirmed) return;

    try {
      // Update meeting
      const { error: meetingError } = await supabase
        .from('meetings')
        .update({ contributions_revealed: true })
        .eq('id', id);

      if (meetingError) throw meetingError;

      // Update all contributions to revealed
      const { error: contribError } = await supabase
        .from('contributions')
        .update({ status: 'revealed' })
        .eq('meeting_id', id)
        .eq('status', 'final');

      if (contribError) throw contribError;

      setMeeting({ ...meeting, contributions_revealed: true });
      
      toast({
        title: 'Sucesso',
        description: 'Contribuições reveladas com sucesso!',
      });
    } catch (err) {
      console.error('Error revealing contributions:', err);
      toast({
        title: 'Erro',
        description: 'Erro ao revelar contribuições.',
        variant: 'destructive',
      });
    }
  };

  const handleCloseMeeting = async (finalMinutes: string) => {
    if (!meeting || !id) return;

    try {
      const { error } = await supabase
        .from('meetings')
        .update({ 
          status: 'fechada',
          final_minutes: finalMinutes 
        })
        .eq('id', id);

      if (error) throw error;

      setMeeting({ ...meeting, status: 'fechada', final_minutes: finalMinutes });
      
      toast({
        title: 'Sucesso',
        description: 'Reunião encerrada e ata gerada com sucesso!',
      });
    } catch (err) {
      console.error('Error closing meeting:', err);
      toast({
        title: 'Erro',
        description: 'Erro ao encerrar reunião.',
        variant: 'destructive',
      });
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
        .update({ status: 'aberta' })
        .eq('id', id);

      if (error) throw error;

      setMeeting({ ...meeting, status: 'aberta' });
      
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
      'ATENÇÃO: Deseja excluir a ata desta reunião?\n\nEsta ação não pode ser desfeita.'
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('meetings')
        .update({ final_minutes: null, status: 'aberta' })
        .eq('id', id);

      if (error) throw error;

      setMeeting({ ...meeting, final_minutes: null, status: 'aberta' });
      
      toast({
        title: 'Sucesso',
        description: 'Ata excluída. Reunião reaberta.',
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

  if (loading) {
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
              {isClosed ? '⚪ Fechada' : '🟢 Aberta'}
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

      {isClosed ? (
        <AtaViewer 
          meeting={meeting} 
          agendaItems={agendaItems}
          canManage={canManage}
          onUpdateMinutes={handleUpdateMinutes}
        />
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="pauta">Pauta</TabsTrigger>
            <TabsTrigger value="contribuicoes">Contribuições</TabsTrigger>
            {meeting.contributions_revealed && (
              <TabsTrigger value="ia">Organização IA</TabsTrigger>
            )}
            <TabsTrigger value="ata">Gerar Ata</TabsTrigger>
          </TabsList>

          <TabsContent value="pauta">
            <PautaEditor
              meetingId={meeting.id}
              agendaItems={agendaItems}
              onUpdate={fetchMeeting}
              disabled={isClosed}
              canManage={canManage}
            />
          </TabsContent>

          <TabsContent value="contribuicoes">
            <ContribuicoesSection
              meetingId={meeting.id}
              agendaItems={agendaItems}
              contributionsRevealed={meeting.contributions_revealed}
              isModerator={isModerator}
              onReveal={handleRevealContributions}
            />
          </TabsContent>

          {meeting.contributions_revealed && (
            <TabsContent value="ia">
              <IASection
                meetingId={meeting.id}
                canManage={canManage}
                aiOrganized={meeting.ai_organized}
                onUpdate={fetchMeeting}
              />
            </TabsContent>
          )}

          <TabsContent value="ata">
            <Card>
              <CardHeader>
                <CardTitle>Gerar Ata Final</CardTitle>
                <CardDescription>
                  Compile a ata da reunião com base nas contribuições e decisões.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!meeting.contributions_revealed && (
                  <Alert className="mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      As contribuições precisam ser reveladas antes de gerar a ata.
                    </AlertDescription>
                  </Alert>
                )}
                <AtaViewer 
                  meeting={meeting} 
                  agendaItems={agendaItems}
                  editable={canManage && meeting.contributions_revealed}
                  onClose={handleCloseMeeting}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </AppLayout>
  );
}
