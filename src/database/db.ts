import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import { runMigrations } from './migrations';

let SQL: SqlJsStatic | null = null;
let dbInstance: any = null;
let initPromise: Promise<any> | null = null;
let saveTimeout: any = null;

const IDB_NAME = 'tenderito_pwa_db';
const IDB_STORE = 'sqlite_storage';
const IDB_KEY = 'tenderito_wasm_db';

/** Abre IndexedDB para almacenar el archivo SQLite binario de forma persistente */
function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Carga el binario de la base de datos guardado */
async function loadDbFromIndexedDB(): Promise<Uint8Array | null> {
  try {
    const idb = await openIndexedDB();
    return new Promise((resolve) => {
      const tx = idb.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(IDB_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (_e) {
    return null;
  }
}

/** Guarda el binario de la base de datos a IndexedDB */
async function saveDbToIndexedDB(data: Uint8Array): Promise<void> {
  try {
    const idb = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = idb.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      const req = store.put(data, IDB_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (_e) {}
}

function persistDb(db: Database) {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try {
      const binary = db.export();
      saveDbToIndexedDB(binary);
    } catch (e) {
      console.warn('[DB] Error exportando base de datos a IndexedDB:', e);
    }
  }, 200);
}

/**
 * Adaptador compatible con la interfaz de QuickSQLiteConnection
 */
class WebSQLiteConnection {
  private rawDb: Database;

  constructor(db: Database) {
    this.rawDb = db;
  }

  async executeAsync(query: string, params: any[] = []): Promise<{ rows: { length: number; item: (index: number) => any } }> {
    const trimmed = query.trim().toUpperCase();
    const isSelect = trimmed.startsWith('SELECT') || trimmed.startsWith('PRAGMA') || trimmed.startsWith('EXPLAIN');

    if (isSelect) {
      const stmt = this.rawDb.prepare(query);
      if (params && params.length > 0) {
        stmt.bind(params);
      }
      const rows: any[] = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      stmt.free();
      return {
        rows: {
          length: rows.length,
          item: (i: number) => rows[i],
        },
      };
    } else {
      this.rawDb.run(query, params);
      persistDb(this.rawDb);
      return {
        rows: {
          length: 0,
          item: () => null,
        },
      };
    }
  }

  export() {
    return this.rawDb.export();
  }
}

/**
 * Obtiene o inicializa la conexión con la base de datos local SQLite en WebAssembly.
 * Ejecuta migraciones de manera idempotente.
 */
export async function getDbConnection(): Promise<WebSQLiteConnection> {
  if (dbInstance) {
    return dbInstance;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      if (!SQL) {
        SQL = await initSqlJs({
          locateFile: () => '/sql-wasm.wasm',
        });
      }

      const savedData = await loadDbFromIndexedDB();
      const rawDb = savedData ? new SQL.Database(savedData) : new SQL.Database();
      const conn = new WebSQLiteConnection(rawDb);

      await runMigrations(conn);
      dbInstance = conn;
      return dbInstance;
    } catch (error) {
      initPromise = null;
      console.error('[DB] Falló inicialización de SQLite WASM:', error);
      throw error;
    }
  })();

  return initPromise;
}

/**
 * Ejecuta una consulta SELECT y retorna un arreglo plano de objetos JavaScript.
 */
export async function getData<T = any>(
  db: WebSQLiteConnection,
  query: string,
  params: any[] = [],
): Promise<T[]> {
  const result = await db.executeAsync(query, params);
  const rows: T[] = [];
  if (result?.rows) {
    const len = result.rows.length;
    for (let i = 0; i < len; i++) {
      rows.push(result.rows.item(i) as T);
    }
  }
  return rows;
}

/**
 * Ejecuta una consulta de escritura (INSERT, UPDATE, DELETE).
 */
export async function executeQuery(
  db: WebSQLiteConnection,
  query: string,
  params: any[] = [],
) {
  return await db.executeAsync(query, params);
}

/**
 * Ejecuta un bloque de operaciones dentro de una transacción atómica SQLite.
 */
export async function executeInTransaction(
  db: WebSQLiteConnection,
  fn: () => Promise<void>,
): Promise<void> {
  await db.executeAsync('BEGIN TRANSACTION;');
  try {
    await fn();
    await db.executeAsync('COMMIT;');
  } catch (err) {
    try {
      await db.executeAsync('ROLLBACK;');
    } catch (_rbErr) {}
    throw err;
  }
}

/**
 * Limpia las tablas locales de datos de negocio al cerrar sesión
 */
export async function clearLocalDatabase() {
  try {
    const db = await getDbConnection();
    await executeQuery(db, 'DELETE FROM payments;');
    await executeQuery(db, 'DELETE FROM credits;');
    await executeQuery(db, 'DELETE FROM customers;');
    await executeQuery(db, "DELETE FROM parametrizacion WHERE nombre != 'schema_version';");
  } catch (e: any) {
    console.warn('[DB] Error limpiando base de datos local:', e?.message);
  }
}
