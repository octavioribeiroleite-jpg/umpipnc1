// These routes validate their own access (EBD/treasury) or are public entry
// points. A failed principal-account lookup must not replace their own guards.
export function usesIndependentAccess(pathname: string): boolean {
  const path = pathname.toLowerCase().replace(/\/+$/, '') || '/';
  if (['/auth', '/reset-password', '/secretaria', '/tesouraria', '/igreja', '/membro'].includes(path)) return true;
  return /^\/vote\/[^/]+$/.test(path) || /^\/eleicao\/[^/]+\/apresentar$/.test(path);
}
