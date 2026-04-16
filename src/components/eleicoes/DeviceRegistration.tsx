import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Monitor, Loader2 } from 'lucide-react';

interface Device {
  id: string;
  label: string;
  token: string;
  activated: boolean;
}

interface DeviceRegistrationProps {
  electionId: string;
  devices: Device[];
  onRefresh: () => void;
  disabled: boolean;
}

export function DeviceRegistration({ electionId, devices, onRefresh, disabled }: DeviceRegistrationProps) {
  const [label, setLabel] = useState('');
  const [adding, setAdding] = useState(false);
  const { toast } = useToast();

  const handleAdd = async () => {
    if (!label.trim()) return;
    setAdding(true);
    const { error } = await supabase
      .from('election_devices' as any)
      .insert({ election_id: electionId, label: label.trim() } as any);

    if (error) {
      toast({ title: 'Erro ao adicionar dispositivo', variant: 'destructive' });
    } else {
      toast({ title: 'Dispositivo cadastrado!' });
      setLabel('');
      onRefresh();
    }
    setAdding(false);
  };

  const handleRemove = async (id: string) => {
    await supabase.from('election_devices' as any).delete().eq('id', id);
    toast({ title: 'Dispositivo removido' });
    onRefresh();
  };

  return (
    <div className="space-y-3">
      {!disabled && (
        <div className="flex gap-2">
          <Input
            placeholder="Rótulo (ex: Mesa 1, Entrada)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            className="h-9 text-sm"
          />
          <Button size="sm" onClick={handleAdd} disabled={adding || !label.trim()} className="h-9 shrink-0">
            {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
            Adicionar
          </Button>
        </div>
      )}

      {devices.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">
          Nenhum dispositivo cadastrado. Adicione urnas fixas acima.
        </p>
      ) : (
        <div className="space-y-2">
          {devices.map((d) => (
            <div key={d.id} className="flex items-center gap-2 p-2.5 border border-border/60 bg-muted/40 rounded-lg">
              <Monitor className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium flex-1">{d.label}</span>
              {d.activated ? (
                <span className="text-[10px] text-success font-medium">Ativada</span>
              ) : (
                <span className="text-[10px] text-muted-foreground">Cadastrada</span>
              )}
              {!disabled && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemove(d.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              )}
            </div>
          ))}
          <p className="text-xs text-muted-foreground">{devices.length} dispositivo(s) cadastrado(s)</p>
        </div>
      )}
    </div>
  );
}
