import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle, Clock3, Loader2, Trophy, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getVoteDeviceId } from '@/lib/browser-vote-device';
import { useElectionRoom } from '@/hooks/useElectionRoom';
import VotePublic from './VotePublic';
import { ElectionReportDownload } from '@/components/eleicoes/ElectionReportDownload';

export default function VoteRoomPublic() {
  const { roomToken } = useParams<{ roomToken: string }>();
  const [searchParams] = useSearchParams();
  const [deviceId] = useState(() => { try { return getVoteDeviceId(); } catch { return null; } });
  const { snapshot, error, refresh } = useElectionRoom(roomToken, deviceId);
  const [votedScope, setVotedScope] = useState('');
  const [receipt, setReceipt] = useState('');
  const [dismissedResult, setDismissedResult] = useState('');
  const election = snapshot?.activeElection;
  const scope = election ? `${election.id}:${election.current_round}` : '';
  const urnaToken = snapshot?.kind === 'demo' ? searchParams.get('urna') || undefined : undefined;
  const resultKey = snapshot?.published_result && snapshot.phase === 'result' ? `${scope}:${snapshot.revision}` : '';
  const confirmed = useCallback(() => { if (!urnaToken) setVotedScope(scope); setReceipt(scope); refresh(); }, [scope, refresh, urnaToken]);
  const roomSession = useMemo(() => snapshot && roomToken && deviceId ? { snapshot, roomToken, deviceId, onConfirmed: confirmed, urnaToken } : undefined, [snapshot, roomToken, deviceId, confirmed, urnaToken]);
  useEffect(() => {
    if (!receipt) return;
    const timer = window.setTimeout(() => setReceipt(''), 1500);
    return () => window.clearTimeout(timer);
  }, [receipt]);
  useEffect(() => {
    if (!resultKey) return;
    const timer = window.setTimeout(() => setDismissedResult(resultKey), 10000);
    return () => window.clearTimeout(timer);
  }, [resultKey]);

  if (!deviceId) return <main className="flex min-h-dvh items-center justify-center bg-background p-5"><section className="max-w-md space-y-3 text-center"><h1 className="text-2xl font-bold">Permita o armazenamento deste navegador</h1><p className="text-muted-foreground">A sala precisa reconhecer este navegador para conferir um voto por escrutínio. Depois, abra este mesmo link novamente.</p></section></main>;
  if (!snapshot && !error) return <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background p-5" role="status"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p>Entrando na sala de votação…</p></main>;
  const hasVoted = !urnaToken && (snapshot?.already_voted || votedScope === scope);
  const result = !error && resultKey && resultKey !== dismissedResult ? snapshot?.published_result : null;
  if (!error && !result && receipt !== scope && (snapshot?.phase === 'voting' || (urnaToken && snapshot?.phase === 'voted')) && !hasVoted && roomSession) return <VotePublic key={scope} roomSession={roomSession} />;

  return <main className="min-h-dvh bg-muted/20 px-4 py-6 sm:px-6">
    <div className="mx-auto flex min-h-[calc(100dvh-3rem)] max-w-2xl flex-col justify-center gap-4">
      <header className="space-y-2 text-center"><p className="text-xs font-semibold uppercase tracking-wide text-primary">{snapshot?.kind === 'demo' ? 'Ensaio com dados fictícios' : 'Sala de votação'}</p><h1 className="break-words text-2xl font-bold sm:text-3xl">{snapshot?.title || 'Sala de votação'}</h1>{election && <p className="text-sm text-muted-foreground">{election.position} · {election.current_round}º escrutínio</p>}</header>
      {error ? <section className="space-y-4 rounded-2xl border border-border bg-card p-6 text-center"><WifiOff className="mx-auto h-10 w-10 text-muted-foreground" /><h2 className="text-xl font-semibold">Conexão com a sala indisponível</h2><p role="alert" className="text-sm leading-relaxed text-muted-foreground">{error}</p><Button variant="outline" onClick={refresh}>Tentar novamente</Button></section>
        : result ? <section aria-label="Resultado liberado pelo mesário" className="space-y-5 rounded-2xl border border-success/30 bg-card p-4 shadow-sm sm:p-6"><div className="flex items-center gap-3"><Trophy className="h-6 w-6 text-success" /><div><h2 className="text-xl font-semibold">Resultado liberado</h2><p className="text-sm text-muted-foreground">Conferido e liberado pelo mesário.</p></div></div>
          {result.rounds.map(round => <section key={round.round} className="space-y-3 border-t border-border pt-4"><div className="flex flex-wrap items-center justify-between gap-2 text-sm"><h3 className="font-semibold">{round.round}º escrutínio</h3><span className="text-muted-foreground">{round.totalBallots} cédulas</span></div><ul className="space-y-2">{round.rows.map(row => { const candidate = result.candidates.find(person => person.id === row.candidate_id); const elected = round.electedIds.includes(row.candidate_id); return <li key={row.candidate_id} className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 ${elected ? 'border-success/30 bg-success/5' : 'border-border'}`}><span className="min-w-0 break-words font-medium">{candidate?.name || 'Candidato'}</span><span className="flex items-center gap-2 text-sm tabular-nums"><strong>{row.count} votos</strong><span className="text-muted-foreground">{round.totalBallots > 0 ? Math.round(row.count / round.totalBallots * 100) : 0}%</span>{elected && <span className="rounded-full bg-success/10 px-2 py-1 text-xs font-semibold text-success">Eleito</span>}</span></li>; })}</ul>{round.blankVotes > 0 && <p className="text-sm text-muted-foreground">Brancos / nulos: {round.blankVotes}</p>}{round.hasTie && <p className="text-sm text-muted-foreground">Empate neste escrutínio.</p>}</section>)}
          <Button variant="outline" className="w-full" onClick={() => setDismissedResult(resultKey)}>Continuar aguardando</Button><p className="text-center text-xs text-muted-foreground">A sala retorna à espera automaticamente.</p>
        </section>
          : receipt === scope && scope ? <section role="status" className="space-y-3 rounded-2xl border border-success/30 bg-card p-8 text-center"><CheckCircle className="mx-auto h-12 w-12 text-success" /><h2 className="text-2xl font-bold">VOTO CONFIRMADO</h2><p className="text-muted-foreground">Seu voto foi registrado com sucesso!</p></section>
            : <section role="status" className="space-y-4 rounded-2xl border border-border bg-card p-6 text-center shadow-sm sm:p-8"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10"><Clock3 className="h-8 w-8 text-primary" /></div><h2 className="text-2xl font-bold">{snapshot?.phase === 'finished' ? 'Votações concluídas' : snapshot?.phase === 'nominations' ? 'Aguardando as indicações' : 'Aguardando o mesário'}</h2><p className="text-base leading-relaxed text-muted-foreground">{snapshot?.phase === 'nominations' ? 'O mesário está cadastrando os indicados desta rodada. Aguarde ele iniciar a votação.' : hasVoted ? 'Seu voto neste escrutínio já foi registrado. Aguarde a liberação do resultado ou da próxima votação.' : 'A próxima votação aparecerá aqui quando o mesário liberar.'}</p><p className="text-sm text-muted-foreground">Mantenha este link aberto. Você não precisa escanear o QR Code novamente.</p></section>}
      {roomToken && <ElectionReportDownload roomToken={roomToken} revision={snapshot?.revision} className="w-full" />}
    </div>
  </main>;
}
