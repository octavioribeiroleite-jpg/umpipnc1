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
      const noop = () => {};
      export function shell(presentation) { return renderToStaticMarkup(React.createElement(AccessShell, {presentation, title:'Acesso de teste', description:'Somente teste', onBack:noop, onHome:noop}, React.createElement('p', {'data-access-fixture':true}, 'Conteúdo único'))); }
      export function shells() { return renderToStaticMarkup(React.createElement(React.Fragment, null, React.createElement(AccessShell, {title:'Primeiro'}, null), React.createElement(AccessShell, {title:'Segundo', presentation:'dialog'}, null))); }
      export function profiles() { return renderToStaticMarkup(React.createElement(ProfileSelect, {onBack:noop, onSelect:noop})); }
      export function societies() { return renderToStaticMarkup(React.createElement(SocietySelector, {societies:['uph','upa','ump','ucp','saf'].map(slug=>({id:slug,slug,name:'Sociedade fictícia '+slug,color:'#277463'})), onBack:noop, onSelect:noop, onSelectPastor:noop})); }
      export function pin(presentation='access', embedded=false) { return renderToStaticMarkup(React.createElement(PinPad, {profileLabel:'Perfil fictício', presentation, embedded, onBack:noop, onHome:noop, onComplete:noop})); }
      export function reauth(accessLevel, loading=false) {
        const aiReauthOpen=true, pinError=false, setAiReauthOpen=noop, navigate=noop, refreshBirthdaySession=noop, APP_HOME_PATH='/auth?home=1';
        const Dialog=({children})=>children;
        const DialogContent=({children, className, size})=><div role="dialog" className={className} data-dialog-size={size}>{children}</div>;
        const DialogHeader=({children})=><header>{children}</header>;
        const DialogTitle=({children})=><h2>{children}</h2>;
        const DialogDescription=({children})=><p>{children}</p>;
        return renderToStaticMarkup(${reauthExpression});
      }
      export function ebdEntry(selectedProfile, loading=false) {
        const handleBack=noop, navigate=noop, handlePinComplete=noop, pinError=false, APP_HOME_PATH='/auth?home=1';
        return renderToStaticMarkup(${entryExpression});
      }`,
    resolveDir: root, sourcefile: 'access-shell-test.tsx', loader: 'tsx',
  },
  bundle: true, write: false, platform: 'node', format: 'esm', jsx: 'automatic', mainFields: ['module', 'main'],
  alias: { '@': path.join(root, 'src') },
  plugins: [{ name: 'isolated-access-presentation', setup(builder) {
    builder.onResolve({ filter: /^react(?:-dom)?(?:\/|$)/ }, args => ({ path: pathToFileURL(require.resolve(args.path)).href, external: true }));
    builder.onResolve({ filter: /^react-router-dom$/ }, () => ({ path: 'router', namespace: 'access-test' }));
    builder.onLoad({ filter: /^router$/, namespace: 'access-test' }, () => ({ contents: 'export const useNavigate = () => () => {};', loader: 'js' }));
    builder.onResolve({ filter: /\.css$/ }, args => ({ path: args.path, namespace: 'access-css' }));
    builder.onLoad({ filter: /.*/, namespace: 'access-css' }, () => ({ contents: '', loader: 'js' }));
    builder.onLoad({ filter: /\.png$/ }, args => ({ contents: `export default ${JSON.stringify(args.path)};`, loader: 'js' }));
  } }],
});
const render = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`).catch(error => { throw new Error(error.message); });

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
  test(`actual EBD renewal for ${accessLevel} renders the compact shared PIN with contextual title and written Home navigation`, () => {
    const html = render.reauth(accessLevel);
    assert.match(html, /role="dialog" class="ebd-reauth" data-dialog-size="access"/);
    assert.match(html, /data-presentation="compact"/);
    assert.doesNotMatch(html, /<main|ipnc-pin-page|Acesso administrativo|Senha da sala/);
    assert.match(html, accessLevel === 'admin' ? />Secretaria EBD<\/h2>/ : />Secretaria EBD · Professor<\/h2>/);
    assert.match(html, />Voltar<\/span>/);
    assert.match(html, />Voltar para a Home<\/button>/);
    assert.match(html, /Seus dados preenchidos continuam na tela/);
    assert.equal((html.match(/class="ebd-access__logo"/g) || []).length, 1);
    assert.equal((html.match(/class="ipnc-pin-slot(?: ipnc-pin-slot-current)?"/g) || []).length, 6);
    assert.equal((html.match(/>[0-9]<\/button>/g) || []).length, 10);
    assert.match(html, /Apagar último dígito/);
    assert.match(html, /Limpar/);
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
