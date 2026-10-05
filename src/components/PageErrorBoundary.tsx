import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export class PageErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() { return { failed: true }; }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // Never transmit component data or authentication details in error reports.
    console.error('[App] Não foi possível renderizar esta página.');
  }

  render() {
    if (this.state.failed) return (
      <main className="min-h-screen flex items-center justify-center bg-background p-6">
        <section role="alert" className="w-full max-w-[480px] rounded-2xl border bg-card p-6 space-y-4 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden="true" />
          <h1 className="text-2xl font-semibold">Não foi possível abrir esta tela</h1>
          <p className="text-base text-muted-foreground">Recarregue a página para tentar novamente. Confira o resultado de uma operação pendente antes de repeti-la.</p>
          <Button onClick={() => window.location.reload()}>Tentar novamente</Button>
          <Button asChild variant="outline"><a href="/auth">Voltar à entrada</a></Button>
        </section>
      </main>
    );
    return this.props.children;
  }
}
