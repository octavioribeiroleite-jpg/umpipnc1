import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useDiretoriaSession } from '@/contexts/DiretoriaSessionContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, ShieldCheck, Users, UserCircle, Church, ArrowRight, UserCheck } from 'lucide-react';
import logoIpnc from '@/assets/logo-ipnc.png';
import { supabase } from '@/integrations/supabase/client';
import PinPad from '@/components/secretaria/PinPad';

type RoleCard = 'pastor' | 'diretoria' | 'membro';

interface Society {
  id: string;
  name: string;
  slug: string;
  color: string;
}

type DiretoriaStep = 'societies' | 'pin' | 'name-confirm' | 'name-input';

const DIRETORIA_FUNCTIONS = ['Presidente', 'Vice-Presidente', 'Secretário(a)', 'Tesoureiro(a)', 'Outro'];

const roleConfig: Record<RoleCard, { label: string; description: string; icon: typeof ShieldCheck; showSociety: boolean }> = {
  pastor: {
    label: 'Pastor',
    description: 'Acompanhamento pastoral das sociedades',
    icon: ShieldCheck,
    showSociety: false,
  },
  diretoria: {
    label: 'Diretoria',
    description: 'Gestão completa da sua sociedade',
    icon: Users,
    showSociety: false,
  },
  membro: {
    label: 'Membro',
    description: 'Eventos e pagamentos da sua sociedade',
    icon: UserCircle,
    showSociety: true,
  },
};

export default function Auth() {
  const [step, setStep] = useState<'select' | 'login' | 'diretoria'>('select');
  const [selectedRole, setSelectedRole] = useState<RoleCard | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedSociety, setSelectedSociety] = useState('');
  const [societies, setSocieties] = useState<Society[]>([]);

  // Diretoria PIN flow state
  const [diretoriaStep, setDiretoriaStep] = useState<DiretoriaStep>('societies');
  const [selectedDiretoriaSociety, setSelectedDiretoriaSociety] = useState<Society | null>(null);
  const [pinError, setPinError] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);
  const [savedName, setSavedName] = useState<string | null>(null);
  const [operatorName, setOperatorName] = useState('');
  const [operatorFunction, setOperatorFunction] = useState('');

  const { signIn, setSelectedSocietyId } = useAuth();
  const { setSession: setDiretoriaSession } = useDiretoriaSession();
  const navigate = useNavigate();
  const { toast } = useToast();

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

  const handleSelectRole = (role: RoleCard) => {
    if (role === 'diretoria') {
      setSelectedRole(role);
      setStep('diretoria');
      setDiretoriaStep('societies');
      setSelectedDiretoriaSociety(null);
      return;
    }
    setSelectedRole(role);
    setStep('login');
    setUsername('');
    setPassword('');
    setSelectedSociety('');
  };

  const handleBack = () => {
    if (step === 'diretoria') {
      if (diretoriaStep === 'pin') {
        setDiretoriaStep('societies');
        setSelectedDiretoriaSociety(null);
        setPinError(false);
        return;
      }
      if (diretoriaStep === 'name-confirm' || diretoriaStep === 'name-input') {
        setDiretoriaStep('pin');
        setSavedName(null);
        setOperatorName('');
        setOperatorFunction('');
        return;
      }
    }
    setStep('select');
    setSelectedRole(null);
  };

  const handleSelectDiretoriaSociety = (society: Society) => {
    setSelectedDiretoriaSociety(society);
    setDiretoriaStep('pin');
    setPinError(false);
  };

  const handlePinComplete = async (pin: string) => {
    if (!selectedDiretoriaSociety) return;
    setPinLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('validate-diretoria-pin', {
        body: { society_slug: selectedDiretoriaSociety.slug, pin },
      });

      if (error || !data?.success) {
        setPinError(true);
        toast({ variant: 'destructive', title: 'PIN incorreto' });
        setTimeout(() => setPinError(false), 600);
        setPinLoading(false);
        return;
      }

      // PIN correct — set Supabase session from the returned token
      const { session } = data;
      await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });

      // Check localStorage for saved name
      const nameKey = `diretoria_name_${selectedDiretoriaSociety.slug}`;
      const funcKey = `diretoria_function_${selectedDiretoriaSociety.slug}`;
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
    const nameKey = `diretoria_name_${selectedDiretoriaSociety.slug}`;
    const funcKey = `diretoria_function_${selectedDiretoriaSociety.slug}`;
    localStorage.setItem(nameKey, name);
    localStorage.setItem(funcKey, func);

    setDiretoriaSession({
      societyId: selectedDiretoriaSociety.id,
      societySlug: selectedDiretoriaSociety.slug,
      societyName: selectedDiretoriaSociety.name,
      societyColor: selectedDiretoriaSociety.color,
      operatorName: name,
      operatorFunction: func,
    });

    toast({ title: 'Bem-vindo!', description: `Entrando como ${name}` });
    navigate('/');
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const config = selectedRole ? roleConfig[selectedRole] : null;

    if (config?.showSociety && !selectedSociety) {
      toast({
        variant: 'destructive',
        title: 'Selecione a sociedade',
        description: 'Escolha sua sociedade antes de entrar.',
      });
      return;
    }

    setIsLoading(true);

    const { error } = await signIn(username, password);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao entrar',
        description: 'Usuário ou senha incorretos',
      });
    } else {
      if (config?.showSociety) {
        setSelectedSocietyId(selectedSociety);
      } else {
        setSelectedSocietyId(null);
      }
      toast({
        title: 'Bem-vindo!',
        description: 'Login realizado com sucesso.',
      });
      navigate('/');
    }

    setIsLoading(false);
  };

  // Render diretoria name confirmation
  if (step === 'diretoria' && diretoriaStep === 'name-confirm' && savedName) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/30 to-background p-4">
        <div className="w-full max-w-sm">
          <Card className="border-border/50 shadow-xl">
            <CardContent className="pt-6 space-y-5">
              <div className="text-center space-y-3">
                <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserCheck className="h-8 w-8 text-primary" />
                </div>
                <h2 className="font-semibold text-lg">Você é</h2>
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
      </div>
    );
  }

  // Render diretoria name input form
  if (step === 'diretoria' && diretoriaStep === 'name-input') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/30 to-background p-4">
        <div className="w-full max-w-sm">
          <Card className="border-border/50 shadow-xl">
            <CardContent className="pt-6 space-y-5">
              <div className="text-center space-y-2">
                <div className="mx-auto h-14 w-14 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${selectedDiretoriaSociety?.color}20` }}>
                  <UserCheck className="h-7 w-7" style={{ color: selectedDiretoriaSociety?.color }} />
                </div>
                <h2 className="font-semibold text-lg">Identificação</h2>
                <p className="text-sm text-muted-foreground">Informe seus dados para a {selectedDiretoriaSociety?.name}</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="operator-name">Nome completo</Label>
                  <Input
                    id="operator-name"
                    placeholder="Digite seu nome completo"
                    value={operatorName}
                    onChange={(e) => setOperatorName(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="operator-function">Função na diretoria</Label>
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
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/30 to-background p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-block animate-logo-pulse mb-4">
            <img
              src={logoIpnc}
              alt="Renovo IPNC"
              className="h-36 w-36 mx-auto object-contain drop-shadow-lg"
            />
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground animate-fade-up" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
            Bem-vindo
          </h1>
          <p className="text-muted-foreground text-sm mt-2 animate-fade-up" style={{ animationDelay: '0.5s', animationFillMode: 'both' }}>
            Igreja Presbiteriana de Nova Carapina
          </p>
        </div>

        {step === 'select' ? (
          /* Step 1: Role cards */
          <div className="space-y-3 animate-fade-up" style={{ animationDelay: '0.7s', animationFillMode: 'both' }}>
            <p className="text-center text-sm text-muted-foreground mb-4">Como deseja entrar?</p>

            {/* Botão acesso sem login */}
            <button
              onClick={() => navigate('/igreja')}
              className="w-full rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 p-4 flex items-center gap-4 hover:scale-[1.02] hover:shadow-lg hover:border-primary/50 transition-all duration-300 animate-shimmer-border"
            >
              <div className="h-12 w-12 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                <Church className="h-6 w-6 text-primary" />
              </div>
              <div className="text-left flex-1">
                <h3 className="font-semibold text-base text-foreground">Acessar sem login</h3>
                <p className="text-xs text-muted-foreground">Programações e avisos da igreja</p>
              </div>
              <ArrowRight className="h-5 w-5 text-primary animate-bounce-right flex-shrink-0" />
            </button>
            {(['pastor', 'diretoria', 'membro'] as RoleCard[]).map((role) => {
              const config = roleConfig[role];
              const Icon = config.icon;
              return (
                <Card
                  key={role}
                  className="cursor-pointer border-border/50 shadow-md hover:shadow-lg hover:border-primary/40 transition-all duration-200 active:scale-[0.98]"
                  onClick={() => handleSelectRole(role)}
                >
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-base">{config.label}</h3>
                      <p className="text-xs text-muted-foreground">{config.description}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : step === 'diretoria' && diretoriaStep === 'societies' ? (
          /* Diretoria: Society cards */
          <div className="animate-fade-up" style={{ animationDelay: '0s', animationFillMode: 'both' }}>
            <div className="flex items-center gap-2 mb-4">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-lg font-semibold">Selecione a sociedade</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {societies.map((society) => (
                <Card
                  key={society.id}
                  className="cursor-pointer border-border/50 shadow-md hover:shadow-lg transition-all duration-200 active:scale-[0.97]"
                  onClick={() => handleSelectDiretoriaSociety(society)}
                >
                  <CardContent className="flex flex-col items-center justify-center gap-2 p-5">
                    <div
                      className="h-12 w-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                      style={{ backgroundColor: society.color }}
                    >
                      {society.slug.toUpperCase().slice(0, 3)}
                    </div>
                    <span className="font-semibold text-sm">{society.name}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : step === 'diretoria' && diretoriaStep === 'pin' ? (
          /* Diretoria: PinPad inline */
          <PinPad
            profileLabel={selectedDiretoriaSociety?.name || 'Diretoria'}
            onBack={handleBack}
            onComplete={handlePinComplete}
            loading={pinLoading}
            error={pinError}
            embedded
          />
        ) : (
          /* Step 2: Login form (Pastor / Membro) */
          <div className="animate-fade-up" style={{ animationDelay: '0s', animationFillMode: 'both' }}>
            <Card className="border-border/50 shadow-xl">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleBack}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <h2 className="text-lg font-semibold">
                    Entrar como {selectedRole && roleConfig[selectedRole].label}
                  </h2>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  {selectedRole && roleConfig[selectedRole].showSociety && (
                    <div className="space-y-2">
                      <Label htmlFor="society">Sociedade</Label>
                      <Select value={selectedSociety} onValueChange={setSelectedSociety}>
                        <SelectTrigger id="society">
                          <SelectValue placeholder="Selecione sua sociedade" />
                        </SelectTrigger>
                        <SelectContent>
                          {societies.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: s.color }}
                                />
                                {s.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="username">Usuário</Label>
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
                    <Label htmlFor="password">Senha</Label>
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

        <p className="text-center text-xs text-muted-foreground mt-6 animate-fade-up" style={{ animationDelay: '1.1s', animationFillMode: 'both' }}>
          © 2025 IPNC - Todos os direitos reservados
        </p>
      </div>
    </div>
  );
}
