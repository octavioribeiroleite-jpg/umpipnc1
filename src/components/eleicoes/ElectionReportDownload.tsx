import { useEffect, useRef, useState } from 'react';
import { Download, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { electionRoomRpc } from '@/lib/election-room-client';
import { electionReportFilename, parseElectionReport, type ElectionReport } from '@/lib/election-report';

let fontsPromise: Promise<{ regular: string; bold: string }> | undefined;
function reportFonts() {
  if (!fontsPromise) fontsPromise = Promise.all(['inter-400.ttf', 'inter-700.ttf'].map(async name => {
    const response = await fetch(`/fonts/secretaria/${name}`); if (!response.ok) throw new Error('Não foi possível carregar a fonte do relatório.');
    const bytes = new Uint8Array(await response.arrayBuffer()); let binary = '';
    for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return btoa(binary);
  })).then(([regular, bold]) => ({ regular, bold })).catch(error => { fontsPromise = undefined; throw error; });
  return fontsPromise;
}
export function ElectionReportDownload({ roomToken, electionId, revision, className }: { roomToken?: string; electionId?: string; revision?: string | number; className?: string }) {
  const [report, setReport] = useState<ElectionReport | null>(null);
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const [scope, setScope] = useState(''); const [retry, setRetry] = useState(0);
  const epoch = useRef(0), downloading = useRef(false);
  const currentKey = `${roomToken || ''}:${electionId || ''}`;
  const keyRef = useRef(currentKey); keyRef.current = currentKey;
  async function read() {
    let token = roomToken;
    if (!token && electionId) {
      const room = await electionRoomRpc('election_room_ensure', { p_election_id: electionId });
      if (room.error || !room.data || typeof room.data !== 'object' || !('room_token' in room.data) || typeof room.data.room_token !== 'string') throw new Error('Não foi possível consultar os relatórios.');
      token = room.data.room_token;
    }
    if (!token) throw new Error('Sala de votação indisponível.');
    const response = await electionRoomRpc('election_room_report', { p_room_token: token });
    if (response.error) throw new Error('Não foi possível consultar os relatórios.');
    return parseElectionReport(response.data);
  }
  useEffect(() => {
    const request = ++epoch.current; let active = true; setReport(null); setScope(''); setError('');
    if (roomToken || electionId) void read().then(next => { if (active && epoch.current === request) setReport(next); }).catch(() => { if (active && epoch.current === request) setError('O relatório não pôde ser consultado.'); });
    return () => { active = false; };
    // read is deliberately scoped to these immutable request inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomToken, electionId, revision, retry]);
  async function download() {
    if (downloading.current) return; downloading.current = true; setBusy(true); setError('');
    const key = currentKey;
    try {
      const fresh = await read(); if (keyRef.current !== key) return;
      const selected = scope ? fresh.elections.filter(entry => entry.election.id === scope) : fresh.elections;
      if (!selected.length) throw new Error('Ainda não há resultado concluído e liberado para baixar.');
      const [{ buildElectionReportPdf }, fonts] = await Promise.all([import('@/lib/election-report-pdf'), reportFonts()]);
      if (keyRef.current !== key) return;
      const selection = { ...fresh, title: scope ? `${fresh.title} - ${selected[0].election.position}` : fresh.title, elections: selected };
      buildElectionReportPdf(selection, fonts).save(electionReportFilename(selection.title)); setReport(fresh);
    } catch (cause) { if (keyRef.current === key) setError(cause instanceof Error ? cause.message : 'Não foi possível gerar o relatório. Tente novamente.'); }
    finally { downloading.current = false; setBusy(false); }
  }
  if (!error && !report?.elections.length) return null;
  return <section className={`space-y-2 ${className || ''}`} aria-label="Relatórios das votações">
    {report && report.elections.length > 1 && <label className="flex flex-col gap-1 text-sm font-medium">Conteúdo do relatório<select aria-label="Conteúdo do relatório" className="min-h-11 max-w-full rounded-lg border border-input bg-background px-3 text-sm" value={scope} disabled={busy} onChange={event => setScope(event.target.value)}><option value="">Todos os cargos concluídos</option>{report.elections.map(entry => <option key={entry.election.id} value={entry.election.id}>{entry.election.position}</option>)}</select></label>}
    {report?.elections.length ? <><Button variant="outline" disabled={busy} onClick={() => void download()} className="h-auto min-h-11 max-w-full whitespace-normal">{busy ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : <Download className="h-4 w-4 shrink-0" />}Baixar relatório (PDF)</Button><p className="text-xs text-muted-foreground">Eleitos e todos os escrutínios dos resultados concluídos e liberados.</p></> : null}
    {error && <div className="space-y-2"><p role="alert" className="text-sm text-destructive">{error}</p><Button variant="outline" size="sm" disabled={busy} onClick={() => setRetry(value => value + 1)}><RefreshCw className="h-4 w-4" />Consultar relatório novamente</Button></div>}
  </section>;
}
