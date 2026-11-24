import { useLayoutEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { resetScroll } from '../components/ui/ScrollToTop';
import {
  IoArrowBack,
  IoWalletOutline,
  IoStorefrontOutline,
  IoCallOutline,
  IoShieldCheckmark,
  IoThumbsUp,
  IoAlertCircle,
  IoWarning,
  IoHelpCircleOutline,
} from 'react-icons/io5';
import { Card } from '../components/ui/Card';
import {
  fetchGlobalCustomerHistory,
  fetchCustomerById,
  getStoreBalance,
  getStoreLastMovement,
  evaluateCustomerPaymentHabit,
} from '../services/customers';
import { Colors, formatCOP } from '../theme';
import { DynamicBrandCurves } from '../components/ui/DynamicBrandCurves';

export function CustomerHistoryScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const initialCustomer = (location.state as any)?.customer;

  useLayoutEffect(() => {
    resetScroll();
  }, []);

  const customer = useQuery({
    queryKey: ['customer', id],
    queryFn: () => fetchCustomerById(id!),
    enabled: Boolean(id),
    initialData: initialCustomer,
  });

  const history = useQuery({
    queryKey: ['customer-global-history', id],
    queryFn: () => fetchGlobalCustomerHistory(id!),
    enabled: Boolean(id),
  });

  const stores = history.data?.stores ?? [];
  const credits = history.data?.credits ?? [];
  const payments = history.data?.payments ?? [];

  const totalBalance = stores.reduce(
    (sum: number, s: any) => sum + getStoreBalance(s, credits, payments),
    0,
  );
  const paymentRating = evaluateCustomerPaymentHabit(stores, credits, payments);

  const renderRatingIcon = () => {
    switch (paymentRating.tier) {
      case 'excellent':
        return <IoShieldCheckmark size={20} color={paymentRating.color} />;
      case 'good':
        return <IoThumbsUp size={18} color={paymentRating.color} />;
      case 'fair':
        return <IoAlertCircle size={20} color={paymentRating.color} />;
      case 'risk':
        return <IoWarning size={20} color={paymentRating.color} />;
      default:
        return <IoHelpCircleOutline size={20} color={paymentRating.color} />;
    }
  };

  const customerData = customer.data || initialCustomer || (history.data as any)?.customer;
  const displayName = customerData?.alias || customerData?.name || (customer.isLoading ? 'Cargando…' : 'Cliente');
  const realName = customerData?.alias && customerData?.name ? customerData.name : null;
  const phone = customerData?.phone ?? 'Sin teléfono';
  const documentInfo = customerData?.document_number
    ? `${customerData.document_type || 'CC'} ${customerData.document_number}`
    : null;

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: Colors.background,
        position: 'relative',
        paddingBottom: 40,
        overflowX: 'clip',
      }}>
      <DynamicBrandCurves position="bottom-left" />

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid #F1F5F9',
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.05)',
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
          Historial entre tiendas
        </span>
        <div style={{ width: 40 }} />
      </div>

      <div
        style={{
          padding: '24px 20px',
          maxWidth: 480,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          position: 'relative',
          zIndex: 1,
        }}>
        {/* Cabecera del cliente */}
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 68,
              height: 68,
              borderRadius: 34,
              backgroundColor: Colors.primaryLight,
              color: Colors.primary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              fontWeight: 800,
              margin: '0 auto 12px',
            }}>
            {(displayName || '?').charAt(0).toUpperCase()}
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: Colors.text, margin: 0 }}>
            {displayName}
          </h2>
          {realName && (
            <div style={{ fontSize: 13, color: Colors.textSecondary, marginTop: 2 }}>
              {realName}
            </div>
          )}
          <div style={{ fontSize: 13, color: Colors.textMuted, marginTop: 2 }}>
            {documentInfo ? `${documentInfo} · ${phone}` : phone}
          </div>
        </div>

        {/* Resumen total */}
        <Card
          style={{
            padding: 18,
            backgroundColor: Colors.primaryLight,
            border: `1.5px solid ${Colors.primaryMid}`,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
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
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: 0.8,
                color: Colors.primaryDark,
              }}>
              DEUDA TOTAL EN TODAS LAS TIENDAS
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: Colors.primaryDark, marginTop: 2 }}>
              {formatCOP(totalBalance)}
            </div>
          </div>
        </Card>

        {/* Valoración de hábitos de pago */}
        {!history.isLoading && (
          <Card
            style={{
              padding: 16,
              backgroundColor: '#FFFFFF',
              border: `1.5px solid ${paymentRating.borderColor}`,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                flexWrap: 'wrap',
              }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 14,
                    backgroundColor: paymentRating.bgColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                  {renderRatingIcon()}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: 0.7,
                      color: Colors.textSecondary,
                    }}>
                    VALORACIÓN DE PAGO
                  </div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 800,
                      color: paymentRating.color,
                      marginTop: 1,
                    }}>
                    {paymentRating.label}
                  </div>
                </div>
              </div>

              {paymentRating.score !== null && (
                <div
                  style={{
                    padding: '6px 12px',
                    borderRadius: 999,
                    backgroundColor: paymentRating.bgColor,
                    border: `1px solid ${paymentRating.borderColor}`,
                    color: paymentRating.color,
                    fontSize: 13,
                    fontWeight: 800,
                    flexShrink: 0,
                  }}>
                  {paymentRating.score} / 100
                </div>
              )}
            </div>

            {paymentRating.score !== null && (
              <div
                style={{
                  width: '100%',
                  height: 7,
                  borderRadius: 999,
                  backgroundColor: '#F1F5F9',
                  overflow: 'hidden',
                }}>
                <div
                  style={{
                    width: `${paymentRating.score}%`,
                    height: '100%',
                    borderRadius: 999,
                    backgroundColor: paymentRating.color,
                    transition: 'width 0.35s ease',
                  }}
                />
              </div>
            )}

            <div style={{ fontSize: 13, color: Colors.textSecondary, lineHeight: 1.4 }}>
              {paymentRating.description}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: 8,
              }}>
              <div
                style={{
                  padding: '8px 10px',
                  borderRadius: 12,
                  backgroundColor: '#F8FAFC',
                  border: `1px solid ${Colors.border}`,
                }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: Colors.textMuted }}>
                  ABONADO
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: Colors.text, marginTop: 2 }}>
                  {paymentRating.paymentPercentage}%
                </div>
              </div>

              <div
                style={{
                  padding: '8px 10px',
                  borderRadius: 12,
                  backgroundColor: '#F8FAFC',
                  border: `1px solid ${Colors.border}`,
                }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: Colors.textMuted }}>
                  ABONOS / FIADOS
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: Colors.text, marginTop: 2 }}>
                  {paymentRating.paymentsCount} / {paymentRating.creditsCount}
                </div>
              </div>

              <div
                style={{
                  padding: '8px 10px',
                  borderRadius: 12,
                  backgroundColor: '#F8FAFC',
                  border: `1px solid ${Colors.border}`,
                }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: Colors.textMuted }}>
                  ATRASOS
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: paymentRating.overdueCount > 0 ? Colors.destructive : Colors.success,
                    marginTop: 2,
                  }}>
                  {paymentRating.overdueCount === 0
                    ? 'Sin atrasos'
                    : `${paymentRating.overdueCount} vencido${paymentRating.overdueCount === 1 ? '' : 's'}`}
                </div>
              </div>
            </div>
          </Card>
        )}

        <h3 style={{ fontSize: 16, fontWeight: 800, color: Colors.text, margin: '8px 0 0' }}>
          Tiendas vinculadas
        </h3>

        {history.isLoading ? (
          <Card style={{ textAlign: 'center', padding: 20 }}>
            <span style={{ fontSize: 13, color: Colors.textSecondary }}>Cargando historial…</span>
          </Card>
        ) : stores.length === 0 ? (
          <Card style={{ textAlign: 'center', padding: 20 }}>
            <span style={{ fontSize: 13, color: Colors.textSecondary }}>
              No hay otras tiendas registradas con este cliente.
            </span>
          </Card>
        ) : (
          stores.map((s: any) => {
            const bal = getStoreBalance(s, credits, payments);
            const isOwing = bal > 0;
            const lastMov = getStoreLastMovement(s, credits, payments);
            return (
              <Card
                key={s.store_id}
                style={{
                  padding: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: '#F1F5F9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: Colors.textSecondary,
                    }}>
                    <IoStorefrontOutline size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: Colors.text }}>
                      {s.store_name}
                    </div>
                    {s.phone && (
                      <div
                        style={{
                          fontSize: 12,
                          color: Colors.textSecondary,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          marginTop: 1,
                        }}>
                        <IoCallOutline size={12} color={Colors.primary} />
                        <a
                          href={`tel:${s.phone}`}
                          onClick={e => e.stopPropagation()}
                          style={{
                            color: Colors.primary,
                            textDecoration: 'none',
                            fontWeight: 600,
                          }}>
                          {s.phone}
                        </a>
                      </div>
                    )}
                    <div style={{ fontSize: 12, color: Colors.textMuted, marginTop: 1 }}>
                      Último movimiento: {lastMov}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      color: isOwing ? Colors.destructive : Colors.success,
                    }}>
                    {isOwing ? 'DEBE' : 'AL DÍA'}
                  </div>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 800,
                      color: isOwing ? Colors.text : Colors.success,
                    }}>
                    {formatCOP(bal)}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
