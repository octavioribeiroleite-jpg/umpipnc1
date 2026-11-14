import { useId, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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
  hasMinutes: boolean;
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
  hasMinutes,
  progress,
  onDelete,
  onFinalize,
  canManage = false,
}: ReuniaoCardProps) {
  const navigate = useNavigate();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const detailsId = useId();

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

  const isOpen = status === 'aberta';
  const canViewMinutes = !isOpen && hasMinutes;
  const meetingDate = new Date(date);
  const target = `/reunioes/${id}${canViewMinutes ? '?secao=ata' : ''}`;
  const actionLabel = canViewMinutes ? 'Ver ata' : 'Abrir reunião';

  return (
    <Card className="rounded-xl shadow-none" data-meeting-open={isOpen}>
      <CardContent className="meeting-list-row">
        <div className="meeting-list-row__heading">
          <time dateTime={date} aria-label={format(meetingDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })} className="text-sm font-medium text-muted-foreground">
            {format(meetingDate, "dd 'de' MMM", { locale: ptBR })}
          </time>
          <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold', isOpen ? 'meeting-tint' : 'bg-muted text-muted-foreground')}>
            {isOpen ? 'Aberta' : 'Finalizada'}
          </span>
        </div>
        <h3 className="meeting-list-row__title break-words text-sm font-semibold">
          <button type="button" className="w-full text-left hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded" onClick={() => navigate(target)}>
            {title}
          </button>
        </h3>
        <p className="meeting-list-row__meta flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <span>{format(meetingDate, 'HH:mm')}</span>
          <span aria-hidden="true">·</span>
          <span>{participantsCount} {participantsCount === 1 ? 'participante' : 'participantes'}</span>
        </p>
        <div className="meeting-list-row__actions">
          <Button variant="ghost" className="meeting-list-row__details px-2 text-muted-foreground" aria-expanded={detailsOpen} aria-controls={detailsId} onClick={() => setDetailsOpen(open => !open)}>
            {detailsOpen ? 'Menos detalhes' : 'Detalhes'}
          </Button>
          <Button variant="outline" className="px-3 text-primary" aria-label={`${actionLabel}: ${title}`} onClick={() => navigate(target)}>
            {canViewMinutes ? actionLabel : 'Abrir'}
          </Button>
          {((isOpen && canManage) || onDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="min-w-12 px-1.5 text-xs text-muted-foreground" aria-label={`Ações de ${title}`} disabled={isProcessing}>
                  {isProcessing ? 'Finalizando…' : 'Ações'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isOpen && canManage && <DropdownMenuItem className="min-h-10 gap-2" onSelect={() => void handleFinalize()}>
                  Finalizar reunião
                </DropdownMenuItem>}
                {onDelete && <DropdownMenuItem className="min-h-10 gap-2 text-destructive" onSelect={() => setDeleteOpen(true)}>
                  Excluir reunião
                </DropdownMenuItem>}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        {detailsOpen && <dl id={detailsId} className="meeting-list-row__progress text-sm">
          <div><dt>Moderador</dt><dd>{moderatorName}</dd></div>
          <div><dt>Pauta</dt><dd>{progress.pautaComplete ? 'Registrada' : 'Incompleta'}</dd></div>
          <div><dt>Contribuições</dt><dd>{progress.finalizedContributions}/{progress.totalContributions}{progress.contributionsRevealed && ' · Reveladas'}</dd></div>
          <div><dt>Resumo IA</dt><dd className={getAiStatusColor()}>{getAiStatusText()}</dd></div>
        </dl>}
        {onDelete && (
          <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir reunião?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. Todos os dados relacionados a esta reunião serão excluídos permanentemente, incluindo pauta, contribuições, sugestões da IA e tarefas.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  {isDeleting ? 'Excluindo...' : 'Excluir'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardContent>
    </Card>
  );
}
