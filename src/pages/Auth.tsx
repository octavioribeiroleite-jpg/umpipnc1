import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useDiretoriaSession } from '@/contexts/DiretoriaSessionContext';
import { useMembroSession } from '@/contexts/MembroSessionContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, ShieldCheck, Users, UserCircle, Church, ArrowRight, UserCheck, Search, Lock, BookOpen, Wallet } from 'lucide-react';
import logoIpnc from '@/assets/logo-ipnc.png';
import OpeningBackdrop from '@/components/layout/OpeningBackdrop';
import { supabase } from '@/integrations/supabase/client';
import PinPad from '@/components/secretaria/PinPad';
import SocietySelector from '@/components/auth/SocietySelector';
import IdentityConfirmation from '@/components/auth/IdentityConfirmation';
import { AccessShell } from '@/components/auth/AccessShell';
import PublicHomeButton from '@/components/auth/PublicHomeButton';
import { APP_HOME_PATH, requestsPublicHome } from '@/lib/app-home';
import { InstallButton } from '@/components/layout/InstallButton';
import { UpdateAvailableBanner } from '@/components/UpdateAvailableBanner';
import { TreasuryAccessDialog } from '@/components/treasury/TreasuryAccessDialog';
import { warmSocietyIcons } from '@/lib/society-icons';

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
  const [treasuryOpen, setTreasuryOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [societies, setSocieties] = useState<Society[]>([]);
  const [societiesLoading, setSocietiesLoading] = useState(true);
  const [societiesError, setSocietiesError] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isEnteringApp, setIsEnteringApp] = useState(false);
  const [entryMessage, setEntryMessage] = useState('');

  // Diretoria PIN flow state
  const [diretoriaStep, setDiretoriaStep] = useState<DiretoriaStep>('societies');
  const [selectedDiretoriaSociety, setSelectedDiretoriaSociety] = useState<Society | null>(null);
  const [pinError, setPinError] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);
  const [savedName, setSavedName] = useState<string | null>(null);
  const [operatorName, setOperatorName] = useState('');
  const [operatorFunction, setOperatorFunction] = useState('');
  const [pinMessage, setPinMessage] = useState('');
  const [pinAttempt, setPinAttempt] = useState(0);
  const pinSubmitting = useRef(false);

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

  const { signIn } = useAuth();
  const { setSession: setDiretoriaSession } = useDiretoriaSession();
  const { setSession: setMembroSession } = useMembroSession();
  const navigate = useNavigate();
  const location = useLocation();
  const explicitHome = requestsPublicHome(location.search);
  const { toast } = useToast();

  // Exit transition helper
  const navigateWithTransition = useCallback((path: string, options?: { showWelcome?: boolean }) => {
    if (options?.showWelcome) {
      setIsEnteringApp(true);
      setEntryMessage('Bem-vindo à Igreja Presbiteriana de Nova Carapina');
      navigate(path);
      return;
    }

    setIsExiting(true);
    navigate(path);
  }, [navigate]);

  const fetchSocieties = useCallback(async () => {
    setSocietiesLoading(true);
    setSocietiesError(false);
    try {
      const { data, error } = await supabase
        .from('societies')
        .select('*')
        .eq('active', true)
        .order('name');
      if (error || !data) throw error || new Error('Societies unavailable');
      setSocieties(data as Society[]);
    } catch { setSocietiesError(true); }
    finally { setSocietiesLoading(false); }
  }, []);
  useEffect(() => { void fetchSocieties(); }, [fetchSocieties]);
  useEffect(() => { warmSocietyIcons(); }, []);

  // ========== HANDLERS ==========

  const handleReturnHome = useCallback(() => {
    setStep('select');
    setDiretoriaStep('societies');
    setSelectedDiretoriaSociety(null);
    setPinMessage('');
    setPinError(false);
    setPassword('');
    setLoginError('');
    setTreasuryOpen(false);
    setIsExiting(false);
    navigate(APP_HOME_PATH, { replace: true });
  }, [navigate]);

  // A popup can return to this route while the PIN form remains mounted.
  useEffect(() => {
    if (explicitHome) handleReturnHome();
  }, [explicitHome, handleReturnHome]);

  const handleBack = () => {
    if (pinSubmitting.current || isLoading || pinLoading || memberLoginLoading) return false;
    if (step === 'diretoria') {
      if (diretoriaStep === 'pin' || diretoriaStep === 'name-confirm' || diretoriaStep === 'name-input') {
        setDiretoriaStep('societies');
        setSelectedDiretoriaSociety(null);
        setPinMessage('');
        setPinError(false);
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
    setDiretoriaStep('societies');
    setSelectedDiretoriaSociety(null);
  };

  const handleSelectDiretoriaSociety = (society: Society) => {
    setSelectedDiretoriaSociety(society);
    setPinError(false);
    setPinMessage('');
    setSavedName(null);
    setOperatorName('');
    setOperatorFunction('');
    setDiretoriaStep('pin');
  };

  const handlePinComplete = async (pin: string) => {
    const society = selectedDiretoriaSociety;
    if (!society || pinSubmitting.current || !/^\d{6}$/.test(pin)) return;
    pinSubmitting.current = true;
    setPinLoading(true);
    setPinError(false);
    setPinMessage('');

    try {
      const { data, error } = await supabase.functions.invoke('validate-diretoria-pin', {
        body: { society_slug: society.slug, pin },
      });

      if (error || !data?.success) {
        let message = data?.error;
        if (!message && error?.context instanceof Response) {
          try { message = (await error.context.json()).error; } catch { /* Connection errors use the message below. */ }
        }
        setPinMessage(message || 'Não foi possível confirmar o acesso. Confira sua conexão e tente novamente.');
        setPinAttempt(value => value + 1);
        return;
      }

      const sessionResult = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });
      if (sessionResult.error) throw sessionResult.error;

      // Pastor has a fixed identity — skip name input
      if (society.slug === 'pastor') {
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
      setPinMessage('Não foi possível confirmar o acesso. Confira sua conexão e tente novamente.');
      setPinAttempt(value => value + 1);
    } finally {
      pinSubmitting.current = false;
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
      const exists = societyMembers.some(m => m.id === savedId);
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
    setLoginError('');
    setIsLoading(true);

    const { error } = await signIn(username, password);

    if (error) {
      setLoginError('Usuário ou senha incorretos. Confira os dados e tente novamente.');
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
    const AccessCard = ({ title, description, icon: Icon, tone, onClick }: {
      title: string; description: string; icon: typeof Lock; tone: string; onClick: () => void;
    }) => (
      <button type="button" onClick={onClick} className="auth-access-card" data-tone={tone}>
        <span className="auth-access-icon"><Icon aria-hidden="true" /></span>
        <span className="auth-access-copy"><strong>{title}</strong><span>{description}</span></span>
        <ArrowRight className="auth-access-arrow" aria-hidden="true" />
      </button>
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
        <IdentityConfirmation hideBack name={membroSavedName} society={selectedMembroSociety?.slug.toUpperCase()}
          loading={memberLoginLoading} onBack={handleBack} onDifferentPerson={handleDifferentMembro} onConfirm={handleConfirmMembro} />
      );
    }

    // Membro name-select
    if (step === 'membro' && membroStep === 'name-select') {
      return (
        <div className="w-full max-w-[400px]">
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
                  aria-label="Buscar membro pelo nome" placeholder="Buscar pelo nome..."
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
        <IdentityConfirmation hideBack name={savedName} role={operatorFunction} society={selectedDiretoriaSociety?.slug.toUpperCase()}
          onBack={handleBack} onDifferentPerson={handleDifferentPerson} onConfirm={handleConfirmName} />
      );
    }

    // Diretoria name-input
    if (step === 'diretoria' && diretoriaStep === 'name-input') {
      return (
        <div className="ipnc-access-form space-y-5">
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
        </div>
      );
    }

    // Main screen (select / societies / pin / login)
    return (
      <div className={step === 'select' ? 'auth-content auth-content-select' : 'w-full'}>
        {step === 'select' && (
          <header className="auth-content-heading">
            <span className="auth-mobile-lock"><Lock aria-hidden="true" /></span>
            <p className="auth-eyebrow">Bem-vindo à IPNC</p>
            <h1><span className="auth-heading-desktop">Como deseja acessar?</span><span className="auth-heading-mobile">Escolha como acessar</span></h1>
            <p className="auth-intro">Escolha sua área para continuar.</p>
          </header>
        )}
        {step === 'select' ? (
          <div className="auth-access-list">
            <AccessCard title="Diretoria" description="Reuniões, tarefas e organização" icon={Users} tone="green" onClick={() => { setStep('diretoria'); setDiretoriaStep('societies'); }} />
            <AccessCard title="Secretaria EBD" description="Turmas, chamada e histórico" icon={BookOpen} tone="blue" onClick={() => navigateWithTransition('/secretaria')} />
            <AccessCard title="Finanças" description="Acesso privado por sociedade" icon={Wallet} tone="gold" onClick={() => setTreasuryOpen(true)} />
            <AccessCard title="Portal da igreja" description="Programação e avisos" icon={Church} tone="violet" onClick={() => navigateWithTransition('/igreja')} />
          </div>
        ) : step === 'diretoria' && diretoriaStep === 'pin' ? (
          <PinPad
            key={`${selectedDiretoriaSociety?.slug}:${pinAttempt}`}
            profileLabel={`Diretoria · ${selectedDiretoriaSociety?.slug.toUpperCase() ?? ''}`}
            onBack={handleBack}
            onHome={handleReturnHome}
            onComplete={handlePinComplete}
            loading={pinLoading}
            error={pinError}
            errorMessage={pinMessage}
          />
        ) : step === 'diretoria' && diretoriaStep === 'societies' ? (
          <SocietySelector
            societies={societies}
            loading={pinLoading}
            onBack={handleBack}
            onSelect={handleSelectDiretoriaSociety}
            onSelectPastor={() => handleSelectDiretoriaSociety({ id: 'pastor', name: 'Pastor', slug: 'pastor', color: '#1e3a5f' })}
          />
        ) : step === 'membro' && membroStep === 'societies' ? (
          <SocietySelector societies={societies} onBack={handleBack} onSelect={handleSelectMembroSociety} />
        ) : (
                <form onSubmit={handleLogin} className="ipnc-access-form space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-foreground/80">Usuário</Label>
                    <Input
                      id="username"
                      type="text"
                      placeholder="Seu usuário"
                      value={username}
                      onChange={(e) => {setUsername(e.target.value);setLoginError('');}}
                      required
                      disabled={isLoading}
                      autoComplete="username" autoCapitalize="none"
                      autoCorrect="off"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-foreground/80">Senha</Label>
                    <Input
                      id="password"
                      autoComplete="current-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => {setPassword(e.target.value);setLoginError('');}}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <p role={loginError ? 'alert' : undefined} className="min-h-6 text-sm text-destructive">{loginError}</p>
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
        )}

        {step === 'select' && (
          <div className="auth-access-footer">
            <button type="button" className="auth-admin-button" onClick={() => setStep('login')}><ShieldCheck aria-hidden="true" />Acesso administrativo</button>
          </div>
        )}
      </div>
    );
  };

  const isSocietySelection = !isEnteringApp && ((step === 'diretoria' && diretoriaStep === 'societies') || (step === 'membro' && membroStep === 'societies'));
  const isIdentityConfirmation = !isEnteringApp && ((step === 'diretoria' && diretoriaStep === 'name-confirm' && !!savedName) || (step === 'membro' && membroStep === 'name-confirm' && !!membroSavedName));
  const isPinEntry = !isEnteringApp && step === 'diretoria' && diretoriaStep === 'pin';
  const isHomeEntry = !isEnteringApp && step === 'select';
  const isAccountEntry = !isEnteringApp && step === 'login';

  // Entry screens share the EBD layout directly, without the home sidebar.
  if (isPinEntry) return (
          <PinPad
            key={`${selectedDiretoriaSociety?.slug}:${pinAttempt}`}
            profileLabel={`Diretoria · ${selectedDiretoriaSociety?.slug.toUpperCase() ?? ''}`}
            onBack={handleBack}
            onHome={handleReturnHome}
            onComplete={handlePinComplete}
            loading={pinLoading}
            error={pinError}
            errorMessage={pinMessage}
          />
  );
  if (isSocietySelection) {
    return <SocietySelector societies={societies} loading={societiesLoading} error={societiesError} onRetry={() => void fetchSocieties()} onBack={handleBack}
      onSelect={step === 'diretoria' ? handleSelectDiretoriaSociety : handleSelectMembroSociety}
      onSelectPastor={step === 'diretoria' ? () => handleSelectDiretoriaSociety({ id: 'pastor', name: 'Pastor', slug: 'pastor', color: '#1e3a5f' }) : undefined} />;
  }
  if (isAccountEntry) {
    return <AccessShell title="Acesso administrativo" description="Entre com sua conta para gerenciar a IPNC."
      onBack={handleReturnHome} onHome={handleReturnHome} disabled={isLoading}>
      {renderContent()}
    </AccessShell>;
  }
  if (isIdentityConfirmation || (!isEnteringApp && step === 'diretoria' && diretoriaStep === 'name-input')) {
    return <AccessShell title={isIdentityConfirmation ? 'Confirme sua identidade' : 'Identificação'}
      description={isIdentityConfirmation ? undefined : `Informe seus dados para a ${selectedDiretoriaSociety?.name}.`}
      headingIcon={UserCheck} onBack={handleBack} onHome={handleReturnHome}>
      {renderContent()}
    </AccessShell>;
  }

  return (
    <div className={`auth-page ipnc-safe-managed ${isHomeEntry || isAccountEntry ? 'ipnc-opening-surface' : ''} ${isHomeEntry ? 'auth-page-home' : ''} ${isAccountEntry ? 'auth-page-account' : ''} ${isSocietySelection ? 'auth-page-society' : ''} ${isIdentityConfirmation ? 'auth-page-identity' : ''} ${isPinEntry ? 'auth-page-pin' : ''}`}>
      {(isHomeEntry || isAccountEntry) && <OpeningBackdrop />}
      <TreasuryAccessDialog open={treasuryOpen} onOpenChange={setTreasuryOpen} onEntered={id => { setTreasuryOpen(false); navigate(`/tesouraria${id ? `?sociedade=${id}` : ''}`); }} />
      <aside className="auth-brand-panel">
        <div className="auth-brand-content">
          <div className="auth-brand"><img src={logoIpnc} alt="IPNC" width="1254" height="1254" /></div>
          <div className="auth-brand-heading">
            <p>Igreja Presbiteriana<br />de Nova Carapina</p>
            <span>Servindo. Cuidando. Avançando.</span>
          </div>
          <blockquote className="auth-brand-verse">
            <p>“Mas tu, ó homem de Deus, avança…”</p>
            <cite>1 Timóteo 6:11</cite>
          </blockquote>
        </div>
        <div className="auth-brand-bottom">
          <div className="auth-brand-install"><InstallButton variant="entry" /></div>
          <p className="auth-brand-location">Nova Carapina · Serra/ES</p>
        </div>
      </aside>
      <main className={`auth-main ${isExiting ? 'auth-exiting' : ''}`}>
        <div className="auth-update"><UpdateAvailableBanner /></div>
        <div className="auth-main-inner">
          {(step !== 'select' || isEnteringApp) && <h1 className="sr-only">{isEnteringApp ? 'Entrando no aplicativo IPNC' : step === 'login' ? 'Acesso administrativo' : step === 'diretoria' ? 'Acesso da diretoria' : 'Acesso IPNC'}</h1>}
          {(isHomeEntry || isAccountEntry) && <img className="auth-mobile-logo" src={logoIpnc} alt="IPNC" width="1254" height="1254" />}
          {step === 'select' && !isEnteringApp && <p className="auth-values">Comunhão <span>·</span> Discipulado <span>·</span> Serviço <span>·</span> Missão</p>}
          {isIdentityConfirmation && <div className="auth-identity-brand"><img src={logoIpnc} alt="IPNC" width="1254" height="1254" /></div>}
          {renderContent()}
          <footer className={`auth-page-footer ${step !== 'select' ? 'auth-page-footer-flow' : ''}`}>
            {(isHomeEntry || isAccountEntry) && <div className="auth-mobile-family"><div><BookOpen aria-hidden="true" /></div><p>Mais que uma igreja<br />uma família</p></div>}
            <p className="auth-copyright">© {new Date().getFullYear()} IPNC</p>
            {(step === 'select' || isSocietySelection) && !isEnteringApp && <p className="auth-footer-motto">{isSocietySelection ? 'Para a glória de Deus.' : 'Tudo para a glória de Deus.'}</p>}
          </footer>
        </div>
      </main>
    </div>
  );
}
