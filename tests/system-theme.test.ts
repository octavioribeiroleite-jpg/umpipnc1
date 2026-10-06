import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { startSystemTheme, SYSTEM_THEME_COLORS, SYSTEM_THEME_QUERY } from '../src/lib/system-theme.ts';

function device(dark = false, legacy = false) {
  const classes = new Set<string>();
  const properties = new Map<string, string>();
  const root = {
    classList: {
      contains: (name: string) => classes.has(name),
      toggle: (name: string, active: boolean) => active ? classes.add(name) : classes.delete(name),
    },
    dataset: {} as Record<string, string>,
    style: { colorScheme: '', setProperty: (name: string, value: string) => properties.set(name, value) },
  };
  const meta = { content: SYSTEM_THEME_COLORS.light as string };
  const doc = Object.assign(new EventTarget(), {
    documentElement: root, visibilityState: 'visible', querySelector: () => meta,
  });
  const events = new EventTarget();
  const media = {
    matches: dark,
    addEventListener: legacy ? undefined : events.addEventListener.bind(events),
    removeEventListener: legacy ? undefined : events.removeEventListener.bind(events),
    addListener: (fn: EventListener) => events.addEventListener('change', fn),
    removeListener: (fn: EventListener) => events.removeEventListener('change', fn),
  };
  const win = Object.assign(new EventTarget(), {
    matchMedia: (query: string) => { assert.equal(query, SYSTEM_THEME_QUERY); return media; },
  });
  Object.defineProperty(win, 'localStorage', { get: () => { throw new Error('Theme must not access session/preference storage'); } });
  return {
    root, meta, media, properties, doc,
    win: win as unknown as Window, document: doc as unknown as Document,
    change: (value: boolean) => { media.matches = value; events.dispatchEvent(new Event('change')); },
  };
}

test('device theme applies at cold launch and changes live without storage or reload', () => {
  const fake = device(true);
  const stop = startSystemTheme(fake.win, fake.document);
  assert.equal(fake.root.dataset.ipncTheme, 'dark');
  assert.equal(fake.root.style.colorScheme, 'dark');
  assert.equal(fake.meta.content, SYSTEM_THEME_COLORS.dark);
  assert.equal(fake.properties.get('--app-edge-background'), SYSTEM_THEME_COLORS.dark);
  fake.change(false);
  assert.equal(fake.root.classList.contains('dark'), false);
  assert.equal(fake.root.dataset.ipncTheme, 'light');
  assert.equal(fake.root.style.colorScheme, 'light');
  assert.equal(fake.meta.content, SYSTEM_THEME_COLORS.light);
  stop();
  fake.change(true);
  assert.equal(fake.root.dataset.ipncTheme, 'light', 'Unmounted listeners must not mutate the page');
});

test('resuming rechecks a changed system preference but preserves current header chrome otherwise', () => {
  const fake = device(false);
  const stop = startSystemTheme(fake.win, fake.document);
  fake.meta.content = '#123b2e';
  fake.doc.dispatchEvent(new Event('visibilitychange'));
  assert.equal(fake.meta.content, '#123b2e');
  fake.doc.visibilityState = 'hidden';
  fake.media.matches = true;
  fake.doc.dispatchEvent(new Event('visibilitychange'));
  assert.equal(fake.root.dataset.ipncTheme, 'light');
  fake.doc.visibilityState = 'visible';
  fake.doc.dispatchEvent(new Event('visibilitychange'));
  assert.equal(fake.root.dataset.ipncTheme, 'dark');
  fake.media.matches = false;
  fake.win.dispatchEvent(new Event('pageshow'));
  assert.equal(fake.root.dataset.ipncTheme, 'light');
  stop();
});

test('older mobile media listeners and unavailable media support both work safely', () => {
  const fake = device(false, true);
  const stop = startSystemTheme(fake.win, fake.document);
  fake.change(true);
  assert.equal(fake.root.classList.contains('dark'), true);
  stop();
  fake.change(false);
  assert.equal(fake.root.classList.contains('dark'), true);
  const unsupported = device(true);
  Object.defineProperty(unsupported.win, 'matchMedia', { value: undefined });
  const stopUnsupported = startSystemTheme(unsupported.win, unsupported.document);
  assert.equal(unsupported.root.dataset.ipncTheme, 'light');
  stopUnsupported();
});

test('actual HTML bootstrap selects the device theme before loading the opening stylesheet', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const boot = html.match(/<script id="ipnc-system-theme-boot">([\s\S]*?)<\/script>/)?.[1];
  assert.ok(boot);
  assert.ok(html.indexOf('ipnc-system-theme-boot') < html.indexOf('/src/opening.css'));
  for (const dark of [false, true]) {
    const fake = device(dark);
    vm.runInNewContext(boot, { document: fake.doc, matchMedia: fake.win.matchMedia });
    assert.equal(fake.root.dataset.ipncTheme, dark ? 'dark' : 'light');
    assert.equal(fake.meta.content, SYSTEM_THEME_COLORS[dark ? 'dark' : 'light']);
    const stop = startSystemTheme(fake.win, fake.document);
    fake.change(!dark);
    assert.equal(fake.root.dataset.ipncTheme, dark ? 'light' : 'dark');
    stop();
  }
});
