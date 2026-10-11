import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { jsPDF as RealPDF } from 'jspdf';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as queue from '../src/lib/ebd-attendance-queue.ts';
import { buildDayRoster, buildDayClasses, normalizeDayClosure } from '../src/lib/ebd-roster.ts';

// The real PDF generator runs against synthetic data and saves only to memory.
let saved = [];
class CapturedPDF extends RealPDF {
  constructor() {
    super(); const text = []; const original = this.text.bind(this);
    const colors = [];
    for (const setter of ['setFillColor', 'setDrawColor', 'setTextColor']) {
      const setColor = this[setter].bind(this);
      this[setter] = (...args) => { colors.push({ setter, values: args }); return setColor(...args); };
    }
    this.text = (value, ...args) => { text.push(Array.isArray(value) ? value.join('\n') : String(value)); return original(value, ...args); };
    this.save = name => { saved.push({ name, text, colors, bytes: Buffer.from(this.output('arraybuffer')) }); return this; };
  }
}
globalThis.__attendanceReport = { jsPDF: CapturedPDF, format, ptBR, logoBase64: '',
  assertAttendanceConfirmed: queue.assertAttendanceConfirmed, assertEbdSnapshotCurrent: queue.assertEbdSnapshotCurrent };
const source = readFileSync(new URL('../src/utils/generateEbdPDF.ts', import.meta.url), 'utf8').replace(/^import .*;\n/gm, '');
const compiled = ts.transpileModule('const {jsPDF,format,ptBR,logoBase64,assertAttendanceConfirmed,assertEbdSnapshotCurrent}=globalThis.__attendanceReport;\n' + source,
  { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { generateEbdAttendancePDF, generateEbdPeriodPDF, generateEbdQuarterlyPDF } = await import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'));
const date = '2026-10-11';
const groups = [{ id: 'a', name: 'Nome atual da turma', order_index: 0 }, { id: 'b', name: 'Outra turma atual', order_index: 1 }, { id: 'later', name: 'Turma criada depois', order_index: 2 }];
const pupils = [{ id: 'one', class_id: 'a', name: 'Aluno atual 1' }, { id: 'two', class_id: 'a', name: 'Aluno atual 2' }, { id: 'three', class_id: 'a', name: 'Aluno incluído após fechar' }];
const attendance = [{ student_id: 'one', class_id: 'a', date, present: true }];
const closedSummary = { total_students: 15, present_students: 10, class_summary: [
  { classId: 'a', className: 'Nome salvo da turma', total: 5, present: 2, percentage: 40 },
  { classId: 'b', className: 'Outra turma no fechamento', total: 10, present: 8, percentage: 80 },
] };
function params(extra = {}) { return { snapshotVersion: queue.captureEbdSnapshot(), classes: groups, students: pupils, attendance, date, formattedDate: '11 de outubro de 2026', ...extra }; }
beforeEach(() => { saved = []; });

test('closure normalization keeps valid saved values and fails closed on malformed totals or class percentages', () => {
  assert.deepEqual(normalizeDayClosure(closedSummary), closedSummary);
  assert.equal(normalizeDayClosure(null), null);
  assert.equal(normalizeDayClosure({ id: 'teacher-minimal', date, visitor_count: 0 }), null);
  assert.throws(() => normalizeDayClosure({ ...closedSummary, total_students: 1 }), /incompleto/);
  assert.throws(() => normalizeDayClosure({ ...closedSummary, class_summary: [{ ...closedSummary.class_summary[0], percentage: Number.NaN }] }), /incompleto/);
  assert.throws(() => normalizeDayClosure({ ...closedSummary, class_summary: null }), /incompleto/);
});

test('closed daily PDF keeps saved totals and class names while identifying current nominal differences', () => {
  generateEbdAttendancePDF(params({ closedSummary }));
  assert.equal(saved.length, 1); assert.equal(saved[0].bytes.subarray(0, 5).toString(), '%PDF-');
  const text = saved[0].text.join('\n');
  assert.match(text, /2\/5 presentes \(40%\)/); assert.match(text, /8\/10 presentes \(80%\)/);
  assert.ok(saved[0].text.includes('15')); assert.ok(saved[0].text.includes('10')); assert.ok(saved[0].text.includes('67%'));
  assert.match(text, /Nome salvo da turma/); assert.doesNotMatch(text, /Turma criada depois/);
  assert.match(text, /difere do resumo salvo/); assert.match(text, /lista nominal abaixo pode não coincidir/);
  assert.match(text, /Aluno incluído após fechar/); assert.equal(closedSummary.class_summary[0].total, 5);
});

test('class-filtered closed daily PDF uses only the matching frozen class slice', () => {
  generateEbdAttendancePDF(params({ closedSummary, classes: groups.filter(group => group.id === 'a') }));
  const text = saved[0].text.join('\n');
  assert.match(text, /2\/5 presentes \(40%\)/); assert.doesNotMatch(text, /8\/10 presentes|Outra turma no fechamento/);
  assert.ok(saved[0].text.includes('5')); assert.ok(saved[0].text.includes('2')); assert.ok(saved[0].text.includes('40%'));
  assert.doesNotMatch(text, /67%/);
});

test('open daily PDF preserves confirmed current roster calculations without a closure notice', () => {
  generateEbdAttendancePDF(params({ classes: groups.filter(group => group.id === 'a') }));
  const text = saved[0].text.join('\n');
  assert.match(text, /1\/3 presentes \(33%\)/); assert.match(text, /Nome atual da turma/); assert.doesNotMatch(text, /Totais preservados do fechamento/);
});

test('teacher PDF keeps anonymous authorized attendance in the totals and explains unavailable names without revealing hidden enrollment', () => {
  const authorized = [
    { student_id: 'visible', class_id: 'own', date, present: true },
    { student_id: 'hidden', class_id: 'own', date, present: true },
  ];
  const roster = buildDayRoster([{ id: 'visible', name: 'Aluno permitido', class_id: 'own', active: true }], authorized, date);
  generateEbdAttendancePDF(params({ classes: [{ id: 'own', name: 'Turma permitida', order_index: 0 }], students: roster, attendance: authorized }));
  const text = saved[0].text.join('\n');
  assert.match(text, /2\/2 presentes \(100%\)/); assert.ok(saved[0].text.includes('100%'));
  assert.match(text, /Aluno com registro de presença/); assert.match(text, /Alguns nomes não estão disponíveis/);
  assert.match(text, /registros autorizados continuam incluídos nos totais/); assert.doesNotMatch(text, /Totais preservados do fechamento|hidden/);
  assert.equal(authorized.length, 2);
});

test('daily ranking emits a readable first ordinal without an unsupported emoji in the Helvetica PDF text stream', () => {
  generateEbdAttendancePDF(params({ classes: groups.filter(group => group.id === 'a') }));
  assert.ok(saved[0].text.includes('1º'));
  assert.doesNotMatch(saved[0].text.join('\n'), /[\u{1F300}-\u{1FAFF}]/u);
  assert.match(saved[0].bytes.toString('latin1'), /\(1\xBA\) Tj/, 'The ordinal must use the PDF standard Latin-1 character, not a surrogate pair');
});

test('daily, period and quarterly PDFs share institutional green and cream while preserving presence and absence colors', () => {
  const snapshotVersion = queue.captureEbdSnapshot();
  const day = { date, present: 1, total: 2, percentage: 50, visitorCount: 1 };
  const actions = [
    () => generateEbdAttendancePDF(params({ classes: groups.filter(group => group.id === 'a') })),
    () => generateEbdPeriodPDF({ snapshotVersion, periodLabel: 'Período sintético', days: [day], classes: [{ name: 'Turma sintética', totalPresent: 1, avgPercentage: 50 }] }),
    () => generateEbdQuarterlyPDF({ snapshotVersion, periodLabel: 'Trimestre sintético', days: [day], classesDetail: [{ name: 'Turma sintética', totalPresent: 1, avgPercentage: 50, totalVisitors: 1,
      days: [{ ...day, visitorNames: ['Visitante sintético'] }], students: [{ name: 'Aluno sintético', present: 1, total: 2, percentage: 50 }] }] }),
  ];
  for (const action of actions) {
    action(); const colors = saved.at(-1).colors;
    const has = (setter, values) => colors.some(color => color.setter === setter && JSON.stringify(color.values) === JSON.stringify(values));
    assert.equal(has('setFillColor', [15, 61, 46]), true, 'Institutional dark green header');
    assert.equal(has('setDrawColor', [28, 128, 82]), true, 'Institutional primary green accent');
    assert.equal(has('setFillColor', [246, 250, 247]), true, 'Cream report surface');
    assert.equal(has('setDrawColor', [221, 235, 225]), true, 'Soft green report border');
    assert.equal(has('setTextColor', [34, 139, 34]), true, 'Presence keeps its semantic success color');
    for (const old of [[30, 58, 95], [52, 152, 219], [46, 92, 170], [240, 245, 250], [248, 249, 252], [200, 210, 220], [180, 200, 220]]) {
      assert.equal(colors.some(color => JSON.stringify(color.values) === JSON.stringify(old)), false, 'Retired blue brand color ' + old.join(','));
    }
  }
  assert.ok(saved[0].colors.some(color => color.setter === 'setTextColor' && JSON.stringify(color.values) === '[200,50,50]'), 'Absence keeps its semantic danger color');
});

test('real daily read retains an inactive class present only in the frozen closure', async () => {
  const inactive = { id: 'closed-only', name: 'Sala inativada', order_index: 0, active: false };
  const closure = { total_students: 1, present_students: 0, class_summary: [{ classId: inactive.id, className: 'Sala salva', total: 1, present: 0, percentage: 0 }] };
  const data = { ebd_classes: [inactive], ebd_students: [], ebd_attendance: [], ebd_day_closures: [closure], ebd_call_status: [], ebd_class_visitor_entries: [] };
  const supabase = { from(table) {
    let single = false; const chain = { select() { return chain; }, order() { return chain; }, eq() { return chain; },
      maybeSingle() { single = true; return chain; }, then(resolve, reject) { return Promise.resolve({ data: single ? data[table][0] ?? null : data[table], error: null }).then(resolve, reject); } };
    return chain;
  } };
  globalThis.__closedDayRead = { supabase, ensureEbdSession: async () => {}, captureEbdSnapshot: queue.captureEbdSnapshot, buildDayRoster, buildDayClasses, normalizeDayClosure };
  const daySource = readFileSync(new URL('../src/lib/ebd-day.ts', import.meta.url), 'utf8').replace(/^import .*;\n/gm, '');
  const dayCompiled = ts.transpileModule('const {supabase,ensureEbdSession,captureEbdSnapshot,buildDayRoster,buildDayClasses,normalizeDayClosure}=globalThis.__closedDayRead;\n' + daySource,
    { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  const { readEbdDay } = await import('data:text/javascript;base64,' + Buffer.from(dayCompiled).toString('base64'));
  const day = await readEbdDay(date);
  assert.deepEqual(day.classes.map(group => group.id), [inactive.id]);
  generateEbdAttendancePDF(params({ ...day, closedSummary: day.closure }));
  assert.match(saved[0].text.join('\n'), /Sala salva|0\/1 presentes \(0%\)/);
});
