import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ChevronRight } from 'lucide-react';

interface Society {
  id: string;
  name: string;
  slug: string;
  color: string;
}

interface SocietyStats {
  membersActive: number;
  tasksDone: number;
  tasksPending: number;
  saldo: number;
  lastMeetingDate?: string;
}

export function SocietyOverviewCard({ society, stats }: { society: Society; stats: SocietyStats }) {
  const navigate = useNavigate();
  const totalTasks = stats.tasksDone + stats.tasksPending;
  const progress = totalTasks > 0 ? (stats.tasksDone / totalTasks) * 100 : 0;

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => navigate(`/pastor/sociedade/${society.slug}`)}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: society.color }}>
              {society.name.substring(0, 3)}
            </div>
            <div>
              <p className="font-semibold text-sm">{society.name}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                <span>{stats.membersActive} membros</span>
                <span>{stats.tasksPending} pendentes</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-bold ${stats.saldo >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
              R$ {stats.saldo.toFixed(0)}
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
        {totalTasks > 0 && (
          <div className="flex items-center gap-2">
            <Progress value={progress} className="h-1.5 flex-1" />
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">{stats.tasksDone}/{totalTasks}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
