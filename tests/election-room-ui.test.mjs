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
  const shared = {
    '@/components/eleicoes/ElectionReportDownload': { ElectionReportDownload: () => null },
    '@/components/eleicoes/ElectionStepCard': { ElectionStepCard: ({ title, children }) => React.createElement('section', null, React.createElement('h2', null, title), children) },
    '@/components/eleicoes/AttendanceList': { AttendanceList: ({ attendance, actions }) => React.createElement('section', { 'aria-label': 'Chamada compartilhada' }, `${attendance.length} nomes`, React.createElement('button', { onClick: actions.confirm }, 'Confirmar Presença')) },
    '@/components/eleicoes/CandidateForm': { CandidateForm: ({ candidates, actions }) => React.createElement('section', { 'aria-label': 'Indicações compartilhadas' }, candidates.length ? candidates.map(candidate => React.createElement('p', { key: candidate.id }, candidate.name)) : 'Nenhum candidato cadastrado.', React.createElement('button', { onClick: () => actions.add('Indicado de teste') }, 'Adicionar indicado de teste')) },
    '@/lib/election-sequence': { UMP_POSITIONS: ['Presidente', 'Vice-presidente', '1º secretário', '2º secretário', 'Tesoureiro'] },
  };
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../' + file, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, require: id => mocks[id] || shared[id] || require(id), ...globals });
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
    '@/lib/election-room-client': { electionRoomRpc: async (_, args) => { calls.push(args); if (args.p_action === 'start') current = { ...current, revision: '2', phase: 'voting', activeElection: { ...current.activeElection, status: 'open' } }; return { data: { ...current, admin_live_result: { candidates: [candidate], rounds: [{ round: 1, totalBallots: 1, blankVotes: 0, rows: [{ candidate_id: candidate.id, count: 1 }], electedIds: [candidate.id], hasTie: false }] }, room_token: 'test-public-only', urn_token: 'test-shared-urn', attendance: [{ id: 'p1', name: 'Fictício', present: true }], attendance_confirmed: true, current_candidates: [candidate] }, error: null }; } },
    '@/lib/election-room': { parseElectionRoomSnapshot }, '@/components/ui/button': button,
    '@/components/ui/input': { Input: props => React.createElement('input', props) }, '@/components/ui/label': { Label: ({ children, ...props }) => React.createElement('label', props, children) },
    'qrcode.react': { QRCodeSVG: ({ value }) => React.createElement('svg', { 'data-qr-url': value }) },
  }, { document: Object.assign(new EventTarget(), { visibilityState: 'visible' }), window: { location: { origin: 'https://example.test' }, setInterval: fn => { interval = fn; return 1; }, clearInterval() {} }, navigator: { clipboard: { writeText: async () => {} } } }).default;
  let tree; await act(async () => { tree = TestRenderer.create(React.createElement(Page)); });
  assert.equal(calls.length, 1); assert.equal(calls[0].p_action, 'snapshot');
  assert.equal(tree.root.findAllByType('svg').find(node => node.props['data-qr-url']).props['data-qr-url'], 'https://example.test/vote/sala/test-public-only');
  assert.doesNotMatch(JSON.stringify(tree.toJSON()), /test-admin-only/);
  assert.equal(tree.root.findByType('a').props.href, 'https://example.test/vote/sala/test-public-only?painel=1');
  assert.match(JSON.stringify(tree.toJSON()), /Abrir painel de acompanhamento/);
  const start = tree.root.findAllByType('button').find(node => node.children.includes('Iniciar votação'));
  assert.equal(start.props.disabled, false);
  await act(async () => start.props.onClick());
  assert.equal(calls[1].p_action, 'start'); assert.equal(calls[1].p_expected_revision, '1');
  await act(async () => { interval(); });
  assert.equal(calls[2].p_action, 'snapshot');
  assert.match(JSON.stringify(tree.toJSON()), /Aberto/);
  const preview = tree.root.findByProps({ 'aria-label': 'Prévia privada dos votos' });
  assert.equal(preview.findAllByType('span').some(node => node.children.includes('Alfa fictício')), true);
  assert.match(JSON.stringify(tree.toJSON()), /prévia do mesário/);
  assert.equal(preview.findAllByType('li').length, 1);
  assert.equal(preview.findAllByType('strong')[0].children.join(''), '1 votos');
  assert.equal(preview.findAllByType('span').some(node => node.children.includes('Eleito')), false);

  const publish = tree.root.findAllByType('button').find(node => node.children.includes('Apurar e liberar resultado'));
  assert.equal(publish.props.disabled, true, 'inexact count remains blocked');
  await act(async () => tree.unmount());
});

test('public panel only follows counts and never reveals released results; it never mounts a ballot or consumes a shared urn token', async () => {
  let current = snapshot({ phase: 'voting', candidates: [candidate], activeElection: { ...snapshot().activeElection, status: 'open', total_present: 15 }, count: { ballots: 1, present: 15, confirmed: 15, exact: false } });
  let identityReads = 0, ballotMounts = 0; const timers = [];
  const Page = load('src/pages/VoteRoomPublic.tsx', {
    'react-router-dom': { useParams: () => ({ roomToken: 'public-panel' }), useSearchParams: () => [new URLSearchParams('painel=1&urna=must-not-be-used')] },
    '@/lib/browser-vote-device': { getVoteDeviceId: () => { identityReads++; throw new Error('Storage blocked'); } },
    '@/hooks/useElectionRoom': { useElectionRoom: (_, deviceId) => { assert.equal(deviceId, 'ephemeral-panel-id'); return { snapshot: current, error: '', refresh() {} }; } },
    '@/components/ui/button': button,
    './VotePublic': { default: () => { ballotMounts++; throw new Error('Panel must never mount voting controls'); } },
    '@/components/eleicoes/ElectionReportDownload': { ElectionReportDownload: () => { throw new Error('Panel must never load reports'); } },
  }, { crypto: { randomUUID: () => 'ephemeral-panel-id' }, window: { setTimeout: (fn, delay) => { timers.push({ fn, delay }); return timers.length; }, clearTimeout() {} } }).default;
  let tree; await act(async () => { tree = TestRenderer.create(React.createElement(Page)); });
  assert.equal(identityReads, 0); assert.equal(ballotMounts, 0);
  assert.equal(tree.root.findByProps({ role: 'progressbar' }).props['aria-valuenow'], 1);
  assert.equal(tree.root.findByProps({ role: 'progressbar' }).props['aria-valuemax'], 15);
  assert.doesNotMatch(JSON.stringify(tree.toJSON()), /Votar em|CONFIRMAR|must-not-be-used/);
  current = { ...current, phase: 'result', revision: '2', activeElection: { ...current.activeElection, show_result: true }, count: { ballots: 15, present: 15, confirmed: 15, exact: true }, published_result: { candidates: [candidate], rounds: [{ round: 1, totalBallots: 15, blankVotes: 0, rows: [{ candidate_id: candidate.id, count: 15 }], electedIds: [candidate.id], hasTie: false }] } };
  await act(async () => tree.update(React.createElement(Page)));
  assert.doesNotMatch(JSON.stringify(tree.toJSON()), /Alfa fictício|Eleito|Resultado liberado|Baixar relatório/);
  assert.equal(tree.root.findByProps({ role: 'progressbar' }).props['aria-valuenow'], 15);
  assert.equal(timers.some(timer => timer.delay === 10000), false);
  current = { ...current, phase: 'finished' };
  await act(async () => tree.update(React.createElement(Page)));
  assert.doesNotMatch(JSON.stringify(tree.toJSON()), /Alfa fictício|Eleito|Resultado liberado|Baixar relatório/);
  current = { ...current, phase: 'nominations', revision: '3', activeElection: { ...current.activeElection, current_round: 2, nominations_open: true, show_result: false }, count: { ballots: 0, present: 15, confirmed: 15, exact: false }, published_result: null };
  await act(async () => tree.update(React.createElement(Page)));
  assert.equal(tree.root.findByProps({ role: 'progressbar' }).props['aria-valuenow'], 0);
  assert.match(JSON.stringify(tree.toJSON()), /Aguardando as indicações/);
  assert.doesNotMatch(JSON.stringify(tree.toJSON()), /Alfa fictício|Votar em|CONFIRMAR/);
  assert.equal(ballotMounts, 0);
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

test('empty console requires the mesário call and accepted indications; next round opens empty indications without starting', async () => {
  const calls = [];
  let current = snapshot({ activeElection: { ...snapshot().activeElection, total_present: 0 }, count: { ballots: 0, present: 0, confirmed: 0, exact: false } });
  let attendance = [], candidates = [], attendanceConfirmed = false;
  const Page = load('src/pages/ElectionDemoConsole.tsx', {
    'react-router-dom': { useParams: () => ({ adminToken: 'admin-fixture' }) }, '@/components/ui/button': button,
    '@/lib/election-room-client': { electionRoomRpc: async (_, args) => {
      calls.push(args); const action = args.p_action;
      if (action === 'attendance_bulk_add') { attendance = args.p_payload.names.map((name, index) => ({ id: `p${index}`, name, present: args.p_payload.present })); current = { ...current, count: { ...current.count, present: attendance.length } }; }
      if (action === 'confirm_attendance') { attendanceConfirmed = true; current = { ...current, activeElection: { ...current.activeElection, total_present: attendance.length }, count: { ...current.count, confirmed: attendance.length } }; }
      if (action === 'candidate_add') candidates.push({ ...candidate, name: args.p_payload.name, nomination_round: current.activeElection.current_round });
      if (action === 'start') current = { ...current, phase: 'voting', activeElection: { ...current.activeElection, status: 'open', nominations_open: false } };
      if (action === 'next_round') { current = { ...current, phase: 'nominations', activeElection: { ...current.activeElection, current_round: 2, nominations_open: true, show_result: false }, published_result: null, candidates: [], count: { ...current.count, ballots: 0, exact: false } }; candidates = []; }
      if (action !== 'snapshot') current = { ...current, revision: String(Number(current.revision) + 1) };
      return { data: { ...current, room_token: 'public-fixture', attendance, attendance_confirmed: attendanceConfirmed, current_candidates: [...candidates] }, error: null };
    } },
    '@/lib/election-room': { parseElectionRoomSnapshot },
    '@/components/ui/input': { Input: props => React.createElement('input', props) }, '@/components/ui/label': { Label: ({ children }) => React.createElement('label', null, children) },
    'qrcode.react': { QRCodeSVG: () => null },
  }, { document: Object.assign(new EventTarget(), { visibilityState: 'visible' }), window: { location: { origin: 'https://example.test' }, setInterval: () => 1, clearInterval() {} } }).default;
  let tree; await act(async () => { tree = TestRenderer.create(React.createElement(Page)); });
  const find = text => tree.root.findAllByType('button').find(node => node.children.includes(text));
  assert.equal(calls.length, 1); assert.equal(calls[0].p_action, 'snapshot');
  assert.equal(find('2. Indicações').props.disabled, true);
  await act(async () => find('Adicionar 150 presentes fictícios').props.onClick());
  assert.equal(calls.at(-1).p_payload.names.length, 150); assert.equal(calls.at(-1).p_payload.present, true);
  assert.equal(attendanceConfirmed, false);
  await act(async () => find('Confirmar Presença').props.onClick());
  assert.match(JSON.stringify(tree.toJSON()), /Chamada de Presença/);
  await act(async () => find('Avançar: Indicações').props.onClick());
  assert.equal(find('Iniciar votação').props.disabled, true);
  await act(async () => find('Adicionar indicado de teste').props.onClick());
  assert.equal(calls.at(-1).p_action, 'candidate_add');
  assert.equal(find('Iniciar votação').props.disabled, false, 'adding the name accepts it without another approval stage');
  await act(async () => find('Iniciar votação').props.onClick());
  assert.equal(calls.at(-1).p_action, 'start');
  current = { ...current, phase: 'result', activeElection: { ...current.activeElection, show_result: true }, count: { ballots: 150, present: 150, confirmed: 150, exact: true }, published_result: { candidates: [...candidates], rounds: [{ round: 1, totalBallots: 150, blankVotes: 150, rows: [], electedIds: [], hasTie: false }] } };
  await act(async () => find('Atualizar').props.onClick());
  assert.equal(find('Próximo escrutínio').props.disabled, false);
  await act(async () => find('Próximo escrutínio').props.onClick());
  assert.match(JSON.stringify(tree.toJSON()), /Indicações · 2º escrutínio/);
  assert.match(JSON.stringify(tree.toJSON()), /Nenhum candidato cadastrado/);
  assert.equal(find('Iniciar 2º escrutínio').props.disabled, true);
  assert.equal(calls.at(-1).p_action, 'next_round');
  assert.equal(attendance.length, 150); assert.equal(attendanceConfirmed, true);
  await act(async () => tree.unmount());
});
