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
} from 'react-icons/io5';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Header } from '../components/ui/Header';
import { DynamicBrandCurves } from '../components/ui/DynamicBrandCurves';
import { MagnetFilterBar, type MagnetFilterOption } from '../components/ui/MagnetFilterBar';
import { fetchCustomers } from '../services/customers';
import { fetchStats, type StatsFilters } from '../services/stats';
import { Colors, formatCOP } from '../theme';
import { getBogotaDaysAgoYMD, getBogotaTodayYMD } from '../utils/format';
import { MagnetTabBar } from '../components/ui/MagnetTabBar';

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

export function StatsScreen() {
  const navigate = useNavigate();
  const [preset, setPreset] = useState<number>(2);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);

  const activePreset = DATE_PRESETS[preset];
  const { from, to } = useMemo(() => activePreset.getDates(), [activePreset]);
  const filters: StatsFilters = {
    from,
    to,
    customerIds: selectedIds.length > 0 ? selectedIds : undefined,
  };

  const { data: allCustomers = [] } = useQuery({
    queryKey: ['customers-all'],
    queryFn: () => fetchCustomers(),
  });

  const { data: stats, isLoading } = useQuery({
    queryKey: ['stats', filters.from, filters.to, selectedIds],
    queryFn: () => fetchStats(filters),
  });

  const maxVal = useMemo(
    () =>
      Math.max(
        ...(stats?.rows.map(r => Math.max(r.total_credits, r.total_payments)) ?? [1]),
        1,
      ),
    [stats],
  );

  function toggleCustomer(id: string) {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id],
    );
  }

  const selectedNames = allCustomers
    .filter(c => selectedIds.includes(c.id))
    .map(c => c.alias || c.name);

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: Colors.background,
        position: 'relative',
        paddingBottom: 110,
        overflowX: 'hidden',
      }}>
      <DynamicBrandCurves position="bottom-right" />

      <Header title="Estadísticas" subtitle="Deudas, abonos y saldo por cliente" showCurve />

      <div
        style={{
          padding: '0 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
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

        {/* Resumen fiado y abonado */}
        {isLoading ? (
          <Card style={{ textAlign: 'center', padding: 20 }}>
            <span style={{ fontSize: 13, color: Colors.textSecondary }}>Calculando estadísticas…</span>
          </Card>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Card
                style={{
                  padding: 16,
                  backgroundColor: '#FFF1F0',
                  border: '1.5px solid #FCE0DE',
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      backgroundColor: Colors.destructiveAlt,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <IoArrowUp size={13} color={Colors.destructive} />
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: 0.8,
                      color: Colors.destructive,
                    }}>
                    TOTAL FIADO
                  </span>
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: Colors.destructive }}>
                  {formatCOP(stats?.totalCredits ?? 0)}
                </div>
              </Card>

              <Card
                style={{
                  padding: 16,
                  backgroundColor: Colors.successAlt,
                  border: `1.5px solid #BBF7D0`,
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      backgroundColor: '#DCFCE7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <IoArrowDown size={13} color={Colors.success} />
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: 0.8,
                      color: Colors.success,
                    }}>
                    TOTAL ABONADO
                  </span>
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: Colors.success }}>
                  {formatCOP(stats?.totalPayments ?? 0)}
                </div>
              </Card>
            </div>

            {/* Saldo pendiente neto */}
            <Card
              style={{
                padding: 18,
                backgroundColor: Colors.primaryLight,
                border: `1.5px solid ${Colors.primaryMid}`,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: Colors.primary,
                  flexShrink: 0,
                }}>
                <IoWalletOutline size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: 0.8,
                    color: Colors.primaryDark,
                  }}>
                  SALDO PENDIENTE NETO
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: Colors.primaryDark, marginTop: 2 }}>
                  {formatCOP(stats?.netBalance ?? 0)}
                </div>
              </div>
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 12,
                  padding: '6px 12px',
                  textAlign: 'center',
                }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: Colors.primary }}>
                  {stats?.customerCount ?? 0}
                </div>
                <div style={{ fontSize: 10, color: Colors.textSecondary, fontWeight: 600 }}>
                  clientes
                </div>
              </div>
            </Card>

            {/* Desglose por cliente */}
            <h3 style={{ fontSize: 16, fontWeight: 800, color: Colors.text, margin: '8px 0 0' }}>
              Comportamiento por cliente
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(stats?.rows ?? []).length === 0 ? (
                <Card style={{ textAlign: 'center', padding: 24 }}>
                  <span style={{ fontSize: 13, color: Colors.textSecondary }}>
                    No hay movimientos en este periodo seleccionado.
                  </span>
                </Card>
              ) : (
                stats?.rows.map(row => {
                  const creditPct = Math.round((row.total_credits / maxVal) * 100);
                  const paymentPct = Math.round((row.total_payments / maxVal) * 100);

                  return (
                    <Card
                      key={row.customer_id}
                      onClick={() => navigate(`/customers/${row.customer_id}`)}
                      style={{ padding: 16, cursor: 'pointer' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: 8,
                        }}>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 800, color: Colors.text }}>
                            {row.alias || row.name}
                          </div>
                          {row.alias && (
                            <div style={{ fontSize: 12, color: Colors.textSecondary }}>
                              {row.name}
                            </div>
                          )}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 11, color: Colors.textMuted, fontWeight: 600 }}>
                            Saldo
                          </div>
                          <div style={{ fontSize: 15, fontWeight: 800, color: Colors.text }}>
                            {formatCOP(row.balance)}
                          </div>
                        </div>
                      </div>

                      {/* Barras comparativas de fiado vs abonado */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 11, color: Colors.destructive, width: 48, fontWeight: 700 }}>
                            Fiado:
                          </span>
                          <div
                            style={{
                              flex: 1,
                              height: 8,
                              backgroundColor: '#F1F5F9',
                              borderRadius: 4,
                              overflow: 'hidden',
                            }}>
                            <div
                              style={{
                                width: `${creditPct}%`,
                                height: '100%',
                                backgroundColor: Colors.destructive,
                                borderRadius: 4,
                              }}
                            />
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 700, color: Colors.text, width: 70, textAlign: 'right' }}>
                            {formatCOP(row.total_credits)}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 11, color: Colors.success, width: 48, fontWeight: 700 }}>
                            Abono:
                          </span>
                          <div
                            style={{
                              flex: 1,
                              height: 8,
                              backgroundColor: '#F1F5F9',
                              borderRadius: 4,
                              overflow: 'hidden',
                            }}>
                            <div
                              style={{
                                width: `${paymentPct}%`,
                                height: '100%',
                                backgroundColor: Colors.success,
                                borderRadius: 4,
                              }}
                            />
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 700, color: Colors.text, width: 70, textAlign: 'right' }}>
                            {formatCOP(row.total_payments)}
                          </span>
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
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
