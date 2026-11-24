import React, { useCallback, useRef, useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { IoAddCircle } from 'react-icons/io5';
import { DashboardScreen } from '../screens/DashboardScreen';
import { CustomersScreen } from '../screens/CustomersScreen';
import { StatsScreen } from '../screens/StatsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { Colors } from '../theme';

export const MAIN_TABS = [
  { name: 'Inicio', path: '/' },
  { name: 'Clientes', path: '/customers' },
  { name: 'Estadísticas', path: '/stats' },
  { name: 'Perfil', path: '/profile' },
];

export function isMainTabPath(pathname: string): boolean {
  if (pathname === '/') return true;
  if (pathname === '/customers' || pathname === '/clientes') return true;
  if (pathname === '/stats') return true;
  if (pathname === '/profile') return true;
  return false;
}

export function getActiveTabIndex(pathname: string): number {
  if (pathname === '/') return 0;
  if (pathname === '/customers' || pathname === '/clientes') return 1;
  if (pathname === '/stats') return 2;
  if (pathname === '/profile') return 3;
  return 0;
}

export function SwipeableTabsView() {
  const location = useLocation();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);

  const activeIndex = useMemo(() => getActiveTabIndex(location.pathname), [location.pathname]);

  // Manejo de gestos táctiles (Swipe horizontal)
  const touchStart = useRef<{ x: number; y: number; time: number } | null>(null);
  const [dragDelta, setDragDelta] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const isHorizontalSwipe = useRef<boolean | null>(null);
  const isIgnoredTouch = useRef<boolean>(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;

    const touch = e.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    isHorizontalSwipe.current = null;
    isIgnoredTouch.current = false;

    // Proteger scrolls horizontales internos e interactivos
    let target = e.target as HTMLElement | null;
    while (target && target !== containerRef.current && target !== document.body) {
      if (target.getAttribute('data-horizontal-scroll') === 'true') {
        isIgnoredTouch.current = true;
        return;
      }
      const style = window.getComputedStyle(target);
      const overflowX = style.overflowX;
      if (
        (overflowX === 'auto' || overflowX === 'scroll') &&
        target.scrollWidth > target.clientWidth + 2
      ) {
        isIgnoredTouch.current = true;
        return;
      }
      if (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'range') {
        isIgnoredTouch.current = true;
        return;
      }
      target = target.parentElement;
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStart.current || isIgnoredTouch.current || e.touches.length !== 1) return;

      const touch = e.touches[0];
      const dx = touch.clientX - touchStart.current.x;
      const dy = touch.clientY - touchStart.current.y;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      // Decidir si el gesto es predominantemente horizontal o vertical
      if (isHorizontalSwipe.current === null) {
        if (absY > 8 && absY >= absX) {
          // Desplazamiento vertical natural dentro del panel activo: no intervenir
          isHorizontalSwipe.current = false;
          isIgnoredTouch.current = true;
          return;
        }
        if (absX > 14 && absX > absY * 1.6) {
          // Gesto horizontal intencional
          isHorizontalSwipe.current = true;
          setIsDragging(true);
        } else {
          return;
        }
      }

      if (isHorizontalSwipe.current) {
        // Resistencia elástica en los extremos para no desbordar
        let effectiveDx = dx;
        if ((activeIndex === 0 && dx > 0) || (activeIndex === MAIN_TABS.length - 1 && dx < 0)) {
          effectiveDx = dx * 0.18;
        }
        setDragDelta(effectiveDx);
      }
    },
    [activeIndex],
  );

  const handleTouchEnd = useCallback(() => {
    if (isHorizontalSwipe.current && touchStart.current) {
      const duration = Math.max(1, Date.now() - touchStart.current.time);
      const velocity = dragDelta / duration;
      const threshold = Math.min(window.innerWidth * 0.22, 90);

      let targetIndex = activeIndex;
      if ((dragDelta < -threshold || velocity < -0.38) && activeIndex < MAIN_TABS.length - 1) {
        targetIndex = activeIndex + 1;
      } else if ((dragDelta > threshold || velocity > 0.38) && activeIndex > 0) {
        targetIndex = activeIndex - 1;
      }

      setIsDragging(false);
      setDragDelta(0);

      if (targetIndex !== activeIndex) {
        navigate(MAIN_TABS[targetIndex].path);
      }
    } else {
      setIsDragging(false);
      setDragDelta(0);
    }
    touchStart.current = null;
    isHorizontalSwipe.current = null;
    isIgnoredTouch.current = false;
  }, [activeIndex, dragDelta, navigate]);

  // Manejo de accesibilidad: respetar preferencia de reducción de movimiento
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const transitionStyle = isDragging
    ? 'none'
    : prefersReducedMotion
    ? 'none'
    : 'transform 0.28s cubic-bezier(0.25, 1, 0.5, 1)';

  return (
    <div
      ref={containerRef}
      className="swipeable-tabs-container"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      style={{
        position: 'fixed',
        top: 0,
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: 520,
        overflow: 'hidden',
        touchAction: isDragging ? 'none' : 'pan-y',
        backgroundColor: 'var(--background)',
        boxShadow: '0 0 30px rgba(0, 0, 0, 0.05)',
      }}>
      {MAIN_TABS.map((tab, index) => {
        const offsetPercent = (index - activeIndex) * 100;
        const translateX = `calc(${offsetPercent}% + ${dragDelta}px)`;
        const isCurrent = activeIndex === index;
        const isNeighbor = Math.abs(index - activeIndex) <= 1;

        return (
          <div
            key={tab.path}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              transform: `translate3d(${translateX}, 0, 0)`,
              transition: transitionStyle,
              willChange: isDragging ? 'transform' : 'auto',
              pointerEvents: isCurrent ? 'auto' : 'none',
              visibility: isNeighbor ? 'visible' : 'hidden',
            }}>
            {/* 1. Contenedor de scroll vertical independiente */}
            <div
              ref={el => {
                panelRefs.current[index] = el;
              }}
              data-tab-panel={index}
              style={{
                width: '100%',
                height: '100%',
                overflowY: 'auto',
                overflowX: 'hidden',
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'none',
              }}>
              {index === 0 && <DashboardScreen />}
              {index === 1 && <CustomersScreen />}
              {index === 2 && <StatsScreen />}
              {index === 3 && <ProfileScreen />}
            </div>

            {/* 2. Botón flotante permanente exclusivo de Inicio: + Nuevo fiado */}
            {index === 0 && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 'calc(94px + env(safe-area-inset-bottom, 0px))',
                  left: 0,
                  right: 0,
                  display: 'flex',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                  zIndex: 999,
                }}>
                <div
                  style={{
                    maxWidth: 520,
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    paddingRight: 20,
                    boxSizing: 'border-box',
                  }}>
                  <button
                    type="button"
                    onClick={() => navigate('/new-credit')}
                    style={{
                      pointerEvents: 'auto',
                      backgroundColor: Colors.primary,
                      color: '#FFFFFF',
                      borderRadius: 28,
                      padding: '12px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      boxShadow: '0 8px 24px rgba(255, 107, 0, 0.4)',
                      border: 'none',
                      fontSize: 15,
                      fontWeight: 800,
                      cursor: 'pointer',
                      transition: 'transform 0.15s',
                    }}
                    onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.96)')}
                    onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}>
                    <IoAddCircle size={22} color="#FFFFFF" />
                    <span>Nuevo fiado</span>
                  </button>
                </div>
              </div>
            )}

            {/* 3. Botón flotante permanente exclusivo de Clientes: + Nuevo cliente */}
            {index === 1 && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 'calc(94px + env(safe-area-inset-bottom, 0px))',
                  left: 0,
                  right: 0,
                  display: 'flex',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                  zIndex: 999,
                }}>
                <div
                  style={{
                    maxWidth: 520,
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    paddingRight: 20,
                    boxSizing: 'border-box',
                  }}>
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new CustomEvent('tenderito-open-create-customer'))}
                    style={{
                      pointerEvents: 'auto',
                      backgroundColor: Colors.primary,
                      color: '#FFFFFF',
                      borderRadius: 28,
                      padding: '12px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      boxShadow: '0 8px 24px rgba(255, 107, 0, 0.4)',
                      border: 'none',
                      fontSize: 15,
                      fontWeight: 800,
                      cursor: 'pointer',
                      transition: 'transform 0.15s',
                    }}
                    onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.96)')}
                    onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}>
                    <IoAddCircle size={22} color="#FFFFFF" />
                    <span>Nuevo cliente</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
