import { useEbdAttendanceQueue } from '@/hooks/useEbdAttendanceQueue';
import { useCallback, useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import ChamadaTab from './ChamadaTab';
import { Button } from '@/components/ui/button';
import { readEbdDay, closeEbdDay, reopenEbdDay, setEbdCallStatus } from '@/lib/ebd-day';
import { useEbdSync } from '@/hooks/useEbdSync';

interface Props { sessionScope?: string; date: string; onBack: () => void }
type Snapshot = Awaited<ReturnType<typeof readEbdDay>>;

export default function HistoricalChamada({ sessionScope = 'historical', date, onBack }: Props) {
  const [day, setDay] = useState<Snapshot | null>(null);
  const { queue: attendanceQueue } = useEbdAttendanceQueue(`${sessionScope}:${date}`, action => setDay(current => current ? { ...current, attendance: typeof action === 'function' ? action(current.attendance) : action } : current));
  const mounted = useRef(true);
  const revision = useRef(0);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const read = useCallback(async () => {
    const version = revision.current;
    const attendanceVersion = attendanceQueue.readVersion();
    const next = await readEbdDay(date);
    if (mounted.current && version === revision.current) setDay({ ...next, attendance: attendanceQueue.reconcile(next.attendance, attendanceVersion) });
  }, [date, attendanceQueue]);
  const { refresh, syncError } = useEbdSync(true, `historical-${date}`, read);
  const formattedDate = format(new Date(`${date}T12:00:00`), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  return <div className="space-y-4">
    <Button variant="ghost" onClick={onBack} className="-ml-2 scroll-mt-24"><ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao encontro</Button>
    <div><h2 className="text-lg font-semibold">Editar chamadas</h2><p className="text-sm text-muted-foreground">{formattedDate} · Administrador</p></div>
    {syncError && <div role="alert" className="rounded-lg border p-3 text-sm">Não foi possível atualizar as chamadas. <Button variant="link" onClick={() => void refresh()}>Tentar novamente</Button></div>}
    {!day ? <p role="status">Carregando chamadas…</p> : <ChamadaTab
      classes={day.classes} students={day.students} attendance={day.attendance} attendanceQueue={attendanceQueue}
      attendanceDate={date} formattedDate={formattedDate} accessLevel="admin"
      dayIsClosed={!!day.closure} callStatuses={day.callStatuses} classVisitors={day.classVisitors}
      setAttendance={action => { revision.current++; setDay(current => current ? { ...current, attendance: typeof action === 'function' ? action(current.attendance) : action } : current); }}
      onCallStatusChange={async (classId, status) => { await setEbdCallStatus(date, classId, status); revision.current++; await read(); }}
      onCloseDay={async () => { await closeEbdDay(date); revision.current++; await read(); toast.success('Dia fechado com as presenças atualizadas.'); }}
      onReopenDay={async () => { if (!day.closure) return; await reopenEbdDay(date, day.closure.id); revision.current++; await read(); toast.success('Dia reaberto. As presenças foram mantidas.'); }}
    />}
  </div>;
}
