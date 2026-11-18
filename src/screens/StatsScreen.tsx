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
  IoAlertCircleOutline,
  IoTrendingUpOutline,
  IoTrendingDownOutline,
  IoReceiptOutline,
  IoCashOutline,
  IoChevronForward,
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
  type CustomerStatRow,
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
  const [preset, setPreset] = useState<number>(2);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
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

  const selectedNames = allCustomers
    .filter(c => selectedIds.includes(c.id))
    .map(c => c.alias || c.name);

  // Filtrado de filas de clientes según el chip activo
  const filteredRows = useMemo(() => {
    const list = stats?.rows ?? [];
    if (quickFilter === 'debt') return list.filter(r => r.current_balance > 0);
    if (quickFilter === 'no_abonos') return list.filter(r => r.current_balance > 0 && r.period_payments === 0);
    if (quickFilter === 'uptodate') return list.filter(r => r.current_balance <= 0);
    return list;
  }, [stats?.rows, quickFilter]);

  // Contadores para los chips de filtro
  const countAll = stats?.rows.length ?? 0;
  const countDebt = stats?.customersWithDebtCount ?? 0;
  const countNoAbonos = useMemo(
    () => (stats?.rows ?? []).filter(r => r.current_balance > 0 && r.period_payments === 0).length,
    [stats?.rows],
  );
  const countUpToDate = stats?.customersUpToDateCount ?? 0;

  // Opciones magnéticas para el filtro de clientes (Efecto Imán)
  const customerFilterOptions = useMemo<MagnetFilterOption<QuickFilter>[]>(
    () => [
      { key: 'all', label: `Todos (${countAll})` },
      { key: 'debt', label: `Con deuda (${countDebt})` },
      { key: 'no_abonos', label: `Sin abonos (${countNoAbonos})` },
      { key: 'uptodate', label: `Al día (${countUpToDate})` },
    ],
    [countAll, countDebt, countNoAbonos, countUpToDate],
  );

  // Proporción visual para la barra de fiado vs abonado en el período
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

      <Header title="Estadísticas" subtitle="Conoce cómo va tu cartera" showCurve />

      <div
        style={{
          padding: '0 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          position: 'relative',
          zIndex: 1,
        }}>
        {/* Selector de periodo */}
        <MagnetFilterBar
          scrollable
          options={STATS_PRESET_OPTIONS}
          selectedKey={String(preset)}
          onSelect={key => setPreset(Number(key))}
        />

        {/* Botón de filtrar clientes */}
        <button
          onClick={() => setShowCustomerPicker(true)}
          style={{
            backgroundColor: '#FFFFFF',
            border: `1px solid ${Colors.border}`,
            borderRadius: 14,
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
          }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
            <IoPeopleOutline size={18} color={Colors.primary} />
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: Colors.text,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
              {selectedIds.length === 0
                ? 'Todos los clientes'
                : `${selectedIds.length} seleccionado(s): ${selectedNames.slice(0, 2).join(', ')}${selectedNames.length > 2 ? '…' : ''}`}
            </span>
          </div>
          <IoChevronDown size={16} color={Colors.primary} />
        </button>

        {isLoading ? (
          <Card style={{ textAlign: 'center', padding: 28 }}>
            <span style={{ fontSize: 14, color: Colors.textSecondary, fontWeight: 600 }}>
              Calculando cartera y estadísticas…
            </span>
          </Card>
        ) : (
          <>
            {/* ─── BLOQUE 1: ASÍ ESTÁ TU NEGOCIO ─── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: Colors.textSecondary, letterSpacing: 0.5 }}>
                ASÍ ESTÁ TU NEGOCIO
              </div>

              {/* Indicador Principal: Dinero que te deben hoy (Estado Actual Vivo) */}
              <Card
                style={{
                  padding: 20,
                  backgroundColor: '#FFF7ED',
                  border: `1.5px solid ${Colors.primaryMid}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  boxShadow: '0 4px 14px rgba(234, 88, 12, 0.08)',
                }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: Colors.primary,
                    flexShrink: 0,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  }}>
                  <IoWalletOutline size={26} />
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
                      fontSize: 24,
                      fontWeight: 900,
                      color: Colors.primaryDark,
                      marginTop: 2,
                    }}>
                    {formatCOP(stats?.currentTotalReceivable ?? 0)}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: Colors.primary,
                      marginTop: 2,
                    }}>
                    {stats?.customersWithDebtCount ?? 0} cliente{(stats?.customersWithDebtCount ?? 0) === 1 ? '' : 's'} con saldo pendiente
                  </div>
                </div>
              </Card>

              {/* Indicadores Secundarios: Flujo del período (Fiado vs Abonado) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {/* Fiado en el período */}
                <Card
                  style={{
                    padding: 14,
                    backgroundColor: '#FFF1F0',
                    border: '1.5px solid #FCE0DE',
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        backgroundColor: Colors.destructiveAlt,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                      <IoArrowUp size={12} color={Colors.destructive} />
                    </div>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        letterSpacing: 0.6,
                        color: Colors.destructive,
                      }}>
                      FIADO EN PERÍODO
                    </span>
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: Colors.destructive }}>
                    {formatCOP(stats?.periodCreditsTotal ?? 0)}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: Colors.textSecondary, marginTop: 2 }}>
                    {stats?.periodCreditsCount ?? 0} movimiento{(stats?.periodCreditsCount ?? 0) === 1 ? '' : 's'}
                  </div>
                </Card>

                {/* Recibido en abonos */}
                <Card
                  style={{
                    padding: 14,
                    backgroundColor: Colors.successAlt,
                    border: '1.5px solid #BBF7D0',
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        backgroundColor: '#DCFCE7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                      <IoArrowDown size={12} color={Colors.success} />
                    </div>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        letterSpacing: 0.6,
                        color: Colors.success,
                      }}>
                      RECIBIDO EN ABONOS
                    </span>
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: Colors.success }}>
                    {formatCOP(stats?.periodPaymentsTotal ?? 0)}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: Colors.textSecondary, marginTop: 2 }}>
                    {stats?.periodPaymentsCount ?? 0} movimiento{(stats?.periodPaymentsCount ?? 0) === 1 ? '' : 's'}
                  </div>
                </Card>
              </div>
            </div>

            {/* ─── BLOQUE 2: COMPARACIÓN DEL COMPORTAMIENTO ─── */}
            <Card style={{ padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: Colors.text }}>
                  Flujo del período: Fiado vs Abono
                </span>
                {stats?.periodComparison.paymentsChangePct !== null && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: (stats?.periodComparison.paymentsChangePct ?? 0) >= 0 ? Colors.success : Colors.destructive,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                    }}>
                    {(stats?.periodComparison.paymentsChangePct ?? 0) >= 0 ? (
                      <IoTrendingUpOutline size={14} />
                    ) : (
                      <IoTrendingDownOutline size={14} />
                    )}
                    {(stats?.periodComparison.paymentsChangePct ?? 0) >= 0 ? '+' : ''}
                    {stats?.periodComparison.paymentsChangePct}% abonos vs ant.
                  </span>
                )}
              </div>

              {totalPeriodFlow === 0 ? (
                <div style={{ fontSize: 12, color: Colors.textSecondary, textAlign: 'center', padding: '10px 0' }}>
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
                      marginBottom: 8,
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
                      <span>Abonado: {paymentBarPct}% ({formatCOP(stats?.periodPaymentsTotal ?? 0)})</span>
                    </div>
                  </div>
                </>
              )}
            </Card>

            {/* ─── BLOQUE 3: ATENCIÓN A TUS CLIENTES (Alertas rápidas) ─── */}
            {stats?.alerts.oldestDebtCustomer && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: Colors.textSecondary, letterSpacing: 0.5 }}>
                  ATENCIÓN A TUS CLIENTES
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                  {/* Alerta 1: Mayor tiempo con deuda viva */}
                  <Card
                    onClick={() => navigate(`/customers/${stats.alerts.oldestDebtCustomer!.customer_id}`)}
                    style={{
                      padding: 14,
                      borderLeft: `4px solid ${Colors.primary}`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                      cursor: 'pointer',
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <IoTimeOutline size={16} color={Colors.primary} />
                        <span style={{ fontSize: 12, fontWeight: 800, color: Colors.primaryDark }}>
                          Mayor tiempo con deuda viva
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            backgroundColor: '#FFF7ED',
                            color: Colors.primaryDark,
                            padding: '2px 8px',
                            borderRadius: 8,
                          }}>
                          {stats.alerts.oldestDebtCustomer.debt_days} días
                        </span>
                        <IoChevronForward size={14} color={Colors.textSecondary} />
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: Colors.text }}>
                          {stats.alerts.oldestDebtCustomer.alias || stats.alerts.oldestDebtCustomer.name}
                        </div>
                        <div style={{ fontSize: 11, color: Colors.textSecondary, fontWeight: 600 }}>
                          {stats.alerts.oldestDebtCustomer.days_since_last_payment !== null
                            ? `Último abono: hace ${stats.alerts.oldestDebtCustomer.days_since_last_payment} días`
                            : 'Sin abonos registrados en el ciclo'}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 10, color: Colors.textSecondary, fontWeight: 700 }}>
                          Saldo pendiente
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 900, color: Colors.destructive }}>
                          {formatCOP(stats.alerts.oldestDebtCustomer.current_balance)}
                        </div>
                      </div>
                    </div>

                    {stats.alerts.oldestDebtCustomer.phone && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openWhatsAppCustomerReminder(
                            stats.alerts.oldestDebtCustomer?.phone,
                            stats.alerts.oldestDebtCustomer?.alias || stats.alerts.oldestDebtCustomer?.name || 'Cliente',
                            stats.alerts.oldestDebtCustomer?.current_balance || 0,
                            profile?.store_name,
                          );
                        }}
                        style={{
                          marginTop: 6,
                          padding: '6px 12px',
                          borderRadius: 10,
                          backgroundColor: '#DCFCE7',
                          color: '#16A34A',
                          border: 'none',
                          fontWeight: 700,
                          fontSize: 12,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          cursor: 'pointer',
                        }}>
                        <IoLogoWhatsapp size={15} color="#16A34A" />
                        <span>Enviar recordatorio por WhatsApp</span>
                      </button>
                    )}
                  </Card>
                </div>
              </div>
            )}

            {/* ─── BLOQUE 5: LISTADO DE CLIENTES Y FILTROS RÁPIDOS ─── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: Colors.text, margin: 0 }}>
                  Estado de tus clientes
                </h3>
                <span style={{ fontSize: 12, fontWeight: 700, color: Colors.textSecondary }}>
                  {filteredRows.length} cliente{filteredRows.length === 1 ? '' : 's'}
                </span>
              </div>

              {/* Selector magnético de filtro de clientes (Efecto Imán) */}
              <MagnetFilterBar
                scrollable
                options={customerFilterOptions}
                selectedKey={quickFilter}
                onSelect={setQuickFilter}
              />

              {/* Tarjetas de clientes */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {filteredRows.length === 0 ? (
                  <Card style={{ textAlign: 'center', padding: 28 }}>
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
                          gap: 10,
                        }}>
                        {/* Cabecera de la tarjeta: Nombre + Badge */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: 15, fontWeight: 800, color: Colors.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {row.alias || row.name}
                            </div>
                            {row.alias && (
                              <div style={{ fontSize: 11, color: Colors.textSecondary, fontWeight: 600 }}>
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
                            }}>
                            {badgeLabel}
                          </span>
                        </div>

                        {/* Saldo pendiente actual vivo */}
                        <div
                          style={{
                            backgroundColor: '#F8FAFC',
                            borderRadius: 12,
                            padding: '10px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: Colors.textSecondary }}>
                              Saldo pendiente actual
                            </div>
                            <div
                              style={{
                                fontSize: 18,
                                fontWeight: 900,
                                color: row.current_balance > 0 ? Colors.destructive : Colors.success,
                                marginTop: 1,
                              }}>
                              {formatCOP(row.current_balance)}
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 10, color: Colors.textSecondary, fontWeight: 600 }}>
                              {isAlDia ? 'Sin deuda' : `Deuda viva: ${row.debt_days} días`}
                            </div>
                            <div style={{ fontSize: 11, color: Colors.textSecondary, fontWeight: 700, marginTop: 1 }}>
                              {row.days_since_last_payment !== null
                                ? `Últ. abono: hace ${row.days_since_last_payment}d`
                                : 'Sin abonos'}
                            </div>
                          </div>
                        </div>

                        {/* Resumen del período seleccionado */}
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
                          <span>
                            En este período:
                          </span>
                          <span>
                            Fiado: <strong style={{ color: Colors.text }}>{formatCOP(row.period_credits)}</strong> · Abonado: <strong style={{ color: Colors.success }}>{formatCOP(row.period_payments)}</strong>
                          </span>
                        </div>

                        {/* Botones de acción directa */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                          <button
                            onClick={() => navigate(`/customers/${row.customer_id}`)}
                            style={{
                              flex: 1,
                              padding: '8px 12px',
                              borderRadius: 10,
                              border: `1px solid ${Colors.border}`,
                              backgroundColor: '#FFFFFF',
                              color: Colors.text,
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 4,
                            }}>
                            <IoReceiptOutline size={14} />
                            <span>Ver cuenta</span>
                          </button>

                          {row.current_balance > 0 && (
                            <button
                              onClick={() => navigate(`/payments/new?customerId=${row.customer_id}`)}
                              style={{
                                flex: 1,
                                padding: '8px 12px',
                                borderRadius: 10,
                                border: 'none',
                                backgroundColor: Colors.primaryLight,
                                color: Colors.primaryDark,
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 4,
                              }}>
                              <IoCashOutline size={14} />
                              <span>Abonar</span>
                            </button>
                          )}

                          {row.current_balance > 0 && row.phone && (
                            <button
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
                                width: 36,
                                height: 36,
                                borderRadius: 10,
                                border: 'none',
                                backgroundColor: '#DCFCE7',
                                color: '#16A34A',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                flexShrink: 0,
                              }}>
                              <IoLogoWhatsapp size={18} color="#16A34A" />
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

      {/* Modal selector de clientes */}
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
              maxWidth: 500,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 -10px 40px rgba(0,0,0,0.15)',
              overflow: 'hidden',
            }}>
            <div
              style={{
                padding: '16px 20px',
                borderBottom: `1px solid ${Colors.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: Colors.text }}>
                Filtrar clientes
              </span>
              <button
                onClick={() => setShowCustomerPicker(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: Colors.textSecondary }}>
                <IoClose size={22} />
              </button>
            </div>

            <div style={{ padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                onClick={() => setSelectedIds([])}
                style={{
                  padding: '10px 14px',
                  borderRadius: 12,
                  backgroundColor: selectedIds.length === 0 ? Colors.primaryLight : '#F8FAFC',
                  color: selectedIds.length === 0 ? Colors.primary : Colors.text,
                  fontWeight: 700,
                  fontSize: 14,
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}>
                ✓ Todos los clientes
              </button>

              {allCustomers.map(c => {
                const selected = selectedIds.includes(c.id);
                return (
                  <div
                    key={c.id}
                    onClick={() => toggleCustomer(c.id)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 12,
                      backgroundColor: selected ? Colors.primaryLight : '#F8FAFC',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                    }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: Colors.text }}>
                      {c.alias || c.name}
                    </span>
                    {selected && <IoCheckmark size={18} color={Colors.primary} />}
                  </div>
                );
              })}
            </div>

            <div style={{ padding: '12px 20px 20px', borderTop: `1px solid ${Colors.border}` }}>
              <Button
                title="Listo"
                onPress={() => setShowCustomerPicker(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
