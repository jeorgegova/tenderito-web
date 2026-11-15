import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Colors } from '../../theme';

export interface MagnetFilterOption<T extends string = string> {
  key: T;
  label: string;
}

interface MagnetFilterBarProps<T extends string = string> {
  options: readonly MagnetFilterOption<T>[] | MagnetFilterOption<T>[];
  selectedKey: T;
  onSelect: (key: T) => void;
  style?: React.CSSProperties;
  scrollable?: boolean;
}

const TRACK_PADDING = 3;

export function MagnetFilterBar<T extends string = string>({
  options,
  selectedKey,
  onSelect,
  style,
  scrollable = false,
}: MagnetFilterBarProps<T>) {
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const trackRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  // Optimistic update para respuesta instantánea en 0ms al hacer clic
  const [optimisticKey, setOptimisticKey] = useState<T | null>(null);
  const currentKey = optimisticKey !== null ? optimisticKey : selectedKey;

  useEffect(() => {
    setOptimisticKey(null);
  }, [selectedKey]);

  const [pillStyle, setPillStyle] = useState<{ left: number; width: number; ready: boolean }>({
    left: 0,
    width: 0,
    ready: false,
  });

  // Calcula la posición y tamaño exacto del selector magnético
  const updatePill = useCallback(() => {
    const track = trackRef.current;
    const btn = buttonRefs.current[currentKey];
    if (!track || !btn) return;

    const trackRect = track.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();

    // Posición relativa al track incluyendo scroll horizontal si aplica
    const left = btnRect.left - trackRect.left + track.scrollLeft;
    const width = btnRect.width;

    setPillStyle({
      left,
      width,
      ready: true,
    });
  }, [currentKey]);

  useEffect(() => {
    updatePill();
  }, [updatePill, options]);

  // Manejo de carga inicial y desactivación del skip de animación
  useEffect(() => {
    if (pillStyle.ready && isFirstRender.current) {
      const timer = setTimeout(() => {
        isFirstRender.current = false;
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [pillStyle.ready]);

  // Observer de redimensionamiento para recalcular el imán ante resize o cambio de layout
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const ro = new ResizeObserver(() => {
      updatePill();
    });
    ro.observe(track);

    window.addEventListener('resize', updatePill);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updatePill);
    };
  }, [updatePill]);

  const handleSelect = (key: T) => {
    if (currentKey === key) return;
    setOptimisticKey(key);
    onSelect(key);
  };

  return (
    <div
      ref={trackRef}
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        borderRadius: 999,
        padding: TRACK_PADDING,
        border: '1px solid #E2E8F0',
        position: 'relative',
        overflowX: scrollable ? 'auto' : 'hidden',
        whiteSpace: 'nowrap',
        width: '100%',
        boxSizing: 'border-box',
        scrollbarWidth: 'none',
        ...style,
      }}>
      {/* Pastilla magnética animada deslizante (Efecto Imán) */}
      {pillStyle.ready && (
        <div
          style={{
            position: 'absolute',
            top: TRACK_PADDING,
            bottom: TRACK_PADDING,
            left: 0,
            width: pillStyle.width,
            backgroundColor: '#FFFFFF',
            borderRadius: 999,
            border: `1px solid ${Colors.primaryMid}`,
            boxShadow: '0 2px 5px rgba(20, 32, 51, 0.08)',
            transform: `translate3d(${pillStyle.left}px, 0, 0)`,
            transition: isFirstRender.current
              ? 'none'
              : 'transform 0.38s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
      )}

      {options.map(opt => {
        const isSelected = opt.key === currentKey;

        return (
          <button
            key={opt.key}
            ref={el => {
              buttonRefs.current[opt.key] = el;
            }}
            type="button"
            onClick={() => handleSelect(opt.key)}
            style={{
              flex: scrollable ? '0 0 auto' : 1,
              padding: scrollable ? '8px 16px' : '8px 6px',
              borderRadius: 999,
              backgroundColor: 'transparent',
              color: isSelected ? Colors.primaryDark : Colors.textSecondary,
              fontSize: 12,
              fontWeight: isSelected ? 800 : 600,
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
              zIndex: 1,
              outline: 'none',
              userSelect: 'none',
              textAlign: 'center',
              boxSizing: 'border-box',
              minWidth: 0,
              transition: 'color 0.22s cubic-bezier(0.34, 1.56, 0.64, 1), font-weight 0.22s ease',
            }}
            onMouseDown={e => {
              e.currentTarget.style.transform = 'scale(0.96)';
            }}
            onMouseUp={e => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
            onTouchStart={e => {
              e.currentTarget.style.transform = 'scale(0.96)';
            }}
            onTouchEnd={e => {
              e.currentTarget.style.transform = 'scale(1)';
            }}>
            <span
              style={{
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
