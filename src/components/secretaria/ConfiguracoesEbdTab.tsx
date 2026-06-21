import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { GraduationCap, Plus, Pencil, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';

interface EbdClass {
  id: string;
  name: string;
  order_index: number;
}

interface Teacher {
  id: string;
  name: string;
  class_id: string;
  active: boolean;
}

interface ConfiguracoesEbdTabProps {
  classes: EbdClass[];
}

export default function ConfiguracoesEbdTab({ classes }: ConfiguracoesEbdTabProps) {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [deleting, setDeleting] = useState<Teacher | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [classId, setClassId] = useState('');

  const classMap = Object.fromEntries(classes.map(c => [c.id, c.name]));

  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ebd_teachers')
      .select('id, name, class_id, active')
      .order('name');
    if (error) {
      toast.error('Erro ao carregar professores');
    } else {
      setTeachers((data as Teacher[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchTeachers(); }, [fetchTeachers]);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setPin('');
    setClassId('');
    setDialogOpen(true);
  };

  const openEdit = (t: Teacher) => {
    setEditing(t);
    setName(t.name);
    setPin('');
    setClassId(t.class_id);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Informe o nome do professor'); return; }
    if (!classId) { toast.error('Selecione a sala'); return; }
    if (!editing && !/^[0-9]{6}$/.test(pin)) { toast.error('O PIN deve ter 6 dígitos'); return; }
    if (editing && pin && !/^[0-9]{6}$/.test(pin)) { toast.error('O PIN deve ter 6 dígitos'); return; }

    setSaving(true);
    const payload = editing
      ? { action: 'update', id: editing.id, name: name.trim(), class_id: classId, pin: pin || undefined }
      : { action: 'create', name: name.trim(), class_id: classId, pin };
    const { data, error } = await supabase.functions.invoke('manage-ebd-teacher', { body: payload });
    setSaving(false);

    if (error || (data && (data as any).error)) {
      toast.error((data as any)?.error || 'Erro ao salvar professor');
      return;
    }
    toast.success(editing ? 'Professor atualizado' : 'Professor cadastrado');
    setDialogOpen(false);
    fetchTeachers();
  };

  const handleDelete = async () => {
    if (!deleting) return;
    const { data, error } = await supabase.functions.invoke('manage-ebd-teacher', {
      body: { action: 'delete', id: deleting.id },
    });
    if (error || (data && (data as any).error)) {
      toast.error((data as any)?.error || 'Erro ao excluir');
      return;
    }
    toast.success('Professor excluído');
    setDeleting(null);
    fetchTeachers();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{teachers.length} professor(es)</p>
        <Button size="sm" onClick={openCreate} disabled={classes.length === 0}>
          <Plus className="h-4 w-4 mr-1" /> Novo
        </Button>
      </div>

      {classes.length === 0 && (
        <Card>
          <CardContent className="pt-4 text-sm text-muted-foreground text-center">
            Crie ao menos uma turma antes de cadastrar professores.
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : teachers.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">Nenhum professor cadastrado.</p>
      ) : (
        <div className="space-y-2">
          {teachers.map(t => (
            <Card key={t.id}>
              <CardContent className="pt-4 pb-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <GraduationCap className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{t.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Users className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground truncate">
                      {classMap[t.class_id] || 'Sala removida'}
                    </span>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleting(t)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar professor' : 'Novo professor'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="teacher-name">Nome do professor</Label>
              <Input id="teacher-name" value={name} onChange={e => setName(e.target.value)} placeholder="Nome completo" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="teacher-pin">PIN de 6 dígitos {editing && <span className="text-muted-foreground font-normal">(deixe em branco para manter)</span>}</Label>
              <Input
                id="teacher-pin"
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                placeholder="••••••"
              />
            </div>
            <div className="space-y-2">
              <Label>Sala</Label>
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger><SelectValue placeholder="Selecione a sala" /></SelectTrigger>
                <SelectContent>
                  {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={v => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir professor?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {deleting?.name}? Ele perderá o acesso à secretaria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}