import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowLeft, Users, UserPlus, UserMinus, UserCheck, ArrowRightLeft,
  Plus, Pencil, Check, X
} from 'lucide-react';
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
  active: boolean;
}

interface TurmasTabProps {
  classes: EbdClass[];
  allStudents: EbdStudent[]; // includes inactive
  onRefresh: () => void;
}

export default function TurmasTab({ classes, allStudents, onRefresh }: TurmasTabProps) {
  const [selectedClass, setSelectedClass] = useState<EbdClass | null>(null);
  const [newStudentName, setNewStudentName] = useState('');
  const [addingStudent, setAddingStudent] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [creatingClass, setCreatingClass] = useState(false);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editClassName, setEditClassName] = useState('');
  const [transferStudent, setTransferStudent] = useState<EbdStudent | null>(null);
  const [transferTargetClass, setTransferTargetClass] = useState('');

  const handleAddStudent = async () => {
    if (!selectedClass || !newStudentName.trim()) return;
    setAddingStudent(true);
    const { error } = await supabase.from('ebd_students').insert({
      name: newStudentName.trim(),
      class_id: selectedClass.id,
      active: true,
    });
    if (error) {
      toast.error('Erro ao adicionar aluno');
    } else {
      toast.success('Aluno adicionado');
      setNewStudentName('');
      onRefresh();
    }
    setAddingStudent(false);
  };

  const handleToggleActive = async (student: EbdStudent) => {
    const { error } = await supabase.from('ebd_students').update({ active: !student.active }).eq('id', student.id);
    if (error) {
      toast.error('Erro ao atualizar aluno');
    } else {
      toast.success(student.active ? 'Aluno desativado' : 'Aluno reativado');
      onRefresh();
    }
  };

  const handleTransfer = async () => {
    if (!transferStudent || !transferTargetClass) return;
    const { error } = await supabase.from('ebd_students').update({ class_id: transferTargetClass }).eq('id', transferStudent.id);
    if (error) {
      toast.error('Erro ao transferir aluno');
    } else {
      toast.success('Aluno transferido');
      setTransferStudent(null);
      setTransferTargetClass('');
      onRefresh();
    }
  };

  const handleCreateClass = async () => {
    if (!newClassName.trim()) return;
    setCreatingClass(true);
    const maxOrder = classes.reduce((max, c) => Math.max(max, c.order_index), 0);
    const { error } = await supabase.from('ebd_classes').insert({
      name: newClassName.trim(),
      order_index: maxOrder + 1,
      active: true,
    });
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
    const { error } = await supabase.from('ebd_classes').update({ name: editClassName.trim() }).eq('id', classId);
    if (error) {
      toast.error('Erro ao renomear turma');
    } else {
      toast.success('Turma renomeada');
      setEditingClassId(null);
      onRefresh();
    }
  };

  // Transfer dialog
  if (transferStudent) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setTransferStudent(null)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h2 className="font-semibold">Transferir: {transferStudent.name}</h2>
        </div>
        <Card>
          <CardContent className="pt-4 space-y-3">
            <p className="text-sm text-muted-foreground">Selecione a turma de destino:</p>
            <Select value={transferTargetClass} onValueChange={setTransferTargetClass}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha a turma" />
              </SelectTrigger>
              <SelectContent>
                {classes.filter(c => c.id !== transferStudent.class_id).map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button className="w-full" disabled={!transferTargetClass} onClick={handleTransfer}>
              <ArrowRightLeft className="h-4 w-4 mr-2" /> Confirmar transferência
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Class detail view
  if (selectedClass) {
    const classStudents = allStudents.filter(s => s.class_id === selectedClass.id);
    const active = classStudents.filter(s => s.active).sort((a, b) => a.name.localeCompare(b.name));
    const inactive = classStudents.filter(s => !s.active).sort((a, b) => a.name.localeCompare(b.name));

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSelectedClass(null)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="font-semibold">{selectedClass.name}</h2>
            <p className="text-xs text-muted-foreground">{active.length} ativos · {inactive.length} inativos</p>
          </div>
        </div>

        {/* Add student */}
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={(e) => { e.preventDefault(); handleAddStudent(); }} className="flex gap-2">
              <Input
                placeholder="Nome do aluno"
                value={newStudentName}
                onChange={e => setNewStudentName(e.target.value)}
                className="flex-1"
              />
              <Button size="sm" disabled={addingStudent || !newStudentName.trim()}>
                <UserPlus className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Active students */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
            <UserCheck className="h-4 w-4" /> Ativos ({active.length})
          </h3>
          <div className="space-y-1">
            {active.map(s => (
              <div key={s.id} className="flex items-center gap-2 p-2.5 rounded-lg bg-card border border-border">
                <span className="flex-1 text-sm font-medium">{s.name}</span>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setTransferStudent(s)}>
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleToggleActive(s)}>
                  <UserMinus className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Inactive students */}
        {inactive.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
              <UserMinus className="h-4 w-4" /> Inativos ({inactive.length})
            </h3>
            <div className="space-y-1">
              {inactive.map(s => (
                <div key={s.id} className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/30 border border-border/50">
                  <span className="flex-1 text-sm text-muted-foreground">{s.name}</span>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600" onClick={() => handleToggleActive(s)}>
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

  // Classes list
  return (
    <div className="space-y-4">
      {/* Create class */}
      <Card>
        <CardContent className="pt-4">
          <form onSubmit={(e) => { e.preventDefault(); handleCreateClass(); }} className="flex gap-2">
            <Input
              placeholder="Nova turma..."
              value={newClassName}
              onChange={e => setNewClassName(e.target.value)}
              className="flex-1"
            />
            <Button size="sm" disabled={creatingClass || !newClassName.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Classes */}
      <div className="space-y-2">
        {classes.map(cls => {
          const classStudents = allStudents.filter(s => s.class_id === cls.id);
          const activeCount = classStudents.filter(s => s.active).length;
          const inactiveCount = classStudents.filter(s => !s.active).length;
          const isEditing = editingClassId === cls.id;

          return (
            <Card key={cls.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary shrink-0" />
                  {isEditing ? (
                    <div className="flex-1 flex gap-2">
                      <Input
                        value={editClassName}
                        onChange={e => setEditClassName(e.target.value)}
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
                      <span
                        className="flex-1 font-medium text-sm"
                        onClick={() => setSelectedClass(cls)}
                      >
                        {cls.name}
                      </span>
                      <Badge variant="secondary" className="text-xs">{activeCount}</Badge>
                      {inactiveCount > 0 && (
                        <Badge variant="outline" className="text-xs text-muted-foreground">{inactiveCount} inativos</Badge>
                      )}
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
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
        <p className="text-center text-muted-foreground py-8">Nenhuma turma cadastrada.</p>
      )}
    </div>
  );
}
