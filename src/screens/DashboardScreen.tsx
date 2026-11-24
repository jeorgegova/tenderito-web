import React, { useState, useEffect, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { resetScroll } from '../components/ui/ScrollToTop';
import {
  IoWalletOutline,
  IoEye,
  IoEyeOff,
  IoAlertCircleOutline,
  IoAlertCircle,
  IoTrendingUpOutline,
  IoCheckmarkCircle,
  IoCheckmarkDone,
  IoCall,
  IoChevronForward,
  IoAddCircle,
  IoTime,
  IoWarning,
} from 'react-icons/io5';
import { Card } from '../components/ui/Card';
import { SyncBadge } from '../components/ui/Badge';
import { Header } from '../components/ui/Header';
import { DynamicBrandCurves } from '../components/ui/DynamicBrandCurves';
import { fetchOverdueCredits, fetchTotalReceivable } from '../services/credits';
import { fetchCustomers } from '../services/customers';
import { fetchProfile } from '../services/profile';
import { Colors, formatCOP } from '../theme';
import { formatDateDisplay } from '../utils/format';
import { AnimatedMoney } from '../components/ui/AnimatedMoney';
import { useStore } from '../store/useStore';
import { calculateSubscriptionStatus } from '../services/plans';
import { fetchFreePortfolioStatus } from '../services/portfolio';
import { MagnetTabBar } from '../components/ui/MagnetTabBar';
import {
  getCachedBalanceVisibility,
  getStoredBalanceVisibility,
  setStoredBalanceVisibility,
} from '../services/storeContext';

export function DashboardScreen() {
  const navigate = useNavigate();
  const storeProfile = useStore(s => s.profile);
  const profileQuery = useQuery({
    queryKey: ['profile'],
    queryFn: fetchProfile,
  });
  const profile = profileQuery.data ?? storeProfile;
  const storeId = profile?.id;

  const [showBalance, setShowBalance] = useState<boolean>(() => {
    return getCachedBalanceVisibility(storeId);
  });

  // Al entrar a Inicio o cambiar de tienda, asegurar carga de la parametrización local
  useEffect(() => {
    let isMounted = true;
    getStoredBalanceVisibility(storeId).then(visible => {
      if (isMounted) {
        setShowBalance(visible);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [storeId]);

  const handleToggleBalance = () => {
    setShowBalance(prev => {
      const next = !prev;
      setStoredBalanceVisibility(next, storeId);
      return next;
    });
  };

  const subStatus = calculateSubscriptionStatus(profile);

  const total = useQuery({
    queryKey: ['total-receivable'],
    queryFn: fetchTotalReceivable,
  });

  const overdue = useQuery({
    queryKey: ['overdue'],
    queryFn: fetchOverdueCredits,
  });

  const customers = useQuery({
    queryKey: ['customers'],
    queryFn: () => fetchCustomers(),
  });

  const freePortfolio = useQuery({
    queryKey: ['free-portfolio'],
    queryFn: fetchFreePortfolioStatus,
    enabled: Boolean(profile) && subStatus.effectivePlan === 'free',
  });

  const debtors = (customers.data ?? []).filter(
    customer => Number(customer.current_balance) > 0,
  );

  useLayoutEffect(() => {
    resetScroll();
  }, []);

  const isInitialLoading =
    (profileQuery.isLoading && !profile) ||
    (customers.isLoading && !customers.data);

  if (isInitialLoading) {
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
        <div
          className="spinner"
          style={{
            width: 44,
            height: 44,
            border: `3.5px solid ${Colors.primaryLight}`,
            borderTopColor: Colors.primary,
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <span style={{ fontSize: 16, fontWeight: 700, color: Colors.text }}>
          Cargando tu tienda...
        </span>
        <span style={{ fontSize: 13, color: Colors.textSecondary }}>
          Preparando clientes y fiados
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: Colors.background,
        position: 'relative',
        paddingBottom: 'calc(140px + env(safe-area-inset-bottom, 0px))',
        overflowX: 'clip',
      }}>
      {/* Surcos decorativos dinámicos de marca */}
      <DynamicBrandCurves position="bottom-left" />

      {/* Header institucional */}
      <Header
        title={profile?.store_name || 'Mi Tienda'}
        subtitle={
          subStatus.isLifetime
            ? 'Plan Free · Vitalicio'
            : subStatus.expiresToday
            ? `Plan ${subStatus.planId.toUpperCase()} · ¡Vence hoy!`
            : subStatus.inGracePeriod
            ? `Plan ${subStatus.planId.toUpperCase()} · Vencido (${subStatus.remainingGraceDays}d de gracia)`
            : subStatus.formattedEndDate
            ? `Plan ${subStatus.planId.toUpperCase()} · Vence ${subStatus.formattedEndDate}`
            : `Plan ${(profile?.subscription_plan || 'free').toUpperCase()}`
        }
        sessionName={profile?.merchant_name}
        sessionRole="Tendero"
        showCurve
      />

      <div
        style={{
          padding: '16px 20px 0',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          position: 'relative',
          zIndex: 1,
        }}>
        {/* Banner de selección de cartera Free pendiente */}
        {freePortfolio.data?.selection_pending && (
          <div
            onClick={() => navigate('/free-portfolio')}
            style={{
              backgroundColor: '#FEF3C7',
              border: '1.5px solid #F59E0B',
              borderRadius: 16,
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              cursor: 'pointer',
            }}>
            <IoAlertCircle size={24} color="#D97706" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#92400E' }}>
                Selecciona tus {freePortfolio.data.limit} clientes activos
              </div>
              <div style={{ fontSize: 11, color: '#B45309' }}>
                Toca aquí para elegir los clientes de tu cartera Free
              </div>
            </div>
            <IoChevronForward size={18} color="#D97706" />
          </div>
        )}

        {/* Banner de suscripción por vencer pronto (próximos 5 días) */}
        {!subStatus.isExpired && !subStatus.expiresToday && subStatus.remainingDays > 0 && subStatus.remainingDays <= 5 && (
          <div
            onClick={() => navigate('/profile')}
            style={{
              backgroundColor: '#FEF3C7',
              border: '1.5px solid #F59E0B',
              borderRadius: 16,
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              cursor: 'pointer',
            }}>
            <IoTime size={24} color="#D97706" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#92400E' }}>
                Tu suscripción vence en {subStatus.remainingDays} {subStatus.remainingDays === 1 ? 'día' : 'días'} ({subStatus.formattedEndDate})
              </div>
              <div style={{ fontSize: 11, color: '#B45309' }}>
                Toca aquí para renovar tu plan antes de que venza
              </div>
            </div>
            <IoChevronForward size={18} color="#D97706" />
          </div>
        )}

        {/* Banner de vencimiento de suscripción */}
        {subStatus.expiresToday && (
          <div
            onClick={() => navigate('/profile')}
            style={{
              backgroundColor: '#FEE2E2',
              border: '1.5px solid #EF4444',
              borderRadius: 16,
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              cursor: 'pointer',
            }}>
            <IoAlertCircle size={24} color="#DC2626" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#991B1B' }}>
                Hoy vence tu suscripción
              </div>
              <div style={{ fontSize: 11, color: '#B91C1C' }}>
                Toca aquí para renovar tu plan por WhatsApp
              </div>
            </div>
            <IoChevronForward size={18} color="#DC2626" />
          </div>
        )}

        {/* Banner de periodo de gracia */}
        {subStatus.inGracePeriod && !subStatus.expiresToday && (
          <div
            onClick={() => navigate('/profile')}
            style={{
              backgroundColor: '#FEF3C7',
              border: '1.5px solid #F59E0B',
              borderRadius: 16,
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              cursor: 'pointer',
            }}>
            <IoTime size={24} color="#D97706" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#92400E' }}>
                Suscripción vencida ({subStatus.remainingGraceDays} {subStatus.remainingGraceDays === 1 ? 'día de gracia restante' : 'días de gracia restantes'})
              </div>
              <div style={{ fontSize: 11, color: '#B45309' }}>
                Toca para renovar antes de pasar al plan Free
              </div>
            </div>
            <IoChevronForward size={18} color="#D97706" />
          </div>
        )}

        {/* ── Tarjeta hero — monto total ── */}
        <div
          style={{
            backgroundColor: Colors.primary,
            borderRadius: 22,
            padding: 22,
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 6px 16px rgba(255, 107, 0, 0.28)',
            color: '#FFFFFF',
          }}>
          {/* Curvas orgánicas dentro de la tarjeta */}
          <div
            style={{
              position: 'absolute',
              top: -45,
              right: -25,
              width: 200,
              height: 160,
              borderBottomLeftRadius: 110,
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
              transform: 'rotate(-8deg)',
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: -35,
              left: -20,
              width: 140,
              height: 120,
              borderTopRightRadius: 80,
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              pointerEvents: 'none',
            }}
          />

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'relative',
              zIndex: 1,
            }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <IoWalletOutline size={16} color="rgba(255,255,255,0.95)" />
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: 0.6,
                  color: 'rgba(255,255,255,0.92)',
                }}>
                PLATA QUE TE DEBEN
              </span>
            </div>
            <button
              onClick={handleToggleBalance}
              aria-label={showBalance ? 'Ocultar saldo' : 'Ver saldo'}
              style={{
                color: 'rgba(255,255,255,0.9)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: 4,
              }}>
              {showBalance ? <IoEye size={22} /> : <IoEyeOff size={22} />}
            </button>
          </div>

          <div
            style={{
              color: '#FFFFFF',
              fontSize: 36,
              lineHeight: '44px',
              fontWeight: 800,
              marginTop: 10,
              marginBottom: 0,
              letterSpacing: -0.8,
              position: 'relative',
              zIndex: 1,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
            {total.isLoading ? (
              <span style={{ fontSize: 28, lineHeight: '34px' }}>Cargando…</span>
            ) : showBalance ? (
              <AnimatedMoney
                value={Number(total.data ?? 0)}
                style={{
                  color: '#FFFFFF',
                  fontSize: 36,
                  lineHeight: '44px',
                  fontWeight: 800,
                  letterSpacing: -0.8,
                }}
              />
            ) : (
              <span>$ ••••••</span>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              marginTop: 14,
              paddingTop: 14,
              borderTop: '1px solid rgba(255,255,255,0.22)',
              position: 'relative',
              zIndex: 1,
            }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
              <span style={{ color: '#FFFFFF', fontSize: 22, fontWeight: 800 }}>
                {customers.isLoading && !customers.data ? '…' : debtors.length}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.88)', fontSize: 13, fontWeight: 500 }}>
                {debtors.length === 1 ? 'cliente te debe' : 'clientes te deben'}
              </span>
            </div>
            <button
              onClick={() => navigate('/customers')}
              style={{
                backgroundColor: 'rgba(255,255,255,0.22)',
                padding: '7px 14px',
                borderRadius: 999,
                color: '#FFFFFF',
                fontSize: 13,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
              }}>
              Ver clientes →
            </button>
          </div>
        </div>

        {/* ── Sección: Atrasados ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 8,
          }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <IoAlertCircleOutline size={18} color={Colors.destructive} />
              <h2 style={{ fontSize: 17, fontWeight: 800, color: Colors.text, margin: 0 }}>
                Atrasados
              </h2>
            </div>
            <span style={{ fontSize: 12, color: Colors.textSecondary }}>
              Pasaron su fecha de pago acordada
            </span>
          </div>
          <button
            onClick={() => navigate('/alerts')}
            style={{
              color: Colors.primary,
              fontSize: 13,
              fontWeight: 700,
              background: 'none',
              cursor: 'pointer',
            }}>
            Ver todo
          </button>
        </div>

        {overdue.isLoading ? (
          <Card style={{ textAlign: 'center', padding: 20 }}>
            <span style={{ fontSize: 13, color: Colors.textSecondary }}>
              Cargando cuentas atrasadas…
            </span>
          </Card>
        ) : overdue.isError ? (
          <Card style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <IoWarning size={24} color={Colors.destructive} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: Colors.text }}>
                Error al obtener alertas
              </div>
              <div style={{ fontSize: 12, color: Colors.textSecondary }}>
                Toca para reintentar la carga.
              </div>
            </div>
            <button
              onClick={() => overdue.refetch()}
              style={{
                padding: '6px 12px',
                borderRadius: 10,
                backgroundColor: Colors.primaryLight,
                color: Colors.primary,
                fontWeight: 700,
                fontSize: 12,
              }}>
              Reintentar
            </button>
          </Card>
        ) : (overdue.data ?? []).length === 0 ? (
          <Card style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: Colors.successAlt,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <IoCheckmarkCircle size={26} color={Colors.success} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: Colors.text }}>
                ¡Todo al día!
              </div>
              <div style={{ fontSize: 12, color: Colors.textSecondary }}>
                Nadie está atrasado en sus pagos.
              </div>
            </div>
          </Card>
        ) : (
          (overdue.data ?? []).slice(0, 3).map((item: any) => {
            const cust = item.customers;
            const displayName = cust?.alias || cust?.name || 'Cliente';
            const realName = cust?.alias ? cust?.name : null;

            return (
              <Card
                key={item.id}
                onClick={() => navigate(`/customers/${item.customer_id}`)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  cursor: 'pointer',
                  transition: 'transform 0.15s',
                }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: Colors.destructiveAlt,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                  <IoAlertCircleOutline size={22} color={Colors.destructive} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: Colors.text,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                      {displayName}
                    </span>
                    <SyncBadge estadoServidor={item.estadoServidor} />
                  </div>
                  {realName && (
                    <div style={{ fontSize: 12, color: Colors.textSecondary }}>
                      {realName}
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: Colors.textMuted }}>
                    {item.concept} · venció el {formatDateDisplay(item.due_date)}
                  </div>
                  {cust?.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <IoCall size={11} color={Colors.textSecondary} />
                      <span style={{ fontSize: 11, color: Colors.textSecondary }}>
                        {cust.phone}
                      </span>
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 11, color: Colors.textMuted, fontWeight: 600 }}>
                    Debe
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: Colors.destructive }}>
                    {formatCOP(Number(item.amount))}
                  </div>
                </div>
              </Card>
            );
          })
        )}

        {/* ── Sección: Mayores deudas ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 10,
          }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <IoTrendingUpOutline size={18} color={Colors.primary} />
              <h2 style={{ fontSize: 17, fontWeight: 800, color: Colors.text, margin: 0 }}>
                Deben más
              </h2>
            </div>
            <span style={{ fontSize: 12, color: Colors.textSecondary }}>
              Clientes con los montos pendientes más altos
            </span>
          </div>
          <button
            onClick={() => navigate('/customers')}
            style={{
              color: Colors.primary,
              fontSize: 13,
              fontWeight: 700,
              background: 'none',
              cursor: 'pointer',
            }}>
            Ver todos
          </button>
        </div>

        {customers.isLoading ? (
          <Card style={{ textAlign: 'center', padding: 20 }}>
            <span style={{ fontSize: 13, color: Colors.textSecondary }}>
              Cargando clientes que deben más…
            </span>
          </Card>
        ) : debtors.length === 0 ? (
          <Card style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: Colors.primaryLight,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <IoCheckmarkDone size={24} color={Colors.primary} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: Colors.text }}>
                Sin deudas activas
              </div>
              <div style={{ fontSize: 12, color: Colors.textSecondary }}>
                Aquí verás quién te debe más cuando registres un fiado.
              </div>
            </div>
          </Card>
        ) : (
          [...debtors]
            .sort((a, b) => Number(b.current_balance) - Number(a.current_balance))
            .slice(0, 5)
            .map(customer => (
              <Card
                key={customer.id}
                onClick={() => navigate(`/customers/${customer.id}`)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  cursor: 'pointer',
                }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 21,
                    backgroundColor: Colors.primaryLight,
                    color: Colors.primary,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 17,
                    fontWeight: 800,
                    flexShrink: 0,
                  }}>
                  {(customer.alias || customer.name).charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: Colors.text,
                      wordBreak: 'break-word',
                      lineHeight: 1.25,
                    }}>
                    {customer.alias || customer.name}
                  </div>
                  {customer.alias && (
                    <div style={{ fontSize: 12, color: Colors.textSecondary }}>
                      {customer.name}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <IoCall size={11} color={Colors.textSecondary} />
                    <span style={{ fontSize: 11, color: Colors.textSecondary }}>
                      {customer.phone || 'Sin teléfono'}
                    </span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 105, whiteSpace: 'nowrap' }}>
                  <div style={{ fontSize: 11, color: Colors.textMuted, fontWeight: 600 }}>
                    Te debe
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: Colors.destructive }}>
                    {formatCOP(Number(customer.current_balance))}
                  </div>
                </div>
                <IoChevronForward size={18} color={Colors.textMuted} />
              </Card>
            ))
        )}
      </div>
    </div>
  );
}
