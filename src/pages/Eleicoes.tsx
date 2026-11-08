import { useSnapshotRead } from '@/hooks/useSnapshotRead';
import { QueryErrorState } from '@/components/ui/query-error-state';
import { useCallback, useId, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Vote, Loader2, Shirt, ListChecks, ArrowRight } from 'lucide-react';
import { FAB } from '@/components/ui/fab';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { createUmpSequence, UMP_POSITIONS, type ElectionSequence } from '@/lib/election-sequence';
import { saveNextElection } from '@/lib/next-election';
import { ElectionCard } from '@/components/eleicoes/ElectionCard';

interface Election {
  id: string;
  name: string;
  position: string;
  status: string;
  total_present: number;
  society_id: string | null;
  created_by: string;
  created_at: string;
  vote_count?: number;
  type?: string;
}

interface Society {
  id: string;
  name: string;
}

export default function Eleicoes() {
  const formId = useId();
  const [elections, setElections] = useState<Election[]>([]);
  const [societies, setSocieties] = useState<Society[]>([]);
  const [template, setTemplate] = useState<'single' | 'ump'>('single');
  const sequenceRef = useRef<ElectionSequence | null>(null);
  const creatingRef = useRef(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [societyId, setSocietyId] = useState<string>('');
  const [electionType, setElectionType] = useState<'cargo' | 'camisa'>('cargo');
  const [seatsCount, setSeatsCount] = useState('1');
  const [maxChoices, setMaxChoices] = useState('1');
  const [creating, setCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<'cargo' | 'camisa'>('cargo');
  const { toast } = useToast();
  const { user, isAdmin, isManagement, isPastor, rolesLoaded, profile } = useAuth();
  const churchWide = isAdmin || isPastor;
  const canAccess = !!user && (isManagement || isPastor);
  const ownSocietyId = profile?.society_id;
  const canCreate = canAccess && (churchWide || !!ownSocietyId);
  const { loading, hasSnapshot, error: readError, run: runRead } = useSnapshotRead(`${user?.id || 'anonymous'}:${churchWide ? 'all' : ownSocietyId || 'none'}`);
  const navigate = useNavigate();

  useEffect(() => {
    if (rolesLoaded && !canAccess) navigate('/');
  }, [rolesLoaded, canAccess, navigate]);

  useEffect(() => {
    if (electionType === 'cargo') {
      setMaxChoices(seatsCount);
    }
  }, [seatsCount, electionType]);

  const fetchElections = useCallback(() => runRead(async () => {
    if (!rolesLoaded || !canAccess || (!churchWide && !ownSocietyId)) {
      return () => { setElections([]); setSocieties([]); };
    }
    let electionQuery = supabase.from('elections').select('*').order('created_at', { ascending: false });
    let societyQuery = supabase.from('societies').select('id, name').eq('active', true);
    if (!churchWide) {
      electionQuery = electionQuery.eq('society_id', ownSocietyId!);
      societyQuery = societyQuery.eq('id', ownSocietyId!);
    }
    const [electionsResult, societiesResult] = await Promise.all([
      electionQuery,
      societyQuery,
    ]);
    if (electionsResult.error) throw electionsResult.error;
    if (societiesResult.error) throw societiesResult.error;
    const withCounts = await Promise.all((electionsResult.data || []).map(async election => {
      const { count, error } = await supabase.from('election_votes').select('*', { count: 'exact', head: true }).eq('election_id', election.id);
      if (error) throw error;
      return { ...election, vote_count: count || 0 };
    }));
    return () => {
      setElections(withCounts);
      setSocieties(societiesResult.data || []);
    };
  }), [runRead, rolesLoaded, canAccess, churchWide, ownSocietyId]);

  useEffect(() => { void fetchElections(); }, [fetchElections]);

  const handleCreate = async () => {
    if (!canCreate || creatingRef.current) return;
    if (!name.trim() || !position.trim()) {
      toast({ title: 'Preencha nome e cargo', variant: 'destructive' });
      return;
    }
    const seats = Number(seatsCount);
    if (electionType === 'cargo' && (!Number.isSafeInteger(seats) || seats < 1)) {
      toast({ title: 'Informe uma quantidade inteira de vagas, a partir de 1', variant: 'destructive' });
      return;
    }
    setCreating(true);
    const normalizedSocietyId = churchWide
      ? (societyId && societyId !== 'general' ? societyId : null)
      : ownSocietyId;
    const normalizedSeats = electionType === 'cargo' ? seats : 1;
    const normalizedChoices = electionType === 'cargo' ? normalizedSeats : 1;
    if (template === 'ump') {
      creatingRef.current = true;
      try {
        sequenceRef.current ??= createUmpSequence(user!.id, name, normalizedSocietyId || null);
        const sequence = sequenceRef.current;
        const id = await saveNextElection(supabase, { election: {
          id: sequence.electionIds[0], name: sequence.name, position: UMP_POSITIONS[0], society_id: sequence.societyId,
          created_by: user!.id, type: 'cargo', voting_mode: 'both', status: 'draft', current_round: 1,
          seats_count: 1, max_choices_per_ballot: 1, majority_rule: 'absolute_50', total_present: 0, show_result: false,
        }, attendance: [] });
        setDialogOpen(false);
        navigate(`/eleicoes/${id}`);
      } catch (cause) {
        toast({ title: 'Não foi possível criar o roteiro', description: cause instanceof Error ? cause.message : 'Tente novamente para continuar a mesma criação.', variant: 'destructive' });
      } finally { creatingRef.current = false; setCreating(false); }
      return;
    }
    const { error } = await supabase.from('elections' as any).insert({
      name: name.trim(),
      position: position.trim(),
      society_id: normalizedSocietyId,
      created_by: user!.id,
      type: electionType,
      seats_count: normalizedSeats,
      max_choices_per_ballot: normalizedChoices,
      majority_rule: electionType === 'cargo' ? 'absolute_50' : 'simple',
    } as any);

    if (error) {
      toast({ title: 'Erro ao criar eleição', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Eleição criada!' });
      setDialogOpen(false);
      setName(''); setPosition(''); setSocietyId(''); setElectionType('cargo'); setSeatsCount('1'); setMaxChoices('1');
      fetchElections();
    }
    setCreating(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('elections' as any).delete().eq('id', deleteId);
    if (error) {
      toast({ title: 'Erro ao excluir', variant: 'destructive' });
    } else {
      toast({ title: 'Eleição excluída' });
      fetchElections();
    }
    setDeleteId(null);
  };

  const filtered = elections.filter(e => (e.type || 'cargo') === activeTab);

  return (
    <AppLayout width="wide">
      <PageHeader
        title="Eleições"
        description="Prepare a chamada, conduza os votos e acompanhe os resultados."
        action={
          <Button disabled={!canCreate || !hasSnapshot || readError} onClick={() => setDialogOpen(true)} className="hidden min-h-12 rounded-xl md:inline-flex">
            <Plus className="h-4 w-4 mr-2" /> Nova votação
          </Button>
        }
      />

      <FAB disabled={!canCreate || !hasSnapshot || readError} aria-label="Nova eleição" onClick={() => setDialogOpen(true)} />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'cargo' | 'camisa')} className="mb-5">
        <TabsList className="grid h-auto w-full grid-cols-2 rounded-xl p-1 sm:max-w-md">
          <TabsTrigger className="min-h-[48px] whitespace-normal" value="cargo"><Vote className="h-4 w-4 mr-1.5" /> Cargos</TabsTrigger>
          <TabsTrigger className="min-h-[48px] whitespace-normal" value="camisa"><Shirt className="h-4 w-4 mr-1.5" /> Camisas</TabsTrigger>
        </TabsList>
      </Tabs>

      {hasSnapshot && <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{filtered.length} {filtered.length === 1 ? 'votação' : 'votações'} · {filtered.filter(row => row.status === 'open').length} abertas</p>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><ListChecks className="h-4 w-4" /> Chamada → candidatos → votação → resultado</span>
      </div>}
      {readError && <QueryErrorState message="Não foi possível consultar as eleições e suas contagens." onRetry={() => void fetchElections()} retrying={loading} hasPreviousData={hasSnapshot} />}
      {!hasSnapshot ? (loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : null) : filtered.length === 0 ? (
        <EmptyState
          icon={activeTab === 'camisa' ? <Shirt className="h-12 w-12" /> : <Vote className="h-12 w-12" />}
          title={activeTab === 'camisa' ? 'Nenhuma votação de camisa' : 'Nenhuma eleição registrada'}
          description={activeTab === 'camisa' ? 'Crie uma votação para escolher o modelo da camisa.' : 'Crie uma nova eleição para começar.'}
        />
      ) : (
        <div className="grid gap-4 min-[900px]:grid-cols-2 xl:grid-cols-3">
          {filtered.map((e) => (
            <ElectionCard key={e.id} election={e} onClick={() => navigate(`/eleicoes/${e.id}`)} onDelete={(id) => setDeleteId(id)} />
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={open => { if (!creating) setDialogOpen(open); }}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-xl">{electionType === 'camisa' ? 'Nova votação de camisa' : 'Nova votação'}</DialogTitle>
            <p className="text-sm text-muted-foreground">Defina o formato. A chamada e os candidatos vêm na próxima etapa.</p>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor={`${formId}-template`}>Formato</Label>
              <Select disabled={creating || !!sequenceRef.current} value={template} onValueChange={value => {
                setTemplate(value as 'single' | 'ump');
                if (value === 'ump') { setElectionType('cargo'); setName('Diretoria UMP'); setPosition(UMP_POSITIONS[0]); setSeatsCount('1'); }
                else { setName(''); setPosition(''); }
              }}>
                <SelectTrigger id={`${formId}-template`}><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="single">Votação avulsa</SelectItem><SelectItem value="ump">Diretoria UMP — 5 cargos</SelectItem></SelectContent>
              </Select>
            </div>
            {template === 'ump' && <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">
              <p className="mb-3 font-semibold text-primary">Um roteiro, cinco cargos</p>
              <ol className="grid gap-2 sm:grid-cols-2">{UMP_POSITIONS.map((cargo, index) => <li key={cargo} className="flex items-center gap-2"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{index + 1}</span>{cargo}</li>)}</ol>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">A chamada do primeiro cargo pode ser reaproveitada. Cada cargo tem candidatos e resultado próprios. Roteiro salvo neste navegador.</p>
            </div>}
            {template === 'single' && <div>
              <Label htmlFor={`${formId}-type`}>Tipo</Label>
              <Select disabled={creating || !!sequenceRef.current} value={electionType} onValueChange={(v) => setElectionType(v as 'cargo' | 'camisa')}>
                <SelectTrigger id={`${formId}-type`}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cargo">Eleição de Cargo</SelectItem>
                  <SelectItem value="camisa">Votação de Camisa</SelectItem>
                </SelectContent>
              </Select>
            </div>}
            <div>
              <Label htmlFor={`${formId}-name`}>{electionType === 'camisa' ? 'Nome da Votação' : 'Nome da Eleição'}</Label>
              <Input
                disabled={creating || !!sequenceRef.current} id={`${formId}-name`} value={name} onChange={(e) => setName(e.target.value)} placeholder={electionType === 'camisa' ? 'Ex: Camisa UMP' : 'Ex: Diretoria UMP'} />
            </div>
            {template === 'single' && <div>
              <Label htmlFor={`${formId}-position`}>{electionType === 'camisa' ? 'Descrição' : 'Cargo'}</Label>
              <Input
                disabled={creating || !!sequenceRef.current} id={`${formId}-position`} value={position} onChange={(e) => setPosition(e.target.value)} placeholder={electionType === 'camisa' ? 'Ex: Escolha do modelo' : 'Ex: Presidente'} />
            </div>}
            {electionType === 'cargo' && template === 'single' && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor={`${formId}-seats`}>Quantidade de vagas</Label>
                  <Input
                    disabled={creating || !!sequenceRef.current}
                    id={`${formId}-seats`}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    step={1}
                    value={seatsCount}
                    onChange={(e) => setSeatsCount(e.target.value)}
                  />
                  {Number(seatsCount) > 1 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Cadastre pelo menos {Number(seatsCount) + 1} candidatos para garantir disputa real.
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor={`${formId}-choices`}>Escolhas por voto</Label>
                  <Input
                    id={`${formId}-choices`}
                    type="number"
                    min={1}
                    max={seatsCount}
                    value={maxChoices}
                    readOnly
                    className="bg-muted text-muted-foreground cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Cada cédula permite uma escolha por vaga.
                  </p>
                </div>
              </div>
            )}
            {electionType === 'cargo' && template === 'single' && (
              <div className="flex flex-col gap-1">
                <Label>Regra de maioria</Label>
                <div className="flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
                  {Number(seatsCount) > 1
                    ? 'Maioria absoluta: mais de 50% das cédulas'
                    : 'Maioria absoluta: mais de 50% das cédulas'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Regra do primeiro escrutínio. O segundo usa maioria simples.
                </p>
              </div>
            )}
            {churchWide ? <div>
              <Label htmlFor={`${formId}-society`}>Sociedade {electionType === 'cargo' ? '(opcional)' : ''}</Label>
              <Select disabled={creating || !!sequenceRef.current} value={societyId} onValueChange={setSocietyId}>
                <SelectTrigger id={`${formId}-society`}><SelectValue placeholder="Geral (toda a igreja)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">Geral (toda a igreja)</SelectItem>
                  {societies.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div> : <p className="text-sm text-muted-foreground">Sociedade: {societies[0]?.name || 'Nenhuma sociedade vinculada'}</p>}
          </div>
          <DialogFooter>
            <Button onClick={handleCreate} disabled={creating || !canCreate}>
              {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {template === 'ump' ? 'Criar roteiro' : 'Criar votação'} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir eleição?</AlertDialogTitle>
            <AlertDialogDescription>Todos os votos, candidatos e presença serão perdidos.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
