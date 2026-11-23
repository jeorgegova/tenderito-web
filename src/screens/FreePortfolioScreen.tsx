import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { resetScroll } from '../components/ui/ScrollToTop';
import {
  IoArrowBack,
  IoCheckmarkCircle,
  IoCheckmark,
  IoInformationCircleOutline,
  IoPeopleOutline,
} from 'react-icons/io5';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { showAlert } from '../components/ui/AlertModal';
import { fetchCustomers } from '../services/customers';
import {
  fetchFreePortfolioStatus,
  setFreePortfolioSelection,
} from '../services/portfolio';
import { Colors, formatCOP } from '../theme';
import { DynamicBrandCurves } from '../components/ui/DynamicBrandCurves';

export function FreePortfolioScreen() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [saving, setSaving] = useState(false);

  useLayoutEffect(() => {
    resetScroll();
  }, []);

  const statusQuery = useQuery({
    queryKey: ['free-portfolio'],
    queryFn: fetchFreePortfolioStatus,
  });

  const customersQuery = useQuery({
    queryKey: ['customers-all'],
    queryFn: () => fetchCustomers(),
  });

  const status = statusQuery.data;
  const limit = Number(status?.limit ?? 10);
  const isUnlimited = limit >= 999999 || Boolean(status?.is_unlimited);

  const activeCustomers = useMemo(
    () =>
      (customersQuery.data ?? [])
        .filter(customer => Number(customer.current_balance) > 0)
        .sort((a, b) => Number(b.current_balance) - Number(a.current_balance)),
    [customersQuery.data],
  );

  useEffect(() => {
    if (hasInitialized || !customersQuery.data) return;

    const initialSelected = (customersQuery.data || [])
      .filter(
        c =>
          Number(c.current_balance) > 0 &&
          (c.free_plan_selected === true || (c as any).free_plan_selected === 1),
      )
      .map(c => c.id);

    if (initialSelected.length > 0) {
      setSelectedIds(initialSelected);
    } else if (activeCustomers.length > 0 && !isUnlimited) {
      // Si ninguno estaba marcado, pre-seleccionar hasta el cupo del plan
      setSelectedIds(activeCustomers.slice(0, limit).map(c => c.id));
    }
    setHasInitialized(true);
  }, [customersQuery.data, activeCustomers, limit, isUnlimited, hasInitialized]);

  function toggleCustomer(customerId: string) {
    if (saving || isUnlimited) return;

    setSelectedIds(current => {
      if (current.includes(customerId)) {
        return current.filter(id => id !== customerId);
      }
      if (current.length >= limit) {
        showAlert(
          'Cupos completos',
          `Tu suscripción permite hasta ${limit} clientes con cartera activa. Deselecciona uno para poder elegir otro.`,
        );
        return current;
      }
      return [...current, customerId];
    });
  }

  async function saveSelection() {
    if (saving || isUnlimited) return;

    if (selectedIds.length === 0 && activeCustomers.length > 0) {
      showAlert(
        'Selecciona tu cartera',
        'Elige al menos un cliente para continuar manejando su cartera activa.',
      );
      return;
    }

    try {
      setSaving(true);
      await setFreePortfolioSelection(selectedIds);
      await queryClient.invalidateQueries({ queryKey: ['free-portfolio'] });
      await queryClient.invalidateQueries({ queryKey: ['customers-all'] });
      await queryClient.invalidateQueries({ queryKey: ['customers'] });
      await queryClient.invalidateQueries({ queryKey: ['customer'] });

      showAlert({
        title: 'Cartera actualizada',
        message:
          'Los clientes seleccionados conservarán su cartera activa. Los clientes no seleccionados solo podrán recibir abonos.',
        type: 'success',
      });
    } catch (e: any) {
      showAlert('No se pudo guardar', e?.message ?? 'Intenta de nuevo');
    } finally {
      setSaving(false);
    }
  }

  const remainingSlots = isUnlimited ? 999999 : Math.max(0, limit - selectedIds.length);

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: Colors.background,
        position: 'relative',
        paddingBottom: 40,
        overflowX: 'hidden',
      }}>
      <DynamicBrandCurves position="top-right" />

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: `1px solid ${Colors.border}`,
          backgroundColor: '#FFFFFF',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}>
        <button
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
          }}>
          <IoArrowBack size={20} />
          <span>Volver</span>
        </button>
        <span style={{ fontSize: 16, fontWeight: 800, color: Colors.text }}>
          Gestión de Cartera
        </span>
        <div style={{ width: 40 }} />
      </div>

      <div
        style={{
          padding: '20px',
          maxWidth: 480,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          position: 'relative',
          zIndex: 1,
        }}>
        {isUnlimited ? (
          <Card
            style={{
              padding: 18,
              backgroundColor: '#DCFCE7',
              border: '1.5px solid #86EFAC',
            }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <IoCheckmarkCircle size={24} color="#15803D" />
              <h2 style={{ fontSize: 17, fontWeight: 800, color: '#15803D', margin: 0 }}>
                Cartera Ilimitada
              </h2>
            </div>
            <p style={{ fontSize: 13, color: '#166534', margin: 0, lineHeight: 1.5 }}>
              Tu plan actual no tiene límite de clientes con cartera activa. Todos tus clientes pueden recibir nuevos fiados y abonos con total normalidad.
            </p>
          </Card>
        ) : (
          <Card
            style={{
              padding: 18,
              backgroundColor: '#FFF7ED',
              border: `1.5px solid #FED7AA`,
            }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: '#FFEDD5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: Colors.primary,
                }}>
                <IoPeopleOutline size={20} />
              </div>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 800, color: Colors.text, margin: 0 }}>
                  Cartera activa del plan
                </h2>
                <span style={{ fontSize: 12, color: Colors.textSecondary, fontWeight: 600 }}>
                  Límite de suscripción: {limit} clientes con saldo &gt; $0
                </span>
              </div>
            </div>

            <p
              style={{
                fontSize: 13,
                color: Colors.textSecondary,
                lineHeight: 1.45,
                margin: '8px 0 14px',
              }}>
              Solo los clientes seleccionados pueden recibir <strong>nuevos fiados</strong>. Los clientes no seleccionados conservan su deuda pero <strong>solo reciben abonos</strong>. Cuando un cliente termina de pagar y su saldo llega a $0, se libera un cupo automáticamente.
            </p>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: 12,
                borderTop: '1px solid #FED7AA',
                fontSize: 13,
                fontWeight: 700,
              }}>
              <span>Cupos en uso: <strong style={{ color: Colors.primary }}>{selectedIds.length} / {limit}</strong></span>
              <span>Disponibles: <strong style={{ color: remainingSlots > 0 ? '#15803D' : Colors.destructive }}>{remainingSlots}</strong></span>
            </div>
          </Card>
        )}

        {/* Sección de clientes */}
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10,
            }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: Colors.text }}>
              Clientes con saldo pendiente ({activeCustomers.length})
            </span>
            {!isUnlimited && (
              <span style={{ fontSize: 12, color: Colors.textSecondary }}>
                {selectedIds.length} de {limit} seleccionados
              </span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {activeCustomers.length === 0 ? (
              <Card style={{ textAlign: 'center', padding: 28 }}>
                <IoCheckmarkCircle
                  size={36}
                  color={Colors.primary}
                  style={{ margin: '0 auto 8px', display: 'block' }}
                />
                <div style={{ fontSize: 15, fontWeight: 800, color: Colors.text }}>
                  Sin deudas pendientes
                </div>
                <p style={{ fontSize: 13, color: Colors.textSecondary, margin: '4px 0 0' }}>
                  Todos tus clientes están al día ($0). Puedes otorgar fiados a cualquier cliente hasta alcanzar el límite de tu plan.
                </p>
              </Card>
            ) : (
              activeCustomers.map(c => {
                const selected = isUnlimited || selectedIds.includes(c.id);

                return (
                  <Card
                    key={c.id}
                    onClick={() => !isUnlimited && toggleCustomer(c.id)}
                    style={{
                      padding: 14,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: isUnlimited ? 'default' : 'pointer',
                      border: `1.5px solid ${selected ? Colors.primary : Colors.border}`,
                      backgroundColor: selected ? Colors.primaryLight : '#FFFFFF',
                      transition: 'all 0.15s',
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {!isUnlimited && (
                        <div
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 12,
                            border: `2px solid ${selected ? Colors.primary : Colors.borderStrong}`,
                            backgroundColor: selected ? Colors.primary : '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#FFFFFF',
                          }}>
                          {selected && <IoCheckmark size={16} />}
                        </div>
                      )}

                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: Colors.text }}>
                          {c.alias || c.name}
                        </div>
                        <div style={{ fontSize: 12, color: Colors.textSecondary }}>
                          Debe: <strong>{formatCOP(Number(c.current_balance))}</strong>
                        </div>
                      </div>
                    </div>

                    <div>
                      {selected ? (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '4px 8px',
                            borderRadius: 8,
                            backgroundColor: '#DCFCE7',
                            color: '#15803D',
                          }}>
                          Cartera activa
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '4px 8px',
                            borderRadius: 8,
                            backgroundColor: '#FEE2E2',
                            color: Colors.destructive,
                          }}>
                          Solo abonos
                        </span>
                      )}
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        {!isUnlimited && activeCustomers.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <Button
              title={saving ? 'Guardando…' : 'Guardar selección de cartera'}
              onPress={saveSelection}
              disabled={saving}
            />
          </div>
        )}
      </div>
    </div>
  );
}
