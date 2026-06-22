import type { LucideIcon } from 'lucide-react';
import {
  ArrowLeft,
  Baby,
  ChevronRight,
  Church,
  Flame,
  HeartHandshake,
  Loader2,
  ShieldCheck,
  Users,
} from 'lucide-react';

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
  onSelectPastor: () => void;
}

interface SocietyMeta {
  description: string;
  icon: LucideIcon;
  order: number;
}

const SOCIETY_META: Record<string, SocietyMeta> = {
  saf: {
    description: 'Sociedade Auxiliadora Feminina',
    icon: HeartHandshake,
    order: 1,
  },
  ucp: {
    description: 'União de Crianças Presbiterianas',
    icon: Baby,
    order: 2,
  },
  upa: {
    description: 'União Presbiteriana de Adolescentes',
    icon: Flame,
    order: 3,
  },
  ump: {
    description: 'União de Mocidade Presbiteriana',
    icon: Users,
    order: 4,
  },
  uph: {
    description: 'União Presbiteriana de Homens',
    icon: ShieldCheck,
    order: 5,
  },
};

function normalizeSlug(slug: string) {
  return slug.trim().toLowerCase();
}

function SocietyCard({
  title,
  description,
  color,
  icon: Icon,
  onClick,
}: {
  title: string;
  description: string;
  color: string;
  icon: LucideIcon;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-4 rounded-[22px] border border-white/70 bg-white/95 p-3.5 text-left shadow-[0_16px_42px_rgba(0,0,0,0.25)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_20px_52px_rgba(0,0,0,0.32)] active:scale-[0.985] sm:p-4"
    >
      <div
        className="flex h-16 w-16 flex-shrink-0 flex-col items-center justify-center rounded-[18px] text-white shadow-md"
        style={{ backgroundColor: color }}
      >
        <Icon className="mb-0.5 h-6 w-6" strokeWidth={2.1} />
        <span className="text-sm font-extrabold leading-none">{title}</span>
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="text-xl font-extrabold leading-tight text-slate-950">{title}</h3>
        <p className="mt-1 text-sm font-medium leading-snug text-slate-600">{description}</p>
      </div>

      <ChevronRight
        className="h-6 w-6 flex-shrink-0 transition-transform duration-300 group-hover:translate-x-1"
        style={{ color }}
      />
    </button>
  );
}

export default function SocietySelector({
  societies,
  loading = false,
  onBack,
  onSelect,
  onSelectPastor,
}: SocietySelectorProps) {
  const orderedSocieties = [...societies].sort((a, b) => {
    const aOrder = SOCIETY_META[normalizeSlug(a.slug)]?.order ?? 99;
    const bOrder = SOCIETY_META[normalizeSlug(b.slug)]?.order ?? 99;
    return aOrder - bOrder || a.name.localeCompare(b.name, 'pt-BR');
  });

  return (
    <div className="animate-fade-up" style={{ animationDelay: '0s', animationFillMode: 'both' }}>
      <div className="mb-5 flex items-start gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Voltar"
          className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-white/25 bg-black/30 text-white shadow-lg backdrop-blur-md transition-colors hover:bg-black/50"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white drop-shadow-[0_3px_10px_rgba(0,0,0,0.9)]">
            Escolha sua sociedade
          </h2>
          <p className="mt-1 text-sm font-medium text-white/85 drop-shadow-[0_2px_7px_rgba(0,0,0,0.9)]">
            Selecione o grupo que deseja acessar
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-7 w-7 animate-spin text-white" />
        </div>
      ) : (
        <div className="space-y-3">
          {orderedSocieties.map((society) => {
            const slug = normalizeSlug(society.slug);
            const meta = SOCIETY_META[slug];
            const Icon = meta?.icon ?? Users;

            return (
              <SocietyCard
                key={society.id}
                title={society.slug.toUpperCase()}
                description={meta?.description ?? society.name}
                color={society.color}
                icon={Icon}
                onClick={() => onSelect(society)}
              />
            );
          })}

          <SocietyCard
            title="Pastor"
            description="Acesso pastoral"
            color="#173A63"
            icon={Church}
            onClick={onSelectPastor}
          />
        </div>
      )}
    </div>
  );
}
