import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronRight } from 'lucide-react';

interface Society {
  id: string;
  name: string;
  slug: string;
  color: string;
}

export function SocietyOverviewCard({ society }: { society: Society }) {
  const navigate = useNavigate();

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => navigate(`/pastor/sociedade/${society.slug}`)}
    >
      <CardContent className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg flex items-center justify-center text-white font-bold text-xs" style={{ backgroundColor: society.color }}>
            {society.name.substring(0, 3)}
          </div>
          <p className="font-semibold text-sm">{society.name}</p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </CardContent>
    </Card>
  );
}
