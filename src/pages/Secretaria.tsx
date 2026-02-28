import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Lock, Users, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

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

function getSundayDate(): string {
  const today = new Date();
  const day = today.getDay();
  // If today is Sunday (0), use today. Otherwise, use the most recent Sunday.
  const diff = day === 0 ? 0 : day;
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - diff);
  return format(sunday, 'yyyy-MM-dd');
}

export default function Secretaria() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<EbdClass[]>([]);
  const [students, setStudents] = useState<EbdStudent[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [selectedClass, setSelectedClass] = useState<EbdClass | null>(null);
  const [savingStudent, setSavingStudent] = useState<string | null>(null);

  const sundayDate = getSundayDate();
  const formattedDate = format(new Date(sundayDate + 'T12:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  const handleLogin = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'secretaria_password')
      .single();

    if (data && data.value === password) {
      setAuthenticated(true);
    } else {
      toast.error('Senha incorreta');
    }
    setLoading(false);
  };

  const fetchData = useCallback(async () => {
    const [classesRes, studentsRes, attendanceRes] = await Promise.all([
      supabase.from('ebd_classes').select('*').eq('active', true).order('order_index'),
      supabase.from('ebd_students').select('*').eq('active', true).order('name'),
      supabase.from('ebd_attendance').select('*').eq('date', sundayDate),
    ]);

    if (classesRes.data) setClasses(classesRes.data);
    if (studentsRes.data) setStudents(studentsRes.data);
    if (attendanceRes.data) setAttendance(attendanceRes.data);
  }, [sundayDate]);

  useEffect(() => {
    if (authenticated) fetchData();
  }, [authenticated, fetchData]);

  const toggleAttendance = async (student: EbdStudent, currentlyPresent: boolean) => {
    setSavingStudent(student.id);
    const existing = attendance.find(a => a.student_id === student.id && a.date === sundayDate);

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
          date: sundayDate,
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
    const classAttendance = attendance.filter(a => a.class_id === classId && a.present);
    return { total: classStudents.length, present: classAttendance.length };
  };

  const getTotalStats = () => {
    const total = students.length;
    const present = attendance.filter(a => a.present).length;
    return { total, present, percentage: total > 0 ? Math.round((present / total) * 100) : 0 };
  };

  // Password screen
  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Secretaria EBD</CardTitle>
            <p className="text-sm text-muted-foreground">Digite a senha para acessar</p>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleLogin();
              }}
              className="space-y-4"
            >
              <Input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
              <Button className="w-full" disabled={loading || !password}>
                {loading ? 'Verificando...' : 'Entrar'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalStats = getTotalStats();

  // Class detail view
  if (selectedClass) {
    const classStudents = students.filter(s => s.class_id === selectedClass.id).sort((a, b) => a.name.localeCompare(b.name));
    const stats = getClassStats(selectedClass.id);

    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setSelectedClass(null)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="font-semibold text-lg truncate">{selectedClass.name}</h1>
              <p className="text-xs text-muted-foreground">{stats.present}/{stats.total} presentes</p>
            </div>
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

  // Main view - classes grid
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3">
        <h1 className="font-semibold text-lg">Secretaria EBD</h1>
        <p className="text-xs text-muted-foreground capitalize">{formattedDate}</p>
      </div>

      <div className="p-4 space-y-4 pb-8">
        {/* Summary card */}
        <Card>
          <CardContent className="pt-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Presença geral do domingo</p>
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
        <div className="grid grid-cols-2 gap-3">
          {classes.map(cls => {
            const stats = getClassStats(cls.id);
            const pct = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;

            return (
              <Card
                key={cls.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedClass(cls)}
              >
                <CardContent className="pt-4 pb-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm truncate">{cls.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{stats.present}/{stats.total}</span>
                    <span className="text-xs font-semibold text-primary">{pct}%</span>
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
    </div>
  );
}
