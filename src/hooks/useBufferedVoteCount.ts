import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const BATCH_SIZE = 5;
const initialCount = (electionId: string | undefined) => ({
  electionId, realCount: 0, displayedCount: 0, lastReleased: 0,
  hasSnapshot: false, isError: false, loading: Boolean(electionId),
});

/** Releases the anonymous count in batches, at capacity, or when voting ends. */
export function useBufferedVoteCount(
  electionId: string | undefined,
  totalPresent: number,
  force: boolean = false,
  batchSize: number = BATCH_SIZE,
) {
  const [count, setCount] = useState(() => initialCount(electionId));
  const [retryVersion, setRetryVersion] = useState(0);
  const retry = useCallback(() => setRetryVersion(version => version + 1), []);

  useEffect(() => {
    if (!electionId) {
      setCount(initialCount(undefined));
      return;
    }
    // Each subscription owns its queue. Cleanup cannot unlock another election's
    // request, and a late response from the old election cannot publish its count.
    let active = true;
    let inFlight = false;
    let pending = false;
    let sequence = 0;
    setCount(previous => previous.electionId === electionId ? previous : initialCount(electionId));

    const fetchCount = async () => {
      if (!active) return;
      if (inFlight) { pending = true; return; }
      inFlight = true;
      const request = ++sequence;
      setCount(previous => ({ ...previous, loading: true }));
      try {
        const { count: total, error } = await supabase.from('election_votes')
          .select('*', { count: 'exact', head: true }).eq('election_id', electionId);
        if (error) throw error;
        if (total === null) throw new Error('Contagem indisponível');
        if (active && request === sequence) setCount(previous => ({
          ...previous, realCount: total, hasSnapshot: true, isError: false, loading: false,
        }));
      } catch {
        if (active && request === sequence) setCount(previous => ({ ...previous, isError: true, loading: false }));
      } finally {
        inFlight = false;
        if (active && pending) { pending = false; void fetchCount(); }
      }
    };

    void fetchCount();
    const channel = supabase.channel(`buffered-votes-${electionId}`)
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
  }, [electionId, retryVersion]);

  // Preserve the existing release rules exactly: force, capacity, then batches.
  useEffect(() => {
    if (count.electionId !== electionId || !count.hasSnapshot) return;
    setCount(previous => {
      if (previous.electionId !== electionId || !previous.hasSnapshot) return previous;
      if (force || (totalPresent > 0 && previous.realCount >= totalPresent)) {
        if (previous.displayedCount === previous.realCount && previous.lastReleased === previous.realCount) return previous;
        return { ...previous, displayedCount: previous.realCount, lastReleased: previous.realCount };
      }
      const fullBatches = Math.floor(previous.realCount / batchSize) * batchSize;
      if (fullBatches > previous.lastReleased) return { ...previous, displayedCount: fullBatches, lastReleased: fullBatches };
      return previous;
    });
  }, [count.electionId, count.hasSnapshot, count.realCount, electionId, totalPresent, force, batchSize]);

  // Hide the old identity synchronously, before the new effect is committed.
  const current = count.electionId === electionId ? count : initialCount(electionId);
  return { displayedCount: current.displayedCount, realCount: current.realCount,
    hasSnapshot: current.hasSnapshot, isError: current.isError, loading: current.loading, retry };
}
