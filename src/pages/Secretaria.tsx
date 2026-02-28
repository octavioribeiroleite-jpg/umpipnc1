import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Lock, ClipboardList, BarChart3, Settings2, User } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import ChamadaTab from '@/components/secretaria/ChamadaTab';
import HistoricoTab from '@/components/secretaria/HistoricoTab';
import TurmasTab from '@/components/secretaria/TurmasTab';
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

function getSundayDate(): string {
  const today = new Date();
  const day = today.getDay();
  const diff = day === 0 ? 0 : 7 - day;
  const sunday = new Date(today);
  sunday.setDate(today.getDate() + diff);
  return format(sunday, 'yyyy-MM-dd');
}

export default function Secretaria() {
  const [accessLevel, setAccessLevel] = useState<AccessLevel | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<EbdClass[]>([]);
  const [activeStudents, setActiveStudents] = useState<EbdStudent[]>([]);
  const [allStudents, setAllStudents] = useState<EbdStudent[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);

  const sundayDate = getSundayDate();
  const formattedDate = "Domingo, " + format(new Date(sundayDate + 'T12:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  const handleLogin = async () => {
    setLoading(true);
    const { data: settings } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', [
        'secretaria_admin_login',
        'secretaria_admin_password',
        'secretaria_professor_login',
        'secretaria_professor_password',
      ]);

    if (!settings || settings.length === 0) {
      toast.error('Erro ao carregar configurações');
      setLoading(false);
      return;
    }

    const get = (key: string) => settings.find(s => s.key === key)?.value;

    const adminLogin = get('secretaria_admin_login');
    const adminPass = get('secretaria_admin_password');
    const profLogin = get('secretaria_professor_login');
    const profPass = get('secretaria_professor_password');

    const trimUser = username.trim().toLowerCase();

    if (trimUser === adminLogin && password === adminPass) {
      setAccessLevel('admin');
    } else if (trimUser === profLogin && password === profPass) {
      setAccessLevel('professor');
    } else {
      toast.error('Usuário ou senha incorretos');
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
    if (accessLevel) fetchData();
  }, [accessLevel, fetchData]);

  // Login screen
  if (!accessLevel) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Secretaria EBD</CardTitle>
            <p className="text-sm text-muted-foreground">Digite suas credenciais para acessar</p>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleLogin();
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="username">Usuário</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Usuário"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-9"
                    autoFocus
                    autoCapitalize="off"
                    autoCorrect="off"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <Button className="w-full" disabled={loading || !username || !password}>
                {loading ? 'Verificando...' : 'Entrar'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isAdmin = accessLevel === 'admin';
  const profileLabel = isAdmin ? 'Admsecretaria' : 'Professor';

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
              sundayDate={sundayDate}
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
