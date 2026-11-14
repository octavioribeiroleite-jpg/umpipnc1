export function splitStudyNotes(notes: string): { content: string; instructions: string[] } {
  const instructions: string[] = [];
  let content = '';
  let start = 0;
  let cursor = 0;
  let depth = 0;

  for (const match of notes.matchAll(/[()]/g)) {
    if (match[0] === '(') {
      if (depth === 0) start = match.index;
      depth++;
    } else if (depth > 0 && --depth === 0) {
      const instruction = notes.slice(start + 1, match.index).trim();
      if (instruction) instructions.push(instruction);
      content += notes.slice(cursor, start);
      cursor = match.index + 1;
    }
  }

  return { content: (content + notes.slice(cursor)).trim(), instructions };
}

// Use the same format for new responses and summaries already saved in Markdown.
export function formatStudySummaryForWhatsApp(summary: string): string {
  const text = summary.trim().replace(/^```(?:\w+)?[ \t]*\r?\n([\s\S]*?)\r?\n```$/, '$1');
  const lines = text.split(/\r?\n/);
  if (/^(?:claro[!.]?\s+)?(?:aqui (?:está|vai|segue)|segue)[\s,:].*\b(?:resumo|whatsapp)\b.*:\s*$/i.test(lines[0])) {
    lines.shift();
  }

  const formattedLines = lines
    .map(line => line
      .replace(/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/, '')
      .replace(/^\s{0,3}#{1,6}[ \t]+/, '')
      .replace(/^(\s*)[+*][ \t]+/, '$1- ')
      .replace(/\*{2,3}([^*\n]+?)\*{2,3}|__([^_\n]+?)__/g, (_, bold, underlined) => {
        const content = (bold ?? underlined).trim();
        return content ? `*${content}*` : '';
      }));

  const topicOrQuestion = /^\s*(?:[-•][ \t]+|\d+[.)][ \t]+|\d\ufe0f?\u20e3|(?:\S+\s+)?\*\d+[.)][ \t]+)/u;
  const section = /^\s*(?:\S+\s+)?\*(?:pontos principais|versículo[- ]chave|reflexão|aplicação prática|conclusão|para meditar na semana)\b/iu;
  return formattedLines
    .map((line, index) => {
      const startsBlock = topicOrQuestion.test(line) || section.test(line);
      return startsBlock && formattedLines[index - 1]?.trim() ? `\n${line}` : line;
    })
    .join('\n')
    .replace(/\n(?:[ \t]*\n){2,}/g, '\n\n')
    .trim();
}
