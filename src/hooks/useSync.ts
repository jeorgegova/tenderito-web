import { useEffect, useState, useCallback } from 'react';
import NetInfo from '../lib/netInfo';
import { useQueryClient } from '@tanstack/react-query';
import {
  syncAll,
  clearCachedStoreId,
  isSyncing as getIsSyncing,
  subscribeSyncStatus,
  onSyncComplete,
} from '../services/sync';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export function useSync() {
  const { isAuthenticated, userType } = useAuth();
  const [isSyncing, setIsSyncing] = useState<boolean>(getIsSyncing());
  const [isOnline, setIsOnline] = useState<boolean | null>(true);
  const [lastSyncDate, setLastSyncDate] = useState<Date | null>(null);
  const queryClient = useQueryClient();

  // Suscripción al estado global de sincronización para reactividad inmediata
  useEffect(() => {
    return subscribeSyncStatus(setIsSyncing);
  }, []);

  const invalidateDomainQueries = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['customers'] }),
      queryClient.invalidateQueries({ queryKey: ['customers-all'] }),
      queryClient.invalidateQueries({ queryKey: ['customer'] }),
      queryClient.invalidateQueries({ queryKey: ['credits'] }),
      queryClient.invalidateQueries({ queryKey: ['payments'] }),
      queryClient.invalidateQueries({ queryKey: ['stats'] }),
      queryClient.invalidateQueries({ queryKey: ['total-receivable'] }),
      queryClient.invalidateQueries({ queryKey: ['overdue'] }),
      queryClient.invalidateQueries({ queryKey: ['free-portfolio'] }),
      queryClient.invalidateQueries({ queryKey: ['profile'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      queryClient.invalidateQueries({ queryKey: ['customer-portal'] }),
    ]);
  }, [queryClient]);

  // Invalidar consultas tan pronto como cualquier sincronización (automática o debounced) complete
  useEffect(() => {
    return onSyncComplete(async ({ pushed, pulled }) => {
      if (pushed || pulled) {
        await invalidateDomainQueries();
      }
    });
  }, [invalidateDomainQueries]);

  const runSync = useCallback(
    async (options?: { force?: boolean }) => {
      if (getIsSyncing() || !isAuthenticated || userType !== 'store') {
        return;
      }
      try {
        const { pushed, pulled } = await syncAll(options);
        setLastSyncDate(new Date());

        // Si fue forzada por el usuario o hubo movimientos reales, refrescar de inmediato
        if (options?.force || pushed || pulled) {
          await invalidateDomainQueries();
        } else {
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['free-portfolio'] }),
            queryClient.invalidateQueries({ queryKey: ['profile'] }),
          ]);
        }
      } catch (e) {
        console.warn('Error durante sincronización:', e);
      }
    },
    [isAuthenticated, userType, invalidateDomainQueries, queryClient],
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
