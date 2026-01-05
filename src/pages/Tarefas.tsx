import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, ListTodo } from 'lucide-react';
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

type TaskStatus = 'todo' | 'in_progress' | 'done';

function KanbanColumn({
  title,
  tasks,
  count,
  onEdit,
  onDelete,
}: {
  title: string;
  tasks: TaskWithAssignee[];
  count: number;
  onEdit: (task: TaskWithAssignee) => void;
  onDelete: (task: TaskWithAssignee) => void;
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
          <TaskCard 
            key={task.id} 
            task={task} 
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
        {tasks.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-8">
            Nenhuma tarefa
          </p>
        )}
      </div>
    </div>
  );
}

function MobileTaskList({ 
  tasks, 
  title,
  onEdit,
  onDelete,
}: { 
  tasks: TaskWithAssignee[]; 
  title: string;
  onEdit: (task: TaskWithAssignee) => void;
  onDelete: (task: TaskWithAssignee) => void;
}) {
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
        <TaskCard 
          key={task.id} 
          task={task} 
          onEdit={onEdit}
          onDelete={onDelete}
        />
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

  const todoTasks = tasks.filter((t) => t.status === 'todo');
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress');
  const doneTasks = tasks.filter((t) => t.status === 'done');

  const handleCreateClick = () => {
    setSelectedTask(null);
    setDialogOpen(true);
  };

  const handleEdit = (task: TaskWithAssignee) => {
    setSelectedTask(task);
    setDialogOpen(true);
  };

  const handleDelete = (task: TaskWithAssignee) => {
    setSelectedTask(task);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = (data: CreateTaskInput | UpdateTaskInput) => {
    if ('id' in data) {
      updateTask.mutate(data, {
        onSuccess: () => setDialogOpen(false),
      });
    } else {
      createTask.mutate(data, {
        onSuccess: () => setDialogOpen(false),
      });
    }
  };

  const handleConfirmDelete = () => {
    if (selectedTask) {
      deleteTask.mutate(selectedTask.id, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setSelectedTask(null);
        },
      });
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <PageHeader
          title="Tarefas"
          description="Gerencie as tarefas da diretoria"
        />
        <div className="hidden md:flex gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex-1 min-w-[280px]">
              <Skeleton className="h-6 w-32 mb-4" />
              <LoadingSkeleton />
            </div>
          ))}
        </div>
        <div className="md:hidden">
          <LoadingSkeleton />
        </div>
      </AppLayout>
    );
  }

  if (tasks.length === 0) {
    return (
      <AppLayout>
        <PageHeader
          title="Tarefas"
          description="Gerencie as tarefas da diretoria"
        />
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

      {/* Desktop: Kanban */}
      <div className="hidden md:flex gap-6 overflow-x-auto pb-4">
        <KanbanColumn 
          title="A fazer" 
          tasks={todoTasks} 
          count={todoTasks.length}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
        <KanbanColumn
          title="Em andamento"
          tasks={inProgressTasks}
          count={inProgressTasks.length}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
        <KanbanColumn 
          title="Concluída" 
          tasks={doneTasks} 
          count={doneTasks.length}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
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
            <MobileTaskList 
              tasks={todoTasks} 
              title="A fazer"
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </TabsContent>

          <TabsContent value="in_progress" className="mt-0">
            <MobileTaskList 
              tasks={inProgressTasks} 
              title="Em andamento"
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </TabsContent>

          <TabsContent value="done" className="mt-0">
            <MobileTaskList 
              tasks={doneTasks} 
              title="Concluída"
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* FAB para mobile */}
      {isManagement && (
        <FAB aria-label="Nova tarefa" onClick={handleCreateClick} />
      )}

      {/* Dialogs */}
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
