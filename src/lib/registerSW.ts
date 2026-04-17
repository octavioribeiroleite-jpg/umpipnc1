const SW_SCRIPT_URL = "/sw.js?v=2026-04-17-v5";
const PREVIEW_RELOAD_KEY = "__preview_sw_cleanup_reloaded__";

const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const host = window.location.hostname;
const isPreviewHost =
  host.includes("id-preview--") ||
  host.includes("lovableproject.com") ||
  (host.includes("lovable.app") && host.includes("id-preview"));

async function unregisterAndClear() {
  let hadArtifacts = Boolean(navigator.serviceWorker?.controller);

  if ("serviceWorker" in navigator) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      if (regs.length > 0) hadArtifacts = true;
      await Promise.all(regs.map((r) => r.unregister().catch(() => false)));
    } catch {
      // ignore cleanup failures
    }
  }

  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      const appKeys = keys.filter((k) => k.startsWith("ump-cache"));
      if (appKeys.length > 0) hadArtifacts = true;
      await Promise.all(appKeys.map((k) => caches.delete(k)));
    }
  } catch {
    // ignore cleanup failures
  }

  return hadArtifacts;
}

function emitUpdateAvailable() {
  window.dispatchEvent(new CustomEvent("sw-update-available"));
}

function activateWaitingWorker(reg: ServiceWorkerRegistration) {
  reg.waiting?.postMessage({ type: "SKIP_WAITING" });
}

function trackWaiting(reg: ServiceWorkerRegistration) {
  if (reg.waiting) {
    emitUpdateAvailable();
    activateWaitingWorker(reg);
  }

  reg.addEventListener("updatefound", () => {
    const installing = reg.installing;
    if (!installing) return;

    installing.addEventListener("statechange", () => {
      if (installing.state === "installed" && navigator.serviceWorker.controller) {
        emitUpdateAvailable();
        activateWaitingWorker(reg);
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
    navigator.serviceWorker
      .register(SW_SCRIPT_URL)
      .then((reg) => {
        trackWaiting(reg);
        void reg.update().catch(() => {});

        const checkForUpdates = () => {
          void reg.update().catch(() => {});
        };

        setInterval(checkForUpdates, 5 * 60 * 1000);
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
      window.location.reload();
    });
  });
}

export async function applyUpdateNow() {
  if (!("serviceWorker" in navigator)) {
    window.location.reload();
    return;
  }

  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    const reg = regs[0] ?? (await navigator.serviceWorker.getRegistration());

    if (reg?.waiting) {
      reg.waiting.postMessage({ type: "SKIP_WAITING" });
      return;
    }

    await Promise.all(regs.map((item) => item.update().catch(() => {})));
  } catch {
    // ignore
  }

  window.location.reload();
}
