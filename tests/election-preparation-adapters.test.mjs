import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

const require = createRequire(import.meta.url);
function component(file, name, messages) {
  const exports = {};
  const failRealRead = () => { throw new Error('Demo adapter must not read or write real tables'); };
  const pass = ({ children, ...props }) => React.createElement('span', props, children);
  const mocks = {
    '@/integrations/supabase/client': { supabase: { from: failRealRead } },
    '@/lib/election-completion': { readElectionCount: failRealRead },
    '@/hooks/use-toast': { useToast: () => ({ toast: message => messages.push(message) }) },
    '@/components/ui/input': { Input: props => React.createElement('input', props) },
    '@/components/ui/button': { Button: ({ children, ...props }) => React.createElement('button', props, children) },
    '@/components/ui/label': { Label: ({ children, ...props }) => React.createElement('label', props, children) },
    '@/components/ui/badge': { Badge: pass },
    '@/components/ui/checkbox': { Checkbox: ({ onCheckedChange, checked, ...props }) => React.createElement('input', { ...props, type: 'checkbox', checked, onChange: event => onCheckedChange(event.target.checked) }) },
    './ImageCropDialog': { ImageCropDialog: () => null },
  };
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../' + file, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, require: id => mocks[id] || require(id) });
  return exports[name];
}

test('candidate adapter adds accepted nominations once, retains a rejected name and never calls production tables', async () => {
  const messages = []; const Form = component('src/components/eleicoes/CandidateForm.tsx', 'CandidateForm', messages);
  let reject = true, calls = 0, refreshed = 0;
  const actions = { add: async () => { calls++; if (reject) throw new Error('Fictício'); }, remove: async () => {} };
  let tree; await act(async () => { tree = TestRenderer.create(React.createElement(Form, { electionId: 'demo', candidates: [], onRefresh: () => refreshed++, actions, allowPhotos: false })); });
  await act(async () => tree.root.findByProps({ 'aria-label': 'Nome do candidato' }).props.onChange({ target: { value: 'Indicação aceita' } }));
  const add = () => tree.root.findByProps({ 'aria-label': 'Adicionar candidato' }).props.onClick;
  await act(async () => add()());
  assert.equal(tree.root.findByProps({ 'aria-label': 'Nome do candidato' }).props.value, 'Indicação aceita');
  assert.equal(refreshed, 0); assert.equal(messages[0].variant, 'destructive');
  reject = false;
  await act(async () => { const click = add(); await Promise.all([click(), click()]); });
  assert.equal(calls, 2, 'one rejected attempt plus one accepted attempt, no duplicate');
  assert.equal(refreshed, 1); assert.equal(tree.root.findByProps({ 'aria-label': 'Nome do candidato' }).props.value, '');
  await act(async () => tree.unmount());
});

test('attendance adapter requires explicit confirmation and reverts failed presence without real-table access', async () => {
  const messages = []; const List = component('src/components/eleicoes/AttendanceList.tsx', 'AttendanceList', messages);
  let confirmations = 0, refreshed = 0, adds = 0;
  const actions = { add: async () => { adds++; }, remove: async () => {}, toggle: async () => { throw new Error('Fictício'); }, confirm: async () => { confirmations++; } };
  let tree; await act(async () => { tree = TestRenderer.create(React.createElement(List, { electionId: 'demo', societyId: null, attendance: [{ id: 'person', name: 'Pessoa fictícia', present: false }], onRefresh: () => refreshed++, actions })); });
  assert.equal(confirmations, 0);
  assert.equal(tree.root.findAllByProps({ 'aria-label': 'Importar membros' }).length, 0);
  await act(async () => tree.root.findAllByType('input').find(node => node.props['aria-label'] === 'Presença de Pessoa fictícia').props.onChange({ target: { checked: true } }));
  assert.equal(tree.root.findByProps({ 'aria-label': 'Presença de Pessoa fictícia' }).props.checked, false);
  assert.equal(refreshed, 0);
  await act(async () => tree.root.findByProps({ 'aria-label': 'Nome do membro' }).props.onChange({ target: { value: 'Outro nome' } }));
  await act(async () => { const click = tree.root.findByProps({ 'aria-label': 'Adicionar membro à presença' }).props.onClick; await Promise.all([click(), click()]); });
  assert.equal(adds, 1);
  const confirm = tree.root.findAllByType('button').find(node => node.children.includes('Confirmar Presença'));
  await act(async () => confirm.props.onClick());
  assert.equal(confirmations, 1); assert.equal(refreshed, 2);
  await act(async () => tree.unmount());
});
