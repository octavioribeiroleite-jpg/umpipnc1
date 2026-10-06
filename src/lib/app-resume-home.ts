export const APP_BACKGROUND_TIMEOUT_MS = 30 * 60 * 1000;
export const APP_LIFECYCLE_STORAGE_KEY = 'ipnc_app_lifecycle_v1';
const ACTIVE_HEARTBEAT_MS = 60 * 1000;

interface LifecycleStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface LifecycleEvents {
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
}

export interface AppResumeHomeEnvironment {
  now(): number;
  document: LifecycleEvents & { readonly visibilityState: string };
  window: LifecycleEvents;
  getStorage(): LifecycleStorage | null;
  setInterval(listener: () => void, milliseconds: number): number;
  clearInterval(id: number): void;
}

export interface AppResumeHomeEvent {
  reason: 'cold-start' | 'resume';
  elapsedMs: number;
}

interface LifecycleStamp {
  lastActiveAt: number;
  backgroundAt: number | null;
}

function isTimestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

/**
 * Navigation lifecycle only: authentication sessions and page data remain intact.
 * The heartbeat covers mobile process termination without a final lifecycle event.
 */
export function createAppResumeHomeController(
  environment: AppResumeHomeEnvironment,
  options: { onReturnHome(event: AppResumeHomeEvent): void; timeoutMs?: number },
) {
  const timeoutMs = options.timeoutMs ?? APP_BACKGROUND_TIMEOUT_MS;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new RangeError('The background timeout must be a positive duration.');
  }

  let started = false;
  let hasBeenVisible = false;
  let lastActiveAt = 0;
  let backgroundAt: number | null = null;
  let heartbeat: number | null = null;

  const readStamp = (): LifecycleStamp | null => {
    try {
      const raw = environment.getStorage()?.getItem(APP_LIFECYCLE_STORAGE_KEY);
      if (!raw) return null;
      const stamp: unknown = JSON.parse(raw);
      if (!stamp || typeof stamp !== 'object') return null;
      const value = stamp as Partial<LifecycleStamp>;
      if (!isTimestamp(value.lastActiveAt)) return null;
      if (value.backgroundAt !== null && !isTimestamp(value.backgroundAt)) return null;
      return { lastActiveAt: value.lastActiveAt, backgroundAt: value.backgroundAt };
    } catch {
      return null;
    }
  };

  const persist = () => {
    try {
      environment.getStorage()?.setItem(
        APP_LIFECYCLE_STORAGE_KEY,
        JSON.stringify({ lastActiveAt, backgroundAt } satisfies LifecycleStamp),
      );
    } catch {
      // The running page still tracks background time when browser storage fails.
    }
  };

  const markBackground = () => {
    if (!started || backgroundAt !== null) return;
    backgroundAt = environment.now();
    persist();
  };

  const markForeground = () => {
    if (!started || environment.document.visibilityState !== 'visible') return;
    const now = environment.now();
    const elapsedMs = backgroundAt === null ? 0 : Math.max(0, now - backgroundAt);
    const shouldReturnHome = backgroundAt !== null && elapsedMs >= timeoutMs;
    const reason = hasBeenVisible ? 'resume' : 'cold-start';

    // Consume the pending return before calling navigation: visibilitychange and
    // pageshow often arrive together, including after a bfcache restoration.
    backgroundAt = null;
    lastActiveAt = now;
    hasBeenVisible = true;
    persist();
    if (shouldReturnHome) options.onReturnHome({ reason, elapsedMs });
  };

  const visibilityChanged = () => {
    if (environment.document.visibilityState === 'visible') markForeground();
    else markBackground();
  };

  const activeHeartbeat = () => {
    if (!started || backgroundAt !== null || environment.document.visibilityState !== 'visible') return;
    lastActiveAt = environment.now();
    persist();
  };

  return {
    start() {
      if (started) return;
      started = true;
      hasBeenVisible = false;
      const now = environment.now();
      const saved = readStamp();
      lastActiveAt = saved?.lastActiveAt ?? now;
      // A recorded background start is more precise than the active heartbeat.
      const reference = saved?.backgroundAt ?? saved?.lastActiveAt;
      backgroundAt = reference === undefined ? null : Math.min(reference, now);

      environment.document.addEventListener('visibilitychange', visibilityChanged);
      environment.window.addEventListener('pagehide', markBackground);
      environment.window.addEventListener('pageshow', markForeground);
      heartbeat = environment.setInterval(activeHeartbeat, ACTIVE_HEARTBEAT_MS);

      if (environment.document.visibilityState === 'visible') markForeground();
      else {
        // A background launch must not overwrite an older absence with "active".
        backgroundAt ??= now;
        persist();
      }
    },
    stop() {
      if (!started) return;
      started = false;
      environment.document.removeEventListener('visibilitychange', visibilityChanged);
      environment.window.removeEventListener('pagehide', markBackground);
      environment.window.removeEventListener('pageshow', markForeground);
      if (heartbeat !== null) environment.clearInterval(heartbeat);
      heartbeat = null;
    },
  };
}
