import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';
import { ChargeCard, type ChargeCardVariant } from './ChargeCard';
import { toast } from 'sonner';
import { Check, MoreHorizontal, Receipt, Loader2, Undo2, Trash2, Edit, Eye, Calendar, User, Search, Clock, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  paid_amount: number | null;
  status: string;
  due_date: string;
  paid_at: string | null;
  payment_method: string | null;
  receipt_url: string | null;
  transaction_id: string | null;
  notes: string | null;
}

export function CobrancasTab() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const currentYear = new Date().getFullYear();
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[new Date().getMonth()]);
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [members, setMembers] = useState<Member[]>([]);
  const [charges, setCharges] = useState<Charge[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  
  // Dialog state - Dar Baixa
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
  // Partial payment state
  const [partialAmounts, setPartialAmounts] = useState<Record<string, string>>({});
  const [isPartialPayment, setIsPartialPayment] = useState(false);

  // Dialog state - Editar Pagamento
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingCharge, setEditingCharge] = useState<Charge | null>(null);
  const [editPaymentDate, setEditPaymentDate] = useState('');
  const [editPaymentMethod, setEditPaymentMethod] = useState('');
  const [editPaymentNotes, setEditPaymentNotes] = useState('');

  // Dialog state - Ver Detalhes
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [viewingCharge, setViewingCharge] = useState<Charge | null>(null);

  // Alert Dialog - Confirmar ações
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: 'revert' | 'delete'; charge: Charge } | null>(null);

  const competence = `${selectedMonth}/${selectedYear}`;
  const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  useEffect(() => {
    fetchData();
  }, [competence]);

  const { profile, isAdmin, isPastor, selectedSocietyId } = useAuth();
  const societyId = (!isAdmin && !isPastor) ? profile?.society_id : selectedSocietyId;

  const fetchData = async () => {
    setLoading(true);
    let membersQuery = supabase.from('members').select('id, name').eq('active', true).order('name');
    
    // Fetch monthly charges (percapita) AND annual charges (mensalidade with competence = year)
    let chargesQuery = supabase.from('charges').select('*').in('competence', [competence, selectedYear]);

    if (societyId) {
      membersQuery = membersQuery.eq('society_id', societyId);
      chargesQuery = chargesQuery.eq('society_id', societyId);
    }

    const [membersRes, chargesRes] = await Promise.all([membersQuery, chargesQuery]);

    setMembers(membersRes.data || []);
    setCharges(chargesRes.data || []);
    setLoading(false);
  };

  const getChargeByType = (memberId: string, type: string) => {
    return charges.find(c => c.member_id === memberId && c.type === type);
  };

  const getMemberCharges = (memberId: string) => {
    return charges.filter(c => c.member_id === memberId);
  };

  const getStatusBadge = (charge: Charge) => {
    const status = charge.status;
    const isPartial = status === 'pago' && charge.paid_amount !== null && charge.paid_amount < charge.amount;
    
    if (isPartial) {
      return <Badge variant="secondary" className="bg-warning/20 text-warning-foreground border-warning">Parcial</Badge>;
    }
    
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
    
    // Check for charges that can be paid (pendente or parcial)
    const canPayMensalidade = mensalidade?.status === 'pendente' || 
      (mensalidade?.status === 'pago' && mensalidade.paid_amount !== null && mensalidade.paid_amount < mensalidade.amount);
    const canPayPercapita = percapita?.status === 'pendente' || 
      (percapita?.status === 'pago' && percapita.paid_amount !== null && percapita.paid_amount < percapita.amount);
    
    setPayMensalidade(canPayMensalidade || false);
    setPayPercapita(canPayPercapita || false);
    setPaymentDate(new Date().toISOString().slice(0, 16));
    setPaymentMethod('pix');
    setPaymentNotes('');
    setReceiptFile(null);
    setIsPartialPayment(false);
    
    // Initialize partial amounts with remaining amounts
    const amounts: Record<string, string> = {};
    if (mensalidade && canPayMensalidade) {
      const remaining = mensalidade.amount - (mensalidade.paid_amount || 0);
      amounts[mensalidade.id] = remaining.toFixed(2);
    }
    if (percapita && canPayPercapita) {
      const remaining = percapita.amount - (percapita.paid_amount || 0);
      amounts[percapita.id] = remaining.toFixed(2);
    }
    setPartialAmounts(amounts);
    
    setDialogOpen(true);
  };

  const openEditDialog = (charge: Charge) => {
    setEditingCharge(charge);
    setEditPaymentDate(charge.paid_at ? new Date(charge.paid_at).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16));
    setEditPaymentMethod(charge.payment_method || 'pix');
    setEditPaymentNotes(charge.notes || '');
    setEditDialogOpen(true);
  };

  const openDetailsDialog = (charge: Charge) => {
    setViewingCharge(charge);
    setDetailsDialogOpen(true);
  };

  const handlePayment = async () => {
    if (!selectedMember || !user) return;
    if (!payMensalidade && !payPercapita) {
      toast.error('Selecione pelo menos uma cobrança');
      return;
    }

    const paidAt = new Date(paymentDate).toISOString();
    
    // Get charges to process (pendente or parcial)
    const chargesToPay = memberCharges.filter(c => {
      const isPending = c.status === 'pendente';
      const isPartial = c.status === 'pago' && c.paid_amount !== null && c.paid_amount < c.amount;
      const isSelected = (c.type === 'mensalidade' && payMensalidade) || (c.type === 'percapita' && payPercapita);
      return isSelected && (isPending || isPartial);
    });

    if (chargesToPay.length === 0) {
      toast.error('Nenhuma cobrança selecionada para pagamento');
      return;
    }

    // Calculate amounts for each charge
    const paymentsInfo = chargesToPay.map(charge => {
      const enteredAmount = parseFloat(partialAmounts[charge.id] || '0');
      const previouslyPaid = charge.paid_amount || 0;
      const remainingAmount = charge.amount - previouslyPaid;
      const amountToPay = isPartialPayment ? Math.min(enteredAmount, remainingAmount) : remainingAmount;
      const newTotalPaid = previouslyPaid + amountToPay;
      const isFullyPaid = newTotalPaid >= charge.amount;
      
      return {
        charge,
        amountToPay,
        newTotalPaid,
        isFullyPaid
      };
    });

    // Validate amounts
    for (const info of paymentsInfo) {
      if (info.amountToPay <= 0) {
        toast.error(`Informe um valor válido para ${info.charge.type === 'mensalidade' ? 'Mensalidade' : 'Per Capita'}`);
        return;
      }
    }

    // Atualização otimista - atualiza UI imediatamente
    setCharges(prev => prev.map(c => {
      const paymentInfo = paymentsInfo.find(p => p.charge.id === c.id);
      if (!paymentInfo) return c;
      
      return { 
        ...c, 
        status: 'pago', 
        paid_at: paidAt, 
        payment_method: paymentMethod,
        paid_amount: paymentInfo.newTotalPaid
      };
    }));
    setDialogOpen(false);
    toast.success(isPartialPayment ? 'Pagamento parcial registrado!' : 'Pagamento registrado!');

    // Processar em background
    try {
      let receiptUrl: string | null = null;

      if (receiptFile) {
        const fileExt = receiptFile.name.split('.').pop();
        const fileName = `${Date.now()}-${selectedMember.id}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(fileName, receiptFile);

        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(fileName);
          receiptUrl = urlData.publicUrl;
        }
      }

      for (const info of paymentsInfo) {
        const { charge, amountToPay, newTotalPaid } = info;
        const partialNote = isPartialPayment && newTotalPaid < charge.amount 
          ? ` (Pagamento parcial: R$ ${amountToPay.toFixed(2).replace('.', ',')} de R$ ${charge.amount.toFixed(2).replace('.', ',')})`
          : '';

        const { data: transaction } = await supabase
          .from('transactions')
          .insert({
            description: `${charge.type === 'mensalidade' ? 'Mensalidade' : 'Per Capita'} - ${selectedMember.name} - ${competence}${partialNote}`,
            amount: amountToPay,
            type: 'entrada',
            date: paidAt.split('T')[0],
            created_by: user.id,
            origin: 'automatic',
            reference_type: 'charge',
            reference_id: charge.id,
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
            receipt_url: receiptUrl,
            notes: paymentNotes,
            transaction_id: transaction?.id,
            paid_amount: newTotalPaid
          })
          .eq('id', charge.id);
      }
    } catch (error: any) {
      // Reverter estado em caso de erro
      fetchData();
      toast.error('Erro ao processar: ' + error.message);
    }
  };

  const handleEditPayment = async () => {
    if (!editingCharge) return;

    setSubmitting(true);
    try {
      const paidAt = new Date(editPaymentDate).toISOString();

      await supabase
        .from('charges')
        .update({
          paid_at: paidAt,
          payment_method: editPaymentMethod,
          notes: editPaymentNotes
        })
        .eq('id', editingCharge.id);

      if (editingCharge.transaction_id) {
        await supabase
          .from('transactions')
          .update({ date: paidAt.split('T')[0] })
          .eq('id', editingCharge.transaction_id);
      }

      toast.success('Pagamento atualizado!');
      setEditDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error('Erro: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevertPayment = async (charge: Charge) => {
    // Atualização otimista
    setCharges(prev => prev.map(c => 
      c.id === charge.id
        ? { ...c, status: 'pendente', paid_at: null, payment_method: null, receipt_url: null, notes: null, transaction_id: null, paid_amount: null }
        : c
    ));
    toast.success('Pagamento revertido para pendente!');

    try {
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
          notes: null,
          transaction_id: null,
          paid_amount: null
        })
        .eq('id', charge.id);
    } catch (error: any) {
      fetchData();
      toast.error('Erro: ' + error.message);
    }
  };

  const handleDeleteCharge = async (charge: Charge) => {
    // Atualização otimista
    setCharges(prev => prev.filter(c => c.id !== charge.id));
    toast.success('Cobrança excluída!');

    try {
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

  const paidCharges = charges.filter(c => c.status === 'pago').length;
  const pendingCharges = charges.filter(c => c.status === 'pendente').length;
  const exemptCharges = charges.filter(c => c.status === 'isento').length;
  const totalCharges = charges.length;
  const progressValue = totalCharges > 0 ? Math.round((paidCharges / totalCharges) * 100) : 0;

  // Financial summary calculations
  const formatCurrency = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;
  
  const mensalidadeCharges = charges.filter(c => c.type === 'mensalidade' && c.status !== 'isento');
  const percapitaCharges = charges.filter(c => c.type === 'percapita' && c.status !== 'isento');
  
  const mensalidadePrevisto = mensalidadeCharges.reduce((s, c) => s + Number(c.amount), 0);
  const mensalidadeRecebido = mensalidadeCharges.filter(c => c.status === 'pago').reduce((s, c) => s + Number(c.paid_amount || c.amount), 0);
  const mensalidadePendente = mensalidadePrevisto - mensalidadeRecebido;
  
  const percapitaPrevisto = percapitaCharges.reduce((s, c) => s + Number(c.amount), 0);
  const percapitaRecebido = percapitaCharges.filter(c => c.status === 'pago').reduce((s, c) => s + Number(c.paid_amount || c.amount), 0);
  const percapitaPendente = percapitaPrevisto - percapitaRecebido;
  
  const totalPrevisto = mensalidadePrevisto + percapitaPrevisto;
  const totalRecebido = mensalidadeRecebido + percapitaRecebido;
  const totalPendente = mensalidadePendente + percapitaPendente;

  // Determine member variant based on their charges
  const getMemberVariant = (memberId: string): ChargeCardVariant => {
    const memberChargesArr = charges.filter(c => c.member_id === memberId);
    if (memberChargesArr.length === 0) return 'pendente';
    const allIsento = memberChargesArr.every(c => c.status === 'isento');
    if (allIsento) return 'isento';
    const hasPartial = memberChargesArr.some(c => c.status === 'pago' && c.paid_amount !== null && c.paid_amount < c.amount);
    if (hasPartial) return 'parcial';
    const allPaid = memberChargesArr.every(c => c.status === 'pago' || c.status === 'isento');
    if (allPaid) return 'pago';
    return 'pendente';
  };

  // Determine member status for filtering
  const getMemberStatus = (memberId: string): string => {
    return getMemberVariant(memberId);
  };

  // Filter members
  const filteredMembers = members.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase());
    const memberStatus = getMemberStatus(member.id);
    const matchesFilter = !statusFilter || memberStatus === statusFilter;
    const hasCharges = charges.some(c => c.member_id === member.id);
    return matchesSearch && matchesFilter && hasCharges;
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
      {/* Header: Month/Year selectors */}
      <Card>
        <CardContent className="pt-6 pb-4">
          <div className="flex gap-2 mb-4">
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

          {/* Progress bar */}
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

          {/* Financial Summary */}
          <div className="rounded-lg border border-border/60 bg-muted/30 p-3 mb-4">
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Resumo Financeiro — {competence}</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              {/* Mensalidade */}
              <div className="space-y-1">
                <p className="text-xs font-medium text-foreground">Mensalidade</p>
                <div className="text-xs text-muted-foreground flex justify-between"><span>Previsto</span><span className="font-medium text-foreground">{formatCurrency(mensalidadePrevisto)}</span></div>
                <div className="text-xs flex justify-between"><span className="text-green-600 dark:text-green-400">Recebido</span><span className="font-medium text-green-600 dark:text-green-400">{formatCurrency(mensalidadeRecebido)}</span></div>
                <div className="text-xs flex justify-between"><span className="text-destructive">Pendente</span><span className="font-medium text-destructive">{formatCurrency(mensalidadePendente)}</span></div>
              </div>
              {/* Per Capita */}
              <div className="space-y-1">
                <p className="text-xs font-medium text-foreground">Per Capita</p>
                <div className="text-xs text-muted-foreground flex justify-between"><span>Previsto</span><span className="font-medium text-foreground">{formatCurrency(percapitaPrevisto)}</span></div>
                <div className="text-xs flex justify-between"><span className="text-green-600 dark:text-green-400">Recebido</span><span className="font-medium text-green-600 dark:text-green-400">{formatCurrency(percapitaRecebido)}</span></div>
                <div className="text-xs flex justify-between"><span className="text-destructive">Pendente</span><span className="font-medium text-destructive">{formatCurrency(percapitaPendente)}</span></div>
              </div>
            </div>
            {/* Total */}
            <div className="border-t border-border/60 pt-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-foreground">Total</span>
                <span className="font-bold text-foreground">{formatCurrency(totalPrevisto)}</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-green-600 dark:text-green-400 font-medium">Recebido: {formatCurrency(totalRecebido)}</span>
                <span className="text-xs text-destructive font-medium">Pendente: {formatCurrency(totalPendente)}</span>
              </div>
            </div>
          </div>

          {/* Status mini-cards */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setStatusFilter(statusFilter === 'pago' ? null : 'pago')}
              className={cn(
                'rounded-lg p-2.5 text-center transition-all cursor-pointer border',
                'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900',
                statusFilter === 'pago' && 'ring-2 ring-primary ring-offset-1'
              )}
            >
              <Check className="h-4 w-4 text-green-600 dark:text-green-400 mx-auto mb-0.5" />
              <p className="text-lg font-bold text-green-700 dark:text-green-300">{paidCharges}</p>
              <p className="text-[10px] text-green-600 dark:text-green-400">Pagos</p>
            </button>
            <button
              onClick={() => setStatusFilter(statusFilter === 'pendente' ? null : 'pendente')}
              className={cn(
                'rounded-lg p-2.5 text-center transition-all cursor-pointer border',
                'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900',
                statusFilter === 'pendente' && 'ring-2 ring-primary ring-offset-1'
              )}
            >
              <Clock className="h-4 w-4 text-destructive mx-auto mb-0.5" />
              <p className="text-lg font-bold text-red-700 dark:text-red-300">{pendingCharges}</p>
              <p className="text-[10px] text-red-600 dark:text-red-400">Pendentes</p>
            </button>
            <button
              onClick={() => setStatusFilter(statusFilter === 'isento' ? null : 'isento')}
              className={cn(
                'rounded-lg p-2.5 text-center transition-all cursor-pointer border',
                'bg-muted/50 border-border',
                statusFilter === 'isento' && 'ring-2 ring-primary ring-offset-1'
              )}
            >
              <ShieldCheck className="h-4 w-4 text-muted-foreground mx-auto mb-0.5" />
              <p className="text-lg font-bold text-muted-foreground">{exemptCharges}</p>
              <p className="text-[10px] text-muted-foreground">Isentos</p>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar membro..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Desktop: Table */}
      <Card className="hidden md:block">
        <CardContent className="pt-6">
          {filteredMembers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {charges.length === 0
                ? `Nenhuma cobrança gerada para ${competence}. Vá em "Configurações" para gerar.`
                : 'Nenhum membro encontrado.'}
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
                {filteredMembers.map(member => {
                  const mensalidade = getChargeByType(member.id, 'mensalidade');
                  const percapita = getChargeByType(member.id, 'percapita');
                  
                  if (!mensalidade && !percapita) return null;

                  // Check if charge can receive payment (pending or partial)
                  const canPayMensalidade = mensalidade?.status === 'pendente' || 
                    (mensalidade?.status === 'pago' && mensalidade.paid_amount !== null && mensalidade.paid_amount < mensalidade.amount);
                  const canPayPercapita = percapita?.status === 'pendente' || 
                    (percapita?.status === 'pago' && percapita.paid_amount !== null && percapita.paid_amount < percapita.amount);
                  const hasPendingCharges = canPayMensalidade || canPayPercapita;

                  return (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.name}</TableCell>
                      <TableCell>
                        {mensalidade ? (
                          <div className="flex items-center gap-2">
                            <span>R$ {mensalidade.amount.toFixed(2).replace('.', ',')}</span>
                            {getStatusBadge(mensalidade)}
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {percapita ? (
                          <div className="flex items-center gap-2">
                            <span>R$ {percapita.amount.toFixed(2).replace('.', ',')}</span>
                            {getStatusBadge(percapita)}
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
                          {hasPendingCharges && (
                            <Button size="sm" onClick={() => openPaymentDialog(member)}>
                              <Check className="h-4 w-4 mr-1" />
                              Baixa
                            </Button>
                          )}
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {mensalidade?.status === 'pago' && (
                                <>
                                  <DropdownMenuItem onClick={() => openDetailsDialog(mensalidade)}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    Ver Mensalidade
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openEditDialog(mensalidade)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Editar Mensalidade
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => {
                                      setConfirmAction({ type: 'revert', charge: mensalidade });
                                      setConfirmDialogOpen(true);
                                    }}
                                  >
                                    <Undo2 className="h-4 w-4 mr-2" />
                                    Reverter para Pendente
                                  </DropdownMenuItem>
                                </>
                              )}
                              {percapita?.status === 'pago' && (
                                <>
                                  <DropdownMenuItem onClick={() => openDetailsDialog(percapita)}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    Ver Per Capita
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openEditDialog(percapita)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Editar Per Capita
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => {
                                      setConfirmAction({ type: 'revert', charge: percapita });
                                      setConfirmDialogOpen(true);
                                    }}
                                  >
                                    <Undo2 className="h-4 w-4 mr-2" />
                                    Reverter para Pendente
                                  </DropdownMenuItem>
                                </>
                              )}
                              {mensalidade && (
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setConfirmAction({ type: 'delete', charge: mensalidade });
                                    setConfirmDialogOpen(true);
                                  }}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Excluir Mensalidade
                                </DropdownMenuItem>
                              )}
                              {percapita && (
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setConfirmAction({ type: 'delete', charge: percapita });
                                    setConfirmDialogOpen(true);
                                  }}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Excluir Per Capita
                                </DropdownMenuItem>
                              )}
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

      {/* Mobile: Cards */}
      <div className="md:hidden space-y-1">
        {filteredMembers.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">
                {charges.length === 0
                  ? `Nenhuma cobrança gerada para ${competence}. Vá em "Configurações" para gerar.`
                  : 'Nenhum membro encontrado.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredMembers.map(member => {
            const mensalidade = getChargeByType(member.id, 'mensalidade');
            const percapita = getChargeByType(member.id, 'percapita');

            const canPayMensalidade = mensalidade?.status === 'pendente' || 
              (mensalidade?.status === 'pago' && mensalidade.paid_amount !== null && mensalidade.paid_amount < mensalidade.amount);
            const canPayPercapita = percapita?.status === 'pendente' || 
              (percapita?.status === 'pago' && percapita.paid_amount !== null && percapita.paid_amount < percapita.amount);
            const hasPendingCharges = canPayMensalidade || canPayPercapita;

            return (
              <ChargeCard
                key={member.id}
                memberName={member.name}
                variant={getMemberVariant(member.id)}
                mensalidade={mensalidade ? {
                  amount: mensalidade.amount,
                  status: mensalidade.status,
                  due_date: mensalidade.due_date,
                  paid_amount: mensalidade.paid_amount,
                } : null}
                percapita={percapita ? {
                  amount: percapita.amount,
                  status: percapita.status,
                  due_date: percapita.due_date,
                  paid_amount: percapita.paid_amount,
                } : null}
                hasPendingCharges={hasPendingCharges}
                onPayment={() => openPaymentDialog(member)}
                onViewMensalidade={mensalidade?.status === 'pago' ? () => openDetailsDialog(mensalidade) : undefined}
                onViewPercapita={percapita?.status === 'pago' ? () => openDetailsDialog(percapita) : undefined}
              />
            );
          })
        )}
      </div>

      {/* Dialog de Dar Baixa */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Dar Baixa - {selectedMember?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Toggle for partial payment */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="partial-payment"
                checked={isPartialPayment}
                onCheckedChange={(checked) => setIsPartialPayment(!!checked)}
              />
              <label htmlFor="partial-payment" className="text-sm font-medium">
                Pagamento parcial
              </label>
            </div>

            <div className="space-y-3">
              <Label>O que foi pago?</Label>
              {memberCharges.map(charge => {
                const isPending = charge.status === 'pendente';
                const isPartialCharge = charge.status === 'pago' && charge.paid_amount !== null && charge.paid_amount < charge.amount;
                const canPay = isPending || isPartialCharge;
                const previouslyPaid = charge.paid_amount || 0;
                const remainingAmount = charge.amount - previouslyPaid;
                const isSelected = charge.type === 'mensalidade' ? payMensalidade : payPercapita;

                return (
                  <div key={charge.id} className="space-y-2 p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={charge.id}
                        checked={isSelected}
                        onCheckedChange={(checked) => {
                          if (charge.type === 'mensalidade') setPayMensalidade(!!checked);
                          else setPayPercapita(!!checked);
                        }}
                        disabled={!canPay}
                      />
                      <label htmlFor={charge.id} className="text-sm flex-1">
                        <span className="font-medium">
                          {charge.type === 'mensalidade' ? 'Mensalidade' : 'Per Capita'}
                        </span>
                        <span className="text-muted-foreground ml-2">
                          R$ {charge.amount.toFixed(2).replace('.', ',')}
                        </span>
                        {isPartialCharge && (
                          <span className="text-warning ml-2">
                            (Pago: R$ {previouslyPaid.toFixed(2).replace('.', ',')} | Restante: R$ {remainingAmount.toFixed(2).replace('.', ',')})
                          </span>
                        )}
                        {!canPay && charge.status === 'pago' && !isPartialCharge && (
                          <span className="text-muted-foreground ml-2">(Pago integralmente)</span>
                        )}
                      </label>
                    </div>
                    
                    {/* Show amount input when partial payment is enabled and charge is selected */}
                    {isPartialPayment && isSelected && canPay && (
                      <div className="ml-6 flex items-center gap-2">
                        <Label className="text-xs whitespace-nowrap">Valor a pagar:</Label>
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0.01"
                            max={remainingAmount}
                            className="pl-10"
                            value={partialAmounts[charge.id] || ''}
                            onChange={(e) => setPartialAmounts(prev => ({
                              ...prev,
                              [charge.id]: e.target.value
                            }))}
                            placeholder={remainingAmount.toFixed(2)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
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

            <Button className="w-full" onClick={handlePayment} disabled={submitting || (!payMensalidade && !payPercapita)}>
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Receipt className="h-4 w-4 mr-2" />}
              {submitting ? 'Processando...' : 'Confirmar Pagamento'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Editar Pagamento */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar - {editingCharge?.type === 'mensalidade' ? 'Mensalidade' : 'Per Capita'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Data e Hora</Label>
              <Input type="datetime-local" value={editPaymentDate} onChange={(e) => setEditPaymentDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Método</Label>
              <Select value={editPaymentMethod} onValueChange={setEditPaymentMethod}>
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
              <Label>Observação</Label>
              <Textarea value={editPaymentNotes} onChange={(e) => setEditPaymentNotes(e.target.value)} />
            </div>
            <Button className="w-full" onClick={handleEditPayment} disabled={submitting}>
              {submitting ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Ver Detalhes */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes - {viewingCharge?.type === 'mensalidade' ? 'Mensalidade' : 'Per Capita'}</DialogTitle>
          </DialogHeader>
          {viewingCharge && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Valor Total</p>
                  <p className="font-medium">R$ {viewingCharge.amount.toFixed(2).replace('.', ',')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  {getStatusBadge(viewingCharge)}
                </div>
                {viewingCharge.paid_amount !== null && viewingCharge.paid_amount !== undefined && (
                  <>
                    <div>
                      <p className="text-muted-foreground">Valor Pago</p>
                      <p className="font-medium text-success">R$ {viewingCharge.paid_amount.toFixed(2).replace('.', ',')}</p>
                    </div>
                    {viewingCharge.paid_amount < viewingCharge.amount && (
                      <div>
                        <p className="text-muted-foreground">Valor Restante</p>
                        <p className="font-medium text-warning">R$ {(viewingCharge.amount - viewingCharge.paid_amount).toFixed(2).replace('.', ',')}</p>
                      </div>
                    )}
                  </>
                )}
                <div>
                  <p className="text-muted-foreground">Data do Pagamento</p>
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
                  <p className="text-sm">{viewingCharge.notes}</p>
                </div>
              )}
              {viewingCharge.receipt_url && (
                <div>
                  <p className="text-muted-foreground text-sm mb-2">Comprovante</p>
                  <a href={viewingCharge.receipt_url} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm">
                    Ver comprovante
                  </a>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Alert Dialog de Confirmação */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === 'revert' ? 'Reverter Pagamento?' : 'Excluir Cobrança?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === 'revert' 
                ? 'O pagamento será revertido para pendente e a receita vinculada será excluída.'
                : 'A cobrança será excluída permanentemente junto com a receita vinculada.'}
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
