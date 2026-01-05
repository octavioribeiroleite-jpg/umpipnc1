import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Check, X, Edit, Receipt, Upload, Loader2 } from 'lucide-react';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

interface Member {
  id: string;
  name: string;
}

interface Charge {
  id: string;
  member_id: string;
  type: string;
  amount: number;
  status: string;
  due_date: string;
  paid_at: string | null;
  payment_method: string | null;
  receipt_url: string | null;
  transaction_id: string | null;
}

export function CobrancasTab() {
  const { user } = useAuth();
  const currentYear = new Date().getFullYear();
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[new Date().getMonth()]);
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [members, setMembers] = useState<Member[]>([]);
  const [charges, setCharges] = useState<Charge[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [memberCharges, setMemberCharges] = useState<Charge[]>([]);
  const [payMensalidade, setPayMensalidade] = useState(false);
  const [payPercapita, setPayPercapita] = useState(false);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 16));
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const competence = `${selectedMonth}/${selectedYear}`;
  const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  useEffect(() => {
    fetchData();
  }, [competence]);

  const fetchData = async () => {
    setLoading(true);
    const [membersRes, chargesRes] = await Promise.all([
      supabase.from('members').select('id, name').eq('active', true).order('name'),
      supabase.from('charges').select('*').eq('competence', competence)
    ]);

    setMembers(membersRes.data || []);
    setCharges(chargesRes.data || []);
    setLoading(false);
  };

  const getMemberCharges = (memberId: string) => {
    return charges.filter(c => c.member_id === memberId);
  };

  const getChargeByType = (memberId: string, type: string) => {
    return charges.find(c => c.member_id === memberId && c.type === type);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pago: 'default',
      pendente: 'destructive',
      isento: 'secondary',
      cancelado: 'outline'
    };
    const labels: Record<string, string> = {
      pago: 'Pago',
      pendente: 'Pendente',
      isento: 'Isento',
      cancelado: 'Cancelado'
    };
    return <Badge variant={variants[status] || 'outline'}>{labels[status] || status}</Badge>;
  };

  const openPaymentDialog = (member: Member) => {
    const mCharges = getMemberCharges(member.id);
    setSelectedMember(member);
    setMemberCharges(mCharges);
    
    const mensalidade = mCharges.find(c => c.type === 'mensalidade');
    const percapita = mCharges.find(c => c.type === 'percapita');
    
    setPayMensalidade(mensalidade?.status === 'pendente');
    setPayPercapita(percapita?.status === 'pendente');
    setPaymentDate(new Date().toISOString().slice(0, 16));
    setPaymentMethod('pix');
    setPaymentNotes('');
    setReceiptFile(null);
    setDialogOpen(true);
  };

  const handlePayment = async () => {
    if (!selectedMember || !user) return;
    if (!payMensalidade && !payPercapita) {
      toast.error('Selecione pelo menos uma cobrança');
      return;
    }

    setSubmitting(true);
    try {
      let receiptUrl: string | null = null;

      // Upload comprovante se houver
      if (receiptFile) {
        const fileExt = receiptFile.name.split('.').pop();
        const fileName = `${Date.now()}-${selectedMember.id}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(fileName, receiptFile);

        if (uploadError) throw uploadError;
        
        const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(fileName);
        receiptUrl = urlData.publicUrl;
      }

      const paidAt = new Date(paymentDate).toISOString();
      const chargesToPay = memberCharges.filter(c => 
        (c.type === 'mensalidade' && payMensalidade && c.status === 'pendente') ||
        (c.type === 'percapita' && payPercapita && c.status === 'pendente')
      );

      for (const charge of chargesToPay) {
        // Verificar se já existe transação vinculada
        if (charge.transaction_id) {
          // Atualizar transação existente
          await supabase
            .from('transactions')
            .update({
              amount: charge.amount,
              date: paidAt.split('T')[0],
              receipt_url: receiptUrl
            })
            .eq('id', charge.transaction_id);
        } else {
          // Criar nova transação
          const { data: transaction, error: transError } = await supabase
            .from('transactions')
            .insert({
              description: `${charge.type === 'mensalidade' ? 'Mensalidade' : 'Per Capita'} - ${selectedMember.name} - ${competence}`,
              amount: charge.amount,
              type: 'entrada',
              date: paidAt.split('T')[0],
              created_by: user.id,
              origin: 'automatic',
              reference_type: 'charge',
              reference_id: charge.id,
              member_id: selectedMember.id,
              receipt_url: receiptUrl
            })
            .select('id')
            .single();

          if (transError) throw transError;

          // Atualizar cobrança com transaction_id
          await supabase
            .from('charges')
            .update({
              status: 'pago',
              paid_at: paidAt,
              payment_method: paymentMethod,
              receipt_url: receiptUrl,
              notes: paymentNotes,
              transaction_id: transaction?.id
            })
            .eq('id', charge.id);
        }
      }

      // Atualizar status das cobranças sem criar transações duplicadas
      for (const charge of chargesToPay) {
        await supabase
          .from('charges')
          .update({
            status: 'pago',
            paid_at: paidAt,
            payment_method: paymentMethod,
            receipt_url: receiptUrl,
            notes: paymentNotes
          })
          .eq('id', charge.id);
      }

      toast.success('Pagamento registrado com sucesso!');
      setDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error('Erro ao registrar pagamento: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleExempt = async (memberId: string, type: string) => {
    const charge = getChargeByType(memberId, type);
    if (!charge) return;

    const { error } = await supabase
      .from('charges')
      .update({ status: 'isento' })
      .eq('id', charge.id);

    if (error) {
      toast.error('Erro ao isentar');
    } else {
      toast.success('Membro isento desta cobrança');
      fetchData();
    }
  };

  // Stats
  const totalCharges = charges.length;
  const paidCharges = charges.filter(c => c.status === 'pago').length;
  const pendingCharges = charges.filter(c => c.status === 'pendente').length;
  const exemptCharges = charges.filter(c => c.status === 'isento').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros e Stats */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex gap-2">
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map(month => (
                    <SelectItem key={month} value={month}>{month}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-4 text-sm">
              <span className="text-success font-medium">{paidCharges} pagos</span>
              <span className="text-destructive font-medium">{pendingCharges} pendentes</span>
              <span className="text-muted-foreground">{exemptCharges} isentos</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardContent className="pt-6">
          {charges.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma cobrança gerada para {competence}. Vá em "Configurações" para gerar.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Membro</TableHead>
                  <TableHead>Mensalidade</TableHead>
                  <TableHead>Per Capita</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map(member => {
                  const mensalidade = getChargeByType(member.id, 'mensalidade');
                  const percapita = getChargeByType(member.id, 'percapita');
                  
                  if (!mensalidade && !percapita) return null;

                  return (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.name}</TableCell>
                      <TableCell>
                        {mensalidade ? (
                          <div className="flex items-center gap-2">
                            <span>R$ {mensalidade.amount.toFixed(2).replace('.', ',')}</span>
                            {getStatusBadge(mensalidade.status)}
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {percapita ? (
                          <div className="flex items-center gap-2">
                            <span>R$ {percapita.amount.toFixed(2).replace('.', ',')}</span>
                            {getStatusBadge(percapita.status)}
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {mensalidade?.due_date || percapita?.due_date
                          ? new Date((mensalidade?.due_date || percapita?.due_date) + 'T12:00:00').toLocaleDateString('pt-BR')
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {((mensalidade?.status === 'pendente') || (percapita?.status === 'pendente')) && (
                            <Button size="sm" onClick={() => openPaymentDialog(member)}>
                              <Check className="h-4 w-4 mr-1" />
                              Baixa
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Baixa */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Dar Baixa - {selectedMember?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Checkboxes para tipo de pagamento */}
            <div className="space-y-2">
              <Label>O que foi pago?</Label>
              {memberCharges.map(charge => (
                <div key={charge.id} className="flex items-center gap-2">
                  <Checkbox
                    id={charge.id}
                    checked={charge.type === 'mensalidade' ? payMensalidade : payPercapita}
                    onCheckedChange={(checked) => {
                      if (charge.type === 'mensalidade') setPayMensalidade(!!checked);
                      else setPayPercapita(!!checked);
                    }}
                    disabled={charge.status !== 'pendente'}
                  />
                  <label htmlFor={charge.id} className="text-sm">
                    {charge.type === 'mensalidade' ? 'Mensalidade' : 'Per Capita'} - R$ {charge.amount.toFixed(2).replace('.', ',')}
                    {charge.status !== 'pendente' && (
                      <span className="text-muted-foreground ml-2">({charge.status})</span>
                    )}
                  </label>
                </div>
              ))}
            </div>

            {/* Data e hora */}
            <div className="space-y-2">
              <Label>Data e Hora do Pagamento</Label>
              <Input
                type="datetime-local"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>

            {/* Método */}
            <div className="space-y-2">
              <Label>Método de Pagamento</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="transferencia">Transferência</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Observação */}
            <div className="space-y-2">
              <Label>Observação (opcional)</Label>
              <Textarea
                placeholder="Observações sobre o pagamento..."
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
              />
            </div>

            {/* Upload comprovante */}
            <div className="space-y-2">
              <Label>Comprovante (opcional)</Label>
              <Input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
              />
              {receiptFile && (
                <p className="text-xs text-muted-foreground">{receiptFile.name}</p>
              )}
            </div>

            <Button 
              className="w-full" 
              onClick={handlePayment} 
              disabled={submitting || (!payMensalidade && !payPercapita)}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Receipt className="h-4 w-4 mr-2" />
                  Confirmar Pagamento
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
