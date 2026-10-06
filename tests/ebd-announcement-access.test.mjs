import test from 'node:test';
import assert from 'node:assert/strict';
import { announcementFixture } from './fixtures/ebd-announcement-backend.mjs';

test('deactivating a class revokes its previously issued birthday capability even when the password stays active', async () => {
  const f = announcementFixture();
  const token = await f.issue();
  f.state.classActive = false;
  assert.equal(f.state.passwordActive, true);
  const response = await f.request(token);
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: 'Confirme seu PIN para gerar a mensagem.', code: 'ebd_ai_session_expired_or_invalid' });
  assert.equal(f.calls.includes('limit'), false);
  assert.equal(f.calls.includes('ai'), false);
});

test('active class capability keeps the existing announcement contract and one database read', async () => {
  const f = announcementFixture();
  const response = await f.request(await f.issue());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true, message: 'Synthetic announcement' });
  assert.equal(f.calls.filter(call => call?.table === 'ebd_class_passwords').length, 1);
  assert.deepEqual(f.calls.slice(-2), ['limit', 'ai']);
});

test('absent classes, inactive or rotated credentials and database failures deny before AI', async () => {
  for (const scenario of ['missing', 'password-disabled', 'rotated', 'database-error']) {
    const f = announcementFixture({ databaseError: scenario === 'database-error' });
    const token = await f.issue();
    if (scenario === 'missing') f.state.classExists = false;
    if (scenario === 'password-disabled') f.state.passwordActive = false;
    if (scenario === 'rotated') f.state.credential = 'rotated-synthetic-hash';
    assert.equal((await f.request(token)).status, 401, scenario);
    assert.equal(f.calls.includes('limit'), false, scenario);
    assert.equal(f.calls.includes('ai'), false, scenario);
  }
});

test('administrator capability remains independent of class activation', async () => {
  const f = announcementFixture({ state: { classActive: false } });
  assert.equal((await f.request(await f.issue('admin'))).status, 200);
  assert.equal(f.calls.filter(call => call?.table === 'settings').length, 1);
  assert.equal(f.calls.some(call => call?.table === 'ebd_class_passwords'), false);
  assert.equal(f.calls.includes('ai'), true);
});
