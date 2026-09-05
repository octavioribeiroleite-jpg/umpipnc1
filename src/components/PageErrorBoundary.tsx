import { Component, type ErrorInfo, type ReactNode } from 'react';

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
        <section role="alert" className="max-w-md space-y-4 text-center">
          <h1 className="text-xl font-semibold">Não foi possível abrir esta tela</h1>
          <p className="text-muted-foreground">Seus dados continuam salvos. Recarregue a página para tentar novamente.</p>
          <button className="rounded-lg bg-primary px-5 py-3 text-primary-foreground" onClick={() => window.location.reload()}>Tentar novamente</button>
          <a className="block underline" href="/">Voltar ao início</a>
        </section>
      </main>
    );
    return this.props.children;
  }
}
