import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { AppCard } from '@/components/ui/app-card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Plus, ClipboardCheck, Trash2, Loader2, Users, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MembrosTab } from '@/components/plenarias/MembrosTab';

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
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'plenarias';
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

        return { ...p, total_count: totalCount || 0, present_count: presentCount || 0 };
      })
    );

    setPlenaries(withCounts);
    setLoading(false);
  };

  useEffect(() => { fetchPlenaries(); }, []);

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

  const handleTabChange = (tab: string) => {
    setSearchParams({ tab });
  };

  return (
    <AppLayout>
      <PageHeader
        title="Plenárias"
        description="Chamada de presença e gestão de membros"
      />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="plenarias" className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" />
            Plenárias
          </TabsTrigger>
          <TabsTrigger value="membros" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Membros
          </TabsTrigger>
        </TabsList>

        <TabsContent value="plenarias" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Nova Plenária
            </Button>
          </div>

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : plenaries.length === 0 ? (
            <EmptyState
              icon={<ClipboardCheck className="h-12 w-12" />}
              title="Nenhuma plenária registrada"
              description="Crie uma nova plenária para iniciar a chamada."
            />
          ) : (
            <div className="grid gap-3">
              {plenaries.map((p) => {
                const pct = p.total_count ? Math.round((p.present_count! / p.total_count) * 100) : 0;
                return (
                  <AppCard
                    key={p.id}
                    variant="interactive"
                    onClick={() => navigate(`/plenarias/${p.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold min-w-0 whitespace-normal break-words">{p.title}</h3>
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
                        onClick={(e) => { e.stopPropagation(); setDeleteId(p.id); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </AppCard>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="membros">
          <MembrosTab />
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Plenária</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Plenária Ordinária - Fevereiro" />
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

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir plenária?</AlertDialogTitle>
            <AlertDialogDescription>Todos os registros de presença serão perdidos.</AlertDialogDescription>
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
