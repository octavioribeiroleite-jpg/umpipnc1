import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Check, AlertCircle } from 'lucide-react';

interface Member {
  id: string;
  name: string;
  active: boolean;
}

interface Payment {
  id: string;
  member_id: string;
  competence: string;
  amount: number;
  status: string;
  paid_at: string | null;
}

const months = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const currentYear = new Date().getFullYear();
const currentMonth = months[new Date().getMonth()];

export function MensalidadesTab() {
  const [members, setMembers] = useState<Member[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('50');
  const { toast } = useToast();

  const competence = `${selectedMonth}/${selectedYear}`;

  const fetchData = async () => {
    setLoading(true);
    
    const [membersRes, paymentsRes] = await Promise.all([
      supabase.from('members').select('*').eq('active', true).order('name'),
      supabase.from('membership_payments').select('*').eq('competence', competence),
    ]);

    if (membersRes.error) {
      toast({ title: 'Erro ao carregar membros', variant: 'destructive' });
    } else {
      setMembers(membersRes.data || []);
    }

    if (paymentsRes.error) {
      toast({ title: 'Erro ao carregar pagamentos', variant: 'destructive' });
    } else {
      setPayments(paymentsRes.data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [competence]);

  const getMemberPayment = (memberId: string) => {
    return payments.find((p) => p.member_id === memberId);
  };

  const openPaymentDialog = (member: Member) => {
    setSelectedMember(member);
    setPaymentDialogOpen(true);
  };

  const handleRegisterPayment = async () => {
    if (!selectedMember) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: 'Valor inválido', variant: 'destructive' });
      return;
    }

    const { error } = await supabase.from('membership_payments').insert({
      member_id: selectedMember.id,
      competence,
      amount,
      status: 'pago',
      paid_at: new Date().toISOString().split('T')[0],
    });

    if (error) {
      toast({ title: 'Erro ao registrar pagamento', variant: 'destructive' });
    } else {
      toast({ title: 'Pagamento registrado com sucesso' });
      fetchData();
    }

    setPaymentDialogOpen(false);
    setSelectedMember(null);
  };

  const paidCount = members.filter((m) => getMemberPayment(m.id)?.status === 'pago').length;
  const pendingCount = members.length - paidCount;

  return (
    <>
      <Card className="mb-4">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Label>Competência:</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month} value={month}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[currentYear - 1, currentYear, currentYear + 1].map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-4 ml-auto">
              <Badge variant="default" className="bg-success">
                <Check className="h-3 w-3 mr-1" />
                {paidCount} pagos
              </Badge>
              <Badge variant="destructive">
                <AlertCircle className="h-3 w-3 mr-1" />
                {pendingCount} pendentes
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Contribuições - {competence}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-center py-8">Carregando...</p>
          ) : members.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhum membro ativo. Cadastre membros na aba "Membros".
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Membro</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data Pagamento</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => {
                  const payment = getMemberPayment(member.id);
                  const isPaid = payment?.status === 'pago';

                  return (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.name}</TableCell>
                      <TableCell>
                        {payment ? `R$ ${payment.amount.toFixed(2).replace('.', ',')}` : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={isPaid ? 'default' : 'destructive'} className={isPaid ? 'bg-success' : ''}>
                          {isPaid ? 'Pago' : 'Pendente'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {payment?.paid_at
                          ? new Date(payment.paid_at).toLocaleDateString('pt-BR')
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {!isPaid && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openPaymentDialog(member)}
                          >
                            Registrar Pagamento
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              Registrar pagamento de <strong>{selectedMember?.name}</strong> para{' '}
              <strong>{competence}</strong>
            </p>
            <div>
              <Label htmlFor="amount">Valor (R$)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleRegisterPayment}>Confirmar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}