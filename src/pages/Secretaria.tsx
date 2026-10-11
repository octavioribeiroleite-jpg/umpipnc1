import { useEbdAttendanceQueue } from '@/hooks/useEbdAttendanceQueue';
import { assertEbdSnapshotCurrent, captureEbdSnapshot } from '@/lib/ebd-attendance-queue';
import { EbdNavigationContext, useSecretariaNavigation } from '@/hooks/useEbdNavigation';
import { loadStoredEbdSession, saveStoredEbdSession, clearStoredEbdSession } from '@/lib/ebd-session-storage';
import { closeEbdDay, reopenEbdDay, setEbdCallStatus } from '@/lib/ebd-day';
import { buildDayRoster, buildDayClasses, normalizeDayClosure, type DayClosureSummary } from '@/lib/ebd-roster';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/ebd-client';
import {
  Download,
  ArrowRight,
  UserRound,
  ShieldCheck,
  BarChart3,
  Cake,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Home,
  LogOut,
  Plus,
  Settings2,
  UserCheck,
  Users,
} from 'lucide-react';
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
import { AccessShell } from '@/components/auth/AccessShell';
import { APP_HOME_PATH } from '@/lib/app-home';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { WorkspaceHeader } from '@/components/layout/WorkspaceHeader';
import { DashboardWelcome } from '@/components/layout/DashboardWelcome';
import { MetricCard } from '@/components/ui/metric-card';
import { useWorkspaceTheme } from '@/hooks/useWorkspaceTheme';
import './secretaria-home.css';
import './secretaria-theme.css';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { SecretariaNavigation } from '@/components/secretaria/SecretariaNavigation';
import { SecretariaWorkspace } from '@/components/secretaria/SecretariaWorkspace';
import { HeaderActions } from '@/components/layout/HeaderActions';
import { PullToRefresh } from '@/components/layout/PullToRefresh';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useEbdSync } from '@/hooks/useEbdSync';
import { ensureEbdSession, notifyEbdChange, reportEbdWriteError } from '@/lib/ebd-mutations';
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
  active?: boolean;
}

interface EbdStudent {
  id: string;
  class_id: string;
  name: string;
  active: boolean;
  created_at?: string;
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
interface SavedVisitorEntry extends VisitorEntry { class_id: string; date: string }

function getTodayDate(): string {
  const today = new Date();
  return format(today, 'yyyy-MM-dd');
}

function SecretariaMenuCard({ title, description, icon: Icon, onClick }: {
  title: string;
  description: string;
  icon: typeof Users;
  onClick: () => void;
}) {
  return (
    <button type="button" className="ebd-menu-card dashboard-quick-action" onClick={onClick}>
      <span className="ebd-icon"><Icon aria-hidden="true" /></span>
      <span className="ebd-menu-copy"><strong>{title}</strong><span>{description}</span></span>
    </button>
  );
}

// Embedded birthdays component
export function SecretariaAniversariantes({ onSessionExpired }: { onSessionExpired: () => void }) {
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
        onDelete={editingBirthday ? () => {
          setDeletingBirthday(editingBirthday);
          setFormOpen(false);
        } : undefined}
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
  const { isInstalled, open: openInstall } = usePWAInstall();
  const profileButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    document.body.classList.add('ebd-theme');
    return () => document.body.classList.remove('ebd-theme');
  }, []);
  const [storedSession] = useState(loadStoredEbdSession);
  const [accessLevel, setAccessLevel] = useState<AccessLevel | null>(storedSession?.accessLevel ?? null);
  useWorkspaceTheme(Boolean(accessLevel));
  const [loginStep, setLoginStep] = useState<LoginStep>('profile');
  const [selectedProfile, setSelectedProfile] = useState<'admin' | 'professor' | null>(storedSession?.accessLevel ?? null);
  const [loading, setLoading] = useState(false);
  const entryRequestRef = useRef(false);
  const [pinError, setPinError] = useState(false);
  const [pendingPin, setPendingPin] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [adminPin, setAdminPin] = useState('');
  const [birthdayAiToken, setBirthdayAiToken] = useState(storedSession?.birthdayAiToken ?? '');
  const [birthdayAiExpiresAt, setBirthdayAiExpiresAt] = useState(storedSession?.birthdayAiExpiresAt ?? '');
  const [aiReauthOpen, setAiReauthOpen] = useState(() => Boolean(storedSession &&
    (!storedSession.birthdayAiExpiresAt || !(Date.parse(storedSession.birthdayAiExpiresAt) > Date.now()))));
  const [classes, setClasses] = useState<EbdClass[]>([]);
  const [activeStudents, setActiveStudents] = useState<EbdStudent[]>([]);
  const [allStudents, setAllStudents] = useState<EbdStudent[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [callStatuses, setCallStatuses] = useState<Record<string, 'aberta' | 'finalizada'>>({});
  const [professorNome, setProfessorNome] = useState(storedSession?.professorNome ?? '');
  const [professorClassId, setProfessorClassId] = useState<string | null>(storedSession?.professorClassId ?? null);
  const [dayIsClosed, setDayIsClosed] = useState(false);
  const [closureId, setClosureId] = useState<string | null>(null);
  const [closureSummary, setClosureSummary] = useState<DayClosureSummary | null>(null);
  const [visitorCount, setVisitorCount] = useState(0);
  const [classVisitors, setClassVisitors] = useState<Record<string, VisitorEntry[]>>({});
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const navigation = useSecretariaNavigation(accessLevel ? `${accessLevel}:${professorClassId || ''}` : null,
    () => setShowExitConfirm(true),
    () => {
      if (showExitConfirm) { if (!signingOut) setShowExitConfirm(false); return true; }
      if (aiReauthOpen) { handleCancelReauth(); return true; }
      return false;
    });
  const currentView = navigation.screen.view;
  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: "instant" }); }, [navigation.screen]);
  const setCurrentView = (view: CurrentView) => navigation.open({ view });
  const { weekBirthdays, todayBirthdays, isLoading: birthdaysLoading } = useBirthdays(supabase, `ebd-${accessLevel}-${professorClassId}-${birthdayAiExpiresAt}`, {
    enabled: !!accessLevel && !aiReauthOpen,
  });
  const allWeekAnnouncements = [
    ...todayBirthdays.map(b => ({ ...b, daysUntil: 0 })),
    ...weekBirthdays,
  ];

  const sundayDate = getTodayDate();
  const dataScope = `${accessLevel}-${professorClassId}-${birthdayAiExpiresAt}-${sundayDate}`;
  const dataScopeRef = useRef(dataScope);
  dataScopeRef.current = dataScope;
  const visitorMutationRef = useRef(false);
  const dayMutationRef = useRef(false);
  const visitorAttemptRef = useRef<{ key: string; id: string; classId: string; date: string; name: string | null; markedBy: string } | null>(null);
  const { queue: attendanceQueue } = useEbdAttendanceQueue(dataScope, setAttendance);
  const formattedDate = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  const handleProfileSelect = (profile: 'admin' | 'professor') => {
    setSelectedProfile(profile);
    setLoginStep('pin');
  };

  const handlePinComplete = async (pin: string) => {
    if (entryRequestRef.current) return;
    entryRequestRef.current = true;
    setLoading(true);
    try {
      if (selectedProfile === 'admin') {
        const { data, error } = await supabase.functions.invoke('manage-ebd-class-password', {
          body: { action: 'birthday-ai-session', admin_pin: pin },
        });

        if (!error && data?.success && data.birthday_ai_token && data.session) {
          const accepted = await supabase.auth.setSession(data.session);
          if (accepted.error) { toast.error('Não foi possível entrar.'); return; }
          setAccessLevel('admin');
          setAdminPin(pin);
          setBirthdayAiToken(data.birthday_ai_token);
          setBirthdayAiExpiresAt(data.birthday_ai_expires_at);
          try {
            saveStoredEbdSession({
              accessLevel: 'admin',
              birthdayAiToken: data.birthday_ai_token, birthdayAiExpiresAt: data.birthday_ai_expires_at,
            });
          } catch { /* ignore */ }
        } else {
          setPinError(true);
          toast.error('PIN incorreto');
          setTimeout(() => setPinError(false), 600);
        }
        return;
      }

      // Professor: guarda a senha da sala e segue para informar o nome
      setPendingPin(pin);
      setNameInput('');
      setLoginStep('name');
    } catch {
      toast.error('Não foi possível entrar.');
    } finally {
      entryRequestRef.current = false;
      setLoading(false);
    }
  };

  const handleNameSubmit = async () => {
    if (entryRequestRef.current) return;
    if (!nameInput.trim()) {
      toast.error('Informe seu nome');
      return;
    }
    entryRequestRef.current = true;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ebd-class-login', {
        body: { pin: pendingPin, name: nameInput.trim() },
      });

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
        saveStoredEbdSession({
          accessLevel: 'professor',
          professorNome: data.teacher.name,
          professorClassId: data.teacher.class_id,
          birthdayAiToken: data.birthday_ai_token,
          birthdayAiExpiresAt: data.birthday_ai_expires_at,
        });
      } catch { /* ignore */ }
    } catch {
      toast.error('Não foi possível entrar.');
    } finally {
      entryRequestRef.current = false;
      setLoading(false);
    }
  };

  const refreshBirthdaySession = async (pin: string) => {
    if (entryRequestRef.current) return;
    entryRequestRef.current = true;
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
        saveStoredEbdSession({
          accessLevel,
          professorNome, professorClassId,
          birthdayAiToken: data.birthday_ai_token, birthdayAiExpiresAt: data.birthday_ai_expires_at,
        });
      } catch { /* session remains in memory */ }
      if (accessLevel === 'admin') setAdminPin(pin);
      setAiReauthOpen(false);
      toast.success('Acesso renovado. Os dados serão atualizados; repita a operação desejada.');
    } catch (error) {
      setPinError(true);
      toast.error(error instanceof Error ? error.message : 'Não foi possível validar o acesso.');
      setTimeout(() => setPinError(false), 600);
    } finally { entryRequestRef.current = false; setLoading(false); }
  };

  const handleBack = () => {
    if (entryRequestRef.current) return false;
    setLoginStep('profile');
    setSelectedProfile(null);
    setPinError(false);
    setPendingPin('');
    setNameInput('');
  };

  const readData = useCallback(async (onSnapshotStart?: () => void) => {
    const snapshotVersion = captureEbdSnapshot();
    const scope = dataScopeRef.current;
    const attendanceVersion = attendanceQueue.readVersion();
    const { data: authorized, error: sessionError } = await supabase.rpc('ebd_session_valid' as any);
    if (scope !== dataScopeRef.current) throw new Error('Acesso alterado durante a atualização.');
    if (sessionError) throw sessionError;
    if (!authorized) {
      setAiReauthOpen(true);
      throw new Error('Confirme o PIN para atualizar os dados.');
    }
    onSnapshotStart?.();
    const [classesRes, allStudentsRes, attendanceRes, closureRes, visitorEntriesRes, statusRes] = await Promise.all([
      supabase.from('ebd_classes').select('*').order('order_index'),
      supabase.from('ebd_students').select('*').order('name'),
      supabase.from('ebd_attendance').select('*').eq('date', sundayDate),
      supabase.rpc('ebd_closure' as any, { p_date: sundayDate }),
      (supabase.from('ebd_class_visitor_entries' as any).select('id, class_id, name').eq('date', sundayDate)),
      supabase.from('ebd_call_status' as any).select('class_id, status').eq('date', sundayDate),
    ]);

    if (scope !== dataScopeRef.current) throw new Error('Acesso alterado durante a atualização.');
    const readError = [classesRes, allStudentsRes, attendanceRes, closureRes, visitorEntriesRes, statusRes].find(result => result.error)?.error;
    if (readError) throw readError;
    assertEbdSnapshotCurrent(snapshotVersion);
    const dayClosureSummary = normalizeDayClosure(closureRes.data);
    const activeStudentRows = (allStudentsRes.data || []).filter(student => student.active);
    setCallStatuses(Object.fromEntries((statusRes.data || []).map((row: any) => [row.class_id, row.status])));

    if (classesRes.data) setClasses(classesRes.data);
    if (allStudentsRes.data) {
      setActiveStudents(activeStudentRows);
      setAllStudents(allStudentsRes.data);
    }
    if (attendanceRes.data) setAttendance(attendanceQueue.reconcile(attendanceRes.data, attendanceVersion));
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
      setClosureSummary(dayClosureSummary);
      setVisitorCount((closureRes.data as any).visitor_count ?? 0);
    } else {
      setDayIsClosed(false);
      setClosureId(null);
      setClosureSummary(null);
      setVisitorCount(totalV);
    }
    return { classes: classesRes.data || [], activeStudents: activeStudentRows, attendance: attendanceRes.data || [], classVisitors: cvMap };
  }, [sundayDate, attendanceQueue]);

  const { refresh: fetchData, lastSynced, syncError, syncing } = useEbdSync(
    !!accessLevel && !aiReauthOpen,
    dataScope,
    readData,
    { coalesceBeforeSnapshot: true },
  );

  useEffect(() => {
    const expired = () => setAiReauthOpen(true);
    window.addEventListener('ebd-session-expired', expired);
    return () => window.removeEventListener('ebd-session-expired', expired);
  }, []);

  useEffect(() => {
    if (!accessLevel || !birthdayAiExpiresAt) return;
    const remaining = Date.parse(birthdayAiExpiresAt) - Date.now();
    const timer = window.setTimeout(() => setAiReauthOpen(true), Math.max(0, remaining));
    return () => window.clearTimeout(timer);
  }, [accessLevel, birthdayAiExpiresAt]);

  const handleAddClassVisitor = useCallback(async (classId: string, name: string | null) => {
    if (visitorMutationRef.current || dayMutationRef.current) throw new Error('Aguarde a operação da chamada terminar.');
    visitorMutationRef.current = true;
    const scope = dataScopeRef.current;
    const cleanName = name?.trim() || null;
    const markedBy = professorNome || 'Administrador';
    const key = JSON.stringify([classId, sundayDate, cleanName, markedBy]);
    const attempt = visitorAttemptRef.current?.key === key ? visitorAttemptRef.current : {
      key, id: crypto.randomUUID(), classId, date: sundayDate, name: cleanName, markedBy,
    };
    visitorAttemptRef.current = attempt;
    try {
      await ensureEbdSession();
      if (scope !== dataScopeRef.current) throw new Error('Acesso alterado durante a gravação.');
      let data: SavedVisitorEntry | null = null;
      let saveError: unknown;
      try {
        const result = await supabase.from('ebd_class_visitor_entries')
          .insert({ id: attempt.id, class_id: attempt.classId, date: attempt.date, name: attempt.name, marked_by: attempt.markedBy })
          .select('id, class_id, date, name').single();
        data = result.data;
        saveError = result.error;
      } catch (error) { saveError = error; }
      if (scope !== dataScopeRef.current) throw new Error('Acesso alterado durante a gravação.');
      if (saveError || !data) {
        // A lost response does not mean that the insert failed. Reusing this ID
        // makes a retry unique; only an authorized read can confirm the result.
        const confirmed = await supabase.from('ebd_class_visitor_entries')
          .select('id, class_id, date, name').eq('id', attempt.id).eq('class_id', attempt.classId).eq('date', attempt.date).maybeSingle();
        if (confirmed.error || !confirmed.data) throw saveError || confirmed.error || new Error('A confirmação do visitante não foi recebida.');
        data = confirmed.data;
      }
      if (scope !== dataScopeRef.current) throw new Error('Acesso alterado durante a gravação.');
      if (data.id !== attempt.id || data.class_id !== attempt.classId || data.date !== attempt.date || (data.name ?? null) !== attempt.name) {
        throw new Error('O visitante não foi confirmado. Confira a chamada antes de tentar novamente.');
      }
      notifyEbdChange();
      setClassVisitors(prev => {
        const list = (prev[classId] || []).filter(visitor => visitor.id !== data.id);
        const next = { ...prev, [classId]: [...list, { id: data.id, name: data.name ?? null }] };
        setVisitorCount(Object.values(next).reduce((sum, visitors) => sum + visitors.length, 0));
        return next;
      });
      visitorAttemptRef.current = null;
    } catch (error) {
      if (scope === dataScopeRef.current) await reportEbdWriteError(error, 'Erro ao adicionar visitante');
      throw error;
    } finally { visitorMutationRef.current = false; }
  }, [sundayDate, professorNome]);

  const handleRemoveClassVisitor = useCallback(async (classId: string, entryId: string) => {
    if (visitorMutationRef.current || dayMutationRef.current) return;
    visitorMutationRef.current = true;
    const scope = dataScopeRef.current;
    try {
      await ensureEbdSession();
      if (scope !== dataScopeRef.current) return;
      const { data, error } = await supabase.from('ebd_class_visitor_entries')
        .delete().eq('id', entryId).eq('class_id', classId).eq('date', sundayDate).select('id').single();
      if (scope !== dataScopeRef.current) return;
      if (error || !data) throw error || new Error('A remoção do visitante não foi confirmada.');
      notifyEbdChange();
      setClassVisitors(prev => {
        const next = { ...prev, [classId]: (prev[classId] || []).filter(visitor => visitor.id !== entryId) };
        setVisitorCount(Object.values(next).reduce((sum, visitors) => sum + visitors.length, 0));
        return next;
      });
    } catch (error) {
      if (scope === dataScopeRef.current) await reportEbdWriteError(error, 'Erro ao remover visitante');
    } finally { visitorMutationRef.current = false; }
  }, [sundayDate]);

  const handleCloseDay = async () => {
    if (dayMutationRef.current || visitorMutationRef.current) throw new Error('Aguarde a operação da chamada terminar antes de fechar o dia.');
    dayMutationRef.current = true;
    const scope = dataScopeRef.current;
    try {
      await closeEbdDay(sundayDate);
      if (scope !== dataScopeRef.current) return;
      await fetchData();
      if (scope === dataScopeRef.current) toast.success('Dia fechado com sucesso!');
    } finally { dayMutationRef.current = false; }
  };

  const handleCallStatusChange = async (classId: string, status: 'aberta' | 'finalizada') => {
    if (dayMutationRef.current || visitorMutationRef.current) throw new Error('Aguarde a operação da chamada terminar.');
    dayMutationRef.current = true;
    const scope = dataScopeRef.current;
    try {
      await setEbdCallStatus(sundayDate, classId, status, professorNome || 'Administrador');
      if (scope !== dataScopeRef.current) return;
      setCallStatuses(previous => ({ ...previous, [classId]: status }));
    } finally { dayMutationRef.current = false; }
  };

  const handleReopenDay = async () => {
    if (!closureId) return;
    if (dayMutationRef.current || visitorMutationRef.current) throw new Error('Aguarde a operação da chamada terminar antes de reabrir o dia.');
    dayMutationRef.current = true;
    const scope = dataScopeRef.current;
    try {
      await reopenEbdDay(sundayDate, closureId);
      if (scope !== dataScopeRef.current) return;
      await fetchData();
      if (scope === dataScopeRef.current) toast.success('Dia reaberto!');
    } finally { dayMutationRef.current = false; }
  };
  const handleCancelReauth = () => {
    if (loading || entryRequestRef.current) return false;
    // Abandon the expired local access before removing its covering PIN.
    // Successful renewal still keeps the mounted draft and restores focus.
    navigation.clear();
    clearStoredEbdSession();
    setAccessLevel(null);
    setAiReauthOpen(false);
    handleBack();
    navigate(APP_HOME_PATH, { replace: true, state: { skipSplash: true } });
  };
  const reauthDialog = (
    <Dialog open={aiReauthOpen} onOpenChange={(open) => { if (!open) handleCancelReauth(); }}>
      <DialogContent className="ebd-reauth" size="screen" showCloseButton={false}>
        <DialogTitle className="sr-only">Confirmar acesso à Secretaria EBD</DialogTitle>
        <DialogDescription className="sr-only">Digite novamente o PIN do seu acesso. Seus dados preenchidos continuam na tela.</DialogDescription>
        <PinPad
          profileLabel={accessLevel === 'admin' ? 'Secretaria EBD' : 'Secretaria EBD · Professor'}
          reuseEbdHistory
          onBack={handleCancelReauth}
          onHome={handleCancelReauth}
          onComplete={refreshBirthdaySession}
          loading={loading}
          error={pinError}
        />
      </DialogContent>
    </Dialog>
  );

  const syncNotice = (
    <p role="status" className={`px-4 py-2 text-sm ${syncError ? 'text-destructive' : 'text-muted-foreground'}`}>
      {aiReauthOpen ? 'Confirme o PIN para retomar a sincronização.' : syncError
        ? 'Não foi possível atualizar. Confira a conexão; tentaremos novamente.'
        : lastSynced ? `Dados atualizados às ${lastSynced.toLocaleTimeString('pt-BR')}`
        : syncing ? 'Buscando dados da Secretaria...' : 'Aguardando atualização...'}
    </p>
  );

  // Login screens
  if (!accessLevel) {
    if (loginStep === 'profile') {
      return <ProfileSelect onSelect={handleProfileSelect} onBack={() => navigate(APP_HOME_PATH, { replace: true, state: { skipSplash: true } })} />;
    }

    if (loginStep === 'name') {
      return (
        <AccessShell title="Qual é o seu nome?" description="Para registrar quem entrou na sala" headingIcon={UserCheck}
          onBack={() => { setLoginStep('pin'); setPendingPin(''); }} backLabel="Voltar ao PIN" showHome disabled={loading} backDisabled={false}>
          <div className="ipnc-access-form">
            <label className="block space-y-2 text-sm font-medium">Seu nome
            <input
              autoFocus
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && nameInput.trim()) handleNameSubmit(); }}
              placeholder="Seu nome"
              className="w-full h-12 px-3 rounded-xl border border-input bg-background text-base outline-none focus:border-primary"
            />
            </label>
            <Button
              className="w-full h-12 text-base font-semibold gap-2 rounded-xl"
              onClick={handleNameSubmit}
              disabled={loading || !nameInput.trim()}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </div>
        </AccessShell>
      );
    }

    return (
      <PinPad
        profileLabel={selectedProfile === 'admin' ? 'Secretaria EBD' : 'Secretaria EBD · Professor'}
        onBack={handleBack}
        onHome={() => navigate(APP_HOME_PATH, { replace: true, state: { skipSplash: true } })}
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
    ? classes.filter(group => group.active !== false)
    : classes.filter(group => group.active !== false && group.id === professorClassId);
  const visibleActiveStudents = isAdmin
    ? activeStudents
    : activeStudents.filter(s => s.class_id === professorClassId);
  // Attendance retains the class saved for this day and already marked inactive
  // pupils. Enrollment management continues to use the current active roster.
  const dayRoster = buildDayRoster(allStudents, attendance, sundayDate);
  const dayClasses = buildDayClasses(classes, dayRoster, [
    ...Object.keys(callStatuses), ...Object.keys(classVisitors), ...(closureSummary?.class_summary || []).map(group => group.classId),
  ]);
  const visibleAttendanceStudents = isAdmin ? dayRoster : dayRoster.filter(student => student.class_id === professorClassId);
  const visibleAttendanceClasses = isAdmin ? dayClasses : dayClasses.filter(group => group.id === professorClassId);

  const handleExitApp = () => {
    setShowExitConfirm(true);
  };

  const confirmExit = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try { await supabase.auth.signOut({ scope: 'local' }); }
    catch { /* Explicit logout still clears this device when offline. */ }
    finally { clearStoredEbdSession(); navigation.clear(); }
    setSigningOut(false);
    setClasses([]); setActiveStudents([]); setAllStudents([]); setAttendance([]); setClassVisitors({}); setCallStatuses({});
    setClosureSummary(null);
    visitorAttemptRef.current = null;
    setShowExitConfirm(false);
    setAccessLevel(null);
    setLoginStep('profile');
    setSelectedProfile(null);
    setAdminPin('');
    setBirthdayAiToken('');
    setBirthdayAiExpiresAt('');
    setAiReauthOpen(false);
    setProfessorClassId(null);
    setProfessorNome('');
    navigate('/auth', { replace: true, state: { skipSplash: true } });
  };

  const handleBackToHome = () => {
    setCurrentView('home');
  };

  // Calculate stats for home cards
  const closedClassSummary = closureSummary?.class_summary.filter(group => isAdmin || group.classId === professorClassId);
  const presentCount = closedClassSummary ? closedClassSummary.reduce((sum, group) => sum + group.present, 0) : attendance.filter(a => a.present && a.date === sundayDate).length;
  const attendanceTotalCount = closedClassSummary ? closedClassSummary.reduce((sum, group) => sum + group.total, 0) : visibleAttendanceStudents.length;
  const totalCount = visibleActiveStudents.length;

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

  const pageHeader = (
    <WorkspaceHeader title={currentView === 'home' ? undefined : viewTitles[currentView]} mobileTitle="Secretaria EBD" titleAsHeading={currentView !== 'home'} accountName={professorNome || profileLabel} accountRole={`${profileLabel} · EBD`} accountButtonRef={profileButtonRef} onBack={currentView === 'home' ? undefined : navigation.back} actions={<HeaderActions showInstall={false} showVersion={false} />} menu={<>
      <DropdownMenuItem onSelect={handleBackToHome} className="gap-2"><Home className="h-4 w-4" />Menu da Secretaria</DropdownMenuItem>
      {!isInstalled && <DropdownMenuItem onSelect={() => openInstall(profileButtonRef.current ?? undefined)} className="gap-2"><Download className="h-4 w-4" />Instalar aplicativo</DropdownMenuItem>}
      <DropdownMenuItem onSelect={handleExitApp} className="gap-2"><LogOut className="h-4 w-4" />Sair da Secretaria</DropdownMenuItem>
    </>} />
  );

  // Home view with cards
  if (currentView === 'home') {
    return (
      <EbdNavigationContext.Provider value={navigation}><SecretariaNavigation admin={isAdmin} currentView={currentView} onView={setCurrentView} onExit={handleExitApp} profileLabel={professorNome || profileLabel} profileDescription="Secretaria EBD"><PullToRefresh>
      <div className="ebd-home ebd-app ipnc-dashboard ipnc-dashboard-shell">
        {pageHeader}

        <main id="ebd-main" tabIndex={-1} className="ebd-content">
          <DashboardWelcome id="ebd-welcome-title" date={format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR }).replace(/^./, first => first.toUpperCase())} title={<>Secretaria <span>EBD</span></>} description={lastSynced ? `${profileLabel} • ${totalCount} aluno${totalCount === 1 ? '' : 's'} ativo${totalCount === 1 ? '' : 's'}` : `${profileLabel} • Escola Bíblica Dominical`} />
          <div className={`ebd-sync ${lastSynced && !syncError && !aiReauthOpen ? 'ebd-sync-ok' : ''}`}>{syncNotice}</div>
          <div className="dashboard-metrics" aria-label="Indicadores da EBD">
            <MetricCard title="Presentes" value={lastSynced ? presentCount : '—'} description={lastSynced ? `de ${attendanceTotalCount} alunos no encontro` : 'Aguardando dados'} icon={UserCheck} tone="success" className="dashboard-metric" />
            <MetricCard title="Visitantes" value={lastSynced ? visitorCount : '—'} description="Neste encontro" icon={Users} tone="info" className="dashboard-metric dashboard-metric--blue" />
            <MetricCard title="Alunos ativos" value={lastSynced ? totalCount : '—'} description="Cadastros ativos" icon={UserRound} tone="info" className="dashboard-metric dashboard-metric--blue" />
            <MetricCard title="Turmas" value={lastSynced ? visibleClasses.length : '—'} description="Escola Bíblica Dominical" icon={CalendarDays} tone="success" className="dashboard-metric" />
          </div>
          <div className="ebd-home-grid">
          <div className="ebd-overview">
          <section className="ebd-summary ebd-surface dashboard-panel" aria-labelledby="ebd-summary-title" aria-busy={!lastSynced && syncing}>
            <div className="ebd-summary-heading ebd-panel-heading">
              <h2 id="ebd-summary-title">Resumo do encontro</h2>
              <span className={`ebd-status ${dayIsClosed ? 'ebd-status-closed' : ''}`}>{!lastSynced ? (syncError ? 'Indisponível' : 'Carregando') : dayIsClosed ? 'Encerrado' : 'Em aberto'}</span>
            </div>
            <p className="ebd-date"><CalendarDays aria-hidden="true" /><span>{format(new Date(`${sundayDate}T12:00:00`), "EEEE, dd 'de' MMM 'de' yyyy", { locale: ptBR })}</span></p>
            <p className="ebd-summary-note">{!lastSynced ? 'Aguardando atualização dos dados' : dayIsClosed ? 'Chamada encerrada para este encontro' : 'Encontro aberto para registro de presenças'}</p>
          </section>

          <Button className="ebd-call" onClick={() => setCurrentView('chamada')}><ClipboardList aria-hidden="true" /><span>Abrir chamada</span><ArrowRight aria-hidden="true" /></Button>
          </div>

          {isAdmin && (
            <section className="ebd-section ebd-surface dashboard-panel" aria-labelledby="ebd-management-title">
              <div className="ebd-panel-heading"><h2 id="ebd-management-title">Acesso rápido</h2></div>
              <div className="ebd-menu-grid">
                <SecretariaMenuCard title="Turmas" description="Classes e professores" icon={Users} onClick={() => setCurrentView('turmas')} />
                <SecretariaMenuCard title="Alunos" description="Base de cadastros" icon={UserRound} onClick={() => setCurrentView('planilha')} />
                <SecretariaMenuCard title="Histórico" description="Frequência e relatórios" icon={BarChart3} onClick={() => setCurrentView('historico')} />
                <SecretariaMenuCard title="Aniversariantes" description="Datas e comunicados" icon={Cake} onClick={() => setCurrentView('aniversariantes')} />
              </div>
            </section>
          )}

          <WeekAnnouncementCard
            birthdays={allWeekAnnouncements}
            aiToken={birthdayAiToken}
            aiExpiresAt={birthdayAiExpiresAt}
            onAiSessionExpired={() => { setBirthdayAiToken(''); setBirthdayAiExpiresAt(''); setAiReauthOpen(true); }}
            variant="secretaria"
            isLoading={birthdaysLoading}
            onViewAll={isAdmin ? () => setCurrentView('aniversariantes') : undefined}
          />
          {reauthDialog}

          {isAdmin && (
            <section className="ebd-section ebd-administration ebd-surface dashboard-panel" aria-labelledby="ebd-admin-title">
              <div className="ebd-panel-heading"><h2 id="ebd-admin-title">Administração</h2></div>
              <div className="ebd-admin-actions">
                <button type="button" onClick={() => setCurrentView('configuracoes')}><Settings2 aria-hidden="true" /><span>Configurações</span><ChevronRight aria-hidden="true" /></button>
                <button type="button" onClick={() => setCurrentView('acessos')}><ShieldCheck aria-hidden="true" /><span>Acessos</span><ChevronRight aria-hidden="true" /></button>
              </div>
            </section>
          )}
          </div>
        </main>

        <AlertDialog open={showExitConfirm} onOpenChange={open => { if (!signingOut) setShowExitConfirm(open); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sair da Secretaria?</AlertDialogTitle>
              <AlertDialogDescription>
                Você será desconectado e voltará para a tela de login da secretaria.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={signingOut}>Continuar na Secretaria</AlertDialogCancel>
              <AlertDialogAction disabled={signingOut} onClick={event => { event.preventDefault(); void confirmExit(); }}>{signingOut ? 'Saindo…' : 'Sair e voltar ao login'}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      </PullToRefresh></SecretariaNavigation></EbdNavigationContext.Provider>
    );
  }


  return (
    <EbdNavigationContext.Provider value={navigation}><SecretariaNavigation admin={isAdmin} currentView={currentView} onView={setCurrentView} onExit={handleExitApp} profileLabel={professorNome || profileLabel} profileDescription="Secretaria EBD"><PullToRefresh>
    <SecretariaWorkspace title={viewTitles[currentView]} profileLabel={profileLabel} onBack={navigation.back} onHome={handleBackToHome} onExit={handleExitApp} syncNotice={syncNotice} header={pageHeader}>
      {reauthDialog}
      <div className={`ebd-view ebd-view-${currentView}`}>
        {currentView === 'chamada' && (
          <ChamadaTab
            classes={visibleAttendanceClasses}
            students={visibleAttendanceStudents}
            attendance={attendance}
            attendanceQueue={attendanceQueue}
            setAttendance={setAttendance}
            callStatuses={callStatuses}
            onCallStatusChange={handleCallStatusChange}
            attendanceDate={sundayDate}
            formattedDate={formattedDate}
            initialProfessorName={professorNome || undefined}
            accessLevel={accessLevel!}
            dayIsClosed={dayIsClosed}
            closureSummary={closureSummary}
            onCloseDay={handleCloseDay}
            onReopenDay={handleReopenDay}
            classVisitors={classVisitors}
            onAddClassVisitor={handleAddClassVisitor}
            onRemoveClassVisitor={handleRemoveClassVisitor}
          />
        )}

        {currentView === 'historico' && isAdmin && (
          <HistoricoTab sessionScope={dataScope} classes={visibleClasses} students={visibleActiveStudents} accessLevel={accessLevel!} onRefreshParent={fetchData} refreshedAt={lastSynced?.getTime()} />
        )}

        {currentView === 'turmas' && isAdmin && (
          <TurmasTab
            classes={visibleClasses}
            allStudents={allStudents}
            onRefresh={fetchData}
          />
        )}

        {currentView === 'aniversariantes' && isAdmin && (
          <SecretariaAniversariantes onSessionExpired={() => setAiReauthOpen(true)} />
        )}

        {currentView === 'planilha' && isAdmin && (
          <PlanilhaAlunosTab
            classes={visibleClasses}
            allStudents={allStudents}
            onRefresh={fetchData}
            accessLevel={accessLevel!}
          />
        )}

        {currentView === 'configuracoes' && isAdmin && (
          <ConfiguracoesEbdTab classes={visibleClasses} adminPin={adminPin} />
        )}

        {currentView === 'acessos' && isAdmin && (
          <AcessosEbdTab classes={visibleClasses} date={sundayDate} formattedDate={formattedDate} />
        )}
      </div>

      <AlertDialog open={showExitConfirm} onOpenChange={open => { if (!signingOut) setShowExitConfirm(open); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sair da Secretaria?</AlertDialogTitle>
            <AlertDialogDescription>
              Você será desconectado e voltará para a tela de login da secretaria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={signingOut}>Continuar na Secretaria</AlertDialogCancel>
            <AlertDialogAction disabled={signingOut} onClick={event => { event.preventDefault(); void confirmExit(); }}>{signingOut ? 'Saindo…' : 'Sair e voltar ao login'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SecretariaWorkspace>
    </PullToRefresh></SecretariaNavigation></EbdNavigationContext.Provider>
  );
}
