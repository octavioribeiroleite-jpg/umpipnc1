import { jsPDF } from 'jspdf';
import { reportPercentage, reportRoundRows, type ElectionReport } from './election-report';

export interface ElectionPdfFonts { regular: string; bold: string }
const GREEN = '#174B3C', INK = '#183B32', MUTED = '#65766F', PALE = '#EFF6F1', LINE = '#DCE6DF';
const clean = (text: string) => Array.from(text, char => char.charCodeAt(0) < 32 ? ' ' : char).join('').replace(/[\u2010-\u2015]/g, '-');

/** Text PDF: selectable names and figures, with repeated headers/page numbers. */
export function buildElectionReportPdf(report: ElectionReport, fonts?: ElectionPdfFonts) {
  if (!report.elections.length) throw new Error('Ainda não há cargo concluído com resultado liberado.');
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  let family = 'helvetica';
  if (fonts) {
    doc.addFileToVFS('ipnc-report-regular.ttf', fonts.regular); doc.addFont('ipnc-report-regular.ttf', 'IPNCReport', 'normal');
    doc.addFileToVFS('ipnc-report-bold.ttf', fonts.bold); doc.addFont('ipnc-report-bold.ttf', 'IPNCReport', 'bold'); family = 'IPNCReport';
  }
  doc.setProperties({ title: `Resultado das votações - ${report.title}`, subject: 'Resultados concluídos e liberados pelo mesário', author: 'IPNC', creator: 'Renovo IPNC' });
  const margin = 18, width = 174, bottom = 275;
  let y = 25;
  let sectionTitle = 'Relatório das votações';
  const text = (value: string, x: number, top: number, size = 10, bold = false, color = INK) => {
    doc.setFont(family, bold ? 'bold' : 'normal'); doc.setFontSize(size); doc.setTextColor(color); doc.text(clean(value), x, top);
  };
  const header = () => {
    doc.setFillColor(GREEN); doc.rect(0, 0, 210, 12, 'F'); text('IPNC  |  RESULTADOS DAS VOTAÇÕES', margin, 8, 8, true, '#FFFFFF');
    text(sectionTitle, margin, 23, 9, false, MUTED); y = 33;
  };
  const newPage = () => { doc.addPage(); header(); };
  const ensure = (height: number) => { if (y + height > bottom) newPage(); };
  const paragraph = (value: string, size = 10, bold = false, color = INK, maxWidth = width) => {
    doc.setFont(family, bold ? 'bold' : 'normal'); doc.setFontSize(size);
    const lines = doc.splitTextToSize(clean(value), maxWidth) as string[];
    const leading = size * 0.46;
    for (const line of lines) { ensure(leading + 1); text(line, margin, y, size, bold, color); y += leading; }
    y += 3;
  };
  let activeTable: { labels: string[]; columns: number[] } | null = null;
  const tableHeader = (labels: string[], columns: number[]) => {
    ensure(11); doc.setFillColor(GREEN); doc.roundedRect(margin, y - 5, width, 10, 1.5, 1.5, 'F');
    labels.forEach((label, index) => text(label, columns[index], y + 1, 8, true, '#FFFFFF')); y += 12;
    activeTable = { labels, columns };
  };
  const tableRow = (values: string[], columns: number[], widths: number[], highlight = false) => {
    doc.setFont(family, 'normal'); doc.setFontSize(9);
    const lines = values.map((value, index) => doc.splitTextToSize(clean(value), widths[index]) as string[]);
    const height = Math.max(10, Math.max(...lines.map(line => line.length)) * 4.2 + 5);
    // A very long name may span pages; never truncate or draw beyond a footer.
    if (height > bottom - 40) {
      values.forEach((value, index) => paragraph(`${index === 0 ? '' : '  '}${value}`, 9, index === 0)); return;
    }
    if (y + height > bottom) { newPage(); if (activeTable) tableHeader(activeTable.labels, activeTable.columns); }
    if (highlight) { doc.setFillColor(PALE); doc.rect(margin, y - 4, width, height, 'F'); }
    lines.forEach((value, index) => value.forEach((line, lineIndex) => text(line, columns[index], y + lineIndex * 4.2, 9, highlight)));
    doc.setDrawColor(LINE); doc.line(margin, y + height - 4, margin + width, y + height - 4); y += height;
  };
  header();
  y = 43; paragraph(report.title, 23, true); paragraph('Relatório das votações', 14, false, MUTED);
  paragraph(report.completed ? 'Sessão concluída' : 'Resultados concluídos e liberados até esta emissão', 10, true);
  paragraph(`Gerado em ${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(report.generated_at))} (Brasília).`, 9, false, MUTED);
  y += 4;
  const ballotCount = report.elections.reduce((sum, entry) => sum + entry.rounds.reduce((total, round) => total + round.totalBallots, 0), 0);
  const stats = [[String(report.elections.length), 'Cargos concluídos'], [String(report.elections.reduce((sum, entry) => sum + entry.electedIds.length, 0)), 'Vagas preenchidas'], [String(ballotCount), 'Cédulas nos escrutínios']];
  ensure(30);
  stats.forEach(([value, label], index) => { const x = margin + index * 60; doc.setFillColor(PALE); doc.roundedRect(x, y, 54, 25, 2, 2, 'F'); text(value, x + 4, y + 11, 19, true); text(label, x + 4, y + 19, 7, false, MUTED); });
  y += 39; paragraph('Quadro de eleitos', 15, true);
  tableHeader(['Cargo', 'Pessoa(s) eleita(s)', 'Rodadas'], [20, 72, 174]);
  report.elections.forEach(entry => tableRow([entry.election.position, entry.electedIds.map(id => entry.candidates.find(candidate => candidate.id === id)!.name).join('; '), String(entry.rounds.length)], [20, 72, 174], [48, 96, 14], true));
  y += 9; paragraph('Como conferir', 12, true);
  paragraph('As páginas seguintes detalham cada cargo e escrutínio. Os percentuais usam o total de cédulas da rodada. Em votações com mais de uma escolha, a soma dos percentuais pode ultrapassar 100%.', 9, false, MUTED);
  paragraph('O relatório contém resultados agregados. Não identifica o voto de nenhum participante.', 9, false, MUTED);
  for (const entry of report.elections) {
    sectionTitle = entry.election.position; newPage();
    paragraph(entry.election.position, 22, true); paragraph(entry.election.name, 10, false, MUTED);
    paragraph(`${entry.count.present} presentes confirmados  |  ${entry.election.seats_count} vaga(s)  |  ${entry.rounds.length} escrutínio(s)`, 10, true);
    const elected = entry.electedIds.map(id => entry.candidates.find(candidate => candidate.id === id)!.name).join('; ');
    paragraph(`Eleito(s): ${elected}`, 12, true, GREEN); y += 4;
    for (const round of entry.rounds) {
      ensure(36); paragraph(`${round.round}º escrutínio`, 14, true);
      paragraph(`${round.totalBallots} cédulas conferidas. ${round.round === 1 && entry.election.majority_rule === 'absolute_50' ? `Maioria absoluta: mínimo de ${Math.floor(round.totalBallots / 2) + 1} votos.` : round.round >= 3 ? 'Desempate conforme a regra da votação.' : 'Maioria simples, respeitados os critérios de desempate.'}`, 9, false, MUTED);
      tableHeader(['Indicado(a)', 'Votos', 'Percentual', 'Resultado'], [20, 112, 133, 161]);
      for (const row of reportRoundRows(entry, round)) tableRow([row.name, String(row.votes), reportPercentage(row.votes, round.totalBallots), row.elected ? 'Eleito(a)' : 'Não eleito(a)'], [20, 112, 133, 161], [87, 17, 25, 28], row.elected);
      ensure(20); paragraph(`Marcas em branco/nulo: ${round.blankVotes}.`, 9, false, MUTED);
      paragraph(round.electedIds.length ? `Eleito(s) nesta rodada: ${round.electedIds.map(id => entry.candidates.find(candidate => candidate.id === id)!.name).join('; ')}.` : round.hasTie ? 'Nenhuma eleição confirmada nesta rodada: houve empate.' : 'Nenhum indicado alcançou o critério de eleição nesta rodada.', 9, true);
      y += 5;
    }
  }
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page); doc.setDrawColor(LINE); doc.line(margin, 282, 192, 282);
    text('IPNC - resultados liberados pelo mesário', margin, 289, 8, false, MUTED); text(`${page} / ${pages}`, 178, 289, 8, false, MUTED);
  }
  return doc;
}
