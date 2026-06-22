import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useBirthdays } from '@/hooks/useBirthdays';
import type { Birthday, BirthdayInsert } from '@/hooks/useBirthdays';
import { NextBirthdayCard } from '@/components/aniversariantes/NextBirthdayCard';
import { TodayBirthdays } from '@/components/aniversariantes/TodayBirthdays';
import { WeekBirthdays } from '@/components/aniversariantes/WeekBirthdays';
import { MonthBirthdays } from '@/components/aniversariantes/MonthBirthdays';
import { YearCalendar } from '@/components/aniversariantes/YearCalendar';
import { BirthdayNotifications } from '@/components/aniversariantes/BirthdayNotifications';
import { BirthdayFilters } from '@/components/aniversariantes/BirthdayFilters';
import { BirthdayFormDialog } from '@/components/aniversariantes/BirthdayFormDialog';
import { BirthdayCard } from '@/components/aniversariantes/BirthdayCard';
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

function mutationErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export default function Aniversariantes() {
  const { isManagement, isAdmin } = useAuth();
  const canManage = isManagement || isAdmin;
  const {
    activeBirthdays, todayBirthdays, weekBirthdays, monthBirthdays, nextBirthday,
    departments, isLoading, createBirthday, updateBirthday, deleteBirthday, birthdays,
  } = useBirthdays();

  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingBirthday, setEditingBirthday] = useState<Birthday | null>(null);
  const [deletingBirthday, setDeletingBirthday] = useState<Birthday | null>(null);

  const currentMonth = new Date().getMonth() + 1;

  const filter = <T extends Birthday>(list: T[]): T[] => {
    let filtered = list;
    if (search) filtered = filtered.filter(b => b.nome.toLowerCase().includes(search.toLowerCase()));
    if (department !== 'all') filtered = filtered.filter(b => b.departamento === department);
    return filtered;
  };

  const filteredToday = filter(todayBirthdays);
  const filteredWeek = filter(weekBirthdays);
  const filteredMonth = filter(monthBirthdays);
  const filteredAll = filter(activeBirthdays);

  // Pending review items
  const pendingReview = birthdays.filter(b => b.pendente_revisao);

  const handleSave = (data: BirthdayInsert) => {
    if (editingBirthday) {
      updateBirthday.mutate({ id: editingBirthday.id, ...data }, {
        onSuccess: () => { toast.success('Atualizado!'); setFormOpen(false); setEditingBirthday(null); },
        onError: error => toast.error(mutationErrorMessage(error, 'Erro ao atualizar.')),
      });
    } else {
      createBirthday.mutate(data, {
        onSuccess: () => { toast.success('Cadastrado!'); setFormOpen(false); },
        onError: error => toast.error(mutationErrorMessage(error, 'Erro ao cadastrar.')),
      });
    }
  };

  const handleEdit = (b: Birthday) => { setEditingBirthday(b); setFormOpen(true); };
  const handleToggleActive = (b: Birthday) => {
    updateBirthday.mutate({ id: b.id, ativo: !b.ativo }, {
      onSuccess: () => toast.success(b.ativo ? 'Inativado' : 'Ativado'),
      onError: error => toast.error(mutationErrorMessage(error, 'Erro ao alterar o status.')),
    });
  };
  const handleDelete = () => {
    if (!deletingBirthday) return;
    deleteBirthday.mutate(deletingBirthday.id, {
      onSuccess: () => { toast.success('Excluído!'); setDeletingBirthday(null); },
      onError: error => toast.error(mutationErrorMessage(error, 'Erro ao excluir.')),
    });
  };

  if (isLoading) {
    return (
      <AppLayout>
        <PageHeader title="Aniversariantes" />
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="Aniversariantes 🎂"
        description={`${activeBirthdays.length} cadastrados`}
        action={
          canManage ? (
            <Button size="sm" onClick={() => { setEditingBirthday(null); setFormOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Novo
            </Button>
          ) : undefined
        }
      />

      <div className="space-y-5">
        <BirthdayFilters
          search={search}
          onSearchChange={setSearch}
          department={department}
          onDepartmentChange={setDepartment}
          departments={departments}
        />

        <NextBirthdayCard birthday={nextBirthday} />

        <TodayBirthdays birthdays={filteredToday} showActions={canManage} onEdit={handleEdit} onToggleActive={handleToggleActive} onDelete={setDeletingBirthday} />

        <WeekBirthdays birthdays={filteredWeek} showActions={canManage} onEdit={handleEdit} onToggleActive={handleToggleActive} onDelete={setDeletingBirthday} />

        <MonthBirthdays birthdays={filteredMonth} month={currentMonth} showActions={canManage} onEdit={handleEdit} onToggleActive={handleToggleActive} onDelete={setDeletingBirthday} />

        {/* Pending review */}
        {pendingReview.length > 0 && canManage && (
          <div className="space-y-2">
            <h2 className="font-semibold text-sm text-amber-600 dark:text-amber-400">⚠️ Registros pendentes de revisão ({pendingReview.length})</h2>
            <div className="space-y-1.5">
              {pendingReview.map(b => (
                <BirthdayCard key={b.id} birthday={b} showActions={canManage} onEdit={handleEdit} onToggleActive={handleToggleActive} onDelete={setDeletingBirthday} />
              ))}
            </div>
          </div>
        )}

        <YearCalendar birthdays={filteredAll} onEdit={canManage ? handleEdit : undefined} />

        <BirthdayNotifications />
      </div>

      <BirthdayFormDialog
        open={formOpen}
        onOpenChange={v => { setFormOpen(v); if (!v) setEditingBirthday(null); }}
        birthday={editingBirthday}
        onSave={handleSave}
        isSaving={createBirthday.isPending || updateBirthday.isPending}
      />

      <AlertDialog open={!!deletingBirthday} onOpenChange={v => !v && setDeletingBirthday(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir aniversariante?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {deletingBirthday?.nome}? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
