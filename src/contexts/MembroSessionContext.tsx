import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface MembroSession {
  memberId: string;
  memberName: string;
  societyId: string;
  societyName: string;
  societySlug: string;
  societyColor: string;
}

interface MembroSessionContextType {
  session: MembroSession | null;
  setSession: (session: MembroSession) => void;
  clearSession: () => void;
}

const MembroSessionContext = createContext<MembroSessionContextType | undefined>(undefined);

const STORAGE_KEY = 'membro_session';

function loadStoredSession(): MembroSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as MembroSession) : null;
  } catch {
    return null;
  }
}

export function MembroSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<MembroSession | null>(loadStoredSession);

  const setSession = useCallback((s: MembroSession) => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch { /* ignore */ }
    setSessionState(s);
  }, []);

  const clearSession = useCallback(() => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch { /* ignore */ }
    setSessionState(null);
  }, []);

  return (
    <MembroSessionContext.Provider value={{ session, setSession, clearSession }}>
      {children}
    </MembroSessionContext.Provider>
  );
}

export function useMembroSession() {
  const context = useContext(MembroSessionContext);
  if (!context) {
    throw new Error('useMembroSession must be used within MembroSessionProvider');
  }
  return context;
}
