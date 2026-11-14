import { jsPDF } from 'jspdf';
import { plainStudyText, studyDateLabel, type StudyRetrospective } from './study-retrospective.ts';

const green = '#153E30';
const ink = '#21342C';
const muted = '#50635A';
const margin = 17;
const width = 176;
const bottom = 270;

function pdfText(text: string) {
  return plainStudyText(text)
    .replace(/(\d)\uFE0F?\u20E3/gu, '$1.')
    .replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, '')
    .replace(/[\u2010-\u2015]/g, '-')
    .trim();
}

export function buildStudyRetrospectivePdf(report: StudyRetrospective) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  doc.setProperties({ title: 'O que estudamos em ' + report.year, author: 'Renovo IPNC' });
  let y = 68;
  const write = (text: string, x: number, top: number, size: number, color: string, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(color);
    doc.text(text, x, top);
  };
  const newPage = () => {
    doc.addPage();
    write('RENOVO IPNC  /  RETROSPECTIVA ' + report.year, margin, 16, 9, green, true);
    y = 29;
  };
  const ensure = (space: number) => { if (y + space > bottom) newPage(); };
  const wrap = (text: string, size: number, bold = false): string[] => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    return text.split('\n').flatMap(line => doc.splitTextToSize(pdfText(line), width) as string[]);
  };

  doc.setFillColor(green);
  doc.rect(0, 0, 210, 55, 'F');
  write('RENOVO IPNC  /  ESTUDOS BÍBLICOS', margin, 17, 10, '#D9EEE0', true);
  write('O que estudamos em ' + report.year, margin, 37, 27, '#FFFFFF', true);

  for (const entry of report.entries) {
    if (!entry.paragraphs.length) continue;
    const title = wrap(entry.title, 16, true);
    ensure(19 + 7 * title.length);
    write(studyDateLabel(entry.date), margin, y, 10, green, true);
    y += 8;
    for (const line of title) {
      ensure(7);
      write(line, margin, y, 16, green, true);
      y += 7;
    }
    y += 2;
    for (const paragraph of entry.paragraphs) {
      for (const line of wrap(paragraph, 11)) {
        ensure(5.6);
        write(line, margin, y, 11, ink);
        y += 5.6;
      }
      y += 3;
    }
    if (y + 5 <= bottom) {
      doc.setDrawColor('#D4E2D9');
      doc.line(margin, y, 210 - margin, y);
    }
    y += 11;
  }

  const missing = report.entries.filter(entry => !entry.paragraphs.length);
  if (missing.length) {
    ensure(18);
    write('Encontros sem resumo salvo', margin, y, 13, green, true);
    y += 8;
    for (const entry of missing) {
      for (const line of wrap(studyDateLabel(entry.date) + ' · ' + entry.title, 10)) {
        ensure(6);
        write(line, margin, y, 10, muted);
        y += 6;
      }
    }
  }

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);
    write('Renovo IPNC  /  Estudos bíblicos', margin, 285, 9, muted);
    doc.text(page + ' / ' + pageCount, 210 - margin, 285, { align: 'right' });
  }
  return doc;
}
