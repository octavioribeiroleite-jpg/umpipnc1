import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/ebd-client';
import {
  ArrowLeft,
  BarChart3,
  Cake,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Home,
  LogOut,
  Plus,
  Settings2,
  TableProperties,
  UserCheck,
  Users,
} from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { HeaderActions } from '@/components/layout/HeaderActions';
import { isBirthdaySessionExpiredError, useBirthdays } from '@/hooks/useBirthdays';
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

function SecretariaMetric({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: any;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/85 p-3 shadow-sm backdrop-blur-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold text-slate-500">{label}</p>
          <p className="mt-1 text-xl font-extrabold leading-none text-slate-950">{value}</p>
          {hint && <p className="mt-1 truncate text-[11px] text-slate-500">{hint}</p>}
        </div>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}>
          <Icon className="h-[18px] w-[18px]" />
        </div>
      </div>
    </div>
  );
}

function SecretariaMenuCard({
  title,
  description,
  icon: Icon,
  tone,
  onClick,
  disabled,
}: {
  title: string;
  description: string;
  icon: any;
  tone: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group flex w-full items-center gap-3 rounded-2xl border border-white/70 bg-white/95 p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
    >
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${tone}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-extrabold text-slate-950">{title}</p>
        <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-slate-500">{description}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-primary" />
    </button>
  );
}

const EBD_SESSION_KEY = 'ebd_session';

interface StoredEbdSession {
  accessLevel: AccessLevel;
  adminPin?: string;
  professorNome?: string;
  professorClassId?: string | null;
  birthdayAiToken?: string;
  birthdayAiExpiresAt?: string;
}

function loadStoredEbdSession(): StoredEbdSession | null {
  try {
    const raw = sessionStorage.getItem(EBD_SESSION_KEY);
    return raw ? (JSON.parse(raw) as StoredEbdSession) : null;
  } catch {
    return null;
  }
}

// Embedded birthdays component
function SecretariaAniversariantes({ onSessionExpired }: { onSessionExpired: () => void }) {
  const {
    activeBirthdays, todayBirthdays, weekBirthdays, monthBirthdays, nextBirthday,
    departments, isLoading, createBirthday, updateBirthday, deleteBirthday, birthdays,
  } = useBirthdays(supabase, 'ebd-admin');

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

  const handleMutationError = (error: unknown, fallback: string) => {
    if (isBirthdaySessionExpiredError(error)) onSessionExpired();
    toast.error(error instanceof Error && error.message ? error.message : fallback);
  };

  const handleSave = (data: BirthdayInsert) => {
    if (editingBirthday) {
      updateBirthday.mutate({ id: editingBirthday.id, ...data }, {
        onSuccess: () => { toast.success('Atualizado!'); setFormOpen(false); setEditingBirthday(null); },
        onError: error => handleMutationError(error, 'Erro ao atualizar.'),
      });
    } else {
      createBirthday.mutate(data, {
        onSuccess: () => { toast.success('Cadastrado!'); setFormOpen(false); },
        onError: error => handleMutationError(error, 'Erro ao cadastrar.'),
      });
    }
  };

  const handleEdit = (b: Birthday) => { setEditingBirthday(b); setFormOpen(true); };
  const handleToggleActive = (b: Birthday) => {
    updateBirthday.mutate({ id: b.id, ativo: !b.ativo }, {
      onSuccess: () => toast.success(b.ativo ? 'Inativado' : 'Ativado'),
      onError: error => handleMutationError(error, 'Erro ao alterar o status.'),
    });
  };
  const handleDelete = () => {
    if (!deletingBirthday) return;
    deleteBirthday.mutate(deletingBirthday.id, {
      onSuccess: () => { toast.success('Excluído!'); setDeletingBirthday(null); },
      onError: error => handleMutationError(error, 'Erro ao excluir.'),
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
            <AlertDialogAction
              disabled={deleteBirthday.isPending}
              onClick={event => { event.preventDefault(); handleDelete(); }}
            >
              {deleteBirthday.isPending ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function Secretaria() {
  const navigate = useNavigate();
  useSwipeBack();
  const storedSession = loadStoredEbdSession();
  const [accessLevel, setAccessLevel] = useState<AccessLevel | null>(storedSession?.accessLevel ?? null);
  const [loginStep, setLoginStep] = useState<LoginStep>('profile');
  const [selectedProfile, setSelectedProfile] = useState<'admin' | 'professor' | null>(storedSession?.accessLevel ?? null);
  const [loading, setLoading] = useState(false);
  const [pinError, setPinError] = useState(false);
  const [pendingPin, setPendingPin] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [adminPin, setAdminPin] = useState(storedSession?.adminPin ?? '');
  const [birthdayAiToken, setBirthdayAiToken] = useState(storedSession?.birthdayAiToken ?? '');
  const [birthdayAiExpiresAt, setBirthdayAiExpiresAt] = useState(storedSession?.birthdayAiExpiresAt ?? '');
  const [aiReauthOpen, setAiReauthOpen] = useState(false);
  const [classes, setClasses] = useState<EbdClass[]>([]);
  const [activeStudents, setActiveStudents] = useState<EbdStudent[]>([]);
  const [allStudents, setAllStudents] = useState<EbdStudent[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [professorNome, setProfessorNome] = useState(storedSession?.professorNome ?? '');
  const [professorClassId, setProfessorClassId] = useState<string | null>(storedSession?.professorClassId ?? null);
  const [dayIsClosed, setDayIsClosed] = useState(false);
  const [closureId, setClosureId] = useState<string | null>(null);
  const [visitorCount, setVisitorCount] = useState(0);
  const [classVisitors, setClassVisitors] = useState<Record<string, VisitorEntry[]>>({});
  const [currentView, setCurrentView] = useState<CurrentView>('home');
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const { weekBirthdays, todayBirthdays } = useBirthdays(supabase, `ebd-${accessLevel}-${professorClassId}-${birthdayAiExpiresAt}`);
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
      const { data, error } = await supabase.functions.invoke('manage-ebd-class-password', {
        body: { action: 'birthday-ai-session', admin_pin: pin },
      });

      if (!error && data?.success && data.birthday_ai_token && data.session) {
        const accepted = await supabase.auth.setSession(data.session);
        if (accepted.error) { toast.error('Não foi possível entrar.'); setLoading(false); return; }
        setAccessLevel('admin');
        setAdminPin(pin);
        setBirthdayAiToken(data.birthday_ai_token);
        setBirthdayAiExpiresAt(data.birthday_ai_expires_at);
        try {
          sessionStorage.setItem(EBD_SESSION_KEY, JSON.stringify({
            accessLevel: 'admin',
            birthdayAiToken: data.birthday_ai_token, birthdayAiExpiresAt: data.birthday_ai_expires_at,
          }));
        } catch { /* ignore */ }
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

    if (error || !data?.success || !data.session) {
      toast.error((data as any)?.error || 'Senha da sala incorreta');
      setPendingPin('');
      setLoginStep('pin');
      return;
    }
    const accepted = await supabase.auth.setSession(data.session);
    if (accepted.error) { toast.error('Não foi possível entrar.'); return; }
    setProfessorNome(data.teacher.name);
    setProfessorClassId(data.teacher.class_id);
    setBirthdayAiToken(data.birthday_ai_token ?? '');
    setBirthdayAiExpiresAt(data.birthday_ai_expires_at ?? '');
    setPendingPin('');
    setAccessLevel('professor');
    try {
      sessionStorage.setItem(EBD_SESSION_KEY, JSON.stringify({
        accessLevel: 'professor',
        professorNome: data.teacher.name,
        professorClassId: data.teacher.class_id,
        birthdayAiToken: data.birthday_ai_token,
        birthdayAiExpiresAt: data.birthday_ai_expires_at,
      }));
    } catch { /* ignore */ }
  };

  const refreshBirthdaySession = async (pin: string) => {
    setLoading(true);
    try {
      const { data, error } = accessLevel === 'admin'
        ? await supabase.functions.invoke('manage-ebd-class-password', { body: { action: 'birthday-ai-session', admin_pin: pin } })
        : await supabase.functions.invoke('ebd-class-login', { body: { pin, name: professorNome } });
      if (error || !data?.success || !data.birthday_ai_token ||
          (accessLevel === 'professor' && data.teacher?.class_id !== professorClassId)) {
        let message = 'Confira o PIN do seu acesso atual.';
        try { const details = await error?.context?.clone().json(); if (details?.error) message = details.error; } catch { /* fallback */ }
        throw new Error(message);
      }
      if (!data.session) throw new Error('Não foi possível renovar o acesso.');
      const accepted = await supabase.auth.setSession(data.session);
      if (accepted.error) throw accepted.error;
      setBirthdayAiToken(data.birthday_ai_token);
      setBirthdayAiExpiresAt(data.birthday_ai_expires_at);
      try {
        sessionStorage.setItem(EBD_SESSION_KEY, JSON.stringify({
          accessLevel,
          professorNome, professorClassId,
          birthdayAiToken: data.birthday_ai_token, birthdayAiExpiresAt: data.birthday_ai_expires_at,
        }));
      } catch { /* session remains in memory */ }
      if (accessLevel === 'admin') setAdminPin(pin);
      setAiReauthOpen(false);
      toast.success('PIN confirmado. Toque em Gerar com IA para continuar.');
    } catch (error) {
      setPinError(true);
      toast.error(error instanceof Error ? error.message : 'Não foi possível validar o acesso.');
      setTimeout(() => setPinError(false), 600);
    } finally { setLoading(false); }
  };

  const handleBack = () => {
    setLoginStep('profile');
    setSelectedProfile(null);
    setPinError(false);
    setPendingPin('');
    setNameInput('');
  };

  const fetchData = useCallback(async () => {
    const { data: authorized, error: sessionError } = await supabase.rpc('ebd_session_valid' as any);
    if (sessionError || !authorized) {
      setAiReauthOpen(true);
      return;
    }
    const [classesRes, activeStudentsRes, allStudentsRes, attendanceRes, closureRes, visitorEntriesRes] = await Promise.all([
      supabase.from('ebd_classes').select('*').eq('active', true).order('order_index'),
      supabase.from('ebd_students').select('*').eq('active', true).order('name'),
      supabase.from('ebd_students').select('*').order('name'),
      supabase.from('ebd_attendance').select('*').eq('date', sundayDate),
      supabase.rpc('ebd_closure' as any, { p_date: sundayDate }),
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
  }, [accessLevel, fetchData, birthdayAiExpiresAt]);

  useEffect(() => {
    if (!accessLevel || !birthdayAiExpiresAt) return;
    const remaining = Date.parse(birthdayAiExpiresAt) - Date.now();
    const timer = window.setTimeout(() => setAiReauthOpen(true), Math.max(0, remaining));
    return () => window.clearTimeout(timer);
  }, [accessLevel, birthdayAiExpiresAt]);

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

  const reauthDialog = (
<Dialog open={aiReauthOpen} onOpenChange={setAiReauthOpen}>
            <DialogContent className="max-h-[90dvh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Confirmar acesso</DialogTitle>
                <DialogDescription>Digite novamente o PIN do seu acesso. Seus dados preenchidos continuam na tela.</DialogDescription>
              </DialogHeader>
              <PinPad
                embedded
                profileLabel={accessLevel === 'admin' ? 'Administrador' : 'Senha da sala'}
                onBack={() => setAiReauthOpen(false)}
                onComplete={refreshBirthdaySession}
                loading={loading}
                error={pinError}
              />
            </DialogContent>
          </Dialog>
  );

  // Login screens
  if (!accessLevel) {
    if (loginStep === 'profile') {
      return <ProfileSelect onSelect={handleProfileSelect} onBack={() => navigate('/auth', { replace: true, state: { skipSplash: true } })} />;
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
    void supabase.auth.signOut({ scope: 'local' });
    setClasses([]); setActiveStudents([]); setAllStudents([]); setAttendance([]); setClassVisitors({});
    setShowExitConfirm(false);
    try {
      sessionStorage.removeItem(EBD_SESSION_KEY);
    } catch { /* ignore */ }
    setAccessLevel(null);
    setLoginStep('profile');
    setSelectedProfile(null);
    setAdminPin('');
    setBirthdayAiToken('');
    setBirthdayAiExpiresAt('');
    setAiReauthOpen(false);
    setCurrentView('home');
    setProfessorClassId(null);
    setProfessorNome('');
    navigate('/auth', { replace: true, state: { skipSplash: true } });
  };

  const handleBackToHome = () => {
    setCurrentView('home');
  };

  // Calculate stats for home cards
  const presentCount = attendance.filter(a => a.present && a.date === sundayDate).length;
  const totalCount = visibleActiveStudents.length;

  // Home view with cards
  if (currentView === 'home') {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--secondary)/0.55)_100%)]">
        <div className="sticky top-0 z-20 border-b border-white/70 bg-white/85 px-3 py-2.5 shadow-sm backdrop-blur-xl safe-top">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <button
                onClick={() => navigate('/auth', { replace: true, state: { skipSplash: true } })}
                aria-label="Voltar"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-extrabold leading-tight text-slate-950">Secretaria EBD</h1>
                <p className="truncate text-xs font-medium text-slate-500">{formattedDate}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge className={isAdmin ? 'rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground' : 'rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700'}>
                {profileLabel}
              </Badge>
              <button
                onClick={handleExitApp}
                className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition hover:bg-red-50 hover:text-destructive"
                title="Sair da Secretaria"
              >
                <LogOut className="h-[18px] w-[18px]" />
              </button>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-3xl space-y-4 p-3 pb-8 sm:p-4">
          <section className="overflow-hidden rounded-[28px] border border-emerald-200/70 bg-[linear-gradient(135deg,#006a53_0%,#118463_100%)] p-4 text-white shadow-[0_16px_40px_rgba(5,74,57,0.18)]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-50/75">Resumo do domingo</p>
                <h2 className="mt-2 text-2xl font-extrabold leading-tight">Escola Dominical</h2>
                <p className="mt-1 text-sm font-medium text-emerald-50/85">{formattedDate}</p>
              </div>
              <div className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${dayIsClosed ? 'bg-white text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                {dayIsClosed ? 'Dia fechado' : 'Em andamento'}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-white/12 p-3 backdrop-blur">
                <p className="text-xs font-medium text-emerald-50/75">Presença</p>
                <p className="mt-1 text-3xl font-black leading-none">{presentCount}<span className="text-lg font-bold text-emerald-50/70">/{totalCount}</span></p>
              </div>
              <div className="rounded-2xl bg-white/12 p-3 backdrop-blur">
                <p className="text-xs font-medium text-emerald-50/75">Visitantes</p>
                <p className="mt-1 text-3xl font-black leading-none">{visitorCount}</p>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-2 gap-2">
            <SecretariaMetric
              label="Alunos ativos"
              value={totalCount}
              hint={`${visibleClasses.length} turma${visibleClasses.length === 1 ? '' : 's'}`}
              icon={Users}
              tone="bg-emerald-50 text-emerald-700"
            />
            <SecretariaMetric
              label="Status"
              value={dayIsClosed ? 'Fechado' : 'Aberto'}
              hint={dayIsClosed ? 'Chamada concluída' : 'Recebendo presença'}
              icon={CheckCircle2}
              tone={dayIsClosed ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}
            />
          </div>

          <WeekAnnouncementCard
            birthdays={allWeekAnnouncements}
            aiToken={birthdayAiToken}
            aiExpiresAt={birthdayAiExpiresAt}
            onAiSessionExpired={() => { setBirthdayAiToken(''); setBirthdayAiExpiresAt(''); setAiReauthOpen(true); }}
          />
          {reauthDialog}

          <section className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <div>
                <h2 className="text-base font-extrabold text-slate-950">Acesso rápido</h2>
                <p className="text-xs text-slate-500">Escolha o que deseja gerenciar agora</p>
              </div>
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>

            <div className="grid gap-2">
              <SecretariaMenuCard
                title="Chamada"
                description="Registrar presenças, visitantes e fechar o domingo."
                icon={ClipboardList}
                tone="bg-emerald-50 text-emerald-700"
                onClick={() => setCurrentView('chamada')}
              />

              {isAdmin && (
                <>
                  <SecretariaMenuCard
                    title="Histórico"
                    description="Acompanhar frequência, médias e relatórios anteriores."
                    icon={BarChart3}
                    tone="bg-sky-50 text-sky-600"
                    onClick={() => setCurrentView('historico')}
                  />
                  <SecretariaMenuCard
                    title="Aniversariantes"
                    description="Consultar, cadastrar e gerar comunicados da semana."
                    icon={Cake}
                    tone="bg-pink-50 text-pink-600"
                    onClick={() => setCurrentView('aniversariantes')}
                  />
                  <SecretariaMenuCard
                    title="Turmas"
                    description="Organizar classes, professores e alunos da EBD."
                    icon={Settings2}
                    tone="bg-amber-50 text-amber-600"
                    onClick={() => setCurrentView('turmas')}
                  />
                  <SecretariaMenuCard
                    title="Planilha de Alunos"
                    description="Visualizar e atualizar a base de alunos cadastrados."
                    icon={TableProperties}
                    tone="bg-teal-50 text-teal-600"
                    onClick={() => setCurrentView('planilha')}
                  />
                  <SecretariaMenuCard
                    title="Configurações"
                    description="Ajustar regras, PINs e preferências da secretaria."
                    icon={UserCheck}
                    tone="bg-indigo-50 text-indigo-600"
                    onClick={() => setCurrentView('configuracoes')}
                  />
                  <SecretariaMenuCard
                    title="Acessos"
                    description="Consultar entradas, professores e registros de acesso."
                    icon={UserCheck}
                    tone="bg-rose-50 text-rose-600"
                    onClick={() => setCurrentView('acessos')}
                  />
                </>
              )}
            </div>
          </section>
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

      {reauthDialog}
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

        {currentView === 'historico' && isAdmin && (
          <HistoricoTab classes={visibleClasses} students={visibleActiveStudents} accessLevel={accessLevel!} onRefreshParent={fetchData} />
        )}

        {currentView === 'turmas' && isAdmin && (
          <TurmasTab
            classes={classes}
            allStudents={allStudents}
            onRefresh={fetchData}
          />
        )}

        {currentView === 'aniversariantes' && isAdmin && (
          <SecretariaAniversariantes onSessionExpired={() => setAiReauthOpen(true)} />
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
