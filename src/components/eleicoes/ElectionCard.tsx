import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, Vote, Users } from 'lucide-react';

interface ElectionCardProps {
  election: {
    id: string;
    name: string;
    position: string;
    status: string;
    total_present: number;
    vote_count?: number;
    created_at: string;
  };
  onClick: () => void;
  onDelete: (id: string) => void;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Rascunho', variant: 'secondary' },
  open: { label: 'Em Votação', variant: 'default' },
  finished: { label: 'Finalizada', variant: 'outline' },
};

export function ElectionCard({ election, onClick, onDelete }: ElectionCardProps) {
  const status = statusConfig[election.status] || statusConfig.draft;

  return (
    <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={onClick}>
      <CardContent className="flex items-center justify-between p-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold truncate">{election.name}</h3>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>Cargo: {election.position}</span>
            {election.total_present > 0 && (
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {election.total_present} presentes
              </span>
            )}
            {(election.vote_count ?? 0) > 0 && (
              <span className="flex items-center gap-1">
                <Vote className="h-3.5 w-3.5" />
                {election.vote_count} votos
              </span>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive shrink-0"
          onClick={(e) => { e.stopPropagation(); onDelete(election.id); }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
