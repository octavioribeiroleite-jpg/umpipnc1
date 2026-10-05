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
    contents: `import React, {useState} from 'react'; import {renderToStaticMarkup} from 'react-dom/server'; import {PastorLayout} from './src/components/pastor/PastorLayout'; import {PastorCalendarWidget} from './src/components/pastor/PastorCalendarWidget'; import {UserCheck,ChevronLeft,ChevronRight} from 'lucide-react';
      ${photoComponent}
      export function renderPhotos(photos) { return renderToStaticMarkup(React.createElement(CandidatePhotos, {photos, name: 'Somente teste'})); }
      export function renderCalendar(hasSnapshot, readError = false, events = []) { return renderToStaticMarkup(React.createElement(PastorCalendarWidget, {hasSnapshot, readError, events, currentMonth: 0, currentYear: 2026, selectedDate: new Date(2026, 0, 5), onDaySelect() {}, onPrevMonth() {}, onNextMonth() {}, onToday() {}})); }
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
const { render, renderPhotos, renderCalendar } = await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString('base64')}`);

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

test('eight candidate photos retain all 48px targets in a wrapping, width-bounded group', () => {
  const html = renderPhotos(Array.from({length: 8}, (_, index) => `test-only-${index}.png`));
  assert.equal((html.match(/aria-label="Ver foto \d+ de Somente teste"/g) || []).length, 8);
  assert.match(html, /class="flex max-w-full flex-wrap justify-center gap-1"/);
  assert.equal((html.match(/class="h-\[48px\] w-\[48px\] rounded-full/g) || []).length, 8);
  assert.match(html, /aria-label="Foto anterior de Somente teste"/);
  assert.match(html, /aria-label="Próxima foto de Somente teste"/);
});

test('an unconfirmed agenda retains month navigation without presenting empty days', () => {
  for (const failed of [false, true]) {
    const html = renderCalendar(false, failed);
    assert.match(html, /Janeiro 2026/);
    assert.match(html, /aria-label="Mês anterior"/);
    assert.match(html, /aria-label="Próximo mês"/);
    assert.match(html, failed ? /Agenda indisponível/ : /Consultando agenda/);
    assert.doesNotMatch(html, /aria-label="\d+ de Janeiro de 2026/);
  }
});

test('only a confirmed agenda renders day targets and actual event counts', () => {
  const empty = renderCalendar(true);
  assert.equal((empty.match(/aria-label="\d+ de Janeiro de 2026/g) || []).length, 31);
  assert.doesNotMatch(empty, /Consultando agenda|Agenda indisponível/);
  const populated = renderCalendar(true, false, [{id: 'fixture-event', start_date: '2026-01-05T12:00:00', color: '#10b981'}]);
  assert.match(populated, /aria-label="5 de Janeiro de 2026, 1 programações"/);
});
