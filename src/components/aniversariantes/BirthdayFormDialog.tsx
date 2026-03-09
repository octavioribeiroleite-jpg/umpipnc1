import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import type { Birthday, BirthdayInsert } from '@/hooks/useBirthdays';

const MAX_DAYS: Record<number, number> = { 1:31,2:29,3:31,4:30,5:31,6:30,7:31,8:31,9:30,10:31,11:30,12:31 };

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  birthday?: Birthday | null;
  onSave: (data: BirthdayInsert) => void;
  isSaving: boolean;
}

export function BirthdayFormDialog({ open, onOpenChange, birthday, onSave, isSaving }: Props) {
  const [nome, setNome] = useState('');
  const [dia, setDia] = useState('');
  const [mes, setMes] = useState('');
  const [departamento, setDepartamento] = useState('IPNC');
  const [observacao, setObservacao] = useState('');
  const [pendente, setPendente] = useState(false);

  useEffect(() => {
    if (birthday) {
      setNome(birthday.nome);
      setDia(String(birthday.dia));
      setMes(String(birthday.mes));
      setDepartamento(birthday.departamento || 'IPNC');
      setObservacao(birthday.observacao || '');
      setPendente(birthday.pendente_revisao);
    } else {
      setNome(''); setDia(''); setMes(''); setDepartamento('IPNC'); setObservacao(''); setPendente(false);
    }
  }, [birthday, open]);

  const handleSubmit = () => {
    const diaNum = parseInt(dia);
    const mesNum = parseInt(mes);
    if (!nome.trim()) { toast.error('Informe o nome.'); return; }
    if (isNaN(mesNum) || mesNum < 1 || mesNum > 12) { toast.error('Mês inválido.'); return; }
    if (isNaN(diaNum) || diaNum < 1 || diaNum > MAX_DAYS[mesNum]) { toast.error(`Dia inválido para o mês ${mesNum}.`); return; }
    onSave({ nome: nome.trim(), dia: diaNum, mes: mesNum, departamento, observacao: observacao || undefined, pendente_revisao: pendente });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{birthday ? 'Editar aniversariante' : 'Novo aniversariante'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nome</Label>
            <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome completo" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Dia</Label>
              <Input type="number" min={1} max={31} value={dia} onChange={e => setDia(e.target.value)} placeholder="DD" />
            </div>
            <div>
              <Label>Mês</Label>
              <Input type="number" min={1} max={12} value={mes} onChange={e => setMes(e.target.value)} placeholder="MM" />
            </div>
          </div>
          <div>
            <Label>Departamento</Label>
            <Input value={departamento} onChange={e => setDepartamento(e.target.value)} />
          </div>
          <div>
            <Label>Observação</Label>
            <Textarea value={observacao} onChange={e => setObservacao(e.target.value)} rows={2} />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={pendente} onCheckedChange={v => setPendente(!!v)} id="pendente" />
            <Label htmlFor="pendente" className="text-sm">Pendente de revisão</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isSaving}>{isSaving ? 'Salvando...' : 'Salvar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
