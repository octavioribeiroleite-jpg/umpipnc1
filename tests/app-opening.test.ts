import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startAppOpening } from '../src/lib/app-opening.ts';

class TrackedTarget extends EventTarget {
  listeners = new Map<string, Set<EventListenerOrEventListenerObject>>();

  override addEventListener(type: string, listener: EventListenerOrEventListenerObject | null, options?: AddEventListenerOptions | boolean) {
    if (listener) {
      const entries = this.listeners.get(type) ?? new Set();
      entries.add(listener);
      this.listeners.set(type, entries);
    }
    super.addEventListener(type, listener, options);
  }

  override removeEventListener(type: string, listener: EventListenerOrEventListenerObject | null, options?: EventListenerOptions | boolean) {
    if (listener) this.listeners.get(type)?.delete(listener);
    super.removeEventListener(type, listener, options);
  }

  get listenerCount() {
    return [...this.listeners.values()].reduce((total, entries) => total + entries.size, 0);
  }
}

class ElementFixture extends TrackedTarget {
  dataset: Record<string, string> = {};
  style = { pointerEvents: '', transform: '' };
  attributes = new Map<string, string>();
  selectors = new Map<string, ElementFixture>();
  firstElementChild: ElementFixture | null = null;
  connected = true;
  inert = false;
  complete = true;
  bounds = { left: 95, top: 322, width: 200, height: 200 };
  removeCount = 0;

  querySelector(selector: string) { return this.selectors.get(selector) ?? null; }
  setAttribute(name: string, value: string) { this.attributes.set(name, value); }
  getAttribute(name: string) { return this.attributes.get(name) ?? null; }
  getBoundingClientRect() { return this.bounds; }
  remove() { this.connected = false; this.removeCount++; }
}

function fixture({ mounted = false, pending = false, imageComplete = true, reduced = false, logoPresent = true, initiallyInert = false } = {}) {
  const root = new ElementFixture();
  root.inert = initiallyInert;
  const splash = new ElementFixture();
  const logo = new ElementFixture();
  const target = new ElementFixture();
  logo.complete = imageComplete;
  target.bounds = { left: 125, top: 98, width: 140, height: 140 };
  if (logoPresent) splash.selectors.set('img[data-opening-logo]', logo);
  const media = Object.assign(new TrackedTarget(), { matches: reduced });
  const observers: ObserverFixture[] = [];
  class ObserverFixture {
    disconnected = false;
    target: ElementFixture | null = null;
    callback: () => void;
    constructor(callback: () => void) { this.callback = callback; observers.push(this); }
    observe(element: ElementFixture) { this.target = element; }
    disconnect() { this.disconnected = true; }
    notify() { if (!this.disconnected) this.callback(); }
  }
  const frames = new Map<number, FrameRequestCallback>();
  const timers = new Map<number, { callback: () => void; delay: number }>();
  let nextId = 1;
  const host = {
    MutationObserver: ObserverFixture,
    matchMedia: () => media,
    requestAnimationFrame(callback: FrameRequestCallback) { const id = nextId++; frames.set(id, callback); return id; },
    cancelAnimationFrame(id: number) { frames.delete(id); },
    setTimeout(callback: () => void, delay: number) { const id = nextId++; timers.set(id, { callback, delay }); return id; },
    clearTimeout(id: number) { timers.delete(id); },
  };
  const setDOM = (hasMounted: boolean, hasPending: boolean) => {
    root.firstElementChild = hasMounted ? new ElementFixture() : null;
    if (hasPending) root.selectors.set('[data-opening-pending="true"]', new ElementFixture());
    else root.selectors.delete('[data-opening-pending="true"]');
  };
  setDOM(mounted, pending);
  const opening = startAppOpening({
    root: root as unknown as HTMLElement,
    splash: splash as unknown as HTMLElement,
    env: host as unknown as typeof window,
  });
  return {
    root, splash, logo, target, media, observers, frames, timers, opening,
    mutate(hasMounted: boolean, hasPending = false) { setDOM(hasMounted, hasPending); observers.forEach(observer => observer.notify()); },
    flushFrame() {
      const queued = [...frames.values()];
      frames.clear();
      queued.forEach(callback => callback(0));
    },
    finishAnimation(name = 'ipnc-opening-exit', eventTarget = splash) {
      const event = new Event('animationend');
      Object.defineProperty(event, 'animationName', { value: name });
      if (eventTarget !== splash) Object.defineProperty(event, 'target', { value: eventTarget });
      splash.dispatchEvent(event);
    },
  };
}

test('keeps the visual bridge until React has mounted useful content, without any minimum hold timer', () => {
  const p = fixture();
  p.flushFrame();
  assert.equal(p.splash.connected, true);
  assert.equal(p.root.inert, true, 'hidden application controls cannot receive focus or taps');
  assert.equal(p.splash.inert, false);
  assert.equal(p.splash.style.pointerEvents, '');
  assert.equal(p.root.dataset.openingTransition, undefined);
  assert.equal(p.timers.size, 0);

  p.mutate(true);
  p.flushFrame();
  assert.equal(p.splash.style.pointerEvents, 'none');
  assert.equal(p.root.inert, false, 'entry controls are released before the fade finishes');
  assert.equal(p.splash.inert, true);
  assert.equal(p.splash.getAttribute('aria-hidden'), 'true');
  assert.equal(p.root.dataset.openingTransition, 'revealing');
  assert.equal(p.splash.connected, true, 'only the visual fade remains after the app becomes interactive');
  assert.equal(p.observers[0].disconnected, true);
  p.opening.stop();
});

test('a real loading marker holds the bridge until it is removed, including when the logo has already loaded', () => {
  const p = fixture({ mounted: true, pending: true });
  p.flushFrame();
  assert.equal(p.splash.getAttribute('aria-hidden'), null, 'the visible boot owns the announcement while React is inert');
  assert.equal(p.root.inert, true);
  assert.equal(p.splash.inert, false);
  assert.equal(p.root.dataset.openingTransition, undefined);
  assert.equal(p.timers.size, 0);

  p.mutate(true, false);
  p.flushFrame();
  assert.equal(p.splash.inert, true);
  assert.equal(p.root.inert, false);
  assert.equal(p.root.dataset.openingTransition, 'revealing');
  p.opening.stop();
});

test('completion and cancellation restore the original root interaction state', () => {
  for (const initiallyInert of [false, true]) {
    const cancelled = fixture({ initiallyInert });
    cancelled.opening.stop();
    assert.equal(cancelled.root.inert, initiallyInert);
    const ready = fixture({ mounted: true, initiallyInert });
    ready.flushFrame();
    assert.equal(ready.root.inert, initiallyInert);
    ready.finishAnimation();
    assert.equal(ready.root.inert, initiallyInert);
  }
});

test('an unloaded logo waits for load or error, while a failed logo cannot trap the ready application', () => {
  for (const outcome of ['load', 'error']) {
    const p = fixture({ mounted: true, imageComplete: false });
    p.flushFrame();
    assert.equal(p.splash.inert, false);
    assert.equal(p.timers.size, 0);
    p.logo.dispatchEvent(new Event(outcome));
    p.flushFrame();
    assert.equal(p.splash.style.pointerEvents, 'none', outcome);
    assert.equal(p.splash.inert, true, outcome);
    p.opening.stop();
  }
});

test('a logo event alone does not release an unmounted or still-pending application', () => {
  const p = fixture({ imageComplete: false });
  p.logo.dispatchEvent(new Event('load'));
  p.flushFrame();
  assert.equal(p.splash.inert, false);
  p.mutate(true, true);
  p.flushFrame();
  assert.equal(p.splash.inert, false);
  assert.equal(p.timers.size, 0);
  p.mutate(true, false);
  p.flushFrame();
  assert.equal(p.splash.inert, true);
  p.opening.stop();
});

test('moves the fading boot logo toward a visible entry logo but ignores a hidden destination', () => {
  const visible = fixture({ mounted: true });
  visible.root.selectors.set('.auth-mobile-logo', visible.target);
  visible.flushFrame();
  assert.equal(visible.logo.style.transform, 'translate(0px, -254px) scale(0.7)');
  visible.opening.stop();

  const hidden = fixture({ mounted: true });
  hidden.target.bounds.width = 0;
  hidden.target.bounds.height = 0;
  hidden.root.selectors.set('.auth-mobile-logo', hidden.target);
  hidden.flushFrame();
  assert.equal(hidden.logo.style.transform, '');
  assert.equal(hidden.splash.inert, true);
  hidden.opening.stop();
});

test('only the bridge exit animation cleans up the bridge, then removes every lifecycle listener', () => {
  const p = fixture({ mounted: true });
  p.flushFrame();
  p.finishAnimation('ipnc-opening-exit', p.logo);
  p.finishAnimation('another-animation');
  assert.equal(p.splash.connected, true);
  assert.equal(p.timers.size, 1);
  p.finishAnimation();
  assert.equal(p.splash.connected, false);
  assert.equal(p.root.dataset.openingTransition, undefined);
  assert.equal(p.timers.size, 0);
  assert.equal(p.frames.size, 0);
  assert.equal(p.logo.listenerCount, 0);
  assert.equal(p.splash.listenerCount, 0);
  assert.equal(p.media.listenerCount, 0);
  p.opening.stop();
  assert.equal(p.splash.removeCount, 1, 'cleanup is idempotent');
});

test('cleanup fallback cannot postpone interaction when a browser omits animationend', () => {
  const p = fixture({ mounted: true });
  p.flushFrame();
  assert.equal(p.splash.inert, true);
  assert.equal(p.splash.style.pointerEvents, 'none');
  assert.equal(p.root.dataset.openingTransition, 'revealing');
  assert.equal(p.timers.size, 1);
  const cleanup = [...p.timers.values()][0].callback;
  cleanup();
  assert.equal(p.splash.connected, false);
  assert.equal(p.timers.size, 0);
  assert.equal(p.root.dataset.openingTransition, undefined);
});

test('stopping before readiness cancels observation, queued work, and image listeners permanently', () => {
  const p = fixture({ imageComplete: false });
  assert.equal(p.frames.size, 1);
  p.opening.stop();
  assert.equal(p.splash.connected, false);
  assert.equal(p.observers[0].disconnected, true);
  assert.equal(p.frames.size, 0);
  assert.equal(p.timers.size, 0);
  assert.equal(p.logo.listenerCount, 0);
  assert.equal(p.media.listenerCount, 0);
  p.mutate(true);
  p.logo.dispatchEvent(new Event('load'));
  p.flushFrame();
  assert.equal(p.root.dataset.openingTransition, undefined);
  assert.equal(p.timers.size, 0);
  assert.equal(p.splash.removeCount, 1);
});

test('reduced motion removes the ready bridge immediately without animation or a cleanup timer', () => {
  const p = fixture({ mounted: true, reduced: true });
  p.flushFrame();
  assert.equal(p.splash.connected, false);
  assert.equal(p.root.dataset.openingTransition, undefined);
  assert.equal(p.splash.dataset.openingState, undefined);
  assert.equal(p.timers.size, 0);
  assert.equal(p.media.listenerCount, 0);
});

test('enabling reduced motion during the fade immediately cleans up the visual bridge', () => {
  const p = fixture({ mounted: true });
  p.flushFrame();
  assert.equal(p.splash.connected, true);
  p.media.matches = true;
  p.media.dispatchEvent(new Event('change'));
  assert.equal(p.splash.connected, false);
  assert.equal(p.timers.size, 0);
  assert.equal(p.root.dataset.openingTransition, undefined);
});

test('an absent decorative logo does not prevent the ready application from being usable', () => {
  const p = fixture({ mounted: true, logoPresent: false });
  p.flushFrame();
  assert.equal(p.splash.inert, true);
  assert.equal(p.splash.style.pointerEvents, 'none');
  p.opening.stop();
});
