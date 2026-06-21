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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { AlertTriangle, ShoppingCart, Package, TrendingUp, Plus, Loader2, Shirt, Trash2, Gift, Clock, Wallet } from 'lucide-react';
import { EncomendasTab, type ShirtOrder, type OrderItem } from './EncomendasTab';
import { CampanhasCamisasTab, type ShirtCampaign } from './CampanhasCamisasTab';

const SIZES = ['PP', 'P', 'M', 'G', 'GG', 'XG'];
const ORDER_SIZES = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'Inf2', 'Inf3', 'Inf4'];
const ORDER_SIZE_LABEL: Record<string, string> = {
  PP: 'PP', P: 'P', M: 'M', G: 'G', GG: 'GG', XG: 'XG',
  Inf2: 'Inf 2 anos', Inf3: 'Inf 3 anos', Inf4: 'Inf 4 anos',
};
const ORDER_COLORS = [
  { value: 'off', label: 'Off White' },
  { value: 'preta', label: 'Preta' },
];

const formatCurrency = (value: number) =>
  `R$ ${Number(value || 0).toFixed(2).replace('.', ',')}`;

interface InventoryItem {
  id: string;
  size: string;
  quantity: number;
  average_cost: number;
}

interface Purchase {
  id: string;
  date: string;
  supplier: string | null;
  total_quantity: number;
  total_cost: number;
  unit_cost: number;
  notes: string | null;
  transaction_id: string | null;
}

interface Sale {
  id: string;
  date: string;
  buyer_name: string | null;
  size: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  payment_method: string | null;
  transaction_id: string | null;
}

export function CamisasTab() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('resumo');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [orders, setOrders] = useState<ShirtOrder[]>([]);
  const [campaigns, setCampaigns] = useState<ShirtCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<{ id: string; name: string }[]>([]);

  // Dialog states
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [saleDialogOpen, setSaleDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Delete states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: 'purchase' | 'sale'; transactionId?: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Purchase form
  const [purchaseForm, setPurchaseForm] = useState({
    date: new Date().toISOString().slice(0, 16),
    supplier: '',
    total_cost: '',
    notes: '',
    quantities: Object.fromEntries(SIZES.map(s => [s, '']))
  });

  // Sale form
  const [saleForm, setSaleForm] = useState({
    date: new Date().toISOString().slice(0, 16),
    buyer_name: '',
    member_id: '',
    size: 'M',
    quantity: '1',
    unit_price: '',
    payment_method: 'pix',
    notes: ''
  });

  const { effectiveSocietyId: societyId } = useAuth();

  useEffect(() => {
    fetchData();
  }, [societyId]);

  const fetchData = async () => {
    setLoading(true);
    let invQuery = supabase.from('shirt_inventory').select('*').order('size');
    let purchQuery = supabase.from('shirt_purchases').select('*').order('date', { ascending: false });
    let salesQuery = supabase.from('shirt_sales').select('*').order('date', { ascending: false });
    let membersQuery = supabase.from('members').select('id, name').eq('active', true).order('name');
    let ordersQuery = supabase.from('shirt_orders').select('*').order('buyer_name');
    let campaignsQuery = supabase.from('shirt_campaigns').select('*').order('purchase_date', { ascending: false });

    if (societyId) {
      invQuery = invQuery.eq('society_id', societyId);
      purchQuery = purchQuery.eq('society_id', societyId);
      salesQuery = salesQuery.eq('society_id', societyId);
      membersQuery = membersQuery.eq('society_id', societyId);
      ordersQuery = ordersQuery.eq('society_id', societyId);
      campaignsQuery = campaignsQuery.eq('society_id', societyId);
    }

    const [invRes, purchRes, salesRes, membersRes, ordersRes, campaignsRes] = await Promise.all([
      invQuery, purchQuery, salesQuery, membersQuery, ordersQuery, campaignsQuery
    ]);

    setInventory(invRes.data || []);
    setPurchases(purchRes.data || []);
    setSales(salesRes.data || []);
    setMembers(membersRes.data || []);
    setOrders(((ordersRes.data || []) as any[]).map(o => ({
      ...o,
      items: Array.isArray(o.items) ? (o.items as OrderItem[]) : [],
    })) as ShirtOrder[]);
    setCampaigns((campaignsRes.data || []) as ShirtCampaign[]);
    setLoading(false);
  };

  const handlePurchase = async () => {
    if (!user) return;
    
    const quantities = Object.entries(purchaseForm.quantities)
      .filter(([_, qty]) => parseInt(qty) > 0)
      .map(([size, qty]) => ({ size, quantity: parseInt(qty) }));

    if (quantities.length === 0) {
      toast.error('Informe a quantidade de pelo menos um tamanho');
      return;
    }

    const totalQuantity = quantities.reduce((sum, q) => sum + q.quantity, 0);
    const totalCost = parseFloat(purchaseForm.total_cost) || 0;

    if (totalCost <= 0) {
      toast.error('Informe o custo total');
      return;
    }

    setSubmitting(true);
    try {
      // Criar transação de despesa
      const { data: transaction, error: transError } = await supabase
        .from('transactions')
        .insert({
          description: `Compra de camisas - ${totalQuantity} unidades`,
          amount: totalCost,
          type: 'saida',
          date: purchaseForm.date.split('T')[0],
          created_by: user.id,
          origin: 'automatic',
          reference_type: 'shirt_purchase',
          society_id: societyId || null,
        })
        .select('id')
        .single();

      if (transError) throw transError;

      // Criar registro de compra
      const { data: purchase, error: purchError } = await supabase
        .from('shirt_purchases')
        .insert({
          date: purchaseForm.date,
          supplier: purchaseForm.supplier || null,
          total_quantity: totalQuantity,
          total_cost: totalCost,
          notes: purchaseForm.notes || null,
          transaction_id: transaction?.id,
          created_by: user.id,
          society_id: societyId || null,
        })
        .select('id')
        .single();

      if (purchError) throw purchError;

      // Criar itens por tamanho
      const items = quantities.map(q => ({
        purchase_id: purchase?.id,
        size: q.size,
        quantity: q.quantity
      }));
      await supabase.from('shirt_purchase_items').insert(items);

      // Atualizar estoque
      const unitCost = totalCost / totalQuantity;
      for (const q of quantities) {
        const inv = inventory.find(i => i.size === q.size);
        if (inv) {
          const newQuantity = inv.quantity + q.quantity;
          const newAverageCost = ((inv.quantity * inv.average_cost) + (q.quantity * unitCost)) / newQuantity;
          
          await supabase
            .from('shirt_inventory')
            .update({ quantity: newQuantity, average_cost: newAverageCost })
            .eq('id', inv.id);
        }
      }

      toast.success('Compra registrada com sucesso!');
      setPurchaseDialogOpen(false);
      setPurchaseForm({
        date: new Date().toISOString().slice(0, 16),
        supplier: '',
        total_cost: '',
        notes: '',
        quantities: Object.fromEntries(SIZES.map(s => [s, '']))
      });
      fetchData();
    } catch (error: any) {
      toast.error('Erro ao registrar compra: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSale = async () => {
    if (!user) return;

    const quantity = parseInt(saleForm.quantity) || 0;
    const unitPrice = parseFloat(saleForm.unit_price) || 0;

    if (quantity <= 0 || unitPrice <= 0) {
      toast.error('Informe quantidade e valor unitário');
      return;
    }

    const inv = inventory.find(i => i.size === saleForm.size);
    if (!inv || inv.quantity < quantity) {
      toast.error('Estoque insuficiente para este tamanho');
      return;
    }

    const totalPrice = quantity * unitPrice;

    setSubmitting(true);
    try {
      // Criar transação de receita
      const { data: transaction, error: transError } = await supabase
        .from('transactions')
        .insert({
          description: `Venda de camisas - ${quantity}x ${saleForm.size}`,
          amount: totalPrice,
          type: 'entrada',
          date: saleForm.date.split('T')[0],
          created_by: user.id,
          origin: 'automatic',
          reference_type: 'shirt_sale',
          member_id: saleForm.member_id || null,
          society_id: societyId || null,
        })
        .select('id')
        .single();

      if (transError) throw transError;

      // Criar registro de venda
      await supabase
        .from('shirt_sales')
        .insert({
          date: saleForm.date,
          buyer_name: saleForm.buyer_name || null,
          member_id: saleForm.member_id || null,
          size: saleForm.size,
          quantity,
          unit_price: unitPrice,
          payment_method: saleForm.payment_method || null,
          notes: saleForm.notes || null,
          transaction_id: transaction?.id,
          created_by: user.id,
          society_id: societyId || null,
        });

      // Atualizar estoque
      await supabase
        .from('shirt_inventory')
        .update({ quantity: inv.quantity - quantity })
        .eq('id', inv.id);

      toast.success('Venda registrada com sucesso!');
      setSaleDialogOpen(false);
      setSaleForm({
        date: new Date().toISOString().slice(0, 16),
        buyer_name: '',
        member_id: '',
        size: 'M',
        quantity: '1',
        unit_price: '',
        payment_method: 'pix',
        notes: ''
      });
      fetchData();
    } catch (error: any) {
      toast.error('Erro ao registrar venda: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    
    setDeleting(true);
    try {
      if (itemToDelete.type === 'purchase') {
        // Buscar itens da compra para reverter o estoque
        const { data: items } = await supabase
          .from('shirt_purchase_items')
          .select('size, quantity')
          .eq('purchase_id', itemToDelete.id);
        
        if (items) {
          for (const item of items) {
            const inv = inventory.find(i => i.size === item.size);
            if (inv) {
              await supabase
                .from('shirt_inventory')
                .update({ quantity: Math.max(0, inv.quantity - item.quantity) })
                .eq('id', inv.id);
            }
          }
        }
        
        // Excluir itens da compra
        await supabase.from('shirt_purchase_items').delete().eq('purchase_id', itemToDelete.id);
        
        // Excluir a compra
        await supabase.from('shirt_purchases').delete().eq('id', itemToDelete.id);
        
        // Excluir transação se existir
        if (itemToDelete.transactionId) {
          await supabase.from('transactions').delete().eq('id', itemToDelete.transactionId);
        }
        
        toast.success('Compra excluída com sucesso!');
      } else {
        // Buscar a venda para reverter o estoque
        const sale = sales.find(s => s.id === itemToDelete.id);
        if (sale) {
          const inv = inventory.find(i => i.size === sale.size);
          if (inv) {
            await supabase
              .from('shirt_inventory')
              .update({ quantity: inv.quantity + sale.quantity })
              .eq('id', inv.id);
          }
        }
        
        // Excluir a venda
        await supabase.from('shirt_sales').delete().eq('id', itemToDelete.id);
        
        // Excluir transação se existir
        if (itemToDelete.transactionId) {
          await supabase.from('transactions').delete().eq('id', itemToDelete.transactionId);
        }
        
        toast.success('Venda excluída com sucesso!');
      }
      
      setDeleteDialogOpen(false);
      setItemToDelete(null);
      fetchData();
    } catch (error: any) {
      toast.error('Erro ao excluir: ' + error.message);
    } finally {
      setDeleting(false);
    }
  };

  // Encomendas (orders)
  const orderOrdered = orders.reduce((s, o) => s + Number(o.total_price || 0), 0);
  const orderReceived = orders.reduce((s, o) => s + Number(o.amount_paid || 0), 0);
  const orderToReceive = Math.max(0, orderOrdered - orderReceived);
  const orderDelivered = orders.filter(o => o.delivery_status === 'entregue').length;
  const fullyPaidOrders = orders.filter(o => !o.is_gift && Number(o.total_price || 0) > 0 && Number(o.amount_paid || 0) >= Number(o.total_price || 0)).length;
  const halfPaidOrders = orders.filter(o => !o.is_gift && Number(o.amount_paid || 0) > 0 && Number(o.amount_paid || 0) < Number(o.total_price || 0)).length;

  // Estoque = encomendas ainda NÃO entregues (entregue sai do estoque) + estoque avulso
  const undeliveredOrders = orders.filter(o => o.delivery_status !== 'entregue');
  const orderProduction = (() => {
    const byColor: Record<string, Record<string, number>> = { off: {}, preta: {} };
    let total = 0;
    undeliveredOrders.forEach(o => (o.items || []).forEach(i => {
      const c = byColor[i.color] || (byColor[i.color] = {});
      c[i.size] = (c[i.size] || 0) + (Number(i.qty) || 0);
      total += Number(i.qty) || 0;
    }));
    return { byColor, total };
  })();

  // Valor que sobrou no estoque (encomendas não entregues)
  const stockValue = undeliveredOrders.reduce((s, o) => s + Number(o.total_price || 0), 0);

  // Resumo principal usa campanha/encomendas. Vendas diretas antigas ficam separadas para evitar duplicidade.
  const totalStock = inventory.reduce((sum, i) => sum + i.quantity, 0) + orderProduction.total;
  const legacyPurchaseCost = purchases.reduce((sum, p) => sum + Number(p.total_cost || 0), 0);
  const campaignCost = campaigns.reduce((sum, c) => sum + Number(c.total_purchase_cost || 0), 0);
  const realShirtCosts = legacyPurchaseCost + campaignCost;
  const currentResult = orderReceived - realShirtCosts;
  const projectedResult = orderOrdered - realShirtCosts;
  const legacySalesTotal = sales.reduce((sum, s) => sum + Number(s.total_price || 0), 0);

  // Brindes contabilizados como gasto (pelo custo de produção), apenas para controle/visualização.
  // O custo já está embutido na compra da campanha, então NÃO é somado novamente em realShirtCosts.
  const giftQty = orders.filter(o => o.is_gift).reduce((s, o) => s + Number(o.quantity || 0), 0);
  const totalPurchasedQty = campaigns.reduce((s, c) => s + Number(c.purchased_quantity || 0), 0);
  const avgUnitCost = totalPurchasedQty > 0
    ? campaignCost / totalPurchasedQty
    : (campaigns[0] ? Number(campaigns[0].unit_cost || 0) : 0);
  const giftCost = giftQty * avgUnitCost;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="campanhas">Campanhas</TabsTrigger>
          <TabsTrigger value="encomendas">Encomendas</TabsTrigger>
          <TabsTrigger value="compras">Compras</TabsTrigger>
          <TabsTrigger value="vendas">Vendas</TabsTrigger>
          <TabsTrigger value="estoque">Estoque</TabsTrigger>
        </TabsList>

        <TabsContent value="campanhas" className="space-y-4 animate-in fade-in-50">
          <CampanhasCamisasTab
            selectedCampaignId={selectedCampaignId}
            onSelectCampaign={(id) => { setSelectedCampaignId(id); setActiveTab('encomendas'); }}
            onDataChange={fetchData}
          />
        </TabsContent>

        <TabsContent value="encomendas" className="space-y-4 animate-in fade-in-50">
          <EncomendasTab onDataChange={fetchData} selectedCampaignId={selectedCampaignId} />
        </TabsContent>

        <TabsContent value="resumo" className="space-y-6 animate-in fade-in-50">
          {legacySalesTotal > 0 && (
            <Card className="border-amber-500/40 bg-amber-500/10">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-3 text-sm">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <p className="font-medium">Há {formatCurrency(legacySalesTotal)} em vendas diretas antigas.</p>
                    <p className="text-muted-foreground">
                      Esse valor não entra mais no resultado do lote para evitar duplicar as encomendas. Confira a aba Vendas e remova apenas o que tiver sido lançado novamente em Encomendas.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ===== Financeiro do lote ===== */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Financeiro do lote</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* Recebido / Caixa atual */}
              <Card><CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Recebido</p>
                    <p className="text-xl font-bold text-success">{formatCurrency(orderReceived)}</p>
                    <p className={`text-xs ${currentResult >= 0 ? 'text-success' : 'text-destructive'}`}>
                      Caixa: {formatCurrency(currentResult)}
                    </p>
                  </div>
                </div>
              </CardContent></Card>

              {/* A receber (total) */}
              <Card><CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">A receber (total)</p>
                    <p className="text-xl font-bold text-amber-500">{formatCurrency(orderToReceive)}</p>
                    <p className="text-xs text-muted-foreground">de {formatCurrency(orderOrdered)} vendidos</p>
                  </div>
                </div>
              </CardContent></Card>

              {/* Gastos (com brindes) */}
              <Card><CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                    <ShoppingCart className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Gastos das camisas</p>
                    <p className="text-xl font-bold">{formatCurrency(realShirtCosts)}</p>
                    {giftQty > 0 && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Gift className="h-3 w-3" /> {giftQty} brinde{giftQty > 1 ? 's' : ''}: {formatCurrency(giftCost)}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent></Card>

              {/* Lucro previsto */}
              <Card><CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-lg ${projectedResult >= 0 ? 'bg-success/10' : 'bg-destructive/10'} flex items-center justify-center`}>
                    <Wallet className={`h-5 w-5 ${projectedResult >= 0 ? 'text-success' : 'text-destructive'}`} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Lucro previsto</p>
                    <p className={`text-xl font-bold ${projectedResult >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {formatCurrency(projectedResult)}
                    </p>
                    <p className="text-xs text-muted-foreground">se todos pagarem</p>
                  </div>
                </div>
              </CardContent></Card>
            </div>
          </div>

          {/* ===== Produção e estoque ===== */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Produção e estoque</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card><CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Em Estoque</p>
                    <p className="text-xl font-bold">{totalStock}</p>
                  </div>
                </div>
              </CardContent></Card>
              <Card><CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Encomendado</p>
                <p className="text-xl font-bold">{formatCurrency(orderOrdered)}</p>
              </CardContent></Card>
              <Card><CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Entregues</p>
                <p className="text-xl font-bold">{orderDelivered}<span className="text-sm text-muted-foreground"> / {orders.length}</span></p>
              </CardContent></Card>
              <Card><CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Pagamentos</p>
                <p className="text-xl font-bold"><span className="text-success">{fullyPaidOrders}</span> / <span className="text-amber-500">{halfPaidOrders}</span></p>
                <p className="text-xs text-muted-foreground">quitados / metade</p>
              </CardContent></Card>
            </div>

            {orders.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card><CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Campanhas</p>
                  <p className="text-xl font-bold">{campaigns.length}</p>
                </CardContent></Card>
                <Card><CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Custo de campanhas</p>
                  <p className="text-xl font-bold">{formatCurrency(campaignCost)}</p>
                </CardContent></Card>
                <Card><CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Compras antigas</p>
                  <p className="text-xl font-bold">{formatCurrency(legacyPurchaseCost)}</p>
                </CardContent></Card>
                <Card><CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Brindes</p>
                  <p className="text-xl font-bold">{giftQty}</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(giftCost)} em custo</p>
                </CardContent></Card>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="compras" className="space-y-4 animate-in fade-in-50">
          <div className="flex justify-end">
            <Button onClick={() => setPurchaseDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Compra
            </Button>
          </div>

          <Card>
            <CardContent className="pt-6">
              {purchases.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhuma compra registrada</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>Quantidade</TableHead>
                      <TableHead>Custo Total</TableHead>
                      <TableHead>Custo Unit.</TableHead>
                      <TableHead className="w-16">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchases.map(p => (
                      <TableRow key={p.id}>
                        <TableCell>{new Date(p.date).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell>{p.supplier || '-'}</TableCell>
                        <TableCell>{p.total_quantity}</TableCell>
                        <TableCell>{formatCurrency(p.total_cost)}</TableCell>
                        <TableCell>{formatCurrency(p.unit_cost || 0)}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => {
                              setItemToDelete({ id: p.id, type: 'purchase', transactionId: p.transaction_id || undefined });
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vendas" className="space-y-4 animate-in fade-in-50">
          <Card className="border-amber-500/40 bg-amber-500/10">
            <CardContent className="pt-4 pb-4 text-sm text-muted-foreground">
              Use esta aba apenas para vendas avulsas de estoque antigo. Para a campanha atual, registre somente em Encomendas e depois marque o pagamento como quitado ou parcial.
            </CardContent>
          </Card>
          <div className="flex justify-end">
            <Button onClick={() => setSaleDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Venda
            </Button>
          </div>

          <Card>
            <CardContent className="pt-6">
              {sales.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhuma venda registrada</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Comprador</TableHead>
                      <TableHead>Tamanho</TableHead>
                      <TableHead>Qtd</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead className="w-16">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sales.map(s => (
                      <TableRow key={s.id}>
                        <TableCell>{new Date(s.date).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell>{s.buyer_name || '-'}</TableCell>
                        <TableCell><Badge variant="outline">{s.size}</Badge></TableCell>
                        <TableCell>{s.quantity}</TableCell>
                        <TableCell>{formatCurrency(s.total_price || 0)}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => {
                              setItemToDelete({ id: s.id, type: 'sale', transactionId: s.transaction_id || undefined });
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="estoque" className="space-y-4 animate-in fade-in-50">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Estoque por Tamanho</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline">Em estoque: {orderProduction.total} camisas</Badge>
                <Badge variant="secondary">Valor: {formatCurrency(stockValue)}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {orderProduction.total === 0 && (
                <p className="text-sm text-muted-foreground mb-3">Todas as camisas foram entregues — estoque zerado.</p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {ORDER_COLORS.map(c => {
                  const sizes = ORDER_SIZES.filter(s => orderProduction.byColor[c.value]?.[s]);
                  const colorTotal = sizes.reduce((s, sz) => s + orderProduction.byColor[c.value][sz], 0);
                  return (
                    <div key={c.value} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{c.label}</span>
                        <Badge variant="secondary">{colorTotal}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {sizes.length === 0 ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : sizes.map(s => (
                          <Badge key={s} variant="outline" className="text-xs">
                            {ORDER_SIZE_LABEL[s]}: {orderProduction.byColor[c.value][s]}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de Compra */}
      <Dialog open={purchaseDialogOpen} onOpenChange={setPurchaseDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Compra de Camisas</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Data</Label>
              <Input
                type="datetime-local"
                value={purchaseForm.date}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Fornecedor</Label>
              <Input
                placeholder="Nome do fornecedor"
                value={purchaseForm.supplier}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, supplier: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Quantidade por Tamanho</Label>
              <div className="grid grid-cols-3 gap-2">
                {SIZES.map(size => (
                  <div key={size} className="space-y-1">
                    <Label className="text-xs">{size}</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={purchaseForm.quantities[size]}
                      onChange={(e) => setPurchaseForm({
                        ...purchaseForm,
                        quantities: { ...purchaseForm.quantities, [size]: e.target.value }
                      })}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Custo Total (R$)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={purchaseForm.total_cost}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, total_cost: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                placeholder="Observações..."
                value={purchaseForm.notes}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, notes: e.target.value })}
              />
            </div>
            <Button className="w-full" onClick={handlePurchase} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Registrar Compra
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Venda */}
      <Dialog open={saleDialogOpen} onOpenChange={setSaleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Venda de Camisa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Data</Label>
              <Input
                type="datetime-local"
                value={saleForm.date}
                onChange={(e) => setSaleForm({ ...saleForm, date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Comprador (Membro)</Label>
              <Select value={saleForm.member_id} onValueChange={(v) => setSaleForm({ ...saleForm, member_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um membro..." />
                </SelectTrigger>
                <SelectContent>
                  {members.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ou digite o nome</Label>
              <Input
                placeholder="Nome do comprador"
                value={saleForm.buyer_name}
                onChange={(e) => setSaleForm({ ...saleForm, buyer_name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tamanho</Label>
                <Select value={saleForm.size} onValueChange={(v) => setSaleForm({ ...saleForm, size: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {inventory.map(i => (
                      <SelectItem key={i.size} value={i.size}>
                        {i.size} ({i.quantity} disp.)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Quantidade</Label>
                <Input
                  type="number"
                  min="1"
                  value={saleForm.quantity}
                  onChange={(e) => setSaleForm({ ...saleForm, quantity: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor Unitário (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={saleForm.unit_price}
                  onChange={(e) => setSaleForm({ ...saleForm, unit_price: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Método</Label>
                <Select value={saleForm.payment_method} onValueChange={(v) => setSaleForm({ ...saleForm, payment_method: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button className="w-full" onClick={handleSale} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Registrar Venda
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              {itemToDelete?.type === 'purchase' 
                ? 'Ao excluir esta compra, o estoque será ajustado (quantidades reduzidas) e a transação financeira associada será removida.'
                : 'Ao excluir esta venda, o estoque será ajustado (quantidades devolvidas) e a transação financeira associada será removida.'}
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
