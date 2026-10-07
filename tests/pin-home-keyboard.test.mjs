import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { validTrail } from '../src/lib/ebd-navigation.ts';

// Execute the component's actual keydown effect. The JSX tree and React hooks
// stay isolated: this never mounts a router, requests an API, or validates a PIN.
const source = readFileSync(new URL('../src/components/secretaria/PinPad.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.ReactJSX,
  },
}).outputText;

function harness({ pin = '123456', loading = false, errorMessage } = {}) {
  const listeners = new Map(), cleanups = [], completed = [];
  let stateIndex = 0;
  class Element {
    constructor(tag, parent = null) { this.tag = tag; this.parent = parent; }
    closest(selector) {
      assert.equal(selector, 'button');
      for (let node = this; node; node = node.parent) if (node.tag === 'button') return node;
      return null;
    }
  }
  const react = {
    useState(initial) { return [stateIndex++ === 0 ? pin : initial, () => {}]; },
    useCallback(callback) { return callback; },
    useRef(current) { return { current }; },
    useEffect(effect) { const cleanup = effect(); if (cleanup) cleanups.push(cleanup); },
  };
  const component = () => null;
  const jsx = (type, props) => ({ type, props });
  const imports = {
    react,
    'react/jsx-runtime': { jsx, jsxs: jsx },
    '@/components/ui/button': { Button: component },
    '@/components/auth/PublicHomeButton': { default: component },
    '@/components/auth/AccessShell': { AccessShell: component },
    '@/assets/logo-ipnc.png': { default: 'fixture-logo.png' },
    './PinPad.css': {},
    '@/lib/utils': { cn: (...values) => values.filter(Boolean).join(' ') },
    '@/lib/ebd-navigation': { validTrail },
    '@/lib/pin-back-navigation': { createPinBackGuard: (_window, callbacks) => ({ start() {}, stop() {}, back() { if (!callbacks.isBusy()) callbacks.onBack(); } }) },
    'lucide-react': { ArrowLeft: component, Delete: component, LogIn: component, Loader2: component, Lock: component },
  };
  const module = { exports: {} };
  vm.runInNewContext(compiled, {
    exports: module.exports,
    require(name) { assert.ok(name in imports, `Unexpected component dependency: ${name}`); return imports[name]; },
    HTMLElement: Element,
    window: {
      history: { state: null },
      scrollTo() {},
      addEventListener(name, listener) { assert.equal(listeners.has(name), false); listeners.set(name, listener); },
      removeEventListener(name, listener) { assert.equal(listeners.get(name), listener); listeners.delete(name); },
    },
  });
  const tree = module.exports.default({ profileLabel: 'Perfil fictício', loading, errorMessage, onBack() {}, onComplete: value => completed.push(value) });
  assert.equal(typeof listeners.get('keydown'), 'function');
  return {
    completed,
    tree,
    container: new Element('div'),
    button: () => new Element('button'),
    buttonChild: () => new Element('span', new Element('button')),
    key(target, key = 'Enter') {
      let prevented = false;
      listeners.get('keydown')({ key, target, preventDefault() { prevented = true; } });
      return prevented;
    },
    cleanup() { cleanups.forEach(cleanup => cleanup()); assert.equal(listeners.size, 0); },
  };
}

test('Enter on home, back or confirm buttons leaves their native activation untouched and does not submit the PIN', () => {
  const h = harness();
  for (const target of [h.button(), h.buttonChild(), h.button()]) {
    assert.equal(h.key(target), false, 'the focused button keeps its native Enter activation');
    assert.deepEqual(h.completed, [], 'a home/back/confirm keydown must not also validate the PIN');
  }
  h.cleanup();
});

test('Enter in the PIN container still submits one complete PIN and prevents default', () => {
  const h = harness();
  assert.equal(h.key(h.container), true);
  assert.deepEqual(h.completed, ['123456']);
  h.cleanup();
});

test('Enter never submits while loading or before six digits have been entered', () => {
  for (const options of [{ loading: true }, { pin: '12345' }]) {
    const h = harness(options);
    assert.equal(h.key(h.container), false);
    assert.equal(h.key(h.buttonChild()), false);
    assert.deepEqual(h.completed, []);
    h.cleanup();
  }
});

test('transport feedback is visible without claiming that the PIN was incorrect', () => {
  const h = harness({ errorMessage: 'Não foi possível verificar o acesso. Tente novamente.' });
  const alerts = [];
  function walk(node) {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node?.props) return;
    if (node.props.role === 'alert') alerts.push(node.props.children);
    walk(node.props.children);
  }
  walk(h.tree);
  assert.deepEqual(alerts, ['Não foi possível verificar o acesso. Tente novamente.']);
  assert.doesNotMatch(JSON.stringify(h.tree), /PIN incorreto/);
  h.cleanup();
});
