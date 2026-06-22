import type { LucideIcon } from 'lucide-react';
import { SummaryCard, type SummaryDensity, type SummaryTone } from '@/components/ui/summary-card';

export type MetricCardTone = 'default' | 'success' | 'danger' | 'warning' | 'info';
export type MetricCardDensity = 'compact' | 'regular';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  description?: string;
  tone?: MetricCardTone;
  density?: MetricCardDensity;
  onClick?: () => void;
  className?: string;
  valueClassName?: string;
}

const toneMap: Record<MetricCardTone, SummaryTone> = {
  default: 'neutral',
  success: 'positive',
  danger: 'negative',
  warning: 'warning',
  info: 'info',
};

const densityMap: Record<MetricCardDensity, SummaryDensity> = {
  compact: 'compact',
  regular: 'regular',
};

export function MetricCard({
  title,
  value,
  icon,
  description,
  tone = 'default',
  density = 'regular',
  onClick,
  className,
  valueClassName,
}: MetricCardProps) {
  return (
    <SummaryCard
      label={title}
      value={value}
      meta={description}
      icon={icon}
      tone={toneMap[tone]}
      density={densityMap[density]}
      onClick={onClick}
      className={className}
      valueClassName={valueClassName}
    />
  );
}
