import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient } from '@tanstack/react-query';
import { beginRender, cleanupHarness } from './fixtures/auth-session-expiry/provider-hooks.mjs';
import { createFixture, actorId } from './fixtures/auth-session-expiry/transport.mjs';

const require = createRequire(import.meta.url);
const { build } = createRequire(require.resolve('vite'))('esbuild');
const root = path.resolve(import.meta.dirname, '..');
const hooksUrl = pathToFileURL(path.join(root, 'tests/fixtures/auth-session-expiry/provider-hooks.mjs')).href;
const reactUrl = pathToFileURL(require.resolve('react')).href;
const built = await build({
  absWorkingDir: root,
  stdin: { contents: "export {AuthProvider} from './src/contexts/AuthContext'; export {MainAccountAccessBoundary} from './src/components/MainAccountAccessBoundary';", resolveDir: root, loader: 'tsx' },
  bundle: true, write: false, platform: 'node', format: 'esm', jsx: 'automatic', mainFields: ['module', 'main'],
  alias: { '@': path.join(root, 'src') }, loader: { '.png': 'dataurl', '.webp': 'dataurl', '.svg': 'dataurl' },
  plugins: [{ name: 'isolated-auth-session', setup(builder) {
    builder.onResolve({filter: /^file:/}, args => ({path: args.path, external: true}));
    builder.onResolve({filter: /^react$/}, args => args.importer.endsWith('/src/contexts/AuthContext.tsx') ? {path: 'provider-react', namespace: 'auth-fixture'} : {path: reactUrl, external: true});
    builder.onResolve({filter: /^react(?:-dom)?(?:\/|$)/}, args => ({path: pathToFileURL(require.resolve(args.path)).href, external: true}));
    builder.onResolve({filter: /\/integrations\/supabase\/client$/}, () => ({path: 'client', namespace: 'auth-fixture'}));
    builder.onResolve({filter: /^@tanstack\/react-query$/}, args => args.importer.endsWith('/src/contexts/AuthContext.tsx') ? {path: 'queries', namespace: 'auth-fixture'} : {path: pathToFileURL(require.resolve(args.path)).href, external: true});
    builder.onResolve({filter: /^react-router-dom$/}, () => ({path: 'router', namespace: 'auth-fixture'}));
    builder.onLoad({filter: /.*/, namespace: 'auth-fixture'}, args => {
      if (args.path === 'provider-react') return {contents: `export {createContext,useContext} from ${JSON.stringify(reactUrl)}; export {useState,useRef,useEffect,useMemo,useCallback} from ${JSON.stringify(hooksUrl)};`, loader: 'js'};
      if (args.path === 'client') return {contents: `import {currentHarness} from ${JSON.stringify(hooksUrl)}; export const supabase=new Proxy({}, {get:(_target,key)=>currentHarness.fixture.client[key]});`, loader: 'js'};
      if (args.path === 'queries') return {contents: `import {currentHarness} from ${JSON.stringify(hooksUrl)}; export const useQueryClient=()=>currentHarness.queryClient;`, loader: 'js'};
      if (args.path === 'router') return {contents: `import {currentHarness} from ${JSON.stringify(hooksUrl)}; export const useLocation=()=>({pathname:currentHarness.pathname}); export const useNavigate=()=>()=>{}; export function Navigate(props){currentHarness.redirect=props;return null;}`, loader: 'js'};
    });
    builder.onResolve({filter: /\.css$/}, args => ({path: args.path, namespace: 'fixture-css'}));
    builder.onLoad({filter: /.*/, namespace: 'fixture-css'}, () => ({contents: '', loader: 'js'}));
  } }],
});
const {AuthProvider, MainAccountAccessBoundary} = await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString('base64')}`).catch(error => {throw new Error(error.message);});

// The fixture contains previously loaded private content. A guard must prevent
// mounting that reader after identity loss; storage/cache alone cannot do it.
function privateTree(harness) {
  function PrivateContent() { harness.mounts++; return React.createElement('form', {id: 'private-meeting-fixture'}, React.createElement('h3', null, 'ATA PRIVADA FICTICIA A'), React.createElement('input', {defaultValue: 'rascunho fictício não enviado'})); }
  return React.createElement(PrivateContent);
}
function harness({pathname = '/reunioes', session = true} = {}) {
  const result = {pathname, fixture: createFixture({session}), slots: [], effects: [], cursor: 0, dirty: false, queryClient: new QueryClient(), mounts: 0, redirect: null};
  result.child = privateTree(result);
  result.renderProvider = () => { beginRender(result); result.dirty = false; result.tree = AuthProvider({children: result.child}); result.state = result.tree.props.value; return result.tree; };
  result.renderHtml = () => { result.mounts = 0; result.redirect = null; beginRender(result); return renderToStaticMarkup(result.tree); };
  return result;
}
async function settle(h) {
  for (let i=0;i<24;i++) { if (!h.tree || h.dirty) h.renderProvider(); while (h.effects.length) h.effects.shift()(); await new Promise(resolve => setTimeout(resolve, 0)); }
  if (h.dirty) h.renderProvider();
}
async function withHarness(options, run) {
  const priorStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const h = harness(options); Object.defineProperty(globalThis, 'localStorage', {value: h.fixture.storage, configurable: true});
  try { await run(h); } finally { cleanupHarness(h); h.queryClient.clear(); h.fixture.client.auth.stopAutoRefresh(); if (priorStorage) Object.defineProperty(globalThis, 'localStorage', priorStorage); else delete globalThis.localStorage; }
}
function renderBoundary(pathname, props) {
  const h = {pathname, mounts: 0, redirect: null}; beginRender(h);
  const html = renderToStaticMarkup(React.createElement(MainAccountAccessBoundary, {...props, onSignOut: async()=>{}}, privateTree(h)));
  return {html, mounts: h.mounts, redirect: h.redirect};
}

const independent = ['/auth', '/reset-password', '/secretaria', '/tesouraria', '/igreja', '/membro', '/vote/fixture', '/eleicao/fixture/apresentar'];

test('pending principal hydration mounts no private reader and does not redirect', async () => {
  await withHarness({}, async h => { h.renderProvider(); assert.equal(h.state.loading, true); const html=h.renderHtml(); assert.equal(h.mounts, 0); assert.doesNotMatch(html,/private-meeting-fixture/); assert.equal(h.redirect,null); });
});

test('real SDK missing-refresh failure removes identity, private HTML/cache and returns to entry', async () => {
  await withHarness({}, async h => {
    await settle(h); assert.equal(h.state.user.id,actorId); assert.equal(h.state.loading,false); assert.equal(h.state.rolesLoaded,true); assert.match(h.renderHtml(),/ATA PRIVADA FICTICIA A/);
    h.queryClient.setQueryData(['profiles','fixture-private'],{private:true}); h.queryClient.setQueryData(['treasury','fixture-independent'],{independent:true}); const readsBefore=h.fixture.reads.length;
    const {data,error}=await h.fixture.client.auth.refreshSession(); await settle(h);
    assert.equal(error?.code,'refresh_token_not_found'); assert.equal(error?.status,400); assert.equal(data.session,null); assert.equal(h.fixture.events.at(-1).event,'SIGNED_OUT'); assert.equal(h.fixture.hasStoredSession(),false);
    assert.equal(h.state.user,null); assert.equal(h.state.session,null); assert.equal(h.state.profile,null); assert.deepEqual(h.state.roles,[]); assert.equal(h.state.effectiveSocietyId,null); assert.equal(h.state.loading,false); assert.equal(h.state.rolesLoaded,true);
    assert.equal(h.queryClient.getQueryData(['profiles','fixture-private']),undefined); assert.deepEqual(h.queryClient.getQueryData(['treasury','fixture-independent']),{independent:true}); assert.equal(h.fixture.reads.length,readsBefore);
    const html=h.renderHtml(); assert.equal(h.mounts,0); assert.doesNotMatch(html,/ATA PRIVADA|rascunho fictício/); assert.deepEqual(h.redirect,{to:'/auth?home=1',replace:true});
  });
});

test('initial absence of a session blocks each principal protected surface', async () => {
  await withHarness({session:false}, async h => { await settle(h); assert.equal(h.state.loading,false); assert.equal(h.state.rolesLoaded,true); for (const route of ['/reunioes','/reunioes/fixture','/tarefas','/arquivos','/usuarios','/plenarias','/pastor','/configuracoes']) {h.pathname=route; h.renderHtml(); assert.equal(h.mounts,0,route); assert.deepEqual(h.redirect,{to:'/auth?home=1',replace:true},route);} assert.equal(h.fixture.reads.length,0); });
});

test('independent access remains mounted during loading, failed principal lookup and missing identity', () => {
  for (const pathname of independent) for (const state of [{failed:false,authenticated:false,loading:true},{failed:true,authenticated:false,loading:false},{failed:false,authenticated:false,loading:false}]) {
    const rendered=renderBoundary(pathname,state); assert.equal(rendered.mounts,1,pathname); assert.match(rendered.html,/private-meeting-fixture/,pathname); assert.equal(rendered.redirect,null,pathname);
  }
});

test('failed principal lookup preserves its alert and never mounts protected readers', () => {
  for (const pathname of ['/reunioes','/financas','/secretaria/administracao','/tesouraria-privada','/vote/fixture/admin']) {const rendered=renderBoundary(pathname,{failed:true,authenticated:false,loading:false}); assert.equal(rendered.mounts,0,pathname); assert.match(rendered.html,/Não foi possível confirmar seu acesso à Diretoria/,pathname); assert.equal(rendered.redirect,null,pathname);}
});

test('valid same-user refresh retains ready profile/form tree and performs no rehydration', async () => {
  await withHarness({}, async h => {await settle(h); const profile=h.state.profile,child=h.child;const reads=h.fixture.reads.length; h.fixture.setRefreshMode('success'); const {error}=await h.fixture.client.auth.refreshSession();await settle(h);assert.equal(error,null);assert.equal(h.fixture.events.at(-1).event,'TOKEN_REFRESHED');assert.equal(h.state.user.id,actorId);assert.strictEqual(h.state.profile,profile);assert.strictEqual(h.tree.props.children.props.children,child);assert.equal(h.state.loading,false);assert.equal(h.state.rolesLoaded,true);assert.equal(h.fixture.reads.length,reads);const html=h.renderHtml();assert.equal(h.mounts,1);assert.match(html,/rascunho fictício não enviado/);assert.equal(h.redirect,null);});
});

test('same-user SIGNED_IN focus restoration retains ready access and does not repeat profile reads', async () => {
  await withHarness({}, async h => {await settle(h);const profile=h.state.profile;const reads=h.fixture.reads.length;const tokens=h.fixture.makeSession(7200);const {error}=await h.fixture.client.auth.setSession({access_token:tokens.access_token,refresh_token:tokens.refresh_token});await settle(h);assert.equal(error,null);assert.equal(h.fixture.events.at(-1).event,'SIGNED_IN');assert.strictEqual(h.state.profile,profile);assert.equal(h.state.loading,false);assert.equal(h.state.rolesLoaded,true);assert.equal(h.fixture.reads.length,reads);assert.match(h.renderHtml(),/ATA PRIVADA FICTICIA A/);assert.equal(h.redirect,null);});
});

test('provider signOut closes private surfaces and browser-back to a principal route remains guarded', async () => {
  await withHarness({}, async h => {await settle(h);assert.match(h.renderHtml(),/ATA PRIVADA FICTICIA A/);await h.state.signOut();await settle(h);assert.equal(h.fixture.hasStoredSession(),false);assert.equal(h.state.user,null);h.pathname='/auth';h.renderHtml();assert.equal(h.mounts,1);h.pathname='/reunioes';assert.doesNotMatch(h.renderHtml(),/ATA PRIVADA FICTICIA A/);assert.equal(h.mounts,0);assert.deepEqual(h.redirect,{to:'/auth?home=1',replace:true});assert.ok(h.fixture.requests.every(request=>['/auth/v1/token','/auth/v1/user','/auth/v1/logout'].includes(request.path)));});
});

// setSession resolves after notifying subscribers, before the Provider's
// deferred profile read. This assertion examines that precise transition.
test('a new SDK identity blocks private readers synchronously until its own roles hydrate', async () => {
  await withHarness({}, async h => {
    await settle(h);
    assert.equal(h.state.user.id, actorId);
    const reads = h.fixture.reads.length;
    const nextActor = '00000000-0000-4000-8000-000000000002';
    h.fixture.setActor(nextActor);
    const tokens = h.fixture.makeSession(7200);
    const {error} = await h.fixture.client.auth.setSession({access_token: tokens.access_token, refresh_token: tokens.refresh_token});
    assert.equal(error, null);
    h.renderProvider();
    assert.equal(h.state.user.id, nextActor);
    assert.equal(h.state.loading, true);
    assert.equal(h.state.rolesLoaded, false);
    assert.equal(h.fixture.reads.length, reads, 'No deferred profile read ran before this assertion');
    assert.doesNotMatch(h.renderHtml(), /ATA PRIVADA FICTICIA A/);
    assert.equal(h.mounts, 0);
    assert.equal(h.redirect, null);
    await settle(h);
    assert.equal(h.state.loading, false);
    assert.equal(h.state.rolesLoaded, true);
    assert.equal(h.state.profile.user_id, nextActor);
    assert.equal(h.state.profile.full_name, 'Visualizador fictício B');
    assert.deepEqual(h.state.roles, ['visualizador']);
    assert.equal(h.state.effectiveSocietyId, '00000000-0000-4000-8000-000000000012');
  });
});

test('SIGN_OUT supersedes a queued new-identity hydration before any deferred private read', async () => {
  await withHarness({}, async h => {
    await settle(h);
    const reads = h.fixture.reads.length;
    h.fixture.setActor('00000000-0000-4000-8000-000000000002');
    const tokens = h.fixture.makeSession(7200);
    const {error} = await h.fixture.client.auth.setSession({access_token: tokens.access_token, refresh_token: tokens.refresh_token});
    assert.equal(error, null);
    assert.equal(h.fixture.reads.length, reads);
    await h.state.signOut();
    h.renderProvider();
    assert.equal(h.state.user, null);
    assert.equal(h.state.loading, false);
    assert.equal(h.state.rolesLoaded, true);
    assert.equal(h.fixture.hasStoredSession(), false);
    await settle(h);
    assert.equal(h.fixture.reads.length, reads, 'Invalidated queued hydration must never issue reads');
    assert.equal(h.state.user, null);
    assert.equal(h.state.profile, null);
    assert.deepEqual(h.state.roles, []);
    assert.doesNotMatch(h.renderHtml(), /ATA PRIVADA FICTICIA A/);
    assert.equal(h.mounts, 0);
    assert.deepEqual(h.redirect, {to: '/auth?home=1', replace: true});
  });
});
