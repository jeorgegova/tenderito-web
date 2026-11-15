import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  IoHome,
  IoHomeOutline,
  IoPeople,
  IoPeopleOutline,
  IoStatsChart,
  IoStatsChartOutline,
  IoPerson,
  IoPersonOutline,
} from 'react-icons/io5';
import { Colors } from '../../theme';

interface TabItem {
  name: string;
  path: string;
  icon: (focused: boolean) => React.ReactNode;
}

const TABS: TabItem[] = [
  {
    name: 'Inicio',
    path: '/',
    icon: focused => (focused ? <IoHome size={22} /> : <IoHomeOutline size={22} />),
  },
  {
    name: 'Clientes',
    path: '/customers',
    icon: focused => (focused ? <IoPeople size={22} /> : <IoPeopleOutline size={22} />),
  },
  {
    name: 'Estadísticas',
    path: '/stats',
    icon: focused => (focused ? <IoStatsChart size={22} /> : <IoStatsChartOutline size={22} />),
  },
  {
    name: 'Perfil',
    path: '/profile',
    icon: focused => (focused ? <IoPerson size={22} /> : <IoPersonOutline size={22} />),
  },
];

// Variable fuera del ciclo de vida para recordar la última posición activa entre vistas
let globalLastActiveIndex: number | null = null;

export interface MagnetTabBarProps {
  active?: string;
  onPressItem?: () => void;
}

export function MagnetTabBar({ active, onPressItem }: MagnetTabBarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const navRef = useRef<HTMLElement>(null);
  const isFirstRender = useRef(true);

  // Determinamos el índice activo basado en active prop o la ruta actual
  const routeActiveIndex = useMemo(() => {
    if (active) {
      const idx = TABS.findIndex(t => t.name.toLowerCase() === active.toLowerCase());
      if (idx !== -1) return idx;
    }
    const currentPath = location.pathname;
    if (currentPath === '/') return 0;
    const idx = TABS.findIndex(t => t.path !== '/' && currentPath.startsWith(t.path));
    return idx !== -1 ? idx : 0;
  }, [active, location.pathname]);

  // Estado optimista para iniciar el deslizamiento en 0ms inmediatamente al tocar
  const [optimisticIndex, setOptimisticIndex] = useState<number | null>(null);
  const activeIndex = optimisticIndex !== null ? optimisticIndex : routeActiveIndex;

  useEffect(() => {
    setOptimisticIndex(null);
    globalLastActiveIndex = routeActiveIndex;
  }, [routeActiveIndex]);

  const [pillStyle, setPillStyle] = useState<{ left: number; width: number; ready: boolean }>({
    left: 0,
    width: 54,
    ready: false,
  });

  // Calcula la posición y tamaño exacto del fondo ovalado magnético
  const updatePill = useCallback(() => {
    const nav = navRef.current;
    const btn = buttonRefs.current[activeIndex];
    if (!nav || !btn) return;

    const navRect = nav.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();

    const pillW = Math.min(Math.max(btnRect.width - 12, 48), 62);
    const left = btnRect.left - navRect.left + (btnRect.width - pillW) / 2;

    setPillStyle({
      left,
      width: pillW,
      ready: true,
    });
  }, [activeIndex]);

  useEffect(() => {
    updatePill();
  }, [updatePill]);

  // Manejo de carga inicial y activación suave de la transición
  useEffect(() => {
    if (pillStyle.ready && isFirstRender.current) {
      const timer = setTimeout(() => {
        isFirstRender.current = false;
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [pillStyle.ready]);

  // Observer de redimensionamiento para recalcular el imán ante resize o cambio de orientación
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const ro = new ResizeObserver(() => {
      updatePill();
    });
    ro.observe(nav);

    window.addEventListener('resize', updatePill);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updatePill);
    };
  }, [updatePill]);

  const handleTabClick = (tab: TabItem, idx: number) => {
    if (activeIndex === idx) return;
    setOptimisticIndex(idx);
    onPressItem?.();
    navigate(tab.path);
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        padding: '0 16px 16px',
        pointerEvents: 'none',
        zIndex: 1000,
      }}>
      <nav
        ref={navRef}
        style={{
          pointerEvents: 'auto',
          maxWidth: 480,
          width: '100%',
          backgroundColor: '#FFFFFF',
          borderRadius: 24,
          boxShadow: '0 8px 30px rgba(20, 32, 51, 0.12)',
          border: `1px solid ${Colors.border}`,
          padding: '6px 8px',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}>
        {/* Pastilla magnética animada deslizante (Fondo de cada icono con efecto imán) */}
        {pillStyle.ready && (
          <div
            style={{
              position: 'absolute',
              top: 10,
              left: 0,
              width: pillStyle.width,
              height: 32,
              borderRadius: 16,
              backgroundColor: Colors.primaryLight,
              boxShadow: '0 2px 8px rgba(255, 107, 0, 0.16)',
              transform: `translate3d(${pillStyle.left}px, 0, 0)`,
              transition: isFirstRender.current
                ? 'none'
                : 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />
        )}

        {TABS.map((tab, index) => {
          const focused = activeIndex === index;

          return (
            <button
              key={tab.path}
              ref={el => {
                buttonRefs.current[index] = el;
              }}
              type="button"
              onClick={() => handleTabClick(tab, index)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px 0',
                borderRadius: 16,
                backgroundColor: 'transparent',
                color: focused ? Colors.primary : Colors.tabInactive,
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
                zIndex: 1,
                outline: 'none',
                userSelect: 'none',
                transition: 'color 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
              onMouseDown={e => {
                e.currentTarget.style.transform = 'scale(0.93)';
              }}
              onMouseUp={e => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
              onTouchStart={e => {
                e.currentTarget.style.transform = 'scale(0.93)';
              }}
              onTouchEnd={e => {
                e.currentTarget.style.transform = 'scale(1)';
              }}>
              <div
                style={{
                  width: 48,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 2,
                  transform: focused ? 'scale(1.08)' : 'scale(1)',
                  transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}>
                {tab.icon(focused)}
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: focused ? 800 : 500,
                  transition: 'color 0.2s ease, font-weight 0.2s ease',
                  letterSpacing: focused ? '0.1px' : '0px',
                }}>
                {tab.name}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
