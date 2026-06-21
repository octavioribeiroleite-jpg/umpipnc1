import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, GraduationCap, Lock, ArrowLeft } from 'lucide-react';

interface ProfileSelectProps {
  onSelect: (profile: 'admin' | 'professor') => void;
  onBack?: () => void;
}

export default function ProfileSelect({ onSelect, onBack }: ProfileSelectProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        {onBack && (
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 -ml-2">
            <ArrowLeft className="h-4 w-4" /> Voltar à Igreja
          </Button>
        )}
        <div className="text-center space-y-2">
          <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold">Secretaria EBD</h1>
          <p className="text-sm text-muted-foreground">Selecione seu perfil para continuar</p>
        </div>

        <div className="space-y-3">
          <Card
            className="cursor-pointer transition-all hover:border-primary hover:shadow-md active:scale-[0.98]"
            onClick={() => onSelect('admin')}
          >
            <CardContent className="flex items-center gap-4 p-5">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Administrador</h3>
                <p className="text-xs text-muted-foreground">Acesso completo: chamada, histórico e turmas</p>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer transition-all hover:border-primary hover:shadow-md active:scale-[0.98]"
            onClick={() => onSelect('professor')}
          >
            <CardContent className="flex items-center gap-4 p-5">
              <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center shrink-0">
                <GraduationCap className="h-6 w-6 text-secondary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold">Professor</h3>
                <p className="text-xs text-muted-foreground">Chamada e histórico</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
