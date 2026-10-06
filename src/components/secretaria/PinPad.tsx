import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Delete, LogIn, Loader2 } from 'lucide-react';
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
  presentation?: 'access' | 'compact' | 'dialog';
}

export default function PinPad({ profileLabel, onBack, onHome, onComplete, loading, error: externalError, embedded, presentation = 'access' }: PinPadProps) {
  const [pin, setPin] = useState('');
  const [shaking, setShaking] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep the access navigation visible while enabling keyboard input.
  useEffect(() => {
    if (presentation === 'access') window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    else containerRef.current?.closest('[role="dialog"]')?.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    containerRef.current?.focus({ preventScroll: true });
  }, [presentation]);

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

  const navigation = (
    <nav className="ipnc-pin-navigation" aria-label="Navegação do acesso">
      <Button type="button" variant="ghost" onClick={onBack} disabled={loading} className="ipnc-pin-back">
        <ArrowLeft aria-hidden="true" />Voltar
      </Button>
      <PublicHomeButton onClick={onHome} disabled={loading} className="ipnc-pin-home" />
    </nav>
  );

  const content = (
    <>
      {presentation === 'access' && (
        <svg className="ipnc-pin-background" viewBox="0 0 1600 1000" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <g fill="#b6d7c5" fillOpacity="0.2">
            <path d="M1460 1000C1350 850 1410 725 1560 662C1540 824 1505 930 1460 1000Z" />
            <path d="M1460 1000C1305 995 1240 870 1230 790C1370 814 1450 900 1460 1000Z" />
            <path d="M1460 1000C1500 860 1550 838 1600 800V1000Z" />
          </g>
          <g fill="none" stroke="#86b49a" strokeOpacity="0.16" strokeWidth="2">
            <path d="M1560 662L1460 1000M1230 790L1460 1000M1600 800L1460 1000" />
          </g>
        </svg>
      )}
      {presentation === 'access' && navigation}
      <div ref={containerRef} tabIndex={0}
        data-presentation={presentation}
        className={cn('ipnc-pin-card', embedded && 'auth-pin-panel')}
      >
        {presentation !== 'access' && navigation}

        <header className="ipnc-pin-heading">
          <img className="ipnc-pin-logo" src={logoIpnc} alt="IPNC" width="1254" height="1254" />
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
        {presentation !== 'compact' && <p className="ipnc-pin-help">Use o teclado numérico ou clique nos botões</p>}
      </div>
    </>
  );

  if (embedded) return content;
  return <div className="ipnc-pin-page">{content}</div>;
}
