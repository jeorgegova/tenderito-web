import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { setupWebPushNotifications, setupRealtimeCustomerAlerts } from '../services/notificationService';
import { syncPendingDeviceToken } from '../services/deviceService';

export function useWebNotifications() {
  useEffect(() => {
    let cleanupRealtime: (() => void) | undefined;

    // Inicializar Web Push de manera segura tras montar
    const timer = setTimeout(() => {
      setupWebPushNotifications();
    }, 600);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        session?.user &&
        (event === 'SIGNED_IN' ||
          event === 'INITIAL_SESSION' ||
          event === 'TOKEN_REFRESHED')
      ) {
        syncPendingDeviceToken();
        setupWebPushNotifications();

        if (session.user.id) {
          cleanupRealtime?.();
          const userId = session.user.id;
          const metaCustId = session.user.user_metadata?.customer_id;

          // Vincular de inmediato con lo conocido
          cleanupRealtime = setupRealtimeCustomerAlerts({
            userId,
            customerId: metaCustId,
          });

          // Obtener customer_id de la tabla si no está en metadata
          supabase
            .from('customers')
            .select('id')
            .eq('user_id', userId)
            .maybeSingle()
            .then(({ data: cust }) => {
              if (cust?.id && cust.id !== metaCustId) {
                cleanupRealtime?.();
                cleanupRealtime = setupRealtimeCustomerAlerts({
                  userId,
                  customerId: cust.id,
                });
              }
            });
        }
      } else if (event === 'SIGNED_OUT') {
        cleanupRealtime?.();
      }
    });

    return () => {
      clearTimeout(timer);
      subscription.unsubscribe();
      cleanupRealtime?.();
    };
  }, []);
}
