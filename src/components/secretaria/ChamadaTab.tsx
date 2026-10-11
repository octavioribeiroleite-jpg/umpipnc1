import { readEbdDay } from '@/lib/ebd-day';
import type { DayClosureSummary } from '@/lib/ebd-roster';
import { useEbdNavigation } from '@/hooks/useEbdNavigation';
import { useState, useRef, useEffect, useMemo, useSyncExternalStore } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Users, CheckCircle2, XCircle, PlayCircle, StopCircle, Download, Lock, LockOpen, UserPlus, Plus, X, Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { generateEbdAttendancePDF } from '@/utils/generateEbdPDF';
import { useEbdAttendanceQueue } from '@/hooks/useEbdAttendanceQueue';
import { assertAttendanceConfirmed, getPendingAttendanceSnapshot, subscribePendingAttendance, verifyUnconfirmedAttendance, type AttendanceQueue } from '@/lib/ebd-attendance-queue';
import { reportEbdWriteError } from '@/lib/ebd-mutations';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface EbdClass {
  id: string;
  name: string;
  order_index: number;
}

interface EbdStudent {
  id: string;
  class_id: string;
  name: string;
  nameUnavailable?: boolean;
  attendanceReadOnly?: boolean;
}

interface AttendanceRecord {
  id: string;
  student_id: string;
  class_id: string;
  date: string;
  present: boolean;
}

type ChamadaStatus = 'idle' | 'aberta' | 'finalizada';

interface VisitorEntry {
  id: string;
  name: string | null;
}

interface ChamadaTabProps {
  attendanceQueue?: AttendanceQueue;
  classes: EbdClass[];
  students: EbdStudent[];
  attendance: AttendanceRecord[];
  setAttendance: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>;
  callStatuses?: Record<string, 'aberta' | 'finalizada'>;
  onCallStatusChange: (classId: string, status: 'aberta' | 'finalizada') => Promise<void>;
  attendanceDate: string;
  formattedDate: string;
  initialProfessorName?: string;
  accessLevel: 'admin' | 'professor';
  dayIsClosed?: boolean;
  closureSummary?: DayClosureSummary | null;
  onCloseDay?: () => Promise<void>;
  onReopenDay?: () => Promise<void>;
  classVisitors?: Record<string, VisitorEntry[]>;
  onAddClassVisitor?: (classId: string, name: string | null) => Promise<void> | void;
  onRemoveClassVisitor?: (classId: string, entryId: string) => Promise<void> | void;
}

export default function ChamadaTab({ attendanceQueue: suppliedQueue, classes, students, attendance, setAttendance, callStatuses = {}, onCallStatusChange, attendanceDate, formattedDate, initialProfessorName, accessLevel, dayIsClosed, closureSummary, onCloseDay, onReopenDay, classVisitors = {}, onAddClassVisitor, onRemoveClassVisitor }: ChamadaTabProps) {
  const closedSummary = dayIsClosed ? closureSummary : null;
  const displayClasses = closedSummary ? classes.flatMap(group => {
    const saved = closedSummary.class_summary.find(item => item.classId === group.id);
    return saved ? [{ ...group, name: saved.className }] : [];
  }) : classes;
  const navigation = useEbdNavigation();
  const [localClass, setLocalClass] = useState<EbdClass | null>(null);
  const selectedClassChoice = navigation ? displayClasses.find(cls => cls.id === navigation.screen.classId) || null : localClass;
  const setSelectedClass = (cls: EbdClass | null) => {
    if (navigation) { if (cls) navigation.open({ ...navigation.screen, classId: cls.id }); else navigation.back(); }
    else setLocalClass(cls);
  };
  useEffect(() => { window.scrollTo({ top: 0 }); }, [selectedClassChoice?.id, attendanceDate]);
  const selectedClass = displayClasses.find(cls => cls.id === selectedClassChoice?.id) || null;
  const localQueue = useEbdAttendanceQueue(`${accessLevel}:${attendanceDate}`, setAttendance);
  const attendanceQueue = suppliedQueue ?? localQueue.queue;
  const localOperations = useSyncExternalStore(attendanceQueue.subscribe, attendanceQueue.getSnapshot, attendanceQueue.getSnapshot);
  const pendingOperations = useSyncExternalStore(subscribePendingAttendance, getPendingAttendanceSnapshot, getPendingAttendanceSnapshot);
  const visibleStudents = useMemo(() => new Set(students.map(student => student.id)), [students]);
  const visibleClasses = useMemo(() => new Set(classes.map(group => group.id)), [classes]);
  const operations = useMemo(() => [...new Map([
    ...localOperations,
    ...pendingOperations.filter(operation => operation.date === attendanceDate && visibleStudents.has(operation.student.id) && visibleClasses.has(operation.student.class_id)),
  ].map(operation => [operation.key, operation])).values()], [localOperations, pendingOperations, attendanceDate, visibleStudents, visibleClasses]);
  const verificationScope = useRef({ queue: attendanceQueue, date: attendanceDate, visibleStudents, visibleClasses });
  verificationScope.current = { queue: attendanceQueue, date: attendanceDate, visibleStudents, visibleClasses };
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const verifyPending = async () => {
    const rows = await verifyUnconfirmedAttendance(attendanceDate);
    const current = verificationScope.current;
    if (!mounted.current || current.queue !== attendanceQueue || current.date !== attendanceDate) return;
    const authorizedRows = rows.filter(row => row.date === current.date && current.visibleStudents.has(row.student_id) && current.visibleClasses.has(row.class_id));
    if (authorizedRows.length) setAttendance(previous => [...previous.filter(row => !authorizedRows.some(confirmed => confirmed.student_id === row.student_id && confirmed.date === row.date)), ...authorizedRows]);
  };
  const pendingCount = operations.filter(operation => ['queued', 'saving', 'unknown'].includes(operation.state)).length;
  const unknownCount = operations.filter(operation => operation.state === 'unknown').length;
  const saveMessage = unknownCount ? `${unknownCount} marcação(ões) sem confirmação. Confira antes de finalizar.` : pendingCount ? `${pendingCount} marcação(ões) aguardando confirmação. Os totais mostram somente dados confirmados.` : operations.some(operation => operation.state === 'rejected') ? 'Uma marcação foi recusada. Os demais registros foram preservados.' : operations.length ? 'Marcações confirmadas.' : '';
  const operationByStudent = useMemo(() => new Map(operations.filter(operation => operation.date === attendanceDate).map(operation => [operation.student.id, operation])), [operations, attendanceDate]);
  const recordByStudent = useMemo(() => new Map(attendance.filter(record => record.date === attendanceDate).map(record => [record.student_id, record])), [attendance, attendanceDate]);
  const chamadaStatusMap = callStatuses;
  useEffect(() => {
    if (dayIsClosed) attendanceQueue.cancelQueued(attendanceDate);
    else for (const [classId, status] of Object.entries(callStatuses)) if (status === 'finalizada') attendanceQueue.cancelQueued(attendanceDate, classId);
  }, [attendanceQueue, attendanceDate, dayIsClosed, callStatuses]);
  const [savingStatus, setSavingStatus] = useState(false);
  const statusInFlight = useRef(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showReopenConfirm, setShowReopenConfirm] = useState(false);
  const [closingDay, setClosingDay] = useState(false);
  const dayActionInFlight = useRef(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const pdfInFlight = useRef(false);
  const [visitorInputOpen, setVisitorInputOpen] = useState(false);
  const [visitorNameDraft, setVisitorNameDraft] = useState('');
  const [addingVisitor, setAddingVisitor] = useState(false);
  const visitorInFlight = useRef(false);
  const visitorInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = accessLevel === 'admin';
  const totalVisitors = closedSummary ? closedSummary.visitor_count ?? 0 : Object.values(classVisitors).reduce((sum, list) => sum + (list?.length || 0), 0);
  const finishedClassesCount = classes.filter(c => (chamadaStatusMap[c.id] || 'idle') === 'finalizada').length;
  const inProgressClassesCount = classes.filter(c => (chamadaStatusMap[c.id] || 'idle') === 'aberta').length;

  const getClassChamadaStatus = (classId: string): ChamadaStatus => {
    return chamadaStatusMap[classId] || 'idle';
  };

  const setClassChamadaStatus = async (classId: string, status: 'aberta' | 'finalizada') => {
    if (statusInFlight.current) return;
    if (status === 'finalizada') { try { assertAttendanceConfirmed(attendanceDate, classId); } catch { return; } }
    statusInFlight.current = true;
    setSavingStatus(true);
    try { await onCallStatusChange(classId, status); }
    catch (error) { await reportEbdWriteError(error, 'Não foi possível alterar a chamada.'); }
    finally { statusInFlight.current = false; setSavingStatus(false); }
  };

  const toggleAttendance = (student: EbdStudent, currentlyPresent: boolean) => {
    if (dayIsClosed || student.attendanceReadOnly || statusInFlight.current || getClassChamadaStatus(student.class_id) !== 'aberta') return;
    attendanceQueue.submit(student, attendanceDate, !currentlyPresent, recordByStudent.get(student.id));
  };

  const getClassStats = (classId: string) => {
    const classStudents = students.filter(s => s.class_id === classId);
    const classAttendance = attendance.filter(a => a.class_id === classId && a.date === attendanceDate);
    const present = classAttendance.filter(a => a.present).length;
    const marked = classAttendance.length;
    const saved = closedSummary?.class_summary.find(group => group.classId === classId);
    if (saved) return { total: saved.total, present: saved.present, marked, percentage: saved.percentage, visitors: saved.visitor_count ?? 0 };
    return { total: classStudents.length, present, marked, percentage: classStudents.length > 0 ? Math.round(present / classStudents.length * 100) : 0, visitors: (classVisitors[classId] || []).length };
  };

  const getTotalStats = () => {
    const total = closedSummary?.total_students ?? students.length;
    const present = closedSummary?.present_students ?? attendance.filter(a => a.present && a.date === attendanceDate).length;
    const totalWithVisitors = present + totalVisitors;
    return { total, present, percentage: total > 0 ? Math.round((present / total) * 100) : 0, totalWithVisitors };
  };

  const sortedClasses = [...displayClasses].sort((a, b) => {
    const statsA = getClassStats(a.id);
    const statsB = getClassStats(b.id);
    const pctA = closedSummary ? statsA.percentage : statsA.total > 0 ? statsA.present / statsA.total : 0;
    const pctB = closedSummary ? statsB.percentage : statsB.total > 0 ? statsB.present / statsB.total : 0;
    return pctB - pctA;
  });

  const getStatusBadge = (classId: string) => {
    const status = getClassChamadaStatus(classId);
    if (status === 'aberta') return <Badge className="ebd-status-badge ebd-status-badge--info">Em andamento</Badge>;
    if (status === 'finalizada') return <Badge className="ebd-status-badge ebd-status-badge--success">Finalizada</Badge>;
    return <Badge variant="outline" className="text-muted-foreground text-xs">Não iniciada</Badge>;
  };

  const handleCloseDay = async () => {
    if (pendingCount || dayActionInFlight.current) return;
    dayActionInFlight.current = true;
    setClosingDay(true);
    try {
      assertAttendanceConfirmed(attendanceDate);
      await onCloseDay?.();
    } catch (error) {
      await reportEbdWriteError(error, 'Não foi possível atualizar o dia.');
    } finally {
      dayActionInFlight.current = false;
      setClosingDay(false);
      setShowCloseConfirm(false);
    }
  };

  const handleReopenDay = async () => {
    if (dayActionInFlight.current) return;
    dayActionInFlight.current = true;
    setClosingDay(true);
    try {
      await onReopenDay?.();
    } catch (error) {
      await reportEbdWriteError(error, 'Não foi possível atualizar o dia.');
    } finally {
      dayActionInFlight.current = false;
      setClosingDay(false);
      setShowReopenConfirm(false);
    }
  };

  // Class detail view
  if (selectedClass) {
    const classStudents = students.filter(s => s.class_id === selectedClass.id).sort((a, b) => a.name.localeCompare(b.name));
    const stats = getClassStats(selectedClass.id);
    const status = getClassChamadaStatus(selectedClass.id);
    const isReadOnly = status !== 'aberta' || !!dayIsClosed;
    const visitorList = classVisitors[selectedClass.id] || [];
    const savedVisitors = closedSummary?.class_summary.find(group => group.classId === selectedClass.id)?.visitors;
    const displayedVisitors = savedVisitors ? savedVisitors.map((visitor, index) => ({ id: `saved-visitor-${index}`, name: visitor.name })) : visitorList;

    const submitVisitor = async () => {
      if (isReadOnly || visitorInFlight.current) return;
      visitorInFlight.current = true;
      setAddingVisitor(true);
      try {
        await onAddClassVisitor?.(selectedClass.id, visitorNameDraft || null);
        setVisitorNameDraft('');
        setVisitorInputOpen(false);
      } catch {
        // Parent reports the error; keep the draft for retry after PIN renewal.
      } finally {
        visitorInFlight.current = false;
        setAddingVisitor(false);
      }
    };

    // Idle state - show start button
    if (status === 'idle' && !dayIsClosed) {
      return (
        <div className="ebd-attendance-detail space-y-4">
          <div className="ebd-attendance-heading">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" aria-label="Voltar às turmas" disabled={savingStatus} onClick={() => setSelectedClass(null)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-lg">{selectedClass.name}</h2>
                <p className="text-sm text-muted-foreground">{stats.total} alunos · {formattedDate}</p>
              </div>
            </div>
          </div>
            <Card data-ebd-card className="ebd-attendance-start">
              <CardContent data-ebd-content className="pt-6 space-y-4">
                <div className="text-center space-y-2">
                  <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <PlayCircle className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">Iniciar chamada</h3>
                  <p className="text-sm text-muted-foreground">Abra a chamada para registrar as presenças desta turma.</p>
                  {accessLevel === 'professor' && initialProfessorName && (
                    <p className="text-xs text-muted-foreground">
                      Responsável: <span className="font-medium text-foreground">{initialProfessorName}</span>
                    </p>
                  )}
                </div>
                <Button
                  className="w-full"
                  disabled={savingStatus}
                  onClick={() => setClassChamadaStatus(selectedClass.id, 'aberta')}
                >
                  <PlayCircle className="h-4 w-4 mr-2" />
                  {savingStatus ? 'Iniciando…' : 'Iniciar chamada'}
                </Button>
              </CardContent>
            </Card>
        </div>
      );
    }

    // Aberta or Finalizada state (or day closed)
    return (
      <div className="ebd-attendance-detail flex flex-col min-h-[calc(100dvh-200px)]">
        <div className="ebd-attendance-heading">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" aria-label="Voltar às turmas" disabled={savingStatus} onClick={() => setSelectedClass(null)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-lg">{selectedClass.name}</h2>
              <p className="text-sm text-muted-foreground">{formattedDate}</p>
              <p className="text-sm text-muted-foreground">
                {stats.present}/{stats.total} presentes
                {stats.visitors > 0 && ` · ${stats.visitors} visitante${stats.visitors > 1 ? 's' : ''}`}
              </p>
            </div>
            {dayIsClosed ? (
              <Badge className="ebd-status-badge ebd-status-badge--warning">
                <Lock className="h-3 w-3 mr-1" /> Dia fechado
              </Badge>
            ) : status === 'aberta' ? (
              <Badge className="ebd-status-badge ebd-status-badge--info">
                Em andamento
              </Badge>
            ) : (
              <Badge className="ebd-status-badge ebd-status-badge--success">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Finalizada
              </Badge>
            )}
          </div>
          {accessLevel === 'professor' && initialProfessorName && (
            <p className="text-xs text-muted-foreground mt-1 ml-11">
              Responsável: {initialProfessorName}
            </p>
          )}
        </div>

        {saveMessage && <p role="status" aria-live="polite" className="ebd-attendance-notice text-sm text-muted-foreground">{saveMessage}</p>}
        {classStudents.some(student => student.nameUnavailable) && <p className="ebd-attendance-notice text-sm text-muted-foreground">Há registros de presença com nome indisponível. Eles foram mantidos nos totais e ficam disponíveis apenas para consulta.</p>}
        {unknownCount > 0 && <Button variant="outline" className="mt-3 self-start" onClick={() => void verifyPending()}>Conferir marcações sem confirmação</Button>}
        <div className="ebd-attendance-list space-y-2 flex-1">
          {classStudents.map(student => {
            const record = recordByStudent.get(student.id);
            const operation = operationByStudent.get(student.id);
            const isSaving = operation && ['queued', 'saving', 'unknown'].includes(operation.state);
            const isPresent = isSaving ? operation.desired : record?.present ?? false;
            const operationLabel = operation?.state === 'rejected' ? operation.message : isSaving ? operation.message : operation?.state === 'confirmed' ? 'Confirmado' : '';
            const studentIsReadOnly = isReadOnly || !!student.attendanceReadOnly;

            return (
              <button
                key={student.id}
                aria-pressed={isPresent}
                aria-label={`${student.name}: ${isPresent ? 'presente' : 'ausente'}${isSaving ? ', aguardando confirmação' : operation?.state === 'rejected' ? ', não salvo' : ''}`}
                aria-busy={!!isSaving}
                onClick={() => !studentIsReadOnly && toggleAttendance(student, isPresent)}
                disabled={!!isSaving || studentIsReadOnly || savingStatus}
                className={`ebd-attendance-student flex items-center gap-3 w-full p-3 rounded-lg border transition-colors text-left ${
                  isPresent
                    ? 'bg-primary/5 border-primary/20'
                    : 'bg-card border-border'
                } ${studentIsReadOnly ? 'ebd-attendance-student--readonly cursor-default' : 'hover:bg-muted/50 cursor-pointer'}`}
              >
                <span aria-hidden="true" className="ebd-attendance-indicator">{isPresent ? '☑' : '☐'}</span>
                <span className="min-w-0 flex-1 break-words font-medium text-base">{student.name}{student.nameUnavailable && <span className="block text-xs font-normal text-muted-foreground">Nome indisponível · registro de presença mantido</span>}{operationLabel && <span className="block text-xs font-normal text-muted-foreground">{operationLabel}</span>}</span>
                {isPresent ? (
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                ) : (
                  <XCircle className="h-4 w-4 text-muted-foreground/40" />
                )}
              </button>
            );
          })}

          {classStudents.length === 0 && (
            <p className="text-center text-muted-foreground py-8">Nenhum aluno cadastrado nesta turma.</p>
          )}

          {/* Visitantes desta aula */}
          <section className="ebd-visitors ui-card mt-4 p-4 rounded-2xl border border-border bg-card space-y-3" aria-labelledby="ebd-visitors-title">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-muted-foreground shrink-0" />
              <h3 id="ebd-visitors-title" className="text-base font-semibold flex-1">Visitantes nesta aula</h3>
              <Badge variant="secondary" className="text-xs">{stats.visitors}</Badge>
            </div>

            {displayedVisitors.length > 0 && (
              <div className="space-y-1.5">
                {displayedVisitors.map(v => (
                  <div key={v.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-background border border-border/60">
                    <UserPlus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className={`flex-1 text-base min-w-0 whitespace-normal break-words ${v.name ? '' : 'text-muted-foreground italic'}`}>
                      {v.name || 'Visitante sem nome'}
                    </span>
                    {!isReadOnly && onRemoveClassVisitor && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-12 w-12 text-muted-foreground hover:text-destructive"
                        aria-label={`Remover visitante ${v.name || "sem nome"}`}
                        onClick={() => onRemoveClassVisitor?.(selectedClass.id, v.id)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!isReadOnly && onAddClassVisitor && (
              visitorInputOpen ? (
                <div className="space-y-2">
                  <Label htmlFor={`ebd-visitor-name-${selectedClass.id}`}>Nome do visitante <span className="font-normal text-muted-foreground">(opcional)</span></Label>
                <div className="ebd-visitor-form">
                  <Input
                    ref={visitorInputRef}
                    autoFocus
                    id={`ebd-visitor-name-${selectedClass.id}`} placeholder="Pode deixar em branco"
                    value={visitorNameDraft}
                    onChange={(e) => setVisitorNameDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        submitVisitor();
                      } else if (e.key === 'Escape') {
                        setVisitorInputOpen(false);
                        setVisitorNameDraft('');
                      }
                    }}
                    disabled={addingVisitor}
                  />
                  <Button size="sm" onClick={submitVisitor} disabled={addingVisitor}>
                    {addingVisitor ? 'Adicionando…' : 'Adicionar'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Cancelar novo visitante"
                    onClick={() => { setVisitorInputOpen(false); setVisitorNameDraft(''); }}
                    disabled={addingVisitor}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setVisitorInputOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar visitante
                </Button>
              )
            )}
            {isReadOnly && stats.visitors === 0 && (
              <p className="text-xs text-muted-foreground italic">Nenhum visitante.</p>
            )}
          </section>
        </div>

        {/* Footer action */}
        {!dayIsClosed && (
          <div className="ebd-attendance-footer">
            {status === 'aberta' && (
              <Button
                className="w-full"
                disabled={pendingCount > 0 || addingVisitor || savingStatus}
                onClick={() => setClassChamadaStatus(selectedClass.id, 'finalizada')}
              >
                <StopCircle className="h-4 w-4 mr-2" />
                {savingStatus ? 'Finalizando…' : 'Finalizar chamada'}
              </Button>
            )}
            {status === 'finalizada' && (
              <Button
                variant="outline"
                className="w-full"
                disabled={savingStatus}
                onClick={() => setClassChamadaStatus(selectedClass.id, 'aberta')}
              >
                <Pencil className="h-4 w-4 mr-2" />
                {savingStatus ? 'Reabrindo…' : 'Revisar chamada'}
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  const totalStats = getTotalStats();

  // Main view - classes grid with ranking
  return (
    <div className="space-y-4">
      {/* Professor info */}
      {accessLevel === 'professor' && initialProfessorName && (
        <p className="text-sm text-muted-foreground">
          Responsável: <span className="font-medium text-foreground">{initialProfessorName}</span>
        </p>
      )}

      {/* Day closed banner */}
      {dayIsClosed && (
        <div className="ebd-attendance-closed flex flex-wrap items-center gap-2 p-4 rounded-2xl border">
          <Lock className="h-4 w-4 shrink-0" />
          <p className="text-sm font-medium">Dia fechado · chamada encerrada</p>
          {isAdmin && onReopenDay && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto"
              onClick={() => setShowReopenConfirm(true)}
            >
              <LockOpen className="h-3.5 w-3.5 mr-1" /> Reabrir
            </Button>
          )}
        </div>
      )}

      {/* Summary card */}
      <Card data-ebd-card>
        <CardHeader className="ebd-card-heading"><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" />Resumo da chamada</CardTitle><p className="text-sm text-muted-foreground">{formattedDate}</p></CardHeader>
        <CardContent data-ebd-content className="pt-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Alunos presentes</p>
              <p className="text-2xl font-bold">
                {totalStats.present}
                <span className="text-base font-normal text-muted-foreground">/{totalStats.total}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              {(attendance.length > 0 || closedSummary) && (
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Baixar PDF da chamada"
                  disabled={pendingCount > 0 || generatingPdf}
                  onClick={async () => {
                    if (pdfInFlight.current) return;
                    pdfInFlight.current = true;
                    const scope = verificationScope.current;
                    setGeneratingPdf(true);
                    try {
                      assertAttendanceConfirmed(attendanceDate);
                      const day = await readEbdDay(attendanceDate);
                      if (!mounted.current || verificationScope.current.queue !== scope.queue || verificationScope.current.date !== scope.date) return;
                      generateEbdAttendancePDF({
                        snapshotVersion: day.snapshotVersion, classes: day.classes, students: day.students, attendance: day.attendance,
                        date: attendanceDate, formattedDate, professorName: initialProfessorName, closedSummary: day.closure,
                      });
                    } catch (error) { await reportEbdWriteError(error, 'Não foi possível gerar o PDF. Atualize a chamada e tente novamente.'); }
                    finally { pdfInFlight.current = false; if (mounted.current) setGeneratingPdf(false); }
                  }}
                  title="Baixar PDF da chamada"
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}
              <div className="h-14 min-w-14 px-2 rounded-xl bg-primary/10 flex items-center justify-center">
                <span className="text-lg font-bold text-primary">{totalStats.percentage}%</span>
              </div>
            </div>
          </div>
          <Progress value={totalStats.percentage} className="h-2" />

          {/* Progresso turmas finalizadas */}
          {classes.length > 0 && !dayIsClosed && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{finishedClassesCount}/{classes.length} turmas finalizadas</span>
              {inProgressClassesCount > 0 && (
                <span className="text-blue-600">· {inProgressClassesCount} em andamento</span>
              )}
            </div>
          )}

          {/* Visitor count (somatório por turma) */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <UserPlus className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Visitantes</span>
            <span className="text-sm font-semibold ml-auto">{totalVisitors}</span>
            {totalVisitors > 0 && (
              <span className="text-xs text-muted-foreground">
                · Total: <span className="font-semibold text-foreground">{totalStats.totalWithVisitors}</span>
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground -mt-1">
            {onAddClassVisitor && !dayIsClosed ? 'Adicione visitantes (com nome opcional) dentro de cada turma.' : 'Visitantes registrados neste encontro.'}
          </p>

          {/* Close/Reopen day button for admin */}
          {isAdmin && !dayIsClosed && onCloseDay && (
            <Button
              variant="outline"
              className="w-full mt-2"
              disabled={pendingCount > 0}
              onClick={() => setShowCloseConfirm(true)}
            >
              <Lock className="h-4 w-4 mr-2" />
              Fechar dia
            </Button>
          )}
        </CardContent>
      </Card>

      {saveMessage && <p role="status" className="text-sm text-muted-foreground">{saveMessage}</p>}
      {unknownCount > 0 && <Button variant="outline" onClick={() => void verifyPending()}>Conferir marcações sem confirmação</Button>}
      {/* Classes grid */}
      <div className="ebd-section-heading"><h2>Chamadas por turma</h2><p className="text-sm text-muted-foreground">{dayIsClosed ? 'Selecione uma turma para conferir as presenças registradas.' : 'Selecione uma turma para registrar ou conferir as presenças.'}</p></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {sortedClasses.map((cls) => {
          const stats = getClassStats(cls.id);
          const pct = stats.percentage;
          const classVis = stats.visitors;

          return (
            <Card data-ebd-card
              key={cls.id}
              className="min-h-36 cursor-pointer bg-card border-border hover:bg-accent/50 transition-colors"
              role="button"
              tabIndex={0}
              aria-label={`Abrir chamada de ${cls.name}`}
              onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedClass(cls); } }}
              onClick={() => setSelectedClass(cls)}
            >
              <CardContent data-ebd-content className="pt-4 pb-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary shrink-0" />
                  <span className="min-w-0 flex-1 break-words font-medium text-base">{cls.name}</span>
                  <div className="ml-auto shrink-0">
                    {dayIsClosed ? (
                      <Badge className="ebd-status-badge ebd-status-badge--warning">Fechado</Badge>
                    ) : (
                      getStatusBadge(cls.id)
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">{stats.present}/{stats.total} presentes</span>
                  <span className="text-[.8125rem] font-semibold tabular-nums text-muted-foreground">{pct}%</span>
                </div>
                <Progress value={pct} className="h-1.5" />
                {classVis > 0 && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <UserPlus className="h-3 w-3" /> {classVis} visitante{classVis > 1 ? 's' : ''}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {displayClasses.length === 0 && (
        <p className="text-center text-muted-foreground py-8">Nenhuma turma cadastrada ainda.</p>
      )}

      {/* Close day confirmation */}
      <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fechar dia {formattedDate}?</AlertDialogTitle>
            <AlertDialogDescription>
              {finishedClassesCount < classes.length && classes.length > 0 ? (
                <>
                  Ainda há <strong>{classes.length - finishedClassesCount} turma(s) não finalizada(s)</strong>.{' '}
                  Você pode fechar mesmo assim — o resumo atual será registrado e a chamada não poderá mais ser editada até ser reaberta.
                </>
              ) : (
                <>Isso vai registrar o resumo da chamada de {formattedDate} no histórico. A chamada não poderá mais ser editada até ser reaberta.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={closingDay}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCloseDay} disabled={closingDay || pendingCount > 0}>
              {closingDay ? 'Fechando...' : 'Fechar Dia'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reopen day confirmation */}
      <AlertDialog open={showReopenConfirm} onOpenChange={setShowReopenConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reabrir dia {formattedDate}?</AlertDialogTitle>
            <AlertDialogDescription>
              As presenças serão mantidas. O dia voltará a ficar em aberto para correções; ao terminar, feche-o novamente para atualizar o resumo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={closingDay}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleReopenDay} disabled={closingDay}>
              {closingDay ? 'Reabrindo...' : 'Reabrir Dia'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
