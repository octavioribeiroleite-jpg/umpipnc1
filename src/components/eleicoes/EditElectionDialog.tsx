import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EditElectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  election: {
    id: string;
    name?: string;
    position?: string;
    type?: string;
    seats_count?: number;
    max_choices_per_ballot?: number;
    voting_mode?: string;
    majority_rule?: string;
  };
  onSaved: () => void;
}

export function EditElectionDialog({ open, onOpenChange, election, onSaved }: EditElectionDialogProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(election.name || '');
  const [position, setPosition] = useState(election.position || '');
  const [seatsCount, setSeatsCount] = useState<string>(String(election.seats_count || 1));
  const [maxChoices, setMaxChoices] = useState<string>(String(election.max_choices_per_ballot || 1));
  const [votingMode, setVotingMode] = useState(election.voting_mode || 'shared');
  const [majorityRule, setMajorityRule] = useState(election.majority_rule || 'simple');

  const isCargo = (election.type || 'cargo') === 'cargo';

  // Reset ao abrir — depende APENAS de `open` para não sobrescrever
  // o que o usuário está digitando quando `election` é refetch (realtime).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (open) {
      setName(election.name || '');
      setPosition(election.position || '');
      setSeatsCount(String(election.seats_count ?? 1));
      setMaxChoices(String(election.max_choices_per_ballot ?? 1));
      setVotingMode(election.voting_mode || 'shared');
      setMajorityRule(election.majority_rule || 'simple');
    }
  }, [open]);

  // (clamp acontece apenas ao salvar, para não mexer enquanto o usuário digita)

  const handleSave = async () => {
    if (!name.trim() || !position.trim()) {
      toast({ title: 'Preencha nome e cargo', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const payload: any = {
      name: name.trim(),
      position: position.trim(),
      voting_mode: votingMode,
    };
    if (isCargo) {
      const seatsNum = Math.max(1, parseInt(seatsCount, 10) || 1);
      const choicesNum = Math.min(Math.max(1, parseInt(maxChoices, 10) || 1), seatsNum);
      payload.seats_count = seatsNum;
      payload.max_choices_per_ballot = choicesNum;
      payload.majority_rule = majorityRule;
    }

    const { error } = await supabase
      .from('elections' as any)
      .update(payload as any)
      .eq('id', election.id);

    setSaving(false);
    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Configuração atualizada' });
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar configuração da votação</DialogTitle>
          <DialogDescription className="text-xs">
            Altere os dados básicos da eleição. Os votos já registrados serão mantidos.
            Para gerenciar candidatos, use a etapa "Candidatos" abaixo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-name" className="text-xs">Nome da eleição</Label>
            <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-position" className="text-xs">
              {isCargo ? 'Cargo / Posição' : 'Descrição'}
            </Label>
            <Input id="edit-position" value={position} onChange={(e) => setPosition(e.target.value)} />
          </div>

          {isCargo && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-seats" className="text-xs">Vagas disponíveis</Label>
                  <Input
                    id="edit-seats"
                    type="number"
                    min={1}
                    value={seatsCount}
                    onChange={(e) => setSeatsCount(e.target.value)}
                    onBlur={() => {
                      const n = parseInt(seatsCount, 10);
                      setSeatsCount(String(Number.isFinite(n) && n >= 1 ? n : 1));
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-choices" className="text-xs">Escolhas por cédula</Label>
                  <Input
                    id="edit-choices"
                    type="number"
                    min={1}
                    value={maxChoices}
                    onChange={(e) => setMaxChoices(e.target.value)}
                    onBlur={() => {
                      const n = parseInt(maxChoices, 10);
                      const seats = Math.max(1, parseInt(seatsCount, 10) || 1);
                      const clamped = Number.isFinite(n) && n >= 1 ? Math.min(n, seats) : 1;
                      setMaxChoices(String(clamped));
                    }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Regra de maioria (1º escrutínio)</Label>
                <Select value={majorityRule} onValueChange={setMajorityRule}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="absolute_50">Maioria absoluta (50% + 1)</SelectItem>
                    <SelectItem value="simple">Maioria simples (top N)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">Modo de votação</Label>
            <Select value={votingMode} onValueChange={setVotingMode}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="shared">Urna compartilhada</SelectItem>
                <SelectItem value="individual">Voto individual (celular)</SelectItem>
                <SelectItem value="both">Ambos (urna + celular)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}