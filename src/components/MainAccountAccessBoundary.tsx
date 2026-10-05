import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usesIndependentAccess } from '@/lib/auth-access-scope';

export function MainAccountAccessBoundary({ failed, onSignOut, children }: {
  failed: boolean;
  onSignOut: () => Promise<void>;
  children: ReactNode;
}) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  if (!failed || usesIndependentAccess(pathname)) return children;

  return (
    <main className="min-h-dvh flex items-center justify-center p-4">
      <section role="alert" className="w-full max-w-[480px] rounded-2xl border bg-card p-6 text-center space-y-4">
        <ShieldAlert className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden="true" />
        <h1 className="text-2xl font-semibold">Não foi possível confirmar seu acesso à Diretoria</h1>
        <p className="text-base text-muted-foreground">Tente novamente ou volte à entrada para escolher outro acesso.</p>
        <div className="flex flex-col gap-3">
          <Button onClick={() => window.location.reload()}>Tentar novamente</Button>
          <Button variant="outline" onClick={() => navigate('/auth')}>Voltar à entrada</Button>
          <Button variant="ghost" onClick={() => void onSignOut()}>Sair da Diretoria</Button>
        </div>
      </section>
    </main>
  );
}
