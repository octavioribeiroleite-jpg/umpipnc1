import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Users, Eye, CheckCircle, Circle, Brain, Trash2, CalendarCheck, Loader2, MoreHorizontal, FileText, AlertTriangle, UserRound } from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

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

function StatusPill({
  icon: Icon,
  label,
  tone,
}: {
  icon: any;
  label: string;
  tone: 'success' | 'warning' | 'muted';
}) {
  const classes = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900',
    warning: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900',
    muted: 'bg-muted text-muted-foreground border-border',
  }[tone];

  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-semibold', classes)}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const meetingDate = new Date(date);

  const getAiStatusText = () => {
    switch (progress.aiStatus) {
      case 'not_generated':
        return 'IA pendente';
      case 'pending':
        return 'IA pendente';
      case 'validated':
        return 'IA validada';
    }
  };

  const getAiStatusTone = (): 'success' | 'warning' | 'muted' => {
    switch (progress.aiStatus) {
      case 'not_generated':
        return 'muted';
      case 'pending':
        return 'warning';
      case 'validated':
        return 'success';
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    
    setIsDeleting(true);
    const result = await onDelete(id);
    setIsDeleting(false);
    setDeleteDialogOpen(false);
    
    if (result.success) {
      toast.success('Reunião excluída com sucesso');
    } else {
      toast.error(result.error || 'Erro ao excluir reunião');
    }
  };

  const handleFinalize = async () => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('auto-process-meeting', {
        body: { meetingId: id },
      });

      if (error) throw error;

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
    <>
      <Card className={cn(
        'overflow-hidden rounded-2xl border bg-card/95 shadow-sm transition-shadow hover:shadow-md',
        status === 'fechada' ? 'border-l-4 border-l-emerald-600' : 'border-l-4 border-l-amber-500'
      )}>
        <CardContent className="p-4">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <h3 className="min-w-0 truncate text-lg font-bold leading-tight text-foreground">{title}</h3>
                  <Badge
                    variant="secondary"
                    className={cn(
                      'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                      status === 'fechada'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                        : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300'
                    )}
                  >
                    {status === 'aberta' ? 'Aberta' : 'Fechada'}
                  </Badge>
                </div>

                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      {meetingDate.toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <UserRound className="h-4 w-4" />
                      Moderador: {moderatorName}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    {participantsCount} participante{participantsCount === 1 ? '' : 's'}
                  </span>
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 rounded-xl">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => navigate(`/reunioes/${id}`)}>
                    <Eye className="mr-2 h-4 w-4" />
                    {status === 'aberta' ? 'Acessar reunião' : 'Ver ata'}
                  </DropdownMenuItem>
                  {status === 'aberta' && canManage && (
                    <DropdownMenuItem onClick={handleFinalize} disabled={isProcessing}>
                      <CalendarCheck className="mr-2 h-4 w-4" />
                      Finalizar reunião
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem onClick={() => setDeleteDialogOpen(true)} className="text-destructive focus:text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir reunião
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex flex-wrap gap-2">
              <StatusPill
                icon={progress.pautaComplete ? CheckCircle : AlertTriangle}
                label={progress.pautaComplete ? 'Pauta pronta' : 'Pauta incompleta'}
                tone={progress.pautaComplete ? 'success' : 'warning'}
              />
              <StatusPill
                icon={progress.contributionsRevealed ? CheckCircle : Users}
                label={`Contribuições ${progress.finalizedContributions}/${progress.totalContributions}${progress.contributionsRevealed ? ' reveladas' : ''}`}
                tone={progress.contributionsRevealed ? 'success' : 'muted'}
              />
              <StatusPill
                icon={Brain}
                label={getAiStatusText()}
                tone={getAiStatusTone()}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t pt-3">
              <Button
                variant="outline"
                size="sm"
                className="h-10 rounded-xl"
                onClick={() => navigate(`/reunioes/${id}`)}
              >
                <Eye className="mr-2 h-4 w-4" />
                {status === 'aberta' ? 'Acessar' : 'Ver ata'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-10 rounded-xl"
                onClick={() => navigate(`/reunioes/${id}`)}
              >
                <Users className="mr-2 h-4 w-4" />
                Participantes
              </Button>
              {status === 'aberta' && canManage && (
                <Button
                  size="sm"
                  className="h-10 rounded-xl"
                  onClick={handleFinalize}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="mr-2 h-4 w-4" />
                  )}
                  {isProcessing ? 'Processando...' : 'Finalizar'}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
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
    </>
  );
}
