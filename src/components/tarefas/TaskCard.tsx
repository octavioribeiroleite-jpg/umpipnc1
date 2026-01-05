import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Calendar, User, MoreVertical, Pencil, Trash2, ArrowRight, Check, AlertCircle } from 'lucide-react';
import { TaskWithAssignee, useUpdateTaskStatus } from '@/hooks/useTasks';
import { format, isPast, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

type TaskStatus = 'todo' | 'in_progress' | 'done';
type TaskPriority = 'low' | 'medium' | 'high';

const priorityColors: Record<TaskPriority, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-warning/20 text-warning',
  high: 'bg-destructive/20 text-destructive',
};

const priorityLabels: Record<TaskPriority, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
};

interface TaskCardProps {
  task: TaskWithAssignee;
  onEdit: (task: TaskWithAssignee) => void;
  onDelete: (task: TaskWithAssignee) => void;
}

export function TaskCard({ task, onEdit, onDelete }: TaskCardProps) {
  const updateStatus = useUpdateTaskStatus();

  const isOverdue = task.due_date && task.status !== 'done' && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date));
  const isDueToday = task.due_date && isToday(new Date(task.due_date));

  const handleStatusChange = (newStatus: TaskStatus) => {
    updateStatus.mutate({ id: task.id, status: newStatus });
  };

  return (
    <Card className={cn(
      "mb-3 hover:shadow-md transition-shadow",
      isOverdue && "border-destructive/50",
      task.status === 'done' && "opacity-70"
    )}>
      <CardContent className="p-3 md:p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 mb-2">
              <h4 className={cn(
                "font-medium text-sm truncate flex-1",
                task.status === 'done' && "line-through text-muted-foreground"
              )}>
                {task.title}
              </h4>
              {isOverdue && (
                <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge className={priorityColors[task.priority as TaskPriority]} variant="secondary">
                {priorityLabels[task.priority as TaskPriority]}
              </Badge>

              {task.due_date && (
                <span className={cn(
                  "flex items-center gap-1 text-xs",
                  isOverdue ? "text-destructive font-medium" : 
                  isDueToday ? "text-warning font-medium" : 
                  "text-muted-foreground"
                )}>
                  <Calendar className="h-3 w-3" />
                  {format(new Date(task.due_date), "dd/MM", { locale: ptBR })}
                </span>
              )}
            </div>

            {task.assignee && (
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                {task.assignee.full_name}
              </div>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
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
              
              {task.status !== 'done' && (
                <DropdownMenuItem onClick={() => handleStatusChange('done')}>
                  <Check className="h-4 w-4 mr-2" />
                  Marcar como concluída
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
      </CardContent>
    </Card>
  );
}
