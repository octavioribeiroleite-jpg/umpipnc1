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
import { Plus, Pencil, UserX, UserCheck, Trash2 } from 'lucide-react';

interface Member {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  active: boolean;
}

interface RelatedData {
  charges: number;
  payments: number;
}

export function MembrosTab() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '' });
  const [deleteMember, setDeleteMember] = useState<Member | null>(null);
  const [relatedData, setRelatedData] = useState<RelatedData | null>(null);
  const { toast } = useToast();

  const fetchMembers = async () => {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .order('name');
    
    if (error) {
      toast({ title: 'Erro ao carregar membros', variant: 'destructive' });
    } else {
      setMembers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMembers();
  }, []);

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
    } else {
      const { error } = await supabase
        .from('members')
        .insert({
          name: formData.name,
          phone: formData.phone || null,
          email: formData.email || null,
        });
      
      if (error) {
        toast({ title: 'Erro ao cadastrar membro', variant: 'destructive' });
      } else {
        toast({ title: 'Membro cadastrado com sucesso' });
        fetchMembers();
      }
    }

    setDialogOpen(false);
    setEditingMember(null);
    setFormData({ name: '', phone: '', email: '' });
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
    // Check for related data
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
    
    // Delete related data first
    await Promise.all([
      supabase.from('charges').delete().eq('member_id', deleteMember.id),
      supabase.from('membership_payments').delete().eq('member_id', deleteMember.id),
      supabase.from('transactions').update({ member_id: null }).eq('member_id', deleteMember.id),
    ]);
    
    // Delete the member
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
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit">
                      {editingMember ? 'Salvar' : 'Cadastrar'}
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
