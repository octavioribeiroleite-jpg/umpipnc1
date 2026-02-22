import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, Loader2, UserCheck, Vote, XCircle, ShieldCheck } from 'lucide-react';

interface Election { id: string; name: string; position: string; status: string; voting_mode?: string; }
interface Candidate { id: string; name: string; photo_url: string | null; display_order: number; }

function getDeviceId(): string {
  const key = 'vote_device_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export default function VotePublic() {
  const { electionId } = useParams<{ electionId: string }>();
  const [election, setElection] = useState<Election | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [confirmCandidate, setConfirmCandidate] = useState<Candidate | null>(null);
  const [voteSuccess, setVoteSuccess] = useState(false);
  const [readyToVote, setReadyToVote] = useState(false);
  const [alreadyVoted, setAlreadyVoted] = useState(false);

  const isIndividual = election?.voting_mode === 'individual' || election?.voting_mode === 'both';

  useEffect(() => {
    const fetchData = async () => {
      if (!electionId) return;
      const [elRes, caRes] = await Promise.all([
        supabase.from('elections' as any).select('*').eq('id', electionId).single(),
        supabase.from('election_candidates' as any).select('*').eq('election_id', electionId).order('display_order' as any),
      ]);
      const elData = elRes.data as any;
      setElection(elData);
      setCandidates((caRes.data as any[]) || []);

      // Check if device already voted (individual mode)
      if (elData?.voting_mode === 'individual' || elData?.voting_mode === 'both') {
        const deviceId = getDeviceId();
        // Check localStorage first
        if (localStorage.getItem(`voted_${electionId}`)) {
          setAlreadyVoted(true);
        } else {
          // Check server
          const { count } = await supabase
            .from('election_votes' as any)
            .select('*', { count: 'exact', head: true })
            .eq('election_id', electionId)
            .eq('device_id', deviceId);
          if (count && count > 0) {
            setAlreadyVoted(true);
            localStorage.setItem(`voted_${electionId}`, 'true');
          }
        }
      }

      setLoading(false);
    };
    fetchData();
  }, [electionId]);

  const handleVote = async () => {
    if (!confirmCandidate || !electionId) return;
    setVoting(true);

    const voteData: any = {
      election_id: electionId,
      candidate_id: confirmCandidate.id,
    };

    if (isIndividual) {
      const deviceId = getDeviceId();
      // Server-side check before inserting
      const { count } = await supabase
        .from('election_votes' as any)
        .select('*', { count: 'exact', head: true })
        .eq('election_id', electionId)
        .eq('device_id', deviceId);
      
      if (count && count > 0) {
        setAlreadyVoted(true);
        setConfirmCandidate(null);
        setVoting(false);
        return;
      }
      voteData.device_id = deviceId;
    }

    const { error } = await supabase.from('election_votes' as any).insert(voteData as any);

    if (error) {
      setVoting(false);
      return;
    }

    if (isIndividual) {
      localStorage.setItem(`voted_${electionId}`, 'true');
    }

    setConfirmCandidate(null);
    setVoteSuccess(true);
    setVoting(false);

    if (!isIndividual) {
      // Shared mode: reset after 3s for next voter
      setTimeout(() => {
        setVoteSuccess(false);
        setReadyToVote(false);
      }, 3000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!election || election.status !== 'open') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
        <XCircle className="h-16 w-16 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Votação Indisponível</h1>
        <p className="text-muted-foreground">
          {election?.status === 'finished'
            ? 'Esta votação já foi encerrada.'
            : 'Esta votação ainda não foi iniciada.'}
        </p>
      </div>
    );
  }

  // Already voted screen (individual mode)
  if (alreadyVoted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
        <div className="animate-fade-up">
          <ShieldCheck className="h-24 w-24 text-primary mx-auto mb-6" />
          <h1 className="text-3xl font-bold mb-2">Você já votou</h1>
          <p className="text-muted-foreground text-lg">Seu voto já foi computado nesta eleição.</p>
        </div>
      </div>
    );
  }

  // Success screen
  if (voteSuccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
        <div className="animate-fade-up">
          <CheckCircle className="h-24 w-24 text-success mx-auto mb-6" />
          <h1 className="text-3xl font-bold mb-2">Voto Computado!</h1>
          <p className="text-muted-foreground text-lg">
            {isIndividual ? 'Obrigado por votar!' : 'Aguarde para o próximo votante...'}
          </p>
        </div>
      </div>
    );
  }

  // Confirm modal
  if (confirmCandidate) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
        <div className="max-w-sm w-full text-center space-y-6">
          <h2 className="text-xl font-bold">Confirma seu voto em:</h2>
          <div className="flex flex-col items-center gap-4">
            <div className="w-32 h-32 rounded-xl overflow-hidden bg-muted flex items-center justify-center">
              {confirmCandidate.photo_url ? (
                <img src={confirmCandidate.photo_url} alt={confirmCandidate.name} className="w-full h-full object-cover" />
              ) : (
                <UserCheck className="h-16 w-16 text-muted-foreground" />
              )}
            </div>
            <p className="text-2xl font-bold">{confirmCandidate.name}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setConfirmCandidate(null)}
              className="flex-1 py-4 rounded-xl border-2 border-border text-lg font-semibold hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleVote}
              disabled={voting}
              className="flex-1 py-4 rounded-xl bg-primary text-primary-foreground text-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {voting ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : 'CONFIRMAR'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Pre-voting screen (shared mode only)
  if (!isIndividual && !readyToVote) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
        <div className="max-w-sm w-full space-y-8">
          <div>
            <Vote className="h-20 w-20 text-primary mx-auto mb-4" />
            <h1 className="text-2xl font-bold">{election.name}</h1>
            <p className="text-muted-foreground mt-1">Cargo: {election.position}</p>
          </div>
          <button
            onClick={() => setReadyToVote(true)}
            className="w-full py-5 rounded-xl bg-primary text-primary-foreground text-xl font-bold hover:bg-primary/90 transition-colors"
          >
            Iniciar Votação
          </button>
        </div>
      </div>
    );
  }

  // Main voting screen
  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold">{election.name}</h1>
          <p className="text-lg text-muted-foreground mt-1">Cargo: {election.position}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {candidates.map((c) => (
            <button
              key={c.id}
              onClick={() => setConfirmCandidate(c)}
              className="flex flex-col items-center gap-3 p-4 md:p-6 border-2 rounded-xl hover:border-primary hover:bg-primary/5 transition-all"
            >
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-xl overflow-hidden bg-muted flex items-center justify-center">
                {c.photo_url ? (
                  <img src={c.photo_url} alt={c.name} className="w-full h-full object-cover" />
                ) : (
                  <UserCheck className="h-12 w-12 text-muted-foreground" />
                )}
              </div>
              <span className="text-sm md:text-base font-semibold text-center">{c.name}</span>
              <span className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-bold">
                VOTAR
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
