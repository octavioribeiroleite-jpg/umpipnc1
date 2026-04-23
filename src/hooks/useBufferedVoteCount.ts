import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const BATCH_SIZE = 5;

/**
 * Hook que escuta votos em tempo real mas só revela o contador
 * em lotes (default: 5 votos), para preservar o sigilo: ninguém
 * consegue cronometrar "fulano votou agora".
 *
 * O contador exibido também é liberado integralmente quando:
 *  - o total de presentes é atingido
 *  - a votação é encerrada (force=true)
 */
export function useBufferedVoteCount(
  electionId: string | undefined,
  totalPresent: number,
  force: boolean = false,
  batchSize: number = BATCH_SIZE,
) {
  const [realCount, setRealCount] = useState(0);
  const [displayedCount, setDisplayedCount] = useState(0);
  const lastReleasedRef = useRef(0);
  const inFlightRef = useRef(false);
  const pendingRef = useRef(false);

  // Fetch + realtime
  useEffect(() => {
    if (!electionId) return;

    const fetchCount = async () => {
      if (inFlightRef.current) {
        pendingRef.current = true;
        return;
      }

      inFlightRef.current = true;
      try {
        const { count } = await supabase
          .from('election_votes' as any)
          .select('*', { count: 'exact', head: true })
          .eq('election_id', electionId);
        setRealCount(count || 0);
      } finally {
        inFlightRef.current = false;
        if (pendingRef.current) {
          pendingRef.current = false;
          void fetchCount();
        }
      }
    };

    fetchCount();

    const channel = supabase
      .channel(`buffered-votes-${electionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'election_votes',
          filter: `election_id=eq.${electionId}`,
        },
        () => fetchCount(),
      )
      .subscribe();

    const interval = setInterval(fetchCount, 3000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
      inFlightRef.current = false;
      pendingRef.current = false;
    };
  }, [electionId]);

  // Decide quanto mostrar
  useEffect(() => {
    if (force) {
      setDisplayedCount(realCount);
      lastReleasedRef.current = realCount;
      return;
    }

    if (totalPresent > 0 && realCount >= totalPresent) {
      setDisplayedCount(realCount);
      lastReleasedRef.current = realCount;
      return;
    }

    // Só revela em múltiplos do batch
    const fullBatches = Math.floor(realCount / batchSize) * batchSize;
    if (fullBatches > lastReleasedRef.current) {
      setDisplayedCount(fullBatches);
      lastReleasedRef.current = fullBatches;
    }
  }, [realCount, totalPresent, force, batchSize]);

  return { displayedCount, realCount };
}
