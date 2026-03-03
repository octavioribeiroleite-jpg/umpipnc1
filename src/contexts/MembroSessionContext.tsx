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

export function MembroSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<MembroSession | null>(null);

  const setSession = useCallback((s: MembroSession) => {
    setSessionState(s);
  }, []);

  const clearSession = useCallback(() => {
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
