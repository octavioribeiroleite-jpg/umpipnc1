import { useEffect, useId, useRef } from 'react';
import { ArrowLeft, Loader2, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface IdentityConfirmationProps {
  name: string;
  hideBack?: boolean;
  society?: string;
  role?: string;
  loading?: boolean;
  onBack: () => void;
  onDifferentPerson: () => void;
  onConfirm: () => void;
}

export default function IdentityConfirmation({ name, hideBack = false, society, role, loading = false, onBack, onDifferentPerson, onConfirm }: IdentityConfirmationProps) {
  const headingId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  return (
    <section className="auth-identity" aria-labelledby={headingId} aria-busy={loading}>
      {!hideBack && <Button type="button" variant="ghost" className="auth-identity-back" onClick={onBack}>
        <ArrowLeft aria-hidden />Voltar
      </Button>}
      <div className={`auth-identity-card ${hideBack ? 'ipnc-access-form' : ''}`}>
        {!hideBack && <div className="auth-identity-icon"><UserCheck aria-hidden /></div>}
        <h2 ref={headingRef} id={headingId} tabIndex={-1}>
          <span className="auth-identity-question">Você é</span>
          <span className="auth-identity-name">{name}?</span>
        </h2>
        {(role || society) && <p className="auth-identity-meta">{[role, society].filter(Boolean).join(' — ')}</p>}
        <div className="auth-identity-actions">
          <Button type="button" variant="outline" className="auth-identity-secondary" onClick={onDifferentPerson} disabled={loading}>
            Não sou eu
          </Button>
          <Button type="button" className="auth-identity-primary" onClick={onConfirm} disabled={loading}>
            {loading && <Loader2 className="animate-spin" aria-hidden />}
            Sim, sou eu!
          </Button>
        </div>
        {loading && <span role="status" className="sr-only">Confirmando seu acesso</span>}
      </div>
    </section>
  );
}
