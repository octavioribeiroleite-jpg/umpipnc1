import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClipboardList, BarChart3, Settings2, ArrowLeft, UserCheck } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import ChamadaTab from '@/components/secretaria/ChamadaTab';
import HistoricoTab from '@/components/secretaria/HistoricoTab';
import TurmasTab from '@/components/secretaria/TurmasTab';
import ProfileSelect from '@/components/secretaria/ProfileSelect';
import PinPad from '@/components/secretaria/PinPad';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
type LoginStep = 'profile' | 'pin' | 'name-confirm' | 'name-input';

const PROFESSOR_NAME_KEY = 'ebd_professor_name';

function getTodayDate(): string {
  const today = new Date();
  return format(today, 'yyyy-MM-dd');
}

export default function Secretaria() {
  const [accessLevel, setAccessLevel] = useState<AccessLevel | null>(null);
  const [loginStep, setLoginStep] = useState<LoginStep>('profile');
  const [selectedProfile, setSelectedProfile] = useState<'admin' | 'professor' | null>(null);
  const [loading, setLoading] = useState(false);
  const [pinError, setPinError] = useState(false);
  const [classes, setClasses] = useState<EbdClass[]>([]);
  const [activeStudents, setActiveStudents] = useState<EbdStudent[]>([]);
  const [allStudents, setAllStudents] = useState<EbdStudent[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [professorNome, setProfessorNome] = useState('');
  const [savedProfessorName, setSavedProfessorName] = useState<string | null>(null);
  const [dayIsClosed, setDayIsClosed] = useState(false);
  const [closureId, setClosureId] = useState<string | null>(null);

  const sundayDate = getTodayDate();
  const formattedDate = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  const handleProfileSelect = (profile: 'admin' | 'professor') => {
    setSelectedProfile(profile);
    setLoginStep('pin');
  };

  const handlePinComplete = async (pin: string) => {
    setLoading(true);
    const settingKey = selectedProfile === 'admin'
      ? 'secretaria_admin_password'
      : 'secretaria_professor_password';

    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', settingKey)
      .single();

    if (data && data.value === pin) {
      if (selectedProfile === 'professor') {
        const saved = localStorage.getItem(PROFESSOR_NAME_KEY);
        if (saved) {
          setSavedProfessorName(saved);
          setLoginStep('name-confirm');
        } else {
          setLoginStep('name-input');
        }
      } else {
        setAccessLevel(selectedProfile);
      }
    } else {
      setPinError(true);
      toast.error('PIN incorreto');
      setTimeout(() => setPinError(false), 600);
    }
    setLoading(false);
  };

  const handleConfirmName = () => {
    setProfessorNome(savedProfessorName!);
    setAccessLevel('professor');
  };

  const handleDifferentPerson = () => {
    setSavedProfessorName(null);
    setProfessorNome('');
    setLoginStep('name-input');
  };

  const handleSaveName = () => {
    if (!professorNome.trim()) return;
    localStorage.setItem(PROFESSOR_NAME_KEY, professorNome.trim());
    setProfessorNome(professorNome.trim());
    setAccessLevel('professor');
  };

  const handleBack = () => {
    if (loginStep === 'name-confirm' || loginStep === 'name-input') {
      setLoginStep('pin');
      setSavedProfessorName(null);
      setProfessorNome('');
      return;
    }
    setLoginStep('profile');
    setSelectedProfile(null);
    setPinError(false);
  };

  const fetchData = useCallback(async () => {
    const [classesRes, activeStudentsRes, allStudentsRes, attendanceRes, closureRes] = await Promise.all([
      supabase.from('ebd_classes').select('*').eq('active', true).order('order_index'),
      supabase.from('ebd_students').select('*').eq('active', true).order('name'),
      supabase.from('ebd_students').select('*').order('name'),
      supabase.from('ebd_attendance').select('*').eq('date', sundayDate),
      supabase.from('ebd_day_closures').select('*').eq('date', sundayDate).maybeSingle(),
    ]);

    if (classesRes.data) setClasses(classesRes.data);
    if (activeStudentsRes.data) setActiveStudents(activeStudentsRes.data);
    if (allStudentsRes.data) setAllStudents(allStudentsRes.data);
    if (attendanceRes.data) setAttendance(attendanceRes.data);
    if (closureRes.data) {
      setDayIsClosed(true);
      setClosureId(closureRes.data.id);
    } else {
      setDayIsClosed(false);
      setClosureId(null);
    }
  }, [sundayDate]);

  useEffect(() => {
    if (accessLevel) fetchData();
  }, [accessLevel, fetchData]);

  const handleCloseDay = async () => {
    // Build class summary
    const classSummary = classes.map(cls => {
      const classStudents = activeStudents.filter(s => s.class_id === cls.id);
      const classAttendance = attendance.filter(a => a.class_id === cls.id && a.date === sundayDate);
      const present = classAttendance.filter(a => a.present).length;
      const total = classStudents.length;
      return {
        classId: cls.id,
        className: cls.name,
        total,
        present,
        percentage: total > 0 ? Math.round((present / total) * 100) : 0,
      };
    });

    const totalStudents = activeStudents.length;
    const presentStudents = attendance.filter(a => a.present && a.date === sundayDate).length;

    const { error } = await supabase
      .from('ebd_day_closures')
      .insert({
        date: sundayDate,
        closed_by: professorNome || 'Administrador',
        total_students: totalStudents,
        present_students: presentStudents,
        class_summary: classSummary,
      });

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
      return <ProfileSelect onSelect={handleProfileSelect} />;
    }

    if (loginStep === 'name-confirm' && savedProfessorName) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-sm">
            <CardContent className="pt-6 space-y-5">
              <div className="text-center space-y-3">
                <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserCheck className="h-8 w-8 text-primary" />
                </div>
                <h2 className="font-semibold text-lg">Você é</h2>
                <p className="text-2xl font-bold text-primary">{savedProfessorName}?</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={handleDifferentPerson}>
                  Não sou eu
                </Button>
                <Button onClick={handleConfirmName}>
                  Sim, sou eu!
                </Button>
              </div>
              <Button variant="ghost" size="sm" className="w-full text-xs" onClick={handleBack}>
                <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Voltar
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (loginStep === 'name-input') {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-sm">
            <CardContent className="pt-6 space-y-5">
              <div className="text-center space-y-2">
                <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserCheck className="h-7 w-7 text-primary" />
                </div>
                <h2 className="font-semibold text-lg">Qual o seu nome?</h2>
                <p className="text-sm text-muted-foreground">Informe seu nome completo para registro</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="professor-nome">Nome completo</Label>
                <Input
                  id="professor-nome"
                  placeholder="Digite seu nome completo"
                  value={professorNome}
                  onChange={(e) => setProfessorNome(e.target.value)}
                  autoFocus
                />
              </div>
              <Button className="w-full" disabled={!professorNome.trim()} onClick={handleSaveName}>
                Continuar
              </Button>
              <Button variant="ghost" size="sm" className="w-full text-xs" onClick={handleBack}>
                <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Voltar
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <PinPad
        profileLabel={selectedProfile === 'admin' ? 'Administrador' : 'Professor'}
        onBack={handleBack}
        onComplete={handlePinComplete}
        loading={loading}
        error={pinError}
      />
    );
  }

  const isAdmin = accessLevel === 'admin';
  const profileLabel = isAdmin ? 'Administrador' : 'Professor';

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-semibold text-lg">Secretaria EBD</h1>
            <p className="text-xs text-muted-foreground">{formattedDate}</p>
          </div>
          <Badge variant={isAdmin ? 'default' : 'secondary'} className="text-xs">
            {profileLabel}
          </Badge>
        </div>
      </div>

      <div className="p-4 pb-8">
        <Tabs defaultValue="chamada" className="w-full">
          <TabsList className={`w-full grid ${isAdmin ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <TabsTrigger value="chamada" className="flex items-center gap-1.5 text-xs">
              <ClipboardList className="h-3.5 w-3.5" /> Chamada
            </TabsTrigger>
            <TabsTrigger value="historico" className="flex items-center gap-1.5 text-xs">
              <BarChart3 className="h-3.5 w-3.5" /> Histórico
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="turmas" className="flex items-center gap-1.5 text-xs">
                <Settings2 className="h-3.5 w-3.5" /> Turmas
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="chamada">
            <ChamadaTab
              classes={classes}
              students={activeStudents}
              attendance={attendance}
              setAttendance={setAttendance}
              attendanceDate={sundayDate}
              formattedDate={formattedDate}
              initialProfessorName={professorNome || undefined}
              accessLevel={accessLevel!}
              dayIsClosed={dayIsClosed}
              onCloseDay={handleCloseDay}
              onReopenDay={handleReopenDay}
            />
          </TabsContent>

          <TabsContent value="historico">
            <HistoricoTab classes={classes} students={activeStudents} accessLevel={accessLevel!} onRefreshParent={fetchData} />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="turmas">
              <TurmasTab
                classes={classes}
                allStudents={allStudents}
                onRefresh={fetchData}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
