import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { performLogout } from '../lib/session';
import { handleUserSessionSwitch } from '../services/accountSync';

export type UserType = 'store' | 'customer';

export interface AuthContextType {
  session: Session | null;
  user: User | null;
  userType: UserType | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function resolveUserType(user: User | null): UserType {
  if (!user) return 'store';
  const type =
    user.app_metadata?.user_type || user.user_metadata?.user_type;
  return type === 'customer' ? 'customer' : 'store';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userType, setUserType] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const applySession = useCallback(async (nextSession: Session | null) => {
    const currentUser = nextSession?.user ?? null;
    const type = currentUser ? resolveUserType(currentUser) : null;

    // Actualizar estado de sesión de inmediato para que la UI no quede bloqueada
    setSession(nextSession);
    setUser(currentUser);
    setUserType(type);

    if (currentUser?.id) {
      try {
        await handleUserSessionSwitch(currentUser.id, type);
      } catch (err) {
        console.warn('[AuthContext] Error verificando usuario asociado:', err);
      }
    }
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      await applySession(data.session);

      if (data.session) {
        const { data: userData, error: userError } =
          await supabase.auth.getUser();
        if (userError) {
          const status = (userError as any)?.status;
          if (status === 401 || status === 403) {
            await applySession(null);
          }
        } else if (userData.user) {
          setUser(userData.user);
          setUserType(resolveUserType(userData.user));
        }
      }
    } catch (err) {
      console.warn('[AuthContext] Error refrescando sesión:', err);
    }
  }, [applySession]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      if (!mounted) return;
      // Desbloquear spinner inmediatamente con la sesión en caché local (0ms de latencia)
      const currentUser = initialSession?.user ?? null;
      const type = currentUser ? resolveUserType(currentUser) : null;
      setSession(initialSession);
      setUser(currentUser);
      setUserType(type);
      setIsLoading(false);

      if (currentUser?.id) {
        handleUserSessionSwitch(currentUser.id, type).catch(err => {
          console.warn('[AuthContext] Error en sincronización inicial de usuario:', err);
        });
      }

      if (initialSession) {
        // En background no bloqueante, verificar validez del token
        supabase.auth.getUser().then(({ data: { user: verifiedUser }, error }) => {
          if (!mounted) return;
          if (error) {
            const status = (error as any)?.status;
            if (status === 401 || status === 403) {
              setSession(null);
              setUser(null);
              setUserType(null);
            }
            return;
          }
          if (verifiedUser) {
            setUser(verifiedUser);
            setUserType(resolveUserType(verifiedUser));
          }
        }).catch(() => {});
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      if (!mounted) return;
      await applySession(currentSession);
      setIsLoading(false);
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [applySession]);

  const signOut = useCallback(async () => {
    await performLogout();
    await applySession(null);
  }, [applySession]);

  const value: AuthContextType = {
    session,
    user,
    userType,
    isLoading,
    isAuthenticated: !!session && !!user,
    signOut,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
}
