import { useEffect, useState, useCallback } from 'react';
import NetInfo from '../lib/netInfo';
import { useQueryClient } from '@tanstack/react-query';
import { syncAll, clearCachedStoreId } from '../services/sync';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export function useSync() {
  const { isAuthenticated, userType } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean | null>(true);
  const [lastSyncDate, setLastSyncDate] = useState<Date | null>(null);
  const queryClient = useQueryClient();

  const runSync = useCallback(
    async (options?: { force?: boolean }) => {
      if (isSyncing || !isAuthenticated || userType !== 'store') {
        return;
      }
      try {
        setIsSyncing(true);
        const { pushed, pulled } = await syncAll(options);
        setLastSyncDate(new Date());

        await queryClient.invalidateQueries({ queryKey: ['free-portfolio'] });
        await queryClient.invalidateQueries({ queryKey: ['profile'] });

        if (pushed || pulled) {
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['customers'] }),
            queryClient.invalidateQueries({ queryKey: ['total-receivable'] }),
            queryClient.invalidateQueries({ queryKey: ['overdue'] }),
            queryClient.invalidateQueries({ queryKey: ['free-portfolio'] }),
            queryClient.invalidateQueries({ queryKey: ['profile'] }),
          ]);
        }
      } catch (e) {
        console.warn('Error durante sincronización:', e);
      } finally {
        setIsSyncing(false);
      }
    },
    [isSyncing, isAuthenticated, userType, queryClient],
  );

  useEffect(() => {
    if (!isAuthenticated || userType !== 'store') {
      return;
    }

    // Iniciar una sincronización no bloqueante al montar
    runSync();

    const unsubscribeNet = NetInfo.addEventListener((state: any) => {
      const online = Boolean(
        state.isConnected && state.isInternetReachable !== false,
      );
      setIsOnline(online);

      if (online) {
        runSync();
      }
    });

    const { data: authSub } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Solo forzar re-sincronización cuando el usuario inicia sesión explícitamente (SIGNED_IN)
        if (event === 'SIGNED_IN' && session) {
          clearCachedStoreId();
          runSync({ force: true });
        } else if (event === 'SIGNED_OUT') {
          clearCachedStoreId();
        }
      },
    );

    return () => {
      unsubscribeNet();
      authSub.subscription.unsubscribe();
    };
  }, [runSync, isAuthenticated, userType]);

  return {
    sync: runSync,
    isSyncing,
    isOnline,
    lastSyncDate,
  };
}
