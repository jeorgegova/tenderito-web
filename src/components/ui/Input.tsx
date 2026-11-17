import React, { useState } from 'react';
import {
  IoSearchOutline,
  IoEye,
  IoEyeOff,
  IoBasketOutline,
  IoCashOutline,
  IoPersonOutline,
  IoCloseCircle,
} from 'react-icons/io5';
import { Colors, Radius } from '../../theme';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leadingIcon?: string | React.ReactNode;
  trailingIcon?: string | React.ReactNode;
  onTrailingPress?: () => void;
  pill?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    error,
    leadingIcon,
    trailingIcon,
    onTrailingPress,
    pill,
    type = 'text',
    style,
    onFocus,
    onBlur,
    ...rest
  },
  ref,
) {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const isPill = pill || leadingIcon === 'search' || leadingIcon === 'search-outline';
  const isPassword = type === 'password';

  const renderLeadingIcon = () => {
    if (!leadingIcon) return null;
    if (typeof leadingIcon !== 'string') {
      return (
        <span style={{ marginRight: 8, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          {leadingIcon}
        </span>
      );
    }
    const iconColor = isFocused ? Colors.primary : Colors.textMuted;
    const iconSize = 19;
    if (leadingIcon === 'search' || leadingIcon === 'search-outline') {
      return <IoSearchOutline size={iconSize} color={iconColor} style={{ marginRight: 8, flexShrink: 0 }} />;
    }
    if (leadingIcon === 'basket' || leadingIcon === 'basket-outline') {
      return <IoBasketOutline size={iconSize} color={iconColor} style={{ marginRight: 8, flexShrink: 0 }} />;
    }
    if (leadingIcon === 'cash' || leadingIcon === 'cash-outline') {
      return <IoCashOutline size={iconSize} color={iconColor} style={{ marginRight: 8, flexShrink: 0 }} />;
    }
    if (leadingIcon === 'person' || leadingIcon === 'person-outline') {
      return <IoPersonOutline size={iconSize} color={iconColor} style={{ marginRight: 8, flexShrink: 0 }} />;
    }
    return null;
  };

  const renderTrailingIcon = () => {
    if (isPassword) {
      return (
        <button
          type="button"
          onClick={() => setShowPassword(p => !p)}
          style={{
            background: 'none',
            border: 'none',
            padding: 4,
            color: Colors.textMuted,
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
          }}>
          {showPassword ? <IoEye size={20} /> : <IoEyeOff size={20} />}
        </button>
      );
    }

    if (!trailingIcon) return null;

    if (typeof trailingIcon !== 'string') {
      return (
        <button
          type="button"
          onClick={onTrailingPress}
          style={{
            background: 'none',
            border: 'none',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
            cursor: onTrailingPress ? 'pointer' : 'default',
          }}>
          {trailingIcon}
        </button>
      );
    }

    if (trailingIcon === 'close-circle') {
      return (
        <button
          type="button"
          onClick={onTrailingPress}
          style={{
            background: 'none',
            border: 'none',
            padding: 4,
            color: Colors.textMuted,
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
          }}>
          <IoCloseCircle size={18} />
        </button>
      );
    }

    return null;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
      {label && (
        <label
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: isFocused ? Colors.primary : Colors.textSecondary,
            transition: 'color 0.2s',
          }}>
          {label}
        </label>
      )}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#FFFFFF',
          borderRadius: isPill ? Radius.full : Radius.md,
          border: `1.5px solid ${error ? Colors.destructive : isFocused ? Colors.primary : Colors.border}`,
          boxShadow: isFocused ? '0 0 0 3px rgba(255, 107, 0, 0.15)' : 'none',
          padding: '0 14px',
          minHeight: 48,
          transition: 'border-color 0.2s, box-shadow 0.2s',
          boxSizing: 'border-box',
        }}>
        {renderLeadingIcon()}

        <input
          ref={ref}
          type={isPassword ? (showPassword ? 'text' : 'password') : type}
          onFocus={e => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={e => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            fontSize: 15,
            color: Colors.text,
            backgroundColor: 'transparent',
            height: '100%',
            padding: '12px 0',
            width: '100%',
            ...style,
          }}
          {...rest}
        />

        {renderTrailingIcon()}
      </div>
      {error && (
        <span style={{ fontSize: 12, color: Colors.destructive, fontWeight: 600 }}>
          {error}
        </span>
      )}
    </div>
  );
});
