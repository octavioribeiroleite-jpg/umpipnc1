import { useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRightLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  Pencil,
  Plus,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

interface EbdClass {
  id: string;
  name: string;
  order_index: number;
  min_age?: number | null;
  max_age?: number | null;
  next_class_id?: string | null;
  age_tracking_enabled?: boolean | null;
}

interface EbdStudent {
  id: string;
  class_id: string;
  name: string;
  active: boolean;
  birth_date?: string | null;
}

interface TurmasTabProps {
  classes: EbdClass[];
  allStudents: EbdStudent[];
  onRefresh: () => void;
}

type AgeStatus = 'regular' | 'limit' | 'exceeded' | 'below' | 'missing' | 'disabled';

function calculateAge(birthDate?: string | null): number | null {
  if (!birthDate) return null;
  const [year, month, day] = birthDate.split('-').map(Number);
  if (!year || !month || !day) return null;

  const today = new Date();
  let age = today.getFullYear() - year;
  const birthdayPassed =
    today.getMonth() + 1 > month
    || (today.getMonth() + 1 === month && today.getDate() >= day);

  if (!birthdayPassed) age -= 1;
  return age;
}

function formatAgeRange(cls: EbdClass): string {
  if (cls.age_tracking_enabled === false) return 'Sem faixa etária';
  if (cls.min_age == null) return 'Faixa não configurada';
  if (cls.max_age == null) return `${cls.min_age} anos ou mais`;
  return `${cls.min_age} a ${cls.max_age} anos`;
}

function getAgeStatus(student: EbdStudent, cls: EbdClass): AgeStatus {
  if (cls.age_tracking_enabled === false || cls.min_age == null) return 'disabled';
  const age = calculateAge(student.birth_date);
  if (age == null) return 'missing';
  if (age < cls.min_age) return 'below';
  if (cls.max_age != null && age > cls.max_age) return 'exceeded';
  if (cls.max_age != null && age === cls.max_age) return 'limit';
  return 'regular';
}

export default function TurmasTab({ classes, allStudents, onRefresh }: TurmasTabProps) {
  const [selectedClass, setSelectedClass] = useState<EbdClass | null>(null);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentBirthDate, setNewStudentBirthDate] = useState('');
  const [addingStudent, setAddingStudent] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [creatingClass, setCreatingClass] = useState(false);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editClassName, setEditClassName] = useState('');
  const [transferStudent, setTransferStudent] = useState<EbdStudent | null>(null);
  const [transferTargetClass, setTransferTargetClass] = useState('');
  const [editingBirthDateId, setEditingBirthDateId] = useState<string | null>(null);
  const [editingBirthDate, setEditingBirthDate] = useState('');
  const [savingBirthDate, setSavingBirthDate] = useState(false);

  const classById = useMemo(
    () => Object.fromEntries(classes.map((cls) => [cls.id, cls])) as Record<string, EbdClass>,
    [classes],
  );

  const totalAgeReviews = useMemo(
    () => allStudents.filter((student) => {
      if (!student.active) return false;
      const cls = classById[student.class_id];
      if (!cls) return false;
      const status = getAgeStatus(student, cls);
      return status === 'limit' || status === 'exceeded' || status === 'below';
    }).length,
    [allStudents, classById],
  );

  const totalMissingBirthDates = useMemo(
    () => allStudents.filter((student) => {
      if (!student.active || student.birth_date) return false;
      const cls = classById[student.class_id];
      return Boolean(cls && cls.age_tracking_enabled !== false && cls.min_age != null);
    }).length,
    [allStudents, classById],
  );

  const handleAddStudent = async () => {
    if (!selectedClass || !newStudentName.trim()) return;
    const requiresBirthDate = selectedClass.age_tracking_enabled !== false && selectedClass.min_age != null;
    if (requiresBirthDate && !newStudentBirthDate) {
      toast.error('Informe a data de nascimento para acompanhar a faixa etária');
      return;
    }

    setAddingStudent(true);
    const { error } = await supabase.from('ebd_students').insert({
      name: newStudentName.trim(),
      class_id: selectedClass.id,
      active: true,
      birth_date: newStudentBirthDate || null,
    } as any);

    if (error) {
      toast.error('Erro ao adicionar aluno');
    } else {
      toast.success('Aluno adicionado');
      setNewStudentName('');
      setNewStudentBirthDate('');
      onRefresh();
    }
    setAddingStudent(false);
  };

  const handleToggleActive = async (student: EbdStudent) => {
    const { error } = await supabase
      .from('ebd_students')
      .update({ active: !student.active })
      .eq('id', student.id);

    if (error) {
      toast.error('Erro ao atualizar aluno');
    } else {
      toast.success(student.active ? 'Aluno desativado' : 'Aluno reativado');
      onRefresh();
    }
  };

  const startTransfer = (student: EbdStudent) => {
    const currentClass = classById[student.class_id];
    setTransferStudent(student);
    setTransferTargetClass(currentClass?.next_class_id || '');
  };

  const handleTransfer = async () => {
    if (!transferStudent || !transferTargetClass) return;
    const { error } = await supabase
      .from('ebd_students')
      .update({ class_id: transferTargetClass })
      .eq('id', transferStudent.id);

    if (error) {
      toast.error('Erro ao transferir aluno');
    } else {
      toast.success('Aluno transferido');
      setTransferStudent(null);
      setTransferTargetClass('');
      onRefresh();
    }
  };

  const startBirthDateEdit = (student: EbdStudent) => {
    setEditingBirthDateId(student.id);
    setEditingBirthDate(student.birth_date || '');
  };

  const handleSaveBirthDate = async (studentId: string) => {
    if (!editingBirthDate) {
      toast.error('Informe a data de nascimento');
      return;
    }

    setSavingBirthDate(true);
    const { error } = await supabase
      .from('ebd_students')
      .update({ birth_date: editingBirthDate } as any)
      .eq('id', studentId);

    if (error) {
      toast.error('Erro ao salvar data de nascimento');
    } else {
      toast.success('Data de nascimento atualizada');
      setEditingBirthDateId(null);
      setEditingBirthDate('');
      onRefresh();
    }
    setSavingBirthDate(false);
  };

  const handleCreateClass = async () => {
    if (!newClassName.trim()) return;
    setCreatingClass(true);
    const maxOrder = classes.reduce((max, cls) => Math.max(max, cls.order_index), 0);
    const { error } = await supabase.from('ebd_classes').insert({
      name: newClassName.trim(),
      order_index: maxOrder + 1,
      active: true,
      age_tracking_enabled: false,
    } as any);

    if (error) {
      toast.error('Erro ao criar turma');
    } else {
      toast.success('Turma criada');
      setNewClassName('');
      onRefresh();
    }
    setCreatingClass(false);
  };

  const handleRenameClass = async (classId: string) => {
    if (!editClassName.trim()) return;
    const { error } = await supabase
      .from('ebd_classes')
      .update({ name: editClassName.trim() })
      .eq('id', classId);

    if (error) {
      toast.error('Erro ao renomear turma');
    } else {
      toast.success('Turma renomeada');
      setEditingClassId(null);
      onRefresh();
    }
  };

  if (transferStudent) {
    const currentClass = classById[transferStudent.class_id];
    const suggestedClass = currentClass?.next_class_id ? classById[currentClass.next_class_id] : null;

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setTransferStudent(null)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="font-semibold">Transferir: {transferStudent.name}</h2>
            {suggestedClass && (
              <p className="text-xs text-muted-foreground">Sugestão por idade: {suggestedClass.name}</p>
            )}
          </div>
        </div>

        <Card>
          <CardContent className="space-y-3 pt-4">
            <p className="text-sm text-muted-foreground">Selecione a turma de destino:</p>
            <Select value={transferTargetClass} onValueChange={setTransferTargetClass}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha a turma" />
              </SelectTrigger>
              <SelectContent>
                {classes.filter((cls) => cls.id !== transferStudent.class_id).map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name} · {formatAgeRange(cls)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button className="w-full" disabled={!transferTargetClass} onClick={handleTransfer}>
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              Confirmar transferência
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (selectedClass) {
    const classStudents = allStudents.filter((student) => student.class_id === selectedClass.id);
    const active = classStudents.filter((student) => student.active).sort((a, b) => a.name.localeCompare(b.name));
    const inactive = classStudents.filter((student) => !student.active).sort((a, b) => a.name.localeCompare(b.name));
    const reviewStudents = active.filter((student) => {
      const status = getAgeStatus(student, selectedClass);
      return status === 'limit' || status === 'exceeded' || status === 'below';
    });
    const missingBirthDates = active.filter((student) => getAgeStatus(student, selectedClass) === 'missing');
    const nextClass = selectedClass.next_class_id ? classById[selectedClass.next_class_id] : null;

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSelectedClass(null)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <h2 className="truncate font-semibold">{selectedClass.name}</h2>
            <p className="text-xs text-muted-foreground">
              {formatAgeRange(selectedClass)} · {active.length} ativos · {inactive.length} inativos
            </p>
          </div>
        </div>

        {selectedClass.age_tracking_enabled !== false && selectedClass.min_age != null && (
          <Card className={reviewStudents.length > 0 ? 'border-amber-500/40 bg-amber-500/5' : ''}>
            <CardContent className="space-y-2 py-3">
              <div className="flex items-center gap-2">
                {reviewStudents.length > 0 ? (
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                )}
                <p className="text-sm font-medium">
                  {reviewStudents.length > 0
                    ? `${reviewStudents.length} aluno(s) precisam de revisão de turma`
                    : 'Nenhuma mudança de turma pendente'}
                </p>
              </div>
              {nextClass && (
                <p className="text-xs text-muted-foreground">Próxima sala: {nextClass.name}</p>
              )}
              {missingBirthDates.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {missingBirthDates.length} aluno(s) ainda estão sem data de nascimento.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="pt-4">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void handleAddStudent();
              }}
              className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_170px_auto]"
            >
              <Input
                placeholder="Nome do aluno"
                value={newStudentName}
                onChange={(event) => setNewStudentName(event.target.value)}
              />
              <Input
                type="date"
                aria-label="Data de nascimento"
                value={newStudentBirthDate}
                onChange={(event) => setNewStudentBirthDate(event.target.value)}
              />
              <Button
                size="sm"
                className="h-10"
                disabled={
                  addingStudent
                  || !newStudentName.trim()
                  || (
                    selectedClass.age_tracking_enabled !== false
                    && selectedClass.min_age != null
                    && !newStudentBirthDate
                  )
                }
              >
                <UserPlus className="h-4 w-4" />
                <span className="ml-2 sm:hidden">Adicionar</span>
              </Button>
            </form>
          </CardContent>
        </Card>

        <div>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <UserCheck className="h-4 w-4" /> Ativos ({active.length})
          </h3>
          <div className="space-y-1.5">
            {active.map((student) => {
              const age = calculateAge(student.birth_date);
              const status = getAgeStatus(student, selectedClass);
              const statusLabel =
                status === 'exceeded'
                  ? `Mover para ${nextClass?.name || 'próxima turma'}`
                  : status === 'limit'
                    ? 'Idade máxima atingida'
                    : status === 'below'
                      ? 'Abaixo da faixa'
                      : status === 'missing'
                        ? 'Sem nascimento'
                        : null;

              return (
                <div key={student.id} className="rounded-lg border border-border bg-card p-2.5">
                  <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate text-sm font-medium">{student.name}</span>
                        {age != null && (
                          <Badge variant="outline" className="text-[10px]">{age} anos</Badge>
                        )}
                        {statusLabel && (
                          <Badge
                            variant={status === 'exceeded' ? 'destructive' : 'secondary'}
                            className={status === 'limit' ? 'border-amber-500/30 bg-amber-500/10 text-amber-700' : 'text-[10px]'}
                          >
                            {statusLabel}
                          </Badge>
                        )}
                      </div>
                      {student.birth_date && (
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          Nascimento: {new Date(`${student.birth_date}T12:00:00`).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>

                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startBirthDateEdit(student)}>
                      <CalendarDays className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startTransfer(student)}>
                      <ArrowRightLeft className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleToggleActive(student)}>
                      <UserMinus className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {editingBirthDateId === student.id && (
                    <div className="mt-2 flex gap-2 border-t pt-2">
                      <Input
                        type="date"
                        value={editingBirthDate}
                        onChange={(event) => setEditingBirthDate(event.target.value)}
                        className="h-9 flex-1"
                      />
                      <Button size="sm" className="h-9" disabled={savingBirthDate} onClick={() => handleSaveBirthDate(student.id)}>
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9"
                        onClick={() => {
                          setEditingBirthDateId(null);
                          setEditingBirthDate('');
                        }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {inactive.length > 0 && (
          <div>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <UserMinus className="h-4 w-4" /> Inativos ({inactive.length})
            </h3>
            <div className="space-y-1">
              {inactive.map((student) => (
                <div key={student.id} className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 p-2.5">
                  <span className="flex-1 text-sm text-muted-foreground">{student.name}</span>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600" onClick={() => handleToggleActive(student)}>
                    <UserCheck className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {(totalAgeReviews > 0 || totalMissingBirthDates > 0) && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="space-y-1 py-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <p className="text-sm font-medium">Revisão de faixas etárias</p>
            </div>
            {totalAgeReviews > 0 && (
              <p className="text-xs text-muted-foreground">{totalAgeReviews} aluno(s) estão no limite ou fora da faixa da sala.</p>
            )}
            {totalMissingBirthDates > 0 && (
              <p className="text-xs text-muted-foreground">{totalMissingBirthDates} aluno(s) precisam da data de nascimento.</p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-4">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void handleCreateClass();
            }}
            className="flex gap-2"
          >
            <Input
              placeholder="Nova turma..."
              value={newClassName}
              onChange={(event) => setNewClassName(event.target.value)}
              className="flex-1"
            />
            <Button size="sm" disabled={creatingClass || !newClassName.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {classes.map((cls) => {
          const classStudents = allStudents.filter((student) => student.class_id === cls.id);
          const activeStudents = classStudents.filter((student) => student.active);
          const activeCount = activeStudents.length;
          const inactiveCount = classStudents.filter((student) => !student.active).length;
          const isEditing = editingClassId === cls.id;
          const reviewCount = activeStudents.filter((student) => {
            const status = getAgeStatus(student, cls);
            return status === 'limit' || status === 'exceeded' || status === 'below';
          }).length;
          const missingCount = activeStudents.filter((student) => getAgeStatus(student, cls) === 'missing').length;

          return (
            <Card key={cls.id} className="cursor-pointer transition-shadow hover:shadow-md">
              <CardContent className="pb-4 pt-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 shrink-0 text-primary" />
                  {isEditing ? (
                    <div className="flex flex-1 gap-2">
                      <Input
                        value={editClassName}
                        onChange={(event) => setEditClassName(event.target.value)}
                        className="h-8 text-sm"
                        autoFocus
                      />
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRenameClass(cls.id)}>
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingClassId(null)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="min-w-0 flex-1" onClick={() => setSelectedClass(cls)}>
                        <p className="truncate text-sm font-medium">{cls.name}</p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">{formatAgeRange(cls)}</p>
                      </div>
                      <Badge variant="secondary" className="text-xs">{activeCount}</Badge>
                      {reviewCount > 0 && (
                        <Badge className="border-amber-500/30 bg-amber-500/10 text-[10px] text-amber-700">
                          {reviewCount} revisar
                        </Badge>
                      )}
                      {missingCount > 0 && (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">{missingCount} sem data</Badge>
                      )}
                      {inactiveCount > 0 && (
                        <Badge variant="outline" className="text-xs text-muted-foreground">{inactiveCount} inativos</Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(event) => {
                          event.stopPropagation();
                          setEditingClassId(cls.id);
                          setEditClassName(cls.name);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {classes.length === 0 && (
        <p className="py-8 text-center text-muted-foreground">Nenhuma turma cadastrada.</p>
      )}
    </div>
  );
}
