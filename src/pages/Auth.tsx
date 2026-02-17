import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import logoIpnc from '@/assets/logo-ipnc.png';
import { supabase } from '@/integrations/supabase/client';

interface Society {
  id: string;
  name: string;
  slug: string;
  color: string;
}

export default function Auth() {
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSociety) {
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
      // Store selected society in context
      setSelectedSocietyId(selectedSociety === 'geral' ? null : selectedSociety);
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
        {/* Logo animada */}
        <div className="text-center mb-8">
          <div className="inline-block animate-logo-pulse mb-4">
            <img
              src={logoIpnc}
              alt="Renovo IPNC"
              className="h-44 w-44 mx-auto object-contain drop-shadow-lg"
            />
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground animate-fade-up" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
            Bem-vindo
          </h1>
          <p className="text-muted-foreground text-sm mt-2 animate-fade-up" style={{ animationDelay: '0.5s', animationFillMode: 'both' }}>
            Igreja Presbiteriana de Nova Carapina
          </p>
          <p className="text-primary font-medium text-sm mt-1 animate-fade-up" style={{ animationDelay: '0.7s', animationFillMode: 'both' }}>
            Painel da Diretoria
          </p>
        </div>

        <div className="animate-fade-up" style={{ animationDelay: '0.9s', animationFillMode: 'both' }}>
          <Card className="border-border/50 shadow-xl">
            <CardHeader className="text-center pb-2">
              <h2 className="text-lg font-semibold">Entrar</h2>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
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
                      <SelectItem value="geral">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-muted-foreground" />
                          Geral (Admin / Pastor)
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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

        <p className="text-center text-xs text-muted-foreground mt-6 animate-fade-up" style={{ animationDelay: '1.1s', animationFillMode: 'both' }}>
          © 2025 IPNC - Todos os direitos reservados
        </p>
      </div>
    </div>
  );
}
