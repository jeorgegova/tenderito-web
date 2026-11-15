import { useState, useEffect } from 'react';
import { IoClose, IoNotifications } from 'react-icons/io5';
import { Colors } from '../../theme';
import logoImg from '../../assets/NuevoLogo.png';

interface NotificationPayload {
  title: string;
  body: string;
  data?: any;
}

export function InAppNotificationToast() {
  const [notification, setNotification] = useState<NotificationPayload | null>(null);

  useEffect(() => {
    const handleNotification = (e: any) => {
      const detail = e.detail as NotificationPayload;
      if (detail) {
        setNotification(detail);
      }
    };

    window.addEventListener('tenderito-in-app-notification', handleNotification);
    return () => {
      window.removeEventListener('tenderito-in-app-notification', handleNotification);
    };
  }, []);

  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => {
      setNotification(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [notification]);

  if (!notification) return null;

  const handleToastClick = () => {
    const url = notification.data?.url || notification.data?.link;
    if (url && typeof window !== 'undefined') {
      window.location.href = url;
    }
    setNotification(null);
  };

  return (
    <div
      onClick={handleToastClick}
      style={{
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top, 12px) + 10px)',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 28px)',
        maxWidth: 480,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: '12px 14px',
        boxShadow: '0 12px 36px rgba(20, 32, 51, 0.22)',
        border: `1.5px solid ${Colors.primaryMid}`,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        zIndex: 11000,
        boxSizing: 'border-box',
        cursor: 'pointer',
        animation: 'slideDownNotification 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
      <style>{`
        @keyframes slideDownNotification {
          from {
            opacity: 0;
            transform: translate(-50%, -24px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0) scale(1);
          }
        }
      `}</style>

      {/* Icono de la notificación */}
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: '#FFF1E5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
        <img
          src={logoImg}
          alt="Tenderito"
          style={{ width: 28, height: 28, objectFit: 'contain' }}
        />
      </div>

      {/* Contenido */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 800,
            color: Colors.text,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
          <span>{notification.title}</span>
          <IoNotifications size={14} color={Colors.primary} />
        </div>
        <div
          style={{
            fontSize: 12.5,
            color: Colors.textSecondary,
            lineHeight: '17px',
            marginTop: 2,
          }}>
          {notification.body}
        </div>
      </div>

      {/* Botón cerrar */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setNotification(null);
        }}
        style={{
          background: 'none',
          border: 'none',
          padding: 4,
          color: Colors.textSecondary,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <IoClose size={18} />
      </button>
    </div>
  );
}
