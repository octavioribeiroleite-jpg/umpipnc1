import test from 'node:test';
import assert from 'node:assert/strict';
import { isBallotConfirmed } from '../src/components/eleicoes/ballot-response.ts';

test('only an explicit endpoint acknowledgement confirms a ballot', () => {
  assert.equal(isBallotConfirmed({ data: { success: true }, error: null }), true);
  for (const data of [null, undefined, {}, { success: false }, { success: 'true' }, { error: 'Cédula recusada' }]) {
    assert.equal(isBallotConfirmed({ data, error: null }), false);
  }
});

test('a transport error cannot display success even with a success-shaped payload', () => {
  assert.equal(isBallotConfirmed({ data: { success: true }, error: new Error('Conexão interrompida') }), false);
});
