import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { IoLogOutOutline } from 'react-icons/io5';
import { create } from 'zustand';
import { Colors } from '../../theme';

export interface LogoutConfirmOptions {
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
}

interface LogoutModalState {
  visible: boolean;
  options: LogoutConfirmOptions | null;
  show: (options: LogoutConfirmOptions) => void;
  hide: () => void;
}

export const useLogoutModalStore = create<LogoutModalState>(set => ({
  visible: false,
  options: null,
  show: (options: LogoutConfirmOptions) => set({ visible: true, options }),
  hide: () => set({ visible: false, options: null }),
}));

export function showLogoutConfirmModal(options: LogoutConfirmOptions): void {
  useLogoutModalStore.getState().show(options);
}

export function hideLogoutConfirmModal(): void {
  useLogoutModalStore.getState().hide();
}

const DEFAULT_TITLE = '¿Cerrar sesión?';
const DEFAULT_MESSAGE =
  'Vas a salir de tu cuenta de Tenderito. Podrás volver a ingresar cuando lo necesites.';

export function LogoutConfirmModal() {
  const { visible, options, hide } = useLogoutModalStore();
  const [entered, setEntered] = useState(false);

  const handleCancel = useCallback(() => {
    hide();
  }, [hide]);

  const handleConfirm = useCallback(() => {
    const onConfirm = options?.onConfirm;
    hide();
    if (onConfirm) {
      setTimeout(() => {
        void onConfirm();
      }, 120);
    }
  }, [hide, options]);

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
        handleCancel();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [visible, handleCancel]);

  if (!visible || !options) {
    return null;
  }

  const confirmText = options.confirmText || 'Sí, cerrar sesión';
  const cancelText = options.cancelText || 'Cancelar';

  const content = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-modal-title"
      aria-describedby="logout-modal-desc"
      onClick={e => {
        if (e.target === e.currentTarget) {
          handleCancel();
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
        .tenderito-logout-actions {
          width: 100%;
          display: flex;
          flex-direction: row;
          align-items: stretch;
          gap: 10px;
        }
        .tenderito-logout-btn-cancel {
          flex: 1;
          order: 1;
        }
        .tenderito-logout-btn-confirm {
          flex: 1.25;
          order: 2;
        }
        @media (max-width: 410px) {
          .tenderito-logout-actions {
            flex-direction: column;
          }
          .tenderito-logout-btn-cancel {
            flex: none;
            width: 100%;
            order: 2;
          }
          .tenderito-logout-btn-confirm {
            flex: none;
            width: 100%;
            order: 1;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .tenderito-logout-card,
          .tenderito-logout-btn {
            transition: none !important;
          }
        }
      `}</style>

      <div
        className="tenderito-logout-card"
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
        {/* Curvas orgánicas decorativas sutiles de marca */}
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

        {/* Icono superior */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: '#FFF0E5',
            border: '1.5px solid rgba(255, 107, 0, 0.16)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 18,
            boxShadow: '0 4px 12px rgba(255, 107, 0, 0.12)',
            flexShrink: 0,
          }}>
          <IoLogOutOutline
            size={28}
            color={Colors.primary}
            style={{ marginLeft: 3 }}
          />
        </div>

        {/* Título */}
        <h3
          id="logout-modal-title"
          style={{
            position: 'relative',
            zIndex: 1,
            margin: 0,
            fontSize: 'clamp(19px, 4.5vw, 22px)',
            fontWeight: 800,
            color: Colors.text,
            lineHeight: 1.3,
            letterSpacing: '-0.02em',
          }}>
          {options.title || DEFAULT_TITLE}
        </h3>

        {/* Descripción */}
        <p
          id="logout-modal-desc"
          style={{
            position: 'relative',
            zIndex: 1,
            margin: '10px 0 24px',
            fontSize: 14.5,
            fontWeight: 500,
            color: Colors.textSecondary,
            lineHeight: 1.55,
            maxWidth: 320,
          }}>
          {options.message || DEFAULT_MESSAGE}
        </p>

        {/* Botones de acción */}
        <div
          className="tenderito-logout-actions"
          style={{ position: 'relative', zIndex: 1 }}>
          <button
            type="button"
            className="tenderito-logout-btn tenderito-logout-btn-cancel"
            onClick={handleCancel}
            style={{
              minHeight: 48,
              borderRadius: 14,
              padding: '12px 16px',
              backgroundColor: '#F8FAFC',
              color: Colors.text,
              border: '1.5px solid #E2E8F0',
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              lineHeight: 1.25,
              transition:
                'background-color 0.15s ease, transform 0.12s ease, border-color 0.15s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = '#F1F5F9';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = '#F8FAFC';
              e.currentTarget.style.transform = 'scale(1)';
            }}
            onMouseDown={e => {
              e.currentTarget.style.transform = 'scale(0.985)';
            }}
            onMouseUp={e => {
              e.currentTarget.style.transform = 'scale(1)';
            }}>
            {cancelText}
          </button>

          <button
            type="button"
            className="tenderito-logout-btn tenderito-logout-btn-confirm"
            onClick={handleConfirm}
            style={{
              minHeight: 48,
              borderRadius: 14,
              padding: '12px 16px',
              backgroundColor: Colors.primary,
              color: '#FFFFFF',
              border: 'none',
              boxShadow: '0 6px 16px rgba(255, 107, 0, 0.28)',
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              textAlign: 'center',
              lineHeight: 1.25,
              transition:
                'background-color 0.15s ease, transform 0.12s ease, box-shadow 0.15s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = Colors.primaryDark;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = Colors.primary;
              e.currentTarget.style.transform = 'scale(1)';
            }}
            onMouseDown={e => {
              e.currentTarget.style.transform = 'scale(0.985)';
            }}
            onMouseUp={e => {
              e.currentTarget.style.transform = 'scale(1)';
            }}>
            <IoLogOutOutline size={18} style={{ flexShrink: 0 }} />
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(content, document.body)
    : content;
}
