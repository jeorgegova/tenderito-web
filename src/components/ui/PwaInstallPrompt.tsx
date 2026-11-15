import { useState, useEffect } from 'react';
import {
  IoDownloadOutline,
  IoShareOutline,
  IoAddCircleOutline,
  IoClose,
  IoCheckmarkCircle,
} from 'react-icons/io5';
import { Colors, Radius } from '../../theme';
import logoImg from '../../assets/NuevoLogo.png';

export function PwaInstallPrompt() {
  const [isStandalone, setIsStandalone] = useState(true);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // 1. Verificar si la app ya está instalada / ejecutándose como PWA Standalone
    const checkStandalone = () => {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://');
      setIsStandalone(standalone);
      return standalone;
    };

    const alreadyStandalone = checkStandalone();
    if (alreadyStandalone) return;

    // 2. Detección de iOS (iPhone, iPad, iPod)
    const ua = window.navigator.userAgent.toLowerCase();
    const isAppleDevice =
      /iphone|ipad|ipod/.test(ua) ||
      (navigator.platform && /iPad|iPhone|iPod/.test(navigator.platform)) ||
      (navigator.maxTouchPoints > 2 && /macintosh/.test(ua));
    setIsIOS(isAppleDevice);

    // 3. Capturar el evento beforeinstallprompt para Android / Chromium
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const handleOpenCustom = () => {
      setShowModal(true);
    };
    window.addEventListener('pwa-show-install-modal', handleOpenCustom);

    // 4. Comprobar si el usuario la descartó recientemente (máximo 12 horas)
    const dismissedTime = localStorage.getItem('@tenderito_pwa_dismissed');
    const now = Date.now();
    const shouldShow =
      !dismissedTime || now - parseInt(dismissedTime, 10) > 12 * 60 * 60 * 1000;

    if (shouldShow) {
      // Pequeño retardo de 1.5s para no ser invasivo de golpe
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 1500);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.removeEventListener('pwa-show-install-modal', handleOpenCustom);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('pwa-show-install-modal', handleOpenCustom);
    };
  }, []);

  const handleDismiss = () => {
    setShowBanner(false);
    setShowModal(false);
    localStorage.setItem('@tenderito_pwa_dismissed', Date.now().toString());
  };

  const handleInstallClick = async () => {
    if (isIOS) {
      // En iOS Safari no existe prompt por JS; se muestra el instructivo interactivo
      setShowModal(true);
    } else if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setShowBanner(false);
          setShowModal(false);
        }
        setDeferredPrompt(null);
      } catch (e) {
        console.warn('Error en prompt de instalación:', e);
        setShowModal(true);
      }
    } else {
      setShowModal(true);
    }
  };

  if (isStandalone || (!showBanner && !showModal)) {
    return null;
  }

  return (
    <>
      {/* ── Banner Flotante Inferior ── */}
      {showBanner && !showModal && (
        <div
          style={{
            position: 'fixed',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'calc(100% - 32px)',
            maxWidth: 480,
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            padding: '12px 14px',
            boxShadow: '0 10px 32px rgba(20, 32, 51, 0.18)',
            border: `1.5px solid ${Colors.primaryMid}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            zIndex: 9999,
            animation: 'fadeInUp 0.3s ease-out',
            boxSizing: 'border-box',
          }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
            <img
              src={logoImg}
              alt="Tenderito"
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                objectFit: 'contain',
                backgroundColor: '#FFF1E5',
                padding: 4,
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 800,
                  color: Colors.text,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                Instalar Tenderito
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: Colors.textSecondary,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                {isIOS ? 'Agrégala a tu pantalla de inicio' : 'Instálala gratis en tu dispositivo'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <button
              onClick={handleInstallClick}
              style={{
                backgroundColor: Colors.primary,
                color: '#FFFFFF',
                fontSize: 13,
                fontWeight: 700,
                padding: '8px 14px',
                borderRadius: 14,
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(255, 107, 0, 0.35)',
              }}>
              <IoDownloadOutline size={16} />
              <span>Instalar</span>
            </button>

            <button
              onClick={handleDismiss}
              style={{
                padding: 6,
                borderRadius: 14,
                color: Colors.textSecondary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
              title="Cerrar">
              <IoClose size={18} />
            </button>
          </div>
        </div>
      )}

      {/* ── Modal Instructivo Detallado (Especialmente para iPhone / iPad) ── */}
      {showModal && (
        <div
          onClick={() => setShowModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '0 0 env(safe-area-inset-bottom, 16px) 0',
            animation: 'fadeIn 0.2s ease-out',
          }}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              backgroundColor: '#FFFFFF',
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              width: '100%',
              maxWidth: 500,
              padding: '24px 22px 28px',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              gap: 18,
              boxShadow: '0 -8px 30px rgba(0,0,0,0.15)',
            }}>
            {/* Cabecera */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <img
                  src={logoImg}
                  alt="Tenderito"
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    objectFit: 'contain',
                    backgroundColor: '#FFF1E5',
                    padding: 4,
                  }}
                />
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 800, color: Colors.text, margin: 0 }}>
                    {isIOS ? 'Instalar en tu iPhone' : 'Instalar Tenderito'}
                  </h3>
                  <span style={{ fontSize: 12, color: Colors.textSecondary }}>
                    Disfruta de la experiencia completa de app móvil
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: '#F1F5F9',
                  border: 'none',
                  borderRadius: 16,
                  padding: 6,
                  cursor: 'pointer',
                  display: 'flex',
                  color: Colors.textSecondary,
                }}>
                <IoClose size={20} />
              </button>
            </div>

            {/* Ventajas */}
            <div
              style={{
                backgroundColor: '#FFF7ED',
                border: '1px solid #FED7AA',
                borderRadius: 16,
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 600, color: '#9A3412' }}>
                <IoCheckmarkCircle size={16} color={Colors.primary} />
                <span>Acceso directo desde tu pantalla de inicio</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 600, color: '#9A3412' }}>
                <IoCheckmarkCircle size={16} color={Colors.primary} />
                <span>Funciona sin conexión a internet (100% offline)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 600, color: '#9A3412' }}>
                <IoCheckmarkCircle size={16} color={Colors.primary} />
                <span>Recibe notificaciones automáticas de fiados y abonos</span>
              </div>
            </div>

            {/* Pasos según plataforma */}
            {isIOS ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: Colors.text }}>
                  Sigue estos 3 pasos rápidos en Safari:
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 14, backgroundColor: '#F8FAFC', border: `1px solid ${Colors.border}` }}>
                  <div style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14 }}>
                    1
                  </div>
                  <div style={{ flex: 1, fontSize: 13, color: Colors.text }}>
                    Toca el botón <strong>Compartir</strong> en la barra inferior de Safari{' '}
                    <span style={{ display: 'inline-flex', verticalAlign: 'middle', color: '#2563EB' }}>
                      <IoShareOutline size={18} />
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 14, backgroundColor: '#F8FAFC', border: `1px solid ${Colors.border}` }}>
                  <div style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14 }}>
                    2
                  </div>
                  <div style={{ flex: 1, fontSize: 13, color: Colors.text }}>
                    Baja en las opciones y selecciona <strong>"Agregar al inicio"</strong>{' '}
                    <span style={{ display: 'inline-flex', verticalAlign: 'middle', color: Colors.primary }}>
                      <IoAddCircleOutline size={18} />
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 14, backgroundColor: '#F8FAFC', border: `1px solid ${Colors.border}` }}>
                  <div style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14 }}>
                    3
                  </div>
                  <div style={{ flex: 1, fontSize: 13, color: Colors.text }}>
                    Toca <strong>"Agregar"</strong> en la esquina superior derecha. ¡Listo!
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: Colors.text }}>
                  Instalación en tu dispositivo:
                </div>
                <div style={{ fontSize: 13, color: Colors.textSecondary, lineHeight: '18px' }}>
                  Si el navegador no abrió la ventana de confirmación automáticamente, toca el menú de tres puntos (⋮) de tu navegador y elige <strong>"Instalar aplicación"</strong> o <strong>"Agregar a la pantalla principal"</strong>.
                </div>
              </div>
            )}

            {/* Botón de acción */}
            <button
              onClick={() => {
                setShowModal(false);
                setShowBanner(false);
              }}
              style={{
                backgroundColor: Colors.primary,
                color: '#FFFFFF',
                fontSize: 15,
                fontWeight: 800,
                padding: '14px',
                borderRadius: Radius.md,
                border: 'none',
                cursor: 'pointer',
                textAlign: 'center',
                boxShadow: '0 4px 14px rgba(255, 107, 0, 0.3)',
                marginTop: 4,
              }}>
              ¡Entendido!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
