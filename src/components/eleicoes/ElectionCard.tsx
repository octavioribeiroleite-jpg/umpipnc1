import { AppCard } from '@/components/ui/app-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, Vote, Users, Shirt, MoreHorizontal, ArrowRight, ClipboardList, CheckCheck } from 'lucide-react';
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
    current_round?: number;
    nominations_open?: boolean;
  };
  onClick: () => void;
  onDelete: (id: string) => void;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Em preparação', variant: 'secondary' },
  open: { label: 'Votação aberta', variant: 'default' },
  finished: { label: 'Concluída', variant: 'outline' },
};

export function ElectionCard({ election, onClick, onDelete }: ElectionCardProps) {
  const status = election.nominations_open ? { label: 'Novas indicações', variant: 'secondary' as const } : statusConfig[election.status] || statusConfig.draft;
  const isCamisa = election.type === 'camisa';
  const Icon = isCamisa ? Shirt : election.status === 'finished' ? CheckCheck : election.status === 'draft' || election.nominations_open ? ClipboardList : Vote;
  const hint = election.nominations_open ? 'Cadastre os indicados antes de reabrir os votos.' : election.status === 'draft' ? 'Prepare a chamada e as indicações.' : election.status === 'open' ? 'Acompanhe as cédulas e conduza a apuração.' : 'Consulte os eleitos e o relatório da votação.';

  return (
    <AppCard noPadding className="group flex h-full flex-col overflow-hidden rounded-2xl border-border shadow-none transition-shadow motion-reduce:transition-none hover:shadow-md">
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${election.status === 'open' && !election.nominations_open ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'}`}><Icon className="h-5 w-5" /></span>
        <div className="ml-auto flex items-center gap-1"><Badge variant={status.variant} className="max-w-full text-xs">{status.label}</Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="min-h-11 min-w-11 shrink-0 text-muted-foreground" aria-label={`Opções de ${election.name}`}><MoreHorizontal className="h-5 w-5" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end"><DropdownMenuItem className="min-h-12 text-destructive" onSelect={() => onDelete(election.id)}><Trash2 className="mr-2 h-4 w-4" />Excluir eleição</DropdownMenuItem></DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="flex flex-1 items-start gap-3 px-5 pb-4 pt-3">
        <div className="flex-1 min-w-0">
          <h3 className="mb-1 text-xl font-semibold leading-tight [overflow-wrap:anywhere]">{election.position}</h3>
          <p className="mb-4 text-sm text-muted-foreground [overflow-wrap:anywhere]">{election.name}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            {election.total_present >= 0 && (
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {election.total_present > 0 ? `${election.total_present} presentes` : 'Chamada pendente'}
              </span>
            )}
            {election.status !== 'draft' && (
              <span className="flex items-center gap-1">
                <Vote className="h-3.5 w-3.5" />
                {election.current_round || 1}º escrutínio
              </span>
            )}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{hint}</p>
        </div>
      </div>
      <div className="border-t border-border/70 bg-muted/20 px-4 py-3 sm:px-5">
        <Button variant={election.status === 'open' ? 'default' : 'outline'} className="min-h-11 w-full justify-between rounded-xl" onClick={onClick} aria-label={`Abrir ${election.name}`}>
          {election.nominations_open ? 'Cadastrar indicações' : election.status === 'draft' ? 'Continuar preparação' : election.status === 'open' ? 'Abrir mesa' : 'Resultado e relatório'} <ArrowRight className="h-4 w-4 shrink-0" />
        </Button>
      </div>
    </AppCard>
  );
}
