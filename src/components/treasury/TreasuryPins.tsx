import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { treasuryClient } from '@/integrations/supabase/treasury-client';
import type { TreasuryFund } from '@/lib/treasury';
import { useTreasuryIdentity } from '@/hooks/useTreasuryIdentity';

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
  const save = async (fundId: string, enabled: boolean) => {
    if (busy) return; setError('');
    if (enabled && (!/^\d{6}$/.test(pin) || pin !== confirmation)) { setError('Informe 6 números e repita o mesmo PIN na confirmação.'); return; }
    setBusy(true);
    try {
      const result = await treasuryClient.rpc('treasury_set_pin', { p_fund_id: fundId, p_pin: enabled ? pin : null, p_enabled: enabled });
      if (result.error) throw new Error(result.error.message);
      setPin(''); setConfirmation('');
      await cache.invalidateQueries({ queryKey: ['treasury', 'pins'] });
      toast.success(enabled ? 'PIN salvo. Compartilhe-o com o tesoureiro dessa sociedade.' : 'Acesso por PIN desativado.');
    } catch (cause) { setError((cause as Error).message); } finally { setBusy(false); }
  };
  const submit = (event: FormEvent) => { event.preventDefault(); void save(fund, true); };
  return <details className="tr-panel tr-admin-section" open><summary>PINs das sociedades</summary><p>Defina um PIN de 6 números para cada sociedade. Trocar ou desativar o PIN encerra a autorização das sessões anteriores. Cada sociedade acessa somente seu próprio caixa.</p>
    <form onSubmit={submit}><fieldset disabled={busy || status.isPending || Boolean(status.error)} className="tr-report-controls"><legend className="sr-only">Configurar PIN da sociedade</legend><label>Sociedade<select required value={fund} onChange={e => { setFund(e.target.value); setPin(''); setConfirmation(''); }}><option value="">Selecione a sociedade</option>{funds.map(f => <option key={f.id} value={f.id}>{f.abbreviation} — {f.name}</option>)}</select></label><label>Novo PIN<input type="password" inputMode="numeric" autoComplete="new-password" pattern="[0-9]{6}" maxLength={6} required value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} /></label><label>Confirmar PIN<input type="password" inputMode="numeric" autoComplete="new-password" pattern="[0-9]{6}" maxLength={6} required value={confirmation} onChange={e => setConfirmation(e.target.value.replace(/\D/g, ''))} /></label><button className="tr-button tr-primary" type="submit">{busy ? 'Salvando…' : 'Salvar PIN'}</button></fieldset></form>
    <div className="tr-review-list">{funds.map(f => { const item = status.data?.find(s => s.fund_id === f.id); return <div className="tr-manager-row" key={f.id}><span><strong>{f.abbreviation}</strong> · {status.isPending ? 'Consultando…' : status.error ? 'Indisponível' : !item?.configured ? 'PIN não definido' : item.active ? 'Acesso ativo' : 'Acesso desativado'}</span>{item?.active && <button className="tr-button" disabled={busy} onClick={() => void save(f.id, false)}>Desativar PIN da {f.abbreviation}</button>}</div>; })}</div>
    <p className="treasury-field-help">O PIN existente não fica visível. Para recuperar o acesso de uma sociedade, defina um novo PIN.</p>
    {(error || status.error) && <p className="treasury-form-error" role="alert">{error || status.error?.message}</p>}
  </details>;
}
