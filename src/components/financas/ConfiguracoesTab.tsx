import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Settings, Save, Users, CalendarDays } from 'lucide-react';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

export function ConfiguracoesTab() {
  const { user, profile, isAdmin, isPastor, selectedSocietyId } = useAuth();
  const societyId = (!isAdmin && !isPastor) ? profile?.society_id : selectedSocietyId;
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
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
    fetchSettings();
    fetchActiveMembers();
  }, [selectedYear, societyId]);

  const fetchSettings = async () => {
    let query = supabase
      .from('financial_settings')
      .select('*')
      .eq('competence', selectedYear);

    if (societyId) {
      query = query.eq('society_id', societyId);
    }

    const { data } = await query.maybeSingle();

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
    let query = supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('active', true);

    if (societyId) {
      query = query.eq('society_id', societyId);
    }

    const { count } = await query;
    setActiveMembers(count || 0);
  };

  const handleSave = async () => {
    if (!formData.monthly_fee && !formData.per_capita) {
      toast.error('Informe pelo menos um valor (mensalidade ou per capita)');
      return;
    }

    setLoading(true);
    try {
      const monthlyFee = parseFloat(formData.monthly_fee) || 0;
      const perCapita = parseFloat(formData.per_capita) || 0;
      const dueDay = Math.min(parseInt(formData.due_day) || 10, 28);

      const payload = {
        competence: selectedYear,
        monthly_fee: monthlyFee,
        per_capita: perCapita,
        due_day: dueDay,
        notes: formData.notes,
        society_id: societyId || null,
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

      toast.success('Configurações anuais salvas!');
      fetchSettings();
    } catch (error: any) {
      toast.error('Erro ao salvar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCharges = async () => {
    // Buscar settings do ano selecionado para geração
    let settingsQuery = supabase
      .from('financial_settings')
      .select('*')
      .eq('competence', chargeYear);

    if (societyId) {
      settingsQuery = settingsQuery.eq('society_id', societyId);
    }

    const { data: settings } = await settingsQuery.maybeSingle();

    if (!settings) {
      toast.error(`Salve as configurações do ano ${chargeYear} primeiro`);
      return;
    }

    setGenerating(true);
    try {
      const competence = `${chargeMonth}/${chargeYear}`;

      let membersQuery = supabase
        .from('members')
        .select('id')
        .eq('active', true);

      if (societyId) {
        membersQuery = membersQuery.eq('society_id', societyId);
      }

      const { data: members, error: membersError } = await membersQuery;

      if (membersError) throw membersError;
      if (!members || members.length === 0) {
        toast.error('Nenhum membro ativo encontrado');
        return;
      }

      const monthIndex = MONTHS.indexOf(chargeMonth);
      const year = parseInt(chargeYear);
      const dueDay = Math.min(settings.due_day, 28);
      const dueDate = new Date(year, monthIndex, dueDay).toISOString().split('T')[0];

      let chargesQuery = supabase
        .from('charges')
        .select('member_id, type')
        .eq('competence', competence);

      if (societyId) {
        chargesQuery = chargesQuery.eq('society_id', societyId);
      }

      const { data: existingCharges } = await chargesQuery;

      const existingMap = new Set(
        (existingCharges || []).map(c => `${c.member_id}-${c.type}`)
      );

      const newCharges: any[] = [];

      for (const member of members) {
        if (settings.monthly_fee > 0 && !existingMap.has(`${member.id}-mensalidade`)) {
          newCharges.push({
            member_id: member.id,
            competence,
            type: 'mensalidade',
            amount: settings.monthly_fee,
            due_date: dueDate,
            status: 'pendente',
            society_id: societyId || null,
          });
        }
        if (settings.per_capita > 0 && !existingMap.has(`${member.id}-percapita`)) {
          newCharges.push({
            member_id: member.id,
            competence,
            type: 'percapita',
            amount: settings.per_capita,
            due_date: dueDate,
            status: 'pendente',
            society_id: societyId || null,
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

  return (
    <div className="space-y-6">
      {/* Valores Anuais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Valores Anuais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Ano</Label>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Mensalidade (R$)</Label>
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
              placeholder="Observações sobre este ano..."
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

      {/* Gerar Cobranças */}
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
            disabled={generating}
          >
            <Users className="h-4 w-4 mr-2" />
            {generating ? 'Gerando...' : `Gerar Cobranças (${activeMembers} membros)`}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
