import React, { useState, useEffect } from 'react';
import { IoClose, IoPersonOutline, IoShieldCheckmarkOutline } from 'react-icons/io5';
import { Colors, Radius } from '../../theme';
import { Input } from './Input';
import { Button } from './Button';
import { showAlert } from './AlertModal';
import { updateCustomerProfile } from '../../services/customerPortal';

export interface EditCustomerSelfModalProps {
  visible: boolean;
  onClose: () => void;
  initialName: string;
  initialPhone?: string | null;
  documentType?: string | null;
  documentNumber?: string | null;
  onSaved: () => void;
}

export function EditCustomerSelfModal({
  visible,
  onClose,
  initialName,
  initialPhone,
  documentType,
  documentNumber,
  onSaved,
}: EditCustomerSelfModalProps) {
  const [name, setName] = useState(initialName || '');
  const [phone, setPhone] = useState(initialPhone || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setName(initialName || '');
      setPhone(initialPhone || '');
      setError(null);
      setLoading(false);
    }
  }, [visible, initialName, initialPhone]);

  if (!visible) return null;

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanName = name.trim();
    const cleanPhone = phone.trim().replace(/[^0-9]/g, '');

    if (!cleanName) {
      setError('Tu nombre completo es requerido');
      return;
    }
    if (!cleanPhone || cleanPhone.length < 7) {
      setError('Ingresa un número telefónico válido (mínimo 7 dígitos)');
      return;
    }

    setLoading(true);
    setError(null);

    const res = await updateCustomerProfile({
      name: cleanName,
      phone: cleanPhone,
    });

    setLoading(false);

    if (res.success) {
      showAlert({
        title: 'Datos actualizados',
        message: 'Tus datos personales se han actualizado correctamente.',
        type: 'success',
      });
      onSaved();
      onClose();
    } else {
      setError(res.error || 'No se pudieron actualizar los datos');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 12000,
        padding: 16,
        boxSizing: 'border-box',
      }}>
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 24,
          width: '100%',
          maxWidth: 460,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
        }}>
        {/* Header del Modal */}
        <div
          style={{
            padding: '18px 20px',
            borderBottom: `1px solid ${Colors.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: '#ECFDF5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#059669',
              }}>
              <IoPersonOutline size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: Colors.text, margin: 0 }}>
                Mis datos personales
              </h3>
              <p style={{ fontSize: 12, color: Colors.textSecondary, margin: 0 }}>
                Actualiza tu nombre y número telefónico
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

        {/* Contenido del Formulario */}
        <form
          onSubmit={handleSave}
          style={{
            padding: 20,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
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
              label="Tu nombre completo *"
              value={name}
              onChange={e => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Ej: Juan Camilo Pérez"
              disabled={loading}
            />
          </div>

          <div>
            <Input
              label="Tu número telefónico / celular *"
              type="tel"
              value={phone}
              onChange={e => {
                setPhone(e.target.value.replace(/[^0-9]/g, ''));
                if (error) setError(null);
              }}
              placeholder="Ej: 300 123 4567"
              disabled={loading}
            />
          </div>

          <div>
            <Input
              label="Número de documento"
              value={`${documentType || 'CC'} ${documentNumber || ''}`}
              disabled={true}
              readOnly={true}
              style={{ backgroundColor: '#F8FAFC', color: Colors.textSecondary }}
            />
            <p
              style={{
                fontSize: 11,
                color: Colors.textMuted,
                marginTop: 4,
                margin: '4px 0 0',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}>
              <IoShieldCheckmarkOutline size={13} color="#059669" />
              Tu documento es tu identificación única y no puede ser alterado.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
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
