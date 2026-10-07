import test from 'node:test';
import assert from 'node:assert/strict';
import { retainWorkspaceTheme } from '../src/lib/workspace-theme.ts';

function host(initial: string[] = []) {
  const classes = new Set(initial);
  return {
    classes,
    classList: {
      contains: (value: string) => classes.has(value),
      add: (value: string) => { classes.add(value); },
      remove: (value: string) => { classes.delete(value); },
    },
  };
}

test('nested workspace portals retain their theme when a parent shell unmounts', () => {
  const body = host(['ebd-theme']);
  const leaveParent = retainWorkspaceTheme(body);
  const leaveChild = retainWorkspaceTheme(body);
  assert.equal(body.classes.has('ipnc-workspace-theme'), true);
  leaveParent();
  assert.equal(body.classes.has('ipnc-workspace-theme'), true);
  leaveChild();
  assert.deepEqual([...body.classes], ['ebd-theme']);
});

test('cleanup is idempotent across effect teardown and remount', () => {
  const body = host();
  const first = retainWorkspaceTheme(body);
  first();
  const second = retainWorkspaceTheme(body);
  first();
  assert.equal(body.classes.has('ipnc-workspace-theme'), true);
  second();
  assert.equal(body.classes.has('ipnc-workspace-theme'), false);
});

test('workspace cleanup preserves a class that another owner supplied', () => {
  const body = host(['ipnc-workspace-theme', 'diretoria-theme']);
  const leave = retainWorkspaceTheme(body);
  leave();
  assert.deepEqual([...body.classes], ['ipnc-workspace-theme', 'diretoria-theme']);
});

test('theme ownership is independent for separate documents', () => {
  const main = host();
  const preview = host();
  const leaveMain = retainWorkspaceTheme(main);
  const leavePreview = retainWorkspaceTheme(preview);
  leaveMain();
  assert.equal(main.classes.has('ipnc-workspace-theme'), false);
  assert.equal(preview.classes.has('ipnc-workspace-theme'), true);
  leavePreview();
});
