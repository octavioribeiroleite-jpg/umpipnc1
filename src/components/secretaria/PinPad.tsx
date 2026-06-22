import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Delete, LogIn, Loader2, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PinPadProps {
  profileLabel: string;
  onBack: () => void;
  onComplete: (pin: string) => void;
  loading?: boolean;
  error?: boolean;
  embedded?: boolean;
}

export default function PinPad({ profileLabel, onBack, onComplete, loading, error: externalError, embedded }: PinPadProps) {
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
    <div
      ref={containerRef}
      tabIndex={0}
      className={cn(
        "w-full mx-auto space-y-6 outline-none",
        embedded
          ? "max-w-[420px] rounded-[28px] border border-white/50 bg-[#F7FAF6]/95 p-5 shadow-[0_28px_70px_rgba(0,0,0,0.32)] backdrop-blur-xl sm:p-6"
          : "max-w-xs"
      )}
    >
      {/* Header */}
      {!embedded && (
        <div className="flex flex-col items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="self-start shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Lock className="h-7 w-7 text-primary" />
          </div>
          <div className="text-center">
            <h2 className="font-semibold text-lg">{profileLabel}</h2>
            <p className="text-sm text-muted-foreground">Digite o PIN de 6 dígitos</p>
          </div>
        </div>
      )}

      {embedded && (
        <div className="flex items-center gap-3 mb-1">
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl text-muted-foreground hover:bg-emerald-50 hover:text-primary" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-primary ring-1 ring-emerald-100">
            <Lock className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold leading-tight text-foreground">{profileLabel}</h2>
            <p className="text-sm font-medium text-muted-foreground">Informe o PIN de 6 dígitos</p>
          </div>
        </div>
      )}

      {/* PIN Slots */}
      <div className={cn(
        "flex items-center justify-center gap-3 transition-transform",
        shaking && "animate-shake"
      )}>
        {[0, 1, 2, 3, 4, 5].map(i => (
          <div
            key={i}
            className={cn(
              "h-12 w-11 rounded-xl border-2 flex items-center justify-center transition-all duration-200",
              pin.length > i
                ? shaking ? "border-destructive bg-destructive/10" : "border-primary bg-primary/10"
                : pin.length === i
                  ? "border-primary/70 bg-white"
                  : embedded ? "border-emerald-100 bg-white/90" : "border-border"
            )}
          >
            {pin.length > i && (
              <div className={cn(
                "h-3 w-3 rounded-full transition-transform duration-200",
                shaking ? "bg-destructive scale-100" : "bg-primary scale-100",
              )} style={{ animation: 'pinDotIn 150ms ease-out' }} />
            )}
          </div>
        ))}
      </div>

      {shaking && (
        <p className="text-center text-sm text-destructive font-medium">PIN incorreto</p>
      )}

      {/* Numeric Keypad */}
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
          <Button
            key={n}
            variant="outline"
            className={cn(
              "h-14 rounded-2xl text-xl font-bold shadow-sm transition-all duration-100 active:scale-95 active:bg-primary/10",
              embedded
                ? "border-emerald-100 bg-white/90 text-foreground hover:border-primary/40 hover:bg-emerald-50"
                : "rounded-xl hover:bg-accent/50"
            )}
            onClick={() => handleDigit(String(n))}
            disabled={loading || pin.length >= 6}
          >
            {n}
          </Button>
        ))}
        <Button
          variant="ghost"
          className={cn(
            "h-14 rounded-2xl text-sm font-semibold transition-all duration-100 active:scale-95",
            embedded
              ? "text-muted-foreground hover:bg-emerald-50 hover:text-primary disabled:opacity-40"
              : "rounded-xl text-xs text-muted-foreground"
          )}
          onClick={handleClear}
          disabled={loading || pin.length === 0}
        >
          Limpar
        </Button>
        <Button
          variant="outline"
          className={cn(
            "h-14 rounded-2xl text-xl font-bold shadow-sm transition-all duration-100 active:scale-95 active:bg-primary/10",
            embedded
              ? "border-emerald-100 bg-white/90 text-foreground hover:border-primary/40 hover:bg-emerald-50"
              : "rounded-xl hover:bg-accent/50"
          )}
          onClick={() => handleDigit('0')}
          disabled={loading || pin.length >= 6}
        >
          0
        </Button>
        <Button
          variant="ghost"
          className={cn(
            "h-14 rounded-2xl transition-all duration-100 active:scale-95",
            embedded
              ? "text-muted-foreground hover:bg-emerald-50 hover:text-primary disabled:opacity-40"
              : "rounded-xl"
          )}
          onClick={handleDelete}
          disabled={loading || pin.length === 0}
          aria-label="Apagar último dígito"
        >
          <Delete className="h-5 w-5" />
        </Button>
      </div>

      {/* Confirm button */}
      {pin.length === 6 && (
        <Button
          className="w-full h-12 text-base font-semibold gap-2 rounded-2xl animate-in fade-in slide-in-from-bottom-2 duration-200"
          onClick={() => onComplete(pin)}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
          {loading ? 'Verificando...' : 'Confirmar e entrar'}
        </Button>
      )}

      {!embedded && (
        <p className="text-center text-xs text-muted-foreground">
          Use o teclado numérico ou clique nos botões
        </p>
      )}
    </div>
  );

  if (embedded) return content;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <style>{`
        @keyframes pinDotIn {
          from { transform: scale(0); }
          to { transform: scale(1); }
        }
      `}</style>
      {content}
    </div>
  );
}
