import type { DayAttendance } from './ebd-roster';

export interface AttendanceStudent { id: string; class_id: string }
export type AttendanceState = 'queued' | 'saving' | 'unknown' | 'rejected' | 'confirmed';
export interface AttendanceOperation {
  key: string; student: AttendanceStudent; date: string; desired: boolean;
  state: AttendanceState; settled: boolean; message: string;
}
interface Options {
  save: (student: AttendanceStudent, date: string, desired: boolean, existing?: DayAttendance) => Promise<DayAttendance>;
  read: (student: AttendanceStudent, date: string) => Promise<DayAttendance | null>;
  onConfirmed: (row: DayAttendance) => void;
  onRejected?: (error: unknown) => void;
  concurrency?: number;
  timeoutMs?: number;
}
const busy = (operation: AttendanceOperation) => ['queued', 'saving', 'unknown'].includes(operation.state);
const keyFor = (student: AttendanceStudent, date: string) => `${date}:${student.class_id}:${student.id}`;
// Reports must use a snapshot obtained after the last local or observed remote change.
// A drained queue alone says nothing about when its report data was read.
let dataRevision = 0;
export class EbdSnapshotChangedError extends Error {
  constructor() { super('Os dados da chamada mudaram. Atualize o relatório e tente novamente.'); this.name = 'EbdSnapshotChangedError'; }
}
export function captureEbdSnapshot() { return dataRevision; }
export function markEbdDataChanged() { dataRevision++; }
export function assertEbdSnapshotCurrent(snapshot: number | null): asserts snapshot is number {
  if (snapshot === null || snapshot !== dataRevision) throw new EbdSnapshotChangedError();
}

// Memory only. An in-flight write is not cancelled by unmounting its screen.
// Closing another screen must still wait for its actual outcome.
const barriers = new Set<ReturnType<typeof createAttendanceQueue>>();
const pendingListeners = new Set<() => void>();
let pendingSnapshot: readonly AttendanceOperation[] = [];
export function subscribePendingAttendance(listener: () => void) { pendingListeners.add(listener); return () => pendingListeners.delete(listener); }
export function getPendingAttendanceSnapshot() { return pendingSnapshot; }
export function hasUnconfirmedAttendance(date?: string, classId?: string, studentId?: string) {
  return [...barriers].some(queue => queue.hasPending(date, classId, studentId));
}
export async function verifyUnconfirmedAttendance(date: string) {
  return (await Promise.all([...barriers].map(queue => queue.verifyUnknown(date)))).flat();
}
export function assertAttendanceConfirmed(date: string, classId?: string) {
  if (hasUnconfirmedAttendance(date, classId)) throw new Error('Há presenças aguardando confirmação. Confira a conexão e verifique as marcações antes de finalizar ou gerar o relatório.');
}

export function createAttendanceQueue(options: Options) {
  let active = true;
  let revision = 0;
  let readSequence = 0;
  let appliedRead = { revision: 0, sequence: 0 };
  let appliedRows: DayAttendance[] = [];
  let running = 0;
  let snapshot: readonly AttendanceOperation[] = [];
  const operations = new Map<string, AttendanceOperation>();
  const confirmed = new Map<string, { row: DayAttendance; revision: number }>();
  const listeners = new Set<() => void>();
  const waiting: Array<() => Promise<void>> = [];
  const concurrency = options.concurrency ?? 3;
  const emit = () => {
    snapshot = [...operations.values()];
    if (snapshot.some(busy)) barriers.add(queue); else barriers.delete(queue);
    pendingSnapshot = [...barriers].flatMap(pendingQueue => pendingQueue.getSnapshot().filter(busy));
    listeners.forEach(listener => listener());
    pendingListeners.forEach(listener => listener());
  };
  const finish = (operation: AttendanceOperation, row: DayAttendance) => {
    operation.state = 'confirmed'; operation.settled = true; operation.message = 'Confirmado';
    markEbdDataChanged();
    confirmed.set(operation.key, { row, revision: ++revision });
    if (active) options.onConfirmed(row);
    emit();
  };
  const drain = () => {
    while (active && running < concurrency && waiting.length) {
      running++;
      void waiting.shift()!().finally(() => { running--; drain(); });
    }
  };
  const verify = async (operation: AttendanceOperation) => {
    // A client timeout leaves the original request running. Never infer cancellation.
    if (operation.state !== 'unknown' || !operation.settled) return;
    try {
      const row = await options.read(operation.student, operation.date);
      if (operations.get(operation.key) !== operation || operation.state !== 'unknown') return;
      if (row && row.present === operation.desired) { finish(operation, row); return row; }
      else { operation.message = 'Confirmação desconhecida. O estado consultado difere; confira novamente antes de alterar este aluno.'; emit(); }
    } catch {
      if (operations.get(operation.key) !== operation || operation.state !== 'unknown') return;
      operation.message = 'Sem confirmação. Confira a conexão ou renove o acesso e consulte novamente.'; emit();
    }
  };
  const queue = {
    subscribe(listener: () => void) { listeners.add(listener); return () => listeners.delete(listener); },
    getSnapshot: () => snapshot,
    readVersion: () => ({ revision, sequence: ++readSequence }),
    // Only confirmed records are merged. A read begun before a confirmation must
    // not overwrite that confirmation; a later read may show another device's edit.
    reconcile(rows: DayAttendance[], ticket: { revision: number; sequence: number }) {
      const stale = ticket.sequence < appliedRead.sequence;
      const base = stale ? appliedRows : rows;
      const version = stale ? appliedRead.revision : ticket.revision;
      const result = new Map(base.map(row => [keyFor({ id: row.student_id, class_id: row.class_id }, row.date), row]));
      for (const [key, saved] of confirmed) if (saved.revision > version) result.set(key, saved.row);
      if (!stale) appliedRead = ticket;
      appliedRows = [...result.values()];
      return appliedRows;
    },
    cancelQueued(date: string, classId?: string) {
      let changed = false;
      // The queued closures remain in the bounded drain but skip persistence.
      for (const operation of operations.values()) {
        if (operation.state === 'queued' && operation.date === date && (!classId || operation.student.class_id === classId)) {
          operation.state = 'rejected'; operation.settled = true; operation.message = 'Não enviado: chamada encerrada.'; changed = true;
        }
      }
      if (changed) emit();
    },
    hasPending(date?: string, classId?: string, studentId?: string) { return [...operations.values()].some(op => busy(op) && (!date || op.date === date) && (!classId || op.student.class_id === classId) && (!studentId || op.student.id === studentId)); },
    activate() { active = true; },
    dispose() {
      active = false; waiting.length = 0;
      for (const [key, op] of operations) if (op.state === 'queued') operations.delete(key);
      emit();
    },
    async verifyUnknown(date?: string) {
      const rows = await Promise.all([...operations.values()].filter(op => !date || op.date === date).map(verify));
      return rows.filter((row): row is DayAttendance => !!row);
    },
    submit(student: AttendanceStudent, date: string, desired: boolean, existing?: DayAttendance) {
      const key = keyFor(student, date);
      // The database identity is pupil/date, even after a scope is replaced or
      // the pupil changes class. An old in-flight request remains authoritative.
      if (!active || hasUnconfirmedAttendance(date, undefined, student.id)) return false;
      const operation: AttendanceOperation = { key, student, date, desired, state: 'queued', settled: false, message: 'Aguardando envio' };
      operations.set(key, operation); revision++; markEbdDataChanged(); emit();
      waiting.push(async () => {
        if (operation.state !== 'queued') return;
        operation.state = 'saving'; operation.message = 'Salvando…'; emit();
        const timeout = setTimeout(() => { operation.state = 'unknown'; operation.message = 'Confirmação demorada. Aguardando resposta; não envie novamente.'; emit(); }, options.timeoutMs ?? 12000);
        try { finish(operation, await options.save(student, date, desired, existing)); }
        catch (error) {
          // The save has settled; any verification now has its own lifetime.
          clearTimeout(timeout);
          operation.settled = true;
          if (error && typeof error === 'object' && 'attendanceRejected' in error && error.attendanceRejected === true) {
            operation.state = 'rejected'; operation.message = 'Não salvo. O valor confirmado foi mantido.';
            if (active) options.onRejected?.(error);
          } else { operation.state = 'unknown'; operation.message = 'Confirmação desconhecida. Consultando o registro…'; }
          revision++; emit();
          if (operation.state === 'unknown') await verify(operation);
        } finally { clearTimeout(timeout); }
      });
      drain();
      return true;
    },
  };
  return queue;
}
export type AttendanceQueue = ReturnType<typeof createAttendanceQueue>;
