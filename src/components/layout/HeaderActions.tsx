import { UpdateAppButton } from '@/components/UpdateAppButton';
import { InstallButton } from '@/components/layout/InstallButton';

interface Props {
  showInstall?: boolean;
  showVersion?: boolean;
}

export function HeaderActions({ showInstall = true, showVersion = true }: Props) {
  const lastUpdate = (() => {
    try {
      const iso = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : '';
      if (!iso) return '';
      const d = new Date(iso);
      const date = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      const time = d
        .toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        .replace(':', 'h');
      return `${date} ${time}`;
    } catch {
      return '';
    }
  })();

  return (
    <div className="flex items-center gap-0.5 flex-shrink-0">
      {showVersion && lastUpdate && (
        <span
          className="hidden sm:inline text-[10px] leading-tight text-muted-foreground mr-1 text-right"
          title={`Última atualização: ${lastUpdate}`}
        >
          v{lastUpdate}
        </span>
      )}
      <UpdateAppButton variant="icon" />
      {showInstall && <InstallButton />}
    </div>
  );
}