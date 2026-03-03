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

export function DiretoriaSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<DiretoriaSession | null>(null);

  const setSession = useCallback((s: DiretoriaSession) => {
    setSessionState(s);
  }, []);

  const clearSession = useCallback(() => {
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
