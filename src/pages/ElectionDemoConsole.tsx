import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Loader2, Monitor, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { electionRoomRpc } from '@/lib/election-room-client';
import { parseElectionRoomSnapshot, type ElectionRoomSnapshot } from '@/lib/election-room';
import { AttendanceList } from '@/components/eleicoes/AttendanceList';
import { CandidateForm } from '@/components/eleicoes/CandidateForm';
import { ElectionStepCard } from '@/components/eleicoes/ElectionStepCard';
import { UMP_POSITIONS } from '@/lib/election-sequence';
import { ElectionReportDownload } from '@/components/eleicoes/ElectionReportDownload';

/** Capability-scoped console for synthetic rehearsals. Nothing starts on load. */
export default function ElectionDemoConsole() {
  const { adminToken } = useParams<{ adminToken: string }>();
  const [snapshot, setSnapshot] = useState<ElectionRoomSnapshot | null>(null);
  const [roomToken, setRoomToken] = useState('');
  const [urnToken, setUrnToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [position, setPosition] = useState('');
  const [electionName, setElectionName] = useState('');
  const [electionPosition, setElectionPosition] = useState('');
  const [stage, setStage] = useState<'attendance' | 'candidates'>('attendance');
  const [preparation, setPreparation] = useState<{ attendance: { id: string; name: string; present: boolean }[]; confirmed: boolean; candidates: { id: string; name: string; photo_url: string | null; display_order: number }[] }>({ attendance: [], confirmed: false, candidates: [] });
  const preparationScope = useRef('');
  const actionInFlight = useRef(false);
  const epoch = useRef(0);
  const requestVersion = useRef(0);
  const currentToken = useRef(adminToken);
  currentToken.current = adminToken;
  const accept = useCallback((data: unknown) => {
    if (!data || typeof data !== 'object') throw new Error('Sala do ensaio indisponível.');
    const object = data as Record<string, unknown>;
    const next = parseElectionRoomSnapshot(object.snapshot || object);
    if (next.kind !== 'demo') throw new Error('Esta tela aceita somente dados fictícios.');
    const token = object.room_token;
    if (typeof token === 'string') setRoomToken(token);
    if (typeof object.urn_token === 'string') setUrnToken(object.urn_token);
    const attendance = Array.isArray(object.attendance) ? object.attendance : [];
    const candidates = Array.isArray(object.current_candidates) ? object.current_candidates : [];
    if (attendance.some(person => !person || typeof person !== 'object' || typeof person.id !== 'string' || typeof person.name !== 'string' || typeof person.present !== 'boolean') || candidates.some(candidate => !candidate || typeof candidate !== 'object' || typeof candidate.id !== 'string' || typeof candidate.name !== 'string')) throw new Error('Preparação do ensaio indisponível.');
    setPreparation({ attendance: attendance as { id: string; name: string; present: boolean }[], confirmed: object.attendance_confirmed === true, candidates: candidates.map((candidate, index) => ({ id: candidate.id as string, name: candidate.name as string, photo_url: typeof candidate.photo_url === 'string' ? candidate.photo_url : null, display_order: index })) });
    setSnapshot(next);
  }, []);
  useEffect(() => {
    const election = snapshot?.activeElection;
    if (!election) return;
    const scope = `${election.id}:${election.current_round}`;
    if (preparationScope.current === scope) return;
    preparationScope.current = scope;
    setStage(election.current_round > 1 || preparation.confirmed ? 'candidates' : 'attendance');
    setElectionName(election.name);
    setElectionPosition(election.position);
    const index = UMP_POSITIONS.findIndex(item => item.toLocaleLowerCase('pt-BR') === election.position.toLocaleLowerCase('pt-BR'));
    setPosition(index >= 0 ? UMP_POSITIONS[index + 1] || '' : '');
  }, [snapshot?.activeElection, preparation.confirmed]);
  useEffect(() => {
    const scope = ++epoch.current;
    let active = true, reading = false;
    const read = async () => {
      if (!adminToken || reading || actionInFlight.current || document.visibilityState === 'hidden') return;
      reading = true;
      const request = ++requestVersion.current;
      try {
        const response = await electionRoomRpc('election_demo_command', { p_admin_token: adminToken, p_action: 'snapshot', p_expected_revision: 0, p_payload: {} });
        if (response.error) throw response.error;
        if (active && scope === epoch.current && request === requestVersion.current) { accept(response.data); setError(''); }
      } catch { if (active && scope === epoch.current && request === requestVersion.current) setError('Não foi possível atualizar o ensaio. As ações foram bloqueadas.'); }
      finally { reading = false; }
    };
    void read();
    const timer = window.setInterval(() => void read(), 3000);
    const foreground = () => { if (document.visibilityState === 'visible') void read(); };
    const invalidate = () => { epoch.current = scope + 1; requestVersion.current++; };
    document.addEventListener('visibilitychange', foreground);
    return () => { active = false; invalidate(); window.clearInterval(timer); document.removeEventListener('visibilitychange', foreground); };
  }, [adminToken, accept]);

  const command = async (action: string, payload: Record<string, unknown> = {}) => {
    if (!adminToken || actionInFlight.current || (!snapshot && action !== 'snapshot')) return false;
    actionInFlight.current = true; setBusy(true); setError(''); setMessage('');
    const token = adminToken;
    const scope = epoch.current;
    const request = ++requestVersion.current;
    try {
      const response = await electionRoomRpc('election_demo_command', { p_admin_token: token, p_action: action, p_expected_revision: action === 'snapshot' ? 0 : snapshot!.revision, p_payload: payload });
      if (response.error) throw response.error;
      if (currentToken.current !== token || scope !== epoch.current || request !== requestVersion.current) return false;
      accept(response.data);
      setMessage(action === 'snapshot' ? 'Ensaio atualizado.' : 'Ação confirmada. A sala dos participantes será atualizada automaticamente.');
      if (action === 'next_election') setPosition('');
      return true;
    } catch {
      if (currentToken.current === token) setError('A ação não foi confirmada. Atualize o ensaio antes de tentar novamente; a votação pode ter mudado.');
      return false;
    } finally { actionInFlight.current = false; setBusy(false); }
  };
  const election = snapshot?.activeElection;
  const rounds = snapshot?.published_result?.rounds || [];
  const electedCount = new Set(rounds.flatMap(round => round.electedIds)).size;
  const exact = !!snapshot?.count.exact;
  const locked = busy || !!error || !snapshot;
  const preparing = election?.status === 'draft' || election?.nominations_open === true;
  const configurationChanged = electionName !== election?.name || electionPosition !== election?.position;
  const prepareAction = async (action: string, payload: Record<string, unknown> = {}) => { if (!await command(action, payload)) throw new Error('A alteração não foi confirmada.'); };
  const publicUrl = roomToken ? `${window.location.origin}/vote/sala/${roomToken}` : '';
  const panelUrl = publicUrl ? `${publicUrl}?painel=1` : '';
  const urnUrl = publicUrl && urnToken ? `${publicUrl}?urna=${urnToken}` : '';
  const copy = async () => { try { await navigator.clipboard.writeText(publicUrl); setMessage('Link público dos participantes copiado.'); } catch { setError('Não foi possível copiar. Selecione o link público para copiar manualmente.'); } };

  return <main className="min-h-dvh bg-muted/20 p-4 sm:p-6"><div className="mx-auto max-w-6xl space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 sm:p-5"><div className="space-y-1"><p className="text-xs font-semibold uppercase tracking-wide text-primary">Ensaio isolado · somente dados fictícios</p><h1 className="text-2xl font-bold">Mesa de votação</h1><p className="text-sm text-muted-foreground">{snapshot?.title || 'Preparando o ensaio…'}</p></div><Button variant="outline" onClick={() => void command('snapshot')} disabled={busy}><RefreshCw className="h-4 w-4" />Atualizar</Button>{panelUrl && <Button asChild variant="outline" className="max-w-full gap-2"><a href={panelUrl} target="_blank" rel="noopener noreferrer"><Monitor className="h-4 w-4" />Abrir painel de acompanhamento</a></Button>}</header>
    {error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</p>}{message && <p role="status" className="rounded-xl border border-success/30 bg-success/5 p-4 text-sm">{message}</p>}{roomToken && <ElectionReportDownload roomToken={roomToken} revision={snapshot?.revision} />}
    {!snapshot ? <div className="flex items-center justify-center gap-3 p-8" role="status"><Loader2 className="h-6 w-6 animate-spin" />Consultando o ensaio…</div> : <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="space-y-5 rounded-2xl border border-border bg-card p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-bold">{election?.position || 'Sala de espera'}</h2><span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">{election ? `${election.current_round}º escrutínio · ${election.nominations_open ? 'Indicações abertas' : election.status === 'draft' ? 'Preparação' : election.status === 'open' ? 'Aberto' : 'Concluído'}` : 'Aguardando'}</span></div>
        {preparing ? <div className="space-y-4">
          {election?.status === 'draft' && election.current_round === 1 && <section className="space-y-3 rounded-xl border border-border bg-muted/10 p-3">
            <h3 className="text-sm font-semibold">Identificação da votação</h3>
            <div className="space-y-2"><Label htmlFor="demo-election-name">Nome da eleição</Label><Input id="demo-election-name" value={electionName} onChange={event => setElectionName(event.target.value)} disabled={locked} /></div>
            <div className="space-y-2"><Label htmlFor="demo-election-position">Cargo atual</Label><Input id="demo-election-position" value={electionPosition} onChange={event => setElectionPosition(event.target.value)} disabled={locked} /></div>
            <Button variant="outline" disabled={locked || !configurationChanged || !electionName.trim() || !electionPosition.trim()} onClick={() => void command('configure', { name: electionName.trim(), position: electionPosition.trim() })}>Salvar identificação</Button>
          </section>}
          <nav aria-label="Etapas de preparação" className="grid grid-cols-2 gap-2"><Button variant={stage === 'attendance' ? 'secondary' : 'outline'} onClick={() => setStage('attendance')}>1. Chamada</Button><Button variant={stage === 'candidates' ? 'secondary' : 'outline'} disabled={!preparation.confirmed} onClick={() => setStage('candidates')}>2. Indicações</Button></nav>
          <ElectionStepCard state="active" title={stage === 'attendance' ? 'Chamada de Presença' : `Indicações · ${election?.current_round}º escrutínio`} icon={<Monitor className="h-4 w-4" />} summary={stage === 'attendance' ? `${preparation.attendance.filter(person => person.present).length} de ${preparation.attendance.length} presentes${preparation.confirmed ? ' · chamada confirmada' : ''}` : `${preparation.candidates.length} indicado(s) nesta rodada`}>
            {stage === 'attendance' ? <div className="space-y-4">
              {election?.status === 'draft' && preparation.attendance.length === 0 && <Button variant="outline" className="w-full" disabled={locked} onClick={() => void command('attendance_bulk_add', { names: Array.from({ length: 150 }, (_, index) => `Participante fictício ${index + 1}`), present: true })}>Adicionar 150 presentes fictícios</Button>}
              <AttendanceList electionId={election?.id || ''} societyId={null} attendance={preparation.attendance} disabled={locked || election?.status !== 'draft'} onRefresh={() => {}} actions={{ add: name => prepareAction('attendance_add', { name }), remove: id => prepareAction('attendance_remove', { id }), toggle: (id, present) => prepareAction('attendance_toggle', { id, present }), confirm: () => prepareAction('confirm_attendance') }} />
              <Button className="w-full" disabled={locked || !preparation.confirmed || configurationChanged} onClick={() => setStage('candidates')}>Avançar: Indicações</Button>
            </div> : <div className="space-y-4">
              <p className="text-sm leading-relaxed text-muted-foreground">Cada nome adicionado já entra na lista de indicados aceitos. Confira a lista e inicie quando estiver pronta.</p>
              <CandidateForm key={`${election?.id}:${election?.current_round}`} electionId={election?.id || ''} candidates={preparation.candidates} disabled={locked} onRefresh={() => {}} allowPhotos={false} actions={{ add: name => prepareAction('candidate_add', { name }), remove: id => prepareAction('candidate_remove', { id }) }} />
              <Button className="w-full" disabled={locked || !preparation.confirmed || preparation.candidates.length === 0 || configurationChanged} onClick={() => void command('start')}>{election?.current_round && election.current_round > 1 ? `Iniciar ${election.current_round}º escrutínio` : 'Iniciar votação'}</Button>
              <p className="text-xs leading-relaxed text-muted-foreground">O celular dos participantes continua aguardando até você iniciar.</p>
            </div>}
          </ElectionStepCard>
        </div> : <div className="space-y-5">
        <div className="grid grid-cols-3 gap-2 text-center tabular-nums">{[['Presentes', snapshot.count.present], ['Cédulas', snapshot.count.ballots], [snapshot.count.ballots > snapshot.count.present ? 'Excedentes' : 'Faltantes', Math.abs(snapshot.count.present - snapshot.count.ballots)]].map(([label, value]) => <div key={label} className="rounded-xl border border-border bg-muted/20 p-3"><p className="text-2xl font-bold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>)}</div>
        <div className="space-y-2"><div className="flex flex-wrap justify-between gap-2 text-sm font-medium"><span>Andamento da votação</span><span className="tabular-nums">{snapshot.count.ballots} / {snapshot.count.present} cédulas</span></div><div role="progressbar" aria-label="Andamento da votação" aria-valuemin={0} aria-valuemax={Math.max(snapshot.count.present, 1)} aria-valuenow={snapshot.count.ballots} className="h-3 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${snapshot.count.present > 0 ? Math.min(100, snapshot.count.ballots / snapshot.count.present * 100) : 0}%` }} /></div></div>
        <p className="text-sm text-muted-foreground">{exact ? 'Contagem exata: uma cédula por presente.' : 'A apuração e o avanço ficam bloqueados até a contagem exata.'}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button disabled={locked || !exact || election?.status !== 'open' || election.show_result} onClick={() => void command('publish')}>Apurar e liberar resultado</Button>
          <Button variant="outline" disabled={locked || !election?.show_result} onClick={() => void command('hide_result')}>Ocultar resultado</Button>
          <Button variant="outline" disabled={locked || !exact || election?.status !== 'open' || !snapshot.published_result || electedCount >= (election?.seats_count || 1) || (election?.current_round || 1) >= 3} onClick={() => void command('next_round')}>Próximo escrutínio</Button>
          <Button disabled={locked || !exact || election?.status !== 'open' || electedCount < (election?.seats_count || 1)} onClick={() => void command('finish')}>Concluir votação</Button>
          <Button variant="outline" disabled={locked || election?.status !== 'finished' || snapshot.phase === 'finished'} onClick={() => void command('complete')}>Encerrar a sessão</Button>
        </div>
        </div>}
        {snapshot.published_result && <section aria-label="Resultado do ensaio" className="space-y-3 border-t border-border pt-4"><h3 className="font-semibold">Resultado liberado</h3>{rounds.map(round => <div key={round.round} className="space-y-2"><p className="text-sm font-medium">{round.round}º escrutínio · {round.totalBallots} cédulas</p>{round.rows.map(row => <p key={row.candidate_id} className="flex flex-wrap justify-between gap-2 rounded-lg bg-muted/20 p-2 text-sm"><span>{snapshot.published_result!.candidates.find(candidate => candidate.id === row.candidate_id)?.name || 'Candidato'}{round.electedIds.includes(row.candidate_id) ? ' · Eleito' : ''}</span><strong>{row.count} votos</strong></p>)}</div>)}</section>}
        {election?.status === 'finished' && snapshot.phase !== 'finished' && <section className="space-y-3 border-t border-border pt-4"><Label htmlFor="demo-next-position">Próximo cargo</Label><Input id="demo-next-position" value={position} onChange={event => setPosition(event.target.value)} placeholder="Ex.: Vice-presidente" disabled={locked} /><Button variant="outline" disabled={locked || !position.trim()} onClick={() => void command('next_election', { position: position.trim() })}>Preparar próximo cargo</Button></section>}
      </section>
      <aside className="space-y-3 rounded-2xl border border-primary/20 bg-primary/5 p-4"><div className="flex items-center gap-2"><Monitor className="h-5 w-5 text-primary" /><h2 className="font-semibold">Participantes</h2></div><p className="text-sm leading-relaxed text-muted-foreground">Compartilhe somente este QR Code. O celular aguarda as próximas votações pelo mesmo link.</p>{publicUrl && <><div className="mx-auto w-fit rounded-xl border border-border bg-white p-3"><QRCodeSVG value={publicUrl} size={220} className="h-auto max-w-full" /></div><Button variant="outline" className="w-full" onClick={() => void copy()}><Copy className="h-4 w-4" />Copiar link público</Button><code className="block select-all break-all rounded-lg bg-card p-3 text-xs">{publicUrl}</code></>}{urnUrl && <details className="rounded-xl border border-border bg-card p-3"><summary className="min-h-12 cursor-pointer text-sm font-semibold">Urna compartilhada do ensaio</summary><p className="mt-2 text-xs leading-relaxed text-muted-foreground">Permite votos sucessivos por este link. Use somente nas urnas de teste; o QR acima mantém um voto por navegador.</p><code className="mt-3 block select-all break-all rounded-lg bg-muted/30 p-2 text-xs">{urnUrl}</code></details>}</aside>
    </div>}
  </div></main>;
}
