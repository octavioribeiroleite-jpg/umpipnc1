import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Loader2, TrendingUp, Users, PieChartIcon, BarChart3, Download, FileText, Wallet, ArrowDownCircle, ArrowUpCircle, Percent, ImageIcon } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from 'sonner';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const COLORS = {
  pago: 'hsl(142, 76%, 36%)',
  pendente: 'hsl(0, 84%, 60%)',
  isento: 'hsl(215, 16%, 47%)',
  receita: 'hsl(142, 76%, 36%)',
  despesa: 'hsl(0, 84%, 60%)'
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

interface TransactionWithReceipt {
  id: string;
  description: string;
  amount: number;
  date: string;
  type: string;
  category_id: string | null;
  category_name: string;
  category_color: string;
  receipt_url: string | null;
}

export function RelatoriosTab() {
  const { profile, isAdmin, isPastor, selectedSocietyId } = useAuth();
  const societyId = (!isAdmin && !isPastor) ? profile?.society_id : selectedSocietyId;
  const currentYear = new Date().getFullYear();
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[new Date().getMonth()]);
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  
  const [chargeStats, setChargeStats] = useState<ChargeStats>({ total: 0, pago: 0, pendente: 0, isento: 0 });
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [adimplenciaHistory, setAdimplenciaHistory] = useState<{ month: string; rate: number }[]>([]);
  const [transactions, setTransactions] = useState<TransactionWithReceipt[]>([]);
  const [totalReceitas, setTotalReceitas] = useState(0);
  const [totalDespesas, setTotalDespesas] = useState(0);
  const [saldo, setSaldo] = useState(0);
  
  const reportRef = useRef<HTMLDivElement>(null);

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
      fetchAdimplenciaHistory(),
      fetchTransactions()
    ]);
    setLoading(false);
  };

  const fetchChargeStats = async () => {
    let query = supabase
      .from('charges')
      .select('status')
      .eq('competence', competence);

    if (societyId) {
      query = query.eq('society_id', societyId);
    }

    const { data: charges } = await query;

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
      const startDate = new Date(year, i, 1).toISOString().split('T')[0];
      const endDate = new Date(year, i + 1, 0).toISOString().split('T')[0];

      let query = supabase
        .from('transactions')
        .select('amount, type')
        .gte('date', startDate)
        .lte('date', endDate);

      if (societyId) {
        query = query.eq('society_id', societyId);
      }

      const { data: transData } = await query;

      const receitas = (transData || [])
        .filter(t => t.type === 'entrada')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      const despesas = (transData || [])
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

    let txQuery = supabase
      .from('transactions')
      .select('amount, category_id')
      .eq('type', 'saida')
      .gte('date', startDate)
      .lte('date', endDate);

    if (societyId) {
      txQuery = txQuery.eq('society_id', societyId);
    }

    const { data: transData } = await txQuery;

    let catQuery = supabase.from('financial_categories').select('id, name, color');
    if (societyId) {
      catQuery = catQuery.eq('society_id', societyId);
    }
    const { data: categories } = await catQuery;

    if (transData && categories) {
      const categoryMap = new Map(categories.map(c => [c.id, c]));
      const groupedData: Record<string, { name: string; value: number; color: string }> = {};

      for (const t of transData) {
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

      let query = supabase
        .from('charges')
        .select('status')
        .eq('competence', comp);

      if (societyId) {
        query = query.eq('society_id', societyId);
      }

      const { data: charges } = await query;

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

  const fetchTransactions = async () => {
    const year = parseInt(selectedYear);
    const monthIndex = MONTHS.indexOf(selectedMonth);
    const startDate = new Date(year, monthIndex, 1).toISOString().split('T')[0];
    const endDate = new Date(year, monthIndex + 1, 0).toISOString().split('T')[0];

    let txQuery2 = supabase
      .from('transactions')
      .select('id, description, amount, date, type, category_id, receipt_url')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (societyId) {
      txQuery2 = txQuery2.eq('society_id', societyId);
    }

    const { data: transData } = await txQuery2;

    let catQuery2 = supabase.from('financial_categories').select('id, name, color');
    if (societyId) {
      catQuery2 = catQuery2.eq('society_id', societyId);
    }
    const { data: categories } = await catQuery2;

    const categoryMap = new Map(categories?.map(c => [c.id, c]) || []);

    const formattedTransactions: TransactionWithReceipt[] = (transData || []).map(t => {
      const cat = t.category_id ? categoryMap.get(t.category_id) : null;
      return {
        ...t,
        category_name: cat?.name || 'Sem categoria',
        category_color: cat?.color || '#94a3b8'
      };
    });

    setTransactions(formattedTransactions);

    const receitas = formattedTransactions
      .filter(t => t.type === 'entrada')
      .reduce((sum, t) => sum + t.amount, 0);
    const despesas = formattedTransactions
      .filter(t => t.type === 'saida')
      .reduce((sum, t) => sum + t.amount, 0);

    setTotalReceitas(receitas);
    setTotalDespesas(despesas);
    setSaldo(receitas - despesas);
  };

  const adimplenciaRate = chargeStats.total > 0 
    ? Math.round((chargeStats.pago / chargeStats.total) * 100) 
    : 0;

  const pieData = [
    { name: 'Pagos', value: chargeStats.pago, color: COLORS.pago },
    { name: 'Pendentes', value: chargeStats.pendente, color: COLORS.pendente },
    { name: 'Isentos', value: chargeStats.isento, color: COLORS.isento }
  ].filter(d => d.value > 0);

  const receitasTransactions = transactions.filter(t => t.type === 'entrada');
  const despesasTransactions = transactions.filter(t => t.type === 'saida');
  const despesasComComprovante = despesasTransactions.filter(t => t.receipt_url);

  const exportToPDF = async () => {
    if (!reportRef.current) return;
    
    setExporting(true);
    toast.info('Gerando PDF, aguarde...');

    try {
      const element = reportRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      
      let heightLeft = imgHeight * ratio;
      let position = 0;

      pdf.addImage(imgData, 'PNG', imgX, position, imgWidth * ratio, imgHeight * ratio);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight * ratio;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', imgX, position, imgWidth * ratio, imgHeight * ratio);
        heightLeft -= pdfHeight;
      }

      pdf.save(`Relatorio_Financeiro_${selectedMonth}_${selectedYear}.pdf`);
      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros e Botão Exportar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
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
            <Button onClick={exportToPDF} disabled={exporting}>
              {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              Exportar PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Conteúdo do Relatório para PDF */}
      <div ref={reportRef} className="space-y-6 bg-background p-4 rounded-lg">
        {/* Cabeçalho do Relatório */}
        <div className="text-center border-b pb-6">
          <h1 className="text-3xl font-bold text-foreground">Relatório Financeiro da Mocidade</h1>
          <p className="text-xl text-muted-foreground mt-2">{competence}</p>
          <p className="text-sm text-muted-foreground">Gerado em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
        </div>

        {/* Resumo Executivo */}
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Resumo Executivo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <Wallet className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold" style={{ color: saldo >= 0 ? COLORS.receita : COLORS.despesa }}>
                  R$ {saldo.toFixed(2).replace('.', ',')}
                </p>
                <p className="text-sm text-muted-foreground">Saldo do Período</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <ArrowUpCircle className="h-8 w-8 mx-auto mb-2 text-success" />
                <p className="text-2xl font-bold text-success">
                  R$ {totalReceitas.toFixed(2).replace('.', ',')}
                </p>
                <p className="text-sm text-muted-foreground">Total de Receitas</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <ArrowDownCircle className="h-8 w-8 mx-auto mb-2 text-destructive" />
                <p className="text-2xl font-bold text-destructive">
                  R$ {totalDespesas.toFixed(2).replace('.', ',')}
                </p>
                <p className="text-sm text-muted-foreground">Total de Gastos</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <Percent className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold text-primary">
                  {adimplenciaRate}%
                </p>
                <p className="text-sm text-muted-foreground">Adimplência</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Taxa de Adimplência */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Taxa de Adimplência - {competence}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row items-center gap-8">
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
                      <Tooltip formatter={(value: number) => `${value} membros`} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Nenhuma cobrança para esta competência
                  </div>
                )}
              </div>

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

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                    <Tooltip formatter={(value: number) => `R$ ${value.toFixed(2)}`} />
                    <Legend />
                    <Bar dataKey="receitas" name="Receitas" fill={COLORS.receita} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="despesas" name="Despesas" fill={COLORS.despesa} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

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
                    <Tooltip formatter={(value: number) => `${value}%`} />
                    <Line 
                      type="monotone" 
                      dataKey="rate" 
                      name="Adimplência"
                      stroke="hsl(221, 83%, 53%)" 
                      strokeWidth={3}
                      dot={{ fill: 'hsl(221, 83%, 53%)' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

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
                      <Tooltip formatter={(value: number) => `R$ ${value.toFixed(2)}`} />
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

        {/* Tabelas de Movimentações */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Receitas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-success">
                <ArrowUpCircle className="h-5 w-5" />
                Receitas do Período
              </CardTitle>
            </CardHeader>
            <CardContent>
              {receitasTransactions.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">Nenhuma receita registrada</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receitasTransactions.map(tx => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-muted-foreground">
                          {new Date(tx.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>{tx.description}</TableCell>
                        <TableCell className="text-right font-medium text-success">
                          R$ {tx.amount.toFixed(2).replace('.', ',')}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell colSpan={2}>Total</TableCell>
                      <TableCell className="text-right text-success">
                        R$ {totalReceitas.toFixed(2).replace('.', ',')}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Despesas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <ArrowDownCircle className="h-5 w-5" />
                Gastos do Período
              </CardTitle>
            </CardHeader>
            <CardContent>
              {despesasTransactions.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">Nenhum gasto registrado</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {despesasTransactions.map(tx => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-muted-foreground">
                          {new Date(tx.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>{tx.description}</TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            style={{
                              backgroundColor: `${tx.category_color}20`,
                              color: tx.category_color,
                            }}
                          >
                            {tx.category_name}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium text-destructive">
                          R$ {tx.amount.toFixed(2).replace('.', ',')}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell colSpan={3}>Total</TableCell>
                      <TableCell className="text-right text-destructive">
                        R$ {totalDespesas.toFixed(2).replace('.', ',')}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Galeria de Comprovantes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Comprovantes dos Gastos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {despesasComComprovante.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum comprovante anexado para este período</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {despesasComComprovante.map(tx => (
                  <div key={tx.id} className="border rounded-lg overflow-hidden bg-muted/30">
                    <a href={tx.receipt_url!} target="_blank" rel="noopener noreferrer" className="block">
                      <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
                        {tx.receipt_url?.includes('.pdf') ? (
                          <div className="text-center p-4">
                            <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
                            <p className="text-xs mt-2">PDF</p>
                          </div>
                        ) : (
                          <img 
                            src={tx.receipt_url!} 
                            alt={tx.description}
                            className="w-full h-full object-cover hover:scale-105 transition-transform"
                          />
                        )}
                      </div>
                    </a>
                    <div className="p-2">
                      <p className="text-sm font-medium truncate">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tx.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </p>
                      <p className="text-sm font-bold text-destructive">
                        R$ {tx.amount.toFixed(2).replace('.', ',')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rodapé */}
        <div className="text-center pt-6 border-t">
          <p className="text-sm text-muted-foreground">
            Relatório gerado automaticamente pelo Sistema de Gestão Financeira
          </p>
        </div>
      </div>
    </div>
  );
}