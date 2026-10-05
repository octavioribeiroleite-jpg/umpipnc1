import { useState, useEffect, createContext, useContext, type ReactNode } from 'react';
import { fixtureRole, fixtureState, fixturePause } from './options';
export const testUserId = '00000000-0000-0000-0000-000000000001';
export const testSocietyId = '00000000-0000-0000-0000-000000000002';
const society = { id:testSocietyId, name:'União de Jovens — Exemplo fictício', slug:'ump', color:'#1c8053' };
const syntheticUser = { id:testUserId, email:'revisao@example.test' };
const syntheticProfile = { id:'profile', user_id:testUserId, full_name:'Maria Oliveira — Revisão fictícia', email:'revisao@example.test', username:'revisao', active:true, society_id:testSocietyId };
function useFixtureIdentity() {
  const [selectedSocietyId, setSelectedSocietyId] = useState<string | null>(null);
  const [user, setUser] = useState(fixtureRole === 'anonymous' ? null : syntheticUser);
  const role = fixtureRole === 'unauthorized' ? 'visualizador' : fixtureRole === 'anonymous' ? 'diretoria' : fixtureRole;
  useEffect(() => { const enter=()=>setUser(syntheticUser); window.addEventListener('fixture-signed-in',enter); return ()=>window.removeEventListener('fixture-signed-in',enter); }, []);
  return { user, session:null, profile:user ? syntheticProfile : null, roles:user ? [role] : [],
    loading:fixtureState === 'loading', rolesLoaded:fixtureState !== 'loading',
    isAdmin:Boolean(user && role === 'admin'), isManagement:Boolean(user && ['admin','diretoria'].includes(role)),
    isPastor:Boolean(user && role === 'pastor'), society, selectedSocietyId, setSelectedSocietyId,
    effectiveSocietyId:['admin','pastor'].includes(role) ? selectedSocietyId : testSocietyId,
    signOut:async () => { setUser(null); },
    signIn:async () => { await fixturePause(); if (fixtureState === 'error') return { error:new Error('Falha fictícia ao entrar') }; setUser(syntheticUser); return { error:null }; },
  };
}
const Context = createContext<ReturnType<typeof useFixtureIdentity> | null>(null);
export function AuthProvider({ children }: { children:ReactNode }) {
  return <Context.Provider value={useFixtureIdentity()}>{children}</Context.Provider>;
}
export const useAuth = () => {
  const value = useContext(Context);
  if (!value) throw new Error('Provider de identidade fictícia ausente');
  return value;
};
