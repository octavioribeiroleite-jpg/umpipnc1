import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Pencil, UserX, UserCheck, Trash2, KeyRound, Copy } from 'lucide-react';

function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function generateUsername(name: string): string {
  return removeAccents(name).replace(/\s+/g, '').toLowerCase();
}

function generatePassword(name: string): string {
  return name.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('') + '123';
}

interface Member {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  active: boolean;
  user_id: string | null;
}

interface RelatedData {
  charges: number;
  payments: number;
}

interface Credentials {
  name: string;
  username: string;
  password: string;
}

export function MembrosTab() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '' });
  const [deleteMember, setDeleteMember] = useState<Member | null>(null);
  const [relatedData, setRelatedData] = useState<RelatedData | null>(null);
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();
  const { profile, isAdmin, isPastor, selectedSocietyId } = useAuth();
  const societyId = (!isAdmin && !isPastor) ? profile?.society_id : selectedSocietyId;

  const fetchMembers = async () => {
    let query = supabase
      .from('members')
      .select('*')
      .order('name');

    if (societyId) {
      query = query.eq('society_id', societyId);
    }

    const { data, error } = await query;
    
    if (error) {
      toast({ title: 'Erro ao carregar membros', variant: 'destructive' });
    } else {
      setMembers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMembers();
  }, [societyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({ title: 'Nome é obrigatório', variant: 'destructive' });
      return;
    }

    if (editingMember) {
      const { error } = await supabase
        .from('members')
        .update({
          name: formData.name,
          phone: formData.phone || null,
          email: formData.email || null,
        })
        .eq('id', editingMember.id);
      
      if (error) {
        toast({ title: 'Erro ao atualizar membro', variant: 'destructive' });
      } else {
        toast({ title: 'Membro atualizado com sucesso' });
        fetchMembers();
      }
      setDialogOpen(false);
      setEditingMember(null);
      setFormData({ name: '', phone: '', email: '' });
    } else {
      setCreating(true);
      const memberSocietyId = societyId || null;

      // 1. Insert member
      const { data: newMember, error: insertError } = await supabase
        .from('members')
        .insert({
          name: formData.name,
          phone: formData.phone || null,
          email: formData.email || null,
          society_id: memberSocietyId,
        })
        .select('id')
        .single();

      if (insertError || !newMember) {
        toast({ title: 'Erro ao cadastrar membro', variant: 'destructive' });
        setCreating(false);
        return;
      }

      // 2. Generate credentials and create login
      const username = generateUsername(formData.name);
      const password = generatePassword(formData.name);

      const { data: createData, error: createError } = await supabase.functions.invoke('create-user', {
        body: {
          full_name: formData.name,
          username,
          password,
          role: 'visualizador',
          society_id: memberSocietyId,
          member_id: newMember.id,
        },
      });

      if (createError || createData?.error) {
        // Member created but login failed - still show success for member
        toast({ 
          title: 'Membro cadastrado, mas erro ao criar login', 
          description: createData?.error || createError?.message,
          variant: 'destructive' 
        });
      } else {
        // Show credentials dialog
        setCredentials({ name: formData.name, username, password });
      }

      setCreating(false);
      setDialogOpen(false);
      setFormData({ name: '', phone: '', email: '' });
      fetchMembers();
    }
  };

  const toggleMemberStatus = async (member: Member) => {
    const { error } = await supabase
      .from('members')
      .update({ active: !member.active })
      .eq('id', member.id);
    
    if (error) {
      toast({ title: 'Erro ao atualizar status', variant: 'destructive' });
    } else {
      toast({ title: member.active ? 'Membro desativado' : 'Membro ativado' });
      fetchMembers();
    }
  };

  const openEditDialog = (member: Member) => {
    setEditingMember(member);
    setFormData({
      name: member.name,
      phone: member.phone || '',
      email: member.email || '',
    });
    setDialogOpen(true);
  };

  const openNewDialog = () => {
    setEditingMember(null);
    setFormData({ name: '', phone: '', email: '' });
    setDialogOpen(true);
  };
  
  const openDeleteDialog = async (member: Member) => {
    const [chargesRes, paymentsRes] = await Promise.all([
      supabase.from('charges').select('id').eq('member_id', member.id),
      supabase.from('membership_payments').select('id').eq('member_id', member.id),
    ]);
    
    setRelatedData({
      charges: chargesRes.data?.length || 0,
      payments: paymentsRes.data?.length || 0,
    });
    setDeleteMember(member);
  };
  
  const handleDeleteMember = async () => {
    if (!deleteMember) return;
    
    await Promise.all([
      supabase.from('charges').delete().eq('member_id', deleteMember.id),
      supabase.from('membership_payments').delete().eq('member_id', deleteMember.id),
      supabase.from('transactions').update({ member_id: null }).eq('member_id', deleteMember.id),
    ]);
    
    const { error } = await supabase
      .from('members')
      .delete()
      .eq('id', deleteMember.id);
    
    if (error) {
      toast({ title: 'Erro ao excluir membro', variant: 'destructive' });
    } else {
      toast({ title: 'Membro excluído com sucesso' });
      fetchMembers();
    }
    
    setDeleteMember(null);
    setRelatedData(null);
  };

  const copyCredentials = () => {
    if (!credentials) return;
    const text = `Login: ${credentials.username}\nSenha: ${credentials.password}`;
    navigator.clipboard.writeText(text);
    toast({ title: 'Credenciais copiadas!' });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Membros Cadastrados</CardTitle>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openNewDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Membro
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingMember ? 'Editar Membro' : 'Novo Membro'}
                  </DialogTitle>
                  {!editingMember && (
                    <DialogDescription>
                      Um login será criado automaticamente para o membro.
                    </DialogDescription>
                  )}
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nome *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Nome completo"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                  {!editingMember && formData.name.trim() && (
                    <div className="p-3 rounded-md bg-muted text-sm space-y-1">
                      <p className="font-medium text-muted-foreground">Credenciais que serão geradas:</p>
                      <p>Usuário: <span className="font-mono font-medium">{generateUsername(formData.name)}</span></p>
                      <p>Senha: <span className="font-mono font-medium">{generatePassword(formData.name)}</span></p>
                    </div>
                  )}
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={creating}>
                      {creating ? 'Criando...' : editingMember ? 'Salvar' : 'Cadastrar'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-center py-8">Carregando...</p>
          ) : members.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhum membro cadastrado. Clique em "Novo Membro" para adicionar.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Login</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id} className={!member.active ? 'opacity-50' : ''}>
                    <TableCell className="font-medium">{member.name}</TableCell>
                    <TableCell>{member.phone || '-'}</TableCell>
                    <TableCell>{member.email || '-'}</TableCell>
                    <TableCell>
                      {member.user_id ? (
                        <Badge variant="outline" className="gap-1">
                          <KeyRound className="h-3 w-3" />
                          Vinculado
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={member.active ? 'default' : 'secondary'}>
                        {member.active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(member)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleMemberStatus(member)}
                        >
                          {member.active ? (
                            <UserX className="h-4 w-4 text-destructive" />
                          ) : (
                            <UserCheck className="h-4 w-4 text-success" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteDialog(member)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Credenciais Geradas */}
      <Dialog open={!!credentials} onOpenChange={() => setCredentials(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Login Criado com Sucesso!</DialogTitle>
            <DialogDescription>
              Repasse essas credenciais ao membro para que ele acesse o portal.
            </DialogDescription>
          </DialogHeader>
          {credentials && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted space-y-2">
                <p><span className="text-muted-foreground">Nome:</span> <strong>{credentials.name}</strong></p>
                <p><span className="text-muted-foreground">Usuário:</span> <span className="font-mono font-bold">{credentials.username}</span></p>
                <p><span className="text-muted-foreground">Senha:</span> <span className="font-mono font-bold">{credentials.password}</span></p>
              </div>
              <DialogFooter>
                <Button onClick={copyCredentials} className="w-full gap-2">
                  <Copy className="h-4 w-4" />
                  Copiar Credenciais
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* AlertDialog: Excluir Membro */}
      <AlertDialog open={!!deleteMember} onOpenChange={() => { setDeleteMember(null); setRelatedData(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Membro</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>Tem certeza que deseja excluir <strong>{deleteMember?.name}</strong>?</p>
                {relatedData && (relatedData.charges > 0 || relatedData.payments > 0) && (
                  <div className="p-3 bg-destructive/10 rounded-md text-sm">
                    <p className="font-medium text-destructive">Atenção: Este membro possui dados relacionados!</p>
                    <ul className="list-disc list-inside mt-1">
                      {relatedData.charges > 0 && <li>{relatedData.charges} cobrança(s)</li>}
                      {relatedData.payments > 0 && <li>{relatedData.payments} pagamento(s)</li>}
                    </ul>
                    <p className="mt-2">Todos esses registros serão excluídos permanentemente.</p>
                  </div>
                )}
                <p className="text-sm text-muted-foreground">Esta ação não pode ser desfeita.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMember} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
