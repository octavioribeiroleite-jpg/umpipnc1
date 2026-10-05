import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useTreasuryIdentity } from '@/hooks/useTreasuryIdentity';
import { TreasuryAccessDialog } from '@/components/treasury/TreasuryAccessDialog';
import { useQueryClient } from '@tanstack/react-query';
import { TreasuryDashboard, type TreasuryFilters } from '@/components/treasury/TreasuryDashboard';
import { TreasuryEntryDialog } from '@/components/treasury/TreasuryEntryDialog';
import { TreasuryFundDialog } from '@/components/treasury/TreasuryFundDialog';
import { useTreasuryAccess } from '@/hooks/useTreasuryWorkflow';
import { TreasuryWorkflow } from '@/components/treasury/TreasuryWorkflow';
import { useTreasuryDashboard, useTreasuryStatement } from '@/hooks/useTreasury';
import { clampTreasuryPage, type TreasuryEntry, type TreasuryKind } from '@/lib/treasury';

const emptyFilters: TreasuryFilters = { search: '', kind: '', start: '', end: '' };

export default function Tesouraria() {
  const auth = useTreasuryIdentity();
  const [open, setOpen] = useState(true);
  const [, setParams] = useSearchParams();
  if (auth.loading) return <div className="treasury-locked" role="status">Validando acesso à tesouraria…</div>;
  if (!auth.canAccess) return <div className="treasury-locked"><h1>Tesouraria IPNC</h1><p>Entre com o PIN da sua sociedade ou com a conta administrativa.</p><button onClick={() => setOpen(true)}>Acessar tesouraria</button><a href="/auth">Voltar ao início</a><TreasuryAccessDialog open={open} onOpenChange={setOpen} onEntered={id => { setParams(id ? { sociedade: id } : {}, { replace: true }); setOpen(false); }} /></div>;
  return <TreasuryContent key={auth.user?.id} />;
}

function TreasuryContent() {
  const auth = useTreasuryIdentity();
  const cache = useQueryClient();
  const [params, setParams] = useSearchParams();
  const fundId = auth.isAdmin ? params.get('sociedade') || undefined : auth.access.data?.fund_ids[0];
  const [filters, setFilters] = useState<TreasuryFilters>(emptyFilters);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [entryOpen, setEntryOpen] = useState(false);
  const [fundOpen, setFundOpen] = useState(false);
  const [entry, setEntry] = useState<TreasuryEntry | null>(null);
  const admin = auth.isAdmin;
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
      if (navigator.share) await navigator.share({ title: 'Tesouraria IPNC', text: 'Acesse a tesouraria da sua sociedade com seu PIN.', url: url.href });
      else { await navigator.clipboard.writeText(url.href); toast.success('Link de consulta copiado.'); }
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === 'AbortError')) toast.error('Não foi possível compartilhar. Copie o endereço desta página.');
    }
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
      onLogin={() => undefined}
      onLogout={() => { void cache.cancelQueries({ queryKey: ['treasury'] }).then(() => auth.signOut()).then(() => { cache.removeQueries({ queryKey: ['treasury'] }); toast.success('Acesso à tesouraria encerrado.'); }).catch(() => toast.error('Não foi possível sair. Tente novamente.')); }}
      onShare={() => void share()}
      onRefresh={refresh}
      onFilter={value => { setFilters(value); setPage(0); }}
      onPage={setPage}
    />
    {canSubmit && <TreasuryEntryDialog admin={admin} open={entryOpen} onOpenChange={setEntryOpen} funds={(dashboard.data?.funds ?? []).filter(f => admin || managedFunds.includes(f.id))} initialFundId={admin || managedFunds.includes(fundId) ? fundId : managedFunds[0]} entry={entry} />}
    {admin && <TreasuryFundDialog open={fundOpen} onOpenChange={setFundOpen} />}
  </>;
}
