// Install restrictions BEFORE evaluating any application module.
import { fixtureParams } from './options';
const allowedUrl = (value: string | URL) => {
  const url = new URL(String(value), location.href);
  const local = url.origin === location.origin ||
    (url.protocol === 'ws:' && url.hostname === '127.0.0.1' && url.port === '8083');
  if (!local || /\/(?:rest|auth|functions|storage)\/v1(?:\/|$)/.test(url.pathname)) {
    throw new Error('TESTE LOCAL: conexão real bloqueada');
  }
  return url;
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
window.WebSocket = new Proxy(window.WebSocket, { construct(target, args) {
  allowedUrl(args[0]); return Reflect.construct(target, args);
} });
window.EventSource = new Proxy(window.EventSource, { construct(target, args) {
  allowedUrl(args[0]); return Reflect.construct(target, args);
} });
navigator.sendBeacon = () => false;
// Only synthetic fixture-owned identities are seeded, never production sessions.
if (fixtureParams.get('portal') === 'return') {
  localStorage.setItem('portal_visitor', JSON.stringify({ fullName:'Visitante Fictício de Demonstração com Nome Extenso', societyId:null, isVisitor:true, deviceId:'fixture-visitor' }));
} else if (fixtureParams.get('portal') === 'new') {
  localStorage.removeItem('portal_visitor');
}
if (fixtureParams.get('identity') === 'return') {
  localStorage.setItem('diretoria_name_ump', 'Pessoa Fictícia da Diretoria com Nome Extenso');
  localStorage.setItem('diretoria_function_ump', 'Secretário(a)');
}
if (fixtureParams.get('font') === '200') document.documentElement.style.fontSize = '200%';
if (fixtureParams.get('ebd-session') === '1') {
  localStorage.setItem('ebd_session', JSON.stringify({ accessLevel: 'professor', professorNome: 'Professor fictício', professorClassId: 'fixture-class' }));
} else if (fixtureParams.get('ebd-session') === '0') localStorage.removeItem('ebd_session');
await import('./main');
