import { useState, useEffect, useId } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Birthday, BirthdayInsert } from '@/hooks/useBirthdays';

const MAX_DAYS: Record<number, number> = { 1:31,2:29,3:31,4:30,5:31,6:30,7:31,8:31,9:30,10:31,11:30,12:31 };

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  birthday?: Birthday | null;
  onSave: (data: BirthdayInsert) => void;
  onDelete?: () => void;
  isSaving: boolean;
}

export function BirthdayFormDialog({ open, onOpenChange, birthday, onSave, onDelete, isSaving }: Props) {
  const fieldId = useId();
  const [nome, setNome] = useState('');
  const [dia, setDia] = useState('');
  const [mes, setMes] = useState('');
  const [anoNascimento, setAnoNascimento] = useState('');
  const [departamento, setDepartamento] = useState('IPNC');
  const [observacao, setObservacao] = useState('');
  const [pendente, setPendente] = useState(false);

  useEffect(() => {
    if (birthday) {
      setNome(birthday.nome);
      setDia(String(birthday.dia));
      setMes(String(birthday.mes));
      setAnoNascimento(birthday.ano_nascimento ? String(birthday.ano_nascimento) : '');
      setDepartamento(birthday.departamento || 'IPNC');
      setObservacao(birthday.observacao || '');
      setPendente(birthday.pendente_revisao);
    } else {
      setNome('');
      setDia('');
      setMes('');
      setAnoNascimento('');
      setDepartamento('IPNC');
      setObservacao('');
      setPendente(false);
    }
  }, [birthday, open]);

  const handleSubmit = () => {
    const diaNum = parseInt(dia);
    const mesNum = parseInt(mes);
    const anoAtual = new Date().getFullYear();
    const anoNum = anoNascimento.trim() ? parseInt(anoNascimento) : null;

    if (!nome.trim()) { toast.error('Informe o nome.'); return; }
    if (isNaN(mesNum) || mesNum < 1 || mesNum > 12) { toast.error('Mês inválido.'); return; }
    if (isNaN(diaNum) || diaNum < 1 || diaNum > MAX_DAYS[mesNum]) { toast.error(`Dia inválido para o mês ${mesNum}.`); return; }
    if (anoNascimento.trim() && (anoNum === null || isNaN(anoNum) || anoNum < 1900 || anoNum > anoAtual)) {
      toast.error(`Informe um ano entre 1900 e ${anoAtual}.`);
      return;
    }

    onSave({
      nome: nome.trim(),
      dia: diaNum,
      mes: mesNum,
      ano_nascimento: anoNum,
      departamento,
      observacao: observacao || undefined,
      pendente_revisao: pendente,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{birthday ? 'Editar aniversariante' : 'Novo aniversariante'}</DialogTitle>
          <DialogDescription>Informe o nome e a data do aniversário. O ano de nascimento é opcional.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor={`${fieldId}-nome`}>Nome</Label>
            <Input id={`${fieldId}-nome`} value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome completo" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor={`${fieldId}-dia`}>Dia</Label>
              <Input id={`${fieldId}-dia`} type="number" inputMode="numeric" min={1} max={31} value={dia} onChange={e => setDia(e.target.value)} placeholder="DD" />
            </div>
            <div>
              <Label htmlFor={`${fieldId}-mes`}>Mês</Label>
              <Input id={`${fieldId}-mes`} type="number" inputMode="numeric" min={1} max={12} value={mes} onChange={e => setMes(e.target.value)} placeholder="MM" />
            </div>
            <div>
              <Label htmlFor={`${fieldId}-ano`}>Ano</Label>
              <Input
                id={`${fieldId}-ano`}
                type="number"
                inputMode="numeric"
                min={1900}
                max={new Date().getFullYear()}
                value={anoNascimento}
                onChange={e => setAnoNascimento(e.target.value)}
                placeholder="AAAA"
              />
            </div>
          </div>
          <div>
            <Label htmlFor={`${fieldId}-departamento`}>Departamento</Label>
            <Input id={`${fieldId}-departamento`} value={departamento} onChange={e => setDepartamento(e.target.value)} />
          </div>
          <div>
            <Label htmlFor={`${fieldId}-observacao`}>Observação</Label>
            <Textarea id={`${fieldId}-observacao`} value={observacao} onChange={e => setObservacao(e.target.value)} rows={2} />
          </div>
          <div className="flex min-h-11 items-center gap-3">
            <Checkbox checked={pendente} onCheckedChange={v => setPendente(!!v)} id={`${fieldId}-pendente`} />
            <Label htmlFor={`${fieldId}-pendente`} className="text-sm">Pendente de revisão</Label>
          </div>
        </div>
        <DialogFooter className="gap-2">
          {birthday && onDelete && (
            <Button
              type="button"
              variant="destructive"
              onClick={onDelete}
              disabled={isSaving}
              className="sm:mr-auto"
            >
              <Trash2 className="h-4 w-4" />
              Excluir
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isSaving}>{isSaving ? 'Salvando...' : 'Salvar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
