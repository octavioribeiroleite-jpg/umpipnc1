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

const PDF_COLORS = {
  ink: [18, 31, 27] as [number, number, number],
  muted: [96, 118, 108] as [number, number, number],
  border: [211, 224, 217] as [number, number, number],
  soft: [244, 248, 246] as [number, number, number],
  green: [22, 163, 74] as [number, number, number],
  red: [220, 38, 38] as [number, number, number],
  amber: [217, 119, 6] as [number, number, number],
  blue: [37, 99, 235] as [number, number, number],
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

const toLocalDate = (value: string) => new Date(`${value}T12:00:00`);
const formatDate = (value: string) => toLocalDate(value).toLocaleDateString('pt-BR');
const formatCurrency = (v: number) => `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`;
const formatSignedCurrency = (v: number) => `${v < 0 ? '-' : ''}${formatCurrency(Math.abs(v))}`;

const hexToRgb = (hex: string): [number, number, number] => {
  const clean = hex.replace('#', '').slice(0, 6);
  if (clean.length !== 6) return [148, 163, 184];
  return [parseInt(clean.slice(0, 2), 16), parseInt(clean.slice(2, 4), 16), parseInt(clean.slice(4, 6), 16)];
};

const blobToDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = reject;
  reader.readAsDataURL(blob);
});

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

  // Load signed URLs for receipt previews on screen.
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

    const stats: ChargeStats = {
      total: charges?.length || 0,
      pago: (charges || []).filter(c => c.status === 'pago').length,
      pendente: (charges || []).filter(c => c.status === 'pendente').length,
      isento: (charges || []).filter(c => c.status === 'isento').length,
      totalAmount: (charges || []).filter(c => c.status !== 'isento').reduce((s, c) => s + Number(c.amount), 0),
      paidAmount: (charges || []).filter(c => c.status === 'pago').reduce((s, c) => s + Number(c.paid_amount || c.amount), 0),
      pendingAmount: (charges || []).filter(c => c.status === 'pendente').reduce((s, c) => s + Number(c.amount), 0),
    };
    setChargeStats(stats);
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
        const d = toLocalDate(t.date);
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

  const getSignedUrl = async (url: string): Promise<string> => {
    const match = url.match(/\/receipts\/(.+)$/);
    if (!match) return url;
    const path = match[1];
    const { data, error } = await supabase.storage.from('receipts').createSignedUrl(path, 3600);
    if (error) throw error;
    return data?.signedUrl || url;
  };

  const handleViewReceipt = async (url: string) => {
    const signedUrl = await getSignedUrl(url);
    if (url.toLowerCase().includes('.pdf')) {
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
    setExporting(true);
    toast.info('Gerando relatório completo, aguarde...');

    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 14;
      const contentWidth = pageWidth - margin * 2;
      let pageNumber = 1;
      let y = margin;

      const setColor = (color: [number, number, number]) => pdf.setTextColor(color[0], color[1], color[2]);
      const setFill = (color: [number, number, number]) => pdf.setFillColor(color[0], color[1], color[2]);
      const setDraw = (color: [number, number, number]) => pdf.setDrawColor(color[0], color[1], color[2]);

      const footer = () => {
        setDraw(PDF_COLORS.border);
        pdf.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        setColor(PDF_COLORS.muted);
        pdf.text(`Relatorio financeiro ${selectedYear}`, margin, pageHeight - 7);
        pdf.text(`Pagina ${pageNumber}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
      };

      const addPage = () => {
        footer();
        pdf.addPage();
        pageNumber += 1;
        y = margin;
      };

      const ensure = (height: number) => {
        if (y + height > pageHeight - 18) addPage();
      };

      const sectionTitle = (title: string, subtitle?: string) => {
        ensure(subtitle ? 18 : 12);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        setColor(PDF_COLORS.ink);
        pdf.text(title, margin, y);
        y += 6;
        if (subtitle) {
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(9);
          setColor(PDF_COLORS.muted);
          pdf.text(subtitle, margin, y);
          y += 5;
        }
        setDraw(PDF_COLORS.border);
        pdf.line(margin, y, pageWidth - margin, y);
        y += 6;
      };

      const statCard = (x: number, width: number, title: string, value: string, color: [number, number, number]) => {
        setFill(PDF_COLORS.soft);
        setDraw(PDF_COLORS.border);
        pdf.roundedRect(x, y, width, 27, 2, 2, 'FD');
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        setColor(PDF_COLORS.muted);
        pdf.text(title, x + 4, y + 8);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(13);
        setColor(color);
        pdf.text(value, x + 4, y + 19, { maxWidth: width - 8 });
      };

      const table = (
        title: string,
        headers: string[],
        rows: string[][],
        widths: number[],
        options?: { total?: string; accent?: [number, number, number] }
      ) => {
        sectionTitle(title);
        const rowHeight = 8;
        const drawHeader = () => {
          ensure(rowHeight + 2);
          setFill(PDF_COLORS.soft);
          setDraw(PDF_COLORS.border);
          pdf.rect(margin, y, contentWidth, rowHeight, 'FD');
          let x = margin;
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(8);
          setColor(PDF_COLORS.ink);
          headers.forEach((h, i) => {
            pdf.text(h, x + 2, y + 5.3, { maxWidth: widths[i] - 4 });
            x += widths[i];
          });
          y += rowHeight;
        };

        drawHeader();
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        rows.forEach((row, rowIndex) => {
          const lineCounts = row.map((cell, i) => pdf.splitTextToSize(cell || '-', widths[i] - 4).length);
          const h = Math.max(rowHeight, Math.max(...lineCounts) * 4.1 + 4);
          if (y + h > pageHeight - 20) {
            addPage();
            drawHeader();
          }
          if (rowIndex % 2 === 1) {
            setFill([249, 251, 250]);
            pdf.rect(margin, y, contentWidth, h, 'F');
          }
          setDraw(PDF_COLORS.border);
          pdf.line(margin, y + h, pageWidth - margin, y + h);
          let x = margin;
          row.forEach((cell, i) => {
            setColor(PDF_COLORS.ink);
            const alignRight = i === row.length - 1;
            const lines = pdf.splitTextToSize(cell || '-', widths[i] - 4);
            pdf.text(lines, alignRight ? x + widths[i] - 2 : x + 2, y + 5.3, {
              align: alignRight ? 'right' : 'left',
              maxWidth: widths[i] - 4,
            });
            x += widths[i];
          });
          y += h;
        });

        if (options?.total) {
          ensure(9);
          setFill(PDF_COLORS.soft);
          pdf.rect(margin, y, contentWidth, 9, 'F');
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(9);
          setColor(options.accent || PDF_COLORS.ink);
          pdf.text(options.total, pageWidth - margin - 2, y + 6, { align: 'right' });
          y += 13;
        } else {
          y += 4;
        }
      };

      const drawMonthlyBars = () => {
        sectionTitle('Evolucao mensal', 'Receitas, gastos e saldo por mes no ano selecionado.');
        const chartX = margin;
        const chartY = y;
        const chartH = 58;
        const maxValue = Math.max(1, ...monthlyData.flatMap(m => [m.receitas, m.despesas]));
        const barGroup = contentWidth / 12;
        setDraw(PDF_COLORS.border);
        pdf.line(chartX, chartY + chartH, chartX + contentWidth, chartY + chartH);
        monthlyData.forEach((m, i) => {
          const x = chartX + i * barGroup + 2;
          const receitaH = (m.receitas / maxValue) * (chartH - 12);
          const despesaH = (m.despesas / maxValue) * (chartH - 12);
          setFill(PDF_COLORS.green);
          pdf.rect(x, chartY + chartH - receitaH, 3.5, receitaH, 'F');
          setFill(PDF_COLORS.red);
          pdf.rect(x + 4.5, chartY + chartH - despesaH, 3.5, despesaH, 'F');
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(6.5);
          setColor(PDF_COLORS.muted);
          pdf.text(m.month, x, chartY + chartH + 5);
        });
        y += chartH + 13;
        pdf.setFontSize(8);
        setColor(PDF_COLORS.green);
        pdf.text('Verde: receitas', margin, y);
        setColor(PDF_COLORS.red);
        pdf.text('Vermelho: gastos', margin + 32, y);
        y += 8;
      };

      const drawCategoryBreakdown = () => {
        table(
          'Gastos por categoria',
          ['Categoria', 'Valor', '% dos gastos'],
          categoryData.map(c => [
            c.name,
            formatCurrency(c.value),
            totalDespesas > 0 ? `${((c.value / totalDespesas) * 100).toFixed(1).replace('.', ',')}%` : '0%'
          ]),
          [contentWidth * 0.54, contentWidth * 0.23, contentWidth * 0.23],
          { total: `Total de gastos: ${formatCurrency(totalDespesas)}`, accent: PDF_COLORS.red }
        );
      };

      const addReceiptImage = async (tx: TransactionWithReceipt, url: string) => {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Falha ao baixar comprovante');
        const dataUrl = await blobToDataUrl(await response.blob());
        const props = (pdf as any).getImageProperties(dataUrl);
        const maxW = contentWidth;
        const maxH = pageHeight - 62;
        let imgW = maxW;
        let imgH = (props.height * imgW) / props.width;
        if (imgH > maxH) {
          imgH = maxH;
          imgW = (props.width * imgH) / props.height;
        }
        const x = margin + (contentWidth - imgW) / 2;
        pdf.addImage(dataUrl, props.fileType || 'JPEG', x, y, imgW, imgH);
        y += imgH + 6;
      };

      const addReceiptPage = async (tx: TransactionWithReceipt, index: number) => {
        addPage();
        sectionTitle(`Anexo ${index + 1}: ${tx.description}`, `${formatDate(tx.date)} - ${formatCurrency(tx.amount)}`);
        if (!tx.receipt_url) return;
        try {
          const signedUrl = await getSignedUrl(tx.receipt_url);
          if (tx.receipt_url.toLowerCase().includes('.pdf')) {
            setFill(PDF_COLORS.soft);
            setDraw(PDF_COLORS.border);
            pdf.roundedRect(margin, y, contentWidth, 46, 2, 2, 'FD');
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(13);
            setColor(PDF_COLORS.ink);
            pdf.text('Comprovante em PDF anexado ao sistema', margin + 5, y + 12);
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(9);
            setColor(PDF_COLORS.muted);
            pdf.text('Abra o comprovante original pelo link abaixo. O arquivo permanece salvo nos anexos do gasto.', margin + 5, y + 21, { maxWidth: contentWidth - 10 });
            setColor(PDF_COLORS.blue);
            (pdf as any).textWithLink('Abrir comprovante original', margin + 5, y + 34, { url: signedUrl });
            y += 54;
          } else {
            await addReceiptImage(tx, signedUrl);
          }
        } catch (error) {
          console.error('Erro ao inserir comprovante:', error);
          setFill(PDF_COLORS.soft);
          setDraw(PDF_COLORS.border);
          pdf.roundedRect(margin, y, contentWidth, 30, 2, 2, 'FD');
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(9);
          setColor(PDF_COLORS.red);
          pdf.text('Nao foi possivel carregar este comprovante durante a exportacao.', margin + 5, y + 13, { maxWidth: contentWidth - 10 });
          y += 38;
        }
      };

      // Cover
      setFill([237, 245, 241]);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(24);
      setColor(PDF_COLORS.ink);
      pdf.text('Relatorio Financeiro Anual', margin, 48);
      pdf.setFontSize(32);
      pdf.text(selectedYear, margin, 65);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(11);
      setColor(PDF_COLORS.muted);
      pdf.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} as ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, margin, 76);
      setFill([255, 255, 255]);
      pdf.roundedRect(margin, 100, contentWidth, 72, 3, 3, 'F');
      y = 116;
      const cardW = (contentWidth - 9) / 4;
      statCard(margin, cardW, 'Saldo do ano', formatSignedCurrency(saldo), saldo >= 0 ? PDF_COLORS.green : PDF_COLORS.red);
      statCard(margin + cardW + 3, cardW, 'Receitas', formatCurrency(totalReceitas), PDF_COLORS.green);
      statCard(margin + (cardW + 3) * 2, cardW, 'Gastos', formatCurrency(totalDespesas), PDF_COLORS.red);
      statCard(margin + (cardW + 3) * 3, cardW, 'Adimplencia', `${adimplenciaRate}%`, PDF_COLORS.blue);
      y = 190;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      setColor(PDF_COLORS.muted);
      pdf.text('Documento gerado automaticamente a partir das transacoes, cobrancas e comprovantes cadastrados no sistema.', margin, y, { maxWidth: contentWidth });

      addPage();

      sectionTitle('Resumo executivo', 'Visao consolidada do caixa real e das cobrancas do periodo.');
      statCard(margin, cardW, 'Saldo', formatSignedCurrency(saldo), saldo >= 0 ? PDF_COLORS.green : PDF_COLORS.red);
      statCard(margin + cardW + 3, cardW, 'Total receitas', formatCurrency(totalReceitas), PDF_COLORS.green);
      statCard(margin + (cardW + 3) * 2, cardW, 'Total gastos', formatCurrency(totalDespesas), PDF_COLORS.red);
      statCard(margin + (cardW + 3) * 3, cardW, 'Comprovantes', String(despesasComComprovante.length), PDF_COLORS.blue);
      y += 35;

      table(
        'Cobrancas e adimplencia',
        ['Indicador', 'Quantidade', 'Valor'],
        [
          ['Pagas', String(chargeStats.pago), formatCurrency(chargeStats.paidAmount)],
          ['Pendentes', String(chargeStats.pendente), formatCurrency(chargeStats.pendingAmount)],
          ['Isentas', String(chargeStats.isento), '-'],
          ['Total previsto', String(chargeStats.total), formatCurrency(chargeStats.totalAmount)],
        ],
        [contentWidth * 0.48, contentWidth * 0.22, contentWidth * 0.30]
      );

      drawMonthlyBars();
      table(
        'Resumo mensal',
        ['Mes', 'Receitas', 'Gastos', 'Saldo'],
        monthlyData.map(m => [m.month, formatCurrency(m.receitas), formatCurrency(m.despesas), formatSignedCurrency(m.saldo)]),
        [contentWidth * 0.20, contentWidth * 0.27, contentWidth * 0.27, contentWidth * 0.26]
      );

      drawCategoryBreakdown();

      table(
        'Receitas detalhadas',
        ['Data', 'Descricao', 'Valor'],
        receitasTransactions.map(tx => [formatDate(tx.date), tx.description, formatCurrency(tx.amount)]),
        [contentWidth * 0.20, contentWidth * 0.58, contentWidth * 0.22],
        { total: `Total de receitas: ${formatCurrency(totalReceitas)}`, accent: PDF_COLORS.green }
      );

      table(
        'Gastos detalhados',
        ['Data', 'Descricao', 'Categoria', 'Valor'],
        despesasTransactions.map(tx => [formatDate(tx.date), tx.description, tx.category_name, formatCurrency(tx.amount)]),
        [contentWidth * 0.16, contentWidth * 0.44, contentWidth * 0.22, contentWidth * 0.18],
        { total: `Total de gastos: ${formatCurrency(totalDespesas)}`, accent: PDF_COLORS.red }
      );

      if (despesasComComprovante.length > 0) {
        sectionTitle('Indice de comprovantes', 'Cada comprovante cadastrado aparece nas paginas de anexo a seguir.');
        table(
          'Comprovantes anexados',
          ['#', 'Data', 'Descricao', 'Valor'],
          despesasComComprovante.map((tx, index) => [String(index + 1), formatDate(tx.date), tx.description, formatCurrency(tx.amount)]),
          [contentWidth * 0.10, contentWidth * 0.18, contentWidth * 0.52, contentWidth * 0.20]
        );
        for (let i = 0; i < despesasComComprovante.length; i += 1) {
          await addReceiptPage(despesasComComprovante[i], i);
        }
      } else {
        sectionTitle('Comprovantes');
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        setColor(PDF_COLORS.muted);
        pdf.text('Nenhum comprovante foi anexado aos gastos deste periodo.', margin, y);
      }

      footer();
      pdf.save(`Relatorio_Financeiro_${selectedYear}.pdf`);
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
              Exportar PDF completo
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Conteúdo do Relatório */}
      <div className="space-y-6 bg-background p-4 rounded-lg">
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
                        <TableCell className="text-muted-foreground">{formatDate(tx.date)}</TableCell>
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
                        <TableCell className="text-muted-foreground">{formatDate(tx.date)}</TableCell>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {despesasComComprovante.map(tx => (
                  <div key={tx.id} className="border rounded-lg overflow-hidden bg-white cursor-pointer break-inside-avoid" onClick={() => handleViewReceipt(tx.receipt_url!)}>
                    <div className="border-b px-3 py-2 flex items-center justify-between gap-2 bg-muted/30">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{tx.description}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(tx.date)}</p>
                      </div>
                      <p className="text-sm font-bold text-destructive shrink-0">{formatCurrency(tx.amount)}</p>
                    </div>
                    <div className="bg-muted/20 flex items-center justify-center overflow-hidden" style={{ minHeight: '220px' }}>
                      {tx.receipt_url?.toLowerCase().includes('.pdf') ? (
                        <div className="text-center p-6">
                          <FileText className="h-14 w-14 mx-auto text-muted-foreground" />
                          <p className="text-xs mt-2 text-muted-foreground">Comprovante em PDF — toque para abrir</p>
                        </div>
                      ) : signedUrls[tx.id] ? (
                        <img
                          src={signedUrls[tx.id]}
                          alt={tx.description}
                          crossOrigin="anonymous"
                          className="w-full h-auto max-h-[360px] object-contain"
                        />
                      ) : (
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      )}
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
