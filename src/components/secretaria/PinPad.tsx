import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Delete, LogIn, Loader2, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import PublicHomeButton from '@/components/auth/PublicHomeButton';
import logoIpnc from '@/assets/logo-ipnc.png';
import './PinPad.css';

interface PinPadProps {
  profileLabel: string;
  onBack: () => void;
  onHome?: () => void;
  onComplete: (pin: string) => void;
  loading?: boolean;
  error?: boolean;
  embedded?: boolean;
  presentation?: 'access' | 'compact';
}

export default function PinPad({ profileLabel, onBack, onHome, onComplete, loading, error: externalError, embedded, presentation = 'access' }: PinPadProps) {
  const [pin, setPin] = useState('');
  const [shaking, setShaking] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-focus container for keyboard input
  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  // Reset pin and shake on external error
  useEffect(() => {
    if (externalError) {
      setShaking(true);
      setTimeout(() => {
        setPin('');
        setShaking(false);
      }, 500);
    }
  }, [externalError]);

  const handleDigit = useCallback((digit: string) => {
    if (pin.length >= 6 || shaking) return;
    setPin(prev => prev + digit);
  }, [pin.length, shaking]);

  const handleDelete = useCallback(() => {
    setPin(prev => prev.slice(0, -1));
  }, []);

  const handleClear = useCallback(() => {
    setPin('');
  }, []);

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (loading || shaking) return;
      // Let Enter activate the focused control instead of submitting the PIN too.
      if (e.key === 'Enter' && e.target instanceof HTMLElement && e.target.closest('button')) return;

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleDelete();
      } else if (e.key === 'Enter' && pin.length === 6) {
        e.preventDefault();
        onComplete(pin);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loading, shaking, handleDigit, handleDelete, pin, onComplete]);

  const content = (
    <>
      {presentation === 'access' && (
        <svg className="ipnc-pin-background" viewBox="0 0 1600 1000" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <g fill="#b6d7c5" fillOpacity="0.27">
            <path d="M1370 256C1308 135 1377 29 1510 0C1490 114 1455 203 1370 256Z" />
            <path d="M1370 256C1431 131 1530 127 1600 87C1557 214 1453 254 1370 256Z" />
            <path d="M1510 0C1478 166 1534 266 1580 360C1620 230 1624 90 1510 0Z" />
            <path d="M80 1000C-32 887 -53 692 0 547C124 676 157 823 80 1000Z" />
            <path d="M80 1000C44 837 110 704 255 646C228 809 156 925 80 1000Z" />
            <path d="M80 1000C125 867 220 824 347 786C294 927 197 992 80 1000Z" />
          </g>
          <g fill="none" stroke="#86b49a" strokeOpacity="0.16" strokeWidth="2">
            <path d="M1510 0L1370 256M1600 87L1370 256M1510 0L1580 360M0 547L80 1000M255 646L80 1000M347 786L80 1000" />
          </g>
        </svg>
      )}
      <div ref={containerRef} tabIndex={0}
        data-presentation={presentation}
        className={cn('ipnc-pin-card', embedded && 'auth-pin-panel')}
      >
        <nav className="ipnc-pin-navigation" aria-label="Navegação do acesso">
          <Button type="button" variant="ghost" onClick={onBack} disabled={loading} className="ipnc-pin-back">
            <ArrowLeft aria-hidden="true" />Voltar
          </Button>
          <PublicHomeButton onClick={onHome} disabled={loading} className="ipnc-pin-home" />
        </nav>

        <header className="ipnc-pin-heading">
          {presentation === 'access' && <img className="ipnc-pin-logo" src={logoIpnc} alt="IPNC" width="1254" height="1254" />}
          <span className="ipnc-pin-lock"><Lock aria-hidden="true" /></span>
          <h2>{profileLabel === 'Administrador' ? 'Acesso administrativo' : profileLabel}</h2>
          <p>Digite seu PIN de 6 dígitos</p>
        </header>

        <div className={cn('ipnc-pin-slots', shaking && 'ipnc-pin-shaking')} aria-label="PIN de 6 dígitos">
          {[0, 1, 2, 3, 4, 5].map(i => (
            <div key={i} className={cn('ipnc-pin-slot', pin.length > i && 'ipnc-pin-slot-filled', pin.length === i && 'ipnc-pin-slot-current')}>
              {pin.length > i && <span className="ipnc-pin-dot" />}
            </div>
          ))}
        </div>
        <span className="sr-only" role="status">{pin.length} de 6 dígitos preenchidos</span>
        {shaking && <p className="ipnc-pin-error" role="alert">PIN incorreto</p>}

        <div className="ipnc-pin-keypad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
            <Button key={n} type="button" variant="outline" className="ipnc-pin-key" onClick={() => handleDigit(String(n))} disabled={loading || pin.length >= 6}>{n}</Button>
          ))}
          <Button type="button" variant="ghost" className="ipnc-pin-key ipnc-pin-utility" onClick={handleClear} disabled={loading || pin.length === 0}>Limpar</Button>
          <Button type="button" variant="outline" className="ipnc-pin-key" onClick={() => handleDigit('0')} disabled={loading || pin.length >= 6}>0</Button>
          <Button type="button" variant="outline" className="ipnc-pin-key ipnc-pin-delete" onClick={handleDelete} disabled={loading || pin.length === 0} aria-label="Apagar último dígito"><Delete aria-hidden="true" /></Button>
        </div>

        {pin.length === 6 && (
          <Button type="button" className="ipnc-pin-confirm" onClick={() => onComplete(pin)} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" aria-hidden="true" /> : <LogIn aria-hidden="true" />}
            {loading ? 'Verificando...' : 'Confirmar e entrar'}
          </Button>
        )}
        {presentation === 'access' && <p className="ipnc-pin-help">Use o teclado numérico ou clique nos botões</p>}
      </div>
    </>
  );

  if (embedded) return content;
  return <div className="ipnc-pin-page">{content}</div>;
}
