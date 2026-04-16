import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Vote, Loader2, Shirt } from 'lucide-react';
import { FAB } from '@/components/ui/fab';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  const [electionType, setElectionType] = useState<'cargo' | 'camisa'>('cargo');
  const [creating, setCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<'cargo' | 'camisa'>('cargo');
  const { toast } = useToast();
  const { user, isAdmin, isPastor } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAdmin && !isPastor) navigate('/');
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

  useEffect(() => { fetchElections(); fetchSocieties(); }, []);

  const handleCreate = async () => {
    if (!name.trim() || !position.trim()) {
      toast({ title: 'Preencha nome e cargo', variant: 'destructive' });
      return;
    }
    setCreating(true);
    const normalizedSocietyId = societyId && societyId !== 'general' ? societyId : null;
    const { error } = await supabase.from('elections' as any).insert({
      name: name.trim(),
      position: position.trim(),
      society_id: normalizedSocietyId,
      created_by: user!.id,
      type: electionType,
    } as any);

    if (error) {
      toast({ title: 'Erro ao criar eleição', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Eleição criada!' });
      setDialogOpen(false);
      setName(''); setPosition(''); setSocietyId(''); setElectionType('cargo');
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

  const filtered = elections.filter(e => (e.type || 'cargo') === activeTab);

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

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'cargo' | 'camisa')} className="mb-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="cargo"><Vote className="h-4 w-4 mr-1.5" /> Cargos</TabsTrigger>
          <TabsTrigger value="camisa"><Shirt className="h-4 w-4 mr-1.5" /> Camisas</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={activeTab === 'camisa' ? <Shirt className="h-12 w-12" /> : <Vote className="h-12 w-12" />}
          title={activeTab === 'camisa' ? 'Nenhuma votação de camisa' : 'Nenhuma eleição registrada'}
          description={activeTab === 'camisa' ? 'Crie uma votação para escolher o modelo da camisa.' : 'Crie uma nova eleição para começar.'}
        />
      ) : (
        <div className="grid gap-3">
          {filtered.map((e) => (
            <ElectionCard key={e.id} election={e} onClick={() => navigate(`/eleicoes/${e.id}`)} onDelete={(id) => setDeleteId(id)} />
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{electionType === 'camisa' ? 'Nova Votação de Camisa' : 'Nova Eleição'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tipo</Label>
              <Select value={electionType} onValueChange={(v) => setElectionType(v as 'cargo' | 'camisa')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cargo">Eleição de Cargo</SelectItem>
                  <SelectItem value="camisa">Votação de Camisa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{electionType === 'camisa' ? 'Nome da Votação' : 'Nome da Eleição'}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={electionType === 'camisa' ? 'Ex: Camisa UMP 2025' : 'Ex: Eleição Diretoria 2025'} />
            </div>
            <div>
              <Label>{electionType === 'camisa' ? 'Descrição' : 'Cargo'}</Label>
              <Input value={position} onChange={(e) => setPosition(e.target.value)} placeholder={electionType === 'camisa' ? 'Ex: Escolha do modelo' : 'Ex: Presidente'} />
            </div>
            <div>
              <Label>Sociedade {electionType === 'cargo' ? '(opcional)' : ''}</Label>
              <Select value={societyId} onValueChange={setSocietyId}>
                <SelectTrigger><SelectValue placeholder="Geral (toda a igreja)" /></SelectTrigger>
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
