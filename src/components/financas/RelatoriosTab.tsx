import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, ResponsiveContainer, Legend } from 'recharts';
import { Loader2, TrendingUp, Users, PieChartIcon, BarChart3 } from 'lucide-react';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const COLORS = {
  pago: 'hsl(var(--success))',
  pendente: 'hsl(var(--destructive))',
  isento: 'hsl(var(--muted-foreground))',
  receita: 'hsl(var(--success))',
  despesa: 'hsl(var(--destructive))'
};

interface ChargeStats {
  total: number;
  pago: number;
  pendente: number;
  isento: number;
}

interface MonthlyData {
  month: string;
  receitas: number;
  despesas: number;
  saldo: number;
}

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

export function RelatoriosTab() {
  const currentYear = new Date().getFullYear();
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[new Date().getMonth()]);
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [loading, setLoading] = useState(true);
  
  const [chargeStats, setChargeStats] = useState<ChargeStats>({ total: 0, pago: 0, pendente: 0, isento: 0 });
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [adimplenciaHistory, setAdimplenciaHistory] = useState<{ month: string; rate: number }[]>([]);

  const competence = `${selectedMonth}/${selectedYear}`;
  const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  useEffect(() => {
    fetchData();
  }, [competence, selectedYear]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([
      fetchChargeStats(),
      fetchMonthlyData(),
      fetchCategoryData(),
      fetchAdimplenciaHistory()
    ]);
    setLoading(false);
  };

  const fetchChargeStats = async () => {
    const { data: charges } = await supabase
      .from('charges')
      .select('status')
      .eq('competence', competence);

    if (charges) {
      const stats = {
        total: charges.length,
        pago: charges.filter(c => c.status === 'pago').length,
        pendente: charges.filter(c => c.status === 'pendente').length,
        isento: charges.filter(c => c.status === 'isento').length
      };
      setChargeStats(stats);
    }
  };

  const fetchMonthlyData = async () => {
    const year = parseInt(selectedYear);
    const data: MonthlyData[] = [];

    for (let i = 0; i < 12; i++) {
      const monthName = MONTHS[i];
      const comp = `${monthName}/${year}`;
      const startDate = new Date(year, i, 1).toISOString().split('T')[0];
      const endDate = new Date(year, i + 1, 0).toISOString().split('T')[0];

      const [transRes] = await Promise.all([
        supabase
          .from('transactions')
          .select('amount, type')
          .gte('date', startDate)
          .lte('date', endDate)
      ]);

      const receitas = (transRes.data || [])
        .filter(t => t.type === 'entrada')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      const despesas = (transRes.data || [])
        .filter(t => t.type === 'saida')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      data.push({
        month: monthName.slice(0, 3),
        receitas,
        despesas,
        saldo: receitas - despesas
      });
    }

    setMonthlyData(data);
  };

  const fetchCategoryData = async () => {
    const year = parseInt(selectedYear);
    const monthIndex = MONTHS.indexOf(selectedMonth);
    const startDate = new Date(year, monthIndex, 1).toISOString().split('T')[0];
    const endDate = new Date(year, monthIndex + 1, 0).toISOString().split('T')[0];

    const { data: transactions } = await supabase
      .from('transactions')
      .select('amount, category_id')
      .eq('type', 'saida')
      .gte('date', startDate)
      .lte('date', endDate);

    const { data: categories } = await supabase
      .from('financial_categories')
      .select('id, name, color');

    if (transactions && categories) {
      const categoryMap = new Map(categories.map(c => [c.id, c]));
      const groupedData: Record<string, { name: string; value: number; color: string }> = {};

      for (const t of transactions) {
        const cat = t.category_id ? categoryMap.get(t.category_id) : null;
        const name = cat?.name || 'Sem categoria';
        const color = cat?.color || '#94a3b8';

        if (!groupedData[name]) {
          groupedData[name] = { name, value: 0, color };
        }
        groupedData[name].value += Number(t.amount);
      }

      setCategoryData(Object.values(groupedData));
    }
  };

  const fetchAdimplenciaHistory = async () => {
    const year = parseInt(selectedYear);
    const history: { month: string; rate: number }[] = [];

    for (let i = 0; i < 12; i++) {
      const monthName = MONTHS[i];
      const comp = `${monthName}/${year}`;

      const { data: charges } = await supabase
        .from('charges')
        .select('status')
        .eq('competence', comp);

      if (charges && charges.length > 0) {
        const paid = charges.filter(c => c.status === 'pago').length;
        const rate = (paid / charges.length) * 100;
        history.push({ month: monthName.slice(0, 3), rate: Math.round(rate) });
      } else {
        history.push({ month: monthName.slice(0, 3), rate: 0 });
      }
    }

    setAdimplenciaHistory(history);
  };

  // Calcular porcentagens
  const adimplenciaRate = chargeStats.total > 0 
    ? Math.round((chargeStats.pago / chargeStats.total) * 100) 
    : 0;

  const pieData = [
    { name: 'Pagos', value: chargeStats.pago, color: COLORS.pago },
    { name: 'Pendentes', value: chargeStats.pendente, color: COLORS.pendente },
    { name: 'Isentos', value: chargeStats.isento, color: COLORS.isento }
  ].filter(d => d.value > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map(month => (
                  <SelectItem key={month} value={month}>{month}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Taxa de Adimplência - Destaque */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Taxa de Adimplência - {competence}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Gráfico de Pizza */}
            <div className="w-full md:w-1/2 h-[250px]">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Nenhuma cobrança para esta competência
                </div>
              )}
            </div>

            {/* Números */}
            <div className="w-full md:w-1/2 space-y-4">
              <div className="text-center md:text-left">
                <p className="text-6xl font-bold text-primary">{adimplenciaRate}%</p>
                <p className="text-muted-foreground">de adimplência</p>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-success">{chargeStats.pago}</p>
                  <p className="text-xs text-muted-foreground">Pagos</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-destructive">{chargeStats.pendente}</p>
                  <p className="text-xs text-muted-foreground">Pendentes</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-muted-foreground">{chargeStats.isento}</p>
                  <p className="text-xs text-muted-foreground">Isentos</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráficos em Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Evolução Mensal */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Evolução Mensal - {selectedYear}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(v) => `R$${v}`} />
                  <ChartTooltip 
                    content={<ChartTooltipContent />}
                    formatter={(value: number) => `R$ ${value.toFixed(2)}`}
                  />
                  <Legend />
                  <Bar dataKey="receitas" name="Receitas" fill={COLORS.receita} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="despesas" name="Despesas" fill={COLORS.despesa} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Histórico de Adimplência */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Histórico de Adimplência - {selectedYear}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={adimplenciaHistory}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <ChartTooltip 
                    content={<ChartTooltipContent />}
                    formatter={(value: number) => `${value}%`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="rate" 
                    name="Adimplência"
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Gastos por Categoria */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              Distribuição de Gastos por Categoria - {competence}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, value }) => `${name}: R$ ${value.toFixed(2)}`}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip 
                      content={<ChartTooltipContent />}
                      formatter={(value: number) => `R$ ${value.toFixed(2)}`}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Nenhum gasto registrado para este período
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
