import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Garantiza que al cambiar de ruta, la nueva vista se muestre siempre desde el inicio (scroll top 0),
 * evitando retenciones de desplazamiento accidentales de pantallas previas.
 */
export function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant' as ScrollBehavior,
    });
  }, [pathname, search]);

  return null;
}
