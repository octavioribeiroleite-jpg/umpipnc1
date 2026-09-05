import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  History,
  Layers3,
  Loader2,
  MoreVertical,
  PackagePlus,
  Pencil,
  Plus,
  ShoppingBag,
  Trash2,
} from 'lucide-react';

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

interface ShirtCampaignLot {
  id: string;
  campaign_id: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  supplier: string | null;
  purchase_date: string;
  notes: string | null;
  created_at: string;
}

export const brl = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));

const toLocalDate = (value: string) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
  }
  return new Date(value).toLocaleDateString('pt-BR');
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
  const [lotsByCampaign, setLotsByCampaign] = useState<Record<string, ShirtCampaignLot[]>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [lotDialogCampaign, setLotDialogCampaign] = useState<ShirtCampaign | null>(null);
  const [historyCampaign, setHistoryCampaign] = useState<ShirtCampaign | null>(null);
  const [editCampaign, setEditCampaign] = useState<ShirtCampaign | null>(null);

  const [form, setForm] = useState({
    name: '',
    purchasedQuantity: '',
    unitCost: '',
    defaultSalePrice: '',
    supplier: '',
    purchaseDate: new Date().toISOString().slice(0, 10),
  });

  const [lotForm, setLotForm] = useState({
    quantity: '',
    unitCost: '',
    supplier: '',
    purchaseDate: new Date().toISOString().slice(0, 10),
    notes: '',
  });

  const [editForm, setEditForm] = useState({
    name: '',
    defaultSalePrice: '',
    supplier: '',
    additionalQuantity: '',
    additionalUnitCost: '',
    purchaseDate: new Date().toISOString().slice(0, 10),
    notes: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    let campaignQuery = supabase.from('shirt_campaigns').select('*').order('purchase_date', { ascending: false });
    let orderQuery = supabase.from('shirt_orders').select('campaign_id, quantity');
    let lotQuery = (supabase as any).from('shirt_campaign_lots').select('*').order('purchase_date', { ascending: true });

    if (societyId) {
      campaignQuery = campaignQuery.eq('society_id', societyId);
      orderQuery = orderQuery.eq('society_id', societyId);
      lotQuery = lotQuery.eq('society_id', societyId);
    }

    const [{ data: campaignData }, { data: orderData }, { data: lotData }] = await Promise.all([
      campaignQuery,
      orderQuery,
      lotQuery,
    ]);

    setCampaigns((campaignData || []) as ShirtCampaign[]);

    const orderMap: Record<string, number> = {};
    (orderData || []).forEach((order: { campaign_id: string | null; quantity: number }) => {
      if (order.campaign_id) {
        orderMap[order.campaign_id] = (orderMap[order.campaign_id] || 0) + Number(order.quantity || 0);
      }
    });
    setOrderedByCampaign(orderMap);

    const lotMap: Record<string, ShirtCampaignLot[]> = {};
    ((lotData || []) as ShirtCampaignLot[]).forEach((lot) => {
      lotMap[lot.campaign_id] = [...(lotMap[lot.campaign_id] || []), lot];
    });
    setLotsByCampaign(lotMap);
    setLoading(false);
  }, [societyId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const resetForm = () => setForm({
    name: '',
    purchasedQuantity: '',
    unitCost: '',
    defaultSalePrice: '',
    supplier: '',
    purchaseDate: new Date().toISOString().slice(0, 10),
  });

  const resetLotForm = (campaign?: ShirtCampaign | null) => setLotForm({
    quantity: '',
    unitCost: campaign ? String(campaign.unit_cost || '') : '',
    supplier: campaign?.supplier || '',
    purchaseDate: new Date().toISOString().slice(0, 10),
    notes: '',
  });

  const openEditCampaign = (campaign: ShirtCampaign) => {
    setEditCampaign(campaign);
    setEditForm({
      name: campaign.name,
      defaultSalePrice: String(campaign.default_sale_price || ''),
      supplier: campaign.supplier || '',
      additionalQuantity: '',
      additionalUnitCost: String(campaign.unit_cost || ''),
      purchaseDate: new Date().toISOString().slice(0, 10),
      notes: '',
    });
  };

  const totalCostPreview = (parseFloat(form.purchasedQuantity) || 0) * (parseFloat(form.unitCost) || 0);
  const lotTotalPreview = (parseFloat(lotForm.quantity) || 0) * (parseFloat(lotForm.unitCost) || 0);
  const editAdditionalCost = (parseFloat(editForm.additionalQuantity) || 0) * (parseFloat(editForm.additionalUnitCost) || 0);

  const handleCreate = async () => {
    if (!form.name.trim()) return void toast.error('Informe o nome da campanha');
    if ((parseInt(form.purchasedQuantity) || 0) <= 0) return void toast.error('Informe a quantidade comprada');
    if (!societyId) return void toast.error('Selecione uma sociedade');

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
      await fetchData();
      onDataChange?.();
    } catch (error) {
      toast.error('Erro ao criar campanha: ' + (error as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditCampaign = async () => {
    if (!editCampaign) return;
    const additionalQuantity = Number(editForm.additionalQuantity || 0);
    const additionalUnitCost = Number(editForm.additionalUnitCost || 0);

    if (!editForm.name.trim()) return void toast.error('Informe o nome da campanha');
    if (Number(editForm.defaultSalePrice || 0) < 0) return void toast.error('Informe um preço válido');
    if (additionalQuantity < 0) return void toast.error('A quantidade adicional não pode ser negativa');
    if (additionalQuantity > 0 && additionalUnitCost < 0) return void toast.error('Informe um custo unitário válido');

    setSubmitting(true);
    try {
      const { error } = await (supabase as any).rpc('update_shirt_campaign_with_optional_lot', {
        p_campaign_id: editCampaign.id,
        p_name: editForm.name.trim(),
        p_default_sale_price: Number(editForm.defaultSalePrice) || 0,
        p_supplier: editForm.supplier || null,
        p_additional_quantity: additionalQuantity,
        p_additional_unit_cost: additionalUnitCost,
        p_purchase_date: editForm.purchaseDate,
        p_notes: editForm.notes || null,
      });
      if (error) throw error;

      toast.success(additionalQuantity > 0
        ? `Campanha atualizada e ${additionalQuantity} camisas adicionadas.`
        : 'Campanha atualizada.');
      setEditCampaign(null);
      await fetchData();
      onDataChange?.();
    } catch (error) {
      toast.error('Erro ao editar campanha: ' + (error as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddLot = async () => {
    if (!lotDialogCampaign) return;
    const quantity = Number(lotForm.quantity || 0);
    const unitCost = Number(lotForm.unitCost || 0);

    if (quantity <= 0) return void toast.error('Informe a quantidade do novo lote');
    if (unitCost < 0) return void toast.error('Informe um custo unitário válido');

    setSubmitting(true);
    try {
      const { error } = await (supabase as any).rpc('add_shirt_campaign_lot', {
        p_campaign_id: lotDialogCampaign.id,
        p_quantity: quantity,
        p_unit_cost: unitCost,
        p_supplier: lotForm.supplier || null,
        p_purchase_date: lotForm.purchaseDate,
        p_notes: lotForm.notes || null,
      });
      if (error) throw error;

      toast.success(`${quantity} camisas adicionadas ao lote total.`);
      setLotDialogCampaign(null);
      resetLotForm();
      await fetchData();
      onDataChange?.();
    } catch (error) {
      toast.error('Erro ao adicionar lote: ' + (error as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const requestDelete = (campaign: ShirtCampaign) => {
    const ordered = orderedByCampaign[campaign.id] || 0;
    if (ordered > 0) return void toast.error('Esta campanha possui encomendas vinculadas. Não é possível excluir.');
    if (campaign.transaction_id) return void toast.error('Esta campanha possui uma saída financeira vinculada. Não é possível excluir.');
    setDeleteId(campaign.id);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('shirt_campaigns').delete().eq('id', deleteId);
    if (error) return void toast.error('Erro ao excluir: ' + error.message);

    toast.success('Campanha excluída.');
    setDeleteId(null);
    await fetchData();
    onDataChange?.();
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold">Campanhas de camisas</h3>
          <p className="text-xs text-muted-foreground">Acompanhe os lotes cadastrados e suas encomendas.</p>
        </div>
        <Button size="sm" onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />Nova campanha
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Nenhuma campanha cadastrada. Crie uma campanha para começar o controle por lote.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {campaigns.map((campaign) => {
            const ordered = orderedByCampaign[campaign.id] || 0;
            const purchased = Number(campaign.purchased_quantity || 0);
            const available = Math.max(0, purchased - ordered);
            const selected = selectedCampaignId === campaign.id;
            const soldOut = available === 0 && purchased > 0;
            const progress = purchased > 0 ? Math.min(100, (ordered / purchased) * 100) : 0;
            const projectedProfit = (ordered * Number(campaign.default_sale_price || 0)) - Number(campaign.total_purchase_cost || 0);
            const lots = lotsByCampaign[campaign.id] || [];

            return (
              <Card key={campaign.id} className={`overflow-hidden ${selected ? 'border-primary/70 ring-1 ring-primary/20' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="min-w-0 whitespace-normal break-words text-base font-semibold">{campaign.name}</h4>
                        <Badge variant="secondary" className="font-medium">{soldOut ? 'Esgotada' : 'Ativa'}</Badge>
                        <Badge variant="outline" className="font-medium">
                          <Layers3 className="mr-1 h-3 w-3" />{lots.length || 1} lote{(lots.length || 1) !== 1 ? 's' : ''}
                        </Badge>
                        {selected && (
                          <Badge variant="outline" className="font-medium">
                            <CheckCircle2 className="mr-1 h-3 w-3" />Selecionada
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5" />{toLocalDate(campaign.purchase_date)}
                        </span>
                        {campaign.supplier && <span>{campaign.supplier}</span>}
                      </div>
                    </div>

                    <div className="relative shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setMenuOpenId(menuOpenId === campaign.id ? null : campaign.id)}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                      {menuOpenId === campaign.id && (
                        <div className="absolute right-0 top-9 z-20 w-48 rounded-md border bg-popover p-1 shadow-lg">
                          <button
                            className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm hover:bg-muted"
                            onClick={() => {
                              setMenuOpenId(null);
                              openEditCampaign(campaign);
                            }}
                          >
                            <Pencil className="h-4 w-4" />Editar campanha
                          </button>
                          <button
                            className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm hover:bg-muted"
                            onClick={() => {
                              setMenuOpenId(null);
                              resetLotForm(campaign);
                              setLotDialogCampaign(campaign);
                            }}
                          >
                            <PackagePlus className="h-4 w-4" />Adicionar novo lote
                          </button>
                          <button
                            className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm hover:bg-muted"
                            onClick={() => {
                              setMenuOpenId(null);
                              setHistoryCampaign(campaign);
                            }}
                          >
                            <History className="h-4 w-4" />Ver histórico de lotes
                          </button>
                          <button
                            className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm text-destructive hover:bg-muted"
                            onClick={() => {
                              setMenuOpenId(null);
                              requestDelete(campaign);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />Excluir campanha
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
                    <div><p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Compradas</p><p className="mt-0.5 text-lg font-semibold">{purchased}</p></div>
                    <div><p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Encomendadas</p><p className="mt-0.5 text-lg font-semibold">{ordered}</p></div>
                    <div><p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Disponíveis</p><p className="mt-0.5 text-lg font-semibold">{available}</p></div>
                    <div><p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Preço</p><p className="mt-0.5 text-lg font-semibold">{brl(campaign.default_sale_price)}</p></div>
                  </div>

                  <div className="mt-4">
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{ordered} de {purchased} encomendadas</span>
                      <span className="font-medium">{Math.round(progress)}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-2 border-t pt-3 text-sm sm:grid-cols-3">
                    <div className="flex items-center justify-between gap-2 sm:block"><span className="text-muted-foreground">Custo médio</span><p className="font-medium">{brl(campaign.unit_cost)}</p></div>
                    <div className="flex items-center justify-between gap-2 sm:block"><span className="text-muted-foreground">Custo total</span><p className="font-medium">{brl(campaign.total_purchase_cost)}</p></div>
                    <div className="flex items-center justify-between gap-2 sm:block"><span className="text-muted-foreground">Lucro previsto</span><p className={`font-medium ${projectedProfit >= 0 ? 'text-success' : 'text-destructive'}`}>{brl(projectedProfit)}</p></div>
                  </div>

                  <div className="mt-4 flex flex-wrap justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => openEditCampaign(campaign)}>
                      <Pencil className="mr-2 h-4 w-4" />Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        resetLotForm(campaign);
                        setLotDialogCampaign(campaign);
                      }}
                    >
                      <PackagePlus className="mr-2 h-4 w-4" />Adicionar lote
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => onSelectCampaign?.(campaign.id)}>
                      <ShoppingBag className="mr-2 h-4 w-4" />Ver encomendas<ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
          <DialogHeader><DialogTitle>Nova campanha de camisas</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nome da campanha</Label><Input placeholder="Ex.: Camisas UMP 2026" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Qtd. comprada</Label><Input type="number" min="1" placeholder="44" value={form.purchasedQuantity} onChange={(event) => setForm({ ...form, purchasedQuantity: event.target.value })} /></div>
              <div className="space-y-2"><Label>Custo unitário (R$)</Label><Input type="number" step="0.01" placeholder="55,00" value={form.unitCost} onChange={(event) => setForm({ ...form, unitCost: event.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Preço padrão venda (R$)</Label><Input type="number" step="0.01" placeholder="65,00" value={form.defaultSalePrice} onChange={(event) => setForm({ ...form, defaultSalePrice: event.target.value })} /></div>
              <div className="space-y-2"><Label>Data da compra</Label><Input type="date" value={form.purchaseDate} onChange={(event) => setForm({ ...form, purchaseDate: event.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Fornecedor</Label><Input placeholder="Opcional" value={form.supplier} onChange={(event) => setForm({ ...form, supplier: event.target.value })} /></div>
            <div className="rounded-md bg-muted/40 p-3 text-sm">Custo total: <strong>{brl(totalCostPreview)}</strong><p className="mt-1 text-xs text-muted-foreground">Será criada uma única saída financeira com este valor.</p></div>
            <Button className="w-full" onClick={handleCreate} disabled={submitting}>{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Criar campanha</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editCampaign)} onOpenChange={(open) => { if (!open) setEditCampaign(null); }}>
        <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
          <DialogHeader><DialogTitle>Editar campanha</DialogTitle></DialogHeader>
          {editCampaign && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome da campanha</Label>
                <Input value={editForm.name} onChange={(event) => setEditForm({ ...editForm, name: event.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Preço padrão (R$)</Label>
                  <Input type="number" min="0" step="0.01" value={editForm.defaultSalePrice} onChange={(event) => setEditForm({ ...editForm, defaultSalePrice: event.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Fornecedor</Label>
                  <Input placeholder="Opcional" value={editForm.supplier} onChange={(event) => setEditForm({ ...editForm, supplier: event.target.value })} />
                </div>
              </div>

              <div className="rounded-lg border p-3">
                <div className="mb-3">
                  <p className="text-sm font-semibold">Adicionar quantidade</p>
                  <p className="text-xs text-muted-foreground">Opcional. A quantidade será registrada como um novo lote e somada ao total.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Quantidade adicional</Label>
                    <Input type="number" min="0" placeholder="0" value={editForm.additionalQuantity} onChange={(event) => setEditForm({ ...editForm, additionalQuantity: event.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Custo unitário (R$)</Label>
                    <Input type="number" min="0" step="0.01" value={editForm.additionalUnitCost} onChange={(event) => setEditForm({ ...editForm, additionalUnitCost: event.target.value })} />
                  </div>
                </div>
                {Number(editForm.additionalQuantity || 0) > 0 && (
                  <div className="mt-3 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Data da compra</Label>
                        <Input type="date" value={editForm.purchaseDate} onChange={(event) => setEditForm({ ...editForm, purchaseDate: event.target.value })} />
                      </div>
                      <div className="rounded-md bg-muted/40 p-3 text-sm">
                        <p className="text-xs text-muted-foreground">Custo adicional</p>
                        <p className="font-semibold">{brl(editAdditionalCost)}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Novo total: {Number(editCampaign.purchased_quantity) + Number(editForm.additionalQuantity || 0)} camisas</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Observação do novo lote</Label>
                      <Textarea placeholder="Ex.: Reposição, segundo lote..." value={editForm.notes} onChange={(event) => setEditForm({ ...editForm, notes: event.target.value })} />
                    </div>
                  </div>
                )}
              </div>

              <Button className="w-full" onClick={handleEditCampaign} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar alterações
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(lotDialogCampaign)} onOpenChange={(open) => { if (!open) { setLotDialogCampaign(null); resetLotForm(); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Adicionar novo lote</DialogTitle></DialogHeader>
          {lotDialogCampaign && (
            <div className="space-y-4">
              <div className="rounded-md bg-muted/40 p-3 text-sm">
                <p className="font-semibold">{lotDialogCampaign.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">Atual: {lotDialogCampaign.purchased_quantity} compradas · {Math.max(0, lotDialogCampaign.purchased_quantity - (orderedByCampaign[lotDialogCampaign.id] || 0))} disponíveis</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Quantidade</Label><Input type="number" min="1" placeholder="12" value={lotForm.quantity} onChange={(event) => setLotForm({ ...lotForm, quantity: event.target.value })} /></div>
                <div className="space-y-2"><Label>Custo unitário (R$)</Label><Input type="number" min="0" step="0.01" value={lotForm.unitCost} onChange={(event) => setLotForm({ ...lotForm, unitCost: event.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Data da compra</Label><Input type="date" value={lotForm.purchaseDate} onChange={(event) => setLotForm({ ...lotForm, purchaseDate: event.target.value })} /></div>
                <div className="space-y-2"><Label>Fornecedor</Label><Input placeholder="Opcional" value={lotForm.supplier} onChange={(event) => setLotForm({ ...lotForm, supplier: event.target.value })} /></div>
              </div>
              <div className="space-y-2"><Label>Observação</Label><Textarea placeholder="Ex.: Segundo lote, reposição..." value={lotForm.notes} onChange={(event) => setLotForm({ ...lotForm, notes: event.target.value })} /></div>
              <div className="rounded-md bg-muted/40 p-3 text-sm">
                <div className="flex justify-between"><span>Custo deste lote</span><strong>{brl(lotTotalPreview)}</strong></div>
                <div className="mt-1 flex justify-between text-xs text-muted-foreground"><span>Total após adicionar</span><span>{Number(lotDialogCampaign.purchased_quantity) + Number(lotForm.quantity || 0)} camisas</span></div>
              </div>
              <Button className="w-full" onClick={handleAddLot} disabled={submitting}>{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Adicionar lote</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(historyCampaign)} onOpenChange={(open) => { if (!open) setHistoryCampaign(null); }}>
        <DialogContent className="max-h-[80vh] max-w-lg overflow-y-auto">
          <DialogHeader><DialogTitle>Histórico de lotes</DialogTitle></DialogHeader>
          {historyCampaign && (
            <div className="space-y-3">
              <div className="rounded-md bg-muted/40 p-3 text-sm">
                <p className="font-semibold">{historyCampaign.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{historyCampaign.purchased_quantity} camisas no total · {brl(historyCampaign.total_purchase_cost)} investidos</p>
              </div>
              {(lotsByCampaign[historyCampaign.id] || []).map((lot, index) => (
                <div key={lot.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="font-semibold">{index + 1}º lote</p><p className="text-xs text-muted-foreground">{toLocalDate(lot.purchase_date)}{lot.supplier ? ` · ${lot.supplier}` : ''}</p></div>
                    <Badge variant="secondary">{lot.quantity} camisas</Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">Custo unitário</span><p className="font-medium">{brl(lot.unit_cost)}</p></div>
                    <div><span className="text-muted-foreground">Custo do lote</span><p className="font-medium">{brl(lot.total_cost)}</p></div>
                  </div>
                  {lot.notes && <p className="mt-2 text-xs text-muted-foreground">{lot.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteId)} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Excluir campanha</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Tem certeza? Esta ação não pode ser desfeita.</p>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button><Button variant="destructive" onClick={confirmDelete}>Excluir</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
