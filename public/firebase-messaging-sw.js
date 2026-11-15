/* ============================================================
 * Tenderito — Service Worker para Firebase Cloud Messaging & Web Push
 * Compatible con Android, iOS PWA (16.4+), macOS y Windows.
 * ============================================================ */

// 1. Manejo prioritario de clics en notificaciones
// Se registra antes de inicializar Firebase para garantizar que el clic
// siempre abra o enfoque la aplicación Tenderito correctamente.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const rawData = event.notification.data || {};
  const targetUrl =
    rawData.url ||
    rawData.fcmOptions?.link ||
    rawData.link ||
    '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Si la ventana ya está abierta en el mismo origen, enfocarla
      for (const client of windowClients) {
        if ('focus' in client && client.url && client.url.includes(self.location.origin)) {
          client.focus();
          if ('navigate' in client && targetUrl !== '/') {
            client.navigate(targetUrl);
          }
          return;
        }
      }
      // Si no hay ventana abierta, abrir la PWA en la ruta indicada
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// 2. Importar scripts de Firebase compat de forma segura
try {
  importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');
} catch (importErr) {
  console.warn('[SW] No se pudieron cargar los scripts externos de Firebase:', importErr);
}

// 3. Configuración del proyecto Firebase (mismo que React Native)
const firebaseConfig = {
  apiKey: "AIzaSyB16i2EvubMIjBjqXh0wN3Vxitm9Lh1rlk",
  authDomain: "tenderito-5c02d.firebaseapp.com",
  projectId: "tenderito-5c02d",
  storageBucket: "tenderito-5c02d.firebasestorage.app",
  messagingSenderId: "584972929801",
  appId: "1:584972929801:web:c6d7e8f9a0b1c2d3"
};

// 4. Inicializar Firebase Messaging en el Service Worker
if (typeof firebase !== 'undefined') {
  try {
    if (!firebase.apps || !firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    const messaging = firebase.messaging();

    // Procesamiento en segundo plano:
    // NOTA CLAVE: Si el mensaje contiene un payload `notification`, Firebase Web SDK
    // lo muestra automáticamente en segundo plano. NO debemos llamar a showNotification
    // adicionalmente en ese caso para evitar notificaciones duplicadas.
    // Solo mostramos la notificación cuando el mensaje sea exclusivamente de tipo "data".
    messaging.onBackgroundMessage((payload) => {
      console.log('[SW] Mensaje FCM en segundo plano recibido:', payload);

      if (!payload.notification && payload.data) {
        const data = payload.data;
        const title = data.title || 'Tenderito';
        const body = data.body || 'Nuevo movimiento registrado en tu libreta.';
        const icon = data.icon || '/logo.png';
        const badge = data.badge || '/favicon.svg';

        self.registration.showNotification(title, {
          body,
          icon,
          badge,
          data,
          tag: data.tag || 'tenderito-bg-' + Date.now(),
          vibrate: [200, 100, 200],
        });
      }
    });
  } catch (initErr) {
    console.warn('[SW] Error inicializando Firebase Messaging en SW:', initErr);
  }
}

// 5. Manejo de cierre de notificación
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notificación cerrada:', event.notification.tag);
});
