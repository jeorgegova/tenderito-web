import {getDbConnection, getData} from '../database/db';
import {getActiveStoreId} from './storeContext';
import {BOGOTA_TZ} from '../utils/format';

export interface StatsFilters {
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
  customerIds?: string[];
}

export interface CustomerStatRow {
  customer_id: string;
  name: string;
  alias: string | null;
  total_credits: number;
  total_payments: number;
  balance: number;
}

export interface StatsResult {
  totalCredits: number;
  totalPayments: number;
  netBalance: number;
  customerCount: number;
  rows: CustomerStatRow[];
}

/**
 * Normaliza cualquier formato de fecha/timestamp a 'YYYY-MM-DD' en la zona horaria de Colombia.
 */
function toBogotaYMD(value: any): string {
  if (!value) return '';
  const str = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  try {
    const d = new Date(str);
    if (isNaN(d.getTime())) {
      return str.length >= 10 && str[4] === '-' && str[7] === '-' ? str.slice(0, 10) : '';
    }
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: BOGOTA_TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  } catch (_e) {
    return str.slice(0, 10);
  }
}

/**
 * Cálculo offline de estadísticas a partir de la base de datos local SQLite.
 */
async function fetchStatsOffline(filters: StatsFilters): Promise<StatsResult> {
  try {
    const activeStoreId = await getActiveStoreId();
    const db = await getDbConnection();
    const {from, to, customerIds} = filters;

    // Clientes para mapear balances y nombres
    let custSql =
      'SELECT local_id, server_id, name, alias, current_balance FROM customers';
    const custParams: any[] = [];
    if (activeStoreId) {
      custSql +=
        ' WHERE store_id = ? OR store_id IS NULL OR store_id = "" OR store_id = "null"';
      custParams.push(activeStoreId);
    }
    const custRows = await getData(db, custSql, custParams).catch(() => []);
    const custMap = new Map<string, any>();
    for (const c of custRows) {
      if (c.local_id) custMap.set(c.local_id, c);
      if (c.server_id) custMap.set(c.server_id, c);
    }

    // 1. Créditos locales (consultar de forma resiliente)
    let credSql = 'SELECT * FROM credits WHERE 1=1';
    const credParams: any[] = [];
    if (activeStoreId) {
      credSql +=
        ' AND (store_id = ? OR store_id IS NULL OR store_id = "" OR store_id = "null")';
      credParams.push(activeStoreId);
    }
    const rawCredits = await getData(db, credSql, credParams).catch(async () => {
      return getData(db, 'SELECT * FROM credits;', []).catch(() => []);
    });

    // 2. Abonos locales (consultar de forma resiliente)
    let paySql = 'SELECT * FROM payments WHERE 1=1';
    const payParams: any[] = [];
    if (activeStoreId) {
      paySql +=
        ' AND (store_id = ? OR store_id IS NULL OR store_id = "" OR store_id = "null")';
      payParams.push(activeStoreId);
    }
    const rawPayments = await getData(db, paySql, payParams).catch(async () => {
      return getData(db, 'SELECT * FROM payments;', []).catch(() => []);
    });

    // Filtrar en memoria por fecha y descartar cancelados de forma segura
    const creditsData = (rawCredits ?? []).filter((r: any) => {
      if (r.status === 'cancelled') return false;
      const ymd = toBogotaYMD(r.created_at);
      if (from && (!ymd || ymd < from)) return false;
      if (to && (!ymd || ymd > to)) return false;
      return true;
    });

    const paymentsData = (rawPayments ?? []).filter((r: any) => {
      if (r.status === 'cancelled') return false;
      const ymd = toBogotaYMD(r.payment_date || r.created_at);
      if (from && (!ymd || ymd < from)) return false;
      if (to && (!ymd || ymd > to)) return false;
      return true;
    });

    const map: Record<string, CustomerStatRow> = {};

    for (const row of creditsData) {
      const cid = row.customer_id;
      const cust = custMap.get(cid);
      const isSelected =
        !customerIds?.length ||
        customerIds.includes(cid) ||
        (cust && (customerIds.includes(cust.local_id) || customerIds.includes(cust.server_id)));
      if (!isSelected) continue;

      const key = cust?.server_id || cust?.local_id || cid;

      if (!map[key]) {
        map[key] = {
          customer_id: key,
          name: cust?.name ?? 'Cliente',
          alias: cust?.alias ?? null,
          total_credits: 0,
          total_payments: 0,
          balance: Number(cust?.current_balance || 0),
        };
      }
      map[key].total_credits += Number(row.amount || 0);
    }

    for (const row of paymentsData) {
      const cid = row.customer_id;
      const cust = custMap.get(cid);
      const isSelected =
        !customerIds?.length ||
        customerIds.includes(cid) ||
        (cust && (customerIds.includes(cust.local_id) || customerIds.includes(cust.server_id)));
      if (!isSelected) continue;

      const key = cust?.server_id || cust?.local_id || cid;

      if (!map[key]) {
        map[key] = {
          customer_id: key,
          name: cust?.name ?? 'Cliente',
          alias: cust?.alias ?? null,
          total_credits: 0,
          total_payments: 0,
          balance: Number(cust?.current_balance || 0),
        };
      }
      map[key].total_payments += Number(row.amount || 0);
    }

    const rows = Object.values(map).sort((a, b) => b.balance - a.balance);
    const totalCredits = rows.reduce((s, r) => s + r.total_credits, 0);
    const totalPayments = rows.reduce((s, r) => s + r.total_payments, 0);
    const netBalance = rows.reduce((s, r) => s + r.balance, 0);

    return {
      totalCredits,
      totalPayments,
      netBalance,
      customerCount: rows.length,
      rows,
    };
  } catch (error) {
    console.error('[Stats] Error al obtener estadísticas:', error);
    return {
      totalCredits: 0,
      totalPayments: 0,
      netBalance: 0,
      customerCount: 0,
      rows: [],
    };
  }
}

/**
 * Consulta de estadísticas: SQLite como fuente única de verdad.
 * Se calcula instantáneamente de manera local, garantizando disponibilidad 100% offline
 * y cero consumo innecesario de peticiones o egress en Supabase.
 */
export async function fetchStats(filters: StatsFilters = {}): Promise<StatsResult> {
  return fetchStatsOffline(filters);
}
