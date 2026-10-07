import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const { build } = createRequire(require.resolve('vite'))('esbuild');
const root = path.resolve(import.meta.dirname, '..');
const secretaria = ts.createSourceFile('Secretaria.tsx', readFileSync(path.join(root, 'src/pages/Secretaria.tsx'), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let reauthExpression, entryExpression;
function findReauth(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(secretaria) === 'reauthDialog') reauthExpression = node.initializer.getText(secretaria);
  if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(secretaria) === 'PinPad'
    && node.attributes.properties.some(attribute => ts.isJsxAttribute(attribute) && attribute.name.getText(secretaria) === 'profileLabel' && attribute.initializer?.getText(secretaria).includes('selectedProfile'))) entryExpression = node.getText(secretaria);
  ts.forEachChild(node, findReauth);
}
findReauth(secretaria);
assert.ok(reauthExpression, 'Render the actual Secretaria renewal integration');
assert.ok(entryExpression, 'Render the actual Secretaria entry integration');
const bundled = await build({
  absWorkingDir: root,
  stdin: {
    contents: `import React from 'react'; import {renderToStaticMarkup} from 'react-dom/server';
      import {AccessShell} from './src/components/auth/AccessShell';
      import ProfileSelect from './src/components/secretaria/ProfileSelect';
      import SocietySelector from './src/components/auth/SocietySelector';
      import PinPad from './src/components/secretaria/PinPad';
      import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription} from './src/components/ui/dialog';
      import {lastContentProps} from '@radix-ui/react-dialog';
      const noop = () => {};
      export function shell(presentation) { return renderToStaticMarkup(React.createElement(AccessShell, {presentation, title:'Acesso de teste', description:'Somente teste', onBack:noop, onHome:noop}, React.createElement('p', {'data-access-fixture':true}, 'Conteúdo único'))); }
      export function shells() { return renderToStaticMarkup(React.createElement(React.Fragment, null, React.createElement(AccessShell, {title:'Primeiro'}, null), React.createElement(AccessShell, {title:'Segundo', presentation:'dialog'}, null))); }
      export function profiles() { return renderToStaticMarkup(React.createElement(ProfileSelect, {onBack:noop, onSelect:noop})); }
      export function societies() { return renderToStaticMarkup(React.createElement(SocietySelector, {societies:['uph','upa','ump','ucp','saf'].map(slug=>({id:slug,slug,name:'Sociedade fictícia '+slug,color:'#277463'})), onBack:noop, onSelect:noop, onSelectPastor:noop})); }
      export function pin(presentation='access', embedded=false) { return renderToStaticMarkup(React.createElement(PinPad, {profileLabel:'Perfil fictício', presentation, embedded, onBack:noop, onHome:noop, onComplete:noop})); }
      export function reauth(accessLevel, loading=false) {
        const aiReauthOpen=true, pinError=false, handleCancelReauth=noop, navigate=noop, refreshBirthdaySession=noop, APP_HOME_PATH='/auth?home=1';
        return renderToStaticMarkup(${reauthExpression});
      }
      export function ebdEntry(selectedProfile, loading=false) {
        const handleBack=noop, navigate=noop, handlePinComplete=noop, pinError=false, APP_HOME_PATH='/auth?home=1';
        return renderToStaticMarkup(${entryExpression});
      }
      export function dialogCallbacks(props={}) {
        renderToStaticMarkup(React.createElement(DialogContent,props,React.createElement('span',null,'Synthetic content')));
        return lastContentProps();
      }`,
    resolveDir: root, sourcefile: 'access-shell-test.tsx', loader: 'tsx',
  },
  bundle: true, write: false, platform: 'node', format: 'esm', jsx: 'automatic', mainFields: ['module', 'main'],
  alias: { '@': path.join(root, 'src') },
  plugins: [{ name: 'isolated-access-presentation', setup(builder) {
    builder.onResolve({ filter: /^react(?:-dom)?(?:\/|$)/ }, args => ({ path: pathToFileURL(require.resolve(args.path)).href, external: true }));
    builder.onResolve({ filter: /^react-router-dom$/ }, () => ({ path: 'router', namespace: 'access-test' }));
    builder.onLoad({ filter: /^router$/, namespace: 'access-test' }, () => ({ contents: 'export const useNavigate = () => () => {};', loader: 'js' }));
    // Keep the production DialogContent composition. Only portal/DOM behavior
    // belongs to the browser QA; these inert primitives expose its actual props.
    builder.onResolve({ filter: /^@radix-ui\/react-dialog$/ }, () => ({ path: 'dialog', namespace: 'access-test' }));
    builder.onLoad({ filter: /^dialog$/, namespace: 'access-test' }, () => ({ contents: `
      import React from 'react';
      export const Root=({children,open})=>open===false?null:children;
      export const Portal=({children})=>children;
      const primitive=(tag,defaults={})=>React.forwardRef(({children,onOpenAutoFocus,onCloseAutoFocus,...props},ref)=>React.createElement(tag,{...defaults,...props,ref},children));
      let contentProps;
      export const lastContentProps=()=>contentProps;
      export const Content=React.forwardRef(({children,...props},ref)=>{contentProps=props;const {onOpenAutoFocus,onCloseAutoFocus,...html}=props;return React.createElement('div',{role:'dialog',...html,ref},children);});
      export const Overlay=primitive('div',{'data-overlay':true});
      export const Trigger=primitive('button'), Close=primitive('button',{'data-radix-close':true});
      export const Title=primitive('h2'), Description=primitive('p');
    `, loader: 'js' }));
    builder.onResolve({ filter: /\.css$/ }, args => ({ path: args.path, namespace: 'access-css' }));
    builder.onLoad({ filter: /.*/, namespace: 'access-css' }, () => ({ contents: '', loader: 'js' }));
    builder.onLoad({ filter: /\.(png|webp)$/ }, args => ({ contents: `export default ${JSON.stringify(args.path)};`, loader: 'js' }));
  } }],
});
const render = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`).catch(error => { throw new Error(error.message); });

// These tests execute the real production focus callbacks/effect. The objects
// only emulate the required DOM methods; actual Radix event order, focus trap
// and browser visibility remain part of the separate browser QA.
const pinSource = ts.createSourceFile('PinPad.tsx', readFileSync(path.join(root, 'src/components/secretaria/PinPad.tsx'), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let firstEffect;
function findPinEffect(node) {
  if (!firstEffect && ts.isCallExpression(node) && node.expression.getText(pinSource) === 'useEffect' && node.arguments[0].getText(pinSource).includes("closest('[role=\"dialog\"]')")) firstEffect = node.arguments[0].getText(pinSource);
  ts.forEachChild(node, findPinEffect);
}
findPinEffect(pinSource);
assert.ok(firstEffect);
const pinEffectFactory = new Function('containerRef', 'presentation', 'window', ts.transpileModule(`return (${firstEffect});`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText);
function focusEnvironment(work) {
  const prior = Object.fromEntries(['document','HTMLElement'].map(name => [name,Object.getOwnPropertyDescriptor(globalThis,name)]));
  const doc = { activeElement: null }, windowScroll = [];
  class ElementFixture {
    isConnected = true;
    visible = true;
    initial = null;
    dialog = null;
    focuses = [];
    scrolls = [];
    focus(options) { this.focuses.push(options); doc.activeElement = this; }
    getClientRects() { return this.visible ? [{}] : []; }
    querySelector(selector) { assert.equal(selector,'[data-dialog-initial-focus]'); return this.initial; }
    closest(selector) { assert.equal(selector,'[role="dialog"]'); return this.dialog; }
    scrollTo(options) { this.scrolls.push(options); }
  }
  Object.defineProperties(globalThis,{document:{configurable:true,value:doc},HTMLElement:{configurable:true,value:ElementFixture}});
  const event = target => ({ target, defaultPrevented:false, preventDefault() { this.defaultPrevented=true; } });
  try { return work({ doc, ElementFixture, event, windowScroll, win:{scrollTo: options => windowScroll.push(options)} }); }
  finally { for (const name of ['document','HTMLElement']) { if (prior[name]) Object.defineProperty(globalThis,name,prior[name]); else delete globalThis[name]; } }
}

test('renewal scrolls its own screen without stealing the input before Dialog captures and restores focus', () => focusEnvironment(({doc,ElementFixture,event,win,windowScroll}) => {
  const input=new ElementFixture(), card=new ElementFixture(), dialog=new ElementFixture();
  card.dialog=dialog; dialog.initial=card; doc.activeElement=input;
  pinEffectFactory({current:card},'access',win)();
  assert.equal(doc.activeElement,input);
  assert.deepEqual(card.focuses,[]);
  assert.equal(dialog.scrolls.length,1);
  assert.deepEqual(windowScroll,[]);
  const callbacks=render.dialogCallbacks({size:'screen',showCloseButton:false});
  const open=event(dialog); callbacks.onOpenAutoFocus(open);
  assert.equal(open.defaultPrevented,true);
  assert.equal(doc.activeElement,card);
  assert.deepEqual(card.focuses,[{preventScroll:true}]);
  const close=event(dialog); callbacks.onCloseAutoFocus(close);
  assert.equal(close.defaultPrevented,true);
  assert.equal(doc.activeElement,input);
  assert.deepEqual(input.focuses,[{preventScroll:true}]);
}));

test('standalone PIN retains its initial focus and window scroll behavior', () => focusEnvironment(({doc,ElementFixture,win,windowScroll}) => {
  const card=new ElementFixture();
  pinEffectFactory({current:card},'access',win)();
  assert.equal(doc.activeElement,card);
  assert.deepEqual(card.focuses,[{preventScroll:true}]);
  assert.equal(windowScroll.length,1);
  assert.deepEqual(card.scrolls,[]);
}));

test('custom initial focus prevents the marker default while preserving the originally focused input for close', () => focusEnvironment(({doc,ElementFixture,event}) => {
  const input=new ElementFixture(), custom=new ElementFixture(), card=new ElementFixture(), dialog=new ElementFixture();
  doc.activeElement=input; dialog.initial=card;
  const callbacks=render.dialogCallbacks({onOpenAutoFocus: event => { event.preventDefault(); custom.focus({preventScroll:true}); }});
  callbacks.onOpenAutoFocus(event(dialog));
  assert.equal(doc.activeElement,custom);
  assert.deepEqual(card.focuses,[]);
  callbacks.onCloseAutoFocus(event(dialog));
  assert.equal(doc.activeElement,input);
}));

test('custom close prevention remains authoritative and does not restore the former input', () => focusEnvironment(({doc,ElementFixture,event}) => {
  const input=new ElementFixture(), custom=new ElementFixture(), card=new ElementFixture(), dialog=new ElementFixture();
  doc.activeElement=input; dialog.initial=card;
  const callbacks=render.dialogCallbacks({onCloseAutoFocus: event => { event.preventDefault(); custom.focus({preventScroll:true}); }});
  callbacks.onOpenAutoFocus(event(dialog));
  const close=event(dialog); callbacks.onCloseAutoFocus(close);
  assert.equal(close.defaultPrevented,true);
  assert.equal(doc.activeElement,custom);
  assert.deepEqual(input.focuses,[]);
}));

test('dialogs without a marker keep Radix initial focus; disconnected or hidden return targets leave its close fallback intact', () => focusEnvironment(({doc,ElementFixture,event}) => {
  for (const state of ['visible','hidden','disconnected','non-element']) {
    const input=state==='non-element'?{}:new ElementFixture(), dialog=new ElementFixture();
    if (state==='hidden') input.visible=false;
    if (state==='disconnected') input.isConnected=false;
    doc.activeElement=input;
    const callbacks=render.dialogCallbacks();
    const open=event(dialog); callbacks.onOpenAutoFocus(open);
    assert.equal(open.defaultPrevented,false);
    assert.equal(doc.activeElement,input);
    const close=event(dialog); callbacks.onCloseAutoFocus(close);
    assert.equal(close.defaultPrevented,state==='visible');
    if (state!=='non-element') assert.equal(input.focuses.length,state==='visible'?1:0);
  }
}));

for (const presentation of ['page', 'dialog', 'compact']) {
  test(`${presentation}: access keeps one official logo, navigation and content`, () => {
    const html = render.shell(presentation);
    assert.equal((html.match(/class="ebd-access__logo"/g) || []).length, 1);
    assert.match(html, /class="ebd-access__logo" src="[^"]+\/logo-ipnc\.png"/);
    assert.match(html, /Voltar para a Home/);
    assert.match(html, />Voltar<\/span>/);
    assert.equal((html.match(/data-access-fixture="true"/g) || []).length, 1);
    assert.match(html, presentation === 'page' ? /<h1[^>]*>Acesso de teste<\/h1>/ : /<h2[^>]*>Acesso de teste<\/h2>/);
  });
}

test('simultaneous access surfaces have independent artwork and accessible heading references', () => {
  const html = render.shells();
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length, 'Repeated gradient ids can replace the artwork of a dialog or page');
  for (const match of html.matchAll(/aria-labelledby="([^"]+)"/g)) assert.ok(ids.includes(match[1]));
});

test('EBD profiles keep both destinations and their explanations in the shared cards', () => {
  const html = render.profiles();
  assert.equal((html.match(/ipnc-access-option/g) || []).length, 2);
  for (const label of ['Administrador', 'Professor', 'Acesso completo à chamada, histórico, turmas e configurações.', 'Acesso rápido para registrar chamada e acompanhar sua turma.', 'Voltar à Igreja', '2 Timóteo 2:15']) assert.ok(html.includes(label));
});

test('society cards retain their order, official images, accessible names and pastoral option', () => {
  const html = render.societies();
  const names = [...html.matchAll(/aria-label="Acessar ([A-Z]+) — /g)].map(match => match[1]);
  assert.deepEqual(names, ['SAF', 'UCP', 'UMP', 'UPA', 'UPH']);
  assert.equal((html.match(/ipnc-access-option/g) || []).length, 6);
  assert.equal((html.match(/alt="" width="384" height="384"/g) || []).length, 6);
  assert.equal((html.match(/srcSet="[^"]+96w, [^"]+192w, [^"]+256w, [^"]+384w"/g) || []).length, 6);
  assert.equal((html.match(/loading="eager" decoding="async"/g) || []).length, 6);
  assert.match(html, /aria-label="Acesso pastoral"/);
});

test('embedded and standalone PIN pages use the same interface, with all numeric controls in every mode', () => {
  assert.equal(render.pin('access', true), render.pin('access', false));
  for (const presentation of ['access', 'dialog', 'compact']) {
    const html = render.pin(presentation);
    assert.equal((html.match(/>[0-9]<\/button>/g) || []).length, 10);
    assert.match(html, /0 de 6 dígitos preenchidos/);
    assert.match(html, /Apagar último dígito/);
    assert.match(html, /Limpar/);
    assert.match(html, /Voltar para a Home/);
    assert.equal((html.match(/class="ebd-access__logo"/g) || []).length, 1);
  }
});

for (const accessLevel of ['admin', 'professor']) {
  test(`actual EBD renewal for ${accessLevel} presents the same page PIN without an outer popup or visible duplicate title`, () => {
    const html = render.reauth(accessLevel);
    assert.match(html, /role="dialog"[^>]*data-dialog-size="screen"/);
    assert.match(html, /class="app-dialog-screen\b/);
    assert.doesNotMatch(html, /app-dialog-content|data-radix-close|data-presentation="compact"|Acesso administrativo|Senha da sala/);
    assert.match(html, /<main class="ebd-access ipnc-access-shell ipnc-safe-managed ipnc-pin-page" data-presentation="page"/);
    assert.match(html, /<h2[^>]*class="[^"]*\bsr-only\b[^"]*"[^>]*>Confirmar acesso[^<]*<\/h2>/);
    assert.match(html, /<p[^>]*class="[^"]*\bsr-only\b[^"]*"[^>]*>[^<]*Seus dados preenchidos continuam na tela/);
    assert.match(html, accessLevel === 'admin' ? />Secretaria EBD<\/h1>/ : />Secretaria EBD · Professor<\/h1>/);
    assert.equal((html.match(/<nav\b/g) || []).length, 1, 'The screen exposes one access navigation');
    assert.equal((html.match(/<h1\b/g) || []).length, 1, 'The PIN has one visible main heading');
    assert.match(html, />Voltar<\/span>/);
    assert.match(html, />Voltar para a Home<\/button>/);
    assert.match(html, /Seus dados preenchidos continuam na tela/);
    assert.equal((html.match(/class="ebd-access__logo"/g) || []).length, 1);
    assert.match(html, /data-dialog-initial-focus="true"/, 'The real PIN card supplies the dialog focus target');
    assert.equal((html.match(/class="ipnc-pin-slot(?: ipnc-pin-slot-current)?"/g) || []).length, 6);
    assert.equal((html.match(/>[0-9]<\/button>/g) || []).length, 10);
    assert.match(html, /Apagar último dígito/);
    assert.match(html, /Limpar/);
    const page = value => value.match(/<main\b[\s\S]*<\/main>/)?.[0]
      .replace(/ipnc-access-(title|canopy|leaf|floor)-[^"\s)]+/g, 'ipnc-access-$1-test');
    assert.equal(page(html), page(render.ebdEntry(accessLevel)), 'Renewal uses the same full PIN composition as entering EBD');
    const busy = render.reauth(accessLevel, true);
    assert.equal((busy.match(/disabled=""/g) || []).length, 14, 'All twelve keys and both navigation actions respect the pending request');
  });
  test(`actual EBD entry for ${accessLevel} keeps the shared page PIN and its own title`, () => {
    const html = render.ebdEntry(accessLevel);
    assert.match(html, /<main class="ebd-access ipnc-access-shell ipnc-safe-managed ipnc-pin-page" data-presentation="page"/);
    assert.match(html, accessLevel === 'admin' ? />Secretaria EBD<\/h1>/ : />Secretaria EBD · Professor<\/h1>/);
    assert.doesNotMatch(html, /Acesso administrativo|Senha da sala/);
    assert.match(html, /Voltar para a Home/);
    assert.equal((html.match(/class="ebd-access__logo"/g) || []).length, 1);
    assert.equal((html.match(/>[0-9]<\/button>/g) || []).length, 10);
    assert.match(html, /Apagar último dígito/);
    assert.match(html, /Limpar/);
  });
}
