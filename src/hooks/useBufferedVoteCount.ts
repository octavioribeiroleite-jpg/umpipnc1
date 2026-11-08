import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const initialCount = (electionId: string | undefined, round: number) => ({
  electionId, round, realCount: 0, displayedCount: 0,
  totalPresent: null as number | null, hasSnapshot: false, isError: false, loading: Boolean(electionId),
});

/** Exact anonymous participation: unique ballots in the current round.
 * Uses the public aggregate RPC: no ballot identifiers, choices or voter identities.
 * The historical hook name is retained for existing imports. */
export function useBufferedVoteCount(electionId: string | undefined, currentRound = 1) {
  const [count, setCount] = useState(() => initialCount(electionId, currentRound));
  const [retryVersion, setRetryVersion] = useState(0);
  const retry = useCallback(() => setRetryVersion(version => version + 1), []);

  useEffect(() => {
    if (!electionId || !Number.isSafeInteger(currentRound) || currentRound < 1) {
      setCount(initialCount(electionId, currentRound));
      return;
    }
    let active = true;
    let inFlight = false;
    let pending = false;
    let sequence = 0;
    setCount(previous => previous.electionId === electionId && previous.round === currentRound ? previous : initialCount(electionId, currentRound));

    const fetchCount = async () => {
      if (!active) return;
      if (inFlight) { pending = true; return; }
      inFlight = true;
      const request = ++sequence;
      setCount(previous => ({ ...previous, loading: true }));
      try {
        const { data, error } = await supabase.rpc('election_public_count', { p_election_id: electionId });
        if (error || !data || typeof data !== 'object' || Array.isArray(data)) throw error || new Error('Contagem indisponível');
        const result = data as { election_id?: string; ballots?: number; current_round?: number; total_present?: number };
        if (result.election_id !== electionId || !Number.isSafeInteger(result.ballots) || result.ballots! < 0 || result.current_round !== currentRound || !Number.isSafeInteger(result.total_present) || result.total_present! < 0) throw new Error('Contagem não conferida');
        if (active && request === sequence) setCount(previous => ({
          ...previous, realCount: result.ballots!, displayedCount: result.ballots!, totalPresent: result.total_present!,
          hasSnapshot: true, isError: false, loading: false,
        }));
      } catch {
        if (active && request === sequence) setCount(previous => ({ ...previous, isError: true, loading: false }));
      } finally {
        inFlight = false;
        if (active && pending) { pending = false; void fetchCount(); }
      }
    };

    void fetchCount();
    const channel = supabase.channel(`participation-${electionId}-${currentRound}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'election_votes', filter: `election_id=eq.${electionId}` }, () => void fetchCount())
      .subscribe();
    const interval = setInterval(fetchCount, 3000);
    return () => {
      active = false;
      sequence++;
      pending = false;
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [electionId, currentRound, retryVersion]);

  // Hide a previous election or round synchronously, before effects commit.
  const current = count.electionId === electionId && count.round === currentRound ? count : initialCount(electionId, currentRound);
  return { displayedCount: current.displayedCount, realCount: current.realCount, totalPresent: current.totalPresent,
    hasSnapshot: current.hasSnapshot, isError: current.isError, loading: current.loading, retry };
}
