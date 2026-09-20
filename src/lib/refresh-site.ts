export async function refreshSite(page: Window, device: Navigator) {
  if (!device.onLine) throw new Error('Conecte-se à internet para atualizar o site e os dados.');
  const fresh = new URL(page.location.href);
  fresh.searchParams.set('__refresh', String(Date.now()));
  // Confirm availability before clearing offline assets or discarding the page.
  const response = await fetch(fresh.href, { cache: 'no-store', signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error('O site não respondeu. Tente atualizar novamente em instantes.');
  if ('serviceWorker' in device) {
    const registrations = await device.serviceWorker.getRegistrations();
    await Promise.all(registrations.map(registration => registration.unregister()));
  }
  if ('caches' in page) {
    const keys = await page.caches.keys();
    await Promise.all(keys.map(key => page.caches.delete(key)));
  }
  // Cache-busted navigation also avoids reusing HTML from the browser's HTTP
  // cache. A new page reloads all database queries; authentication stays intact.
  page.location.replace(fresh.href);
}
