import { APP_HOME_PATH, hasDirectEntryIntent } from './app-home';
import { createAppResumeHomeController } from './app-resume-home';
import { isInstalledDisplayMode } from './pwa-display';

interface AppLaunchParams {
  targetURL?: string;
  files?: readonly unknown[];
}

type LaunchWindow = Window & {
  launchQueue?: { setConsumer(consumer: (params: AppLaunchParams) => void): void };
};

/** Only navigation changes here; saved identities, credentials and data stay intact. */
export function startAppResumeHome(browser: Window, device: Navigator) {
  let mounted = false;
  let stopped = false;
  let navigationPending = false;
  let startupLaunch = true;
  let filePickerPending = false;
  let pickerCleanup: number | null = null;
  const installed = isInstalledDisplayMode({ matchMedia: browser.matchMedia.bind(browser), navigator: device as Navigator & { standalone?: boolean } });

  const returnHome = () => {
    if (stopped || navigationPending) return;
    // Boot replaces the route before private screens mount. A retained process
    // reloads the entry so a PIN/name/dialog at the same URL is reset as well.
    if (!mounted) browser.history.replaceState(null, '', APP_HOME_PATH);
    else {
      navigationPending = true;
      browser.location.replace(APP_HOME_PATH);
    }
  };

  // Every installed document starts at home, even when a recent stamp, restored
  // session or service-worker update has restored a private URL. Deliberately
  // opened recovery and public-election links still keep their destination.
  if (installed && !hasDirectEntryIntent(browser.location)) returnHome();

  const isFileInput = (event: Event) => {
    const target = event.target as HTMLInputElement | null;
    return target?.tagName === 'INPUT' && target.type === 'file' && !target.disabled;
  };
  const pickerClicked = (event: Event) => { filePickerPending = isFileInput(event); };
  const pickerFinished = (event: Event) => {
    if (isFileInput(event)) filePickerPending = false;
  };
  const clearPickerAfterForeground = () => {
    if (browser.document.visibilityState !== 'visible' || !filePickerPending) return;
    if (pickerCleanup !== null) browser.clearTimeout(pickerCleanup);
    // Focus/visibility may precede change or cancel. The controller has already
    // latched the protected background cycle, so clearing this flag is safe.
    pickerCleanup = browser.setTimeout(() => {
      filePickerPending = false;
      pickerCleanup = null;
    }, 0);
  };
  const visibilityChanged = () => {
    if (browser.document.visibilityState !== 'visible') startupLaunch = false;
    else clearPickerAfterForeground();
  };
  const pageHidden = () => { startupLaunch = false; };

  if (installed) {
    browser.document.addEventListener('click', pickerClicked, true);
    browser.document.addEventListener('change', pickerFinished, true);
    browser.document.addEventListener('cancel', pickerFinished, true);
    browser.document.addEventListener('visibilitychange', visibilityChanged);
    browser.addEventListener('focus', clearPickerAfterForeground);
    browser.addEventListener('pagehide', pageHidden);
    (browser as LaunchWindow).launchQueue?.setConsumer(params => {
      if (stopped || params.files?.length) return;
      if (params.targetURL) {
        try {
          const target = new URL(params.targetURL, browser.location.href);
          if (target.origin !== browser.location.origin || hasDirectEntryIntent(target)) return;
        } catch { return; }
      }
      // Initial launch delivery can arrive after the user already navigated.
      // Boot has handled it; only subsequent launches reset an active document.
      if (startupLaunch) {
        startupLaunch = false;
        return;
      }
      returnHome();
    });
  }
  const controller = createAppResumeHomeController({
    now: () => Date.now(),
    document: browser.document,
    window: browser,
    getStorage: () => installed ? browser.localStorage : browser.sessionStorage,
    setInterval: (callback, interval) => browser.setInterval(callback, interval),
    clearInterval: id => browser.clearInterval(id),
  }, {
    // Hidden/visible is the only portable retained-process signal on iOS. Treat
    // it as reopening for installed apps, with the native-picker exception above.
    // Browser tabs keep their existing 30-minute navigation continuity policy.
    timeoutMs: installed ? 0 : undefined,
    shouldPreserveBackground: () => installed && filePickerPending,
    onReturnHome: ({ reason }) => {
      if (reason === 'cold-start' && (installed || hasDirectEntryIntent(browser.location))) return;
      returnHome();
    },
  });
  controller.start();
  return {
    markMounted: () => { mounted = true; },
    stop() {
      stopped = true;
      controller.stop();
      if (pickerCleanup !== null) browser.clearTimeout(pickerCleanup);
      if (!installed) return;
      browser.document.removeEventListener('click', pickerClicked, true);
      browser.document.removeEventListener('change', pickerFinished, true);
      browser.document.removeEventListener('cancel', pickerFinished, true);
      browser.document.removeEventListener('visibilitychange', visibilityChanged);
      browser.removeEventListener('focus', clearPickerAfterForeground);
      browser.removeEventListener('pagehide', pageHidden);
    },
  };
}
