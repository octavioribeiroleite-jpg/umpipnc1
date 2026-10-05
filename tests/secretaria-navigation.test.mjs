import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { build } = createRequire(require.resolve('vite'))('esbuild');
const root = path.resolve(import.meta.dirname, '..');
const built = await build({
  absWorkingDir: root,
  stdin: { contents: `import React from 'react'; import {renderToStaticMarkup} from 'react-dom/server'; import {SecretariaNavigation} from './src/components/secretaria/SecretariaNavigation';
    export function render(admin, currentView) { let mounts=0; function Content(){mounts++;return React.createElement('form',{id:'single-ebd-view'},React.createElement('input',{defaultValue:'rascunho'}));} const html=renderToStaticMarkup(React.createElement(SecretariaNavigation,{admin,currentView,onView:()=>{},onExit:()=>{}},React.createElement(Content)));return {html,mounts}; }`, resolveDir: root, loader: 'tsx' },
  bundle: true, write: false, format: 'esm', platform: 'node', jsx: 'automatic', mainFields: ['module', 'main'],
  alias: { '@': path.join(root, 'src') }, loader: { '.png': 'dataurl', '.css': 'empty' },
  plugins: [{ name: 'react-runtime', setup(builder) {
    builder.onResolve({filter: /^react(?:-dom)?(?:\/|$)/}, args => ({path: pathToFileURL(require.resolve(args.path)).href, external: true}));
  }}],
});
const {render} = await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString('base64')}`);

test('professor navigation contains only permitted destinations and one content tree', () => {
  const {html,mounts}=render(false,'chamada');
  assert.equal(mounts,1);
  assert.equal((html.match(/id="single-ebd-view"/g)||[]).length,1);
  assert.match(html,/aria-label="Chamada" aria-current="page"/);
  for (const title of ['Histórico','Turmas','Aniversariantes','Alunos','Senhas das salas','Acessos']) assert.doesNotMatch(html,new RegExp(`aria-label="${title}"`));
  assert.match(html,/aria-label="Sair da Secretaria"/);
});

test('admin navigation keeps all existing sections and selects the requested view', () => {
  const {html,mounts}=render(true,'configuracoes');
  assert.equal(mounts,1);
  for (const title of ['Início','Chamada','Histórico','Turmas','Aniversariantes','Alunos','Senhas das salas','Acessos']) assert.match(html,new RegExp(`aria-label="${title}"`));
  assert.match(html,/aria-label="Senhas das salas" aria-current="page"/);
});
