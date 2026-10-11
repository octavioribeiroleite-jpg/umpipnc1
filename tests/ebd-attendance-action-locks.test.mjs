import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// Execute shipped callbacks with one render's captured state. Two invocations
// can occur before React commits disabled buttons; refs must keep the first busy.
const source = readFileSync(new URL('../src/components/secretaria/ChamadaTab.tsx', import.meta.url), 'utf8');
const syntax = ts.createSourceFile('ChamadaTab.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const declarations = new Map();
let pdfCallback;
function visit(node) {
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) declarations.set(node.name.text, node.getText(syntax));
  if (ts.isJsxOpeningElement(node) && node.attributes.properties.some(prop => ts.isJsxAttribute(prop) && prop.name.getText(syntax) === 'aria-label' && ts.isStringLiteral(prop.initializer) && prop.initializer.text === 'Baixar PDF da chamada')) {
    const click = node.attributes.properties.find(prop => ts.isJsxAttribute(prop) && prop.name.getText(syntax) === 'onClick');
    pdfCallback = click.initializer.expression.getText(syntax);
  }
  ts.forEachChild(node, visit);
}
visit(syntax);
const names = ['setClassChamadaStatus', 'handleCloseDay', 'handleReopenDay', 'submitVisitor', 'toggleAttendance'];
for (const name of names) assert.ok(declarations.has(name), `shipped callback ${name}`);
assert.ok(pdfCallback, 'shipped attendance PDF callback');
const compiled = ts.transpileModule(`
 function create(env) {
  const { savingStatus, addingVisitor, pendingCount, dayIsClosed, isReadOnly, attendanceDate,
    statusInFlight, dayActionInFlight, pdfInFlight, visitorInFlight,
    setSavingStatus, setClosingDay, setGeneratingPdf, setAddingVisitor,
    setShowCloseConfirm, setShowReopenConfirm, setVisitorNameDraft, setVisitorInputOpen,
    assertAttendanceConfirmed, reportEbdWriteError, onCallStatusChange, onCloseDay, onReopenDay,
    onAddClassVisitor, selectedClass, visitorNameDraft, verificationScope, mounted,
    readEbdDay, generateEbdAttendancePDF, formattedDate, initialProfessorName,
    getClassChamadaStatus, attendanceQueue, recordByStudent } = env;
  ${names.map(name => `const ${declarations.get(name)};`).join('\n')}
  const downloadPdf = ${pdfCallback};
  return { setClassChamadaStatus, handleCloseDay, handleReopenDay, submitVisitor, toggleAttendance, downloadPdf };
 }
 return create;
`, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
const create = new Function(compiled)();
function deferred() {
 let resolve, reject;
 const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
 return { promise, resolve, reject };
}
function harness(extra = {}) {
 const writes = { status: 0, close: 0, reopen: 0, visitor: 0, read: 0, pdf: 0, attendance: 0, errors: 0 };
 const work = { status: deferred(), day: deferred(), visitor: deferred(), read: deferred() };
 const busy = { status: [], day: [], visitor: [], pdf: [] };
 const drafts = [];
 const refs = { statusInFlight: {current:false}, dayActionInFlight: {current:false}, pdfInFlight:{current:false}, visitorInFlight:{current:false} };
 const queue = { submit: () => writes.attendance++ };
 const env = {
  savingStatus: false, addingVisitor: false, pendingCount: 0, dayIsClosed: false, isReadOnly: false,
  attendanceDate: '2026-10-11', formattedDate: '11 de outubro de 2026', initialProfessorName: '',
  selectedClass: { id: 'synthetic-class' }, visitorNameDraft: 'Visitante sintético',
  ...refs, setSavingStatus: value => busy.status.push(value), setClosingDay: value => busy.day.push(value),
  setAddingVisitor: value => busy.visitor.push(value), setGeneratingPdf: value => busy.pdf.push(value),
  setShowCloseConfirm: () => {}, setShowReopenConfirm: () => {}, setVisitorNameDraft: value => drafts.push(value), setVisitorInputOpen: () => {},
  assertAttendanceConfirmed: () => {}, reportEbdWriteError: async () => { writes.errors++; },
  onCallStatusChange: async () => { writes.status++; return work.status.promise; },
  onCloseDay: async () => { writes.close++; return work.day.promise; },
  onReopenDay: async () => { writes.reopen++; return work.day.promise; },
  onAddClassVisitor: async () => { writes.visitor++; return work.visitor.promise; },
  verificationScope: { current: { queue, date: '2026-10-11' } }, mounted: { current: true },
  readEbdDay: async () => { writes.read++; return work.read.promise; }, generateEbdAttendancePDF: () => writes.pdf++,
  getClassChamadaStatus: () => 'aberta', attendanceQueue: queue, recordByStudent: new Map(),
  ...extra,
 };
 return { ...create(env), writes, work, busy, drafts, refs, env };
}

test('status double invocation keeps the first mutation busy and blocks marks until completion', async () => {
 const h = harness();
 const first = h.setClassChamadaStatus('synthetic-class', 'aberta');
 await h.setClassChamadaStatus('synthetic-class', 'aberta');
 h.toggleAttendance({ id: 'synthetic-pupil', class_id: 'synthetic-class' }, false);
 assert.equal(h.writes.status, 1); assert.equal(h.writes.attendance, 0);
 assert.deepEqual(h.busy.status, [true]); assert.equal(h.refs.statusInFlight.current, true);
 h.work.status.reject(new Error('Synthetic rejection')); await first;
 assert.equal(h.writes.errors, 1); assert.deepEqual(h.busy.status, [true, false]);
 assert.equal(h.refs.statusInFlight.current, false);
 h.work.status = deferred(); const retry = h.setClassChamadaStatus('synthetic-class', 'aberta');
 assert.equal(h.writes.status, 2); h.work.status.resolve(); await retry;
 h.toggleAttendance({ id: 'synthetic-pupil', class_id: 'synthetic-class' }, false);
 assert.equal(h.writes.attendance, 1);
});

test('close and reopen share the same synchronous lock without premature busy cleanup', async () => {
 const h = harness(); const first = h.handleCloseDay();
 await h.handleCloseDay(); await h.handleReopenDay();
 assert.equal(h.writes.close, 1); assert.equal(h.writes.reopen, 0); assert.deepEqual(h.busy.day, [true]);
 h.work.day.resolve(); await first; assert.deepEqual(h.busy.day, [true, false]);
 h.work.day = deferred(); const reopen = h.handleReopenDay();
 await h.handleReopenDay(); await h.handleCloseDay();
 assert.equal(h.writes.reopen, 1); assert.equal(h.writes.close, 1);
 h.work.day.reject(new Error('Synthetic rejection')); await reopen;
 assert.equal(h.refs.dayActionInFlight.current, false); assert.equal(h.writes.errors, 1);
});

test('visitor double submit cannot create a second visitor and a rejected draft can retry', async () => {
 const h = harness(); const first = h.submitVisitor(); await h.submitVisitor();
 assert.equal(h.writes.visitor, 1); assert.deepEqual(h.busy.visitor, [true]); assert.deepEqual(h.drafts, []);
 h.work.visitor.reject(new Error('Synthetic rejection')); await first;
 assert.equal(h.refs.visitorInFlight.current, false); assert.deepEqual(h.drafts, []);
 h.work.visitor = deferred(); const retry = h.submitVisitor();
 assert.equal(h.writes.visitor, 2); h.work.visitor.resolve(); await retry;
 assert.deepEqual(h.drafts, ['']);
});

test('PDF double click reads once and makes one export, releasing its lock after failure and scope change', async () => {
 const h = harness(); const first = h.downloadPdf(); await h.downloadPdf();
 assert.equal(h.writes.read, 1); assert.deepEqual(h.busy.pdf, [true]);
 h.work.read.resolve({ snapshotVersion: 1, classes: [], students: [], attendance: [], closure: null }); await first;
 assert.equal(h.writes.pdf, 1); assert.equal(h.refs.pdfInFlight.current, false);
 h.work.read = deferred(); const retry = h.downloadPdf();
 h.work.read.reject(new Error('Synthetic read rejection')); await retry;
 assert.equal(h.writes.errors, 1); assert.equal(h.refs.pdfInFlight.current, false);
 h.work.read = deferred(); const stale = h.downloadPdf();
 h.env.verificationScope.current = { queue: h.env.attendanceQueue, date: '2026-10-18' };
 h.work.read.resolve({ snapshotVersion: 1, classes: [], students: [], attendance: [], closure: null }); await stale;
 assert.equal(h.writes.pdf, 1); assert.equal(h.refs.pdfInFlight.current, false);
});

test('pending attendance and readonly visitor controls reject locally without setting busy locks', async () => {
 const pending = harness({ pendingCount: 1 }); await pending.handleCloseDay();
 assert.equal(pending.writes.close, 0); assert.equal(pending.refs.dayActionInFlight.current, false);
 const readonly = harness({ isReadOnly: true }); await readonly.submitVisitor();
 assert.equal(readonly.writes.visitor, 0); assert.equal(readonly.refs.visitorInFlight.current, false);
 const missingName = harness();
 missingName.toggleAttendance({ id: 'hidden-pupil', class_id: 'synthetic-class', nameUnavailable: true, attendanceReadOnly: true }, true);
 assert.equal(missingName.writes.attendance, 0, 'a presence whose student name is unavailable stays read-only');
});
