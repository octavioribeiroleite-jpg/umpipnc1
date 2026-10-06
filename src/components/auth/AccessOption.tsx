import type { CSSProperties } from 'react';
import { ChevronRight, Users, type LucideIcon } from 'lucide-react';

interface AccessOptionProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  image?: string;
  color?: string;
  onClick: () => void;
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
}

export function AccessOption({ title, description, icon: Icon = Users, image, color, onClick, ariaLabel, disabled, className = '' }: AccessOptionProps) {
  return <button type="button" className={`ebd-access__profile ipnc-access-option ${className}`} aria-label={ariaLabel} disabled={disabled} onClick={onClick} style={color ? { '--access-option-color': color } as CSSProperties : undefined}>
    <span className="ebd-access__profile-icon">{image ? <img src={image} alt="" width="384" height="384" /> : <Icon aria-hidden="true" />}</span>
    <span className="ebd-access__profile-copy"><span className="ebd-access__profile-title">{title}</span>{description && <span className="ebd-access__profile-description">{description}</span>}</span>
    <ChevronRight className="ebd-access__chevron" aria-hidden="true" />
  </button>;
}
