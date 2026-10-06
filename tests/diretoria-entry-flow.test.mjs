import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const compiled = ts.transpileModule(readFileSync(new URL('../src/pages/Auth.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const society = { id: 'fixture-ump', name: 'Sociedade fictícia UMP', slug: 'ump', color: '#18774f' };
const session = { access_token: 'fixture-only-access', refresh_token: 'fixture-only-refresh' };
const settle = async () => { for (let i = 0; i < 3; i++) await new Promise(resolve => setImmediate(resolve)); };

function harness(options = {}) {
  const values = [], refs = [], calls = [], navigations = [], identities = [];
  let stateIndex = 0, refIndex = 0;
  const jsx = (type, props, key) => ({ type, props, key });
  const component = () => null;
  function PinPad() {} function SocietySelector() {} function AccessShell() {}
  const react = {
    useState(initial) { const i = stateIndex++; if (!(i in values)) values[i] = initial; return [values[i], v => { values[i] = typeof v === 'function' ? v(values[i]) : v; }]; },
    useRef(initial) { return refs[refIndex++] ??= { current: initial }; },
    useEffect() {}, useCallback(fn) { return fn; },
  };
  const supabase = {
    functions: { invoke: async (name, args) => { calls.push({ name, body: { ...args.body } }); return options.invoke ? options.invoke() : { data: { success: true, session }, error: null }; } },
    auth: { setSession: async data => { calls.push({ session: data }); return { error: options.sessionError ?? null }; } },
  };
  const imports = {
    react, 'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'fragment' },
    'react-router-dom': { useNavigate: () => (...args) => navigations.push(args), useLocation: () => ({ search: '' }) },
    '@/contexts/AuthContext': { useAuth: () => ({ signIn: async () => ({ error: null }) }) },
    '@/contexts/DiretoriaSessionContext': { useDiretoriaSession: () => ({ setSession: data => identities.push(data) }) },
    '@/contexts/MembroSessionContext': { useMembroSession: () => ({ setSession() {} }) },
    '@/hooks/use-toast': { useToast: () => ({ toast() {} }) },
    '@/integrations/supabase/client': { supabase },
    '@/components/secretaria/PinPad': { default: PinPad },
    '@/components/auth/SocietySelector': { default: SocietySelector },
    '@/components/auth/AccessShell': { AccessShell },
    '@/lib/app-home': { APP_HOME_PATH: '/auth?home=1', requestsPublicHome: () => false },
    '@/lib/ebd-session-storage': { loadStoredEbdSession: () => null },
  };
  const module = { exports: {} };
  const stored = new Map(Object.entries(options.stored ?? {}));
  vm.runInNewContext(compiled, {
    exports: module.exports, Response, setTimeout, console: { error() {} },
    localStorage: { getItem: key => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, value) },
    require(name) {
      if (name in imports) return imports[name];
      if (/\.(png|css)$/.test(name)) return { default: 'fixture-asset' };
      return new Proxy({ default: component }, { get: (target, key) => key in target ? target[key] : component });
    },
  });
  const render = () => { stateIndex = 0; refIndex = 0; return module.exports.default(); };
  const nodes = n => Array.isArray(n) ? n.flatMap(nodes) : n && typeof n === 'object' ? [n, ...nodes(n.props?.children)] : [];
  const find = fn => nodes(render()).find(fn);
  return {
    calls, navigations, identities, stored, render,
    enter: () => find(n => n.props?.title === 'Diretoria').props.onClick(),
    societies: () => find(n => n.type === SocietySelector),
    pin: () => find(n => n.type === PinPad),
    form: () => find(n => n.props?.id === 'operator-name'),
  };
}

test('Diretoria chooses the society before showing its PIN; choosing has no authentication call', () => {
  const h = harness(); h.enter();
  assert.ok(h.societies()); assert.equal(h.pin(), undefined); assert.deepEqual(h.calls, []);
  h.societies().props.onSelect(society);
  assert.equal(h.pin().props.profileLabel, 'Diretoria · UMP'); assert.deepEqual(h.calls, []);
  assert.equal(h.pin().props.embedded, undefined, 'same standalone entry as EBD');
  h.pin().props.onBack(); assert.ok(h.societies()); assert.equal(h.pin(), undefined);
});

test('the completed PIN is sent only with the selected society; invalid or duplicate submissions never reach the server', async () => {
  let finish;
  const h = harness({ invoke: () => new Promise(resolve => { finish = resolve; }) }); h.enter(); h.societies().props.onSelect(society);
  const pin = h.pin();
  for (const value of ['', '12345', '1234567', '12345x']) pin.props.onComplete(value);
  assert.deepEqual(h.calls, []);
  pin.props.onComplete('654321'); pin.props.onComplete('654321'); await settle();
  assert.deepEqual(h.calls, [{ name: 'validate-diretoria-pin', body: { society_slug: 'ump', pin: '654321' } }]);
  assert.equal(h.pin().props.loading, true);
  finish({ data: { success: true, session }, error: null }); await settle();
  assert.equal(h.pin(), undefined); assert.ok(h.form());
  assert.equal(h.stored.size, 0, 'the PIN is never saved in device storage');
});

test('a denied PIN stays on the selected society, clears the keypad, and never establishes a session', async () => {
  const h = harness({ invoke: async () => ({ data: { success: false, error: 'PIN incorreto' }, error: null }) }); h.enter(); h.societies().props.onSelect(society);
  const previousKey = h.pin().key; h.pin().props.onComplete('123456'); await settle();
  assert.notEqual(h.pin().key, previousKey); assert.equal(h.pin().props.errorMessage, 'PIN incorreto');
  assert.equal(h.pin().props.loading, false); assert.equal(h.calls.length, 1); assert.equal(h.navigations.length, 0);
});

test('network and session failures never report a successful login or an incorrect PIN', async () => {
  for (const options of [{ invoke: async () => ({ data: null, error: { message: 'network' } }) }, { sessionError: { message: 'session unavailable' } }]) {
    const h = harness(options); h.enter(); h.societies().props.onSelect(society); h.pin().props.onComplete('123456'); await settle();
    assert.match(h.pin().props.errorMessage, /conexão/); assert.equal(h.navigations.length, 0); assert.equal(h.identities.length, 0);
  }
});

test('home clears the chosen society and a subsequent entry starts at the society chooser', () => {
  const h = harness(); h.enter(); h.societies().props.onSelect(society); h.pin().props.onHome();
  assert.equal(h.pin(), undefined); assert.equal(h.societies(), undefined); assert.deepEqual(JSON.parse(JSON.stringify(h.navigations[0])), ['/auth?home=1', { replace: true }]);
  h.enter(); assert.ok(h.societies()); assert.equal(h.pin(), undefined);
});

test('pastoral entry uses its own chosen PIN and keeps the fixed identity and pastoral route', async () => {
  const h = harness(); h.enter(); h.societies().props.onSelectPastor(); h.pin().props.onComplete('654321'); await settle();
  assert.equal(h.calls[0].body.society_slug, 'pastor'); assert.equal(h.identities[0].societySlug, 'pastor');
  assert.equal(h.navigations[0][0], '/pastor');
});
