// Restrictions precede evaluation of the actual application and every fake client.
const allowedUrl = (value: string | URL) => {
  const url = new URL(String(value), location.href);
  const local = url.origin === location.origin || (url.protocol === 'ws:' && url.hostname === '127.0.0.1' && url.port === '8086');
  if (!local || /\/(?:rest|auth|functions|storage)\/v1(?:\/|$)/.test(url.pathname)) throw new Error('TESTE LOCAL: conexão real bloqueada');
};
const nativeFetch = window.fetch.bind(window);
window.fetch = (input, init) => {
  allowedUrl(typeof input === 'string' || input instanceof URL ? input : input.url);
  const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
  if (!['GET', 'HEAD'].includes(method)) return Promise.reject(new Error('TESTE LOCAL: escrita de rede bloqueada'));
  return nativeFetch(input, init);
};
const nativeOpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function(method: string, url: string | URL, async = true, username?: string | null, password?: string | null) {
  allowedUrl(url);
  if (!['GET', 'HEAD'].includes(method.toUpperCase())) throw new Error('TESTE LOCAL: XHR de escrita bloqueado');
  return nativeOpen.call(this, method, url, async, username, password);
};
window.WebSocket = new Proxy(window.WebSocket, { construct(target, args) { allowedUrl(args[0]); return Reflect.construct(target, args); } });
window.EventSource = new Proxy(window.EventSource, { construct(target, args) { allowedUrl(args[0]); return Reflect.construct(target, args); } });
navigator.sendBeacon = () => false;
const params = new URLSearchParams(location.search);
if (params.get('portal') === 'return') localStorage.setItem('portal_visitor', JSON.stringify({ fullName: 'Visitante Fictício', societyId: null, isVisitor: true, deviceId: 'fixture-visitor' }));
if (params.get('portal') === 'new') localStorage.removeItem('portal_visitor');
if (params.get('reauth') === '1') {
  // Initialize only the synthetic EBD module, then expire its own UI token.
  // This exercises the real expiration timer without events or private state.
  await import('../ebd-login/backend');
  const seeded = localStorage.getItem('ebd_session');
  if (!seeded) throw new Error('Fixture reauth requires mode=stored-admin or stored-professor');
  localStorage.setItem('ebd_session', JSON.stringify({ ...JSON.parse(seeded), birthdayAiExpiresAt: new Date(Date.now() - 1000).toISOString() }));
}
await import('./main');
