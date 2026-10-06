import { useEffect, useId, useRef, type ReactNode } from 'react';
import { ArrowLeft, Lock, type LucideIcon } from 'lucide-react';
import logoIpnc from '@/assets/logo-ipnc.png';
import PublicHomeButton from './PublicHomeButton';
import './AccessShell.css';

export interface AccessShellProps {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  onBack?: () => void;
  onHome?: () => void;
  backLabel?: string;
  showHome?: boolean;
  disabled?: boolean;
  backDisabled?: boolean;
  headingIcon?: LucideIcon;
  eyebrow?: string;
  presentation?: 'page' | 'dialog' | 'compact';
  focusHeading?: boolean;
  titleId?: string;
  className?: string;
  contentClassName?: string;
}

/** The EBD access composition is shared by every selector, form and PIN. */
export function AccessShell({ title, description, children, footer, onBack, onHome, backLabel = 'Voltar', showHome = false, disabled = false, backDisabled, headingIcon: HeadingIcon = Lock, eyebrow = 'Acesso restrito', presentation = 'page', focusHeading = false, titleId, className = '', contentClassName = '' }: AccessShellProps) {
  const uniqueId = useId().replace(/:/g, '');
  const headingRef = useRef<HTMLHeadingElement>(null);
  const headingId = titleId ?? `ipnc-access-title-${uniqueId}`;
  const canopy = `ipnc-access-canopy-${uniqueId}`;
  const leaf = `ipnc-access-leaf-${uniqueId}`;
  const floor = `ipnc-access-floor-${uniqueId}`;
  const Root = presentation === 'page' ? 'main' : 'section';
  const Heading = presentation === 'page' ? 'h1' : 'h2';

  useEffect(() => {
    if (focusHeading) headingRef.current?.focus({ preventScroll: true });
  }, [focusHeading]);

  return <Root className={`ebd-access ipnc-access-shell ipnc-safe-managed ${className}`} data-presentation={presentation} aria-labelledby={headingId}>
    <svg className="ebd-access__art" viewBox="0 0 1600 1000" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={canopy} x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#badbcc" stopOpacity="0.12" /><stop offset="0.52" stopColor="#498e72" stopOpacity="0.5" /><stop offset="1" stopColor="#005039" /></linearGradient>
        <linearGradient id={leaf} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#afdcc1" stopOpacity="0.55" /><stop offset="1" stopColor="#62aa8a" stopOpacity="0.08" /></linearGradient>
        <linearGradient id={floor} x1="0" y1="1" x2="1" y2="0"><stop stopColor="#6baa8c" stopOpacity="0.28" /><stop offset="1" stopColor="#eaf5ef" stopOpacity="0" /></linearGradient>
      </defs>
      <path d="M780 0H1600V470C1490 330 1280 346 1136 235C1015 142 920 76 780 0Z" fill={`url(#${canopy})`} />
      <path d="M0 637C201 664 222 802 465 857C650 900 674 984 785 1000H0Z" fill={`url(#${floor})`} />
      <g fill={`url(#${leaf})`}><path d="M1427 320C1271 293 1236 144 1233 26C1360 62 1449 169 1427 320Z" /><path d="M1443 322C1423 165 1493 76 1580 29C1576 177 1537 281 1443 322Z" /><path d="M5 999C-17 864 34 781 124 733C120 862 83 956 5 999Z" /><path d="M21 1000C36 885 113 847 220 852C174 945 98 995 21 1000Z" /></g>
      <g fill="none" stroke="#d7eee0" strokeOpacity="0.2" strokeWidth="2"><path d="M1233 26L1427 320M1580 29L1443 322M124 733L5 999M220 852L21 1000" /></g>
    </svg>

    {(onBack || showHome || onHome) && <nav className="ebd-access__navigation" aria-label="Navegação do acesso">
      {onBack && <button type="button" onClick={onBack} disabled={backDisabled ?? disabled} className="ebd-access__back"><ArrowLeft aria-hidden="true" /><span>{backLabel}</span></button>}
      {(showHome || onHome) && <PublicHomeButton onClick={onHome} disabled={disabled} className="ebd-access__back ebd-access__home" />}
    </nav>}

    <div className={`ebd-access__content ${contentClassName}`}>
      <img className="ebd-access__logo" src={logoIpnc} alt="IPNC" width="1254" height="1254" />
      <header className="ebd-access__heading">
        <span className="ebd-access__lock"><HeadingIcon aria-hidden="true" /></span>
        {eyebrow && <p className="ebd-access__eyebrow">{eyebrow}</p>}
        <Heading ref={headingRef} id={headingId} tabIndex={focusHeading ? -1 : undefined}>{title}</Heading>
        {description && <p className="ebd-access__intro">{description}</p>}
      </header>
      {children}
      {footer && <footer className="ebd-access__footer">{footer}</footer>}
    </div>
  </Root>;
}
