import { isAfter, isPast, isToday, startOfMonth } from 'date-fns';
import { AlertTriangle, CalendarClock, CheckCircle2, ListTodo } from 'lucide-react';
import type { TaskWithAssignee } from '@/hooks/useTasks';
import { SummaryCard, type SummaryTone } from '@/components/ui/summary-card';

interface TaskStatsProps {
  tasks: TaskWithAssignee[];
}

export function TaskStats({ tasks }: TaskStatsProps) {
  const total = tasks.length;
  const overdue = tasks.filter(
    (task) => task.due_date
      && task.status !== 'done'
      && isPast(new Date(task.due_date))
      && !isToday(new Date(task.due_date)),
  ).length;
  const dueToday = tasks.filter(
    (task) => task.due_date
      && task.status !== 'done'
      && isToday(new Date(task.due_date)),
  ).length;
  const monthStart = startOfMonth(new Date());
  const doneThisMonth = tasks.filter(
    (task) => task.status === 'done' && isAfter(new Date(task.updated_at), monthStart),
  ).length;

  const stats: Array<{
    label: string;
    value: number;
    icon: typeof ListTodo;
    tone: SummaryTone;
    meta: string;
  }> = [
    { label: 'Total', value: total, icon: ListTodo, tone: 'neutral', meta: 'tarefas registradas' },
    { label: 'Atrasadas', value: overdue, icon: AlertTriangle, tone: overdue > 0 ? 'negative' : 'neutral', meta: 'precisam de atenção' },
    { label: 'Hoje', value: dueToday, icon: CalendarClock, tone: dueToday > 0 ? 'warning' : 'neutral', meta: 'com vencimento hoje' },
    { label: 'Concluídas', value: doneThisMonth, icon: CheckCircle2, tone: 'positive', meta: 'neste mês' },
  ];

  return (
    <div className="mb-section-gap grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
      {stats.map((stat) => (
        <SummaryCard
          key={stat.label}
          label={stat.label}
          value={stat.value}
          meta={stat.meta}
          icon={stat.icon}
          tone={stat.tone}
          density="compact"
        />
      ))}
    </div>
  );
}
