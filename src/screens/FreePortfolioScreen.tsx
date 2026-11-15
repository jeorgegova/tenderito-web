import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { IoArrowBack, IoCheckmarkCircle, IoCheckmark } from 'react-icons/io5';
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
  const [saving, setSaving] = useState(false);

  const statusQuery = useQuery({
    queryKey: ['free-portfolio'],
    queryFn: fetchFreePortfolioStatus,
  });

  const customersQuery = useQuery({
    queryKey: ['customers-all'],
    queryFn: () => fetchCustomers(),
  });

  const status = statusQuery.data;
  const pending = Boolean(status?.selection_pending);
  const limit = Number(status?.limit ?? 10);

  const activeCustomers = useMemo(
    () =>
      (customersQuery.data ?? [])
        .filter(customer => Number(customer.current_balance) > 0)
        .sort((a, b) => Number(b.current_balance) - Number(a.current_balance)),
    [customersQuery.data],
  );

  useEffect(() => {
    if (!pending) return;
    setSelectedIds([]);
  }, [pending]);

  function toggleCustomer(customerId: string) {
    if (!pending || saving) return;

    setSelectedIds(current => {
      if (current.includes(customerId)) {
        return current.filter(id => id !== customerId);
      }
      if (current.length >= limit) {
        showAlert(
          'Cupos completos',
          `Tu plan Free permite ${limit} clientes con cartera activa. Quita uno para elegir otro.`,
        );
        return current;
      }
      return [...current, customerId];
    });
  }

  async function saveSelection() {
    if (!pending || saving) return;

    if (selectedIds.length === 0) {
      showAlert(
        'Selecciona tu cartera',
        'Elige al menos un cliente para continuar manejando su cartera.',
      );
      return;
    }

    try {
      setSaving(true);
      await setFreePortfolioSelection(selectedIds);
      await queryClient.invalidateQueries({ queryKey: ['free-portfolio'] });
      await queryClient.invalidateQueries({ queryKey: ['customers-all'] });
      await queryClient.invalidateQueries({ queryKey: ['customers'] });

      showAlert({
        title: 'Cartera seleccionada',
        message: 'Tu cartera activa para el plan Free fue guardada exitosamente.',
        type: 'success',
        buttons: [{ text: 'Entendido', onPress: () => navigate('/') }],
      });
    } catch (e: any) {
      showAlert('No se pudo guardar', e?.message ?? 'Intenta de nuevo');
    } finally {
      setSaving(false);
    }
  }

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
          Cartera Free
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
        {/* Banner explicativo */}
        <Card
          style={{
            padding: 18,
            backgroundColor: pending ? '#FEF3C7' : Colors.primaryLight,
            border: `1.5px solid ${pending ? '#F59E0B' : Colors.primaryMid}`,
          }}>
          <h2
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: pending ? '#92400E' : Colors.primaryDark,
              margin: '0 0 6px',
            }}>
            {pending
              ? `Elige tus ${limit} clientes activos`
              : 'Cartera activa del plan Free'}
          </h2>
          <p
            style={{
              fontSize: 13,
              color: pending ? '#B45309' : Colors.textSecondary,
              lineHeight: 1.4,
              margin: 0,
            }}>
            {pending
              ? `Tu plan Free te permite gestionar hasta ${limit} clientes con saldo activo. Selecciona los clientes prioritarios que seguirán teniendo crédito.`
              : `Has seleccionado ${selectedIds.length || status?.active_count || 0} de ${limit} cupos permitidos.`}
          </p>

          <div
            style={{
              marginTop: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontWeight: 800,
              fontSize: 14,
              color: Colors.text,
            }}>
            <span>Cupos seleccionados:</span>
            <span style={{ color: Colors.primary, fontSize: 16 }}>
              {selectedIds.length} / {limit}
            </span>
          </div>
        </Card>

        {/* Lista de clientes con deuda */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {activeCustomers.length === 0 ? (
            <Card style={{ textAlign: 'center', padding: 24 }}>
              <span style={{ fontSize: 13, color: Colors.textSecondary }}>
                No tienes clientes con deudas activas actualmente.
              </span>
            </Card>
          ) : (
            activeCustomers.map(c => {
              const selected = selectedIds.includes(c.id);

              return (
                <Card
                  key={c.id}
                  onClick={() => toggleCustomer(c.id)}
                  style={{
                    padding: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: pending ? 'pointer' : 'default',
                    border: `1.5px solid ${selected ? Colors.primary : Colors.border}`,
                    backgroundColor: selected ? Colors.primaryLight : '#FFFFFF',
                    transition: 'all 0.15s',
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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

                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: Colors.text }}>
                        {c.alias || c.name}
                      </div>
                      <div style={{ fontSize: 12, color: Colors.textSecondary }}>
                        Debe: {formatCOP(Number(c.current_balance))}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>

        {pending && (
          <div style={{ marginTop: 10 }}>
            <Button
              title={saving ? 'Guardando…' : 'Confirmar selección de cartera'}
              onPress={saveSelection}
              disabled={saving || selectedIds.length === 0}
            />
          </div>
        )}
      </div>
    </div>
  );
}
