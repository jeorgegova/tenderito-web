import { IoSyncOutline, IoAlertCircleOutline, IoCloudOfflineOutline } from 'react-icons/io5';
import { Colors, Radius } from '../../theme';
import type { CreditStatus } from '../../types';

const map: Record<CreditStatus, { label: string; bg: string; fg: string }> = {
  pending: { label: 'Pendiente', bg: '#FFF3E8', fg: Colors.primary },
  partially_paid: { label: 'Parcial', bg: '#FEF3C7', fg: '#B45309' },
  paid: { label: 'Pagado', bg: '#DCFCE7', fg: '#15803D' },
};

export function Badge({ status }: { status: CreditStatus }) {
  const s = map[status] || map.pending;
  return (
    <span
      style={{
        borderRadius: Radius.full,
        padding: '4px 10px',
        backgroundColor: s.bg,
        color: s.fg,
        fontSize: 12,
        fontWeight: 700,
        display: 'inline-flex',
        alignItems: 'center',
        whiteSpace: 'nowrap',
      }}>
      {s.label}
    </span>
  );
}

export function OverdueBadge({ text }: { text: string }) {
  return (
    <span
      style={{
        borderRadius: Radius.full,
        padding: '4px 10px',
        backgroundColor: '#FEE2E2',
        color: Colors.destructive,
        fontSize: 12,
        fontWeight: 700,
        display: 'inline-flex',
        alignItems: 'center',
        whiteSpace: 'nowrap',
      }}>
      {text}
    </span>
  );
}

export function SyncBadge({
  estadoServidor,
  compact = false,
}: {
  estadoServidor?: string;
  compact?: boolean;
}) {
  if (!estadoServidor) return null;
  const s = estadoServidor.toLowerCase();
  if (s === 'synced' || s === 'sincronizado') return null;

  const isSyncing = s === 'syncing';
  const isError = s === 'error';

  const label = isSyncing ? 'Subiendo' : isError ? 'Error' : 'Pendiente';
  const color = isSyncing ? '#2563EB' : isError ? '#DC2626' : '#B45309';
  const bg = isSyncing ? '#EFF6FF' : isError ? '#FEE2E2' : '#FEF3C7';

  const icon = isSyncing ? (
    <IoSyncOutline size={12} color={color} className="spin" />
  ) : isError ? (
    <IoAlertCircleOutline size={12} color={color} />
  ) : (
    <IoCloudOfflineOutline size={12} color={color} />
  );

  if (compact) {
    return (
      <span
        title={`Estado de sincronización: ${label}`}
        style={{
          borderRadius: Radius.full,
          padding: 3,
          backgroundColor: bg,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        {icon}
      </span>
    );
  }

  return (
    <span
      style={{
        borderRadius: Radius.full,
        padding: '2px 8px',
        backgroundColor: bg,
        color,
        fontSize: 11,
        fontWeight: 700,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        whiteSpace: 'nowrap',
      }}>
      {icon}
      <span>{label}</span>
    </span>
  );
}
