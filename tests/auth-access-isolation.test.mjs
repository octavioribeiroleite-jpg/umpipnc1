import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { usesIndependentAccess } from '../src/lib/auth-access-scope.ts';

const require = createRequire(import.meta.url);
const { build } = createRequire(require.resolve('vite'))('esbuild');
const root = path.resolve(import.meta.dirname, '..');
const built = await build({
  absWorkingDir: root,
  stdin: { contents: `import React from 'react'; import {renderToStaticMarkup} from 'react-dom/server'; import {StaticRouter} from 'react-router-dom/server'; import {MainAccountAccessBoundary} from './src/components/MainAccountAccessBoundary';
    export function render(path, failed) { let mounts=0; function Content(){mounts++;return <form id="own-access-guard"><input aria-label="PIN do acesso independente" /></form>;} return {html:renderToStaticMarkup(<StaticRouter location={path}><MainAccountAccessBoundary failed={failed} onSignOut={async()=>{}}><Content/></MainAccountAccessBoundary></StaticRouter>),mounts}; }`, resolveDir: root, loader: 'tsx' },
  bundle: true, write: false, format: 'esm', platform: 'node', jsx: 'automatic', mainFields: ['module', 'main'],
  alias: { '@': path.join(root, 'src') },
  plugins: [{ name: 'react-runtime', setup(builder) {
    builder.onResolve({filter: /^(?:react|react-dom|react-router|react-router-dom)(?:\/|$)/}, args => ({path: pathToFileURL(require.resolve(args.path)).href, external: true}));
  }}],
});
let render;
try { ({render} = await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString('base64')}`)); }
catch (error) { throw new Error(`Unable to load isolated access test: ${error.message}`); }

test('a failed principal account cannot replace EBD, treasury or public entry guards', () => {
  for (const route of ['/secretaria', '/tesouraria?sociedade=ump', '/auth', '/reset-password', '/igreja', '/vote/fixture', '/eleicao/fixture/apresentar']) {
    const {html,mounts}=render(route,true);
    assert.equal(mounts,1,route);
    assert.match(html,/id="own-access-guard"/,route);
    assert.doesNotMatch(html,/Não foi possível confirmar/,route);
  }
});

test('main account failures still block protected surfaces and do not mount their data readers', () => {
  for (const route of ['/', '/reunioes', '/financas', '/camisas', '/usuarios', '/configuracoes', '/aniversariantes', '/pastor', '/pastor/sociedade/ump', '/visitantes', '/eleicoes', '/eleicoes/fixture']) {
    const {html,mounts}=render(route,true);
    assert.equal(mounts,0,route);
    assert.match(html,/Não foi possível confirmar seu acesso à Diretoria/,route);
    assert.doesNotMatch(html,/own-access-guard/,route);
  }
});

test('successful principal validation mounts one content tree; independent route matching is bounded', () => {
  assert.equal(render('/configuracoes',false).mounts,1);
  assert.equal(usesIndependentAccess('/SECRETARIA/'),true);
  for (const route of ['/secretaria/administracao', '/tesouraria-privada', '/vote/fixture/admin', '/eleicao/fixture/apresentar/extra', '/unknown']) {
    assert.equal(usesIndependentAccess(route),false,route);
  }
});
