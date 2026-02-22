import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, ShieldCheck, Users, UserCircle, Church, ArrowRight } from 'lucide-react';
import logoIpnc from '@/assets/logo-ipnc.png';
import { supabase } from '@/integrations/supabase/client';

type RoleCard = 'pastor' | 'diretoria' | 'membro';

interface Society {
  id: string;
  name: string;
  slug: string;
  color: string;
}

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
  const [step, setStep] = useState<'select' | 'login'>('select');
  const [selectedRole, setSelectedRole] = useState<RoleCard | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedSociety, setSelectedSociety] = useState('');
  const [societies, setSocieties] = useState<Society[]>([]);

  const { signIn, setSelectedSocietyId } = useAuth();
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
    setSelectedRole(role);
    setStep('login');
    setUsername('');
    setPassword('');
    setSelectedSociety('');
  };

  const handleBack = () => {
    setStep('select');
    setSelectedRole(null);
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
            {(['pastor', 'diretoria', 'membro'] as RoleCard[]).map((role, i) => {
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
        ) : (
          /* Step 2: Login form */
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
