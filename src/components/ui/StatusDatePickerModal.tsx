import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { IoClose, IoChevronBack, IoChevronForward, IoCalendarOutline } from 'react-icons/io5';
import { Colors } from '../../theme';
import { Button } from './Button';

interface StatusDatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  valueYMD: string | null;
  minYMD?: string | null;
  onChangeYMD: (ymd: string) => void;
}

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const WEEKDAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export function StatusDatePickerModal({
  isOpen,
  onClose,
  title = 'Seleccionar fecha',
  valueYMD,
  minYMD,
  onChangeYMD,
}: StatusDatePickerModalProps) {
  // Inicializar con la fecha seleccionada o hoy
  const initialDate = valueYMD ? new Date(`${valueYMD}T12:00:00`) : new Date();
  const [viewYear, setViewYear] = useState<number>(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(initialDate.getMonth()); // 0-11
  const [selectedYMD, setSelectedYMD] = useState<string | null>(valueYMD);

  if (!isOpen) return null;

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(prev => prev - 1);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(prev => prev + 1);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  // Matriz de días del mes seleccionado
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
  // getDay(): 0 es domingo, ajustamos a lunes = 0
  let startingDayOfWeek = firstDayOfMonth.getDay() - 1;
  if (startingDayOfWeek === -1) startingDayOfWeek = 6;

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const daysList: (number | null)[] = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    daysList.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    daysList.push(d);
  }

  const handleSelectDay = (day: number) => {
    const mStr = String(viewMonth + 1).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    const ymd = `${viewYear}-${mStr}-${dStr}`;

    if (minYMD && ymd < minYMD) return;

    setSelectedYMD(ymd);
  };

  const handleConfirm = () => {
    if (selectedYMD) {
      onChangeYMD(selectedYMD);
    }
    onClose();
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(5px)',
        WebkitBackdropFilter: 'blur(5px)',
        zIndex: 100000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}>
      <div
        style={{
          width: '100%',
          maxWidth: 360,
          backgroundColor: '#FFFFFF',
          borderRadius: 22,
          boxShadow: '0 20px 40px rgba(15, 23, 42, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'modalSlideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={e => e.stopPropagation()}>
        {/* Cabecera limpia */}
        <div
          style={{
            padding: '16px 18px',
            borderBottom: '1px solid #F1F5F9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                backgroundColor: Colors.primaryLight,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: Colors.primary,
              }}>
              <IoCalendarOutline size={18} />
            </div>
            <span style={{ fontSize: 15, fontWeight: 800, color: Colors.text }}>
              {title}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              border: 'none',
              backgroundColor: '#F1F5F9',
              color: Colors.textSecondary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}>
            <IoClose size={20} />
          </button>
        </div>

        {/* Selector de Mes / Año */}
        <div
          style={{
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#FAFAFA',
          }}>
          <button
            type="button"
            onClick={handlePrevMonth}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: '1px solid #E2E8F0',
              backgroundColor: '#FFFFFF',
              color: Colors.text,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}>
            <IoChevronBack size={16} />
          </button>

          <span style={{ fontSize: 14, fontWeight: 800, color: Colors.text }}>
            {MONTH_NAMES[viewMonth]} {viewYear}
          </span>

          <button
            type="button"
            onClick={handleNextMonth}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: '1px solid #E2E8F0',
              backgroundColor: '#FFFFFF',
              color: Colors.text,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}>
            <IoChevronForward size={16} />
          </button>
        </div>

        {/* Cuadrícula de días */}
        <div style={{ padding: '14px 16px' }}>
          {/* Nombres de días */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              textAlign: 'center',
              marginBottom: 8,
            }}>
            {WEEKDAY_NAMES.map(w => (
              <span
                key={w}
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: Colors.textSecondary,
                }}>
                {w}
              </span>
            ))}
          </div>

          {/* Días del mes */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 4,
            }}>
            {daysList.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} style={{ height: 36 }} />;
              }

              const mStr = String(viewMonth + 1).padStart(2, '0');
              const dStr = String(day).padStart(2, '0');
              const currentYMD = `${viewYear}-${mStr}-${dStr}`;

              const isSelected = selectedYMD === currentYMD;
              const isDisabled = Boolean(minYMD && currentYMD < minYMD);

              return (
                <button
                  key={`day-${day}`}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleSelectDay(day)}
                  style={{
                    height: 36,
                    borderRadius: 10,
                    border: 'none',
                    backgroundColor: isSelected
                      ? Colors.primary
                      : 'transparent',
                    color: isSelected
                      ? '#FFFFFF'
                      : isDisabled
                      ? '#CBD5E1'
                      : Colors.text,
                    fontSize: 13,
                    fontWeight: isSelected ? 800 : 600,
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease',
                  }}>
                  {day}
                </button>
              );
            })}
          </div>
        </div>

        {/* Acciones */}
        <div
          style={{
            padding: '12px 18px',
            borderTop: '1px solid #F1F5F9',
            display: 'flex',
            gap: 10,
            backgroundColor: '#FAFAFA',
          }}>
          <Button
            title="Cancelar"
            variant="secondary"
            style={{ flex: 1, padding: '10px 0' }}
            onPress={onClose}
          />
          <Button
            title="Aplicar"
            variant="primary"
            style={{ flex: 1.5, padding: '10px 0' }}
            onPress={handleConfirm}
            disabled={!selectedYMD}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
