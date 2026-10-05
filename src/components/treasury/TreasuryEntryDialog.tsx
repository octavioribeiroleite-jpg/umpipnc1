import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { ArrowDownLeft, ArrowUpRight, Banknote, Check, LoaderCircle, QrCode, Wallet, X } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useTreasuryBank } from '@/hooks/useTreasuryWorkflow';
import { TreasuryAttachments } from './TreasuryAttachments';
import { useTreasuryMutations } from '@/hooks/useTreasury';
import {
  centsToInput,
  formatCents,
  parseBrlToCents,
  todayLocal,
  validateTreasuryEntry,
  validateTreasuryReview,
  type TreasuryEntry,
  type TreasuryFund,
} from '@/lib/treasury';
import { createSocietyReceipt, resolveReceiptFund } from '@/lib/treasury-receipt';
import './treasury-forms.css';

interface TreasuryEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  funds: TreasuryFund[];
  initialFundId?: string;
  entry?: TreasuryEntry | null;
  onSaved?: () => void;
  admin?: boolean;
}

interface EntryForm {
  fund_id: string;
  kind: 'income' | 'expense';
  amount: string;
  occurred_on: string;
  person_name: string;
  description: string;
  id?: string;
  revision?: number;
  status: 'pending' | 'confirmed' | 'rejected';
  payment_method: 'pix' | 'transfer' | 'cash' | 'opening';
  shirt: string; monthly: string; capita: string; bank: string; note: string;
}

const emptyForm = (fundId = ''): EntryForm => ({
  fund_id: fundId,
  kind: 'income',
  amount: '',
  occurred_on: todayLocal(),
  person_name: '',
  description: '', status: 'pending', payment_method: 'pix', shirt: '', monthly: '', capita: '', bank: '', note: '',
});

export function TreasuryEntryDialog({
  open,
  onOpenChange,
  funds,
  initialFundId,
  entry,
  onSaved,
  admin = false,
}: TreasuryEntryDialogProps) {
  const bank = useTreasuryBank(open && admin);
  const { createEntry, updateEntry } = useTreasuryMutations();
  const id = useId();
  const receiptFundId = resolveReceiptFund(funds, initialFundId);
  const [form, setForm] = useState<EntryForm>(() => emptyForm(admin ? initialFundId : receiptFundId));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const submissionId = useRef(crypto.randomUUID());
  const previousDialog = useRef({ open: false, entryId: entry?.id });
  const errorRef = useRef<HTMLDivElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const pending = saving || createEntry.isPending || updateEntry.isPending;
  const editing = admin && Boolean(form.id);

  useEffect(() => {
    const opening = open && (!previousDialog.current.open || previousDialog.current.entryId !== entry?.id);
    if (opening) {
      submissionId.current = crypto.randomUUID();
      // Capture the revision once. A background refresh must not overwrite an edit.
      setForm(admin && entry ? {
        id: entry.id,
        revision: entry.revision,
        fund_id: entry.fund_id,
        kind: entry.kind,
        amount: centsToInput(entry.amount_cents),
        occurred_on: entry.occurred_on,
        person_name: entry.person_name,
        description: entry.description, status: entry.status ?? 'confirmed', payment_method: entry.payment_method ?? 'cash',
        shirt: entry.shirt_cents ? centsToInput(entry.shirt_cents) : '', monthly: entry.monthly_fee_cents ? centsToInput(entry.monthly_fee_cents) : '', capita: entry.per_capita_cents ? centsToInput(entry.per_capita_cents) : '', bank: entry.bank_transaction_id || '', note: entry.review_note || '',
      } : emptyForm(admin ? initialFundId : receiptFundId));
      setError('');
    }
    previousDialog.current = { open, entryId: entry?.id };
  }, [open, entry, initialFundId, admin, receiptFundId]);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  const change = <K extends keyof EntryForm>(field: K, value: EntryForm[K]) => {
    setForm(current => ({ ...current, [field]: value }));
  };

  const close = (nextOpen: boolean) => {
    if (!savingRef.current && !pending) onOpenChange(nextOpen);
  };

  let amountCents = 0;
  try {
    amountCents = parseBrlToCents(form.amount);
  } catch {
    // An incomplete amount is normal while typing; validate it on submission.
  }
  const selectedFund = funds.find(fund => fund.id === (admin ? form.fund_id : receiptFundId));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (savingRef.current || pending) return;
    setError('');
    try {
      if (!admin && (entry || form.id)) throw new Error('Somente o administrador pode alterar um lançamento.');
      const payload = admin ? {
        fund_id: form.fund_id,
        kind: form.kind,
        amount_cents: parseBrlToCents(form.amount),
        occurred_on: form.occurred_on,
        person_name: form.person_name.trim(),
        description: form.description.trim(), status: form.status, payment_method: form.payment_method,
        shirt_cents: form.shirt.trim() ? parseBrlToCents(form.shirt) : 0, monthly_fee_cents: form.monthly.trim() ? parseBrlToCents(form.monthly) : 0, per_capita_cents: form.capita.trim() ? parseBrlToCents(form.capita) : 0, bank_transaction_id: form.bank || null, review_note: form.note.trim(),
      } : createSocietyReceipt({
        fund_id: receiptFundId,
        amount: form.amount,
        occurred_on: form.occurred_on,
        person_name: form.person_name,
        description: form.description,
        payment_method: form.payment_method,
      }, funds.map(fund => fund.id));
      validateTreasuryEntry(payload);
      validateTreasuryReview(payload);
      savingRef.current = true;
      setSaving(true);
      if (form.id) {
        await updateEntry.mutateAsync({ ...payload, id: form.id, revision: form.revision! });
      } else {
        await createEntry.mutateAsync({ ...payload, id: submissionId.current });
      }
      toast.success(form.id ? 'Conferência salva.' : payload.status === 'confirmed' ? 'Lançamento registrado e confirmado.' : payload.status === 'rejected' ? 'Lançamento registrado como devolvido.' : 'Recebimento enviado para confirmação.');
      setForm(emptyForm(admin ? initialFundId : receiptFundId));
      submissionId.current = crypto.randomUUID();
      onOpenChange(false);
      onSaved?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar. Confira sua conexão e tente novamente.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent
        className={`treasury-dialog ${admin ? 'treasury-admin-entry-dialog' : 'treasury-receipt-dialog'}`}
        onOpenAutoFocus={event => {
          if (!admin) {
            event.preventDefault();
            amountRef.current?.focus();
          }
        }}
        onEscapeKeyDown={event => { if (pending) event.preventDefault(); }}
        onInteractOutside={event => { if (pending) event.preventDefault(); }}
      >
        <header className="treasury-form-heading">
          <span className="treasury-form-eyebrow"><Wallet size={14} aria-hidden="true" /> TESOURARIA IPNC{!admin && selectedFund && <span className="treasury-receipt-fund" aria-label={`Sociedade ${selectedFund.abbreviation}`}>{selectedFund.abbreviation}</span>}</span>
          <DialogTitle>{editing ? 'Conferir lançamento' : admin ? 'Novo lançamento' : 'Registrar recebimento'}</DialogTitle>
          <DialogDescription>{admin ? 'Confira valor, composição e vínculo bancário antes de confirmar.' : 'Será enviado para confirmação do administrador.'}</DialogDescription>
        </header>
        <button type="button" className="treasury-dialog-close" aria-label="Fechar formulário" onClick={() => close(false)} disabled={pending}>
          <X size={20} aria-hidden="true" />
        </button>

        <form className="treasury-form" onSubmit={submit} aria-busy={pending}>
          <fieldset className="treasury-form-fields" disabled={pending}>
            <legend className="sr-only">Dados do lançamento</legend>
            {admin && <fieldset className="treasury-kind-options">
              <legend className="sr-only">Tipo de movimentação</legend>
              <label className={`treasury-kind-option ${form.kind === 'income' ? 'is-selected' : ''}`}>
                <input type="radio" name={`${id}-kind`} value="income" checked={form.kind === 'income'} onChange={() => change('kind', 'income')} />
                <ArrowDownLeft size={19} aria-hidden="true" />
                <span>Entrada</span>
                {form.kind === 'income' && <Check size={15} className="treasury-kind-check" aria-hidden="true" />}
              </label>
              <label className={`treasury-kind-option treasury-kind-expense ${form.kind === 'expense' ? 'is-selected' : ''}`}>
                <input type="radio" name={`${id}-kind`} value="expense" checked={form.kind === 'expense'} onChange={() => change('kind', 'expense')} />
                <ArrowUpRight size={19} aria-hidden="true" />
                <span>Saída</span>
                {form.kind === 'expense' && <Check size={15} className="treasury-kind-check" aria-hidden="true" />}
              </label>
            </fieldset>}

            {admin && <div className="treasury-field">
              <label htmlFor={`${id}-fund`}>Sociedade</label>
              <select id={`${id}-fund`} value={form.fund_id} onChange={event => change('fund_id', event.target.value)} required>
                <option value="" disabled>Selecione a sociedade</option>
                {funds.map(fund => <option key={fund.id} value={fund.id}>{fund.abbreviation} · {fund.name}</option>)}
              </select>
            </div>}

            <div className="treasury-form-row">
              <div className="treasury-field">
                <label htmlFor={`${id}-amount`}>Valor</label>
                <div className="treasury-money-input">
                  <span aria-hidden="true">R$</span>
                  <input ref={amountRef} id={`${id}-amount`} type="text" inputMode="decimal" autoComplete="off" value={form.amount} onChange={event => change('amount', event.target.value)} placeholder="0,00" maxLength={18} required aria-label="Valor em reais" />
                </div>
              </div>
              <div className="treasury-field">
                <label htmlFor={`${id}-date`}>Data</label>
                <input id={`${id}-date`} type="date" value={form.occurred_on} max={todayLocal()} onChange={event => change('occurred_on', event.target.value)} required />
              </div>
            </div>

            <div className="treasury-field">
              <label htmlFor={`${id}-person`}>Pessoa relacionada</label>
              <input id={`${id}-person`} type="text" value={form.person_name} onChange={event => change('person_name', event.target.value)} placeholder={admin ? 'Nome de quem contribuiu ou recebeu' : 'Nome da pessoa'} maxLength={120} required autoComplete="off" />
            </div>

            <div className="treasury-field">
              <label htmlFor={`${id}-description`}>Descrição</label>
              <textarea id={`${id}-description`} rows={2} value={form.description} onChange={event => change('description', event.target.value)} placeholder={admin ? 'Qual foi o motivo da movimentação?' : 'Ex.: mensalidade de outubro'} maxLength={500} required aria-describedby={admin ? `${id}-public-note` : undefined} />
              {admin && <p id={`${id}-public-note`} className="treasury-field-help">Nome e descrição ficam disponíveis ao administrador e aos responsáveis desta sociedade.</p>}
            </div>
            {admin ? <div className="treasury-field"><label htmlFor={`${id}-payment`}>Forma de recebimento / pagamento</label><select id={`${id}-payment`} value={form.payment_method} onChange={event => { change('payment_method', event.target.value as EntryForm['payment_method']); if (['cash', 'opening'].includes(event.target.value)) change('bank', ''); }}><option value="pix">Pix</option><option value="transfer">Transferência</option><option value="cash">Dinheiro</option><option value="opening">Saldo inicial</option></select></div> : <fieldset className="treasury-payment-field">
              <legend>Recebido por</legend>
              <div className="treasury-payment-options">
                {([{ value: 'pix', label: 'Pix', Icon: QrCode }, { value: 'cash', label: 'Dinheiro', Icon: Banknote }] as const).map(({ value, label, Icon }) => <label key={value} className={`treasury-payment-option ${form.payment_method === value ? 'is-selected' : ''}`}>
                  <input type="radio" name={`${id}-payment`} value={value} checked={form.payment_method === value} onChange={() => change('payment_method', value)} required />
                  <Icon size={18} aria-hidden="true" />
                  <span>{label}</span>
                  {form.payment_method === value && <Check size={16} className="treasury-payment-check" aria-hidden="true" />}
                </label>)}
              </div>
            </fieldset>}
            {admin && <details className="tr-composition" open={Boolean(form.shirt || form.monthly || form.capita) || undefined}><summary>Dividir valor / reservar per capita</summary><p className="treasury-field-help">Informe as partes do mesmo recebimento. O restante será classificado como outros. Separe a per capita da mensalidade para não somá-la duas vezes. Não crie outro lançamento para o mesmo Pix.</p><div className="treasury-form-row treasury-composition-row">{([['shirt', 'Camisa'], ['monthly', 'Mensalidade sem per capita'], ['capita', form.kind === 'expense' ? 'Per capita utilizada' : 'Per capita reservada']] as const).map(([key, label]) => <div className="treasury-field" key={key}><label htmlFor={`${id}-${key}`}>{label} (R$)</label><input id={`${id}-${key}`} inputMode="decimal" value={form[key]} placeholder="0,00" onChange={event => change(key, event.target.value)} /></div>)}</div></details>}
            {admin && <><div className="treasury-field"><label htmlFor={`${id}-status`}>Conferência</label><select id={`${id}-status`} value={form.status} onChange={event => change('status', event.target.value as EntryForm['status'])}><option value="pending">Aguardando confirmação</option><option value="confirmed">Confirmado</option><option value="rejected">Devolvido para conferência</option></select></div>
            {['pix', 'transfer'].includes(form.payment_method) && <div className="treasury-field"><label htmlFor={`${id}-bank`}>Movimento do extrato bancário</label><select id={`${id}-bank`} value={form.bank} onChange={event => change('bank', event.target.value)} required={form.status === 'confirmed'}><option value="">Selecione o movimento conferido</option>{bank.data?.filter(item => item.kind === form.kind).map(item => <option key={item.id} value={item.id}>{item.reference} · {formatCents(item.amount_cents)} · livre {formatCents(item.remaining_cents)}</option>)}</select><p className="treasury-field-help">Cadastre o crédito ou débito em Conferência bancária. Um Pix pode ter várias partes, mas a soma confirmada não pode exceder o valor no banco.</p>{bank.error && <p role="alert">{bank.error.message}</p>}</div>}
            <div className="treasury-field"><label htmlFor={`${id}-note`}>Observação da conferência</label><textarea id={`${id}-note`} rows={2} value={form.note} maxLength={500} onChange={event => change('note', event.target.value)} placeholder="Motivo da devolução ou justificativa para dinheiro / saldo inicial" /></div></>}
          </fieldset>

          {error && <div ref={errorRef} role="alert" tabIndex={-1} className="treasury-form-error">{error}</div>}

          <footer className="treasury-form-footer">
            <div className={`treasury-entry-preview ${form.kind === 'expense' ? 'is-expense' : ''}`} aria-live="polite" aria-atomic="true">
              <span>{admin ? form.kind === 'income' ? 'Entrada' : 'Saída' : 'Recebimento'}{selectedFund ? ` · ${selectedFund.abbreviation}` : ''}</span>
              <strong>{form.kind === 'income' ? '+' : '−'} {formatCents(amountCents)}</strong>
            </div>
            <div className="treasury-form-actions">
              <button type="button" className="treasury-form-cancel" disabled={pending} onClick={() => close(false)}>Cancelar</button>
              <button type="submit" className="treasury-form-submit" disabled={pending || funds.length === 0 || (!admin && !receiptFundId)}>
                {pending ? <LoaderCircle className="treasury-spinner" size={17} aria-hidden="true" /> : <Check size={17} aria-hidden="true" />}
                {pending ? 'Salvando…' : editing ? 'Salvar conferência' : admin ? 'Registrar lançamento' : 'Registrar recebimento'}
              </button>
            </div>
          </footer>
        </form>
        {admin && form.id && <TreasuryAttachments entryId={form.id} admin={admin} />}
      </DialogContent>
    </Dialog>
  );
}
