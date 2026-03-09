import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Users, CheckCircle2, XCircle, Trophy, PlayCircle, StopCircle, RotateCcw, Download, Lock, LockOpen, UserPlus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { generateEbdAttendancePDF } from '@/utils/generateEbdPDF';
import { supabase } from '@/integrations/supabase/client';
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
}

interface AttendanceRecord {
  id: string;
  student_id: string;
  class_id: string;
  date: string;
  present: boolean;
}

type ChamadaStatus = 'idle' | 'aberta' | 'finalizada';

interface ChamadaTabProps {
  classes: EbdClass[];
  students: EbdStudent[];
  attendance: AttendanceRecord[];
  setAttendance: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>;
  attendanceDate: string;
  formattedDate: string;
  initialProfessorName?: string;
  accessLevel: 'admin' | 'professor';
  dayIsClosed?: boolean;
  onCloseDay?: () => Promise<void>;
  onReopenDay?: () => Promise<void>;
  visitorCount?: number;
  setVisitorCount?: React.Dispatch<React.SetStateAction<number>>;
}

export default function ChamadaTab({ classes, students, attendance, setAttendance, attendanceDate, formattedDate, initialProfessorName, accessLevel, dayIsClosed, onCloseDay, onReopenDay, visitorCount = 0, setVisitorCount }: ChamadaTabProps) {
  const [selectedClass, setSelectedClass] = useState<EbdClass | null>(null);
  const [savingStudent, setSavingStudent] = useState<string | null>(null);
  const [chamadaStatusMap, setChamadaStatusMap] = useState<Record<string, ChamadaStatus>>({});
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showReopenConfirm, setShowReopenConfirm] = useState(false);
  const [closingDay, setClosingDay] = useState(false);

  const isAdmin = accessLevel === 'admin';

  const getClassChamadaStatus = (classId: string): ChamadaStatus => {
    return chamadaStatusMap[classId] || 'idle';
  };

  const setClassChamadaStatus = (classId: string, status: ChamadaStatus) => {
    setChamadaStatusMap(prev => ({ ...prev, [classId]: status }));
  };

  const toggleAttendance = async (student: EbdStudent, currentlyPresent: boolean) => {
    setSavingStudent(student.id);
    const existing = attendance.find(a => a.student_id === student.id && a.date === attendanceDate);

    if (existing) {
      const { error } = await supabase
        .from('ebd_attendance')
        .update({ present: !currentlyPresent })
        .eq('id', existing.id);

      if (!error) {
        setAttendance(prev =>
          prev.map(a => a.id === existing.id ? { ...a, present: !currentlyPresent } : a)
        );
      }
    } else {
      const { data, error } = await supabase
        .from('ebd_attendance')
        .insert({
          student_id: student.id,
          class_id: student.class_id,
          date: attendanceDate,
          present: true,
        })
        .select()
        .single();

      if (!error && data) {
        setAttendance(prev => [...prev, data]);
      }
    }
    setSavingStudent(null);
  };

  const getClassStats = (classId: string) => {
    const classStudents = students.filter(s => s.class_id === classId);
    const classAttendance = attendance.filter(a => a.class_id === classId && a.date === attendanceDate);
    const present = classAttendance.filter(a => a.present).length;
    const marked = classAttendance.length;
    return { total: classStudents.length, present, marked };
  };

  const getTotalStats = () => {
    const total = students.length;
    const present = attendance.filter(a => a.present && a.date === attendanceDate).length;
    const totalWithVisitors = present + visitorCount;
    return { total, present, percentage: total > 0 ? Math.round((present / total) * 100) : 0, totalWithVisitors };
  };

  const sortedClasses = [...classes].sort((a, b) => {
    const statsA = getClassStats(a.id);
    const statsB = getClassStats(b.id);
    const pctA = statsA.total > 0 ? statsA.present / statsA.total : 0;
    const pctB = statsB.total > 0 ? statsB.present / statsB.total : 0;
    return pctB - pctA;
  });

  const getColorClass = (pct: number) => {
    if (pct > 70) return 'border-green-500/30 bg-green-500/5';
    if (pct >= 40) return 'border-yellow-500/30 bg-yellow-500/5';
    return 'border-red-500/30 bg-red-500/5';
  };

  const getPercentColor = (pct: number) => {
    if (pct > 70) return 'text-green-600';
    if (pct >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusBadge = (classId: string) => {
    const status = getClassChamadaStatus(classId);
    if (status === 'aberta') return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[10px]">Em andamento</Badge>;
    if (status === 'finalizada') return <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-[10px]">Finalizada</Badge>;
    return <Badge variant="outline" className="text-muted-foreground text-[10px]">Não iniciada</Badge>;
  };

  const handleCloseDay = async () => {
    setClosingDay(true);
    try {
      await onCloseDay?.();
    } finally {
      setClosingDay(false);
      setShowCloseConfirm(false);
    }
  };

  const handleReopenDay = async () => {
    setClosingDay(true);
    try {
      await onReopenDay?.();
    } finally {
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

    // Idle state - show start button
    if (status === 'idle' && !dayIsClosed) {
      return (
        <div>
          <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => setSelectedClass(null)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-lg">{selectedClass.name}</h2>
                <p className="text-xs text-muted-foreground">{stats.total} alunos</p>
              </div>
            </div>
          </div>
          <div className="p-4 pt-8">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="text-center space-y-2">
                  <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <PlayCircle className="h-7 w-7 text-primary" />
                  </div>
                  <h2 className="font-semibold text-lg">Iniciar Chamada</h2>
                  <p className="text-sm text-muted-foreground">{selectedClass.name} — {formattedDate}</p>
                  {accessLevel === 'professor' && initialProfessorName && (
                    <p className="text-xs text-muted-foreground">
                      Responsável: <span className="font-medium text-foreground">{initialProfessorName}</span>
                    </p>
                  )}
                </div>
                <Button
                  className="w-full"
                  onClick={() => setClassChamadaStatus(selectedClass.id, 'aberta')}
                >
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Iniciar Chamada
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    // Aberta or Finalizada state (or day closed)
    return (
      <div className="flex flex-col min-h-[calc(100vh-200px)]">
        <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setSelectedClass(null)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-lg">{selectedClass.name}</h2>
              <p className="text-xs text-muted-foreground">{stats.present}/{stats.total} presentes</p>
            </div>
            {dayIsClosed ? (
              <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20">
                <Lock className="h-3 w-3 mr-1" /> Dia Fechado
              </Badge>
            ) : status === 'aberta' ? (
              <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                Em andamento
              </Badge>
            ) : (
              <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
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

        <div className="p-4 space-y-2 flex-1 pb-24">
          {classStudents.map(student => {
            const record = attendance.find(a => a.student_id === student.id && a.date === attendanceDate);
            const isPresent = record?.present ?? false;
            const isSaving = savingStudent === student.id;

            return (
              <button
                key={student.id}
                onClick={() => !isReadOnly && toggleAttendance(student, isPresent)}
                disabled={isSaving || isReadOnly}
                className={`flex items-center gap-3 w-full p-3 rounded-lg border transition-colors text-left ${
                  isPresent
                    ? 'bg-primary/5 border-primary/20'
                    : 'bg-card border-border'
                } ${isReadOnly ? 'opacity-70 cursor-default' : 'hover:bg-muted/50 cursor-pointer'}`}
              >
                <Checkbox checked={isPresent} className="pointer-events-none" disabled={isReadOnly} />
                <span className="flex-1 font-medium text-sm">{student.name}</span>
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
        </div>

        {/* Footer action */}
        {!dayIsClosed && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border z-20">
            {status === 'aberta' && (
              <Button
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                onClick={() => setClassChamadaStatus(selectedClass.id, 'finalizada')}
              >
                <StopCircle className="h-4 w-4 mr-2" />
                Finalizar Chamada
              </Button>
            )}
            {status === 'finalizada' && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setClassChamadaStatus(selectedClass.id, 'aberta')}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reabrir Chamada
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
        <div className="flex items-center gap-2 p-3 rounded-lg border border-orange-500/30 bg-orange-500/5">
          <Lock className="h-4 w-4 text-orange-600 shrink-0" />
          <p className="text-sm text-orange-700 font-medium">Dia fechado — chamada encerrada</p>
          {isAdmin && onReopenDay && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto text-xs text-orange-600 hover:text-orange-700"
              onClick={() => setShowReopenConfirm(true)}
            >
              <LockOpen className="h-3.5 w-3.5 mr-1" /> Reabrir
            </Button>
          )}
        </div>
      )}

      {/* Summary card */}
      <Card>
        <CardContent className="pt-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Presença geral — {formattedDate}</p>
              <p className="text-2xl font-bold">
                {totalStats.present}
                <span className="text-base font-normal text-muted-foreground">/{totalStats.total}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              {attendance.length > 0 && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => generateEbdAttendancePDF({
                    classes,
                    students,
                    attendance,
                    date: attendanceDate,
                    formattedDate,
                    professorName: initialProfessorName,
                  })}
                  title="Baixar PDF da chamada"
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-lg font-bold text-primary">{totalStats.percentage}%</span>
              </div>
            </div>
          </div>
          <Progress value={totalStats.percentage} className="h-2" />

          {/* Visitor count */}
          <div className="flex items-center gap-3 pt-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <UserPlus className="h-4 w-4" />
              <span className="text-sm">Visitantes</span>
            </div>
            {dayIsClosed ? (
              <span className="text-sm font-medium">{visitorCount}</span>
            ) : (
              <Input
                type="number"
                min={0}
                max={999}
                value={visitorCount}
                onChange={(e) => setVisitorCount?.(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-20 h-8 text-center text-sm"
              />
            )}
            {visitorCount > 0 && (
              <span className="text-xs text-muted-foreground ml-auto">
                Total geral: <span className="font-semibold text-foreground">{totalStats.totalWithVisitors}</span>
              </span>
            )}
          </div>

          {/* Close/Reopen day button for admin */}
          {isAdmin && !dayIsClosed && attendance.length > 0 && onCloseDay && (
            <Button
              variant="outline"
              className="w-full mt-2 border-orange-500/30 text-orange-600 hover:bg-orange-500/5 hover:text-orange-700"
              onClick={() => setShowCloseConfirm(true)}
            >
              <Lock className="h-4 w-4 mr-2" />
              Fechar Dia
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Classes grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {sortedClasses.map((cls, index) => {
          const stats = getClassStats(cls.id);
          const pct = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;

          return (
            <Card
              key={cls.id}
              className={`cursor-pointer hover:shadow-md transition-all ${getColorClass(pct)}`}
              onClick={() => setSelectedClass(cls)}
            >
              <CardContent className="pt-4 pb-4 space-y-2">
                <div className="flex items-center gap-2">
                  {index === 0 && stats.present > 0 && (
                    <Trophy className="h-4 w-4 text-yellow-500 shrink-0" />
                  )}
                  <Users className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-medium text-sm">{cls.name}</span>
                  <div className="ml-auto shrink-0">
                    {dayIsClosed ? (
                      <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20 text-[10px]">Fechado</Badge>
                    ) : (
                      getStatusBadge(cls.id)
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{stats.present}/{stats.total} presentes</span>
                  <span className={`text-xs font-semibold ${getPercentColor(pct)}`}>{pct}%</span>
                </div>
                <Progress value={pct} className="h-1.5" />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {classes.length === 0 && (
        <p className="text-center text-muted-foreground py-8">Nenhuma turma cadastrada ainda.</p>
      )}

      {/* Close day confirmation */}
      <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fechar dia?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso vai registrar o resumo da chamada de hoje no histórico. A chamada não poderá mais ser editada até ser reaberta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={closingDay}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCloseDay} disabled={closingDay}>
              {closingDay ? 'Fechando...' : 'Fechar Dia'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reopen day confirmation */}
      <AlertDialog open={showReopenConfirm} onOpenChange={setShowReopenConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reabrir dia?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso vai permitir editar a chamada novamente. O registro do histórico será removido.
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
