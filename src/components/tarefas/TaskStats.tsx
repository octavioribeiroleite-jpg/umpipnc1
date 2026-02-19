import { TaskWithAssignee } from '@/hooks/useTasks';
import { isPast, isToday, startOfMonth, isAfter } from 'date-fns';
import { ListTodo, AlertTriangle, CalendarClock, CheckCircle2 } from 'lucide-react';

interface TaskStatsProps {
  tasks: TaskWithAssignee[];
}

export function TaskStats({ tasks }: TaskStatsProps) {
  const total = tasks.length;
  const overdue = tasks.filter(
    (t) => t.due_date && t.status !== 'done' && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date))
  ).length;
  const dueToday = tasks.filter(
    (t) => t.due_date && t.status !== 'done' && isToday(new Date(t.due_date))
  ).length;
  const monthStart = startOfMonth(new Date());
  const doneThisMonth = tasks.filter(
    (t) => t.status === 'done' && isAfter(new Date(t.updated_at), monthStart)
  ).length;

  const stats = [
    { label: 'Total', value: total, icon: ListTodo, color: 'text-primary' },
    { label: 'Atrasadas', value: overdue, icon: AlertTriangle, color: 'text-destructive' },
    { label: 'Hoje', value: dueToday, icon: CalendarClock, color: 'text-warning' },
    { label: 'Concluídas (mês)', value: doneThisMonth, icon: CheckCircle2, color: 'text-emerald-500' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="flex items-center gap-3 rounded-xl border bg-card p-3 md:p-4"
        >
          <div className={`${stat.color} shrink-0`}>
            <stat.icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xl md:text-2xl font-bold leading-none">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{stat.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
