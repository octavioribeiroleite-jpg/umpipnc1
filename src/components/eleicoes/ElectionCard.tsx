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
  open: { label: 'Votação aberta', variant: 'default' },
  finished: { label: 'Finalizada', variant: 'outline' },
};

export function ElectionCard({ election, onClick, onDelete }: ElectionCardProps) {
  const status = statusConfig[election.status] || statusConfig.draft;
  const isCamisa = election.type === 'camisa';

  return (
    <AppCard noPadding className="group flex flex-col overflow-hidden transition-shadow hover:shadow-md">
      <div className="flex flex-1 items-start justify-between gap-3 p-4 sm:p-5">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {isCamisa && <Shirt className="h-4 w-4 text-primary shrink-0" />}
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{isCamisa ? 'Escolha de modelo' : 'Eleição de cargo'}</span>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
          <h3 className="mb-1 text-xl font-semibold leading-tight [overflow-wrap:anywhere]">{election.position}</h3>
          <p className="mb-4 text-sm text-muted-foreground [overflow-wrap:anywhere]">{election.name}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            {election.total_present >= 0 && (
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {election.total_present} presentes
              </span>
            )}
            {election.status !== 'draft' && (
              <span className="flex items-center gap-1">
                <Vote className="h-3.5 w-3.5" />
                {election.vote_count ?? 0} votos
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
      <div className="border-t border-border/70 bg-muted/20 px-4 py-3 sm:px-5">
        <Button variant={election.status === 'open' ? 'default' : 'ghost'} className="min-h-[48px] w-full justify-between" onClick={onClick} aria-label={`Abrir ${election.name}`}>
          {election.status === 'draft' ? 'Preparar votação' : election.status === 'open' ? 'Acompanhar votação' : 'Ver resultado'} <ArrowRight className="h-4 w-4 shrink-0" />
        </Button>
      </div>
    </AppCard>
  );
}
