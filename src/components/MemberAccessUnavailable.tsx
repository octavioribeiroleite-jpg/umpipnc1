import { Link } from 'react-router-dom';
import { UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function MemberAccessUnavailable() {
  return <main className="min-h-dvh flex items-center justify-center p-4">
    <section className="w-full max-w-[480px] rounded-2xl border bg-card p-6 space-y-4 text-center">
      <UserRound className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden="true" />
      <h1 className="text-2xl font-semibold">Portal dos membros ainda não liberado</h1>
      <p className="text-base text-muted-foreground">Por enquanto, o acesso está disponível para a diretoria e os responsáveis autorizados.</p>
      <Button asChild><Link to="/auth">Acessar como responsável</Link></Button>
    </section>
  </main>;
}
