/** Keep native Back on the PIN's own URL until its public return action runs.
 * No history traversal is scheduled during cleanup: it could run after Home.
 */
export function createPinBackGuard(browser: Pick<Window, 'history' | 'location' | 'addEventListener' | 'removeEventListener'>, callbacks: {
  onBack(): void | boolean;
  isBusy(): boolean;
}, options: { reuseCurrentEntry?: boolean } = {}) {
  const id = crypto.randomUUID();
  const url = browser.location.href;
  const state = { ...browser.history.state };
  delete state.ipncPinBack;
  let active = false;
  const arm = () => browser.history.pushState({ ...state, ipncPinBack: id }, '', url);
  const stop = () => {
    if (!active) return;
    active = false;
    browser.removeEventListener('popstate', pop, true);
    if (browser.history.state?.ipncPinBack === id) {
      const current = { ...browser.history.state };
      delete current.ipncPinBack;
      browser.history.replaceState(current, '', browser.location.href);
    }
  };
  const back = () => {
    if (!active || callbacks.isBusy()) return;
    // A request ref can turn busy before React renders its loading prop.
    // Keep the guard when the page rejects cancellation in that interval.
    if (callbacks.onBack() !== false) stop();
  };
  const pop = (event: PopStateEvent) => {
    if (!active) return;
    // Run before the router and the private EBD trail. Neither may process a
    // cancelled PIN as a navigation into a previously authenticated screen.
    event.stopImmediatePropagation();
    arm();
    back();
  };
  return {
    start() {
      if (active) return;
      active = true;
      // Renewal already has the EBD floor behind it. Mark that entry in place
      // so successful renewal keeps both Back and an existing Forward trail.
      if (options.reuseCurrentEntry) browser.history.replaceState({ ...state, ipncPinBack: id }, '', url);
      else arm();
      browser.addEventListener('popstate', pop, true);
    },
    back,
    stop,
  };
}
