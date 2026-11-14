import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildStudyRetrospective, studyRetrospectiveMessage } from '../src/lib/study-retrospective.ts';
import { buildStudyRetrospectivePdf } from '../src/lib/study-retrospective-pdf.ts';

test('includes the latest saved summary, preserves its references and identifies lessons without a summary', () => {
  const report = buildStudyRetrospective(2026, [
    { id: 'nov', date: '2026-11-13', title: '2 Timóteo 4:6-8', ai_summary: '📖 **Estudo Bíblico: Guardando a fé**\n📅 **Data:** 13/11/2026\n\nEm *2 Timóteo 4:6-8*, Paulo recorda sua caminhada.\n\n🧠 *Para meditar na semana*\n1. Como posso perseverar?' },
    { id: 'jan', date: '2026-01-30', title: 'Serviço', ai_summary: '📖 *Estudo Bíblico: Tiago 2:14-18*\n\nA fé aparece nas pequenas escolhas.' },
    { id: 'oct', date: '2026-10-09', title: 'Aula sem resumo', ai_summary: null },
    { id: 'previous', date: '2025-12-12', title: 'Outro ano', ai_summary: 'Conteúdo de outro ano.' },
  ]);
  assert.deepEqual(report.entries.map(entry => entry.id), ['jan', 'oct', 'nov']);
  assert.deepEqual(report.entries[1].paragraphs, []);
  assert.deepEqual(report.entries[2].paragraphs, ['Em *2 Timóteo 4:6-8*, Paulo recorda sua caminhada.']);
  const message = studyRetrospectiveMessage(report);
  assert.match(message, /13\/11\/2026/);
  assert.match(message, /Tiago 2:14-18/);
  assert.doesNotMatch(message, /Outro ano|Para meditar|Aula sem resumo/);
});

test('keeps references in long saved paragraphs and exports a long year over several pages', () => {
  const saved = 'A caminhada é feita de escolhas e compromissos. '.repeat(12) + 'O texto estudado foi 2 Timóteo 4:6-8.';
  const report = buildStudyRetrospective(2026, Array.from({ length: 48 }, (_, i) => ({
    id: String(i), date: '2026-10-09', title: 'Encontro ' + (i + 1), ai_summary: saved,
  })));
  assert.match(report.entries[47].paragraphs.join(' '), /2 Timóteo 4:6-8/);
  const pdf = buildStudyRetrospectivePdf(report);
  assert.ok(pdf.getNumberOfPages() > 3);
  assert.ok(pdf.output('arraybuffer').byteLength > 10_000);
});
