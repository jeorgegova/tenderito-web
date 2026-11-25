import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  IoClose,
  IoImageOutline,
  IoTrashOutline,
  IoCalendarOutline,
  IoMegaphoneOutline,
  IoArrowForward,
} from 'react-icons/io5';
import { Colors } from '../theme';
import { Button } from './ui/Button';
import { StatusDatePickerModal } from './ui/StatusDatePickerModal';
import { getBogotaTodayYMD } from '../utils/format';
import { createStoreStatus, StoreStatus } from '../services/storeStatuses';

interface CreateStoreStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeId: string;
  storeName?: string;
  currentActiveCount: number;
  onCreated: (status: StoreStatus) => void;
}

export function CreateStoreStatusModal({
  isOpen,
  onClose,
  storeId,
  storeName,
  currentActiveCount,
  onCreated,
}: CreateStoreStatusModalProps) {
  const todayYMD = useMemo(() => getBogotaTodayYMD(), []);

  const addDaysToYMD = (ymd: string, days: number): string => {
    try {
      const [y, m, d] = ymd.split('-').map(Number);
      const date = new Date(Date.UTC(y, m - 1, d));
      date.setUTCDate(date.getUTCDate() + days);
      return date.toISOString().slice(0, 10);
    } catch (_e) {
      return ymd;
    }
  };

  const [caption, setCaption] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [startDateYMD, setStartDateYMD] = useState<string>(todayYMD);
  const [endDateYMD, setEndDateYMD] = useState<string>(addDaysToYMD(todayYMD, 7));
  const [activePreset, setActivePreset] = useState<'1d' | '1w' | '2w' | 'custom'>('1w');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Selector de fecha activo: 'start' | 'end' | null
  const [pickerMode, setPickerMode] = useState<'start' | 'end' | null>(null);

  // Resetear el estado cada vez que se abre el modal para salir como nuevo
  useEffect(() => {
    if (isOpen) {
      setCaption('');
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setSelectedFile(null);
      setPreviewUrl(null);
      setStartDateYMD(todayYMD);
      setEndDateYMD(addDaysToYMD(todayYMD, 7));
      setActivePreset('1w');
      setIsSubmitting(false);
      setErrorMessage(null);
      setPickerMode(null);
    }
  }, [isOpen, todayYMD]);

  if (!isOpen) return null;

  const isLimitReached = currentActiveCount >= 3;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Por favor selecciona un archivo de imagen válido (JPG, PNG o WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('La imagen es demasiado grande. El tamaño máximo permitido es 5 MB.');
      return;
    }

    setErrorMessage(null);
    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleRemoveImage = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const handleApplyPreset = (preset: '1d' | '1w' | '2w') => {
    setActivePreset(preset);
    const start = startDateYMD || todayYMD;
    if (preset === '1d') {
      setEndDateYMD(addDaysToYMD(start, 1));
    } else if (preset === '1w') {
      setEndDateYMD(addDaysToYMD(start, 7));
    } else if (preset === '2w') {
      setEndDateYMD(addDaysToYMD(start, 14));
    }
  };

  const formatDateDisplay = (ymd: string) => {
    try {
      const [y, m, d] = ymd.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      return date.toLocaleDateString('es-CO', {
        day: 'numeric',
        month: 'short',
      });
    } catch (_e) {
      return ymd;
    }
  };

  const handleSubmit = async () => {
    if (isLimitReached) {
      setErrorMessage('Tu tienda ya cuenta con 3 estados activos. Debes eliminar uno antes de crear otro.');
      return;
    }

    const trimmedCaption = caption.trim();
    if (!trimmedCaption) {
      setErrorMessage('Ingresa una descripción para la publicidad.');
      return;
    }

    if (trimmedCaption.length > 120) {
      setErrorMessage('La descripción no puede exceder 120 caracteres.');
      return;
    }

    if (!startDateYMD) {
      setErrorMessage('Debes seleccionar la fecha de inicio.');
      return;
    }

    if (!endDateYMD) {
      setErrorMessage('Debes seleccionar la fecha de fin de la publicidad.');
      return;
    }

    if (endDateYMD < startDateYMD) {
      setErrorMessage('La fecha de fin debe ser posterior a la fecha de inicio.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const startsAtIso =
      startDateYMD === todayYMD
        ? new Date().toISOString()
        : new Date(`${startDateYMD}T00:00:00-05:00`).toISOString();

    const expiresAtIso = new Date(`${endDateYMD}T23:59:59-05:00`).toISOString();

    const res = await createStoreStatus({
      storeId,
      file: selectedFile,
      caption: trimmedCaption,
      startsAt: startsAtIso,
      expiresAt: expiresAtIso,
    });

    setIsSubmitting(false);

    if (res.success && res.data) {
      onCreated(res.data);
      onClose();
    } else {
      setErrorMessage(res.error || 'No fue posible crear el estado. Inténtalo nuevamente.');
    }
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(5px)',
        WebkitBackdropFilter: 'blur(5px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}>
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          maxHeight: '92vh',
          backgroundColor: '#FFFFFF',
          borderRadius: 24,
          boxShadow: '0 20px 40px rgba(15, 23, 42, 0.22)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'modalSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={e => e.stopPropagation()}>
        {/* Encabezado */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #F1F5F9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                backgroundColor: Colors.primaryLight,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: Colors.primary,
              }}>
              <IoMegaphoneOutline size={20} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: Colors.text }}>
                Nuevo estado publicitario
              </div>
              <div style={{ fontSize: 12, color: Colors.textSecondary }}>
                {storeName ? `Para ${storeName}` : 'Publicidad en tu tienda'} · {currentActiveCount}/3 activos
              </div>
            </div>
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

        {/* Contenido scrolleable */}
        <div
          style={{
            padding: '16px 20px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}>
          {/* Mensaje de error si existe */}
          {errorMessage && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 12,
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: Colors.destructive,
                fontSize: 12.5,
                fontWeight: 600,
              }}>
              {errorMessage}
            </div>
          )}

          {/* 1. Selección de Imagen (Opcional) */}
          <div>
            <label
              style={{
                fontSize: 11.5,
                fontWeight: 800,
                color: Colors.textSecondary,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                display: 'block',
                marginBottom: 6,
              }}>
              Imagen o foto (Opcional)
            </label>

            {previewUrl ? (
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: 160,
                  borderRadius: 16,
                  overflow: 'hidden',
                  backgroundColor: '#0F172A',
                }}>
                <img
                  src={previewUrl}
                  alt="Vista previa"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  style={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    padding: '6px 12px',
                    borderRadius: 20,
                    backgroundColor: 'rgba(0, 0, 0, 0.65)',
                    color: '#FF6B6B',
                    border: 'none',
                    fontSize: 11.5,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    cursor: 'pointer',
                  }}>
                  <IoTrashOutline size={14} /> Cambiar
                </button>
              </div>
            ) : (
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '14px',
                  borderRadius: 14,
                  border: '1.5px dashed #CBD5E1',
                  backgroundColor: '#FAFAFA',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}>
                <IoImageOutline size={20} color={Colors.primary} />
                <span style={{ fontSize: 13, fontWeight: 700, color: Colors.primary }}>
                  Subir imagen
                </span>
                <span style={{ fontSize: 11, color: Colors.textSecondary }}>
                  (JPG, PNG hasta 5MB)
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </label>
            )}
          </div>

          {/* 2. Descripción / Caption (Obligatorio, máx 120 chars) */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 6,
              }}>
              <label
                style={{
                  fontSize: 11.5,
                  fontWeight: 800,
                  color: Colors.textSecondary,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}>
                Descripción *
              </label>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: caption.length > 120 ? Colors.destructive : Colors.textSecondary,
                }}>
                {caption.length}/120
              </span>
            </div>
            <textarea
              rows={2}
              maxLength={120}
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="Ej: Huevos en rebaja, cubeta a $15.000"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 12,
                border: `1.5px solid ${caption.length > 120 ? Colors.destructive : '#E2E8F0'}`,
                outline: 'none',
                fontSize: 13,
                fontFamily: 'inherit',
                color: Colors.text,
                resize: 'none',
                boxSizing: 'border-box',
                backgroundColor: '#FFFFFF',
              }}
            />
          </div>

          {/* 3. Vigencia / Duración (En una sola línea ajustada) */}
          <div>
            <label
              style={{
                fontSize: 11.5,
                fontWeight: 800,
                color: Colors.textSecondary,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                display: 'block',
                marginBottom: 6,
              }}>
              Vigencia de la publicidad *
            </label>

            {/* Presets rápidos */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              {[
                { key: '1d', label: '1 día' },
                { key: '1w', label: '1 semana' },
                { key: '2w', label: '2 semanas' },
              ].map(preset => {
                const isSelected = activePreset === preset.key;
                return (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => handleApplyPreset(preset.key as any)}
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      borderRadius: 10,
                      backgroundColor: isSelected ? Colors.primaryLight : '#F1F5F9',
                      border: `1.5px solid ${isSelected ? Colors.primary : 'transparent'}`,
                      color: isSelected ? Colors.primaryDark : Colors.textSecondary,
                      fontSize: 11.5,
                      fontWeight: isSelected ? 800 : 600,
                      cursor: 'pointer',
                    }}>
                    {preset.label}
                  </button>
                );
              })}
            </div>

            {/* Fila de fechas en una sola línea ajustada */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                backgroundColor: '#FAFAFA',
                padding: '8px 12px',
                borderRadius: 14,
                border: '1px solid #E2E8F0',
              }}>
              {/* Botón selector Desde */}
              <button
                type="button"
                onClick={() => setPickerMode('start')}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 8px',
                  borderRadius: 8,
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  color: Colors.text,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}>
                <IoCalendarOutline size={15} color={Colors.primary} />
                <span>Desde: {formatDateDisplay(startDateYMD)}</span>
              </button>

              <IoArrowForward size={14} color="#94A3B8" />

              {/* Botón selector Hasta */}
              <button
                type="button"
                onClick={() => setPickerMode('end')}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 8px',
                  borderRadius: 8,
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  color: Colors.text,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}>
                <IoCalendarOutline size={15} color={Colors.primary} />
                <span>Hasta: {formatDateDisplay(endDateYMD)}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Pie de acción */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid #F1F5F9',
            display: 'flex',
            gap: 10,
            backgroundColor: '#FAFAFA',
          }}>
          <Button
            title="Cancelar"
            variant="secondary"
            style={{ flex: 1 }}
            onPress={onClose}
            disabled={isSubmitting}
          />
          <Button
            title={isSubmitting ? 'Publicando…' : 'Publicar publicidad'}
            variant="primary"
            style={{ flex: 2 }}
            onPress={handleSubmit}
            disabled={isSubmitting || isLimitReached || !caption.trim()}
          />
        </div>
      </div>

      {/* Selector de fecha exclusivo y limpio */}
      {pickerMode && (
        <StatusDatePickerModal
          isOpen={Boolean(pickerMode)}
          onClose={() => setPickerMode(null)}
          title={pickerMode === 'start' ? 'Fecha de inicio' : 'Fecha de finalización'}
          valueYMD={pickerMode === 'start' ? startDateYMD : endDateYMD}
          minYMD={pickerMode === 'end' ? startDateYMD : todayYMD}
          onChangeYMD={val => {
            if (pickerMode === 'start') {
              setStartDateYMD(val);
              setActivePreset('custom');
              if (endDateYMD < val) {
                setEndDateYMD(val);
              }
            } else {
              setEndDateYMD(val);
              setActivePreset('custom');
            }
          }}
        />
      )}
    </div>,
    document.body
  );
}
