import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('responsive layout mounts the page only once at every breakpoint', () => {
  const layout = read('src/components/layout/AppLayout.tsx');
  assert.equal((layout.match(/\{children\}/g) || []).length, 1);
  assert.equal((layout.match(/<main\b/g) || []).length, 1);
  assert.match(layout, /<MobileHeader/);
  assert.match(layout, /<TabletNavigationRail/);
  assert.match(layout, /<AppSidebar/);
});

test('finance subscriptions have unique lifetimes and clean up channels', () => {
  for (const name of ['CobrancasTab', 'ComprovantesTab']) {
    const source = read('src/components/financas/' + name + '.tsx');
    assert.match(source, /\.channel\(.*crypto\.randomUUID\(\)/);
    assert.match(source, /removeChannel\(channel\)/);
  }
});

test('financial gate and root errors cannot silently render a blank screen', () => {
  const source = read('src/App.tsx');
  assert.match(source, /role="status"/);
  assert.match(source, /<PageErrorBoundary>/);
  assert.doesNotMatch(source, /if \(loading \|\| !rolesLoaded\) return null/);
});

test('unreleased member endpoints do not disclose names or reset credentials', () => {
  for (const name of ['member-login', 'member-list']) {
    const source = read('supabase/functions/' + name + '/index.ts');
    assert.match(source, /MEMBER_PORTAL_CLOSED/);
    assert.doesNotMatch(source, /createClient|updateUserById|SERVICE_ROLE/);
  }
});
