import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useDiretoriaSession } from '@/contexts/DiretoriaSessionContext';
import { useMembroSession } from '@/contexts/MembroSessionContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, ShieldCheck, Users, UserCircle, Church, ArrowRight, UserCheck, Search, Lock, BookOpen } from 'lucide-react';
import logoIpnc from '@/assets/logo-ipnc.png';
import { supabase } from '@/integrations/supabase/client';
import PinPad from '@/components/secretaria/PinPad';
import { BuildStamp } from '@/components/BuildStamp';

interface Society {
  id: string;
  name: string;
  slug: string;
  color: string;
}

interface Member {
  id: string;
  name: string;
  society_id: string;
}

type MainStep = 'select' | 'login' | 'diretoria' | 'membro';
type DiretoriaStep = 'societies' | 'pin' | 'name-confirm' | 'name-input';
type MembroStep = 'societies' | 'name-select' | 'name-confirm';

const DIRETORIA_FUNCTIONS = ['Presidente', 'Vice-Presidente', 'Secretário(a)', 'Tesoureiro(a)', 'Pastor', 'Secretário(a) EBD', 'Outro'];

export default function Auth() {
  const [step, setStep] = useState<MainStep>('select');
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [societies, setSocieties] = useState<Society[]>([]);
  const [isExiting, setIsExiting] = useState(false);
  const [isEnteringApp, setIsEnteringApp] = useState(false);
  const [entryMessage, setEntryMessage] = useState('');
  const [videoReady, setVideoReady] = useState(false);
  const [splashPhase, setSplashPhase] = useState<'loading' | 'zoom-out' | 'done'>('loading');
  const [showCards, setShowCards] = useState(false);

  // Diretoria PIN flow state
  const [diretoriaStep, setDiretoriaStep] = useState<DiretoriaStep>('pin');
  const [selectedDiretoriaSociety, setSelectedDiretoriaSociety] = useState<Society | null>(null);
  const [pinError, setPinError] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);
  const [savedName, setSavedName] = useState<string | null>(null);
  const [operatorName, setOperatorName] = useState('');
  const [operatorFunction, setOperatorFunction] = useState('');
  const [generalPin, setGeneralPin] = useState<string | null>(null);

  // Membro flow state
  const [membroStep, setMembroStep] = useState<MembroStep>('societies');
  const [selectedMembroSociety, setSelectedMembroSociety] = useState<Society | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membroSavedName, setMembroSavedName] = useState<string | null>(null);
  const [membroSavedId, setMembroSavedId] = useState<string | null>(null);
  const [memberLoginLoading, setMemberLoginLoading] = useState(false);
  const splashStartRef = useRef(Date.now());

  const { signIn } = useAuth();
  const { setSession: setDiretoriaSession } = useDiretoriaSession();
  const { setSession: setMembroSession } = useMembroSession();
  const navigate = useNavigate();
  const location = useLocation();
  const skipSplash = Boolean((location.state as { skipSplash?: boolean } | null)?.skipSplash);
  const { toast } = useToast();

  // Exit transition helper
  const navigateWithTransition = useCallback((path: string, options?: { showWelcome?: boolean }) => {
    if (options?.showWelcome) {
      setIsEnteringApp(true);
      setEntryMessage('Bem-vindo à Igreja Presbiteriana de Nova Carapina');
      setTimeout(() => navigate(path), 1200);
      return;
    }

    setIsExiting(true);
    setTimeout(() => navigate(path), 450);
  }, [navigate]);

  useEffect(() => {
    const fetchSocieties = async () => {
      const { data } = await supabase
        .from('societies')
        .select('*')
        .eq('active', true)
        .order('name');
      if (data) setSocieties(data as Society[]);
    };
    fetchSocieties();
  }, []);

  // Splash → video transition (minimum 2s splash)
  useEffect(() => {
    if (skipSplash) {
      setSplashPhase('done');
      setShowCards(true);
      return;
    }
    if (!videoReady) return;
    const elapsed = Date.now() - splashStartRef.current;
    const remaining = Math.max(0, 2000 - elapsed);
    // Wait at least 2s before starting zoom-out
    const t0 = setTimeout(() => {
      setSplashPhase('zoom-out');
    }, remaining);
    const t1 = setTimeout(() => {
      setSplashPhase('done');
      setShowCards(true);
    }, remaining + 800);
    return () => { clearTimeout(t0); clearTimeout(t1); };
  }, [videoReady, skipSplash]);

  // ========== HANDLERS ==========

  const handleBack = () => {
    if (step === 'diretoria') {
      if (diretoriaStep === 'societies') {
        setDiretoriaStep('pin');
        setGeneralPin(null);
        setSelectedDiretoriaSociety(null);
        return;
      }
      if (diretoriaStep === 'name-confirm' || diretoriaStep === 'name-input') {
        setDiretoriaStep('societies');
        setSavedName(null);
        setOperatorName('');
        setOperatorFunction('');
        return;
      }
    }
    if (step === 'membro') {
      if (membroStep === 'name-select' || membroStep === 'name-confirm') {
        setMembroStep('societies');
        setSelectedMembroSociety(null);
        setSelectedMember(null);
        setMemberSearch('');
        setMembers([]);
        return;
      }
    }
    setStep('select');
    setDiretoriaStep('pin');
    setGeneralPin(null);
  };

  const handleSelectDiretoriaSociety = async (society: Society) => {
    if (!generalPin) return;
    setSelectedDiretoriaSociety(society);
    setPinLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('validate-diretoria-pin', {
        body: { society_slug: society.slug, pin: generalPin },
      });

      if (error || !data?.success) {
        toast({ variant: 'destructive', title: 'Erro ao entrar' });
        setPinLoading(false);
        return;
      }

      await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });

      // Pastor has a fixed identity — skip name input
      if (society.slug === 'pastor') {
        setPinLoading(false);
        finishDiretoriaLogin('Pr. Ronne Peterson Moreira', 'Pastor');
        return;
      }

      const nameKey = `diretoria_name_${society.slug}`;
      const funcKey = `diretoria_function_${society.slug}`;
      const saved = localStorage.getItem(nameKey);
      const savedFunc = localStorage.getItem(funcKey);

      if (saved) {
        setSavedName(saved);
        setOperatorFunction(savedFunc || '');
        setDiretoriaStep('name-confirm');
      } else {
        setDiretoriaStep('name-input');
      }
    } catch (err) {
      console.error('Society login error:', err);
      toast({ variant: 'destructive', title: 'Erro ao entrar' });
    } finally {
      setPinLoading(false);
    }
  };

  const handlePinComplete = async (pin: string) => {
    setPinLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('validate-diretoria-pin', {
        body: { pin, validate_only: true },
      });

      if (error || !data?.success) {
        setPinError(true);
        toast({ variant: 'destructive', title: 'PIN incorreto' });
        setTimeout(() => setPinError(false), 600);
        setPinLoading(false);
        return;
      }

      setGeneralPin(pin);
      setDiretoriaStep('societies');
    } catch (err) {
      console.error('PIN validation error:', err);
      setPinError(true);
      toast({ variant: 'destructive', title: 'Erro ao validar PIN' });
      setTimeout(() => setPinError(false), 600);
    } finally {
      setPinLoading(false);
    }
  };

  const finishDiretoriaLogin = (name: string, func: string) => {
    if (!selectedDiretoriaSociety) return;
    localStorage.setItem(`diretoria_name_${selectedDiretoriaSociety.slug}`, name);
    localStorage.setItem(`diretoria_function_${selectedDiretoriaSociety.slug}`, func);

    setDiretoriaSession({
      societyId: selectedDiretoriaSociety.id,
      societySlug: selectedDiretoriaSociety.slug,
      societyName: selectedDiretoriaSociety.name,
      societyColor: selectedDiretoriaSociety.color,
      operatorName: name,
      operatorFunction: func,
    });

    toast({ title: 'Bem-vindo!', description: `Entrando como ${name}` });
    const targetPath = selectedDiretoriaSociety.slug === 'pastor' ? '/pastor' : '/';
    navigateWithTransition(targetPath, { showWelcome: true });
  };

  const handleConfirmName = () => {
    finishDiretoriaLogin(savedName!, operatorFunction);
  };

  const handleDifferentPerson = () => {
    setSavedName(null);
    setOperatorName('');
    setOperatorFunction('');
    setDiretoriaStep('name-input');
  };

  const handleSaveName = () => {
    if (!operatorName.trim() || !operatorFunction) return;
    finishDiretoriaLogin(operatorName.trim(), operatorFunction);
  };

  const handleSelectMembroSociety = async (society: Society) => {
    setSelectedMembroSociety(society);
    setMembersLoading(true);

    const savedKey = `membro_name_${society.slug}`;
    const savedIdKey = `membro_id_${society.slug}`;
    const saved = localStorage.getItem(savedKey);
    const savedId = localStorage.getItem(savedIdKey);

    const { data } = await supabase.functions.invoke('member-list', {
      body: { society_id: society.id },
    });

    const societyMembers = (data?.members || []) as Member[];
    setMembers(societyMembers);
    setMembersLoading(false);

    if (saved && savedId) {
      const exists = societyMembers.some((m: any) => m.id === savedId);
      if (exists) {
        setMembroSavedName(saved);
        setMembroSavedId(savedId);
        setMembroStep('name-confirm');
        return;
      }
    }

    setMembroStep('name-select');
  };

  const finishMembroLogin = async (member: Member) => {
    if (!selectedMembroSociety) return;
    setMemberLoginLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('member-login', {
        body: { society_slug: selectedMembroSociety.slug, member_id: member.id },
      });

      if (error || !data?.success) {
        toast({ variant: 'destructive', title: 'Erro ao entrar', description: 'Tente novamente.' });
        setMemberLoginLoading(false);
        return;
      }

      await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });

      localStorage.setItem(`membro_name_${selectedMembroSociety.slug}`, member.name);
      localStorage.setItem(`membro_id_${selectedMembroSociety.slug}`, member.id);

      setMembroSession({
        memberId: member.id,
        memberName: member.name,
        societyId: selectedMembroSociety.id,
        societyName: selectedMembroSociety.name,
        societySlug: selectedMembroSociety.slug,
        societyColor: selectedMembroSociety.color,
      });

      toast({ title: 'Bem-vindo!', description: `Olá, ${member.name.split(' ')[0]}!` });
      navigateWithTransition('/membro', { showWelcome: true });
    } catch (err) {
      console.error('Member login error:', err);
      toast({ variant: 'destructive', title: 'Erro ao entrar' });
    } finally {
      setMemberLoginLoading(false);
    }
  };

  const handleSelectMember = () => {
    if (selectedMember) {
      finishMembroLogin(selectedMember);
    }
  };

  const handleConfirmMembro = () => {
    if (membroSavedId && membroSavedName && selectedMembroSociety) {
      finishMembroLogin({ id: membroSavedId, name: membroSavedName, society_id: selectedMembroSociety.id });
    }
  };

  const handleDifferentMembro = () => {
    setMembroSavedName(null);
    setMembroSavedId(null);
    setMembroStep('name-select');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signIn(username, password);

    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao entrar', description: 'Usuário ou senha incorretos' });
    } else {
      toast({ title: 'Bem-vindo!', description: 'Login realizado com sucesso.' });
      navigateWithTransition('/', { showWelcome: true });
    }

    setIsLoading(false);
  };

  const filteredMembers = members.filter((m) =>
    m.name.toLowerCase().includes(memberSearch.toLowerCase())
  );

  // ========== RENDER CONTENT (conditional by step) ==========
  const renderContent = () => {
    const AccessCard = ({
      label,
      title,
      description,
      icon: Icon,
      onClick,
      delay,
      variant = 'light',
    }: {
      label: string;
      title: string;
      description: string;
      icon: typeof Lock;
      onClick: () => void;
      delay: string;
      variant?: 'light' | 'glass';
    }) => (
      <div
        className={`space-y-2 transition-all duration-500 ${showCards ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        style={{ transitionDelay: showCards ? delay : '0ms' }}
      >
        <p className="px-1 text-[11px] font-bold uppercase tracking-[0.24em] text-white/65">
          {label}
        </p>
        <button
          onClick={onClick}
          className={`group w-full rounded-[24px] border p-4 text-left shadow-[0_18px_50px_rgba(0,0,0,0.20)] backdrop-blur-xl transition-all duration-300 active:scale-[0.98] sm:p-5 ${
            variant === 'glass'
              ? 'border-white/20 bg-white/12 text-white hover:bg-white/18'
              : 'border-white/45 bg-[#F7FAF6]/95 text-foreground hover:bg-white'
          } hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(0,0,0,0.26)]`}
        >
          <div className="flex items-center gap-4">
            <div
              className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-[18px] transition-transform duration-300 group-hover:scale-105 ${
                variant === 'glass'
                  ? 'bg-white/18 text-white'
                  : 'bg-emerald-50 text-primary ring-1 ring-emerald-100'
              }`}
            >
              <Icon className="h-7 w-7" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className={`text-lg font-bold leading-tight ${variant === 'glass' ? 'text-white' : 'text-foreground'}`}>
                {title}
              </h3>
              <p className={`mt-1 text-sm leading-snug ${variant === 'glass' ? 'text-white/70' : 'text-muted-foreground'}`}>
                {description}
              </p>
            </div>
            <ArrowRight
              className={`h-5 w-5 flex-shrink-0 transition-transform duration-300 group-hover:translate-x-1 ${
                variant === 'glass' ? 'text-white/75' : 'text-muted-foreground'
              }`}
            />
          </div>
        </button>
      </div>
    );

    if (isEnteringApp) {
      return (
        <div className="w-full max-w-md">
          <Card className="border-white/20 shadow-2xl bg-card/90 dark:bg-card/95 backdrop-blur-md">
            <CardContent className="py-10 text-center space-y-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
              <h2 className="text-xl font-semibold text-foreground">{entryMessage}</h2>
              <p className="text-sm text-muted-foreground">Preparando o aplicativo para você...</p>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Membro name-confirm
    if (step === 'membro' && membroStep === 'name-confirm' && membroSavedName) {
      return (
        <div className="w-full max-w-sm">
          <Card className="border-white/20 shadow-2xl bg-card/90 dark:bg-card/95 backdrop-blur-md">
            <CardContent className="pt-6 space-y-5">
              <div className="text-center space-y-3">
                <div className="mx-auto h-16 w-16 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${selectedMembroSociety?.color}20` }}>
                  <UserCheck className="h-8 w-8" style={{ color: selectedMembroSociety?.color }} />
                </div>
                <h2 className="font-semibold text-lg text-foreground">Você é</h2>
                <p className="text-2xl font-bold" style={{ color: selectedMembroSociety?.color }}>{membroSavedName}?</p>
                <p className="text-sm text-muted-foreground">{selectedMembroSociety?.name}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={handleDifferentMembro} disabled={memberLoginLoading}>
                  Não sou eu
                </Button>
                <Button onClick={handleConfirmMembro} disabled={memberLoginLoading}>
                  {memberLoginLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  Sim, sou eu!
                </Button>
              </div>
              <Button variant="ghost" size="sm" className="w-full text-xs" onClick={handleBack}>
                <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Voltar
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Membro name-select
    if (step === 'membro' && membroStep === 'name-select') {
      return (
        <div className="w-full max-w-sm">
          <Card className="border-white/20 shadow-2xl bg-card/90 dark:bg-card/95 backdrop-blur-md">
            <CardContent className="pt-6 space-y-4">
              <div className="text-center space-y-2">
                <div className="mx-auto h-14 w-14 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${selectedMembroSociety?.color}20` }}>
                  <UserCircle className="h-7 w-7" style={{ color: selectedMembroSociety?.color }} />
                </div>
                <h2 className="font-semibold text-lg text-foreground">Encontre seu nome</h2>
                <p className="text-sm text-muted-foreground">{selectedMembroSociety?.name}</p>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar pelo nome..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="pl-9"
                  autoFocus
                />
              </div>

              <div className="max-h-60 overflow-y-auto space-y-1 border rounded-lg p-1">
                {membersLoading ? (
                  <div className="py-8 flex justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredMembers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    {memberSearch ? 'Nenhum membro encontrado' : 'Nenhum membro cadastrado'}
                  </p>
                ) : (
                  filteredMembers.map((member) => (
                    <button
                      key={member.id}
                      onClick={() => setSelectedMember(member)}
                      className={`w-full text-left px-3 py-2.5 rounded-md text-sm transition-colors ${
                        selectedMember?.id === member.id
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                    >
                      {member.name}
                    </button>
                  ))
                )}
              </div>

              <Button
                className="w-full"
                disabled={!selectedMember || memberLoginLoading}
                onClick={handleSelectMember}
              >
                {memberLoginLoading ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Entrando...</>
                ) : (
                  'Entrar'
                )}
              </Button>

              <Button variant="ghost" size="sm" className="w-full text-xs" onClick={handleBack}>
                <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Voltar
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Diretoria name-confirm
    if (step === 'diretoria' && diretoriaStep === 'name-confirm' && savedName) {
      return (
        <div className="w-full max-w-sm">
          <Card className="border-white/20 shadow-2xl bg-card/90 dark:bg-card/95 backdrop-blur-md">
            <CardContent className="pt-6 space-y-5">
              <div className="text-center space-y-3">
                <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserCheck className="h-8 w-8 text-primary" />
                </div>
                <h2 className="font-semibold text-lg text-foreground">Você é</h2>
                <p className="text-2xl font-bold text-primary">{savedName}?</p>
                {operatorFunction && (
                  <p className="text-sm text-muted-foreground">{operatorFunction} — {selectedDiretoriaSociety?.name}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={handleDifferentPerson}>
                  Não sou eu
                </Button>
                <Button onClick={handleConfirmName}>
                  Sim, sou eu!
                </Button>
              </div>
              <Button variant="ghost" size="sm" className="w-full text-xs" onClick={handleBack}>
                <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Voltar
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Diretoria name-input
    if (step === 'diretoria' && diretoriaStep === 'name-input') {
      return (
        <div className="w-full max-w-sm">
          <Card className="border-white/20 shadow-2xl bg-card/90 dark:bg-card/95 backdrop-blur-md">
            <CardContent className="pt-6 space-y-5">
              <div className="text-center space-y-2">
                <div className="mx-auto h-14 w-14 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${selectedDiretoriaSociety?.color}20` }}>
                  <UserCheck className="h-7 w-7" style={{ color: selectedDiretoriaSociety?.color }} />
                </div>
                <h2 className="font-semibold text-lg text-foreground">Identificação</h2>
                <p className="text-sm text-muted-foreground">Informe seus dados para a {selectedDiretoriaSociety?.name}</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="operator-name" className="text-foreground/80">Nome completo</Label>
                  <Input
                    id="operator-name"
                    placeholder="Digite seu nome completo"
                    value={operatorName}
                    onChange={(e) => setOperatorName(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="operator-function" className="text-foreground/80">Função na diretoria</Label>
                  <Select value={operatorFunction} onValueChange={setOperatorFunction}>
                    <SelectTrigger id="operator-function">
                      <SelectValue placeholder="Selecione sua função" />
                    </SelectTrigger>
                    <SelectContent>
                      {DIRETORIA_FUNCTIONS.map((f) => (
                        <SelectItem key={f} value={f}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button className="w-full" disabled={!operatorName.trim() || !operatorFunction} onClick={handleSaveName}>
                Continuar
              </Button>
              <Button variant="ghost" size="sm" className="w-full text-xs" onClick={handleBack}>
                <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Voltar
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Main screen (select / societies / pin / login)
    return (
      <div className="w-full max-w-[560px]">
        {/* Logo */}
        <div className={`text-center mb-8 transition-all duration-700 ${showCards ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div className="inline-block animate-logo-pulse mb-4">
            <img
              src={logoIpnc}
              alt="Renovo IPNC"
              className="h-52 w-52 sm:h-64 sm:w-64 mx-auto object-contain drop-shadow-[0_24px_45px_rgba(0,0,0,0.55)]"
            />
          </div>
          <h1 className="font-display text-4xl font-bold text-white drop-shadow-[0_4px_18px_rgba(0,0,0,0.65)]">
            Bem-vindo
          </h1>
          <p className="mt-2 text-base font-medium text-white/90 drop-shadow-[0_3px_14px_rgba(0,0,0,0.75)]">
            Igreja Presbiteriana de Nova Carapina
          </p>
        </div>

        {step === 'select' ? (
          <div className="space-y-5">
            {/* Diretoria */}
            <AccessCard
              label="Diretoria"
              title="Entrar com PIN"
              description="Pastor, presidente, tesoureiro e demais cargos"
              icon={Lock}
              onClick={() => { setStep('diretoria'); setDiretoriaStep('pin'); }}
              delay="500ms"
            />

            {/* Secretaria EBD */}
            <AccessCard
              label="Secretaria EBD"
              title="Escola Dominical"
              description="Chamada, frequência e acompanhamento da EBD"
              icon={BookOpen}
              onClick={() => navigateWithTransition('/secretaria')}
              delay="650ms"
            />

            {/* Administrador */}
            <div className={`transition-all duration-500 ${showCards ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: showCards ? '800ms' : '0ms' }}>
              <button
                onClick={() => setStep('login')}
                className="mx-auto flex items-center justify-center rounded-full border border-white/15 bg-black/20 px-4 py-2 text-center text-xs font-medium text-white/55 backdrop-blur-md transition-colors hover:bg-white/10 hover:text-white/85"
              >
                <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                Acesso Administrativo
              </button>
            </div>
          </div>
        ) : step === 'diretoria' && diretoriaStep === 'pin' ? (
          <PinPad
            profileLabel="Diretoria"
            onBack={handleBack}
            onComplete={handlePinComplete}
            loading={pinLoading}
            error={pinError}
            embedded
          />
        ) : step === 'diretoria' && diretoriaStep === 'societies' ? (
          <div className="animate-fade-up" style={{ animationDelay: '0s', animationFillMode: 'both' }}>
            <div className="flex items-center gap-2 mb-4">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/10" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-lg font-semibold text-white">Selecione a sociedade</h2>
            </div>
            {pinLoading && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-white" />
              </div>
            )}
            {!pinLoading && (
              <div className="grid grid-cols-2 gap-3">
                {societies.map((society) => (
                  <Card
                    key={society.id}
                    className="cursor-pointer border-white/20 shadow-lg bg-card/90 dark:bg-card/95 backdrop-blur-md hover:shadow-xl hover:bg-card/95 dark:bg-card transition-all duration-200 active:scale-[0.97]"
                    onClick={() => handleSelectDiretoriaSociety(society)}
                  >
                    <CardContent className="flex flex-col items-center justify-center gap-2 p-5">
                      <div
                        className="h-12 w-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                        style={{ backgroundColor: society.color }}
                      >
                        {society.slug.toUpperCase().slice(0, 3)}
                      </div>
                      <span className="font-semibold text-sm text-foreground">{society.name}</span>
                    </CardContent>
                  </Card>
                ))}
                {/* Pastor virtual card */}
                <Card
                  className="cursor-pointer border-white/20 shadow-lg bg-card/90 dark:bg-card/95 backdrop-blur-md hover:shadow-xl hover:bg-card/95 dark:bg-card transition-all duration-200 active:scale-[0.97]"
                  onClick={() => handleSelectDiretoriaSociety({ id: 'pastor', name: 'Pastor', slug: 'pastor', color: '#1e3a5f' })}
                >
                  <CardContent className="flex flex-col items-center justify-center gap-2 p-5">
                    <div className="h-12 w-12 rounded-xl flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: '#1e3a5f' }}>
                      <Church className="h-6 w-6" />
                    </div>
                    <span className="font-semibold text-sm text-foreground">Pastor</span>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        ) : step === 'membro' && membroStep === 'societies' ? (
          <div className="animate-fade-up" style={{ animationDelay: '0s', animationFillMode: 'both' }}>
            <div className="flex items-center gap-2 mb-4">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/10" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-lg font-semibold text-white">Selecione sua sociedade</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {societies.map((society) => (
                <Card
                  key={society.id}
                  className="cursor-pointer border-white/20 shadow-lg bg-card/90 dark:bg-card/95 backdrop-blur-md hover:shadow-xl hover:bg-card/95 dark:bg-card transition-all duration-200 active:scale-[0.97]"
                  onClick={() => handleSelectMembroSociety(society)}
                >
                  <CardContent className="flex flex-col items-center justify-center gap-2 p-5">
                    <div
                      className="h-12 w-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                      style={{ backgroundColor: society.color }}
                    >
                      {society.slug.toUpperCase().slice(0, 3)}
                    </div>
                    <span className="font-semibold text-sm text-foreground">{society.name}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <div className="animate-fade-up" style={{ animationDelay: '0s', animationFillMode: 'both' }}>
            <Card className="border-white/20 shadow-2xl bg-card/90 dark:bg-card/95 backdrop-blur-md">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleBack}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <h2 className="text-lg font-semibold text-foreground">Entrar</h2>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-foreground/80">Usuário</Label>
                    <Input
                      id="username"
                      type="text"
                      placeholder="Seu usuário"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      disabled={isLoading}
                      autoCapitalize="none"
                      autoCorrect="off"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-foreground/80">Senha</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Entrando...
                      </>
                    ) : (
                      'Entrar'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        <p className={`text-center text-xs font-medium text-white/70 drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] mt-6 transition-all duration-500 ${showCards ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDelay: showCards ? '800ms' : '0ms' }}>
          © 2025 IPNC - Todos os direitos reservados
        </p>
      </div>
    );
  };

  // ========== SINGLE RETURN — video never remounts ==========
  return (
    <div className="min-h-screen relative overflow-hidden bg-black">
      {/* Video background — always mounted, never re-created */}
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        onCanPlay={() => setVideoReady(true)}
        className={`fixed inset-0 w-full h-full object-cover z-0 transition-opacity duration-1000 ${splashPhase === 'done' ? 'opacity-100' : 'opacity-0'}`}
      >
        <source src="/videos/bg-home.mp4" type="video/mp4" />
      </video>

      {/* Dark overlay */}
      <div className={`fixed inset-0 z-10 bg-[radial-gradient(circle_at_50%_18%,rgba(47,191,122,0.18),transparent_34%),linear-gradient(180deg,rgba(7,25,17,0.55),rgba(3,12,8,0.78))] transition-opacity duration-1000 ${splashPhase === 'done' ? 'opacity-100' : 'opacity-0'}`} />

      {/* Splash screen */}
      {splashPhase !== 'done' && (
        <div className={`fixed inset-0 z-30 flex flex-col items-center justify-start pt-[18vh] transition-all duration-700 ${splashPhase === 'zoom-out' ? 'opacity-0 scale-110' : 'opacity-100 scale-100'}`}>
          {/* Background image */}
          <div className="absolute inset-0 bg-cover bg-center safe-top" style={{ backgroundImage: 'url(/images/bg-app.png)' }} />
          <div className="absolute inset-0 bg-black/50" />
          <div className={`relative text-center transition-all duration-700 ${splashPhase === 'zoom-out' ? 'scale-90 opacity-0' : 'scale-100 opacity-100'}`}>
            <img
              src={logoIpnc}
              alt="Renovo IPNC"
              className="h-56 w-56 mx-auto object-contain mb-6 animate-logo-pulse"
            />
            <h1 className="text-white text-2xl font-bold tracking-tight mb-1">
              Igreja Presbiteriana
            </h1>
            <p className="text-white/60 text-base mb-8">
              de Nova Carapina
            </p>
            <p className="text-white/50 text-sm animate-pulse">Carregando...</p>
          </div>
        </div>
      )}

      {/* Content — transitions apply here only */}
      <div className={`relative z-20 min-h-screen flex items-center justify-center p-4 transition-all duration-500 ${isExiting ? 'opacity-0 scale-105' : 'opacity-100 scale-100'}`}>
        {splashPhase === 'done' && renderContent()}
      </div>

      {/* Carimbo de build — sempre visível para diagnóstico de cache */}
      {splashPhase === 'done' && (
        <div className="fixed bottom-2 left-0 right-0 z-30 px-4 pointer-events-none safe-bottom">
          <BuildStamp className="text-white/70" />
        </div>
      )}
    </div>
  );
}
