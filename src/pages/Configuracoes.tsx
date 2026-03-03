import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Settings, Users, DollarSign, Calendar, Shield, Trash2, Loader2, AlertTriangle, CheckCircle, XCircle, UserCheck, BookOpen, Save, KeyRound } from 'lucide-react';
import { toast } from 'sonner';

type AppRole = 'admin' | 'diretoria' | 'visualizador';

interface UserWithRole {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  active: boolean;
  role: AppRole | null;
}

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  diretoria: 'Diretoria',
  visualizador: 'Visualizador',
  pending: 'Pendente',
};

const roleColors: Record<string, string> = {
  admin: 'bg-primary text-primary-foreground',
  diretoria: 'bg-accent text-accent-foreground',
  visualizador: 'bg-muted text-muted-foreground',
  pending: 'bg-destructive/20 text-destructive',
};


export default function Configuracoes() {
  const { isAdmin, isPastor, user } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState<string | null>(null);

  // Secretaria EBD PIN state
  const [secLoading, setSecLoading] = useState(false);
  const [secSaving, setSecSaving] = useState(false);
  const [secAdminPin, setSecAdminPin] = useState('');
  const [secProfPin, setSecProfPin] = useState('');

  // Diretoria PINs state
  const [dirPins, setDirPins] = useState<Record<string, string>>({});
  const [dirPinsLoading, setDirPinsLoading] = useState(false);
  const [dirPinsSaving, setDirPinsSaving] = useState(false);
  const [dirSocieties, setDirSocieties] = useState<{ id: string; name: string; slug: string; color: string }[]>([]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchSecretariaCredentials();
      fetchDiretoriaPins();
    }
  }, [isAdmin]);

  const fetchDiretoriaPins = async () => {
    setDirPinsLoading(true);
    const [societiesRes, settingsRes] = await Promise.all([
      supabase.from('societies').select('id, name, slug, color').eq('active', true).order('name'),
      supabase.from('settings').select('key, value').like('key', 'diretoria_pin_%'),
    ]);
    if (societiesRes.data) setDirSocieties(societiesRes.data);
    if (settingsRes.data) {
      const pins: Record<string, string> = {};
      settingsRes.data.forEach(s => {
        const slug = s.key.replace('diretoria_pin_', '');
        pins[slug] = s.value;
      });
      setDirPins(pins);
    }
    setDirPinsLoading(false);
  };

  const saveDiretoriaPins = async () => {
    const invalid = Object.entries(dirPins).some(([, v]) => !/^\d{6}$/.test(v));
    if (invalid) {
      toast.error('Todos os PINs devem ter exatamente 6 dígitos numéricos');
      return;
    }
    setDirPinsSaving(true);
    try {
      for (const [slug, value] of Object.entries(dirPins)) {
        const key = `diretoria_pin_${slug}`;
        const { error } = await supabase
          .from('settings')
          .update({ value, updated_at: new Date().toISOString() })
          .eq('key', key);
        if (error) throw error;
      }
      toast.success('PINs da Diretoria atualizados!');
    } catch (error) {
      console.error('Error saving diretoria PINs:', error);
      toast.error('Erro ao salvar PINs');
    } finally {
      setDirPinsSaving(false);
    }
  };

  const fetchSecretariaCredentials = async () => {
    setSecLoading(true);
    const { data } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['secretaria_admin_password', 'secretaria_professor_password']);
    
    if (data) {
      const get = (key: string) => data.find(s => s.key === key)?.value || '';
      setSecAdminPin(get('secretaria_admin_password'));
      setSecProfPin(get('secretaria_professor_password'));
    }
    setSecLoading(false);
  };

  const saveSecretariaCredentials = async () => {
    if (!/^\d{6}$/.test(secAdminPin) || !/^\d{6}$/.test(secProfPin)) {
      toast.error('Os PINs devem ter exatamente 6 dígitos numéricos');
      return;
    }
    setSecSaving(true);
    try {
      const updates = [
        { key: 'secretaria_admin_password', value: secAdminPin },
        { key: 'secretaria_professor_password', value: secProfPin },
      ];

      for (const { key, value } of updates) {
        const { error } = await supabase
          .from('settings')
          .update({ value, updated_at: new Date().toISOString() })
          .eq('key', key);
        if (error) throw error;
      }

      toast.success('PINs da Secretaria EBD atualizados!');
    } catch (error) {
      console.error('Error saving secretaria PINs:', error);
      toast.error('Erro ao salvar PINs');
    } finally {
      setSecSaving(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      const [profilesRes, rolesRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('active', true).order('full_name'),
        supabase.from('user_roles').select('user_id, role')
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;

      const rolesMap = new Map<string, AppRole>();
      rolesRes.data?.forEach(r => {
        rolesMap.set(r.user_id, r.role as AppRole);
      });

      const usersWithRoles: UserWithRole[] = (profilesRes.data || []).map(profile => ({
        id: profile.id,
        user_id: profile.user_id,
        full_name: profile.full_name,
        email: profile.email,
        active: profile.active,
        role: rolesMap.get(profile.user_id) || null,
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (userId === user?.id && newRole === 'none') {
      toast.error('Você não pode remover seu próprio cargo');
      return;
    }

    setUpdatingUser(userId);
    
    try {
      if (newRole === 'none') {
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId);
        
        if (error) throw error;
        
        setUsers(prev => prev.map(u => 
          u.user_id === userId ? { ...u, role: null } : u
        ));
        
        toast.success('Cargo removido com sucesso');
      } else {
        const { data: existingRole } = await supabase
          .from('user_roles')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();
        
        if (existingRole) {
          const { error } = await supabase
            .from('user_roles')
            .update({ role: newRole as 'admin' | 'diretoria' | 'visualizador' })
            .eq('user_id', userId);
          
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('user_roles')
            .insert({ user_id: userId, role: newRole as 'admin' | 'diretoria' | 'visualizador' });
          
          if (error) throw error;
        }
        
        setUsers(prev => prev.map(u => 
          u.user_id === userId ? { ...u, role: newRole as AppRole } : u
        ));
        
        toast.success('Cargo atualizado com sucesso');
      }
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Erro ao atualizar cargo');
      fetchUsers();
    } finally {
      setUpdatingUser(null);
    }
  };

  const handleDeleteUser = async (userToDelete: UserWithRole) => {
    if (userToDelete.user_id === user?.id) {
      toast.error('Você não pode excluir sua própria conta');
      return;
    }

    setDeletingUser(userToDelete.user_id);
    
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ active: false })
        .eq('user_id', userToDelete.user_id);
      
      if (profileError) throw profileError;

      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userToDelete.user_id);
      
      setUsers(prev => prev.filter(u => u.user_id !== userToDelete.user_id));
      
      toast.success(`Usuário "${userToDelete.full_name}" excluído com sucesso`);
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Erro ao excluir usuário');
    } finally {
      setDeletingUser(null);
    }
  };


  return (
    <AppLayout>
      <PageHeader title="Configurações" description="Gerencie as configurações do sistema" />

      <div className="space-y-4 md:space-y-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Geral
            </CardTitle>
            <CardDescription>Configurações gerais do sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="org-name">Nome da organização</Label>
                <Input id="org-name" defaultValue="IPNC - Diretoria de Jovens" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="church-name">Nome da igreja</Label>
                <Input id="church-name" defaultValue="Igreja Presbiteriana de Nova Carapina" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Financeiro
            </CardTitle>
            <CardDescription>Configurações de finanças e contribuições</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="membership-value">Valor padrão da contribuição</Label>
                <Input id="membership-value" type="number" defaultValue="50.00" />
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Comprovante obrigatório para saídas</Label>
                <p className="text-sm text-muted-foreground">
                  Exige upload de comprovante para registrar despesas
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Google Calendar Integration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Integração Google Calendar
            </CardTitle>
            <CardDescription>Sincronize eventos com seu Google Agenda</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Conectar Google Calendar</Label>
                <p className="text-sm text-muted-foreground">
                  Sincronize eventos automaticamente
                </p>
              </div>
              <Button variant="outline">Conectar</Button>
            </div>
          </CardContent>
        </Card>

        {/* User Management (Admin only) */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Gestão de Usuários
                    {users.filter(u => u.role === null).length > 0 && (
                      <Badge variant="destructive" className="animate-pulse ml-2">
                        {users.filter(u => u.role === null).length} pendente{users.filter(u => u.role === null).length > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>Gerencie usuários e permissões</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : users.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum usuário cadastrado
                </p>
              ) : (
                <>
                  {/* Pending Users Section */}
                  {users.filter(u => u.role === null).length > 0 ? (
                    <div className="rounded-lg border-2 border-amber-500/50 bg-amber-500/5 p-4">
                      <div className="flex items-center gap-2 mb-4">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                        <h3 className="font-semibold text-amber-500">
                          Aguardando Aprovação ({users.filter(u => u.role === null).length})
                        </h3>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {users.filter(u => u.role === null).map((userItem) => (
                            <TableRow key={userItem.id}>
                              <TableCell className="font-medium">{userItem.full_name}</TableCell>
                              <TableCell className="text-muted-foreground">{userItem.email}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Select 
                                    onValueChange={(value) => handleRoleChange(userItem.user_id, value)}
                                    disabled={updatingUser === userItem.user_id}
                                  >
                                    <SelectTrigger className="w-[160px] border-green-500/50 bg-green-500/10 text-green-600 hover:bg-green-500/20">
                                      {updatingUser === userItem.user_id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <span className="flex items-center gap-2">
                                          <UserCheck className="h-4 w-4" />
                                          Aprovar como...
                                        </span>
                                      )}
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="visualizador">Visualizador</SelectItem>
                                      <SelectItem value="diretoria">Diretoria</SelectItem>
                                      <SelectItem value="admin">Administrador</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button 
                                        variant="outline"
                                        size="sm"
                                        className="border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                        disabled={deletingUser === userItem.user_id}
                                      >
                                        {deletingUser === userItem.user_id ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <>
                                            <XCircle className="h-4 w-4 mr-1" />
                                            Recusar
                                          </>
                                        )}
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Recusar Cadastro</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Tem certeza que deseja recusar o cadastro de{' '}
                                          <strong>{userItem.full_name}</strong> ({userItem.email})?
                                          <br /><br />
                                          O usuário não poderá acessar o sistema.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => handleDeleteUser(userItem)}
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                          Recusar Cadastro
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4 flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="text-green-600 text-sm font-medium">
                        Nenhuma conta aguardando aprovação
                      </span>
                    </div>
                  )}

                  {/* Active Users Section */}
                  {users.filter(u => u.role !== null).length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <Users className="h-5 w-5 text-muted-foreground" />
                        <h3 className="font-semibold text-foreground">
                          Usuários Ativos ({users.filter(u => u.role !== null).length})
                        </h3>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Cargo</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {users.filter(u => u.role !== null).map((userItem) => (
                            <TableRow key={userItem.id}>
                              <TableCell className="font-medium">
                                {userItem.full_name}
                                {userItem.user_id === user?.id && (
                                  <Badge variant="outline" className="ml-2 text-xs">
                                    Você
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-muted-foreground">{userItem.email}</TableCell>
                              <TableCell>
                                <Badge className={roleColors[userItem.role || 'pending']}>
                                  {roleLabels[userItem.role || 'pending']}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Select 
                                    value={userItem.role || 'none'} 
                                    onValueChange={(value) => handleRoleChange(userItem.user_id, value)}
                                    disabled={updatingUser === userItem.user_id}
                                  >
                                    <SelectTrigger className="w-[140px]">
                                      {updatingUser === userItem.user_id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <SelectValue />
                                      )}
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="admin">Administrador</SelectItem>
                                      <SelectItem value="diretoria">Diretoria</SelectItem>
                                      <SelectItem value="visualizador">Visualizador</SelectItem>
                                      <SelectItem value="none">Sem cargo</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button 
                                        variant="ghost" 
                                        size="icon"
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                        disabled={userItem.user_id === user?.id || deletingUser === userItem.user_id}
                                      >
                                        {deletingUser === userItem.user_id ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <Trash2 className="h-4 w-4" />
                                        )}
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Excluir Usuário</AlertDialogTitle>
                                        <AlertDialogDescription className="space-y-2">
                                          <p>
                                            Tem certeza que deseja excluir o usuário{' '}
                                            <strong>{userItem.full_name}</strong> ({userItem.email})?
                                          </p>
                                          <p className="text-sm">Esta ação irá:</p>
                                          <ul className="list-disc list-inside text-sm space-y-1">
                                            <li>Desativar a conta do usuário</li>
                                            <li>Remover todos os cargos</li>
                                            <li>O usuário não poderá mais acessar o sistema</li>
                                          </ul>
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => handleDeleteUser(userItem)}
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                          Excluir Usuário
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Secretaria EBD PINs (Admin only) */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Secretaria EBD
              </CardTitle>
              <CardDescription>Gerencie os PINs de acesso à Secretaria EBD</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {secLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {/* Admin profile */}
                  <div className="space-y-3">
                    <h3 className="font-medium text-sm flex items-center gap-2">
                      <Badge>Administrador</Badge>
                      Acesso completo
                    </h3>
                    <div className="space-y-1.5">
                      <Label htmlFor="sec-admin-pin">PIN (6 dígitos)</Label>
                      <Input
                        id="sec-admin-pin"
                        value={secAdminPin}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g, '').slice(0, 6);
                          setSecAdminPin(v);
                        }}
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="000000"
                        className="max-w-[200px] tracking-widest text-center font-mono"
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Professor profile */}
                  <div className="space-y-3">
                    <h3 className="font-medium text-sm flex items-center gap-2">
                      <Badge variant="secondary">Professor</Badge>
                      Apenas chamada e histórico
                    </h3>
                    <div className="space-y-1.5">
                      <Label htmlFor="sec-prof-pin">PIN (6 dígitos)</Label>
                      <Input
                        id="sec-prof-pin"
                        value={secProfPin}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g, '').slice(0, 6);
                          setSecProfPin(v);
                        }}
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="000000"
                        className="max-w-[200px] tracking-widest text-center font-mono"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={saveSecretariaCredentials}
                    disabled={secSaving || secAdminPin.length !== 6 || secProfPin.length !== 6}
                  >
                    {secSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Salvar PINs
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Diretoria PINs (Admin only) */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                PINs da Diretoria
              </CardTitle>
              <CardDescription>Gerencie os PINs de acesso por sociedade</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {dirPinsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {dirSocieties.map((society) => (
                    <div key={society.slug} className="flex items-center gap-3">
                      <div
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ backgroundColor: society.color }}
                      >
                        {society.slug.toUpperCase().slice(0, 3)}
                      </div>
                      <span className="text-sm font-medium min-w-[60px]">{society.name}</span>
                      <Input
                        value={dirPins[society.slug] || ''}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g, '').slice(0, 6);
                          setDirPins(prev => ({ ...prev, [society.slug]: v }));
                        }}
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="000000"
                        className="max-w-[140px] tracking-widest text-center font-mono"
                      />
                    </div>
                  ))}
                  <Button
                    onClick={saveDiretoriaPins}
                    disabled={dirPinsSaving || dirSocieties.some(s => (dirPins[s.slug] || '').length !== 6)}
                  >
                    {dirPinsSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Salvar PINs
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}

      </div>
    </AppLayout>
  );
}
