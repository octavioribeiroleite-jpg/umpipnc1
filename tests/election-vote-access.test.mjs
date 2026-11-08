import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import TestRenderer, { act } from 'react-test-renderer';

const require = createRequire(import.meta.url);
const pass = ({ children }) => React.createElement('div', null, children);
const exports = {};
const source = readFileSync(new URL('../src/components/eleicoes/ElectionVoteAccess.tsx', import.meta.url), 'utf8');
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText, {
  exports, window: { location: { origin: 'https://election.example.test' } },
  require: id => id === 'qrcode.react' ? { QRCodeSVG: ({ value }) => React.createElement('svg', { 'data-qr-url': value }) }
    : id === '@/hooks/use-toast' ? { useToast: () => ({ toast() {} }) }
    : id === '@/lib/election-room-client' ? { electionRoomRpc: async () => ({ data: { room_token: 'permanent-room-token' }, error: null }) }
    : id === '@/components/ui/button' ? { Button: ({ children, ...props }) => React.createElement('button', props, children) }
    : id === '@/components/ui/tabs' ? { Tabs: pass, TabsContent: pass, TabsList: pass, TabsTrigger: pass }
    : id === '@/components/ui/dialog' ? { Dialog: () => null, DialogContent: pass, DialogDescription: pass, DialogHeader: pass, DialogTitle: pass }
    : require(id),
});
const render = (mode, devices = [{ id: 'urn', label: 'Mesa fictícia', token: 'isolated-token' }], started = false) => renderToStaticMarkup(React.createElement(exports.ElectionVoteAccess, { electionId: 'election-test', electionName: 'Eleição fictícia', mode, devices, started }));

test('shared urn QR retains its device token and is accessible before opening the election', () => {
  const html = render('shared');
  assert.match(html, /data-qr-url="https:\/\/election\.example\.test\/vote\/election-test\?mode=urna&amp;token=isolated-token"/);
  assert.match(html, /Urna compartilhada: votos sucessivos/);
  assert.match(html, /aria-label="Ampliar QR Code: Mesa fictícia"/);
  assert.match(html, /O voto fica disponível após iniciar/);
  assert.match(html, /Copiar link/);
  assert.doesNotMatch(html, /Voto individual: uma cédula/);
});

test('individual voting waits for the persistent room and never exposes a shared urn token', async () => {
  assert.doesNotMatch(render('individual'), /data-qr-url=/, 'must not silently fall back to a one-election QR');
  let tree;
  await act(async () => { tree = TestRenderer.create(React.createElement(exports.ElectionVoteAccess, { electionId: 'election-test', mode: 'individual', devices: [{ id: 'urn', token: 'isolated-token', label: 'Urna' }], started: true })); });
  assert.deepEqual(tree.root.findAllByType('svg').filter(node => node.props['data-qr-url']).map(node => node.props['data-qr-url']), ['https://election.example.test/vote/sala/permanent-room-token']);
  const html = JSON.stringify(tree.toJSON());
  assert.match(html, /Voto individual: uma cédula por navegador/);
  assert.doesNotMatch(html, /isolated-token|mode=urna|Urna compartilhada/);
  await act(async () => tree.unmount());
});

test('both modes preserve distinct links and missing urns do not invent a shared QR', async () => {
  let tree;
  await act(async () => { tree = TestRenderer.create(React.createElement(exports.ElectionVoteAccess, { electionId: 'election-test', mode: 'both', devices: [{ id: 'urn', token: 'isolated-token', label: 'Urna' }], started: false })); });
  assert.deepEqual(tree.root.findAllByType('svg').filter(node => node.props['data-qr-url']).map(node => node.props['data-qr-url']), ['https://election.example.test/vote/sala/permanent-room-token', 'https://election.example.test/vote/election-test?mode=urna&token=isolated-token']);
  assert.match(JSON.stringify(tree.toJSON()), /Voto individual/);
  assert.match(JSON.stringify(tree.toJSON()), /Urna compartilhada/);
  await act(async () => tree.unmount());
  const missing = render('shared', []);
  assert.match(missing, /Cadastre uma urna/);
  assert.doesNotMatch(missing, /data-qr-url=/);
});
