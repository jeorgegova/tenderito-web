import React, { useCallback, useEffect, useRef, useState } from 'react';
import { IoStorefrontOutline, IoPersonOutline } from 'react-icons/io5';
import { Colors } from '../../theme';

export interface MagnetRoleSwitchProps {
  role: 'store' | 'customer';
  onChange: (role: 'store' | 'customer') => void;
  style?: React.CSSProperties;
}

const ROLES = [
  { id: 'store' as const, label: 'Soy tendero', icon: <IoStorefrontOutline size={18} /> },
  { id: 'customer' as const, label: 'Soy cliente', icon: <IoPersonOutline size={18} /> },
];

const TRACK_PADDING = 4;

export function MagnetRoleSwitch({ role, onChange, style }: MagnetRoleSwitchProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const isFirstRender = useRef(true);

  const [optimisticRole, setOptimisticRole] = useState<'store' | 'customer' | null>(null);
  const currentRole = optimisticRole !== null ? optimisticRole : role;

  useEffect(() => {
    setOptimisticRole(null);
  }, [role]);

  const [pillStyle, setPillStyle] = useState<{ left: number; width: number; ready: boolean }>({
    left: 0,
    width: 0,
    ready: false,
  });

  const updatePill = useCallback(() => {
    const track = trackRef.current;
    const btn = buttonRefs.current[currentRole];
    if (!track || !btn) return;

    const trackRect = track.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();

    const left = btnRect.left - trackRect.left;
    const width = btnRect.width;

    setPillStyle({
      left,
      width,
      ready: true,
    });
  }, [currentRole]);

  useEffect(() => {
    updatePill();
  }, [updatePill]);

  useEffect(() => {
    if (pillStyle.ready && isFirstRender.current) {
      const timer = setTimeout(() => {
        isFirstRender.current = false;
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [pillStyle.ready]);

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

  const handleSelect = (selectedRole: 'store' | 'customer') => {
    if (currentRole === selectedRole) return;
    setOptimisticRole(selectedRole);
    onChange(selectedRole);
  };

  return (
    <div
      ref={trackRef}
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: TRACK_PADDING,
        width: '100%',
        marginBottom: 16,
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.06)',
        border: '1.5px solid #F0F2F5',
        position: 'relative',
        boxSizing: 'border-box',
        overflow: 'hidden',
        userSelect: 'none',
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
            backgroundColor: Colors.primaryLight,
            borderRadius: 20,
            border: '1.5px solid #FED7AA',
            boxShadow: '0 2px 8px rgba(255, 107, 0, 0.12)',
            transform: `translate3d(${pillStyle.left}px, 0, 0)`,
            transition: isFirstRender.current
              ? 'none'
              : 'transform 0.38s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
      )}

      {ROLES.map(r => {
        const isSelected = r.id === currentRole;

        return (
          <button
            key={r.id}
            ref={el => {
              buttonRefs.current[r.id] = el;
            }}
            type="button"
            onClick={() => handleSelect(r.id)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '10px 14px',
              borderRadius: 20,
              backgroundColor: 'transparent',
              color: isSelected ? Colors.primary : Colors.textSecondary,
              fontSize: 14,
              fontWeight: isSelected ? 800 : 600,
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
              zIndex: 1,
              outline: 'none',
              boxSizing: 'border-box',
              transition:
                'color 0.24s cubic-bezier(0.34, 1.56, 0.64, 1), font-weight 0.2s ease, transform 0.15s ease',
            }}
            onMouseDown={e => {
              e.currentTarget.style.transform = 'scale(0.97)';
            }}
            onMouseUp={e => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
            onTouchStart={e => {
              e.currentTarget.style.transform = 'scale(0.97)';
            }}
            onTouchEnd={e => {
              e.currentTarget.style.transform = 'scale(1)';
            }}>
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                color: isSelected ? Colors.primary : Colors.textSecondary,
                transition: 'color 0.24s',
              }}>
              {r.icon}
            </span>
            <span>{r.label}</span>
          </button>
        );
      })}
    </div>
  );
}
