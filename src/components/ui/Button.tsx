import React from 'react';
import { Colors, Radius } from '../../theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost';
  disabled?: boolean;
  style?: React.CSSProperties;
  icon?: React.ReactNode;
  leftElement?: React.ReactNode;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  style,
  icon,
  leftElement,
}: ButtonProps) {
  let bg: string = Colors.primary;
  let color: string = '#FFFFFF';
  let border: string = 'none';
  let shadow: string = '0 3px 6px rgba(255, 107, 0, 0.3)';

  if (variant === 'secondary') {
    bg = Colors.primaryLight;
    color = Colors.primary;
    border = `1.5px solid ${Colors.primaryMid}`;
    shadow = 'none';
  } else if (variant === 'destructive') {
    bg = Colors.destructive;
    color = '#FFFFFF';
    shadow = '0 2px 4px rgba(229, 57, 53, 0.2)';
  } else if (variant === 'ghost') {
    bg = 'transparent';
    color = Colors.primary;
    shadow = 'none';
  }

  return (
    <button
      disabled={disabled}
      onClick={onPress}
      style={{
        borderRadius: Radius.md,
        padding: '12px 16px',
        alignItems: 'center',
        justifyContent: 'center',
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'nowrap',
        gap: 8,
        minHeight: 48,
        backgroundColor: bg,
        color,
        border,
        boxShadow: shadow,
        fontSize: 15,
        fontWeight: 700,
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s ease',
        width: '100%',
        boxSizing: 'border-box',
        ...style,
      }}
      onMouseDown={e => {
        if (!disabled) e.currentTarget.style.transform = 'scale(0.985)';
      }}
      onMouseUp={e => {
        if (!disabled) e.currentTarget.style.transform = 'scale(1)';
      }}>
      {leftElement ? leftElement : icon ? icon : null}
      <span
        style={{
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          textAlign: 'center',
          lineHeight: '20px',
        }}>
        {title}
      </span>
    </button>
  );
}
