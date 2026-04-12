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
import { toast } from 'sonner';
import { Settings, Save, Users, CalendarDays, AlertTriangle } from 'lucide-react';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

export function ConfiguracoesTab() {
  const { profile, isAdmin, isPastor, selectedSocietyId } = useAuth();
  const societyId = (!isAdmin && !isPastor) ? profile?.society_id : selectedSocietyId;
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [chargeMonth, setChargeMonth] = useState(MONTHS[new Date().getMonth()]);
  const [chargeYear, setChargeYear] = useState(currentYear.toString());
  const [formData, setFormData] = useState({
    monthly_fee: '',
    per_capita: '',
    due_day: '10',
    notes: ''
  });
  const [existingSettings, setExistingSettings] = useState<any>(null);
  const [activeMembers, setActiveMembers] = useState(0);

  useEffect(() => {
    if (societyId) {
      fetchSettings();
      fetchActiveMembers();
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
      const competence = `${chargeMonth}/${chargeYear}`;

      const { data: members, error: membersError } = await supabase
        .from('members')
        .select('id')
        .eq('active', true)
        .eq('society_id', societyId);

      if (membersError) throw membersError;
      if (!members || members.length === 0) {
        toast.error('Nenhum membro ativo encontrado');
        return;
      }

      const monthIndex = MONTHS.indexOf(chargeMonth);
      const year = parseInt(chargeYear);
      const dueDay = Math.min(existingSettings.due_day, 28);
      const dueDate = new Date(year, monthIndex, dueDay).toISOString().split('T')[0];

      const { data: existingCharges } = await supabase
        .from('charges')
        .select('member_id, type')
        .eq('competence', competence)
        .eq('society_id', societyId);

      const existingMap = new Set(
        (existingCharges || []).map(c => `${c.member_id}-${c.type}`)
      );

      const newCharges: any[] = [];

      for (const member of members) {
        if (existingSettings.monthly_fee > 0 && !existingMap.has(`${member.id}-mensalidade`)) {
          newCharges.push({
            member_id: member.id,
            competence,
            type: 'mensalidade',
            amount: existingSettings.monthly_fee,
            due_date: dueDate,
            status: 'pendente',
            society_id: societyId,
          });
        }
        if (existingSettings.per_capita > 0 && !existingMap.has(`${member.id}-percapita`)) {
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

      if (newCharges.length === 0) {
        toast.info('Todas as cobranças já foram geradas para esta competência');
        return;
      }

      const { error } = await supabase.from('charges').insert(newCharges);
      if (error) throw error;

      toast.success(`${newCharges.length} cobranças geradas para ${competence}!`);
    } catch (error: any) {
      toast.error('Erro ao gerar cobranças: ' + error.message);
    } finally {
      setGenerating(false);
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
            </div>
            <div className="space-y-2">
              <Label>Per Capita (R$)</Label>
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Gerar Cobranças
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Mês</Label>
              <Select value={chargeMonth} onValueChange={setChargeMonth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map(month => (
                    <SelectItem key={month} value={month}>{month}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ano</Label>
              <Select value={chargeYear} onValueChange={setChargeYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            variant="secondary"
            onClick={handleGenerateCharges}
            disabled={generating || !existingSettings}
          >
            <Users className="h-4 w-4 mr-2" />
            {generating ? 'Gerando...' : `Gerar Cobranças (${activeMembers} membros)`}
          </Button>

          {!existingSettings && (
            <p className="text-sm text-destructive">
              Salve os valores de cobrança acima antes de gerar.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
