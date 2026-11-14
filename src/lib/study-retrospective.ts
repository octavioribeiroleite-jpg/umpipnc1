import { formatStudySummaryForWhatsApp } from '../../supabase/functions/summarize-study/study-whatsapp.ts';

export type SavedStudySummary = {
  id: string;
  date: string;
  title: string;
  ai_summary: string | null;
};

export type StudyRetrospective = {
  year: number;
  entries: Array<{
    id: string;
    date: string;
    title: string;
    paragraphs: string[];
  }>;
};

export function plainStudyText(value: string) {
  return value.replace(/\*([^*\n]+)\*|_([^_\n]+)_/g, '$1$2');
}

export function studyDateLabel(date: string) {
  return date.split('-').reverse().join('/');
}

function condenseSavedSummary(saved: string | null, title: string): string[] {
  if (!saved?.trim()) return [];
  const paragraphs: string[] = [];
  for (const block of formatStudySummaryForWhatsApp(saved).split(/\n{2,}/)) {
    const lines: string[] = [];
    let reachedQuestions = false;
    for (const line of block.split('\n')) {
      const text = plainStudyText(line).trim();
      if (/^(?:[^\p{L}\d]+)?para meditar\b/iu.test(text)) {
        reachedQuestions = true;
        break;
      }
      if (/^(?:[^\p{L}\d]+)?(?:data\s*:|(?:resumo do )?estudo bíblico(?:\s*[^\p{L}\d]+)?$|pontos principais\s*:?\s*$)/iu.test(text)) {
        continue;
      }
      const heading = text.match(/^(?:[^\p{L}\d]+)?estudo bíblico\s*:\s*(.+)$/iu)?.[1];
      if (heading && (!/\d/.test(heading) || title.includes(heading))) continue;
      if (line.trim()) lines.push(line.trim());
    }
    if (lines.length) paragraphs.push(lines.join('\n'));
    if (reachedQuestions) break;
  }
  if (!paragraphs.length) return [];

  // Keep the original wording, including Bible references. Condense long
  // paragraphs at a sentence boundary, without asking a model to supply details.
  return paragraphs.map(paragraph => {
    if (paragraph.length <= 450) return paragraph;
    const excerpt = paragraph.match(/^.{230,430}?[.!?](?=\s|$)/su)?.[0];
    if (!excerpt || /\d/.test(paragraph.slice(excerpt.length))) return paragraph;
    const balancedMarkup = ['*', '_'].every(mark => (excerpt.split(mark).length - 1) % 2 === 0);
    return balancedMarkup ? excerpt.trim() : paragraph;
  });
}

export function buildStudyRetrospective(year: number, studies: SavedStudySummary[]): StudyRetrospective {
  return {
    year,
    entries: studies.filter(study => study.date.startsWith(year + '-'))
      .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
      .map(study => ({
        id: study.id,
        date: study.date,
        title: study.title,
        paragraphs: condenseSavedSummary(study.ai_summary, study.title),
      })),
  };
}

export function studyRetrospectiveMessage(report: StudyRetrospective) {
  const lessons = report.entries.filter(entry => entry.paragraphs.length);
  return [
    '📖 *O que estudamos em ' + report.year + '*',
    ...lessons.map(entry => [
      '*' + studyDateLabel(entry.date) + ' · ' + entry.title + '*',
      ...entry.paragraphs,
    ].join('\n\n')),
  ].join('\n\n');
}
