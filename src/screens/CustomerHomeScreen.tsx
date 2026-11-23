import React, { useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  IoReceiptOutline,
  IoStorefront,
  IoStorefrontOutline,
  IoLogOutOutline,
  IoCalendar,
  IoCalendarOutline,
  IoSearch,
  IoClose,
  IoCloseCircle,
  IoChevronForward,
  IoCaretDown,
  IoCall,
  IoLocationOutline,
  IoCallOutline,
  IoArrowBack,
  IoWallet,
  IoCheckmarkCircle,
  IoEllipseOutline,
  IoLayersOutline,
  IoAlertCircleOutline,
  IoDownloadOutline,
  IoNotifications,
  IoNotificationsOutline,
  IoPersonOutline,
  IoPencilOutline,
  IoBookOutline,
  IoSparkles,
} from 'react-icons/io5';
import { EditCustomerSelfModal } from '../components/ui/EditCustomerSelfModal';
import { Card } from '../components/ui/Card';
import { NotebookPaper } from '../components/ui/NotebookPaper';
import { Button } from '../components/ui/Button';
import { AnimatedMoney } from '../components/ui/AnimatedMoney';
import { DynamicBrandCurves } from '../components/ui/DynamicBrandCurves';
import { MagnetFilterBar } from '../components/ui/MagnetFilterBar';
import { showAlert } from '../utils/alert';
import { confirmLogout, CUSTOMER_LOGOUT_MESSAGE } from '../lib/session';
import { fetchCustomerPortal } from '../services/customerPortal';
import { setupRealtimeCustomerAlerts } from '../services/notificationService';
import { NotificationSettingsModal } from '../components/ui/NotificationSettingsModal';
import { Colors, Radius, formatCOP } from '../theme';
import {
  formatDateCompact,
  formatDateDisplay,
  getBogotaCurrentMonthKey,
  getBogotaMonthKey,
} from '../utils/format';

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
    return 'Todos';
  }
  const [, monthStr] = monthKey.split('-');
  const monthIdx = parseInt(monthStr, 10) - 1;
  return MONTH_NAMES[monthIdx] || monthKey;
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

export function CustomerHomeScreen() {
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'credit' | 'payment'>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthKey);
  const [isMonthModalVisible, setIsMonthModalVisible] = useState(false);
  const [searchConcept, setSearchConcept] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedDetailMovement, setSelectedDetailMovement] = useState<any | null>(null);
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleOpenSearch = () => {
    setIsSearchOpen(true);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 80);
  };

  const handleCloseSearch = () => {
    setIsSearchOpen(false);
    setTimeout(() => {
      setSearchConcept('');
    }, 280);
  };
  const [notifGranted, setNotifGranted] = useState<boolean>(() => {
    return (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted'
    );
  });

  const handleOpenNotificationModal = () => {
    setIsNotifModalOpen(true);
  };

  const queryClient = useQueryClient();

  // Al cambiar o salir de la tienda seleccionada, restablecer filtros a mes actual
  const handleSelectStore = (storeId: string | null) => {
    setSelectedStoreId(storeId);
    setSelectedMonth(getCurrentMonthKey());
    setSearchConcept('');
    setIsSearchOpen(false);
    setFilterType('all');
    if (storeId) {
      queryClient.invalidateQueries({ queryKey: ['customer-portal', storeId] });
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ['customer-portal', selectedStoreId, selectedMonth],
    queryFn: () =>
      fetchCustomerPortal({
        storeId: selectedStoreId,
        month: selectedMonth,
      }),
  });

  React.useEffect(() => {
    if (!data?.customer?.id) return;
    const cleanup = setupRealtimeCustomerAlerts({
      customerId: data.customer.id,
      userId: data.customer.user_id,
    });
    return () => cleanup();
  }, [data?.customer?.id, data?.customer?.user_id]);

  const checkInternetConnection = (): boolean => {
    if (!navigator.onLine) {
      showAlert({
        title: 'Sin conexión a internet',
        message:
          'Para consultar los movimientos de otro mes o traer más datos debes tener conexión a internet.',
        type: 'warning',
      });
      return false;
    }
    return true;
  };

  const handleOpenMonthPicker = () => {
    if (!checkInternetConnection()) return;
    setIsMonthModalVisible(true);
  };

  const handleSelectMonth = (monthKey: string) => {
    if (monthKey === selectedMonth) {
      setIsMonthModalVisible(false);
      return;
    }
    if (!checkInternetConnection()) return;
    setSelectedMonth(monthKey);
    setIsMonthModalVisible(false);
  };

  const stores = useMemo(() => data?.stores ?? [], [data?.stores]);
  const customerName = data?.customer?.name ?? 'Cliente';

  // Total acumulado que debe en todas las tiendas
  const totalBalance = useMemo(() => {
    return stores.reduce(
      (sum: number, item: any) => sum + Number(item.current_balance || 0),
      0,
    );
  }, [stores]);

  // Tienda actualmente seleccionada
  const selectedStore = useMemo(() => {
    if (!selectedStoreId) return null;
    return stores.find((s: any) => s.store_id === selectedStoreId) ?? null;
  }, [selectedStoreId, stores]);

  // Movimientos correspondientes a la tienda seleccionada
  const storeMovements = useMemo(() => {
    if (!selectedStoreId) return [];

    const credits = (data?.credits ?? [])
      .filter((c: any) => c.store_id === selectedStoreId)
      .map((c: any) => ({
        id: c.id,
        kind: 'credit' as const,
        title: c.concept || 'Compra fiada',
        amount: Number(c.amount || 0),
        date: c.created_at,
        dueDate: c.due_date,
        status: c.status,
        notes: null as string | null,
      }));

    const payments = (data?.payments ?? [])
      .filter((p: any) => p.store_id === selectedStoreId)
      .map((p: any) => ({
        id: p.id,
        kind: 'payment' as const,
        title: p.notes ? `Abono: ${p.notes}` : 'Abono entregado a la tienda',
        amount: Number(p.amount || 0),
        date: p.payment_date,
        dueDate: null as string | null,
        status: p.status || 'completed',
        notes: p.notes,
      }));

    return [...credits, ...payments].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [data, selectedStoreId]);

  // Totales de la tienda seleccionada (excluye cancelados)
  const storeTotals = useMemo(() => {
    let creditsSum = 0;
    let paymentsSum = 0;
    storeMovements.forEach(m => {
      if (m.status === 'cancelled') return;
      if (m.kind === 'credit') creditsSum += m.amount;
      if (m.kind === 'payment') paymentsSum += m.amount;
    });
    return { creditsSum, paymentsSum };
  }, [storeMovements]);

  // Lista de meses disponibles para selección
  const availableMonths = useMemo(() => {
    return generateAvailableMonths(data?.customer?.created_at);
  }, [data?.customer?.created_at]);

  // Movimientos filtrados por tipo (todo / compras / abonos)
  const typeFilteredMovements = useMemo(() => {
    if (filterType === 'all') return storeMovements;
    return storeMovements.filter(m => m.kind === filterType);
  }, [storeMovements, filterType]);

  // Movimientos finales filtrados por el buscador
  const filteredStoreMovements = useMemo(() => {
    const term = normalizeSearchText(searchConcept.trim());
    if (!term) return typeFilteredMovements;
    return typeFilteredMovements.filter(m => {
      const titleMatch = normalizeSearchText(m.title).includes(term);
      const notesMatch = m.notes
        ? normalizeSearchText(m.notes).includes(term)
        : false;
      return titleMatch || notesMatch;
    });
  }, [typeFilteredMovements, searchConcept]);

  const handleLogout = () => {
    confirmLogout({ message: CUSTOMER_LOGOUT_MESSAGE });
  };

  const handleCallStore = (phone?: string | null) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    window.open(`tel:${cleanPhone}`, '_self');
  };

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
          backgroundColor: Colors.background,
          gap: 12,
        }}>
        <div className="spinner" style={{ width: 36, height: 36, border: `3px solid ${Colors.border}`, borderTopColor: Colors.primary, borderRadius: '50%' }} />
        <span style={{ fontSize: 15, fontWeight: 600, color: Colors.textSecondary }}>
          Cargando tus cuentas y tiendas...
        </span>
      </div>
    );
  }

  if (isError && !data) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
          backgroundColor: Colors.background,
          gap: 12,
          textAlign: 'center',
        }}>
        <IoAlertCircleOutline size={48} color={Colors.destructive} />
        <span style={{ fontSize: 16, fontWeight: 800, color: Colors.text, marginTop: 8 }}>
          No se pudieron cargar tus cuentas
        </span>
        <span style={{ fontSize: 13, color: Colors.textSecondary, maxWidth: 300 }}>
          Revisa tu conexión a internet e intenta nuevamente.
        </span>
        <button
          onClick={() => refetch()}
          style={{
            marginTop: 16,
            backgroundColor: Colors.primary,
            color: '#FFFFFF',
            fontWeight: 800,
            fontSize: 14,
            padding: '10px 24px',
            borderRadius: Radius.md,
            border: 'none',
            cursor: 'pointer',
          }}>
          Reintentar
        </button>
        <button
          onClick={handleLogout}
          style={{
            marginTop: 10,
            background: 'none',
            border: 'none',
            color: Colors.textSecondary,
            fontWeight: 600,
            fontSize: 13,
            cursor: 'pointer',
          }}>
          Cerrar sesión
        </button>
      </div>
    );
  }

  // =========================================================================
  // VISTA DE LA PLATAFORMA DEL CLIENTE
  // =========================================================================
  const rawStores: any = selectedStore?.stores;
  const storeInfo: any = Array.isArray(rawStores) ? rawStores[0] : rawStores;
  const storeName = storeInfo?.store_name ?? 'Tienda de barrio';
  const currentBalance = Number(selectedStore?.current_balance || 0);
  const isPaid = currentBalance === 0;

  const creditCount = storeMovements.filter(m => m.kind === 'credit').length;
  const paymentCount = storeMovements.filter(m => m.kind === 'payment').length;
  const allClear = totalBalance === 0 && stores.length > 0;

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: Colors.background,
        position: 'relative',
        paddingBottom: 40,
      }}>
      <style>{`
        @keyframes headerFadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <DynamicBrandCurves position={selectedStore ? 'bottom-left' : 'top-right'} />

      {/* Cabecera persistente animada con transición de crecer/reducirse */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backgroundColor: '#FFFFFF',
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
          borderBottom: '1px solid #F1F5F9',
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.05)',
          overflow: 'hidden',
          padding: selectedStore ? '12px 18px' : '20px 20px 16px',
          transition:
            'padding 320ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 300ms ease',
        }}>
        {/* Un único ondulado sutil de fondo que sale desde la izquierda (se desvanece suavemente en detalle) */}
        <div
          style={{
            position: 'absolute',
            top: -35,
            left: -25,
            width: 220,
            height: 145,
            borderBottomRightRadius: 110,
            backgroundColor: '#FFF5EB',
            opacity: selectedStore ? 0 : 0.85,
            transform: selectedStore ? 'rotate(0deg) scale(0.92)' : 'rotate(6deg) scale(1)',
            pointerEvents: 'none',
            transition: 'opacity 250ms ease, transform 320ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />

        <div
          style={{
            maxWidth: 720,
            margin: '0 auto',
            width: '100%',
            position: 'relative',
            zIndex: 1,
          }}>
          {selectedStore ? (
            // Cabecera compacta en Detalle (altura reducida)
            <div
              key="detail-header"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                animation: 'headerFadeIn 280ms cubic-bezier(0.4, 0, 0.2, 1)',
              }}>
              <button
                onClick={() => handleSelectStore(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: '#FFF7ED',
                  padding: '8px 14px',
                  borderRadius: 24,
                  border: '1px solid #FFEDD5',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}>
                <IoArrowBack size={18} color={Colors.primary} />
                <span style={{ fontSize: 13.5, fontWeight: 800, color: Colors.primary }}>
                  Volver a mis tiendas
                </span>
              </button>

              {customerName && (
                <div
                  title={`Sesión iniciada como: ${customerName} (Cliente) - Toca para editar tus datos`}
                  onClick={() => setIsEditProfileOpen(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: '#FFFFFF',
                    border: `1.5px solid ${Colors.border}`,
                    padding: '4px 10px',
                    borderRadius: 20,
                    maxWidth: 160,
                    boxShadow: '0 1px 3px rgba(20, 32, 51, 0.05)',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}>
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: '#ECFDF5',
                      color: '#059669',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 6,
                      flexShrink: 0,
                    }}>
                    <IoPersonOutline size={12} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
                    <span
                      style={{
                        fontSize: 8,
                        fontWeight: 800,
                        color: '#059669',
                        lineHeight: '10px',
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                      }}>
                      CLIENTE
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        color: Colors.text,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        lineHeight: '14px',
                        marginTop: 1,
                      }}>
                      {customerName}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Cabecera más alta en Inicio (con saludo y nombre destacados)
            <div
              key="home-header"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                animation: 'headerFadeIn 280ms cubic-bezier(0.4, 0, 0.2, 1)',
              }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontSize: 22,
                      fontWeight: 800,
                      color: Colors.text,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                    ¡Hola, {customerName}!
                  </span>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 800,
                      color: '#059669',
                      backgroundColor: '#ECFDF5',
                      border: '1px solid #A7F3D0',
                      padding: '2px 8px',
                      borderRadius: 12,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}>
                    Cliente
                  </span>
                </div>
                <div style={{ fontSize: 13, color: Colors.textSecondary, fontWeight: 500, marginTop: 2 }}>
                  Tus cuentas en tiendas de barrio
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    marginTop: 6,
                    padding: '4px 10px',
                    borderRadius: 16,
                    backgroundColor: '#F8FAFC',
                    border: `1px solid ${Colors.border}`,
                    color: Colors.text,
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}>
                  <IoPencilOutline size={13} color={Colors.primary} />
                  <span>Editar mis datos</span>
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <button
                  onClick={handleOpenNotificationModal}
                  title={notifGranted ? 'Configuración de notificaciones' : 'Activar notificaciones'}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    backgroundColor: notifGranted ? '#ECFDF5' : '#FFF7ED',
                    border: `1.5px solid ${notifGranted ? '#A7F3D0' : '#FED7AA'}`,
                    color: notifGranted ? '#059669' : Colors.primary,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}>
                  {notifGranted ? <IoNotifications size={18} /> : <IoNotificationsOutline size={18} />}
                </button>
                <button
                  onClick={handleLogout}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    backgroundColor: '#FEE2E2',
                    padding: '7px 14px',
                    borderRadius: 20,
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}>
                  <IoLogOutOutline size={18} color={Colors.destructive} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: Colors.destructive }}>
                    Salir
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Vista 2: Detalle de Movimientos de la tienda seleccionada */}
      {selectedStore && (
        <>

        <div
          style={{
            position: 'relative',
            zIndex: 1,
            padding: 16,
            maxWidth: 720,
            margin: '0 auto',
            width: '100%',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}>
          {/* Tarjeta de la tienda */}
          <Card
            style={{
              padding: 18,
              borderRadius: 22,
              border: `1px solid ${Colors.border}`,
              backgroundColor: '#FFFFFF',
              boxShadow: '0 4px 10px rgba(20, 32, 51, 0.06)',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 18,
                  backgroundColor: Colors.primaryLight,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                <IoStorefront size={28} color={Colors.primary} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: Colors.text }}>
                  {storeName}
                </div>
                {storeInfo?.address && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <IoLocationOutline size={14} color={Colors.destructive} />
                    <span style={{ fontSize: 13, color: Colors.textSecondary, fontWeight: 500 }}>
                      {storeInfo.address}
                    </span>
                  </div>
                )}
                {storeInfo?.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <IoCallOutline size={14} color="#16A34A" />
                    <span style={{ fontSize: 13, color: Colors.textSecondary, fontWeight: 500 }}>
                      {storeInfo.phone}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {storeInfo?.phone && (
              <button
                onClick={() => handleCallStore(storeInfo.phone)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  backgroundColor: '#16A34A',
                  padding: '11px 16px',
                  borderRadius: 14,
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  width: '100%',
                  boxShadow: '0 2px 6px rgba(22, 163, 74, 0.2)',
                }}>
                <IoCall size={16} />
                <span>Llamar a la tienda</span>
              </button>
            )}

            {/* Saldo en superficie diferenciada y amigable */}
            <div
              style={{
                backgroundColor: isPaid ? '#F0FDF4' : '#FFF5F5',
                border: `1.5px solid ${isPaid ? '#BBF7D0' : '#FECACA'}`,
                borderRadius: 18,
                padding: 18,
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: isPaid ? '#15803D' : Colors.destructive,
                  letterSpacing: '0.8px',
                }}>
                {isPaid ? '¡ESTÁS AL DÍA EN ESTA TIENDA!' : 'EN ESTA TIENDA DEBES:'}
              </span>
              <span
                style={{
                  fontSize: 32,
                  fontWeight: 900,
                  color: isPaid ? '#15803D' : Colors.destructive,
                  margin: '4px 0',
                }}>
                <AnimatedMoney value={currentBalance} formatter={formatCOP} />
              </span>
              <span
                style={{
                  fontSize: 12.5,
                  color: isPaid ? '#166534' : '#991B1B',
                  fontWeight: 500,
                  lineHeight: '18px',
                }}>
                {isPaid
                  ? 'No tienes ninguna deuda pendiente con este tendero.'
                  : 'Este es el dinero que te falta por pagar.'}
              </span>
            </div>
          </Card>

          {/* Sección de la libreta de cuentas */}
          <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 10,
                  backgroundColor: '#FFF0E6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <IoBookOutline size={16} color={Colors.primary} />
              </div>
              <span style={{ fontSize: 18, fontWeight: 800, color: Colors.text }}>
                Libreta de tus cuentas
              </span>
            </div>
            <div style={{ fontSize: 13, color: Colors.textSecondary, fontWeight: 500 }}>
              Aquí ves exactamente cada compra y cada abono registrado:
            </div>
          </div>

          {/* Filtros estilo imán */}
          <MagnetFilterBar
            options={[
              { key: 'all', label: `Todos (${storeMovements.length})` },
              { key: 'credit', label: `Solo compras (${creditCount})` },
              { key: 'payment', label: `Solo abonos (${paymentCount})` },
            ]}
            selectedKey={filterType}
            onSelect={key => setFilterType(key as 'all' | 'credit' | 'payment')}
          />

          {/* ── Libreta de Apuntes en Hoja Argollada ── */}
          <NotebookPaper>
            {/* Encabezado de la tabla: Fila 1 - Columnas y Controles */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: '#FFF8EE',
                borderBottom:
                  isSearchOpen || searchConcept.trim().length > 0
                    ? '1px dashed #CFE0F1'
                    : '1.5px solid #CFE0F1',
                padding: '8px 10px',
                minHeight: 44,
                boxSizing: 'border-box',
              }}>
              {/* Filtro Mes (Columna Fecha) */}
              <div style={{ width: 76, flexShrink: 0 }}>
                <button
                  onClick={handleOpenMonthPicker}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    backgroundColor: '#FED7AA',
                    padding: '3px 4px',
                    borderRadius: Radius.sm,
                    border: 'none',
                    cursor: 'pointer',
                    maxWidth: '100%',
                  }}>
                  <span
                    style={{
                      fontSize: 9.5,
                      fontWeight: 800,
                      color: '#9A3412',
                      letterSpacing: 0.2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                    {formatMonthHeader(selectedMonth)}
                  </span>
                  <IoCaretDown size={9} color="#9A3412" />
                </button>
              </div>

              {/* Columna QUÉ FUE con botón de búsqueda */}
              <div style={{ flex: 1, padding: '0 6px', display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 800,
                    color: Colors.textSecondary,
                    letterSpacing: 0.5,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                  QUÉ FUE
                </span>
                <button
                  onClick={() => {
                    if (isSearchOpen) {
                      handleCloseSearch();
                    } else {
                      handleOpenSearch();
                    }
                  }}
                  title={isSearchOpen ? 'Cerrar buscador' : 'Buscar por concepto'}
                  style={{
                    padding: 3,
                    borderRadius: Radius.sm,
                    backgroundColor: searchConcept.trim() || isSearchOpen ? Colors.primary : '#FED7AA',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    flexShrink: 0,
                    transition: 'background-color 250ms ease, transform 200ms ease',
                  }}>
                  <IoSearch
                    size={12}
                    color={searchConcept.trim() || isSearchOpen ? '#FFFFFF' : '#9A3412'}
                  />
                </button>
              </div>

              {/* Columna Valor */}
              <div style={{ width: 78, textAlign: 'right', flexShrink: 0 }}>
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 800,
                    color: Colors.textSecondary,
                    letterSpacing: 0.5,
                  }}>
                  VALOR
                </span>
              </div>
            </div>

            {/* Fila 2: Campo de búsqueda dedicado con animación fluida de expansión horizontal */}
            <div
              style={{
                maxHeight: isSearchOpen || searchConcept.trim().length > 0 ? 54 : 0,
                opacity: isSearchOpen || searchConcept.trim().length > 0 ? 1 : 0,
                padding:
                  isSearchOpen || searchConcept.trim().length > 0
                    ? '6px 10px 8px'
                    : '0 10px',
                backgroundColor: '#FFF8EE',
                borderBottom:
                  isSearchOpen || searchConcept.trim().length > 0
                    ? '1.5px solid #CFE0F1'
                    : '0px solid transparent',
                overflow: 'hidden',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                transition:
                  'max-height 650ms cubic-bezier(0.25, 0.1, 0.25, 1), opacity 500ms ease-in-out, padding 650ms cubic-bezier(0.25, 0.1, 0.25, 1)',
                pointerEvents:
                  isSearchOpen || searchConcept.trim().length > 0 ? 'auto' : 'none',
              }}>
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#FFFFFF',
                  border: `1.5px solid ${Colors.primary}`,
                  borderRadius: Radius.sm,
                  padding: '0 8px',
                  height: 32,
                  gap: 6,
                  boxSizing: 'border-box',
                  transformOrigin: 'left center',
                  transform:
                    isSearchOpen || searchConcept.trim().length > 0
                      ? 'scaleX(1)'
                      : 'scaleX(0.08)',
                  opacity: isSearchOpen || searchConcept.trim().length > 0 ? 1 : 0,
                  transition:
                    'transform 650ms cubic-bezier(0.25, 0.1, 0.25, 1), opacity 500ms ease-in-out',
                }}>
                <IoSearch size={13} color={Colors.primary} style={{ flexShrink: 0 }} />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Buscar qué compraste o abonaste..."
                  value={searchConcept}
                  onChange={e => setSearchConcept(e.target.value)}
                  style={{
                    flex: 1,
                    border: 'none',
                    outline: 'none',
                    fontSize: 12,
                    fontWeight: 600,
                    color: Colors.text,
                    padding: 0,
                    background: 'transparent',
                    minWidth: 0,
                    opacity: isSearchOpen || searchConcept.trim().length > 0 ? 1 : 0,
                    transition: 'opacity 450ms ease 150ms',
                  }}
                />
                {searchConcept.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSearchConcept('')}
                    title="Borrar texto"
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 2,
                      cursor: 'pointer',
                      color: Colors.textSecondary,
                      display: 'flex',
                      alignItems: 'center',
                    }}>
                    <IoCloseCircle size={15} />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={handleCloseSearch}
                style={{
                  border: 'none',
                  background: 'none',
                  padding: '4px 6px',
                  fontSize: 12,
                  fontWeight: 700,
                  color: Colors.primary,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  opacity: isSearchOpen || searchConcept.trim().length > 0 ? 1 : 0,
                  transform:
                    isSearchOpen || searchConcept.trim().length > 0
                      ? 'translateX(0)'
                      : 'translateX(12px)',
                  transition: 'opacity 480ms ease 120ms, transform 480ms ease 120ms',
                }}>
                Cerrar
              </button>
            </div>

            {/* Filas de la tabla */}
            {isError ? (
              <div style={{ padding: 28, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <IoAlertCircleOutline size={36} color={Colors.destructive} />
                <div style={{ fontSize: 15, fontWeight: 800, color: Colors.text }}>
                  Sin conexión a internet
                </div>
                <div style={{ fontSize: 12, color: Colors.textSecondary }}>
                  No se pudieron cargar los datos de {formatMonthLabel(selectedMonth)}.
                </div>
                <button
                  onClick={() => refetch()}
                  style={{
                    marginTop: 10,
                    padding: '6px 14px',
                    borderRadius: Radius.md,
                    backgroundColor: '#FFEDD5',
                    border: '1px solid #FDBA74',
                    color: '#9A3412',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}>
                  Reintentar
                </button>
              </div>
            ) : isFetching && !isLoading ? (
              <div style={{ padding: 32, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: Colors.textSecondary }}>
                  Consultando movimientos de {formatMonthLabel(selectedMonth)}...
                </span>
              </div>
            ) : filteredStoreMovements.length === 0 ? (
              <div style={{ padding: 28, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <IoReceiptOutline size={32} color={Colors.textMuted} />
                <div style={{ fontSize: 15, fontWeight: 800, color: Colors.text }}>
                  {searchConcept.trim() ? 'Sin coincidencias' : 'Sin registros en este mes'}
                </div>
                <div style={{ fontSize: 12, color: Colors.textSecondary, maxWidth: 280 }}>
                  {searchConcept.trim()
                    ? `No hay compras ni abonos que contengan "${searchConcept}".`
                    : `No hay compras ni abonos registrados para ${formatMonthLabel(selectedMonth)}.`}
                </div>
                {searchConcept.trim() ? (
                  <button
                    onClick={() => setSearchConcept('')}
                    style={{
                      marginTop: 10,
                      padding: '6px 14px',
                      borderRadius: Radius.md,
                      backgroundColor: '#FFEDD5',
                      border: '1px solid #FDBA74',
                      color: '#9A3412',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}>
                    Limpiar búsqueda
                  </button>
                ) : selectedMonth !== 'all' && storeMovements.length > 0 ? (
                  <button
                    onClick={() => handleSelectMonth('all')}
                    style={{
                      marginTop: 10,
                      padding: '6px 14px',
                      borderRadius: Radius.md,
                      backgroundColor: '#FFEDD5',
                      border: '1px solid #FDBA74',
                      color: '#9A3412',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}>
                    Ver historial completo ({storeMovements.length})
                  </button>
                ) : null}
              </div>
            ) : (
              <>
                {filteredStoreMovements.map(item => {
                  const isCredit = item.kind === 'credit';
                  const isCancelled = item.status === 'cancelled';
                  return (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '10px 10px',
                        backgroundColor: isCancelled ? '#F7F4EB' : 'transparent',
                        opacity: isCancelled ? 0.72 : 1,
                        borderBottom: '1px solid #CFE0F1', // Línea azul del cuaderno
                      }}>
                    {/* Columna Fecha Compacta */}
                    <div style={{ width: 76, flexShrink: 0 }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: isCancelled ? '#94A3B8' : Colors.textSecondary,
                          textDecoration: isCancelled ? 'line-through' : 'none',
                          whiteSpace: 'nowrap',
                        }}>
                        {formatDateCompact(item.date)}
                      </span>
                    </div>

                    {/* Detalle con expansión multilínea y tap para popover */}
                    <div style={{ flex: 1, padding: '0 6px', minWidth: 0 }}>
                      <div
                        onClick={() => setSelectedDetailMovement(item)}
                        title={item.title}
                        style={{
                          fontSize: 12.5,
                          fontWeight: 700,
                          color: isCancelled ? '#94A3B8' : Colors.text,
                          textDecoration: isCancelled ? 'line-through' : 'none',
                          lineHeight: '17px',
                          wordBreak: 'break-word',
                          cursor: 'pointer',
                        }}>
                        {item.title}
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          marginTop: 3,
                          flexWrap: 'wrap',
                        }}>
                        {isCancelled ? (
                          <>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '2px 7px',
                                borderRadius: 4,
                                fontSize: 10,
                                fontWeight: 800,
                                backgroundColor: '#E2E8F0',
                                border: '1px solid #CBD5E1',
                                color: '#64748B',
                              }}>
                              Cancelado
                            </span>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '2px 6px',
                                borderRadius: 4,
                                fontSize: 10,
                                fontWeight: 700,
                                backgroundColor: '#F1F5F9',
                                color: '#94A3B8',
                                textDecoration: 'line-through',
                              }}>
                              {isCredit ? 'Compra fiada (+)' : 'Abono realizado (-)'}
                            </span>
                          </>
                        ) : (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 6px',
                              borderRadius: 4,
                              fontSize: 10,
                              fontWeight: 800,
                              backgroundColor: isCredit ? '#FEE2E2' : '#DCFCE7',
                              color: isCredit ? Colors.destructive : '#15803D',
                            }}>
                            {isCredit ? 'Compra fiada (+)' : 'Abono realizado (-)'}
                          </span>
                        )}
                      </div>

                      {item.dueDate && (
                        <div
                          style={{
                            fontSize: 10,
                            color: isCancelled ? '#94A3B8' : Colors.destructive,
                            fontWeight: 600,
                            marginTop: 2,
                            textDecoration: isCancelled ? 'line-through' : 'none',
                          }}>
                          Pagar antes de: {formatDateCompact(item.dueDate)}
                        </div>
                      )}
                    </div>

                    {/* Monto */}
                    <div style={{ width: 78, textAlign: 'right', flexShrink: 0 }}>
                      <span
                        style={{
                          fontSize: 13,
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
                  </div>
                );
              })}

              {/* Renglones decorativos vacíos si hay pocos movimientos */}
              {Array.from({ length: Math.max(0, 3 - filteredStoreMovements.length) }).map((_, i) => (
                <div
                  key={`blank-store-${i}`}
                  style={{
                    height: 38,
                    borderBottom: '1px solid #CFE0F1',
                  }}
                />
              ))}
            </>
          )}

          {/* Resumen contable al pie de la libreta */}
          {storeMovements.length > 0 && (
            <div
              style={{
                backgroundColor: '#FFF8EE',
                borderTop: '1px solid #CFE0F1',
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: Colors.textSecondary }}>
                  {selectedMonth === 'all'
                    ? 'Total fiado acumulado:'
                    : `Total fiado en ${formatMonthLabel(selectedMonth)}:`}
                </span>
                <span style={{ fontSize: 13, fontWeight: 800, color: Colors.destructive }}>
                  +{formatCOP(storeTotals.creditsSum)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: Colors.textSecondary }}>
                  {selectedMonth === 'all'
                    ? 'Total que has abonado:'
                    : `Total abonado en ${formatMonthLabel(selectedMonth)}:`}
                </span>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#15803D' }}>
                  −{formatCOP(storeTotals.paymentsSum)}
                </span>
              </div>
              <div style={{ height: 1, backgroundColor: '#CFE0F1', margin: '4px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: Colors.text }}>
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
          )}
        </NotebookPaper>

          {/* Botón inferior para volver */}
          <Button
            title="Volver a ver todas mis tiendas"
            variant="secondary"
            onPress={() => handleSelectStore(null)}
          />
        </div>

        {/* Modal para seleccionar el mes */}
        {isMonthModalVisible && (
          <div
            onClick={() => setIsMonthModalVisible(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.55)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
              zIndex: 1000,
            }}>
            <div
              onClick={e => e.stopPropagation()}
              style={{
                backgroundColor: Colors.card,
                borderRadius: Radius.lg,
                width: '100%',
                maxWidth: 420,
                maxHeight: '80vh',
                border: `1.5px solid ${Colors.border}`,
                padding: 18,
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                display: 'flex',
                flexDirection: 'column',
                boxSizing: 'border-box',
              }}>
              {/* Cabecera del modal */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 12,
                  paddingBottom: 12,
                  borderBottom: `1px solid ${Colors.border}`,
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: '#FFEDD5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <IoCalendar size={20} color={Colors.primary} />
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: Colors.text }}>
                      Seleccionar el mes...
                    </div>
                    <div style={{ fontSize: 12, color: Colors.textSecondary, fontWeight: 500, marginTop: 1 }}>
                      Filtra tus cuentas y abonos por mes
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setIsMonthModalVisible(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 4,
                    cursor: 'pointer',
                    display: 'flex',
                  }}>
                  <IoClose size={22} color={Colors.textSecondary} />
                </button>
              </div>

              {/* Lista de meses disponibles */}
              <div style={{ overflowY: 'auto', maxHeight: 320, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {availableMonths.map(monthKey => {
                  const isSelected = selectedMonth === monthKey;
                  const isCurrent = monthKey === getCurrentMonthKey();

                  return (
                    <div
                      key={monthKey}
                      onClick={() => handleSelectMonth(monthKey)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '11px 12px',
                        borderRadius: Radius.md,
                        border: `1.5px solid ${isSelected ? Colors.primary : Colors.border}`,
                        backgroundColor: isSelected ? '#FFF7ED' : Colors.cardAlt,
                        cursor: 'pointer',
                      }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 17,
                            backgroundColor: isSelected ? '#FFEDD5' : '#F1F5F9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                          <IoCalendarOutline
                            size={18}
                            color={isSelected ? Colors.primary : Colors.textSecondary}
                          />
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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
                                  color: '#0369A1',
                                  fontSize: 10,
                                  fontWeight: 800,
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                }}>
                                Mes actual
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: Colors.textSecondary, fontWeight: 500, marginTop: 2 }}>
                            {isSelected ? 'Mes seleccionado' : 'Consultar este mes'}
                          </div>
                        </div>
                      </div>

                      {isSelected ? (
                        <IoCheckmarkCircle size={22} color={Colors.primary} />
                      ) : (
                        <IoEllipseOutline size={22} color={Colors.border} />
                      )}
                    </div>
                  );
                })}

                {/* Opción para ver todos los meses */}
                <div
                  onClick={() => handleSelectMonth('all')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '11px 12px',
                    borderRadius: Radius.md,
                    border: `1.5px dashed ${selectedMonth === 'all' ? Colors.primary : Colors.border}`,
                    backgroundColor: selectedMonth === 'all' ? '#FFF7ED' : Colors.cardAlt,
                    cursor: 'pointer',
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 17,
                        backgroundColor: selectedMonth === 'all' ? '#FFEDD5' : '#F1F5F9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                      <IoLayersOutline
                        size={18}
                        color={selectedMonth === 'all' ? Colors.primary : Colors.textSecondary}
                      />
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: selectedMonth === 'all' ? 800 : 700,
                          color: selectedMonth === 'all' ? '#9A3412' : Colors.text,
                        }}>
                        Todos los meses
                      </div>
                      <div style={{ fontSize: 12, color: Colors.textSecondary, fontWeight: 500, marginTop: 2 }}>
                        Consultar historial completo sin filtro de fecha
                      </div>
                    </div>
                  </div>

                  {selectedMonth === 'all' ? (
                    <IoCheckmarkCircle size={22} color={Colors.primary} />
                  ) : (
                    <IoEllipseOutline size={22} color={Colors.border} />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        </>
      )}

      {/* Vista 1: Listado de tiendas vinculadas ("Mis Tiendas") */}
      {!selectedStore && (
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            padding: '18px 16px',
            maxWidth: 720,
            margin: '0 auto',
            width: '100%',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}>
        {/* Banner de activación de notificaciones */}
        {!notifGranted && (
          <div
            style={{
              backgroundColor: '#FFF7ED',
              border: '1.5px solid #FDBA74',
              borderRadius: Radius.lg,
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              boxShadow: '0 2px 8px rgba(255, 107, 0, 0.08)',
            }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  backgroundColor: '#FFEDD5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: Colors.primary,
                  flexShrink: 0,
                }}>
                <IoNotifications size={22} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: Colors.text }}>
                  Activar avisos de fiados y abonos
                </div>
                <div style={{ fontSize: 11, color: Colors.textSecondary, marginTop: 1, lineHeight: '15px' }}>
                  Toca abajo para recibir avisos instantáneos en tu celular cuando registren un movimiento en tu cuenta.
                </div>
              </div>
            </div>
            <button
              onClick={handleOpenNotificationModal}
              style={{
                backgroundColor: Colors.primary,
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 10,
                padding: '9px 12px',
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                boxShadow: '0 2px 6px rgba(255, 107, 0, 0.25)',
              }}>
              <IoNotificationsOutline size={16} />
              Activar Notificaciones
            </button>
          </div>
        )}

        {/* Tarjeta Hero del total que debes con curvas de marca */}
        <div
          style={{
            backgroundColor: allClear ? '#059669' : Colors.primary,
            borderRadius: 22,
            padding: 22,
            position: 'relative',
            overflow: 'hidden',
            boxShadow: allClear
              ? '0 6px 20px rgba(5, 150, 105, 0.28)'
              : '0 6px 20px rgba(255, 107, 0, 0.32)',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}>
          {/* Curvas orgánicas decorativas de marca */}
          <div
            style={{
              position: 'absolute',
              top: -35,
              right: -25,
              width: 190,
              height: 150,
              borderBottomLeftRadius: 105,
              backgroundColor: allClear
                ? 'rgba(255, 255, 255, 0.12)'
                : 'rgba(255, 255, 255, 0.14)',
              transform: 'rotate(-8deg)',
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: -30,
              left: -20,
              width: 135,
              height: 115,
              borderTopRightRadius: 75,
              backgroundColor: allClear
                ? 'rgba(255, 255, 255, 0.12)'
                : 'rgba(255, 255, 255, 0.08)',
              pointerEvents: 'none',
            }}
          />

          {/* Fila superior con icono y etiqueta */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              position: 'relative',
              zIndex: 1,
            }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 12,
                backgroundColor: allClear
                  ? 'rgba(255, 255, 255, 0.24)'
                  : 'rgba(255, 255, 255, 0.22)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
              }}>
              {allClear ? <IoCheckmarkCircle size={20} /> : <IoWallet size={20} />}
            </div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: 'rgba(255, 255, 255, 0.95)',
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
              }}>
              {allClear
                ? '¡ESTÁS AL DÍA EN TUS PAGOS!'
                : 'TOTAL QUE DEBES EN TODAS TUS TIENDAS'}
            </span>
          </div>

          {/* Monto protagonista */}
          <div
            style={{
              fontSize: 34,
              fontWeight: 900,
              color: '#FFFFFF',
              letterSpacing: '-0.5px',
              margin: '4px 0',
              position: 'relative',
              zIndex: 1,
            }}>
            <AnimatedMoney value={totalBalance} formatter={formatCOP} />
          </div>

          {/* Cápsula explicativa inferior */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              borderRadius: 14,
              padding: '9px 12px',
              backgroundColor: allClear
                ? 'rgba(255, 255, 255, 0.22)'
                : 'rgba(255, 255, 255, 0.16)',
              position: 'relative',
              zIndex: 1,
            }}>
            {allClear ? (
              <IoSparkles size={16} color="#FFFFFF" style={{ flexShrink: 0 }} />
            ) : (
              <IoStorefrontOutline size={16} color="#FFFFFF" style={{ flexShrink: 0 }} />
            )}
            <span
              style={{
                fontSize: 12.5,
                lineHeight: '17px',
                fontWeight: 600,
                color: '#FFFFFF',
                flex: 1,
              }}>
              {allClear
                ? 'No tienes ninguna deuda pendiente. ¡Felicitaciones!'
                : `Tienes cuenta en ${stores.length} tienda${
                    stores.length !== 1 ? 's' : ''
                  }. Toca abajo para ver tu libreta.`}
            </span>
          </div>
        </div>

        {/* Título de la sección de tiendas */}
        <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: Colors.text }}>
            Tus tiendas ({stores.length})
          </div>
          <div style={{ fontSize: 13, color: Colors.textSecondary, fontWeight: 500 }}>
            Toca la tienda que deseas revisar para ver sus compras y pagos:
          </div>
        </div>

        {/* Listado de tiendas */}
        {stores.length === 0 ? (
          <Card
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 32,
              gap: 10,
              textAlign: 'center',
              borderRadius: 20,
              border: `1px solid ${Colors.border}`,
            }}>
            <IoStorefrontOutline size={42} color={Colors.textMuted} />
            <div style={{ fontSize: 16, fontWeight: 800, color: Colors.text }}>
              No tienes tiendas vinculadas
            </div>
            <div style={{ fontSize: 13, color: Colors.textSecondary, lineHeight: '18px' }}>
              Pídele al tendero de tu barrio que te registre con tu número de
              documento para que puedas ver tus cuentas aquí.
            </div>
          </Card>
        ) : (
          stores.map((item: any) => {
            const rawStore: any = item.stores;
            const store: any = Array.isArray(rawStore) ? rawStore[0] : rawStore;
            const storeName = store?.store_name ?? 'Tienda de barrio';
            const balance = Number(item.current_balance || 0);
            const paid = balance === 0;

            return (
              <div
                key={item.store_id}
                onClick={() => handleSelectStore(item.store_id)}
                style={{
                  cursor: 'pointer',
                  borderRadius: 20,
                  transition: 'transform 0.15s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                }}>
                <Card
                  style={{
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    borderRadius: 20,
                    border: `1px solid ${Colors.border}`,
                    backgroundColor: '#FFFFFF',
                    boxShadow: '0 4px 10px rgba(20, 32, 51, 0.06)',
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {/* Icono de la tienda en círculo verde o rojo según saldo */}
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        backgroundColor: paid ? '#DCFCE7' : '#FEE2E2',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                      <IoStorefront
                        size={24}
                        color={paid ? '#15803D' : Colors.destructive}
                      />
                    </div>

                    {/* Información de la tienda */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 800,
                          color: Colors.text,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                        {storeName}
                      </div>
                      {store?.phone && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 12.5,
                            color: Colors.textSecondary,
                            marginTop: 2,
                            fontWeight: 600,
                          }}>
                          <IoCallOutline size={12} color="#16A34A" />
                          <span>{store.phone}</span>
                        </div>
                      )}
                      {store?.address && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 12,
                            color: Colors.textSecondary,
                            marginTop: 2,
                            fontWeight: 500,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                          <IoLocationOutline size={12} color={Colors.destructive} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {store.address}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Saldo de la tienda */}
                    <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 80 }}>
                      <div
                        style={{
                          fontSize: 10.5,
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                          color: paid ? '#15803D' : Colors.destructive,
                        }}>
                        {paid ? 'Al día' : 'Debes'}
                      </div>
                      <div
                        style={{
                          fontSize: 16.5,
                          fontWeight: 900,
                          marginTop: 1,
                          color: paid ? '#15803D' : Colors.destructive,
                        }}>
                        {formatCOP(balance)}
                      </div>
                    </div>
                  </div>

                  {/* Botón visual para tocar y ver libreta */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: '#FFF7ED',
                      padding: '7px 12px',
                      borderRadius: 12,
                      border: '1px solid #FFEDD5',
                    }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: Colors.primary }}>
                      Consultar libreta de movimientos
                    </span>
                    <IoChevronForward size={15} color={Colors.primary} />
                  </div>
                </Card>
              </div>
            );
          })
        )}

        {/* Banner para instalar PWA si no está en modo standalone */}
        {typeof window !== 'undefined' &&
          !window.matchMedia('(display-mode: standalone)').matches &&
          !(window.navigator as any).standalone && (
            <Card
              style={{
                padding: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#FFF7ED',
                border: '1.5px solid #FED7AA',
                borderRadius: 18,
                marginTop: 6,
              }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    backgroundColor: '#FFEDD5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: Colors.primary,
                  }}>
                  <IoDownloadOutline size={20} />
                </div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: Colors.text }}>
                    Instalar en tu teléfono
                  </div>
                  <div style={{ fontSize: 11.5, color: Colors.textSecondary }}>
                    Acceso directo y consultas sin conexión
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('pwa-show-install-modal'));
                }}
                style={{
                  backgroundColor: Colors.primary,
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: 12,
                  padding: '7px 12px',
                  borderRadius: 10,
                  border: 'none',
                  cursor: 'pointer',
                }}>
                Instalar
              </button>
            </Card>
          )}

        {/* Botón inferior de cerrar sesión */}
        <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center' }}>
          <Button
            title="Cerrar sesión"
            variant="ghost"
            onPress={handleLogout}
            style={{ padding: '8px 20px' }}
          />
        </div>
      </div>
    )}

        {/* Modal para editar datos personales del cliente */}
        {data?.customer && (
          <EditCustomerSelfModal
            visible={isEditProfileOpen}
            onClose={() => setIsEditProfileOpen(false)}
            initialName={data.customer.name || ''}
            initialPhone={data.customer.phone || ''}
            documentType={data.customer.document_type}
            documentNumber={data.customer.document_number}
            onSaved={() => {
              refetch();
            }}
          />
        )}

        {/* Modal / Popover contextual de detalle completo del movimiento */}
        {selectedDetailMovement && (
          <div
            role="dialog"
            aria-modal="true"
            onClick={() => setSelectedDetailMovement(null)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.45)',
              backdropFilter: 'blur(3px)',
              WebkitBackdropFilter: 'blur(3px)',
              zIndex: 99999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
              boxSizing: 'border-box',
            }}>
            <div
              onClick={e => e.stopPropagation()}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 18,
                maxWidth: 380,
                width: '100%',
                padding: '18px 20px',
                boxShadow: '0 16px 36px rgba(0,0,0,0.22)',
                border: `1.5px solid ${Colors.border}`,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                boxSizing: 'border-box',
              }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color:
                      selectedDetailMovement.kind === 'credit'
                        ? Colors.destructive
                        : '#15803D',
                    textTransform: 'uppercase',
                    letterSpacing: '0.6px',
                  }}>
                  {selectedDetailMovement.kind === 'credit'
                    ? 'Detalle de compra fiada'
                    : 'Detalle de abono'}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedDetailMovement(null)}
                  style={{
                    border: 'none',
                    background: 'none',
                    padding: 4,
                    cursor: 'pointer',
                    color: Colors.textSecondary,
                    display: 'flex',
                  }}>
                  <IoClose size={20} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: Colors.textMuted }}>
                  QUÉ SE REGISTRÓ:
                </span>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: Colors.text,
                    lineHeight: '21px',
                    backgroundColor: '#FFFDF5',
                    padding: '12px 14px',
                    borderRadius: Radius.md,
                    border: '1px solid #CFE0F1',
                    wordBreak: 'break-word',
                    maxHeight: 180,
                    overflowY: 'auto',
                  }}>
                  {selectedDetailMovement.title}
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: 8,
                  borderTop: `1px solid ${Colors.border}`,
                }}>
                <div>
                  <div style={{ fontSize: 10.5, color: Colors.textMuted, fontWeight: 700 }}>FECHA</div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: Colors.text }}>
                    {formatDateCompact(selectedDetailMovement.date)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 10.5, color: Colors.textMuted, fontWeight: 700 }}>VALOR</div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 900,
                      color:
                        selectedDetailMovement.kind === 'credit'
                          ? Colors.destructive
                          : '#15803D',
                    }}>
                    {selectedDetailMovement.kind === 'credit' ? '+' : '−'}
                    {formatCOP(selectedDetailMovement.amount)}
                  </div>
                </div>
              </div>

              {selectedDetailMovement.dueDate && (
                <div
                  style={{
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: Colors.textSecondary,
                    backgroundColor: '#F1F5F9',
                    padding: '6px 10px',
                    borderRadius: Radius.sm,
                    textAlign: 'center',
                  }}>
                  Fecha límite de pago: {formatDateCompact(selectedDetailMovement.dueDate)}
                </div>
              )}

              <Button
                title="Entendido"
                variant="secondary"
                onPress={() => setSelectedDetailMovement(null)}
                style={{ marginTop: 2, width: '100%' }}
              />
            </div>
          </div>
        )}

        {/* Modal de configuración de notificaciones */}
        <NotificationSettingsModal
          isOpen={isNotifModalOpen}
          onClose={() => setIsNotifModalOpen(false)}
          onActivated={() => setNotifGranted(true)}
        />
    </div>
  );
}
