import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, Loader2, UserCheck, Vote, XCircle, ShieldCheck, Monitor, LogIn, ChevronLeft, ChevronRight, Circle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import voteConfirmSound from '@/assets/vote-confirm.mp3';
import { isBallotConfirmed } from '@/components/eleicoes/ballot-response';

interface Election { id: string; name: string; position: string; status: string; voting_mode?: string; type?: string; seats_count?: number; max_choices_per_ballot?: number; current_round?: number; majority_rule?: string; round2_candidate_ids?: string[] | null; }
interface Candidate { id: string; name: string; photo_url: string | null; photo_urls?: string[]; display_order: number; birth_date?: string | null; }

function getDeviceId(): string {
  const key = 'vote_device_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

function getPhotoUrls(c: Candidate): string[] {
  if (Array.isArray(c.photo_urls) && c.photo_urls.length > 0) return c.photo_urls;
  if (c.photo_url) return [c.photo_url];
  return [];
}

function CandidatePhotos({ photos, name, size = 'md' }: { photos: string[]; name: string; size?: 'md' | 'lg' }) {
  const [current, setCurrent] = useState(0);
  const sizeClass = size === 'lg' ? 'w-[192px] h-[192px] max-w-full' : 'w-[144px] h-[144px] max-w-full';

  if (photos.length === 0) {
    return (
      <div className={`${sizeClass} rounded-xl overflow-hidden bg-muted flex items-center justify-center`}>
        <UserCheck className="h-12 w-12 text-muted-foreground" />
      </div>
    );
  }

  if (photos.length === 1) {
    return (
      <div className={`${sizeClass} rounded-xl overflow-hidden bg-muted`}>
        <img src={photos[0]} alt={name} className="w-full h-full object-contain" />
      </div>
    );
  }

  return (
    <div className="flex w-full min-w-0 flex-col items-center gap-2">
      <div className={`relative ${sizeClass} rounded-xl overflow-hidden bg-muted`}>
        <img src={photos[current]} alt={name} className="w-full h-full object-contain" />
        <button
          onClick={(e) => { e.stopPropagation(); setCurrent(p => p > 0 ? p - 1 : photos.length - 1); }}
          type="button" aria-label={`Foto anterior de ${name}`} className="absolute left-0 top-1/2 -translate-y-1/2 flex h-[48px] w-[48px] items-center justify-center bg-black/60 rounded-full"
        >
          <ChevronLeft className="h-4 w-4 text-white" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setCurrent(p => p < photos.length - 1 ? p + 1 : 0); }}
          type="button" aria-label={`Próxima foto de ${name}`} className="absolute right-0 top-1/2 -translate-y-1/2 flex h-[48px] w-[48px] items-center justify-center bg-black/60 rounded-full"
        >
          <ChevronRight className="h-4 w-4 text-white" />
        </button>
      </div>
      <div className="flex max-w-full flex-wrap justify-center gap-1">
        {photos.map((_, i) => (
          <button
            key={i}
            onClick={(e) => { e.stopPropagation(); setCurrent(i); }}
            type="button" aria-label={`Ver foto ${i + 1} de ${name}`} aria-pressed={i === current}
            className={`h-[48px] w-[48px] rounded-full border-[18px] border-background transition-colors ${i === current ? 'bg-primary' : 'bg-muted-foreground/30'}`}
          />
        ))}
      </div>
    </div>
  );
}

function CandidateStartPreview({ candidates, isCamisa }: { candidates: Candidate[]; isCamisa: boolean }) {
  if (candidates.length === 0) return null;

  return (
    <div className="w-full overflow-x-auto pb-1">
      <div className="flex min-w-max justify-center gap-3 px-1 sm:min-w-0 sm:flex-wrap">
        {candidates.map((candidate) => {
          const [photo] = getPhotoUrls(candidate);
          return (
            <div key={candidate.id} className="w-24 shrink-0 rounded-xl border border-border bg-muted/30 p-2 text-center shadow-sm sm:w-28">
              <div className="mx-auto h-16 w-16 overflow-hidden rounded-lg bg-muted sm:h-20 sm:w-20">
                {photo ? (
                  <img src={photo} alt={candidate.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <UserCheck className="h-7 w-7 text-muted-foreground" />
                  </div>
                )}
              </div>
              <p className="mt-2 min-h-8 break-words text-xs font-semibold leading-tight text-foreground">
                {isCamisa ? candidate.name : candidate.name}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const MAX_ROUNDS = 3;

function computeElectedIds(
  votes: any[],
  seatsCount: number,
  currentRound: number,
  majorityRule = 'simple',
  candidates: Candidate[] = [],
) {
  const elected = new Set<string>();
  for (let round = 1; round < currentRound; round += 1) {
    const roundVotes = votes.filter((v) => (v.round_number || 1) === round);
    const totalBallots = new Set(roundVotes.map((v) => v.ballot_id || v.id)).size;
    const needed = Math.floor(totalBallots / 2) + 1;
    const counts = roundVotes.reduce((acc: Record<string, number>, v: any) => {
      if (!v.is_blank && v.candidate_id && !elected.has(v.candidate_id)) {
        acc[v.candidate_id] = (acc[v.candidate_id] || 0) + 1;
      }
      return acc;
    }, {});
    const rows = Object.entries(counts)
      .map(([candidate_id, count]) => ({ candidate_id, count: count as number }))
      .sort((a, b) => b.count - a.count);

    const vagas = Math.max(0, seatsCount - elected.size);
    if (vagas === 0) break;

    if (round === 1) {
      const aprovados = rows.filter((r) =>
        majorityRule === 'absolute_50' ? r.count >= needed : true,
      );
      const cutoffCount = aprovados[vagas - 1]?.count;
      const nextCount = aprovados[vagas]?.count;
      const tieAtCutoff = cutoffCount !== undefined && cutoffCount === nextCount;
      if (!tieAtCutoff) {
        aprovados.slice(0, vagas).forEach((r) => elected.add(r.candidate_id));
      } else {
        aprovados
          .filter((r) => r.count > cutoffCount)
          .forEach((r) => elected.add(r.candidate_id));
      }
    } else if (round < MAX_ROUNDS) {
      // 2º escrutínio: maioria SIMPLES (top N), sem exigir 50%+1
      const cutoffCount = rows[vagas - 1]?.count;
      const nextCount = rows[vagas]?.count;
      const tieAtCutoff = cutoffCount !== undefined && cutoffCount === nextCount;
      if (!tieAtCutoff) {
        rows.slice(0, vagas).forEach((r) => elected.add(r.candidate_id));
      }
    } else {
      const cutoffCount = rows[vagas - 1]?.count;
      const nextCount = rows[vagas]?.count;
      const tieAtCutoff = cutoffCount !== undefined && cutoffCount === nextCount;
      if (!tieAtCutoff) {
        rows.slice(0, vagas).forEach((r) => elected.add(r.candidate_id));
      } else {
        const clearlyElected = rows.filter((r) => r.count > cutoffCount);
        clearlyElected.forEach((r) => elected.add(r.candidate_id));
        const vagasRestantes = vagas - clearlyElected.length;
        const tiedIds = rows.filter((r) => r.count === cutoffCount).map((r) => r.candidate_id);
        const tiedByAge = tiedIds
          .map((id) => candidates.find((c) => c.id === id))
          .filter(Boolean)
          .sort((a, b) => {
            if (!a?.birth_date) return 1;
            if (!b?.birth_date) return -1;
            return new Date(a.birth_date).getTime() - new Date(b.birth_date).getTime();
          })
          .slice(0, vagasRestantes)
          .map((c) => c!.id);
        tiedByAge.forEach((id) => elected.add(id));
      }
    }
  }
  return Array.from(elected);
}

/**
 * Para o 2º+ escrutínio: exibe apenas o top (vagas_restantes + 1) candidatos
 * mais votados da rodada anterior, excluindo os já eleitos.
 */
function getTopForNextRound(
  allVotes: any[],
  candidates: Candidate[],
  electedIds: string[],
  previousRound: number,
  topN: number,
): Candidate[] {
  const prevVotes = allVotes.filter(
    (v) => (v.round_number || 1) === previousRound &&
    !v.is_blank &&
    !electedIds.includes(v.candidate_id),
  );
  const counts = prevVotes.reduce((acc: Record<string, number>, v: any) => {
    if (v.candidate_id) {
      acc[v.candidate_id] = (acc[v.candidate_id] || 0) + 1;
    }
    return acc;
  }, {});
  const remaining = candidates
    .filter((c) => !electedIds.includes(c.id))
    .sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0));
  const limit = Math.max(2, topN);
  if (remaining.length <= limit) return remaining;
  // Inclui todos os empatados na posição de corte
  const cutoffCount = counts[remaining[limit - 1].id] || 0;
  let end = limit;
  while (end < remaining.length && (counts[remaining[end].id] || 0) === cutoffCount) {
    end += 1;
  }
  return remaining.slice(0, end);
}

function SuccessScreen({ autoReset }: { autoReset: boolean }) {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-muted/30 p-4 sm:p-6 text-center">
      <div className="animate-fade-up w-full max-w-xl rounded-2xl bg-card border border-border shadow-sm px-5 py-8 sm:px-10 sm:py-12 md:px-14 md:py-16">
        <div className="relative mx-auto mb-8 w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40">
          <div className="absolute inset-0 rounded-full bg-success/10 animate-ping" />
          <div className="absolute inset-3 rounded-full bg-success/10" />
          <div className="relative w-full h-full rounded-full bg-success flex items-center justify-center shadow-xl ring-8 ring-success/15">
            <CheckCircle className="h-14 w-14 sm:h-20 sm:w-20 md:h-24 md:w-24 text-success-foreground" strokeWidth={2.5} />
          </div>
        </div>
        <h1 className="text-3xl sm:text-5xl md:text-7xl font-extrabold text-foreground mb-4 tracking-tight leading-none">
          VOTO CONFIRMADO
        </h1>
        <p className="text-xl md:text-2xl text-muted-foreground font-semibold">
          Seu voto foi registrado com sucesso!
        </p>
        {autoReset ? (
          <p className="mt-8 inline-flex items-center justify-center rounded-full bg-muted px-5 py-2.5 text-base sm:text-lg font-medium text-foreground">
            Aguarde o próximo votante
          </p>
        ) : (
          <p className="mt-8 inline-flex items-center justify-center rounded-full bg-muted px-5 py-2.5 text-base sm:text-lg font-medium text-foreground">
            Obrigado por votar!
          </p>
        )}
      </div>
    </div>
  );
}

export default function VotePublic() {
  const { electionId } = useParams<{ electionId: string }>();
  const [searchParams] = useSearchParams();
  const isUrnaMode = searchParams.get('mode') === 'urna';
  const urnaToken = searchParams.get('token') || '';

  const [election, setElection] = useState<Election | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [voteError, setVoteError] = useState('');
  const [readError, setReadError] = useState('');
  const [readRevision, setReadRevision] = useState(0);
  const voteInFlightRef = useRef(false);
  const [confirmCandidate, setConfirmCandidate] = useState<Candidate | null>(null);
  const [selectedCandidates, setSelectedCandidates] = useState<Candidate[]>([]);
  const [confirmSelection, setConfirmSelection] = useState(false);
  const [confirmBlank, setConfirmBlank] = useState(false);
  const [voteSuccess, setVoteSuccess] = useState(false);
  const [readyToVote, setReadyToVote] = useState(false);
  const [alreadyVoted, setAlreadyVoted] = useState(false);
  const [showNullWarning, setShowNullWarning] = useState(false);

  // Urna fixa: ativada automaticamente ao escanear o QR Code (token válido).
  const [urnaAuthenticated, setUrnaAuthenticated] = useState(false);
  const [deviceLabel, setDeviceLabel] = useState('');
  const [invalidToken, setInvalidToken] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUnlockedRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const audioReadyRef = useRef<Promise<AudioBuffer | null> | null>(null);
  const resetTimeoutRef = useRef<number | null>(null);
  const isSharedBehavior = isUrnaMode && urnaAuthenticated;
  const isIndividual = !isSharedBehavior && (election?.voting_mode === 'individual' || election?.voting_mode === 'both');
  const ballotRequestRef = useRef<string | null>(null);
  const readVotes = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke('election-vote', { body: { action: 'history', election_id: electionId } });
    return { data: data?.votes, error: error || (!Array.isArray(data?.votes) ? new Error('Histórico indisponível') : null) };
  }, [electionId]);
  const checkPreviousVote = useCallback(async (deviceId: string) => {
    const { data, error } = await supabase.functions.invoke('election-vote', { body: { action: 'already', election_id: electionId, device_id: deviceId } });
    return { count: data?.count, error: error || (!Number.isInteger(data?.count) || data.count < 0 ? new Error('Conferência indisponível') : null) };
  }, [electionId]);
  const isCamisa = election?.type === 'camisa';
  const seatsCount = election?.seats_count || 1;
  const currentRound = election?.current_round || 1;
  const [electedIds, setElectedIds] = useState<string[]>([]);
  const [allVotes, setAllVotes] = useState<any[]>([]);
  const remainingSeats = Math.max(1, seatsCount - electedIds.length);
  const maxChoices = Math.max(
    1,
    Math.min(election?.max_choices_per_ballot || 1, remainingSeats),
  );
  const isMultiSeat = !isCamisa && maxChoices > 1;
  const eligibleCandidates = isCamisa
    ? candidates
    : currentRound <= 1
      ? candidates.filter((c) => !electedIds.includes(c.id))
      : (election?.round2_candidate_ids && election.round2_candidate_ids.length > 0)
        ? candidates.filter(
            (c) => election.round2_candidate_ids!.includes(c.id) && !electedIds.includes(c.id),
          )
        : getTopForNextRound(
            allVotes,
            candidates.filter((c) => !electedIds.includes(c.id)),
            electedIds,
            currentRound - 1,
            remainingSeats + 1,
          );
  const autoBlankSlots = Math.max(0, maxChoices - selectedCandidates.length);
  const totalSelectedMarks = selectedCandidates.length + autoBlankSlots;

  useEffect(() => {
    ensureAudio();
    void ensureAudioContext();
    return () => {
      if (resetTimeoutRef.current) window.clearTimeout(resetTimeoutRef.current);
    };
  }, []);

  // (Sem autenticação manual: a urna fica online automaticamente
  //  assim que o token do QR Code é validado abaixo.)

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      if (!electionId) { setReadError('A eleição está indisponível.'); setLoading(false); return; }
      setLoading(true);
      setReadError('');
      try {
        if (isUrnaMode) {
          if (!urnaToken) { if (active) setInvalidToken(true); return; }
          const { data: result, error: deviceError } = await supabase.functions.invoke('election-vote', { body: { action: 'device', election_id: electionId, token: urnaToken } });
          if (deviceError) {
            if (deviceError.context?.status === 403) { if (active) setInvalidToken(true); return; }
            throw deviceError;
          }
          if (!result || !('device' in result)) throw new Error('Dispositivo indisponível');
          if (!result.device) { if (active) setInvalidToken(true); return; }
          if (!active) return;
          setInvalidToken(false);
          setDeviceLabel(result.device.label || '');
          setUrnaAuthenticated(true);
        }
        const [elRes, caRes] = await Promise.all([
          supabase.from('elections' as any).select('*').eq('id', electionId).single(),
          supabase.from('election_candidates' as any).select('*').eq('election_id', electionId).order('display_order' as any),
        ]);
        if (elRes.error || caRes.error || !elRes.data || !Array.isArray(caRes.data)) throw elRes.error || caRes.error || new Error('Eleição indisponível');
        const elData = elRes.data as any;
        const candidatesData = caRes.data.map((candidate: any) => ({...candidate, photo_urls: Array.isArray(candidate.photo_urls) ? candidate.photo_urls : []})) as Candidate[];
        const { data: voteRows, error: historyError } = await readVotes();
        if (historyError) throw historyError;
        let hasPreviousVote = false;
        if (!isUrnaMode) {
          const { count, error: previousVoteError } = await checkPreviousVote(getDeviceId());
          if (previousVoteError) throw previousVoteError;
          hasPreviousVote = count > 0;
        }
        if (!active) return;
        setElection(elData);
        setCandidates(candidatesData);
        setAllVotes(voteRows);
        setElectedIds(computeElectedIds(voteRows, elData.seats_count || 1, elData.current_round || 1, elData.majority_rule || 'simple', candidatesData));
        setAlreadyVoted(hasPreviousVote);
      } catch {
        if (active) setReadError('Não foi possível consultar a votação. Confira sua conexão e tente novamente.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void fetchData();
    return () => { active = false; };
  }, [electionId, isUrnaMode, urnaToken, readRevision, readVotes, checkPreviousVote]);

  // Realtime: sincroniza urna com ações do admin (avanço de escrutínio / encerramento)
  useEffect(() => {
    if (!electionId) return;
    let active = true;

    const channel = supabase
      .channel(`vote-public-election-${electionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'elections',
          filter: `id=eq.${electionId}`,
        },
        async (payload: any) => {
          const updated = payload.new;
          const previous = payload.old;
          if (!active || !updated || updated.id !== electionId) return;

          // Eleição encerrada → mostra tela de encerramento
          if (updated.status === 'finished' && previous.status !== 'finished') {
            setElection(updated);
            return;
          }

          // Avançou para novo escrutínio → reseta urna e recarrega dados
          if (updated.current_round !== previous.current_round) {
            setElection(updated);

            setLoading(true);
            let votesData: any[];
            try {
              const { data: voteRows, error: historyError } = await readVotes();
              if (historyError) throw historyError;
              if (!active) return;
              votesData = voteRows;
              setReadError('');
            } catch {
              if (active) setReadError('Não foi possível consultar o novo escrutínio. Tente novamente antes de votar.');
              return;
            } finally { if (active) setLoading(false); }
            if (!active) return;
            setAllVotes(votesData);
            setElectedIds(
              computeElectedIds(
                votesData,
                updated.seats_count || 1,
                updated.current_round || 1,
                updated.majority_rule || 'simple',
                candidates,
              ),
            );

            setVoteSuccess(false);
            setReadyToVote(false);
            setSelectedCandidates([]);
            setConfirmCandidate(null);
            setConfirmBlank(false);
            setConfirmSelection(false);
            setShowNullWarning(false);
            setAlreadyVoted(false);
            setVoteError('');
            ballotRequestRef.current = null;
            return;
          }

          setElection(updated);
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [electionId, candidates, readVotes]);

  // (handleUrnaAuth removido — urna agora é ativada automaticamente pelo QR Code.)

  const ensureAudio = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(voteConfirmSound);
      audioRef.current.preload = 'auto';
      audioRef.current.volume = 1.0;
      audioRef.current.load();
    }
    return audioRef.current;
  };

  const ensureAudioContext = async () => {
    try {
      const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
      if (!Ctx) return null;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new Ctx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      if (!audioBufferRef.current) {
        if (!audioReadyRef.current) {
          audioReadyRef.current = fetch(voteConfirmSound)
            .then((res) => res.arrayBuffer())
            .then((arr) => ctx.decodeAudioData(arr.slice(0)))
            .then((buffer) => {
              audioBufferRef.current = buffer;
              return buffer;
            })
            .catch((err) => {
              console.warn('[vote-audio] buffer load failed:', err);
              audioReadyRef.current = null;
              return null;
            });
        }
        await audioReadyRef.current;
      }
      return ctx;
    } catch (err) {
      console.warn('[vote-audio] webaudio init failed:', err);
      return null;
    }
  };

  const primeAudio = () => {
    // CRITICAL: must run synchronously inside a user gesture
    try {
      const a = ensureAudio();
      if (!audioUnlockedRef.current) {
        a.muted = true;
        const p = a.play();
        if (p && typeof p.then === 'function') {
          p.then(() => {
            a.pause();
            a.currentTime = 0;
            a.muted = false;
            audioUnlockedRef.current = true;
            console.log('[vote-audio] html unlocked');
          }).catch((err) => {
            console.warn('[vote-audio] prime failed:', err);
            a.muted = false;
          });
        }
      }
      // Kick off WebAudio init (async, but resume() must be called from gesture)
      void ensureAudioContext();
    } catch (err) {
      console.warn('[vote-audio] prime error:', err);
    }
  };

  const playFallbackBeep = () => {
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      const ctx = audioCtxRef.current || new Ctx();
      audioCtxRef.current = ctx;
      if (ctx.state === 'suspended') void ctx.resume();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.65, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      oscillator.connect(gain).connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.24);
    } catch (err) {
      console.warn('[vote-audio] fallback beep failed:', err);
    }
  };

  const playUrnaSound = async () => {
    // Try HTMLAudio first: it is the most reliable after the user's confirm tap.
    try {
      const a = ensureAudio();
      a.muted = false;
      a.volume = 1.0;
      a.currentTime = 0;
      const p = a.play();
      if (p && typeof p.then === 'function') await p;
      return true;
    } catch (err) {
      console.warn('[vote-audio] html play failed, trying webaudio:', err);
    }

    // Fallback to WebAudio (allows gain > 1.0 for louder playback)
    try {
      const ctx = await ensureAudioContext();
      if (ctx && audioBufferRef.current) {
        const src = ctx.createBufferSource();
        src.buffer = audioBufferRef.current;
        const gain = ctx.createGain();
        gain.gain.value = 2.5; // amplify above 100%
        src.connect(gain).connect(ctx.destination);
        src.start(0);
        return true;
      }
    } catch (err) {
      console.warn('[vote-audio] webaudio play failed, falling back:', err);
    }
    playFallbackBeep();
    return false;
  };

  const handleVote = async () => {
    const choices = confirmBlank ? [] : (isMultiSeat ? selectedCandidates : (confirmCandidate ? [confirmCandidate] : []));
    const blanksToRecord = confirmBlank ? (isMultiSeat ? maxChoices : 1) : (isMultiSeat ? autoBlankSlots : 0);
    if (voteInFlightRef.current || (!confirmBlank && choices.length === 0 && blanksToRecord === 0) || !electionId) return;
    voteInFlightRef.current = true;
    const audioWarmup = ensureAudioContext();
    setVoting(true);
    setVoteError('');
    const ballotId = ballotRequestRef.current ??= crypto.randomUUID();
    try {
      if (isIndividual) {
        const deviceId = getDeviceId();
        const { count, error } = await checkPreviousVote(deviceId);
        if (error) throw error;
        if (count && count > 0) { setAlreadyVoted(true); setConfirmCandidate(null); setConfirmBlank(false); return; }
      }
      const response = await supabase.functions.invoke('election-vote', { body: {
        action: 'cast', election_id: electionId, token: isUrnaMode ? urnaToken : null,
        device_id: isIndividual ? getDeviceId() : null, ballot_id: ballotId, round_number: currentRound,
        choices: choices.map(c => c.id), blanks: blanksToRecord,
      } });
      if (!isBallotConfirmed(response)) throw new Error('Voto não confirmado');
      if (isIndividual) localStorage.setItem(`voted_${electionId}_${currentRound}`, 'true');
      await audioWarmup;
      await playUrnaSound();
      setConfirmCandidate(null);
      setSelectedCandidates([]);
      setConfirmBlank(false);
      setConfirmSelection(false);
      setShowNullWarning(false);
      ballotRequestRef.current = null;
      setVoteSuccess(true);
      if (isSharedBehavior || (!isIndividual && !isUrnaMode)) {
        if (resetTimeoutRef.current) window.clearTimeout(resetTimeoutRef.current);
        resetTimeoutRef.current = window.setTimeout(() => {
          setVoteSuccess(false);
          setReadyToVote(false);
          setConfirmCandidate(null);
        }, 1500);
      }
    } catch {
      setVoteError('Não foi possível confirmar o voto. Tente novamente. Sua seleção foi mantida.');
    } finally {
      voteInFlightRef.current = false;
      setVoting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (readError && election?.status !== 'finished') {
    return <main className="min-h-dvh flex items-center justify-center bg-background p-[16px]">
      <section className="w-full max-w-[760px] rounded-2xl border border-border bg-card p-[24px] text-center space-y-4">
        <h1 className="text-2xl font-bold">Não foi possível consultar a votação</h1>
        <p role="alert" className="text-base leading-relaxed text-muted-foreground">{readError}</p>
        <Button className="min-h-[48px]" onClick={() => setReadRevision(revision => revision + 1)}>Tentar novamente</Button>
      </section>
    </main>;
  }

  if (invalidToken) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-background p-6 text-center">
        <XCircle className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Dispositivo Não Cadastrado</h1>
        <p className="text-muted-foreground">Este link de urna fixa não é válido ou o dispositivo não foi cadastrado.</p>
      </div>
    );
  }

  if (!election || election.status !== 'open') {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-background p-6 text-center">
        <XCircle className="h-16 w-16 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Votação Indisponível</h1>
        <p className="text-muted-foreground">
          {election?.status === 'finished' ? 'Esta votação já foi encerrada.' : 'Esta votação ainda não foi iniciada.'}
        </p>
      </div>
    );
  }

  if (!isCamisa && currentRound > MAX_ROUNDS) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-background p-6 text-center">
        <ShieldCheck className="h-16 w-16 text-warning mb-4" />
        <h1 className="text-2xl font-bold mb-2">Escrutínios Encerrados</h1>
        <p className="text-muted-foreground max-w-md">
          Número máximo de escrutínios atingido. Aguarde o admin para encerrar a eleição.
        </p>
      </div>
    );
  }

  // (Tela de autenticação removida — urna fica online direto pelo QR Code.)

  if (alreadyVoted) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-background p-6 text-center">
        <div className="animate-fade-up">
          <ShieldCheck className="h-24 w-24 text-primary mx-auto mb-6" />
          <h1 className="text-3xl font-bold mb-2">Você já votou</h1>
          <p className="text-muted-foreground text-lg">Seu voto já foi computado nesta eleição.</p>
        </div>
      </div>
    );
  }

  if (voteSuccess) {
    const isAutoReset = isSharedBehavior || !isIndividual;
    return (
      <SuccessScreen autoReset={isAutoReset} />
    );
  }

  // Tela de alerta: cédula incompleta (votos serão contados como nulos)
  if (showNullWarning && isMultiSeat) {
    const nullCount = maxChoices - selectedCandidates.length;
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-8">
        <div className="w-full max-w-md rounded-2xl border-2 border-warning bg-warning/10 p-6 shadow-lg flex flex-col gap-5">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-warning text-warning-foreground text-4xl font-bold">
              ⚠️
            </div>
            <h2 className="text-2xl font-extrabold text-foreground">Atenção!</h2>
            <p className="text-foreground font-medium text-base">
              Você preencheu <strong>{selectedCandidates.length} de {maxChoices}</strong> votos disponíveis.
            </p>
          </div>

          <div className="rounded-xl bg-background border border-warning/40 p-4 flex flex-col gap-2">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">Sua cédula ficará assim:</p>

            {selectedCandidates.map((c, i) => (
              <div key={c.id} className="flex items-center gap-3 py-1">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">{i + 1}</span>
                <span className="font-semibold text-foreground">{c.name}</span>
              </div>
            ))}

            {Array.from({ length: nullCount }).map((_, i) => (
              <div key={`null-${i}`} className="flex items-center gap-3 py-1">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-warning text-warning-foreground text-sm font-bold">
                  {selectedCandidates.length + i + 1}
                </span>
                <span className="font-semibold text-warning">Voto Nulo</span>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-warning/20 border border-warning px-4 py-3 text-center">
            <p className="text-foreground font-bold text-sm">
              {nullCount === 1
                ? `1 voto será contado como NULO.`
                : `${nullCount} votos serão contados como NULO.`}
            </p>
            <p className="text-muted-foreground text-sm mt-1">
              Você ainda pode voltar e selecionar mais candidatos.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                void primeAudio();
                setShowNullWarning(false);
                setConfirmSelection(true);
              }}
              className="w-full rounded-xl bg-primary py-4 text-lg font-extrabold text-primary-foreground shadow hover:bg-primary/90 transition-colors"
            >
              Estou ciente — Confirmar assim mesmo
            </button>
            <button
              onClick={() => setShowNullWarning(false)}
              className="w-full rounded-xl border-2 border-border py-4 text-lg font-semibold text-foreground hover:bg-muted transition-colors"
            >
              ← Voltar e selecionar mais
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Confirm modal
  if (confirmCandidate || confirmBlank || confirmSelection) {
    const confirmPhotos = confirmCandidate ? getPhotoUrls(confirmCandidate) : [];
    const choices = confirmBlank ? [] : (isMultiSeat ? selectedCandidates : (confirmCandidate ? [confirmCandidate] : []));
    const confirmationBlankSlots = confirmBlank ? (isMultiSeat ? maxChoices : 1) : (isMultiSeat ? autoBlankSlots : 0);
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-background p-6">
        <div className="max-w-[760px] w-full text-center space-y-6">
          <h2 className="text-xl font-bold">{confirmBlank ? 'Confirma seu voto Branco / Nulo?' : isMultiSeat ? 'Confirma seu voto em:' : isCamisa ? 'Confirma seu voto neste modelo:' : 'Confirma seu voto em:'}</h2>
          {confirmBlank ? (
            <div className="rounded-2xl border-2 border-border bg-muted/40 p-8">
              <Circle className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
              <p className="text-2xl font-bold">Branco / Nulo</p>
            </div>
          ) : isMultiSeat ? (
            <div className="space-y-2 text-left">
              {choices.map((choice, index) => (
                <div key={choice.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{index + 1}</span>
                  <span className="min-w-0 [overflow-wrap:anywhere] text-[1.125rem] font-semibold text-foreground">{choice.name}</span>
                </div>
              ))}
              {Array.from({ length: confirmationBlankSlots }).map((_, index) => (
                <div key={`blank-${index}`} className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-bold text-muted-foreground">{choices.length + index + 1}</span>
                  <span className="font-semibold text-foreground">Branco / Nulo</span>
                </div>
              ))}
            </div>
          ) : confirmCandidate && (
            <div className="flex flex-col items-center gap-4">
              <CandidatePhotos photos={confirmPhotos} name={confirmCandidate.name} size="lg" />
              <p className="[overflow-wrap:anywhere] text-2xl font-bold">{confirmCandidate.name}</p>
            </div>
          )}
          {voteError && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-base text-destructive">{voteError}</p>}
          <div className="flex flex-col gap-3 min-[700px]:flex-row">
            <button disabled={voting} onClick={() => { setConfirmCandidate(null); setConfirmBlank(false); setConfirmSelection(false); setVoteError(''); }} className="min-h-[52px] min-w-0 flex-1 px-4 py-4 rounded-xl border-2 border-border text-lg font-semibold hover:bg-muted transition-colors disabled:opacity-50">
              Cancelar
            </button>
            <button onClick={() => { void primeAudio(); void handleVote(); }} disabled={voting} className="min-h-[52px] min-w-0 flex-1 px-4 py-4 rounded-xl bg-primary text-primary-foreground text-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50">
              {voting ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : 'CONFIRMAR'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Pre-voting screen
  if ((isSharedBehavior || !isIndividual) && !readyToVote) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-muted/30 p-4 text-center sm:p-6">
        <div className="w-full max-w-2xl animate-fade-up rounded-2xl border border-border bg-card px-4 py-6 shadow-sm sm:px-8 sm:py-8">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
            <Vote className="h-9 w-9 text-primary" />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-primary">Urna pronta</p>
            <h1 className="text-2xl font-extrabold leading-tight text-foreground sm:text-3xl">{election.name}</h1>
            <p className="text-sm font-medium text-muted-foreground sm:text-base">{isCamisa ? election.position : `Cargo: ${election.position}`}</p>
            {isSharedBehavior && (
              <p className="mx-auto mt-3 inline-flex items-center justify-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Monitor className="h-3 w-3" /> Urna Fixa Ativada
              </p>
            )}
          </div>

          <div className="my-6 rounded-2xl border border-border/70 bg-muted/30 px-4 py-5">
            <p className="text-sm font-semibold text-foreground">{isMultiSeat
              ? `Até ${maxChoices} voto(s) neste escrutínio • ${currentRound}º escrutínio`
              : 'Votação segura'}</p>
            <p className="mt-1 text-xs text-muted-foreground">Os nomes e fotos aparecem somente depois de iniciar o voto.</p>
          </div>

          <button onClick={() => { void primeAudio(); setReadyToVote(true); }} className="touch-manipulation w-full rounded-2xl bg-primary px-6 py-5 text-xl font-extrabold text-primary-foreground shadow-lg transition-all hover:bg-primary/90 active:scale-[0.98] sm:text-2xl">
            Iniciar votação
          </button>
        </div>
      </div>
    );
  }

  // Main voting screen
  return (
    <div className="min-h-dvh bg-background p-3 sm:p-4 md:p-8">
      <div className="max-w-[960px] mx-auto">
        <div className="text-center mb-8">
          <h1 className="break-words text-2xl md:text-3xl font-bold">{election.name}</h1>
          <p className="text-lg text-muted-foreground mt-1">{isCamisa ? election.position : `Cargo: ${election.position}`}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {isCamisa ? 'Escolha o modelo' : isMultiSeat ? `Preencha até ${maxChoices} voto(s) • ${totalSelectedMarks}/${maxChoices}` : 'Escolha seu candidato'}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 min-[700px]:grid-cols-2 min-[1100px]:grid-cols-3">
          {eligibleCandidates.map((c) => {
            const photos = getPhotoUrls(c);
            const selectedIndex = selectedCandidates.findIndex((candidate) => candidate.id === c.id);
            const selected = selectedIndex >= 0;
            return (
              <article
                key={c.id}
                className={`relative flex min-w-0 min-h-[240px] flex-col items-center justify-between gap-4 rounded-2xl border-2 bg-card p-[16px] shadow-sm min-[700px]:p-[20px] ${selected ? 'border-primary ring-2 ring-primary/20' : 'border-border'}`}
              >
                {isMultiSeat && selected && (
                  <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-sm">
                    {selectedIndex + 1}
                  </span>
                )}
                <CandidatePhotos photos={photos} name={c.name} size={isCamisa ? 'lg' : 'md'} />
                <h2 className="w-full [overflow-wrap:anywhere] text-[1.125rem] leading-snug font-semibold text-center">{c.name}</h2>
                <button type="button" aria-pressed={isMultiSeat ? selected : undefined} disabled={isMultiSeat && !selected && selectedCandidates.length >= maxChoices} onClick={() => {
                  void primeAudio(); setVoteError('');
                  if (!isMultiSeat) { setConfirmCandidate(c); return; }
                  setSelectedCandidates(current => current.some(candidate => candidate.id === c.id)
                    ? current.filter(candidate => candidate.id !== c.id)
                    : current.length >= maxChoices ? current : [...current, c]);
                }} aria-label={`${isMultiSeat ? (selected ? 'Desmarcar' : 'Selecionar') : 'Votar em'} ${c.name}`} className="min-h-[52px] w-full rounded-xl bg-primary px-3 py-3 text-base font-bold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50">
                  {isMultiSeat ? (selected ? 'SELECIONADO' : 'SELECIONAR') : 'VOTAR'}
                </button>
              </article>
            );
          })}
        </div>

        {isMultiSeat && (
          <div className="sticky bottom-[calc(0.75rem+env(safe-area-inset-bottom))] mt-5 space-y-2 rounded-2xl border border-border bg-background/95 p-3 shadow-xl backdrop-blur">
            <Button
              className="h-12 w-full text-base font-bold"
              disabled={selectedCandidates.length === 0}
              onClick={() => {
                void primeAudio();
                if (selectedCandidates.length < maxChoices) {
                  setShowNullWarning(true);
                } else {
                  setConfirmSelection(true);
                }
              }}
            >
              Confirmar cédula ({selectedCandidates.length}/{maxChoices})
            </Button>
            <Button
              variant="outline"
              className="h-11 w-full font-semibold"
              onClick={() => { void primeAudio(); setConfirmBlank(true); }}
            >
              Votar tudo em Branco / Nulo
            </Button>
          </div>
        )}

        {!isMultiSeat && !isCamisa && (
          <Button
            variant="outline"
            className="mt-5 h-12 w-full font-semibold"
            onClick={() => { void primeAudio(); setConfirmBlank(true); }}
          >
            Votar em Branco / Nulo
          </Button>
        )}
      </div>
    </div>
  );
}
