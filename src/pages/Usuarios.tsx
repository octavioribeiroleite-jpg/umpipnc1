import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2, UserPlus, Loader2, KeyRound, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';

type AppRole = 'admin' | 'diretoria' | 'visualizador';

interface UserWithRole {
  id: string;
  user_id: string;
  full_name: string;
  username: string;
  plain_password: string | null;
  active: boolean;
  role: AppRole | null;
  created_at: string;
}

const roleLabels: Record<AppRole, string> = {
  admin: 'Administrador',
  diretoria: 'Diretoria',
  visualizador: 'Visualizador',
};

const roleColors: Record<AppRole, string> = {
  admin: 'bg-destructive text-destructive-foreground',
  diretoria: 'bg-primary text-primary-foreground',
  visualizador: 'bg-muted text-muted-foreground',
};

export default function Usuarios() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  // Create user dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<AppRole>('visualizador');

  // Change password dialog
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordUserId, setPasswordUserId] = useState<string | null>(null);
  const [passwordUserName, setPasswordUserName] = useState('');
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      const usersWithRoles: UserWithRole[] = (profiles || [])
        .filter((p: any) => p.active)
        .map((profile: any) => {
          const userRole = roles?.find((r) => r.user_id === profile.user_id);
          return {
            id: profile.id,
            user_id: profile.user_id,
            full_name: profile.full_name,
            username: profile.username || '',
            plain_password: profile.plain_password || null,
            active: profile.active,
            role: userRole?.role as AppRole | null,
            created_at: profile.created_at,
          };
        });

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: AppRole) => {
    setUpdatingUser(userId);
    try {
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (existingRole) {
        const { error } = await supabase
          .from('user_roles')
          .update({ role: newRole })
          .eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: newRole });
        if (error) throw error;
      }

      setUsers((prev) =>
        prev.map((u) => (u.user_id === userId ? { ...u, role: newRole } : u))
      );
      toast.success('Cargo atualizado com sucesso');
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Erro ao atualizar cargo');
    } finally {
      setUpdatingUser(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setDeletingUser(userId);
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ active: false })
        .eq('user_id', userId);
      if (profileError) throw profileError;

      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);
      if (roleError) throw roleError;

      setUsers((prev) => prev.filter((u) => u.user_id !== userId));
      toast.success('Usuário removido com sucesso');
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Erro ao remover usuário');
    } finally {
      setDeletingUser(null);
    }
  };

  const handleCreateUser = async () => {
    if (!newName || !newUsername || !newPassword) {
      toast.error('Preencha todos os campos');
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          full_name: newName,
          username: newUsername,
          password: newPassword,
          role: newRole,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Usuário criado com sucesso!');
      setCreateOpen(false);
      setNewName('');
      setNewUsername('');
      setNewPassword('');
      setNewRole('visualizador');
      fetchUsers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(error.message || 'Erro ao criar usuário');
    } finally {
      setCreating(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordUserId || !newPasswordValue) return;
    setChangingPassword(true);
    try {
      const { data, error } = await supabase.functions.invoke('update-user-password', {
        body: { user_id: passwordUserId, new_password: newPasswordValue },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Senha alterada com sucesso!');
      setPasswordDialogOpen(false);
      setNewPasswordValue('');
      setPasswordUserId(null);
      fetchUsers();
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error(error.message || 'Erro ao alterar senha');
    } finally {
      setChangingPassword(false);
    }
  };

  if (authLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const activeUsers = users.filter((u) => u.role);

  return (
    <AppLayout>
      <PageHeader
        title="Gestão de Usuários"
        description="Gerencie os usuários e permissões do sistema"
      />

      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Usuários Ativos</CardTitle>
              <CardDescription>Gerencie os cargos, senhas e permissões</CardDescription>
            </div>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Novo Usuário
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Novo Usuário</DialogTitle>
                  <DialogDescription>
                    Defina o nome, usuário, senha e cargo do membro
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Nome completo</Label>
                    <Input
                      placeholder="Ex: Davi Silva"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Usuário (login)</Label>
                    <Input
                      placeholder="Ex: davi"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      autoCapitalize="none"
                      autoCorrect="off"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Senha</Label>
                    <Input
                      type="text"
                      placeholder="Ex: Davi123"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cargo</Label>
                    <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="visualizador">Visualizador</SelectItem>
                        <SelectItem value="diretoria">Diretoria</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateUser} disabled={creating}>
                    {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Criar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : activeUsers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum usuário ativo encontrado
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Senha</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.full_name}</TableCell>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-sm">
                            {showPasswords[user.id]
                              ? user.plain_password || '—'
                              : '••••••'}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() =>
                              setShowPasswords((prev) => ({
                                ...prev,
                                [user.id]: !prev[user.id],
                              }))
                            }
                          >
                            {showPasswords[user.id] ? (
                              <EyeOff className="h-3 w-3" />
                            ) : (
                              <Eye className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={user.role || ''}
                          onValueChange={(value) =>
                            handleRoleChange(user.user_id, value as AppRole)
                          }
                          disabled={updatingUser === user.user_id}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue>
                              {user.role && (
                                <Badge className={roleColors[user.role]}>
                                  {roleLabels[user.role]}
                                </Badge>
                              )}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="visualizador">Visualizador</SelectItem>
                            <SelectItem value="diretoria">Diretoria</SelectItem>
                            <SelectItem value="admin">Administrador</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setPasswordUserId(user.user_id);
                              setPasswordUserName(user.full_name);
                              setNewPasswordValue('');
                              setPasswordDialogOpen(true);
                            }}
                          >
                            <KeyRound className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                disabled={deletingUser === user.user_id}
                              >
                                {deletingUser === user.user_id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remover usuário?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  O usuário {user.full_name} será desativado e perderá acesso ao sistema.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteUser(user.user_id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Remover
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
            )}
          </CardContent>
        </Card>
      </div>

      {/* Change Password Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Senha</DialogTitle>
            <DialogDescription>
              Nova senha para {passwordUserName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nova senha</Label>
              <Input
                type="text"
                placeholder="Digite a nova senha"
                value={newPasswordValue}
                onChange={(e) => setNewPasswordValue(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleChangePassword} disabled={changingPassword || !newPasswordValue}>
              {changingPassword ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
