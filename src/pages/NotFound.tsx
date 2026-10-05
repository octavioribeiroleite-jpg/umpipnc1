import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FileQuestion } from 'lucide-react';

export default function NotFound() {
  return <main className="flex min-h-dvh items-center justify-center bg-background p-4">
    <section className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center">
      <FileQuestion className="mx-auto mb-4 h-12 w-12 text-primary" aria-hidden="true" />
      <p className="mb-2 text-sm font-semibold text-muted-foreground">404</p>
      <h1 className="mb-3 text-2xl font-bold">Página não encontrada</h1>
      <p className="mb-6 text-base text-muted-foreground">Confira o endereço ou volte ao início.</p>
      <Button asChild><Link to="/">Voltar ao início</Link></Button>
    </section>
  </main>;
}
