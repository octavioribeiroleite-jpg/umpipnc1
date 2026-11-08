import { useEffect, useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { readElectionCount } from '@/lib/election-completion';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Download, Loader2, Trash2, Search, Users } from 'lucide-react';

interface AttendanceItem {
  id: string;
  name: string;
  present: boolean;
}

interface AttendanceListProps {
  electionId: string;
  societyId: string | null;
  attendance: AttendanceItem[];
  onRefresh: () => void;
  disabled?: boolean;
}

export function AttendanceList({ electionId, societyId, attendance, onRefresh, disabled }: AttendanceListProps) {
  const nameId = useId();
  const [newName, setNewName] = useState('');
  const [search, setSearch] = useState('');
  const [importing, setImporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [optimisticOverrides, setOptimisticOverrides] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  // Limpa cada override SOMENTE quando o item do parent já reflete o valor otimista.
  // Isso evita o "piscar" entre apagar o override e o onRefresh trazer o dado novo.
  useEffect(() => {
    setOptimisticOverrides((prev) => {
      const next: Record<string, boolean> = {};
      let changed = false;
      for (const [id, value] of Object.entries(prev)) {
        const item = attendance.find((a) => a.id === id);
        if (item && item.present === value) {
          changed = true; // descarta — parent já está sincronizado
        } else {
          next[id] = value;
        }
      }
      return changed ? next : prev;
    });
  }, [attendance]);

  const presentCount = attendance.filter((a) =>
    optimisticOverrides[a.id] !== undefined ? optimisticOverrides[a.id] : a.present
  ).length;
  const normalizedSearch = search.trim().normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('pt-BR');
  const visibleAttendance = attendance.filter(person => person.name.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('pt-BR').includes(normalizedSearch));

  const handleToggle = async (id: string, present: boolean) => {
    // 1. Optimistic update — UI atualiza instantaneamente
    setOptimisticOverrides((prev) => ({ ...prev, [id]: present }));

    // 2. Persiste no banco em segundo plano
    const { error } = await supabase
      .from('election_attendance' as any)
      .update({ present } as any)
      .eq('id', id);

    if (error) {
      // Reverte se falhar
      setOptimisticOverrides((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      toast({ title: 'Erro ao atualizar presença', variant: 'destructive' });
    } else {
      // Mantém o override até o useEffect detectar que o parent sincronizou.
      onRefresh();
    }
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await supabase.from('election_attendance' as any).insert({
      election_id: electionId,
      name: newName.trim(),
      present: false,
    } as any);
    setNewName('');
    onRefresh();
  };

  const handleRemove = async (id: string) => {
    await supabase.from('election_attendance' as any).delete().eq('id', id);
    onRefresh();
  };

  const handleImportMembers = async () => {
    setImporting(true);
    let query = supabase.from('members').select('name').eq('active', true);
    if (societyId) query = query.eq('society_id', societyId);
    const { data } = await query;

    if (data && data.length > 0) {
      const existingNames = new Set(attendance.map((a) => a.name.toLowerCase()));
      const newMembers = data.filter((m) => !existingNames.has(m.name.toLowerCase()));
      if (newMembers.length > 0) {
        await supabase.from('election_attendance' as any).insert(
          newMembers.map((m) => ({
            election_id: electionId,
            name: m.name,
            present: false,
          })) as any
        );
        toast({ title: `${newMembers.length} membros importados` });
        onRefresh();
      } else {
        toast({ title: 'Todos os membros já estão na lista' });
      }
    } else {
      toast({ title: 'Nenhum membro encontrado', variant: 'destructive' });
    }
    setImporting(false);
  };

  const handleConfirmPresence = async () => {
    if (saving || disabled) return;
    setSaving(true);
    try {
      const snapshot = await readElectionCount(supabase, electionId);
      if (snapshot.election.status !== 'draft') throw new Error('A chamada só pode ser confirmada antes da votação.');
      const { data, error } = await supabase.from('elections').update({ total_present: snapshot.present })
        .eq('id', electionId).eq('status', 'draft').select('id').single();
      if (error || !data) throw error || new Error('Não foi possível confirmar a chamada.');
      toast({ title: `Presença confirmada: ${snapshot.present} presentes` });
      onRefresh();
    } catch (cause) {
      toast({ title: 'Chamada não confirmada', description: cause instanceof Error ? cause.message : 'Confira a conexão e tente novamente.', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
      <Label htmlFor={nameId}>Nome do membro</Label>
      <div className="flex flex-wrap gap-2">
        <Input id={nameId}
          aria-label="Nome do membro" placeholder="Nome do membro"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          disabled={disabled}
          className="min-h-[48px] min-w-0 flex-1 basis-[180px] text-base"
        />
        <Button size="icon" className="min-h-[48px] min-w-[48px] shrink-0" aria-label="Adicionar membro à presença" onClick={handleAdd} disabled={disabled}>
          <Plus className="h-4 w-4" />
        </Button>
        <Button variant="outline" className="min-h-12 w-full gap-2 sm:w-auto" aria-label="Importar membros" onClick={handleImportMembers} disabled={importing || disabled}>
          {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          Importar membros
        </Button>
      </div>
      </div>

      {attendance.length > 0 && <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input aria-label="Buscar na chamada" placeholder="Buscar na chamada" value={search} onChange={event => setSearch(event.target.value)} className="min-h-12 pl-10" />
      </div>}
      <div role="region" aria-label="Lista de presença" tabIndex={attendance.length > 0 ? 0 : undefined} className="max-h-[min(42dvh,360px)] overflow-y-auto overscroll-contain rounded-xl border border-border divide-y divide-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {visibleAttendance.map((item) => {
          const isPresent = optimisticOverrides[item.id] !== undefined
            ? optimisticOverrides[item.id]
            : item.present;
          return (
            <div key={item.id} className={`flex min-h-14 items-center gap-3 px-3 transition-colors motion-reduce:transition-none ${isPresent ? 'bg-primary/5' : 'hover:bg-muted/40'}`}>
              <Checkbox
                id={`attendance-${item.id}`}
                aria-label={`Presença de ${item.name}`}
                checked={isPresent}
                onCheckedChange={(checked) => handleToggle(item.id, !!checked)}
                disabled={disabled}
              />
              <label htmlFor={`attendance-${item.id}`} className="flex min-h-[48px] min-w-0 flex-1 cursor-pointer items-center [overflow-wrap:anywhere] text-base">{item.name}</label>
              {!disabled && (
                <Button variant="ghost" size="icon" className="min-h-[48px] min-w-[48px] text-destructive shrink-0" aria-label={`Remover ${item.name} da lista`} onClick={() => handleRemove(item.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          );
        })}
        {visibleAttendance.length === 0 && <div className="flex flex-col items-center gap-2 p-6 text-center text-sm text-muted-foreground"><Users className="h-6 w-6" /><p>{attendance.length === 0 ? 'Adicione nomes ou importe os membros para começar a chamada.' : 'Nenhum nome encontrado nesta busca.'}</p></div>}
      </div>

      {attendance.length > 0 && (
        <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-3 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium">
              Presentes: <strong className="text-primary">{presentCount}</strong>/{attendance.length}
            </span>
            <Badge variant={presentCount > attendance.length / 2 ? 'default' : 'destructive'} className="text-xs">
              {presentCount > attendance.length / 2 ? 'Quórum atingido' : 'Sem quórum'}
            </Badge>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" className="w-full sm:w-auto" onClick={handleConfirmPresence} disabled={saving || disabled}>
              {saving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              Confirmar Presença
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
