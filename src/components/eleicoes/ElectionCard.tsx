import { AppCard } from '@/components/ui/app-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, Vote, Users, Shirt, MoreHorizontal, ArrowRight } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface ElectionCardProps {
  election: {
    id: string;
    name: string;
    position: string;
    status: string;
    total_present: number;
    vote_count?: number;
    created_at: string;
    type?: string;
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
  const isCamisa = election.type === 'camisa';

  return (
    <AppCard noPadding className="flex min-h-[160px] flex-col">
      <div className="flex flex-1 items-start justify-between gap-3 p-[16px] min-[700px]:p-[20px]">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {isCamisa && <Shirt className="h-4 w-4 text-primary shrink-0" />}
            <h3 className="text-[1.125rem] leading-snug font-semibold text-foreground min-w-0 whitespace-normal [overflow-wrap:anywhere]">{election.name}</h3>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-base text-muted-foreground">
            <span>{isCamisa ? election.position : `Cargo: ${election.position}`}</span>
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="min-h-[48px] min-w-[48px] shrink-0" aria-label={`Opções de ${election.name}`}>
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="min-h-[48px] text-destructive" onSelect={() => onDelete(election.id)}>
              <Trash2 className="mr-2 h-4 w-4" /> Excluir eleição
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="border-t border-border p-[16px] pt-3 min-[700px]:px-[20px]">
        <Button variant="outline" className="min-h-[48px] w-full justify-between" onClick={onClick} aria-label={`Abrir ${election.name}`}>
          Abrir processo <ArrowRight className="h-4 w-4 shrink-0" />
        </Button>
      </div>
    </AppCard>
  );
}
