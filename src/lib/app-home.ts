// Public entry is distinct from the authenticated dashboard at `/`.
export const APP_HOME_PATH = '/auth?home=1';

export function requestsPublicHome(search: string) {
  return new URLSearchParams(search).get('home') === '1';
}

// A newly opened recovery or public election link must retain its destination.
export function hasDirectEntryIntent(location: Pick<Location, 'pathname' | 'search' | 'hash'>) {
  return location.pathname === '/reset-password' ||
    /^\/vote\//.test(location.pathname) ||
    /^\/eleicao\/[^/]+\/apresentar\/?$/.test(location.pathname) ||
    new URLSearchParams(location.search).has('code') ||
    new URLSearchParams(location.hash.slice(1)).has('access_token');
}
