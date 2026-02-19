import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Calendar, User, MoreVertical, Pencil, Trash2, ArrowRight, AlertCircle } from 'lucide-react';
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
}

export function TaskCard({ task, onEdit, onDelete }: TaskCardProps) {
  const updateStatus = useUpdateTaskStatus();
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

  return (
    <div
      className={cn(
        'mb-3 rounded-xl border border-l-4 bg-card p-3 md:p-4 transition-all hover:shadow-md',
        priorityBorderColor[task.priority as TaskPriority],
        isOverdue && 'border-destructive/40',
        isDone && 'opacity-60'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <Checkbox
          checked={isDone}
          onCheckedChange={handleToggleDone}
          disabled={updateStatus.isPending}
          className="mt-0.5 h-5 w-5 shrink-0"
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4
              className={cn(
                'font-medium text-sm leading-snug',
                isDone && 'line-through text-muted-foreground'
              )}
            >
              {task.title}
              {isOverdue && <AlertCircle className="inline ml-1.5 h-3.5 w-3.5 text-destructive" />}
            </h4>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 -mt-0.5">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(task)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {task.status !== 'todo' && (
                  <DropdownMenuItem onClick={() => handleStatusChange('todo')}>
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Mover para A fazer
                  </DropdownMenuItem>
                )}
                {task.status !== 'in_progress' && (
                  <DropdownMenuItem onClick={() => handleStatusChange('in_progress')}>
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Mover para Em andamento
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete(task)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Description */}
          {task.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {task.description}
            </p>
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
    </div>
  );
}
