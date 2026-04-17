import { cn } from '@/lib/utils';

/**
 * Exibe a data/hora do último build do app.
 * O valor de __BUILD_TIME__ é injetado pelo Vite a cada build (ver vite.config.ts).
 * Serve como "carimbo" visual para confirmar se o navegador carregou a versão mais recente.
 */
export function BuildStamp({ className }: { className?: string }) {
  let label = 'Versão indisponível';

  try {
    const iso = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : '';
    if (iso) {
      const d = new Date(iso);
      const date = d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      const time = d
        .toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        .replace(':', 'h');
      label = `Atualizado em ${date} às ${time}`;
    }
  } catch {
    // mantém label padrão
  }

  return (
    <p
      className={cn(
        'text-[10px] text-muted-foreground/70 text-center leading-tight select-none',
        className
      )}
      title={typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : ''}
    >
      {label}
    </p>
  );
}
