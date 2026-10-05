import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LockKeyhole, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { TreasuryDashboard, type TreasuryFilters } from '@/components/treasury/TreasuryDashboard';
import { TreasuryEntryDialog } from '@/components/treasury/TreasuryEntryDialog';
import { TreasuryFundDialog } from '@/components/treasury/TreasuryFundDialog';
import { useTreasuryAccess } from '@/hooks/useTreasuryWorkflow';
import { TreasuryWorkflow } from '@/components/treasury/TreasuryWorkflow';
import { useTreasuryDashboard, useTreasuryStatement } from '@/hooks/useTreasury';
import { clampTreasuryPage, type TreasuryEntry, type TreasuryKind } from '@/lib/treasury';

const emptyFilters: TreasuryFilters = { search: '', kind: '', start: '', end: '' };

export default function Tesouraria() {
  const auth = useAuth();
  const [params, setParams] = useSearchParams();
  const fundId = params.get('sociedade') || undefined;
  const [filters, setFilters] = useState<TreasuryFilters>(emptyFilters);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [entryOpen, setEntryOpen] = useState(false);
  const [fundOpen, setFundOpen] = useState(false);
  const [entry, setEntry] = useState<TreasuryEntry | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const submittingLogin = useRef(false);
  const admin = Boolean(auth.user && auth.isAdmin && auth.profile?.active && auth.rolesLoaded && !auth.loading);
  const access = useTreasuryAccess();
  const managedFunds = useMemo(() => access.data?.fund_ids ?? [], [access.data]);
  const treasurer = Boolean(auth.user && !auth.loading && managedFunds.length);
  const canSubmit = admin || treasurer;
  const dashboard = useTreasuryDashboard();
  const statement = useTreasuryStatement({ fundId, kind: filters.kind as TreasuryKind || 'all', search, start: filters.start, end: filters.end, page });

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Tesouraria · Igreja Presbiteriana de Nova Carapina';
    return () => { document.title = previousTitle; };
  }, []);
  useEffect(() => { const timer = setTimeout(() => setSearch(filters.search), 300); return () => clearTimeout(timer); }, [filters.search]);
  useEffect(() => { setPage(0); }, [fundId]);
  useEffect(() => {
    // Moving/correcting the last entry on a page can shrink this filtered statement.
    if (!statement.isFetching && statement.data) {
      setPage(current => clampTreasuryPage(current, statement.data.total_count));
    }
  }, [statement.data, statement.isFetching]);
  useEffect(() => {
    if (canSubmit && loginOpen) {
      setLoginOpen(false);
      setPassword('');
      toast.success('Acesso à tesouraria confirmado.');
    }
  }, [canSubmit, loginOpen]);
  useEffect(() => { if (!canSubmit) setEntryOpen(false); if (!admin) setFundOpen(false); }, [admin, canSubmit]);

  useEffect(() => {
    if (treasurer && !admin && !fundId && managedFunds.length === 1) setParams({ sociedade: managedFunds[0] }, { replace: true });
  }, [treasurer, admin, fundId, managedFunds, setParams]);

  const changeFund = (id?: string) => {
    setParams(id ? { sociedade: id } : {});
    setFilters(emptyFilters);
    setSearch('');
    setPage(0);
  };
  const refresh = () => { void dashboard.refetch(); void statement.refetch(); };
  const share = async () => {
    const url = new URL('/tesouraria', window.location.origin);
    if (fundId) url.searchParams.set('sociedade', fundId);
    try {
      if (navigator.share) await navigator.share({ title: 'Tesouraria IPNC', text: 'Consulte os caixas das sociedades da Igreja Presbiteriana de Nova Carapina.', url: url.href });
      else { await navigator.clipboard.writeText(url.href); toast.success('Link de consulta copiado.'); }
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === 'AbortError')) toast.error('Não foi possível compartilhar. Copie o endereço desta página.');
    }
  };
  const login = async (event: FormEvent) => {
    event.preventDefault();
    if (submittingLogin.current) return;
    submittingLogin.current = true;
    setSigningIn(true);
    setLoginError('');
    try {
      const result = await auth.signIn(username.trim(), password);
      if (result.error) setLoginError(result.error.message);
      else setPassword('');
    } catch { setLoginError('Não foi possível entrar. Confira sua conexão e tente novamente.'); }
    finally { submittingLogin.current = false; setSigningIn(false); }
  };

  return <>
    <TreasuryDashboard
      data={dashboard.data}
      loading={dashboard.isPending}
      error={dashboard.error?.message}
      refreshing={dashboard.isFetching || statement.isFetching}
      admin={admin}
      signedIn={Boolean(auth.user)}
      treasurer={treasurer}
      workflow={canSubmit && dashboard.data ? <TreasuryWorkflow key={`${auth.user?.id}:${fundId ?? 'all'}`} admin={admin} managedFunds={managedFunds} funds={dashboard.data.funds} fundId={fundId} onEdit={value => { setEntry(value); setEntryOpen(true); }} /> : auth.user && access.error ? <div className="tr-error" role="alert">{access.error.message}</div> : undefined}
      selectedFundId={fundId}
      entries={statement.data?.entries ?? []}
      entriesLoading={statement.isFetching}
      entriesError={statement.error?.message}
      totalCount={statement.data?.total_count ?? 0}
      filteredIncome={statement.data?.income_cents ?? 0}
      filteredExpense={statement.data?.expense_cents ?? 0}
      page={page}
      filters={filters}
      updatedAt={dashboard.dataUpdatedAt ? new Date(dashboard.dataUpdatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : undefined}
      onFund={changeFund}
      onNewEntry={() => { setEntry(null); setEntryOpen(true); }}
      onNewFund={() => setFundOpen(true)}
      onEdit={value => { setEntry(value); setEntryOpen(true); }}
      onLogin={() => { setLoginError(''); setLoginOpen(true); }}
      onLogout={() => { void auth.signOut().then(() => toast.success('Acesso administrativo encerrado.')).catch(() => toast.error('Não foi possível sair. Tente novamente.')); }}
      onShare={() => void share()}
      onRefresh={refresh}
      onFilter={value => { setFilters(value); setPage(0); }}
      onPage={setPage}
    />
    {canSubmit && <TreasuryEntryDialog admin={admin} open={entryOpen} onOpenChange={setEntryOpen} funds={(dashboard.data?.funds ?? []).filter(f => admin || managedFunds.includes(f.id))} initialFundId={admin || managedFunds.includes(fundId) ? fundId : managedFunds[0]} entry={entry} />}
    {admin && <TreasuryFundDialog open={fundOpen} onOpenChange={setFundOpen} />}
    <Dialog open={loginOpen} onOpenChange={open => { if (!signingIn) { setLoginOpen(open); if (!open) setPassword(''); } }}>
      <DialogContent className="treasury-dialog" onEscapeKeyDown={event => { if (signingIn) event.preventDefault(); }} onInteractOutside={event => { if (signingIn) event.preventDefault(); }}>
        <header className="treasury-form-heading"><span className="treasury-form-eyebrow"><LockKeyhole size={14} />TESOURARIA IPNC</span><DialogTitle>Acesso do tesoureiro</DialogTitle><DialogDescription>Use sua conta do Aplicativo IPNC. O administrador define a sociedade de cada tesoureiro.</DialogDescription></header>
        <button className="treasury-dialog-close" disabled={signingIn} aria-label="Fechar acesso do tesoureiro" onClick={() => { setLoginOpen(false); setPassword(''); }}><X size={20} /></button>
        {auth.user && !canSubmit && !auth.loading && !access.isFetching ? <div className="treasury-form-fields"><p>Esta conta pode consultar os caixas, mas ainda não foi vinculada como tesoureiro de uma sociedade. Solicite o vínculo ao administrador.</p><button className="treasury-form-submit tr-button" onClick={() => void auth.signOut().catch(() => setLoginError('Não foi possível trocar de conta. Tente novamente.'))}>Entrar com outra conta</button>{loginError && <p role="alert">{loginError}</p>}</div> : <form className="treasury-form" onSubmit={login}>
          <fieldset className="treasury-form-fields" disabled={signingIn || (Boolean(auth.user) && auth.loading)}><legend className="sr-only">Acesso administrativo</legend><div className="treasury-field"><label htmlFor="treasury-username">Usuário</label><input id="treasury-username" value={username} onChange={event => setUsername(event.target.value)} autoComplete="username" autoCapitalize="none" required /></div><div className="treasury-field"><label htmlFor="treasury-password">Senha</label><input id="treasury-password" type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" required /></div></fieldset>
          {loginError && <p className="treasury-form-error" role="alert">{loginError}</p>}
          <footer className="treasury-form-footer"><div className="treasury-form-actions"><button className="treasury-form-submit" type="submit" disabled={signingIn || (Boolean(auth.user) && auth.loading)}>{signingIn || (Boolean(auth.user) && auth.loading) ? 'Confirmando acesso…' : 'Entrar com segurança'}</button></div></footer>
        </form>}
      </DialogContent>
    </Dialog>
  </>;
}
