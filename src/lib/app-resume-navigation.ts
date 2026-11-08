import { hasDirectEntryIntent } from './app-home';

interface AppLaunchParams {
  targetURL?: string;
  files?: readonly unknown[];
}

type LaunchWindow = Window & {
  launchQueue?: { setConsumer(consumer: (params: AppLaunchParams) => void): void };
};

/** Retain the active room and login across background, freeze and app launches.
 * Authentication and expired/revoked sessions remain enforced by AuthProvider.
 * Only an explicit public voting/recovery link may replace the current route.
 */
export function startAppResumeHome(browser: Window, _device: Navigator) {
  let mounted = false;
  let stopped = false;
  (browser as LaunchWindow).launchQueue?.setConsumer(params => {
    if (stopped || !mounted || params.files?.length || !params.targetURL) return;
    try {
      const target = new URL(params.targetURL, browser.location.href);
      if (target.origin !== browser.location.origin || !hasDirectEntryIntent(target)) return;
      if (target.href !== browser.location.href) browser.location.assign(target.href);
    } catch { /* Invalid launch URLs do not disturb an active election. */ }
  });
  return {
    markMounted: () => { mounted = true; },
    stop: () => { stopped = true; },
  };
}
