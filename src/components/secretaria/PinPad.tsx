import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Delete, LogIn, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AccessShell } from '@/components/auth/AccessShell';
import { createPinBackGuard } from '@/lib/pin-back-navigation';
import { validTrail } from '@/lib/ebd-navigation';
import './PinPad.css';

interface PinPadProps {
  profileLabel: string;
  onBack: () => void | boolean;
  onHome?: () => void;
  onComplete: (pin: string) => void;
  loading?: boolean;
  error?: boolean;
  errorMessage?: string;
  embedded?: boolean;
  presentation?: 'access' | 'compact' | 'dialog';
  reuseEbdHistory?: boolean;
}

export default function PinPad({ profileLabel, onBack, onHome, onComplete, loading, error: externalError, errorMessage, presentation = 'access', reuseEbdHistory = false }: PinPadProps) {
  const [pin, setPin] = useState('');
  const [shaking, setShaking] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const latestBack = useRef({ onBack, loading });
  latestBack.current = { onBack, loading };
  const backGuard = useRef<ReturnType<typeof createPinBackGuard> | null>(null);

  useEffect(() => {
    const state = window.history.state;
    const trail = state?.ebdTrail;
    const guard = createPinBackGuard(window, {
      onBack: () => latestBack.current.onBack(),
      isBusy: () => Boolean(latestBack.current.loading),
    }, { reuseCurrentEntry: reuseEbdHistory && typeof trail?.owner === 'string' && validTrail(trail, trail.owner) && !state.ebdFloor });
    backGuard.current = guard;
    guard.start();
    return () => { guard.stop(); backGuard.current = null; };
  }, [reuseEbdHistory]);

  // Keep the access navigation visible while enabling keyboard input.
  useEffect(() => {
    const dialog = containerRef.current?.closest('[role="dialog"]');
    if (dialog) dialog.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    else {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      containerRef.current?.focus({ preventScroll: true });
    }
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

  return (
    <AccessShell
      title={profileLabel === 'Administrador' ? 'Acesso administrativo' : profileLabel}
      description="Digite seu PIN de 6 dígitos"
      onBack={() => backGuard.current?.back()}
      onHome={onHome}
      showHome
      disabled={loading}
      presentation={presentation === 'access' ? 'page' : presentation}
      className={presentation === 'access' ? 'ipnc-pin-page' : 'ipnc-pin-surface'}
      contentClassName="ipnc-pin-content"
    >
      <div ref={containerRef} tabIndex={0}
        data-dialog-initial-focus
        data-presentation={presentation}
        className="ipnc-pin-card"
      >
        <div className={cn('ipnc-pin-slots', shaking && 'ipnc-pin-shaking')} aria-label="PIN de 6 dígitos">
          {[0, 1, 2, 3, 4, 5].map(i => (
            <div key={i} className={cn('ipnc-pin-slot', pin.length > i && 'ipnc-pin-slot-filled', pin.length === i && 'ipnc-pin-slot-current')}>
              {pin.length > i && <span className="ipnc-pin-dot" />}
            </div>
          ))}
        </div>
        <span className="sr-only" role="status">{pin.length} de 6 dígitos preenchidos</span>
        {(shaking || errorMessage) && <p className="ipnc-pin-error" role="alert">{errorMessage || 'PIN incorreto'}</p>}

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
    </AccessShell>
  );
}
