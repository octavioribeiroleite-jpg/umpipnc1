import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import logoBase64 from '@/assets/logo-ipnc.png';

interface PDFEvent {
  id: string;
  title: string;
  start_date: string;
  all_day?: boolean | null;
  status: string;
  description?: string | null;
  location?: string | null;
}

interface PDFSociety {
  id: string;
  name: string;
  color: string;
}

interface GenerateCalendarPDFParams {
  events: PDFEvent[];
  month: number;
  year: number;
  societies: PDFSociety[];
  getEventColor: (event: PDFEvent) => string;
  getEventSocietyName: (event: PDFEvent) => string | null;
  filterLabel: string; // "Geral" or society name
}

const monthEmphases: Record<number, string> = {
  0: 'No silêncio',
  1: 'No altar',
  2: 'Da história',
  3: 'Pela cruz',
  4: 'Nos lares',
  5: 'Do compromisso',
  6: 'Da alegria',
  7: 'Para a missão',
  8: 'Na visão',
  9: 'Da gratidão',
  10: 'Da fidelidade',
  11: 'Da esperança',
};

const months = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const dayNames = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

export function generateCalendarPDF(params: GenerateCalendarPDFParams) {
  const { events, month, year, societies, getEventColor, getEventSocietyName, filterLabel } = params;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = 0;
  let pageNum = 1;
  const totalPagesPlaceholder = '{total}';

  // Group events by day
  const eventsByDay = new Map<string, PDFEvent[]>();
  const sortedEvents = [...events]
    .filter(e => e.status !== 'cancelado')
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

  const toLocalDateString = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  sortedEvents.forEach(event => {
    const dateKey = toLocalDateString(new Date(event.start_date));
    if (!eventsByDay.has(dateKey)) eventsByDay.set(dateKey, []);
    eventsByDay.get(dateKey)!.push(event);
  });

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
  doc.rect(0, 0, pageWidth, 45, 'F');

  // Logo
  try {
    doc.addImage(logoBase64, 'PNG', margin, 5, 22, 22);
  } catch {
    // Logo not available, skip
  }

  const textX = margin + 28;
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`Cronograma ${filterLabel}`, textX, 14);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'normal');
  doc.text(`${months[month]} ${year}`, textX, 22);
  doc.setFontSize(9);
  doc.setTextColor(180, 200, 220);
  doc.text('Igreja Presbiteriana de Nova Carapina', textX, 29);

  // Decorative line
  doc.setDrawColor(52, 152, 219);
  doc.setLineWidth(1);
  doc.line(margin, 48, pageWidth - margin, 48);
  y = 53;

  // === THEME BOX ===
  doc.setFillColor(240, 245, 250);
  doc.roundedRect(margin, y, contentWidth, 18, 3, 3, 'F');
  doc.setDrawColor(200, 210, 220);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, 18, 3, 3, 'S');

  doc.setTextColor(30, 58, 95);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Tema 2026: RENOVO — Isaías 40.31', margin + 6, y + 7);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(`"Os que esperam no Senhor renovam as suas forças."`, margin + 6, y + 13);

  // Monthly emphasis on the right
  const emphasis = monthEmphases[month] || '';
  if (emphasis) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 58, 95);
    const emphText = `Ênfase: ${emphasis}`;
    doc.text(emphText, pageWidth - margin - 6, y + 10, { align: 'right' });
  }

  y += 24;

  // === EVENTS BY DAY ===
  if (eventsByDay.size === 0) {
    doc.setTextColor(120, 120, 120);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'italic');
    doc.text('Nenhum evento neste mês.', pageWidth / 2, y + 10, { align: 'center' });
    y += 20;
  } else {
    const sortedDays = Array.from(eventsByDay.keys()).sort();

    sortedDays.forEach(dateKey => {
      const dayEvents = eventsByDay.get(dateKey)!;
      const date = new Date(dateKey + 'T12:00:00');
      const dayName = dayNames[date.getDay()];
      const dayFormatted = format(date, 'dd/MM');

      checkPage(12 + dayEvents.length * 8);

      // Day header
      doc.setFillColor(30, 58, 95);
      doc.roundedRect(margin, y, contentWidth, 8, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(`${dayName}  ${dayFormatted}`, margin + 5, y + 5.5);
      y += 11;

      // Events
      dayEvents.forEach((event, i) => {
        checkPage(8);

        // Zebra
        if (i % 2 === 0) {
          doc.setFillColor(248, 249, 252);
          doc.rect(margin, y - 4, contentWidth, 7, 'F');
        }

        // Color dot
        const color = getEventColor(event);
        const [r, g, b] = hexToRgb(color);
        doc.setFillColor(r, g, b);
        doc.circle(margin + 5, y - 1, 2, 'F');

        // Title
        doc.setTextColor(40, 40, 40);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        const maxTitleW = contentWidth - 60;
        const title = doc.splitTextToSize(event.title, maxTitleW)[0];
        doc.text(title, margin + 11, y);

        // Time
        if (!event.all_day) {
          const time = format(new Date(event.start_date), 'HH:mm');
          doc.setTextColor(100, 100, 100);
          doc.setFontSize(8);
          doc.text(time, pageWidth - margin - 30, y);
        } else {
          doc.setTextColor(140, 140, 140);
          doc.setFontSize(7);
          doc.text('Dia inteiro', pageWidth - margin - 30, y);
        }

        // Society name
        const socName = getEventSocietyName(event);
        if (socName) {
          doc.setTextColor(r, g, b);
          doc.setFontSize(7);
          doc.setFont('helvetica', 'bold');
          doc.text(socName, pageWidth - margin - 4, y, { align: 'right' });
        }

        y += 7;
      });

      y += 3;
    });
  }

  // === LEGEND ===
  checkPage(25);
  y += 4;
  doc.setDrawColor(200, 210, 220);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  doc.setTextColor(30, 58, 95);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('LEGENDA', margin, y);
  y += 5;

  // Add societies + IPNC
  const legendItems = [
    ...societies.map(s => ({ name: s.name, color: s.color })),
    { name: 'IPNC', color: '#6b7280' },
  ];

  const colWidth = contentWidth / 3;
  legendItems.forEach((item, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const lx = margin + col * colWidth;
    const ly = y + row * 7;

    if (col === 0 && row > 0) checkPage(7);

    const [r, g, b] = hexToRgb(item.color);
    doc.setFillColor(r, g, b);
    doc.circle(lx + 3, ly, 2, 'F');
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(item.name, lx + 8, ly + 1);
  });

  y += Math.ceil(legendItems.length / 3) * 7 + 2;

  // Footer on last page
  addFooter();

  // Replace page number placeholders
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const pagesText = doc.output('datauristring');
    // Use internal method to replace
  }

  // Save with proper filename
  const monthName = months[month].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const filterSlug = filterLabel.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-');
  
  // Fix page numbers
  const totalP = doc.getNumberOfPages();
  for (let p = 1; p <= totalP; p++) {
    doc.setPage(p);
    // Re-render footer text with correct total (jsPDF doesn't support placeholder replacement natively)
    // We'll use putTotalPages
  }
  
  // Use jsPDF putTotalPages
  doc.putTotalPages(totalPagesPlaceholder);

  doc.save(`cronograma-${filterSlug}-${monthName}-${year}.pdf`);
}
