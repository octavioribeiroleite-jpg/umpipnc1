import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import logoBase64 from '@/assets/logo-ipnc.png';

interface EbdClass {
  id: string;
  name: string;
  order_index: number;
}

interface EbdStudent {
  id: string;
  class_id: string;
  name: string;
}

interface AttendanceRecord {
  student_id: string;
  class_id: string;
  date: string;
  present: boolean;
}

interface GenerateEbdPDFParams {
  classes: EbdClass[];
  students: EbdStudent[];
  attendance: AttendanceRecord[];
  date: string;
  formattedDate: string;
  professorName?: string;
}

interface ClassStats {
  cls: EbdClass;
  total: number;
  present: number;
  absent: number;
  percentage: number;
  presentStudents: string[];
  absentStudents: string[];
}

function getClassStats(cls: EbdClass, students: EbdStudent[], attendance: AttendanceRecord[], date: string): ClassStats {
  const classStudents = students.filter(s => s.class_id === cls.id).sort((a, b) => a.name.localeCompare(b.name));
  const classAttendance = attendance.filter(a => a.class_id === cls.id && a.date === date);
  const presentIds = new Set(classAttendance.filter(a => a.present).map(a => a.student_id));

  const presentStudents: string[] = [];
  const absentStudents: string[] = [];

  classStudents.forEach(s => {
    if (presentIds.has(s.id)) {
      presentStudents.push(s.name);
    } else {
      absentStudents.push(s.name);
    }
  });

  const total = classStudents.length;
  const present = presentStudents.length;
  return {
    cls,
    total,
    present,
    absent: total - present,
    percentage: total > 0 ? Math.round((present / total) * 100) : 0,
    presentStudents,
    absentStudents,
  };
}

export function generateEbdAttendancePDF(params: GenerateEbdPDFParams) {
  const { classes, students, attendance, date, formattedDate, professorName } = params;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = 0;
  let pageNum = 1;
  const totalPagesPlaceholder = '{total_ebd}';

  const addFooter = () => {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text(
      `Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
      margin,
      pageHeight - 10
    );
    doc.text(
      `Página ${pageNum} de ${totalPagesPlaceholder}`,
      pageWidth - margin,
      pageHeight - 10,
      { align: 'right' }
    );
  };

  const checkPage = (needed: number) => {
    if (y + needed > pageHeight - 20) {
      addFooter();
      doc.addPage();
      pageNum++;
      y = 20;
    }
  };

  // === HEADER ===
  doc.setFillColor(30, 58, 95);
  doc.rect(0, 0, pageWidth, 42, 'F');

  try {
    doc.addImage(logoBase64, 'PNG', margin, 5, 20, 20);
  } catch { /* skip */ }

  const textX = margin + 26;
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Relatório de Chamada — EBD', textX, 14);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(formattedDate, textX, 22);

  if (professorName) {
    doc.setFontSize(9);
    doc.setTextColor(180, 200, 220);
    doc.text(`Responsável: ${professorName}`, textX, 29);
  }

  doc.setFontSize(8);
  doc.setTextColor(180, 200, 220);
  doc.text('Igreja Presbiteriana de Nova Carapina', textX, professorName ? 35 : 29);

  // Decorative line
  doc.setDrawColor(52, 152, 219);
  doc.setLineWidth(1);
  doc.line(margin, 45, pageWidth - margin, 45);
  y = 50;

  // === COMPUTE STATS ===
  const allStats = classes
    .map(cls => getClassStats(cls, students, attendance, date))
    .sort((a, b) => b.percentage - a.percentage);

  const totalStudents = students.length;
  const totalPresent = attendance.filter(a => a.present && a.date === date).length;
  const totalAbsent = totalStudents - totalPresent;
  const totalPct = totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0;

  // === RESUMO GERAL ===
  doc.setFillColor(240, 245, 250);
  doc.roundedRect(margin, y, contentWidth, 28, 3, 3, 'F');
  doc.setDrawColor(200, 210, 220);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, 28, 3, 3, 'S');

  doc.setTextColor(30, 58, 95);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumo Geral', margin + 6, y + 8);

  // Stats row
  const statsY = y + 15;
  const col1 = margin + 6;
  const col2 = margin + 50;
  const col3 = margin + 94;
  const col4 = margin + 130;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Total de Alunos', col1, statsY);
  doc.text('Presentes', col2, statsY);
  doc.text('Ausentes', col3, statsY);
  doc.text('Frequência', col4, statsY);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 95);
  doc.text(`${totalStudents}`, col1, statsY + 8);
  doc.setTextColor(34, 139, 34);
  doc.text(`${totalPresent}`, col2, statsY + 8);
  doc.setTextColor(200, 50, 50);
  doc.text(`${totalAbsent}`, col3, statsY + 8);

  // Percentage with color
  const pctColor = totalPct > 70 ? [34, 139, 34] : totalPct >= 40 ? [200, 160, 0] : [200, 50, 50];
  doc.setTextColor(pctColor[0], pctColor[1], pctColor[2]);
  doc.text(`${totalPct}%`, col4, statsY + 8);

  // Progress bar
  const barX = col4 + 30;
  const barW = contentWidth - (barX - margin) - 6;
  if (barW > 10) {
    doc.setFillColor(220, 220, 220);
    doc.roundedRect(barX, statsY + 3, barW, 5, 2, 2, 'F');
    if (totalPct > 0) {
      doc.setFillColor(pctColor[0], pctColor[1], pctColor[2]);
      doc.roundedRect(barX, statsY + 3, Math.max(barW * (totalPct / 100), 4), 5, 2, 2, 'F');
    }
  }

  y += 34;

  // === RANKING DE TURMAS ===
  checkPage(12 + allStats.length * 10);

  doc.setFillColor(30, 58, 95);
  doc.roundedRect(margin, y, contentWidth, 8, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('RANKING DE TURMAS', margin + 5, y + 5.5);
  y += 12;

  // Table header
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 100, 100);
  doc.text('#', margin + 3, y);
  doc.text('Turma', margin + 12, y);
  doc.text('Presentes', margin + 90, y);
  doc.text('Total', margin + 115, y);
  doc.text('%', margin + 135, y);
  y += 2;
  doc.setDrawColor(200, 210, 220);
  doc.setLineWidth(0.2);
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  allStats.forEach((stat, i) => {
    checkPage(9);

    // Zebra
    if (i % 2 === 0) {
      doc.setFillColor(248, 249, 252);
      doc.rect(margin, y - 4, contentWidth, 8, 'F');
    }

    // Trophy for first
    if (i === 0 && stat.present > 0) {
      doc.setFontSize(8);
      doc.setTextColor(200, 160, 0);
      doc.text('🏆', margin + 1, y);
    }

    // Position
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(120, 120, 120);
    doc.text(`${i + 1}º`, margin + 3, y);

    // Name
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 40, 40);
    doc.text(stat.cls.name, margin + 12, y);

    // Present
    doc.setTextColor(34, 139, 34);
    doc.setFont('helvetica', 'bold');
    doc.text(`${stat.present}`, margin + 95, y);

    // Total
    doc.setTextColor(80, 80, 80);
    doc.setFont('helvetica', 'normal');
    doc.text(`${stat.total}`, margin + 118, y);

    // Percentage with color
    const pc = stat.percentage;
    const c = pc > 70 ? [34, 139, 34] : pc >= 40 ? [200, 160, 0] : [200, 50, 50];
    doc.setTextColor(c[0], c[1], c[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(`${pc}%`, margin + 135, y);

    // Mini bar
    const miniBarX = margin + 148;
    const miniBarW = contentWidth - (miniBarX - margin) - 2;
    if (miniBarW > 5) {
      doc.setFillColor(230, 230, 230);
      doc.roundedRect(miniBarX, y - 3, miniBarW, 4, 1, 1, 'F');
      if (pc > 0) {
        doc.setFillColor(c[0], c[1], c[2]);
        doc.roundedRect(miniBarX, y - 3, Math.max(miniBarW * (pc / 100), 3), 4, 1, 1, 'F');
      }
    }

    y += 8;
  });

  y += 4;

  // === DETALHAMENTO POR TURMA ===
  allStats.forEach(stat => {
    const headerHeight = 10;
    const listHeight = (stat.presentStudents.length + stat.absentStudents.length) * 6 + 20;
    checkPage(headerHeight + Math.min(listHeight, 60));

    // Class header
    doc.setFillColor(30, 58, 95);
    doc.roundedRect(margin, y, contentWidth, 9, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(stat.cls.name, margin + 5, y + 6.5);

    // Stats on right
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `${stat.present}/${stat.total} presentes (${stat.percentage}%)`,
      pageWidth - margin - 5,
      y + 6.5,
      { align: 'right' }
    );
    y += 13;

    // Present section
    if (stat.presentStudents.length > 0) {
      doc.setFillColor(34, 139, 34);
      doc.roundedRect(margin, y, contentWidth, 7, 1.5, 1.5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(`PRESENTES (${stat.presentStudents.length})`, margin + 4, y + 5);
      y += 10;

      stat.presentStudents.forEach((name, i) => {
        checkPage(6);
        if (i % 2 === 0) {
          doc.setFillColor(240, 255, 240);
          doc.rect(margin, y - 3.5, contentWidth, 6, 'F');
        }
        doc.setFillColor(34, 139, 34);
        doc.circle(margin + 5, y - 0.5, 1.5, 'F');
        doc.setTextColor(40, 40, 40);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(name, margin + 10, y);
        y += 6;
      });
    }

    // Absent section
    if (stat.absentStudents.length > 0) {
      checkPage(12);
      y += 1;
      doc.setFillColor(200, 50, 50);
      doc.roundedRect(margin, y, contentWidth, 7, 1.5, 1.5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(`AUSENTES (${stat.absentStudents.length})`, margin + 4, y + 5);
      y += 10;

      stat.absentStudents.forEach((name, i) => {
        checkPage(6);
        if (i % 2 === 0) {
          doc.setFillColor(255, 240, 240);
          doc.rect(margin, y - 3.5, contentWidth, 6, 'F');
        }
        doc.setFillColor(200, 50, 50);
        doc.circle(margin + 5, y - 0.5, 1.5, 'F');
        doc.setTextColor(40, 40, 40);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(name, margin + 10, y);
        y += 6;
      });
    }

    y += 6;
  });

  // Footer on last page
  addFooter();

  doc.putTotalPages(totalPagesPlaceholder);

  const dateSlug = date.replace(/-/g, '');
  doc.save(`chamada-ebd-${dateSlug}.pdf`);
}

interface PeriodDay {
  date: string;
  present: number;
  total: number;
  percentage: number;
  visitorCount: number;
}

interface PeriodClass {
  name: string;
  totalPresent: number;
  avgPercentage: number;
}

interface GenerateEbdPeriodPDFParams {
  periodLabel: string;
  days: PeriodDay[];
  classes: PeriodClass[];
}

export function generateEbdPeriodPDF(params: GenerateEbdPeriodPDFParams) {
  const { periodLabel, days, classes } = params;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = 0;
  let pageNum = 1;
  const totalPagesPlaceholder = '{total_ebd_period}';

  const addFooter = () => {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text(`Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, margin, pageHeight - 10);
    doc.text(`Página ${pageNum} de ${totalPagesPlaceholder}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
  };

  const checkPage = (needed: number) => {
    if (y + needed > pageHeight - 20) {
      addFooter();
      doc.addPage();
      pageNum++;
      y = 20;
    }
  };

  const pctColorOf = (pct: number): [number, number, number] =>
    pct > 70 ? [34, 139, 34] : pct >= 40 ? [200, 160, 0] : [200, 50, 50];

  // === HEADER ===
  doc.setFillColor(30, 58, 95);
  doc.rect(0, 0, pageWidth, 42, 'F');
  try { doc.addImage(logoBase64, 'PNG', margin, 5, 20, 20); } catch { /* skip */ }
  const textX = margin + 26;
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Relatório de Chamadas — EBD', textX, 14);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(periodLabel, textX, 22);
  doc.setFontSize(8);
  doc.setTextColor(180, 200, 220);
  doc.text('Igreja Presbiteriana de Nova Carapina', textX, 29);
  doc.setDrawColor(52, 152, 219);
  doc.setLineWidth(1);
  doc.line(margin, 45, pageWidth - margin, 45);
  y = 50;

  // === RESUMO GERAL DO PERÍODO ===
  const totalDays = days.length;
  const sumPresent = days.reduce((s, d) => s + d.present, 0);
  const sumVisitors = days.reduce((s, d) => s + d.visitorCount, 0);
  const avgPresent = totalDays > 0 ? Math.round(sumPresent / totalDays) : 0;
  const avgPct = totalDays > 0 ? Math.round(days.reduce((s, d) => s + d.percentage, 0) / totalDays) : 0;

  doc.setFillColor(240, 245, 250);
  doc.roundedRect(margin, y, contentWidth, 28, 3, 3, 'F');
  doc.setDrawColor(200, 210, 220);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, 28, 3, 3, 'S');
  doc.setTextColor(30, 58, 95);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumo do Período', margin + 6, y + 8);

  const statsY = y + 15;
  const cols = [margin + 6, margin + 50, margin + 94, margin + 140];
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Domingos', cols[0], statsY);
  doc.text('Média presentes', cols[1], statsY);
  doc.text('Visitantes', cols[2], statsY);
  doc.text('Frequência média', cols[3], statsY);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 95);
  doc.text(`${totalDays}`, cols[0], statsY + 8);
  doc.setTextColor(34, 139, 34);
  doc.text(`${avgPresent}`, cols[1], statsY + 8);
  doc.setTextColor(46, 92, 170);
  doc.text(`${sumVisitors}`, cols[2], statsY + 8);
  const ac = pctColorOf(avgPct);
  doc.setTextColor(ac[0], ac[1], ac[2]);
  doc.text(`${avgPct}%`, cols[3], statsY + 8);
  y += 34;

  // === FREQUÊNCIA POR DOMINGO ===
  checkPage(20);
  doc.setFillColor(30, 58, 95);
  doc.roundedRect(margin, y, contentWidth, 8, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('FREQUÊNCIA POR DOMINGO', margin + 5, y + 5.5);
  y += 12;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 100, 100);
  doc.text('Data', margin + 3, y);
  doc.text('Presentes', margin + 70, y);
  doc.text('Total', margin + 100, y);
  doc.text('Visit.', margin + 122, y);
  doc.text('%', margin + 145, y);
  y += 2;
  doc.setDrawColor(200, 210, 220);
  doc.setLineWidth(0.2);
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  [...days].sort((a, b) => a.date.localeCompare(b.date)).forEach((d, i) => {
    checkPage(9);
    if (i % 2 === 0) {
      doc.setFillColor(248, 249, 252);
      doc.rect(margin, y - 4, contentWidth, 8, 'F');
    }
    const dObj = new Date(d.date + 'T12:00:00');
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 40, 40);
    doc.text(format(dObj, "dd/MM/yyyy", { locale: ptBR }), margin + 3, y);
    doc.setTextColor(34, 139, 34);
    doc.setFont('helvetica', 'bold');
    doc.text(`${d.present}`, margin + 75, y);
    doc.setTextColor(80, 80, 80);
    doc.setFont('helvetica', 'normal');
    doc.text(`${d.total}`, margin + 103, y);
    doc.setTextColor(46, 92, 170);
    doc.text(`${d.visitorCount}`, margin + 125, y);
    const c = pctColorOf(d.percentage);
    doc.setTextColor(c[0], c[1], c[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(`${d.percentage}%`, margin + 145, y);
    y += 8;
  });
  y += 6;

  // === MÉDIA POR TURMA ===
  if (classes.length > 0) {
    checkPage(20);
    doc.setFillColor(30, 58, 95);
    doc.roundedRect(margin, y, contentWidth, 8, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('MÉDIA POR TURMA', margin + 5, y + 5.5);
    y += 12;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 100, 100);
    doc.text('Turma', margin + 3, y);
    doc.text('Presenças (total)', margin + 100, y);
    doc.text('Freq. média', margin + 150, y);
    y += 2;
    doc.setDrawColor(200, 210, 220);
    doc.setLineWidth(0.2);
    doc.line(margin, y, pageWidth - margin, y);
    y += 4;

    [...classes].sort((a, b) => b.avgPercentage - a.avgPercentage).forEach((c, i) => {
      checkPage(9);
      if (i % 2 === 0) {
        doc.setFillColor(248, 249, 252);
        doc.rect(margin, y - 4, contentWidth, 8, 'F');
      }
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(40, 40, 40);
      doc.text(c.name, margin + 3, y);
      doc.setTextColor(34, 139, 34);
      doc.setFont('helvetica', 'bold');
      doc.text(`${c.totalPresent}`, margin + 105, y);
      const cc = pctColorOf(c.avgPercentage);
      doc.setTextColor(cc[0], cc[1], cc[2]);
      doc.text(`${c.avgPercentage}%`, margin + 152, y);
      y += 8;
    });
  }

  addFooter();
  doc.putTotalPages(totalPagesPlaceholder);
  doc.save(`relatorio-chamadas-ebd.pdf`);
}

// ============================================================
// RELATÓRIO TRIMESTRAL DETALHADO (presença + visitantes por sala)
// ============================================================

interface QuarterlyDay {
  date: string;
  present: number;
  total: number;
  percentage: number;
  visitorCount: number;
}

interface QuarterlyStudent {
  name: string;
  present: number;
  total: number;
  percentage: number;
}

interface QuarterlyClassDay {
  date: string;
  present: number;
  total: number;
  percentage: number;
  visitorCount: number;
  visitorNames: string[];
}

interface QuarterlyClass {
  name: string;
  totalPresent: number;
  avgPercentage: number;
  totalVisitors: number;
  days: QuarterlyClassDay[];
  students: QuarterlyStudent[];
}

interface GenerateEbdQuarterlyPDFParams {
  periodLabel: string;
  days: QuarterlyDay[];
  classesDetail: QuarterlyClass[];
}

export function generateEbdQuarterlyPDF(params: GenerateEbdQuarterlyPDFParams) {
  const { periodLabel, days, classesDetail } = params;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = 0;
  let pageNum = 1;
  const totalPagesPlaceholder = '{total_ebd_quarter}';

  const addFooter = () => {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text(`Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, margin, pageHeight - 10);
    doc.text(`Página ${pageNum} de ${totalPagesPlaceholder}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
  };

  const checkPage = (needed: number) => {
    if (y + needed > pageHeight - 20) {
      addFooter();
      doc.addPage();
      pageNum++;
      y = 20;
    }
  };

  const pctColorOf = (pct: number): [number, number, number] =>
    pct > 70 ? [34, 139, 34] : pct >= 40 ? [200, 160, 0] : [200, 50, 50];

  const sectionBar = (title: string) => {
    checkPage(14);
    doc.setFillColor(30, 58, 95);
    doc.roundedRect(margin, y, contentWidth, 8, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin + 5, y + 5.5);
    y += 12;
  };

  const fmtDate = (d: string) => format(new Date(d + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR });

  // === HEADER ===
  doc.setFillColor(30, 58, 95);
  doc.rect(0, 0, pageWidth, 42, 'F');
  try { doc.addImage(logoBase64, 'PNG', margin, 5, 20, 20); } catch { /* skip */ }
  const textX = margin + 26;
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Relatório Trimestral — EBD', textX, 14);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(periodLabel, textX, 22);
  doc.setFontSize(8);
  doc.setTextColor(180, 200, 220);
  doc.text('Igreja Presbiteriana de Nova Carapina', textX, 29);
  doc.setDrawColor(52, 152, 219);
  doc.setLineWidth(1);
  doc.line(margin, 45, pageWidth - margin, 45);
  y = 50;

  // === RESUMO GERAL DO PERÍODO ===
  const totalDays = days.length;
  const sumPresent = days.reduce((s, d) => s + d.present, 0);
  const sumVisitors = days.reduce((s, d) => s + d.visitorCount, 0);
  const avgPresent = totalDays > 0 ? Math.round(sumPresent / totalDays) : 0;
  const avgPct = totalDays > 0 ? Math.round(days.reduce((s, d) => s + d.percentage, 0) / totalDays) : 0;

  doc.setFillColor(240, 245, 250);
  doc.roundedRect(margin, y, contentWidth, 28, 3, 3, 'F');
  doc.setDrawColor(200, 210, 220);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, 28, 3, 3, 'S');
  doc.setTextColor(30, 58, 95);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumo do Período', margin + 6, y + 8);

  const sY = y + 15;
  const cols = [margin + 6, margin + 50, margin + 94, margin + 140];
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Domingos', cols[0], sY);
  doc.text('Média presentes', cols[1], sY);
  doc.text('Visitantes', cols[2], sY);
  doc.text('Frequência média', cols[3], sY);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 95);
  doc.text(`${totalDays}`, cols[0], sY + 8);
  doc.setTextColor(34, 139, 34);
  doc.text(`${avgPresent}`, cols[1], sY + 8);
  doc.setTextColor(46, 92, 170);
  doc.text(`${sumVisitors}`, cols[2], sY + 8);
  const ac = pctColorOf(avgPct);
  doc.setTextColor(ac[0], ac[1], ac[2]);
  doc.text(`${avgPct}%`, cols[3], sY + 8);
  y += 34;

  // === FREQUÊNCIA POR DOMINGO (GERAL) ===
  sectionBar('FREQUÊNCIA POR DOMINGO (GERAL)');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 100, 100);
  doc.text('Data', margin + 3, y);
  doc.text('Presentes', margin + 70, y);
  doc.text('Total', margin + 100, y);
  doc.text('Visit.', margin + 122, y);
  doc.text('%', margin + 145, y);
  y += 2;
  doc.setDrawColor(200, 210, 220);
  doc.setLineWidth(0.2);
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;
  [...days].sort((a, b) => a.date.localeCompare(b.date)).forEach((d, i) => {
    checkPage(9);
    if (i % 2 === 0) {
      doc.setFillColor(248, 249, 252);
      doc.rect(margin, y - 4, contentWidth, 8, 'F');
    }
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 40, 40);
    doc.text(fmtDate(d.date), margin + 3, y);
    doc.setTextColor(34, 139, 34);
    doc.setFont('helvetica', 'bold');
    doc.text(`${d.present}`, margin + 75, y);
    doc.setTextColor(80, 80, 80);
    doc.setFont('helvetica', 'normal');
    doc.text(`${d.total}`, margin + 103, y);
    doc.setTextColor(46, 92, 170);
    doc.text(`${d.visitorCount}`, margin + 125, y);
    const c = pctColorOf(d.percentage);
    doc.setTextColor(c[0], c[1], c[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(`${d.percentage}%`, margin + 145, y);
    y += 8;
  });
  y += 6;

  // === DETALHAMENTO POR SALA ===
  [...classesDetail]
    .sort((a, b) => b.avgPercentage - a.avgPercentage)
    .forEach(cls => {
      checkPage(24);
      // Class header band
      doc.setFillColor(30, 58, 95);
      doc.roundedRect(margin, y, contentWidth, 10, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(cls.name, margin + 5, y + 6.8);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Média ${cls.avgPercentage}%  ·  ${cls.totalPresent} presenças  ·  ${cls.totalVisitors} visit.`,
        pageWidth - margin - 5,
        y + 6.8,
        { align: 'right' }
      );
      y += 15;

      // Per-Sunday table for class
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(120, 120, 120);
      doc.text('Frequência domingo a domingo', margin + 3, y);
      y += 4;
      doc.setTextColor(100, 100, 100);
      doc.text('Data', margin + 3, y);
      doc.text('Pres./Total', margin + 70, y);
      doc.text('Visit.', margin + 115, y);
      doc.text('%', margin + 145, y);
      y += 2;
      doc.setDrawColor(200, 210, 220);
      doc.setLineWidth(0.2);
      doc.line(margin, y, pageWidth - margin, y);
      y += 4;
      [...cls.days].sort((a, b) => a.date.localeCompare(b.date)).forEach((d, i) => {
        checkPage(8);
        if (i % 2 === 0) {
          doc.setFillColor(248, 249, 252);
          doc.rect(margin, y - 4, contentWidth, 8, 'F');
        }
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(40, 40, 40);
        doc.text(fmtDate(d.date), margin + 3, y);
        doc.setTextColor(40, 40, 40);
        doc.text(`${d.present}/${d.total}`, margin + 75, y);
        doc.setTextColor(46, 92, 170);
        doc.text(`${d.visitorCount}`, margin + 118, y);
        const c = pctColorOf(d.percentage);
        doc.setTextColor(c[0], c[1], c[2]);
        doc.setFont('helvetica', 'bold');
        doc.text(`${d.percentage}%`, margin + 145, y);
        y += 8;
      });
      y += 4;

      // Students list
      checkPage(14);
      doc.setFillColor(34, 139, 34);
      doc.roundedRect(margin, y, contentWidth, 7, 1.5, 1.5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(`ALUNOS (${cls.students.length})`, margin + 4, y + 5);
      y += 10;
      if (cls.students.length === 0) {
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(120, 120, 120);
        doc.text('Nenhum aluno cadastrado nesta sala.', margin + 4, y);
        y += 8;
      } else {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 100, 100);
        doc.text('Aluno', margin + 3, y);
        doc.text('Presenças', margin + 120, y);
        doc.text('%', margin + 155, y);
        y += 2;
        doc.setDrawColor(200, 210, 220);
        doc.setLineWidth(0.2);
        doc.line(margin, y, pageWidth - margin, y);
        y += 4;
        [...cls.students].sort((a, b) => a.percentage - b.percentage).forEach((st, i) => {
          checkPage(7);
          if (i % 2 === 0) {
            doc.setFillColor(248, 249, 252);
            doc.rect(margin, y - 3.5, contentWidth, 6.5, 'F');
          }
          doc.setFontSize(8.5);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(40, 40, 40);
          doc.text(st.name.length > 55 ? st.name.slice(0, 55) + '…' : st.name, margin + 3, y);
          doc.setTextColor(80, 80, 80);
          doc.text(`${st.present}/${st.total}`, margin + 123, y);
          const c = pctColorOf(st.percentage);
          doc.setTextColor(c[0], c[1], c[2]);
          doc.setFont('helvetica', 'bold');
          doc.text(`${st.percentage}%`, margin + 155, y);
          y += 6.5;
        });
      }
      y += 3;

      // Visitors block
      const visitorDays = cls.days.filter(d => d.visitorCount > 0 || d.visitorNames.length > 0);
      checkPage(14);
      doc.setFillColor(46, 92, 170);
      doc.roundedRect(margin, y, contentWidth, 7, 1.5, 1.5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(`VISITANTES (${cls.totalVisitors})`, margin + 4, y + 5);
      y += 10;
      if (visitorDays.length === 0) {
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(120, 120, 120);
        doc.text('Nenhum visitante no período.', margin + 4, y);
        y += 8;
      } else {
        visitorDays.sort((a, b) => a.date.localeCompare(b.date)).forEach(d => {
          const namesText = d.visitorNames.length > 0
            ? d.visitorNames.join(', ')
            : `${d.visitorCount} visitante${d.visitorCount > 1 ? 's' : ''} (sem nomes registrados)`;
          const prefix = `${fmtDate(d.date)} (${d.visitorCount}): `;
          const lines = doc.splitTextToSize(prefix + namesText, contentWidth - 8) as string[];
          checkPage(lines.length * 5 + 2);
          doc.setFontSize(8.5);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(40, 40, 40);
          lines.forEach(line => {
            doc.text(line, margin + 4, y);
            y += 5;
          });
          y += 1;
        });
      }
      y += 8;
    });

  addFooter();
  doc.putTotalPages(totalPagesPlaceholder);
  doc.save('relatorio-trimestral-ebd.pdf');
}
