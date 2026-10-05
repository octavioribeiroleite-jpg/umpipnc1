import { loadStoredEbdSession } from '@/lib/ebd-session-storage';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useDiretoriaSession } from '@/contexts/DiretoriaSessionContext';
import { useMembroSession } from '@/contexts/MembroSessionContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, ShieldCheck, Users, UserCircle, Church, ArrowRight, UserCheck, Search, Lock, BookOpen, Wallet } from 'lucide-react';
import logoIpnc from '@/assets/logo-ipnc-entry.png';
import { supabase } from '@/integrations/supabase/client';
import PinPad from '@/components/secretaria/PinPad';
import { InstallButton } from '@/components/layout/InstallButton';
import { UpdateAvailableBanner } from '@/components/UpdateAvailableBanner';
import { TreasuryAccessDialog } from '@/components/treasury/TreasuryAccessDialog';

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
  const [isExiting, setIsExiting] = useState(false);
  const [isEnteringApp, setIsEnteringApp] = useState(false);
  const [entryMessage, setEntryMessage] = useState('');

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

  const { signIn } = useAuth();
  const { setSession: setDiretoriaSession } = useDiretoriaSession();
  const { setSession: setMembroSession } = useMembroSession();
  const navigate = useNavigate();
  useEffect(() => {
    if (loadStoredEbdSession()) navigate('/secretaria', { replace: true });
  }, [navigate]);
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
        <div className="w-full max-w-[400px]">
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
              <div className="auth-identity-actions">
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
        <div className="w-full max-w-[400px]">
          <Button variant="ghost" onClick={handleBack} className="mb-3"><ArrowLeft className="h-4 w-4" />Voltar</Button>
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
              <div className="auth-identity-actions">
                <Button variant="outline" onClick={handleDifferentPerson}>
                  Não sou eu
                </Button>
                <Button onClick={handleConfirmName}>
                  Sim, sou eu!
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Diretoria name-input
    if (step === 'diretoria' && diretoriaStep === 'name-input') {
      return (
        <div className="w-full max-w-[400px]">
          <Button variant="ghost" onClick={handleBack} className="mb-3"><ArrowLeft className="h-4 w-4" />Voltar</Button>
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
            </CardContent>
          </Card>
        </div>
      );
    }

    // Main screen (select / societies / pin / login)
    return (
      <div className={`auth-content ${step === 'select' ? 'auth-content-select' : step === 'login' ? 'auth-content-form' : 'auth-content-flow'}`}>
        {step === 'select' && (
          <header className="auth-content-heading">
            <p className="auth-eyebrow">Bem-vindo à IPNC</p>
            <h1>Como deseja acessar?</h1>
            <p className="auth-intro">Escolha sua área para continuar.</p>
          </header>
        )}
        {step === 'select' ? (
          <div className="auth-access-list">
            <AccessCard title="Diretoria" description="Reuniões, tarefas e organização" icon={Users} tone="green" onClick={() => { setStep('diretoria'); setDiretoriaStep('pin'); }} />
            <AccessCard title="Secretaria EBD" description="Turmas, chamada e histórico" icon={BookOpen} tone="blue" onClick={() => navigateWithTransition('/secretaria')} />
            <AccessCard title="Finanças" description="Acesso privado por sociedade" icon={Wallet} tone="gold" onClick={() => setTreasuryOpen(true)} />
            <AccessCard title="Portal da igreja" description="Programação e avisos" icon={Church} tone="violet" onClick={() => navigateWithTransition('/igreja')} />
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
              <Button variant="ghost" size="icon" aria-label="Voltar" className="h-11 w-11 text-white hover:bg-white/10" onClick={handleBack}>
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
                  <button
                    key={society.id}
                    type="button"
                    className="min-w-0 rounded-2xl border text-card-foreground text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer border-white/20 shadow-lg bg-card/90 dark:bg-card/95 backdrop-blur-md hover:shadow-xl hover:bg-card/95 dark:bg-card transition-all duration-200 active:scale-[0.97]"
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
                  </button>
                ))}
                {/* Pastor virtual card */}
                <button
                  type="button"
                  className="min-w-0 rounded-2xl border text-card-foreground text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer border-white/20 shadow-lg bg-card/90 dark:bg-card/95 backdrop-blur-md hover:shadow-xl hover:bg-card/95 dark:bg-card transition-all duration-200 active:scale-[0.97]"
                  onClick={() => handleSelectDiretoriaSociety({ id: 'pastor', name: 'Pastor', slug: 'pastor', color: '#1e3a5f' })}
                >
                  <CardContent className="flex flex-col items-center justify-center gap-2 p-5">
                    <div className="h-12 w-12 rounded-xl flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: '#1e3a5f' }}>
                      <Church className="h-6 w-6" />
                    </div>
                    <span className="font-semibold text-sm text-foreground">Pastor</span>
                  </CardContent>
                </button>
              </div>
            )}
          </div>
        ) : step === 'membro' && membroStep === 'societies' ? (
          <div className="animate-fade-up" style={{ animationDelay: '0s', animationFillMode: 'both' }}>
            <div className="flex items-center gap-2 mb-4">
              <Button variant="ghost" size="icon" aria-label="Voltar" className="h-11 w-11 text-white hover:bg-white/10" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-lg font-semibold text-white">Selecione sua sociedade</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {societies.map((society) => (
                <button
                  key={society.id}
                  type="button"
                  className="min-w-0 rounded-2xl border text-card-foreground text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer border-white/20 shadow-lg bg-card/90 dark:bg-card/95 backdrop-blur-md hover:shadow-xl hover:bg-card/95 dark:bg-card transition-all duration-200 active:scale-[0.97]"
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
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="animate-fade-up" style={{ animationDelay: '0s', animationFillMode: 'both' }}>
            <Button variant="ghost" onClick={handleBack} className="mb-3"><ArrowLeft className="h-4 w-4" />Voltar</Button>
            <Card className="border-white/20 shadow-2xl bg-card/90 dark:bg-card/95 backdrop-blur-md">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-foreground">Acesso administrativo</h2>
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
              </CardContent>
            </Card>
          </div>
        )}

        {step === 'select' && (
          <div className="auth-access-footer">
            <button type="button" className="auth-admin-button" onClick={() => setStep('login')}><ShieldCheck aria-hidden="true" />Acesso administrativo</button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="auth-page">
      <TreasuryAccessDialog open={treasuryOpen} onOpenChange={setTreasuryOpen} onEntered={id => { setTreasuryOpen(false); navigate(`/tesouraria${id ? `?sociedade=${id}` : ''}`); }} />
      <aside className="auth-brand-panel">
        <div className="auth-brand-content">
          <div className="auth-brand"><img src={logoIpnc} alt="IPNC · Nova Carapina" width="403" height="348" /></div>
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
          {step === 'select' && !isEnteringApp && <p className="auth-values">Comunhão <span>·</span> Discipulado <span>·</span> Serviço <span>·</span> Missão</p>}
          {renderContent()}
          <footer className="auth-page-footer">
            <p className="auth-copyright">© {new Date().getFullYear()} IPNC</p>
            {step === 'select' && !isEnteringApp && <p className="auth-footer-motto">Tudo para a glória de Deus.</p>}
          </footer>
        </div>
      </main>
    </div>
  );
}
