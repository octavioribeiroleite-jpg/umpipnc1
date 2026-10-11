import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// Run the actual screen calculations so changed enrollment cannot rewrite a
// closed encounter's totals or labels. The dependencies are synthetic only.
const file = readFileSync(new URL('../src/components/secretaria/ChamadaTab.tsx', import.meta.url), 'utf8');
const syntax = ts.createSourceFile('ChamadaTab.tsx', file, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const declarations = new Map();
function visit(node) {
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) declarations.set(node.name.text, node.getText(syntax));
  ts.forEachChild(node, visit);
}
visit(syntax);
const names = ['closedSummary', 'displayClasses', 'totalVisitors', 'getClassStats', 'getTotalStats'];
for (const name of names) assert.ok(declarations.has(name), `screen declaration ${name}`);
const compiled = ts.transpileModule(`
 function calculate(scope) {
   const { classes, students, attendance, attendanceDate, classVisitors, closureSummary, dayIsClosed } = scope;
   ${names.map(name => `const ${declarations.get(name)};`).join('\n')}
   return { displayClasses, totalVisitors, getClassStats, getTotalStats };
 }
 return calculate;
`, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
const calculate = new Function(compiled)();
const date = '2026-10-04';
const classes = [{ id: 'a', name: 'Turma renomeada', order_index: 0 }, { id: 'b', name: 'Turma nova', order_index: 1 }];
const scope = () => ({
  classes, attendanceDate: date, dayIsClosed: false, closureSummary: null,
  students: [{ id: 'one', class_id: 'a' }, { id: 'two', class_id: 'a' }, { id: 'three', class_id: 'b' }],
  attendance: [{ student_id: 'one', class_id: 'a', date, present: true }, { student_id: 'three', class_id: 'b', date: '2026-10-11', present: true }],
  classVisitors: { a: [{ id: 'current', name: 'Visitante atual' }] },
});
const closure = {
  total_students: 5, present_students: 3, visitor_count: 2,
  class_summary: [{ classId: 'a', className: 'Nome no fechamento', total: 5, present: 3, percentage: 60, visitor_count: 2 }],
};

test('open attendance summary uses only the current encounter and visible enrollment', () => {
  const summary = calculate(scope());
  assert.deepEqual(summary.getTotalStats(), { total: 3, present: 1, percentage: 33, totalWithVisitors: 2 });
  assert.deepEqual(summary.getClassStats('a'), { total: 2, present: 1, marked: 1, percentage: 50, visitors: 1 });
  assert.equal(summary.displayClasses.length, 2);
});

test('closed attendance summary preserves saved totals, names, percentages and visitors after roster changes', () => {
  const summary = calculate({ ...scope(), dayIsClosed: true, closureSummary: closure });
  assert.deepEqual(summary.getTotalStats(), { total: 5, present: 3, percentage: 60, totalWithVisitors: 5 });
  assert.deepEqual(summary.getClassStats('a'), { total: 5, present: 3, marked: 1, percentage: 60, visitors: 2 });
  assert.deepEqual(summary.displayClasses, [{ id: 'a', name: 'Nome no fechamento', order_index: 0 }]);
  assert.equal(closure.class_summary[0].className, 'Nome no fechamento');
});

test('closed summary cannot introduce a class outside the screen authorized scope', () => {
  const summary = calculate({ ...scope(), dayIsClosed: true, closureSummary: {
    ...closure, class_summary: [...closure.class_summary, { classId: 'restricted', className: 'Outra turma', total: 10, present: 10, percentage: 100 }],
  } });
  assert.equal(summary.displayClasses.some(group => group.id === 'restricted'), false);
});

test('reopened encounter returns to current attendance even while its old closure prop is clearing', () => {
  const summary = calculate({ ...scope(), dayIsClosed: false, closureSummary: closure });
  assert.equal(summary.getTotalStats().total, 3);
  assert.equal(summary.displayClasses[0].name, 'Turma renomeada');
  assert.equal(summary.displayClasses.length, 2);
});
