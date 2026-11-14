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

test('shirt item form keeps color full width and size beside quantity without competing display utilities', () => {
  const form = source('src/components/financas/EncomendasTab.tsx');
  const css = source('src/camisas.css');
  const itemClasses = form.match(/className="(shirt-item-form[^"\n]*)"/)?.[1];
  assert.ok(itemClasses, 'order items use the shared semantic layout');
  assert.doesNotMatch(itemClasses, /(?:^|\s)(?:flex|inline-flex|block|inline-block|grid)(?:\s|$)/,
    'a display utility must not replace the item layout depending on CSS import order');
  const layout = css.match(/\.shirt-item-form\s*\{([^}]+)\}/)?.[1];
  assert.ok(layout, 'the semantic item layout is defined');
  assert.match(layout, /display:\s*grid/);
  assert.match(layout, /grid-template-columns:\s*minmax\([^)]+\)\s+minmax\([^)]+\)/);
  assert.match(css, /\.shirt-item-form > div\s*\{[^}]*min-width:\s*0/);
  assert.match(css, /\.shirt-item-form > div:first-child\s*\{[^}]*grid-column:\s*1\s*\/\s*-1/);
});
