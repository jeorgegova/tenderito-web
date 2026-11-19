import React from 'react';
import { IoPersonOutline, IoSyncOutline } from 'react-icons/io5';
import { useStore } from '../../store/useStore';
import { Colors } from '../../theme';
import { useSync } from '../../hooks/useSync';

export interface HeaderProps {
  title: string;
  subtitle?: string;
  showCurve?: boolean;
  rightElement?: React.ReactNode;
  sessionName?: string;
  sessionRole?: string;
  showSyncButton?: boolean;
}

export function Header({
  title,
  subtitle,
  showCurve = false,
  rightElement,
  sessionName,
  sessionRole,
  showSyncButton = true,
}: HeaderProps) {
  const profile = useStore(s => s.profile);
  const activeName = sessionName || profile?.merchant_name;
  const activeRole = sessionRole || (profile ? 'Tendero' : '');
  const { sync, isSyncing, isOnline } = useSync();

  const handleManualSync = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSyncing) return;
    try {
      await sync({ force: true });
    } catch (err) {
      console.warn('[Header] Error en sincronización manual:', err);
    }
  };
  return (
    <div
      style={{
        padding: '16px 20px 12px',
        backgroundColor: 'transparent',
        position: 'relative',
        zIndex: 1,
        overflow: 'hidden',
        width: '100%',
        boxSizing: 'border-box',
      }}>
      {showCurve && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: 220,
            height: 140,
            overflow: 'hidden',
            pointerEvents: 'none',
            zIndex: 0,
          }}>
          <div
            style={{
              position: 'absolute',
              top: -45,
              right: -25,
              width: 210,
              height: 155,
              borderBottomLeftRadius: 110,
              borderTopLeftRadius: 40,
              backgroundColor: '#FFE4D0',
              transform: 'rotate(-8deg)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: -55,
              right: -30,
              width: 175,
              height: 130,
              borderBottomLeftRadius: 95,
              borderTopLeftRadius: 30,
              backgroundColor: Colors.primary,
              transform: 'rotate(-6deg)',
            }}
          />
        </div>
      )}

      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          position: 'relative',
          zIndex: 1,
        }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              marginBottom: 4,
            }}>
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: Colors.primary,
              }}
            />
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: 1.8,
                color: Colors.primary,
              }}>
              TENDERITO
            </span>
          </div>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: Colors.text,
              letterSpacing: -0.8,
              lineHeight: 1.2,
              margin: 0,
            }}>
            {title}
          </h1>
          {subtitle && (
            <p
              style={{
                fontSize: 14,
                color: Colors.textSecondary,
                marginTop: 4,
                fontWeight: 500,
                letterSpacing: -0.1,
                margin: '4px 0 0 0',
              }}>
              {subtitle}
            </p>
          )}
        </div>
        <div
          style={{
            marginLeft: 12,
            alignSelf: 'flex-start',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            position: 'relative',
            zIndex: 2,
          }}>
          {showSyncButton && (
            <button
              type="button"
              onClick={handleManualSync}
              disabled={isSyncing}
              title={
                !isOnline
                  ? 'Sin conexión a internet (modo sin conexión)'
                  : isSyncing
                  ? 'Sincronizando con el servidor...'
                  : 'Sincronizar ahora (forzar actualización)'
              }
              aria-label={isSyncing ? 'Sincronizando datos' : 'Sincronizar datos manualmente'}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: isSyncing ? '#FFF1E5' : '#FFFFFF',
                border: `1.5px solid ${isSyncing ? Colors.primary : Colors.border}`,
                color: isSyncing ? Colors.primary : isOnline ? Colors.textSecondary : Colors.textMuted,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: isSyncing ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)',
                transition: 'all 0.2s ease',
                padding: 0,
                outline: 'none',
              }}>
              <IoSyncOutline
                size={18}
                className={isSyncing ? 'spin' : ''}
                style={{
                  transition: 'transform 0.2s ease',
                }}
              />
            </button>
          )}

          {rightElement ? (
            rightElement
          ) : activeName ? (
            <div
              title={`Sesión iniciada como: ${activeName}${activeRole ? ` (${activeRole})` : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                backgroundColor: '#FFFFFF',
                border: `1.5px solid ${Colors.border}`,
                padding: '6px 12px',
                borderRadius: 24,
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)',
                maxWidth: 180,
              }}>
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  backgroundColor: Colors.primaryLight,
                  color: Colors.primary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                <IoPersonOutline size={14} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                {activeRole && (
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 800,
                      color: Colors.primary,
                      lineHeight: 1,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}>
                    {activeRole}
                  </span>
                )}
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: Colors.text,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    lineHeight: 1.2,
                    marginTop: activeRole ? 2 : 0,
                  }}>
                  {activeName}
                </span>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
