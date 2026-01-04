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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, UserX, UserCheck } from 'lucide-react';

interface Member {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  active: boolean;
}

export function MembrosTab() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '' });
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

  return (
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
                    <div className="flex justify-end gap-2">
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
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}