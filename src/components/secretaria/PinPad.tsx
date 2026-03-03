import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Delete } from 'lucide-react';
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
    const newPin = pin + digit;
    setPin(newPin);
    if (newPin.length === 6) {
      onComplete(newPin);
    }
  }, [pin, shaking, onComplete]);

  const handleDelete = useCallback(() => {
    setPin(prev => prev.slice(0, -1));
  }, []);

  const handleClear = useCallback(() => {
    setPin('');
  }, []);

  const content = (
    <div className="w-full max-w-xs mx-auto space-y-4">
      {/* Header — hidden when embedded (parent handles it) */}
      {!embedded && (
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="font-semibold text-lg">{profileLabel}</h2>
            <p className="text-xs text-muted-foreground">Digite o PIN de 6 dígitos</p>
          </div>
        </div>
      )}

      {embedded && (
        <div className="flex items-center gap-2 mb-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="font-semibold text-base">{profileLabel}</h2>
            <p className="text-xs text-muted-foreground">Digite o PIN de 6 dígitos</p>
          </div>
        </div>
      )}

      {/* PIN Slots — 6 uniform */}
      <div className={cn(
        "flex items-center justify-center gap-2 transition-transform",
        shaking && "animate-shake"
      )}>
        {[0, 1, 2, 3, 4, 5].map(i => (
          <div
            key={i}
            className={cn(
              "h-10 w-9 rounded-lg border-2 flex items-center justify-center transition-all",
              pin.length > i
                ? shaking ? "border-destructive bg-destructive/10" : "border-primary bg-primary/10"
                : "border-border"
            )}
          >
            {pin.length > i && (
              <div className={cn(
                "h-2.5 w-2.5 rounded-full",
                shaking ? "bg-destructive" : "bg-primary"
              )} />
            )}
          </div>
        ))}
      </div>

      {shaking && (
        <p className="text-center text-sm text-destructive font-medium">PIN incorreto</p>
      )}

      {/* Numeric Keypad */}
      <div className="grid grid-cols-3 gap-1.5">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
          <Button
            key={n}
            variant="outline"
            className="h-12 text-lg font-semibold"
            onClick={() => handleDigit(String(n))}
            disabled={loading || pin.length >= 6}
          >
            {n}
          </Button>
        ))}
        <Button
          variant="ghost"
          className="h-12 text-xs font-medium text-muted-foreground"
          onClick={handleClear}
          disabled={loading || pin.length === 0}
        >
          Limpar
        </Button>
        <Button
          variant="outline"
          className="h-12 text-lg font-semibold"
          onClick={() => handleDigit('0')}
          disabled={loading || pin.length >= 6}
        >
          0
        </Button>
        <Button
          variant="ghost"
          className="h-12"
          onClick={handleDelete}
          disabled={loading || pin.length === 0}
        >
          <Delete className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );

  if (embedded) return content;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {content}
    </div>
  );
}
