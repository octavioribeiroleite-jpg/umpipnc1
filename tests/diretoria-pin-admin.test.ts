import test from 'node:test';
import assert from 'node:assert/strict';
import {
  copySavedDirectoryPin,
  DirectoryPinAdminError,
  directoryPinStatus,
  loadDirectoryPins,
  saveDirectoryPins,
  type DirectoryPinStore,
  type DirectoryPinUpdate,
} from '../src/lib/diretoria-pin-admin.ts';

// All credentials and transport in this suite are synthetic and stay in memory.
const society = { id: 'fixture-society', name: 'Sociedade fictícia', slug: 'teste', color: '#18774f' };
const admin = () => true;
const denied = () => false;
function fixtureStore(overrides: Partial<DirectoryPinStore> = {}) {
  const calls: Array<{ operation: string; payload?: unknown }> = [];
  const store: DirectoryPinStore = {
    loadSocieties: async () => { calls.push({ operation: 'societies' }); return { data: [society], error: null }; },
    loadPins: async keys => { calls.push({ operation: 'pins', payload: keys }); return { data: [{ key: 'diretoria_pin_teste', value: '012345' }], error: null }; },
    savePins: async rows => { calls.push({ operation: 'save', payload: rows }); return { data: rows, error: null }; },
    ...overrides,
  };
  return { store, calls };
}
const rejectsCode = (code: string) => (error: unknown) => error instanceof DirectoryPinAdminError && error.code === code;

test('non-admin access cannot read societies or settings, save PINs, or copy a PIN', async () => {
  const { store, calls } = fixtureStore();
  let copied = false;
  await assert.rejects(loadDirectoryPins({ store, isAdmin: denied }), rejectsCode('access'));
  await assert.rejects(saveDirectoryPins({ store, isAdmin: denied, drafts: { teste: '123456' }, savedPins: {}, slugs: ['teste'] }), rejectsCode('access'));
  await assert.rejects(copySavedDirectoryPin({ isAdmin: denied, draft: '012345', saved: '012345', clipboard: { writeText: async () => { copied = true; } } }), rejectsCode('access'));
  assert.deepEqual(calls, []);
  assert.equal(copied, false);
});

test('revoked admin access between reads stops before the settings query', async () => {
  let authorized = true;
  const { store, calls } = fixtureStore({ loadSocieties: async () => { authorized = false; return { data: [society], error: null }; } });
  await assert.rejects(loadDirectoryPins({ store, isAdmin: () => authorized }), rejectsCode('access'));
  assert.deepEqual(calls, []);
});

test('loading requests only individual active society and Pastor keys, excluding the historical general PIN', async () => {
  let keys: string[] = [];
  const { store } = fixtureStore({
    loadSocieties: async () => ({ data: [society, society, { ...society, slug: 'geral' }, { ...society, slug: 'pastor' }], error: null }),
    loadPins: async requested => {
      keys = requested;
      return { data: [
        { key: 'diretoria_pin_teste', value: '012345' },
        { key: 'diretoria_pin_pastor', value: '654321' },
        { key: 'diretoria_pin_geral', value: '111111' },
        { key: 'diretoria_pin_inativa', value: '222222' },
      ], error: null };
    },
  });
  const result = await loadDirectoryPins({ store, isAdmin: admin });
  assert.deepEqual(keys, ['diretoria_pin_pastor', 'diretoria_pin_teste']);
  assert.deepEqual(result.societies, [society]);
  assert.deepEqual(result.savedPins, { pastor: '654321', teste: '012345' });
});

test('failed reads cannot be treated as an empty list of PINs', async () => {
  const { store } = fixtureStore({ loadPins: async () => ({ data: null, error: { message: 'fixture read failure' } }) });
  await assert.rejects(loadDirectoryPins({ store, isAdmin: admin }), rejectsCode('load'));
});

test('PIN status distinguishes saved, changed, unset and invalid values without dropping leading zeroes', () => {
  assert.equal(directoryPinStatus('012345', '012345'), 'saved');
  assert.equal(directoryPinStatus('123456', '012345'), 'unsaved');
  assert.equal(directoryPinStatus('', ''), 'unset');
  for (const value of ['', '12345', '1234567', '12345x']) assert.equal(directoryPinStatus(value, '012345'), 'invalid');
});

test('one save submits all changed valid PINs atomically and omits unchanged and unset fields', async () => {
  const { store, calls } = fixtureStore();
  const result = await saveDirectoryPins({
    store, isAdmin: admin, slugs: ['pastor', 'teste', 'nova', 'vazia'],
    drafts: { pastor: '111111', teste: '654321', nova: '000123', vazia: '' },
    savedPins: { pastor: '111111', teste: '012345' },
  });
  assert.equal(calls.length, 1);
  const rows = calls[0].payload as DirectoryPinUpdate[];
  assert.deepEqual(rows.map(({ key, value }) => ({ key, value })), [
    { key: 'diretoria_pin_teste', value: '654321' },
    { key: 'diretoria_pin_nova', value: '000123' },
  ]);
  assert.equal(rows[0].updated_at, rows[1].updated_at);
  assert.deepEqual(result, { savedPins: { pastor: '111111', teste: '654321', nova: '000123' }, changed: true });
});

test('invalid or unknown drafts and clearing a saved PIN fail before any partial save', async () => {
  const { store, calls } = fixtureStore();
  for (const drafts of [{ teste: '654321', pastor: '12345' }, { teste: '' }, { geral: '123456' }, { desconhecido: '123456' }]) {
    await assert.rejects(saveDirectoryPins({ store, isAdmin: admin, slugs: ['teste', 'pastor', 'geral'], drafts, savedPins: { teste: '012345' } }), rejectsCode('invalid'));
  }
  assert.deepEqual(calls, []);
});

test('unchanged PINs and blank unset PINs do not create default values or make a backend write', async () => {
  const { store, calls } = fixtureStore();
  const result = await saveDirectoryPins({ store, isAdmin: admin, slugs: ['teste', 'pastor'], drafts: { teste: '012345', pastor: '' }, savedPins: { teste: '012345' } });
  assert.equal(result.changed, false);
  assert.deepEqual(calls, []);
  assert.equal(result.savedPins.pastor, undefined);
});

test('backend rejection and missing confirmation never return a saved snapshot', async () => {
  for (const response of [
    { data: null, error: { message: 'fixture write failure' } },
    { data: [], error: null },
    { data: [{ key: 'diretoria_pin_teste', value: '012345' }], error: null },
  ]) {
    const { store } = fixtureStore({ savePins: async () => response });
    const savedPins = { teste: '012345' };
    await assert.rejects(saveDirectoryPins({ store, isAdmin: admin, drafts: { teste: '654321' }, savedPins, slugs: ['teste'] }), rejectsCode(response.error ? 'save' : 'confirmation'));
    assert.deepEqual(savedPins, { teste: '012345' });
  }
});

test('copy sends exactly the saved PIN and refuses both an unsaved replacement and an invalid saved PIN', async () => {
  const values: string[] = [];
  const clipboard = { writeText: async (value: string) => { values.push(value); } };
  await copySavedDirectoryPin({ isAdmin: admin, draft: '012345', saved: '012345', clipboard });
  for (const [draft, saved] of [['654321', '012345'], ['12345', '12345'], ['', '']]) {
    await assert.rejects(copySavedDirectoryPin({ isAdmin: admin, draft, saved, clipboard }), rejectsCode('copy-unsaved'));
  }
  assert.deepEqual(values, ['012345']);
});

test('clipboard rejection or unavailability is reported without claiming success', async () => {
  const pin = { isAdmin: admin, draft: '012345', saved: '012345' };
  await assert.rejects(copySavedDirectoryPin(pin), rejectsCode('clipboard'));
  await assert.rejects(copySavedDirectoryPin({ ...pin, clipboard: { writeText: async () => { throw new Error('fixture clipboard denied'); } } }), rejectsCode('clipboard'));
});
