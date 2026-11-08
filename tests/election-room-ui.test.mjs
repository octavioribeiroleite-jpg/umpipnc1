import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { parseElectionRoomSnapshot } from '../src/lib/election-room.ts';

const require = createRequire(import.meta.url);
function load(file, mocks, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../' + file, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, require: id => mocks[id] || require(id), ...globals });
  return exports;
}
const candidate = { id: 'candidate-a', name: 'Alfa fictício', photo_url: null, photo_urls: [] };
function snapshot(overrides = {}) {
  return { kind: 'demo', room_id: 'room-a', title: 'Ensaio fictício', revision: '1', phase: 'waiting', activeElection: { id: 'election-a', name: 'Ensaio fictício', position: 'Presidente', status: 'draft', current_round: 1, total_present: 2, seats_count: 1, max_choices_per_ballot: 1, majority_rule: 'absolute_50', voting_mode: 'both', show_result: false }, candidates: [], already_voted: false, eligible_candidate_ids: ['candidate-a'], elected_ids: [], max_choices: 1, count: { ballots: 0, present: 2, confirmed: 2, exact: false }, published_result: null, ...overrides };
}
const button = { Button: ({ children, ...props }) => React.createElement('button', props, children) };

test('room waits, retains the receipt, blocks a second individual vote and opens the next round without rescanning', async () => {
  let current = snapshot(); const timers = new Map(); let id = 0; let session;
  const Page = load('src/pages/VoteRoomPublic.tsx', {
    'react-router-dom': { useParams: () => ({ roomToken: 'public-room' }), useSearchParams: () => [new URLSearchParams()] },
    '@/lib/browser-vote-device': { getVoteDeviceId: () => 'browser-a' },
    '@/hooks/useElectionRoom': { useElectionRoom: () => ({ snapshot: current, error: '', refresh() {} }) },
    '@/components/ui/button': button,
    './VotePublic': { default: ({ roomSession }) => { session = roomSession; return React.createElement('button', { onClick: roomSession.onConfirmed }, 'Cédula fictícia'); } },
  }, { window: { setTimeout: (fn, delay) => { timers.set(++id, { fn, delay }); return id; }, clearTimeout: key => timers.delete(key) } }).default;
  let tree;
  await act(async () => { tree = TestRenderer.create(React.createElement(Page)); });
  assert.match(JSON.stringify(tree.toJSON()), /Aguardando o mesário/);
  assert.doesNotMatch(JSON.stringify(tree.toJSON()), /Alfa fictício|Cédula fictícia/);
  current = snapshot({ phase: 'voting', candidates: [candidate] });
  await act(async () => tree.update(React.createElement(Page)));
  assert.equal(session.roomToken, 'public-room');
  await act(async () => tree.root.findByType('button').props.onClick());
  assert.match(JSON.stringify(tree.toJSON()), /VOTO CONFIRMADO/);
  await act(async () => { for (const timer of timers.values()) if (timer.delay === 1500) timer.fn(); });
  assert.match(JSON.stringify(tree.toJSON()), /Seu voto neste escrutínio já foi registrado/);
  current = snapshot({ phase: 'voting', candidates: [candidate], revision: '2', activeElection: { ...current.activeElection, status: 'open', current_round: 2 } });
  await act(async () => tree.update(React.createElement(Page)));
  assert.match(JSON.stringify(tree.toJSON()), /Cédula fictícia/);
  assert.equal(session.snapshot.activeElection.current_round, 2);
  await act(async () => tree.unmount());
});

test('published result returns to waiting and hiding/reconnection errors do not leave the result visible', async () => {
  const timers = new Map(); let id = 0; let error = '';
  let current = snapshot({ phase: 'result', activeElection: { ...snapshot().activeElection, status: 'finished', show_result: true }, count: { ballots: 2, present: 2, confirmed: 2, exact: true }, published_result: { candidates: [candidate], rounds: [{ round: 1, totalBallots: 2, blankVotes: 0, rows: [{ candidate_id: candidate.id, count: 2 }], electedIds: [candidate.id], hasTie: false }] } });
  const Page = load('src/pages/VoteRoomPublic.tsx', {
    'react-router-dom': { useParams: () => ({ roomToken: 'public-room' }), useSearchParams: () => [new URLSearchParams()] },
    '@/lib/browser-vote-device': { getVoteDeviceId: () => 'browser-a' }, '@/components/ui/button': button,
    '@/hooks/useElectionRoom': { useElectionRoom: () => ({ snapshot: current, error, refresh() {} }) }, './VotePublic': { default: () => null },
  }, { window: { setTimeout: (fn, delay) => { timers.set(++id, { fn, delay }); return id; }, clearTimeout: key => timers.delete(key) } }).default;
  let tree; await act(async () => { tree = TestRenderer.create(React.createElement(Page)); });
  assert.match(JSON.stringify(tree.toJSON()), /Alfa fictício/);
  await act(async () => { for (const timer of timers.values()) if (timer.delay === 10000) timer.fn(); });
  assert.doesNotMatch(JSON.stringify(tree.toJSON()), /Alfa fictício/);
  current = { ...current, revision: '2' }; await act(async () => tree.update(React.createElement(Page)));
  assert.match(JSON.stringify(tree.toJSON()), /Alfa fictício/);
  error = 'Falha fictícia'; await act(async () => tree.update(React.createElement(Page)));
  assert.doesNotMatch(JSON.stringify(tree.toJSON()), /Alfa fictício/);
  error = ''; current = snapshot(); await act(async () => tree.update(React.createElement(Page)));
  assert.doesNotMatch(JSON.stringify(tree.toJSON()), /Alfa fictício/);
  await act(async () => tree.unmount());
});

test('room subscription rejects a late response from a previous capability', async () => {
  const pending = new Map(); const observations = [];
  const doc = Object.assign(new EventTarget(), { visibilityState: 'visible' }); const win = new EventTarget();
  const hook = load('src/hooks/useElectionRoom.ts', { '@/lib/election-room-client': { electionRoomRpc: async (_, args) => new Promise(resolve => pending.set(args.p_room_token, resolve)) }, '@/lib/election-room': { parseElectionRoomSnapshot } }, { document: doc, window: win, setTimeout: () => 1, clearTimeout() {} }).useElectionRoom;
  function View({ token }) { const state = hook(token, 'browser-a'); observations.push(state.snapshot?.title || null); return React.createElement('p', null, state.snapshot?.title || 'waiting'); }
  let tree; await act(async () => { tree = TestRenderer.create(React.createElement(View, { token: 'old' })); });
  await act(async () => tree.update(React.createElement(View, { token: 'new' })));
  await act(async () => pending.get('new')({ data: snapshot({ title: 'Nova sala' }), error: null }));
  assert.match(JSON.stringify(tree.toJSON()), /Nova sala/);
  await act(async () => pending.get('old')({ data: snapshot({ title: 'Sala antiga' }), error: null }));
  assert.doesNotMatch(JSON.stringify(tree.toJSON()), /Sala antiga/);
  assert.equal(observations.includes('Sala antiga'), false);
  await act(async () => tree.unmount());
});

test('unreleased or inexact results and malformed counters fail closed', () => {
  assert.throws(() => parseElectionRoomSnapshot(snapshot({ phase: 'result', published_result: { rounds: [], candidates: [] } })));
  assert.throws(() => parseElectionRoomSnapshot(snapshot({ count: { ballots: -1, present: 2, confirmed: 2, exact: false } })));
  assert.equal(parseElectionRoomSnapshot(snapshot()).phase, 'waiting');
});

test('demo console only reads on load, keeps admin capability out of the participant QR and continues polling after a command', async () => {
  const calls = []; let interval;
  let current = snapshot();
  const Page = load('src/pages/ElectionDemoConsole.tsx', {
    'react-router-dom': { useParams: () => ({ adminToken: 'test-admin-only' }) },
    '@/lib/election-room-client': { electionRoomRpc: async (_, args) => { calls.push(args); if (args.p_action === 'start') current = { ...current, revision: '2', phase: 'voting', activeElection: { ...current.activeElection, status: 'open' } }; return { data: { ...current, room_token: 'test-public-only', urn_token: 'test-shared-urn' }, error: null }; } },
    '@/lib/election-room': { parseElectionRoomSnapshot }, '@/components/ui/button': button,
    '@/components/ui/input': { Input: props => React.createElement('input', props) }, '@/components/ui/label': { Label: ({ children, ...props }) => React.createElement('label', props, children) },
    'qrcode.react': { QRCodeSVG: ({ value }) => React.createElement('svg', { 'data-qr-url': value }) },
  }, { document: Object.assign(new EventTarget(), { visibilityState: 'visible' }), window: { location: { origin: 'https://example.test' }, setInterval: fn => { interval = fn; return 1; }, clearInterval() {} }, navigator: { clipboard: { writeText: async () => {} } } }).default;
  let tree; await act(async () => { tree = TestRenderer.create(React.createElement(Page)); });
  assert.equal(calls.length, 1); assert.equal(calls[0].p_action, 'snapshot');
  assert.equal(tree.root.findAllByType('svg').find(node => node.props['data-qr-url']).props['data-qr-url'], 'https://example.test/vote/sala/test-public-only');
  assert.doesNotMatch(JSON.stringify(tree.toJSON()), /test-admin-only/);
  const start = tree.root.findAllByType('button').find(node => node.children.includes('Iniciar votação'));
  assert.equal(start.props.disabled, false);
  await act(async () => start.props.onClick());
  assert.equal(calls[1].p_action, 'start'); assert.equal(calls[1].p_expected_revision, '1');
  await act(async () => { interval(); });
  assert.equal(calls[2].p_action, 'snapshot');
  assert.match(JSON.stringify(tree.toJSON()), /Aberto/);
  const publish = tree.root.findAllByType('button').find(node => node.children.includes('Apurar e liberar resultado'));
  assert.equal(publish.props.disabled, true, 'inexact count remains blocked');
  await act(async () => tree.unmount());
});

test('demo console blocks on read/command failure and completes only through the mesário button', async () => {
  for (const scenario of ['read-error', 'command-error', 'complete']) {
    const calls = [];
    const current = snapshot({ activeElection: { ...snapshot().activeElection, status: 'finished' }, phase: 'waiting' });
    const Page = load('src/pages/ElectionDemoConsole.tsx', {
      'react-router-dom': { useParams: () => ({ adminToken: 'test-admin-only' }) }, '@/components/ui/button': button,
      '@/lib/election-room-client': { electionRoomRpc: async (_, args) => { calls.push(args); if (scenario === 'read-error' || (scenario === 'command-error' && args.p_action !== 'snapshot')) return { data: null, error: new Error('Fictício') }; return { data: { ...current, phase: args.p_action === 'complete' ? 'finished' : 'waiting', room_token: 'public-only' }, error: null }; } },
      '@/lib/election-room': { parseElectionRoomSnapshot },
      '@/components/ui/input': { Input: props => React.createElement('input', props) }, '@/components/ui/label': { Label: ({ children }) => React.createElement('label', null, children) },
      'qrcode.react': { QRCodeSVG: () => null },
    }, { document: Object.assign(new EventTarget(), { visibilityState: 'visible' }), window: { location: { origin: 'https://example.test' }, setInterval: () => 1, clearInterval() {} } }).default;
    let tree; await act(async () => { tree = TestRenderer.create(React.createElement(Page)); });
    assert.equal(calls.length, 1); assert.equal(calls[0].p_action, 'snapshot');
    if (scenario === 'read-error') assert.match(JSON.stringify(tree.toJSON()), /As ações foram bloqueadas/);
    else {
      const complete = tree.root.findAllByType('button').find(node => node.children.includes('Encerrar a sessão'));
      assert.equal(complete.props.disabled, false);
      await act(async () => complete.props.onClick());
      assert.equal(calls.length, 2); assert.equal(calls[1].p_action, 'complete');
      if (scenario === 'command-error') assert.match(JSON.stringify(tree.toJSON()), /A ação não foi confirmada/);
      else assert.equal(tree.root.findAllByType('button').find(node => node.children.includes('Encerrar a sessão')).props.disabled, true);
    }
    await act(async () => tree.unmount());
  }
});
