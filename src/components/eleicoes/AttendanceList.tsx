import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Download, Loader2, Users, Trash2 } from 'lucide-react';

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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" /> Chamada de Presença
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleImportMembers} disabled={importing || disabled}>
            {importing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
            Importar Membros
          </Button>
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Nome do membro"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            disabled={disabled}
          />
          <Button size="icon" onClick={handleAdd} disabled={disabled}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-1 max-h-80 overflow-y-auto">
          {attendance.map((item) => (
            <div key={item.id} className="flex items-center gap-3 py-2 px-2 rounded hover:bg-muted/50">
              <Checkbox
                checked={item.present}
                onCheckedChange={(checked) => handleToggle(item.id, !!checked)}
                disabled={disabled}
              />
              <span className="flex-1 text-sm">{item.name}</span>
              {!disabled && (
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleRemove(item.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>

        {attendance.length > 0 && (
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-sm font-medium">
              Presentes: <strong className="text-primary">{presentCount}</strong> / {attendance.length}
            </span>
            <Button onClick={handleConfirmPresence} disabled={saving || disabled}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Confirmar Presença
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
