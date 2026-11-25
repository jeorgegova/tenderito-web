import React from 'react';
import { IoAdd } from 'react-icons/io5';
import { Colors } from '../../theme';

interface StoreStatusRingProps {
  size?: number; // Tamaño del contenedor (ej: 56 o 64)
  strokeWidth?: number; // Grosor del borde (ej: 2.5 o 3)
  count?: number; // Cantidad de estados activos (0 a 3)
  unviewedCount?: number; // Cantidad de estados no vistos
  showAddBadge?: boolean; // Muestra el botón '+' de agregar
  onAddPress?: (e: React.MouseEvent) => void;
  onClick?: (e?: React.MouseEvent) => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export function StoreStatusRing({
  size = 60,
  strokeWidth = 2.5,
  count = 0,
  unviewedCount = 0,
  showAddBadge = false,
  onAddPress,
  onClick,
  children,
  style,
}: StoreStatusRingProps) {
  const hasStatuses = count > 0;
  const isAllViewed = hasStatuses && unviewedCount === 0;
  const ringColor = isAllViewed ? '#94A3B8' : Colors.primary;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Cálculo de segmentos tipo WhatsApp
  let strokeDasharray: string | undefined;
  if (count === 1) {
    strokeDasharray = undefined;
  } else if (count === 2) {
    const gap = 6;
    const segment = (circumference - 2 * gap) / 2;
    strokeDasharray = `${segment} ${gap}`;
  } else if (count >= 3) {
    const gap = 5;
    const segment = (circumference - count * gap) / count;
    strokeDasharray = `${segment} ${gap}`;
  }

  return (
    <div
      onClick={e => {
        if (onClick) {
          e.stopPropagation();
          onClick(e);
        }
      }}
      style={{
        position: 'relative',
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none',
        flexShrink: 0,
        ...style,
      }}>
      {/* Anillo SVG exterior tipo WhatsApp */}
      {hasStatuses && (
        <svg
          width={size}
          height={size}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            transform: 'rotate(-90deg)',
            pointerEvents: 'none',
            zIndex: 1,
          }}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            strokeLinecap={count > 1 ? 'round' : 'butt'}
          />
        </svg>
      )}

      {/* Contenido interior (Círculo con icono de tienda) */}
      <div
        style={{
          width: hasStatuses ? size - strokeWidth * 2 - 4 : size - 4,
          height: hasStatuses ? size - strokeWidth * 2 - 4 : size - 4,
          borderRadius: '50%',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 0,
        }}>
        {children}
      </div>

      {/* Botón '+' de agregar estado */}
      {showAddBadge && (
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            onAddPress?.(e);
          }}
          title="Agregar estado"
          style={{
            position: 'absolute',
            bottom: -1,
            right: -1,
            width: 22,
            height: 22,
            borderRadius: '50%',
            backgroundColor: Colors.primary,
            border: '2px solid #FFFFFF',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: 0,
            boxShadow: '0 2px 5px rgba(20, 32, 51, 0.16)',
            zIndex: 2,
            transition: 'transform 0.15s ease',
          }}
          onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.92)')}
          onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}>
          <IoAdd size={14} color="#FFFFFF" />
        </button>
      )}
    </div>
  );
}
