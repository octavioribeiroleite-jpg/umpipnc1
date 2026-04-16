import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, Loader2, UserCheck, Vote, XCircle, ShieldCheck, Monitor, LogIn, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';

interface Election { id: string; name: string; position: string; status: string; voting_mode?: string; type?: string; }
interface Candidate { id: string; name: string; photo_url: string | null; photo_urls?: string[]; display_order: number; }

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
  const sizeClass = size === 'lg' ? 'w-40 h-40 md:w-48 md:h-48' : 'w-24 h-24 md:w-32 md:h-32';

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
        <img src={photos[0]} alt={name} className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`relative ${sizeClass} rounded-xl overflow-hidden bg-muted`}>
        <img src={photos[current]} alt={name} className="w-full h-full object-cover" />
        <button
          onClick={(e) => { e.stopPropagation(); setCurrent(p => p > 0 ? p - 1 : photos.length - 1); }}
          className="absolute left-1 top-1/2 -translate-y-1/2 bg-black/40 rounded-full p-0.5"
        >
          <ChevronLeft className="h-4 w-4 text-white" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setCurrent(p => p < photos.length - 1 ? p + 1 : 0); }}
          className="absolute right-1 top-1/2 -translate-y-1/2 bg-black/40 rounded-full p-0.5"
        >
          <ChevronRight className="h-4 w-4 text-white" />
        </button>
      </div>
      <div className="flex gap-1">
        {photos.map((_, i) => (
          <button
            key={i}
            onClick={(e) => { e.stopPropagation(); setCurrent(i); }}
            className={`w-2 h-2 rounded-full transition-colors ${i === current ? 'bg-primary' : 'bg-muted-foreground/30'}`}
          />
        ))}
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
  const [confirmCandidate, setConfirmCandidate] = useState<Candidate | null>(null);
  const [voteSuccess, setVoteSuccess] = useState(false);
  const [readyToVote, setReadyToVote] = useState(false);
  const [alreadyVoted, setAlreadyVoted] = useState(false);

  const [urnaAuthenticated, setUrnaAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [deviceLabel, setDeviceLabel] = useState('');
  const [invalidToken, setInvalidToken] = useState(false);
  const isSharedBehavior = isUrnaMode && urnaAuthenticated;
  const isIndividual = !isSharedBehavior && (election?.voting_mode === 'individual' || election?.voting_mode === 'both');
  const isCamisa = election?.type === 'camisa';

  useEffect(() => {
    if (isUrnaMode && electionId && urnaToken) {
      const flag = sessionStorage.getItem(`urna_authenticated_${electionId}_${urnaToken}`);
      if (flag === 'true') setUrnaAuthenticated(true);
    }
  }, [isUrnaMode, electionId, urnaToken]);

  useEffect(() => {
    const fetchData = async () => {
      if (!electionId) return;

      if (isUrnaMode) {
        if (!urnaToken) { setInvalidToken(true); setLoading(false); return; }
        const { data: deviceData, error: deviceError } = await supabase
          .from('election_devices' as any).select('*')
          .eq('election_id', electionId).eq('token', urnaToken).single();
        if (deviceError || !deviceData) { setInvalidToken(true); setLoading(false); return; }
        setDeviceLabel((deviceData as any).label || '');
      }

      const [elRes, caRes] = await Promise.all([
        supabase.from('elections' as any).select('*').eq('id', electionId).single(),
        supabase.from('election_candidates' as any).select('*').eq('election_id', electionId).order('display_order' as any),
      ]);
      const elData = elRes.data as any;
      setElection(elData);
      setCandidates(((caRes.data as any[]) || []).map((c: any) => ({
        ...c,
        photo_urls: Array.isArray(c.photo_urls) ? c.photo_urls : [],
      })));

      if (!isUrnaMode && (elData?.voting_mode === 'individual' || elData?.voting_mode === 'both')) {
        const deviceId = getDeviceId();
        if (localStorage.getItem(`voted_${electionId}`)) {
          setAlreadyVoted(true);
        } else {
          const { count } = await supabase
            .from('election_votes' as any).select('*', { count: 'exact', head: true })
            .eq('election_id', electionId).eq('device_id', deviceId);
          if (count && count > 0) {
            setAlreadyVoted(true);
            localStorage.setItem(`voted_${electionId}`, 'true');
          }
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [electionId, isUrnaMode, urnaToken]);

  const handleUrnaAuth = async () => {
    if (!authUsername.trim() || !authPassword.trim()) return;
    setAuthLoading(true);
    setAuthError('');
    try {
      const { data: email, error: emailError } = await supabase.rpc('get_email_by_username', { _username: authUsername.trim() });
      if (emailError || !email) { setAuthError('Usuário não encontrado.'); setAuthLoading(false); return; }
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email: email as string, password: authPassword });
      if (signInError || !signInData.user) { setAuthError('Senha incorreta.'); setAuthLoading(false); return; }
      const { data: hasRole } = await supabase.rpc('has_management_role', { _user_id: signInData.user.id });
      await supabase.auth.signOut();
      if (!hasRole) { setAuthError('Apenas admin ou diretoria podem ativar a urna.'); setAuthLoading(false); return; }
      if (urnaToken) {
        await supabase.from('election_devices' as any).update({ activated: true } as any).eq('token', urnaToken);
      }
      sessionStorage.setItem(`urna_authenticated_${electionId}_${urnaToken}`, 'true');
      setUrnaAuthenticated(true);
    } catch {
      setAuthError('Erro ao autenticar. Tente novamente.');
    }
    setAuthLoading(false);
  };

  const playUrnaSound = () => {
    try {
      const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext);
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(1320, now + 0.18);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.35, now + 0.02);
      gain.gain.setValueAtTime(0.35, now + 0.5);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.72);
      setTimeout(() => ctx.close(), 1000);
    } catch {
      // navegador pode bloquear áudio sem interação prévia
    }
  };

  const handleVote = async () => {
    if (!confirmCandidate || !electionId) return;
    setVoting(true);
    const voteData: any = { election_id: electionId, candidate_id: confirmCandidate.id };
    if (isIndividual) {
      const deviceId = getDeviceId();
      const { count } = await supabase
        .from('election_votes' as any).select('*', { count: 'exact', head: true })
        .eq('election_id', electionId).eq('device_id', deviceId);
      if (count && count > 0) { setAlreadyVoted(true); setConfirmCandidate(null); setVoting(false); return; }
      voteData.device_id = deviceId;
    }
    const { error } = await supabase.from('election_votes' as any).insert(voteData as any);
    if (error) { setVoting(false); return; }
    if (isIndividual) localStorage.setItem(`voted_${electionId}`, 'true');
    setConfirmCandidate(null);
    setVoteSuccess(true);
    setVoting(false);
    playUrnaSound();
    if (isSharedBehavior || (!isIndividual && !isUrnaMode)) {
      setTimeout(() => { setVoteSuccess(false); setReadyToVote(false); }, 15000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (invalidToken) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
        <XCircle className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Dispositivo Não Cadastrado</h1>
        <p className="text-muted-foreground">Este link de urna fixa não é válido ou o dispositivo não foi cadastrado.</p>
      </div>
    );
  }

  if (!election || election.status !== 'open') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
        <XCircle className="h-16 w-16 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Votação Indisponível</h1>
        <p className="text-muted-foreground">
          {election?.status === 'finished' ? 'Esta votação já foi encerrada.' : 'Esta votação ainda não foi iniciada.'}
        </p>
      </div>
    );
  }

  // Urna auth screen
  if (isUrnaMode && !urnaAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
        <div className="max-w-sm w-full space-y-6">
          <div className="text-center">
            <Monitor className="h-16 w-16 text-primary mx-auto mb-4" />
            <h1 className="text-2xl font-bold">Ativar Urna Fixa</h1>
            {deviceLabel && <p className="text-primary font-medium mt-1">{deviceLabel}</p>}
            <p className="text-muted-foreground mt-2 text-sm">Digite suas credenciais de admin ou diretoria para liberar esta urna.</p>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="urna-username">Usuário</Label>
              <Input id="urna-username" value={authUsername} onChange={(e) => setAuthUsername(e.target.value)} placeholder="Digite seu usuário" onKeyDown={(e) => e.key === 'Enter' && handleUrnaAuth()} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="urna-password">Senha</Label>
              <Input id="urna-password" type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="Digite sua senha" onKeyDown={(e) => e.key === 'Enter' && handleUrnaAuth()} />
            </div>
            {authError && <p className="text-sm text-destructive text-center">{authError}</p>}
            <Button onClick={handleUrnaAuth} disabled={authLoading || !authUsername.trim() || !authPassword.trim()} className="w-full" size="lg">
              {authLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <LogIn className="h-4 w-4 mr-2" />}
              Autenticar
            </Button>
          </div>
        </div>
      </div>
    );
  }

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

  if (voteSuccess) {
    const isAutoReset = isSharedBehavior || !isIndividual;
    return (
      <SuccessScreen autoReset={isAutoReset} />
    );
  }

  // Confirm modal
  if (confirmCandidate) {
    const confirmPhotos = getPhotoUrls(confirmCandidate);
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
        <div className="max-w-sm w-full text-center space-y-6">
          <h2 className="text-xl font-bold">{isCamisa ? 'Confirma seu voto neste modelo:' : 'Confirma seu voto em:'}</h2>
          <div className="flex flex-col items-center gap-4">
            <CandidatePhotos photos={confirmPhotos} name={confirmCandidate.name} size="lg" />
            <p className="text-2xl font-bold">{confirmCandidate.name}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setConfirmCandidate(null)} className="flex-1 py-4 rounded-xl border-2 border-border text-lg font-semibold hover:bg-muted transition-colors">
              Cancelar
            </button>
            <button onClick={handleVote} disabled={voting} className="flex-1 py-4 rounded-xl bg-primary text-primary-foreground text-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50">
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
        <div className="max-w-sm w-full space-y-8">
          <div>
            <Vote className="h-20 w-20 text-primary mx-auto mb-4" />
            <h1 className="text-2xl font-bold">{election.name}</h1>
            <p className="text-muted-foreground mt-1">{isCamisa ? election.position : `Cargo: ${election.position}`}</p>
            {isSharedBehavior && (
              <p className="text-xs text-primary mt-2 flex items-center justify-center gap-1">
                <Monitor className="h-3 w-3" /> Urna Fixa Ativada
              </p>
            )}
          </div>
          <button onClick={() => setReadyToVote(true)} className="w-full py-5 rounded-xl bg-primary text-primary-foreground text-xl font-bold hover:bg-primary/90 transition-colors">
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
          <p className="text-lg text-muted-foreground mt-1">{isCamisa ? election.position : `Cargo: ${election.position}`}</p>
          <p className="text-sm text-muted-foreground mt-1">{isCamisa ? 'Escolha o modelo' : 'Escolha seu candidato'}</p>
        </div>

        <div className={`grid ${isCamisa ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2 md:grid-cols-3'} gap-4 md:gap-6`}>
          {candidates.map((c) => {
            const photos = getPhotoUrls(c);
            return (
              <button
                key={c.id}
                onClick={() => setConfirmCandidate(c)}
                className="flex flex-col items-center gap-3 p-4 md:p-6 border-2 rounded-xl hover:border-primary hover:bg-primary/5 transition-all"
              >
                <CandidatePhotos photos={photos} name={c.name} size={isCamisa ? 'lg' : 'md'} />
                <span className="text-sm md:text-base font-semibold text-center">{c.name}</span>
                <span className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-bold">
                  VOTAR
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
