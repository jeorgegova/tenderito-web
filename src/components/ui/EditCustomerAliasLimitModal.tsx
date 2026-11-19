import React, { useState, useEffect } from 'react';
import { IoClose, IoPencilOutline, IoInformationCircleOutline } from 'react-icons/io5';
import { Colors, Radius } from '../../theme';
import { Input } from './Input';
import { Button } from './Button';
import { showAlert } from './AlertModal';
import { updateCustomerAliasAndLimit } from '../../services/customers';

export interface EditCustomerAliasLimitModalProps {
  visible: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
  initialAlias?: string | null;
  initialCreditLimit: number;
  onSaved: () => void;
}

export function EditCustomerAliasLimitModal({
  visible,
  onClose,
  customerId,
  customerName,
  initialAlias,
  initialCreditLimit,
  onSaved,
}: EditCustomerAliasLimitModalProps) {
  const [alias, setAlias] = useState(initialAlias || '');
  const [creditLimit, setCreditLimit] = useState(
    initialCreditLimit > 0 ? String(initialCreditLimit) : '',
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setAlias(initialAlias || '');
      setCreditLimit(initialCreditLimit > 0 ? String(initialCreditLimit) : '');
      setError(null);
      setLoading(false);
    }
  }, [visible, initialAlias, initialCreditLimit]);

  if (!visible) return null;

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);

    const cleanLimit = creditLimit ? Number(creditLimit.replace(/[^0-9]/g, '')) : 0;
    const cleanAlias = alias.trim() ? alias.trim() : null;

    const res = await updateCustomerAliasAndLimit(customerId, cleanAlias, cleanLimit);
    setLoading(false);

    if (res.success) {
      showAlert({
        title: 'Datos actualizados',
        message: 'El alias y el tope de crédito se han guardado exitosamente.',
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
                backgroundColor: Colors.primaryLight,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: Colors.primary,
              }}>
              <IoPencilOutline size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: Colors.text, margin: 0 }}>
                Editar cliente en tu tienda
              </h3>
              <p style={{ fontSize: 12, color: Colors.textSecondary, margin: 0 }}>
                {customerName}
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
              label="Alias / Apodo en tu tienda"
              value={alias}
              onChange={e => setAlias(e.target.value)}
              placeholder="Ej: Don Pedro, Vecina Clara"
              disabled={loading}
            />
            <p style={{ fontSize: 11, color: Colors.textMuted, marginTop: 4, margin: '4px 0 0' }}>
              Nombre personalizado con el que identificas a este cliente en tu tienda.
            </p>
          </div>

          <div>
            <Input
              label="Tope de crédito permitido ($ COP)"
              type="text"
              value={
                creditLimit
                  ? `$ ${Number(creditLimit.replace(/[^0-9]/g, '')).toLocaleString('es-CO')}`
                  : ''
              }
              onChange={e => {
                const raw = e.target.value.replace(/[^0-9]/g, '');
                setCreditLimit(raw);
              }}
              placeholder="$ 0 (sin tope máximo)"
              disabled={loading}
            />
            <p style={{ fontSize: 11, color: Colors.textMuted, marginTop: 4, margin: '4px 0 0' }}>
              Monto máximo permitido en compras fiadas simultáneas (deja en 0 para ilimitado).
            </p>
          </div>

          <div
            style={{
              backgroundColor: '#F8FAFC',
              border: `1px solid ${Colors.border}`,
              borderRadius: Radius.md,
              padding: 12,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
            }}>
            <IoInformationCircleOutline size={18} color={Colors.textSecondary} style={{ flexShrink: 0, marginTop: 2 }} />
            <span style={{ fontSize: 12, color: Colors.textSecondary, lineHeight: 1.4 }}>
              El <strong>nombre legal</strong> y <strong>número telefónico</strong> son datos personales administrados exclusivamente por el cliente desde su propia cuenta.
            </span>
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
