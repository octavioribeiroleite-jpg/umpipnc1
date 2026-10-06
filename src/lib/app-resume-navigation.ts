import { APP_HOME_PATH, hasDirectEntryIntent } from './app-home';
import { APP_LIFECYCLE_STORAGE_KEY, createAppResumeHomeController } from './app-resume-home';
import { isInstalledDisplayMode } from './pwa-display';

export function startAppResumeHome(browser: Window, device: Navigator) {
  let mounted = false;
  const installed = isInstalledDisplayMode({ matchMedia: browser.matchMedia.bind(browser), navigator: device as Navigator & { standalone?: boolean } });
  // The first launch of this version has no lifecycle stamp from older releases.
  // An installed app starts at the public entry while direct links keep their intent.
  if (installed && !hasDirectEntryIntent(browser.location)) {
    try {
      if (!browser.localStorage.getItem(APP_LIFECYCLE_STORAGE_KEY)) {
        browser.history.replaceState(browser.history.state, '', APP_HOME_PATH);
      }
    } catch { /* Live background tracking still works without storage. */ }
  }
  const controller = createAppResumeHomeController({
    now: () => Date.now(),
    document: browser.document,
    window: browser,
    getStorage: () => {
      return installed ? browser.localStorage : browser.sessionStorage;
    },
    setInterval: (callback, interval) => browser.setInterval(callback, interval),
    clearInterval: id => browser.clearInterval(id),
  }, {
    onReturnHome: ({ reason }) => {
      if (reason === 'cold-start' && hasDirectEntryIntent(browser.location)) return;
      // On boot, change the route before private screens mount. A suspended live
      // app gets a fresh public entry, including when it was already on a PIN step.
      if (!mounted) browser.history.replaceState(browser.history.state, '', APP_HOME_PATH);
      else browser.location.replace(APP_HOME_PATH);
    },
  });
  controller.start();
  return { markMounted: () => { mounted = true; }, stop: controller.stop };
}
