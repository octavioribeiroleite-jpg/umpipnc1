import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'admin' | 'diretoria' | 'visualizador' | 'pastor';

interface Society {
  id: string;
  name: string;
  slug: string;
  color: string;
}

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  username: string;
  avatar_url: string | null;
  phone: string | null;
  active: boolean;
  society_id: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  loading: boolean;
  rolesLoaded: boolean;
  signIn: (username: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isManagement: boolean;
  isPastor: boolean;
  society: Society | null;
  selectedSocietyId: string | null;
  setSelectedSocietyId: (id: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [rolesLoaded, setRolesLoaded] = useState(false);
  const [society, setSociety] = useState<Society | null>(null);
  const [selectedSocietyId, setSelectedSocietyIdState] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem('selectedSocietyId');
    } catch {
      return null;
    }
  });

  const setSelectedSocietyId = (id: string | null) => {
    setSelectedSocietyIdState(id);
    try {
      if (id) {
        localStorage.setItem('selectedSocietyId', id);
      } else {
        localStorage.removeItem('selectedSocietyId');
      }
    } catch {
      // ignore storage errors
    }
  };
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let isMounted = true;

    // Safety timeout: only unblocks UI, does NOT destroy session
    safetyTimerRef.current = setTimeout(() => {
      if (isMounted && loading) {
        console.warn('[Auth] Safety timeout - unblocking UI (session preserved)');
        setLoading(false);
        setRolesLoaded(true);
      }
    }, 10000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!isMounted) return;

        console.log('[Auth] onAuthStateChange:', event);

        if (event === 'TOKEN_REFRESHED') {
          // Token refreshed: just update session/user, don't re-fetch profile
          setSession(newSession);
          setUser(newSession?.user ?? null);
          return;
        }

        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setProfile(null);
          setRoles([]);
          setSociety(null);
          setLoading(false);
          setRolesLoaded(true);
          return;
        }

        setSession(newSession);
        setUser(newSession?.user ?? null);

        const isNewUser = newSession?.user?.id !== user?.id;
        if (newSession?.user && (!profile || isNewUser)) {
          if (isNewUser) {
            setProfile(null);
            setRoles([]);
            setSociety(null);
          }
          setTimeout(() => {
            if (isMounted) fetchProfileAndRoles(newSession.user.id);
          }, 0);
        } else if (!newSession) {
          setProfile(null);
          setRoles([]);
          setSociety(null);
          setLoading(false);
        }
      }
    );

    const initializeAuth = async () => {
      try {
        console.log('[Auth] Starting getSession...');
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        console.log('[Auth] getSession completed', { hasSession: !!currentSession, error: error?.message });

        // Cancel safety timer since getSession completed
        if (safetyTimerRef.current) {
          clearTimeout(safetyTimerRef.current);
          safetyTimerRef.current = null;
        }

        if (!isMounted) return;

        if (error) {
          console.error('[Auth] getSession error:', error.message);
          setUser(null);
          setSession(null);
          setLoading(false);
          setRolesLoaded(true);
          return;
        }

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          // Set a separate longer timeout for profile fetch
          const profileTimer = setTimeout(() => {
            if (isMounted && loading) {
              console.warn('[Auth] Profile fetch timeout - unblocking UI');
              setLoading(false);
              setRolesLoaded(true);
            }
          }, 8000);

          await fetchProfileAndRoles(currentSession.user.id);
          clearTimeout(profileTimer);
        } else {
          setLoading(false);
          setRolesLoaded(true);
        }
      } catch (err: any) {
        console.error('[Auth] Initialization error:', err?.message || err);
        if (isMounted) {
          setLoading(false);
          setRolesLoaded(true);
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      if (safetyTimerRef.current) {
        clearTimeout(safetyTimerRef.current);
      }
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfileAndRoles = async (userId: string) => {
    try {
      // Fetch profile with individual error handling
      let profileData: any = null;
      try {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
        profileData = data;
      } catch (err) {
        console.error('[Auth] Profile fetch network error:', err);
        // Don't destroy session on network error, just proceed
      }

      if (profileData && !profileData.active) {
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
        setProfile(null);
        setRoles([]);
        setSociety(null);
        setTimeout(() => {
          import('sonner').then(({ toast }) => {
            toast.error('Sua conta foi desativada. Entre em contato com o administrador.');
          });
        }, 0);
        setLoading(false);
        setRolesLoaded(true);
        return;
      }

      if (profileData) {
        setProfile(profileData as Profile);

        // Fetch society independently
        if (profileData.society_id) {
          try {
            const { data: societyData } = await supabase
              .from('societies')
              .select('*')
              .eq('id', profileData.society_id)
              .maybeSingle();
            if (societyData) setSociety(societyData as Society);
          } catch (err) {
            console.error('[Auth] Society fetch error:', err);
          }
        } else {
          setSociety(null);
        }
      }

      // Fetch roles independently
      try {
        const { data: rolesData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId);
        if (rolesData) {
          setRoles(rolesData.map(r => r.role as AppRole));
        }
      } catch (err) {
        console.error('[Auth] Roles fetch error:', err);
      }
    } catch (error) {
      console.error('[Auth] fetchProfileAndRoles error:', error);
    } finally {
      setRolesLoaded(true);
      setLoading(false);
    }
  };

  const signIn = async (username: string, password: string) => {
    const cleanUsername = username.toLowerCase().replace(/\s+/g, '');
    const { data: email } = await supabase.rpc('get_email_by_username', {
      _username: cleanUsername,
    });

    const loginEmail = email || `${cleanUsername}@ipnc.local`;
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
    setSociety(null);
    setRolesLoaded(false);
    setSelectedSocietyId(null);
  };

  const isAdmin = roles.includes('admin');
  const isManagement = roles.includes('admin') || roles.includes('diretoria');
  const isPastor = roles.includes('pastor');

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        roles,
        loading,
        rolesLoaded,
        signIn,
        signOut,
        isAdmin,
        isManagement,
        isPastor,
        society,
        selectedSocietyId,
        setSelectedSocietyId,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
