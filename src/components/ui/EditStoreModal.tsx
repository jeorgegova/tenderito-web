import React, { useState, useEffect } from 'react';
import { IoClose, IoStorefrontOutline } from 'react-icons/io5';
import { Colors, Radius } from '../../theme';
import { Input } from './Input';
import { Button } from './Button';
import { showAlert } from './AlertModal';
import { updateStoreProfile } from '../../services/profile';

export interface EditStoreModalProps {
  visible: boolean;
  onClose: () => void;
  initialStoreName: string;
  initialPhone?: string | null;
  initialMerchantName?: string | null;
  initialAddress?: string | null;
  onSaved: () => void;
}

export function EditStoreModal({
  visible,
  onClose,
  initialStoreName,
  initialPhone,
  initialMerchantName,
  initialAddress,
  onSaved,
}: EditStoreModalProps) {
  const [storeName, setStoreName] = useState(initialStoreName || '');
  const [phone, setPhone] = useState(initialPhone || '');
  const [merchantName, setMerchantName] = useState(initialMerchantName || '');
  const [address, setAddress] = useState(initialAddress || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setStoreName(initialStoreName || '');
      setPhone(initialPhone || '');
      setMerchantName(initialMerchantName || '');
      setAddress(initialAddress || '');
      setError(null);
      setLoading(false);
    }
  }, [visible, initialStoreName, initialPhone, initialMerchantName, initialAddress]);

  if (!visible) return null;

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanStoreName = storeName.trim();
    const cleanPhone = phone.trim().replace(/[^0-9]/g, '');

    if (!cleanStoreName) {
      setError('El nombre de la tienda es requerido');
      return;
    }
    if (!cleanPhone || cleanPhone.length < 7) {
      setError('Ingresa un teléfono de contacto válido (mínimo 7 dígitos)');
      return;
    }

    setLoading(true);
    setError(null);

    const res = await updateStoreProfile({
      store_name: cleanStoreName,
      phone: cleanPhone,
      merchant_name: merchantName.trim() || null,
      address: address.trim() || null,
    });

    setLoading(false);

    if (res.success) {
      showAlert({
        title: 'Tienda actualizada',
        message: 'Los datos de tu tienda se guardaron correctamente.',
        type: 'success',
      });
      onSaved();
      onClose();
    } else {
      setError(res.error || 'No se pudieron guardar los cambios');
    }
  };

  return (
    <div
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        zIndex: 12000,
        padding: 'min(48px, 6vh) 16px 24px',
        boxSizing: 'border-box',
        overflowY: 'auto',
      }}>
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 24,
          width: '100%',
          maxWidth: 460,
          maxHeight: 'calc(100vh - min(48px, 6vh) - 32px)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
        }}>
        {/* Header del Modal (Fijo) */}
        <div
          style={{
            padding: '18px 20px',
            borderBottom: `1px solid ${Colors.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: Colors.primaryLight,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: Colors.primary,
              }}>
              <IoStorefrontOutline size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: Colors.text, margin: 0 }}>
                Datos de tu tienda
              </h3>
              <p style={{ fontSize: 12, color: Colors.textSecondary, margin: 0 }}>
                Actualiza el nombre y contacto de tu negocio
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: Colors.textMuted,
              padding: 4,
            }}>
            <IoClose size={22} />
          </button>
        </div>

        {/* Formulario con cuerpo scrollable y footer fijo */}
        <form
          onSubmit={handleSave}
          style={{
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            flex: 1,
            minHeight: 0,
          }}>
          {/* Cuerpo scrollable interior */}
          <div
            style={{
              padding: '18px 20px 24px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              flex: 1,
              minHeight: 0,
            }}>
            {error && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: Radius.md,
                  backgroundColor: '#FEE2E2',
                  color: '#991B1B',
                  fontSize: 13,
                  fontWeight: 600,
                }}>
                {error}
              </div>
            )}

            <div>
              <Input
                label="Nombre de la tienda *"
                value={storeName}
                onChange={e => {
                  setStoreName(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Ej: Tienda Villa Mercedes"
                disabled={loading}
              />
            </div>

            <div>
              <Input
                label="Teléfono de contacto *"
                type="tel"
                value={phone}
                onChange={e => {
                  setPhone(e.target.value.replace(/[^0-9]/g, ''));
                  if (error) setError(null);
                }}
                placeholder="Ej: 310 123 4567"
                disabled={loading}
              />
            </div>

            <div>
              <Input
                label="Tu nombre (Tendero)"
                value={merchantName}
                onChange={e => setMerchantName(e.target.value)}
                placeholder="Ej: Jorge González"
                disabled={loading}
              />
            </div>

            <div>
              <Input
                label="Dirección del local (opcional)"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Ej: Carrera 15 # 45-20"
                disabled={loading}
              />
            </div>
          </div>

          {/* Botones de acción siempre visibles al pie del modal sin necesidad de hacer scroll */}
          <div
            style={{
              padding: '14px 20px 18px',
              borderTop: `1px solid ${Colors.border}`,
              backgroundColor: '#FFFFFF',
              display: 'flex',
              gap: 10,
              flexShrink: 0,
            }}>
            <Button
              title="Cancelar"
              variant="secondary"
              disabled={loading}
              onPress={onClose}
              style={{ flex: 1 }}
            />
            <Button
              title={loading ? 'Guardando…' : 'Guardar cambios'}
              disabled={loading}
              onPress={handleSave}
              style={{ flex: 1 }}
            />
          </div>
        </form>
      </div>
    </div>
  );
}
