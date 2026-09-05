import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEbdBirthdayTokens } from '../supabase/functions/_shared/ebd-birthday-token.ts';
const config = { secret: 'FAKE-LOCAL-TEST-SECRET-THIRTY-TWO-PLUS', issuer: 'https://fake-project.supabase.co' };
const principal = { kind: 'class', id: '11111111-1111-4111-8111-111111111111' };
const credential = 'FAKE-CURRENT-DATABASE-CREDENTIAL';
const current = async () => credential;

test('admin and class capability round trips with fixed narrow scope', async () => {
  const tokens = createEbdBirthdayTokens(config);
  for (const p of [principal, { kind: 'admin', id: 'secretaria' }]) {
    const issued = await tokens.issue(p, credential);
    const claims = await tokens.verify(issued.token, current);
    assert.deepEqual(claims.principal, p); assert.equal(claims.scope, 'birthday:generate');
    assert.equal(claims.exp - claims.iat, 900); assert.equal(new Date(issued.expiresAt).getTime(), claims.exp * 1000);
    assert.ok(!issued.token.includes(credential));
  }
});
test('tampering or wrong server key/project fails before DB access', async () => {
  const tokens = createEbdBirthdayTokens(config); const { token } = await tokens.issue(principal, credential);
  let reads = 0; const counted = async () => { reads++; return credential; };
  const [prefix, payload, signature] = token.split('.');
  const altered = JSON.parse(Buffer.from(payload, 'base64url').toString()); altered.principal = { kind: 'admin', id: 'secretaria' };
  assert.equal(await tokens.verify(`${prefix}.${Buffer.from(JSON.stringify(altered)).toString('base64url')}.${signature}`, counted), null);
  assert.equal(await createEbdBirthdayTokens({ ...config, secret: config.secret + 'other' }).verify(token, counted), null);
  assert.equal(await createEbdBirthdayTokens({ ...config, issuer: 'https://other-project.supabase.co' }).verify(token, counted), null);
  assert.equal(reads, 0);
});
test('expiry, future issued time, malformed tokens and anon keys fail closed', async () => {
  let time = 1000000000;
  const tokens = createEbdBirthdayTokens({ ...config, now: () => time }); const { token } = await tokens.issue(principal, credential);
  time += 900000; assert.equal(await tokens.verify(token, current), null);
  time -= 1000000; assert.equal(await tokens.verify(token, current), null);
  for (const bad of [undefined, '', 'not-a-jwt', 'ebdai1.a.b', 'x'.repeat(2049)]) assert.equal(await tokens.verify(bad, current), null);
});
test('PIN rotation, disable and DB failure revoke existing capability', async () => {
  const tokens = createEbdBirthdayTokens(config); const { token } = await tokens.issue(principal, credential);
  assert.equal(await tokens.verify(token, async () => credential + 'rotated'), null);
  assert.equal(await tokens.verify(token, async () => null), null);
  assert.equal(await tokens.verify(token, async () => { throw Error('DB unavailable'); }), null);
});
test('credential stamp is project/key bound and does not expose bare PIN hash', async () => {
  const tokens = createEbdBirthdayTokens(config); const { token } = await tokens.issue(principal, '123456');
  const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
  assert.ok(!JSON.stringify(claims).includes('123456'));
  assert.deepEqual(await tokens.verify(token, async () => '123456'), claims);
});
