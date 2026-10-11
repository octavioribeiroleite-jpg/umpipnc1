// Use the same strict network barrier as the system-theme fixture before imports.
const allowed = (value: string | URL) => {
  const url = new URL(String(value), location.href);
  if (url.origin !== location.origin || /\/(?:rest|auth|functions|storage)\/v1(?:\/|$)/.test(url.pathname)) throw new Error('Attendance fixture blocks real connections');
};
const fetchLocal = window.fetch.bind(window);
window.fetch = (input, init) => {
  allowed(typeof input === 'string' || input instanceof URL ? input : input.url);
  if (!['GET', 'HEAD'].includes((init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase())) throw new Error('Attendance fixture blocks network writes');
  return fetchLocal(input, init);
};
navigator.sendBeacon = () => false;
await import('./main');
