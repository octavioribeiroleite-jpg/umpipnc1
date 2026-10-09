import type { ReactNode } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AppLoadingSplash from '@/components/layout/AppLoadingSplash';
import { usesIndependentAccess } from '@/lib/auth-access-scope';
import { APP_HOME_PATH } from '@/lib/app-home';

export function MainAccountAccessBoundary({ authenticated, loading, failed, onSignOut, children }: {
  authenticated: boolean;
  loading: boolean;
  failed: boolean;
  onSignOut: () => Promise<void>;
  children: ReactNode;
}) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  if (usesIndependentAccess(pathname)) return children;
  if (!failed) {
    if (loading) return <AppLoadingSplash label="Confirmando seu acesso…" />;
    if (!authenticated) return <Navigate to={APP_HOME_PATH} replace />;
    return children;
  }

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
