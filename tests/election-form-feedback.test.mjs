import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { isBallotConfirmed } from '../src/components/eleicoes/ballot-response.ts';

// Exercise the real component handlers with local doubles. No render, credential
// or network access is needed to verify when a draft/crop may be discarded.
function handler(file, name, context) {
  const source = ts.createSourceFile(file, readFileSync(new URL('../' + file, import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let declaration;
  const visit = node => { if (ts.isVariableDeclaration(node) && node.name.getText(source) === name) declaration = node; ts.forEachChild(node, visit); };
  visit(source);
  assert.ok(declaration?.initializer, `${name} must remain a testable real handler`);
  const compiled = ts.transpileModule(`globalThis.handler = ${declaration.initializer.getText(source)};`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const sandbox = { ...context };
  vm.runInNewContext(compiled, sandbox);
  return sandbox.handler;
}

test('returned and thrown candidate errors retain the entered name and do not refresh as saved', async () => {
  for (const thrown of [false, true]) {
    let cleared = false, refreshed = false, notified = false;
    const actual = handler('src/components/eleicoes/CandidateForm.tsx', 'handleAdd', {
      disabled: false, name: 'Nome fictício mantido', label: 'candidato', candidates: [], electionId: 'fixture-only', addInFlight: { current: false },
      setAdding() {}, setName() { cleared = true; }, onRefresh() { refreshed = true; }, toast() { notified = true; },
      supabase: { from: () => ({ insert: async () => { if (thrown) throw new Error('Local failure'); return { error: new Error('Returned failure') }; } }) },
    });
    await actual();
    assert.equal(cleared, false);
    assert.equal(refreshed, false);
    assert.equal(notified, true);
  }
});

test('successful candidate insert clears the draft only after its acknowledgement', async () => {
  let cleared = false, refreshed = false;
  const actual = handler('src/components/eleicoes/CandidateForm.tsx', 'handleAdd', {
    disabled: false, name: 'Nome fictício', label: 'candidato', candidates: [], electionId: 'fixture-only', addInFlight: { current: false },
    setAdding() {}, setName(value) { assert.equal(value, ''); cleared = true; }, onRefresh() { refreshed = true; }, toast() { assert.fail('Unexpected error'); },
    supabase: { from: () => ({ insert: async () => { assert.equal(cleared, false); return { error: null }; } }) },
  });
  await actual();
  assert.equal(cleared, true);
  assert.equal(refreshed, true);
});

test('failed photo persistence keeps the original crop open for another attempt', async () => {
  let discarded = false;
  const actual = handler('src/components/eleicoes/CandidateForm.tsx', 'handleCroppedFile', {
    cropTarget: 'fixture-only', isCamisa: false, handleSinglePhotoUpload: async () => false, handleMultiPhotoUpload: async () => false,
    setCropTarget() { discarded = true; }, setCropSrc() { discarded = true; },
  });
  assert.equal(await actual({ name: 'fixture.jpg' }), false);
  assert.equal(discarded, false);
});

test('crop dialog does not close or reset when photo persistence is rejected', async () => {
  let closed = false, reset = false, error = '';
  const actual = handler('src/components/eleicoes/ImageCropDialog.tsx', 'handleSave', {
    imageSrc: 'fixture-only', croppedArea: {}, rotation: 0, File,
    getCroppedBlob: async () => new Blob(['fictional image']), onCropped: async () => false,
    setSaving() {}, setSaveError(value) { error = value; }, onOpenChange() { closed = true; },
    setCrop() { reset = true; }, setZoom() { reset = true; }, setRotation() { reset = true; },
  });
  await actual();
  assert.equal(closed, false);
  assert.equal(reset, false);
  assert.match(error, /Tente novamente/);
});

test('the real voting handler preserves selection and ballot UUID through returned and thrown failures', async () => {
  for (const scenario of ['returned', 'network', 'throw']) {
    const calls = [];
    let success = false, selectionCleared = false, error = '';
    const ballotRequestRef = { current: null };
    const actual = handler('src/pages/VotePublic.tsx', 'handleVote', {
      electionId: 'fixture-only', currentRound: 1, confirmBlank: false, isMultiSeat: false, maxChoices: 1, autoBlankSlots: 0,
      confirmCandidate: { id: 'candidate-fixture' }, selectedCandidates: [], voteInFlightRef: { current: false }, ballotRequestRef,
      crypto: { randomUUID: () => 'uuid-fixture-only' }, ensureAudioContext: async () => null, playUrnaSound: async () => true, isIndividual: false,
      isUrnaMode: false, urnaToken: '', isSharedBehavior: false, resetTimeoutRef: { current: null }, window: { setTimeout: () => 1 },
      setVoting() {}, setVoteError(value) { error = value; }, setConfirmCandidate() { selectionCleared = true; }, setSelectedCandidates() { selectionCleared = true; },
      setConfirmBlank() {}, setConfirmSelection() {}, setShowNullWarning() {}, setVoteSuccess(value) { success = value; }, isBallotConfirmed,
      supabase: { functions: { invoke: async (_, { body }) => {
        calls.push(body);
        if (calls.length > 1) return { data: { success: true }, error: null };
        if (scenario === 'throw') throw new Error('Local interruption');
        return scenario === 'returned' ? { data: { success: false }, error: null } : { data: null, error: new Error('Local interruption') };
      } } },
    });
    await actual();
    assert.equal(success, false);
    assert.equal(selectionCleared, false);
    assert.equal(ballotRequestRef.current, 'uuid-fixture-only');
    assert.match(error, /Sua seleção foi mantida/);
    await actual();
    assert.equal(success, true);
    assert.equal(calls.length, 2);
    assert.equal(calls[0].ballot_id, calls[1].ballot_id);
    assert.deepEqual(calls[0].choices, calls[1].choices);
    assert.equal(ballotRequestRef.current, null);
  }
});

test('public identification stays on the entered identity when visit registration is rejected', async () => {
  let continued = false, welcomed = false, reported = false, submitting = false;
  const actual = handler('src/pages/PortalIgreja.tsx', 'handleSubmit', {
    fullName: 'Pessoa fictícia', societyChoice: 'visitante', getOrCreateDeviceId: () => 'fixture-only',
    setSubmitting(value) { submitting = value; }, onComplete() { continued = true; },
    toast: { error() { reported = true; }, success() { welcomed = true; } },
    supabase: { rpc: async () => ({ error: new Error('Registro fictício recusado') }) },
  });
  await actual({ preventDefault() {} });
  assert.equal(continued, false);
  assert.equal(welcomed, false);
  assert.equal(reported, true);
  assert.equal(submitting, false);
});
