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
import { ShoppingCart, Package, TrendingUp, Plus, Loader2, Shirt, Trash2 } from 'lucide-react';
import { EncomendasTab, type ShirtOrder, type OrderItem } from './EncomendasTab';

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
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [orders, setOrders] = useState<ShirtOrder[]>([]);
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

    if (societyId) {
      invQuery = invQuery.eq('society_id', societyId);
      purchQuery = purchQuery.eq('society_id', societyId);
      salesQuery = salesQuery.eq('society_id', societyId);
      membersQuery = membersQuery.eq('society_id', societyId);
      ordersQuery = ordersQuery.eq('society_id', societyId);
    }

    const [invRes, purchRes, salesRes, membersRes, ordersRes] = await Promise.all([
      invQuery, purchQuery, salesQuery, membersQuery, ordersQuery
    ]);

    setInventory(invRes.data || []);
    setPurchases(purchRes.data || []);
    setSales(salesRes.data || []);
    setMembers(membersRes.data || []);
    setOrders(((ordersRes.data || []) as any[]).map(o => ({
      ...o,
      items: Array.isArray(o.items) ? (o.items as OrderItem[]) : [],
    })) as ShirtOrder[]);
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

  // Stats
  const totalStock = inventory.reduce((sum, i) => sum + i.quantity, 0);
  const totalPurchased = purchases.reduce((sum, p) => sum + p.total_cost, 0);
  const totalSold = sales.reduce((sum, s) => sum + s.total_price, 0);
  const profit = totalSold - totalPurchased;

  // Encomendas (orders)
  const orderOrdered = orders.reduce((s, o) => s + Number(o.total_price || 0), 0);
  const orderReceived = orders.reduce((s, o) => s + Number(o.amount_paid || 0), 0);
  const orderToReceive = Math.max(0, orderOrdered - orderReceived);
  const orderDelivered = orders.filter(o => o.delivery_status === 'entregue').length;
  const orderProduction = (() => {
    const byColor: Record<string, Record<string, number>> = { off: {}, preta: {} };
    let total = 0;
    orders.forEach(o => (o.items || []).forEach(i => {
      const c = byColor[i.color] || (byColor[i.color] = {});
      c[i.size] = (c[i.size] || 0) + (Number(i.qty) || 0);
      total += Number(i.qty) || 0;
    }));
    return { byColor, total };
  })();

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
          <TabsTrigger value="encomendas">Encomendas</TabsTrigger>
          <TabsTrigger value="compras">Compras</TabsTrigger>
          <TabsTrigger value="vendas">Vendas</TabsTrigger>
        </TabsList>

        <TabsContent value="encomendas" className="space-y-4 animate-in fade-in-50">
          <EncomendasTab onDataChange={fetchData} />
        </TabsContent>

        <TabsContent value="resumo" className="space-y-6 animate-in fade-in-50">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Em Estoque</p>
                    <p className="text-xl font-bold">{totalStock}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                    <ShoppingCart className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Compras</p>
                    <p className="text-xl font-bold">R$ {totalPurchased.toFixed(2).replace('.', ',')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Vendas</p>
                    <p className="text-xl font-bold">R$ {totalSold.toFixed(2).replace('.', ',')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-lg ${profit >= 0 ? 'bg-success/10' : 'bg-destructive/10'} flex items-center justify-center`}>
                    <Shirt className={`h-5 w-5 ${profit >= 0 ? 'text-success' : 'text-destructive'}`} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Resultado</p>
                    <p className={`text-xl font-bold ${profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                      R$ {profit.toFixed(2).replace('.', ',')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Estoque por tamanho */}
          <Card>
            <CardHeader>
              <CardTitle>Estoque por Tamanho</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
                {inventory.map(item => (
                  <div key={item.id} className="text-center p-4 rounded-lg bg-muted/50">
                    <p className="text-lg font-bold">{item.size}</p>
                    <p className={`text-2xl font-bold ${item.quantity > 0 ? 'text-success' : 'text-muted-foreground'}`}>
                      {item.quantity}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Custo médio: R$ {item.average_cost.toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
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
                        <TableCell>R$ {p.total_cost.toFixed(2).replace('.', ',')}</TableCell>
                        <TableCell>R$ {(p.unit_cost || 0).toFixed(2).replace('.', ',')}</TableCell>
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
                        <TableCell>R$ {(s.total_price || 0).toFixed(2).replace('.', ',')}</TableCell>
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
