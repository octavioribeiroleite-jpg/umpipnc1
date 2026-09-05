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
import { Trash2, UserPlus, Loader2, Pencil, Copy, ClipboardList, RefreshCw, KeyRound, Users, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';
import { FAB } from '@/components/ui/fab';
import { useIsMobile } from '@/hooks/use-mobile';
import { BulkLoginDialog } from '@/components/financas/BulkLoginDialog';

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
  active: boolean;
  role: AppRole | null;
  created_at: string;
  society_id: string | null;
}

interface MemberRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  active: boolean;
  user_id: string | null;
  society_id: string | null;
  // From joined profile
  username?: string;
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

function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function generateUsername(name: string): string {
  return removeAccents(name).toLowerCase().replace(/\s+/g, '').slice(0, 15);
}

function generatePassword(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0] || '';
  const capitalized = first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
  return removeAccents(capitalized) + '123';
}

export default function Usuarios() {
  const { isAdmin, loading: authLoading } = useAuth();
  const isMobile = useIsMobile();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [societies, setSocieties] = useState<Society[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  
  const [mobileSocietyTab, setMobileSocietyTab] = useState<string>('');
  const [resettingPassword, setResettingPassword] = useState<string | null>(null);

  // Members state
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [memberSocietyFilter, setMemberSocietyFilter] = useState<string>('all');
  
  const [creatingLogin, setCreatingLogin] = useState<string | null>(null);

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
      fetchMembers();
    }
  }, [isAdmin]);

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

  const fetchMembers = async () => {
    setMembersLoading(true);
    try {
      const { data: membersData, error: membersError } = await supabase
        .from('members')
        .select('*')
        .order('name');
      if (membersError) throw membersError;

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, username');

      const profileMap = new Map<string, { username: string }>();
      (profilesData || []).forEach((p: any) => {
        profileMap.set(p.user_id, { username: p.username });
      });

      const enriched: MemberRow[] = (membersData || []).map((m: any) => {
        const profile = m.user_id ? profileMap.get(m.user_id) : undefined;
        return {
          id: m.id,
          name: m.name,
          phone: m.phone,
          email: m.email,
          active: m.active,
          user_id: m.user_id,
          society_id: m.society_id,
          username: profile?.username,
        };
      });

      setMembers(enriched);
    } catch (error) {
      console.error('Error fetching members:', error);
      toast.error('Erro ao carregar membros');
    } finally {
      setMembersLoading(false);
    }
  };

  // --- Credential helpers ---
  const copyCredentials = (user: UserWithRole) => {
    const text = `Login: ${user.username}`;
    navigator.clipboard.writeText(text);
    toast.success('Login copiado!');
  };

  const copyMemberCredentials = (member: MemberRow) => {
    const text = `Login: ${member.username || '---'}`;
    navigator.clipboard.writeText(text);
    toast.success('Login copiado!');
  };

  const copyAllCredentials = (societyId: string | null) => {
    const filtered = diretoriaUsers
      .filter((u) => {
        if (societyId === null) return !u.society_id;
        return u.society_id === societyId;
      });

    if (filtered.length === 0) {
      toast.error('Nenhum usuário disponível');
      return;
    }

    const text = `Nome | Login\n${filtered
      .map((u) => `${u.full_name} | ${u.username}`)
      .join('\n')}`;
    navigator.clipboard.writeText(text);
    toast.success(`${filtered.length} logins copiados!`);
  };

  const copyAllMemberCredentials = () => {
    const filtered = filteredMembers.filter((m) => m.username);
    if (filtered.length === 0) {
      toast.error('Nenhum membro com login disponível');
      return;
    }
    const text = `Nome | Login\n${filtered
      .map((m) => `${m.name} | ${m.username}`)
      .join('\n')}`;
    navigator.clipboard.writeText(text);
    toast.success(`${filtered.length} logins copiados!`);
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

  const handleMemberResetPassword = async (member: MemberRow) => {
    if (!member.user_id) return;
    setResettingPassword(member.user_id);
    try {
      const newPass = generateRandomPassword();
      const { data, error } = await supabase.functions.invoke('update-user-password', {
        body: { user_id: member.user_id, new_password: newPass },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResetResultUser(member.name);
      setResetResultPassword(newPass);
      setResetResultOpen(true);
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast.error(error.message || 'Erro ao resetar senha');
    } finally {
      setResettingPassword(null);
    }
  };

  const handleCreateLoginForMember = async (member: MemberRow) => {
    if (member.user_id) return;
    setCreatingLogin(member.id);
    try {
      let username = generateUsername(member.name);
      const password = generatePassword(member.name);

      // Preventive check: if username exists, try with suffix
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username)
        .maybeSingle();

      if (existingProfile) {
        username = username + '2';
      }

      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          full_name: member.name,
          username,
          password,
          role: 'visualizador',
          society_id: member.society_id,
          member_id: member.id,
        },
      });

      if (error) {
        const msg = data?.error || error.message || 'Erro ao criar login';
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error);

      toast.success(`Login criado para ${member.name}`);
      fetchMembers();
      fetchUsers();
    } catch (error: any) {
      console.error('Error creating login:', error);
      toast.error(error.message || 'Erro ao criar login');
    } finally {
      setCreatingLogin(null);
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
      // Preventive check: verify username doesn't already exist
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', newUsername.toLowerCase())
        .maybeSingle();

      if (existingProfile) {
        toast.error(`Já existe um usuário com o login '${newUsername}'. Escolha outro nome de usuário.`);
        setCreating(false);
        return;
      }

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
      
      // Handle non-2xx: SDK puts error in `error` but real message is in `data`
      if (error) {
        const msg = data?.error || error.message || 'Erro ao criar usuário';
        throw new Error(msg);
      }
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

  // --- Derived data ---
  const diretoriaUsers = users.filter(
    (u) => u.role && ['admin', 'diretoria', 'pastor'].includes(u.role)
  );

  const getDiretoriaForSociety = (societyId: string | null) => {
    if (societyId === null) {
      return diretoriaUsers.filter((u) => !u.society_id);
    }
    return diretoriaUsers.filter((u) => u.society_id === societyId);
  };

  const filteredMembers = memberSocietyFilter === 'all'
    ? members
    : members.filter((m) => m.society_id === memberSocietyFilter);

  const getSocietyName = (societyId: string | null) => {
    if (!societyId) return 'Sem sociedade';
    return societies.find((s) => s.id === societyId)?.name || 'Desconhecida';
  };

  const getSocietyColor = (societyId: string | null) => {
    if (!societyId) return '#6b7280';
    return societies.find((s) => s.id === societyId)?.color || '#6b7280';
  };

  const pendingMembers = members.filter((m) => !m.user_id && m.active);

  // ==================== RENDER HELPERS ====================

  const renderDiretoriaCard = (user: UserWithRole) => (
    <div key={user.id} className="rounded-lg border bg-card p-3 space-y-2">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm min-w-0 whitespace-normal break-words">{user.full_name}</p>
          <p className="text-xs text-muted-foreground">@{user.username}</p>
        </div>
        <div className="flex items-center gap-1 ml-2">
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => copyCredentials(user)} title="Copiar credenciais">
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleResetPassword(user)} disabled={resettingPassword === user.user_id} title="Resetar senha">
            {resettingPassword === user.user_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditUserId(user.user_id); setEditFullName(user.full_name); setEditUsername(user.username); setEditPassword(''); setEditDialogOpen(true); }}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10" disabled={deletingUser === user.user_id}>
                {deletingUser === user.user_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remover usuário?</AlertDialogTitle>
                <AlertDialogDescription>O usuário {user.full_name} será desativado.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleDeleteUser(user.user_id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remover</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <Badge className={`${user.role ? roleColors[user.role] : ''} text-[10px] px-1.5 py-0`}>
          {user.role ? roleLabels[user.role] : '—'}
        </Badge>
      </div>
    </div>
  );

  const renderDiretoriaTable = (filteredUsers: UserWithRole[]) => {
    if (filteredUsers.length === 0) {
      return <p className="text-center text-muted-foreground py-8">Nenhum usuário nesta sociedade</p>;
    }
    return (
      <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Usuário</TableHead>
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
                <Select value={user.role || ''} onValueChange={(value) => handleRoleChange(user.user_id, value as AppRole)} disabled={updatingUser === user.user_id}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue>{user.role && <Badge className={roleColors[user.role]}>{roleLabels[user.role]}</Badge>}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="diretoria">Diretoria</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="pastor">Pastor</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button size="sm" variant="ghost" onClick={() => copyCredentials(user)} title="Copiar credenciais"><Copy className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => handleResetPassword(user)} disabled={resettingPassword === user.user_id} title="Resetar senha">
                    {resettingPassword === user.user_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setEditUserId(user.user_id); setEditFullName(user.full_name); setEditUsername(user.username); setEditPassword(''); setEditDialogOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" disabled={deletingUser === user.user_id}>
                        {deletingUser === user.user_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover usuário?</AlertDialogTitle>
                        <AlertDialogDescription>O usuário {user.full_name} será desativado.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteUser(user.user_id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remover</AlertDialogAction>
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
    );
  };

  // ==================== MEMBER RENDER HELPERS ====================

  const renderMemberCard = (member: MemberRow) => (
    <div key={member.id} className="rounded-lg border bg-card p-3 space-y-2">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm min-w-0 whitespace-normal break-words">{member.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: getSocietyColor(member.society_id) }} />
            <span className="text-xs text-muted-foreground">{getSocietyName(member.society_id)}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 ml-2">
          {member.user_id ? (
            <>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => copyMemberCredentials(member)} title="Copiar credenciais">
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleMemberResetPassword(member)} disabled={resettingPassword === member.user_id} title="Resetar senha">
                {resettingPassword === member.user_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              </Button>
            </>
          ) : (
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleCreateLoginForMember(member)} disabled={creatingLogin === member.id} title="Criar login">
              {creatingLogin === member.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
            </Button>
          )}
        </div>
      </div>
      {member.user_id && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">@{member.username}</span>
        </div>
      )}
      {!member.user_id && (
        <p className="text-xs text-muted-foreground italic">Sem login</p>
      )}
      <div className="flex items-center gap-1.5">
        <Badge variant={member.active ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
          {member.active ? 'Ativo' : 'Inativo'}
        </Badge>
      </div>
    </div>
  );

  const renderMembersTable = () => {
    if (filteredMembers.length === 0) {
      return <p className="text-center text-muted-foreground py-8">Nenhum membro encontrado</p>;
    }
    return (
      <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Sociedade</TableHead>
            <TableHead>Login</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredMembers.map((member) => (
            <TableRow key={member.id}>
              <TableCell className="font-medium">{member.name}</TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: getSocietyColor(member.society_id) }} />
                  <span className="text-sm">{getSocietyName(member.society_id)}</span>
                </div>
              </TableCell>
              <TableCell>
                {member.username ? (
                  <span className="text-sm">@{member.username}</span>
                ) : (
                  <span className="text-sm text-muted-foreground italic">—</span>
                )}
               </TableCell>
              <TableCell>
                <Badge variant={member.active ? 'default' : 'secondary'}>
                  {member.active ? 'Ativo' : 'Inativo'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  {member.user_id ? (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => copyMemberCredentials(member)} title="Copiar credenciais"><Copy className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => handleMemberResetPassword(member)} disabled={resettingPassword === member.user_id} title="Resetar senha">
                        {resettingPassword === member.user_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => handleCreateLoginForMember(member)} disabled={creatingLogin === member.id} title="Criar login">
                      {creatingLogin === member.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>
    );
  };

  const renderCopyAllButton = (societyId: string | null) => (
    <Button variant="outline" size="sm" onClick={() => copyAllCredentials(societyId)} className="gap-1.5">
      <ClipboardList className="h-4 w-4" />
      <span className="hidden sm:inline">Copiar todos</span>
    </Button>
  );

  const mobileSocietyUsers = mobileSocietyTab === 'geral'
    ? getDiretoriaForSociety(null)
    : getDiretoriaForSociety(mobileSocietyTab);

  // ==================== CREATE DIALOG ====================
  const createDialog = (
    <Dialog open={createOpen} onOpenChange={setCreateOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar Novo Usuário</DialogTitle>
          <DialogDescription>Defina o nome, sociedade, usuário, senha e cargo</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nome completo</Label>
            <Input placeholder="Ex: Davi Silva" value={newName} onChange={(e) => setNewName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Sociedade</Label>
            <Select value={newSocietyId} onValueChange={setNewSocietyId}>
              <SelectTrigger><SelectValue placeholder="Selecione a sociedade" /></SelectTrigger>
              <SelectContent>
                {societies.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                      {s.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Usuário (login)</Label>
            <Input placeholder="Ex: davi" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} autoCapitalize="none" autoCorrect="off" />
          </div>
          <div className="space-y-2">
            <Label>Senha</Label>
            <Input type="text" placeholder="Ex: Davi123" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Cargo</Label>
            <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
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
          <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
          <Button onClick={handleCreateUser} disabled={creating}>
            {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <AppLayout>
      <PageHeader
        title="Gestão de Usuários"
        description="Gerencie a diretoria e os membros do sistema"
        action={
          <div className="hidden md:flex items-center gap-2">
            <Button onClick={() => setCreateOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Novo Usuário
            </Button>
          </div>
        }
      />

      <FAB icon={<UserPlus className="h-6 w-6" />} onClick={() => setCreateOpen(true)} />

      {createDialog}

      <div className="space-y-4 md:space-y-6">
        {/* ==================== CARD DIRETORIA ==================== */}
        <Card>
          <CardHeader className="pb-3 md:pb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-lg md:text-xl">Diretoria</CardTitle>
                  <CardDescription className="text-xs md:text-sm">Administradores, pastores e diretoria das sociedades</CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-3 md:px-6">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : isMobile ? (
              <div className="space-y-3">
                <Select value={mobileSocietyTab} onValueChange={setMobileSocietyTab}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione a sociedade" />
                  </SelectTrigger>
                  <SelectContent>
                    {societies.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                          <span>{s.name}</span>
                          <Badge variant="secondary" className="ml-auto h-5 text-xs">{getDiretoriaForSociety(s.id).length}</Badge>
                        </div>
                      </SelectItem>
                    ))}
                    <SelectItem value="geral">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-muted-foreground" />
                        <span>Geral</span>
                        <Badge variant="secondary" className="ml-auto h-5 text-xs">{getDiretoriaForSociety(null).length}</Badge>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex justify-end">
                  {renderCopyAllButton(mobileSocietyTab === 'geral' ? null : mobileSocietyTab)}
                </div>
                <div className="space-y-2">
                  {mobileSocietyUsers.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8 text-sm">Nenhum usuário nesta sociedade</p>
                  ) : (
                    mobileSocietyUsers.map(renderDiretoriaCard)
                  )}
                </div>
              </div>
            ) : (
              <Tabs defaultValue={societies[0]?.id || 'geral'} className="w-full">
                <div className="flex items-center justify-between mb-4 gap-2">
                  <TabsList className="flex flex-wrap h-auto gap-1">
                    {societies.map((s) => (
                      <TabsTrigger key={s.id} value={s.id}>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                          <span>{s.name}</span>
                          <Badge variant="secondary" className="ml-1 h-5 text-xs">{getDiretoriaForSociety(s.id).length}</Badge>
                        </div>
                      </TabsTrigger>
                    ))}
                    <TabsTrigger value="geral">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground" />
                        <span>Geral</span>
                        <Badge variant="secondary" className="ml-1 h-5 text-xs">{getDiretoriaForSociety(null).length}</Badge>
                      </div>
                    </TabsTrigger>
                  </TabsList>
                </div>
                {societies.map((s) => (
                  <TabsContent key={s.id} value={s.id}>
                    <div className="flex justify-end mb-2">{renderCopyAllButton(s.id)}</div>
                    {renderDiretoriaTable(getDiretoriaForSociety(s.id))}
                  </TabsContent>
                ))}
                <TabsContent value="geral">
                  <div className="flex justify-end mb-2">{renderCopyAllButton(null)}</div>
                  {renderDiretoriaTable(getDiretoriaForSociety(null))}
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>

        {/* ==================== CARD MEMBROS ==================== */}
        <Card>
          <CardHeader className="pb-3 md:pb-6">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-lg md:text-xl">Membros</CardTitle>
                  <CardDescription className="text-xs md:text-sm">
                    Gerenciamento de login e senha dos membros ({members.length} total)
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <BulkLoginDialog members={pendingMembers as any} onComplete={() => { fetchMembers(); fetchUsers(); }} />
                <Button variant="outline" size="sm" onClick={copyAllMemberCredentials} className="gap-1.5">
                  <ClipboardList className="h-4 w-4" />
                  <span className="hidden sm:inline">Copiar todos</span>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-3 md:px-6">
            {membersLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-3">
                {/* Society filter */}
                <Select value={memberSocietyFilter} onValueChange={setMemberSocietyFilter}>
                  <SelectTrigger className="w-full md:w-[250px]">
                    <SelectValue placeholder="Filtrar por sociedade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as sociedades</SelectItem>
                    {societies.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                          <span>{s.name}</span>
                          <Badge variant="secondary" className="ml-auto h-5 text-xs">
                            {members.filter((m) => m.society_id === s.id).length}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {isMobile ? (
                  <div className="space-y-2">
                    {filteredMembers.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8 text-sm">Nenhum membro encontrado</p>
                    ) : (
                      filteredMembers.map(renderMemberCard)
                    )}
                  </div>
                ) : (
                  renderMembersTable()
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>Altere o nome, usuário ou senha</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome completo</Label>
              <Input placeholder="Nome completo" value={editFullName} onChange={(e) => setEditFullName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Usuário (login)</Label>
              <Input placeholder="Usuário" value={editUsername} onChange={(e) => setEditUsername(e.target.value)} autoCapitalize="none" autoCorrect="off" />
            </div>
            <div className="space-y-2">
              <Label>Nova senha (opcional)</Label>
              <Input type="text" placeholder="Deixe vazio para não alterar" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
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
            <DialogDescription>A senha de <strong>{resetResultUser}</strong> foi alterada com sucesso.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
              <span className="text-sm text-muted-foreground">Nova senha:</span>
              <span className="font-mono text-lg font-bold">{resetResultPassword}</span>
              <Button variant="ghost" size="sm" className="ml-auto" onClick={() => { navigator.clipboard.writeText(resetResultPassword); toast.success('Senha copiada!'); }}>
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
