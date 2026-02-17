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
import { Plus, ClipboardCheck, Trash2, Loader2, Users, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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

interface Plenary {
  id: string;
  title: string;
  date: string;
  created_at: string;
  quorum_required: number;
  present_count?: number;
  total_count?: number;
}

export default function Plenarias() {
  const [plenaries, setPlenaries] = useState<Plenary[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  const fetchPlenaries = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('plenaries')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      toast({ title: 'Erro ao carregar plenárias', variant: 'destructive' });
      setLoading(false);
      return;
    }

    // Get attendance counts
    const withCounts = await Promise.all(
      (data || []).map(async (p) => {
        const { count: totalCount } = await supabase
          .from('plenary_attendance')
          .select('*', { count: 'exact', head: true })
          .eq('plenary_id', p.id);

        const { count: presentCount } = await supabase
          .from('plenary_attendance')
          .select('*', { count: 'exact', head: true })
          .eq('plenary_id', p.id)
          .eq('present', true);

        return {
          ...p,
          total_count: totalCount || 0,
          present_count: presentCount || 0,
        };
      })
    );

    setPlenaries(withCounts);
    setLoading(false);
  };

  useEffect(() => {
    fetchPlenaries();
  }, []);

  const handleCreate = async () => {
    if (!title.trim()) {
      toast({ title: 'Informe o título', variant: 'destructive' });
      return;
    }
    setCreating(true);
    const { error } = await supabase.from('plenaries').insert({
      title: title.trim(),
      date: new Date(date + 'T10:00:00').toISOString(),
      created_by: user!.id,
    });

    if (error) {
      toast({ title: 'Erro ao criar plenária', variant: 'destructive' });
    } else {
      toast({ title: 'Plenária criada!' });
      setDialogOpen(false);
      setTitle('');
      fetchPlenaries();
    }
    setCreating(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('plenaries').delete().eq('id', deleteId);
    if (error) {
      toast({ title: 'Erro ao excluir', variant: 'destructive' });
    } else {
      toast({ title: 'Plenária excluída' });
      fetchPlenaries();
    }
    setDeleteId(null);
  };

  return (
    <AppLayout>
      <PageHeader
        title="Plenárias"
        description="Chamada de presença para plenárias da UMP"
        action={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Nova Plenária
          </Button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : plenaries.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <ClipboardCheck className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1">Nenhuma plenária registrada</h3>
            <p className="text-muted-foreground text-sm">Crie uma nova plenária para iniciar a chamada.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {plenaries.map((p) => {
            const pct = p.total_count ? Math.round((p.present_count! / p.total_count) * 100) : 0;
            return (
              <Card
                key={p.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => navigate(`/plenarias/${p.id}`)}
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{p.title}</h3>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {format(new Date(p.date), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                      {p.total_count! > 0 && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {p.present_count}/{p.total_count} ({pct}%)
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteId(p.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Plenária</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Plenária Ordinária - Fevereiro"
              />
            </div>
            <div>
              <Label>Data</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
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

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir plenária?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os registros de presença serão perdidos.
            </AlertDialogDescription>
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
