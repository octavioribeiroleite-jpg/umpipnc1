import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { ChevronRight } from 'lucide-react';

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
      className="cursor-pointer hover:shadow-md transition-shadow p-2.5 flex items-center gap-2"
      onClick={() => navigate(`/pastor/sociedade/${society.slug}`)}
    >
      <div
        className="h-8 w-8 rounded-md flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0"
        style={{ backgroundColor: society.color }}
      >
        {society.name.substring(0, 3)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-xs truncate">{society.name}</p>
        {stats && (
          <p className="text-[10px] text-muted-foreground">{stats.membersActive} membros</p>
        )}
      </div>
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
    </Card>
  );
}
