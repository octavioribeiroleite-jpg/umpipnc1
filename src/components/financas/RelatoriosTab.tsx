import { useState, useEffect } from 'react';
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
import { toast } from 'sonner';
import { signedReceiptUrl, openReceipt } from '@/lib/receipts';
import {
  generateFinancialReportPdf,
  formatCurrency,
  formatDate,
  type CategoryData,
  type ChargeStats,
  type MonthlyData,
  type TransactionWithReceipt,
} from './financialReportPdf';

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

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="space-y-1">
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}

function MetricCard({
  title,
  value,
  helper,
  icon: Icon,
  tone = 'default',
}: {
  title: string;
  value: string;
  helper?: string;
  icon: any;
  tone?: 'default' | 'success' | 'danger' | 'blue';
}) {
  const toneClass = {
    default: 'text-foreground bg-muted/50',
    success: 'text-success bg-success/10',
    danger: 'text-destructive bg-destructive/10',
    blue: 'text-primary bg-primary/10',
  }[tone];

  return (
    <Card className="border-border/70 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
            <p className={`mt-2 text-xl font-bold ${toneClass.split(' ')[0]}`}>{value}</p>
            {helper && <p className="mt-1 text-xs text-muted-foreground">{helper}</p>}
          </div>
          <div className={`h-9 w-9 rounded-md flex items-center justify-center shrink-0 ${toneClass.split(' ').slice(1).join(' ')}`}>
            <Icon className={`h-5 w-5 ${toneClass.split(' ')[0]}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyBlock({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
      <Icon className="h-10 w-10 mb-2 opacity-50" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

export function RelatoriosTab() {
  const { effectiveSocietyId: societyId } = useAuth();
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
  
  const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  useEffect(() => {
    fetchData();
  }, [selectedYear, societyId]);

  useEffect(() => {
    const loadSignedUrls = async () => {
      const withReceipts = transactions.filter(t => t.receipt_url && !t.receipt_url.toLowerCase().includes('.pdf'));
      const urls: Record<string, string> = {};
      await Promise.all(
        withReceipts.map(async (tx) => {
          try {
            const signed = await getSignedUrl(tx.receipt_url!);
            urls[tx.id] = signed;
          } catch (e) {
            console.warn('Failed to get signed url for', tx.id);
          }
        })
      );
      setSignedUrls(urls);
    };
    if (transactions.length > 0) loadSignedUrls();
  }, [transactions]);

  const fetchData = async () => {
    if (!societyId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      await Promise.all([
        fetchChargeStats(),
        fetchMonthlyData(),
        fetchCategoryData(),
        fetchTransactions()
      ]);
    } catch (error) {
      console.error('Erro ao carregar relatório:', error);
      toast.error('Erro ao carregar dados do relatório');
    } finally {
      setLoading(false);
    }
  };

  const fetchChargeStats = async () => {
    const yearCompetences = [selectedYear, ...MONTHS.map(m => `${m}/${selectedYear}`)];
    
    let query = supabase
      .from('charges')
      .select('status, amount, paid_amount')
      .in('competence', yearCompetences);

    if (societyId) query = query.eq('society_id', societyId);

    const { data: charges, error } = await query;
    if (error) throw error;

    setChargeStats({
      total: charges?.length || 0,
      pago: (charges || []).filter(c => c.status === 'pago').length,
      pendente: (charges || []).filter(c => c.status === 'pendente').length,
      isento: (charges || []).filter(c => c.status === 'isento').length,
      totalAmount: (charges || []).filter(c => c.status !== 'isento').reduce((s, c) => s + Number(c.amount), 0),
      paidAmount: (charges || []).filter(c => c.status === 'pago').reduce((s, c) => s + Number(c.paid_amount || c.amount), 0),
      pendingAmount: (charges || []).filter(c => c.status === 'pendente').reduce((s, c) => s + Number(c.amount), 0),
    });
  };

  const fetchMonthlyData = async () => {
    const year = parseInt(selectedYear);
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    let query = supabase
      .from('transactions')
      .select('amount, type, date')
      .gte('date', startDate)
      .lte('date', endDate);

    if (societyId) query = query.eq('society_id', societyId);

    const { data: transData, error } = await query;
    if (error) throw error;

    const data: MonthlyData[] = MONTHS.map((month, i) => {
      const monthTx = (transData || []).filter(t => {
        const d = new Date(`${t.date}T12:00:00`);
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
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    let txQuery = supabase
      .from('transactions')
      .select('amount, category_id')
      .eq('type', 'saida')
      .gte('date', startDate)
      .lte('date', endDate);

    if (societyId) txQuery = txQuery.eq('society_id', societyId);

    const { data: transData, error: txError } = await txQuery;
    if (txError) throw txError;

    let catQuery = supabase.from('financial_categories').select('id, name, color');
    if (societyId) catQuery = catQuery.eq('society_id', societyId);
    const { data: categories, error: catError } = await catQuery;
    if (catError) throw catError;

    const categoryMap = new Map((categories || []).map(c => [c.id, c]));
    const groupedData: Record<string, { name: string; value: number; color: string }> = {};

    for (const t of transData || []) {
      const cat = t.category_id ? categoryMap.get(t.category_id) : null;
      const name = cat?.name || 'Sem categoria';
      const color = cat?.color || '#94a3b8';
      if (!groupedData[name]) groupedData[name] = { name, value: 0, color };
      groupedData[name].value += Number(t.amount);
    }

    setCategoryData(Object.values(groupedData).sort((a, b) => b.value - a.value));
  };

  const fetchTransactions = async () => {
    const year = parseInt(selectedYear);
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    let txQuery = supabase
      .from('transactions')
      .select('id, description, amount, date, type, category_id, receipt_url')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (societyId) txQuery = txQuery.eq('society_id', societyId);

    const { data: transData, error: txError } = await txQuery;
    if (txError) throw txError;

    let catQuery = supabase.from('financial_categories').select('id, name, color');
    if (societyId) catQuery = catQuery.eq('society_id', societyId);
    const { data: categories, error: catError } = await catQuery;
    if (catError) throw catError;

    const categoryMap = new Map(categories?.map(c => [c.id, c]) || []);

    const formatted: TransactionWithReceipt[] = (transData || []).map(t => {
      const cat = t.category_id ? categoryMap.get(t.category_id) : null;
      return { ...t, category_name: cat?.name || 'Sem categoria', category_color: cat?.color || '#94a3b8' };
    });

    setTransactions(formatted);

    const receitas = formatted.filter(t => t.type === 'entrada').reduce((s, t) => s + Number(t.amount), 0);
    const despesas = formatted.filter(t => t.type === 'saida').reduce((s, t) => s + Number(t.amount), 0);
    setTotalReceitas(receitas);
    setTotalDespesas(despesas);
    setSaldo(receitas - despesas);
  };

  const getSignedUrl = signedReceiptUrl;

  const handleViewReceipt = async (url: string) => {
    try {
      if (url.toLowerCase().includes('.pdf')) await openReceipt(url);
      else setPreviewImage(await getSignedUrl(url));
    } catch { toast.error('Não foi possível abrir o comprovante'); }
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
  const paidChargesLabel = `${chargeStats.pago} de ${chargeStats.total} cobranças pagas`;
  const largestCategory = categoryData[0];
  const bestRevenueMonth = monthlyData.reduce((best, month) => month.receitas > best.receitas ? month : best, monthlyData[0] || { month: '-', receitas: 0, despesas: 0, saldo: 0 });
  const highestExpenseMonth = monthlyData.reduce((best, month) => month.despesas > best.despesas ? month : best, monthlyData[0] || { month: '-', receitas: 0, despesas: 0, saldo: 0 });

  const exportToPDF = async () => {
    setExporting(true);
    toast.info('Gerando relatório completo, aguarde...');

    try {
      await generateFinancialReportPdf({
        selectedYear,
        chargeStats,
        monthlyData,
        categoryData,
        receitasTransactions,
        despesasTransactions,
        despesasComComprovante,
        totalReceitas,
        totalDespesas,
        saldo,
        adimplenciaRate,
        getSignedUrl,
      });
      toast.success('PDF completo gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF completo');
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
    <div className="space-y-5">
      <Card className="border-border/70 shadow-sm">
        <CardContent className="p-4 md:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-foreground">Relatório Financeiro</h2>
              <p className="text-sm text-muted-foreground">
                Confira os dados do período antes de exportar o PDF oficial com anexos.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-full sm:w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={exportToPDF} disabled={exporting || !societyId} className="sm:min-w-56">
                {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                Exportar PDF oficial
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
        <MetricCard
          title="Saldo"
          value={formatCurrency(saldo)}
          helper="Entradas menos saídas"
          icon={Wallet}
          tone={saldo >= 0 ? 'success' : 'danger'}
        />
        <MetricCard title="Receitas" value={formatCurrency(totalReceitas)} helper="Caixa real" icon={ArrowUpCircle} tone="success" />
        <MetricCard title="Gastos" value={formatCurrency(totalDespesas)} helper="Caixa real" icon={ArrowDownCircle} tone="danger" />
        <MetricCard title="Adimplência" value={`${adimplenciaRate}%`} helper={paidChargesLabel} icon={Percent} tone="blue" />
        <MetricCard title="Comprovantes" value={String(despesasComComprovante.length)} helper="Anexos de gastos" icon={ImageIcon} tone="default" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-3">
            <SectionHeader title="Caixa real" description="Dinheiro que realmente entrou e saiu no período." />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-md bg-success/10 p-3">
                <p className="text-xs text-muted-foreground">Entradas</p>
                <p className="mt-1 text-lg font-bold text-success">{formatCurrency(totalReceitas)}</p>
              </div>
              <div className="rounded-md bg-destructive/10 p-3">
                <p className="text-xs text-muted-foreground">Saídas</p>
                <p className="mt-1 text-lg font-bold text-destructive">{formatCurrency(totalDespesas)}</p>
              </div>
              <div className="rounded-md bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Saldo</p>
                <p className={`mt-1 text-lg font-bold ${saldo >= 0 ? 'text-success' : 'text-destructive'}`}>{formatCurrency(saldo)}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Este bloco considera somente lançamentos financeiros registrados como transações.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-3">
            <SectionHeader title="Cobranças" description="Valores previstos, recebidos e pendentes das cobranças." />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-md bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Previsto</p>
                <p className="mt-1 text-lg font-bold text-foreground">{formatCurrency(chargeStats.totalAmount)}</p>
              </div>
              <div className="rounded-md bg-success/10 p-3">
                <p className="text-xs text-muted-foreground">Recebido</p>
                <p className="mt-1 text-lg font-bold text-success">{formatCurrency(chargeStats.paidAmount)}</p>
              </div>
              <div className="rounded-md bg-destructive/10 p-3">
                <p className="text-xs text-muted-foreground">Pendente</p>
                <p className="mt-1 text-lg font-bold text-destructive">{formatCurrency(chargeStats.pendingAmount)}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-success text-success-foreground hover:bg-success/90">{chargeStats.pago} pagas</Badge>
              <Badge variant="destructive">{chargeStats.pendente} pendentes</Badge>
              <Badge variant="secondary">{chargeStats.isento} isentas</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2 border-border/70 shadow-sm">
          <CardHeader className="pb-3">
            <SectionHeader title="Movimento mensal" description="Comparação entre receitas e gastos por mês." />
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(v) => `R$${v}`} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="receitas" name="Receitas" fill={COLORS.receita} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="despesas" name="Gastos" fill={COLORS.despesa} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-3">
            <SectionHeader title="Destaques" description="Leitura rápida do período." />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Maior receita</p>
              <p className="text-sm font-semibold">{bestRevenueMonth.month} - {formatCurrency(bestRevenueMonth.receitas)}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Maior gasto</p>
              <p className="text-sm font-semibold">{highestExpenseMonth.month} - {formatCurrency(highestExpenseMonth.despesas)}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Principal categoria</p>
              <p className="text-sm font-semibold">{largestCategory ? `${largestCategory.name} - ${formatCurrency(largestCategory.value)}` : 'Sem gastos'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-3">
            <SectionHeader title="Adimplência" description="Resumo das cobranças do ano." />
          </CardHeader>
          <CardContent>
            {chargeStats.total === 0 ? (
              <EmptyBlock icon={Users} text="Nenhuma cobrança encontrada para este ano" />
            ) : adimplenciaRate === 0 ? (
              <div className="space-y-4 py-4">
                <div className="text-center">
                  <p className="text-5xl font-bold text-destructive">0%</p>
                  <p className="text-sm text-muted-foreground">Nenhuma cobrança paga até agora</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-md bg-destructive/10 p-3 text-center">
                    <p className="text-2xl font-bold text-destructive">{chargeStats.pendente}</p>
                    <p className="text-xs text-muted-foreground">pendentes</p>
                  </div>
                  <div className="rounded-md bg-muted/50 p-3 text-center">
                    <p className="text-2xl font-bold">{formatCurrency(chargeStats.pendingAmount)}</p>
                    <p className="text-xs text-muted-foreground">a receber</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={78} paddingAngle={2} dataKey="value">
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `${value} cobranças`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3">
                  <p className="text-5xl font-bold text-primary">{adimplenciaRate}%</p>
                  <p className="text-sm text-muted-foreground">{paidChargesLabel}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-3">
            <SectionHeader title="Gastos por categoria" description="Onde os recursos foram aplicados." />
          </CardHeader>
          <CardContent>
            {categoryData.length === 0 ? (
              <EmptyBlock icon={PieChartIcon} text="Nenhum gasto registrado para este ano" />
            ) : (
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryData} cx="50%" cy="50%" outerRadius={88} paddingAngle={2} dataKey="value">
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || '#94a3b8'} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-3">
            <SectionHeader title="Receitas" description="Entradas registradas no caixa." />
          </CardHeader>
          <CardContent>
            {receitasTransactions.length === 0 ? (
              <EmptyBlock icon={ArrowUpCircle} text="Nenhuma receita registrada" />
            ) : (
              <div className="overflow-x-auto">
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
                        <TableCell className="text-muted-foreground">{formatDate(tx.date)}</TableCell>
                        <TableCell>{tx.description}</TableCell>
                        <TableCell className="text-right font-medium text-success">{formatCurrency(tx.amount)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell colSpan={2}>Total</TableCell>
                      <TableCell className="text-right text-success">{formatCurrency(totalReceitas)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-3">
            <SectionHeader title="Gastos" description="Saídas registradas no caixa." />
          </CardHeader>
          <CardContent>
            {despesasTransactions.length === 0 ? (
              <EmptyBlock icon={ArrowDownCircle} text="Nenhum gasto registrado" />
            ) : (
              <div className="overflow-x-auto">
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
                        <TableCell className="text-muted-foreground">{formatDate(tx.date)}</TableCell>
                        <TableCell>{tx.description}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" style={{ backgroundColor: `${tx.category_color}20`, color: tx.category_color }}>
                            {tx.category_name}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium text-destructive">{formatCurrency(tx.amount)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell colSpan={3}>Total</TableCell>
                      <TableCell className="text-right text-destructive">{formatCurrency(totalDespesas)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardHeader className="pb-3">
          <SectionHeader title="Comprovantes" description="Anexos dos gastos incluídos no PDF oficial." />
        </CardHeader>
        <CardContent>
          {despesasComComprovante.length === 0 ? (
            <EmptyBlock icon={ImageIcon} text="Nenhum comprovante anexado para este ano" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {despesasComComprovante.map(tx => (
                <button
                  key={tx.id}
                  type="button"
                  className="text-left border rounded-md overflow-hidden bg-background hover:bg-muted/30 transition-colors"
                  onClick={() => handleViewReceipt(tx.receipt_url!)}
                >
                  <div className="border-b px-3 py-2 flex items-center justify-between gap-2 bg-muted/30">
                    <div className="min-w-0">
                      <p className="text-sm font-medium min-w-0 whitespace-normal break-words">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(tx.date)}</p>
                    </div>
                    <p className="text-sm font-bold text-destructive shrink-0">{formatCurrency(tx.amount)}</p>
                  </div>
                  <div className="bg-muted/20 flex items-center justify-center overflow-hidden" style={{ minHeight: '180px' }}>
                    {tx.receipt_url?.toLowerCase().includes('.pdf') ? (
                      <div className="text-center p-6">
                        <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
                        <p className="text-xs mt-2 text-muted-foreground">PDF anexado</p>
                      </div>
                    ) : signedUrls[tx.id] ? (
                      <img
                        src={signedUrls[tx.id]}
                        alt={tx.description}
                        crossOrigin="anonymous"
                        className="w-full h-auto max-h-[300px] object-contain"
                      />
                    ) : (
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
