import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Check, MoreHorizontal, Receipt, Loader2, Undo2, Trash2, Eye, Search, Clock, ShieldCheck, Wallet, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReceiptLink } from '@/components/ReceiptLink';
import { receiptReference } from '@/lib/receipt-path';

const ANNUAL_CHARGE_TYPE = 'annual_contribution';

interface Member {
  id: string;
  name: string;
}

interface Charge {
  id: string;
  member_id: string;
  type: string;
  amount: number;
  paid_amount: number | null;
  status: string;
  due_date: string;
  paid_at: string | null;
  payment_method: string | null;
  receipt_url: string | null;
  transaction_id: string | null;
  notes: string | null;
}

interface FinancialSettings {
  monthly_fee: number;
  per_capita: number;
  due_day: number;
}

type MemberStatus = 'pendente' | 'parcial' | 'pago' | 'isento';

const formatCurrency = (value: number) => `R$ ${Number(value || 0).toFixed(2).replace('.', ',')}`;
const parseMoney = (value: string) => Number(String(value || '0').replace(',', '.')) || 0;

export function CobrancasTab() {
  const { user, effectiveSocietyId: societyId } = useAuth();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [members, setMembers] = useState<Member[]>([]);
  const [charges, setCharges] = useState<Charge[]>([]);
  const [settings, setSettings] = useState<FinancialSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<MemberStatus | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedCharge, setSelectedCharge] = useState<Charge | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 16));
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [viewingCharge, setViewingCharge] = useState<Charge | null>(null);
  const [viewingMember, setViewingMember] = useState<Member | null>(null);

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: 'revert' | 'delete'; charge: Charge } | null>(null);

  const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
  const contributionAmount = Number(settings?.monthly_fee || 0);
  const perCapitaAmount = Number(settings?.per_capita || 0);
  const configuredAnnualTotal = contributionAmount + perCapitaAmount;

  useEffect(() => {
    fetchData();
  }, [selectedYear, societyId]);

  useEffect(() => {
    const channel = supabase
      .channel(`annual-charges-realtime-${crypto.randomUUID()}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'charges',
      }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [societyId, selectedYear]);

  const fetchData = async () => {
    setLoading(true);

    let membersQuery = supabase.from('members').select('id, name').eq('active', true).order('name');
    let chargesQuery = supabase
      .from('charges')
      .select('*')
      .eq('competence', selectedYear)
      .eq('type', ANNUAL_CHARGE_TYPE);
    let settingsQuery = supabase
      .from('financial_settings')
      .select('monthly_fee, per_capita, due_day')
      .eq('competence', 'geral');

    if (societyId) {
      membersQuery = membersQuery.eq('society_id', societyId);
      chargesQuery = chargesQuery.eq('society_id', societyId);
      settingsQuery = settingsQuery.eq('society_id', societyId);
    }

    const [membersRes, chargesRes, settingsRes] = await Promise.all([membersQuery, chargesQuery, settingsQuery.maybeSingle()]);

    setMembers(membersRes.data || []);
    setCharges(chargesRes.data || []);
    setSettings(settingsRes.data || null);
    setLoading(false);
  };

  const getAnnualCharge = (memberId: string) => charges.find(c => c.member_id === memberId);
  const getPaidAmount = (charge: Charge | null | undefined) => Number(charge?.paid_amount || 0);
  const getRemainingAmount = (charge: Charge | null | undefined) => Math.max(0, Number(charge?.amount || 0) - getPaidAmount(charge));

  const getChargeStatus = (charge: Charge): MemberStatus => {
    if (charge.status === 'isento') return 'isento';
    const paid = getPaidAmount(charge);
    const amount = Number(charge.amount || 0);
    if (charge.status === 'pago' && paid >= amount) return 'pago';
    if (paid > 0 && paid < amount) return 'parcial';
    return 'pendente';
  };

  const getStatusBadge = (charge: Charge) => {
    const status = getChargeStatus(charge);
    const classes: Record<MemberStatus, string> = {
      pago: 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-400 border-0',
      parcial: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-400 border-0',
      pendente: 'bg-destructive/10 text-destructive border-0',
      isento: 'bg-muted text-muted-foreground border-0',
    };
    const labels: Record<MemberStatus, string> = {
      pago: 'Pago',
      parcial: 'Parcial',
      pendente: 'Pendente',
      isento: 'Isento',
    };
    return <Badge variant="secondary" className={classes[status]}>{labels[status]}</Badge>;
  };

  const openPaymentDialog = (member: Member, charge: Charge) => {
    const remaining = getRemainingAmount(charge);
    setSelectedMember(member);
    setSelectedCharge(charge);
    setPaymentAmount(remaining.toFixed(2));
    setPaymentDate(new Date().toISOString().slice(0, 16));
    setPaymentMethod('pix');
    setPaymentNotes('');
    setReceiptFile(null);
    setDialogOpen(true);
  };

  const openDetailsDialog = (member: Member, charge: Charge) => {
    setViewingMember(member);
    setViewingCharge(charge);
    setDetailsDialogOpen(true);
  };

  const handlePayment = async () => {
    if (!selectedMember || !selectedCharge || !user) return;

    const enteredAmount = parseMoney(paymentAmount);
    const remainingAmount = getRemainingAmount(selectedCharge);
    if (enteredAmount <= 0) {
      toast.error('Informe um valor recebido válido');
      return;
    }
    if (enteredAmount > remainingAmount) {
      toast.error(`O valor recebido não pode passar de ${formatCurrency(remainingAmount)}`);
      return;
    }

    setSubmitting(true);
    const paidAt = new Date(paymentDate).toISOString();
    const newTotalPaid = getPaidAmount(selectedCharge) + enteredAmount;
    const isFullyPaid = newTotalPaid >= Number(selectedCharge.amount || 0);
    const receiptPrefix = isFullyPaid ? 'Quitação' : 'Pagamento parcial';

    setCharges(prev => prev.map(c => (
      c.id === selectedCharge.id
        ? { ...c, status: 'pago', paid_at: paidAt, payment_method: paymentMethod, paid_amount: newTotalPaid }
        : c
    )));
    setDialogOpen(false);
    toast.success(isFullyPaid ? 'Cobrança anual quitada!' : 'Baixa parcial registrada!');

    try {
      let receiptUrl: string | null = null;

      if (receiptFile) {
        const fileExt = receiptFile.name.split('.').pop();
        if (!societyId) throw new Error('Selecione a sociedade.');
        const fileName = `${societyId}/${currentYear}/cobrancas/${crypto.randomUUID()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(fileName, receiptFile);

        if (!uploadError) {
          receiptUrl = receiptReference(fileName);
        }
      }

      const partialNote = `${receiptPrefix}: ${formatCurrency(enteredAmount)} de ${formatCurrency(selectedCharge.amount)}. Composição: contribuição ${formatCurrency(contributionAmount)} + per capita ${formatCurrency(perCapitaAmount)}.`;

      const { data: transaction } = await supabase
        .from('transactions')
        .insert({
          description: `Contribuição anual - ${selectedMember.name} - ${selectedYear}`,
          amount: enteredAmount,
          type: 'entrada',
          date: paidAt.split('T')[0],
          created_by: user.id,
          origin: 'automatic',
          reference_type: 'charge',
          reference_id: selectedCharge.id,
          member_id: selectedMember.id,
          receipt_url: receiptUrl,
          society_id: societyId || null,
        })
        .select('id')
        .single();

      await supabase
        .from('charges')
        .update({
          status: 'pago',
          paid_at: paidAt,
          payment_method: paymentMethod,
          receipt_url: receiptUrl || selectedCharge.receipt_url,
          notes: paymentNotes ? `${paymentNotes}\n${partialNote}` : partialNote,
          transaction_id: transaction?.id,
          paid_amount: newTotalPaid,
        })
        .eq('id', selectedCharge.id);
    } catch (error: any) {
      fetchData();
      toast.error('Erro ao processar: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevertPayment = async (charge: Charge) => {
    setCharges(prev => prev.map(c =>
      c.id === charge.id
        ? { ...c, status: 'pendente', paid_at: null, payment_method: null, receipt_url: null, notes: null, transaction_id: null, paid_amount: null }
        : c
    ));
    toast.success('Cobrança voltou para pendente!');

    try {
      await supabase
        .from('transactions')
        .delete()
        .eq('reference_type', 'charge')
        .eq('reference_id', charge.id);

      if (charge.transaction_id) {
        await supabase.from('transactions').delete().eq('id', charge.transaction_id);
      }

      await supabase
        .from('charges')
        .update({
          status: 'pendente',
          paid_at: null,
          payment_method: null,
          receipt_url: null,
          notes: `Contribuição: ${formatCurrency(contributionAmount)} | Per capita: ${formatCurrency(perCapitaAmount)}`,
          transaction_id: null,
          paid_amount: null,
        })
        .eq('id', charge.id);
    } catch (error: any) {
      fetchData();
      toast.error('Erro: ' + error.message);
    }
  };

  const handleDeleteCharge = async (charge: Charge) => {
    setCharges(prev => prev.filter(c => c.id !== charge.id));
    toast.success('Cobrança excluída!');

    try {
      await supabase
        .from('transactions')
        .delete()
        .eq('reference_type', 'charge')
        .eq('reference_id', charge.id);

      if (charge.transaction_id) {
        await supabase.from('transactions').delete().eq('id', charge.transaction_id);
      }
      await supabase.from('charges').delete().eq('id', charge.id);
    } catch (error: any) {
      fetchData();
      toast.error('Erro: ' + error.message);
    }
  };

  const confirmActionHandler = () => {
    if (!confirmAction) return;
    if (confirmAction.type === 'revert') handleRevertPayment(confirmAction.charge);
    else handleDeleteCharge(confirmAction.charge);
    setConfirmDialogOpen(false);
    setConfirmAction(null);
  };

  const chargeMembers = members.filter(member => getAnnualCharge(member.id));
  const paidCharges = charges.filter(c => getChargeStatus(c) === 'pago').length;
  const partialCharges = charges.filter(c => getChargeStatus(c) === 'parcial').length;
  const pendingCharges = charges.filter(c => getChargeStatus(c) === 'pendente').length;
  const exemptCharges = charges.filter(c => getChargeStatus(c) === 'isento').length;
  const totalCharges = charges.length;
  const progressValue = totalCharges > 0 ? Math.round(((paidCharges + exemptCharges) / totalCharges) * 100) : 0;

  const totalPrevisto = charges.filter(c => c.status !== 'isento').reduce((s, c) => s + Number(c.amount), 0);
  const totalRecebido = charges.filter(c => c.status !== 'isento').reduce((s, c) => s + getPaidAmount(c), 0);
  const totalPendente = Math.max(0, totalPrevisto - totalRecebido);

  const filteredMembers = chargeMembers.filter(member => {
    const charge = getAnnualCharge(member.id);
    if (!charge) return false;
    const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase());
    const memberStatus = getChargeStatus(charge);
    const matchesFilter = !statusFilter || memberStatus === statusFilter;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6 pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-foreground">Cobranças anuais</p>
              <p className="text-xs text-muted-foreground">Uma cobrança por sócio, com contribuição e per capita juntas.</p>
            </div>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>Adimplência</span>
              <span className={cn(
                'font-semibold',
                progressValue >= 70 ? 'text-green-600 dark:text-green-400' :
                progressValue >= 50 ? 'text-yellow-600 dark:text-yellow-400' :
                'text-destructive'
              )}>{progressValue}%</span>
            </div>
            <Progress
              value={progressValue}
              className={cn(
                'h-2.5',
                progressValue >= 70 ? '[&>div]:bg-green-500' :
                progressValue >= 50 ? '[&>div]:bg-yellow-500' :
                '[&>div]:bg-destructive'
              )}
            />
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/30 p-3 mb-4">
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Resumo financeiro - {selectedYear}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <div className="rounded-md bg-background border p-3">
                <p className="text-xs text-muted-foreground">Previsto</p>
                <p className="text-lg font-bold text-foreground">{formatCurrency(totalPrevisto)}</p>
              </div>
              <div className="rounded-md bg-green-50 dark:bg-green-950/20 border p-3">
                <p className="text-xs text-muted-foreground">Recebido</p>
                <p className="text-lg font-bold text-green-700 dark:text-green-400">{formatCurrency(totalRecebido)}</p>
              </div>
              <div className="rounded-md bg-destructive/10 border p-3">
                <p className="text-xs text-muted-foreground">Pendente</p>
                <p className="text-lg font-bold text-destructive">{formatCurrency(totalPendente)}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="flex justify-between rounded-md bg-background/80 px-3 py-2">
                <span className="text-muted-foreground">Contribuição</span>
                <span className="font-semibold">{formatCurrency(contributionAmount)} por sócio</span>
              </div>
              <div className="flex justify-between rounded-md bg-background/80 px-3 py-2">
                <span className="text-muted-foreground">Per capita</span>
                <span className="font-semibold">{formatCurrency(perCapitaAmount)} por sócio</span>
              </div>
              <div className="flex justify-between rounded-md bg-background/80 px-3 py-2">
                <span className="text-muted-foreground">Total anual</span>
                <span className="font-semibold">{formatCurrency(configuredAnnualTotal)} por sócio</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              onClick={() => setStatusFilter(statusFilter === 'pago' ? null : 'pago')}
              className={cn('rounded-lg p-2.5 text-center transition-all cursor-pointer border bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900', statusFilter === 'pago' && 'ring-2 ring-primary ring-offset-1')}
            >
              <Check className="h-4 w-4 text-green-600 mx-auto mb-0.5" />
              <p className="text-lg font-bold text-green-700 dark:text-green-300">{paidCharges}</p>
              <p className="text-[10px] text-green-600 dark:text-green-400">Pagos</p>
            </button>
            <button
              onClick={() => setStatusFilter(statusFilter === 'parcial' ? null : 'parcial')}
              className={cn('rounded-lg p-2.5 text-center transition-all cursor-pointer border bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900', statusFilter === 'parcial' && 'ring-2 ring-primary ring-offset-1')}
            >
              <Wallet className="h-4 w-4 text-yellow-600 mx-auto mb-0.5" />
              <p className="text-lg font-bold text-yellow-700 dark:text-yellow-300">{partialCharges}</p>
              <p className="text-[10px] text-yellow-600 dark:text-yellow-400">Parciais</p>
            </button>
            <button
              onClick={() => setStatusFilter(statusFilter === 'pendente' ? null : 'pendente')}
              className={cn('rounded-lg p-2.5 text-center transition-all cursor-pointer border bg-destructive/10 border-destructive/20', statusFilter === 'pendente' && 'ring-2 ring-primary ring-offset-1')}
            >
              <Clock className="h-4 w-4 text-destructive mx-auto mb-0.5" />
              <p className="text-lg font-bold text-red-700 dark:text-red-300">{pendingCharges}</p>
              <p className="text-[10px] text-red-600 dark:text-red-400">Pendentes</p>
            </button>
            <button
              onClick={() => setStatusFilter(statusFilter === 'isento' ? null : 'isento')}
              className={cn('rounded-lg p-2.5 text-center transition-all cursor-pointer border bg-muted/50 border-border', statusFilter === 'isento' && 'ring-2 ring-primary ring-offset-1')}
            >
              <ShieldCheck className="h-4 w-4 text-muted-foreground mx-auto mb-0.5" />
              <p className="text-lg font-bold text-muted-foreground">{exemptCharges}</p>
              <p className="text-[10px] text-muted-foreground">Isentos</p>
            </button>
          </div>
        </CardContent>
      </Card>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar membro..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card className="hidden md:block">
        <CardContent className="pt-6">
          {filteredMembers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {charges.length === 0
                ? `Nenhuma cobrança anual gerada para ${selectedYear}. Vá em "Configurações" para gerar.`
                : 'Nenhum membro encontrado.'}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Membro</TableHead>
                  <TableHead>Cobrança anual</TableHead>
                  <TableHead>Pago</TableHead>
                  <TableHead>Restante</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.map(member => {
                  const charge = getAnnualCharge(member.id)!;
                  const paid = getPaidAmount(charge);
                  const remaining = getRemainingAmount(charge);
                  const canPay = getChargeStatus(charge) === 'pendente' || getChargeStatus(charge) === 'parcial';

                  return (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.name}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-semibold">{formatCurrency(charge.amount)}</p>
                          <p className="text-xs text-muted-foreground">
                            Contribuição {formatCurrency(contributionAmount)} + Per capita {formatCurrency(perCapitaAmount)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-green-700 dark:text-green-400">{formatCurrency(paid)}</TableCell>
                      <TableCell className={remaining > 0 ? 'font-medium text-destructive' : 'font-medium text-muted-foreground'}>{formatCurrency(remaining)}</TableCell>
                      <TableCell>{getStatusBadge(charge)}</TableCell>
                      <TableCell>{new Date(charge.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {canPay && (
                            <Button size="sm" onClick={() => openPaymentDialog(member, charge)}>
                              <Check className="h-4 w-4 mr-1" />
                              Baixa
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openDetailsDialog(member, charge)}>
                                <Eye className="h-4 w-4 mr-2" />
                                Ver detalhes
                              </DropdownMenuItem>
                              {paid > 0 && (
                                <DropdownMenuItem onClick={() => { setConfirmAction({ type: 'revert', charge }); setConfirmDialogOpen(true); }}>
                                  <Undo2 className="h-4 w-4 mr-2" />
                                  Reverter pagamento
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => { setConfirmAction({ type: 'delete', charge }); setConfirmDialogOpen(true); }} className="text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir cobrança
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      <div className="md:hidden space-y-2">
        {filteredMembers.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">
                {charges.length === 0
                  ? `Nenhuma cobrança anual gerada para ${selectedYear}. Vá em "Configurações" para gerar.`
                  : 'Nenhum membro encontrado.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredMembers.map(member => {
            const charge = getAnnualCharge(member.id)!;
            const paid = getPaidAmount(charge);
            const remaining = getRemainingAmount(charge);
            const status = getChargeStatus(charge);
            const canPay = status === 'pendente' || status === 'parcial';

            return (
              <Card key={member.id} className={cn(
                status === 'pago' && 'border-l-4 border-l-green-500 bg-green-50 dark:bg-green-950/20',
                status === 'parcial' && 'border-l-4 border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20',
                status === 'pendente' && 'border-l-4 border-l-destructive bg-destructive/5',
                status === 'isento' && 'border-l-4 border-l-muted bg-muted/30 opacity-75'
              )}>
                <CardContent className="p-3 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-semibold truncate">{member.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        Contribuição {formatCurrency(contributionAmount)} + Per capita {formatCurrency(perCapitaAmount)}
                      </p>
                    </div>
                    {getStatusBadge(charge)}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded-md bg-background/80 p-2">
                      <p className="text-muted-foreground">Total</p>
                      <p className="font-bold">{formatCurrency(charge.amount)}</p>
                    </div>
                    <div className="rounded-md bg-background/80 p-2">
                      <p className="text-muted-foreground">Pago</p>
                      <p className="font-bold text-green-700 dark:text-green-400">{formatCurrency(paid)}</p>
                    </div>
                    <div className="rounded-md bg-background/80 p-2">
                      <p className="text-muted-foreground">Restante</p>
                      <p className={remaining > 0 ? 'font-bold text-destructive' : 'font-bold'}>{formatCurrency(remaining)}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {new Date(charge.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </span>
                    <div className="flex gap-1">
                      {canPay && <Button size="sm" onClick={() => openPaymentDialog(member, charge)}>Baixa</Button>}
                      <Button size="sm" variant="outline" onClick={() => openDetailsDialog(member, charge)}>Detalhes</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Dar baixa - {selectedMember?.name}</DialogTitle>
          </DialogHeader>
          {selectedCharge && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Contribuição</span><span className="font-medium">{formatCurrency(contributionAmount)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Per capita</span><span className="font-medium">{formatCurrency(perCapitaAmount)}</span></div>
                <div className="flex justify-between text-sm border-t pt-2"><span className="font-semibold">Total anual</span><span className="font-bold">{formatCurrency(selectedCharge.amount)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Já recebido</span><span className="font-medium text-green-700 dark:text-green-400">{formatCurrency(getPaidAmount(selectedCharge))}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Restante</span><span className="font-medium text-destructive">{formatCurrency(getRemainingAmount(selectedCharge))}</span></div>
              </div>

              <div className="space-y-2">
                <Label>Valor recebido</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={getRemainingAmount(selectedCharge)}
                    className="pl-10"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">Para quitar tudo, mantenha o valor restante. Para baixa parcial, informe apenas o que entrou.</p>
              </div>

              <div className="space-y-2">
                <Label>Data e Hora do Pagamento</Label>
                <Input type="datetime-local" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Método de Pagamento</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Observação (opcional)</Label>
                <Textarea placeholder="Observações..." value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Comprovante (opcional)</Label>
                <Input type="file" accept="image/*,.pdf" onChange={(e) => setReceiptFile(e.target.files?.[0] || null)} />
              </div>

              <Button className="w-full" onClick={handlePayment} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Receipt className="h-4 w-4 mr-2" />}
                {submitting ? 'Processando...' : 'Confirmar baixa'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes - {viewingMember?.name}</DialogTitle>
          </DialogHeader>
          {viewingCharge && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Total anual</p>
                  <p className="font-medium">{formatCurrency(viewingCharge.amount)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  {getStatusBadge(viewingCharge)}
                </div>
                <div>
                  <p className="text-muted-foreground">Contribuição</p>
                  <p className="font-medium">{formatCurrency(contributionAmount)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Per capita</p>
                  <p className="font-medium">{formatCurrency(perCapitaAmount)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Valor pago</p>
                  <p className="font-medium text-green-700 dark:text-green-400">{formatCurrency(getPaidAmount(viewingCharge))}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Restante</p>
                  <p className="font-medium text-destructive">{formatCurrency(getRemainingAmount(viewingCharge))}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Último pagamento</p>
                  <p className="font-medium">{viewingCharge.paid_at ? new Date(viewingCharge.paid_at).toLocaleString('pt-BR') : '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Método</p>
                  <p className="font-medium capitalize">{viewingCharge.payment_method || '-'}</p>
                </div>
              </div>
              {viewingCharge.notes && (
                <div>
                  <p className="text-muted-foreground text-sm">Observações</p>
                  <p className="text-sm whitespace-pre-line">{viewingCharge.notes}</p>
                </div>
              )}
              {viewingCharge.receipt_url && (
                <div>
                  <p className="text-muted-foreground text-sm mb-2">Comprovante</p>
                  <ReceiptLink reference={viewingCharge.receipt_url} className="text-primary underline text-sm">
                    Ver comprovante
                  </ReceiptLink>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === 'revert' ? 'Reverter pagamento?' : 'Excluir cobrança?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === 'revert'
                ? 'Todos os recebimentos ligados a esta cobrança serão removidos e ela voltará para pendente.'
                : 'A cobrança anual será excluída permanentemente junto com receitas vinculadas.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmActionHandler}>
              {confirmAction?.type === 'revert' ? 'Reverter' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
