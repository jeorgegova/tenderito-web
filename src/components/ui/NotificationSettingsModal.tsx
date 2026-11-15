import React, { useState, useEffect } from 'react';
import {
  IoClose,
  IoNotifications,
  IoNotificationsOutline,
  IoNotificationsOffOutline,
  IoCheckmarkCircle,
  IoAlertCircleOutline,
  IoWarningOutline,
  IoPhonePortraitOutline,
  IoLaptopOutline,
  IoShieldCheckmarkOutline,
  IoShareOutline,
  IoAddCircleOutline,
  IoVolumeHighOutline,
} from 'react-icons/io5';
import { Colors, Radius } from '../../theme';
import {
  checkPushNotificationSupport,
  requestNotificationPermissionManually,
  sendTestNotification,
  PushSupportStatus,
} from '../../services/notificationService';
import { unregister_fcm_token } from '../../services/deviceService';
import { showAlert } from './AlertModal';

interface NotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActivated?: () => void;
}

export function NotificationSettingsModal({
  isOpen,
  onClose,
  onActivated,
}: NotificationSettingsModalProps) {
  const [supportStatus, setSupportStatus] = useState<PushSupportStatus>(checkPushNotificationSupport());
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'status' | 'help'>('status');

  const refreshStatus = () => {
    setSupportStatus(checkPushNotificationSupport());
  };

  useEffect(() => {
    if (isOpen) {
      refreshStatus();
      setActiveTab('status');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleActivate = async () => {
    setLoading(true);
    try {
      const result = await requestNotificationPermissionManually();
      refreshStatus();
      if (result.success) {
        onActivated?.();
        showAlert({
          title: '¡Notificaciones activadas! 🔔',
          message:
            'Tu dispositivo ha sido vinculado exitosamente. Recibirás avisos inmediatos cada vez que se registre un fiado o un abono.',
          type: 'success',
        });
      } else {
        if (result.status.permission === 'denied') {
          setActiveTab('help');
        } else if (result.message) {
          showAlert({
            title: 'Aviso de notificaciones',
            message: result.message,
            type: 'warning',
          });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTest = () => {
    sendTestNotification();
    showAlert({
      title: 'Prueba enviada',
      message: 'Se ha reproducido el sonido de alerta y enviado el banner en pantalla.',
      type: 'info',
    });
  };

  const handleUnregister = async () => {
    setLoading(true);
    try {
      await unregister_fcm_token();
      refreshStatus();
      showAlert({
        title: 'Dispositivo desvinculado',
        message: 'Este dispositivo ya no recibirá notificaciones de tu cuenta.',
        type: 'info',
      });
    } finally {
      setLoading(false);
    }
  };

  const isGranted = supportStatus.permission === 'granted';
  const isDenied = supportStatus.permission === 'denied';
  const needsInstall = supportStatus.needsInstallOnIOS;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 12000,
        padding: 16,
        boxSizing: 'border-box',
        animation: 'fadeInModal 0.2s ease-out',
      }}>
      <style>{`
        @keyframes fadeInModal {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUpModal {
          from { transform: translateY(20px) scale(0.97); }
          to { transform: translateY(0) scale(1); }
        }
      `}</style>

      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 24,
          width: '100%',
          maxWidth: 460,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
          animation: 'slideUpModal 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
        {/* Cabecera */}
        <div
          style={{
            padding: '18px 20px',
            borderBottom: '1px solid #F1F5F9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#FAFAFA',
          }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                backgroundColor: isGranted ? '#DCFCE7' : '#FFF1E5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isGranted ? Colors.success : Colors.primary,
              }}>
              <IoNotifications size={22} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: Colors.text }}>
                Notificaciones Push
              </div>
              <div style={{ fontSize: 12, color: Colors.textSecondary, fontWeight: 500 }}>
                Alertas de fiados y abonos en tiempo real
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              padding: 6,
              color: Colors.textSecondary,
              cursor: 'pointer',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <IoClose size={22} />
          </button>
        </div>

        {/* Pestañas */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #E2E8F0',
            backgroundColor: '#FFFFFF',
          }}>
          <button
            type="button"
            onClick={() => setActiveTab('status')}
            style={{
              flex: 1,
              padding: '12px 16px',
              border: 'none',
              backgroundColor: 'transparent',
              fontSize: 13,
              fontWeight: activeTab === 'status' ? 700 : 500,
              color: activeTab === 'status' ? Colors.primary : Colors.textSecondary,
              borderBottom: activeTab === 'status' ? `2px solid ${Colors.primary}` : '2px solid transparent',
              cursor: 'pointer',
            }}>
            Estado del Dispositivo
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('help')}
            style={{
              flex: 1,
              padding: '12px 16px',
              border: 'none',
              backgroundColor: 'transparent',
              fontSize: 13,
              fontWeight: activeTab === 'help' ? 700 : 500,
              color: activeTab === 'help' ? Colors.primary : Colors.textSecondary,
              borderBottom: activeTab === 'help' ? `2px solid ${Colors.primary}` : '2px solid transparent',
              cursor: 'pointer',
            }}>
            Instrucciones y Ayuda
          </button>
        </div>

        {/* Cuerpo con Scroll */}
        <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
          {activeTab === 'status' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Tarjeta de estado principal */}
              <div
                style={{
                  padding: 16,
                  borderRadius: 18,
                  backgroundColor: isGranted
                    ? '#F0FDF4'
                    : isDenied
                    ? '#FEF2F2'
                    : needsInstall
                    ? '#FFFBEB'
                    : '#FFF7ED',
                  border: `1.5px solid ${
                    isGranted
                      ? '#BBF7D0'
                      : isDenied
                      ? '#FECACA'
                      : needsInstall
                      ? '#FDE68A'
                      : '#FED7AA'
                  }`,
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  {isGranted ? (
                    <IoCheckmarkCircle size={22} color={Colors.success} />
                  ) : isDenied ? (
                    <IoNotificationsOffOutline size={22} color={Colors.destructive} />
                  ) : needsInstall ? (
                    <IoWarningOutline size={22} color="#D97706" />
                  ) : (
                    <IoAlertCircleOutline size={22} color={Colors.primary} />
                  )}
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 800,
                      color: isGranted
                        ? '#166534'
                        : isDenied
                        ? '#991B1B'
                        : needsInstall
                        ? '#92400E'
                        : '#9A3412',
                    }}>
                    {isGranted
                      ? 'Notificaciones activadas'
                      : isDenied
                      ? 'Permiso bloqueado en este navegador'
                      : needsInstall
                      ? 'Instalación requerida en iPhone / iPad'
                      : 'Notificaciones pendientes de activación'}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 12.5,
                    lineHeight: '18px',
                    color: isGranted
                      ? '#15803D'
                      : isDenied
                      ? '#B91C1C'
                      : needsInstall
                      ? '#B45309'
                      : '#C2410C',
                  }}>
                  {isGranted
                    ? 'Este dispositivo está vinculado para recibir alertas inmediatas de compras y pagos.'
                    : isDenied
                    ? 'El navegador tiene bloqueado el permiso. Consulta la pestaña "Instrucciones y Ayuda" para reactivarlo.'
                    : needsInstall
                    ? 'Apple iOS exige que agregues Tenderito a la pantalla de inicio para habilitar notificaciones push del sistema.'
                    : 'Activa las notificaciones para enterarte al instante de cualquier movimiento en tu cuenta.'}
                </div>
              </div>

              {/* Detalles técnicos del dispositivo */}
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: 16,
                  padding: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  border: '1px solid #E2E8F0',
                }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 12.5,
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: Colors.textSecondary }}>
                    {supportStatus.isIOS ? (
                      <IoPhonePortraitOutline size={16} />
                    ) : (
                      <IoLaptopOutline size={16} />
                    )}
                    <span>Dispositivo / Plataforma:</span>
                  </div>
                  <span style={{ fontWeight: 700, color: Colors.text }}>
                    {supportStatus.isIOS
                      ? supportStatus.isStandalone
                        ? 'iOS (PWA Instalada)'
                        : 'iOS (Safari Web)'
                      : 'WEB_PWA'}
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 12.5,
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: Colors.textSecondary }}>
                    <IoShieldCheckmarkOutline size={16} />
                    <span>Conexión segura:</span>
                  </div>
                  <span
                    style={{
                      fontWeight: 700,
                      color: supportStatus.isSecureContext ? Colors.success : Colors.destructive,
                    }}>
                    {supportStatus.isSecureContext ? 'HTTPS Seguro' : 'Inseguro (HTTP)'}
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 12.5,
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: Colors.textSecondary }}>
                    <IoNotificationsOutline size={16} />
                    <span>Permiso del sistema:</span>
                  </div>
                  <span
                    style={{
                      fontWeight: 700,
                      color: isGranted
                        ? Colors.success
                        : isDenied
                        ? Colors.destructive
                        : Colors.text,
                    }}>
                    {supportStatus.permission.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Botones de acción */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
                {!isGranted && !isDenied && !needsInstall && (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleActivate}
                    style={{
                      backgroundColor: Colors.primary,
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: 14,
                      padding: '13px 18px',
                      fontSize: 14,
                      fontWeight: 800,
                      cursor: loading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      boxShadow: '0 4px 12px rgba(255, 107, 0, 0.25)',
                    }}>
                    <IoNotifications size={18} />
                    <span>{loading ? 'Activando...' : 'Activar notificaciones en este celular'}</span>
                  </button>
                )}

                {needsInstall && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('help')}
                    style={{
                      backgroundColor: '#D97706',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: 14,
                      padding: '13px 18px',
                      fontSize: 14,
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}>
                    <IoShareOutline size={18} />
                    <span>Ver cómo instalar en iPhone</span>
                  </button>
                )}

                {isGranted && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      onClick={handleTest}
                      style={{
                        flex: 1,
                        backgroundColor: '#F1F5F9',
                        color: Colors.text,
                        border: '1px solid #CBD5E1',
                        borderRadius: 12,
                        padding: '11px 14px',
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                      }}>
                      <IoVolumeHighOutline size={16} color={Colors.primary} />
                      <span>Probar sonido y aviso</span>
                    </button>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleUnregister}
                      style={{
                        backgroundColor: '#FEE2E2',
                        color: Colors.destructive,
                        border: 'none',
                        borderRadius: 12,
                        padding: '11px 14px',
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: loading ? 'not-allowed' : 'pointer',
                      }}>
                      Desactivar
                    </button>
                  </div>
                )}

                {isDenied && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('help')}
                    style={{
                      backgroundColor: '#F1F5F9',
                      color: Colors.text,
                      border: '1px solid #CBD5E1',
                      borderRadius: 14,
                      padding: '12px 16px',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}>
                    <span>Ver cómo desbloquear los permisos</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Pestaña de Instrucciones y Ayuda */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Sección iPhone / iOS */}
              <div
                style={{
                  border: '1px solid #E2E8F0',
                  borderRadius: 16,
                  padding: 16,
                  backgroundColor: '#F8FAFC',
                }}>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: Colors.text, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <IoShareOutline size={18} color={Colors.primary} />
                  <span>En iPhone y iPad (iOS 16.4+)</span>
                </div>
                <div style={{ fontSize: 12.5, color: Colors.textSecondary, lineHeight: '19px' }}>
                  Apple exige que la aplicación esté agregada a la pantalla de inicio para recibir notificaciones push:
                  <ol style={{ paddingLeft: 18, marginTop: 6, marginBottom: 0 }}>
                    <li>Abre Tenderito en <strong>Safari</strong>.</li>
                    <li>Toca el botón <strong>Compartir</strong> (icono de cuadrado con flecha hacia arriba).</li>
                    <li>Selecciona <strong>"Agregar al inicio"</strong>.</li>
                    <li>Abre el nuevo icono de Tenderito en tu pantalla de inicio e inicia sesión.</li>
                    <li>Vuelve aquí y pulsa <strong>"Activar notificaciones"</strong>.</li>
                  </ol>
                </div>
              </div>

              {/* Sección permisos bloqueados */}
              <div
                style={{
                  border: '1px solid #E2E8F0',
                  borderRadius: 16,
                  padding: 16,
                  backgroundColor: '#F8FAFC',
                }}>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: Colors.text, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <IoNotificationsOffOutline size={18} color={Colors.destructive} />
                  <span>Si el permiso fue bloqueado</span>
                </div>
                <div style={{ fontSize: 12.5, color: Colors.textSecondary, lineHeight: '19px' }}>
                  <strong>En Chrome o Edge (Android / PC):</strong>
                  <br />
                  Toca el icono de candado o configuración al lado izquierdo de la barra de direcciones (URL), entra a <em>Permisos</em> o <em>Configuración del sitio</em> y cambia <em>Notificaciones</em> a <strong>Permitir</strong>.
                  <br /><br />
                  <strong>En Safari (iPhone / macOS):</strong>
                  <br />
                  Ve a <em>Ajustes de iOS &gt; Safari &gt; Avanzado &gt; Datos de sitios web</em> o <em>Ajustes &gt; Notificaciones &gt; Tenderito</em> y activa <strong>Permitir notificaciones</strong>.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pie */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #F1F5F9',
            display: 'flex',
            justifyContent: 'flex-end',
            backgroundColor: '#FAFAFA',
          }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 18px',
              backgroundColor: '#E2E8F0',
              border: 'none',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 700,
              color: Colors.text,
              cursor: 'pointer',
            }}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
