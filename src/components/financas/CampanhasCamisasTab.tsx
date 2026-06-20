import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Loader2, Trash2, CheckCircle2 } from 'lucide-react';

export interface ShirtCampaign {
  id: string;
  name: string;
  purchased_quantity: number;
  unit_cost: number;
  total_purchase_cost: number;
  default_sale_price: number;
  supplier: string | null;
  purchase_date: string;
  transaction_id: string | null;
  society_id: string;
}

export const brl = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));

const toLocalDate = (d: string) => {
  const date = new Date(d);
  // purchase_date is a DATE (YYYY-MM-DD); avoid UTC off-by-one
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [y, m, day] = d.split('-').map(Number);
    return new Date(y, m - 1, day).toLocaleDateString('pt-BR');
  }
  return date.toLocaleDateString('pt-BR');
};

interface Props {
  selectedCampaignId?: string | null;
  onSelectCampaign?: (id: string) => void;
  onDataChange?: () => void;
}

export function CampanhasCamisasTab({ selectedCampaignId, onSelectCampaign, onDataChange }: Props) {
  const { effectiveSocietyId: societyId } = useAuth();
  const [campaigns, setCampaigns] = useState<ShirtCampaign[]>([]);
  const [orderedByCampaign, setOrderedByCampaign] = useState<Record<string, number>>({});
  const [hasPayments, setHasPayments] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    purchasedQuantity: '',
    unitCost: '',
    defaultSalePrice: '',
    supplier: '',
    purchaseDate: new Date().toISOString().slice(0, 10),
  });

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    let cQuery = supabase.from('shirt_campaigns').select('*').order('purchase_date', { ascending: false });
    if (societyId) cQuery = cQuery.eq('society_id', societyId);
    const { data: camps } = await cQuery;
    setCampaigns((camps || []) as ShirtCampaign[]);

    let oQuery = supabase.from('shirt_orders').select('campaign_id, quantity');
    if (societyId) oQuery = oQuery.eq('society_id', societyId);
    const { data: orders } = await oQuery;
    const map: Record<string, number> = {};
    (orders || []).forEach((o: { campaign_id: string | null; quantity: number }) => {
      if (o.campaign_id) map[o.campaign_id] = (map[o.campaign_id] || 0) + Number(o.quantity || 0);
    });
    setOrderedByCampaign(map);
    setLoading(false);
  }, [societyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetForm = () => setForm({
    name: '', purchasedQuantity: '', unitCost: '', defaultSalePrice: '', supplier: '',
    purchaseDate: new Date().toISOString().slice(0, 10),
  });

  const totalCostPreview = (parseFloat(form.purchasedQuantity) || 0) * (parseFloat(form.unitCost) || 0);

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error('Informe o nome da campanha'); return; }
    if ((parseInt(form.purchasedQuantity) || 0) <= 0) { toast.error('Informe a quantidade comprada'); return; }
    if (!societyId) { toast.error('Selecione uma sociedade'); return; }
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc('create_shirt_campaign', {
        p_name: form.name.trim(),
        p_purchased_quantity: Number(form.purchasedQuantity),
        p_unit_cost: Number(form.unitCost) || 0,
        p_default_sale_price: Number(form.defaultSalePrice) || 0,
        p_supplier: form.supplier || null,
        p_purchase_date: form.purchaseDate,
        p_society_id: societyId,
      });
      if (error) throw error;
      toast.success('Campanha criada! Saída financeira registrada.');
      setDialogOpen(false);
      resetForm();
      fetchData();
      onDataChange?.();
    } catch (e) {
      toast.error('Erro ao criar campanha: ' + (e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const requestDelete = async (c: ShirtCampaign) => {
    const ordered = orderedByCampaign[c.id] || 0;
    if (ordered > 0) {
      toast.error('Esta campanha possui encomendas vinculadas. Não é possível excluir.');
      return;
    }
    if (c.transaction_id) {
      toast.error('Esta campanha possui uma saída financeira vinculada. Não é possível excluir.');
      return;
    }
    setDeleteId(c.id);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('shirt_campaigns').delete().eq('id', deleteId);
    if (error) { toast.error('Erro ao excluir: ' + error.message); return; }
    toast.success('Campanha excluída.');
    setDeleteId(null);
    fetchData();
    onDataChange?.();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Nova Campanha
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">
          Nenhuma campanha cadastrada. Crie uma campanha para começar o controle por lote.
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {campaigns.map(c => {
            const ordered = orderedByCampaign[c.id] || 0;
            const available = Math.max(0, c.purchased_quantity - ordered);
            const selected = selectedCampaignId === c.id;
            return (
              <Card
                key={c.id}
                className={`cursor-pointer transition-colors ${selected ? 'border-primary ring-1 ring-primary' : 'hover:bg-muted/40'}`}
                onClick={() => onSelectCampaign?.(c.id)}
              >
                <CardContent className="pt-4 pb-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold flex items-center gap-1.5">
                        {selected && <CheckCircle2 className="h-4 w-4 text-primary" />}
                        {c.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {toLocalDate(c.purchase_date)}{c.supplier ? ` · ${c.supplier}` : ''}
                      </p>
                    </div>
                    <Button
                      variant="ghost" size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                      onClick={(e) => { e.stopPropagation(); requestDelete(c); }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">Comprado: </span><strong>{c.purchased_quantity}</strong></div>
                    <div><span className="text-muted-foreground">Disponível: </span><strong>{available}</strong></div>
                    <div><span className="text-muted-foreground">Custo unit.: </span>{brl(c.unit_cost)}</div>
                    <div><span className="text-muted-foreground">Custo total: </span>{brl(c.total_purchase_cost)}</div>
                    <div><span className="text-muted-foreground">Preço padrão: </span>{brl(c.default_sale_price)}</div>
                    <div><span className="text-muted-foreground">Encomendado: </span><strong>{ordered}</strong></div>
                  </div>
                  {selected && <Badge variant="secondary" className="text-xs">Selecionada para encomendas</Badge>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Campanha de Camisas</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da campanha</Label>
              <Input placeholder="Ex.: Camisas UMP 2026" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Qtd. comprada</Label>
                <Input type="number" min="1" placeholder="44" value={form.purchasedQuantity}
                  onChange={(e) => setForm({ ...form, purchasedQuantity: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Custo unitário (R$)</Label>
                <Input type="number" step="0.01" placeholder="55,00" value={form.unitCost}
                  onChange={(e) => setForm({ ...form, unitCost: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Preço padrão venda (R$)</Label>
                <Input type="number" step="0.01" placeholder="65,00" value={form.defaultSalePrice}
                  onChange={(e) => setForm({ ...form, defaultSalePrice: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Data da compra</Label>
                <Input type="date" value={form.purchaseDate}
                  onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Fornecedor</Label>
              <Input placeholder="Opcional" value={form.supplier}
                onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
            </div>
            <div className="rounded-md bg-muted/40 p-3 text-sm">
              Custo total: <strong>{brl(totalCostPreview)}</strong>
              <p className="text-xs text-muted-foreground mt-1">Será criada uma única saída financeira com este valor.</p>
            </div>
            <Button className="w-full" onClick={handleCreate} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Criar Campanha
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(v) => { if (!v) setDeleteId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Excluir campanha</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza? Esta ação não pode ser desfeita.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDelete}>Excluir</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
