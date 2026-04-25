import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { QRCodeSVG } from 'qrcode.react';
import { Play, RotateCcw, CheckCircle, Loader2, Link as LinkIcon, Copy, Maximize2, X, Smartphone, Monitor, Check, Circle, ExternalLink, Eye, BarChart2, Medal } from 'lucide-react';

function ChecklistItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {done ? (
        <Check className="h-3.5 w-3.5 text-success shrink-0" />
      ) : (
        <Circle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      )}
      <span className={done ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
    </div>
  );
}
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DeviceRegistration } from './DeviceRegistration';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Device { id: string; label: string; token: string; activated: boolean; }
interface Candidate { id: string; name: string; }

interface VotingPanelProps {
  electionId: string;
  electionName?: string;
  status: string;
  totalPresent: number;
  votingMode: string;
  devices: Device[];
  candidates: Candidate[];
  election?: { seats_count?: number; max_choices_per_ballot?: number; current_round?: number; majority_rule?: string };
  onRefresh: () => void;
}

export function VotingPanel({ electionId, electionName, status, totalPresent, votingMode, devices, candidates, election, onRefresh }: VotingPanelProps) {
  const [voteCount, setVoteCount] = useState(0);
  const [electedCount, setElectedCount] = useState(0);
  const [tieAlert, setTieAlert] = useState<string[]>([]);
  const [confirmAction, setConfirmAction] = useState<'reset' | 'finish' | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedMode, setSelectedMode] = useState(votingMode || 'shared');
  const [qrExpanded, setQrExpanded] = useState(false);
  const [expandedDeviceToken, setExpandedDeviceToken] = useState<string | null>(null);
  const [partialRows, setPartialRows] = useState<{ candidate_id: string; count: number; pct: number; elected: boolean }[]>([]);
  const [partialBlanks, setPartialBlanks] = useState(0);
  const [partialNeeded, setPartialNeeded] = useState(0);
  const { toast } = useToast();
  const inFlightRef = useRef(false);
  const pendingRef = useRef(false);

  const voteUrl = `${window.location.origin}/vote/${electionId}`;
  const [activeTab, setActiveTab] = useState<string>('celular');
  const diff = voteCount - totalPresent;
  const seatsCount = election?.seats_count || 1;
  const currentRound = election?.current_round || 1;
  const majorityRule = election?.majority_rule || 'simple';
  const isMultiSeat = seatsCount > 1;

  const showDevices = selectedMode === 'both' || selectedMode === 'shared';
  const needsDevices = showDevices && devices.length === 0;
  const canStart = candidates.length > 0 && totalPresent > 0 && !needsDevices;

  const fetchVoteCount = async () => {
    if (inFlightRef.current) {
      pendingRef.current = true;
      return;
    }

    inFlightRef.current = true;
    try {
      const { data } = await supabase
        .from('election_votes' as any)
        .select('ballot_id, round_number, candidate_id, is_blank')
        .eq('election_id', electionId);
      const rows = ((data as any[]) || []);
      setVoteCount(new Set(rows.filter((v) => (v.round_number || 1) === currentRound).map((v) => v.ballot_id)).size);

      const elected = new Set<string>();
      for (let round = 1; round <= currentRound; round += 1) {
        const roundRows = rows.filter((v) => (v.round_number || 1) === round);
        const ballots = new Set(roundRows.map((v) => v.ballot_id)).size;
        const needed = Math.floor(ballots / 2) + 1;
        const counts = roundRows.reduce((acc: Record<string, number>, v: any) => {
          if (!v.is_blank && v.candidate_id && !elected.has(v.candidate_id))
            acc[v.candidate_id] = (acc[v.candidate_id] || 0) + 1;
          return acc;
        }, {});
        const sorted = Object.entries(counts)
          .sort((a, b) => (b[1] as number) - (a[1] as number));
        if (round === 1) {
          sorted
            .filter(([, count]) => majorityRule === 'absolute_50'
              ? (count as number) >= needed
              : true)
            .slice(0, seatsCount - elected.size)
            .forEach(([id]) => elected.add(id));
        } else {
          const topN = sorted.slice(0, Math.max(1, seatsCount - elected.size));
          const hasTopTie = topN.length > 1 && topN[0][1] === topN[1][1];
          if (!hasTopTie && topN.length > 0) {
            elected.add(topN[0][0]);
          }
        }
      }
      setElectedCount(elected.size);

      // Detecção de empate no escrutínio atual (qualquer round).
      {
        const remaining = Math.max(0, seatsCount - elected.size);
        const curRows = rows.filter((v) => (v.round_number || 1) === currentRound && !v.is_blank);
        const counts = curRows.reduce((acc: Record<string, number>, v: any) => {
          if (v.candidate_id && !elected.has(v.candidate_id)) {
            acc[v.candidate_id] = (acc[v.candidate_id] || 0) + 1;
          }
          return acc;
        }, {});
        const sorted = Object.entries(counts).sort((a, b) => (b[1] as number) - (a[1] as number));
        if (remaining > 0 && sorted.length > remaining) {
          const cutoff = sorted[remaining - 1]?.[1];
          const next = sorted[remaining]?.[1];
          if (cutoff !== undefined && cutoff === next) {
            const tied = sorted.filter(([, c]) => c === cutoff).map(([id]) => id);
            setTieAlert(tied);
          } else {
            setTieAlert([]);
          }
        } else {
          setTieAlert([]);
        }
      }
    } finally {
      inFlightRef.current = false;
      if (pendingRef.current) {
        pendingRef.current = false;
        void fetchVoteCount();
      }
    }
  };

  useEffect(() => {
    setSelectedMode(votingMode || 'shared');
  }, [votingMode]);

  useEffect(() => {
    fetchVoteCount();

    const channel = supabase
      .channel(`election-votes-${electionId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'election_votes',
        filter: `election_id=eq.${electionId}`,
      }, () => {
        fetchVoteCount();
      })
      .subscribe();

    const interval = setInterval(() => {
      fetchVoteCount();
    }, 3000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
      inFlightRef.current = false;
      pendingRef.current = false;
    };
  }, [electionId, currentRound, seatsCount, majorityRule]);

  useEffect(() => {
    if (diff !== 0 || !electionId) {
      setPartialRows([]);
      return;
    }
    supabase
      .from('election_votes' as any)
      .select('*')
      .eq('election_id', electionId)
      .then(({ data }) => {
        const votes = (data as any[]) || [];
        const roundVotes = votes.filter((v) => (v.round_number || 1) === currentRound);
        const totalBallots = new Set(roundVotes.map((v) => v.ballot_id || v.id)).size;
        const needed = Math.floor(totalBallots / 2) + 1;
        setPartialNeeded(needed);
        setPartialBlanks(roundVotes.filter((v) => v.is_blank).length);
        const counts = roundVotes.reduce((acc: Record<string, number>, v: any) => {
          if (!v.is_blank && v.candidate_id) acc[v.candidate_id] = (acc[v.candidate_id] || 0) + 1;
          return acc;
        }, {});
        const rows = Object.entries(counts)
          .map(([candidate_id, count]) => ({
            candidate_id,
            count: count as number,
            pct: totalBallots > 0 ? Math.round(((count as number) / totalBallots) * 100) : 0,
            elected: majorityRule === 'absolute_50'
              ? (count as number) >= needed
              : true,
          }))
          .sort((a, b) => b.count - a.count);
        setPartialRows(rows);
      });
  }, [diff, currentRound, electionId, majorityRule]);

  const handleModeChange = async (mode: string) => {
    setSelectedMode(mode);
    await supabase.from('elections' as any).update({ voting_mode: mode } as any).eq('id', electionId);
  };

  const handleStartVoting = async () => {
    setLoading(true);
    await supabase.from('elections' as any).update({ status: 'open', voting_mode: selectedMode } as any).eq('id', electionId);
    toast({ title: 'Votação iniciada!' });
    setLoading(false);
    onRefresh();
  };

  const handleReset = async () => {
    setLoading(true);
    await supabase.from('election_votes' as any).delete().eq('election_id', electionId);
    toast({ title: 'Votação reiniciada — votos apagados' });
    setLoading(false);
    setConfirmAction(null);
    fetchVoteCount();
  };

  const handleFinish = async () => {
    setLoading(true);
    await supabase.from('elections' as any).update({ status: 'finished' } as any).eq('id', electionId);
    toast({ title: 'Votação concluída!' });
    setLoading(false);
    setConfirmAction(null);
    onRefresh();
  };

  const handleNextRound = async () => {
    setLoading(true);
    await supabase.from('elections' as any).update({ status: 'open', current_round: currentRound + 1 } as any).eq('id', electionId);
    toast({ title: `${currentRound + 1}º escrutínio iniciado` });
    setLoading(false);
    onRefresh();
  };

  const copyLink = () => {
    navigator.clipboard.writeText(voteUrl);
    toast({ title: 'Link copiado!' });
  };

  if (status === 'draft') {
    return (
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Configure a chamada e os candidatos antes de iniciar.
        </p>

        {/* Voting mode selector */}
        <div className="space-y-2">
          <p className="text-xs font-medium">Modo de votação:</p>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleModeChange('shared')}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-colors text-xs ${
                selectedMode === 'shared'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground/30'
              }`}
            >
              <Monitor className="h-5 w-5" />
              <span className="font-medium">Urna Fixa</span>
              <span className="text-[10px] text-muted-foreground text-center">Um dispositivo</span>
            </button>
            <button
              onClick={() => handleModeChange('individual')}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-colors text-xs ${
                selectedMode === 'individual'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground/30'
              }`}
            >
              <Smartphone className="h-5 w-5" />
              <span className="font-medium">Celular</span>
              <span className="text-[10px] text-muted-foreground text-center">Cada um no seu</span>
            </button>
            <button
              onClick={() => handleModeChange('both')}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-colors text-xs ${
                selectedMode === 'both'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground/30'
              }`}
            >
              <div className="flex gap-0.5">
                <Monitor className="h-4 w-4" />
                <Smartphone className="h-4 w-4" />
              </div>
              <span className="font-medium">Ambos</span>
              <span className="text-[10px] text-muted-foreground text-center">Urna + Celular</span>
            </button>
          </div>
        </div>

        {/* Checklist + start button */}
        <div className="space-y-2 pt-2 border-t border-border/50">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Pré-requisitos</p>
          <div className="space-y-1">
            <ChecklistItem done={candidates.length > 0} label={`Pelo menos 1 candidato (${candidates.length})`} />
            <ChecklistItem done={totalPresent > 0} label={`Presença confirmada (${totalPresent})`} />
            {showDevices && (
              <ChecklistItem done={devices.length > 0} label={`Dispositivo fixo cadastrado (${devices.length})`} />
            )}
          </div>
          <Button size="sm" className="w-full mt-2" onClick={handleStartVoting} disabled={loading || !canStart}>
            {loading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Play className="h-3.5 w-3.5 mr-1.5" />}
            Iniciar Votação
          </Button>
        </div>
      </div>
    );
  }

  if (status === 'finished') return null;

  return (
    <>
      <div className="rounded-xl border border-border bg-background p-4 shadow-sm space-y-4">
        {/* Mode label */}
        <div className="flex items-center gap-2">
          {votingMode === 'individual' ? (
            <Smartphone className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Monitor className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-sm font-medium text-muted-foreground">
            Modo: {votingMode === 'individual' ? 'Voto Individual' : votingMode === 'both' ? 'Urna + Celular' : 'Urna Compartilhada'}
          </span>
        </div>
        {isMultiSeat && (
          <div className="rounded-xl border border-border bg-muted/20 p-3 text-sm">
            <p className="font-semibold text-foreground">{currentRound}º escrutínio</p>
            {diff === 0 ? (
              <p className="text-xs text-muted-foreground">
                {electedCount}/{seatsCount} vaga(s) preenchida(s). Restam {Math.max(0, seatsCount - electedCount)}.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Aguardando todos os votos para apurar resultado.
              </p>
            )}
          </div>
        )}

        {tieAlert.length > 0 && (
          <div className="rounded-xl border border-warning/60 bg-warning/10 p-3 text-sm">
            <p className="font-bold text-foreground mb-1">
              ⚠️ Empate detectado no {currentRound}º escrutínio
            </p>
            <p className="text-muted-foreground mb-2">
              Há empate entre os candidatos no limite das vagas restantes. O Conselho deve decidir manualmente.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {tieAlert.map((id) => {
                const c = candidates.find((x) => x.id === id);
                return (
                  <Badge key={id} variant="outline" className="text-[11px]">
                    {c?.name || id}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        {/* Progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-semibold">{voteCount}/{totalPresent}</span>
          </div>
          <Progress value={totalPresent > 0 ? (voteCount / totalPresent) * 100 : 0} className="h-2" />
        </div>

        {/* Compact counters */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 bg-background border border-border rounded-lg shadow-sm">
            <p className="text-lg font-bold text-foreground">{totalPresent}</p>
            <p className="text-[10px] text-muted-foreground">Presentes</p>
          </div>
          <div className="p-2 bg-background border border-border rounded-lg shadow-sm">
            <p className="text-lg font-bold text-foreground">{voteCount}</p>
            <p className="text-[10px] text-muted-foreground">Cédulas</p>
          </div>
          <div className={`p-2 rounded-lg border shadow-sm ${diff === 0 ? 'border-success/50 bg-success/5' : 'border-warning/50 bg-warning/10'}`}>
            <p className={`text-lg font-bold ${diff === 0 ? 'text-success' : 'text-warning'}`}>
              {Math.abs(diff)}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {diff === 0 ? 'Todos votaram' : 'Aguardando voto'}
            </p>
          </div>
        </div>

        {/* Botões principais */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/eleicao/${electionId}/apresentar`, '_blank', 'noopener')}
          >
            <Monitor className="h-3.5 w-3.5 mr-1.5" />
            Abrir tela de apresentação
            <ExternalLink className="h-3 w-3 ml-1.5 opacity-60" />
          </Button>
          {isMultiSeat && diff === 0 && electedCount < seatsCount ? (
            tieAlert.length > 0 ? (
              <Button size="sm" disabled className="opacity-50 cursor-not-allowed">
                ⚠️ Empate — resolva antes de avançar
              </Button>
            ) : (
              <Button size="sm" onClick={handleNextRound} disabled={loading}>
                <Play className="h-3.5 w-3.5 mr-1.5" /> Próximo escrutínio
              </Button>
            )
          ) : diff === 0 ? (
            <Button size="sm" onClick={() => setConfirmAction('finish')} className="bg-success hover:bg-success/90">
              <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Concluir
            </Button>
          ) : null}
        </div>

        {/* Botão Reiniciar separado, discreto */}
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive text-xs"
            onClick={() => setConfirmAction('reset')}
          >
            <RotateCcw className="h-3 w-3 mr-1" /> Reiniciar votação
          </Button>
        </div>

        {showDevices && (
          <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Monitor className="h-4 w-4 text-muted-foreground" /> Urnas conectadas
              </p>
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                devices.filter((d) => d.activated).length > 0
                  ? 'bg-success/15 text-success'
                  : 'bg-warning/15 text-warning'
              }`}>
                {devices.filter((d) => d.activated).length}/{devices.length} online
              </span>
            </div>
            <DeviceRegistration electionId={electionId} devices={devices} onRefresh={onRefresh} disabled={false} />
          </div>
        )}

        {/* QR Code & Link */}
        {votingMode === 'both' ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="celular" className="text-xs gap-1">
                <Smartphone className="h-3.5 w-3.5" /> Celular
              </TabsTrigger>
              <TabsTrigger value="urna" className="text-xs gap-1">
                <Monitor className="h-3.5 w-3.5" /> Urna Fixa ({devices.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="celular">
              <div className="flex items-center gap-3 p-3 border border-border/60 bg-muted/40 rounded-lg">
                <div className="relative cursor-pointer" onClick={() => { setExpandedDeviceToken(null); setQrExpanded(true); }}>
                  <QRCodeSVG value={voteUrl} size={100} />
                  <div className="absolute inset-0 flex items-center justify-center bg-background/60 opacity-0 hover:opacity-100 transition-opacity rounded">
                    <Maximize2 className="h-5 w-5 text-foreground" />
                  </div>
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <p className="text-xs font-medium flex items-center gap-1">
                    <Smartphone className="h-3 w-3" /> Voto Individual
                  </p>
                  <code className="text-[10px] bg-muted p-1.5 rounded block break-all leading-tight">{voteUrl}</code>
                  <div className="flex gap-1.5">
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { navigator.clipboard.writeText(voteUrl); toast({ title: 'Link copiado!' }); }}>
                      <Copy className="h-3 w-3 mr-1" /> Copiar
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setExpandedDeviceToken(null); setQrExpanded(true); }}>
                      <Maximize2 className="h-3 w-3 mr-1" /> Expandir
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="urna">
              <div className="space-y-2">
                {devices.map((d) => {
                  const deviceUrl = `${window.location.origin}/vote/${electionId}?mode=urna&token=${d.token}`;
                  return (
                    <div key={d.id} className="p-3 border border-border/60 bg-muted/40 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium flex items-center gap-1.5">
                          <Monitor className="h-3 w-3" /> {d.label}
                        </p>
                        {d.activated ? (
                          <span className="text-[10px] text-success font-medium">✓ Ativada</span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">Aguardando</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="relative cursor-pointer" onClick={() => { setExpandedDeviceToken(d.token); setQrExpanded(true); }}>
                          <QRCodeSVG value={deviceUrl} size={80} />
                          <div className="absolute inset-0 flex items-center justify-center bg-background/60 opacity-0 hover:opacity-100 transition-opacity rounded">
                            <Maximize2 className="h-4 w-4 text-foreground" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <code className="text-[10px] bg-muted p-1.5 rounded block break-all leading-tight">{deviceUrl}</code>
                          <div className="flex gap-1.5">
                            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { navigator.clipboard.writeText(deviceUrl); toast({ title: 'Link copiado!' }); }}>
                              <Copy className="h-3 w-3 mr-1" /> Copiar
                            </Button>
                            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setExpandedDeviceToken(d.token); setQrExpanded(true); }}>
                              <Maximize2 className="h-3 w-3 mr-1" /> Expandir
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {devices.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">Nenhum dispositivo cadastrado.</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="flex items-center gap-3 p-3 border border-border/60 bg-muted/40 rounded-lg">
            <div className="relative cursor-pointer" onClick={() => setQrExpanded(true)}>
              <QRCodeSVG value={voteUrl} size={100} />
              <div className="absolute inset-0 flex items-center justify-center bg-background/60 opacity-0 hover:opacity-100 transition-opacity rounded">
                <Maximize2 className="h-5 w-5 text-foreground" />
              </div>
            </div>
            <div className="flex-1 min-w-0 space-y-1.5">
              <p className="text-xs font-medium flex items-center gap-1">
                <LinkIcon className="h-3 w-3" /> Link da Urna
              </p>
              <code className="text-[10px] bg-muted p-1.5 rounded block break-all leading-tight">{voteUrl}</code>
              <div className="flex gap-1.5">
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={copyLink}>
                  <Copy className="h-3 w-3 mr-1" /> Copiar
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setQrExpanded(true)}>
                  <Maximize2 className="h-3 w-3 mr-1" /> Expandir
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen QR Dialog */}
      <Dialog open={qrExpanded} onOpenChange={setQrExpanded}>
        <DialogContent className="max-w-[100vw] max-h-[100vh] w-screen h-screen p-0 border-none rounded-none flex flex-col items-center justify-center bg-background [&>button]:hidden">
          <button
            onClick={() => setQrExpanded(false)}
            className="absolute top-4 right-4 z-50 p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
          <div className="flex flex-col items-center gap-6 p-8">
            {electionName && (
              <h2 className="text-xl font-bold text-center">{electionName}</h2>
            )}
            {expandedDeviceToken && (
              <p className="text-sm text-muted-foreground">
                {devices.find(d => d.token === expandedDeviceToken)?.label}
              </p>
            )}
            <QRCodeSVG
              value={expandedDeviceToken
                ? `${window.location.origin}/vote/${electionId}?mode=urna&token=${expandedDeviceToken}`
                : voteUrl}
              size={Math.min(window.innerWidth - 80, window.innerHeight - 200, 400)}
            />
            <code className="text-sm bg-muted p-3 rounded-lg break-all text-center max-w-sm">
              {expandedDeviceToken
                ? `${window.location.origin}/vote/${electionId}?mode=urna&token=${expandedDeviceToken}`
                : voteUrl}
            </code>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === 'reset' ? 'Reiniciar votação?' : 'Concluir votação?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === 'reset'
                ? 'Todos os votos serão apagados. Presença e candidatos serão mantidos.'
                : 'A votação será encerrada e o resultado será exibido.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAction === 'reset' ? handleReset : handleFinish}>
              {loading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
