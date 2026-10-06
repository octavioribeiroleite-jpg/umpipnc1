import { test } from 'node:test';
import assert from 'node:assert/strict';
import { composeSurfaceColor } from '../src/lib/app-shell-surface.ts';

test('chrome follows an opaque light or institutional header without imposing a green default', () => {
  assert.equal(composeSurfaceColor(['rgba(0, 0, 0, 0)', 'rgb(247, 251, 248)']), '#f7fbf8');
  assert.equal(composeSurfaceColor(['rgb(18, 59, 46)', 'rgb(255, 255, 255)']), '#123b2e');
  assert.equal(composeSurfaceColor([]), '#f7fbf8');
});

test('a portaled scrim darkens the same visible surface, then restores it when closed', () => {
  assert.equal(composeSurfaceColor(['rgba(0, 0, 0, 0.55)', 'rgb(247, 251, 248)']), '#6f7170');
  assert.equal(composeSurfaceColor(['rgb(247, 251, 248)']), '#f7fbf8');
});

test('transparent dark pages and overlays retain the dark base in PWA chrome', () => {
  assert.equal(composeSurfaceColor(['rgba(0, 0, 0, 0)'], [13, 18, 16]), '#0d1210');
  assert.equal(composeSurfaceColor(['rgba(0, 0, 0, 0.55)', 'rgb(13, 18, 16)'], [13, 18, 16]), '#060807');
});
