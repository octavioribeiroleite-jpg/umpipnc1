import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClipboardList, BarChart3, Settings2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import ChamadaTab from '@/components/secretaria/ChamadaTab';
import HistoricoTab from '@/components/secretaria/HistoricoTab';
import TurmasTab from '@/components/secretaria/TurmasTab';
import ProfileSelect from '@/components/secretaria/ProfileSelect';
import PinPad from '@/components/secretaria/PinPad';
import { Badge } from '@/components/ui/badge';

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
type LoginStep = 'profile' | 'pin';

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
      setAccessLevel(selectedProfile);
    } else {
      setPinError(true);
      toast.error('PIN incorreto');
      setTimeout(() => setPinError(false), 600);
    }
    setLoading(false);
  };

  const handleBack = () => {
    setLoginStep('profile');
    setSelectedProfile(null);
    setPinError(false);
  };

  const fetchData = useCallback(async () => {
    const [classesRes, activeStudentsRes, allStudentsRes, attendanceRes] = await Promise.all([
      supabase.from('ebd_classes').select('*').eq('active', true).order('order_index'),
      supabase.from('ebd_students').select('*').eq('active', true).order('name'),
      supabase.from('ebd_students').select('*').order('name'),
      supabase.from('ebd_attendance').select('*').eq('date', sundayDate),
    ]);

    if (classesRes.data) setClasses(classesRes.data);
    if (activeStudentsRes.data) setActiveStudents(activeStudentsRes.data);
    if (allStudentsRes.data) setAllStudents(allStudentsRes.data);
    if (attendanceRes.data) setAttendance(attendanceRes.data);
  }, [sundayDate]);

  useEffect(() => {
    if (accessLevel) fetchData();
  }, [accessLevel, fetchData]);

  // Login screens
  if (!accessLevel) {
    if (loginStep === 'profile') {
      return <ProfileSelect onSelect={handleProfileSelect} />;
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
            />
          </TabsContent>

          <TabsContent value="historico">
            <HistoricoTab classes={classes} students={activeStudents} />
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
