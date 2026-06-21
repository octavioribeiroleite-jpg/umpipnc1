import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ClipboardList, BarChart3, Settings2, ArrowLeft, UserCheck, LogOut, Cake, Home, Plus, TableProperties } from 'lucide-react';
import { useSwipeBack } from '@/hooks/useSwipeBack';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import ChamadaTab from '@/components/secretaria/ChamadaTab';
import HistoricoTab from '@/components/secretaria/HistoricoTab';
import TurmasTab from '@/components/secretaria/TurmasTab';
import PlanilhaAlunosTab from '@/components/secretaria/PlanilhaAlunosTab';
import ConfiguracoesEbdTab from '@/components/secretaria/ConfiguracoesEbdTab';
import AcessosEbdTab from '@/components/secretaria/AcessosEbdTab';
import ProfileSelect from '@/components/secretaria/ProfileSelect';
import PinPad from '@/components/secretaria/PinPad';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AppCard } from '@/components/ui/app-card';
import { Skeleton } from '@/components/ui/skeleton';
import { HeaderActions } from '@/components/layout/HeaderActions';
import { useBirthdays } from '@/hooks/useBirthdays';
import type { Birthday, BirthdayInsert } from '@/hooks/useBirthdays';
import { NextBirthdayCard } from '@/components/aniversariantes/NextBirthdayCard';
import { TodayBirthdays } from '@/components/aniversariantes/TodayBirthdays';
import { WeekBirthdays } from '@/components/aniversariantes/WeekBirthdays';
import { MonthBirthdays } from '@/components/aniversariantes/MonthBirthdays';
import { YearCalendar } from '@/components/aniversariantes/YearCalendar';
import { BirthdayNotifications } from '@/components/aniversariantes/BirthdayNotifications';
import { WeekAnnouncementCard } from '@/components/aniversariantes/WeekAnnouncementCard';
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

interface AttendanceRecord {
  id: string;
  student_id: string;
  class_id: string;
  date: string;
  present: boolean;
}

type AccessLevel = 'admin' | 'professor';
type LoginStep = 'profile' | 'pin' | 'name';
type CurrentView = 'home' | 'chamada' | 'historico' | 'turmas' | 'aniversariantes' | 'planilha' | 'configuracoes' | 'acessos';

export interface VisitorEntry {
  id: string;
  name: string | null;
}

function getTodayDate(): string {
  const today = new Date();
  return format(today, 'yyyy-MM-dd');
}

// Embedded birthdays component
function SecretariaAniversariantes() {
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
  const pendingReview = birthdays.filter(b => b.pendente_revisao);

  const handleSave = (data: BirthdayInsert) => {
    if (editingBirthday) {
      updateBirthday.mutate({ id: editingBirthday.id, ...data }, {
        onSuccess: () => { toast.success('Atualizado!'); setFormOpen(false); setEditingBirthday(null); },
        onError: () => toast.error('Erro ao atualizar.'),
      });
    } else {
      createBirthday.mutate(data, {
        onSuccess: () => { toast.success('Cadastrado!'); setFormOpen(false); },
        onError: () => toast.error('Erro ao cadastrar.'),
      });
    }
  };

  const handleEdit = (b: Birthday) => { setEditingBirthday(b); setFormOpen(true); };
  const handleToggleActive = (b: Birthday) => {
    updateBirthday.mutate({ id: b.id, ativo: !b.ativo }, {
      onSuccess: () => toast.success(b.ativo ? 'Inativado' : 'Ativado'),
    });
  };
  const handleDelete = () => {
    if (!deletingBirthday) return;
    deleteBirthday.mutate(deletingBirthday.id, {
      onSuccess: () => { toast.success('Excluído!'); setDeletingBirthday(null); },
      onError: () => toast.error('Erro ao excluir.'),
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{activeBirthdays.length} cadastrados</p>
        <Button size="sm" onClick={() => { setEditingBirthday(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Novo
        </Button>
      </div>

      <BirthdayFilters
        search={search}
        onSearchChange={setSearch}
        department={department}
        onDepartmentChange={setDepartment}
        departments={departments}
      />

      <NextBirthdayCard birthday={nextBirthday} />
      <TodayBirthdays birthdays={filteredToday} showActions onEdit={handleEdit} onToggleActive={handleToggleActive} onDelete={setDeletingBirthday} />
      <WeekBirthdays birthdays={filteredWeek} showActions onEdit={handleEdit} onToggleActive={handleToggleActive} onDelete={setDeletingBirthday} />
      <MonthBirthdays birthdays={filteredMonth} month={currentMonth} showActions onEdit={handleEdit} onToggleActive={handleToggleActive} onDelete={setDeletingBirthday} />

      {pendingReview.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-semibold text-sm text-amber-600 dark:text-amber-400">⚠️ Registros pendentes ({pendingReview.length})</h2>
          <div className="space-y-1.5">
            {pendingReview.map(b => (
              <BirthdayCard key={b.id} birthday={b} showActions onEdit={handleEdit} onToggleActive={handleToggleActive} onDelete={setDeletingBirthday} />
            ))}
          </div>
        </div>
      )}

      <YearCalendar birthdays={filteredAll} onEdit={handleEdit} />
      <BirthdayNotifications />

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
              Tem certeza que deseja excluir {deletingBirthday?.nome}?
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

export default function Secretaria() {
  const navigate = useNavigate();
  useSwipeBack();
  const [accessLevel, setAccessLevel] = useState<AccessLevel | null>(null);
  const [loginStep, setLoginStep] = useState<LoginStep>('profile');
  const [selectedProfile, setSelectedProfile] = useState<'admin' | 'professor' | null>(null);
  const [loading, setLoading] = useState(false);
  const [pinError, setPinError] = useState(false);
  const [pendingPin, setPendingPin] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [adminPin, setAdminPin] = useState('');
  const [classes, setClasses] = useState<EbdClass[]>([]);
  const [activeStudents, setActiveStudents] = useState<EbdStudent[]>([]);
  const [allStudents, setAllStudents] = useState<EbdStudent[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [professorNome, setProfessorNome] = useState('');
  const [professorClassId, setProfessorClassId] = useState<string | null>(null);
  const [dayIsClosed, setDayIsClosed] = useState(false);
  const [closureId, setClosureId] = useState<string | null>(null);
  const [visitorCount, setVisitorCount] = useState(0);
  const [classVisitors, setClassVisitors] = useState<Record<string, VisitorEntry[]>>({});
  const [currentView, setCurrentView] = useState<CurrentView>('home');
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const { weekBirthdays, todayBirthdays } = useBirthdays();
  const allWeekAnnouncements = [
    ...todayBirthdays.map(b => ({ ...b, daysUntil: 0 })),
    ...weekBirthdays,
  ];

  const sundayDate = getTodayDate();
  const formattedDate = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  const handleProfileSelect = (profile: 'admin' | 'professor') => {
    setSelectedProfile(profile);
    setLoginStep('pin');
  };

  const handlePinComplete = async (pin: string) => {
    setLoading(true);

    if (selectedProfile === 'admin') {
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'secretaria_admin_password')
        .single();

      if (data && data.value === pin) {
        setAccessLevel('admin');
        setAdminPin(pin);
      } else {
        setPinError(true);
        toast.error('PIN incorreto');
        setTimeout(() => setPinError(false), 600);
      }
      setLoading(false);
      return;
    }

    // Professor: guarda a senha da sala e segue para informar o nome
    setPendingPin(pin);
    setNameInput('');
    setLoginStep('name');
    setLoading(false);
  };

  const handleNameSubmit = async () => {
    if (!nameInput.trim()) {
      toast.error('Informe seu nome');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('ebd-class-login', {
      body: { pin: pendingPin, name: nameInput.trim() },
    });
    setLoading(false);

    if (error || !data?.success) {
      toast.error((data as any)?.error || 'Senha da sala incorreta');
      setPendingPin('');
      setLoginStep('pin');
      return;
    }
    setProfessorNome(data.teacher.name);
    setProfessorClassId(data.teacher.class_id);
    setAccessLevel('professor');
  };

  const handleBack = () => {
    setLoginStep('profile');
    setSelectedProfile(null);
    setPinError(false);
    setPendingPin('');
    setNameInput('');
  };

  const fetchData = useCallback(async () => {
    const [classesRes, activeStudentsRes, allStudentsRes, attendanceRes, closureRes, visitorEntriesRes] = await Promise.all([
      supabase.from('ebd_classes').select('*').eq('active', true).order('order_index'),
      supabase.from('ebd_students').select('*').eq('active', true).order('name'),
      supabase.from('ebd_students').select('*').order('name'),
      supabase.from('ebd_attendance').select('*').eq('date', sundayDate),
      supabase.from('ebd_day_closures').select('*').eq('date', sundayDate).maybeSingle(),
      (supabase.from('ebd_class_visitor_entries' as any).select('id, class_id, name').eq('date', sundayDate)),
    ]);

    if (classesRes.data) setClasses(classesRes.data);
    if (activeStudentsRes.data) setActiveStudents(activeStudentsRes.data);
    if (allStudentsRes.data) setAllStudents(allStudentsRes.data);
    if (attendanceRes.data) setAttendance(attendanceRes.data);
    const cvMap: Record<string, VisitorEntry[]> = {};
    ((visitorEntriesRes as any).data || []).forEach((row: any) => {
      if (!cvMap[row.class_id]) cvMap[row.class_id] = [];
      cvMap[row.class_id].push({ id: row.id, name: row.name ?? null });
    });
    setClassVisitors(cvMap);
    const totalV = Object.values(cvMap).reduce((s, list) => s + list.length, 0);
    if (closureRes.data) {
      setDayIsClosed(true);
      setClosureId(closureRes.data.id);
      setVisitorCount((closureRes.data as any).visitor_count ?? 0);
    } else {
      setDayIsClosed(false);
      setClosureId(null);
      setVisitorCount(totalV);
    }
  }, [sundayDate]);

  useEffect(() => {
    if (accessLevel) fetchData();
  }, [accessLevel, fetchData]);

  const handleAddClassVisitor = useCallback(async (classId: string, name: string | null) => {
    const cleanName = name?.trim() || null;
    const { data, error } = await (supabase.from('ebd_class_visitor_entries' as any)
      .insert({ class_id: classId, date: sundayDate, name: cleanName, marked_by: professorNome || 'Administrador' })
      .select('id, class_id, name')
      .single() as any);
    if (error || !data) {
      toast.error('Erro ao adicionar visitante');
      return;
    }
    setClassVisitors(prev => {
      const list = prev[classId] ? [...prev[classId]] : [];
      list.push({ id: data.id, name: data.name ?? null });
      const next = { ...prev, [classId]: list };
      setVisitorCount(Object.values(next).reduce((s, l) => s + l.length, 0));
      return next;
    });
  }, [sundayDate, professorNome]);

  const handleRemoveClassVisitor = useCallback(async (classId: string, entryId: string) => {
    const { error } = await (supabase.from('ebd_class_visitor_entries' as any).delete().eq('id', entryId) as any);
    if (error) {
      toast.error('Erro ao remover visitante');
      return;
    }
    setClassVisitors(prev => {
      const list = (prev[classId] || []).filter(v => v.id !== entryId);
      const next = { ...prev, [classId]: list };
      setVisitorCount(Object.values(next).reduce((s, l) => s + l.length, 0));
      return next;
    });
  }, []);

  const handleCloseDay = async () => {
    const classSummary = classes.map(cls => {
      const classStudents = activeStudents.filter(s => s.class_id === cls.id);
      const classAttendance = attendance.filter(a => a.class_id === cls.id && a.date === sundayDate);
      const present = classAttendance.filter(a => a.present).length;
      const total = classStudents.length;
      const visitorEntries = classVisitors[cls.id] || [];
      return {
        classId: cls.id,
        className: cls.name,
        total,
        present,
        percentage: total > 0 ? Math.round((present / total) * 100) : 0,
        visitor_count: visitorEntries.length,
        visitors: visitorEntries.map(v => ({ name: v.name })),
      };
    });

    const totalStudents = activeStudents.length;
    const presentStudents = attendance.filter(a => a.present && a.date === sundayDate).length;
    const totalVisitors = Object.values(classVisitors).reduce((s, l) => s + l.length, 0);

    const { error } = await supabase
      .from('ebd_day_closures')
      .insert({
        date: sundayDate,
        closed_by: professorNome || 'Administrador',
        total_students: totalStudents,
        present_students: presentStudents,
        class_summary: classSummary,
        visitor_count: totalVisitors,
      } as any);

    if (error) {
      toast.error('Erro ao fechar o dia');
      return;
    }

    toast.success('Dia fechado com sucesso!');
    await fetchData();
  };

  const handleReopenDay = async () => {
    if (!closureId) return;

    const { error } = await supabase
      .from('ebd_day_closures')
      .delete()
      .eq('id', closureId);

    if (error) {
      toast.error('Erro ao reabrir o dia');
      return;
    }

    toast.success('Dia reaberto!');
    await fetchData();
  };

  // Login screens
  if (!accessLevel) {
    if (loginStep === 'profile') {
      return <ProfileSelect onSelect={handleProfileSelect} onBack={() => navigate('/auth')} />;
    }

    if (loginStep === 'name') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="w-full max-w-xs mx-auto space-y-6">
            <div className="flex flex-col items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => { setLoginStep('pin'); setPendingPin(''); }} className="self-start shrink-0">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <UserCheck className="h-7 w-7 text-primary" />
              </div>
              <div className="text-center">
                <h2 className="font-semibold text-lg">Qual é o seu nome?</h2>
                <p className="text-sm text-muted-foreground">Para registrar quem entrou na sala</p>
              </div>
            </div>
            <input
              autoFocus
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && nameInput.trim()) handleNameSubmit(); }}
              placeholder="Seu nome"
              className="w-full h-12 px-4 rounded-xl border-2 border-border bg-background text-base outline-none focus:border-primary"
            />
            <Button
              className="w-full h-12 text-base font-semibold gap-2 rounded-xl"
              onClick={handleNameSubmit}
              disabled={loading || !nameInput.trim()}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </div>
        </div>
      );
    }

    return (
      <PinPad
        profileLabel={selectedProfile === 'admin' ? 'Administrador' : 'Senha da sala'}
        onBack={handleBack}
        onComplete={handlePinComplete}
        loading={loading}
        error={pinError}
      />
    );
  }

  const isAdmin = accessLevel === 'admin';
  const profileLabel = isAdmin ? 'Administrador' : 'Professor';

  // Professor só enxerga a própria sala; admin vê todas
  const visibleClasses = isAdmin
    ? classes
    : classes.filter(c => c.id === professorClassId);
  const visibleActiveStudents = isAdmin
    ? activeStudents
    : activeStudents.filter(s => s.class_id === professorClassId);

  const handleExitApp = () => {
    setShowExitConfirm(true);
  };

  const confirmExit = () => {
    setShowExitConfirm(false);
    setAccessLevel(null);
    setLoginStep('profile');
    setSelectedProfile(null);
    setCurrentView('home');
    setProfessorClassId(null);
    setProfessorNome('');
    navigate('/auth');
  };

  const handleBackToHome = () => {
    setCurrentView('home');
  };

  // Calculate stats for home cards
  const presentCount = attendance.filter(a => a.present && a.date === sundayDate).length;
  const totalCount = activeStudents.length;

  // Home view with cards
  if (currentView === 'home') {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3 safe-top">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={handleExitApp}
                className="p-1 -ml-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="font-semibold text-lg">Secretaria EBD</h1>
                <p className="text-xs text-muted-foreground">{formattedDate}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isAdmin ? 'default' : 'secondary'} className="text-xs">
                {profileLabel}
              </Badge>
              <button
                onClick={handleExitApp}
                className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                title="Sair da Secretaria"
              >
                <LogOut className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Status card */}
          <AppCard className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Presença de Hoje</p>
                <p className="text-2xl font-bold">{presentCount}/{totalCount}</p>
                {visitorCount > 0 && (
                  <p className="text-xs text-muted-foreground">+{visitorCount} visitante{visitorCount > 1 ? 's' : ''}</p>
                )}
              </div>
              <div className={`px-3 py-1.5 rounded-full text-xs font-medium ${dayIsClosed ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                {dayIsClosed ? '✓ Dia fechado' : 'Em andamento'}
              </div>
            </div>
          </AppCard>

          {/* Birthday announcement card */}
          <WeekAnnouncementCard birthdays={allWeekAnnouncements} />

          {/* Menu cards */}
          <div className="grid grid-cols-2 gap-3">
            <AppCard
              variant="interactive"
              className="flex flex-col items-center gap-3 py-6"
              onClick={() => setCurrentView('chamada')}
            >
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <ClipboardList className="h-7 w-7 text-primary" />
              </div>
              <span className="font-medium text-sm">Chamada</span>
            </AppCard>

            <AppCard
              variant="interactive"
              className="flex flex-col items-center gap-3 py-6"
              onClick={() => setCurrentView('historico')}
            >
              <div className="h-14 w-14 rounded-2xl bg-sky-500/10 flex items-center justify-center">
                <BarChart3 className="h-7 w-7 text-sky-500" />
              </div>
              <span className="font-medium text-sm">Histórico</span>
            </AppCard>

            <AppCard
              variant="interactive"
              className="flex flex-col items-center gap-3 py-6"
              onClick={() => setCurrentView('aniversariantes')}
            >
              <div className="h-14 w-14 rounded-2xl bg-pink-500/10 flex items-center justify-center">
                <Cake className="h-7 w-7 text-pink-500" />
              </div>
              <span className="font-medium text-sm">Aniversariantes</span>
            </AppCard>

            {isAdmin && (
              <AppCard
                variant="interactive"
                className="flex flex-col items-center gap-3 py-6"
                onClick={() => setCurrentView('turmas')}
              >
                <div className="h-14 w-14 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                  <Settings2 className="h-7 w-7 text-amber-500" />
                </div>
                <span className="font-medium text-sm">Turmas</span>
              </AppCard>
            )}

            {isAdmin && (
              <>
                <AppCard
                  variant="interactive"
                  className="flex flex-col items-center gap-3 py-6"
                  onClick={() => setCurrentView('planilha')}
                >
                  <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                    <TableProperties className="h-7 w-7 text-emerald-500" />
                  </div>
                  <span className="font-medium text-sm">Planilha de Alunos</span>
                </AppCard>

                <AppCard
                  variant="interactive"
                  className="flex flex-col items-center gap-3 py-6"
                  onClick={() => setCurrentView('configuracoes')}
                >
                  <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
                    <UserCheck className="h-7 w-7 text-indigo-500" />
                  </div>
                  <span className="font-medium text-sm">Configurações</span>
                </AppCard>

                <AppCard
                  variant="interactive"
                  className="flex flex-col items-center gap-3 py-6"
                  onClick={() => setCurrentView('acessos')}
                >
                  <div className="h-14 w-14 rounded-2xl bg-rose-500/10 flex items-center justify-center">
                    <UserCheck className="h-7 w-7 text-rose-500" />
                  </div>
                  <span className="font-medium text-sm">Acessos</span>
                </AppCard>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Sub-views with back button
  const viewTitles: Record<CurrentView, string> = {
    home: 'Secretaria EBD',
    chamada: 'Chamada',
    historico: 'Histórico',
    turmas: 'Turmas',
    aniversariantes: 'Aniversariantes',
    planilha: 'Planilha de Alunos',
    configuracoes: 'Configurações',
    acessos: 'Acessos',
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed top-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-md border-b border-border px-2 py-1.5 safe-top">
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <button
              onClick={handleBackToHome}
              aria-label="Voltar"
              className="p-2 -ml-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors flex-shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0 leading-tight">
              <h1 className="font-semibold text-sm sm:text-base truncate">{viewTitles[currentView]}</h1>
              <p className="text-[10px] text-muted-foreground truncate">
                {formattedDate}
                <span className="mx-1">·</span>
                <span className={isAdmin ? 'text-primary font-medium' : ''}>{profileLabel}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <HeaderActions />
            <button
              onClick={handleBackToHome}
              aria-label="Menu da Secretaria"
              title="Menu da Secretaria"
              className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <Home className="h-5 w-5" />
            </button>
            <button
              onClick={handleExitApp}
              aria-label="Sair"
              title="Sair"
              className="p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 pb-8 pt-16">
        {currentView === 'chamada' && (
          <ChamadaTab
            classes={visibleClasses}
            students={visibleActiveStudents}
            attendance={attendance}
            setAttendance={setAttendance}
            attendanceDate={sundayDate}
            formattedDate={formattedDate}
            initialProfessorName={professorNome || undefined}
            accessLevel={accessLevel!}
            dayIsClosed={dayIsClosed}
            onCloseDay={handleCloseDay}
            onReopenDay={handleReopenDay}
            classVisitors={classVisitors}
            onAddClassVisitor={handleAddClassVisitor}
            onRemoveClassVisitor={handleRemoveClassVisitor}
          />
        )}

        {currentView === 'historico' && (
          <HistoricoTab classes={visibleClasses} students={visibleActiveStudents} accessLevel={accessLevel!} onRefreshParent={fetchData} />
        )}

        {currentView === 'turmas' && isAdmin && (
          <TurmasTab
            classes={classes}
            allStudents={allStudents}
            onRefresh={fetchData}
          />
        )}

        {currentView === 'aniversariantes' && (
          <SecretariaAniversariantes />
        )}

        {currentView === 'planilha' && isAdmin && (
          <PlanilhaAlunosTab
            classes={classes}
            allStudents={allStudents}
            onRefresh={fetchData}
            accessLevel={accessLevel!}
          />
        )}

        {currentView === 'configuracoes' && isAdmin && (
          <ConfiguracoesEbdTab classes={classes} adminPin={adminPin} />
        )}

        {currentView === 'acessos' && isAdmin && (
          <AcessosEbdTab classes={classes} date={sundayDate} formattedDate={formattedDate} />
        )}
      </div>

      <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sair da Secretaria?</AlertDialogTitle>
            <AlertDialogDescription>
              Você será desconectado e voltará para a tela de login da secretaria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmExit}>Sair</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
