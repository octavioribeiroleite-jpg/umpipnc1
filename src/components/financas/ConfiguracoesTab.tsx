import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Settings, Save, Users, CalendarDays, AlertTriangle, Trash2, History } from 'lucide-react';

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
const ANNUAL_CHARGE_TYPE = 'annual_contribution';

interface LaunchGroup {
  year: string;
  competences: string[];
  totalCharges: number;
  paidCharges: number;
  partialCharges: number;
  pendingCharges: number;
}

const formatCurrency = (value: number) => `R$ ${Number(value || 0).toFixed(2).replace('.', ',')}`;

export function ConfiguracoesTab() {
  const { effectiveSocietyId: societyId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [chargeYear, setChargeYear] = useState(currentYear.toString());
  const [formData, setFormData] = useState({
    monthly_fee: '',
    per_capita: '',
    due_day: '10',
    notes: ''
  });
  const [existingSettings, setExistingSettings] = useState<any>(null);
  const [activeMembers, setActiveMembers] = useState(0);
  const [launches, setLaunches] = useState<LaunchGroup[]>([]);
  const [loadingLaunches, setLoadingLaunches] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<LaunchGroup | null>(null);
  const [deleting, setDeleting] = useState(false);

  const contributionAmount = parseFloat(formData.monthly_fee) || 0;
  const perCapitaAmount = parseFloat(formData.per_capita) || 0;
  const annualTotal = contributionAmount + perCapitaAmount;

  useEffect(() => {
    if (societyId) {
      fetchSettings();
      fetchActiveMembers();
      fetchLaunches();
    }
  }, [societyId]);

  const fetchSettings = async () => {
    const { data } = await supabase
      .from('financial_settings')
      .select('*')
      .eq('competence', 'geral')
      .eq('society_id', societyId!)
      .maybeSingle();

    if (data) {
      setExistingSettings(data);
      setFormData({
        monthly_fee: data.monthly_fee.toString(),
        per_capita: data.per_capita.toString(),
        due_day: data.due_day.toString(),
        notes: data.notes || ''
      });
    } else {
      setExistingSettings(null);
      setFormData({ monthly_fee: '', per_capita: '', due_day: '10', notes: '' });
    }
  };

  const fetchActiveMembers = async () => {
    const { count } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('active', true)
      .eq('society_id', societyId!);
    setActiveMembers(count || 0);
  };

  const fetchLaunches = async () => {
    setLoadingLaunches(true);
    const { data: charges } = await supabase
      .from('charges')
      .select('competence, status, amount, paid_amount')
      .eq('type', ANNUAL_CHARGE_TYPE)
      .eq('society_id', societyId!);

    if (charges && charges.length > 0) {
      const yearMap: Record<string, { competences: Set<string>; total: number; paid: number; partial: number; pending: number }> = {};
      
      for (const c of charges) {
        const year = c.competence;
        const paidAmount = Number(c.paid_amount || 0);
        const amount = Number(c.amount || 0);
        const isPaid = c.status === 'pago' && paidAmount >= amount;
        const isPartial = c.status === 'pago' && paidAmount > 0 && paidAmount < amount;

        if (!yearMap[year]) {
          yearMap[year] = { competences: new Set(), total: 0, paid: 0, partial: 0, pending: 0 };
        }
        yearMap[year].competences.add(c.competence);
        yearMap[year].total++;
        if (isPaid) yearMap[year].paid++;
        else if (isPartial) yearMap[year].partial++;
        else if (c.status === 'pendente') yearMap[year].pending++;
      }

      const groups: LaunchGroup[] = Object.entries(yearMap)
        .map(([year, data]) => ({
          year,
          competences: Array.from(data.competences),
          totalCharges: data.total,
          paidCharges: data.paid,
          partialCharges: data.partial,
          pendingCharges: data.pending,
        }))
        .sort((a, b) => parseInt(b.year) - parseInt(a.year));

      setLaunches(groups);
    } else {
      setLaunches([]);
    }
    setLoadingLaunches(false);
  };

  const handleSave = async () => {
    if (!societyId) {
      toast.error('Sessão inválida. Faça login novamente.');
      return;
    }
    if (annualTotal <= 0) {
      toast.error('Informe a contribuição anual ou a per capita anual');
      return;
    }

    setLoading(true);
    try {
      const dueDay = Math.min(parseInt(formData.due_day) || 10, 28);
      const payload = {
        competence: 'geral',
        monthly_fee: contributionAmount,
        per_capita: perCapitaAmount,
        due_day: dueDay,
        notes: formData.notes,
        society_id: societyId,
      };

      if (existingSettings) {
        const { error } = await supabase
          .from('financial_settings')
          .update(payload)
          .eq('id', existingSettings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('financial_settings')
          .insert(payload);
        if (error) throw error;
      }

      const { data: pendingAnnualCharges } = await supabase
        .from('charges')
        .select('id, due_date')
        .eq('society_id', societyId)
        .eq('type', ANNUAL_CHARGE_TYPE)
        .eq('status', 'pendente');

      let updatedCount = 0;
      if (pendingAnnualCharges && pendingAnnualCharges.length > 0) {
        for (const charge of pendingAnnualCharges) {
          const oldDate = new Date(`${charge.due_date}T12:00:00`);
          const newDueDate = `${oldDate.getFullYear()}-${String(oldDate.getMonth() + 1).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`;
          await supabase
            .from('charges')
            .update({
              amount: annualTotal,
              due_date: newDueDate,
              notes: `Contribuição: ${formatCurrency(contributionAmount)} | Per capita: ${formatCurrency(perCapitaAmount)}`,
            })
            .eq('id', charge.id);
        }
        updatedCount = pendingAnnualCharges.length;
      }

      const msg = updatedCount > 0
        ? `Configurações salvas! ${updatedCount} cobrança(s) anual(is) pendente(s) atualizada(s).`
        : 'Configurações salvas!';
      toast.success(msg);
      fetchSettings();
      fetchLaunches();
    } catch (error: any) {
      toast.error('Erro ao salvar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCharges = async () => {
    if (!societyId) {
      toast.error('Sessão inválida. Faça login novamente.');
      return;
    }
    if (!existingSettings) {
      toast.error('Salve as configurações primeiro');
      return;
    }

    const contribution = Number(existingSettings.monthly_fee || 0);
    const perCapita = Number(existingSettings.per_capita || 0);
    const totalAnnual = contribution + perCapita;
    if (totalAnnual <= 0) {
      toast.error('Configure um valor anual antes de lançar');
      return;
    }

    setGenerating(true);
    try {
      const year = parseInt(chargeYear);
      const dueDay = Math.min(existingSettings.due_day, 28);

      const { data: members, error: membersError } = await supabase
        .from('members')
        .select('id')
        .eq('active', true)
        .eq('society_id', societyId);

      if (membersError) throw membersError;
      if (!members || members.length === 0) {
        toast.error('Nenhum membro ativo encontrado');
        setGenerating(false);
        return;
      }

      const { data: existingCharges } = await supabase
        .from('charges')
        .select('member_id')
        .eq('competence', chargeYear)
        .eq('type', ANNUAL_CHARGE_TYPE)
        .eq('society_id', societyId);

      const existingSet = new Set((existingCharges || []).map(c => c.member_id));
      const dueDate = new Date(year, 0, dueDay).toISOString().split('T')[0];
      const compositionNote = `Contribuição: ${formatCurrency(contribution)} | Per capita: ${formatCurrency(perCapita)}`;

      const newCharges = members
        .filter(member => !existingSet.has(member.id))
        .map(member => ({
          member_id: member.id,
          competence: chargeYear,
          type: ANNUAL_CHARGE_TYPE,
          amount: totalAnnual,
          due_date: dueDate,
          status: 'pendente',
          notes: compositionNote,
          society_id: societyId,
        }));

      if (newCharges.length === 0) {
        toast.info('Todas as cobranças anuais já foram geradas para este ano');
        setGenerating(false);
        return;
      }

      for (let i = 0; i < newCharges.length; i += 500) {
        const batch = newCharges.slice(i, i + 500);
        const { error } = await supabase.from('charges').insert(batch);
        if (error) throw error;
      }

      toast.success(`${newCharges.length} cobrança(s) anual(is) gerada(s) para ${chargeYear}!`);
      fetchLaunches();
    } catch (error: any) {
      toast.error('Erro ao gerar cobranças: ' + error.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteLaunch = async () => {
    if (!deleteConfirm || !societyId) return;
    setDeleting(true);
    try {
      await supabase
        .from('charges')
        .delete()
        .eq('competence', deleteConfirm.year)
        .eq('type', ANNUAL_CHARGE_TYPE)
        .eq('society_id', societyId)
        .eq('status', 'pendente');

      toast.success(`Cobranças anuais pendentes de ${deleteConfirm.year} excluídas!`);
      setDeleteConfirm(null);
      fetchLaunches();
    } catch (error: any) {
      toast.error('Erro ao excluir: ' + error.message);
    } finally {
      setDeleting(false);
    }
  };

  if (!societyId) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Sessão inválida ou sociedade não selecionada. Faça login novamente pela tela inicial.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Valores da Contribuição Anual
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Contribuição anual do sócio (R$)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="72,00"
                value={formData.monthly_fee}
                onChange={(e) => setFormData({ ...formData, monthly_fee: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Per capita anual (R$)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="30,00"
                value={formData.per_capita}
                onChange={(e) => setFormData({ ...formData, per_capita: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Dia do Vencimento</Label>
              <Input
                type="number"
                min="1"
                max="28"
                value={formData.due_day}
                onChange={(e) => setFormData({ ...formData, due_day: e.target.value })}
              />
            </div>
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-sm font-semibold text-foreground">Total anual por sócio</p>
            <p className="mt-1 text-3xl font-bold text-primary">{formatCurrency(annualTotal)}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Composição: contribuição {formatCurrency(contributionAmount)} + per capita {formatCurrency(perCapitaAmount)}.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              placeholder="Observações gerais..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <Button onClick={handleSave} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Salvando...' : 'Salvar Configurações'}
          </Button>

          {existingSettings && (
            <p className="text-sm text-muted-foreground">
              Última atualização: {new Date(existingSettings.updated_at).toLocaleString('pt-BR')}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Lançamento Anual
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Gera uma cobrança anual única por membro ativo. A cobrança mostra o total e a composição da contribuição do sócio mais a per capita.
          </p>
          <div className="flex items-end gap-4">
            <div className="space-y-2">
              <Label>Ano</Label>
              <Select value={chargeYear} onValueChange={setChargeYear}>
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
            <Button
              variant="secondary"
              onClick={handleGenerateCharges}
              disabled={generating || !existingSettings}
            >
              <Users className="h-4 w-4 mr-2" />
              {generating ? 'Gerando...' : `Lançar ${chargeYear} (${activeMembers} membros)`}
            </Button>
          </div>

          {!existingSettings && (
            <p className="text-sm text-destructive">
              Salve os valores de cobrança acima antes de gerar.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Lançamentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingLaunches ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : launches.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum lançamento anual encontrado.</p>
          ) : (
            <div className="space-y-3">
              {launches.map(launch => (
                <div
                  key={launch.year}
                  className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">{launch.year}</span>
                      <Badge variant="outline" className="text-xs">cobrança anual</Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs flex-wrap">
                      <span className="text-muted-foreground">{launch.totalCharges} cobranças</span>
                      <span className="text-green-600 dark:text-green-400">{launch.paidCharges} pagas</span>
                      <span className="text-yellow-600 dark:text-yellow-400">{launch.partialCharges} parciais</span>
                      <span className="text-destructive">{launch.pendingCharges} pendentes</span>
                    </div>
                  </div>
                  {launch.pendingCharges > 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive shrink-0"
                      onClick={() => setDeleteConfirm(launch)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cobranças anuais pendentes?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso vai excluir todas as {deleteConfirm?.pendingCharges} cobranças <strong>pendentes</strong> de {deleteConfirm?.year}.
              Cobranças já pagas ou parciais não serão afetadas. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteLaunch}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Excluindo...' : 'Excluir Pendentes'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
