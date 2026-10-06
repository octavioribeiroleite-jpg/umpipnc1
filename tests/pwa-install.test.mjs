import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';

const source = readFileSync(new URL('../src/lib/pwaInstall.ts', import.meta.url), 'utf8');
const factorySource = source.slice(0, source.indexOf('// Capture events'));
const js = ts.transpileModule(factorySource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const displaySource = readFileSync(new URL('../src/lib/pwa-display.ts', import.meta.url), 'utf8');
const displayJS = ts.transpileModule(displaySource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const displayModule = { exports: {} };
vm.runInNewContext(displayJS, { exports: displayModule.exports });
const module = { exports: {} };
vm.runInNewContext(js, {
  exports: module.exports,
  require: name => {
    assert.equal(name, './pwa-display');
    return displayModule.exports;
  },
});
const { createPWAInstallController } = module.exports;
function setup({ installed = false, mode = 'browser', ios = false, ua = 'Android Chrome/144', platform = '', touch = 0 } = {}) {
  const browser = new EventTarget();
  const displayModes = new Map();
  browser.matchMedia = query => {
    if (!displayModes.has(query)) {
      const media = new EventTarget();
      media.matches = query === `(display-mode: ${mode})` || (installed && query === '(display-mode: standalone)');
      displayModes.set(query, media);
    }
    return displayModes.get(query);
  };
  const media = browser.matchMedia('(display-mode: standalone)');
  const controller = createPWAInstallController(browser, { userAgent: ua, platform, maxTouchPoints: touch, standalone: ios });
  return { browser, media, displayModes, controller };
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
test('fullscreen and minimal-ui installed launches suppress every installation entry point', async () => {
  for (const mode of ['fullscreen', 'minimal-ui']) {
    const { controller: c, browser } = setup({ mode });
    assert.equal(c.getSnapshot().isInstalled, true);
    c.open();
    nativeEvent(browser);
    await c.install();
    assert.equal(c.getSnapshot().isOpen, false);
    assert.equal(c.getSnapshot().canPrompt, false);
    assert.equal(c.getSnapshot().isInstalling, false);
    c.dispose();
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
test('every installed display-mode transition closes invitations and teardown removes each mode listener', () => {
  for (const mode of ['fullscreen', 'standalone', 'minimal-ui']) {
    const query = `(display-mode: ${mode})`;
    const { controller: c, browser, displayModes } = setup();
    nativeEvent(browser);
    c.open();
    const media = displayModes.get(query);
    assert.ok(media, `The controller must observe ${query}`);
    media.matches = true;
    media.dispatchEvent(new Event('change'));
    assert.equal(c.getSnapshot().isInstalled, true);
    assert.equal(c.getSnapshot().isOpen, false);
    assert.equal(c.getSnapshot().canPrompt, false);
    c.dispose();

    const inactive = setup();
    inactive.controller.dispose();
    const detachedMedia = inactive.displayModes.get(query);
    detachedMedia.matches = true;
    detachedMedia.dispatchEvent(new Event('change'));
    assert.equal(inactive.controller.getSnapshot().isInstalled, false, `${query} must stop changing state after disposal`);
  }
});
test('manifest preserves identity and declares actual PNG dimensions', () => {
  const manifest = JSON.parse(readFileSync(new URL('../public/manifest.json', import.meta.url)));
  assert.equal(manifest.id, '/'); assert.equal(manifest.start_url, '/'); assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.scope, '/'); assert.equal(manifest.orientation, 'portrait-primary');
  assert.deepEqual(manifest.display_override, ['fullscreen', 'standalone']);
  assert.equal(manifest.theme_color, '#f7fbf8');
  assert.equal(manifest.background_color, manifest.theme_color);
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
  assert.ok(manifest.icons.every(icon => icon.src.endsWith('-v5.png')));
  const regular = manifest.icons.find(icon => icon.sizes === '512x512' && icon.purpose === 'any');
  const maskable = manifest.icons.find(icon => icon.purpose === 'maskable');
  assert.notDeepEqual(readFileSync(new URL(`../public${regular.src}`, import.meta.url)), readFileSync(new URL(`../public${maskable.src}`, import.meta.url)));
});

test('HTML has one covering viewport, a matching system theme and the versioned Apple icon', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const manifest = JSON.parse(readFileSync(new URL('../public/manifest.json', import.meta.url)));
  assert.equal((html.match(/name="viewport"/g) || []).length, 1);
  assert.match(html, /name="viewport"[^>]*viewport-fit=cover/);
  assert.equal((html.match(/name="theme-color"/g) || []).length, 1);
  assert.ok(html.includes(`name="theme-color" content="${manifest.theme_color}"`));
  assert.match(html, /apple-mobile-web-app-status-bar-style" content="black-translucent"/);
  assert.match(html, /rel="manifest" href="\/manifest\.json\?v=ipnc-mobile-v5"/);
  assert.match(html, /rel="apple-touch-icon" sizes="180x180" href="\/icons\/apple-touch-icon-v5\.png"/);
  const apple = readFileSync(new URL('../public/icons/apple-touch-icon-v5.png', import.meta.url));
  assert.equal(`${apple.readUInt32BE(16)}x${apple.readUInt32BE(20)}`, '180x180');
  for (const icon of manifest.icons.filter(icon => icon.purpose === 'any')) {
    const png = readFileSync(new URL(`../public${icon.src}`, import.meta.url));
    assert.equal(png[25], 6, 'Ordinary installation icons must preserve RGBA transparency for the splash');
  }
});

test('service worker only removes old app caches and never intercepts login, APIs or navigation', async () => {
  const handlers = {}; const deleted = []; let claimed = false; let skipped = false;
  const worker = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
  vm.runInNewContext(worker, {
    URL,
    self: { location: { origin: 'https://renovo.test' }, addEventListener: (name, fn) => { handlers[name] = fn; }, clients: { claim: async () => { claimed = true; } }, skipWaiting: () => { skipped = true; } },
    caches: { keys: async () => ['ump-cache-v8', 'ump-cache-v9', 'ump-cache-v10', 'ump-cache-v11', 'ump-cache-v12', 'ump-cache-v13', 'ump-cache-v14', 'ump-cache-v15', 'ump-cache-v16', 'ump-cache-v17', 'ump-cache-v18', 'ump-cache-v19', 'another-app'], delete: async key => { deleted.push(key); } },
  });
  let activated;
  handlers.activate({ waitUntil: promise => { activated = promise; } }); await activated;
  assert.deepEqual(deleted, ['ump-cache-v8', 'ump-cache-v9', 'ump-cache-v10', 'ump-cache-v11', 'ump-cache-v12', 'ump-cache-v13', 'ump-cache-v14', 'ump-cache-v15', 'ump-cache-v16', 'ump-cache-v17', 'ump-cache-v18']); assert.equal(claimed, true);
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
