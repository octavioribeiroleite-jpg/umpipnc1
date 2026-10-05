import { QueryErrorState } from '@/components/ui/query-error-state';
import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
    <div className="min-w-0">
      <div className={`rounded-xl ${config.bg} p-[12px] md:p-[16px] min-h-[200px]`}>
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

  const { data: tasks = [], isLoading, isError, isFetching, refetch } = useTasks();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskWithAssignee | null>(null);

  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus>('todo');
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
      <AppLayout width="wide">
        <PageHeader title="Tarefas" description="Gerencie as tarefas da diretoria" eyebrow="Organização" icon={<ListTodo />} />
        <div className="hidden md:grid grid-cols-1 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="min-w-0">
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
      <AppLayout width="wide">
        <PageHeader title="Tarefas" description="Gerencie as tarefas da diretoria" eyebrow="Organização" icon={<ListTodo />} />
        {isError ? <QueryErrorState message="Não foi possível carregar as tarefas." onRetry={() => void refetch()} retrying={isFetching} /> : <EmptyState onCreateClick={handleCreateClick} />}
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
    <AppLayout width="wide">
      <PageHeader
        title="Tarefas"
        eyebrow="Organização"
        icon={<ListTodo />}
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

      {isError && <QueryErrorState message="Não foi possível atualizar as tarefas." onRetry={() => void refetch()} retrying={isFetching} hasPreviousData />}
      <TaskStats tasks={tasks} />
      <TaskFilters search={search} onSearchChange={setSearch} priority={priorityFilter} onPriorityChange={setPriorityFilter} />

      <div className="mb-4 min-[1200px]:hidden">
        <label htmlFor="task-status" className="mb-2 block font-medium">Situação</label>
        <select id="task-status" value={selectedStatus} onChange={event => setSelectedStatus(event.target.value as TaskStatus)} className="min-h-12 w-full rounded-xl border border-input bg-card px-3 text-base">
          <option value="todo">A fazer ({todoTasks.length})</option>
          <option value="in_progress">Em andamento ({inProgressTasks.length})</option>
          <option value="done">Concluída ({doneTasks.length})</option>
        </select>
      </div>
      <div className="grid min-w-0 grid-cols-1 gap-5 pb-4 min-[1200px]:grid-cols-3">
        {([{status: 'todo', tasks: todoTasks}, {status: 'in_progress', tasks: inProgressTasks}, {status: 'done', tasks: doneTasks}] as {status: TaskStatus; tasks: TaskWithAssignee[]}[]).map(({status, tasks: columnTasks}) => <div key={status} className={status === selectedStatus ? 'min-w-0' : 'hidden min-w-0 min-[1200px]:block'}>
          <KanbanColumn status={status} tasks={columnTasks} onEdit={handleEdit} onDelete={handleDelete} />
        </div>)}
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
