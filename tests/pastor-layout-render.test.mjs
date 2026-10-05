import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const { build } = createRequire(require.resolve('vite'))('esbuild');
const root = path.resolve(import.meta.dirname, '..');
// Isolate the real, private photo component without instantiating election/API code.
const voteSource = ts.createSourceFile('VotePublic.tsx', readFileSync(path.join(root, 'src/pages/VotePublic.tsx'), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const photoComponent = voteSource.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'CandidatePhotos').getText(voteSource);
const mockedModules = {
  '@/contexts/AuthContext': `export const useAuth = () => globalThis.__pastorLayoutTestAuth;`,
  'react-router-dom': `import React from 'react'; export const useNavigate = () => () => {}; export const Navigate = props => React.createElement('span', {'data-redirect': props.to});`,
  './PastorSidebar': `export const PastorSidebar = () => null;`,
  './PastorMobileHeader': `export const PastorMobileHeader = () => null;`,
  './PastorMobileNav': `export const PastorMobileNav = () => null;`,
  '@/components/OfflineBanner': `export const OfflineBanner = () => null;`,
};
const built = await build({
  absWorkingDir: root,
  stdin: {
    contents: `import React, {useState} from 'react'; import {renderToStaticMarkup} from 'react-dom/server'; import {PastorLayout} from './src/components/pastor/PastorLayout'; import {UserCheck,ChevronLeft,ChevronRight} from 'lucide-react';
      ${photoComponent}
      export function renderPhotos(photos) { return renderToStaticMarkup(React.createElement(CandidatePhotos, {photos, name: 'Somente teste'})); }
      export function render(auth) { globalThis.__pastorLayoutTestAuth = auth; let mounts = 0; function Page() { mounts++; return React.createElement('form', {id: 'unique-page-form'}, React.createElement('input', {id: 'unique-page-field', defaultValue: 'rascunho'})); } const html = renderToStaticMarkup(React.createElement(PastorLayout, null, React.createElement(Page))); return {html, mounts}; }`,
    resolveDir: root, loader: 'tsx', sourcefile: 'pastor-layout-test.tsx',
  },
  bundle: true, write: false, format: 'esm', platform: 'node', jsx: 'automatic', mainFields: ['module', 'main'],
  alias: { '@': path.join(root, 'src') }, loader: { '.png': 'dataurl' },
  plugins: [{ name: 'auth-navigation-test-boundary', setup(builder) {
    builder.onResolve({filter: /.*/}, args => mockedModules[args.path] ? {path: args.path, namespace: 'test-boundary'} : undefined);
    builder.onLoad({filter: /.*/, namespace: 'test-boundary'}, args => ({contents: mockedModules[args.path], loader: 'js'}));
    builder.onResolve({filter: /^react(?:-dom)?(?:\/|$)/}, args => ({path: pathToFileURL(require.resolve(args.path)).href, external: true}));
  }}],
});
const { render, renderPhotos } = await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString('base64')}`);

for (const role of ['isPastor', 'isAdmin']) {
  test(`${role}: responsive shell mounts the page once, with one form and field`, () => {
    const {html, mounts} = render({user: {id: 'layout-test-only'}, loading: false, isAdmin: false, isPastor: false, [role]: true});
    assert.equal(mounts, 1, 'A duplicated desktop/mobile tree executes the child twice');
    assert.equal((html.match(/id="unique-page-form"/g) || []).length, 1);
    assert.equal((html.match(/id="unique-page-field"/g) || []).length, 1);
    assert.match(html, /id="pastor-content"/);
    assert.match(html, /href="#pastor-content"/);
    assert.doesNotMatch(html, /overflow-x-hidden/);
  });
}

test('guarded roles, guests and auth loading do not render pastoral page content', () => {
  const unauthorized = render({user: {id: 'test'}, loading: false, isAdmin: false, isPastor: false});
  assert.equal(unauthorized.mounts, 0);
  assert.match(unauthorized.html, /data-redirect="\/"/);
  assert.equal(render({user: null, loading: false}).mounts, 0);
  const pending = render({user: null, loading: true});
  assert.equal(pending.mounts, 0);
  assert.match(pending.html, /Carregando/);
});

test('eight candidate photos retain all 44px targets in a wrapping, width-bounded group', () => {
  const html = renderPhotos(Array.from({length: 8}, (_, index) => `test-only-${index}.png`));
  assert.equal((html.match(/aria-label="Ver foto \d+"/g) || []).length, 8);
  assert.match(html, /class="flex max-w-full flex-wrap justify-center gap-1"/);
  assert.equal((html.match(/class="h-11 w-11 rounded-full/g) || []).length, 8);
  assert.match(html, /aria-label="Foto anterior"/);
  assert.match(html, /aria-label="Próxima foto"/);
});
