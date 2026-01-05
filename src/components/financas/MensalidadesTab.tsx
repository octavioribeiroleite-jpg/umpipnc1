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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import { Check, AlertCircle, Pencil, Trash2, User, ShoppingBag, CreditCard } from 'lucide-react';

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

interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  origin: string | null;
  reference_type: string | null;
  member_id: string | null;
  category_id: string | null;
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
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('50');
  
  // Edit payment state
  const [editPaymentDialogOpen, setEditPaymentDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [editPaymentAmount, setEditPaymentAmount] = useState('');
  
  // Edit transaction state
  const [editTransactionDialogOpen, setEditTransactionDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editTransactionForm, setEditTransactionForm] = useState({ description: '', amount: '', date: '' });
  
  // Delete state
  const [deletePaymentId, setDeletePaymentId] = useState<string | null>(null);
  const [deleteTransactionId, setDeleteTransactionId] = useState<string | null>(null);
  
  const { toast } = useToast();

  const competence = `${selectedMonth}/${selectedYear}`;

  const fetchData = async () => {
    setLoading(true);
    
    // Calculate date range for the month
    const monthIndex = months.indexOf(selectedMonth);
    const year = parseInt(selectedYear);
    const startOfMonth = new Date(year, monthIndex, 1).toISOString().split('T')[0];
    const endOfMonth = new Date(year, monthIndex + 1, 0).toISOString().split('T')[0];
    
    const [membersRes, paymentsRes, transactionsRes] = await Promise.all([
      supabase.from('members').select('*').eq('active', true).order('name'),
      supabase.from('membership_payments').select('*').eq('competence', competence),
      supabase.from('transactions')
        .select('*')
        .eq('type', 'entrada')
        .gte('date', startOfMonth)
        .lte('date', endOfMonth)
        .order('date', { ascending: false }),
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
    
    if (transactionsRes.error) {
      toast({ title: 'Erro ao carregar transações', variant: 'destructive' });
    } else {
      setTransactions(transactionsRes.data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [competence]);

  const getMemberPayment = (memberId: string) => {
    return payments.find((p) => p.member_id === memberId);
  };
  
  const getMemberName = (memberId: string | null) => {
    if (!memberId) return null;
    const member = members.find(m => m.id === memberId);
    return member?.name || null;
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
  
  // Edit payment
  const openEditPaymentDialog = (payment: Payment) => {
    setEditingPayment(payment);
    setEditPaymentAmount(payment.amount.toString());
    setEditPaymentDialogOpen(true);
  };
  
  const handleEditPayment = async () => {
    if (!editingPayment) return;
    
    const amount = parseFloat(editPaymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: 'Valor inválido', variant: 'destructive' });
      return;
    }
    
    const { error } = await supabase
      .from('membership_payments')
      .update({ amount })
      .eq('id', editingPayment.id);
    
    if (error) {
      toast({ title: 'Erro ao atualizar pagamento', variant: 'destructive' });
    } else {
      toast({ title: 'Pagamento atualizado com sucesso' });
      fetchData();
    }
    
    setEditPaymentDialogOpen(false);
    setEditingPayment(null);
  };
  
  // Delete payment
  const handleDeletePayment = async () => {
    if (!deletePaymentId) return;
    
    const { error } = await supabase
      .from('membership_payments')
      .delete()
      .eq('id', deletePaymentId);
    
    if (error) {
      toast({ title: 'Erro ao excluir pagamento', variant: 'destructive' });
    } else {
      toast({ title: 'Pagamento excluído com sucesso' });
      fetchData();
    }
    
    setDeletePaymentId(null);
  };
  
  // Edit transaction
  const openEditTransactionDialog = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setEditTransactionForm({
      description: transaction.description,
      amount: transaction.amount.toString(),
      date: transaction.date,
    });
    setEditTransactionDialogOpen(true);
  };
  
  const handleEditTransaction = async () => {
    if (!editingTransaction) return;
    
    const amount = parseFloat(editTransactionForm.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: 'Valor inválido', variant: 'destructive' });
      return;
    }
    
    if (!editTransactionForm.description.trim()) {
      toast({ title: 'Descrição é obrigatória', variant: 'destructive' });
      return;
    }
    
    const { error } = await supabase
      .from('transactions')
      .update({
        description: editTransactionForm.description,
        amount,
        date: editTransactionForm.date,
      })
      .eq('id', editingTransaction.id);
    
    if (error) {
      toast({ title: 'Erro ao atualizar receita', variant: 'destructive' });
    } else {
      toast({ title: 'Receita atualizada com sucesso' });
      fetchData();
    }
    
    setEditTransactionDialogOpen(false);
    setEditingTransaction(null);
  };
  
  // Delete transaction
  const handleDeleteTransaction = async () => {
    if (!deleteTransactionId) return;
    
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', deleteTransactionId);
    
    if (error) {
      toast({ title: 'Erro ao excluir receita', variant: 'destructive' });
    } else {
      toast({ title: 'Receita excluída com sucesso' });
      fetchData();
    }
    
    setDeleteTransactionId(null);
  };
  
  const getOriginIcon = (origin: string | null, referenceType: string | null) => {
    if (referenceType === 'shirt_sale') return <ShoppingBag className="h-4 w-4 text-primary" />;
    if (referenceType === 'charge') return <CreditCard className="h-4 w-4 text-success" />;
    if (origin === 'manual') return <User className="h-4 w-4 text-muted-foreground" />;
    return <CreditCard className="h-4 w-4 text-muted-foreground" />;
  };
  
  const getOriginLabel = (origin: string | null, referenceType: string | null) => {
    if (referenceType === 'shirt_sale') return 'Venda de Camisa';
    if (referenceType === 'charge') return 'Cobrança';
    if (origin === 'manual') return 'Manual';
    return 'Automático';
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

      {/* Contribuições de Membros */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-lg">Contribuições de Membros - {competence}</CardTitle>
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
                        <div className="flex justify-end gap-1">
                          {isPaid && payment && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditPaymentDialog(payment)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeletePaymentId(payment.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </>
                          )}
                          {!isPaid && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openPaymentDialog(member)}
                            >
                              Registrar Pagamento
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
      
      {/* Outras Receitas (Transações) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Outras Receitas - {competence}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-center py-8">Carregando...</p>
          ) : transactions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhuma receita registrada neste período.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Membro</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-medium">{transaction.description}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getOriginIcon(transaction.origin, transaction.reference_type)}
                        <span className="text-sm">{getOriginLabel(transaction.origin, transaction.reference_type)}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getMemberName(transaction.member_id) || '-'}</TableCell>
                    <TableCell className="text-success font-medium">
                      R$ {Number(transaction.amount).toFixed(2).replace('.', ',')}
                    </TableCell>
                    <TableCell>
                      {new Date(transaction.date).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditTransactionDialog(transaction)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTransactionId(transaction.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Registrar Pagamento */}
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
      
      {/* Dialog: Editar Pagamento */}
      <Dialog open={editPaymentDialogOpen} onOpenChange={setEditPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Pagamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editAmount">Valor (R$)</Label>
              <Input
                id="editAmount"
                type="number"
                step="0.01"
                value={editPaymentAmount}
                onChange={(e) => setEditPaymentAmount(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditPaymentDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleEditPayment}>Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Dialog: Editar Transação */}
      <Dialog open={editTransactionDialogOpen} onOpenChange={setEditTransactionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Receita</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editDescription">Descrição</Label>
              <Input
                id="editDescription"
                value={editTransactionForm.description}
                onChange={(e) => setEditTransactionForm({ ...editTransactionForm, description: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="editTransAmount">Valor (R$)</Label>
              <Input
                id="editTransAmount"
                type="number"
                step="0.01"
                value={editTransactionForm.amount}
                onChange={(e) => setEditTransactionForm({ ...editTransactionForm, amount: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="editDate">Data</Label>
              <Input
                id="editDate"
                type="date"
                value={editTransactionForm.date}
                onChange={(e) => setEditTransactionForm({ ...editTransactionForm, date: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditTransactionDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleEditTransaction}>Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* AlertDialog: Excluir Pagamento */}
      <AlertDialog open={!!deletePaymentId} onOpenChange={() => setDeletePaymentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Pagamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este pagamento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePayment} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* AlertDialog: Excluir Transação */}
      <AlertDialog open={!!deleteTransactionId} onOpenChange={() => setDeleteTransactionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Receita</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta receita? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTransaction} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
