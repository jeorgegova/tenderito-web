import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  IoInformationCircleOutline,
  IoCheckmarkCircleOutline,
  IoCloseCircleOutline,
  IoAlertCircleOutline,
  IoTrashOutline,
} from 'react-icons/io5';
import { create } from 'zustand';
import { Colors } from '../../theme';

export type AlertType = 'info' | 'success' | 'warning' | 'destructive';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export interface AlertData {
  title: string;
  message?: string;
  type?: AlertType;
  buttons?: AlertButton[];
}

interface AlertStoreState {
  alert: AlertData | null;
  visible: boolean;
  show: (data: AlertData) => void;
  hide: () => void;
}

export const useAlertStore = create<AlertStoreState>(set => ({
  alert: null,
  visible: false,
  show: (data: AlertData) => set({ alert: data, visible: true }),
  hide: () => set({ visible: false, alert: null }),
}));

export function showAlert(
  titleOrData: string | AlertData,
  message?: string,
  buttons?: AlertButton[],
): void {
  if (typeof titleOrData === 'object' && titleOrData !== null) {
    useAlertStore.getState().show(titleOrData);
    return;
  }

  const title = titleOrData;
  const lower = `${title} ${message ?? ''}`.toLowerCase();

  let type: AlertType = 'info';
  if (
    lower.includes('error') ||
    lower.includes('no se pudo') ||
    lower.includes('eliminar') ||
    lower.includes('supera') ||
    lower.includes('vencido') ||
    lower.includes('falló')
  ) {
    type = 'destructive';
  } else if (
    lower.includes('faltan') ||
    lower.includes('tope') ||
    lower.includes('atención') ||
    lower.includes('cuidado') ||
    lower.includes('ya vinculado')
  ) {
    type = 'warning';
  } else if (
    lower.includes('éxito') ||
    lower.includes('exito') ||
    lower.includes('encontrado') ||
    lower.includes('guardado') ||
    lower.includes('activada') ||
    lower.includes('al día') ||
    lower.includes('listo')
  ) {
    type = 'success';
  }

  useAlertStore.getState().show({
    title,
    message,
    type,
    buttons,
  });
}

export function hideAlert(): void {
  useAlertStore.getState().hide();
}

export function AlertModal() {
  const { alert, visible, hide } = useAlertStore();
  const [entered, setEntered] = useState(false);

  const handleButtonPress = useCallback(
    (btn?: AlertButton) => {
      hide();
      if (btn?.onPress) {
        setTimeout(() => {
          btn.onPress?.();
        }, 120);
      }
    },
    [hide],
  );

  useEffect(() => {
    if (!visible) {
      setEntered(false);
      return;
    }

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

    if (prefersReducedMotion) {
      setEntered(true);
    } else {
      const raf = requestAnimationFrame(() => {
        setEntered(true);
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const cancelBtn = alert?.buttons?.find(b => b.style === 'cancel');
        handleButtonPress(cancelBtn || alert?.buttons?.[0]);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [visible, alert, handleButtonPress]);

  if (!visible || !alert) {
    return null;
  }

  const type = alert.type ?? 'info';
  const buttons =
    alert.buttons && alert.buttons.length > 0
      ? alert.buttons
      : [{ text: 'Entendido', style: 'default' as const }];

  const lowerText = `${alert.title} ${alert.message ?? ''}`.toLowerCase();

  let icon = <IoInformationCircleOutline size={28} color={Colors.primary} />;
  let iconBg: string = '#FFF0E5';
  let iconBorderColor: string = 'rgba(255, 107, 0, 0.16)';
  let iconShadow: string = 'rgba(255, 107, 0, 0.12)';

  if (type === 'success') {
    icon = <IoCheckmarkCircleOutline size={28} color={Colors.success} />;
    iconBg = '#DCFCE7';
    iconBorderColor = 'rgba(34, 197, 94, 0.16)';
    iconShadow = 'rgba(34, 197, 94, 0.12)';
  } else if (type === 'destructive') {
    const isTrash =
      lowerText.includes('eliminar') ||
      lowerText.includes('borrar') ||
      lowerText.includes('anular');
    icon = isTrash ? (
      <IoTrashOutline size={28} color={Colors.destructive} />
    ) : (
      <IoCloseCircleOutline size={28} color={Colors.destructive} />
    );
    iconBg = '#FEE2E2';
    iconBorderColor = 'rgba(239, 68, 68, 0.16)';
    iconShadow = 'rgba(239, 68, 68, 0.12)';
  } else if (type === 'warning') {
    icon = <IoAlertCircleOutline size={28} color={Colors.warning} />;
    iconBg = '#FEF3C7';
    iconBorderColor = 'rgba(245, 158, 11, 0.16)';
    iconShadow = 'rgba(245, 158, 11, 0.12)';
  }

  const isTwoButtons = buttons.length === 2 && buttons.every(b => b.text.length <= 14);

  const content = (
    <div
      role="dialog"
      aria-modal="true"
      onClick={e => {
        if (e.target === e.currentTarget) {
          const cancelBtn = buttons.find(b => b.style === 'cancel');
          if (cancelBtn) handleButtonPress(cancelBtn);
        }
      }}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(20, 32, 51, 0.46)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        zIndex: 999999,
        opacity: entered ? 1 : 0,
        transition: 'opacity 240ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}>
      <style>{`
        .tenderito-alert-actions {
          width: 100%;
          display: flex;
          flex-direction: row;
          align-items: stretch;
          gap: 10px;
          margin-top: 20px;
        }
        .tenderito-alert-btn-cancel {
          flex: 1;
        }
        .tenderito-alert-btn-confirm {
          flex: 1.25;
        }
        @media (max-width: 410px) {
          .tenderito-alert-actions {
            flex-direction: column !important;
          }
          .tenderito-alert-btn-cancel,
          .tenderito-alert-btn-confirm {
            flex: none !important;
            width: 100% !important;
          }
        }
      `}</style>

      <div
        style={{
          position: 'relative',
          backgroundColor: '#FFFDFB',
          borderRadius: 26,
          padding: '28px 24px 24px',
          maxWidth: 400,
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          overflowX: 'hidden',
          boxSizing: 'border-box',
          border: '1px solid #F6E4D5',
          boxShadow:
            '0 24px 48px -12px rgba(20, 32, 51, 0.18), 0 8px 20px -8px rgba(255, 107, 0, 0.10)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          opacity: entered ? 1 : 0,
          transform: entered
            ? 'scale(1) translateY(0)'
            : 'scale(0.95) translateY(8px)',
          transition:
            'opacity 240ms cubic-bezier(0.22, 1, 0.36, 1), transform 240ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}>
        {/* Curvas orgánicas decorativas de marca Tenderito */}
        <svg
          aria-hidden="true"
          viewBox="0 0 120 120"
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: 112,
            height: 112,
            pointerEvents: 'none',
          }}>
          <path
            d="M36 0 C54 34, 86 58, 120 68 L120 0 Z"
            fill="#FFF0E5"
            opacity="0.9"
          />
          <circle cx="90" cy="24" r="5" fill="#FFD7B8" opacity="0.85" />
          <circle cx="104" cy="44" r="3" fill="#FF6B00" opacity="0.2" />
        </svg>

        <svg
          aria-hidden="true"
          viewBox="0 0 100 100"
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: 92,
            height: 92,
            pointerEvents: 'none',
          }}>
          <path
            d="M0 38 C32 48, 56 72, 68 100 L0 100 Z"
            fill="#FFF5EC"
            opacity="0.95"
          />
        </svg>

        {/* Icono superior temático */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: iconBg,
            border: `1.5px solid ${iconBorderColor}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 18,
            boxShadow: `0 4px 12px ${iconShadow}`,
            flexShrink: 0,
          }}>
          {icon}
        </div>

        {/* Título */}
        <h3
          style={{
            position: 'relative',
            zIndex: 1,
            margin: 0,
            fontSize: 'clamp(19px, 4.5vw, 21px)',
            fontWeight: 800,
            color: Colors.text,
            lineHeight: 1.3,
            letterSpacing: '-0.02em',
          }}>
          {alert.title}
        </h3>

        {/* Mensaje */}
        {alert.message ? (
          <p
            style={{
              position: 'relative',
              zIndex: 1,
              marginTop: 10,
              marginBottom: 0,
              fontSize: '14.5px',
              fontWeight: 500,
              color: Colors.textSecondary,
              lineHeight: 1.5,
              maxWidth: 320,
              whiteSpace: 'pre-line',
            }}>
            {alert.message}
          </p>
        ) : null}

        {/* Botones de acción */}
        <div
          className="tenderito-alert-actions"
          style={{
            position: 'relative',
            zIndex: 1,
            flexDirection: isTwoButtons ? 'row' : 'column',
          }}>
          {buttons.map((btn, idx) => {
            const isCancel = btn.style === 'cancel';
            const isDestructive = btn.style === 'destructive';
            const isPrimary = !isCancel && !isDestructive;
            const isDeleteAction =
              isDestructive &&
              (lowerText.includes('eliminar') ||
                lowerText.includes('borrar') ||
                btn.text.toLowerCase().includes('eliminar'));

            let bg: string = Colors.primary;
            let color: string = '#FFFFFF';
            let border: string = 'none';
            let boxShadow: string = '0 6px 14px rgba(255, 107, 0, 0.28)';

            if (isCancel) {
              bg = '#F8FAFC';
              color = Colors.text;
              border = '1.5px solid #E2E8F0';
              boxShadow = 'none';
            } else if (isDestructive) {
              bg = Colors.destructive;
              color = '#FFFFFF';
              boxShadow = '0 6px 14px rgba(239, 68, 68, 0.28)';
            }

            return (
              <button
                key={idx}
                onClick={() => handleButtonPress(btn)}
                className={isCancel ? 'tenderito-alert-btn-cancel' : 'tenderito-alert-btn-confirm'}
                style={{
                  minHeight: 48,
                  padding: '12px 16px',
                  borderRadius: 14,
                  backgroundColor: bg,
                  color,
                  border,
                  boxShadow,
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  textAlign: 'center',
                  lineHeight: '1.25',
                  wordBreak: 'break-word',
                  transition: 'background-color 0.15s, transform 0.15s',
                }}
                onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.985)')}
                onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}>
                {isDeleteAction && <IoTrashOutline size={18} color="#FFFFFF" />}
                {btn.text}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(content, document.body)
    : content;
}
