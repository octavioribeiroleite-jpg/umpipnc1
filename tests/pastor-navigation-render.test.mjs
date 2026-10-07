import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { build } = createRequire(require.resolve('vite'))('esbuild');
const root = path.resolve(import.meta.dirname, '..');
const mockedModules = {
  '@/contexts/AuthContext': `export const useAuth=()=>({user:{id:'pastor-fixture'},profile:{full_name:'Pastor da fixture'},signOut:async()=>{}});`,
  'react-router-dom': `export const useNavigate=()=>()=>{}; export const useLocation=()=>({pathname:globalThis.__pastorNavigationPath});`,
  '@tanstack/react-query': `export const useQuery=()=>globalThis.__pastorNavigationRead;`,
  '@/integrations/supabase/client': `export const supabase={};`,
  '@/components/UpdateAppButton': `import React from 'react'; export function UpdateAppButton({variant}){return React.createElement('button',{'data-update-variant':variant},'Atualizar aplicativo');}`,
};
const built = await build({
  absWorkingDir: root,
  stdin: {
    contents: `import React from 'react';import{renderToStaticMarkup}from'react-dom/server';import{PastorSidebar}from'./src/components/pastor/PastorSidebar';export function render(read,pathname='/pastor'){globalThis.__pastorNavigationRead={refetch:()=>{},isFetching:false,isError:false,...read};globalThis.__pastorNavigationPath=pathname;return renderToStaticMarkup(React.createElement(PastorSidebar));}`,
    resolveDir: root, loader: 'tsx',
  },
  bundle: true, write: false, format: 'esm', platform: 'node', jsx: 'automatic', mainFields: ['module', 'main'],
  alias: { '@': path.join(root, 'src') }, loader: { '.png': 'dataurl', '.css': 'empty' },
  plugins: [{ name: 'pastoral-read-boundary', setup(builder) {
    builder.onResolve({filter: /.*/}, args => mockedModules[args.path] ? {path: args.path, namespace: 'pastor-test'} : undefined);
    builder.onLoad({filter: /.*/, namespace: 'pastor-test'}, args => ({contents: mockedModules[args.path], loader: 'js'}));
    builder.onResolve({filter: /^react(?:-dom)?(?:\/|$)/}, args => ({path: pathToFileURL(require.resolve(args.path)).href, external: true}));
  }}],
});
const {render} = await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString('base64')}`);
const societies = [{id:'society-fixture',name:'Sociedade da fixture',slug:'fixture',color:'#00aa77'}];

test('pastoral navigation uses the shared sidebar and rail with all destinations and societies', () => {
  const html=render({data:societies},'/pastor/sociedade/fixture');
  for (const label of ['Visão Geral','Calendário','Comunicados','Sugestões','Eleições','Dízimos','Visitantes']) assert.match(html,new RegExp(`aria-label="${label}"`));
  assert.match(html,/aria-label="Sociedade da fixture" aria-current="page"/);
  assert.match(html,/ipnc-navigation-sidebar/);
  assert.match(html,/ipnc-navigation-rail/);
  assert.match(html,/Pastor da fixture/);
  assert.match(html,/alt="Marca IPNC"/);
  assert.match(html,/data-update-variant="full"/);
});

test('unconfirmed societies show progress instead of an empty, confirmed list', () => {
  const html=render({data:undefined});
  assert.match(html,/role="status" aria-label="Consultando sociedades"/);
  assert.doesNotMatch(html,/Não foi possível consultar as sociedades/);
});

test('failed societies retain previous data with visible retry in the sidebar and rail', () => {
  const html=render({data:societies,isError:true});
  assert.match(html,/Não foi possível consultar as sociedades/);
  assert.match(html,/podem estar desatualizados/);
  assert.match(html,/Tentar novamente/);
  assert.match(html,/aria-label="Não foi possível consultar sociedades. Tentar novamente"/);
  assert.match(html,/aria-label="Sociedade da fixture"/);
});

test('pastoral root is active only at its own root, without selecting it on subpages', () => {
  assert.match(render({data:[]}),/aria-label="Visão Geral" aria-current="page"/);
  const subpage=render({data:[]},'/pastor/calendario');
  assert.match(subpage,/aria-label="Calendário" aria-current="page"/);
  assert.doesNotMatch(subpage,/aria-label="Visão Geral" aria-current/);
});
