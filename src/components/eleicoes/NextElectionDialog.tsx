import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { readElectionCount, requireElectionCount, type ElectionCountSnapshot } from '@/lib/election-completion';
import { supabase } from '@/integrations/supabase/client';
import { findElectionSequence, reserveSequenceAttendance, UMP_POSITIONS } from '@/lib/election-sequence';
import { withBrowserBallotLock } from '@/lib/browser-ballot-lock';
import { planNextElection, saveNextElection, type NextElectionPlan } from '@/lib/next-election';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Plus } from 'lucide-react';

export function NextElectionDialog({ election, attendance }: {
  election: { id: string; name: string; status: string; society_id: string | null; type?: string; voting_mode?: string; current_round?: number };
  attendance: { id: string; name: string; present: boolean }[];
}) {
  const { user } = useAuth();
  const step = user ? findElectionSequence(user.id, election.id) : null;
  const nextPosition = step ? UMP_POSITIONS[step.index + 1] : undefined;
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(nextPosition ? step!.sequence.name : `${election.name} — próxima votação`);
  const [position, setPosition] = useState(nextPosition || '');
  const [seats, setSeats] = useState('1');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [count, setCount] = useState<ElectionCountSnapshot | null>(null);
  const [countError, setCountError] = useState('');
  const [checking, setChecking] = useState(true);
  const sourceIds = useRef<string[]>([]);
  const readRevision = useRef(0);
  const plan = useRef<NextElectionPlan | null>(null);
  const inFlight = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    let running = false;
    const check = async () => {
      if (running || inFlight.current) return;
      running = true;
      const revision = ++readRevision.current;
      try {
        const fresh = await readElectionCount(supabase, election.id);
        if (active && revision === readRevision.current) { setCount(fresh); setCountError(''); }
      } catch { if (active && revision === readRevision.current) setCountError('Não foi possível conferir a chamada e os votos. O avanço está bloqueado.'); }
      finally { running = false; if (active && revision === readRevision.current) setChecking(false); }
    };
    void check();
    const timer = window.setInterval(() => { void check(); }, 3000);
    const refresh = () => { if (document.visibilityState === 'visible') void check(); };
    document.addEventListener('visibilitychange', refresh);
    return () => { active = false; window.clearInterval(timer); document.removeEventListener('visibilitychange', refresh); };
  }, [election.id]);
  const canContinue = !countError && !!count?.exact && count.election.status === 'finished' && count.election.current_round === (election.current_round || 1);

  const create = async () => {
    if (inFlight.current || !user) return;
    inFlight.current = true;
    setBusy(true); setError('');
    ++readRevision.current;
    try {
      let fresh: ElectionCountSnapshot;
      try {
      fresh = await readElectionCount(supabase, election.id);
      setCount(fresh); setCountError('');
      requireElectionCount(fresh, { status: 'finished', round: election.current_round || 1 });
      } catch (cause) { setCountError(cause instanceof Error ? cause.message : 'Não foi possível conferir a votação.'); throw cause; }
      finally { setChecking(false); }
      if (!plan.current) {
        plan.current = planNextElection(fresh.election, fresh.attendance, { userId: user.id, name, position, seats: Number(seats) });
        sourceIds.current = fresh.attendance.map(person => person.id);
      }
      const id = await withBrowserBallotLock(`ipnc-next-election:${election.id}`, async () => {
        if (step && nextPosition) {
          const targetId = step.sequence.electionIds[step.index + 1];
          const ids = reserveSequenceAttendance(step.sequence, targetId, sourceIds.current);
          plan.current!.election.id = targetId;
          plan.current!.attendance.forEach((person, index) => { person.election_id = targetId; person.id = ids[sourceIds.current[index]]; });
        }
        return saveNextElection(supabase, plan.current!);
      });
      navigate(`/eleicoes/${id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível concluir a nova votação. Tente novamente; o mesmo rascunho será utilizado.');
    } finally { inFlight.current = false; setBusy(false); }
  };

  const blockingMessage = !count && checking ? 'Conferindo chamada e votos…' : countError || count?.issue || (!canContinue ? 'A votação mudou. Atualize a sala.' : '');
  if (step && !nextPosition) return <div className="space-y-2">
    {canContinue ? <p className="rounded-xl border border-success/30 bg-success/5 p-4 text-sm font-medium">Diretoria UMP concluída. Os cinco cargos e seus resultados permanecem na lista de eleições.</p>
      : <p role="alert" className="text-sm text-destructive">{blockingMessage}</p>}
  </div>;

  return <Dialog open={open} onOpenChange={next => { if (!busy) setOpen(next); }}>
    <div className="space-y-2">
      <DialogTrigger asChild><Button disabled={!canContinue} className="h-auto min-h-11 max-w-full whitespace-normal"><Plus className="h-4 w-4 mr-2 shrink-0" />{nextPosition ? `Próximo cargo: ${nextPosition}` : 'Nova votação com esta chamada'}</Button></DialogTrigger>
      {blockingMessage && !open && <p role="status" className="text-sm text-destructive">{blockingMessage}</p>}
    </div>
    <DialogContent className="max-h-[90dvh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{nextPosition ? `Próximo cargo: ${nextPosition}` : 'Nova votação com esta chamada'}</DialogTitle>
        <DialogDescription>Reaproveite os {attendance.length} nomes e as {attendance.filter(person => person.present).length} presenças. O resultado anterior será preservado. Configure novos candidatos na próxima tela.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div><Label htmlFor="next-election-name">Nome da votação</Label><Input id="next-election-name" value={name} disabled={busy || !!plan.current || !!nextPosition} onChange={event => setName(event.target.value)} /></div>
        <div><Label htmlFor="next-election-position">{election.type === 'camisa' ? 'Descrição' : 'Novo cargo'}</Label><Input id="next-election-position" value={position} disabled={busy || !!plan.current || !!nextPosition} onChange={event => setPosition(event.target.value)} /></div>
        {election.type !== 'camisa' && <div><Label htmlFor="next-election-seats">Quantidade de vagas</Label><Input id="next-election-seats" type="number" min={1} step={1} inputMode="numeric" value={seats} disabled={busy || !!plan.current || !!nextPosition} onChange={event => setSeats(event.target.value)} /></div>}
        {(error || blockingMessage) && <p role="alert" className="text-sm text-destructive">{error || blockingMessage}</p>}
      </div>
      <DialogFooter><Button onClick={() => void create()} disabled={busy || !user || !canContinue}>{busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{plan.current ? 'Continuar criação' : nextPosition ? 'Preparar próximo cargo' : 'Criar e reaproveitar chamada'}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}
