import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { createAttendanceQueue } from '@/lib/ebd-attendance-queue';
import { readEbdAttendance, saveEbdAttendance } from '@/lib/ebd-day';
import { reportEbdWriteError } from '@/lib/ebd-mutations';
import type { DayAttendance } from '@/lib/ebd-roster';

export function useEbdAttendanceQueue(scope: string, setAttendance: React.Dispatch<React.SetStateAction<DayAttendance[]>>) {
  const current = useRef({ scope, setAttendance });
  current.current = { scope, setAttendance };
  const queue = useMemo(() => createAttendanceQueue({
    save: saveEbdAttendance,
    read: readEbdAttendance,
    onConfirmed: row => {
      if (current.current.scope !== scope) return;
      current.current.setAttendance(previous => [...previous.filter(item => !(item.student_id === row.student_id && item.date === row.date)), row]);
    },
    onRejected: error => { if (current.current.scope === scope) void reportEbdWriteError(error, 'Não foi possível salvar a presença.'); },
  }), [scope]);
  useEffect(() => { queue.activate(); return () => queue.dispose(); }, [queue]);
  const operations = useSyncExternalStore(queue.subscribe, queue.getSnapshot, queue.getSnapshot);
  return { queue, operations };
}
