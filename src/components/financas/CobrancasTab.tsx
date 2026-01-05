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
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Check, MoreHorizontal, Receipt, Loader2, Undo2, Trash2, Edit, Eye } from 'lucide-react';

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
  notes: string | null;
}

export function CobrancasTab() {
  const { user } = useAuth();
  const currentYear = new Date().getFullYear();
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[new Date().getMonth()]);
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [members, setMembers] = useState<Member[]>([]);
  const [charges, setCharges] = useState<Charge[]>([]);
  const [loading, setLoading] = useState(true);
  
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

  const getChargeByType = (memberId: string, type: string) => {
    return charges.find(c => c.member_id === memberId && c.type === type);
  };

  const getMemberCharges = (memberId: string) => {
    return charges.filter(c => c.member_id === memberId);
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
    const chargesToPay = memberCharges.filter(c => 
      (c.type === 'mensalidade' && payMensalidade && c.status === 'pendente') ||
      (c.type === 'percapita' && payPercapita && c.status === 'pendente')
    );

    // Atualização otimista - atualiza UI imediatamente
    setCharges(prev => prev.map(c => 
      chargesToPay.some(cp => cp.id === c.id)
        ? { ...c, status: 'pago', paid_at: paidAt, payment_method: paymentMethod }
        : c
    ));
    setDialogOpen(false);
    toast.success('Pagamento registrado!');

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

      for (const charge of chargesToPay) {
        const { data: transaction } = await supabase
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
        ? { ...c, status: 'pendente', paid_at: null, payment_method: null, receipt_url: null, notes: null, transaction_id: null }
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
          transaction_id: null
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
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

                  const hasPendingCharges = mensalidade?.status === 'pendente' || percapita?.status === 'pendente';

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

      {/* Dialog de Dar Baixa */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Dar Baixa - {selectedMember?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
                  <p className="text-muted-foreground">Valor</p>
                  <p className="font-medium">R$ {viewingCharge.amount.toFixed(2).replace('.', ',')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  {getStatusBadge(viewingCharge.status)}
                </div>
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
