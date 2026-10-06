/** A visual bridge from the HTML boot screen to the first usable React paint.
 * Route guards own readiness; this controller never changes sessions or routes.
 */
export function startAppOpening({ root, splash, env = window }: {
  root: HTMLElement;
  splash: HTMLElement;
  env?: typeof window;
}) {
  const logo = splash.querySelector<HTMLImageElement>('img[data-opening-logo]');
  const originalInert = root.inert;
  // Controls underneath the opaque bridge must not receive hidden taps or focus.
  root.inert = true;
  let imageReady = !logo || logo.complete;
  let frame = 0;
  let cleanupTimer = 0;
  let released = false;
  let stopped = false;
  const reducedMotion = env.matchMedia('(prefers-reduced-motion: reduce)');

  function stop() {
    if (stopped) return;
    stopped = true;
    observer.disconnect();
    env.cancelAnimationFrame(frame);
    env.clearTimeout(cleanupTimer);
    logo?.removeEventListener('load', imageFinished);
    logo?.removeEventListener('error', imageFinished);
    splash.removeEventListener('animationend', animationFinished);
    reducedMotion.removeEventListener('change', motionChanged);
    delete root.dataset.openingTransition;
    root.inert = originalInert;
    splash.remove();
  }
  function animationFinished(event: AnimationEvent) {
    if (event.target === splash && event.animationName === 'ipnc-opening-exit') stop();
  }
  function motionChanged() {
    if (released && reducedMotion.matches) stop();
  }
  function imageFinished() { imageReady = true; schedule(); }
  function inspect() {
    frame = 0;
    if (stopped || released || !root.firstElementChild) return;
    if (!imageReady || root.querySelector('[data-opening-pending="true"]')) return;
    released = true;
    observer.disconnect();
    root.inert = originalInert;
    splash.inert = true;
    splash.setAttribute('aria-hidden', 'true');
    splash.style.pointerEvents = 'none';
    if (reducedMotion.matches) { stop(); return; }
    // Finish entrance scaling before measuring the independent logo movement.
    splash.dataset.openingState = 'leaving';

    // Move the existing logo toward the mobile entry logo while fading out.
    const target = root.querySelector<HTMLImageElement>('.auth-mobile-logo');
    if (logo && target) {
      const from = logo.getBoundingClientRect();
      const to = target.getBoundingClientRect();
      if (from.width > 0 && to.width > 0 && to.height > 0) {
        const x = to.left + to.width / 2 - from.left - from.width / 2;
        const y = to.top + to.height / 2 - from.top - from.height / 2;
        logo.style.transform = `translate(${x}px, ${y}px) scale(${to.width / from.width})`;
      }
    }
    root.dataset.openingTransition = 'revealing';
    // Cleanup only: the app is interactive immediately, with no minimum hold.
    cleanupTimer = env.setTimeout(stop, 450);
  }
  function schedule() {
    if (!frame && !stopped && !released) frame = env.requestAnimationFrame(inspect);
  }
  const observer = new env.MutationObserver(schedule);
  observer.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-opening-pending'] });
  logo?.addEventListener('load', imageFinished);
  logo?.addEventListener('error', imageFinished);
  splash.addEventListener('animationend', animationFinished);
  reducedMotion.addEventListener('change', motionChanged);
  schedule();
  return { stop };
}
