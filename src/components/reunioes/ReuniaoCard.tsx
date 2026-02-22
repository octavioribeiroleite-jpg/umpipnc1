import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Users, Eye, CheckCircle, Circle, Brain, FileText, Trash2, CalendarCheck, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface MeetingProgress {
  pautaComplete: boolean;
  totalContributions: number;
  finalizedContributions: number;
  contributionsRevealed: boolean;
  aiStatus: 'not_generated' | 'pending' | 'validated';
}

interface ReuniaoCardProps {
  id: string;
  title: string;
  date: string;
  moderatorName: string;
  status: 'aberta' | 'fechada';
  participantsCount: number;
  progress: MeetingProgress;
  onDelete?: (id: string) => Promise<{ success: boolean; error?: string }>;
  onFinalize?: () => void;
  canManage?: boolean;
}

export function ReuniaoCard({
  id,
  title,
  date,
  moderatorName,
  status,
  participantsCount,
  progress,
  onDelete,
  onFinalize,
  canManage = false,
}: ReuniaoCardProps) {
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const getAiStatusText = () => {
    switch (progress.aiStatus) {
      case 'not_generated':
        return 'Não gerada';
      case 'pending':
        return 'Pendente';
      case 'validated':
        return 'Validada';
    }
  };

  const getAiStatusColor = () => {
    switch (progress.aiStatus) {
      case 'not_generated':
        return 'text-muted-foreground';
      case 'pending':
        return 'text-warning';
      case 'validated':
        return 'text-success';
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    
    setIsDeleting(true);
    const result = await onDelete(id);
    setIsDeleting(false);
    
    if (result.success) {
      toast.success('Reunião excluída com sucesso');
    } else {
      toast.error(result.error || 'Erro ao excluir reunião');
    }
  };

  const handleFinalize = async () => {
    setIsProcessing(true);
    try {
      // Call auto-process function
      const { data, error } = await supabase.functions.invoke('auto-process-meeting', {
        body: { meetingId: id },
      });

      if (error) throw error;

      // Close the meeting
      await supabase
        .from('meetings')
        .update({ status: 'fechada' })
        .eq('id', id);

      const eventsCreated = data?.eventsCreated || 0;
      toast.success(`Reunião finalizada! ${eventsCreated > 0 ? `${eventsCreated} evento(s) no calendário.` : ''}`);
      
      if (onFinalize) onFinalize();
    } catch (err) {
      console.error('Error finalizing meeting:', err);
      toast.error('Erro ao finalizar reunião');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-3 md:p-4">
        <div className="flex flex-col gap-3 md:gap-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 md:gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold">{title}</h3>
                <Badge
                  variant={status === 'aberta' ? 'default' : 'secondary'}
                  className={status === 'aberta' ? 'bg-success hover:bg-success/90' : ''}
                >
                  {status === 'aberta' ? '🟢 Aberta' : '⚪ Fechada'}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(date).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {participantsCount} participantes
                </span>
                <span>Moderador: {moderatorName}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/reunioes/${id}`)}
              >
                <Eye className="h-4 w-4 mr-2" />
                {status === 'aberta' ? 'Acessar' : 'Ver Ata'}
              </Button>
              
              {status === 'aberta' && canManage && (
                <Button
                  size="sm"
                  onClick={handleFinalize}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <CalendarCheck className="h-4 w-4 mr-2" />
                      Finalizar
                    </>
                  )}
                </Button>
              )}
              
              {onDelete && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir reunião?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação não pode ser desfeita. Todos os dados relacionados a esta reunião serão excluídos permanentemente, incluindo pauta, contribuições, sugestões da IA e tarefas.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {isDeleting ? 'Excluindo...' : 'Excluir'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>

          {/* Progress Indicators */}
          <div className="flex flex-wrap items-center gap-3 md:gap-4 text-xs border-t pt-2 md:pt-3">
            <span className="flex items-center gap-1">
              {progress.pautaComplete ? (
                <CheckCircle className="h-3.5 w-3.5 text-success" />
              ) : (
                <Circle className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              Pauta: {progress.pautaComplete ? '✔️' : 'incompleta'}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              Contribuições: {progress.finalizedContributions}/{progress.totalContributions}
              {progress.contributionsRevealed && ' | Reveladas ✔️'}
            </span>
            <span className={`flex items-center gap-1 ${getAiStatusColor()}`}>
              <Brain className="h-3.5 w-3.5" />
              IA: {getAiStatusText()}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
