import { jsPDF } from 'jspdf';
import { PDFDocument } from 'pdf-lib';
import { formatCents, formatTreasuryDate, sumCents, type TreasuryEntry, type TreasuryFundInput } from './treasury.ts';

export interface TreasuryAttachment { id: string; entry_id: string; path: string; filename: string; mime_type: string; created_at?: string; active?: boolean }
export interface TreasuryReport { year: number; funds: (TreasuryFundInput & { id: string })[]; entries: TreasuryEntry[]; opening_cents: number; reserved_cents: number; pending_count: number; attachments: TreasuryAttachment[] }
export function reportTotals(report: TreasuryReport) {
  if (report.entries.some(entry => entry.status !== 'confirmed')) throw new Error('O relatório deve conter somente lançamentos confirmados.');
  const income = sumCents(report.entries.filter(e => e.kind === 'income').map(e => e.amount_cents));
  const expense = sumCents(report.entries.filter(e => e.kind === 'expense').map(e => e.amount_cents));
  const closing = sumCents([report.opening_cents, income, -expense]);
  return { income, expense, closing, available: sumCents([closing, -report.reserved_cents]) };
}

/** Layout follows the approved annual PDF: green/gold cover, summary panels,
 * monthly tables, detailed ledger and signatures. No false arrears metrics. */
export async function generateTreasuryReport(report: TreasuryReport, options: { annual?: boolean; loadAttachment?: (attachment: TreasuryAttachment) => Promise<Uint8Array>; generatedAt?: Date } = {}): Promise<Uint8Array> {
  const totals = reportTotals(report);
  const annual = Boolean(options.annual);
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const ink = '#12291f', muted = '#60766c', green = '#168052', red = '#be3636';
  let y = 24;
  const fundName = report.funds.length > 6 ? `${report.funds.length} sociedades` : report.funds.map(f => f.abbreviation).join(' / ');
  const plain = (value: string) => value.replace(/\u00a0/g, ' ').replace(/[\u2010-\u2015\u2212]/g, '-');
  const text = (value: string, x: number, top: number, size = 10, color = ink, bold = false) => { pdf.setFont('helvetica', bold ? 'bold' : 'normal'); pdf.setFontSize(size); pdf.setTextColor(color); pdf.text(plain(value), x, top); };
  const page = () => { pdf.addPage(); y = 24; text(`IPNC | ${report.year} | ${fundName}`, 14, 14, 9, muted); };
  const ensure = (height: number) => { if (y + height > 275) page(); };
  const heading = (value: string) => { ensure(24); pdf.setFillColor('#ecf3ef'); pdf.roundedRect(14, y - 5, 182, 13, 2, 2, 'F'); text(value, 19, y + 3, 12, ink, true); y += 17; };
  const paragraph = (value: string) => { const lines = pdf.splitTextToSize(plain(value), 178); for (const line of lines) { ensure(6); text(line, 16, y, 9, muted); y += 5; } y += 4; };
  const table = (labels: string[], rows: string[][], widths: number[]) => {
    const header = () => { pdf.setFillColor('#ecf3ef'); pdf.rect(14, y - 4, 182, 9, 'F'); let x = 16; labels.forEach((label, i) => { text(label, x, y + 1, 8, ink, true); x += widths[i]; }); y += 10; };
    ensure(20); header();
    if (!rows.length) { paragraph('Nenhum lançamento confirmado neste período.'); return; }
    for (const row of rows) {
      pdf.setFontSize(8); pdf.setFont('helvetica', 'normal');
      const cells = row.map((cell, i) => pdf.splitTextToSize(plain(cell), widths[i] - 4));
      const height = Math.max(...cells.map(c => c.length)) * 4.2 + 5;
      if (y + height > 275) { page(); header(); }
      let x = 16;
      cells.forEach((lines, i) => { lines.forEach((line: string, j: number) => text(line, x, y + j * 4.2, 8)); x += widths[i]; });
      y += height; pdf.setDrawColor('#d3e0d9'); pdf.line(14, y - 3, 196, y - 3);
    }
    y += 8;
  };
  pdf.setFillColor('#edf5f2'); pdf.rect(0, 0, 210, 297, 'F'); pdf.setFillColor(green); pdf.rect(0, 0, 8, 297, 'F'); pdf.setFillColor('#b38b3d'); pdf.rect(8, 0, 2, 297, 'F');
  text('PRESTAÇÃO DE CONTAS', 19, 35, 10, muted);
  text(annual ? 'Relatório Financeiro Anual' : 'Relatório da Sociedade', 19, 51, 23);
  text(String(report.year), 19, 68, 30);
  text('Igreja Presbiteriana de Nova Carapina', 19, 83, 11);
  pdf.setFontSize(10); const fundLines = pdf.splitTextToSize(plain(fundName), 173); pdf.text(fundLines, 19, 93);
  text(`Gerado em ${(options.generatedAt ?? new Date()).toLocaleDateString('pt-BR')}`, 19, 109, 9, muted);
  pdf.setFillColor('#ffffff'); pdf.roundedRect(19, 120, 177, 107, 4, 4, 'F');
  text('Resumo de valores confirmados', 25, 133, 14, ink, true);
  const summary = [
    ['Saldo anterior', report.opening_cents], ['Entradas confirmadas', totals.income], ['Saídas confirmadas', totals.expense],
    ['Saldo ao final do período', totals.closing], ['Per capita reservada', report.reserved_cents], ['Disponível após reserva', totals.available],
  ] as const;
  summary.forEach(([label, value], i) => { text(label, 25, 146 + i * 12, 10, muted); pdf.setFontSize(11); pdf.setTextColor(i === 2 ? red : green); pdf.text(plain(formatCents(value)), 189, 146 + i * 12, { align: 'right' }); });
  text(`${report.pending_count} recebimento(s) pendente(s), fora do saldo e do extrato.`, 19, 241, 9, muted);
  text('Documento baseado nos registros confirmados pela administração.', 19, 250, 9, muted);
  page(); heading('Resumo mensal');
  let running = report.opening_cents;
  table(['Mês', 'Entradas', 'Saídas', 'Saldo acumulado'], Array.from({ length: 12 }, (_, i) => {
    const month = `${report.year}-${String(i + 1).padStart(2, '0')}`;
    const rows = report.entries.filter(e => e.occurred_on.startsWith(month));
    const income = sumCents(rows.filter(e => e.kind === 'income').map(e => e.amount_cents));
    const expense = sumCents(rows.filter(e => e.kind === 'expense').map(e => e.amount_cents));
    running = sumCents([running, income, -expense]);
    return [`${String(i + 1).padStart(2, '0')}/${report.year}`, formatCents(income), formatCents(expense), formatCents(running)];
  }), [30, 50, 50, 52]);
  heading('Extrato confirmado');
  paragraph('O saldo de cada linha pertence à sociedade indicada e considera o histórico anterior. Partes de um Pix não são novas entradas.');
  table(['Data / caixa', 'Pessoa, descrição e composição', 'Valor', 'Saldo do caixa'], report.entries.map(entry => {
    const split = [['Camisa', entry.shirt_cents], ['Mensalidade', entry.monthly_fee_cents], ['Per capita', entry.per_capita_cents]].filter(([, value]) => Number(value) > 0).map(([label, value]) => `${label}: ${formatCents(Number(value))}`).join('; ');
    return [`${formatTreasuryDate(entry.occurred_on)}\n${report.funds.find(f => f.id === entry.fund_id)?.abbreviation ?? ''}`, `${entry.person_name}\n${entry.description}${split ? `\n${split}` : ''}`, `${entry.kind === 'expense' ? '-' : '+'} ${formatCents(entry.amount_cents)}`, formatCents(entry.balance_after_cents)];
  }), [29, 77, 38, 38]);
  if (annual) {
    heading('Comprovantes anexados');
    paragraph(report.attachments.length ? 'As cópias integrais dos comprovantes seguem após o fechamento, na ordem abaixo. Arquivos privados não dependem de links temporários.' : 'Nenhum comprovante anexado aos lançamentos confirmados deste período.');
    table(['Nº', 'Arquivo', 'Lançamento relacionado'], report.attachments.map((attachment, index) => {
      const entry = report.entries.find(e => e.id === attachment.entry_id);
      if (!entry) throw new Error('Comprovante sem lançamento confirmado no relatório.');
      return [String(index + 1), attachment.filename, `${formatTreasuryDate(entry.occurred_on)} · ${entry.person_name} · ${formatCents(entry.amount_cents)}`];
    }), [12, 85, 85]);
  }
  ensure(55); heading('Fechamento e conferência');
  paragraph(`Saldo anterior + entradas - saídas = ${formatCents(totals.closing)}. Reserva de per capita: ${formatCents(report.reserved_cents)}. Disponível: ${formatCents(totals.available)}.`);
  text('Tesouraria: ___________________________________________________', 16, y + 4); y += 18;
  text('Conferido por: _______________________  Data: ____ / ____ / ______', 16, y);
  const count = pdf.getNumberOfPages();
  for (let i = 1; i <= count; i++) { pdf.setPage(i); pdf.setDrawColor('#d3e0d9'); pdf.line(14, 282, 196, 282); text(`IPNC | Relatório financeiro ${report.year}`, 14, 289, 8, muted); text(`Página ${i} do relatório`, 157, 289, 8, muted); }
  const doc = await PDFDocument.load(pdf.output('arraybuffer'));
  if (annual && report.attachments.length && !options.loadAttachment) throw new Error('Os comprovantes precisam ser carregados antes de finalizar a prestação anual.');
  for (const [index, attachment] of (annual ? report.attachments : []).entries()) {
    const bytes = await options.loadAttachment!(attachment);
    const label = new jsPDF(); label.setFontSize(18); label.text(`Anexo ${index + 1}`, 20, 30); label.setFontSize(11); label.text(label.splitTextToSize(plain(attachment.filename), 165), 20, 43);
    const entry = report.entries.find(e => e.id === attachment.entry_id)!;
    label.text(label.splitTextToSize(plain(`${formatTreasuryDate(entry.occurred_on)} - ${entry.person_name} - ${formatCents(entry.amount_cents)}\n${entry.description}`), 165), 20, 65);
    const divider = await PDFDocument.load(label.output('arraybuffer')); for (const copied of await doc.copyPages(divider, [0])) doc.addPage(copied);
    try {
      if (attachment.mime_type === 'application/pdf') {
        const source = await PDFDocument.load(bytes); const pages = await doc.copyPages(source, source.getPageIndices()); pages.forEach(p => doc.addPage(p));
      } else {
        const image = attachment.mime_type === 'image/png' ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
        const page = doc.addPage([595.28, 841.89]); const fit = image.scaleToFit(555, 802); page.drawImage(image, { x: (595.28 - fit.width) / 2, y: (841.89 - fit.height) / 2, ...fit });
      }
    } catch { throw new Error(`Não foi possível incorporar “${attachment.filename}”. Confira se o arquivo está íntegro e sem senha.`); }
  }
  return doc.save();
}
