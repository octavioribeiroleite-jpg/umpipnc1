import { useSnapshotRead } from '@/hooks/useSnapshotRead';
import { QueryErrorState } from '@/components/ui/query-error-state';
import { useCallback, useId, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Vote, Loader2, Shirt, ArrowRight, UsersRound, Search, ClipboardCheck, ChartNoAxesCombined } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
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
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
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

  const categoryElections = elections.filter(e => (e.type || 'cargo') === activeTab);
  const normalizedSearch = search.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();
  const filtered = categoryElections.filter(e => (statusFilter === 'all' || e.status === statusFilter)
    && `${e.name} ${e.position}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').includes(normalizedSearch));
  const canPrepare = canCreate && hasSnapshot && !readError;
  const chooseFormat = (format: 'single' | 'ump') => {
    if (creating || sequenceRef.current) return;
    setTemplate(format);
    if (format === 'ump') { setElectionType('cargo'); setName('Diretoria UMP'); setPosition(UMP_POSITIONS[0]); setSeatsCount('1'); }
    else { setName(''); setPosition(''); setElectionType(activeTab); }
  };
  const openCreate = (format?: 'single' | 'ump') => {
    if (!canPrepare) return;
    const desiredType = format === 'ump' ? 'cargo' : activeTab;
    if (!sequenceRef.current && ((format && format !== template) || (format !== 'ump' && electionType !== desiredType))) chooseFormat(format || 'single');
    setDialogOpen(true);
  };

  return (
    <AppLayout width="wide">
      <div className="mx-auto w-full max-w-6xl space-y-5 pb-2">
      <header className="flex min-w-0 flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary"><Vote className="h-6 w-6" /></span>
          <div className="min-w-0"><p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">Mesa de votação</p><h1 className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl">Eleições</h1><p className="mt-1 text-sm leading-relaxed text-muted-foreground">Da chamada ao resultado, uma etapa de cada vez.</p></div>
        </div>
        <Button disabled={!canPrepare} onClick={() => openCreate()} className="min-h-12 shrink-0 rounded-xl px-5"><Plus className="mr-2 h-4 w-4" />Nova votação</Button>
      </header>

      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <Tabs value={activeTab} onValueChange={v => { setActiveTab(v as 'cargo' | 'camisa'); setSearch(''); setStatusFilter('all'); }}>
          <TabsList className="h-auto rounded-xl border border-border bg-card p-1">
            <TabsTrigger className="min-h-11 min-w-28 gap-2 rounded-lg px-4" value="cargo"><Vote className="h-4 w-4" />Cargos</TabsTrigger>
            <TabsTrigger className="min-h-11 min-w-28 gap-2 rounded-lg px-4" value="camisa"><Shirt className="h-4 w-4" />Camisas</TabsTrigger>
          </TabsList>
        </Tabs>
        {hasSnapshot && categoryElections.length > 0 && <p className="text-sm text-muted-foreground">{categoryElections.length} {categoryElections.length === 1 ? 'votação registrada' : 'votações registradas'}</p>}
      </div>
      {readError && <QueryErrorState message="Não foi possível consultar as eleições e suas contagens." onRetry={() => void fetchElections()} retrying={loading} hasPreviousData={hasSnapshot} />}
      {!hasSnapshot ? (loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : null) : categoryElections.length === 0 ? (
        <section className="space-y-4" aria-label="Começar uma votação">
          <div><h2 className="text-lg font-semibold">Como deseja começar?</h2><p className="mt-1 text-sm text-muted-foreground">Escolha o formato. Você prepara os nomes e controla quando os votos começam.</p></div>
          <div className={`grid auto-rows-fr items-stretch gap-4 ${activeTab === 'cargo' ? 'md:grid-cols-2' : ''}`}>
            {activeTab === 'cargo' && <article className="flex min-w-0 flex-col rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-primary/5 to-card p-5 sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground"><UsersRound className="h-5 w-5" /></span><span className="rounded-full border border-primary/20 bg-card px-3 py-1 text-xs font-semibold text-primary">5 cargos em sequência</span></div>
              <h3 className="text-xl font-semibold tracking-tight">Diretoria UMP</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Uma chamada, uma sala para os participantes e um resultado para cada cargo.</p>
              <p className="my-4 text-sm leading-relaxed text-foreground/85">Presidente · Vice-presidente · 1º secretário · 2º secretário · Tesoureiro</p>
              <Button disabled={!canPrepare} onClick={() => openCreate('ump')} className="mt-auto min-h-12 w-full justify-between rounded-xl">Preparar diretoria<ArrowRight className="h-4 w-4 shrink-0" /></Button>
            </article>}
            <article className="flex min-w-0 flex-col rounded-2xl border border-border bg-card p-5 sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-primary">{activeTab === 'camisa' ? <Shirt className="h-5 w-5" /> : <Vote className="h-5 w-5" />}</span><span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">{activeTab === 'camisa' ? 'Escolha de modelo' : 'Um cargo por vez'}</span></div>
              <h3 className="text-xl font-semibold tracking-tight">{activeTab === 'camisa' ? 'Votação de camisa' : 'Votação avulsa'}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{activeTab === 'camisa' ? 'Reúna os modelos, compartilhe o QR Code e acompanhe a escolha do grupo.' : 'Prepare uma eleição para um cargo, com a quantidade de vagas que você definir.'}</p>
              <p className="my-4 text-sm leading-relaxed text-foreground/85">{activeTab === 'camisa' ? 'Fotos dos modelos · Voto pelo celular · Resultado conferido' : 'Chamada · Indicações · Escrutínios · Relatório'}</p>
              <Button variant="outline" disabled={!canPrepare} onClick={() => openCreate('single')} className="mt-auto min-h-12 w-full justify-between rounded-xl">{activeTab === 'camisa' ? 'Preparar votação de camisa' : 'Criar votação avulsa'}<ArrowRight className="h-4 w-4 shrink-0" /></Button>
            </article>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5"><p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Você conduz cada etapa</p><ol className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[{ title: 'Chamada', Icon: ClipboardCheck }, { title: 'Indicações', Icon: UsersRound }, { title: 'Votação', Icon: Vote }, { title: 'Resultado', Icon: ChartNoAxesCombined }].map(({ title, Icon }, index) => <li key={title} className="flex min-w-0 items-center gap-2 text-sm"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/5 text-primary"><Icon className="h-4 w-4" /></span><span><span className="mr-1 text-muted-foreground">{index + 1}.</span>{title}</span></li>)}</ol></div>
        </section>
      ) : <section className="space-y-4" aria-label="Suas votações">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><h2 className="text-lg font-semibold">Suas votações</h2><p className="mt-1 text-sm text-muted-foreground">Continue a preparação, abra a mesa ou consulte um resultado.</p></div><span className="text-xs text-muted-foreground">{filtered.length} {filtered.length === 1 ? 'encontrada' : 'encontradas'}</span></div>
        <div className="grid gap-3 rounded-2xl border border-border bg-card p-3 sm:grid-cols-[minmax(0,1fr)_200px]">
          <div className="relative"><Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" /><Input aria-label="Buscar votação" value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar por nome ou cargo" className="min-h-11 pl-9" /></div>
          <select aria-label="Filtrar por situação" value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="min-h-11 min-w-0 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><option value="all">Todas as situações</option><option value="draft">Em preparação</option><option value="open">Em andamento</option><option value="finished">Concluídas</option></select>
        </div>
        {filtered.length ? <div className="grid items-stretch gap-4 min-[900px]:grid-cols-2 xl:grid-cols-3">{filtered.map(e => <ElectionCard key={e.id} election={e} onClick={() => navigate(`/eleicoes/${e.id}`)} onDelete={id => setDeleteId(id)} />)}</div>
          : <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center"><Search className="mx-auto mb-3 h-6 w-6 text-muted-foreground" /><h3 className="font-semibold">Nenhuma votação com esses filtros</h3><p className="mt-1 text-sm text-muted-foreground">Tente outro nome ou veja todas as situações.</p><Button variant="outline" className="mt-4 min-h-11" onClick={() => { setSearch(''); setStatusFilter('all'); }}>Limpar filtros</Button></div>}
      </section>}

      <Dialog open={dialogOpen} onOpenChange={open => { if (!creating) setDialogOpen(open); }}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-2xl sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-xl">{electionType === 'camisa' ? 'Nova votação de camisa' : 'Nova votação'}</DialogTitle>
            <DialogDescription>Escolha o formato e identifique a votação. Depois você prepara a chamada e as indicações.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <fieldset>
              <legend className="text-sm font-medium">Formato</legend>
              <div id={`${formId}-template`} className="mt-2 grid grid-cols-2 gap-2">
                {([{ value: 'single', title: 'Avulsa', description: 'Um cargo ou modelo', Icon: Vote }, { value: 'ump', title: 'Diretoria UMP', description: 'Roteiro com 5 cargos', Icon: UsersRound }] as const).map(({ value, title, description, Icon }) => <label key={value} className="relative min-w-0 cursor-pointer"><input type="radio" name={`${formId}-format`} value={value} checked={template === value} disabled={creating || !!sequenceRef.current} onChange={() => chooseFormat(value)} className="peer sr-only" aria-label={value === 'ump' ? 'Diretoria UMP — 5 cargos' : 'Votação avulsa'} /><span className="flex h-full flex-col gap-1 rounded-xl border border-border bg-card p-3 peer-checked:border-primary peer-checked:bg-primary/5 peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-disabled:cursor-not-allowed peer-disabled:opacity-60"><Icon className="mb-1 h-5 w-5 text-primary" /><span className="text-sm font-semibold">{title}</span><span className="text-xs leading-relaxed text-muted-foreground">{description}</span></span></label>)}
              </div>
            </fieldset>
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
            <Button className="min-h-12 rounded-xl" onClick={handleCreate} disabled={creating || !canCreate}>
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
      </div>
    </AppLayout>
  );
}
