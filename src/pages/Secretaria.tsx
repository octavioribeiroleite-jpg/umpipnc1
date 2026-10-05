import { useEbdAttendanceQueue } from '@/hooks/useEbdAttendanceQueue';
import { assertEbdSnapshotCurrent, captureEbdSnapshot } from '@/lib/ebd-attendance-queue';
import { EbdNavigationContext, useSecretariaNavigation } from '@/hooks/useEbdNavigation';
import { loadStoredEbdSession, saveStoredEbdSession, clearStoredEbdSession } from '@/lib/ebd-session-storage';
import { closeEbdDay, reopenEbdDay, setEbdCallStatus } from '@/lib/ebd-day';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/ebd-client';
import {
  Download,
  ArrowLeft,
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
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import './secretaria-home.css';
import './secretaria-theme.css';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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

function SecretariaMenuCard({ title, description, icon: Icon, onClick }: {
  title: string;
  description: string;
  icon: typeof Users;
  onClick: () => void;
}) {
  return (
    <button type="button" className="ebd-menu-card" onClick={onClick}>
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
  const [loginStep, setLoginStep] = useState<LoginStep>('profile');
  const [selectedProfile, setSelectedProfile] = useState<'admin' | 'professor' | null>(storedSession?.accessLevel ?? null);
  const [loading, setLoading] = useState(false);
  const [pinError, setPinError] = useState(false);
  const [pendingPin, setPendingPin] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [adminPin, setAdminPin] = useState('');
  const [birthdayAiToken, setBirthdayAiToken] = useState(storedSession?.birthdayAiToken ?? '');
  const [birthdayAiExpiresAt, setBirthdayAiExpiresAt] = useState(storedSession?.birthdayAiExpiresAt ?? '');
  const [aiReauthOpen, setAiReauthOpen] = useState(false);
  const [classes, setClasses] = useState<EbdClass[]>([]);
  const [activeStudents, setActiveStudents] = useState<EbdStudent[]>([]);
  const [allStudents, setAllStudents] = useState<EbdStudent[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [callStatuses, setCallStatuses] = useState<Record<string, 'aberta' | 'finalizada'>>({});
  const [professorNome, setProfessorNome] = useState(storedSession?.professorNome ?? '');
  const [professorClassId, setProfessorClassId] = useState<string | null>(storedSession?.professorClassId ?? null);
  const [dayIsClosed, setDayIsClosed] = useState(false);
  const [closureId, setClosureId] = useState<string | null>(null);
  const [visitorCount, setVisitorCount] = useState(0);
  const [classVisitors, setClassVisitors] = useState<Record<string, VisitorEntry[]>>({});
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const navigation = useSecretariaNavigation(accessLevel ? `${accessLevel}:${professorClassId || ''}` : null,
    () => setShowExitConfirm(true),
    () => { if (showExitConfirm) { if (!signingOut) setShowExitConfirm(false); return true; } if (aiReauthOpen) return true; return false; });
  const currentView = navigation.screen.view;
  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: "instant" }); }, [navigation.screen]);
  const setCurrentView = (view: CurrentView) => navigation.open({ view });
  const { weekBirthdays, todayBirthdays, isLoading: birthdaysLoading } = useBirthdays(supabase, `ebd-${accessLevel}-${professorClassId}-${birthdayAiExpiresAt}`);
  const allWeekAnnouncements = [
    ...todayBirthdays.map(b => ({ ...b, daysUntil: 0 })),
    ...weekBirthdays,
  ];

  const sundayDate = getTodayDate();
  const dataScope = `${accessLevel}-${professorClassId}-${birthdayAiExpiresAt}-${sundayDate}`;
  const dataScopeRef = useRef(dataScope);
  dataScopeRef.current = dataScope;
  const { queue: attendanceQueue } = useEbdAttendanceQueue(dataScope, setAttendance);
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
      saveStoredEbdSession({
        accessLevel: 'professor',
        professorNome: data.teacher.name,
        professorClassId: data.teacher.class_id,
        birthdayAiToken: data.birthday_ai_token,
        birthdayAiExpiresAt: data.birthday_ai_expires_at,
      });
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
    } finally { setLoading(false); }
  };

  const handleBack = () => {
    setLoginStep('profile');
    setSelectedProfile(null);
    setPinError(false);
    setPendingPin('');
    setNameInput('');
  };

  const readData = useCallback(async () => {
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
    const [classesRes, activeStudentsRes, allStudentsRes, attendanceRes, closureRes, visitorEntriesRes, statusRes] = await Promise.all([
      supabase.from('ebd_classes').select('*').eq('active', true).order('order_index'),
      supabase.from('ebd_students').select('*').eq('active', true).order('name'),
      supabase.from('ebd_students').select('*').order('name'),
      supabase.from('ebd_attendance').select('*').eq('date', sundayDate),
      supabase.rpc('ebd_closure' as any, { p_date: sundayDate }),
      (supabase.from('ebd_class_visitor_entries' as any).select('id, class_id, name').eq('date', sundayDate)),
      supabase.from('ebd_call_status' as any).select('class_id, status').eq('date', sundayDate),
    ]);

    if (scope !== dataScopeRef.current) throw new Error('Acesso alterado durante a atualização.');
    const readError = [classesRes, activeStudentsRes, allStudentsRes, attendanceRes, closureRes, visitorEntriesRes, statusRes].find(result => result.error)?.error;
    if (readError) throw readError;
    assertEbdSnapshotCurrent(snapshotVersion);
    setCallStatuses(Object.fromEntries((statusRes.data || []).map((row: any) => [row.class_id, row.status])));

    if (classesRes.data) setClasses(classesRes.data);
    if (activeStudentsRes.data) setActiveStudents(activeStudentsRes.data);
    if (allStudentsRes.data) setAllStudents(allStudentsRes.data);
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
      setVisitorCount((closureRes.data as any).visitor_count ?? 0);
    } else {
      setDayIsClosed(false);
      setClosureId(null);
      setVisitorCount(totalV);
    }
    return { classes: classesRes.data || [], activeStudents: activeStudentsRes.data || [], attendance: attendanceRes.data || [], classVisitors: cvMap };
  }, [sundayDate, attendanceQueue]);

  const { refresh: fetchData, lastSynced, syncError, syncing } = useEbdSync(
    !!accessLevel && !aiReauthOpen,
    dataScope,
    readData,
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
    const cleanName = name?.trim() || null;
    const { data, error } = await (supabase.from('ebd_class_visitor_entries' as any)
      .insert({ class_id: classId, date: sundayDate, name: cleanName, marked_by: professorNome || 'Administrador' })
      .select('id, class_id, name')
      .single() as any);
    if (error || !data) {
      await reportEbdWriteError(error, 'Erro ao adicionar visitante');
      throw new Error('Visitante não foi salvo.');
    }
    notifyEbdChange();
    setClassVisitors(prev => {
      const list = prev[classId] ? [...prev[classId]] : [];
      list.push({ id: data.id, name: data.name ?? null });
      const next = { ...prev, [classId]: list };
      setVisitorCount(Object.values(next).reduce((s, l) => s + l.length, 0));
      return next;
    });
  }, [sundayDate, professorNome]);

  const handleRemoveClassVisitor = useCallback(async (classId: string, entryId: string) => {
    const { data, error } = await (supabase.from('ebd_class_visitor_entries' as any).delete().eq('id', entryId).select('id').single() as any);
    if (error || !data) {
      await reportEbdWriteError(error, 'Erro ao remover visitante');
      return;
    }
    notifyEbdChange();
    setClassVisitors(prev => {
      const list = (prev[classId] || []).filter(v => v.id !== entryId);
      const next = { ...prev, [classId]: list };
      setVisitorCount(Object.values(next).reduce((s, l) => s + l.length, 0));
      return next;
    });
  }, []);

  const handleCloseDay = async () => {
    await closeEbdDay(sundayDate);
    await fetchData();
    toast.success('Dia fechado com sucesso!');
  };

  const handleCallStatusChange = async (classId: string, status: 'aberta' | 'finalizada') => {
    await setEbdCallStatus(sundayDate, classId, status, professorNome || 'Administrador');
    setCallStatuses(previous => ({ ...previous, [classId]: status }));
  };

  const handleReopenDay = async () => {
    if (!closureId) return;
    await reopenEbdDay(sundayDate, closureId);
    await fetchData();
    toast.success('Dia reaberto!');
  };
  const reauthDialog = (
<Dialog open={aiReauthOpen} onOpenChange={setAiReauthOpen}>
            <DialogContent className="ebd-reauth">
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
      return <ProfileSelect onSelect={handleProfileSelect} onBack={() => navigate('/auth', { replace: true, state: { skipSplash: true } })} />;
    }

    if (loginStep === 'name') {
      return (
        <div className="min-h-[100dvh] flex items-center justify-center bg-background px-4 py-6 safe-top safe-bottom">
          <div className="w-full max-w-sm mx-auto space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="flex flex-col items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => { setLoginStep('pin'); setPendingPin(''); }} className="self-start shrink-0" aria-label="Voltar ao PIN">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <UserCheck className="h-7 w-7 text-primary" />
              </div>
              <div className="text-center">
                <h1 className="font-semibold text-2xl tracking-tight">Qual é o seu nome?</h1>
                <p className="text-sm text-muted-foreground">Para registrar quem entrou na sala</p>
              </div>
            </div>
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

  const confirmExit = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try { await supabase.auth.signOut({ scope: 'local' }); }
    catch { /* Explicit logout still clears this device when offline. */ }
    finally { clearStoredEbdSession(); navigation.clear(); }
    setSigningOut(false);
    setClasses([]); setActiveStudents([]); setAllStudents([]); setAttendance([]); setClassVisitors({}); setCallStatuses({});
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
  const presentCount = attendance.filter(a => a.present && a.date === sundayDate).length;
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
        <header className="ebd-header safe-top">
          <div className="ebd-header-inner">
            <button type="button" onClick={navigation.back} aria-label="Voltar" className="ebd-back">
              <ArrowLeft aria-hidden="true" />
            </button>
            <div className="ebd-heading">
              <h1>{viewTitles[currentView]}</h1>
              <p>{profileLabel} · EBD</p>
            </div>
            <HeaderActions showInstall={false} showVersion={false} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" ref={profileButtonRef} aria-label="Menu do usuário" className="ebd-profile"><UserRound aria-hidden="true" /></button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-52">
                <DropdownMenuLabel>{profileLabel}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={handleBackToHome} className="min-h-11 gap-2"><Home className="h-4 w-4" />Menu da Secretaria</DropdownMenuItem>
                {!isInstalled && <DropdownMenuItem onSelect={() => openInstall(profileButtonRef.current ?? undefined)} className="min-h-11 gap-2"><Download className="h-4 w-4" />Instalar aplicativo</DropdownMenuItem>}
                <DropdownMenuItem onSelect={handleExitApp} className="min-h-11 gap-2"><LogOut className="h-4 w-4" />Sair da Secretaria</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
  );

  // Home view with cards
  if (currentView === 'home') {
    return (
      <EbdNavigationContext.Provider value={navigation}><PullToRefresh>
      <div className="ebd-home ebd-app">
        {pageHeader}

        <main className="ebd-content">
          <div className={`ebd-sync ${lastSynced && !syncError && !aiReauthOpen ? 'ebd-sync-ok' : ''}`}>{syncNotice}</div>
          <div className="ebd-overview">
          <section className="ebd-summary ebd-surface" aria-labelledby="ebd-summary-title" aria-busy={!lastSynced && syncing}>
            <div className="ebd-summary-heading">
              <h2 id="ebd-summary-title">Resumo do encontro</h2>
              <span className={`ebd-status ${dayIsClosed ? 'ebd-status-closed' : ''}`}>{!lastSynced ? (syncError ? 'Indisponível' : 'Carregando') : dayIsClosed ? 'Encerrado' : 'Em aberto'}</span>
            </div>
            <p className="ebd-date"><CalendarDays aria-hidden="true" /><span>{format(new Date(`${sundayDate}T12:00:00`), "EEEE, dd 'de' MMM 'de' yyyy", { locale: ptBR })}</span></p>
            <dl className="ebd-metrics">
              <div><dt>Presentes</dt><dd>{lastSynced ? presentCount : '—'}</dd><span>{lastSynced ? `de ${totalCount} alunos` : 'Aguardando dados'}</span></div>
              <div><dt>Visitantes</dt><dd>{lastSynced ? visitorCount : '—'}</dd></div>
              <div><dt>Alunos ativos</dt><dd>{lastSynced ? totalCount : '—'}</dd><span>{lastSynced ? `${visibleClasses.length} turma${visibleClasses.length === 1 ? '' : 's'}` : 'Aguardando dados'}</span></div>
            </dl>
            <p className="ebd-summary-note">{!lastSynced ? 'Aguardando atualização dos dados' : dayIsClosed ? 'Chamada encerrada para este encontro' : 'Encontro aberto para registro de presenças'}</p>
          </section>

          <Button className="ebd-call" onClick={() => setCurrentView('chamada')}><ClipboardList aria-hidden="true" /><span>Abrir chamada</span><ArrowRight aria-hidden="true" /></Button>
          </div>

          {isAdmin && (
            <section className="ebd-section" aria-labelledby="ebd-management-title">
              <h2 id="ebd-management-title">Gestão da EBD</h2>
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
            <section className="ebd-section ebd-administration" aria-labelledby="ebd-admin-title">
              <h2 id="ebd-admin-title">Administração</h2>
              <div className="ebd-surface">
                <button type="button" onClick={() => setCurrentView('configuracoes')}><Settings2 aria-hidden="true" /><span>Configurações</span><ChevronRight aria-hidden="true" /></button>
                <button type="button" onClick={() => setCurrentView('acessos')}><ShieldCheck aria-hidden="true" /><span>Acessos</span><ChevronRight aria-hidden="true" /></button>
              </div>
            </section>
          )}
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
      </PullToRefresh></EbdNavigationContext.Provider>
    );
  }


  return (
    <EbdNavigationContext.Provider value={navigation}><PullToRefresh>
    <SecretariaWorkspace title={viewTitles[currentView]} profileLabel={profileLabel} onBack={navigation.back} onHome={handleBackToHome} onExit={handleExitApp} syncNotice={syncNotice}>
      {reauthDialog}
      <div className={`ebd-view ebd-view-${currentView}`}>
        {currentView === 'chamada' && (
          <ChamadaTab
            classes={visibleClasses}
            students={visibleActiveStudents}
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
    </PullToRefresh></EbdNavigationContext.Provider>
  );
}
