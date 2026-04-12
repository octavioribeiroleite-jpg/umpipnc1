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

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

interface LaunchGroup {
  year: string;
  competences: string[];
  totalCharges: number;
  paidCharges: number;
  pendingCharges: number;
}

export function ConfiguracoesTab() {
  const { profile, isAdmin, isPastor, selectedSocietyId } = useAuth();
  const societyId = (!isAdmin && !isPastor) ? profile?.society_id : selectedSocietyId;
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
      .select('competence, status')
      .eq('society_id', societyId!);

    if (charges && charges.length > 0) {
      // Group by year extracted from competence "Mês/Ano"
      const yearMap: Record<string, { competences: Set<string>; total: number; paid: number; pending: number }> = {};
      
      for (const c of charges) {
        const parts = c.competence.split('/');
        const year = parts[1] || parts[0];
        if (!yearMap[year]) {
          yearMap[year] = { competences: new Set(), total: 0, paid: 0, pending: 0 };
        }
        yearMap[year].competences.add(c.competence);
        yearMap[year].total++;
        if (c.status === 'pago') yearMap[year].paid++;
        else if (c.status === 'pendente') yearMap[year].pending++;
      }

      const groups: LaunchGroup[] = Object.entries(yearMap)
        .map(([year, data]) => ({
          year,
          competences: Array.from(data.competences).sort((a, b) => {
            const mA = MONTHS.indexOf(a.split('/')[0]);
            const mB = MONTHS.indexOf(b.split('/')[0]);
            return mA - mB;
          }),
          totalCharges: data.total,
          paidCharges: data.paid,
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
    if (!formData.monthly_fee && !formData.per_capita) {
      toast.error('Informe pelo menos um valor (mensalidade ou per capita)');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        competence: 'geral',
        monthly_fee: parseFloat(formData.monthly_fee) || 0,
        per_capita: parseFloat(formData.per_capita) || 0,
        due_day: Math.min(parseInt(formData.due_day) || 10, 28),
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

      // Update pending charges with new values
      const monthlyFee = parseFloat(formData.monthly_fee) || 0;
      const perCapita = parseFloat(formData.per_capita) || 0;
      const dueDay = Math.min(parseInt(formData.due_day) || 10, 28);
      let updatedCount = 0;

      if (monthlyFee > 0) {
        const { data: pendingMensalidades } = await supabase
          .from('charges')
          .select('id, due_date')
          .eq('society_id', societyId)
          .eq('type', 'mensalidade')
          .eq('status', 'pendente');

        if (pendingMensalidades && pendingMensalidades.length > 0) {
          for (const charge of pendingMensalidades) {
            const oldDate = new Date(charge.due_date);
            const newDueDate = `${oldDate.getFullYear()}-${String(oldDate.getMonth() + 1).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`;
            await supabase
              .from('charges')
              .update({ amount: monthlyFee / 12, due_date: newDueDate })
              .eq('id', charge.id);
          }
          updatedCount += pendingMensalidades.length;
        }
      }

      if (perCapita > 0) {
        const { data: pendingPercapita } = await supabase
          .from('charges')
          .select('id, due_date')
          .eq('society_id', societyId)
          .eq('type', 'percapita')
          .eq('status', 'pendente');

        if (pendingPercapita && pendingPercapita.length > 0) {
          for (const charge of pendingPercapita) {
            const oldDate = new Date(charge.due_date);
            const newDueDate = `${oldDate.getFullYear()}-${String(oldDate.getMonth() + 1).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`;
            await supabase
              .from('charges')
              .update({ amount: perCapita, due_date: newDueDate })
              .eq('id', charge.id);
          }
          updatedCount += pendingPercapita.length;
        }
      }

      const msg = updatedCount > 0
        ? `Configurações salvas! ${updatedCount} cobrança(s) pendente(s) atualizada(s).`
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

      // Get all existing charges for this year
      const yearCompetences = MONTHS.map(m => `${m}/${chargeYear}`);
      const { data: existingCharges } = await supabase
        .from('charges')
        .select('member_id, type, competence')
        .in('competence', yearCompetences)
        .eq('society_id', societyId);

      const existingMap = new Set(
        (existingCharges || []).map(c => `${c.competence}-${c.member_id}-${c.type}`)
      );

      const newCharges: any[] = [];
      const monthlyAmount = existingSettings.monthly_fee > 0 ? existingSettings.monthly_fee : 0;

      for (let monthIdx = 0; monthIdx < 12; monthIdx++) {
        const competence = `${MONTHS[monthIdx]}/${chargeYear}`;
        const dueDate = new Date(year, monthIdx, dueDay).toISOString().split('T')[0];

        for (const member of members) {
          if (monthlyAmount > 0 && !existingMap.has(`${competence}-${member.id}-mensalidade`)) {
            newCharges.push({
              member_id: member.id,
              competence,
              type: 'mensalidade',
              amount: Math.round(monthlyAmount * 100) / 100,
              due_date: dueDate,
              status: 'pendente',
              society_id: societyId,
            });
          }
          if (existingSettings.per_capita > 0 && !existingMap.has(`${competence}-${member.id}-percapita`)) {
            newCharges.push({
              member_id: member.id,
              competence,
              type: 'percapita',
              amount: existingSettings.per_capita,
              due_date: dueDate,
              status: 'pendente',
              society_id: societyId,
            });
          }
        }
      }

      if (newCharges.length === 0) {
        toast.info('Todas as cobranças já foram geradas para este ano');
        setGenerating(false);
        return;
      }

      // Insert in batches of 500
      for (let i = 0; i < newCharges.length; i += 500) {
        const batch = newCharges.slice(i, i + 500);
        const { error } = await supabase.from('charges').insert(batch);
        if (error) throw error;
      }

      toast.success(`${newCharges.length} cobranças geradas para ${chargeYear}!`);
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
      // Delete all charges for this year that are still pending
      for (const comp of deleteConfirm.competences) {
        await supabase
          .from('charges')
          .delete()
          .eq('competence', comp)
          .eq('society_id', societyId)
          .eq('status', 'pendente');
      }

      toast.success(`Cobranças pendentes de ${deleteConfirm.year} excluídas!`);
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
      {/* Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Valores de Cobrança
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Mensalidade Anual (R$)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={formData.monthly_fee}
                onChange={(e) => setFormData({ ...formData, monthly_fee: e.target.value })}
              />
              {formData.monthly_fee && parseFloat(formData.monthly_fee) > 0 && (
                <p className="text-xs text-muted-foreground">
                  Mensal: R$ {(parseFloat(formData.monthly_fee) / 12).toFixed(2).replace('.', ',')}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Per Capita Mensal (R$)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0,00"
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

      {/* Generate Annual Charges */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Lançamento Anual
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Gera cobranças de mensalidade e per capita para todos os 12 meses do ano selecionado, para todos os membros ativos.
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

      {/* Launch History */}
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
            <p className="text-sm text-muted-foreground">Nenhum lançamento encontrado.</p>
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
                      <Badge variant="outline" className="text-xs">
                        {launch.competences.length} {launch.competences.length === 1 ? 'mês' : 'meses'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs">
                      <span className="text-muted-foreground">{launch.totalCharges} cobranças</span>
                      <span className="text-green-600 dark:text-green-400">{launch.paidCharges} pagos</span>
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

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cobranças pendentes?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso vai excluir todas as {deleteConfirm?.pendingCharges} cobranças <strong>pendentes</strong> de {deleteConfirm?.year}.
              Cobranças já pagas não serão afetadas. Esta ação não pode ser desfeita.
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
