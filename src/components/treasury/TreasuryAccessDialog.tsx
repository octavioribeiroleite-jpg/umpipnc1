import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, LockKeyhole, ShieldCheck, Wallet } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { treasuryClient } from '@/integrations/supabase/treasury-client';
import './treasury-access.css';

interface Society { id: string; name: string; abbreviation: string; color: string }
export function TreasuryAccessDialog({ open, onOpenChange, onEntered }: { open: boolean; onOpenChange: (open: boolean) => void; onEntered: (fundId?: string) => void }) {
  const [choice, setChoice] = useState<Society | 'admin' | null>(null);
  const [pin, setPin] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const cache = useQueryClient();
  const directory = useQuery({ queryKey: ['treasury-directory'], enabled: open, retry: false,
    queryFn: async () => { const result = await treasuryClient.rpc('treasury_directory'); if (result.error) throw new Error('Não foi possível carregar as sociedades.'); return result.data as Society[]; } });
  useEffect(() => { if (open) { setChoice(null); setError(''); setPin(''); setPassword(''); } }, [open]);
  const back = () => { setChoice(null); setError(''); setPin(''); setPassword(''); };
  const login = async (event: FormEvent) => {
    event.preventDefault(); if (!choice || submitting.current) return;
    submitting.current = true; setBusy(true); setError('');
    try {
      // Cancel and discard all old financial queries before changing identities.
      await cache.cancelQueries({ queryKey: ['treasury'] });
      cache.removeQueries({ queryKey: ['treasury'] });
      const result = await treasuryClient.functions.invoke(choice === 'admin' ? 'account-login' : 'treasury-pin-login', {
        body: choice === 'admin' ? { username: username.trim(), password } : { fund_id: choice.id, pin },
      });
      if (result.error || !result.data?.session) {
        let message = result.data?.error;
        if (!message && result.error?.context instanceof Response) { try { message = (await result.error.context.json()).error; } catch { /* Generic error below. */ } }
        throw new Error(message || 'Não foi possível entrar. Confira os dados e tente novamente.');
      }
      const session = await treasuryClient.auth.setSession(result.data.session);
      if (session.error) throw new Error('Não foi possível iniciar a sessão.');
      const access = await treasuryClient.rpc('treasury_access');
      if (access.error || (choice === 'admin' ? !access.data?.admin : !access.data?.fund_ids?.includes(choice.id))) {
        await treasuryClient.auth.signOut({ scope: 'local' });
        throw new Error('Este acesso não tem permissão para a tesouraria selecionada.');
      }
      await cache.invalidateQueries({ queryKey: ['treasury'] });
      setPin(''); setPassword(''); onEntered(choice === 'admin' ? undefined : choice.id);
    } catch (cause) { setError((cause as Error).message); setPin(''); setPassword(''); }
    finally { submitting.current = false; setBusy(false); }
  };
  return <Dialog open={open} onOpenChange={value => { if (!busy) onOpenChange(value); }}><DialogContent className="treasury-access-dialog" onInteractOutside={e => { if (busy) e.preventDefault(); }} onEscapeKeyDown={e => { if (busy) e.preventDefault(); }}>
    <div className="ta-heading"><span className="ta-symbol"><Wallet size={24} /></span><DialogTitle>Tesouraria</DialogTitle><DialogDescription>{!choice ? 'Escolha sua sociedade ou o acesso administrativo.' : choice === 'admin' ? 'Entre com sua conta de administrador.' : `Informe o PIN da ${choice.abbreviation}, definido pelo administrador.`}</DialogDescription></div>
    {!choice ? <div className="ta-options">{directory.isPending ? <p role="status">Carregando sociedades…</p> : directory.error ? <div role="alert"><p>{directory.error.message}</p><button onClick={() => void directory.refetch()}>Tentar novamente</button></div> : directory.data?.map(fund => <button className="ta-option" key={fund.id} onClick={() => setChoice(fund)}><span className="ta-abbreviation" style={{ borderColor: fund.color }}>{fund.abbreviation}</span><span><strong>{fund.abbreviation}</strong><small>{fund.name}</small></span><ArrowRight size={18} /></button>)}<button className="ta-option ta-admin" onClick={() => setChoice('admin')}><ShieldCheck size={24} /><span><strong>Acesso administrativo</strong><small>Gerenciar PINs e todas as sociedades</small></span><ArrowRight size={18} /></button></div> : <form className="ta-form" onSubmit={login}><button type="button" className="ta-back" disabled={busy} onClick={back}><ArrowLeft size={16} />Voltar às opções</button><fieldset disabled={busy}><legend className="sr-only">{choice === 'admin' ? 'Acesso administrativo' : `PIN da ${choice.abbreviation}`}</legend>{choice === 'admin' ? <><label>Usuário<input autoFocus autoComplete="username" autoCapitalize="none" required value={username} onChange={e => setUsername(e.target.value)} /></label><label>Senha<input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></label></> : <><h3>{choice.name}</h3><label>PIN de 6 números<input autoFocus className="ta-pin" type="password" inputMode="numeric" autoComplete="off" pattern="[0-9]{6}" maxLength={6} required value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} /></label></>}<button type="submit" className="ta-submit"><LockKeyhole size={17} />{busy ? 'Validando acesso…' : 'Entrar no painel'}</button></fieldset></form>}
    {error && <p className="ta-error" role="alert">{error}</p>}
  </DialogContent></Dialog>;
}
