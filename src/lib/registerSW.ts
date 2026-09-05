const SW_SCRIPT_URL = "/sw.js?v=2026-06-22-v7";
const CURRENT_CACHE = "ump-cache-v7";
const PREVIEW_RELOAD_KEY = "__preview_sw_cleanup_reloaded__";
const ROUTE_RESTORE_KEY = "__sw_restore_path__";

function currentRoute() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function rememberCurrentRoute() {
  try {
    sessionStorage.setItem(ROUTE_RESTORE_KEY, currentRoute());
  } catch {
    // ignore storage failures
  }
}

function restoreRouteIfNeeded() {
  try {
    const savedRoute = sessionStorage.getItem(ROUTE_RESTORE_KEY);
    sessionStorage.removeItem(ROUTE_RESTORE_KEY);

    if (savedRoute && savedRoute !== "/" && window.location.pathname === "/") {
      window.history.replaceState(window.history.state, "", savedRoute);
    }
  } catch {
    // ignore storage failures
  }
}

restoreRouteIfNeeded();

async function purgeOldCaches() {
  try {
    if (!("caches" in window)) return;
    const keys = await caches.keys();
    const old = keys.filter((key) => key.startsWith("ump-cache") && key !== CURRENT_CACHE);
    await Promise.all(old.map((key) => caches.delete(key).catch(() => false)));
  } catch {
    // ignore
  }
}

const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const host = window.location.hostname;
const isPreviewHost =
  host === "localhost" ||
  host === "127.0.0.1" ||
  host === "::1";

async function unregisterAndClear() {
  let hadArtifacts = Boolean(navigator.serviceWorker?.controller);

  if ("serviceWorker" in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      if (registrations.length > 0) hadArtifacts = true;
      await Promise.all(registrations.map((registration) => registration.unregister().catch(() => false)));
    } catch {
      // ignore cleanup failures
    }
  }

  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      const appKeys = keys.filter((key) => key.startsWith("ump-cache"));
      if (appKeys.length > 0) hadArtifacts = true;
      await Promise.all(appKeys.map((key) => caches.delete(key)));
    }
  } catch {
    // ignore cleanup failures
  }

  return hadArtifacts;
}

function emitUpdateAvailable() {
  window.dispatchEvent(new CustomEvent("sw-update-available"));
}

function trackWaiting(registration: ServiceWorkerRegistration) {
  if (registration.waiting) {
    emitUpdateAvailable();
  }

  registration.addEventListener("updatefound", () => {
    const installing = registration.installing;
    if (!installing) return;

    installing.addEventListener("statechange", () => {
      if (installing.state === "installed" && navigator.serviceWorker.controller) {
        emitUpdateAvailable();
      }
    });
  });
}

export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  if (isInIframe || isPreviewHost) {
    void unregisterAndClear().then((hadArtifacts) => {
      if (hadArtifacts && !sessionStorage.getItem(PREVIEW_RELOAD_KEY)) {
        sessionStorage.setItem(PREVIEW_RELOAD_KEY, "1");
        rememberCurrentRoute();
        window.location.reload();
        return;
      }

      if (!hadArtifacts) {
        sessionStorage.removeItem(PREVIEW_RELOAD_KEY);
      }
    });
    return;
  }

  window.addEventListener("load", () => {
    void purgeOldCaches();

    navigator.serviceWorker
      .register(SW_SCRIPT_URL)
      .then((registration) => {
        trackWaiting(registration);
        void registration.update().catch(() => {});

        const checkForUpdates = () => {
          void registration.update().catch(() => {});
        };

        window.setInterval(checkForUpdates, 5 * 60 * 1000);
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") {
            checkForUpdates();
          }
        });
      })
      .catch(() => {});

    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      rememberCurrentRoute();
      window.location.reload();
    });
  });
}

export async function applyUpdateNow() {
  rememberCurrentRoute();

  if (!("serviceWorker" in navigator)) {
    window.location.reload();
    return;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    const registration = registrations[0] ?? (await navigator.serviceWorker.getRegistration());

    if (registration?.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
      return;
    }

    await Promise.all(registrations.map((item) => item.update().catch(() => {})));
  } catch {
    // ignore
  }

  window.location.reload();
}

export async function silentUpdateCheck() {
  try {
    await purgeOldCaches();
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.update().catch(() => {})));
    }
  } catch {
    // ignore
  }
}
