import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Loader2, TrendingUp, Users, PieChartIcon, Download, FileText, Wallet, ArrowDownCircle, ArrowUpCircle, Percent, ImageIcon } from 'lucide-react';
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
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
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
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  
  const [chargeStats, setChargeStats] = useState<ChargeStats>({ total: 0, pago: 0, pendente: 0, isento: 0, totalAmount: 0, paidAmount: 0, pendingAmount: 0 });
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [transactions, setTransactions] = useState<TransactionWithReceipt[]>([]);
  const [totalReceitas, setTotalReceitas] = useState(0);
  const [totalDespesas, setTotalDespesas] = useState(0);
  const [saldo, setSaldo] = useState(0);
  
  const reportRef = useRef<HTMLDivElement>(null);
  const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  useEffect(() => {
    fetchData();
  }, [selectedYear, societyId]);

  const fetchData = async () => {
    if (!societyId) return;
    setLoading(true);
    await Promise.all([
      fetchChargeStats(),
      fetchMonthlyData(),
      fetchCategoryData(),
      fetchTransactions()
    ]);
    setLoading(false);
  };

  const fetchChargeStats = async () => {
    // Fetch all charges for this year (both annual competence "2026" and monthly "Mês/2026")
    const yearCompetences = [selectedYear, ...MONTHS.map(m => `${m}/${selectedYear}`)];
    
    let query = supabase
      .from('charges')
      .select('status, amount, paid_amount')
      .in('competence', yearCompetences);

    if (societyId) query = query.eq('society_id', societyId);

    const { data: charges } = await query;

    if (charges) {
      const stats: ChargeStats = {
        total: charges.length,
        pago: charges.filter(c => c.status === 'pago').length,
        pendente: charges.filter(c => c.status === 'pendente').length,
        isento: charges.filter(c => c.status === 'isento').length,
        totalAmount: charges.filter(c => c.status !== 'isento').reduce((s, c) => s + Number(c.amount), 0),
        paidAmount: charges.filter(c => c.status === 'pago').reduce((s, c) => s + Number(c.paid_amount || c.amount), 0),
        pendingAmount: charges.filter(c => c.status === 'pendente').reduce((s, c) => s + Number(c.amount), 0),
      };
      setChargeStats(stats);
    }
  };

  const fetchMonthlyData = async () => {
    const year = parseInt(selectedYear);
    const startDate = new Date(year, 0, 1).toISOString().split('T')[0];
    const endDate = new Date(year, 11, 31).toISOString().split('T')[0];

    let query = supabase
      .from('transactions')
      .select('amount, type, date')
      .gte('date', startDate)
      .lte('date', endDate);

    if (societyId) query = query.eq('society_id', societyId);

    const { data: transData } = await query;

    const data: MonthlyData[] = MONTHS.map((month, i) => {
      const monthTx = (transData || []).filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === i && d.getFullYear() === year;
      });
      const receitas = monthTx.filter(t => t.type === 'entrada').reduce((s, t) => s + Number(t.amount), 0);
      const despesas = monthTx.filter(t => t.type === 'saida').reduce((s, t) => s + Number(t.amount), 0);
      return { month: month.slice(0, 3), receitas, despesas, saldo: receitas - despesas };
    });

    setMonthlyData(data);
  };

  const fetchCategoryData = async () => {
    const year = parseInt(selectedYear);
    const startDate = new Date(year, 0, 1).toISOString().split('T')[0];
    const endDate = new Date(year, 11, 31).toISOString().split('T')[0];

    let txQuery = supabase
      .from('transactions')
      .select('amount, category_id')
      .eq('type', 'saida')
      .gte('date', startDate)
      .lte('date', endDate);

    if (societyId) txQuery = txQuery.eq('society_id', societyId);

    const { data: transData } = await txQuery;

    let catQuery = supabase.from('financial_categories').select('id, name, color');
    if (societyId) catQuery = catQuery.eq('society_id', societyId);
    const { data: categories } = await catQuery;

    if (transData && categories) {
      const categoryMap = new Map(categories.map(c => [c.id, c]));
      const groupedData: Record<string, { name: string; value: number; color: string }> = {};

      for (const t of transData) {
        const cat = t.category_id ? categoryMap.get(t.category_id) : null;
        const name = cat?.name || 'Sem categoria';
        const color = cat?.color || '#94a3b8';
        if (!groupedData[name]) groupedData[name] = { name, value: 0, color };
        groupedData[name].value += Number(t.amount);
      }

      setCategoryData(Object.values(groupedData));
    }
  };

  const fetchTransactions = async () => {
    const year = parseInt(selectedYear);
    const startDate = new Date(year, 0, 1).toISOString().split('T')[0];
    const endDate = new Date(year, 11, 31).toISOString().split('T')[0];

    let txQuery = supabase
      .from('transactions')
      .select('id, description, amount, date, type, category_id, receipt_url')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (societyId) txQuery = txQuery.eq('society_id', societyId);

    const { data: transData } = await txQuery;

    let catQuery = supabase.from('financial_categories').select('id, name, color');
    if (societyId) catQuery = catQuery.eq('society_id', societyId);
    const { data: categories } = await catQuery;

    const categoryMap = new Map(categories?.map(c => [c.id, c]) || []);

    const formatted: TransactionWithReceipt[] = (transData || []).map(t => {
      const cat = t.category_id ? categoryMap.get(t.category_id) : null;
      return { ...t, category_name: cat?.name || 'Sem categoria', category_color: cat?.color || '#94a3b8' };
    });

    setTransactions(formatted);

    const receitas = formatted.filter(t => t.type === 'entrada').reduce((s, t) => s + t.amount, 0);
    const despesas = formatted.filter(t => t.type === 'saida').reduce((s, t) => s + t.amount, 0);
    setTotalReceitas(receitas);
    setTotalDespesas(despesas);
    setSaldo(receitas - despesas);
  };

  const getSignedUrl = async (url: string): Promise<string> => {
    // Extract the path after /receipts/ from the URL
    const match = url.match(/\/receipts\/(.+)$/);
    if (!match) return url;
    const path = match[1];
    const { data } = await supabase.storage.from('receipts').createSignedUrl(path, 3600);
    return data?.signedUrl || url;
  };

  const handleViewReceipt = async (url: string) => {
    const signedUrl = await getSignedUrl(url);
    if (url.includes('.pdf')) {
      window.open(signedUrl, '_blank');
    } else {
      setPreviewImage(signedUrl);
    }
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
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const ratio = Math.min(pdfWidth / canvas.width, pdfHeight / canvas.height);
      const imgX = (pdfWidth - canvas.width * ratio) / 2;
      let heightLeft = canvas.height * ratio;
      let position = 0;

      pdf.addImage(imgData, 'PNG', imgX, position, canvas.width * ratio, canvas.height * ratio);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - canvas.height * ratio;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', imgX, position, canvas.width * ratio, canvas.height * ratio);
        heightLeft -= pdfHeight;
      }

      pdf.save(`Relatorio_Financeiro_${selectedYear}.pdf`);
      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF');
    } finally {
      setExporting(false);
    }
  };

  const formatCurrency = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtro e Exportar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={exportToPDF} disabled={exporting}>
              {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              Exportar PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Conteúdo do Relatório */}
      <div ref={reportRef} className="space-y-6 bg-background p-4 rounded-lg">
        {/* Cabeçalho */}
        <div className="text-center border-b pb-6">
          <h1 className="text-3xl font-bold text-foreground">Relatório Financeiro Anual</h1>
          <p className="text-xl text-muted-foreground mt-2">{selectedYear}</p>
          <p className="text-sm text-muted-foreground">Gerado em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
        </div>

        {/* Resumo Executivo */}
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Resumo Executivo — {selectedYear}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <Wallet className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold" style={{ color: saldo >= 0 ? COLORS.receita : COLORS.despesa }}>
                  {formatCurrency(saldo)}
                </p>
                <p className="text-sm text-muted-foreground">Saldo do Ano</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <ArrowUpCircle className="h-8 w-8 mx-auto mb-2 text-success" />
                <p className="text-2xl font-bold text-success">{formatCurrency(totalReceitas)}</p>
                <p className="text-sm text-muted-foreground">Total Receitas</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <ArrowDownCircle className="h-8 w-8 mx-auto mb-2 text-destructive" />
                <p className="text-2xl font-bold text-destructive">{formatCurrency(totalDespesas)}</p>
                <p className="text-sm text-muted-foreground">Total Gastos</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <Percent className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold text-primary">{adimplenciaRate}%</p>
                <p className="text-sm text-muted-foreground">Adimplência</p>
              </div>
            </div>

            {/* Cobranças breakdown */}
            <div className="mt-4 grid grid-cols-3 gap-4 text-center border-t pt-4">
              <div>
                <p className="text-lg font-bold text-foreground">{formatCurrency(chargeStats.totalAmount)}</p>
                <p className="text-xs text-muted-foreground">Previsto</p>
              </div>
              <div>
                <p className="text-lg font-bold text-success">{formatCurrency(chargeStats.paidAmount)}</p>
                <p className="text-xs text-muted-foreground">Recebido</p>
              </div>
              <div>
                <p className="text-lg font-bold text-destructive">{formatCurrency(chargeStats.pendingAmount)}</p>
                <p className="text-xs text-muted-foreground">Pendente</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Adimplência */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Adimplência — {selectedYear}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="w-full md:w-1/2 h-[250px]">
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `${value} cobranças`} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Nenhuma cobrança para este ano
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
                Evolução Mensal — {selectedYear}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" tickFormatter={(v) => `R$${v}`} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
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
                <PieChartIcon className="h-5 w-5" />
                Gastos por Categoria — {selectedYear}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categoryData} cx="50%" cy="50%" outerRadius={100} paddingAngle={2} dataKey="value"
                        label={({ name, value }) => `${name}: ${formatCurrency(value)}`}>
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Nenhum gasto registrado para este ano
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabelas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-success">
                <ArrowUpCircle className="h-5 w-5" />
                Receitas — {selectedYear}
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
                          {formatCurrency(tx.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell colSpan={2}>Total</TableCell>
                      <TableCell className="text-right text-success">{formatCurrency(totalReceitas)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <ArrowDownCircle className="h-5 w-5" />
                Gastos — {selectedYear}
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
                          <Badge variant="secondary" style={{ backgroundColor: `${tx.category_color}20`, color: tx.category_color }}>
                            {tx.category_name}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium text-destructive">
                          {formatCurrency(tx.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell colSpan={3}>Total</TableCell>
                      <TableCell className="text-right text-destructive">{formatCurrency(totalDespesas)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Comprovantes */}
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
                <p>Nenhum comprovante anexado para este ano</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {despesasComComprovante.map(tx => (
                  <div key={tx.id} className="border rounded-lg overflow-hidden bg-muted/30 cursor-pointer" onClick={() => handleViewReceipt(tx.receipt_url!)}>
                    <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
                      {tx.receipt_url?.includes('.pdf') ? (
                        <div className="text-center p-4">
                          <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
                          <p className="text-xs mt-2">PDF</p>
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="p-2">
                      <p className="text-sm font-medium truncate">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tx.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </p>
                      <p className="text-sm font-bold text-destructive">{formatCurrency(tx.amount)}</p>
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

      {/* Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="max-w-3xl p-2">
          {previewImage && (
            <img src={previewImage} alt="Comprovante" className="w-full h-auto rounded" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
