import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { isMainTabPath } from '../SwipeableTabsView';

// Desactiva la restauración automática del navegador para que no recuerde coordenadas previas al cambiar de ruta
if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}

/**
 * Fuerza el reseteo inmediato y exhaustivo de las coordenadas de desplazamiento
 * en todos los niveles posibles (window, html, body, #root, .app-container y contenedores internos).
 */
export function resetScroll() {
  try {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    window.scrollTo(0, 0);
  } catch (_e) {
    window.scrollTo(0, 0);
  }

  if (document.documentElement) {
    document.documentElement.scrollTop = 0;
    document.documentElement.scrollLeft = 0;
  }
  if (document.body) {
    document.body.scrollTop = 0;
    document.body.scrollLeft = 0;
  }
  const root = document.getElementById('root');
  if (root) {
    root.scrollTop = 0;
    root.scrollLeft = 0;
  }
  const appContainer = document.querySelector('.app-container');
  if (appContainer) {
    appContainer.scrollTop = 0;
    appContainer.scrollLeft = 0;
  }

  // Resetea cualquier contenedor con scroll activo dentro de la jerarquía
  try {
    const scrollables = document.querySelectorAll<HTMLElement>('.app-container, #root, main, [style*="overflow"]');
    scrollables.forEach(el => {
      if (el.scrollTop > 0) {
        el.scrollTop = 0;
      }
    });
  } catch (_e) {}
}

/**
 * Garantiza que al cambiar de ruta o menú, la nueva vista se muestre siempre desde el inicio (coordenada 0),
 * evitando retenciones de desplazamiento accidentales de pantallas previas.
 */
export function ScrollToTop() {
  const { pathname, search } = useLocation();
  const prevPathRef = useRef(pathname);

  useLayoutEffect(() => {
    const wasMainTab = isMainTabPath(prevPathRef.current);
    const isNowMainTab = isMainTabPath(pathname);
    prevPathRef.current = pathname;

    // Si la transición ocurre entre pestañas principales, cada pestaña maneja su propio scroll natural
    if (wasMainTab && isNowMainTab) {
      return;
    }

    resetScroll();
  }, [pathname, search]);

  useEffect(() => {
    const isNowMainTab = isMainTabPath(pathname);
    if (isNowMainTab) return;

    resetScroll();
    const raf1 = requestAnimationFrame(() => {
      resetScroll();
      const raf2 = requestAnimationFrame(() => {
        resetScroll();
      });
      return () => cancelAnimationFrame(raf2);
    });
    return () => cancelAnimationFrame(raf1);
  }, [pathname, search]);

  return null;
}
