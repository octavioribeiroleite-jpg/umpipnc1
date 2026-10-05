import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Download, Loader2, Trash2 } from 'lucide-react';

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
  const [newName, setNewName] = useState('');
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
    setSaving(true);
    await supabase
      .from('elections' as any)
      .update({ total_present: presentCount } as any)
      .eq('id', electionId);
    toast({ title: `Presença confirmada: ${presentCount} presentes` });
    setSaving(false);
    onRefresh();
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          aria-label="Nome do membro" placeholder="Nome do membro"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          disabled={disabled}
          className="h-11 min-w-0"
        />
        <Button size="icon" className="h-11 w-11 shrink-0" aria-label="Adicionar membro à presença" onClick={handleAdd} disabled={disabled}>
          <Plus className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" className="h-11 shrink-0" aria-label="Importar membros" onClick={handleImportMembers} disabled={importing || disabled}>
          {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
        </Button>
      </div>

      <div className="space-y-1 max-h-[50dvh] overflow-y-auto rounded-xl border border-border p-2">
        {attendance.map((item) => {
          const isPresent = optimisticOverrides[item.id] !== undefined
            ? optimisticOverrides[item.id]
            : item.present;
          return (
            <div key={item.id} className="flex min-h-11 items-center gap-3 py-1 px-1.5 rounded hover:bg-muted/50">
              <Checkbox
                id={`attendance-${item.id}`}
                aria-label={`Presença de ${item.name}`}
                checked={isPresent}
                onCheckedChange={(checked) => handleToggle(item.id, !!checked)}
                disabled={disabled}
              />
              <label htmlFor={`attendance-${item.id}`} className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center break-words text-sm">{item.name}</label>
              {!disabled && (
                <Button variant="ghost" size="icon" className="h-11 w-11 text-destructive shrink-0" aria-label={`Remover ${item.name} da lista`} onClick={() => handleRemove(item.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {attendance.length > 0 && (
        <div className="space-y-2 pt-2 border-t">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-medium">
              Presentes: <strong className="text-primary">{presentCount}</strong>/{attendance.length}
            </span>
            <Badge variant={presentCount > attendance.length / 2 ? 'default' : 'destructive'} className="text-xs">
              {presentCount > attendance.length / 2 ? 'Quórum atingido' : 'Sem quórum'}
            </Badge>
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={handleConfirmPresence} disabled={saving || disabled}>
              {saving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              Confirmar Presença
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
