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
  green: [22, 128, 82] as [number, number, number],
  red: [190, 54, 54] as [number, number, number],
  blue: [46, 92, 170] as [number, number, number],
  gold: [179, 139, 61] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
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

  const panelStart = () => {
    ensure(24);
    return y;
  };

  const panelEnd = (startY: number) => {
    setDraw(PDF_COLORS.border);
    pdf.roundedRect(margin, startY, contentWidth, Math.max(8, y - startY), 3, 3, 'S');
    y += 5;
  };

  const panelTitle = (title: string, subtitle?: string) => {
    setFill([236, 243, 239]);
    setDraw(PDF_COLORS.border);
    pdf.roundedRect(margin, y, contentWidth, subtitle ? 20 : 15, 3, 3, 'FD');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    setColor(PDF_COLORS.ink);
    pdf.text(title, margin + 5, y + 7);
    if (subtitle) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8.5);
      setColor(PDF_COLORS.muted);
      pdf.text(subtitle, margin + 5, y + 14, { maxWidth: contentWidth - 10 });
    }
    y += subtitle ? 24 : 19;
  };

  const sectionTitle = (title: string, subtitle?: string) => {
    const start = panelStart();
    panelTitle(title, subtitle);
    return start;
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

  const miniCard = (x: number, width: number, title: string, value: string, color: [number, number, number]) => {
    setFill(PDF_COLORS.white);
    setDraw(PDF_COLORS.border);
    pdf.roundedRect(x, y, width, 22, 2, 2, 'FD');
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    setColor(PDF_COLORS.muted);
    pdf.text(title, x + 3, y + 7);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10.5);
    setColor(color);
    pdf.text(value, x + 3, y + 16, { maxWidth: width - 6 });
  };

  const coverMetricCard = (x: number, top: number, width: number, title: string, value: string, color: [number, number, number]) => {
    setFill(PDF_COLORS.white);
    setDraw(PDF_COLORS.border);
    pdf.roundedRect(x, top, width, 30, 2.5, 2.5, 'FD');
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.8);
    setColor(PDF_COLORS.muted);
    pdf.text(title, x + 4, top + 8);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12.2);
    setColor(color);
    pdf.text(value, x + 4, top + 20, { maxWidth: width - 8 });
  };

  const coverDetail = (x: number, top: number, width: number, label: string, value: string, color: [number, number, number]) => {
    setFill([248, 251, 249]);
    setDraw(PDF_COLORS.border);
    pdf.roundedRect(x, top, width, 18, 2, 2, 'FD');
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.6);
    setColor(PDF_COLORS.muted);
    pdf.text(label, x + 4, top + 7);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9.2);
    setColor(color);
    pdf.text(value, x + width - 4, top + 12.5, { align: 'right', maxWidth: width - 8 });
  };

  const paragraph = (text: string, x = margin + 5, width = contentWidth - 10) => {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9.5);
    setColor(PDF_COLORS.ink);
    const lines = pdf.splitTextToSize(text, width);
    ensure(lines.length * 5 + 3);
    pdf.text(lines, x, y);
    y += lines.length * 5 + 5;
  };

  const table = (
    title: string,
    headers: string[],
    rows: string[][],
    widths: number[],
    options?: { total?: string; accent?: [number, number, number]; subtitle?: string }
  ) => {
    let currentPanelStart = sectionTitle(title, options?.subtitle);
    const rowHeight = 8;
    const tableX = margin + 5;
    const tableW = contentWidth - 10;
    const drawHeader = () => {
      ensure(rowHeight + 2);
      setFill([236, 243, 239]);
      setDraw(PDF_COLORS.border);
      pdf.rect(tableX, y, tableW, rowHeight, 'FD');
      let x = tableX;
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
        panelEnd(currentPanelStart);
        addPage();
        currentPanelStart = sectionTitle(`${title} (continuacao)`);
        drawHeader();
      }
      if (rowIndex % 2 === 1) {
        setFill([249, 251, 250]);
        pdf.rect(tableX, y, tableW, h, 'F');
      }
      setDraw(PDF_COLORS.border);
      pdf.line(tableX, y + h, tableX + tableW, y + h);
      let x = tableX;
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
      pdf.rect(tableX, y, tableW, 9, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      setColor(options.accent || PDF_COLORS.ink);
      pdf.text(options.total, tableX + tableW - 2, y + 6, { align: 'right' });
      y += 13;
    } else {
      y += 4;
    }
    panelEnd(currentPanelStart);
  };

  const drawMonthlyBars = () => {
    const start = sectionTitle('Evolucao mensal', 'Receitas e gastos em barras, separados por mes.');
    const chartX = margin + 7;
    const chartY = y;
    const chartW = contentWidth - 14;
    const chartH = 62;
    const maxValue = Math.max(1, ...monthlyData.flatMap(m => [m.receitas, m.despesas]));
    const barGroup = chartW / 12;
    setDraw(PDF_COLORS.border);
    pdf.line(chartX, chartY + chartH, chartX + chartW, chartY + chartH);
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
    pdf.text('Verde: receitas', margin + 7, y);
    setColor(PDF_COLORS.red);
    pdf.text('Vermelho: gastos', margin + 42, y);
    y += 8;
    panelEnd(start);
  };

  const addReceiptImage = async (url: string) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Falha ao baixar comprovante');
    const dataUrl = await blobToDataUrl(await response.blob());
    const props = (pdf as any).getImageProperties(dataUrl);
    const maxW = contentWidth - 16;
    const maxH = pageHeight - 72;
    let imgW = maxW;
    let imgH = (props.height * imgW) / props.width;
    if (imgH > maxH) {
      imgH = maxH;
      imgW = (props.width * imgH) / props.height;
    }
    const x = margin + (contentWidth - imgW) / 2;
    setDraw(PDF_COLORS.border);
    pdf.roundedRect(x - 3, y - 3, imgW + 6, imgH + 6, 2, 2, 'S');
    pdf.link(x - 3, y - 3, imgW + 6, imgH + 6, { url });
    pdf.addImage(dataUrl, props.fileType || 'JPEG', x, y, imgW, imgH);
    y += imgH + 10;
  };

  const receiptButton = (label: string, x: number, btnY: number, url: string, color: [number, number, number], width = 38) => {
    setFill(color);
    setDraw(color);
    pdf.roundedRect(x, btnY, width, 10, 2, 2, 'FD');
    pdf.link(x, btnY, width, 10, { url });
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.2);
    setColor(PDF_COLORS.white);
    pdf.text(label, x + width / 2, btnY + 6.4, { align: 'center' });
  };

  const receiptCard = async (tx: TransactionWithReceipt, index: number) => {
    if (!tx.receipt_url) return;
    const signedUrl = await getSignedUrl(tx.receipt_url);
    const isPdf = tx.receipt_url.toLowerCase().includes('.pdf');
    const cardX = margin + 5;
    const cardW = contentWidth - 10;
    const buttonW = 38;
    const buttonX = cardX + cardW - buttonW - 7;
    const textW = buttonX - cardX - 13;
    const titleLines = pdf.splitTextToSize(`${index + 1}. ${tx.description}`, textW);
    const h = Math.max(24, titleLines.length * 4.2 + 15);
    ensure(h + 4);

    setFill(PDF_COLORS.white);
    setDraw(PDF_COLORS.border);
    pdf.roundedRect(cardX, y, cardW, h, 2, 2, 'FD');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.8);
    setColor(PDF_COLORS.ink);
    pdf.text(titleLines, cardX + 6, y + 7);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.8);
    setColor(PDF_COLORS.muted);
    pdf.text(`${formatDate(tx.date)} | ${tx.category_name || 'Sem categoria'} | ${formatCurrency(tx.amount)}`, cardX + 6, y + h - 7, { maxWidth: textW });

    receiptButton(isPdf ? 'Abrir PDF' : 'Abrir imagem', buttonX, y + (h - 10) / 2, signedUrl, isPdf ? PDF_COLORS.blue : PDF_COLORS.green, buttonW);
    y += h + 4;
  };

  const addPdfPlaceholder = (url: string) => {
    ensure(42);
    const boxX = margin + 5;
    const boxW = contentWidth - 10;
    setFill(PDF_COLORS.soft);
    setDraw(PDF_COLORS.border);
    pdf.roundedRect(boxX, y, boxW, 36, 2, 2, 'FD');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9.5);
    setColor(PDF_COLORS.ink);
    pdf.text('Previa do PDF', boxX + 6, y + 9);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    setColor(PDF_COLORS.muted);
    pdf.text('Para ver o comprovante completo, clique no botao ao lado. A imagem interna do PDF pode ser adicionada em uma proxima etapa com renderizacao de PDF.', boxX + 6, y + 18, { maxWidth: boxW - 58 });
    receiptButton('Abrir PDF', boxX + boxW - 45, y + 13, url, PDF_COLORS.blue, 38);
    y += 42;
  };

  const addReceiptPage = async (tx: TransactionWithReceipt, index: number) => {
    addPage();
    const start = sectionTitle(`Anexo ${index + 1}: comprovante`, 'Cada anexo fica em sua propria caixa para facilitar a conferencia.');
    try {
      await receiptCard(tx, index);
      if (tx.receipt_url) {
        const signedUrl = await getSignedUrl(tx.receipt_url);
        if (tx.receipt_url.toLowerCase().includes('.pdf')) {
          addPdfPlaceholder(signedUrl);
        } else {
          await addReceiptImage(signedUrl);
        }
      }
    } catch (error) {
      console.error('Erro ao inserir comprovante:', error);
      setFill(PDF_COLORS.soft);
      setDraw(PDF_COLORS.border);
      pdf.roundedRect(margin + 5, y, contentWidth - 10, 30, 2, 2, 'FD');
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      setColor(PDF_COLORS.red);
      pdf.text('Nao foi possivel carregar este comprovante durante a exportacao.', margin + 10, y + 13, { maxWidth: contentWidth - 20 });
      y += 38;
    }
    panelEnd(start);
  };

  setFill([237, 245, 241]);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');
  setFill(PDF_COLORS.green);
  pdf.rect(0, 0, 8, pageHeight, 'F');
  setFill(PDF_COLORS.gold);
  pdf.rect(8, 0, 2, pageHeight, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10.5);
  setColor(PDF_COLORS.muted);
  pdf.text('PRESTACAO DE CONTAS', margin + 5, 34);
  pdf.setFontSize(24);
  setColor(PDF_COLORS.ink);
  pdf.text('Relatorio Financeiro', margin + 5, 49);
  pdf.setFontSize(32);
  pdf.text(selectedYear, margin + 5, 65);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10.5);
  setColor(PDF_COLORS.muted);
  pdf.text('Resumo geral para conferencia, reuniao e arquivo da igreja.', margin + 5, 78);
  pdf.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} as ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, margin + 5, 86);

  const cardW = (contentWidth - 14) / 4;
  const coverPanelX = margin + 5;
  const coverPanelY = 108;
  const coverPanelW = contentWidth - 5;
  setFill(PDF_COLORS.white);
  setDraw(PDF_COLORS.border);
  pdf.roundedRect(coverPanelX, coverPanelY, coverPanelW, 106, 4, 4, 'FD');

  setFill(PDF_COLORS.green);
  pdf.roundedRect(coverPanelX, coverPanelY, 4, 106, 4, 4, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  setColor(PDF_COLORS.ink);
  pdf.text('Resumo geral do ano', coverPanelX + 10, coverPanelY + 14);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.8);
  setColor(PDF_COLORS.muted);
  const coverSummary = `O periodo encerra com saldo de ${formatSignedCurrency(saldo)}, formado por ${formatCurrency(totalReceitas)} em receitas e ${formatCurrency(totalDespesas)} em gastos registrados. Este quadro resume os principais pontos para leitura rapida antes do detalhamento.`;
  pdf.text(pdf.splitTextToSize(coverSummary, coverPanelW - 20), coverPanelX + 10, coverPanelY + 24);

  const coverCardY = coverPanelY + 42;
  const coverCardGap = 3;
  const coverCardW = (coverPanelW - 20 - coverCardGap * 3) / 4;
  coverMetricCard(coverPanelX + 10, coverCardY, coverCardW, 'Saldo do ano', formatSignedCurrency(saldo), saldo >= 0 ? PDF_COLORS.green : PDF_COLORS.red);
  coverMetricCard(coverPanelX + 10 + (coverCardW + coverCardGap), coverCardY, coverCardW, 'Receitas', formatCurrency(totalReceitas), PDF_COLORS.green);
  coverMetricCard(coverPanelX + 10 + (coverCardW + coverCardGap) * 2, coverCardY, coverCardW, 'Gastos', formatCurrency(totalDespesas), PDF_COLORS.red);
  coverMetricCard(coverPanelX + 10 + (coverCardW + coverCardGap) * 3, coverCardY, coverCardW, 'Adimplencia', `${adimplenciaRate}%`, PDF_COLORS.blue);

  const detailW = (coverPanelW - 30) / 3;
  const detailY = coverPanelY + 80;
  coverDetail(coverPanelX + 10, detailY, detailW, 'Cobrancas recebidas', formatCurrency(chargeStats.paidAmount), PDF_COLORS.green);
  coverDetail(coverPanelX + 15 + detailW, detailY, detailW, 'Cobrancas pendentes', formatCurrency(chargeStats.pendingAmount), PDF_COLORS.red);
  coverDetail(coverPanelX + 20 + detailW * 2, detailY, detailW, 'Comprovantes', String(despesasComComprovante.length), PDF_COLORS.blue);

  setFill(PDF_COLORS.white);
  setDraw(PDF_COLORS.border);
  pdf.roundedRect(margin + 5, 228, contentWidth - 5, 24, 3, 3, 'FD');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9.2);
  setColor(PDF_COLORS.ink);
  pdf.text('Sistema de Gestao Financeira', margin + 11, 238);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.4);
  setColor(PDF_COLORS.muted);
  pdf.text('Relatorio gerado automaticamente com base nos lancamentos cadastrados.', margin + 11, 246);

  addPage();

  let start = sectionTitle('Resumo executivo', 'Visao consolidada do caixa real, cobrancas e comprovantes do periodo.');
  paragraph(`No ano de ${selectedYear}, foram registradas receitas de ${formatCurrency(totalReceitas)} e gastos de ${formatCurrency(totalDespesas)}, resultando em saldo de ${formatSignedCurrency(saldo)}. A adimplencia do periodo ficou em ${adimplenciaRate}%, considerando as cobrancas cadastradas no sistema.`);
  statCard(margin + 5, cardW, 'Saldo', formatSignedCurrency(saldo), saldo >= 0 ? PDF_COLORS.green : PDF_COLORS.red);
  statCard(margin + 8 + cardW, cardW, 'Total receitas', formatCurrency(totalReceitas), PDF_COLORS.green);
  statCard(margin + 11 + (cardW * 2), cardW, 'Total gastos', formatCurrency(totalDespesas), PDF_COLORS.red);
  statCard(margin + 14 + (cardW * 3), cardW, 'Comprovantes', String(despesasComComprovante.length), PDF_COLORS.blue);
  y += 34;
  panelEnd(start);

  start = sectionTitle('Caixa real', 'Entradas, saidas e saldo final registrados como transacoes.');
  const miniW = (contentWidth - 22) / 3;
  miniCard(margin + 5, miniW, 'Entradas', formatCurrency(totalReceitas), PDF_COLORS.green);
  miniCard(margin + 10 + miniW, miniW, 'Saidas', formatCurrency(totalDespesas), PDF_COLORS.red);
  miniCard(margin + 15 + miniW * 2, miniW, 'Saldo', formatSignedCurrency(saldo), saldo >= 0 ? PDF_COLORS.green : PDF_COLORS.red);
  y += 27;
  panelEnd(start);

  start = sectionTitle('Cobrancas', 'Valores previstos, recebidos e pendentes das cobrancas.');
  miniCard(margin + 5, miniW, 'Previsto', formatCurrency(chargeStats.totalAmount), PDF_COLORS.ink);
  miniCard(margin + 10 + miniW, miniW, 'Recebido', formatCurrency(chargeStats.paidAmount), PDF_COLORS.green);
  miniCard(margin + 15 + miniW * 2, miniW, 'Pendente', formatCurrency(chargeStats.pendingAmount), PDF_COLORS.red);
  y += 27;
  panelEnd(start);

  table('Destaques do periodo', ['Indicador', 'Resultado'], [
    ['Maior categoria de gasto', maiorCategoria ? `${maiorCategoria.name} - ${formatCurrency(maiorCategoria.value)}` : 'Sem gastos cadastrados'],
    ['Mes com maior receita', `${maiorReceitaMes.month} - ${formatCurrency(maiorReceitaMes.receitas)}`],
    ['Mes com maior gasto', `${maiorGastoMes.month} - ${formatCurrency(maiorGastoMes.despesas)}`],
    ['Saldo medio mensal', formatSignedCurrency(saldoMedio)],
  ], [contentWidth * 0.39, contentWidth * 0.55]);

  table('Cobrancas e adimplencia', ['Indicador', 'Quantidade', 'Valor'], [
    ['Pagas', String(chargeStats.pago), formatCurrency(chargeStats.paidAmount)],
    ['Pendentes', String(chargeStats.pendente), formatCurrency(chargeStats.pendingAmount)],
    ['Isentas', String(chargeStats.isento), '-'],
    ['Total previsto', String(chargeStats.total), formatCurrency(chargeStats.totalAmount)],
  ], [contentWidth * 0.45, contentWidth * 0.20, contentWidth * 0.29]);

  drawMonthlyBars();
  table('Resumo mensal', ['Mes', 'Receitas', 'Gastos', 'Saldo'], monthlyData.map(m => [m.month, formatCurrency(m.receitas), formatCurrency(m.despesas), formatSignedCurrency(m.saldo)]), [contentWidth * 0.18, contentWidth * 0.25, contentWidth * 0.25, contentWidth * 0.26]);

  table('Gastos por categoria', ['Categoria', 'Valor', '% dos gastos'], categoryData.map(c => [
    c.name,
    formatCurrency(c.value),
    totalDespesas > 0 ? `${((c.value / totalDespesas) * 100).toFixed(1).replace('.', ',')}%` : '0%'
  ]), [contentWidth * 0.51, contentWidth * 0.22, contentWidth * 0.21], { total: `Total de gastos: ${formatCurrency(totalDespesas)}`, accent: PDF_COLORS.red });

  table('Receitas detalhadas', ['Data', 'Descricao', 'Valor'], receitasTransactions.map(tx => [formatDate(tx.date), tx.description, formatCurrency(tx.amount)]), [contentWidth * 0.18, contentWidth * 0.56, contentWidth * 0.20], { total: `Total de receitas: ${formatCurrency(totalReceitas)}`, accent: PDF_COLORS.green });

  table('Gastos detalhados', ['Data', 'Descricao', 'Categoria', 'Valor'], despesasTransactions.map(tx => [formatDate(tx.date), tx.description, tx.category_name, formatCurrency(tx.amount)]), [contentWidth * 0.15, contentWidth * 0.41, contentWidth * 0.20, contentWidth * 0.18], { total: `Total de gastos: ${formatCurrency(totalDespesas)}`, accent: PDF_COLORS.red });

  if (despesasComComprovante.length > 0) {
    start = sectionTitle('Comprovantes', 'Arquivos organizados um abaixo do outro. Use o botao ao lado para abrir cada comprovante.');
    for (let i = 0; i < despesasComComprovante.length; i += 1) {
      try {
        await receiptCard(despesasComComprovante[i], i);
      } catch (error) {
        console.error('Erro ao preparar link do comprovante:', error);
      }
    }
    panelEnd(start);
    for (let i = 0; i < despesasComComprovante.length; i += 1) {
      await addReceiptPage(despesasComComprovante[i], i);
    }
  } else {
    start = sectionTitle('Comprovantes');
    paragraph('Nenhum comprovante foi anexado aos gastos deste periodo.');
    panelEnd(start);
  }

  addPage();
  table('Fechamento para conferencia', ['Item', 'Valor'], [
    ['Total de receitas', formatCurrency(totalReceitas)],
    ['Total de gastos', formatCurrency(totalDespesas)],
    ['Saldo final', formatSignedCurrency(saldo)],
    ['Comprovantes anexados', String(despesasComComprovante.length)],
  ], [contentWidth * 0.52, contentWidth * 0.42], { subtitle: 'Espaco reservado para validacao e arquivo interno.' });

  start = sectionTitle('Assinaturas e observacoes');
  y += 4;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  setColor(PDF_COLORS.ink);
  pdf.text('Tesouraria: ________________________________________________', margin + 5, y);
  y += 16;
  pdf.text('Conferido em: ____ / ____ / ______', margin + 5, y);
  y += 16;
  pdf.text('Observacoes:', margin + 5, y);
  y += 7;
  setDraw(PDF_COLORS.border);
  pdf.line(margin + 5, y, pageWidth - margin - 5, y);
  y += 12;
  pdf.line(margin + 5, y, pageWidth - margin - 5, y);
  y += 12;
  pdf.line(margin + 5, y, pageWidth - margin - 5, y);
  y += 5;
  panelEnd(start);

  footer();
  pdf.save(`Relatorio_Financeiro_${selectedYear}.pdf`);
}
