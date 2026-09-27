import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDayRoster, buildDayClasses } from '../src/lib/ebd-roster.ts';

const students = [
  { id: 'a', name: 'Ana', class_id: 'new', active: true, created_at: '2026-01-01T12:00:00Z' },
  { id: 'b', name: 'Bia', class_id: 'old', active: false },
  { id: 'c', name: 'Caio', class_id: 'new', active: true, created_at: '2026-09-27T12:00:00Z' },
  { id: 'd', name: 'Davi', class_id: 'old', active: true, created_at: '2026-01-01T12:00:00Z' },
];
test('historical marks keep former class and inactive pupils without duplicating transferred pupils', () => {
  const result = buildDayRoster(students, [{ student_id: 'a', class_id: 'old' }, { student_id: 'b', class_id: 'old' }], '2026-09-20');
  assert.deepEqual(result.map(s => [s.id, s.class_id]), [['a','old'],['b','old'],['d','old']]);
  assert.equal(students[0].class_id, 'new');
});
test('new unmarked pupils do not change an earlier encounter; São Paulo creation day is used', () => {
  assert.deepEqual(buildDayRoster(students, [], '2026-09-20').map(s => s.id), ['a','d']);
  assert.equal(buildDayRoster([{ id: 'e', name:'E', class_id:'old', created_at:'2026-09-21T01:00:00Z' }], [], '2026-09-20').length, 1);
});
test('inactive classes with historical data remain visible and active empty classes can be opened', () => {
  const classes = [{id:'old', name:'Old', order_index:0,active:false}, {id:'new',name:'New',order_index:1,active:true}, {id:'unused',name:'Unused',order_index:2,active:false}];
  assert.deepEqual(buildDayClasses(classes, [{id:'a',name:'A',class_id:'old'}]).map(c=>c.id), ['old','new']);
  assert.deepEqual(buildDayClasses(classes, [], ['old']).map(c=>c.id), ['old','new']);
});
