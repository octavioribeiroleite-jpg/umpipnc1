import { useEffect, useId, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { Check, Layers3, LoaderCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useTreasuryMutations } from '@/hooks/useTreasury';
import './treasury-forms.css';

interface TreasuryFundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

const colors = [
  { value: '#277463', name: 'Verde' },
  { value: '#4267A5', name: 'Azul' },
  { value: '#9B6584', name: 'Rosa' },
  { value: '#B17D32', name: 'Dourado' },
  { value: '#7561A0', name: 'Violeta' },
  { value: '#637687', name: 'Cinza-azulado' },
];

export function TreasuryFundDialog({ open, onOpenChange, onSaved }: TreasuryFundDialogProps) {
  const { createFund } = useTreasuryMutations();
  const id = useId();
  const [name, setName] = useState('');
  const [abbreviation, setAbbreviation] = useState('');
  const [color, setColor] = useState(colors[0].value);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const pending = saving || createFund.isPending;

  useEffect(() => {
    if (open) {
      setName('');
      setAbbreviation('');
      setColor(colors[0].value);
      setError('');
    }
  }, [open]);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  const close = (nextOpen: boolean) => {
    if (!savingRef.current && !pending) onOpenChange(nextOpen);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (savingRef.current || pending) return;
    setError('');
    const trimmedName = name.trim();
    const trimmedAbbreviation = abbreviation.trim().toLocaleUpperCase('pt-BR');
    if (!trimmedName || !trimmedAbbreviation) {
      setError('Informe o nome e a sigla da sociedade.');
      return;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      await createFund.mutateAsync({ name: trimmedName, abbreviation: trimmedAbbreviation, color });
      toast.success('Sociedade cadastrada.');
      onOpenChange(false);
      onSaved?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível cadastrar a sociedade. Tente novamente.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent
        className="treasury-dialog treasury-fund-dialog"
        onEscapeKeyDown={event => { if (pending) event.preventDefault(); }}
        onInteractOutside={event => { if (pending) event.preventDefault(); }}
      >
        <header className="treasury-form-heading">
          <span className="treasury-form-eyebrow"><Layers3 size={14} aria-hidden="true" /> ORGANIZAR CAIXAS</span>
          <DialogTitle>Nova sociedade</DialogTitle>
          <DialogDescription>Crie um caixa separado para acompanhar suas movimentações.</DialogDescription>
        </header>
        <button type="button" className="treasury-dialog-close" aria-label="Fechar formulário" onClick={() => close(false)} disabled={pending}>
          <X size={20} aria-hidden="true" />
        </button>

        <form className="treasury-form" onSubmit={submit} aria-busy={pending}>
          <fieldset className="treasury-form-fields" disabled={pending}>
            <legend className="sr-only">Dados da sociedade</legend>
            <div className="treasury-field">
              <label htmlFor={`${id}-name`}>Nome da sociedade</label>
              <input id={`${id}-name`} type="text" value={name} onChange={event => setName(event.target.value)} placeholder="Nome completo" required maxLength={100} autoComplete="off" />
            </div>
            <div className="treasury-field">
              <label htmlFor={`${id}-abbreviation`}>Sigla ou nome curto</label>
              <input id={`${id}-abbreviation`} type="text" value={abbreviation} onChange={event => setAbbreviation(event.target.value.toLocaleUpperCase('pt-BR'))} placeholder="Como aparecerá nos cards" required maxLength={12} autoComplete="off" autoCapitalize="characters" />
            </div>
            <fieldset className="treasury-color-field">
              <legend>Cor de identificação</legend>
              <div className="treasury-color-options">
                {colors.map(option => (
                  <label key={option.value} className={`treasury-color-option ${color === option.value ? 'is-selected' : ''}`} style={{ '--fund-color': option.value } as CSSProperties}>
                    <input type="radio" name={`${id}-color`} value={option.value} checked={color === option.value} onChange={() => setColor(option.value)} aria-label={option.name} />
                    <span aria-hidden="true">{color === option.value && <Check size={19} />}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="treasury-fund-preview" style={{ '--fund-color': color } as CSSProperties}>
              <span className="treasury-fund-preview-badge">{abbreviation.trim() || 'SIGLA'}</span>
              <div><strong>{name.trim() || 'Nome da sociedade'}</strong><p>O saldo será calculado pelos lançamentos.</p></div>
            </div>
          </fieldset>

          {error && <div ref={errorRef} role="alert" tabIndex={-1} className="treasury-form-error">{error}</div>}

          <footer className="treasury-form-footer">
            <div className="treasury-form-actions">
              <button type="button" className="treasury-form-cancel" disabled={pending} onClick={() => close(false)}>Cancelar</button>
              <button type="submit" className="treasury-form-submit" disabled={pending}>
                {pending ? <LoaderCircle className="treasury-spinner" size={17} aria-hidden="true" /> : <Check size={17} aria-hidden="true" />}
                {pending ? 'Salvando…' : 'Criar sociedade'}
              </button>
            </div>
          </footer>
        </form>
      </DialogContent>
    </Dialog>
  );
}
