import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Calendar, User, Pencil, Trash2, ArrowRight, AlertCircle, Check, Eye } from 'lucide-react';
import { TaskWithAssignee, useUpdateTaskStatus } from '@/hooks/useTasks';
import { format, isPast, isToday, isTomorrow, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

type TaskStatus = 'todo' | 'in_progress' | 'done';
type TaskPriority = 'low' | 'medium' | 'high';

const priorityBorderColor: Record<TaskPriority, string> = {
  low: 'border-l-emerald-400',
  medium: 'border-l-amber-400',
  high: 'border-l-red-400',
};

const priorityLabels: Record<TaskPriority, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
};

const priorityBadgeColors: Record<TaskPriority, string> = {
  low: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  medium: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  high: 'bg-red-500/10 text-red-600 border-red-500/20',
};

function smartDate(dateStr: string, isDone: boolean): { text: string; className: string } {
  const date = new Date(dateStr);
  if (isToday(date)) return { text: 'Hoje', className: isDone ? 'text-muted-foreground' : 'text-warning font-medium' };
  if (isTomorrow(date)) return { text: 'Amanhã', className: 'text-muted-foreground' };
  if (!isDone && isPast(date)) {
    const dist = formatDistanceToNow(date, { locale: ptBR });
    return { text: `Atrasada ${dist}`, className: 'text-destructive font-medium' };
  }
  return { text: format(date, "dd MMM", { locale: ptBR }), className: 'text-muted-foreground' };
}

interface TaskCardProps {
  task: TaskWithAssignee;
  onEdit: (task: TaskWithAssignee) => void;
  onDelete: (task: TaskWithAssignee) => void;
  variant?: 'full' | 'compact';
}

function TaskDetailPopup({
  task,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: {
  task: TaskWithAssignee;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (task: TaskWithAssignee) => void;
  onDelete: (task: TaskWithAssignee) => void;
}) {
  const updateStatus = useUpdateTaskStatus();
  const isDone = task.status === 'done';
  const isOverdue = task.due_date && !isDone && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date));
  const initials = task.assignee?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '';

  const handleStatusChange = (newStatus: TaskStatus) => {
    updateStatus.mutate({ id: task.id, status: newStatus });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {task.title}
            {isOverdue && <AlertCircle className="h-4 w-4 text-destructive" />}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Description */}
          {task.description && (
            <p className="text-sm text-muted-foreground">{task.description}</p>
          )}

          {/* Meta info */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={priorityBadgeColors[task.priority as TaskPriority]}>
              {priorityLabels[task.priority as TaskPriority]}
            </Badge>
            {task.due_date && (() => {
              const { text, className } = smartDate(task.due_date, isDone);
              return (
                <span className={cn('flex items-center gap-1 text-xs', className)}>
                  <Calendar className="h-3 w-3" />
                  {text}
                </span>
              );
            })()}
          </div>

          {task.assignee && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                {initials}
              </span>
              {task.assignee.full_name}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            {task.status !== 'done' && (
              <Button
                size="sm"
                variant="default"
                onClick={() => handleStatusChange('done')}
                disabled={updateStatus.isPending}
              >
                <Check className="h-4 w-4 mr-1" />
                Concluir
              </Button>
            )}
            {task.status === 'done' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatusChange('todo')}
                disabled={updateStatus.isPending}
              >
                <ArrowRight className="h-4 w-4 mr-1" />
                Reabrir
              </Button>
            )}
            {task.status !== 'in_progress' && task.status !== 'done' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatusChange('in_progress')}
                disabled={updateStatus.isPending}
              >
                <ArrowRight className="h-4 w-4 mr-1" />
                Em andamento
              </Button>
            )}
            {task.status === 'in_progress' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatusChange('todo')}
                disabled={updateStatus.isPending}
              >
                <ArrowRight className="h-4 w-4 mr-1" />
                A fazer
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => { onEdit(task); onOpenChange(false); }}
            >
              <Pencil className="h-4 w-4 mr-1" />
              Editar
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => { onDelete(task); onOpenChange(false); }}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Excluir
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function TaskCard({ task, onEdit, onDelete, variant = 'full' }: TaskCardProps) {
  const updateStatus = useUpdateTaskStatus();
  const [popupOpen, setPopupOpen] = useState(false);
  const isDone = task.status === 'done';
  const isOverdue = task.due_date && !isDone && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date));

  const handleToggleDone = () => {
    updateStatus.mutate({ id: task.id, status: isDone ? 'todo' : 'done' });
  };

  const handleStatusChange = (newStatus: TaskStatus) => {
    updateStatus.mutate({ id: task.id, status: newStatus });
  };

  const initials = task.assignee?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '';

  // ===================== COMPACT VARIANT =====================
  if (variant === 'compact') {
    return (
      <>
        <div
          onClick={() => setPopupOpen(true)}
          className={cn(
            'mb-2 rounded-lg border border-l-4 bg-card px-3 py-2 cursor-pointer transition-all hover:shadow-md',
            priorityBorderColor[task.priority as TaskPriority],
            isDone && 'opacity-60'
          )}
        >
          <div className="flex items-center gap-2">
            <h4 className={cn(
              'text-sm font-medium min-w-0 whitespace-normal break-words flex-1',
              isDone && 'line-through text-muted-foreground'
            )}>
              {task.title}
            </h4>
            {isOverdue && <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />}
            <Eye className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', priorityBadgeColors[task.priority as TaskPriority])}>
              {priorityLabels[task.priority as TaskPriority]}
            </Badge>
            {task.due_date && (() => {
              const { text, className } = smartDate(task.due_date, isDone);
              return <span className={cn('text-[10px]', className)}>{text}</span>;
            })()}
            {task.assignee && (
              <span className="ml-auto flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 text-primary text-[9px] font-semibold">
                {initials}
              </span>
            )}
          </div>
        </div>
        <TaskDetailPopup
          task={task}
          open={popupOpen}
          onOpenChange={setPopupOpen}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </>
    );
  }

  // ===================== FULL VARIANT (A fazer) =====================
  return (
    <div
      className={cn(
        'mb-3 rounded-xl border border-l-4 bg-card p-4 transition-all hover:shadow-md',
        priorityBorderColor[task.priority as TaskPriority],
        isOverdue && 'border-destructive/40',
        isDone && 'opacity-60'
      )}
    >
      {/* Header: checkbox + title */}
      <div className="flex items-start gap-3">
        <Checkbox
          checked={isDone}
          onCheckedChange={handleToggleDone}
          disabled={updateStatus.isPending}
          className="mt-0.5 h-5 w-5 shrink-0"
        />
        <div className="flex-1 min-w-0">
          <h4 className={cn(
            'font-medium text-sm leading-snug',
            isDone && 'line-through text-muted-foreground'
          )}>
            {task.title}
            {isOverdue && <AlertCircle className="inline ml-1.5 h-3.5 w-3.5 text-destructive" />}
          </h4>

          {/* Description */}
          {task.description && (
            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{task.description}</p>
          )}

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', priorityBadgeColors[task.priority as TaskPriority])}>
              {priorityLabels[task.priority as TaskPriority]}
            </Badge>
            {task.due_date && (() => {
              const { text, className } = smartDate(task.due_date, isDone);
              return (
                <span className={cn('flex items-center gap-1 text-xs', className)}>
                  <Calendar className="h-3 w-3" />
                  {text}
                </span>
              );
            })()}
            {task.assignee && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground ml-auto">
                <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
                  {initials}
                </span>
                <span className="hidden sm:inline">{task.assignee.full_name}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons - below content */}
      <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border/50 pl-8">
        {task.status !== 'done' && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs px-2"
            onClick={() => handleStatusChange('done')}
            disabled={updateStatus.isPending}
          >
            <Check className="h-3.5 w-3.5 mr-1" />
            Concluir
          </Button>
        )}
        {task.status === 'done' && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs px-2"
            onClick={() => handleStatusChange('todo')}
            disabled={updateStatus.isPending}
          >
            <ArrowRight className="h-3.5 w-3.5 mr-1" />
            Reabrir
          </Button>
        )}
        {task.status === 'todo' && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs px-2"
            onClick={() => handleStatusChange('in_progress')}
            disabled={updateStatus.isPending}
          >
            <ArrowRight className="h-3.5 w-3.5 mr-1" />
            Andamento
          </Button>
        )}
        {task.status === 'in_progress' && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs px-2"
            onClick={() => handleStatusChange('todo')}
            disabled={updateStatus.isPending}
          >
            <ArrowRight className="h-3.5 w-3.5 mr-1" />
            A fazer
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs px-2"
          onClick={() => onEdit(task)}
        >
          <Pencil className="h-3.5 w-3.5 mr-1" />
          Editar
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs px-2 text-destructive hover:text-destructive"
          onClick={() => onDelete(task)}
        >
          <Trash2 className="h-3.5 w-3.5 mr-1" />
          Excluir
        </Button>
      </div>
    </div>
  );
}
