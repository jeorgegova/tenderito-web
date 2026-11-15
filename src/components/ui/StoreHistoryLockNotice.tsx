import { useState } from 'react';
import { IoLockClosed, IoInformationCircleOutline, IoChevronUp, IoClose } from 'react-icons/io5';

interface StoreHistoryLockNoticeProps {
  style?: React.CSSProperties;
  text?: string;
  tooltipTitle?: string;
  tooltipDesc?: string;
}

export function StoreHistoryLockNotice({
  style,
  text = 'El historial entre tiendas está disponible en planes pagos.',
  tooltipTitle = 'Función de planes de pago',
  tooltipDesc = 'Esta funcionalidad te permite conocer el comportamiento de pago del cliente en otras tiendas de la red Tenderito antes de fiarle. Solo está disponible en planes de pago (Básico y Pro).',
}: StoreHistoryLockNoticeProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div style={{ position: 'relative', margin: '8px 0', ...style }}>
      <div
        onClick={() => setVisible(prev => !prev)}
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          backgroundColor: '#FEF3C7',
          padding: '8px 12px',
          borderRadius: 12,
          cursor: 'pointer',
        }}>
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: '#FDE68A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
          <IoLockClosed size={13} color="#B45309" />
        </div>

        <span style={{ fontSize: 13, color: '#92400E', fontWeight: 600, flex: 1 }}>
          {text}
        </span>

        {visible ? (
          <IoChevronUp size={16} color="#B45309" />
        ) : (
          <IoInformationCircleOutline size={16} color="#94A3B8" />
        )}
      </div>

      {visible && (
        <div
          style={{
            marginTop: 8,
            backgroundColor: '#1E293B',
            borderRadius: 12,
            padding: 14,
            color: '#FFFFFF',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 6,
            }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <IoLockClosed size={14} color="#FBBF24" />
              <strong style={{ fontSize: 13, color: '#FBBF24' }}>{tooltipTitle}</strong>
            </div>
            <button
              onClick={() => setVisible(false)}
              style={{ color: '#94A3B8', cursor: 'pointer', padding: 2 }}>
              <IoClose size={16} />
            </button>
          </div>
          <p style={{ fontSize: 12, color: '#CBD5E1', lineHeight: 1.4, margin: 0 }}>
            {tooltipDesc}
          </p>
        </div>
      )}
    </div>
  );
}
