// Use the same format for new responses and summaries already saved in Markdown.
export function formatStudySummaryForWhatsApp(summary: string): string {
  const text = summary.trim().replace(/^```(?:\w+)?[ \t]*\r?\n([\s\S]*?)\r?\n```$/, '$1');
  const lines = text.split(/\r?\n/);
  if (/^(?:claro[!.]?\s+)?(?:aqui (?:está|vai|segue)|segue)[\s,:].*\b(?:resumo|whatsapp)\b.*:\s*$/i.test(lines[0])) {
    lines.shift();
  }

  return lines
    .map(line => line
      .replace(/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/, '')
      .replace(/^\s{0,3}#{1,6}[ \t]+/, '')
      .replace(/^(\s*)[+*][ \t]+/, '$1- ')
      .replace(/\*{2,3}([^*\n]+?)\*{2,3}|__([^_\n]+?)__/g, (_, bold, underlined) => {
        const content = (bold ?? underlined).trim();
        return content ? `*${content}*` : '';
      }))
    .join('\n')
    .replace(/\n(?:[ \t]*\n){2,}/g, '\n\n')
    .trim();
}
