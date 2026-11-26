import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  IoClose,
  IoTrashOutline,
  IoEyeOutline,
  IoChevronBack,
  IoChevronForward,
  IoStorefront,
  IoTimeOutline,
  IoPersonCircleOutline,
} from 'react-icons/io5';
import { Colors } from '../theme';
import { showAlert } from './ui/AlertModal';
import {
  StoreStatus,
  StoreStatusViewItem,
  fetchStatusViews,
  markStatusAsViewed,
  deleteStoreStatus,
} from '../services/storeStatuses';

interface StoreStatusViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  statuses: StoreStatus[];
  initialIndex?: number;
  storeName?: string;
  isMerchant?: boolean;
  customerId?: string;
  onStatusDeleted?: (statusId: string) => void;
}

// 15 segundos predeterminados por estado
const STATUS_DURATION_MS = 15000;

export function StoreStatusViewerModal({
  isOpen,
  onClose,
  statuses,
  initialIndex = 0,
  storeName = 'Tienda',
  isMerchant = false,
  customerId,
  onStatusDeleted,
}: StoreStatusViewerModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0); // 0 a 100
  const [isPaused, setIsPaused] = useState(false);
  const [showViewsSheet, setShowViewsSheet] = useState(false);
  const [viewsList, setViewsList] = useState<StoreStatusViewItem[]>([]);
  const [dynamicViewsCount, setDynamicViewsCount] = useState<number>(0);
  const [isLoadingViews, setIsLoadingViews] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Registro de imágenes ya cargadas/en caché para visualización instantánea y fluida
  const [loadedMap, setLoadedMap] = useState<Record<string, boolean>>({});
  const loadedUrlsRef = useRef<Set<string>>(new Set());

  const startTimeRef = useRef<number>(Date.now());
  const animFrameRef = useRef<number | null>(null);
  const lastNavTimeRef = useRef<number>(0);

  // Registro de toque para gestos horizontales (swipe) vs tap
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const currentStatus = statuses[currentIndex];
  const currentMediaUrl = currentStatus?.media_url;
  const isCurrentMediaReady = !currentMediaUrl || Boolean(loadedMap[currentMediaUrl]);

  const markMediaLoaded = useCallback((url: string) => {
    if (!url) return;
    loadedUrlsRef.current.add(url);
    setLoadedMap(prev => {
      if (prev[url]) return prev;
      return { ...prev, [url]: true };
    });
  }, []);

  // Pre-carga silenciosa en segundo plano de historias adyacentes para transición instantánea tipo WhatsApp
  useEffect(() => {
    if (!isOpen || statuses.length === 0) return;

    const indicesToPreload = [currentIndex, currentIndex + 1, currentIndex + 2, currentIndex - 1];
    indicesToPreload.forEach(idx => {
      if (idx >= 0 && idx < statuses.length) {
        const url = statuses[idx]?.media_url;
        if (url && !loadedUrlsRef.current.has(url)) {
          const img = new Image();
          img.src = url;
          img.onload = () => markMediaLoaded(url);
          img.onerror = () => markMediaLoaded(url);
        }
      }
    });
  }, [isOpen, currentIndex, statuses, markMediaLoaded]);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(Math.min(initialIndex, Math.max(0, statuses.length - 1)));
      setProgress(0);
      setIsPaused(false);
      setShowViewsSheet(false);
      lastNavTimeRef.current = Date.now();
    }
  }, [isOpen, initialIndex, statuses.length]);

  // Reiniciar barra de progreso al cambiar de estado
  useEffect(() => {
    setProgress(0);
    lastNavTimeRef.current = Date.now();
  }, [currentIndex]);

  // Bloquear scroll de la página web al abrir el visor
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  // Marcar como visto cuando el cliente visualiza un estado
  useEffect(() => {
    if (isOpen && !isMerchant && customerId && currentStatus) {
      markStatusAsViewed(currentStatus.id, customerId);
    }
  }, [isOpen, isMerchant, customerId, currentStatus?.id]);

  // Para el tendero: consultar en tiempo real quiénes han visto el estado apenas abre el visor o cambia de estado
  useEffect(() => {
    if (!isOpen || !isMerchant || !currentStatus?.id) return;

    let isMounted = true;
    setDynamicViewsCount(currentStatus.views_count ?? 0);

    fetchStatusViews(currentStatus.id)
      .then(views => {
        if (!isMounted) return;
        setViewsList(views);
        setDynamicViewsCount(views.length);
      })
      .catch(err => {
        console.warn('[StoreStatusViewerModal] Error consultando vistas:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, isMerchant, currentStatus?.id]);

  const goToNext = useCallback(() => {
    const now = Date.now();
    if (now - lastNavTimeRef.current < 220) return;
    lastNavTimeRef.current = now;

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setProgress(0);
    startTimeRef.current = now;

    setCurrentIndex(prev => {
      if (prev < statuses.length - 1) {
        return prev + 1;
      } else {
        onClose();
        return prev;
      }
    });
  }, [statuses.length, onClose]);

  const goToPrev = useCallback(() => {
    const now = Date.now();
    if (now - lastNavTimeRef.current < 220) return;
    lastNavTimeRef.current = now;

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setProgress(0);
    startTimeRef.current = now;

    setCurrentIndex(prev => {
      if (prev > 0) {
        return prev - 1;
      } else {
        return 0;
      }
    });
  }, []);

  // Navegación por teclado en Web (Flechas izquierda/derecha, Espacio, Escape)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        goToNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, goToNext, goToPrev, onClose]);

  // Manejo del temporizador de avance tipo WhatsApp Stories (15 segundos)
  // IMPORTANTE: NO arranca hasta que la imagen haya terminado de cargar (isCurrentMediaReady)
  useEffect(() => {
    if (
      !isOpen ||
      isPaused ||
      showViewsSheet ||
      statuses.length === 0 ||
      !isCurrentMediaReady
    ) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      return;
    }

    startTimeRef.current = Date.now() - (progress / 100) * STATUS_DURATION_MS;

    const tick = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min(100, (elapsed / STATUS_DURATION_MS) * 100);
      setProgress(pct);

      if (pct >= 100) {
        goToNext();
      } else {
        animFrameRef.current = requestAnimationFrame(tick);
      }
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [
    isOpen,
    isPaused,
    showViewsSheet,
    currentIndex,
    statuses.length,
    isCurrentMediaReady,
    goToNext,
  ]);

  // Consultar lista de vistas cuando se abre el bottom sheet
  const handleOpenViewsSheet = async () => {
    if (!currentStatus) return;
    setIsPaused(true);
    setShowViewsSheet(true);
    if (viewsList.length === 0) {
      setIsLoadingViews(true);
    }
    try {
      const views = await fetchStatusViews(currentStatus.id);
      setViewsList(views);
      setDynamicViewsCount(views.length);
    } catch (e) {
      console.warn('Error cargando vistas:', e);
    } finally {
      setIsLoadingViews(false);
    }
  };

  const handleCloseViewsSheet = () => {
    setShowViewsSheet(false);
    setIsPaused(false);
  };

  const handleDelete = () => {
    if (!currentStatus || isDeleting) return;
    setIsPaused(true);

    showAlert({
      title: '¿Eliminar estado publicitario?',
      message: 'Esta acción no se puede deshacer. ¿Deseas eliminar este estado?',
      type: 'destructive',
      buttons: [
        {
          text: 'Cancelar',
          style: 'cancel',
          onPress: () => {
            setIsPaused(false);
          },
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              const res = await deleteStoreStatus(currentStatus.id, currentStatus.media_path);
              if (res.success) {
                onStatusDeleted?.(currentStatus.id);
                if (statuses.length <= 1) {
                  onClose();
                } else {
                  goToNext();
                }
              } else {
                showAlert({
                  title: 'Error',
                  message: res.error || 'No se pudo eliminar el estado.',
                  type: 'destructive',
                });
                setIsPaused(false);
              }
            } catch (error) {
              showAlert({
                title: 'Error',
                message: 'Ocurrió un error inesperado al eliminar el estado.',
                type: 'destructive',
              });
              setIsPaused(false);
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ],
    });
  };

  // Gestión de gestos (Swipe horizontal + Tap para navegación fluida)
  const handlePointerDown = (clientX: number, clientY: number) => {
    setIsPaused(true);
    touchStartRef.current = { x: clientX, y: clientY, time: Date.now() };
  };

  const handlePointerUp = (clientX: number, clientY: number, containerWidth: number) => {
    setIsPaused(false);
    if (!touchStartRef.current) return;

    const deltaX = clientX - touchStartRef.current.x;
    const deltaY = clientY - touchStartRef.current.y;
    const duration = Date.now() - touchStartRef.current.time;
    touchStartRef.current = null;

    // 1. Detección de Swipe horizontal
    if (Math.abs(deltaX) > 35 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX < 0) {
        // Deslizó a la izquierda -> siguiente
        goToNext();
      } else {
        // Deslizó a la derecha -> anterior
        goToPrev();
      }
      return;
    }

    // 2. Detección de Tap rápido con umbral responsivo para web y móvil
    if (duration < 350 && Math.abs(deltaX) < 25 && Math.abs(deltaY) < 25) {
      if (clientX < containerWidth * 0.35) {
        goToPrev();
      } else {
        goToNext();
      }
    }
  };

  if (!isOpen || !currentStatus) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#000000',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        userSelect: 'none',
      }}>
      {/* Contenedor principal de la historia tipo WhatsApp */}
      <div
        id="status-viewer-container"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 480,
          height: '100%',
          backgroundColor: '#000000',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          touchAction: 'none',
          overscrollBehavior: 'none',
        }}
        onPointerDown={e => {
          if ((e.target as HTMLElement)?.closest('button')) return;
          handlePointerDown(e.clientX, e.clientY);
        }}
        onPointerUp={e => {
          if ((e.target as HTMLElement)?.closest('button')) return;
          const rect = e.currentTarget.getBoundingClientRect();
          handlePointerUp(e.clientX, e.clientY, rect.width);
        }}
        onPointerCancel={() => {
          setIsPaused(false);
          touchStartRef.current = null;
        }}>
        {/* 1. Barras de progreso superiores (15s por barra) */}
        <div
          style={{
            position: 'absolute',
            top: 'calc(10px + env(safe-area-inset-top, 0px))',
            left: 12,
            right: 12,
            display: 'flex',
            gap: 4,
            zIndex: 30,
          }}>
          {statuses.map((s, idx) => {
            let fillPct = 0;
            if (idx < currentIndex) fillPct = 100;
            else if (idx === currentIndex) fillPct = progress;

            return (
              <div
                key={s.id}
                style={{
                  flex: 1,
                  height: 3,
                  backgroundColor: 'rgba(255, 255, 255, 0.35)',
                  borderRadius: 2,
                  overflow: 'hidden',
                }}>
                <div
                  style={{
                    height: '100%',
                    width: `${fillPct}%`,
                    backgroundColor: '#FFFFFF',
                    borderRadius: 2,
                    transition: idx === currentIndex && !isPaused ? 'none' : 'width 0.1s linear',
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* 2. Cabecera del estado con botón de cerrar visible */}
        <div
          style={{
            position: 'absolute',
            top: 'calc(20px + env(safe-area-inset-top, 0px))',
            left: 12,
            right: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 30,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%)',
            paddingBottom: 16,
          }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
              }}>
              <IoStorefront size={20} color={Colors.primary} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#FFFFFF', lineHeight: 1.2 }}>
                {storeName}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>
                {new Date(currentStatus.created_at).toLocaleDateString('es-CO', {
                  day: 'numeric',
                  month: 'short',
                })}{' '}
                · Vence:{' '}
                {new Date(currentStatus.expires_at).toLocaleDateString('es-CO', {
                  day: 'numeric',
                  month: 'short',
                })}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isMerchant && (
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  handleDelete();
                }}
                disabled={isDeleting}
                title="Eliminar este estado"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#FF6B6B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}>
                <IoTrashOutline size={18} />
              </button>
            )}

            {/* Botón de cerrar bien visible */}
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                onClose();
              }}
              title="Cerrar estado"
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: 'rgba(0,0,0,0.6)',
                border: '1.5px solid rgba(255,255,255,0.3)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              }}>
              <IoClose size={24} />
            </button>
          </div>
        </div>

        {/* 3. Contenido Central (Imagen o Fondo) */}
        <div
          style={{
            flex: 1,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: currentStatus.media_url ? '#000000' : currentStatus.bg_color || Colors.primary,
            position: 'relative',
            overflow: 'hidden',
          }}>
          {/* Spinner de carga estilo WhatsApp con fondo negro si la imagen no está lista */}
          {currentStatus.media_url && !isCurrentMediaReady && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#000000',
                zIndex: 10,
              }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  border: '3.5px solid rgba(255, 255, 255, 0.15)',
                  borderTopColor: '#FFFFFF',
                  animation: 'spin 0.75s linear infinite',
                }}
              />
            </div>
          )}

          {currentStatus.media_url ? (
            <img
              key={currentStatus.id}
              src={currentStatus.media_url}
              alt="Estado publicitario"
              draggable={false}
              onLoad={() => {
                if (currentStatus.media_url) {
                  markMediaLoaded(currentStatus.media_url);
                }
              }}
              onError={() => {
                if (currentStatus.media_url) {
                  markMediaLoaded(currentStatus.media_url);
                }
              }}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                opacity: isCurrentMediaReady ? 1 : 0,
                transition: 'opacity 0.2s ease-out',
                userSelect: 'none',
                pointerEvents: 'none',
              }}
            />
          ) : (
            <div
              style={{
                padding: 32,
                textAlign: 'center',
                color: '#FFFFFF',
                fontSize: 22,
                fontWeight: 800,
                lineHeight: 1.4,
              }}>
              {currentStatus.caption}
            </div>
          )}

          {/* Flecha visual izquierda si hay estado anterior */}
          {currentIndex > 0 && (
            <button
              type="button"
              onPointerDown={e => e.stopPropagation()}
              onPointerUp={e => e.stopPropagation()}
              onClick={e => {
                e.stopPropagation();
                goToPrev();
              }}
              style={{
                position: 'absolute',
                left: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: 'rgba(0,0,0,0.4)',
                border: 'none',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                zIndex: 25,
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
              }}>
              <IoChevronBack size={22} />
            </button>
          )}

          {/* Flecha visual derecha si hay siguiente estado */}
          {currentIndex < statuses.length - 1 && (
            <button
              type="button"
              onPointerDown={e => e.stopPropagation()}
              onPointerUp={e => e.stopPropagation()}
              onClick={e => {
                e.stopPropagation();
                goToNext();
              }}
              style={{
                position: 'absolute',
                right: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: 'rgba(0,0,0,0.4)',
                border: 'none',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                zIndex: 25,
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
              }}>
              <IoChevronForward size={22} />
            </button>
          )}
        </div>

        {/* 4. Pie con Descripción y Control de Vistas */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 70%, transparent 100%)',
            padding: '24px 20px calc(24px + env(safe-area-inset-bottom, 0px))',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            zIndex: 30,
          }}>
          {/* Descripción en pie si tiene foto */}
          {currentStatus.media_url && (
            <div
              style={{
                color: '#FFFFFF',
                fontSize: 15,
                fontWeight: 600,
                lineHeight: 1.35,
                textAlign: 'center',
                textShadow: '0 2px 4px rgba(0,0,0,0.6)',
              }}>
              {currentStatus.caption}
            </div>
          )}

          {/* Si es tendero: botón para ver quién vio el estado */}
          {isMerchant && (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                handleOpenViewsSheet();
              }}
              style={{
                alignSelf: 'center',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 16px',
                borderRadius: 20,
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                color: '#FFFFFF',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}>
              <IoEyeOutline size={18} />
              <span>Visto por {dynamicViewsCount}</span>
            </button>
          )}
        </div>

        {/* 5. Bottom Sheet para tendero: Listado de Vistas */}
        {showViewsSheet && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.6)',
              zIndex: 40,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
            }}
            onClick={e => {
              e.stopPropagation();
              handleCloseViewsSheet();
            }}>
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                maxHeight: '65%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                animation: 'modalSlideUp 0.25s ease',
              }}
              onClick={e => e.stopPropagation()}>
              <div
                style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid #F1F5F9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <IoEyeOutline size={20} color={Colors.primary} />
                  <span style={{ fontSize: 16, fontWeight: 800, color: Colors.text }}>
                    Visto por {viewsList.length} clientes
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCloseViewsSheet}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    border: 'none',
                    backgroundColor: '#F1F5F9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}>
                  <IoClose size={20} color={Colors.textSecondary} />
                </button>
              </div>

              <div style={{ padding: '12px 20px', overflowY: 'auto' }}>
                {isLoadingViews ? (
                  <div style={{ padding: 24, textAlign: 'center', color: Colors.textSecondary }}>
                    Cargando visualizaciones…
                  </div>
                ) : viewsList.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: Colors.textSecondary }}>
                    Aún ningún cliente ha visto este estado.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {viewsList.map(v => (
                      <div
                        key={v.customer_id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingBottom: 10,
                          borderBottom: '1px solid #F8FAFC',
                        }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <IoPersonCircleOutline size={32} color="#94A3B8" />
                          <div>
                            <div style={{ fontSize: 13.5, fontWeight: 700, color: Colors.text }}>
                              {v.customer_alias || v.customer_name}
                            </div>
                            {v.customer_alias && (
                              <div style={{ fontSize: 11.5, color: Colors.textSecondary }}>
                                {v.customer_name}
                              </div>
                            )}
                          </div>
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 11.5,
                            color: Colors.textSecondary,
                          }}>
                          <IoTimeOutline size={14} />
                          <span>
                            {new Date(v.viewed_at).toLocaleTimeString('es-CO', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
