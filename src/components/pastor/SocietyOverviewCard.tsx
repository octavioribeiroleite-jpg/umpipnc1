import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
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
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => navigate(`/pastor/sociedade/${society.slug}`)}
    >
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg flex items-center justify-center text-white font-bold text-xs" style={{ backgroundColor: society.color }}>
              {society.name.substring(0, 3)}
            </div>
            <p className="font-semibold text-sm">{society.name}</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
        {stats && (
          <div className="flex items-center gap-4 mt-2 ml-12 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {stats.membersActive} membros
            </span>
            <span className={`flex items-center gap-1 ${stats.saldo >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
              <DollarSign className="h-3 w-3" />
              R$ {stats.saldo.toFixed(2).replace('.', ',')}
            </span>
            {stats.tasksPending > 0 && (
              <span className="flex items-center gap-1 text-warning">
                <ListTodo className="h-3 w-3" />
                {stats.tasksPending} pendentes
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
