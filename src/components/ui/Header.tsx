import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IoPersonOutline,
  IoSyncOutline,
  IoChevronDown,
  IoChevronForward,
  IoPersonCircleOutline,
  IoLogOutOutline,
} from 'react-icons/io5';
import { useStore } from '../../store/useStore';
import { Colors } from '../../theme';
import { useSync } from '../../hooks/useSync';
import { confirmLogout } from '../../lib/session';

export interface HeaderProps {
  title: string;
  subtitle?: string;
  showCurve?: boolean;
  curveVariant?: 'default' | 'profile';
  rightElement?: React.ReactNode;
  sessionName?: string;
  sessionRole?: string;
  showSyncButton?: boolean;
}

export function Header({
  title,
  subtitle,
  showCurve = false,
  curveVariant = 'default',
  rightElement,
  sessionName,
  sessionRole,
  showSyncButton = true,
}: HeaderProps) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

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
        zIndex: 10,
        overflow: 'visible',
        width: '100%',
        boxSizing: 'border-box',
      }}>
      {showCurve && (
        curveVariant === 'profile' ? (
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: 250,
              height: 155,
              overflow: 'hidden',
              pointerEvents: 'none',
              zIndex: 0,
            }}>
            {/* Cresta de ola secundaria (crea el efecto ondulado con doble curva) */}
            <div
              style={{
                position: 'absolute',
                top: -20,
                right: 90,
                width: 95,
                height: 95,
                borderRadius: 48,
                backgroundColor: '#FFE4D0',
                transform: 'rotate(8deg)',
              }}
            />
            {/* Cresta de ola principal exterior */}
            <div
              style={{
                position: 'absolute',
                top: -40,
                right: -20,
                width: 220,
                height: 145,
                borderBottomLeftRadius: 135,
                borderBottomRightRadius: 60,
                borderTopLeftRadius: 50,
                backgroundColor: '#FFE4D0',
                transform: 'rotate(-12deg)',
              }}
            />
            {/* Cresta interior secundaria naranja */}
            <div
              style={{
                position: 'absolute',
                top: -28,
                right: 95,
                width: 75,
                height: 75,
                borderRadius: 38,
                backgroundColor: Colors.primary,
                transform: 'rotate(6deg)',
              }}
            />
            {/* Cresta interior principal naranja */}
            <div
              style={{
                position: 'absolute',
                top: -50,
                right: -25,
                width: 185,
                height: 125,
                borderBottomLeftRadius: 115,
                borderBottomRightRadius: 50,
                borderTopLeftRadius: 40,
                backgroundColor: Colors.primary,
                transform: 'rotate(-10deg)',
              }}
            />
            {/* Gotitas orgánicas del ondulado */}
            <div
              style={{
                position: 'absolute',
                top: 108,
                right: 155,
                width: 9,
                height: 9,
                borderRadius: 4.5,
                backgroundColor: '#FFE4D0',
                opacity: 0.9,
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: 124,
                right: 130,
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: Colors.primary,
                opacity: 0.85,
              }}
            />
          </div>
        ) : (
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
        )
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
              fontSize: 'clamp(20px, 3.8vw, 26px)',
              fontWeight: 800,
              color: Colors.text,
              letterSpacing: -0.6,
              lineHeight: 1.2,
              margin: 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
            {title}
          </h1>
        </div>
        <div
          style={{
            marginLeft: 8,
            alignSelf: 'flex-start',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
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
            <div ref={menuRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setMenuOpen(prev => !prev)}
                title={`Usuario: ${activeName}. Clic para abrir opciones`}
                aria-haspopup="true"
                aria-expanded={menuOpen}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  backgroundColor: menuOpen ? '#FFF7F2' : '#FFFFFF',
                  border: `1.5px solid ${menuOpen ? Colors.primary : Colors.border}`,
                  padding: '6px 12px',
                  borderRadius: 24,
                  boxShadow: menuOpen
                    ? '0 4px 14px rgba(249, 115, 22, 0.15)'
                    : '0 2px 10px rgba(0, 0, 0, 0.05)',
                  maxWidth: 155,
                  cursor: 'pointer',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  textAlign: 'left',
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
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
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
                <IoChevronDown
                  size={12}
                  color={menuOpen ? Colors.primary : Colors.textMuted}
                  style={{
                    marginLeft: 2,
                    flexShrink: 0,
                    transform: menuOpen ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s ease',
                  }}
                />
              </button>

              {/* Popover Dropdown Menu */}
              {menuOpen && (
                <div
                  role="menu"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    width: 220,
                    backgroundColor: '#FFFFFF',
                    borderRadius: 16,
                    padding: 8,
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                    border: `1px solid ${Colors.border}`,
                    zIndex: 1000,
                  }}>
                  {/* Encabezado */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 10px 10px',
                    }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: Colors.primaryLight,
                        color: Colors.primary,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                      <IoPersonOutline size={16} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 800,
                          color: Colors.text,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                        {activeName}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: Colors.textSecondary,
                          marginTop: 1,
                        }}>
                        {activeRole || 'Sesión activa'}
                      </div>
                    </div>
                  </div>

                  <div style={{ height: 1, backgroundColor: '#F1F5F9', margin: '4px 0' }} />

                  {/* Opción 1: Perfil */}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      navigate('/profile');
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 10px',
                      borderRadius: 10,
                      border: 'none',
                      backgroundColor: 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background-color 0.15s ease',
                      outline: 'none',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        backgroundColor: Colors.primaryLight,
                        color: Colors.primary,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                      <IoPersonCircleOutline size={18} />
                    </div>
                    <span
                      style={{
                        flex: 1,
                        fontSize: 13,
                        fontWeight: 700,
                        color: Colors.text,
                      }}>
                      Perfil
                    </span>
                    <IoChevronForward size={14} color={Colors.textMuted} />
                  </button>

                  <div style={{ height: 1, backgroundColor: '#F1F5F9', margin: '4px 0' }} />

                  {/* Opción 2: Cerrar sesión */}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      confirmLogout();
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 10px',
                      borderRadius: 10,
                      border: 'none',
                      backgroundColor: 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background-color 0.15s ease',
                      outline: 'none',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#FEF2F2')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        backgroundColor: '#FEE2E2',
                        color: Colors.destructive,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                      <IoLogOutOutline size={18} />
                    </div>
                    <span
                      style={{
                        flex: 1,
                        fontSize: 13,
                        fontWeight: 700,
                        color: Colors.destructive,
                      }}>
                      Cerrar sesión
                    </span>
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
      {subtitle && (
        <p
          style={{
            fontSize: 13.5,
            color: Colors.textSecondary,
            marginTop: 4,
            fontWeight: 500,
            letterSpacing: -0.1,
            margin: '4px 0 0 0',
            position: 'relative',
            zIndex: 1,
          }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
