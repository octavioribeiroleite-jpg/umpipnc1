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
interface Candidate { id: string; name: string; birth_date?: string | null; }

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
  const [partialRows, setPartialRows] = useState<{ candidate_id: string; name: string; count: number; pct: number; elected: boolean }[]>([]);
  const [partialBlanks, setPartialBlanks] = useState(0);
  const [partialNeeded, setPartialNeeded] = useState(0);
  type VotingPhase = 'voting' | 'apurando' | 'resultado';
  const [phase, setPhase] = useState<VotingPhase>('voting');
  const { toast } = useToast();
  const inFlightRef = useRef(false);
  const pendingRef = useRef(false);

  const voteUrl = `${window.location.origin}/vote/${electionId}`;
  const [activeTab, setActiveTab] = useState<string>('celular');
  const diff = Math.max(0, totalPresent - voteCount);
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
      const MAX_ROUNDS = 3;

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

        const vagas = seatsCount - elected.size;

        if (round === 1) {
          // 1º escrutínio: elege quem atingiu maioria absoluta
          const aprovados = sorted.filter(([, count]) =>
            majorityRule === 'absolute_50' ? (count as number) >= needed : true
          );

          const cutoffIndex = vagas - 1;
          const cutoffCount = aprovados[cutoffIndex]?.[1];
          const nextCount = aprovados[vagas]?.[1];
          const tieAtCutoff = cutoffCount !== undefined && cutoffCount === nextCount;

          if (!tieAtCutoff) {
            aprovados.slice(0, vagas).forEach(([id]) => elected.add(id));
          } else {
            aprovados
              .filter(([, count]) => (count as number) > (cutoffCount as number))
              .forEach(([id]) => elected.add(id));
          }
        } else if (round < MAX_ROUNDS) {
          // 2º escrutínio: top candidatos disputam maioria absoluta
          const cutoffIndex = vagas - 1;
          const cutoffCount = sorted[cutoffIndex]?.[1];
          const nextCount = sorted[vagas]?.[1];
          const tieAtCutoff = cutoffCount !== undefined && cutoffCount === nextCount;

          if (!tieAtCutoff) {
            sorted
              .filter(([, count]) => (count as number) >= needed)
              .slice(0, vagas)
              .forEach(([id]) => elected.add(id));
          }
          // Se empate: não elege ninguém, vai pro próximo escrutínio
        } else {
          // 3º escrutínio (MAX_ROUNDS): desempate pelo mais velho
          const cutoffIndex = vagas - 1;
          const cutoffCount = sorted[cutoffIndex]?.[1];
          const nextCount = sorted[vagas]?.[1];
          const tieAtCutoff = cutoffCount !== undefined && cutoffCount === nextCount;

          if (!tieAtCutoff) {
            sorted.slice(0, vagas).forEach(([id]) => elected.add(id));
          } else {
            const tiedIds = sorted
              .filter(([, count]) => (count as number) === cutoffCount)
              .map(([id]) => id);

            const electedBefore = elected.size;
            sorted
              .filter(([, count]) => (count as number) > (cutoffCount as number))
              .forEach(([id]) => elected.add(id));

            const vagasRestantes = vagas - (elected.size - electedBefore);

            const tiedCandidates = tiedIds
              .map((id) => candidates.find((c) => c.id === id))
              .filter(Boolean)
              .sort((a, b) => {
                if (!a?.birth_date) return 1;
                if (!b?.birth_date) return -1;
                return new Date(a.birth_date).getTime() - new Date(b.birth_date).getTime();
              });

            tiedCandidates.slice(0, vagasRestantes).forEach((c) => {
              if (c) elected.add(c.id);
            });
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

  // Resetar fase quando mudar de round
  useEffect(() => {
    setPhase('voting');
  }, [currentRound]);

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
    if (voteCount < totalPresent || !electionId) {
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
        const sorted = Object.entries(counts)
          .map(([candidate_id, count]) => ({
            candidate_id,
            count: count as number,
            pct: totalBallots > 0 ? Math.round(((count as number) / totalBallots) * 100) : 0,
          }))
          .sort((a, b) => b.count - a.count);

        // Vagas restantes para este escrutínio
        const seatsRemaining = Math.max(0, seatsCount - electedCount);
        // Verifica empate na posição de corte (entre o último top-N e o próximo)
        const cutoff = sorted[seatsRemaining - 1]?.count;
        const next = sorted[seatsRemaining]?.count;
        const tieAtCutoff = cutoff !== undefined && cutoff === next;

        const rows = sorted.map((r, i) => {
          let elected = false;
          if (seatsRemaining > 0 && i < seatsRemaining && !tieAtCutoff) {
            if (currentRound === 1) {
              elected = majorityRule === 'absolute_50' ? r.count >= needed : true;
            } else {
              // 2º e 3º escrutínio: exige maioria absoluta
              elected = r.count >= needed;
            }
          }
          return {
            ...r,
            name: candidates.find((c) => c.id === r.candidate_id)?.name || 'Desconhecido',
            elected,
          };
        });
        setPartialRows(rows);
      });
  }, [diff, currentRound, electionId, majorityRule, seatsCount, electedCount]);

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
            {voteCount >= totalPresent ? (
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

        {/* FASE: VOTING — todos votaram, aguardando apuração */}
        {voteCount >= totalPresent && phase === 'voting' && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-center">
            <CheckCircle className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="text-sm font-semibold mb-1">Todos os votos foram recebidos</p>
            <p className="text-xs text-muted-foreground mb-3">
              {voteCount} cédula(s) registrada(s). Clique para apurar o resultado.
            </p>
            <Button className="w-full" onClick={() => setPhase('apurando')}>
              <BarChart2 className="w-4 h-4 mr-2" />
              Apurar resultado
            </Button>
          </div>
        )}

        {/* FASE: APURANDO — mostra resultado parcial */}
        {voteCount >= totalPresent && phase === 'apurando' && partialRows.length > 0 && (
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-semibold">
                  Resultado — {currentRound}º escrutínio
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {currentRound === 1
                  ? `Maioria necessária: ${partialNeeded} votos`
                  : currentRound < 3
                  ? `${currentRound}º escrutínio — top ${Math.max(0, seatsCount - electedCount) + 1} disputam maioria absoluta`
                  : `3º escrutínio final — empate desfeito pelo mais velho`}
              </span>
            </div>

            <div className="flex flex-col gap-2 mb-3">
              {partialRows.map((r, i) => {
                const candidate = candidates.find((c) => c.id === r.candidate_id);
                const isTied = tieAlert.includes(r.candidate_id);
                return (
                  <div
                    key={r.candidate_id}
                    className={`flex flex-col gap-1 p-2 rounded-md ${
                      isTied ? 'bg-warning/10 border border-warning/30' :
                      r.elected && currentRound === 1 ? 'bg-success/10 border border-success/30' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        {i === 0 && !isTied && <Medal className="w-3 h-3 text-warning" />}
                        <span className={r.elected ? 'font-bold text-success' : i === 0 ? 'font-semibold' : 'text-muted-foreground'}>
                          {candidate?.name || 'Desconhecido'}
                        </span>
                        {r.elected && (
                          <span className="text-xs font-medium text-success bg-success/15 px-1.5 py-0.5 rounded-full">
                            ✓ Eleito
                          </span>
                        )}
                        {isTied && (
                          <span className="text-xs font-medium text-warning bg-warning/20 px-1.5 py-0.5 rounded-full">
                            Empatado
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-bold">{r.count} votos</span>
                        <span className="text-muted-foreground">{r.pct}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${
                          r.elected ? 'bg-success' :
                          isTied ? 'bg-warning' :
                          i === 0 ? 'bg-primary' : 'bg-muted-foreground/30'
                        }`}
                        style={{ width: `${r.pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {partialBlanks > 0 && (
              <p className="text-xs text-muted-foreground mb-2">
                Brancos / Nulos: {partialBlanks}
              </p>
            )}

            {tieAlert.length > 0 && (
              <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 mb-3">
                <p className="text-xs font-semibold text-warning mb-1">
                  ⚠️ Empate detectado
                </p>
                <p className="text-xs text-muted-foreground mb-2">
                  Candidatos empatados com {partialRows.find(r => tieAlert.includes(r.candidate_id))?.count} votos:
                </p>
                <div className="flex flex-wrap gap-1 mb-2">
                  {tieAlert.map((id) => {
                    const c = candidates.find((x) => x.id === id);
                    return (
                      <span key={id} className="px-2 py-0.5 text-xs rounded-full bg-warning/20 text-warning font-medium">
                        {c?.name || id}
                      </span>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  O Conselho pode realizar novo escrutínio entre os empatados ou decidir conforme regimento.
                </p>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              className="w-full mb-2"
              onClick={() => setPhase('resultado')}
            >
              Confirmar resultado e avançar
            </Button>
          </div>
        )}

        {/* FASE: RESULTADO — ações finais */}
        {voteCount >= totalPresent && phase === 'resultado' && (
          <div className="rounded-lg border border-border bg-muted/20 p-3 mb-2">
            <p className="text-xs font-semibold mb-2">
              {electedCount >= seatsCount
                ? `✅ ${electedCount} vaga(s) preenchida(s). Pronto para concluir.`
                : `⚠️ ${electedCount} de ${seatsCount} vaga(s) preenchida(s). Inicie o próximo escrutínio.`}
            </p>
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
          <div className={`p-2 rounded-lg border shadow-sm ${voteCount >= totalPresent ? 'border-success/50 bg-success/5' : 'border-warning/50 bg-warning/10'}`}>
            <p className={`text-lg font-bold ${voteCount >= totalPresent ? 'text-success' : 'text-warning'}`}>
              {diff}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {voteCount >= totalPresent ? 'Todos votaram' : 'Aguardando voto'}
            </p>
          </div>
        </div>

        {/* Botões principais — só aparecem na fase correta */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/eleicao/${electionId}/apresentar`, '_blank', 'noopener')}
            className="flex items-center gap-2"
          >
            <Monitor className="w-4 h-4" />
            Abrir tela de apresentação
            <ExternalLink className="h-3 w-3 opacity-60" />
          </Button>

          {phase === 'resultado' && isMultiSeat && electedCount < seatsCount && currentRound < 3 && (
            tieAlert.length > 0 ? (
              <Button variant="outline" disabled className="text-warning border-warning/40">
                ⚠️ Empate — resolva antes de avançar
              </Button>
            ) : (
              <Button onClick={handleNextRound} disabled={loading} className="bg-primary">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {currentRound + 1}º escrutínio →
              </Button>
            )
          )}

          {phase === 'resultado' && isMultiSeat && electedCount < seatsCount && currentRound >= 3 && (
            <div className="rounded-lg border border-warning/40 bg-warning/10 p-3">
              <p className="text-xs font-semibold text-warning mb-1">
                ⚠️ Máximo de escrutínios atingido
              </p>
              <p className="text-xs text-muted-foreground">
                O desempate foi aplicado automaticamente pelo critério de idade (mais velho eleito).
                Caso não haja birth_date cadastrado, o Conselho deve decidir conforme o regimento.
              </p>
            </div>
          )}

          {phase === 'resultado' && electedCount >= seatsCount && (
            <Button onClick={() => setConfirmAction('finish')} className="bg-success hover:bg-success/90">
              <CheckCircle className="w-4 h-4 mr-2" />
              Concluir
            </Button>
          )}
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
