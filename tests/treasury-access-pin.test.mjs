import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Exercise the actual dialog callbacks with synthetic hooks and transport.
// This never mounts a browser session or contacts a financial backend.
const compiled = ts.transpileModule(readFileSync(new URL('../src/components/treasury/TreasuryAccessDialog.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const fund = { id: '11111111-1111-4111-8111-111111111111', abbreviation: 'TESTE', name: 'Sociedade fictícia', color: '#18774f' };
const session = { access_token: 'fixture-access', refresh_token: 'fixture-refresh' };
const settle = async () => { for (let i = 0; i < 3; i++) await new Promise(resolve => setImmediate(resolve)); };

function harness(options = {}) {
  const values = [], refs = [], calls = [], entered = [], navigation = [], opened = [];
  let stateIndex = 0, refIndex = 0;
  function PinPad() {}
  const component = () => null;
  const jsx = (type, props, key) => ({ type, props, key });
  const react = {
    useState(initial) {
      const index = stateIndex++;
      if (!(index in values)) values[index] = initial;
      return [values[index], value => { values[index] = typeof value === 'function' ? value(values[index]) : value; }];
    },
    useRef(current) { const index = refIndex++; return refs[index] ??= { current }; },
    useEffect() {},
  };
  const cache = {
    cancelQueries: async () => { calls.push('cancel'); },
    removeQueries: () => { calls.push('remove'); },
    invalidateQueries: async () => { calls.push('invalidate'); },
  };
  const treasuryClient = {
    functions: { invoke: async (name, args) => { calls.push({ name, body: JSON.parse(JSON.stringify(args.body)) }); return options.invoke ? options.invoke() : { data: { session }, error: null }; } },
    auth: {
      setSession: async () => { calls.push('setSession'); return { error: null }; },
      signOut: async args => { assert.equal(args.scope, 'local'); calls.push('signOut'); },
    },
    rpc: async name => { assert.equal(name, 'treasury_access'); calls.push('access'); return options.access ?? { data: { admin: true, fund_ids: [fund.id] }, error: null }; },
  };
  const imports = {
    react,
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'fragment' },
    'react-router-dom': { useNavigate: () => (...args) => navigation.push(args) },
    '@tanstack/react-query': { useQuery: () => ({ data: [fund], isPending: false, error: null }), useQueryClient: () => cache },
    'lucide-react': { ArrowLeft: component, ArrowRight: component, LockKeyhole: component, ShieldCheck: component, Wallet: component },
    '@/components/ui/dialog': { Dialog: component, DialogContent: component, DialogDescription: component, DialogTitle: component },
    '@/integrations/supabase/treasury-client': { treasuryClient },
    '@/components/auth/AccessShell': { AccessShell: component },
    '@/components/auth/AccessOption': { AccessOption: component },
    '@/components/secretaria/PinPad': { default: PinPad },
    '@/lib/app-home': { APP_HOME_PATH: '/auth?home=1' },
    './treasury-access.css': {},
  };
  const module = { exports: {} };
  vm.runInNewContext(compiled, { exports: module.exports, Response, require(name) { assert.ok(name in imports, `Unexpected dependency: ${name}`); return imports[name]; } });
  const render = () => {
    stateIndex = 0; refIndex = 0;
    return module.exports.TreasuryAccessDialog({ open: true, onOpenChange: value => opened.push(value), onEntered: id => entered.push(id) });
  };
  const nodes = node => Array.isArray(node) ? node.flatMap(nodes) : node && typeof node === 'object' ? [node, ...nodes(node.props?.children)] : [];
  const find = predicate => nodes(render()).find(predicate);
  return {
    calls, entered, navigation, opened, render,
    pin: () => find(node => node.type === PinPad),
    error: () => find(node => node.props?.className === 'ta-error')?.props.children,
    chooseSociety: () => find(node => node.props?.className === 'ta-option').props.onClick(),
    chooseAdmin: () => find(node => node.props?.className === 'ta-option ta-admin').props.onClick(),
    adminFields: () => nodes(render()).filter(node => node.type === 'input'),
    adminForm: () => find(node => node.type === 'form'),
  };
}

test('society PIN keypad forwards exactly the completed value, with financial cache and access checks preserved', async () => {
  const h = harness(); h.chooseSociety();
  assert.equal(h.pin().props.presentation, 'dialog');
  assert.equal(h.pin().props.embedded, true);
  h.pin().props.onComplete('654321'); await settle();
  assert.deepEqual(h.calls, ['cancel', 'remove', { name: 'treasury-pin-login', body: { fund_id: fund.id, pin: '654321' } }, 'setSession', 'access', 'invalidate']);
  assert.deepEqual(h.entered, [fund.id]);
});

test('malformed PIN and duplicate completion cannot submit financial access twice', async () => {
  let finish;
  const h = harness({ invoke: () => new Promise(resolve => { finish = resolve; }) }); h.chooseSociety();
  const pin = h.pin();
  for (const value of [undefined, '', '12345', '1234567', '12345x']) pin.props.onComplete(value);
  assert.deepEqual(h.calls, []);
  pin.props.onComplete('123456'); pin.props.onComplete('123456'); await settle();
  assert.equal(h.calls.filter(call => call.name === 'treasury-pin-login').length, 1);
  assert.equal(h.pin().props.loading, true);
  h.pin().props.onHome(); assert.deepEqual(h.navigation, []);
  finish({ data: { session }, error: null }); await settle();
  assert.deepEqual(h.entered, [fund.id]);
});

test('transport failure clears the keypad for retry without claiming that the PIN was incorrect', async () => {
  let attempts = 0;
  const h = harness({ invoke: async () => ++attempts === 1 ? { data: null, error: { message: 'network failure' } } : { data: { session }, error: null } }); h.chooseSociety();
  const previousKey = h.pin().key;
  h.pin().props.onComplete('123456'); await settle();
  assert.notEqual(h.pin().key, previousKey, 'remount clears the keypad after any failed attempt');
  assert.equal(h.pin().props.error, undefined, 'network failure must not trigger the shared incorrect-PIN message');
  assert.equal(h.error(), 'Não foi possível entrar. Confira os dados e tente novamente.');
  assert.deepEqual(h.entered, []);
  assert.equal(h.pin().props.loading, false);
  h.pin().props.onComplete('654321'); await settle();
  assert.equal(attempts, 2); assert.deepEqual(h.entered, [fund.id]);
});

test('wrong society access still signs out locally and never opens the financial panel', async () => {
  const h = harness({ access: { data: { fund_ids: ['another-fund'] }, error: null } }); h.chooseSociety();
  h.pin().props.onComplete('123456'); await settle();
  assert.equal(h.calls.at(-1), 'signOut');
  assert.deepEqual(h.entered, []);
  assert.equal(h.error(), 'Este acesso não tem permissão para a tesouraria selecionada.');
});

test('administrative account still submits username and password without using the society PIN keypad', async () => {
  const h = harness(); h.chooseAdmin();
  assert.equal(h.pin(), undefined);
  const [username, password] = h.adminFields();
  username.props.onChange({ target: { value: ' fixture-admin ' } });
  password.props.onChange({ target: { value: 'test-only-password' } });
  let prevented = false;
  h.adminForm().props.onSubmit({ preventDefault() { prevented = true; } }); await settle();
  assert.equal(prevented, true);
  assert.deepEqual(h.calls[2], { name: 'account-login', body: { username: 'fixture-admin', password: 'test-only-password' } });
  assert.deepEqual(h.entered, [undefined]);
});
