import { useNavigate } from 'react-router-dom';
import { ExitConfirmDialog, useExitConfirm } from '@/components/layout/ExitConfirmDialog';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Church, Clock, Calendar, Users, CheckSquare, DollarSign, FileText, LogOut } from 'lucide-react';

export default function AguardandoPermissao() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const features = [
    { icon: Users, label: 'Dashboard e estatísticas' },
    { icon: Calendar, label: 'Calendário de eventos' },
    { icon: FileText, label: 'Reuniões e pautas' },
    { icon: CheckSquare, label: 'Gestão de tarefas' },
    { icon: DollarSign, label: 'Controle financeiro' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/30 to-background p-4">
      <div className="w-full max-w-lg animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground mb-4 shadow-lg">
            <Church className="h-8 w-8" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">IPNC</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Igreja Presbiteriana de Nova Carapina
          </p>
        </div>

        <Card className="border-border/50 shadow-xl">
          <CardContent className="pt-8 pb-8 text-center">
            {/* Welcome message */}
            <h2 className="font-display text-xl font-semibold text-foreground mb-2">
              Bem-vindo(a), {profile?.full_name?.split(' ')[0] || 'Usuário'}!
            </h2>
            
            {/* Status card */}
            <div className="bg-secondary/50 rounded-xl p-6 my-6">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-full bg-warning/20 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-warning animate-pulse" />
                </div>
              </div>
              
              <p className="text-foreground font-medium mb-2">
                Sua conta foi criada com sucesso!
              </p>
              <p className="text-muted-foreground text-sm mb-4">
                Estamos aguardando a aprovação do administrador para liberar seu acesso ao sistema.
              </p>
              
              <Badge 
                variant="outline" 
                className="bg-warning/10 text-warning border-warning/30 px-4 py-1.5 animate-pulse"
              >
                <Clock className="h-3 w-3 mr-1.5" />
                Aguardando permissão
              </Badge>
            </div>

            {/* Features preview */}
            <div className="text-left mt-6">
              <p className="text-sm font-medium text-muted-foreground mb-3 text-center">
                Em breve você terá acesso a:
              </p>
              <div className="grid grid-cols-1 gap-2">
                {features.map((feature) => (
                  <div 
                    key={feature.label}
                    className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30"
                  >
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <feature.icon className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm text-foreground">{feature.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Sign out button */}
            <Button 
              variant="outline" 
              className="mt-8 w-full"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair da conta
            </Button>

            {/* Contact info */}
            <p className="text-xs text-muted-foreground mt-6">
              Dúvidas? Entre em contato com a diretoria.
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          © 2024 IPNC - Todos os direitos reservados
        </p>
      </div>
    </div>
  );
}
