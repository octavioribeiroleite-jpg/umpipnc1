import { startAppResumeHome } from '../../../src/lib/app-resume-navigation';
import { APP_LIFECYCLE_STORAGE_KEY } from '../../../src/lib/app-resume-home';

// Installation is explicitly simulated. Visibility and file-input interactions
// still come from the real browser; this does not claim mobile OS coverage.
const original = new URL(location.href);
const installed = original.searchParams.get('launch-mode') !== 'browser';
const prefix = '/__diretoria';
const namespace = `ipnc_fixture_launch_${installed ? 'installed' : 'browser'}:`;
const parameters = new URLSearchParams(original.search);
parameters.delete('stamp');
const events: string[] = [];
const fixtureUrl = (destination: string) => {
  const url = new URL(destination, location.origin);
  url.pathname = `${prefix}${url.pathname}`;
  for (const [key, value] of parameters) if (!url.searchParams.has(key)) url.searchParams.set(key, value);
  return `${url.pathname}${url.search}${url.hash}`;
};
const storage = (native: Storage) => ({
  getItem: (key: string) => native.getItem(namespace + key),
  setItem: (key: string, value: string) => native.setItem(namespace + key, value),
});
const local = storage(localStorage), session = storage(sessionStorage);
const stamp = original.searchParams.get('stamp');
if (stamp === 'recent' || stamp === 'expired') {
  const at = Date.now() - (stamp === 'expired' ? 31 * 60_000 : 1_000);
  (installed ? local : session).setItem(APP_LIFECYCLE_STORAGE_KEY, JSON.stringify({ lastActiveAt: at, backgroundAt: at }));
}
if (stamp === 'none') (installed ? localStorage : sessionStorage).removeItem(namespace + APP_LIFECYCLE_STORAGE_KEY);

let output: HTMLElement | null = null;
let simulatedVisibility: 'visible' | 'hidden' | null = null;
const report = (event: string) => {
  events.push(event);
  if (output) output.textContent = events.slice(-8).join(' · ');
};
const browser = {
  document: new Proxy(document, {
    get(target, key) {
      if (key === 'visibilityState') return simulatedVisibility ?? target.visibilityState;
      const value = Reflect.get(target, key, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  }),
  get location() {
    return {
      get href() { return location.href; },
      get origin() { return location.origin; },
      get pathname() { return location.pathname.slice(prefix.length) || '/'; },
      get search() { return location.search; },
      get hash() { return location.hash; },
      replace(destination: string) { report(`return:${destination}`); location.replace(fixtureUrl(destination)); },
    };
  },
  history: {
    get state() { return history.state; },
    replaceState(state: unknown, title: string, destination: string) {
      report(`boot:${destination}`);
      history.replaceState(state, title, fixtureUrl(destination));
    },
  },
  localStorage: local,
  sessionStorage: session,
  matchMedia: window.matchMedia.bind(window),
  addEventListener: window.addEventListener.bind(window),
  removeEventListener: window.removeEventListener.bind(window),
  setInterval: window.setInterval.bind(window),
  clearInterval: window.clearInterval.bind(window),
  setTimeout: window.setTimeout.bind(window),
  clearTimeout: window.clearTimeout.bind(window),
} as unknown as Window;
const controller = startAppResumeHome(browser, (installed ? { standalone: true } : { standalone: false }) as Navigator);
if (import.meta.hot) import.meta.hot.dispose(() => controller.stop());
document.addEventListener('visibilitychange', () => report(`visibility:${document.visibilityState}`));
window.addEventListener('pageshow', event => report(`pageshow:${event.persisted}`));

// The existing fixture blocks real network transport before evaluating the app
// and supplies only synthetic profiles, roles, PINs and in-memory records.
await import('../diretoria/bootstrap');
controller.markMounted();

const controls = document.createElement('details');
controls.id = 'launch-fixture-controls';
controls.style.cssText = 'position:fixed;right:8px;top:8px;z-index:1100;max-width:calc(100vw - 16px);padding:8px;border:1px solid #9e7d27;background:#fff4cf;color:#423311;border-radius:8px;font-size:12px';
const summary = document.createElement('summary');
summary.textContent = installed ? 'TESTE LOCAL · PWA simulada' : 'TESTE LOCAL · navegador';
controls.append(summary);
output = document.createElement('p');
output.id = 'launch-fixture-events';
output.textContent = events.join(' · ');
controls.append(output);
for (const [text, visibility] of [['Simular background', 'hidden'], ['Simular retomada', 'visible']] as const) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = text;
  button.style.cssText = 'display:block;min-height:44px;padding:8px;margin:4px 0;border:1px solid currentColor;border-radius:4px';
  button.addEventListener('click', () => {
    simulatedVisibility = visibility;
    report(`SIMULATED:${visibility}`);
    document.dispatchEvent(new Event('visibilitychange'));
  });
  controls.append(button);
}
const label = document.createElement('label');
label.textContent = 'Arquivo de teste local (não enviado) ';
const file = document.createElement('input');
file.type = 'file';
file.id = 'launch-fixture-file';
file.addEventListener('change', () => report('file:change'));
file.addEventListener('cancel', () => report('file:cancel'));
label.append(file);
controls.append(label);
document.body.append(controls);
