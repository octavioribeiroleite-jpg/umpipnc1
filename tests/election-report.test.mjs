import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { PDFDocument } from 'pdf-lib';
import * as reportModel from '../src/lib/election-report.ts';
const { parseElectionReport, reportRoundRows, reportPercentage, electionReportFilename } = reportModel;
const require = createRequire(import.meta.url);
const pdfModule = { exports: {} };
vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../src/lib/election-report-pdf.ts', import.meta.url), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, {
  module: pdfModule, exports: pdfModule.exports, require: name => name === './election-report' ? reportModel : require(name), Intl, Date,
});
export const buildElectionReportPdf = pdfModule.exports.buildElectionReportPdf;
export function sampleElectionReport() {
  const candidates = [{ id: 'a', name: 'Alfa - indicação inicial', nomination_round: 1 }, { id: 'b', name: 'Beta', nomination_round: 1 }, { id: 'c', name: 'Gama', nomination_round: 1 }, { id: 'd', name: 'Débora - nova indicação aceita', nomination_round: 2 }, { id: 'e', name: 'Érica', nomination_round: 2 }, { id: 'f', name: 'Fábio - indicação sem votos', nomination_round: 2 }];
  return {
    room_id: 'room', title: 'Diretoria UMP - demonstração fictícia', generated_at: '2026-11-08T20:00:00Z', completed: true,
    elections: [{ election: { id: 'election', name: 'Diretoria UMP', position: 'Presidente', status: 'finished', current_round: 2, total_present: 150, seats_count: 1, majority_rule: 'absolute_50' }, candidates,
      rounds: [{ round: 1, totalBallots: 150, blankVotes: 0, rows: [{ candidate_id: 'a', count: 60 }, { candidate_id: 'b', count: 55 }, { candidate_id: 'c', count: 35 }], electedIds: [], hasTie: false }, { round: 2, totalBallots: 150, blankVotes: 0, rows: [{ candidate_id: 'd', count: 90 }, { candidate_id: 'e', count: 60 }], electedIds: ['d'], hasTie: false }],
      electedIds: ['d'], count: { ballots: 150, present: 150, confirmed: 150, exact: true } }],
  };
}
test('report preserves old indications and includes zero-vote new nominees without mixing rounds', () => {
  const report = parseElectionReport(sampleElectionReport()); const entry = report.elections[0];
  assert.deepEqual(reportRoundRows(entry, entry.rounds[0]).map(row => row.name), ['Alfa - indicação inicial', 'Beta', 'Gama']);
  assert.deepEqual(reportRoundRows(entry, entry.rounds[1]).map(row => [row.id, row.votes, row.elected]), [['d', 90, true], ['e', 60, false], ['f', 0, false]]);
  assert.equal(reportPercentage(60, 150), '40%'); assert.equal(reportPercentage(55, 150), '36,7%');
});
test('report refuses incomplete count, unknown candidate, unfinished cargo and missing round', () => {
  for (const mutate of [raw => { raw.elections[0].count.ballots = 149; }, raw => { raw.elections[0].rounds[0].rows[0].candidate_id = 'unknown'; }, raw => { raw.elections[0].election.status = 'open'; }, raw => { raw.elections[0].rounds.shift(); }, raw => { raw.elections[0].rounds[1].totalBallots = 149; }]) {
    const raw = sampleElectionReport(); mutate(raw); assert.throws(() => parseElectionReport(raw));
  }
});
test('report whitelists aggregate data, never capabilities, attendance or browser identities', () => {
  const raw = sampleElectionReport(); Object.assign(raw, { admin_token: 'secret', attendance: ['private'], device_id: 'private-browser' }); raw.elections[0].candidates[0].birth_date = '2000-01-01';
  const json = JSON.stringify(parseElectionReport(raw)); for (const forbidden of ['secret', 'private-browser', 'birth_date', 'attendance', 'admin_token']) assert.ok(!json.includes(forbidden));
  assert.equal(electionReportFilename('../../Áta UMP\n'), 'resultado-ata-ump.pdf');
});
test('PDF contains selectable text, metadata, cover and per-cargo pages with embedded fonts', async () => {
  const report = parseElectionReport(sampleElectionReport());
  report.elections = ['Presidente', 'Vice-presidente', '1º secretário', '2º secretário', 'Tesoureiro'].map((position, index) => ({ ...report.elections[0], election: { ...report.elections[0].election, id: `cargo-${index}`, position } }));
  const fonts = { regular: readFileSync(new URL('../public/fonts/secretaria/inter-400.ttf', import.meta.url)).toString('base64'), bold: readFileSync(new URL('../public/fonts/secretaria/inter-700.ttf', import.meta.url)).toString('base64') };
  const pdf = buildElectionReportPdf(report, fonts); const bytes = pdf.output('arraybuffer');
  const loaded = await PDFDocument.load(bytes); assert.ok(loaded.getPageCount() >= 6); assert.match(loaded.getTitle(), /Diretoria UMP/); assert.equal(loaded.getAuthor(), 'IPNC');
  for (const page of loaded.getPages()) { assert.equal(Math.round(page.getWidth()), 595); assert.equal(Math.round(page.getHeight()), 842); }
});
