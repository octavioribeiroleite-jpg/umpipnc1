import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as pinAdmin from '../src/lib/diretoria-pin-admin.ts';

// Execute the production panel callbacks with hooks, settings and clipboard
// doubles. No production session, PIN, clipboard or backend is involved.
const compiled = ts.transpileModule(readFileSync(new URL('../src/components/settings/DirectoryPinsPanel.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const settle = async () => { for (let i = 0; i < 4; i++) await new Promise(resolve => setImmediate(resolve)); };
const society = { id: 'fixture-society', name: 'Sociedade fictícia', slug: 'teste', color: '#18774f' };

function harness(options = {}) {
  const values = [], refs = [], callbacks = [], effects = [], pendingEffects = [];
  const calls = [], copied = [], successes = [], errors = [], focused = [];
  let stateIndex = 0, refIndex = 0, callbackIndex = 0, effectIndex = 0, isAdmin = options.isAdmin ?? true;
  const changed = (old, next) => !old || next.some((value, index) => value !== old[index]);
  const jsx = (type, props, key) => ({ type, props, key });
  const react = {
    useState(initial) {
      const index = stateIndex++;
      if (!(index in values)) values[index] = typeof initial === 'function' ? initial() : initial;
      return [values[index], value => { values[index] = typeof value === 'function' ? value(values[index]) : value; }];
    },
    useRef(current) { const index = refIndex++; return refs[index] ??= { current }; },
    useCallback(callback, deps) { const index = callbackIndex++; if (!callbacks[index] || changed(callbacks[index].deps, deps)) callbacks[index] = { callback, deps }; return callbacks[index].callback; },
    useEffect(effect, deps) {
      const index = effectIndex++;
      if (!effects[index] || changed(effects[index].deps, deps)) {
        const old = effects[index];
        effects[index] = { deps, cleanup: old?.cleanup };
        pendingEffects.push(() => { old?.cleanup?.(); effects[index].cleanup = effect(); });
      }
    },
  };
  function from(table) {
    let payload, conflict, selected, keys;
    const chain = {
      select: columns => { selected = columns; return chain; },
      eq: (key, value) => { assert.equal(table, 'societies'); assert.equal(key, 'active'); assert.equal(value, true); return chain; },
      order: key => { assert.equal(key, 'name'); return chain; },
      in: (key, values) => { assert.equal(key, 'key'); keys = [...values]; return chain; },
      upsert: (rows, options) => { payload = JSON.parse(JSON.stringify(rows)); conflict = options.onConflict; return chain; },
      then: (resolve, reject) => Promise.resolve().then(async () => {
        calls.push({ table, payload, conflict, selected, keys });
        if (payload) return options.save ? await options.save(payload) : { data: payload, error: null };
        if (options.readError) return { data: null, error: { message: 'fixture read error' } };
        return { data: table === 'societies' ? [society] : [{ key: 'diretoria_pin_teste', value: '012345' }].filter(row => keys.includes(row.key)), error: null };
      }).then(resolve, reject),
    };
    return chain;
  }
  const imports = {
    react,
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'fragment' },
    'lucide-react': Object.fromEntries(['Check', 'Church', 'Copy', 'KeyRound', 'Loader2', 'Save'].map(name => [name, name])),
    sonner: { toast: { success: value => successes.push(value), error: value => errors.push(value) } },
    '@/components/ui/badge': { Badge: 'Badge' },
    '@/components/ui/button': { Button: 'button' },
    '@/components/ui/card': Object.fromEntries(['Card', 'CardContent', 'CardDescription', 'CardHeader', 'CardTitle'].map(name => [name, name])),
    '@/components/ui/input': { Input: 'input' },
    '@/components/ui/label': { Label: 'label' },
    '@/components/ui/query-error-state': { QueryErrorState: 'QueryErrorState' },
    '@/integrations/supabase/client': { supabase: { from } },
    '@/lib/diretoria-pin-admin': pinAdmin,
  };
  const module = { exports: {} };
  vm.runInNewContext(compiled, {
    exports: module.exports,
    navigator: { clipboard: options.noClipboard ? undefined : { writeText: async value => { if (options.copyError) throw new Error('fixture denied'); copied.push(value); } } },
    document: { getElementById: id => ({ focus: () => focused.push(id) }) },
    require(name) { assert.ok(name in imports, `Unexpected panel dependency: ${name}`); return imports[name]; },
  });
  const render = () => {
    stateIndex = refIndex = callbackIndex = effectIndex = 0;
    const tree = module.exports.DirectoryPinsPanel({ isAdmin });
    pendingEffects.splice(0).forEach(effect => effect());
    return tree;
  };
  const nodes = node => Array.isArray(node) ? node.flatMap(nodes) : node && typeof node === 'object' ? [node, ...nodes(node.props?.children)] : [];
  const find = predicate => nodes(render()).find(predicate);
  return {
    calls, copied, successes, errors, focused, render,
    text: () => nodes(render()).flatMap(node => typeof node.props?.children === 'string' ? [node.props.children] : []).join(' '),
    input: slug => find(node => node.type === 'input' && node.props.id === `dir-pin-${slug}`),
    copy: () => find(node => node.type === 'button' && node.props['aria-label'] === 'Copiar PIN de Sociedade fictícia'),
    save: () => find(node => node.type === 'button' && node.props.type === 'submit'),
    submit: () => find(node => node.type === 'form').props.onSubmit({ preventDefault() {} }),
    change: (slug, value) => find(node => node.type === 'input' && node.props.id === `dir-pin-${slug}`).props.onChange({ target: { value } }),
    authorize: value => { isAdmin = value; render(); },
    dispose: () => effects.forEach(effect => effect.cleanup?.()),
  };
}

test('panel stays absent and issues no reads for a non-admin', async () => {
  const h = harness({ isAdmin: false });
  assert.equal(h.render(), null); await settle();
  assert.deepEqual(h.calls, []);
});

test('PINs are always visible and load only individual keys; the general editor and reveal toggle are absent', async () => {
  const h = harness(); h.render(); await settle();
  assert.equal(h.input('teste').props.type, 'text');
  assert.equal(h.input('teste').props.value, '012345');
  assert.equal(h.input('geral'), undefined);
  assert.equal(h.text().includes('Mostrar PINs'), false);
  assert.deepEqual(h.calls[1].keys, ['diretoria_pin_pastor', 'diretoria_pin_teste']);
  assert.equal(h.copy().props.disabled, false);
  h.dispose();
});

test('copy callback writes the saved value and an edited field disables copying until a confirmed save', async () => {
  const h = harness(); h.render(); await settle();
  h.copy().props.onClick(); await settle();
  assert.deepEqual(h.copied, ['012345']);
  assert.equal(h.successes.at(-1), 'PIN de Sociedade fictícia copiado.');
  h.change('teste', '000123');
  assert.equal(h.copy().props.disabled, true);
  h.copy().props.onClick(); await settle();
  assert.deepEqual(h.copied, ['012345'], 'even direct invocation cannot copy an old or unsaved value');
  await h.submit();
  assert.equal(h.copy().props.disabled, false);
  h.copy().props.onClick(); await settle();
  assert.deepEqual(h.copied, ['012345', '000123']);
  const write = h.calls.find(call => call.payload);
  assert.equal(write.conflict, 'key');
  assert.equal(write.selected, 'key, value');
  assert.deepEqual(write.payload.map(({ key, value }) => ({ key, value })), [{ key: 'diretoria_pin_teste', value: '000123' }]);
  h.dispose();
});

test('clipboard error produces an actionable error without copy success', async () => {
  const h = harness({ copyError: true }); h.render(); await settle();
  h.copy().props.onClick(); await settle();
  assert.deepEqual(h.successes, []);
  assert.deepEqual(h.copied, []);
  assert.match(h.errors.at(-1), /copie manualmente/);
  assert.match(h.text(), /Não foi possível copiar/);
  h.dispose();
});

test('save rejection retains the draft and the saved snapshot, with no success toast or enabled copy', async () => {
  const h = harness({ save: async () => ({ data: null, error: { message: 'fixture write rejected' } }) }); h.render(); await settle();
  h.change('teste', '654321'); await h.submit();
  assert.equal(h.input('teste').props.value, '654321');
  assert.equal(h.copy().props.disabled, true);
  assert.equal(h.save().props.disabled, false);
  assert.deepEqual(h.successes, []);
  assert.match(h.errors.at(-1), /Não foi possível salvar/);
  h.change('teste', '012345');
  assert.equal(h.copy().props.disabled, false, 'saved snapshot was not replaced after rejection');
  h.dispose();
});

test('unconfirmed save response cannot claim success or enable copying a new PIN', async () => {
  const h = harness({ save: async () => ({ data: [], error: null }) }); h.render(); await settle();
  h.change('teste', '654321'); await h.submit();
  assert.deepEqual(h.successes, []);
  assert.equal(h.copy().props.disabled, true);
  assert.match(h.errors.at(-1), /confirmar o salvamento/);
  h.dispose();
});

test('invalid input focuses its field and makes no write; duplicate saves share only one pending request', async () => {
  let finish;
  const h = harness({ save: rows => new Promise(resolve => { finish = () => resolve({ data: rows, error: null }); }) }); h.render(); await settle();
  h.change('teste', '12345'); await h.submit();
  assert.deepEqual(h.focused, ['dir-pin-teste']);
  assert.equal(h.calls.filter(call => call.payload).length, 0);
  h.change('teste', '654321');
  const first = h.submit();
  const second = h.submit(); await settle();
  assert.equal(h.calls.filter(call => call.payload).length, 1);
  assert.equal(h.input('teste').props.disabled, true);
  finish(); await Promise.all([first, second]);
  assert.deepEqual(h.successes, ['PINs da Diretoria salvos.']);
  h.dispose();
});

test('permission loss hides the panel and prevents a late save from claiming success', async () => {
  let finish;
  const h = harness({ save: rows => new Promise(resolve => { finish = () => resolve({ data: rows, error: null }); }) }); h.render(); await settle();
  h.change('teste', '654321');
  const pending = h.submit(); await settle();
  h.authorize(false);
  assert.equal(h.render(), null);
  finish(); await pending;
  assert.deepEqual(h.successes, []);
  assert.deepEqual(h.errors, []);
  h.dispose();
});
