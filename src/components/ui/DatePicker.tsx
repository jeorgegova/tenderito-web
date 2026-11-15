import React from 'react';
import { IoCalendarOutline } from 'react-icons/io5';
import { Colors, Radius } from '../../theme';
import { formatDateDisplay } from '../../utils/format';

export interface DatePickerProps {
  label?: string;
  value?: string | null; // Formato 'AAAA-MM-DD'
  onChange: (date: string | null) => void;
  placeholder?: string;
  minDate?: string;
  maxDate?: string;
  error?: string;
  helperText?: string;
  disabled?: boolean;
}

export function DatePicker({
  label,
  value,
  onChange,
  placeholder = 'Seleccionar fecha',
  minDate,
  maxDate,
  error,
  helperText,
  disabled = false,
}: DatePickerProps) {
  const display = value ? formatDateDisplay(value) : placeholder;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
      {label && (
        <label style={{ fontSize: 13, fontWeight: 700, color: Colors.textSecondary }}>
          {label}
        </label>
      )}

      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          backgroundColor: '#FFFFFF',
          borderRadius: Radius.md,
          border: `1.5px solid ${error ? Colors.destructive : Colors.border}`,
          padding: '0 14px',
          minHeight: 48,
          boxSizing: 'border-box',
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}>
        <IoCalendarOutline
          size={19}
          color={value ? Colors.primary : Colors.textMuted}
          style={{ marginRight: 8, flexShrink: 0 }}
        />

        <span
          style={{
            flex: 1,
            fontSize: 15,
            color: value ? Colors.text : Colors.textMuted,
            userSelect: 'none',
          }}>
          {display}
        </span>

        {/* Input invisible sobre el contenedor para disparar el selector nativo del navegador */}
        <input
          type="date"
          value={value || ''}
          min={minDate}
          max={maxDate}
          disabled={disabled}
          onChange={e => onChange(e.target.value || null)}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            opacity: 0,
            cursor: 'pointer',
          }}
        />
      </div>

      {error ? (
        <span style={{ fontSize: 12, color: Colors.destructive, fontWeight: 600 }}>
          {error}
        </span>
      ) : helperText ? (
        <span style={{ fontSize: 12, color: Colors.textMuted }}>{helperText}</span>
      ) : null}
    </div>
  );
}
