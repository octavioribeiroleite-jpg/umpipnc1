import type { CSSProperties } from 'react';
import { useEffect, useRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowLeft, ChevronRight, Loader2, Users } from 'lucide-react';
import logoIpnc from '@/assets/logo-ipnc.png';
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

function SocietyCard({ title, description, label, color, image, icon: Icon = Users, onClick }: {
  title: string;
  description: string;
  image?: string;
  label: string;
  color: string;
  icon?: LucideIcon;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="auth-society-card"
      aria-label={label}
      style={{ '--society-color': color } as CSSProperties}
      onClick={onClick}
    >
      <span className="auth-society-icon">{image ? <img src={image} alt="" width="384" height="384" /> : <Icon aria-hidden />}</span>
      <span className="auth-society-copy">
        <span className="auth-society-name">{title}</span>
        <span className="auth-society-description">{description}</span>
      </span>
      <span className="auth-society-arrow"><ChevronRight aria-hidden /></span>
    </button>
  );
}

export default function SocietySelector({ societies, loading = false, onBack, onSelect, onSelectPastor }: SocietySelectorProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { headingRef.current?.focus(); }, []);
  const orderedSocieties = [...societies].sort((a, b) => (SOCIETY_META[a.slug.trim().toLowerCase()]?.order ?? 99) - (SOCIETY_META[b.slug.trim().toLowerCase()]?.order ?? 99));
  return (
    <section className="auth-society-selector animate-fade-up" aria-busy={loading}>
      <header className="auth-society-heading">
        <button type="button" className="auth-society-back" aria-label="Voltar" onClick={onBack}>
          <ArrowLeft aria-hidden />
        </button>
        <div className="auth-society-heading-copy">
          <h2 ref={headingRef} tabIndex={-1}>Selecione a sociedade</h2>
          <p>Escolha a sociedade que deseja acessar.</p>
        </div>
        <div className="auth-society-brand"><img src={logoIpnc} alt="IPNC · Nova Carapina" width="403" height="348" /></div>
      </header>
      {loading ? (
        <div className="auth-society-loading" role="status">
          <Loader2 className="animate-spin" aria-hidden />
          <span className="sr-only">Carregando sociedades</span>
        </div>
      ) : (
        <div className="auth-society-grid">
          {orderedSocieties.map((society) => (
            <SocietyCard
              key={society.id}
              title={society.slug.trim().toUpperCase()}
              label={'Acessar ' + society.slug.trim().toUpperCase() + ' — ' + society.name}
              description={SOCIETY_META[society.slug.trim().toLowerCase()]?.description ?? society.name}
              image={SOCIETY_META[society.slug.trim().toLowerCase()]?.image}
              color={SOCIETY_META[society.slug.trim().toLowerCase()]?.color ?? society.color}
              onClick={() => onSelect(society)}
            />
          ))}
          {onSelectPastor && (
            <SocietyCard title="Pastor" description="Área pastoral" label="Acesso pastoral" color="#1465dc" image={pastorIcon} onClick={onSelectPastor} />
          )}
        </div>
      )}
    </section>
  );
}
