import { supabase } from '../lib/supabase';
import { generateLocalId } from '../utils/id';

const DEVICE_ID_STORAGE_KEY = '@tenderito_device_id';
const PENDING_FCM_TOKEN_KEY = '@tenderito_pending_fcm_token';

/**
 * Obtiene el identificador único del hardware o navegador del dispositivo.
 */
export async function getDeviceId(): Promise<string> {
  try {
    let deviceId = localStorage.getItem(DEVICE_ID_STORAGE_KEY);
    if (!deviceId) {
      deviceId = 'web-' + generateLocalId();
      localStorage.setItem(DEVICE_ID_STORAGE_KEY, deviceId);
    }
    return deviceId;
  } catch (_e) {
    return 'web-device-' + Date.now();
  }
}

/**
 * Obtiene el nombre/modelo del dispositivo o navegador (ej: "WEB_PWA - Chrome (macOS)").
 */
export function getDeviceModelName(): string {
  try {
    const ua = navigator.userAgent;
    const isStandalone =
      typeof window !== 'undefined' &&
      (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true);
    const mode = isStandalone ? ' (PWA)' : '';

    if (ua.includes('iPhone')) return `WEB_PWA - Safari iPhone${mode}`;
    if (ua.includes('iPad')) return `WEB_PWA - Safari iPad${mode}`;
    if (ua.includes('Android')) return `WEB_PWA - Chrome Android${mode}`;
    if (ua.includes('Macintosh')) return `WEB_PWA - macOS${mode}`;
    if (ua.includes('Windows')) return `WEB_PWA - Windows${mode}`;
    return `WEB_PWA - Navegador${mode}`;
  } catch (_e) {
    return 'WEB_PWA';
  }
}

/**
 * Obtiene la versión actual de la aplicación.
 */
export function getAppVersion(): string {
  return '1.0.4';
}

/**
 * Registra o actualiza el token FCM / Web Push del dispositivo en Supabase
 * asociado al usuario con sesión activa.
 */
export const register_fcm_token = async (
  token?: string,
  callback?: (success: boolean, response?: any) => void,
): Promise<{ success: boolean; data?: any; error?: any }> => {
  try {
    let fcmToken = token;

    if (!fcmToken) {
      fcmToken = localStorage.getItem(PENDING_FCM_TOKEN_KEY) || undefined;
    }

    if (!fcmToken) {
      const err = new Error('No se pudo obtener el token de notificación');
      callback?.(false, err);
      return { success: false, error: err };
    }

    // Guardar en caché local por si no hay sesión aún
    localStorage.setItem(PENDING_FCM_TOKEN_KEY, fcmToken);

    // Verificar si hay sesión activa en Supabase
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.log('[register_fcm_token] Usuario sin sesión, token guardado para vincular al iniciar sesión.');
      callback?.(true, { pending: true, token: fcmToken });
      return { success: true, data: { pending: true } };
    }

    const deviceId = await getDeviceId();
    const deviceName = getDeviceModelName();
    const appVersion = getAppVersion();

    console.log('[register_fcm_token] Registrando en Supabase:', {
      userId: user.id,
      deviceId,
      fcmToken: fcmToken.substring(0, 15) + '...',
    });

    // Llamar a la función RPC segura en Supabase con 'web_pwa'
    let { data, error } = await supabase.rpc('registrar_dispositivo', {
      p_device_id: deviceId,
      p_fcm_token: fcmToken,
      p_platform: 'web_pwa',
      p_device_name: deviceName,
      p_app_version: appVersion,
    });

    // Si la base de datos aún tiene la restricción check previa ('android', 'ios', 'web'), reintentar con 'web'
    if (error && (error.message?.includes('platform') || error.message?.includes('check constraint'))) {
      console.log('[register_fcm_token] Reintentando registro con plataforma "web" por restricción de base de datos...');
      const retry = await supabase.rpc('registrar_dispositivo', {
        p_device_id: deviceId,
        p_fcm_token: fcmToken,
        p_platform: 'web',
        p_device_name: deviceName,
        p_app_version: appVersion,
      });
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      // Fallback directo a la tabla si el RPC tuviera algún detalle de permisos
      console.warn('[register_fcm_token] Error en RPC, intentando upsert directo:', error.message);
      let targetPlatform = 'web_pwa';
      let { data: upsertData, error: upsertError } = await supabase
        .from('dispositivos_vinculados')
        .upsert(
          {
            user_id: user.id,
            device_id: deviceId,
            fcm_token: fcmToken,
            platform: targetPlatform,
            device_name: deviceName,
            app_version: appVersion,
            is_active: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,device_id' },
        )
        .select()
        .single();

      if (upsertError && upsertError.message?.includes('platform')) {
        targetPlatform = 'web';
        const retryUpsert = await supabase
          .from('dispositivos_vinculados')
          .upsert(
            {
              user_id: user.id,
              device_id: deviceId,
              fcm_token: fcmToken,
              platform: targetPlatform,
              device_name: deviceName,
              app_version: appVersion,
              is_active: true,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,device_id' },
          )
          .select()
          .single();
        upsertData = retryUpsert.data;
        upsertError = retryUpsert.error;
      }

      if (upsertError) {
        console.error('[register_fcm_token] Error en upsert:', upsertError);
        callback?.(false, upsertError);
        return { success: false, error: upsertError };
      }

      localStorage.removeItem(PENDING_FCM_TOKEN_KEY);
      callback?.(true, upsertData);
      return { success: true, data: upsertData };
    }

    localStorage.removeItem(PENDING_FCM_TOKEN_KEY);
    callback?.(true, data);
    return { success: true, data };
  } catch (err: any) {
    console.error('Error en register_fcm_token:', err);
    callback?.(false, err);
    return { success: false, error: err };
  }
};

/**
 * Desvincula el celular o token de la base de datos de Supabase al cerrar sesión.
 */
export const unregister_fcm_token = async (
  data?: { deviceId?: string; token?: string } | any,
  callback?: (success: boolean, response?: any) => void,
): Promise<{ success: boolean; data?: any; error?: any }> => {
  try {
    const deviceId = data?.deviceId || (await getDeviceId());
    const token = data?.token || localStorage.getItem(PENDING_FCM_TOKEN_KEY);

    console.log('[unregister_fcm_token] Desvinculando dispositivo:', { deviceId });

    // Intentar invocar la función RPC en Supabase
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      'desvincular_dispositivo',
      {
        p_device_id: deviceId || null,
        p_fcm_token: token || null,
      },
    );

    if (rpcError) {
      console.warn('[unregister_fcm_token] Error en RPC, intentando delete directo:', rpcError.message);
      const { error: delError } = await supabase
        .from('dispositivos_vinculados')
        .delete()
        .eq('device_id', deviceId);

      if (delError) {
        console.error('[unregister_fcm_token] Error eliminando dispositivo:', delError);
        callback?.(false, delError);
        return { success: false, error: delError };
      }
    }

    // Limpiar token pendiente en storage local
    localStorage.removeItem(PENDING_FCM_TOKEN_KEY);

    callback?.(true, rpcResult ?? true);
    return { success: true, data: rpcResult ?? true };
  } catch (err: any) {
    console.error('Error en unregister_fcm_token:', err);
    callback?.(false, err);
    return { success: false, error: err };
  }
};

/**
 * Sincroniza el token pendiente del dispositivo tan pronto como el usuario inicie sesión.
 */
export async function syncPendingDeviceToken(): Promise<void> {
  try {
    const pendingToken = localStorage.getItem(PENDING_FCM_TOKEN_KEY);
    await register_fcm_token(pendingToken || undefined);
  } catch (error) {
    console.warn('[deviceService] Error en syncPendingDeviceToken:', error);
  }
}

/**
 * Valida si el cliente tiene un dispositivo vinculado y le despacha la notificación push
 * automáticamente cuando se registra un movimiento (abono o fiado).
 */
export async function notifyCustomerMovement(params: {
  customerId: string;
  storeId?: string | null;
  type: 'payment' | 'credit';
  status?: 'active' | 'cancelled';
  amount: number;
  concept?: string | null;
  notes?: string | null;
  movementId?: string | null;
}): Promise<{ success: boolean; sent?: number; message?: string }> {
  try {
    if (!params.customerId) {
      return { success: false, message: 'customerId es obligatorio' };
    }

    console.log(
      `[notifyCustomerMovement] Iniciando notificación para cliente ${params.customerId} (tipo: ${params.type}, status: ${params.status || 'active'}, monto: ${params.amount})...`,
    );

    // 1. Broadcast instantáneo mediante Supabase Realtime (llega de inmediato a clientes conectados)
    try {
      const bcChannel = supabase.channel(`customer-realtime-${params.customerId}`);
      bcChannel.subscribe(status => {
        if (status === 'SUBSCRIBED') {
          bcChannel.send({
            type: 'broadcast',
            event: 'movement',
            payload: {
              type: params.type,
              status: params.status || 'active',
              amount: params.amount,
              concept: params.concept,
              storeId: params.storeId,
              movementId: params.movementId,
            },
          });
        }
      });

      if (params.storeId) {
        const storeBcChannel = supabase.channel(`store-realtime-${params.storeId}`);
        storeBcChannel.subscribe(status => {
          if (status === 'SUBSCRIBED') {
            storeBcChannel.send({
              type: 'broadcast',
              event: 'movement',
              payload: {
                type: params.type,
                status: params.status || 'active',
                amount: params.amount,
                concept: params.concept,
                storeId: params.storeId,
                movementId: params.movementId,
              },
            });
          }
        });
      }
    } catch (bcErr) {
      console.warn('[notifyCustomerMovement] Broadcast en realtime omitido:', bcErr);
    }

    const payload = {
      body: {
        table: params.type === 'payment' ? 'payments' : 'credits',
        record: {
          id: params.movementId,
          customer_id: params.customerId,
          store_id: params.storeId,
          amount: params.amount,
          concept: params.concept,
          notes: params.notes,
          status: params.status || 'active',
        },
      },
    };

    // Intentar primero con la función desplegada 'push-notifications' y luego fallback a 'push-notification'
    let res = await supabase.functions.invoke('push-notifications', payload);

    if (res.error) {
      console.log('[notifyCustomerMovement] Fallback probando push-notification singular...');
      res = await supabase.functions.invoke('push-notification', payload);
    }

    if (res.error) {
      console.warn('[notifyCustomerMovement] Error invocando Edge Function:', res.error.message);
      return { success: false, message: res.error.message };
    }

    console.log('[notifyCustomerMovement] Respuesta de la Edge Function:', res.data);
    return { success: true, sent: res.data?.sent ?? 0, message: res.data?.message };
  } catch (err: any) {
    console.warn('[notifyCustomerMovement] Error inesperado en notificación:', err);
    return { success: false, message: err?.message };
  }
}
