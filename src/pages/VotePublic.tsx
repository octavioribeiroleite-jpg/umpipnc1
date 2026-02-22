import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, Loader2, UserCheck, Vote, XCircle, ShieldCheck, Monitor, LogIn } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

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
  const [searchParams] = useSearchParams();
  const isUrnaMode = searchParams.get('mode') === 'urna';

  const [election, setElection] = useState<Election | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [confirmCandidate, setConfirmCandidate] = useState<Candidate | null>(null);
  const [voteSuccess, setVoteSuccess] = useState(false);
  const [readyToVote, setReadyToVote] = useState(false);
  const [alreadyVoted, setAlreadyVoted] = useState(false);

  // Urna auth state
  const [urnaAuthenticated, setUrnaAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');

  // In urna mode after auth, behave as shared. Otherwise check voting_mode.
  const isSharedBehavior = isUrnaMode && urnaAuthenticated;
  const isIndividual = !isSharedBehavior && (election?.voting_mode === 'individual' || election?.voting_mode === 'both');

  // Check urna session on mount
  useEffect(() => {
    if (isUrnaMode && electionId) {
      const flag = sessionStorage.getItem(`urna_authenticated_${electionId}`);
      if (flag === 'true') {
        setUrnaAuthenticated(true);
      }
    }
  }, [isUrnaMode, electionId]);

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

      // Check if device already voted (individual mode only, not urna mode)
      if (!isUrnaMode && (elData?.voting_mode === 'individual' || elData?.voting_mode === 'both')) {
        const deviceId = getDeviceId();
        if (localStorage.getItem(`voted_${electionId}`)) {
          setAlreadyVoted(true);
        } else {
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
  }, [electionId, isUrnaMode]);

  const handleUrnaAuth = async () => {
    if (!authUsername.trim() || !authPassword.trim()) return;
    setAuthLoading(true);
    setAuthError('');

    try {
      // Get email from username
      const { data: email, error: emailError } = await supabase.rpc('get_email_by_username', {
        _username: authUsername.trim(),
      });

      if (emailError || !email) {
        setAuthError('Usuário não encontrado.');
        setAuthLoading(false);
        return;
      }

      // Sign in
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: email as string,
        password: authPassword,
      });

      if (signInError || !signInData.user) {
        setAuthError('Senha incorreta.');
        setAuthLoading(false);
        return;
      }

      // Check management role
      const { data: hasRole } = await supabase.rpc('has_management_role', {
        _user_id: signInData.user.id,
      });

      // Sign out after check (urna is public, don't keep session)
      await supabase.auth.signOut();

      if (!hasRole) {
        setAuthError('Apenas admin ou diretoria podem ativar a urna.');
        setAuthLoading(false);
        return;
      }

      // Success
      sessionStorage.setItem(`urna_authenticated_${electionId}`, 'true');
      setUrnaAuthenticated(true);
    } catch {
      setAuthError('Erro ao autenticar. Tente novamente.');
    }
    setAuthLoading(false);
  };

  const handleVote = async () => {
    if (!confirmCandidate || !electionId) return;
    setVoting(true);

    const voteData: any = {
      election_id: electionId,
      candidate_id: confirmCandidate.id,
    };

    if (isIndividual) {
      const deviceId = getDeviceId();
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

    if (isSharedBehavior || (!isIndividual && !isUrnaMode)) {
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

  // Urna mode: show auth screen if not authenticated
  if (isUrnaMode && !urnaAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
        <div className="max-w-sm w-full space-y-6">
          <div className="text-center">
            <Monitor className="h-16 w-16 text-primary mx-auto mb-4" />
            <h1 className="text-2xl font-bold">Ativar Urna Fixa</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Digite suas credenciais de admin ou diretoria para liberar esta urna.
            </p>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="urna-username">Usuário</Label>
              <Input
                id="urna-username"
                value={authUsername}
                onChange={(e) => setAuthUsername(e.target.value)}
                placeholder="Digite seu usuário"
                onKeyDown={(e) => e.key === 'Enter' && handleUrnaAuth()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="urna-password">Senha</Label>
              <Input
                id="urna-password"
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="Digite sua senha"
                onKeyDown={(e) => e.key === 'Enter' && handleUrnaAuth()}
              />
            </div>
            {authError && (
              <p className="text-sm text-destructive text-center">{authError}</p>
            )}
            <Button
              onClick={handleUrnaAuth}
              disabled={authLoading || !authUsername.trim() || !authPassword.trim()}
              className="w-full"
              size="lg"
            >
              {authLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <LogIn className="h-4 w-4 mr-2" />
              )}
              Autenticar
            </Button>
          </div>
        </div>
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
            {isSharedBehavior || !isIndividual ? 'Aguarde para o próximo votante...' : 'Obrigado por votar!'}
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

  // Pre-voting screen (shared mode / urna mode)
  if ((isSharedBehavior || !isIndividual) && !readyToVote) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
        <div className="max-w-sm w-full space-y-8">
          <div>
            <Vote className="h-20 w-20 text-primary mx-auto mb-4" />
            <h1 className="text-2xl font-bold">{election.name}</h1>
            <p className="text-muted-foreground mt-1">Cargo: {election.position}</p>
            {isSharedBehavior && (
              <p className="text-xs text-primary mt-2 flex items-center justify-center gap-1">
                <Monitor className="h-3 w-3" /> Urna Fixa Ativada
              </p>
            )}
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
