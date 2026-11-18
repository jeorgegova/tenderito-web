import AsyncStorage from '../lib/asyncStorage';
import { supabase } from '../lib/supabase';
import type { UserStore } from '../types';
import { getDbConnection, getData, executeQuery } from '../database/db';
import { getConfigParam, saveConfigParam } from '../database/tables/metadata';

const ACTIVE_STORE_KEY = '@tenderito_active_store_id';
const LAST_USER_KEY = '@tenderito_last_user_id';

// Inicialización sincrónica inmediata desde localStorage para carga en 0ms
let memoryStoreId: string | null = (() => {
  try {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(ACTIVE_STORE_KEY);
      if (stored && stored.trim() !== '' && stored !== 'null') {
        return stored;
      }
    }
  } catch {}
  return null;
})();

let initPromise: Promise<string | null> | null = null;

function withTimeout<T>(promise: PromiseLike<T>, ms: number, fallback: T): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<T>(resolve => {
    timer = setTimeout(() => resolve(fallback), ms);
  });
  return Promise.race([
    Promise.resolve(promise).then(res => {
      clearTimeout(timer);
      return res;
    }),
    timeoutPromise,
  ]);
}

/**
 * Obtiene el ID de la tienda activa actual.
 */
export async function getActiveStoreId(): Promise<string | null> {
  if (memoryStoreId) {
    return memoryStoreId;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      // 1. Intentar leer desde AsyncStorage (rápido y offline)
      const stored = await AsyncStorage.getItem(ACTIVE_STORE_KEY);
      if (stored && stored.trim() !== '' && stored !== 'null') {
        memoryStoreId = stored;
        return memoryStoreId;
      }

      // 2. Fallback Offline: Buscar en SQLite
      try {
        const db = await getDbConnection();

        // 2a. Parametrización local
        const cfgStore = await getConfigParam(db, 'active_store_id');
        if (cfgStore && cfgStore.trim() !== '' && cfgStore !== 'null') {
          memoryStoreId = cfgStore;
          await AsyncStorage.setItem(ACTIVE_STORE_KEY, cfgStore);
          return memoryStoreId;
        }

        // 2b. Tabla customers local
        const custStore = await getData(
          db,
          "SELECT store_id FROM customers WHERE store_id IS NOT NULL AND store_id != '' AND store_id != 'null' LIMIT 1;",
        );
        if (custStore.length > 0 && custStore[0].store_id) {
          const storeFound: string = custStore[0].store_id;
          memoryStoreId = storeFound;
          await AsyncStorage.setItem(ACTIVE_STORE_KEY, storeFound);
          await saveConfigParam(db, 'active_store_id', storeFound);
          return memoryStoreId;
        }

        // 2c. Tabla credits local
        const credStore = await getData(
          db,
          "SELECT store_id FROM credits WHERE store_id IS NOT NULL AND store_id != '' AND store_id != 'null' LIMIT 1;",
        );
        if (credStore.length > 0 && credStore[0].store_id) {
          const storeFound: string = credStore[0].store_id;
          memoryStoreId = storeFound;
          await AsyncStorage.setItem(ACTIVE_STORE_KEY, storeFound);
          await saveConfigParam(db, 'active_store_id', storeFound);
          return memoryStoreId;
        }
      } catch (_sqlErr) {}

      // 3. Si no hay tienda guardada localmente, consultar en Supabase con timeout estricto de 2.5s
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;

      if (!user) {
        return null;
      }

      const { data, error } = await withTimeout(
        supabase
          .from('store_memberships')
          .select('store_id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle(),
        2500,
        { data: null, error: new Error('Timeout consultando tienda') } as any,
      );

      if (!error && data?.store_id) {
        memoryStoreId = data.store_id;
        await AsyncStorage.setItem(ACTIVE_STORE_KEY, data.store_id);
        try {
          const db = await getDbConnection();
          await saveConfigParam(db, 'active_store_id', data.store_id);
        } catch (_dbErr) {}
        return memoryStoreId;
      }

      // 3b. Fallback: Buscar en stores donde owner_id = user.id
      const { data: storeOwner } = await withTimeout(
        supabase
          .from('stores')
          .select('id')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle(),
        2500,
        { data: null, error: null } as any,
      );

      if (storeOwner?.id) {
        memoryStoreId = storeOwner.id;
        await AsyncStorage.setItem(ACTIVE_STORE_KEY, storeOwner.id);
        try {
          const db = await getDbConnection();
          await saveConfigParam(db, 'active_store_id', storeOwner.id);
        } catch (_dbErr) {}
        return memoryStoreId;
      }
    } catch (_e) {
      // Sin red o error al consultar Supabase
    } finally {
      initPromise = null;
    }
    return null;
  })();

  return initPromise;
}

/**
 * Establece la tienda activa actual.
 */
export async function setActiveStoreId(storeId: string): Promise<void> {
  memoryStoreId = storeId;
  try {
    await AsyncStorage.setItem(ACTIVE_STORE_KEY, storeId);
    const db = await getDbConnection();
    await saveConfigParam(db, 'active_store_id', storeId);

    if (storeId) {
      await executeQuery(
        db,
        "UPDATE customers SET store_id = ? WHERE store_id IS NULL OR store_id = '' OR store_id = 'null';",
        [storeId],
      );
      await executeQuery(
        db,
        "UPDATE credits SET store_id = ? WHERE store_id IS NULL OR store_id = '' OR store_id = 'null';",
        [storeId],
      );
      await executeQuery(
        db,
        "UPDATE payments SET store_id = ? WHERE store_id IS NULL OR store_id = '' OR store_id = 'null';",
        [storeId],
      );
    }
  } catch (e: any) {
    console.warn('[storeContext] Error guardando tienda activa:', e?.message);
  }
}

/**
 * Limpia el caché en memoria y la persistencia de la tienda activa.
 */
export async function clearStoreContext(): Promise<void> {
  memoryStoreId = null;
  initPromise = null;
  try {
    await AsyncStorage.removeItem(ACTIVE_STORE_KEY);
    const db = await getDbConnection();
    await saveConfigParam(db, 'active_store_id', '');
  } catch (_e) {}
}

/**
 * Consulta todas las tiendas a las que tiene acceso el usuario autenticado.
 */
export async function fetchUserStores(): Promise<UserStore[]> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return [];

    const { data, error } = await withTimeout(
      supabase
        .from('store_memberships')
        .select('store_id, role, stores(id, store_name, phone, address, subscription_plan)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true }),
      3000,
      { data: null, error: new Error('Timeout consultando tiendas') } as any,
    );

    if (error || !data) {
      return [];
    }

    return (data as any[]).map(row => {
      const s = row.stores || {};
      return {
        store_id: row.store_id,
        role: row.role || 'owner',
        store_name: s.store_name || 'Mi Tienda',
        phone: s.phone || null,
        address: s.address || null,
        subscription_plan: s.subscription_plan || 'free',
      };
    });
  } catch (_e) {
    return [];
  }
}

/**
 * Obtiene el ID del último usuario autenticado que utilizó el almacenamiento local.
 */
export async function getLastAuthUserId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(LAST_USER_KEY);
  } catch (_e) {
    return null;
  }
}

/**
 * Guarda o limpia el ID del usuario actualmente asociado a los datos locales.
 */
export async function setLastAuthUserId(userId: string | null): Promise<void> {
  try {
    if (userId) {
      await AsyncStorage.setItem(LAST_USER_KEY, userId);
    } else {
      await AsyncStorage.removeItem(LAST_USER_KEY);
    }
  } catch (_e) {}
}
