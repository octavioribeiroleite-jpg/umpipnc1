import { electionRoomRpc } from '@/lib/election-room-client';
import { useCallback, useEffect, useState } from 'react';
import { parseElectionRoomSnapshot, type ElectionRoomSnapshot } from '@/lib/election-room';

export function useElectionRoom(roomToken: string | undefined, deviceId: string | null) {
  const [state, setState] = useState<{ token?: string; snapshot: ElectionRoomSnapshot | null; error: string }>({ snapshot: null, error: '' });
  const [retryVersion, setRetryVersion] = useState(0);
  const refresh = useCallback(() => setRetryVersion(version => version + 1), []);
  useEffect(() => {
    if (!roomToken || !deviceId) return;
    let active = true, inFlight = false, sequence = 0, failures = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = (delay: number) => { if (active) timer = setTimeout(() => void poll(), delay); };
    const poll = async () => {
      if (!active || inFlight) return;
      clearTimeout(timer);
      if (document.visibilityState === 'hidden') { schedule(30000); return; }
      inFlight = true;
      const request = ++sequence;
      try {
        const { data, error } = await electionRoomRpc('election_room_snapshot', { p_room_token: roomToken, p_device_id: deviceId });
        if (error) throw error;
        const snapshot = parseElectionRoomSnapshot(data);
        if (active && request === sequence) setState({ token: roomToken, snapshot, error: '' });
        failures = 0;
      } catch {
        failures++;
        if (active && request === sequence) setState(previous => ({ token: roomToken, snapshot: previous.token === roomToken ? previous.snapshot : null, error: 'Não foi possível atualizar a sala. Confira a conexão e tente novamente.' }));
      } finally {
        inFlight = false;
        schedule(Math.min(30000, 3000 * 2 ** failures));
      }
    };
    const foreground = () => { if (document.visibilityState === 'visible') void poll(); };
    void poll();
    document.addEventListener('visibilitychange', foreground);
    window.addEventListener('pageshow', foreground);
    return () => { active = false; sequence++; clearTimeout(timer); document.removeEventListener('visibilitychange', foreground); window.removeEventListener('pageshow', foreground); };
  }, [roomToken, deviceId, retryVersion]);
  const current = state.token === roomToken ? state : { snapshot: null, error: '' };
  return { ...current, refresh };
}
