import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('shared summary cards retain complete labels, values and descriptions', () => {
  const card = source('src/components/ui/summary-card.tsx');
  assert.doesNotMatch(card, /\btruncate\b|text-ellipsis|line-clamp/);
  assert.match(card, /summary-card-content/);
  assert.match(source('src/responsive-foundation.css'), /container-type: inline-size/);
});

test('financial amounts wrap instead of being replaced by ellipses', () => {
  const css = source('src/finance-responsive.css');
  const rule = css.match(/\.finance-summary-content \.text-xl,\s*\.finance-metric-value\s*\{([^}]+)\}/)?.[1];
  assert.ok(rule, 'shirt summary and financial metrics share the explicit wrapping rule');
  assert.match(rule, /white-space: normal/);
  assert.match(rule, /overflow-wrap: anywhere/);
  assert.doesNotMatch(rule, /ellipsis|nowrap|overflow: hidden/);
  assert.match(source('src/pages/Financas.tsx'), /valueClassName="finance-metric-value"/);
  const shirts = source('src/components/financas/CamisasTab.tsx');
  assert.match(shirts, /CardContent className="finance-summary-content"/);
  assert.match(shirts, /<p className="text-xl font-bold/);
  assert.match(shirts, /className="finance-summary-grid"/);
  assert.match(css, /\.finance-summary-grid\s*\{[^}]*minmax\(min\(100%, 13\.5rem\), 1fr\)/);
});

test('shirt item form can wrap fields and names keep their available width', () => {
  const form = source('src/components/financas/EncomendasTab.tsx');
  assert.match(form, /flex flex-wrap items-end/);
  assert.match(form, /basis-\[8rem\]/);
});
