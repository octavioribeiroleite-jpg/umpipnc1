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
  stdin: { contents: `import React from 'react'; import {renderToStaticMarkup} from 'react-dom/server'; import {Home,Users} from 'lucide-react'; import {SecretariaNavigation} from './src/components/secretaria/SecretariaNavigation'; import {NavigationSidebar,NavigationRail} from './src/components/layout/WorkspaceNavigation';
    export function render(admin, currentView, profileLabel) { let mounts=0; function Content(){mounts++;return React.createElement('form',{id:'single-ebd-view'},React.createElement('input',{defaultValue:'rascunho'}));} const html=renderToStaticMarkup(React.createElement(SecretariaNavigation,{admin,currentView,profileLabel,onView:()=>{},onExit:()=>{}},React.createElement(Content)));return {html,mounts}; }
    export function navigation(rail=false,collapsed=false,disabled=false) { const Component=rail?NavigationRail:NavigationSidebar; return renderToStaticMarkup(React.createElement(Component,{items:[{key:'home',label:'Início',icon:Home,active:false,onClick:()=>{}},{key:'members',label:'Membros',icon:Users,active:true,disabled,onClick:()=>{}}],onHome:()=>{},homeLabel:'Início do espaço',navigationLabel:'Navegação do espaço',onExit:()=>{},exitLabel:'Sair do espaço',profile:{name:'Perfil EBD',description:'Secretaria EBD'},collapsed})); }`, resolveDir: root, loader: 'tsx' },
  bundle: true, write: false, format: 'esm', platform: 'node', jsx: 'automatic', mainFields: ['module', 'main'],
  alias: { '@': path.join(root, 'src') }, loader: { '.png': 'dataurl', '.css': 'empty' },
  plugins: [{ name: 'react-runtime', setup(builder) {
    builder.onResolve({filter: /^react(?:-dom)?(?:\/|$)/}, args => ({path: pathToFileURL(require.resolve(args.path)).href, external: true}));
    // Service-worker lifecycle belongs to the browser; keep this test focused on
    // the navigation, real React hooks and the single protected content tree.
    builder.onResolve({filter: /\/UpdateAppButton$/}, () => ({path: 'update-button', namespace: 'navigation-test'}));
    builder.onLoad({filter: /.*/, namespace: 'navigation-test'}, () => ({contents: `import React from 'react'; export function UpdateAppButton({variant,className}) { return React.createElement('button',{type:'button',className,'aria-label':'Atualizar aplicativo','data-update-variant':variant},'Atualizar aplicativo'); }`, loader: 'js'}));
  }}],
});
const {render,navigation} = await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString('base64')}`);

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

test('EBD renders its own profile in the shared navigation with the official logo', () => {
  const {html}=render(true,'home','Maria & João');
  assert.match(html,/Maria &amp; João/);
  assert.match(html,/diretoria-sidebar__profile-email">Secretaria EBD/);
  assert.match(html,/ipnc-navigation-sidebar/);
  assert.match(html,/ipnc-navigation-rail/);
  assert.match(html,/alt="Marca IPNC"/);
  assert.match(html,/data-update-variant="full"/);
});

test('shared sidebar and rail expose the supplied destinations and selected page', () => {
  for (const rail of [false,true]) {
    const html=navigation(rail);
    assert.match(html,/aria-label="Navegação do espaço"/);
    assert.match(html,/aria-label="Início do espaço"/);
    assert.match(html,/aria-label="Membros" aria-current="page"/);
    assert.doesNotMatch(html,/aria-label="Início" aria-current/);
    assert.match(html,/aria-label="Sair do espaço"/);
  }
});

test('collapsed sidebar keeps accessible labels and hides profile details', () => {
  const html=navigation(false,true);
  assert.match(html,/data-collapsed="true"/);
  assert.match(html,/aria-label="Expandir menu"/);
  assert.match(html,/aria-label="Membros" aria-current="page" title="Membros"/);
  assert.doesNotMatch(html,/Perfil EBD|diretoria-sidebar__profile-email/);
  assert.match(html,/data-update-variant="icon"/);
});

test('shared navigation preserves disabled destinations while data is unavailable', () => {
  for (const rail of [false,true]) assert.match(navigation(rail,false,true),/disabled="" aria-label="Membros"/);
});
