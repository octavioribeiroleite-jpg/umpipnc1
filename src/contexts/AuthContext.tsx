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
  effectiveSocietyId: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const PROFILE_RETRY_DELAYS = [0, 350, 900];

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [rolesLoaded, setRolesLoaded] = useState(false);
  const [society, setSociety] = useState<Society | null>(null);
  const [selectedSocietyId, setSelectedSocietyIdState] = useState<string | null>(null);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydrationRef = useRef(0);

  const setSelectedSocietyId = (id: string | null) => {
    setSelectedSocietyIdState(id);
    try {
      if (id) localStorage.setItem('selectedSocietyId', id);
      else localStorage.removeItem('selectedSocietyId');
    } catch {
      // ignore storage errors
    }
  };

  const resetAuthData = () => {
    setProfile(null);
    setRoles([]);
    setSociety(null);
    setSelectedSocietyIdState(null);
  };

  const fetchProfileAndRoles = async (userId: string) => {
    const hydrationId = ++hydrationRef.current;
    setLoading(true);
    setRolesLoaded(false);

    let profileData: Profile | null = null;
    let fetchedRoles: AppRole[] = [];
    let lastProfileError: unknown = null;
    let lastRolesError: unknown = null;

    for (const delay of PROFILE_RETRY_DELAYS) {
      if (delay) await wait(delay);
      if (hydrationId !== hydrationRef.current) return;

      const [profileResult, rolesResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle(),
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId),
      ]);

      lastProfileError = profileResult.error;
      lastRolesError = rolesResult.error;
      profileData = (profileResult.data as Profile | null) ?? null;
      fetchedRoles = rolesResult.data?.map((item) => item.role as AppRole) ?? [];

      if (!profileResult.error && !rolesResult.error && profileData && fetchedRoles.length > 0) {
        break;
      }
    }

    if (hydrationId !== hydrationRef.current) return;

    if (lastProfileError) console.error('[Auth] Profile fetch error:', lastProfileError);
    if (lastRolesError) console.error('[Auth] Roles fetch error:', lastRolesError);

    if (profileData && !profileData.active) {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      resetAuthData();
      setLoading(false);
      setRolesLoaded(true);
      setTimeout(() => {
        import('sonner').then(({ toast }) => {
          toast.error('Sua conta foi desativada. Entre em contato com o administrador.');
        });
      }, 0);
      return;
    }

    setProfile(profileData);
    setRoles(fetchedRoles);

    if (profileData?.society_id) {
      const { data: societyData, error: societyError } = await supabase
        .from('societies')
        .select('*')
        .eq('id', profileData.society_id)
        .maybeSingle();

      if (societyError) console.error('[Auth] Society fetch error:', societyError);
      setSociety((societyData as Society | null) ?? null);
    } else {
      setSociety(null);
    }

    const fetchedIsAdmin = fetchedRoles.includes('admin');
    const fetchedIsPastor = fetchedRoles.includes('pastor');
    if (fetchedIsAdmin || fetchedIsPastor) {
      try {
        const saved = localStorage.getItem('selectedSocietyId');
        if (saved) setSelectedSocietyIdState(saved);
      } catch {
        // ignore storage errors
      }
    } else {
      try {
        localStorage.removeItem('selectedSocietyId');
      } catch {
        // ignore storage errors
      }
      setSelectedSocietyIdState(null);
    }

    if (!profileData || fetchedRoles.length === 0) {
      console.error('[Auth] Incomplete authenticated account', {
        userId,
        hasProfile: Boolean(profileData),
        roles: fetchedRoles,
      });
    }

    setRolesLoaded(true);
    setLoading(false);
  };

  useEffect(() => {
    let isMounted = true;

    safetyTimerRef.current = setTimeout(() => {
      if (isMounted) {
        console.warn('[Auth] Safety timeout - unblocking UI');
        setLoading(false);
      }
    }, 10000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!isMounted) return;

      console.log('[Auth] onAuthStateChange:', event);

      if (event === 'TOKEN_REFRESHED') {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        return;
      }

      if (event === 'SIGNED_OUT') {
        hydrationRef.current += 1;
        setSession(null);
        setUser(null);
        resetAuthData();
        setLoading(false);
        setRolesLoaded(true);
        return;
      }

      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        setLoading(true);
        setRolesLoaded(false);
        setProfile(null);
        setRoles([]);
        setSociety(null);
        setTimeout(() => {
          if (isMounted) void fetchProfileAndRoles(newSession.user.id);
        }, 0);
      } else {
        resetAuthData();
        setLoading(false);
        setRolesLoaded(true);
      }
    });

    const initializeAuth = async () => {
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();

        if (safetyTimerRef.current) {
          clearTimeout(safetyTimerRef.current);
          safetyTimerRef.current = null;
        }

        if (!isMounted) return;

        if (error) {
          console.error('[Auth] getSession error:', error.message);
          setUser(null);
          setSession(null);
          resetAuthData();
          setLoading(false);
          setRolesLoaded(true);
          return;
        }

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          await fetchProfileAndRoles(currentSession.user.id);
        } else {
          resetAuthData();
          setLoading(false);
          setRolesLoaded(true);
        }
      } catch (error) {
        console.error('[Auth] Initialization error:', error);
        if (isMounted) {
          setLoading(false);
          setRolesLoaded(true);
        }
      }
    };

    void initializeAuth();

    return () => {
      isMounted = false;
      hydrationRef.current += 1;
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (username: string, password: string) => {
    try {
      localStorage.removeItem('selectedSocietyId');
    } catch {
      // ignore storage errors
    }
    setSelectedSocietyIdState(null);

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
    hydrationRef.current += 1;
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    resetAuthData();
    setRolesLoaded(false);
  };

  const isAdmin = roles.includes('admin');
  const isManagement = roles.includes('admin') || roles.includes('diretoria');
  const isPastor = roles.includes('pastor');

  const effectiveSocietyId = (isAdmin || isPastor)
    ? selectedSocietyId
    : (profile?.society_id ?? null);

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
        effectiveSocietyId,
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
