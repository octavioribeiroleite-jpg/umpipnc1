import { useCallback, useEffect, useMemo, useState } from 'react';
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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  Check, CheckCircle2, CircleDollarSign, Gift, Layers3, Loader2,
  Pencil, Plus, Search, Trash2, Truck,
} from 'lucide-react';
import type { ShirtCampaign } from './CampanhasCamisasTab';

const SIZES = [
  'PP', 'P', 'M', 'G', 'GG', 'XG',
  'Inf1', 'Inf2', 'Inf3', 'Inf4', 'Inf5', 'Inf6', 'Inf7',
  'Inf8', 'Inf9', 'Inf10', 'Inf11', 'Inf12', 'Inf13', 'Inf14',
];

const SIZE_LABEL: Record<string, string> = {
  PP: 'PP', P: 'P', M: 'M', G: 'G', GG: 'GG', XG: 'XG',
  Inf1: '1 ano', Inf2: '2 anos', Inf3: '3 anos', Inf4: '4 anos',
  Inf5: '5 anos', Inf6: '6 anos', Inf7: '7 anos', Inf8: '8 anos',
  Inf9: '9 anos', Inf10: '10 anos', Inf11: '11 anos', Inf12: '12 anos',
  Inf13: '13 anos', Inf14: '14 anos',
};

const COLORS = [
  { value: 'off', label: 'Off White' },
  { value: 'preta', label: 'Preta' },
];
const COLOR_LABEL: Record<string, string> = { off: 'Off White', preta: 'Preta' };

type OrderView = 'open' | 'finished' | 'all';
type PaymentMode = 'total' | 'partial';

export interface OrderItem { color: string; size: string; qty: number }
export interface ShirtCampaignLot {
  id: string;
  campaign_id: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  supplier: string | null;
  purchase_date: string;
  created_at: string;
}
export interface ShirtOrder {
  id: string; buyer_name: string; size: string; quantity: number;
  unit_price: number; unit_cost: number; total_price: number;
  payment_type: string; amount_paid: number; delivery_status: string;
  delivered_at: string | null; notes: string | null; date: string;
  is_gift?: boolean; items?: OrderItem[]; campaign_id?: string | null;
  lot_id?: string | null;
}
export interface CampaignFinancialSummary {
  purchasedQuantity: number; orderedQuantity: number; availableQuantity: number;
  giftQuantity: number; totalCost: number; totalSold: number;
  totalReceived: number; totalPending: number; currentCashResult: number;
  projectedProfit: number;
}
interface Props { onDataChange?: () => void; selectedCampaignId?: string | null }

const emptyItem = (): OrderItem => ({ color: 'off', size: 'M', qty: 1 });
const itemsSummary = (items: OrderItem[]) => items
  .map((item) => `${COLOR_LABEL[item.color] || item.color}: ${item.qty} ${SIZE_LABEL[item.size] || item.size}`)
  .join(' | ');

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
  if (status === 'gift') return 'bg-blue-500/10';
  if (status === 'paid') return 'bg-green-500/10';
  if (status === 'partial') return 'bg-yellow-400/15';
  return 'bg-muted/20';
}

export function calculateCampaignSummary(campaign: ShirtCampaign, orders: ShirtOrder[]): CampaignFinancialSummary {
  const orderedQuantity = orders.reduce((sum, order) => sum + Number(order.quantity || 0), 0);
  const giftQuantity = orders.filter((order) => order.is_gift).reduce((sum, order) => sum + Number(order.quantity || 0), 0);
  const totalSold = orders.reduce((sum, order) => sum + Number(order.total_price || 0), 0);
  const totalReceived = orders.reduce((sum, order) => sum + Number(order.amount_paid || 0), 0);
  const totalCost = Number(campaign.total_purchase_cost || 0);
  return {
    purchasedQuantity: Number(campaign.purchased_quantity || 0), orderedQuantity,
    availableQuantity: Math.max(0, Number(campaign.purchased_quantity || 0) - orderedQuantity),
    giftQuantity, totalCost, totalSold, totalReceived,
    totalPending: Math.max(0, totalSold - totalReceived),
    currentCashResult: totalReceived - totalCost, projectedProfit: totalSold - totalCost,
  };
}

const isFinished = (order: ShirtOrder) =>
  (order.is_gift || Number(order.amount_paid) >= Number(order.total_price)) && order.delivery_status === 'entregue';

function PaymentBadge({ order }: { order: ShirtOrder }) {
  const status = getPaymentStatus(order);
  if (status === 'gift') return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100"><Gift className="mr-1 h-3 w-3" />Brinde</Badge>;
  if (status === 'pending') return <Badge variant="destructive">Pendente</Badge>;
  if (status === 'partial') return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Parcial</Badge>;
  return <Badge className="bg-success text-success-foreground hover:bg-success/90">Pago</Badge>;
}

export function EncomendasTab({ onDataChange, selectedCampaignId }: Props) {
  const { user, effectiveSocietyId: societyId } = useAuth();
  const [orders, setOrders] = useState<ShirtOrder[]>([]);
  const [campaigns, setCampaigns] = useState<ShirtCampaign[]>([]);
  const [lots, setLots] = useState<ShirtCampaignLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [view, setView] = useState<OrderView>('open');

  const [search, setSearch] = useState('');
  const [filterPayment, setFilterPayment] = useState('all');
  const [filterDelivery, setFilterDelivery] = useState('all');
  const [filterSize, setFilterSize] = useState('all');
  const [filterColor, setFilterColor] = useState('all');
  const [filterCampaign, setFilterCampaign] = useState('all');
  const [filterLot, setFilterLot] = useState('all');

  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [orderForm, setOrderForm] = useState({
    date: new Date().toISOString().slice(0, 16), buyer_name: '', unit_price: '',
    payment_type: 'a_vista', is_gift: false, notes: '', campaign_id: '', lot_id: '',
  });
  const [items, setItems] = useState<OrderItem[]>([emptyItem()]);

  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [payOrder, setPayOrder] = useState<ShirtOrder | null>(null);
  const [payMode, setPayMode] = useState<PaymentMode>('total');
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payMethod, setPayMethod] = useState('pix');
  const [payNotes, setPayNotes] = useState('');

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const orderedLots = useMemo(() => [...lots].sort((a, b) => {
    const dateCompare = String(a.purchase_date).localeCompare(String(b.purchase_date));
    return dateCompare !== 0 ? dateCompare : String(a.created_at).localeCompare(String(b.created_at));
  }), [lots]);

  const lotNumberMap = useMemo(() => {
    const map = new Map<string, number>();
    const grouped = new Map<string, ShirtCampaignLot[]>();
    orderedLots.forEach((lot) => grouped.set(lot.campaign_id, [...(grouped.get(lot.campaign_id) || []), lot]));
    grouped.forEach((campaignLots) => campaignLots.forEach((lot, index) => map.set(lot.id, index + 1)));
    return map;
  }, [orderedLots]);

  const lotLabel = (lotId?: string | null) => {
    if (!lotId) return 'Sem lote';
    const number = lotNumberMap.get(lotId);
    return number ? `${number}º lote` : 'Lote';
  };

  const campaignLots = (campaignId: string) => orderedLots.filter((lot) => lot.campaign_id === campaignId);
  const latestLotId = (campaignId: string) => campaignLots(campaignId).at(-1)?.id || '';

  const fetchData = useCallback(async () => {
    setLoading(true);
    let ordersQuery = (supabase as any).from('shirt_orders').select('*').order('buyer_name');
    let campaignsQuery = supabase.from('shirt_campaigns').select('*').order('purchase_date', { ascending: false });
    let lotsQuery = (supabase as any).from('shirt_campaign_lots').select('*').order('purchase_date', { ascending: true });

    if (societyId) {
      ordersQuery = ordersQuery.eq('society_id', societyId);
      campaignsQuery = campaignsQuery.eq('society_id', societyId);
      lotsQuery = lotsQuery.eq('society_id', societyId);
    }

    const [{ data: orderData, error }, { data: campaignData }, { data: lotData }] = await Promise.all([
      ordersQuery, campaignsQuery, lotsQuery,
    ]);

    if (error) toast.error('Erro ao carregar encomendas');
    setOrders(((orderData || []) as any[]).map((order) => ({
      ...order, items: Array.isArray(order.items) ? order.items as OrderItem[] : [],
    })) as ShirtOrder[]);
    setCampaigns((campaignData || []) as ShirtCampaign[]);
    setLots((lotData || []) as ShirtCampaignLot[]);
    setLoading(false);
  }, [societyId]);

  useEffect(() => { void fetchData(); }, [fetchData]);
  useEffect(() => {
    if (selectedCampaignId) {
      setFilterCampaign(selectedCampaignId);
      setFilterLot('all');
    }
  }, [selectedCampaignId]);

  const defaultCampaignId = () => filterCampaign !== 'all' && filterCampaign !== 'none'
    ? filterCampaign : selectedCampaignId || '';

  const resetForm = () => {
    const campaignId = defaultCampaignId();
    setEditingId(null);
    setOrderForm({
      date: new Date().toISOString().slice(0, 16), buyer_name: '', unit_price: '',
      payment_type: 'a_vista', is_gift: false, notes: '', campaign_id: campaignId,
      lot_id: campaignId ? latestLotId(campaignId) : '',
    });
    setItems([emptyItem()]);
  };

  const openNew = () => {
    const campaignId = defaultCampaignId();
    const campaign = campaigns.find((item) => item.id === campaignId);
    setEditingId(null);
    setOrderForm({
      date: new Date().toISOString().slice(0, 16), buyer_name: '',
      unit_price: campaign ? String(campaign.default_sale_price) : '',
      payment_type: 'a_vista', is_gift: false, notes: '', campaign_id: campaignId,
      lot_id: campaignId ? latestLotId(campaignId) : '',
    });
    setItems([emptyItem()]);
    setOrderDialogOpen(true);
  };

  const openEdit = (order: ShirtOrder) => {
    setEditingId(order.id);
    setOrderForm({
      date: new Date(order.date).toISOString().slice(0, 16), buyer_name: order.buyer_name,
      unit_price: String(order.unit_price), payment_type: order.payment_type,
      is_gift: Boolean(order.is_gift), notes: order.notes || '', campaign_id: order.campaign_id || '',
      lot_id: order.lot_id || '',
    });
    setItems(order.items?.length ? order.items.map((item) => ({ ...item })) : [emptyItem()]);
    setOrderDialogOpen(true);
  };

  const applyCampaignDefaults = (campaignId: string) => {
    const campaign = campaigns.find((item) => item.id === campaignId);
    setOrderForm((current) => ({
      ...current,
      campaign_id: campaignId,
      lot_id: latestLotId(campaignId),
      unit_price: campaign && !current.is_gift ? String(campaign.default_sale_price) : current.unit_price,
    }));
  };

  const handleSaveOrder = async () => {
    if (!user) return;
    const validItems = items.filter((item) => Number(item.qty) > 0);
    const quantity = validItems.reduce((sum, item) => sum + Number(item.qty || 0), 0);
    const unitPrice = Number(orderForm.unit_price || 0);
    const campaign = campaigns.find((item) => item.id === orderForm.campaign_id);
    const selectedLot = lots.find((lot) => lot.id === orderForm.lot_id);

    if (!orderForm.buyer_name.trim()) return void toast.error('Informe o nome da pessoa');
    if (!campaign) return void toast.error('Selecione uma campanha');
    if (!validItems.length || quantity <= 0) return void toast.error('Adicione pelo menos uma camisa');
    if (campaignLots(campaign.id).length > 0 && !selectedLot) return void toast.error('Selecione o lote da encomenda');

    if (selectedLot) {
      const alreadyOrderedInLot = orders
        .filter((order) => order.lot_id === selectedLot.id && order.id !== editingId)
        .reduce((sum, order) => sum + Number(order.quantity || 0), 0);
      const availableInLot = Number(selectedLot.quantity || 0) - alreadyOrderedInLot;
      if (quantity > availableInLot) return void toast.error(`Saldo insuficiente no ${lotLabel(selectedLot.id)}. Disponível: ${availableInLot}`);
    } else {
      const alreadyOrdered = orders.filter((order) => order.campaign_id === campaign.id && order.id !== editingId)
        .reduce((sum, order) => sum + Number(order.quantity || 0), 0);
      const available = Number(campaign.purchased_quantity || 0) - alreadyOrdered;
      if (quantity > available) return void toast.error(`Saldo insuficiente. Disponível: ${available}`);
    }

    const payload = {
      date: orderForm.date, buyer_name: orderForm.buyer_name.trim(), size: itemsSummary(validItems), quantity,
      unit_price: orderForm.is_gift ? 0 : unitPrice,
      unit_cost: Number(selectedLot?.unit_cost ?? campaign.unit_cost ?? 0),
      total_price: orderForm.is_gift ? 0 : quantity * unitPrice,
      payment_type: orderForm.is_gift ? 'brinde' : orderForm.payment_type,
      is_gift: orderForm.is_gift, items: validItems,
      notes: orderForm.notes || null, campaign_id: campaign.id,
      lot_id: selectedLot?.id || null,
      society_id: societyId || null, created_by: user.id,
    };

    setSubmitting(true);
    try {
      if (editingId) {
        const { data, error } = await (supabase as any).from('shirt_orders').update(payload).eq('id', editingId).select('*').single();
        if (error) throw error;
        setOrders((current) => current.map((order) => order.id === editingId ? { ...(data as unknown as ShirtOrder), items: validItems } : order));
        toast.success('Encomenda atualizada!');
      } else {
        const { data, error } = await (supabase as any).from('shirt_orders').insert(payload).select('*').single();
        if (error) throw error;
        setOrders((current) => [...current, { ...(data as unknown as ShirtOrder), items: validItems }].sort((a, b) => a.buyer_name.localeCompare(b.buyer_name)));
        toast.success(`Encomenda registrada no ${selectedLot ? lotLabel(selectedLot.id) : 'lote atual'}!`);
      }
      setOrderDialogOpen(false);
      resetForm();
      onDataChange?.();
    } catch (error) {
      toast.error('Erro ao salvar: ' + (error as Error).message);
    } finally { setSubmitting(false); }
  };

  const openPay = (order: ShirtOrder) => {
    const remaining = Math.max(0, Number(order.total_price) - Number(order.amount_paid));
    setPayOrder(order);
    setPayMode('total');
    setPayAmount(remaining.toFixed(2));
    setPayDate(new Date().toISOString().slice(0, 10));
    setPayMethod('pix');
    setPayNotes('');
    setPayDialogOpen(true);
  };

  const changePayMode = (mode: PaymentMode) => {
    setPayMode(mode);
    if (!payOrder) return;
    const remaining = Math.max(0, Number(payOrder.total_price) - Number(payOrder.amount_paid));
    setPayAmount(mode === 'total' ? remaining.toFixed(2) : '');
  };

  const handleRegisterPayment = async () => {
    if (!payOrder) return;
    const remaining = Math.max(0, Number(payOrder.total_price) - Number(payOrder.amount_paid));
    const amount = payMode === 'total' ? remaining : Number(payAmount || 0);
    if (amount <= 0) return void toast.error('Informe um valor válido');
    if (amount > remaining + 0.009) return void toast.error(`O valor máximo é ${brl(remaining)}`);

    setSubmitting(true);
    try {
      const { error } = await supabase.rpc('register_shirt_order_payment', {
        p_order_id: payOrder.id, p_amount: amount, p_payment_date: payDate,
        p_payment_method: payMethod, p_notes: payNotes || null,
      });
      if (error) throw error;
      const orderId = payOrder.id;
      setOrders((current) => current.map((order) => order.id === orderId
        ? { ...order, amount_paid: Math.min(Number(order.total_price), Number(order.amount_paid) + amount) }
        : order));
      setPayDialogOpen(false);
      setPayOrder(null);
      toast.success(payMode === 'total' ? 'Pagamento total registrado!' : 'Pagamento parcial registrado!');
    } catch (error) {
      toast.error('Erro ao registrar pagamento: ' + (error as Error).message);
    } finally { setSubmitting(false); }
  };

  const toggleDelivery = async (order: ShirtOrder) => {
    const delivered = order.delivery_status !== 'entregue';
    const delivery_status = delivered ? 'entregue' : 'pendente';
    const delivered_at = delivered ? new Date().toISOString() : null;
    setOrders((current) => current.map((item) => item.id === order.id ? { ...item, delivery_status, delivered_at } : item));
    const { error } = await supabase.from('shirt_orders').update({ delivery_status, delivered_at }).eq('id', order.id);
    if (error) {
      setOrders((current) => current.map((item) => item.id === order.id ? order : item));
      toast.error('Erro ao atualizar entrega');
      return;
    }
    toast.success(delivered ? 'Entrega concluída' : 'Entrega desfeita');
  };

  const requestDelete = (order: ShirtOrder) => {
    if (Number(order.amount_paid) > 0) return void toast.error('Esta encomenda possui pagamentos registrados.');
    setDeleteId(order.id);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('shirt_orders').delete().eq('id', deleteId);
      if (error) throw error;
      setOrders((current) => current.filter((order) => order.id !== deleteId));
      setDeleteId(null);
      toast.success('Encomenda excluída!');
      onDataChange?.();
    } catch (error) { toast.error('Erro ao excluir: ' + (error as Error).message); }
    finally { setDeleting(false); }
  };

  const visibleLots = useMemo(() => {
    if (filterCampaign !== 'all' && filterCampaign !== 'none') return campaignLots(filterCampaign);
    return orderedLots;
  }, [filterCampaign, orderedLots]);

  const filtered = useMemo(() => orders.filter((order) => {
    if (view === 'open' && isFinished(order)) return false;
    if (view === 'finished' && !isFinished(order)) return false;
    if (search && !order.buyer_name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCampaign === 'none' && order.campaign_id) return false;
    if (filterCampaign !== 'all' && filterCampaign !== 'none' && order.campaign_id !== filterCampaign) return false;
    if (filterLot !== 'all' && order.lot_id !== filterLot) return false;
    if (filterDelivery !== 'all' && order.delivery_status !== filterDelivery) return false;
    const orderItems = order.items || [];
    if (filterSize !== 'all' && !orderItems.some((item) => item.size === filterSize)) return false;
    if (filterColor !== 'all' && !orderItems.some((item) => item.color === filterColor)) return false;
    if (filterPayment !== 'all') {
      const status = getPaymentStatus(order);
      if (filterPayment === 'brinde' && status !== 'gift') return false;
      if (filterPayment === 'pago' && status !== 'paid') return false;
      if (filterPayment === 'parcial' && status !== 'partial') return false;
      if (filterPayment === 'pendente' && status !== 'pending') return false;
    }
    return true;
  }), [orders, view, search, filterCampaign, filterLot, filterDelivery, filterSize, filterColor, filterPayment]);

  const openCount = orders.filter((order) => !isFinished(order)).length;
  const finishedCount = orders.filter(isFinished).length;

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-1 shadow-sm">
        <div className="grid grid-cols-3 gap-1">
          {([['open', `Em andamento ${openCount}`], ['finished', `Finalizados ${finishedCount}`], ['all', `Todos ${orders.length}`]] as Array<[OrderView, string]>).map(([value, label]) => (
            <Button key={value} variant="ghost" size="sm" className={view === value ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground' : ''} onClick={() => setView(value)}>{label}</Button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
        <div className="relative flex-1"><Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-8" placeholder="Buscar por nome..." value={search} onChange={(event) => setSearch(event.target.value)} /></div>
        <div className="flex flex-wrap gap-2">
          <Select value={filterCampaign} onValueChange={(value) => { setFilterCampaign(value); setFilterLot('all'); }}><SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas as campanhas</SelectItem><SelectItem value="none">Sem campanha</SelectItem>{campaigns.map((campaign) => <SelectItem key={campaign.id} value={campaign.id}>{campaign.name}</SelectItem>)}</SelectContent></Select>
          {visibleLots.length > 0 && <Select value={filterLot} onValueChange={setFilterLot}><SelectTrigger className="w-[125px]"><SelectValue placeholder="Lote" /></SelectTrigger><SelectContent><SelectItem value="all">Todos os lotes</SelectItem>{visibleLots.map((lot) => <SelectItem key={lot.id} value={lot.id}>{lotLabel(lot.id)}</SelectItem>)}</SelectContent></Select>}
          <Select value={filterPayment} onValueChange={setFilterPayment}><SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Pagamento</SelectItem><SelectItem value="pendente">Pendente</SelectItem><SelectItem value="parcial">Parcial</SelectItem><SelectItem value="pago">Pago</SelectItem><SelectItem value="brinde">Brinde</SelectItem></SelectContent></Select>
          <Select value={filterDelivery} onValueChange={setFilterDelivery}><SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Entrega</SelectItem><SelectItem value="pendente">Pendente</SelectItem><SelectItem value="entregue">Entregue</SelectItem></SelectContent></Select>
          <Select value={filterColor} onValueChange={setFilterColor}><SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Cor</SelectItem>{COLORS.map((color) => <SelectItem key={color.value} value={color.value}>{color.label}</SelectItem>)}</SelectContent></Select>
          <Select value={filterSize} onValueChange={setFilterSize}><SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Tamanho</SelectItem>{SIZES.map((size) => <SelectItem key={size} value={size}>{SIZE_LABEL[size]}</SelectItem>)}</SelectContent></Select>
          <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />Nova Encomenda</Button>
        </div>
      </div>

      {filtered.length === 0 ? <Card><CardContent className="py-10 text-center text-muted-foreground">Nenhuma encomenda encontrada</CardContent></Card> : (
        <div className="grid gap-2">
          {filtered.map((order) => {
            const paymentStatus = getPaymentStatus(order);
            const paymentDone = paymentStatus === 'paid' || paymentStatus === 'gift';
            const delivered = order.delivery_status === 'entregue';
            const finished = isFinished(order);
            const remaining = Math.max(0, Number(order.total_price) - Number(order.amount_paid));
            const orderItems = order.items?.length ? order.items : [];
            return (
              <Card key={order.id} className={finished ? 'border-success/25 bg-success/[0.025]' : ''}>
                <CardContent className="p-3">
                  <div className="grid gap-3 lg:grid-cols-[minmax(220px,1.35fr)_minmax(180px,.8fr)_minmax(150px,.65fr)_auto] lg:items-center">
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <p className="min-w-0 whitespace-normal break-words font-bold">{order.buyer_name}</p>
                        {order.lot_id && <Badge variant="outline" className="gap-1"><Layers3 className="h-3 w-3" />{lotLabel(order.lot_id)}</Badge>}
                        {finished && <Badge className="bg-success text-success-foreground"><CheckCircle2 className="mr-1 h-3 w-3" />Finalizado</Badge>}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {orderItems.map((item, index) => (
                          <div key={`${order.id}-${index}`} className="flex items-center gap-1.5 rounded-lg border bg-background px-2 py-1.5">
                            <span className={`h-2.5 w-2.5 rounded-full border ${item.color === 'preta' ? 'bg-slate-900' : 'bg-white'}`} />
                            <span className="text-xs font-semibold">{COLOR_LABEL[item.color] || item.color}</span>
                            <span className="text-xs text-muted-foreground">{SIZE_LABEL[item.size] || item.size} · {item.qty}</span>
                          </div>
                        ))}
                        {!orderItems.length && <span className="text-xs text-muted-foreground">{order.size}</span>}
                      </div>
                    </div>

                    <Button variant="outline" className={`h-auto min-h-12 justify-between px-3 py-2 ${paymentDone ? 'border-success/30 bg-success/5' : ''}`} disabled={paymentDone} onClick={() => openPay(order)}>
                      <span className="flex min-w-0 flex-col items-start leading-tight"><span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Pagamento</span><span className="text-xs font-semibold">{order.is_gift ? 'Brinde' : paymentDone ? 'Pago' : paymentStatus === 'partial' ? `Falta ${brl(remaining)}` : brl(order.total_price)}</span></span>
                      <PaymentBadge order={order} />
                    </Button>

                    <Button variant={delivered ? 'default' : 'outline'} className={`h-12 justify-between px-3 ${delivered ? 'bg-success hover:bg-success/90' : ''}`} onClick={() => toggleDelivery(order)}>
                      <span className="flex flex-col items-start leading-tight"><span className={`text-[10px] font-bold uppercase tracking-wide ${delivered ? 'text-success-foreground/80' : 'text-muted-foreground'}`}>Entrega</span><span className="text-xs font-semibold">{delivered ? 'Entregue' : 'Pendente'}</span></span>
                      {delivered ? <Check className="h-4 w-4" /> : <Truck className="h-4 w-4" />}
                    </Button>

                    <div className="flex justify-end gap-1"><Button variant="ghost" size="icon" title="Editar" onClick={() => openEdit(order)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" title="Excluir" onClick={() => requestDelete(order)}><Trash2 className="h-4 w-4" /></Button></div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={orderDialogOpen} onOpenChange={(open) => { setOrderDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? 'Editar Encomenda' : 'Nova Encomenda'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2"><Label>Campanha</Label><Select value={orderForm.campaign_id} onValueChange={applyCampaignDefaults}><SelectTrigger><SelectValue placeholder="Selecione uma campanha" /></SelectTrigger><SelectContent>{campaigns.map((campaign) => <SelectItem key={campaign.id} value={campaign.id}>{campaign.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Lote</Label><Select value={orderForm.lot_id} onValueChange={(value) => setOrderForm({ ...orderForm, lot_id: value })} disabled={!orderForm.campaign_id || campaignLots(orderForm.campaign_id).length === 0}><SelectTrigger><SelectValue placeholder="Selecione o lote" /></SelectTrigger><SelectContent>{campaignLots(orderForm.campaign_id).map((lot) => <SelectItem key={lot.id} value={lot.id}>{lotLabel(lot.id)} · {lot.quantity} camisas</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="space-y-2"><Label>Nome</Label><Input value={orderForm.buyer_name} onChange={(event) => setOrderForm({ ...orderForm, buyer_name: event.target.value })} /></div>
            <div className="space-y-2">
              <div className="flex items-center justify-between"><Label>Camisas</Label><Button type="button" variant="outline" size="sm" onClick={() => setItems([...items, emptyItem()])}><Plus className="mr-1 h-3 w-3" />Item</Button></div>
              {items.map((item, index) => (
                <div key={index} className="flex flex-wrap items-end gap-2 rounded-lg border p-3">
                  <div className="min-w-0 basis-[8rem] flex-1 space-y-1"><Label className="text-xs">Cor</Label><Select value={item.color} onValueChange={(value) => setItems(items.map((current, itemIndex) => itemIndex === index ? { ...current, color: value } : current))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{COLORS.map((color) => <SelectItem key={color.value} value={color.value}>{color.label}</SelectItem>)}</SelectContent></Select></div>
                  <div className="w-32 space-y-1"><Label className="text-xs">Tamanho</Label><Select value={item.size} onValueChange={(value) => setItems(items.map((current, itemIndex) => itemIndex === index ? { ...current, size: value } : current))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent className="max-h-72">{SIZES.map((size) => <SelectItem key={size} value={size}>{SIZE_LABEL[size]}</SelectItem>)}</SelectContent></Select></div>
                  <div className="w-20 space-y-1"><Label className="text-xs">Qtd.</Label><Input type="number" min="1" value={item.qty} onChange={(event) => setItems(items.map((current, itemIndex) => itemIndex === index ? { ...current, qty: Number(event.target.value) || 0 } : current))} /></div>
                  <Button type="button" variant="ghost" size="icon" className="ml-auto shrink-0 text-destructive" aria-label={`Remover item ${index + 1}`} disabled={items.length === 1} onClick={() => setItems(items.filter((_, itemIndex) => itemIndex !== index))}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" checked={orderForm.is_gift} onChange={(event) => setOrderForm({ ...orderForm, is_gift: event.target.checked })} /><Gift className="h-4 w-4" />Brinde</label>
            {!orderForm.is_gift && <div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label>Valor unitário</Label><Input type="number" step="0.01" value={orderForm.unit_price} onChange={(event) => setOrderForm({ ...orderForm, unit_price: event.target.value })} /></div><div className="space-y-2"><Label>Pagamento</Label><Select value={orderForm.payment_type} onValueChange={(value) => setOrderForm({ ...orderForm, payment_type: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="a_vista">À vista</SelectItem><SelectItem value="parcelado">Parcelado</SelectItem></SelectContent></Select></div></div>}
            <div className="space-y-2"><Label>Observações</Label><Textarea value={orderForm.notes} onChange={(event) => setOrderForm({ ...orderForm, notes: event.target.value })} /></div>
            <Button className="w-full" onClick={handleSaveOrder} disabled={submitting}>{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editingId ? 'Salvar alterações' : 'Registrar encomenda'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={payDialogOpen} onOpenChange={(open) => { setPayDialogOpen(open); if (!open) setPayOrder(null); }}>
        <DialogContent className="max-w-sm"><DialogHeader><DialogTitle>Registrar pagamento</DialogTitle></DialogHeader>{payOrder && <div className="space-y-4"><div className="rounded-xl bg-muted/40 p-3 text-sm"><p className="font-bold">{payOrder.buyer_name}</p><p>Restante: <strong className="text-destructive">{brl(Math.max(0, payOrder.total_price - payOrder.amount_paid))}</strong></p></div><div className="grid grid-cols-2 gap-2"><Button variant={payMode === 'total' ? 'default' : 'outline'} className="h-auto flex-col py-3" onClick={() => changePayMode('total')}><CheckCircle2 className="mb-1 h-5 w-5" /><span>Total</span><span className="text-xs font-normal opacity-80">Quitar tudo</span></Button><Button variant={payMode === 'partial' ? 'default' : 'outline'} className="h-auto flex-col py-3" onClick={() => changePayMode('partial')}><CircleDollarSign className="mb-1 h-5 w-5" /><span>Parcial</span><span className="text-xs font-normal opacity-80">Informar valor</span></Button></div>{payMode === 'partial' && <div className="space-y-2"><Label>Valor parcial</Label><Input autoFocus type="number" step="0.01" value={payAmount} onChange={(event) => setPayAmount(event.target.value)} /></div>}<div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label>Data</Label><Input type="date" value={payDate} onChange={(event) => setPayDate(event.target.value)} /></div><div className="space-y-2"><Label>Forma</Label><Select value={payMethod} onValueChange={setPayMethod}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pix">PIX</SelectItem><SelectItem value="dinheiro">Dinheiro</SelectItem><SelectItem value="transferencia">Transferência</SelectItem><SelectItem value="cartao">Cartão</SelectItem></SelectContent></Select></div></div><div className="space-y-2"><Label>Observação</Label><Textarea value={payNotes} onChange={(event) => setPayNotes(event.target.value)} /></div><Button className="w-full" onClick={handleRegisterPayment} disabled={submitting}>{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirmar {payMode === 'total' ? 'pagamento total' : 'pagamento parcial'}</Button></div>}</DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir encomenda?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={handleDelete} disabled={deleting}>{deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
