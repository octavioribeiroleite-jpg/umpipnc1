import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Users, CircleCheck, ListChecks, Sparkles, FileText, Trash2, CalendarCheck, Loader2, Ellipsis } from 'lucide-react';
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
    <Card className={cn('rounded-2xl transition-shadow hover:shadow-sm', isOpen && 'border-l-[3px] border-l-primary')}>
      <CardContent className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-2 p-3.5 sm:gap-x-4 sm:p-4">
        <time dateTime={date} aria-label={format(meetingDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          className="meeting-tint grid min-h-14 min-w-12 place-content-center justify-items-center rounded-xl px-2 leading-none">
          <strong className="text-xl tabular-nums">{format(meetingDate, 'dd')}</strong>
          <span className="mt-1 text-[0.68rem] font-semibold uppercase">{format(meetingDate, 'MMM', { locale: ptBR }).replace('.', '')}</span>
        </time>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold', isOpen ? 'meeting-tint' : 'bg-muted text-muted-foreground')}>
              <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />{isOpen ? 'Aberta' : 'Finalizada'}
            </span>
          </div>
          <h3 className="mt-1 break-words text-base font-semibold leading-snug">{title}</h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground sm:text-sm">
            <span>{format(meetingDate, 'HH:mm')}</span>
            <span className="inline-flex items-center gap-1.5"><Users aria-hidden="true" className="size-3.5" />
              {participantsCount} {participantsCount === 1 ? 'participante' : 'participantes'}
            </span>
            <span className="min-w-0 break-words">Moderador: {moderatorName}</span>
          </div>
        </div>
        <div className="col-span-2 flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t pt-2.5">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              {progress.pautaComplete ? <CircleCheck aria-hidden="true" className="size-3.5 shrink-0 text-success" /> : <ListChecks aria-hidden="true" className="size-3.5 shrink-0" />}
              {progress.pautaComplete ? 'Pauta registrada' : 'Pauta incompleta'}
            </span>
            <span className="inline-flex flex-wrap items-center gap-x-1">
              <Users aria-hidden="true" className="size-3.5 shrink-0" /> Contribuições: {progress.finalizedContributions}/{progress.totalContributions}
              {progress.contributionsRevealed && ' · Reveladas'}
            </span>
            <span className={cn('inline-flex items-center gap-1', getAiStatusColor())}>
              <Sparkles aria-hidden="true" className="size-3.5 shrink-0" /> IA: {getAiStatusText()}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <Button variant="outline" className="min-h-11 gap-2 rounded-xl" aria-label={`${actionLabel}: ${title}`} onClick={() => navigate(target)}>
              {canViewMinutes && <FileText aria-hidden="true" className="size-4" />}
              {actionLabel}{!canViewMinutes && <ArrowRight aria-hidden="true" className="size-4" />}
            </Button>
            {((isOpen && canManage) || onDelete) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-11 rounded-xl" aria-label={`Ações de ${title}`} disabled={isProcessing}>
                    {isProcessing ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <Ellipsis aria-hidden="true" className="size-5" />}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isOpen && canManage && <DropdownMenuItem className="min-h-10 gap-2" onSelect={() => void handleFinalize()}>
                    <CalendarCheck aria-hidden="true" className="size-4" /> Finalizar reunião
                  </DropdownMenuItem>}
                  {onDelete && <DropdownMenuItem className="min-h-10 gap-2 text-destructive" onSelect={() => setDeleteOpen(true)}>
                    <Trash2 aria-hidden="true" className="size-4" /> Excluir reunião
                  </DropdownMenuItem>}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
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
