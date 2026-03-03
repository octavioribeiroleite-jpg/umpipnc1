import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { ChevronRight, Users, DollarSign, ListTodo } from 'lucide-react';

interface Society {
  id: string;
  name: string;
  slug: string;
  color: string;
}

interface SocietyStats {
  membersActive: number;
  saldo: number;
  tasksPending: number;
}

interface Props {
  society: Society;
  stats?: SocietyStats;
}

export function SocietyOverviewCard({ society, stats }: Props) {
  const navigate = useNavigate();

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-all duration-200 bg-card/70 backdrop-blur-sm rounded-xl border-l-4 p-4"
      style={{ borderLeftColor: society.color }}
      onClick={() => navigate(`/pastor/sociedade/${society.slug}`)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
            style={{ backgroundColor: society.color }}
          >
            {society.name.substring(0, 3)}
          </div>
          <div>
            <p className="font-semibold text-sm">{society.name}</p>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      </div>

      {stats && (
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/50">
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{stats.membersActive}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
            <span className={`text-xs font-medium ${stats.saldo >= 0 ? 'text-primary' : 'text-destructive'}`}>
              R$ {stats.saldo.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
            </span>
          </div>
          {stats.tasksPending > 0 && (
            <div className="flex items-center gap-1.5">
              <ListTodo className="h-3.5 w-3.5 text-warning" />
              <span className="text-xs text-warning font-medium">{stats.tasksPending}</span>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
