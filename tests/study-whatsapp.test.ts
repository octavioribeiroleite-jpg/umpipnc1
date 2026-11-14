import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatStudySummaryForWhatsApp, splitStudyNotes } from '../supabase/functions/summarize-study/study-whatsapp.ts';

test('treats parenthesized notes as instructions, including comments and multiline requests', () => {
  const notes = 'Persevere nas dificuldades. (Dê destaque à constância.)\n\n' +
    'Sirva com alegria.\n\n(Cadê os emojis e o meu modelo?\nUse o formato de sempre (com reflexão).)';

  assert.deepEqual(splitStudyNotes(notes), {
    content: 'Persevere nas dificuldades. \n\nSirva com alegria.',
    instructions: [
      'Dê destaque à constância.',
      'Cadê os emojis e o meu modelo?\nUse o formato de sempre (com reflexão).',
    ],
  });
});

test('preserves notes when an instruction has not been closed yet', () => {
  const notes = 'Sirva com alegria.\n(Edite o';
  assert.deepEqual(splitStudyNotes(notes), { content: notes, instructions: [] });
});

test('converts a saved Markdown summary into text ready to paste in WhatsApp', () => {
  const summary = [
    'Aqui está o resumo do seu estudo, formatado e pronto para o WhatsApp:',
    '', '---', '',
    '📖 **Estudo Bíblico: O Legado de Paulo**',
    '📅 **Data:** 13/11/2026',
    '',
    'Hoje refletimos sobre **2 Timóteo 4:6-8**.',
    '',
    '*   **O início e a constância:** mantenha o foco.',
    '### 🧠 **Para meditar na semana**',
    '1. Como praticar _constância_?',
  ].join('\r\n');

  assert.equal(formatStudySummaryForWhatsApp(summary), [
    '📖 *Estudo Bíblico: O Legado de Paulo*',
    '📅 *Data:* 13/11/2026',
    '',
    'Hoje refletimos sobre *2 Timóteo 4:6-8*.',
    '',
    '- *O início e a constância:* mantenha o foco.',
    '',
    '🧠 *Para meditar na semana*',
    '',
    '1. Como praticar _constância_?',
  ].join('\n'));
});

test('adds breathing room between topics and questions without removing their explanations', () => {
  const compact = [
    '📖 *Estudo Bíblico: Constância*',
    '📅 *Data:* 13/11/2026',
    '',
    'Hoje refletimos sobre como perseverar.',
    '1️⃣ *Continue mesmo quando for difícil*',
    'A constância aparece nas pequenas decisões, mesmo quando ninguém está vendo.',
    '✨ *2. Renove suas forças no Senhor*',
    'Reserve tempo para orar e peça ajuda quando vier o desânimo.',
    '🙏 *Reflexão:* Pratique o que aprendeu nesta semana.',
    '🧠 *Para meditar na semana*',
    '1. Em que decisão preciso agir com integridade?',
    '2. Como posso cultivar a constância na oração?',
  ];
  const blockStarts = [4, 6, 8, 9, 10, 11];
  const expected = compact.map((line, index) => blockStarts.includes(index) ? `\n${line}` : line).join('\n');
  assert.equal(formatStudySummaryForWhatsApp(compact.join('\n')), expected);
  assert.equal(formatStudySummaryForWhatsApp(expected), expected);
});

test('keeps a WhatsApp message or plain text intact on repeated formatting', () => {
  for (const summary of [
    '📖 *Constância*\n\n- Persevere.\n\n- Reflita sobre _fé_.',
    'Constância\n\n1. Persevere.\n\n2. Sirva.',
  ]) {
    assert.equal(formatStudySummaryForWhatsApp(summary), summary);
    assert.equal(formatStudySummaryForWhatsApp(`\`\`\`markdown\n${summary}\n\`\`\``), summary);
  }
});
