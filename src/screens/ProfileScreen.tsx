import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  IoStorefrontOutline,
  IoLogOutOutline,
  IoCheckmarkCircle,
  IoLogoWhatsapp,
  IoSwapHorizontalOutline,
  IoDownloadOutline,
  IoNotificationsOutline,
  IoAlertCircle,
  IoTime,
  IoPencilOutline,
} from 'react-icons/io5';
import { NotificationSettingsModal } from '../components/ui/NotificationSettingsModal';
import { EditStoreModal } from '../components/ui/EditStoreModal';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Header } from '../components/ui/Header';
import { DynamicBrandCurves } from '../components/ui/DynamicBrandCurves';
import { showAlert } from '../components/ui/AlertModal';
import { supabase } from '../lib/supabase';
import { confirmLogout } from '../lib/session';
import { useStore } from '../store/useStore';
import { Colors } from '../theme';
import {
  calculateSubscriptionStatus,
  downgradeToFreePlan,
  fetchSubscriptionPlans,
  openWhatsAppPlanRequest,
} from '../services/plans';
import {
  getActiveStoreId,
  setActiveStoreId,
  fetchUserStores,
} from '../services/storeContext';
import { syncAll } from '../services/sync';
import type { SubscriptionPlanItem } from '../types';
import { MagnetTabBar } from '../components/ui/MagnetTabBar';
import { fetchProfile } from '../services/profile';

export function ProfileScreen() {
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);
  const [isEditStoreOpen, setIsEditStoreOpen] = useState(false);
  const setProfile = useStore(s => s.setProfile);
  const queryClient = useQueryClient();

  const { data, refetch: refetchProfile } = useQuery({
    queryKey: ['profile'],
    queryFn: fetchProfile,
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: fetchSubscriptionPlans,
  });

  const { data: userStores = [], refetch: refetchStores } = useQuery({
    queryKey: ['user-stores'],
    queryFn: fetchUserStores,
  });

  const { data: currentStoreId, refetch: refetchActiveStore } = useQuery({
    queryKey: ['active-store-id'],
    queryFn: getActiveStoreId,
  });

  const activeStore = userStores.find(s => s.store_id === currentStoreId) || userStores[0];
  const currentAddress = (data as any)?.address || activeStore?.address || '';

  useEffect(() => {
    if (data) {
      setProfile(data as any);
    }
  }, [data, setProfile]);

  const subStatus = calculateSubscriptionStatus(data as any);

  async function handleSwitchStore(storeId: string) {
    if (storeId === currentStoreId) return;
    try {
      await setActiveStoreId(storeId);
      queryClient.clear();
      await syncAll({ force: true });
      await refetchProfile();
      await refetchStores();
      await refetchActiveStore();
      showAlert({
        title: 'Tienda cambiada',
        message: 'Has cambiado a la tienda seleccionada exitosamente.',
        type: 'success',
      });
    } catch (e: any) {
      showAlert('Error cambiando de tienda', e?.message);
    }
  }

  async function handlePlanAction(plan: SubscriptionPlanItem, isRenewal: boolean) {
    const storeName = (data as any)?.store_name ?? 'Mi Tienda';
    const planIdLower = plan.id.toLowerCase();

    if (planIdLower === 'free') {
      showAlert({
        title: '¿Cambiar a plan Free?',
        message:
          'Pasarás al plan gratuito (hasta 10 clientes). Tus clientes actuales se mantienen, pero no podrás agregar más hasta que te suscribas a un plan pago.',
        type: 'warning',
        buttons: [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Cambiar a Free',
            style: 'default',
            onPress: async () => {
              const res = await downgradeToFreePlan();
              if (res.success) {
                await refetchProfile();
                await queryClient.invalidateQueries({ queryKey: ['free-portfolio'] });
                showAlert('Plan actualizado', 'Ahora estás en el plan Free.');
              } else {
                showAlert('Error', res.error ?? 'No se pudo actualizar el plan.');
              }
            },
          },
        ],
      });
      return;
    }

    await openWhatsAppPlanRequest({
      storeName,
      planName: plan.name,
      isRenewal,
    });
  }

  const currentPlanId = ((data as any)?.subscription_plan ?? 'free').toLowerCase();

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: Colors.background,
        position: 'relative',
        paddingBottom: 'calc(140px + env(safe-area-inset-bottom, 0px))',
        overflowX: 'hidden',
      }}>
      <DynamicBrandCurves position="top-left" />

      <Header title="Mi negocio" subtitle="Perfil y suscripción" showCurve />

      <div
        style={{
          padding: '0 20px',
          maxWidth: 520,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          position: 'relative',
          zIndex: 1,
        }}>
        {/* Tarjeta de cuenta */}
        <Card
          style={{
            padding: 22,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            boxShadow: '0 8px 24px rgba(20, 32, 51, 0.06)',
          }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: Colors.primaryLight,
              color: Colors.primary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
            }}>
            <IoStorefrontOutline size={28} />
          </div>

          <h2 style={{ fontSize: 20, fontWeight: 800, color: Colors.text, margin: 0 }}>
            {(data as any)?.store_name ?? 'Cargando tienda…'}
          </h2>
          <div style={{ fontSize: 13, color: Colors.textSecondary, marginTop: 4 }}>
            {(data as any)?.merchant_name ?? ''}
            {(data as any)?.phone ? ` · Tel: ${(data as any).phone}` : ''}
            {currentAddress ? ` · Dir: ${currentAddress}` : ''}
          </div>

          <button
            type="button"
            onClick={() => setIsEditStoreOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              marginTop: 10,
              padding: '6px 14px',
              borderRadius: 20,
              backgroundColor: '#F8FAFC',
              border: `1.5px solid ${Colors.border}`,
              color: Colors.text,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}>
            <IoPencilOutline size={14} color={Colors.primary} />
            <span>Editar datos de la tienda</span>
          </button>

          <div
            style={{
              marginTop: 12,
              padding: '6px 14px',
              borderRadius: 20,
              backgroundColor: subStatus.expiresToday
                ? '#FEE2E2'
                : subStatus.inGracePeriod
                ? '#FEF3C7'
                : Colors.primaryLight,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: subStatus.expiresToday
                  ? Colors.destructive
                  : subStatus.inGracePeriod
                  ? '#D97706'
                  : Colors.primary,
              }}
            />
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: subStatus.expiresToday
                  ? Colors.destructive
                  : subStatus.inGracePeriod
                  ? '#D97706'
                  : Colors.primaryDark,
              }}>
              {subStatus.effectivePlan === 'free'
                ? 'Plan Free · Vitalicio'
                : subStatus.expiresToday
                ? `Plan ${subStatus.planId.toUpperCase()} · ¡Vence hoy!`
                : subStatus.inGracePeriod
                ? `Plan ${subStatus.planId.toUpperCase()} · Vencido (${subStatus.remainingGraceDays}d de gracia)`
                : subStatus.formattedEndDate
                ? `Plan ${subStatus.planId.toUpperCase()} · Vence ${subStatus.formattedEndDate}`
                : `Plan ${subStatus.planId.toUpperCase()} · Activo`}
            </span>
          </div>
        </Card>

        {/* Banner informativo de estado de suscripción */}
        {subStatus.inGracePeriod && (
          <Card
            style={{
              padding: 16,
              backgroundColor: '#FEF3C7',
              border: '1.5px solid #F59E0B',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <IoTime size={22} color="#D97706" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 14, fontWeight: 800, color: '#92400E' }}>
                Tu suscripción {subStatus.planId.toUpperCase()} venció el {subStatus.formattedEndDate}
              </span>
            </div>
            <p style={{ fontSize: 13, color: '#B45309', margin: 0, lineHeight: 1.4 }}>
              Te quedan <strong>{subStatus.remainingGraceDays} {subStatus.remainingGraceDays === 1 ? 'día de gracia' : 'días de gracia'}</strong> para renovar tu suscripción o pasar a la versión Free conservando tus datos.
            </p>
          </Card>
        )}

        {subStatus.expiresToday && (
          <Card
            style={{
              padding: 16,
              backgroundColor: '#FEE2E2',
              border: '1.5px solid #EF4444',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <IoAlertCircle size={22} color="#DC2626" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 14, fontWeight: 800, color: '#991B1B' }}>
                ¡Tu suscripción {subStatus.planId.toUpperCase()} vence hoy!
              </span>
            </div>
            <p style={{ fontSize: 13, color: '#B91C1C', margin: 0, lineHeight: 1.4 }}>
              Renueva hoy mismo para evitar entrar en periodo de gracia o interrupciones en tus funciones avanzadas.
            </p>
          </Card>
        )}

        {!subStatus.isExpired && !subStatus.expiresToday && subStatus.remainingDays > 0 && subStatus.remainingDays <= 5 && (
          <Card
            style={{
              padding: 16,
              backgroundColor: '#FEF3C7',
              border: '1.5px solid #F59E0B',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <IoTime size={22} color="#D97706" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 14, fontWeight: 800, color: '#92400E' }}>
                Tu suscripción vencerá pronto
              </span>
            </div>
            <p style={{ fontSize: 13, color: '#B45309', margin: 0, lineHeight: 1.4 }}>
              Tu plan {subStatus.planId.toUpperCase()} vence el <strong>{subStatus.formattedEndDate}</strong> (te quedan {subStatus.remainingDays} {subStatus.remainingDays === 1 ? 'día' : 'días'}). Renueva a tiempo para no perder tus beneficios.
            </p>
          </Card>
        )}

        {subStatus.isDowngradedToFree && subStatus.planId !== 'free' && (
          <Card
            style={{
              padding: 16,
              backgroundColor: '#FEE2E2',
              border: '1.5px solid #EF4444',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <IoAlertCircle size={22} color="#DC2626" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 14, fontWeight: 800, color: '#991B1B' }}>
                Periodo de gracia finalizado
              </span>
            </div>
            <p style={{ fontSize: 13, color: '#B91C1C', margin: 0, lineHeight: 1.4 }}>
              Tu suscripción anterior ha vencido y tu cuenta pasó al plan Free. Puedes reactivar tu plan cuando lo desees abajo.
            </p>
          </Card>
        )}

        {/* Tiendas asociadas (Multitienda) */}
        {userStores.length > 1 && (
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: Colors.text, margin: '4px 0 10px' }}>
              Tus tiendas
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {userStores.map(st => {
                const isCurrent = st.store_id === currentStoreId;
                return (
                  <Card
                    key={st.store_id}
                    onClick={() => handleSwitchStore(st.store_id)}
                    style={{
                      padding: 14,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      border: `1.5px solid ${isCurrent ? Colors.primary : Colors.border}`,
                      backgroundColor: isCurrent ? Colors.primaryLight : '#FFFFFF',
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <IoStorefrontOutline
                        size={20}
                        color={isCurrent ? Colors.primary : Colors.textSecondary}
                      />
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: Colors.text }}>
                          {st.store_name}
                        </div>
                        <div style={{ fontSize: 11, color: Colors.textMuted }}>
                          Rol: {st.role} · Plan: {st.subscription_plan}
                        </div>
                      </div>
                    </div>
                    {isCurrent ? (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          color: Colors.primary,
                          backgroundColor: '#FFFFFF',
                          padding: '4px 8px',
                          borderRadius: 10,
                        }}>
                        ACTIVA
                      </span>
                    ) : (
                      <IoSwapHorizontalOutline size={18} color={Colors.textMuted} />
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Planes de suscripción */}
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: Colors.text, margin: '4px 0 10px' }}>
            Planes de suscripción
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {plans.map(p => {
              const isCurrent = p.id.toLowerCase() === currentPlanId;
              const isRenewal = isCurrent && subStatus.needsRenewal;

              return (
                <Card
                  key={p.id}
                  style={{
                    padding: 16,
                    border: `1.5px solid ${isCurrent ? Colors.primary : Colors.border}`,
                    position: 'relative',
                  }}>
                  {p.badge && (
                    <span
                      style={{
                        position: 'absolute',
                        top: 12,
                        right: 12,
                        backgroundColor: Colors.primaryLight,
                        color: Colors.primary,
                        fontSize: 10,
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: 10,
                      }}>
                      {p.badge}
                    </span>
                  )}

                  <div style={{ fontSize: 17, fontWeight: 800, color: Colors.text }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: 13, color: Colors.textSecondary, marginTop: 2 }}>
                    {p.description}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: 14,
                    }}>
                    <span style={{ fontSize: 18, fontWeight: 800, color: Colors.primary }}>
                      {p.price_text}
                    </span>

                    <button
                      type="button"
                      disabled={isCurrent && !isRenewal}
                      onClick={() => handlePlanAction(p, isRenewal)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 12,
                        backgroundColor: isCurrent
                          ? isRenewal
                            ? Colors.destructive
                            : Colors.successAlt
                          : Colors.primary,
                        color: isCurrent
                          ? isRenewal
                            ? '#FFFFFF'
                            : Colors.success
                          : '#FFFFFF',
                        border: 'none',
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: isCurrent && !isRenewal ? 'default' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}>
                      {isRenewal ? (
                        'Renovar por WhatsApp'
                      ) : isCurrent ? (
                        <>
                          <IoCheckmarkCircle size={16} />
                          <span>Plan actual</span>
                        </>
                      ) : (
                        <>
                          <IoLogoWhatsapp size={16} />
                          <span>Elegir plan</span>
                        </>
                      )}
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Opción para instalar PWA si no está en modo standalone */}
        {typeof window !== 'undefined' &&
          !window.matchMedia('(display-mode: standalone)').matches &&
          !(window.navigator as any).standalone && (
            <Card
              style={{
                padding: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#FFF7ED',
                border: '1.5px solid #FED7AA',
                borderRadius: 18,
              }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: '#FFEDD5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: Colors.primary,
                  }}>
                  <IoDownloadOutline size={22} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: Colors.text }}>
                    Instalar en el dispositivo
                  </div>
                  <div style={{ fontSize: 12, color: Colors.textSecondary }}>
                    Úsala como app nativa y sin conexión
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
                  fontSize: 12.5,
                  padding: '8px 14px',
                  borderRadius: 12,
                  border: 'none',
                  cursor: 'pointer',
                }}>
                Instalar
              </button>
            </Card>
          )}

        {/* Notificaciones Push en este dispositivo */}
        <Card
          style={{
            padding: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#FFFFFF',
            border: '1.5px solid #E2E8F0',
            borderRadius: 18,
          }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: '#FFF1E5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: Colors.primary,
              }}>
              <IoNotificationsOutline size={22} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: Colors.text }}>
                Notificaciones en este equipo
              </div>
              <div style={{ fontSize: 12, color: Colors.textSecondary }}>
                Alertas de fiados, abonos y estado de conexión
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsNotifModalOpen(true)}
            style={{
              backgroundColor: '#F1F5F9',
              color: Colors.text,
              fontWeight: 700,
              fontSize: 12.5,
              padding: '8px 14px',
              borderRadius: 12,
              border: '1px solid #CBD5E1',
              cursor: 'pointer',
            }}>
            Configurar
          </button>
        </Card>

        {/* Cerrar sesión */}
        <div style={{ marginTop: 12 }}>
          <Button
            title="Cerrar sesión"
            variant="ghost"
            style={{ color: Colors.destructive }}
            onPress={() => confirmLogout()}
            icon={<IoLogOutOutline size={20} color={Colors.destructive} />}
          />
        </div>

        {/* Modal de configuración de notificaciones */}
        <NotificationSettingsModal
          isOpen={isNotifModalOpen}
          onClose={() => setIsNotifModalOpen(false)}
        />

        {/* Modal de edición de datos de la tienda */}
        <EditStoreModal
          visible={isEditStoreOpen}
          onClose={() => setIsEditStoreOpen(false)}
          initialStoreName={(data as any)?.store_name || ''}
          initialPhone={(data as any)?.phone || ''}
          initialMerchantName={(data as any)?.merchant_name || ''}
          initialAddress={currentAddress}
          onSaved={async () => {
            await refetchProfile();
            await refetchStores();
            await refetchActiveStore();
            queryClient.invalidateQueries({ queryKey: ['profile'] });
            queryClient.invalidateQueries({ queryKey: ['user-stores'] });
            queryClient.invalidateQueries({ queryKey: ['active-store'] });
          }}
        />
      </div>
    </div>
  );
}
