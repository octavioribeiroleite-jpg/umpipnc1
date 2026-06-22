import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useMembroSession } from '@/contexts/MembroSessionContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, Upload, CheckCircle2, Clock, XCircle, Loader2, CalendarDays, Banknote } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Charge {
  id: string;
  amount: number;
  competence: string;
  type: string;
  status: string;
  due_date: string;
  paid_at: string | null;
  paid_amount: number | null;
  payment_method: string | null;
  notes: string | null;
}

interface Submission {
  id: string;
  charge_id: string | null;
  amount: number | null;
  competence: string;
  type: string;
  status: string;
  created_at: string;
  receipt_url: string;
  payment_date: string | null;
  payment_method: string | null;
  notes: string | null;
  rejection_reason: string | null;
}

const statusConfig: Record<string, { label: string; icon: typeof Clock; className: string }> = {
  pendente: { label: 'Pendente', icon: Clock, className: 'bg-warning/10 text-warning border-warning/20' },
  aprovado: { label: 'Aprovado', icon: CheckCircle2, className: 'bg-success/10 text-success border-success/20' },
  rejeitado: { label: 'Rejeitado', icon: XCircle, className: 'bg-destructive/10 text-destructive border-destructive/20' },
  cancelado: { label: 'Cancelado', icon: XCircle, className: 'bg-muted text-muted-foreground border-border' },
};

const paymentMethodLabels: Record<string, string> = {
  pix: 'PIX',
  dinheiro: 'Dinheiro',
  transferencia: 'Transferência',
  cartao: 'Cartão',
};

export function MembroPagamentos() {
  const { session } = useMembroSession();
  const { toast } = useToast();
  const [charges, setCharges] = useState<Charge[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [selectedChargeId, setSelectedChargeId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('pix');

  useEffect(() => {
    if (session) fetchData();
  }, [session]);

  const fetchData = async () => {
    if (!session) return;
    setLoading(true);

    const [chargesRes, subsRes] = await Promise.all([
      supabase.functions.invoke('member-get-charges'),
      supabase.functions.invoke('member-get-submissions'),
    ]);

    if (chargesRes.data?.charges) setCharges(chargesRes.data.charges as Charge[]);
    if (subsRes.data?.submissions) setSubmissions(subsRes.data.submissions as Submission[]);
    setLoading(false);
  };

  const formatCurrency = (value: number) =>
    `R$ ${Number(value || 0).toFixed(2).replace('.', ',')}`;

  const getChargeLabel = (charge: Charge) => {
    const type = charge.type === 'percapita' ? 'Per capita' : charge.type === 'mensalidade' ? 'Contribuição' : charge.type;
    const paid = Number(charge.paid_amount || 0);
    const remaining = Math.max(Number(charge.amount || 0) - paid, 0);
    return `${type} - ${charge.competence} (${formatCurrency(remaining)} restante)`;
  };

  const openSubmissionDialog = (charge?: Charge) => {
    const targetCharge = charge || charges.find((item) => item.status === 'pendente' || item.status === 'parcial') || charges[0];
    if (targetCharge) {
      const paid = Number(targetCharge.paid_amount || 0);
      const remaining = Math.max(Number(targetCharge.amount || 0) - paid, 0);
      setSelectedChargeId(targetCharge.id);
      setAmount(remaining.toFixed(2));
    }
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentMethod('pix');
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!selectedFile || !selectedChargeId || !amount || !paymentDate || !paymentMethod || !session) {
      toast({ variant: 'destructive', title: 'Preencha todos os campos', description: 'Selecione a cobrança, valor, data, método e comprovante.' });
      return;
    }

    setSubmitting(true);
    try {
      const selectedCharge = charges.find((charge) => charge.id === selectedChargeId);
      if (!selectedCharge) throw new Error('Cobrança não encontrada');

      const fileExt = selectedFile.name.split('.').pop();
      const year = new Date(paymentDate).getFullYear();
      const filePath = `${session.societyId}/${year}/member-submissions/${session.memberId}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('receipts').upload(filePath, selectedFile);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(filePath);

      const { error: submitError } = await supabase.functions.invoke('member-submit-payment-receipt', {
        body: {
          charge_id: selectedCharge.id,
          amount: Number(amount.replace(',', '.')),
          payment_date: paymentDate,
          payment_method: paymentMethod,
          receipt_url: urlData.publicUrl,
          receipt_path: filePath,
          notes: notes || null,
        },
      });
      if (submitError) throw submitError;

      toast({ title: 'Comprovante enviado!', description: 'A diretoria será notificada para aprovação.' });
      setDialogOpen(false);
      setSelectedFile(null);
      setNotes('');
      setSelectedChargeId('');
      setAmount('');
      fetchData();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao enviar', description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <h2 className="font-semibold text-lg">Pagamentos</h2>
        {[1, 2].map((i) => <Skeleton key={i} className="h-20" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending charges */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Cobranças Pendentes</h2>
          <Button size="sm" onClick={() => openSubmissionDialog()} disabled={charges.length === 0}>
            <Upload className="h-4 w-4 mr-1" />
            Enviar Comprovante
          </Button>
        </div>

        {charges.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-success opacity-70" />
              <p className="text-sm">Nenhuma cobrança pendente. Tudo em dia!</p>
            </CardContent>
          </Card>
        ) : (
          charges.map((charge) => {
            const remaining = charge.paid_amount ? charge.amount - charge.paid_amount : charge.amount;
            return (
              <Card key={charge.id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm capitalize">{charge.type === 'mensalidade' ? 'Mensalidade' : 'Per Capita'}</p>
                      <p className="text-xs text-muted-foreground">{charge.competence}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">R$ {Number(charge.amount).toFixed(2).replace('.', ',')}</p>
                      <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning border-warning/20">
                        {charge.status === 'parcial' ? 'Parcial' : 'Pendente'}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      Vence: {format(new Date(charge.due_date + 'T12:00:00'), 'dd/MM/yyyy')}
                    </span>
                    {charge.status === 'parcial' && charge.paid_amount != null && (
                      <span className="flex items-center gap-1">
                        <Banknote className="h-3 w-3" />
                        Pago: R$ {Number(charge.paid_amount).toFixed(2).replace('.', ',')} • Restante: R$ {remaining.toFixed(2).replace('.', ',')}
                      </span>
                    )}
                    {charge.payment_method && (
                      <span>{paymentMethodLabels[charge.payment_method] || charge.payment_method}</span>
                    )}
                  </div>

                    {charge.notes && (
                      <p className="text-xs text-muted-foreground italic">{charge.notes}</p>
                    )}

                  {(charge.status === 'pendente' || charge.status === 'parcial') && (
                    <Button size="sm" variant="outline" className="w-full" onClick={() => openSubmissionDialog(charge)}>
                      <Upload className="h-4 w-4 mr-1" />
                      Enviar comprovante desta cobrança
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Submission history */}
      {submissions.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-lg">Comprovantes Enviados</h2>
          {submissions.map((sub) => {
            const config = statusConfig[sub.status] || statusConfig.pendente;
            const StatusIcon = config.icon;
            return (
              <Card key={sub.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-sm capitalize">{sub.type === 'mensalidade' ? 'Mensalidade' : 'Per Capita'}</p>
                    <Badge variant="outline" className={`text-[10px] ${config.className}`}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {config.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{sub.competence}</p>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {sub.amount != null && <span>{formatCurrency(Number(sub.amount))}</span>}
                    {sub.payment_date && <span>{format(new Date(sub.payment_date + 'T12:00:00'), 'dd/MM/yyyy')}</span>}
                    {sub.payment_method && <span>{paymentMethodLabels[sub.payment_method] || sub.payment_method}</span>}
                  </div>
                  {sub.rejection_reason && (
                    <p className="text-xs text-destructive mt-1">Motivo: {sub.rejection_reason}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Upload dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar Comprovante de Pagamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Cobrança</Label>
              <Select value={selectedChargeId} onValueChange={(value) => {
                setSelectedChargeId(value);
                const selected = charges.find((charge) => charge.id === value);
                if (selected) {
                  const paid = Number(selected.paid_amount || 0);
                  setAmount(Math.max(Number(selected.amount || 0) - paid, 0).toFixed(2));
                }
              }}>
                <SelectTrigger><SelectValue placeholder="Selecione a cobrança" /></SelectTrigger>
                <SelectContent>
                  {charges
                    .filter((charge) => charge.status === 'pendente' || charge.status === 'parcial')
                    .map((charge) => (
                    <SelectItem key={charge.id} value={charge.id}>{getChargeLabel(charge)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Valor pago</Label>
                <Input
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <Label>Data do pagamento</Label>
                <Input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Método</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="transferencia">Transferência</SelectItem>
                  <SelectItem value="cartao">Cartão</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Comprovante (foto ou PDF)</Label>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
              />
            </div>
            <div className="space-y-2">
              <Label>Observações (opcional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: pagamento referente a dois meses..."
                rows={2}
              />
            </div>
            <Button className="w-full" onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enviando...</>
              ) : (
                'Enviar Comprovante'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}