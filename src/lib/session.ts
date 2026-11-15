import NetInfo from './netInfo';
import { showAlert } from '../components/ui/AlertModal';
import { clearLocalDatabase, getDbConnection } from '../database/db';
import { useStore } from '../store/useStore';
import { supabase } from './supabase';
import { unregister_fcm_token } from '../services/deviceService';
import { queryClient } from './queryClient';
import { clearStoreContext, setLastAuthUserId } from '../services/storeContext';
import { countPendingLocalItems, syncAll } from '../services/sync';

export const CUSTOMER_LOGOUT_MESSAGE =
  'Tendrás que ingresar nuevamente con tu número de documento y contraseña.';

interface LogoutOptions {
  title?: string;
  message?: string;
  confirmText?: string;
  clearLocalData?: boolean;
}

export async function checkPendingSyncStatus(): Promise<{
  pendingCount: number;
  isOnline: boolean;
}> {
  try {
    const db = await getDbConnection();
    const pendingCount = await countPendingLocalItems(db);
    const netState = await NetInfo.fetch();
    const isOnline = Boolean(
      netState.isConnected && netState.isInternetReachable !== false,
    );
    return { pendingCount, isOnline };
  } catch (_e) {
    return { pendingCount: 0, isOnline: false };
  }
}

export async function performLogout(clearLocalData = false): Promise<void> {
  try {
    const db = await getDbConnection();
    const pendingCount = await countPendingLocalItems(db);

    const shouldClear = clearLocalData && pendingCount === 0;

    await unregister_fcm_token().catch(err => {
      console.warn('[session] Error desvinculando dispositivo en logout:', err);
    });

    if (shouldClear) {
      await clearLocalDatabase();
      await clearStoreContext();
      await setLastAuthUserId(null);
    }

    await supabase.auth.signOut();
    queryClient.clear();
    useStore.getState().setProfile(null);
    useStore.getState().setCustomerSearch('');
  } catch (error: any) {
    showAlert({
      title: 'No se pudo cerrar sesión',
      message: error?.message,
      type: 'destructive',
    });
  }
}

export async function confirmLogout(options: LogoutOptions = {}): Promise<void> {
  const {
    title = '¿Seguro que deseas cerrar sesión?',
    message = 'Tendrás que volver a iniciar sesión para acceder a tu tienda.',
    confirmText = 'Cerrar sesión',
    clearLocalData = false,
  } = options;

  const { pendingCount, isOnline } = await checkPendingSyncStatus();

  if (pendingCount > 0) {
    if (!isOnline) {
      showAlert({
        title: 'Operaciones pendientes sin conexión',
        message: `Tienes ${pendingCount} operacion(es) guardada(s) localmente (fiados, abonos o clientes) que aún no se han subido al servidor. Para no perder tu información, conéctate a Internet y espera que se sincronicen antes de cerrar sesión.`,
        type: 'warning',
        buttons: [{ text: 'Entendido', style: 'cancel' }],
      });
      return;
    }

    showAlert({
      title: 'Sincronizar antes de salir',
      message: `Tienes ${pendingCount} operacion(es) pendientes de respaldar. ¿Deseas sincronizarlas con el servidor ahora para cerrar sesión de forma segura?`,
      type: 'warning',
      buttons: [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sincronizar y salir',
          style: 'default',
          onPress: async () => {
            try {
              await syncAll({ force: true });
              const db = await getDbConnection();
              const remaining = await countPendingLocalItems(db);
              if (remaining === 0) {
                await performLogout(clearLocalData);
              } else {
                showAlert({
                  title: 'Sincronización incompleta',
                  message: `Aún quedan ${remaining} registro(s) pendientes de confirmación en el servidor. Por seguridad de tus datos, la sesión no se cerrará hasta que todo quede respaldado.`,
                  type: 'destructive',
                });
              }
            } catch (err: any) {
              showAlert({
                title: 'Error de sincronización',
                message: err?.message || 'No fue posible confirmar todas las operaciones.',
                type: 'destructive',
              });
            }
          },
        },
      ],
    });
    return;
  }

  showAlert({
    title,
    message,
    type: 'warning',
    buttons: [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: confirmText,
        style: 'destructive',
        onPress: async () => {
          await performLogout(clearLocalData);
        },
      },
    ],
  });
}
