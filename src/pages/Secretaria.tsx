import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Lock, ClipboardList, BarChart3, Settings2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import ChamadaTab from '@/components/secretaria/ChamadaTab';
import HistoricoTab from '@/components/secretaria/HistoricoTab';
import TurmasTab from '@/components/secretaria/TurmasTab';

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

function getSundayDate(): string {
  const today = new Date();
  const day = today.getDay();
  const diff = day === 0 ? 0 : day;
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - diff);
  return format(sunday, 'yyyy-MM-dd');
}

export default function Secretaria() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<EbdClass[]>([]);
  const [activeStudents, setActiveStudents] = useState<EbdStudent[]>([]);
  const [allStudents, setAllStudents] = useState<EbdStudent[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);

  const sundayDate = getSundayDate();
  const formattedDate = format(new Date(sundayDate + 'T12:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  const handleLogin = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'secretaria_password')
      .single();

    if (data && data.value === password) {
      setAuthenticated(true);
    } else {
      toast.error('Senha incorreta');
    }
    setLoading(false);
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
    if (authenticated) fetchData();
  }, [authenticated, fetchData]);

  // Password screen
  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Secretaria EBD</CardTitle>
            <p className="text-sm text-muted-foreground">Digite a senha para acessar</p>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleLogin();
              }}
              className="space-y-4"
            >
              <Input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
              <Button className="w-full" disabled={loading || !password}>
                {loading ? 'Verificando...' : 'Entrar'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3">
        <h1 className="font-semibold text-lg">Secretaria EBD</h1>
        <p className="text-xs text-muted-foreground capitalize">{formattedDate}</p>
      </div>

      <div className="p-4 pb-8">
        <Tabs defaultValue="chamada" className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="chamada" className="flex items-center gap-1.5 text-xs">
              <ClipboardList className="h-3.5 w-3.5" /> Chamada
            </TabsTrigger>
            <TabsTrigger value="historico" className="flex items-center gap-1.5 text-xs">
              <BarChart3 className="h-3.5 w-3.5" /> Histórico
            </TabsTrigger>
            <TabsTrigger value="turmas" className="flex items-center gap-1.5 text-xs">
              <Settings2 className="h-3.5 w-3.5" /> Turmas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chamada">
            <ChamadaTab
              classes={classes}
              students={activeStudents}
              attendance={attendance}
              setAttendance={setAttendance}
              sundayDate={sundayDate}
              formattedDate={formattedDate}
            />
          </TabsContent>

          <TabsContent value="historico">
            <HistoricoTab classes={classes} students={activeStudents} />
          </TabsContent>

          <TabsContent value="turmas">
            <TurmasTab
              classes={classes}
              allStudents={allStudents}
              onRefresh={fetchData}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
