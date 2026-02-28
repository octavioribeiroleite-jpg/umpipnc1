import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Users, CheckCircle2, XCircle, Trophy, PlayCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

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

interface ChamadaTabProps {
  classes: EbdClass[];
  students: EbdStudent[];
  attendance: AttendanceRecord[];
  setAttendance: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>;
  attendanceDate: string;
  formattedDate: string;
  initialProfessorName?: string;
}

export default function ChamadaTab({ classes, students, attendance, setAttendance, attendanceDate, formattedDate, initialProfessorName }: ChamadaTabProps) {
  const [selectedClass, setSelectedClass] = useState<EbdClass | null>(null);
  const [savingStudent, setSavingStudent] = useState<string | null>(null);
  const [chamadaIniciada, setChamadaIniciada] = useState(!!initialProfessorName);
  const [professorNome, setProfessorNome] = useState(initialProfessorName || '');

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
    return { total, present, percentage: total > 0 ? Math.round((present / total) * 100) : 0 };
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

  // Tela de iniciar chamada
  if (!chamadaIniciada) {
    return (
      <div className="space-y-4 pt-4">
        <Card>
          <CardContent className="pt-5 space-y-4">
            <div className="text-center space-y-2">
              <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                <PlayCircle className="h-7 w-7 text-primary" />
              </div>
              <h2 className="font-semibold text-lg">Iniciar Chamada</h2>
              <p className="text-sm text-muted-foreground">{formattedDate}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="professor-nome">Seu nome (professor/responsável)</Label>
              <Input
                id="professor-nome"
                placeholder="Digite seu nome"
                value={professorNome}
                onChange={(e) => setProfessorNome(e.target.value)}
                autoFocus
              />
            </div>
            <Button
              className="w-full"
              disabled={!professorNome.trim()}
              onClick={() => setChamadaIniciada(true)}
            >
              <PlayCircle className="h-4 w-4 mr-2" />
              Iniciar Chamada
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Class detail view
  if (selectedClass) {
    const classStudents = students.filter(s => s.class_id === selectedClass.id).sort((a, b) => a.name.localeCompare(b.name));
    const stats = getClassStats(selectedClass.id);

    return (
      <div>
        <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setSelectedClass(null)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-lg">{selectedClass.name}</h2>
              <p className="text-xs text-muted-foreground">{stats.present}/{stats.total} presentes</p>
            </div>
            {stats.marked === stats.total && stats.total > 0 && (
              <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Completa
              </Badge>
            )}
          </div>
        </div>

        <div className="p-4 space-y-2 pb-8">
          {classStudents.map(student => {
            const record = attendance.find(a => a.student_id === student.id);
            const isPresent = record?.present ?? false;
            const isSaving = savingStudent === student.id;

            return (
              <button
                key={student.id}
                onClick={() => toggleAttendance(student, isPresent)}
                disabled={isSaving}
                className={`flex items-center gap-3 w-full p-3 rounded-lg border transition-colors text-left ${
                  isPresent
                    ? 'bg-primary/5 border-primary/20'
                    : 'bg-card border-border hover:bg-muted/50'
                }`}
              >
                <Checkbox checked={isPresent} className="pointer-events-none" />
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
      </div>
    );
  }

  const totalStats = getTotalStats();

  // Main view - classes grid with ranking
  return (
    <div className="space-y-4">
      {/* Professor info */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Responsável: <span className="font-medium text-foreground">{professorNome}</span>
        </p>
        <Button variant="ghost" size="sm" onClick={() => setChamadaIniciada(false)} className="text-xs">
          Trocar
        </Button>
      </div>

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
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-lg font-bold text-primary">{totalStats.percentage}%</span>
            </div>
          </div>
          <Progress value={totalStats.percentage} className="h-2" />
        </CardContent>
      </Card>

      {/* Classes grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {sortedClasses.map((cls, index) => {
          const stats = getClassStats(cls.id);
          const pct = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;
          const isComplete = stats.marked === stats.total && stats.total > 0;

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
                  {isComplete && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500 ml-auto shrink-0" />
                  )}
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
    </div>
  );
}
