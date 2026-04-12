import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Trash2, Users, Search, Loader2, UserPlus } from 'lucide-react';

interface Member {
  id: string;
  name: string;
  active: boolean;
}

export function MembrosTab() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();
  const { isManagement } = useAuth();

  const fetchMembers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('members')
      .select('id, name, active')
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

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast({ title: 'Informe o nome do membro', variant: 'destructive' });
      return;
    }

    setCreating(true);

    // Get society_id from current user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('society_id')
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id || '')
      .maybeSingle();

    const { error } = await supabase.from('members').insert({
      name: newName.trim(),
      society_id: profile?.society_id || null,
    });

    if (error) {
      toast({ title: 'Erro ao adicionar membro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Membro adicionado!' });
      setDialogOpen(false);
      setNewName('');
      fetchMembers();
    }
    setCreating(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);

    // First delete any plenary_attendance records for this member
    await supabase.from('plenary_attendance').delete().eq('member_id', deleteId);

    const { error } = await supabase.from('members').delete().eq('id', deleteId);

    if (error) {
      toast({ title: 'Erro ao excluir membro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Membro excluído' });
      fetchMembers();
    }
    setDeleteId(null);
    setDeleting(false);
  };

  const handleToggleActive = async (member: Member) => {
    const { error } = await supabase
      .from('members')
      .update({ active: !member.active })
      .eq('id', member.id);

    if (error) {
      toast({ title: 'Erro ao atualizar', variant: 'destructive' });
    } else {
      setMembers(prev =>
        prev.map(m => m.id === member.id ? { ...m, active: !m.active } : m)
      );
    }
  };

  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = members.filter(m => m.active).length;

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header info */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-5 w-5" />
              <span className="font-medium">{activeCount} membros ativos</span>
              <span className="text-sm">/ {members.length} total</span>
            </div>
            {isManagement && (
              <Button size="sm" onClick={() => setDialogOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      {members.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar membro..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {/* Members list */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title="Nenhum membro encontrado"
          description={search ? 'Tente outro termo de busca.' : 'Adicione membros para começar.'}
        />
      ) : (
        <div className="space-y-1">
          {filtered.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                    member.active ? 'bg-green-500' : 'bg-muted-foreground/40'
                  }`}
                />
                <span className={`font-medium truncate ${!member.active ? 'text-muted-foreground line-through' : ''}`}>
                  {member.name}
                </span>
              </div>
              {isManagement && (
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleActive(member)}
                    className="text-xs"
                  >
                    {member.active ? 'Desativar' : 'Ativar'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive h-8 w-8"
                    onClick={() => setDeleteId(member.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add member dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Membro</DialogTitle>
          </DialogHeader>
          <div>
            <Label>Nome completo</Label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ex: João da Silva"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
          </div>
          <DialogFooter>
            <Button onClick={handleCreate} disabled={creating}>
              {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir membro?</AlertDialogTitle>
            <AlertDialogDescription>
              O membro será removido permanentemente, incluindo seus registros de presença em plenárias.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
