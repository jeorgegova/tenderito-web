import { initializeApp, getApps, getApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { supabase } from '../lib/supabase';
import { register_fcm_token } from './deviceService';
import { queryClient } from '../lib/queryClient';
import { showAlert } from '../utils/alert';

// Configuración de Firebase Web leída exclusivamente de variables de entorno
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

// Clave pública VAPID configurada mediante variable de entorno
export const FIREBASE_VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';

// Inicialización segura y singleton de Firebase App
export function getFirebaseApp() {
  if (getApps().length > 0) {
    return getApp();
  }
  return initializeApp(firebaseConfig);
}

// Estructura de diagnóstico de soporte de notificaciones
export interface PushSupportStatus {
  supported: boolean;
  isStandalone: boolean;
  isIOS: boolean;
  needsInstallOnIOS: boolean;
  isSecureContext: boolean;
  permission: NotificationPermission | 'unsupported';
  reason?: string;
}

/**
 * Diagnostica detalladamente si el navegador y dispositivo admiten Web Push.
 */
export function checkPushNotificationSupport(): PushSupportStatus {
  if (typeof window === 'undefined') {
    return {
      supported: false,
      isStandalone: false,
      isIOS: false,
      needsInstallOnIOS: false,
      isSecureContext: false,
      permission: 'unsupported',
      reason: 'Entorno sin interfaz visual (SSR)',
    };
  }

  const isLocalhost =
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1' ||
    location.hostname === '0.0.0.0';
  const isSecure = window.isSecureContext || location.protocol === 'https:' || isLocalhost;

  const ua = navigator.userAgent;
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true;

  // En iOS (16.4+), las notificaciones Push Web SOLO funcionan si la PWA fue agregada a la pantalla de inicio
  const needsInstallOnIOS = isIOS && !isStandalone;

  const hasNotificationAPI = 'Notification' in window;
  const hasServiceWorker = 'serviceWorker' in navigator;
  const hasPushManager = 'PushManager' in window;

  const supported =
    isSecure && hasNotificationAPI && hasServiceWorker && hasPushManager && !needsInstallOnIOS;

  let permission: NotificationPermission | 'unsupported' = 'unsupported';
  if (hasNotificationAPI) {
    try {
      permission = Notification.permission;
    } catch (_e) {
      permission = 'unsupported';
    }
  }

  let reason: string | undefined;
  if (!isSecure) {
    reason = 'Se requiere una conexión HTTPS segura para Web Push.';
  } else if (needsInstallOnIOS) {
    reason = 'En iPhone y iPad, debes agregar Tenderito a la pantalla de inicio para recibir notificaciones.';
  } else if (!hasNotificationAPI || !hasServiceWorker || !hasPushManager) {
    reason = 'Este navegador no soporta la API estándar de notificaciones Push.';
  }

  return {
    supported,
    isStandalone,
    isIOS,
    needsInstallOnIOS,
    isSecureContext: isSecure,
    permission,
    reason,
  };
}

/**
 * Obtiene el registro activo del Service Worker de la PWA.
 */
export async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    // 1. Verificar si ya hay un registro activo en el scope raíz
    const existing = await navigator.serviceWorker.getRegistration('/');
    if (existing && existing.active) {
      return existing;
    }

    // 2. Si no hay registro activo aún, esperar a que el SW esté listo
    return await navigator.serviceWorker.ready;
  } catch (err) {
    console.warn('[notifications] Error resolviendo Service Worker Registration:', err);
    return null;
  }
}

/**
 * Reproduce un tono de campana suave y limpio mediante Web Audio API
 */
export function playNotificationChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now); // Re (D5)
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.1); // La (A5)

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.45);
  } catch (_e) {
    // Si el navegador requiere interacción previa para audio, no falla
  }
}

/**
 * Solicita permisos de notificación mediante un gesto explícito del usuario (onClick).
 * Requisito estricto de Apple iOS WebKit y navegadores modernos.
 */
export async function requestNotificationPermissionManually(): Promise<{
  success: boolean;
  status: PushSupportStatus;
  token?: string;
  message?: string;
}> {
  const status = checkPushNotificationSupport();

  if (status.needsInstallOnIOS) {
    return {
      success: false,
      status,
      message:
        'En iPhone (iOS 16.4+), debes agregar Tenderito a tu pantalla de inicio: toca el botón Compartir de Safari (icono con flecha arriba) y selecciona "Agregar al inicio". Abre la app desde tu pantalla de inicio para activar las notificaciones.',
    };
  }

  if (!status.isSecureContext) {
    return {
      success: false,
      status,
      message:
        'Se requiere una conexión HTTPS segura para activar notificaciones push en este dispositivo.',
    };
  }

  if (!('Notification' in window)) {
    return {
      success: false,
      status,
      message: 'Este navegador no tiene soporte para notificaciones del sistema.',
    };
  }

  try {
    const permissionResult = await Notification.requestPermission();
    const updatedStatus = checkPushNotificationSupport();

    if (permissionResult === 'granted') {
      playNotificationChime();
      const token = await setupWebPushNotifications();
      return {
        success: true,
        status: updatedStatus,
        token: token || undefined,
        message: '¡Notificaciones activadas exitosamente!',
      };
    } else if (permissionResult === 'denied') {
      return {
        success: false,
        status: updatedStatus,
        message:
          'El permiso de notificaciones fue bloqueado en este navegador. Puedes reactivarlo en la configuración de permisos del sitio.',
      };
    } else {
      return {
        success: false,
        status: updatedStatus,
        message: 'No se concedió el permiso de notificaciones.',
      };
    }
  } catch (err: any) {
    return {
      success: false,
      status,
      message: err?.message || 'Error solicitando permisos de notificación.',
    };
  }
}

let foregroundListenerAttached = false;

/**
 * Registra o sincroniza el token FCM en Supabase para el usuario autenticado.
 * Solo se ejecuta si el permiso ya fue concedido previamente.
 */
export async function setupWebPushNotifications(): Promise<string | null> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return null;
  }

  if (Notification.permission !== 'granted') {
    return null;
  }

  try {
    const supported = await isSupported().catch(() => false);
    if (!supported) {
      console.warn('[notifications] Firebase Messaging no soportado en este navegador.');
      return null;
    }

    const app = getFirebaseApp();
    const messaging = getMessaging(app);

    // Obtener Service Worker de la PWA
    const swReg = await getServiceWorkerRegistration();

    const tokenOptions: { serviceWorkerRegistration?: ServiceWorkerRegistration; vapidKey?: string } = {};
    if (swReg) {
      tokenOptions.serviceWorkerRegistration = swReg;
    }
    if (FIREBASE_VAPID_KEY) {
      tokenOptions.vapidKey = FIREBASE_VAPID_KEY;
    }

    console.log(
      '[notifications] Obteniendo token FCM...',
      FIREBASE_VAPID_KEY ? 'con clave VAPID' : 'sin clave VAPID explícita',
    );

    let token: string | null = null;
    try {
      token = await getToken(messaging, tokenOptions);
    } catch (tokenErr: any) {
      console.warn('[notifications] Error al obtener token FCM de Firebase:', tokenErr);
      if (!FIREBASE_VAPID_KEY) {
        console.warn(
          '[notifications] Para obtener tokens Web Push válidos en navegadores, configura VITE_FIREBASE_VAPID_KEY en tu archivo .env.',
        );
      }
      return null;
    }

    if (token) {
      console.log('[notifications] Token FCM Web obtenido con éxito:', token.substring(0, 15) + '...');
      await register_fcm_token(token);
    }

    // Escuchador de notificaciones en primer plano de Firebase (Foreground)
    if (!foregroundListenerAttached) {
      foregroundListenerAttached = true;
      onMessage(messaging, payload => {
        console.log('[notifications] Mensaje FCM recibido en primer plano:', payload);
        const title = payload.notification?.title || payload.data?.title || 'Tenderito';
        const body =
          payload.notification?.body ||
          payload.data?.body ||
          'Tienes un nuevo movimiento en tu libreta.';

        showLocalNotification(title, body, payload.data);
        queryClient.invalidateQueries({ queryKey: ['customer-portal'] });
        queryClient.invalidateQueries({ queryKey: ['customers'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      });
    }

    return token;
  } catch (error) {
    console.warn('[notifications] Error en setupWebPushNotifications:', error);
    return null;
  }
}

// Control de duplicados en ventana de tiempo corta (4 segundos)
const recentNotificationKeys = new Set<string>();

/**
 * Muestra la notificación en el sistema Y en un banner interactivo dentro de la app.
 * Evita duplicar alertas idénticas recibidas por múltiples canales simultáneos.
 */
export function showLocalNotification(title: string, body: string, data?: any) {
  const dedupeKey = `${title}|${body}|${data?.movementId || data?.credit_id || data?.payment_id || ''}`;
  if (recentNotificationKeys.has(dedupeKey)) {
    return;
  }
  recentNotificationKeys.add(dedupeKey);
  setTimeout(() => recentNotificationKeys.delete(dedupeKey), 4000);

  playNotificationChime();

  // 1. Despachar evento para el banner flotante in-app (funciona siempre que la app está abierta)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('tenderito-in-app-notification', {
        detail: { title, body, data },
      }),
    );
  }

  // 2. Si el sistema tiene permisos concedidos y la app NO está activa en primer plano, mostrar notificación del sistema
  try {
    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted' &&
      document.visibilityState !== 'visible'
    ) {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(reg => {
          reg.showNotification(title, {
            body,
            icon: '/logo.png',
            badge: '/favicon.svg',
            data,
            tag: 'tenderito-push-' + (data?.movementId || Date.now()),
            vibrate: [200, 100, 200],
          } as NotificationOptions);
        });
      }
    }
  } catch (err) {
    console.warn('[notifications] Error mostrando notificación del sistema:', err);
  }
}

/**
 * Envía una notificación de prueba local para validar audio y banners.
 */
export function sendTestNotification(): void {
  showLocalNotification(
    'Notificación de prueba 🔔',
    '¡Las notificaciones de Tenderito están activas y funcionando correctamente en este dispositivo!',
    { test: true, url: '/' },
  );
}

interface RealtimeChannelEntry {
  channel: any;
  refCount: number;
}

const activeRealtimeChannels = new Map<string, RealtimeChannelEntry>();

/**
 * Hook / inicializador en tiempo real mediante Supabase Realtime
 * Escucha cambios en 'credits', 'payments' y broadcasts directos
 * para que el cliente reciba la notificación y sonido al instante.
 * Implementa conteo de referencias para evitar duplicidad o errores
 * al re-suscribir el mismo canal desde distintos componentes.
 */
export function setupRealtimeCustomerAlerts(params: string | { userId?: string; customerId?: string }) {
  const userId = typeof params === 'string' ? params : params?.userId;
  const customerId = typeof params === 'string' ? undefined : params?.customerId;

  // Deduplicar identificadores únicos
  const identifiers = Array.from(new Set([userId, customerId].filter(Boolean))) as string[];
  if (identifiers.length === 0) return () => {};

  console.log('[realtime] Conectando canal de notificaciones para:', identifiers);

  const subscribedKeys: string[] = [];

  identifiers.forEach(id => {
    const channelName = `customer-realtime-${id}`;

    // Si ya existe un canal suscrito activo para este identificador, incrementar referencia y reutilizarlo
    const existing = activeRealtimeChannels.get(channelName);
    if (existing) {
      existing.refCount += 1;
      subscribedKeys.push(channelName);
      return;
    }

    try {
      // Si Supabase ya tenía un canal huérfano con este topic, removerlo antes de crear uno nuevo
      const orphanChannel = supabase
        .getChannels()
        .find(c => c.topic === `realtime:${channelName}` || c.topic === channelName);

      if (orphanChannel) {
        try {
          supabase.removeChannel(orphanChannel);
        } catch (_remErr) {
          // Ignorar fallo al remover canal huérfano
        }
      }

      const ch = supabase
        .channel(channelName)
        .on('broadcast', { event: 'movement' }, payload => {
          const data = payload?.payload as any;
          console.log('[realtime] Broadcast recibido:', data);
          const isPayment = data?.type === 'payment';
          const amount = Number(data?.amount || 0);
          const formattedAmount = `$${amount.toLocaleString('es-CO')}`;
          const concept = data?.concept ? ` (${data.concept})` : '';

          const title = isPayment ? 'Abono registrado 💳' : 'Nuevo fiado registrado 🛒';
          const body = isPayment
            ? `Se registró un abono a tu cuenta por ${formattedAmount}. ¡Gracias por tu pago!`
            : `Se registró un fiado de ${formattedAmount}${concept}. Tu saldo ha sido actualizado.`;

          showLocalNotification(title, body, data);
          queryClient.invalidateQueries({ queryKey: ['customer-portal'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          queryClient.invalidateQueries({ queryKey: ['customers'] });
        })
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'credits',
          },
          payload => {
            const newRecord = payload?.new as any;
            if (!newRecord) return;
            // Filtrar para no alertar de transacciones de otros clientes
            if (
              newRecord.customer_id &&
              customerId &&
              newRecord.customer_id !== customerId &&
              newRecord.customer_id !== id
            ) {
              return;
            }
            console.log('[realtime] Nuevo fiado detectado:', newRecord);
            const amount = Number(newRecord.amount || 0);
            const formattedAmount = `$${amount.toLocaleString('es-CO')}`;
            const concept = newRecord.concept ? ` (${newRecord.concept})` : '';

            showLocalNotification(
              'Nuevo fiado registrado 🛒',
              `Se registró un fiado de ${formattedAmount}${concept}. Tu saldo ha sido actualizado.`,
              newRecord,
            );
            queryClient.invalidateQueries({ queryKey: ['customer-portal'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['customers'] });
          },
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'payments',
          },
          payload => {
            const newRecord = payload?.new as any;
            if (!newRecord) return;
            // Filtrar para no alertar de transacciones de otros clientes
            if (
              newRecord.customer_id &&
              customerId &&
              newRecord.customer_id !== customerId &&
              newRecord.customer_id !== id
            ) {
              return;
            }
            console.log('[realtime] Nuevo abono detectado:', newRecord);
            const amount = Number(newRecord.amount || 0);
            const formattedAmount = `$${amount.toLocaleString('es-CO')}`;

            showLocalNotification(
              'Abono registrado 💳',
              `Se registró un abono a tu cuenta por ${formattedAmount}. ¡Gracias por tu pago!`,
              newRecord,
            );
            queryClient.invalidateQueries({ queryKey: ['customer-portal'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['customers'] });
          },
        );

      ch.subscribe((status, err) => {
        if (err) {
          console.warn(`[realtime] Error al suscribir canal ${channelName}:`, err);
        }
      });

      activeRealtimeChannels.set(channelName, { channel: ch, refCount: 1 });
      subscribedKeys.push(channelName);
    } catch (channelErr) {
      console.warn(`[realtime] No se pudo inicializar canal para id ${id}:`, channelErr);
    }
  });

  return () => {
    subscribedKeys.forEach(channelName => {
      const entry = activeRealtimeChannels.get(channelName);
      if (!entry) return;
      entry.refCount -= 1;
      if (entry.refCount <= 0) {
        try {
          supabase.removeChannel(entry.channel);
        } catch (_e) {
          // Ignorar fallo al remover canal
        }
        activeRealtimeChannels.delete(channelName);
      }
    });
  };
}
