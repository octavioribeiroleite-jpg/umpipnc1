import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, ListTodo, CircleDot, Clock, CheckCircle2 } from 'lucide-react';
import { FAB } from '@/components/ui/fab';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';

import {
  useTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  TaskWithAssignee,
  CreateTaskInput,
  UpdateTaskInput,
} from '@/hooks/useTasks';
import { TaskCard } from '@/components/tarefas/TaskCard';
import { TaskDialog } from '@/components/tarefas/TaskDialog';
import { DeleteTaskDialog } from '@/components/tarefas/DeleteTaskDialog';
import { TaskStats } from '@/components/tarefas/TaskStats';
import { TaskFilters, PriorityFilter } from '@/components/tarefas/TaskFilters';

type TaskStatus = 'todo' | 'in_progress' | 'done';

const columnConfig: Record<TaskStatus, { title: string; icon: typeof CircleDot; bg: string; variant: 'full' | 'compact' }> = {
  todo: { title: 'A fazer', icon: CircleDot, bg: 'bg-muted/40', variant: 'full' },
  in_progress: { title: 'Em andamento', icon: Clock, bg: 'bg-blue-50/50 dark:bg-blue-950/20', variant: 'compact' },
  done: { title: 'Concluída', icon: CheckCircle2, bg: 'bg-emerald-50/50 dark:bg-emerald-950/20', variant: 'compact' },
};

function KanbanColumn({
  status,
  tasks,
  onEdit,
  onDelete,
}: {
  status: TaskStatus;
  tasks: TaskWithAssignee[];
  onEdit: (task: TaskWithAssignee) => void;
  onDelete: (task: TaskWithAssignee) => void;
}) {
  const config = columnConfig[status];
  const Icon = config.icon;

  return (
    <div className={status === 'todo' ? 'flex-[1.4] min-w-[320px]' : 'flex-1 min-w-[260px]'}>
      <div className={`rounded-xl ${config.bg} p-3 md:p-4 min-h-[200px]`}>
        <div className="flex items-center gap-2 mb-4">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">{config.title}</h3>
          <Badge variant="secondary" className="rounded-full ml-auto text-xs">
            {tasks.length}
          </Badge>
        </div>
        <div className="space-y-0">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={onEdit}
              onDelete={onDelete}
              variant={config.variant}
            />
          ))}
          {tasks.length === 0 && (
            <p className="text-center text-muted-foreground text-xs py-8">Nenhuma tarefa</p>
          )}
        </div>
      </div>
    </div>
  );
}

function MobileTaskList({
  tasks,
  title,
  onEdit,
  onDelete,
  variant,
}: {
  tasks: TaskWithAssignee[];
  title: string;
  onEdit: (task: TaskWithAssignee) => void;
  onDelete: (task: TaskWithAssignee) => void;
  variant: 'full' | 'compact';
}) {
  if (tasks.length === 0) {
    return <p className="text-center text-muted-foreground py-8">Nenhuma tarefa {title.toLowerCase()}.</p>;
  }
  return (
    <div className="space-y-0">
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} onEdit={onEdit} onDelete={onDelete} variant={variant} />
      ))}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-24 w-full rounded-lg" />
      ))}
    </div>
  );
}

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <ListTodo className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-lg mb-2">Nenhuma tarefa</h3>
      <p className="text-muted-foreground mb-4 max-w-sm">
        Comece criando sua primeira tarefa para organizar as atividades da diretoria.
      </p>
      <Button onClick={onCreateClick}>
        <Plus className="h-4 w-4 mr-2" />
        Criar tarefa
      </Button>
    </div>
  );
}

export default function Tarefas() {
  const isMobile = useIsMobile();
  const { isManagement } = useAuth();

  const { data: tasks = [], isLoading } = useTasks();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskWithAssignee | null>(null);

  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
      return true;
    });
  }, [tasks, search, priorityFilter]);

  const todoTasks = filteredTasks.filter((t) => t.status === 'todo');
  const inProgressTasks = filteredTasks.filter((t) => t.status === 'in_progress');
  const doneTasks = filteredTasks.filter((t) => t.status === 'done');

  const handleCreateClick = () => { setSelectedTask(null); setDialogOpen(true); };
  const handleEdit = (task: TaskWithAssignee) => { setSelectedTask(task); setDialogOpen(true); };
  const handleDelete = (task: TaskWithAssignee) => { setSelectedTask(task); setDeleteDialogOpen(true); };

  const handleSubmit = (data: CreateTaskInput | UpdateTaskInput) => {
    if ('id' in data) {
      updateTask.mutate(data, { onSuccess: () => setDialogOpen(false) });
    } else {
      createTask.mutate(data, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const handleConfirmDelete = () => {
    if (selectedTask) {
      deleteTask.mutate(selectedTask.id, {
        onSuccess: () => { setDeleteDialogOpen(false); setSelectedTask(null); },
      });
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <PageHeader title="Tarefas" description="Gerencie as tarefas da diretoria" />
        <div className="hidden md:flex gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex-1 min-w-[280px]">
              <Skeleton className="h-6 w-32 mb-4" />
              <LoadingSkeleton />
            </div>
          ))}
        </div>
        <div className="md:hidden"><LoadingSkeleton /></div>
      </AppLayout>
    );
  }

  if (tasks.length === 0) {
    return (
      <AppLayout>
        <PageHeader title="Tarefas" description="Gerencie as tarefas da diretoria" />
        <EmptyState onCreateClick={handleCreateClick} />
        <TaskDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          task={selectedTask}
          onSubmit={handleSubmit}
          isLoading={createTask.isPending || updateTask.isPending}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="Tarefas"
        description="Gerencie as tarefas da diretoria"
        action={
          !isMobile && isManagement && (
            <Button onClick={handleCreateClick}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Tarefa
            </Button>
          )
        }
      />

      <TaskStats tasks={tasks} />
      <TaskFilters search={search} onSearchChange={setSearch} priority={priorityFilter} onPriorityChange={setPriorityFilter} />

      {/* Desktop: Kanban */}
      <div className="hidden md:flex gap-4 overflow-x-auto pb-4">
        <KanbanColumn status="todo" tasks={todoTasks} onEdit={handleEdit} onDelete={handleDelete} />
        <KanbanColumn status="in_progress" tasks={inProgressTasks} onEdit={handleEdit} onDelete={handleDelete} />
        <KanbanColumn status="done" tasks={doneTasks} onEdit={handleEdit} onDelete={handleDelete} />
      </div>

      {/* Mobile: Tabs */}
      <div className="md:hidden">
        <Tabs defaultValue="todo">
          <TabsList className="w-full grid grid-cols-3 mb-4">
            <TabsTrigger value="todo" className="text-xs">A fazer ({todoTasks.length})</TabsTrigger>
            <TabsTrigger value="in_progress" className="text-xs">Andamento ({inProgressTasks.length})</TabsTrigger>
            <TabsTrigger value="done" className="text-xs">Concluída ({doneTasks.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="todo" className="mt-0">
            <MobileTaskList tasks={todoTasks} title="A fazer" onEdit={handleEdit} onDelete={handleDelete} variant="full" />
          </TabsContent>
          <TabsContent value="in_progress" className="mt-0">
            <MobileTaskList tasks={inProgressTasks} title="Em andamento" onEdit={handleEdit} onDelete={handleDelete} variant="compact" />
          </TabsContent>
          <TabsContent value="done" className="mt-0">
            <MobileTaskList tasks={doneTasks} title="Concluída" onEdit={handleEdit} onDelete={handleDelete} variant="compact" />
          </TabsContent>
        </Tabs>
      </div>

      {isManagement && <FAB aria-label="Nova tarefa" onClick={handleCreateClick} />}

      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        task={selectedTask}
        onSubmit={handleSubmit}
        isLoading={createTask.isPending || updateTask.isPending}
      />
      <DeleteTaskDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        task={selectedTask}
        onConfirm={handleConfirmDelete}
        isLoading={deleteTask.isPending}
      />
    </AppLayout>
  );
}
