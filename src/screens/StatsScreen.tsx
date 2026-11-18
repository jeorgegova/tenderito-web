import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  IoArrowUp,
  IoArrowDown,
  IoWalletOutline,
  IoPeopleOutline,
  IoChevronDown,
  IoClose,
  IoCheckmark,
  IoLogoWhatsapp,
  IoTimeOutline,
  IoCheckmarkCircle,
  IoHourglassOutline,
  IoBulbOutline,
  IoSearchOutline,
  IoReceiptOutline,
  IoCashOutline,
  IoChevronForward,
  IoRefreshOutline,
} from 'react-icons/io5';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Header } from '../components/ui/Header';
import { DynamicBrandCurves } from '../components/ui/DynamicBrandCurves';
import { MagnetFilterBar, type MagnetFilterOption } from '../components/ui/MagnetFilterBar';
import { fetchCustomers } from '../services/customers';
import { useStore } from '../store/useStore';
import {
  fetchStats,
  openWhatsAppCustomerReminder,
  type StatsFilters,
} from '../services/stats';
import { Colors, formatCOP } from '../theme';
import { getBogotaDaysAgoYMD, getBogotaTodayYMD } from '../utils/format';

const DATE_PRESETS = [
  { label: 'Hoy', getDates: () => ({ from: getBogotaTodayYMD(), to: getBogotaTodayYMD() }) },
  { label: 'Últ. 7 días', getDates: () => ({ from: getBogotaDaysAgoYMD(7), to: getBogotaTodayYMD() }) },
  { label: 'Últ. 30 días', getDates: () => ({ from: getBogotaDaysAgoYMD(30), to: getBogotaTodayYMD() }) },
  { label: 'Este mes', getDates: () => ({ from: getBogotaTodayYMD().slice(0, 7) + '-01', to: getBogotaTodayYMD() }) },
  { label: 'Todo', getDates: () => ({ from: undefined, to: undefined }) },
];

const STATS_PRESET_OPTIONS: MagnetFilterOption[] = [
  { key: '0', label: 'Hoy' },
  { key: '1', label: 'Últ. 7 días' },
  { key: '2', label: 'Últ. 30 días' },
  { key: '3', label: 'Este mes' },
  { key: '4', label: 'Todo' },
];

type QuickFilter = 'all' | 'debt' | 'no_abonos' | 'uptodate';

export function StatsScreen() {
  const navigate = useNavigate();
  const [preset, setPreset] = useState<number>(2); // Default: Últimos 30 días
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');

  const activePreset = DATE_PRESETS[preset];
  const { from, to } = useMemo(() => activePreset.getDates(), [activePreset]);

  const filters: StatsFilters = {
    from,
    to,
    customerIds: selectedIds.length > 0 ? selectedIds : undefined,
    presetIndex: preset,
  };

  const profile = useStore(s => s.profile);

  const { data: allCustomers = [] } = useQuery({
    queryKey: ['customers-all'],
    queryFn: () => fetchCustomers(),
  });

  const { data: stats, isLoading } = useQuery({
    queryKey: ['stats', filters.from, filters.to, selectedIds, preset],
    queryFn: () => fetchStats(filters),
  });

  function toggleCustomer(id: string) {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id],
    );
  }

  function clearCustomerSelection() {
    setSelectedIds([]);
  }

  const selectedNames = useMemo(() => {
    return allCustomers
      .filter(c => selectedIds.includes(c.id))
      .map(c => c.alias || c.name);
  }, [allCustomers, selectedIds]);

  // Clientes filtrados en el buscador del modal
  const filteredCustomersInPicker = useMemo(() => {
    if (!customerSearchTerm.trim()) return allCustomers;
    const term = customerSearchTerm.toLowerCase().trim();
    return allCustomers.filter(c =>
      (c.name || '').toLowerCase().includes(term) ||
      (c.alias || '').toLowerCase().includes(term) ||
      (c.document_number || '').includes(term),
    );
  }, [allCustomers, customerSearchTerm]);

  // Filtrado de filas de clientes según el chip activo (Sección 3)
  const filteredRows = useMemo(() => {
    const list = stats?.rows ?? [];
    if (quickFilter === 'debt') return list.filter(r => r.current_balance > 0);
    if (quickFilter === 'no_abonos') return list.filter(r => r.current_balance > 0 && r.days_since_last_payment === null);
    if (quickFilter === 'uptodate') return list.filter(r => r.current_balance <= 0);
    return list;
  }, [stats?.rows, quickFilter]);

  // Contadores para los chips de filtro
  const countAll = stats?.rows.length ?? 0;
  const countDebt = useMemo(() => (stats?.rows ?? []).filter(r => r.current_balance > 0).length, [stats?.rows]);
  const countNoAbonos = useMemo(
    () => (stats?.rows ?? []).filter(r => r.current_balance > 0 && r.days_since_last_payment === null).length,
    [stats?.rows],
  );
  const countUpToDate = useMemo(() => (stats?.rows ?? []).filter(r => r.current_balance <= 0).length, [stats?.rows]);

  const customerFilterOptions = useMemo<MagnetFilterOption<QuickFilter>[]>(
    () => [
      { key: 'all', label: `Todos (${countAll})` },
      { key: 'debt', label: `Con deuda (${countDebt})` },
      { key: 'no_abonos', label: `Sin abonos (${countNoAbonos})` },
      { key: 'uptodate', label: `Al día (${countUpToDate})` },
    ],
    [countAll, countDebt, countNoAbonos, countUpToDate],
  );

  // Proporción visual para la barra comparativa sencilla de dinero fiado vs recuperado
  const totalPeriodFlow = (stats?.periodCreditsTotal ?? 0) + (stats?.periodPaymentsTotal ?? 0);
  const creditBarPct = totalPeriodFlow > 0 ? Math.round(((stats?.periodCreditsTotal ?? 0) / totalPeriodFlow) * 100) : 50;
  const paymentBarPct = totalPeriodFlow > 0 ? 100 - creditBarPct : 50;

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: Colors.background,
        position: 'relative',
        paddingBottom: 'calc(140px + env(safe-area-inset-bottom, 0px))',
        overflowX: 'hidden',
      }}>
      <DynamicBrandCurves position="bottom-right" />

      <Header title="Estadísticas" subtitle="Así va tu negocio y tus clientes" showCurve />

      <div
        style={{
          padding: '0 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          position: 'relative',
          zIndex: 1,
          maxWidth: 680,
          margin: '0 auto',
          width: '100%',
          boxSizing: 'border-box',
        }}>

        {isLoading ? (
          <Card style={{ textAlign: 'center', padding: 32 }}>
            <span style={{ fontSize: 14, color: Colors.textSecondary, fontWeight: 600 }}>
              Calculando cartera y estadísticas…
            </span>
          </Card>
        ) : (
          <>
            {/* ══════════════════════════════════════════════════════════
                1. PRIMERA SECCIÓN: ASÍ ESTÁ TU NEGOCIO
               ══════════════════════════════════════════════════════════ */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 900, color: Colors.primaryDark, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                  1. Así está tu negocio
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: Colors.textSecondary }}>
                  Visión general
                </span>
              </div>

              {/* Indicador Principal: Dinero total por cobrar (Estado de Cartera Viva) */}
              <Card
                style={{
                  padding: 20,
                  backgroundColor: '#FFF7ED',
                  border: `1.5px solid ${Colors.primaryMid}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  boxShadow: '0 4px 16px rgba(234, 88, 12, 0.08)',
                  borderRadius: 20,
                }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 26,
                    backgroundColor: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: Colors.primary,
                    flexShrink: 0,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  }}>
                  <IoWalletOutline size={28} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: 0.8,
                      color: Colors.primaryDark,
                    }}>
                    DINERO TOTAL POR COBRAR
                  </div>
                  <div
                    style={{
                      fontSize: 26,
                      fontWeight: 900,
                      color: Colors.primaryDark,
                      marginTop: 2,
                      letterSpacing: '-0.5px',
                    }}>
                    {formatCOP(stats?.currentTotalReceivable ?? 0)}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: Colors.primary,
                      marginTop: 3,
                    }}>
                    {stats?.customersWithDebtCount ?? 0} cliente{(stats?.customersWithDebtCount ?? 0) === 1 ? '' : 's'} con saldo pendiente
                  </div>
                </div>
              </Card>

              {/* Contenedor de Movimientos del Período con su filtro asociado */}
              <Card style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14, borderRadius: 20 }}>
                {/* Selector de periodo directamente asociado a los movimientos */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: Colors.text, letterSpacing: 0.5 }}>
                      MOVIMIENTOS EN EL PERÍODO
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: Colors.primary }}>
                      {activePreset.label}
                    </span>
                  </div>

                  <MagnetFilterBar
                    scrollable
                    options={STATS_PRESET_OPTIONS}
                    selectedKey={String(preset)}
                    onSelect={key => setPreset(Number(key))}
                  />
                </div>

                {/* 3 Indicadores: Dinero fiado, Dinero recuperado, Dinero que sigue pendiente */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                    gap: 10,
                  }}>
                  {/* Dinero fiado */}
                  <div
                    style={{
                      padding: '12px 14px',
                      backgroundColor: '#FFF1F0',
                      border: '1.5px solid #FCE0DE',
                      borderRadius: 14,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <IoArrowUp size={14} color={Colors.destructive} />
                      <span style={{ fontSize: 10, fontWeight: 800, color: Colors.destructive, letterSpacing: 0.5 }}>
                        DINERO FIADO
                      </span>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: Colors.destructive }}>
                      {formatCOP(stats?.periodCreditsTotal ?? 0)}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: Colors.textSecondary }}>
                      {stats?.periodCreditsCount ?? 0} fiado{(stats?.periodCreditsCount ?? 0) === 1 ? '' : 's'}
                    </div>
                  </div>

                  {/* Dinero recuperado */}
                  <div
                    style={{
                      padding: '12px 14px',
                      backgroundColor: Colors.successAlt,
                      border: '1.5px solid #BBF7D0',
                      borderRadius: 14,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <IoArrowDown size={14} color={Colors.success} />
                      <span style={{ fontSize: 10, fontWeight: 800, color: Colors.success, letterSpacing: 0.5 }}>
                        RECUPERADO
                      </span>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: Colors.success }}>
                      {formatCOP(stats?.periodPaymentsTotal ?? 0)}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: Colors.textSecondary }}>
                      {stats?.periodPaymentsCount ?? 0} abono{(stats?.periodPaymentsCount ?? 0) === 1 ? '' : 's'}
                    </div>
                  </div>

                  {/* Dinero que sigue pendiente */}
                  <div
                    style={{
                      padding: '12px 14px',
                      backgroundColor: '#FEF3C7',
                      border: '1.5px solid #FDE68A',
                      borderRadius: 14,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <IoHourglassOutline size={14} color="#D97706" />
                      <span style={{ fontSize: 10, fontWeight: 800, color: '#B45309', letterSpacing: 0.5 }}>
                        SIGUE PENDIENTE
                      </span>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: '#B45309' }}>
                      {formatCOP(stats?.periodCreditsPendingTotal ?? 0)}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: Colors.textSecondary }}>
                      De lo fiado en período
                    </div>
                  </div>
                </div>

                {/* Barra comparativa sencilla: Dinero fiado vs Dinero recuperado */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: Colors.text }}>
                      Relación: Fiado vs Recuperado
                    </span>
                  </div>

                  {totalPeriodFlow === 0 ? (
                    <div style={{ fontSize: 12, color: Colors.textSecondary, textAlign: 'center', padding: '6px 0' }}>
                      Sin fiados ni abonos en este período.
                    </div>
                  ) : (
                    <>
                      <div
                        style={{
                          height: 12,
                          borderRadius: 6,
                          backgroundColor: '#F1F5F9',
                          display: 'flex',
                          overflow: 'hidden',
                        }}>
                        <div
                          style={{
                            width: `${creditBarPct}%`,
                            backgroundColor: Colors.destructive,
                            transition: 'width 0.4s ease',
                          }}
                          title={`Fiado: ${formatCOP(stats?.periodCreditsTotal ?? 0)}`}
                        />
                        <div
                          style={{
                            width: `${paymentBarPct}%`,
                            backgroundColor: Colors.success,
                            transition: 'width 0.4s ease',
                          }}
                          title={`Abonado: ${formatCOP(stats?.periodPaymentsTotal ?? 0)}`}
                        />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: Colors.destructive }}>
                          <span style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.destructive }} />
                          <span>Fiado: {creditBarPct}% ({formatCOP(stats?.periodCreditsTotal ?? 0)})</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: Colors.success }}>
                          <span style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.success }} />
                          <span>Recuperado: {paymentBarPct}% ({formatCOP(stats?.periodPaymentsTotal ?? 0)})</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Mensaje dinámico y práctico para tomar decisiones */}
                {stats?.insights.messages && stats.insights.messages.length > 0 && (
                  <div
                    style={{
                      padding: '10px 12px',
                      backgroundColor: '#F8FAFC',
                      borderRadius: 12,
                      border: '1px solid #E2E8F0',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 8,
                      marginTop: 2,
                    }}>
                    <IoBulbOutline size={18} color={Colors.primary} style={{ flexShrink: 0, marginTop: 1 }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: 12, color: Colors.text, fontWeight: 600, lineHeight: 1.4 }}>
                        {stats.insights.messages[0]}
                      </span>
                      {stats.insights.messages[1] && (
                        <span style={{ fontSize: 11, color: Colors.textSecondary, fontWeight: 500, lineHeight: 1.3 }}>
                          {stats.insights.messages[1]}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            </div>

            {/* ══════════════════════════════════════════════════════════
                2. SEGUNDA SECCIÓN: ATENCIÓN A TUS CLIENTES
               ══════════════════════════════════════════════════════════ */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 900, color: Colors.primaryDark, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                  2. Atención a tus clientes
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: Colors.textSecondary }}>
                  Cobros prioritarios
                </span>
              </div>

              {(!stats?.attentionList || stats.attentionList.length === 0) ? (
                <Card
                  style={{
                    padding: 16,
                    backgroundColor: Colors.successAlt,
                    border: '1.5px solid #BBF7D0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    borderRadius: 16,
                  }}>
                  <IoCheckmarkCircle size={26} color={Colors.success} style={{ flexShrink: 0 }} />
                  <div style={{ fontSize: 13, color: '#166534', fontWeight: 700, lineHeight: 1.4 }}>
                    ¡Al día! No tienes clientes con alertas o cobros pendientes prioritarios en este momento.
                  </div>
                </Card>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {stats.attentionList.map(item => (
                    <Card
                      key={item.customer_id}
                      onClick={() => navigate(`/customers/${item.customer_id}`)}
                      style={{
                        padding: 16,
                        borderLeft: `4px solid ${Colors.primary}`,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                        cursor: 'pointer',
                        borderRadius: 16,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                      }}>
                      {/* Cabecera con motivo de atención */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                            backgroundColor: '#FFF7ED',
                            color: Colors.primaryDark,
                            padding: '3px 10px',
                            borderRadius: 10,
                            border: `1px solid ${Colors.primaryMid}`,
                          }}>
                          {item.attention_badge}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: Colors.textSecondary }}>
                          <span style={{ fontSize: 11, fontWeight: 600 }}>Ver cuenta</span>
                          <IoChevronForward size={14} />
                        </div>
                      </div>

                      {/* Nombre y Deuda actual */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 15, fontWeight: 800, color: Colors.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.alias || item.name}
                          </div>
                          {item.alias && (
                            <div style={{ fontSize: 11, color: Colors.textSecondary, fontWeight: 600 }}>
                              {item.name}
                            </div>
                          )}
                          <div style={{ fontSize: 12, color: Colors.textSecondary, fontWeight: 600, marginTop: 4 }}>
                            {item.days_since_last_payment !== null
                              ? `Último abono: hace ${item.days_since_last_payment} días`
                              : 'Sin abonos registrados en la tienda'}
                          </div>
                        </div>

                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: 10, color: Colors.textSecondary, fontWeight: 800, letterSpacing: 0.5 }}>
                            DEBE ACTUALMENTE
                          </div>
                          <div style={{ fontSize: 17, fontWeight: 900, color: Colors.destructive, marginTop: 1 }}>
                            {formatCOP(item.current_balance)}
                          </div>
                          <div style={{ fontSize: 11, color: Colors.textSecondary, fontWeight: 600, marginTop: 2 }}>
                            {item.debt_days} días con deuda
                          </div>
                        </div>
                      </div>

                      {/* Botón WhatsApp directo */}
                      {item.phone && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openWhatsAppCustomerReminder(
                              item.phone,
                              item.alias || item.name,
                              item.current_balance,
                              profile?.store_name,
                            );
                          }}
                          style={{
                            marginTop: 2,
                            padding: '9px 14px',
                            borderRadius: 12,
                            backgroundColor: '#DCFCE7',
                            color: '#15803D',
                            border: '1px solid #BBF7D0',
                            fontWeight: 700,
                            fontSize: 12,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            cursor: 'pointer',
                            transition: 'background-color 0.15s ease',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#BBF7D0')}
                          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#DCFCE7')}>
                          <IoLogoWhatsapp size={16} color="#15803D" />
                          <span>Enviar recordatorio por WhatsApp</span>
                        </button>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* ══════════════════════════════════════════════════════════
                3. TERCERA SECCIÓN: ESTADÍSTICAS POR CLIENTES
               ══════════════════════════════════════════════════════════ */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 900, color: Colors.primaryDark, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                  3. Estadísticas por clientes
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: Colors.textSecondary }}>
                  Individual o grupal
                </span>
              </div>

              {/* Selector de Clientes: Ubicado AQUÍ para no generar confusión */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowCustomerPicker(true)}
                  style={{
                    flex: 1,
                    backgroundColor: '#FFFFFF',
                    border: `1.5px solid ${selectedIds.length > 0 ? Colors.primary : Colors.border}`,
                    borderRadius: 14,
                    padding: '11px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
                    <IoPeopleOutline size={20} color={selectedIds.length > 0 ? Colors.primary : Colors.textSecondary} />
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: selectedIds.length > 0 ? Colors.primaryDark : Colors.text,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                      {selectedIds.length === 0
                        ? `Todos los clientes (${allCustomers.length})`
                        : `${selectedIds.length} cliente${selectedIds.length === 1 ? '' : 's'}: ${selectedNames.slice(0, 2).join(', ')}${selectedNames.length > 2 ? '…' : ''}`}
                    </span>
                  </div>
                  <IoChevronDown size={16} color={selectedIds.length > 0 ? Colors.primary : Colors.textSecondary} />
                </button>

                {selectedIds.length > 0 && (
                  <button
                    type="button"
                    onClick={clearCustomerSelection}
                    title="Ver todos los clientes"
                    style={{
                      padding: '11px 14px',
                      borderRadius: 14,
                      border: `1px solid ${Colors.border}`,
                      backgroundColor: '#FFFFFF',
                      color: Colors.textSecondary,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      flexShrink: 0,
                    }}>
                    <IoRefreshOutline size={16} />
                    <span>Ver todos</span>
                  </button>
                )}
              </div>

              {/* Indicadores Consolidados de los clientes seleccionados */}
              <Card style={{ padding: 16, borderRadius: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: Colors.text, letterSpacing: 0.5 }}>
                    {selectedIds.length === 0
                      ? 'RESUMEN GENERAL DE CLIENTES'
                      : `RESUMEN DE ${selectedIds.length} CLIENTE${selectedIds.length === 1 ? '' : 'S'} SELECCIONADO${selectedIds.length === 1 ? '' : 'S'}`}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: Colors.textSecondary }}>
                    En {activePreset.label}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {/* Saldo pendiente actual */}
                  <div
                    style={{
                      padding: '10px 12px',
                      backgroundColor: '#F8FAFC',
                      borderRadius: 12,
                      border: '1px solid #E2E8F0',
                    }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: Colors.textSecondary, letterSpacing: 0.5 }}>
                      SALDO PENDIENTE ACTUAL
                    </div>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 900,
                        color: (stats?.consolidation.selectedCurrentBalance ?? 0) > 0 ? Colors.destructive : Colors.success,
                        marginTop: 2,
                      }}>
                      {formatCOP(stats?.consolidation.selectedCurrentBalance ?? 0)}
                    </div>
                  </div>

                  {/* Cantidad de fiados en período */}
                  <div
                    style={{
                      padding: '10px 12px',
                      backgroundColor: '#F8FAFC',
                      borderRadius: 12,
                      border: '1px solid #E2E8F0',
                    }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: Colors.textSecondary, letterSpacing: 0.5 }}>
                      FIADOS REALIZADOS
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: Colors.text, marginTop: 2 }}>
                      {stats?.consolidation.selectedCreditsCount ?? 0} movimiento{(stats?.consolidation.selectedCreditsCount ?? 0) === 1 ? '' : 's'}
                    </div>
                  </div>

                  {/* Total fiado en período */}
                  <div
                    style={{
                      padding: '10px 12px',
                      backgroundColor: '#FFF1F0',
                      borderRadius: 12,
                      border: '1px solid #FCE0DE',
                    }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: Colors.destructive, letterSpacing: 0.5 }}>
                      TOTAL FIADO ({activePreset.label})
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: Colors.destructive, marginTop: 2 }}>
                      {formatCOP(stats?.consolidation.selectedCreditsTotal ?? 0)}
                    </div>
                  </div>

                  {/* Total abonado en período */}
                  <div
                    style={{
                      padding: '10px 12px',
                      backgroundColor: Colors.successAlt,
                      borderRadius: 12,
                      border: '1px solid #BBF7D0',
                    }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: Colors.success, letterSpacing: 0.5 }}>
                      TOTAL ABONADO ({activePreset.label})
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: Colors.success, marginTop: 2 }}>
                      {formatCOP(stats?.consolidation.selectedPaymentsTotal ?? 0)}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Filtro rápido por estado (Chips magnéticos) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: Colors.text }}>
                    Listado de clientes
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: Colors.textSecondary }}>
                    {filteredRows.length} cliente{filteredRows.length === 1 ? '' : 's'}
                  </span>
                </div>

                <MagnetFilterBar
                  scrollable
                  options={customerFilterOptions}
                  selectedKey={quickFilter}
                  onSelect={setQuickFilter}
                />
              </div>

              {/* Tarjetas individuales de clientes con jerarquía mejorada */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {filteredRows.length === 0 ? (
                  <Card style={{ textAlign: 'center', padding: 28, borderRadius: 16 }}>
                    <span style={{ fontSize: 13, color: Colors.textSecondary, fontWeight: 600 }}>
                      No hay clientes en esta categoría.
                    </span>
                  </Card>
                ) : (
                  filteredRows.map(row => {
                    const isAlDia = row.current_balance <= 0;
                    const hasAbonoInPeriod = row.period_payments > 0;

                    const badgeBg = isAlDia ? '#DCFCE7' : hasAbonoInPeriod ? '#E0F2FE' : '#FEF3C7';
                    const badgeFg = isAlDia ? '#16A34A' : hasAbonoInPeriod ? '#0284C7' : '#D97706';
                    const badgeLabel = isAlDia ? 'Al día' : hasAbonoInPeriod ? 'Abonó en período' : 'Con deuda';

                    return (
                      <Card
                        key={row.customer_id}
                        style={{
                          padding: 16,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 12,
                          borderRadius: 18,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                        }}>
                        {/* 1. Información Principal: Nombre + Badge + Saldo Pendiente Destacado */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: 16, fontWeight: 800, color: Colors.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {row.alias || row.name}
                            </div>
                            {row.alias && (
                              <div style={{ fontSize: 12, color: Colors.textSecondary, fontWeight: 600 }}>
                                {row.name}
                              </div>
                            )}
                          </div>

                          <span
                            style={{
                              backgroundColor: badgeBg,
                              color: badgeFg,
                              padding: '3px 8px',
                              borderRadius: 8,
                              fontSize: 11,
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              letterSpacing: 0.5,
                              flexShrink: 0,
                            }}>
                            {badgeLabel}
                          </span>
                        </div>

                        {/* Bloque Destacado de Saldo Actual y Antigüedad */}
                        <div
                          style={{
                            backgroundColor: '#F8FAFC',
                            borderRadius: 14,
                            padding: '12px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}>
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 800, color: Colors.textSecondary, letterSpacing: 0.5 }}>
                              SALDO PENDIENTE ACTUAL
                            </div>
                            <div
                              style={{
                                fontSize: 20,
                                fontWeight: 900,
                                color: row.current_balance > 0 ? Colors.destructive : Colors.success,
                                marginTop: 1,
                              }}>
                              {formatCOP(row.current_balance)}
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 11, color: Colors.textSecondary, fontWeight: 700 }}>
                              {isAlDia ? 'Sin deuda' : `Deuda: ${row.debt_days} días`}
                            </div>
                            <div style={{ fontSize: 11, color: Colors.textSecondary, fontWeight: 600, marginTop: 2 }}>
                              {row.days_since_last_payment !== null
                                ? `Últ. abono: hace ${row.days_since_last_payment}d`
                                : 'Sin abonos'}
                            </div>
                          </div>
                        </div>

                        {/* 2. Información Complementaria: Movimientos del período */}
                        <div
                          style={{
                            fontSize: 12,
                            color: Colors.textSecondary,
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0 2px',
                          }}>
                          <span>En este período ({activePreset.label}):</span>
                          <span>
                            Fiado: <strong style={{ color: Colors.destructive }}>{formatCOP(row.period_credits)}</strong> · Abonado: <strong style={{ color: Colors.success }}>{formatCOP(row.period_payments)}</strong>
                          </span>
                        </div>

                        {/* 3. Acciones claras que no compiten visualmente */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                          <button
                            type="button"
                            onClick={() => navigate(`/customers/${row.customer_id}`)}
                            style={{
                              flex: 1,
                              padding: '9px 12px',
                              borderRadius: 12,
                              border: `1px solid ${Colors.border}`,
                              backgroundColor: '#FFFFFF',
                              color: Colors.text,
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 6,
                            }}>
                            <IoReceiptOutline size={15} />
                            <span>Ver cuenta</span>
                          </button>

                          {row.current_balance > 0 && (
                            <button
                              type="button"
                              onClick={() => navigate(`/new-payment?customerId=${row.customer_id}`)}
                              style={{
                                flex: 1,
                                padding: '9px 12px',
                                borderRadius: 12,
                                border: 'none',
                                backgroundColor: Colors.primaryLight,
                                color: Colors.primaryDark,
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                              }}>
                              <IoCashOutline size={15} />
                              <span>Abonar</span>
                            </button>
                          )}

                          {row.current_balance > 0 && row.phone && (
                            <button
                              type="button"
                              onClick={() =>
                                openWhatsAppCustomerReminder(
                                  row.phone,
                                  row.alias || row.name,
                                  row.current_balance,
                                  profile?.store_name,
                                )
                              }
                              title="Recordar saldo por WhatsApp"
                              style={{
                                width: 40,
                                height: 40,
                                borderRadius: 12,
                                border: '1px solid #BBF7D0',
                                backgroundColor: '#DCFCE7',
                                color: '#16A34A',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                flexShrink: 0,
                              }}>
                              <IoLogoWhatsapp size={19} color="#16A34A" />
                            </button>
                          )}
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════
          MODAL SELECTOR DE CLIENTES (Búsqueda + Selección Múltiple)
         ══════════════════════════════════════════════════════════ */}
      {showCustomerPicker && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}>
          <div
            style={{
              backgroundColor: '#FFFFFF',
              width: '100%',
              maxWidth: 520,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 -10px 40px rgba(0,0,0,0.15)',
              overflow: 'hidden',
            }}>
            {/* Cabecera del modal */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: `1px solid ${Colors.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: Colors.text }}>
                Filtrar por clientes
              </span>
              <button
                type="button"
                onClick={() => setShowCustomerPicker(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: Colors.textSecondary }}>
                <IoClose size={22} />
              </button>
            </div>

            {/* Buscador de clientes */}
            <div style={{ padding: '12px 20px 8px', borderBottom: `1px solid ${Colors.border}` }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  backgroundColor: '#F8FAFC',
                  borderRadius: 12,
                  padding: '8px 12px',
                  border: '1px solid #E2E8F0',
                }}>
                <IoSearchOutline size={18} color={Colors.textSecondary} />
                <input
                  type="text"
                  placeholder="Buscar por nombre o cédula…"
                  value={customerSearchTerm}
                  onChange={e => setCustomerSearchTerm(e.target.value)}
                  style={{
                    border: 'none',
                    background: 'none',
                    outline: 'none',
                    fontSize: 13,
                    fontWeight: 600,
                    width: '100%',
                    color: Colors.text,
                  }}
                />
                {customerSearchTerm && (
                  <button
                    type="button"
                    onClick={() => setCustomerSearchTerm('')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: Colors.textSecondary, padding: 0 }}>
                    <IoClose size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Lista scrolleable de clientes */}
            <div style={{ padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
              <button
                type="button"
                onClick={() => {
                  setSelectedIds([]);
                  setShowCustomerPicker(false);
                }}
                style={{
                  padding: '12px 14px',
                  borderRadius: 14,
                  backgroundColor: selectedIds.length === 0 ? Colors.primaryLight : '#F8FAFC',
                  color: selectedIds.length === 0 ? Colors.primaryDark : Colors.text,
                  fontWeight: 800,
                  fontSize: 14,
                  border: selectedIds.length === 0 ? `1.5px solid ${Colors.primary}` : '1px solid #E2E8F0',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                <span>✓ Todos los clientes ({allCustomers.length})</span>
                {selectedIds.length === 0 && <IoCheckmark size={18} color={Colors.primary} />}
              </button>

              {filteredCustomersInPicker.map(c => {
                const selected = selectedIds.includes(c.id);
                return (
                  <div
                    key={c.id}
                    onClick={() => toggleCustomer(c.id)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 14,
                      backgroundColor: selected ? Colors.primaryLight : '#F8FAFC',
                      border: selected ? `1.5px solid ${Colors.primary}` : '1px solid #E2E8F0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                    }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: Colors.text }}>
                        {c.alias || c.name}
                      </div>
                      {c.alias && (
                        <div style={{ fontSize: 11, color: Colors.textSecondary }}>
                          {c.name}
                        </div>
                      )}
                    </div>
                    {selected ? (
                      <IoCheckmark size={20} color={Colors.primary} />
                    ) : (
                      <div
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 6,
                          border: `1.5px solid ${Colors.border}`,
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer del modal con acciones */}
            <div style={{ padding: '14px 20px 20px', borderTop: `1px solid ${Colors.border}`, display: 'flex', gap: 10 }}>
              {selectedIds.length > 0 && (
                <button
                  type="button"
                  onClick={clearCustomerSelection}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: 14,
                    border: `1px solid ${Colors.border}`,
                    backgroundColor: '#FFFFFF',
                    color: Colors.textSecondary,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}>
                  Limpiar selección
                </button>
              )}
              <Button
                title={selectedIds.length > 0 ? `Ver (${selectedIds.length}) seleccionados` : 'Listo'}
                variant="primary"
                style={{ flex: 1.5 }}
                onPress={() => setShowCustomerPicker(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
