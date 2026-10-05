export async function refreshSite(page: Window, device: Navigator) {
  if (!device.onLine) throw new Error('Conecte-se à internet para atualizar o site e os dados.');
  const fresh = new URL(page.location.href);
  fresh.searchParams.set('__refresh', String(Date.now()));
  const response = await fetch(fresh.href, { cache: 'no-store', signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error('O site não respondeu. Tente atualizar novamente em instantes.');

  // Keep registration and cached assets: removing them creates false update
  // notifications and can interrupt other tabs still using the previous app.
  if ('serviceWorker' in device) {
    let timeout: ReturnType<typeof setTimeout>;
    const activate = async () => {
      const registration = await device.serviceWorker.getRegistration();
      if (!registration) return;
      if (!registration.waiting) await registration.update();
      if (!registration.waiting) return;
      await new Promise<void>(resolve => {
        const changed = () => { clearTimeout(timer); device.serviceWorker.removeEventListener('controllerchange', changed); resolve(); };
        const timer = setTimeout(changed, 3000);
        device.serviceWorker.addEventListener('controllerchange', changed);
        registration.waiting!.postMessage({ type: 'SKIP_WAITING' });
      });
    };
    try {
      await Promise.race([activate(), new Promise<void>(resolve => { timeout = setTimeout(resolve, 5000); })]);
    } catch {
      // Online navigation still retrieves current HTML if worker update fails.
    } finally { clearTimeout(timeout!); }
  }
  page.location.replace(fresh.href);
}
