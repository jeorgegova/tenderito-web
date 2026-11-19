import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  IoCalendarOutline,
  IoChevronDown,
  IoCloseCircle,
  IoClose,
  IoChevronBack,
  IoChevronForward,
  IoFlashOutline,
  IoTimeOutline,
} from 'react-icons/io5';
import { Colors, Radius } from '../../theme';
import { getBogotaTodayYMD } from '../../utils/format';
import { Button } from './Button';

export interface DatePickerProps {
  label?: string;
  value?: string | null; // Formato esperado: 'AAAA-MM-DD'
  onChange: (date: string | null) => void;
  placeholder?: string;
  minDate?: string; // Formato: 'AAAA-MM-DD'
  maxDate?: string; // Formato: 'AAAA-MM-DD'
  error?: string;
  helperText?: string;
  disabled?: boolean;
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

const WEEK_DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

/** Convierte componentes de fecha numérica en formato YYYY-MM-DD */
function formatYMD(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

/** Descompone una cadena YYYY-MM-DD de forma segura sin sesgo horario */
function parseYMD(
  dateStr?: string | null,
): { year: number; month: number; day: number } | null {
  if (!dateStr || typeof dateStr !== 'string') {
    return null;
  }
  const parts = dateStr.split('-');
  if (parts.length !== 3) {
    return null;
  }
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    return null;
  }
  return { year, month, day };
}

/** Formatea YYYY-MM-DD a texto legible en español */
function formatReadableDate(dateStr?: string | null): string {
  const parsed = parseYMD(dateStr);
  if (!parsed) {
    return '';
  }
  const d = new Date(parsed.year, parsed.month, parsed.day);
  const weekday = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][d.getDay()];
  const monthName = MONTH_NAMES[parsed.month].slice(0, 3).toLowerCase();
  return `${weekday}, ${parsed.day} de ${monthName}. ${parsed.year}`;
}

/** Calcula la diferencia de días respecto a hoy */
function getDaysDiffFromToday(dateStr: string): number {
  const todayParsed = parseYMD(getBogotaTodayYMD())!;
  const targetParsed = parseYMD(dateStr);
  if (!targetParsed) {
    return 0;
  }

  const t1 = new Date(
    todayParsed.year,
    todayParsed.month,
    todayParsed.day,
  ).getTime();
  const t2 = new Date(
    targetParsed.year,
    targetParsed.month,
    targetParsed.day,
  ).getTime();
  return Math.round((t2 - t1) / (1000 * 60 * 60 * 24));
}

/** Genera etiqueta amigable relativa: "En 8 días", "Mañana", etc. */
function getRelativeBadge(dateStr: string): string | null {
  const diff = getDaysDiffFromToday(dateStr);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Mañana';
  if (diff > 1) return `En ${diff} días`;
  if (diff === -1) return 'Ayer';
  return `Vencido (${Math.abs(diff)} d)`;
}

export function DatePicker({
  label,
  value,
  onChange,
  placeholder = 'Selecciona una fecha',
  minDate,
  maxDate,
  error,
  helperText,
  disabled = false,
}: DatePickerProps) {
  const [modalVisible, setModalVisible] = useState(false);

  // Inicializar el mes visible del calendario basado en el valor actual o hoy
  const initialDate = useMemo(() => {
    return parseYMD(value) || parseYMD(getBogotaTodayYMD())!;
  }, [value]);

  const [viewYear, setViewYear] = useState<number>(initialDate.year);
  const [viewMonth, setViewMonth] = useState<number>(initialDate.month);
  const [tempSelected, setTempSelected] = useState<string | null>(
    value || null,
  );

  const todayStr = useMemo(() => getBogotaTodayYMD(), []);

  // Al abrir el modal, sincronizar estado temporal
  const handleOpenModal = () => {
    if (disabled) return;
    const current = parseYMD(value) || parseYMD(getBogotaTodayYMD())!;
    setViewYear(current.year);
    setViewMonth(current.month);
    setTempSelected(value || null);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
  };

  const handleConfirm = () => {
    onChange(tempSelected);
    setModalVisible(false);
  };

  const handleClear = () => {
    onChange(null);
    setTempSelected(null);
    setModalVisible(false);
  };

  // Navegación de meses
  const goToPrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear(y => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear(y => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  // Generador de atajos de fecha prácticos
  const shortcuts = useMemo(() => {
    const todayParts = parseYMD(getBogotaTodayYMD())!;
    const today = new Date(todayParts.year, todayParts.month, todayParts.day);

    // +8 días
    const in8 = new Date(today);
    in8.setDate(today.getDate() + 8);

    // Próxima Quincena (el siguiente 15 o 30 real)
    const currentDay = today.getDate();
    let nextQuincenaDate: Date;
    if (currentDay < 15) {
      nextQuincenaDate = new Date(today.getFullYear(), today.getMonth(), 15);
    } else if (currentDay < 30) {
      const lastDayOfMonth = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0,
      ).getDate();
      nextQuincenaDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        Math.min(30, lastDayOfMonth),
      );
    } else {
      // Si hoy es 30 o 31, la próxima quincena es el 15 del siguiente mes
      nextQuincenaDate = new Date(today.getFullYear(), today.getMonth() + 1, 15);
    }

    const quincenaYmd = formatYMD(
      nextQuincenaDate.getFullYear(),
      nextQuincenaDate.getMonth(),
      nextQuincenaDate.getDate(),
    );

    // Fin de mes (último día del mes)
    const endOfThisMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const endOfThisMonthYmd = formatYMD(
      endOfThisMonth.getFullYear(),
      endOfThisMonth.getMonth(),
      endOfThisMonth.getDate(),
    );

    // Si la próxima quincena ya coincide con el fin de este mes, o faltan <= 2 días, apuntar al fin del siguiente mes
    const targetEndOfMonth =
      quincenaYmd === endOfThisMonthYmd || endOfThisMonth.getDate() - currentDay <= 2
        ? new Date(today.getFullYear(), today.getMonth() + 2, 0)
        : endOfThisMonth;

    return [
      {
        label: '+8 días',
        ymd: formatYMD(in8.getFullYear(), in8.getMonth(), in8.getDate()),
      },
      {
        label: 'Próxima Quincena',
        ymd: quincenaYmd,
      },
      {
        label: 'Fin de mes',
        ymd: formatYMD(
          targetEndOfMonth.getFullYear(),
          targetEndOfMonth.getMonth(),
          targetEndOfMonth.getDate(),
        ),
      },
    ];
  }, []);

  const handleSelectShortcut = (ymd: string) => {
    setTempSelected(ymd);
    const parsed = parseYMD(ymd);
    if (parsed) {
      setViewYear(parsed.year);
      setViewMonth(parsed.month);
    }
  };

  // Matriz de días del mes
  const calendarCells = useMemo(() => {
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    // getDay(): 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
    // Ajustar para que la semana inicie en Lunes (0 = Lunes, 6 = Domingo)
    const firstDayIndex = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;

    const cells: Array<{
      day: number | null;
      ymd: string | null;
      isToday: boolean;
      isSelected: boolean;
      isDisabled: boolean;
    }> = [];

    // Celdas vacías al inicio
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push({
        day: null,
        ymd: null,
        isToday: false,
        isSelected: false,
        isDisabled: true,
      });
    }

    // Días del mes
    for (let d = 1; d <= daysInMonth; d++) {
      const ymd = formatYMD(viewYear, viewMonth, d);
      const isToday = ymd === todayStr;
      const isSelected = ymd === tempSelected;

      let isDisabled = false;
      if (minDate && ymd < minDate) {
        isDisabled = true;
      }
      if (maxDate && ymd > maxDate) {
        isDisabled = true;
      }

      cells.push({
        day: d,
        ymd,
        isToday,
        isSelected,
        isDisabled,
      });
    }

    return cells;
  }, [viewYear, viewMonth, todayStr, tempSelected, minDate, maxDate]);

  const relativeText = value ? getRelativeBadge(value) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
      {label && (
        <label
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: Colors.textSecondary,
            letterSpacing: '0.1px',
          }}>
          {label}
        </label>
      )}

      {/* Trigger Button que simula el Input de Tenderito */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={handleOpenModal}
        onKeyDown={e => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            handleOpenModal();
          }
        }}
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          backgroundColor: Colors.card,
          border: `1.5px solid ${error ? Colors.destructive : Colors.border}`,
          borderRadius: Radius.md,
          minHeight: 52,
          padding: '8px 14px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
          boxSizing: 'border-box',
          transition: 'border-color 0.15s ease',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <IoCalendarOutline
            size={20}
            color={value ? Colors.primary : Colors.textMuted}
          />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {value ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 6,
              }}>
              <span style={{ fontSize: 15, color: Colors.text, fontWeight: 600 }}>
                {formatReadableDate(value)}
              </span>
              {relativeText && (
                <span
                  style={{
                    backgroundColor: relativeText.includes('Vencido')
                      ? '#FEE2E2'
                      : Colors.primaryLight,
                    color: relativeText.includes('Vencido')
                      ? Colors.destructive
                      : Colors.primary,
                    border: `1px solid ${
                      relativeText.includes('Vencido')
                        ? '#FECACA'
                        : Colors.primaryMid
                    }`,
                    padding: '2px 8px',
                    borderRadius: Radius.full,
                    fontSize: 11,
                    fontWeight: 700,
                  }}>
                  {relativeText}
                </span>
              )}
            </div>
          ) : (
            <span
              style={{
                fontSize: 15,
                color: Colors.textMuted,
                fontWeight: 500,
              }}>
              {placeholder}
            </span>
          )}
        </div>

        {value ? (
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              onChange(null);
            }}
            style={{
              background: 'none',
              border: 'none',
              padding: 4,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <IoCloseCircle size={20} color={Colors.textMuted} />
          </button>
        ) : (
          <IoChevronDown size={16} color={Colors.textMuted} />
        )}
      </div>

      {error ? (
        <span style={{ fontSize: 12, color: Colors.destructive, fontWeight: 600 }}>
          {error}
        </span>
      ) : helperText ? (
        <span style={{ fontSize: 12, color: Colors.textSecondary }}>
          {helperText}
        </span>
      ) : null}

      {/* Modal / Diálogo del Calendario elevado en un Portal */}
      {modalVisible &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            onClick={handleCloseModal}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(28, 16, 8, 0.55)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              zIndex: 99999,
              display: 'flex',
              alignItems: 'center', // Sube el calendario al centro de la pantalla
              justifyContent: 'center',
              padding: '16px',
              boxSizing: 'border-box',
            }}>
            <div
              onClick={e => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: 420,
                maxHeight: 'min(90vh, 640px)',
                backgroundColor: Colors.card,
                borderRadius: 24,
                padding: '18px 20px 20px',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 20px 45px rgba(0, 0, 0, 0.28)',
                boxSizing: 'border-box',
                overflow: 'hidden',
              }}>
              {/* Cabecera del modal */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: 14,
                  borderBottom: `1px solid ${Colors.border}`,
                }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: Colors.text }}>
                    Fecha para pagar
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: Colors.textSecondary,
                      fontWeight: 500,
                      marginTop: 2,
                    }}>
                    {tempSelected
                      ? formatReadableDate(tempSelected)
                      : 'Elige el día límite de pago'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: Colors.cardAlt,
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}>
                  <IoClose size={22} color={Colors.textSecondary} />
                </button>
              </div>

              {/* Contenedor scrolleable para evitar desbordes en pantallas compactas */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  paddingBottom: 8,
                }}>
                {/* Atajos Rápidos */}
                <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      color: Colors.textMuted,
                      letterSpacing: '0.8px',
                    }}>
                    PLAZO RÁPIDO
                  </span>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      gap: 8,
                      overflowX: 'auto',
                      paddingBottom: 4,
                    }}>
                    {shortcuts.map(sc => {
                      const isActive = tempSelected === sc.ymd;
                      return (
                        <button
                          key={sc.label}
                          type="button"
                          onClick={() => handleSelectShortcut(sc.ymd)}
                          style={{
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 5,
                            backgroundColor: isActive ? Colors.primary : Colors.primaryLight,
                            border: `1px solid ${
                              isActive ? Colors.primary : Colors.primaryMid
                            }`,
                            color: isActive ? '#FFFFFF' : Colors.primary,
                            padding: '7px 12px',
                            borderRadius: Radius.full,
                            cursor: 'pointer',
                            fontWeight: 700,
                            fontSize: 12,
                            whiteSpace: 'nowrap',
                            transition: 'all 0.15s ease',
                          }}>
                          <IoFlashOutline
                            size={13}
                            color={isActive ? '#FFFFFF' : Colors.primary}
                          />
                          <span>{sc.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Navegación del mes */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: 16,
                    marginBottom: 10,
                  }}>
                  <button
                    type="button"
                    onClick={goToPrevMonth}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 8,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: Colors.primary,
                    }}>
                    <IoChevronBack size={20} />
                  </button>

                  <div style={{ fontSize: 15, fontWeight: 800, color: Colors.text }}>
                    {MONTH_NAMES[viewMonth]} {viewYear}
                  </div>

                  <button
                    type="button"
                    onClick={goToNextMonth}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 8,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: Colors.primary,
                    }}>
                    <IoChevronForward size={20} />
                  </button>
                </div>

                {/* Días de la semana */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    textAlign: 'center',
                    marginBottom: 6,
                  }}>
                  {WEEK_DAYS.map((w, index) => (
                    <span
                      key={w}
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: index >= 5 ? Colors.primary : Colors.textMuted,
                        padding: '4px 0',
                      }}>
                      {w}
                    </span>
                  ))}
                </div>

                {/* Matriz de días */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    gap: 3,
                  }}>
                  {calendarCells.map((cell, idx) => {
                    if (cell.day === null) {
                      return <div key={`empty-${idx}`} style={{ height: 38 }} />;
                    }

                    const isSelected = cell.isSelected;
                    const isToday = cell.isToday;

                    return (
                      <button
                        key={cell.ymd}
                        type="button"
                        disabled={cell.isDisabled}
                        onClick={() => cell.ymd && setTempSelected(cell.ymd)}
                        style={{
                          height: 38,
                          borderRadius: Radius.sm,
                          border: isToday && !isSelected ? `1.5px solid ${Colors.primary}` : 'none',
                          backgroundColor: isSelected
                            ? Colors.primary
                            : isToday
                            ? Colors.primaryLight
                            : 'transparent',
                          color: isSelected
                            ? '#FFFFFF'
                            : cell.isDisabled
                            ? '#CBD5E1'
                            : isToday
                            ? Colors.primary
                            : Colors.text,
                          fontWeight: isSelected || isToday ? 800 : 500,
                          fontSize: 13,
                          cursor: cell.isDisabled ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'relative',
                          transition: 'background-color 0.1s ease',
                        }}>
                        <span>{cell.day}</span>
                        {isToday && !isSelected && (
                          <div
                            style={{
                              width: 4,
                              height: 4,
                              borderRadius: 2,
                              backgroundColor: Colors.primary,
                              marginTop: 1,
                            }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Resumen del plazo seleccionado */}
                {tempSelected ? (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      backgroundColor: Colors.primaryLight,
                      border: `1px solid ${Colors.primaryMid}`,
                      borderRadius: Radius.md,
                      padding: '10px 12px',
                      marginTop: 14,
                    }}>
                    <IoTimeOutline size={16} color={Colors.primary} style={{ flexShrink: 0 }} />
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: Colors.text,
                      }}>
                      {getDaysDiffFromToday(tempSelected) === 0
                        ? 'Vence hoy'
                        : getDaysDiffFromToday(tempSelected) > 0
                        ? `El cliente tendrá ${getDaysDiffFromToday(
                            tempSelected,
                          )} días para pagar`
                        : `Fecha anterior a hoy (${Math.abs(
                            getDaysDiffFromToday(tempSelected),
                          )} días atrás)`}
                    </span>
                  </div>
                ) : null}
              </div>

              {/* Botones de acción propios del DatePicker */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  paddingTop: 12,
                  borderTop: `1px solid ${Colors.border}`,
                }}>
                {tempSelected ? (
                  <Button
                    title="Quitar fecha"
                    variant="ghost"
                    onPress={handleClear}
                    style={{ padding: '0 12px', fontSize: 13 }}
                  />
                ) : null}

                <div style={{ flex: 1 }}>
                  <Button
                    title={tempSelected ? 'Guardar fecha' : 'Sin fecha fija'}
                    variant={tempSelected ? 'primary' : 'secondary'}
                    onPress={handleConfirm}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
