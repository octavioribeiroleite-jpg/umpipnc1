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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2, UserPlus, Loader2, Pencil, Eye, EyeOff, Copy, ClipboardList, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';
import { FAB } from '@/components/ui/fab';
import { useIsMobile } from '@/hooks/use-mobile';

type AppRole = 'admin' | 'diretoria' | 'visualizador' | 'pastor';

interface Society {
  id: string;
  name: string;
  slug: string;
  color: string;
}

interface UserWithRole {
  id: string;
  user_id: string;
  full_name: string;
  username: string;
  plain_password: string | null;
  active: boolean;
  role: AppRole | null;
  created_at: string;
  society_id: string | null;
}

const roleLabels: Record<AppRole, string> = {
  admin: 'Administrador',
  diretoria: 'Diretoria',
  visualizador: 'Visualizador',
  pastor: 'Pastor',
};

const roleColors: Record<AppRole, string> = {
  admin: 'bg-destructive text-destructive-foreground',
  diretoria: 'bg-primary text-primary-foreground',
  visualizador: 'bg-muted text-muted-foreground',
  pastor: 'bg-accent text-accent-foreground',
};

function generateRandomPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export default function Usuarios() {
  const { isAdmin, loading: authLoading } = useAuth();
  const isMobile = useIsMobile();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [societies, setSocieties] = useState<Society[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [mobileSocietyTab, setMobileSocietyTab] = useState<string>('');
  const [resettingPassword, setResettingPassword] = useState<string | null>(null);

  // Reset password result dialog
  const [resetResultOpen, setResetResultOpen] = useState(false);
  const [resetResultUser, setResetResultUser] = useState('');
  const [resetResultPassword, setResetResultPassword] = useState('');

  // Create user dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<AppRole>('diretoria');
  const [newSocietyId, setNewSocietyId] = useState('');

  // Edit user dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchSocieties();
    }
  }, [isAdmin]);

  // Set default mobile tab when societies load
  useEffect(() => {
    if (societies.length > 0 && !mobileSocietyTab) {
      setMobileSocietyTab(societies[0].id);
    }
  }, [societies]);

  const fetchSocieties = async () => {
    const { data } = await supabase
      .from('societies')
      .select('*')
      .eq('active', true)
      .order('name');
    if (data) setSocieties(data as Society[]);
  };

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
            society_id: profile.society_id || null,
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

  // --- Credential helpers ---
  const copyCredentials = (user: UserWithRole) => {
    const text = `Login: ${user.username}\nSenha: ${user.plain_password || '---'}`;
    navigator.clipboard.writeText(text);
    toast.success('Credenciais copiadas!');
  };

  const copyAllCredentials = (societyId: string | null) => {
    const filtered = activeUsers
      .filter((u) => {
        if (societyId === null) return !u.society_id;
        return u.society_id === societyId;
      })
      .filter((u) => u.plain_password);

    if (filtered.length === 0) {
      toast.error('Nenhum usuário com senha disponível');
      return;
    }

    const text = `Nome | Login | Senha\n${filtered
      .map((u) => `${u.full_name} | ${u.username} | ${u.plain_password}`)
      .join('\n')}`;
    navigator.clipboard.writeText(text);
    toast.success(`${filtered.length} credenciais copiadas!`);
  };

  const handleResetPassword = async (user: UserWithRole) => {
    setResettingPassword(user.user_id);
    try {
      const newPass = generateRandomPassword();
      const { data, error } = await supabase.functions.invoke('update-user-password', {
        body: { user_id: user.user_id, new_password: newPass },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setUsers((prev) =>
        prev.map((u) => (u.user_id === user.user_id ? { ...u, plain_password: newPass } : u))
      );
      setResetResultUser(user.full_name);
      setResetResultPassword(newPass);
      setResetResultOpen(true);
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast.error(error.message || 'Erro ao resetar senha');
    } finally {
      setResettingPassword(null);
    }
  };

  // --- Existing handlers ---
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
    if ((newRole === 'diretoria' || newRole === 'visualizador') && !newSocietyId) {
      toast.error('Selecione a sociedade para este cargo');
      return;
    }
    setCreating(true);
    try {
      const body: Record<string, string> = {
        full_name: newName,
        username: newUsername,
        password: newPassword,
        role: newRole,
      };
      if (newSocietyId) {
        body.society_id = newSocietyId;
      }

      const { data, error } = await supabase.functions.invoke('create-user', { body });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Usuário criado com sucesso!');
      setCreateOpen(false);
      setNewName('');
      setNewUsername('');
      setNewPassword('');
      setNewRole('diretoria');
      setNewSocietyId('');
      fetchUsers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(error.message || 'Erro ao criar usuário');
    } finally {
      setCreating(false);
    }
  };

  const handleEditUser = async () => {
    if (!editUserId) return;
    const body: Record<string, string> = { user_id: editUserId };
    if (editFullName) body.new_full_name = editFullName;
    if (editUsername) body.new_username = editUsername;
    if (editPassword) body.new_password = editPassword;

    if (!editFullName && !editUsername && !editPassword) {
      toast.error('Altere pelo menos um campo');
      return;
    }

    setSavingEdit(true);
    try {
      const { data, error } = await supabase.functions.invoke('update-user-password', { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Usuário atualizado com sucesso!');
      setEditDialogOpen(false);
      setEditPassword('');
      setEditUserId(null);
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast.error(error.message || 'Erro ao atualizar usuário');
    } finally {
      setSavingEdit(false);
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

  const getUsersForSociety = (societyId: string | null) => {
    if (societyId === null) {
      return activeUsers.filter((u) => !u.society_id);
    }
    return activeUsers.filter((u) => u.society_id === societyId);
  };

  const getCurrentSocietyId = (): string | null => {
    if (isMobile) {
      return mobileSocietyTab === 'geral' ? null : mobileSocietyTab;
    }
    return null; // desktop uses tabs, copy all is per-tab
  };

  const renderUserCard = (user: UserWithRole) => (
    <div key={user.id} className="rounded-lg border bg-card p-3 space-y-2">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm truncate">{user.full_name}</p>
          <p className="text-xs text-muted-foreground">@{user.username}</p>
        </div>
        <div className="flex items-center gap-1 ml-2">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={() => copyCredentials(user)}
            title="Copiar login e senha"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={() => handleResetPassword(user)}
            disabled={resettingPassword === user.user_id}
            title="Resetar senha"
          >
            {resettingPassword === user.user_id ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={() => {
              setEditUserId(user.user_id);
              setEditFullName(user.full_name);
              setEditUsername(user.username);
              setEditPassword('');
              setEditDialogOpen(true);
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                disabled={deletingUser === user.user_id}
              >
                {deletingUser === user.user_id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
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
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Senha:</span>
          <span className="font-mono text-xs">
            {showPasswords[user.id] ? user.plain_password || '—' : '••••••'}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0"
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
        <Select
          value={user.role || ''}
          onValueChange={(value) => handleRoleChange(user.user_id, value as AppRole)}
          disabled={updatingUser === user.user_id}
        >
          <SelectTrigger className="w-auto h-7 text-xs px-2">
            <SelectValue>
              {user.role && (
                <Badge className={`${roleColors[user.role]} text-[10px] px-1.5 py-0`}>
                  {roleLabels[user.role]}
                </Badge>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="visualizador">Visualizador</SelectItem>
            <SelectItem value="diretoria">Diretoria</SelectItem>
            <SelectItem value="admin">Administrador</SelectItem>
            <SelectItem value="pastor">Pastor</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const renderUserCards = (filteredUsers: UserWithRole[]) => {
    if (filteredUsers.length === 0) {
      return (
        <p className="text-center text-muted-foreground py-8 text-sm">
          Nenhum usuário nesta sociedade
        </p>
      );
    }
    return (
      <div className="space-y-2">
        {filteredUsers.map(renderUserCard)}
      </div>
    );
  };

  const renderUserTable = (filteredUsers: UserWithRole[]) => {
    if (filteredUsers.length === 0) {
      return (
        <p className="text-center text-muted-foreground py-8">
          Nenhum usuário nesta sociedade
        </p>
      );
    }

    return (
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
          {filteredUsers.map((user) => (
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
                    <SelectItem value="pastor">Pastor</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyCredentials(user)}
                    title="Copiar credenciais"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleResetPassword(user)}
                    disabled={resettingPassword === user.user_id}
                    title="Resetar senha"
                  >
                    {resettingPassword === user.user_id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditUserId(user.user_id);
                      setEditFullName(user.full_name);
                      setEditUsername(user.username);
                      setEditPassword('');
                      setEditDialogOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
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
    );
  };

  const renderCopyAllButton = (societyId: string | null) => (
    <Button
      variant="outline"
      size="sm"
      onClick={() => copyAllCredentials(societyId)}
      className="gap-1.5"
    >
      <ClipboardList className="h-4 w-4" />
      <span className="hidden sm:inline">Copiar todos</span>
    </Button>
  );

  const createDialog = (
    <Dialog open={createOpen} onOpenChange={setCreateOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar Novo Usuário</DialogTitle>
          <DialogDescription>
            Defina o nome, sociedade, usuário, senha e cargo do membro
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
            <Label>Sociedade</Label>
            <Select value={newSocietyId} onValueChange={setNewSocietyId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a sociedade" />
              </SelectTrigger>
              <SelectContent>
                {societies.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: s.color }}
                      />
                      {s.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                <SelectItem value="diretoria">Diretoria</SelectItem>
                <SelectItem value="visualizador">Visualizador</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="pastor">Pastor</SelectItem>
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
  );

  const mobileSocietyUsers = mobileSocietyTab === 'geral'
    ? getUsersForSociety(null)
    : getUsersForSociety(mobileSocietyTab);

  return (
    <AppLayout>
      <PageHeader
        title="Gestão de Usuários"
        description="Gerencie os usuários e permissões do sistema"
        action={
          <div className="hidden md:flex items-center gap-2">
            <Button onClick={() => setCreateOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Novo Usuário
            </Button>
          </div>
        }
      />

      <FAB
        icon={<UserPlus className="h-6 w-6" />}
        onClick={() => setCreateOpen(true)}
      />

      {createDialog}

      <div className="space-y-4 md:space-y-6">
        <Card>
          <CardHeader className="pb-3 md:pb-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg md:text-2xl">Usuários Ativos</CardTitle>
                <CardDescription className="text-xs md:text-sm">Gerencie os cargos, senhas e permissões</CardDescription>
              </div>
              <div className="hidden md:flex items-center gap-2">
                <Button onClick={() => setCreateOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Novo Usuário
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-3 md:px-6">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : isMobile ? (
              /* Mobile: Select dropdown + cards */
              <div className="space-y-3">
                <Select value={mobileSocietyTab} onValueChange={setMobileSocietyTab}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione a sociedade" />
                  </SelectTrigger>
                  <SelectContent>
                    {societies.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: s.color }}
                          />
                          <span>{s.name}</span>
                          <Badge variant="secondary" className="ml-auto h-5 text-xs">
                            {getUsersForSociety(s.id).length}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                    <SelectItem value="geral">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-muted-foreground" />
                        <span>Geral</span>
                        <Badge variant="secondary" className="ml-auto h-5 text-xs">
                          {getUsersForSociety(null).length}
                        </Badge>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex justify-end">
                  {renderCopyAllButton(mobileSocietyTab === 'geral' ? null : mobileSocietyTab)}
                </div>
                {renderUserCards(mobileSocietyUsers)}
              </div>
            ) : (
              /* Desktop: Tabs + Table */
              <Tabs defaultValue={societies[0]?.id || 'geral'} className="w-full">
                <div className="flex items-center justify-between mb-4 gap-2">
                  <TabsList className="flex flex-wrap h-auto gap-1">
                    {societies.map((s) => (
                      <TabsTrigger
                        key={s.id}
                        value={s.id}
                        className="data-[state=active]:text-white"
                        style={{
                          '--society-color': s.color,
                        } as React.CSSProperties}
                      >
                        <div className="flex items-center gap-1.5">
                          <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: s.color }}
                          />
                          <span>{s.name}</span>
                          <Badge variant="secondary" className="ml-1 h-5 text-xs">
                            {getUsersForSociety(s.id).length}
                          </Badge>
                        </div>
                      </TabsTrigger>
                    ))}
                    <TabsTrigger value="geral">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground" />
                        <span>Geral</span>
                        <Badge variant="secondary" className="ml-1 h-5 text-xs">
                          {getUsersForSociety(null).length}
                        </Badge>
                      </div>
                    </TabsTrigger>
                  </TabsList>
                </div>

                {societies.map((s) => (
                  <TabsContent key={s.id} value={s.id}>
                    <div className="flex justify-end mb-2">
                      {renderCopyAllButton(s.id)}
                    </div>
                    {renderUserTable(getUsersForSociety(s.id))}
                  </TabsContent>
                ))}
                <TabsContent value="geral">
                  <div className="flex justify-end mb-2">
                    {renderCopyAllButton(null)}
                  </div>
                  {renderUserTable(getUsersForSociety(null))}
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>
              Altere o nome, usuário ou senha
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome completo</Label>
              <Input
                placeholder="Nome completo"
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Usuário (login)</Label>
              <Input
                placeholder="Usuário"
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                autoCapitalize="none"
                autoCorrect="off"
              />
            </div>
            <div className="space-y-2">
              <Label>Nova senha (opcional)</Label>
              <Input
                type="text"
                placeholder="Deixe vazio para não alterar"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditUser} disabled={savingEdit}>
              {savingEdit ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Result Dialog */}
      <Dialog open={resetResultOpen} onOpenChange={setResetResultOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Senha Resetada</DialogTitle>
            <DialogDescription>
              A senha de <strong>{resetResultUser}</strong> foi alterada com sucesso.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
              <span className="text-sm text-muted-foreground">Nova senha:</span>
              <span className="font-mono text-lg font-bold">{resetResultPassword}</span>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto"
                onClick={() => {
                  navigator.clipboard.writeText(resetResultPassword);
                  toast.success('Senha copiada!');
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setResetResultOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
