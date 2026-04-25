import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { QRCodeSVG } from 'qrcode.react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, Monitor, Loader2, QrCode, Copy, CheckCircle, Clock } from 'lucide-react';

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
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const { toast } = useToast();

  const getDeviceUrl = (token: string) => `${window.location.origin}/vote/${electionId}?mode=urna&token=${token}`;

  const copyDeviceLink = async (device: Device) => {
    await navigator.clipboard.writeText(getDeviceUrl(device.token));
    toast({ title: 'Link da urna copiado!' });
  };

  const handleAdd = async () => {
    if (!label.trim()) return;
    setAdding(true);
    const { error } = await supabase
      .from('election_devices' as any)
      .insert({
        election_id: electionId,
        label: label.trim(),
        token: crypto.randomUUID(),
        activated: false,
      } as any);

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
    if (!window.confirm('Remover este dispositivo? O link da urna deixará de funcionar.')) return;
    const { error } = await supabase
      .from('election_devices' as any)
      .delete()
      .eq('id', id);
    if (error) {
      toast({ title: 'Erro ao remover dispositivo', variant: 'destructive' });
      return;
    }
    toast({ title: 'Dispositivo removido' });
    onRefresh();
  };

  useEffect(() => {
    const channel = supabase
      .channel(`devices-${electionId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'election_devices',
        filter: `election_id=eq.${electionId}`,
      }, () => onRefresh())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [electionId]);

  return (
    <div className="space-y-3">
      {!disabled && (
        <div className="flex flex-col gap-2 mb-4">
          <Label className="text-sm font-medium">Adicionar urna</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Rótulo (ex: Mesa 1, Entrada)"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              className="h-9 text-sm"
            />
            <Button
              onClick={handleAdd}
              disabled={adding || !label.trim()}
              size="sm"
              className="shrink-0"
            >
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
              Adicionar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            ℹ️ Cada urna gera um link e QR Code exclusivo para o dispositivo físico.
          </p>
        </div>
      )}

      {devices.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">
          Nenhum dispositivo cadastrado. Adicione urnas fixas acima.
        </p>
      ) : (
        <div className="space-y-2">
          {devices.map((d) => (
            <div key={d.id} className="rounded-lg border border-border bg-muted/30 px-3 py-2 space-y-2">
              <div className="flex items-center gap-2">
                <Monitor className="h-4 w-4 text-primary shrink-0" />
                <span className="text-sm font-semibold text-foreground flex-1">{d.label}</span>
                {d.activated ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-success bg-success/15 px-2 py-0.5 rounded-full">
                    <CheckCircle className="w-3 h-3" /> Online
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-medium text-warning bg-warning/15 px-2 py-0.5 rounded-full">
                    <Clock className="w-3 h-3" /> Aguardando
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setSelectedDevice(d)}>
                  <QrCode className="h-3.5 w-3.5 mr-1" /> Mostrar QR Code
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => copyDeviceLink(d)}>
                  <Copy className="h-3.5 w-3.5 mr-1" /> Copiar link
                </Button>
                {!disabled && (
                  <Button variant="ghost" size="sm" className="h-8 text-xs text-destructive hover:text-destructive" onClick={() => handleRemove(d.id)}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Remover
                  </Button>
                )}
              </div>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">{devices.length} dispositivo(s) cadastrado(s)</p>
        </div>
      )}
      <Dialog open={!!selectedDevice} onOpenChange={(open) => !open && setSelectedDevice(null)}>
        <DialogContent className="sm:max-w-md bg-background">
          <DialogHeader>
            <DialogTitle>{selectedDevice?.label || 'Urna'}</DialogTitle>
          </DialogHeader>
          {selectedDevice && (
            <div className="flex flex-col items-center gap-4 py-3">
              <div className="rounded-xl border border-border bg-background p-4 shadow-sm">
                <QRCodeSVG value={getDeviceUrl(selectedDevice.token)} size={240} />
              </div>
              <code className="w-full rounded-lg bg-muted p-3 text-xs text-center break-all text-foreground">
                {getDeviceUrl(selectedDevice.token)}
              </code>
              <Button className="w-full" onClick={() => copyDeviceLink(selectedDevice)}>
                <Copy className="h-4 w-4 mr-2" /> Copiar link da urna
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
