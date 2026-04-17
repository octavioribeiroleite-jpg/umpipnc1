// Service worker registration with environment guards and update detection.
// - Skips registration in iframe (Lovable editor) and preview hosts
// - Cleans up old SW + ump-cache* caches in those contexts
// - In production: detects waiting SW and notifies via custom event 'sw-update-available'

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
  host.includes("lovable.app") && host.includes("id-preview");

async function unregisterAndClear() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister().catch(() => false)));
  } catch {}
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k.startsWith("ump-cache")).map((k) => caches.delete(k))
      );
    }
  } catch {}
}

function emitUpdateAvailable() {
  window.dispatchEvent(new CustomEvent("sw-update-available"));
}

function trackWaiting(reg: ServiceWorkerRegistration) {
  if (reg.waiting) {
    emitUpdateAvailable();
  }
  reg.addEventListener("updatefound", () => {
    const installing = reg.installing;
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

  // In preview/iframe: never register, and clean any leftovers
  if (isInIframe || isPreviewHost) {
    unregisterAndClear();
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        trackWaiting(reg);
        // Periodic update check (every 30 min)
        setInterval(() => reg.update().catch(() => {}), 30 * 60 * 1000);
      })
      .catch(() => {});

    // Reload when the new SW takes control (after user clicks Update)
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
  const reg = await navigator.serviceWorker.getRegistration();
  if (reg?.waiting) {
    reg.waiting.postMessage({ type: "SKIP_WAITING" });
    // controllerchange listener above will reload
    return;
  }
  // Fallback: hard reload
  window.location.reload();
}
