import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, MoreVertical, Calendar, User } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FAB } from '@/components/ui/fab';
import { useIsMobile } from '@/hooks/use-mobile';

type TaskStatus = 'todo' | 'in_progress' | 'done';
type TaskPriority = 'low' | 'medium' | 'high';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date?: string;
  assignee?: string;
}

const mockTasks: Task[] = [
  {
    id: '1',
    title: 'Preparar pauta da reunião',
    status: 'todo',
    priority: 'high',
    due_date: '2024-01-14',
    assignee: 'João Silva',
  },
  {
    id: '2',
    title: 'Confirmar local do retiro',
    status: 'in_progress',
    priority: 'high',
    due_date: '2024-01-20',
    assignee: 'Maria Santos',
  },
  {
    id: '3',
    title: 'Enviar convites culto de jovens',
    status: 'todo',
    priority: 'medium',
    due_date: '2024-01-16',
  },
  {
    id: '4',
    title: 'Organizar louvor',
    status: 'in_progress',
    priority: 'low',
    assignee: 'Pedro Oliveira',
  },
  {
    id: '5',
    title: 'Comprar materiais',
    status: 'done',
    priority: 'medium',
    due_date: '2024-01-10',
    assignee: 'Ana Costa',
  },
];

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

const statusLabels: Record<TaskStatus, string> = {
  todo: 'A fazer',
  in_progress: 'Em andamento',
  done: 'Concluída',
};

function TaskCard({ task }: { task: Task }) {
  return (
    <Card className="mb-3 hover:shadow-md transition-shadow cursor-pointer">
      <CardContent className="p-3 md:p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm mb-2 truncate">{task.title}</h4>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={priorityColors[task.priority]} variant="secondary">
                {priorityLabels[task.priority]}
              </Badge>
              {task.due_date && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {new Date(task.due_date).toLocaleDateString('pt-BR')}
                </span>
              )}
            </div>
            {task.assignee && (
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                {task.assignee}
              </div>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Editar</DropdownMenuItem>
              <DropdownMenuItem>Mover para A fazer</DropdownMenuItem>
              <DropdownMenuItem>Mover para Em andamento</DropdownMenuItem>
              <DropdownMenuItem>Marcar como concluída</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">Excluir</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}

function KanbanColumn({
  title,
  status,
  tasks,
  count,
}: {
  title: string;
  status: TaskStatus;
  tasks: Task[];
  count: number;
}) {
  return (
    <div className="flex-1 min-w-[280px]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          {title}
          <Badge variant="secondary" className="rounded-full">
            {count}
          </Badge>
        </h3>
      </div>
      <div className="space-y-0">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
}

function MobileTaskList({ tasks, title }: { tasks: Task[]; title: string }) {
  if (tasks.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        Nenhuma tarefa {title.toLowerCase()}.
      </p>
    );
  }

  return (
    <div className="space-y-0">
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} />
      ))}
    </div>
  );
}

export default function Tarefas() {
  const isMobile = useIsMobile();
  const todoTasks = mockTasks.filter((t) => t.status === 'todo');
  const inProgressTasks = mockTasks.filter((t) => t.status === 'in_progress');
  const doneTasks = mockTasks.filter((t) => t.status === 'done');

  return (
    <AppLayout>
      <PageHeader
        title="Tarefas"
        description="Gerencie as tarefas da diretoria"
        action={
          !isMobile && (
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Tarefa
            </Button>
          )
        }
      />

      {/* Desktop: Kanban */}
      <div className="hidden md:flex gap-6 overflow-x-auto pb-4">
        <KanbanColumn title="A fazer" status="todo" tasks={todoTasks} count={todoTasks.length} />
        <KanbanColumn
          title="Em andamento"
          status="in_progress"
          tasks={inProgressTasks}
          count={inProgressTasks.length}
        />
        <KanbanColumn title="Concluída" status="done" tasks={doneTasks} count={doneTasks.length} />
      </div>

      {/* Mobile: Tabs */}
      <div className="md:hidden">
        <Tabs defaultValue="todo">
          <TabsList className="w-full grid grid-cols-3 mb-4">
            <TabsTrigger value="todo" className="text-xs">
              A fazer ({todoTasks.length})
            </TabsTrigger>
            <TabsTrigger value="in_progress" className="text-xs">
              Andamento ({inProgressTasks.length})
            </TabsTrigger>
            <TabsTrigger value="done" className="text-xs">
              Concluída ({doneTasks.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="todo" className="mt-0">
            <MobileTaskList tasks={todoTasks} title="A fazer" />
          </TabsContent>

          <TabsContent value="in_progress" className="mt-0">
            <MobileTaskList tasks={inProgressTasks} title="Em andamento" />
          </TabsContent>

          <TabsContent value="done" className="mt-0">
            <MobileTaskList tasks={doneTasks} title="Concluída" />
          </TabsContent>
        </Tabs>
      </div>

      {/* FAB para mobile */}
      <FAB aria-label="Nova tarefa" />
    </AppLayout>
  );
}
