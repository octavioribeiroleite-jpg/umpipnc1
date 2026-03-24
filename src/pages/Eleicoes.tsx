import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Vote, Loader2, Trash2 } from 'lucide-react';
import { FAB } from '@/components/ui/fab';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ElectionCard } from '@/components/eleicoes/ElectionCard';

interface Election {
  id: string;
  name: string;
  position: string;
  status: string;
  total_present: number;
  society_id: string | null;
  created_by: string;
  created_at: string;
  vote_count?: number;
  type?: string;
}

interface Society {
  id: string;
  name: string;
}

export default function Eleicoes() {
  const [elections, setElections] = useState<Election[]>([]);
  const [societies, setSocieties] = useState<Society[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [societyId, setSocietyId] = useState<string>('');
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();
  const { user, isAdmin, isPastor } = useAuth();
  const navigate = useNavigate();

  // Only admin and pastor can access elections
  useEffect(() => {
    if (!isAdmin && !isPastor) {
      navigate('/');
    }
  }, [isAdmin, isPastor, navigate]);

  const fetchElections = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('elections' as any)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Erro ao carregar eleições', variant: 'destructive' });
      setLoading(false);
      return;
    }

    const withCounts = await Promise.all(
      ((data as any[]) || []).map(async (e: any) => {
        const { count } = await supabase
          .from('election_votes' as any)
          .select('*', { count: 'exact', head: true })
          .eq('election_id', e.id);
        return { ...e, vote_count: count || 0 };
      })
    );

    setElections(withCounts);
    setLoading(false);
  };

  const fetchSocieties = async () => {
    const { data } = await supabase.from('societies').select('id, name').eq('active', true);
    setSocieties(data || []);
  };

  useEffect(() => {
    fetchElections();
    fetchSocieties();
  }, []);

  const handleCreate = async () => {
    if (!name.trim() || !position.trim()) {
      toast({ title: 'Preencha nome e cargo', variant: 'destructive' });
      return;
    }
    setCreating(true);
    const { error } = await supabase.from('elections' as any).insert({
      name: name.trim(),
      position: position.trim(),
      society_id: societyId || null,
      created_by: user!.id,
    } as any);

    if (error) {
      toast({ title: 'Erro ao criar eleição', variant: 'destructive' });
    } else {
      toast({ title: 'Eleição criada!' });
      setDialogOpen(false);
      setName('');
      setPosition('');
      setSocietyId('');
      fetchElections();
    }
    setCreating(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('elections' as any).delete().eq('id', deleteId);
    if (error) {
      toast({ title: 'Erro ao excluir', variant: 'destructive' });
    } else {
      toast({ title: 'Eleição excluída' });
      fetchElections();
    }
    setDeleteId(null);
  };

  return (
    <AppLayout>
      <PageHeader
        title="Eleições"
        description="Votações digitais — modelo papel digital"
        action={
          <Button onClick={() => setDialogOpen(true)} className="hidden md:inline-flex">
            <Plus className="h-4 w-4 mr-2" /> Nova Eleição
          </Button>
        }
      />

      <FAB onClick={() => setDialogOpen(true)} />

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : elections.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Vote className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1">Nenhuma eleição registrada</h3>
            <p className="text-muted-foreground text-sm">Crie uma nova eleição para começar.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {elections.map((e) => (
            <ElectionCard
              key={e.id}
              election={e}
              onClick={() => navigate(`/eleicoes/${e.id}`)}
              onDelete={(id) => setDeleteId(id)}
            />
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Eleição</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome da Eleição</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Eleição Diretoria 2025" />
            </div>
            <div>
              <Label>Cargo</Label>
              <Input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="Ex: Presidente" />
            </div>
            <div>
              <Label>Sociedade (opcional)</Label>
              <Select value={societyId} onValueChange={setSocietyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Geral (toda a igreja)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">Geral (toda a igreja)</SelectItem>
                  {societies.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCreate} disabled={creating}>
              {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir eleição?</AlertDialogTitle>
            <AlertDialogDescription>Todos os votos, candidatos e presença serão perdidos.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
