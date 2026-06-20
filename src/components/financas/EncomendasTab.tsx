import { useState, useEffect, useMemo, useCallback } from 'react';
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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Plus, Loader2, Trash2, Truck, CircleDollarSign, Search, PackageCheck, Gift, Shirt } from 'lucide-react';
import type { ShirtCampaign } from './CampanhasCamisasTab';

const SIZES = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'Inf2', 'Inf3', 'Inf4'];
const SIZE_LABEL: Record<string, string> = {
  PP: 'PP', P: 'P', M: 'M', G: 'G', GG: 'GG', XG: 'XG',
  Inf2: 'Inf 2 anos', Inf3: 'Inf 3 anos', Inf4: 'Inf 4 anos',
};
const COLORS = [
  { value: 'off', label: 'Off White' },
  { value: 'preta', label: 'Preta' },
];
const COLOR_LABEL: Record<string, string> = { off: 'Off White', preta: 'Preta' };

export interface OrderItem {
  color: string;
  size: string;
  qty: number;
}

const emptyItem = (): OrderItem => ({ color: 'off', size: 'M', qty: 1 });

const itemsSummary = (items: OrderItem[]) =>
  items.map(i => `${COLOR_LABEL[i.color] || i.color}: ${i.qty} ${SIZE_LABEL[i.size] || i.size}`).join(' | ');

export interface ShirtOrder {
  id: string;
  buyer_name: string;
  size: string;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  total_price: number;
  payment_type: string;
  amount_paid: number;
  delivery_status: string;
  delivered_at: string | null;
  notes: string | null;
  date: string;
  is_gift?: boolean;
  items?: OrderItem[];
  campaign_id?: string | null;
}

export const brl = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));

export function getPaymentStatus(order: ShirtOrder): 'gift' | 'pending' | 'partial' | 'paid' {
  if (order.is_gift) return 'gift';
  if (Number(order.amount_paid) <= 0) return 'pending';
  if (Number(order.amount_paid) < Number(order.total_price)) return 'partial';
  return 'paid';
}

export function getPaymentRowClass(order: ShirtOrder): string {
  const status = getPaymentStatus(order);
  if (status === 'gift') return 'bg-blue-500/10 hover:bg-blue-500/15';
  if (status === 'paid') return 'bg-green-500/10 hover:bg-green-500/15';
  if (status === 'partial') return 'bg-yellow-400/15 hover:bg-yellow-400/20';
  return 'bg-muted/20 hover:bg-muted/35';
}

function paymentBadge(order: ShirtOrder) {
  const status = getPaymentStatus(order);
  if (status === 'gift') return <Badge className="bg-primary/15 text-primary hover:bg-primary/20"><Gift className="h-3 w-3 mr-1" />Brinde</Badge>;
  if (status === 'pending') return <Badge variant="destructive">Pendente</Badge>;
  if (status === 'partial') return <Badge variant="secondary">Parcial</Badge>;
  return <Badge className="bg-success text-success-foreground hover:bg-success/90">Pago</Badge>;
}

export interface CampaignFinancialSummary {
  purchasedQuantity: number;
  orderedQuantity: number;
  availableQuantity: number;
  giftQuantity: number;
  totalCost: number;
  totalSold: number;
  totalReceived: number;
  totalPending: number;
  currentCashResult: number;
  projectedProfit: number;
}

export function calculateCampaignSummary(campaign: ShirtCampaign, orders: ShirtOrder[]): CampaignFinancialSummary {
  const orderedQuantity = orders.reduce((sum, o) => sum + Number(o.quantity || 0), 0);
  const giftQuantity = orders.filter(o => o.is_gift).reduce((sum, o) => sum + Number(o.quantity || 0), 0);
  const totalSold = orders.reduce((sum, o) => sum + Number(o.total_price || 0), 0);
  const totalReceived = orders.reduce((sum, o) => sum + Number(o.amount_paid || 0), 0);
  const totalCost = Number(campaign.total_purchase_cost || 0);
  return {
    purchasedQuantity: Number(campaign.purchased_quantity || 0),
    orderedQuantity,
    availableQuantity: Math.max(0, Number(campaign.purchased_quantity || 0) - orderedQuantity),
    giftQuantity,
    totalCost,
    totalSold,
    totalReceived,
    totalPending: Math.max(0, totalSold - totalReceived),
    currentCashResult: totalReceived - totalCost,
    projectedProfit: totalSold - totalCost,
  };
}

interface Props {
  onDataChange?: () => void;
  selectedCampaignId?: string | null;
}

export function EncomendasTab({ onDataChange, selectedCampaignId }: Props) {
  const { user, effectiveSocietyId: societyId } = useAuth();
  const [orders, setOrders] = useState<ShirtOrder[]>([]);
  const [campaigns, setCampaigns] = useState<ShirtCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Filtros
  const [search, setSearch] = useState('');
  const [filterPayment, setFilterPayment] = useState('all');
  const [filterDelivery, setFilterDelivery] = useState('all');
  const [filterSize, setFilterSize] = useState('all');
  const [filterColor, setFilterColor] = useState('all');
  const [filterCampaign, setFilterCampaign] = useState('all');

  // Dialog de encomenda
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [orderForm, setOrderForm] = useState({
    date: new Date().toISOString().slice(0, 16),
    buyer_name: '',
    unit_price: '',
    payment_type: 'a_vista',
    is_gift: false,
    notes: '',
    campaign_id: '',
  });
  const [items, setItems] = useState<OrderItem[]>([emptyItem()]);

  // Dialog de pagamento
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [payOrder, setPayOrder] = useState<ShirtOrder | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payMethod, setPayMethod] = useState('pix');
  const [payNotes, setPayNotes] = useState('');

  // Exclusão
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('shirt_orders').select('*').order('buyer_name');
    let cQuery = supabase.from('shirt_campaigns').select('*').order('purchase_date', { ascending: false });
    if (societyId) { q = q.eq('society_id', societyId); cQuery = cQuery.eq('society_id', societyId); }
    const [{ data }, { data: camps }] = await Promise.all([q, cQuery]);
    const mapped = (data || []).map((o) => ({
      ...o,
      items: Array.isArray(o.items) ? (o.items as unknown as OrderItem[]) : [],
    })) as ShirtOrder[];
    setOrders(mapped);
    setCampaigns((camps || []) as ShirtCampaign[]);
    setLoading(false);
  }, [societyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (selectedCampaignId) setFilterCampaign(selectedCampaignId);
  }, [selectedCampaignId]);

  const defaultCampaignId = () => (filterCampaign !== 'all' && filterCampaign !== 'none' ? filterCampaign : (selectedCampaignId || ''));

  const resetForm = () => {
    setEditingId(null);
    setOrderForm({
      date: new Date().toISOString().slice(0, 16),
      buyer_name: '',
      unit_price: '',
      payment_type: 'a_vista',
      is_gift: false,
      notes: '',
      campaign_id: defaultCampaignId(),
    });
    setItems([emptyItem()]);
  };

  const applyCampaignDefaults = (campaignId: string) => {
    const camp = campaigns.find(c => c.id === campaignId);
    setOrderForm(f => ({
      ...f,
      campaign_id: campaignId,
      unit_price: camp && !f.is_gift ? String(camp.default_sale_price) : f.unit_price,
    }));
  };

  const openNew = () => {
    resetForm();
    const cid = defaultCampaignId();
    if (cid) {
      const camp = campaigns.find(c => c.id === cid);
      setOrderForm(f => ({ ...f, campaign_id: cid, unit_price: camp ? String(camp.default_sale_price) : '' }));
    }
    setOrderDialogOpen(true);
  };

  const openEdit = (o: ShirtOrder) => {
    setEditingId(o.id);
    setOrderForm({
      date: new Date(o.date).toISOString().slice(0, 16),
      buyer_name: o.buyer_name,
      unit_price: String(o.unit_price),
      payment_type: o.payment_type,
      is_gift: !!o.is_gift,
      notes: o.notes || '',
      campaign_id: o.campaign_id || '',
    });
    setItems(o.items && o.items.length ? o.items.map(i => ({ ...i })) : [emptyItem()]);
    setOrderDialogOpen(true);
  };

  const handleSaveOrder = async () => {
    if (!user) return;
    const validItems = items.filter(i => i.qty > 0);
    const quantity = validItems.reduce((s, i) => s + (Number(i.qty) || 0), 0);
    const unitPrice = parseFloat(orderForm.unit_price) || 0;
    if (!orderForm.buyer_name.trim()) { toast.error('Informe o nome da pessoa'); return; }
    if (!orderForm.campaign_id) { toast.error('Selecione uma campanha'); return; }
    if (validItems.length === 0 || quantity <= 0) {
      toast.error('Adicione pelo menos um item (cor, tamanho e quantidade)');
      return;
    }
    const selectedCampaign = campaigns.find(c => c.id === orderForm.campaign_id);
    if (!selectedCampaign) { toast.error('Selecione uma campanha'); return; }

    // Saldo disponível: comprado - já encomendado (exceto a própria encomenda em edição)
    const orderedForCampaign = orders
      .filter(o => o.campaign_id === selectedCampaign.id && o.id !== editingId)
      .reduce((s, o) => s + Number(o.quantity || 0), 0);
    const available = selectedCampaign.purchased_quantity - orderedForCampaign;
    if (quantity > available) {
      toast.error(`Saldo insuficiente na campanha. Disponível: ${available}`);
      return;
    }

    const totalPrice = orderForm.is_gift ? 0 : quantity * unitPrice;
    setSubmitting(true);
    try {
      const payload = {
        date: orderForm.date,
        buyer_name: orderForm.buyer_name.trim(),
        size: itemsSummary(validItems),
        quantity,
        unit_price: orderForm.is_gift ? 0 : unitPrice,
        unit_cost: Number(selectedCampaign.unit_cost),
        total_price: totalPrice,
        payment_type: orderForm.is_gift ? 'brinde' : orderForm.payment_type,
        is_gift: orderForm.is_gift,
        items: validItems as unknown as OrderItem[],
        notes: orderForm.notes || null,
        campaign_id: selectedCampaign.id,
        society_id: societyId || null,
        created_by: user.id,
      };
      if (editingId) {
        const { error } = await supabase.from('shirt_orders').update(payload).eq('id', editingId);
        if (error) throw error;
        toast.success('Encomenda atualizada!');
      } else {
        const { error } = await supabase.from('shirt_orders').insert(payload);
        if (error) throw error;
        toast.success('Encomenda registrada!');
      }
      setOrderDialogOpen(false);
      resetForm();
      fetchData();
      onDataChange?.();
    } catch (e) {
      toast.error('Erro ao salvar: ' + (e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const openPay = (o: ShirtOrder) => {
    setPayOrder(o);
    const remaining = Math.max(0, o.total_price - o.amount_paid);
    const suggestion = o.payment_type === 'parcelado' && o.amount_paid <= 0
      ? o.total_price / 2
      : remaining;
    setPayAmount(suggestion > 0 ? suggestion.toFixed(2) : '');
    setPayDate(new Date().toISOString().slice(0, 10));
    setPayMethod('pix');
    setPayNotes('');
    setPayDialogOpen(true);
  };

  const handleRegisterPayment = async () => {
    if (!user || !payOrder) return;
    const amount = parseFloat(payAmount) || 0;
    const remaining = Math.max(0, Number(payOrder.total_price) - Number(payOrder.amount_paid));
    if (amount <= 0) { toast.error('Informe um valor válido'); return; }
    if (amount > remaining + 0.009) { toast.error(`O valor máximo permitido é ${brl(remaining)}`); return; }
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc('register_shirt_order_payment', {
        p_order_id: payOrder.id,
        p_amount: amount,
        p_payment_date: payDate,
        p_payment_method: payMethod,
        p_notes: payNotes || null,
      });
      if (error) throw error;
      toast.success('Pagamento registrado!');
      setPayDialogOpen(false);
      setPayOrder(null);
      setPayAmount('');
      fetchData();
      onDataChange?.();
    } catch (e) {
      toast.error('Erro ao registrar pagamento: ' + (e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleDelivery = async (o: ShirtOrder) => {
    const delivered = o.delivery_status !== 'entregue';
    const { error } = await supabase
      .from('shirt_orders')
      .update({
        delivery_status: delivered ? 'entregue' : 'pendente',
        delivered_at: delivered ? new Date().toISOString() : null,
      })
      .eq('id', o.id);
    if (error) { toast.error('Erro ao atualizar entrega'); return; }
    toast.success(delivered ? 'Marcado como entregue' : 'Entrega desfeita');
    fetchData();
    onDataChange?.();
  };

  const requestDelete = (o: ShirtOrder) => {
    if (Number(o.amount_paid) > 0) {
      toast.error('Esta encomenda possui pagamentos registrados. Estorne os pagamentos antes de excluir.');
      return;
    }
    setDeleteId(o.id);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('shirt_orders').delete().eq('id', deleteId);
      if (error) throw error;
      toast.success('Encomenda excluída!');
      setDeleteId(null);
      fetchData();
      onDataChange?.();
    } catch (e) {
      toast.error('Erro ao excluir: ' + (e as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  const filtered = useMemo(() => {
    return orders.filter(o => {
      if (search && !o.buyer_name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterCampaign === 'none') { if (o.campaign_id) return false; }
      else if (filterCampaign !== 'all') { if (o.campaign_id !== filterCampaign) return false; }
      const oItems = o.items || [];
      if (filterSize !== 'all' && !oItems.some(i => i.size === filterSize)) return false;
      if (filterColor !== 'all' && !oItems.some(i => i.color === filterColor)) return false;
      if (filterDelivery !== 'all' && o.delivery_status !== filterDelivery) return false;
      if (filterPayment !== 'all') {
        const status = getPaymentStatus(o);
        if (filterPayment === 'brinde' && status !== 'gift') return false;
        if (filterPayment === 'pago' && status !== 'paid') return false;
        if (filterPayment === 'parcial' && status !== 'partial') return false;
        if (filterPayment === 'pendente' && status !== 'pending') return false;
      }
      return true;
    });
  }, [orders, search, filterSize, filterColor, filterDelivery, filterPayment, filterCampaign]);

  // Campanha ativa para o resumo financeiro
  const activeCampaign = useMemo(
    () => (filterCampaign !== 'all' && filterCampaign !== 'none' ? campaigns.find(c => c.id === filterCampaign) : undefined),
    [filterCampaign, campaigns],
  );
  const summary = useMemo(() => {
    if (!activeCampaign) return null;
    const campOrders = orders.filter(o => o.campaign_id === activeCampaign.id);
    return calculateCampaignSummary(activeCampaign, campOrders);
  }, [activeCampaign, orders]);

  // Resumo de produção (das encomendas filtradas)
  const production = useMemo(() => {
    const byColor: Record<string, Record<string, number>> = { off: {}, preta: {} };
    let total = 0;
    filtered.forEach(o => (o.items || []).forEach(i => {
      const c = byColor[i.color] || (byColor[i.color] = {});
      c[i.size] = (c[i.size] || 0) + (Number(i.qty) || 0);
      total += Number(i.qty) || 0;
    }));
    const colorTotal = (c: string) => Object.values(byColor[c] || {}).reduce((s, n) => s + n, 0);
    return { byColor, total, offTotal: colorTotal('off'), pretaTotal: colorTotal('preta') };
  }, [filtered]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Resumo financeiro da campanha */}
      {summary ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Card><CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Comprado</p>
            <p className="text-lg font-bold">{summary.purchasedQuantity}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Encomendado</p>
            <p className="text-lg font-bold">{summary.orderedQuantity}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Disponível</p>
            <p className="text-lg font-bold">{summary.availableQuantity}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Brindes</p>
            <p className="text-lg font-bold text-blue-500">{summary.giftQuantity}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Custo total</p>
            <p className="text-lg font-bold">{brl(summary.totalCost)}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Total vendido</p>
            <p className="text-lg font-bold text-primary">{brl(summary.totalSold)}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Total recebido</p>
            <p className="text-lg font-bold text-success">{brl(summary.totalReceived)}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">A receber</p>
            <p className="text-lg font-bold text-destructive">{brl(summary.totalPending)}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Resultado atual</p>
            <p className={`text-lg font-bold ${summary.currentCashResult >= 0 ? 'text-success' : 'text-destructive'}`}>{brl(summary.currentCashResult)}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Lucro previsto</p>
            <p className={`text-lg font-bold ${summary.projectedProfit >= 0 ? 'text-success' : 'text-destructive'}`}>{brl(summary.projectedProfit)}</p>
          </CardContent></Card>
        </div>
      ) : (
        <Card><CardContent className="py-4 text-sm text-muted-foreground text-center">
          Selecione uma campanha no filtro abaixo para ver o resumo financeiro completo.
        </CardContent></Card>
      )}

      {/* Resumo de produção */}
      <Card>
        <CardContent className="pt-4 pb-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold flex items-center gap-2"><Shirt className="h-4 w-4" /> Resumo para produção</p>
            <Badge variant="outline">Total: {production.total} camisas</Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {COLORS.map(c => (
              <div key={c.value} className="rounded-lg border p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{c.label}</span>
                  <Badge variant="secondary">{c.value === 'off' ? production.offTotal : production.pretaTotal}</Badge>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {SIZES.filter(s => production.byColor[c.value]?.[s]).length === 0 ? (
                    <span className="text-xs text-muted-foreground">—</span>
                  ) : SIZES.filter(s => production.byColor[c.value]?.[s]).map(s => (
                    <Badge key={s} variant="outline" className="text-xs">
                      {SIZE_LABEL[s]}: {production.byColor[c.value][s]}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filtros + ação */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={filterCampaign} onValueChange={setFilterCampaign}>
            <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as campanhas</SelectItem>
              <SelectItem value="none">Sem campanha</SelectItem>
              {campaigns.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterPayment} onValueChange={setFilterPayment}>
            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Pagamento</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="parcial">Parcial</SelectItem>
              <SelectItem value="pago">Pago</SelectItem>
              <SelectItem value="brinde">Brinde</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterColor} onValueChange={setFilterColor}>
            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Cor</SelectItem>
              {COLORS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterDelivery} onValueChange={setFilterDelivery}>
            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Entrega</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="entregue">Entregue</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterSize} onValueChange={setFilterSize}>
            <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tamanho</SelectItem>
              {SIZES.map(s => <SelectItem key={s} value={s}>{SIZE_LABEL[s]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={openNew}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Encomenda
          </Button>
        </div>
      </div>

      {/* Tabela */}
      <Card>
        <CardContent className="pt-6">
          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhuma encomenda encontrada</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Itens</TableHead>
                    <TableHead>Qtd</TableHead>
                    <TableHead>Custo</TableHead>
                    <TableHead>Venda</TableHead>
                    <TableHead>Pago</TableHead>
                    <TableHead>Pendente</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead>Entrega</TableHead>
                    <TableHead className="w-40 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(o => {
                    const status = getPaymentStatus(o);
                    const fullyPaid = status === 'paid' || status === 'gift';
                    const rowCost = Number(o.quantity || 0) * Number(o.unit_cost || 0);
                    const rowPending = Math.max(0, Number(o.total_price || 0) - Number(o.amount_paid || 0));
                    return (
                      <TableRow key={o.id} className={getPaymentRowClass(o)}>
                        <TableCell className="font-medium">{o.buyer_name}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(o.items && o.items.length ? o.items : []).map((i, idx) => (
                              <Badge
                                key={idx}
                                variant="outline"
                                className={i.color === 'preta' ? 'border-foreground/40' : ''}
                              >
                                {COLOR_LABEL[i.color]?.split(' ')[0] || i.color} {i.qty}×{SIZE_LABEL[i.size]}
                              </Badge>
                            ))}
                            {(!o.items || o.items.length === 0) && <span className="text-xs text-muted-foreground">{o.size}</span>}
                          </div>
                        </TableCell>
                        <TableCell>{o.quantity}</TableCell>
                        <TableCell className="text-xs">{brl(rowCost)}</TableCell>
                        <TableCell>{o.is_gift ? <span className="text-xs text-muted-foreground">Brinde</span> : brl(o.total_price)}</TableCell>
                        <TableCell className="text-xs">{o.is_gift ? '—' : brl(o.amount_paid)}</TableCell>
                        <TableCell className="text-xs">{o.is_gift ? '—' : brl(rowPending)}</TableCell>
                        <TableCell>{paymentBadge(o)}</TableCell>
                        <TableCell>
                          {o.delivery_status === 'entregue'
                            ? <Badge className="bg-success text-success-foreground hover:bg-success/90">Entregue</Badge>
                            : <Badge variant="secondary">Pendente</Badge>}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost" size="icon" className="h-8 w-8"
                              title="Registrar pagamento" disabled={fullyPaid}
                              onClick={() => openPay(o)}
                            >
                              <CircleDollarSign className="h-4 w-4 text-success" />
                            </Button>
                            <Button
                              variant="ghost" size="icon" className="h-8 w-8"
                              title={o.delivery_status === 'entregue' ? 'Desfazer entrega' : 'Marcar entregue'}
                              onClick={() => toggleDelivery(o)}
                            >
                              {o.delivery_status === 'entregue'
                                ? <PackageCheck className="h-4 w-4 text-success" />
                                : <Truck className="h-4 w-4 text-primary" />}
                            </Button>
                            <Button
                              variant="ghost" size="icon" className="h-8 w-8"
                              title="Editar" onClick={() => openEdit(o)}
                            >
                              <span className="text-xs">✎</span>
                            </Button>
                            <Button
                              variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                              title="Excluir" onClick={() => requestDelete(o)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog encomenda */}
      <Dialog open={orderDialogOpen} onOpenChange={(v) => { setOrderDialogOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Encomenda' : 'Nova Encomenda'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Campanha</Label>
              <Select value={orderForm.campaign_id} onValueChange={applyCampaignDefaults}>
                <SelectTrigger><SelectValue placeholder="Selecione uma campanha" /></SelectTrigger>
                <SelectContent>
                  {campaigns.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                placeholder="Nome da pessoa"
                value={orderForm.buyer_name}
                onChange={(e) => setOrderForm({ ...orderForm, buyer_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Camisas</Label>
                <Button type="button" variant="outline" size="sm" className="h-7"
                  onClick={() => setItems([...items, emptyItem()])}>
                  <Plus className="h-3 w-3 mr-1" /> Item
                </Button>
              </div>
              {items.map((it, idx) => (
                <div key={idx} className="flex items-end gap-2">
                  <div className="flex-1 space-y-1">
                    {idx === 0 && <span className="text-[11px] text-muted-foreground">Cor</span>}
                    <Select value={it.color} onValueChange={(v) => setItems(items.map((x, i) => i === idx ? { ...x, color: v } : x))}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {COLORS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-24 space-y-1">
                    {idx === 0 && <span className="text-[11px] text-muted-foreground">Tam.</span>}
                    <Select value={it.size} onValueChange={(v) => setItems(items.map((x, i) => i === idx ? { ...x, size: v } : x))}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SIZES.map(s => <SelectItem key={s} value={s}>{SIZE_LABEL[s]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-16 space-y-1">
                    {idx === 0 && <span className="text-[11px] text-muted-foreground">Qtd</span>}
                    <Input type="number" min="1" className="h-9" value={it.qty}
                      onChange={(e) => setItems(items.map((x, i) => i === idx ? { ...x, qty: parseInt(e.target.value) || 0 } : x))} />
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-destructive shrink-0"
                    disabled={items.length === 1}
                    onClick={() => setItems(items.filter((_, i) => i !== idx))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" className="h-4 w-4 accent-primary"
                checked={orderForm.is_gift}
                onChange={(e) => setOrderForm({ ...orderForm, is_gift: e.target.checked })} />
              <Gift className="h-4 w-4" /> Brinde (gratuito)
            </label>
            {!orderForm.is_gift && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor Unitário (R$)</Label>
                  <Input
                    type="number" step="0.01" placeholder="65,00"
                    value={orderForm.unit_price}
                    onChange={(e) => setOrderForm({ ...orderForm, unit_price: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Forma de Pagamento</Label>
                  <Select value={orderForm.payment_type} onValueChange={(v) => setOrderForm({ ...orderForm, payment_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="a_vista">À vista</SelectItem>
                      <SelectItem value="parcelado">Parcelado (50/50)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                placeholder="Observações..."
                value={orderForm.notes}
                onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
              />
            </div>
            <Button className="w-full" onClick={handleSaveOrder} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingId ? 'Salvar Alterações' : 'Registrar Encomenda'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog pagamento */}
      <Dialog open={payDialogOpen} onOpenChange={(v) => { setPayDialogOpen(v); if (!v) { setPayOrder(null); setPayAmount(''); } }}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
          </DialogHeader>
          {payOrder && (
            <div className="space-y-4">
              <div className="rounded-md bg-muted/40 p-3 text-sm space-y-0.5">
                <p><strong className="text-foreground">{payOrder.buyer_name}</strong> · {payOrder.size}</p>
                <p>Total: <strong>{brl(payOrder.total_price)}</strong></p>
                <p>Já pago: <strong className="text-success">{brl(payOrder.amount_paid)}</strong></p>
                <p>Restante: <strong className="text-destructive">{brl(Math.max(0, payOrder.total_price - payOrder.amount_paid))}</strong></p>
              </div>
              <div className="space-y-2">
                <Label>Valor do Pagamento (R$)</Label>
                <Input type="number" step="0.01" placeholder="0,00" value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Forma</Label>
                  <Select value={payMethod} onValueChange={setPayMethod}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="transferencia">Transferência</SelectItem>
                      <SelectItem value="cartao">Cartão</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Observação</Label>
                <Textarea placeholder="Opcional" value={payNotes} onChange={(e) => setPayNotes(e.target.value)} />
              </div>
              <Button className="w-full" onClick={handleRegisterPayment} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Confirmar Pagamento
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Exclusão */}
      <AlertDialog open={!!deleteId} onOpenChange={(v) => { if (!v) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Esta encomenda não possui pagamentos e será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
