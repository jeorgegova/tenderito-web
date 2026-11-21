import React, { useMemo } from 'react';
import { Colors } from '../../theme';

export interface NotebookPaperProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  minHeight?: number | string;
  /** Cantidad de anillas a renderizar en la espina izquierda (por defecto 14) */
  ringCount?: number;
}

/**
 * Componente visual que simula una hoja física de cuaderno argollado tradicional de tendero.
 * - Papel crema cálido con bordes y sombra de profundidad
 * - Argollas metálicas en espiral en el lateral izquierdo
 * - Perforaciones circulares en el papel alineadas con las argollas
 * - Línea de margen vertical roja/rosada
 * - Espacio reservado para que ningún contenido se superponga con las argollas
 */
export function NotebookPaper({
  children,
  style,
  className,
  minHeight = 280,
  ringCount = 14,
}: NotebookPaperProps) {
  // Generar posiciones relativas de las anillas distribuidas a lo largo de la espina
  const rings = useMemo(() => {
    return Array.from({ length: ringCount }, (_, i) => i);
  }, [ringCount]);

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        backgroundColor: '#FFFDF5', // Papel crema cálido
        borderRadius: '6px 18px 18px 6px',
        border: '1.5px solid #EADDCE',
        boxShadow:
          '0 6px 20px rgba(45, 25, 10, 0.06), 0 1px 3px rgba(45, 25, 10, 0.04)',
        overflow: 'hidden',
        boxSizing: 'border-box',
        ...style,
      }}>
      {/* ── ESPINA LATERAL FIJA: Argollas metálicas + Perforaciones + Margen rojo ── */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          width: 26,
          pointerEvents: 'none',
          zIndex: 4,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-around',
          alignItems: 'center',
          padding: '10px 0',
          boxSizing: 'border-box',
        }}>
        {/* Línea vertical roja del margen izquierdo de la libreta */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            right: 0,
            width: 1.5,
            backgroundColor: 'rgba(239, 68, 68, 0.45)', // Margen rojo/rosado tenue
          }}
        />

        {/* Anillas metálicas y perforaciones distribuidas a lo largo de la altura */}
        {rings.map(idx => (
          <div
            key={idx}
            style={{
              position: 'relative',
              width: 22,
              height: 11,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
            }}>
            {/* Perforación circular en el papel con profundidad 3D */}
            <div
              style={{
                position: 'absolute',
                left: 11,
                width: 7.5,
                height: 7.5,
                borderRadius: '50%',
                backgroundColor: '#1F1410',
                boxShadow:
                  'inset 0 1px 2px rgba(0, 0, 0, 0.8), 0 0.5px 1px rgba(255, 255, 255, 0.35)',
                border: '0.5px solid rgba(62, 39, 35, 0.5)',
              }}
            />

            {/* Argolla / Anilla metálica cilíndrica con curvatura reforzada */}
            <div
              style={{
                position: 'absolute',
                left: -2,
                width: 18,
                height: 5.5,
                borderRadius: '3px',
                background:
                  'linear-gradient(180deg, #FFFFFF 0%, #F1F5F9 20%, #CBD5E1 45%, #94A3B8 70%, #475569 90%, #1E293B 100%)',
                boxShadow:
                  '0 2px 3px rgba(30, 20, 10, 0.25), inset 0 0.8px 0.8px rgba(255, 255, 255, 0.95), inset 0 -0.8px 0.8px rgba(0, 0, 0, 0.4)',
                transform: 'rotate(-4deg)',
              }}
            />
          </div>
        ))}
      </div>

      {/* ── ÁREA DE CONTENIDO DE LA LIBRETA (a la derecha del margen) ── */}
      <div
        style={{
          paddingLeft: 28, // Espacio optimizado para aprovechar al máximo el ancho en móviles
          position: 'relative',
          zIndex: 1,
          minHeight,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
        }}>
        {children}
      </div>
    </div>
  );
}
