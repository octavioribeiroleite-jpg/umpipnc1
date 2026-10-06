import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';

const source = readFileSync(new URL('../src/lib/pwaInstall.ts', import.meta.url), 'utf8');
const factorySource = source.slice(0, source.indexOf('// Capture events'));
const js = ts.transpileModule(factorySource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const module = { exports: {} };
vm.runInNewContext(js, { exports: module.exports });
const { createPWAInstallController } = module.exports;
function setup({ installed = false, ios = false, ua = 'Android Chrome/140', platform = '', touch = 0 } = {}) {
  const browser = new EventTarget();
  const media = new EventTarget();
  media.matches = installed;
  browser.matchMedia = () => media;
  const controller = createPWAInstallController(browser, { userAgent: ua, platform, maxTouchPoints: touch, standalone: ios });
  return { browser, media, controller };
}
function nativeEvent(browser, outcome = 'accepted', prompt = async () => {}) {
  const event = new Event('beforeinstallprompt', { cancelable: true });
  event.prompt = prompt;
  event.userChoice = Promise.resolve({ outcome });
  browser.dispatchEvent(event);
  assert.equal(event.defaultPrevented, true);
}

test('receiving native event never opens the card automatically; closing permits manual reopening', () => {
  const { controller: c, browser } = setup();
  nativeEvent(browser);
  assert.equal(c.getSnapshot().isOpen, false);
  assert.equal(c.getSnapshot().canPrompt, true);
  c.open(); assert.equal(c.getSnapshot().isOpen, true);
  c.close(); assert.equal(c.getSnapshot().isOpen, false);
  c.open(); assert.equal(c.getSnapshot().isOpen, true);
  c.dispose();
});
test('manual instructions remain reachable without browser event', async () => {
  const { controller: c } = setup();
  c.open(); await c.install();
  assert.equal(c.getSnapshot().isOpen, true);
  assert.equal(c.getSnapshot().canPrompt, false);
  assert.equal(c.getSnapshot().isInstalling, false);
});
test('cancellation consumes prompt, allows a fresh prompt and does not mark installed', async () => {
  const { controller: c, browser } = setup(); let calls = 0;
  nativeEvent(browser, 'dismissed', async () => { calls++; });
  c.open(); await c.install(); await c.install();
  assert.equal(calls, 1);
  assert.match(c.getSnapshot().message, /cancelada/);
  assert.equal(c.getSnapshot().isInstalled, false);
  nativeEvent(browser); assert.equal(c.getSnapshot().canPrompt, true);
});
test('acceptance is not installation completion; appinstalled closes all entry points', async () => {
  const { controller: c, browser } = setup();
  nativeEvent(browser); c.open(); await c.install();
  assert.equal(c.getSnapshot().isInstalled, false);
  browser.dispatchEvent(new Event('appinstalled'));
  c.open(); assert.equal(c.getSnapshot().isOpen, false);
  assert.equal(c.getSnapshot().isInstalled, true);
});
test('native failure recovers to manual instructions', async () => {
  const { controller: c, browser } = setup();
  nativeEvent(browser, 'dismissed', async () => { throw new Error('unavailable'); });
  c.open(); await c.install();
  assert.equal(c.getSnapshot().isInstalling, false);
  assert.equal(c.getSnapshot().canPrompt, false);
  assert.match(c.getSnapshot().message, /Não foi possível/);
});
test('double clicks cannot invoke the same native event twice', async () => {
  const { controller: c, browser } = setup(); let release; let calls = 0;
  nativeEvent(browser, 'accepted', () => { calls++; return new Promise(resolve => { release = resolve; }); });
  const pending = c.install(); await c.install(); assert.equal(calls, 1); release(); await pending;
});
test('standalone and iOS home-screen mode suppress invitations', () => {
  for (const options of [{ installed: true }, { ios: true }]) {
    const { controller: c, browser } = setup(options);
    c.open(); nativeEvent(browser);
    assert.equal(c.getSnapshot().isOpen, false);
    assert.equal(c.getSnapshot().canPrompt, false);
  }
});
test('detects iPad desktop mode, Android webviews and display-mode transitions', () => {
  assert.equal(setup({ ua: 'Macintosh Safari', platform: 'MacIntel', touch: 5 }).controller.getSnapshot().isIOS, true);
  assert.equal(setup({ ua: 'Android; wv) Chrome' }).controller.getSnapshot().isEmbedded, true);
  const { controller: c, media } = setup(); c.open(); media.matches = true; media.dispatchEvent(new Event('change'));
  assert.equal(c.getSnapshot().isOpen, false);
});
test('all subscribers receive installation state; teardown removes listeners', () => {
  const { controller: c, browser } = setup(); let a = 0; let b = 0;
  c.subscribe(() => { a++; }); c.subscribe(() => { b++; });
  nativeEvent(browser); assert.equal(a, 1); assert.equal(b, 1);
  c.dispose(); browser.dispatchEvent(new Event('appinstalled')); assert.equal(a, 1);
});
test('manifest preserves identity and declares actual PNG dimensions', () => {
  const manifest = JSON.parse(readFileSync(new URL('../public/manifest.json', import.meta.url)));
  assert.equal(manifest.id, '/'); assert.equal(manifest.start_url, '/'); assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.scope, '/'); assert.equal(manifest.orientation, 'portrait-primary');
  for (const icon of manifest.icons) {
    const buffer = readFileSync(new URL(`../public${icon.src}`, import.meta.url));
    assert.equal(`${buffer.readUInt32BE(16)}x${buffer.readUInt32BE(20)}`, icon.sizes);
  }
});

test('installation precaches the versioned identity and uses a distinct maskable composition', async () => {
  const manifest = JSON.parse(readFileSync(new URL('../public/manifest.json', import.meta.url)));
  const handlers = {}; let cachedPaths; let install;
  vm.runInNewContext(readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8'), {
    self: { addEventListener: (name, fn) => { handlers[name] = fn; } },
    caches: { open: async () => ({ addAll: async paths => { cachedPaths = Array.from(paths); } }) },
  });
  handlers.install({ waitUntil: promise => { install = promise; } }); await install;
  assert.deepEqual(cachedPaths, manifest.icons.map(icon => icon.src));
  assert.ok(manifest.icons.every(icon => icon.src.endsWith('-v4.png')));
  const regular = manifest.icons.find(icon => icon.sizes === '512x512' && icon.purpose === 'any');
  const maskable = manifest.icons.find(icon => icon.purpose === 'maskable');
  assert.notDeepEqual(readFileSync(new URL(`../public${regular.src}`, import.meta.url)), readFileSync(new URL(`../public${maskable.src}`, import.meta.url)));
});

test('service worker only removes old app caches and never intercepts login, APIs or navigation', async () => {
  const handlers = {}; const deleted = []; let claimed = false; let skipped = false;
  const worker = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
  vm.runInNewContext(worker, {
    URL,
    self: { location: { origin: 'https://renovo.test' }, addEventListener: (name, fn) => { handlers[name] = fn; }, clients: { claim: async () => { claimed = true; } }, skipWaiting: () => { skipped = true; } },
    caches: { keys: async () => ['ump-cache-v8', 'ump-cache-v9', 'ump-cache-v10', 'ump-cache-v11', 'ump-cache-v12', 'ump-cache-v13', 'another-app'], delete: async key => { deleted.push(key); } },
  });
  let activated;
  handlers.activate({ waitUntil: promise => { activated = promise; } }); await activated;
  assert.deepEqual(deleted, ['ump-cache-v8', 'ump-cache-v9', 'ump-cache-v10', 'ump-cache-v11', 'ump-cache-v12']); assert.equal(claimed, true);
  handlers.message({ data: { type: 'SKIP_WAITING' } }); assert.equal(skipped, true);
  for (const [url, mode, method] of [
    ['https://renovo.test/auth','navigate','GET'],
    ['https://renovo.test/financas','navigate','GET'],
    ['https://renovo.test/auth/token','cors','GET'],
    ['https://renovo.test/rest/v1/members','cors','GET'],
    ['https://renovo.test/~oauth/callback','navigate','GET'],
    ['https://external.test/image.png','cors','GET'],
    ['https://renovo.test/submit','cors','POST'],
  ]) {
    handlers.fetch({ request: { url, mode, method }, respondWith: () => assert.fail(`Intercepted ${url}`) });
  }
});
