// Persist the existing server-issued session; never persist a PIN or extend its
// expiry. Backend validation and the in-place PIN renewal remain authoritative.
export const EBD_SESSION_KEY = 'ebd_session';
export const EBD_AUTH_KEY = 'ipnc-ebd-auth';
export interface StoredEbdSession {
  accessLevel: 'admin' | 'professor';
  professorNome?: string;
  professorClassId?: string | null;
  birthdayAiToken?: string;
  birthdayAiExpiresAt?: string;
}
export function loadStoredEbdSession(): StoredEbdSession | null {
  try {
    const raw = localStorage.getItem(EBD_SESSION_KEY) || sessionStorage.getItem(EBD_SESSION_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw);
    if (!['admin','professor'].includes(value.accessLevel)) return null;
    const session: StoredEbdSession = { accessLevel: value.accessLevel, professorNome: value.professorNome, professorClassId: value.professorClassId, birthdayAiToken: value.birthdayAiToken, birthdayAiExpiresAt: value.birthdayAiExpiresAt };
    saveStoredEbdSession(session);
    return session;
  } catch { return null; }
}
export function saveStoredEbdSession(session: StoredEbdSession) {
  try { localStorage.setItem(EBD_SESSION_KEY, JSON.stringify(session)); sessionStorage.removeItem(EBD_SESSION_KEY); }
  catch { try { sessionStorage.setItem(EBD_SESSION_KEY, JSON.stringify(session)); } catch { /* Continue in memory. */ } }
}
export function clearStoredEbdSession() {
  for (const storage of [localStorage, sessionStorage]) for (const key of [EBD_SESSION_KEY, EBD_AUTH_KEY]) {
    try { storage.removeItem(key); } catch { /* Continue signing out in memory. */ }
  }
}
export function migrateEbdAuthStorage() {
  try {
    const previous = sessionStorage.getItem(EBD_AUTH_KEY);
    if (previous && !localStorage.getItem(EBD_AUTH_KEY)) localStorage.setItem(EBD_AUTH_KEY, previous);
    sessionStorage.removeItem(EBD_AUTH_KEY);
  } catch { /* The existing session can still be renewed with the PIN. */ }
}
