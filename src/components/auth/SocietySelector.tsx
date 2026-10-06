import { Loader2 } from 'lucide-react';
import { AccessShell } from './AccessShell';
import { AccessOption } from './AccessOption';
import safIcon from '@/assets/societies/saf.png';
import ucpIcon from '@/assets/societies/ucp.png';
import umpIcon from '@/assets/societies/ump.png';
import upaIcon from '@/assets/societies/upa.png';
import uphIcon from '@/assets/societies/uph.png';
import pastorIcon from '@/assets/societies/pastor.png';

interface SocietyOption {
  id: string;
  name: string;
  slug: string;
  color: string;
}

interface SocietySelectorProps {
  societies: SocietyOption[];
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  onBack: () => void;
  onSelect: (society: SocietyOption) => void;
  onSelectPastor?: () => void;
}

const SOCIETY_META: Record<string, { image: string; description: string; color: string; order: number }> = {
  saf: { image: safIcon, description: 'Sociedade Auxiliadora Feminina', color: '#cc176e', order: 1 },
  ucp: { image: ucpIcon, description: 'União de Crianças Presbiterianas', color: '#7833d7', order: 2 },
  ump: { image: umpIcon, description: 'União de Mocidade Presbiteriana', color: '#1465dc', order: 3 },
  upa: { image: upaIcon, description: 'União Presbiteriana de Adolescentes', color: '#c95b0b', order: 4 },
  uph: { image: uphIcon, description: 'União Presbiteriana de Homens', color: '#138262', order: 5 },
};

export default function SocietySelector({ societies, loading = false, error = false, onRetry, onBack, onSelect, onSelectPastor }: SocietySelectorProps) {
  const orderedSocieties = [...societies].sort((a, b) => (SOCIETY_META[a.slug.trim().toLowerCase()]?.order ?? 99) - (SOCIETY_META[b.slug.trim().toLowerCase()]?.order ?? 99));
  return (
    <AccessShell title="Selecione a sociedade" description="Escolha a sociedade que deseja acessar." onBack={onBack} focusHeading className="ipnc-society-access">
      <div className="ipnc-society-options" aria-busy={loading}>
      {loading ? (
        <div className="ipnc-access-loading" role="status">
          <Loader2 className="animate-spin" aria-hidden />
          <span className="sr-only">Carregando sociedades</span>
        </div>
      ) : error ? (
        <div className="ipnc-access-form" role="alert">
          <p>Não foi possível consultar as sociedades. Confira sua conexão e tente novamente.</p>
          <button type="button" className="ebd-access__back" onClick={onRetry}>Tentar novamente</button>
        </div>
      ) : (
        <div className="ebd-access__profiles">
          {orderedSocieties.map((society) => (
            <AccessOption
              key={society.id}
              title={society.slug.trim().toUpperCase()}
              ariaLabel={'Acessar ' + society.slug.trim().toUpperCase() + ' — ' + society.name}
              description={SOCIETY_META[society.slug.trim().toLowerCase()]?.description ?? society.name}
              image={SOCIETY_META[society.slug.trim().toLowerCase()]?.image}
              color={SOCIETY_META[society.slug.trim().toLowerCase()]?.color ?? society.color}
              onClick={() => onSelect(society)}
            />
          ))}
          {onSelectPastor && (
            <AccessOption title="Pastor" description="Área pastoral" ariaLabel="Acesso pastoral" color="#1465dc" image={pastorIcon} onClick={onSelectPastor} />
          )}
        </div>
      )}
      </div>
    </AccessShell>
  );
}
