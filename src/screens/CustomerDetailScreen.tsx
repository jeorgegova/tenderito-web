import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  IoArrowBack,
  IoCall,
  IoStorefrontOutline,
  IoChevronForward,
  IoLockClosedOutline,
  IoCaretDown,
  IoSearch,
  IoCloseCircle,
  IoCalendarOutline,
  IoCalendar,
  IoClose,
  IoCheckmarkCircle,
  IoEllipseOutline,
  IoLayersOutline,
  IoReceiptOutline,
  IoSearchOutline,
  IoCashOutline,
  IoLogoWhatsapp,
  IoTrashOutline,
  IoPersonOutline,
} from 'react-icons/io5';
import { SyncBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { DynamicBrandCurves } from '../components/ui/DynamicBrandCurves';
import { FooterMenu } from '../components/ui/FooterMenu';
import { StoreHistoryLockNotice } from '../components/ui/StoreHistoryLockNotice';
import { MagnetFilterBar } from '../components/ui/MagnetFilterBar';
import { showAlert } from '../components/ui/AlertModal';
import { fetchCustomerById } from '../services/customers';
import { fetchProfile } from '../services/profile';
import { fetchCreditsByCustomer, voidMovement } from '../services/credits';
import { fetchPaymentsByCustomer } from '../services/payments';
import { canCreateCreditForCustomer } from '../services/portfolio';
import { calculateSubscriptionStatus } from '../services/plans';
import { queryClient } from '../lib/queryClient';
import { useStore } from '../store/useStore';
import { Colors, Radius, formatCOP } from '../theme';
import {
  formatDateDisplay,
  getBogotaCurrentMonthKey,
  getBogotaMonthKey,
  isOverdueBogota,
} from '../utils/format';
import type { CreditEligibility } from '../types';

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const MONTH_SHORT_NAMES = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
];

const getCurrentMonthKey = getBogotaCurrentMonthKey;
const getMonthKeyFromDate = getBogotaMonthKey;

const formatMonthLabel = (monthKey: string) => {
  if (monthKey === 'all') {
    return 'Todos los meses';
  }
  const [yearStr, monthStr] = monthKey.split('-');
  const monthIdx = parseInt(monthStr, 10) - 1;
  const monthName = MONTH_NAMES[monthIdx] || monthKey;
  return `${monthName} ${yearStr}`;
};

const formatMonthHeader = (monthKey: string) => {
  if (monthKey === 'all') {
    return 'TODOS';
  }
  const [yearStr, monthStr] = monthKey.split('-');
  const monthIdx = parseInt(monthStr, 10) - 1;
  const monthName = MONTH_NAMES[monthIdx] || monthKey;
  const currentYear = new Date().getFullYear().toString();
  if (yearStr === currentYear) {
    return monthName.toUpperCase();
  }
  const shortMonth = MONTH_SHORT_NAMES[monthIdx] || monthKey;
  return `${shortMonth.toUpperCase()} ${yearStr}`;
};

const normalizeSearchText = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const generateAvailableMonths = (createdAt?: string | null) => {
  const months: string[] = [];
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  let pastLimitMonths = 12;
  if (createdAt) {
    try {
      const createdDate = new Date(createdAt);
      if (!isNaN(createdDate.getTime())) {
        const diffYears = currentYear - createdDate.getFullYear();
        const diffMonths =
          diffYears * 12 + (currentMonth - createdDate.getMonth());
        if (diffMonths > 12) {
          pastLimitMonths = Math.min(diffMonths + 1, 36);
        }
      }
    } catch (_e) {}
  }

  for (let i = 0; i < pastLimitMonths; i++) {
    const d = new Date(currentYear, currentMonth - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    months.push(`${y}-${m}`);
  }
  return months;
};

export function CustomerDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const profileFromStore = useStore(s => s.profile);
  const { data: profileQuery } = useQuery({
    queryKey: ['profile'],
    queryFn: fetchProfile,
    staleTime: 60000,
  });
  const profile = profileQuery || profileFromStore;
  const subStatus = calculateSubscriptionStatus(profile);
  const hasProAccess =
    Boolean(profile?.subscription_plan && profile.subscription_plan.toLowerCase() !== 'free') &&
    (subStatus.effectivePlan !== 'free' ||
      subStatus.inGracePeriod ||
      !subStatus.isDowngradedToFree ||
      (profile?.subscription_status || '').toLowerCase() === 'active');

  const [creditEligibility, setCreditEligibility] = useState<CreditEligibility | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'credit' | 'payment'>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthKey);
  const [isMonthModalVisible, setIsMonthModalVisible] = useState(false);
  const [searchConcept, setSearchConcept] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const customer = useQuery({
    queryKey: ['customer', id],
    queryFn: () => fetchCustomerById(id!),
    enabled: Boolean(id),
  });

  const credits = useQuery({
    queryKey: ['credits', id],
    queryFn: () => fetchCreditsByCustomer(id!),
    enabled: Boolean(id),
  });

  const payments = useQuery({
    queryKey: ['payments', id],
    queryFn: () => fetchPaymentsByCustomer(id!),
    enabled: Boolean(id),
  });

  // Movimientos combinados y ordenados por fecha más reciente
  const allMovements = useMemo(() => {
    const cr = (credits.data ?? []).map(c => ({
      id: c.id,
      kind: 'credit' as const,
      title: c.concept || 'Compra fiada',
      amount: Number(c.amount || 0),
      date: c.created_at,
      dueDate: c.due_date,
      status: c.status,
      estadoServidor: c.estadoServidor,
      notes: null as string | null,
    }));

    const py = (payments.data ?? []).map(p => ({
      id: p.id,
      kind: 'payment' as const,
      title: p.notes ? `Abono: ${p.notes}` : 'Abono recibido',
      amount: Number(p.amount || 0),
      date: p.payment_date || p.created_at,
      dueDate: null,
      status: (p as any).status || 'completed',
      estadoServidor: p.estadoServidor,
      notes: p.notes,
    }));

    return [...cr, ...py].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [credits.data, payments.data]);

  // Lista de meses disponibles para selección
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    monthsSet.add(getCurrentMonthKey());

    allMovements.forEach(m => {
      const key = getMonthKeyFromDate(m.date);
      if (/^\d{4}-\d{2}$/.test(key)) {
        monthsSet.add(key);
      }
    });

    const genMonths = generateAvailableMonths(customer.data?.created_at);
    genMonths.forEach(m => monthsSet.add(m));

    return Array.from(monthsSet).sort((a, b) => b.localeCompare(a));
  }, [allMovements, customer.data?.created_at]);

  // Movimientos filtrados por mes (por defecto mes actual)
  const monthMovements = useMemo(() => {
    if (selectedMonth === 'all') {
      return allMovements;
    }
    return allMovements.filter(
      m => getMonthKeyFromDate(m.date) === selectedMonth,
    );
  }, [allMovements, selectedMonth]);

  // Totales de movimientos del mes seleccionado (excluye cancelados)
  const monthTotals = useMemo(() => {
    let creditsSum = 0;
    let paymentsSum = 0;
    monthMovements.forEach(m => {
      if (m.status === 'cancelled') return;
      if (m.kind === 'credit') {
        creditsSum += m.amount;
      }
      if (m.kind === 'payment') {
        paymentsSum += m.amount;
      }
    });
    return { creditsSum, paymentsSum };
  }, [monthMovements]);

  // Movimientos según filtro de tipo (todo / compra / abono)
  const typeFilteredMovements = useMemo(() => {
    if (filterType === 'all') {
      return monthMovements;
    }
    return monthMovements.filter(m => m.kind === filterType);
  }, [monthMovements, filterType]);

  // Movimientos según filtro de búsqueda "Qué se llevó / Abono"
  const filteredMovements = useMemo(() => {
    const term = normalizeSearchText(searchConcept.trim());
    if (!term) {
      return typeFilteredMovements;
    }
    return typeFilteredMovements.filter(m => {
      const titleMatch = normalizeSearchText(m.title).includes(term);
      const notesMatch = m.notes
        ? normalizeSearchText(m.notes).includes(term)
        : false;
      return titleMatch || notesMatch;
    });
  }, [typeFilteredMovements, searchConcept]);

  const creditCount = monthMovements.filter(m => m.kind === 'credit').length;
  const paymentCount = monthMovements.filter(m => m.kind === 'payment').length;

  const currentBalance = Number(customer.data?.current_balance ?? 0);
  const creditLimit = Number(customer.data?.credit_limit ?? 0);
  const isPaid = currentBalance === 0;
  const creditBlocked = Boolean(
    creditEligibility && !creditEligibility.allowed,
  );

  useEffect(() => {
    let cancelled = false;

    if (!id) {
      setCreditEligibility(null);
      return;
    }

    canCreateCreditForCustomer(id, profile).then(result => {
      if (!cancelled) {
        setCreditEligibility(result);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [id, profile, currentBalance, customer.data?.free_plan_selected]);

  const handleOpenSearch = () => {
    setIsSearchOpen(true);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);
  };

  const handleCloseSearch = () => {
    setIsSearchOpen(false);
    setSearchConcept('');
  };

  const handleCallCustomer = (phone?: string | null) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    window.location.href = `tel:${cleanPhone}`;
  };

  const handleShareWhatsApp = () => {
    const phone = customer.data?.phone?.replace(/[^0-9]/g, '');
    const clientName = customer.data?.alias || customer.data?.name || 'Cliente';
    const storeName = profile?.store_name || 'La tienda';
    const balanceStr = formatCOP(currentBalance);

    const message = `Hola ${clientName}, te escribimos de ${storeName}. Tu saldo actual pendiente en nuestra libreta es de ${balanceStr}. ¡Gracias por tu compra!`;
    const url = phone
      ? `https://api.whatsapp.com/send?phone=57${phone.startsWith('57') ? phone.slice(2) : phone}&text=${encodeURIComponent(message)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;

    window.open(url, '_blank');
  };

  const handleVoidMovement = (item: any) => {
    const isCredit = item.kind === 'credit';
    const tipo = isCredit ? 'este fiado' : 'este abono';

    // 1. Validación de ventana temporal: solo en sus primeras 24 horas de generado
    const diffHours = (Date.now() - new Date(item.date).getTime()) / (1000 * 60 * 60);
    if (diffHours > 24) {
      showAlert({
        title: 'Tiempo límite superado',
        message: 'Solo es posible anular movimientos dentro de las primeras 24 horas posteriores a su registro.',
        type: 'destructive',
      });
      return;
    }

    // 2. Validación obligatoria: no dejar cancelar más saldo del que actualmente debe el cliente
    // para evitar saldos a favor (deuda negativa oculta).
    if (isCredit && item.amount > currentBalance) {
      showAlert({
        title: 'No es posible anular este fiado',
        message: `El valor de este fiado (${formatCOP(item.amount)}) supera la deuda actual del cliente (${formatCOP(currentBalance)}). No puedes anular más saldo del que actualmente debe para no generar saldo a favor.\n\nSi deseas anularlo, primero debes anular los abonos correspondientes.`,
        type: 'destructive',
      });
      return;
    }

    showAlert({
      title: isCredit ? '¿Anular fiado?' : '¿Anular abono?',
      message: `¿Estás seguro de anular ${tipo} por ${formatCOP(item.amount)} ("${item.title}")? El saldo del cliente se recalculará automáticamente. Esta acción no se puede deshacer.`,
      type: 'destructive',
      buttons: [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Sí, anular',
          style: 'destructive',
          onPress: async () => {
            try {
              await voidMovement({
                id: item.id,
                kind: item.kind,
                customerId: id!,
                amount: item.amount,
              });
              await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['credits', id] }),
                queryClient.invalidateQueries({ queryKey: ['payments', id] }),
                queryClient.invalidateQueries({ queryKey: ['customer', id] }),
                queryClient.invalidateQueries({ queryKey: ['customers'] }),
                queryClient.invalidateQueries({ queryKey: ['stats'] }),
              ]);
              await Promise.all([
                credits.refetch(),
                payments.refetch(),
                customer.refetch(),
              ]);
              showAlert({
                title: 'Movimiento anulado',
                message: `Se canceló el ${isCredit ? 'fiado' : 'abono'} y el saldo fue recalculado.`,
                type: 'success',
              });
            } catch (err: any) {
              showAlert({
                title: 'Error al anular',
                message: err?.message || 'No se pudo anular el movimiento.',
                type: 'destructive',
              });
            }
          },
        },
      ],
    });
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: Colors.background,
        position: 'relative',
        paddingBottom: 'calc(140px + env(safe-area-inset-bottom, 0px))',
        boxSizing: 'border-box',
      }}>
      <DynamicBrandCurves position="bottom-left" />

      {/* Header superior idéntico al de React Native */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px',
          borderBottom: `1px solid ${Colors.border}`,
          backgroundColor: '#FFFFFF',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}>
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            color: Colors.primary,
            fontWeight: 700,
            fontSize: 15,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            padding: 0,
          }}>
          <IoArrowBack size={20} />
          <span>Volver</span>
        </button>

        <span style={{ fontSize: 16, fontWeight: 800, color: Colors.text }}>
          Cliente
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {customer.data?.phone && (
            <button
              type="button"
              onClick={handleShareWhatsApp}
              title="Compartir saldo por WhatsApp"
              style={{
                color: '#25D366',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: 4,
              }}>
              <IoLogoWhatsapp size={22} />
            </button>
          )}

          {profile?.merchant_name && (
            <div
              title={`Sesión iniciada como: ${profile.merchant_name} (Tendero)`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                backgroundColor: '#FFFFFF',
                border: `1.5px solid ${Colors.border}`,
                padding: '4px 10px',
                borderRadius: 20,
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                maxWidth: 160,
              }}>
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: Colors.primaryLight,
                  color: Colors.primary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                <IoPersonOutline size={12} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <span
                  style={{
                    fontSize: 8,
                    fontWeight: 800,
                    color: Colors.primary,
                    lineHeight: 1,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}>
                  TENDERO
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: Colors.text,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    lineHeight: 1.2,
                    marginTop: 1,
                  }}>
                  {profile.merchant_name}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Contenido principal scrollable */}
      <div
        style={{
          flex: 1,
          width: '100%',
          maxWidth: 720,
          margin: '0 auto',
          padding: '12px 18px 48px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          position: 'relative',
          zIndex: 1,
        }}>
        {/* ── Ficha del Cliente ── */}
        <Card
          style={{
            padding: 18,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            borderRadius: Radius.xl,
            border: '1px solid #F1F5F9',
            backgroundColor: '#FFFFFF',
          }}>
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 50,
                height: 50,
                borderRadius: 18,
                backgroundColor: isPaid ? '#DCFCE7' : Colors.primaryLight,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
              <span
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: isPaid ? Colors.success : Colors.primary,
                }}>
                {(customer.data?.alias || customer.data?.name || '?')
                  .charAt(0)
                  .toUpperCase()}
              </span>
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontSize: 19,
                    fontWeight: 800,
                    color: Colors.text,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                  {customer.data?.alias ||
                    customer.data?.name ||
                    (customer.isLoading ? 'Cargando...' : 'Sin nombre')}
                </span>
                <SyncBadge estadoServidor={customer.data?.estadoServidor} />
              </div>
              {customer.data?.alias ? (
                <div
                  style={{
                    fontSize: 13,
                    color: Colors.textSecondary,
                    fontWeight: 500,
                    marginTop: 1,
                  }}>
                  Nombre real: {customer.data.name}
                </div>
              ) : null}
              <div
                style={{
                  fontSize: 12,
                  color: Colors.textMuted,
                  marginTop: 2,
                }}>
                {customer.data?.document_type || 'CC'}{' '}
                {customer.data?.document_number || 'Sin cédula'}
              </div>
            </div>
          </div>

          {/* Botón rápido para llamar al cliente */}
          {customer.data?.phone ? (
            <button
              type="button"
              onClick={() => handleCallCustomer(customer.data?.phone)}
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                backgroundColor: '#F0FDF4',
                border: '1px solid #BBF7D0',
                padding: '9px 12px',
                borderRadius: Radius.md,
                cursor: 'pointer',
                width: '100%',
                boxSizing: 'border-box',
              }}>
              <IoCall size={15} color="#15803D" />
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#15803D',
                }}>
                Llamar al cliente ({customer.data.phone})
              </span>
            </button>
          ) : null}

          {/* Historial en otras tiendas (si aplica plan de pago) */}
          {hasProAccess ? (
            <button
              type="button"
              onClick={() =>
                navigate(`/customers/${id}/history`, {
                  state: { customer: customer.data },
                })
              }
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                padding: '9px 12px',
                borderRadius: Radius.md,
                cursor: 'pointer',
                width: '100%',
                boxSizing: 'border-box',
              }}>
              <IoStorefrontOutline size={15} color={Colors.textSecondary} />
              <span
                style={{
                  flex: 1,
                  fontSize: 12,
                  fontWeight: 600,
                  color: Colors.textSecondary,
                  textAlign: 'left',
                }}>
                Historial en otras tiendas
              </span>
              <IoChevronForward size={14} color={Colors.textMuted} />
            </button>
          ) : (
            <StoreHistoryLockNotice style={{ marginTop: 8 }} />
          )}

          {/* Caja de Deuda / Saldo en Grande y Claro */}
          <div
            style={{
              backgroundColor: isPaid ? '#F0FDF4' : '#FEF2F2',
              border: `1px solid ${isPaid ? '#BBF7D0' : '#FECACA'}`,
              borderRadius: Radius.lg,
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
            }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: isPaid ? '#15803D' : Colors.destructive,
                letterSpacing: 0.8,
              }}>
              {isPaid
                ? '¡ESTE CLIENTE ESTÁ AL DÍA!'
                : 'ESTE CLIENTE TE DEBE:'}
            </span>
            <span
              style={{
                fontSize: 32,
                fontWeight: 900,
                color: isPaid ? '#15803D' : Colors.destructive,
                margin: '4px 0',
              }}>
              {formatCOP(currentBalance)}
            </span>
            <span
              style={{
                fontSize: 12,
                color: Colors.textSecondary,
                textAlign: 'center',
                fontWeight: 500,
              }}>
              {isPaid
                ? 'No tiene ninguna deuda pendiente contigo en este momento.'
                : 'Es el valor total que tiene pendiente por pagar en tu tienda.'}
              {creditLimit > 0
                ? ` (Tope máximo de crédito permitido: ${formatCOP(creditLimit)})`
                : ''}
            </span>
          </div>
        </Card>

        {/* ── Botones de Acción Principales (Grandes y Cómodos) ── */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: 12,
            marginTop: 14,
            marginBottom: 16,
          }}>
          <div style={{ flex: 1 }}>
            <Button
              title="+ Nuevo fiado"
              icon={<IoReceiptOutline size={18} />}
              onPress={async () => {
                const check = await canCreateCreditForCustomer(id!, profile);
                if (!check.allowed) {
                  showAlert(
                    'Solo abonos',
                    check.message ?? 'Tu plan actual no permite este fiado.',
                  );
                  return;
                }
                navigate(`/new-credit?customerId=${id}`);
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <Button
              title="− Abonar plata"
              variant="secondary"
              icon={<IoCashOutline size={18} />}
              disabled={isPaid}
              onPress={() => {
                if (isPaid) {
                  showAlert(
                    'Cliente al día',
                    'Este cliente no tiene saldo pendiente por pagar.',
                  );
                  return;
                }
                navigate(`/new-payment?customerId=${id}`);
              }}
            />
          </div>
        </div>

        {creditBlocked ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: 8,
              backgroundColor: '#FEF2F2',
              borderRadius: Radius.md,
              padding: '10px 12px',
              marginBottom: 14,
            }}>
            <IoLockClosedOutline
              size={16}
              color={Colors.destructive}
              style={{ flexShrink: 0, marginTop: 1 }}
            />
            <span
              style={{
                flex: 1,
                color: Colors.destructive,
                fontSize: 12,
                lineHeight: '17px',
                fontWeight: 600,
              }}>
              {creditEligibility?.message}
            </span>
          </div>
        ) : null}

        {/* ── Encabezado de la Libreta de Cuentas ── */}
        <div style={{ marginTop: 4, marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 17, fontWeight: 800, color: Colors.text }}>
            Libreta de fiados y abonos
          </span>
          <span style={{ fontSize: 12, color: Colors.textSecondary, fontWeight: 500 }}>
            Aquí ves cada compra fiada y cada abono recibido:
          </span>
        </div>

        {/* ── Filtros Rápidos con animación Magnet ── */}
        <div style={{ marginBottom: 10 }}>
          <MagnetFilterBar
            options={[
              { key: 'all', label: `Todos (${monthMovements.length})` },
              { key: 'credit', label: `Solo compras (${creditCount})` },
              { key: 'payment', label: `Solo abonos (${paymentCount})` },
            ]}
            selectedKey={filterType}
            onSelect={key => setFilterType(key as 'all' | 'credit' | 'payment')}
          />
        </div>

        {/* ── Cabecera de la Tabla Libreta con Filtro Mes y Buscador Animado ── */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#F8FAFC',
            borderTopLeftRadius: Radius.lg,
            borderTopRightRadius: Radius.lg,
            border: '1px solid #E2E8F0',
            padding: '8px 12px',
            minHeight: 46,
            boxSizing: 'border-box',
          }}>
          {/* Filtro Mes */}
          <div style={{ width: 90, flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => setIsMonthModalVisible(true)}
              style={{
                display: 'inline-flex',
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#FED7AA',
                padding: '4px 6px',
                borderRadius: Radius.sm,
                gap: 3,
                border: 'none',
                cursor: 'pointer',
                maxWidth: '100%',
              }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: '#9A3412',
                  letterSpacing: 0.5,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                {formatMonthHeader(selectedMonth)}
              </span>
              <IoCaretDown size={10} color="#9A3412" />
            </button>
          </div>

          {/* Filtro QUÉ SE LLEVÓ / ABONO con Lupa interactiva y búsqueda */}
          <div
            style={{
              flex: 1,
              padding: '0 6px',
              position: 'relative',
              height: 32,
              display: 'flex',
              alignItems: 'center',
              minWidth: 0,
            }}>
            {!isSearchOpen ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  width: '100%',
                }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: Colors.textSecondary,
                    letterSpacing: 0.6,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                  QUÉ SE LLEVÓ / ABONO
                </span>
                <button
                  type="button"
                  onClick={handleOpenSearch}
                  title="Buscar concepto"
                  style={{
                    padding: 4,
                    borderRadius: Radius.sm,
                    backgroundColor:
                      searchConcept.trim().length > 0
                        ? Colors.primary
                        : '#FED7AA',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: 'none',
                    cursor: 'pointer',
                  }}>
                  <IoSearch
                    size={12}
                    color={
                      searchConcept.trim().length > 0 ? '#FFFFFF' : '#9A3412'
                    }
                  />
                </button>
              </div>
            ) : (
              <div
                style={{
                  position: 'absolute',
                  left: 2,
                  right: 2,
                  top: 0,
                  bottom: 0,
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#FFFFFF',
                  border: `1.5px solid ${Colors.primary}`,
                  borderRadius: Radius.sm,
                  padding: '0 6px',
                  height: 32,
                  gap: 4,
                  boxSizing: 'border-box',
                }}>
                <IoSearch size={12} color={Colors.primary} style={{ flexShrink: 0 }} />
                <input
                  ref={searchInputRef}
                  style={{
                    flex: 1,
                    fontSize: 12,
                    fontWeight: 600,
                    color: Colors.text,
                    border: 'none',
                    outline: 'none',
                    padding: 0,
                    background: 'transparent',
                    minWidth: 0,
                  }}
                  placeholder="Buscar qué se llevó..."
                  value={searchConcept}
                  onChange={e => setSearchConcept(e.target.value)}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleCloseSearch}
                  title="Cerrar búsqueda"
                  style={{
                    border: 'none',
                    background: 'none',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    color: Colors.textSecondary,
                  }}>
                  <IoCloseCircle size={15} />
                </button>
              </div>
            )}
          </div>

          {/* Columna Valor */}
          <div
            style={{
              width: 90,
              display: 'flex',
              justifyContent: 'flex-end',
              flexShrink: 0,
            }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: Colors.textSecondary,
                letterSpacing: 0.6,
              }}>
              VALOR
            </span>
          </div>
        </div>

        {/* ── Filas de la Tabla ── */}
        {filteredMovements.length > 0 ? (
          <div>
            {filteredMovements.map((item, index) => {
              const isCredit = item.kind === 'credit';
              const isCancelled = item.status === 'cancelled';
              const overdue = isCredit && !isCancelled && isOverdueBogota(item.dueDate);

              return (
                <div
                  key={`${item.kind}-${item.id}`}
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: '12px 12px',
                    backgroundColor: isCancelled
                      ? '#F1F5F9'
                      : index % 2 === 1
                      ? '#F8FAFC'
                      : '#FFFFFF',
                    borderLeft: '1px solid #E2E8F0',
                    borderRight: '1px solid #E2E8F0',
                    borderBottom: '1px solid #E2E8F0',
                    boxSizing: 'border-box',
                    opacity: isCancelled ? 0.72 : 1,
                  }}>
                  {/* Columna Fecha */}
                  <div style={{ width: 90, flexShrink: 0 }}>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: isCancelled ? '#94A3B8' : Colors.textSecondary,
                        textDecoration: isCancelled ? 'line-through' : 'none',
                      }}>
                      {formatDateDisplay(item.date)}
                    </span>
                  </div>

                  {/* Columna Detalle */}
                  <div style={{ flex: 1, padding: '0 6px', minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: isCancelled ? '#94A3B8' : Colors.text,
                        textDecoration: isCancelled ? 'line-through' : 'none',
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}>
                      {item.title}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        marginTop: 3,
                        flexWrap: 'wrap',
                      }}>
                      {isCancelled ? (
                        <>
                          <div
                            style={{
                              padding: '2px 7px',
                              borderRadius: 4,
                              backgroundColor: '#E2E8F0',
                              border: '1px solid #CBD5E1',
                              display: 'inline-flex',
                              alignItems: 'center',
                            }}>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 800,
                                color: '#64748B',
                              }}>
                              Cancelado
                            </span>
                          </div>
                          <div
                            style={{
                              padding: '2px 6px',
                              borderRadius: 4,
                              backgroundColor: '#F1F5F9',
                              display: 'inline-flex',
                              alignItems: 'center',
                            }}>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: '#94A3B8',
                                textDecoration: 'line-through',
                              }}>
                              {isCredit ? 'Compra fiada (+)' : 'Abono recibido (-)'}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div
                          style={{
                            padding: '2px 6px',
                            borderRadius: 4,
                            backgroundColor: isCredit ? '#FEE2E2' : '#DCFCE7',
                            display: 'inline-flex',
                            alignItems: 'center',
                          }}>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 800,
                              color: isCredit ? Colors.destructive : '#15803D',
                            }}>
                            {isCredit ? 'Compra fiada (+)' : 'Abono recibido (-)'}
                          </span>
                        </div>
                      )}
                      <SyncBadge estadoServidor={item.estadoServidor} />
                    </div>

                    {item.dueDate ? (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          marginTop: 3,
                        }}>
                        <IoCalendarOutline
                          size={12}
                          color={
                            isCancelled
                              ? '#94A3B8'
                              : overdue
                              ? Colors.destructive
                              : Colors.textSecondary
                          }
                        />
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: isCancelled ? 500 : overdue ? 700 : 600,
                            color: isCancelled
                              ? '#94A3B8'
                              : overdue
                              ? Colors.destructive
                              : Colors.textSecondary,
                            textDecoration: isCancelled ? 'line-through' : 'none',
                          }}>
                          {overdue
                            ? `Vencido el: ${formatDateDisplay(item.dueDate)}`
                            : `Vence el: ${formatDateDisplay(item.dueDate)}`}
                        </span>
                      </div>
                    ) : null}
                  </div>

                  {/* Columna Monto */}
                  <div
                    style={{
                      width: 90,
                      display: 'flex',
                      justifyContent: 'flex-end',
                      flexShrink: 0,
                    }}>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 800,
                        color: isCancelled
                          ? '#94A3B8'
                          : isCredit
                          ? Colors.destructive
                          : '#15803D',
                        textDecoration: isCancelled ? 'line-through' : 'none',
                        whiteSpace: 'nowrap',
                      }}>
                      {isCredit ? '+' : '−'}
                      {formatCOP(item.amount)}
                    </span>
                  </div>

                  {/* Botón Anular Movimiento */}
                  <div
                    style={{
                      marginLeft: 6,
                      width: 28,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                    {!isCancelled && (() => {
                      const diffHours = (Date.now() - new Date(item.date).getTime()) / (1000 * 60 * 60);
                      if (diffHours > 24) return null;

                      return (
                        <button
                          type="button"
                          onClick={() => handleVoidMovement(item)}
                          title={isCredit ? 'Anular fiado' : 'Anular abono'}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: '6px',
                            borderRadius: 8,
                            cursor: 'pointer',
                            color: Colors.textSecondary,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s',
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.backgroundColor = '#FEE2E2';
                            e.currentTarget.style.color = Colors.destructive;
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = Colors.textSecondary;
                          }}>
                          <IoTrashOutline size={16} />
                        </button>
                      );
                    })()}
                  </div>
                </div>
              );
            })}

            {/* Resumen inferior de la tabla */}
            <div
              style={{
                backgroundColor: '#F8FAFC',
                borderLeft: '1px solid #E2E8F0',
                borderRight: '1px solid #E2E8F0',
                borderBottom: '1px solid #E2E8F0',
                borderBottomLeftRadius: Radius.lg,
                borderBottomRightRadius: Radius.lg,
                padding: 14,
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                boxSizing: 'border-box',
              }}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: Colors.textSecondary,
                  }}>
                  {selectedMonth === 'all'
                    ? 'Total fiado acumulado:'
                    : `Total fiado en ${formatMonthLabel(selectedMonth)}:`}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: Colors.destructive,
                  }}>
                  +{formatCOP(monthTotals.creditsSum)}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: Colors.textSecondary,
                  }}>
                  {selectedMonth === 'all'
                    ? 'Total que te ha abonado:'
                    : `Total abonado en ${formatMonthLabel(selectedMonth)}:`}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: '#15803D',
                  }}>
                  −{formatCOP(monthTotals.paymentsSum)}
                </span>
              </div>

              <div
                style={{
                  height: 1,
                  backgroundColor: '#E2E8F0',
                  margin: '4px 0',
                }}
              />

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: Colors.text,
                  }}>
                  Saldo pendiente actual:
                </span>
                <span
                  style={{
                    fontSize: 16,
                    fontWeight: 900,
                    color: isPaid ? '#15803D' : Colors.destructive,
                  }}>
                  {formatCOP(currentBalance)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Estado vacío de la tabla */
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderLeft: '1px solid #E2E8F0',
              borderRight: '1px solid #E2E8F0',
              borderBottom: '1px solid #E2E8F0',
              borderBottomLeftRadius: Radius.lg,
              borderBottomRightRadius: Radius.lg,
              padding: 28,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              textAlign: 'center',
              boxSizing: 'border-box',
            }}>
            {credits.isLoading || payments.isLoading ? (
              <span style={{ fontSize: 13, color: Colors.textSecondary }}>
                Cargando libreta...
              </span>
            ) : (
              <>
                {searchConcept.trim().length > 0 ? (
                  <IoSearchOutline size={36} color={Colors.textMuted} />
                ) : (
                  <IoReceiptOutline size={36} color={Colors.textMuted} />
                )}
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 800,
                    color: Colors.text,
                  }}>
                  {searchConcept.trim().length > 0
                    ? 'Sin coincidencias'
                    : 'Sin movimientos en este mes'}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: Colors.textSecondary,
                    textAlign: 'center',
                    maxWidth: 320,
                  }}>
                  {searchConcept.trim().length > 0
                    ? `No hay compras ni abonos que contengan "${searchConcept}".`
                    : allMovements.length === 0
                    ? 'Este cliente aún no tiene compras fiadas ni abonos registrados.'
                    : `No hay compras ni abonos registrados para ${formatMonthLabel(
                        selectedMonth,
                      )}.`}
                </span>

                {searchConcept.trim().length > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchConcept('');
                      handleCloseSearch();
                    }}
                    style={{
                      marginTop: 10,
                      padding: '6px 14px',
                      borderRadius: Radius.md,
                      backgroundColor: '#FFEDD5',
                      border: '1px solid #FDBA74',
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#9A3412',
                      cursor: 'pointer',
                    }}>
                    Limpiar búsqueda
                  </button>
                ) : selectedMonth !== 'all' && allMovements.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setSelectedMonth('all')}
                    style={{
                      marginTop: 10,
                      padding: '6px 14px',
                      borderRadius: Radius.md,
                      backgroundColor: '#FFEDD5',
                      border: '1px solid #FDBA74',
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#9A3412',
                      cursor: 'pointer',
                    }}>
                    Ver historial completo ({allMovements.length})
                  </button>
                ) : null}
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Modal para seleccionar el mes ── */}
      {isMonthModalVisible && (
        <div
          onClick={() => setIsMonthModalVisible(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            zIndex: 1100,
            boxSizing: 'border-box',
          }}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: Radius.lg,
              width: '100%',
              maxWidth: 420,
              maxHeight: '80vh',
              border: `1.5px solid ${Colors.border}`,
              padding: 18,
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.18)',
              display: 'flex',
              flexDirection: 'column',
              boxSizing: 'border-box',
            }}>
            {/* Cabecera del modal */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
                paddingBottom: 12,
                borderBottom: `1px solid ${Colors.border}`,
              }}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  flex: 1,
                  minWidth: 0,
                }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: '#FFEDD5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                  <IoCalendar size={20} color={Colors.primary} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 800,
                      color: Colors.text,
                    }}>
                    Seleccionar el mes...
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: Colors.textSecondary,
                      fontWeight: 500,
                      marginTop: 1,
                    }}>
                    Filtra las cuentas y abonos de este cliente por mes
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMonthModalVisible(false)}
                style={{
                  border: 'none',
                  background: 'none',
                  padding: 4,
                  cursor: 'pointer',
                  color: Colors.textSecondary,
                  display: 'flex',
                  alignItems: 'center',
                }}>
                <IoClose size={22} />
              </button>
            </div>

            {/* Lista de meses disponibles */}
            <div
              style={{
                maxHeight: 320,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                paddingRight: 4,
              }}>
              {availableMonths.map(monthKey => {
                const isSelected = selectedMonth === monthKey;
                const isCurrent = monthKey === getCurrentMonthKey();
                const count = allMovements.filter(
                  m => getMonthKeyFromDate(m.date) === monthKey,
                ).length;

                return (
                  <button
                    key={monthKey}
                    type="button"
                    onClick={() => {
                      setSelectedMonth(monthKey);
                      setIsMonthModalVisible(false);
                    }}
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '11px 12px',
                      borderRadius: Radius.md,
                      border: `1.5px solid ${
                        isSelected ? Colors.primary : Colors.border
                      }`,
                      backgroundColor: isSelected ? '#FFF7ED' : '#F8FAFC',
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                      boxSizing: 'border-box',
                    }}>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 10,
                        flex: 1,
                        minWidth: 0,
                      }}>
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 17,
                          backgroundColor: isSelected ? '#FFEDD5' : '#F1F5F9',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                        <IoCalendarOutline
                          size={18}
                          color={
                            isSelected ? Colors.primary : Colors.textSecondary
                          }
                        />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                          }}>
                          <span
                            style={{
                              fontSize: 14,
                              fontWeight: isSelected ? 800 : 700,
                              color: isSelected ? '#9A3412' : Colors.text,
                            }}>
                            {formatMonthLabel(monthKey)}
                          </span>
                          {isCurrent && (
                            <span
                              style={{
                                backgroundColor: '#E0F2FE',
                                padding: '2px 6px',
                                borderRadius: 4,
                                fontSize: 10,
                                fontWeight: 800,
                                color: '#0369A1',
                              }}>
                              Mes actual
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: Colors.textSecondary,
                            fontWeight: 500,
                            marginTop: 2,
                          }}>
                          {count === 0
                            ? 'Sin movimientos'
                            : `${count} movimiento${count === 1 ? '' : 's'}`}
                        </div>
                      </div>
                    </div>

                    {isSelected ? (
                      <IoCheckmarkCircle size={22} color={Colors.primary} />
                    ) : (
                      <IoEllipseOutline size={22} color={Colors.border} />
                    )}
                  </button>
                );
              })}

              {/* Opción para ver todos los meses */}
              <button
                type="button"
                onClick={() => {
                  setSelectedMonth('all');
                  setIsMonthModalVisible(false);
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '11px 12px',
                  borderRadius: Radius.md,
                  border: `1.5px dashed ${
                    selectedMonth === 'all' ? Colors.primary : Colors.border
                  }`,
                  backgroundColor:
                    selectedMonth === 'all' ? '#FFF7ED' : '#F8FAFC',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  marginTop: 4,
                  boxSizing: 'border-box',
                }}>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    flex: 1,
                    minWidth: 0,
                  }}>
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 17,
                      backgroundColor:
                        selectedMonth === 'all' ? '#FFEDD5' : '#F1F5F9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                    <IoLayersOutline
                      size={18}
                      color={
                        selectedMonth === 'all'
                          ? Colors.primary
                          : Colors.textSecondary
                      }
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: selectedMonth === 'all' ? 800 : 700,
                        color:
                          selectedMonth === 'all' ? '#9A3412' : Colors.text,
                      }}>
                      Todos los meses
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: Colors.textSecondary,
                        fontWeight: 500,
                        marginTop: 2,
                      }}>
                      Historial completo ({allMovements.length} movimientos)
                    </div>
                  </div>
                </div>

                {selectedMonth === 'all' ? (
                  <IoCheckmarkCircle size={22} color={Colors.primary} />
                ) : (
                  <IoEllipseOutline size={22} color={Colors.border} />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Menú inferior */}
      <FooterMenu active="Clientes" />
    </div>
  );
}
