import type { QueryClient } from '@tanstack/react-query';

// Queries owned by the principal account. Treasury has a separate session and
// clears its own cache; its data must survive a principal-account transition.
const ACCOUNT_QUERY_KEYS = new Set([
  'tasks', 'profiles', 'events', 'files', 'aniversariantes',
  'notificacoes_aniversarios', 'societies', 'meeting-societies',
]);

export function createAuthQueryCacheBoundary(client: QueryClient) {
  let owner: string | null | undefined;
  return (nextOwner: string | null) => {
    if (owner === nextOwner) return;
    owner = nextOwner;
    const filters = { predicate: (query: { queryKey: readonly unknown[] }) => ACCOUNT_QUERY_KEYS.has(String(query.queryKey[0])) };
    // Cancellation happens synchronously; removing immediately prevents a new
    // account from consuming the old fresh snapshot before its first render.
    void client.cancelQueries(filters);
    client.removeQueries(filters);
  };
}
