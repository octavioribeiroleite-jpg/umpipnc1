// Establish transport restrictions before importing any application module.
const allow = (input: string | URL) => {
  const url = new URL(String(input), location.href);
  if (url.origin !== location.origin && !(url.protocol === 'ws:' && url.hostname === '127.0.0.1' && url.port === '8085')) throw new Error('Benchmark blocked external transport');
  if (/\/(?:rest|auth|functions|storage)\/v1(?:\/|$)|^\/sw\.js(?:\?|$)/.test(url.pathname)) throw new Error('Benchmark blocked real backend');
};
const nativeFetch = window.fetch.bind(window);
window.fetch = (input, init) => {
  allow(typeof input === 'string' || input instanceof URL ? input : input.url);
  if (!['GET', 'HEAD'].includes((init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase())) return Promise.reject(new Error('Benchmark blocked network mutation'));
  return nativeFetch(input, init);
};
const nativeOpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function(method: string, url: string | URL, async = true, user?: string | null, password?: string | null) {
  allow(url); if (!['GET', 'HEAD'].includes(method.toUpperCase())) throw new Error('Benchmark blocked XHR mutation');
  return nativeOpen.call(this, method, url, async, user, password);
};
window.WebSocket = new Proxy(window.WebSocket, { construct(target, args) { allow(args[0]); return Reflect.construct(target, args); } });
window.EventSource = new Proxy(window.EventSource, { construct(target, args) { allow(args[0]); return Reflect.construct(target, args); } });
navigator.sendBeacon = () => false;
const source = await (await fetch('/__ebd-benchmark-source.json')).json();
document.body.dataset.benchmarkRevision = source.revision;
document.body.dataset.benchmarkSourceHash = source.sourceHash;
document.body.dataset.benchmarkSourceStatus = source.sourceStatus;
await import('./main');
