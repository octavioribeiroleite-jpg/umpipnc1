import { Button } from '@/components/ui/button';
import { ArrowLeft, ChevronRight, GraduationCap, Lock, Shield } from 'lucide-react';

interface ProfileSelectProps {
  onSelect: (profile: 'admin' | 'professor') => void;
  onBack?: () => void;
}

export default function ProfileSelect({ onSelect, onBack }: ProfileSelectProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-[440px] space-y-6">
        {onBack && (
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 -ml-2 rounded-xl">
            <ArrowLeft className="h-4 w-4" /> Voltar à Igreja
          </Button>
        )}

        <div className="text-center space-y-3">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-emerald-50 flex items-center justify-center ring-1 ring-emerald-100">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">Acesso restrito</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">Secretaria EBD</h1>
            <p className="mt-2 text-sm font-medium text-muted-foreground">
              Escolha seu perfil para continuar com segurança.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <button
            className="group w-full rounded-[24px] border border-border bg-card p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg active:scale-[0.98]"
            onClick={() => onSelect('admin')}
          >
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0 ring-1 ring-emerald-100">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold text-foreground">Administrador</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Acesso completo à chamada, histórico, turmas e configurações.
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
            </div>
          </button>

          <button
            className="group w-full rounded-[24px] border border-border bg-card p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg active:scale-[0.98]"
            onClick={() => onSelect('professor')}
          >
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0 ring-1 ring-blue-100">
                <GraduationCap className="h-6 w-6 text-blue-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold text-foreground">Professor</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Acesso rápido para registrar chamada e acompanhar sua turma.
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
