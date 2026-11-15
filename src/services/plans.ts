import { getDbConnection } from '../database/db';
import { getConfigParam } from '../database/tables/metadata';
import {
  getLocalSubscriptionPlans,
  insertOrReplaceSubscriptionPlan,
} from '../database/tables/plans';
import { supabase } from '../lib/supabase';
import type { Profile, SubscriptionPlanItem } from '../types';
import { showAlert } from '../components/ui/AlertModal';
import { formatDateDisplay, getBogotaTodayYMD, toBogotaDate, BOGOTA_TZ } from '../utils/format';

export const DEFAULT_PLANS: SubscriptionPlanItem[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Hasta 10 clientes · Vitalicio',
    price: 0,
    price_text: '$0',
    customer_limit: 10,
    badge: null,
    sort_order: 1,
    is_active: true,
  },
  {
    id: 'basic',
    name: 'Basic',
    description: 'Hasta 100 clientes',
    price: 29900,
    price_text: '$29.900/mes',
    customer_limit: 100,
    badge: 'Popular',
    sort_order: 2,
    is_active: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Clientes ilimitados + funciones avanzadas',
    price: 59900,
    price_text: '$59.900/mes',
    customer_limit: 999999,
    badge: 'Recomendado',
    sort_order: 3,
    is_active: true,
  },
];

export const DEFAULT_SUPPORT_WHATSAPP = '573001234567';
export const DEFAULT_GRACE_PERIOD_DAYS = 10;

/**
 * Obtiene los planes de suscripción desde SQLite local o Supabase remoto.
 */
export async function fetchSubscriptionPlans(): Promise<SubscriptionPlanItem[]> {
  try {
    const db = await getDbConnection();
    const localPlans = await getLocalSubscriptionPlans(db);
    if (localPlans.length > 0) {
      return localPlans;
    }

    // Si localmente no hay planes, consultar Supabase
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (!error && data && data.length > 0) {
      for (const p of data) {
        await insertOrReplaceSubscriptionPlan(db, p);
      }
      return data;
    }
  } catch (_e) {}

  return DEFAULT_PLANS;
}

/**
 * Obtiene el teléfono de WhatsApp de soporte configurado.
 */
export async function getSupportWhatsApp(): Promise<string> {
  try {
    const db = await getDbConnection();
    const phone = await getConfigParam(db, 'support_whatsapp');
    if (phone && phone.trim().length > 0) {
      return phone.trim();
    }
  } catch (_e) {}
  return DEFAULT_SUPPORT_WHATSAPP;
}

/**
 * Obtiene los días de gracia configurados.
 */
export async function getGracePeriodDays(): Promise<number> {
  try {
    const db = await getDbConnection();
    const val = await getConfigParam(db, 'grace_period_days');
    if (val && !isNaN(Number(val))) {
      return Number(val);
    }
  } catch (_e) {}
  return DEFAULT_GRACE_PERIOD_DAYS;
}

export interface SubscriptionStatusInfo {
  planId: string;
  effectivePlan: string;
  isLifetime: boolean;
  startDate: Date | null;
  endDate: Date | null;
  expiresToday: boolean;
  isExpired: boolean;
  daysSinceExpiration: number;
  remainingDays: number;
  inGracePeriod: boolean;
  isDowngradedToFree: boolean;
  needsRenewal: boolean;
  formattedStartDate: string | null;
  formattedEndDate: string | null;
}

/**
 * Calcula el estado detallado de la suscripción de un perfil:
 */
export function calculateSubscriptionStatus(
  profile: Profile | null,
  gracePeriodDays = DEFAULT_GRACE_PERIOD_DAYS,
): SubscriptionStatusInfo {
  const planId = (profile?.subscription_plan ?? 'free').toLowerCase();
  const isFreePlan = planId === 'free';

  const startDate = toBogotaDate(profile?.subscription_start_date);
  const formattedStartDate = startDate ? formatDateDisplay(startDate) : null;

  // 1. El plan Free es el único vitalicio
  if (isFreePlan) {
    return {
      planId: 'free',
      effectivePlan: 'free',
      isLifetime: true,
      startDate,
      endDate: null,
      expiresToday: false,
      isExpired: false,
      daysSinceExpiration: 0,
      remainingDays: 0,
      inGracePeriod: false,
      isDowngradedToFree: false,
      needsRenewal: false,
      formattedStartDate,
      formattedEndDate: null,
    };
  }

  // 2. Plan de pago sin fecha de fin aún configurada en BD
  if (!profile?.subscription_end_date) {
    return {
      planId,
      effectivePlan: planId,
      isLifetime: false,
      startDate,
      endDate: null,
      expiresToday: false,
      isExpired: false,
      daysSinceExpiration: 0,
      remainingDays: 0,
      inGracePeriod: false,
      isDowngradedToFree: false,
      needsRenewal: false,
      formattedStartDate,
      formattedEndDate: null,
    };
  }

  const endDate = toBogotaDate(profile.subscription_end_date);
  if (!endDate) {
    return {
      planId,
      effectivePlan: planId,
      isLifetime: false,
      startDate,
      endDate: null,
      expiresToday: false,
      isExpired: false,
      daysSinceExpiration: 0,
      remainingDays: 0,
      inGracePeriod: false,
      isDowngradedToFree: false,
      needsRenewal: false,
      formattedStartDate,
      formattedEndDate: null,
    };
  }

  const todayYMD = getBogotaTodayYMD();
  let endYMD = '';
  try {
    endYMD = new Intl.DateTimeFormat('en-CA', {
      timeZone: BOGOTA_TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(endDate);
  } catch (_e) {
    endYMD = endDate.toISOString().slice(0, 10);
  }

  const isSameDay = todayYMD === endYMD;
  const isExpired = todayYMD > endYMD;
  const expiresToday = isSameDay;

  const tToday = new Date(`${todayYMD}T12:00:00-05:00`).getTime();
  const tEnd = new Date(`${endYMD}T12:00:00-05:00`).getTime();
  const daysDiff = Math.round((tToday - tEnd) / (1000 * 60 * 60 * 24));

  const isDowngradedToFree = isExpired && daysDiff > gracePeriodDays;
  const inGracePeriod = isExpired && daysDiff <= gracePeriodDays;
  const effectivePlan = isDowngradedToFree ? 'free' : planId;
  const formattedEndDate = formatDateDisplay(endDate);

  return {
    planId,
    effectivePlan,
    isLifetime: false,
    startDate,
    endDate,
    expiresToday,
    isExpired,
    daysSinceExpiration: Math.max(0, daysDiff),
    remainingDays: isExpired ? 0 : Math.max(0, -daysDiff),
    inGracePeriod,
    isDowngradedToFree,
    needsRenewal: expiresToday || isExpired,
    formattedStartDate,
    formattedEndDate,
  };
}

function formatDisplayPhone(rawPhone: string): string {
  const clean = rawPhone.replace(/[^0-9]/g, '');
  if (clean.length === 12 && clean.startsWith('57')) {
    return `+57 ${clean.slice(2, 5)} ${clean.slice(5, 8)} ${clean.slice(8)}`;
  }
  return `+${clean}`;
}

/**
 * Abre WhatsApp con mensaje preescrito para suscripción o renovación.
 */
export async function openWhatsAppPlanRequest({
  storeName,
  planName,
  isRenewal = false,
  phoneNumber,
}: {
  storeName: string;
  planName: string;
  isRenewal?: boolean;
  phoneNumber?: string;
}): Promise<void> {
  const rawPhone = phoneNumber || (await getSupportWhatsApp());
  const phone = rawPhone.replace(/[^0-9]/g, '');
  const cleanStore = storeName ? storeName.trim() : 'mi tienda';
  const cleanPlan = planName ? planName.trim() : 'de suscripción';

  let message = '';
  if (isRenewal) {
    message = `Hola, soy la tienda ${cleanStore} y deseo renovar mi suscripción al plan ${cleanPlan}`;
  } else {
    message = `Hola, soy la tienda ${cleanStore} y deseo subscribirme al plan ${cleanPlan}`;
  }

  const encodedMsg = encodeURIComponent(message);
  const waWebUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encodedMsg}`;

  try {
    window.open(waWebUrl, '_blank');
  } catch (_e) {
    showAlert({
      title: 'WhatsApp',
      message: `Escribe al número ${formatDisplayPhone(phone)}:\n\n"${message}"`,
      type: 'info',
    });
  }
}

/**
 * Cambia inmediatamente al plan Free
 */
export async function downgradeToFreePlan(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    const { error: rpcErr } = await supabase.rpc('downgrade_to_free');
    if (rpcErr) {
      const { error: profErr } = await supabase
        .from('profiles')
        .update({
          subscription_plan: 'free',
          subscription_start_date: new Date().toISOString(),
          subscription_end_date: null,
          subscription_status: 'active',
        })
        .eq('id', user.id);

      if (profErr) {
        return { success: false, error: profErr.message };
      }

      await supabase
        .from('stores')
        .update({
          subscription_plan: 'free',
          subscription_start_date: new Date().toISOString(),
          subscription_end_date: null,
          subscription_status: 'active',
        })
        .eq('owner_id', user.id);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message ?? 'Error inesperado' };
  }
}
