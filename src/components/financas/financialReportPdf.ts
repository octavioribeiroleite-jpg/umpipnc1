import jsPDF from 'jspdf';

export interface ChargeStats {
  total: number;
  pago: number;
  pendente: number;
  isento: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
}

export interface MonthlyData {
  month: string;
  receitas: number;
  despesas: number;
  saldo: number;
}

export interface CategoryData {
  name: string;
  value: number;
  color: string;
}

export interface TransactionWithReceipt {
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

interface ReportPdfInput {
  selectedYear: string;
  chargeStats: ChargeStats;
  monthlyData: MonthlyData[];
  categoryData: CategoryData[];
  receitasTransactions: TransactionWithReceipt[];
  despesasTransactions: TransactionWithReceipt[];
  despesasComComprovante: TransactionWithReceipt[];
  totalReceitas: number;
  totalDespesas: number;
  saldo: number;
  adimplenciaRate: number;
  getSignedUrl: (url: string) => Promise<string>;
}

const PDF_COLORS = {
  ink: [18, 31, 27] as [number, number, number],
  muted: [96, 118, 108] as [number, number, number],
  border: [211, 224, 217] as [number, number, number],
  soft: [244, 248, 246] as [number, number, number],
  paper: [252, 253, 252] as [number, number, number],
  green: [22, 128, 82] as [number, number, number],
  red: [190, 54, 54] as [number, number, number],
  amber: [184, 116, 35] as [number, number, number],
  blue: [46, 92, 170] as [number, number, number],
  gold: [179, 139, 61] as [number, number, number],
};

export const toLocalDate = (value: string) => new Date(`${value}T12:00:00`);
export const formatDate = (value: string) => toLocalDate(value).toLocaleDateString('pt-BR');
export const formatCurrency = (v: number) => `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`;
const formatSignedCurrency = (v: number) => `${v < 0 ? '-' : ''}${formatCurrency(Math.abs(v))}`;

const blobToDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = reject;
  reader.readAsDataURL(blob);
});

export async function generateFinancialReportPdf(input: ReportPdfInput) {
  const {
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
  } = input;

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

  const maiorCategoria = categoryData[0];
  const maiorReceitaMes = monthlyData.reduce((best, m) => (m.receitas > best.receitas ? m : best), monthlyData[0] || { month: '-', receitas: 0, despesas: 0, saldo: 0 });
  const maiorGastoMes = monthlyData.reduce((best, m) => (m.despesas > best.despesas ? m : best), monthlyData[0] || { month: '-', receitas: 0, despesas: 0, saldo: 0 });
  const saldoMedio = monthlyData.length ? monthlyData.reduce((s, m) => s + m.saldo, 0) / monthlyData.length : 0;

  const footer = () => {
    setDraw(PDF_COLORS.border);
    pdf.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    setColor(PDF_COLORS.muted);
    pdf.text(`Relatorio Financeiro Anual - ${selectedYear}`, margin, pageHeight - 7);
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
      pdf.text(subtitle, margin, y, { maxWidth: contentWidth });
      y += 5;
    }
    setDraw(PDF_COLORS.border);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 6;
  };

  const statCard = (x: number, width: number, title: string, value: string, color: [number, number, number]) => {
    setFill(PDF_COLORS.soft);
    setDraw(PDF_COLORS.border);
    pdf.roundedRect(x, y, width, 28, 2, 2, 'FD');
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    setColor(PDF_COLORS.muted);
    pdf.text(title, x + 4, y + 8);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12.5);
    setColor(color);
    pdf.text(value, x + 4, y + 19, { maxWidth: width - 8 });
  };

  const paragraph = (text: string) => {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    setColor(PDF_COLORS.ink);
    const lines = pdf.splitTextToSize(text, contentWidth);
    ensure(lines.length * 5 + 3);
    pdf.text(lines, margin, y);
    y += lines.length * 5 + 5;
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
      setFill([236, 243, 239]);
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
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
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
    sectionTitle('Evolucao mensal', 'Comparativo visual entre receitas e gastos ao longo do ano.');
    const chartX = margin;
    const chartY = y;
    const chartH = 62;
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
    pdf.text('Vermelho: gastos', margin + 34, y);
    y += 8;
  };

  const addReceiptImage = async (url: string) => {
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
    sectionTitle(`Anexo ${index + 1}: ${tx.description}`, `${formatDate(tx.date)} - ${formatCurrency(tx.amount)} - ${tx.category_name}`);
    if (!tx.receipt_url) return;
    try {
      const signedUrl = await getSignedUrl(tx.receipt_url);
      if (tx.receipt_url.toLowerCase().includes('.pdf')) {
        setFill(PDF_COLORS.soft);
        setDraw(PDF_COLORS.border);
        pdf.roundedRect(margin, y, contentWidth, 50, 2, 2, 'FD');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(13);
        setColor(PDF_COLORS.ink);
        pdf.text('Comprovante em PDF anexado ao sistema', margin + 5, y + 12);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        setColor(PDF_COLORS.muted);
        pdf.text('O comprovante original permanece salvo no gasto. Use o link abaixo para abrir o arquivo em PDF.', margin + 5, y + 22, { maxWidth: contentWidth - 10 });
        setColor(PDF_COLORS.blue);
        (pdf as any).textWithLink('Abrir comprovante original', margin + 5, y + 36, { url: signedUrl });
        y += 58;
      } else {
        await addReceiptImage(signedUrl);
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

  // Capa institucional
  setFill([237, 245, 241]);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');
  setFill(PDF_COLORS.green);
  pdf.rect(0, 0, 8, pageHeight, 'F');
  setFill(PDF_COLORS.gold);
  pdf.rect(8, 0, 2, pageHeight, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  setColor(PDF_COLORS.muted);
  pdf.text('PRESTACAO DE CONTAS', margin + 5, 38);
  pdf.setFontSize(25);
  setColor(PDF_COLORS.ink);
  pdf.text('Relatorio Financeiro', margin + 5, 54);
  pdf.setFontSize(34);
  pdf.text(selectedYear, margin + 5, 72);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  setColor(PDF_COLORS.muted);
  pdf.text('Documento para conferencia, reuniao e arquivo da igreja.', margin + 5, 84);
  pdf.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} as ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, margin + 5, 92);

  setFill([255, 255, 255]);
  pdf.roundedRect(margin + 5, 112, contentWidth - 5, 72, 3, 3, 'F');
  y = 128;
  const cardW = (contentWidth - 14) / 4;
  statCard(margin + 10, cardW, 'Saldo do ano', formatSignedCurrency(saldo), saldo >= 0 ? PDF_COLORS.green : PDF_COLORS.red);
  statCard(margin + 10 + cardW + 3, cardW, 'Receitas', formatCurrency(totalReceitas), PDF_COLORS.green);
  statCard(margin + 10 + (cardW + 3) * 2, cardW, 'Gastos', formatCurrency(totalDespesas), PDF_COLORS.red);
  statCard(margin + 10 + (cardW + 3) * 3, cardW, 'Adimplencia', `${adimplenciaRate}%`, PDF_COLORS.blue);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  setColor(PDF_COLORS.muted);
  pdf.text('Sistema de Gestao Financeira', margin + 5, 254);
  pdf.text('Relatorio gerado automaticamente com base nos lancamentos cadastrados.', margin + 5, 260);

  addPage();

  sectionTitle('Resumo executivo', 'Visao consolidada do caixa real, cobrancas e comprovantes do periodo.');
  paragraph(`No ano de ${selectedYear}, foram registradas receitas de ${formatCurrency(totalReceitas)} e gastos de ${formatCurrency(totalDespesas)}, resultando em saldo de ${formatSignedCurrency(saldo)}. A adimplencia do periodo ficou em ${adimplenciaRate}%, considerando as cobrancas cadastradas no sistema.`);
  statCard(margin, cardW, 'Saldo', formatSignedCurrency(saldo), saldo >= 0 ? PDF_COLORS.green : PDF_COLORS.red);
  statCard(margin + cardW + 3, cardW, 'Total receitas', formatCurrency(totalReceitas), PDF_COLORS.green);
  statCard(margin + (cardW + 3) * 2, cardW, 'Total gastos', formatCurrency(totalDespesas), PDF_COLORS.red);
  statCard(margin + (cardW + 3) * 3, cardW, 'Comprovantes', String(despesasComComprovante.length), PDF_COLORS.blue);
  y += 36;

  table(
    'Destaques do periodo',
    ['Indicador', 'Resultado'],
    [
      ['Maior categoria de gasto', maiorCategoria ? `${maiorCategoria.name} - ${formatCurrency(maiorCategoria.value)}` : 'Sem gastos cadastrados'],
      ['Mes com maior receita', `${maiorReceitaMes.month} - ${formatCurrency(maiorReceitaMes.receitas)}`],
      ['Mes com maior gasto', `${maiorGastoMes.month} - ${formatCurrency(maiorGastoMes.despesas)}`],
      ['Saldo medio mensal', formatSignedCurrency(saldoMedio)],
    ],
    [contentWidth * 0.42, contentWidth * 0.58]
  );

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
    paragraph('Nenhum comprovante foi anexado aos gastos deste periodo.');
  }

  addPage();
  sectionTitle('Fechamento para conferencia', 'Espaco reservado para validacao e arquivo interno.');
  table(
    'Resumo final',
    ['Item', 'Valor'],
    [
      ['Total de receitas', formatCurrency(totalReceitas)],
      ['Total de gastos', formatCurrency(totalDespesas)],
      ['Saldo final', formatSignedCurrency(saldo)],
      ['Comprovantes anexados', String(despesasComComprovante.length)],
    ],
    [contentWidth * 0.55, contentWidth * 0.45]
  );
  y += 12;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  setColor(PDF_COLORS.ink);
  pdf.text('Tesouraria: ________________________________________________', margin, y);
  y += 16;
  pdf.text('Conferido em: ____ / ____ / ______', margin, y);
  y += 16;
  pdf.text('Observacoes:', margin, y);
  y += 6;
  setDraw(PDF_COLORS.border);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 12;
  pdf.line(margin, y, pageWidth - margin, y);
  y += 12;
  pdf.line(margin, y, pageWidth - margin, y);

  footer();
  pdf.save(`Relatorio_Financeiro_${selectedYear}.pdf`);
}
