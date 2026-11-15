import React, { useState } from 'react';
import { IoClose, IoSearch, IoCheckmarkCircle, IoPersonAdd } from 'react-icons/io5';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { showAlert } from './ui/AlertModal';
import { StoreHistoryLockNotice } from './ui/StoreHistoryLockNotice';
import {
  canCreateCustomer,
  createCustomer,
  findCustomerByDocument,
  linkCustomerToStore,
} from '../services/customers';
import { useStore } from '../store/useStore';
import { calculateSubscriptionStatus } from '../services/plans';
import { Colors, Radius, formatCOP } from '../theme';
import { FormatMoney, parseMoney } from '../utils/format';
import type { Customer } from '../types';

export const DOCUMENT_TYPES = [
  { value: 'CC', label: 'CC · Cédula de ciudadanía' },
  { value: 'CE', label: 'CE · Cédula de extranjería' },
  { value: 'NIT', label: 'NIT · Número tributario' },
  { value: 'PAS', label: 'PAS · Pasaporte' },
  { value: 'PEP', label: 'PEP · Permiso especial' },
  { value: 'PPT', label: 'PPT · Permiso protección temporal' },
];

interface CreateCustomerModalProps {
  visible: boolean;
  onClose: () => void;
  onCustomerCreated?: (customer: Customer) => void;
  existingCustomers?: Customer[];
}

export function CreateCustomerModal({
  visible,
  onClose,
  onCustomerCreated,
  existingCustomers = [],
}: CreateCustomerModalProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const profile = useStore(s => s.profile);
  const subStatus = calculateSubscriptionStatus(profile);

  const [name, setName] = useState('');
  const [documentType, setDocumentType] = useState('CC');
  const [documentNumber, setDocumentNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [creditLimit, setCreditLimit] = useState('0');
  const [alias, setAlias] = useState('');
  const [foundCustomer, setFoundCustomer] = useState<any>(null);
  const [verified, setVerified] = useState(false);
  const [checkingDocument, setCheckingDocument] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!visible) return null;

  function resetForm() {
    setName('');
    setDocumentType('CC');
    setDocumentNumber('');
    setPhone('');
    setEmail('');
    setCreditLimit('0');
    setAlias('');
    setFoundCustomer(null);
    setVerified(false);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  async function onCheckDocument() {
    if (!documentNumber.trim()) {
      return showAlert('Faltan datos', 'Ingresa la identificación del cliente');
    }
    setCheckingDocument(true);
    try {
      const customer = await findCustomerByDocument(documentNumber.trim());
      setFoundCustomer(customer);
      setVerified(true);
      if (customer) {
        setName(customer.name);
        setPhone(customer.phone ?? '');
        setEmail(customer.email ?? '');

        const alreadyLinked =
          customer.isLinkedToMyStore ||
          existingCustomers.some(
            c =>
              (c.document_number &&
                c.document_number.trim() === documentNumber.trim()) ||
              c.id === customer.id,
          );

        if (alreadyLinked) {
          showAlert({
            title: 'Cliente ya vinculado',
            message: `"${customer.alias || customer.name}" ya se encuentra registrado y vinculado a tu tienda.`,
            type: 'warning',
          });
        } else {
          showAlert(
            'Cliente encontrado',
            'El cliente está registrado en Tenderito. Revisa sus datos y define el cupo de crédito para vincularlo a tu tienda.',
          );
        }
      } else {
        setName('');
        showAlert('Cliente nuevo', 'Completa los datos para registrarlo.');
      }
    } catch (error: any) {
      showAlert('No se pudo verificar', error?.message ?? 'Intenta de nuevo');
    } finally {
      setCheckingDocument(false);
    }
  }

  async function onCreate() {
    const check = await canCreateCustomer(profile);
    if (!check.allowed) {
      return showAlert({
        title: 'Límite de clientes alcanzado',
        message: `Tu plan ${check.effectivePlan.toUpperCase()} permite hasta ${check.limit} clientes y ya tienes ${check.count}. Pásate a un plan superior para seguir agregando clientes.`,
        type: 'warning',
        buttons: [{ text: 'Entendido', style: 'cancel' }],
      });
    }

    if (foundCustomer) {
      if (!documentNumber.trim()) {
        return showAlert('Faltan datos', 'Identificación es obligatoria');
      }
    } else if (!name.trim() || !documentNumber.trim() || !phone.trim()) {
      return showAlert(
        'Faltan datos',
        'Nombre, identificación y teléfono son obligatorios',
      );
    }

    setSaving(true);
    try {
      let createdResult: Customer;
      if (foundCustomer) {
        await linkCustomerToStore(
          foundCustomer,
          parseMoney(creditLimit),
          alias,
        );
        createdResult = {
          ...foundCustomer,
          alias: alias?.trim() || foundCustomer.alias || null,
          credit_limit: parseMoney(creditLimit),
        };
        showAlert(
          'Cliente vinculado',
          `"${alias?.trim() || foundCustomer.name}" ha sido vinculado a tu tienda exitosamente.`,
        );
      } else {
        createdResult = await createCustomer({
          name: name.trim(),
          document_type: documentType.trim().toUpperCase(),
          document_number: documentNumber.trim(),
          phone: phone.trim() || null,
          email: email.trim() || null,
          credit_limit: parseMoney(creditLimit),
          alias: alias.trim() || null,
        });
        showAlert(
          'Cliente creado',
          `"${alias?.trim() || name.trim()}" ha sido registrado exitosamente.`,
        );
      }

      await queryClient.invalidateQueries({ queryKey: ['customers'] });
      await queryClient.invalidateQueries({ queryKey: ['customers-all'] });

      onCustomerCreated?.(createdResult);
      handleClose();
    } catch (error: any) {
      showAlert('No se pudo guardar', error?.message ?? 'Intenta nuevamente');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(3px)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
      onClick={e => {
        if (e.target === e.currentTarget) handleClose();
      }}>
      <div
        style={{
          backgroundColor: '#FFFFFF',
          width: '100%',
          maxWidth: 520,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 -10px 40px rgba(0,0,0,0.15)',
          overflow: 'hidden',
          animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: `1px solid ${Colors.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: Colors.primaryLight,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <IoPersonAdd size={18} color={Colors.primary} />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: Colors.text, margin: 0 }}>
                Nuevo cliente
              </h2>
              <span style={{ fontSize: 12, color: Colors.textSecondary }}>
                Registra un cliente en tu libreta
              </span>
            </div>
          </div>
          <button
            onClick={handleClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: '#F1F5F9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: Colors.textSecondary,
              cursor: 'pointer',
            }}>
            <IoClose size={20} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div
          style={{
            padding: 20,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}>
          {/* Identificación y tipo */}
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ width: 110 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: Colors.textSecondary }}>
                Tipo
              </label>
              <select
                value={documentType}
                onChange={e => {
                  setDocumentType(e.target.value);
                  setVerified(false);
                }}
                style={{
                  width: '100%',
                  height: 48,
                  borderRadius: Radius.md,
                  border: `1.5px solid ${Colors.border}`,
                  padding: '0 8px',
                  fontSize: 14,
                  fontWeight: 600,
                  backgroundColor: '#FFFFFF',
                  color: Colors.text,
                  marginTop: 6,
                }}>
                {DOCUMENT_TYPES.map(t => (
                  <option key={t.value} value={t.value}>
                    {t.value}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <Input
                label="Número de documento *"
                value={documentNumber}
                onChange={e => {
                  setDocumentNumber(e.target.value);
                  setVerified(false);
                }}
                placeholder="Ej. 10203040"
              />
            </div>
          </div>

          <Button
            title={checkingDocument ? 'Verificando…' : 'Buscar en Tenderito'}
            variant="secondary"
            disabled={checkingDocument || !documentNumber.trim()}
            onPress={onCheckDocument}
            icon={<IoSearch size={18} />}
          />

          {verified && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                padding: '12px 0 0',
                borderTop: `1px dashed ${Colors.border}`,
              }}>
              {foundCustomer ? (
                <div
                  style={{
                    backgroundColor: Colors.successAlt,
                    border: `1px solid ${Colors.success}`,
                    borderRadius: Radius.md,
                    padding: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}>
                  <IoCheckmarkCircle size={24} color={Colors.success} />
                  <div>
                    <strong style={{ fontSize: 14, color: Colors.success }}>
                      Cliente encontrado en la red
                    </strong>
                    <div style={{ fontSize: 13, color: Colors.text }}>
                      {foundCustomer.name}
                    </div>
                  </div>
                </div>
              ) : null}

              {subStatus.effectivePlan === 'free' && (
                <StoreHistoryLockNotice
                  text="El historial crediticio entre tiendas está activo en planes pagos."
                />
              )}

              <Input
                label="Nombre completo *"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Nombre del cliente"
                disabled={Boolean(foundCustomer)}
              />

              <Input
                label="Apodo o alias en la tienda"
                value={alias}
                onChange={e => setAlias(e.target.value)}
                placeholder="Ej. Doña Carmen, El Paisa..."
              />

              <Input
                label="Celular *"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="Ej. 300 123 4567"
                type="tel"
                disabled={Boolean(foundCustomer?.phone)}
              />

              <Input
                label="Cupo máximo de fiado"
                value={creditLimit}
                onChange={e => setCreditLimit(FormatMoney(e.target.value))}
                placeholder="$ 0"
              />
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div
          style={{
            padding: '16px 20px',
            borderTop: `1px solid ${Colors.border}`,
            display: 'flex',
            gap: 10,
          }}>
          <Button
            title="Cancelar"
            variant="ghost"
            style={{ flex: 1 }}
            onPress={handleClose}
          />
          <Button
            title={saving ? 'Guardando…' : foundCustomer ? 'Vincular a mi tienda' : 'Crear cliente'}
            variant="primary"
            disabled={saving || !verified}
            style={{ flex: 2 }}
            onPress={onCreate}
          />
        </div>
      </div>
    </div>
  );
}
