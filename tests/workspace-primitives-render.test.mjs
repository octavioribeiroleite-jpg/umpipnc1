import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { build } = createRequire(require.resolve('vite'))('esbuild');
const root = path.resolve(import.meta.dirname, '..');
const bundled = await build({
  absWorkingDir: root,
  stdin: {
    contents: `import React from 'react'; import {renderToStaticMarkup} from 'react-dom/server';
      import {Card,CardHeader,CardTitle,CardContent,CardFooter} from './src/components/ui/card';
      import {AppCard} from './src/components/ui/app-card';
      export function card(){return renderToStaticMarkup(<Card data-ebd-card><CardHeader data-ebd-card-header><CardTitle>Turmas</CardTitle></CardHeader><CardContent data-ebd-content className="p-0"><table><tbody><tr><td>Conteúdo isolado</td></tr></tbody></table></CardContent><CardFooter>Rodapé</CardFooter></Card>);}
      export function appCard(){return renderToStaticMarkup(<AppCard noPadding aria-label="Painel isolado"><span>Ação</span></AppCard>);}`,
    resolveDir: root, sourcefile: 'workspace-primitives-test.tsx', loader: 'tsx',
  },
  bundle: true, write: false, platform: 'node', format: 'esm', jsx: 'automatic', mainFields: ['module', 'main'],
  alias: { '@': path.join(root, 'src') },
  plugins: [{ name: 'external-react', setup(builder) {
    builder.onResolve({ filter: /^react(?:-dom)?(?:\/|$)/ }, args => ({ path: pathToFileURL(require.resolve(args.path)).href, external: true }));
  } }],
});
const fixture = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`);

test('every card exposes common primitive roles while retaining EBD hooks and flush table padding', () => {
  const html = fixture.card();
  for (const role of ['ui-card', 'ui-card-header', 'ui-card-title', 'ui-card-content', 'ui-card-footer']) {
    assert.match(html, new RegExp(`class="[^\"]*\\b${role}\\b`));
  }
  for (const data of ['data-ebd-card', 'data-ebd-card-header', 'data-ebd-content']) assert.ok(html.includes(data));
  assert.match(html, /class="ui-card-content [^"]*\bp-0\b/);
  assert.ok(html.includes('<table>'));
});

test('AppCard shares the workspace card surface and preserves explicit noPadding', () => {
  const html = fixture.appCard();
  assert.match(html, /class="ui-app-card /);
  assert.ok(html.includes('aria-label="Painel isolado"'));
  assert.doesNotMatch(html, /class="[^"]*\bp-4\b/);
});
