import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { treasuryClient } from '@/integrations/supabase/treasury-client';
import type { TreasuryFund } from '@/lib/treasury';
import { useTreasuryIdentity } from '@/hooks/useTreasuryIdentity';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ConfirmActionButton } from '@/components/ui/confirm-action-button';

interface PinStatus { fund_id: string; configured: boolean; active: boolean; updated_at: string | null }
export function TreasuryPins({ funds }: { funds: TreasuryFund[] }) {
  const { user } = useTreasuryIdentity();
  const status = useQuery({ queryKey: ['treasury', 'pins', user?.id], retry: false, queryFn: async () => {
    const result = await treasuryClient.rpc('treasury_pin_status'); if (result.error) throw new Error('Não foi possível consultar os PINs.'); return result.data as PinStatus[];
  } });
  const cache = useQueryClient();
  const [fund, setFund] = useState('');
  const [pin, setPin] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const selected = funds.find(item => item.id === fund);
  const clear = () => {setFund('');setPin('');setConfirmation('');setError('');};
  const save = async (fundId: string, enabled: boolean) => {
    if (busy) return false;
    setError('');
    if (enabled && (!/^\d{6}$/.test(pin) || pin !== confirmation)) {setError('Informe 6 números e repita o mesmo PIN na confirmação.');return false;}
    setBusy(true);
    try {
      const result = await treasuryClient.rpc('treasury_set_pin', {p_fund_id:fundId,p_pin:enabled ? pin : null,p_enabled:enabled});
      if (result.error) throw new Error('Não foi possível alterar o PIN. Confira o acesso e tente novamente.');
      await cache.invalidateQueries({queryKey:['treasury','pins']});
      toast.success(enabled ? 'PIN salvo. Compartilhe-o com o tesoureiro dessa sociedade.' : 'Acesso por PIN desativado.');
      clear();return true;
    } catch (cause) {setError((cause as Error).message);return false;}
    finally {setBusy(false);}
  };
  const submit = (event: FormEvent) => {event.preventDefault();void save(fund,true);};
  return <details id="treasury-pins" className="tr-panel tr-admin-section" open>
    <summary>PINs das sociedades</summary>
    <p className="treasury-field-help">Trocar ou desativar o PIN invalida as sessões anteriores. Cada sociedade acessa somente seu caixa.</p>
    <div className="tr-review-list">{funds.map(item => {
      const state = status.data?.find(row => row.fund_id === item.id);
      return <div className="tr-manager-row" key={item.id}>
        <span><strong>{item.abbreviation}</strong> · {status.isPending ? 'Consultando…' : status.error ? 'Indisponível' : !state?.configured ? 'PIN não definido' : state.active ? 'Acesso ativo' : 'Acesso desativado'}</span>
        <div className="flex min-w-0 flex-wrap gap-2">
          <button className="tr-button" disabled={busy || status.isPending || Boolean(status.error)} onClick={() => {clear();setFund(item.id);}}>{state?.configured ? 'Trocar PIN' : 'Definir PIN'}</button>
          {state?.active && <ConfirmActionButton label={`Desativar ${item.abbreviation}`} title={`Desativar o PIN da ${item.abbreviation}?`} description="O acesso por PIN será bloqueado e as sessões anteriores perderão a autorização. Será preciso definir um novo PIN para voltar a entrar." onConfirm={() => save(item.id,false)} variant="outline" />}
        </div>
      </div>;
    })}</div>
    {(error || status.error) && !selected && <p className="treasury-form-error" role="alert">{error || status.error?.message}</p>}
    {status.error && <button className="tr-button" disabled={status.isFetching} onClick={() => void status.refetch()}>Consultar novamente</button>}
    <Dialog open={Boolean(selected)} onOpenChange={open => {if(!open && !busy) clear();}}>
      <DialogContent size="standard">
        <DialogHeader><DialogTitle>PIN da {selected?.abbreviation}</DialogTitle><DialogDescription>Informe o novo PIN. As sessões anteriores serão invalidadas.</DialogDescription></DialogHeader>
        <form onSubmit={submit}><fieldset disabled={busy} className="tr-report-controls">
          <legend className="sr-only">Configurar PIN da sociedade</legend>
          <label>Novo PIN<input type="password" inputMode="numeric" autoComplete="new-password" pattern="[0-9]{6}" maxLength={6} required value={pin} onChange={event => setPin(event.target.value.replace(/\D/g,''))} /></label>
          <label>Confirmar PIN<input type="password" inputMode="numeric" autoComplete="new-password" pattern="[0-9]{6}" maxLength={6} required value={confirmation} onChange={event => setConfirmation(event.target.value.replace(/\D/g,''))} /></label>
          {error && <p className="treasury-form-error" role="alert">{error}</p>}
          <button className="tr-button tr-primary" type="submit">{busy ? 'Salvando…' : 'Salvar PIN'}</button>
        </fieldset></form>
      </DialogContent>
    </Dialog>
  </details>;
}
