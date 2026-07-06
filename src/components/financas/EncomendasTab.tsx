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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Gift,
  Loader2,
  PackageCheck,
  Pencil,
  Plus,
  Search,
  Trash2,
  Truck,
} from 'lucide-react';
import type { ShirtCampaign } from './CampanhasCamisasTab';

const SIZES = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'Inf2', 'Inf3', 'Inf4'];
const SIZE_LABEL: Record<string, string> = {
  PP: 'PP',
  P: 'P',
  M: 'M',
  G: 'G',
  GG: 'GG',
  XG: 'XG',
  Inf2: 'Inf 2 anos',
  Inf3: 'Inf 3 anos',
  Inf4: 'Inf 4 anos',
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

interface Props {
  onDataChange?: () => void;
  selectedCampaignId?: string | null;
}

type OrderView = 'open' | 'finished' | 'all';

const emptyItem = (): OrderItem => ({ color: 'off', size: 'M', qty: 1 });

const itemsSummary = (items: OrderItem[]) =>
  items.map((item) => `${COLOR_LABEL[item.color] || item.color}: ${item.qty} ${SIZE_LABEL[item.size] || item.size}`).join(' | ');

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

const isFinished = (order: ShirtOrder) => {
  const paymentDone = order.is_gift || Number(order.amount_paid) >= Number(order.total_price);
  return paymentDone && order.delivery_status === 'entregue';
};

function PaymentBadge({ order }: { order: ShirtOrder }) {
  const status = getPaymentStatus(order);
  if (status === 'gift') {
    return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100"><Gift className="mr-1 h-3 w-3" />Brinde</Badge>;
  }
  if (status === 'pending') return <Badge variant="destructive">Pendente</Badge>;
  if (status === 'partial') return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Parcial</Badge>;
  return <Badge className="bg-success text-success-foreground hover:bg-success/90">Pago</Badge>;
}

export function EncomendasTab({ onDataChange, selectedCampaignId }: Props) {
  const { user, effectiveSocietyId: societyId } = useAuth();
  const [orders, setOrders] = useState<ShirtOrder[]>([]);
  const [campaigns, setCampaigns] = useState<ShirtCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [view, setView] = useState<OrderView>('open');

  const [search, setSearch] = useState('');
  const [filterPayment, setFilterPayment] = useState('all');
  const [filterDelivery, setFilterDelivery] = useState('all');
  const [filterSize, setFilterSize] = useState('all');
  const [filterColor, setFilterColor] = useState('all');
  const [filterCampaign, setFilterCampaign] = useState('all');

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

  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [payOrder, setPayOrder] = useState<ShirtOrder | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payMethod, setPayMethod] = useState('pix');
  const [payNotes, setPayNotes] = useState('');

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    let ordersQuery = supabase.from('shirt_orders').select('*').order('buyer_name');
    let campaignsQuery = supabase.from('shirt_campaigns').select('*').order('purchase_date', { ascending: false });

    if (societyId) {
      ordersQuery = ordersQuery.eq('society_id', societyId);
      campaignsQuery = campaignsQuery.eq('society_id', societyId);
    }

    const [{ data: orderData, error }, { data: campaignData }] = await Promise.all([ordersQuery, campaignsQuery]);
    if (error) toast.error('Erro ao carregar encomendas');

    setOrders(((orderData || []) as any[]).map((order) => ({
      ...order,
      items: Array.isArray(order.items) ? order.items as OrderItem[] : [],
    })) as ShirtOrder[]);
    setCampaigns((campaignData || []) as ShirtCampaign[]);
    setLoading(false);
  }, [societyId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (selectedCampaignId) setFilterCampaign(selectedCampaignId);
  }, [selectedCampaignId]);

  const defaultCampaignId = () =>
    filterCampaign !== 'all' && filterCampaign !== 'none' ? filterCampaign : selectedCampaignId || '';

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

  const openNew = () => {
    resetForm();
    const campaignId = defaultCampaignId();
    const campaign = campaigns.find((item) => item.id === campaignId);
    if (campaign) {
      setOrderForm((current) => ({
        ...current,
        campaign_id: campaign.id,
        unit_price: String(campaign.default_sale_price),
      }));
    }
    setOrderDialogOpen(true);
  };

  const openEdit = (order: ShirtOrder) => {
    setEditingId(order.id);
    setOrderForm({
      date: new Date(order.date).toISOString().slice(0, 16),
      buyer_name: order.buyer_name,
      unit_price: String(order.unit_price),
      payment_type: order.payment_type,
      is_gift: Boolean(order.is_gift),
      notes: order.notes || '',
      campaign_id: order.campaign_id || '',
    });
    setItems(order.items?.length ? order.items.map((item) => ({ ...item })) : [emptyItem()]);
    setOrderDialogOpen(true);
  };

  const applyCampaignDefaults = (campaignId: string) => {
    const campaign = campaigns.find((item) => item.id === campaignId);
    setOrderForm((current) => ({
      ...current,
      campaign_id: campaignId,
      unit_price: campaign && !current.is_gift ? String(campaign.default_sale_price) : current.unit_price,
    }));
  };

  const handleSaveOrder = async () => {
    if (!user) return;

    const validItems = items.filter((item) => Number(item.qty) > 0);
    const quantity = validItems.reduce((sum, item) => sum + Number(item.qty || 0), 0);
    const unitPrice = Number(orderForm.unit_price || 0);
    const campaign = campaigns.find((item) => item.id === orderForm.campaign_id);

    if (!orderForm.buyer_name.trim()) return void toast.error('Informe o nome da pessoa');
    if (!campaign) return void toast.error('Selecione uma campanha');
    if (!validItems.length || quantity <= 0) return void toast.error('Adicione pelo menos uma camisa');

    const alreadyOrdered = orders
      .filter((order) => order.campaign_id === campaign.id && order.id !== editingId)
      .reduce((sum, order) => sum + Number(order.quantity || 0), 0);
    const available = Number(campaign.purchased_quantity || 0) - alreadyOrdered;
    if (quantity > available) return void toast.error(`Saldo insuficiente. Disponível: ${available}`);

    const payload = {
      date: orderForm.date,
      buyer_name: orderForm.buyer_name.trim(),
      size: itemsSummary(validItems),
      quantity,
      unit_price: orderForm.is_gift ? 0 : unitPrice,
      unit_cost: Number(campaign.unit_cost || 0),
      total_price: orderForm.is_gift ? 0 : quantity * unitPrice,
      payment_type: orderForm.is_gift ? 'brinde' : orderForm.payment_type,
      is_gift: orderForm.is_gift,
      items: validItems as unknown as never,
      notes: orderForm.notes || null,
      campaign_id: campaign.id,
      society_id: societyId || null,
      created_by: user.id,
    };

    setSubmitting(true);
    try {
      if (editingId) {
        const { data, error } = await supabase.from('shirt_orders').update(payload).eq('id', editingId).select('*').single();
        if (error) throw error;
        setOrders((current) => current.map((order) => order.id === editingId
          ? { ...(data as ShirtOrder), items: validItems }
          : order));
        toast.success('Encomenda atualizada!');
      } else {
        const { data, error } = await supabase.from('shirt_orders').insert(payload).select('*').single();
        if (error) throw error;
        setOrders((current) => [...current, { ...(data as ShirtOrder), items: validItems }]
          .sort((a, b) => a.buyer_name.localeCompare(b.buyer_name)));
        toast.success('Encomenda registrada!');
      }
      setOrderDialogOpen(false);
      resetForm();
      onDataChange?.();
    } catch (error) {
      toast.error('Erro ao salvar: ' + (error as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const openPay = (order: ShirtOrder) => {
    const remaining = Math.max(0, Number(order.total_price) - Number(order.amount_paid));
    const suggestion = order.payment_type === 'parcelado' && Number(order.amount_paid) <= 0
      ? Number(order.total_price) / 2
      : remaining;

    setPayOrder(order);
    setPayAmount(suggestion > 0 ? suggestion.toFixed(2) : '');
    setPayDate(new Date().toISOString().slice(0, 10));
    setPayMethod('pix');
    setPayNotes('');
    setPayDialogOpen(true);
  };

  const handleRegisterPayment = async () => {
    if (!payOrder) return;
    const amount = Number(payAmount || 0);
    const remaining = Math.max(0, Number(payOrder.total_price) - Number(payOrder.amount_paid));

    if (amount <= 0) return void toast.error('Informe um valor válido');
    if (amount > remaining + 0.009) return void toast.error(`O valor máximo é ${brl(remaining)}`);

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

      const orderId = payOrder.id;
      setOrders((current) => current.map((order) => order.id === orderId
        ? { ...order, amount_paid: Math.min(Number(order.total_price), Number(order.amount_paid) + amount) }
        : order));
      setPayDialogOpen(false);
      setPayOrder(null);
      setPayAmount('');
      toast.success('Pagamento registrado!');
    } catch (error) {
      toast.error('Erro ao registrar pagamento: ' + (error as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleDelivery = async (order: ShirtOrder) => {
    const delivered = order.delivery_status !== 'entregue';
    const delivery_status = delivered ? 'entregue' : 'pendente';
    const delivered_at = delivered ? new Date().toISOString() : null;

    setOrders((current) => current.map((item) => item.id === order.id
      ? { ...item, delivery_status, delivered_at }
      : item));

    const { error } = await supabase.from('shirt_orders').update({ delivery_status, delivered_at }).eq('id', order.id);
    if (error) {
      setOrders((current) => current.map((item) => item.id === order.id ? order : item));
      toast.error('Erro ao atualizar entrega');
      return;
    }
    toast.success(delivered ? 'Marcado como entregue' : 'Entrega desfeita');
  };

  const requestDelete = (order: ShirtOrder) => {
    if (Number(order.amount_paid) > 0) {
      toast.error('Esta encomenda possui pagamentos registrados.');
      return;
    }
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
    } catch (error) {
      toast.error('Erro ao excluir: ' + (error as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  const filtered = useMemo(() => orders.filter((order) => {
    if (view === 'open' && isFinished(order)) return false;
    if (view === 'finished' && !isFinished(order)) return false;
    if (search && !order.buyer_name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCampaign === 'none' && order.campaign_id) return false;
    if (filterCampaign !== 'all' && filterCampaign !== 'none' && order.campaign_id !== filterCampaign) return false;
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
  }), [orders, view, search, filterCampaign, filterDelivery, filterSize, filterColor, filterPayment]);

  const openCount = orders.filter((order) => !isFinished(order)).length;
  const finishedCount = orders.filter(isFinished).length;

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-card p-1.5 shadow-sm">
        <div className="grid grid-cols-3 gap-1">
          {([
            ['open', `Em andamento ${openCount}`],
            ['finished', `Finalizados ${finishedCount}`],
            ['all', `Todos ${orders.length}`],
          ] as Array<[OrderView, string]>).map(([value, label]) => (
            <Button
              key={value}
              type="button"
              variant="ghost"
              className={view === value ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground' : ''}
              onClick={() => setView(value)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-8" placeholder="Buscar por nome..." value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={filterCampaign} onValueChange={setFilterCampaign}>
            <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as campanhas</SelectItem>
              <SelectItem value="none">Sem campanha</SelectItem>
              {campaigns.map((campaign) => <SelectItem key={campaign.id} value={campaign.id}>{campaign.name}</SelectItem>)}
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
          <Select value={filterDelivery} onValueChange={setFilterDelivery}>
            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Entrega</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="entregue">Entregue</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterColor} onValueChange={setFilterColor}>
            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Cor</SelectItem>
              {COLORS.map((color) => <SelectItem key={color.value} value={color.value}>{color.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterSize} onValueChange={setFilterSize}>
            <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tamanho</SelectItem>
              {SIZES.map((size) => <SelectItem key={size} value={size}>{SIZE_LABEL[size]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />Nova Encomenda</Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Nenhuma encomenda encontrada</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((order) => {
            const paymentStatus = getPaymentStatus(order);
            const paymentDone = paymentStatus === 'paid' || paymentStatus === 'gift';
            const delivered = order.delivery_status === 'entregue';
            const finished = isFinished(order);
            const remaining = Math.max(0, Number(order.total_price) - Number(order.amount_paid));
            const orderItems = order.items?.length ? order.items : [];

            return (
              <Card key={order.id} className={finished ? 'border-success/25 bg-success/[0.025]' : ''}>
                <CardContent className="p-0">
                  <div className="grid gap-4 p-4 lg:grid-cols-[minmax(220px,1.2fr)_minmax(220px,1fr)_minmax(220px,1fr)_auto] lg:items-center">
                    <div className="min-w-0">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-bold">{order.buyer_name}</p>
                          <p className="text-xs text-muted-foreground">{order.quantity} camisa{order.quantity !== 1 ? 's' : ''}</p>
                        </div>
                        <Badge className={finished ? 'bg-success text-success-foreground' : ''} variant={finished ? 'default' : 'outline'}>
                          {finished ? <><CheckCircle2 className="mr-1 h-3 w-3" />Finalizado</> : 'Em andamento'}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {orderItems.map((item, index) => (
                          <div key={`${order.id}-${index}`} className="flex items-center gap-2 rounded-xl border bg-background px-2.5 py-2">
                            <span className={`h-3 w-3 rounded-full border ${item.color === 'preta' ? 'bg-slate-900' : 'bg-white'}`} />
                            <div className="leading-tight">
                              <p className="text-xs font-semibold">{COLOR_LABEL[item.color] || item.color}</p>
                              <p className="text-[11px] text-muted-foreground"><strong className="text-foreground">{SIZE_LABEL[item.size] || item.size}</strong> · {item.qty} un.</p>
                            </div>
                          </div>
                        ))}
                        {!orderItems.length && <span className="text-xs text-muted-foreground">{order.size}</span>}
                      </div>
                    </div>

                    <div className="rounded-xl border bg-background/70 p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pagamento</span>
                        <PaymentBadge order={order} />
                      </div>
                      {order.is_gift ? (
                        <p className="text-sm text-muted-foreground">Pedido de cortesia</p>
                      ) : (
                        <>
                          <p className="text-sm font-semibold">{brl(order.amount_paid)} <span className="font-normal text-muted-foreground">de {brl(order.total_price)}</span></p>
                          {!paymentDone && <p className="mt-1 text-xs text-destructive">Faltam {brl(remaining)}</p>}
                        </>
                      )}
                      {!paymentDone && (
                        <Button className="mt-3 w-full" size="sm" variant="outline" onClick={() => openPay(order)}>
                          <CircleDollarSign className="mr-2 h-4 w-4" />
                          {paymentStatus === 'partial' ? 'Completar pagamento' : 'Registrar pagamento'}
                        </Button>
                      )}
                    </div>

                    <div className="rounded-xl border bg-background/70 p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Entrega</span>
                        {delivered
                          ? <Badge className="bg-success text-success-foreground">Entregue</Badge>
                          : <Badge variant="secondary">Pendente</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {delivered && order.delivered_at
                          ? `Entregue em ${new Date(order.delivered_at).toLocaleDateString('pt-BR')}`
                          : delivered ? 'Entrega registrada' : 'Aguardando retirada ou entrega'}
                      </p>
                      <Button className="mt-3 w-full" size="sm" variant={delivered ? 'outline' : 'default'} onClick={() => toggleDelivery(order)}>
                        {delivered ? <PackageCheck className="mr-2 h-4 w-4" /> : <Truck className="mr-2 h-4 w-4" />}
                        {delivered ? 'Desfazer entrega' : 'Marcar como entregue'}
                      </Button>
                    </div>

                    <div className="flex items-center justify-end gap-1 lg:flex-col">
                      <Button variant="ghost" size="icon" title="Editar" onClick={() => openEdit(order)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" title="Excluir" onClick={() => requestDelete(order)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>

                  {!finished && (
                    <div className="flex items-center gap-2 border-t bg-muted/25 px-4 py-2 text-xs font-medium">
                      <Clock3 className="h-3.5 w-3.5 text-amber-600" />
                      {!paymentDone && !delivered ? 'Falta pagamento e entrega' : !paymentDone ? 'Falta pagamento' : 'Falta entrega'}
                    </div>
                  )}
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
            <div className="space-y-2">
              <Label>Campanha</Label>
              <Select value={orderForm.campaign_id} onValueChange={applyCampaignDefaults}>
                <SelectTrigger><SelectValue placeholder="Selecione uma campanha" /></SelectTrigger>
                <SelectContent>{campaigns.map((campaign) => <SelectItem key={campaign.id} value={campaign.id}>{campaign.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={orderForm.buyer_name} onChange={(event) => setOrderForm({ ...orderForm, buyer_name: event.target.value })} placeholder="Nome da pessoa" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Camisas</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => setItems([...items, emptyItem()])}><Plus className="mr-1 h-3 w-3" />Item</Button>
              </div>
              {items.map((item, index) => (
                <div key={index} className="flex items-end gap-2">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Cor</Label>
                    <Select value={item.color} onValueChange={(value) => setItems(items.map((current, itemIndex) => itemIndex === index ? { ...current, color: value } : current))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{COLORS.map((color) => <SelectItem key={color.value} value={color.value}>{color.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="w-28 space-y-1">
                    <Label className="text-xs">Tamanho</Label>
                    <Select value={item.size} onValueChange={(value) => setItems(items.map((current, itemIndex) => itemIndex === index ? { ...current, size: value } : current))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{SIZES.map((size) => <SelectItem key={size} value={size}>{SIZE_LABEL[size]}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="w-20 space-y-1">
                    <Label className="text-xs">Qtd.</Label>
                    <Input type="number" min="1" value={item.qty} onChange={(event) => setItems(items.map((current, itemIndex) => itemIndex === index ? { ...current, qty: Number(event.target.value) || 0 } : current))} />
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="text-destructive" disabled={items.length === 1} onClick={() => setItems(items.filter((_, itemIndex) => itemIndex !== index))}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" checked={orderForm.is_gift} onChange={(event) => setOrderForm({ ...orderForm, is_gift: event.target.checked })} />
              <Gift className="h-4 w-4" />Brinde
            </label>
            {!orderForm.is_gift && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Valor unitário</Label>
                  <Input type="number" step="0.01" value={orderForm.unit_price} onChange={(event) => setOrderForm({ ...orderForm, unit_price: event.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Pagamento</Label>
                  <Select value={orderForm.payment_type} onValueChange={(value) => setOrderForm({ ...orderForm, payment_type: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="a_vista">À vista</SelectItem><SelectItem value="parcelado">Parcelado</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={orderForm.notes} onChange={(event) => setOrderForm({ ...orderForm, notes: event.target.value })} />
            </div>
            <Button className="w-full" onClick={handleSaveOrder} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingId ? 'Salvar alterações' : 'Registrar encomenda'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={payDialogOpen} onOpenChange={(open) => { setPayDialogOpen(open); if (!open) setPayOrder(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Registrar pagamento</DialogTitle></DialogHeader>
          {payOrder && (
            <div className="space-y-4">
              <div className="rounded-xl bg-muted/40 p-3 text-sm">
                <p className="font-bold">{payOrder.buyer_name}</p>
                <p>Total: {brl(payOrder.total_price)}</p>
                <p>Pago: <span className="text-success">{brl(payOrder.amount_paid)}</span></p>
                <p>Restante: <span className="text-destructive">{brl(Math.max(0, payOrder.total_price - payOrder.amount_paid))}</span></p>
              </div>
              <div className="space-y-2"><Label>Valor</Label><Input type="number" step="0.01" value={payAmount} onChange={(event) => setPayAmount(event.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Data</Label><Input type="date" value={payDate} onChange={(event) => setPayDate(event.target.value)} /></div>
                <div className="space-y-2">
                  <Label>Forma</Label>
                  <Select value={payMethod} onValueChange={setPayMethod}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="pix">PIX</SelectItem><SelectItem value="dinheiro">Dinheiro</SelectItem><SelectItem value="transferencia">Transferência</SelectItem><SelectItem value="cartao">Cartão</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2"><Label>Observação</Label><Textarea value={payNotes} onChange={(event) => setPayNotes(event.target.value)} /></div>
              <Button className="w-full" onClick={handleRegisterPayment} disabled={submitting}>{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirmar pagamento</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir encomenda?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={handleDelete} disabled={deleting}>{deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
