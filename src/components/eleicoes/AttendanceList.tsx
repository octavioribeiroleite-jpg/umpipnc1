import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
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
  const { toast } = useToast();

  const presentCount = attendance.filter((a) => a.present).length;

  const handleToggle = async (id: string, present: boolean) => {
    await supabase.from('election_attendance' as any).update({ present } as any).eq('id', id);
    onRefresh();
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
          placeholder="Nome do membro"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          disabled={disabled}
          className="h-9"
        />
        <Button size="icon" className="h-9 w-9 shrink-0" onClick={handleAdd} disabled={disabled}>
          <Plus className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" className="h-9 shrink-0" onClick={handleImportMembers} disabled={importing || disabled}>
          {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
        </Button>
      </div>

      <div className="space-y-0.5 max-h-60 overflow-y-auto">
        {attendance.map((item) => (
          <div key={item.id} className="flex items-center gap-2 py-1 px-1.5 rounded hover:bg-muted/50">
            <Checkbox
              checked={item.present}
              onCheckedChange={(checked) => handleToggle(item.id, !!checked)}
              disabled={disabled}
            />
            <span className="flex-1 text-sm truncate">{item.name}</span>
            {!disabled && (
              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive shrink-0" onClick={() => handleRemove(item.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {attendance.length > 0 && (
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-xs font-medium">
            Presentes: <strong className="text-primary">{presentCount}</strong>/{attendance.length}
          </span>
          <Button size="sm" onClick={handleConfirmPresence} disabled={saving || disabled}>
            {saving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
            Confirmar
          </Button>
        </div>
      )}
    </div>
  );
}
