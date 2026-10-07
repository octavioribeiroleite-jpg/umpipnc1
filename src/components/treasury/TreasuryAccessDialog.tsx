import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LockKeyhole, ShieldCheck, Wallet } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { treasuryClient } from '@/integrations/supabase/treasury-client';
import { AccessShell } from '@/components/auth/AccessShell';
import { AccessOption } from '@/components/auth/AccessOption';
import PinPad from '@/components/secretaria/PinPad';
import { APP_HOME_PATH } from '@/lib/app-home';
import './treasury-access.css';

interface Society { id: string; name: string; abbreviation: string; color: string }
export function TreasuryAccessDialog({ open, onOpenChange, onEntered }: { open: boolean; onOpenChange: (open: boolean) => void; onEntered: (fundId?: string) => void }) {
  const [choice, setChoice] = useState<Society | 'admin' | null>(null);
  const [pinReset, setPinReset] = useState(0);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const cache = useQueryClient();
  const navigate = useNavigate();
  const directory = useQuery({ queryKey: ['treasury-directory'], enabled: open, retry: false,
    queryFn: async () => { const result = await treasuryClient.rpc('treasury_directory'); if (result.error) throw new Error('Não foi possível carregar as sociedades.'); return result.data as Society[]; } });
  useEffect(() => { if (open) { setChoice(null); setError(''); setPinReset(0); setPassword(''); } }, [open]);
  const back = () => { if (submitting.current) return false; setChoice(null); setError(''); setPinReset(0); setPassword(''); };
  const goHome = () => {
    if (busy) return;
    back();
    onOpenChange(false);
    navigate(APP_HOME_PATH, { replace: true });
  };
  const login = async (enteredPin?: string) => {
    if (!choice || submitting.current || (choice !== 'admin' && !/^[0-9]{6}$/.test(enteredPin ?? ''))) return;
    submitting.current = true; setBusy(true); setError('');
    try {
      // Cancel and discard all old financial queries before changing identities.
      await cache.cancelQueries({ queryKey: ['treasury'] });
      cache.removeQueries({ queryKey: ['treasury'] });
      const result = await treasuryClient.functions.invoke(choice === 'admin' ? 'account-login' : 'treasury-pin-login', {
        body: choice === 'admin' ? { username: username.trim(), password } : { fund_id: choice.id, pin: enteredPin },
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
      setPassword(''); onEntered(choice === 'admin' ? undefined : choice.id);
    } catch (cause) { setError((cause as Error).message); setPinReset(value => value + 1); setPassword(''); }
    finally { submitting.current = false; setBusy(false); }
  };
  const societyChoice = choice && choice !== 'admin' ? choice : null;
  return <Dialog open={open} onOpenChange={value => { if (!busy) onOpenChange(value); }}><DialogContent className={`treasury-access-dialog${societyChoice ? ' treasury-access-dialog-pin' : ''}`} onInteractOutside={e => { if (busy) e.preventDefault(); }} onEscapeKeyDown={e => { if (busy) e.preventDefault(); }}>
    {societyChoice ? <>
      <DialogTitle className="sr-only">Tesouraria · {societyChoice.abbreviation}</DialogTitle>
      <DialogDescription className="sr-only">Informe o PIN da {societyChoice.abbreviation}, definido pelo administrador.</DialogDescription>
      <PinPad key={`${societyChoice.id}:${pinReset}`} embedded presentation="dialog" profileLabel={`Acesso da ${societyChoice.abbreviation}`} onBack={back} onHome={goHome} onComplete={enteredPin => void login(enteredPin)} loading={busy} />
    </> : <>
      <DialogTitle className="sr-only">{choice ? 'Acesso administrativo à tesouraria' : 'Tesouraria'}</DialogTitle>
      <DialogDescription className="sr-only">{choice ? 'Entre com sua conta de administrador.' : 'Escolha sua sociedade ou o acesso administrativo.'}</DialogDescription>
      <AccessShell presentation="dialog" title={choice ? 'Acesso administrativo' : 'Tesouraria'}
        description={!choice ? 'Escolha sua sociedade para continuar com segurança.' : 'Entre com sua conta para gerenciar a tesouraria.'}
        headingIcon={Wallet} onBack={choice ? back : goHome} onHome={goHome} disabled={busy}>
        {!choice ? <div className="ebd-access__profiles ta-options">
          {directory.isPending ? <p role="status">Carregando sociedades…</p>
            : directory.error ? <div role="alert"><p>{directory.error.message}</p><button onClick={() => void directory.refetch()}>Tentar novamente</button></div>
            : directory.data?.map(fund => <AccessOption key={fund.id} className="ta-option" title={fund.abbreviation} description={fund.name}
              color={fund.color} icon={Wallet} onClick={() => setChoice(fund)} />)}
          <AccessOption className="ta-option ta-admin" title="Acesso administrativo" description="Gerenciar PINs e todas as sociedades"
            icon={ShieldCheck} onClick={() => setChoice('admin')} />
        </div> : <form className="ipnc-access-form ta-form" onSubmit={event => { event.preventDefault(); void login(); }}>
          <fieldset disabled={busy}>
            <legend className="sr-only">Acesso administrativo</legend>
            <label>Usuário<input autoFocus autoComplete="username" autoCapitalize="none" required value={username} onChange={e => setUsername(e.target.value)} /></label>
            <label>Senha<input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></label>
            <button type="submit" className="ta-submit"><LockKeyhole size={17} />{busy ? 'Validando acesso…' : 'Entrar no painel'}</button>
          </fieldset>
        </form>}
      </AccessShell>
    </>}
    {error && <p className="ta-error" role="alert">{error}</p>}
  </DialogContent></Dialog>;
}
