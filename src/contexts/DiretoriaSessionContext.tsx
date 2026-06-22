import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface DiretoriaSession {
  societyId: string;
  societySlug: string;
  societyName: string;
  societyColor: string;
  operatorName: string;
  operatorFunction: string;
}

interface DiretoriaSessionContextType {
  session: DiretoriaSession | null;
  setSession: (session: DiretoriaSession) => void;
  clearSession: () => void;
}

const DiretoriaSessionContext = createContext<DiretoriaSessionContextType | undefined>(undefined);

const STORAGE_KEY = 'diretoria_session';

function loadStoredSession(): DiretoriaSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DiretoriaSession) : null;
  } catch {
    return null;
  }
}

export function DiretoriaSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<DiretoriaSession | null>(loadStoredSession);

  const setSession = useCallback((s: DiretoriaSession) => {
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
    <DiretoriaSessionContext.Provider value={{ session, setSession, clearSession }}>
      {children}
    </DiretoriaSessionContext.Provider>
  );
}

export function useDiretoriaSession() {
  const context = useContext(DiretoriaSessionContext);
  if (!context) {
    throw new Error('useDiretoriaSession must be used within DiretoriaSessionProvider');
  }
  return context;
}
