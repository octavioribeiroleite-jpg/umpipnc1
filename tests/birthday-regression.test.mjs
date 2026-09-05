import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('birthday writes verify the EBD admin session and affected row', () => {
  const hook = read('src/hooks/useBirthdays.ts');

  assert.match(hook, /rpc\('ebd_is_admin'/);
  assert.match(hook, /scope\.startsWith\('ebd-admin'\)/);
  assert.match(hook, /update\(data\).*select\('id'\)\.maybeSingle\(\)/s);
  assert.match(hook, /delete\(\).*select\('id'\)\.maybeSingle\(\)/s);
  assert.match(hook, /if \(!updated\) throw new Error/);
  assert.match(hook, /if \(!deleted\) throw new Error/);
});

test('Secretaria reopens PIN confirmation on an expired birthday session', () => {
  const page = read('src/pages/Secretaria.tsx');

  assert.match(page, /isBirthdaySessionExpiredError\(error\)/);
  assert.match(page, /onSessionExpired=\{\(\) => setAiReauthOpen\(true\)\}/);
  assert.match(page, /event\.preventDefault\(\); handleDelete\(\);/);
});
