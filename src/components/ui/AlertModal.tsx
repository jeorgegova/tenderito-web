import { useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  IoInformationCircle,
  IoCheckmarkCircle,
  IoCloseCircle,
  IoAlertCircle,
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

  if (!visible || !alert) {
    return null;
  }

  const type = alert.type ?? 'info';
  const buttons =
    alert.buttons && alert.buttons.length > 0
      ? alert.buttons
      : [{ text: 'Entendido', style: 'default' as const }];

  let icon = <IoInformationCircle size={32} color={Colors.primary} />;
  let iconBg: string = Colors.primaryLight;

  if (type === 'success') {
    icon = <IoCheckmarkCircle size={32} color={Colors.success} />;
    iconBg = '#DCFCE7';
  } else if (type === 'destructive') {
    icon = <IoCloseCircle size={32} color={Colors.destructive} />;
    iconBg = '#FEE2E2';
  } else if (type === 'warning') {
    icon = <IoAlertCircle size={32} color={Colors.warning} />;
    iconBg = '#FEF3C7';
  }

  const isTwoButtons = buttons.length === 2 && buttons.every(b => b.text.length <= 12);

  const content = (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        zIndex: 999999,
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const cancelBtn = buttons.find(b => b.style === 'cancel');
          if (cancelBtn) handleButtonPress(cancelBtn);
        }
      }}>
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 20,
          padding: '24px 20px 20px',
          maxWidth: 380,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          animation: 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
        <div
          style={{
            width: 58,
            height: 58,
            borderRadius: 29,
            backgroundColor: iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
          }}>
          {icon}
        </div>

        <h3
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: Colors.text,
            marginBottom: 8,
            lineHeight: 1.3,
          }}>
          {alert.title}
        </h3>

        {alert.message ? (
          <p
            style={{
              fontSize: 14,
              color: Colors.textSecondary,
              lineHeight: 1.5,
              marginBottom: 20,
              whiteSpace: 'pre-line',
            }}>
            {alert.message}
          </p>
        ) : (
          <div style={{ height: 16 }} />
        )}

        <div
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: isTwoButtons ? 'row' : 'column',
            gap: 10,
          }}>
          {buttons.map((btn, idx) => {
            const isCancel = btn.style === 'cancel';
            const isDestructive = btn.style === 'destructive';

            let bg: string = Colors.primary;
            let color: string = '#FFFFFF';
            let border: string = 'none';

            if (isCancel) {
              bg = '#F1F5F9';
              color = Colors.textSecondary;
            } else if (isDestructive) {
              bg = Colors.destructive;
              color = '#FFFFFF';
            }

            return (
              <button
                key={idx}
                onClick={() => handleButtonPress(btn)}
                style={{
                  flex: isTwoButtons ? 1 : undefined,
                  padding: '12px 16px',
                  borderRadius: 12,
                  backgroundColor: bg,
                  color,
                  border,
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 46,
                  textAlign: 'center',
                  lineHeight: '1.25',
                  wordBreak: 'break-word',
                  transition: 'opacity 0.15s, transform 0.15s',
                }}
                onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.98)')}
                onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}>
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
